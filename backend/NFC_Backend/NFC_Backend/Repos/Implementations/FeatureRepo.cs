using Microsoft.EntityFrameworkCore;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Infrastructure.Data;
using NFC_Backend.Repos.Interfaces;

namespace NFC_Backend.Repos.Implementations
{
    public class FeatureRepo : IFeatureRepo
    {
        private readonly AppDbContext _dbContext;

        public FeatureRepo(AppDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<List<FeatureDto>> GetAllAsync(CancellationToken ct = default)
        {
            var features = await _dbContext.Features
                .AsNoTracking()
                .OrderBy(f => f.Code)
                .ToListAsync(ct);

            return features
                .Select(f => new FeatureDto(f.Id, f.Code, f.Name, f.Status.ToString()))
                .ToList();
        }
    }
}
