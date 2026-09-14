using System.ComponentModel.DataAnnotations;

namespace NFC_Backend.Domain.DTOS
{
    // DTOs/MyProfileDTO.cs
    public record MyProfileResponse(
        Guid Id,
        string FullName,
        string Email,
        string Role,
        bool IsActive,
        bool EmailConfirmed,
        DateTime? LastLoginAt,
        DateTime CreatedAt
    );

    public record UpdateMyProfileDTO(
        [Required, MaxLength(100)] string FullName
    );
}
