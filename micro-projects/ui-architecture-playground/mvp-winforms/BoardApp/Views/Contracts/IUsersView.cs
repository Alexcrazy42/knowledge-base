// ============================================================================
// IUsersView - контракт экрана пользователей.
// Отдельный экран = отдельный контракт + отдельный презентер. Так в MVP
// выглядит "многоэкранность": у каждого окна своя пара View<->Presenter.
// ============================================================================

namespace BoardApp.Views.Contracts;

/// <summary>Строка таблицы пользователей.</summary>
public sealed record UserRow(Guid Id, string Name, int TaskCount);

public interface IUsersView
{
    // вывод
    void ShowUsers(IReadOnlyList<UserRow> users);
    void ShowFlash(string message);

    /// <summary>Диалог удаления: если задач >0, предложить переназначение. null-TargetId = оставить нераспределёнными.</summary>
    ReassignChoice AskDeleteUser(string userName, IReadOnlyList<OptionVm> otherUsers, int taskCount);

    // ввод (состояние контролов читает Presenter)
    string NewUserName { get; }

    // события
    event EventHandler AddUserRequested;
    event EventHandler<IdEventArgs> DeleteUserRequested;
    event EventHandler CloseRequested;
}
