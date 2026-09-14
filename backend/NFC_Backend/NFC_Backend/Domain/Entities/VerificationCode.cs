namespace NFC_Backend.Domain.Entities
{
    public enum VerificationStatus
    {
        Pending,
        Replaced,
        Verified,
        Deprecated
    }

    public class VerificationCode
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public int Code { get; set; }

        public VerificationStatus VerificationsStatus { get; set; } = VerificationStatus.Pending;

        public DateTime ExpiredAt { get; set; }

        // FK → User
        public Guid UserId { get; set; }
        public User User { get; set; } = null!;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
