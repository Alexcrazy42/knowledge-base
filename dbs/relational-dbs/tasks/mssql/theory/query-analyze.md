# EXPLAIN в SQL Server: Полное руководство

## Введение

В SQL Server аналогом `EXPLAIN` являются **Execution Plans** (планы выполнения). Они показывают, как оптимизатор запросов намеревается выполнить запрос (Estimated Plan) и как он был выполнен на самом деле (Actual Plan). Это основной инструмент оптимизации производительности запросов в SQL Server .

В отличие от PostgreSQL, в SQL Server используется **графическое представление** планов (в SSMS), а также текстовые форматы (`SET SHOWPLAN_TEXT`, `SET SHOWPLAN_XML`).

---

## Типы планов выполнения

| Тип | Описание | Когда доступен |
|-----|----------|----------------|
| **Estimated Execution Plan** (Оценочный) | План, сгенерированный оптимизатором на основе статистики. Сам запрос **не выполняется** | Сразу, без выполнения запроса |
| **Actual Execution Plan** (Фактический) | Тот же оценочный план + **фактические данные выполнения** (количество строк, время, I/O). Запрос **выполняется полностью** | После выполнения запроса  |
| **Live Query Statistics** (Live-статистика) | Показывает прогресс выполнения **в реальном времени** для долгих запросов | Во время выполнения запроса (с 2016 версии) |

---

## Получение планов выполнения

### 1. Графический план в SSMS

**Оценочный план:**
```sql
-- Кнопка "Display Estimated Execution Plan" (Ctrl+L)
SELECT * FROM Sales.SalesOrderDetail WHERE ProductID = 777;
```

**Фактический план:**
```sql
-- Кнопка "Include Actual Execution Plan" (Ctrl+M) или "SET STATISTICS XML ON"
SET STATISTICS XML ON;
GO
SELECT * FROM Sales.SalesOrderDetail WHERE ProductID = 777;
GO
SET STATISTICS XML OFF;
```

### 2. Текстовые команды

```sql
-- Только оценка (без выполнения)
SET SHOWPLAN_TEXT ON;
GO
SELECT * FROM Sales.SalesOrderDetail WHERE ProductID = 777;
GO
SET SHOWPLAN_TEXT OFF;

-- С фактической статистикой выполнения
SET STATISTICS PROFILE ON;
GO
SELECT * FROM Sales.SalesOrderDetail WHERE ProductID = 777;
GO
SET STATISTICS PROFILE OFF;
```

### 3. XML формат (наиболее информативный)

```sql
-- Получить XML план
SET STATISTICS XML ON;
SELECT * FROM Sales.SalesOrderDetail WHERE ProductID = 777;
SET STATISTICS XML OFF;
```

XML план можно сохранить (расширение `.sqlplan`) и открыть в SSMS в графическом виде .

### 4. Auto-режим (для мониторинга production)

```sql
-- Через расширенное событие (XEvent)
CREATE EVENT SESSION [MonitorSlowQueries] ON SERVER 
ADD EVENT sqlserver.query_post_execution_showplan(
    WHERE (duration >= 1000000))  -- запросы дольше 1 секунды
```

---

## Архитектура выполнения: Iterators (Итераторы)

SQL Server использует **pull-модель** выполнения: выполнение всегда начинается с **корневого оператора**, который "вытягивает" данные из дочерних узлов через метод `GetRow()` .

```
      [Hash Match Join] (родитель)
             ↑ (GetRow)
         ┌───┴───┐
         ↓       ↓
    [Scan]    [Scan] (листья)
```

### Методы итераторов

| Метод | Описание |
|-------|----------|
| **Open()** | Инициализация оператора, выделение ресурсов |
| **GetRow()** | Получение одной строки данных (вызывается многократно) |
| **Close()** | Очистка ресурсов после завершения  |

Количество вызовов `GetRow()` отображается как **Actual Rows** в плане выполнения.

---

## Ключевые атрибуты операторов

В графическом плане при наведении на оператор отображается всплывающая подсказка с ключевыми атрибутами:

| Атрибут | Описание |
|---------|----------|
| **Actual Rows** | Реальное количество строк, которое вернул оператор |
| **Estimated Rows** | Предполагаемое количество строк (планировщик) |
| **Actual Execution Mode** | Batch (пакетный) или Row (построчный) |
| **Actual Time Elapsed** | Общее время выполнения оператора (мс) |
| **Actual Time (First Row)** | Время до получения первой строки (мс) |
| **Estimated I/O Cost** | Оценочная стоимость I/O |
| **Estimated CPU Cost** | Оценочная стоимость CPU |
| **Estimated Operator Cost** | Относительная стоимость оператора в % |
| **Number of Executions** | Количество выполнений оператора (важно для Nested Loops!) |
| **Warnings** | Предупреждения (например, о spill в tempdb) |

