namespace NFC_Backend.Services
{
    public interface IVerificationEmailService
    {
        Task SendVerificationEmailAsync(string toEmail, string fullName, int code, CancellationToken ct = default);
    }
}
