# 3 глава. Типы

Структурная типизация - стиль программирование, в котором вас интересуют только конкретные свойства объекта, а не его имя (номинальная типизация). в некоторых языках это называют утинов типизацией (не судите книжку по обложке)

## Сигнатуры индексов

Синтаксис [key: T}: U называется сигнатуров индекса. С ее помощью вы сообщаете компилятору, что данный обхект может содержать больше ключей. Читать его следует так: "Для этого объекта все ключи типа T должны иметь значения типа U"

Но тип (T) ключа сигнатуры индекса должен быть совместим либо со string,
либо с number.
В качестве имени ключа сигнатуры индекса можно использовать любое слово — не только key:

```
let airplaneSeatingAssignments: {
 [seatNumber: string]: string
} = {
 '34D': 'Boris Cherny',
 '34E': 'Bill Gates'
}
```

## Псевдонимы типов

```
type Age = number

type Person = {
    name: string
    age: Age
}

let age : Age = 55
```

Псевдоним типа всегда можно заменить типом, на который он указывает

```
type Color = 'red'
type Color = 'blue' // Ошибка TS2300: повтор идентификатора 'Color'.
```

## Типы объединения и пересечения

Объединением A и B будет их сумма (все, что есть в A, или в B, или в обоих), пересечение же — это то, что у них есть общего (все, что есть и в A, и в B)

```
type Cat = {name: string, purrs: boolean}
type Dog = {name: string, barks: boolean, wags: boolean}
type CatOrDogOrBoth = Cat | Dog
type CatAndDog = Cat & Dog
```

## Массивы

TypeScript поддерживает два варианта синтаксиса для массиво: T[] и Array<T>
Они идентичные по значению и действию. 



```
let a = [1, 2, 3] // number[]
var b = ['a', 'b'] // string[] // TS сам решил, что это массив строк
let c: string[] = ['a'] // string[]
let d = [1, 'a'] // (string | number)[]
const e = [2, 'b'] // (string | number)[] // можно намешивать
```

в следующем примере мы создали пустой массив в методе, и TS еще не знает какой у него тип any[]. По мере добавления в массив новых значений TS постепенно определяет его тип в соответствии с ними. Как только массив выйдеи за определенный диапазон (функцию), тогда TS присвоит ему последний тип, который не может быть расширен далее
```
function buildArray() {
 let a = [] // any[]
 a.push(1) // number[]
 a.push('x') // (string | number)[]
 return a
}
let myArray = buildArray() // (string | number)[]
myArray.push(true) // Ошибка 2345: аргумент типа 'true'
 // не может быть присвоен параметру
// типа 'string | number'.
```


## Кортежи

```
let a: [number] = [1]
// Кортеж [имя, фамилия, год рождения]
let b: [string, string, number] = ['malcolm', 'gladwell', 1963]
b = ['queen', 'elizabeth', 'ii', 1926] // Ошибка TS2322: тип
// 'string' не может быть присвоен типу 'number'.


Кортежи также поддерживают опциональные элементы. Как и для типов
object, опциональность обозначается знаком ?:
// Массив железнодорожных тарифов, который может меняться
// в зависимости от направления
let trainFares: [number, number?][] = [
 [3.75],
 [8.25, 7.70]
]

// Эквивалент:
let moreTrainFares: ([number] | [number, number])[] = [
 // ...
]
```

```
Как и в случае с Array, в TypeScript есть пара более длинных форм для
объявления массивов и кортежей только для чтения:
type A = readonly string[] // readonly string[]
type B = ReadonlyArray<string> // readonly string[]
type C = Readonly<string[]> // readonly string[]
type D = readonly [number, string] // readonly [number, string]
type E = Readonly<[number, string]> // readonly [number, string]
```

## null, underfined, void и never

undefined Означает, что нечто еще не было определено, а null показывает отсутствие значения

void - возвращаемый тип функции, которая не возвращает ничего
never - тип функции, которая никогда ничего не возвращает (выбрасывает исключение или выполняется вечно)

если unknown - супертип любого другого типа, то never - подтип любых других типов или низший тип (bottom type), который может быть присвоен любому другому типу, и значение типа never может быть использовано везде безопаснос.

null Отсутствие значения
undefined Переменная, которой не присвоено значение
void Функция, не имеющая оператора return
never Функция, никогда ничего не возвращающая

## Enum

перечисление возможных значений типа. неупорядоченная структура данных, которая сопоставляет ключи и значения. 
объект, имеющие во время компиляции фиксированные ключи, что позволяет TypeScript убедиться, что данный ключ будет существовать при обращении к значению.

Два типа enum: отображающий строки в строки и отображающий строки в числа:

```
enum Language {
    English,
    Spanish,
    Russian
}
```

TS будет автоматом выводить число в качестве значения каждого члена перечисления, но вы также может установить значения явно

```
enum Language {
 English = 0,
 Spanish = 1,
 Russian = 2
}
```

Общепринято, что имена enum начинаются с  верхнего регистра
и имеют форму единственного числа. Его ключи также начинаются
с верхнего регистра

```
let myFirstLanguage = Language.Russian // Language
let mySecondLanguage = Language['English'] // Language
```

```
const enum Language {
 English,
 Spanish,
 Russian
}

// Обращение к верному ключу перечисления
let a = Language.English // Language
// Обращение к неверному ключу перечисления
let b = Language.Tagalog // Ошибка TS2339: свойство 'Tagalog'
 // не существует в типе 'typeof Language'.
// Обращение к верному значению перечисления
let c = Language[0] // Ошибка TS2476: обратиться к константному
 // члену перечисления можно только с помощью
// строчного литерала.
```

```
const enum Flippable {
 Burger,
 Chair,
 Cup,
 Skateboard,
 Table
}
function flip(f: Flippable) {
}

flip(Flippable.Chair) // 'flipped it'
flip(Flippable.Cup) // 'flipped it'
flip(12) // 'flipped it' (!!!)

const enum Flippable {
 Burger = 'Burger',
 Chair = 'Chair',
 Cup = 'Cup',
 Skateboard = 'Skateboard',
 Table = 'Table'
}
function flip(f: Flippable) {
 return 'flipped it'
}
flip(Flippable.Chair) // 'flipped it'
flip(Flippable.Cup) // 'flipped it'
flip(12) // Ошибка TS2345: аргумент типа '12'
 // не может быть присвоен параметру типа
// 'Flippable'.
flip('Hat') // Ошибка TS2345: аргумент типа '"Hat"'
 // не может быть присвоен параметру типа
// 'Flippable'.
Достаточно присутствия одного числового з


```