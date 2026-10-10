using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NFC_Backend.Migrations
{
    /// <inheritdoc />
    public partial class ChangestheDefaultsIsSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsSystem",
                table: "payment_statuses",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.UpdateData(
                table: "payment_statuses",
                keyColumn: "Id",
                keyValue: 1,
                column: "IsSystem",
                value: true);

            migrationBuilder.UpdateData(
                table: "payment_statuses",
                keyColumn: "Id",
                keyValue: 2,
                column: "IsSystem",
                value: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsSystem",
                table: "payment_statuses");
        }
    }
}
