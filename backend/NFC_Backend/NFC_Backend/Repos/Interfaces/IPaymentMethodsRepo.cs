using NFC_Backend.Domain.DTOS;

namespace NFC_Backend.Repos.Interfaces
{
    public enum PaymentMethodResult
    {
        Success,
        NotFound,
        Duplicate,              // method already added for this tenant
        InvalidSystemMethod,    // system method doesn't exist or is inactive
        LastEnabledMethod,      // can't disable the only enabled method
        InvalidOrder            // reorder list doesn't match tenant's methods
    }

    public interface IPaymentMethodsRepo
    {
        // ── Reads ────────────────────────────────────────────
        Task<List<SystemPaymentMethodDto>> GetSystemMethodsAsync(Guid tenantId, string lang, CancellationToken ct);
        Task<List<TenantPaymentMethodDto>> GetTenantMethodsAsync(Guid tenantId, string lang, bool onlyEnabled, CancellationToken ct);
        Task<TenantPaymentMethodDto?> GetByIdAsync(Guid tenantId, int id, string lang, CancellationToken ct);

        // ── Writes ───────────────────────────────────────────
        Task<(PaymentMethodResult Result, int Id)> AddAsync(Guid tenantId, AddTenantPaymentMethodRequest request, CancellationToken ct);
        Task<PaymentMethodResult> UpdateAsync(Guid tenantId, int id, UpdateTenantPaymentMethodRequest request, CancellationToken ct);
        Task<PaymentMethodResult> SetEnabledAsync(Guid tenantId, int id, bool isEnabled, CancellationToken ct);
        Task<PaymentMethodResult> SetDefaultAsync(Guid tenantId, int id, CancellationToken ct);
        Task<PaymentMethodResult> ReorderAsync(Guid tenantId, List<int> orderedIds, CancellationToken ct);
        Task<PaymentMethodResult> DeleteAsync(Guid tenantId, int id, CancellationToken ct);
    }
}
