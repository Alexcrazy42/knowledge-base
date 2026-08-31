using System.Globalization;
using System.Text.Json;
using Microsoft.AspNetCore.Http;

namespace Sdui.Api.Sdui;

/// <summary>
/// Фабрика схем экранов и обработчики runtime-мутаций.
/// Вся «UX-логика» (тексты, тоны, фильтры, сортировки, валидация,
/// куда идти после действия) - здесь, на сервере.
/// </summary>
public static class SduiScreens
{
    private const string AllCategory = "all";
    private static readonly (string Value, string Label)[] SortOptions =
    [
        ("name", "По названию"),
        ("price", "По цене"),
        ("stock", "По остатку"),
        ("fresh", "По новизне"),
    ];

    // ===================== ЭКРАНЫ =====================

    public static ScreenDoc Dashboard(Store store)
    {
        var goods = store.All();
        var buyable = goods.Where(g => g.Stock > 0).ToArray();
        var stockValue = buyable.Sum(g => g.Price * g.Stock);

        var sections = new List<Element>
        {
            new("banner",
                Text: $"На складе {goods.Count} позиций. Витрина живёт по схемам с сервера: каждое действие, текст и кнопку придумал бэкенд.",
                Tone: "info"),
            new("chips", Label: "Быстрый переход", OnOpen: Nav("catalog"),
                Chips:
                [
                    new Chip("go-catalog", "📦 Каталог", Action: Nav("catalog")),
                    new Chip("go-categories", "🏷 Категории", Action: Nav("categories")),
                    new Chip("go-search", "🔍 Поиск", Action: Nav("search")),
                    new Chip("go-stats", "📊 Статистика", Action: Nav("stats")),
                    new Chip("go-settings", "⚙️ Настройки", Action: Nav("settings")),
                ]),
            new("card", Fields:
            [
                new CardField("Позиций на складе", goods.Count.ToString()),
                new CardField("Категорий", store.Categories().Length.ToString()),
                new CardField("Стоимость склада", Money(stockValue, store.Settings.Currency)),
                new CardField("Нет в наличии", goods.Count(g => g.Stock <= 0).ToString(),
                    Tone: goods.Count(g => g.Stock <= 0) > 0 ? "error" : null),
            ]),
        };

        var actions = new List<ActionDto>
        {
            new(Type: "navigate", Label: "Открыть каталог", Screen: "catalog"),
            new(Type: "reset", Label: "Сбросить демо"),
        };

        return new ScreenDoc("dashboard", "Склад — главная", "SDUI-витрина", actions, sections);
    }

    public static ScreenDoc Catalog(Store store, LayoutStore layouts, IQueryCollection q)
    {
        var settings = store.Settings;
        var category = Read(q, "category");
        var query = Read(q, "q");
        var by = Read(q, "by") ?? "name";
        var sort = Read(q, "sort") ?? "name";

        IEnumerable<Good> goods = store.All();
        if (!settings.ShowInactive) goods = goods.Where(g => g.Active);
        if (category is not null) goods = goods.Where(g => g.Category == category);
        if (!string.IsNullOrWhiteSpace(query))
        {
            var search = query;
            goods = goods.Where(g => Field(g, by).Contains(search, StringComparison.OrdinalIgnoreCase));
        }

        var filtered = (sort switch
        {
            "price" => goods.OrderBy(g => g.Price).ThenBy(g => g.Name),
            "stock" => goods.OrderBy(g => g.Stock).ThenBy(g => g.Name),
            "fresh" => goods.OrderByDescending(g => g.CreatedAt).ThenBy(g => g.Name),
            _ => goods.OrderBy(g => g.Name, StringComparer.OrdinalIgnoreCase),
        }).ToArray();

        var view = new CatalogView(store, settings, category, query, by, sort, filtered);
        var layout = layouts.Get("catalog");

        // Экран собран из виджетов раскладки как из панелей. Порядок, состав
        // и настройки панелей задаёт дизайнер (/designer), а не этот код.
        var sections = new List<Element>();
        if (!string.IsNullOrWhiteSpace(query))
            sections.Add(new Element("banner",
                Text: $"Совпадений по запросу «{query}» в поле «{ByLabel(by)}»: {filtered.Length}",
                Tone: "info"));
        sections.AddRange(Assemble(layout.Sections, i => ResolveCatalog(view, i)));
        if (filtered.Length == 0 && sections.All(s => s.Kind != "list"))
        {
            sections.Add(new Element("banner",
                Text: "Ничего не найдено. Попробуйте другой фильтр.",
                Tone: "warn"));
        }

        var actions = BuildCatalogActions(layout.Actions);
        var title = string.IsNullOrWhiteSpace(layout.Title) ? LayoutDefaults.CatalogTitle : layout.Title;
        var hint = Sub(layout.Hint, "count", store.All().Count.ToString());

        return new ScreenDoc("catalog", title, hint, actions, sections);
    }

