# Docker — Lab 5 Journal. Безопасность: capabilities, seccomp, --read-only, USER, rootless, --security-opt

**Итого: ~4 часа.** Перерыв — после Lab 4 (seccomp) и Lab 8 (defense in depth): там больше всего нюансов.

---

## Lab 0. Проверка окружения — 5 мин

**Цель:** увидеть, какие security-механизмы **уже** работают, и что мы **будем** проверять.

```bash
wsl -d docker-desktop

# 1. Проверить, что Docker daemon использует seccomp
docker info --format '{{json .SecurityOptions}}' | python3 -m json.tool
# Ожидаемо (фрагмент):
# [
#   "name=seccomp,profile=builtin",
#   "name=cgroupns",
#   ...
# ]

# 2. Проверить, что мы НЕ rootless (Docker Desktop — rootful)
docker info --format 'Rootless={{.SecurityOptions}}' | grep -i rootless || echo "rootful (Docker Desktop)"
# Ожидаемо: rootful (Docker Desktop) — это нормально

# 3. Проверить, что user namespace ВЫКЛЮЧЕН (Docker Desktop default)
docker info --format '{{.SecurityOptions}}' | tr ',' '\n' | grep -i userns || echo "userns не включён"
# Ожидаемо: не включён
```

**Записать:** `seccomp` **включён** (builtin), Docker Desktop **rootful** (rootless — только на Linux), `userns` **не включён** по умолчанию.

---

## Lab 1. Writable rootfs и root по умолчанию — 20 мин

**Цель:** увидеть, что **по умолчанию** контейнер: (1) работает **от root**, (2) может **писать** в rootfs. Понять, **почему** это опасно.

### Часть A — root по умолчанию

```bash
docker run --rm alpine id
# Ожидаемо: uid=0(root) gid=0(root) groups=0(root)

docker run --rm alpine sh -c 'whoami; cat /etc/shadow 2>/dev/null | head -1'
# Ожидаемо: root
# root:*:19000:0:99999:7:::   ← может читать /etc/shadow
```

**Вывод:** контейнер **по умолчанию** — root. Может **читать** `/etc/shadow` (в **обычном** Linux это **только** root).

### Часть B — writable rootfs

```bash
docker run -d --name rw alpine sleep 1000

# Можем писать куда угодно
docker exec rw sh -c 'echo "malicious" > /usr/local/bin/backdoor && ls -la /usr/local/bin/backdoor'
# -rw-r--r--    1 root     root            10 Nov 22 00:00 /usr/local/bin/backdoor

# И даже в /etc
docker exec rw sh -c 'echo "hacked" >> /etc/motd && cat /etc/motd'
# hacked

docker rm -f rw
```

**Вывод:** rootfs **writable** — атакующий **может** записать payload в **любое** место (включая `$PATH`).

### Часть C — что **останавливает** этот root

Несмотря на root, у контейнера **есть** ограничения:

```bash
docker run --rm alpine sh -c 'mount -t tmpfs none /mnt 2>&1'
# Ожидаемо: mount: permission denied (are you root?)  ← нет CAP_SYS_ADMIN

docker run --rm alpine sh -c 'cat /proc/kcore 2>&1 | head -1'
# Ожидаемо: cat: can't open '/proc/kcore': Permission denied  ← нет CAP_SYS_RAWIO

docker run --rm alpine sh -c 'capsh --print 2>/dev/null | grep Current' 2>/dev/null || \
  docker run --rm alpine sh -c 'grep Cap /proc/self/status'
# Ожидаемо: CapEff: 00000000a80425fb  ← не все capabilities
```

**Вывод:** root **внутри** контейнера **не** равен root **на хосте**. Docker **отбрасывает** опасные capabilities (например, `SYS_ADMIN`, `SYS_RAWIO`), поэтому **некоторые** действия **запрещены**. Но **оставшихся** 14 capabilities **достаточно** для **многих** атак.

**Что записать:**
- контейнер **по умолчанию** — root;
- rootfs **writable** — можно записать payload;
- Docker **отбрасывает** опасные capabilities, но **14 остаются** — это **не** «безопасный root».

---

## Lab 2. `USER`: non-root внутри контейнера — 25 мин

**Цель:** увидеть, что `USER` **меняет** пользователя для **процесса**, но **не** решает **проблемы прав** автоматически. Понять **правильный** способ.

### Часть A — `USER` без `chown` — падение

```bash
mkdir -p /tmp/sec-user && cd /tmp/sec-user

cat > app.sh <<'EOF'
#!/bin/sh
echo "starting as $(whoami) (uid=$(id -u))"
echo "data" > /app/data/file.txt
echo "wrote successfully"
EOF
chmod +x app.sh

cat > Dockerfile.broken <<'EOF'
FROM alpine
RUN mkdir -p /app/data
COPY app.sh /app/app.sh
USER 1000:1000
CMD ["/app/app.sh"]
EOF

docker build -f Dockerfile.broken -t sec:broken .

docker run --rm sec:broken
# Ожидаемо:
# starting as (uid=1000)
# sh: can't create /app/data/file.txt: Permission denied
```

