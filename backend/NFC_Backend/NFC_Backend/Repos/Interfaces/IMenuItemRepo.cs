using NFC_Backend.Domain.Entities;

namespace NFC_Backend.Repos.Interfaces
{
    public interface IMenuItemRepo
    {
        public Task<Guid> CreateNew(MenuItem menu , List<MenuItemTranslation> itemTranslations);
        public Task<MenuItem?> GetMenuItemByIdAsync(Guid id , Guid TenantId);
        public  Task UploadImages(Guid id, List<MenuImage> menuImages, string? CoverImage);

    }
}
