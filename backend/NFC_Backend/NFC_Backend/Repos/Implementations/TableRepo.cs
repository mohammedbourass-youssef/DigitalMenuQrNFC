using Microsoft.EntityFrameworkCore;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Infrastructure.Data;
using NFC_Backend.Repos.Interfaces;

namespace NFC_Backend.Repos.Implementations
{
    public class TableRepo : ITableRepo
    {
        private readonly AppDbContext _context;

        public TableRepo(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<Table>> GetAllByTenantAsync(Guid tenantId)
        {
            return await _context.Tables
                .Where(t => t.TenantId == tenantId)
                .OrderBy(t => t.Number)
                .ToListAsync();
        }

        public async Task<Table?> GetByIdAsync(Guid id, Guid tenantId)
        {
            return await _context.Tables
                .FirstOrDefaultAsync(t => t.Id == id && t.TenantId == tenantId);
        }

        public async Task<Table> CreateAsync(Table table)
        {
            _context.Tables.Add(table);
            await _context.SaveChangesAsync();
            return table;
        }

        public async Task<Table> UpdateAsync(Table table)
        {
            _context.Tables.Update(table);
            await _context.SaveChangesAsync();
            return table;
        }

        public async Task DeleteAsync(Table table)
        {
            _context.Tables.Remove(table);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> NumberExistsAsync(Guid tenantId, int number, Guid? excludeId = null)
        {
            return await _context.Tables.AnyAsync(t =>
                t.TenantId == tenantId &&
                t.Number == number &&
                (excludeId == null || t.Id != excludeId));
        }
    }
}
