using System.Text;
using BoardApp.Core;
using Microsoft.AspNetCore.Mvc;

namespace MVC.Controllers;

// ============================================================================
// DataController - сиды, сброс, экспорт/импорт (gherkin Data Seeding + Persistence).
//
// Отдельный контроллер для "служебных" операций: в MVC это естественно -
// группа действий по смыслу (данные), а не по странице.
// В Razor Pages те же кнопки были хендлерами IndexModel.
// ============================================================================

public class DataController(IBoardStore store) : Controller
{
    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult SeedEpic(Guid boardId, string? returnUrl)
    {
        store.SeedTestEpic(boardId);
        return Back(boardId, returnUrl);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult SeedTasks(Guid boardId, int count, string? returnUrl)
    {
        store.SeedRandomTasks(boardId, Math.Clamp(count, 1, 100));
        return Back(boardId, returnUrl);
    }

    /// <summary>Опасное действие: подтверждение словом проверяется на сервере.</summary>
    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult ResetAll(string confirmWord)
    {
        if (confirmWord != "СБРОС")
        {
            TempData["Flash"] = "Для сброса нужно ввести слово СБРОС";
            return RedirectToAction("Index", "Board");
        }
        store.ResetAll();
        Response.Cookies.Delete("kanban.board");
        return RedirectToAction("Index", "Board");
    }

    /// <summary>Экспорт всего состояния в скачиваемый JSON.</summary>
    [HttpGet]
    public IActionResult Export()
    {
        var json = store.ExportJson();
        return File(Encoding.UTF8.GetBytes(json),
            "application/json", $"kanban-export-{DateTime.Now:yyyyMMdd-HHmmss}.json");
    }

    /// <summary>Импорт JSON: заменяет всё состояние целиком.</summary>
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Import(IFormFile file)
    {
        if (file is null || file.Length == 0)
        {
            TempData["Flash"] = "Файл не выбран";
            return RedirectToAction("Index", "Board");
        }
        try
        {
            using var reader = new StreamReader(file.OpenReadStream());
            store.ImportJson(await reader.ReadToEndAsync());
            TempData["Flash"] = "Данные импортированы";
        }
        catch (Exception ex)
        {
            TempData["Flash"] = $"Ошибка импорта: {ex.Message}";
        }
        // Фильтры после замены мира могут указывать в никуда - редирект начисто.
        return RedirectToAction("Index", "Board");
    }

    private IActionResult Back(Guid boardId, string? returnUrl)
    {
        if (!string.IsNullOrEmpty(returnUrl) && Url.IsLocalUrl(returnUrl))
            return Redirect(returnUrl);
        return RedirectToAction("Index", "Board", new { board = boardId });
    }
}
