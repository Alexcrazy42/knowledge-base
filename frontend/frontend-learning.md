# Frontend Learning Plan — handwritten-ui-kit

Документ описывает, что нужно исправить, доделать и подтянуть в проекте
`frontend/react/handwritten-ui-kit`, чтобы он перестал быть учебной свалкой
компонентов и стал инженерным артефактом уровня middle+/senior.

Оценка на момент создания: **5.5/10**. Уверенный junior+ по написанию
компонентов, но не senior по владению результатом: красная сборка, нет тестов,
нет дизайн-системы, есть логические баги и пробелы в доступности.

Главный принцип: **senior — это не количество компонентов, а способность
объяснить, проверить и поддерживать каждую строку, включая сгенерированную AI.**

---

## 1. Текущее состояние (факты, не мнения)

Проверено запуском команд в `frontend/react/handwritten-ui-kit`:

- `npm run build` — **падает**: 34 ошибки TypeScript, Vite-сборка не доходит до конца.
- `npm run lint` — **3 ошибки**:
  - `Search.tsx:56` — `setState` синхронно внутри эффекта.
  - `MyToast.tsx:11` — неиспользуемая переменная `error`.
  - `ToastContext.tsx:47` — нарушение fast-refresh (файл экспортирует и компонент, и хук).
- `tsconfig.app.json` — **не включён `"strict": true"`**.
- **Нет ни одного теста** и нет script `test`.
- **Нет глобального CSS** (reset/типографика), нет дизайн-токенов.
- **Нет CI**, prettier, stylelint, commitlint, husky.
- **README** — дефолтный шаблон Vite.
- Storybook в этом репозитории отсутствует, хотя демо-примеры лежат в `App.tsx`.

---

## 2. P0 — блокеры, без которых нельзя двигаться дальше

- [ ] Сделать `npm run build` зелёным.
- [ ] Сделать `npm run lint` зелёным.
- [ ] Включить в `tsconfig.app.json`:
  - `"strict": true`
  - `"noUncheckedIndexedAccess": true`
  - `"exactOptionalPropertyTypes": true`
- [ ] Добавить `npm run typecheck` (`tsc -b --noEmit` или аналог).
- [ ] Настроить CI (GitHub Actions): `lint + typecheck + build` на каждый PR.
- [ ] Добавить prettier и `eslint-plugin-jsx-a11y`.
- [ ] Переписать README: что это, как запустить, какие компоненты есть.
- [ ] Убрать из `App.tsx` роль свалки демо: вынести примеры в `stories/` или `examples/`.

Критерий выхода: красный PR невозможно смержить, локально всё зелёное.

---

## 3. Что исправить по файлам

### `src/App.tsx`

- [ ] `useState([])` → типизировать: `useState<string[]>([])` (`App.tsx:26`).
- [ ] `error={... : null}` → `undefined` (`App.tsx:137`, `App.tsx:150`).
- [ ] Убрать дублирующийся `Select label="Роль"` (`App.tsx:133` и `App.tsx:146`).
- [ ] Убрать инлайн-стили и демо-текст, оставить витрину или роутинг.
- [ ] Исправить ложный комментарий про сохранение состояния в `Tabs` (`App.tsx:210`).

### `src/components/Breadcrumbs/Breadcrumbs.tsx`

- [ ] Починить объединение типов (`Breadcrumbs.tsx:26-32`): TS не понимает
      `label`/`icon`/`href`, потому что в union попадает `{ isCollapsed: true }`.
      Сделать нормальный discriminated union или отдельный тип `DisplayItem`.
- [ ] Добавить `key` не по индексу, если элементы стабильны.

### `src/components/Tabs/Tabs.tsx`

- [ ] `child.props` без проверки `isValidElement` (`Tabs.tsx:45-50`, `Tabs.tsx:70`).
- [ ] Решить судьбу неактивных вкладок: либо сохранять контент в DOM (`hidden`),
      либо честно документировать, что он размонтируется. Сейчас комментарий врёт.
- [ ] Добавить `aria-controls`, `aria-labelledby`, `id` для вкладок и панели.
- [ ] Добавить навигацию стрелками Left/Right/Home/End.
- [ ] Связать `tabIndex` и `aria-selected` по паттерну APG Tabs.

### `src/components/DatePicker/DatePicker.tsx`

