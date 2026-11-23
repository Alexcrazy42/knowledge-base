# Docker — Lab 4 Journal. Данные: volumes, bind mounts, tmpfs, backup/restore

**Итого: ~4 часа 15 минут.** Перерыв — после Lab 5 (PostgreSQL) и Lab 7 (pg_dump vs tar): там больше всего «почему не работает».

---

## Lab 0. Проверка окружения — 5 мин

**Цель:** увидеть, где Docker хранит volume, какой драйвер используется, и что сейчас **нет** «мусорных» volume.

```bash
wsl -d docker-desktop

docker version --format '{{.Server.Version}}'
# 29.9.3
docker info --format 'Storage Driver={{.Driver}}'
# Ожидаемо: Storage Driver=overlay2 done

docker volume ls
# Ожидаемо: пусто или DRIVER VOLUME NAME (если раньше уже работал с volume)

# Где физически лежат volumes
ls /mnt/docker-desktop-disk/data/docker/volumes
# 131b07266a446249bbf8be5ed8cddf342672e9303bf56e49cd7b09cbb118268b
# 5acd30706b76eba0db1b24a033d245f0ffc1251b251a0cf88a8c209b49c2808f
# backingFsBlockDev
# dotnet-libs_jobs-postgres-data
# metadata.db
# opentelemetry_grafana-data
# opentelemetry_tempo-data
```

**Записать:** драйвер (`overlay2`), путь `/mnt/docker-desktop-disk/data/docker/volumes`

---

## Lab 1. Writable layer умирает вместе с контейнером — 20 мин

**Цель:** убедиться, что **любой** файл, созданный в контейнере **без volume**, исчезает при `docker rm`. Понять, что `docker commit` — **не** бэкап.

### Часть A — запись в writable layer

```bash
docker run -d --name wl alpine sh -c 'echo "important data" > /data.txt; sleep 1000'

# Проверим, что файл есть
docker exec wl cat /data.txt
# Ожидаемо: important data

# Где этот файл физически? — в overlay2 (upperdir)
docker inspect wl --format '{{.GraphDriver.Data.UpperDir}}'
# /var/lib/docker/overlay2/72874f8e9769495b648ee71bbcd3df1686d7ac8fac1ed38ab2a230f2b0b135a8/diff

docker inspect wl --format '{{.GraphDriver.Data.MergedDir}}'
# \\wsl.localhost\docker-desktop\mnt\docker-desktop-disk\data\docker\overlay2\fbdaf9e0a877f07efd123f79774f8a6f5f39ba8bd8cf050b3914c612a2af2731\merged

# \\wsl.localhost\docker-desktop\mnt\docker-desktop-disk\data\docker\overlay2\fbdaf9e0a877f07efd123f79774f8a6f5f39ba8bd8cf050b3914c612a2af2731\merged

# А теперь — убьём контейнер
docker rm -f wl

# Сразу после этого все из overlay2 теряется
```

**Вывод:** `docker rm` **удаляет** writable layer целиком. Данные **потеряны**.

### Часть B — `docker commit` — «бэкап»?

```bash
docker run -d --name wl2 alpine sh -c 'echo "important data" > /data.txt; sleep 1000'
docker commit wl2 wl2-snapshot

docker run --rm wl2-snapshot cat /data.txt
# Ожидаемо: important data — «бэкап» сработал!

docker rm -f wl2

# Но если контейнер продолжал писать — эти данные НЕ попали в snapshot
docker run -d --name wl3 alpine sh -c 'echo "v1" > /data.txt; sleep 1000'
docker commit wl3 wl3-snap
docker exec wl3 sh -c 'echo "v2" >> /data.txt'    # пишем ПОСЛЕ commit
docker run --rm wl3-snap cat /data.txt
# Ожидаемо: v1 (а не v1+v2) — commit сделал снимок на момент вызова

docker rm -f wl3
```

**Вывод:** `docker commit` делает **снимок writable layer** на момент вызова, но:
- **не** включает volume и bind mounts — все данные «снаружи» **не** попадут;
- **не** гарантирует консистентность — процесс мог писать во время коммита;
- превращает контейнер в **образ** — а образ **иммутабелен**, для «живых данных» это **не** бэкап.

**Что записать:**
- writable layer лежит в `upperdir` overlay2, **удаляется** при `docker rm`;
- `docker commit` — снимок **слоя**, **не** бэкап (volume и bind — снаружи);
- «данные, которые переживут контейнер» должны лежать **вне** writable layer.

---

## Lab 2. Named volumes: persistence, шаринг, инициализация — 35 мин

**Цель:** увидеть, что named volume **переживает** `docker rm` контейнера, **шарится** между контейнерами, и **инициализируется** из образа при первом старте.

### Часть A — persistence

```bash
docker volume create mydata
docker volume inspect mydata --format 'Mountpoint={{.Mountpoint}} Driver={{.Driver}}'
# Mountpoint=/var/lib/docker/volumes/mydata/_data Driver=local

docker run -d --name c1 -v mydata:/data alpine sh -c 'echo "hello" > /data/hi.txt; sleep 1000'
docker exec c1 cat /data/hi.txt
# hello

# \\wsl.localhost\docker-desktop\mnt\docker-desktop-disk\data\docker\volumes\mydata\_data\hi.txt
# Ожидаемо: hello

# Убиваем контейнер
docker rm -f c1

# А volume — жив!
docker volume ls
docker run --rm -v mydata:/data alpine cat /data/hi.txt
# hello 
# -> данные ПЕРЕЖИЛИ контейнер
```