    public static ScreenDoc Product(Store store, LayoutStore layouts, string? rawId)
    {
        var good = ParseId(rawId) is int id ? store.Find(id) : null;
        if (good is null)
            return NotFoundScreen($"Товар #{rawId} не найден");

        var settings = store.Settings;
        var layout = layouts.Get("product");

        var sections = new List<Element>();
        sections.AddRange(Assemble(layout.Sections, i => ResolveProduct(good, settings, i)));

        var actions = BuildProductActions(layout.Actions);
        return new ScreenDoc("product", good.Name, $"ID {good.Id}", actions, sections);
    }

    // ===================== ВИДЖЕТЫ РАСКЛАДКИ (дизайнер) =====================
    // Каждый виджет - маленькая фабрика одного Element. Будь это «панель
    // Grafana»: список виджетов и их настройки клиент узнаёт из /api/layout/meta.

    private sealed record CatalogView(
        Store Store,
        Settings Settings,
        string? Category,
        string? Query,
        string By,
        string Sort,
        Good[] Filtered);

    private static Element? ResolveCatalog(CatalogView v, LayoutItem item)
    {
        return item.Kind switch
        {
            "welcome-banner" => new Element("banner",
                Text: PropText(item, "text") is { } custom
                    ? Sub(custom, "count", v.Store.All().Count.ToString())
                    : $"На складе {v.Store.All().Count} позиций. Раскладку страницы соберите сами: панели перетаскиваются в «🛠 Редакторе».",
                Tone: "info"),
            "filter" => new Element("chips", Label: PropText(item, "label") ?? "Категория", Chips: CategoryChips(v),
                OnOpen: Nav("catalog", BuildQuery(v))),
            "sort" => new Element("chips", Label: PropText(item, "label") ?? "Сортировка", Chips: SortChips(v),
                OnOpen: Nav("catalog", BuildQuery(v))),
            "list" => new Element("list", Rows: Rows(v, item).ToArray(),
                OnOpen: Nav("product"), EmptyText: "Ничего не найдено"),
            "stats-card" => StatsCard(v, item),
            _ => null,
        };
    }

    private static Element? StatsCard(CatalogView v, LayoutItem item)
    {
        var fields = new List<CardField>();
        if (Prop(item, "showCount", true)) fields.Add(new CardField("В выборке", v.Filtered.Length.ToString()));
        if (Prop(item, "showCats", true)) fields.Add(new CardField("Категорий", v.Store.Categories().Length.ToString()));
        if (Prop(item, "showValue", true)) fields.Add(new CardField("Стоимость выборки",
            Money(v.Filtered.Where(f => f.Stock > 0).Sum(f => f.Price * f.Stock), v.Settings.Currency)));
        if (Prop(item, "showOut", true)) fields.Add(new CardField("Нет в наличии", v.Filtered.Count(f => f.Stock <= 0).ToString(),
            Tone: v.Filtered.Any(f => f.Stock <= 0) ? "error" : null));
        return fields.Count == 0 ? null : new Element("card", Fields: fields);
    }

    private static Chip[] CategoryChips(CatalogView v)
    {
        var chips = new List<Chip>
        {
            new(AllCategory,
                string.IsNullOrWhiteSpace(v.Query) && v.Category is null ? "Все" : "✕ Сбросить",
                v.Category is null && string.IsNullOrWhiteSpace(v.Query),
                Action: Nav("catalog")),
        };
        chips.AddRange(v.Store.Categories().Select(c => new Chip(c, c,
            c == v.Category && string.IsNullOrWhiteSpace(v.Query),
            Nav("catalog", BuildQuery(v, category: c)))));
        return chips.ToArray();
    }

    private static Chip[] SortChips(CatalogView v) =>
        SortOptions.Select(o => new Chip(o.Value, o.Label,
            o.Value == v.Sort, Nav("catalog", BuildQuery(v, sort: o.Value)))).ToArray();

