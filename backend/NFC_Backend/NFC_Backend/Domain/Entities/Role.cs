namespace NFC_Backend.Domain.Entities
{
    public class Role
    {
        public Guid Id { get; set; }
        public Guid? TenantId { get; set; }  
        public string Name { get; set; } = default!;
        public string Description { get; set; } = default!;
        public bool IsSystem { get; set; }      
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Tenant? Tenant { get; set; }
        public ICollection<RolePermission> Permissions { get; set; } = new List<RolePermission>();
        public ICollection<TenantUserRole> UserRoles { get; set; } = new List<TenantUserRole>();
    }
}
