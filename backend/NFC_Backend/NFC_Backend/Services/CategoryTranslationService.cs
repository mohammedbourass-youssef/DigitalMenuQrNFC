using NFC_Backend.Adapters;
using NFC_Backend.Adapters.DTOS_shpes;
using NFC_Backend.Domain.DTOS;

namespace NFC_Backend.Services
{
    public sealed class CategoryTranslationService : ICategoryTranslationService
    {
        private readonly ITranslatorAdapter _translator;                 // Azure — for Description
        private readonly IGeminiLmTranslatorAdapter _nameTransliterator; // Gemini — for Name

        private static readonly string[] TargetLanguages =
            ["fr", "ar", "en", "es", "it", "ja", "zh", "ko", "de"];

        public CategoryTranslationService(
            ITranslatorAdapter translator,
            IGeminiLmTranslatorAdapter nameTransliterator)
        {
            _translator = translator;
            _nameTransliterator = nameTransliterator;
        }

        public async Task<CategoryTranslationResult> TranslateCategoryAsync(
            string name,
            string? description,
            string? fromLang = null,
            CancellationToken ct = default)
        {
            var nameTask = _nameTransliterator.TransliterateAsync(name, TargetLanguages, ct);

            Task<TranslationResult>? descriptionTask = !string.IsNullOrWhiteSpace(description)
                ? _translator.TranslateAsync(description, TargetLanguages, fromLang, ct)
                : null;

            if (descriptionTask != null)
                await Task.WhenAll(nameTask, descriptionTask);
            else
                await nameTask;

            var nameTranslations = await nameTask;
            var descriptionTranslations = descriptionTask != null ? (await descriptionTask).Translations : null;

            var merged = TargetLanguages.ToDictionary(
                lang => lang,
                lang => new LocalizedCategoryText(
                    Name: nameTranslations.TryGetValue(lang, out var translatedName) ? translatedName : name,
                    Description: descriptionTranslations != null && descriptionTranslations.TryGetValue(lang, out var translatedDescription)
                        ? translatedDescription
                        : description));

            return new CategoryTranslationResult
            {
                SourceLanguage = fromLang ?? "unknown",
                DetectionScore = null,
                Translations = merged,
            };
        }
    }
}