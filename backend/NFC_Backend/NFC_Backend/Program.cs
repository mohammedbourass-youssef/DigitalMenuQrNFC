using Microsoft.EntityFrameworkCore;
using NFC_Backend.Adapters;
using NFC_Backend.Extensions;
using NFC_Backend.Hubs;
using NFC_Backend.Infrastructure.Configs;
using NFC_Backend.Infrastructure.Data;
using NFC_Backend.MidlleWares;
using NFC_Backend.Repos.Implementations;
using NFC_Backend.Repos.Interfaces;
using NFC_Backend.Services;
using Serilog;
using Serilog.Debugging;

var builder = WebApplication.CreateBuilder(args);

// Surface Serilog's internal errors (e.g. a Seq ingestion failure) on stderr,
// so they show up in `docker logs nfc_backend` instead of being swallowed.
SelfLog.Enable(Console.Error);

builder.Host.UseSerilog((context, services, loggerConfiguration) => loggerConfiguration
    .ReadFrom.Configuration(context.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext());

var connectionString = builder.Configuration.GetConnectionString("SmartMenuDb")
    ?? throw new InvalidOperationException("Connection string 'SmartMenuDb' not found.");


builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));
builder.Services.AddMemoryCache();
builder.Services.AddHttpContextAccessor();
builder.Services.AddJWTBearerToken(builder.Configuration);
builder.Services.AddDependencyInjection(builder.Configuration);
builder.Services.AddRateLimiter(builder.Configuration);
builder.Services.AddQuartzWithConfigurations();

builder.Services.AddSignalR();



// Root domain used to resolve tenant subdomains (e.g. "mohammedbourass.me").
// Configured via AppSettings:BaseDomain (docker-compose: AppSettings__BaseDomain).
var baseDomain = builder.Configuration["AppSettings:BaseDomain"]?.Trim().TrimStart('.');

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
        {
            if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                return false;

            var host = uri.Host;

            // Local development: localhost and any *.localhost (customer menu + admin)
            if (host == "localhost"
                || host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase)
                || host.EndsWith(".localhost", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            // Production: the base domain itself and any tenant subdomain of it
            // (e.g. snackme.mohammedbourass.me, admin.mohammedbourass.me).
            if (!string.IsNullOrEmpty(baseDomain))
            {
                if (host.Equals(baseDomain, StringComparison.OrdinalIgnoreCase)
                    || host.EndsWith("." + baseDomain, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        })
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});
builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (args.Contains("--migrate-only", StringComparer.OrdinalIgnoreCase))
{
    await using var migrationScope = app.Services.CreateAsyncScope();
    var dbContext = migrationScope.ServiceProvider.GetRequiredService<AppDbContext>();
    await dbContext.Database.MigrateAsync();
    return;
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseAuthentication();

app.UseWhen(
    ctx => ctx.Request.Path.StartsWithSegments("/api/tenant"),  
    branch => {
        branch.UseMiddleware<TenantMiddleware>();
        branch.UseMiddleware<SessionMiddleware>();
    }
    );
app.UseMiddleware<LanguageMiddleware>();
app.UseMiddleware<CurrencyMiddleware>();
app.UseAuthorization();

app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");
app.MapHub<OrderLiveChangesHub>("/hubs/order-live-changes");


app.Run();
