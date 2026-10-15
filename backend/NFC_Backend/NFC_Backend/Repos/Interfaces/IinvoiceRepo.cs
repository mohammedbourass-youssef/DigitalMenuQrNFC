using NFC_Backend.Domain.DTOS;

namespace NFC_Backend.Repos.Interfaces
{
    public interface IinvoiceRepo
    {
        public  Task SaveNewInvoice(InvoiceDTO invoice, CancellationToken ct = default);
        public Task<PaymentReceiptDto> GetPaymentReceiptAsync(Guid guid, string CurrencyCode, string lan , CancellationToken ct = default);
    }
}
