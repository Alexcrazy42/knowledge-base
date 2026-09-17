using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OpenIdDict.AuthServer.Migrations
{
    /// <inheritdoc />
    public partial class User_AddNewColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GitHubRefreshToken",
                table: "AspNetUsers",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GitHubRefreshToken",
                table: "AspNetUsers");
        }
    }
}
