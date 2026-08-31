// ============================================================================
// BoardForm.View - часть 2: реализация методов IBoardView.
// Каждый ShowXxx перестраивает свою зону ЦЕЛИКОМ - прямой аналог полного
// серверного рендера после PRG в веб-версиях. Никакого умного диффинга:
// проще стереть и нарисовать заново, чем синхронизировать состояние.
// ============================================================================

using BoardApp.Core;
using BoardApp.Views.Contracts;

namespace BoardApp.Views;

public sealed partial class BoardForm
{
    public void ShowBoards(IReadOnlyList<BoardListItem> boards, Guid? currentId)
    {
        // Щит от эха: программный SelectedIndex иначе вызвал бы
        // SwitchBoardRequested -> презентер -> Reload -> ShowBoards... по кругу.
        _suppressBoardSwitch = true;
        try
        {
            _boardsCombo.DisplayMember = nameof(BoardListItem.Name);
            _boardsCombo.Items.Clear();
            foreach (var b in boards) _boardsCombo.Items.Add(b);
            if (currentId is { } id)
            {
                var idx = boards.ToList().FindIndex(b => b.Id == id);
                if (idx >= 0) _boardsCombo.SelectedIndex = idx;
            }
        }
        finally { _suppressBoardSwitch = false; }

        bool hasBoard = currentId is not null;
        _renameBoard.Enabled = hasBoard;
        _deleteBoard.Enabled = hasBoard;
    }

    public void ShowColumns(IReadOnlyList<ColumnVm> columns)
    {
        foreach (var col in columns)
        {
            var host = _cardsHosts[col.State];

            host.SuspendLayout();
            host.Controls.Clear();                                     // "стереть и нарисовать заново"
            foreach (var vm in col.Cards)
            {
                var card = new CardControl(vm) { Index = host.Controls.Count, Width = host.ClientSize.Width - 12 };
                card.OpenRequested += (_, e) => TaskOpenRequested?.Invoke(this, e);
                card.DeleteRequested += (_, e) => TaskDeleteRequested?.Invoke(this, e);
                host.Controls.Add(card);
            }
            host.ResumeLayout(performLayout: true);

            _counters[col.State].Text = $"{col.Title} ({col.Cards.Count})";
        }
    }

    public void ShowEpics(IReadOnlyList<EpicStatRow> epics)
    {
        var selectedId = _epicsList.SelectedIndex >= 0 && _epicsList.SelectedIndex < _epicRows.Count
            ? _epicRows[_epicsList.SelectedIndex].Id : (Guid?)null;

        _epicRows.Clear();
        _epicsList.BeginUpdate();
        _epicsList.Items.Clear();
        foreach (var e in epics)
        {
            _epicRows.Add(e);
            // прогресс в тексте строки считает Presenter; View лишь рисует строку
            _epicsList.Items.Add($"{e.Key} · {e.Title} ({e.Done}/{e.Total})");
            if (e.Id == selectedId) _epicsList.SelectedIndex = _epicsList.Items.Count - 1;
        }
        _epicsList.EndUpdate();

        _deleteEpic.Enabled = _epicsList.SelectedIndex >= 0;
    }

    public void ShowTaskTable(IReadOnlyList<TaskRow> rows)
    {
        // Анонимный тип даёт готовые русские заголовки колонок без ручной настройки грида.
        _table.DataSource = rows.Select(r => new
        {
            Ключ = r.Key,
            Заголовок = r.Title,
            Статус = r.StateName,
            Приоритет = r.PriorityName,
            Исполнитель = r.AssigneeName,
            Дедлайн = r.DeadlineText
        }).ToList();
    }

    public void ResetFilters(IReadOnlyList<OptionVm> assignees, IReadOnlyList<OptionVm> epics)
    {
        FillFilterCombo(_assigneeFilter, assignees);
        FillFilterCombo(_epicFilter, epics);
        _search.Text = "";
        _sort.SelectedIndex = 0;
    }

    // Первый пункт всегда "(все)" = фильтр не активен (ReadFilterCriteria вернёт null).
    // Сами опции (включая спецпункт "Без исполнителя") кладём в Tag: подпись -> Id.
    private static void FillFilterCombo(ComboBox combo, IReadOnlyList<OptionVm> options)
    {
        combo.Items.Clear();
        combo.Items.Add("(все)");
        foreach (var o in options) combo.Items.Add(o.Label);
        combo.Tag = options;
        combo.SelectedIndex = 0;
    }

    public FilterCriteria ReadFilterCriteria() => new(
        ReadSelection(_assigneeFilter),
        ReadSelection(_epicFilter),
        _search.Text,
        _sort.SelectedIndex == 1 ? "priority" : "order");

    /// <summary>null ("все") | FilterSpecial.None ("без ...") | конкретный Id.</summary>
    private static Guid? ReadSelection(ComboBox combo)
    {
        if (combo.SelectedIndex <= 0 || combo.Tag is not IReadOnlyList<OptionVm> options) return null;
        var label = (string)combo.SelectedItem!;
        return options.FirstOrDefault(o => o.Label == label)?.Id;
    }

    public void ShowFlash(string message) => _flash.Text = $"[{DateTime.Now:HH:mm:ss}] {message}";

    // ------------------- диалоговые методы контракта -------------------

    public string? Prompt(string title, string label, string initial = "")
    {
        using var dlg = new PromptForm(title, label, initial, confirmWord: null);
        return dlg.ShowDialog(this) == DialogResult.OK ? dlg.EnteredText.Trim() : null;
    }

    public bool Confirm(string message) =>
        MessageBox.Show(this, message, "Подтверждение", MessageBoxButtons.OKCancel,
                        MessageBoxIcon.Question) == DialogResult.OK;

    public string? AskConfirmWord(string whatFor)
    {
        using var dlg = new PromptForm("Подтверждение", $"Для {whatFor} введите слово СБРОС:", "", confirmWord: "СБРОС");
        return dlg.ShowDialog(this) == DialogResult.OK ? dlg.EnteredText : null;
    }

    public EpicDeleteMode? ChooseEpicDeleteMode(string epicKey, string epicTitle, int taskCount)
    {
        using var dlg = new EpicDeleteForm(epicKey, epicTitle, taskCount);
        return dlg.ShowDialog(this) == DialogResult.OK ? dlg.Mode : null;
    }

    public bool SaveToFile(string suggestedFileName, string content)
    {
        using var dlg = new SaveFileDialog { FileName = suggestedFileName, Filter = "JSON|*.json" };
        if (dlg.ShowDialog(this) != DialogResult.OK) return false;
        File.WriteAllText(dlg.FileName, content);
        return true;
    }

    public string? OpenJsonFile()
    {
        using var dlg = new OpenFileDialog { Filter = "JSON|*.json" };
        return dlg.ShowDialog(this) != DialogResult.OK ? null : File.ReadAllText(dlg.FileName);
    }
}
