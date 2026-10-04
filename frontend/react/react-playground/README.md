# React-Playgroun

## Шпаргалка

1. Debounce
2. IntersectionObserver
3. useLocalStorage
4. Throttle
5. useTransition
6. use
7. React Compiler

## React.memo, useMemo, useCallback

React.memo — Higher Order Component (HOC), который пропускает рендер, если props не изменились (shallow comparison).

Оба хука решают одну и ту же проблему - предотвращение ререндера за счет кеширования значений/функций между рендерами

useMemo - кеширует значения. "Запомни результат вычислений, если deps не изменились"

```jsx
// ❌ Без useMemo (каждый рендер!)
function ExpensiveList({ items }) {
  const sortedItems = items  // ← Сортировка 1000 элементов каждый раз!
    .filter(item => item.active)
    .sort((a, b) => a.name.localeCompare(b.name));
  
  return <ul>{sortedItems.map(...)}</ul>;
}

// ✅ С useMemo (1 раз при изменении items!)
function ExpensiveList({ items }) {
  const sortedItems = useMemo(() => 
    items.filter(item => item.active)
         .sort((a, b) => a.name.localeCompare(b.name)),
    [items]  // deps: пересчитать при изменении items
  );
  
  return <ul>{sortedItems.map(...)}</ul>;
}
```

Когда использовать:

- Сортировка/фильтрация больших массивов
- Вычисления (сумма, статистика)
- Объекты/массивы как props для memo компонентов

useCallback - кеширует функции. "Запомни функцию, чтобы дочерние memo-компоненты не рендерились"

```jsx
// ❌ Без useCallback (новая функция каждый рендер!)
function Parent() {
  const [count, setCount] = useState(0);
  
  const handleClick = () => {  // ← Новая функция каждый раз!
    analytics.track('click');
  };
  
  return (
    <Child onClick={handleClick} />  // Child ререндерится!
  );
}

const Child = memo(({ onClick }) => {
  console.log('Child render');  // Лог каждый рендер Parent!
  return <button onClick={onClick}>Click</button>;
});

// ✅ С useCallback
function Parent() {
  const [count, setCount] = useState(0);
  
  const handleClick = useCallback(() => {
    analytics.track('click');
  }, []);  // deps пустые = функция создаётся 1 раз
  
  return <Child onClick={handleClick} />;  // Child НЕ ререндерится!
}
```

Когда использовать:

- Callbacks для memo компонентов (onClick, onChange)
- Функции в useEffect deps
- Event handlers в списках