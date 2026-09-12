namespace NFC_Backend.Services
{
    public interface ICookieService
    {
        void SetAuthCookies(string accessToken, string refreshToken, DateTime accessExpiresAt, DateTime refreshExpiresAt);
        string? GetAccessToken();
        string? GetRefreshToken();
        void ClearAuthCookies();
    }
}