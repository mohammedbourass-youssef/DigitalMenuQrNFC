using System.ComponentModel.DataAnnotations;

namespace NFC_Backend.Domain.DTOS
{
    public class CreateCateogryRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int SortOrder { get; set; }
        public IFormFile? Image { get; set; }
        public string Color { get; set; } = string.Empty;
    }
    public class CreateCateogryResponse
    {
        public Guid CategoryId { get; set; }
        public Dictionary<string, string> Names { get; set; } = new Dictionary<string, string>();
        public Dictionary<string, string> Descriptions { get; set; } = new Dictionary<string, string>();
    }
    public sealed class UpdateCateogryRequest
    {
        public required Guid CategoryId { get; init; }
        public required Dictionary<string, LocalizedCategoryText> Translations { get; init; } // lang -> Name/Description
    }
    // ✅ Parameterless constructor for model binding + validation via data annotations
    public sealed class CategoryAdminRequest
    {
        [Required]
        [MinLength(2)]
        public string Lang { get; init; } = "en";

        [Range(1, int.MaxValue, ErrorMessage = "PageNumber must be at least 1")]
        public int PageNumber { get; init; } = 1;

        [Range(1, 100, ErrorMessage = "PageCount must be between 1 and 100")]
        public int PageCount { get; init; } = 10;
    }

    // ✅ Null-safe — API can return null name/desc for missing translations
    public record AdminCategorisData(
        Guid Id,
        string? Name,
        string? Desc,
        string? Color,
        string? ImageUrl,
        bool IsActive,
        DateTime CreatedAt
    );
    public class UpdateCategoryDisplayRequest
    {
        public Guid CategoryId { get; set; }
        public string Color { get; set; } = null!;
        public int DisplayOrder { get; set; }
    }
    public record SimpleCategoryInfoDto (Guid id , string Name , string Desc , string color);

    public class SearchCategoryRequest
    {
        public string? Query { get; set; }

        [Required(ErrorMessage = "Language is required.")]
        public string Language { get; set; }
    }
    public class CategorySimpleInfoPublicDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Desc { get; set; }
        public string Color { get; set; }
        public string Image { get; set; }
    }
}
