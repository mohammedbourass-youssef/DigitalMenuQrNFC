using NFC_Backend.Adapters.DTOS_shpes;

namespace NFC_Backend.Adapters
{
    public interface ITranslatorAdapter
    {
        Task<TranslationResult> TranslateAsync(string text, IEnumerable<string> targetLangs, string? fromLang = null, CancellationToken ct = default);
        Task<List<TranslationResult>> TranslateBatchAsync(IEnumerable<string> texts, IEnumerable<string> targetLangs, string? fromLang = null, CancellationToken ct = default);
    }
}
