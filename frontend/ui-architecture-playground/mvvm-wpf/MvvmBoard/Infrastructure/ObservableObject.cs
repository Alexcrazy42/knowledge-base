// ============================================================================
// ViewModel-инфраструктура: два класса, на которых держится весь MVVM.
//
// ObservableObject  - INotifyPropertyChanged: "сигналит" View об изменениях.
//                     Это и есть Data Binding в ручном режиме: View обновится
//                     САМА, когда свойство VM изменится. Presenter не нужен -
//                     в MVP мы вызывали view.ShowColumns(), здесь достаточно
//                     Columns = ...; и биндинг разнесёт данные по контролам.
//
// RelayCommand      - ICommand: кнопка в XAML привязывается к команде VM,
//                     а не к обработчику клика в code-behind. CanExecute
//                     автоматически включает/выключает кнопку (Enabled).
// ============================================================================

using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Windows.Input;

namespace MvvmBoard.Infrastructure;

public abstract class ObservableObject : INotifyPropertyChanged
{
    public event PropertyChangedEventHandler? PropertyChanged;

    /// <summary>Вызывать в сеттере каждого bindable-свойства после изменения поля.</summary>
    protected void OnPropertyChanged([CallerMemberName] string? name = null) =>
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));

    /// <summary>Сахар: set => SetProperty(ref _field, value);</summary>
    protected bool SetProperty<T>(ref T field, T value, [CallerMemberName] string? name = null)
    {
        if (EqualityComparer<T>.Default.Equals(field, value)) return false;
        field = value;
        OnPropertyChanged(name);
        return true;
    }

    /// <summary>
    /// Уведомить, что изменилось ДРУГОЕ свойство, зависящее от этого
    /// (например, после смены CurrentBoard поменялись Columns).
    /// </summary>
    protected void Raise(string name) => OnPropertyChanged(name);
}

/// <summary>
/// Команда без параметров или с параметром. canExecute пересчитывается лениво:
/// WPF сам спросит его при изменениях фокуса; для явного обновления кнопок
/// VM вызывает RaiseCanExecuteChanged() (см. CommandManager.RequerySuggested).
/// </summary>
public class RelayCommand : ICommand
{
    private readonly Action<object?> _execute;
    private readonly Func<object?, bool>? _canExecute;

    public RelayCommand(Action<object?> execute, Func<object?, bool>? canExecute = null)
    {
        _execute = execute;
        _canExecute = canExecute;
    }

    public event EventHandler? CanExecuteChanged
    {
        add => CommandManager.RequerySuggested += value;
        remove => CommandManager.RequerySuggested -= value;
    }

    public bool CanExecute(object? parameter) => _canExecute?.Invoke(parameter) ?? true;

    public void Execute(object? parameter) => _execute(parameter);
}
