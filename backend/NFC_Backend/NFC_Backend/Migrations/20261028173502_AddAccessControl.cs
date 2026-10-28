using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace NFC_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAccessControl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "features",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_features", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "roles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: true),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IsSystem = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_roles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_roles_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "plan_features",
                columns: table => new
                {
                    PlanId = table.Column<int>(type: "integer", nullable: false),
                    FeatureId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_plan_features", x => new { x.PlanId, x.FeatureId });
                    table.ForeignKey(
                        name: "FK_plan_features_features_FeatureId",
                        column: x => x.FeatureId,
                        principalTable: "features",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_plan_features_plans_PlanId",
                        column: x => x.PlanId,
                        principalTable: "plans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "role_permissions",
                columns: table => new
                {
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                    FeatureId = table.Column<Guid>(type: "uuid", nullable: false),
                    CanRead = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CanAdd = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CanEdit = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CanDelete = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_role_permissions", x => new { x.RoleId, x.FeatureId });
                    table.ForeignKey(
                        name: "FK_role_permissions_features_FeatureId",
                        column: x => x.FeatureId,
                        principalTable: "features",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_role_permissions_roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_roles",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_roles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_user_roles_roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_user_roles_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "features",
                columns: new[] { "Id", "Code", "Name", "Status" },
                values: new object[,]
                {
                    { new Guid("a1000000-0000-0000-0000-000000000001"), "Menu", "Menu", "Available" },
                    { new Guid("a1000000-0000-0000-0000-000000000002"), "Categories", "Categories", "Available" },
                    { new Guid("a1000000-0000-0000-0000-000000000003"), "Tables", "Tables", "Available" },
                    { new Guid("a1000000-0000-0000-0000-000000000004"), "Orders", "Orders", "Available" },
                    { new Guid("a1000000-0000-0000-0000-000000000005"), "Invoices", "Invoices", "ComingSoon" },
                    { new Guid("a1000000-0000-0000-0000-000000000006"), "Users", "Users", "ComingSoon" },
                    { new Guid("a1000000-0000-0000-0000-000000000007"), "Roles", "Roles", "ComingSoon" },
                    { new Guid("a1000000-0000-0000-0000-000000000008"), "AiAgent", "AI Agent", "ComingSoon" },
                    { new Guid("a1000000-0000-0000-0000-000000000009"), "DataAnalyst", "Data Analyst", "ComingSoon" },
                    { new Guid("a1000000-0000-0000-0000-00000000000a"), "Chatbot", "Chatbot", "ComingSoon" },
                    { new Guid("a1000000-0000-0000-0000-00000000000b"), "Notifications", "Notifications", "Available" },
                    { new Guid("a1000000-0000-0000-0000-00000000000c"), "PaymentMethods", "Payment Methods", "Available" },
                    { new Guid("a1000000-0000-0000-0000-00000000000d"), "PaymentStatuses", "Payment Statuses", "ComingSoon" },
                    { new Guid("a1000000-0000-0000-0000-00000000000e"), "NfcTags", "NFC Tags", "ComingSoon" },
                    { new Guid("a1000000-0000-0000-0000-00000000000f"), "Settings", "Settings", "Available" },
                    { new Guid("a1000000-0000-0000-0000-000000000010"), "Subscription", "Subscription", "Available" },
                    { new Guid("a1000000-0000-0000-0000-000000000011"), "Employees", "Employees", "ComingSoon" },
                    { new Guid("a1000000-0000-0000-0000-000000000012"), "Departments", "Departments", "ComingSoon" },
                    { new Guid("a1000000-0000-0000-0000-000000000013"), "JobTitles", "Job Titles", "ComingSoon" },
                    { new Guid("a1000000-0000-0000-0000-000000000014"), "LeaveManagement", "Leave Management", "ComingSoon" },
                    { new Guid("a1000000-0000-0000-0000-000000000015"), "Attendance", "Attendance", "ComingSoon" },
                    { new Guid("a1000000-0000-0000-0000-000000000016"), "Payroll", "Payroll", "ComingSoon" },
                    { new Guid("a1000000-0000-0000-0000-000000000017"), "AuditLog", "Audit Log", "ComingSoon" },
                    { new Guid("a1000000-0000-0000-0000-000000000018"), "HRGeneralSettings", "HR General Settings", "ComingSoon" }
                });

            migrationBuilder.InsertData(
                table: "plan_features",
                columns: new[] { "FeatureId", "PlanId" },
                values: new object[,]
                {
                    { new Guid("a1000000-0000-0000-0000-000000000001"), 1 },
                    { new Guid("a1000000-0000-0000-0000-000000000002"), 1 },
                    { new Guid("a1000000-0000-0000-0000-000000000003"), 1 },
                    { new Guid("a1000000-0000-0000-0000-000000000004"), 1 },
                    { new Guid("a1000000-0000-0000-0000-000000000006"), 1 },
                    { new Guid("a1000000-0000-0000-0000-00000000000b"), 1 },
                    { new Guid("a1000000-0000-0000-0000-00000000000f"), 1 },
                    { new Guid("a1000000-0000-0000-0000-000000000010"), 1 },
                    { new Guid("a1000000-0000-0000-0000-000000000011"), 1 },
                    { new Guid("a1000000-0000-0000-0000-000000000012"), 1 },
                    { new Guid("a1000000-0000-0000-0000-000000000013"), 1 },
                    { new Guid("a1000000-0000-0000-0000-000000000001"), 2 },
                    { new Guid("a1000000-0000-0000-0000-000000000002"), 2 },
                    { new Guid("a1000000-0000-0000-0000-000000000003"), 2 },
                    { new Guid("a1000000-0000-0000-0000-000000000004"), 2 },
                    { new Guid("a1000000-0000-0000-0000-000000000005"), 2 },
                    { new Guid("a1000000-0000-0000-0000-000000000006"), 2 },
                    { new Guid("a1000000-0000-0000-0000-000000000007"), 2 },
                    { new Guid("a1000000-0000-0000-0000-000000000008"), 2 },
                    { new Guid("a1000000-0000-0000-0000-00000000000b"), 2 },
                    { new Guid("a1000000-0000-0000-0000-00000000000c"), 2 },
                    { new Guid("a1000000-0000-0000-0000-00000000000d"), 2 },
                    { new Guid("a1000000-0000-0000-0000-00000000000e"), 2 },
                    { new Guid("a1000000-0000-0000-0000-00000000000f"), 2 },
                    { new Guid("a1000000-0000-0000-0000-000000000010"), 2 },
                    { new Guid("a1000000-0000-0000-0000-000000000011"), 2 },
                    { new Guid("a1000000-0000-0000-0000-000000000012"), 2 },
                    { new Guid("a1000000-0000-0000-0000-000000000013"), 2 },
                    { new Guid("a1000000-0000-0000-0000-000000000014"), 2 },
                    { new Guid("a1000000-0000-0000-0000-000000000015"), 2 },
                    { new Guid("a1000000-0000-0000-0000-000000000016"), 2 },
                    { new Guid("a1000000-0000-0000-0000-000000000001"), 3 },
                    { new Guid("a1000000-0000-0000-0000-000000000002"), 3 },
                    { new Guid("a1000000-0000-0000-0000-000000000003"), 3 },
                    { new Guid("a1000000-0000-0000-0000-000000000004"), 3 },
                    { new Guid("a1000000-0000-0000-0000-000000000005"), 3 },
                    { new Guid("a1000000-0000-0000-0000-000000000006"), 3 },
                    { new Guid("a1000000-0000-0000-0000-000000000007"), 3 },
                    { new Guid("a1000000-0000-0000-0000-000000000008"), 3 },
                    { new Guid("a1000000-0000-0000-0000-000000000009"), 3 },
                    { new Guid("a1000000-0000-0000-0000-00000000000a"), 3 },
                    { new Guid("a1000000-0000-0000-0000-00000000000b"), 3 },
                    { new Guid("a1000000-0000-0000-0000-00000000000c"), 3 },
                    { new Guid("a1000000-0000-0000-0000-00000000000d"), 3 },
                    { new Guid("a1000000-0000-0000-0000-00000000000e"), 3 },
                    { new Guid("a1000000-0000-0000-0000-00000000000f"), 3 },
                    { new Guid("a1000000-0000-0000-0000-000000000010"), 3 },
                    { new Guid("a1000000-0000-0000-0000-000000000011"), 3 },
                    { new Guid("a1000000-0000-0000-0000-000000000012"), 3 },
                    { new Guid("a1000000-0000-0000-0000-000000000013"), 3 },
                    { new Guid("a1000000-0000-0000-0000-000000000014"), 3 },
                    { new Guid("a1000000-0000-0000-0000-000000000015"), 3 },
                    { new Guid("a1000000-0000-0000-0000-000000000016"), 3 },
                    { new Guid("a1000000-0000-0000-0000-000000000017"), 3 },
                    { new Guid("a1000000-0000-0000-0000-000000000018"), 3 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_features_Code",
                table: "features",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_plan_features_FeatureId",
                table: "plan_features",
                column: "FeatureId");

            migrationBuilder.CreateIndex(
                name: "IX_role_permissions_FeatureId",
                table: "role_permissions",
                column: "FeatureId");

            migrationBuilder.CreateIndex(
                name: "IX_roles_TenantId",
                table: "roles",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "UQ_Role_Name_PerTenant",
                table: "roles",
                columns: new[] { "TenantId", "Name" },
                unique: true,
                filter: "\"TenantId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "UQ_Role_Name_Platform",
                table: "roles",
                column: "Name",
                unique: true,
                filter: "\"TenantId\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_user_roles_RoleId",
                table: "user_roles",
                column: "RoleId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "plan_features");

            migrationBuilder.DropTable(
                name: "role_permissions");

            migrationBuilder.DropTable(
                name: "user_roles");

            migrationBuilder.DropTable(
                name: "features");

            migrationBuilder.DropTable(
                name: "roles");
        }
    }
}
