namespace NFC_Backend.Domain.DTOS
{
    public class PayInvoiceRequest
    {
        public Guid OrderId { get; set; }
        public int PaymentMethod { get; set; }
        public decimal PayedAmount { get; set; }
    }
}
