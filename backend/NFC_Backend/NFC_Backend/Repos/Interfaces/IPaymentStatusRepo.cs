using NFC_Backend.Domain.Entities;

namespace NFC_Backend.Repos.Interfaces
{
    public interface IPaymentStatusRepo
    {
        Task<List<PaymentStatus>> GetAllAsync(bool includeInactive, CancellationToken ct = default);
        Task<PaymentStatus?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<PaymentStatus?> GetByCodeAsync(string code, CancellationToken ct = default);
        Task<bool> CodeExistsAsync(string code, int? excludeId = null, CancellationToken ct = default);
     //   Task<bool> IsInUseAsync(int id, CancellationToken ct = default);

        Task AddAsync(PaymentStatus status, CancellationToken ct = default);
        Task ReplaceTranslationsAsync(PaymentStatus status, IEnumerable<PaymentStatusTranslation> translations, CancellationToken ct = default);
        void Remove(PaymentStatus status);

        /// Makes sure Paid and NotPaid always exist (call at startup).
        Task EnsureDefaultsAsync(CancellationToken ct = default);

        Task SaveChangesAsync(CancellationToken ct = default);
    }
}
