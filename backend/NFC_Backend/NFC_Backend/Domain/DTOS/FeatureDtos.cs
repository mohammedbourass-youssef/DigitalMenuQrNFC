namespace NFC_Backend.Domain.DTOS
{
    public record FeatureDto(
        Guid Id,
        string Code,
        string Name,
        string Status);
}
