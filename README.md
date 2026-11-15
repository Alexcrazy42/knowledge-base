# knowledge-base

Инженерная песочница: здесь я разбираю концепции бэкенда и архитектуры и довожу их до рабочего кода, который можно запустить, сравнить и обсудить по trade-offs.

## Чем этот репозиторий ценен

- **Одна доменная модель — 8 архитектур.** Канбан-доска реализована на MVC, MVP, MVVM, FSD и SDUI: ASP.NET Core, WinForms, WPF, Vanilla JS, Vue, Angular, React.
- **Не только теория.** OAuth/OIDC с GitHub и OpenIddict, фоновые задачи, TCP-сервер, SignalR-чат, real-time через polling / SSE / WebSocket.
- **System design на практике.** Tour Aggregator с pipeline ценообразования (Chain of Responsibility + Strategy), CAP, Saga, Outbox, идемпотентность, DLQ.
- **Наблюдаемость изнутри.** OpenTelemetry → Jaeger, Prometheus, ELK, distributed tracing между сервисами через Kafka.

## Зоны интересов

Бэкенд на .NET, проектирование распределённых систем, архитектура приложений, авторизация, фоновые процессы, рекомендательные системы. Frontend — в части архитектуры, контрактов и интеграции.

## Сильные стороны

- Довожу абстракцию до реализации: паттерн, протокол или архитектура превращаются в запускаемый проект.
- Сравниваю подходы на одной задаче, а не заучиваю определения.
- Думаю категориями trade-offs: согласованность, отказоустойчивость, границы сервисов, стоимость поддержки.
- Организовываю связь backend ↔ frontend: контракты API, Server-Driven UI, выбор транспорта для real-time.

## Разделы

| Раздел | Что внутри |
|--------|------------|
| [`backend/`](backend/) | Авторизация (OAuth/OIDC/OpenIddict), GoF-паттерны на C#, фоновые задачи, observability, рекомендательные системы |
| [`system_design/`](system_design/) | System & Architecture Design: CAP, микросервисы, Saga/Outbox, [Tour Aggregator](system_design/architecture_design/tour_aggregator/) |
| [`frontend/`](frontend/) | [UI architecture playground](frontend/ui-architecture-playground/), [real-time транспорт](frontend/data-streaming-playground/), React, TypeScript, Vue, Angular, вёрстка |
| [`dbs/`](dbs/) | PostgreSQL и MSSQL (joins, агрегаты, оконные функции), EF Core, linq2db |
| [`micro-projects/`](micro-projects/) | Сквозные мини-сервисы: BuyList, RealTimeChat на SignalR, TcpIp |
| [`structure/`](structure/) | Конспекты Clean Code и Clean Architecture |
| [`ai/`](ai/), [`languages/python/`](languages/python/) | Устройство агентов и LLM, Python, формальные грамматики |

## С чего начать

1. [UI architecture playground](frontend/ui-architecture-playground/) — одна задача, восемь архитектур.
2. [Real-time playground](frontend/data-streaming-playground/) — polling, SSE, WebSocket и файлы.
3. [Auth workshop](backend/auth/) — OAuth/OIDC-флоу и .NET-реализация.
4. [Jobs](backend/jobs/) — жизненный цикл фоновых задач и наблюдаемость.

## Стек

.NET 9 / ASP.NET Core / EF Core / SignalR / OpenIddict · PostgreSQL / MSSQL · Docker · OpenTelemetry / Jaeger / Prometheus / ELK / Kafka / Redis · React 19 / TypeScript / Vite / Zustand / React Router / Redux
