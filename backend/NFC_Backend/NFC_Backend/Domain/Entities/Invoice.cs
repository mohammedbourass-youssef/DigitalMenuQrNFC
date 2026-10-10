namespace NFC_Backend.Domain.Entities
{
    public class Invoice
    {
        public Guid Id { get; set; }

        public Guid UserId { get; set; }
        public Guid OrderId { get; set; }
        public int TenantPaymentMethodId { get; set; }

        public decimal OrderTotal { get; set; }
        public decimal PaidAmount { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        public User User { get; set; } = null!;
        public Order Order { get; set; } = null!;
        public TenantPaymentMethod Method { get; set; } = null!;
    }
}
