using System.ComponentModel.DataAnnotations;

namespace NFC_Backend.Domain.Entities
{
    public class CategoryTranslation
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid CategoryId { get; set; }

        [Required, MaxLength(5)]
        public string Lang { get; set; } = string.Empty; // e.g. "en", "fr", "ar"

        [Required, MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        public string? Descriptions { get; set; }

        // Navigation
        public Category Category { get; set; } = null!;
    }
}
