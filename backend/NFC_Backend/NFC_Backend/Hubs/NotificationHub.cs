using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Extensions;

namespace NFC_Backend.Hubs
{

    [Authorize]
    public class NotificationHub : Hub
    {
        public const string OrdersGroup = "orders";

        public async Task SubscribeToOrders()
        {
            var tenantId = Context.User.GetTenantId();

            if (tenantId == null)
            {
                Context.Abort();   // no tenant, no connection
                return;
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, HubsHelpers.TenantGroup(tenantId.ToString()));
        }

        public async Task UnsubscribeFromOrders()
        {

            var tenantId = Context.User.GetTenantId();

            if (tenantId == null)
            {
                Context.Abort();   // no tenant, no connection
                return;
            }
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, HubsHelpers.TenantGroup(tenantId.ToString()));
        }
    }
}
