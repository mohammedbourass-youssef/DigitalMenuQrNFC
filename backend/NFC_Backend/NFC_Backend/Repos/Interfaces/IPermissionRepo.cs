using NFC_Backend.Domain.DTOS;
using NFC_Backend.MidlleWares;

namespace NFC_Backend.Repos.Interfaces
{
    public interface IPermissionRepo
    {
        Task<MyPermissionsDto?> GetMyPermissionsAsync(
            Guid userId,
            Guid tenantId,
            CancellationToken ct = default);
        Task<HashSet<(string Feature, EnPermissionActions Action)>> GetPermissionsAsync(Guid userId, CancellationToken ct = default);

        public  Task<List<UserPermissionsDto>> UserPermissionsForShowingAsync(
      Guid userId, int tenantPlanId, CancellationToken ct = default);

    }
}
