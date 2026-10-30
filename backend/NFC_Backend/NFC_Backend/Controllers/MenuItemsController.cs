using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NFC_Backend.Domain.Constants;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Exceptions;
using NFC_Backend.Extensions;
using NFC_Backend.MidlleWares;
using NFC_Backend.Repos.Implementations;
using NFC_Backend.Repos.Interfaces;
using NFC_Backend.Services;
using System.Security.Claims;

namespace NFC_Backend.Controllers
{
    [Route("api/MenuItems")]
    [ApiController]
    public class MenuItemsController : ControllerBase
    {
        private readonly ITenantRepo _tenantRepo;
        private readonly IUserRepo _userRepo;
        private readonly ILogger<MenuItemsController> _logger;
        private readonly IFileStorageService _fileStorageService;
        private readonly ICategoryRepo _categoryRepo;
        private readonly IMenuItemRepo _menuRepo;
        private readonly ICategoryTranslationService _translation;
        private readonly IExchangeRateRepo _exchangeRateRepo;
        private readonly IPlanRepo _planRepo;

        public MenuItemsController(
            ITenantRepo tenantRepo,
            IUserRepo userRepo,
            ILogger<MenuItemsController> logger,
            IFileStorageService fileStorageService,
            ICategoryRepo categoryRepo,
            IMenuItemRepo menuRepo,
            IPlanRepo planRepo,
            ICategoryTranslationService translation , IExchangeRateRepo exchangeRateRepo)  
        {
            _tenantRepo = tenantRepo;
            _userRepo = userRepo;
            _logger = logger;
            _fileStorageService = fileStorageService;
            _categoryRepo = categoryRepo;
            _menuRepo = menuRepo;
            _translation = translation;
            _exchangeRateRepo = exchangeRateRepo;
            _planRepo = planRepo;
        }

