using Microsoft.EntityFrameworkCore;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Infrastructure.Data;
using NFC_Backend.Repos.Interfaces;

namespace NFC_Backend.Repos.Implementations
{
    public class PermissionRepo : IPermissionRepo
    {
        private readonly AppDbContext _dbContext;

        public PermissionRepo(AppDbContext dbContext)
        {
            _dbContext = dbContext;
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

        private sealed class PermissionFlags
        {
            public bool CanRead { get; set; }
            public bool CanAdd { get; set; }
            public bool CanEdit { get; set; }
            public bool CanDelete { get; set; }
        }
    }
}
