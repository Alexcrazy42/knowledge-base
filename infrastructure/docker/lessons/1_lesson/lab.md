**Что исправлено:**
- Пути вида `/tmp/pid1/...` в `docker build` из PowerShell **не работают** — PowerShell не видит WSL-пути. Все сборки перенесены в `wsl -d docker-desktop`, где и `docker` CLI есть, и `/tmp` — это Linux-путь.
- В `wsl -d docker-desktop` ты уже **root**, `sudo` там нет — убрал `sudo` из команд внутри WSL2.
- `docker build - < Dockerfile` работает в bash WSL, но **не** в PowerShell. Оставил только bash-вариант внутри WSL.
- В Lab 5 (host-OOM) без ограничения памяти WSL2 может съесть все 8–16 ГБ и подвесить Docker Desktop. Добавил обязательный шаг — временно уменьшить память WSL2 через `.wslconfig`.
- В Lab 2 установка `tini` через `sed` была хрупкой — переписал Dockerfile явно.
- Добавил в Lab 6 `docker pause/unpause` и `docker stop --time 3` (то, чего не хватало).
- Добавил в Lab 7 проверку **шаринга слоёв** между образами.

---

```markdown
### 🪟 Ключевые особенности работы с Docker на Windows

1. **Docker Desktop работает через WSL2**. Docker-демон и контейнеры крутятся в VM `docker-desktop`. Это значит, что `dmesg`, `nsenter`, `/sys/fs/cgroup/*` и `/var/lib/docker/*` находятся **внутри этой VM**, а не в Windows.
2. **cgroup v2 — стандарт** в современных WSL2 (2.5.1+). Это упрощает работу с лимитами.
3. **Где выполнять команды**:
   - **`docker ...`** — работает и в PowerShell, и в WSL2 (если включена интеграция). Для сборок с контекстом в `/tmp/...` — **только в WSL2** (`wsl -d docker-desktop`), иначе PowerShell не увидит путь.
   - **`dmesg`, `nsenter`, `cat /sys/fs/cgroup/...`, `ps --forest`, `pstree`** — **только в `wsl -d docker-desktop`**. Ты там **root**, `sudo` нет — не нужен.
   - **Наблюдение за контейнером в реальном времени** (`docker events`, `docker logs -f`) — удобнее в отдельном окне PowerShell.
4. **Ограничение памяти WSL2** задаётся в `C:\Users\<user>\.wslconfig`:
   ```ini
   [wsl2]
   memory=4GB
   ```
   После изменения — `wsl --shutdown` и заново запустить Docker Desktop. Нужно для Lab 5 (host-OOM).

---

### 🧪 Полный практический план (Windows + WSL2)

Итого: **~7 часов**. Если идёшь за один день — делай перерывы, лабы 2b и 4 требуют внимания.

---

#### Lab 0. Настройка окружения — 15 мин

**Цель:** Проверить WSL2, cgroup version, и понять, куда «заходить» для глубокого дебага.

**Шаги (PowerShell):**
```powershell
wsl --version
# WSL >= 2.5.1 и kernel >= 6.6 — гарантия cgroup v2

docker version
docker info --format 'Cgroup Driver={{.CgroupDriver}} Cgroup Version={{.CgroupVersion}}'
# Ожидаем Cgroup Version: 2

wsl -d docker-desktop
```

**Внутри WSL2 (`wsl -d docker-desktop`):**
```bash
whoami                # root — это нормально
docker version        # docker CLI доступен
stat -fc %T /sys/fs/cgroup    # cgroup2fs → v2
free -h               # сколько памяти у VM
```

**Записать в `docker-senior.md` → `## Lab journal`:**
- версию WSL, kernel, cgroup version;
- сколько RAM у WSL2 VM (`free -h`);
- что `sudo` внутри `docker-desktop` нет (ты root);
- куда я буду заходить за `dmesg`/`nsenter` — в `wsl -d docker-desktop`.

```bash
exit
```

---

#### Lab 0b. Что под капотом `docker run` + SIGKILL-защита PID 1 — 15 мин 🆕

**Цель:** Увидеть цепочку `dockerd → containerd → shim → процесс` и убедиться, что `kill -9 1` **изнутри** контейнера не работает.

**Часть A — цепочка процессов:**

```powershell
docker run -d --name chain alpine sleep 1000
```

```bash
wsl -d docker-desktop
ps -ef --forest | grep -E 'containerd-shim|sleep 1000' | grep -v grep
```

Что увидеть:
- `containerd-shim-runc-v2` — процесс-«нянька», родитель `sleep`.
- `sleep 1000` — уже как самостоятельный процесс-ребёнок shim'а.
- `runc` в списке **нет** — он короткоживущий, отработал и завершился (вызвал `clone`+`execve`, передал управление).

Проверить PID:
```bash
SPID=$(docker inspect --format '{{.State.Pid}}' chain)
echo "docker-inspect PID: $SPID"
ps -p $SPID -o pid,ppid,cmd
# PPID указывает на shim
```

**Часть B — SIGKILL-защита PID 1:**

```bash
docker run --rm --name kill1 alpine sh -c 'kill -9 1; echo "kill -9 1 returned: $?"; ps -p 1; sleep 30'
```

Что увидеть:
- `kill -9 1 returned: 0` — команда «успешна».
- но `ps -p 1` **всё ещё показывает** живой процесс, и контейнер продолжает работать.
- Через `docker kill kill1` (снаружи, из другого терминала или WSL) — контейнер **умирает** с кодом 137.

**Смысл:** ядро не доставляет `SIGKILL`/`SIGSTOP` процессу PID 1, если сигнал пришёл **изнутри его namespace**. Снаружи (через `docker kill` → `runc` → `kill` от процесса хоста) — доставляется.

**Записать:**
- схему цепочки `dockerd → containerd → shim → процесс (runc уже вышел)`;
- вывод `kill -9 1` + `ps -p 1` — «kill вернул 0, процесс жив»;
- почему это важно: любое «убить изнутри» приложение не сможет убить PID 1; это защита.

```powershell
docker rm -f chain
```

---

#### Lab 1. Контейнер ≠ VM: PID namespace и cgroups — 30 мин

**Цель:** Увидеть, что контейнер — процесс в namespace, и научиться смотреть cgroups через WSL2.

**Шаги:**
```powershell
docker run -d --name ns-lab --memory=128m --cpus=0.5 alpine sleep 100000
```

```bash
wsl -d docker-desktop

HOST_PID=$(docker inspect --format '{{.State.Pid}}' ns-lab)
echo "Host PID: $HOST_PID"

# nsenter: заходим в namespace контейнера
nsenter -t $HOST_PID -m -n -p -- ps -ef
# Внутри видно sleep как PID 1

# cgroup v2 лимиты
CID=$(docker inspect --format '{{.Id}}' ns-lab)
cat /sys/fs/cgroup/system.slice/docker-$CID.scope/memory.max
cat /sys/fs/cgroup/system.slice/docker-$CID.scope/cpu.max
```

**Ожидаем:** `memory.max = 134217728`, `cpu.max = 50000 100000`.

**Записать:** `HOST_PID` ≠ `1`, но внутри namespace — `PID 1`. Значения `memory.max`/`cpu.max`.

```bash
exit
```
```powershell
docker rm -f ns-lab
```

---

#### Lab 1b. Остальные 5 namespaces глазами — 20 мин 🆕

**Цель:** Увидеть изоляцию **UTS, MNT, IPC, USER, CGROUP** — по 2–3 минуты на каждый.

**Всё внутри `wsl -d docker-desktop`:**

```bash
# UTS — свой hostname
docker run --rm --hostname lab-host alpine hostname
hostname
# в контейнере: lab-host, на WSL2: своё имя

# MNT — своя таблица монтирования
docker run -d --name mnt-lab alpine sleep 100
docker exec mnt-lab sh -c 'head -5 /proc/mounts'
head -5 /proc/mounts
# увидишь overlay, proc, tmpfs контейнера vs "родные" WSL2 mount'ы

# IPC — свои POSIX-очереди
docker run --rm alpine sh -c 'ipcs -q'
ipcs -q
# в контейнере — пусто, на хосте — может быть тоже пусто (но таблицы РАЗНЫЕ)
docker run --rm --ipc=host alpine sh -c 'ipcs -q'
# с --ipc=host видит таблицы хоста

# USER — uid/gid
docker run --rm -u 1000:1000 alpine id
id -u
# uid=1000 внутри, но маппинг в хостовый UID 1000 (или subuid в rootless)

# CGROUP — своя иерархия
docker run --rm alpine sh -c 'cat /proc/self/cgroup'
cat /proc/self/cgroup
# у контейнера / путь внутри cgroup-скоупа, у хоста — свой
```

**Записать:** мини-таблицу `namespace → что изолирует → что увидел`. Это якорь для блоков «сети» и «безопасность».

```bash
docker rm -f mnt-lab 2>/dev/null
```

---

#### Lab 2. PID 1: shell / exec / tini / graceful — 40 мин

**Цель:** Воспроизвести «10 секунд» и увидеть разницу между формами.

**Всё делаем в `wsl -d docker-desktop`** — иначе пути `/tmp/...` из PowerShell не сработают.

```bash
wsl -d docker-desktop
mkdir -p /tmp/pid1 && cd /tmp/pid1

# app.py — без обработчика
cat > app.py <<'EOF'
import time, os
print(f"started pid={os.getpid()}", flush=True)
while True:
    time.sleep(1)
EOF

# app_graceful.py — с обработчиком
cat > app_graceful.py <<'EOF'
import time, os, signal, sys
def handler(signum, frame):
    print(f"got {signum}, graceful shutdown", flush=True)
    sys.exit(0)
signal.signal(signal.SIGTERM, handler)
print(f"started pid={os.getpid()}", flush=True)
while True:
    time.sleep(1)
EOF

# Dockerfile.shell
cat > Dockerfile.shell <<'EOF'
FROM python:3.12-slim
WORKDIR /app
COPY app.py .
CMD python app.py
EOF

# Dockerfile.exec — exec form, без обработчика
cat > Dockerfile.exec <<'EOF'
FROM python:3.12-slim
WORKDIR /app
COPY app.py .
CMD ["python", "app.py"]
EOF

# Dockerfile.graceful — exec form + обработчик
cat > Dockerfile.graceful <<'EOF'
FROM python:3.12-slim
WORKDIR /app
COPY app_graceful.py app.py
CMD ["python", "app.py"]
EOF

# Dockerfile.tini — exec form + tini
cat > Dockerfile.tini <<'EOF'
FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends tini \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY app.py .
ENTRYPOINT ["tini", "--", "python", "app.py"]
EOF

# Собираем все
for tag in shell exec graceful tini; do
  docker build -f Dockerfile.$tag -t pid1:$tag .
done

# Прогоняем замеры
for tag in shell exec graceful tini; do
  echo "=== $tag ==="
  docker run -d --name pid1-$tag pid1:$tag
  sleep 1
  echo "PID 1:"
  docker exec pid1-$tag ps -ef | head -3
  S=$(date +%s.%N)
  docker stop pid1-$tag
  E=$(date +%s.%N)
  echo "stop took: $(echo "$E - $S" | bc) sec"
  docker inspect pid1-$tag --format 'exit={{.State.ExitCode}}'
  docker rm pid1-$tag >/dev/null
done
```

**Что ожидать:**
- `shell`: PID 1 — `/bin/sh -c "python app.py"` (dash в slim, exec-оптимизация **не** сработает). `stop` ~10 сек, `exit=137`.
- `exec`: PID 1 = `python`, но без обработчика — ядро игнорирует SIGTERM для PID 1 → 10 сек, `exit=137`.
- `graceful`: stop **мгновенно**, `exit=0`. В логах — «got 15».
- `tini`: PID 1 = tini, python — ребёнок. tini форвардит SIGTERM → python **не PID 1** → default action terminate → мгновенно, `exit=143` (не 0!). **Это сюрприз:** tini «спасает» от 10 секунд, но не делает shutdown graceful, если в приложении нет обработчика.

**Записать таблицу:** `вариант → PID 1 → время stop → exit code`, и отдельно — **почему tini даёт 143, а не 0** (потому что обработчика нет, python убивается default-действием).

```bash
rm -rf /tmp/pid1
```

---

#### Lab 2b. Zombie reaping — 25 мин 🆕

**Цель:** Воспроизвести накопление `<defunct>` и увидеть, что `tini` их пожинает.

```bash
wsl -d docker-desktop
mkdir -p /tmp/zombie && cd /tmp/zombie

cat > spawner.py <<'EOF'
import os, time, sys
# Форкаем 10 короткоживущих детей, но НЕ ждём их
for i in range(10):
    pid = os.fork()
    if pid == 0:
        sys.exit(0)   # ребёнок сразу умирает
print(f"parent pid={os.getpid()}, forked 10 without wait", flush=True)
while True:
    time.sleep(60)
EOF

# Без tini — PID 1 сам Python, никто не жнёт зомби
cat > Dockerfile.noinit <<'EOF'
FROM python:3.12-slim
COPY spawner.py /spawner.py
CMD ["python", "/spawner.py"]
EOF

# С tini — он PID 1, жнёт зомби
cat > Dockerfile.tini <<'EOF'
FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends tini \
    && rm -rf /var/lib/apt/lists/*
COPY spawner.py /spawner.py
ENTRYPOINT ["tini", "--", "python", "/spawner.py"]
EOF

docker build -f Dockerfile.noinit -t zombie:noinit .
docker build -f Dockerfile.tini   -t zombie:tini   .
```

**Прогон:**

```bash
# Без init
docker run -d --name z-noinit zombie:noinit
sleep 3
echo "=== no init ==="
docker exec z-noinit ps -ef
# Ожидаем увидеть несколько строк с <defunct> или Z
docker exec z-noinit sh -c 'ps -ef | grep -c "\[.*\] <defunct>" || true'

# С tini
docker run -d --name z-tini zombie:tini
sleep 3
echo "=== with tini ==="
docker exec z-tini ps -ef
# Ожидаем: НЕТ <defunct>, tini их пожинает
```

**Что увидеть:**
- `z-noinit`: в `ps -ef` — строки `[python] <defunct>` (10 штук). Python их не пожинает — он же PID 1, `wait()` сам не вызывает.
- `z-tini`: зомби нет — tini сидит в цикле `wait()` и жнёт всех.

**Записать:**
- 10 зомби без tini, 0 с tini;
- **правило проверки в проде**: `docker exec <c> ps -ef | grep defunct` — если видишь зомби, у приложения утечка PID'ов;
- когда это критично: интенсивный форк короткоживущих процессов (ffmpeg, imagemagick, шелл-вызовы, `subprocess.Popen` без `.wait()`);
- решение: `--init` в `docker run`/compose или `ENTRYPOINT ["tini", "--", ...]`.

```bash
docker rm -f z-noinit z-tini
rm -rf /tmp/zombie
```

---

#### Lab 3. Галерея exit codes — 25 мин

```powershell
docker run --rm alpine nosuchcommand;        echo "exit=$LASTEXITCODE"   # 127
docker run --rm -v /tmp:/tmp alpine sh -c 'echo hi > /tmp/x && chmod -x /tmp/x && /tmp/x'; echo "exit=$LASTEXITCODE"  # 126
docker run --rm --memory=abc alpine true;    echo "exit=$LASTEXITCODE"   # 125
docker run --rm alpine sh -c 'kill -TERM $$';echo "exit=$LASTEXITCODE"   # 143
docker run --rm alpine sh -c 'kill -KILL $$';echo "exit=$LASTEXITCODE"   # 137
docker run --rm alpine sh -c 'kill -SEGV $$';echo "exit=$LASTEXITCODE"   # 139
```

> Если `-v /tmp:/tmp` в PowerShell подставит Windows-путь и сломается — выполни строку 126 внутри `wsl -d docker-desktop`.

**Записать:** таблицу `команда → код → причина`. Особенно **125 (docker сам) vs 127 (команда в контейнере не найдена)**.

---

#### Lab 4. cgroup-OOM — 40 мин

```bash
wsl -d docker-desktop
mkdir -p /tmp/oom && cd /tmp/oom

cat > hog.py <<'EOF'
import time
chunks = []
while True:
    chunks.append(bytearray(10 * 1024 * 1024))
    time.sleep(0.01)
EOF

cat > Dockerfile <<'EOF'
FROM python:3.12-slim
COPY hog.py /hog.py
CMD ["python", "/hog.py"]
EOF

docker build -t oom-lab .
docker run -d --name oom-cgroup --memory=128m oom-lab
```

**Открыть второе окно PowerShell** и подписаться на события:
```powershell
docker events --filter container=oom-cgroup --filter event=oom --filter event=die
```

Подожди 10–30 секунд. Контейнер упадёт.

**Проверка (можно в WSL или PowerShell):**
```powershell
docker inspect oom-cgroup --format 'exit={{.State.ExitCode}} oom={{.State.OOMKilled}}'
# exit=137 oom=true
docker events --since 5m --filter container=oom-cgroup
# container oom ...
# container die ... exitCode=137
```

```bash
wsl -d docker-desktop
CID=$(docker inspect --format '{{.Id}}' oom-cgroup)
cat /sys/fs/cgroup/system.slice/docker-$CID.scope/memory.events
# oom 1
# oom_kill 1
dmesg -T | grep -iE 'oom|killed process' | tail -5
```

**Записать:** три доказательства `cgroup-OOM` — `OOMKilled=true` + `events: oom` + `memory.events: oom_kill=1`. Это **эталон**, с которым дальше сравниваешь всё.

```bash
docker rm -f oom-cgroup
# образ oom-lab оставить для Lab 5 и Lab 6
```

---

#### Lab 5. Host-OOM: почему `OOMKilled=false` — 30 мин

⚠️ **Подготовка (обязательно):** без неё WSL2 съест всю RAM и подвесит Docker Desktop.

1. Создай/отредактируй `C:\Users\<user>\.wslconfig`:
   ```ini
   [wsl2]
   memory=2GB
   ```
2. `wsl --shutdown` (из PowerShell).
3. Перезапусти Docker Desktop.
4. Проверь `wsl -d docker-desktop` → `free -h` — должно быть ~2 GiB.

**Цель:** увидеть, что при отсутствии `--memory` контейнер убивается **хостом (WSL2 VM)**, а не cgroup-контроллером. Docker не помечает `OOMKilled=true`.

```bash
wsl -d docker-desktop
docker run -d --name oom-host --memory=0 oom-lab
# ждём 20-60 секунд

docker inspect oom-host --format 'exit={{.State.ExitCode}} oom={{.State.OOMKilled}}'
# exit=137, oom может быть false

dmesg -T | grep -iE 'oom|killed process' | tail -20
# "Out of memory: Killed process <pid> (python) ..."
```

**Что увидеть:**
- `OOMKilled=false` — но `dmesg` кричит про OOM.
- Возможно, убьётся не только контейнер, но и другие процессы VM — это и есть «бомба без лимита».

**Записать:**
- главный вывод: **`OOMKilled=false` + `exit=137` ≠ «не OOM»**;
- на голом Linux `dmesg` — на хосте; на Docker Desktop — внутри `wsl -d docker-desktop`;
- вывод: `--memory` обязателен для всех прод-контейнеров, иначе «взорвётся» сосед/хост.

**Откатить `.wslconfig`:**
- удали строку `memory=2GB` (или файл целиком), `wsl --shutdown`, перезапусти Docker Desktop.

```bash
docker rm -f oom-host
```

---

#### Lab 6. Дебаг-флоу 137 + `pause`/`unpause` + `stop --time` — 35 мин

**Цель:** отработать три разных сценария до 137 и увидеть, чем `pause` отличается от `stop`.

```powershell
# A. docker kill
docker run -d --name d137-kill alpine sleep 100
docker kill d137-kill
Start-Sleep -Seconds 1
docker inspect d137-kill --format 'exit={{.State.ExitCode}} oom={{.State.OOMKilled}}'
docker events --since 5m --filter container=d137-kill
# kill signal=9 → die 137, oom=false

# B. stop с игнором SIGTERM
docker run -d --name d137-stop alpine sh -c 'trap "" TERM; sleep 100'
Start-Sleep -Seconds 1
Measure-Command { docker stop d137-stop }
docker inspect d137-stop --format 'exit={{.State.ExitCode}} oom={{.State.OOMKilled}}'
docker events --since 5m --filter container=d137-stop
# kill signal=15 → ~10s → kill signal=9 → die 137

# B2. stop --time 3 — таймаут сокращён до 3 сек
docker run -d --name d137-stop3 alpine sh -c 'trap "" TERM; sleep 100'
Start-Sleep -Seconds 1
Measure-Command { docker stop --time 3 d137-stop3 }
# ~3 сек, а не 10

# C. OOM
docker run -d --name d137-oom --memory=64m oom-lab
Start-Sleep -Seconds 5
docker inspect d137-oom --format 'exit={{.State.ExitCode}} oom={{.State.OOMKilled}}'
docker events --since 5m --filter container=d137-oom
# oom → die 137, oom=true

# D. pause / unpause — это SIGSTOP, не stop
docker run -d --name paused alpine sh -c 'while true; do date >> /tmp/t; sleep 1; done'
Start-Sleep -Seconds 2
docker pause paused
docker ps --filter name=paused --format '{{.Status}}'   # Up X (Paused)
Start-Sleep -Seconds 5
docker exec paused sh -c 'tail -1 /tmp/t'                # файл НЕ растёт
docker unpause paused
Start-Sleep -Seconds 2
docker exec paused sh -c 'wc -l /tmp/t'                  # растёт снова
# процесс был в SIGSTOP, RAM держалась, ничего не потеряно
```

**Записать сводную таблицу:**

| Сценарий | `OOMKilled` | `events` перед `die` | Время | RAM |
|---|---|---|---|---|
| `docker kill` | false | `kill signal=9` | мгновенно | освобождается |
| `docker stop` | false | `signal=15` → 10с → `signal=9` | ~10с | освобождается |
| `docker stop --time 3` | false | `signal=15` → 3с → `signal=9` | ~3с | освобождается |
| cgroup-OOM | true | `oom` | мгновенно | освобождается |
| `docker pause` | — | — | — | **держится**, процесс в SIGSTOP |

Прогнать дважды, второй раз — не подглядывая.

```powershell
docker rm -f d137-kill d137-stop d137-stop3 d137-oom paused
```

---

#### Lab 7. Слои, CoW, whiteout, шаринг — 35 мин

```bash
wsl -d docker-desktop
mkdir -p /tmp/layers && cd /tmp/layers

# Один образ с удалением файла
cat > Dockerfile.rm <<'EOF'
FROM alpine
RUN echo hello > /a.txt
RUN echo world > /b.txt
RUN rm /a.txt
CMD ["sh"]
EOF

# Multi-stage с большим артефактом
cat > Dockerfile.ms <<'EOF'
FROM alpine AS builder
RUN echo hello > /a.txt
RUN dd if=/dev/urandom of=/big bs=1M count=50

FROM alpine
COPY --from=builder /a.txt /a.txt
CMD ["sh"]
EOF

# Два образа, делящих базовый alpine
cat > Dockerfile.shared1 <<'EOF'
FROM alpine
RUN dd if=/dev/urandom of=/shared bs=1M count=10
CMD ["sh"]
EOF
cat > Dockerfile.shared2 <<'EOF'
FROM alpine
RUN dd if=/dev/urandom of=/shared2 bs=1M count=10
CMD ["sh"]
EOF

docker build -f Dockerfile.rm -t layers:rm .
docker build -f Dockerfile.ms -t layers:ms .
docker build -f Dockerfile.shared1 -t layers:shared1 .
docker build -f Dockerfile.shared2 -t layers:shared2 .

# 1. history и размер rm-образа
docker history layers:rm --no-trunc
docker image inspect layers:rm --format '{{.Size}}'
# Размер НЕ уменьшился после rm /a.txt — слой с файлом остался (whiteout)

# 2. multi-stage уменьшает
docker image inspect layers:ms --format '{{.Size}}'
# ~5 MB, а не 55 MB

# 3. шаринг слоёв
docker system df -v
# У layers:shared1 и layers:shared2 SHARED SIZE около 8 MB (базовый alpine)
```

**Что записать:**
- `RUN rm` **не** уменьшает образ — файл остался в нижнем слое, whiteout лишь скрывает;
- `COPY --from` **уменьшает** — в финальный образ попадает только то, что скопировали;
- шаринг: два образа с одинаковым `FROM alpine` **не** дублируют базовый слой на диске (`docker system df -v` → колонка `SHARED SIZE`).

```bash
rm -rf /tmp/layers
```

---

#### Lab 7b. Volume vs writable layer — 20 мин 🆕

**Цель:** Увидеть, что writable layer умирает с контейнером, а volume — живёт.

```bash
# 1. Writable layer — данные исчезают вместе с контейнером
docker run --name wl alpine sh -c 'echo "hello" > /data.txt'
docker rm wl
docker run --rm alpine cat /data.txt
# cat: can't open '/data.txt': No such file or directory

# 2. Volume — данные живут после удаления контейнера
docker run --name vol -v mydata:/data alpine sh -c 'echo "hello" > /data/data.txt'
docker rm vol
docker run --rm -v mydata:/data alpine cat /data/data.txt
# hello

# 3. Где физически лежит volume (в WSL2)
wsl -d docker-desktop
ls -la /var/lib/docker/volumes/mydata/_data/
cat /var/lib/docker/volumes/mydata/_data/data.txt

# 4. Cleanup
docker volume rm mydata
```

**Записать:**
- writable layer = эфемерный (`rm` контейнера → данные потеряны);
- volume = персистентный (живёт независимо от контейнера, лежит в `/var/lib/docker/volumes/<name>/_data/`);
- **мост к блоку D**: любая БД в контейнере — только с volume; без него всё умрёт при `docker rm`.

```bash
docker volume rm mydata 2>/dev/null
```

---

#### Lab 8. `attach` vs `logs -f` — 30 мин

**Цель:** воспроизвести «кражу логов» и «убийство сервиса через Ctrl+C».

```powershell
# 1. Запуск сервиса
docker run -d --name log-lab alpine sh -c 'while true; do echo "tick $(date +%s)"; sleep 1; done'

# 2. В первом окне — собираем логи
docker logs -f log-lab

# 3. Во втором окне — attach
docker attach log-lab
# Нажми Ctrl+C в окне attach
```

**Что увидеть:**
- `docker ps -a --filter name=log-lab` → `Exited (130)` — это SIGINT, отправленный в PID 1 через `attach` (130 = 128 + 2).
- В первом окне `docker logs -f` поток **оборвался** — часть логов потеряна, потому что pipe отдаёт байт **одному** читателю.

**Второй прогон — то же, но с `--sig-proxy=false`:**
```powershell
docker run -d --name log-lab2 alpine sh -c 'while true; do echo "tick $(date +%s)"; sleep 1; done'
docker attach --sig-proxy=false log-lab2
# Ctrl+C теперь НЕ убивает сервис, ты просто отцепляешься от ввода/вывода
```

**Записать:**
- механизм: `attach` — pipe (byte-once), `logs -f` — лог-файл (можно читать параллельно);
- `Ctrl+C` по умолчанию = SIGINT в PID 1 (убивает сервис); `--sig-proxy=false` — не убивает;
- в проде: для логов **только** `docker logs -f --tail=100`, никогда `attach`.

```powershell
docker rm -f log-lab log-lab2
```

---

#### 🏁 Капстоун: «Сломанный» сервис — 45 мин

Сделай сам, без подсматривания:

1. **Сломай** сервис:
   - `app.py` выделяет 200 МБ и держит их; **не обрабатывает** `SIGTERM`; форкает 5 короткоживущих детей **без** `wait()` (чтобы появились зомби).
   - `Dockerfile` — **shell form** `CMD python app.py`, **без** `--init`, **без** `USER`.
   - Запусти без `--memory`.

2. **Продебажь**, используя **все** инструменты:
   - `docker inspect` → exit code, OOMKilled
   - `docker events` → что было перед die
   - `dmesg` в WSL2 → OOM или нет
   - `docker exec ... ps -ef` → зомби
   - `docker history` → размер и форма CMD
   - `docker stop` замер → сколько секунд, и почему

3. **Почини**:
   - `CMD ["python", "app.py"]` + `ENTRYPOINT ["tini", "--", ...]`;
   - обработчик `SIGTERM` в Python;
   - `USER 1000:1000`;
   - `--memory=256m` (в `docker run` или compose);
   - multi-stage (build → runtime);
   - `.dockerignore`.

4. **Проверь**, что:
   - `docker stop` — **мгновенно** (< 1 сек), `exit=0`;
   - зомби нет (`ps -ef | grep defunct` — пусто);
   - образ **меньше** исходного (сравни `docker image inspect --format '{{.Size}}'`);
   - OOM нет при лимите 256m и потреблении 200m.

**Записать в `docker-senior.md`:** весь путь диагностики — «что видел → что подумал → что проверил → что починил». Это твой эталонный алго для реального инцидента.

---

### 💎 Итог по Windows

- **`wsl -d docker-desktop`** — твой вход в Linux-мир контейнеров: `dmesg`, `nsenter`, `ps --forest`, `/sys/fs/cgroup/*`, `/var/lib/docker/*`. Ты там root, `sudo` нет.
- **PowerShell** — для наблюдения (`docker events`, `docker logs -f`) и запуска `docker`-команд в отдельных окнах.
- **Все сборки с файлами в `/tmp/...`** — только из WSL, иначе PowerShell не увидит путь.
- **`.wslconfig`** — единственный способ ограничить память VM для Lab 5, и напоминание: **без `--memory` контейнеры съедают VM, как в «голом» Linux хосте**.

---

### 📋 Чек-лист покрытия Урока 1

| Тема | Лаба |
|---|---|
| Контейнер ≠ VM | 1, 1b |
| Namespace PID | 1 |
| Namespace UTS / MNT / IPC / USER / CGROUP | 1b |
| cgroups: memory.max / cpu.max | 1 |
| cgroup-OOM (`OOMKilled=true`) | 4 |
| Host-OOM (`OOMKilled=false`, но dmesg кричит) | 5 |
| overlay2: слои, CoW, whiteout | 7 |
| Шаринг слоёв между образами | 7 |
| Image vs container vs **volume** | 7, 7b |
| Lifecycle: `create` / `start` / `stop` / `pause` / `kill` | 6, 6D |
| PID 1: shell vs exec vs tini | 2 |
| Обработчик SIGTERM в приложении | 2 |
| SIGKILL-защита PID 1 изнутри | 0b |
| Zombie reaping | 2b |
| `docker run` под капотом (shim/runc) | 0b |
| `docker stop --time` | 6 (B2) |
| Exit codes 125/126/127/137/143/139 | 3 |
| 137: OOM vs kill vs stop-timeout | 6 |
| `attach` vs `logs -f` (+ `--sig-proxy=false`) | 8 |
| Судьба данных: writable layer vs volume | 7b |

После прохождения — **следующий блок: сборка образов** (Dockerfile, кэш, multi-stage, `.dockerignore`, ARG/ENV, distroless). Там будет своя лаба: собрать Python-сервис с 1.2 ГБ → <200 МБ, замерить время сборки и размер до/после, и **кэш в действии** (`docker build` второй раз должен быть за секунды).
```

---

**Что осталось непокрытым сознательно:** `auditd`, `strace`, `sidecar-дебаг` — это блок 9 (отладка в проде), туда и пойдём после блока сборки. Для Урока 1 чек-лист закрыт полностью.

После прохождения пришли `## Lab journal` — разберу, где что не сошлось. Особенно жду Lab 2b (зомби), Lab 5 (host-OOM) и Lab 7b (volume) — они самые «шрамообразующие».