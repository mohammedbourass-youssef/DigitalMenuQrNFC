namespace NFC_Backend.Adapters
{
    public interface IGeminiLmTranslatorAdapter
    {
        Task<Dictionary<string, string>> TransliterateAsync(
            string name,
            IEnumerable<string> targetLangs,
            CancellationToken ct = default);
    }
}
