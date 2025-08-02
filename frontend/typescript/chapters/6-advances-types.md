# Глава 6. Продвинутые типы.

## Связи между типами

Подтип
Супертив
Совместимость
Тотальность

Получение свойства из объекта
```
function get<O extends object, K extends keyof O>(
  obj: O, 
  key: K
): O[K] extends undefined ? O[K] | undefined : O[K] {
  return obj[key];
}

// Теперь корректно работает с optional-полями:
type User = {
  name?: string;
  age: number;
};

const u: User = { age: 25 };
const name = get(u, "name"); // Тип: string | undefined
```

Получение вложенных свойств из объекта с полной типизацией. Глубина вложенности жестко задана 3 уровнями. Не поддерживает массивы. Для динамических ключей потребуются доп проверки.
```
type Get = {
  // Вариант для 1 ключа
  <O extends object, K1 extends keyof O>(o: O, k1: K1): O[K1];
  
  // Вариант для 2 ключей
  <O extends object, K1 extends keyof O, K2 extends keyof O[K1]>(
    o: O, 
    k1: K1, 
    k2: K2
  ): O[K1][K2];
  
  // Вариант для 3 ключей
  <O extends object, K1 extends keyof O, K2 extends keyof O[K1], K3 extends keyof O[K1][K2]>(
    o: O, 
    k1: K1, 
    k2: K2, 
    k3: K3
  ): O[K1][K2][K3];
};
```


Улучшенная версия (с поддержкой массивов):
```
type Path<T, MaxDepth extends number = 3> = [T] extends [object]
  ? {
      [K in keyof T & (string | number)]: [MaxDepth] extends [never]
        ? never
        : T[K] extends infer R
        ? `${K}` | (Path<R, [-1, 0, 1, 2, 3][MaxDepth]> extends infer S
            ? S extends string
              ? `${K}.${S}`
              : never
            : never)
        : never;
    }[keyof T & (string | number)]
  : never;

function get<T, P extends Path<T>>(
  obj: T,
  path: P
): any { /* реализация */ }
```


## Record

способ описать объект как отображение на другой объект

```
type Weekday = 'Mon' | 'Tue'| 'Wed' | 'Thu' | 'Fri'
type Day = Weekday | 'Sat' | 'Sun'

let nextDay: Record<Weekday, Day> = {
 Mon: 'Tue'
}

И тут вы получите полезное сообщение об ошибке:
Ошибка TS2739: в типе '{Mon: "Tue"}' упущены следующие свойства
из типа 'Record<Weekday, Day>': Tue, Wed, Thu, Fri.
```

### Отображенные типы

TypeScript дает второй отличный способ объявить более безопасный тип nextDay — отображенные типы. Используем их для указания, что nextDay — это объект с ключом для каждого Weekday, чье значение — это Day:
```
let nextDay: {[K in Weekday]: Day} = {
 Mon: 'Tue'
}
```


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
type Record<K extends keyof any, T> = {
    [P in K]: T
}
```