using System.ComponentModel.DataAnnotations;

namespace NFC_Backend.Domain.DTOS
{
    public class CreateMenuRequest
    {
        [Required(ErrorMessage = "Name is required.")]
        [MaxLength(100, ErrorMessage = "Name cannot exceed 100 characters.")]
        public string Name { get; set; } = null!;

        [MaxLength(500, ErrorMessage = "Description cannot exceed 500 characters.")]
        public string? Description { get; set; }

        [Required(ErrorMessage = "CategoryId is required.")]
        public Guid CategoryId { get; set; }

        [Required(ErrorMessage = "Price is required.")]
        [Range(0.01, double.MaxValue, ErrorMessage = "Price must be greater than 0.")]
        public decimal PriceInDefaultCurrency { get; set; }

        [Required(ErrorMessage = "Currency code is required.")]
        [StringLength(3, MinimumLength = 3, ErrorMessage = "Currency code must be exactly 3 characters (ISO 4217).")]
        public string DefaultCurrencyCode { get; set; } = null!;

        [Range(0, int.MaxValue, ErrorMessage = "DisplayOrder must be a positive number.")]
        public int DisplayOrder { get; set; }

        public bool IsAvailable { get; set; } = true;

        public bool IsFeatured { get; set; }

        [Range(0.01, double.MaxValue, ErrorMessage = "Discounted price must be greater than 0.")]
        public decimal? DiscountedPrice { get; set; }

        [MaxLength(50, ErrorMessage = "SKU cannot exceed 50 characters.")]
        public string? Sku { get; set; }

        [Range(1, 300, ErrorMessage = "Preparation time must be between 1 and 300 minutes.")]
        public int? PreparationTimeMinutes { get; set; }
    }
    public class UploadMenuImagesRequest
    {

        [Required(ErrorMessage = "Cover image is required.")]
        public IFormFile CoverImage { get; set; } = null!;

        public IEnumerable<IFormFile> Images { get; set; } = Enumerable.Empty<IFormFile>();
    }
}