namespace NFC_Backend.Infrastructure.Tools
{
    public static class RateLimitingTools
    {
        public const string LoginRegisterRateLimit = "3TimesPer5Min";
        public const string RefreshRateLimit = "1PerAccessTokenLiveTimemin";
    }
}
