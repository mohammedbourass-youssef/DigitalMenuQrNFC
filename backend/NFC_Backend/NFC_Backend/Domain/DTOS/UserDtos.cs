using System.ComponentModel.DataAnnotations;
using NFC_Backend.Domain.Entities;

namespace NFC_Backend.Domain.DTOS
{

    public record RegisterDTO(string fullName, string email, string PassWord, string RestaurantName,
     IFormFile? Logo, string? PrimaryColor,
     string BusinesPhoneNumber,
     string? Address,
      string? City
     );

    public record LoginDTO(string Email , string Password);
    public class CreateUserDTO
    {
        public string FullName { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
        public string RefreshTokenHash { get; set; }
        public int DaysToExpire { get; set; }
        public Guid? TenantId { get; set; }
    }
    public class UserPermissionsDto
    {
        public Guid FeatureId { get; set; }
        public string FeatureCode { get; set; }

        public FeatureStatus FeatureStatus { get; set; }
        public bool inPlan { get; set; }
        public bool canRead { get; set; }
        public bool canEdit { get; set; }
        public bool canDelete { get; set; }
        public bool canWrite { get; set; }
    }
    public class UserResponseDto
    {
        public Guid Id { get; set; }
        public Guid? TenantId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;

        //Infos Of 
        public string RestaurantName { get; set; } = string.Empty;

       public List<UserPermissionsDto> Features { get; set; }

    }

    public class UserListItemDTO
    {
        public Guid Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string SystemRole { get; set; } = string.Empty;
        public List<string> RoleNames { get; set; } = new();
        public bool IsActive { get; set; }
        public bool EmailConfirmed { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public DateTime CreatedAtUTC { get; set; }
    }

    public class TenantRoleDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }

    public class CreateTenantUserRequest
    {
        [Required, MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required, EmailAddress]
        public string Email { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? Password { get; set; }

        [Required]
        public Guid RoleId { get; set; }
    }

    public class CreateTenantUserResponse
    {
        public Guid Id { get; set; }
        public string? TemporaryPassword { get; set; }
    }

    public class UserListRequest
    {
        public string? Search { get; set; }
        public string? Status { get; set; }
        public string? Verification { get; set; }
        public string? SortKey { get; set; }
        public string? SortDirection { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class PagedUserListDTO
    {
        public List<UserListItemDTO> Items { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int PageCount { get; set; }
    }

    public record TenantResponse(Guid Id , string SubDomaine );

}
