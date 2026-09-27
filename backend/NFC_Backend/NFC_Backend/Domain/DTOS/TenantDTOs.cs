namespace NFC_Backend.Domain.DTOS
{
    public record CreateTenantDTO(string RestaurantName,
    string? PrimaryColor,
    string BusinesPhoneNumber,
    string? Address,
    string? City
   );

    public class MenuRequest
    {
        public Guid? CategoryId { get; set; }
        public bool getAll => CategoryId == null;
        public string lang { get; set; }
        public string currency { get; set; }
    }
}
