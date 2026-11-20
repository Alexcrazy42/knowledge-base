# Docker — Lab 2 Journal. BuildKit, buildx, multi-arch, cache mounts, .dockerignore, ARG/ENV/secrets

> Продолжение `Lab 1 Journal`. Теория — в `README.md` (Урок 2), здесь — практика.
> Все лабы, где используются пути `/tmp/...` или `dd`, выполняются **в `wsl -d docker-desktop`**.
> В PowerShell работает только `docker ...` и `docker buildx ...` без локальных путей.

**Итого: ~3 часа 45 минут.** Если идёшь за один день — делай перерыв после Lab 2 (multi-arch) и Lab 5 (секреты): там больше всего мелких нюансов.

---

## Lab 0. Проверка окружения и buildx-драйвера — 10 мин

**Цель:** убедиться, что BuildKit активен, а `buildx` умеет `docker-container` драйвер (без него Lab 2 и Lab 6 не пройдут).

**Шаги (PowerShell или WSL):**

```bash
docker version --format '{{.Server.Version}}'
docker buildx version
docker buildx ls
```

**Что увидеть:**

```
NAME/NODE       DRIVER/ENDPOINT             STATUS   BUILDKIT   PLATFORMS
default *       docker
  default       default                     running  v0.12.x    linux/amd64, linux/amd64/v2, ...
```

Если в `PLATFORMS` **нет** `linux/arm64` — это нормально для дефолтного драйвера `docker`. Создаём `docker-container`:

```bash
docker buildx create --name multiarch --driver docker-container --use
docker buildx inspect --bootstrap
```

**Ожидаемый вывод (фрагмент):**
```
Name:          multiarch
Driver:        docker-container
Nodes:
Name:          multiarch0
Endpoint:      unix:///var/run/docker.sock
Status:        running
Buildkit:      v0.12.x
Platforms:     linux/amd64*, linux/amd64/v2, linux/amd64/v3, linux/arm64, linux/riscv64, ...
```

`--bootstrap` поднимает контейнер `buildkitd` и настраивает QEMU (бинари `qemu-*-static` через `binfmt_misc`). Без `--bootstrap` первый multi-arch build сам его поднимет, но лучше сразу.

**Записать:** текущий драйвер, версию BuildKit, список платформ. Если `linux/arm64` нет — Lab 2 не запустится, вернись к `--bootstrap`.

```bash
# Вернуться на дефолтный драйвер, если нужен (не удаляя multiarch)
docker buildx use default
```

---

## Lab 1. BuildKit: `CACHED`, контекст, параллелизм этапов — 25 мин

**Цель:** увидеть три вещи, которых не было в legacy builder: (1) `CACHED` в выводе, (2) инкрементальную передачу контекста, (3) параллельную сборку независимых этапов.

### Часть A — `CACHED` и порядок

```bash
wsl -d docker-desktop
mkdir -p /tmp/buildkit && cd /tmp/buildkit

cat > app.py <<'EOF'
print("hello")
EOF

cat > Dockerfile <<'EOF'
FROM alpine
COPY . .
RUN echo "build step" && sleep 2
CMD ["cat", "/app.py"]
EOF

docker build -t bk:test . --progress=plain 2>&1 | tail -20
```

**Первый прогон — ожидаемо всё `DONE`, без `CACHED`.**

```bash
docker build -t bk:test . --progress=plain 2>&1 | tail -20
```

**Второй прогон — ожидаемо всё `CACHED`:**
```
#7 [2/3] COPY app.py /app.py
#7 CACHED
#8 [3/3] RUN echo "build step" && sleep 2
#8 CACHED
```

**А теперь измени `app.py` и пересобери:**
```bash
echo 'print("hello world")' > app.py
docker build -t bk:test . --progress=plain 2>&1 | tail -20
```

**Ожидаемо:** `COPY` — `DONE` (файл изменился), `RUN` **после** него — `DONE` (каскадная инвалидация, см. урок 1 §1.7). Именно поэтому `RUN` с зависимостями ставят **до** `COPY . .`.

### Часть B — контекст передаётся инкрементально

```bash
dd if=/dev/urandom of=big.bin bs=1M count=200 # создаем файл big.bin большой из специального файла ядра Linux, который выдаёт случайные байты

# Первая сборка — контекст передаётся целиком
docker build -t bk:ctx1 . --progress=plain 2>&1 | grep -i "transferring context"

# Вторая сборка без изменений — контекст НЕ передаётся повторно
docker build -t bk:ctx2 . --progress=plain 2>&1 | grep -i "transferring context"
```

**Ожидаемо:** первая строка содержит `transferring context: 201MB`, вторая — **ничего** (BuildKit кэширует контекст по хэшу). В legacy builder контекст передавался **всегда**, даже на полностью закэшированной сборке.

### Часть C — параллелизм этапов

```bash
cat > Dockerfile.parallel <<'EOF'
FROM alpine AS builder1
RUN echo "building part 1" && sleep 3 && echo "part1" > /out1

FROM alpine AS builder2
RUN echo "building part 2" && sleep 3 && echo "part2" > /out2

FROM alpine
COPY --from=builder1 /out1 /out1
COPY --from=builder2 /out2 /out2
CMD ["sh", "-c", "cat /out1 /out2"]
EOF

time docker build -f Dockerfile.parallel -t bk:parallel . --progress=plain 2>&1 | tail -30
```

**Ожидаемо:** в выводе `builder1` и `builder2` идут **вперемешку** (BuildKit печатает параллельные шаги), а время — **~3 секунды**, а не 6. Это и есть граф зависимостей: `builder1` и `builder2` не зависят друг от друга, финальный этап ждёт **оба**.

