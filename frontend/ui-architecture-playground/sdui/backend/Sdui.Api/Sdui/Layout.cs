using System.Text.Json;

namespace Sdui.Api.Sdui;

// ============================================================================
// Режим «дизайнера» (Grafana-like). Раскладка экрана хранится на сервере как
// данные и превращается в JSON-схему того же экрана. Клиент не меняется:
// он по-прежнему рисует то, что пришло в ScreenDoc. Дизайнер лишь пишет,
// КАКИЕ виджеты и в каком порядке собрать в sections.
// ============================================================================

/// <summary>Один виджет на странице. Kind — имя; Width — ширина в 12-колоночной
/// сетке (12 = вся строка, 6 = половина, 4 = треть) — панели с суммарной
/// шириной ≤ 12 ложатся рядом, остальные друг под другом; Props — произвольные
/// настройки (дизайнер рисует форму по описанию из /api/layout/meta).</summary>
public sealed record LayoutItem(
    string Id,
    string Kind,
    int Width = 12,
    IReadOnlyDictionary<string, object?>? Props = null)
{
    public IReadOnlyDictionary<string, object?> Props { get; init; } = Props ?? new Dictionary<string, object?>();
}

/// <summary>Кнопка в шапке экрана. Label — перезаписываемый текст; null = дефолт.</summary>
public sealed record LayoutAction(string Type, string? Label = null, bool Enabled = true);

/// <summary>Раскладка экрана целиком. Сервер отдаёт её дизайнеру и сам же
/// превращает в ScreenDoc при GET /api/screens/{screen}.</summary>
public sealed record ScreenLayout(
    string Screen,
    string Title,
    string Hint,
    IReadOnlyList<LayoutItem> Sections,
    IReadOnlyList<LayoutAction> Actions);

// ---- описание виджетов/кнопок для палитры дизайнера (тоже приходит с сервера) ----

public sealed record PropSpec(string Key, string Label, string Type, object? Default = null);

public sealed record WidgetSpec(string Kind, string Title, string Description, IReadOnlyList<PropSpec> Props);

public sealed record ActionSpec(string Type, string Label, string? DefaultLabel = null);

public sealed record ScreenMeta(string Screen, IReadOnlyList<WidgetSpec> Widgets, IReadOnlyList<ActionSpec> Actions);

/// <summary>
/// Хранит раскладки, изменённые пользователем. Get() возвращает изменённую
/// или дефолт от билдера - поэтому без действий пользователя ничего не меняется.
/// </summary>
public sealed class LayoutStore
{
    private readonly Lock _lock = new();
    private readonly Dictionary<string, ScreenLayout> _saved = new();

    public ScreenLayout Get(string screen)
    {
        lock (_lock)
            return _saved.TryGetValue(screen, out var l) ? l : LayoutDefaults.For(screen);
    }

    /// <summary>Валидирует и хранит раскладку с панели дизайнера. Неизвестные
    /// виджеты/кнопки и пропы отбрасываются - клиент не сможет протолкнуть
    /// что-то несуществующее (сервер остаётся единственным источником правды).</summary>
    public ScreenLayout Apply(string screen, ScreenLayout client)
    {
        lock (_lock)
        {
            var meta = LayoutDefaults.Meta(screen);
            var validKinds = meta.Widgets.Select(w => w.Kind).ToHashSet();
            var validTypes = meta.Actions.Select(a => a.Type).ToHashSet();

            var sections = client.Sections
                .Where(s => !string.IsNullOrWhiteSpace(s.Kind) && validKinds.Contains(s.Kind))
                .Take(24)
                .Select((s, i) => new LayoutItem(
                    string.IsNullOrWhiteSpace(s.Id) ? $"{s.Kind}-{i + 1}" : s.Id,
                    s.Kind,
                    Math.Clamp(s.Width, 1, 12),
                    SanitizeProps(s.Kind, s.Props, meta)))
                .ToArray();

            var actions = client.Actions
                .Where(a => !string.IsNullOrWhiteSpace(a.Type) && validTypes.Contains(a.Type))
                .Take(12)
                .Select(a => new LayoutAction(a.Type, a.Label, a.Enabled))
                .ToArray();

            var l = new ScreenLayout(screen,
                client.Title?.Trim() ?? "",
                client.Hint ?? "",
                sections, actions);
            _saved[screen] = l;
            return l;
        }
    }

