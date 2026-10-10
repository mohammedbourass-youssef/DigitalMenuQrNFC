using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Infrastructure.Data;
using NFC_Backend.Repos.Interfaces;

namespace NFC_Backend.Repos.Implementations
{
    public class PaymentMethodsRepo : IPaymentMethodsRepo
    {
        private readonly AppDbContext _db;

        public PaymentMethodsRepo(AppDbContext db)
        {
            _db = db;
        }

        private sealed record Row(
            int Id, int PaymentMethodId, string Code, string? DisplayName,
            string? Color, string? Icon, bool IsEnabled, bool IsDefault,
            int DisplayOrder, string SystemName);

        private static string NormalizeLang(string? lang) =>
            string.IsNullOrWhiteSpace(lang) ? "en" : lang.Trim().ToLowerInvariant();

        private static TenantPaymentMethodDto Map(Row r) => new(
            r.Id, r.PaymentMethodId, r.Code, r.SystemName, r.DisplayName,
            string.IsNullOrWhiteSpace(r.DisplayName) ? r.SystemName : r.DisplayName,
            r.Color, r.Icon, r.IsEnabled, r.IsDefault, r.DisplayOrder);

        // Filter/order on the ENTITY first; project to Row only as the very last step.
        private IQueryable<TenantPaymentMethod> TenantQuery(Guid tenantId) =>
            _db.TenantPaymentMethods
               .AsNoTracking()
               .Where(x => x.TenantId == tenantId && x.PaymentMethod.IsActive);

        private static Expression<Func<TenantPaymentMethod, Row>> ToRow(string lang) =>
            x => new Row(
                x.Id,
                x.PaymentMethodId,
                x.PaymentMethod.Code,
                x.DisplayName,
                x.PaymentMethod.Color,
                x.PaymentMethod.Icon,
                x.IsEnabled,
                x.IsDefault,
                x.DisplayOrder,
                x.PaymentMethod.Translations.Where(t => t.Lang == lang).Select(t => t.Name).FirstOrDefault()
                    ?? x.PaymentMethod.Translations.Where(t => t.Lang == "en").Select(t => t.Name).FirstOrDefault()
                    ?? x.PaymentMethod.Code);

        // ═════════════════════════════════════════════════════
        //  READS
        // ═════════════════════════════════════════════════════

        public async Task<List<SystemPaymentMethodDto>> GetSystemMethodsAsync(
            Guid tenantId, string lang, CancellationToken ct)
        {
            lang = NormalizeLang(lang);

            var added = (await _db.TenantPaymentMethods
                    .AsNoTracking()
                    .Where(x => x.TenantId == tenantId)
                    .Select(x => x.PaymentMethodId)
                    .ToListAsync(ct))
                .ToHashSet();

            var rows = await _db.PaymentMethods
                .AsNoTracking()
                .Where(p => p.IsActive)
                .OrderBy(p => p.DisplayOrder)
                .Select(p => new
                {
                    p.Id,
                    p.Code,
                    p.Color,
                    p.Icon,
                    Name = p.Translations.Where(t => t.Lang == lang).Select(t => t.Name).FirstOrDefault()
                           ?? p.Translations.Where(t => t.Lang == "en").Select(t => t.Name).FirstOrDefault()
                           ?? p.Code,
                    Description = p.Translations.Where(t => t.Lang == lang).Select(t => t.Description).FirstOrDefault()
                           ?? p.Translations.Where(t => t.Lang == "en").Select(t => t.Description).FirstOrDefault()
                })
                .ToListAsync(ct);

            return rows
                .Select(r => new SystemPaymentMethodDto(
                    r.Id, r.Code, r.Name, r.Description, r.Color, r.Icon, added.Contains(r.Id)))
                .ToList();
        }

        public async Task<List<TenantPaymentMethodDto>> GetTenantMethodsAsync(
            Guid tenantId, string lang, bool onlyEnabled, CancellationToken ct)
        {
            lang = NormalizeLang(lang);

            var query = TenantQuery(tenantId);
            if (onlyEnabled) query = query.Where(x => x.IsEnabled);

            var rows = await query
                .OrderBy(x => x.DisplayOrder)
                .ThenBy(x => x.Id)
                .Select(ToRow(lang))
                .ToListAsync(ct);

            return rows.Select(Map).ToList();
        }

