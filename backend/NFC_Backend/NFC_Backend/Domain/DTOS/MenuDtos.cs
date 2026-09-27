namespace NFC_Backend.Domain.DTOS
{
    public class MenuItemPublicDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public decimal Price { get; set; }
        public decimal? OriginalPrice { get; set; }   // set only when DiscountedPrice is active
        public string CurrencyCode { get; set; } = null!;
        public string? CoverImage { get; set; }
        public bool IsFeatured { get; set; }
        public int? PreparationTimeMinutes { get; set; }
        public List<string> Images { get; set; } = new();
    }
}