- [ ] **Баг:** дата создаётся из `currentYear/currentMonth`, а не из `year/month`
      (`DatePicker.tsx:73`). При переключении месяца выбирается неверная дата.
- [ ] Типизировать параметр `date` (`DatePicker.tsx:43`, сейчас неявный `any`).
- [ ] Не сбрасывать `selectedDate` при листании месяца (или объяснить поведение).
- [ ] Дни — кнопки, а не `div`; сетка с `role="grid"`, навигация с клавиатуры.
- [ ] Не считать `new Date()` на каждом рендере.
- [ ] Добавить тесты: смена месяца, високосный год, границы месяца, выбор даты.

### `src/components/Select/Select.tsx`

- [ ] **Невалидный HTML:** кнопка удаления чипа вложена в `<button>`-триггер
      (`Select.tsx:211` и `Select.tsx:233`). Вынести чипы из кнопки или
      перестроить разметку.
- [ ] `value.includes(...)` без проверки на `undefined` (`Select.tsx:280`).
- [ ] Реализовать корректный combobox/listbox: `aria-controls`, `aria-activedescendant`,
      `id` у опций, связь `label` → триггер.
- [ ] Проверить поведение при пустом списке, disabled-опциях, длинных значениях.
- [ ] `forwardRef<HTMLDivElement>` — решить, что именно является публичным ref.
- [ ] Покрыть тестами: клавиатура, multiple, удаление чипа, клик вне.

### `src/components/Form/*`

- [ ] `Controller.tsx:14-15` вызывает `register()`/`getValues()` во время рендера.
- [ ] `Controller` не прикрепляет `ref` к DOM — `reset()` не очищает `Select` и
      `MaskedInput`. Прикрепить ref или сделать reset управляемым.
- [ ] `useForm.ts:159-164`: `forceRender()` на каждый ввод перерисовывает всю форму.
      Сделать нормальную подписку на поля или осознанно оставить, но измерить.
- [ ] `watch()` (`useForm.ts:315`) не подписывается на изменения — API вводит в
      заблуждение. Либо реализовать подписку, либо убрать метод.
- [ ] `formState.isValid` сейчас `true` до первой валидации — исправить семантику.
- [ ] `handleSubmit` не ловит ошибки асинхронного `onSubmit`.
- [ ] Добавить тесты: required, min/max, pattern, validate, submit, reset, Controller.

### `src/components/Toast/*`

- [ ] `Date.now()` как id (`ToastContext.tsx:24`) — коллизии. Использовать
      `crypto.randomUUID()` или счётчик.
- [ ] Добавить `aria-live`/`role="status"` контейнеру, а не только тостам.
- [ ] Пауза авто-скрытия при ховере/фокусе.
- [ ] Мемоизировать значение контекста (`ToastContext.tsx:41`).
- [ ] Вынести `useToast` в отдельный файл, чтобы не ломать fast-refresh.
- [ ] Ограничить максимальное количество тостов.

### `src/components/Tooltip/Tooltip.tsx`

- [ ] `NodeJS.Timeout` → `ReturnType<typeof setTimeout>`.
- [ ] Портал + позиционирование, иначе тултип обрезается `overflow` родителя.
- [ ] Связать триггер и тултип через `aria-describedby`.
- [ ] Добавить touch/click-сценарий и закрытие по Escape.
- [ ] Не рендерить обёртку-`div`, если можно навесить обработчики на child.

### `src/components/Popover/Popover.tsx`

- [ ] `NodeJS.Timeout` → браузерный тип.
- [ ] Пересмотреть API: 23 пропса, `withActions`/`onOk`/`loading` — это уже не
      popover, а dialog. Разделить на `Popover` и `ConfirmDialog`.
- [ ] Логика `destroyOnClose` дублирует портал двумя ветками — упростить.
- [ ] Добавить focus management и `aria-modal`/роли осознанно.
- [ ] Следить за `scroll`/`resize` при открытии, а не только за первым кадром.

### `src/components/Input/Input.tsx`

- [ ] Нет `label`, `id`, `aria-invalid`, `aria-describedby` — ошибка не связана с полем.
- [ ] Радио/чекбоксы обёрнуты в `div`, текст не кликабелен — нужен `<label>`.
- [ ] Для группы радио — `fieldset`/`legend`.
- [ ] Атрибут `size` конфликтует с нативным `size` у input — переименовать в
      `uiSize`/`controlSize` либо задокументировать.