```
root@alexcrazy:/tmp/buildkit# time docker build -f Dockerfile.parallel -t bk:parallel . --progress=plain 2>&1 | tail -30

#2 [internal] load metadata for docker.io/library/alpine:latest
#2 DONE 0.0s

#3 [internal] load .dockerignore
#3 transferring context: 2B done
#3 DONE 0.0s

#4 [builder2 1/2] FROM docker.io/library/alpine:latest
#4 CACHED

#5 [builder1 2/2] RUN echo "building part 1" && sleep 3 && echo "part1" > /out1
#5 0.415 building part 1
#5 DONE 3.4s

#6 [builder2 2/2] RUN echo "building part 2" && sleep 3 && echo "part2" > /out2
#6 0.405 building part 2
#6 DONE 3.5s

#7 [stage-2 2/3] COPY --from=builder1 /out1 /out1
#7 DONE 0.1s

#8 [stage-2 3/3] COPY --from=builder2 /out2 /out2
#8 DONE 0.1s

#9 exporting to image
#9 exporting layers 0.1s done
#9 writing image sha256:61e01911591eab7ea2ae6175161d776180c607867a56625f87bfcf82d33acd5f done
#9 naming to docker.io/library/bk:parallel done
#9 DONE 0.1s

real    0m4.783s
user    0m0.254s
sys     0m0.216s
```

**Что записать:**
- порядок `COPY`/`RUN` влияет на каскадную инвалидацию — ровно как в уроке 1;
- контекст передаётся один раз, повторно не шлётся (при неизменном содержимом);
- независимые этапы собираются параллельно: время = **max(длины этапов)**, а не сумма.

```bash
rm -rf /tmp/buildkit
```

---

## Lab 2. buildx + multi-arch: manifest list, `--load` падает, `--push` работает — 35 мин

**Цель:** собрать **один** образ под `amd64` + `arm64`, увидеть manifest list, убедиться, что `--load` для multi-arch **не работает**, а `--push` — работает. Плюс — убедиться, что QEMU-эмуляция **медленнее** нативной сборки.

**Подготовка:** локальный registry (нужен для `--push`, чтобы не гонять в Docker Hub).

```bash
docker run -d -p 5000:5000 --name registry dockerhub.timeweb.cloud/library/registry:2
# localhost:5000 — по умолчанию в insecure-registries Docker Desktop
```

```bash
wsl -d docker-desktop
mkdir -p /tmp/multiarch && cd /tmp/multiarch

cat > Dockerfile <<'EOF'
FROM alpine
RUN echo "arch: $(uname -m)" > /arch.txt
CMD ["cat", "/arch.txt"]
EOF
```

### Часть A — `--load` падает

```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  -t localhost:5000/app:multi --load .
```

**Ожидаемая ошибка:**
```
error: docker exporter does not currently support exporting manifest lists
```

**Почему:** локальное хранилище Docker (overlay2) не умеет хранить **manifest list** — это структура registry, а не одного образа. В локальный Docker можно загрузить **только одну** платформу.

### Часть B — `--push` работает

```bash
time docker buildx build --platform linux/amd64,linux/arm64 \
  -t localhost:5000/app:multi --push .
```

**Ожидаемо:** сборка успешна, `--push` отправил **два** образа + manifest list.

```bash
docker buildx imagetools inspect localhost:5000/app:multi
```

**Ожидаемый вывод (фрагмент):**
```
Name:      localhost:5000/app:multi
MediaType: application/vnd.docker.distribution.manifest.list.v2+json
Digest:    sha256:...
Manifests:
  Name:      localhost:5000/app:multi@sha256:aaa...
  MediaType: application/vnd.docker.distribution.manifest.v2+json
  Platform:  linux/amd64
  Name:      localhost:5000/app:multi@sha256:bbb...
  MediaType: application/vnd.docker.distribution.manifest.v2+json
  Platform:  linux/arm64
```

`MediaType: ...manifest.list.v2+json` — это и есть **manifest list** (index). Один «тег» → два разных образа.

### Часть C — `docker pull` выбирает платформу автоматически

```bash
docker pull --platform linux/arm64 localhost:5000/app:multi
docker run --rm --platform linux/arm64 localhost:5000/app:multi
```

**Ожидаемо:** `arch: aarch64` — образ **arm64**, запущенный на amd64-хосте через **QEMU**. Проверь, что эмуляция работает (не падает с `exec format error`).

```bash
docker pull --platform linux/amd64 localhost:5000/app:multi
docker run --rm --platform linux/amd64 localhost:5000/app:multi
```

**Ожидаемо:** `arch: x86_64` — нативный образ.

### Часть D — QEMU медленнее

```bash
cat > Dockerfile.heavy <<'EOF'
FROM alpine
RUN echo "heavy" && sleep 5
CMD ["sh"]
EOF

# Нативная amd64
time docker buildx build --platform linux/amd64 -f Dockerfile.heavy -t localhost:5000/heavy:amd64 --push .

# Эмулированная arm64
time docker buildx build --platform linux/arm64 -f Dockerfile.heavy -t localhost:5000/heavy:arm64 --push .
```

**Ожидаемо:** `sleep 5` под QEMU идёт **дольше** 5 секунд (обычно 6–10 секунд, зависит от нагрузки). Это не «сон медленнее» — это вся системная нагрузка под эмуляцией. Для тяжёлых сборок (компиляция C++/Rust) разница может быть **10–50x**, и тогда нужны **нативные arm64-раннеры** (GitHub Actions `runs-on: ubuntu-24.04-arm`, AWS Graviton и т.д.).

