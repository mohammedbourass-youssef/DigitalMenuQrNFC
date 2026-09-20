using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Infrastructure.Data;
using NFC_Backend.Repos.Interfaces;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace NFC_Backend.Repos.Implementations
{
    public class ExchangeRateRepo : IExchangeRateRepo
    {
        private readonly AppDbContext _dbContext;

        public ExchangeRateRepo(AppDbContext dbContext)
        {
            _dbContext = dbContext;
        }
        public async Task SaveRateAsync(string from, string to, decimal crossRate, DateTime rateDate)
        {
            var existing = await _dbContext.ExchangeRates
            .FirstOrDefaultAsync(c => c.BaseCurrency == from && c.TargetCurrency == to);

            if (existing == null)
            {
                ExchangeRate exchange = new ExchangeRate
                {
                    BaseCurrency = from,
                    TargetCurrency = to,
                    CreatedAt = DateTime.UtcNow,
                    RateDate = DateOnly.FromDateTime(rateDate),
                    Rate = crossRate,            
                };
                await _dbContext.ExchangeRates.AddAsync(exchange);
            }
            else
            {
                existing.BaseCurrency = from;
                existing.TargetCurrency = to;
                existing.RateDate = DateOnly.FromDateTime(rateDate);
                existing.Rate = crossRate;
            }

            await _dbContext.SaveChangesAsync();
        }

        public async Task<List<ExchangeRate>> GetPrices(string to)
     => await _dbContext.ExchangeRates
         .AsNoTracking()
         .Where(e => e.TargetCurrency == to)
         .ToListAsync();
    }
}
