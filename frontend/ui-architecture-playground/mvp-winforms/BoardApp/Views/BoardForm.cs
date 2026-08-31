// ============================================================================
// BoardForm - ГЛАВНАЯ WinForms-вьюха, реализующая IBoardView.
// Часть 1: контролы, раскладка, трансляция жестов в события контракта.
// Часть 2 (BoardForm.View.cs): реализация методов IBoardView.
//
// Что здесь ЕСТЬ:  контролы, раскладка, жесты (клик, DnD).
// Чего здесь НЕТ:  бизнес-правил и обращений к домену - это Presenter.
// ============================================================================

using BoardApp.Core;
using BoardApp.Views.Contracts;

namespace BoardApp.Views;

public sealed partial class BoardForm : Form, IBoardView
{
    // ---- шапка ----
    private readonly ComboBox _boardsCombo = new() { Width = 260, DropDownStyle = ComboBoxStyle.DropDownList };
    private readonly Button _newBoard = new() { Text = "+ Доска" };
    private readonly Button _renameBoard = new() { Text = "Переименовать" };
    private readonly Button _deleteBoard = new() { Text = "Удалить" };
    private readonly Button _usersBtn = new() { Text = "Пользователи" };

    // ---- сиды / файлы / сброс ----
    private readonly Button _seedEpic = new() { Text = "+ Тестовый эпик" };
    private readonly Button _seedTasks = new() { Text = "+10 задач" };
    private readonly Button _exportBtn = new() { Text = "Экспорт" };
    private readonly Button _importBtn = new() { Text = "Импорт" };
    private readonly Button _resetAllBtn = new() { Text = "Сброс всего…" };

    // ---- фильтры ----
    private readonly ComboBox _assigneeFilter = new() { Width = 220, DropDownStyle = ComboBoxStyle.DropDownList };
    private readonly ComboBox _epicFilter = new() { Width = 300, DropDownStyle = ComboBoxStyle.DropDownList };
    private readonly ComboBox _sort = new() { Width = 190, DropDownStyle = ComboBoxStyle.DropDownList };
    private readonly TextBox _search = new() { Width = 230, PlaceholderText = "Поиск по задачам…" };
    private readonly Button _applyFilters = new() { Text = "Применить" };
    private readonly Button _resetFilters = new() { Text = "Сбросить фильтры" };

    // ---- канбан и список ----
    private readonly TabControl _tabs = new() { Dock = DockStyle.Fill };
    private readonly Dictionary<TaskState, Panel> _columns = new();
    private readonly Dictionary<TaskState, FlowLayoutPanel> _cardsHosts = new();
    private readonly Dictionary<TaskState, Label> _counters = new();
    private readonly DataGridView _table = MakeTable();

    // ---- сайдбар эпиков ----
    private readonly ListBox _epicsList = new() { Dock = DockStyle.Fill, IntegralHeight = false };
    private readonly List<EpicStatRow> _epicRows = [];             // параллельно строкам ListBox
    private readonly Button _addEpic = new() { Text = "+ Создать эпик", Dock = DockStyle.Top };
    private readonly Button _deleteEpic = new() { Text = "Удалить выбранный", Dock = DockStyle.Top, Enabled = false };

    private readonly ToolStripStatusLabel _flash = new("Готово");

    /// <summary>Щит от эха: не транслировать программную смену SelectedIndex в событие.</summary>
    private bool _suppressBoardSwitch;

    public BoardForm()
    {
        Text = "Канбан — MVP (Model-View-Presenter, WinForms)";
        StartPosition = FormStartPosition.CenterScreen;
        Size = new Size(1300, 800);
        MinimumSize = new Size(1000, 600);

        // Базовый шрифт задаётся один раз в csproj (ApplicationDefaultFont).
        // КНОПКАМ обязательно AutoSize: их размер по умолчанию фиксирован (75x23)
        // и от крупного шрифта НЕ растёт - текст вылезает за границы.
        foreach (var b in new[]
                 {
                     _newBoard, _renameBoard, _deleteBoard, _usersBtn, _seedEpic,
                     _seedTasks, _exportBtn, _importBtn, _resetAllBtn, _applyFilters, _resetFilters
                 })
            b.AutoSize = true;

        BuildLayout();
        WireEvents();
    }

