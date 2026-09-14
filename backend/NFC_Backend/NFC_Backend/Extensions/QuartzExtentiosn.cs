using NFC_Backend.Jobs;
using Quartz;

namespace NFC_Backend.Extensions
{
    public static class QuartzExtentiosn
    {
        public static IServiceCollection AddQuartzWithConfigurations(
        this IServiceCollection services)
        {
            services.AddQuartz(q =>
            {
                var jobKey = new JobKey("ExchangeRateJob");

                q.AddJob<ExchangeRateJob>(opts => opts.WithIdentity(jobKey));
                //q.AddTrigger(opts => opts
                //    .ForJob(jobKey)
                //    .WithIdentity("ExchangeRateJob-StartupTrigger")
                //    .StartNow());
                q.AddTrigger(opts => opts
                    .ForJob(jobKey)
                    .WithIdentity("ExchangeRateJob-DailyTrigger")
                    .WithCronSchedule("0 0 0 * * ?")); 
            });

            services.AddQuartzHostedService(opts =>
            {
                opts.WaitForJobsToComplete = true;
            });
            return services;
        }
    }
}
