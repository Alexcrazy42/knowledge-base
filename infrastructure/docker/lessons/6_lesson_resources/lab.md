# Docker — Урок 6. Практикум: `--memory`, `--cpus`, `--pids-limit`, cgroup v2, OOM

> **Цель практикума:** своими руками увидеть, как ядро применяет лимиты, как выглядит OOM kill изнутри и снаружи, и научиться читать cgroup-файлы.
> **Правило, которое стоит унести из практикума:** *если у контейнера нет `--memory`, `--cpus` и `--pids-limit` — у вас нет границ поражения. Сначала лимиты, потом — приложение.*

---

## 0. Подготовка окружения

### 0.1 Проверка версии Docker и cgroup

```bash
docker version --format '{{.Server.Version}}'
```

Ожидаемо: `20.10` или новее.

```bash
# cgroup v2?
stat -fc %T /sys/fs/cgroup/
```

| Вывод | Версия cgroup |
|---|---|
| `cgroup2fs` | **v2** — то, что нужно |
| `tmpfs` | **v1** — часть упражнений потребует правок путей, см. §0.4 |

### 0.2 Образ и утилиты

```bash
docker pull dockerhub.timeweb.cloud/library/alpine:3.20
docker pull dockerhub.timeweb.cloud/polinux/stress-ng:latest
```

`stress-ng` — генератор нагрузки (память, CPU, форки). Если образа нет в вашем registry — используйте `alpine` с `apk add stress-ng` внутри контейнера (см. §2.1).

### 0.3 Рабочая директория

```bash
mkdir -p ~/docker-lesson6 && cd ~/docker-lesson6
```

### 0.4 Если у вас cgroup v1

Замените в командах пути:

| v2 | v1 |
|---|---|
| `/sys/fs/cgroup/memory.max` | `/sys/fs/cgroup/memory/memory.limit_in_bytes` |
| `/sys/fs/cgroup/memory.current` | `/sys/fs/cgroup/memory/memory.usage_in_bytes` |
| `/sys/fs/cgroup/cpu.max` | `/sys/fs/cgroup/cpu/cpu.cfs_quota_us` |
| `/sys/fs/cgroup/pids.max` | `/sys/fs/cgroup/pids/pids.max` |
| `/sys/fs/cgroup/system.slice/docker-<id>.scope/` | `/sys/fs/cgroup/memory/docker/<id>/` |

### 0.5 Чистый старт

```bash
docker rm -f $(docker ps -aq) 2>/dev/null || true
```

---

## 1. Память: `--memory` в действии

### 1.1 Жёсткий лимит срабатывает

```bash
docker run --rm --name oom1 --memory 32m alpine \
  sh -c 'dd if=/dev/zero of=/dev/null bs=1M count=1000 & sleep 1; \
         cat /dev/zero | head -c 100M > /dev/null; echo "done"'
```

**Ожидаемо:** контейнер завершается с ненулевым кодом или «зависает» — процесс не может выделить память сверх 32 МБ. Проверьте код выхода:

```bash
docker inspect --format '{{.State.ExitCode}} OOMKilled={{.State.OOMKilled}}' oom1
# 0 OOMKilled=false
```

**Ожидаемо:** `137 OOMKilled=true`.

### 1.2 Более контролируемый OOM через stress-ng

```bash
docker run --rm --name oom2 --memory 64m dockerhub.timeweb.cloud/polinux/stress-ng:latest \
  --vm 1 --vm-bytes 128M --vm-hang 0 --timeout 30s

# 0 OOMKilled=true
```

**Ожидаемо:** процесс убит до истечения 30 с, `ExitCode 137`. Запустите без `--rm` и проверьте `OOMKilled`:

```bash
docker run --name oom2 --memory 64m dockerhub.timeweb.cloud/polinux/stress-ng:latest \
  --vm 1 --vm-bytes 128M --vm-hang 0 --timeout 30s
echo "exit=$?"
# exit=0

docker inspect --format '{{.State.ExitCode}} OOMKilled={{.State.OOMKilled}}' oom2
# 0 OOMKilled=true
docker rm oom2
```

