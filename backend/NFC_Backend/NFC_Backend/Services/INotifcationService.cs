namespace NFC_Backend.Services
{
    public interface INotifcationService
    {
        Task SendNotificationOnOrderCreated(int orderId, CancellationToken ct = default);

    }
}
