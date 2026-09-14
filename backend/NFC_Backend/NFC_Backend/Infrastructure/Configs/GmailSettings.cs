namespace NFC_Backend.Infrastructure.Configs
{
    public class GmailSettings
    {
        public string SenderEmail { get; set; } = string.Empty;
        public string SenderName { get; set; } = "NFC Backend";
        public string AppPassword { get; set; } = string.Empty; // 16-char Gmail App Password
        public string Host { get; set; } = "smtp.gmail.com";
        public int Port { get; set; } = 587;
    }
}
