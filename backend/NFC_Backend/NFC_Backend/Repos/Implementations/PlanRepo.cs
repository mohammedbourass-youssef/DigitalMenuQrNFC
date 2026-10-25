using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Infrastructure.Data;
using NFC_Backend.Infrastructure.Tools;
using NFC_Backend.Repos.Interfaces;
using System.Text.Json;

namespace NFC_Backend.Repos.Implementations
{
    public class PlanRepo : IPlanRepo
    {
        private static readonly DistributedCacheEntryOptions CacheOptions = new()
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)
        };  
        private readonly AppDbContext _db;
        private readonly IDistributedCache _cache;
        private readonly ILogger<PlanRepo> _logger;


        public PlanRepo(AppDbContext db , IDistributedCache cache, ILogger<PlanRepo> logger)
        {
            _db = db;
            _cache = cache;
            _logger = logger;
        }

        public async Task<TenantPlanInformations?> GetTenantPlanInformationsAsync(
       Guid tenantId, CancellationToken ct = default)
        {
            // 1) Everything numeric is computed in SQL (one round trip, no Include needed)
            var raw = await _db.Tenants
                .AsNoTracking()
                .Where(t => t.Id == tenantId && t.IsActive)
                .Select(t => new
                {
                    t.Id,
                    t.RestaurantName,
                    t.BillingCycle,
                    t.PlanStartedAt,
                    t.SubscriptionEndsAt,

                    PlanName = t.Plan.Name,
                    t.Plan.Description,
                    t.Plan.IsFree,
                    t.Plan.MaxCategories,
                    t.Plan.MaxMenuItems,
                    t.Plan.MaxTables,
                    t.Plan.MaxUsers,
                    t.Plan.MaxLanguages,
                    t.Plan.MaxImagesPerMenuItem,

                    // Same rule as PlanLimitService: count everything, no IsActive/IsAvailable filter
                    Categories = _db.Categories.Count(c => c.TenantId == t.Id),
                    MenuItems = _db.MenuItems.Count(m => m.TenantId == t.Id),
                    Tables = _db.Tables.Count(x => x.TenantId == t.Id),
                    Users = _db.Users.Count(u => u.TenantId == t.Id),
                })
                .FirstOrDefaultAsync(ct);

            if (raw is null) return null;

            // 2) Formatting happens in memory
            return new TenantPlanInformations
            {
                TenantId = raw.Id,
                TenantName = raw.RestaurantName,
                PlanName = raw.PlanName,
                Description = raw.Description,
                IsFree = raw.IsFree,
                BillingCycle = raw.BillingCycle,
                StartAtUTC = raw.PlanStartedAt,
                ExpiresATutc = raw.SubscriptionEndsAt,

                UsedCategoriesFromTotal = FormatUsage(raw.Categories, raw.MaxCategories),
                UsedMenuItemsFromTotal = FormatUsage(raw.MenuItems, raw.MaxMenuItems),
                UsedTablesFromTotal = FormatUsage(raw.Tables, raw.MaxTables),
                UsedUsersFromTotal = FormatUsage(raw.Users, raw.MaxUsers),
                UsedLanguagesTotal = /*raw.MaxLanguages == */ "Unlimited" ,// $"{raw.MaxLanguages}",
                MaxImagesPerMenu = raw.MaxImagesPerMenuItem,
            };
        }




        public async Task<List<PlanPricingDto>> GetAvailablePricingPlansAsync(
         int currentPlanId, BillingCycle billingCycle, string toCurrency, CancellationToken ct = default)
        {
            var plans = await _db.Plans
                .AsNoTracking()
                .Where(p => p.IsActive)
                .OrderBy(p => p.DisplayOrder)
                .ToListAsync(ct);

            var currentOrder = plans.FirstOrDefault(p => p.Id == currentPlanId)?.DisplayOrder ?? int.MinValue;

            // One query for all rates: plan currency -> toCurrency
            var sourceCurrencies = plans.Select(p => p.CurrencyCode)
                                        .Where(c => c != toCurrency)
                                        .Distinct()
                                        .ToList();

            var rates = await _db.ExchangeRates
                .AsNoTracking()
                .Where(r => r.TargetCurrency == toCurrency && sourceCurrencies.Contains(r.BaseCurrency))
                .ToDictionaryAsync(r => r.BaseCurrency, r => r.Rate, ct);

            decimal GetRate(string from)
            {
                if (from == toCurrency) return 1m;
                if (rates.TryGetValue(from, out var rate)) return rate;
                throw new InvalidOperationException($"No exchange rate from {from} to {toCurrency}.");
            }

            return plans.Select(p =>
            {
                var rate = GetRate(p.CurrencyCode);

                var basePrice = p.IsFree ? 0m
                    : billingCycle == BillingCycle.Yearly ? p.PricePerYear : p.PricePerMonth;

                int? savings = null;
                if (p.PricePerMonth > 0 && p.PricePerYear > 0)
                {
                    var pct = (int)Math.Round((1 - p.PricePerYear / (p.PricePerMonth * 12)) * 100);
                    savings = pct > 0 ? pct : null;
                }

                return new PlanPricingDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Description = p.Description,
                    IsFree = p.IsFree,
                   
                    Price = Math.Round(basePrice * rate, 2),           
                    YearlySavingsPercent = savings,
                    DisplayOrder = p.DisplayOrder,
                    IsCurrent = p.Id == currentPlanId,
                    CanUpgrade = p.Id != currentPlanId && p.DisplayOrder > currentOrder,
                    MaxUsers = p.MaxUsers,
                    MaxCategories = p.MaxCategories,
                    MaxMenuItems = p.MaxMenuItems,
                    MaxTables = p.MaxTables,
                    MaxImagesPerMenuItem = p.MaxImagesPerMenuItem,
                    MaxLanguages = p.MaxLanguages
                };
            }).ToList();
        }

        public async Task<Plan?> GetPlanByIdNoTrackingAsync(int planId, CancellationToken ct = default)
        {
            var key = RedisKeysHelpers.PlanKey(planId);

            // 1) Try Redis (fail open: if Redis is down, fall back to the DB)
            try
            {
                var cached = await _cache.GetStringAsync(key, ct);
                if (cached != null)
                    return JsonSerializer.Deserialize<Plan>(cached);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "Redis read failed for {Key}, falling back to DB.", key);
            }

            // 2) DB
            var plan = await _db.Plans
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == planId && p.IsActive, ct);

            if (plan == null) return null; // don't cache misses

            // 3) Store in Redis
            try
            {
                await _cache.SetStringAsync(key, JsonSerializer.Serialize(plan), CacheOptions, ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "Redis write failed for {Key}.", key);
            }

            return plan;
        }

        /// Call this whenever a plan is created, updated, deactivated or deleted (SuperAdmin side).
        public Task InvalidatePlanCacheAsync(int planId ,CancellationToken ct = default)
            => _cache.RemoveAsync(RedisKeysHelpers.PlanKey(planId), ct);

        public async Task<PlanQuotaDTo?> GetPlanQuotaAsync(int planId, Guid tenantId, CancellationToken ct = default)
        {
            var raw = await _db.Plans
                .AsNoTracking()
                .Where(p => p.Id == planId && p.IsActive)
                .Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.MaxCategories,
                    p.MaxMenuItems,
                    p.MaxTables,
                    p.MaxUsers,
                    p.MaxImagesPerMenuItem,
                    Categories = _db.Categories.Count(c => c.TenantId == tenantId),
                    MenuItems = _db.MenuItems.Count(m => m.TenantId == tenantId),
                    Tables = _db.Tables.Count(t => t.TenantId == tenantId),
                    Users = _db.Users.Count(u => u.TenantId == tenantId),
                })
                .FirstOrDefaultAsync(ct);                       // <-- ct was missing

            if (raw is null) return null;

            return new PlanQuotaDTo
            {
                Id = raw.Id,
                Name = raw.Name,
                Categories = new() { Used = raw.Categories, Max = raw.MaxCategories },
                MenuItems = new() { Used = raw.MenuItems, Max = raw.MaxMenuItems },
                Tables = new() { Used = raw.Tables, Max = raw.MaxTables },
                Users = new() { Used = raw.Users, Max = raw.MaxUsers },
                MaxImagesPerMenuItem = raw.MaxImagesPerMenuItem,
            };
        }



        //public async Task<PlanQuotaDTo?> GetPlanQuotaAsync(int planId, Guid tenantId, CancellationToken ct = default)
        //{
        //    var key =RedisKeysHelpers.QuotaKey(tenantId);

        //    try
        //    {
        //        var cached = await _cache.GetStringAsync(key, ct);
        //        if (cached is not null)
        //            return JsonSerializer.Deserialize<PlanQuotaDTo>(cached);
        //    }
        //    catch (Exception ex) when (ex is not OperationCanceledException)
        //    {
        //        _logger.LogWarning(ex, "Redis read failed for {Key}, falling back to DB.", key);
        //    }

        //    var quota = await LoadQuotaFromDbAsync(planId, tenantId, ct);
        //    if (quota is null) return null;

        //    try
        //    {
        //        await _cache.SetStringAsync(key, JsonSerializer.Serialize(quota),
        //            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5) }, ct);
        //    }
        //    catch (Exception ex) when (ex is not OperationCanceledException)
        //    {
        //        _logger.LogWarning(ex, "Redis write failed for {Key}.", key);
        //    }

        //    return quota;
        //}

        public async Task InvalidateQuotaAsync(Guid tenantId)
        {
            try { await _cache.RemoveAsync(RedisKeysHelpers.QuotaKey(tenantId)); }
            catch (Exception ex) { _logger.LogWarning(ex, "Redis invalidate failed for tenant {TenantId}.", tenantId); }
        }

        //private static string FormatUsage(int used, int max)
        //    => max == Plan.Unlimited ? $"{used}/∞" : $"{used}/{max}";

        private static string FormatUsage(int used, int max)
            =>  $"{used}/{max}";
    }
}
