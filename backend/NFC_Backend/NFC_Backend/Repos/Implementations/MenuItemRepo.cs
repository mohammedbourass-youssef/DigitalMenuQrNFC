using Microsoft.EntityFrameworkCore;
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

            _logger.LogInformation("MenuItem created. Id: {Id}", menu.Id);
            return menu.Id;
        }

        public Task<MenuItem?> GetMenuItemByIdAsync(Guid id, Guid tenantId)
            => _db.MenuItems
                  .FirstOrDefaultAsync(m => m.Id == id && m.IsActive && m.TenantId == tenantId);

        public async Task UploadImages(Guid id, List<MenuImage> menuImages, string? coverImage)
        {
            var menu = await _db.MenuItems.FirstOrDefaultAsync(m => m.Id == id && m.IsActive);

            if (menu == null)  // ✅ null guard
            {
                _logger.LogWarning("UploadImages failed - MenuItem not found. Id: {Id}", id);
                throw new NotFoundException($"Menu item {id} not found.");
            }

            menu.CoverImage = coverImage;
            menu.UpdatedAt = DateTime.UtcNow;

            if (menuImages.Count > 0)
                await _db.MenuImages.AddRangeAsync(menuImages);

            await _db.SaveChangesAsync();

            _logger.LogInformation(
                "Images uploaded for MenuItemId: {Id}. Count: {Count}", id, menuImages.Count);
        }
    }
}
