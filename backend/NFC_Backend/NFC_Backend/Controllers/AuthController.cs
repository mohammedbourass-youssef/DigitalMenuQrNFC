using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Exceptions;
using NFC_Backend.Extensions;
using NFC_Backend.Infrastructure.Tools;
using NFC_Backend.Repos.Implementations;
using NFC_Backend.Repos.Interfaces;
using NFC_Backend.Services;

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

        //[HttpPost("login")]
        //public async Task<ActionResult<UserResponseDto>> Login([FromBody] LoginDTO login)
        //{
        //    _logger.LogInformation("Login attempt for email: {Email}", login.Email);
        //    try
        //    {
        //        var user = await _userRepo.GetUserByEmail(login.Email);
        //        if (user == null)
        //        {
        //            _logger.LogWarning("Login failed - user not found: {Email}", login.Email);
        //            return Unauthorized(new { error = "Invalid email or password." });
        //        }

        //        bool isPasswordValid = _TokenService.VerifyPassword(login.Password, user.Password);
        //        if (!isPasswordValid)
        //        {
        //            _logger.LogWarning("Login failed - invalid password for email: {Email}", login.Email);
        //            return Unauthorized(new { error = "Invalid email or password." });
        //        }

        //        string refreshToken = _TokenService.GenerateRefreshToken();
        //        int daysToExpire = int.Parse(_configuration["Jwt:RefreshTokenExpiryDays"]
        //            ?? throw new InvalidOperationException("Jwt:RefreshTokenExpiryDays not configured."));

        //        await _userRepo.UpdateRefreshToken(
        //            user.Id,
        //            _TokenService.HashPassword(refreshToken),
        //            DateTime.UtcNow.AddDays(daysToExpire));

        //        string accessToken = _TokenService.GenerateAccessToken(user);
        //        _cookieService.SetAuthCookies(
        //            accessToken,
        //            refreshToken,
        //            DateTime.UtcNow.AddMinutes(15),
        //            DateTime.UtcNow.AddDays(daysToExpire));

        //        _logger.LogInformation("Login successful for UserId: {UserId}", user.Id);
        //        return Ok(new UserResponseDto
        //        {
        //            Email = user.Email,
        //            FullName = user.FullName,
        //            Id = user.Id,
        //            RestaurantName = user.Tenant?.RestaurantName,
        //            Role = user.Role.ToString(),
        //            TenantId = user.TenantId
        //        });
        //    }
        //    catch (Exception ex)
        //    {
        //        _logger.LogError(ex, "Unexpected error during login for email: {Email}", login.Email);
        //        return StatusCode(StatusCodes.Status500InternalServerError, new { error = "An unexpected error occurred. Please try again later." });
        //    }
        //}

        //[HttpPost("logout")]
        //public ActionResult Logout()
        //{
        //    _logger.LogInformation("Logout requested");
        //    _cookieService.ClearAuthCookies();
        //    _logger.LogInformation("Logout successful");
        //    return Ok(new { message = "Logged out successfully." });
        //}
    }
}