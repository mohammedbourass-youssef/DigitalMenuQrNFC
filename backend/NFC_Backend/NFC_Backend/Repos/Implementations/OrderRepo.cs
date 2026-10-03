
using Microsoft.EntityFrameworkCore;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Infrastructure.Data;
using NFC_Backend.Repos.Interfaces;
using System.Reactive.Joins;

namespace NFC_Backend.Repos.Implementations
{
    public class OrderRepo : IOrderRepo
    {
        private readonly AppDbContext _dbContextContext;
        public OrderRepo(AppDbContext appDb)
        {
            _dbContextContext = appDb;
        }
        public async Task<int> CreateNewStatusAsync(OrderStatus status)
        {
           await  _dbContextContext.OrderStatuses.AddAsync(status);
            _dbContextContext.SaveChanges();
            return status.Id;
        }
        public async Task SaveTransaltions(List<OrderStatusTranslation> translations)
        {
            await _dbContextContext.OrderStatusTranslations.AddRangeAsync(translations);

            _dbContextContext.SaveChanges();
        }
        public async Task<List<OrderStatusDto>> GetStatusesAsync(
    Guid tenantId,
    string lang,
    CancellationToken ct = default)
        {
            return await _dbContextContext.OrderStatuses
                .AsNoTracking()
                .Where(s => s.IsActive && (s.TenantId == tenantId || s.TenantId == null))
                .OrderBy(s => s.DisplayOrder)
                .Select(s => new OrderStatusDto(
                    s.Id,
                    s.Code,
                    // requested language -> English -> Code
                    s.Translations.Where(t => t.Lang == lang).Select(t => t.Name).FirstOrDefault()
                        ?? s.Translations.Where(t => t.Lang == "en").Select(t => t.Name).FirstOrDefault()
                        ?? s.Code,
                    s.Color,
                    s.DisplayOrder,
                    s.IsFinal , s.TenantId == null))
                .ToListAsync(ct);

        }
            public async Task<OrderStatus?> GetStatusByIdAsync(int id, CancellationToken ct = default)
        {
            return await _dbContextContext.OrderStatuses
                .Include(s => s.Translations)
                .FirstOrDefaultAsync(s => s.Id == id, ct);
        }

        public async Task<bool> StatusCodeExistsAsync(
            Guid tenantId, string code, int? excludeId = null, CancellationToken ct = default)
        {
            var normalized = code.Trim().ToLower();

            return await _dbContextContext.OrderStatuses
                .AsNoTracking()
                .AnyAsync(s =>
                    s.IsActive
                    && (s.TenantId == tenantId || s.TenantId == null)
                    && s.Code.ToLower() == normalized
                    && (excludeId == null || s.Id != excludeId), ct);
        }

        public async Task UpdateStatusAsync(
            OrderStatus status, List<OrderStatusTranslation>? newTranslations, CancellationToken ct = default)
        {
            await using var tx = await _dbContextContext.Database.BeginTransactionAsync(ct);

            if (newTranslations != null)
            {
                _dbContextContext.OrderStatusTranslations.RemoveRange(status.Translations);
                await _dbContextContext.OrderStatusTranslations.AddRangeAsync(newTranslations, ct);
            }

            await _dbContextContext.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }

        public async Task<int> GetNextStatusOrderAsync(Guid tenantId, CancellationToken ct = default)
        {
            var max = await _dbContextContext.OrderStatuses
                .Where(s => s.IsActive && (s.TenantId == tenantId || s.TenantId == null))
                .MaxAsync(s => (int?)s.DisplayOrder, ct);
            return (max ?? 0) + 1;
        }
    
        public async Task<bool> DeactivateStatusAsync(int id, Guid tenantId, CancellationToken ct = default)
        {
            var rows = await _dbContextContext.OrderStatuses
                .Where(s => s.Id == id && s.TenantId == tenantId && s.IsActive)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.IsActive, false), ct);

