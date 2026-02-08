## Other Useful patterns

Когнитивные принципы
    ↓ (формируют mindset)
DDD, GRASP, TDD/BDD
    ↓ (определяют структуру)
Архитектурные паттерны: Hexagonal, CQRS, Microservices
    ↓ (реализуют через)
Интеграционные паттерны: EIP, Saga, Circuit Breaker
    ↓ (строят из)
GoF-паттерны: Strategy, Observer, Command, Decorator...
    ↓ (используют)
Языковые идиомы: DI, async/await, RAII, monads...


## GRASP — General Responsibility Assignment Software Patterns

Помогают ответить на главный вопрос ООП: "Кому (какому классу/методу) поручить эту ответственность?"

1. Information Expert
Ответственность следует назначать тому классу, у которого есть вся необходимая информация.
📌 Идея: избегай «классов-рассыльных», которые бегают за данными. Делай поведение ближе к данным.

Пример:
```
// ❌ Плохо: внешний сервис лезет внутрь Order
class OrderCalculator {
  public double calculateTotal(Order order) {
    double sum = 0;
    for (OrderItem item : order.getItems()) { // нарушает инкапсуляцию!
      sum += item.getProduct().getPrice() * item.getQuantity();
    }
    return sum;
  }
}

// ✅ Хорошо: Order — Information Expert по своим позициям
class Order {
  private List<OrderItem> items;

  public double getTotal() { // поведение рядом с данными
    return items.stream()
                .mapToDouble(item -> item.getProduct().getPrice() * item.getQuantity())
                .sum();
  }
}
```

💡 Это основа для Tell, Don’t Ask и высокой связности (High Cohesion).

2. Creator
Кто должен создавать экземпляр класса A? Тот кто: содержит или агрегирует A; записывает A; использует A интенсивно; имеет инициирующие данные A.

💡 Это естественно ведёт к фабрикам внутри агрегатов в DDD.

Пример: Кто создает OrderItem?

```
// Order содержит OrderItem → Order — Creator
class Order {
  public void addItem(Product product, int quantity) {
    // ✅ Order создаёт OrderItem — у него есть данные (product, quantity)
    this.items.add(new OrderItem(product, quantity));
  }
}
```

3. Controller
Кто обрабатывает входящее системное событие (например, вызов UI или API)?
Объект представляющий: саму систему (OrderSystem), сценарий/кейс использования (PlaceOrderController), актора (CustomerController). Но не UI и не domain-объект напрямую

💡 Controller — это координатор, а не исполнитель. Он должен быть «тонким».

✅ Пример (в стиле MVC/Hexagonal):
```
// ✅ Controller — точка входа, но не бизнес-логика
@RestController
public class OrderController {
  private final PlaceOrderUseCase placeOrder; // ← делегирует!

  @PostMapping("/orders")
  public ResponseEntity<OrderDto> createOrder(@RequestBody CreateOrderRequest req) {
    Order order = placeOrder.execute(req); // ← всё поведение — внутри use case
    return ResponseEntity.ok(OrderDto.from(order));
  }
}
```

4. Low coupling. Низкая связанность

🎯 Назначай ответственность так, чтобы зависимости между классами были минимальны.

💡 Это основа для Dependency Inversion Principle (DIP) и Hexagonal Architecture.

```
// ❌ Плохо: жёсткая зависимость от Spring Data
class Order {
  @Autowired private OrderRepository repo; // ← нарушает Low Coupling + SRP!
  public void save() { repo.save(this); }
}

// ✅ Хорошо: Order ничего не знает о сохранении
interface OrderRepository {
  void save(Order order);
}

class OrderService {
  private OrderRepository repo; // внедряется извне (DI)
  public void placeOrder(Order order) {
    // валидация, бизнес-логика...
    repo.save(order); // ← инверсия зависимости
  }
}
```

5. High Cohesion. Высокая связность

🎯 Класс/модуль должен решать одну чёткую задачу — без "размазанной" ответственности.
💡 High Cohesion + Low Coupling = гибкость и тестируемость.

