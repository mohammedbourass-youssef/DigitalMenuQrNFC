using Microsoft.EntityFrameworkCore;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Exceptions;
using NFC_Backend.Infrastructure.Data;
using NFC_Backend.Repos.Interfaces;
using System.Threading.Tasks;

namespace NFC_Backend.Repos.Implementations
{
    public class UserRepo : IUserRepo
    {
        private readonly AppDbContext _dbContext;

        public UserRepo(AppDbContext appContext ) {
            _dbContext = appContext;
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
            await _dbContext.SaveChangesAsync();
            return user; 
        }
        
        public  Task<User?> GetUserByEmail(string Email)
        =>_dbContext.Users.AsNoTracking().Where(u=>u.Email == Email).FirstOrDefaultAsync();
        public Task<User?> GetUserByID(Guid Id)
       => _dbContext.Users.AsNoTracking().Where(u => u.Id == Id).FirstOrDefaultAsync();
        public async Task DeleteUserRefreshToken(Guid Id)
        {
            User user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == Id);
            user.RefreshToken = null;
            user.RefreshTokenExpiryTime = null;
            user.RefreshTokenRevockedAt = DateTime.UtcNow;
            user.IsRevoked = true;

            await _dbContext.SaveChangesAsync();
        }
        public  Task<User?> GetUserByRefreshToken(string HashedRefreshToken)
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
                throw new NotFoundException("User not found.");

            var pendingCodes = user.VerificationCodes
                .Where(v => v.VerificationsStatus == VerificationStatus.Pending)
                .ToList();

            foreach (var v in pendingCodes)
            {
                v.VerificationsStatus = VerificationStatus.Replaced;
            }

            var code = Random.Shared.Next(0, 1000000);

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
                throw new NotFoundException("User not found.");

            var currentCode = user.VerificationCodes
                .Where(v => v.Code == code)
                .OrderByDescending(v => v.CreatedAt)
                .FirstOrDefault();

            if (currentCode == null)
                throw new NotFoundException("Code not found.");

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
