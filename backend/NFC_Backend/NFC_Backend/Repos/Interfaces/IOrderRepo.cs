using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Repos.Implementations;

namespace NFC_Backend.Repos.Interfaces
{
    public interface IOrderRepo
    {
        public  Task<int> CreateNewStatusAsync(OrderStatus status);
        public Task SaveTransaltions(List<OrderStatusTranslation> translations);
        Task<List<OrderStatusDto>> GetStatusesAsync(
    Guid tenantId,
    string lang,
    CancellationToken ct = default);
        Task<OrderStatus?> GetStatusByIdAsync(int id, CancellationToken ct = default);

        /// Checks active statuses of this tenant + global ones, case-insensitive, optionally excluding one id.
        Task<bool> StatusCodeExistsAsync(Guid tenantId, string code, int? excludeId = null, CancellationToken ct = default);

        /// Updates the status and replaces all its translations in one transaction.
        Task UpdateStatusAsync(OrderStatus status, List<OrderStatusTranslation>? newTranslations, CancellationToken ct = default);

        /// Soft delete. Only affects a row owned by this tenant. Returns false if nothing was updated.
        Task<bool> DeactivateStatusAsync(int id, Guid tenantId, CancellationToken ct = default);
        /// Upserts the given translations (lang -> name) on a tracked status and saves.
        Task UpdateStatusTranslationsAsync(OrderStatus status, Dictionary<string, string> names, CancellationToken ct = default);
        public Task<int> GetNextStatusOrderAsync(Guid tenantId, CancellationToken ct = default);
        public Task<Guid> CreateNewOrderFromMenuAsync(Order order);
        public Task<OrderStatus?> GetOrderStatusById(int Id);
        public  Task<int> GetNextOrderNumberAsync(Guid tenantId, CancellationToken ct = default);
        public Task<Order?> GetOrderByIdAsNoTrckingAsync(Guid orderId, Guid TenantId , Guid SessionID);
        public Task<Order?> GetOrderByIdAsNoTrckingIncludeTableAsync(Guid orderId, Guid TenantId , Guid SessionID);
        public Task<Order?> GetOrderByIdAsync(Guid orderId, Guid TenantId , CancellationToken token);
        public Task<List<OrderStatusStepDto>> GetOrderHistoryAsync(
    Guid orderId,
    int currentStatus,
    string lan);
        public  Task<Order?> GetOrderByIdAsNoTrckingAsync(Guid orderId, Guid TenantId);
        public  Task<OrderStatusStepDto?> GetOrderCurrentStatusByOrderIdAsync(Guid Id, int CurrentStatus, string lan);

        public  Task<List<OrderStatusColumnDto>> GetOrderStatusColumnDto(
     Guid tenantId, string lan, string currency, CancellationToken ct);

        public  Task<ChangeStatusResult> ChangeStatusAsync(
       Guid tenantId, Guid orderId, int statusId, Guid? userId, CancellationToken ct);
        public Task<List<OrderLineItemDto>> GetTrackingInfo(Guid order, string lan, string ToCurrency, CancellationToken ct);

        //public Task<bool> PaymentExist(int paymentId);
        }
}
