# Условные функции и работа с NULL в MS SQL Server

Полное руководство со встроенными примерами

---

## ОГЛАВЛЕНИЕ
1. [CASE — условное выражение](#1-case--условное-выражение)
2. [COALESCE — первое не-NULL значение](#2-coalesce--первое-не-null-значение)
3. [NULLIF — вернуть NULL если равны](#3-nullif--вернуть-null-если-равны)
4. [ISNULL — замена NULL (SQL Server)](#4-isnull--замена-null-sql-server)
5. [IIF — тернарный оператор](#5-iif--тернарный-оператор)
6. [CHOOSE — выбор по индексу](#6-choose--выбор-по-индексу)
7. [GREATEST / LEAST — максимум/минимум из списка](#7-greatest--least--максимум-минимум-из-списка)
8. [Шпаргалка для миграции](#8-шпаргалка-для-миграции-с-других-субд)

---

## 1. CASE — условное выражение

`CASE` — самый мощный условный оператор в SQL. Существует в двух формах: **простой** и **поисковый**.

### **Простой CASE (сравнение с одним выражением)**

```sql
-- Синтаксис:
-- CASE выражение
--     WHEN значение1 THEN результат1
--     WHEN значение2 THEN результат2
--     ELSE результат_по_умолчанию
-- END

-- Пример с оценками
SELECT 
    CASE 3
        WHEN 1 THEN 'One'
        WHEN 2 THEN 'Two'
        WHEN 3 THEN 'Three'
        WHEN 4 THEN 'Four'
        ELSE 'Unknown'
    END AS number_to_word;
-- Результат: 'Three'

-- Пример с категориями товаров
SELECT 
    CASE 'B'
        WHEN 'A' THEN 'Premium'
        WHEN 'B' THEN 'Standard'
        WHEN 'C' THEN 'Budget'
        ELSE 'Unknown category'
    END AS product_category;
-- Результат: 'Standard'
```

### **Поисковый CASE (с произвольными условиями)**

```sql
-- Синтаксис:
-- CASE
--     WHEN условие1 THEN результат1
--     WHEN условие2 THEN результат2
--     ELSE результат_по_умолчанию
-- END

-- Пример с числовым диапазоном
SELECT 
    CASE
        WHEN 85 >= 90 THEN 'A'
        WHEN 85 >= 80 THEN 'B'
        WHEN 85 >= 70 THEN 'C'
        WHEN 85 >= 60 THEN 'D'
        ELSE 'F'
    END AS grade;
-- Результат: 'B'

-- Пример с несколькими условиями
SELECT 
    CASE
        WHEN 10 > 0 AND 10 < 10 THEN 'Between 0 and 10'
        WHEN 10 >= 10 AND 10 < 20 THEN 'Between 10 and 20'
        WHEN 10 >= 20 THEN '20 or more'
        ELSE 'Negative or zero'
    END AS range_check;
-- Результат: 'Between 10 and 20'

-- Пример с LIKE и строками
SELECT 
    CASE
        WHEN 'Hello World' LIKE '%World%' THEN 'Contains World'
        WHEN 'Hello World' LIKE '%Hello%' THEN 'Contains Hello'
        ELSE 'No match'
    END AS string_check;
-- Результат: 'Contains World'
```

### **Сравнение двух форм CASE**

```sql
-- Простой CASE (лаконичен для равенства)
SELECT 
    CASE status_code
        WHEN 1 THEN 'Active'
        WHEN 2 THEN 'Inactive'
        WHEN 3 THEN 'Pending'
        ELSE 'Unknown'
    END AS status;

-- Поисковый CASE (гибче для сложных условий)
SELECT 
    CASE
        WHEN status_code = 1 AND is_deleted = 0 THEN 'Active'
        WHEN status_code = 1 AND is_deleted = 1 THEN 'Deleted (was active)'
        WHEN status_code IN (2, 3) THEN 'Inactive or pending'
        ELSE 'Unknown'
    END AS detailed_status;
```

### **CASE в разных частях запроса**

```sql
-- В SELECT (проекция)
SELECT 
    amount,
    CASE WHEN amount > 1000 THEN 'High' ELSE 'Low' END AS category
FROM (VALUES (500), (1500), (800)) AS t(amount);

-- В ORDER BY (сортировка)
SELECT name, priority
FROM (VALUES ('Task A', 3), ('Task B', 1), ('Task C', 2)) AS t(name, priority)
ORDER BY 
    CASE priority
        WHEN 1 THEN 1
        WHEN 2 THEN 2
        WHEN 3 THEN 3
        ELSE 4
    END;

-- В GROUP BY (группировка по вычисляемому полю)
SELECT 
    CASE 
        WHEN amount < 100 THEN 'Small'
        WHEN amount < 1000 THEN 'Medium'
        ELSE 'Large'
    END AS size_category,
    COUNT(*) AS count
FROM (VALUES (50), (200), (5000)) AS t(amount)
GROUP BY 
    CASE 
        WHEN amount < 100 THEN 'Small'
        WHEN amount < 1000 THEN 'Medium'
        ELSE 'Large'
    END;

-- В HAVING (фильтрация групп)
SELECT 
    category_id,
    AVG(amount) AS avg_amount
FROM (VALUES (1, 100), (1, 200), (2, 1000), (2, 2000)) AS t(category_id, amount)
GROUP BY category_id
HAVING AVG(CASE WHEN amount > 500 THEN amount ELSE NULL END) > 1000;
```

### **Вложенный CASE**

```sql
-- CASE внутри CASE
SELECT 
    CASE
        WHEN score >= 80 THEN
            CASE
                WHEN score >= 95 THEN 'A+'
                WHEN score >= 90 THEN 'A'
                ELSE 'A-'
            END
        WHEN score >= 70 THEN 'B'
        WHEN score >= 60 THEN 'C'
        ELSE 'F'
    END AS final_grade,
    score
FROM (VALUES (98), (85), (75), (62), (45)) AS t(score);

-- Результат:
-- 98 → 'A+'
-- 85 → 'A-'
-- 75 → 'B'
-- 62 → 'C'
-- 45 → 'F'
```

---

## 2. COALESCE — первое не-NULL значение

`COALESCE` возвращает первый аргумент, который не равен `NULL`.

```sql
-- Синтаксис: COALESCE(значение1, значение2, ..., значениеN)

-- Базовый пример
SELECT 
    COALESCE(NULL, NULL, 'First non-null', 'Ignored') AS first_value;
-- Результат: 'First non-null'

-- С числами
SELECT 
    COALESCE(NULL, 42, 100) AS number;
-- Результат: 42

-- COALESCE с разными типами (должны быть совместимы)
SELECT 
    COALESCE(NULL, 'Default text', 123) AS result;
-- Ошибка! Несовместимые типы данных

-- Практический пример: заполнение пропусков
SELECT 
    COALESCE(phone, mobile, work_phone, 'No phone') AS contact_phone
FROM (VALUES (NULL, '555-1234', NULL)) AS t(phone, mobile, work_phone);
-- Результат: '555-1234'

-- COALESCE с вычисляемыми значениями
SELECT 
    COALESCE(
        CASE WHEN 1 > 0 THEN NULL ELSE 'A' END,
        CASE WHEN 2 > 0 THEN 'B' ELSE NULL END,
        'Fallback'
    ) AS result;
-- Результат: 'B'
```

### **COALESCE vs ISNULL**

| Характеристика | COALESCE | ISNULL |
|----------------|----------|--------|
| Количество аргументов | 2+ | Ровно 2 |
| Тип результата | Наивысший среди аргументов | Тип первого аргумента |
| ANSI стандарт | ✅ Да | ❌ Нет (SQL Server специфичен) |

```sql
-- Разница в выводе типа
SELECT 
    ISNULL(NULL, 5) AS isnull_result,        -- INT
    COALESCE(NULL, 5) AS coalesce_result;    -- INT (ок, одинаково)

-- А вот здесь разница:
-- ISNULL использует тип первого аргумента
SELECT ISNULL(NULL, '123') AS string_or_number;  -- '123' (VARCHAR)

-- COALESCE выводит наивысший тип (int > varchar)
SELECT COALESCE(NULL, 123) AS number_or_string;   -- 123 (INT)
```

---

## 3. NULLIF — вернуть NULL если равны

`NULLIF` принимает два аргумента. Если они равны, возвращает `NULL`, иначе возвращает первый аргумент.

```sql
-- Синтаксис: NULLIF(выражение1, выражение2)

-- Базовый пример
SELECT 
    NULLIF(5, 5) AS equal_returns_null,     -- NULL
    NULLIF(5, 10) AS not_equal_returns_5;   -- 5

-- Защита от деления на ноль
SELECT 
    100 / NULLIF(0, 0) AS safe_division;
-- Результат: NULL (вместо ошибки деления на ноль)

-- Нахождение изменений
SELECT 
    old_value,
    new_value,
    NULLIF(new_value, old_value) AS changed_to
FROM (VALUES ('A', 'A'), ('A', 'B'), (10, 10), (10, 20)) AS t(old_value, new_value);
-- Результат:
-- 'A', 'A' → NULL (не изменилось)
-- 'A', 'B' → 'B' (изменилось)

-- Строковый пример
SELECT 
    NULLIF('Hello', 'World') AS not_equal,   -- 'Hello'
    NULLIF('Same', 'Same') AS equal;         -- NULL

-- Практический пример: флаг удаления
SELECT 
    is_deleted,
    NULLIF(is_deleted, 0) AS deleted_flag  -- 0 преобразуется в NULL
FROM (VALUES (0), (1), (0), (1)) AS t(is_deleted);
```

---

## 4. ISNULL — замена NULL (SQL Server)

`ISNULL` — функция SQL Server для замены `NULL` на указанное значение.

```sql
-- Синтаксис: ISNULL(проверяемое_выражение, значение_замены)

-- Базовый пример
SELECT 
    ISNULL(NULL, 'Default') AS replaced,   -- 'Default'
    ISNULL('Value', 'Default') AS original; -- 'Value'

-- С числами
SELECT 
    ISNULL(NULL, 100) AS number,           -- 100
    ISNULL(50, 100) AS original_number;    -- 50

-- С датами
SELECT 
    ISNULL(NULL, GETDATE()) AS current_date,  -- текущая дата
    ISNULL('2024-01-01', GETDATE()) AS fixed; -- '2024-01-01'

-- В агрегациях (NULL не считается в COUNT)
SELECT 
    COUNT(ISNULL(amount, 0)) AS all_rows_count
FROM (VALUES (100), (NULL), (200)) AS t(amount);
-- Результат: 3 (так как ISNULL заменяет NULL на 0)

-- В LEFT JOIN для замены отсутствующих значений
SELECT 
    t1.id,
    ISNULL(t2.value, 'No data') AS value_with_default
FROM (VALUES (1), (2), (3)) AS t1(id)
LEFT JOIN (VALUES (1, 'A'), (3, 'C')) AS t2(id, value) ON t1.id = t2.id;
```

---

## 5. IIF — тернарный оператор

`IIF` — сокращенная форма `CASE WHEN условие THEN true ELSE false END`.

```sql
-- Синтаксис: IIF(условие, значение_если_истина, значение_если_ложь)

-- Базовый пример
SELECT 
    IIF(5 > 3, 'Yes', 'No') AS result;  -- 'Yes'

-- Вложенные IIF (калькулятор оценок)
SELECT 
    score,
    IIF(score >= 90, 'A',
        IIF(score >= 80, 'B',
            IIF(score >= 70, 'C',
                IIF(score >= 60, 'D', 'F')))) AS grade
FROM (VALUES (95), (82), (74), (65), (45)) AS t(score);

-- Сравнение с CASE (IIF короче, но менее читаем при сложных условиях)
SELECT 
    IIF(amount > 1000, 'High', 'Low') AS simple,                    -- Просто
    CASE WHEN amount > 1000 THEN 'High' ELSE 'Low' END AS case_way; -- То же самое
FROM (VALUES (500), (1500)) AS t(amount);

-- Ограничение: IIF всегда вычисляет оба варианта (может быть проблема с делением на ноль)
SELECT 
    IIF(divider != 0, 100 / divider, 0) AS safe
FROM (VALUES (5), (0)) AS t(divider);
-- При divider = 0 все равно будет ошибка! (вычисляется 100/0)
```

---

## 6. CHOOSE — выбор по индексу

`CHOOSE` возвращает элемент из списка по указанному индексу.

```sql
-- Синтаксис: CHOOSE(индекс, значение1, значение2, ..., значениеN)

-- Базовый пример
SELECT 
    CHOOSE(2, 'First', 'Second', 'Third', 'Fourth') AS chosen;
-- Результат: 'Second'

-- Индекс вне диапазона → NULL
SELECT 
    CHOOSE(5, 'A', 'B', 'C') AS out_of_range;  -- NULL

-- С числовыми значениями
SELECT 
    CHOOSE(3, 10, 20, 30, 40) AS number;  -- 30

-- Практический пример: название дня недели
SELECT 
    DATEPART(WEEKDAY, '2024-03-15') AS weekday_num,
    CHOOSE(DATEPART(WEEKDAY, '2024-03-15'), 
           'Sunday', 'Monday', 'Tuesday', 'Wednesday', 
           'Thursday', 'Friday', 'Saturday') AS weekday_name;
-- Результат: weekday_num = 6? (зависит от SET DATEFIRST)

-- CHOOSE с CASE (аналог)
SELECT 
    CHOOSE(status_code, 'Active', 'Inactive', 'Pending') AS status1,
    CASE status_code
        WHEN 1 THEN 'Active'
        WHEN 2 THEN 'Inactive'
        WHEN 3 THEN 'Pending'
    END AS status2
FROM (VALUES (1), (2), (3)) AS t(status_code);
```

---

## 7. GREATEST / LEAST — максимум/минимум из списка

### **ВНИМАНИЕ: В MS SQL Server НЕТ встроенных GREATEST/LEAST!**

В SQL Server 2022+ появились `GREATEST` и `LEAST`, но **только для Azure SQL Database** и **SQL Server 2022** (не во всех редакциях). Для старых версий используйте обходные пути.

### **Способ 1: Встроенные функции (только SQL Server 2022+ / Azure)**

```sql
-- GREATEST — максимальное значение из списка
SELECT GREATEST(10, 20, 5, 30, 15) AS max_value;   -- 30

-- LEAST — минимальное значение из списка
SELECT LEAST(10, 20, 5, 30, 15) AS min_value;      -- 5

-- Работает с разными типами
SELECT GREATEST('Apple', 'Banana', 'Orange') AS max_string;  -- 'Orange'
SELECT LEAST('Apple', 'Banana', 'Orange') AS min_string;     -- 'Apple'

-- Смешанные типы (должны быть совместимы)
SELECT GREATEST(GETDATE(), '2025-01-01') AS latest_date;
```

### **Способ 2: Эмуляция для старых версий**

```sql
-- GREATEST через вложенный IIF или CASE
SELECT 
    -- Для 2 значений
    IIF(10 > 20, 10, 20) AS max_of_two,   -- 20
    
    -- Для 3+ значений через CASE
    CASE 
        WHEN 10 >= 20 AND 10 >= 30 THEN 10
        WHEN 20 >= 10 AND 20 >= 30 THEN 20
        ELSE 30
    END AS max_of_three;   -- 30

-- GREATEST через UNPIVOT (для большого количества значений)
WITH Numbers AS (
    SELECT n1 AS a, n2 AS b, n3 AS c, n4 AS d
    FROM (VALUES (10, 20, 30, 5)) AS t(n1, n2, n3, n4)
)
SELECT MAX(value) AS greatest FROM Numbers
UNPIVOT (value FOR col IN (a, b, c, d)) AS unpvt;
-- Результат: 30

-- GREATEST через VALUES (CROSS APPLY)
SELECT MAX(val) AS greatest
FROM (VALUES (10), (20), (30), (5)) AS t(val);
-- Результат: 30

-- Пользовательская функция для GREATEST
CREATE FUNCTION dbo.GREATEST(@a SQL_VARIANT, @b SQL_VARIANT, @c SQL_VARIANT = NULL, @d SQL_VARIANT = NULL)
RETURNS SQL_VARIANT
AS
BEGIN
    DECLARE @max SQL_VARIANT = @a
    IF @b > @max SET @max = @b
    IF @c > @max SET @max = @c
    IF @d > @max SET @max = @d
    RETURN @max
END;
GO

-- Использование
SELECT dbo.GREATEST(10, 20, 30, 5) AS max_value;
-- Результат: 30
```

---

## 8. ШПАРГАЛКА ДЛЯ МИГРАЦИИ С ДРУГИХ СУБД

| Функция | PostgreSQL / Oracle | MySQL | MS SQL Server |
|---------|---------------------|-------|---------------|
| Условный оператор | `CASE` | `CASE`, `IF()` | `CASE`, `IIF()` |
| Первое не-NULL | `COALESCE()` | `COALESCE()` | `COALESCE()` |
| NULL если равны | `NULLIF()` | `NULLIF()` | `NULLIF()` |
| Замена NULL | `COALESCE()`, `NVL()` | `IFNULL()`, `COALESCE()` | `ISNULL()`, `COALESCE()` |
| IFNULL / NVL | `NVL(a, b)` | `IFNULL(a, b)` | `ISNULL(a, b)` |
| Тернарный оператор | нет (используйте CASE) | `IF(a, b, c)` | `IIF(a, b, c)` |
| Выбор по индексу | нет | `ELT(index, a, b, c)` | `CHOOSE(index, a, b, c)` |
| Максимум из списка | `GREATEST()` | `GREATEST()` | `GREATEST()` (2022+), иначе эмуляция |
| Минимум из списка | `LEAST()` | `LEAST()` | `LEAST()` (2022+), иначе эмуляция |

---

## ПОЛНЫЙ ПРИМЕР КОМБИНИРОВАНИЯ

```sql
-- Комплексный пример: категоризация заказов с обработкой NULL
WITH Orders AS (
    SELECT * FROM (VALUES 
        (1, '2024-03-01', 1000, 'PAID', NULL),
        (2, '2024-03-02', NULL, 'PENDING', 'credit_card'),
        (3, '2024-03-03', 2500, 'PAID', NULL),
        (4, '2024-03-04', 500, 'CANCELLED', 'paypal'),
        (5, '2024-03-05', NULL, 'PAID', 'bank_transfer')
    ) AS t(order_id, order_date, amount, status, payment_method)
)
SELECT 
    order_id,
    amount,
    payment_method,
    
    -- ISNULL для замены NULL значений
    ISNULL(amount, 0) AS amount_with_default,
    ISNULL(payment_method, 'unknown') AS payment_clean,
    
    -- COALESCE для первого не-NULL
    COALESCE(amount, 0, 100) AS coalesce_amount,
    
    -- NULLIF для защиты от деления на ноль
    1000 / NULLIF(amount, 0) AS ratio,  -- NULL при amount = NULL или 0
    
    -- CASE для категоризации
    CASE
        WHEN amount IS NULL THEN 'No amount'
        WHEN amount < 500 THEN 'Small'
        WHEN amount < 1500 THEN 'Medium'
        ELSE 'Large'
    END AS order_size,
    
    -- IIF для простых условий
    IIF(status = 'PAID', '✅ Paid', '⚠️ Not paid') AS payment_status,
    
    -- CHOOSE для приоритета
    CHOOSE(
        CASE status
            WHEN 'PAID' THEN 1
            WHEN 'PENDING' THEN 2
            ELSE 3
        END,
        'High', 'Medium', 'Low'
    ) AS priority,
    
    -- GREATEST/LEAST (если доступно в вашей версии)
    ISNULL(NULLIF(amount, 0), 100) AS normalized_amount

FROM Orders;
```

---

## ЗАМЕТКИ ДЛЯ ИЗУЧАЮЩИХ

1. **CASE универсален:** Используйте `CASE` всегда, когда сомневаетесь. Он работает везде и понятен всем.
2. **IIF короче, но опасен:** Вычисляет оба варианта, что может вызвать ошибки (деление на ноль).
3. **COALESSE предпочтительнее ISNULL:** Это ANSI стандарт, работает во всех СУБД.
4. **NULLIF — ваш друг:** Особенно для защиты от деления на ноль и поиска изменений.
5. **GREATEST/LEAST — осторожно:** Проверьте версию SQL Server перед использованием.
6. **Логический порядок:** В `CASE` условия проверяются сверху вниз, первое истинное срабатывает.
