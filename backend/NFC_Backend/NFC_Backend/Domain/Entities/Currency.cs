namespace NFC_Backend.Domain.Entities
{
    public class Currency
    {
        public string Code { get; set; } = null!;        // PK - 'USD', 'MAD', 'EUR'
        public string Name { get; set; } = null!;
        public string Symbol { get; set; } = null!;
        public byte DecimalPlaces { get; set; } = 2;
        public bool IsActive { get; set; } = true;

        // Navigation
        public ICollection<ExchangeRate> BaseRates { get; set; } = [];
        public ICollection<ExchangeRate> TargetRates { get; set; } = [];
    }

}
