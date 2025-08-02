# Крутые фичи языка

1. Сопоставление типов (Mapped Type)

Сопоставление типов (Mapped Type) в TS - создание нового типа на основе существующего. В данном случае это не функция, а тип объекта, где ключи берутся из одного типа, а значения из другого/

[K in Weekday] - Mapped Type - конструкция TS для генерации типов

Как это работает:
1. TS разворачивает [K in Weekday] в набор всех возможных ключей из Weekday
2. проверяет, что все ключи из Weekday присутствуют. 

Где применяется:
1. Генерация типов на лету
```
type Readonly<T> = { readonly [K in keyof T]: T[K] };
```

2. Трансформация существующих типов

```
type Optional<T> = { [K in keyof T]?: T[K] };
```
3. Сопоставление enum

```
enum Status { New, InProgress, Done }
type StatusNames = { [K in Status]: string };
// => { 0: string; 1: string; 2: string }
```

4. Можно добавить модификаторы, например readonly или ?
```
type PartialWeekday = { [K in Weekday]?: Day };
```

5. Преобразование ключей
```
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
};
// { getName: () => string; getAge: () => number }
```

```
interface Person {
  name: string;
  age: number;
}

type PersonGetters = Getters<Person>;

declare function createGetters<T>(obj: T): Getters<T>;

const person = { name: "Alice", age: 30 };
const getters = createGetters(person);

getters.getName(); // "Alice"
getters.getAge();  // 30
```

6. Рекурсивный тип
```
type DeepGetters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: 
    T[K] extends object ? () => DeepGetters<T[K]> : () => T[K]
};
```

Практическое применение:
Генерация TypeScript-кода по схемам (например, из JSON Schema).
Создание ORM/ODM с динамическими методами.
Автодополнение для паттерна "Builder".