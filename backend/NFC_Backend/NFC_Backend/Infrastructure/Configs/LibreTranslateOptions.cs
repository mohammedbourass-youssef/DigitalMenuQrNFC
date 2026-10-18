namespace NFC_Backend.Infrastructure.Configs
{
    public sealed class LibreTranslateOptions
    {
        public const string Section = "LibreTranslate";

        public string Endpoint { get; set; } = "http://libretranslate:5000";
        public string? ApiKey { get; set; }
    }
}
