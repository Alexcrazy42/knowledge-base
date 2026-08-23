// ============================================================================
// MainViewModel - "VM" главного экрана. Сердце MVVM-версии.
//
// Сравните с BoardPresenter из WinForms-MVP:
//   MVP:  presenter ВЫЗЫВАЕТ методы view (ShowColumns, ShowFlash...)
//   MVVM: presenter-а НЕТ. VM хранит СОСТОЯНИЕ в bindable-свойствах,
//         View сама перерисовывается через Data Binding.
// "Reload()" здесь не нужен: поменял Columns -> биндинг уже разнёс новое
// значение по ItemsControl. Это и есть обещание MVVM из README.
//
// Логика (фильтры, ключи TASK-N, overdue) - та же, что во всех версиях:
// она теперь живёт в computed-свойствах, пересчитываемых при смене входов.
// ============================================================================

using System.Collections.ObjectModel;
using System.IO;
using System.Windows.Input;
using BoardApp.Core;
using MvvmBoard.Infrastructure;

namespace MvvmBoard.ViewModels;

public class MainViewModel : ObservableObject
{
    private readonly IBoardStore _store;
    private readonly IDialogService _dialogs;
    private readonly Action _openUsers;                         // инжектируется App.xaml.cs

    public MainViewModel(IBoardStore store, IDialogService dialogs, Action openUsers)
    {
        _store = store;
        _dialogs = dialogs;
        _openUsers = openUsers;

        CreateBoardCommand = new RelayCommand(_ => CreateBoard());
        RenameBoardCommand = new RelayCommand(_ => RenameBoard(), _ => CurrentBoard is not null);
        DeleteBoardCommand = new RelayCommand(_ => DeleteBoard(), _ => CurrentBoard is not null);
        OpenUsersCommand = new RelayCommand(_ => _openUsers());

        SeedEpicCommand = new RelayCommand(_ => SeedEpic(), _ => CurrentBoard is not null);
        SeedTasksCommand = new RelayCommand(_ => SeedTasks(), _ => CurrentBoard is not null);
        CreateEpicCommand = new RelayCommand(_ => CreateEpic(), _ => CurrentBoard is not null);
        DeleteEpicCommand = new RelayCommand(_ => DeleteEpic(), _ => SelectedEpic is not null);

        AddTaskCommand = new RelayCommand(p => EditAndSaveTask(null, ParseState(p)), _ => CurrentBoard is not null);
        EditTaskCommand = new RelayCommand(p => EditAndSaveTask(FindTask(p), TaskState.ToDo));
        DeleteTaskCommand = new RelayCommand(p => DeleteTask(FindTask(p)));

        // параметр - кортеж "(taskId, state)" в строковом виде; DnD code-behind его собирает
        MoveTaskCommand = new RelayCommand(p =>
        {
            if (p is not string s) return;
            var parts = s.Split('|');
            if (parts.Length == 2 && Guid.TryParse(parts[0], out var id)
                && Enum.TryParse<TaskState>(parts[1], out var st))
                MoveTask(id, st);
        });

        ApplyFiltersCommand = new RelayCommand(_ => RefreshFiltered());
        ResetFiltersCommand = new RelayCommand(_ => ResetFilters());

        ExportCommand = new RelayCommand(_ => Export());
        ImportCommand = new RelayCommand(_ => Import());
        ResetAllCommand = new RelayCommand(_ => ResetAll());

        _currentBoardId = _store.FirstBoard()?.Id;
        LoadFilterOptions();
        RefreshAll();
    }

    // ---------------- команды ----------------

    public ICommand CreateBoardCommand { get; }
    public ICommand RenameBoardCommand { get; }
    public ICommand DeleteBoardCommand { get; }
    public ICommand OpenUsersCommand { get; }
    public ICommand SeedEpicCommand { get; }
    public ICommand SeedTasksCommand { get; }
    public ICommand CreateEpicCommand { get; }
    public ICommand DeleteEpicCommand { get; }
    public ICommand AddTaskCommand { get; }
    public ICommand EditTaskCommand { get; }
    public ICommand DeleteTaskCommand { get; }
    public ICommand MoveTaskCommand { get; }
    public ICommand ApplyFiltersCommand { get; }
    public ICommand ResetFiltersCommand { get; }
    public ICommand ExportCommand { get; }
    public ICommand ImportCommand { get; }
    public ICommand ResetAllCommand { get; }

    // ---------------- состояние: списки для биндинга ----------------

