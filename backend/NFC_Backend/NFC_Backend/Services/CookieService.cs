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
                Secure = _isProduction,
                SameSite = SameSiteMode.Strict
            };

            HttpContext.Response.Cookies.Append(AccessTokenCookie, accessToken, new CookieOptions
            {
                HttpOnly = baseOptions.HttpOnly,
                Secure = baseOptions.Secure,
                SameSite = baseOptions.SameSite,
                Expires = accessExpiresAt
            });

            HttpContext.Response.Cookies.Append(RefreshTokenCookie, refreshToken, new CookieOptions
            {
                HttpOnly = baseOptions.HttpOnly,
                Secure = baseOptions.Secure,
                SameSite = baseOptions.SameSite,
                Expires = refreshExpiresAt
            });

            // readable by JS — lets frontend know when to proactively refresh
            HttpContext.Response.Cookies.Append(AccessTokenExpiryCookie, accessExpiresAt.ToString("o"), new CookieOptions
            {
                HttpOnly = false,
                Secure = baseOptions.Secure,
                SameSite = baseOptions.SameSite,
                Expires = accessExpiresAt
            });
        }

        public string? GetAccessToken()
        {
            return HttpContext.Request.Cookies.TryGetValue(AccessTokenCookie, out var token) ? token : null;
        }

        public string? GetRefreshToken()
        {
            return HttpContext.Request.Cookies.TryGetValue(RefreshTokenCookie, out var token) ? token : null;
        }

        public void ClearAuthCookies()
        {
            HttpContext.Response.Cookies.Delete(AccessTokenCookie);
            HttpContext.Response.Cookies.Delete(RefreshTokenCookie);
            HttpContext.Response.Cookies.Delete(AccessTokenExpiryCookie);
        }
    }
}