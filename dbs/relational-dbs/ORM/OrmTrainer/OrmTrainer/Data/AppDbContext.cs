using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using OrmTrainer.Models.AirTravel;
using OrmTrainer.Models.Schedule;

namespace OrmTrainer.Data;

public class AppDbContext : DbContext
{
    public DbSet<Company> Companies { get; set; }
    
    public DbSet<Passenger> Passengers { get; set; }
    
    public DbSet<Trip> Trips { get; set; }
    
    public DbSet<Schedule> Schedules { get; set; }
    
    public DbSet<SchoolClass> SchoolClasses { get; set; }
    
    public DbSet<Student> Students { get; set; }
    
    public DbSet<StudentInClass> StudentInClasses { get; set; }
    
    public DbSet<Subject> Subjects { get; set; }
    
    public DbSet<Teacher> Teachers { get; set; }
    
    public DbSet<Timepair> Timepairs { get; set; }
    
    public DbSet<PassengerInTrip> PassengerInTrips { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder builder)
    {
        var loggerFactory = LoggerFactory.Create(builder =>
        {
            builder.AddConsole()
                .AddFilter((category, level) =>
                    category == DbLoggerCategory.Database.Command.Name &&
                    level == LogLevel.Information);
        });
        builder.UseNpgsql("Host=localhost;Port=5432;Database=orm-train;User Id=postgres;Password=123")
            .UseLoggerFactory(loggerFactory)
            .EnableSensitiveDataLogging();
    }
}