Ниже — README с теорией по Уроку 8. Он собран по тому же принципу, что и Урок 7: сначала проблема и инструменты, затем «как это работает вместе», антипаттерны и контрольные вопросы.

---

# Docker — Урок 8. Отладка в проде

## 8.1 Зачем отлаживать контейнер, если он «просто работает»

Контейнер в проде — это **чёрный ящик**: вы видите `Up`, но не видите, что внутри. При этом `docker logs` часто недостаточно: процесс может быть жив, но не отвечать; сеть может «терять» пакеты; приложение может упираться в cgroup-лимит и не писать об этом в лог.

Урок 8 — про то, как **заглянуть внутрь работающего контейнера**, не останавливая его, и как восстановить картину по **постмортем-следам**, если контейнер уже умер.

Ключевой принцип: **сначала дешёвые и безопасные инструменты** (`exec`, `events`, `stats`), затем тяжёлые (`nsenter`, `strace`, `tcpdump`) — и только с явным пониманием, что вы делаете.

---

## 8.2 `docker exec` vs `nsenter`: «войти в контейнер» можно по-разному

### 8.2.1 `docker exec` — штатный способ

```bash
docker exec -it <container> sh
docker exec <container> cat /proc/1/status
```

`docker exec` — это **официально рекомендуемый** способ попасть внутрь контейнера для отладки. Он:

- работает через Docker API (не нужен доступ к хосту напрямую);
- **входит в cgroup контейнера**, поэтому процесс, запущенный через `exec`, **подчиняется тем же лимитам** CPU/памяти, что и основной процесс;
- не требует установки `util-linux` на хост;
- безопаснее для удалённого доступа, потому что не даёт обходить resource limits.

Именно поэтому для **быстрой проверки** («а есть ли файл?», «какие процессы?») используется `docker exec`.

### 8.2.2 `nsenter` — когда `exec` невозможен

```bash
PID=$(docker inspect --format '{{.State.Pid}}' <container>)
nsenter --target "$PID" --mount --uts --ipc --net --pid /bin/sh
```

`nsenter` входит в **пространства имён** (namespaces) контейнера — mount, UTS, IPC, network, PID — но **не входит в cgroup** контейнера. Это значит:

- процесс, запущенный через `nsenter`, **не ограничен** cgroup-лимитами контейнера (обходит `--memory`, `--cpus`);
- `nsenter` **работает только с хоста** — его нельзя запустить изнутри другого контейнера;
- исторически был привязан к x86-64, хотя современные версии ведут себя лучше.

### 8.2.3 Когда что использовать

| Ситуация | Инструмент | Почему |
|---|---|---|
| Контейнер жив, есть shell | `docker exec` | Штатно, подчиняется лимитам |
| Контейнер жив, **нет shell** (distroless) | `nsenter` или debug-контейнер | `exec` не может запустить `sh` |
| Контейнер **в crash loop** | `nsenter` по PID (если успели) или `docker debug` | `exec` может не успеть |
| Нужно проверить, не **обходит** ли процесс лимиты | `nsenter` | Он не входит в cgroup — видно «голое» потребление |
| Удалённая отладка | `docker exec` | Рекомендованный способ |

**Мнемоника:** `docker exec` — «войти в контейнер как пользователь»; `nsenter` — «войти в контейнер как хост-администратор, который временно снял лимиты».

> **Подводный камень:** `nsenter` может **обойти** `--read-only`, если смонтировать что-то поверх, и **обойти** seccomp-профиль, если запускать процессы в обход обычного entrypoint. Используйте его только осознанно.

---

## 8.3 `strace` с кастомным seccomp: увидеть, **какой syscall** блокируется

### 8.3.1 Почему `strace` «просто не работает»

Docker по умолчанию применяет **seccomp-профиль**, который блокирует ~44 «опасных» системных вызова, включая `ptrace`. `strace` для трассировки процесса как раз использует `ptrace`. Поэтому:

```bash
docker exec <container> strace -p 1
# strace: attach: ptrace(PTRACE_SEIZE, 1): Operation not permitted
```

Чтобы `strace` заработал, контейнер должен быть запущен с:

- `--cap-add SYS_PTRACE` (capability для `ptrace`);
- и seccomp-профилем, который **разрешает** `ptrace` (либо `seccomp=unconfined`, но это **не** для прода).

```bash
docker run --cap-add SYS_PTRACE --security-opt seccomp=unconfined ...
```

### 8.3.2 Зачем `strace` в проде: найти **missing syscall**