```
// ❌ Низкая связность: Order делает всё
class Order {
  void calculateTotal() { ... }
  void validate() { ... }
  void sendEmail() { ... }    // ← не его дело!
  void saveToDatabase() { ... } // ← тоже не его!
}

// ✅ Высокая связность:
class Order {                 // → только данные + простые вычисления
  getTotal() { ... }
  isValid() { ... }
}

class OrderValidator {        // → только валидация
  validate(Order o) { ... }
}

class OrderEmailService {     // → только рассылка
  sendConfirmation(Order o) { ... }
}
```

6. Polymorphism

🎯 Когда поведение меняется в зависимости от типа — используй полиморфизм, а не if/switch.
💡 Это реализация паттерна Strategy — но GRASP объясняет, почему его использовать.

```
// ❌ Антипаттерн: if-адская
class ShippingService {
  double calculateCost(Order o) {
    if (o.getShippingType().equals("EXPRESS")) {
      return 100 + o.getTotal() * 0.1;
    } else if (o.getShippingType().equals("STANDARD")) {
      return 50;
    }
    // ... и растёт
  }
}

// ✅ Полиморфизм: поведение — в типе
interface ShippingStrategy {
  double calculateCost(Order order);
}

class ExpressShipping implements ShippingStrategy {
  public double calculateCost(Order o) {
    return 100 + o.getTotal() * 0.1;
  }
}

class StandardShipping implements ShippingStrategy {
  public double calculateCost(Order o) {
    return 50;
  }
}

// Использование:
order.setShipping(new ExpressShipping());
double cost = order.getShipping().calculateCost(order);
```

7. Pure Fabrication

🎯 Создай искусственный класс (не из предметной области), чтобы обеспечить Low Coupling и High Cohesion.
💡 Это основа для Repository, Service, Adapter — "технических" классов.

📌 Иногда domain-объекты не могут взять на себя ответственность (например, сохранение), но и давать её другим domain-классам — плохо.

✅ Пример:
Order не должен сохранять себя. Customer — тоже не должен.
→ Создаём фабрикацию — OrderRepository.

```
// Order — domain-объект
class Order { ... }

// OrderRepository — Pure Fabrication: его нет в реальном мире, но он нужен для архитектуры
interface OrderRepository {
  Order findById(String id);
  void save(Order order);
}
```

8. Indirection

🎯 Вставь промежуточный объект, чтобы уменьшить связанность.
💡 Indirection — ключ к тестируемости, заменимости и расширяемости.

📌 Это обобщение Pure Fabrication, Adapter, Facade, Proxy.

✅ Пример — оплата через сторонний сервис:
```
// ❌ Плохо: Order напрямую зависит от Stripe
class Order {
  void processPayment() {
    StripeClient client = new StripeClient(); // ← жёсткая связь!
    client.charge(...);
  }
}

// ✅ Indirection через интерфейс
interface PaymentGateway {
  PaymentResult charge(Money amount, Card card);
}

class StripePaymentGateway implements PaymentGateway { ... }
class FakePaymentGateway implements PaymentGateway { ... } // для тестов

class OrderService {
  private PaymentGateway gateway; // внедряется

  void processOrder(Order o) {
    gateway.charge(o.getTotal(), o.getCard()); // ← не знает про Stripe!
  }
```

9. Protected Variations
🎯 Определи точки нестабильности (изменений) и защити остальную систему с помощью стабильного интерфейса.
📌 Это эволюция Indirection + Polymorphism.

💡 Это основа для Open-Closed Principle (OCP).

✅ Пример:
Завтра придёт требование — поддержка PayPal, Tinkoff, Crypto.
→ Вариация: способ оплаты.

```
// Стабильный интерфейс — «защита» от изменений
interface PaymentProcessor {
  void process(PaymentRequest req);
}

// Реализации — могут меняться/добавляться
class StripeProcessor implements PaymentProcessor { ... }
class PayPalProcessor implements PaymentProcessor { ... }

// Клиент (OrderService) зависит ТОЛЬКО от интерфейса
class OrderService {
  private PaymentProcessor processor; // ← Protected Variations работает!
}
```

