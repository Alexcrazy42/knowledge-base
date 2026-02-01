using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrmTrainer.Migrations
{
    /// <inheritdoc />
    public partial class Schedule_Timepair_AddFK : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NumberPair",
                table: "Schedules");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "NumberPair",
                table: "Schedules",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }
    }
}