**Ожидаемо:** `137 OOMKilled=true`.

### 1.3 `--memory-swap` = `--memory` → swap запрещён

```bash
docker run --rm --memory 64m --memory-swap 64m alpine \
  sh -c 'cat /sys/fs/cgroup/memory.swap.max'
```

**Ожидаемо:** `0` — swap для контейнера запрещён.

Если swap не запрещён явно (`--memory-swap` не задан):

```bash
docker run --rm --memory 64m alpine cat /sys/fs/cgroup/memory.swap.max
# 67108864
```

**Ожидаемо:** `max` (или число, равное `--memory` на v1).

### 1.4 `--memory-reservation`: мягкий лимит

```bash
docker run -d --name softmem \
  --memory 256m --memory-reservation 64m \
  alpine sleep 300
docker inspect --format 'Hard={{.HostConfig.Memory}} Soft={{.HostConfig.MemoryReservation}}' softmem
# Hard=268435456 Soft=67108864
docker rm -f softmem
```

**Ожидаемо:** `Hard=268435456 Soft=67108864` (256 MiB / 64 MiB).

---

## 2. CPU: `--cpus`, `--cpu-shares`, `--cpuset-cpus`

### 2.1 `--cpus` — жёсткий потолок

Запускаем **без лимита** и **с лимитом**, сравниваем пропускную способность:

```bash
# Без лимита
time docker run --rm --name cpu-nolimit alpine \
  sh -c 'apk add --no-cache bc >/dev/null 2>&1; \
         time (i=0; while [ $i -lt 200000 ]; do i=$((i+1)); done)'
# real    0m0.363s
# user    0m0.020s
# sys     0m0.016s


# С лимитом 0.5 CPU
time docker run --rm --name cpu-half --cpus 0.5 alpine \
  sh -c 'apk add --no-cache bc >/dev/null 2>&1; \
         time (i=0; while [ $i -lt 200000 ]; do i=$((i+1)); done)'
# real    0m0.347s
# user    0m0.021s
# sys     0m0.018s
```

**Ожидаемо:** второй вариант **примерно в 2 раза медленнее** (плюс накладные расходы `apk`). Если у вас больше одного ядра — разница будет заметна.


### 2.2 `--cpu-shares` — вес при конкуренции

Запускаем два «жадных» процесса: один с весом 1024 (по умолчанию), второй с весом 512.

```bash
# Контейнер A — вес по умолчанию
docker run -d --name cpuA alpine sh -c 'while :; do :; done'
# Контейнер B — вес в 2 раза меньше
docker run -d --name cpuB --cpu-shares 512 alpine sh -c 'while :; do :; done'

sleep 5
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}"
# NAME      CPU %
# cpuB      99.40%
# cpuA      99.42%
docker rm -f cpuA cpuB
```

**Ожидаемо:** при **одном** ядре CPU% примерно 66% / 33% (соотношение 1024:512 ≈ 2:1). При **свободных** ядрах оба процесса могут занять по 100% — вес работает только при конкуренции.

### 2.3 `--cpuset-cpus` — привязка к ядрам

```bash
docker run -d --name pin --cpuset-cpus "0" alpine sh -c 'while :; do :; done'
sleep 2
# Запустите на хосте: top, нажмите '1' — нагрузка должна быть только на CPU0
docker rm -f pin
```

Альтернатива без `top`:

```bash
docker run --rm --cpuset-cpus "0" alpine cat /sys/fs/cgroup/cpuset.cpus.effective
# 0
```

**Ожидаемо:** `0` (или `0-0`).

### 2.4 Чтение `cpu.max` изнутри

```bash
docker run --rm --cpus 0.5 alpine cat /sys/fs/cgroup/cpu.max
# 50000 100000
```

**Ожидаемо:** `50000 100000` — это `quota period`: 50 мс работы на каждые 100 мс.

