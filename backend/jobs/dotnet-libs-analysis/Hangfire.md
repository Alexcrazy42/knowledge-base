# Разбор исходного кода Hangfire

> **Оглавление**

> - [Вопросы на проверку глубины](#вопросы-на-проверку-глубины)
> - [Hangfire](#hangfire)

---

## Вопросы на проверку глубины

1. Процесс упал между `FetchNextJob` и сменой состояния на `Processing`. Что произойдёт с джобой и через какое время?

Ответ: есть понятие InvisibilityTimeout (по умолчанию 5 минут), через это время если джоба была взята из JobQueue и ничего не произошло она возьмется еще раз

2. Почему `EnqueuedState` — это состояние, а не просто «положили в очередь»? Что было бы, если бы очередь была отдельно от state machine?

В Hangfire жестко отслеживается понятие "состояние". Это нужно для того, чтцобы видеть, что происходит с заданием и что с ним делать дальше. Поэтому пайплайн задания жестко отслеживается

State — это source of truth и точка применения фильтров/хендлеров/статистики/истории. Очередь — это транспортная проекция. Если отделить очередь от state machine, ты получаешь dual-write: задание лежит в очереди, но state не изменён, или state изменён, но в очередь не попало. Плюс теряются фильтры, audit trail, dashboard, retry/expiration-логика.

3. Как `RecurringJobScheduler` защищается от дублирования при 5 серверах и включённом `MisfireHandling`?

DistributedLock на ресурс lock:recurring-job:{id}

4. `IStateHandler.OnStateApplied` упал на середине транзакции. Что закоммитится, что нет, и как это соотносится с `IWriteOnlyTransaction`?

Хендлеры пишут в общий IWriteOnlyTransaction; Commit() вызывается один раз в конце CoreStateMachine.ApplyState; упал один хендлер → Commit не вызван → ничего из батча не персистится (state, history, queue, counters). Но side effects вне транзакции (HTTP, брокер, чужая БД) не откатятся — отсюда контракт: IStateHandler должен быть идемпотентным

5. Где именно принимается решение о ретрае — в elect или apply? И почему `AddToSet("retries")` — это следствие, а не причина?

Решение — в OnStateElection. AddToSet("retries") в OnStateApplied — это индекс для дашборда. Убери OnStateElection — ретрая нет вообще. Убери AddToSet — ретрай работает, дашборд его не показывает.

6. Что произойдёт, если фильтр в `OnStateElection` заменит `CandidateState` на `DeletedState` для `ProcessingState`? (твой пример с `TimeoutAttribute` — проверь, кто и когда вызывает elect-фильтры в этом сценарии.)

Elect-фильтры вызывает StateMachine при попытке смене состояния, StateElection помогает модифицировать привычный пайплайн и заменить переходы между состояниями
Если сменить CandidateState на Deleted, джоба удалится и не выполнится

7. Чем `BackgroundJobServer` отличается от `BackgroundProcessingServer` по ответственности, а не по наследованию?

BackgroundJobServer — это composition root: он собирает storage, state machine, performer, queue, набор IBackgroundProcess и запускает BackgroundProcessingServer.
BackgroundProcessingServer — это generic lifecycle host: dispatcher, threads, start/stop/dispose. Он не знает про job-семантику.

---

## Hangfire

### Клиентский АПИ

**`BackgroundJob`** (static facade) → `Enqueue`, `Schedule`

Гарантии доставки - at-least-once

**`BackgroundJob.Create`** → `new CreateContext(jobStorage, connection, job, state, params)` → `BackgroundJobFactory.Create` (прогоняет список `IClientFilter` и создаёт через `InnerFactory` задачку — `CoreBackgroundJobFactory`).
По факту `IClientFilter` один — `CaptureCultureAttribute`, который в `OnCreating` делает `SetJobParameter` `CurrentCulture` и `CurrentUICulture`.

**`BackgroundJobClient`** (основной интерфейс управления задачами) → `Create`, `ChangeState`

**`Job`** — класс, представляющий действие, которое может быть передано другому процессу для выполнения. Внутри него: `Type`, `MethodInfo`, `Args` (`List<object>`), `Queue`

---

### `BackgroundJobStateChanger`

- `ChangeState`: взять лок на джобу, получить джобу, сменить состояние, удалить из очереди если выполнена.
- Используется в `BackgroundJobClient.ChangeState`, `DelayedJobScheduler.EnqueueBackgroundJob`.

---

### `RecurringJobManager`

- **`AddOrUpdate`**: `connection.GetOrCreateRecurringJob`, после обновить через `UpdateRecurringJob`, внутри которого обновление `Hash` и `Set`.
- **`Trigger`**: получить метаданные `recurringJob` из `Hash`, после создать запись в `Job` и `JobParameters`, после `Enqueue` и `UpdateRecurringJob`.
- **`RemoveIfExists`**: `removeHash('recurring-job:{recurringJobId}')`, `RemoveFromSet("recurring-jobs")`.

---

### `IBackgroundJobPerformer`

```text
Perform(PerformContext: JobStorage, StorageConnection, BackgroundJob, IProfiler, ServerId, Dictionary<string, object> items) -> object
```

- Выполнение метода через рефлексию (дополнительно применение `ServerFilter`) и получение `Instance` объекта через `JobActivator` (`Activator.CreateInstance`) или `AspNetCoreJobActivator`.
- `ServerFilter` пример: `DisableConcurrentExecutionAttribute`, который берёт `DistributedLock` на джобу.

---

### `IBackgroundProcess`

> Provides methods for defining processes that will be executed in a background thread by `BackgroundProcessingServer` (in loop).

- **`Worker`** — тот, кто исполняет `Job` — берёт по одной из `JobQueue` (для MS SQL используется хинт updlock, чтобы брать из JobQueue - отсюда только один поток может взять строчку) и выполняет через `IBackgroundJobPerformer`. Плюсом есть понятие Invisibility Timeout - из JobQueue забираются не только задание с FetchedAt = null, но и там где FetchedAt < DATEADD(second, @invisibilityTimeout, GETUTCDATE()). По умолчанию 5 минут
- **`RecurringJobScheduler`** — взять из `Set` по `score` то, что должно было выполняться + посмотреть, не было ли `misfire`, и зашедулить их тоже через `TriggerRecurringJob` (`JobFactory.Create` — insert `job` и `jobParameter`).
- **`DelayedJobScheduler`** — взять из `set` по `score` и `key = "schedule"`, после `removeFromSet` и добавить в `JobQueue` (через `BackgroundJobStateChanger.StateChange`).
- И ещё множество процессов: `ServerHeartbeat`, `ServerWatchdog`, `ExpirationManager`, `BackgroundJobServer`.

---

### `IBackgroundProcessingServer`

> Интерфейс, представляющий сервер процессинга в фоне.

- Наследники: `BackgroundJobServer` и `BackgroundProcessingServer`.
- Внутри `BackgroundJobServer` в конструкторе собирается список `IBackgroundProcess` и передаётся в конструктор `BackgroundProcessingServer`.
- Внутри конструктора `BackgroundProcessingServer` создаётся `IBackgroundDispatcher`.
- Внутри `BackgroundDispatcher` создаётся массив `threads` и все эти `threads` стартуют.

---

### `IStateMachine`

> Механизм для запуска процессов, связанных с состоянием выборов и применением состояний.

- **`StateMachine`** — через `electFilters` (`OnStateElection`) и `applyFilters` (`OnStateApplied`, `OnStateUnapplied`) + `innerStateMachine.ApplyState` (`CoreStateMachine`).
- **`CoreStateMachine`** — сохранение `state` для джобы и изменения для `job` + обработать все хендлеры (`IStateHandler`) через `_stateHandlersThunk` (какие-то handler, допустим, записывают стату в `counter` и `aggregatecounter`).

---

### `IElectFilter` и `IApplyFilter`

#### `IElectFilter`

> Перехватить и изменить решение о следующем состоянии задачи до того, как оно будет окончательно зафиксировано.

Классический пример из документации Hangfire. Фильтр проверяет, не истекло ли время, отведённое на выполнение задачи. Если да — он подменяет предлагаемое состояние `ProcessingState` на `DeletedState`, и задача просто не выполняется.

```csharp
public sealed class TimeoutAttribute : JobFilterAttribute, IElectStateFilter
{
    private readonly int _hours;

    public TimeoutAttribute(int hours)
    {
        _hours = hours;
    }

    public void OnStateElection(ElectStateContext context)
    {
        if (context.CandidateState is ProcessingState)
        {
            if (context.BackgroundJob.CreatedAt.AddHours(_hours) < DateTime.UtcNow)
            {
                // Задача просрочена — отменяем выполнение
                context.CandidateState = new DeletedState();
            }
        }
    }
}
```

#### `IApplyStateFilter`

> Сделать действия после применения `state`.

- **ElectFilter** — `StatisticsHistoryAttribute`, который реализует `OnStateElection`, внутри которого инкрементирует статистику.
- **ApplyFilter** — `AutomaticRetryAttribute`, который делает `AddToSet("retries", jobId)` на `OnStateApplied` и `RemoveFromSet` на `OnStateUnapplied`.

---

### ServerHeartbeat и ServerWatchdog

ServerHeartbeat - IBackgroundProcess, который делает heartbeat для сервера в схеме

ServerWatchdog - IBackgroundProcess, удаляет из server таблички сервера, где LastHeartbeat < dateadd(ms, @timeoutMsNeg, sysutcdatetime())

---

### Целиком пайплайн и failure matrix

Матрица отказов - системный анализ всех точек, где система может отказать с описанием для каждой точки:

- что именно ломается
- в каком состоянии остаются данные
- что произойдет при восстановлении (автоматически, вручную, никогда)
- через какое время система восстановится
- риск дубля/потери/зависания
- какая митигация нужна

Как построить по шагам:

1. Нарисовать happy path как последовательность шагов с точками IO записи (БД, очередь, http запросы)
2. Для каждого шага задать три вопроса
    2.1. Что если процесс умрёт прямо здесь? (crash между шагами)
    2.2. Что если storage откажет прямо здесь? (сеть, deadlock, timeout)
    2.3. Что если ответ потеряется после успешной записи? (partial failure)
3. Зафиксировать состояние системы в каждой точке
4. Определить recovery: автоматически (через сколько?), через watchdog, через retry, вручную, никогда (потеря)
5. Классифицировать риск
6. Для каждого риска - митигация и алерт

### Full pipeline для Hangfire

```txt
1. Client: BackgroundJob.Enqueue
2. Client: BackgroundJobFactory.Create → state machine Elect
3. Client: CoreStateMachine.ApplyState(EnqueuedState)
4. Client: IWriteOnlyTransaction.Commit()
   → INSERT Job
   → INSERT JobQueue (Enqueued)
   → INSERT State
   → INSERT JobParameter
5. Worker: FetchNextJob (SQL: UPDATE TOP(1) ... WITH (READPAST, UPDLOCK))
   → SET FetchedAt = now
6. Worker: BackgroundJobStateChanger.ChangeState(ProcessingState)
   → UPDATE Job.StateName
   → INSERT State
   → DELETE JobQueue (или UPDATE)
7. Worker: IBackgroundJobPerformer.Perform
   → JobActivator.CreateInstance
   → Method.Invoke
8. Worker: ChangeState(SucceededState) или ChangeState(FailedState) + state machine через ApplyFilter
9. Если Failed → AutomaticRetryAttribute.OnStateApplied
   → ChangeState(ScheduledState) + AddToSet("retries")
```

### Конкретная failure matrix для Hangfire (enqueue → processing)

| # | Точка отказа | Состояние после отказа | Recovery | Время | Риск | Митигация |
|---|---|---|---|---|---|---|
| F1 | Упали **до** `Commit` в `BackgroundJobClient` | Ничего не записано. Job не существует. | Клиент получает exception. Повторный `Enqueue` создаст job. | сразу | **safe** (если клиент ретраит) / **data loss** (если клиент не ретраит) | Retry на клиенте + outbox |
| F2 | Упали **после** `Commit`, но клиент не получил ответ | Job в `JobQueue` со state `Enqueued`. Клиент думает, что упало. | Worker подхватит job. Клиент при ретрае создаст **дубль**. | сразу (worker) | **needs idempotency** | Idempotency key на клиенте / dedup store |
| F3 | Worker упал **после** `FetchNextJob`, **до** `ProcessingState` | `FetchedAt` установлен, state = `Enqueued`. | `InvisibilityTimeout` (5 мин) → другой worker заберёт. | ~5 мин | **safe** | — |
| F4 | Worker упал **после** `ProcessingState`, **до** вызова метода | State = `Processing`, `FetchedAt` установлен. Метод не выполнялся. | `InvisibilityTimeout` | ~5 мин | safe | - |
| F5 | Worker упал **во время** выполнения метода | State = `Processing`. Side effects частично выполнены. | Job снова будет взят (at-least-once). Метод выполнится **повторно**. | после recovery | **needs idempotency** | Идемпотентность side effects |
| F6 | Метод выполнился, worker упал **до** `SucceededState` | State = `Processing`, side effect выполнен. | Job перевыполнится. Side effect **дублируется**. | после recovery | **needs idempotency** | Idempotency key + outbox |
| F7 | `IApplyStateFilter.OnStateApplied` упал **до** `Commit` | Транзакция откатится. State останется прежним (`Processing`). Джоба выполнилась, но изменение не записано в базу | Invisibility Timeout | ~5 min | **needs analysis на бесконечную постановку в очередь** | Не делать side effects в filter; идемпотентные handlers |
| F8 | `IApplyStateFilter.OnStateApplied` упал **после** `Commit` (side effect вне транзакции) | State применён, внешний side effect — нет (или наоборот). | **Рассинхрон.** Транзакция не спасёт. | вручную | **needs manual / outbox** | Outbox pattern, не делать I/O в handlers |
| F9 | `AutomaticRetryAttribute` упал при `AddToSet("retries")` | elect уже подменил FailedState на ScheduledState, ScheduledState уже в candidate. AddToSet в OnStateApplied — побочная бухгалтерия в той же транзакции. Упал AddToSet → Commit не вызван → вся транзакция откатывается, включая уже выбранный ScheduledState. Job остаётся в Failed не потому, что «retry-переход не применился», а потому что atomicity откатила уже принятое решение. | повторный запуск | - | Мониторинг `Failed` |
| F10 | `RecurringJobScheduler` упал **до** `TriggerRecurringJob` | Recurring job не зашедулен. Next occurrence не сдвинут. | Следующий цикл scheduler'а попробует снова. | до следующего цикла | **safe** (если lock отпущен) | Distributed lock timeout |
| F11 | `RecurringJobScheduler` упал **после** создания Job, **до** обновления next occurrence | Job создан, next occurrence не сдвинут. | Следующий цикл создаст **дубль**. | до следующего цикла | **needs idempotency** | Атомарное обновление next occurrence + lock |
| F12 | `DelayedJobScheduler` упал между `RemoveFromSet` и `ChangeState(Enqueued)` | Job удалён из `schedule`, но не в `JobQueue`. | **Потеря.** | никогда автоматически | **data loss** | Атомарная транзакция; алерт на расхождение set и queue |
