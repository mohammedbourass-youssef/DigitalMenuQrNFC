using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Exceptions;
using NFC_Backend.Extensions;
using NFC_Backend.Repos.Interfaces;
using NFC_Backend.Services;
using System.Security.Claims;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserRepo _userService;
    private readonly ILogger<UsersController> _logger;
    IVerificationEmailService _verificationEmailService;

    public UsersController(IUserRepo userService, ILogger<UsersController> logger ,IVerificationEmailService verificationEmailService)
    {
        _userService = userService;
        _logger = logger;
        _verificationEmailService = verificationEmailService;
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