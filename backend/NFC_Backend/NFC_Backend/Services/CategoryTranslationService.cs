using NFC_Backend.Adapters;
using NFC_Backend.Adapters.DTOS_shpes;
using NFC_Backend.Domain.Constants;
using NFC_Backend.Domain.DTOS;

namespace NFC_Backend.Services
{
    public sealed class CategoryTranslationService : ICategoryTranslationService
    {
        private readonly ITranslatorAdapter _translator;                  // Azure  — Description
        private readonly IGeminiLmTranslatorAdapter _nameTransliterator;  // Gemini — Name
        private readonly ILogger<CategoryTranslationService> _logger;

        private static readonly string[] TargetLanguages = TranslationLanguages.All;

        public CategoryTranslationService(
            ITranslatorAdapter translator,
            IGeminiLmTranslatorAdapter nameTransliterator,
            ILogger<CategoryTranslationService> logger)
        {
            _translator = translator;
            _nameTransliterator = nameTransliterator;
            _logger = logger;
        }
        public async Task<IReadOnlyDictionary<string, string>> TranslateStatusNameAsync(
    string statusName,
    string? fromLang = null,
    CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(statusName))
                throw new ArgumentException("Status name cannot be null or empty.", nameof(statusName));

            _logger.LogInformation(
                "Translating status name. Name: {Name} | FromLang: {FromLang}",
                statusName, fromLang ?? "auto-detect");

            TranslationResult result;
            try
            {
                result = await _translator.TranslateAsync(statusName, TargetLanguages, fromLang, ct);
            }
            catch (Exception ex) when (!ct.IsCancellationRequested
                && (ex is HttpRequestException || ex is TaskCanceledException))
            {
                _logger.LogWarning(ex, "Status translation failed; using the original text for every language.");
                return TargetLanguages.ToDictionary(lang => lang, _ => statusName);
            }

            var translations = result.Translations;

            // Fall back to the original text for any language Azure didn't return
            var merged = TargetLanguages.ToDictionary(
                lang => lang,
                lang => translations != null
                        && translations.TryGetValue(lang, out var translated)
                        && !string.IsNullOrWhiteSpace(translated)
                    ? translated
                    : statusName);

            _logger.LogInformation(
                "Status name translation completed. Languages: {Count}", merged.Count);

            return merged;
        }
        public async Task<CategoryTranslationResult> TranslateCategoryAsync(
            string name,
            string? description,
            string? fromLang = null,
            CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Name cannot be null or empty.", nameof(name));

            _logger.LogInformation(
                "Translating category. Name: {Name} | HasDescription: {HasDesc} | FromLang: {FromLang}",
                name, !string.IsNullOrWhiteSpace(description), fromLang ?? "auto-detect");

            // Run both translations in parallel
            var nameTask = _nameTransliterator.TransliterateAsync(name, TargetLanguages, ct);

            var descriptionTask = !string.IsNullOrWhiteSpace(description)
                ? _translator.TranslateAsync(description, TargetLanguages, fromLang, ct)
                : null;

            try
            {
                await Task.WhenAll(nameTask, descriptionTask ?? Task.CompletedTask);
            }
            catch (Exception ex) when (!ct.IsCancellationRequested
                && (ex is HttpRequestException || ex is TaskCanceledException))
            {
                _logger.LogWarning(ex,
                    "Category translation failed; saving the original name and description for every language.");
                return new CategoryTranslationResult
                {
                    SourceLanguage = fromLang ?? "unknown",
                    DetectionScore = null,
                    Translations = TargetLanguages.ToDictionary(
                        lang => lang,
                        _ => new LocalizedCategoryText(Name: name, Description: description)),
                };
            }

            var nameTranslations = nameTask.Result;
            var descriptionTranslations = descriptionTask?.Result.Translations;

            _logger.LogInformation(
                "Translation completed. Languages: {Count}", TargetLanguages.Length);

            var merged = TargetLanguages.ToDictionary(
                lang => lang,
                lang => new LocalizedCategoryText(
                    Name: nameTranslations.TryGetValue(lang, out var translatedName)
                        ? translatedName
                        : name,
                    Description: descriptionTranslations != null
                        && descriptionTranslations.TryGetValue(lang, out var translatedDesc)
                        ? translatedDesc
                        : description
                ));

            return new CategoryTranslationResult
            {
                SourceLanguage = fromLang ?? "unknown",
                DetectionScore = null,
                Translations = merged,
            };
        }
    }
}
