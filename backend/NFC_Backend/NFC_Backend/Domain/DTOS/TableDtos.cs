using System.ComponentModel.DataAnnotations;

namespace NFC_Backend.Domain.DTOS
{
    public class CreateTableDTO
    {
        [Required]
        public int Number { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public bool IsAvailable { get; set; } = true;
    }

    public class UpdateTableDTO
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        public int Number { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public bool IsAvailable { get; set; } = true;
    }

    public class TableResponseDTO
    {
        public Guid Id { get; set; }
        public int Number { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsAvailable { get; set; }
        public string? QrCodeUrl { get; set; }
    }
}
