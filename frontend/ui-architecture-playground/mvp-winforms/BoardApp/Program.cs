// ============================================================================
// Program.cs - КОМПОЗИЦИОННЫЙ КОРЕНЬ приложения.
//
// Единственное место во всём проекте, где типы View и Presenter встречаются
// вместе. Здесь создаётся граф объектов:
//
//   BoardForm  <-IBoardView-  BoardPresenter  <-IBoardStore-  InMemoryBoardStore
//   UsersForm  <-IUsersView-  UsersPresenter -------------------^
//   TaskEditForm - фабрика для BoardPresenter
//
// Все связи - через интерфейсы контрактов, поэтому любой участник заменяем:
// подставьте FakeBoardView из SmokeTest - и вся логика экрана проверяется
// без единого окна Windows.
// ============================================================================

using BoardApp.Core;
using BoardApp.Presenters;
using BoardApp.Views;

namespace BoardApp;

internal static class Program
{
    // WinForms по умолчанию показывает жёлтый диалог ThreadException и
    // НИКУДА не пишет стек - для отладки добавляем файловый лог.
    internal static void LogError(Exception ex)
    {
        try
        {
            var dir = Path.Combine(Path.GetTempPath(), "kanban-errors");
            Directory.CreateDirectory(dir);
            File.AppendAllText(Path.Combine(dir, "winforms.log"),
                $"[{DateTime.Now:HH:mm:ss}] {ex.GetType().Name}: {ex.Message}\n{ex.StackTrace}\n\n");
        }
        catch { /* лог не должен ронять приложение */ }
    }

    // Трассировка ключевых событий UI - туда же, в %TEMP%\kanban-errors\winforms.log
    // (строки с пометкой TRACE). Это breadcrumbs для случая «кнопка ничего не
    // делает»: видно, открылся ли диалог и что вернул ShowModal. Писать только
    // из редких мест, иначе лог превращается в шум.
    internal static void LogTrace(string msg)
    {
        try
        {
            var dir = Path.Combine(Path.GetTempPath(), "kanban-errors");
            Directory.CreateDirectory(dir);
            File.AppendAllText(Path.Combine(dir, "winforms.log"),
                $"[{DateTime.Now:HH:mm:ss.fff}] TRACE {msg}\n");
        }
        catch { /* лог не должен ронять приложение */ }
    }

    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.ThreadException += (_, e) => LogError(e.Exception);
        AppDomain.CurrentDomain.UnhandledException += (_, e) => LogError((Exception)e.ExceptionObject);

        IBoardStore store = new InMemoryBoardStore();

        var boardView = new BoardForm();
        BoardPresenter boardPresenter = null!;

        boardPresenter = new BoardPresenter(
            boardView,
            store,
            // Навигация на второй экран как инжектированный делегат:
            // презентер доски не знает ни про Form, ни про UsersForm -
            // он просто "просит открыть пользователей".
            openUsersScreen: () =>
            {
                var usersView = new UsersForm();
                var usersPresenter = new UsersPresenter(usersView, store);
                // Синхронизация экранов: после мутаций пользователей доска
                // перечитывает данные (опции фильтров, имена на карточках).
                usersPresenter.Changed += () => boardPresenter.ExternalRefresh();
                usersPresenter.Run();
                usersView.ShowDialog(boardView);                       // модально, как дочернее окно
                usersView.Dispose();
                boardPresenter.ExternalRefresh();                      // на случай закрытия без изменений
            });

        boardPresenter
            .UseTaskEditDialog(() => new TaskEditForm())               // фабрика диалога задачи
            .Run();                                                    // подписка + первый рендер

        Application.Run(boardView);                                    // цикл сообщений главного окна
    }
}
