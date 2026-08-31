using BoardApp.Core;
using Microsoft.AspNetCore.Mvc;
using MVC.Models;
using MVC.Models.ViewModels;

namespace MVC.Controllers;

// ============================================================================
// BoardController - главная страница + CRUD досок.
//
// КЛЮЧЕВОЕ ОТЛИЧИЕ ОТ PAGE CONTROLLER:
//   В Razor Pages вся страница "/" (рендеринг + все действия над всеми
//   сущностями) жила в ОДНОМ IndexModel.
//   Здесь контроллеры разрезаны ПО СУЩНОСТЯМ: Board/Tasks/Epics/Users/Data,
//   и главная страница собирает данные из них всех через общий стор.
//   Это "горизонтальная" группировка кода против "вертикальной" у страниц.
// ============================================================================

public class BoardController(IBoardStore store) : Controller
{
    // ------------------------------------------------------------------
    // GET /Board/Index?board=...&view=...&assignee=...&epic=...&q=...&sort=...
    //
    // Все параметры страницы - ЯВНЫЕ АРГУМЕНТЫ ЭКШЕНА. Биндер сопоставляет
    // их с query-string по имени. В Razor Pages ту же роль играли
    // [BindProperty(SupportsGet)]-свойства PageModel - выбирайте, что читнее.
    // ------------------------------------------------------------------
    public IActionResult Index(
        Guid? board,
        string view = "board",
        string assignee = "",
        string epic = "", 
        string? q = null,
        string sort = "order",
        string? task = null,      // ?task=TASK-N -> диалог деталей
        string? edit = null,      // ?edit=TASK-N -> диалог редактирования
        string? dlg = null,       // newtask|newboard|rename|newepic|reset
        TaskState? state = null,  // колонка по умолчанию для новой задачи
        string? delepic = null)   // EPIC-N -> диалог выбора режима удаления
    {
        var vm = new BoardPageVm
        {
            AllBoards = store.Boards,
            Users = store.Users,
            ViewMode = view == "list" ? "list" : "board",
            AssigneeId = assignee ?? "",
            EpicId = epic ?? "",
            Q = q,
            Sort = sort
        };

        // Цепочка выбора доски: query -> cookie "последней доски" -> первая.
        if (board is null && Guid.TryParse(Request.Cookies["kanban.board"], out var cookieId))
            board = cookieId;
        vm.CurrentBoard = board is not null ? store.FindBoard(board.Value) : null
                          ?? store.FirstBoard();
        if (vm.CurrentBoard is not null)
            Response.Cookies.Append("kanban.board", vm.CurrentBoard.Id.ToString());

        if (vm.CurrentBoard is not null)
        {
            vm.VisibleTasks = FilterAndSort(vm.CurrentBoard, vm);

            vm.EpicStats = vm.CurrentBoard.Epics.Select(e => new BoardPageVm.EpicStat(
                e,
                Total: vm.CurrentBoard.Tasks.Count(t => t.EpicId == e.Id),
                Done: vm.CurrentBoard.Tasks.Count(t => t.EpicId == e.Id && t.State == TaskState.Done)
            )).ToList();

            vm.DetailTask = ResolveTask(vm.CurrentBoard, task);
            vm.EditTask = ResolveTask(vm.CurrentBoard, edit);
            vm.ShowNewTaskDialog = dlg == "newtask";
            vm.NewTaskState = state ?? TaskState.ToDo;
            vm.ShowNewBoardDialog = dlg == "newboard";
            vm.ShowRenameDialog = dlg == "rename";
            vm.ShowNewEpicDialog = dlg == "newepic";
            vm.ShowResetDialog = dlg == "reset";
            vm.DeleteEpicTarget = delepic is null
                ? null
                : vm.CurrentBoard.Epics.FirstOrDefault(e =>
                    $"EPIC-{e.Number}".Equals(delepic, StringComparison.OrdinalIgnoreCase));
        }

        return View(vm);
    }

    // ------------------------------------------------------------------
    // POST: CRUD досок. После каждой мутации - PRG (Post-Redirect-Get).
    // ------------------------------------------------------------------

    [HttpPost]
    [ValidateAntiForgeryToken]   // в MVC защита от CSRF НЕ включена автоматически -
                                 // атрибут вешается руками (Razor Pages валидирует всегда)
    public IActionResult CreateBoard(string name)
    {
        if (!string.IsNullOrWhiteSpace(name))
        {
            var created = store.CreateBoard(name);
            Flash($"Доска \"{created.Name}\" создана");
            return RedirectToAction(nameof(Index), new { board = created.Id });
        }
        return RedirectToAction(nameof(Index));
    }
                                 
                                 

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult RenameBoard(Guid boardId, string name)
    {
        if (!store.RenameBoard(boardId, name)) Flash("Доска не найдена");
        return RedirectToAction(nameof(Index), new { board = boardId });
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult DeleteBoard(Guid boardId)
    {
        var b = store.FindBoard(boardId);
        store.DeleteBoard(boardId);
        Flash($"Доска \"{b?.Name}\" удалена");
        return RedirectToAction(nameof(Index));
    }

    // ---------------------------- приватное ----------------------------

    private static IReadOnlyList<TaskItem> FilterAndSort(Board current, BoardPageVm vm)
    {
        IEnumerable<TaskItem> query = current.Tasks;

        if (!string.IsNullOrEmpty(vm.AssigneeId))
        {
            var aid = Guid.TryParse(vm.AssigneeId, out var g) ? g : (Guid?)null;
            query = aid is null
                ? query.Where(t => t.AssigneeId is null)
                : query.Where(t => t.AssigneeId == aid);
        }
        if (!string.IsNullOrEmpty(vm.EpicId))
        {
            var eid = Guid.TryParse(vm.EpicId, out var g) ? g : (Guid?)null;
            query = eid is null
                ? query.Where(t => t.EpicId is null)
                : query.Where(t => t.EpicId == eid);
        }
        if (!string.IsNullOrWhiteSpace(vm.Q))
            query = query.Where(t =>
                t.Title.Contains(vm.Q, StringComparison.OrdinalIgnoreCase) ||
                t.Description.Contains(vm.Q, StringComparison.OrdinalIgnoreCase));

        return vm.Sort == "priority"
            ? query.OrderByDescending(t => t.PriorityLevel).ThenBy(t => t.Order).ToList()
            : query.OrderBy(t => t.Order).ToList();
    }

    private static TaskItem? ResolveTask(Board board, string? key) =>
        string.IsNullOrEmpty(key)
            ? null
            : board.Tasks.FirstOrDefault(t =>
                $"TASK-{t.Number}".Equals(key, StringComparison.OrdinalIgnoreCase));

    private void Flash(string message) => TempData["Flash"] = message;
}
