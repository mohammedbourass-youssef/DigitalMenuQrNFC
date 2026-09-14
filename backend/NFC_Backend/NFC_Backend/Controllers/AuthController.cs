using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Exceptions;
using NFC_Backend.Extensions;
using NFC_Backend.Infrastructure.Tools;
using NFC_Backend.Repos.Implementations;
using NFC_Backend.Repos.Interfaces;
using NFC_Backend.Services;
using System.Security.Claims;

namespace NFC_Backend.Controllers
{
    [Route("api/Auth")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly ILogger<AuthController> _logger;
        private readonly IUserRepo _userRepo;
        private readonly ITenantRepo _tenantRepo;
        private readonly IFileStorageService _fileStorageService;
        private readonly ICookieService _cookieService;
        private readonly IConfiguration _configuration;
        private readonly ITokenService _TokenService;

        public AuthController(
            ILogger<AuthController> logger,
            IUserRepo repo,
            ITenantRepo tenant,
            IFileStorageService fileStorage,
            ICookieService cookieService,
            IConfiguration configuration,
            ITokenService tokenService)
        {
            _logger = logger;
            _userRepo = repo;
            _tenantRepo = tenant;
            _fileStorageService = fileStorage;
            _cookieService = cookieService;
            _configuration = configuration;
            _TokenService = tokenService;
        }

        [HttpPost("register")]
        [EnableRateLimiting(RateLimitingTools.LoginRegisterRateLimit)]

        public async Task<ActionResult<UserResponseDto>> Register([FromForm] RegisterDTO register)
        {
            _logger.LogInformation("Registration attempt for email: {Email}", register.email);
            try
            {
                var existingUser = await _userRepo.GetUserByEmail(register.email);
                if (existingUser != null)
                {
                    _logger.LogWarning("Registration failed - email already exists: {Email}", register.email);
                    return BadRequest(new { error = "A user with this email already exists." });
                }

                var existingTenant = await _tenantRepo.GetByPhoneNumber(register.BusinesPhoneNumber);
                if (existingTenant != null)
                {
                    _logger.LogWarning("Registration failed - phone number already exists: {Phone}", register.BusinesPhoneNumber);
                    return BadRequest(new { error = "A business with this phone number already exists." });
                }

                var newTenant = await _tenantRepo.CreateTenant(
                    new CreateTenantDTO(
                        register.RestaurantName,
                        register.PrimaryColor,
                        register.BusinesPhoneNumber,
                        register.Address,
                        register.City)
                );
                _logger.LogInformation("Tenant created successfully. TenantId: {TenantId}", newTenant.Id);

                var bucket = StringTool.CreateBucketName(newTenant.SubDomaine);
                await _fileStorageService.CreateTenantBucketAsync(bucket);
                _logger.LogInformation("Storage bucket created: {Bucket}", bucket);

                string? filePath = null;
                if (register.Logo != null)
                {
                    filePath = await _fileStorageService.UploadFileAsync(
                        register.Logo.OpenReadStream(),
                        register.Logo.FileName,
                        register.Logo.ContentType,
                        bucket);
                    _logger.LogInformation("Logo uploaded successfully for TenantId: {TenantId}", newTenant.Id);
                }

                await _tenantRepo.UpdateSetupInfos(newTenant.Id, filePath, bucket);

                string refreshToken = _TokenService.GenerateRefreshToken();
                var createUser = new CreateUserDTO
                {
                    DaysToExpire = int.Parse(_configuration["Jwt:RefreshTokenExpiryDays"]
                        ?? throw new InvalidOperationException("Jwt:RefreshTokenExpiryDays not configured.")),
                    Email = register.email,
                    FullName = register.fullName,
                    Password = _TokenService.HashPassword(register.PassWord),
                    RefreshTokenHash = _TokenService.HashPassword(refreshToken),
                    TenantId = newTenant.Id,
                };

                var newUser = await _userRepo.CreateUser(createUser);
                _logger.LogInformation("User created successfully. UserId: {UserId}, TenantId: {TenantId}", newUser.Id, newTenant.Id);

                string accessToken = _TokenService.GenerateAccessToken(newUser);
                _cookieService.SetAuthCookies(
                    accessToken,
                    refreshToken,
                    DateTime.UtcNow.AddMinutes(15),
                    DateTime.UtcNow.AddDays(createUser.DaysToExpire));

                _logger.LogInformation("Registration completed successfully for UserId: {UserId}", newUser.Id);
                return Ok(new UserResponseDto
                {
                    Email = createUser.Email,
                    FullName = createUser.FullName,
                    Id = newUser.Id,
                    RestaurantName = register.RestaurantName,
                    Role = newUser.Role.ToString(),
                    TenantId = newTenant.Id
                });
            }
            catch (SubDomaineExistExeption ex)
            {
                _logger.LogWarning(ex, "Registration failed - subdomain already exists for restaurant: {Name}", register.RestaurantName);
                return Conflict(new { error = "A business with this restaurant name already exists." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during registration for email: {Email}", register.email);
                return StatusCode(StatusCodes.Status500InternalServerError, new { error = "An unexpected error occurred. Please try again later." });
            }
        }

        [HttpPost("login")]
        [EnableRateLimiting(RateLimitingTools.LoginRegisterRateLimit)]
        public async Task<ActionResult<UserResponseDto>> Login([FromBody] LoginDTO login)
        {
            _logger.LogInformation("Login attempt for email: {Email}", login.Email);
            try
            {
                var user = await _userRepo.GetUserByEmail(login.Email);
                if (user == null)
                {
                    _logger.LogWarning("Login failed - user not found: {Email}", login.Email);
                    return Unauthorized(new { error = "Invalid email or password." });
                }

                bool isPasswordValid = _TokenService.VerifyPassword(login.Password, user.PasswordHash);
                if (!isPasswordValid)
                {
                    _logger.LogWarning("Login failed - invalid password for email: {Email}", login.Email);
                    return Unauthorized(new { error = "Invalid email or password." });
                }

                string refreshToken = _TokenService.GenerateRefreshToken();
                int daysToExpire = int.Parse(_configuration["Jwt:RefreshTokenExpiryDays"]
                    ?? throw new InvalidOperationException("Jwt:RefreshTokenExpiryDays not configured."));

                await _userRepo.UpdateRefreshToken(
                    user.Id,
                    _TokenService.HashPassword(refreshToken),
                    daysToExpire);

                string accessToken = _TokenService.GenerateAccessToken(user);
                _cookieService.SetAuthCookies(
                    accessToken,
                    refreshToken,
                    DateTime.UtcNow.AddMinutes(15),
                    DateTime.UtcNow.AddDays(daysToExpire));

                _logger.LogInformation("Login successful for UserId: {UserId}", user.Id);
                return Ok(new UserResponseDto
                {
                    Email = user.Email,
                    FullName = user.FullName,
                    Id = user.Id,
                    RestaurantName = user.Tenant?.RestaurantName,
                    Role = user.Role.ToString(),
                    TenantId = user.TenantId
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during login for email: {Email}", login.Email);
                return StatusCode(StatusCodes.Status500InternalServerError, new { error = "An unexpected error occurred. Please try again later." });
            }
        }

        [HttpPost("logout")]
        [EnableRateLimiting(RateLimitingTools.RefreshRateLimit)]
        public async Task<ActionResult> Logout()
        {
            try
            {
                // 1. Read refresh token from cookie
                var refreshToken = Request.Cookies["refreshToken"];
                if (refreshToken == null)
                {
                    _logger.LogWarning("Logout failed - no refresh token cookie found");
                    return Unauthorized(new { error = "No active session found." });
                }

                // 2. Find user by hashed refresh token in DB
                var user = await _userRepo.GetUserByRefreshToken(
                    _TokenService.HashPassword(refreshToken)
                );
                if (user == null)
                {
                    _logger.LogWarning("Logout failed - refresh token not found in DB");
                    _cookieService.ClearAuthCookies(); // clear anyway for safety
                    return Unauthorized(new { error = "Invalid session." });
                }

                // 3. Check expiry
                if (user.RefreshTokenExpiryTime < DateTime.UtcNow)
                {
                    _logger.LogWarning("Logout called with expired refresh token. UserId: {UserId}", user.Id);
                    _cookieService.ClearAuthCookies(); // clear expired cookies anyway
                    return Unauthorized(new { error = "Session already expired. Please login again." });
                }

                _logger.LogInformation("Logout requested for UserId: {UserId}", user.Id);

                // 4. Invalidate refresh token in DB
                await _userRepo.DeleteUserRefreshToken(user.Id);
                _logger.LogInformation("Refresh token deleted from DB for UserId: {UserId}", user.Id);

                // 5. Clear cookies
                _cookieService.ClearAuthCookies();
                _logger.LogInformation("Auth cookies cleared for UserId: {UserId}", user.Id);

                _logger.LogInformation("Logout successful for UserId: {UserId}", user.Id);
                return Ok(new { message = "Logged out successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during logout");
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { error = "An unexpected error occurred during logout. Please try again." });
            }
        }

        [HttpPost("refresh")]
        [EnableRateLimiting(RateLimitingTools.RefreshRateLimit)]
        public async Task<ActionResult> Refresh()
        {
            try
            {
                // 1. Read refresh token from cookie
                var refreshToken = Request.Cookies["refreshToken"];
                if (refreshToken == null)
                {
                    _logger.LogWarning("Token refresh failed - no refresh token cookie found");
                    return Unauthorized(new { error = "No active session found. Please login again." });
                }

                // 2. Find user by hashed refresh token in DB
                var user = await _userRepo.GetUserByRefreshToken(
                    _TokenService.HashPassword(refreshToken)
                );
                if (user == null)
                {
                    _logger.LogWarning("Token refresh failed - refresh token not found in DB");
                    return Unauthorized(new { error = "Invalid session. Please login again." });
                }

                _logger.LogInformation("Token refresh requested for UserId: {UserId}", user.Id);

                // 3. Check expiry
                if (user.RefreshTokenExpiryTime < DateTime.UtcNow)
                {
                    _logger.LogWarning("Token refresh failed - refresh token expired for UserId: {UserId}", user.Id);
                    _cookieService.ClearAuthCookies();
                    return Unauthorized(new { error = "Session expired. Please login again." });
                }

                // 4. Generate new tokens
                string newAccessToken = _TokenService.GenerateAccessToken(user);
                string newRefreshToken = _TokenService.GenerateRefreshToken();
                _logger.LogInformation("New tokens generated for UserId: {UserId}", user.Id);

                // 5. Update refresh token in DB
                int daysToExpire = int.Parse(
                    _configuration["Jwt:RefreshTokenExpiryDays"]
                    ?? throw new InvalidOperationException("Jwt:RefreshTokenExpiryDays not configured.")
                );

                await _userRepo.UpdateRefreshToken(
                    user.Id,
                    _TokenService.HashPassword(newRefreshToken),
                    daysToExpire
                );
                _logger.LogInformation("Refresh token updated in DB for UserId: {UserId}", user.Id);

                // 6. Set new cookies
                _cookieService.SetAuthCookies(
                    newAccessToken,
                    newRefreshToken,
                    DateTime.UtcNow.AddMinutes(15),
                    DateTime.UtcNow.AddDays(daysToExpire)
                );
                _logger.LogInformation("New auth cookies set for UserId: {UserId}", user.Id);

                _logger.LogInformation("Token refresh completed successfully for UserId: {UserId}", user.Id);
                return Ok(new { message = "Token refreshed successfully." });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogError(ex, "Configuration error during token refresh");
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { error = "Server configuration error. Please contact support." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during token refresh");
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { error = "An unexpected error occurred. Please try again." });
            }
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<ActionResult<UserResponseDto>> Me()
        {
            try
            {
                // 1. Get userId from JWT claims
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
                {
                    _logger.LogWarning("Me failed - invalid or missing userId in token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                // 2. Find user
                var user = await _userRepo.GetUserByID(userId);
                if (user == null)
                {
                    _logger.LogWarning("Me failed - user not found. UserId: {UserId}", userId);
                    return NotFound(new { error = "User not found." });
                }

                // 3. Find tenant
                var tenant = await _tenantRepo.GetByID(user.TenantId ?? Guid.Empty);
                if (tenant == null)
                {
                    _logger.LogWarning("Me failed - tenant not found. TenantId: {TenantId}", user.TenantId);
                    return NotFound(new { error = "Restaurant not found." });
                }

                _logger.LogInformation("Me called successfully. UserId: {UserId}, TenantId: {TenantId}",
                    userId, tenant.Id);

                return Ok(new UserResponseDto
                {
                    Id = userId,
                    Email = user.Email,
                    FullName = user.FullName,
                    RestaurantName = tenant.RestaurantName,
                    Role = user.Role.ToString(),
                    TenantId = tenant.Id
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in Me endpoint");
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { error = "An unexpected error occurred. Please try again." });
            }
        }
    }
}