```bash
docker run --rm --cpu-quota 20000 --cpu-period 100000 alpine cat /sys/fs/cgroup/cpu.max
# 20000 100000
```

**Ожидаемо:** `20000 100000` — эквивалент `--cpus 0.2`.

---

## 3. PIDs: `--pids-limit` и fork bomb

### 3.1 Демонстрация без лимита — ОПАСНО, только на своей машине

```bash
# Безопасный вариант: сразу с лимитом
docker run --rm --pids-limit 50 alpine \
  sh -c 'i=0; while [ $i -lt 100 ]; do sleep 1 & i=$((i+1)); done; wait' 2>&1 | tail -5
```

**Ожидаемо:** в какой-то момент `fork`/`clone` начинает падать с `Resource temporarily unavailable` (`EAGAIN`). Контейнер не «положит» хост.

### 3.2 Считаем потолок

```bash
docker run -d --name pids1 --pids-limit 32 alpine sleep 300
docker exec pids1 cat /sys/fs/cgroup/pids.max
# 32
docker exec pids1 cat /sys/fs/cgroup/pids.current
# 2
docker rm -f pids1
```

### 3.3 Fork bomb с лимитом (безопасно)

```bash
docker run --rm --pids-limit 64 alpine sh -c '
  bomb() { bomb | bomb & }
  bomb
' &
BOMB_PID=$!
sleep 3
docker ps --format '{{.Names}}' | head
kill $BOMB_PID 2>/dev/null || true
docker stop $(docker ps -q --filter ancestor=alpine) 2>/dev/null || true
```

**Ожидаемо:** контейнер не убивает хост; попытки форка упираются в `pids.max` и получают `EAGAIN`.

---

## 4. cgroup v2: смотрим глазами

### 4.1 Изнутри контейнера

```bash
docker run --rm --memory 128m --cpus 0.25 --pids-limit 64 alpine sh -c '
  echo "== memory.max ==";      cat /sys/fs/cgroup/memory.max
  echo "== memory.current ==";  cat /sys/fs/cgroup/memory.current
  echo "== cpu.max ==";         cat /sys/fs/cgroup/cpu.max
  echo "== pids.max ==";        cat /sys/fs/cgroup/pids.max
  echo "== pids.current ==";    cat /sys/fs/cgroup/pids.current
'

# == memory.max ==
# 134217728
# == memory.current ==
# 5623808
# == cpu.max ==
# 25000 100000
# == pids.max ==
# 64
# == pids.current ==
# 2
```

### 4.2 Снаружи: найти cgroup контейнера

```bash
CID=$(docker run -d --name cgv2 --memory 128m alpine sleep 300)
echo "container id: $CID"

# v2 (systemd-хост):
CGPATH="/sys/fs/cgroup/system.slice/docker-${CID}.scope"
ls "$CGPATH" 2>/dev/null | head

cat "$CGPATH/memory.max"
cat "$CGPATH/memory.current"
cat "$CGPATH/pids.max"

# Счётчики OOM
cat "$CGPATH/memory.events"

docker rm -f cgv2
```

**Ожидаемо:** `memory.max` = `134217728`, `memory.events` содержит строки `oom`, `oom_kill`, `high`, `max` (все по нулям, если OOM не было).

### 4.3 `memory.peak` — пик потребления

> Доступно на ядрах 5.19+. На более старых — используйте `memory.max_usage_in_bytes` (v1) или внешний мониторинг.

```bash
CID=$(docker run -d --name peak --memory 256m alpine sleep 60)
# немного нагрузим
docker exec peak sh -c 'dd if=/dev/zero of=/dev/null bs=1M count=200 &' 2>/dev/null
sleep 2
P="/sys/fs/cgroup/system.slice/docker-${CID}.scope"
cat "$P/memory.peak" 2>/dev/null || cat "$P/memory.max_usage_in_bytes" 2>/dev/null
docker rm -f peak
```