    public IReadOnlyList<Board> Boards => _store.Boards;

    /// <summary>Выбор доски в ComboBox (SelectedValuePath="Id").</summary>
    private Guid? _currentBoardId;
    public Guid? CurrentBoardId
    {
        get => _currentBoardId;
        set
        {
            if (SetProperty(ref _currentBoardId, value))
            {
                OnPropertyChanged(nameof(CurrentBoard));
                RefreshAll();
            }
        }
    }

    public Board? CurrentBoard =>
        CurrentBoardId is { } id ? _store.FindBoard(id) : null;

    // ---------------- фильтры (bindable-состояние вместо ReadFilterCriteria) ----------------

    public IReadOnlyList<BoardUser> Users => _store.Users;

    private Guid? _assigneeFilter;
    /// <summary>null = «(все)»; FilterSpecial.None = «без исполнителя».</summary>
    public Guid? AssigneeFilter
    {
        get => _assigneeFilter;
        set { if (SetProperty(ref _assigneeFilter, value)) RefreshFiltered(); }
    }

    private Guid? _epicFilter;
    public Guid? EpicFilter
    {
        get => _epicFilter;
        set { if (SetProperty(ref _epicFilter, value)) RefreshFiltered(); }
    }

    private string _searchText = "";
    public string SearchText
    {
        get => _searchText;
        set { if (SetProperty(ref _searchText, value)) RefreshFiltered(); }
    }

    private bool _sortByPriority;
    public bool SortByPriority
    {
        get => _sortByPriority;
        set { if (SetProperty(ref _sortByPriority, value)) RefreshFiltered(); }
    }

    // ---------------- канбан: три колонки ----------------

    /// <summary>
    /// Колонки канбана. ObservableCollection + INotifyPropertyChanged карточек:
    /// при перемещении задачи WPF сам переставит элементы, мы ничего не "показываем".
    /// </summary>
    public ObservableCollection<ColumnVm> Columns { get; } = [];

    public sealed class ColumnVm : ObservableObject
    {
        public TaskState State { get; init; }
        public string Title => State.ToDisplay();

        private string _counter = "";
        public string Counter { get => _counter; private set => SetProperty(ref _counter, value); }

        public ObservableCollection<TaskCardVm> Cards { get; } = [];

        public void Rebuild(IEnumerable<TaskCardVm> cards)
        {
            Cards.Clear();
            foreach (var c in cards) Cards.Add(c);
            Counter = $"{Title} ({Cards.Count})";
        }
    }

    public sealed class TaskCardVm : ObservableObject
    {
        public required TaskItem Source { get; init; }
        public Guid Id => Source.Id;
        public string Key => $"TASK-{Source.Number}";
        public string Title => Source.Title;
        public string TypeName => Source.Type.ToDisplay();
        public string PriorityName => Source.PriorityLevel.ToDisplay();
        public string PriorityClass => Source.PriorityLevel.ToString().ToLowerInvariant();
        public bool IsHigh => Source.PriorityLevel == Priority.High;

        private string _assignee = "";
        public string Assignee { get => _assignee; internal set => SetProperty(ref _assignee, value); }

        private string _deadlineText = "";
        public string DeadlineText { get => _deadlineText; internal set => SetProperty(ref _deadlineText, value); }

        private bool _isOverdue;
        public bool IsOverdue { get => _isOverdue; internal set => SetProperty(ref _isOverdue, value); }

        private string? _epicKey;
        public string? EpicKey { get => _epicKey; internal set => SetProperty(ref _epicKey, value); }

        /// <summary>Параметр для Drag/Drop-команды: "taskId|state".</summary>
        public string DragPayload(string state) => $"{Source.Id}|{state}";
    }

    // ---------------- эпики ----------------

    public sealed class EpicRowVm
    {
        public required Epic Source { get; init; }
        public string Key => $"EPIC-{Source.Number}";
        public string Title => Source.Title;
        public int Total { get; init; }
        public int Done { get; init; }
        /// <summary>Прогресс-бар биндится на это свойство (0..1).</summary>
        public double Progress => Total == 0 ? 0 : (double)Done / Total;
        public string Label => $"{Key} · {Title} ({Done}/{Total})";
    }

    private EpicRowVm? _selectedEpic;
    public EpicRowVm? SelectedEpic
    {
        get => _selectedEpic;
        set => SetProperty(ref _selectedEpic, value);           // CanExecute кнопки удаления пересчитается сам
    }

