using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Exceptions;
using NFC_Backend.Extensions;
using NFC_Backend.Repos.Implementations;
using NFC_Backend.Repos.Interfaces;
using NFC_Backend.Services;

namespace NFC_Backend.Controllers
{
    [Route("api/tenant")]
    [ApiController]
    public class TenantController(
    ITenantAccessor tenantAccessor,
    ITenantRepo tenantRepo,
    ITokenService tokenService,
    ISessionsRepository sessionRepo,
    IFileStorageService filestorage,
    ICategoryRepo category,
    IMemoryCache cache,
    IMenuItemRepo menuItem,
    ILogger<TenantController> logger) : ControllerBase
    {
        [HttpGet("info")]
        [AllowAnonymous]
        public async Task<ActionResult<TenantInfoResponse>> GetInfo()
        {
            if (tenantAccessor.Current is null)
                return NotFound(new { error = "Restaurant not found" });

            var tenant = await tenantRepo.GetTenantInfosByID(tenantAccessor.Current.Id);
            if (tenant is null)
                return NotFound(new { error = "Restaurant not found" });

            var plainToken = tokenService.GenerateSessionToken();
            var tokenHash = tokenService.HashSessionToken(plainToken);

            var expiresIn = TimeSpan.FromHours(24);
            var session = await sessionRepo.CreateAsync(tokenHash, tenant.Id, expiresIn);
            await sessionRepo.SaveChangesAsync();

            // Warm the cache immediately so SessionMiddleware doesn't hit the DB
            // on the very next request using this token.
            // Key MUST match SessionMiddleware's cache key: session:{tokenHash}
            var sessionInfo = new SessionInfo(session.Id, tenant.Id, session.TableId ?? Guid.Empty, session.ExpiresAt);
            cache.Set($"session:{tokenHash}", sessionInfo, expiresIn);

            return Ok(new TenantInfoResponse
            {
                SessionId = plainToken,
                RestaurantName = tenant.RestaurantName,
                LogoUrl = await filestorage.GetFileUrlAsync(tenant.LogoUrl, tenant.BucketName),
                PrimaryColor = tenant.PrimaryColor,
                DefaultCurrency = tenant.Currency.Symbol,
                PhoneNumber = tenant.PhoneNumber,
                Address = tenant.Address
            });
        }

        [HttpGet("Categories")]
        [AllowAnonymous]
        [NeedSession]
        public async Task<ActionResult> GetSimpleInfos([FromQuery] string lang)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                logger.LogInformation("GetSimpleInfos started");

                var tenantId = tenantAccessor.Current.Id;
                if (tenantId == null)
                {
                    logger.LogWarning("GetSimpleInfos failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                Tenant? tenant = await tenantRepo.GetByID(tenantId);
                if (tenant == null)
                {
                    logger.LogWarning("GetSimpleInfos failed - tenant not found. TenantId: {TenantId}", tenantId);
                    return NotFound(new { error = "Restaurant not found." });
                }

                var data = await category.GetPublicCategories(tenant.Id, lang);
                foreach (var category in data)
                {
                    category.Image = await filestorage.GetFileUrlAsync(category.Image, tenant.BucketName);
                }
                if (data.Count == 0)
                {
                    return NoContent();
                }
                return Ok(new { data });
            }
            catch (NotFoundException ex)
            {
                logger.LogWarning(ex.Message);
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "GetSimpleInfos unexpected error");
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }

        [HttpGet("menu")]
        [AllowAnonymous]
        [NeedSession]
        public async Task<ActionResult> GetMenuInfos([FromQuery] MenuRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                logger.LogInformation("GetMenuInfos started");

                var tenantId = tenantAccessor.Current.Id;
                if (tenantId == null)
                {
                    logger.LogWarning("GetMenuInfos failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                Tenant? tenant = await tenantRepo.GetByID(tenantId);
                if (tenant == null)
                {
                    logger.LogWarning("GetMenuInfos failed - tenant not found. TenantId: {TenantId}", tenantId);
                    return NotFound(new { error = "Restaurant not found." });
                }

                if (!request.getAll)
                {
                    Category? c = await category.GetCategoryByIDAsync(request.CategoryId.Value, tenantId);
                    if (c == null)
                    {
                        return BadRequest(new { error = "Category not found." });
                    }
                }

                var data = await menuItem.GetPublicMenuItemsAsync(
                    tenant.Id,
                   
                    request.getAll ? null : request.CategoryId, request.lang);

                foreach (var item in data)
                {
                    if (!string.IsNullOrEmpty(item.CoverImage))
                        item.CoverImage = await filestorage.GetFileUrlAsync(item.CoverImage, tenant.BucketName);

                    for (int i = 0; i < item.Images.Count; i++)
                        item.Images[i] = await filestorage.GetFileUrlAsync(item.Images[i], tenant.BucketName);
                }

                if (data.Count == 0)
                {
                    return NoContent();
                }
                return Ok(new { data });
            }
            catch (NotFoundException ex)
            {
                logger.LogWarning(ex.Message);
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "GetMenuInfos unexpected error");
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }
    }
}