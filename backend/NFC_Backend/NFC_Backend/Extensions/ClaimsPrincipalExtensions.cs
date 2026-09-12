using System.Security.Claims;

namespace NFC_Backend.Extensions
{
    public static class ClaimsPrincipalExtensions
    {
        public static Guid? GetTenantId(this ClaimsPrincipal user)
        {
            var value = user.FindFirst("TenantId")?.Value;
            return Guid.TryParse(value, out var tenantId) ? tenantId : null;
        }

        public static Guid? GetUserId(this ClaimsPrincipal user)
        {
            var value = user.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
            return Guid.TryParse(value, out var userId) ? userId : null;
        }
    }
}