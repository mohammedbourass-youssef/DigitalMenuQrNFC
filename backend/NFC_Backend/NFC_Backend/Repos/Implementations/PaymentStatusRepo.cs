using Microsoft.EntityFrameworkCore;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Infrastructure.Data;
using NFC_Backend.Repos.Interfaces;

namespace NFC_Backend.Repos.Implementations
{
    public class PaymentStatusRepo : IPaymentStatusRepo
    {
        private readonly AppDbContext _db;
        public PaymentStatusRepo(AppDbContext db) => _db = db;

        public Task<List<PaymentStatus>> GetAllAsync(bool includeInactive, CancellationToken ct = default)
        {
            var q = _db.PaymentStatuses.Include(s => s.Translations).AsQueryable();
            if (!includeInactive) q = q.Where(s => s.IsActive);
            return q.OrderBy(s => s.DisplayOrder).ThenBy(s => s.Id).ToListAsync(ct);
        }

        public Task<PaymentStatus?> GetByIdAsync(int id, CancellationToken ct = default) =>
            _db.PaymentStatuses.Include(s => s.Translations).FirstOrDefaultAsync(s => s.Id == id, ct);

        public Task<PaymentStatus?> GetByCodeAsync(string code, CancellationToken ct = default) =>
            _db.PaymentStatuses.Include(s => s.Translations)
               .FirstOrDefaultAsync(s => s.Code.ToLower() == code.ToLower(), ct);

        public Task<bool> CodeExistsAsync(string code, int? excludeId = null, CancellationToken ct = default) =>
            _db.PaymentStatuses.AnyAsync(s =>
                s.Code.ToLower() == code.ToLower() && (excludeId == null || s.Id != excludeId), ct);

        //public Task<bool> IsInUseAsync(int id, CancellationToken ct = default) =>
        //    _db.Payments.AnyAsync(p => p.PaymentStatusId == id, ct);

        public async Task AddAsync(PaymentStatus status, CancellationToken ct = default) =>
            await _db.PaymentStatuses.AddAsync(status, ct);

        public Task ReplaceTranslationsAsync(PaymentStatus status, IEnumerable<PaymentStatusTranslation> translations, CancellationToken ct = default)
        {
            _db.PaymentStatusTranslations.RemoveRange(status.Translations);
            status.Translations = translations.ToList();
            return Task.CompletedTask;
        }

        public void Remove(PaymentStatus status) => _db.PaymentStatuses.Remove(status);

        public async Task EnsureDefaultsAsync(CancellationToken ct = default)
        {
            var defaults = new[]
            {
                (Code: PaymentStatusCodes.NotPaid, Color: "#EF4444", Order: 1,
                 Names: new[] { ("en", "Not paid"), ("fr", "Non payé"), ("ar", "غير مدفوع") }),
                (Code: PaymentStatusCodes.Paid, Color: "#22C55E", Order: 2,
                 Names: new[] { ("en", "Paid"), ("fr", "Payé"), ("ar", "مدفوع") }),
            };

            foreach (var d in defaults)
            {
                var existing = await GetByCodeAsync(d.Code, ct);
                if (existing is null)
                {
                    await _db.PaymentStatuses.AddAsync(new PaymentStatus
                    {
                        Code = d.Code,
                        Color = d.Color,
                        DisplayOrder = d.Order,
                        IsActive = true,
                        Translations = d.Names
                            .Select(n => new PaymentStatusTranslation { Lang = n.Item1, Name = n.Item2 })
                            .ToList()
                    }, ct);
                }
                else if (!existing.IsActive)
                {
                    existing.IsActive = true; // protected statuses can never stay disabled
                }
            }
            await _db.SaveChangesAsync(ct);
        }

        public Task SaveChangesAsync(CancellationToken ct = default) => _db.SaveChangesAsync(ct);
    }
}