### 4.4 `cpu.stat` — throttling

```bash
CID=$(docker run -d --name cpu-stat --cpus 0.1 alpine sh -c 'while :; do :; done')
sleep 3
P="/sys/fs/cgroup/system.slice/docker-${CID}.scope"
cat "$P/cpu.stat"
docker rm -f cpu-stat
```

**Ожидаемо:** есть строки `nr_periods`, `nr_throttled`, `throttled_usec`; `nr_throttled` > 0 — контейнер «упирался» в CPU-квоту.

---

## 5. OOM: ловим и диагностируем

### 5.1 Сценарий A: cgroup OOM, `OOMKilled=true`

```bash
docker run --name oomA --memory 32m dockerhub.timeweb.cloud/polinux/stress-ng:latest \
  --vm 1 --vm-bytes 64M --vm-hang 0 --timeout 30s
echo "exit=$?"

docker inspect --format 'ExitCode={{.State.ExitCode}} OOMKilled={{.State.OOMKilled}}' oomA
# ExitCode=0 OOMKilled=true

docker events --filter container=oomA
# oom -> die


docker rm oomA
```

**Ожидаемо:**

- `exit=137`
- `ExitCode=137 OOMKilled=true`
- в `memory.events`: `oom 1`, `oom_kill 1` (может отличаться)
- в `dmesg` — строки вида `Memory cgroup out of memory: Killed process ... (stress-ng)`

### 5.2 Сценарий B: дочерний OOM, `OOMKilled=false`

Сделаем так, чтобы PID 1 контейнера — «оболочка», которая сама не ест память, а съест **дочерний** процесс.

```bash
docker run --name oomB --memory 1m alpine sh -c '
  # PID 1 — этот shell
  while :; do
    # дочерний процесс пытается съесть 128M
    head -c 128M /dev/zero >/dev/null 2>&1 || true
    sleep 1
  done
'
sleep 3
docker inspect --format 'ExitCode={{.State.ExitCode}} OOMKilled={{.State.OOMKilled}} Running={{.State.Running}}' oomB
docker rm -f oomB
```

**Ожидаемо:** контейнер **может** продолжать работать (`Running=true`, `OOMKilled=false`), но в `memory.events` появятся счётчики `oom`/`oom_kill` — ядро убивало **дочерние** процессы, а не PID 1.

> Поведение зависит от того, на чём именно «сорвался» OOM killer. Если ядро выбрало PID 1 — увидите `OOMKilled=true`. Если выбрало ребёнка — `OOMKilled=false`, но `oom_kill` в `memory.events` > 0. Упражнение показывает **разницу** между двумя случаями.

### 5.3 Сценарий C: внешний SIGKILL, `OOMKilled=false`

```bash
docker run -d --name killme --memory 128m alpine sleep 300
docker kill killme
sleep 1
docker inspect --format 'ExitCode={{.State.ExitCode}} OOMKilled={{.State.OOMKilled}}' killme
# ExitCode=137 OOMKilled=false
docker rm killme
```

**Ожидаемо:** `ExitCode=137 OOMKilled=false`. В `dmesg` — **нет** OOM-сообщений. Это внешний `SIGKILL`.

### 5.4 Сценарий D: `docker stop` и таймаут

```bash
docker run -d --name stopper --stop-timeout 2 alpine sh -c 'trap "" TERM; sleep 300'
time docker stop stopper
# real    0m2.333s
# user    0m0.029s
# sys     0m0.029s
docker inspect --format 'ExitCode={{.State.ExitCode}}' stopper
# ExitCode=137
docker rm stopper
```

**Ожидаемо:** `docker stop` ждёт 2 с, затем посылает `SIGKILL`, `ExitCode=137`, `OOMKilled=false`. Если бы приложение обрабатывало `SIGTERM` — вышло бы с `0` или `143` (128+15).

### 5.5 Сводная таблица наблюдаемого поведения

