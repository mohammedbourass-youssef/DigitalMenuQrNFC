namespace NFC_Backend.Domain.DTOS
{
    public record MyRestaurantInfosResponse(
    string RestaurantName,
    string Subdomain,
    string? LogoUrl,
    string? PrimaryColor,
    string? PhoneNumber,
    string? Address,
    string? City,
    string Status,
    string CurrencyCode,
    DateTime CreatedAt,
    DateTime? TrialEndsAt,
    bool IsInFreeTrial,
    DateTime? SubscriptionEndsAt
);
    public record MyRestaurantUpdateInfosDTO(
  string RestaurantName,
  IFormFile? Logo,
  string? PrimaryColor,
  string? PhoneNumber,
  string? Address,
  string? City,
  string CurrencyCode
);

}