Типичный сценарий: приложение работает в dev, но падает в проде с `EPERM`. Причина — кастомный seccomp-профиль заблокировал syscall, который приложению нужен.

```bash
# Внутри контейнера (с SYS_PTRACE и разрешённым ptrace)
strace -f -e trace=all -o /tmp/trace.txt ./app
```

`-f` важен: без него **дочерние процессы** не трассируются, и вы не увидите syscall’ы, которые делает форкнутый процесс.

Затем:

```bash
grep -oP '^(?:\[pid \d+\] )?\K\w+' /tmp/trace.txt | sort -u
```

Это даёт список syscall’ов, которые **реально** использует приложение. Их можно сравнить с профилем и точечно добавить недостающие, вместо того чтобы отключать seccomp полностью.

### 8.3.3 Как `strace` помогает **строить** seccomp-профиль

Подход:

1. Запустить приложение под `strace -f` в dev/staging.
2. Собрать уникальные syscall’ы.
3. Создать **deny-by-default** профиль, в который добавлены только эти syscall’ы.
4. Протестировать в staging, отслеживая `EPERM`/`SIGSYS`.

> **Осторожно:** `seccomp=unconfined` **полностью отключает** фильтрацию syscall’ов. Это допустимо **только** на время отладки в изолированном окружении, но **не** в проде.

---

## 8.4 `tcpdump` и `netshoot`: увидеть, что реально летит по сети

### 8.4.1 Проблема: в контейнере нет `tcpdump`

Минимальные образы (alpine, distroless, scratch) не содержат сетевых утилит. Ставить их в прод-образ — плохо (раздувает образ и поверхность атаки). Решение — **debug-контейнер**, который разделяет network namespace с целевым контейнером.

### 8.4.2 `netshoot` — «швейцарский нож» для сети

`nicolaka/netshoot` — образ, в котором уже есть `tcpdump`, `ss`, `netstat`, `dig`, `curl`, `nc`, `ip`, `route`, `traceroute`, `termshark` и другие инструменты.

**Способ 1. Разделить network namespace (Docker):**

```bash
docker run -it --rm --net container:<target-container> nicolaka/netshoot
```

После этого внутри netshoot:

```bash
tcpdump -i eth0 -nn port 80 -c 10 -w /tmp/http.pcap
```

Это перехватывает трафик **целевого** контейнера, потому что network namespace общий.

**Способ 2. `docker debug` (если доступен):**

```bash
docker debug --image nicolaka/netshoot <container>
```

Создаёт временный debug-контейнер, присоединённый к namespace’ам целевого.

### 8.4.3 Что смотреть в `tcpdump`

| Симптом | Фильтр / команда | Что искать |
|---|---|---|
| Сервис не отвечает | `tcpdump -i eth0 -nn 'tcp port 8080'` | Есть ли SYN? Есть ли SYN-ACK? RST? |
| DNS «то работает, то нет» | `tcpdump -i eth0 -nn 'udp port 53'` | Запросы уходят? Ответы приходят? |
| TLS-ошибки | `tcpdump -i eth0 -nn 'tcp port 443' -w tls.pcap` | Потом открыть в Wireshark/tshark |
| «Трафик есть, но приложение не видит» | `ss -tlnp` внутри netshoot | Слушает ли процесс на нужном адресе/порту? |

> **Подводный камень:** `tcpdump` требует `CAP_NET_RAW`. В `netshoot` он уже есть; в обычном контейнере — нет.

---

## 8.5 `docker events` с фильтрами: «журнал происшествий» Docker

### 8.5.1 Зачем `events`, если есть логи

`docker logs` показывает, что **сказало приложение**. `docker events` показывает, что **сделал Docker**: контейнер запустился, умер, был убит OOM, healthcheck сменил статус, образ обновился. Это **мета-уровень**: часто именно `events` даёт первую зацепку.

### 8.5.2 Базовый синтаксис

```bash
docker events
docker events --since 30m
docker events --until 2026-11-23T12:00:00
```

### 8.5.3 Фильтры, которые реально нужны в проде

```bash
# Только события конкретного контейнера
docker events --filter 'container=my-app'

# Смерти и OOM
docker events --filter 'event=die' --filter 'event=oom'

# Healthcheck-переходы
docker events --filter 'event=health_status'

# Только контейнеры (не образы/тома/сети)
docker events --filter 'type=container'

# С изображением
docker events --filter 'image=myapp:1.0.0'
```

Фильтры можно комбинировать: несколько `--filter` одного типа работают как **OR**, разных типов — как **AND**.

### 8.5.4 Полезные события для постмортема

