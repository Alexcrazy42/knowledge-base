using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrmTrainer.Migrations
{
    /// <inheritdoc />
    public partial class Trip_AddPlane : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Plane",
                table: "Trips",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Plane",
                table: "Trips");
        }
    }
}
