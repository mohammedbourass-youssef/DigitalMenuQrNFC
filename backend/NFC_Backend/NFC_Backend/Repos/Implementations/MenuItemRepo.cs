using Microsoft.EntityFrameworkCore;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Exceptions;
using NFC_Backend.Infrastructure.Data;
using NFC_Backend.Repos.Interfaces;

namespace NFC_Backend.Repos.Implementations
{
    public class MenuItemRepo : IMenuItemRepo
    {
        private readonly AppDbContext _db;
        private readonly ILogger<MenuItemRepo> _logger;

        public MenuItemRepo(AppDbContext db, ILogger<MenuItemRepo> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task<Guid> CreateNew(MenuItem menu, List<MenuItemTranslation> translations)
        {
            await _db.MenuItems.AddAsync(menu);
            await _db.MenuItemTranslations.AddRangeAsync(translations);
            await _db.SaveChangesAsync();

            _logger.LogInformation("MenuItem created. CategoryId: {CategoryId}", menu.Id);
            return menu.Id;
        }
        public Task<MenuItem?> GetMenuItemByIdAsync(Guid id, Guid tenantId)
          => _db.MenuItems
                .Include(m => m.Translations)
                .Include(m => m.Images)
                .FirstOrDefaultAsync(m => m.Id == id && m.TenantId == tenantId && m.IsActive);
        public Task<MenuItem?> GetMenuItemByIdIncludingInactiveAsync(Guid id, Guid tenantId)
            => _db.MenuItems
                  .Include(m => m.Translations)
                  .Include(m => m.Images)
                  .FirstOrDefaultAsync(m => m.Id == id && m.TenantId == tenantId);

        public async Task DisactiveMenuItem(Guid id)
        {
            var menu = await _db.MenuItems.FindAsync(id);
            if (menu == null) throw new NotFoundException("Menu item not found.");
            menu.IsActive = false;
            menu.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        public async Task ActiveMenuItem(Guid id)
        {
            var menu = await _db.MenuItems.FindAsync(id);
            if (menu == null) throw new NotFoundException("Menu item not found.");
            menu.IsActive = true;
            menu.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        public async Task UploadImages(Guid id, List<MenuImage> menuImages, string? coverImage)
        {
            var menu = await _db.MenuItems.FirstOrDefaultAsync(m => m.Id == id && m.IsActive);

            if (menu == null)  // ✅ null guard
            {
                _logger.LogWarning("UploadImages failed - MenuItem not found. CategoryId: {CategoryId}", id);
                throw new NotFoundException($"Menu item {id} not found.");
            }

            menu.CoverImage = coverImage;
            menu.UpdatedAt = DateTime.UtcNow;

            if (menuImages.Count > 0)
                await _db.MenuImages.AddRangeAsync(menuImages);

            await _db.SaveChangesAsync();

            _logger.LogInformation(
                "Images uploaded for MenuItemId: {CategoryId}. Count: {Count}", id, menuImages.Count);
        }


        public async Task<(List<MenuItem> Items, int TotalCount)> GetPagedForAdmin(
     Guid tenantId, int page, int pageSize)
        {
            var query = _db.MenuItems
                .AsNoTracking()
                .Where(m => m.TenantId == tenantId);

            var totalCount = await query.CountAsync();
            if (totalCount == 0)
                return (new List<MenuItem>(), 0);

            var items = await query
                .OrderBy(m => m.DisplayOrder)               
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Include(m => m.Translations)
                .Include(m => m.Images)
                .AsSplitQuery()                    
                .ToListAsync();

            return (items, totalCount);
        }

        public async Task DeleteImage(MenuImage image)
        {
            _db.MenuImages.Remove(image);
            await _db.SaveChangesAsync();
        }

        public async Task<bool> ReorderMenuImagesAsync(
            Guid menuId,
            Guid tenantId,
            IEnumerable<ImageOrderDto> orders,
            CancellationToken ct = default)
        {
            var menuExists = await _db.MenuItems
                .AsNoTracking()
                .AnyAsync(m => m.Id == menuId && m.TenantId == tenantId, ct);

            if (!menuExists) return false;

            var orderMap = orders
                .GroupBy(o => o.ImageId)
                .ToDictionary(g => g.Key, g => g.Last().DisplayOrder);

            if (orderMap.Count == 0) return true;

            var ids = orderMap.Keys.ToList();

            var images = await _db.MenuImages
                .Where(i => i.MenuId == menuId && ids.Contains(i.Id))
                .ToListAsync(ct);

            foreach (var img in images)
            {
                img.DisplayOrder = orderMap[img.Id];
            }

            await _db.SaveChangesAsync(ct);
            return true;
        }

        public async Task SaveUpdates(MenuItem menu)
        {
            _db.MenuItems.Update(menu);
            await _db.SaveChangesAsync();
        }

        public async Task<int> UpdateChangedTranslations(
            Guid menuId,
            IReadOnlyDictionary<string, LocalizedCategoryText> translations)
        {
            var existing = await _db.MenuItemTranslations
                .Where(t => t.MenuId == menuId)
                .ToListAsync();

            if (existing.Count == 0)
                throw new NotFoundException("Menu item translations not found.");

            var existingByLang = existing.ToDictionary(t => t.Lang);
            int changedCount = 0;

            foreach (var (lang, localized) in translations)
            {
                if (!existingByLang.TryGetValue(lang, out var entity))
                    continue;

                bool nameChanged = entity.Name != localized.Name;
                bool descChanged = entity.Descriptions != localized.Description;

                if (!nameChanged && !descChanged)
                    continue;

                if (nameChanged) entity.Name = localized.Name;
                if (descChanged) entity.Descriptions = localized.Description;

                changedCount++;
            }

            if (changedCount > 0)
            {
                await _db.SaveChangesAsync();
            }

            return changedCount;
        }

        public async Task<List<MenuItemPublicDTO>> GetPublicMenuItemsAsync(Guid tenantId,Guid? categoryId, string lang)
        {
            return await _db.MenuItems
                .Where(m => m.TenantId == tenantId
                         && (m.CategoryId == categoryId || categoryId == null)
                         && m.IsActive
                         && m.IsAvailable)
                .OrderBy(m => m.DisplayOrder)
                .Select(m => new MenuItemPublicDTO
                {
                    Id = m.Id,
                    Name = m.Translations
                        .Where(t => t.Lang == lang)
                        .Select(t => t.Name)
                        .FirstOrDefault() ?? m.Translations
                            .Select(t => t.Name)
                            .FirstOrDefault() ?? "Untitled",   
                    Description = m.Translations
                        .Where(t => t.Lang == lang)
                        .Select(t => t.Descriptions)
                        .FirstOrDefault(),
                    Price = m.DiscountedPrice ?? m.PriceInDefaultCurrency,
                    OriginalPrice = m.DiscountedPrice != null ? m.PriceInDefaultCurrency : (decimal?)null,
                    CurrencyCode = m.DefaultCurrencyCode,
                    CoverImage = m.CoverImage,
                    IsFeatured = m.IsFeatured,
                    PreparationTimeMinutes = m.PreparationTimeMinutes,
                    Images = m.Images
                        .OrderBy(img => img.DisplayOrder)
                        .Select(img => img.Url)
                        .ToList()
                })
                .ToListAsync();
        }

        public async Task<List<MenuItem>> GetMenuItemsByIdsAsync(IEnumerable<Guid> ids, Guid tenantId)
        {
            return await _db.MenuItems
                .AsNoTracking()
                .Where(m => ids.Contains(m.Id) && m.TenantId == tenantId  && m.IsAvailable )
                .ToListAsync();
        }
    }
}
