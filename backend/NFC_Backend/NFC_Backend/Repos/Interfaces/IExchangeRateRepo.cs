using NFC_Backend.Domain.Entities;

namespace NFC_Backend.Repos.Interfaces
{
    public interface IExchangeRateRepo
    {
        public Task SaveRateAsync(string from, string to, decimal crossRate, DateTime rateDate);
        Task<List<ExchangeRate>> GetPrices(string to);
    }
}
