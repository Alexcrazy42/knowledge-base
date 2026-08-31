using System.Text.Json;
using System.Text.Json.Serialization;

namespace BoardApp.Core;

// ============================================================================
// InMemoryBoardStore - потокобезопасная реализация IBoardStore в памяти.
//
// Ключевые решения и почему они такие:
//
// 1) Singleton в DI (регистрируется в Program.cs каждого веб-приложения).
//    Все запросы бьются в ОДИН экземпляр => нужна синхронизация (_lock),
//    иначе параллельные POST'ы испортят списки.
//
// 2) Данные живут только пока запущен процесс. Gherkin описывает localStorage,
//    но это браузерное хранилище - серверному SSR-приложению оно недоступно.
//    Серверный аналог "локал-фёрста": память процесса + экспорт/импорт JSON.
//    Контракт ExportJson/ImportJson намеренно совпадает по смыслу со
//    сценариями Persistence из gherkin.
//
// 3) Инвариант порядка: у задач одной колонки Order = 0..N без дырок.
//    Любая мутация, влияющая на порядок, вызывает RenumberColumn().
// ============================================================================

public sealed class InMemoryBoardStore : IBoardStore
{
    private readonly object _lock = new();
    private List<Board> _boards = [];
    private List<BoardUser> _users = [];

