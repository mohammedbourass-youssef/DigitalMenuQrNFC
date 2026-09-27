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
            services.AddScoped<ICategoryRepo, CategoryRepo>();
            services.AddScoped<IMenuItemRepo, MenuItemRepo>();
            services.AddScoped<ISessionsRepository, SessionsRepository>();
            services.AddScoped<ITableRepo, TableRepo>();

            //Services
            services.AddScoped<ITokenService, TokenService>();
            services.AddScoped<IFileStorageService, MinioFileStorageService>();
            services.AddScoped<ICookieService, CookieService>();
            services.AddScoped<IExchangeRateService, ExchangeRateService>();
            services.AddScoped<ICategoryTranslationService, CategoryTranslationService>();

            //Accesseurs
            services.AddScoped<ITenantAccessor, TenantAccessor>();
            services.AddScoped<ISessionAccessor, SessionAccessor>();

            //Adapters : 
            services.AddHttpClient<IExchangeRateApiAdapter, ExchangeRateApiAdapter>();
            services.AddScoped<IEmailAdapter, GmailSmtpAdapter>();
            services.AddScoped<IVerificationEmailService, VerificationEmailService>();
        
          services
    .AddOptions<AzureTranslatorOptions>()
    .BindConfiguration(AzureTranslatorOptions.Section)
    .ValidateDataAnnotations()
    .ValidateOnStart();
           services.AddHttpClient<ITranslatorAdapter, AzureTranslatorAdapter>((sp, client) =>
            {
                // HttpClient base address is optional; the adapter builds the full URL itself
                client.Timeout = TimeSpan.FromSeconds(10);
            }).ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
            {
                PooledConnectionLifetime = TimeSpan.FromMinutes(2),
            });
           services.AddTransient<ITranslatorAdapter>(sp =>
            {
                var http = sp.GetRequiredService<IHttpClientFactory>().CreateClient(nameof(AzureTranslatorAdapter));
                var opts = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<AzureTranslatorOptions>>().Value;
                return new AzureTranslatorAdapter(http, opts);
            });

            services.Configure<GeminiOptions>(configuration.GetSection("Gemini"));

            services.AddHttpClient<IGeminiLmTranslatorAdapter, GeminiLmTranslatorAdapter>((sp, client) =>
            {
                client.Timeout = TimeSpan.FromSeconds(10);
            }).ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
            {
                PooledConnectionLifetime = TimeSpan.FromMinutes(2),
            });

            services.AddTransient<IGeminiLmTranslatorAdapter>(sp =>
            {
                var http = sp.GetRequiredService<IHttpClientFactory>().CreateClient(nameof(GeminiLmTranslatorAdapter));
                var opts = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<GeminiOptions>>().Value;
                var logger = sp.GetRequiredService<ILogger<GeminiLmTranslatorAdapter>>();

                return new GeminiLmTranslatorAdapter(http, opts ,logger);
            });
            //Options 

            services.Configure<GmailSettings>(configuration.GetSection("GmailSettings"));

            return services;
        }
    }
}