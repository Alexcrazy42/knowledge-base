# Разбор исходного кода Hangfire

https://chat.deepseek.com/a/chat/s/f6b37c75-b78a-4605-b9b3-7a19f935d77a

> **Оглавление**
> - [Обратная связь по разбору](#обратная-связь-по-разбору)
> - [Вопросы на проверку глубины](#вопросы-на-проверку-глубины)
> - [Hangfire](#hangfire)

---

## Обратная связь по разбору

### ✅ Что хорошо

- Верно понята двухуровневая архитектура клиента: `BackgroundJob` (фасад) → `BackgroundJobClient` (управление) → `BackgroundJobStateChanger` (смена состояния).
- Верно схвачена суть разделения фильтров: `IElectStateFilter` (влияет на *выбор* состояния) vs `IApplyStateFilter` (действия *после* применения). Это ключевое место, и ты его не перепутал.
- Верно указано, что `CoreStateMachine` не просто пишет состояние, а прогоняет `IStateHandler` — то есть ты видишь точку расширения для статистики/каунтеров.
- Правильно описан поток `BackgroundJobServer` → `BackgroundProcessingServer` → `IBackgroundDispatcher` → потоки. Это нетривиально, многие путают.
- Отмечен `DelayedJobScheduler` и `RecurringJobScheduler` как отдельные процессы — верно.

### ⚠️ Пробелы, критичные для тимлида

> Это то, без чего ты не сможешь ни дебажить инциденты, ни отвечать на вопросы «почему джоба выполнилась дважды / потерялась».

1. **Схема storage.** Ты нигде не назвал ключи: `job:{id}` (Hash), `job:{id}:state`, `job:{id}:history`, `queues:{queue}` (List), `schedule` (SortedSet, score = timestamp), `recurring-jobs` (SortedSet), `recurring-job:{id}` (Hash), `retries` (Set), `processing:{queue}` (Set), `servers` / `server:{id}` (heartbeat), `lock:{resource}`. Без этого разговор о Hangfire — абстрактный.
2. **Invisibility timeout и восстановление.** Как `Worker` забирает джобу (`FetchNextJob`), что такое `FetchedJob`, кто и когда возвращает «зависшие» джобы из `processing:{queue}` обратно в очередь. Это ядро надёжности.
3. **Distributed locks.** Ты упомянул «взять лок» у `BackgroundJobStateChanger`, но не сказал, *как*: `IDistributedLock`, `AcquireDistributedLock`, ресурс = `job:{id}`. Плюс отдельные локи у `RecurringJobScheduler` на каждую рекуррентную джобу (защита от дублирования при нескольких серверах).
4. **End-to-end пайплайн `Enqueue`.** `BackgroundJob.Enqueue` → `CreateContext` → `IClientFilter` → `IWriteOnlyTransaction` (insert job + jobParameter) → `ChangeState(EnqueuedState)` → `CoreStateMachine.ApplyState` → `EnqueuedStateHandler` кладёт в `queues:{queue}`. У тебя есть куски, но не склейка.
5. **Гарантии доставки.** Hangfire — **at-least-once**, а не exactly-once. Отсюда: идемпотентность, почему `AutomaticRetry` может дать дубль, почему нельзя полагаться на «ровно один раз». Тимлид обязан это проговаривать команде.
6. **Порядок и область действия фильтров.** Global → тип → метод; порядок применения; `IJobFilterProvider`. Ты перечислил виды фильтров, но не механику.
7. **`JobActivator` и scope.** В ASP.NET Core — `AspNetCoreJobActivator` создаёт **per-job scope** (`IJobActivatorScope`), чтобы DI-граф жил ровно на время джобы. Это критично для утечек и для `IDisposable`.
8. **Операционка.** `ServerHeartbeat` (кто пишет heartbeat), `ServerWatchdog` (кто убирает мёртвые серверы), `ExpirationManager` (TTL для succeeded-джоб). Без этого ты не ответишь «почему сервер в дашборде висит зомби».
9. **`BackgroundDispatcher` — это не «массив потоков».** Это пул: N потоков (по умолчанию `ProcessorCount * 5`), каждый берёт один `IBackgroundProcess` из диспетчера, крутит его `Execute` в цикле, флаг `IsProcessRunning` не даёт одному процессу выполняться параллельно. Плюс `CancellationToken` и таймауты.

---

## Вопросы на проверку глубины

> Ответь себе — где не сможешь, там и пробел.

1. Процесс упал между `FetchNextJob` и сменой состояния на `Processing`. Что произойдёт с джобой и через какое время?
2. Почему `EnqueuedState` — это состояние, а не просто «положили в очередь»? Что было бы, если бы очередь была отдельно от state machine?
3. Как `RecurringJobScheduler` защищается от дублирования при 5 серверах и включённом `MisfireHandling`?
4. `IStateHandler.OnStateApplied` упал на середине транзакции. Что закоммитится, что нет, и как это соотносится с `IWriteOnlyTransaction`?
5. Где именно принимается решение о ретрае — в elect или apply? И почему `AddToSet("retries")` — это следствие, а не причина?
6. Что произойдёт, если фильтр в `OnStateElection` заменит `CandidateState` на `DeletedState` для `ProcessingState`? (твой пример с `TimeoutAttribute` — проверь, кто и когда вызывает elect-фильтры в этом сценарии.)
7. Чем `BackgroundJobServer` отличается от `BackgroundProcessingServer` по ответственности, а не по наследованию?

---

## Hangfire

### Клиентский АПИ

**`BackgroundJob`** (static facade) → `Enqueue`, `Schedule`

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

- **`Worker`** — тот, кто исполняет `Job` — берёт по одной из `JobQueue` и выполняет через `IBackgroundJobPerformer`.
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