    public ObservableCollection<EpicRowVm> Epics { get; } = [];

    // ---------------- flash через обычное свойство ----------------

    private string _flash = "Создайте первую доску";
    public string Flash { get => _flash; private set => SetProperty(ref _flash, value); }

    private void SetFlash(string message)
    {
        Flash = $"[{DateTime.Now:HH:mm:ss}] {message}";         // биндинг обновит StatusBar сам
    }

    // ==================================================================
    // РЕНДЕР. Вместо Reload()-перерисовки - точечное обновление коллекций:
    // биндинг разносит изменения по контролам автоматически.
    /// <summary>Внешнее событие (экран пользователей изменил данные) - полный пересчёт.</summary>
    public void ExternalRefresh() => RefreshAll();

    // ==================================================================

    private void RefreshAll()
    {
        OnPropertyChanged(nameof(Boards));                      // список досок мог измениться
        LoadFilterOptions();
        RefreshEpics();
        RefreshFiltered();
    }

    private void RefreshEpics()
    {
        var board = CurrentBoard;
        Epics.Clear();
        if (board is null) return;

        foreach (var e in board.Epics)
            Epics.Add(new EpicRowVm
            {
                Source = e,
                Total = board.Tasks.Count(t => t.EpicId == e.Id),
                Done = board.Tasks.Count(t => t.EpicId == e.Id && t.State == TaskState.Done)
            });
        if (SelectedEpic is { } sel && !board.Epics.Any(e => e.Id == sel.Source.Id))
            SelectedEpic = null;
    }

    /// <summary>Фильтрация + сортировка + раскладка по колонкам (правила те же, что везде).</summary>
    private void RefreshFiltered()
    {
        var board = CurrentBoard;
        IEnumerable<TaskItem> q = board?.Tasks ?? Enumerable.Empty<TaskItem>();

        if (AssigneeFilter is { } a)
            q = q.Where(t => a == FilterSpecial.None ? t.AssigneeId is null : t.AssigneeId == a);
        if (EpicFilter is { } e)
            q = q.Where(t => e == FilterSpecial.None ? t.EpicId is null : t.EpicId == e);
        if (!string.IsNullOrWhiteSpace(SearchText))
        {
            var needle = SearchText.Trim();
            q = q.Where(t => t.Title.Contains(needle, StringComparison.OrdinalIgnoreCase)
                          || t.Description.Contains(needle, StringComparison.OrdinalIgnoreCase));
        }
        q = SortByPriority
            ? q.OrderBy(PriorityRank).ThenBy(t => t.Order)
            : q.OrderBy(t => t.Order);
        var visible = q.ToList();

        foreach (var state in Enum.GetValues<TaskState>())
        {
            var col = ColumnFor(state);
            col.Rebuild(visible.Where(t => t.State == state).Select(ToCard));
        }

        // подписи исполнителей/дедлайнов могли измениться у существующих карточек
        foreach (var col in Columns)
            foreach (var card in col.Cards)
            {
                card.Assignee = _store.Users.FirstOrDefault(u => u.Id == card.Source.AssigneeId)?.Name ?? "не назначен";
                var today = DateOnly.FromDateTime(DateTime.Today);
                card.DeadlineText = card.Source.Deadline is { } d ? $"⏰ {d:dd.MM}" : "";
                card.IsOverdue = card.Source.Deadline is { } dl && dl < today && card.Source.State != TaskState.Done;
                card.EpicKey = card.Source.EpicId is { } eid
                    ? CurrentBoard!.Epics.FirstOrDefault(x => x.Id == eid) is { } epicRow
                        ? $"EPIC-{epicRow.Number}"
                        : null                                   // висячий id не должен ронять UI
                    : null;
            }
    }

    private ColumnVm ColumnFor(TaskState state) =>
        Columns.FirstOrDefault(c => c.State == state)
        ?? NewColumn(state);

    private ColumnVm NewColumn(TaskState state)
    {
        var c = new ColumnVm { State = state };
        Columns.Add(c);
        return c;
    }

    private static int PriorityRank(TaskItem t) => t.PriorityLevel switch
    {
        Priority.High => 0, Priority.Medium => 1, _ => 2
    };