📌 Практический чек-лист при проектировании
Когда назначаешь ответственность — задай себе:

Information Expert: у кого есть нужные данные?
Creator: кто логически «владеет» этим объектом?
Controller: кто координирует сценарий?
Low Coupling: не создаю ли я новую жёсткую связь?
High Cohesion: не размазываю ли я ответственность?
Polymorphism: не пишу ли я if (type == …)?
Pure Fabrication: нужен ли "сервисный" класс для инфраструктуры?
Indirection: можно ли вставить прослойку для гибкости?
Protected Variations: что может измениться завтра? Как защититься?


## Паттерны интеграции (Enterprise Integration Patterns — EIP)

Enterprise Integration Patterns (EIP) — это фундаментальный свод паттернов для проектирования асинхронных, распределённых, отказоустойчивых систем, где компоненты взаимодействуют через сообщения (messages).

💡 Суть EIP:
«Как переслать информацию от А к Б, если они: работают независимо,  имеют разные форматы,  могут падать, нагружаются по-разному?»

- Создание и маршрутизация сообщений
Канал передачи сообщений
Направление сообщение на основе содержимого/заголовков
Направления сообщения на основе тела сообщения
Отправляет одно сообщение нескольким получателям
Splitter - разбивает сообщение на несколько простых
Aggregator - собирает несколько сообщений в одно (ожидает N частей или таймаут)
Resequencer - восстанавливает порядок сообщений, если они пришли перепутанными

- Трансформация сообщений
Message Translator - перевод сообщения между форматами
Content Enricher - Добавляет данные в сообщение из внешнего источника.
ContentFilter - удаляет лишние поля из сообщений
Normalizer - приводит разные форматы к единому каноническому

- Обработка ошибок и надежность
Guaranteed Delivery
Idempotent Receiver
DLQ
Retry with exp backoff

- Синхронизация и составные процессы
ProcessManager - Saga Orchestration - централизованный координатор через события (микросервисных транзакций)
Choreography - Распределённая координация через события (без центрального оркестратора)
Scatter-Gather - Отправить запрос N получателям → собрать и агрегировать ответы (Сравнить цены у 5 поставщиков и выбрать минимальную)



## Паттерны для тестирования

1. Паттерны проектирования тестов (Test Design Patterns)

Dummy - Объект нужен «для галочки» (не используется в тесте).
Stub - Возвращает заготовленные данные (read-only).
Spy - Записывает, как его вызывали (для проверки взаимодействия).
Mock - Устанавливает ожидания поведения (должен быть вызван N раз с такими-то аргументами).
Fake - «Рабочая», но упрощённая реализация (например, in-memory БД).

«Сущности должны быть не контейнерами данных, а носителями поведения. Их методы — глаголы предметной области». - не надо все в сервисе хранить, нужно чтобы все было в entity, чтобы это удобнее было читать, поддерживать, тестировать
Даже если нужны допдействия во внешнем сервисе, то это исключительно асинхронно. Если нужны проверки в доп сервисе - скорее всего спроектировано неправильно, тк такая логика недолжна быть в разных сервисах и быть синхронной.
Если уже приходится с этим работать - внутри service синхронно вызываешь - в домен прокидываешь то, что получил в ответ

Таблица переходов между состояниями сущности - Enum + Guard методы хороший варинт


## Supporting Objects (Вспомогательные объекты)

Краткая таблица:

