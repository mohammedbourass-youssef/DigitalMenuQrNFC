using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;

namespace NFC_Backend.Repos.Interfaces
{
    public interface IMenuItemRepo
    {
        public Task<Guid> CreateNew(MenuItem menu , List<MenuItemTranslation> itemTranslations);
        public Task<MenuItem?> GetMenuItemByIdIncludingInactiveAsync(Guid id, Guid tenantId);
        public Task<MenuItem?> GetMenuItemByIdAsync(Guid id, Guid tenantId);
        public Task DisactiveMenuItem(Guid id);
        public Task ActiveMenuItem(Guid id);
        public  Task UploadImages(Guid id, List<MenuImage> menuImages, string? CoverImage);
        Task<(List<MenuItem> Items, int TotalCount)> GetPagedForAdmin(Guid tenantId, int page, int pageSize);
        public  Task DeleteImage(MenuImage image);

        /// <summary>
        /// Updates DisplayOrder for the given images of a menu item.
        /// Returns false if the menu item doesn't exist for this tenant.
        /// </summary>
        Task<bool> ReorderMenuImagesAsync(
            Guid menuId,
            Guid tenantId,
            IEnumerable<ImageOrderDto> orders,
            CancellationToken ct = default);

        Task SaveUpdates(MenuItem menu);

        Task<int> UpdateChangedTranslations(
            Guid menuId,
            IReadOnlyDictionary<string, LocalizedCategoryText> translations);
        public Task<List<MenuItemPublicDTO>> GetPublicMenuItemsAsync(Guid tenantId, Guid? categoryId, string lang);
        public Task<List<MenuItem>> GetMenuItemsByIdsAsync(IEnumerable<Guid> ids, Guid tenantId);
    }
}
