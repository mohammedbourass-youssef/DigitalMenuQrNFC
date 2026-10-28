namespace NFC_Backend.Domain.Entities
{
    public class RolePermission
    {
        public Guid RoleId { get; set; }
        public Guid FeatureId { get; set; }

        public bool CanRead { get; set; }
        public bool CanAdd { get; set; }
        public bool CanEdit { get; set; }
        public bool CanDelete { get; set; }

        public Role Role { get; set; } = default!;
        public Feature Feature { get; set; } = default!;
    }
}
