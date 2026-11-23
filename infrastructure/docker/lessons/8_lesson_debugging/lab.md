# Docker — Lab 8 Journal. Отладка в проде

**Итого: ~3 часа 45 минут.** Если идёшь за один день — делай перерыв после **Lab 2** (strace/seccomp) и **Lab 5** (cgroup v2): там больше всего мелких нюансов с capability и путями cgroup в WSL.

---

## Lab 0. Окружение: cgroup v2, nsenter, strace, netshoot — 10 мин

**Цель:** убедиться, что хост использует **cgroup v2** (иначе пути `/sys/fs/cgroup/memory.current` будут другими), что есть `nsenter` и `strace`, и подтянуть `netshoot` — «швейцарский нож» для сетевой отладки.

```bash
wsl -d docker-desktop
```

**Проверка версии cgroup:**

```bash
stat -fc %T /sys/fs/cgroup/
# cgroup2fs     ← cgroup v2. Если "tmpfs" — у тебя cgroup v1, лабы 5 и 6 придётся адаптировать (пути /sys/fs/cgroup/memory/...)
```

**Проверка инструментов на хосте (WSL `docker-desktop`):**

```bash
nsenter --version
# nsenter from util-linux 2.39.x

strace -V
# strace -- version 6.x

which tcpdump || echo "tcpdump НЕТ — будем использовать netshoot"
```

Если `nsenter` или `strace` отсутствуют:

```bash
apt-get update && apt-get install -y util-linux strace
```

**Подтягиваем netshoot:**

```bash
docker pull dockerhub.timeweb.cloud/library/nicolaka/netshoot:latest 2>/dev/null \
  || docker pull nicolaka/netshoot:latest
```

**Готовим эталонный образ для экспериментов** (маленький, но с shell и python — пригодится в Lab 5 для OOM):

```bash
docker pull dockerhub.timeweb.cloud/library/python:3.12-alpine
docker pull dockerhub.timeweb.cloud/library/alpine:3.20
docker pull dockerhub.timeweb.cloud/library/nginx:1.25-alpine
```

**Что записать:** версию cgroup (`cgroup2fs`), наличие `nsenter`/`strace`, статус netshoot.

---

## Lab 1. `docker exec` vs `nsenter`: cgroup, namespaces и «кто кого обходит» — 25 мин

**Цель:** увидеть **разницу** между входом через `exec` и через `nsenter`: `exec` подчиняется **cgroup-лимитам** контейнера, `nsenter` — **нет**. Проверить, что `nsenter` работает **только с хоста**.

```bash
wsl -d docker-desktop
```

### Часть A — `exec` подчиняется cgroup

```bash
docker run -d --name lab8-exec --memory=64M --cpus=0.5 \
  dockerhub.timeweb.cloud/library/alpine:3.20 sleep 600

# Заходим через exec и читаем cgroup-файлы «своей» cgroup
docker exec lab8-exec sh -c '
  echo "--- memory.current ---"
  cat /sys/fs/cgroup/memory.current
  echo "--- memory.max ---"
  cat /sys/fs/cgroup/memory.max
  echo "--- pids in cgroup ---"
  cat /sys/fs/cgroup/cgroup.procs | wc -l
'
```

**Ожидаемо:**

```
--- memory.current ---
1234567
--- memory.max ---
67108864          ← 64 MiB = 64 * 1024 * 1024
--- pids in cgroup ---
1
```

`memory.max` совпадает с `--memory=64M`. `exec`-процесс — **внутри** этой cgroup.

### Часть B — `nsenter` **обходит** cgroup

Найдём PID контейнера **с хоста** (из WSL `docker-desktop`):

```bash
PID=$(docker inspect --format '{{.State.Pid}}' lab8-exec)
echo "PID=$PID"

sudo nsenter --target "$PID" --mount --uts --ipc --net --pid -- \
  sh -c 'cat /proc/self/cgroup; echo "---"; cat /sys/fs/cgroup/memory.max 2>&1'
```

**Ожидаемо:** `memory.max` **не** равен 64M — либо `max` (без лимита), либо путь ведёт к **root** cgroup хоста. Это значит, что процесс, запущенный через `nsenter`, **не ограничен** 64M памяти контейнера.

**Проверка на практике — обход лимита:**

```bash
# Через exec: 200MB в 64M контейнере → OOM
docker exec lab8-exec sh -c 'echo "exec: try 200MB"; python3 -c "x = bytearray(200*1024*1024)"' 2>&1 | tail -2

# Через nsenter: те же 200MB — проходят (лимита нет)
sudo nsenter --target "$PID" --mount --uts --ipc --net --pid -- \
  sh -c 'echo "nsenter: try 200MB"; python3 -c "x = bytearray(200*1024*1024); print(\"OK\", len(x))"' 2>&1 | tail -2
```

**Ожидаемо:** первая команда — ошибка/OOM (python умирает с `MemoryError` или `Killed`); вторая — `OK 209715200`. Это **и есть** разница: `nsenter` обходит cgroup, `exec` — нет.

### Часть C — `nsenter` не работает «изнутри» другого контейнера

```bash
# Пытаемся nsenter из контейнера — не выйдет: нужен доступ к PID хоста
docker run --rm dockerhub.timeweb.cloud/library/alpine:3.20 \
  sh -c 'nsenter --target 1 --mount --uts --ipc --net --pid -- sh 2>&1 || echo "FAIL"' | head -3
```

**Ожидаемо:** `nsenter: cannot open /proc/1/ns/pid: Permission denied` (или `No such file or directory`). `nsenter` работает **только с хоста** — изнутри контейнера без `--privileged --pid=host` его не запустить.

### Часть D — distroless: `exec` невозможен, `nsenter` — да

