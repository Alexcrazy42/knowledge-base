using Microsoft.AspNetCore.Mvc;
using aspnet_docker.Models;
using aspnet_docker.Data;
using aspnet_docker.Data.Interfaces;

namespace aspnet_docker.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class PersonController : ControllerBase
    {

        private readonly ILogger<PersonController> _logger;
        private readonly IDbContext _db;

        public PersonController(ILogger<PersonController> logger, IDbContext db)
        {
            _logger = logger;
            _db = db;
        }

        [HttpGet(Name = "GetPerson")]
        public Person Get(int id)
        {
            
            return _db.GetById(id);
            
        }
    }
}