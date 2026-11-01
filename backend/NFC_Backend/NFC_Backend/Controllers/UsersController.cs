using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NFC_Backend.Domain.Constants;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Exceptions;
using NFC_Backend.Extensions;
using NFC_Backend.MidlleWares;
using NFC_Backend.Repos.Interfaces;
using NFC_Backend.Services;
using System.Security.Claims;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserRepo _userService;
    private readonly ITenantRepo _tenantRepo;
    private readonly ILogger<UsersController> _logger;
    private readonly IPlanRepo _planRepo;
    IVerificationEmailService _verificationEmailService;

    public UsersController(
        IUserRepo userService,
        ITenantRepo tenantRepo,
        ILogger<UsersController> logger,
        IVerificationEmailService verificationEmailService , IPlanRepo planRepo)
    {
        _userService = userService;
        _tenantRepo = tenantRepo;
        _logger = logger;
        _verificationEmailService = verificationEmailService;
        _planRepo = planRepo;
    }

    // GET api/users/List
    [HttpGet("List")]
    [Authorize(Roles = $"{nameof(UserRole.TenantOwner)},{nameof(UserRole.TenantStaff)}")]
    [HasPermission(FeatureCodes.Users, EnPermissionActions.READ)]
    public async Task<ActionResult<PagedUserListDTO>> GetTenantUsers(
        [FromQuery] UserListRequest request,
        CancellationToken ct = default)
    {
        try
        {
            var tenantId = User.GetTenantId();
            if (tenantId == null)
            {
                _logger.LogWarning("GetTenantUsers failed - TenantId claim missing from token");
                return Unauthorized(new { error = "Invalid token." });
            }

            var tenant = await _tenantRepo.GetByID(tenantId.Value);
            if (tenant == null)
            {
                _logger.LogWarning("GetTenantUsers failed - tenant not found. TenantId: {TenantId}", tenantId);
                return NotFound(new { error = "Restaurant not found." });
            }

            var paged = await _userService.GetTenantUsersAsync(tenant.Id, request, ct);
            return Ok(paged);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetTenantUsers unexpected error");
            return StatusCode(500, new { error = "An unexpected error occurred." });
        }
    }

    // GET api/users/Roles
    [HttpGet("Roles")]
    [Authorize(Roles = $"{nameof(UserRole.TenantOwner)},{nameof(UserRole.TenantStaff)}")]
    [HasPermission(FeatureCodes.Users, EnPermissionActions.READ)]
    public async Task<ActionResult<IEnumerable<TenantRoleDTO>>> GetTenantRoles(
        CancellationToken ct = default)
    {
        try
        {
            var tenantId = User.GetTenantId();
            if (tenantId == null)
            {
                _logger.LogWarning("GetTenantRoles failed - TenantId claim missing from token");
                return Unauthorized(new { error = "Invalid token." });
            }

            var tenant = await _tenantRepo.GetByID(tenantId.Value);
            if (tenant == null)
            {
                _logger.LogWarning("GetTenantRoles failed - tenant not found. TenantId: {TenantId}", tenantId);
                return NotFound(new { error = "Restaurant not found." });
            }

            var roles = await _userService.GetTenantRolesAsync(tenant.Id, ct);
            return Ok(roles);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetTenantRoles unexpected error");
            return StatusCode(500, new { error = "An unexpected error occurred." });
        }
    }

    // POST api/users/Create
    [HttpPost("Create")]
    [Authorize(Roles = $"{nameof(UserRole.TenantOwner)},{nameof(UserRole.TenantStaff)}")]
    [HasPermission(FeatureCodes.Users, EnPermissionActions.WRITE)]
    public async Task<ActionResult<CreateTenantUserResponse>> CreateTenantUser(
        [FromBody] CreateTenantUserRequest request,
        CancellationToken ct = default)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var tenantId = User.GetTenantId();
            if (tenantId == null)
            {
                _logger.LogWarning("CreateTenantUser failed - TenantId claim missing from token");
                return Unauthorized(new { error = "Invalid token." });
            }

            var tenant = await _tenantRepo.GetByID(tenantId.Value);
            if (tenant == null)
            {
                _logger.LogWarning("CreateTenantUser failed - tenant not found. TenantId: {TenantId}", tenantId);
                return NotFound(new { error = "Restaurant not found." });
            }

            var plan = await _planRepo.GetPlanQuotaAsync(tenant.PlanId, tenantId.Value, ct);

            if (plan is null)
            {
                _logger.LogWarning(
                    "Plan not found for tenant {TenantId} (PlanId: {PlanId})",
                    tenantId.Value, tenant.PlanId);

                return Problem(
                    title: "Subscription plan not found",
                    detail: "No active plan is associated with this tenant.",
                    statusCode: StatusCodes.Status403Forbidden);
            }

            if (!plan.Users.CanAdd)
            {
                _logger.LogInformation(
                    "User quota reached for tenant {TenantId}: {Current}/{Max}",
                    tenantId.Value, plan.Users.Used, plan.Users.Max);

                return Problem(
                    title: "User limit reached",
                    detail: $"Your plan allows up to {plan.Users.Max} users. Upgrade your plan to add more.",
                    statusCode: StatusCodes.Status403Forbidden);
            }

            var result = await _userService.CreateTenantUserAsync(request, tenantId.Value, ct);

            return CreatedAtAction(nameof(GetTenantUsers), new { }, new
            {
                id = result.Id,
                temporaryPassword = result.TemporaryPassword
            });
        }
        catch (BadRequestException ex)
        {
            _logger.LogWarning(ex.Message);
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "CreateTenantUser unexpected error");
            return StatusCode(500, new { error = "An unexpected error occurred." });
        }
    }

    // GET api/users/my-profile
    [HttpGet("my-profile")]
    public async Task<ActionResult<MyProfileResponse>> GetMyProfile()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            {
                _logger.LogWarning("Me failed - invalid or missing userId in token");
                return Unauthorized(new { error = "Invalid token." });
            }

            var result = await _userService.GetMyProfileAsync(userId);
            return Ok(result);
        }
        catch (NotFoundException ex)
        {
            _logger.LogWarning(ex.Message);
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in GetMyProfile");
            return StatusCode(500, new { error = "An unexpected error occurred." });
        }
    }

    // PUT api/users/my-profile
    [HttpPut("my-profile")]
    public async Task<ActionResult> UpdateMyProfile([FromBody] UpdateMyProfileDTO dto)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            {
                _logger.LogWarning("UpdateMyProfile failed - invalid token");
                return Unauthorized(new { error = "Invalid token." });
            }

            await _userService.UpdateMyProfileAsync(userId, dto);
            return Ok(new { message = "Profile updated successfully." });
        }
        catch (NotFoundException ex)
        {
            _logger.LogWarning(ex.Message);
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in UpdateMyProfile");
            return StatusCode(500, new { error = "An unexpected error occurred." });
        }
    }
    // POST api/users/request-verification
    [HttpPost("request-verification")]
    public async Task<ActionResult> RequestVerification()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            {
                _logger.LogWarning("RequestVerification failed - invalid or missing userId in token");
                return Unauthorized(new { error = "Invalid token." });
            }

            User user = await _userService.GetUserByID(userId);
            if (user == null)
            {
                _logger.LogWarning("RequestVerification failed - user {UserId} not found", userId);
                return NotFound(new { error = "User not found." });
            }
            if (user.EmailConfirmed)
            {
                return BadRequest(new { error = "Email is already confirmed." });
            }

            int code = await _userService.RequestForVerification(userId);
            await _verificationEmailService.SendVerificationEmailAsync(user.Email, user.FullName, code);
            return Ok(new { message = "Verification code sent successfully." });
        }
        catch (NotFoundException ex)
        {
            _logger.LogWarning(ex.Message);
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in RequestVerification");
            return StatusCode(500, new { error = "An unexpected error occurred." });
        }
    }

    // POST api/users/verify-email
    [HttpPost("verify-email")]
    public async Task<ActionResult> VerifyEmail([FromBody] int code)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            {
                _logger.LogWarning("VerifyEmail failed - invalid or missing userId in token");
                return Unauthorized(new { error = "Invalid token." });
            }

            await _userService.VerifyEmail(userId, code);

            return Ok(new { message = "Email verified successfully." });
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
            _logger.LogError(ex, "Unexpected error in VerifyEmail");
            return StatusCode(500, new { error = "An unexpected error occurred." });
        }
    }


}