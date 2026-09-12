using NFC_Backend.Adapters;
using NFC_Backend.Repos.Interfaces;

namespace NFC_Backend.Services
{
    public class ExchangeRateService : IExchangeRateService
    {
        private readonly IExchangeRateApiAdapter _adapter;
        private readonly IExchangeRateRepo _dal;
        private readonly ILogger<ExchangeRateService> _logger;

        private static readonly string[] SupportedCurrencies =
            { "MAD", "USD", "EUR", "JPY", "KRW", "CNY", "GBP" };
        public ExchangeRateService(IExchangeRateApiAdapter adapter, IExchangeRateRepo dal, ILogger<ExchangeRateService> logger)
        {
            _adapter = adapter;
            _dal = dal;
            _logger = logger;
        }
        public async Task UpdateDailyRatesAsync()
        {
            var allRates = await _adapter.GetLatestRatesAsync("USD");

            if (allRates == null)
                return; // adapter already logged the failure

            var ratesVsUsd = SupportedCurrencies
                .Where(c => allRates.ContainsKey(c))
                .ToDictionary(c => c, c => allRates[c]);

            if (ratesVsUsd.Count != SupportedCurrencies.Length)
            {
                _logger.LogWarning("{Action} - Missing currencies in API response, expected {Expected}, got {Actual}",
                    "ExchangeRateFetchFailed", SupportedCurrencies.Length, ratesVsUsd.Count);
            }

            var rateDate = DateTime.UtcNow.Date;

            foreach (var from in SupportedCurrencies)
            {
                if (!ratesVsUsd.ContainsKey(from)) continue;

                foreach (var to in SupportedCurrencies)
                {
                    if (from == to || !ratesVsUsd.ContainsKey(to)) continue;
                    decimal crossRate = ratesVsUsd[to] / ratesVsUsd[from];
                    await _dal.SaveRateAsync(from, to, crossRate, rateDate);
                }
            }
            _logger.LogInformation("{Action} - Exchange rates updated for {Date}",
                "ExchangeRateUpdated", rateDate);
        }
    }
}
