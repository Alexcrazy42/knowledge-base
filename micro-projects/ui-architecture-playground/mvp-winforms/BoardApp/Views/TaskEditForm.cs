// ============================================================================
// TaskEditForm - модальный диалог создания/редактирования задачи.
// Реализует ITaskEditView: Presenter заполняет свойства ДО ShowModal и
// читает ПОСЛЕ. Форма не знает, создание это или редактирование.
//
// Нюанс контракта: цикл валидации крутится в BoardPresenter (пока заголовок
// пуст - ShowModal вызывается снова). Поэтому сообщение об ошибке запоминается
// и показывается при СЛЕДУЮЩЕМ открытии диалога.
// ============================================================================

using BoardApp.Core;
using BoardApp.Views.Contracts;

namespace BoardApp.Views;

public sealed class TaskEditForm : Form, ITaskEditView
{
    private readonly TextBox _title = new();
    private readonly TextBox _description = new() { Multiline = true, ScrollBars = ScrollBars.Vertical };
    private readonly ComboBox _assignee = new() { DropDownStyle = ComboBoxStyle.DropDownList };
    private readonly ComboBox _epic = new() { DropDownStyle = ComboBoxStyle.DropDownList };
    private readonly ComboBox _state = new() { DropDownStyle = ComboBoxStyle.DropDownList };
    private readonly ComboBox _type = new() { DropDownStyle = ComboBoxStyle.DropDownList };
    private readonly ComboBox _priority = new() { DropDownStyle = ComboBoxStyle.DropDownList };
    private readonly DateTimePicker _deadline =
        new() { Format = DateTimePickerFormat.Short, ShowCheckBox = true };

    private List<OptionVm> _assigneeOptions = [];
    private List<OptionVm> _epicOptions = [];
    private string? _pendingError;

    public TaskEditForm()
    {
        Text = "Задача";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        StartPosition = FormStartPosition.CenterParent;
        MinimizeBox = MaximizeBox = false;
        ClientSize = new Size(580, 780);

        foreach (var s in Enum.GetValues<TaskState>()) _state.Items.Add(s.ToDisplay());
        foreach (var t in Enum.GetValues<WorkItemType>()) _type.Items.Add(t.ToDisplay());
        foreach (var p in Enum.GetValues<Priority>()) _priority.Items.Add(p.ToDisplay());
        _state.SelectedIndex = (int)TaskState.ToDo;
        _type.SelectedIndex = (int)WorkItemType.Task;
        _priority.SelectedIndex = (int)Priority.Medium;

        var ok = new Button { Text = "Сохранить", DialogResult = DialogResult.OK };
        var cancel = new Button { Text = "Отмена", DialogResult = DialogResult.Cancel };
        AcceptButton = ok;
        CancelButton = cancel;

        // Правило докинга WinForms: контролы раскладываются с КОНЦА списка
        // Controls. Поэтому добавляем в ОБРАТНОМ визуальном порядке:
        // первым - то, что должно оказаться внизу, последним - заголовок.
        Controls.Add(Field("Заголовок:", _title, height: null));
        Controls.Add(Field("Описание:", _description, height: 140));
        Controls.Add(Field("Дедлайн (галка = задан):", _deadline));
        Controls.Add(Field("Приоритет:", _priority));
        Controls.Add(Field("Тип:", _type));
        Controls.Add(Field("Статус:", _state));
        Controls.Add(Field("Эпик:", _epic));
        Controls.Add(Field("Исполнитель:", _assignee));

        var validation = new Label
        {
            Dock = DockStyle.Bottom, Height = 32,
            ForeColor = Color.Firebrick, TextAlign = ContentAlignment.MiddleLeft,
            Name = "ValidationLabel"
        };
        var buttons = new FlowLayoutPanel
        {
            Dock = DockStyle.Bottom, Height = 52,
            FlowDirection = FlowDirection.RightToLeft, Padding = new Padding(4)
        };
        buttons.Controls.Add(ok);
        buttons.Controls.Add(cancel);

        Controls.Add(buttons);         // обработается первым -> самый низ под кнопками не нужен
        Controls.Add(validation);      // ещё ниже кнопок
    }

