using BoardApp.Core;

namespace PageController.ViewModels;

// ============================================================================
// VIEW MODELS - модели для ОТОБРАЖЕНИЯ.
//
// Зачем они, если есть доменные классы из BoardApp.Core?
//
// 1) Partial view видит ТОЛЬКО ту модель, которую ему передали.
//    Хелперы страницы (Model.UserOf) партиалу недоступны, поэтому все
//    нужные данные "раскрываем" заранее и кладём в плоскую запись.
//
// 2) ViewModel = домен + контекст представления (аватар исполнителя,
//    подпись эпика). Это классический приём MVVM/MVC: разметка работает
//    с готовыми к показу данными и не лезет в домен сама.
//
// Это record'ы: иммутабельные значения, создаются и умирают внутри запроса.
// ============================================================================

/// <summary>Карточка канбана: задача + разрешённые ссылки + готовый URL деталей.</summary>
public sealed record TaskCardVm(
    TaskItem Task,
    BoardUser? Assignee,
    Epic? Epic,
    string DetailsUrl);

/// <summary>
/// Форма создания/редактирования задачи. Existing == null значит режим "создать",
/// тогда колонкой по умолчанию становится DefaultState (из кнопки "+" в шапке колонки).
/// Справочники пользователей и эпиков нужны для выпадающих списков select.
/// </summary>
public sealed record TaskFormVm(
    Guid BoardId,
    TaskItem? Existing,
    TaskState DefaultState,
    IReadOnlyList<BoardUser> Users,
    IReadOnlyList<Epic> Epics);
