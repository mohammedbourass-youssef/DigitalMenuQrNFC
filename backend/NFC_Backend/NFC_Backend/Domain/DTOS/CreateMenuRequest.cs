using System.ComponentModel.DataAnnotations;

namespace NFC_Backend.Domain.DTOS
{
    public class AdminGetAllMenuRequest
    {
        [Required(ErrorMessage = "Currency code is required.")]
        [StringLength(3, MinimumLength = 3, ErrorMessage = "Currency code must be exactly 3 characters (ISO 4217).")]
        public string CurrencyCode { get; set; } = null!;   // e.g. "MAD", "USD"

        [Required(ErrorMessage = "Language is required.")]
        [StringLength(10, MinimumLength = 2, ErrorMessage = "Language code must be between 2 and 10 characters.")]
        public string Language { get; set; } = null!;        // e.g. "en", "ar", "fr"

        [Range(1, 100000, ErrorMessage = "Page must be 1 or greater.")]
        public int Page { get; set; } = 1;

        [Range(1, 100, ErrorMessage = "PageSize must be between 1 and 100.")]
        public int PageSize { get; set; } = 20;
    }
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
        public IFormFile? CoverImage { get; set; }

        public IEnumerable<IFormFile> Images { get; set; } = Enumerable.Empty<IFormFile>();
    }

    public class UpdateMenuItemDetailsDto
    {
        public string? Sku { get; set; }
        public decimal PriceInDefaultCurrency { get; set; }
        public decimal? DiscountedPrice { get; set; }
        public int PreparationTimeMinutes { get; set; }
        public bool IsAvailable { get; set; }
        public bool IsFeatured { get; set; }
    }

    public class ImageOrderDto
    {
        public Guid ImageId { get; set; }
        public int DisplayOrder { get; set; }
    }

    public class MoveMenuItemRequest
    {
        [Required(ErrorMessage = "CategoryId is required.")]
        public Guid CategoryId { get; set; }
    }

}