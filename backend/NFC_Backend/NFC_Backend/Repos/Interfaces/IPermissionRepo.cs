using NFC_Backend.Domain.DTOS;

namespace NFC_Backend.Repos.Interfaces
{
    public interface IPermissionRepo
    {
        Task<MyPermissionsDto?> GetMyPermissionsAsync(
            Guid userId,
            Guid tenantId,
            CancellationToken ct = default);
    }
}