    private static IEnumerable<Row> Rows(CatalogView v, LayoutItem item)
    {
        IEnumerable<Good> goods = v.Filtered;
        var limit = PropInt(item, "limit", 0);
        if (limit > 0) goods = goods.Take(limit);

        var showSubtitle = Prop(item, "showSubtitle", true);
        var showTags = Prop(item, "showTags", true);
        var showTrailing = Prop(item, "showTrailing", true);
        var showPrices = Prop(item, "showPrices", true);
        var subtitleTemplate = PropText(item, "subtitle");

        return goods.Select(g => new Row(
            g.Id.ToString(),
            g.Name,
            Subtitle: showSubtitle
                ? subtitleTemplate ?? $"{g.Category} · добавлен {g.CreatedAt:dd.MM.yyyy}"
                : null,
            Trailing: !showTrailing ? null
                : g.Stock <= 0 ? "нет в наличии"
                : showPrices ? Money(g.Price, v.Settings.Currency) : $"{g.Stock} шт",
            Tags: showTags ? g.Tags() : null,
            Action: Nav("product", $"id={g.Id}")));
    }

    private static Element? ResolveProduct(Good good, Settings settings, LayoutItem item)
    {
        switch (item.Kind)
        {
            case "card":
                var fields = new List<CardField>();
                if (Prop(item, "showCategory", true)) fields.Add(new CardField("Категория", good.Category));
                if (Prop(item, "showSupplier", true)) fields.Add(new CardField("Поставщик", good.Supplier ?? "—"));
                if (Prop(item, "showPrice", true)) fields.Add(new CardField("Цена", Money(good.Price, settings.Currency)));
                if (Prop(item, "showPromo", true)) fields.Add(new CardField("Акция", good.Promo ? "🔥 да" : "нет", Tone: good.Promo ? null : "muted"));
                if (Prop(item, "showStock", true)) fields.Add(new CardField("Остаток", good.Stock <= 0 ? "нет в наличии" : good.Stock.ToString("N0", CultureInfo.InvariantCulture)));
                if (Prop(item, "showReceivedOn", true)) fields.Add(new CardField("Поступление", good.ReceivedOn is { } d ? d.ToString("dd.MM.yyyy") : "—"));
                if (Prop(item, "showStatus", true)) fields.Add(new CardField("Статус", good.Active ? "активен" : "неактивен", Tone: good.Active ? null : "muted"));
                if (Prop(item, "showDescription", true)) fields.Add(new CardField("Описание", string.IsNullOrWhiteSpace(good.Description) ? "—" : good.Description));
                if (Prop(item, "showCreated", true)) fields.Add(new CardField("Добавлен", good.CreatedAt.ToString("D", CultureInfo.GetCultureInfo("ru-RU"))));
                return new Element("card", Fields: fields);
            case "stock-buttons":
                var stockButtons = new List<ActionButton>();
                if (Prop(item, "showMinus", true)) stockButtons.Add(new ActionButton("−1", Action: Apply("stock", good.Id, Delta: -1)));
                if (Prop(item, "showPlus", true)) stockButtons.Add(new ActionButton("+1", Action: Apply("stock", good.Id, Delta: 1)));
                if (Prop(item, "showClear", true)) stockButtons.Add(new ActionButton("Списать весь остаток", Tone: "danger", Action: Apply("stock", good.Id, Set: 0)));
                return stockButtons.Count == 0 ? null : new Element("actions", Buttons: stockButtons);
            case "edit-delete":
                var editButtons = new List<ActionButton>();
                if (Prop(item, "showEdit", true)) editButtons.Add(new ActionButton("✏️ Изменить", Action: new ActionDto("navigate", Screen: "form-product", Query: $"edit={good.Id}")));
                if (Prop(item, "showDelete", true)) editButtons.Add(new ActionButton("🗑 Удалить", Tone: "danger",
                    Action: new ActionDto("delete", Entity: "product", EntityId: good.Id,
                        Confirm: $"Удалить товар «{good.Name}»? Отменить это действие нельзя.")));
                return editButtons.Count == 0 ? null : new Element("actions", Buttons: editButtons);
            default:
                return null;
        }
    }

    // Кнопки в шапке экрана тоже из раскладки: тип-действия + редактируемый
    // текст. Включённые в правильном порядке попадают в схему, остальные нет.
    private static IReadOnlyList<ActionDto> BuildCatalogActions(IReadOnlyList<LayoutAction> cfg)
    {
        var actions = new List<ActionDto>();
        foreach (var a in cfg.Where(a => a.Enabled))
        {
            switch (a.Type)
            {
                case "add-product": actions.Add(new ActionDto("navigate", Label: a.Label ?? "+ Добавить товар", Screen: "form-product")); break;
                case "search": actions.Add(new ActionDto("navigate", Label: a.Label ?? "🔍 Поиск", Screen: "search")); break;
                case "home": actions.Add(new ActionDto("navigate", Label: a.Label ?? "🏠 Главная", Screen: "dashboard")); break;
                case "refresh": actions.Add(new ActionDto("refresh", Label: a.Label ?? "Обновить")); break;
                case "reset-demo": actions.Add(new ActionDto("reset", Label: a.Label ?? "Сбросить демо")); break;
            }
        }
        return actions;
    }

