using NFC_Backend.Domain.DTOS;

namespace NFC_Backend.Repos.Interfaces
{
    public interface IFeatureRepo
    {
        Task<List<FeatureDto>> GetAllAsync(CancellationToken ct = default);
    }
}
