// ============================================================================
// UsersViewModel - "VM" экрана пользователей.
// Обратите внимание: здесь НЕТ ни одной ссылки на WPF-типы - чистый C#,
// который можно прогнать в unit-тестах без окна. View общается с ним только
// через биндинги (список, поле ввода, команды).
//
// Сценарий "удалить пользователя" повторяет gherkin: подтверждение ->
// вопрос про незавершённые задачи -> перенос на выбранного исполнителя.
// Результат сообщается наружу событием Changed (его слушает MainViewModel
// через App.xaml.cs) - в MVP ту же роль играл колбэк onChanged.
// ============================================================================

using System.Collections.ObjectModel;
using System.Windows.Input;
using BoardApp.Core;
using MvvmBoard.Infrastructure;

namespace MvvmBoard.ViewModels;

public class UsersViewModel : ObservableObject
{
    private readonly IBoardStore _store;
    private readonly IDialogService _dialogs;

    public UsersViewModel(IBoardStore store, IDialogService dialogs)
    {
        _store = store;
        _dialogs = dialogs;

        AddUserCommand = new RelayCommand(_ => AddUser());
        DeleteUserCommand = new RelayCommand(_ => DeleteUser(), _ => Selected is not null);

        Refresh();
    }

    public ICommand AddUserCommand { get; }
    public ICommand DeleteUserCommand { get; }

    /// <summary>MainViewModel подписывается и обновляет канбан.</summary>
    public event Action? Changed;

    public ObservableCollection<UserRowVm> Rows { get; } = [];

    public sealed class UserRowVm : ObservableObject
    {
        public required BoardUser Source { get; init; }

        private int _openCount;
        public int OpenCount
        {
            get => _openCount;
            internal set
            {
                if (SetProperty(ref _openCount, value))
                    OnPropertyChanged(nameof(HasOpen));
            }
        }
        public bool HasOpen => OpenCount > 0;

        private string _taskSummary = "";
        public string TaskSummary { get => _taskSummary; internal set => SetProperty(ref _taskSummary, value); }

        // ЛОВУШКА ДОСТУПНОСТИ: у строк ListBox без явного шаблона автоматизации
        // UIA берёт Name из ToString() - без переопределения скринридеры и
        // автотесты видят "UsersViewModel+UserRowVm" вместо имени пользователя.
        public override string ToString() => $"{Source.Name} ({TaskSummary})";
    }

    private UserRowVm? _selected;
    public UserRowVm? Selected
    {
        get => _selected;
        set => SetProperty(ref _selected, value);               // CanExecute(DeleteUserCommand) сам пересчитается
    }

    // Поле ввода имени живёт в VM (не в TextBox напрямую!) -
    // поэтому команда AddUser видит его без параметров.
    private string _newUserName = "";
    public string NewUserName
    {
        get => _newUserName;
        set
        {
            if (SetProperty(ref _newUserName, value))
                OnPropertyChanged(nameof(CanAdd));             // кнопка «Добавить» активируется сама
        }
    }

    public bool CanAdd => !string.IsNullOrWhiteSpace(NewUserName);

    private string _flash = "";
    public string Flash { get => _flash; private set => SetProperty(ref _flash, value); }

    // ==================================================================

    private void Refresh()
    {
        // Считаем задачи по всем доскам: у стора нет готового агрегата -
        // VM сама собирает статистику из домена (и это нормально для MVVM).
        var openByUser = new Dictionary<Guid, int>();
        var totalByUser = new Dictionary<Guid, int>();
        foreach (var board in _store.Boards)
            foreach (var t in board.Tasks)
            {
                if (t.AssigneeId is not { } uid) continue;
                totalByUser[uid] = totalByUser.GetValueOrDefault(uid) + 1;
                if (t.State != TaskState.Done)
                    openByUser[uid] = openByUser.GetValueOrDefault(uid) + 1;
            }

        Rows.Clear();
        foreach (var u in _store.Users)
        {
            var row = new UserRowVm { Source = u };
            row.OpenCount = openByUser.GetValueOrDefault(u.Id);
            row.TaskSummary = $"{totalByUser.GetValueOrDefault(u.Id)} задач всего";
            Rows.Add(row);
        }
    }

    private void AddUser()
    {
        var name = NewUserName.Trim();
        if (name.Length == 0)
        {
            Flash = "Имя обязательно";                          // биндинг покажет в статусе
            return;
        }
        if (_store.Users.Any(u => u.Name.Equals(name, StringComparison.OrdinalIgnoreCase)))
        {
            Flash = $"Пользователь «{name}» уже есть";
            return;
        }

        _store.AddUser(name);
        NewUserName = "";                                       // очистка поля через биндинг
        Refresh();
        Changed?.Invoke();
        Flash = $"«{name}» добавлен(а)";
    }

    private void DeleteUser()
    {
        var user = Selected?.Source;
        if (user is null) return;

        var open = Rows.First(r => r.Source.Id == user.Id).OpenCount;
        Guid? reassignTo = null;

        if (open > 0)
        {
            var others = _store.Users.Where(u => u.Id != user.Id).ToList();
            if (others.Count == 0)
            {
                _dialogs.Info($"У «{user.Name}» {open} активных задач, но некому их передать.");
                return;
            }
            var choice = _dialogs.PromptReassign(user.Name, open,
                others.Select(o => o.Name).ToList());
            if (choice is null) return;                         // отмена удаления
            reassignTo = others[choice.Value].Id;
        }

        _store.DeleteUser(user.Id, reassignTo);
        Selected = null;
        Refresh();
        Changed?.Invoke();
        Flash = reassignTo is null
            ? $"«{user.Name}» удалён(а)"
            : $"«{user.Name}» удалён(а), задачи перенесены";
    }
}