    private TaskCardVm ToCard(TaskItem t) => new()
    {
        Source = t,
        Assignee = _store.Users.FirstOrDefault(u => u.Id == t.AssigneeId)?.Name ?? "не назначен",
        DeadlineText = t.Deadline is { } d ? $"⏰ {d:dd.MM}" : "",
        IsOverdue = t.Deadline is { } dl && dl < DateOnly.FromDateTime(DateTime.Today) && t.State != TaskState.Done,
        EpicKey = null
    };

    // ---------------- опции фильтров для ComboBox ----------------

    /// <summary>«(все)» = null-Id, «Без исполнителя» = Guid.Empty, дальше - пользователи.</summary>
    public IReadOnlyList<OptionItem> AssigneeOptions { get; private set; } = [];
    public IReadOnlyList<OptionItem> EpicOptions { get; private set; } = [];

    private void LoadFilterOptions()
    {
        AssigneeOptions =
        [
            new(null, "(все исполнители)"),
            new(FilterSpecial.None, "Без исполнителя"),
            .. _store.Users.Select(u => new OptionItem(u.Id, u.Name)),
        ];
        var board = CurrentBoard;
        EpicOptions =
        [
            new(null, "(все эпики)"),
            new(FilterSpecial.None, "Без эпика"),
            .. (board?.Epics ?? []).Select(e => new OptionItem(e.Id, $"EPIC-{e.Number} · {e.Title}")),
        ];
        OnPropertyChanged(nameof(AssigneeOptions));
        OnPropertyChanged(nameof(EpicOptions));
    }

    private TaskItem? FindTask(object? parameter) =>
        parameter is Guid g ? CurrentBoard?.Tasks.FirstOrDefault(t => t.Id == g) : null;

    private static TaskState ParseState(object? parameter) =>
        parameter is TaskState s ? s : TaskState.ToDo;

    // ==================================================================
    // ОБРАБОТЧИКИ. Тот же сценарный поток, что в презентерах:
    // диалог -> мутация стора -> обновление bindable-коллекций.
    // ==================================================================

    private void CreateBoard()
    {
        var name = _dialogs.Prompt("Новая доска", "Название доски:");
        if (string.IsNullOrWhiteSpace(name)) return;
        var board = _store.CreateBoard(name.Trim());
        CurrentBoardId = board.Id;                              // сеттер сам вызовет RefreshAll
        SetFlash($"Доска «{board.Name}» создана");
    }

    private void RenameBoard()
    {
        var board = CurrentBoard;
        if (board is null) return;
        var name = _dialogs.Prompt("Переименовать доску", "Новое название:", board.Name);
        if (string.IsNullOrWhiteSpace(name)) return;
        _store.RenameBoard(board.Id, name.Trim());
        RefreshAll();
        SetFlash("Доска переименована");
    }

    private void DeleteBoard()
    {
        var board = CurrentBoard;
        if (board is null) return;
        if (!_dialogs.Confirm($"Удалить доску «{board.Name}» вместе со всеми задачами?")) return;

        _store.DeleteBoard(board.Id);
        CurrentBoardId = _store.FirstBoard()?.Id;               // gherkin: показать оставшуюся
        RefreshAll();
        SetFlash("Доска удалена");
    }

    private void SeedEpic()
    {
        var board = CurrentBoard;
        if (board is null) return;
        var epic = _store.SeedTestEpic(board.Id);
        RefreshAll();
        SetFlash(epic is null ? "Не удалось создать эпик" : $"EPIC-{epic.Number} с тестовыми задачами добавлен");
    }

    private void SeedTasks()
    {
        var board = CurrentBoard;
        if (board is null) return;
        _store.SeedRandomTasks(board.Id, 10);
        RefreshFiltered();                                      // эпики не менялись
        SetFlash("Добавлено 10 случайных задач");
    }

    private void CreateEpic()
    {
        var board = CurrentBoard;
        if (board is null) return;
        var title = _dialogs.Prompt("Новый эпик", "Название эпика:");
        if (string.IsNullOrWhiteSpace(title)) return;
        var epic = _store.AddEpic(board.Id, title.Trim(), null);
        RefreshEpics();
        SetFlash(epic is null ? "Не удалось создать эпик" : $"EPIC-{epic.Number} создан");
    }

    private void DeleteEpic()
    {
        var board = CurrentBoard;
        var row = SelectedEpic;
        if (board is null || row is null) return;

        var count = board.Tasks.Count(t => t.EpicId == row.Source.Id);
        var mode = _dialogs.ChooseEpicDeleteMode(row.Key, row.Title, count);
        if (mode is null) return;

        _store.DeleteEpic(board.Id, row.Source.Id, mode.Value);
        SelectedEpic = null;
        RefreshAll();
        SetFlash(mode == EpicDeleteMode.CascadeDeleteTasks
            ? $"{row.Key} удалён вместе с задачами"
            : $"{row.Key} удалён, задачи остались");
    }

