# Docker

https://chat.deepseek.com/a/chat/s/9f3f826d-86ff-412f-a516-8a626a4e37c3

## 0. Мой baseline
- Тест пройден: 2026-11-16, средний балл ~0.8/5
- Сильное: cache invalidation, multi-stage идея, depends_on vs healthcheck
- Слабое: сети, безопасность, внутренности, отладка, ресурсы, compose
- Главная задача: сломать VM-мышление, выйти на прод-паттерны

---

## 1. Контейнер ≠ виртуальная машина

### 1.1 Что такое контейнер
Контейнер — это **изолированный процесс** (или группа процессов) на Linux-хосте,
который думает, что у него своя FS, сеть, PID, hostname.

Изоляция строится на 3 китах ядра Linux:
- **namespaces** — изоляция видимости (PID, NET, MNT, UTS, IPC, USER, CGROUP)
- **cgroups** — ограничение ресурсов (CPU, RAM, IO)
- **union/overlay FS** — слоистая файловая система (overlay2)

Никакой «своей ОС» внутри контейнера нет. **Ядро — общее с хостом.**
Это и есть фундаментальное отличие от VM.

| | VM | Container |
|---|---|---|
| Ядро | своё | общее с хостом |
| Старт | секунды–минуты | миллисекунды |
| Размер | GB | MB |
| Изоляция | аппаратная (hypervisor) | программная (namespaces) |
| Безопасность | выше | ниже, нужны доп. меры |

### 1.2 Образ, слои, контейнер
- **Image** = упорядоченный набор **read-only слоёв** + метаданные (config: ENTRYPOINT, CMD, ENV, EXPOSE…)
- **Layer** = tar-архив с diff’ом от предыдущего слоя. Создаётся каждой `RUN`, `COPY`, `ADD`. `FROM`, `ENV`, `WORKDIR`, `ENTRYPOINT` слоёв **не создают** (только метаданные).
- **Container** = image + один **writable layer** сверху + runtime-состояние (процессы, namespaces, cgroups).
- **Volume** = директория на диске **хоста** (`/var/lib/docker/volumes/...`), монтируется в контейнер. Это не «память», это файлы на диске.

Слои **шаринг** между образами: если 10 образов основаны на `python:3.12-slim`, слой базового образа на диске один.

### 1.3 Lifecycle

    create → start → running → stop → stopped → rm
                        ↕ pause/unpause
                        ↓
                   restart / kill / die

- `docker create` — создаёт контейнер из образа (без запуска)
- `docker start` — запускает созданный
- `docker run` = `create` + `start` + опционально `attach` (одной командой)
- `docker attach` — подключение stdin/stdout к **уже запущенному** контейнеру (в 99% случаев нужен `docker exec`, а не attach)
- `docker stop` — **SIGTERM** PID 1, ждёт 10 сек, шлёт **SIGKILL**
- `docker kill` — сразу SIGKILL (или другой сигнал через `-s`)
- `docker pause` — SIGSTOP (вот это «заморозка», но не stop!)
- `docker rm` — удаляет контейнер (writable layer пропадает, volume остаётся, если не `-v`)

### 1.4 PID 1 в контейнере — почему это важно
- Первый процесс в контейнере получает PID 1.
- PID 1 в Linux имеет **особые свойства**: игнорирует сигналы, для которых нет обработчика, и **не реагирует на SIGKILL изнутри**.
- Если PID 1 — это `bash` или `sh`, который запустил приложение через `&`, сигналы **не дойдут** до приложения.
- **Zombie reaping**: PID 1 должен пожинать зомби-процессы. `bash` это делает плохо, нужен `tini` / `dumb-init` или правильный `exec`.

Паттерны:
- `ENTRYPOINT ["python", "app.py"]` — ок, PID 1 = python
- `CMD python app.py` (shell form) — PID 1 = `/bin/sh -c`, сигналы не доходят до приложения, в случае стопа будет не graceful
- `ENTRYPOINT ["tini", "--", "python", "app.py"]` — tini как PID 1, форвардит сигналы и жнёт зомби
- Docker сам подставляет tini, если запустить с `--init`

### 1.5 Что реально происходит при `docker run`
1. Docker CLI шлёт запрос в **dockerd** через API
2. dockerd проверяет наличие образа локально, если нет — тянет с registry (распаковка слоёв в `/var/lib/docker/overlay2`)
3. dockerd создаёт **OCI runtime spec** (namespaces, cgroups, mounts, rootfs)
4. dockerd просит **containerd** создать контейнер
5. containerd запускает **containerd-shim** (долгоживущий процесс-«нянька»)
6. shim запускает **runc**
7. runc делает `clone()` с флагами namespaces, `pivot_root` в rootfs, `execve()` приложения
8. runc завершается, shim остаётся следить, приложение крутится
9. stdout/stderr приложения shim перенаправляет в **json-file log** (`/var/lib/docker/containers/<id>/<id>-json.log`)