    private static IReadOnlyList<ActionDto> BuildProductActions(IReadOnlyList<LayoutAction> cfg)
    {
        var actions = new List<ActionDto>();
        foreach (var a in cfg.Where(a => a.Enabled))
        {
            switch (a.Type)
            {
                case "back": actions.Add(new ActionDto("back", Label: a.Label ?? "← Назад")); break;
                case "home": actions.Add(new ActionDto("navigate", Label: a.Label ?? "🏠 Главная", Screen: "dashboard")); break;
            }
        }
        return actions;
    }

    private static bool Prop(LayoutItem item, string key, bool def) =>
        item.Props.TryGetValue(key, out var v) switch
        {
            true when v is bool b => b,
            true when v is JsonElement je && je.ValueKind is JsonValueKind.True or JsonValueKind.False => je.GetBoolean(),
            _ => def,
        };

    private static int PropInt(LayoutItem item, string key, int def) =>
        item.Props.TryGetValue(key, out var v) switch
        {
            true when v is JsonElement je && je.ValueKind == JsonValueKind.Number && je.TryGetInt32(out var n) => n,
            true when v is int i => i,
            true when v is double d => (int)d,
            _ => def,
        };

    private static string? PropText(LayoutItem item, string key) =>
        item.Props.TryGetValue(key, out var v) switch
        {
            true when v is string s && s.Length > 0 && !string.IsNullOrWhiteSpace(s) => s.Trim(),
            true when v is JsonElement je && je.ValueKind == JsonValueKind.String =>
                je.GetString() is { Length: > 0 } s ? s.Trim() : null,
            _ => null,
        };

    /// <summary>Собирает sections из панелей раскладки, укладывая их в 12-колоночную
    /// сетку: пока сумма ширин ≤ 12 панели идут рядом (один элемент grid с spans),
    /// как только не влезает — панель едет на новую «строку». Одиночная панель на
    /// строке отдаётся как есть, без обёртки, чтобы дефолтные экраны не поменяли DOM.</summary>
    private static IEnumerable<Element> Assemble(IReadOnlyList<LayoutItem> items, Func<LayoutItem, Element?> resolve)
    {
        var rows = new List<List<(int Width, Element El)>>();
        var current = new List<(int, Element)>();
        var total = 0;
        foreach (var item in items)
        {
            if (resolve(item) is not { } el) continue;
            var w = Math.Clamp(item.Width, 1, 12);
            if (current.Count > 0 && total + w > 12)
            {
                rows.Add(current);
                current = new List<(int, Element)>();
                total = 0;
            }
            current.Add((w, el));
            total += w;
        }
        if (current.Count > 0) rows.Add(current);

        foreach (var row in rows)
        {
            if (row.Count == 1)
            {
                yield return row[0].El;
            }
            else
            {
                yield return new Element("grid",
                    Items: row.Select(r => new GridItem(r.Width, r.El)).ToArray());
            }
        }
    }

    private static string Sub(string template, string key, string value) =>
        string.IsNullOrWhiteSpace(template) ? template : template.Replace("{" + key + "}", value);

    public static ScreenDoc FormProduct(Store store, string? rawEdit)
    {
        var good = ParseId(rawEdit) is int editId ? store.Find(editId) : null;
        var editing = good is not null;

        var form = new Element(
            Kind: "form",
            FormId: "product",
            Id: good?.Id,
            SubmitLabel: editing ? "Сохранить" : "Добавить товар",
            Form:
            [
                Text("name", "Название", good?.Name, "Например: Кофе зерновой", new Rules(Required: true, MinLen: 2, MaxLen: 60)),
                Select("category", "Категория", good?.Category, store.Categories(), new Rules(Required: true)),
SelectOpt("supplier", "Поставщик", good?.Supplier ?? Store.Suppliers[0],
                    Store.Suppliers.Select(o => (o, o)),
                    hint: "Необязательно"),
                Number("price", "Цена", good?.Price, "₽", new Rules(Required: true, Min: 1, Max: 100000)),
                Number("stock", "Остаток", good?.Stock, "шт", new Rules(Required: true, Min: 0, Max: 10000)),
                Date("receivedOn", "Дата поступления", good?.ReceivedOn, "Необязательно"),
                Switch("promo", "Акция", good?.Promo ?? false, "Подсветит позицию на витрине"),
                Switch("active", "Товар в продаже", good?.Active ?? true, "Выключите, чтобы скрыть позицию"),
                TextArea("description", "Описание", good?.Description, "Необязательно. До 200 символов.",
                    hint: "Необязательно. До 200 символов.", rules: new Rules(MaxLen: 200)),
            ]);

        var actions = new List<ActionDto> { new(Type: "back", Label: "← Назад") };

        return new ScreenDoc("form-product",
            editing ? $"Редактирование: {good!.Name}" : "Новый товар",
            null, actions, [form]);
    }

