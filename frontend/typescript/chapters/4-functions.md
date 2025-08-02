# функции

разные способы объявления и вызова функций в TS
перегрузка сигнатуры
полиморфные функции
полиморфные псевдонимы типов

# способы объявления
именованная функция
```
function greet(name: string) {
 return 'hello ' + name
}
```

функциональное выражение
```
let greet2 = function(name: string) {
 return 'hello ' + name
}
```

выражение стрелочкой функции
```
let greet3 = (name: string) => {
 return 'hello ' + name
}
```

сокращенное выражение стрелочной функции
```
let greet4 = (name: string) =>
 'hello ' + name
```

конструктор функции
```
let greet5 = new Function('name', 'return "hello " + name')
```

### Методы call, apply и bind

```
function add(a: number, b: number): number {
 return a + b
}
add(10, 20) // вычисляется как 30
add.apply(null, [10, 20]) // вычисляется как 30
add.call(null, 10, 20) // вычисляется как 30
add.bind(null, 10, 20)() // вычисляется как 30
```

метод apply привязывал значение к this внутри функции (в этом примере мы привязываем к this null) и вторым аргументом объединяет параметры функции. 

метод call делает то же самое, но применяет все аргументы по порядку вместо объединения.

Метод bind схож с ними в том, что привязывает к функции аргумент this и список аргументов. Разница в том, что вместо вызова старой функции bind возвращает новую, которую затем вы можете вызвать с (), .call или .apply, передавая ей при желании больше аргументов для привязки к свободным параметрам.


решение проблемы с this:
```
nction fancyDate(this: Date) {
 return `${this.getDate()}/${this.getMonth()}/${this.getFullYear()}`
}
Вот что происходит теперь при вызове fancyDate:
fancyDate.call(new Date) // выводится как "6/13/2008"
fancyDate() // Ошибка TS2684: контекст 'this'
 // типа 'void' не может быть присвоен
// this метода, имеющему тип 'Date'.
```

## функции-генераторы

ленивые генераторы вычисляют следующее значение, только когда пользователь об этом просит. генераторы способны делать то, что иным способом сделать весьма трудно, например генерерируют бесконечные списки

```
function* createFibonacciGenerator() { ❶
 let a = 0
 let b = 1
 while (true) { ❷
 yield a; ❸
 [a, b] = [b, a + b] ❹
 }
}
let fibonacciGenerator = createFibonacciGenerator()
// IterableIterator<number>
fibonacciGenerator.next() // вычисляется как {значение: 0,
 // выполнено: false}
fibonacciGenerator.next() // вычисляется как {значение: 1,
 // выполнено: false}
fibonacciGenerator.next() // вычисляется как {значение: 1,
 // выполнено: false}
fibonacciGenerator.next() // вычисляется как {значение: 2,
 // выполнено: false}
fibonacciGenerator.next() // вычисляется как {значение: 3,
 // выполнено: false}
fibonacciGenerator.next() // вычисляется как {значение: 5,
 // выполнено: false}
```

## Итераторы

итераторы являются обратной стороной генераторов. если генераторы - это способ производить поток значений, то итераторы отвечают за потребление этих значений.

Итерируемый - любой объект, содержающий свойство Symbol.iterable, чье значение является функцией, возвращающей итератор

Итератор - любой объект, которые определяет метод next, возвращающий объект со свойствами value и done

```
let numbers = {
 *[Symbol.iterator]() {
 for (let n = 1; n <= 10; n++) {
 yield n
 }
 }
}
```

```
// Производить итерирование по итератору с помощью for-of
for (let a of numbers) {
// 1, 2, 3 и т.д.
}
// Распространить итератор
let allNumbers = [...numbers] // number[]
// Деструктурировать итератор
let [one, two, ...rest] = numbers // [number, number, number[]]
```

## Сигнарутры вызовов

перегруженная функция - функция с несколькими сигнатурами вызовов


## Полиморфизм

конкретный тип - boolean, string, Date[], {a : number} | { b: string }, (numbers : number[]) => number

Параметр обобщенного типа - замещающий тип, используемый для применения ограничений на уровне типов в нескольких местах. Также известен как параметр полиморфного типа

```
type Filter = {
 <T>(array: T[], f: (item: T) => boolean): T[]
}
```

«Функция filter использует параметр обобщенного типа T. Мы не знаем, каким будет этот тип в дальнейшем, поэтому, TypeScript, если ты сможешь делать его вывод при каждом вызове filter, то будет очень хорошо»

```
type Filter = {
 <T>(array: T[], f: (item: T) => boolean): T[]
}

let filter: Filter = (array, f) => // ...

// (a) T привязан к number
filter([1, 2, 3], _ => _ > 2)

// (b) T привязан к строке
filter(['a', 'b'], _ => _ !== 'b')

// (c) T привязан к {firstName: string}
let names = [
 {firstName: 'beth'},
 {firstName: 'caitlyn'},
 {firstName: 'xin'}
]
filter(names, _ => _.firstName.startsWith('b'))
```

Мы объявили <T> как часть сигнатуры вызова (перед открывающимися
скобками), и TypeScript привяжет конкретный тип к T, когда мы вызовем функцию типа Filter.
Если бы мы вместо этого ограничили диапазон T псевдонимом типа Filter, TypeScript потребовал бы от нас при использовании Filter привязать тип явно:

```
type Filter<T> = {
 (array: T[], f: (item: T) => boolean): T[]
}
let filter: Filter = (array, f) => // Ошибка TS2314: обобщенный тип
 // ... // 'Filter' требует 1 аргумент типа.
type OtherFilter = Filter // Ошибка TS2314: условный тип
 // 'Filter' требует 1 аргумент типа.
let filter: Filter<number> = (array, f) =>
 // ...
type StringFilter = Filter<string>
let stringFilter: StringFilter = (array, f) =>
 // ...
```

### Ограниченный полиморфизм

```
type TreeNode = {
 value: string
}
type LeafNode = TreeNode & {
 isLeaf: true
}
type InnerNode = TreeNode & {
 children: [TreeNode] | [TreeNode, TreeNode]
}
```

```
function mapNode<T extends TreeNode>(
 node: T,
 f: (value: string) => string
): T {
 return {
 ...node,
 value: f(node.value)
 }
}
````

mapNode - функция, определяющая один параметр обобщенного типа - T. T имеет верхнюю границу в виде TreeNode. Это значит, что T - это либо TreeNode, либо подтип TreeNode

mapNode получает два параметра. Первы - это node типа T. Если мы передадим нечно не являющееся TreeNode - например, пустой объект, null или массив из нескольких TreeNode - исключение компляции. node должен быть либо TreeNode, либо подтипом TreeNode

mapNode возвращает значение типа T. Вспомните, что T может быть либо TreeNode, либо подтипом TreeNode.

```
type HasSides = {numberOfSides: number}
type SidesHaveLength = {sideLength: number}
function logPerimeter< ❶
 Shape extends HasSides & SidesHaveLength ❷
>(s: Shape): Shape { ❸
 console.log(s.numberOfSides * s.sideLength)
 return s
}
type Square = HasSides & SidesHaveLength
let square: Square = {numberOfSides: 4, sideLength: 3}
logPerimeter(square) // Square, logs "12
```

# Разработка на основе типов

Стиль программирования, где сначала прописываются сигнатуры типов, а значение подставляются позже.