**Что записать:**
- `--load` для multi-arch **падает** — локальный Docker не хранит manifest list;
- `--push` обязателен для multi-arch;
- `docker pull` выбирает платформу автоматически, по manifest list;
- QEMU-эмуляция работает, но **медленнее** нативной сборки — разница видна на `sleep` и катастрофическая на компиляции.

```bash
docker rm -f registry
rm -rf /tmp/multiarch
```

---

## Lab 3. Cache mounts: ускорение, `sharing=locked` и «почему в CI не работает» — 30 мин

**Цель:** увидеть, что cache mount **переживает** инвалидацию слоя, что `sharing=locked` **спасает** apt от гонок, и что cache mount **не экспортируется** в registry (это важно для понимания CI).

### Часть A — без cache mount (медленно)

```bash
wsl -d docker-desktop
mkdir -p /tmp/cache && cd /tmp/cache

cat > requirements.txt <<'EOF'
numpy==1.26.4
EOF

cat > app.py <<'EOF'
print("hello")
EOF

cat > Dockerfile.nocache <<'EOF'
FROM dockerhub.timeweb.cloud/library/python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .
CMD ["python", "app.py"]
EOF

time docker build -f Dockerfile.nocache -t cache:no . 2>&1 | tail -5
```

**Ожидаемо:** ~30–60 секунд (pip скачивает numpy и зависимости). Запомни время - `1m31.534s`

### Часть B — без cache mount, но с изменением `app.py`

```bash
echo 'print("hello world")' > app.py
time docker build -f Dockerfile.nocache -t cache:no . 2>&1 | tail -5
```

**Ожидаемо:** быстро (~1 сек) — `pip install` **не** пересобирался, т.к. `requirements.txt` не изменился (правильный порядок `COPY` из урока 1). Это **слой-кэш**, он тут работает.

### Часть C — а теперь сломаем слой-кэш

```bash
echo "numpy==1.26.3" > requirements.txt   # понижаем версию — слой инвалидируется
time docker build -f Dockerfile.nocache -t cache:no . 2>&1 | tail -5
```

**Ожидаемо:** ~30–60 секунд **снова**, потому что `RUN pip install` пересобирается целиком. Даже если 99% пакетов те же — pip качает всё заново (нет локального кэша, `--no-cache-dir`).

### Часть D — с cache mount

```bash
cat > Dockerfile.cache <<'EOF'
FROM dockerhub.timeweb.cloud/library/python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt
COPY app.py .
CMD ["python", "app.py"]
EOF

# Первая сборка — заполняет cache mount
time docker build -f Dockerfile.cache -t cache:yes . 2>&1 | tail -5

# "Ломаем" requirements и пересобираем
echo "numpy==1.26.2" > requirements.txt
time docker build -f Dockerfile.cache -t cache:yes . 2>&1 | tail -5
```

**Ожидаемо:** вторая сборка — **мгновенно** (~3–5 сек), потому что pip видит **тот же** `/root/.cache/pip`, пакеты уже скачаны, только версия меняется из локального кэша.

**Сравни:**

| Сценарий | Время |
|---|---|
| Без cache mount, requirements изменился | ~30–60 сек |
| С cache mount, requirements изменился | ~3–5 сек |

### Часть E — `sharing=locked` для apt

```bash
cat > Dockerfile.apt <<'EOF'
FROM dockerhub.timeweb.cloud/library/debian:bookworm-slim
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends curl
CMD ["curl", "--version"]
EOF

# Параллельно: две сборки одновременно
(docker build -f Dockerfile.apt -t apt:locked . > /tmp/apt1.log 2>&1) &
(docker build -f Dockerfile.apt -t apt:locked . > /tmp/apt2.log 2>&1) &
wait
grep -iE 'error|lock' /tmp/apt1.log /tmp/apt2.log | head
```

**Ожидаемо:** **ни одной** строки `error` / `lock`. Второй build **ждал** первый (из-за `sharing=locked`), но оба успешны.

**Контрольный эксперимент — убери `sharing=locked` и повтори:**
```bash
# убери ",sharing=locked" из Dockerfile.apt (или используй sed)
sed 's/,sharing=locked//g' Dockerfile.apt > Dockerfile.apt.shared

(docker build -f Dockerfile.apt.shared -t apt:shared . > /tmp/apt1s.log 2>&1) &
(docker build -f Dockerfile.apt.shared -t apt:shared . > /tmp/apt2s.log 2>&1) &
wait
grep -iE 'error|lock|dpkg' /tmp/apt1s.log /tmp/apt2s.log | head
```

**Ожидаемо:** появляются ошибки вида `dpkg: error: dpkg frontend lock is locked by another process` или `Could not get lock /var/lib/dpkg/lock-frontend`. Это ровно та гонка, которую `sharing=locked` предотвращает.

### Часть F — «почему в CI не работает»

**Что увидеть, что cache mount НЕ экспортируется.** Собери с cache mount и запушь с `--cache-to type=registry`:

```bash
docker buildx build --driver docker-container --builder multiarch \
  -f Dockerfile.cache -t cache:ci . \
  --cache-to type=registry,ref=localhost:5000/cache:buildcache \
  --push 2>&1 | tail -5
```

Затем на **чистом** buildx-инстансе:
```bash
docker buildx create --name clean --driver docker-container --bootstrap
docker buildx use clean
docker buildx build -f Dockerfile.cache -t cache:ci2 . \
  --cache-from type=registry,ref=localhost:5000/cache:buildcache 2>&1 | tail -10
```

