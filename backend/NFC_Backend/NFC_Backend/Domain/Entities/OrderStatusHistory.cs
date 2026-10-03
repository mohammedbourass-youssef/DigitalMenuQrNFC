namespace NFC_Backend.Domain.Entities
{
    public class OrderStatusHistory
    {
        public Guid Id { get; set; }
        public Guid OrderId { get; set; }
        public int StatusId { get; set; }
        public Guid? ChangedByUserId { get; set; }
        public DateTime ChangedAt { get; set; }

        public Order Order { get; set; } = null!;
        public OrderStatus Status { get; set; } = null!;
        public User? ChangedByUser { get; set; }
    }
}