| Сценарий | ExitCode | OOMKilled | memory.events/oom_kill | dmesg OOM |
|---|---|---|---|---|
| A: cgroup OOM PID 1 | 137 | true | ≥1 | да |
| B: дочерний OOM | 0 или 137 | false | ≥1 | да |
| C: `docker kill` | 137 | false | 0 | нет |
| D: `docker stop` + timeout | 137 | false | 0 | нет |

---

## 6. `docker stats`: мониторинг лимитов

### 6.1 Живой мониторинг

```bash
docker run -d --name memload --memory 256m alpine \
  sh -c 'apk add --no-cache stress-ng >/dev/null 2>&1; \
         stress-ng --vm 1 --vm-bytes 200M --vm-keep --timeout 60s'

docker stats --no-stream --format \
  "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.CPUPerc}}\t{{.PIDs}}"
# NAME      MEM USAGE / LIMIT   MEM %     CPU %     PIDS
# memload   49.84MiB / 256MiB   19.47%    39.45%    2
# oomB      1.309MiB / 6MiB     21.81%    0.33%     2
docker rm -f memload
```

**Ожидаемо:** `MemUsage` вроде `210MiB / 256MiB`, `MemPerc` ~82%.

### 6.2 JSON-вывод для скриптов

```bash
docker run -d --name json-stats --memory 128m alpine sleep 60
docker stats --no-stream --format '{{json .}}' json-stats | head -c 400; echo
# {"BlockIO":"0B / 0B","CPUPerc":"0.00%","Container":"json-stats","ID":"8b12d6fd2b0c","MemPerc":"0.82%","MemUsage":"1.047MiB / 128MiB","Name":"json-stats","NetIO":"390B / 84B","PIDs":"1"}
docker rm -f json-stats
```

Используйте `jq` для парсинга в CI:

```bash
docker stats --no-stream --format '{{json .}}' <name> | jq '.MemPerc, .CPUPerc, .PIDs'
```

---

## 7. Мини-проект: «безопасный» контейнер с лимитами

Соберём Dockerfile и запустим его с **всеми** лимитами сразу.

### 7.1 Dockerfile

```dockerfile
FROM dockerhub.timeweb.cloud/library/alpine:3.20

# non-root пользователь
RUN addgroup -S app && adduser -S -G app app && \
    mkdir -p /app && chown -R app:app /app

USER app
WORKDIR /app

# лёгкая нагрузка, чтобы удобно было смотреть stats
CMD ["sh", "-c", "while :; do dd if=/dev/zero of=/dev/null bs=1M count=50 2>/dev/null; sleep 1; done"]
```

Сборка:

```bash
docker build -t lesson6/app:1.0 -f Dockerfile .
```

### 7.2 Запуск с полным набором ограничений

```bash
docker run -d --name app6 \
  --memory 128m \
  --memory-swap 128m \
  --cpus "0.25" \
  --pids-limit 64 \
  --read-only \
  --tmpfs /tmp:size=8m \
  --user 1000:1000 \
  --security-opt no-new-privileges=true \
  --cap-drop=ALL \
  --restart unless-stopped \
  lesson6/app:1.0

sleep 5
docker stats --no-stream --format \
  "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.CPUPerc}}\t{{.PIDs}}" app6
docker inspect --format 'OOMKilled={{.State.OOMKilled}}' app6
```

**Ожидаемо:** контейнер работает, лимиты видны в stats, `OOMKilled=false`, `PIDs` — небольшое число.

### 7.3 Нагрузочный тест — упираемся в лимиты

```bash
docker exec app6 sh -c 'i=0; while [ $i -lt 200 ]; do sleep 60 & i=$((i+1)); done' 2>&1 | tail -3
```

**Ожидаемо:** на определённом шаге `fork` начнёт падать с `Resource temporarily unavailable` — `pids.max` сработал.

Проверим `memory.events`:

```bash
CID=$(docker inspect --format '{{.Id}}' app6)
cat "/sys/fs/cgroup/system.slice/docker-${CID}.scope/memory.events" 2>/dev/null
```

