using NFC_Backend.Repos.Implementations;
using NFC_Backend.Repos.Interfaces;
using NFC_Backend.Services;

namespace NFC_Backend.Extensions
{
    public static class AddDependencyInjectionExtentions
    {
        public static IServiceCollection AddDependencyInjection(this IServiceCollection services)
        {
            services.AddScoped<ITokenService, TokenService>();
            services.AddScoped<IFileStorageService, MinioFileStorageService>();
            services.AddScoped<IUserRepo, UserRepo>();
            services.AddScoped<ITenantRepo, TenantRepo>();
            services.AddScoped<ICookieService, CookieService>();
            return services;
        }
    }
}