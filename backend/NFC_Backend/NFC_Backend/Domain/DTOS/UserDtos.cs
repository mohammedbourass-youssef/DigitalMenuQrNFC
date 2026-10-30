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
    
    public record TenantResponse(Guid Id , string SubDomaine );

}
