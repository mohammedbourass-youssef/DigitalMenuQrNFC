using Microsoft.EntityFrameworkCore;
using NFC_Backend.Domain.Entities;

namespace NFC_Backend.Infrastructure.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }
        public DbSet<User> Users { get; set; } = null!;
        public DbSet<Tenant> Tenants { get; set; } = null!;
        public DbSet<Currency> Currencies { get; set; } = null!;
        public DbSet<ExchangeRate> ExchangeRates { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("users");

                entity.HasIndex(u => u.Email).IsUnique();
                entity.HasIndex(u => u.TenantId);
                entity.HasIndex(u => u.RefreshToken);

                entity.Property(u => u.Role)
                      .HasConversion<string>()
                      .HasMaxLength(20);

                entity.HasOne(u => u.Tenant)
                      .WithMany(t => t.Users)
                      .HasForeignKey(u => u.TenantId)
                      .OnDelete(DeleteBehavior.Cascade);
            });
            modelBuilder.Entity<Tenant>(entity =>
            {
                entity.ToTable("tenants");

                entity.HasIndex(t => t.Subdomain).IsUnique();

                entity.Property(t => t.Status)
                      .HasConversion<string>()
                      .HasMaxLength(20);
                entity.Property(t => t.CurrencyCode)
       .HasMaxLength(3)
       .IsFixedLength()
       .HasDefaultValue("MAD");

                entity.HasOne(t => t.Currency)
                    .WithMany()
                    .HasForeignKey(t => t.CurrencyCode)
                    .OnDelete(DeleteBehavior.Restrict);
            });
            modelBuilder.Entity<Currency>(entity =>
            {
                entity.HasKey(c => c.Code);

                entity.Property(c => c.Code)
                    .HasMaxLength(3)
                    .IsFixedLength();

                entity.Property(c => c.Name)
                    .HasMaxLength(100)
                    .IsRequired();

                entity.Property(c => c.Symbol)
                    .HasMaxLength(10)
                    .IsRequired();

                entity.Property(c => c.DecimalPlaces)
                    .HasDefaultValue((byte)2);

                entity.Property(c => c.IsActive)
                    .HasDefaultValue(true);

                // ── Seed Data ────────────────────────────────────────
                entity.HasData(
                    new Currency { Code = "MAD", Name = "Dirham marocain", Symbol = "DH", DecimalPlaces = 2 },
                    new Currency { Code = "USD", Name = "Dollar américain", Symbol = "$", DecimalPlaces = 2 },
                    new Currency { Code = "EUR", Name = "Euro", Symbol = "€", DecimalPlaces = 2 },
                    new Currency { Code = "JPY", Name = "Yen japonais", Symbol = "¥", DecimalPlaces = 0 },
                    new Currency { Code = "KRW", Name = "Won coréen", Symbol = "₩", DecimalPlaces = 0 },
                    new Currency { Code = "CNY", Name = "Yuan chinois", Symbol = "¥", DecimalPlaces = 2 },
                    new Currency { Code = "GBP", Name = "Livre sterling", Symbol = "£", DecimalPlaces = 2 }
                );
            });
            modelBuilder.Entity<ExchangeRate>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.BaseCurrency)
                    .HasMaxLength(3)
                    .IsFixedLength()
                    .IsRequired();

                entity.Property(e => e.TargetCurrency)
                    .HasMaxLength(3)
                    .IsFixedLength()
                    .IsRequired();

                entity.Property(e => e.Rate)
                    .HasColumnType("decimal(18,6)")
                    .IsRequired();

                entity.Property(e => e.CreatedAt)
                    .HasDefaultValueSql("NOW()");   // PostgreSQL — use GETDATE() for SQL Server

                // Unique constraint — UQ_Rate
                entity.HasIndex(e => new { e.BaseCurrency, e.TargetCurrency, e.RateDate })
                    .IsUnique()
                    .HasDatabaseName("UQ_Rate");

                // FK → Currency (Base)
                entity.HasOne(e => e.Base)
                    .WithMany(c => c.BaseRates)
                    .HasForeignKey(e => e.BaseCurrency)
                    .OnDelete(DeleteBehavior.Restrict);

                // FK → Currency (Target)
                entity.HasOne(e => e.Target)
                    .WithMany(c => c.TargetRates)
                    .HasForeignKey(e => e.TargetCurrency)
                    .OnDelete(DeleteBehavior.Restrict);
            });

        }
    }
}
