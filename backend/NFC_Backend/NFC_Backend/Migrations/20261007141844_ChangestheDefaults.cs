using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace NFC_Backend.Migrations
{
    /// <inheritdoc />
    public partial class ChangestheDefaults : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 300);

            migrationBuilder.DeleteData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 301);

            migrationBuilder.DeleteData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 302);

            migrationBuilder.DeleteData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 303);

            migrationBuilder.DeleteData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 304);

            migrationBuilder.DeleteData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 305);

            migrationBuilder.DeleteData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 306);

            migrationBuilder.DeleteData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 307);

            migrationBuilder.DeleteData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 308);

            migrationBuilder.DeleteData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 400);

            migrationBuilder.DeleteData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 401);

            migrationBuilder.DeleteData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 402);

            migrationBuilder.DeleteData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 403);

            migrationBuilder.DeleteData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 404);

            migrationBuilder.DeleteData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 405);

            migrationBuilder.DeleteData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 406);

            migrationBuilder.DeleteData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 407);

            migrationBuilder.DeleteData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 408);

            migrationBuilder.DeleteData(
                table: "payment_statuses",
                keyColumn: "Id",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "payment_statuses",
                keyColumn: "Id",
                keyValue: 4);

            migrationBuilder.UpdateData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 200,
                column: "Name",
                value: "Payée");

            migrationBuilder.UpdateData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 201,
                column: "Name",
                value: "مدفوع");

            migrationBuilder.UpdateData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 202,
                column: "Name",
                value: "Paid");

            migrationBuilder.UpdateData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 203,
                column: "Name",
                value: "Pagado");

            migrationBuilder.UpdateData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 204,
                column: "Name",
                value: "Pagato");

            migrationBuilder.UpdateData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 205,
                column: "Name",
                value: "支払済み");

            migrationBuilder.UpdateData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 206,
                column: "Name",
                value: "已支付");

            migrationBuilder.UpdateData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 207,
                column: "Name",
                value: "결제 완료");

            migrationBuilder.UpdateData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 208,
                column: "Name",
                value: "Bezahlt");

            migrationBuilder.UpdateData(
                table: "payment_statuses",
                keyColumn: "Id",
                keyValue: 1,
                column: "Code",
                value: "NotPaid");

            migrationBuilder.UpdateData(
                table: "payment_statuses",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Code", "Color", "DisplayOrder" },
                values: new object[] { "Paid", "#10B981", 3 });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 200,
                column: "Name",
                value: "Partiellement payée");

            migrationBuilder.UpdateData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 201,
                column: "Name",
                value: "مدفوع جزئياً");

            migrationBuilder.UpdateData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 202,
                column: "Name",
                value: "Partially paid");

            migrationBuilder.UpdateData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 203,
                column: "Name",
                value: "Pago parcial");

            migrationBuilder.UpdateData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 204,
                column: "Name",
                value: "Pagato parzialmente");

            migrationBuilder.UpdateData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 205,
                column: "Name",
                value: "一部支払済み");

            migrationBuilder.UpdateData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 206,
                column: "Name",
                value: "部分支付");

            migrationBuilder.UpdateData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 207,
                column: "Name",
                value: "부분 결제");

            migrationBuilder.UpdateData(
                table: "payment_status_translations",
                keyColumn: "Id",
                keyValue: 208,
                column: "Name",
                value: "Teilweise bezahlt");

            migrationBuilder.UpdateData(
                table: "payment_statuses",
                keyColumn: "Id",
                keyValue: 1,
                column: "Code",
                value: "unpaid");

            migrationBuilder.UpdateData(
                table: "payment_statuses",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Code", "Color", "DisplayOrder" },
                values: new object[] { "partial", "#F59E0B", 2 });

            migrationBuilder.InsertData(
                table: "payment_statuses",
                columns: new[] { "Id", "Code", "Color", "DisplayOrder", "IsActive" },
                values: new object[,]
                {
                    { 3, "paid", "#10B981", 3, true },
                    { 4, "refunded", "#6B7280", 4, true }
                });

            migrationBuilder.InsertData(
                table: "payment_status_translations",
                columns: new[] { "Id", "Lang", "Name", "PaymentStatusId" },
                values: new object[,]
                {
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
        }
    }
}