    public ScreenLayout Restore(string screen)
    {
        lock (_lock)
        {
            _saved.Remove(screen);
            return LayoutDefaults.For(screen);
        }
    }

    /// <summary>Откат при POST /api/runtime/reset - e2e и «Сбросить демо»
    /// возвращают не только товары, но и раскладки к дефолтам.</summary>
    public void Reset()
    {
        lock (_lock) _saved.Clear();
    }

    private static IReadOnlyDictionary<string, object?> SanitizeProps(
        string kind, IReadOnlyDictionary<string, object?>? props, ScreenMeta meta)
    {
        var spec = meta.Widgets.FirstOrDefault(w => w.Kind == kind);
        if (spec is null) return new Dictionary<string, object?>();
        var result = new Dictionary<string, object?>();
        foreach (var p in spec.Props)
        {
            object? v = p.Default;
            if (props is not null && props.TryGetValue(p.Key, out var raw) && raw is not null)
            {
                v = p.Type switch
                {
                    "number" when raw is JsonElement nj && nj.ValueKind == JsonValueKind.Number => nj.GetInt32(),
                    "number" when raw is int ni => ni,
                    "number" when raw is double nd => (int)nd,
                    "bool" when raw is JsonElement bj && bj.ValueKind is JsonValueKind.True or JsonValueKind.False => bj.GetBoolean(),
                    "bool" when raw is bool bb => bb,
                    _ when raw is JsonElement sj && sj.ValueKind == JsonValueKind.String => sj.GetString(),
                    _ when raw is string str => str,
                    _ => p.Default,
                };
            }
            result[p.Key] = v;
        }
        return result;
    }
}

/// <summary>Дефолтные раскладки = именно то, что билдер рендерил раньше
/// (полный набор полей, тот же порядок). Пока пользователь не сохранил свою
/// раскладку, витрина ведёт себя как прежде - e2e ни при чём.</summary>
public static class LayoutDefaults
{
    public const string CatalogTitle = "Склад — каталог товаров";
    public const string CatalogHint = "{count} позиций";

    public static ScreenLayout For(string screen) => screen switch
    {
        "catalog" => Catalog(),
        "product" => Product(),
        _ => new ScreenLayout(screen, "", "", [], []),
    };

    public static ScreenMeta Meta(string screen) => screen switch
    {
        "catalog" => MetaCatalog(),
        "product" => MetaProduct(),
        _ => new ScreenMeta(screen, [], []),
    };

    public static IReadOnlyList<ScreenMeta> MetaAll() => [MetaCatalog(), MetaProduct()];

    private static ScreenLayout Catalog() => new(
        "catalog", CatalogTitle, CatalogHint,
        Sections:
        [
            new LayoutItem("filter", "filter", 12, new Dictionary<string, object?>()),
            new LayoutItem("sort", "sort", 12, new Dictionary<string, object?>()),
            new LayoutItem("list", "list", 12, new Dictionary<string, object?>
            {
                ["showSubtitle"] = true,
                ["showTags"] = true,
                ["showTrailing"] = true,
                ["showPrices"] = true,
                ["limit"] = 0,
            }),
        ],
        Actions:
        [
            new LayoutAction("add-product"),
            new LayoutAction("search"),
            new LayoutAction("home"),
            new LayoutAction("refresh"),
        ]);

