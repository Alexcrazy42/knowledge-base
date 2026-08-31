using BoardApp.Core;
using Microsoft.AspNetCore.Mvc;
using MVC.Models.ViewModels;

namespace MVC.Controllers;

// ============================================================================
// UsersController - страница управления исполнителями + её POST-действия.
//
// Здесь хорошо видно отличие от Razor Pages: у страницы /Users в RP был
// ОДИН UsersModel с OnGet/OnPostXxx. В MVC - UsersController с набором
// экшенов; URL'ы выводятся из конвенции {controller=Users}/{action=...}:
//   GET  /Users          -> Index
//   POST /Users/AddUser  -> AddUser
//   POST /Users/DeleteUser -> DeleteUser
// ============================================================================

public class UsersController(IBoardStore store) : Controller
{
    // GET /Users?delete=<guid> - delete открывает диалог удаления
    public IActionResult Index(Guid? delete)
    {
        var users = store.Users;
        var vm = new UsersPageVm
        {
            Users = users,
            AssignmentCounts = users.ToDictionary(u => u.Id, u => store.CountTasksAssignedTo(u.Id)),
            DeleteCandidate = delete is null
                ? null
                : users.FirstOrDefault(u => u.Id == delete.Value)
        };
        return View(vm);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult AddUser(string name)
    {
        if (!string.IsNullOrWhiteSpace(name))
            Flash($"Пользователь \"{name.Trim()}\" добавлен");
        store.AddUser(name);
        return RedirectToAction(nameof(Index));
    }

    /// <summary>Удаление с переназначением задач (gherkin User Management).</summary>
    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult DeleteUser(Guid userId, string reassignId)
    {
        Guid? reassignTo = Guid.TryParse(reassignId, out var r) ? r : null;
        var hadTasks = store.CountTasksAssignedTo(userId) > 0;
        store.DeleteUser(userId, reassignTo);
        Flash(hadTasks
            ? "Пользователь удалён, его задачи переназначены"
            : "Пользователь удалён");
        return RedirectToAction(nameof(Index));
    }

    private void Flash(string message) => TempData["Flash"] = message;
}
