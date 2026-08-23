// ============================================================================
// ITaskEditView - контракт модального диалога создания/редактирования задачи.
//
// Обратите внимание: интерфейс ОДИН на два режима. Создание от редактирования
// отличается только тем, что Presenter заранее заполнит свойства текущими
// значениями (или оставит пустыми). Логики "if isNew" в View нет вообще.
// ============================================================================

using BoardApp.Core;

namespace BoardApp.Views.Contracts;

public interface ITaskEditView
{
    // ---- настройка перед показом (пишет Presenter) ----

    /// <summary>Заголовок окна: "Новая задача" / "Редактирование TASK-7".</summary>
    string DialogTitle { set; }

    /// <summary>Опции комбобоксов исполнителя и эпика.</summary>
    void FillOptions(IReadOnlyList<OptionVm> assignees, IReadOnlyList<OptionVm> epics);

    /// <summary>Колонка, выбранная по умолчанию (при создании из "+" конкретной колонки).</summary>
    TaskState DefaultState { set; }

    // ---- поля формы: Presenter читает их ПОСЛЕ закрытия диалога ----

    string Title { get; set; }
    string Description { get; set; }
    Guid? AssigneeId { get; set; }     // null = "не назначен"
    Guid? EpicId { get; set; }         // null = "без эпика"
    TaskState State { get; set; }
    WorkItemType Type { get; set; }
    Priority Priority { get; set; }
    DateOnly? Deadline { get; set; }   // null = без дедлайна

    /// <summary>Показать диалог модально. true = нажали ОК и данные прошли клиентскую проверку.</summary>
    bool ShowModal();

    /// <summary>Сообщение об ошибке под формой ("заголовок обязателен").</summary>
    void ShowValidationError(string message);
}