```bash
# distroless-образ: в нём НЕТ shell
docker run -d --name lab8-distroless --memory=32M gcr.io/distroless/static:nonroot sleep 600 2>/dev/null \
  || docker run -d --name lab8-distroless --memory=32M gcr.io/distroless/static:nonroot

# exec не сможет запустить sh
docker exec lab8-distroless sh -c 'echo hi'
# OCI runtime exec failed: exec: "sh": executable file not found in $PATH

# nsenter — работает (шёл через хостовый namespace)
PID2=$(docker inspect --format '{{.State.Pid}}' lab8-distroless)
sudo nsenter --target "$PID2" --mount --uts --ipc --net --pid -- /bin/sh 2>/dev/null \
  || echo "nsenter: OK, но в distroless нет shell — используем debug-контейнер"

# Правильный способ для distroless — docker debug (если доступен)
docker debug lab8-distroless 2>&1 | head -3 \
  || echo "docker debug недоступен — используем netshoot с --net container:"
```

**Что записать:**

| Инструмент | cgroup | Namespace | Работает из контейнера | Работает с distroless |
|---|---|---|---|---|
| `docker exec` | ✅ внутрь | ✅ внутрь | ✅ | ❌ (нет shell) |
| `nsenter` | ❌ **обходит** | ✅ внутрь | ❌ только с хоста | ⚠️ (если есть хоть один бинарник) |
| `docker debug` | ✅ | ✅ | ✅ | ✅ |

```bash
docker rm -f lab8-exec lab8-distroless 2>/dev/null || true
```

---

## Lab 2. `strace` + seccomp: почему `ptrace` блокируется и как построить профиль — 35 мин

**Цель:** воспроизвести ошибку `strace: ptrace: Operation not permitted`, показать два способа её обойти, затем построить **минимальный** seccomp-профиль по выводу `strace -f`, и продемонстрировать `EPERM`, который возникает, если профиль не содержит нужный syscall.

```bash
wsl -d docker-desktop
mkdir -p /tmp/lab8/lab2 && cd /tmp/lab8/lab2
```

### Часть A — `ptrace` заблокирован по умолчанию

```bash
docker run --rm --name lab8-strace \
  dockerhub.timeweb.cloud/library/python:3.12-alpine \
  sh -c 'strace -p 1 2>&1 | head -1'
```

**Ожидаемо:**

```
strace: attach: ptrace(PTRACE_SEIZE, 1): Operation not permitted
```

Причина: Docker’s default seccomp-профиль **блокирует** `ptrace` для процессов **без** `CAP_SYS_PTRACE`.

### Часть B — `--cap-add SYS_PTRACE` (и fallback `seccomp=unconfined`)

```bash
# Способ 1: только capability
docker run --rm --cap-add SYS_PTRACE \
  dockerhub.timeweb.cloud/library/python:3.12-alpine \
  sh -c 'strace -p 1 -e trace=read 2>&1 | head -2; echo "exit=$?"'
```

**Ожидаемо:** либо успешный `strace` (на современных Docker default seccomp исключает блок `ptrace` при наличии `CAP_SYS_PTRACE`), либо та же ошибка. Если ошибка — добавляем `seccomp=unconfined`:

```bash
# Способ 2 (fallback / «на время отладки»): отключаем seccomp
docker run --rm --cap-add SYS_PTRACE --security-opt seccomp=unconfined \
  dockerhub.timeweb.cloud/library/python:3.12-alpine \
  sh -c 'strace -p 1 -e trace=read 2>&1 | head -2; echo "exit=$?"'
```

**Ожидаемо:** `strace` работает — либо сразу, либо со вторым флагом.

> ⚠️ **Не оставляй `seccomp=unconfined` в проде.** Это **полностью** отключает фильтрацию syscall’ов. На время отладки — допустимо; в проде — используй **кастомный** профиль (см. часть C–D).

### Часть C — `strace -f`: собрать **все** syscall’ы приложения

```bash
cat > app.py <<'EOF'
import os, subprocess
def main():
    x = bytearray(1024 * 1024)   # 1 MiB
    subprocess.run(["sh", "-c", "echo hello from child > /tmp/child.txt"])
    print(os.getpid(), len(x))
if __name__ == "__main__":
    main()
EOF

docker run --rm --cap-add SYS_PTRACE \
  -v "$PWD":/work -w /work \
  dockerhub.timeweb.cloud/library/python:3.12-alpine \
  sh -c 'strace -f -o /tmp/trace.txt python app.py >/dev/null; echo "--- syscalls used ---"; \
         grep -oP "^(?:\[pid \d+\] )?\K[a-z_][a-z0-9_]+" /tmp/trace.txt | sort -u | head -40'
```

**Ожидаемо:** список syscall’ов, включающий `execve`, `clone`, `fork`, `read`, `write`, `mmap`, `exit_group` и т. д. **Ключевое:** `-f` — обязательно, иначе **syscall’ы дочернего процесса** (`sh -c "echo"`) не попадут в трейс. Убедимся:

```bash
# Без -f — дочерних syscall'ов нет
docker run --rm --cap-add SYS_PTRACE \
  -v "$PWD":/work -w /work \
  dockerhub.timeweb.cloud/library/python:3.12-alpine \
  sh -c 'strace -o /tmp/trace-no-f.txt python app.py >/dev/null; \
         grep -c "execve" /tmp/trace-no-f.txt || echo "нет execve (дочерние не трассировались)"'
```

**Ожидаемо:** либо 0, либо отсутствие `execve` от дочернего процесса. **`-f` обязателен** при построении seccomp-профиля — иначе профиль «сломает» приложение при первом `fork`.