Стек: **CLI → dockerd → containerd → shim → runc → процесс**

### 1.6 Коды выхода
- `137` = 128 + 9 = **SIGKILL**. Причины: OOM-killer, `docker kill`, `docker stop` таймаут, `kill -9` с хоста.
- `143` = 128 + 15 = **SIGTERM** (корректный stop)
- `139` = 128 + 11 = **SIGSEGV** (segfault, часто в нативных бинарях)
- `1` — ошибка приложения
- `125` — ошибка самого docker (не смог запустить)
- `126` — команда не executable
- `127` — команда не найдена (опечатка в ENTRYPOINT)

Команда для просмотра:
`docker inspect <container> --format='status={{.State.Status}} exit={{.State.ExitCode}} oom={{.State.OOMKilled}} error={{json .State.Error}}'`

### 1.7 Кэш слоёв — правильный порядок в Dockerfile
    # ПЛОХО: любое изменение кода инвалидирует pip install
    COPY . .
    RUN pip install -r requirements.txt

    # ХОРОШО: зависимости кэшируются отдельно от кода
    COPY requirements.txt .
    RUN pip install -r requirements.txt
    COPY . .

Правило: **меняется реже → выше в Dockerfile**.

---

## Вопросы контрольные

Объясни за 3 предложения, почему docker stop не «замораживает» процесс, и что происходит с данными в памяти процесса.

Ответ: docker stop шлёт SIGTERM в PID 1, ждёт 10 сек, потом шлёт SIGKILL снаружи. Процесс умирает, а не засыпает. Вся RAM процесса (куча, стек, переменные, незаписанные данные) при этом теряется — ОС освобождает страницы памяти. Если приложение не успело сбросить состояние на диск (в БД, в файл, в volume) — оно потеряно безвозвратно. «Сохранить состояние» можно только если приложение само это сделало до SIGKILL. docker pause (SIGSTOP) — единственная «заморозка», и это не stop.

---

У тебя Dockerfile с CMD python app.py. Ты сделал docker stop, а приложение умерло не сразу, а через 10 секунд. Почему? Что бы ты поменял, чтобы остановка была быстрой и graceful?

Ответ: приложение умерло через 10 секунд потому что мы запустили Python через shell, shell получил PID 1 и не довел до приложения shutdown signal, через 10 сек docker принудительно все завершил, остановка не была graceful. Надо заменить на ENTRYPOINT

---

Дан образ app:latest из 5 слоёв. Ты запустил 10 контейнеров. Сколько физически копий этих слоёв лежит на диске? А сколько writable-слоёв? Обоснуй.

В образе app:latest 5 read-only слоёв. На диске физически хранится по одной копии каждого из 5 (они не дублируются при запуске контейнеров — слои шарятся). То есть 5 физических read-only слоёв, а не 1. Writable-слоёв — 10, по одному на контейнер, они лежат в upperdir каждого.

---

Контейнер упал с кодом 137. Назови минимум 4 причины. Как отличить OOM от docker kill?

### Шаг 1. docker inspect — первичная проверка

```
docker inspect <container> --format='exit={{.State.ExitCode}} oom={{.State.OOMKilled}} error={{json .State.Error}} finished={{.State.FinishedAt}}'

Вывод:
exit=137 oom=false error="" finished=2026-11-17T10:15:33.123Z
```

oom=true → точно OOM-killer. Дальше искать не нужно.

oom=false → скорее всего не OOM. Но есть нюанс: если контейнер убит OOM-killer'ом хоста (не cgroup), флаг может остаться false. Поэтому идём к шагу 2.

### Шаг 2. Kernel log — проверка OOM на уровне хоста

docker inspect смотрит только за cgroup контейнера. Но если контейнер не имел --memory-лимита и «съел» память хоста, ядро убивает его как обычный процесс хоста — Docker может не успеть/не суметь пометить OOMKilled=true.

```txt
# systemd-системы
sudo journalctl -k --since "10 min ago" | grep -iE 'oom|killed process'

# или напрямую
sudo dmesg -T | grep -iE 'oom|killed process'
```

Ищи строки вида:
```txt
Out of memory: Killed process 12345 (python) total-vm:..., anon-rss:..., 
oom_score_adj:...
```

Там будет PID, RSS (сколько реально занимал), oom_score. Если находишь запись про свой процесс — это OOM, даже если docker inspect говорит oom=false.

