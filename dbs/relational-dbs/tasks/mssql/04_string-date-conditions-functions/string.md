# Строковые функции в MS SQL Server

Полное руководство со встроенными примерами

---

## ОГЛАВЛЕНИЕ
1. [Конкатенация](#1-конкатенация)
2. [Длина строки](#2-длина-строки)
3. [Изменение регистра](#3-изменение-регистра)
4. [Извлечение подстроки](#4-извлечение-подстроки)
5. [Удаление пробелов](#5-удаление-пробелов)
6. [Замена и удаление символов](#6-замена-и-удаление-символов)
7. [Дублирование строки](#7-дублирование-строки)
8. [Дополнение строки](#8-дополнение-строки)
9. [Поиск подстроки](#9-поиск-подстроки)
10. [Регулярные выражения](#10-регулярные-выражения)
11. [Шпаргалка для миграции с PostgreSQL/Oracle](#11-шпаргалка-для-миграции-с-postgresqloracle)

---

## 1. КОНКАТЕНАЦИЯ

### **CONCAT** — объединение строк
```sql
-- Синтаксис: CONCAT(строка1, строка2, ..., строкаN)
SELECT CONCAT('Hello', ' ', 'World') AS result;
-- Результат: 'Hello World'

-- Работает с NULL (не превращает всё в NULL!)
SELECT CONCAT('Value: ', NULL, ' продолжение') AS with_null;
-- Результат: 'Value:  продолжение' (NULL игнорируется)

-- Смешивание типов (числа, даты)
SELECT CONCAT('Order #', 12345, ' created on ', GETDATE()) AS order_info;
-- Результат: 'Order #12345 created on 2024-01-15 10:30:00.000'
```

### **CONCAT_WS** — объединение с разделителем (WS = With Separator)
```sql
-- Синтаксис: CONCAT_WS(разделитель, строка1, строка2, ...)
SELECT CONCAT_WS(', ', 'Apple', 'Banana', 'Orange') AS fruits;
-- Результат: 'Apple, Banana, Orange'

-- Пропускает NULL, не вставляет лишние разделители
SELECT CONCAT_WS(' - ', 'First', NULL, 'Third') AS with_null;
-- Результат: 'First - Third'

-- Обработка пустых строк vs NULL
SELECT CONCAT_WS('|', '', 'value', NULL, 'last') AS result;
-- Результат: '|value|last' (пустая строка не игнорируется)
```

### **Обычная конкатенация через +**
```sql
-- Альтернативный способ (работает быстрее, но осторожнее с NULL)
SELECT 'Hello' + ' ' + 'World' AS result;
-- Результат: 'Hello World'

-- ОПАСНОСТЬ: NULL убивает всю строку
SELECT 'Hello' + ' ' + NULL + 'World' AS dangerous;
-- Результат: NULL (всё выражение становится NULL)

-- Решение: ISNULL или COALESCE
SELECT 'Hello' + ' ' + ISNULL(NULL, '') + 'World' AS safe;
-- Результат: 'HelloWorld'
```

---

## 2. ДЛИНА СТРОКИ

### **LEN** — длина строки (без учета trailing spaces)
```sql
-- Синтаксис: LEN(строка)
SELECT LEN('Hello World') AS length;
-- Результат: 11

-- Важно: LEN НЕ считает пробелы в конце
SELECT LEN('Hello   ') AS no_trailing_spaces;
-- Результат: 5 (пробелы в конце игнорируются!)

-- Считает пробелы в начале
SELECT LEN('   Hello') AS counts_leading_spaces;
-- Результат: 8 (3 пробела + 5 символов)

-- NULL возвращает NULL
SELECT LEN(NULL) AS null_length;
-- Результат: NULL
```

### **DATALENGTH** — длина в байтах
```sql
-- Синтаксис: DATALENGTH(строка)
SELECT DATALENGTH('Hello') AS bytes;
-- Результат: 5 (один байт на символ в ANSI)

-- Для Unicode (NVARCHAR) - 2 байта на символ
SELECT DATALENGTH(N'Hello') AS unicode_bytes;
-- Результат: 10
```

---

## 3. ИЗМЕНЕНИЕ РЕГИСТРА

### **UPPER** — в верхний регистр
```sql
-- Синтаксис: UPPER(строка)
SELECT UPPER('Hello World') AS upper_case;
-- Результат: 'HELLO WORLD'
```

### **LOWER** — в нижний регистр
```sql
-- Синтаксис: LOWER(строка)
SELECT LOWER('Hello World') AS lower_case;
-- Результат: 'hello world'
```

### **INITCAP** — первой буквы заглавные
```sql
-- ВНИМАНИЕ: В MS SQL Server НЕТ встроенной INITCAP!
-- Обход через комбинацию функций:

-- Способ 1: Через STUFF и UPPER/LOWER для коротких строк
SELECT 
    UPPER(LEFT('hello world', 1)) + 
    LOWER(SUBSTRING('hello world', 2, LEN('hello world'))) AS initcap_simple;
-- Результат: 'Hello world' (только первое слово!)

-- Способ 2: Пользовательская функция (пример логики)
-- Для полноценной работы с несколькими словами нужна скалярная функция
-- или решение на CLR
```

---

## 4. ИЗВЛЕЧЕНИЕ ПОДСТРОКИ

### **SUBSTRING** — извлечение части строки
```sql
-- Синтаксис: SUBSTRING(строка, начало, длина)
SELECT SUBSTRING('Hello World', 7, 5) AS substring;
-- Результат: 'World'

-- Начало с 1 (не с 0!)
SELECT SUBSTRING('Database', 1, 4) AS result;
-- Результат: 'Data'

-- Длина больше строки -> возвращает до конца
SELECT SUBSTRING('Short', 2, 100) AS to_end;
-- Результат: 'hort'

-- Начало за пределами строки -> пустая строка
SELECT SUBSTRING('Short', 10, 5) AS empty;
-- Результат: '' (пустая строка, не NULL)
```

### **LEFT** — первые N символов
```sql
-- Синтаксис: LEFT(строка, количество)
SELECT LEFT('Hello World', 5) AS first_five;
-- Результат: 'Hello'

-- Если количество > длины строки
SELECT LEFT('Hi', 10) AS padded;
-- Результат: 'Hi' (без дополнения пробелами)
```

### **RIGHT** — последние N символов
```sql
-- Синтаксис: RIGHT(строка, количество)
SELECT RIGHT('Hello World', 5) AS last_five;
-- Результат: 'World'
```

---

## 5. УДАЛЕНИЕ ПРОБЕЛОВ

### **TRIM** — удаляет пробелы с обоих концов (SQL Server 2017+)
```sql
-- Синтаксис: TRIM([символы FROM] строка)
SELECT TRIM('   Hello World   ') AS trimmed;
-- Результат: 'Hello World'

-- Удаление конкретных символов (не только пробелов)
SELECT TRIM('! ' FROM '!! Hello World !! ') AS custom_trim;
-- Результат: 'Hello World !!' (удалил '!' и пробелы в начале)
```

### **LTRIM** — удаляет пробелы слева
```sql
-- Синтаксис: LTRIM(строка)
SELECT LTRIM('   Hello World   ') AS left_trimmed;
-- Результат: 'Hello World   ' (пробелы справа остались)
```

### **RTRIM** — удаляет пробелы справа
```sql
-- Синтаксис: RTRIM(строка)
SELECT RTRIM('   Hello World   ') AS right_trimmed;
-- Результат: '   Hello World' (пробелы слева остались)
```

---

## 6. ЗАМЕНА И УДАЛЕНИЕ СИМВОЛОВ

### **REPLACE** — замена подстроки
```sql
-- Синтаксис: REPLACE(строка, что_меняем, на_что_меняем)
SELECT REPLACE('Hello World', 'World', 'SQL') AS replaced;
-- Результат: 'Hello SQL'

-- Удаление символов (замена на пустую строку)
SELECT REPLACE('Hello, World!', ',', '') AS without_comma;
-- Результат: 'Hello World!'

-- Множественные замены (вложенные)
SELECT REPLACE(REPLACE('Hello World', 'o', '0'), 'l', '1') AS multiple;
-- Результат: 'He110 W0r1d'
```

### **REVERSE** — переворачивание строки
```sql
-- Синтаксис: REVERSE(строка)
SELECT REVERSE('Hello World') AS reversed;
-- Результат: 'dlroW olleH'

-- Практический пример: проверка палиндрома
SELECT 
    'radar' AS word,
    CASE WHEN 'radar' = REVERSE('radar') THEN 'Palindrome' ELSE 'No' END AS is_palindrome;
-- Результат: 'Palindrome'
```

---

## 7. ДУБЛИРОВАНИЕ СТРОКИ

### **REPEAT** — повторение строки N раз
```sql
-- ВНИМАНИЕ: В MS SQL Server функция называется REPLICATE, а не REPEAT!

-- REPLICATE(строка, количество_повторений)
SELECT REPLICATE('Hi', 5) AS repeated;
-- Результат: 'HiHiHiHiHi'

-- Создание строки из звездочек для маскирования
SELECT REPLICATE('*', 10) AS mask;
-- Результат: '**********'
```

---

## 8. ДОПОЛНЕНИЕ СТРОКИ

### **LPAD / RPAD** — дополнение слева/справа
```sql
-- ВНИМАНИЕ: В MS SQL Server НЕТ встроенных LPAD/RPAD!
-- Эмуляция через RIGHT/LEFT + REPLICATE:

-- LPAD: дополнение слева до нужной длины
SELECT 
    RIGHT(REPLICATE('0', 5) + '123', 5) AS lpad_example;
-- Результат: '00123'

-- Универсальный LPAD
SELECT 
    RIGHT(REPLICATE('*', 10) + 'SQL', 10) AS lpad_star;
-- Результат: '*******SQL'

-- RPAD: дополнение справа
SELECT 
    LEFT('SQL' + REPLICATE('*', 10), 10) AS rpad_example;
-- Результат: 'SQL*******'

-- RPAD с разными символами
SELECT 
    LEFT('Hello' + REPLICATE('-', 10), 10) AS rpad_dash;
-- Результат: 'Hello-----'
```

---

## 9. ПОИСК ПОДСТРОКИ

### **CHARINDEX** — поиск позиции подстроки
```sql
-- Синтаксис: CHARINDEX(искомая_строка, строка_где_искать [, начало_поиска])
SELECT CHARINDEX('World', 'Hello World') AS position;
-- Результат: 7

-- Поиск с указанием стартовой позиции
SELECT CHARINDEX('o', 'Hello World', 5) AS position_from_5;
-- Результат: 8 (второе 'o' в 'World')

-- Если не найдено -> 0
SELECT CHARINDEX('xyz', 'Hello World') AS not_found;
-- Результат: 0

-- Поиск с учетом регистра (по умолчанию зависит от Collation)
SELECT CHARINDEX('world', 'Hello World') AS case_sensitive;
-- Результат: 7 или 0 (зависит от collation сервера)
```

### **PATINDEX** — поиск по шаблону с wildcards
```sql
-- Синтаксис: PATINDEX('%шаблон%', строка)
SELECT PATINDEX('%World%', 'Hello World') AS pattern_position;
-- Результат: 7

-- С wildcards: % - любое количество символов, _ - один символ
SELECT PATINDEX('%W_rld%', 'Hello World') AS wildcard_match;
-- Результат: 7

-- Поиск цифр в строке
SELECT PATINDEX('%[0-9]%', 'Order 12345') AS first_digit;
-- Результат: 7 (позиция пробела между Order и 12345? Нет — позиция символа '1')
```

---

## 10. РЕГУЛЯРНЫЕ ВЫРАЖЕНИЯ

### **LIKE** — простейшее pattern matching (не полноценный regex)
```sql
-- Специальные символы:
-- % - любое количество любых символов
-- _ - один любой символ
-- [abc] - один символ из набора
-- [a-z] - диапазон символов
-- [^abc] - символ не из набора

SELECT 
    'Hello' AS value,
    CASE WHEN 'Hello' LIKE 'H%' THEN 'Yes' ELSE 'No' END AS starts_with_H;
-- Результат: 'Yes'

-- Поиск email-подобных строк
SELECT 
    'user@example.com' AS email,
    CASE WHEN 'user@example.com' LIKE '%_@_%._%' THEN 'Valid format' ELSE 'Invalid' END AS validation;
-- Результат: 'Valid format'
```

### **REGEXP / REGEXP_LIKE**
```sql
-- ВНИМАНИЕ: В MS SQL Server 2016+ ЕСТЬ поддержка регулярных выражений,
-- но ТОЛЬКО через функцию RegexMatches (Azure SQL Database) 
-- или через встроенную RLIKE (не во所有版本х)!

-- Для стандартного MS SQL Server (on-premise) полноценного REGEXP_LIKE НЕТ.
-- Обходной путь: использование CLR-функций или LIKE с множественными условиями.

-- Если вы используете SQL Server 2022+ в Azure или с поддержкой RLIKE:
-- SELECT * FROM table WHERE column RLIKE '^[A-Za-z]+$';

-- Альтернатива: LIKE с несколькими условиями
SELECT 
    'Valid123' AS test_string,
    CASE 
        WHEN 'Valid123' LIKE '%[^A-Za-z0-9]%' THEN 'Has invalid chars'
        ELSE 'Valid alphanumeric'
    END AS validation;
-- Результат: 'Valid alphanumeric'
```

---

## 11. ШПАРГАЛКА ДЛЯ МИГРАЦИИ С POSTGRESQL/ORACLE

| PostgreSQL / Oracle | MS SQL Server | Примечание |
|---------------------|---------------|------------|
| `CONCAT(a, b)` | `CONCAT(a, b)` | ✅ Работает одинаково |
| `CONCAT_WS(sep, a, b)` | `CONCAT_WS(sep, a, b)` | ✅ SQL Server 2017+ |
| `LENGTH(str)` | `LEN(str)` | ⚠️ LEN игнорирует trailing spaces |
| `CHAR_LENGTH(str)` | `LEN(str)` | ⚠️ Для Unicode также LEN |
| `UPPER(str)` | `UPPER(str)` | ✅ |
| `LOWER(str)` | `LOWER(str)` | ✅ |
| `INITCAP(str)` | **Нет встроенной** | Нужно писать свою функцию |
| `SUBSTRING(str, start, len)` | `SUBSTRING(str, start, len)` | ⚠️ В SQL Server start с 1, не с 0 |
| `SUBSTR(str, start, len)` | `SUBSTRING(str, start, len)` | ✅ |
| `LEFT(str, n)` | `LEFT(str, n)` | ✅ |
| `RIGHT(str, n)` | `RIGHT(str, n)` | ✅ |
| `TRIM(str)` | `TRIM(str)` | ✅ SQL Server 2017+ |
| `LTRIM(str)` | `LTRIM(str)` | ✅ |
| `RTRIM(str)` | `RTRIM(str)` | ✅ |
| `REPLACE(str, old, new)` | `REPLACE(str, old, new)` | ✅ |
| `REVERSE(str)` | `REVERSE(str)` | ✅ |
| `REPEAT(str, n)` | `REPLICATE(str, n)` | ⚠️ Другое название |
| `LPAD(str, n, char)` | **Нет встроенной** | Эмуляция через RIGHT + REPLICATE |
| `RPAD(str, n, char)` | **Нет встроенной** | Эмуляция через LEFT + REPLICATE |
| `POSITION(sub IN str)` | `CHARINDEX(sub, str)` | ⚠️ Порядок аргументов обратный |
| `INSTR(str, sub)` | `CHARINDEX(sub, str)` | ⚠️ Порядок аргументов обратный |
| `STRPOS(str, sub)` | `CHARINDEX(sub, str)` | ⚠️ Порядок аргументов обратный |
| `REGEXP_LIKE(str, pattern)` | **Нет встроенной** | Нужно CLR или Azure SQL |

---

## ПРИМЕРЫ КОМБИНИРОВАНИЯ ФУНКЦИЙ

```sql
-- Форматирование номера заказа: 1 -> 'ORD-000001'
SELECT 
    'ORD-' + RIGHT(REPLICATE('0', 6) + CAST(1 AS VARCHAR), 6) AS formatted_order;

-- Экстракция домена из email
SELECT 
    SUBSTRING('user@example.com', CHARINDEX('@', 'user@example.com') + 1, LEN('user@example.com')) AS domain;

-- Маскирование имени: John Doe -> J*** D**
SELECT 
    LEFT('John', 1) + REPLICATE('*', LEN('John') - 1) + ' ' +
    LEFT('Doe', 1) + REPLICATE('*', LEN('Doe') - 1) AS masked_name;

-- Валидация телефонного номера (удаление всех не-цифр)
SELECT 
    REPLACE(REPLACE(REPLACE('+1 (123) 456-78-90', '-', ''), '(', ''), ')', '') AS clean_phone;

-- Трансформация snake_case в CamelCase
SELECT 
    UPPER(LEFT('first_name', 1)) + 
    LOWER(SUBSTRING('first_name', 2, CHARINDEX('_', 'first_name') - 2)) +
    UPPER(SUBSTRING('first_name', CHARINDEX('_', 'first_name') + 1, 1)) +
    LOWER(SUBSTRING('first_name', CHARINDEX('_', 'first_name') + 2, LEN('first_name'))) AS camel_case;
-- Результат: 'FirstName'
```

---

## ЗАМЕТКИ
1. **NULL поведение:** Большинство строковых функций (кроме CONCAT) при передаче NULL возвращают NULL
2. **Регистрозависимость:** Зависит от collation базы данных
3. **Unicode:** Для работы с Unicode используйте префикс `N'строкa'`
4. **Производительность:** В циклах и на больших объемах избегайте множественных вызовов функций
5. **Альтернативы:** Некоторые функции (LPAD/RPAD) лучше вынести в пользовательские функции при частом использовании

```sql
-- Пример пользовательской функции для LPAD
CREATE FUNCTION dbo.LPAD(@str VARCHAR(MAX), @len INT, @pad CHAR(1))
RETURNS VARCHAR(MAX)
AS
BEGIN
    RETURN RIGHT(REPLICATE(@pad, @len) + @str, @len);
END
GO

-- Использование
SELECT dbo.LPAD('123', 10, '0') AS lpad_result;
-- Результат: '0000000123'
```