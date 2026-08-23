# Канбан — Vanilla JS MVP

Четвёртая реализация канбан-доски из `../gherkin.md`: **чистый JavaScript без
фреймворков и сборки**, архитектура **Model-View-Presenter**.

## Запуск

Двойной клик по `index.html` — этого достаточно: скрипты подключены как
классические (без `type="module"`), поэтому `file://` работает. Если хочется
по-взрослому — любой статический сервер:

```bash
python -m http.server 8088   # из этой папки
# или: npx serve .
```

## Слои

```
js/
├── domain/
│   ├── models.js          # enum-ы, фабрики TaskItem/Board/User (порт BoardApp.Core)
│   └── store.js           # BoardStore - Model: данные, инварианты Order, localStorage
├── views/
│   ├── board-view.js      # ПАССИВНАЯ вьюха главного экрана (только DOM)
│   ├── users-view.js      # экран пользователей
│   └── modals.js          # promise-диалоги: prompt/confirm/task-edit/epic-delete
├── presenters/
│   ├── board-presenter.js # вся логика экрана доски; НОЛЬ обращений к DOM
│   └── users-presenter.js # логика экрана пользователей
└── app.js                 # КОМПОЗИЦИОННЫЙ КОРЕНЬ: единственное место сборки слоёв
```

## Что здесь главного (сравнение с остальными реализациями)

| | PageController / MVC | WinForms MVP | Vanilla JS MVP |
|---|---|---|---|
| События | HTTP POST + PRG | C#-события контракта | колбэки `bindHandlers({...})` |
| Состояние экрана | URL query-string | поля презентера (`_currentBoardId`) | поля презентера (`this.currentBoardId`) |
| Рендер | сервер перерисовывает страницу | `Reload()` → `ShowXxx` | `reload()` → `renderXxx` (полная пересборка innerHTML) |
| Контракт View | неявный (Razor-модель) | интерфейс `IBoardView` | документированный набор методов (duck typing) |

Ключевые приёмы, перенесённые из C#-версии 1:1:

- **Пассивная View**: `BoardView` умеет только «перерисовать зону» и
  «сообщить о жесте». Правил («нельзя пустое название», «каскад или отвязать»)
  в ней нет — всё в презентере.
- **Цикл валидации диалога задачи**: пустой заголовок → модалка не закрывается,
  показывает ошибку; решение о повторе принимает презентер.
- **Фабрика диалога** `taskEditFactory` — аналог `UseTaskEditDialog(() => new TaskEditForm())`.
- **Слово СБРОС** для полного сброса, спецзначение `FILTER_NONE`
  («без исполнителя/эпика») — аналог `Guid.Empty`.
- **Связь экранов**: `UsersPresenter.onChanged` → `boardPresenter.externalRefresh()`,
  как `Changed → ExternalRefresh()` в WinForms.

## Тестируемость — главное обещание MVP

Презентер получает `view` снаружи и не знает, что это DOM. Подмените его
объектом-фейком:

```js
const fakeView = {
    handlers: {},
    bindHandlers(h) { this.handlers = h; },
    criteria: { assigneeId: null, epicId: null, searchText: '', sortMode: 'order' },
    readFilterCriteria() { return this.criteria; },
    rendered: [],
    renderColumns(cols) { this.rendered.push(cols); }, /* ...остальные методы-пустышки... */
};

const p = new BoardPresenter(fakeView, store, {});
p.run();
fakeView.handlers.createTask('todo');
// assert: store.boards[0].tasks.length === 1
```

Логика экрана (фильтры, сортировка, ключи TASK-N/EPIC-N, overdue, режимы
удаления эпиков) проверяется в Node без браузера.

## Особенности веб-версии

- **localStorage** автосохраняет состояние после каждой мутации — F5 не теряет
  данные (в остальных версиях стор жил только в памяти процесса).
- Экспорт — скачивание файла через Blob; импорт — `<input type="file">`.
- DnD — нативный HTML5 (`dragstart/drop`), позиция вставки считается по
  середине карточек под курсором, как в WinForms-варианте.
- Все пользовательские строки экранируются (`esc()`), чтобы данные не стали
  разметкой.
