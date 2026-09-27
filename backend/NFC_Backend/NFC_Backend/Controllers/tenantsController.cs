using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Caching.Memory;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Exceptions;
using NFC_Backend.Extensions;
using NFC_Backend.Repos.Implementations;
using NFC_Backend.Repos.Interfaces;
using NFC_Backend.Services;
using System;

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
    ITableRepo tablerep,
    IExchangeRateRepo exchangeRateRepo,
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

                if (data.Count == 0)
                    return NoContent();   // empty page, same shape as any other page
                var rateList = await exchangeRateRepo.GetPrices(request.currency);
                var rates = rateList.ToDictionary(e => e.BaseCurrency, e => e.Rate);
                rates[request.currency] = 1m;

                var missing = data
                    .Select(m => m.CurrencyCode)
                    .Distinct()
                    .Where(c => !rates.ContainsKey(c))
                    .ToList();

                if (missing.Count > 0)
                    throw new NotFoundException(
                        $"Exchange rate not found for: {string.Join(", ", missing)} → {request.currency}");

                foreach (var item in data)
                {
                    var rate = rates[item.CurrencyCode];
                    if (!string.IsNullOrEmpty(item.CoverImage))
                        item.CoverImage = await filestorage.GetFileUrlAsync(item.CoverImage, tenant.BucketName);

                    for (int i = 0; i < item.Images.Count; i++)
                        item.Images[i] = await filestorage.GetFileUrlAsync(item.Images[i], tenant.BucketName);
                    item.CurrencyCode = request.currency;
                    item.Price *= rate;
                    item.OriginalPrice *= rate;
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

        [HttpGet("Tables")]
        [AllowAnonymous]
        [NeedSession]
        public async Task<ActionResult> GetTables()
        {
            try
            {
                logger.LogInformation("GetTables started");

                var tenantId = tenantAccessor.Current.Id;
                if (tenantId == null)
                {
                    logger.LogWarning("GetTables failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                Tenant? tenant = await tenantRepo.GetByID(tenantId);
                if (tenant == null)
                {
                    logger.LogWarning("GetTables failed - tenant not found. TenantId: {TenantId}", tenantId);
                    return NotFound(new { error = "Restaurant not found." });
                }

                var tables = await tablerep.GetAllByTenantAsync(tenant.Id);

                var data = tables.Select(t => new TableResponseDTO
                {
                    Id = t.Id,
                    Number = t.Number,
                    Name = t.Name,
                    IsAvailable = t.IsAvailable
                }).ToList();

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
                logger.LogError(ex, "GetTables unexpected error");
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }
    }

}
