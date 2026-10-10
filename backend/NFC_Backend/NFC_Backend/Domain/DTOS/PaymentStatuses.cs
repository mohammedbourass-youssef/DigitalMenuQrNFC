using System.ComponentModel.DataAnnotations;

namespace NFC_Backend.Domain.DTOS
{
    public record PaymentStatusTranslationDto(
         [Required, StringLength(10)] string Lang,
         [Required, StringLength(100)] string Name);

    public class CreatePaymentStatusDto
    {
        [Required, RegularExpression(@"^[A-Za-z][A-Za-z0-9_]{1,49}$",
            ErrorMessage = "Code must start with a letter and contain only letters, digits or underscore.")]
        public string Code { get; set; } = null!;

        [RegularExpression(@"^#[0-9A-Fa-f]{6}$", ErrorMessage = "Color must be a hex value like #22C55E.")]
        public string? Color { get; set; }

        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; } = true;

        [Required, MinLength(1)]
        public List<PaymentStatusTranslationDto> Translations { get; set; } = new();
    }

    // Code is intentionally NOT editable
    public class UpdatePaymentStatusDto
    {
        [RegularExpression(@"^#[0-9A-Fa-f]{6}$")]
        public string? Color { get; set; }

        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; } = true;

        [Required, MinLength(1)]
        public List<PaymentStatusTranslationDto> Translations { get; set; } = new();
    }

    public record PaymentStatusDto(
        int Id,
        string Code,
        string? Color,
        int DisplayOrder,
        bool IsActive,
        bool IsSystem,
        List<PaymentStatusTranslationDto> Translations);
}
