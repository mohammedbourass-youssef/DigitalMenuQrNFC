namespace NFC_Backend.MidlleWares
{
    public interface ILanguageAccessor
    {
        string Current { get; set; }
    }

    public sealed class LanguageAccessor : ILanguageAccessor
    {
        public string Current { get; set; } = "en";
    }
}
