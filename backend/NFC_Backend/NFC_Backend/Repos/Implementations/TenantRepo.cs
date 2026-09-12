using Microsoft.EntityFrameworkCore;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Exceptions;
using NFC_Backend.Infrastructure.Data;
using NFC_Backend.Infrastructure.Tools;
using NFC_Backend.Repos.Interfaces;
using NFC_Backend.Services;

namespace NFC_Backend.Repos.Implementations
{
    public class TenantRepo : ITenantRepo
    {
        private readonly AppDbContext _dbContext;
        private readonly IConfiguration _configuration;

        public TenantRepo(AppDbContext dbContext , IConfiguration configuration)
        {
            _dbContext = dbContext;
            _configuration = configuration;
        }
        public  Task<Tenant?> GetByPhoneNumber(string phoneNumber) => _dbContext.Tenants.Where(t=>t.PhoneNumber
        ==  phoneNumber).FirstOrDefaultAsync ();
        public Task<bool> IsSubDomainExits(string SubDomaine) =>
     _dbContext.Tenants.AnyAsync(t => t.Subdomain.ToLower() == SubDomaine.ToLower());

        public async Task UpdateSetupInfos(Guid Id,string? LogoUrl , string BacketName)
        {
            Tenant tenant =await _dbContext.Tenants.FindAsync(Id);
            tenant.LogoUrl = LogoUrl;
            tenant.BucketName = BacketName;
            await _dbContext.SaveChangesAsync();
        }
        public async Task<TenantResponse> CreateTenant(CreateTenantDTO createTenant)
        {
            var currentDomain = _configuration["AppSettings:BaseDomain"];
            int Days = int.Parse(_configuration["Variable:FreeTrialDays"]);
            string SubDomaine = StringTool.SlugifyRestaurantName(createTenant.RestaurantName) + "." + currentDomain;
            bool IsExist = await IsSubDomainExits(SubDomaine);
            if (IsExist)
            {
                throw new SubDomaineExistExeption();
            }
            Tenant tenant = new Tenant
            {
                Address = createTenant.Address,
                BucketName = null,
                City = createTenant.City,
                CreatedAt = DateTime.UtcNow,
                IsActive = true,
                LogoUrl = null,
                PhoneNumber = createTenant.BusinesPhoneNumber,
                PrimaryColor = createTenant.PrimaryColor,
                RestaurantName = createTenant.RestaurantName,
                Status = TenantStatus.Trial,
                Subdomain = SubDomaine, 
                SubscriptionEndsAt = DateTime.UtcNow.AddDays(Days),
                TrialEndsAt = DateTime.UtcNow.AddDays(Days),
                UpdatedAt = null, 
            };
            await _dbContext.Tenants.AddAsync(tenant);
            await _dbContext.SaveChangesAsync();
            return new TenantResponse(tenant.Id, tenant.Subdomain);
           
        }
    }
}
