using BoardApp.Core;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace PageController.Pages;

// ============================================================================
// USERS - страница управления исполнителями (gherkin-фича User Management).
//
// Отдельная страница = отдельный PageModel: в Page Controller каждый URL
// получает собственный класс-обработчик. Никаких общих "контроллеров".
// ============================================================================

public class UsersModel(IBoardStore store) : PageModel
{
    public IReadOnlyList<BoardUser> Users { get; private set; } = [];

    /// <summary>Сколько задач назначено на каждого пользователя (для таблицы и диалога).</summary>
    public IReadOnlyDictionary<Guid, int> AssignmentCounts { get; private set; } =
        new Dictionary<Guid, int>();

    /// <summary>Пользователь, для которого открыт диалог удаления (?delete=&lt;id&gt;).</summary>
    public BoardUser? DeleteCandidate { get; private set; }

    public void OnGet()
    {
        Users = store.Users;
        AssignmentCounts = Users.ToDictionary(u => u.Id, u => store.CountTasksAssignedTo(u.Id));
        DeleteCandidate = Guid.TryParse(Request.Query["delete"], out var id)
            ? Users.FirstOrDefault(u => u.Id == id)
            : null;
    }

    /// <summary>Добавление пользователя. Цвет не спрашиваем - стор выдаст из палитры.</summary>
    public IActionResult OnPostAddUser(string name)
    {
        if (!string.IsNullOrWhiteSpace(name))
            Flash($"Пользователь \"{name.Trim()}\" добавлен");
        store.AddUser(name);
        return RedirectToPage();
    }

    /// <summary>
    /// Удаление с переназначением задач (gherkin: "предлагает выбрать нового
    /// исполнителя"). Пустой reassignId => задачи остаются нераспределёнными.
    /// </summary>
    public IActionResult OnPostDeleteUser(Guid userId, string reassignId)
    {
        Guid? reassignTo = Guid.TryParse(reassignId, out var r) ? r : null;
        var hadTasks = store.CountTasksAssignedTo(userId) > 0;
        store.DeleteUser(userId, reassignTo);
        Flash(hadTasks
            ? "Пользователь удалён, его задачи переназначены"
            : "Пользователь удалён");
        return RedirectToPage();
    }

    private void Flash(string message) => TempData["Flash"] = message;
}
