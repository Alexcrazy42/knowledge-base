using aspnet_docker.Models;
using Microsoft.EntityFrameworkCore;

namespace aspnet_docker.Data
{
    public class UserContext : DbContext
    {
        public DbSet<User> Users { get; set; }

        public UserContext(DbContextOptions<UserContext> options)
            : base(options)
        {
            
        }
    }

}
