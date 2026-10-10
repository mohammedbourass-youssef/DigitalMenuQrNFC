namespace NFC_Backend.Services
{
    public interface INotifcationService
    {
        public  Task SendNotificationOnOrderCreated(int orderId, Guid tenantId, CancellationToken ct = default);

    }
}
