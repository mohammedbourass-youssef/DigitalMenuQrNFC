using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using NFC_Backend.Domain.Entities;

namespace NFC_Backend.Services
{
    public class TokenService : ITokenService
    {
        private readonly IConfiguration _configuration;

        public TokenService(IConfiguration configuration)
        {
            _configuration = configuration;
        }
        public string GenerateAccessToken(User user)
        {
            var jwtSecret = _configuration["Jwt:Secret"]
                ?? throw new InvalidOperationException("Jwt:Secret not configured.");
            var issuer = _configuration["Jwt:Issuer"];
            var audience = _configuration["Jwt:Audience"];
            var expiryMinutes = _configuration.GetValue<int>("Jwt:AccessTokenExpiryMinutes", 15);

            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new(JwtRegisteredClaimNames.Email, user.Email),
                new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new(ClaimTypes.Role, user.Role.ToString()),
            };

            // TenantId claim — only added when the user belongs to a tenant
            // (nullable for SuperAdmin, per your User entity design)
            if (user.TenantId.HasValue)
            {
                claims.Add(new Claim("TenantId", user.TenantId.Value.ToString()));
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
        public string GenerateRefreshToken()
        {
            var randomBytes = new byte[64];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomBytes);
            return Convert.ToBase64String(randomBytes);
        }
        public string GenerateSessionToken()
        {
            var randomBytes = new byte[32];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomBytes);
            // Base64Url avoids '+' '/' '=' so it's safe to drop straight into
            // headers, cookies or query strings with no extra encoding.
            return Base64UrlEncoder.Encode(randomBytes);
        }
        public string HashSessionToken(string token)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
            return Convert.ToBase64String(bytes);
        }
        public bool VerifySessionToken(string plainToken, string hashedToken)
        {
            var computedHash = HashSessionToken(plainToken);

            var computedBytes = Encoding.UTF8.GetBytes(computedHash);
            var storedBytes = Encoding.UTF8.GetBytes(hashedToken);

            if (computedBytes.Length != storedBytes.Length)
                return false;

            return CryptographicOperations.FixedTimeEquals(computedBytes, storedBytes);
        }
        public string HashPassword(string plainPassword)
        {
            return BCrypt.Net.BCrypt.HashPassword(plainPassword, workFactor: 12);
        }
        public bool VerifyPassword(string plainPassword, string hashedPassword)
        {
            return BCrypt.Net.BCrypt.Verify(plainPassword, hashedPassword);
        }
        public string HashRefreshToken(string token)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
            return Convert.ToBase64String(bytes);
        }
        public bool VerifyRefreshToken(string plainToken, string hashedToken)
        {
            var computedHash = HashRefreshToken(plainToken);

            var computedBytes = Encoding.UTF8.GetBytes(computedHash);
            var storedBytes = Encoding.UTF8.GetBytes(hashedToken);

            // Constant-time comparison — avoids leaking info via response-time differences
            return CryptographicOperations.FixedTimeEquals(computedBytes, storedBytes);
        }
    }
}