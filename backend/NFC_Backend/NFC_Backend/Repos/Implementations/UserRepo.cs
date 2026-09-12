using Microsoft.EntityFrameworkCore;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
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
    }
}
