namespace NFC_Backend.Domain.DTOS
{
    public sealed class CategoryTranslationResult
    {
        public required string SourceLanguage { get; init; }
        public double? DetectionScore { get; init; }

        // languageCode -> (translated name, translated description)
        public required IReadOnlyDictionary<string, LocalizedCategoryText> Translations { get; init; }
    }

    public sealed record LocalizedCategoryText(string Name, string? Description);
}