    /// <summary>Панель "подпись сверху + контрол снизу". Высота однострочных контролов при 14pt ≈ 36px.</summary>
    private static Panel Field(string label, Control control, int? height = null)
    {
        var innerHeight = height ?? 36;

        var caption = new Label { Text = label, Dock = DockStyle.Top, Height = 28 };
        var panel = new Panel { Dock = DockStyle.Top, Height = innerHeight + caption.Height + 8, Padding = new Padding(2) };
        control.Dock = DockStyle.Fill;
        panel.Controls.Add(control);   // Fill обработается последним -> займет остаток панели
        panel.Controls.Add(caption);
        return panel;
    }

    // ---------------- ITaskEditView: настройка ----------------

    public string DialogTitle { set => Text = value; }

    public void FillOptions(IReadOnlyList<OptionVm> assignees, IReadOnlyList<OptionVm> epics)
    {
        _assigneeOptions = assignees.ToList();
        _epicOptions = epics.ToList();
        FillCombo(_assignee, assignees);
        FillCombo(_epic, epics);
    }

    // пункт "(нет)" всегда первым и означает null
    private static void FillCombo(ComboBox combo, IReadOnlyList<OptionVm> options)
    {
        combo.Items.Clear();
        combo.Items.Add("(нет)");
        foreach (var o in options) combo.Items.Add(o.Label);
        combo.SelectedIndex = 0;
    }

    public TaskState DefaultState { set => _state.SelectedIndex = (int)value; }

    // ---------------- поля формы ----------------

    public string Title { get => _title.Text; set => _title.Text = value; }
    public string Description { get => _description.Text; set => _description.Text = value; }

    public Guid? AssigneeId { get => ComboToId(_assignee, _assigneeOptions); set => IdToCombo(_assignee, _assigneeOptions, value); }
    public Guid? EpicId { get => ComboToId(_epic, _epicOptions); set => IdToCombo(_epic, _epicOptions, value); }

    public TaskState State { get => (TaskState)_state.SelectedIndex; set => _state.SelectedIndex = (int)value; }
    public WorkItemType Type { get => (WorkItemType)_type.SelectedIndex; set => _type.SelectedIndex = (int)value; }
    public Priority Priority { get => (Priority)_priority.SelectedIndex; set => _priority.SelectedIndex = (int)value; }

    public DateOnly? Deadline
    {
        get => _deadline.Checked ? DateOnly.FromDateTime(_deadline.Value) : null;
        set
        {
            if (value is { } d)
            {
                _deadline.Checked = true;
                _deadline.Value = d.ToDateTime(TimeOnly.MinValue);
            }
            else _deadline.Checked = false;
        }
    }

    private static Guid? ComboToId(ComboBox combo, IReadOnlyList<OptionVm> options)
    {
        if (combo.SelectedIndex <= 0 || combo.SelectedIndex > options.Count) return null;
        return options[combo.SelectedIndex - 1].Id;
    }

    private static void IdToCombo(ComboBox combo, List<OptionVm> options, Guid? id)
    {
        if (id is null) { combo.SelectedIndex = 0; return; }
        var idx = options.FindIndex(o => o.Id == id);
        combo.SelectedIndex = idx >= 0 ? idx + 1 : 0;
    }

    // ---------------- показ и ошибка ----------------

    public bool ShowModal()
    {
        ((Label)Controls.Find("ValidationLabel", searchAllChildren: true)[0]).Text = _pendingError ?? "";
        // Диагностика «диалог не открылся/не закрылся» -> %TEMP%\kanban-errors\winforms.log
        Program.LogTrace($"TaskEditForm.ShowModal: owner={(Form.ActiveForm?.Text ?? "нет")}, " +
                         $"pendingError='{_pendingError}'");
        _pendingError = null;

        // ЛОВУШКА: ShowDialog(this) внутри самой формы бросает ArgumentException
        // ("Forms cannot own themselves") - форма не может быть владельцем себя.
        // Владельцем должен быть вызывающий экран (BoardForm), но вьюхи не знают
        // друг о друге - поэтому берём активную форму приложения: в момент клика
        // по "+" это всегда BoardForm. Если активной нет - допустим без владельца.
        var ok = ShowDialog(Form.ActiveForm) == DialogResult.OK;
        Program.LogTrace($"TaskEditForm.ShowModal вернул {ok}");
        return ok;
    }

    public void ShowValidationError(string message) => _pendingError = message;
}