**Ожидаемо:** слой `RUN --mount=type=cache` будет **не `CACHED`** (или кэш пуст), потому что cache mount **не** является слоем и **не** экспортируется через `--cache-to`. `--cache-to` ускоряет **пересборку слоёв**, но **не** заполняет cache mounts.

**Проверка:** в логе pip видно `Downloading ...` — значит, `/root/.cache/pip` **пуст** на новом билдере.

**Что записать:**
- cache mount ускоряет **повторные** сборки на **одной машине**;
- `sharing=locked` обязателен для apt/apk, иначе параллельные сборки портят `dpkg`;
- **cache mount не экспортируется** в registry → в CI на чистом раннере он **пуст**;
- `--cache-to` экспортирует **слои**, но не cache mounts.

```bash
docker buildx use multiarch
docker buildx rm clean
rm -rf /tmp/cache
```

---

## Lab 4. `.dockerignore`: контекст и инвалидация — 25 мин

**Цель:** показать **две** проблемы (гигантский контекст + ложная инвалидация) и что `.dockerignore` **не** читает `.gitignore`.

```bash
wsl -d docker-desktop
mkdir -p /tmp/ign && cd /tmp/ign

# "проект": немного кода + гигабайт мусора
mkdir -p node_modules .git
echo "console.log('hi')" > app.js
dd if=/dev/urandom of=node_modules/big1 bs=1M count=150
dd if=/dev/urandom of=.git/objects bs=1M count=50
echo "SECRET=token123" > .env
echo "# readme" > README.md

cat > Dockerfile <<'EOF'
FROM alpine
COPY . .
CMD ["cat", "/app.js"]
EOF
```

### Часть A — без `.dockerignore`

```bash
time docker build -t ign:no . --progress=plain 2>&1 | grep -i "transferring context"
```

**Ожидаемо:** `transferring context: 201MB` (150 + 50 + мелкие файлы). На Docker Desktop это занимает **десятки секунд** при первом билде. Если бы это был реальный проект с `.venv` и `dist/`, было бы гигабайты.

**Проверь, что `.env` реально в образе:**
```bash
docker run --rm ign:no cat /.env
# SECRET=token123
```

Это и есть **утечка**: секреты из `.env` попали в слой.

### Часть B — с `.dockerignore`

```bash
cat > .dockerignore <<'EOF'
.git
node_modules
.env
*.log
EOF

time docker build -t ign:yes . --progress=plain 2>&1 | grep -i "transferring context"
```

**Ожидаемо:** `transferring context: 2.4kB` (только `app.js`, `Dockerfile`, `README.md`). Время — **<1 секунды**.

```bash
docker run --rm ign:yes cat /.env
# cat: can't open '/.env': No such file or directory  ← секрет НЕ в образе
```

### Часть C — `.dockerignore` ≠ `.gitignore`

```bash
# создаём .gitignore, но НЕ .dockerignore, и добавляем ещё мусора
echo "node_modules/" > .gitignore
dd if=/dev/urandom of=node_modules/big2 bs=1M count=100

rm .dockerignore
time docker build -t ign:gitignore . --progress=plain 2>&1 | grep -i "transferring context"
```

**Ожидаемо:** `transferring context: ~301MB` — **`node_modules` снова в контексте**, потому что Docker **не читает `.gitignore`**. Это ключевое заблуждение новичков.

### Часть D — ложная инвалидация кэша

```bash
# Восстанавливаем .dockerignore
cat > .dockerignore <<'EOF'
.git
node_modules
.env
EOF

# Пересобираем — теперь COPY . . инвалидируется только при изменении кода
docker build -t ign:cache . > /dev/null

# Меняем README — это НЕ код, но COPY . . его видит
echo "update readme" > README.md
docker build -t ign:cache . --progress=plain 2>&1 | grep -E "CACHED|DONE" | head -5
```

**Ожидаемо:** `COPY . .` — **`DONE`**, а не `CACHED` (README изменился). Если бы README был в `.dockerignore` — слой остался бы `CACHED`.

**Добавь `README.md` в `.dockerignore` и повтори:** теперь `COPY . .` — `CACHED`.

**Что записать:**
- `.dockerignore` уменьшает **контекст** (201MB → 2.4kB) и **не даёт утечь** `.env`;
- Docker **не** читает `.gitignore` — нужен отдельный `.dockerignore`;
- `.dockerignore` уменьшает **ложные инвалидации** `COPY . .`.

```bash
rm -rf /tmp/ign
```

---

## Lab 5. ARG vs ENV vs secret: что видно в `history` и `inspect` — 25 мин

**Цель:** увидеть, что `ARG` **виден** в `docker history`, `ENV` **виден** в `docker inspect`, а `secret mount` — **нигде**. Это ключевая таблица из §2.6.

```bash
wsl -d docker-desktop
mkdir -p /tmp/secrets && cd /tmp/secrets
echo "supersecret123" > token.txt
echo "dbpass456" > dbpass.txt

cat > Dockerfile.arg <<'EOF'
FROM alpine
ARG DB_PASSWORD=none
RUN echo "using password: ${DB_PASSWORD}" > /app.log
CMD ["cat", "/app.log"]
EOF

cat > Dockerfile.env <<'EOF'
FROM alpine
ENV DB_PASSWORD=none
RUN echo "using password: ${DB_PASSWORD}" > /app.log
CMD ["cat", "/app.log"]
EOF

cat > Dockerfile.secret <<'EOF'
# syntax=dockerhub.timeweb.cloud/docker/dockerfile:1
FROM alpine
RUN --mount=type=secret,id=db_password \
    cat /run/secrets/db_password > /app.log
CMD ["cat", "/app.log"]
EOF
```

