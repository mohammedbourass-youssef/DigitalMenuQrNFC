using System.Text.Json.Serialization;

namespace NFC_Backend.Domain.DTOS
{
    public class ExchangeRateApiResponse
    {
        [JsonPropertyName("conversion_rates")]
        public Dictionary<string, decimal> ConversionRates { get; set; }
    }
}
