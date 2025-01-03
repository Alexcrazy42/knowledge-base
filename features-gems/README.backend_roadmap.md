Backend roadmap:

БД
    Виды
        Реляционные
        Документоориентированные
        Ключ-значение
        Временные ряды
        Колоночные
        Blob store
        Графовы
    Индексы
        Hash
        BTree
        Spatial
        Bitmap
        Inverted
    Транзакции
        ACID
        BASE
        Уровни изоляции транзакций
    SQL
        DML
        DDL
    OLAP/OLTP

Балансировка нагрузки
    Round Robin
    Weighted roud robin
    Least connections
    Sticky sessions

Проксирование
    Reverse
    Forward

Кэширование
    Виды
        Lazy
        Write-through
        Read-through
        Write-around
    Алгоритмы вытеснения
        LRU, SLRU
        MRU
        LFU
        FIFO
        LIFO
        2Q
        MQ
    Тегирование и версионирование кэша
    Типы
        Внешнее кэширование
        Локальное кэширование

Observability
    Логирование
    Мониторинг
    Трейсинг
    Профайлинг

Паттерны и подходы
    Шардирование
        Горизонтальное
        Вертикальное
    SQRS
    backoff
    pub/sub
    circuit breaker
    gracefull degradation
    polling и streaming
    mapreduce
    serverless
    trottling
    backpressure
    Реаликация
        Подходы
            Блочная
            Физическая
            ЛОгическая
        Виды
            Синхронная
            Асинхронная
        Типы
            С одним ведущим узлом
            С несколькими ведущими узлами
            Без ведущих узлов
    Толстый клиент
    Идемпотентность

Алгоритмы
    Выбор лидера
    Распределенная блокировка
    Распределенная транзакция
    Констистентное хеширование
    Rate limiting
    Консенсус
    Деплой

Архитектуры
    Файл-сервер/клиент-сервер
    Монолитная/Микросервисная
    Трехзвенная
    Событийно-ориентированная
        Event Notification
        State Transfer
        Event Collaboration

Инструменты
    Linux
    Docker
    Kubernetes

Другие темы
    Брокеры сообщений
    CAP-теорема
    Latency, throughput, availability
    SLA, SLO, SLI
    API (SOAP, REST, gRPC, GraphSQL)
    Масштабирование
        Горизонтальное
        Вертикальное
    Индентификация, Аутентификация, Авторизация



сам бэкенд:
middleware
auth
controllers: gin?
swagger
api client
background jobs
api versioning


тесты:
unit
интеграционные
e2e


infra:
postgre/mysql (миграции)
mongo/cassandra
kafka/rabbit
redis
Логирование
Мониторинг
Трейсинг
Профайлинг
NGINX


протоколы:
ws
grpc
https
graphQL