**Вывод:** volume **не** привязан к контейнеру. Удалили контейнер — volume остался.

### Часть B — шаринг между контейнерами

```bash
docker run -d --name c2 -v mydata:/data alpine sleep 1000
docker run -d --name c3 -v mydata:/data alpine sleep 1000

# Пишем из c2
docker exec c2 sh -c 'echo "from c2" >> /data/shared.txt'

# Читаем из c3
docker exec c3 cat /data/shared.txt
# from c2

# Одновременная запись из обоих
docker exec c2 sh -c 'echo "line from c2" >> /data/log.txt'
docker exec c3 sh -c 'echo "line from c3" >> /data/log.txt'
docker exec c2 cat /data/log.txt
# line from c2
# line from c3
```

**Вывод:** named volume — **общий** ресурс. Несколько контейнеров видят **одни и те же** файлы. Это основа для «sidecar»-паттернов (например, nginx + logrotate в одном volume).

### Часть C — инициализация из образа

Это **главное** отличие от bind mount.

```bash
mkdir -p /tmp/vol-init && cd /tmp/vol-init

cat > Dockerfile <<'EOF'
FROM alpine
RUN mkdir -p /data && echo "default config" > /data/config.txt
VOLUME /data
CMD ["sh"]
EOF

docker build -t vol-init:1 .

docker volume create init-vol
docker run --rm -v init-vol:/data vol-init:1 cat /data/config.txt
# default config
# Docker СКОПИРОВАЛ из образа в volume
```

**Что произошло:** volume `init-vol` был **пуст** при первом запуске. Docker видит, что в образе в `/data` **есть файлы** (через `VOLUME /data`), и **копирует** их в volume. Если бы volume **не** был пуст — Docker **не** тронул бы его.

**Проверка:** создадим volume, **предварительно** заполнив его:

```bash
docker volume create init-vol2
docker run --rm -v init-vol2:/data alpine sh -c 'echo "my data" > /data/config.txt'
# теперь volume НЕ пуст

docker run --rm -v init-vol2:/data vol-init:1 cat /data/config.txt
# Ожидаемо: my data (а не "default config") — volume не перезаписан
```

**Вывод:** volume **инициализируется** из образа **только если пуст**. Это критично для PostgreSQL, MySQL и т.д. — база **сама** инициализируется при первом старте, **если** volume пуст.

### Часть D — named vs anonymous

```bash
# Named
docker run -d --name n1 -v named-vol:/data alpine sleep 1000

# Anonymous (без имени)
docker run -d --name a1 -v /data alpine sleep 1000

docker volume ls
# Ожидаемо: DRIVER VOLUME NAME
#           local  named-vol
#           local  <hash-1>        ← анонимный (никто не знает его имя)
```

**Проблема:** анонимный volume **невозможно** осмысленно переиспользовать — его имя хэш. Только `docker inspect a1` покажет, какой volume используется.

```txt
"Mounts": [
  {
      "Type": "volume",
      "Name": "fd3d924d9f641f19f3f581aa6ec47ad814cf3fd28764b53118c14cb6949921be",
      "Source": "/var/lib/docker/volumes/fd3d924d9f641f19f3f581aa6ec47ad814cf3fd28764b53118c14cb6949921be/_data",
      "Destination": "/data",
      "Driver": "local",
      "Mode": "",
      "RW": true,
      "Propagation": ""
  }
]
```

**Что записать:**
- named volume **переживает** `docker rm` контейнера;
- **шарится** между контейнерами;
- **инициализируется** из образа, **если пуст** (ключ для баз данных);
- **именуйте** volumes — иначе управлять ими невозможно.

```bash
docker rm -f c2 c3 n1 a1 2>/dev/null
docker volume rm named-vol 2>/dev/null
# anonymous удалится через docker volume prune (осторожно!)
docker run --rm -v init-vol:/data alpine true
docker run --rm -v init-vol2:/data alpine true
docker volume rm init-vol init-vol2 2>/dev/null
# mydata оставим для Lab 6
```

---

## Lab 3. Bind mounts: live-reload, права, read-only — 30 мин

**Цель:** увидеть **прямую** связь с хостом, научиться **не** спотыкаться о права (классическая боль `Permission denied`), и использовать `:ro`.

### Часть A — live-reload

```bash
mkdir -p /tmp/bind-host && cd /tmp/bind-host
echo "v1" > app.txt

docker run -d --name bm -v /tmp/bind-host:/app alpine sh -c 'while true; do cat /app/app.txt; sleep 2; done'

docker logs bm | tail -2
# Ожидаемо: v1

# Меняем файл НА ХОСТЕ
echo "v2" > /tmp/bind-host/app.txt

# Через 2-3 секунды — видим изменение В КОНТЕЙНЕРЕ
sleep 3
docker logs bm | tail -2
# Ожидаемо: v2 — live-reload работает
```

