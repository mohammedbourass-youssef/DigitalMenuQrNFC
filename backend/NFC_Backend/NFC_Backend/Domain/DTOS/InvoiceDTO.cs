namespace NFC_Backend.Domain.DTOS
{
    public record InvoiceDTO( Guid OrderId, int PaymentMethod, Guid TenantId ,decimal amount ,string currency , string? notes , Guid UserID);


    public record PaymentReceiptDto
    {
        public Guid OrderId { get; init; }
        public Guid InvoiceId { get; init; }
        public decimal OrderTotal { get; init; }
        public decimal PaidAmount { get; init; }
        public string CurrencyCode { get; init; } = default!;
        public DateTime PaidAtUtc { get; init; }
        public PaymentMethodDto PaymentMethod { get; init; } = default!;
        public string? Notes { get; init; }
        public CashierDto Cashier { get; init; } = default!;
    }

    public record PaymentMethodDto
    {
        public int Id { get; init; }
        public string Code { get; init; } = default!;
        public string Label { get; init; } = default!;
        public string? Color { get; init; }
        public string? Icon { get; init; }
    }

    public record CashierDto
    {
        public Guid UserId { get; init; }
        public string FullName { get; init; } = default!;
    }
}
