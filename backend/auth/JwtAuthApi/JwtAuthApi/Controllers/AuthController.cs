using JwtAuthApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace JwtAuthApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly TokenService _tokenService;

    public AuthController(IConfiguration configuration)
    {
        _tokenService = new TokenService(configuration["Jwt:Key"], configuration["Jwt:Issuer"]);
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        if (request.Username == "test" && request.Password == "password")
        {
            var token = _tokenService.GenerateToken(request.Username);
            return Ok(new { Token = token });
        }

        return Unauthorized();
    }
}


public class LoginRequest
{
    public string Username { get; set; }
    public string Password { get; set; }
}