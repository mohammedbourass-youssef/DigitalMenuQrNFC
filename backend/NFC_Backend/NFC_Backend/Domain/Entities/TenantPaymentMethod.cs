namespace NFC_Backend.Domain.Entities
{
    public class TenantPaymentMethod
    {
        public int Id { get; set; }
        public Guid TenantId { get; set; }
        public int PaymentMethodId { get; set; }
        public string? DisplayName { get; set; }      // optional custom label, e.g. "Bank (CIH)"
        public bool IsEnabled { get; set; } = true;
        public bool IsDefault { get; set; }
        public int DisplayOrder { get; set; }

        public Tenant Tenant { get; set; } = null!;
        public PaymentMethod PaymentMethod { get; set; } = null!;
    }
}