**Вывод:** bind mount — **двусторонняя** связь. Изменения **на хосте** сразу видны **в контейнере** (и наоборот).

### Часть B — `Permission denied` (классика)

```bash
mkdir -p /tmp/bind-perm
sudo chown root:root /tmp/bind-perm
sudo chmod 755 /tmp/bind-perm

docker run --rm -v /tmp/bind-perm:/data alpine sh -c 'echo test > /data/f.txt && cat /data/f.txt'
# Ожидаемо: test

# Имитируем "не-root пользователя" (UID 1000 = типичный appuser)
docker run --rm -u 1000:1000 -v /tmp/bind-perm:/data alpine sh -c 'echo test2 > /data/f2.txt'
# sh: can't create /data/f2.txt: Permission denied
```

**Три способа починить:**

```bash
# Способ 1: chown на хосте под нужного пользователя
sudo chown 1000:1000 /tmp/bind-perm

# Способ 2: запустить контейнер с тем же UID, что владелец
ls -ln /tmp/bind-perm
# drwxr-xr-x 2 1000 1000 ...   ← владелец 1000
docker run --rm -u 1000:1000 -v /tmp/bind-perm:/data alpine sh -c 'echo test2 > /data/f2.txt && echo ok'
# Ожидаемо: ok
```

**Вывод:** bind mount **наследует** права с хоста. Если в контейнере UID **не совпадает** с владельцем на хосте — `Permission denied`. И Named volume **не** решает этих проблем (Docker сам не управляет правами).

### Часть C — read-only bind mount

```bash
mkdir -p /tmp/bind-ro && echo "config v1" > /tmp/bind-ro/app.conf

docker run --rm --mount type=bind,source=/tmp/bind-ro,target=/etc/app,readonly alpine sh -c 'cat /etc/app/app.conf'
# Ожидаемо: config v1 — чтение работает

docker run --rm --mount type=bind,source=/tmp/bind-ro,target=/etc/app,readonly alpine sh -c 'echo "hacked" > /etc/app/app.conf'
# sh: can't create /etc/app/app.conf: Read-only file system

# А без readonly — можно писать
docker run --rm -v /tmp/bind-ro:/etc/app alpine sh -c 'echo "v2" > /etc/app/app.conf'
cat /tmp/bind-ro/app.conf
```

**Зачем `:ro`:** контейнер **не может** изменить конфиг/сертификат на хосте. Обязательно для конфигов, метрик, статических данных.

### Часть D — `-v` создаёт несуществующие пути

```bash
docker run --rm -v /tmp/does-not-exist-xyz:/data alpine sh -c 'echo hi > /data/f.txt'
ls /tmp/does-not-exist-xyz/f.txt
# f.txt 
# Docker СОЗДАЛ каталог на хосте!

# С --mount — упадёт с ошибкой
docker run --rm --mount type=bind,source=/tmp/does-not-exist-abc,target=/data alpine sh -c 'echo hi'
# hi
```

**Вывод:** `-v` **молча создаёт** каталог, если его нет (часто **не то, что хотели**). `--mount` **тоже явно не проверяет**

**Что записать:**
- bind mount — **двусторонняя** live-связь с хостом;
- права **наследуются** — `Permission denied` решается `chown` / `-u` / named volume;
- `:ro` — **обязательно** для конфигов;
- `-v` создаёт несуществующие пути, `--mount` — тоже нет.

```bash
docker rm -f bm 2>/dev/null
sudo chown -R $(id -u):$(id -g) /tmp/bind-perm /tmp/bind-ro /tmp/bind-host 2>/dev/null
rm -rf /tmp/bind-host /tmp/bind-perm /tmp/bind-ro /tmp/vol-init
docker volume rm perm-vol 2>/dev/null
```

---

## Lab 4. tmpfs: только в RAM, OOM, секреты — 20 мин

**Цель:** увидеть, что tmpfs **не переживает** stop/rm, **считается** в memory limit контейнера, и подходит для секретов (файл **не** попадает на диск).

### Часть A — tmpfs исчезает при stop

```bash
docker run -d --name t1 --tmpfs /data:size=10m alpine sh -c 'echo "in ram" > /data/f.txt; sleep 1000'

docker exec t1 cat /data/f.txt
# in ram

# Внутри контейнера — это tmpfs
docker exec t1 df -h /data
# Filesystem                Size      Used Available Use% Mounted on
# tmpfs                    10.0M      4.0K     10.0M   0% /data

# А теперь остановим и запустим новый с тем же --tmpfs
docker rm -f t1
docker run --rm --tmpfs /data:size=10m alpine ls /data
# пусто — данные ИСЧЕЗЛИ
```

**Вывод:** tmpfs **не** переживает **ни** stop, **ни** rm. Данные — **только** в RAM на время жизни контейнера.

### Часть B — tmpfs **считается** в `--memory`

```bash
# Лимит 64 МБ, tmpfs 128 МБ — попробуем записать 100 МБ
docker run --rm --memory=64m --tmpfs /data:size=128m alpine sh -c 'dd if=/dev/zero of=/data/big bs=1M count=100 2>&1 | tail -3; ls -lh /data/'

docker inspect <container> --format 'oom={{.State.OOMKilled}} exit={{.State.ExitCode}}' 2>/dev/null
# oom=false
```

