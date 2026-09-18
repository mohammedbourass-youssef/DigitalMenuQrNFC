using Microsoft.EntityFrameworkCore;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Exceptions;
using NFC_Backend.Infrastructure.Data;
using NFC_Backend.Repos.Interfaces;

namespace NFC_Backend.Repos.Implementations
{
    public class CategoryRepo : ICategoryRepo
    {
        private readonly AppDbContext _db;

        public CategoryRepo(AppDbContext db)
        {
            _db = db;
        }

        public async Task<Guid> SaveCategoryWithTranslations(Category category, List<CategoryTranslation> translations)
        {
            await _db.Categories.AddAsync(category);

            foreach (var t in translations)
            {
                t.CategoryId = category.Id; // works even before insert, since Category.Id is a client-generated Guid (not identity)
            }
            await _db.CategoryTranslations.AddRangeAsync(translations);

            await _db.SaveChangesAsync(); // single round trip — both category + all translations in one transaction

            return category.Id;
        }
        // CategoryRepo.cs
        public async Task<int> UpdateChangedTranslations(
            Guid categoryId,
            IReadOnlyDictionary<string, LocalizedCategoryText> translations)
        {
            // Single round trip: fetch only the rows for this category, tracked by EF.
            var existing = await _db.CategoryTranslations
                .Where(t => t.CategoryId == categoryId)
                .ToListAsync();

            if (existing.Count == 0)
                throw new NotFoundException("Category translations not found.");

            var existingByLang = existing.ToDictionary(t => t.Lang);

            int changedCount = 0;

            foreach (var (lang, localized) in translations)
            {
                if (!existingByLang.TryGetValue(lang, out var entity))
                    continue; // unknown language for this category — skip (or throw, your call)

                bool nameChanged = entity.Name != localized.Name;
                bool descChanged = entity.Descriptions != localized.Description;

                if (!nameChanged && !descChanged)
                    continue; // nothing to do — EF never even sees a dirty entity for this row

                if (nameChanged) entity.Name = localized.Name;
                if (descChanged) entity.Descriptions = localized.Description;

                changedCount++;
            }

            if (changedCount > 0)
            {
                await _db.SaveChangesAsync(); // one round trip, only for the rows actually mutated
            }

            return changedCount;
        }
        public async Task<int> CountTotalCategories(Guid TenantId)
        {
            var Total = await _db.Categories
                .AsNoTracking()
                .Where(c => c.TenantId == TenantId)
                .CountAsync();

            return Total;
        }
        public async Task<List<Category>> GetAdminCategories(Guid TenantId, int Page, int pageCount)
        {
            var categories = await _db.Categories
                .AsNoTracking()
                .Where(c =>  c.TenantId == TenantId)
                .Include(c=>c.Translations)
                .OrderBy(c => c.DisplayOrder)
                .Skip((Page - 1) * pageCount)
                .Take(pageCount)
                .ToListAsync();
            return categories;
        }

        public async Task<Category?> GetCategoryOfAdmin(Guid TenantId, Guid categoryId)
        {
            var categories = await _db.Categories
                .AsNoTracking()
                .Where(c => c.TenantId == TenantId && c.Id == categoryId)
                .Include(c => c.Translations)
                .FirstOrDefaultAsync();
            return categories;
        }

        public Task<Category?> GetCategoryByIDAsync(Guid id , Guid TenantID)
        => _db.Categories.Where(c => c.Id == id && c.IsActive == true && c.TenantId == TenantID).FirstOrDefaultAsync();

        public async Task DisactiveCategory(Guid id)
        {
            //First disactive All Menus Related 
            // now Disacteave The Category 
            Category? category = await _db.Categories.FirstOrDefaultAsync(c => c.Id == id);
            if (category == null)
                throw new NotFoundException();
            category.IsActive = false;
            category.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
        public async Task ActiveCategory(Guid id)
        {
            //First disactive All Menus Related 
            // now Disacteave The Category 
            Category? category = await _db.Categories.FirstOrDefaultAsync(c => c.Id == id);
            if (category == null)
                throw new NotFoundException();
            if (category.IsActive)
                return;
            category.IsActive = true;
            category.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
        public Task<Category?> GetCategoryByIDIncludingInactiveAsync(Guid id , Guid Tenant)
          => _db.Categories.Where(c => c.Id == id && c.TenantId == Tenant).FirstOrDefaultAsync();

        public async Task UpdateColorAndOrder(Guid categoryId, Guid tenantId, string color, int displayOrder)
        {
            var category = await _db.Categories
                .FirstOrDefaultAsync(c => c.Id == categoryId && c.TenantId == tenantId);

            if (category == null)
                throw new NotFoundException("Category not found.");

            category.Color = color;
            category.DisplayOrder = displayOrder;
            category.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
        }

        public async Task<List<SimpleCategoryInfoDto>> GetCategoriesSimple(Guid tenantId, SearchCategoryRequest search)
        {
            var translationsQuery = _db.CategoryTranslations
                .Where(t => t.Lang == search.Language);

            if (!string.IsNullOrWhiteSpace(search.Query))
            {
                translationsQuery = translationsQuery
                    .Where(t => t.Name.Contains(search.Query));
            }

            var data = await _db.Categories
                .AsNoTracking()
                .Where(c => c.TenantId == tenantId && c.IsActive)
                .Join(
                    translationsQuery,
                    c => c.Id,
                    t => t.CategoryId,
                    (c, t) => new { c, t } // keep as anonymous type first
                )
                .OrderBy(x => x.t.Name) // order on the raw joined result — EF can translate this
                .Select(x => new SimpleCategoryInfoDto(
                    x.c.Id,
                    x.t.Name,
                    x.t.Descriptions,
                    x.c.Color
                ))
                .ToListAsync();

            return data;
        }
    }
}