| Суффикс     | Роль                            | Пример                               |
|-------------| ------------------------------- | ------------------------------------ |
| Manager     | Управляет жизненным циклом      | SessionManager, ConnectionManager    |
| Handler     | Обрабатывает запросы/события    | CreateOrderHandler, ExceptionHandler |
| Builder     | Создаёт сложные объекты         | QueryBuilder, EmailBuilder           |
| Resolver    | Выбирает реализацию             | PaymentProviderResolver              |
| Coordinator | Координирует несколько сервисов | OrderCoordinator                     |
| Adapter     | Адаптирует интерфейсы           | LegacyPaymentAdapter                 |
| Mapper      | Преобразует типы                | OrderMapper, DtoMapper               |
| Validator   | Проверяет данные                | OrderValidator                       |
| Processor   | Обрабатывает/трансформирует     | ImageProcessor, PayrollProcessor     |
| Aggregator  | Собирает из источников          | DashboardAggregator                  |
| Enricher    | Добавляет информацию            | OrderEnricher                        |
| Decorator   | Добавляет функциональность      | LoggingDecorator                     |
| Context     | Хранит общую информацию         | ExecutionContext, HttpContext        |

Отдельно по каждому:

1. Manager
В себе хранит другие объекты, выдает к ним доступ, или проксирует с какой-то доп логикой
2. Handler
Обычный метод, который обрабатывает какой-то тип запроса (Command, Query)
3. Builder
Создание сложных объектов пошагово
4. Resolver
Внутри себя знает некоторые реализации и знает как выдать нужную
5. Coordinator
В себе имеет несколько других классов и координирует их работу вместе. Мне больше нравится название Service
6. Adapter
GoF паттерн с адаптированием одного интерфейса в другой. В себе может включать много доп действий
7. Mapper
Тут все просто - преобразование одного объекта в другой
8. Validator
Валидация конкретного класса
9. Processor
Можно спутать с Handler или Service, но такое название подразумевает, что происходит обработка и трансформация (ImageProcessor, PayrollProcessor)
10. Aggregator
Собирает данные из нескольких источников и выдает результат
11. Enricher
Принимает на вход объект и дополняет его дополнительной информацией
12. Decorator
Добавление функциональности без изменения другого класса (добавление логов, кэша и тд). Действия обязательно идемпотентны, чтобы следующая логика не опиралась на поломанный инвариант
13. Context
Содержит общую информацию для группы операций

#### Дополненная таблица

