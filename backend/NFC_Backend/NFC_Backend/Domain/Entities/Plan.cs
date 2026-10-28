using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NFC_Backend.Domain.Entities
{
    public enum BillingCycle
    {
        None = 0,      // Free plan, nothing to bill
        Monthly = 1,
        Yearly = 2
    }

    /// <summary>
    /// System-level subscription plan (managed by SuperAdmin, shared by all tenants).
    /// Limit convention: -1 = unlimited.
    /// </summary>
    public class Plan
    {
        public const int Unlimited = -1;

        [Key]
        public int Id { get; set; }

        [Required, MaxLength(30)]
        public string Code { get; set; } = string.Empty;          // unique slug, e.g. "free", "pro" (data only, never hardcoded in logic)

        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        // ── Pricing ──────────────────────────────────────────
        public bool IsFree { get; set; }

        [MaxLength(3)]
        public string CurrencyCode { get; set; } = "MAD";

        [Column(TypeName = "decimal(18,2)")]
        public decimal PricePerMonth { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal PricePerYear { get; set; }

        /// <summary>Default cycle shown to the customer (tenant can still pick monthly/yearly).</summary>
        public BillingCycle BillingCycle { get; set; } = BillingCycle.Monthly;

        /// <summary>Days before the plan expires. null = never expires (e.g. Free).</summary>
        public int? ExpirationAfterDays { get; set; }

        // ── Limits (-1 = unlimited) ──────────────────────────
        public int MaxUsers { get; set; }
        public int MaxCategories { get; set; }
        public int MaxMenuItems { get; set; }
        public int MaxTables { get; set; }
        public int MaxImagesPerMenuItem { get; set; }
        public int MaxLanguages { get; set; }

        // ── Meta ─────────────────────────────────────────────
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; } = true;

        [Column(TypeName = "timestamp with time zone")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column(TypeName = "timestamp with time zone")]
        public DateTime? UpdatedAt { get; set; }

        // Navigation
        public ICollection<Tenant> Tenants { get; set; } = new List<Tenant>();
        public ICollection<PlanFeature> PlanFeatures { get; set; } = new List<PlanFeature>();

    }
}