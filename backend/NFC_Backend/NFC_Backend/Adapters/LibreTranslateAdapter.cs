using NFC_Backend.Adapters.DTOS_shpes;
using NFC_Backend.Infrastructure.Configs;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace NFC_Backend.Adapters
{
    public sealed class LibreTranslateAdapter : ITranslatorAdapter
    {
        private readonly HttpClient _http;
        private readonly string? _apiKey;
        private readonly ILogger<LibreTranslateAdapter> _logger;

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        };

        public LibreTranslateAdapter(
            HttpClient http,
            LibreTranslateOptions options,
            ILogger<LibreTranslateAdapter> logger)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(options.Endpoint);

            _http = http;
            _http.BaseAddress = new Uri(options.Endpoint.TrimEnd('/') + "/");
            _apiKey = string.IsNullOrWhiteSpace(options.ApiKey) ? null : options.ApiKey.Trim();
            _logger = logger;
        }

        public async Task<TranslationResult> TranslateAsync(
            string text,
            IEnumerable<string> targetLangs,
            string? fromLang = null,
            CancellationToken ct = default)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(text);
            ArgumentNullException.ThrowIfNull(targetLangs);

            var languages = targetLangs
                .Where(language => !string.IsNullOrWhiteSpace(language))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
            if (languages.Count == 0)
                throw new ArgumentException("targetLangs must contain at least one language", nameof(targetLangs));

            var source = string.IsNullOrWhiteSpace(fromLang) ? "auto" : fromLang.Trim();
            var tasks = languages.Select(async language =>
            {
                if (!string.Equals(language, source, StringComparison.OrdinalIgnoreCase))
                {
                    try
                    {
                        var request = new LibreRequest(text, source, language, "text", _apiKey);
                        using var response = await _http.PostAsJsonAsync("translate", request, JsonOptions, ct);
                        if (!response.IsSuccessStatusCode)
                        {
                            var error = await response.Content.ReadAsStringAsync(ct);
                            _logger.LogError("LibreTranslate failed ({Lang}): {Status} {Body}",
                                language, (int)response.StatusCode, error);
                            response.EnsureSuccessStatusCode();
                        }

                        var result = await response.Content.ReadFromJsonAsync<LibreResponse>(JsonOptions, ct)
                            ?? throw new InvalidOperationException("LibreTranslate returned an empty response");
                        return (Language: language, Text: result.TranslatedText,
                            DetectedLanguage: result.DetectedLanguage?.Language,
                            Confidence: result.DetectedLanguage is null
                                ? (double?)null
                                : result.DetectedLanguage.Confidence / 100d);
                    }
                    catch (Exception ex) when (!ct.IsCancellationRequested
                        && ex is HttpRequestException or TaskCanceledException or InvalidOperationException or JsonException)
                    {
                        _logger.LogWarning(ex,
                            "LibreTranslate request failed for language {Lang}; keeping the original text for this language.", language);
                        return (Language: language, Text: text, DetectedLanguage: (string?)null,
                            Confidence: (double?)null);
                    }
                }

                return (Language: language, Text: text, DetectedLanguage: (string?)source,
                    Confidence: (double?)null);
            });

            var results = await Task.WhenAll(tasks);
            var detected = results.FirstOrDefault(result => result.DetectedLanguage is not null);

            return new TranslationResult(
                OriginalText: text,
                DetectedLanguage: detected.DetectedLanguage,
                DetectionScore: detected.Confidence,
                Translations: results.ToDictionary(result => result.Language, result => result.Text));
        }

        public async Task<List<TranslationResult>> TranslateBatchAsync(
            IEnumerable<string> texts,
            IEnumerable<string> targetLangs,
            string? fromLang = null,
            CancellationToken ct = default)
        {
            ArgumentNullException.ThrowIfNull(texts);
            var languages = targetLangs.ToList();
            return (await Task.WhenAll(texts.Select(text => TranslateAsync(text, languages, fromLang, ct)))).ToList();
        }

        private sealed record LibreRequest(
            [property: JsonPropertyName("q")] string Q,
            [property: JsonPropertyName("source")] string Source,
            [property: JsonPropertyName("target")] string Target,
            [property: JsonPropertyName("format")] string Format,
            [property: JsonPropertyName("api_key")] string? ApiKey);

        private sealed record LibreResponse(
            [property: JsonPropertyName("translatedText")] string TranslatedText,
            [property: JsonPropertyName("detectedLanguage")] LibreDetected? DetectedLanguage);

        private sealed record LibreDetected(
            [property: JsonPropertyName("confidence")] double Confidence,
            [property: JsonPropertyName("language")] string Language);
    }
}