**Точный эксперимент** — сначала `size` больше `--memory`, но запись **меньше** `--memory`:

```bash
docker run --name c2 --memory=64m --tmpfs /data:size=70m alpine sh -c 'dd if=/dev/zero of=/data/big bs=1M count=100 2>&1 | tail -3; ls -lh /data/'

docker inspect c2  --format 'oom={{.State.OOMKilled}} exit={{.State.ExitCode}}' 2>/dev/null
# oom=false exit=0

docker run --name c3 --memory=10m --tmpfs /data:size=70m alpine sh -c 'dd if=/dev/zer
o of=/data/big bs=1M count=100 2>&1 | tail -3; ls -lh /data/'
# oom=true exit=0
# превысили memory
```

**Вывод:** tmpfs **считается** в `--memory`. `size=` ограничивает **размер** tmpfs, но **не** расширяет memory limit. Заполнение свыше `--memory` → **OOM kill**.

### Часть C — секреты в tmpfs

```bash
# Создадим "секрет" на хосте
echo "db-password-xyz" > /tmp/secret.txt

# Запустим контейнер с tmpfs, скопируем туда секрет, "используем" его
docker run -d --name sec --tmpfs /run/secrets:size=1m \
  -v /tmp/secret.txt:/source/secret:ro \
  alpine sh -c 'cp /source/secret /run/secrets/db; cat /run/secrets/db; sleep 1000'

docker logs sec | tail -1
# Ожидаемо: db-password-xyz

# Проверим, что файл /run/secrets/db НЕ на диске хоста
docker inspect sec --format '{{range .Mounts}}{{.Type}} {{.Source}} → {{.Destination}}{{"\n"}}{{end}}'
# bind /tmp/secret.txt → /source/secret
```

**Вывод:** tmpfs **не** оставляет следов на диске. Идеально для секретов в runtime — токенов, расшифрованных ключей, паролей.

**Что записать:**
- tmpfs — только RAM, исчезает при stop/rm;
- tmpfs **считается** в `--memory` → OOM при превышении;
- tmpfs **не** оставляет следов на диске → для секретов;
- `size=` ограничивает tmpfs, **не** расширяет memory limit.

```bash
rm -f /tmp/secret.txt
```

Дополнительно: 

- **Урок 4.5** (дополнительный). Регистри и supply chain: cosign, SBOM, admission control.
- **Урок 4.7** (дополнительный). Docker daemon и ОС: `daemon.json`, `systemd`, `containerd` vs `dockerd`.

---

## Lab 5. PostgreSQL + пустой bind mount = крах — 25 мин

**Цель:** воспроизвести **классическую** ошибку: bind mount на пустую папку → база падает. Понять, **почему** named volume работает, а bind mount — нет.

### Часть A — падение с bind mount

```bash
mkdir -p /tmp/pgdata-bind && cd /tmp/pgdata-bind
ls -la /tmp/pgdata-bind
# Ожидаемо: пусто

docker run -d --name pg-bind -v /tmp/pgdata-bind:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret dockerhub.timeweb.cloud/library/postgres:16-alpine

sleep 3

/tmp/pgdata-bind# ls
# PG_VERSION    pg_dynshmem    pg_multixact  pg_snapshots  pg_tblspc    postgresql.auto.conf
# base          pg_hba.conf    pg_notify     pg_stat       pg_twophase  postgresql.conf
# global        pg_ident.conf  pg_replslot   pg_stat_tmp   pg_wal       postmaster.opts
# pg_commit_ts  pg_logical     pg_serial     pg_subtrans   pg_xact      postmaster.pid
# постргрес прекрасно встал и создал в bind mount свои файлы при старте

docker rm -f pg-bind
```

**Проверка, что в образе есть файлы:**

```bash
docker run --rm dockerhub.timeweb.cloud/library/postgres:16-alpine ls /var/lib/postgresql/data
# при старте там ничего нет сразу же
```

### Часть B — работает с named volume

```bash
docker run -d --name pg-vol -v pgdata:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret dockerhub.timeweb.cloud/library/postgres:16-alpine

docker logs pg-vol 2>&1 | tail -10
# database system is ready to accept connections

docker ps --filter name=pg-vol

docker exec pg-vol psql -U postgres -c 'SELECT version();'
#  PostgreSQL 16.16 on x86_64-pc-linux-musl, compiled by gcc (Alpine 15.2.0) 15.2.0, 64-bit
# (1 row)
```

**Почему:** volume `pgdata` был **пуст**. Docker видит `VOLUME /var/lib/postgresql/data` в образе и **создает** содержимое **в** volume при первом старте. PostgreSQL инициализируется **корректно**.

### Часть C — «а если очень хочется bind mount?»

**Работает, если папка на хосте уже инициализирована или постгрес начинает с нуля** (например, восстановлена из бэкапа, или скопирована из другого работающего PostgreSQL):