### Ключевой атрибут: Actual Rows vs Estimated Rows

**Самое важное** в анализе плана — сравнение `Actual Rows` и `Estimated Rows`:
- Если они **сильно различаются** → устаревшая статистика или некорректный кардинальность
- Если `Actual Rows` **намного больше**, чем оценочные → возможен выбор неоптимального оператора (например, Nested Loops вместо Hash Join)

---

## Типы операторов (физические и логические)

Операторы в SQL Server делятся на **логические** (что нужно сделать) и **физические** (как именно сделать). Оптимизатор выбирает физические операторы на основе стоимости .

### 📥 Scan узлы (чтение данных)

| Оператор (физический) | Логический | Описание | Когда используется |
|----------------------|------------|----------|---------------------|
| **Table Scan** | Scan | Чтение всей кучи (heap) — таблицы без кластерного индекса | Нет подходящего индекса или нужно >50% таблицы  |
| **Clustered Index Scan** | Scan | Чтение всего кластерного индекса (всех строк таблицы) | Нет подходящего индекса, таблица с кластерным индексом  |
| **Clustered Index Seek** | Seek | Поиск по кластерному индексу (B-Tree) | Условие WHERE по ключу кластерного индекса  |
| **Index Scan** (Nonclustered) | Scan | Чтение всего некластерного индекса | Некластерный индекс покрывает запрос, но нужно много строк  |
| **Index Seek** (Nonclustered) | Seek | Поиск по некластерному индексу | Условие WHERE по индексированным колонкам, высокая селективность  |
| **Key Lookup** | (Bookmark Lookup) | Чтение строки из кластерного индекса по ключу из некластерного | Некластерный индекс не покрывает запрос (очень дорого!)  |
| **RID Lookup** | (Bookmark Lookup) | Чтение строки из heap по идентификатору строки | Для таблиц без кластерного индекса  |
| **Columnstore Index Scan** | Scan | Сканирование колоночного индекса | Аналитические запросы, Data Warehousing  |

### 🔗 Join узлы (соединения)

| Оператор (физический) | Логический | Алгоритм | Когда оптимален |
|----------------------|------------|----------|-----------------|
| **Nested Loops** | Inner Join, Left Outer Join и др. | Для каждой строки внешнего набора — поиск во внутреннем | Один набор маленький, а по внутреннему есть индекс  |
| **Merge Join** | Inner Join, Left Outer Join и др. | Слияние двух отсортированных наборов | Оба набора отсортированы по ключу соединения  |
| **Hash Match** | Inner Join, Left Outer Join, Aggregate | Построение хэш-таблицы для меньшего набора | Большие несортированные наборы, агрегация  |
| **Adaptive Join** | Join (адаптивный) | Выбор между Nested Loops и Hash во время выполнения | SQL Server 2017+, когда неизвестна селективность на этапе компиляции  |

### 📊 Агрегация и группировка

| Оператор (физический) | Логический | Описание |
|----------------------|------------|----------|
| **Stream Aggregate** | Aggregate | Агрегация по **отсортированным** данным (требует Sort на входе)  |
| **Hash Match** (Aggregate) | Aggregate | Агрегация через хэш-таблицу (не требует сортировки)  |
| **Window Aggregate** | Aggregate | Оконные функции (ROW_NUMBER, RANK, LAG, LEAD)  |

### 📐 Сортировка и ограничение

| Оператор | Описание | Важно |
|----------|----------|-------|
| **Sort** | Сортировка всех входных строк | **Blocking operator** — читает все строки до выдачи результата. При spill в tempdb — очень дорого  |
| **Top** | Ограничение количества строк | Оптимизирует Sort (Top N Sort более эффективен)  |
| **Distinct Sort** | Удаление дубликатов с сортировкой |  |
| **Flow Distinct** | Удаление дубликатов без сортировки (по мере поступления) |  |

### ⚡ Параллельные операторы

| Оператор | Описание |
|----------|----------|
| **Gather Streams** | Сбор результатов из нескольких параллельных потоков в один  |
| **Distribute Streams** | Распределение строк по нескольким потокам  |
| **Repartition Streams** | Перераспределение потоков с изменением ключа  |

**Визуальный индикатор:** Жёлтый кружок с двумя стрелками на иконке оператора означает, что он выполнялся параллельно .

### 💾 Spool операторы (кэширование промежуточных результатов)

| Оператор | Описание | Режим |
|----------|----------|-------|
| **Table Spool** | Сохраняет строки во временной таблице (tempdb) | Eager (все строки сразу) / Lazy (по мере чтения)  |
| **Index Spool** | Сохраняет строки во временной индексированной таблице |  |
| **Row Count Spool** | Возвращает пустые строки для каждого входа (для проверки существования) |  |

