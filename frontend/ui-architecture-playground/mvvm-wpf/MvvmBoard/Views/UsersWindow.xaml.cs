// Идеал MVVM: code-behind окна состоит из одного InitializeComponent().
// Вся логика экрана - в UsersViewModel, вся разметка - в XAML.

using System.Windows;

namespace MvvmBoard.Views;

public partial class UsersWindow : Window
{
    public UsersWindow() => InitializeComponent();
}
