using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace NFC_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddOrders : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "order_statuses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Color = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsFinal = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_order_statuses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "payment_statuses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Color = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_statuses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "order_status_translations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OrderStatusId = table.Column<int>(type: "integer", nullable: false),
                    Lang = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_order_status_translations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_order_status_translations_order_statuses_OrderStatusId",
                        column: x => x.OrderStatusId,
                        principalTable: "order_statuses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "orders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    TableId = table.Column<Guid>(type: "uuid", nullable: true),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: true),
                    OrderNumber = table.Column<int>(type: "integer", nullable: false),
                    StatusId = table.Column<int>(type: "integer", nullable: false),
                    PaymentStatusId = table.Column<int>(type: "integer", nullable: false),
                    CurrencyCode = table.Column<string>(type: "character(3)", fixedLength: true, maxLength: 3, nullable: false),
                    Subtotal = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Total = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    PaidAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false, defaultValue: 0m),
                    PaidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_orders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_orders_Currencies_CurrencyCode",
                        column: x => x.CurrencyCode,
                        principalTable: "Currencies",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_orders_order_statuses_StatusId",
                        column: x => x.StatusId,
                        principalTable: "order_statuses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_orders_payment_statuses_PaymentStatusId",
                        column: x => x.PaymentStatusId,
                        principalTable: "payment_statuses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_orders_sessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "sessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_orders_tables_TableId",
                        column: x => x.TableId,
                        principalTable: "tables",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_orders_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "payment_status_translations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PaymentStatusId = table.Column<int>(type: "integer", nullable: false),
                    Lang = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_status_translations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_payment_status_translations_payment_statuses_PaymentStatusId",
                        column: x => x.PaymentStatusId,
                        principalTable: "payment_statuses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "order_items",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    MenuItemId = table.Column<Guid>(type: "uuid", nullable: true),
                    NameSnapshot = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    LineTotal = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Notes = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_order_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_order_items_MenuItems_MenuItemId",
                        column: x => x.MenuItemId,
                        principalTable: "MenuItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_order_items_orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "order_status_history",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    StatusId = table.Column<int>(type: "integer", nullable: false),
                    ChangedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ChangedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_order_status_history", x => x.Id);
                    table.ForeignKey(
                        name: "FK_order_status_history_order_statuses_StatusId",
                        column: x => x.StatusId,
                        principalTable: "order_statuses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_order_status_history_orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_order_status_history_users_ChangedByUserId",
                        column: x => x.ChangedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.InsertData(
                table: "order_statuses",
                columns: new[] { "Id", "Code", "Color", "DisplayOrder", "IsActive", "IsFinal" },
                values: new object[,]
                {
                    { 1, "new", "#3B82F6", 1, true, false },
                    { 2, "preparing", "#F59E0B", 2, true, false },
                    { 3, "completed", "#10B981", 3, true, true },
                    { 4, "cancelled", "#EF4444", 4, true, true }
                });

            migrationBuilder.InsertData(
                table: "payment_statuses",
                columns: new[] { "Id", "Code", "Color", "DisplayOrder", "IsActive" },
                values: new object[,]
                {
                    { 1, "unpaid", "#EF4444", 1, true },
                    { 2, "partial", "#F59E0B", 2, true },
                    { 3, "paid", "#10B981", 3, true },
                    { 4, "refunded", "#6B7280", 4, true }
                });

            migrationBuilder.InsertData(
                table: "order_status_translations",
                columns: new[] { "Id", "Lang", "Name", "OrderStatusId" },
                values: new object[,]
                {
                    { 100, "fr", "Nouvelle", 1 },
                    { 101, "ar", "جديد", 1 },
                    { 102, "en", "New", 1 },
                    { 103, "es", "Nueva", 1 },
                    { 104, "it", "Nuovo", 1 },
                    { 105, "ja", "新規", 1 },
                    { 106, "zh", "新订单", 1 },
                    { 107, "ko", "신규", 1 },
                    { 108, "de", "Neu", 1 },
                    { 200, "fr", "En préparation", 2 },
                    { 201, "ar", "قيد التحضير", 2 },
                    { 202, "en", "Preparing", 2 },
                    { 203, "es", "En preparación", 2 },
                    { 204, "it", "In preparazione", 2 },
                    { 205, "ja", "準備中", 2 },
                    { 206, "zh", "准备中", 2 },
                    { 207, "ko", "준비 중", 2 },
                    { 208, "de", "In Zubereitung", 2 },
                    { 300, "fr", "Terminée", 3 },
                    { 301, "ar", "مكتمل", 3 },
                    { 302, "en", "Completed", 3 },
                    { 303, "es", "Completada", 3 },
                    { 304, "it", "Completato", 3 },
                    { 305, "ja", "完了", 3 },
                    { 306, "zh", "已完成", 3 },
                    { 307, "ko", "완료", 3 },
                    { 308, "de", "Abgeschlossen", 3 },
                    { 400, "fr", "Annulée", 4 },
                    { 401, "ar", "ملغي", 4 },
                    { 402, "en", "Cancelled", 4 },
                    { 403, "es", "Cancelada", 4 },
                    { 404, "it", "Annullato", 4 },
                    { 405, "ja", "キャンセル", 4 },
                    { 406, "zh", "已取消", 4 },
                    { 407, "ko", "취소됨", 4 },
                    { 408, "de", "Storniert", 4 }
                });

            migrationBuilder.InsertData(
                table: "payment_status_translations",
                columns: new[] { "Id", "Lang", "Name", "PaymentStatusId" },
                values: new object[,]
                {
                    { 100, "fr", "Non payée", 1 },
                    { 101, "ar", "غير مدفوع", 1 },
                    { 102, "en", "Unpaid", 1 },
                    { 103, "es", "Sin pagar", 1 },
                    { 104, "it", "Non pagato", 1 },
                    { 105, "ja", "未払い", 1 },
                    { 106, "zh", "未支付", 1 },
                    { 107, "ko", "미결제", 1 },
                    { 108, "de", "Unbezahlt", 1 },
                    { 200, "fr", "Partiellement payée", 2 },
                    { 201, "ar", "مدفوع جزئياً", 2 },
                    { 202, "en", "Partially paid", 2 },
                    { 203, "es", "Pago parcial", 2 },
                    { 204, "it", "Pagato parzialmente", 2 },
                    { 205, "ja", "一部支払済み", 2 },
                    { 206, "zh", "部分支付", 2 },
                    { 207, "ko", "부분 결제", 2 },
                    { 208, "de", "Teilweise bezahlt", 2 },
                    { 300, "fr", "Payée", 3 },
                    { 301, "ar", "مدفوع", 3 },
                    { 302, "en", "Paid", 3 },
                    { 303, "es", "Pagado", 3 },
                    { 304, "it", "Pagato", 3 },
                    { 305, "ja", "支払済み", 3 },
                    { 306, "zh", "已支付", 3 },
                    { 307, "ko", "결제 완료", 3 },
                    { 308, "de", "Bezahlt", 3 },
                    { 400, "fr", "Remboursée", 4 },
                    { 401, "ar", "مسترجع", 4 },
                    { 402, "en", "Refunded", 4 },
                    { 403, "es", "Reembolsado", 4 },
                    { 404, "it", "Rimborsato", 4 },
                    { 405, "ja", "返金済み", 4 },
                    { 406, "zh", "已退款", 4 },
                    { 407, "ko", "환불됨", 4 },
                    { 408, "de", "Erstattet", 4 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_order_items_MenuItemId",
                table: "order_items",
                column: "MenuItemId");

            migrationBuilder.CreateIndex(
                name: "IX_order_items_OrderId",
                table: "order_items",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_order_status_history_ChangedByUserId",
                table: "order_status_history",
                column: "ChangedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_order_status_history_OrderId",
                table: "order_status_history",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_order_status_history_StatusId",
                table: "order_status_history",
                column: "StatusId");

            migrationBuilder.CreateIndex(
                name: "UQ_OrderStatusTranslation_Lang",
                table: "order_status_translations",
                columns: new[] { "OrderStatusId", "Lang" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_order_statuses_Code",
                table: "order_statuses",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_orders_CurrencyCode",
                table: "orders",
                column: "CurrencyCode");

            migrationBuilder.CreateIndex(
                name: "IX_orders_PaymentStatusId",
                table: "orders",
                column: "PaymentStatusId");

            migrationBuilder.CreateIndex(
                name: "IX_orders_SessionId",
                table: "orders",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_orders_StatusId",
                table: "orders",
                column: "StatusId");

            migrationBuilder.CreateIndex(
                name: "IX_orders_TableId",
                table: "orders",
                column: "TableId");

            migrationBuilder.CreateIndex(
                name: "IX_orders_TenantId",
                table: "orders",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_orders_TenantId_CreatedAt",
                table: "orders",
                columns: new[] { "TenantId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_orders_TenantId_PaymentStatusId",
                table: "orders",
                columns: new[] { "TenantId", "PaymentStatusId" });

            migrationBuilder.CreateIndex(
                name: "IX_orders_TenantId_StatusId",
                table: "orders",
                columns: new[] { "TenantId", "StatusId" });

            migrationBuilder.CreateIndex(
                name: "UQ_Order_Number_PerTenant",
                table: "orders",
                columns: new[] { "TenantId", "OrderNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ_PaymentStatusTranslation_Lang",
                table: "payment_status_translations",
                columns: new[] { "PaymentStatusId", "Lang" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payment_statuses_Code",
                table: "payment_statuses",
                column: "Code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "order_items");

            migrationBuilder.DropTable(
                name: "order_status_history");

            migrationBuilder.DropTable(
                name: "order_status_translations");

            migrationBuilder.DropTable(
                name: "payment_status_translations");

            migrationBuilder.DropTable(
                name: "orders");

            migrationBuilder.DropTable(
                name: "order_statuses");

            migrationBuilder.DropTable(
                name: "payment_statuses");
        }
    }
}