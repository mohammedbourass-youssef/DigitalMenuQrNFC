using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using NFC_Backend.Infrastructure.Data;
using NFC_Backend.Services;
using System.Text.RegularExpressions;

public sealed partial class TenantMiddleware(RequestDelegate next, IMemoryCache cache)
{
    [GeneratedRegex("^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")]
    private static partial Regex SlugRegex();

    public async Task InvokeAsync(HttpContext ctx, ITenantAccessor accessor, AppDbContext db)
    {
        if (HttpMethods.IsOptions(ctx.Request.Method))   // CORS preflight
        {
            await next(ctx);
            return;
        }

        var slug = ctx.Request.Headers["X-Tenant"].ToString().Trim().ToLowerInvariant();

        if (string.IsNullOrEmpty(slug) || !SlugRegex().IsMatch(slug))
        {
            ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
            await ctx.Response.WriteAsJsonAsync(new { error = "Missing or invalid X-Tenant header" });
            return;
        }

        var tenant = await cache.GetOrCreateAsync($"tenant:{slug}", async e =>
        {
            e.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
            return await db.Tenants
                .Where(t => t.Subdomain == slug && t.IsActive)
                .Select(t => new TenantInfo(t.Id, t.Subdomain, t.RestaurantName))
                .FirstOrDefaultAsync();
        });

        if (tenant is null)
        {
            ctx.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        // Authenticated callers: the token's tenant must match the header
        if (ctx.User.Identity?.IsAuthenticated == true)
        {
            var claim = ctx.User.FindFirst("tenant_id")?.Value;
            if (claim != tenant.Id.ToString())
            {
                ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
                return;
            }
        }

        accessor.Current = tenant;
        await next(ctx);
    }
}