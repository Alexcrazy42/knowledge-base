# Глава 15. Дополнительные возможности SQL

## 15.1

Напишите рекурсивный запрос, который строит маршруты с пересадками. Маршрут не должен вощвращаться в ранее посещаемые пункты пересадки. На каждой пересадке интервал времени между прибытием и отправлением следующего рейса должен быть не менее 1 часа и не более 24 часов. Общая продолжительность маршрута не должна превышать 48 часов


```sql
WITH RECURSIVE cte AS (
    SELECT
        f.flight_id,
        r.route_no,
        r.departure_airport::text AS departure_airport,
        r.arrival_airport::text AS arrival_airport,
        f.scheduled_departure,
        f.scheduled_arrival,
        gen_random_uuid() AS id,
        ARRAY[f.flight_id] AS flight_chain,
        ARRAY[r.departure_airport::text, r.arrival_airport::text] AS airport_chain,
        1 AS depth
    FROM flights f
    JOIN routes r ON f.route_no = r.route_no
    WHERE r.departure_airport = 'SVO'
    AND f.scheduled_departure >= '2025-10-18'
    AND f.scheduled_departure < '2025-10-19'

    UNION ALL

    SELECT
        f.flight_id,
        r.route_no,
        cte.departure_airport::text,
        r.arrival_airport::text,
        cte.scheduled_departure,
        f.scheduled_arrival,
        cte.id,
        cte.flight_chain || f.flight_id,
        cte.airport_chain || r.arrival_airport::text,
        cte.depth + 1
    FROM cte
    JOIN routes r ON r.departure_airport = cte.arrival_airport
    JOIN flights f ON f.route_no = r.route_no
    WHERE
      -- Не возвращаемся в уже посещённые аэропорты
        NOT (r.arrival_airport::text = ANY(cte.airport_chain))
      AND f.scheduled_departure > cte.scheduled_arrival
      AND (f.scheduled_departure - cte.scheduled_arrival) > make_interval(hours := 1)
      AND (f.scheduled_departure - cte.scheduled_arrival) < make_interval(hours := 48)
      AND cte.depth + 1 <= 2 -- максимум 2 пересадки
      AND r.arrival_airport = 'LED'
)
SELECT
    id,
    depth,
    flight_chain,
    array_to_string(airport_chain, ' → ') AS route,
    departure_airport,
    arrival_airport,
    ct.scheduled_departure,
    ct.scheduled_arrival,
    ct.scheduled_arrival - ct.scheduled_departure AS total_duration
FROM cte ct
WHERE arrival_airport = 'LED'
ORDER BY id, depth
LIMIT 100;
```