### Часть D — минимальный **deny** профиль, который ломает приложение

```bash
cat > seccomp-deny-mkdir.json <<'EOF'
{
  "defaultAction": "SCMP_ACT_ALLOW",
  "architectures": ["SCMP_ARCH_X86_64", "SCMP_ARCH_AARCH64"],
  "syscalls": [
    {
      "names": ["mkdir", "mkdirat"],
      "action": "SCMP_ACT_ERRNO",
      "errnoRet": 1
    }
  ]
}
EOF

docker run --rm \
  --security-opt seccomp=./seccomp-deny-mkdir.json \
  dockerhub.timeweb.cloud/library/alpine:3.20 \
  sh -c 'mkdir /tmp/test 2>&1; echo "exit=$?"'
```

**Ожидаемо:**

```
mkdir: can't create directory '/tmp/test': Operation not permitted
exit=1
```

Вот он — **`EPERM` из seccomp**, а **не** из прав ФС (от root’а `mkdir` бы сработал). Именно так выглядит «загадочная» ошибка, когда приложение в проде падает с `Operation not permitted` на ровном месте.

### Часть E — как строить **allow** профиль по `strace`

Паттерн:

1. Запустить приложение под `strace -f -o /tmp/trace.txt` в **dev** без seccomp.
2. Собрать **уникальные** syscall’ы: `grep -oP "^(?:\[pid \d+\] )?\K[a-z_][a-z0-9_]+" /tmp/trace.txt | sort -u`.
3. Построить профиль `defaultAction: SCMP_ACT_ERRNO` + `syscalls: [{names: [...], action: SCMP_ACT_ALLOW}]`.
4. Прогнать в staging и **добавлять** недостающие syscall’ы, пока не исчезнут `EPERM`/`SIGSYS`.

**Что записать:**
- `strace` требует `ptrace`, а `ptrace` блокируется default seccomp.
- `--cap-add SYS_PTRACE` — минимум; `seccomp=unconfined` — **только** для отладки.
- `strace -f` — **обязателен** для дочерних процессов.
- Deny-профиль без нужного syscall → `EPERM`, который **легко спутать** с проблемой прав ФС.

```bash
rm -rf /tmp/lab8/lab2
```

---

## Lab 3. `tcpdump` / `netshoot`: увидеть, что реально летит по сети — 30 мин

**Цель:** воспроизвести ситуацию «сервис вроде Up, но не отвечает», снять трафик **с точки зрения target-контейнера** через `netshoot` в общем `network namespace`, и по `tcpdump` понять, **где** рвётся.

```bash
wsl -d docker-desktop
mkdir -p /tmp/lab8/lab3 && cd /tmp/lab8/lab3
```

### Часть A — сервис слушает **не тот** интерфейс

```bash
# Python http.server по умолчанию слушает 0.0.0.0 — это «правильно»
# Сделаем «неправильно»: nginx слушает только 127.0.0.1 внутри контейнера
cat > nginx.conf <<'EOF'
server {
    listen 127.0.0.1:8080;
    location / { return 200 "hello\n"; }
}
EOF

docker run -d --name lab8-target \
  -v "$PWD/nginx.conf":/etc/nginx/conf.d/default.conf:ro \
  dockerhub.timeweb.cloud/library/nginx:1.25-alpine

# С другой стороны — netshoot, который стучится
docker run -d --name lab8-client \
  dockerhub.timeweb.cloud/library/nicolaka/netshoot \
  sleep 600
```

**Проверка из клиента:**

```bash
docker exec lab8-client sh -c 'nc -zv lab8-target 8080 2>&1 | head -2'
# nc: bad address 'lab8-target'        ← если сети не пересекаются
# (или connection refused, если DNS резолвится, но порт не слушается)
```

**Исправляем сеть** (клиент и target должны быть в одной сети):

```bash
docker network create lab8-net
docker network connect lab8-net lab8-target
docker network connect lab8-net lab8-client

docker exec lab8-client sh -c 'nc -zv lab8-target 8080 2>&1 | head -2'
# lab8-target (172.x.x.x:8080) open     ← порт открыт с точки зрения клиента
```

### Часть B — `ss` внутри target: **на каком** адресе слушает

Запускаем netshoot **в namespace target’а**:

```bash
docker run -it --rm --net container:lab8-target \
  dockerhub.timeweb.cloud/library/nicolaka/netshoot \
  sh -c 'ss -tlnp'
```

**Ожидаемо:**

```
State   Recv-Q  Send-Q  Local Address:Port  Peer Address:Port  Process
LISTEN  0       511     127.0.0.1:8080      0.0.0.0:*          nginx
```

Видно: nginx слушает **только** `127.0.0.1:8080`, а не `0.0.0.0:8080`. Снаружи (с точки зрения клиента) `nc` **тоже** говорит `open` — потому что попали в **loopback через namespace**? Нет — `nc -zv lab8-target 8080` идёт по сети и **не** должен попасть в `127.0.0.1:8080` target’а. Если `nc` показал `open` — значит nginx **на самом деле** слушает на `0.0.0.0`. Давай перепроверим точнее:

```bash
# Внутри netshoot, в namespace target
docker run -it --rm --net container:lab8-target \
  dockerhub.timeweb.cloud/library/nicolaka/netshoot \
  sh -c 'ss -tlnp | grep 8080'
```

Если вывод показывает `127.0.0.1:8080` — значит **неправильный** конфиг, но `nc` из клиента должен получить `connection refused`, потому что `127.0.0.1` в **разных** network namespaces — **разные** loopback’и.

**Проверка:**

```bash
docker exec lab8-client sh -c 'nc -zv lab8-target 8080 2>&1 | head -2'
# lab8-target (172.x.x.x:8080) : Connection refused   ← ПРАВИЛЬНЫЙ результат при listen 127.0.0.1
```