**Почему:** `/app/data` создан **от root** (до `USER`), `uid=1000` **не** имеет прав на запись.

### Часть B — `USER` + `chown` — работает

```bash
cat > Dockerfile.fixed <<'EOF'
FROM alpine
RUN addgroup -S appgroup && adduser -S -G appgroup -u 1000 appuser
RUN mkdir -p /app/data && chown -R appuser:appgroup /app
COPY app.sh /app/app.sh
RUN chmod +x /app/app.sh
USER appuser
CMD ["/app/app.sh"]
EOF

docker build -f Dockerfile.fixed -t sec:fixed .
docker run --rm sec:fixed
# Ожидаемо:
# starting as appuser (uid=1000)
# wrote successfully

# Проверим, что процесс — НЕ root
docker run -d --name check-user sec:fixed sleep 1000
docker exec check-user ps aux | grep app.sh | grep -v grep
# Ожидаемо: 1000 ... /app/app.sh  ← uid=1000

docker exec check-user id
# Ожидаемо: uid=1000(appuser) gid=1000(appuser) ...
```

### Часть C — `COPY --chown` (ещё лучше)

```bash
cat > Dockerfile.best <<'EOF'
FROM alpine
RUN addgroup -S appgroup && adduser -S -G appgroup -u 1000 appuser
WORKDIR /app
RUN mkdir -p /app/data && chown appuser:appgroup /app/data
COPY --chown=appuser:appgroup app.sh /app/app.sh
RUN chmod +x /app/app.sh
USER appuser
CMD ["/app/app.sh"]
EOF

docker build -f Dockerfile.best -t sec:best .
docker run --rm sec:best
# Ожидаемо: starting as appuser (uid=1000) / wrote successfully
```

**`COPY --chown`** сразу **ставит** правильного владельца — **без** отдельного `RUN chown` (меньше слоёв, быстрее).

### Часть D — `--user` в `docker run` (переопределение)

```bash
# Переопределяем USER на другой uid (например, чтобы совпасть с хостом)
docker run --rm --user 1001:1001 sec:best
# Ожидаемо: starting as (uid=1001)
# sh: can't create /app/data/file.txt: Permission denied
# ⚠️ /app/data принадлежит 1000, а мы запустились как 1001 — нет прав
```

**Вывод:** `--user` **переопределяет** `USER`, но **не** меняет **права** файлов. Для **работы** — либо **совпадение** UID, либо **chown** в entrypoint.

**Что записать:**

| Сценарий | Работает? | Почему |
|---|---|---|
| `USER 1000` без `chown` | ❌ | файлы принадлежат root |
| `USER` + `chown -R` | ✅ | файлы принадлежат нужному UID |
| `COPY --chown=...` + `USER` | ✅ | правильный владелец **сразу** |
| `--user 1001` на образе с `chown 1000` | ❌ | UID не совпадает |

```bash
docker rmi sec:broken sec:fixed sec:best 2>/dev/null
rm -rf /tmp/sec-user
```

---

## Lab 3. Capabilities: `--cap-drop` и `--cap-add` — 35 мин

**Цель:** увидеть, **какие** capabilities **по умолчанию**, **что** они дают, и как **уменьшить** до **минимума**.

### Часть A — capabilities по умолчанию

```bash
docker run --rm alpine sh -c 'apk add --no-cache libcap >/dev/null 2>&1; capsh --print 2>/dev/null | grep Current || grep Cap /proc/self/status'
# Ожидаемо: CapEff: 00000000a80425fb

# Расшифруем
docker run --rm alpine sh -c 'apk add --no-cache libcap >/dev/null 2>&1; capsh --decode=00000000a80425fb'
# Ожидаемо:
# 0x00000000a80425fb=cap_chown,cap_dac_override,cap_fowner,cap_fsetid,
# cap_kill,cap_setgid,cap_setuid,cap_setpcap,cap_net_bind_service,
# cap_net_raw,cap_sys_chroot,cap_mknod,cap_audit_write,cap_setfcap
```

**14 capabilities** по умолчанию. Из них **опасны** для атаки: `NET_RAW`, `SYS_CHROOT`, `MKNOD`, `SETUID`, `SETGID`, `DAC_OVERRIDE`.

### Часть B — `--cap-drop=ALL` (максимальная строгость)

```bash
docker run --rm --cap-drop=ALL alpine sh -c 'grep Cap /proc/self/status'
# Ожидаемо: CapEff: 0000000000000000

# Проверим, что ping (нужен CAP_NET_RAW) НЕ работает
docker run --rm --cap-drop=ALL alpine ping -c 1 8.8.8.8 2>&1 | head -3
# Ожидаемо: PING 8.8.8.8 (8.8.8.8): 56 data bytes
# ping: permission denied (are you root?)  ← нет CAP_NET_RAW

# Проверим, что mount (нужен CAP_SYS_ADMIN) НЕ работает
docker run --rm --cap-drop=ALL alpine sh -c 'mkdir /mnt/test && mount -t tmpfs none /mnt/test 2>&1'
# Ожидаемо: mount: permission denied
```