```bash
# Инициализируем /tmp/pgdata-bind2 из работающего volume
docker run --rm -v pgdata:/source:ro -v /tmp/pgdata-bind2:/target alpine \
  sh -c 'mkdir -p /target && cp -a /source/. /target/'

# Права должны быть postgres (uid 999 в alpine-образе)
sudo chown -R 999:999 /tmp/pgdata-bind2

# Запускаем
docker run -d --name pg-bind-ok -v /tmp/pgdata-bind2:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret dockerhub.timeweb.cloud/library/postgres:16-alpine

sleep 5
docker logs pg-bind-ok 2>&1 | tail -3
# database system is ready to accept connections
```

**Вывод:** bind mount работает **только** если папка на хосте **уже** содержит корректные данные PostgreSQL либо база начнет с нуля

**Что записать:**

| | **Named volume** | **Bind mount (пустой)** |
|---|---|---|
| Инициализация из образа | ✅ **Автоматически** | База встанет с нуля |
| PostgreSQL стартует | ✅ | ✅, но с нуля |
| Права | Docker управляет | Нужно `chown` вручную |
| Для production | ✅ **Да** | Нет. То что работает с postgres не факт, что будет работать везде |

```bash
docker rm -f pg-vol pg-bind-ok 2>/dev/null
# pgdata оставим для Lab 6/7
rm -rf /tmp/pgdata-bind /tmp/pgdata-bind2
```

---

## Lab 6. Backup/restore volume через `tar` — 30 мин

**Цель:** сделать **настоящий** бэкап volume `pgdata` (или любого) через временный контейнер, восстановить, проверить **checksum**.

### Часть A — подготовка данных

```bash
mkdir -p /tmp/backups && cd /tmp/backups

# Запишем тестовые данные в mydata (из Lab 2)
docker run --rm -v mydata:/data alpine sh -c '
  mkdir -p /data/subdir
  echo "important1" > /data/file1.txt
  echo "important2" > /data/subdir/file2.txt
  dd if=/dev/urandom of=/data/big.bin bs=1M count=10
'

docker run --rm -v mydata:/data alpine sh -c 'find /data -type f | sort; echo "---"; du -sh /data'
# /data/big.bin
# /data/file1.txt
# /data/hi.txt
# /data/log.txt
# /data/shared.txt
# /data/subdir/file2.txt
# ---
# 10.0M   /data
```

### Часть B — backup

```bash
TS=$(date +%Y%m%d-%H%M%S)

docker run --rm \
  -v mydata:/source:ro \
  -v /tmp/backups:/backup \
  alpine tar czf /backup/mydata-$TS.tar.gz -C /source .

# Проверим, что файл есть и его размер
ls -lh /tmp/backups/mydata-$TS.tar.gz
# Ожидаемо: ~10MB (сжатие бинарника почти не даёт выигрыша)

# Контрольная сумма — для проверки целостности
sha256sum /tmp/backups/mydata-$TS.tar.gz > /tmp/backups/mydata-$TS.sha256
cat /tmp/backups/mydata-$TS.sha256

# -rw-r--r-- 1 root root 11M Nov 21 23:54 /tmp/backups/mydata-20261121-235445.tar.gz
# d39ef00bdd38de0badd463f04dc50036057c715b57a31fa02421f2dafa592f49  /tmp/backups/mydata-20261121-235445.tar.gz
```

**Почему `:ro`:** гарантирует, что `tar` **не** изменит данные и **не** будет писать в source.

**Почему `-C /source .`:** архивируем **содержимое** `/source`, а не саму директорию — при restore распакуем в `/target` без лишнего уровня вложенности.

### Часть C — «катастрофа»

```bash
# Эмулируем потерю данных
docker volume rm mydata
# Ожидаемо: OK

docker volume ls | grep mydata
# Ожидаемо: пусто — volume удалён, данные потеряны
```

### Часть D — restore

```bash
docker volume create mydata

TS=$(ls /tmp/backups/mydata-*.tar.gz | tail -1 | sed 's|.*/mydata-||;s|\.tar\.gz||')
echo "restoring: $TS"

# Проверка checksum ПЕРЕД restore
cd /tmp/backups
sha256sum -c mydata-$TS.sha256
# /tmp/backups/mydata-20261121-235445.tar.gz: OK

# Восстановление
docker run --rm \
  -v mydata:/target \
  -v /tmp/backups:/backup:ro \
  alpine tar xzf /backup/mydata-$TS.tar.gz -C /target

# Проверка
docker run --rm -v mydata:/data alpine sh -c 'find /data -type f | sort; echo "---"; du -sh /data; echo "---"; cat /data/file1.txt; cat /data/subdir/file2.txt'
# /data/big.bin
# /data/file1.txt
# /data/hi.txt
# /data/log.txt
# /data/shared.txt
# /data/subdir/file2.txt
# ---
# 10.0M   /data
# ---
# important1
# important2
```

**Вывод:** `tar` через временный контейнер — **универсальный** способ. Работает для **любого** volume, не зависит от ФС, легко автоматизируется. **Главное:** **проверять** restore — бэкап, который не восстанавливали, — это не бэкап.

**Что записать:**
- **backup:** `tar czf` через временный контейнер с `:ro`;
- **checksum** для проверки целостности;
- **restore:** `tar xzf` в новый volume;
- **обязательно** проверять restore — иначе бэкап «мёртвый».

```bash
# Оставим mydata и /tmp/backups для Lab 7
```

---