**Важно:** Spool записывает данные в **tempdb**. Это дорогая операция, но она может быть оправдана, если данные переиспользуются многократно.

### 📝 DML операторы (модификация данных)

| Оператор | Описание |
|----------|----------|
| **Clustered Index Insert/Update/Delete** | Модификация кластерного индекса (и таблицы)  |
| **Table Insert/Update/Delete** | Модификация heap  |
| **Nonclustered Index Insert/Update/Delete** | Модификация некластерного индекса  |
| **Merge** | Объединение операций Insert/Update/Delete в одну  |
| **Split** | Разбиение Update на Delete + Insert (при обновлении ключа)  |
| **Assert** | Проверка ограничений (constraints) и подзапросов  |

---

## Логические vs Физические операторы

Один **логический** оператор может быть реализован несколькими **физическими** :

| Логический оператор | Возможные физические реализации |
|--------------------|--------------------------------|
| Aggregate | Stream Aggregate / Hash Match |
| Inner Join | Nested Loops / Merge Join / Hash Match |
| Distinct | Sort / Hash Match / Flow Distinct |

---

## Анализ плана: пошаговое руководство

### 1. Направление чтения плана

В графическом плане выполнение идёт **справа налево** и **снизу вверх**:
- **Листья** (справа/снизу) — источники данных (Scan/Seek)
- **Корень** (слева/сверху) — возврат результата клиенту

### 2. Поиск самого дорогого оператора

Смотрите на процент `Estimated Operator Cost`:
```
Пример: Hash Match (45%) > Index Scan (30%) > Sort (25%)
```
Оператор с наибольшим процентом — первая цель для оптимизации.

### 3. Сравнение Actual Rows и Estimated Rows

```sql
-- Пример проблемы:
Actual Rows: 100,000
Estimated Rows: 10
```

**Проблема:** Планировщик сильно недооценил количество строк.
**Причины:** Устаревшая статистика, неправильный кардинальность.
**Решение:** `UPDATE STATISTICS` или переписывание запроса.

### 4. Поиск предупреждений (Warnings)

SSMS отображает жёлтый значок `!` на операторе с предупреждением:
- **"Excessive memory grant"** — запрос запросил слишком много памяти
- **"Spill to tempdb"** — сортировка или хэш не влезли в память (увеличить `memory grant` или оптимизировать)
- **"No join predicate"** — декартово произведение (ошибка в запросе)
- **"Unmatched index"** — индекс не используется

### 5. Проверка Key Lookup (RID Lookup)

Если видите оператор **Key Lookup** (или Bookmark Lookup) — это частая проблема:
- Некластерный индекс использован для поиска, но не покрывает все нужные колонки
- SQL Server делает дополнительное чтение для каждой строки (random I/O)
- **Решение:** Создать покрывающий индекс (`INCLUDE`) или сделать clustered index scan, если ищется много строк

---

## "Вкусности" SQL Server: чего нет в PostgreSQL

| Фича | Описание |
|------|----------|
| **Key Lookup** | Аналога нет в PostgreSQL (там это называется Bitmap Heap Scan + Index Scan)  |
| **Spool** | Явное кэширование промежуточных результатов в tempdb  |
| **Adaptive Join** | Позволяет отложить выбор метода соединения до выполнения  |
| **Batch Mode** (Columnstore) | Пакетная обработка для аналитики (до 900 строк за раз) |
| **Parallelism operators** | Явные операторы распределения потоков  |
| **Window Aggregate** | Специализированный оператор для оконных функций |
| **Gather / Distribute Streams** | Операторы управления параллелизмом  |

---

## Продвинутое: план кэш (Plan Cache)

SQL Server кэширует скомпилированные планы для повторного использования. Важные DMV для анализа:

```sql
-- Посмотреть планы в кэше
SELECT 
    cp.plan_handle,
    qp.query_plan,
    st.text,
    cp.usecounts,
    cp.size_in_bytes
FROM sys.dm_exec_cached_plans cp
CROSS APPLY sys.dm_exec_query_plan(cp.plan_handle) qp
CROSS APPLY sys.dm_exec_sql_text(cp.plan_handle) st
WHERE cp.cacheobjtype = 'Compiled Plan';

-- Статистика выполнения запросов
SELECT 
    qs.total_worker_time / qs.execution_count AS avg_cpu_time,
    qs.total_logical_reads / qs.execution_count AS avg_logical_reads,
    qs.execution_count,
    st.text
FROM sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st
ORDER BY avg_cpu_time DESC;
```

### Атрибуты планов в кэше

