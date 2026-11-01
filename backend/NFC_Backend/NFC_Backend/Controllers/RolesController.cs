using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NFC_Backend.Domain.Constants;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Extensions;
using NFC_Backend.MidlleWares;
using NFC_Backend.Repos.Interfaces;

namespace NFC_Backend.Controllers
{
    [Route("api/Roles")]
    [ApiController]
    public class RolesController : ControllerBase
    {
        private readonly ITenantRepo _tenantRepo;
        private readonly IUserRepo _userRepo;
        private readonly ILogger<RolesController> _logger;
        private readonly IRoleRepo _roleRepo;
        private readonly IPlanRepo _PlanRepo;
        public RolesController(ITenantRepo tenantRepo, IUserRepo userRepo, ILogger<RolesController> logger, IRoleRepo roleRepo , IPlanRepo planRepo)
        {
            _logger = logger;
            _tenantRepo = tenantRepo;
            _userRepo = userRepo;
            _roleRepo = roleRepo;
            _PlanRepo = planRepo;
        }
        [HttpGet("List")]
        [Authorize(Roles = $"{nameof(UserRole.TenantOwner)},{nameof(UserRole.TenantStaff)}")]
        [HasPermission(FeatureCodes.Roles, EnPermissionActions.READ)]
        public async Task<ActionResult<IEnumerable<TableRoleDTO>>> GetAdminTable()
        {
            try
            {
                var tenantId = User.GetTenantId();
                if (tenantId == null)
                {
                    _logger.LogWarning("GetAdminTable (Roles) failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                Tenant? tenant = await _tenantRepo.GetByID(tenantId.Value);
                if (tenant == null)
                {
                    _logger.LogWarning("GetAdminTable (Roles) failed - tenant not found. TenantId: {TenantId}", tenantId);
                    return NotFound(new { error = "Restaurant not found." });
                }

                var roles = await _roleRepo.GetListOfRolesAsync(tenant.Id);

                return Ok(roles);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetAdminTable (Roles) unexpected error");
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }


        [HttpPost("Create")]
        [Authorize(Roles = $"{nameof(UserRole.TenantOwner)},{nameof(UserRole.TenantStaff)}")]
        [HasPermission(FeatureCodes.Roles, EnPermissionActions.WRITE)]

        public async Task<ActionResult> CreateNewRoleAsync(
    [FromBody] CreateNewRoleRequest request,
    CancellationToken cancellationToken = default)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var tenantId = User.GetTenantId();
                if (tenantId == null)
                {
                    _logger.LogWarning("CreateNewRole failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                Tenant? tenant = await _tenantRepo.GetByID(tenantId.Value);
                if (tenant == null)
                {
                    _logger.LogWarning("CreateNewRole failed - tenant not found. TenantId: {TenantId}", tenantId);
                    return NotFound(new { error = "Restaurant not found." });
                }

                var plan = await _PlanRepo.GetPlanQuotaAsync(tenant.PlanId, tenantId.Value, cancellationToken);
                if (plan == null)
                {
                    _logger.LogWarning("CreateNewRole failed - plan quota not found. TenantId: {TenantId}", tenantId);
                    return NotFound(new { error = "Plan not found." });
                }

                // Fast check for a friendly early exit. The repo re-checks inside a transaction.
                if (!plan.Roles.CanAdd)
                {
                    return StatusCode(StatusCodes.Status403Forbidden,
                        new { error = "Roles limit reached for your plan." });
                }

                var result = await _roleRepo.CreateNewRoleAsync(request, tenantId.Value);
                if (!result.Success)
                {
                    // Name exists / limit reached (race) / invalid data
                    return Conflict(new { error = result.Error });
                }

                return CreatedAtAction(nameof(GetAdminTable), new { id = result.RoleId }, new { id = result.RoleId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "CreateNewRole unexpected error");
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }

        [HttpPut]
        [Authorize(Roles = $"{nameof(UserRole.TenantOwner)},{nameof(UserRole.TenantStaff)}")]
        [HasPermission(FeatureCodes.Roles, EnPermissionActions.UPDATE)]
        public async Task<ActionResult> UpdateRoleAsync(
            [FromBody] UpdateRoleRequest request,
            CancellationToken cancellationToken = default)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var tenantId = User.GetTenantId();
                if (tenantId == null)
                {
                    _logger.LogWarning("UpdateRole failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                Tenant? tenant = await _tenantRepo.GetByID(tenantId.Value);
                if (tenant == null)
                {
                    _logger.LogWarning("UpdateRole failed - tenant not found. TenantId: {TenantId}", tenantId);
                    return NotFound(new { error = "Restaurant not found." });
                }

                var result = await _roleRepo.UpdateRoleAsync(
                    tenantId.Value,
                    request,
                    cancellationToken);

                if (result.Success)
                    return NoContent();

                return result.ErrorCode switch
                {
                    RoleErrorCode.DuplicateName =>
                        Conflict(new { error = result.Error }),
                    RoleErrorCode.SystemRole =>
                        StatusCode(StatusCodes.Status403Forbidden, new { error = result.Error }),
                    RoleErrorCode.NotFound =>
                        NotFound(new { error = result.Error }),
                    RoleErrorCode.TenantNotFound =>
                        NotFound(new { error = result.Error }),
                    RoleErrorCode.PlanNotFound =>
                        NotFound(new { error = result.Error }),
                    RoleErrorCode.Validation =>
                        BadRequest(new { error = result.Error, field = result.Field }),
                    RoleErrorCode.InvalidPermissions =>
                        BadRequest(new { error = result.Error, field = result.Field }),
                    RoleErrorCode.FeatureNotAvailable =>
                        BadRequest(new { error = result.Error, field = result.Field }),
                    _ => StatusCode(StatusCodes.Status500InternalServerError,
                        new { error = "An unexpected error occurred." })
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "UpdateRole unexpected error");
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { error = "An unexpected error occurred." });
            }
        }
    }
}
    

