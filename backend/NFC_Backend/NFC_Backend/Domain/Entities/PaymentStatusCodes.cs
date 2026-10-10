namespace NFC_Backend.Domain.Entities
{
    public static class PaymentStatusCodes
    {
        public const string Paid = "Paid";
        public const string NotPaid = "NotPaid";

        public static readonly string[] Protected = { Paid, NotPaid };

        public static bool IsProtected(string code) =>
            Protected.Contains(code, StringComparer.OrdinalIgnoreCase);
    }
}
