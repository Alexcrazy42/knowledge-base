# Полное руководство по JOIN и APPLY в MS SQL Server

Все типы соединений с примерами (без зависимостей от таблиц БД)

---

## ОГЛАВЛЕНИЕ
1. [Базовые JOIN (повторение)](#1-базовые-join-повторение)
2. [FULL OUTER JOIN](#2-full-outer-join)
3. [CROSS JOIN](#3-cross-join)
4. [SELF JOIN](#4-self-join)
5. [CROSS APPLY](#5-cross-apply)
6. [OUTER APPLY](#6-outer-apply)
7. [UNION, INTERSECT, EXCEPT](#7-union-intersect-except)
8. [Шпаргалка по производительности](#8-шпаргалка-по-производительности)

---

## 1. БАЗОВЫЕ JOIN (ПОВТОРЕНИЕ)

Для полноты картины начнём с того, что вы уже знаете.

### **INNER JOIN** — только совпадающие записи

```sql
-- Только те заказы, у которых есть клиент
SELECT *
FROM (VALUES (1, 'Alice'), (2, 'Bob'), (3, 'Charlie')) AS clients(id, name)
INNER JOIN (VALUES (1, 100), (1, 200), (2, 150)) AS orders(client_id, amount)
    ON clients.id = orders.client_id;
-- Результат: Alice (2 заказа), Bob (1 заказ), Charlie (0 заказов — не попал)
```

### **LEFT JOIN** — все записи из левой таблицы

```sql
-- Все клиенты, даже без заказов
SELECT *
FROM (VALUES (1, 'Alice'), (2, 'Bob'), (3, 'Charlie')) AS clients(id, name)
LEFT JOIN (VALUES (1, 100), (1, 200), (2, 150)) AS orders(client_id, amount)
    ON clients.id = orders.client_id;
-- Результат: Charlie с NULL в полях заказа
```

### **RIGHT JOIN** — все записи из правой таблицы

```sql
-- Все заказы, даже если клиент удалён
SELECT *
FROM (VALUES (1, 'Alice'), (2, 'Bob')) AS clients(id, name)
RIGHT JOIN (VALUES (1, 100), (1, 200), (3, 300)) AS orders(client_id, amount)
    ON clients.id = orders.client_id;
-- Результат: Заказ с client_id=3 (нет клиента) → NULL для полей клиента
```

---

## 2. FULL OUTER JOIN

**FULL OUTER JOIN** возвращает:
- все совпадающие записи (как INNER)
- все записи из левой таблицы, которым нет соответствия (как LEFT)
- все записи из правой таблицы, которым нет соответствия (как RIGHT)

```sql
-- Синтаксис: FROM таблица1 FULL OUTER JOIN таблица2 ON условие

-- Пример: полный список клиентов и заказов
SELECT 
    COALESCE(c.id, o.client_id) AS id,
    c.name,
    o.amount,
    CASE 
        WHEN c.id IS NULL THEN 'Orphan order (no client)'
        WHEN o.client_id IS NULL THEN 'Client without orders'
        ELSE 'Has orders'
    END AS status
FROM (VALUES (1, 'Alice'), (2, 'Bob'), (3, 'Charlie')) AS c(id, name)
FULL OUTER JOIN (VALUES (1, 100), (1, 200), (2, 150), (4, 400)) AS o(client_id, amount)
    ON c.id = o.client_id;

-- Результат:
-- id | name    | amount | status
-- 1  | Alice   | 100    | Has orders
-- 1  | Alice   | 200    | Has orders
-- 2  | Bob     | 150    | Has orders
-- 3  | Charlie | NULL   | Client without orders
-- 4  | NULL    | 400    | Orphan order (no client)
```

### **FULL OUTER JOIN с фильтрацией (аналог двух LEFT JOIN)**

```sql
-- Найти расхождения между двумя таблицами
SELECT 
    ISNULL(t1.id, t2.id) AS id,
    CASE 
        WHEN t1.id IS NULL THEN 'Only in table2'
        WHEN t2.id IS NULL THEN 'Only in table1'
        ELSE 'In both'
    END AS difference
FROM (VALUES (1), (2), (3)) AS t1(id)
FULL OUTER JOIN (VALUES (1), (3), (4)) AS t2(id) ON t1.id = t2.id
WHERE t1.id IS NULL OR t2.id IS NULL;

-- Результат:
-- id | difference
-- 2  | Only in table1
-- 4  | Only in table2
```

---

## 3. CROSS JOIN

**CROSS JOIN** (декартово произведение) — соединяет КАЖДУЮ строку левой таблицы с КАЖДОЙ строкой правой.

**Результат:** `N строк × M строк = N*M строк`

```sql
-- Синтаксис: FROM таблица1 CROSS JOIN таблица2
-- Или: FROM таблица1, таблица2

-- Базовый пример
SELECT *
FROM (VALUES ('Red'), ('Blue'), ('Green')) AS colors(color)
CROSS JOIN (VALUES ('S'), ('M'), ('L')) AS sizes(size);
-- Результат: 3 цвета × 3 размера = 9 строк
-- Red-S, Red-M, Red-L, Blue-S, Blue-M, Blue-L, Green-S, Green-M, Green-L

-- Практический пример: генерация всех дат месяца
SELECT 
    d.date,
    t.hour
FROM (
    SELECT DATEADD(DAY, n, '2024-03-01') AS date
    FROM (VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8),(9)) AS numbers(n)
) AS d(date)
CROSS JOIN (VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15),(16),(17),(18),(19),(20),(21),(22),(23)) AS t(hour)
WHERE d.date <= '2024-03-31';
-- Результат: 31 день × 24 часа = 744 строки

-- CROSS JOIN для создания тестовых данных
SELECT 
    'Product_' + CAST(p.id AS VARCHAR) AS product,
    'Store_' + CAST(s.id AS VARCHAR) AS store,
    ABS(CHECKSUM(NEWID())) % 10000 AS price
FROM (VALUES (1),(2),(3),(4),(5)) AS p(id)
CROSS JOIN (VALUES (1),(2),(3)) AS s(id);
-- Результат: 5 продуктов × 3 магазина = 15 комбинаций
```

---

## 4. SELF JOIN

**SELF JOIN** — соединение таблицы с самой собой. Используется для иерархических данных (сотрудник-начальник, категории и подкатегории).

```sql
-- Синтаксис: FROM таблица t1 JOIN таблица t2 ON условие

-- Пример: иерархия сотрудников
WITH employees AS (
    SELECT * FROM (VALUES 
        (1, 'Alice', NULL),      -- генеральный директор
        (2, 'Bob', 1),           -- подчиняется Alice
        (3, 'Charlie', 1),       -- подчиняется Alice
        (4, 'Diana', 2),         -- подчиняется Bob
        (5, 'Eve', 2)            -- подчиняется Bob
    ) AS t(emp_id, emp_name, manager_id)
)
SELECT 
    e.emp_name AS employee,
    m.emp_name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.emp_id
ORDER BY e.emp_id;

-- Результат:
-- employee | manager
-- Alice    | NULL (нет начальника)
-- Bob      | Alice
-- Charlie  | Alice
-- Diana    | Bob
-- Eve      | Bob

-- Пример: поиск дубликатов
WITH data AS (
    SELECT * FROM (VALUES 
        (1, 'user@example.com'),
        (2, 'user@example.com'),  -- дубликат
        (3, 'other@example.com'),
        (4, 'test@example.com'),
        (5, 'other@example.com')  -- дубликат
    ) AS t(id, email)
)
SELECT 
    d1.id AS id1,
    d2.id AS id2,
    d1.email
FROM data d1
INNER JOIN data d2 ON d1.email = d2.email AND d1.id < d2.id;

-- Результат: пары дубликатов
-- id1 | id2 | email
-- 1   | 2   | user@example.com
-- 3   | 5   | other@example.com

-- Пример: поиск пар связанных записей (друзья)
WITH friends AS (
    SELECT * FROM (VALUES 
        (1, 2), (2, 1),  -- Alice и Bob друзья
        (1, 3), (3, 1),  -- Alice и Charlie друзья
        (2, 4), (4, 2)   -- Bob и Diana друзья
    ) AS t(user_id, friend_id)
)
SELECT 
    u1.user_id AS user1,
    u2.user_id AS user2
FROM (SELECT DISTINCT user_id FROM friends) u1
CROSS JOIN (SELECT DISTINCT user_id FROM friends) u2
WHERE u1.user_id < u2.user_id
    AND EXISTS (
        SELECT 1 FROM friends f1 
        WHERE f1.user_id = u1.user_id AND f1.friend_id = u2.user_id
    )
    AND EXISTS (
        SELECT 1 FROM friends f2
        WHERE f2.user_id = u2.user_id AND f2.friend_id = u1.user_id
    );
-- Результат: пары взаимных друзей
```

---

## 5. CROSS APPLY

**CROSS APPLY** — как `CROSS JOIN`, но правой частью может быть **табличная функция** или **подзапрос, который ссылается на левую таблицу**.

Ключевое отличие от `JOIN`: в правой части можно использовать столбцы из левой таблицы **в реальном времени**.

```sql
-- Синтаксис: FROM таблица1 CROSS APPLY (подзапрос/функция) AS alias

-- Базовый пример (поведение как INNER JOIN)
SELECT *
FROM (VALUES (1, 'Alice'), (2, 'Bob'), (3, 'Charlie')) AS clients(id, name)
CROSS APPLY (
    SELECT * FROM (VALUES 
        (1, 100, '2024-01-01'),
        (1, 200, '2024-01-15'),
        (2, 150, '2024-01-10')
    ) AS o(client_id, amount, date)
    WHERE o.client_id = clients.id
) AS orders;

-- Результат: как INNER JOIN

-- Главная сила CROSS APPLY: TOP N для каждой группы
SELECT *
FROM (VALUES (1, 'Alice'), (2, 'Bob'), (3, 'Charlie')) AS clients(id, name)
CROSS APPLY (
    SELECT TOP 2 * FROM (VALUES 
        (1, 100, '2024-01-01'),
        (1, 200, '2024-01-15'),
        (1, 50, '2024-01-20'),
        (2, 150, '2024-01-10'),
        (2, 300, '2024-01-20'),
        (3, 500, '2024-01-05')
    ) AS o(client_id, amount, date)
    WHERE o.client_id = clients.id
    ORDER BY amount DESC
) AS top_orders;

-- Результат: для каждого клиента ТОП-2 заказа
-- Alice: 200, 100
-- Bob: 300, 150
-- Charlie: 500 (только один заказ)

-- CROSS APPLY с табличной функцией (эмуляция)
-- Пример: последний символ строки как "функция"
SELECT 
    name,
    ca.last_char
FROM (VALUES ('Alice'), ('Bob'), ('Charlie')) AS t(name)
CROSS APPLY (
    SELECT RIGHT(name, 1) AS last_char
) AS ca;
-- Результат: 'e', 'b', 'e'

-- CROSS APPLY для разбора строк (эмуляция STRING_SPLIT)
SELECT 
    t.id,
    s.value
FROM (VALUES (1, 'A,B,C'), (2, 'X,Y')) AS t(id, csv)
CROSS APPLY (
    SELECT value FROM (VALUES 
        (SUBSTRING(t.csv, 1, 1)),
        (SUBSTRING(t.csv, 3, 1)),
        (SUBSTRING(t.csv, 5, 1))
    ) AS s(value)
    WHERE value <> ''
) AS s;
-- Результат: разбивка CSV на элементы
```

---

## 6. OUTER APPLY

**OUTER APPLY** — как `CROSS APPLY`, но сохраняет строки левой таблицы, даже если правая часть не вернула строк (аналог `LEFT JOIN`).

```sql
-- Синтаксис: FROM таблица1 OUTER APPLY (подзапрос/функция) AS alias

-- Клиенты без заказов тоже попадут в результат
SELECT *
FROM (VALUES (1, 'Alice'), (2, 'Bob'), (3, 'Charlie')) AS clients(id, name)
OUTER APPLY (
    SELECT TOP 2 * FROM (VALUES 
        (1, 100), (1, 200), (2, 150)
    ) AS o(client_id, amount)
    WHERE o.client_id = clients.id
    ORDER BY amount DESC
) AS top_orders;

-- Результат:
-- Alice: 2 заказа
-- Bob: 1 заказ
-- Charlie: NULL в полях заказа (но строка осталась!)

-- OUTER APPLY для поиска первого вхождения
SELECT *
FROM (VALUES (1, 'Hello World'), (2, 'No match here'), (3, 'Good World')) AS t(id, text)
OUTER APPLY (
    SELECT 
        CHARINDEX('World', t.text) AS position,
        SUBSTRING(t.text, CHARINDEX('World', t.text), 5) AS found
    WHERE CHARINDEX('World', t.text) > 0
) AS ca;
-- Результат:
-- id=1: position=7, found='World'
-- id=2: NULL (нет World)
-- id=3: position=6, found='World'

-- CROSS APPLY vs OUTER APPLY
-- CROSS APPLY: только те, у кого есть данные в правой части
-- OUTER APPLY: все, с NULL если нет данных
```

---

## 7. UNION, INTERSECT, EXCEPT

Это не `JOIN`, но часто используется вместе с ними для комбинирования результатов.

### **UNION** — объединение без дубликатов
```sql
SELECT * FROM (VALUES (1), (2), (3)) AS t1(n)
UNION
SELECT * FROM (VALUES (2), (3), (4)) AS t2(n);
-- Результат: 1,2,3,4

-- UNION ALL — с дубликатами
SELECT * FROM (VALUES (1), (2), (3)) AS t1(n)
UNION ALL
SELECT * FROM (VALUES (2), (3), (4)) AS t2(n);
-- Результат: 1,2,3,2,3,4
```

### **INTERSECT** — только общие записи
```sql
SELECT * FROM (VALUES (1), (2), (3)) AS t1(n)
INTERSECT
SELECT * FROM (VALUES (2), (3), (4)) AS t2(n);
-- Результат: 2,3
```

### **EXCEPT** — записи из первого, которых нет во втором
```sql
SELECT * FROM (VALUES (1), (2), (3)) AS t1(n)
EXCEPT
SELECT * FROM (VALUES (2), (3), (4)) AS t2(n);
-- Результат: 1
```

---

## 8. ШПАРГАЛКА ПО ПРОИЗВОДИТЕЛЬНОСТИ

| Тип соединения | Когда использовать | Когда НЕ использовать |
|----------------|-------------------|----------------------|
| **INNER JOIN** | Всегда, когда нужны только совпадающие записи | Когда важны строки даже без совпадений |
| **LEFT / RIGHT** | Когда нужно сохранить все строки из основной таблицы | На больших таблицах без индекса (деградация) |
| **FULL JOIN** | Для поиска расхождений, слияния двух источников | В ежедневных запросах (обычно избыточен) |
| **CROSS JOIN** | Генерация тестовых данных, комбинаторика | На больших таблицах (N×M может быть огромным) |
| **SELF JOIN** | Иерархии, дубликаты, сравнение строк внутри таблицы | Когда можно обойтись оконными функциями |
| **CROSS APPLY** | TOP N на группу, вызов функций для каждой строки | Для простых связей (обычный JOIN быстрее) |
| **OUTER APPLY** | TOP N с сохранением всех строк | Аналогично CROSS APPLY |

---

## ПОЛНЫЙ ПРИМЕР С ИСПОЛЬЗОВАНИЕМ РАЗНЫХ JOIN

```sql
-- Сценарий: интернет-магазин
WITH 
-- Данные
customers AS (
    SELECT * FROM (VALUES 
        (1, 'Alice', 'alice@email.com'),
        (2, 'Bob', 'bob@email.com'),
        (3, 'Charlie', 'charlie@email.com'),
        (4, 'Diana', 'diana@email.com')
    ) AS t(id, name, email)
),
orders AS (
    SELECT * FROM (VALUES 
        (101, 1, '2024-01-15', 150),
        (102, 1, '2024-02-20', 200),
        (103, 2, '2024-01-10', 300),
        (104, 3, '2024-03-01', 100),
        (105, 99, '2024-01-01', 500)  -- заказ без клиента
    ) AS t(order_id, customer_id, order_date, amount)
),
order_items AS (
    SELECT * FROM (VALUES 
        (101, 'Laptop', 1, 150),
        (102, 'Mouse', 2, 100),
        (102, 'Keyboard', 1, 100),
        (103, 'Monitor', 1, 300),
        (106, 'Tablet', 1, 400)  -- товар без заказа
    ) AS t(order_id, product, quantity, price)
)

-- Аналитический запрос
SELECT 
    c.name,
    c.email,
    o.order_id,
    o.order_date,
    o.amount AS order_total,
    COALESCE(items.product_count, 0) AS products_in_order,
    COALESCE(items.total_items, 0) AS total_quantity,
    CASE 
        WHEN o.order_id IS NULL THEN 'Customer without orders'
        WHEN c.id IS NULL THEN 'Orphan order'
        ELSE 'Normal'
    END AS status
FROM customers c
FULL OUTER JOIN orders o ON c.id = o.customer_id
OUTER APPLY (
    SELECT 
        COUNT(DISTINCT product) AS product_count,
        SUM(quantity) AS total_items
    FROM order_items oi
    WHERE oi.order_id = o.order_id
) AS items
ORDER BY c.name, o.order_date;
```

---

## ЗАМЕТКИ ДЛЯ ИЗУЧАЮЩИХ

1. **CROSS JOIN опасен:** Всегда проверяйте размер таблиц перед использованием.
2. **APPLY мощный, но нишевый:** Используйте для `TOP N` на группу и когда правой частью является функция.
3. **FULL JOIN часто дорогой:** План выполнения обычно содержит сортировку или хеш-соединение.
4. **SELF JOIN требует алиасов:** Всегда давайте разные алиасы одной таблице.
5. **UNION требует одинаковую структуру:** Количество и типы колонок должны совпадать.