    /// <summary>Диалог задачи: создание или редактирование (валидация внутри диалога).</summary>
    private void EditAndSaveTask(TaskItem? existing, TaskState defaultState)
    {
        var board = CurrentBoard;
        if (board is null) return;

        var data = existing is null
            ? _dialogs.EditTask(null, UserOptions(), EpicOptions, defaultState)
            : _dialogs.EditTask(new TaskDialogData(
                    existing.Title, existing.Description, existing.AssigneeId, existing.EpicId,
                    existing.State, existing.Type, existing.PriorityLevel, existing.Deadline),
                UserOptions(), EpicOptions, existing.State);
        if (data is null) return;

        if (existing is null)
        {
            var created = _store.AddTask(board.Id, new NewTask(
                data.Title.Trim(), data.Description?.Trim(), data.AssigneeId, data.EpicId,
                data.State, data.Type, data.Priority, data.Deadline));
            SetFlash(created is null ? "Не удалось создать задачу" : $"TASK-{created!.Number} создана");
        }
        else
        {
            _store.UpdateTask(board.Id, existing.Id, t =>
            {
                t.Title = data.Title.Trim();
                t.Description = data.Description?.Trim() ?? "";
                t.AssigneeId = data.AssigneeId;
                t.EpicId = data.EpicId;
                t.State = data.State;
                t.Type = data.Type;
                t.PriorityLevel = data.Priority;
                t.Deadline = data.Deadline;
            });
            SetFlash($"TASK-{existing.Number} сохранена");
        }

        RefreshEpics();                                         // задача могла получить/потерять эпик
        RefreshFiltered();
    }

    private void DeleteTask(TaskItem? task)
    {
        var board = CurrentBoard;
        if (task is null || board is null) return;
        if (!_dialogs.Confirm($"Удалить TASK-{task.Number} «{task.Title}»?")) return;

        _store.DeleteTask(board.Id, task.Id);
        RefreshEpics();
        RefreshFiltered();
        SetFlash($"TASK-{task.Number} удалена");
    }

    /// <summary>DnD-цель: перенос между колонками (позицию упрощаем - в конец).</summary>
    private void MoveTask(Guid taskId, TaskState target)
    {
        var board = CurrentBoard;
        if (board is null) return;
        var task = board.Tasks.FirstOrDefault(t => t.Id == taskId);
        if (task is null || task.State == target) return;

        _store.MoveTask(board.Id, taskId, target, int.MaxValue);
        RefreshFiltered();
    }

    private void ResetFilters()
    {
        _assigneeFilter = null; _epicFilter = null; _searchText = ""; _sortByPriority = false;
        OnPropertyChanged(nameof(AssigneeFilter));
        OnPropertyChanged(nameof(EpicFilter));
        OnPropertyChanged(nameof(SearchText));
        OnPropertyChanged(nameof(SortByPriority));
        RefreshFiltered();
    }

    private void Export()
    {
        var stamp = DateTime.Now.ToString("yyyyMMdd-HHmmss");
        if (_dialogs.SaveFile($"kanban-export-{stamp}.json", _store.ExportJson()))
            SetFlash("Данные экспортированы в JSON");
    }

    private void Import()
    {
        var json = _dialogs.OpenTextFile();
        if (json is null) return;
        try
        {
            _store.ImportJson(json);
            CurrentBoardId = _store.FirstBoard()?.Id;
            RefreshAll();
            SetFlash("Импорт выполнен");
        }
        catch (Exception ex)
        {
            SetFlash($"Ошибка импорта: {ex.Message}");
        }
    }

    private void ResetAll()
    {
        var word = _dialogs.Prompt("Подтверждение", "Для полного сброса всех данных введите слово СБРОС:", confirmWord: "СБРОС");
        if (word != "СБРОС")
        {
            SetFlash("Сброс отменён (нужно слово СБРОС)");
            return;
        }
        _store.ResetAll();
        CurrentBoardId = null;
        RefreshAll();
        SetFlash("Все данные удалены");
    }

    private IReadOnlyList<OptionItem> UserOptions() =>
        _store.Users.Select(u => new OptionItem(u.Id, u.Name)).ToList();
}
