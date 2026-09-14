namespace NFC_Backend.Adapters
{
    public interface IEmailAdapter
    {
        Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken ct = default);
    }
}