    // ------------------------------------------------------------------
    // Трансляция жестов -> события контракта. Это ЕДИНСТВЕННОЕ место,
    // где "клик по кнопке" становится понятием предметной области.
    // Presenter подписан на события контракта и ничего не знает о кнопках.
    // ------------------------------------------------------------------
    private void WireEvents()
    {
        _newBoard.Click += (_, _) => CreateBoardRequested?.Invoke(this, EventArgs.Empty);
        _renameBoard.Click += (_, _) => RenameBoardRequested?.Invoke(this, EventArgs.Empty);
        _deleteBoard.Click += (_, _) => DeleteBoardRequested?.Invoke(this, EventArgs.Empty);
        _usersBtn.Click += (_, _) => OpenUsersRequested?.Invoke(this, EventArgs.Empty);

        // Смена выбранной доски в комбобоксе. Щит нужен потому, что ShowBoards
        // программно выставляет SelectedIndex - без него был бы вечный цикл:
        // рендер -> событие -> презентер -> рендер...
        _boardsCombo.SelectedIndexChanged += (_, _) =>
        {
            if (_suppressBoardSwitch) return;
            if (_boardsCombo.SelectedItem is BoardListItem b)
                SwitchBoardRequested?.Invoke(this, new IdEventArgs(b.Id));
        };

        _seedEpic.Click += (_, _) => SeedEpicRequested?.Invoke(this, EventArgs.Empty);
        _seedTasks.Click += (_, _) => SeedTasksRequested?.Invoke(this, EventArgs.Empty);
        _addEpic.Click += (_, _) => CreateEpicRequested?.Invoke(this, EventArgs.Empty);

        // ListBox хранит строки для отображения; Id достаём из параллельного
        // списка DTO, заполненного в ShowEpics в том же порядке.
        _deleteEpic.Click += (_, _) =>
        {
            var i = _epicsList.SelectedIndex;
            if (i >= 0 && i < _epicRows.Count)
                EpicDeleteRequested?.Invoke(this, new IdEventArgs(_epicRows[i].Id));
        };
        _epicsList.SelectedIndexChanged += (_, _) => _deleteEpic.Enabled = _epicsList.SelectedIndex >= 0;

        _exportBtn.Click += (_, _) => ExportRequested?.Invoke(this, EventArgs.Empty);
        _importBtn.Click += (_, _) => ImportRequested?.Invoke(this, EventArgs.Empty);
        _resetAllBtn.Click += (_, _) => ResetAllRequested?.Invoke(this, EventArgs.Empty);

        _applyFilters.Click += (_, _) => ApplyFiltersRequested?.Invoke(this, EventArgs.Empty);
        _resetFilters.Click += (_, _) => ResetFiltersRequested?.Invoke(this, EventArgs.Empty);
    }

