using System.ComponentModel.DataAnnotations;

namespace NFC_Backend.Domain.Entities
{
    public static class PaymentMethodCodes
    {
        public const string Cash = "CASH";
        public const string Card = "CARD";
        public const string BankTransfer = "BANK_TRANSFER";
        public const string Mobile = "MOBILE";
    }
    public class PaymentMethod
    {
        public int Id { get; set; }
        public string Code { get; set; } = null!;     // stable key used in code
        public string? Color { get; set; }
        public string? Icon { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; } = true;

        public ICollection<PaymentMethodTranslation> Translations { get; set; } = new List<PaymentMethodTranslation>();
        public ICollection<TenantPaymentMethod> TenantPaymentMethods { get; set; } = new List<TenantPaymentMethod>();
    }
}
