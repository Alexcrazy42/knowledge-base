using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JwtAuthApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DataController : ControllerBase
{
    [HttpGet]
    public IActionResult GetProtectedData()
    {
        return Ok("This is protected data.");
    }
}