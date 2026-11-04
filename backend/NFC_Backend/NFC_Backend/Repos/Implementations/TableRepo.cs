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
        public async Task<Table?> GetByTableNumberAsync(int TableNumber, Guid tenantId)
        {
            return await _context.Tables
               .FirstOrDefaultAsync(t => t.Number == TableNumber && t.TenantId == tenantId);
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

        public async Task<string?> GenerateQrCodeUrlAsync(Guid id, Guid tenantId, string baseDomain)
        {
            var table = await _context.Tables
                .Include(t => t.Tenant)
                .FirstOrDefaultAsync(t => t.Id == id && t.TenantId == tenantId);

            if (table == null)
                return null;

            var subdomain = table.Tenant?.Subdomain ?? string.Empty;
            var qrUrl = $"http://{subdomain}.{baseDomain}/table/{table.Number}";

            table.QrCodeUrl = qrUrl;
            _context.Tables.Update(table);
            await _context.SaveChangesAsync();

            return qrUrl;
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