### Часть C — `--cap-add` только нужного

```bash
# Пинг с минимальными capabilities
docker run --rm --cap-drop=ALL --cap-add=NET_RAW alpine ping -c 1 8.8.8.8
# Ожидаемо: 1 packets transmitted, 1 received

# Проверим, что capabilities — только NET_RAW
docker run --rm --cap-drop=ALL --cap-add=NET_RAW alpine sh -c 'grep Cap /proc/self/status'
# Ожидаемо: CapEff: 0000000000002000  ← только NET_RAW (бит 13)

docker run --rm --cap-drop=ALL --cap-add=NET_RAW alpine sh -c 'apk add --no-cache libcap >/dev/null 2>&1; capsh --decode=0000000000002000'
# Ожидаемо: 0x0000000000002000=cap_net_raw
```

### Часть D — `nginx` с минимальными capabilities

**Типичный** nginx слушает 80 → нужна `NET_BIND_SERVICE`.

```bash
# С --cap-drop=ALL — nginx упадёт на bind 80
docker run --rm --cap-drop=ALL nginx:alpine 2>&1 | grep -i 'bind\|permission' | head -3
# Ожидаемо: nginx: [emerg] bind() to 0.0.0.0:80 failed (13: Permission denied)

# С NET_BIND_SERVICE — работает
docker run -d --rm --name nginx-sec --cap-drop=ALL --cap-add=NET_BIND_SERVICE -p 8080:80 nginx:alpine
sleep 2
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080
# Ожидаемо: 200

docker stop nginx-sec
```

### Часть E — `CAP_SYS_ADMIN` — «новый root» (демонстрация опасности)

```bash
# С SYS_ADMIN — можно mount
docker run --rm --cap-add=SYS_ADMIN alpine sh -c 'mkdir /mnt/test && mount -t tmpfs none /mnt/test && echo "mounted ok"'
# Ожидаемо: mounted ok

# С SYS_ADMIN — можно попытаться выйти на хост (упрощённый пример)
docker run --rm --cap-add=SYS_ADMIN alpine sh -c 'cat /proc/self/mountinfo | head -1'
# Видит mountinfo ХОСТА — не изолирован по mount namespace (частично)
```

**SYS_ADMIN** — **самая** опасная. Даёт **почти** полный root. **Никогда** не добавлять без **крайней** необходимости.

**Что записать:**
- по умолчанию — **14** capabilities (`a80425fb`);
- `--cap-drop=ALL` → **0** capabilities;
- `--cap-add` **только** нужного (`NET_RAW`, `NET_BIND_SERVICE`);
- `SYS_ADMIN` — **никогда** в проде (позволяет mount и другие опасные операции).

```bash
docker rmi nginx:alpine 2>/dev/null
```

---

## Lab 4. Seccomp: default профиль и кастомный — 30 мин

**Цель:** увидеть, **какие** syscall **заблокированы** по умолчанию, и как **добавить** разрешение (для приложения, которому нужен `clone3` или другой syscall).

### Часть A — default seccomp блокирует опасные syscall

```bash
# 1. ptrace — блокирован по умолчанию
docker run --rm alpine sh -c 'apk add --no-cache strace >/dev/null 2>&1; strace -e trace=write echo hello 2>&1 | head -3'
# Ожидаемо: strace: ptrace(PTRACE_TRACEME, ...): Operation not permitted
# (ptrace — заблокирован)

# 2. kexec_load — блокирован
docker run --rm alpine sh -c 'apk add --no-cache kexec-tools >/dev/null 2>&1; kexec -l /boot/vmlinuz 2>&1 | head -2'
# Ожидаемо: kexec_load failed: Operation not permitted

# 3. bpf — блокирован (в некоторых версиях)
docker run --rm alpine sh -c 'apk add --no-cache bcc-tools >/dev/null 2>&1; bpftool prog list 2>&1 | head -2'
# Ожидаемо: BPF: Permission denied (или "Operation not permitted")
```

### Часть B — `seccomp=unconfined` (опасно)

```bash
# Отключаем seccomp — ptrace работает
docker run --rm --security-opt seccomp=unconfined alpine sh -c \
  'apk add --no-cache strace >/dev/null 2>&1; strace -e trace=write echo hello 2>&1 | head -3'
# Ожидаемо:
# write(1, "hello\n", 6)              = 6
# +++ exited with 0 +++
# (ptrace работает)
```

**Вывод:** default seccomp **блокирует** ptrace. `unconfined` **разрешает**. **Никогда** не использовать `unconfined` в проде.

### Часть C — кастомный профиль (разрешаем ptrace)

