using NFC_Backend.Domain.DTOS;

namespace NFC_Backend.Services
{
    public interface ICategoryTranslationService
    {
        /// <summary>
        /// Translates a category's Name and (optional) Description into all target languages.
        /// Does not persist anything — returns the mapped result for the caller to save.
        /// </summary>
        Task<CategoryTranslationResult> TranslateCategoryAsync(
            string name,
            string? description,
            string? fromLang = null,
            CancellationToken ct = default);

        /// <summary>
        /// Translates a status name into all target languages using Azure Translator.
        /// Does not persist anything. Returns lang code -> translated name.
        /// </summary>
        Task<IReadOnlyDictionary<string, string>> TranslateStatusNameAsync(
            string statusName,
            string? fromLang = null,
            CancellationToken ct = default);
    }
}
