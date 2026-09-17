using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;

namespace NFC_Backend.Repos.Interfaces
{
    public interface ICategoryRepo
    {
        public  Task<Guid> SaveCategoryWithTranslations(Category category, List<CategoryTranslation> translations);
        // ICategoryRepo.cs
        Task<int> UpdateChangedTranslations(Guid categoryId, IReadOnlyDictionary<string, LocalizedCategoryText> translations);

        public Task<int> CountTotalCategories(Guid TenantId);
        public Task<List<Category>> GetAdminCategories(Guid TenantId, int Page, int pageCount );
        public Task<Category?> GetCategoryByIDAsync(Guid id);
    }
}
