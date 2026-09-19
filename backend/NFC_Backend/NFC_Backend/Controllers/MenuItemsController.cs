using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Exceptions;
using NFC_Backend.Extensions;
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

        public MenuItemsController(
            ITenantRepo tenantRepo,
            IUserRepo userRepo,
            ILogger<MenuItemsController> logger,
            IFileStorageService fileStorageService,
            ICategoryRepo categoryRepo,
            IMenuItemRepo menuRepo,
            ICategoryTranslationService translation)  // ✅ injected
        {
            _tenantRepo = tenantRepo;
            _userRepo = userRepo;
            _logger = logger;
            _fileStorageService = fileStorageService;
            _categoryRepo = categoryRepo;
            _menuRepo = menuRepo;
            _translation = translation;
        }

        [HttpPost("main")]
        [Authorize(Roles = nameof(UserRole.TenantOwner))]
        public async Task<ActionResult> CreateNewMenuItem([FromBody] CreateMenuRequest request)
        {
            try
            {
                if (!ModelState.IsValid)  // ✅ fixed condition
                    return BadRequest(ModelState);

                _logger.LogInformation("CreateNewMenuItem started");

                var (tenant, error) = await ResolveTenantAsync();
                if (error != null) return error;

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
        public async Task<ActionResult> UploadImages(Guid id, [FromForm] UploadMenuImagesRequest request)
        {
            try
            {
                if (!ModelState.IsValid)  // ✅ fixed condition
                    return BadRequest(ModelState);

                _logger.LogInformation("UploadImages started. MenuItemId: {Id}", id);

                var (tenant, error) = await ResolveTenantAsync();
                if (error != null) return error;

                MenuItem? menu = await _menuRepo.GetMenuItemByIdAsync(id, tenant!.Id);
                if (menu == null)
                {
                    _logger.LogWarning("UploadImages failed - menu item not found. Id: {Id}", id);
                    return NotFound(new { error = "Menu item not found." });
                }

                // Upload cover image
                string? coverImageUrl = null;
                if (request.CoverImage != null)
                {
                    _logger.LogInformation("Uploading cover image for MenuItemId: {Id}", id);
                    coverImageUrl = await _fileStorageService.UploadFileAsync(
                        request.CoverImage.OpenReadStream(),
                        request.CoverImage.FileName,
                        request.CoverImage.ContentType,
                        tenant!.BucketName!);
                }

                // Upload additional images in parallel ✅
                var menuImages = new List<MenuImage>();
                if (request.Images.Any())
                {
                    var uploadTasks = request.Images
                        .Where(img => img != null)
                        .Select((img, index) => UploadSingleImageAsync(img, menu.Id, tenant!.BucketName!, index + 1));

                    menuImages = (await Task.WhenAll(uploadTasks)).ToList();

                    _logger.LogInformation(
                        "Uploaded {Count} images for MenuItemId: {Id}", menuImages.Count, id);
                }

                await _menuRepo.UploadImages(id, menuImages, coverImageUrl);

                _logger.LogInformation("UploadImages succeeded. MenuItemId: {Id}", id);
                return Created();
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
                _logger.LogError(ex, "Unexpected error in UploadImages. MenuItemId: {Id}", id);
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }


















        // ── Helpers ────────────────────────────────────────────────────────────────

        // Extracts and validates tenant from token — reused across endpoints
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
