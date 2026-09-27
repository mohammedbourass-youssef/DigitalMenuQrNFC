using Microsoft.EntityFrameworkCore;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Exceptions;
using NFC_Backend.Infrastructure.Data;
using NFC_Backend.Infrastructure.Tools;
using NFC_Backend.Migrations;
using NFC_Backend.Repos.Interfaces;
using NFC_Backend.Services;

namespace NFC_Backend.Repos.Implementations
{
    public class TenantRepo : ITenantRepo
    {
        private readonly AppDbContext _dbContext;
        private readonly IConfiguration _configuration;
        private readonly IFileStorageService _fileStorageService;
        public TenantRepo(AppDbContext dbContext , IConfiguration configuration , IFileStorageService fileStorageService)
        {
            _dbContext = dbContext;
            _configuration = configuration;
            _fileStorageService = fileStorageService;
        }
        public Task<Tenant?> GetByIDTracking(Guid Id) => _dbContext.Tenants.Where(t => t.Id
       == Id).FirstOrDefaultAsync();
        public Task<Tenant?> GetByID(Guid Id) => _dbContext.Tenants.AsNoTracking().Where(t => t.Id
        == Id).FirstOrDefaultAsync();
        public Task<Tenant?> GetTenantInfosByID(Guid Id) => _dbContext
            .Tenants.AsNoTracking()
            .Where(t => t.Id== Id)
            .Include(t=>t.Currency)
            .FirstOrDefaultAsync();
        public  Task<Tenant?> GetByPhoneNumber(string phoneNumber) => _dbContext.Tenants.AsNoTracking().Where(t=>t.PhoneNumber
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
            string SubDomaine = StringTool.SlugifyRestaurantName(createTenant.RestaurantName);
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
                CurrencyCode = "MAD"
            };
            await _dbContext.Tenants.AddAsync(tenant);
            await _dbContext.SaveChangesAsync();
            return new TenantResponse(tenant.Id, $"{tenant.Subdomain}.{currentDomain}" );
        }

        public async Task<MyRestaurantInfosResponse> GetMyRestaurantInfosAsync(Guid userId)
        {
            var currentDomain = _configuration["AppSettings:BaseDomain"];
            // 1. Find the user
            var user = await _dbContext.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new NotFoundException($"User not found.");
            }

            if (user.TenantId == null)
            {
                throw new NotFoundException($"No restaurant associated with this user.");
            }

            // 2. Find the tenant
            var tenant = await _dbContext.Tenants
                .FirstOrDefaultAsync(t => t.Id == user.TenantId);

            if (tenant == null)
            {
                throw new NotFoundException($"Restaurant not found.");
            }

            // 3. Check if still in free trial
            bool isInFreeTrial = tenant.Status == TenantStatus.Trial
                              && tenant.TrialEndsAt.HasValue
                              && tenant.TrialEndsAt.Value > DateTime.UtcNow;

            // 4. Return response
            return new MyRestaurantInfosResponse(
                RestaurantName: tenant.RestaurantName,
                Subdomain: $"{tenant.Subdomain}.{currentDomain}" ,
                LogoUrl:await _fileStorageService.GetFileUrlAsync(tenant.LogoUrl , tenant.BucketName ),
                PrimaryColor: tenant.PrimaryColor,
                PhoneNumber: tenant.PhoneNumber,
                Address: tenant.Address,
                City: tenant.City,
                Status: tenant.Status.ToString(),
                CurrencyCode: tenant.CurrencyCode,
                CreatedAt: tenant.CreatedAt,
                TrialEndsAt: isInFreeTrial ? tenant.TrialEndsAt : null,
                IsInFreeTrial: isInFreeTrial,
                SubscriptionEndsAt: tenant.SubscriptionEndsAt
            );
        }

        public async Task SaveUpdate(Tenant tenant)
        {
            _dbContext.Tenants.Update(tenant); 
            await _dbContext.SaveChangesAsync();
        }
    }
}