**Если получил `Connection refused`** — это **тот самый** класс проблем: сервис слушает **только loopback**, снаружи не доступен. В реальном приложении это часто означает, что конфиг биндится на `127.0.0.1` вместо `0.0.0.0` — нужно исправить `listen` в конфиге.

**Фикс:**

```bash
sed -i 's/127.0.0.1:8080/0.0.0.0:8080/' nginx.conf
docker restart lab8-target
docker exec lab8-client sh -c 'nc -zv lab8-target 8080 2>&1 | head -2'
# lab8-target (172.x.x.x:8080) open   ← теперь открыт снаружи
```

### Часть C — `tcpdump` **с точки зрения target’а**

```bash
docker run -it --rm --net container:lab8-target \
  dockerhub.timeweb.cloud/library/nicolaka/netshoot \
  sh -c 'tcpdump -i eth0 -nn "tcp port 8080" -c 4 -w /tmp/cap.pcap & sleep 1; \
         echo "capturing..."; sleep 3; kill %1; \
         echo "--- captured ---"; tcpdump -r /tmp/cap.pcap -nn | head -10'
```

Параллельно (в другом терминале) дёргаем target:

```bash
docker exec lab8-client sh -c 'for i in 1 2 3; do curl -s -o /dev/null -w "%{http_code}\n" --max-time 2 http://lab8-target:8080/ ; done'
```

**Ожидаемо:** в `cap.pcap` видны **SYN → SYN-ACK → ACK → GET → 200**. Если видишь **SYN без SYN-ACK** — target не отвечает (завис, слушает не тот интерфейс, блокирует firewall). Если SYN **нет вообще** — пакеты не доходят до target’а (DNS, маршрутизация, ACL).

### Часть D — `--net container:` как универсальный способ

**Запомни паттерн** — он пригодится в капстоуне:

```bash
# «Смотрю на сеть target'а снаружи»
docker run --rm -it --net container:<TARGET> nicolaka/netshoot <команда>

# «Смотрю на сеть target'а из другого контейнера»
docker run --rm -it --net container:<TARGET> nicolaka/netshoot ss -tlnp
docker run --rm -it --net container:<TARGET> nicolaka/netshoot tcpdump -i eth0 -nn -c 10 -w /tmp/cap.pcap
```

**Что записать:**
- `ss -tlnp` внутри `--net container:` показывает, на **каком** адресе слушает сервис: `0.0.0.0` (ок) vs `127.0.0.1` (плохо).
- `tcpdump` с `-w` и `-c` — обязательно (иначе можно уронить нагруженный интерфейс).
- `SYN` без `SYN-ACK` → сервис **не отвечает** (завис/слушает не там).
- `SYN` нет вообще → проблема **до** target’а (сеть/DNS/ACL).

```bash
docker rm -f lab8-target lab8-client 2>/dev/null || true
docker network rm lab8-net 2>/dev/null || true
rm -rf /tmp/lab8/lab3
```

---

## Lab 4. `docker events` с фильтрами — 20 мин

**Цель:** научиться вытаскивать из `docker events` только то, что нужно для инцидента: `die` с `exitCode`, `oom`, `health_status`, — и **форматировать** для отправки в систему алертинга.

```bash
wsl -d docker-desktop
```

### Часть A — базовые фильтры

```bash
docker run -d --name lab8-events \
  dockerhub.timeweb.cloud/library/alpine:3.20 sleep 300

# В одном терминале — поток событий, отфильтрованный по контейнеру:
docker events --filter 'container=lab8-events' --format '{{.Time}} {{.Action}} {{.Actor.Attributes.name}}'
```

**В другом терминале** — триггерим события:

```bash
docker stop lab8-events       # die, stop, kill
docker start lab8-events      # start
docker kill lab8-events       # kill, die (SIGKILL → exit 137)
```

**Ожидаемо** (в потоке первого терминала):

```
2026-11-23T16:01:00.000000000+03:00 start lab8-events
2026-11-23T16:01:05.000000000+03:00 kill lab8-events
2026-11-23T16:01:05.000000000+03:00 die lab8-events
```

### Часть B — `die` с `exitCode`: различаем `SIGTERM` и `SIGKILL`

```bash
# SIGTERM (штатная остановка)
docker stop lab8-events
docker events --since 1m --until 0s \
  --filter 'container=lab8-events' --filter 'event=die' \
  --format '{{.Time}} die exitCode={{.Actor.Attributes.exitCode}}'
# 2026-11-23T... die exitCode=143     ← 128 + 15 (SIGTERM)

# SIGKILL (жёстко)
docker start lab8-events
docker kill lab8-events
docker events --since 1m --until 0s \
  --filter 'container=lab8-events' --filter 'event=die' \
  --format '{{.Time}} die exitCode={{.Actor.Attributes.exitCode}}'
# 2026-11-23T... die exitCode=137     ← 128 + 9 (SIGKILL)
```

**Ожидаемо:** `143` для `stop`, `137` для `kill`. Если `137` **без** `kill` — это **OOM** (см. Lab 5).

### Часть C — `oom` и `health_status`

```bash
# Healthcheck, который сначала падает, потом «выздоравливает»
docker run -d --name lab8-health \
  --health-cmd='test -f /tmp/healthy' \
  --health-interval=2s --health-retries=1 --health-timeout=1s \
  dockerhub.timeweb.cloud/library/alpine:3.20 sleep 300

# Поток событий только по healthcheck
docker events --filter 'container=lab8-health' --filter 'event=health_status' \
  --format '{{.Time}} {{.Action}} status={{.Actor.Attributes.health_status}}'
```

