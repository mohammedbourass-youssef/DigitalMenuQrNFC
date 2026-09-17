using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Win32;
using Minio.DataModel;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Exceptions;
using NFC_Backend.Extensions;
using NFC_Backend.Repos.Interfaces;
using NFC_Backend.Services;
using System;
using System.Security.Claims;

namespace NFC_Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CateogriesController : ControllerBase
    {
        private readonly ITenantRepo _tenantRepo;
        private readonly IUserRepo _userRepo;
        private readonly ILogger<CateogriesController> _logger;
        private readonly IFileStorageService _fileStorageService;
        private readonly ICategoryRepo _categoryRepo;
        private readonly ICategoryTranslationService _translation; 
        public CateogriesController(ITenantRepo tenantRepo , IUserRepo userRepo ,
            ILogger<CateogriesController> logger , IFileStorageService fileStorageService , ICategoryRepo  categoryRepo, ICategoryTranslationService translation)
        {
            _tenantRepo = tenantRepo;
            _userRepo = userRepo;
            _logger = logger;
            _fileStorageService = fileStorageService;
            _categoryRepo = categoryRepo;
            _translation = translation;
        }

        [HttpPost]
        [Authorize(Roles = nameof(UserRole.TenantOwner))]
        public async Task<ActionResult<CreateCateogryResponse>> CreateCategory(CreateCateogryRequest request)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
                {
                    _logger.LogWarning("CreateCategory failed - invalid or missing userId in token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                User user = await _userRepo.GetUserByID(userId);
                if (user == null)
                {
                    _logger.LogWarning("CreateCategory failed - user not found. UserId: {UserId}", userId);
                    return NotFound(new { error = "User not found." });
                }

                var tenantId = User.GetTenantId();
                if (tenantId == null)
                {
                    _logger.LogWarning("CreateCategory failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                Tenant? tenant = await _tenantRepo.GetByID(tenantId.Value);
                if (tenant == null)
                {
                    _logger.LogWarning("CreateCategory failed - tenant not found. TenantId: {TenantId}", tenantId);
                    return NotFound(new { error = "Restaurant not found." });
                }

                //if (user.TenantId != tenantId)
                //{
                //    _logger.LogWarning(
                //        "CreateCategory failed - user {UserId} tenant mismatch. UserTenantId: {UserTenantId}, TokenTenantId: {TokenTenantId}",
                //        userId, user.TenantId, tenantId);
                //    return Forbid();
                //}
                //_logger.LogInformation("CreateCategory started for TenantId: {TenantId}", tenantId);

                Task<string>? imageUploadTask = request.Image != null
                    ? _fileStorageService.UploadFileAsync(
                        request.Image.OpenReadStream(),
                        request.Image.FileName,
                        request.Image.ContentType,
                        tenant.BucketName!)
                    : null;

                var translationTask = _translation.TranslateCategoryAsync(request.Name, request.Description);

                if (imageUploadTask != null)
                {
                    await Task.WhenAll(imageUploadTask, translationTask);
                }
                else
                {
                    await translationTask;
                }

                var category = new Category
                {
                    Color = request.Color,
                    IsActive = true,
                    TenantId = tenantId.Value,
                    DisplayOrder = request.SortOrder,
                    CreatedAt = DateTime.UtcNow,
                    ImageUrl = imageUploadTask != null ? await imageUploadTask : null,
                    UpdatedAt = null,
                };

                if (imageUploadTask != null)
                {
                    _logger.LogInformation("Category image uploaded successfully for TenantId: {TenantId}", tenant.Id);
                }

                var responseT = await translationTask;

                var translations = new List<CategoryTranslation>(responseT.Translations.Count);
                var names = new Dictionary<string, string>(responseT.Translations.Count);
                var descriptions = new Dictionary<string, string>(responseT.Translations.Count);

                foreach (var (lang, localized) in responseT.Translations)
                {
                    translations.Add(new CategoryTranslation
                    {
                        Name = localized.Name,
                        Descriptions = localized.Description,
                        Lang = lang,
                        // CategoryId set inside SaveCategoryWithTranslations
                    });

                    names[lang] = localized.Name;
                    if (localized.Description != null)
                    {
                        descriptions[lang] = localized.Description;
                    }
                }

                var categoryId = await _categoryRepo.SaveCategoryWithTranslations(category, translations);

                _logger.LogInformation(
                    "CreateCategory succeeded for TenantId: {TenantId}, CategoryId: {CategoryId}",
                    tenantId, categoryId);

                return Ok(new CreateCateogryResponse
                {
                    CategoryId = categoryId,
                    Descriptions = descriptions,
                    Names = names,
                });
            }
            catch (NotFoundException ex)
            {
                _logger.LogWarning(ex.Message);
                return NotFound(new { error = ex.Message });
            }
            catch (BadRequestException ex)
            {
                _logger.LogWarning(ex.Message);
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in CreateCategory for TenantId: {TenantId}", User.GetTenantId());
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }

        [HttpPut("category-languages")]
        [Authorize(Roles = nameof(UserRole.TenantOwner))]
        public async Task<ActionResult> UpdatesCategoryLanguages(UpdateCateogryRequest updateCateogry)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
                {
                    _logger.LogWarning("UpdatesCategoryLanguages failed - invalid or missing userId in token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                User user = await _userRepo.GetUserByID(userId);
                if (user == null)
                {
                    _logger.LogWarning("UpdatesCategoryLanguages failed - user not found. UserId: {UserId}", userId);
                    return NotFound(new { error = "User not found." });
                }

                var tenantId = User.GetTenantId();
                if (tenantId == null)
                {
                    _logger.LogWarning("UpdatesCategoryLanguages failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                Tenant? tenant = await _tenantRepo.GetByID(tenantId.Value);
                if (tenant == null)
                {
                    _logger.LogWarning("UpdatesCategoryLanguages failed - tenant not found. TenantId: {TenantId}", tenantId);
                    return NotFound(new { error = "Restaurant not found." });
                }
                Category? category = await _categoryRepo.GetCategoryByIDAsync(updateCateogry.CategoryId);
                if (category == null)
                {
                    _logger.LogWarning(
                        "UpdatesCategoryLanguages failed - category not found. CategoryId: {CategoryId}",
                        updateCateogry.CategoryId);
                    return NotFound(new { error = "Category not found." });
                }

                if (category.TenantId != tenantId)
                {
                    _logger.LogWarning(
                        "UpdatesCategoryLanguages failed - category {CategoryId} does not belong to tenant. CategoryTenantId: {CategoryTenantId}, TokenTenantId: {TokenTenantId}",
                        category.Id, category.TenantId, tenantId);
                    return Forbid();
                }

                var updatedCount = await _categoryRepo.UpdateChangedTranslations(
                    updateCateogry.CategoryId, updateCateogry.Translations);

                _logger.LogInformation(
                    "UpdatesCategoryLanguages succeeded for CategoryId: {CategoryId}, {Count} translation(s) changed",
                    updateCateogry.CategoryId, updatedCount);

                return Ok(new { updated = updatedCount });
            }
            catch (NotFoundException ex)
            {
                _logger.LogWarning(ex.Message);
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in UpdatesCategoryLanguages");
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }
        [HttpGet("categories-Admin")]
        [Authorize(Roles = nameof(UserRole.TenantOwner))]
        public async Task<ActionResult> GetAllForAdmin([FromQuery] CategoryAdminRequest request)
        {
            try

            {
                _logger.LogInformation("GetAllForAdmin started");
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
                {
                    _logger.LogWarning("GetAllForAdmin failed - invalid or missing userId in token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                User user = await _userRepo.GetUserByID(userId);
                if (user == null)
                {
                    _logger.LogWarning("GetAllForAdmin failed - user not found. UserId: {UserId}", userId);
                    return NotFound(new { error = "User not found." });
                }

                var tenantId = User.GetTenantId();
                if (tenantId == null)
                {
                    _logger.LogWarning("GetAllForAdmin failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                Tenant? tenant = await _tenantRepo.GetByID(tenantId.Value);
                if (tenant == null)
                {
                    _logger.LogWarning("GetAllForAdmin failed - tenant not found. TenantId: {TenantId}", tenantId);
                    return NotFound(new { error = "Restaurant not found." });
                }               

                var categories = await _categoryRepo.GetAdminCategories(tenant.Id, request.PageNumber, request.PageCount);
                var totalCount = await _categoryRepo.CountTotalCategories(tenant.Id); 

                if (categories == null || categories.Count == 0)
                    return NoContent();

                // ✅ Map each category concurrently since GetFileUrlAsync is async
                var dataTask = categories.Select(async c =>
                {
                    var translation = c.Translations.FirstOrDefault(t => t.Lang == request.Lang);
                    var imageUrl = await _fileStorageService.GetFileUrlAsync(c.ImageUrl, tenant.BucketName);

                    return new AdminCategorisData(
                        translation?.Name,
                        translation?.Descriptions,
                        c.Color,
                        imageUrl,
                        c.IsActive,
                        c.CreatedAt
                    );
                });

                // ✅ Await all the mapping tasks in parallel
                var data = await Task.WhenAll(dataTask);

                bool hasMore = (request.PageNumber * request.PageCount) < totalCount;

                return Ok(new
                {
                    meta = new
                    {
                        pageNumber = request.PageNumber,
                        pageSize = request.PageCount,
                        totalCount = totalCount,
                        hasMore = hasMore
                    },
                    data = data
                });
            }
            catch (NotFoundException ex)
            {
                _logger.LogWarning(ex.Message);
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetAllForAdmin unexpected error");
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }
    }
}
