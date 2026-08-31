namespace BoardApp.Core;

// ============================================================================
// DataSeeder - генератор тестовых данных (gherkin-фича "Data Seeding").
//
// Отдельный статический класс, потому что это НЕ доменное правило,
// а утилита для разработчика/тестировщика. Стор просто делегирует сюда
// под своей блокировкой.
//
// Random создаётся один на класс: внутри вызовы всегда идут под lock'ом
// стора, поэтому конкурентного доступа к генератору не бывает.
// ============================================================================

public static class DataSeeder
{
    private static readonly Random Rnd = new();

    /// <summary>Шаблоны заголовков в духе реальной разработки.</summary>
    private static readonly string[] TitleTemplates =
    [
        "Настроить CI/CD",
        "Рефакторинг модуля авторизации",
        "Починить падение на странице отчётов",
        "Добавить пагинацию в список заказов",
        "Обновить документацию API",
        "Оптимизировать медленный SQL-запрос",
        "Сверстать лендинг акции",
        "Написать интеграционные тесты",
        "Внедрать кэширование каталога",
        "Исправить вёрстку в Safari",
        "Подключить мониторинг ошибок",
        "Провести техдолг-ревизию репозитория",
        "Настроить алерты в Grafana",
        "Мигрировать конфиги на appsettings",
        "Ускорить загрузку дашборда",
        "Закрыть уязвимость в зависимостях"
    ];

    /// <summary>Описания - просто вариации, чтобы карточки не были одинаковыми.</summary>
    private static readonly string[] DescriptionTemplates =
    [
        "Обсудили с командой, делаем.",
        "Нужно уточнить требования у аналитика.",
        "Приоритет поднял тимлид.",
        "Есть прототип, можно начинать.",
        "Затратно, но важно для релиза."
    ];

    public static Epic SeedTestEpic(Board board, IReadOnlyList<BoardUser> users)
    {
        var epic = new Epic
        {
            Number = ++board.EpicCounter,
            Title = $"Тестовый эпик {board.EpicCounter}",
            Description = "Эпик, созданный кнопкой сидинга"
        };
        board.Epics.Add(epic);

        // gherkin: "эпик содержит 3-5 тестовых задач в разных статусах"
        var taskCount = Rnd.Next(3, 6);
        for (var i = 0; i < taskCount; i++)
            AddRandomTask(board, users, epicId: epic.Id);

        return epic;
    }

    public static void SeedRandomTasks(Board board, int count, IReadOnlyList<BoardUser> users)
    {
        for (var i = 0; i < count; i++) AddRandomTask(board, users);
    }

    private static TaskItem AddRandomTask(Board board, IReadOnlyList<BoardUser> users, Guid? epicId = null)
    {
        // gherkin: распределение по колонкам 40% To Do / 30% In Progress / 30% Done.
        var roll = Rnd.NextDouble();
        var state = roll switch
        {
            < 0.4 => TaskState.ToDo,
            < 0.7 => TaskState.InProgress,
            _ => TaskState.Done
        };

        var maxOrder = board.Tasks.Where(t => t.State == state)
            .Select(t => (int?)t.Order).Max() ?? -1;

        var task = new TaskItem
        {
            Number = ++board.TaskCounter,
            Title = $"{TitleTemplates[Rnd.Next(TitleTemplates.Length)]} #{board.TaskCounter}",
            Description = DescriptionTemplates[Rnd.Next(DescriptionTemplates.Length)],
            State = state,
            Order = maxOrder + 1,
            Type = (WorkItemType)Rnd.Next(3),
            PriorityLevel = (Priority)Rnd.Next(3),      // приоритет случайный
            AssigneeId = users.RandomOrNull(),          // 20% задач без исполнителя
            EpicId = epicId ?? (board.Epics.Count > 0 && Rnd.NextDouble() < 0.5
                ? board.Epics[Rnd.Next(board.Epics.Count)].Id   // 50% задач цепляем к случайному эпику
                : null),
            Deadline = Rnd.NextDouble() < 0.7           // 30% задач без дедлайна
                ? DateOnly.FromDateTime(DateTime.Today).AddDays(Rnd.Next(1, 22))
                : null,
            CreatedAt = DateTime.Now,
            UpdatedAt = DateTime.Now
        };
        board.Tasks.Add(task);
        return task;
    }

    private static Guid? RandomOrNull(this IReadOnlyList<BoardUser> users) =>
        users.Count == 0 ? null : users[Rnd.Next(users.Count)].Id;
}
