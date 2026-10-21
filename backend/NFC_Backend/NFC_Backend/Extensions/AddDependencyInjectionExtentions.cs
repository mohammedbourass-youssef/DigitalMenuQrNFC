using NFC_Backend.Adapters;
using NFC_Backend.Infrastructure.Configs;
using NFC_Backend.MidlleWares;
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
            services.AddScoped<IOrderRepo, OrderRepo>();
            services.AddScoped<IPaymentMethodsRepo, PaymentMethodsRepo>();
            services.AddScoped<IinvoiceRepo, invoiceRepo>();
            services.AddScoped<IPlanRepo, PlanRepo>();
            //Services
            services.AddScoped<ITokenService, TokenService>();
            services.AddScoped<IFileStorageService, MinioFileStorageService>();
            services.AddScoped<ICookieService, CookieService>();
            services.AddScoped<IExchangeRateService, ExchangeRateService>();
            services.AddScoped<ICategoryTranslationService, CategoryTranslationService>();
            services.AddScoped<INotifcationService, NotifcationService>();
            services.AddScoped<IOrderLiveChangesService, OrderLiveChangesService>();
            services.AddScoped<IPaymentStatusRepo, PaymentStatusRepo>();


            //Accesseurs
            services.AddScoped<ITenantAccessor, TenantAccessor>();
            services.AddScoped<ISessionAccessor, SessionAccessor>();
            services.AddScoped<ILanguageAccessor, LanguageAccessor>();
            services.AddScoped<ICurrencyAccessor, CurrencyAccessor>();

            //Adapters : 
            services.AddHttpClient<IExchangeRateApiAdapter, ExchangeRateApiAdapter>();
            services.AddScoped<IEmailAdapter, GmailSmtpAdapter>();
            services.AddScoped<IVerificationEmailService, VerificationEmailService>();
        
            services.Configure<LibreTranslateOptions>(configuration.GetSection(LibreTranslateOptions.Section));
            services.AddSingleton(sp => sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<LibreTranslateOptions>>().Value);
            services.AddHttpClient<ITranslatorAdapter, LibreTranslateAdapter>(client =>
            {
                client.Timeout = TimeSpan.FromSeconds(30);
            }).ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
            {
                PooledConnectionLifetime = TimeSpan.FromMinutes(2),
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