### 7.4 Уборка

```bash
docker rm -f app6
docker rmi lesson6/app:1.0
```

---

## 8. Чек-лист самопроверки

| Что проверили | Раздел | Ожидаемый результат |
|---|---|---|
| `--memory` срабатывает | 1.1, 1.2 | `ExitCode=137`, `OOMKilled=true` |
| `--memory-swap = --memory` запрещает swap | 1.3 | `memory.swap.max = 0` |
| `--memory-reservation` виден в inspect | 1.4 | `Hard > Soft` |
| `--cpus` реально замедляет | 2.1 | в 2+ раза медленнее |
| `--cpu-shares` работает при конкуренции | 2.2 | соотношение ≈ весам |
| `--cpuset-cpus` виден изнутри | 2.3 | `cpuset.cpus.effective = 0` |
| `--pids-limit` блокирует форки | 3.1, 3.3 | `EAGAIN`, хост жив |
| cgroup v2 файлы читаются изнутри | 4.1 | `memory.max`, `cpu.max`, `pids.max` |
| `memory.events` считает OOM | 4.2, 5.1 | `oom_kill ≥ 1` |
| `cpu.stat` показывает throttling | 4.4 | `nr_throttled > 0` |
| Различаете 4 сценария exit 137 | 5.1–5.4 | см. таблицу §5.5 |
| `docker stats` + `jq` работают | 6.2 | JSON парсится |
| Полный «безопасный» запуск | 7.2 | лимиты видны, OOM нет |

---

## 9. Шпаргалка команд

```bash
# Память
docker run --memory 512m --memory-swap 512m myapp
docker run --memory 512m --memory-reservation 256m myapp

# CPU
docker run --cpus "1.5" myapp
docker run --cpu-shares 512 myapp
docker run --cpuset-cpus "0-3" myapp

# PID
docker run --pids-limit 100 myapp

# Диагностика
docker inspect --format 'ExitCode={{.State.ExitCode}} OOMKilled={{.State.OOMKilled}}' <name>
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.CPUPerc}}\t{{.PIDs}}'
cat /sys/fs/cgroup/system.slice/docker-<id>.scope/memory.events
cat /sys/fs/cgroup/system.slice/docker-<id>.scope/cpu.stat
dmesg | grep -iE "oom|killed process" | tail

# Внутри контейнера
cat /sys/fs/cgroup/memory.max
cat /sys/fs/cgroup/memory.current
cat /sys/fs/cgroup/cpu.max
cat /sys/fs/cgroup/pids.max
cat /sys/fs/cgroup/memory.events
```

---

## 10. Частые проблемы

| Симптом | Причина | Решение |
|---|---|---|
| `cat /sys/fs/cgroup/memory.max` → `No such file` | cgroup v1, другой путь | см. §0.4 |
| `docker stats` не показывает PIDs | старый Docker | обновите до 20.10+ |
| `--memory 4m` → ошибка | минимум `6m` | используйте `≥6m` |
| `ExitCode=137` без OOM | внешний SIGKILL | см. §5.3–5.4 |
| `stress-ng` «прошёл» с `--memory` больше фактической | лимит > реального потребления | уменьшите `--memory` |
| `docker run --oom-kill-disable` без `--memory` | Docker отклоняет | задайте `--memory` (но лучше не использовать флаг вообще) |
| JVM падает по OOM при свободном heap | non-heap (metaspace/direct) + накладные расходы | лимит = heap × 1.3–1.5, `-XX:MaxDirectMemorySize`, `-XX:MaxMetaspaceSize` |

---

## 11. Что дальше

- Урок 7 — Compose + прод-паттерны + CI/CD (лимиты в `deploy.resources` / `mem_limit` / `cpus`).
- Урок 8 — Отладка в проде (`exec`, `nsenter`, traces, логи), где cgroup-файлы и `docker stats` — базовый инструмент.
