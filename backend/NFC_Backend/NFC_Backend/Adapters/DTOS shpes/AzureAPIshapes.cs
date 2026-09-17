using System.Text.Json.Serialization;

namespace NFC_Backend.Adapters.DTOS_shpes
{
    public record TranslationResult(
    string OriginalText,
    string? DetectedLanguage,
    double? DetectionScore,
    Dictionary<string, string> Translations );

    public record AzureRequestItem(
        [property: JsonPropertyName("Text")] string Text
    );

    public record AzureDetectedLanguage(
        [property: JsonPropertyName("language")] string Language,
        [property: JsonPropertyName("score")] double Score
    );

    public record AzureTranslationItem(
        [property: JsonPropertyName("to")] string To,
        [property: JsonPropertyName("text")] string Text
    );

    public record AzureResponseItem(
        [property: JsonPropertyName("detectedLanguage")] AzureDetectedLanguage? DetectedLanguage,
        [property: JsonPropertyName("translations")] List<AzureTranslationItem> Translations
    );
}