```text
Limit  (cost=1781.33..1781.33 rows=1 width=180) (actual time=0.500..0.503 rows=4 loops=1)
  CTE cte
    ->  Recursive Union  (cost=30.91..1779.69 rows=72 width=175) (actual time=0.084..0.478 rows=17 loops=1)
          ->  Hash Join  (cost=30.91..220.73 rows=12 width=175) (actual time=0.083..0.237 rows=17 loops=1)
                Hash Cond: (f.route_no = r.route_no)
                ->  Index Scan using flights_scheduled_departure on flights f  (cost=0.29..188.42 rows=189 width=27) (actual time=0.010..0.103 rows=185 loops=1)
                      Index Cond: ((scheduled_departure >= '2025-10-18 00:00:00+00'::timestamp with time zone) AND (scheduled_departure < '2025-10-19 00:00:00+00'::timestamp with time zone))
                ->  Hash  (cost=30.19..30.19 rows=34 width=15) (actual time=0.036..0.037 rows=34 loops=1)
                      Buckets: 1024  Batches: 1  Memory Usage: 10kB
                      ->  Bitmap Heap Scan on routes r  (cost=4.54..30.19 rows=34 width=15) (actual time=0.014..0.030 rows=34 loops=1)
                            Recheck Cond: (departure_airport = 'SVO'::bpchar)
                            Heap Blocks: exact=14
                            ->  Bitmap Index Scan on routes_departure_and_arrival  (cost=0.00..4.53 rows=34 width=0) (actual time=0.009..0.009 rows=34 loops=1)
                                  Index Cond: (departure_airport = 'SVO'::bpchar)
          ->  Nested Loop  (cost=7.51..155.82 rows=6 width=175) (actual time=0.233..0.233 rows=0 loops=1)
                ->  Hash Join  (cost=3.50..42.24 rows=4 width=143) (actual time=0.058..0.135 rows=8 loops=1)
                      Hash Cond: ((r_1.departure_airport)::text = cte.arrival_airport)
                      Join Filter: ((r_1.arrival_airport)::text <> ALL (cte.airport_chain))
                      ->  Seq Scan on routes r_1  (cost=0.00..38.54 rows=21 width=15) (actual time=0.007..0.111 rows=21 loops=1)
                            Filter: (arrival_airport = 'LED'::bpchar)
                            Rows Removed by Filter: 1142
                      ->  Hash  (cost=3.00..3.00 rows=40 width=164) (actual time=0.009..0.009 rows=17 loops=1)
                            Buckets: 1024  Batches: 1  Memory Usage: 11kB
                            ->  WorkTable Scan on cte  (cost=0.00..3.00 rows=40 width=164) (actual time=0.003..0.005 rows=17 loops=1)
                                  Filter: ((depth + 1) <= 2)
                ->  Bitmap Heap Scan on flights f_1  (cost=4.01..28.37 rows=1 width=27) (actual time=0.011..0.011 rows=0 loops=8)
                      Recheck Cond: ((r_1.route_no = route_no) AND (scheduled_departure > cte.scheduled_arrival))
                      Filter: (((scheduled_departure - cte.scheduled_arrival) > '01:00:00'::interval) AND ((scheduled_departure - cte.scheduled_arrival) < '48:00:00'::interval))
                      Rows Removed by Filter: 11
                      Heap Blocks: exact=84
                      ->  Bitmap Index Scan on flights_route_no_scheduled_departure_key  (cost=0.00..4.01 rows=10 width=0) (actual time=0.004..0.004 rows=11 loops=8)
                            Index Cond: ((route_no = r_1.route_no) AND (scheduled_departure > cte.scheduled_arrival))
  ->  Sort  (cost=1.63..1.64 rows=1 width=180) (actual time=0.499..0.500 rows=4 loops=1)
"        Sort Key: ct.id, ct.depth"
        Sort Method: quicksort  Memory: 25kB
        ->  CTE Scan on cte ct  (cost=0.00..1.62 rows=1 width=180) (actual time=0.243..0.493 rows=4 loops=1)
              Filter: (arrival_airport = 'LED'::text)
              Rows Removed by Filter: 13
Planning Time: 0.661 ms
Execution Time: 0.571 ms
```

Пояснение
Limit
    -> CTE (Recursive Join)
        -> Hash Join (flight.route_no = route.route_no)
            -> Index scan on flights flights_scheduled_departure (flight.scheduled_departure > and flight.scheduled_departure <)
            -> Hash
                -> Bitmap heap scan on routes (recheck departure_airport = 'SVO')
                    -> Bitmap index scan on routes routes_departure_and_arrival (departure_airport = 'SVO')
        -> Nested Loop
            -> Hash Join (r1.departure_airport <> cte.airport_chain)
                -> Seq scan on routes r1 (arrival_airport = 'LED')
                -> Hash
                    -> WorkTable Scan on cte (depth + 1 <= 2)
            -> Bitmap heap scan on flights f1
                recheck cond -  (r1.route_no = route_no = route_no) AND scheduled_departure > cte.scheduled_arrival
                filter - scheduled_departure - cte.scheduled_arrival
                -> bitmap index scan on flights with flights_route_no_scheduled_departure_key
                    index cond ((route_no = r_1.route_no) AND (scheduled_departure > cte.scheduled_arrival))
    -> Sort sort_key = ct.id, ct.depth, quick_sort
        -> CTE scan on cte ct
            filter - arrival_airport = 'LED'

