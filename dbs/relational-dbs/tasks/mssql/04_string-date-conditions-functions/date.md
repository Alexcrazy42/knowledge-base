# Функции для работы с датами и временем в MS SQL Server

Полное руководство со встроенными примерами

---

## ОГЛАВЛЕНИЕ
1. [Извлечение частей даты](#1-извлечение-частей-даты)
2. [Прибавление интервалов (DATEADD)](#2-прибавление-интервалов-dateadd)
3. [Разница между датами (DATEDIFF)](#3-разница-между-датами-datediff)
4. [Округление даты (DATETRUNC)](#4-округление-даты-datetrunc)
5. [Извлечение даты без времени](#5-извлечение-даты-без-времени)
6. [Форматирование дат (FORMAT)](#6-форматирование-дат-format)
7. [Дополнительные функции](#7-дополнительные-функции)
8. [Шпаргалка для миграции с PostgreSQL/Oracle/MySQL](#8-шпаргалка-для-миграции-с-postgresqloraclemysql)

---

## 1. ИЗВЛЕЧЕНИЕ ЧАСТЕЙ ДАТЫ

### **YEAR, MONTH, DAY** — год, месяц, день
```sql
-- Синтаксис: YEAR(дата), MONTH(дата), DAY(дата)
SELECT 
    YEAR('2024-03-15') AS year,
    MONTH('2024-03-15') AS month,
    DAY('2024-03-15') AS day;
-- Результат: year = 2024, month = 3, day = 15

-- С текущей датой
SELECT 
    YEAR(GETDATE()) AS current_year,
    MONTH(GETDATE()) AS current_month,
    DAY(GETDATE()) AS current_day;
```

### **DATEPART** — универсальное извлечение
```sql
-- Синтаксис: DATEPART(единица_измерения, дата)

-- Основные единицы измерения
SELECT 
    DATEPART(YEAR, '2024-03-15 14:30:45') AS year,
    DATEPART(QUARTER, '2024-03-15') AS quarter,        -- 1-4
    DATEPART(MONTH, '2024-03-15') AS month,
    DATEPART(DAYOFYEAR, '2024-03-15') AS day_of_year,  -- 1-366
    DATEPART(DAY, '2024-03-15') AS day,
    DATEPART(WEEK, '2024-03-15') AS week_number,       -- ISO week
    DATEPART(WEEKDAY, '2024-03-15') AS weekday;        -- 1-7 (зависит от SET DATEFIRST)

-- Временные части
SELECT 
    DATEPART(HOUR, '14:30:45') AS hour,
    DATEPART(MINUTE, '14:30:45') AS minute,
    DATEPART(SECOND, '14:30:45') AS second,
    DATEPART(MILLISECOND, '14:30:45.123') AS millisecond;

-- Аббревиатуры тоже работают
SELECT 
    DATEPART(YY, '2024-03-15') AS year,      -- YY = YEAR
    DATEPART(QQ, '2024-03-15') AS quarter,   -- QQ = QUARTER
    DATEPART(MM, '2024-03-15') AS month,     -- MM = MONTH
    DATEPART(DY, '2024-03-15') AS day_of_year, -- DY = DAYOFYEAR
    DATEPART(DD, '2024-03-15') AS day,       -- DD = DAY
    DATEPART(WK, '2024-03-15') AS week,      -- WK = WEEK
    DATEPART(DW, '2024-03-15') AS weekday,   -- DW = WEEKDAY
    DATEPART(HH, '14:30:45') AS hour,        -- HH = HOUR
    DATEPART(MI, '14:30:45') AS minute,      -- MI = MINUTE
    DATEPART(SS, '14:30:45') AS second;      -- SS = SECOND
```

### **DATENAME** — название части даты
```sql
-- DATEPART возвращает число, DATENAME возвращает имя
SELECT 
    DATENAME(MONTH, '2024-03-15') AS month_name,    -- 'March'
    DATENAME(WEEKDAY, '2024-03-15') AS weekday_name; -- 'Friday' (зависит от языка)
```

### **EXTRACT** (ANSI SQL)
```sql
-- ВНИМАНИЕ: В MS SQL Server НЕТ функции EXTRACT!
-- Используйте DATEPART вместо неё
SELECT 
    DATEPART(YEAR, '2024-03-15') AS extract_year;   -- Эквивалент EXTRACT(YEAR FROM date)
```

---

## 2. ПРИБАВЛЕНИЕ ИНТЕРВАЛОВ (DATEADD)

### **DATEADD** — добавляет интервал к дате
```sql
-- Синтаксис: DATEADD(единица_измерения, количество, дата)

-- Примеры с разными единицами
SELECT 
    DATEADD(YEAR, 1, '2024-03-15') AS add_one_year,           -- 2025-03-15
    DATEADD(MONTH, 3, '2024-03-15') AS add_three_months,      -- 2024-06-15
    DATEADD(DAY, 7, '2024-03-15') AS add_one_week,            -- 2024-03-22
    DATEADD(HOUR, 5, '2024-03-15 10:00:00') AS add_five_hours, -- 15:00:00
    DATEADD(MINUTE, 30, '2024-03-15 10:00:00') AS add_30_min,  -- 10:30:00
    DATEADD(SECOND, 45, '2024-03-15 10:00:00') AS add_45_sec;  -- 10:00:45

-- Отрицательные значения (вычитание)
SELECT 
    DATEADD(DAY, -7, '2024-03-15') AS subtract_one_week,  -- 2024-03-08
    DATEADD(MONTH, -1, '2024-03-15') AS subtract_one_month; -- 2024-02-15

-- Цепочка добавлений
SELECT 
    DATEADD(DAY, 1, DATEADD(MONTH, 1, DATEADD(YEAR, 1, '2024-03-15'))) AS add_all;
-- Результат: 2025-04-16
```

### -- Добавить интервал (синтаксис PostgreSQL/MySQL)
```sql
-- В PostgreSQL: SELECT created_at + INTERVAL '7 days'
-- В MySQL: SELECT DATE_ADD(created_at, INTERVAL 7 DAY)

-- В MS SQL Server аналог:
SELECT DATEADD(DAY, 7, '2024-03-15') AS plus_7_days;     -- +7 дней
SELECT DATEADD(MONTH, 1, '2024-03-15') AS plus_1_month;  -- +1 месяц
```

---

## 3. РАЗНИЦА МЕЖДУ ДАТАМИ (DATEDIFF)

### **DATEDIFF** — разница в указанных единицах
```sql
-- Синтаксис: DATEDIFF(единица_измерения, начальная_дата, конечная_дата)

-- Разница в разных единицах
SELECT 
    DATEDIFF(YEAR, '2020-03-15', '2024-03-15') AS years_diff,     -- 4
    DATEDIFF(MONTH, '2024-01-15', '2024-03-15') AS months_diff,    -- 2
    DATEDIFF(DAY, '2024-03-01', '2024-03-15') AS days_diff,        -- 14
    DATEDIFF(WEEK, '2024-03-01', '2024-03-15') AS weeks_diff,      -- 2
    DATEDIFF(HOUR, '2024-03-15 08:00:00', '2024-03-15 17:00:00') AS hours_diff, -- 9
    DATEDIFF(MINUTE, '2024-03-15 10:00:00', '2024-03-15 10:30:00') AS minutes_diff; -- 30

-- Количество дней между датами (разница в днях)
SELECT DATEDIFF(DAY, '2024-01-01', '2024-12-31') AS days_in_year;
-- Результат: 365

-- Возраст в годах (приблизительный)
SELECT 
    DATEDIFF(YEAR, '1990-05-20', GETDATE()) AS approx_age;

-- ВНИМАНИЕ: DATEDIFF режет границы! Не "по-человечески"
SELECT 
    DATEDIFF(YEAR, '2024-12-31', '2025-01-01') AS years_diff;
-- Результат: 1 (хотя прошёл всего 1 день!)
```

### **DATEDIFF_BIG** — для больших разниц
```sql
-- Тоже самое, но возвращает BIGINT (для очень больших интервалов)
SELECT 
    DATEDIFF_BIG(MILLISECOND, '1900-01-01', GETDATE()) AS milliseconds_since_1900;
```

### -- AGE (PostgreSQL)
```sql
-- В PostgreSQL: AGE('2024-03-15', '1990-05-20') -> '33 years 9 mons 25 days'

-- В MS SQL Server нет точного AGE, но можно сделать:
SELECT 
    -- Годы
    DATEDIFF(YEAR, '1990-05-20', '2024-03-15') - 
        CASE 
            WHEN DATEADD(YEAR, DATEDIFF(YEAR, '1990-05-20', '2024-03-15'), '1990-05-20') > '2024-03-15'
            THEN 1 ELSE 0 
        END AS years,
    -- Месяцы (упрощённо)
    (DATEDIFF(MONTH, '1990-05-20', '2024-03-15') % 12) AS months;
```

### -- Вычитание дат (PostgreSQL)
```sql
-- В PostgreSQL: SELECT '2024-03-15' - '2024-03-01' → 14 days

-- В MS SQL Server: используйте DATEDIFF
SELECT DATEDIFF(DAY, '2024-03-01', '2024-03-15') AS days_diff;  -- 14
```

---

## 4. ОКРУГЛЕНИЕ ДАТЫ (DATETRUNC)

### **DATETRUNC** — округление до начала периода (SQL Server 2022+)
```sql
-- Синтаксис: DATETRUNC(единица_измерения, дата)

-- Доступно в SQL Server 2022 и Azure SQL Database
SELECT 
    DATETRUNC(YEAR, '2024-03-15 14:30:45') AS trunc_year,     -- 2024-01-01 00:00:00
    DATETRUNC(QUARTER, '2024-03-15') AS trunc_quarter,        -- 2024-01-01 00:00:00
    DATETRUNC(MONTH, '2024-03-15 14:30:45') AS trunc_month,    -- 2024-03-01 00:00:00
    DATETRUNC(WEEK, '2024-03-15') AS trunc_week,               -- 2024-03-10 (зависит от DATEFIRST)
    DATETRUNC(DAY, '2024-03-15 14:30:45') AS trunc_day,        -- 2024-03-15 00:00:00
    DATETRUNC(HOUR, '2024-03-15 14:30:45') AS trunc_hour,      -- 2024-03-15 14:00:00
    DATETRUNC(MINUTE, '2024-03-15 14:30:45') AS trunc_minute;  -- 2024-03-15 14:30:00

-- Для старых версий SQL Server (до 2022) используйте обходные пути:
SELECT 
    -- Округление до начала дня
    CAST('2024-03-15 14:30:45' AS DATE) AS trunc_day_old,
    -- Округление до начала месяца
    DATEFROMPARTS(YEAR('2024-03-15'), MONTH('2024-03-15'), 1) AS trunc_month_old,
    -- Округление до начала года
    DATEFROMPARTS(YEAR('2024-03-15'), 1, 1) AS trunc_year_old;
```

### **DATE_TRUNC (PostgreSQL)**
```sql
-- В PostgreSQL: DATE_TRUNC('month', '2024-03-15')

-- В MS SQL Server 2022+: DATETRUNC(MONTH, '2024-03-15')
-- В старых версиях: DATEFROMPARTS(YEAR('2024-03-15'), MONTH('2024-03-15'), 1)
```

---

## 5. ИЗВЛЕЧЕНИЕ ДАТЫ БЕЗ ВРЕМЕНИ

### **CAST / CONVERT** — удаление времени
```sql
-- Способ 1: CAST к типу DATE
SELECT CAST('2024-03-15 14:30:45' AS DATE) AS just_date;
-- Результат: 2024-03-15

-- Способ 2: CONVERT с стилем 10 (мм-дд-гггг)
SELECT CONVERT(DATE, '2024-03-15 14:30:45') AS just_date_convert;
-- Результат: 2024-03-15

-- Способ 3: CONVERT с стилем 101 (мм/дд/гггг)
SELECT CONVERT(VARCHAR, '2024-03-15 14:30:45', 101) AS date_string;
-- Результат: '03/15/2024'

-- Текущая дата без времени
SELECT CAST(GETDATE() AS DATE) AS today_date;
```

### **DATE** (MySQL/PostgreSQL)
```sql
-- В MySQL: SELECT DATE('2024-03-15 14:30:45')

-- В MS SQL Server: CAST('2024-03-15 14:30:45' AS DATE)
```

---

## 6. ФОРМАТИРОВАНИЕ ДАТ (FORMAT)

### **FORMAT** — гибкое форматирование (.NET style)
```sql
-- Синтаксис: FORMAT(дата, формат_строка [, культура])

-- Стандартные форматы
SELECT 
    FORMAT(GETDATE(), 'yyyy-MM-dd') AS iso_date,           -- 2024-03-15
    FORMAT(GETDATE(), 'dd/MM/yyyy') AS european_date,      -- 15/03/2024
    FORMAT(GETDATE(), 'MM/dd/yyyy') AS us_date,            -- 03/15/2024
    FORMAT(GETDATE(), 'dd MMM yyyy') AS short_month,       -- 15 Mar 2024
    FORMAT(GETDATE(), 'dd MMMM yyyy') AS full_month,       -- 15 March 2024
    FORMAT(GETDATE(), 'hh:mm tt') AS time_12h,             -- 02:30 PM
    FORMAT(GETDATE(), 'HH:mm:ss') AS time_24h;             -- 14:30:45

-- День недели и месяц
SELECT 
    FORMAT(GETDATE(), 'dddd') AS weekday_full,    -- Friday
    FORMAT(GETDATE(), 'ddd') AS weekday_short,    -- Fri
    FORMAT(GETDATE(), 'MMMM') AS month_full,      -- March
    FORMAT(GETDATE(), 'MMM') AS month_short;      -- Mar

-- Специфическая культура
SELECT 
    FORMAT(GETDATE(), 'D', 'ru-RU') AS russian_format,   -- 15 марта 2024 г.
    FORMAT(GETDATE(), 'D', 'de-DE') AS german_format,    -- Freitag, 15. März 2024
    FORMAT(GETDATE(), 'D', 'ja-JP') AS japanese_format;  -- 2024年3月15日

-- Произвольные форматы
SELECT FORMAT(GETDATE(), 'yyyy-MM-dd HH:mm:ss.fff') AS custom_format;
-- Результат: 2024-03-15 14:30:45.123
```

### **CONVERT с форматами** (старый способ, но быстрее)
```sql
-- Встроенные стили CONVERT
SELECT 
    CONVERT(VARCHAR, GETDATE(), 23) AS yyyy_mm_dd,   -- 2024-03-15
    CONVERT(VARCHAR, GETDATE(), 103) AS dd_mm_yyyy,  -- 15/03/2024
    CONVERT(VARCHAR, GETDATE(), 101) AS mm_dd_yyyy,  -- 03/15/2024
    CONVERT(VARCHAR, GETDATE(), 108) AS hh_mi_ss,    -- 14:30:45
    CONVERT(VARCHAR, GETDATE(), 20) AS yyyy_mm_dd_hh_mi_ss, -- 2024-03-15 14:30:45
    CONVERT(VARCHAR, GETDATE(), 21) AS yyyy_mm_dd_hh_mi_ss_fff; -- 2024-03-15 14:30:45.123
```

### **TO_CHAR (PostgreSQL)**
```sql
-- В PostgreSQL: TO_CHAR(date, 'YYYY-MM-DD')

-- В MS SQL Server аналог:
SELECT FORMAT(GETDATE(), 'yyyy-MM-dd') AS to_char_analog;
-- Или через CONVERT:
SELECT CONVERT(VARCHAR, GETDATE(), 23) AS to_char_analog;
```

---

## 7. ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ

### **EOMONTH** — последний день месяца
```sql
-- Синтаксис: EOMONTH(дата [, смещение_месяцев])
SELECT 
    EOMONTH('2024-02-15') AS last_day_feb,        -- 2024-02-29
    EOMONTH('2024-03-15') AS last_day_mar,        -- 2024-03-31
    EOMONTH('2024-03-15', 1) AS last_day_next_month, -- 2024-04-30
    EOMONTH('2024-03-15', -1) AS last_day_prev_month; -- 2024-02-29
```

### **ISDATE** — проверка валидности даты
```sql
SELECT 
    ISDATE('2024-03-15') AS valid_date,      -- 1
    ISDATE('2024-13-45') AS invalid_date,    -- 0
    ISDATE('2024-02-29') AS leap_year,       -- 1
    ISDATE('not a date') AS not_date;        -- 0
```

### **GETDATE, SYSDATETIME, CURRENT_TIMESTAMP**
```sql
-- Текущая дата и время (разная точность)
SELECT 
    GETDATE() AS date_time,           -- 2024-03-15 14:30:45.123
    SYSDATETIME() AS high_precision,  -- 2024-03-15 14:30:45.1234567
    CURRENT_TIMESTAMP AS ansi_date,   -- 2024-03-15 14:30:45.123
    GETUTCDATE() AS utc_date;         -- 2024-03-15 12:30:45.123
```

---

## 8. ШПАРГАЛКА ДЛЯ МИГРАЦИИ С POSTGRESQL/ORACLE/MYSQL

| Функция | PostgreSQL / Oracle | MySQL | MS SQL Server |
|---------|---------------------|-------|---------------|
| Извлечение года | `EXTRACT(YEAR FROM date)` | `YEAR(date)` | `YEAR(date)` или `DATEPART(YEAR, date)` |
| Извлечение месяца | `EXTRACT(MONTH FROM date)` | `MONTH(date)` | `MONTH(date)` или `DATEPART(MONTH, date)` |
| Извлечение дня | `EXTRACT(DAY FROM date)` | `DAY(date)` | `DAY(date)` или `DATEPART(DAY, date)` |
| Извлечение часа | `EXTRACT(HOUR FROM date)` | `HOUR(date)` | `DATEPART(HOUR, date)` |
| Название месяца | `TO_CHAR(date, 'Month')` | `MONTHNAME(date)` | `DATENAME(MONTH, date)` |
| Название дня | `TO_CHAR(date, 'Day')` | `DAYNAME(date)` | `DATENAME(WEEKDAY, date)` |
| Добавить интервал | `date + INTERVAL '7 days'` | `DATE_ADD(date, INTERVAL 7 DAY)` | `DATEADD(DAY, 7, date)` |
| Вычесть интервал | `date - INTERVAL '7 days'` | `DATE_SUB(date, INTERVAL 7 DAY)` | `DATEADD(DAY, -7, date)` |
| Разница в днях | `date1 - date2` | `DATEDIFF(date1, date2)` | `DATEDIFF(DAY, date2, date1)` |
| Разница в годах | `AGE(date1, date2)` | `TIMESTAMPDIFF(YEAR, date2, date1)` | `DATEDIFF(YEAR, date2, date1)` |
| Округление до месяца | `DATE_TRUNC('month', date)` | нет встроенной | `DATETRUNC(MONTH, date)` (2022+) |
| Последний день месяца | нет встроенной | `LAST_DAY(date)` | `EOMONTH(date)` |
| Дата без времени | `DATE(date)` | `DATE(date)` | `CAST(date AS DATE)` |
| Форматирование | `TO_CHAR(date, 'YYYY-MM-DD')` | `DATE_FORMAT(date, '%Y-%m-%d')` | `FORMAT(date, 'yyyy-MM-dd')` |
| Проверка валидности | нет встроенной | `STR_TO_DATE(...)` | `ISDATE(date_string)` |

---

## ПРИМЕРЫ КОМБИНИРОВАНИЯ ФУНКЦИЙ

```sql
-- Первый день текущего месяца
SELECT DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1) AS first_of_month;

-- Последний день текущего месяца
SELECT EOMONTH(GETDATE()) AS last_of_month;

-- Первый день следующего месяца
SELECT DATEADD(MONTH, 1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)) AS first_of_next_month;

-- Количество дней в текущем месяце
SELECT DAY(EOMONTH(GETDATE())) AS days_in_month;

-- Начало текущей недели (понедельник)
SELECT DATEADD(DAY, - (DATEPART(WEEKDAY, GETDATE()) - 2), CAST(GETDATE() AS DATE)) AS start_of_week;

-- Возраст на заданную дату
DECLARE @birth_date DATE = '1990-05-20';
SELECT 
    DATEDIFF(YEAR, @birth_date, GETDATE()) - 
    CASE 
        WHEN DATEADD(YEAR, DATEDIFF(YEAR, @birth_date, GETDATE()), @birth_date) > GETDATE()
        THEN 1 ELSE 0 
    END AS age;

-- Форматирование даты в русском стиле
SELECT FORMAT(GETDATE(), 'dd MMMM yyyy', 'ru-RU') AS russian_date;
-- Результат: '15 марта 2024'

-- Проверка является ли дата выходным (суббота/воскресенье)
SELECT 
    '2024-03-16' AS check_date,
    CASE WHEN DATEPART(WEEKDAY, '2024-03-16') IN (1, 7) THEN 'Weekend' ELSE 'Workday' END AS day_type;
-- Результат: 'Weekend' (суббота)

-- Создание даты из частей
SELECT DATEFROMPARTS(2024, 3, 15) AS date_from_parts;        -- 2024-03-15
SELECT DATETIMEFROMPARTS(2024, 3, 15, 14, 30, 45, 0) AS datetime_from_parts; -- 2024-03-15 14:30:45.000
```

---

## ЗАМЕТКИ ДЛЯ ИЗУЧАЮЩИХ

1. **DATEPART vs DATENAME:** `DATEPART` возвращает число, `DATENAME` возвращает строку
2. **WEEKDAY зависит от SET DATEFIRST:** По умолчанию неделя начинается с воскресенья (1)
3. **DATEDIFF режет границы:** Разница в годах между 31 декабря и 1 января = 1
4. **FORMAT медленнее CONVERT:** Для высоконагруженных систем используйте CONVERT
5. **DATETRUNC только с 2022:** Для старых версий используйте обходные пути через CAST/DATEFROMPARTS
6. **Типы данных:** `DATE` (только дата), `DATETIME` (до 3.33ms точности), `DATETIME2` (до 100ns)