## Lab 7. PostgreSQL: `pg_dump` vs `tar` работающей БД — 30 мин

**Цель:** увидеть, что файловый `tar` **работающей** БД может быть **неконсистентным** (в теории — воспроизвести надёжно сложно, но покажем разницу подходов), а `pg_dump` — **всегда** консистентен. Плюс — увидеть, что после `pg_dump` база **восстанавливается** даже после «грязного» убийства.

### Часть A — старт PostgreSQL с volume

```bash
docker rm -f pg 2>/dev/null
docker run -d --name pg -v pgdata:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret dockerhub.timeweb.cloud/library/postgres:16-alpine

sleep 5
docker exec pg pg_isready -U postgres
# /run/postgresql:5432 - accepting connections
```

### Часть B — данные + WAL

```bash
docker exec pg psql -U postgres -c '
  CREATE TABLE users (id serial PRIMARY KEY, name text, created_at timestamp default now());
  INSERT INTO users (name) VALUES ($$alice$$), ($$bob$$), ($$charlie$$);
  SELECT * FROM users;
'

# CREATE TABLE
# INSERT 0 3
#  id |  name   |         created_at
# ----+---------+----------------------------
#   1 | alice   | 2026-11-21 21:13:12.772691
#   2 | bob     | 2026-11-21 21:13:12.772691
#   3 | charlie | 2026-11-21 21:13:12.772691
# (3 rows)

# Смотрим, что реально лежит в volume — WAL, база, всё
docker run --rm -v pgdata:/data alpine ls -la /data

# total 136
# drwx------   19 70       70            4096 Nov 21 21:12 .
# drwxr-xr-x    1 root     root          4096 Nov 21 21:13 ..
# -rw-------    1 70       70               3 Nov 21 20:50 PG_VERSION
# drwx------    5 70       70            4096 Nov 21 20:50 base
# drwx------    2 70       70            4096 Nov 21 21:12 global
# drwx------    2 70       70            4096 Nov 21 20:50 pg_commit_ts
# drwx------    2 70       70            4096 Nov 21 20:50 pg_dynshmem
# -rw-------    1 70       70            5743 Nov 21 20:50 pg_hba.conf
# -rw-------    1 70       70            2640 Nov 21 20:50 pg_ident.conf
# drwx------    4 70       70            4096 Nov 21 21:12 pg_logical
# drwx------    4 70       70            4096 Nov 21 20:50 pg_multixact
# drwx------    2 70       70            4096 Nov 21 20:50 pg_notify
# drwx------    2 70       70            4096 Nov 21 20:50 pg_replslot
# drwx------    2 70       70            4096 Nov 21 20:50 pg_serial
# drwx------    2 70       70            4096 Nov 21 20:50 pg_snapshots
# drwx------    2 70       70            4096 Nov 21 20:50 pg_stat
# drwx------    2 70       70            4096 Nov 21 20:50 pg_stat_tmp
# drwx------    2 70       70            4096 Nov 21 20:50 pg_subtrans
# drwx------    2 70       70            4096 Nov 21 20:50 pg_tblspc
# drwx------    2 70       70            4096 Nov 21 20:50 pg_twophase
# drwx------    3 70       70            4096 Nov 21 20:50 pg_wal
# drwx------    2 70       70            4096 Nov 21 20:50 pg_xact
# -rw-------    1 70       70              88 Nov 21 20:50 postgresql.auto.conf
# -rw-------    1 70       70           29925 Nov 21 20:50 postgresql.conf
# -rw-------    1 70       70              24 Nov 21 21:12 postmaster.opts
# -rw-------    1 70       70              90 Nov 21 21:12 postmaster.pid

# WAL — журнал транзакций, может содержать несохранённые данные
docker run --rm -v pgdata:/data alpine ls -la /data/pg_wal/

# total 16396
# drwx------    3 70       70            4096 Nov 21 20:50 .
# drwx------   19 70       70            4096 Nov 21 21:12 ..
# -rw-------    1 70       70        16777216 Nov 21 21:13 000000010000000000000001
# drwx------    2 70       70            4096 Nov 21 20:50 archive_status
```

### Часть C — `pg_dump` (логический бэкап) — **всегда консистентен**

```bash
mkdir -p /tmp/pg-backups

docker exec pg pg_dump -U postgres -Fc > /tmp/pg-backups/pg-$(date +%Y%m%d-%H%M%S).dump

ls -lh /tmp/pg-backups/
# -rw-r--r-- 1 root root 2.9K Nov 22 00:14 pg-20261122-001458.dump
```

**`-Fc`** — custom format, сжатый, восстанавливается через `pg_restore`. **Это правильный способ** для PostgreSQL.

### Часть D — `tar` работающей БД (physical backup) — «на грани»

```bash
TS=$(date +%Y%m%d-%H%M%S)
docker run --rm \
  -v pgdata:/source:ro \
  -v /tmp/pg-backups:/backup \
  alpine tar czf /backup/pg-tar-$TS.tar.gz -C /source .

ls -lh /tmp/pg-backups/pg-tar-*.tar.gz
# -rw-r--r-- 1 root root 4.5M Nov 22 00:15 /tmp/pg-backups/pg-tar-20261122-001535.tar.gz
```

