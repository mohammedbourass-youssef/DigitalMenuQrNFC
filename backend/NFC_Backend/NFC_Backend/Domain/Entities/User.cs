using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NFC_Backend.Domain.Entities
{
    public enum UserRole
    {
        SuperAdmin = 0,   // eByte platform-level admin
        TenantOwner = 1,  // Restaurant owner
        TenantStaff = 2   // Restaurant staff/manager
    }

    public class User
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid? TenantId { get; set; }

        [Required, MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        public UserRole Role { get; set; } = UserRole.TenantStaff;

        // Refresh token management
        public string? RefreshToken { get; set; }
        public DateTime? RefreshTokenExpiryTime { get; set; }
        public DateTime? RefreshTokenRevockedAt { get; set; }
        public bool IsRevoked { get; set; }

        public bool IsActive { get; set; } = true;
        public bool EmailConfirmed { get; set; } = false;

        public DateTime? LastLoginAt { get; set; }

        [Column(TypeName = "timestamp with time zone")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column(TypeName = "timestamp with time zone")]
        public DateTime? UpdatedAt { get; set; }

        // Navigation
        public Tenant? Tenant { get; set; }
        public ICollection<VerificationCode> VerificationCodes { get; set; } = new List<VerificationCode>();
    }
}
