using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Infrastructure.Data;
using NFC_Backend.Services;

public sealed class SessionMiddleware(RequestDelegate next, IMemoryCache cache)
{
    public async Task InvokeAsync(HttpContext ctx, ITenantAccessor tenantAccessor, ITokenService token, ISessionAccessor sessionAccessor, AppDbContext db)
    {
        if (HttpMethods.IsOptions(ctx.Request.Method))   // CORS preflight
        {
            await next(ctx);
            return;
        }

        var endpoint = ctx.GetEndpoint();
        if (endpoint?.Metadata.GetMetadata<NeedSessionAttribute>() is null)
        {
            await next(ctx);
            return;
        }

        var rawId = ctx.Request.Headers["X-Session-Id"].ToString().Trim();

        if (string.IsNullOrEmpty(rawId))
        {
            ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
            await ctx.Response.WriteAsJsonAsync(new { error = "Missing or invalid X-Session-Id header" });
            return;
        }

        var tenant = tenantAccessor.Current;
        if (tenant is null)
        {
            ctx.Response.StatusCode = StatusCodes.Status500InternalServerError;
            return;
        }

        var tokenHash = token.HashSessionToken(rawId);
        var cacheKey = $"session:{tokenHash}";

        var session = await cache.GetOrCreateAsync(cacheKey, async e =>
        {
            e.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(2);

            var entity = await db.Sessions
                .Where(s => s.TokenHash == tokenHash && s.TenantId == tenant.Id)
                .FirstOrDefaultAsync();

            if (entity is null || !entity.IsValid)
                return null;

            return new SessionInfo(entity.Id, entity.TenantId ?? Guid.Empty, entity.TableId ?? Guid.Empty, entity.ExpiresAt);
        });

        if (session is null)
        {
            ctx.Response.StatusCode = StatusCodes.Status404NotFound;
            await ctx.Response.WriteAsJsonAsync(new { error = "Session not found or inactive" });
            return;
        }

        if (session.ExpiresAt <= DateTime.UtcNow)
        {
            cache.Remove(cacheKey);
            ctx.Response.StatusCode = StatusCodes.Status410Gone;
            await ctx.Response.WriteAsJsonAsync(new { error = "Session expired" });
            return;
        }

        sessionAccessor.Current = session;
        await next(ctx);
    }
}