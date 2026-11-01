using Microsoft.EntityFrameworkCore;
using NFC_Backend.Domain.Constants;
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
        public DbSet<Plan> Plans { get; set; } = null!;

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
        public DbSet<Notification> Notifications { get; set; }
        // ── Payment methods ──────────────────────────────────────
        public DbSet<PaymentMethod> PaymentMethods { get; set; } = null!;
        public DbSet<PaymentMethodTranslation> PaymentMethodTranslations { get; set; } = null!;
        public DbSet<TenantPaymentMethod> TenantPaymentMethods { get; set; } = null!;
        public DbSet<Feature> Features { get; set; } = null!;
        public DbSet<PlanFeature> PlanFeatures { get; set; } = null!;
        public DbSet<Role> Roles { get; set; } = null!;
        public DbSet<RolePermission> RolePermissions { get; set; } = null!;
        public DbSet<TenantUserRole> UserRoles { get; set; } = null!;

        public DbSet<Invoice> Invoices { get; set; } = null!;

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

                entity.Property(t => t.PlanId).HasDefaultValue(1);
                entity.Property(t => t.BillingCycle).HasConversion<string>().HasMaxLength(20);

                entity.HasOne(t => t.Plan)
                      .WithMany(p => p.Tenants)
                      .HasForeignKey(t => t.PlanId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(t => t.PlanId);
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
                    new PaymentStatus { Id = 1, Code = PaymentStatusCodes.NotPaid, IsSystem = true, Color = "#EF4444", DisplayOrder = 1, IsActive = true },
                    new PaymentStatus { Id = 2, Code = PaymentStatusCodes.Paid, IsSystem = true, Color = "#10B981", DisplayOrder = 3, IsActive = true }
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

            modelBuilder.Entity<Notification>(e =>
            {
                e.Property(n => n.Title).HasMaxLength(200).IsRequired();
                e.Property(n => n.Message).HasMaxLength(1000).IsRequired();
                e.Property(n => n.Type).HasConversion<string>().HasMaxLength(50);
                e.HasIndex(n => n.CreatedAt);
            });

            // ═════════════════════════════════════════════════════
            //  PAYMENT METHODS  (Cash, Card, Bank transfer, Mobile)
            // ═════════════════════════════════════════════════════
            modelBuilder.Entity<PaymentMethod>(entity =>
            {
                entity.ToTable("payment_methods");
                entity.HasKey(p => p.Id);

                entity.Property(p => p.Code).HasMaxLength(30).IsRequired();
                entity.Property(p => p.Color).HasMaxLength(20);
                entity.Property(p => p.Icon).HasMaxLength(50);
                entity.Property(p => p.IsActive).HasDefaultValue(true);

                entity.HasIndex(p => p.Code).IsUnique();

                entity.HasData(
                    new PaymentMethod { Id = 1, Code = PaymentMethodCodes.Cash, Color = "#10B981", Icon = "banknote", DisplayOrder = 1, IsActive = true },
                    new PaymentMethod { Id = 2, Code = PaymentMethodCodes.Card, Color = "#3B82F6", Icon = "credit-card", DisplayOrder = 2, IsActive = true },
                    new PaymentMethod { Id = 3, Code = PaymentMethodCodes.BankTransfer, Color = "#6366F1", Icon = "landmark", DisplayOrder = 3, IsActive = true },
                    new PaymentMethod { Id = 4, Code = PaymentMethodCodes.Mobile, Color = "#F59E0B", Icon = "smartphone", DisplayOrder = 4, IsActive = true }
                );
            });

            modelBuilder.Entity<PaymentMethodTranslation>(entity =>
            {
                entity.ToTable("payment_method_translations");
                entity.HasKey(t => t.Id);

                entity.Property(t => t.Lang).HasMaxLength(5).IsRequired();
                entity.Property(t => t.Name).HasMaxLength(100).IsRequired();
                entity.Property(t => t.Description).HasMaxLength(300);

                entity.HasIndex(t => new { t.PaymentMethodId, t.Lang })
                      .IsUnique()
                      .HasDatabaseName("UQ_PaymentMethodTranslation_Lang");

                entity.HasOne(t => t.PaymentMethod)
                      .WithMany(p => p.Translations)
                      .HasForeignKey(t => t.PaymentMethodId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasData(AppDbContextHelpers.BuildPaymentMethodSeed());
            });

            modelBuilder.Entity<TenantPaymentMethod>(entity =>
            {
                entity.ToTable("tenant_payment_methods");
                entity.HasKey(t => t.Id);

                entity.Property(t => t.DisplayName).HasMaxLength(100);
                entity.Property(t => t.IsEnabled).HasDefaultValue(true);
                entity.Property(t => t.IsDefault).HasDefaultValue(false);
                entity.Property(t => t.DisplayOrder).HasDefaultValue(0);

                entity.HasIndex(t => t.TenantId);

                // A tenant can't add the same method twice
                entity.HasIndex(t => new { t.TenantId, t.PaymentMethodId })
                      .IsUnique()
                      .HasDatabaseName("UQ_TenantPaymentMethod");

                // Only one default method per tenant (PostgreSQL filtered index)
                entity.HasIndex(t => t.TenantId)
                      .IsUnique()
                      .HasFilter("\"IsDefault\" = true")
                      .HasDatabaseName("UQ_TenantPaymentMethod_Default");

                entity.HasOne(t => t.Tenant)
                      .WithMany()
                      .HasForeignKey(t => t.TenantId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(t => t.PaymentMethod)
                      .WithMany(p => p.TenantPaymentMethods)
                      .HasForeignKey(t => t.PaymentMethodId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // ═════════════════════════════════════════════════════
            //  INVOICES
            // ═════════════════════════════════════════════════════
            modelBuilder.Entity<Invoice>(entity =>
            {
                entity.ToTable("invoices", t =>
                    t.HasCheckConstraint("CK_Invoice_Amounts", "\"OrderTotal\" >= 0 AND \"PaidAmount\" >= 0"));

                entity.HasKey(i => i.Id);

                entity.Property(i => i.CurrencyCode)
                      .HasMaxLength(3)
                      .IsFixedLength()
                      .IsRequired()
                      .HasDefaultValue("MAD");
                entity.Property(i => i.OrderTotal).HasColumnType("decimal(18,2)");
                entity.Property(i => i.PaidAmount).HasColumnType("decimal(18,2)").HasDefaultValue(0m);
                entity.Property(i => i.Notes).HasMaxLength(500);
                entity.Property(i => i.CreatedAtUtc).HasDefaultValueSql("NOW()");

                entity.HasIndex(i => i.OrderId);
                entity.HasIndex(i => i.UserId);
                entity.HasIndex(i => i.TenantPaymentMethodId);
                entity.HasIndex(i => i.CurrencyCode);
                entity.HasIndex(i => i.CreatedAtUtc);

                entity.HasOne(i => i.Order)
                      .WithMany()
                      .HasForeignKey(i => i.OrderId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(i => i.User)
                      .WithMany()
                      .HasForeignKey(i => i.UserId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(i => i.Method)
                      .WithMany()
                      .HasForeignKey(i => i.TenantPaymentMethodId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(i => i.Currency)
                      .WithMany()
                      .HasForeignKey(i => i.CurrencyCode)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // ═════════════════════════════════════════════════════
            //  PLANS
            // ═════════════════════════════════════════════════════
            modelBuilder.Entity<Plan>(entity =>
            {
                entity.ToTable("plans", t =>
                {
                    t.HasCheckConstraint("CK_Plan_Prices", "\"PricePerMonth\" >= 0 AND \"PricePerYear\" >= 0");
                });

                entity.HasKey(p => p.Id);

                entity.Property(p => p.Code).HasMaxLength(30).IsRequired();
                entity.Property(p => p.Name).HasMaxLength(100).IsRequired();
                entity.Property(p => p.Description).HasMaxLength(500);

                entity.Property(p => p.CurrencyCode).HasMaxLength(3).IsFixedLength().HasDefaultValue("MAD");
                entity.Property(p => p.PricePerMonth).HasColumnType("decimal(18,2)");
                entity.Property(p => p.PricePerYear).HasColumnType("decimal(18,2)");

                entity.Property(p => p.BillingCycle).HasConversion<string>().HasMaxLength(20);

                entity.Property(p => p.IsActive).HasDefaultValue(true);
                entity.Property(p => p.CreatedAt).HasDefaultValueSql("NOW()");

                entity.HasIndex(p => p.Code).IsUnique();

                entity.HasData(
                    new Plan
                    {
                        Id = 1,
                        Code = "free",
                        Name = "Free",
                        Description = "Basic digital menu to get started.",
                        IsFree = true,
                        CurrencyCode = "MAD",
                        PricePerMonth = 0m,
                        PricePerYear = 0m,
                        BillingCycle = BillingCycle.None,
                        ExpirationAfterDays = null,
                        MaxUsers = 2,
                        MaxCategories = 5,
                        MaxMenuItems = 20,
                        MaxTables = 5,
                        MaxRoles = 1,
                        MaxImagesPerMenuItem = 1,
                        MaxLanguages = 2,
                        DisplayOrder = 1,
                        IsActive = true,
                        CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                    },
                    new Plan
                    {
                        Id = 2,
                        Code = "pro",
                        Name = "Pro",
                        Description = "AI agent and higher limits for growing restaurants.",
                        IsFree = false,
                        CurrencyCode = "MAD",
                        PricePerMonth = 199m,
                        PricePerYear = 1990m,
                        BillingCycle = BillingCycle.Monthly,
                        ExpirationAfterDays = 30,
                        MaxUsers = 5,
                        MaxCategories = 20,
                        MaxMenuItems = 150,
                        MaxTables = 30,
                        MaxImagesPerMenuItem = 3,
                        MaxLanguages = 5,
                        DisplayOrder = 2,
                        MaxRoles = 3 ,
                        IsActive = true,
                        CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                    },
                    new Plan
                    {
                        Id = 3,
                        Code = "professional",
                        Name = "Professional",
                        Description = "Data analyst, chatbot, extra users and top limits.",
                        IsFree = false,
                        CurrencyCode = "MAD",
                        PricePerMonth = 499m,
                        PricePerYear = 4990m,
                        BillingCycle = BillingCycle.Monthly,
                        ExpirationAfterDays = 30,
                        MaxUsers = 15,
                        MaxCategories = Plan.Unlimited,
                        MaxMenuItems = Plan.Unlimited,
                        MaxTables = Plan.Unlimited,
                        MaxImagesPerMenuItem = 6,
                        MaxLanguages = 9,
                        MaxRoles = 9,
                        DisplayOrder = 3,
                        IsActive = true,
                        CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                    }
                );
            });

            // ═════════════════════════════════════════════════════
            //  ACCESS CONTROL  (Features, Plan features, Roles)
            // ═════════════════════════════════════════════════════
            modelBuilder.Entity<Feature>(entity =>
            {
                entity.ToTable("features");
                entity.HasKey(f => f.Id);

                entity.Property(f => f.Code).HasMaxLength(50).IsRequired();
                entity.Property(f => f.Name).HasMaxLength(100).IsRequired();
                entity.Property(f => f.Status).HasConversion<string>().HasMaxLength(20);

                entity.HasIndex(f => f.Code).IsUnique();
            });

            modelBuilder.Entity<PlanFeature>(entity =>
            {
                entity.ToTable("plan_features");
                entity.HasKey(x => new { x.PlanId, x.FeatureId });

                entity.HasOne(x => x.Plan)
                      .WithMany(p => p.PlanFeatures)
                      .HasForeignKey(x => x.PlanId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(x => x.Feature)
                      .WithMany(f => f.PlanFeatures)
                      .HasForeignKey(x => x.FeatureId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(x => x.FeatureId);
            });

            modelBuilder.Entity<Role>(entity =>
            {
                entity.ToTable("roles");
                entity.HasKey(r => r.Id);

                entity.Property(r => r.Name).HasMaxLength(100).IsRequired();
                entity.Property(r => r.IsSystem).HasDefaultValue(false);
                entity.Property(r => r.CreatedAt).HasDefaultValueSql("NOW()");

                entity.HasIndex(r => r.TenantId);

                // PostgreSQL treats NULLs as distinct, so two filtered indexes are needed
                entity.HasIndex(r => new { r.TenantId, r.Name })
                      .IsUnique()
                      .HasFilter("\"TenantId\" IS NOT NULL")
                      .HasDatabaseName("UQ_Role_Name_PerTenant");

                entity.HasIndex(r => r.Name)
                      .IsUnique()
                      .HasFilter("\"TenantId\" IS NULL")
                      .HasDatabaseName("UQ_Role_Name_Platform");

                entity.HasOne(r => r.Tenant)
                      .WithMany()
                      .HasForeignKey(r => r.TenantId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<RolePermission>(entity =>
            {
                entity.ToTable("role_permissions");
                entity.HasKey(x => new { x.RoleId, x.FeatureId });

                entity.Property(x => x.CanRead).HasDefaultValue(false);
                entity.Property(x => x.CanAdd).HasDefaultValue(false);
                entity.Property(x => x.CanEdit).HasDefaultValue(false);
                entity.Property(x => x.CanDelete).HasDefaultValue(false);

                entity.HasOne(x => x.Role)
                      .WithMany(r => r.Permissions)
                      .HasForeignKey(x => x.RoleId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(x => x.Feature)
                      .WithMany(f => f.RolePermissions)
                      .HasForeignKey(x => x.FeatureId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(x => x.FeatureId);
            });

            modelBuilder.Entity<TenantUserRole>(entity =>
            {
                entity.ToTable("user_roles");
                entity.HasKey(x => new { x.UserId, x.RoleId });

                entity.HasOne(x => x.User)
                      .WithMany(u => u.UserRoles)
                      .HasForeignKey(x => x.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(x => x.Role)
                      .WithMany(r => r.UserRoles)
                      .HasForeignKey(x => x.RoleId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(x => x.RoleId);
            });

            SeedAccessControl(modelBuilder);
        }

        private static void SeedAccessControl(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Feature>().HasData(
                new Feature { Id = FeatureIds.Menu, Code = FeatureCodes.Menu, Name = "Menu", Status = FeatureStatus.Available },
                new Feature { Id = FeatureIds.Categories, Code = FeatureCodes.Categories, Name = "Categories", Status = FeatureStatus.Available },
                new Feature { Id = FeatureIds.Tables, Code = FeatureCodes.Tables, Name = "Tables", Status = FeatureStatus.Available },
                new Feature { Id = FeatureIds.Orders, Code = FeatureCodes.Orders, Name = "Orders", Status = FeatureStatus.Available },
                new Feature { Id = FeatureIds.Invoices, Code = FeatureCodes.Invoices, Name = "Invoices", Status = FeatureStatus.ComingSoon },
                new Feature { Id = FeatureIds.Users, Code = FeatureCodes.Users, Name = "Users", Status = FeatureStatus.ComingSoon },
                new Feature { Id = FeatureIds.Roles, Code = FeatureCodes.Roles, Name = "Roles", Status = FeatureStatus.ComingSoon },
                new Feature { Id = FeatureIds.AiAgent, Code = FeatureCodes.AiAgent, Name = "AI Agent", Status = FeatureStatus.ComingSoon },
                new Feature { Id = FeatureIds.DataAnalyst, Code = FeatureCodes.DataAnalyst, Name = "Data Analyst", Status = FeatureStatus.ComingSoon },
                new Feature { Id = FeatureIds.Chatbot, Code = FeatureCodes.Chatbot, Name = "Chatbot", Status = FeatureStatus.ComingSoon },
                new Feature { Id = FeatureIds.Notifications, Code = FeatureCodes.Notifications, Name = "Notifications", Status = FeatureStatus.Available },
                new Feature { Id = FeatureIds.PaymentMethods, Code = FeatureCodes.PaymentMethods, Name = "Payment Methods", Status = FeatureStatus.Available },
                new Feature { Id = FeatureIds.PaymentStatuses, Code = FeatureCodes.PaymentStatuses, Name = "Payment Statuses", Status = FeatureStatus.ComingSoon },
                new Feature { Id = FeatureIds.NfcTags, Code = FeatureCodes.NfcTags, Name = "NFC Tags", Status = FeatureStatus.ComingSoon },
                new Feature { Id = FeatureIds.Settings, Code = FeatureCodes.Settings, Name = "Settings", Status = FeatureStatus.Available },
                new Feature { Id = FeatureIds.Subscription, Code = FeatureCodes.Subscription, Name = "Subscription", Status = FeatureStatus.Available },
                new Feature { Id = FeatureIds.Employees, Code = FeatureCodes.Employees, Name = "Employees", Status = FeatureStatus.ComingSoon },
                new Feature { Id = FeatureIds.Departments, Code = FeatureCodes.Departments, Name = "Departments", Status = FeatureStatus.ComingSoon },
                new Feature { Id = FeatureIds.JobTitles, Code = FeatureCodes.JobTitles, Name = "Job Titles", Status = FeatureStatus.ComingSoon },
                new Feature { Id = FeatureIds.LeaveManagement, Code = FeatureCodes.LeaveManagement, Name = "Leave Management", Status = FeatureStatus.ComingSoon },
                new Feature { Id = FeatureIds.Attendance, Code = FeatureCodes.Attendance, Name = "Attendance", Status = FeatureStatus.ComingSoon },
                new Feature { Id = FeatureIds.Payroll, Code = FeatureCodes.Payroll, Name = "Payroll", Status = FeatureStatus.ComingSoon },
                new Feature { Id = FeatureIds.AuditLog, Code = FeatureCodes.AuditLog, Name = "Audit Log", Status = FeatureStatus.ComingSoon },
                new Feature { Id = FeatureIds.HRGeneralSettings, Code = FeatureCodes.HRGeneralSettings, Name = "HR General Settings", Status = FeatureStatus.ComingSoon }
            );

            var planFeatures = new List<PlanFeature>();

            void Add(int planId, Guid featureId)
            {
                planFeatures.Add(new PlanFeature { PlanId = planId, FeatureId = featureId });
            }

            void AddFor(IReadOnlyList<int> planIds, params Guid[] featureIds)
            {
                foreach (var planId in planIds)
                {
                    foreach (var featureId in featureIds)
                    {
                        Add(planId, featureId);
                    }
                }
            }

            var allPlans = new[] { 1, 2, 3 };
            var proPlans = new[] { 2, 3 };
            var professionalPlan = new[] { 3 };

            AddFor(allPlans, FeatureIds.Menu, FeatureIds.Categories, FeatureIds.Tables, FeatureIds.Orders, FeatureIds.Users , FeatureIds.Roles);
            AddFor(proPlans, FeatureIds.Invoices,FeatureIds.AiAgent);
            AddFor(professionalPlan, FeatureIds.DataAnalyst, FeatureIds.Chatbot);

            AddFor(allPlans, FeatureIds.Notifications, FeatureIds.Settings, FeatureIds.Subscription, FeatureIds.Employees, FeatureIds.Departments, FeatureIds.JobTitles);
            AddFor(proPlans, FeatureIds.PaymentMethods, FeatureIds.PaymentStatuses, FeatureIds.NfcTags, FeatureIds.LeaveManagement, FeatureIds.Attendance, FeatureIds.Payroll);
            AddFor(professionalPlan, FeatureIds.AuditLog, FeatureIds.HRGeneralSettings);

            modelBuilder.Entity<PlanFeature>().HasData(planFeatures.ToArray());

            // ── Role: TenantAdmin (platform template, protected) ─────────────
            modelBuilder.Entity<Role>().HasData(new Role
            {
                Id = RoleIds.TenantAdmin,
                TenantId = null,                       // null = platform role / template
                Name = "TenantAdmin",
                Description = "All Permissions",
                IsSystem = true,                       // tenants cannot edit or delete it
                CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)   // fixed, not UtcNow
            });
            var tenantAdminPermissions = planFeatures
                .Where(pf => pf.PlanId == 1)        
                .Select(pf => new RolePermission
                {
                    RoleId = RoleIds.TenantAdmin,
                    FeatureId = pf.FeatureId,
                    CanRead = true,
                    CanAdd = true,
                    CanEdit = true,
                    CanDelete = true
                })
                .ToArray();

            modelBuilder.Entity<RolePermission>().HasData(tenantAdminPermissions);
        }
    }
}