- [ ] `className` сейчас попадает на wrapper, а не на input — задокументировать
      или разделить `className`/`inputClassName`.

### `src/components/MaskedInput/MaskedInput.tsx`

- [ ] `value` обязателен, но тип допускает `undefined` — уточнить API.
- [ ] Проверить paste, IME, backspace в середине строки, удаление фиксированных символов.
- [ ] `maxLength={mask.length}` может мешать вставке с разделителями — проверить.
- [ ] `requestAnimationFrame` для курсора — ок, но нужны тесты на позицию.
- [ ] Вынести чистые функции форматирования в отдельный модуль и покрыть unit-тестами.

### `src/components/Search/Search.tsx`

- [ ] Убрать `setState` из эффекта (`Search.tsx:56`) — вычислять пустое состояние
      из `query`/`items` или обрабатывать в обработчике.
- [ ] Защита от гонок: старый ответ не должен перезаписывать новый (AbortController
      или счётчик запросов).
- [ ] `key={index}` → стабильный ключ из данных, если есть `id`.
- [ ] Добавить `aria-controls`, `role="combobox"`, `aria-activedescendant`.

### `src/components/Sidebar/Sidebar.tsx`

- [ ] Focus trap: обработать случай без фокусируемых элементов, включить сам контейнер.
- [ ] Пометить фон `aria-hidden`/`inert`, а не только overlay.
- [ ] Проверить восстановление фокуса при закрытии через overlay/Escape.
- [ ] `lockBodyScroll` не должен ломать вложенные оверлеи (счётчик блокировок).

### Остальные компоненты

- [ ] `Accordion`: добавить `aria-controls` и связь с регионом.
- [ ] `StickyHeader`: `shadowOnSticky` сейчас не зависит от факта прокрутки —
      либо реализовать, либо переименовать.
- [ ] `Pagination`: проверить `pageSize`/`total`, disabled-состояния, `aria-current`.
- [ ] `Progress`/`Skeleton`: добавить `aria-live` там, где нужно, и reduced-motion.
- [ ] `FormSidebar`/`LeftSidebar`: убрать инлайн-стили, собрать из компонентов кита.

---

## 4. Доступность (a11y)

Ориентир — WAI-ARIA Authoring Practices Guide (APG).

- [ ] `Input`: `label` + `id`, `aria-invalid`, `aria-describedby` для ошибки.
- [ ] `Select`: полный паттерн combobox/listbox, `aria-activedescendant`, `aria-controls`.
- [ ] `Tabs`: `tablist`/`tab`/`tabpanel`, связи `aria-controls`/`aria-labelledby`,
      стрелки, Home/End.
- [ ] `Dialog`/`Sidebar`: focus trap, восстановление фокуса, `inert` на фоне.
- [ ] `Tooltip`: `aria-describedby`, закрытие по Escape, touch.
- [ ] `Accordion`: `aria-expanded` + `aria-controls`.
- [ ] `Toast`: `aria-live="polite"` (или `assertive` для ошибок), пауза.
- [ ] Проверка контраста, видимый `:focus-visible` во всех интерактивных элементах.
- [ ] `prefers-reduced-motion` во всех анимациях, а не только в `Select`.

Инструменты: `eslint-plugin-jsx-a11y`, `jest-axe`, ручная проверка Tab/Shift+Tab,
скринридер (NVDA/VoiceOver), клавиатура без мыши.

---

## 5. Верстка и дизайн-система

- [ ] Создать `src/styles/tokens.css`:
  - цвета (surface, text, border, accent, danger, success, warning);
  - spacing-шкала;
  - radius;
  - типографика (размеры, line-height, веса);
  - тени;
  - z-index-шкала;
  - duration/easing.
- [ ] Создать `src/styles/reset.css` и подключить в `main.tsx`.
- [ ] Перевести компоненты с хардкода (`#1890ff`, `#d9d9d9`, `#ff4d4f`) на токены.
- [ ] Ввести темы: светлая/тёмная через `data-theme`, а не только
      `prefers-color-scheme` в одном компоненте.
- [ ] Единый `z-index`-слой для dropdown/popover/tooltip/modal/toast.
- [ ] Использовать логические свойства (`margin-inline`, `padding-block`) и проверить RTL.
- [ ] Добавить responsive-поведение и container queries для составных компонентов.
- [ ] Убрать инлайн-стили из компонентов и примеров.
- [ ] Добавить `@layer` (reset, tokens, components, utilities), если нравится порядок.
- [ ] Проверить мобильные ширины, длинные строки, overflow, скролл внутри оверлеев.

