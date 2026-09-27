using Microsoft.EntityFrameworkCore;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Infrastructure.Data;
using NFC_Backend.Repos.Interfaces;

namespace NFC_Backend.Repos.Implementations
{
    public class SessionsRepository : ISessionsRepository
    {
        private readonly AppDbContext _context;

        public SessionsRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Session> CreateAsync(
            string tokenHash,
            Guid? tenantId,
            TimeSpan lifetime,
            string? ipAddress = null,
            string? userAgent = null,
            CancellationToken cancellationToken = default)
        {
            var now = DateTime.UtcNow;

            var session = new Session
            {
                Id = Guid.NewGuid(),
                TokenHash = tokenHash,
                TenantId = tenantId,
                CreatedAt = now,
                ExpiresAt = now.Add(lifetime),
                IpAddress = ipAddress,
                UserAgent = userAgent
            };

            await _context.Sessions.AddAsync(session, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            return session;
        }

        public Task<Session?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default)
        {
            return _context.Sessions
                .FirstOrDefaultAsync(s => s.TokenHash == tokenHash, cancellationToken);
        }

        public Task<Session?> GetValidByTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default)
        {
            var now = DateTime.UtcNow;

            return _context.Sessions
                .FirstOrDefaultAsync(s =>
                    s.TokenHash == tokenHash &&
                    s.RevokedAt == null &&
                    s.ExpiresAt > now,
                    cancellationToken);
        }

        public Task<Session?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return _context.Sessions
                .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        }

        public async Task TouchAsync(Guid sessionId, CancellationToken cancellationToken = default)
        {
            // ExecuteUpdateAsync avoids a round-trip load just to bump a timestamp.
            await _context.Sessions
                .Where(s => s.Id == sessionId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(s => s.LastSeenAt, DateTime.UtcNow),
                    cancellationToken);
        }

        public async Task RevokeAsync(Guid sessionId, CancellationToken cancellationToken = default)
        {
            await _context.Sessions
                .Where(s => s.Id == sessionId && s.RevokedAt == null)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(s => s.RevokedAt, DateTime.UtcNow),
                    cancellationToken);
        }

        public async Task RevokeAllForTenantAsync(Guid tenantId, CancellationToken cancellationToken = default)
        {
            await _context.Sessions
                .Where(s => s.TenantId == tenantId && s.RevokedAt == null)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(s => s.RevokedAt, DateTime.UtcNow),
                    cancellationToken);
        }

        public async Task<int> PurgeExpiredAsync(bool includeRevoked = true, CancellationToken cancellationToken = default)
        {
            var now = DateTime.UtcNow;

            var query = _context.Sessions.Where(s => s.ExpiresAt <= now);

            if (!includeRevoked)
            {
                query = query.Where(s => s.RevokedAt == null);
            }

            return await query.ExecuteDeleteAsync(cancellationToken);
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return _context.SaveChangesAsync(cancellationToken);
        }
    }
}