| Суффикс      | Роль                             | Пример                                  |
| ------------ | -------------------------------- | --------------------------------------- |
| Manager      | Управляет жизненным циклом       | SessionManager, ConnectionManager       |
| Handler      | Обрабатывает запросы/события     | CreateOrderHandler, ExceptionHandler    |
| Builder      | Создаёт сложные объекты          | QueryBuilder, EmailBuilder              |
| Resolver     | Выбирает реализацию              | PaymentProviderResolver                 |
| Coordinator  | Координирует несколько сервисов  | OrderCoordinator                        |
| Adapter      | Адаптирует интерфейсы            | LegacyPaymentAdapter                    |
| Mapper       | Преобразует типы                 | OrderMapper, DtoMapper                  |
| Validator    | Проверяет данные                 | OrderValidator                          |
| Processor    | Обрабатывает/трансформирует      | ImageProcessor, PayrollProcessor        |
| Aggregator   | Собирает из источников           | DashboardAggregator                     |
| Enricher     | Добавляет информацию             | OrderEnricher                           |
| Decorator    | Добавляет функциональность       | LoggingDecorator                        |
| Context      | Хранит общую информацию          | ExecutionContext, HttpContext           |
| Factory      | Создаёт объекты по условиям      | PaymentFactory, NotificationFactory     |
| Provider     | Предоставляет зависимости/данные | ConfigurationProvider, DataProvider     |
| Repository   | Инкапсулирует доступ к данным    | OrderRepository, UserRepository         |
| Service      | Бизнес-логика                    | OrderService, EmailService              |
| Strategy     | Алгоритм/стратегия выполнения    | PricingStrategy, SortingStrategy        |
| Policy       | Правила поведения                | RetryPolicy, CachePolicy                |
| Filter       | Фильтрует коллекции/данные       | AuthorizationFilter, ValidationFilter   |
| Guard        | Проверяет условия входа          | AuthenticationGuard, RoleGuard          |
| Interceptor  | Перехватывает вызовы             | LoggingInterceptor, CacheInterceptor    |
| Observer     | Наблюдает за изменениями         | FileSystemObserver, EventObserver       |
| Publisher    | Публикует события                | EventPublisher, MessagePublisher        |
| Subscriber   | Подписывается на события         | OrderSubscriber, NotificationSubscriber |
| Consumer     | Потребляет сообщения/данные      | QueueConsumer, KafkaConsumer            |
| Producer     | Производит сообщения/данные      | EventProducer, MessageProducer          |
| Serializer   | Сериализует данные               | JsonSerializer, XmlSerializer           |
| Deserializer | Десериализует данные             | JsonDeserializer, ProtobufDeserializer  |
| Converter    | Конвертирует типы                | CurrencyConverter, DateTimeConverter    |
| Transformer  | Трансформирует структуру         | DataTransformer, XmlTransformer         |
| Formatter    | Форматирует вывод                | DateFormatter, MoneyFormatter           |
| Parser       | Парсит строки/данные             | JsonParser, QueryParser                 |
| Scheduler    | Планирует задачи                 | JobScheduler, TaskScheduler             |
| Executor     | Выполняет задачи                 | CommandExecutor, QueryExecutor          |
| Dispatcher   | Распределяет задачи              | EventDispatcher, JobDispatcher          |
| Locator      | Находит сервисы/ресурсы          | ServiceLocator, ResourceLocator         |
| Registry     | Реестр объектов                  | ServiceRegistry, PluginRegistry         |
| Cache        | Кеширует данные                  | MemoryCache, DistributedCache           |
| Store        | Хранит состояние                 | StateStore, SessionStore                |
| Queue        | Очередь задач                    | MessageQueue, TaskQueue                 |
| Pool         | Пул переиспользуемых объектов    | ConnectionPool, ThreadPool              |
| Monitor      | Мониторит состояние              | HealthMonitor, PerformanceMonitor       |
| Tracker      | Отслеживает изменения            | ChangeTracker, ActivityTracker          |
| Logger       | Логирует события                 | FileLogger, ConsoleLogger               |
| Auditor      | Аудит действий                   | SecurityAuditor, ChangeAuditor          |
| Profiler     | Профилирует производительность   | MemoryProfiler, QueryProfiler           |
| Analyzer     | Анализирует данные               | SentimentAnalyzer, CodeAnalyzer         |
| Calculator   | Вычисляет значения               | PriceCalculator, TaxCalculator          |
| Generator    | Генерирует данные                | IdGenerator, ReportGenerator            |
| Renderer     | Рендерит представление           | HtmlRenderer, PdfRenderer               |
| Exporter     | Экспортирует данные              | CsvExporter, ExcelExporter              |
| Importer     | Импортирует данные               | DataImporter, ConfigImporter            |
| Compiler     | Компилирует код/шаблоны          | TemplateCompiler, ExpressionCompiler    |
| Evaluator    | Оценивает выражения              | ExpressionEvaluator, RuleEvaluator      |
| Comparator   | Сравнивает объекты               | PriceComparator, VersionComparator      |
| Matcher      | Сопоставляет паттерны            | RouteMatcher, PatternMatcher            |
| Detector     | Обнаруживает условия             | FraudDetector, AnomalyDetector          |
| Extractor    | Извлекает данные                 | MetadataExtractor, FeatureExtractor     |
| Compressor   | Сжимает данные                   | GzipCompressor, ImageCompressor         |
| Encryptor    | Шифрует данные                   | AesEncryptor, PasswordEncryptor         |
| Decryptor    | Расшифровывает данные            | TokenDecryptor, DataDecryptor           |
| Signer       | Подписывает данные               | JwtSigner, DocumentSigner               |
| Verifier     | Проверяет подпись/токены         | TokenVerifier, SignatureVerifier        |
| Sanitizer    | Очищает данные                   | HtmlSanitizer, InputSanitizer           |
| Throttler    | Ограничивает частоту             | RateThrottler, RequestThrottler         |
| Limiter      | Ограничивает ресурсы             | RateLimiter, ConcurrencyLimiter         |