Docker-контейнеры сообщают события: `create`, `start`, `die`, `kill`, `oom`, `restart`, `stop`, `health_status`, `exec_create`, `exec_die` и другие.

Особенно важны:

- **`die`** — контейнер умер. В атрибутах будет `exitCode`.
    - `exitCode=137` → `SIGKILL`, почти всегда **OOM** (сверить с `State.OOMKilled`).
    - `exitCode=143` → `SIGTERM`, штатная остановка.
- **`oom`** — контейнер был убит OOM-killer’ом.
- **`health_status`** — healthcheck сменил статус (`healthy` → `unhealthy`).

### 8.5.5 Формат для автоматизации

```bash
docker events \
  --filter 'type=container' \
  --filter 'event=die' \
  --filter 'event=oom' \
  --filter 'event=health_status' \
  --format '{{.Time}}|{{.Action}}|{{.Actor.Attributes.name}}|{{.Actor.Attributes.exitCode}}'
```

Это удобно отправлять в систему алертинга: каждая строка — одно событие с временем, действием, именем контейнера и кодом выхода.

---

## 8.6 cgroup v2: «приборная панель» ресурсов контейнера

### 8.6.1 Где смотреть

На современных Linux-хостах Docker использует **cgroup v2**. Путь зависит от cgroup-драйвера:

- `cgroupfs`: `/sys/fs/cgroup/docker/<id>/`
- `systemd`: `/sys/fs/cgroup/system.slice/docker-<id>.scope/`

Внутри контейнера (при `docker exec`) файлы обычно доступны по короткому пути:

```bash
cat /sys/fs/cgroup/memory.current
cat /sys/fs/cgroup/memory.max
cat /sys/fs/cgroup/memory.events
cat /sys/fs/cgroup/cpu.stat
```

### 8.6.2 Ключевые файлы

| Файл | Что показывает | Как читать |
|---|---|---|
| **`memory.current`** | Текущее потребление памяти (байты) | Сравнивать с `memory.max` |
| **`memory.max`** | Лимит памяти | Если `current` близко к `max` — риск OOM |
| **`memory.events`** | Счётчики событий памяти | Ищите строки `oom` и `oom_kill` |
| **`cpu.stat`** | Статистика CPU | `usage_usec` — использованное время; `nr_throttled` / `throttled_usec` — троттлинг |
| **`pids.current` / `pids.max`** | Количество процессов | Упор в `pids.max` → `fork` fails |

### 8.6.3 `memory.events`: подтверждение OOM

Если контейнер умер с `exitCode=137`, но `State.OOMKilled=false` (бывает при убийстве **дочерней** cgroup), авторитетный источник — **`memory.events`**:

```bash
grep -E '^(oom|oom_kill)' /sys/fs/cgroup/memory.events
# oom 3
# oom_kill 3
```

Если `oom_kill` увеличился — контейнер (или его дочерняя cgroup) был убит OOM’ом, даже если Docker этого не отметил.

### 8.6.4 `cpu.stat`: throttling vs реальная нагрузка

```bash
cat /sys/fs/cgroup/cpu.stat
# nr_periods 1000
# nr_throttled 800
# throttled_usec 120000000
# usage_usec 5000000
```

- `nr_throttled > 0` и `throttled_usec` растёт → контейнер **упирается в CPU-лимит**, а не «тормозит из-за кода».
- `usage_usec` — сколько CPU-времени реально использовано.

**Мнемоника:** `memory.current` / `cpu.stat` — «что сейчас»; `memory.events` — «что случилось»; `memory.max` / `cpu.max` — «где потолок».

---

## 8.7 «Чёрный ящик»: постмортем, когда контейнер уже мёртв

### 8.7.1 Принцип

Когда контейнер в crash loop или уже `Exited`, **не начинайте с логов приложения**. Сначала соберите «чёрный ящик»: метаданные, события, состояние cgroup — и только потом читайте логи.

### 8.7.2 Порядок действий

1. **`docker ps -a`** — есть ли контейнер вообще? Если его нет — возможно, он был удалён (`--rm`) или никогда не создавался.
2. **`docker inspect`** — читать **до** логов:
    - `State.Status` — `exited` / `restarting` / `dead` / `running`.
    - `State.ExitCode` — `137` → SIGKILL (OOM); `143` → SIGTERM; `1`/`2` → ошибка приложения.
    - `State.OOMKilled` — **но** при cgroup v2 может быть `false` даже при OOM (см. 8.6.3).
    - `RestartCount` + `State.StartedAt` — высокий счётчик + недавний старт = **restart loop**.
    - `HostConfig.RestartPolicy` — `no` / `on-failure` / `always` / `unless-stopped`.
    - `Mounts[]` — нет ли отсутствующей директории для bind mount.