### Часть A — `ARG`

```bash
docker build -f Dockerfile.arg --build-arg DB_PASSWORD=dbpass456 -t sec:arg .

# 1. Виден ли пароль в истории?
docker history --no-trunc sec:arg | grep -i "DB_PASSWORD"
# Ожидаемо: ARG DB_PASSWORD=dbpass456  ← ВИДЕН

# 2. Виден ли в inspect?
docker image inspect sec:arg --format '{{json .Config.Env}}'
# Ожидаемо: []  ← пусто (ARG не попадает в runtime)

# 3. Виден ли в самом контейнере?
docker run --rm sec:arg
# Ожидаемо: using password: dbpass456  ← попал в слой через RUN
```

**Вывод:** `ARG` **сам по себе** в runtime не попадает, но **значение, использованное в `RUN`**, оседает в слое — и его видно в `docker run`. Плюс сам `ARG` виден в `docker history`.

### Часть B — `ENV`

```bash
docker build -f Dockerfile.env -t sec:env .

# 1. Виден в inspect?
docker image inspect sec:env --format '{{json .Config.Env}}'
# Ожидаемо: ["DB_PASSWORD=dbpass456","PATH=..."]  ← ВИДЕН

# 2. Виден в history?
docker history --no-trunc sec:env | head -5
# Ожидаемо: ENV DB_PASSWORD=dbpass456  ← ВИДЕН

# 3. Переопределяется при run?
docker run --rm -e DB_PASSWORD=override sec:env
# Ожидаемо: using password: dbpass456  ← нет, потому что значение зашито в слой RUN
```

**Вывод:** `ENV` **навсегда** в образе, виден в `inspect` и `history`. Для секретов — **непригоден**.

### Часть C — `secret mount`

```bash
docker build -f Dockerfile.secret --secret id=db_password,src=./dbpass.txt -t sec:secret .

# 1. Виден в history?
docker history --no-trunc sec:secret | grep -i "dbpass456"
# Ожидаемо: НИЧЕГО

# 2. Виден в inspect?
docker image inspect sec:secret --format '{{json .Config.Env}}'
# Ожидаемо: []  или только PATH

# 3. Виден в контейнере?
docker run --rm sec:secret
# Ожидаемо: dbpass456  ← значение ЕСТЬ в /app.log, потому что мы его явно туда записали
```

**Стоп.** Здесь нюанс: мы **сами** записали секрет в `/app.log` через `cat`. В реальном использовании секрет **не** пишут в файл — передают в инструмент через stdin:

```bash
cat > Dockerfile.secret2 <<'EOF'
# syntax=dockerhub.timeweb.cloud/docker/dockerfile:1
FROM alpine
RUN --mount=type=secret,id=db_password \
    sh -c 'echo "len=$(cat /run/secrets/db_password | wc -c)" > /app.log'
CMD ["cat", "/app.log"]
EOF

docker build -f Dockerfile.secret2 --secret id=db_password,src=./dbpass.txt -t sec:secret2 .
docker history --no-trunc sec:secret2 | grep -iE "dbpass|len="
# Ожидаемо: только "len=10" (длина), самого пароля нет
docker run --rm sec:secret2
# Ожидаемо: len=10
```

**Ключевой вывод:** secret mount **не оставляет следов**, но **если сам Dockerfile записывает секрет в файл — он попадёт в слой**. Секрет нужно **использовать**, а не **сохранять**. То же — для `git clone` и т.п.

**Что записать:**

| | `docker history` | `docker inspect` (`.Config.Env`) | Виден в контейнере |
|---|---|---|---|
| `ARG DB_PASSWORD=...` | **ДА** | нет | только если использован в `RUN` |
| `ENV DB_PASSWORD=...` | **ДА** | **ДА** | **ДА** |
| `--mount=type=secret` | нет | нет | только если сам в `RUN` записал |

**Правило:** если значение видно в `docker history` или `docker inspect` — это **не секрет**. Для секретов — **только** `--mount=type=secret` (и **не** писать его в файлы).

```bash
rm -rf /tmp/secrets
```

---

TODO

## Lab 6. Cache export в registry: что ускоряет, а что нет — 30 мин

**Цель:** увидеть, что `--cache-to type=registry` **ускоряет пересборку слоёв** на чистом раннере, но **не** сохраняет cache mounts (см. Lab 3, часть F). Это критично для CI.

```bash
wsl -d docker-desktop
mkdir -p /tmp/cachex && cd /tmp/cachex

cat > app.py <<'EOF'
print("hi")
EOF

cat > Dockerfile <<'EOF'
FROM alpine
COPY app.py /app.py
RUN echo "expensive step" && sleep 3
CMD ["cat", "/app.py"]
EOF

# Создаём "чистый" buildx-инстанс, чтобы симулировать CI
docker buildx create --name ci-sim --driver docker-container --bootstrap
docker buildx use ci-sim

# Registry для cache
docker run -d -p 5000:5000 --name registry dockerhub.timeweb.cloud/library/registry:2
```

### Часть A — без cache export

```bash
# "Раннер 1"
time docker buildx build --builder ci-sim -t localhost:5000/app:ci --push . 2>&1 | tail -5

# "Раннер 2" (новый buildx-инстанс = чистый кэш)
docker buildx create --name ci-sim2 --driver docker-container --bootstrap
time docker buildx build --builder ci-sim2 -t localhost:5000/app:ci2 --push . 2>&1 | tail -5
```

