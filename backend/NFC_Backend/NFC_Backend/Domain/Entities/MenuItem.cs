namespace NFC_Backend.Domain.Entities
{
    public class MenuItem
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Guid CategoryId { get; set; }

        public decimal PriceInDefaultCurrency { get; set; }
        public string DefaultCurrencyCode { get; set; } = null!; // e.g. "MAD", ISO 4217

        public string? CoverImage { get; set; }

        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        // --- Suggested additions ---
        public int DisplayOrder { get; set; }          // order within category, mirrors Category.DisplayOrder
        public bool IsAvailable { get; set; } = true;   // "in stock" toggle, separate from IsActive
        public bool IsFeatured { get; set; }            // highlight on menu (e.g. "Chef's pick")
        public decimal? DiscountedPrice { get; set; }   // nullable — null means no discount active
        public string? Sku { get; set; }                // internal code for POS/inventory sync
        public int? PreparationTimeMinutes { get; set; }// shown to customer, useful for restaurant/POS context

        // Navigation
        public Category Category { get; set; } = null!;
        public Tenant Tenant { get; set; } = null!;
        public ICollection<MenuItemTranslation> Translations { get; set; } = new List<MenuItemTranslation>();
        public ICollection<MenuImage> Images { get; set; } = new List<MenuImage>();
    }
}
