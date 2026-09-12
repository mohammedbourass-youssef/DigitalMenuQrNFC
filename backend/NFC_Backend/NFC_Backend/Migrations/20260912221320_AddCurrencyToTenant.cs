using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace NFC_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddCurrencyToTenant : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CurrencyCode",
                table: "tenants",
                type: "character(3)",
                fixedLength: true,
                maxLength: 3,
                nullable: false,
                defaultValue: "MAD");

            migrationBuilder.CreateTable(
                name: "Currencies",
                columns: table => new
                {
                    Code = table.Column<string>(type: "character(3)", fixedLength: true, maxLength: 3, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Symbol = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    DecimalPlaces = table.Column<byte>(type: "smallint", nullable: false, defaultValue: (byte)2),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Currencies", x => x.Code);
                });

            migrationBuilder.CreateTable(
                name: "ExchangeRates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    BaseCurrency = table.Column<string>(type: "character(3)", fixedLength: true, maxLength: 3, nullable: false),
                    TargetCurrency = table.Column<string>(type: "character(3)", fixedLength: true, maxLength: 3, nullable: false),
                    Rate = table.Column<decimal>(type: "numeric(18,6)", nullable: false),
                    RateDate = table.Column<DateOnly>(type: "date", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExchangeRates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExchangeRates_Currencies_BaseCurrency",
                        column: x => x.BaseCurrency,
                        principalTable: "Currencies",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ExchangeRates_Currencies_TargetCurrency",
                        column: x => x.TargetCurrency,
                        principalTable: "Currencies",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "Currencies",
                columns: new[] { "Code", "DecimalPlaces", "IsActive", "Name", "Symbol" },
                values: new object[,]
                {
                    { "CNY", (byte)2, true, "Yuan chinois", "¥" },
                    { "EUR", (byte)2, true, "Euro", "€" },
                    { "GBP", (byte)2, true, "Livre sterling", "£" }
                });

            migrationBuilder.InsertData(
                table: "Currencies",
                columns: new[] { "Code", "IsActive", "Name", "Symbol" },
                values: new object[,]
                {
                    { "JPY", true, "Yen japonais", "¥" },
                    { "KRW", true, "Won coréen", "₩" }
                });

            migrationBuilder.InsertData(
                table: "Currencies",
                columns: new[] { "Code", "DecimalPlaces", "IsActive", "Name", "Symbol" },
                values: new object[,]
                {
                    { "MAD", (byte)2, true, "Dirham marocain", "DH" },
                    { "USD", (byte)2, true, "Dollar américain", "$" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_tenants_CurrencyCode",
                table: "tenants",
                column: "CurrencyCode");

            migrationBuilder.CreateIndex(
                name: "IX_ExchangeRates_TargetCurrency",
                table: "ExchangeRates",
                column: "TargetCurrency");

            migrationBuilder.CreateIndex(
                name: "UQ_Rate",
                table: "ExchangeRates",
                columns: new[] { "BaseCurrency", "TargetCurrency", "RateDate" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_tenants_Currencies_CurrencyCode",
                table: "tenants",
                column: "CurrencyCode",
                principalTable: "Currencies",
                principalColumn: "Code",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_tenants_Currencies_CurrencyCode",
                table: "tenants");

            migrationBuilder.DropTable(
                name: "ExchangeRates");

            migrationBuilder.DropTable(
                name: "Currencies");

            migrationBuilder.DropIndex(
                name: "IX_tenants_CurrencyCode",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "CurrencyCode",
                table: "tenants");
        }
    }
}
