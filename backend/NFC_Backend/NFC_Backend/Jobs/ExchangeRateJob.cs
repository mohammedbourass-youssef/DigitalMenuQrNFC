using NFC_Backend.Services;
using Quartz;

namespace NFC_Backend.Jobs
{
    public class ExchangeRateJob : IJob
    {
        private readonly IExchangeRateService _exchangeRateService;
        private readonly ILogger<ExchangeRateJob> _logger;

        public ExchangeRateJob(IExchangeRateService exchangeRateService, ILogger<ExchangeRateJob> logger)
        {
            _exchangeRateService = exchangeRateService;
            _logger = logger;
        }

        public async Task Execute(IJobExecutionContext context)
        {
            _logger.LogInformation("{Action} - ExchangeRateJob started", "ExchangeRateJobStarted");

            try
            {
                await _exchangeRateService.UpdateDailyRatesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "{Action} - ExchangeRateJob failed", "ExchangeRateJobFailed");
            }
        }
    }
}
