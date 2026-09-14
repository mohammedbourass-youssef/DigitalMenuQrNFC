using NFC_Backend.Adapters;

namespace NFC_Backend.Services
{
    public class VerificationEmailService : IVerificationEmailService
    {
        private readonly IEmailAdapter _emailAdapter;

        public VerificationEmailService(IEmailAdapter emailAdapter)
        {
            _emailAdapter = emailAdapter;
        }

        public async Task SendVerificationEmailAsync(string toEmail, string fullName, int code, CancellationToken ct = default)
        {
            var subject = "Email Verified Successfully";
            var body = $@"
                <div style='font-family:Arial,sans-serif;max-width:480px;margin:auto'>
                    <h2 style='color:#2e7d32'>Email Verified Successfully</h2>
                    <p>Hi {fullName},</p>
                    <p>Your verification code is:</p>
                    <p style='font-size:28px;font-weight:bold;letter-spacing:4px'>{code}</p>
                    <p>This code will expire shortly. If you did not request this, you can ignore this email.</p>
                </div>";

            await _emailAdapter.SendAsync(toEmail, subject, body, ct);
        }
    }
}
