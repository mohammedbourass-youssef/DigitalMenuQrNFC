namespace NFC_Backend.Repos.Interfaces
{
    public interface IExchangeRateRepo
    {
        public Task SaveRateAsync(string from, string to, decimal crossRate, DateTime rateDate);
    }
}
