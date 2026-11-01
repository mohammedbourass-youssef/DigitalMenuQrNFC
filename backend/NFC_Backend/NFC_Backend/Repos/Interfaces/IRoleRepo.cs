using NFC_Backend.Domain.DTOS;

namespace NFC_Backend.Repos.Interfaces
{
    public interface IRoleRepo
    {
        Task<List<TableRoleDTO>> GetListOfRolesAsync(Guid tenantId, CancellationToken ct = default);

        Task<RoleMutationResult> CreateNewRoleAsync(
            CreateNewRoleRequest request,
            Guid tenantId,
            CancellationToken ct = default);

        Task<RoleMutationResult> UpdateRoleAsync(
            Guid tenantId,
            UpdateRoleRequest request,
            CancellationToken ct);
    }
}
