using Microsoft.AspNetCore.RateLimiting;
using NFC_Backend.Infrastructure.Tools;
using System.Threading.RateLimiting;

namespace NFC_Backend.Extensions
{
    public  static class RateLimiterExtentions
    {
        public static IServiceCollection AddRateLimiter(
          this IServiceCollection services,
          IConfiguration configuration)
        {
            int AccessTokenLiveTime = int.Parse(configuration["Jwt:AccessTokenExpiryMinutes"]);
            services.AddRateLimiter(options =>
            {
                options.AddFixedWindowLimiter(RateLimitingTools.RefreshRateLimit, opt =>
                {
                    opt.PermitLimit = 1;
                    opt.Window = TimeSpan.FromMinutes(AccessTokenLiveTime);
                    opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                    opt.QueueLimit = 0; 
                });

                options.AddFixedWindowLimiter(RateLimitingTools.LoginRegisterRateLimit, opt =>
                {
                    opt.PermitLimit = 3;
                    opt.Window = TimeSpan.FromMinutes(10);
                    opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                    opt.QueueLimit = 0;
                });

                options.OnRejected = async (context, token) =>
                {
                    context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                    await context.HttpContext.Response.WriteAsJsonAsync(new
                    {
                        message = "Trop de tentatives. Veuillez réessayer plus tard."
                    }, cancellationToken: token);
                };
            });

            return services;
        }
    }
}
