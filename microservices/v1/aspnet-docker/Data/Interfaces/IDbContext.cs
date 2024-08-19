using aspnet_docker.Models;

namespace aspnet_docker.Data.Interfaces
{
    public interface IDbContext
    {
        Person  GetById(int id);

        
    }
}