## 15.2

Найдите маршруты с пересадками, прибывающие в москву из аэропортов, не имеющих прямых рейсов в аэропорты Москвы

```sql
WITH RECURSIVE cte AS (
    SELECT
        f.flight_id,
        r.route_no,
        r.departure_airport::text AS departure_airport,
        r.arrival_airport::text AS arrival_airport,
        f.scheduled_departure,
        f.scheduled_arrival,
        gen_random_uuid() AS id,
        ARRAY[f.flight_id] AS flight_chain,
        ARRAY[r.departure_airport::text, r.arrival_airport::text] AS airport_chain,
        1 AS depth
    FROM flights f
             JOIN routes r ON f.route_no = r.route_no
        AND NOT EXISTS (
            SELECT 1 FROM routes r1
            WHERE
                r1.arrival_airport IN ('VKO', 'SVO', 'BKA', 'DME', 'OSF')
              AND r1.departure_airport = r.departure_airport
        )
        AND r.departure_airport NOT IN ('VKO', 'SVO', 'BKA', 'DME', 'OSF')

    UNION ALL

    SELECT
        f.flight_id,
        r.route_no,
        cte.departure_airport::text,
        r.arrival_airport::text,
        cte.scheduled_departure,
        f.scheduled_arrival,
        cte.id,
        cte.flight_chain || f.flight_id,
        cte.airport_chain || r.arrival_airport::text,
        cte.depth + 1
    FROM cte
             JOIN routes r ON r.departure_airport = cte.arrival_airport
             JOIN flights f ON f.route_no = r.route_no
    WHERE
      -- Не возвращаемся в уже посещённые аэропорты
        NOT (r.arrival_airport::text = ANY(cte.airport_chain))
      AND f.scheduled_departure > cte.scheduled_arrival
      AND (f.scheduled_departure - cte.scheduled_arrival) > make_interval(hours := 1)
      AND (f.scheduled_departure - cte.scheduled_arrival) < make_interval(hours := 48)
      AND cte.depth + 1 <= 2 -- максимум 2 пересадки
      AND r.arrival_airport IN ('VKO', 'SVO', 'BKA', 'DME', 'OSF')
)
SELECT
    id,
    depth,
    flight_chain,
    array_to_string(airport_chain, ' → ') AS route,
    departure_airport,
    arrival_airport,
    ct.scheduled_departure,
    ct.scheduled_arrival,
    ct.scheduled_arrival - ct.scheduled_departure AS total_duration
FROM cte ct
WHERE arrival_airport IN ('VKO', 'SVO', 'BKA', 'DME', 'OSF')
  AND depth >= 2
ORDER BY id, depth
LIMIT 1000;
```

