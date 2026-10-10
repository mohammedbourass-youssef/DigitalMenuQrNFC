using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace NFC_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentMethods : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "payment_methods",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Color = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Icon = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_methods", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "payment_method_translations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PaymentMethodId = table.Column<int>(type: "integer", nullable: false),
                    Lang = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_method_translations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_payment_method_translations_payment_methods_PaymentMethodId",
                        column: x => x.PaymentMethodId,
                        principalTable: "payment_methods",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tenant_payment_methods",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentMethodId = table.Column<int>(type: "integer", nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tenant_payment_methods", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tenant_payment_methods_payment_methods_PaymentMethodId",
                        column: x => x.PaymentMethodId,
                        principalTable: "payment_methods",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tenant_payment_methods_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "payment_methods",
                columns: new[] { "Id", "Code", "Color", "DisplayOrder", "Icon", "IsActive" },
                values: new object[,]
                {
                    { 1, "CASH", "#10B981", 1, "banknote", true },
                    { 2, "CARD", "#3B82F6", 2, "credit-card", true },
                    { 3, "BANK_TRANSFER", "#6366F1", 3, "landmark", true },
                    { 4, "MOBILE", "#F59E0B", 4, "smartphone", true }
                });

            migrationBuilder.InsertData(
                table: "payment_method_translations",
                columns: new[] { "Id", "Description", "Lang", "Name", "PaymentMethodId" },
                values: new object[,]
                {
                    { 1, null, "fr", "Espèces", 1 },
                    { 2, null, "ar", "نقدًا", 1 },
                    { 3, null, "en", "Cash", 1 },
                    { 4, null, "es", "Efectivo", 1 },
                    { 5, null, "it", "Contanti", 1 },
                    { 6, null, "ja", "現金", 1 },
                    { 7, null, "zh", "现金", 1 },
                    { 8, null, "ko", "현금", 1 },
                    { 9, null, "de", "Bargeld", 1 },
                    { 10, null, "fr", "Carte bancaire", 2 },
                    { 11, null, "ar", "بطاقة بنكية", 2 },
                    { 12, null, "en", "Card", 2 },
                    { 13, null, "es", "Tarjeta", 2 },
                    { 14, null, "it", "Carta", 2 },
                    { 15, null, "ja", "カード", 2 },
                    { 16, null, "zh", "银行卡", 2 },
                    { 17, null, "ko", "카드", 2 },
                    { 18, null, "de", "Karte", 2 },
                    { 19, null, "fr", "Virement bancaire", 3 },
                    { 20, null, "ar", "تحويل بنكي", 3 },
                    { 21, null, "en", "Bank transfer", 3 },
                    { 22, null, "es", "Transferencia bancaria", 3 },
                    { 23, null, "it", "Bonifico bancario", 3 },
                    { 24, null, "ja", "銀行振込", 3 },
                    { 25, null, "zh", "银行转账", 3 },
                    { 26, null, "ko", "계좌이체", 3 },
                    { 27, null, "de", "Banküberweisung", 3 },
                    { 28, null, "fr", "Paiement mobile", 4 },
                    { 29, null, "ar", "الدفع عبر الهاتف", 4 },
                    { 30, null, "en", "Mobile payment", 4 },
                    { 31, null, "es", "Pago móvil", 4 },
                    { 32, null, "it", "Pagamento mobile", 4 },
                    { 33, null, "ja", "モバイル決済", 4 },
                    { 34, null, "zh", "移动支付", 4 },
                    { 35, null, "ko", "모바일 결제", 4 },
                    { 36, null, "de", "Mobile Zahlung", 4 }
                });

            migrationBuilder.CreateIndex(
                name: "UQ_PaymentMethodTranslation_Lang",
                table: "payment_method_translations",
                columns: new[] { "PaymentMethodId", "Lang" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payment_methods_Code",
                table: "payment_methods",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tenant_payment_methods_PaymentMethodId",
                table: "tenant_payment_methods",
                column: "PaymentMethodId");

            migrationBuilder.CreateIndex(
                name: "UQ_TenantPaymentMethod",
                table: "tenant_payment_methods",
                columns: new[] { "TenantId", "PaymentMethodId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ_TenantPaymentMethod_Default",
                table: "tenant_payment_methods",
                column: "TenantId",
                unique: true,
                filter: "\"IsDefault\" = true");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "payment_method_translations");

            migrationBuilder.DropTable(
                name: "tenant_payment_methods");

            migrationBuilder.DropTable(
                name: "payment_methods");
        }
    }
}
