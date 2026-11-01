using System.Data;
using Microsoft.EntityFrameworkCore;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Infrastructure.Data;
using NFC_Backend.Repos.Interfaces;
using Npgsql;

namespace NFC_Backend.Repos.Implementations
{
    public class RoleRepo : IRoleRepo
    {
        private const int NameMaxLength = 100;
        private const int DescriptionMaxLength = 500;

        private readonly AppDbContext _dbContext;

        public RoleRepo(AppDbContext appDbContext)
        {
            _dbContext = appDbContext;
        }

        private sealed record PermissionInput(
            Guid FeatureId,
            bool CanRead,
            bool CanAdd,
            bool CanEdit,
            bool CanDelete);

        private sealed class PlanInfo
        {
            public int PlanId { get; init; }
            public int MaxRoles { get; init; }
            public bool IsActive { get; init; }
        }

        public async Task<List<TableRoleDTO>> GetListOfRolesAsync(
            Guid tenantId,
            CancellationToken ct = default)
        {
            return await _dbContext.Roles
                .AsNoTracking()
                .Where(role => role.TenantId == tenantId ||
                               (role.IsSystem && role.TenantId == null))
                .OrderBy(role => role.Name)
                .Select(role => new TableRoleDTO
                {
                    Id = role.Id,
                    Name = role.Name,
                    Description = role.Description,
                    IsSystem = role.IsSystem,
                    CreatedAtUTC = role.CreatedAt,
                    TotalUsersInThisRole = _dbContext.UserRoles
                        .Count(ur => ur.RoleId == role.Id && ur.User.TenantId == tenantId),
                    RolePermissions = _dbContext.RolePermissions
                        .Where(rp => rp.RoleId == role.Id)
                        .Select(rp => new TableRolePermissions
                        {
                            FeatureId = rp.FeatureId,
                            RoleCanAdd = rp.CanAdd,
                            RoleCanEdit = rp.CanEdit,
                            RoleCanRead = rp.CanRead,
                            RoleCanRemove = rp.CanDelete
                        })
                        .ToList()
                })
                .ToListAsync(ct);
        }

