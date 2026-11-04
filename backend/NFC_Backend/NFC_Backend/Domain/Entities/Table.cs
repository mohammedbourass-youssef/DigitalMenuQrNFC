namespace NFC_Backend.Domain.Entities
{
    public class Table
    {
        public Guid Id { get; set; }
        public Guid? TenantId { get; set; }
        public Tenant? Tenant { get; set; }
        public int Number { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsAvailable { get; set; } = true;
        public string? QrCodeUrl { get; set; }

        public ICollection<Session> Sessions { get; set; } = new List<Session>();
    }
}