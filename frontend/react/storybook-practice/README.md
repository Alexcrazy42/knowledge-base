# Storybook Cheat Sheet

Storybook — это изолированная среда разработки UI-компонентов. Позволяет разрабатывать, тестировать и документировать компоненты независимо от основного приложения.

## Основные концепции

- **Story (Стори)** — одно конкретное состояние компонента (например, `Button/Disabled` или `Form/WithError`).
- **Colocation (Соседнее расположение)** — файлы `.stories.tsx` должны лежать в той же папке, что и сам компонент, а не в отдельной директории.
- **Autodocs** — автоматическая генерация страницы документации с таблицей пропсов на основе TypeScript-интерфейсов.

## Структура проекта (Best Practice)

```text
src/
 ├── components/
 │    ├── ui/                 # Базовые компоненты из библиотек (без stories)
 │    │    └── button.tsx
 │    └── UserCard/           # Бизнес-компоненты проекта
 │         ├── UserCard.tsx
 │         └── UserCard.stories.tsx
```

## Базовый шаблон стори

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { UserCard } from './UserCard';

// 1. Метаданные компонента
const meta: Meta<typeof UserCard> = {
  title: 'Business/UserCard', // Путь в меню слева
  component: UserCard,
  tags: ['autodocs'],         // Включает авто-документацию
  parameters: {
    layout: 'centered',       // Центрирование компонента на холсте
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// 2. Конкретные состояния (стори)
export const Default: Story = {
  args: {
    name: 'Иван Иванов',
    status: 'online',
  },
};

export const WithLongName: Story = {
  args: {
    name: 'Константин Константинопольский',
    status: 'offline',
  },
};
```

## Работа с контекстом (Decorators)

Если компоненту требуются провайдеры (Router, Theme, Redux), используются декораторы.

**Локальный декоратор** (только для одного файла `.stories.tsx`):
```tsx
const meta: Meta<typeof MyComponent> = {
  component: MyComponent,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};
```

**Глобальный декоратор** (для всех стори, файл `.storybook/preview.tsx`):
```tsx
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../src/theme/ThemeProvider';

const preview = {
  decorators: [
    (Story) => (
      <ThemeProvider>
        <MemoryRouter>
          <Story />
        </MemoryRouter>
      </ThemeProvider>
    ),
  ],
};
export default preview;
```

## Панель инструментов (Addons)

### 1. Controls
**Что это:** UI для изменения пропсов (args) компонента в реальном времени.
**Как использовать:** Определяются через свойство `args` в стори. Storybook автоматически генерирует инпуты на основе типов TypeScript.
**Зачем:** Быстрая проверка граничных значений (пустые строки, длинные тексты, разные комбинации флагов) без переписывания кода.

### 2. Actions
**Что это:** Логгер событий, вызываемых компонентом (клики, изменения инпутов).
**Как использовать:** Обернуть колбэк в функцию `fn()` из `@storybook/test`.
```tsx
import { fn } from '@storybook/test';

export const Default = {
  args: {
    onClick: fn(), // В панели Actions появится запись при клике
  },
};
```
**Зачем:** Отладка того, какие именно аргументы компонент передает родительскому обработчику.

### 3. Interactions
**Что это:** Сценарии автоматизированного взаимодействия с компонентом (имитация действий пользователя).
**Как использовать:** Добавить функцию `play` в стори.
```tsx
import { within, userEvent } from '@storybook/test';

export const FormSubmit: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Email');
    await userEvent.type(input, 'test@test.com');
    await userEvent.click(canvas.getByRole('button'));
  },
};
```
**Зачем:** Тестирование сложных сценариев (валидация форм, открытие модалок) и демонстрация UX-флоу.

### 4. Visual Tests
**Что это:** Регрессионное тестирование на уровне пикселей.
**Как использовать:** Интеграция с сервисом Chromatic (требует аккаунт и CI/CD).
**Зачем:** Автоматическое обнаружение непреднамеренных изменений в верстке (сдвиги, изменение цветов, шрифтов) при ревью кода.

### 5. Accessibility (a11y)
**Что это:** Проверка компонента на соответствие стандартам доступности WCAG.
**Как использовать:** Вкладка появляется автоматически при наличии `@storybook/addon-a11y`.
**Зачем:** Выявление проблем с контрастностью, отсутствием ARIA-атрибутов, невозможностью навигации с клавиатуры.

## Команды CLI

- `npx storybook@latest init` — инициализация Storybook в существующем проекте.
- `npm run storybook` — запуск локального сервера разработки (обычно порт 6006).
- `npm run build-storybook` — сборка статической версии витрины для деплоя (в папку `storybook-static`).

## Правила использования

1. Не писать стори на базовые компоненты сторонних библиотек (AntD, MUI, shadcn), если они не кастомизированы.
2. Писать стори на все составные бизнес-компоненты и сложные формы.
3. Использовать моковые данные (fixtures) в `args`, а не реальные API-запросы внутри стори.
4. Глобальные провайдеры выносить в `.storybook/preview.tsx`.