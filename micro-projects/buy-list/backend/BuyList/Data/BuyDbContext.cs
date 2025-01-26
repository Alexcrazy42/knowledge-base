using BuyList.Models;
using Microsoft.EntityFrameworkCore;

namespace BuyList.Data;

public class BuyDbContext : DbContext
{
    private readonly IConfiguration configuration;

    public BuyDbContext(IConfiguration configuration)
    {
        this.configuration = configuration;
    }

    public DbSet<Buy> Buys => Set<Buy>();

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        string connectionString = configuration["Db_Connection_String"];
        Console.WriteLine(connectionString);
        optionsBuilder.UseNpgsql(connectionString);
    }

}
