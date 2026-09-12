namespace NFC_Backend.Domain.DTOS
{
    public record CreateTenantDTO(string RestaurantName,
    string? PrimaryColor,
    string BusinesPhoneNumber,
    string? Address,
    string? City
   );
}