```text
Limit  (cost=39886.13..39886.93 rows=320 width=180) (actual time=159.819..159.907 rows=1000 loops=1)
  CTE cte
    ->  Recursive Union  (cost=56.90..38767.33 rows=38396 width=175) (actual time=1.073..129.464 rows=39572 loops=1)
          ->  Nested Loop  (cost=56.90..267.60 rows=2296 width=175) (actual time=1.071..85.086 rows=38120 loops=1)
                ->  Hash Right Anti Join  (cost=56.61..113.65 rows=57 width=15) (actual time=1.022..1.259 rows=789 loops=1)
                      Hash Cond: (r1.departure_airport = r.departure_airport)
                      ->  Seq Scan on routes r1  (cost=0.00..42.90 rows=66 width=4) (actual time=0.007..0.306 rows=64 loops=1)
"                            Filter: (arrival_airport = ANY ('{VKO,SVO,BKA,DME,OSF}'::bpchar[]))"
                            Rows Removed by Filter: 1099
                      ->  Hash  (cost=42.90..42.90 rows=1097 width=15) (actual time=0.617..0.618 rows=1099 loops=1)
                            Buckets: 2048  Batches: 1  Memory Usage: 67kB
                            ->  Seq Scan on routes r  (cost=0.00..42.90 rows=1097 width=15) (actual time=0.012..0.440 rows=1099 loops=1)
"                                  Filter: (departure_airport <> ALL ('{VKO,SVO,BKA,DME,OSF}'::bpchar[]))"
                                  Rows Removed by Filter: 64
                ->  Index Scan using flights_route_no_scheduled_departure_key on flights f  (cost=0.29..1.89 rows=31 width=27) (actual time=0.005..0.024 rows=48 loops=789)
                      Index Cond: (route_no = r.route_no)
          ->  Nested Loop  (cost=44.02..3811.58 rows=3610 width=175) (actual time=0.518..13.144 rows=726 loops=2)
                Join Filter: ((f_1.scheduled_departure > cte.scheduled_arrival) AND ((f_1.scheduled_departure - cte.scheduled_arrival) > '01:00:00'::interval) AND ((f_1.scheduled_departure - cte.scheduled_arrival) < '48:00:00'::interval))
                Rows Removed by Join Filter: 42458
                ->  Hash Join  (cost=43.72..833.91 rows=2402 width=143) (actual time=0.309..5.542 rows=3298 loops=2)
                      Hash Cond: (cte.arrival_airport = (r_1.departure_airport)::text)
                      Join Filter: ((r_1.arrival_airport)::text <> ALL (cte.airport_chain))
                      ->  WorkTable Scan on cte  (cost=0.00..574.00 rows=7653 width=164) (actual time=0.129..2.904 rows=19060 loops=2)
                            Filter: ((depth + 1) <= 2)
                            Rows Removed by Filter: 726
                      ->  Hash  (cost=42.90..42.90 rows=66 width=15) (actual time=0.214..0.214 rows=64 loops=1)
                            Buckets: 1024  Batches: 1  Memory Usage: 11kB
                            ->  Seq Scan on routes r_1  (cost=0.00..42.90 rows=66 width=15) (actual time=0.013..0.196 rows=64 loops=1)
"                                  Filter: (arrival_airport = ANY ('{VKO,SVO,BKA,DME,OSF}'::bpchar[]))"
                                  Rows Removed by Filter: 1099
                ->  Memoize  (cost=0.30..15.79 rows=31 width=27) (actual time=0.000..0.001 rows=13 loops=6595)
                      Cache Key: r_1.route_no
                      Cache Mode: logical
                      Hits: 6574  Misses: 21  Evictions: 0  Overflows: 0  Memory Usage: 38kB
                      ->  Index Scan using flights_route_no_scheduled_departure_key on flights f_1  (cost=0.29..15.78 rows=31 width=27) (actual time=0.005..0.017 rows=27 loops=21)
                            Index Cond: (route_no = r_1.route_no)
  ->  Sort  (cost=1118.80..1119.60 rows=320 width=180) (actual time=159.818..159.850 rows=1000 loops=1)
"        Sort Key: ct.id, ct.depth"
        Sort Method: quicksort  Memory: 241kB
        ->  CTE Scan on cte ct  (cost=0.00..1105.49 rows=320 width=180) (actual time=130.301..159.285 rows=1452 loops=1)
"              Filter: ((depth >= 2) AND (arrival_airport = ANY ('{VKO,SVO,BKA,DME,OSF}'::text[])))"
              Rows Removed by Filter: 38120
Planning Time: 1.226 ms
Execution Time: 161.376 ms
```

Пояснение

