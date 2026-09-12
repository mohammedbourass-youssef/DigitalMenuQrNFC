namespace NFC_Backend.Domain.DTOS
{

    public record RegisterDTO(string fullName, string email, string PassWord, string RestaurantName,
     IFormFile? Logo, string? PrimaryColor,
     string BusinesPhoneNumber,
     string? Address,
      string? City
     );
    public class CreateUserDTO
    {
        public string FullName { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
        public string RefreshTokenHash { get; set; }
        public int DaysToExpire { get; set; }
        public Guid? TenantId { get; set; }
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
    }
    
    public record TenantResponse(Guid Id , string SubDomaine );

}
