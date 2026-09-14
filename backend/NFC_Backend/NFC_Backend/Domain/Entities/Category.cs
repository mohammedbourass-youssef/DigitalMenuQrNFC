using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NFC_Backend.Domain.Entities
{
    public class Category
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid TenantId { get; set; }

        [MaxLength(20)]
        public string? Color { get; set; } // hex, e.g. "#FF5733"

        // ── Suggested additions ──────────────────────────────
        [MaxLength(200)]
        public string? ImageUrl { get; set; }          // category icon/photo

        public int DisplayOrder { get; set; } = 0;      // for sorting on the menu

        public bool IsActive { get; set; } = true;      // show/hide without deleting

        [Column(TypeName = "timestamp with time zone")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column(TypeName = "timestamp with time zone")]
        public DateTime? UpdatedAt { get; set; }
        // ──────────────────────────────────────────────────────

        // Navigation
        public Tenant Tenant { get; set; } = null!;
        public ICollection<CategoryTranslation> Translations { get; set; } = new List<CategoryTranslation>();
        // public ICollection<MenuItem> MenuItems { get; set; } = new List<MenuItem>();
    }
}
