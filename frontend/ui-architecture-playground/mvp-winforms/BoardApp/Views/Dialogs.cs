// ============================================================================
// Диалоги главного экрана: PromptForm (ввод строки / слово-подтверждение)
// и EpicDeleteForm (выбор режима удаления эпика).
//
// Оба вызываются ТОЛЬКО через методы контракта IBoardView - Presenter не
// знает об их существовании, он видит лишь Prompt()/ChooseEpicDeleteMode().
// ============================================================================

using BoardApp.Core;

namespace BoardApp.Views;

/// <summary>Однострочный ввод. В режиме confirmWord ОК заблокирован до ввода нужного слова.</summary>
public sealed class PromptForm : Form
{
    private readonly TextBox _input = new() { Dock = DockStyle.Top };
    public string EnteredText => _input.Text;

    public PromptForm(string title, string label, string initial, string? confirmWord)
    {
        Text = title;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        StartPosition = FormStartPosition.CenterParent;
        MinimizeBox = MaximizeBox = false;
        ClientSize = new Size(520, 180);
        _input.Text = initial;

        var lbl = new Label { Text = label, Dock = DockStyle.Top, Height = 36, Padding = new Padding(2) };

        var ok = new Button { Text = "ОК", DialogResult = DialogResult.OK };
        var cancel = new Button { Text = "Отмена", DialogResult = DialogResult.Cancel };

        if (confirmWord is not null)
        {
            // gherkin: сброс подтверждается словом; кнопка активна только
            // пока текст совпадает посимвольно (регистр важен).
            ok.Enabled = false;
            _input.TextChanged += (_, _) => ok.Enabled = _input.Text == confirmWord;
        }

        var buttons = new FlowLayoutPanel
        {
            Dock = DockStyle.Bottom,
            FlowDirection = FlowDirection.RightToLeft,
            Height = 50,
            Padding = new Padding(4)
        };
        buttons.Controls.Add(ok);
        buttons.Controls.Add(cancel);

        AcceptButton = ok;
        CancelButton = cancel;

        // порядок докинга: с конца -> input сверху, потом label
        Controls.Add(_input);
        Controls.Add(lbl);
        Controls.Add(buttons);

        Shown += (_, _) => { _input.Focus(); _input.SelectAll(); };
    }
}

/// <summary>Выбор судьбы задач при удалении эпика: отвязать или удалить каскадом.</summary>
public sealed class EpicDeleteForm : Form
{
    public EpicDeleteMode? Mode { get; private set; }

    public EpicDeleteForm(string epicKey, string epicTitle, int taskCount)
    {
        Text = $"Удаление {epicKey}";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        StartPosition = FormStartPosition.CenterParent;
        MinimizeBox = MaximizeBox = false;
        ClientSize = new Size(560, 280);

        var message = new Label
        {
            Text = taskCount == 0
                ? $"Эпик \"{epicTitle}\" пуст. Удалить его?"
                : $"В эпике \"{epicTitle}\" {taskCount} задач. Что с ними сделать?",
            Dock = DockStyle.Top, Height = 64, Padding = new Padding(8)
        };

        var detach = new Button { Text = taskCount == 0 ? "Удалить эпик" : "Задачи оставить (отвязать)", Dock = DockStyle.Top, Height = 52 };
        var cascade = new Button
        {
            Text = $"Удалить вместе с задачами ({taskCount})",
            Dock = DockStyle.Top, Height = 52,
            Enabled = taskCount > 0
        };
        var cancel = new Button { Text = "Отмена", Dock = DockStyle.Top, Height = 52, DialogResult = DialogResult.Cancel };

        detach.Click += (_, _) => { Mode = EpicDeleteMode.DetachTasks; DialogResult = DialogResult.OK; };
        cascade.Click += (_, _) => { Mode = EpicDeleteMode.CascadeDeleteTasks; DialogResult = DialogResult.OK; };
        CancelButton = cancel;

        Controls.AddRange([cancel, cascade, detach, message]);
    }
}
