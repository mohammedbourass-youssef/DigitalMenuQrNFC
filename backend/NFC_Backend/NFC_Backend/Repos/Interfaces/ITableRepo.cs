using NFC_Backend.Domain.Entities;

namespace NFC_Backend.Repos.Interfaces
{
    public interface ITableRepo
    {
        Task<List<Table>> GetAllByTenantAsync(Guid tenantId);
        Task<Table?> GetByIdAsync(Guid id, Guid tenantId);
        Task<Table> CreateAsync(Table table);
        Task<Table> UpdateAsync(Table table);
        Task DeleteAsync(Table table);
        Task<bool> NumberExistsAsync(Guid tenantId, int number, Guid? excludeId = null);
    }
}