Limit
    Cte
        -> Recursive Union
            -> Nested Loop
                -> Hash Right Anti Join (Hash cond r1.departure_ariport = r.departure_airport)
                    -> Seq Scan on routes r1 (filter arrival_airport = ANY (список))
                    -> Hash
                        -> Seq Scan on routes r (filter departure_airport <> ALL (список))
                -> Index Scan on flights f on flights_route_no_scheduled_departure_key (index cond - route_no = r.route_no)
            -> Nested Loop 
                join filter - f1.scheduled_departure > cte.scheduled_arrival AND f1.scheduled_departure - cte.scheduled_arrival ....
                -> Hash join (cte.arrival_airport = (r_1.departure_airport)::text)
                    -> WorkTable Scan on cte (filter depth + 1 <= 2)
                    -> Hash
                        -> Seq Scan on routes r1 (arrival_airport = ANY (список))
                -> Memoize (cache key = r_1.route_no)
                    -> Index Scan on flights f1 using flights_route_no_scheduled_departure_key (index cond: route_no = r1.route_no)
        -> Sort (sort key - ct.id, ct.depth, quick sort)
            -> CTE Scan on cte ct 
                filter (depth >= 2 AND arrival_airport ANY (список))


## 15.3

Найдите маршруты с пересадками, прибывающие в Москву, стоимость которых ниже, чем стоимость прямых рейсов от начального до конечного пункта маршрута

```sql
--EXPLAIN ANALYZE
WITH RECURSIVE cte AS (
    SELECT
        f.flight_id,
        r.route_no,
        r.departure_airport::text AS departure_airport,
        r.arrival_airport::text AS arrival_airport,
        f.scheduled_departure,
        f.scheduled_arrival,
        gen_random_uuid() AS id,
        ARRAY[f.flight_id] AS flight_chain,
        ARRAY[r.departure_airport::text, r.arrival_airport::text] AS airport_chain,
        1 AS depth,
        s.price as price
    FROM flights f
     JOIN routes r ON f.route_no = r.route_no
    JOIN segments s on s.flight_id = f.flight_id
    AND r.departure_airport NOT IN ('VKO', 'SVO', 'BKA', 'DME', 'OSF')

    UNION ALL

    SELECT
        f.flight_id,
        r.route_no,
        cte.departure_airport::text,
        r.arrival_airport::text,
        cte.scheduled_departure,
        f.scheduled_arrival,
        cte.id,
        cte.flight_chain || f.flight_id,
        cte.airport_chain || r.arrival_airport::text,
        cte.depth + 1,
        (cte.price + s.price)::NUMERIC(10,2) as price
    FROM cte
     JOIN routes r ON r.departure_airport = cte.arrival_airport
     JOIN flights f ON f.route_no = r.route_no
    JOIN segments s ON s.flight_id = f.flight_id
    WHERE NOT (r.arrival_airport::text = ANY(cte.airport_chain))
      AND f.scheduled_departure > cte.scheduled_arrival
      AND (f.scheduled_departure - cte.scheduled_arrival) > make_interval(hours := 1)
      AND (f.scheduled_departure - cte.scheduled_arrival) < make_interval(hours := 48)
      AND cte.depth + 1 <= 3 -- максимум 3 пересадки
      AND r.arrival_airport IN ('VKO', 'SVO', 'BKA', 'DME', 'OSF')
)
SELECT
    ct.id,
    ct.depth,
    ct.flight_chain,
    array_to_string(ct.airport_chain, ' → ') AS route,
    ct.departure_airport,
    ct.arrival_airport,
    ct.scheduled_departure,
    ct.scheduled_arrival,
    ct.scheduled_arrival - ct.scheduled_departure AS total_duration,
    ct.price
FROM cte ct
WHERE ct.arrival_airport IN ('VKO', 'SVO', 'BKA', 'DME', 'OSF')
AND ct.depth > 1
AND NOT EXISTS (
    SELECT
        1
    FROM flights f
     JOIN routes r ON f.route_no = r.route_no
     JOIN segments s on s.flight_id = f.flight_id
    AND r.departure_airport NOT IN ('VKO', 'SVO', 'BKA', 'DME', 'OSF')
    AND s.price < ct.price
)
ORDER BY ct.id, ct.depth
LIMIT 1000;
```

## 15.4

Постройте пример запроса, в котором применение общих табличных выражений приводит к значительному ухудшению времени выполнения


