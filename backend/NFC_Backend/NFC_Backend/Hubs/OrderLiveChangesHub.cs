using Microsoft.AspNetCore.SignalR;
using System.Text.RegularExpressions;

namespace NFC_Backend.Hubs
{
    public class OrderLiveChangesHub : Hub
    {
        public const string OrderTrackingGroup = "order-tracking";

        public Task SubscribeToOrderTracking() =>
            Groups.AddToGroupAsync(Context.ConnectionId, OrderTrackingGroup);

        public Task UnsubscribeFromOrderTracking() =>
            Groups.RemoveFromGroupAsync(Context.ConnectionId, OrderTrackingGroup);
    }
}