**Ожидаемо:** обе сборки — **~3+ секунды** (`sleep 3` выполняется каждый раз, кэш пуст на втором инстансе).

### Часть B — с cache export

```bash
# "Раннер 1" с экспортом кэша
time docker buildx build --builder ci-sim \
  -t localhost:5000/app:cache1 \
  --cache-to type=registry,ref=localhost:5000/app:cache,mode=max \
  --push . 2>&1 | tail -5

# "Раннер 2" с импортом
time docker buildx build --builder ci-sim2 \
  -t localhost:5000/app:cache2 \
  --cache-from type=registry,ref=localhost:5000/app:cache \
  --push . 2>&1 | tail -10
```

**Ожидаемо:** вторая сборка — **мгновенно** (~0.5 сек), в выводе видны `CACHED` для `RUN` и `COPY`. `--cache-to mode=max` сохраняет кэш **всех** этапов (включая промежуточные в multi-stage), `mode=min` — только финального.

**Что записать:**
- `--cache-to type=registry` сохраняет **слой-кэш** в registry;
- `--cache-from` восстанавливает его на **чистом** раннере;
- `mode=max` — для multi-stage, `mode=min` — только финал;
- **cache mounts не экспортируются** — Lab 3, часть F, это подтверждает.

```bash
docker buildx use multiarch
docker buildx rm ci-sim ci-sim2
docker rm -f registry
rm -rf /tmp/cachex
```

---

## Lab 7. Антипаттерны: `rm` vs multi-stage, shell form, порядок `COPY` — 25 мин

**Цель:** измерить **три** классических антипаттерна из §2.7 на реальных цифрах.

```bash
wsl -d docker-desktop
mkdir -p /tmp/anti && cd /tmp/anti

# Артефакт "бинарник" 50MB
dd if=/dev/urandom of=big.bin bs=1M count=50
echo 'print("app")' > app.py
```

### Часть A — `RUN rm` не уменьшает образ

```bash
cat > Dockerfile.rm <<'EOF'
FROM alpine
COPY big.bin /big.bin
RUN rm /big.bin
CMD ["sh"]
EOF

cat > Dockerfile.nonrm <<'EOF'
FROM alpine
COPY big.bin /big.bin
CMD ["sh"]
EOF

docker build -f Dockerfile.rm -t anti:rm .
docker build -f Dockerfile.nonrm -t anti:nonrm .

docker image inspect anti:rm --format 'rm     size={{.Size}}'
docker image inspect anti:nonrm --format 'nonrm  size={{.Size}}'
```

**Ожидаемо:** **размеры почти одинаковые** (~50MB) — `rm` **не** уменьшил образ. Файл остался в нижнем слое, `rm` создал **whiteout** (см. урок 1, Lab 7).

```
root@alexcrazy:/tmp/anti# docker image inspect anti:rm --format 'rm     size={{.Size}}'
rm     size=60860259
root@alexcrazy:/tmp/anti# docker image inspect anti:nonrm --format 'nonrm  size={{.Size}}'
nonrm  size=60860259
```

```bash
docker history anti:rm
# Строка rm — SIZE 0B (whiteout), а строка COPY — 50MB
```

### Часть B — multi-stage уменьшает

```bash
cat > Dockerfile.ms <<'EOF'
FROM alpine AS builder
COPY big.bin /big.bin
RUN echo "process" > /out.txt

FROM alpine
COPY --from=builder /out.txt /out.txt
CMD ["cat", "/out.txt"]
EOF

docker build -f Dockerfile.ms -t anti:ms .
docker image inspect anti:ms --format 'ms     size={{.Size}}'

ms     size=8431467
```

**Ожидаемо:** **~5–8MB**, а не 50MB. `big.bin` **не** попал в финальный образ — только `out.txt`.

### Часть C — shell form vs exec form (PID 1)

```bash
cat > Dockerfile.shell <<'EOF'
FROM dockerhub.timeweb.cloud/library/python:3.12-slim
CMD python -c "import time; time.sleep(1000)"
EOF

cat > Dockerfile.exec <<'EOF'
FROM dockerhub.timeweb.cloud/library/python:3.12-slim
CMD ["python", "-c", "import time; time.sleep(1000)"]
EOF

docker build -f Dockerfile.shell -t anti:shell .
docker build -f Dockerfile.exec -t anti:exec .

# Проверяем PID 1
docker run -d --name a-shell anti:shell >/dev/null
docker run -d --name a-exec  anti:exec  >/dev/null
sleep 1

echo "=== shell: PID 1 ==="
docker exec a-shell sh -c 'tr "\0" " " < /proc/1/cmdline; echo'
echo "=== exec: PID 1 ==="
docker exec a-exec sh -c 'tr "\0" " " < /proc/1/cmdline; echo'

# Замер stop
S=$(date +%s%3N); docker stop a-shell >/dev/null; E=$(date +%s%3N)
echo "shell stop: $((E-S)) ms"
S=$(date +%s%3N); docker stop a-exec >/dev/null; E=$(date +%s%3N)
echo "exec  stop: $((E-S)) ms"

docker rm -f a-shell a-exec >/dev/null
```

