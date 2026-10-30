using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace NFC_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddPermissionIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "roles",
                columns: new[] { "Id", "CreatedAt", "IsSystem", "Name", "TenantId" },
                values: new object[] { new Guid("11111111-1111-1111-1111-111111111111"), new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, "TenantAdmin", null });

            migrationBuilder.InsertData(
                table: "role_permissions",
                columns: new[] { "FeatureId", "RoleId", "CanAdd", "CanDelete", "CanEdit", "CanRead" },
                values: new object[,]
                {
                    { new Guid("a1000000-0000-0000-0000-000000000001"), new Guid("11111111-1111-1111-1111-111111111111"), true, true, true, true },
                    { new Guid("a1000000-0000-0000-0000-000000000002"), new Guid("11111111-1111-1111-1111-111111111111"), true, true, true, true },
                    { new Guid("a1000000-0000-0000-0000-000000000003"), new Guid("11111111-1111-1111-1111-111111111111"), true, true, true, true },
                    { new Guid("a1000000-0000-0000-0000-000000000004"), new Guid("11111111-1111-1111-1111-111111111111"), true, true, true, true },
                    { new Guid("a1000000-0000-0000-0000-000000000006"), new Guid("11111111-1111-1111-1111-111111111111"), true, true, true, true },
                    { new Guid("a1000000-0000-0000-0000-00000000000b"), new Guid("11111111-1111-1111-1111-111111111111"), true, true, true, true },
                    { new Guid("a1000000-0000-0000-0000-00000000000f"), new Guid("11111111-1111-1111-1111-111111111111"), true, true, true, true },
                    { new Guid("a1000000-0000-0000-0000-000000000010"), new Guid("11111111-1111-1111-1111-111111111111"), true, true, true, true },
                    { new Guid("a1000000-0000-0000-0000-000000000011"), new Guid("11111111-1111-1111-1111-111111111111"), true, true, true, true },
                    { new Guid("a1000000-0000-0000-0000-000000000012"), new Guid("11111111-1111-1111-1111-111111111111"), true, true, true, true },
                    { new Guid("a1000000-0000-0000-0000-000000000013"), new Guid("11111111-1111-1111-1111-111111111111"), true, true, true, true }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "role_permissions",
                keyColumns: new[] { "FeatureId", "RoleId" },
                keyValues: new object[] { new Guid("a1000000-0000-0000-0000-000000000001"), new Guid("11111111-1111-1111-1111-111111111111") });

            migrationBuilder.DeleteData(
                table: "role_permissions",
                keyColumns: new[] { "FeatureId", "RoleId" },
                keyValues: new object[] { new Guid("a1000000-0000-0000-0000-000000000002"), new Guid("11111111-1111-1111-1111-111111111111") });

            migrationBuilder.DeleteData(
                table: "role_permissions",
                keyColumns: new[] { "FeatureId", "RoleId" },
                keyValues: new object[] { new Guid("a1000000-0000-0000-0000-000000000003"), new Guid("11111111-1111-1111-1111-111111111111") });

            migrationBuilder.DeleteData(
                table: "role_permissions",
                keyColumns: new[] { "FeatureId", "RoleId" },
                keyValues: new object[] { new Guid("a1000000-0000-0000-0000-000000000004"), new Guid("11111111-1111-1111-1111-111111111111") });

            migrationBuilder.DeleteData(
                table: "role_permissions",
                keyColumns: new[] { "FeatureId", "RoleId" },
                keyValues: new object[] { new Guid("a1000000-0000-0000-0000-000000000006"), new Guid("11111111-1111-1111-1111-111111111111") });

            migrationBuilder.DeleteData(
                table: "role_permissions",
                keyColumns: new[] { "FeatureId", "RoleId" },
                keyValues: new object[] { new Guid("a1000000-0000-0000-0000-00000000000b"), new Guid("11111111-1111-1111-1111-111111111111") });

            migrationBuilder.DeleteData(
                table: "role_permissions",
                keyColumns: new[] { "FeatureId", "RoleId" },
                keyValues: new object[] { new Guid("a1000000-0000-0000-0000-00000000000f"), new Guid("11111111-1111-1111-1111-111111111111") });

            migrationBuilder.DeleteData(
                table: "role_permissions",
                keyColumns: new[] { "FeatureId", "RoleId" },
                keyValues: new object[] { new Guid("a1000000-0000-0000-0000-000000000010"), new Guid("11111111-1111-1111-1111-111111111111") });

            migrationBuilder.DeleteData(
                table: "role_permissions",
                keyColumns: new[] { "FeatureId", "RoleId" },
                keyValues: new object[] { new Guid("a1000000-0000-0000-0000-000000000011"), new Guid("11111111-1111-1111-1111-111111111111") });

            migrationBuilder.DeleteData(
                table: "role_permissions",
                keyColumns: new[] { "FeatureId", "RoleId" },
                keyValues: new object[] { new Guid("a1000000-0000-0000-0000-000000000012"), new Guid("11111111-1111-1111-1111-111111111111") });

            migrationBuilder.DeleteData(
                table: "role_permissions",
                keyColumns: new[] { "FeatureId", "RoleId" },
                keyValues: new object[] { new Guid("a1000000-0000-0000-0000-000000000013"), new Guid("11111111-1111-1111-1111-111111111111") });

            migrationBuilder.DeleteData(
                table: "roles",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"));
        }
    }
}