```bash
mkdir -p /tmp/sec-seccomp && cd /tmp/sec-seccomp

# Создаём профиль: default + разрешаем ptrace, process_vm_readv, process_vm_writev
cat > profile.json <<'EOF'
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64", "SCMP_ARCH_X86", "SCMP_ARCH_AARCH64"],
  "syscalls": [
    {
      "names": [
        "accept", "accept4", "access", "arch_prctl", "bind", "brk",
        "chdir", "chmod", "chown", "clone", "close", "connect", "dup", "dup2",
        "execve", "exit", "exit_group", "fcntl", "fstat", "futex",
        "getcwd", "getdents", "getegid", "geteuid", "getgid", "getpid",
        "getppid", "getuid", "ioctl", "listen", "lseek", "lstat",
        "mmap", "mprotect", "munmap", "nanosleep", "newfstatat",
        "open", "openat", "pipe", "pipe2", "poll", "ppoll",
        "read", "readlink", "recvfrom", "rt_sigaction", "rt_sigprocmask",
        "rt_sigreturn", "sched_yield", "sendto", "setgid", "setuid",
        "setsockopt", "socket", "stat", "statx", "write",
        "ptrace", "process_vm_readv", "process_vm_writev"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
EOF

docker run --rm --security-opt seccomp=/tmp/sec-seccomp/profile.json alpine \
  sh -c 'apk add --no-cache strace >/dev/null 2>&1; strace -e trace=write echo hello 2>&1 | head -3'
# Ожидаемо:
# write(1, "hello\n", 6)              = 6
# +++ exited with 0 +++
# (ptrace разрешён, хотя seccomp не unconfined)
```

**Что произошло:** профиль **разрешает** ptrace **только** для конкретного контейнера. Seccomp **остаётся** включённым — **остальные** заблокированные syscall (например, `bpf`, `kexec_load`) **всё ещё** заблокированы.

### Часть D — где взять «правильный» профиль

Docker **не** даёт **кастомные** профили «из коробки». **Источники:**

1. **`github.com/docker/docker/profiles/seccomp/default.json`** — **копия** default профиля; **правьте** её.
2. **`github.com/opencontainers/runtime-spec`** — **спецификация** seccomp.
3. **`github.com/moby/profiles`** — **готовые** профили для **типичных** приложений (nginx, redis, ...).

**Правило:** **начинайте** с default, **добавляйте** только **то**, что **действительно** нужно приложению. **Не** отключайте seccomp.

**Что записать:**

| Режим | Что делает | Когда |
|---|---|---|
| **default** | ~300 syscall разрешено, ~44 заблокировано | **Всегда** (для **99%** приложений) |
| **кастомный** | default + **дополнительные** разрешения | Когда default **блокирует** нужный syscall (например, `clone3` в Node.js) |
| **unconfined** | **Всё** разрешено | **Никогда** в проде; **только** для отладки |

```bash
rm -rf /tmp/sec-seccomp
```

---

## Lab 5. `--read-only`: заморозка rootfs — 25 мин

**Цель:** увидеть, что `--read-only` **блокирует** запись **везде**, кроме tmpfs и volume. Понять, **как** с этим жить.

### Часть A — `--read-only` на чистом alpine

```bash
docker run --rm --read-only alpine sh -c 'echo "test" > /tmp/f.txt'
# Ожидаемо: sh: can't create /tmp/f.txt: Read-only file system

docker run --rm --read-only alpine sh -c 'cat /etc/os-release | head -1'
# Ожидаемо: NAME="Alpine Linux"  ← чтение работает
```

### Часть B — `--read-only` + `--tmpfs /tmp`

```bash
docker run --rm --read-only --tmpfs /tmp:size=10m alpine sh -c 'echo "test" > /tmp/f.txt && cat /tmp/f.txt'
# Ожидаемо: test  ← /tmp writable, остальное read-only

# Проверим, что /etc всё ещё read-only
docker run --rm --read-only --tmpfs /tmp:size=10m alpine sh -c 'echo "x" > /etc/hosts'
# Ожидаемо: sh: can't create /etc/hosts: Read-only file system
```

### Часть C — `--read-only` + volume

```bash
docker volume create sec-ro-data

docker run --rm --read-only \
  --tmpfs /tmp \
  --tmpfs /run \
  -v sec-ro-data:/var/lib/app \
  alpine sh -c '
    echo "persistent" > /var/lib/app/data.txt &&
    echo "temp" > /tmp/temp.txt &&
    echo "rootfs" > /etc/broken 2>&1 | head -1
  '
# Ожидаемо: sh: can't create /etc/broken: Read-only file system (но data.txt и temp.txt записаны)

# Проверим
docker run --rm -v sec-ro-data:/data alpine cat /data/data.txt
# Ожидаемо: persistent

docker volume rm sec-ro-data
```

### Часть D — nginx с `--read-only` (реальный пример)

**Проблема:** nginx **пишет** в `/var/cache/nginx`, `/var/run/nginx.pid`, `/var/log/nginx`. **Все три** нужно **сделать** writable.

