// ============================================================================
// UsersPresenter - презентер экрана пользователей.
// Вторая пара View<->Presenter: показывает, что в MVP "экран = пара".
// Связь с главным экраном - НЕ прямые ссылки, а колбэк onChanged,
// который Program.cs подключает к BoardPresenter.ExternalRefresh.
// ============================================================================

using BoardApp.Core;
using BoardApp.Views.Contracts;

namespace BoardApp.Presenters;

public sealed class UsersPresenter(IUsersView view, IBoardStore store)
{
    /// <summary>Вызывается после каждой мутации - композиционный корень уведомит другие экраны.</summary>
    public event Action? Changed;

    public void Run()
    {
        view.AddUserRequested += (_, _) => AddUser();
        view.DeleteUserRequested += (_, e) => DeleteUser(e.Id);
        Reload();
    }

    private void Reload() =>
        view.ShowUsers(store.Users
            .Select(u => new UserRow(u.Id, u.Name, store.CountTasksAssignedTo(u.Id)))
            .ToList());

    private void AddUser()
    {
        var name = view.NewUserName.Trim();
        if (name.Length == 0)
        {
            view.ShowFlash("Введите имя пользователя");
            return;
        }
        store.AddUser(name);
        view.ShowFlash($"Пользователь \"{name}\" добавлен");
        Changed?.Invoke();                                          // у главного экрана появятся новые опции фильтров/назначения
        Reload();                                                   // счётчики задач могли не измениться, но список - да
    }

    private void DeleteUser(Guid userId)
    {
        var user = store.Users.FirstOrDefault(u => u.Id == userId);
        if (user is null) return;

        var count = store.CountTasksAssignedTo(userId);

        // gherkin: если задач нет - просто подтвердить; иначе предложить переназначение.
        // Весь диалог - метод КОНТРАКТА view; presenter лишь интерпретирует результат.
        var choice = view.AskDeleteUser(
            user.Name,
            store.Users.Where(u => u.Id != userId)
                .Select(u => new OptionVm(u.Id, u.Name)).ToList(),
            count);
        if (!choice.Confirmed) return;

        store.DeleteUser(userId, choice.ReassignTo);
        view.ShowFlash(choice.ReassignTo is { } target
            ? $"Пользователь удалён; задачи переназначены на {store.Users.First(u => u.Id == target).Name}"
            : "Пользователь удалён; его задачи остались нераспределёнными");

        Changed?.Invoke();                                          // карточки на доске сменили исполнителя
        Reload();
    }
}
