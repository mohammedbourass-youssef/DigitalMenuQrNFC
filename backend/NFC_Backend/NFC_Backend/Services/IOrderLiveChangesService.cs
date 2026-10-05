using NFC_Backend.Domain.DTOS;

namespace NFC_Backend.Services
{
    public interface IOrderLiveChangesService
    {
        Task SendNewOrderAsync(OrderSummaryStatusDto order, CancellationToken ct = default);
    }
}