```
root@alexcrazy:/tmp/anti# docker run -d --name a-shell anti:shell >/dev/null
docker run -d --name a-exec  anti:exec  >/dev/null
sleep 1

echo "=== shell: PID 1 ==="
docker exec a-shell sh -c 'tr "\0" " " < /proc/1/cmdline; echo'
echo "=== exec: PID 1 ==="
docker exec a-exec sh -c 'tr "\0" " " < /proc/1/cmdline; echo'

# Замер stop
S=$(date +%s%3N); docker stop a-shell >/dev/null; E=$(date +%s%3N)
echo "shell stop: $((E-S)) ms"
S=$(date +%s%3N); docker stop a-exec >/dev/null; E=$(date +%s%3N)
echo "exec  stop: $((E-S)) ms"

docker rm -f a-shell a-exec >/dev/null
=== shell: PID 1 ===
/bin/sh -c python -c "import time; time.sleep(1000)"
=== exec: PID 1 ===
python -c import time; time.sleep(1000)
shell stop: 3245 ms
exec  stop: 3219 ms
```

**Ожидаемо:**
- shell: PID 1 — `/bin/sh -c python -c ...` (или `python ...` если dash сделал exec-optimization — см. оговорку в Lab 2 урока 1). `stop` — **10 секунд** (или сколько `--timeout`), `exit=137`.
- exec: PID 1 — `python ...`, без обработчика SIGTERM → тоже **10 секунд**, `exit=137`.

Разница проявится, когда у Python **есть** обработчик (см. урок 1, Lab 2).

### Часть D — порядок `COPY` и инвалидация

```bash
cat > Dockerfile.badorder <<'EOF'
FROM alpine
COPY . .
RUN echo "expensive" && sleep 3
CMD ["sh"]
EOF

cat > Dockerfile.goodorder <<'EOF'
FROM alpine
COPY app.py .
RUN echo "expensive" && sleep 3
CMD ["sh"]
EOF

docker build -f Dockerfile.badorder -t anti:bad . > /dev/null
docker build -f Dockerfile.goodorder -t anti:good . > /dev/null

# Меняем "мусорный" файл, который не влияет на сборку
echo "junk" > junk.txt

time docker build -f Dockerfile.badorder -t anti:bad . 2>&1 | grep -E "CACHED|DONE" | head -5

#1 DONE 0.0s
#2 DONE 0.0s
#3 DONE 0.0s
#4 DONE 0.0s
#5 DONE 0.4s

real    0m5.196s
user    0m0.512s
sys     0m0.641s

time docker build -f Dockerfile.goodorder -t anti:good . 2>&1 | grep -E "CACHED|DONE" | head -5

[+] Building 0.2s (8/8) FINISHED                                                                   docker:default
 => [internal] load build definition from Dockerfile.goodorder                                               0.0s
 => => transferring dockerfile: 116B                                                                         0.0s
 => [internal] load metadata for docker.io/library/alpine:latest                                             0.0s
 => [internal] load .dockerignore                                                                            0.0s
 => => transferring context: 2B                                                                              0.0s
 => [internal] load build context                                                                            0.0s
 => => transferring context: 27B                                                                             0.0s
 => [1/3] FROM docker.io/library/alpine:latest                                                               0.0s
 => CACHED [2/3] COPY app.py .                                                                               0.0s
 => CACHED [3/3] RUN echo "expensive" && sleep 3                                                             0.0s
 => exporting to image                                                                                       0.0s
 => => exporting layers                                                                                      0.0s
 => => writing image sha256:d5fe0c50acb26d69e8c59bb2b689870faa00019e5dde9ff3660670a4fba4e45e                 0.0s
 => => naming to docker.io/library/anti:good                                                                 0.0s

real    0m0.968s
user    0m0.232s
sys     0m0.233s
```

**Ожидаемо:**
- badorder (`COPY . .`): `RUN` — **`DONE`** (пересобирается, 3 сек), потому что `junk.txt` попал в `COPY . .`.
- goodorder (`COPY app.py .`): `RUN` — **`CACHED`** (мгновенно), потому что `app.py` не менялся.

**Что записать:**
- `RUN rm` **не** уменьшает образ — файл остался в нижнем слое (whiteout);
- multi-stage **уменьшает** (50MB → 5MB);
- shell form → PID 1 может быть `sh` → сигналы не доходят до приложения;
- `COPY . .` инвалидирует всё после себя; точечный `COPY` — нет.

```bash
rm -rf /tmp/anti
```

---

## 🏁 Капстоун: собери «правильный» образ с нуля — 45 мин

Сделай **сам**, без подсказок. Цель — применить **все** механики урока 2 в одном Dockerfile.

### Задание

Дан «плохой» Dockerfile:

```dockerfile
FROM python:latest # зафинить base
COPY . . # сначала copy requirements + pip install, после все остноальное
RUN pip install -r requirements.txt
RUN apt-get update
RUN apt-get install -y gcc # объединить все apt-get в одно
RUN pip install numpy pandas # зачем если уже поставили
CMD python app.py # через ENTRYPOINT + tini + healthcheck
```

Требования к «хорошему» образу:

1. **Pinned base** — конкретная версия `python:3.12.3-slim-bookworm` (не `latest`).
2. **`.dockerignore`** — игнорировать `.git`, `node_modules`, `.venv`, `__pycache__`, `.env`, `dist`, `*.log`.
3. **Правильный порядок** — `COPY requirements.txt` → `RUN pip install` → `COPY . .`.
4. **Cache mount для pip** — `--mount=type=cache,target=/root/.cache/pip`.
5. **Один `RUN` для apt** — `apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*`.
6. **Multi-stage** — билд-этап ставит `gcc` и собирает wheel'ы, финальный этап — только `python:3.12.3-slim` + установленные пакеты + код.
7. **Non-root user** — `RUN useradd -m -u 1000 appuser && USER appuser`.
8. **`ENTRYPOINT`/`CMD` в exec form** — `CMD ["python", "app.py"]`.
9. **`--init` при запуске** (или `tini` в `ENTRYPOINT`).
10. **`HEALTHCHECK`** — `CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')"`.
11. **`--memory=256m`** при запуске (это в `docker run`, не в Dockerfile).

