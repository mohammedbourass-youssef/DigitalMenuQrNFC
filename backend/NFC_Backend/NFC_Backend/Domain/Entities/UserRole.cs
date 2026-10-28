namespace NFC_Backend.Domain.Entities
{
    public class TenantUserRole
    {
        public Guid UserId { get; set; }
        public Guid RoleId { get; set; }
        public User User { get; set; } = default!;
        public Role Role { get; set; } = default!;
    }
}