```bash
docker run -d --rm --name nginx-ro \
  --read-only \
  --tmpfs /var/cache/nginx:size=10m \
  --tmpfs /var/run:size=1m \
  --tmpfs /var/log/nginx:size=10m \
  -p 8081:80 \
  nginx:alpine

sleep 2
docker ps --filter name=nginx-ro
# Ожидаемо: Up ... (running) — если не запустилось, см. логи

docker logs nginx-ro 2>&1 | tail -5
# Ожидаемо: пусто (или access logs)

curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8081
# Ожидаемо: 200

# Проверим, что rootfs действительно read-only
docker exec nginx-ro sh -c 'echo "hack" > /usr/share/nginx/html/hack.html 2>&1'
# Ожидаемо: sh: can't create /usr/share/nginx/html/hack.html: Read-only file system

docker stop nginx-ro
```

**Вывод:** `--read-only` **работает** для **production** nginx — **но** нужны **tmpfs** для **всех** мест, куда приложение **пишет**.

### Часть E — когда `--read-only` **не** работает

**Java-приложения** (например, Spring Boot) **пишут** в `$CATALINA_HOME` или **распаковывают** `.jar` в `/tmp` **при старте**. Если **tmpfs** не **смонтирован** — **падение**.

**Решение:**
- **tmpfs** для `/tmp`, `/var/tmp`, `/run`;
- **volume** для **persistent** данных;
- **проверить** в **dev**: `docker run --read-only ... app` → **увидеть**, **куда** пишет.

**Что записать:**
- `--read-only` **блокирует** запись в rootfs;
- **tmpfs** для **временных** файлов, **volume** для **persistent**;
- **nginx** работает с `--read-only` + 3 tmpfs;
- **некоторые** приложения **требуют** адаптации (Java, .NET).

---

## Lab 6. `no-new-privileges` — запрет повышения прав — 15 мин

**Цель:** увидеть, что `no-new-privileges` **блокирует** `setuid`/`setgid`-бинарники, **даже** если они есть в образе.

### Часть A — `setuid` без `no-new-privileges`

```bash
# Запускаем от non-root с setuid-бинарником (su-exec)
docker run --rm --user 1000:1000 alpine sh -c '
  apk add --no-cache su-exec >/dev/null 2>&1
  echo "before: $(id -u)"
  su-exec root id 2>&1 || echo "su-exec failed"
'
# Ожидаемо: "before: 1000" / "su-exec failed" — не смог стать root (нет setuid-бита в alpine)
```

**Стоп.** В alpine `su-exec` **не** имеет setuid-бита — поэтому **не** повышает права. **Нужен** реальный setuid-бинарник. Используем **`sudo`**:

```bash
# Установим sudo (у него есть setuid-бит)
docker run --rm --user 1000:1000 alpine sh -c '
  apk add --no-cache sudo >/dev/null 2>&1
  echo "before: $(id -u)"
  sudo -n id 2>&1 || echo "sudo failed"
'
# Ожидаемо:
# before: 1000
# sudo: you do not exist in the passwd database  ← sudo не работает без passwd
```

**Проще:** используем `ping` (у него **есть** `NET_RAW` через capabilities, но **не** через setuid — это **не** setuid-бинарник в alpine).

**Лучший** способ — **написать** тестовый setuid-бинарник:

```bash
mkdir -p /tmp/sec-nnp && cd /tmp/sec-nnp

cat > Dockerfile <<'EOF'
FROM alpine
RUN apk add --no-cache gcc musl-dev
RUN printf '#include <stdio.h>\n#include <unistd.h>\nint main(){printf("uid=%%d\\n", getuid());return 0;}\n' > /tmp/check.c \
  && gcc -o /usr/local/bin/checkuid /tmp/check.c \
  && chmod u+s /usr/local/bin/checkuid \
  && rm -rf /tmp/check.c /var/cache/apk/*
RUN adduser -D -u 1000 appuser
USER appuser
CMD ["sh"]
EOF

docker build -t sec:suid .
```

### Часть B — без `no-new-privileges` — setuid работает

```bash
docker run --rm sec:suid sh -c 'id -u; /usr/local/bin/checkuid'
# Ожидаемо:
# 1000
# uid=0  ← setuid-бинарник ПОВЫСИЛ права до root
```

### Часть C — с `no-new-privileges` — setuid **заблокирован**

```bash
docker run --rm --security-opt no-new-privileges:true sec:suid sh -c 'id -u; /usr/local/bin/checkuid'
# Ожидаемо:
# 1000
# uid=1000  ← setuid-бинарник НЕ повысил права (no-new-privileges)
```

**Вывод:** `no-new-privileges:true` **гарантирует**, что процесс **не** получит **новых** привилегий через `execve`. Даже **если** в образе **есть** setuid-бинарник — он **не** повысит права.

**Что записать:**
- `setuid`-бинарник **повышает** права (1000 → 0);
- `no-new-privileges:true` **блокирует** повышение;
- **всегда** включать для production.

```bash
rm -rf /tmp/sec-nnp
docker rmi sec:suid 2>/dev/null
```

---

## Lab 7. Rootless mode: концепция и проверка — 20 мин

