# Typescript.tv

## npm, npx, nvm

npm (node package manager) - установка
npx (node package eXecutor) - запуск исполняемых пакетов без их основной установки
nvm (node version manager) - инструмент для удобного управления несколькими версиями Node.js на одной системе
.nvmrc - этот файл в проекте автоматически подхватывает нужную версию при nvm use

## Каретка и тильда

^5.0.0 — можно обновляться до любых минорных и патч-версий в пределах мажорной 5, то есть 5.1.0, 5.2.3 и т.п., но не 6.0.0.
~5.0.0 — можно обновляться только до патч-версий в пределах 5.0.x, то есть 5.0.1, 5.0.3, но не 5.1.0

## Виды зависимостей

| Тип              | Где ставится             | Устанавливается?                     | Пример                          | Когда используется         |
| ---------------- | ------------------------ | ------------------------------------ | ------------------------------- | -------------------------- |
| dependencies     | Прямые, для runtime      | ✅ Автоматически                      | lodash, react                   | Приложение в продакшене    |
| devDependencies  | Только разработка        | ✅ Автоматически (кроме --production) | typescript, jest, eslint        | Компиляция, тесты, линтинг |
| peerDependencies | Хост-пакеты для плагинов | ❌ Должны быть уже в проекте          | react для UI-библиотеки         | Плагины/расширения         |
| Транзитивные     | Косвенные                | ✅ Автоматически через прямые         | lodash → node-fetch → 15 мелких | Автоматически тянется      |

### Визуальное дерево реального проекта

```
Мой проект
├── dependencies (прямые)
│   ├── react@18.2.0          ← импортирую в коде
│   └── axios@1.6.0           ← HTTP-запросы
│
├── devDependencies (разработка) 
│   ├── typescript@5.3.0      ← компилятор TS
│   └── jest@29.7.0           ← тесты
│
├── peerDependencies (плагины ожидают)
│   └── react@^18.0.0         ← плагин @tanstack/react-query
│
└── Транзитивные (накапливаются)
    ├── react → scheduler → esbuild (50+ пакетов...)
    └── axios → follow-redirects → agent-base → 20 пакетов...
```

## Файлы проекты

package.json - описывает проект, зависимости с диапазонами версий. 

📋 Метаданные: name, version, description, author, license
📦 Зависимости: dependencies, devDependencies, peerDependencies
⚙️ Скрипты: "start", "build", "test"

package-lock.json — Точное дерево зависимостей

Назначение: Фиксирует точные версии всех пакетов (включая транзитивные) для гарантированной воспроизводимости.

Что содержит:

📍 Точные версии: "lodash": "4.17.21" (НЕ диапазон!)
🔗 Полное дерево: lodash → node-fetch → 15 мелких пакетов
🔒 Хэши, resolved URL для каждого пакета

## Как это работает пошагово

1. npm install читает package.json (диапазоны)
2. Берёт ТОЧНЫЕ версии из package-lock.json  
3. Ставит идентичное дерево node_modules
4. Обновляет lock при новых установках

| Характеристика        | package.json       | package-lock.json |
| --------------------- | ------------------ | ----------------- |
| Ручное редактирование | ✅ Да               | ❌ Только npm      |
| Коммит в Git          | ✅ Обязательно      | ✅ Обязательно     |
| Версии                | ^18.2.0 (диапазон) | 18.2.15 (точно)   |
| Команда установки     | npm install        | npm ci (строго)   |
| Размер                | 1-5 КБ             | 100 КБ - 5 МБ     |

## Конфигурация Typescript

npx tsc --init - начать конфигурирование ts

npx tsc --watch - непрерывно смотреть за изменениями в файлах и перекомпилировать

## 🛠️ Манипуляции с объектами

- **Pick<T, K>** — выбрать поля K из T
- **Partial<T>** — все свойства опциональные
- **Omit<T, K>** — удалить поля K из T
- **Required<T>** — все свойства обязательные
- **Readonly<T>** — все свойства readonly
- **Record<K, T>** — объект с ключами K и значениями T

## 🧹 Утилиты для union types

- **Exclude<T, U>** — T без значений из U
- **Extract<T, U>** — общие значения T ∩ U
- **NonNullable<T>** — убрать null/undefined из T

## 📄 Утилиты для функций

- **Parameters<T>** — тип аргументов функции T
- **ConstructorParameters<T>** — аргументы конструктора T
- **ReturnType<T>** — тип возвращаемого значения T
- **InstanceType<T>** — тип экземпляра класса T
- **Awaited<T>** — разворачивает Promise<T>

## 🔄 Продвинутые (ThisType)

- **ThisParameterType<T>** — тип `this` в функции T
- **OmitThisParameter<T>** — функция T без `this`
- **ThisType<T>** — тип `this` для mapped types

## 🔤 String Manipulation (TS 4.1+)

- **Uppercase<S>** — "hello" → "HELLO"
- **Lowercase<S>** — "HELLO" → "hello"  
- **Capitalize<S>** — "hello" → "Hello"
- **Uncapitalize<S>** — "Hello" → "hello"

