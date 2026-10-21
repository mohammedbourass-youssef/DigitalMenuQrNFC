
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Infrastructure.Data;
using NFC_Backend.Repos.Interfaces;
using System.Reactive.Joins;

namespace NFC_Backend.Repos.Implementations
{
    public enum ChangeStatusResult { Success, OrderNotFound, StatusNotFound }

    public class OrderRepo : IOrderRepo
    {
        private readonly AppDbContext _dbContextContext;
        public OrderRepo(AppDbContext appDb)
        {
            _dbContextContext = appDb;
        }
        public async Task<int> CreateNewStatusAsync(OrderStatus status)
        {
            await _dbContextContext.OrderStatuses.AddAsync(status);
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
                    s.IsFinal, s.TenantId == null))
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

        public async Task<OrderStatusStepDto?> GetOrderCurrentStatusByOrderIdAsync(Guid Id, int CurrentStatus, string lan)
        {
            return await _dbContextContext.OrderStatusHistories
                .AsNoTracking()
                .Where(osh => osh.OrderId == Id && osh.StatusId == CurrentStatus)
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


        public async Task<Order?> GetOrderByIdAsNoTrckingAsync(Guid orderId, Guid TenantId, Guid SessionID)
        {
            return await _dbContextContext.Orders.AsNoTracking()
                .FirstOrDefaultAsync(o => o.TenantId == TenantId && o.Id == orderId && o.SessionId == SessionID)
                ;
        }
        public async Task<Order?> GetOrderByIdAsNoTrckingAsync(Guid orderId, Guid TenantId)
        {
            return await _dbContextContext.Orders.AsNoTracking()
                .FirstOrDefaultAsync(o => o.TenantId == TenantId && o.Id == orderId)
                ;
        }
        public async Task<Order?> GetOrderByIdAsNoTrckingIncludeTableAsync(Guid orderId, Guid TenantId, Guid SessionID)
        {
            return await _dbContextContext.Orders.AsNoTracking()
                .Include(o => o.Table)
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
                    osh.OrderId == orderId
                    )
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



        public Task<List<OrderStatusColumnDto>> GetOrderStatusColumnDto(
      Guid tenantId, string lan, string currency, CancellationToken ct)
        =>
             _dbContextContext.OrderStatuses
                .AsNoTracking()
                .Where(os => os.IsActive && (os.TenantId == null || os.TenantId == tenantId))
                .Join(
                    _dbContextContext.OrderStatusTranslations.Where(t => t.Lang == lan),
                    os => os.Id,
                    t => t.OrderStatusId,
                    (os, t) => new { os.Id, os.Color, t.Name, IsSystem = os.TenantId == null })
                .Select(x => new OrderStatusColumnDto
                {
                    StatusId = x.Id,
                    StatusColor = x.Color,
                    StatusName = x.Name,
                    IsSystem = x.IsSystem,

                    TotalOrders = _dbContextContext.Orders
                        .Count(o => o.TenantId == tenantId && o.StatusId == x.Id && o.CreatedAt.Date == DateTime.UtcNow.Date),

                    Orders = _dbContextContext.Orders
                        .Where(o => o.TenantId == tenantId && o.StatusId == x.Id && o.CreatedAt.Date == DateTime.UtcNow.Date)
                        .OrderByDescending(o => o.CreatedAt)   // adjust to your column
                        .Select(o => new
                        {
                            Order = o,
                            Rate = o.CurrencyCode == currency
                                ? 1m
                                : _dbContextContext.ExchangeRates
                                    .Where(ex => ex.BaseCurrency == o.CurrencyCode
                                              && ex.TargetCurrency == currency)
                                    .Select(ex => ex.Rate)
                                    .FirstOrDefault()
                        })
                        .Select(r => new OrderSummaryStatusDto
                        {
                            OrderId = r.Order.Id,
                            OrderNumber = r.Order.OrderNumber,
                            TotalPrice = r.Order.Total * r.Rate,
                            TableNumber = _dbContextContext.Tables
                                .Where(t => t.Id == r.Order.TableId)
                                .Select(t => t.Number)
                                .FirstOrDefault(),
                            // PaymentStatus is the only field the payment flow
                            // actually maintains (PaidAmount/PaidAt are never
                            // written), so the status code decides this.
                            // "partial" and "refunded" are both not paid.
                            IsPaid = r.Order.PaymentStatus.Code == PaymentStatusCodes.Paid,
                            Lines = r.Order.Items.Select(item => new OrderLineItemDto
                            {
                                Id = item.Id,
                                Name = _dbContextContext.MenuItemTranslations
                                    .Where(mt => mt.MenuId == item.MenuItemId && mt.Lang == lan)
                                    .Select(mt => mt.Name)
                                    .FirstOrDefault(),
                                Quantity = item.Quantity,
                                UnitPrice = item.UnitPrice * r.Rate,
                                TotalPrice = item.UnitPrice * item.Quantity * r.Rate
                            }).ToList()
                        })
                        .ToList()
                })
                .AsSplitQuery()
                .ToListAsync(ct);


        public Task<Order?> GetOrderByIdAsync(Guid orderId, Guid TenantId, CancellationToken ct)
        =>
              _dbContextContext.Orders
                .FirstOrDefaultAsync(o => o.Id == orderId && o.TenantId == TenantId, ct);

        public async Task<ChangeStatusResult> ChangeStatusAsync(
      Guid tenantId, Guid orderId, int statusId, Guid? userId, CancellationToken ct)
        {
            var status = await _dbContextContext.OrderStatuses
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == statusId
                                       && s.IsActive
                                       && (s.TenantId == null || s.TenantId == tenantId), ct);
            if (status == null) return ChangeStatusResult.StatusNotFound;

            var order = await _dbContextContext.Orders   // tracked on purpose
                .FirstOrDefaultAsync(o => o.Id == orderId && o.TenantId == tenantId, ct);
            if (order == null) return ChangeStatusResult.OrderNotFound;

            if (order.StatusId == status.Id) return ChangeStatusResult.Success; // no-op

            var now = DateTime.UtcNow;
            order.StatusId = status.Id;
            order.UpdatedAt = now;

            _dbContextContext.OrderStatusHistories.Add(new OrderStatusHistory
            {
                OrderId = order.Id,
                StatusId = status.Id,
                ChangedAt = now,
                ChangedByUserId = userId
            });

            await _dbContextContext.SaveChangesAsync(ct); // one transaction
            return ChangeStatusResult.Success;
        }