**В другом терминале:**

```bash
sleep 3
docker exec lab8-health touch /tmp/healthy     # → healthy
sleep 3
docker exec lab8-health rm /tmp/healthy        # → unhealthy (если healthcheck не проходит 1 раз — retries=1)
```

**Ожидаемо:**

```
... health_status status=unhealthy
... health_status status=healthy
... health_status status=unhealthy
```

### Часть D — формат для алертинга

```bash
docker events \
  --filter 'type=container' \
  --filter 'event=die' --filter 'event=oom' --filter 'event=health_status' \
  --format '{{.Time}}|{{.Action}}|{{.Actor.Attributes.name}}|{{.Actor.Attributes.exitCode}}|{{.Actor.Attributes.health_status}}'
```

**Ожидаемо:** каждая строка — одно событие. **Эту строку** удобно отдавать в `logger`, `fluent-bit`, вебхук.

> **Полезно:** `docker events` **не** хранит историю. Если контейнер умер час назад — `events` его **не покажет**. Для ретроспективы — `journalctl -u docker` (см. Урок 4.7) или внешний коллектор (`fluent-bit`, `vector`), который **слушает** `docker events` и **пишет** в хранилище.

**Что записать:**
- `exitCode=137` → SIGKILL → OOM (проверить `memory.events`, Lab 5).
- `exitCode=143` → SIGTERM → штатная остановка.
- `docker events` **не персистентный** — для истории нужен внешний коллектор.
- Формат `{{.Actor.Attributes.exitCode}}` — единственный способ различить `die` без `inspect`.

```bash
docker rm -f lab8-events lab8-health 2>/dev/null || true
```

---

## Lab 5. cgroup v2: `memory.current`, `memory.events`, `cpu.stat` — 30 мин

**Цель:** научиться читать **приборную панель** ресурсов контейнера и **отличать** OOM, throttling и «просто нагрузку». Увидеть кейс, где `State.OOMKilled=false`, но `memory.events` показывает `oom_kill`.

```bash
wsl -d docker-desktop
```

### Часть A — `memory.current` vs `memory.max`

```bash
docker run -d --name lab8-mem --memory=64M --cpus=0.5 \
  dockerhub.timeweb.cloud/library/python:3.12-alpine sleep 600

docker exec lab8-mem sh -c '
  echo "current: $(cat /sys/fs/cgroup/memory.current) bytes"
  echo "max:     $(cat /sys/fs/cgroup/memory.max) bytes"
  echo "swap.max: $(cat /sys/fs/cgroup/memory.swap.max 2>/dev/null || echo n/a)"
  echo "pids.max: $(cat /sys/fs/cgroup/pids.max)"
'
```

**Ожидаемо:**

```
current: ~31457280 bytes      ← ~30 MiB (python idle)
max:     67108864 bytes      ← 64 MiB
swap.max: 0
pids.max: max
```

`current`/`max` — **главный индикатор** риска OOM. Если `current` близко к `max` — следующий allocation может стать последним.

### Часть B — OOM, `State.OOMKilled=true`, `memory.events.oom_kill > 0`

```bash
docker rm -f lab8-mem 2>/dev/null || true

# Запускаем процесс, который сразу выест больше лимита
docker run --name lab8-oom --memory=50M --memory-swap=50M \
  dockerhub.timeweb.cloud/library/python:3.12-alpine \
  python -c 'x = bytearray(200*1024*1024); print("never")' 2>&1 | tail -2

docker inspect lab8-oom --format 'State.ExitCode={{.State.ExitCode}} State.OOMKilled={{.State.OOMKilled}}'
# State.ExitCode=137 State.OOMKilled=true
```

**Ожидаемо:** `137` + `OOMKilled=true`. Классика.

Теперь проверим **cgroup-файлы** — но контейнер уже **Exited**, поэтому `memory.events` **исчез** вместе с cgroup. Нам нужен **живой** контейнер, чтобы прочитать их **после** OOM’а:

```bash
docker rm -f lab8-oom 2>/dev/null || true

# PID 1 = sleep, container живёт. OOM будет убивать exec-процессы
docker run -d --name lab8-oom-live --memory=50M --memory-swap=50M \
  dockerhub.timeweb.cloud/library/python:3.12-alpine sleep 600

# Триггерим OOM через exec (exec-процесс умрёт, PID 1 sleep — выживет)
docker exec lab8-oom-live python -c 'x = bytearray(200*1024*1024)' 2>&1 | tail -2
# MemoryError  (или "Killed", если OOM killer успел)

docker inspect lab8-oom-live --format 'State.OOMKilled={{.State.OOMKilled}}'
# State.OOMKilled=false     ← PID 1 не убит

docker exec lab8-oom-live sh -c 'grep -E "^(oom|oom_kill)" /sys/fs/cgroup/memory.events'
# oom 1
# oom_kill 1               ← АВТОРИТЕТНЫЙ источник: OOM БЫЛ
```

**Это и есть тот самый кейс:** `OOMKilled=false` (Docker’s флаг), но `memory.events.oom_kill=1` (реальный факт). В cgroup v2 **всегда** проверяй `memory.events`, если подозреваешь OOM.

### Часть C — `cpu.stat`: throttling vs реальная нагрузка

```bash
docker rm -f lab8-oom-live 2>/dev/null || true
docker run -d --name lab8-cpu --cpus=0.1 \
  dockerhub.timeweb.cloud/library/alpine:3.20 \
  sh -c 'while true; do :; done'

sleep 5

docker exec lab8-cpu sh -c 'cat /sys/fs/cgroup/cpu.stat'
```

**Ожидаемо:**