**Цель:** понять **что** такое rootless, **почему** Docker Desktop **не** даёт его **полноценно**, и как **проверить** rootless на **Linux**.

### Часть A — Docker Desktop **rootful**

```bash
docker info --format '{{json .SecurityOptions}}' | python3 -m json.tool
# Ожидаемо: ["name=seccomp,profile=builtin","name=cgroupns"]
# НЕТ "name=rootless"

docker info --format '{{.DockerRootDir}}'
# Ожидаемо: /var/lib/docker  ← требует root на хосте WSL
```

**Docker Desktop** работает **rootful** — демон **запущен** от root **в WSL VM**. Rootless **недоступен** (или **ограничен**).

### Часть B — проверить на **настоящем** Linux (если есть)

**Если** у вас есть **доступ** к Linux-хосту **без** Docker Desktop:

```bash
# На Linux-хосте
sudo apt-get install -y uidmap dbus-user-session
dockerd-rootless-setuptool.sh install
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/docker.sock
docker info --format '{{json .SecurityOptions}}' | python3 -m json.tool
# Ожидаемо: "name=rootless" в списке
```

### Часть C — **понять** концепцию **без** установки

**Rootless** использует **user namespace** — контейнер **думает**, что он root, **но** на **хосте** — **непривилегированный** UID.

**Проверить** user namespace в **Docker Desktop** (даже без rootless):

```bash
# Посмотреть, какой UID видит контейнер, и какой UID реально на хосте
docker run -d --name userns-test alpine sleep 1000
docker exec userns-test cat /proc/self/uid_map
# Ожидаемо (rootful): 0 0 4294967295  ← контейнер root = хост root (нет маппинга)

docker inspect userns-test --format '{{.State.Pid}}'
# PID в namespace хоста
HOST_PID=$(docker inspect userns-test --format '{{.State.Pid}}')
cat /proc/$HOST_PID/status | grep Uid
# Ожидаемо (rootful): Uid: 0 0 0 0  ← хост-UID = 0 (root)

docker rm -f userns-test
```

**Если** бы **был** rootless:

```
docker exec userns-test cat /proc/self/uid_map
# Ожидаемо (rootless): 0 1000 1  ← контейнер root = хост UID 1000

cat /proc/$HOST_PID/status | grep Uid
# Ожидаемо (rootless): Uid: 1000 1000 1000 1000  ← хост-UID = 1000, НЕ root
```

### Часть D — **проверить** на Docker Desktop **ограниченно**

```bash
# Проверим, что Docker Desktop — rootful (даже если "rootless" где-то упоминается)
docker run --rm alpine sh -c 'id -u'
# Ожидаемо: 0 (root) — как обычно

# На ХОСТЕ (Windows) — процесс docker в WSL VM работает от root
docker run -d --name check-host alpine sleep 1000
HOST_PID=$(docker inspect check-host --format '{{.State.Pid}}')
# В WSL:
ps -p $HOST_PID -o pid,user,cmd
# Ожидаемо: root ... alpine sleep 1000  ← в WSL это root
docker rm -f check-host
```

**Вывод:** Docker Desktop **rootful** — root в контейнере = root в WSL VM. **Rootless** требует **Linux-хоста** и **отдельной** настройки.

**Что записать:**

| | **Rootful** (Docker Desktop) | **Rootless** (Linux) |
|---|---|---|
| Демон | root | user (1000) |
| Контейнер root = | хост root | хост UID 1000 |
| Компрометация | root **на хосте** | только **user 1000** |
| Где | Docker Desktop | Linux + `dockerd-rootless-setuptool` |
| Ограничения | — | нельзя privileged ports, некоторые capabilities |

---

## Lab 8. Defense in depth: слои безопасности — 30 мин

**Цель:** собрать **все** слои **вместе** и **убедиться**, что **каждый** блокирует **свой** вектор атаки.

### Часть A — «плохой» контейнер (все слои отключены)

```bash
mkdir -p /tmp/sec-layers && cd /tmp/sec-layers

cat > Dockerfile.bad <<'EOF'
FROM alpine
RUN apk add --no-cache libcap
CMD ["sh"]
EOF

docker build -f Dockerfile.bad -t layers:bad .
docker run -d --name bad --cap-add=ALL --security-opt seccomp=unconfined --privileged layers:bad sleep 1000

# 1. root
docker exec bad id
# uid=0(root)

# 2. Все capabilities
docker exec bad capsh --print 2>/dev/null | grep Current || grep Cap /proc/1/status
# CapEff: 000001ffffffffff  ← все

# 3. ptrace работает
docker exec bad sh -c 'apk add --no-cache strace >/dev/null 2>&1; strace -e trace=write echo hi 2>&1 | head -2'
# write(1, "hi\n", 3) = 3  ← ptrace разрешён

# 4. rootfs writable
docker exec bad sh -c 'echo hack > /etc/hacked && cat /etc/hacked'
# hack

# 5. mount работает
docker exec bad sh -c 'mount -t tmpfs none /mnt && echo mounted'
# mounted

docker rm -f bad
```

