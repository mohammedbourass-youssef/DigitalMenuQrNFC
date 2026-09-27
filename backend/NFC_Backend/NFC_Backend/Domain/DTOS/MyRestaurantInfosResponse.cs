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
    public sealed class TenantInfoResponse
    {
        public required string SessionId { get; init; }
        public required string RestaurantName { get; init; }
        public string? LogoUrl { get; init; }
        public string? PrimaryColor { get; init; }
        public required string DefaultCurrency { get; init; }
        public string? PhoneNumber { get; init; }
        public string? Address { get; init; }
    }
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
