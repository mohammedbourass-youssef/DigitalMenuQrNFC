namespace NFC_Backend.Adapters
{
    public interface IExchangeRateApiAdapter
    {
        Task<Dictionary<string, decimal>> GetLatestRatesAsync(string baseCurrency);
    }
}