    // ------------------------------------------------------------------
    // Раскладка строится кодом (без .Designer.cs): файлы читаются как
    // обычный C#, а не как сгенерированная магия визуального дизайнера.
    // ------------------------------------------------------------------
    private void BuildLayout()
    {
        // ЛОВУШКА РАСКЛАДКИ: кнопки AutoSize при крупном шрифте становятся
        // широкими (200-300px), и ряд шапки не влезает в окно 1300px.
        // WrapContents=false молча ОБРЕЗАЕТ хвост ряда: кнопки остаются живыми,
        // но лежат за пределами окна - клик по ним невозможен, а выглядит это
        // как "кнопка есть, но не нажимается". Поэтому панели AutoSize (сами
        // задают себе высоту под перенесённые строки) + переносят содержимое.
        var header = new FlowLayoutPanel { Dock = DockStyle.Top, WrapContents = true, AutoSize = true };
        header.Controls.AddRange(new Control[]
        {
            Lbl("Доска:"), _boardsCombo, _newBoard, _renameBoard, _deleteBoard,
            Lbl("   "), _usersBtn,
            Lbl("      "), _seedEpic, _seedTasks, _exportBtn, _importBtn, _resetAllBtn
        });

        // та же ловушка, что у шапки: AutoSize вместо фиксированной высоты
        var filters = new FlowLayoutPanel { Dock = DockStyle.Top, WrapContents = true, AutoSize = true };
        filters.Controls.AddRange(new Control[]
        {
            Lbl("Исполнитель:"), _assigneeFilter,
            Lbl(" Эпик:"), _epicFilter,
            Lbl(" Сортировка:"), _sort, Lbl(" "), _search, _applyFilters, _resetFilters
        });
        _sort.Items.AddRange(new object[] { "По порядку", "По приоритету" });
        _sort.SelectedIndex = 0;

        // ---- канбан: три колонки; у каждой шапка (счётчик + "+") и зона drop ----
        var columnsRow = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 3 };
        columnsRow.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 33.33f));
        columnsRow.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 33.33f));
        columnsRow.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 33.34f));

        foreach (var state in Enum.GetValues<TaskState>())
        {
            var column = new Panel
            {
                Dock = DockStyle.Fill,
                AllowDrop = true,
                BackColor = Color.WhiteSmoke,
                Padding = new Padding(4),
                Tag = state
            };

            var counter = new Label
            {
                Dock = DockStyle.Fill,
                Text = $"{state.ToDisplay()} (0)",
                TextAlign = ContentAlignment.MiddleLeft,
                Font = new Font(Font, FontStyle.Bold),
                ForeColor = Color.DimGray
            };
            var addBtn = new Button { Dock = DockStyle.Right, Width = 60, Text = "+", Font = new Font(Font, FontStyle.Bold) };

            var colState = state;                                       // замыкание на локальную копию
            addBtn.Click += (_, _) => CreateTaskRequested?.Invoke(this, colState);

            var columnHead = new Panel { Dock = DockStyle.Top, Height = 48 };
            columnHead.Controls.Add(counter);
            columnHead.Controls.Add(addBtn);

            var cardsHost = new FlowLayoutPanel
            {
                Dock = DockStyle.Fill,
                FlowDirection = FlowDirection.TopDown,
                WrapContents = false,
                AutoScroll = true
            };

            // DnD: колонка принимает перетаскиваемые карточки.
            // Координаты в DragEventArgs - ЭКРАННЫЕ, пересчитываем в клиентские.
            column.DragOver += (_, e) => e.Effect = DragDropEffects.Move;
            column.DragDrop += (_, e) =>
            {
                if (e.Data?.GetData(DataFormats.StringFormat) is not string s
                    || !Guid.TryParse(s, out var taskId)) return;
                var y = column.PointToClient(new Point(e.X, e.Y)).Y;
                TaskMoved?.Invoke(this, new TaskMovedEventArgs(taskId, colState, ComputeInsertIndex(cardsHost, y)));
            };

            column.Controls.Add(cardsHost);
            column.Controls.Add(columnHead);
            _columns[state] = column;
            _cardsHosts[state] = cardsHost;
            _counters[state] = counter;
            columnsRow.Controls.Add(column, (int)state, 0);
        }

        // ---- сайдбар эпиков ----
        var epicSide = new Panel { Dock = DockStyle.Fill, Padding = new Padding(8, 0, 0, 0) };
        epicSide.Controls.Add(_epicsList);
        epicSide.Controls.Add(_deleteEpic);
        epicSide.Controls.Add(_addEpic);
        _epicsList.BringToFront();

        var kanbanRow = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 2 };
        kanbanRow.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        kanbanRow.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 300));
        kanbanRow.Controls.Add(columnsRow, 0, 0);
        kanbanRow.Controls.Add(epicSide, 1, 0);

        var kanbanPage = new TabPage("Доска");
        kanbanPage.Controls.Add(kanbanRow);

        _table.Dock = DockStyle.Fill;
        var listPage = new TabPage("Список");
        listPage.Controls.Add(_table);

        _tabs.TabPages.Add(kanbanPage);
        _tabs.TabPages.Add(listPage);

        var status = new StatusStrip();
        status.Items.Add(_flash);

        var root = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 1, RowCount = 3 };
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        root.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        root.Controls.Add(header, 0, 0);
        root.Controls.Add(filters, 0, 1);
        root.Controls.Add(_tabs, 0, 2);

        // Порядок добавления при докинге важен: обрабатывается с конца коллекции,
        // поэтому Fill-панель добавляем ПЕРВОЙ - она займёт остаток места.
        Controls.Add(root);
        Controls.Add(status);
    }

    private static Label Lbl(string text) =>
        new() { Text = text, AutoSize = true, Margin = new Padding(8, 17, 4, 0) };

    private static DataGridView MakeTable() => new()
    {
        ReadOnly = true,
        AllowUserToAddRows = false,
        AllowUserToDeleteRows = false,
        AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
        RowHeadersVisible = false,
        SelectionMode = DataGridViewSelectionMode.FullRowSelect
    };

    /// <summary>Позиция вставки по Y курсора среди карточек колонки.</summary>
    private static int ComputeInsertIndex(Control cardsHost, int yInColumn)
    {
        var cards = cardsHost.Controls.OfType<CardControl>().OrderBy(c => c.Index).ToList();
        for (var i = 0; i < cards.Count; i++)
            if (yInColumn < cards[i].Bounds.Top + cards[i].Bounds.Height / 2) return i;
        return cards.Count;
    }

    // ==================================================================
    // СОБЫТИЯ КОНТРАКТА. View только объявляет их; подписчик - Presenter.
    // ==================================================================
    public event EventHandler CreateBoardRequested = delegate { };
    public event EventHandler RenameBoardRequested = delegate { };
    public event EventHandler DeleteBoardRequested = delegate { };
    public event EventHandler<IdEventArgs> SwitchBoardRequested = delegate { };
    public event EventHandler<TaskState> CreateTaskRequested = delegate { };
    public event EventHandler<IdEventArgs> TaskOpenRequested = delegate { };
    public event EventHandler<IdEventArgs> TaskDeleteRequested = delegate { };
    public event EventHandler<TaskMovedEventArgs> TaskMoved = delegate { };
    public event EventHandler ApplyFiltersRequested = delegate { };
    public event EventHandler ResetFiltersRequested = delegate { };
    public event EventHandler SeedEpicRequested = delegate { };
    public event EventHandler SeedTasksRequested = delegate { };
    public event EventHandler CreateEpicRequested = delegate { };
    public event EventHandler<IdEventArgs> EpicDeleteRequested = delegate { };
    public event EventHandler ExportRequested = delegate { };
    public event EventHandler ImportRequested = delegate { };
    public event EventHandler ResetAllRequested = delegate { };
    public event EventHandler OpenUsersRequested = delegate { };
}
