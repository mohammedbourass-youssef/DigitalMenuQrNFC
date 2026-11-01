using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NFC_Backend.Migrations
{
    /// <inheritdoc />
    public partial class RolesConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MaxRoles",
                table: "plans",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.InsertData(
                table: "plan_features",
                columns: new[] { "FeatureId", "PlanId" },
                values: new object[] { new Guid("a1000000-0000-0000-0000-000000000007"), 1 });

            migrationBuilder.UpdateData(
                table: "plans",
                keyColumn: "Id",
                keyValue: 1,
                column: "MaxRoles",
                value: 1);

            migrationBuilder.UpdateData(
                table: "plans",
                keyColumn: "Id",
                keyValue: 2,
                column: "MaxRoles",
                value: 3);

            migrationBuilder.UpdateData(
                table: "plans",
                keyColumn: "Id",
                keyValue: 3,
                column: "MaxRoles",
                value: 9);

            migrationBuilder.InsertData(
                table: "role_permissions",
                columns: new[] { "FeatureId", "RoleId", "CanAdd", "CanDelete", "CanEdit", "CanRead" },
                values: new object[] { new Guid("a1000000-0000-0000-0000-000000000007"), new Guid("11111111-1111-1111-1111-111111111111"), true, true, true, true });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "plan_features",
                keyColumns: new[] { "FeatureId", "PlanId" },
                keyValues: new object[] { new Guid("a1000000-0000-0000-0000-000000000007"), 1 });

            migrationBuilder.DeleteData(
                table: "role_permissions",
                keyColumns: new[] { "FeatureId", "RoleId" },
                keyValues: new object[] { new Guid("a1000000-0000-0000-0000-000000000007"), new Guid("11111111-1111-1111-1111-111111111111") });

            migrationBuilder.DropColumn(
                name: "MaxRoles",
                table: "plans");
        }
    }
}
