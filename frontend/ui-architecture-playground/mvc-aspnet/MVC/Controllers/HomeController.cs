using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using MVC.Models;

namespace MVC.Controllers;

// ============================================================================
// HomeController - остался от шаблона ТОЛЬКО для страницы ошибки
// (/Home/Error, на которую смотрит UseExceptionHandler в Program.cs).
// Настоящие страницы живут в Board/Users-контроллерах.
// ============================================================================

public class HomeController : Controller
{
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel
        {
            RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier
        });
    }
}
