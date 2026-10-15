using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NFC_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddCurrencyToInvoice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CurrencyCode",
                table: "invoices",
                type: "character(3)",
                fixedLength: true,
                maxLength: 3,
                nullable: false,
                defaultValue: "MAD");

            migrationBuilder.CreateIndex(
                name: "IX_invoices_CurrencyCode",
                table: "invoices",
                column: "CurrencyCode");

            migrationBuilder.AddForeignKey(
                name: "FK_invoices_Currencies_CurrencyCode",
                table: "invoices",
                column: "CurrencyCode",
                principalTable: "Currencies",
                principalColumn: "Code",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_invoices_Currencies_CurrencyCode",
                table: "invoices");

            migrationBuilder.DropIndex(
                name: "IX_invoices_CurrencyCode",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "CurrencyCode",
                table: "invoices");
        }
    }
}
