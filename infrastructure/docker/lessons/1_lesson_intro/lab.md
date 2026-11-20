# Lab 1 Journal

```markdown
### 🪟 Ключевые особенности работы с Docker на Windows

1. **Docker Desktop работает через WSL2**. Docker-демон и контейнеры крутятся в VM `docker-desktop`. Это значит, что `dmesg`, `nsenter`, `/sys/fs/cgroup/*` и `/var/lib/docker/*` находятся **внутри этой VM**, а не в Windows.
2. **cgroup v2 — стандарт** в современных WSL2 (2.5.1+). Это упрощает работу с лимитами.
3. **Где выполнять команды**:
   - **`docker ...`** — работает и в PowerShell, и в WSL2 (если включена интеграция). Для сборок с контекстом в `/tmp/...` — **только в WSL2** (`wsl -d docker-desktop`), иначе PowerShell не увидит путь.
   - **`dmesg`, `nsenter`, `cat /sys/fs/cgroup/...`, `ps --forest`, `pstree`** — **только в `wsl -d docker-desktop`**. Ты там **root**, `sudo` нет — не нужен.
   - **Наблюдение за контейнером в реальном времени** (`docker events`, `docker logs -f`) — удобнее в отдельном окне PowerShell.
4. **Ограничение памяти WSL2** задаётся в `C:\Users\<user>\.wslconfig`:


[wsl2]
memory=4GB


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
```

wsl -d docker-desktop
```
**Внутри WSL2 (`wsl -d docker-desktop`):**
```bash
whoami                # root — это нормально
docker version        # docker CLI доступен
stat -fc %T /sys/fs/cgroup    # cgroup2fs → v2
free -h               # сколько памяти у VM
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
ps -o pid,ppid,comm,args | grep -E 'containerd-shim|sleep 1000|CMD'
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

для второго distro - покажет процесс chain из общей VM
для хост машины - аналогично

docker-daemon не видит этот pid, он видит pid с containerd-shim
```

containerd-shim - это тонкий вспомогательный процесс-«прослойка», который отвечает за поддержание связи с уже запущенным контейнером и управление его жизненным циклом
```
docker-desktop distro:
3340 root      0:00 /usr/bin/containerd-shim-runc-v2 -namespace moby -id 27f8cbb2244cb3b613a94f6929345aaaa86a7dc809ebe
```

---

#### Lab 1. Контейнер ≠ VM: PID namespace и cgroups

**Цель:** Увидеть, что контейнер — процесс в namespace, и научиться смотреть cgroups через WSL2.

Вводная:

Пространства имен (namespaces) - механизм изоляции в ядре Linux, каждое пространство имен дает процессам иллюзию, что они находятся в системе одни. Именно на них строится вся контейнеризация. 
Основные типы: mount (точки монтирования, файловая система, процесс видит свою корневую ОС), uts (hostname и domainname), ipc (очереди сообщений, семафоры, разделяемая память), network, pid, user (uid/gid и capabilities), cgroup (Виртуализованное представление /proc/self/cgroup), time (Смещения для CLOCK_MONOTONIC и CLOCK_BOOTTIME)

cgroup - механизм объединения процессов в иерархические группы и задания им лимитов, чтобы один процесс не забрал все мощности сервера. Управляется через виртуальную файловую систему (обычно /sys/fs/cgroup, чаще в версии cgroup v2)

nsenter - утилита из пакета util-linux, которая позволяет войти в существующее пространство имен другого процесса и выполнить там команду. Использует системный вызов setns

**Шаги:**
```powershell
docker run -d --name ns-lab --memory=128m --cpus=0.5 alpine sleep 100000
```

```bash
wsl -d docker-desktop

HOST_PID=$(docker inspect --format '{{.State.Pid}}' ns-lab)
echo "Host PID: $HOST_PID"

# nsenter: заходим в namespace контейнера
nsenter -t 1262 -m -u -i -n -p

b894bc426965:/# ps aux
PID   USER     TIME  COMMAND
    1 root      0:00 sleep 100000
    7 root      0:00 /bin/sh
   22 root      0:00 -sh
   23 root      0:00 ps aux
```

Когда вы выполнили docker run -d --name chain alpine sleep 1000:

- Docker CLI отправил запрос демону
- dockerd сгенерировал config.json для контейнера
- containerd запустил containerd-shim-runc-v2
- shim вызвал runc run 27f8cbb...
- runc внутри себя:
    - Вызвал clone() с флагами namespaces (как unshare)
    - Вызвал pivot_root() (как chroot, но безопаснее)
    - Настроил cgroups
    - Применил seccomp и capabilities
    - Вызвал execve("/bin/sleep", ["sleep", "1000"])
- runc завершился, а sleep остался жить в изоляции
- shim остался "нянчить" sleep

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
# у контейнера и хоста разные точки монтирования и корневая файловая система



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

# Dockerfile.shell - shell запускается как PID = 1
cat > Dockerfile.shell <<'EOF'
FROM dockerhub.timeweb.cloud/library/python:3.12-slim
WORKDIR /app
COPY app.py .
CMD python app.py
EOF

# Dockerfile.exec — exec form, без обработчика
cat > Dockerfile.exec <<'EOF'
FROM dockerhub.timeweb.cloud/library/python:3.12-slim
WORKDIR /app
COPY app.py .
CMD ["python", "app.py"]
EOF

# Dockerfile.graceful — exec form + обработчик
cat > Dockerfile.graceful <<'EOF'
FROM dockerhub.timeweb.cloud/library/python:3.12-slim
WORKDIR /app
COPY app_graceful.py app.py
CMD ["python", "app.py"]
EOF

# Dockerfile.tini — exec form + tini
cat > Dockerfile.tini <<'EOF'
FROM dockerhub.timeweb.cloud/library/python:3.12-slim
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
  docker run -d --name pid1-$tag pid1:$tag >/dev/null
  sleep 1
  echo "--- PID 1 (через /proc) ---"
  docker exec pid1-$tag sh -c 'tr "\0" " " < /proc/1/cmdline; echo'
  echo "--- process tree ---"
  docker top pid1-$tag

  S=$(date +%s%3N)
  docker stop pid1-$tag >/dev/null
  E=$(date +%s%3N)
  echo "stop took: $((E - S)) ms"

  docker inspect pid1-$tag --format 'exit={{.State.ExitCode}}'
  docker rm pid1-$tag >/dev/null
done
```

Итог:

```
=== shell ===
--- PID 1 (через /proc) ---
--- process tree ---
UID                 PID                 PPID                C                   STIME               TTY                 TIME                CMD
root                1756                1732                4                   12:09               ?                   00:00:00            /bin/sh -c python app.py
root                1770                1756                2                   12:09               ?                   00:00:00            python app.py
stop took: 3346 ms
exit=137

Вывод: SIGTERM пришёл в sh. sh как PID 1 проигнорировал его (нет хендлера + защита PID 1), python в дочернем процессе ничего не получил. По таймауту — SIGKILL всей cgroup

=== exec ===
--- PID 1 (через /proc) ---
python app.py
--- process tree ---
UID                 PID                 PPID                C                   STIME               TTY                 TIME                CMD
root                1863                1839                7                   12:09               ?                   00:00:00            python app.py
stop took: 3352 ms
exit=137

Вывод: SIGTERM пришёл в python. Python без хендлера + PID 1 → сигнал отброшен ядром. Таймаут → SIGKILL

=== graceful ===
--- PID 1 (через /proc) ---
python app.py
--- process tree ---
UID                 PID                 PPID                C                   STIME               TTY                 TIME                CMD
root                2006                1982                12                  12:09               ?                   00:00:00            python app.py
stop took: 338 ms
exit=0

Вывод: Хендлер поймал SIGTERM → sys.exit(0) → чистое завершение

=== tini ===
--- PID 1 (через /proc) ---
tini -- python app.py
--- process tree ---
UID                 PID                 PPID                C                   STIME               TTY                 TIME                CMD
root                2105                2081                4                   12:09               ?                   00:00:00            tini -- python app.py
root                2119                2105                2                   12:09               ?                   00:00:00            python app.py
stop took: 327 ms
exit=143

Вывод: tini поймал SIGTERM, форварднул python (уже не PID 1 → сигнал доставлен, default action = terminate). Python умер по SIGTERM, tini вернул 128+15=143
```

**Что ожидать:**
- `shell`: PID 1 — `/bin/sh -c "python app.py"` (dash в slim, exec-оптимизация **не** сработает). `stop` ~10 сек (у меня переопределена в 3), `exit=137`.
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

for i in range(10):
    pid = os.fork()
    if pid == 0:
        sys.exit(0)  # ребёнок сразу умирает

print(f"parent pid={os.getpid()}, forked 10 and reaped each", flush=True)
while True:
    time.sleep(60)
EOF

# Без tini — PID 1 сам Python, никто не жнёт зомби
cat > Dockerfile.noinit <<'EOF'
FROM dockerhub.timeweb.cloud/library/python:3.12-slim
COPY spawner.py /spawner.py
CMD ["python", "/spawner.py"]
EOF

# С tini — он PID 1, жнёт зомби
cat > Dockerfile.tini <<'EOF'
FROM dockerhub.timeweb.cloud/library/python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends tini \
    && rm -rf /var/lib/apt/lists/*
COPY spawner.py /spawner.py
ENTRYPOINT ["tini", "--", "python", "/spawner.py"]
CMD []
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

docker exec z-noinit sh -c '
  echo "=== zombies ==="
  for p in /proc/[0-9]*; do
    st=$(awk "{print \$3}" "$p/stat" 2>/dev/null)
    [ "$st" = "Z" ] && echo "$p state=$st"
  done
  echo "=== total zombie count ==="
  for p in /proc/[0-9]*; do
    awk "{print \$3}" "$p/stat" 2>/dev/null
  done | grep -c Z
'
```

Ответ:
```
=== zombies ===
/proc/10 state=Z
/proc/11 state=Z
/proc/12 state=Z
/proc/13 state=Z
/proc/14 state=Z
/proc/15 state=Z
/proc/16 state=Z
/proc/7 state=Z
/proc/8 state=Z
/proc/9 state=Z
=== total zombie count ===
10
```

# С tini

```
docker run -d --name z-tini zombie:tini

docker exec z-tini sh -c '
  for p in /proc/[0-9]*; do
    st=$(awk "{print \$3}" "$p/stat" 2>/dev/null)
    [ "$st" = "Z" ] && echo "$p state=$st"
  done
  echo "--- count ---"
  for p in /proc/[0-9]*; do
    awk "{print \$3}" "$p/stat" 2>/dev/null
  done | grep -c Z
'
```

Ответ:
```
=== zombies ===
/proc/10 state=Z
/proc/11 state=Z
/proc/12 state=Z
/proc/13 state=Z
/proc/14 state=Z
/proc/15 state=Z
/proc/16 state=Z
/proc/7 state=Z
/proc/8 state=Z
/proc/9 state=Z
=== total zombie count ===
10
```

**Выводы:**
- sh специально игнорирует зомби процессы и не освобождает PID, это сделано специально для диагностики, чтобы можно было выполнив ps увидеть зомби
- tini работает лишь с осиротевшими процессами, пока жив родитель tini не доберется до него
- если родитель не ожидает своего ребенка, то он станет зомби
- **правило проверки в проде**: `docker exec <c> ps -ef | grep defunct` — если видишь зомби, у приложения утечка PID'ов;
- когда это критично: интенсивный форк короткоживущих процессов (ffmpeg, imagemagick, шелл-вызовы, `subprocess.Popen` без `.wait()`);
- решение: `--init` в `docker run`/compose или `ENTRYPOINT ["tini", "--", ...]`.

---

#### Lab 3. Галерея exit codes — 25 мин

```powershell
docker run --rm alpine nosuchcommand;        echo "exit=$LASTEXITCODE"   # 127 - команда nosuchcommand не найдена
docker run --rm -v /tmp:/tmp alpine sh -c 'echo hi > /tmp/x && chmod -x /tmp/x && /tmp/x'; echo "exit=$LASTEXITCODE"  # 126 - команда не executable
docker run --rm --memory=abc alpine true;    echo "exit=$LASTEXITCODE"   # 125 ошибка самого docker (не смог запустить, тк --memory=abc - невалидная команда)
docker run --rm alpine sh -c 'kill -TERM $$';echo "exit=$LASTEXITCODE"   # 0, тк PID=1 получает sh и отбрасывает сигнал о kill
docker run --rm --init alpine sh -c 'kill -TERM $$';echo "exit=$LASTEXITCODE"   # 143, SIGTERM, корректный stop
docker run --rm alpine sh -c 'kill -KILL $$';echo "exit=$LASTEXITCODE"   # 0, тк PID=1 получает sh и отбрасывает сигнал о kill
docker run --rm alpine sh -c 'kill -KILL $$';echo "exit=$LASTEXITCODE"   # 137, SIGKILL, kill с хоста
docker run --rm --init alpine sh -c 'kill -SEGV $$';echo "exit=$LASTEXITCODE"   # 139, SIGSEGV
```

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
FROM dockerhub.timeweb.cloud/library/python:3.12-slim
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

Ответ:
```
2026-11-18T22:25:54.277843238+03:00 container oom 82c4d21e5b7a2202246b817304eed1a6e6b845bb104b8be46104d366aae823f2 (desktop.docker.io/ports.scheme=v2, desktop.docker.io/wsl-distro=Ubuntu-22.04, image=oom-lab, name=oom-cgroup)
```

Подожди 10–30 секунд. Контейнер упадёт.

**Проверка (можно в WSL или PowerShell):**
```powershell
docker inspect oom-cgroup --format 'exit={{.State.ExitCode}} oom={{.State.OOMKilled}}'
# exit=137 oom=true
docker events --since 5m --filter container=oom-cgroup
# create -> start -> oom -> die (exitCode=137) -> destroy
# container die ... exitCode=137
```

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

# [Wed Nov 18 22:38:39 2026] Out of memory: Killed process 24985 (python) total-vm:3978616kB, anon-rss:3200512kB, file-rss:152kB, shmem-rss:0kB, UID:0 pgtables:7820kB oom_score_adj:0
```

**Что увидеть:**
- `OOMKilled=false` — но `dmesg` кричит про OOM.
- Возможно, убьётся не только контейнер, но и другие процессы VM — это и есть «бомба без лимита».

**Выводы:**
- главный вывод: **`OOMKilled=false` + `exit=137` ≠ «не OOM»**;
- на голом Linux `dmesg` — на хосте; на Docker Desktop — внутри `wsl -d docker-desktop`;
- вывод: `--memory` обязателен для всех прод-контейнеров, иначе «взорвётся» сосед/хост.

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

Не OOM, kill:
2026-11-18T22:44:20.029808582+03:00 container kill cb91f05aff5d7fb9186b6d14e2ad525e098bb87bd340ca3329bec7ccc3b61f64 (desktop.docker.io/ports.scheme=v2, desktop.docker.io/wsl-distro=Ubuntu-22.04, image=alpine, name=d137-kill, signal=9)
2026-11-18T22:44:20.191250096+03:00 container die cb91f05aff5d7fb9186b6d14e2ad525e098bb87bd340ca3329bec7ccc3b61f64 (desktop.docker.io/ports.scheme=v2, desktop.docker.io/wsl-distro=Ubuntu-22.04, execDuration=3, exitCode=137, image=alpine, name=d137-kill)


# B. stop с игнором SIGTERM
docker run -d --name d137-stop alpine sh -c 'trap "" TERM; sleep 100'
Start-Sleep -Seconds 1
Measure-Command { docker stop d137-stop }
docker inspect d137-stop --format 'exit={{.State.ExitCode}} oom={{.State.OOMKilled}}'
docker events --since 5m --filter container=d137-stop

2026-11-18T22:45:50.963465125+03:00 container start dd92b24f35c640e2e5e0016a1d3bc97a196ade7db61d3e53e3866dc6347e31a3 (desktop.docker.io/ports.scheme=v2, image=alpine, name=d137-stop)
2026-11-18T22:45:51.108233318+03:00 container die dd92b24f35c640e2e5e0016a1d3bc97a196ade7db61d3e53e3866dc6347e31a3 (desktop.docker.io/ports.scheme=v2, execDuration=0, exitCode=2, image=alpine, name=d137-stop)


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

# 3. Cleanup
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
- при этом даже при attach мы не теряем логи, они в logs все равно идут

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