---

## 6. Инженерия и тулинг

- [ ] Установить и настроить Vitest + Testing Library + `@testing-library/user-event`.
- [ ] Добавить `jest-axe` для проверки доступности в тестах.
- [ ] Storybook или Ladle; перенести демо из `App.tsx` в stories.
- [ ] Storybook interaction tests / Playwright для критичных сценариев.
- [ ] Prettier, stylelint (CSS Modules), commitlint, husky + lint-staged.
- [ ] Path aliases (`@/components/...`), чтобы убрать `../../..`.
- [ ] Импорт lodash точечно (`lodash/debounce`) или заменить на собственную утилиту.
- [ ] Настроить `vite build --lib`, `exports`, `peerDependencies: react`, генерацию `.d.ts`.
- [ ] Добавить changesets, если планируется публикация и версионирование.
- [ ] Добавить `rollup-plugin-visualizer` и следить за размером бандла.

---

## 7. План по фазам

### Фаза 0 — зелёный baseline (1–2 дня)

- [ ] 34 ошибки TypeScript исправлены.
- [ ] 3 ошибки ESLint исправлены.
- [ ] `strict` включён.
- [ ] CI запускает lint + typecheck + build.
- [ ] README обновлён.

### Фаза 1 — фундамент (около недели)

- [ ] Токены + reset + темы.
- [ ] Примитивы: `Field`, `FieldLabel`, `FieldError`, `VisuallyHidden`, `Portal`.
- [ ] Хуки: `useControllableState`, `useClickOutside`, `useEscapeKey`, `useFocusTrap`,
      `usePosition`.
- [ ] Публичный API `src/components/index.ts`.
- [ ] Storybook/Ladle и перенос демо.
- [ ] Lib-сборка и типы.

### Фаза 2 — довести компоненты (1–2 недели)

- [ ] `Input`, `MaskedInput`, `Select`, `Form` — ядро, полный a11y и тесты.
- [ ] `Tabs`, `Accordion`, `Breadcrumbs` — паттерны APG.
- [ ] `DatePicker` — переписать логику и добавить клавиатуру.
- [ ] `Tooltip`, `Popover`, `Sidebar` — общий слой позиционирования и фокуса.
- [ ] `Toast` — `aria-live`, пауза, стабильные id.
- [ ] `Search`, `Pagination`, `Progress`, `Skeleton`, `StickyHeader` — краевые случаи.

### Фаза 3 — senior-сигналы (постоянно)

- [ ] Тесты на все критичные сценарии, покрытие растёт осознанно.
- [ ] Визуальная регрессия (Chromatic/Playwright screenshots).
- [ ] Документация API и примеры для каждого компонента.
- [ ] Использование кита в реальном приложении.
- [ ] Профилирование производительности и размера бандла.
- [ ] Code review собственных PR по чек-листу ниже.

---

## 8. Definition of Done для компонента

Компонент считается готовым, только если:

- [ ] Типы без `any`, публичный API описан и задокументирован.
- [ ] Работает controlled и uncontrolled (где это уместно).
- [ ] Все состояния: default, hover, focus-visible, active, disabled, error, loading, empty.
- [ ] Клавиатура: Tab, Enter/Space, Escape, стрелки (по паттерну).
- [ ] a11y: роли, `aria-*`, связь label/error, фокус.
- [ ] Тёмная тема и `prefers-reduced-motion`.
- [ ] Мобильный вид и проверка overflow.
- [ ] Unit/interaction-тесты на поведение.
- [ ] Story с примерами всех состояний.
- [ ] Нет магических цветов/размеров вне токенов.
- [ ] `lint + typecheck + test + build` зелёные.

---

## 9. Протокол работы с AI

AI — усилитель, а не автор. Правила:

1. Сначала спецификация: API, состояния, a11y-контракт, тест-кейсы. Потом код.
2. Маленькие диффы: один компонент или один баг за раз.
3. Тесты — контракт. Сгенерированный код принимается только с тестами, которые
   ты прочитал и запустил.
4. Читай каждую строку. Не можешь объяснить — не мержишь.
5. Проси AI критиковать: «найди баги», «где нарушения APG», «что переусложнено».
6. Веди журнал решений: почему такой API, какие альтернативы отверг.
7. Раз в неделю переписывай один компонент без AI — это калибровка собственного уровня.

