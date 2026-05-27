
# Аналоги функций MS SQL в PostgreSQL

Этот документ описывает, как реализовать функционал Linked Servers, Service Broker и HTTP-вызовов в экосистеме PostgreSQL.

## 1. Linked Server → Foreign Data Wrappers (FDW)

В PostgreSQL используется стандарт **SQL/MED**. Позволяет обращаться к удаленным данным как к локальным таблицам.

### Основной инструмент: `postgres_fdw`
Используется для подключения к другим базам PostgreSQL. Существуют также FDW для MySQL, Oracle, MongoDB, REST API и др.

**Пример настройки:**

```sql
-- 1. Установка расширения
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- 2. Создание сервера (connection string)
CREATE SERVER remote_server
    FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (host '192.168.1.50', port '5432', dbname 'remote_db');

-- 3. Маппинг пользователей (локальный юзер -> удаленный юзер)
CREATE USER MAPPING FOR current_user
    SERVER remote_server
    OPTIONS (user 'remote_user', password 'secret');

-- 4. Создание внешней таблицы (схема данных должна совпадать)
CREATE FOREIGN TABLE remote_users (
    id integer,
    name text
)
SERVER remote_server
OPTIONS (schema_name 'public', table_name 'users');

-- 5. Использование (прозрачная работа, поддержка JOIN и WHERE push-down)
SELECT * FROM remote_users WHERE id = 1;
```

---

## 2. Service Broker → Очереди и Уведомления

В PG нет единого монолитного аналога Service Broker. Выбор инструмента зависит от задачи.

### А. Легкие уведомления (Fire-and-Forget)
**Инструмент:** `LISTEN` / `NOTIFY`
*   **Суть:** Механизм Pub/Sub внутри базы.
*   **Ограничение:** Сообщения не сохраняются, если подписчик离线 (offline).
*   **Применение:** Обновление кэша, сигналы триггеров, real-time UI.

```sql
-- Подписчик
LISTEN my_channel;

-- Издатель (в триггере или коде)
NOTIFY my_channel, 'payload_data';
```

### Б. Надежные очереди (Persistent Queues)
Если нужна гарантия доставки и транзакционность (как очереди Service Broker):

1.  **Расширение `pgmq`** (Рекомендуемый современный вариант):
    *   Добавляет API очередей (похож на AWS SQS/RabbitMQ) прямо в SQL.
    *   Поддерживает отложенные сообщения, повторные попытки (retry).
    ```sql
    SELECT pgmq.create('my_queue');
    SELECT pgmq.send('my_queue', '{"msg": "hello"}');
    SELECT pgmq.read('my_queue', 10, 1); -- Чтение с блокировкой на 10 сек
    ```

2.  **Паттерн `SKIP LOCKED`** (Native SQL):
    *   Использование обычной таблицы как очереди.
    *   Высокая производительность, не требует расширений.
    ```sql
    -- Consumer забирает сообщение и блокирует его для других
    DELETE FROM messages 
    WHERE id = (SELECT id FROM messages ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED)
    RETURNING *;
    ```

3.  **Внешние брокеры:**
    *   Для высоких нагрузок данные выносятся в **RabbitMQ**, **Kafka** или **NATS**, а PG используется только как хранилище состояния.

---

## 3. API Вызовы (HTTP) → Расширения процедурных языков

В PG нет встроенной системной процедуры типа `sp_OAMethod`. HTTP-запросы выполняются через расширения.

### А. Расширение `http` (pg_http)
Самый простой способ делать REST-запросы из SQL.

```sql
CREATE EXTENSION http;

-- GET запрос
SELECT * FROM http_get('https://api.example.com/users/1');

-- POST запрос (JSON)
SELECT * FROM http_post(
    'https://api.example.com/users',
    content := '{"name": "Ivan"}',
    content_type := 'application/json'
);
```
*Результат возвращается в виде набора строк (status_code, content, headers).*

### Б. PL/Python или PL/JavaScript
Для сложной логики обработки ответов или нестандартных протоколов.

```sql
CREATE EXTENSION plpython3u; -- Требует установленного Python на сервере

CREATE OR REPLACE FUNCTION get_api_data(url text) RETURNS text AS $$
    import urllib.request
    response = urllib.request.urlopen(url)
    return response.read().decode('utf-8')
$$ LANGUAGE plpython3u;

SELECT get_api_data('https://api.example.com/data');
```

### В. Архитектурный подход (Webhooks)
В продакшене часто избегают HTTP-вызовов внутри транзакций БД (это медленно и блокирует ресурсы).
*   **Решение:** Триггер в PG пишет событие в таблицу или делает `NOTIFY`.
*   **Воркер:** Внешний сервис (на Go/Python/Node.js) слушает изменения и выполняет HTTP-запрос асинхронно.

---

## Сводная таблица

| Функция MS SQL | Аналог в PostgreSQL | Тип решения |
| :--- | :--- | :--- |
| **Linked Server** | **Foreign Data Wrappers (FDW)** | Нативное (SQL/MED) |
| **Service Broker** (Notifications) | **LISTEN / NOTIFY** | Нативное |
| **Service Broker** (Queues) | **pgmq** или **SKIP LOCKED** | Расширение / SQL Pattern |
| **HTTP Calls** | **http extension** или **PL/Python** | Расширение |