# Канбан-доска: MVVM на Angular 20

Та же доменка (`BoardApp.Core` → `src/domain/`), тот же набор gherkin-сценариев,
что в остальных реализациях репозитория. Стек: **Angular 20 standalone**,
реактивность на **signals**, без NgRx/FormsModule-форм.

## Где здесь MVVM

| Слой | Файлы | Роль |
|------|-------|------|
| Model | `src/app/domain/models.ts`, `board-store.service.ts` | Домен + стор; состояние — два `signal`, мутации через `#touch()` |
| ViewModel | `src/app/viewmodels/kanban.viewmodel.ts` | `signal`/`computed` (состояние) + async-команды; `providedIn: 'root'` |
| Dialogs | `src/app/dialogs/dialog.service.ts` | Promise-диалоги: VM делает `await dialogs.ask(...)` |
| View | `app.html`, `components/*.component.ts` | Только биндинги и события (`output()`); ноль бизнес-логики |

Ключевой тезис MVVM — «ViewModel не знает о View» — здесь усилен DI:
компоненты получают **один и тот же экземпляр** VM через `inject()`
(аналог композиционного корня в WPF-версии):

```ts
// View
readonly vm = inject(KanbanViewModel);
// шаблон: [column]="col" (add)="vm.openTaskEditor(null, $event)"
```

Изменился `vm.search` → `visibleTasks` пересчитался → канбан перерисовался.
В MVP для этого нужен был presenter с явным `render*()`.

## Две Angular-ловушки, найденные при отладке (полезно запомнить)

1. **Порядок инициализации полей.** `currentBoardId = signal(store.firstBoard()?.id)`
   вычислялся ДО загрузки localStorage, если стор читал хранилище в
   конструкторе. Решение: читать хранилище на уровне модуля
   (`parseInitialStorage()`), до создания экземпляра сервиса.
2. **Сигналы сравнивают зависимости по ссылке.** Стор мутировал объекты
   досок и копировал только массив (`[...list]`) — computed вида
   `currentBoard() → columns()` получал ту же ссылку доски и возвращал
   кэш: интерфейс «замерал», хотя данные менялись. Решение: в `#touch()`
   отдавать новые ссылки и самих досок: `list.map(b => ({...b}))`.

Бонус-ловушка той же природы: `[(ngModel)]="form().title"` мутирует объект
внутри сигнала без уведомления подписчиков — локальная форма диалога
сделана обычным полем + геттеры валидации (CD пересчитает на событии).

## Диалоги как promise

VM вызывает `await this.dialogs.ask<TaskDialogResult>({kind:'task',...})`.
`DialogService` хранит текущий запрос в сигнале; `ModalsHostComponent`
рисует активную модалку и отвечает через `answer(value)`. Подмена
диалогов в тестах = замена сервиса (как `IDialogService` в WPF).

## Запуск

```bash
npm install
npx ng serve --port 5201   # http://localhost:5201
npx ng build               # прод-сборка в dist/
```

## Что совпадает с остальными версиями 1:1

- Ключи `TASK-N`/`EPIC-N`, плотные `order` при DnD;
- Цикл валидации задачи (пустой заголовок — окно не закрывается);
- Слово **СБРОС** для полного сброса;
- «Без исполнителя/эпика» = спецзначение `FILTER_NONE` (аналог Guid.Empty);
- Удаление эпика: оставить задачи / удалить каскадом;
- Удаление пользователя: перенос незавершённых задач выбранному коллеге;
- Экспорт/импорт JSON; localStorage-автосохранение после каждой мутации.

## Отличие от mvvm-vue / mvvm-wpf

Реактивность та же по духу (signals ≈ Vue ref/computed ≈ INPC+binding),
разница в механике: строгая типизация TS, DI вместо композиционного
корня, zone.js-CD поверх сигналов и шаблонный синтаксис `@if/@for`.
