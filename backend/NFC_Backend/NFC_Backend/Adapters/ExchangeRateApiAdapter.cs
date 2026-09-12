using NFC_Backend.Domain.DTOS;

namespace NFC_Backend.Adapters
{

    public class ExchangeRateApiAdapter : IExchangeRateApiAdapter
    {
        private readonly HttpClient _http;
        private readonly ILogger<ExchangeRateApiAdapter> _logger;
        private readonly string _apiKey;

        public ExchangeRateApiAdapter(HttpClient http, IConfiguration config, ILogger<ExchangeRateApiAdapter> logger)
        {
            _http = http;
            _logger = logger;
            _apiKey = config["ExchangeRateApi:ApiKey"];
        }
        public async Task<Dictionary<string, decimal>> GetLatestRatesAsync(string baseCurrency)
        {
            var url = $"https://v6.exchangerate-api.com/v6/{_apiKey}/latest/{baseCurrency}";
            try
            {
                var response = await _http.GetFromJsonAsync<ExchangeRateApiResponse>(url);

                if (response?.ConversionRates == null)
                {
                    _logger.LogWarning("{Action} - Empty response from ExchangeRate-API for base {Base}",
                        "ExchangeRateFetchFailed", baseCurrency);
                    return null;
                }

                return response.ConversionRates;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "{Action} - Exception calling ExchangeRate-API for base {Base}",
                     "ExchangeRateFetchFailed", baseCurrency);
                return null;
            }
        }
    }

}
