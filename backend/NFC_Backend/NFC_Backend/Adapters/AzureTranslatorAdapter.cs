using NFC_Backend.Adapters.DTOS_shpes;
using NFC_Backend.Infrastructure.Configs;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace NFC_Backend.Adapters
{

    public sealed class AzureTranslatorAdapter : ITranslatorAdapter
    {
        private readonly HttpClient _http;
        private readonly string _apiKey;
        private readonly string _region;
        private readonly string _endpoint;

        private readonly ILogger<AzureTranslatorAdapter> _logger;
        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNameCaseInsensitive = true,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        };

        public AzureTranslatorAdapter(HttpClient http, AzureTranslatorOptions options, ILogger<AzureTranslatorAdapter> logger)
        {
            ArgumentException.ThrowIfNullOrEmpty(options.ApiKey, nameof(options.ApiKey));
            ArgumentException.ThrowIfNullOrEmpty(options.Region, nameof(options.Region));

            _http = http;
            _logger = logger;
            _apiKey = options.ApiKey;
            _region = options.Region;
            _endpoint = options.Endpoint.TrimEnd('/');

        }

        /// <summary>
        /// Translate <paramref name="text"/> into all <paramref name="targetLangs"/>
        /// with a SINGLE HTTP call to Azure.
        /// </summary>
        public async Task<TranslationResult> TranslateAsync(
            string text,
            IEnumerable<string> targetLangs,
            string? fromLang = null,
            CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(text))
                throw new ArgumentException("text must not be empty", nameof(text));

            var langs = targetLangs.ToList();
            if (langs.Count == 0)
                throw new ArgumentException("targetLangs must contain at least one language", nameof(targetLangs));

            // Build URL: /translate?api-version=3.0&to=fr&to=ar&to=es&from=en
            var qs = new StringBuilder($"{_endpoint}/translate?api-version=3.0");
            foreach (var lang in langs) qs.Append($"&to={lang}");
            if (!string.IsNullOrEmpty(fromLang)) qs.Append($"&from={fromLang}");

            var body = JsonSerializer.Serialize(new[] { new AzureRequestItem(text) }, _json);
            var content = new StringContent(body, Encoding.UTF8, "application/json");

            using var request = new HttpRequestMessage(HttpMethod.Post, qs.ToString()) { Content = content };
            request.Headers.Add("Ocp-Apim-Subscription-Key", _apiKey);
            request.Headers.Add("Ocp-Apim-Subscription-Region", _region);

            var response = await _http.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError("Azure Translator failed: {Status} {Body}", (int)response.StatusCode, error);
                response.EnsureSuccessStatusCode();
            }
            response.EnsureSuccessStatusCode();

            var azureResults = await response.Content.ReadFromJsonAsync<List<AzureResponseItem>>(_json, ct)
                ?? throw new InvalidOperationException("Azure Translator returned an empty response");

            var item = azureResults[0];

            var translations = item.Translations.ToDictionary(t => t.To, t => t.Text);

            return new TranslationResult(
                OriginalText: text,
                DetectedLanguage: item.DetectedLanguage?.Language,
                DetectionScore: item.DetectedLanguage?.Score,
                Translations: translations
            );
        }

        /// <summary>
        /// Translate multiple texts. Runs all in parallel.
        /// </summary>
        public async Task<List<TranslationResult>> TranslateBatchAsync(
            IEnumerable<string> texts,
            IEnumerable<string> targetLangs,
            string? fromLang = null,
            CancellationToken ct = default)
        {
            var langList = targetLangs.ToList();
            var tasks = texts.Select(t => TranslateAsync(t, langList, fromLang, ct));
            return [.. await Task.WhenAll(tasks)];
        }
    }
}
