using Microsoft.Extensions.Options;
using NFC_Backend.Infrastructure.Configs;
using System.Net;
using System.Net.Mail;

namespace NFC_Backend.Adapters
{
    public class GmailSmtpAdapter : IEmailAdapter
    {
        private readonly GmailSettings _settings;

        public GmailSmtpAdapter(IOptions<GmailSettings> settings)
        {
            _settings = settings.Value;
        }

        public async Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken ct = default)
        {
            using var message = new MailMessage
            {
                From = new MailAddress(_settings.SenderEmail, _settings.SenderName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true
            };
            message.To.Add(toEmail);

            using var client = new SmtpClient(_settings.Host, _settings.Port)
            {
                Credentials = new NetworkCredential(_settings.SenderEmail, _settings.AppPassword),
                EnableSsl = true
            };

            await client.SendMailAsync(message, ct);
        }
    }
}
