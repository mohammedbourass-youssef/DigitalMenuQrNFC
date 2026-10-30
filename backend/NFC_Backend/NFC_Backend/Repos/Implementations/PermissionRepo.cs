using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Infrastructure.Data;
using NFC_Backend.Infrastructure.Tools;
using NFC_Backend.MidlleWares;
using NFC_Backend.Repos.Interfaces;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks.Dataflow;

namespace NFC_Backend.Repos.Implementations
{
    public class PermissionRepo : IPermissionRepo
    {
        private readonly AppDbContext _dbContext;

        private static readonly DistributedCacheEntryOptions CacheOptions = new()
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
        };

        private static readonly DistributedCacheEntryOptions EmptyCacheOptions = new()
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30)
        };

        private readonly IDistributedCache _cache;
        private readonly ILogger<PermissionRepo> _logger;

        public PermissionRepo(AppDbContext dbContext, IDistributedCache cache, ILogger<PermissionRepo> logger)
        {
            _dbContext = dbContext;
            _cache = cache;
            _logger = logger;
        }

        public async Task<MyPermissionsDto?> GetMyPermissionsAsync(
            Guid userId,
            Guid tenantId,
            CancellationToken ct = default)
        {
            var user = await _dbContext.Users
                .AsNoTracking()
                .Where(u => u.Id == userId && u.TenantId == tenantId && u.IsActive)
                .Select(u => new
                {
                    u.Role,
                    u.Tenant!.PlanId,
                    PlanCode = u.Tenant!.Plan.Code,
                    PlanName = u.Tenant!.Plan.Name,
                    PlanIsFree = u.Tenant!.Plan.IsFree,
                    TenantIsActive = u.Tenant!.IsActive
                })
                .FirstOrDefaultAsync(ct);

            if (user is null || !user.TenantIsActive)
            {
                return null;
            }

            var isPrivileged = user.Role is UserRole.TenantOwner or UserRole.SuperAdmin;
            var roles = new List<string>();
            var permissionsByFeature = new Dictionary<Guid, PermissionFlags>();

            if (isPrivileged)
            {
                roles.Add(user.Role.ToString());
            }
            else
            {
                var assignedRoles = await _dbContext.Roles
                    .AsNoTracking()
                    .Where(r => r.TenantId == tenantId && r.UserRoles.Any(ur => ur.UserId == userId))
                    .Select(r => r.Name)
                    .ToListAsync(ct);

                roles.AddRange(assignedRoles.Distinct(StringComparer.OrdinalIgnoreCase));

                if (roles.Count == 0)
                {
                    roles.Add(user.Role.ToString());
                }

                var rolePermissions = await _dbContext.RolePermissions
                    .AsNoTracking()
                    .Where(p => p.Role.TenantId == tenantId
                        && p.Role.UserRoles.Any(ur => ur.UserId == userId))
                    .Select(p => new
                    {
                        p.FeatureId,
                        p.CanRead,
                        p.CanAdd,
                        p.CanEdit,
                        p.CanDelete
                    })
                    .ToListAsync(ct);

                foreach (var permission in rolePermissions)
                {
                    if (!permissionsByFeature.TryGetValue(permission.FeatureId, out var current))
                    {
                        current = new PermissionFlags();
                        permissionsByFeature[permission.FeatureId] = current;
                    }

                    current.CanRead |= permission.CanRead;
                    current.CanAdd |= permission.CanAdd;
                    current.CanEdit |= permission.CanEdit;
                    current.CanDelete |= permission.CanDelete;
                }
            }

            var features = await _dbContext.Features
                .AsNoTracking()
                .OrderBy(f => f.Name)
                .Select(f => new
                {
                    f.Id,
                    f.Code,
                    f.Name,
                    f.Status,
                    IsInPlan = f.PlanFeatures.Any(pf => pf.PlanId == user.PlanId)
                })
                .ToListAsync(ct);

            var featurePermissions = features
                .Select(feature =>
                {
                    var canRead = false;
                    var canAdd = false;
                    var canEdit = false;
                    var canDelete = false;

                    if (feature.IsInPlan)
                    {
                        if (isPrivileged)
                        {
                            canRead = true;
                            canAdd = true;
                            canEdit = true;
                            canDelete = true;
                        }
                        else if (permissionsByFeature.TryGetValue(feature.Id, out var permission))
                        {
                            canRead = permission.CanRead;
                            canAdd = permission.CanAdd;
                            canEdit = permission.CanEdit;
                            canDelete = permission.CanDelete;
                        }
                    }

                    return new FeaturePermissionDto(
                        feature.Id,
                        feature.Code,
                        feature.Name,
                        feature.Status.ToString(),
                        feature.IsInPlan,
                        canRead,
                        canAdd,
                        canEdit,
                        canDelete);
                })
                .ToList();

            return new MyPermissionsDto(
                new PlanAccessDto(
                    user.PlanId,
                    user.PlanCode,
                    user.PlanName,
                    user.PlanIsFree),
                roles,
                featurePermissions);
        }

        private sealed record PermissionCacheItem(string Feature, EnPermissionActions Action);

        public async Task<HashSet<(string Feature, EnPermissionActions Action)>> GetPermissionsAsync(
            Guid userId, CancellationToken ct = default)
        {
            var key = RedisKeysHelpers.UserPermissioKey(userId);

            try
            {
                var cached = await _cache.GetStringAsync(key, ct);
                if (cached is not null)
                {
                    var items = JsonSerializer.Deserialize<List<PermissionCacheItem>>(cached) ?? new();
                    return items.Select(i => (i.Feature, i.Action)).ToHashSet();
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "Permission cache read failed for user {UserId}", userId);
            }

            var permissions = await LoadPermissionsFromDbAsync(userId, ct);

            try
            {
                var json = JsonSerializer.Serialize(
                    permissions.Select(p => new PermissionCacheItem(p.Feature, p.Action)));

                await _cache.SetStringAsync(
                    key, json,
                    permissions.Count == 0 ? EmptyCacheOptions : CacheOptions,
                    ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "Permission cache write failed for user {UserId}", userId);
            }

            return permissions;
        }

        private async Task<HashSet<(string Feature, EnPermissionActions Action)>> LoadPermissionsFromDbAsync(
            Guid userId, CancellationToken ct)
        {
            var rows = await (
                from user in _dbContext.Users
                where user.Id == userId && user.IsActive
                join ur in _dbContext.UserRoles on user.Id equals ur.UserId
                join rp in _dbContext.RolePermissions on ur.RoleId equals rp.RoleId
                join f in _dbContext.Features on rp.FeatureId equals f.Id
                select new { f.Code, rp.CanRead, rp.CanAdd, rp.CanEdit, rp.CanDelete })
                .AsNoTracking()
                .ToListAsync(ct);

            var result = new HashSet<(string Feature, EnPermissionActions Action)>();

            foreach (var row in rows)
            {
                if (row.CanRead) result.Add((row.Code, EnPermissionActions.READ));
                if (row.CanAdd) result.Add((row.Code, EnPermissionActions.WRITE));
                if (row.CanEdit) result.Add((row.Code, EnPermissionActions.UPDATE));
                if (row.CanDelete) result.Add((row.Code, EnPermissionActions.DELETE));
            }

            return result;
        }

        private sealed record UiPermissionsCache(int PlanId, List<UserPermissionsDto> Items);

        public async Task<List<UserPermissionsDto>> UserPermissionsForShowingAsync(
            Guid userId, int tenantPlanId, CancellationToken ct = default)
        {
            var key = RedisKeysHelpers.UserPermissionsUiKey(userId);

            // 1. Try the cache (Redis down => fall back to the DB)
            try
            {
                var cached = await _cache.GetStringAsync(key, ct);
                if (cached is not null)
                {
                    var entry = JsonSerializer.Deserialize<UiPermissionsCache>(cached);

                    // Only valid if it was built for the same plan
                    if (entry is not null && entry.PlanId == tenantPlanId)
                        return entry.Items;
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "UI permission cache read failed for user {UserId}", userId);
            }

            // 2. Cache miss (or plan changed)
            var items = await LoadUserPermissionsForShowingAsync(userId, tenantPlanId, ct);

            // 3. Store it (short TTL when empty)
            try
            {
                var json = JsonSerializer.Serialize(new UiPermissionsCache(tenantPlanId, items));

                await _cache.SetStringAsync(
                    key, json,
                    items.Count == 0 ? EmptyCacheOptions : CacheOptions,
                    ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "UI permission cache write failed for user {UserId}", userId);
            }

            return items;
        }

        private async Task<List<UserPermissionsDto>> LoadUserPermissionsForShowingAsync(
            Guid userId, int tenantPlanId, CancellationToken ct)
        {
            return await (
                from user in _dbContext.Users
                where user.Id == userId && user.IsActive
                join ur in _dbContext.UserRoles on user.Id equals ur.UserId
                join rp in _dbContext.RolePermissions on ur.RoleId equals rp.RoleId
                join f in _dbContext.Features on rp.FeatureId equals f.Id
                group rp by new { f.Id, f.Code, f.Status } into g
                select new UserPermissionsDto
                {
                    FeatureId = g.Key.Id,
                    FeatureCode = g.Key.Code,
                    FeatureStatus = g.Key.Status,
                    inPlan = _dbContext.PlanFeatures
                        .Any(pf => pf.PlanId == tenantPlanId && pf.FeatureId == g.Key.Id),
                    canRead = g.Any(x => x.CanRead),
                    canWrite = g.Any(x => x.CanAdd),
                    canEdit = g.Any(x => x.CanEdit),
                    canDelete = g.Any(x => x.CanDelete)
                })
                .AsNoTracking()
                .ToListAsync(ct);
        }


        public async Task InvalidateUserAsync(Guid userId, CancellationToken ct = default)
        {
            await _cache.RemoveAsync(RedisKeysHelpers.UserPermissioKey(userId), ct);
            await _cache.RemoveAsync(RedisKeysHelpers.UserPermissionsUiKey(userId), ct);
        }

        public async Task InvalidateRoleAsync(Guid roleId, CancellationToken ct = default)
        {
            var userIds = await _dbContext.UserRoles
                .AsNoTracking()
                .Where(ur => ur.RoleId == roleId)
                .Select(ur => ur.UserId)
                .ToListAsync(ct);

            foreach (var id in userIds)
                await InvalidateUserAsync(id, ct);
        }




    }
}
