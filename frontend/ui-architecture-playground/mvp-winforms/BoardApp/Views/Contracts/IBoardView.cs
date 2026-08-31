// ============================================================================
// IBoardView - КОНТРАКТ главного экрана (пассивная View).
//
// Это и есть "V" в MVP, выраженная интерфейсом. Правила контракта:
//   1. Только ДАННЫЕ и СОБЫТИЯ. Никаких TaskItem/Board - только DTO выше.
//   2. View не принимает решений: она не знает, что такое "фильтр применён
//      корректно" или "задачу нельзя удалить" - она лишь сообщает о жесте.
//   3. Presenter знает View ТОЛЬКО через этот интерфейс => в SmokeTest его
//      подменяет фейк, и вся логика экрана тестируется без Windows Forms.
//
// Сравни с веб-версиями:
//   - Razor Pages/MVC: состояние экрана живёт в URL (query-string), события -
//     это HTTP POST-запросы. Здесь состояние - контролы формы, события -
//     настоящие C#-события. Presenter пересоздавать не нужно, он живой.
//   - Диалоговые методы внизу (Prompt/Confirm/...) - приём "расширить контракт":
//     модальные окна - обязанность View, но ОРКЕСТРИРУЕТ их показ Presenter.
// ============================================================================

using BoardApp.Core;

namespace BoardApp.Views.Contracts;

public interface IBoardView
{
    // ------------------------- вывод (View <- Presenter) -------------------------

    /// <summary>Заполнить список досок и отметить текущую.</summary>
    void ShowBoards(IReadOnlyList<BoardListItem> boards, Guid? currentId);

    /// <summary>Отрисовать три колонки канбана с карточками.</summary>
    void ShowColumns(IReadOnlyList<ColumnVm> columns);

    /// <summary>Отрисовать сайдбар эпиков с прогрессом.</summary>
    void ShowEpics(IReadOnlyList<EpicStatRow> epics);

    /// <summary>Показать строку статуса ("Доска создана", ошибки валидации...).</summary>
    void ShowFlash(string message);

    /// <summary>Задать опции фильтров (пользователи/эпики) и сбросить критерии.</summary>
    void ResetFilters(IReadOnlyList<OptionVm> assignees, IReadOnlyList<OptionVm> epics);

    /// <summary>Заполнить вкладку "Список".</summary>
    void ShowTaskTable(IReadOnlyList<TaskRow> rows);

    /// <summary>
    /// Прочитать критерии фильтров из контролов. Семантика значений:
    ///   null              = фильтр не активен ("все");
    ///   FilterSpecial.None= спецпункт "без исполнителя/эпика";
    ///   иначе             = конкретный Id.
    /// </summary>
    FilterCriteria ReadFilterCriteria();

    // --------------------- диалоги как методы контракта -------------------------

    string? Prompt(string title, string label, string initial = "");

    bool Confirm(string message);

    /// <summary>Диалог подтверждения сброса; возвращает введённое слово (ожидается "СБРОС").</summary>
    string? AskConfirmWord(string whatFor);

    /// <summary>Выбор режима удаления эпика; cancel = пользователь передумал.</summary>
    EpicDeleteMode? ChooseEpicDeleteMode(string epicKey, string epicTitle, int taskCount);

    /// <summary>Сохранить текст в файл (SaveFileDialog). false = отмена.</summary>
    bool SaveToFile(string suggestedFileName, string content);

    /// <summary>Прочитать JSON из файла (OpenFileDialog). null = отмена.</summary>
    string? OpenJsonFile();

    // ------------------------- события (View -> Presenter) -------------------------
    // Имена заканчиваются на ...Requested: View не говорит ЧТО делать,
    // она сообщает о намерении пользователя. Решение - за Presenter.

    event EventHandler CreateBoardRequested;
    event EventHandler RenameBoardRequested;
    event EventHandler DeleteBoardRequested;
    event EventHandler<IdEventArgs> SwitchBoardRequested;

    event EventHandler<TaskState> CreateTaskRequested;      // "+" в шапке колонки
    event EventHandler<IdEventArgs> TaskOpenRequested;       // двойной клик / Enter
    event EventHandler<IdEventArgs> TaskDeleteRequested;     // пункт контекстного меню
    event EventHandler<TaskMovedEventArgs> TaskMoved;        // drag-and-drop

    event EventHandler ApplyFiltersRequested;
    event EventHandler ResetFiltersRequested;

    event EventHandler SeedEpicRequested;
    event EventHandler SeedTasksRequested;
    event EventHandler CreateEpicRequested;
    event EventHandler<IdEventArgs> EpicDeleteRequested;      // выбранный в сайдбаре эпик
    event EventHandler ExportRequested;
    event EventHandler ImportRequested;
    event EventHandler ResetAllRequested;
    event EventHandler OpenUsersRequested;
}
