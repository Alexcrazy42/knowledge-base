// ============================================================================
// TaskEditViewModel - "VM" модального диалога задачи.
//
// Ключевая идея MVVM: валидация живёт в VM (свойство Error + CanSave),
// а НЕ в обработчике кнопки. Диалог не может закрыться с пустым заголовком
// не потому что «кнопка проверяет», а потому что SaveCommand.CanExecute=false
// → кнопка серая. Тот же цикл валидации из gherkin, но декларативно.
// ============================================================================

using System.Globalization;
using System.Windows.Input;
using BoardApp.Core;
using MvvmBoard.Infrastructure;

namespace MvvmBoard.ViewModels;

public class TaskEditViewModel : ObservableObject
{
    public TaskEditViewModel(TaskDialogData? existing, IReadOnlyList<OptionItem> assignees,
        IReadOnlyList<OptionItem> epics, TaskState defaultState)
    {
        Assignees = [new OptionItem(FilterSpecial.None, "(без исполнителя)"), .. assignees];
        Epics = [new OptionItem(FilterSpecial.None, "(без эпика)"), .. epics];

        Title = existing?.Title ?? "";
        Description = existing?.Description ?? "";
        _assigneeId = existing?.AssigneeId ?? FilterSpecial.None;
        _epicId = existing?.EpicId ?? FilterSpecial.None;
        State = existing?.State ?? defaultState;
        Type = existing?.Type ?? WorkItemType.Task;
        Priority = existing?.Priority ?? Priority.Medium;
        DeadlineText = existing?.Deadline?.ToString("dd.MM.yyyy") ?? "";

        SaveCommand = new RelayCommand(_ => Save(), _ => CanSave);
        CancelCommand = new RelayCommand(_ =>
        {
            Result = null;
            Completed = true;
        });
    }

    public ICommand SaveCommand { get; }
    public ICommand CancelCommand { get; }

    /// <summary>Результат диалога; null = отмена. DialogService читает его после ShowDialog().</summary>
    public TaskDialogData? Result { get; private set; }

    /// <summary>VM сообщает окну «диалог завершён» - окно закрывается (см. TaskEditWindow).
    /// ЛОВУШКА: здесь обязательно уведомление! Окно подписано на PropertyChanged
    /// этого свойства и закрывается только по нему; голый auto-property оставляет
    /// диалог открытым навечно - снаружи выглядит как «кнопка ничего не делает».</summary>
    private bool _completed;
    public bool Completed
    {
        get => _completed;
        private set => SetProperty(ref _completed, value);
    }

    public IReadOnlyList<OptionItem> Assignees { get; }
    public IReadOnlyList<OptionItem> Epics { get; }
    public Array States { get; } = Enum.GetValues<TaskState>();
    public Array Types { get; } = Enum.GetValues<WorkItemType>();
    public Array Priorities { get; } = Enum.GetValues<Priority>();

    // ---------------- bindable-поля ----------------

    private string _title = "";
    public string Title
    {
        get => _title;
        set
        {
            if (SetProperty(ref _title, value))
            {
                OnPropertyChanged(nameof(Error));               // сообщение и кнопка обновятся сами
                OnPropertyChanged(nameof(HasError));
            }
        }
    }

    private string _description = "";
    public string Description { get => _description; set => SetProperty(ref _description, value); }

    private Guid? _assigneeId;
    public Guid? AssigneeId
    {
        get => _assigneeId;
        set => SetProperty(ref _assigneeId,
            Equals(value, FilterSpecial.None) ? null : value);  // спецзначение → настоящий null
    }

    private Guid? _epicId;
    public Guid? EpicId
    {
        get => _epicId;
        set => SetProperty(ref _epicId,
            Equals(value, FilterSpecial.None) ? null : value);
    }

    private TaskState _state;
    public TaskState State { get => _state; set => SetProperty(ref _state, value); }

    private WorkItemType _type;
    public WorkItemType Type { get => _type; set => SetProperty(ref _type, value); }

    private Priority _priority;
    public Priority Priority { get => _priority; set => SetProperty(ref _priority, value); }

    private string _deadlineText = "";
    public string DeadlineText
    {
        get => _deadlineText;
        set
        {
            if (SetProperty(ref _deadlineText, value))
                OnPropertyChanged(nameof(Error));
        }
    }

    // ---------------- валидация как данные ----------------

    public string Error
    {
        get
        {
            if (string.IsNullOrWhiteSpace(Title)) return "Заголовок обязателен";
            if (DeadlineText.Trim().Length > 0 && !TryParseDeadline(out _))
                return "Дата в формате дд.ММ.гггг";
            return "";
        }
    }

    public bool HasError => Error.Length > 0;
    public bool CanSave => !HasError;

    private bool TryParseDeadline(out DateOnly value) =>
        DateOnly.TryParseExact(DeadlineText.Trim(), "dd.MM.yyyy",
            CultureInfo.InvariantCulture, DateTimeStyles.None, out value);

    private void Save()
    {
        if (!CanSave) return;                                   // страховка: команда и так серая
        // Диагностика «Сохранить ничего не делает» -> %TEMP%\kanban-errors\wpf.log:
        // строка здесь = клик дошёл до VM; нет строки - клик не доставлен вовсе.
        App.LogTrace($"TaskEdit.Save: Title='{Title}', CanSave={CanSave}");
        Result = new TaskDialogData(
            Title.Trim(), Description.Trim(),
            AssigneeId, EpicId, State, Type, Priority,
            TryParseDeadline(out var d) ? d : null);
        Completed = true;
    }
}
