using BoardApp.Core;
using Microsoft.AspNetCore.Mvc;

namespace MVC.Controllers;

// ============================================================================
// TasksController - все действия над ЗАДАЧАМИ.
//
// Обратите внимание на группировку: в MVC контроллер = сущность.
// Создание задачи из главной страницы постит сюда (/Tasks/Create),
// хотя РЕНДЕРИТ форму по-прежнему BoardController - это нормально,
// view и endpoint мутации не обязаны жить рядом.
//
// Все экшены принимают returnUrl (hidden-поле формы) и делают PRG
// обратно на страницу, с которой пришла форма. Проверка Url.IsLocalUrl -
// защита от open redirect: злоумышленник не подсунет форме чужой URL.
// ============================================================================

public class TasksController(IBoardStore store) : Controller
{
    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Create(
        Guid boardId, string title, string? description,
        string assigneeId, string epicId, string? deadline,
        TaskState state, WorkItemType type, Priority priority,
        string? returnUrl)
    {
        if (!string.IsNullOrWhiteSpace(title))
            store.AddTask(boardId, new NewTask(
                title, description,
                ParseGuid(assigneeId), ParseGuid(epicId),
                state, type, priority, ParseDate(deadline)));
        return Back(boardId, returnUrl);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Update(
        Guid boardId, Guid taskId, string title, string? description,
        string assigneeId, string epicId, string? deadline,
        TaskState state, WorkItemType type, Priority priority,
        string? returnUrl)
    {
        if (!string.IsNullOrWhiteSpace(title))
            store.UpdateTask(boardId, taskId, t =>
            {
                t.Title = title.Trim();
                t.Description = description ?? "";
                t.AssigneeId = ParseGuid(assigneeId);
                t.EpicId = ParseGuid(epicId);
                t.Deadline = ParseDate(deadline);
                t.State = state;     // смена колонки формой - стор перенумерует Order
                t.Type = type;
                t.PriorityLevel = priority;
            });
        return Back(boardId, returnUrl);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Delete(Guid boardId, Guid taskId, string? returnUrl)
    {
        store.DeleteTask(boardId, taskId);
        return Back(boardId, returnUrl);
    }

    /// <summary>
    /// Перемещение drag-and-drop'ом: fetch из board.js, не браузерная навигация.
    /// Поэтому возвращаем 204 No Content, а перезагрузку делает сам JS.
    /// </summary>
    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Move(Guid boardId, Guid taskId, TaskState column, int index)
    {
        return store.MoveTask(boardId, taskId, column, index) ? NoContent() : NotFound();
    }

    // ---------------------------- приватное ----------------------------

    private IActionResult Back(Guid? boardId, string? returnUrl)
    {
        // IsLocalUrl отсекает "//evil.com" и "http://evil.com" - классический
        // open-redirect вектор через подделанное hidden-поле.
        if (!string.IsNullOrEmpty(returnUrl) && Url.IsLocalUrl(returnUrl))
            return Redirect(returnUrl);
        return RedirectToAction("Index", "Board", boardId is null ? null : new { board = boardId });
    }

    private static Guid? ParseGuid(string? s) => Guid.TryParse(s, out var g) ? g : null;

    private static DateOnly? ParseDate(string? s) => DateOnly.TryParse(s, out var d) ? d : null;
}
