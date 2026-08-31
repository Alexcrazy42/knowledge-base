// ============================================================================
// Диалоговый контракт + реализация на WPF-окнах.
//
// Контракт (IDialogService и записи) - то, что видят ViewModel:
// VM просит "покажи prompt/confirm/task-edit", не зная про окна.
// Реализация (класс DialogService) - единственный мост к WPF.
// В unit-тестах вместо него - фейк с записанными ответами.
// Тот же приём, что Prompt()/UseTaskEditDialog() в MVP-версиях.
// ============================================================================

using System.IO;
using System.Windows;
using BoardApp.Core;
using Microsoft.Win32;

namespace MvvmBoard.Infrastructure;

/// <summary>Данные, собранные диалогом задачи (аналог полей ITaskEditView).</summary>
public sealed record TaskDialogData(
    string Title,
    string Description,
    Guid? AssigneeId,
    Guid? EpicId,
    TaskState State,
    WorkItemType Type,
    Priority Priority,
    DateOnly? Deadline);

/// <summary>Пункт комбобокса: Id + подпись (аналог OptionVm из MVP).
/// Id допускает null - пункт «(все)» не выбирает ничего.</summary>
public sealed record OptionItem(Guid? Id, string Label)
{
    public override string ToString() => Label;                 // чтобы ComboBox показывал подпись
}

/// <summary>Спецзначения фильтров - аналог Guid.Empty-маркера из JS-версии.</summary>
public static class FilterSpecial
{
    public static readonly Guid None = Guid.Empty;
}

// ============================================================================
// КОНТРАКТ ДЛЯ VIEWMODEL
// ============================================================================

public interface IDialogService
{
    /// <summary>Однострочный ввод; confirmWord включает режим «слово СБРОС».</summary>
    string? Prompt(string title, string label, string initial = "", string? confirmWord = null);

    bool Confirm(string message);

    EpicDeleteMode? ChooseEpicDeleteMode(string epicKey, string epicTitle, int taskCount);

    /// <summary>Вопрос «передать незавершённые задачи?» при удалении пользователя.
    /// Возвращает индекс выбранного кандидата или null (отмена).</summary>
    int? PromptReassign(string userName, int openCount, IReadOnlyList<string> candidates);

    /// <summary>Модальный диалог задачи. null = отмена.</summary>
    TaskDialogData? EditTask(TaskDialogData? existing, IReadOnlyList<OptionItem> assignees,
        IReadOnlyList<OptionItem> epics, TaskState defaultState);

    bool SaveFile(string suggestedName, string content);

    string? OpenTextFile();

    void Info(string message);
}

// ============================================================================
// РЕАЛИЗАЦИЯ НА ОКНАХ
// ============================================================================

public class DialogService : IDialogService
{
    public string? Prompt(string title, string label, string initial = "", string? confirmWord = null)
    {
        var input = new InputWindow(title, label, initial, confirmWord)
            { Owner = Application.Current?.MainWindow };
        return input.ShowDialog() == true ? input.Value : null;
    }

    public bool Confirm(string message) =>
        MessageBox.Show(message, "Подтверждение", MessageBoxButton.OKCancel,
            MessageBoxImage.Question) == MessageBoxResult.OK;

    public EpicDeleteMode? ChooseEpicDeleteMode(string epicKey, string epicTitle, int taskCount)
    {
        var win = new EpicDeleteWindow(epicKey, epicTitle, taskCount)
            { Owner = Application.Current?.MainWindow };
        return win.ShowDialog() == true ? win.Mode : null;
    }

    public int? PromptReassign(string userName, int openCount, IReadOnlyList<string> candidates)
    {
        var win = new ReassignWindow(userName, openCount, candidates)
            { Owner = Application.Current?.MainWindow };
        return win.ShowDialog() == true ? win.SelectedIndex : null;
    }

    public TaskDialogData? EditTask(TaskDialogData? existing, IReadOnlyList<OptionItem> assignees,
        IReadOnlyList<OptionItem> epics, TaskState defaultState)
    {
        // Собираем пару VM+Window: ровно та же схема, что UseTaskEditDialog в MVP,
        // только фабрика тут не нужна - сервис сам знает про TaskEditWindow.
        var vm = new ViewModels.TaskEditViewModel(existing, assignees, epics, defaultState);
        var win = new Views.TaskEditWindow { DataContext = vm, Owner = Application.Current?.MainWindow };
        win.ShowDialog();
        return vm.Result;                                       // null = отмена
    }

    public bool SaveFile(string suggestedName, string content)
    {
        var dlg = new SaveFileDialog
        {
            FileName = suggestedName,
            Filter = "JSON (*.json)|*.json|Все файлы (*.*)|*.*"
        };
        if (dlg.ShowDialog() != true) return false;
        File.WriteAllText(dlg.FileName, content);
        return true;
    }

    public string? OpenTextFile()
    {
        var dlg = new OpenFileDialog { Filter = "JSON (*.json)|*.json|Все файлы (*.*)|*.*" };
        return dlg.ShowDialog() == true ? File.ReadAllText(dlg.FileName) : null;
    }

    public void Info(string message) =>
        MessageBox.Show(message, "Информация", MessageBoxButton.OK, MessageBoxImage.Information);
}
