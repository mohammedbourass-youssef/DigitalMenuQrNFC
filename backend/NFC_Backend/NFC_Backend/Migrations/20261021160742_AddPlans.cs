using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace NFC_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddPlans : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BillingCycle",
                table: "tenants",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "PlanId",
                table: "tenants",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<DateTime>(
                name: "PlanStartedAt",
                table: "tenants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "plans",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsFree = table.Column<bool>(type: "boolean", nullable: false),
                    CurrencyCode = table.Column<string>(type: "character(3)", fixedLength: true, maxLength: 3, nullable: false, defaultValue: "MAD"),
                    PricePerMonth = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    PricePerYear = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    BillingCycle = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ExpirationAfterDays = table.Column<int>(type: "integer", nullable: true),
                    MaxUsers = table.Column<int>(type: "integer", nullable: false),
                    MaxCategories = table.Column<int>(type: "integer", nullable: false),
                    MaxMenuItems = table.Column<int>(type: "integer", nullable: false),
                    MaxTables = table.Column<int>(type: "integer", nullable: false),
                    MaxImagesPerMenuItem = table.Column<int>(type: "integer", nullable: false),
                    MaxLanguages = table.Column<int>(type: "integer", nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_plans", x => x.Id);
                    table.CheckConstraint("CK_Plan_Prices", "\"PricePerMonth\" >= 0 AND \"PricePerYear\" >= 0");
                });

            migrationBuilder.InsertData(
                table: "plans",
                columns: new[] { "Id", "BillingCycle", "Code", "CreatedAt", "CurrencyCode", "Description", "DisplayOrder", "ExpirationAfterDays", "IsActive", "IsFree", "MaxCategories", "MaxImagesPerMenuItem", "MaxLanguages", "MaxMenuItems", "MaxTables", "MaxUsers", "Name", "PricePerMonth", "PricePerYear", "UpdatedAt" },
                values: new object[,]
                {
                    { 1, "None", "free", new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "MAD", "Basic digital menu to get started.", 1, null, true, true, 5, 1, 2, 20, 5, 2, "Free", 0m, 0m, null },
                    { 2, "Monthly", "pro", new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "MAD", "AI agent and higher limits for growing restaurants.", 2, 30, true, false, 20, 3, 5, 150, 30, 5, "Pro", 199m, 1990m, null },
                    { 3, "Monthly", "professional", new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "MAD", "Data analyst, chatbot, extra users and top limits.", 3, 30, true, false, -1, 6, 9, -1, -1, 15, "Professional", 499m, 4990m, null }
                });

            migrationBuilder.CreateIndex(
                name: "IX_tenants_PlanId",
                table: "tenants",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_plans_Code",
                table: "plans",
                column: "Code",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_tenants_plans_PlanId",
                table: "tenants",
                column: "PlanId",
                principalTable: "plans",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_tenants_plans_PlanId",
                table: "tenants");

            migrationBuilder.DropTable(
                name: "plans");

            migrationBuilder.DropIndex(
                name: "IX_tenants_PlanId",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "BillingCycle",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "PlanId",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "PlanStartedAt",
                table: "tenants");
        }
    }
}
