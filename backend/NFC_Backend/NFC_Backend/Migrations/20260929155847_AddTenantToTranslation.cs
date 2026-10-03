using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NFC_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantToTranslation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "order_statuses",
                type: "uuid",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "order_statuses",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "Code", "TenantId" },
                values: new object[] { "NEW", null });

            migrationBuilder.UpdateData(
                table: "order_statuses",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Code", "TenantId" },
                values: new object[] { "PREPARING", null });

            migrationBuilder.UpdateData(
                table: "order_statuses",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Code", "TenantId" },
                values: new object[] { "COMPLETED", null });

            migrationBuilder.UpdateData(
                table: "order_statuses",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "Code", "TenantId" },
                values: new object[] { "CANCELLED", null });

            migrationBuilder.CreateIndex(
                name: "IX_order_statuses_TenantId",
                table: "order_statuses",
                column: "TenantId");

            migrationBuilder.AddForeignKey(
                name: "FK_order_statuses_tenants_TenantId",
                table: "order_statuses",
                column: "TenantId",
                principalTable: "tenants",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_order_statuses_tenants_TenantId",
                table: "order_statuses");

            migrationBuilder.DropIndex(
                name: "IX_order_statuses_TenantId",
                table: "order_statuses");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "order_statuses");

            migrationBuilder.UpdateData(
                table: "order_statuses",
                keyColumn: "Id",
                keyValue: 1,
                column: "Code",
                value: "new");

            migrationBuilder.UpdateData(
                table: "order_statuses",
                keyColumn: "Id",
                keyValue: 2,
                column: "Code",
                value: "preparing");

            migrationBuilder.UpdateData(
                table: "order_statuses",
                keyColumn: "Id",
                keyValue: 3,
                column: "Code",
                value: "completed");

            migrationBuilder.UpdateData(
                table: "order_statuses",
                keyColumn: "Id",
                keyValue: 4,
                column: "Code",
                value: "cancelled");
        }
    }
}