```
usage_usec 500000
user_usec 500000
system_usec 0
nr_periods 500
nr_throttled 480       ← почти каждый период — throttled
throttled_usec 450000
```

- `nr_periods` — сколько 100ms-периодов прошло.
- `nr_throttled` — сколько из них процесс **упирался** в CPU-лимит.
- `throttled_usec` — сколько микросекунд процесс **принудительно** ждал.

**Мнемоника:** если `nr_throttled / nr_periods > 0.5` → контейнер **задыхается** от CPU-лимита. Увеличивай `--cpus` или чини приложение.

Сравни с **«просто нагрузкой»**:

```bash
docker rm -f lab8-cpu 2>/dev/null || true
docker run -d --name lab8-cpu --cpus=2.0 \
  dockerhub.timeweb.cloud/library/alpine:3.20 \
  sh -c 'while true; do :; done'
sleep 5
docker exec lab8-cpu sh -c 'cat /sys/fs/cgroup/cpu.stat'
# nr_throttled 0 или близко к 0   ← лимита хватает
docker rm -f lab8-cpu 2>/dev/null || true
```

### Часть D — `pids.current` / `pids.max`: fork-бомба

```bash
docker run -d --name lab8-pids --pids-limit=10 \
  dockerhub.timeweb.cloud/library/alpine:3.20 sleep 600

docker exec lab8-pids sh -c '
  echo "current: $(cat /sys/fs/cgroup/pids.current)"
  echo "max:     $(cat /sys/fs/cgroup/pids.max)"
  echo "--- попытка запустить 20 sleep'ов ---"
  for i in $(seq 1 20); do sleep 0.01 & done 2>&1 | head -5
  wait
' 2>&1 | head -10
```

**Ожидаемо:** `current` близко к `max`, часть `sleep`’ов падает с `Resource temporarily unavailable` (EAGAIN) — это **fork fails** из-за `pids.max`. Симптом в проде: приложение не может запускать новые потоки/процессы.

**Что записать:**

| Файл | Что смотреть | Когда красный флаг |
|---|---|---|
| `memory.current` / `memory.max` | ratio | `> 0.8` — риск OOM |
| `memory.events` | `oom_kill` | `> 0` — OOM был |
| `cpu.stat` | `nr_throttled / nr_periods` | `> 0.5` — throttling |
| `pids.current` / `pids.max` | ratio | близко к 1 — fork fails |

```bash
docker rm -f lab8-mem lab8-oom-live lab8-cpu lab8-pids 2>/dev/null || true
```

---

## Lab 6. «Чёрный ящик»: постмортем, когда контейнер уже мёртв — 20 мин

**Цель:** отработать **порядок** действий при разборе инцидента: **`ps -a` → `inspect` → `events` → `logs` → cgroup**. Не начинать с логов.

```bash
wsl -d docker-desktop
```

### Часть A — три сценария смерти

**Сценарий 1: приложение упало с ошибкой (`exit 1`)**

```bash
docker run --name lab8-dead-1 dockerhub.timeweb.cloud/library/alpine:3.20 \
  sh -c 'echo "starting"; sleep 1; echo "oops" >&2; exit 1'

docker ps -a --filter 'name=lab8-dead-1' --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
# lab8-dead-1   Exited (1) 2 seconds ago   alpine:3.20
```

**Сценарий 2: OOM (`exit 137`)**

```bash
docker run --name lab8-dead-137 --memory=50M --memory-swap=50M \
  dockerhub.timeweb.cloud/library/python:3.12-alpine \
  python -c 'x = bytearray(200*1024*1024)'
# (контейнер уже Exited)
```

**Сценарий 3: SIGTERM (`exit 143`)**

```bash
docker run -d --name lab8-dead-143 dockerhub.timeweb.cloud/library/alpine:3.20 sleep 600
sleep 1
docker stop lab8-dead-143
# (контейнер Exited с 143)
```

### Часть B — постмортем по сценарию 2 (`exit 137`)

**Шаг 1. `ps -a` — что вообще есть?**

```bash
docker ps -a --filter 'name=lab8-dead-137'
# CONTAINER ID   IMAGE              COMMAND                  STATUS                       NAMES
# abc123...      python:3.12-alpine "python -c 'x = bytea…"  Exited (137) 5 seconds ago   lab8-dead-137
```

**Шаг 2. `inspect` — читаем `State`**

```bash
docker inspect lab8-dead-137 --format '
  Status:     {{.State.Status}}
  ExitCode:   {{.State.ExitCode}}
  OOMKilled:  {{.State.OOMKilled}}
  StartedAt:  {{.State.StartedAt}}
  FinishedAt: {{.State.FinishedAt}}
  RestartCount: {{.RestartCount}}
  RestartPolicy: {{.HostConfig.RestartPolicy.Name}}
'
```

**Ожидаемо:**

```
Status:     exited
ExitCode:   137
OOMKilled:  true          ← вот и ответ: OOM
StartedAt:  2026-11-23T...
FinishedAt: 2026-11-23T...
RestartCount: 0
RestartPolicy: no
```

**Шаг 3. `events` — что было до смерти?**

```bash
docker events --since 5m --until 0s \
  --filter 'container=lab8-dead-137' \
  --format '{{.Time}} {{.Action}} exitCode={{.Actor.Attributes.exitCode}}'
# 2026-11-23T... create exitCode=
# 2026-11-23T... start exitCode=
# 2026-11-23T... die exitCode=137
```

**Шаг 4. `logs` — только теперь**

```bash
docker logs lab8-dead-137 2>&1 | tail -10
# (пусто — python упал до вывода)
```

**Шаг 5. cgroup — если контейнер ещё существует**

