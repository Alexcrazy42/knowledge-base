# Канбан-доска: MVVM на WPF

Та же доменка (`..\..\BoardApp.Core`), тот же набор gherkin-сценариев,
что в остальных реализациях репозитория. Стек: **WPF (.NET 9)**,
без внешних MVVM-фреймворков — только `INotifyPropertyChanged`,
`ICommand` и `DataTemplate`.

## Где здесь MVVM

| Слой | Файлы | Роль |
|------|-------|------|
| Model | `BoardApp.Core` (общий проект) | Домен + `InMemoryBoardStore`, интерфейс `IBoardStore` |
| Infrastructure | `Infrastructure/ObservableObject.cs`, `Infrastructure/DialogService.cs` | База биндинга (ObservableObject + RelayCommand) и реализация диалогов на окнах |
| ViewModel | `ViewModels/MainViewModel.cs`, `UsersViewModel.cs`, `TaskEditViewModel.cs` | Состояние (`ObservableCollection`, свойства) + команды; **не знают о View** |
| View | `Views/*.xaml` (+ минимальные code-behind для DnD) | Только биндинги и шаблоны; ноль бизнес-логики |

Ключевой тезис MVVM — «ViewModel не знает о View, обновление через
Data Binding» — здесь виден буквально:

```csharp
// VM: пересобрали коллекцию - канбан перерисовался сам
Columns = new ObservableCollection<ColumnVm>(BuildColumns());
```

```xml
<!-- View: ItemsControl по Columns - никаких "ShowColumns()" из MVP -->
<ItemsControl ItemsSource="{Binding Columns}" ItemTemplate="{StaticResource ColumnTemplate}"/>
```

Сравните с `mvp-winforms`: там presenter явно вызывал
`view.ShowColumns(...)`. Здесь View сама подписана на свойства VM.

## Диалоги как сервис (аналог promise-диалогов в веб-версиях)

VM вызывает `await _dialogs.PromptAsync(new TaskDialogData{...})`,
`ConfirmAsync(...)`, `PromptReassign(...)` — интерфейс `IDialogService`.
Реализация (`DialogService.cs` + окна в `ServiceWindows.cs`) живёт в
Infrastructure: VM тестируется с фейком, подмена окон не трогает логику.

Валидация формы задачи — у мини-VM `TaskEditViewModel`
(`Error`/`CanSave`), окно закрывается только при `Completed`.

## Особенности WPF-версии

- DnD — единственный жест, оставленный в code-behind (`MainWindow.xaml.cs`);
  он перехватывает `MouseMove`/`Drop` и передаёт готовую команду VM:
  payload `"taskId|state"`, индекс вставки VM вычисляет по `order`;
- «(все)» в фильтрах — `OptionItem(Guid? Id, ...)` с `Id = null`
  (аналог `FILTER_NONE` в JS / `Guid.Empty` в домене);
- удаление эпика — выбор режима в диалоге
  (`EpicDeleteMode.DetachTasks | CascadeDeleteTasks`);
- цвет чипа приоритета и overdue-дедлайн — `DataTrigger` по bool,
  без конвертеров.

## Ловушка: InvariantGlobalization

Не включайте `<InvariantGlobalization>true</InvariantGlobalization>` в
WPF-приложение с биндингами: без ICU/таблиц культур первый же биндинг падает
с `InvalidOperationException: Cannot find non-neutral culture related to 'en-us'`
(`XmlLanguage.GetSpecificCulture()` при первом рендере окна). Плюс форме
задачи нужен парсинг русских дат `dd.MM.yyyy` — инвариантный режим его сломает.

## Запуск

```bash
dotnet run --project MvvmBoard
# или открыть MvvmBoard.sln в Visual Studio
```

Решение включает общий проект `BoardApp.Core` (как mvp-winforms).

## Что совпадает с остальными версиями 1:1

- Ключи `TASK-N`/`EPIC-N`, плотные `order` при DnD;
- Цикл валидации задачи (пустой заголовок — окно не закрывается);
- Слово **СБРОС** для полного сброса;
- Удаление эпика: оставить задачи / удалить каскадом;
- Удаление пользователя: перенос незавершённых задач выбранному коллеге;
- Экспорт/импорт JSON.

## Отличие от MVP-WinForms

Тот же стек .NET, но: нет кода вида `view.ShowX(...)` — View читает
свойства VM через биндинг; команды вместо обработчиков событий;
диалоги за интерфейсом вместо прямых `MessageBox`/форм в presenter.
