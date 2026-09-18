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

        public MenuItemsController(ITenantRepo tenantRepo, IUserRepo userRepo, ILogger<MenuItemsController> logger, IFileStorageService fileStorageService, ICategoryRepo categoryRepo)
        {
            _tenantRepo = tenantRepo;
            _userRepo = userRepo;
            _logger = logger;
            _fileStorageService = fileStorageService;
            _categoryRepo = categoryRepo;
        }

        //[HttpPost]
        //[Authorize(Roles = nameof(UserRole.TenantOwner))]
        //public async Task<ActionResult> CreateNewMenuItem(CreateMenuRequest createMenu)
        //{
        //    try
        //    {
        //        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        //        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
        //        {
        //            _logger.LogWarning("CreateCategory failed - invalid or missing userId in token");
        //            return Unauthorized(new { error = "Invalid token." });
        //        }

        //        User user = await _userRepo.GetUserByID(userId);
        //        if (user == null)
        //        {
        //            _logger.LogWarning("CreateCategory failed - user not found. UserId: {UserId}", userId);
        //            return NotFound(new { error = "User not found." });
        //        }

        //        var tenantId = User.GetTenantId();
        //        if (tenantId == null)
        //        {
        //            _logger.LogWarning("CreateCategory failed - TenantId claim missing from token");
        //            return Unauthorized(new { error = "Invalid token." });
        //        }

        //        Tenant? tenant = await _tenantRepo.GetByID(tenantId.Value);
        //        if (tenant == null)
        //        {
        //            _logger.LogWarning("CreateCategory failed - tenant not found. TenantId: {TenantId}", tenantId);
        //            return NotFound(new { error = "Restaurant not found." });
        //        }


                
        //    }
        //    catch (NotFoundException ex)
        //    {
        //        _logger.LogWarning(ex.Message);
        //        return NotFound(new { error = ex.Message });
        //    }
        //    catch (BadRequestException ex)
        //    {
        //        _logger.LogWarning(ex.Message);
        //        return BadRequest(new { error = ex.Message });
        //    }
        //    catch (Exception ex)
        //    {
        //        _logger.LogError(ex, "Unexpected error in CreateCategory for TenantId: {TenantId}", User.GetTenantId());
        //        return StatusCode(500, new { error = "An unexpected error occurred." });
        //    }
        //}
    }
}
