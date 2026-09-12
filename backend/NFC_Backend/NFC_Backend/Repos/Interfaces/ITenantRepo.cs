using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;

namespace NFC_Backend.Repos.Interfaces
{
    public interface ITenantRepo
    {
        public Task<Tenant?> GetByPhoneNumber(string phoneNumber);
        public  Task<TenantResponse> CreateTenant(CreateTenantDTO createTenant);
        public Task UpdateSetupInfos(Guid Id, string? LogoUrl, string BacketName);
        public Task<bool> IsSubDomainExits(string SubDomaine);

    }
}
