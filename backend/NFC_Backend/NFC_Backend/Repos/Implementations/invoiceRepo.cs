using Microsoft.EntityFrameworkCore;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Infrastructure.Data;
using NFC_Backend.Repos.Interfaces;
using System.Linq;

namespace NFC_Backend.Repos.Implementations
{
    public class invoiceRepo : IinvoiceRepo
    {

        private readonly AppDbContext _dbContext;
        public invoiceRepo(AppDbContext dbContext)
        {
            _dbContext = dbContext;
        }
        public async Task<PaymentReceiptDto> GetPaymentReceiptAsync(
    Guid orderId, string currencyCode, string lang, CancellationToken ct = default)
        {
            var inv = await _dbContext.Invoices
                .AsNoTracking()
                .Where(i => i.OrderId == orderId)
                .OrderByDescending(i => i.CreatedAtUtc)
                .Select(i => new
                {
                    i.Id,
                    i.CurrencyCode,
                    i.OrderTotal,
                    i.PaidAmount,
                    i.Notes,
                    PaidAtUtc = i.CreatedAtUtc,

                    MethodId = i.Method.PaymentMethod.Id,
                    MethodCode = i.Method.PaymentMethod.Code,
                    MethodColor = i.Method.PaymentMethod.Color,
                    MethodIcon = i.Method.PaymentMethod.Icon,
                    MethodDisplayName = i.Method.DisplayName,
                    MethodName = i.Method.PaymentMethod.Translations
                        .Where(t => t.Lang == lang)
                        .Select(t => t.Name)
                        .FirstOrDefault(),

                    CashierId = i.User.Id,
                    CashierFullName = i.User.FullName,
                   
                })
                .FirstOrDefaultAsync(ct);

            if (inv is null)
                throw new KeyNotFoundException($"No invoice found for order {orderId}.");

            // Exchange rate (latest available) + target currency precision
            decimal rate = 1m;
            if (inv.CurrencyCode != currencyCode)
            {
                rate = await _dbContext.ExchangeRates
                    .AsNoTracking()
                    .Where(e => e.BaseCurrency == inv.CurrencyCode && e.TargetCurrency == currencyCode)
                    .OrderByDescending(e => e.RateDate)
                    .Select(e => e.Rate)
                    .FirstOrDefaultAsync(ct);

                if (rate == 0m)
                    throw new InvalidOperationException(
                        $"No exchange rate from {inv.CurrencyCode} to {currencyCode}.");
            }

            var decimals = await _dbContext.Currencies
                .AsNoTracking()
                .Where(c => c.Code == currencyCode)
                .Select(c => (int)c.DecimalPlaces)
                .FirstOrDefaultAsync(ct);

            return new PaymentReceiptDto
            {
                OrderId = orderId,
                InvoiceId = inv.Id,
                OrderTotal = Math.Round(inv.OrderTotal * rate, decimals),
                PaidAmount = Math.Round(inv.PaidAmount * rate, decimals),
                CurrencyCode = currencyCode,
                PaidAtUtc = inv.PaidAtUtc,
                Notes = inv.Notes,
                PaymentMethod = new PaymentMethodDto
                {
                    Id = inv.MethodId,
                    Code = inv.MethodCode,
                    Label = inv.MethodName ?? inv.MethodDisplayName ?? inv.MethodCode,
                    Color = inv.MethodColor,
                    Icon = inv.MethodIcon
                },
                Cashier = new CashierDto
                {
                    UserId = inv.CashierId,
                    FullName = inv.CashierFullName,
                }
            };
        }
        public async Task SaveNewInvoice(InvoiceDTO invoice, CancellationToken ct = default)
        {
            await using var transaction = await _dbContext.Database.BeginTransactionAsync(ct);

            var order = await _dbContext.Orders
                .FirstOrDefaultAsync(o => o.Id == invoice.OrderId && o.TenantId == invoice.TenantId, ct);

            if (order is null)
                throw new KeyNotFoundException($"Order {invoice.OrderId} not found for this tenant.");

            var now = DateTime.UtcNow;

            order.CurrencyCode = invoice.currency;
            order.UpdatedAt = now;
            order.PaidAmount = invoice.amount;
            order.PaymentStatusId = 2;

            var newInvoice = new Invoice
            {
                OrderId = invoice.OrderId,
                PaidAmount = invoice.amount,
                CreatedAtUtc = now,
                TenantPaymentMethodId = 2,
                OrderTotal = order.Total,
                Notes = invoice.notes,
                UserId = invoice.UserID
            };

            await _dbContext.Invoices.AddAsync(newInvoice, ct);
            await _dbContext.SaveChangesAsync(ct);

            await transaction.CommitAsync(ct);
        }
    }
}