**Проблема:** `tar` **не** делает `pg_start_backup` / `pg_stop_backup` — база **не** знает, что её снимают. В **этот момент** PostgreSQL может писать в файлы → **несогласованность**. Для **маленькой** БД без нагрузки обычно «прокатывает», но:
- **не гарантируется**;
- для больших БД с активной записью — почти наверняка **неконсистентный** tar;
- восстановление **может** потребовать **WAL replay** и **может** упасть.

### Часть E — «катастрофа»

```bash
# Жёсткое убийство — имитация crash
docker kill pg

sleep 2
docker rm -f pg

# PostgreSQL при следующем старте может делать WAL replay — если tar был «грязным»
# Но с pg_dump восстановление ВСЕГДА чистое
```

### Часть F — restore из `pg_dump`

```bash
docker volume rm pgdata
docker volume create pgdata

docker run -d --name pg-restored -v pgdata:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret dockerhub.timeweb.cloud/library/postgres:16-alpine

sleep 5
docker exec pg-restored pg_isready -U postgres
# /run/postgresql:5432 - accepting connections

# Восстановление из dump
DUMP=$(ls /tmp/pg-backups/pg-*.dump | tail -1)
echo "restoring from: $DUMP"
# restoring from: /tmp/pg-backups/pg-20261122-001458.dump

docker exec -i pg-restored pg_restore -U postgres -d postgres --clean --if-exists < "$DUMP"

# Проверка
docker exec pg-restored psql -U postgres -c 'SELECT * FROM users;'
#  id |  name   |         created_at
# ----+---------+----------------------------
#   1 | alice   | 2026-11-21 21:13:12.772691
#   2 | bob     | 2026-11-21 21:13:12.772691
#   3 | charlie | 2026-11-21 21:13:12.772691
# (3 rows)
```

**Что записать:**

| Метод | Плюсы | Минусы | Когда |
|---|---|---|---|
| **`pg_dump`** (логический) | Всегда консистентен, переносим между версиями | Медленный на больших БД, не «полный» | **Всегда** — минимум для прода |
| **`tar` работающей** (physical) | Быстрый | **Не гарантирует** консистентность, может потребовать WAL replay | **Только** если БД остановлена, или через `pg_basebackup` / snapshot ФС |
| **`pg_basebackup`** | Консистентный physical, поддерживает PITR | Сложнее в setup | **Production** physical backup |
| **Snapshot ФС + tar** | Мгновенно, консистентно (если ФС поддерживает) | Нужна поддержка LVM/ZFS/Btrfs | Хороший вариант для прода |

**Главное:** `pg_dump` + проверка restore = **минимум**. Для больших БД — **добавить** `pg_basebackup` или snapshot.

```bash
docker rm -f pg-restored
# pgdata оставим для capstone
```

---

## Lab 8. `docker volume prune` — «тихая» потеря данных — 15 мин

**Цель:** увидеть, что `prune` **удаляет** volume, **не подключённые** ни к одному **запущенному** контейнеру. Это **больно**.

```bash
# Создадим 3 volume
docker volume create keep-data
docker volume create temp-data
docker volume create orphan-data

# В keep-data — "важные" данные
docker run --rm -v keep-data:/data alpine sh -c 'echo "important" > /data/keep.txt'

# temp-data и orphan-data — "мусор" (или забытые)

docker volume ls
# Ожидаемо: keep-data, temp-data, orphan-data.

docker volume prune -f
# Ожидаемо: не удалил контейнеры. Из документации докера: By default, it only removes anonymous volumes (https://docs.docker.com/reference/cli/docker/volume/prune/)

docker volume ls
# Ожидаемо: все три на месте

docker run --rm -v keep-data:/data alpine cat /data/keep.txt 2>/dev/null || echo "volume keep-data не существует"
# important
```

**Как защититься** — **labels** + `--filter`:

```bash
docker volume create --label keep=true critical-data
docker run --rm -v critical-data:/data alpine sh -c 'echo "must not lose" > /data/critical.txt'

docker volume create no-label-vol

# Prune ТОЛЬКО volume без label keep=true
docker volume prune -f --filter 'label!=keep=true'

docker volume ls
# Ожидаемо: critical-data (с label keep=true) ЖИВ, no-label-vol УДАЛЁН
```

**Что записать:**
- **`docker volume prune` удаляет только анонимные контейнеры** — это безопасная операция;
- **никогда** не запускать `prune` на проде без понимания, что будет удалено;

```bash
docker volume rm critical-data temp-data 2>/dev/null
```

---

## 🏁 Капстоун: 3-tier с правильным хранением данных и бэкапом — 45 мин

**Цель:** собрать **frontend → backend → db** с корректным хранением данных, бэкапом и проверкой, что volume переживает контейнер.

### Требования

- **frontend** (nginx) — **stateless**, публикуется на `8080:80`. Конфиг — **bind mount read-only** (`/tmp/nginx.conf:/etc/nginx/conf.d/default.conf:ro`).
- **backend** — **stateless**, внутренний, отвечает на `GET /` текстом. Не публикуется.
- **db** (PostgreSQL) — **named volume** `pgdata-capstone`, **не** публикуется. Пароль — через `--env`.
- Сети — как в Lab 3 урока 3: `front-net` (frontend + backend) и `back-net` (backend + db).
- **backup** — скрипт, который **`pg_dump`** базу в `/tmp/capstone-backups/` с timestamp, и проверяет checksum.
- **restore** — проверить, что бэкап **реально** восстанавливается.

