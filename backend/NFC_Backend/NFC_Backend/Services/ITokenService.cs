using NFC_Backend.Domain.Entities;

namespace NFC_Backend.Services
{
    public interface ITokenService
    {
        string GenerateAccessToken(User user);
        string GenerateRefreshToken();
        string HashPassword(string plainPassword);
        bool VerifyPassword(string plainPassword, string hashedPassword);
        string GenerateSessionToken();
        string HashSessionToken(string token);
        bool VerifySessionToken(string plainToken, string hashedToken);
        string HashRefreshToken(string token);
        bool VerifyRefreshToken(string plainToken, string hashedToken);
    }
}