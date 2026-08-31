// ============================================================================
// UsersForm - экран пользователей. Реализует IUsersView.
// Показывает, что "второй экран" в MVP - это просто вторая пара
// View+Presenter, а не навигационная магия фреймворка.
// ============================================================================

using BoardApp.Views.Contracts;

namespace BoardApp.Views;

public sealed class UsersForm : Form, IUsersView
{
    private readonly ListBox _list = new() { Dock = DockStyle.Fill };
    private readonly TextBox _newName = new() { Dock = DockStyle.Top, PlaceholderText = "Имя нового пользователя" };
    private readonly Button _addBtn = new() { Text = "Добавить", Dock = DockStyle.Top };
    private readonly Button _deleteBtn = new() { Text = "Удалить выбранного", Dock = DockStyle.Top, Enabled = false };
    private readonly StatusStrip _status = new();
    private readonly ToolStripStatusLabel _flash = new("Готово");

    // параллельный список Id к строкам ListBox (как эпики на главной форме)
    private readonly List<Guid> _ids = [];

    public string NewUserName => _newName.Text;

    public UsersForm()
    {
        Text = "Пользователи — MVP";
        StartPosition = FormStartPosition.CenterParent;
        Size = new Size(560, 620);

        var buttons = new FlowLayoutPanel { Dock = DockStyle.Top, Height = 60, WrapContents = false };
        _addBtn.AutoSize = true;       // кнопки не растут от шрифта сами - включаем явно
        _deleteBtn.AutoSize = true;
        buttons.Controls.Add(_deleteBtn);
        buttons.Controls.Add(_addBtn);

        _status.Items.Add(_flash);

        Controls.Add(_list);           // Fill первым - займёт остаток (см. BoardForm)
        Controls.Add(buttons);
        Controls.Add(_newName);
        Controls.Add(_status);

        AcceptButton = _addBtn;

        // жесты -> события контракта
        _addBtn.Click += (_, _) => AddUserRequested?.Invoke(this, EventArgs.Empty);
        _newName.KeyDown += (_, e) =>
        {
            if (e.KeyCode == Keys.Enter) { e.SuppressKeyPress = true; AddUserRequested?.Invoke(this, EventArgs.Empty); }
        };
        _deleteBtn.Click += (_, _) =>
        {
            if (_list.SelectedIndex is >= 0 && _ids.Count > _list.SelectedIndex)
                DeleteUserRequested?.Invoke(this, new IdEventArgs(_ids[_list.SelectedIndex]));
        };
        _list.SelectedIndexChanged += (_, _) => _deleteBtn.Enabled = _list.SelectedIndex >= 0;
    }

    public void ShowUsers(IReadOnlyList<UserRow> users)
    {
        var selectedId = _list.SelectedIndex is >= 0 && _ids.Count > _list.SelectedIndex
            ? _ids[_list.SelectedIndex] : (Guid?)null;

        _ids.Clear();
        _list.BeginUpdate();
        _list.Items.Clear();
        foreach (var u in users)
        {
            _ids.Add(u.Id);
            _list.Items.Add($"{u.Name}  ({u.TaskCount} задач)");
            if (u.Id == selectedId) _list.SelectedIndex = _list.Items.Count - 1;
        }
        _list.EndUpdate();
        _deleteBtn.Enabled = _list.SelectedIndex >= 0;
    }

    public void ShowFlash(string message) => _flash.Text = message;

    /// <summary>
    /// gherkin User Management: если у пользователя есть задачи, предлагаем
    /// выбрать, кому их передать; иначе достаточно подтверждения.
    /// Вся логика показа окон - здесь; интерпретация ответа - в презентере.
    /// </summary>
    public ReassignChoice AskDeleteUser(string userName, IReadOnlyList<OptionVm> otherUsers, int taskCount)
    {
        if (taskCount == 0)
            return new ReassignChoice(
                MessageBox.Show(this, $"Удалить пользователя \"{userName}\"?", "Подтверждение",
                    MessageBoxButtons.OKCancel, MessageBoxIcon.Question) == DialogResult.OK,
                ReassignTo: null);

        using var dlg = new Form
        {
            Text = $"Удаление \"{userName}\"",
            FormBorderStyle = FormBorderStyle.FixedDialog,
            StartPosition = FormStartPosition.CenterParent,
            MinimizeBox = MaximizeBox = false,
            Font = new Font("Segoe UI", 14F),
            ClientSize = new Size(520, 230)
        };

        var msg = new Label
        {
            Text = $"У пользователя {taskCount} задач. Передать их другому пользователю?",
            Dock = DockStyle.Top, Height = 56, Padding = new Padding(8)
        };

        Guid? chosen = null;
        var combo = new ComboBox { Dock = DockStyle.Top, DropDownStyle = ComboBoxStyle.DropDownList };
        foreach (var o in otherUsers) combo.Items.Add(o.Label);
        if (combo.Items.Count > 0) combo.SelectedIndex = 0;

        var ok = new Button { Text = "Удалить и переназначить", DialogResult = DialogResult.OK, Enabled = combo.Items.Count > 0 };
        var skip = new Button { Text = "Оставить задачи нераспределёнными" };
        var cancel = new Button { Text = "Отмена", DialogResult = DialogResult.Cancel };

        ok.Click += (_, _) =>
        {
            if (combo.SelectedIndex >= 0 && combo.Tag is not null) { }
            chosen = otherUsers[Math.Max(0, combo.SelectedIndex)].Id;
        };
        skip.Click += (_, _) => { chosen = null; dlg.DialogResult = DialogResult.Yes; };   // Yes = тоже "подтверждено"

        var row = new FlowLayoutPanel { Dock = DockStyle.Bottom, Height = 52, WrapContents = false };
        row.Controls.Add(ok); row.Controls.Add(skip); row.Controls.Add(cancel);

        dlg.Controls.Add(combo);
        dlg.Controls.Add(msg);
        dlg.Controls.Add(row);
        dlg.AcceptButton = ok;
        dlg.CancelButton = cancel;

        var result = dlg.ShowDialog(this);
        return result == DialogResult.Cancel
            ? new ReassignChoice(false, null)
            : new ReassignChoice(true, chosen);
    }

    public event EventHandler AddUserRequested = delegate { };
    public event EventHandler<IdEventArgs> DeleteUserRequested = delegate { };
    public event EventHandler CloseRequested = delegate { };
}
