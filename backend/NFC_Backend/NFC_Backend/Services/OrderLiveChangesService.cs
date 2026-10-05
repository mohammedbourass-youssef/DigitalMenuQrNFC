using Microsoft.AspNetCore.SignalR;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Hubs;

namespace NFC_Backend.Services
{
    public class OrderLiveChangesService : IOrderLiveChangesService
    {
        public const string NewOrderEvent = "NewOrderReceived";

        private readonly IHubContext<OrderLiveChangesHub> _hub;
        private readonly ILogger<OrderLiveChangesService> _logger;

        public OrderLiveChangesService(
            IHubContext<OrderLiveChangesHub> hub,
            ILogger<OrderLiveChangesService> logger)
        {
            _hub = hub;
            _logger = logger;
        }

        public async Task SendNewOrderAsync(OrderSummaryStatusDto order, CancellationToken ct = default)
        {
            try
            {
                await _hub.Clients
                    .Group(OrderLiveChangesHub.OrderTrackingGroup)
                    .SendAsync(NewOrderEvent, order, ct);
            }
            catch (Exception ex)
            {
                // Live updates must never break order creation
                _logger.LogError(ex, "Failed to send live new-order update for order {OrderId}", order.OrderId);
            }
        }
    }
}