### Что измерить и сравнить

```bash
# Размер образа
docker image inspect app:bad  --format 'bad  size={{.Size}}'
docker image inspect app:good --format 'good size={{.Size}}'

# Количество слоёв
docker history app:bad  | wc -l
docker history app:good | wc -l

# Время повторной сборки (при изменении app.py)
time docker build -f Dockerfile.bad  -t app:bad  .
time docker build -f Dockerfile.good -t app:good .

# Время stop
S=$(date +%s%3N); docker stop app-bad  >/dev/null; E=$(date +%s%3N); echo "bad  stop: $((E-S)) ms"
S=$(date +%s%3N); docker stop app-good >/dev/null; E=$(date +%s%3N); echo "good stop: $((E-S)) ms"

# PID 1
docker exec app-bad  sh -c 'tr "\0" " " < /proc/1/cmdline; echo'
docker exec app-good sh -c 'tr "\0" " " < /proc/1/cmdline; echo'

# Non-root
docker exec app-good id
# uid=1000(appuser) ...
```

**Ожидаемые результаты (порядок величин):**

| Метрика | bad | good |
|---|---|---|
| Размер образа | ~1.2–1.5 GB | ~150–200 MB |
| Слоёв | 10+ | 6–8 |
| Повторная сборка (изменён `app.py`) | ~60–120 сек | ~2–5 сек |
| `stop` | ~10 сек (`exit=137`) | <1 сек (`exit=0`) |
| PID 1 | `/bin/sh -c python app.py` | `python app.py` (через `tini`) |
| User | root | `appuser` (uid 1000) |

### Что записать в журнал

Не просто «получилось / не получилось», а **полный путь**:

1. **Что было изначально** (bad Dockerfile, размер, время).
2. **Что менял на каждом шаге** и **как это отражалось** на метриках:
   - добавил `.dockerignore` → контекст `XXX MB → YY kB`;
   - pin base → размер `X → Y`, воспроизводимость;
   - порядок `COPY` → повторная сборка `X сек → Y сек`;
   - cache mount → повторная сборка с изменённым `requirements.txt` `X → Y`;
   - multi-stage → размер `X → Y`;
   - non-root → `id` → `uid=1000`;
   - exec form + tini → `stop` `10 сек → <1 сек`, `exit` `137 → 0`;
   - `HEALTHCHECK` → `docker ps` показывает `(healthy)` / `(unhealthy)`.
3. **Что не сработало и почему** (например, «cache mount не ускорил CI, потому что новый раннер» — если будешь тестировать).
4. **Финальная таблица «было → стало»** по всем метрикам.

Это твой эталонный чек-лист для код-ревью любого Dockerfile в проде.

---

## 📋 Чек-лист покрытия Урока 2

| Тема | Лаба |
|---|---|
| BuildKit активен, драйверы `buildx` | 0 |
| `CACHED` в выводе, каскадная инвалидация | 1A |
| Инкрементальная передача контекста | 1B |
| Параллелизм независимых этапов | 1C |
| `buildx create --driver docker-container` + `--bootstrap` | 0, 2 |
| Multi-arch: `--platform`, manifest list | 2B, 2C |
| `--load` падает для multi-arch | 2A |
| QEMU-эмуляция медленнее нативной | 2D |
| `docker buildx imagetools inspect` | 2B |
| Cache mount: ускорение при инвалидации слоя | 3D |
| `sharing=locked` для apt / гонка `dpkg` | 3E |
| Cache mount **не** экспортируется в registry | 3F, 6 |
| `.dockerignore` уменьшает контекст | 4A, 4B |
| `.dockerignore` ≠ `.gitignore` | 4C |
| `.dockerignore` уменьшает ложную инвалидацию | 4D |
| `ARG` виден в `docker history` | 5A |
| `ENV` виден в `docker inspect` | 5B |
| `secret mount` не оставляет следов | 5C |
| Ловушка: секрет, записанный в файл, попадает в слой | 5C (контрольный) |
| `--cache-to type=registry` + `--cache-from` | 6B |
| `mode=max` vs `mode=min` для multi-stage | 6B |
| `RUN rm` не уменьшает образ (whiteout) | 7A |
| Multi-stage уменьшает образ | 7B |
| Shell form vs exec form: PID 1 и `stop` | 7C |
| `COPY . .` инвалидирует всё после | 7D |
| Капстоун: все механики в одном Dockerfile | 🏁 |

---

## Что дальше

- **Урок 3 (Сети):** `bridge`, `host`, `none`, `overlay`, DNS, port publishing, `network inspect`.
- **Урок 4 (Данные):** volumes, bind mounts, tmpfs, backup/restore, права.
- **Урок 5 (Безопасность):** capabilities, seccomp, rootless, `USER`, `--read-only`, `--security-opt`.
- **Урок 6 (Ресурсы):** `--memory`, `--cpus`, `--pids-limit`, cgroup v2 детали.
- **Урок 7 (Compose + CI/CD):** `docker compose`, `buildx bake`, GitHub Actions + `cache-to/from`.
- **Урок 8 (Отладка в проде):** `exec`, `nsenter`, traces, structured logs.