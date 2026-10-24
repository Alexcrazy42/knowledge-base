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

## 11. Полезные ссылки

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

## 12. Критерий выхода из «учебного» уровня

Проект можно считать зрелым, когда одновременно верно:

- `main` всегда зелёный, CI обязателен.
- Любой компонент покрыт тестами на поведение и доступность.
- Дизайн-токены и темы используются везде.
- Публичный API кита стабилен и задокументирован.
- Ты можешь без AI воспроизвести и объяснить любой компонент из репозитория.
