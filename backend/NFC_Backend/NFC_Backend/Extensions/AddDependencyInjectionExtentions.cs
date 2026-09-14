using NFC_Backend.Adapters;
using NFC_Backend.Infrastructure.Configs;
using NFC_Backend.Repos.Implementations;
using NFC_Backend.Repos.Interfaces;
using NFC_Backend.Services;

namespace NFC_Backend.Extensions
{
    public static class AddDependencyInjectionExtentions
    {
        public static IServiceCollection AddDependencyInjection(this IServiceCollection services , IConfiguration configuration)
        {
            //Repos 
            services.AddScoped<IUserRepo, UserRepo>();
            services.AddScoped<ITenantRepo, TenantRepo>();
            services.AddScoped<IExchangeRateRepo, ExchangeRateRepo>();


            //Services
            services.AddScoped<ITokenService, TokenService>();
            services.AddScoped<IFileStorageService, MinioFileStorageService>();
            services.AddScoped<ICookieService, CookieService>();
            services.AddScoped<IExchangeRateService, ExchangeRateService>();
         


            //Adapters : 
            services.AddHttpClient<IExchangeRateApiAdapter, ExchangeRateApiAdapter>();
            services.AddScoped<IEmailAdapter, GmailSmtpAdapter>();
         services.AddScoped<IVerificationEmailService, VerificationEmailService>();

            //Options 

            services.Configure<GmailSettings>(configuration.GetSection("GmailSettings"));

            return services;
        }
    }
}