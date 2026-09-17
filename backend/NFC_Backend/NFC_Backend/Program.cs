using Microsoft.EntityFrameworkCore;
using NFC_Backend.Adapters;
using NFC_Backend.Extensions;
using NFC_Backend.Infrastructure.Configs;
using NFC_Backend.Infrastructure.Data;
using NFC_Backend.Repos.Implementations;
using NFC_Backend.Repos.Interfaces;
using NFC_Backend.Services;

var builder = WebApplication.CreateBuilder(args);


var connectionString = builder.Configuration.GetConnectionString("SmartMenuDb")
    ?? throw new InvalidOperationException("Connection string 'SmartMenuDb' not found.");


builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));
builder.Services.AddHttpContextAccessor();
builder.Services.AddJWTBearerToken(builder.Configuration);
builder.Services.AddDependencyInjection(builder.Configuration);
builder.Services.AddRateLimiter(builder.Configuration);
builder.Services.AddQuartzWithConfigurations();





builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
    "http://localhost:5173",
    "https://localhost:5173",
    "http://127.0.0.1:5173",
    "https://127.0.0.1:5173"
)
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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseAuthentication();        
app.UseAuthorization();

app.MapControllers();

app.Run();
