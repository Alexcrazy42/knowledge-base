# Канбан — FSD + React

Восьмая реализация канбан-доски из `../app-gherkin.md`: **React 19 + TypeScript + Vite**
в архитектуре **Feature-Sliced Design (FSD)** — дифф по сравнению с MVVM-версиями:
чем «слоями» нарезан **тот же** код, который во `mvvm-vue` лежал кучами
(domain + components) и в `mvvm-wpf` разносился на Model/ViewModel/View.

## Запуск

```bash
npm install
npm run dev      # http://localhost:5197
npm run build    # typecheck (tsc --noEmit) + production-сборка
npm run e2e      # 9-шаговый gherkin-lite прогон (см. ниже)
```

Свой ключ localStorage: `fsd-kanban.v1` (чтобы не конфликтовать с Vue/Angular
на соседних портах — localStorage общий для всего `localhost`).

## Что такое FSD

FSD — система **слоёв с жёстким правилом импортов «сверху вниз»**:

```
app/       композиция корня приложения: DialogHost, страницы, глобальные стили
pages/     экраны: сборка виджетов и фич, UI-состояние страницы (какая доска открыта)
widgets/   крупные блоки: TopBar, EpicPanel, KanbanBoard (колонка с DnD)
features/  пользовательские сценарии: manage-tasks, manage-users, manage-epics,
           manage-boards, filter-tasks, data-transfer
entities/  бизнес-сущности: task, epic, user, board (+ глобальный стор)
shared/    переиспользуемое: утилиты (lib) и ui-кирпичики (ModalShell, диалоги)
```

Правило импортов: **`pages → widgets → features → entities → shared`** — и никак
иначе. Нижележащий слой не знает о верхнем; каждый сегмент экспортирует наружу
только через свой `index.ts` (публичный API).

## Где что лежит (карта сценариев gherkin)

| Сценарий из `app-gherkin.md` | Расположение |
|------------------------------|--------------|
| Board Management | `features/manage-boards/model/use-board-commands.ts` |
| Task Management (создание/редактирование, DnD) | `features/manage-tasks/` (диалог + команды) |
| Epic Management | `features/manage-epics/` (прогресс + каскадное удаление) |
| User Management | `features/manage-users/` (модалка с переназначением) |
| Task Filtering | `features/filter-tasks/` (панель + вычисление колонок) |
| Data Seeding | сиды `seedTestEpic`/`seedRandomTasks` в `entities/board/model/store.ts` |
| Persistence (экспорт/импорт/сброс) | `features/data-transfer/` + `shared/lib/storage.ts` |
| Домен: типы и правила | `entities/task|epic|user|board/model/*` |

## Ключевые решения

1. **Стор без библиотек.** `KanbanStore` в `entities/board` — обычный класс на
   подписках (как `InMemoryBoardStore` из `BoardApp.Core`). Разница для React:
   состояние **иммутабельно** (`structuredClone` + замена ссылки на каждом
   коммите), поэтому компоненты подписываются через
   `useSyncExternalStore` (`use-kanban.ts`). Redux/Zustand под капотом делают то же самое.

2. **Диалоги на промисах.** `shared/ui/dialog`: `prompt()`/`confirm()`/`ask()` +
   единственный `<DialogHost/>` в `app/`. Фича вызывает
   `const title = await prompt({...})` и не знает, кто рисует окно — аналог
   `IDialogService` из WPF и `ask()/answerDialog()` из Vue.

3. **Фичи = команды.** В MVVM сценарий жил во ViewModel, в FSD — в фиче:
   `useBoardCommands`/`useTaskCommands`/… принимают только нужный `flash` и
   работают со стором. Страница (`pages/board`) не содержит бизнес-логики —
   только композицию и локальное UI-состояние.

4. **Cross-импорты — осознанно.** `entities/board` импортирует типы
   `entities/task` и `entities/epic` (доска агрегирует задачи и эпики) — эта
   связь **однонаправленная, циклов нет**. В строгом FSD для таких случаев
   создают @x-сегменты; здесь оставлено с комментарием как «серая зона».

5. **Кросс-сущностные вычисления — в фичах.** Прогресс эпика («2/5 (40%)»)
   и статистика пользователей считаются в `features`, а не в entities —
   агрегация двух сущностей запрещена внутри слоя entities.

6. **UI-тесты переносимы.** CSS-классы и подписи кнопок идентичны Vue/Angular:
   `input.search`, `.task-card`, `.epic-row`, модалка `«Перенести и удалить»`,
   порядок select-ов в TaskModal (статус → тип → приоритет → исполнитель → эпик).

## TODO: написать тесты

- ✅ **e2e** (`e2e/fsd-e2e.cjs`, `npm run e2e`): 9 шагов полного сценария gherkin.
  Запускается на `playwright-core` с браузером из кэша (см. шапку файла).
- [ ] **Юнит-тесты фич:** `useBoardCommands`/`useTaskCommands`/… — замокать
  `shared/ui/dialog` (подмена `prompt`/`confirm`), прогнать сценарии (пустое имя
  доски, «СБРОС» вместо слова, отмена диалога).
- [ ] **Юнит-тесты стора:** `addTask`/`moveTask`/`deleteEpic(cascade|detach)`/
  `deleteUser` (переназначение) — те же ассерты, что в C#-версии.
- [ ] **Юнит-тесты очистых функций:** `applyTaskFilters`, `buildTaskCard`,
  `buildEpicRows` (граничные случаи: FILTER_NONE, `highFirst`, пустая строка).

## Сравнение с другими версиями

Путь «входных данных» тот же, что в `mvvm-vue`/`mvvm-angular` (store → вычисление
колонок → виджеты → модалки), но VM-слой «распалён»: состояние формы — в
`features/*/ui` (локальный `useState`), глобальное состояние — в `entities/board`,
сценарии — в `features/*/model`. Страница осталась «тонкой»: только композиция,
как `App.vue` в Vue-версии.