---

## 10. Самопроверка перед словом «готово»

- [ ] Я запустил build, lint и тесты, а не предположил, что они пройдут.
- [ ] Я могу объяснить каждую строку в диффе.
- [ ] Я проверил клавиатуру и фокус.
- [ ] Я проверил пустые данные, длинные строки, ошибки и загрузку.
- [ ] Я проверил мобильную ширину и тёмную тему.
- [ ] Я знаю, какие краевые случаи остались незакрытыми.
- [ ] Я могу ответить на вопрос «почему именно так, а не иначе».

---

## 11. React: чего не хватает в понимании

`state`, `ref`, хуки, порталы, CSS Modules — это инструменты. Senior отличается не
знанием инструментов, а моделью: умеет выбирать между ними и предсказывать
последствия. Инструменты в проекте есть, модель пока фрагментарная.

Главная мысль: ты знаешь, **как написать**, но ещё не полностью знаешь,
**почему именно так и что сломается иначе**. Senior-уровень — это ответы на вопросы:

- Почему это состояние, а не вычисление?
- Почему это эффект, а не обработчик?
- Почему это контекст, а не пропсы, и наоборот?
- Почему компонент перерисовался и как это измерить?
- Что произойдёт в StrictMode, при SSR, при медленной сети, при race condition?

### 11.1. Mental model React

- [ ] **Чистота рендера.** Рендер — чистая функция от props/state. Нельзя мутировать,
      вызывать `register()`/`getValues()` в теле рендера (`Controller.tsx:14-15`),
      читать `document`, `Date.now()`, создавать таймеры.
- [ ] **State — это снапшот, а не мутабельная переменная.** Отсюда stale closures:
      замыкания видят state на момент рендера. Functional update — не случайность,
      а обязательный приём.
- [ ] **Reconciliation и `key`.** `key` — это identity, а не «убрать warning».
      `key={index}` в `Search.tsx` — типичная ошибка.
- [ ] **Batching и порядок обновлений.** Несколько `setState` батчатся, асинхронные —
      нет; `flushSync` — escape hatch.
- [ ] **StrictMode.** Двойной рендер и двойной запуск эффектов в dev. Если код
      ломается — он неправильный, а не StrictMode.
- [ ] **Rules of React.** Их надо знать не для линтера, а чтобы код был совместим
      с concurrent rendering и React Compiler.

### 11.2. Моделирование состояния

- [ ] **Derived state vs stored state.** Если можно вычислить из props/state — не храни.
      В проекте `isValid` вычисляется из `errors` неправильно, `actualPlacement`
      дублирует `placement`, `selectedDate` сбрасывается при листании.
- [ ] **Невозможные состояния.** Вместо набора boolean (`isOpen`, `isLoading`,
      `isSubmitted`, `error`) — discriminated union или state machine. Состояния
      `loading && error && success` одновременно должны быть невозможны.
- [ ] **`useReducer` и state machines.** Сложные компоненты (`Select`, `DatePicker`,
      формы) выигрывают от явного редьюсера/машины состояний.
- [ ] **State ownership.** Где должен жить стейт: локально, в родителе, в контексте,
      в URL, в серверном кэше.
- [ ] **Colocation.** Не поднимай состояние выше, чем нужно.
- [ ] **Context — не state manager.** Провайдер надо мемоизировать; контекст с частыми
      изменениями ререндерит всех потребителей. В `ToastContext.tsx:41` значение
      пересоздаётся каждый рендер.
- [ ] **Внешние сторы.** `useSyncExternalStore`, подписки, селекторы,
      Zustand/Redux Toolkit — когда и зачем.
- [ ] **Server state ≠ client state.** Кэш, инвалидация, retry, stale-while-revalidate
      (TanStack Query). В проекте этого слоя нет вообще.

### 11.3. Эффекты и escape hatches

- [ ] **`useEffect` — выход к внешнему миру**, а не «сделать что-то после рендера».
      Синхронизация с DOM, подписки, таймеры, аналитика. Не для вычислений и не для
      реакции на действия пользователя.
- [ ] **`setState` в эффекте — код-смелл** (`Search.tsx:56`). Вычисляй во время
      рендера или обрабатывай в событии.
