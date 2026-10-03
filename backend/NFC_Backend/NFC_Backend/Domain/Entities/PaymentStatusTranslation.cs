namespace NFC_Backend.Domain.Entities
{
    public class PaymentStatusTranslation
    {
        public int Id { get; set; }
        public int PaymentStatusId { get; set; }
        public string Lang { get; set; } = null!;
        public string Name { get; set; } = null!;

        public PaymentStatus PaymentStatus { get; set; } = null!;
    }
}