    public static ScreenDoc Categories(Store store)
    {
        var all = store.Categories();
        var goods = store.All();

        var rows = all.Select(c => new Row(
            c,
            c,
            Subtitle: null,
            Trailing: $"{goods.Count(g => g.Category == c)} поз.",
            Action: Nav("catalog", BuildQuery(category: c)))).ToArray();

        var sections = new List<Element>
        {
            new("banner", Text: $"Справочник категорий: {all.Length}. Клик по строке откроет каталог с фильтром.",
                Tone: "info"),
            new("list", Rows: rows, OnOpen: Nav("catalog"), EmptyText: "Категорий пока нет"),
        };

        var actions = new List<ActionDto>
        {
            new(Type: "navigate", Label: "+ Добавить категорию", Screen: "form-category"),
            new(Type: "navigate", Label: "🏠 Главная", Screen: "dashboard"),
        };

        return new ScreenDoc("categories", "Склад — категории", $"всего {all.Length}", actions, sections);
    }

    public static ScreenDoc FormCategory()
    {
        var form = new Element(Kind: "form", FormId: "category", SubmitLabel: "Сохранить категорию",
            Form: [Text("name", "Название категории", null, "Например: Канцтовары", new Rules(Required: true, MinLen: 2, MaxLen: 24))]);
        var actions = new List<ActionDto> { new(Type: "back", Label: "← Назад") };
        return new ScreenDoc("form-category", "Новая категория", null, actions, [form]);
    }

    public static ScreenDoc Search()
    {
        var form = new Element(Kind: "form", FormId: "search", SubmitLabel: "Найти",
            Form:
            [
                SelectOpt("by", "Искать по", "name",
                    [("name", "Название"), ("category", "Категория"), ("description", "Описание")], new Rules(Required: true)),
                Text("q", "Запрос", null, "Например: кофе", new Rules(Required: true, MinLen: 1, MaxLen: 50)),
            ]);
        var actions = new List<ActionDto> { new(Type: "back", Label: "← Назад") };
        return new ScreenDoc("search", "Склад — поиск", "Найдёте по полю, которое выберете", actions, [form]);
    }

    public static ScreenDoc Stats(Store store)
    {
var all = store.All();
        var buyable = all.Where(g => g.Stock > 0).ToArray();
        var avg = all.Where(g => g.Price > 0).Select(g => g.Price).DefaultIfEmpty().Average();
        var rows = new List<Row>
        {
            new("total", "Позиций всего", Trailing: all.Count.ToString()),
            new("active", "В продаже (активны)", Trailing: all.Count(g => g.Active).ToString()),
            new("out", "Нет в наличии", Trailing: all.Count(g => g.Stock <= 0).ToString(),
                Tags: all.Count(g => g.Stock <= 0) > 0 ? [new Tag("внимание", "error")] : null),
            new("avg", "Средняя цена", Trailing: Money(avg, store.Settings.Currency)),
            new("value", "Стоимость склада", Trailing: Money(buyable.Sum(g => g.Price * g.Stock), store.Settings.Currency),
                Tags: [new Tag("по наличию", "muted")]),
            new("cats", "Категорий", Trailing: store.Categories().Length.ToString()),
        };

        var sections = new List<Element>
        {
            new("banner", Text: "Статистика считается на сервере из in-memory стора.",
                Tone: "info"),
            new("list", Rows: rows, OnOpen: Nav("catalog"), EmptyText: "—"),
        };

        var actions = new List<ActionDto>
        {
            new(Type: "refresh", Label: "Обновить"),
            new(Type: "navigate", Label: "🏠 Главная", Screen: "dashboard"),
        };

        return new ScreenDoc("stats", "Склад — статистика", null, actions, sections);
    }