- [ ] **Зависимости и identity.** Функции/объекты в deps пересоздаются; отсюда
      бесконечные циклы или устаревшие замыкания. Inline `searchFn` в `App.tsx` —
      пример.
- [ ] **Cleanup, гонки, отмена.** `AbortController`, ignore-флаг, счётчик запросов.
      В `Search` старый ответ может перезаписать новый.
- [ ] **`useLayoutEffect` vs `useEffect`.** Измерение DOM и позиционирование — до paint,
      иначе мигание. В `Popover`/`Tooltip` сейчас rAF вместо осознанного выбора.
- [ ] **Refs как escape hatch:** DOM, imperative API (`useImperativeHandle`), таймеры.
      Ref — не «state без ререндера».
- [ ] **`useId`.** SSR-safe id для label/aria. В проекте нигде нет.

### 11.4. Асинхронность и concurrency

- [ ] **Suspense, `lazy`, error boundaries.** Загрузка кода и данных, fallback,
      восстановление после ошибки. Нет ни одного error boundary.
- [ ] **Transitions:** `startTransition`, `useTransition`, `useDeferredValue`.
      Для поиска и тяжёлых списков — must know. `Search` — идеальный кандидат.
- [ ] **Actions и формы в React 19:** `useActionState`, `useFormStatus`,
      `useOptimistic`, `<form action>`. Свой аналог react-hook-form пишется без
      знания встроенных примитивов.
- [ ] **React 19:** `ref` как обычный проп (forwardRef больше не обязателен), `use()`,
      `<Context>` как провайдер, document metadata.
- [ ] **Гонки и отмена** — часть дизайна компонента, а не «потом».
- [ ] **Оптимистичные обновления и откат.**

### 11.5. Композиция и дизайн API

- [ ] **Compound components** (`Tabs.Tab`, `Select.Option`), slots, render props,
      `children` как функция.
- [ ] **Headless-подход:** логика в хуке, разметка снаружи.
- [ ] **Полиморфизм** (`as`/`asChild`), prop getters, слияние ref и className.
- [ ] **Controlled/uncontrolled как единый контракт** (`value`/`defaultValue`/`onChange`),
      а не два разных режима с кастами.
- [ ] **Не «kitchen sink».** `Popover` с 23 пропсами и `withActions`/`onOk` — это уже
      dialog. Senior умеет разделять ответственность.
- [ ] **ForwardRef нюансы:** merge refs, callback ref cleanup, `displayName`.
- [ ] **Порталы:** события всплывают по React-дереву, но не по DOM; фокус и z-index
      нужно продумывать. `Tooltip` без портала обрезается, `Popover` с порталом — ок.

### 11.6. Производительность

- [ ] **Как работает ререндер:** кто, почему, что дорого. `forceRender` всей формы
      на каждый ввод — пример отсутствия модели.
- [ ] **Referential equality** и когда `memo`/`useMemo`/`useCallback` реально нужны,
      а когда это карго-культ.
- [ ] **Профилирование** (React DevTools Profiler) до оптимизации.
- [ ] **Разделение контекстов** и селекторы, чтобы не ререндерить всё.
- [ ] **Виртуализация** длинных списков, `content-visibility`.
- [ ] **React Compiler:** зачем нужны Rules of React и что он берёт на себя.

### 11.7. SSR, гидратация, RSC

- [ ] **SSR/hydration mismatch**, почему `Date.now()`/`document` в рендере ломают
      гидратацию (`ToastContainer`, `DatePicker` — кандидаты).
- [ ] **Server Components и граница server/client**, сериализуемость props,
      `"use client"`.
- [ ] **Потоковый рендер, Suspense на сервере.**
- [ ] Даже если сейчас SPA — понимать, где код перестанет работать при SSR.

### 11.8. A11y и тестирование как часть React-архитектуры

- [ ] **Фокус-менеджмент** — это state-машина, а не набор атрибутов: порталы, `inert`,
      live regions, focus trap, возврат фокуса.
- [ ] **Тестирование поведения**, а не реализации: RTL, `user-event`, `act`,
      fake timers, тесты хуков, StrictMode в тестах.
- [ ] **Error boundaries + тесты на деградацию.**

### 11.9. Где это видно в проекте

