namespace Sdui.Api.Sdui;

/// <summary>Домен «склад» - единственное, о чём знает бэкенд. Клиент о домене ничего не знает.</summary>
public sealed record Good(
    int Id,
    string Name,
    string Category,
    decimal Price,
    int Stock,
    string Description,
    bool Active,
    DateTime CreatedAt,
    string? Supplier = null,
    DateTime? ReceivedOn = null,
    bool Promo = false);

/// <summary>Настройки витрины, меняются формой «Настройки» на сервере и сразу
/// влияют на каталог (валюта, показ неактивных). Клиент ни про что не знает.</summary>
public sealed record Settings(string Currency, bool ShowInactive, bool HighlightLow)
{
    public static Settings Default => new("₽", true, true);
}

/// <summary>In-memory репозиторий с сидом. Хранилище и бизнес-логика живут только на сервере.</summary>
public sealed class Store
{
    private readonly Lock _lock = new();
    private readonly List<Good> _items = [];
    private readonly List<string> _extraCategories = [];
    private Settings _settings = Settings.Default;
    private int _nextId = 1;

    public Store()
    {
        Seed();
    }

    /// <summary>Поставщики - справочник для select в форме товара (отдаёт сервер).</summary>
    public static readonly string[] Suppliers =
    [
        "ООО «Северный лог»",
        "ООО «ПродМаркет»",
        "АО «ТехноТрейд»",
        "ИП Смирнов А. В.",
        "ООО «БытОпт»",
    ];

    public IReadOnlyList<Good> All()
    {
        lock (_lock)
            return _items.ToArray();
    }

    public Good? Find(int id)
    {
        lock (_lock)
            return _items.FirstOrDefault(x => x.Id == id);
    }

    public int Add(Good g)
    {
        lock (_lock)
        {
            var id = _nextId++;
            _items.Add(g with { Id = id });
            return id;
        }
    }

    public bool Update(Good g)
    {
        lock (_lock)
        {
            var i = _items.FindIndex(x => x.Id == g.Id);
            if (i < 0) return false;
            _items[i] = g;
            return true;
        }
    }

    public Good? Remove(int id)
    {
        lock (_lock)
        {
            var i = _items.FindIndex(x => x.Id == id);
            if (i < 0) return null;
            var g = _items[i];
            _items.RemoveAt(i);
            return g;
        }
    }

    // Категории = те, что уже есть у товаров, плюс созданные формой «Добавить
    // категорию» (они сразу появляются чипами в каталоге).
    public string[] Categories() => All()
        .Select(x => x.Category)
        .Concat(_extraCategories)
        .Distinct()
        .OrderBy(x => x, StringComparer.OrdinalIgnoreCase)
        .ToArray();

    public bool AddCategory(string name)
    {
        name = name.Trim();
        lock (_lock)
        {
            if (Categories().Contains(name, StringComparer.OrdinalIgnoreCase)) return false;
            _extraCategories.Add(name);
            return true;
        }
    }

    public Settings Settings
    {
        get
        {
            lock (_lock) return _settings;
        }
    }

    public void SetSettings(Settings s)
    {
        lock (_lock) _settings = s;
    }

    // Полный откат к сиду. Нужен e2e (идемпотентность теста) и для демо
    // «скинуть витрину» из runtime-акций.
    public void Reset()
    {
        lock (_lock)
        {
            _items.Clear();
            _extraCategories.Clear();
            _settings = Settings.Default;
            _nextId = 1;
            Seed();
        }
    }

    private void Seed()
    {
        var now = DateTime.Today;
        Add(new(0, "Овсяные хлопья", "Продукты", 189m, 42, "Крупные хлопья, 500 г. Без добавок.", true, now.AddDays(-1)));
        Add(new(0, "Гречка", "Продукты", 129.5m, 0, "Ядрица, отборная. 900 г.", true, now.AddDays(-2)));
        Add(new(0, "Кофе зерновой", "Продукты", 749m, 17, "Обжарка средняя, 1 кг.", true, now.AddDays(-3),
            Supplier: "ООО «ПродМаркет»", ReceivedOn: now.AddDays(-3), Promo: true));
        Add(new(0, "Вода минеральная", "Напитки", 89m, 120, "Сильногазированная, 1,5 л.", true, now.AddDays(-4),
            Supplier: "ООО «Северный лог»", ReceivedOn: now.AddDays(-1)));
        Add(new(0, "Сок яблочный", "Напитки", 159m, 30, "Прямого отжима, 1 л.", true, now.AddDays(-5)));
        Add(new(0, "Порошок стиральный", "Бытовая химия", 399m, 12, "Для цветного белья, 3 кг.", true, now.AddDays(-6)));
        Add(new(0, "Гель для посуды", "Бытовая химия", 149m, 55, "Концентрат с алоэ, 500 мл.", true, now.AddDays(-7)));
        Add(new(0, "Мышь беспроводная", "Электроника", 999m, 8, "USB-приёмник, 1600 dpi.", true, now.AddDays(-8)));
        Add(new(0, "Клавиатура компактная", "Электроника", 1290m, 0, "Тихая, чёрная, проводная.", false, now.AddDays(-9)));
    }
}