    public static ScreenDoc Settings(Store store)
    {
        var s = store.Settings;
        var form = new Element(Kind: "form", FormId: "settings", SubmitLabel: "Сохранить настройки",
            Form:
            [
                SelectOpt("currency", "Валюта витрины", s.Currency, [("₽", "Рубли (₽)"), ("$", "Доллары ($)")], new Rules(Required: true)),
                Switch("showInactive", "Показывать неактивные", s.ShowInactive, "Выключите — неактивные уйдут из каталога"),
                Switch("highlightLow", "Подсвечивать низкие остатки", s.HighlightLow, "Тег «мало» у позиций с остатком меньше 10"),
            ]);
        var actions = new List<ActionDto>
        {
            new(Type: "reset", Label: "Сбросить демо"),
            new(Type: "navigate", Label: "🏠 Главная", Screen: "dashboard"),
        };
        return new ScreenDoc("settings", "Склад — настройки", "Влияют на каталог без передеплоя клиента", actions, [form]);
    }

    // ===================== RUNTIME: submit =====================

public static MutationReply Submit(Store store, SubmitRequest body)
    {
        var values = body.Values ?? new Dictionary<string, JsonElement>();
        var errors = body.Form switch
        {
            "category" => ValidateCategory(values),
            "settings" => ValidateSettings(values),
            "search" => ValidateSearch(values),
            _ => ValidateProduct(values),
        };
        if (errors.Count > 0)
            return new MutationReply(Ok: false, Toast: "Проверьте отмеченные поля", Errors: errors);

        return body.Form switch
        {
            "category" => SubmitCategory(store, values),
            "settings" => SubmitSettings(store, values),
            "search" => SubmitSearch(values),
            _ => SubmitProduct(store, body, values),
        };
    }

    private static MutationReply SubmitProduct(Store store, SubmitRequest body, IReadOnlyDictionary<string, JsonElement> values)
    {
        var name = Text(values, "name") ?? "";
        var price = Number(values, "price") ?? 0m;
        var stock = IntNumber(values, "stock") ?? 0;
        var active = values.TryGetValue("active", out var a) && a.ValueKind == JsonValueKind.True;
        var promo = values.TryGetValue("promo", out var p) && p.ValueKind == JsonValueKind.True;
        var category = Text(values, "category") ?? "";
        var description = Text(values, "description") ?? "";
        var supplier = Text(values, "supplier");
        var receivedOn = DateValue(values, "receivedOn");
        var created = body.Id is null ? DateTime.Today : store.Find(body.Id.Value)?.CreatedAt ?? DateTime.Today;

        var good = new Good(body.Id ?? 0, name, category, price, stock, description, active, created,
            Supplier: supplier, ReceivedOn: receivedOn, Promo: promo);

        if (body.Id is int editing)
        {
            return store.Update(good)
                ? new MutationReply(Ok: true, Toast: $"Товар «{name}» обновлён", Next: Nav("catalog"))
                : new MutationReply(Ok: false, Toast: $"Товар #{editing} не найден");
        }
        store.Add(good);
        return new MutationReply(Ok: true, Toast: $"Товар «{name}» добавлен", Next: Nav("catalog"));
    }

    private static MutationReply SubmitCategory(Store store, IReadOnlyDictionary<string, JsonElement> values)
    {
        var name = Text(values, "name")!.Trim();
        if (!store.AddCategory(name))
            return new MutationReply(Ok: false, Errors: new Dictionary<string, string> { ["name"] = "Такая категория уже есть" });
        return new MutationReply(Ok: true, Toast: $"Категория «{name}» добавлена", Next: Nav("categories"));
    }

private static MutationReply SubmitSettings(Store store, IReadOnlyDictionary<string, JsonElement> values)
    {
        var currency = Text(values, "currency") ?? "₽";
        var showInactive = Bool(values, "showInactive") ?? true;
        var highlightLow = Bool(values, "highlightLow") ?? true;
        store.SetSettings(new Settings(currency, showInactive, highlightLow));
        return new MutationReply(Ok: true, Toast: "Настройки сохранены", Next: Nav("settings"));
    }

    private static MutationReply SubmitSearch(IReadOnlyDictionary<string, JsonElement> values)
    {
        var q = Text(values, "q")!.Trim();
        var by = Text(values, "by") ?? "name";
        return new MutationReply(Ok: true, Toast: $"Ищем «{q}» в поле «{ByLabel(by)}»",
            Next: Nav("catalog", BuildQuery(q: q, by: by)));
    }

    // ===================== RUNTIME: apply (инлайн-мутации) =====================