В книге указана устаревшая информация. Книга вышла в 2020 году, вероятно ее писали до выхода Postgres 12 (3 октября 2019 года).

В релиз Postgres 12 вошло улучшение работы с CTE, а именно автоматическое встраивание в запрос без материализации с возможностью переопредлить это поведение.


```sql
EXPLAIN ANALYZE
WITH bad_cte AS MATERIALIZED (
    SELECT route_no, COUNT(*) FROM flights
    GROUP BY route_no
)

SELECT COUNT(*) FROM bad_cte as f 
 WHERE route_no = 'PG0001' 
```

В данном примере произойдет seq scan по flights с аггрегацией, а уже после фильтрация

## 15.5

Постройте функциональный индекс, используя приведение значения к верхнему регистру (функция upper), и приведите пример запроса для которого такой индекс сокращает время выполнения

Пример запроса:

```sql
EXPLAIN (ANALYZE, costs off)
WITH pass_info AS (
    SELECT t.book_ref,
           t.passenger_name
    FROM tickets t
    
)
SELECT *
FROM pass_info
WHERE UPPER(book_ref) = UPPER('UEX925')
ORDER BY passenger_name
```

Без индекса происходит Seq Scan по tickets с фильтрацией

```sql
CREATE INDEX ticket_upper_book_ref ON tickets (UPPER(book_ref));
```

С индексом происходит Bitmap Index Scan по новому индексу и запрос происходит намного быстрее

## 15.6

Постройте частичный индекс, в котором исключаются строки, содержащие значение NULL, и приведите пример запроса, для которого этот индекс улучшает время выполнения

```sql
EXPLAIN (ANALYZE, COSTS OFF)
SELECT COUNT(*) FROM flights WHERE flights.actual_arrival IS NULL
```

Seq Scan с фильтром

```sql
CREATE INDEX idx_flights_actual_arrival_not_null ON flights (actual_arrival)
WHERE actual_arrival IS NULL
```

После создания индекса - Index Only Scan на новом индексе

## 15.7

Напишите запрос, подсчитывающий количество пассажиров на каждом рейсе и среднее количество пассажиров на рейсах, следующих в тот же день по тому же маршруту. Выведите только рейсы следующие по маршрутам, по которым имеется несколько рейсов в один день

```sql
--EXPLAIN (ANALYZE, COSTS OFF)
WITH flight_passengers AS (
    SELECT
        f.flight_id,
        f.route_no,
        f.scheduled_departure::DATE AS flight_date,
        COUNT(s.flight_id) AS passenger_count
    FROM flights f
    JOIN segments s ON s.flight_id = f.flight_id
    GROUP BY f.flight_id, route_no, f.scheduled_departure::DATE
),
daily_route_stats AS (
     SELECT
         flight_id,
         route_no,
         flight_date,
         passenger_count,
         COUNT(*) OVER (PARTITION BY flight_id, flight_date) AS flights_in_day,
         AVG(passenger_count) OVER (PARTITION BY route_no, flight_date) AS avg_passengers_in_group
     FROM flight_passengers
)
SELECT
    flight_id,
    passenger_count,
    ROUND(avg_passengers_in_group, 2) AS avg_passengers_in_group,
    flights_in_day
FROM daily_route_stats
WHERE flights_in_day > 1
ORDER BY route_no, flight_date, flight_id;
```

## 15.8

Создайте материализованное представление, наиболее существенно сокращающее время выполнения запроса из упражнения 15.7

Материализованное представление имхо вообще бесполезная вещь. Это могла бы быть шикарная функция автоматического сбора Read Model без необходимости самому вести эту read model в коде

Но материализованное представление просто сохраняет информацию в себе как в табличке и ничего автоматически не обновляет. Можно написать джобу, которая делает refresh, но это очень плохая затея, тк вся суть Eventual Contistency в том, что ты потихоньку обновляешь read model и у данных есть небольшой дифф. В случае же материализованных представлений diff может быть просто огромным, так еще и нужно написать джобу, которая раз в какое-то время будет все данные актуализировать.