# Оконные функции

Оконные функции проходят только по сортированным данным, тк нужно пройтись строго по каждой из партиций, чего нельзя сделать если данные не отсортированы.
Все что находится в Partion By - требует сортировки, если данных много - происходит spill на диск
Если есть еще данные в postgres, то происходит составная сортировка сначала по партиции, потом по тому, где сортируемся


1. ROW_NUMBER

ROW_NUMBER() OVER ([PARTITION BY ...] ORDER BY ...)

Присваивает каждой струки внутри окна (partition) уникальный последовательный номер, начиная с 1

Примеры:

- ROW_NUMBER() OVER (ORDER BY created_date DESC) AS row_num - Простая нумерация всех записей

- ROW_NUMBER() OVER (PARTITION BY partner_id ORDER BY created_date) AS claim_num_by_partner - Нумерация внутри партнера (каждый партнер начинает с 1)

- ROW_NUMBER() OVER (PARTITION BY partner_id, state_id ORDER BY claim_samo_id) AS claim_num_by_partner_and_state - Нумерация внутри сложного ключа (партнер + статус)

2. RANK

Аналогично с ROW_NUMBER, только для одинаковых значений всегда выводится одинаковый num, а следующий num будет с пропуском

Одинаковые значения → один ранг, с пропусками. 1, 1, 3

Пример: турнирное расположение по очкам, с учетом того, что за одинаковое кол-во очков дает одинаковое место

3. DENSE_RANK

Аналогично с RANK, только не будет пропусков между строками. 1, 1, 2

4. NTILE

NTILE(number_of_buckets) OVER ([PARTITION BY ...] ORDER BY ...)

Разбивает строки на N примерно равных групп (корзин) и присваивает каждой строке номер от 1 до N

Алгоритм работы:

- определение общего числа строк в окне
- делит их на number_of_buckets
- старается сделать группы максимально равными (разница не более 1 строки)
- присваивает каждой строке номер группы

Пример:

```sql
-- Разделить продавцов на 4 группы по объему продаж
SELECT 
    seller_id,
    sales_amount,
    NTILE(4) OVER (ORDER BY sales_amount DESC) AS quartile
FROM sellers
-- quartile=1 → топ-25% продавцов
```

5. PERCENT_RANK

PERCENT_RANK() OVER ([PARTITION BY ...] ORDER BY ...)

Вычисляет относительное положение строки в группе, возвращая значение от 0 до 1. Это процент строк, которые имеют значение меньше текущего.

```
PERCENT_RANK = (RANK - 1) / (total_rows - 1)
```

6. CUME_DIST

CUME_DIST = (количество строк со значением ≤ текущего) / (общее количество строк в окне)

оказывает долю строк в окне, которые меньше или равны текущей строке. Другими словами, это процентная позиция строки с учетом всех строк, включая одинаковые значения

CUME_DIST() OVER ([PARTITION BY ...] ORDER BY ...)

7. LAG

Доступ к предыдущей строке. Позволяет получить значение из предыдущей строки в рамках окна без использования self-join или подзапросов. Это сдвиг назад (движение вверх по результатам сортировки)

LAG(expression [, offset [, default_value]]) OVER ([PARTITION BY ...] ORDER BY ...)

expression - колонка или выражение, значение которой нужно получить
offset — на сколько строк назад (по умолчанию 1)
default_value — значение по умолчанию, если предыдущей строки нет (иначе NULL)

```
-- Агрегация через GROUP BY + оконные функции
WITH grouped AS (
    SELECT 
		partner_id,
		claim_samo_id,
		COUNT(*) OVER (PARTITION BY partner_id) AS claims_count,
		AVG(CAST(claim_samo_id AS INT)) OVER (PARTITION BY partner_id) AS avg_amount
	FROM claims
),
windowed AS (
    SELECT 
        partner_id,
		claim_samo_id,
        claims_count,
        avg_amount,
        LAG(claim_samo_id) OVER (ORDER BY avg_amount) AS prev_partner_by_avg,
		RANK() OVER (ORDER BY claims_count DESC) AS rank_by_count
    FROM grouped
)

SELECT * FROM windowed
```

8. LEAD

Аналогично с LAG

9. FIRST_VALUE, LAST_VALUE

FIRST_VALUE(x), LAST_VALUE(x) - значение x из первой/последней строки окна

По умолчанию фрейм обычно идёт от начала партиции до текущей строки, поэтому LAST_VALUE() без явного задания фрейма часто возвращает не “последнее значение в группе”, а значение текущей или ближайшей доступной строки по рамке. Именно поэтому для “последнего значения во всей партиции” обычно задают расширенный фрейм до UNBOUNDED FOLLOWING

```
LAST_VALUE(total) OVER (
        ORDER BY score
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
        -- ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING
) AS last_total
```

-- ROWS — физическое смещение строк
SUM(amount) OVER(ORDER BY date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)

-- RANGE — логическое смещение (все строки с тем же значением ORDER BY)
SUM(amount) OVER(ORDER BY date RANGE BETWEEN INTERVAL '7' DAY PRECEDING AND CURRENT ROW)

-- GROUPS — SQL Server 2022+ (группы строк с одинаковым значением)
SUM(amount) OVER(ORDER BY date GROUPS BETWEEN 1 PRECEDING AND 1 FOLLOWING)

10. MIN/MAX, AVG, COUNT, SUM

Скользящие функции. Логика - при наличии ORDER BY и без явного ROWS BETWEEN ... агрегатная оконная функция использует фрейм, который “едет” по строкам: от начала окна до текущей строки.