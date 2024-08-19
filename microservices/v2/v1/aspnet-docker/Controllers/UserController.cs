using Microsoft.AspNetCore.Mvc;
using aspnet_docker.Models;
using aspnet_docker.Data;
using Microsoft.EntityFrameworkCore;

namespace aspnet_docker.Controllers;

[ApiController]
[Route("[controller]")]
public class UserController : ControllerBase
{
    private readonly UserContext _context;
    private readonly ILogger<UserController> _logger;

    public UserController(ILogger<UserController> logger, UserContext context)
    {
        _logger = logger;
        _context = context;
    }


    [HttpGet(Name = "GetAllUsers")]
    public async Task<IActionResult> GetAllUsers()
    {
        var allUsers = await _context.Users.ToListAsync();
        return Ok(allUsers);

    }

    
    public async Task<ActionResult<object>> GetUserById(int id)
    {
        if(_context == null)
        {
            return NotFound();
        }

        var user = _context.Users.Where(u => u.Id == id); 
        if (user != null)
        {
            return Ok(user);
        }
        return NotFound();

    }

    [HttpPost]
    public async Task<IActionResult> AddUser()
    {
        var user = new User
        {
            Id = 1,
            FirstName = "Random",
            LastName = "RandomLastName"
        };
        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();

        return Ok();
    }



}