## 🆕 Новые (TS 5.0+)

- **Mutable<T>** — обратное Readonly<T> (readonly → mutable)

# Массивы

Array<T>, T[]

union types - (number|string)[]

tuples: fixed length array - [number, number, number]

tuples: labeling elements - type Payments = [month: string, payment: number, month: string, payment: number];

Variadic Tuples: Allowing Flexible Lengths - type Payments = [number, string, ...number[]];

# interface vs type vs class

interface - определяет структуру объекта (props, методы) только на compile-time - в JS не попадает. Подходит для контрактов, расширения (extends) и реализации в классах (implements). Поддерживает declaration merging

type (alias) - Гибкий alias для любого типа: object, union (|), intersection (&), primitives, tuples. Не расширяется как interface, но идеален для сложных типов вроде string | number. Лучше для mapped/conditional types

class - Реальный runtime-объект с конструктором, свойствами, методами (public/private). Можно инстанцировать (new), наследовать (extends). Используй для бизнес-логики, не только типизации.


## Generics + Mapped Types

Mapped types — это шаблон TypeScript для трансформации свойств объекта по правилам: итерируешься по ключам исходного типа и создаёшь новый.

type Mapped<T> = {
  [Key in keyof T]: T[Key];  // Базовый: копирует свойства
  // или трансформируй: [Key in keyof T]: T[Key] | null;
}

## Conditional Types

Conditional type: T extends Pattern ? Then : Else

Infer — это ключевое слово TypeScript для выводa (inference) типов в conditional types. Оно "захватывает" часть проверяемого типа T и использует её в результате, не только для массивов.

(infer U)[] либо Array<infer U> — это шаблон для любого массива: string[], number[]
Promise<infer U> - вывод U

## Discriminated Unions

Union типов с общим дискриминантом (literal свойством), по которому TS автоматически сужает тип в if/switch. 

Идеально для состояний (loading/error/success).

```
type Loading = { state: 'loading' };
type Success<T> = { state: 'success'; data: T };
type Error = { state: 'error'; error: string };

type ApiResult<T> = Loading | Success<T> | Error;

// Автоматическое сужение
function handleResult<T>(result: ApiResult<T>) {
  if (result.state === 'loading') { /* result — Loading */ }
  else if (result.state === 'success') { /* result.data доступно! */ }
  else { /* result.error доступно */ }
}

```

Дискриминант — state с literals ('loading' | 'success' | 'error')

# Zod

Zod — TypeScript-first библиотека валидации данных на runtime (JSON, forms, API). TS inference (z.infer) — её суперсила: из схемы Zod автоматически генерирует точный TS-тип, синхронизируя валидацию и типизацию

Отлично подходит как для валидации в АПИ, валидации ответов от апи на клиенте, так и для форм. Предоставляет декларативный подход

Преимущества декларативного подхода над императивным:
1. Single Source of Truth (SSoT)

```
Императивно: 
interface User { name: string }  // ❌ Дублирование
if (!name) setError('Required')  // ❌ Ещё дублирование

Декларативно:
const schema = z.object({ name: z.string().min(1) });  // ✅ Один источник!
type User = z.infer<typeof schema>;  // Тип БЕСПЛАТНО!
```

Меняешь схему → типы + валидация + ошибки обновляются.

2. Масштабируемость (Scale)

```text
Форма 3 поля: Императив = 30 строк, Декларатив = 10 строк
Форма 30 полей: Императив = 300 строк 😱, Декларатив = 50 строк 😎
Форма 300 полей (wizard): Императив = IMPOSSIBLE, Декларатив = OK
```

3. DRY (Don't Repeat Yourself)

```text
Императивно (copy-paste hell):
if (!name) errors.name = 'Required'
if (!email.test()) errors.email = 'Invalid'
if (age < 18) errors.age = '18+'

Декларативно (1 строка):
name: z.string().min(1),
email: z.string().email(),
age: z.number().min(18),
```

4. Testability

```text
// ✅ Декларативно: тест схемы = тест формы
test('validates user', () => {
  const result = UserSchema.safeParse({ name: '', email: 'invalid' });
  expect(result.success).toBe(false);
  expect(result.error.errors[0].message).toBe('Имя обязательно');
});

// ❌ Императивно: тест 50 строк setState логики
```

5. Refactoring & Onboarding

```text
Новый разработчик:
Императивно: "Где логика name? В onBlur? В onSubmit? В validateForm?"
Декларативно: "Смотри schema.user.ts — строка 5"
```

6. Error Handling (Production)

```text
Императивно:
setErrors({ name: 'Required' });  // Забыл field? Нет ошибки!

Декларативно:
z.string().min(1)  // Гарантированно работает везде
```

Реальный пример контраста

```text
// ❌ Императивный ад (50+ строк)
const validate = (data) => {
  const errors = {};
  if (!data.name) errors.name = 'Required';
  if (!data.email.includes('@')) errors.email = 'Invalid';
  if (data.age && data.age < 18) errors.age = '18+';
  // +50 полей...
  setErrors(errors);
};

// ✅ Декларативный рай (5 строк)
const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(18).optional(),
});
```