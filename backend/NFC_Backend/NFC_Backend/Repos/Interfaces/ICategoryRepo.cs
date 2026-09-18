using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;

namespace NFC_Backend.Repos.Interfaces
{
    public interface ICategoryRepo
    {
        public  Task<Guid> SaveCategoryWithTranslations(Category category, List<CategoryTranslation> translations);
        Task<int> UpdateChangedTranslations(Guid categoryId, IReadOnlyDictionary<string, LocalizedCategoryText> translations);
        public Task<int> CountTotalCategories(Guid TenantId);
        public Task<List<Category>> GetAdminCategories(Guid TenantId, int Page, int pageCount );
        public Task<Category?> GetCategoryByIDAsync(Guid id, Guid TeantId);
        public  Task DisactiveCategory(Guid id);
        public Task ActiveCategory(Guid id);
        public Task<Category?> GetCategoryByIDIncludingInactiveAsync(Guid id, Guid TeantId);
        public Task<Category?> GetCategoryOfAdmin(Guid TenantId, Guid categoryId);
        public  Task UpdateColorAndOrder(Guid categoryId, Guid tenantId, string color, int displayOrder);
        public Task<List<SimpleCategoryInfoDto>> GetCategoriesSimple(Guid tenantId, SearchCategoryRequest search);


    }
}
