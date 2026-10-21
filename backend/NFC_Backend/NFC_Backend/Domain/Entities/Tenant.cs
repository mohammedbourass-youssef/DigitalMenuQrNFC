using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NFC_Backend.Domain.Entities
{
    public enum TenantStatus
    {
        Trial = 0,
        Active = 1,
        Suspended = 2,
        Cancelled = 3
    }

    public class Tenant
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        public int PlanId { get; set; } = 1;
        public Plan Plan { get; set; } = null!;

        [Required, MaxLength(150)]
        public string RestaurantName { get; set; } = string.Empty;

        [Required, MaxLength(63)]
        public string Subdomain { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? LogoUrl { get; set; }

        [MaxLength(20)]
        public string? PrimaryColor { get; set; } // hex, for menu theming

        [MaxLength(20)]
        public string? PhoneNumber { get; set; }

        [MaxLength(200)]
        public string? Address { get; set; }

        [MaxLength(50)]
        public string? City { get; set; }

        [Required]
        public TenantStatus Status { get; set; } = TenantStatus.Trial;
        [MaxLength(63)]
        public string? BucketName { get; set; } = string.Empty;
        public DateTime? TrialEndsAt { get; set; }
        public DateTime? SubscriptionEndsAt { get; set; }
        public BillingCycle BillingCycle { get; set; } = BillingCycle.None;
        public DateTime? PlanStartedAt { get; set; }
        public bool IsActive { get; set; } = true;

        [Column(TypeName = "timestamp with time zone")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column(TypeName = "timestamp with time zone")]
        public DateTime? UpdatedAt { get; set; }
        // Default currency for this tenant's menu pricing
        [MaxLength(3)]
        public string CurrencyCode { get; set; } = "MAD";
        // Navigation
        public ICollection<User> Users { get; set; } = new List<User>();
        

        // Navigation
        public Currency Currency { get; set; } = null!;
        public ICollection<Category> Categories { get; set; } = new List<Category>();
        // public ICollection<MenuItem> MenuItems { get; set; } = new List<MenuItem>();
        // public ICollection<Category> Categories { get; set; } = new List<Category>();
    }
}