        public async Task<TenantPaymentMethodDto?> GetByIdAsync(
            Guid tenantId, int id, string lang, CancellationToken ct)
        {
            lang = NormalizeLang(lang);
            var row = await TenantQuery(tenantId)
                .Where(x => x.Id == id)
                .Select(ToRow(lang))
                .FirstOrDefaultAsync(ct);
            return row == null ? null : Map(row);
        }
   
        // ═════════════════════════════════════════════════════
        //  WRITES
        // ═════════════════════════════════════════════════════

        public async Task<(PaymentMethodResult Result, int Id)> AddAsync(
            Guid tenantId, AddTenantPaymentMethodRequest request, CancellationToken ct)
        {
            var systemExists = await _db.PaymentMethods
                .AnyAsync(p => p.Id == request.PaymentMethodId && p.IsActive, ct);
            if (!systemExists)
                return (PaymentMethodResult.InvalidSystemMethod, 0);

            var duplicate = await _db.TenantPaymentMethods
                .AnyAsync(x => x.TenantId == tenantId && x.PaymentMethodId == request.PaymentMethodId, ct);
            if (duplicate)
                return (PaymentMethodResult.Duplicate, 0);

            var maxOrder = await _db.TenantPaymentMethods
                .Where(x => x.TenantId == tenantId)
                .Select(x => (int?)x.DisplayOrder)
                .MaxAsync(ct) ?? 0;

            var hasDefault = await _db.TenantPaymentMethods
                .AnyAsync(x => x.TenantId == tenantId && x.IsDefault, ct);

            // First method of a tenant automatically becomes the default.
            // A default method is always enabled.
            var makeDefault = request.IsDefault || !hasDefault;
            var enabled = request.IsEnabled || makeDefault;

            var entity = new TenantPaymentMethod
            {
                TenantId = tenantId,
                PaymentMethodId = request.PaymentMethodId,
                DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? null : request.DisplayName.Trim(),
                IsEnabled = enabled,
                IsDefault = makeDefault,
                DisplayOrder = maxOrder + 1
            };

            try
            {
                await using var tx = await _db.Database.BeginTransactionAsync(ct);

                // Unset the old default first: the filtered unique index is checked per statement.
                if (makeDefault && hasDefault)
                    await UnsetDefaultsAsync(tenantId, exceptId: 0, ct);

                _db.TenantPaymentMethods.Add(entity);
                await _db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
            }
            catch (DbUpdateException)
            {
                // Race condition on UQ_TenantPaymentMethod
                return (PaymentMethodResult.Duplicate, 0);
            }

            return (PaymentMethodResult.Success, entity.Id);
        }

        public async Task<PaymentMethodResult> UpdateAsync(
            Guid tenantId, int id, UpdateTenantPaymentMethodRequest request, CancellationToken ct)
        {
            var entity = await FindAsync(tenantId, id, ct);
            if (entity == null) return PaymentMethodResult.NotFound;

            entity.DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? null : request.DisplayName.Trim();

            return await ApplyEnabledAsync(entity, request.IsEnabled, ct);
        }

        public async Task<PaymentMethodResult> SetEnabledAsync(
            Guid tenantId, int id, bool isEnabled, CancellationToken ct)
        {
            var entity = await FindAsync(tenantId, id, ct);
            if (entity == null) return PaymentMethodResult.NotFound;

            return await ApplyEnabledAsync(entity, isEnabled, ct);
        }

        public async Task<PaymentMethodResult> SetDefaultAsync(Guid tenantId, int id, CancellationToken ct)
        {
            var entity = await FindAsync(tenantId, id, ct);
            if (entity == null) return PaymentMethodResult.NotFound;

            if (entity.IsDefault && entity.IsEnabled)
                return PaymentMethodResult.Success;

            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            await UnsetDefaultsAsync(tenantId, exceptId: id, ct);

            entity.IsDefault = true;
            entity.IsEnabled = true;     // a default method must be enabled
            await _db.SaveChangesAsync(ct);

            await tx.CommitAsync(ct);
            return PaymentMethodResult.Success;
        }