```bash
# cgroup удаляется после удаления контейнера → проверять надо СРАЗУ
ls /sys/fs/cgroup/system.slice/docker-$(docker inspect --format '{{.Id}}' lab8-dead-137).scope/ 2>/dev/null \
  || echo "cgroup уже удалён — memory.events недоступен"
```

> **Практика:** для **постмортема** нужен либо **живой** контейнер (Lab 5, часть B), либо **внешний коллектор** `memory.events` (например, `node_exporter` с `--collector.cgroups`). `docker inspect` даёт **верхнеуровневый** ответ (`OOMKilled`), но **не** детали.

### Часть C — постмортем по сценарию 1 (обычный `exit 1`)

```bash
docker inspect lab8-dead-1 --format 'ExitCode={{.State.ExitCode}} OOMKilled={{.State.OOMKilled}}'
# ExitCode=1 OOMKilled=false

docker logs lab8-dead-1 2>&1 | tail -5
# starting
# oops
```

**Вывод:** `exit 1` + `OOMKilled=false` + осмысленный лог → **ошибка приложения**, не инфраструктуры. Читаем логи **приложения**, а не ищем OOM.

### Часть D — универсальный чек-лист постмортема

```
1. docker ps -a --filter name=<...>      → контейнер вообще существует?
2. docker inspect --format '{{.State.ExitCode}} {{.State.OOMKilled}} ...'
   ├─ ExitCode=137 + OOMKilled=true   → OOM (Lab 5)
   ├─ ExitCode=137 + OOMKilled=false  → проверить memory.events (Lab 5, ч. B)
   ├─ ExitCode=143                     → SIGTERM (stop)
   ├─ ExitCode=1/2                     → ошибка приложения → logs
   └─ ExitCode=0                       → штатный выход → почему command завершился?
3. docker events --since 30m ...    → die? oom? restart? health_status?
4. docker logs --tail 200           → логи приложения
5. cat /sys/fs/cgroup/... (если жив) → memory.events, cpu.stat
```

**Что записать:**

| Exit code | OOMKilled | Вердикт |
|---|---|---|
| 137 | true | OOM (top-level cgroup) |
| 137 | false | OOM (child cgroup) — проверить `memory.events` |
| 143 | false | SIGTERM (`docker stop`) |
| 1 | false | Ошибка приложения — читать логи |

```bash
docker rm -f lab8-dead-1 lab8-dead-137 lab8-dead-143 2>/dev/null || true
```

---

## 🏁 Капстоун. «Сервис не отвечает» — 50 мин

**Цель:** пройти **полный** цикл диагностики «сервис не отвечает», применив **все** инструменты урока: `exec` → `ss` → `nc` → `tcpdump` → `cpu.stat` → `memory.events` → `events` → `strace` (если нужно).

**Сделай сам**, без подсказок. Ниже — чек-лист требований и что записать.

```bash
wsl -d docker-desktop
mkdir -p /tmp/lab8/capstone && cd /tmp/lab8/capstone
```

### Сценарий

Поднимаем **`app`** (nginx) и **`load`** (alpine, который дёргает `app` по HTTP). `app` **отвечает на первые запросы**, но через несколько секунд начинает **таймаутить**.

```bash
cat > compose.yaml <<'EOF'
services:
  app:
    image: dockerhub.timeweb.cloud/library/nginx:1.25-alpine
    cpus: 0.05
    mem_limit: 32M
    ports:
      - "8080:80"
    networks:
      - cap-net

  load:
    image: dockerhub.timeweb.cloud/library/alpine:3.20
    command: ["sh", "-c", "while true; do wget -qO- --timeout=1 http://app/ >/dev/null 2>&1; sleep 0.1; done"]
    networks:
      - cap-net
    depends_on:
      - app

networks:
  cap-net:
EOF

docker compose -f compose.yaml up -d
sleep 2

# Первые запросы — работают
for i in 1 2 3; do curl -s -o /dev/null -w "%{http_code} " --max-time 3 http://localhost:8080/; done; echo
# 200 200 200   ← сначала ок

sleep 8

# Теперь — таймауты
for i in 1 2 3; do curl -s -o /dev/null -w "%{http_code} " --max-time 3 http://localhost:8080/; done; echo
# 000 000 000   ← curl exit 28 (timeout), 000 — код
```

### Задание: дойти до **корневой причины** по дереву решений

**Шаг 1. Процесс слушает порт?**

```bash
docker compose -f compose.yaml exec app sh -c 'ss -tlnp | grep :80'
# LISTEN 0 511 0.0.0.0:80 ... nginx
```

Если процесс слушает `0.0.0.0:80` — порт открыт. Если **нет** — приложение упало/слушает не там.

**Шаг 2. Пакеты доходят до target?**

```bash
docker run --rm --net container:$(docker compose -f compose.yaml ps -q app) \
  dockerhub.timeweb.cloud/library/nicolaka/netshoot \
  sh -c 'tcpdump -i eth0 -nn -c 6 "tcp port 80" 2>/dev/null' &

# Дёргаем с хоста
curl -s -o /dev/null --max-time 3 http://localhost:8080/ ; sleep 1

wait
```

**Ожидаемо:** видно `SYN → SYN-ACK → ACK → GET / → 200` — пакеты доходят, target отвечает. Значит проблема **не** в сети, а **в обработке запроса**.

**Шаг 3. cgroup: cpu и memory**

```bash
docker compose -f compose.yaml exec app sh -c '
  echo "--- cpu.stat ---"; cat /sys/fs/cgroup/cpu.stat
  echo "--- memory.current/max ---"
  echo "current: $(cat /sys/fs/cgroup/memory.current)"
  echo "max:     $(cat /sys/fs/cgroup/memory.max)"
  echo "--- memory.events ---"
  grep -E "^(oom|oom_kill)" /sys/fs/cgroup/memory.events
'
```