| Концепция | Симптом |
|---|---|
| Чистота рендера | `Controller.tsx:14-15` — вызовы в рендере |
| Моделирование состояния | `Popover` — 3 состояния позиции + 23 пропса; `useForm` — набор boolean |
| Derived state | `DatePicker` хранит и сбрасывает `selectedDate`; `isValid` врёт |
| Эффекты | `Search.tsx:56`, гонки запросов, inline `searchFn` |
| Layout-эффекты | `Popover`/`Tooltip` — rAF вместо `useLayoutEffect` |
| Context | `ToastContext.tsx:41` — новый объект каждый рендер |
| Composition/API | `Popover` kitchen sink, `Select` с вложенным `<button>` |
| Refs | `forwardRef` есть, но ref не мержится и не прикрепляется в `Controller` |
| React 19 | `forwardRef` везде, хотя ref уже обычный проп; нет Actions/`use` |
| Async | Нет error boundary, Suspense, отмены запросов |
| Performance | `useForm.ts:161` — `forceRender` на каждый keystroke |
| Keys | `Search.tsx` — `key={index}` |
| SSR | `document.body` и `Date.now()` в рендере |
| Тесты | Ноль тестов на хуки и поведение |

### 11.10. Минимум, который надо закрыть до senior

1. **Rules of React и чистота рендера** — осознанно, без линтера.
2. **Моделирование состояния** — derived state, discriminated unions, `useReducer`.
3. **Effects** — когда не нужны, deps, cleanup, гонки, `useLayoutEffect`.
4. **Controlled/uncontrolled** — единый контракт и `useControllableState`.
5. **Composition и дизайн API** — compound/slots/headless, разделение ответственности.
6. **Async-паттерны** — Suspense, transitions, error boundaries, отмена, server state.
7. **Performance-модель** — ререндер, профилирование, мемоизация по необходимости.
8. **SSR/hydration** — хотя бы понимание ограничений.
9. **React 19** — ref как проп, Actions, `use`, `useOptimistic`.
10. **Тестирование поведения** — как способ проверять понимание.

### 11.11. Практика, которая закроет пробелы

- [ ] Переписать `Search` на `useDeferredValue`/`useTransition` + AbortController +
      `aria-activedescendant`.
- [ ] Переписать `DatePicker` на `useReducer` с явными состояниями, добавить
      клавиатуру и тесты.
- [ ] Сделать `Tabs` compound-компонентом с сохранением состояния и полным APG.
- [ ] Сделать `Popover` headless-хуком `usePopover` + тонкий компонент.
- [ ] Переписать `useForm` на подписку по полям (или React 19 Actions) и доказать
      профилировщиком отсутствие лишних ререндеров.
- [ ] Добавить error boundary и Suspense-загрузку в демо-приложение.
- [ ] Написать по 3–5 тестов на каждый из этих компонентов.

### 11.12. Что читать по React

- react.dev: **Thinking in React**, **Rules of React**, **Escape Hatches**,
  **You Might Not Need an Effect**, **Synchronizing with Effects**,
  **Referencing Values with Refs**.
- react.dev: разделы про Suspense, Transitions, React 19 Actions.
- WAI-ARIA APG — для паттернов, где React-состояние управляет доступностью.
- TanStack Query docs — про server state.
- React DevTools Profiler — не статья, а регулярная практика.

Итог: не хватает не ещё одного хука, а системной модели React: «что является
состоянием, что вычислением, что эффектом, что внешним миром». Как только каждый
компонент начнёт раскладываться по этим четырём категориям, уровень начнёт расти.

---

## 12. Полезные ссылки

- React docs: https://react.dev/learn
- You Might Not Need an Effect: https://react.dev/learn/you-might-not-need-an-effect
- WAI-ARIA APG: https://www.w3.org/WAI/ARIA/apg/
- Testing Library: https://testing-library.com/docs/react-testing-library/intro/
- Vitest: https://vitest.dev/
- jest-axe: https://github.com/nickcolley/jest-axe
- Floating UI: https://floating-ui.com/
- Storybook: https://storybook.js.org/
- web.dev (Core Web Vitals, accessibility): https://web.dev/

---

## 13. Критерий выхода из «учебного» уровня

Проект можно считать зрелым, когда одновременно верно:

- `main` всегда зелёный, CI обязателен.
- Любой компонент покрыт тестами на поведение и доступность.
- Дизайн-токены и темы используются везде.
- Публичный API кита стабилен и задокументирован.
- Ты можешь без AI воспроизвести и объяснить любой компонент из репозитория.