**Это — «худший случай».** **Любой** из векторов **работает**.

### Часть B — «хороший» контейнер (все слои включены)

```bash
cat > Dockerfile.good <<'EOF'
FROM alpine
RUN addgroup -S appgroup && adduser -S -G appgroup -u 1000 appuser
RUN apk add --no-cache libcap
WORKDIR /app
COPY --chown=appuser:appgroup entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
USER appuser
ENTRYPOINT ["/app/entrypoint.sh"]
EOF

cat > entrypoint.sh <<'EOF'
#!/bin/sh
echo "running as: $(id)"
echo "capabilities:" && grep Cap /proc/self/status
echo "rootfs test:" && (echo x > /etc/test 2>&1 || echo "  read-only ✓")
echo "ptrace test:" && (apk add --no-cache strace >/dev/null 2>&1 && strace -e trace=write echo hi 2>&1 | head -1 || echo "  ptrace blocked ✓")
echo "setuid test:" && (grep -q "^.*:.*:0:" /etc/passwd && echo "  setuid test skipped") || echo "  setuid limited ✓"
exec sleep 1000
EOF
chmod +x entrypoint.sh

docker build -f Dockerfile.good -t layers:good .
docker run -d --name good \
  --read-only \
  --tmpfs /tmp:size=10m \
  --tmpfs /run:size=1m \
  --cap-drop=ALL \
  --security-opt no-new-privileges:true \
  --security-opt seccomp=/tmp/sec-layers/seccomp-default.json \
  layers:good 2>/dev/null || \
docker run -d --name good \
  --read-only \
  --tmpfs /tmp:size=10m \
  --tmpfs /run:size=1m \
  --cap-drop=ALL \
  --security-opt no-new-privileges:true \
  layers:good

sleep 2
docker logs good
# Ожидаемо:
# running as: uid=1000(appuser) gid=1000(appuser)
# capabilities:
# CapEff: 0000000000000000  ← все сброшены
# rootfs test:
#   read-only ✓
# ptrace test:
#   ptrace blocked ✓
```

### Часть C — проверить, что **каждый** слой **блокирует**

```bash
# 1. Попытка стать root — заблокировано (USER + cap-drop=ALL)
docker exec good su - 2>&1 | head -2
# su: must be suid to work properly

# 2. Попытка mount — заблокировано (нет SYS_ADMIN)
docker exec good sh -c 'mkdir /mnt && mount -t tmpfs none /mnt 2>&1' | head -1
# mount: permission denied

# 3. Попытка ptrace — заблокировано (seccomp)
docker exec good sh -c 'strace echo hi 2>&1 | head -1' 2>/dev/null || echo "strace blocked"
# strace blocked

# 4. Попытка записать в rootfs — заблокировано (--read-only)
docker exec good sh -c 'echo hack > /etc/test 2>&1' | head -1
# sh: can't create /etc/test: Read-only file system

# 5. Попытка повысить привилегии через setuid — заблокировано (no-new-privileges)
# (если в образе нет setuid-бинарника — и не надо, слой всё равно работает)

# 6. Даже если приложение скомпрометировано — атакующий получает uid=1000
docker exec good id
# uid=1000(appuser) gid=1000(appuser)

docker rm -f good
```

**Что записать:**

| Слой | Что блокирует | Проверка |
|---|---|---|
| **USER** | root в контейнере | `docker exec good id` → uid=1000 |
| **--cap-drop=ALL** | mount, raw-сокеты, смена UID | `mount` → permission denied |
| **seccomp (default)** | ptrace, bpf, kexec | `strace` → blocked |
| **--read-only** | запись payload | `echo x > /etc/test` → read-only |
| **no-new-privileges** | setuid escalation | `su` → must be suid |
| **Rootless** | демон root | (только Linux) |

**Правило:** **каждый** слой **должен** быть **включён**, **даже** если предыдущий **уже** блокирует **этот** вектор. **Defense in depth** — **не** «один сильный слой», а **много** независимых.

```bash
rm -rf /tmp/sec-layers
docker rmi layers:bad layers:good 2>/dev/null
```

---

## 🏁 Капстоун: «Безопасный» nginx с минимальными привилегиями — 40 мин

**Цель:** собрать **production-подобный** nginx-контейнер с **всеми** security-слоями, **проверить** каждый, и **сравнить** с «дефолтным».

### Требования

1. **`USER`** — nginx работает от `nginx` (uid 101 в alpine), **не** от root.
2. **`--read-only`** — rootfs read-only, **но** nginx работает (tmpfs для `/var/cache/nginx`, `/var/run`, `/var/log/nginx`).
3. **`--cap-drop=ALL`** — **но** nginx слушает 80, значит нужна **`NET_BIND_SERVICE`**.
4. **`--security-opt no-new-privileges=true`** — nginx не может повысить права.
5. **seccomp default** — **всё** работает.
6. **`--memory=128m`** — лимит памяти (для практики).
7. **`--pids-limit=50`** — лимит процессов.

### Шаги (сам, без подсказок)