    private static ScreenLayout Product() => new(
        "product", "", "",
        Sections:
        [
            new LayoutItem("card", "card", 12, new Dictionary<string, object?>
            {
                ["showCategory"] = true,
                ["showSupplier"] = true,
                ["showPrice"] = true,
                ["showPromo"] = true,
                ["showStock"] = true,
                ["showReceivedOn"] = true,
                ["showStatus"] = true,
                ["showDescription"] = true,
                ["showCreated"] = true,
            }),
            new LayoutItem("stock-buttons", "stock-buttons", 12, new Dictionary<string, object?>()),
            new LayoutItem("edit-delete", "edit-delete", 12, new Dictionary<string, object?>()),
        ],
        Actions:
        [
            new LayoutAction("back"),
            new LayoutAction("home"),
        ]);

    private static WidgetSpec Widget(string kind, string title, string description, params PropSpec[] props) =>
        new(kind, title, description, props);

    private static PropSpec Bool(string key, string label, bool def) =>
        new(key, label, "bool", def);

    private static PropSpec Num(string key, string label, int def) =>
        new(key, label, "number", def);

    private static PropSpec Text(string key, string label) =>
        new(key, label, "text", null);

    private static ScreenMeta MetaCatalog() => new("catalog",
        Widgets:
        [
            Widget("filter", "Фильтр по категориям", "Чипы категорий, текущий подсвечен",
                Text("label", "Заголовок чипов")),
            Widget("sort", "Сортировка", "Чипы: по названию / цене / остатку / новизне",
                Text("label", "Заголовок чипов")),
            Widget("list", "Список позиций", "Строки товаров из каталога",
                Text("subtitle", "Шаблон подзаголовка (пусто = авто)"),
                Bool("showSubtitle", "Подзаголовок", true),
                Bool("showTags", "Теги", true),
                Bool("showTrailing", "Хвост (цена/остаток)", true),
                Bool("showPrices", "Показывать цены", true),
                Num("limit", "Лимит строк (0 = все)", 0)),
            Widget("welcome-banner", "Баннер-приветствие", "Сводка и намёк на дизайнера",
                Text("text", "Свой текст ({count} = число позиций)")),
            Widget("stats-card", "Карточка сводки", "Цифры по текущей выборке",
                Bool("showCount", "Позиций", true),
                Bool("showCats", "Категорий", true),
                Bool("showValue", "Стоимость", true),
                Bool("showOut", "Нет в наличии", true)),
        ],
        Actions:
        [
            new ActionSpec("add-product", "+ Добавить товар"),
            new ActionSpec("search", "🔍 Поиск"),
            new ActionSpec("home", "🏠 Главная"),
            new ActionSpec("refresh", "Обновить"),
            new ActionSpec("reset-demo", "Сбросить демо"),
        ]);

    private static ScreenMeta MetaProduct() => new("product",
        Widgets:
        [
            Widget("card", "Карточка атрибутов", "Поля товара (что показывать — галочки)",
                Bool("showCategory", "Категория", true),
                Bool("showSupplier", "Поставщик", true),
                Bool("showPrice", "Цена", true),
                Bool("showPromo", "Акция", true),
                Bool("showStock", "Остаток", true),
                Bool("showReceivedOn", "Дата поступления", true),
                Bool("showStatus", "Статус", true),
                Bool("showDescription", "Описание", true),
                Bool("showCreated", "Добавлен", true)),
            Widget("stock-buttons", "Инлайн-остаток", "−1 / +1 / списать весь остаток",
                Bool("showMinus", "Кнопка «−1»", true),
                Bool("showPlus", "Кнопка «+1»", true),
                Bool("showClear", "«Списать весь остаток»", true)),
            Widget("edit-delete", "Действия", "Изменить / Удалить (с подтверждением)",
                Bool("showEdit", "Изменить", true),
                Bool("showDelete", "Удалить", true)),
        ],
        Actions:
        [
            new ActionSpec("back", "← Назад"),
            new ActionSpec("home", "🏠 Главная"),
        ]);
}