3. **`docker events --since 30m`** — что происходило **до** смерти: `die`, `oom`, `health_status`, `restart`.
4. **`docker logs --tail 200`** — только теперь логи, с `--since`, если известно время инцидента.
5. **cgroup-файлы** (если контейнер ещё существует) — `memory.events`, `cpu.stat` (см. 8.6).

> **Важно:** `docker inspect` часто даёт ответ **быстрее**, чем логи. `ExitCode=137` + `OOMKilled=true` — и вы уже знаете, что искать дальше.

---

## 8.8 Капстоун: «сервис не отвечает» — сквозной сценарий

### 8.8.1 Ситуация

Контейнер `Up`, healthcheck `healthy` (или его нет), но клиенты получают таймауты.

### 8.8.2 Пошаговый разбор

**Шаг 1. Проверить, что процесс вообще слушает порт.**

```bash
docker exec <container> ss -tlnp
# или через netshoot:
docker run -it --rm --net container:<container> nicolaka/netshoot ss -tlnp
```

Если процесса нет в списке — приложение не слушает (упало, слушает не тот интерфейс, не тот порт).

**Шаг 2. Проверить сетевую достижимость с точки зрения клиента.**

```bash
docker run -it --rm --net container:<client-container> nicolaka/netshoot \
  nc -zv <target-container> <port>
```

Если `nc` не проходит — проблема на сетевом уровне (ACL, сеть, DNS).

**Шаг 3. Снять трафик на целевой стороне.**

```bash
docker run -it --rm --net container:<target-container> nicolaka/netshoot \
  tcpdump -i eth0 -nn 'tcp port <port>' -c 20
```

- Если пакеты **приходят**, но ответа нет → приложение не отвечает (зависло, deadlock, ждёт внешний ресурс).
- Если пакеты **не приходят** → проблема в сети/DNS/маршрутизации.

**Шаг 4. Проверить ресурсы (cgroup).**

```bash
docker exec <container> cat /sys/fs/cgroup/memory.events
docker exec <container> cat /sys/fs/cgroup/cpu.stat
```

- `oom_kill` растёт → приложение убивалось OOM’ом и перезапускалось (возможно, вы видите «свежий» процесс, который ещё не успел подняться).
- `nr_throttled` высокий → приложение задыхается от CPU-лимита и не успевает отвечать.

**Шаг 5. Проверить события.**

```bash
docker events --filter 'container=<container>' --since 30m
```

Ищите `die`/`restart`/`oom` — возможно, контейнер **уже** перезапускался, и текущий `Up` — это новый процесс, который ещё не готов.

**Шаг 6. Если нужно — `strace`.**

```bash
docker exec <container> strace -f -p 1 -e trace=network,read,write
```

(при наличии `SYS_PTRACE` и разрешённого `ptrace`). Видно, на каком syscall’е процесс «завис»: `accept` без возврата, `read` с блокировкой, `connect` в таймаут.

### 8.8.3 Дерево решений (кратко)

```
Сервис не отвечает
├── Процесс слушает порт? (ss -tlnp)
│   ├── НЕТ → приложение не поднялось / не тот интерфейс / упало
│   └── ДА ↓
├── Пакеты доходят? (tcpdump на target)
│   ├── НЕТ → сеть / DNS / ACL
│   └── ДА ↓
├── Приложение отвечает? (tcpdump: есть ли response)
│   ├── НЕТ → зависло: strace, cpu.stat, memory.events
│   └── ДА ↓
└── Проблема на стороне клиента / LB / прокси
```

---

## 8.9 Антипаттерны отладки в проде

### 8.9.1 `seccomp=unconfined` «на постоянку»

Отключает фильтрацию syscall’ов **полностью**. Допустимо только на время отладки в изолированном окружении. В проде — **нет**.

### 8.9.2 `nsenter` как замена `docker exec` «по привычке»

`nsenter` обходит cgroup-лимиты и работает только с хоста. Если вы используете его для рутинных проверок, вы **не видите**, как контейнер ведёт себя под лимитами. Для штатной отладки — `docker exec`.

### 8.9.3 `strace` без `-f`

Без `-f` дочерние процессы не трассируются. Вы получите **неполный** список syscall’ов и построите seccomp-профиль, который сломает приложение при первом `fork`.

### 8.9.4 Игнорирование `memory.events` при `OOMKilled=false`

