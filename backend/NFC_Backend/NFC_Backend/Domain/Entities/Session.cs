namespace NFC_Backend.Domain.Entities
{
    public class Session
    {
        public Guid Id { get; set; }

        public string TokenHash { get; set; } = null!;
        public Guid? TenantId { get; set; }
        public Tenant? Tenant { get; set; }
        public Guid? TableId { get; set; }
        public Table? Table { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public DateTime? LastSeenAt { get; set; }
        public DateTime? RevokedAt { get; set; }

        public string? IpAddress { get; set; }
        public string? UserAgent { get; set; }

        public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
        public bool IsRevoked => RevokedAt.HasValue;
        public bool IsValid => !IsExpired && !IsRevoked;
    }
}