Через `sys.dm_exec_plan_attributes` можно посмотреть важные свойства плана :
- **compat_level** — уровень совместимости базы данных
- **set_options** — битовая маска настроек SET (ANSI_NULLS, QUOTED_IDENTIFIER и др.)
- **objectid** — ID объекта (для хранимых процедур)

**Почему это важно:** Один и тот же запрос с разными SET options получает разные планы в кэше — это может приводить к его раздуванию .

---

## TODO для 100% покрытия темы

### 🔴 Базовый уровень (обязательно)

- [ ] Уметь получить Estimated и Actual планы в SSMS (Ctrl+L и Ctrl+M)
- [ ] Понимать разницу между Scan и Seek (и почему Seek быстрее)
- [ ] Знать, почему Key Lookup — это плохо и как его убрать (Covering Index)
- [ ] Понимать, когда выбирается Nested Loops, Merge Join и Hash Match
- [ ] Уметь находить самый дорогой оператор по проценту стоимости
- [ ] Сравнивать Actual Rows и Estimated Rows и понимать, что означает расхождение

### 🟡 Продвинутый уровень

- [ ] Понимать разницу между Eager и Lazy Spool
- [ ] Анализировать предупреждения (Warnings) в плане
- [ ] Знать, что такое "spill to tempdb" и как с ним бороться (увеличить memory grant)
- [ ] Уметь читать XML план (файл .sqlplan)
- [ ] Понимать, как работают оконные функции (Window Aggregate)
- [ ] Знать, что такое Adaptive Join и когда он применяется

### 🟢 Экспертный уровень

- [ ] Работа с DMV для анализа планов в кэше (`sys.dm_exec_query_stats`)
- [ ] Понимать влияние SET options на план (ANSI_NULLS, QUOTED_IDENTIFIER и др.)
- [ ] Использовать Query Store для мониторинга регрессии производительности
- [ ] Анализировать Batch Mode для Columnstore индексов
- [ ] Использовать Extended Events для захвата планов медленных запросов
- [ ] Понимать разницу между row mode и batch mode

### 🛠️ Практические упражнения

- [ ] Создать таблицу с кластерным индексом и выполнить Seek vs Scan
- [ ] Написать запрос, который вызывает Key Lookup, и создать покрывающий индекс
- [ ] Создать ситуацию с устаревшей статистикой (обновить много строк, не делать UPDATE STATISTICS)
- [ ] Написать запрос с сортировкой, которая не влезает в память, и поймать spill
- [ ] Сравнить план с Nested Loops и Hash Match для одного и того же запроса (через хинты)

---

## Полезные команды и настройки

```sql
-- Включить/выключить статистику времени и I/O
SET STATISTICS TIME ON;
SET STATISTICS IO ON;

-- Получить XML план
SET STATISTICS XML ON;

-- Показать фактический профиль выполнения
SET STATISTICS PROFILE ON;

-- Обновить статистику таблицы
UPDATE STATISTICS Sales.SalesOrderDetail;

-- Посмотреть текущие настройки сессии
DBCC USEROPTIONS;

-- Очистить план кэш (не на production!)
DBCC FREEPROCCACHE;

-- Посмотреть размер памяти для сортировок/хэшей
SELECT name, value, value_in_use 
FROM sys.configurations 
WHERE name IN ('min memory per query (KB)', 'max server memory (MB)');
```

---

## Сравнение с PostgreSQL (для тех, кто мигрирует)

| PostgreSQL | SQL Server |
|------------|------------|
| `EXPLAIN ANALYZE` | Actual Execution Plan (SET STATISTICS XML) |
| Seq Scan | Table Scan / Clustered Index Scan |
| Index Scan | Index Seek + Key Lookup |
| Bitmap Index/Heap Scan | Nested Loops + Key Lookup (или Hash Join) |
| HashAggregate / GroupAggregate | Hash Match / Stream Aggregate |
| Materialize / Memoize | Spool (Table Spool / Index Spool) |
| Shared buffers (hit/read) | STATISTICS IO (logical/physical reads) |
| loops | Number of Executions |
| Parallel Seq Scan | Parallelism (Gather Streams) |

---

## Резюме

**Execution Plan в SQL Server** — это не просто инструмент, а основная "карта", по которой вы понимаете, как запрос выполняется на самом деле. Графические планы в SSMS наглядны, но для серьёзного анализа важно уметь читать XML и знание ключевых атрибутов.

**Золотое правило:** Если вы не смотрели Actual Execution Plan запроса с включённой статистикой (`SET STATISTICS TIME, IO ON`), вы не знаете, почему он тормозит. Всегда сравнивайте Actual Rows и Estimated Rows, ищите Key Lookup, смотрите на предупреждения.