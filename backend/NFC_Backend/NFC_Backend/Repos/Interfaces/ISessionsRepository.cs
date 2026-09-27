using NFC_Backend.Domain.Entities;

namespace NFC_Backend.Repos.Interfaces
{
    public interface ISessionsRepository
    {
        // Creates a new session row and persists it. Returns the tracked entity
        // (CategoryId/CreatedAt/ExpiresAt populated).
        Task<Session> CreateAsync(
            string tokenHash,
            Guid? tenantId,
            TimeSpan lifetime,
            string? ipAddress = null,
            string? userAgent = null,
            CancellationToken cancellationToken = default);

        // Looks up a session by its hashed token. Returns null if not found —
        // does NOT filter by expiry/revocation, so callers can distinguish
        // "not found" from "found but invalid" (e.g. to log/react differently).
        Task<Session?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default);

        // Same as above but only returns the session if it's still valid
        // (not expired, not revoked). This is what most API middleware should call.
        Task<Session?> GetValidByTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default);

        Task<Session?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

        // Bumps LastSeenAt — call this on each authenticated request if you want
        // activity tracking. Keep this cheap; consider throttling calls to it
        // (e.g. only update if last update was > N minutes ago) under high traffic.
        Task TouchAsync(Guid sessionId, CancellationToken cancellationToken = default);

        // Soft-revokes a session (sets RevokedAt) rather than deleting it —
        // preserves an audit trail. Use this for "log out" / "revoke this device".
        Task RevokeAsync(Guid sessionId, CancellationToken cancellationToken = default);

        // Revokes every session for a tenant — useful for "log out everywhere"
        // or a security incident response.
        Task RevokeAllForTenantAsync(Guid tenantId, CancellationToken cancellationToken = default);

        // Hard-deletes expired (and optionally revoked) rows. Call this from a
        // scheduled job/background worker, not on the request path.
        Task<int> PurgeExpiredAsync(bool includeRevoked = true, CancellationToken cancellationToken = default);

        Task SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
