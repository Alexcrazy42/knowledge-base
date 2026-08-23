namespace BoardApp.Core;

/// <summary>Что делать с задачами при удалении эпика (gherkin-сценарий каскадного удаления).</summary>
public enum EpicDeleteMode
{
    /// <summary>Задачи остаются, но отвязываются от эпика.</summary>
    DetachTasks,

    /// <summary>Задачи удаляются вместе с эпиком.</summary>
    CascadeDeleteTasks
}

/// <summary>Данные для создания задачи (всё, что заполняет форма "Создать задачу").</summary>
public sealed record NewTask(
    string Title,
    string? Description,
    Guid? AssigneeId,
    Guid? EpicId,
    TaskState State,
    WorkItemType Type,
    Priority Priority,
    DateOnly? Deadline);

// ============================================================================
// IBoardStore - ЕДИНСТВЕННАЯ точка входа UI в домен.
//
// Это граница слоёв: веб-приложения знают только этот интерфейс,
// а не конкретный класс. Благодаря этому хранилище можно подменить
// (например, на файловое или БД) без единого изменения в UI.
// В терминах MVC/MVVM это часть "Model".
//
// Почему методы возвращают bool/null, а не бросают исключения:
// для локального приложения "не найдено" - штатная ситуация
// (данные могли удалить в другом окне), а не ошибка.
// ============================================================================

public interface IBoardStore
{
    // ---- чтение ----

    IReadOnlyList<Board> Boards { get; }

    IReadOnlyList<BoardUser> Users { get; }

    Board? FindBoard(Guid boardId);

    /// <summary>Первая доска по порядку создания; используется как борд по умолчанию.</summary>
    Board? FirstBoard();

    /// <summary>Сколько задач назначено на пользователя (для предупреждения при удалении).</summary>
    int CountTasksAssignedTo(Guid userId);

    // ---- доски (фича Board Management) ----

    Board CreateBoard(string name);

    bool RenameBoard(Guid boardId, string name);

    bool DeleteBoard(Guid boardId);

    // ---- задачи (фича Task Management + метаданные) ----

    TaskItem? AddTask(Guid boardId, NewTask spec);

    /// <summary>
    /// Точечное изменение задачи: стор сам проставит UpdatedAt и проследит за инвариантами.
    /// Мутатор выполняется под блокировкой.
    /// </summary>
    bool UpdateTask(Guid boardId, Guid taskId, Action<TaskItem> mutate);

    bool DeleteTask(Guid boardId, Guid taskId);

    /// <summary>
    /// Перемещение задачи (drag-and-drop): смена колонки и/или позиции внутри колонки.
    /// targetIndex - желаемая позиция среди задач целевой колонки (0 = самая верхняя).
    /// </summary>
    bool MoveTask(Guid boardId, Guid taskId, TaskState targetColumn, int targetIndex);

    // ---- эпики (фича Epic Management) ----

    Epic? AddEpic(Guid boardId, string title, string? description);

    bool DeleteEpic(Guid boardId, Guid epicId, EpicDeleteMode mode);

    // ---- пользователи (фича User Management) ----

    BoardUser AddUser(string name, string? color = null);

    /// <summary>
    /// Удалить пользователя. Если reassignTo задан, его задачи переназначаются на него,
    /// иначе становятся нераспределёнными.
    /// </summary>
    bool DeleteUser(Guid userId, Guid? reassignToUserId);

    // ---- тестовые данные (фича Data Seeding) ----

    /// <summary>Создать тестовый эпик с 3-5 задачами в разных статусах.</summary>
    Epic? SeedTestEpic(Guid boardId);

    /// <summary>Наполнить доску случайными задачами (распределение 40/30/30 по колонкам).</summary>
    void SeedRandomTasks(Guid boardId, int count);

    /// <summary>Полный сброс: удалить все доски и пользователей.</summary>
    void ResetAll();

    // ---- персистентность (фича Persistence) ----

    string ExportJson();

    void ImportJson(string json);
}
