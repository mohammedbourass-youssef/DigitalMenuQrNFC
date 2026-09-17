namespace NFC_Backend.Infrastructure.Configs
{
    public sealed class GeminiOptions
    {
    
            public required string ApiKey { get; init; }
            public string Endpoint { get; init; } = "https://generativelanguage.googleapis.com/v1beta";
            public string Model { get; init; } = "gemini-flash-latest";
        
    }
}