    public static MutationReply Apply(Store store, ApplyRequest body)
    {
        if (body.Entity != "product")
            return new MutationReply(Ok: false, Toast: $"Неизвестная сущность «{body.Entity}»");
        if (body.Id is not int id || store.Find(id) is not { } good)
            return new MutationReply(Ok: false, Toast: $"Товар #{body.Id} не найден");

        var newStock = body.Op switch
        {
            "stock" => Clamp(body.Set ?? good.Stock + (body.Delta ?? 0), 0, 10000),
            _ => good.Stock,
        };
        if (newStock == good.Stock)
            return new MutationReply(Ok: false, Toast: "Остаток не изменился");
        store.Update(good with { Stock = newStock });
return new MutationReply(Ok: true,
            Toast: $"Остаток «{good.Name}» {Money(newStock, store.Settings.Currency)}",
            Next: Nav("product", $"id={good.Id}"));
    }

    // ===================== RUNTIME: delete =====================

    public static MutationReply Delete(Store store, DeleteRequest body)
    {
        if (body.Entity != "product")
            return new MutationReply(Ok: false, Toast: $"Неизвестная сущность «{body.Entity}»");
        if (body.Id is not int id || store.Find(id) is not { } good)
            return new MutationReply(Ok: false, Toast: $"Товар #{body.Id} не найден");

        store.Remove(id);
        return new MutationReply(Ok: true, Toast: $"Товар «{good.Name}» удалён", Next: Nav("catalog"));
    }

    // ===================== Валидация форм =====================

    private static Dictionary<string, string> ValidateProduct(IReadOnlyDictionary<string, JsonElement> v)
    {
        var errors = new Dictionary<string, string>();
        var name = Text(v, "name");
        var desc = Text(v, "description");
        var price = Number(v, "price");
        var stock = Number(v, "stock");

        if (string.IsNullOrWhiteSpace(name))
            errors["name"] = "Укажите название товара";
        else if (name.Length < 2)
            errors["name"] = "Название слишком короткое (минимум 2 символа)";
        else if (name.Length > 60)
            errors["name"] = "Название слишком длинное (максимум 60 символов)";

        if (string.IsNullOrWhiteSpace(Text(v, "category")))
            errors["category"] = "Выберите категорию";

        if (price is null)
            errors["price"] = "Укажите цену";
        else if (price is < 1 or > 100000)
            errors["price"] = "Цена от 1 до 100000 ₽";

        if (stock is null)
            errors["stock"] = "Укажите остаток";
        else if (stock is < 0 or > 10000)
            errors["stock"] = "Остаток от 0 до 10000 шт";

        if (desc?.Length > 200)
            errors["description"] = "Описание длиннее 200 символов";

        return errors;
    }

    private static Dictionary<string, string> ValidateCategory(IReadOnlyDictionary<string, JsonElement> v)
    {
        var errors = new Dictionary<string, string>();
        var name = Text(v, "name");
        if (string.IsNullOrWhiteSpace(name))
            errors["name"] = "Укажите название категории";
        else if (name.Length < 2)
            errors["name"] = "Слишком короткое (минимум 2 символа)";
        else if (name.Length > 24)
            errors["name"] = "Слишком длинное (максимум 24 символа)";
        return errors;
    }

private static Dictionary<string, string> ValidateSettings(IReadOnlyDictionary<string, JsonElement> v)
    {
        var errors = new Dictionary<string, string>();
        var currency = Text(v, "currency");
        if (currency is not ("₽" or "$"))
            errors["currency"] = "Выберите валюту";
        return errors;
    }

    private static Dictionary<string, string> ValidateSearch(IReadOnlyDictionary<string, JsonElement> v)
    {
        var errors = new Dictionary<string, string>();
        var q = Text(v, "q");
        if (string.IsNullOrWhiteSpace(q))
            errors["q"] = "Введите запрос";
        else if (q.Length > 50)
            errors["q"] = "Запрос длиннее 50 символов";
        return errors;
    }

    // ===================== helpers =====================

    private static ScreenDoc NotFoundScreen(string text) =>
        new("not-found", "Упс", text,
            [new ActionDto("back", Label: "← Назад")],
            [new Element("banner", Text: text, Tone: "error")]);

    private static ActionDto Nav(string screen, string? query = null) =>
        new("navigate", Screen: screen, Query: query);

    private static ActionDto Apply(string op, int id, int? Delta = null, int? Set = null) =>
        new("apply", Op: op, Entity: "product", EntityId: id, Delta: Delta, Set: Set);

