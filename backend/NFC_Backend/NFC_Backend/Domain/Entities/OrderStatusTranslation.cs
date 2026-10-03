namespace NFC_Backend.Domain.Entities
{
    public class OrderStatusTranslation
    {
        public int Id { get; set; }
        public int OrderStatusId { get; set; }
        public string Lang { get; set; } = null!;
        public string Name { get; set; } = null!;

        public OrderStatus OrderStatus { get; set; } = null!;
    }
}
