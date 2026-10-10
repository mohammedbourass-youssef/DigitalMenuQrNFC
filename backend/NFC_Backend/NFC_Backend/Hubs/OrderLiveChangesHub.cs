using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using NFC_Backend.Extensions;
using System.Text.RegularExpressions;

namespace NFC_Backend.Hubs
{
    [Authorize]

    public class OrderLiveChangesHub : Hub
    {
        public const string OrderTrackingGroup = "order-tracking";

        public async Task SubscribeToOrderTracking()
        {
            var tenantId = Context.User.GetTenantId();

            if (tenantId == null)
            {
                Context.Abort();   // no tenant, no connection
                return;
            }
           await  Groups.AddToGroupAsync(Context.ConnectionId, HubsHelpers.TenantGroup(tenantId.ToString()));
        }
           

        public async Task UnsubscribeFromOrderTracking()
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