    private static string BuildQuery(string? category = null, string? q = null, string? by = null, string? sort = null)
    {
        var parts = new List<string>();
        if (category is not null) parts.Add($"category={Escape(category)}");
        if (!string.IsNullOrWhiteSpace(q)) parts.Add($"q={Escape(q)}");
        if (!string.IsNullOrWhiteSpace(by)) parts.Add($"by={by}");
        if (!string.IsNullOrWhiteSpace(sort)) parts.Add($"sort={sort}");
        return string.Join("&", parts);
    }

    private static string BuildQuery(CatalogView v, string? category = null, string? q = null, string? by = null, string? sort = null) =>
        BuildQuery(category: category ?? v.Category, q: q ?? v.Query, by: by ?? v.By, sort: sort ?? v.Sort);

    private static string Escape(string s) => Uri.EscapeDataString(s);

    private static string? Read(IQueryCollection q, string key)
    {
        var s = q[key].ToString();
        return string.IsNullOrWhiteSpace(s) ? null : s;
    }

    private static string Field(Good g, string by) => by switch
    {
        "category" => g.Category,
        "description" => g.Description,
        _ => g.Name,
    };

    private static string ByLabel(string by) => by switch
    {
        "category" => "категории",
        "description" => "описании",
        _ => "названии",
    };

    private static FormField Text(string name, string label, string? value, string? placeholder, Rules? rules) =>
        new(name, "text", label, Placeholder: placeholder, Value: value, Rules: rules);

    private static FormField TextArea(string name, string label, string? value, string? placeholder, string? hint, Rules? rules) =>
        new(name, "textarea", label, Placeholder: placeholder, Value: value, Hint: hint, Rules: rules);

    private static FormField Number(string name, string label, object? value, string? unit, Rules? rules) =>
        new(name, "number", label, Hint: unit, Value: value, Rules: rules);

    private static FormField Date(string name, string label, DateTime? value, string? hint) =>
        new(name, "date", label, Value: value?.ToString("yyyy-MM-dd"), Hint: hint);

    private static FormField Select(string name, string label, string? value, IEnumerable<string> opts, Rules? rules) =>
        SelectOpt(name, label, value, opts.Select(o => (o, o)), rules);

    private static FormField SelectOpt(string name, string label, string? value, IEnumerable<(string Value, string Label)> opts, Rules? rules = null, string? hint = null) =>
        new(name, "select", label, Hint: hint, Value: value,
            Options: opts.Select(o => new FormOption(o.Value, o.Label)).ToArray(), Rules: rules);

    private static FormField Switch(string name, string label, bool value, string? hint) =>
        new(name, "switch", label, Value: value, Hint: hint);

    private static string Money(decimal v, string currency) =>
        $"{v.ToString("0.##", CultureInfo.InvariantCulture)} {currency}";

    private static int Clamp(int v, int min, int max) => Math.Clamp(v, min, max);

    private static int? ParseId(string? raw) =>
        int.TryParse(raw, out var id) && id > 0 ? id : null;

    private static string? Text(IReadOnlyDictionary<string, JsonElement> v, string key) =>
        v.TryGetValue(key, out var e) && e.ValueKind == JsonValueKind.String ? e.GetString() : null;

    private static bool? Bool(IReadOnlyDictionary<string, JsonElement> v, string key)
    {
        if (!v.TryGetValue(key, out var e)) return null;
        return e.ValueKind switch
        {
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.String when bool.TryParse(e.GetString(), out var b) => b,
            _ => null,
        };
    }

    private static decimal? Number(IReadOnlyDictionary<string, JsonElement> v, string key)
    {
        if (!v.TryGetValue(key, out var e)) return null;
        return e.ValueKind switch
        {
            JsonValueKind.Number => e.GetDecimal(),
            JsonValueKind.String when decimal.TryParse(e.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var d) => d,
            _ => null,
        };
    }

    private static int? IntNumber(IReadOnlyDictionary<string, JsonElement> v, string key) =>
        Number(v, key) is decimal d ? (int)d : null;

    private static DateTime? DateValue(IReadOnlyDictionary<string, JsonElement> v, string key)
    {
        var s = Text(v, key);
        return string.IsNullOrWhiteSpace(s) ? null
            : DateTime.TryParseExact(s, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var d) ? d : null;
    }
}

internal static class GoodViews
{
    public static Tag[] Tags(this Good g)
    {
        var tags = new List<Tag> { new(g.Category) };
        if (g.Promo) tags.Add(new Tag("🔥 акция", "promo"));
        if (!g.Active) tags.Add(new Tag("неактивен", "muted"));
        if (g.Stock <= 0) tags.Add(new Tag("нет в наличии", "error"));
        return tags.ToArray();
    }
}
