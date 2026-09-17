// GeminiLmTranslatorAdapter.cs
using NFC_Backend.Infrastructure.Configs;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace NFC_Backend.Adapters
{
    public sealed class GeminiLmTranslatorAdapter : IGeminiLmTranslatorAdapter
    {
        private readonly HttpClient _http;
        private readonly string _apiKey;
        private readonly string _endpoint;
        private readonly string _model;
        private readonly ILogger<GeminiLmTranslatorAdapter> _logger;

        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNameCaseInsensitive = true,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        };

        private const string SystemPrompt = """
            You transliterate restaurant menu category names into the target language's script,
            preserving the SOUND of the original word rather than translating its meaning.

            Example: "Burgers" -> Arabic: "برغرز" (NOT "شطائر لحم").
            Example: "Sushi" -> Korean: "스시" (NOT a description of raw fish).
            Example: "Pizza" -> Chinese: "披萨" (the commonly used loanword form, not a literal description).

            Only transliterate names that are genuinely brand-like/food-loanwords. If the name is a
            plain descriptive phrase with no natural loanword identity (e.g. "Grilled Chicken",
            "Cold Drinks"), translate it normally into the target language instead.

            Respond with ONLY a raw JSON object mapping each requested language code to the result.
            No markdown fences, no explanation, no extra text. Example output:
            {"ar": "برغرز", "zh": "汉堡", "ko": "버거"}
            """;

        public GeminiLmTranslatorAdapter(
            HttpClient http,
            GeminiOptions options,
            ILogger<GeminiLmTranslatorAdapter> logger)
        {
            ArgumentException.ThrowIfNullOrEmpty(options.ApiKey, nameof(options.ApiKey));

            _http = http;
            _apiKey = options.ApiKey;
            _endpoint = options.Endpoint.TrimEnd('/');
            _model = options.Model;
            _logger = logger;
        }

        public async Task<Dictionary<string, string>> TransliterateAsync(
            string name,
            IEnumerable<string> targetLangs,
            CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("name must not be empty", nameof(name));

            var langs = targetLangs.ToList();
            if (langs.Count == 0)
                throw new ArgumentException("targetLangs must contain at least one language", nameof(targetLangs));

            var url = $"{_endpoint}/models/{_model}:generateContent";

            var userPrompt = $"""
                Name: "{name}"
                Target languages: {string.Join(", ", langs)}
                """;

            var requestBody = new GeminiRequest
            {
                SystemInstruction = new GeminiContent
                {
                    Parts = [new GeminiPart(SystemPrompt)]
                },
                Contents =
                [
                    new GeminiContent { Parts = [new GeminiPart(userPrompt)] }
                ],
                GenerationConfig = new GeminiGenerationConfig
                {
                    ResponseMimeType = "application/json",
                    Temperature = 0.1
                }
            };

            var content = new StringContent(
                JsonSerializer.Serialize(requestBody, _json), Encoding.UTF8, "application/json");

            using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };
            request.Headers.Add("X-goog-api-key", _apiKey);

            _logger.LogDebug("Gemini request URL: {Url}", url);

            var response = await _http.SendAsync(request, ct);
            response.EnsureSuccessStatusCode();

            var geminiResponse = await response.Content.ReadFromJsonAsync<GeminiResponse>(_json, ct)
                ?? throw new InvalidOperationException("Gemini returned an empty response");

            var text = geminiResponse.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text
                ?? throw new InvalidOperationException("Gemini response had no text content");

            var result = JsonSerializer.Deserialize<Dictionary<string, string>>(text, _json)
                ?? throw new InvalidOperationException("Failed to parse Gemini transliteration result as JSON");

            return result;
        }
    }

    // --- Gemini request/response DTOs ---

    internal sealed class GeminiRequest
    {
        [JsonPropertyName("system_instruction")]
        public GeminiContent? SystemInstruction { get; set; }

        [JsonPropertyName("contents")]
        public required List<GeminiContent> Contents { get; set; }

        [JsonPropertyName("generationConfig")]
        public GeminiGenerationConfig? GenerationConfig { get; set; }
    }

    internal sealed class GeminiContent
    {
        [JsonPropertyName("parts")]
        public required List<GeminiPart> Parts { get; set; }
    }

    internal sealed class GeminiPart
    {
        [JsonPropertyName("text")]
        public string Text { get; set; }

        public GeminiPart(string text) => Text = text;
        public GeminiPart() => Text = string.Empty;
    }

    internal sealed class GeminiGenerationConfig
    {
        [JsonPropertyName("responseMimeType")]
        public string? ResponseMimeType { get; set; }

        [JsonPropertyName("temperature")]
        public double? Temperature { get; set; }
    }

    internal sealed class GeminiResponse
    {
        [JsonPropertyName("candidates")]
        public List<GeminiCandidate>? Candidates { get; set; }
    }

    internal sealed class GeminiCandidate
    {
        [JsonPropertyName("content")]
        public GeminiContent? Content { get; set; }
    }
}