        [HttpPost("main")]
        [Authorize(Roles = nameof(UserRole.TenantOwner))]
        [HasPermission(FeatureCodes.Menu, EnPermissionActions.WRITE)]
        [HasPermission(FeatureCodes.Categories, EnPermissionActions.READ)]
        public async Task<ActionResult> CreateNewMenuItem([FromBody] CreateMenuRequest request)
        {
            try
            {
                if (!ModelState.IsValid)  // ✅ fixed condition
                    return BadRequest(ModelState);

                _logger.LogInformation("CreateNewMenuItem started");

                var (tenant, error) = await ResolveTenantAsync();
                if (error != null) return error;
                var quota = await _planRepo.GetPlanQuotaAsync(tenant!.PlanId, tenant.Id);
                if (quota is null)
                {
                    _logger.LogWarning(
                        "CreateNewMenuItem failed - active plan not found. TenantId: {TenantId}, PlanId: {PlanId}",
                        tenant.Id, tenant.PlanId);

                    return NotFound(new { code = "PLAN_NOT_FOUND", message = "Active plan not found." });          // 404
                }

                if (!quota.MenuItems.CanAdd)
                {
                    _logger.LogInformation(
                        "CreateNewMenuItem blocked - limit reached. TenantId: {TenantId}, Plan: {Plan}, Used: {Used}, Max: {Max}",
                        tenant.Id, quota.Name, quota.MenuItems.Used, quota.MenuItems.Max);

                    return StatusCode(StatusCodes.Status403Forbidden, new                                           // 403
                    {
                        code = "MENUITEM_LIMIT_REACHED",
                        message = "Menu item limit reached for your plan.",
                        current = quota.MenuItems.Used,
                        limit = quota.MenuItems.Max
                    });
                }
                Category? category = await _categoryRepo.GetCategoryByIDAsync(request.CategoryId, tenant!.Id);
                if (category == null)
                {
                    _logger.LogWarning("CreateNewMenuItem failed - category not found. CategoryId: {CategoryId}", request.CategoryId);
                    return NotFound(new { error = "Category not found." });
                }

                var menu = new MenuItem
                {
                    Id = Guid.NewGuid(),
                    CategoryId = category.Id,
                    TenantId = tenant.Id,
                    CoverImage = null,
                    IsActive = true,
                    IsAvailable = request.IsAvailable,
                    IsFeatured = request.IsFeatured,
                    PreparationTimeMinutes = request.PreparationTimeMinutes,
                    PriceInDefaultCurrency = request.PriceInDefaultCurrency,
                    Sku = request.Sku,
                    DefaultCurrencyCode = request.DefaultCurrencyCode,
                    DiscountedPrice = request.DiscountedPrice,
                    DisplayOrder = request.DisplayOrder,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = null,
                };

                _logger.LogInformation("Translating menu item. Name: {Name}", request.Name);
                var responseT = await _translation.TranslateCategoryAsync(request.Name, request.Description);

                var translations = responseT.Translations
                    .Select(kvp => new MenuItemTranslation
                    {
                        MenuId = menu.Id,
                        Lang = kvp.Key,
                        Name = kvp.Value.Name,
                        Descriptions = kvp.Value.Description,
                    })
                    .ToList();

                var menuId = await _menuRepo.CreateNew(menu, translations);

                _logger.LogInformation("CreateNewMenuItem succeeded. MenuId: {MenuId}", menuId);
                return Ok(new { MenuId = menuId });
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
                _logger.LogError(ex, "Unexpected error in CreateNewMenuItem. TenantId: {TenantId}", User.GetTenantId());
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }

        [HttpPut("{id}/Images")]
        [Authorize(Roles = nameof(UserRole.TenantOwner))]
        [HasPermission(FeatureCodes.Menu, EnPermissionActions.UPDATE)]
        public async Task<ActionResult> UploadImages(Guid id, [FromForm] UploadMenuImagesRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                _logger.LogInformation("UploadImages started. MenuItemId: {CategoryId}", id);

                var (tenant, error) = await ResolveTenantAsync();
                if (error != null) return error;

                MenuItem? menu = await _menuRepo.GetMenuItemByIdIncludingInactiveAsync(id, tenant!.Id);
                if (menu == null)
                {
                    _logger.LogWarning("UploadImages failed - menu item not found. CategoryId: {CategoryId}", id);
                    return NotFound(new { error = "Menu item not found." });
                }
                var newImagesCount = request.Images?.Count(i => i != null) ?? 0;

                if (newImagesCount > 0)
                {
                    var quota = await _planRepo.GetPlanQuotaAsync(tenant.PlanId, tenant.Id);
                    if (quota is null)
                    {
                        _logger.LogWarning(
                            "UploadImages failed - active plan not found. TenantId: {TenantId}, PlanId: {PlanId}",
                            tenant.Id, tenant.PlanId);

                        return NotFound(new { code = "PLAN_NOT_FOUND", message = "Active plan not found." });      // 404
                    }

                    var existing = menu.Images.Count;
                    var max = quota.MaxImagesPerMenuItem;

                    if (existing + newImagesCount > max)
                    {
                        _logger.LogInformation(
                            "UploadImages blocked - image limit reached. TenantId: {TenantId}, MenuItemId: {MenuItemId}, Existing: {Existing}, New: {New}, Max: {Max}",
                            tenant.Id, id, existing, newImagesCount, max);

                        return StatusCode(StatusCodes.Status403Forbidden, new                                       // 403
                        {
                            code = "IMAGE_LIMIT_REACHED",
                            message = $"This plan allows {max} images per menu item.",
                            current = existing,
                            attempted = newImagesCount,
                            limit = max
                        });
                    }
                }
                // Replace cover image if a new one is provided
                string? coverImageUrl = menu.CoverImage;
                if (request.CoverImage != null)
                {
                    _logger.LogInformation("Replacing cover image for MenuItemId: {CategoryId}", id);
                    if (!string.IsNullOrEmpty(menu.CoverImage))
                    {
                        await _fileStorageService.DeleteFileAsync(menu.CoverImage, tenant.BucketName!);
                    }
                    coverImageUrl = await _fileStorageService.UploadFileAsync(
                        request.CoverImage.OpenReadStream(),
                        request.CoverImage.FileName,
                        request.CoverImage.ContentType,
                        tenant!.BucketName!);
                }

                // Upload additional images in parallel
                var menuImages = new List<MenuImage>();
                if (request.Images != null && request.Images.Any())
                {
                    int maxOrder = menu.Images.Any() ? menu.Images.Max(i => i.DisplayOrder) : 0;
                    var uploadTasks = request.Images
                        .Where(img => img != null)
                        .Select((img, index) => UploadSingleImageAsync(img, menu.Id, tenant!.BucketName!, maxOrder + index + 1));

                    menuImages = (await Task.WhenAll(uploadTasks)).ToList();

                    _logger.LogInformation(
                        "Uploaded {Count} additional images for MenuItemId: {CategoryId}", menuImages.Count, id);
                }

                await _menuRepo.UploadImages(id, menuImages, coverImageUrl);

                _logger.LogInformation("UploadImages succeeded. MenuItemId: {CategoryId}", id);
                return Ok(new { message = "Images updated successfully." });
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
                _logger.LogError(ex, "Unexpected error in UploadImages. MenuItemId: {CategoryId}", id);
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }

        [HttpGet("Admin-menus")]
        [Authorize(Roles = nameof(UserRole.TenantOwner))]
        [HasPermission(FeatureCodes.Menu, EnPermissionActions.READ)]
        public async Task<ActionResult> GetAll([FromQuery] AdminGetAllMenuRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var (tenant, error) = await ResolveTenantAsync();
                if (error != null) return error;

                var (menus, totalCount) = await _menuRepo.GetPagedForAdmin(
                    tenant.Id, request.Page, request.PageSize);

                var paged = new PagedResult<object>
                {
                    Page = request.Page,
                    PageSize = request.PageSize,
                    TotalCount = totalCount
                };

                if (menus.Count == 0)
                    return Ok(paged);   // empty page, same shape as any other page

                var rateList = await _exchangeRateRepo.GetPrices(request.CurrencyCode);
                var rates = rateList.ToDictionary(e => e.BaseCurrency, e => e.Rate);
                rates[request.CurrencyCode] = 1m;

                var missing = menus
                    .Select(m => m.DefaultCurrencyCode)
                    .Distinct()
                    .Where(c => !rates.ContainsKey(c))
                    .ToList();

                if (missing.Count > 0)
                    throw new NotFoundException(
                        $"Exchange rate not found for: {string.Join(", ", missing)} → {request.CurrencyCode}");

                paged.Items.AddRange(menus.Select(m =>
                {
                    var translation = m.Translations.FirstOrDefault(t => t.Lang == request.Language)
                                      ?? m.Translations.FirstOrDefault();
                    var rate = rates[m.DefaultCurrencyCode];

                    return (object)new
                    {
                        m.Id,
                        m.IsFeatured,
                        Name = translation?.Name,
                        Descriptions = translation?.Descriptions,
                        m.IsActive,
                        m.IsAvailable,
                        Price = m.PriceInDefaultCurrency * rate,
                        Currency = request.CurrencyCode,
                        DiscountedPrice = m.DiscountedPrice * rate,
                        m.PreparationTimeMinutes,
                        m.Sku
                    };
                }));

                return Ok(paged);
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
                _logger.LogError(ex, "Unexpected error in GetAll (admin menus). Currency: {Currency}, Lang: {Lang}, Page: {Page}",
                    request.CurrencyCode, request.Language, request.Page);
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }

        [HttpGet("{id}/info-Admin")]
        [Authorize(Roles = nameof(UserRole.TenantOwner))]
        [HasPermission(FeatureCodes.Menu, EnPermissionActions.READ)]
        public async Task<ActionResult> GetMenuItemInfoOfAdmin(Guid id)
        {
            try
            {
                var (tenant, error) = await ResolveTenantAsync();
                if (error != null) return error;

                var menu = await _menuRepo.GetMenuItemByIdIncludingInactiveAsync(id, tenant!.Id);
                if (menu == null)
                    return NotFound(new { error = "Menu item not found." });

                var coverUrl = await _fileStorageService.GetFileUrlAsync(menu.CoverImage, tenant.BucketName);
                var imagesList = new List<object>();
                foreach (var img in menu.Images.OrderBy(i => i.DisplayOrder))
                {
                    var imgUrl = await _fileStorageService.GetFileUrlAsync(img.Url, tenant.BucketName);
                    imagesList.Add(new { id = img.Id, url = imgUrl, displayOrder = img.DisplayOrder });
                }

                return Ok(new
                {
                    id = menu.Id,
                    categoryId = menu.CategoryId,
                    isFeatured = menu.IsFeatured,
                    isActive = menu.IsActive,
                    isAvailable = menu.IsAvailable,
                    price = menu.PriceInDefaultCurrency,
                    currency = menu.DefaultCurrencyCode,
                    discountedPrice = menu.DiscountedPrice,
                    preparationTimeMinutes = menu.PreparationTimeMinutes,
                    sku = menu.Sku,
                    coverImage = coverUrl,
                    images = imagesList,
                    translations = menu.Translations.Select(t => new
                    {
                        id = t.Id,
                        lang = t.Lang,
                        name = t.Name,
                        description = t.Descriptions
                    })
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetMenuItemInfoOfAdmin unexpected error");
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }
        [HttpDelete("{menuId}/images/{imageId}")]
        [Authorize(Roles = nameof(UserRole.TenantOwner))]
        [HasPermission(FeatureCodes.Menu, EnPermissionActions.DELETE)]
        public async Task<ActionResult> DeleteMenuImage(Guid menuId, Guid imageId)
        {
            try
            {
                var (tenant, error) = await ResolveTenantAsync();
                if (error != null) return error;

                var menu = await _menuRepo.GetMenuItemByIdIncludingInactiveAsync(menuId, tenant!.Id);
                if (menu == null) return NotFound(new { error = "Menu item not found." });

                var image = menu.Images.FirstOrDefault(i => i.Id == imageId);
                if (image == null) return NotFound(new { error = "Image not found." });

                await _fileStorageService.DeleteFileAsync(image.Url, tenant.BucketName);

                await _menuRepo.DeleteImage(image);

                return Ok(new { message = "Image deleted successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error deleting menu image");
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }

        [HttpPatch("{menuId}/images/reorder")]
        [Authorize(Roles = nameof(UserRole.TenantOwner))]
        [HasPermission(FeatureCodes.Menu, EnPermissionActions.UPDATE)]
        public async Task<ActionResult> ReorderMenuImages(
        Guid menuId,
        [FromBody] List<ImageOrderDto> orders,
        CancellationToken ct)
        {
            try
            {
                var (tenant, error) = await ResolveTenantAsync();
                if (error != null) return error;

                var found = await _menuRepo.ReorderMenuImagesAsync(menuId, tenant!.Id, orders, ct);
                if (!found) return NotFound(new { error = "Menu item not found." });

                return Ok(new { message = "Images reordered successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error reordering menu images");
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }

        [HttpPut("menu-languages")]
        [Authorize(Roles = nameof(UserRole.TenantOwner))]
        [HasPermission(FeatureCodes.Menu, EnPermissionActions.UPDATE)]
        public async Task<ActionResult> UpdateMenuLanguages([FromBody] UpdateCateogryRequest request)
        {
            try
            {
                var (tenant, error) = await ResolveTenantAsync();
                if (error != null) return error;

                var menu = await _menuRepo.GetMenuItemByIdIncludingInactiveAsync(request.CategoryId, tenant!.Id);
                if (menu == null)
                    return NotFound(new { error = "Menu item not found." });

                var updatedCount = await _menuRepo.UpdateChangedTranslations(
                    request.CategoryId, request.Translations);

                return Ok(new { updated = updatedCount });
            }
            catch (NotFoundException ex)
            {
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in UpdateMenuLanguages");
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }

        [HttpPut("{id}/details")]
        [Authorize(Roles = nameof(UserRole.TenantOwner))]
        [HasPermission(FeatureCodes.Menu, EnPermissionActions.UPDATE)]
        public async Task<ActionResult> UpdateMenuItemDetails(Guid id, [FromBody] UpdateMenuItemDetailsDto request)
        {
            try
            {
                var (tenant, error) = await ResolveTenantAsync();
                if (error != null) return error;

                var menu = await _menuRepo.GetMenuItemByIdIncludingInactiveAsync(id, tenant!.Id);
                if (menu == null)
                    return NotFound(new { error = "Menu item not found." });

                menu.Sku = request.Sku;
                menu.PriceInDefaultCurrency = request.PriceInDefaultCurrency;
                menu.DiscountedPrice = request.DiscountedPrice;
                menu.PreparationTimeMinutes = request.PreparationTimeMinutes;
                menu.IsAvailable = request.IsAvailable;
                menu.IsFeatured = request.IsFeatured;
                menu.UpdatedAt = DateTime.UtcNow;

                await _menuRepo.SaveUpdates(menu);

                return Ok(new { message = "Menu item details updated successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error updating menu item details");
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }
        [HttpPut("{id}/move")]
        [Authorize(Roles = nameof(UserRole.TenantOwner))]
        [HasPermission(FeatureCodes.Menu, EnPermissionActions.UPDATE)]
        [HasPermission(FeatureCodes.Categories, EnPermissionActions.READ)]
        public async Task<ActionResult> MoveMenuItemToCategory(Guid id, [FromBody] MoveMenuItemRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var (tenant, error) = await ResolveTenantAsync();
                if (error != null) return error;

                var menu = await _menuRepo.GetMenuItemByIdIncludingInactiveAsync(id, tenant!.Id);
                if (menu == null)
                    return NotFound(new { error = "Menu item not found." });

                if (menu.CategoryId == request.CategoryId)
                    return BadRequest(new { error = "Menu item is already in this category." });

                var currentCategory = await _categoryRepo.GetCategoryByIDIncludingInactiveAsync(menu.CategoryId, tenant.Id);
                if (currentCategory == null)
                    return NotFound(new { error = "Current category not found." });

                var targetCategory = await _categoryRepo.GetCategoryByIDIncludingInactiveAsync(request.CategoryId, tenant.Id);
                if (targetCategory == null)
                    return NotFound(new { error = "Target category not found." });

                menu.CategoryId = request.CategoryId;
                menu.UpdatedAt = DateTime.UtcNow;

                await _menuRepo.SaveUpdates(menu);

                _logger.LogInformation("MenuItem {CategoryId} moved to category {CategoryId}", id, request.CategoryId);
                return Ok(new { message = "Menu item moved to category successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error moving menu item to category. MenuItemId: {CategoryId}", id);
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }
        private async Task<(Tenant? tenant, ActionResult? error)> ResolveTenantAsync()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            {
                _logger.LogWarning("ResolveTenant failed - invalid or missing userId in token");
                return (null, Unauthorized(new { error = "Invalid token." }));
            }

            var user = await _userRepo.GetUserByID(userId);
            if (user == null)
            {
                _logger.LogWarning("ResolveTenant failed - user not found. UserId: {UserId}", userId);
                return (null, NotFound(new { error = "User not found." }));
            }

            var tenantId = User.GetTenantId();
            if (tenantId == null)
            {
                _logger.LogWarning("ResolveTenant failed - TenantId claim missing");
                return (null, Unauthorized(new { error = "Invalid token." }));
            }

            var tenant = await _tenantRepo.GetByID(tenantId.Value);
            if (tenant == null)
            {
                _logger.LogWarning("ResolveTenant failed - tenant not found. TenantId: {TenantId}", tenantId);
                return (null, NotFound(new { error = "Restaurant not found." }));
            }

            return (tenant, null);
        }

        private async Task<MenuImage> UploadSingleImageAsync(
            IFormFile image, Guid menuId, string bucketName, int displayOrder)
        {
            var url = await _fileStorageService.UploadFileAsync(
                image.OpenReadStream(),
                image.FileName,
                image.ContentType,
                bucketName);

            return new MenuImage
            {
                MenuId = menuId,
                Url = url,
                DisplayOrder = displayOrder,  // ✅ sequential order
                CreatedAt = DateTime.UtcNow,
            };
        }
   
    
    }
}