Проверка на уровне cgroup v2 (если контейнер имел лимит):

```bash
CID=<container_id>
# путь cgroup контейнера
CG=$(docker inspect --format '{{.HostConfig.CgroupParent}}' $CID)
# либо найти по PID
PID=$(docker inspect --format '{{.State.Pid}}' $CID)  # но если уже упал, PID может быть занят
```

Проще — посмотреть счётчик в cgroup-родителя или в /sys/fs/cgroup/system.slice/docker-<id>.scope/memory.events:

```
low 0
high 0
max 0
oom 3          ← 3 OOM-события
oom_kill 1     ← 1 kill

oom_kill > 0 — окончательно подтверждает OOM.
```

### Шаг 3. Кто убивал — смотрим события Docker

docker events пишет, что Docker сам сделал с контейнером. Если kill был по команде — там будет соответствующее событие незадолго до die:

```
docker events --since '1h ago' --filter 'container=<container>' --filter 'event=kill' --filter 'event=die' --filter 'event=oom'
```

Типичные сценарии:

docker kill:

```
... container kill <id> (signal=9)
... container die <id> (exitCode=137)

— событие kill предшествует die.
```

docker stop с таймаутом (SIGTERM проигнорирован, потом SIGKILL):

```
... container kill <id> (signal=15)
... (10 секунд тишины)
... container kill <id> (signal=9)
... container die <id> (exitCode=137)
```

OOM:

```
... container oom <id>          ← Docker видит OOM-событие из cgroup
... container die <id> (exitCode=137)

— события kill нет, зато есть oom.
```

Если docker events не показывает событие kill перед die — значит, kill пришёл не от Docker, а от ядра (OOM) или от kill с хоста.

#### Шаг 4. Если kill был с хоста — следы в audit/логах

docker kill / docker stop по таймауту → это Docker, событие будет. kill -9 с хоста напрямую по PID контейнера — Docker об этом не знает, события kill не будет, только die.

Проверить, был ли kill с хоста:

```
# auditd (если включён)
sudo ausearch -sc kill --start recent | grep <pid>

# psacct / lastcomm (если установлен)
sudo lastcomm kill | grep <user>
```

Часто в проде без auditd это не поймать. Поэтому на хосте стоит:

- включить audit-правило `-a always,exit -F arch=b64 -S kill -k kill_events`, либо
- полагаться на `docker events` — если контейнер убит не Docker'ом, событие kill отсутствует.

---

Почему docker attach — плохая идея для дебага живого сервиса, и что использовать вместо?

Ответ:

1. Ctrl + C = SIGINT = остановка сервиса

Самое частое. Вы attach’итесь к Python/Node/Go-сервису, чтобы «посмотреть логи». Хотите прекратить — жмёте Ctrl+C. По привычке.

2. Ctrl+D = EOF на stdin = приложение завершается

Если контейнер с -i (интерактивный stdin), Ctrl+D в терминале закрывает stdin → приложение, которое делает read() на stdin (или фреймворк, который проверяет stdin на «интерактивность»), видит EOF и может завершиться. Тихо. Без ошибки. Просто «сервис пропал».

3. Обрыв SSH / закрытие терминала = EOF и/или SIGKILL

Если ваша SSH-сессия падает, а вы attach’нуты:

stdin закрывается → EOF (см. пункт b).

Docker может не успеть корректно отсоединиться, и в некоторых сценариях (с -t и закрытием pty) поведение процесса становится непредсказуемым.

4. Кража вывода из логов (split pipe)

Пока вы attach’нуты, logging driver и вы конкурируете за чтение одного pipe. Байты уходят либо в лог-файл, либо вам. Результат:

- docker logs <c> во время вашего attach теряет строки.

- Если у вас настроен сбор логов (ELK/Loki), в централизованном логе будут дыры, коррелирующие с временем, когда кто-то был attach’нут.

Это очень коварно: вы «смотрите логи», а на самом деле портите логи.

Что использовать вместо:

1. docker logs - чтение лог-файла, не конкурирует с процессом, readonly, никаких сигналов
2. docker exec -it container sh, спавнит новый процесс в namespace контейнера, не трогает PID 1 и его stdio
3. docker exec cmd, то же, без интерактива, легко в скриптах
4. docker cp c:/path ./out, копирует через daemon, не вторгается

---

## Следующие уроки
- [ ] 2. BuildKit, buildx, multi-arch, cache mounts, .dockerignore, ARG/ENV/secrets
- [ ] 3. Сети
- [ ] 4. Данные
- [ ] 5. Безопасность
- [ ] 6. Ресурсы / cgroups
- [ ] 7. Compose + прод-паттерны + CI/CD
- [ ] 8. Отладка в проде