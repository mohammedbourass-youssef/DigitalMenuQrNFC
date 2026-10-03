using Microsoft.AspNetCore.SignalR;

namespace NFC_Backend.Hubs
{

    public class NotificationHub : Hub
    {
        public const string OrdersGroup = "orders";

        public async Task SubscribeToOrders()
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, OrdersGroup);
        }

        public async Task UnsubscribeFromOrders()
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, OrdersGroup);
        }
    }
}
