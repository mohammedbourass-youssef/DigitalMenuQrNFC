using System.ComponentModel.DataAnnotations;

namespace NFC_Backend.Domain.DTOS
{
    public class TableRolePermissions
    {
        public Guid FeatureId { get; set; }
        public bool RoleCanAdd { get; set; }
        public bool RoleCanRemove { get; set; }
        public bool RoleCanEdit { get; set; }
        public bool RoleCanRead { get; set; }
    }

    public enum RoleErrorCode
    {
        None = 0,
        Validation,
        InvalidPermissions,
        FeatureNotAvailable,
        DuplicateName,
        RoleLimitReached,
        TenantNotFound,
        PlanNotFound,
        NotFound,
        SystemRole
    }

    public record RoleMutationResult(
        bool Success,
        Guid? RoleId = null,
        RoleErrorCode ErrorCode = RoleErrorCode.None,
        string? Error = null,
        string? Field = null);

    public class TableRoleDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = default!;
        public string? Description { get; set; }
        public bool IsSystem { get; set; }
        public DateTime CreatedAtUTC { get; set; } = DateTime.UtcNow;

        public int TotalUsersInThisRole { get; set; }

        public List<TableRolePermissions> RolePermissions { get; set; } = new();
    }

    public class CreateNewRoleRequest
    {
        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Descriptions { get; set; }

        [Required]
        public List<TableRolePermissions>? TableRole { get; set; }
    }

    public class UpdateRolePermission
    {
        public Guid FeatureId { get; set; }
        public bool CanRead { get; set; }
        public bool CanAdd { get; set; }
        public bool CanEdit { get; set; }
        public bool CanDelete { get; set; }
    }

    public class UpdateRoleRequest
    {
        [Required]
        public Guid Id { get; set; }

        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        [Required]
        public List<UpdateRolePermission>? Permissions { get; set; }
    }
}
