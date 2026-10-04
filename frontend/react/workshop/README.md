```
my-monorepo/
├── apps/
│   └── web/                          # Основное React-приложение
│       ├── public/
│       └── src/
│           ├── app/                  # Слой App (инициализация)
│           │   ├── providers/        # Все провайдеры (Query, Theme, Router)
│           │   ├── styles/           # Глобальные стили
│           │   └── index.tsx         # Точка входа
│           │
│           ├── pages/                # Слой Pages
│           │   ├── home/
│           │   │   ├── ui/           # Компонент страницы
│           │   │   └── index.ts      # Public API слайса
│           │   └── profile/
│           │
│           ├── widgets/              # Слой Widgets
│           │   └── header/
│           │       ├── ui/
│           │       ├── model/        # Состояние виджета (если есть)
│           │       └── index.ts
│           │
│           ├── features/             # Слой Features
│           │   ├── auth-by-email/
│           │   │   ├── ui/           # Форма входа
│           │   │   ├── model/        # Хуки, стор, схемы валидации
│           │   │   ├── api/          # Запросы к API для фичи
│           │   │   └── index.ts
│           │   └── add-to-cart/
│           │
│           ├── entities/             # Слой Entities
│           │   ├── user/
│           │   │   ├── ui/           # Аватар, имя пользователя
│           │   │   ├── model/        # Типы, стор
│           │   │   └── index.ts
│           │   └── product/
│           │
│           └── shared/               # Слой Shared
│               ├── ui/               # UI-кит (Button, Input, Modal)
│               ├── api/              # Базовый API-клиент (fetch/axios)
│               ├── lib/              # Утилиты (форматирование дат, cn)
│               ├── config/           # Константы, env-переменные
│               └── assets/           # Иконки, шрифты
│
├── packages/                         # Общие пакеты для всех приложений
│   ├── design-system/                # Компоненты, тема, цвета[reference:5]
│   └── eslint-config-custom/         # Общие правила линтинга
│
├── package.json                      # Корневой package.json с workspaces
├── pnpm-workspace.yaml               # (или другой менеджер)
└── turbo.json                        # (опционально) Конфигурация Turborepo
```