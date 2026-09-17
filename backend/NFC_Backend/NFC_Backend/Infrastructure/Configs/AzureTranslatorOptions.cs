namespace NFC_Backend.Infrastructure.Configs
{
    public sealed class AzureTranslatorOptions
    {
        public const string Section = "AzureTranslator";

        public string ApiKey { get; set; } = string.Empty;
        public string Region { get; set; } = string.Empty;
        public string Endpoint { get; set; } = "https://api.cognitive.microsofttranslator.com";
    }
}