        public async Task<PaymentMethodResult> ReorderAsync(
            Guid tenantId, List<int> orderedIds, CancellationToken ct)
        {
            var items = await _db.TenantPaymentMethods
                .Where(x => x.TenantId == tenantId)
                .ToListAsync(ct);

            if (orderedIds.Count != items.Count
                || orderedIds.Distinct().Count() != orderedIds.Count
                || !orderedIds.All(oid => items.Any(i => i.Id == oid)))
                return PaymentMethodResult.InvalidOrder;

            for (int i = 0; i < orderedIds.Count; i++)
                items.First(x => x.Id == orderedIds[i]).DisplayOrder = i + 1;

            await _db.SaveChangesAsync(ct);
            return PaymentMethodResult.Success;
        }

        public async Task<PaymentMethodResult> DeleteAsync(Guid tenantId, int id, CancellationToken ct)
        {
            var entity = await FindAsync(tenantId, id, ct);
            if (entity == null) return PaymentMethodResult.NotFound;

            _db.TenantPaymentMethods.Remove(entity);
            await _db.SaveChangesAsync(ct);

            // If we removed the default, promote the next enabled one
            await EnsureDefaultAsync(tenantId, ct);
            return PaymentMethodResult.Success;
        }

        // ═════════════════════════════════════════════════════
        //  HELPERS
        // ═════════════════════════════════════════════════════

        private Task<TenantPaymentMethod?> FindAsync(Guid tenantId, int id, CancellationToken ct) =>
            _db.TenantPaymentMethods.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == tenantId, ct);

        private Task<int> UnsetDefaultsAsync(Guid tenantId, int exceptId, CancellationToken ct) =>
            _db.TenantPaymentMethods
               .Where(x => x.TenantId == tenantId && x.IsDefault && x.Id != exceptId)
               .ExecuteUpdateAsync(s => s.SetProperty(x => x.IsDefault, false), ct);

        /// <summary>Enable/disable with business rules, then save (also persists pending changes on the entity).</summary>
        private async Task<PaymentMethodResult> ApplyEnabledAsync(
            TenantPaymentMethod entity, bool enabled, CancellationToken ct)
        {
            if (entity.IsEnabled == enabled)
            {
                await _db.SaveChangesAsync(ct);
                return PaymentMethodResult.Success;
            }

            if (!enabled)
            {
                var otherEnabled = await _db.TenantPaymentMethods
                    .AnyAsync(x => x.TenantId == entity.TenantId && x.Id != entity.Id && x.IsEnabled, ct);
                if (!otherEnabled)
                    return PaymentMethodResult.LastEnabledMethod;

                entity.IsEnabled = false;
                entity.IsDefault = false;   // a disabled method can't be the default
            }
            else
            {
                entity.IsEnabled = true;
            }

            await _db.SaveChangesAsync(ct);
            await EnsureDefaultAsync(entity.TenantId, ct);
            return PaymentMethodResult.Success;
        }

        /// <summary>Guarantees that, if the tenant has any enabled method, exactly one is the default.</summary>
        private async Task EnsureDefaultAsync(Guid tenantId, CancellationToken ct)
        {
            var hasDefault = await _db.TenantPaymentMethods
                .AnyAsync(x => x.TenantId == tenantId && x.IsDefault && x.IsEnabled, ct);
            if (hasDefault) return;

            var next = await _db.TenantPaymentMethods
                .Where(x => x.TenantId == tenantId && x.IsEnabled)
                .OrderBy(x => x.DisplayOrder)
                .ThenBy(x => x.Id)
                .FirstOrDefaultAsync(ct);

            if (next == null) return;

            next.IsDefault = true;
            await _db.SaveChangesAsync(ct);
        }
    }
}