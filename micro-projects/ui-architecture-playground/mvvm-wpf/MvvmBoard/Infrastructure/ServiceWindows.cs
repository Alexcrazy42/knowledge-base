// ============================================================================
// Три служебных окна, построенных кодом (как PromptForm в MVP):
//   InputWindow       - однострочный prompt (+ режим «слово СБРОС»)
//   EpicDeleteWindow  - выбор режима удаления эпика
//   ReassignWindow    - кому передать незавершённые задачи пользователя
// Это часть View-инфраструктуры: ViewModel их не видит.
// ============================================================================

using System.Windows;
using System.Windows.Controls;
using BoardApp.Core;

namespace MvvmBoard.Infrastructure;

public class InputWindow : Window
{
    private readonly TextBox _box = new() { Padding = new Thickness(6) };
    public string? Value { get; private set; }

    public InputWindow(string title, string label, string initial, string? confirmWord)
    {
        Title = title;
        Width = 440;
        SizeToContent = SizeToContent.Height;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;
        Background = System.Windows.Media.Brushes.White;
        FontSize = 14;

        _box.Text = initial;

        var ok = new Button { Content = "OK", Padding = new Thickness(14, 5, 14, 5), IsDefault = true };
        var cancel = new Button { Content = "Отмена", Padding = new Thickness(14, 5, 14, 5), Margin = new Thickness(8, 0, 0, 0), IsCancel = true };

        ok.Click += (_, _) =>
        {
            if (confirmWord is not null && _box.Text.Trim() != confirmWord)
            {
                MessageBox.Show($"Введите слово {confirmWord} для подтверждения", "Подтверждение",
                    MessageBoxButton.OK, MessageBoxImage.Warning);
                return;                                         // окно остаётся открытым - как в других версиях
            }
            Value = _box.Text;
            DialogResult = true;
        };

        var panel = new StackPanel { Margin = new Thickness(16) };
        panel.Children.Add(new TextBlock { Text = label, Foreground = System.Windows.Media.Brushes.DimGray });
        panel.Children.Add(_box);
        panel.Children.Add(new TextBlock
        {
            Text = confirmWord is null ? "" : $"Для подтверждения введите слово {confirmWord}",
            Foreground = System.Windows.Media.Brushes.Firebrick,
            FontSize = 12,
            Margin = new Thickness(0, 6, 0, 0),
            Visibility = confirmWord is null ? Visibility.Collapsed : Visibility.Visible
        });
        var buttons = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 12, 0, 0) };
        buttons.Children.Add(ok);
        buttons.Children.Add(cancel);
        panel.Children.Add(buttons);
        Content = panel;

        Loaded += (_, _) => { _box.Focus(); _box.SelectAll(); };
    }
}

public class EpicDeleteWindow : Window
{
    public EpicDeleteMode? Mode { get; private set; }

    public EpicDeleteWindow(string epicKey, string epicTitle, int taskCount)
    {
        Title = $"Удаление {epicKey}";
        Width = 480;
        SizeToContent = SizeToContent.Height;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;
        Background = System.Windows.Media.Brushes.White;
        FontSize = 14;

        var detach = new Button { Content = taskCount == 0 ? "Удалить эпик" : $"Удалить эпик, задачи оставить", Padding = new Thickness(10, 5, 10, 5) };
        var cascade = new Button
        {
            Content = taskCount == 0 ? "(нет задач)" : $"Удалить эпик и {taskCount} задач(и)",
            Padding = new Thickness(10, 5, 10, 5),
            IsEnabled = taskCount > 0
        };
        var cancel = new Button { Content = "Отмена", Padding = new Thickness(10, 5, 10, 5), IsCancel = true, Margin = new Thickness(8, 0, 0, 0) };

        detach.Click += (_, _) => { Mode = EpicDeleteMode.DetachTasks; DialogResult = true; };
        cascade.Click += (_, _) => { Mode = EpicDeleteMode.CascadeDeleteTasks; DialogResult = true; };

        var panel = new StackPanel { Margin = new Thickness(16) };
        panel.Children.Add(new TextBlock
        {
            Text = $"Удалить {epicKey} «{epicTitle}»?",
            FontWeight = FontWeights.Bold,
            TextWrapping = TextWrapping.Wrap
        });
        if (taskCount > 0)
            panel.Children.Add(new TextBlock
            {
                Text = $"С эпиком связано {taskCount} задач(и). Что с ними сделать?",
                Foreground = System.Windows.Media.Brushes.DimGray,
                Margin = new Thickness(0, 6, 0, 0),
                TextWrapping = TextWrapping.Wrap
            });
        var buttons = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 14, 0, 0) };
        buttons.Children.Add(detach);
        buttons.Children.Add(cascade);
        buttons.Children.Add(cancel);
        panel.Children.Add(buttons);
        Content = panel;
    }
}

public class ReassignWindow : Window
{
    private readonly ListBox _list = new() { MinHeight = 120 };
    public int? SelectedIndex { get; private set; }

    public ReassignWindow(string userName, int openCount, IReadOnlyList<string> candidates)
    {
        Title = "Перенос задач";
        Width = 460;
        SizeToContent = SizeToContent.Height;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;
        Background = System.Windows.Media.Brushes.White;
        FontSize = 14;

        foreach (var c in candidates) _list.Items.Add(c);
        _list.SelectedIndex = 0;

        var ok = new Button { Content = "Перенести и удалить", Padding = new Thickness(10, 5, 10, 5), IsDefault = true };
        var cancel = new Button { Content = "Отмена", Padding = new Thickness(10, 5, 10, 5), IsCancel = true, Margin = new Thickness(8, 0, 0, 0) };

        ok.Click += (_, _) =>
        {
            if (_list.SelectedIndex < 0) return;
            SelectedIndex = _list.SelectedIndex;
            DialogResult = true;
        };

        var panel = new StackPanel { Margin = new Thickness(16) };
        panel.Children.Add(new TextBlock
        {
            Text = $"У «{userName}» {openCount} незавершённых задач(и).",
            FontWeight = FontWeights.Bold,
            TextWrapping = TextWrapping.Wrap
        });
        panel.Children.Add(new TextBlock
        {
            Text = "Кому передать?",
            Foreground = System.Windows.Media.Brushes.DimGray,
            Margin = new Thickness(0, 6, 0, 8)
        });
        panel.Children.Add(_list);
        var buttons = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 12, 0, 0) };
        buttons.Children.Add(ok);
        buttons.Children.Add(cancel);
        panel.Children.Add(buttons);
        Content = panel;
    }
}