1. **Собери** Dockerfile: nginx-alpine, **но** с `USER nginx` (из **stock** `nginx:alpine` **уже** есть `nginx` user, **но** entrypoint **запускает** master от root — нужно **изменить**).
2. **Проверь**, что при `docker run --read-only ...` nginx **падает** (без tmpfs).
3. **Добавь** tmpfs для **всех** мест, куда пишет nginx.
4. **Добавь** `--cap-drop=ALL --cap-add=NET_BIND_SERVICE`.
5. **Добавь** `no-new-privileges`.
6. **Проверь**, что всё **работает**:
   - `curl localhost:8082` → 200;
   - `docker exec ... id` → `uid=101(nginx)`;
   - `docker exec ... mount -t tmpfs none /mnt` → `permission denied`;
   - `docker exec ... echo x > /etc/test` → `read-only file system`;
   - `docker exec ... strace` → blocked.

### «Плохой» вариант (сравнение)

```bash
docker run -d --name nginx-bad -p 8083:80 nginx:alpine
# Всё работает, но:
docker exec nginx-bad id
# uid=0(root)  ← root!
docker exec nginx-bad sh -c 'echo hack > /etc/hacked'
# работает
docker exec nginx-bad sh -c 'apt-get update' 2>/dev/null || apk add --no-cache curl 2>&1 | head -1
# (если не от root — упадёт; но тут root — сработает)
```

### Что измерить и записать

| Метрика | **Плохой** (default) | **Хороший** (hardened) |
|---|---|---|
| `id` | `uid=0(root)` | `uid=101(nginx)` |
| `echo x > /etc/test` | ✅ работает | ❌ `read-only` |
| `mount -t tmpfs none /mnt` | ✅ работает (если cap) | ❌ `permission denied` |
| `strace` | ❌ (seccomp default) | ❌ (seccomp default) |
| `curl localhost:XXXX` | 200 | 200 |
| Capabilities | 14 | 1 (`NET_BIND_SERVICE`) |
| Rootfs | writable | read-only |
| `no-new-privileges` | ❌ | ✅ |

**Сравнительная таблица «плохо vs хорошо»** — **обязательна** в журнале.

### «Плохие» варианты, которые нужно **уметь объяснить**

- **`--privileged`** — «я не хочу возиться с capabilities». **Плохо**: даёт **ВСЁ** — включая `SYS_ADMIN`. Это **не** «удобно» — это **опасно**.
- **`seccomp=unconfined`** — «strace не работает». **Плохо**: отключает **все** фильтры syscall. Правильно: **кастомный** профиль с **разрешением** ptrace.
- **`USER root`** — «иначе не работает». **Плохо**: атакующий получает root. Правильно: **адаптировать** приложение под non-root (chown, tmpfs).
- **`--read-only=false`** — «приложение пишет в rootfs». **Плохо**: можно записать payload. Правильно: **tmpfs** для временных, **volume** для persistent.
- **`--cap-add=ALL`** — «всё работает». **Плохо**: **почти** полный root. Правильно: **минимальный** набор.

```bash
docker rm -f nginx-bad nginx-good 2>/dev/null
docker rmi nginx-sec 2>/dev/null
```

---

## 📋 Чек-лист покрытия Урока 5

| Тема | Лаба |
|---|---|
| Writable rootfs, root по умолчанию | 1A, 1B |
| Что **останавливает** root (capabilities) | 1C |
| `USER` без `chown` — падение | 2A |
| `USER` + `chown` — работает | 2B |
| `COPY --chown` — правильно | 2C |
| `--user` переопределяет `USER` | 2D |
| 14 capabilities по умолчанию | 3A |
| `--cap-drop=ALL` | 3B |
| `--cap-add` только нужного | 3C |
| nginx с `NET_BIND_SERVICE` | 3D |
| `CAP_SYS_ADMIN` — опасно | 3E |
| seccomp default блокирует ptrace | 4A |
| `seccomp=unconfined` — опасно | 4B |
| кастомный seccomp-профиль | 4C |
| `--read-only` блокирует запись | 5A |
| `--read-only` + `--tmpfs` | 5B |
| `--read-only` + volume | 5C |
| nginx с `--read-only` | 5D |
| `no-new-privileges` блокирует setuid | 6B, 6C |
| rootless концепция | 7 |
| rootful Docker Desktop | 7A, 7D |
| Defense in depth — все слои | 8A, 8B, 8C |
| Капстоун: hardened nginx | 🏁 |

---

## Что дальше

- **Урок 6 (Ресурсы):** `--memory`, `--cpus`, `--pids-limit`, cgroup v2, OOM.
- **Урок 7 (Compose + CI/CD):** `docker compose`, `buildx bake`, GitHub Actions.
- **Урок 8 (Отладка в проде):** `exec`, `nsenter`, traces, structured logs, `docker events`.
- **Урок 4.5 (Регистри):** теги, digest, scan, sign.
- **Урок 4.7 (Daemon):** `daemon.json`, log drivers, live-restore.