При cgroup v2 `State.OOMKilled` может быть `false`, даже если контейнер был убит OOM’ом (kill произошёл в **дочерней** cgroup). Авторитетный источник — `memory.events` → `oom_kill`.

### 8.9.5 `tcpdump` без `-w` и без `-c`

Запуск `tcpdump` без ограничения количества пакетов и без записи в файл на нагруженном интерфейсе может **добавить** проблем (переполнение буфера, потеря пакетов). Всегда:

```bash
tcpdump -i eth0 -nn -c 100 -w /tmp/cap.pcap
```

### 8.9.6 Чтение логов **до** `docker inspect`

`inspect` часто отвечает на вопрос «почему умер» (exit code, OOMKilled, restart policy) **быстрее**, чем логи. Начинайте с метаданных.

---

## Контрольные вопросы

**1. В чём ключевое отличие `docker exec` от `nsenter` с точки зрения cgroup?**

`docker exec` **входит в cgroup** контейнера, поэтому запущенный процесс подчиняется тем же лимитам CPU/памяти. `nsenter` входит в **namespaces**, но **не в cgroup** — процесс обходит лимиты. Поэтому `nsenter` может «съесть» больше памяти/CPU, чем разрешено контейнеру.

**2. Почему `strace -p 1` внутри контейнера падает с `Operation not permitted`?**

Docker’s default seccomp-профиль блокирует `ptrace`, а без `CAP_SYS_PTRACE` capability `ptrace` тоже недоступен. Нужно запустить контейнер с `--cap-add SYS_PTRACE` и seccomp-профилем, разрешающим `ptrace` (либо `seccomp=unconfined` на время отладки).

**3. Зачем `strace -f`, а не просто `strace`?**

Без `-f` дочерние процессы не трассируются. Если приложение форкается, вы пропустите syscall’ы детей и получите неполный профиль. При построении seccomp-профиля это приводит к тому, что профиль ломает приложение при первом `fork`.

**4. Как `netshoot` перехватывает трафик **другого** контейнера?**

`netshoot` запускается с `--net container:<target>`, то есть разделяет **network namespace** целевого контейнера. Всё, что видит сетевой стек target’а, видит и `tcpdump` внутри netshoot.

**5. Чем `docker events` полезнее `docker logs` при разборе инцидента?**

`docker logs` — это вывод приложения. `docker events` — это действия **Docker**: `die` с `exitCode`, `oom`, `restart`, `health_status`. Часто именно `events` показывает, что контейнер **уже** перезапускался или был убит OOM’ом, — то, чего в логах приложения может не быть.

**6. Почему при cgroup v2 `State.OOMKilled=false` не гарантирует, что OOM’а не было?**

OOM-kill может произойти в **дочерней** cgroup. Docker отмечает `OOMKilled=true` только когда убит процесс **самого** контейнера (верхней cgroup). Авторитетный признак — рост `oom_kill` в `memory.events`.

**7. Что означает `exitCode=137` и `exitCode=143` в событии `die`?**

`137 = 128 + 9` → процесс убит `SIGKILL` (чаще всего OOM-killer’ом). `143 = 128 + 15` → процесс завершён `SIGTERM` (штатная остановка).

**8. Почему `tcpdump` без `-c` и `-w` может быть опасен в проде?**

Без ограничения количества пакетов (`-c`) `tcpdump` может создать большую нагрузку и потерять пакеты; без `-w` вывод идёт в терминал и может быть потерян. Правильно: `-c 100 -w /path/file.pcap`, затем анализ офлайн.

---

## Чек-лист покрытия Урока 8

| Тема | Раздел |
|---|---|
| `docker exec` vs `nsenter`: cgroup, namespace, ограничения | 8.2 |
| `strace` + seccomp: `SYS_PTRACE`, `ptrace`, `-f`, построение профиля | 8.3 |
| `tcpdump` / `netshoot`: shared network namespace, `--net container:` | 8.4 |
| `docker events`: фильтры `container`, `event`, `type`, `image`; `die`/`oom`/`health_status` | 8.5 |
| cgroup v2: `memory.current`, `memory.max`, `memory.events`, `cpu.stat` | 8.6 |
| «Чёрный ящик»: `ps -a` → `inspect` → `events` → `logs` → cgroup | 8.7 |
| Капстоун «сервис не отвечает»: `ss` → `nc` → `tcpdump` → cgroup → events → `strace` | 8.8 |
| Антипаттерны: `unconfined`, `nsenter` по привычке, `strace` без `-f`, игнор `memory.events` | 8.9 |