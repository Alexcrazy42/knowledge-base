using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Microservice.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class OrderController : ControllerBase
{
    [HttpGet]
    public List<string> GetInfo()
    {
        var user = User;
        return ["1", "2", "3"];
    }
    
    // TODO: вход с валидацией scope/claim
}