        public Task<List<OrderLineItemDto>> GetTrackingInfo(Guid order, string lan, string ToCurrency, CancellationToken ct)

            => _dbContextContext.OrderItems
                .Where(o => o.OrderId == order)
                .AsNoTracking()
                .Join(
                  _dbContextContext.MenuItemTranslations.Where(t => t.Lang == lan),
                  oi => oi.MenuItemId,
                  t => t.MenuId,
                  (oi, t) => new
                  {
                      oi.MenuItemId,
                      t.Name,
                      oi.Quantity,
                      oi.UnitPrice
                  }

                ).Select(x => new OrderLineItemDto
                {
                    Id = x.MenuItemId.Value,
                    Name = x.Name,
                    Quantity = x.Quantity,
                    UnitPrice = x.UnitPrice,
                    TotalPrice = x.Quantity * x.UnitPrice
                })
                .ToListAsync(ct);


        public async Task<PagedResult<AdminOrdersHistoryDTO>> GetAdminOrdersHistoryAsync(
    AdminHistoryFilters f, Guid tenantId, string language, string currency)
        {
            var query = _dbContextContext.Orders
                .AsNoTracking()
                .Where(o => o.TenantId == tenantId);

            if (f.OrderNumber.HasValue)
                query = query.Where(o => o.OrderNumber == f.OrderNumber.Value);
            if (f.OrderStatus.HasValue)
                query = query.Where(o => o.StatusId == f.OrderStatus.Value);
            if (f.paymentStatus.HasValue)
                query = query.Where(o => o.PaymentStatusId == f.paymentStatus.Value);
            if (f.FromUTC.HasValue)
                query = query.Where(o => o.CreatedAt >= f.FromUTC.Value);
            if (f.ToUTC.HasValue)
                query = query.Where(o => o.CreatedAt <= f.ToUTC.Value);

            var pageSize = Math.Clamp(f.PageCunt, 1, 100);
            var pageNumber = Math.Max(f.PageNumber, 1);
            // Count BEFORE joins and paging
            var totalOrders = await query.CountAsync();

            var items = await (
                from o in query
                join ps in _dbContextContext.PaymentStatusTranslations
                    on new { o.PaymentStatusId, Lang = language }
                    equals new { ps.PaymentStatusId, Lang = ps.Lang }
                join os in _dbContextContext.OrderStatusTranslations
                    on new { o.StatusId, Lang = language }
                    equals new { StatusId = os.OrderStatusId, Lang = os.Lang }
                join tb in _dbContextContext.Tables
                    on o.TableId equals (Guid?)tb.Id into tableGroup
                from tb in tableGroup.DefaultIfEmpty()
                orderby o.CreatedAt descending, o.OrderNumber descending
                select new AdminOrdersHistoryDTO
                {
                    orderId = o.Id,
                    TableId = tb.Number,
                    OrderNumber = o.OrderNumber,
                    OrderStatus = os.Name,
                    PaymentStatus = ps.Name,
                    Subtotal = o.Subtotal,
                    Total = o.Total,
                    PaidAmount = o.PaidAmount,
                    PaidAtUTC = o.PaidAt,
                    Notes = o.Notes,
                    CreatedAtURC = o.CreatedAt,
                    TotalItems = o.Items.Count()
                })
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResult<AdminOrdersHistoryDTO>
            {
                Items = items,
                Page = pageNumber,
                PageSize = pageSize,
                TotalCount = totalOrders,
            };
        }



        public Task<int> GetTotalOrdersInTenantByTenantIdAsync(Guid tenantId)
        => _dbContextContext.Orders
                .AsNoTracking()
                .Where(o => o.TenantId == tenantId)
                 .CountAsync();







        //public Task<bool> PaymentExist(int paymentId , Guid ORderID) =>
        // _dbContextContext.PaymentMethods
        //    .Include(t=>t.TenantPaymentMethods)
        // .AsNoTracking()
        // .AnyAsync(p => p.Id == paymentId && p.TenantPaymentMethods.);

    }
}