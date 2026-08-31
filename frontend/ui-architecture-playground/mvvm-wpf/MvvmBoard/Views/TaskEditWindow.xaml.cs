// Code-behind диалога задачи: только механика закрытия окна.
// VM выставляет флаг Completed - окно закрывается. Никакой логики здесь нет:
// даже валидация осталась в TaskEditViewModel (кнопка «Сохранить» серая сама).

using System.ComponentModel;
using System.Windows;

namespace MvvmBoard.Views;

public partial class TaskEditWindow : Window
{
    public TaskEditWindow()
    {
        InitializeComponent();
        DataContextChanged += (_, _) => WatchCompletion();
        WatchBindingsForDiagnostics();
    }

    private void WatchCompletion()
    {
        if (DataContext is not ViewModels.TaskEditViewModel vm) return;
        vm.PropertyChanged += VmOnPropertyChanged;
        Closed += (_, _) => vm.PropertyChanged -= VmOnPropertyChanged;
    }

    private void VmOnPropertyChanged(object? sender, PropertyChangedEventArgs e)
    {
        if (e.PropertyName == nameof(ViewModels.TaskEditViewModel.Completed))
            Close();
    }

    // ДИАГНОСТИКА «кнопка ничего не делает»: пишем в %TEMP%\kanban-errors\wpf.log
    // факт открытия диалога и состояние привязки команды «Сохранить» после рендера.
    // Однажды именно этот лог вскрыл баг: Command биндился, CanExecute=true,
    // но окно не закрывалось, потому что Completed не поднимал PropertyChanged.
    private void WatchBindingsForDiagnostics()
    {
        Loaded += (_, _) =>
        {
            var be = SaveBtn.GetBindingExpression(System.Windows.Controls.Primitives.ButtonBase.CommandProperty);
            App.LogTrace($"TaskEditWindow открыт: DC={DataContext?.GetType().Name ?? "null"}, " +
                         $"SaveBtn.Command={(SaveBtn.Command?.GetType().Name ?? "null")} " +
                         $"(bind {be?.Status}, hasError={be?.HasError}), " +
                         $"CanExecute={SaveBtn.Command?.CanExecute(null)}, enabled={SaveBtn.IsEnabled}");
        };
    }
}
