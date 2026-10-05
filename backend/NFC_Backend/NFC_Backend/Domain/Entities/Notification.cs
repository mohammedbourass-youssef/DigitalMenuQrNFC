namespace NFC_Backend.Domain.Entities
{
    public enum NotificationType
    {
        OrderCreated = 1
        // add more later: PaymentReceived, OrderShipped...
    }

    public class Notification
    {
        public int Id { get; set; }
        public NotificationType Type { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public int? OrderId { get; set; }          // what the notification refers to
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
