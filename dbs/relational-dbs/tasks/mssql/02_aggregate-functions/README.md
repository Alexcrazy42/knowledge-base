# Аггрегатные функции

Работают с GROUP BY. В отличии от оконных функций не используют Window Spoll. Использует Stream Aggregate и Hash Aggregate

1. MIN/MAX, AVG, COUNT, SUM

Базовый синтаксис:

```sql
-- Общий шаблон
SELECT 
    [группирующие_колонки,]
    АГРЕГАТНАЯ_ФУНКЦИЯ([ALL | DISTINCT] выражение) [AS псевдоним]
FROM таблица
[WHERE условие]
[GROUP BY группирующие_колонки]
[HAVING условие_на_агрегат]
[ORDER BY ...]
```

MIN:

```sql
-- Базовый синтаксис
MIN([ALL | DISTINCT] выражение)

-- Примеры
SELECT 
    MIN(amount) AS min_amount,           -- Минимальная сумма
    MIN(created_date) AS earliest_date,  -- Самая ранняя дата
    MIN(name) AS first_alphabetical      -- Минимальное строковое значение
FROM claims;

-- С GROUP BY
SELECT 
    partner_id,
    MIN(amount) AS min_partner_amount
FROM claims
GROUP BY partner_id;

-- С условием
SELECT 
    partner_id,
    MIN(CASE WHEN status = 'APPROVED' THEN amount END) AS min_approved
FROM claims
GROUP BY partner_id;
```

MAX: аналогично MIN

SUM:

```sql
-- Базовый синтаксис
SUM([ALL | DISTINCT] числовое_выражение)

-- Примеры
SELECT 
    SUM(amount) AS total_amount,           -- Сумма всех сумм (включая дубликаты)
    SUM(DISTINCT amount) AS unique_sum,    -- Сумма уникальных значений
    SUM(CAST(amount AS BIGINT)) AS safe_sum -- С защитой от переполнения
FROM claims;

-- С GROUP BY
SELECT 
    partner_id,
    SUM(amount) AS total_by_partner
FROM claims
GROUP BY partner_id;

-- Условная сумма
SELECT 
    partner_id,
    SUM(CASE WHEN status = 'APPROVED' THEN amount ELSE 0 END) AS approved_total
FROM claims
GROUP BY partner_id;
```

AVG:

```sql
-- Базовый синтаксис
AVG([ALL | DISTINCT] числовое_выражение)

-- Примеры
SELECT 
    AVG(amount) AS avg_amount,             -- Среднее арифметическое
    AVG(DISTINCT amount) AS avg_unique,    -- Среднее уникальных значений
    AVG(CAST(amount AS DECIMAL(18,2))) AS precise_avg -- С точностью
FROM claims;

-- С GROUP BY
SELECT 
    partner_id,
    AVG(amount) AS avg_by_partner
FROM claims
GROUP BY partner_id;

-- AVG с обработкой NULL (null считаем как 0)
SELECT 
    AVG(ISNULL(amount, 0)) AS avg_with_nulls_as_zero
FROM claims;
```

COUNT:

```sql
-- Три варианта синтаксиса
COUNT(*)                    -- Считает ВСЕ строки (включая NULL)
COUNT([ALL] выражение)      -- Считает NOT NULL значения
COUNT(DISTINCT выражение)   -- Считает уникальные NOT NULL значения

-- Примеры
SELECT 
    COUNT(*) AS total_rows,                    -- Все строки
    COUNT(amount) AS non_null_amounts,         -- Строки где amount IS NOT NULL
    COUNT(DISTINCT partner_id) AS unique_partners, -- Уникальные партнеры
    COUNT(DISTINCT CASE WHEN amount > 1000 THEN partner_id END) AS big_partners
FROM claims;

-- С GROUP BY
SELECT 
    status,
    COUNT(*) AS status_count,
    COUNT(DISTINCT partner_id) AS unique_partners_in_status
FROM claims
GROUP BY status;
```


2. Дополнительные аггрегатные функции

- STDDEV / VARIANCE — стандартное отклонение и дисперсия
- STDDEV_POP, STDDEV_SAMP — популяционное и выборочное
- STRING_AGG
- LISTAGG (Oracle, SQL Server через WITHIN GROUP)
- ARRAY_AGG