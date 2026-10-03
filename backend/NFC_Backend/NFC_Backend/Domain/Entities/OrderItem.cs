namespace NFC_Backend.Domain.Entities
{
    public class OrderItem
    {
        public Guid Id { get; set; }
        public Guid OrderId { get; set; }
        public Guid? MenuItemId { get; set; }          // nullable: item may be deleted later

        // Snapshots, so old orders never change when the menu changes
        public string NameSnapshot { get; set; } = null!;
        public decimal UnitPrice { get; set; }         // in Order.CurrencyCode
        public int Quantity { get; set; }
        public decimal LineTotal { get; set; }
        public string? Notes { get; set; }

        public Order Order { get; set; } = null!;
        public MenuItem? MenuItem { get; set; }
    }

}
