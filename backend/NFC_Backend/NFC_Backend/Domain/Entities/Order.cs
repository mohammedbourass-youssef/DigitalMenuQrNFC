namespace NFC_Backend.Domain.Entities
{
    public class Order
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Guid? TableId { get; set; }
        public Guid? SessionId { get; set; }

        public int OrderNumber { get; set; }

        public int StatusId { get; set; }
        public int PaymentStatusId { get; set; }

        public string CurrencyCode { get; set; } = null!;
        public decimal Subtotal { get; set; }
        public decimal Total { get; set; }
        public decimal PaidAmount { get; set; }        // drives Unpaid / Partial / Paid
        public DateTime? PaidAt { get; set; }          // set when fully paid

        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        public Tenant Tenant { get; set; } = null!;
        public Table? Table { get; set; }
        public Session? Session { get; set; }
        public OrderStatus Status { get; set; } = null!;
        public PaymentStatus PaymentStatus { get; set; } = null!;
        public Currency Currency { get; set; } = null!;

        public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
        public ICollection<OrderStatusHistory> StatusHistory { get; set; } = new List<OrderStatusHistory>();
    }
}
