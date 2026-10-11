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

var builder = WebApplication.CreateBuilder(args);

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



builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
        {
            if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                return false;

            var host = uri.Host;

            // Customer menu: snackme.localhost, any tenant subdomain, any port
            var isTenantMenu = host == "localhost"
                || host.EndsWith(".localhost", StringComparison.OrdinalIgnoreCase);

            // Admin frontend: adjust to match its actual host
            var isAdmin = host == "admin.localhost";

            return isTenantMenu || isAdmin;
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
