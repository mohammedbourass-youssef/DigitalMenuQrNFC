// Services/NotifcationService.cs
using Microsoft.AspNetCore.SignalR;
using NFC_Backend.Hubs;

namespace NFC_Backend.Services
{
    public class NotifcationService : INotifcationService
    {
        private readonly IHubContext<NotificationHub> _hub;
        private readonly ILogger<NotifcationService> _logger;

        public NotifcationService(
            IHubContext<NotificationHub> hub,
            ILogger<NotifcationService> logger)
        {
            _hub = hub;
            _logger = logger;
        }

        public async Task SendNotificationOnOrderCreated(int orderId,Guid tenantId ,CancellationToken ct = default)
        {
            try
            {
                await _hub.Clients
                    .Group(HubsHelpers.TenantGroup(tenantId.ToString()))   // only subscribed clients
                    .SendAsync("ReceiveNotification", new
                    {
                        Message = "New Order Created",
                        OrderId = orderId,
                        CreatedAt = DateTime.UtcNow
                    }, ct);
            }
            catch (Exception ex)
            {
                // A failed notification must never break order creation
                _logger.LogError(ex, "Failed to send order-created notification for order {OrderId}", orderId);
            }
        }
    }
}