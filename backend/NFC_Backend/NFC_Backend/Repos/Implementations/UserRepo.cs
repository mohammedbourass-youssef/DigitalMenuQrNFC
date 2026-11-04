using Microsoft.EntityFrameworkCore;
using NFC_Backend.Domain.Constants;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Exceptions;
using NFC_Backend.Infrastructure.Data;
using NFC_Backend.Repos.Interfaces;
using NFC_Backend.Services;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace NFC_Backend.Repos.Implementations
{
    public class UserRepo : IUserRepo
    {
        private readonly AppDbContext _dbContext;
        private readonly ITokenService _tokenService;

        public UserRepo(AppDbContext appContext, ITokenService tokenService)
        {
            _dbContext = appContext;
            _tokenService = tokenService;
        }

        public async Task<User> CreateUser(CreateUserDTO createUser)
        {
            User user = new User
            {
                CreatedAt = DateTime.UtcNow,
                Email = createUser.Email,
                EmailConfirmed = false,
                FullName = createUser.FullName,
                IsActive = true,
                LastLoginAt = DateTime.UtcNow,
                PasswordHash = createUser.Password,
                RefreshToken = createUser.RefreshTokenHash,
                RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(createUser.DaysToExpire),
                Role = UserRole.TenantOwner,
                TenantId = createUser.TenantId,
                UpdatedAt = null,
                IsRevoked = false,
                RefreshTokenRevockedAt = null,
            };

            await _dbContext.Users.AddAsync(user);
            await _dbContext.UserRoles.AddAsync(new TenantUserRole
            {
                RoleId = RoleIds.TenantAdmin,
                UserId = user.Id
            });
            await _dbContext.SaveChangesAsync();
            return user;
        }

        public Task<User?> GetUserByEmail(string Email)
        => _dbContext.Users.AsNoTracking().Where(u => u.Email == Email).Include(t => t.Tenant).FirstOrDefaultAsync();

        public Task<User?> GetUserByID(Guid Id)
        => _dbContext.Users.AsNoTracking().Where(u => u.Id == Id).FirstOrDefaultAsync();

        public async Task<PagedUserListDTO> GetTenantUsersAsync(
            Guid tenantId,
            UserListRequest request,
            CancellationToken ct = default)
        {
            var page = Math.Clamp(request.Page, 1, int.MaxValue);
            var pageSize = Math.Clamp(request.PageSize, 1, 100);

            var query = _dbContext.Users
                .AsNoTracking()
                .Where(user => user.TenantId == tenantId);

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var term = request.Search.Trim();
                query = query.Where(user =>
                    user.FullName.Contains(term) ||
                    user.Email.Contains(term));
            }

            if (request.Status == "active")
                query = query.Where(user => user.IsActive);
            else if (request.Status == "inactive")
                query = query.Where(user => !user.IsActive);

            if (request.Verification == "verified")
                query = query.Where(user => user.EmailConfirmed);
            else if (request.Verification == "unverified")
                query = query.Where(user => !user.EmailConfirmed);

            var total = await query.CountAsync(ct);

            var direction = (request.SortDirection ?? "asc").ToLowerInvariant();
            query = (request.SortKey ?? "name", direction) switch
            {
                ("lastLogin", "desc") => query.OrderByDescending(user => user.LastLoginAt),
                ("lastLogin", _) => query.OrderBy(user => user.LastLoginAt),
                ("createdAt", "desc") => query.OrderByDescending(user => user.CreatedAt),
                ("createdAt", _) => query.OrderBy(user => user.CreatedAt),
                ("name", "desc") => query.OrderByDescending(user => user.FullName),
                _ => query.OrderBy(user => user.FullName)
            };

            var pageUsers = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(user => new
                {
                    user.Id,
                    user.FullName,
                    user.Email,
                    user.Role,
                    user.IsActive,
                    user.EmailConfirmed,
                    user.LastLoginAt,
                    user.CreatedAt
                })
                .ToListAsync(ct);

            var userIds = pageUsers.Select(user => user.Id).ToList();

            var roleInfos = await _dbContext.UserRoles
                .AsNoTracking()
                .Where(userRole =>
                    userIds.Contains(userRole.UserId) &&
                    userRole.Role.TenantId == tenantId &&
                    !userRole.Role.IsSystem)
                .Select(userRole => new
                {
                    userRole.UserId,
                    RoleName = userRole.Role.Name,
                    RoleId = userRole.RoleId
                })
                .ToListAsync(ct);

            var rolesByUser = roleInfos
                .GroupBy(r => r.UserId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var pageCount = total == 0 ? 1 : (int)Math.Ceiling((double)total / pageSize);

            return new PagedUserListDTO
            {
                Items = pageUsers.Select(row => new UserListItemDTO
                {
                    Id = row.Id,
                    FullName = row.FullName,
                    Email = row.Email,
                    SystemRole = row.Role.ToString(),
                    RoleId = rolesByUser.TryGetValue(row.Id, out var infos)
                        ? infos.First().RoleId
                        : Guid.Empty,
                    RoleNames = rolesByUser.TryGetValue(row.Id, out var infos2)
                        ? infos2.Select(i => i.RoleName).ToList()
                        : new List<string>(),
                    IsActive = row.IsActive,
                    EmailConfirmed = row.EmailConfirmed,
                    LastLoginAt = row.LastLoginAt,
                    CreatedAtUTC = row.CreatedAt
                }).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize,
                PageCount = pageCount
            };
        }

        public async Task<List<TenantRoleDTO>> GetTenantRolesAsync(
            Guid tenantId,
            CancellationToken ct = default)
        {
            return await _dbContext.Roles
                .AsNoTracking()
                .Where(role => role.TenantId == tenantId && !role.IsSystem)
                .OrderBy(role => role.Name)
                .Select(role => new TenantRoleDTO
                {
                    Id = role.Id,
                    Name = role.Name,
                    Description = role.Description
                })
                .ToListAsync(ct);
        }

        public async Task<CreateTenantUserResponse> CreateTenantUserAsync(
            CreateTenantUserRequest request,
            Guid tenantId,
            CancellationToken ct = default)
        {
            var email = request.Email.Trim();
            var existing = await _dbContext.Users
                .AnyAsync(user => user.Email == email && user.TenantId == tenantId, ct);

            if (existing)
                throw new BadRequestException("A user with this email already exists.");

            var role = await _dbContext.Roles
                .FirstOrDefaultAsync(role => role.Id == request.RoleId && role.TenantId == tenantId && !role.IsSystem, ct);

            if (role is null)
                throw new BadRequestException("Invalid role.");

            var password = string.IsNullOrWhiteSpace(request.Password)
                ? GenerateTemporaryPassword()
                : request.Password.Trim();

            var user = new User
            {
                Id = Guid.NewGuid(),
                CreatedAt = DateTime.UtcNow,
                Email = email,
                EmailConfirmed = false,
                FullName = request.FullName.Trim(),
                IsActive = true,
                LastLoginAt = null,
                PasswordHash = _tokenService.HashPassword(password),
                RefreshToken = null,
                RefreshTokenExpiryTime = null,
                RefreshTokenRevockedAt = null,
                Role = UserRole.TenantStaff,
                TenantId = tenantId,
                UpdatedAt = null,
                IsRevoked = false,
            };

            await _dbContext.Users.AddAsync(user);
            await _dbContext.UserRoles.AddAsync(new TenantUserRole
            {
                RoleId = role.Id,
                UserId = user.Id
            });
            await _dbContext.SaveChangesAsync(ct);

            return new CreateTenantUserResponse
            {
                Id = user.Id,
                TemporaryPassword = string.IsNullOrWhiteSpace(request.Password) ? password : null
            };
        }

        public async Task<UpdateTenantUserResponse> UpdateTenantUserAsync(
            Guid userId,
            UpdateTenantUserRequest request,
            Guid tenantId,
            CancellationToken ct = default)
        {
            var user = await _dbContext.Users
                .FirstOrDefaultAsync(u => u.Id == userId && u.TenantId == tenantId, ct);

            if (user is null)
                throw new NotFoundException("User not found.");

            var email = request.Email.Trim();
            var emailTaken = await _dbContext.Users
                .AnyAsync(u => u.Email == email && u.TenantId == tenantId && u.Id != userId, ct);

            if (emailTaken)
                throw new BadRequestException("A user with this email already exists.");

            var role = await _dbContext.Roles
                .FirstOrDefaultAsync(r => r.Id == request.RoleId && r.TenantId == tenantId && !r.IsSystem, ct);

            if (role is null)
                throw new BadRequestException("Invalid role.");

            user.FullName = request.FullName.Trim();
            user.Email = email;
            user.Role = UserRole.TenantStaff;
            user.UpdatedAt = DateTime.UtcNow;

            if (!string.IsNullOrWhiteSpace(request.Password))
                user.PasswordHash = _tokenService.HashPassword(request.Password.Trim());

            await _dbContext.SaveChangesAsync(ct);

            await UpdateUserRoleAsync(userId, role.Id, ct);

            return new UpdateTenantUserResponse { Id = user.Id };
        }

        public async Task DeleteTenantUserAsync(
            Guid userId,
            Guid tenantId,
            CancellationToken ct = default)
        {
            var user = await _dbContext.Users
                .FirstOrDefaultAsync(u => u.Id == userId && u.TenantId == tenantId, ct);

            if (user is null)
                throw new NotFoundException("User not found.");

            user.IsActive = false;
            user.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(ct);
        }

        private async Task UpdateUserRoleAsync(Guid userId, Guid roleId, CancellationToken ct)
        {
            var existing = await _dbContext.UserRoles
                .FirstOrDefaultAsync(ur => ur.UserId == userId, ct);

            if (existing is null)
            {
                await _dbContext.UserRoles.AddAsync(new TenantUserRole
                {
                    RoleId = roleId,
                    UserId = userId
                }, ct);
            }
            else
            {
                existing.RoleId = roleId;
                _dbContext.UserRoles.Update(existing);
            }

            await _dbContext.SaveChangesAsync(ct);
        }

        private static string GenerateTemporaryPassword()
        {
            const string chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
            using var rng = RandomNumberGenerator.Create();
            var buffer = new byte[12];
            rng.GetBytes(buffer);
            var result = new StringBuilder(12);
            foreach (var b in buffer)
                result.Append(chars[b % chars.Length]);
            return result.ToString();
        }

        public async Task DeleteUserRefreshToken(Guid Id)
        {
            User user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == Id);
            user.RefreshToken = null;
            user.RefreshTokenExpiryTime = null;
            user.RefreshTokenRevockedAt = DateTime.UtcNow;
            user.IsRevoked = true;

            await _dbContext.SaveChangesAsync();
        }

        public Task<User?> GetUserByRefreshToken(string HashedRefreshToken)
        => _dbContext.Users.FirstOrDefaultAsync(u => u.RefreshToken == HashedRefreshToken);

        public async Task UpdateRefreshToken(Guid Id, string NewRefreshToken, int DaysToExpire)
        {
            User user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == Id);
            user.RefreshToken = NewRefreshToken;
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(DaysToExpire);
            user.RefreshTokenRevockedAt = null;
            user.IsRevoked = false;

            await _dbContext.SaveChangesAsync();
        }

        public async Task UpdateLastLoginAt(Guid Id)
        {
            User user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == Id);
            user.LastLoginAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();
        }

        public async Task<MyProfileResponse> GetMyProfileAsync(Guid userId)
        {
            var user = await _dbContext.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new NotFoundException("User not found.");
            }

            return new MyProfileResponse(
                Id: user.Id,
                FullName: user.FullName,
                Email: user.Email,
                Role: user.Role.ToString(),
                IsActive: user.IsActive,
                EmailConfirmed: user.EmailConfirmed,
                LastLoginAt: user.LastLoginAt,
                CreatedAt: user.CreatedAt
            );
        }

        public async Task UpdateMyProfileAsync(Guid userId, UpdateMyProfileDTO dto)
        {
            var user = await _dbContext.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new NotFoundException("User not found.");
            }

            user.FullName = dto.FullName;
            user.UpdatedAt = DateTime.UtcNow;

            _dbContext.Users.Update(user);
            await _dbContext.SaveChangesAsync();
        }

        public async Task<int> RequestForVerification(Guid userId)
        {
            var user = await _dbContext.Users
                .Include(u => u.VerificationCodes)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new NotFoundException("User not found.");
            }

            var pendingCodes = user.VerificationCodes
                .Where(v => v.VerificationsStatus == VerificationStatus.Pending)
                .ToList();

            foreach (var v in pendingCodes)
            {
                v.VerificationsStatus = VerificationStatus.Replaced;
            }

            var code = Random.Shared.Next(100000, 1000000);
            var verification = new VerificationCode
            {
                UserId = userId,
                VerificationsStatus = VerificationStatus.Pending,
                Code = code,
                CreatedAt = DateTime.UtcNow,
                ExpiredAt = DateTime.UtcNow.AddMinutes(2),
            };

            _dbContext.VerificationCodes.Add(verification);
            await _dbContext.SaveChangesAsync();
            return code;
        }

        public async Task VerifyEmail(Guid userId, int code)
        {
            var user = await _dbContext.Users
                .Include(u => u.VerificationCodes)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new NotFoundException("User not found.");
            }

            var currentCode = user.VerificationCodes
                .Where(v => v.Code == code)
                .OrderByDescending(v => v.CreatedAt)
                .FirstOrDefault();

            if (currentCode == null)
            {
                throw new NotFoundException("Code not found.");
            }

            switch (currentCode.VerificationsStatus)
            {
                case VerificationStatus.Verified:
                    throw new BadRequestException("This code has already been used.");

                case VerificationStatus.Replaced:
                    throw new BadRequestException("This code is no longer valid. Please request a new one.");

                case VerificationStatus.Deprecated:
                    throw new BadRequestException("This code has expired. Please request a new one.");

                case VerificationStatus.Pending:
                    break;

                default:
                    throw new BadRequestException("Invalid code status.");
            }

            if (currentCode.ExpiredAt < DateTime.UtcNow)
            {
                currentCode.VerificationsStatus = VerificationStatus.Deprecated;
                await _dbContext.SaveChangesAsync();
                throw new BadRequestException("This code has expired. Please request a new one.");
            }

            currentCode.VerificationsStatus = VerificationStatus.Verified;
            user.EmailConfirmed = true;

            await _dbContext.SaveChangesAsync();
        }
    }
}
