using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;

namespace NFC_Backend.Repos.Interfaces
{
    public interface IPlanRepo
    {
        public  Task<TenantPlanInformations?> GetTenantPlanInformationsAsync(
      Guid tenantId, CancellationToken ct = default);


        public  Task<List<PlanPricingDto>> GetAvailablePricingPlansAsync(
       int currentPlanId, BillingCycle billingCycle, string toCurrency, CancellationToken ct = default);

        public  Task<PlanQuotaDTo> GetPlanQuotaAsync(int PlanId, Guid TenantId, CancellationToken ct = default);
    }
}
