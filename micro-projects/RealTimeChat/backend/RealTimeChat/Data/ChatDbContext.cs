using Microsoft.EntityFrameworkCore;
using RealTimeChat.Models;

namespace RealTimeChat.Data;

public class ChatDbContext : DbContext
{
    private readonly IConfiguration _configuration;

    public ChatDbContext(IConfiguration configuration)
    {
        _configuration = configuration;
    }
    
    public DbSet<Message> Messages => Set<Message>();
    
    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        string connectionString = _configuration["Db_Connection_String"];
        optionsBuilder.UseNpgsql(connectionString);
    }
}