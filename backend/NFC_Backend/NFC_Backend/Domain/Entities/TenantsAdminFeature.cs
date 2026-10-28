using System.Security;

namespace NFC_Backend.Domain.Entities
{
    public enum FeatureStatus
    {
        Available = 0,
        UnderMaintenance = 1,
        ComingSoon = 2
    }
    /// <summary>Global catalog of features (Orders, Menu, Analytics...).</summary>
    public class Feature
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = default!;
        public string Name { get; set; } = default!;
        public FeatureStatus Status { get; set; } = FeatureStatus.Available;

        public ICollection<PlanFeature> PlanFeatures { get; set; } = new List<PlanFeature>();
        public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
    }
}
