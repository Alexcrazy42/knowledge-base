# Patterns

В этом решении представлены классические паттерны на уровне организации кода

Порождающие паттерны:

1. Abstract Factory
2. Builder
3. Factory Method
4. Prototype
5. Singleton

Структурные паттерны:

1. Adapter
2. Bridge
3. Composite
4. Decorator
5. Facade
6. Flyweight
7. Proxy

Паттерны поведения:

1. Chain of Responsibility
2. Command
3. Interpreter
4. Iterator
5. Mediator
6. Memento
7. Observer
8. State
9. Strategy
10. Template Method
11. Visitor


Дополнительные паттерны

Архитектурные паттерны:
1. Dependency Injection - Внедрение зависимостей вместо жесткого связывания
2. Repository - абстракция доступа к данным
3. CQRS - разделение команд и запросов
4. Event Sourcing - Хранение состостояния, как последовательность событий
5. Specification — фильтрация и валидация в DDD.

Многопоточность:
1. Double-Checked Locking - Оптимизированный потокобезопасный Singleton
2. Producer-Consumer - Асинхронная обработка задач через очередь
3. Monitor (Lock/Mutex) - синхронизация потоков
4. Reactor/Proactor — паттерны для асинхронного ввода-вывода.

Тестирование:
1. Mock/Fake/Stub - тестовые заглушки
2. Test Data Builder - генерация тестовых данных

Паттерны при работе с БД:
1. Unit of Work — управление транзакциями.
2. Identity Map — кеширование объектов.
3. Lazy Loading — отложенная загрузка данных.




# Микросервисные паттерны

## 1. Коммуникация между сервисами

### Синхронные паттерны
- **API Gateway** - Единая точка входа для клиентов (маршрутизация, аутентификация, кеширование)
- **Backend for Frontend (BFF)** - Специализированный шлюз под конкретный клиент (Web, Mobile, TV)
- **Service Mesh** (Istio, Linkerd) - Управление коммуникацией через sidecar-прокси (например, Envoy)

### Асинхронные паттерны
- **Event-Driven Architecture (EDA)** - Общение через события (Kafka, RabbitMQ)
- **Publisher-Subscriber** - Широковещательная рассылка событий
- **Choreography** - Сервисы координируют работу через события (без центрального оркестратора)
- **Orchestration** - Централизованное управление процессами (например, через Saga Pattern)

## 2. Управление транзакциями и данными
- **Saga Pattern** - Долгие транзакции, разбитые на этапы с компенсирующими действиями
  - **Choreography-Based Saga** - Сервисы сами запускают события
  - **Orchestration-Based Saga** - Центральный координатор управляет процессом
- **CQRS** (Command Query Responsibility Segregation) - Разделение моделей для чтения и записи
- **Event Sourcing** - Хранение состояния как последовательности событий
- **Transactional Outbox** - Запись событий в БД перед отправкой в брокер (для гарантированной доставки)
- **Two-Phase Commit (2PC)** - Координация распределённых транзакций (редко в микросервисах из-за сложности)

## 3. Отказоустойчивость и стабильность
- **Circuit Breaker** - Автоматическое отключение сломанных сервисов (например, Polly в .NET)
- **Retry Pattern** - Повторные попытки вызова с экспоненциальной задержкой
- **Bulkhead** - Изоляция ресурсов (чтобы сбой одного сервиса не убил всю систему)
- **Rate Limiter** - Ограничение числа запросов (например, Token Bucket)
- **Dead Letter Queue (DLQ)** - Хранение неудачных сообщений для последующего анализа
- **Health Check API** - Мониторинг состояния сервисов (используется в Kubernetes)

## 4. Масштабирование и развёртывание
- **Sidecar Pattern** - Вынос инфраструктурных задач в отдельный контейнер (логирование, кеширование)
- **Strangler Fig Pattern** - Постепенная замена монолита на микросервисы
- **Blue-Green Deployment** - Бесшовное обновление с двумя идентичными окружениями
- **Canary Release** - Постепенный rollout новой версии для части пользователей

## 5. Безопасность
- **OAuth2 / JWT** - Аутентификация и авторизация
- **API Token** - Использование ключей для доступа к API
- **Zero Trust Architecture** - Постоянная проверка безопасности запросов

## 6. Наблюдаемость (Observability)
- **Distributed Tracing** (Jaeger, Zipkin) - Трекинг запроса через несколько сервисов
- **Centralized Logging** (ELK Stack) - Сбор логов в одном месте
- **Metrics Collection** (Prometheus + Grafana) - Мониторинг производительности

## Примеры реализации

### Circuit Breaker (Polly)

```
var policy = Policy
    .Handle<HttpRequestException>()
    .CircuitBreaker(
        exceptionsAllowedBeforeBreaking: 3,
        durationOfBreak: TimeSpan.FromSeconds(30)
    );
policy.Execute(() => httpClient.GetAsync("https://api/service"));
```


### Saga

```
public class OrderSaga
{
    public void Execute(Order order)
    {
        try
        {
            _paymentService.Process(order);
            _inventoryService.Reserve(order);
            _shippingService.Schedule(order);
        }
        catch
        {
            _paymentService.Rollback(order); // Компенсирующее действие
        }
    }
}
```