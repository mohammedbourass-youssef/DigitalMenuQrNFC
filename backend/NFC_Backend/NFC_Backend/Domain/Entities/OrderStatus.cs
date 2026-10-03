namespace NFC_Backend.Domain.Entities
{
    public class OrderStatus
    {
        public int Id { get; set; }
        public string Code { get; set; } = null!;
        public Guid? TenantId { get; set; }
        public string? Color { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsFinal { get; set; }
        public bool IsActive { get; set; } = true;
        public Tenant? Tenant { get; set; }
        public ICollection<OrderStatusTranslation> Translations { get; set; } = new List<OrderStatusTranslation>();
    }
}
