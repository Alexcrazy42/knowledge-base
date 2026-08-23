// ============================================================================
// CardControl - карточка задачи на канбане.
// Живёт в слое View: знает ТОЛЬКО свой DTO (TaskCardVm), а не домен.
// Умеет три жеста:
//   двойной клик        -> OpenRequested (открыть/редактировать)
//   drag мышью          -> HTML-подобный сценарий: DoDragDrop стартует,
//                          колонка-приёмник вычисляет позицию и зовёт TaskMoved
//   контекстное меню    -> Edit / Delete
// ============================================================================

using BoardApp.Views.Contracts;

namespace BoardApp.Views;

public sealed class CardControl : Label
{
    private readonly TaskCardVm _vm;
    private Point _dragStart;

    public event EventHandler<IdEventArgs>? OpenRequested;
    public event EventHandler<IdEventArgs>? DeleteRequested;

    /// <summary>Позиция среди карточек колонки; нужна для расчёта индекса вставки.</summary>
    public int Index { get; set; }

    public CardControl(TaskCardVm vm)
    {
        _vm = vm;

        Text = $"{vm.Key}  {vm.Title}\n" +
               $"{vm.TypeName} · {vm.PriorityName}" +
               (vm.AssigneeName is null ? "" : $"\n👤 {vm.AssigneeName}") +
               (vm.Deadline is null ? "" : $"\n⏰ {vm.Deadline:dd.MM}" + (vm.IsOverdue ? " ⚠ ПРОСРОЧЕНО" : "")) +
               (vm.EpicKey is null ? "" : $"   [{vm.EpicKey}]");

        // Подкраска по приоритету - решение Presenter'а уже упаковано в bool,
        // View просто мапит bool -> цвет. Правил "что такое высокий приоритет" здесь нет.
        BackColor = vm.IsOverdue ? Color.MistyRose
                  : vm.IsHighPriority ? Color.FromArgb(255, 205, 210)   // красноватая
                  : Color.White;

        BorderStyle = BorderStyle.FixedSingle;
        AutoSize = false;
        Height = 150;
        Margin = new Padding(0, 0, 0, 8);
        Padding = new Padding(8);
        Cursor = Cursors.Hand;
        AllowDrop = false;

        DoubleClick += (_, _) => OpenRequested?.Invoke(this, new IdEventArgs(_vm.Id));

        // DnD-жест с порогом в несколько пикселей, чтобы обычный клик
        // и двойной клик не превращались случайно в перетаскивание.
        MouseDown += (_, e) => { if (e.Button == MouseButtons.Left) _dragStart = e.Location; };
        MouseMove += (_, e) =>
        {
            if (e.Button != MouseButtons.Left) return;
            if (Math.Abs(e.X - _dragStart.X) < SystemInformation.DragSize.Width
                && Math.Abs(e.Y - _dragStart.Y) < SystemInformation.DragSize.Height) return;
            // В буфер кладём Id строки - колонка-приёмник распарсит его в Guid.
            DoDragDrop(_vm.Id.ToString(), DragDropEffects.Move);
        };

        var menu = new ContextMenuStrip();
        menu.Items.Add("Редактировать", null, (_, _) => OpenRequested?.Invoke(this, new IdEventArgs(_vm.Id)));
        menu.Items.Add("Удалить", null, (_, _) => DeleteRequested?.Invoke(this, new IdEventArgs(_vm.Id)));
        ContextMenuStrip = menu;
    }
}