**Ожидаемо:**

```
--- cpu.stat ---
usage_usec ...
nr_periods ~800
nr_throttled ~780       ← ПОЧТИ ВСЕ ПЕРИОДЫ THROTTLED
throttled_usec ~78000000
--- memory.current/max ---
current: ~25000000
max:     33554432
--- memory.events ---
oom 0
oom_kill 0
```

**Диагноз:** `nr_throttled / nr_periods ≈ 0.97` — **CPU throttling** из-за `cpus: 0.05` (5% одного ядра). nginx **не успевает** обрабатывать запросы, потому что его постоянно **принудительно останавливают** на 100ms.

**Шаг 4. Если нужен strace — подтвердить, что процесс «висит» на accept**

```bash
docker compose -f compose.yaml exec app sh -c '
  # в nginx-alpine нет strace, поэтому — из debug-контейнера
  apk add --no-cache strace 2>/dev/null || true
  strace -p 1 -e trace=accept4,read,write -f 2>&1 | head -5
' 2>&1 | head -10
```

**Ожидаемо:** либо `apk add` не пройдёт (read-only/нет сети), либо `strace` покажет, что процесс **висит на `accept4`** — ждёт, пока CPU-планировщик даст квант. Это подтверждает **throttling**, а не deadlock.

**Шаг 5. `docker events` — что было?**

```bash
docker events --since 5m --filter 'container=capstone-app-1' \
  --format '{{.Time}} {{.Action}} {{.Actor.Attributes.name}}'
```

**Ожидаемо:** `start`, `health_status` (если был), ничего про `die`/`oom` — контейнер **жив**, просто **медленный**.

### Фикс

```bash
# Убираем cpu-лимит
sed -i 's/    cpus: 0.05//' compose.yaml
docker compose -f compose.yaml up -d --force-recreate

sleep 3
for i in 1 2 3; do curl -s -o /dev/null -w "%{http_code} " --max-time 3 http://localhost:8080/; done; echo
# 200 200 200   ← работает
```

### Второй сценарий (для проверки себя): «app недоступен снаружи»

Поменяй `ports: "127.0.0.1:8080:80"` и убедись, что `curl localhost:8080` **с хоста** работает, а **из другого контейнера** — нет (или наоборот, в зависимости от setup). Пройди шаги 1–5 заново и **объясни**, где именно рвётся.

### Что записать в журнал

1. **Симптом:** `curl` → `000`/timeout через N секунд после старта.
2. **Шаг 1 (`ss`):** процесс слушает `0.0.0.0:80` → ок.
3. **Шаг 2 (`tcpdump`):** `SYN → SYN-ACK → GET` — пакеты доходят, сеть **не виновата**.
4. **Шаг 3 (`cpu.stat`):** `nr_throttled / nr_periods ≈ 0.97` → **CPU throttling**.
5. **Шаг 4 (`strace`):** процесс на `accept4` — ждёт квант, не deadlock.
6. **Шаг 5 (`events`):** контейнер жив, `die`/`oom` нет.
7. **Фикс:** `cpus: 0.05 → (удалён)`. `curl` → `200`.
8. **Чем НЕ помог:** `docker logs app` — логи nginx **чистые**, ошибок нет. Именно поэтому **начинать с логов** — плохо.

### Дополнительные мини-сценарии для самопроверки

- **Сценарий B:** `app` слушает `127.0.0.1:80` внутри контейнера → `ss` покажет `127.0.0.1:80`, `nc` из `load` → `connection refused`. **Фикс:** `sed 's/127.0.0.1/0.0.0.0/' /etc/nginx/...` или `daemon off` в `nginx.conf`.
- **Сценарий C:** `app` с `mem_limit: 32M` и `load` с 20 concurrent → OOM, `events` → `die exitCode=137`, `inspect` → `OOMKilled=true`. **Фикс:** увеличить `mem_limit` или ограничить concurrency.
- **Сценарий D:** `app` и `load` в **разных** сетях → `nc: bad address 'app'`. **Фикс:** общая сеть. `tcpdump` покажет **0 пакетов**.

---

## 📋 Чек-лист покрытия Урока 8

| Тема | Лаба |
|---|---|
| `exec` подчиняется cgroup | 1A |
| `nsenter` **обходит** cgroup | 1B |
| `nsenter` работает **только с хоста** | 1C |
| `docker exec` не работает с distroless | 1D |
| `ptrace` блокируется default seccomp | 2A |
| `--cap-add SYS_PTRACE` (fallback `seccomp=unconfined`) | 2B |
| `strace -f` — дочерние процессы | 2C |
| Deny-профиль без syscall → `EPERM` | 2D |
| Построение allow-профиля по `strace` | 2E |
| `ss -tlnp` в `--net container:` | 3A–B |
| `tcpdump` с `-c` и `-w` | 3C |
| Паттерн `--net container:<TARGET>` | 3D |
| `docker events --filter container=` | 4A |
| `exitCode=137` vs `143` | 4B |
| `event=health_status` | 4C |
| Формат для алертинга | 4D |
| `memory.current` / `memory.max` | 5A |
| `OOMKilled=true` + `exit 137` | 5B |
| `OOMKilled=false` + `memory.events.oom_kill > 0` | 5B |
| `cpu.stat` / `nr_throttled` / `throttled_usec` | 5C |
| `pids.current` / `pids.max` (fork fail) | 5D |
| Постмортем: `ps -a` → `inspect` → `events` → `logs` | 6A–C |
| Чек-лист постмортема | 6D |
| Капстоун «сервис не отвечает»: `ss` → `nc` → `tcpdump` → cgroup → `strace` → `events` | капстоун |