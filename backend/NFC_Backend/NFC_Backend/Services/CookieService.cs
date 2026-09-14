namespace NFC_Backend.Services
{
    public class CookieService : ICookieService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly bool _isProduction;
        
        private const string AccessTokenCookie = "accessToken";
        private const string RefreshTokenCookie = "refreshToken";
        private const string AccessTokenExpiryCookie = "accessTokenExpiresAt";

        public CookieService(IHttpContextAccessor httpContextAccessor, IWebHostEnvironment environment)
        {
            _httpContextAccessor = httpContextAccessor;
            _isProduction = !environment.IsDevelopment();
        }

        private HttpContext HttpContext =>
            _httpContextAccessor.HttpContext
            ?? throw new InvalidOperationException("No active HttpContext.");

        public void SetAuthCookies(string accessToken, string refreshToken, DateTime accessExpiresAt, DateTime refreshExpiresAt)
        {
            var baseOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = true,              // ← false for local dev
                SameSite = SameSiteMode.None, // ← change Strict to Lax
                Domain = null,               // ← do NOT set domain in dev
                Path = "/"                   // ← make sure path is root
            };

            HttpContext.Response.Cookies.Append(AccessTokenCookie, accessToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Path = "/",
                Expires = accessExpiresAt
            });

            HttpContext.Response.Cookies.Append(RefreshTokenCookie, refreshToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Path = "/",
                Expires = refreshExpiresAt
            });

            // Readable by JS — lets frontend know when to proactively refresh
            HttpContext.Response.Cookies.Append(AccessTokenExpiryCookie, accessExpiresAt.ToString("o"), new CookieOptions
            {
                HttpOnly = false,
                Secure = true,
                SameSite = SameSiteMode.None,
                Path = "/",
                Expires = accessExpiresAt
            });
        }

        public void ClearAuthCookies()
        {
            var clearOptions = new CookieOptions
            {
                Path = "/",
                SameSite = SameSiteMode.Lax
            };

            HttpContext.Response.Cookies.Delete(AccessTokenCookie, clearOptions);
            HttpContext.Response.Cookies.Delete(RefreshTokenCookie, clearOptions);
            HttpContext.Response.Cookies.Delete(AccessTokenExpiryCookie, clearOptions);
        }

        public string? GetAccessToken()
        {
            return HttpContext.Request.Cookies.TryGetValue(AccessTokenCookie, out var token) ? token : null;
        }

        public string? GetRefreshToken()
        {
            return HttpContext.Request.Cookies.TryGetValue(RefreshTokenCookie, out var token) ? token : null;
        }
    }
}