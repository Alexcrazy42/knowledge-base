using BoardApp.Core;
using Microsoft.AspNetCore.Mvc;

namespace MVC.Controllers;

// ============================================================================
// EpicsController - создание и удаление эпиков.
// Удаление требует ВЫБОРА СУДЬБЫ ЗАДАЧ (gherkin: каскад или отвязка) -
// форма диалога шлёт mode="DetachTasks"|"CascadeDeleteTasks".
// ============================================================================

public class EpicsController(IBoardStore store) : Controller
{
    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Create(Guid boardId, string title, string? description, string? returnUrl)
    {
        if (!string.IsNullOrWhiteSpace(title)) store.AddEpic(boardId, title, description);
        return Back(boardId, returnUrl);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Delete(Guid boardId, Guid epicId, EpicDeleteMode mode, string? returnUrl)
    {
        store.DeleteEpic(boardId, epicId, mode);
        TempData["Flash"] = "Эпик удалён";
        return Back(boardId, returnUrl);
    }

    private IActionResult Back(Guid boardId, string? returnUrl)
    {
        if (!string.IsNullOrEmpty(returnUrl) && Url.IsLocalUrl(returnUrl))
            return Redirect(returnUrl);
        return RedirectToAction("Index", "Board", new { board = boardId });
    }
}