        public async Task<RoleMutationResult> CreateNewRoleAsync(
            CreateNewRoleRequest request,
            Guid tenantId,
            CancellationToken ct = default)
        {
            var name = request.Name?.Trim();
            var nameError = ValidateName(name);
            if (nameError is not null)
                return Failure(RoleErrorCode.Validation, nameError, "Name");

            var description = NormalizeDescription(request.Descriptions);
            var descriptionError = ValidateDescription(description);
            if (descriptionError is not null)
                return Failure(RoleErrorCode.Validation, descriptionError, "Descriptions");

            if (request.TableRole is null)
                return Failure(
                    RoleErrorCode.InvalidPermissions,
                    "Invalid permissions list.",
                    "TableRole");

            var permissions = request.TableRole
                .Select(permission =>
                {
                    var canRead = permission.RoleCanRead ||
                                  permission.RoleCanAdd ||
                                  permission.RoleCanEdit ||
                                  permission.RoleCanRemove;

                    return new PermissionInput(
                        permission.FeatureId,
                        canRead,
                        permission.RoleCanAdd,
                        permission.RoleCanEdit,
                        permission.RoleCanRemove);
                })
                .Where(HasAnyPermission)
                .ToList();

            var permissionsError = ValidatePermissions(permissions, "TableRole");
            if (permissionsError is not null)
                return permissionsError;

            var strategy = _dbContext.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _dbContext.Database
                    .BeginTransactionAsync(IsolationLevel.Serializable, ct);

                var plan = await GetPlanInfoAsync(tenantId, ct);
                if (plan is null)
                    return Failure(
                        RoleErrorCode.TenantNotFound,
                        "Restaurant not found.");

                if (!plan.IsActive)
                    return Failure(RoleErrorCode.PlanNotFound, "Plan not found.");

                var customRolesCount = await _dbContext.Roles
                    .CountAsync(role => role.TenantId == tenantId && !role.IsSystem, ct);

                if (plan.MaxRoles != Plan.Unlimited && customRolesCount >= plan.MaxRoles)
                    return Failure(
                        RoleErrorCode.RoleLimitReached,
                        "Roles limit reached for your plan.");

                if (await NameExistsAsync(tenantId, name!, null, ct))
                    return Failure(
                        RoleErrorCode.DuplicateName,
                        "A role with this name already exists.",
                        "Name");

                var featuresError = await ValidateFeaturesAsync(
                    plan.PlanId,
                    permissions,
                    "TableRole",
                    ct);
                if (featuresError is not null)
                    return featuresError;

                var role = new Role
                {
                    Id = Guid.NewGuid(),
                    CreatedAt = DateTime.UtcNow,
                    Description = description!,
                    IsSystem = false,
                    Name = name!,
                    TenantId = tenantId,
                    Permissions = permissions
                        .Select(permission => new RolePermission
                        {
                            FeatureId = permission.FeatureId,
                            CanRead = permission.CanRead,
                            CanAdd = permission.CanAdd,
                            CanEdit = permission.CanEdit,
                            CanDelete = permission.CanDelete
                        })
                        .ToList()
                };

                _dbContext.Roles.Add(role);

                try
                {
                    await _dbContext.SaveChangesAsync(ct);
                }
                catch (DbUpdateException ex) when (IsUniqueViolation(ex))
                {
                    return Failure(
                        RoleErrorCode.DuplicateName,
                        "A role with this name already exists.",
                        "Name");
                }

                await transaction.CommitAsync(ct);

                return Success(role.Id);
            });
        }

        public async Task<RoleMutationResult> UpdateRoleAsync(
            Guid tenantId,
            UpdateRoleRequest request,
            CancellationToken ct)
        {
            if (request.Id == Guid.Empty)
                return Failure(RoleErrorCode.Validation, "Role id is required.", "Id");

            var name = request.Name?.Trim();
            var nameError = ValidateName(name);
            if (nameError is not null)
                return Failure(RoleErrorCode.Validation, nameError, "Name");

            var description = NormalizeDescription(request.Description);
            var descriptionError = ValidateDescription(description);
            if (descriptionError is not null)
                return Failure(RoleErrorCode.Validation, descriptionError, "Description");

            if (request.Permissions is null)
                return Failure(
                    RoleErrorCode.InvalidPermissions,
                    "Invalid permissions list.",
                    "Permissions");

            var permissions = request.Permissions
                .Select(permission =>
                {
                    var canRead = permission.CanRead ||
                                  permission.CanAdd ||
                                  permission.CanEdit ||
                                  permission.CanDelete;

                    return new PermissionInput(
                        permission.FeatureId,
                        canRead,
                        permission.CanAdd,
                        permission.CanEdit,
                        permission.CanDelete);
                })
                .Where(HasAnyPermission)
                .ToList();

            var permissionsError = ValidatePermissions(permissions, "Permissions");
            if (permissionsError is not null)
                return permissionsError;

            await using var transaction = await _dbContext.Database.BeginTransactionAsync(ct);

            var plan = await GetPlanInfoAsync(tenantId, ct);
            if (plan is null)
                return Failure(RoleErrorCode.TenantNotFound, "Restaurant not found.");

            if (!plan.IsActive)
                return Failure(RoleErrorCode.PlanNotFound, "Plan not found.");

            var role = await _dbContext.Roles
                .FirstOrDefaultAsync(
                    item => item.Id == request.Id && item.TenantId == tenantId,
                    ct);

            if (role is null)
                return Failure(RoleErrorCode.NotFound, "Role not found.");

            if (role.IsSystem)
                return Failure(
                    RoleErrorCode.SystemRole,
                    "System roles cannot be modified.");

            if (await NameExistsAsync(tenantId, name!, role.Id, ct))
                return Failure(
                    RoleErrorCode.DuplicateName,
                    "A role with this name already exists.",
                    "Name");

            var featuresError = await ValidateFeaturesAsync(
                plan.PlanId,
                permissions,
                "Permissions",
                ct);
            if (featuresError is not null)
                return featuresError;

            role.Name = name!;
            role.Description = description!;

            await _dbContext.RolePermissions
                .Where(permission => permission.RoleId == role.Id)
                .ExecuteDeleteAsync(ct);

            if (permissions.Count > 0)
            {
                _dbContext.RolePermissions.AddRange(
                    permissions.Select(permission => new RolePermission
                    {
                        RoleId = role.Id,
                        FeatureId = permission.FeatureId,
                        CanRead = permission.CanRead,
                        CanAdd = permission.CanAdd,
                        CanEdit = permission.CanEdit,
                        CanDelete = permission.CanDelete
                    }));
            }

            try
            {
                await _dbContext.SaveChangesAsync(ct);
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex))
            {
                return Failure(
                    RoleErrorCode.DuplicateName,
                    "A role with this name already exists.",
                    "Name");
            }

            await transaction.CommitAsync(ct);

            return Success(role.Id);
        }

        private async Task<PlanInfo?> GetPlanInfoAsync(Guid tenantId, CancellationToken ct)
        {
            return await _dbContext.Tenants
                .AsNoTracking()
                .Where(tenant => tenant.Id == tenantId)
                .Select(tenant => new PlanInfo
                {
                    PlanId = tenant.PlanId,
                    MaxRoles = tenant.Plan.MaxRoles,
                    IsActive = tenant.Plan.IsActive
                })
                .FirstOrDefaultAsync(ct);
        }

        private async Task<bool> NameExistsAsync(
            Guid tenantId,
            string name,
            Guid? excludedRoleId,
            CancellationToken ct)
        {
            var normalizedName = name.ToLowerInvariant();

            var query = _dbContext.Roles
                .Where(role => role.TenantId == tenantId &&
                               role.Name.ToLower() == normalizedName);

            if (excludedRoleId.HasValue)
                query = query.Where(role => role.Id != excludedRoleId.Value);

            return await query.AnyAsync(ct);
        }

        private async Task<RoleMutationResult?> ValidateFeaturesAsync(
            int planId,
            List<PermissionInput> permissions,
            string field,
            CancellationToken ct)
        {
            var featureIds = permissions
                .Select(permission => permission.FeatureId)
                .Distinct()
                .ToList();

            if (featureIds.Count == 0)
                return null;

            var allowedFeatureIds = await _dbContext.PlanFeatures
                .AsNoTracking()
                .Where(planFeature => planFeature.PlanId == planId &&
                                      featureIds.Contains(planFeature.FeatureId))
                .Select(planFeature => planFeature.FeatureId)
                .ToListAsync(ct);

            if (allowedFeatureIds.Count == featureIds.Count)
                return null;

            var invalidFeatureId = featureIds
                .Except(allowedFeatureIds)
                .First();

            return Failure(
                RoleErrorCode.FeatureNotAvailable,
                $"Feature '{invalidFeatureId}' is not available for your plan.",
                field);
        }

        private static RoleMutationResult? ValidatePermissions(
            List<PermissionInput> permissions,
            string field)
        {
            if (permissions.Any(permission => permission.FeatureId == Guid.Empty))
            {
                return Failure(
                    RoleErrorCode.Validation,
                    "FeatureId is required for every permission.",
                    field);
            }

            if (permissions
                .GroupBy(permission => permission.FeatureId)
                .Any(group => group.Count() > 1))
            {
                return Failure(
                    RoleErrorCode.InvalidPermissions,
                    "Invalid permissions list.",
                    field);
            }

            return null;
        }

        private static string? ValidateName(string? name)
        {
            if (string.IsNullOrWhiteSpace(name))
                return "Role name is required.";

            return name.Length > NameMaxLength
                ? $"Role name must be {NameMaxLength} characters or fewer."
                : null;
        }

        private static string? ValidateDescription(string? description)
        {
            return description is not null && description.Length > DescriptionMaxLength
                ? $"Description must be {DescriptionMaxLength} characters or fewer."
                : null;
        }

        private static string? NormalizeDescription(string? description)
        {
            var trimmed = description?.Trim();
            return string.IsNullOrEmpty(trimmed) ? null : trimmed;
        }

        private static bool HasAnyPermission(PermissionInput permission)
        {
            return permission.CanRead ||
                   permission.CanAdd ||
                   permission.CanEdit ||
                   permission.CanDelete;
        }

        private static bool IsUniqueViolation(DbUpdateException ex)
        {
            return ex.InnerException is PostgresException
            {
                SqlState: PostgresErrorCodes.UniqueViolation
            };
        }

        private static RoleMutationResult Success(Guid roleId)
        {
            return new RoleMutationResult(true, roleId);
        }

        private static RoleMutationResult Failure(
            RoleErrorCode code,
            string message,
            string? field = null)
        {
            return new RoleMutationResult(false, null, code, message, field);
        }
    }
}
