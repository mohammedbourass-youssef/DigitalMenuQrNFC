namespace NFC_Backend.Domain.DTOS
{
    public record PlanAccessDto(
        int Id,
        string Code,
        string Name,
        bool IsFree);

    public record FeaturePermissionDto(
        Guid Id,
        string Code,
        string Name,
        string Status,
        bool IsInPlan,
        bool CanRead,
        bool CanAdd,
        bool CanEdit,
        bool CanDelete);

    public record MyPermissionsDto(
        PlanAccessDto? Plan,
        List<string> Roles,
        List<FeaturePermissionDto> Features);
    public sealed class PermissionFlags
    {
        public bool CanRead { get; set; }
        public bool CanAdd { get; set; }
        public bool CanEdit { get; set; }
        public bool CanDelete { get; set; }
    }
    
  
}
