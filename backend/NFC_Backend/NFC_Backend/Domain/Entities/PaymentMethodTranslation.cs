namespace NFC_Backend.Domain.Entities
{
    public class PaymentMethodTranslation
    {
        public int Id { get; set; }
        public int PaymentMethodId { get; set; }
        public string Lang { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string? Description { get; set; }

        public PaymentMethod PaymentMethod { get; set; } = null!;
    }
}
