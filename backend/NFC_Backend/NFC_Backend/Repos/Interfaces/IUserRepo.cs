using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;

namespace NFC_Backend.Repos.Interfaces
{
    public interface IUserRepo
    {
        public  Task<User> CreateUser(CreateUserDTO createUser);
        public Task<User?> GetUserByEmail(string Email);

        public  Task DeleteUserRefreshToken(Guid Id);
        public  Task UpdateRefreshToken(Guid Id , string NewRefreshToken , int DaysToExpire);
        public  Task UpdateLastLoginAt(Guid Id);
        public  Task<User?> GetUserByRefreshToken(string HashedRefreshToken);
        public Task<User?> GetUserByID(Guid Id);
        public Task<List<TenantRoleDTO>> GetTenantRolesAsync(Guid tenantId, CancellationToken ct = default);
        public Task<PagedUserListDTO> GetTenantUsersAsync(
            Guid tenantId,
            UserListRequest request,
            CancellationToken ct = default);
        public Task<CreateTenantUserResponse> CreateTenantUserAsync(
            CreateTenantUserRequest request,
            Guid tenantId,
            CancellationToken ct = default);

        public Task<UpdateTenantUserResponse> UpdateTenantUserAsync(
            Guid userId,
            UpdateTenantUserRequest request,
            Guid tenantId,
            CancellationToken ct = default);

        public Task DeleteTenantUserAsync(
            Guid userId,
            Guid tenantId,
            CancellationToken ct = default);

        public  Task UpdateMyProfileAsync(Guid userId, UpdateMyProfileDTO dto);
        public Task<MyProfileResponse> GetMyProfileAsync(Guid userId);
        public Task<int> RequestForVerification(Guid userId);
        public Task VerifyEmail(Guid userId, int code);
    }
}
