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
        public DbSet<VerificationCode> VerificationCodes { get; set; } = null!;
        public DbSet<Category> Categories { get; set; } = null!;
        public DbSet<CategoryTranslation> CategoryTranslations { get; set; } = null!;
        public DbSet<MenuItem> MenuItems { get; set; } = null!;
        public DbSet<MenuItemTranslation> MenuItemTranslations { get; set; } = null!;
        public DbSet<MenuImage> MenuImages { get; set; } = null!;
        public DbSet<Session> Sessions { get; set; } = null!;
        public DbSet<Table> Tables { get; set; } = null!;

        // ── Orders ───────────────────────────────────────────────
        public DbSet<Order> Orders { get; set; } = null!;
        public DbSet<OrderItem> OrderItems { get; set; } = null!;
        public DbSet<OrderStatus> OrderStatuses { get; set; } = null!;
        public DbSet<OrderStatusTranslation> OrderStatusTranslations { get; set; } = null!;
        public DbSet<OrderStatusHistory> OrderStatusHistories { get; set; } = null!;
        public DbSet<PaymentStatus> PaymentStatuses { get; set; } = null!;
        public DbSet<PaymentStatusTranslation> PaymentStatusTranslations { get; set; } = null!;

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

                entity.HasIndex(e => new { e.BaseCurrency, e.TargetCurrency, e.RateDate })
                      .IsUnique()
                      .HasDatabaseName("UQ_Rate");

                entity.HasOne(e => e.Base)
                      .WithMany(c => c.BaseRates)
                      .HasForeignKey(e => e.BaseCurrency)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Target)
                      .WithMany(c => c.TargetRates)
                      .HasForeignKey(e => e.TargetCurrency)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<VerificationCode>(entity =>
            {
                entity.ToTable("verification_codes");

                entity.HasKey(v => v.Id);

                entity.Property(v => v.Code)
                      .IsRequired();

                entity.Property(v => v.VerificationsStatus)
                      .HasConversion<string>()
                      .HasMaxLength(20)
                      .IsRequired();

                entity.Property(v => v.ExpiredAt)
                      .IsRequired();

                entity.Property(v => v.CreatedAt)
                      .HasDefaultValueSql("NOW()");

                entity.HasIndex(v => v.UserId);
                entity.HasIndex(v => v.Code);

                entity.HasOne(v => v.User)
                      .WithMany(u => u.VerificationCodes)
                      .HasForeignKey(v => v.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(v => new { v.UserId, v.VerificationsStatus })
                      .IsUnique()
                      .HasFilter("\"VerificationsStatus\" = 'Pending'")
                      .HasDatabaseName("UQ_ActivePendingCode");
            });

            modelBuilder.Entity<Category>(entity =>
            {
                entity.ToTable("categories");

                entity.HasKey(c => c.Id);

                entity.Property(c => c.Color)
                      .HasMaxLength(20);

                entity.Property(c => c.DisplayOrder)
                      .HasDefaultValue(0);

                entity.Property(c => c.IsActive)
                      .HasDefaultValue(true);

                entity.Property(c => c.CreatedAt)
                      .HasDefaultValueSql("NOW()");

                entity.HasIndex(c => c.TenantId);

                entity.HasOne(c => c.Tenant)
                      .WithMany(t => t.Categories)
                      .HasForeignKey(c => c.TenantId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<CategoryTranslation>(entity =>
            {
                entity.ToTable("category_translations");

                entity.HasKey(ct => ct.Id);

                entity.Property(ct => ct.Lang)
                      .HasMaxLength(5)
                      .IsRequired();

                entity.Property(ct => ct.Name)
                      .HasMaxLength(150)
                      .IsRequired();

                entity.HasIndex(ct => new { ct.CategoryId, ct.Lang })
                      .IsUnique()
                      .HasDatabaseName("UQ_CategoryTranslation_Lang");

                entity.HasOne(ct => ct.Category)
                      .WithMany(c => c.Translations)
                      .HasForeignKey(ct => ct.CategoryId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<MenuItem>(entity =>
            {
                entity.HasKey(m => m.Id);
                entity.Property(m => m.PriceInDefaultCurrency).HasColumnType("decimal(18,2)");
                entity.Property(m => m.DiscountedPrice).HasColumnType("decimal(18,2)");
                entity.Property(m => m.DefaultCurrencyCode).HasMaxLength(3).IsRequired();

                entity.HasOne(m => m.Category)
                      .WithMany()
                      .HasForeignKey(m => m.CategoryId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(m => m.Tenant)
                      .WithMany()
                      .HasForeignKey(m => m.TenantId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(m => new { m.TenantId, m.CategoryId });
            });

            modelBuilder.Entity<MenuItemTranslation>(entity =>
            {
                entity.HasKey(t => t.Id);
                entity.Property(t => t.Lang).HasMaxLength(10).IsRequired();
                entity.Property(t => t.Name).IsRequired();

                entity.HasOne(t => t.Menu)
                      .WithMany(m => m.Translations)
                      .HasForeignKey(t => t.MenuId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(t => new { t.MenuId, t.Lang }).IsUnique();
            });

            modelBuilder.Entity<MenuImage>(entity =>
            {
                entity.HasKey(i => i.Id);
                entity.Property(i => i.Url).IsRequired();

                entity.HasOne(i => i.Menu)
                      .WithMany(m => m.Images)
                      .HasForeignKey(i => i.MenuId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<Session>(entity =>
            {
                entity.ToTable("sessions");

                entity.HasKey(s => s.Id);

                entity.Property(s => s.TokenHash)
                      .IsRequired();

                entity.Property(s => s.CreatedAt)
                      .HasDefaultValueSql("NOW()");

                entity.Property(s => s.ExpiresAt)
                      .IsRequired();

                entity.HasIndex(s => s.TokenHash).IsUnique();
                entity.HasIndex(s => s.ExpiresAt);
                entity.HasIndex(s => s.TenantId);

                entity.HasOne(s => s.Tenant)
                      .WithMany()
                      .HasForeignKey(s => s.TenantId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(s => s.TableId);

                entity.HasOne(s => s.Table)
                      .WithMany(t => t.Sessions)
                      .HasForeignKey(s => s.TableId)
                      .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<Table>(entity =>
            {
                entity.ToTable("tables");

                entity.HasKey(t => t.Id);

                entity.Property(t => t.Number)
                      .IsRequired();

                entity.Property(t => t.Name)
                      .IsRequired()
                      .HasMaxLength(100);

                entity.Property(t => t.IsAvailable)
                      .HasDefaultValue(true);

                entity.HasIndex(t => t.TenantId);

                entity.HasIndex(t => new { t.TenantId, t.Number })
                      .IsUnique()
                      .HasDatabaseName("UQ_Table_Number_PerTenant");

                entity.HasOne(t => t.Tenant)
                      .WithMany()
                      .HasForeignKey(t => t.TenantId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // ═════════════════════════════════════════════════════
            //  ORDER STATUS  (New, Preparing, Completed, Cancelled)
            // ═════════════════════════════════════════════════════
            modelBuilder.Entity<OrderStatus>(entity =>
            {
                entity.ToTable("order_statuses");
                entity.HasKey(s => s.Id);

                entity.Property(s => s.Code).HasMaxLength(30).IsRequired();
                entity.Property(s => s.Color).HasMaxLength(20);
                entity.Property(s => s.IsActive).HasDefaultValue(true);

                entity.HasIndex(s => s.Code).IsUnique();

                entity.HasData(
                    new OrderStatus { Id = 1, Code = OrderStatusCodes.New, Color = "#3B82F6", DisplayOrder = 1, IsFinal = false, IsActive = true },
                    new OrderStatus { Id = 2, Code = OrderStatusCodes.Preparing, Color = "#F59E0B", DisplayOrder = 2, IsFinal = false, IsActive = true },
                    new OrderStatus { Id = 3, Code = OrderStatusCodes.Completed, Color = "#10B981", DisplayOrder = 3, IsFinal = true, IsActive = true },
                    new OrderStatus { Id = 4, Code = OrderStatusCodes.Cancelled, Color = "#EF4444", DisplayOrder = 4, IsFinal = true, IsActive = true }
                );
            });

            modelBuilder.Entity<OrderStatusTranslation>(entity =>
            {
                entity.ToTable("order_status_translations");
                entity.HasKey(t => t.Id);

                entity.Property(t => t.Lang).HasMaxLength(5).IsRequired();
                entity.Property(t => t.Name).HasMaxLength(100).IsRequired();

                entity.HasIndex(t => new { t.OrderStatusId, t.Lang })
                      .IsUnique()
                      .HasDatabaseName("UQ_OrderStatusTranslation_Lang");

                entity.HasOne(t => t.OrderStatus)
                      .WithMany(s => s.Translations)
                      .HasForeignKey(t => t.OrderStatusId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasData(AppDbContextHelpers.BuildOrderStatusSeed());   // 4 statuses × 9 languages = 36 rows
            });

            // ═════════════════════════════════════════════════════
            //  PAYMENT STATUS  (Unpaid, Partial, Paid, Refunded)
            // ═════════════════════════════════════════════════════
            modelBuilder.Entity<PaymentStatus>(entity =>
            {
                entity.ToTable("payment_statuses");
                entity.HasKey(s => s.Id);

                entity.Property(s => s.Code).HasMaxLength(30).IsRequired();
                entity.Property(s => s.Color).HasMaxLength(20);
                entity.Property(s => s.IsActive).HasDefaultValue(true);

                entity.HasIndex(s => s.Code).IsUnique();

                entity.HasData(
                    new PaymentStatus { Id = 1, Code = PaymentStatusCodes.Unpaid, Color = "#EF4444", DisplayOrder = 1, IsActive = true },
                    new PaymentStatus { Id = 2, Code = PaymentStatusCodes.Partial, Color = "#F59E0B", DisplayOrder = 2, IsActive = true },
                    new PaymentStatus { Id = 3, Code = PaymentStatusCodes.Paid, Color = "#10B981", DisplayOrder = 3, IsActive = true },
                    new PaymentStatus { Id = 4, Code = PaymentStatusCodes.Refunded, Color = "#6B7280", DisplayOrder = 4, IsActive = true }
                );
            });

            modelBuilder.Entity<PaymentStatusTranslation>(entity =>
            {
                entity.ToTable("payment_status_translations");
                entity.HasKey(t => t.Id);

                entity.Property(t => t.Lang).HasMaxLength(5).IsRequired();
                entity.Property(t => t.Name).HasMaxLength(100).IsRequired();

                entity.HasIndex(t => new { t.PaymentStatusId, t.Lang })
                      .IsUnique()
                      .HasDatabaseName("UQ_PaymentStatusTranslation_Lang");

                entity.HasOne(t => t.PaymentStatus)
                      .WithMany(s => s.Translations)
                      .HasForeignKey(t => t.PaymentStatusId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasData(AppDbContextHelpers.BuildPaymentStatusSeed());   // 4 statuses × 9 languages = 36 rows
            });

            // ═════════════════════════════════════════════════════
            //  ORDERS
            // ═════════════════════════════════════════════════════
            modelBuilder.Entity<Order>(entity =>
            {
                entity.ToTable("orders");
                entity.HasKey(o => o.Id);

                entity.Property(o => o.CurrencyCode).HasMaxLength(3).IsFixedLength().IsRequired();
                entity.Property(o => o.Subtotal).HasColumnType("decimal(18,2)");
                entity.Property(o => o.Total).HasColumnType("decimal(18,2)");
                entity.Property(o => o.PaidAmount).HasColumnType("decimal(18,2)").HasDefaultValue(0m);
                entity.Property(o => o.Notes).HasMaxLength(500);
                entity.Property(o => o.CreatedAt).HasDefaultValueSql("NOW()");

                entity.HasIndex(o => o.TenantId);
                entity.HasIndex(o => new { o.TenantId, o.StatusId });          // kitchen dashboard
                entity.HasIndex(o => new { o.TenantId, o.PaymentStatusId });   // unpaid orders filter
                entity.HasIndex(o => new { o.TenantId, o.CreatedAt });         // history / reports
                entity.HasIndex(o => o.TableId);
                entity.HasIndex(o => o.SessionId);

                entity.HasIndex(o => new { o.TenantId, o.OrderNumber })
                      .IsUnique()
                      .HasDatabaseName("UQ_Order_Number_PerTenant");

                entity.HasOne(o => o.Tenant)
                      .WithMany()
                      .HasForeignKey(o => o.TenantId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(o => o.Table)
                      .WithMany()
                      .HasForeignKey(o => o.TableId)
                      .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(o => o.Session)
                      .WithMany()
                      .HasForeignKey(o => o.SessionId)
                      .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(o => o.Status)
                      .WithMany()
                      .HasForeignKey(o => o.StatusId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(o => o.PaymentStatus)
                      .WithMany()
                      .HasForeignKey(o => o.PaymentStatusId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(o => o.Currency)
                      .WithMany()
                      .HasForeignKey(o => o.CurrencyCode)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<OrderItem>(entity =>
            {
                entity.ToTable("order_items");
                entity.HasKey(i => i.Id);

                entity.Property(i => i.NameSnapshot).HasMaxLength(200).IsRequired();
                entity.Property(i => i.UnitPrice).HasColumnType("decimal(18,2)");
                entity.Property(i => i.LineTotal).HasColumnType("decimal(18,2)");
                entity.Property(i => i.Notes).HasMaxLength(300);

                entity.HasIndex(i => i.OrderId);

                entity.HasOne(i => i.Order)
                      .WithMany(o => o.Items)
                      .HasForeignKey(i => i.OrderId)
                      .OnDelete(DeleteBehavior.Cascade);

                // Keep order history even if the dish is deleted later
                entity.HasOne(i => i.MenuItem)
                      .WithMany()
                      .HasForeignKey(i => i.MenuItemId)
                      .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<OrderStatusHistory>(entity =>
            {
                entity.ToTable("order_status_history");
                entity.HasKey(h => h.Id);

                entity.Property(h => h.ChangedAt).HasDefaultValueSql("NOW()");

                entity.HasIndex(h => h.OrderId);

                entity.HasOne(h => h.Order)
                      .WithMany(o => o.StatusHistory)
                      .HasForeignKey(h => h.OrderId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(h => h.Status)
                      .WithMany()
                      .HasForeignKey(h => h.StatusId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(h => h.ChangedByUser)
                      .WithMany()
                      .HasForeignKey(h => h.ChangedByUserId)
                      .OnDelete(DeleteBehavior.SetNull);
            });
        }
    }
}