            return rows > 0;
        }
        public async Task UpdateStatusTranslationsAsync(
        OrderStatus status, Dictionary<string, string> names, CancellationToken ct = default)
        {
            foreach (var (lang, name) in names)
            {
                var existing = status.Translations.FirstOrDefault(t => t.Lang == lang);
                if (existing != null)
                    existing.Name = name;
                else
                    status.Translations.Add(new OrderStatusTranslation
                    {
                        OrderStatusId = status.Id,
                        Lang = lang,
                        Name = name
                    });
            }

            // Single SaveChanges = one atomic transaction (status.Code change + translations)
            await _dbContextContext.SaveChangesAsync(ct);
        }

        public async Task<Guid> CreateNewOrderFromMenuAsync(Order order)
        {
            order.StatusHistory.Add(new OrderStatusHistory
            {
                ChangedByUserId = null,              
                ChangedAt = order.CreatedAt,
                StatusId = 1
            });

            _dbContextContext.Orders.Add(order);
            await _dbContextContext.SaveChangesAsync();

            return order.Id;
        }

       public async Task<OrderStatus?> GetOrderStatusById(int Id)
       {
            return await _dbContextContext.OrderStatuses
                .Include(c => c.Translations)
                .FirstOrDefaultAsync(c => c.Id == Id);
       }
        public async Task<int> GetNextOrderNumberAsync(Guid tenantId, CancellationToken ct = default)
        {
            var max = await _dbContextContext.Orders
                .Where(s => (s.TenantId == tenantId || s.TenantId == null))
                .MaxAsync(s => (int?)s.OrderNumber, ct);

            return (max ?? 0) + 1;
        }

        public async Task<OrderStatusStepDto?> GetOrderCurrentStatusByOrderIdAsync(Guid Id , string lan)
        {
            return await _dbContextContext.OrderStatusHistories
                .AsNoTracking()
                .Where(osh => osh.OrderId == Id)
                .Join(
                   _dbContextContext.OrderStatuses,
                   osh => osh.StatusId,
                   s => s.Id,
                   (osh, s) => new
                   {
                       StatusColor = s.Color,
                       DisplayOrder = s.DisplayOrder,
                       IsFinal = s.IsFinal,
                       ChangedAtUtc = osh.ChangedAt,
                       StatusId = s.Id,
                   }
                   )
                  .Join(
                    _dbContextContext.OrderStatusTranslations,
                    os => new
                    {
                        os.StatusId,
                        Lang = lan
                    },
                    t => new
                    {
                        StatusId = t.OrderStatusId,
                        t.Lang
                    },
                    (os, t) => new OrderStatusStepDto
                    {
                        ChangedAtUtc = os.ChangedAtUtc,
                        State = OrderStepState.Current,
                        StatusColor = os.StatusColor,
                        StatusId = os.StatusId,
                        StatusName = t.Name
                    }
                ).FirstOrDefaultAsync();

        }


        public async Task<Order?> GetOrderByIdAsNoTrckingAsync(Guid orderId , Guid TenantId , Guid SessionID)
        {
            return await _dbContextContext.Orders.AsNoTracking()
                .FirstOrDefaultAsync(o => o.TenantId == TenantId && o.Id == orderId && o.SessionId == SessionID)
                ;
        }
        public async Task<Order?> GetOrderByIdAsNoTrckingIncludeTableAsync(Guid orderId , Guid TenantId , Guid SessionID)
        {
            return await _dbContextContext.Orders.AsNoTracking()
                .Include(o=>o.Table)
                .FirstOrDefaultAsync(o => o.TenantId == TenantId && o.Id == orderId && o.SessionId == SessionID)
                ;
        }
        public async Task<List<OrderStatusStepDto>> GetOrderHistoryAsync(
        Guid orderId,
        int currentStatus,
        string lan)
        {
            return await _dbContextContext.OrderStatusHistories
                .AsNoTracking()
                .Where(osh =>
                    osh.OrderId == orderId &&
                    osh.StatusId != currentStatus)
                .Join(
                    _dbContextContext.OrderStatuses,
                    osh => osh.StatusId,
                    s => s.Id,
                    (osh, s) => new
                    {
                        ChangedAtUtc = osh.ChangedAt,
                        State = OrderStepState.Completed,
                        StatusColor = s.Color,
                        StatusId = osh.StatusId
                    }
                )
                .Join(
                    _dbContextContext.OrderStatusTranslations,
                    os => new
                    {
                        os.StatusId,
                        Lang = lan
                    },
                    t => new
                    {
                        StatusId = t.OrderStatusId,
                        t.Lang
                    },
                    (os, t) => new OrderStatusStepDto
                    {
                        ChangedAtUtc = os.ChangedAtUtc,
                        State = os.State,
                        StatusColor = os.StatusColor,
                        StatusId = os.StatusId,
                        StatusName = t.Name
                    }
                )
                .ToListAsync();
        }

    }
    

}