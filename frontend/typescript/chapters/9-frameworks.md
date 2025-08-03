# Глава 9. Фронтенд и бэкенд фреймворки

## Фронтенд фреймворки

```
{
 "compilerOptions": {
 "lib": ["dom", "es2015"]
 }
}
```
Это побудит TS добавить при проверке типов встроенные декларации типов браузера и DOM - lib.dom.d.ts

### React

Компоненты, которые определяются и потребляются в TS, поэтому и определения компнентов, и их потребители проходят проверку типов.

#### Праймер JSX

При использовании React вы определяете представления с помощью специального DSL, который называется JavaScript XML (JSX) и внешне не очень напоминает HTML. Вы внедряете его прямо в код JS, а затем пропускаете код через компилятор JSX, который переписывает вложенный синтаксис в регулярные вызовы функций JS.


```jsx
<ul class='list'>
 <li>Homemade granola with yogurt</li>
 <li>Fantastic french toast with fruit</li>
 <li>Tortilla Española with salad</li>
</ul>
```

После обработки этого кода компилятором JSX вроде плагина Babel transform-react-jsx вы получаете следующий вывод:

```
React.createElement(
 'ul',
 {'class': 'list'},
 React.createElement(
 'li',
 null,
 'Homemade granola with yogurt'
 ),
 React.createElement(
 'li',
 null,
 'Fantastic French toast with fruit'
 ),
 React.createElement( 'li',
 null,
 'Tortilla Española with salad'
 )
);
```

Приятная особенность JSX в том, что вы можете писать код, во многом схожий с обычным HTML, а затем автоматически компилировать его в дружественный для движка JS формат. Будучи инженером, вы используете только знакомый высокоуровнеый описательный DSL без необходимости связываться с деталями реализации.

Не обязательно иметь JSX для работы с React (вы можете писать скомпилированный код непосредственно, и он будет работать). Также можно использовать JSX без React (специфичный вызов функции, в который компилируются теги JSX — React.createElement — можно настроить).

Но сочетание React и JSX просто магическое. Оно позволяет прописывать уровни представления не только безопасно, но и с удовольствием.

TSX = JSX + TypeScript

TSX для JSX — это то же, что и TypeScript для JavaScript, — безопасность в процессе компиляции и вспомогательный уровень, позволяющий повысить производительность и создать код с меньшим числом ошибок. Для включения поддержки TSX в проекте добавьте следующую строку в файл tsconfig.json:

```
{
 "compilerOptions": {
 "jsx": "react"
 }
}
```

В начинке TypeScript предусмотрено несколько перехватчиков для типизации TSX подключаемым способом. Ими являются особые типы в пространстве имен global.JSX, куда TS обращается за данными о типах TSX во всей программе. Если вы используете только React, то вам не нужно опускаться на этот уровень. Но если вы создаете собственную библиотеку TS, которая применяет TSX (и не используете React), или вам любопытно узнать, как это делают декларации типов React - *приложение Ж*.



# Примечания

## JSX не является частью React
JSX обрабатывается отдельный инструментом (обычно Babel или TypeScript)

Исходный код:
```
const element = <div className="greeting">Hello!</div>;
```

После транспиляции (Babel):
```
const element = React.createElement(
  "div",
  { className: "greeting" },
  "Hello!"
);
```

JSX превратился в вызов React.creteElement(), который:
1. создает виртуальный DOM-объект
2. описывает тип элемента div, пропсы ({className: "greeting" }) и дочерние элементы ("Hello")

## У JSX и React разные зоны ответственности:

JSX:
1. Синтаксис для удобного описания UI
2. Транспилируется в react.createElement()
3. может использовать без React (но редко)

React:
1. Библиотека для управления виртуальным DOM и состоянием
2. Обрабатывает результат createElement, строит VDOM, рендерит в DOM
3. Может работать без JSX (но менее удобно)

## React не сам интегрируется с JSX. Ему помогает транспилятор.

Когда ты пишешь:

```
function Component() {
  return <button onClick={() => alert("Clicked!")}>Click me</button>;
}
```

После транспиляции:
```
function Component() {
  return React.createElement(
    "button",
    { onClick: () => alert("Clicked!") },
    "Click me"
  );
}
```

Далее React сам занимается VDOM и обновлением DOM

## JSX и хуки

JSX ничего не знает о хуках (useState, useEffect) - они являются частью React

```
function Counter() {
  const [count, setCount] = React.useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

После транспиляции:
```
function Counter() {
  const [count, setCount] = React.useState(0);

  return React.createElement(
    "div",
    null,
    React.createElement("p", null, "Count: ", count),
    React.createElement(
      "button",
      { onClick: () => setCount(count + 1) },
      "Increment"
    )
  );
}
```

### Вывод

JSX - синтаксический сахар для React.createElement() или аналогов в других фреймворках

React - библиотека, которая:
1. принимает результата createElement
2. управляет состоянием (хуки)
3. обновляет DOM эффективно (рекосиляция)

JSX и React разделены, но обычно используются вместе, потому что:
1. JSX делает код удобнее
2. React дает мощную инфру для работы с VDOM

