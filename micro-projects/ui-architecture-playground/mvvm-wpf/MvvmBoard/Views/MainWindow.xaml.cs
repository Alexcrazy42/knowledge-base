// ============================================================================
// MainWindow code-behind.
//
// В MVVM code-behind должен быть МИНИМАЛЬНЫМ. Здесь осталась только одна
// вещь, которую биндингами не выразить - жест перетаскивания (DnD).
// Вся логика по-прежнему в VM: code-behind лишь собирает payload
// "taskId|state" и дёргает MoveTaskCommand. Если завтра захотим кнопки
// «→» вместо DnD - этот файл не изменится вовсе.
// ============================================================================

using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using BoardApp.Core;

namespace MvvmBoard.Views;

public partial class MainWindow : Window
{
    public MainWindow() => InitializeComponent();

    // ---------- источник: карточка ----------
    private void Card_MouseMove(object sender, MouseEventArgs e)
    {
        if (e.LeftButton != MouseButtonState.Pressed) return;
        if (sender is not Border card) return;
        if (card.Tag is not Guid id) return;

        DragDrop.DoDragDrop(card, id.ToString(), DragDropEffects.Move);
    }

    // ---------- цель: колонка ----------
    private void Column_DragOver(object sender, DragEventArgs e)
    {
        e.Effects = e.Data.GetDataPresent(DataFormats.StringFormat)
            ? DragDropEffects.Move : DragDropEffects.None;
        e.Handled = true;
    }

    private void Column_Drop(object sender, DragEventArgs e)
    {
        if (sender is not ListBox list || list.Tag is not TaskState targetState) return;
        if (!e.Data.GetDataPresent(DataFormats.StringFormat)) return;
        var taskId = (string)e.Data.GetData(DataFormats.StringFormat);

        if (DataContext is ViewModels.MainViewModel vm)
            vm.MoveTaskCommand.Execute($"{taskId}|{targetState}");
        e.Handled = true;
    }
}
