namespace NFC_Backend.Domain.Entities
{
    public class PaymentStatus
    {
        public int Id { get; set; }
        public string Code { get; set; } = null!;
        public string? Color { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; } = true;
        public bool IsSystem { get; set; } = false;
        
        public ICollection<PaymentStatusTranslation> Translations { get; set; } = new List<PaymentStatusTranslation>();
    }
}
