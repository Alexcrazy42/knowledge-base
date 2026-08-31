// ============================================================================
// Композиционный корень (аналог Program.cs в MVP).
//
// Собираем граф: домен -> диалоги -> ViewModel'и -> окна.
// MainViewModel не знает про окна; DialogService - единственный мост.
// ============================================================================

using System.IO;
using System.Windows;
using BoardApp.Core;
using MvvmBoard.Infrastructure;
using MvvmBoard.ViewModels;
using MvvmBoard.Views;

namespace MvvmBoard;

public partial class App : Application
{
    // Глобальный лог ошибок: %TEMP%\kanban-errors\wpf.log.
    // Без обработчика WPF просто термирует процесс (как было с культурой).
    internal static void LogError(Exception ex)
    {
        try
        {
            var dir = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "kanban-errors");
            Directory.CreateDirectory(dir);
            File.AppendAllText(System.IO.Path.Combine(dir, "wpf.log"),
                $"[{DateTime.Now:HH:mm:ss}] {ex.GetType().Name}: {ex.Message}\n{ex.StackTrace}\n\n");
        }
        catch { /* лог не должен ронять приложение */ }
    }

    // Трассировка ключевых событий UI - туда же, в %TEMP%\kanban-errors\wpf.log
    // (строки с пометкой TRACE). Это не про ошибки, а про breadcrumbs для случая
    // «кнопка ничего не делает»: видно, дошёл ли клик до VM и что сказал биндинг.
    // Писать сюда стоит только из редких мест (открытие диалога, сохранение),
    // иначе лог превращается в шум.
    internal static void LogTrace(string msg)
    {
        try
        {
            var dir = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "kanban-errors");
            Directory.CreateDirectory(dir);
            File.AppendAllText(System.IO.Path.Combine(dir, "wpf.log"),
                $"[{DateTime.Now:HH:mm:ss.fff}] TRACE {msg}\n");
        }
        catch { /* лог не должен ронять приложение */ }
    }

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        DispatcherUnhandledException += (_, args) =>
        {
            LogError(args.Exception);
            MessageBox.Show($"{args.Exception.GetType().Name}: {args.Exception.Message}",
                "Ошибка (записана в лог)", MessageBoxButton.OK, MessageBoxImage.Error);
            args.Handled = true;                                // не даём процессу умереть
        };
        AppDomain.CurrentDomain.UnhandledException += (_, args) =>
            LogError((Exception)args.ExceptionObject);

        IBoardStore store = new InMemoryBoardStore();
        IDialogService dialogs = new DialogService();

        MainViewModel? mainVm = null;
        mainVm = new MainViewModel(store, dialogs, OpenUsers);
        var window = new MainWindow { DataContext = mainVm };
        MainWindow = window;

        // локальная функция: UsersWindow живёт столько, сколько нужно;
        // после закрытия главный канбан обновится через событие Changed
        void OpenUsers()
        {
            var usersVm = new UsersViewModel(store, dialogs);
            usersVm.Changed += mainVm!.ExternalRefresh;
            new UsersWindow { DataContext = usersVm }.ShowDialog();
        }

        window.Show();
    }
}
