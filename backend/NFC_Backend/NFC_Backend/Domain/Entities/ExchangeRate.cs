namespace NFC_Backend.Domain.Entities
{
    public class ExchangeRate
    {
        public int Id { get; set; }
        public string BaseCurrency { get; set; } = null!;
        public string TargetCurrency { get; set; } = null!;
        public decimal Rate { get; set; }
        public DateOnly RateDate { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Currency Base { get; set; } = null!;
        public Currency Target { get; set; } = null!;
    }
}
