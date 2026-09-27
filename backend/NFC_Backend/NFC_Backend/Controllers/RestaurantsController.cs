using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Win32;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Exceptions;
using NFC_Backend.Extensions;
using NFC_Backend.Infrastructure.Tools;
using NFC_Backend.Repos.Implementations;
using NFC_Backend.Repos.Interfaces;
using NFC_Backend.Services;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace NFC_Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RestaurantsController : ControllerBase
    {
        private readonly ITenantRepo _tenantRepo;
        private readonly IUserRepo _userRepo;
        private readonly ILogger<RestaurantsController> _logger;
        private readonly IFileStorageService _fileStorageService;
        private readonly ITenantAccessor _tenantAccessor;
        private readonly ITokenService _tokenService;
        private readonly ISessionsRepository _SessionRepo;

        public RestaurantsController(ITenantRepo tenant , ILogger<RestaurantsController> logger ,
            IUserRepo repo , IFileStorageService fileStorageService , ITenantAccessor tenant1 , ITokenService token , ISessionsRepository sessions)
        {
            _tenantRepo = tenant;
            _logger = logger;
            _userRepo = repo;
            _fileStorageService = fileStorageService;
            _tenantAccessor = tenant1;
                        _tokenService = token;
            _SessionRepo = sessions;
        }
        [HttpGet("my-restaurant")]
        [Authorize]
        public async Task<ActionResult<MyRestaurantInfosResponse>> GetMyRestaurantInfos()
        {
            try
            {
                // Get userId from JWT claims
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
                {
                    _logger.LogWarning("GetMyRestaurantInfos failed - invalid or missing userId in token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                var result = await _tenantRepo.GetMyRestaurantInfosAsync(userId);
                return Ok(result);
            }
            catch (NotFoundException ex)
            {
                _logger.LogWarning(ex.Message);
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in GetMyRestaurantInfos");
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { error = "An unexpected error occurred. Please try again." });
            }
        }

        [HttpPut("infos-update")]
        [Authorize]
        public async Task<ActionResult> UpdateInfos([FromForm] MyRestaurantUpdateInfosDTO myRestaurantUpdateInfosDTO)
        {
            try
            {
                // 1. Get TenantId from JWT claims
                var tenantId = User.GetTenantId();
                if (tenantId == null)
                {
                    _logger.LogWarning("UpdateInfos failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                // 2. Find tenant
                Tenant? tenant = await _tenantRepo.GetByID(tenantId.Value);
                if (tenant == null)
                {
                    _logger.LogWarning("UpdateInfos failed - tenant not found. TenantId: {TenantId}", tenantId);
                    return NotFound(new { error = "Restaurant not found." });
                }

                _logger.LogInformation("UpdateInfos started for TenantId: {TenantId}", tenantId);

                // 3. Update basic fields
                tenant.RestaurantName = myRestaurantUpdateInfosDTO.RestaurantName;
                tenant.PhoneNumber = myRestaurantUpdateInfosDTO.PhoneNumber;
                tenant.Address = myRestaurantUpdateInfosDTO.Address;
                tenant.City = myRestaurantUpdateInfosDTO.City;
                tenant.CurrencyCode = myRestaurantUpdateInfosDTO.CurrencyCode;
                tenant.PrimaryColor = myRestaurantUpdateInfosDTO.PrimaryColor;
                tenant.UpdatedAt = DateTime.UtcNow;

                // 4. Handle logo upload
                if (myRestaurantUpdateInfosDTO.Logo != null)
                {
                    var bucket = tenant.BucketName;

                    // 4a. Delete old logo if exists
                    if (!string.IsNullOrEmpty(tenant.LogoUrl))
                    {
                        await _fileStorageService.DeleteFileAsync(tenant.LogoUrl, bucket);
                        _logger.LogInformation("Old logo deleted for TenantId: {TenantId}", tenantId);
                    }

                    // 4b. Upload new logo
                    var filePath = await _fileStorageService.UploadFileAsync(
                        myRestaurantUpdateInfosDTO.Logo.OpenReadStream(),
                        myRestaurantUpdateInfosDTO.Logo.FileName,
                        myRestaurantUpdateInfosDTO.Logo.ContentType,
                        bucket);

                    tenant.LogoUrl = filePath;
                    _logger.LogInformation("New logo uploaded for TenantId: {TenantId}, Path: {Path}",
                        tenantId, filePath);
                }

                // 5. Save changes
                await _tenantRepo.SaveUpdate(tenant);
                _logger.LogInformation("UpdateInfos completed successfully for TenantId: {TenantId}", tenantId);

                return Ok(new { message = "Restaurant information updated successfully." });
            }
            catch (NotFoundException ex)
            {
                _logger.LogWarning(ex.Message);
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in UpdateInfos for TenantId: {TenantId}",
                    User.GetTenantId());
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { error = "An unexpected error occurred. Please try again." });
            }
        }
     
    }
}
