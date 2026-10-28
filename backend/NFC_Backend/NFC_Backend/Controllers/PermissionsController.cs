using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Extensions;
using NFC_Backend.Repos.Interfaces;

namespace NFC_Backend.Controllers
{
    [Route("api/permissions")]
    [ApiController]
    [Authorize]
    public class PermissionsController : ControllerBase
    {
        private readonly IPermissionRepo _repo;
        private readonly ILogger<PermissionsController> _logger;

        public PermissionsController(IPermissionRepo repo, ILogger<PermissionsController> logger)
        {
            _repo = repo;
            _logger = logger;
        }

        [HttpGet("me")]
        [ProducesResponseType(typeof(MyPermissionsDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<MyPermissionsDto>> GetMyPermissions(CancellationToken ct)
        {
            var userId = User.GetUserId();
            var tenantId = User.GetTenantId();

            if (userId is null || tenantId is null)
            {
                _logger.LogWarning("GetMyPermissions failed - UserId or TenantId claim missing from token.");
                return Unauthorized(new { error = "Invalid token." });
            }

            try
            {
                var permissions = await _repo.GetMyPermissionsAsync(userId.Value, tenantId.Value, ct);

                if (permissions is null)
                {
                    _logger.LogWarning(
                        "GetMyPermissions - user or restaurant not found. UserId: {UserId}, TenantId: {TenantId}",
                        userId,
                        tenantId);
                    return NotFound(new { error = "User or restaurant not found." });
                }

                return Ok(permissions);
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation(
                    "GetMyPermissions cancelled. UserId: {UserId}, TenantId: {TenantId}",
                    userId,
                    tenantId);
                return StatusCode(StatusCodes.Status499ClientClosedRequest);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "GetMyPermissions failed. UserId: {UserId}, TenantId: {TenantId}",
                    userId,
                    tenantId);
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { error = "An unexpected error occurred." });
            }
        }
    }
}