    // ---- JSON-настройки для экспорта/импорта ----
    // Enums пишем строками ("InProgress", а не 1): файл остаётся читаемым
    // и не ломается при добавлении новых значений enum'а.
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        Converters = { new JsonStringEnumConverter() }
    };

    // ---------------------------- чтение ----------------------------

    public IReadOnlyList<Board> Boards { get { lock (_lock) return _boards.ToList(); } }

    public IReadOnlyList<BoardUser> Users { get { lock (_lock) return _users.ToList(); } }

    public Board? FindBoard(Guid boardId)
    {
        lock (_lock) return _boards.FirstOrDefault(b => b.Id == boardId);
    }

    public Board? FirstBoard()
    {
        lock (_lock) return _boards.FirstOrDefault();
    }

    public int CountTasksAssignedTo(Guid userId)
    {
        lock (_lock)
            return _boards.Sum(b => b.Tasks.Count(t => t.AssigneeId == userId));
    }

    // ---------------------------- доски ----------------------------

    public Board CreateBoard(string name)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        var board = new Board { Name = name.Trim(), CreatedAt = DateTime.Now };
        lock (_lock) _boards.Add(board);
        return board;
    }

    public bool RenameBoard(Guid boardId, string name)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        lock (_lock)
        {
            var board = _boards.FirstOrDefault(b => b.Id == boardId);
            if (board is null) return false;
            board.Name = name.Trim();
            return true;
        }
    }

    /// <summary>Удаление доски каскадно убирает её задачи и эпики - они часть агрегата.</summary>
    public bool DeleteBoard(Guid boardId)
    {
        lock (_lock)
        {
            var removed = _boards.RemoveAll(b => b.Id == boardId);
            return removed > 0;
        }
    }

    // ---------------------------- задачи ----------------------------

    public TaskItem? AddTask(Guid boardId, NewTask spec)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(spec.Title);
        lock (_lock)
        {
            var board = _boards.FirstOrDefault(b => b.Id == boardId);
            if (board is null) return null;

            var task = new TaskItem
            {
                Number = ++board.TaskCounter,           // сквозная нумерация TASK-N per board
                Title = spec.Title.Trim(),
                Description = spec.Description?.Trim() ?? "",
                AssigneeId = spec.AssigneeId,
                EpicId = spec.EpicId,
                State = spec.State,
                Type = spec.Type,
                PriorityLevel = spec.Priority,
                Deadline = spec.Deadline,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now,               // фича "Метаданные": заполняет система, не пользователь
                Order = MaxOrderInColumn(board, spec.State) + 1  // новая задача - в конец колонки
            };
            board.Tasks.Add(task);
            return task;
        }
    }

    public bool UpdateTask(Guid boardId, Guid taskId, Action<TaskItem> mutate)
    {
        ArgumentNullException.ThrowIfNull(mutate);
        lock (_lock)
        {
            var task = FindTaskInternal(boardId, taskId);
            if (task is null) return false;
            mutate(task);                               // UI правит только разрешённые поля
            task.UpdatedAt = DateTime.Now;              // метаданные стор контролирует сам
            return true;
        }
    }

    public bool DeleteTask(Guid boardId, Guid taskId)
    {
        lock (_lock)
        {
            var board = _boards.FirstOrDefault(b => b.Id == boardId);
            if (board is null) return false;
            var removed = board.Tasks.RemoveAll(t => t.Id == taskId);
            if (removed > 0) RenumberAllColumns(board);  // могли образоваться дырки в Order
            return removed > 0;
        }
    }

    public bool MoveTask(Guid boardId, Guid taskId, TaskState targetColumn, int targetIndex)
    {
        lock (_lock)
        {
            var board = _boards.FirstOrDefault(b => b.Id == boardId);
            var task = FindTaskInternal(boardId, taskId);
            if (board is null || task is null) return false;

            TaskState sourceColumn = task.State;
            if (sourceColumn == targetColumn)
            {
                // Перестановка внутри одной колонки: просто пересобираем порядок.
                var column = OrderedColumn(board, targetColumn).ToList();
                column.Remove(task);
                column.Insert(Math.Clamp(targetIndex, 0, column.Count), task);
                for (var i = 0; i < column.Count; i++) column[i].Order = i;
            }
            else
            {
                // Переезд в другую колонку: меняем статус, Order берём с конца,
                // затем перенумеровываем ОБЕ колонки (источник мог схлопнуться).
                task.State = targetColumn;
                var column = OrderedColumn(board, targetColumn).ToList();
                column.Remove(task);
                column.Insert(Math.Clamp(targetIndex, 0, column.Count), task);
                for (var i = 0; i < column.Count; i++) column[i].Order = i;
                RenumberColumn(board, sourceColumn);
                task.UpdatedAt = DateTime.Now;
            }
            return true;
        }
    }

    // ---------------------------- эпики ----------------------------

    public Epic? AddEpic(Guid boardId, string title, string? description)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        lock (_lock)
        {
            var board = _boards.FirstOrDefault(b => b.Id == boardId);
            if (board is null) return null;
            var epic = new Epic
            {
                Number = ++board.EpicCounter,
                Title = title.Trim(),
                Description = description?.Trim() ?? ""
            };
            board.Epics.Add(epic);
            return epic;
        }
    }

    public bool DeleteEpic(Guid boardId, Guid epicId, EpicDeleteMode mode)
    {
        lock (_lock)
        {
            var board = _boards.FirstOrDefault(b => b.Id == boardId);
            if (board is null) return false;
            var removed = board.Epics.RemoveAll(e => e.Id == epicId);
            if (removed == 0) return false;

            switch (mode)
            {
                case EpicDeleteMode.DetachTasks:
                    foreach (var t in board.Tasks.Where(t => t.EpicId == epicId))
                        t.EpicId = null;
                    break;
                case EpicDeleteMode.CascadeDeleteTasks:
                    board.Tasks.RemoveAll(t => t.EpicId == epicId);
                    RenumberAllColumns(board);
                    break;
                default:
                    throw new ArgumentOutOfRangeException(nameof(mode), mode, null);
            }
            return true;
        }
    }

    // ---------------------------- пользователи ----------------------------

    public BoardUser AddUser(string name, string? color = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        lock (_lock)
        {
            var user = new BoardUser
            {
                Name = name.Trim(),
                // Цвет не задан -> детерминированно из палитры по числу пользователей,
                // чтобы цвета не повторялись, пока палитра не исчерпана.
                Color = color ?? AvatarPalette[_users.Count % AvatarPalette.Length]
            };
            _users.Add(user);
            return user;
        }
    }

    public bool DeleteUser(Guid userId, Guid? reassignToUserId)
    {
        lock (_lock)
        {
            if (_users.RemoveAll(u => u.Id == userId) == 0) return false;
            foreach (var board in _boards)
            foreach (var task in board.Tasks.Where(t => t.AssigneeId == userId))
                task.AssigneeId = reassignToUserId;   // null = задача стала нераспределённой
            return true;
        }
    }

    // ---------------------------- сиды ----------------------------
    // Делегируем DataSeeder'у, передавая его ВНУТРЬ блокировки -
    // генератор случайных чисел не потокобезопасен.

    public Epic? SeedTestEpic(Guid boardId)
    {
        lock (_lock)
        {
            var board = _boards.FirstOrDefault(b => b.Id == boardId);
            return board is null ? null : DataSeeder.SeedTestEpic(board, _users);
        }
    }

    public void SeedRandomTasks(Guid boardId, int count)
    {
        lock (_lock)
        {
            var board = _boards.FirstOrDefault(b => b.Id == boardId);
            if (board is not null) DataSeeder.SeedRandomTasks(board, count, _users);
        }
    }

    public void ResetAll()
    {
        lock (_lock)
        {
            _boards = [];   // gherkin: "система возвращается в начальное состояние" = пустой мир
            _users = [];
        }
    }

    // ---------------------------- экспорт/импорт ----------------------------

    private sealed record Snapshot(int Version, List<Board> Boards, List<BoardUser> Users);

    public string ExportJson()
    {
        lock (_lock)
        {
            var snapshot = new Snapshot(Version: 1, _boards, _users);
            return JsonSerializer.Serialize(snapshot, JsonOptions);
        }
    }

    public void ImportJson(string json)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(json);
        var snapshot = JsonSerializer.Deserialize<Snapshot>(json, JsonOptions)
                       ?? throw new InvalidOperationException("Файл пуст или повреждён");
        if (snapshot.Version != 1)
            throw new InvalidOperationException($"Неподдерживаемая версия данных: {snapshot.Version}");

        lock (_lock)
        {
            // Импорт ЗАМЕНЯЕТ состояние целиком (gherkin: "заменяют текущее состояние").
            _boards = snapshot.Boards;
            _users = snapshot.Users;
        }
    }

    // ---------------------------- приватные хелперы ----------------------------
    // Вызываются ТОЛЬКО из-под lock - отсюда имена с Internal и отсутствие собственной синхронизации.

    private TaskItem? FindTaskInternal(Guid boardId, Guid taskId) =>
        _boards.FirstOrDefault(b => b.Id == boardId)?.Tasks.FirstOrDefault(t => t.Id == taskId);

    private static IEnumerable<TaskItem> OrderedColumn(Board board, TaskState state) =>
        board.Tasks.Where(t => t.State == state).OrderBy(t => t.Order);

    private static int MaxOrderInColumn(Board board, TaskState state) =>
        OrderedColumn(board, state).LastOrDefault()?.Order ?? -1;

    private static void RenumberColumn(Board board, TaskState state)
    {
        var i = 0;
        foreach (var task in OrderedColumn(board, state)) task.Order = i++;
    }

    private static void RenumberAllColumns(Board board)
    {
        foreach (TaskState state in Enum.GetValues<TaskState>()) RenumberColumn(board, state);
    }

    /// <summary>Палитра цветов аватарок (Material 500), используется когда цвет не задан явно.</summary>
    internal static readonly string[] AvatarPalette =
    [
        "#e91e63", "#9c27b0", "#673ab7", "#3f51b5", "#2196f3",
        "#00bcd4", "#009688", "#4caf50", "#ff9800", "#795548"
    ];
}