### Шаги (сам, без подсказок)

1. Создай две сети.
2. Запусти `db` с named volume `pgdata-capstone`, паролем, в `back-net`.
3. Создай `nginx.conf` на хосте с `proxy_pass http://backend:80`.
4. Запусти `backend` в обеих сетях с `--network-alias backend`.
5. Запусти `frontend` в `front-net` с `-p 8080:80` и `-v /tmp/nginx.conf:/etc/nginx/conf.d/default.conf:ro`.
6. Проверь:
   - `curl http://localhost:8080` → 200 (frontend → backend);
   - `docker exec frontend ping db` → **не** работает (изоляция);
   - `docker exec backend ping db` → работает.
7. Запиши данные в БД через `psql`.
8. **`docker rm -f db`** → пересоздай с **тем же** volume → данные **на месте**.
9. **`docker rm -f db`** + `docker volume rm pgdata-capstone` → пересоздай → **пустая база** (это ожидаемо).
10. **Восстанови** из бэкапа (`pg_dump`), проверь данные.
11. **Проверь**, что **bind mount** конфига nginx — **read-only**:
    - `docker exec frontend sh -c 'echo x >> /etc/nginx/conf.d/default.conf'` → `read-only file system`.

### Что измерить и записать

| Что | Как проверить | Ожидаемо |
|---|---|---|
| Frontend с хоста | `curl localhost:8080` | 200 |
| Backend **не** доступен с хоста | `curl localhost:80` | connection refused |
| DB **не** доступен с frontend | `docker exec frontend ping db` | bad address |
| DB доступен с backend | `docker exec backend ping db` | 0% loss |
| DB **не** публикуется | `docker port db` | пусто |
| **Volume переживает `docker rm -f db`** | пересоздание с тем же volume | данные на месте |
| Volume **удаляется** через `docker volume rm` | пересоздание | пустая база |
| **Restore из `pg_dump`** | загрузка дампа | данные вернулись |
| Bind mount **read-only** | попытка записи | `read-only file system` |

### «Плохие» варианты, которые нужно уметь объяснить

- **DB с bind mount на пустую папку** — падает (Lab 5A).
- **DB в `front-net`** — frontend видит БД (плохо).
- **Backend с bind mount кода** — в production это плохо (медленно на macOS, права).
- **`docker volume prune` без `--filter`** — «тихо» теряет данные.
- **`pg_dump` без проверки restore** — бэкап «мёртвый».

В журнале — **сравнительная таблица** «плохо vs хорошо» по:
- безопасности данных (volume vs bind);
- переносимости (named volume vs bind);
- бэкапу (`pg_dump` + restore vs tar без проверки).

```bash
docker rm -f frontend backend db 2>/dev/null
docker network rm front-net back-net 2>/dev/null
# pgdata-capstone оставим — это "production data"
# docker volume rm pgdata-capstone
```

---

## 📋 Чек-лист покрытия Урока 4

| Тема | Лаба |
|---|---|
| Writable layer умирает с контейнером | 1A |
| `docker commit` — не бэкап | 1B |
| Named volume: persistence | 2A |
| Named volume: шаринг между контейнерами | 2B |
| Named volume: инициализация из образа | 2C |
| Named vs anonymous volume | 2D |
| Bind mount: live-reload | 3A |
| Bind mount: `Permission denied` и фиксы | 3B |
| Bind mount: `:ro` | 3C |
| `-v` создаёт несуществующие пути, `--mount` — нет | 3D |
| tmpfs: исчезает при stop | 4A |
| tmpfs: считается в `--memory`, OOM | 4B |
| tmpfs: секреты без следов на диске | 4C |
| PostgreSQL: bind mount на пустую → падает | 5A |
| PostgreSQL: named volume → инициализируется | 5B |
| PostgreSQL: bind mount работает, если папка инициализирована | 5C |
| Backup: `tar` через временный контейнер | 6B |
| Backup: checksum | 6B |
| Restore: `tar xzf` в volume | 6D |
| Проверка restore | 6D |
| `pg_dump` — консистентный логический бэкап | 7C |
| `tar` работающей БД — **не** гарантирует консистентность | 7D |
| Restore из `pg_dump` через `pg_restore` | 7F |
| `docker volume prune` удаляет «неподключённые» volumes | 8 |
| Labels + `--filter` для защиты от prune | 8 |
| Капстоун: 3-tier + volume + бэкап + restore | 🏁 |

---

## Что дальше

- **Урок 5 (Безопасность):** capabilities, seccomp, `--read-only`, `USER`, rootless, `--security-opt`.
- **Урок 6 (Ресурсы):** `--memory`, `--cpus`, `--pids-limit`, cgroup v2, OOM.
- **Урок 7 (Compose + CI/CD):** `docker compose`, `buildx bake`, GitHub Actions.
- **Урок 8 (Отладка в проде):** `exec`, `nsenter`, traces, structured logs, `docker events`.