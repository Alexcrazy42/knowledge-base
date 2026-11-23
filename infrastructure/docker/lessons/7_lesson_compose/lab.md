# Docker — Lab 7 Journal. Compose + прод-паттерны + CI/CD

**Итого: ~3 часа 30 минут.** Если идёшь за один день — делай перерыв после **Lab 3** (bake) и **Lab 5** (cache export): там больше всего мелких нюансов с драйверами buildx.

---

## Lab 0. Окружение: compose v2, buildx, локальный registry — 10 мин

**Цель:** убедиться, что `docker compose` — **v2** (не `docker-compose`), `buildx` с `docker-container` драйвером доступен (нужен для Lab 3, Lab 4, Lab 5), и поднять локальный registry `localhost:5000` (нужен для Lab 4, Lab 5, капстоуна).

**Шаги (PowerShell или WSL):**

```bash
docker compose version
docker buildx version
docker buildx ls
```

**Ожидаемо:**

```
Docker Compose version v2.24.x   ← ОБЯЗАТЕЛЬНО v2, не v1
github.com/docker/buildx v0.12.x

NAME/NODE       DRIVER/ENDPOINT             STATUS   BUILDKIT   PLATFORMS
default *       docker
  default       default                     running  v0.12.x    linux/amd64, ...
```

Если `docker compose version` показывает `docker-compose version 1.x` — **стоп**, это старая версия, лаба не пройдёт. Проверь, что установлен плагин Compose v2 (`docker compose`, **не** `docker-compose`).

Если нет `docker-container` драйвера:

```bash
docker buildx create --name lab7 --driver docker-container --use
docker buildx inspect --bootstrap
```

**Ожидаемо (фрагмент):**

```
Name:          lab7
Driver:        docker-container
Last Activity: 2026-11-23 11:47:07 +0000 UTC

Nodes:
Name:                  lab70
Endpoint:              unix:///var/run/docker.sock
Status:                running
BuildKit daemon flags: --allow-insecure-entitlement=network.host
BuildKit version:      v0.35.1
Platforms:             linux/amd64, linux/amd64/v2, linux/amd64/v3, linux/arm64, linux/riscv64, linux/ppc64le, linux/s390x, linux/386, linux/arm/v7, linux/arm/v6
Labels:
 org.mobyproject.buildkit.worker.executor:         oci
 org.mobyproject.buildkit.worker.hostname:         ac4983afb72e
 org.mobyproject.buildkit.worker.network:          host
 org.mobyproject.buildkit.worker.oci.process-mode: sandbox
 org.mobyproject.buildkit.worker.selinux.enabled:  false
 org.mobyproject.buildkit.worker.snapshotter:      overlayfs
GC Policy rule#0:
 All:            false
 Filters:        type==source.local type==exec.cachemount type==source.git.checkout
 Keep Duration:  48h0m0s
 Max Used Space: 488.3MiB
GC Policy rule#1:
 All:            false
 Keep Duration:  1440h0m0s
 Reserved Space: 9.313GiB
 Max Used Space: 93.13GiB
 Min Free Space: 47.5GiB
GC Policy rule#2:
 All:            false
 Reserved Space: 9.313GiB
 Max Used Space: 93.13GiB
 Min Free Space: 47.5GiB
GC Policy rule#3:
 All:            true
 Reserved Space: 9.313GiB
 Max Used Space: 93.13GiB
 Min Free Space: 47.5GiB
```

Поднимаем локальный registry:

```bash
docker run -d -p 5000:5000 --name registry dockerhub.timeweb.cloud/library/registry:2
```

**Проверка:**

```bash
curl -s http://localhost:5000/v2/_catalog
# {"repositories":[]}
```

**Ожидаемо:** пустой список репозиториев. В Docker Desktop `localhost:5000` уже в `insecure-registries` по умолчанию — трогать `daemon.json` не нужно.

**Проверка валидности compose-файла** (пока пустого — создадим в Lab 1):

```bash
wsl -d docker-desktop
mkdir -p /tmp/lab7 && cd /tmp/lab7
cat > compose.yaml <<'EOF'
services:
  app:
    image: dockerhub.timeweb.cloud/library/nginx:1.25-alpine
EOF
docker compose config >/dev/null && echo "compose config OK"
# compose config OK
docker compose config --services
# app
```

**Что записать:** версию compose (v2.x), версию buildx, наличие `linux/arm64` в `Platforms`, статус registry (`running`).

```bash
# НЕ удаляй registry — он нужен в Lab 4, Lab 5, капстоуне.
rm -rf /tmp/lab7
```

---

## Lab 1. Compose из 3 сервисов: front-net / back-net, healthcheck, depends_on — 35 мин

**Цель:** собрать `frontend` (nginx) + `backend` (nginx) + `db` (postgres), изолировать сети (`front-net`, `back-net`), проверить, что `frontend` **не** видит `db`, а `backend` — видит. Проверить, что `depends_on: condition: service_healthy` ждёт готовности БД, а не просто её запуска.

```bash
wsl -d docker-desktop
mkdir -p /tmp/lab7/lab1 && cd /tmp/lab7/lab1
```

### Часть A — compose.yaml

```bash
cat > compose.yaml <<'EOF'
services:
  frontend:
    image: dockerhub.timeweb.cloud/library/nginx:1.25-alpine
    ports:
      - "8080:80"
    networks:
      - front-net
    depends_on:
      backend:
        condition: service_started

  backend:
    image: dockerhub.timeweb.cloud/library/nginx:1.25-alpine
    expose:
      - "80"
    networks:
      - front-net
      - back-net
    depends_on:
      db:
        condition: service_healthy

  db:
    image: dockerhub.timeweb.cloud/library/postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: example
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - back-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5
      start_period: 15s

networks:
  front-net:
  back-net:

volumes:
  pgdata:
EOF

docker compose config >/dev/null && echo "config OK"
docker compose up -d
```

**Ожидаемо:** Compose скачает `nginx:1.25-alpine` и `postgres:16-alpine` через mirror `dockerhub.timeweb.cloud`, создаст `front-net`, `back-net`, volume `pgdata`, запустит 3 контейнера.

```bash
docker compose ps
```

**Ожидаемо (после ~10–15 сек):**

```
NAME               IMAGE                                  COMMAND                  SERVICE    STATUS
lab1-backend-1     nginx:1.25-alpine                      "/docker-entrypoint.…"   backend    Up
lab1-db-1          postgres:16-alpine                     "docker-entrypoint.s…"   db         Up (healthy)
lab1-frontend-1    nginx:1.25-alpine                      "/docker-entrypoint.…"   frontend   Up
```

Обрати внимание: `db` — `Up (healthy)`, а `backend` стартовал **после** того, как `db` стал `healthy` (это и есть `depends_on: condition: service_healthy`). В `docker compose events` видно порядок (см. часть C).

### Часть B — проверка сетевой изоляции

```bash
# frontend → backend: должно работать (общая front-net)
docker compose exec frontend wget -qO- --timeout=2 http://backend/ | head -3
```

**Ожидаемо:** HTML-страница nginx (`<!DOCTYPE html>...`). `frontend` и `backend` в одной `front-net`, DNS-имя `backend` резолвится.

```bash
# frontend → db: должно УПАСТЬ (frontend не в back-net)
docker compose exec frontend sh -c 'wget -qO- --timeout=2 http://db:5432 2>&1 | head -3'
# wget: bad address 'db:5432'
```

**Ожидаемо:** `wget: bad address 'db'` или `connection refused` / `Network unreachable`. `frontend` **не** в `back-net`, `db` не резолвится. Это **правильная** изоляция.

```bash
# backend → db: должно работать (общая back-net)
docker compose exec backend sh -c 'wget -qO- --timeout=2 http://db:5432 2>&1 | head -3'
```

**Ожидаемо:** `wget` получит ответ (не HTTP, но соединение установится — `connection reset` или `bad gateway` в выводе, но **не** `bad address`). Ключевое: **DNS резолвится**, TCP-коннект проходит.

```bash
# curl с хоста
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080
# 200
```

`ports: "8080:80"` публикует `frontend` на хост. `backend` — только `expose: 80`, с хоста **не** доступен (`curl localhost:80` — fail, если там ничего не слушает; `curl localhost:8080/backend` — тоже fail, nginx не проксирует).

### Часть C — `depends_on` с healthcheck vs без

```bash
# Смотрим статус db до готовности
docker compose down -v
docker compose up -d
sleep 2
docker compose ps
```

**Ожидаемо (сразу после старта, ~2 сек):** `db` — `Up (health: starting)`, `backend` — **`Up`** (потому что `depends_on` ждал **healthy**). Если бы `condition` не было — `backend` стартовал бы **одновременно** с `db` и упал бы (см. Lab 6, часть A — воспроизведём).

**Проверь, что `db` действительно ждёт:**

```bash
# Убиваем db, compose перезапускает её, backend ждёт
docker compose kill db
docker compose ps
```

**Ожидаемо:** `db` перезапускается (`restart` по умолчанию — `no`, но `kill` — не `stop`, контейнер уйдёт в `Exited`, compose **не** поднимет его автоматически без `restart:`; в этом эксперименте просто увидим, что `depends_on` работает только **при старте**, а не «навсегда»).

Восстановим:

```bash
docker compose up -d
docker compose ps
```

**Что записать:**
- `front-net` изолирует `frontend` от `db`;
- `back-net` соединяет `backend` и `db`;
- `depends_on: condition: service_healthy` ждёт `pg_isready`, а не просто `Running`;
- `ports` — публикует на хост, `expose` — только внутри сетей.

```bash
docker compose down -v
rm -rf /tmp/lab7/lab1
```

---

## Lab 2. Profiles, override, `.env` — 25 мин

**Цель:** увидеть, как `profiles` **не запускает** сервис без флага, как `compose.override.yml` **авто-мержится**, как `compose.prod.yml` включается через `-f`, и как `.env` подставляет переменные в YAML.

```bash
wsl -d docker-desktop
mkdir -p /tmp/lab7/lab2 && cd /tmp/lab7/lab2
```

### Часть A — базовый compose + profile

```bash
cat > compose.yaml <<'EOF'
services:
  app:
    image: dockerhub.timeweb.cloud/library/nginx:1.25-alpine
    ports:
      - "8080:80"

  debug-tools:
    image: dockerhub.timeweb.cloud/library/alpine:3.20
    profiles: ["debug"]
    command: ["sleep", "3600"]

  adminer:
    image: dockerhub.timeweb.cloud/library/adminer:4
    profiles: ["debug", "admin"]
    ports:
      - "8081:8080"
EOF

docker compose config --services
# app   ← только app, debug-tools и adminer не активны
```

```bash
docker compose up -d
docker compose ps
# Только app
docker compose --profile debug up -d
docker compose ps
# app + debug-tools + adminer
docker compose --profile admin down
docker compose up -d   # вернулись к app-only
```

**Ожидаемо:** `docker compose config --services` печатает **только** `app` (без профилей). С `--profile debug` — три сервиса. `--profile admin` — два (`app` + `adminer`).

### Часть B — `compose.override.yml` (авто-мерж)

```bash
cat > compose.override.yml <<'EOF'
services:
  app:
    environment:
      DEBUG: "true"
    ports:
      - "8080:80"
      - "9229:9229"
EOF

docker compose config
```

**Ожидаемо:** в выводе `app.environment` содержит `DEBUG: "true"`, `ports` — **два** порта (`8080` и `9229`), потому что список **дополняется** (не заменяется).

```bash
docker compose up -d
docker compose ps
# app — порт 8080 и 9229
```

**Проверь**, что `compose.override.yml` мержится **автоматически**, без флага `-f`:

```bash
docker compose config --services
# app
docker compose ps --format '{{.Names}}\t{{.Ports}}'
# lab2-app-1  0.0.0.0:8080->80/tcp, 0.0.0.0:9229->9229/tcp
```

### Часть C — `compose.prod.yml` (явный `-f`)

```bash
cat > compose.prod.yml <<'EOF'
services:
  app:
    read_only: true
    cap_drop:
      - ALL
    user: "101:101"          # nginx uid/gid из alpine-образа
    restart: unless-stopped
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
EOF

docker compose -f compose.yaml -f compose.prod.yml config
```

**Ожидаемо:** в выводе **нет** `ports: 8080` (потому что `compose.prod.yml` **не** override’ит `ports` — но и не убирает их; чтобы убрать, надо явно `ports: []`). В нашем случае `8080` **остаётся** — это нормально для теста. `read_only: true`, `cap_drop: [ALL]`, `user: "101:101"`, `restart: unless-stopped`, `logging.options` — присутствуют.

**Важно:** `compose.override.yml` **всё равно** мержится, потому что Compose всегда подхватывает `compose.override.yml` **в дополнение** к `-f`-файлам. Чтобы этого избежать — используй `-f compose.yaml -f compose.prod.yml` **без** `override` в директории, либо явно `-f` **все** файлы.

```bash
# Проверим, что read_only работает
docker compose -f compose.yaml -f compose.prod.yml up -d
docker compose -f compose.yaml -f compose.prod.yml exec app sh -c 'touch /test 2>&1'
# (30: Read-only file system)
```

**Ожидаемо:** `Read-only file system`. `read_only: true` работает.

```bash
docker compose -f compose.yaml -f compose.prod.yml exec app id
# uid=101(nginx) gid=101(nginx) ...   ← user: "101:101"
```

### Часть D — `.env` и variable substitution

```bash
cat > .env <<'EOF'
APP_PORT=8090
APP_TAG=1.25-alpine
EOF

cat > compose.yaml <<'EOF'
services:
  app:
    image: dockerhub.timeweb.cloud/library/nginx:${APP_TAG}
    ports:
      - "${APP_PORT}:80"
EOF

rm -f compose.override.yml compose.prod.yml
docker compose config
```

**Ожидаемо:** в выводе `image: ...nginx:1.25-alpine` и `ports: - 8090:80`. Переменные **подставлены** из `.env`.

```bash
docker compose up -d
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8090
# 200
```

**Сравни с переменной окружения shell (приоритет выше `.env`):**

```bash
APP_PORT=8091 docker compose config | grep -A1 'ports'
# - 8091:80
```

**Мнемоника:** `.env` → **variable substitution** в YAML; `env_file:` → переменные **внутрь** контейнера. Не путать.

**Что записать:**
- `profiles` **не** запускает сервис без `--profile`;
- `override` мержится **автоматически**, списки **дополняются**;
- `-f compose.yaml -f compose.prod.yml` — явный prod;
- `.env` — **подстановка** в YAML, не runtime env.

```bash
docker compose down
rm -rf /tmp/lab7/lab2
```

---

## Lab 3. Build и bake: `compose build` vs `buildx bake` — 25 мин

**Цель:** собрать **два** образа через `compose.yaml` (`build:`), затем то же — через `docker-bake.hcl` с общим `base`. Сравнить **время** и **вывод**. Увидеть, что `buildx bake` переиспользует общий слой `base` **гарантированно** (через `inherits`), а `compose build` — только если BuildKit **сам** догадается.

```bash
wsl -d docker-desktop
mkdir -p /tmp/lab7/lab3 && cd /tmp/lab7/lab3
```

### Часть A — `compose.yaml` с `build:`

```bash
cat > Dockerfile <<'EOF'
FROM dockerhub.timeweb.cloud/library/alpine:3.20
ARG BUILD_VERSION=dev
ARG APP_NAME
RUN echo "building ${APP_NAME} version ${BUILD_VERSION}" > /app.txt
CMD ["cat", "/app.txt"]
EOF

cat > compose.yaml <<'EOF'
services:
  app-a:
    build:
      context: .
      args:
        APP_NAME: app-a
        BUILD_VERSION: "1.0.0"
    image: lab7/app-a:1.0.0

  app-b:
    build:
      context: .
      args:
        APP_NAME: app-b
        BUILD_VERSION: "1.0.0"
    image: lab7/app-b:1.0.0
EOF

time docker compose build
# real    0m6.938s
# user    0m0.657s
# sys     0m0.580s
```

**Ожидаемо:** обе сборки **пройдут**, но `RUN` с `echo` будет выполнен **дважды** (разные `APP_NAME` → разные `ARG` → разный слой). `base`-слой (`FROM alpine`) — общий, он `CACHED`.

```bash
docker run --rm lab7/app-a:1.0.0
# building app-a version 1.0.0
docker run --rm lab7/app-b:1.0.0
# building app-b version 1.0.0
```

### Часть B — `docker-bake.hcl` с `inherits`

```bash
cat > docker-bake.hcl <<'EOF'
variable "BUILD_VERSION" {
  default = "1.0.0"
}

group "default" {
  targets = ["app-a", "app-b"]
}

target "base" {
  context    = "."
  dockerfile = "Dockerfile"
  args = {
    BUILD_VERSION = BUILD_VERSION
  }
}

target "app-a" {
  inherits = ["base"]
  args = {
    APP_NAME = "app-a"
  }
  tags = ["lab7/app-a:${BUILD_VERSION}"]
}

target "app-b" {
  inherits = ["base"]
  args = {
    APP_NAME = "app-b"
  }
  tags = ["lab7/app-b:${BUILD_VERSION}"]
}
EOF

docker buildx bake --print
```

**Ожидаемо:** JSON с двумя target’ами (`app-a`, `app-b`), у каждого — `context`, `dockerfile`, `args` (`BUILD_VERSION`, `APP_NAME`), `tags`. `base` **не** собирается сам по себе — он только шаблон.

```bash
# Убеждаемся, что драйвер — docker-container (bake с группами требует его)
docker buildx use lab7

time docker buildx bake
docker run --rm lab7/app-a:1.0.0
# building app-a version 1.0.0
docker run --rm lab7/app-b:1.0.0
# building app-b version 1.0.0
```

**Ожидаемо:** время **меньше**, чем в части A (если кэш не был заполнен — сравни «холодный» запуск: `docker buildx bake --no-cache` vs `docker compose build --no-cache`). На **горячем** кэше разница минимальна — ключевое здесь **декларативность**: в HCL видно `inherits`, в YAML — нет.

### Часть C — переопределение переменной через `--set`

```bash
BUILD_VERSION=2.0.0 docker buildx bake --print | head -20
# в tags: lab7/app-a:2.0.0, lab7/app-b:2.0.0
```

```bash
BUILD_VERSION=2.0.0 docker buildx bake
docker image ls 'lab7/app-*:2.0.0'
```

**Ожидаемо:** два образа с тегом `2.0.0`. Переменная HCL пробросилась в оба target’а **через общий `base`**.

**Что записать:**
- `compose build` собирает сервисы **по очереди**; BuildKit внутри кэширует, но **явного** общего предка нет.
- `buildx bake` с `inherits` делает переиспользование **декларативным**: `base` → `app-a` и `app-b`.
- `docker buildx bake --print` — единственный способ **увидеть**, что реально будет собрано, до запуска.

```bash
rm -rf /tmp/lab7/lab3
```

---

## Lab 4. CI-симуляция: build → scan → push → pull → run — 30 мин

**Цель:** пройти локально **весь** CI-путь: `buildx build` (multi-arch) → `trivy` (или `docker scout`) → `push localhost:5000/app:$GIT_SHA` → `pull` + `run` с **digest**. Убедиться, что **не** используется `latest`.

**Подготовка (PowerShell):**

```powershell
# На Windows — проверь наличие trivy. Если нет — установи:
# winget install aquasecurity.trivy
# или скачай бинарник и добавь в PATH.
trivy --version
```

Если `trivy` недоступен — используем `docker scout` (встроен в Docker Desktop):

```bash
docker scout version
# version: v1.28.0 (go1.26.10-X:jsonv2 - windows/amd64)
# git commit: cfd5fa8a65edd1216b4a46e6797f1831dc40ae73
```

**В WSL:**

```bash
wsl -d docker-desktop
mkdir -p /tmp/lab7/lab4 && cd /tmp/lab7/lab4

cat > Dockerfile <<'EOF'
FROM dockerhub.timeweb.cloud/library/alpine:3.20
RUN echo "hello from CI" > /msg.txt
CMD ["cat", "/msg.txt"]
EOF

export GIT_SHA=$(echo "lab7-$(date +%s)" | sha256sum | cut -c1-12)
echo "GIT_SHA=$GIT_SHA"
# GIT_SHA=60122a4e3c0d
```

### Часть A — build + push с immutable тегом

```bash
docker buildx use lab7

buildkit раньше был встроен в сам докер, но после его начали выносить в отдельный контейнер

Ваш хост (где запущен docker run -d -p 127.0.0.1:5000:5000 registry)
├── registry        → слушает 127.0.0.1:5000 на ХОСТЕ
└── buildkit контейнер   → отдельный контейнер, где идёт сборка
        └── внутри него "127.0.0.1" = ОН САМ, а не хост!
docker buildx по умолчанию использует драйвер docker-container. Это значит, что BuildKit (движок сборки) запускается в отдельном контейнере (сеть bridge по умолчанию). У этого контейнера своя сеть, свой localhost.

buildkit по умолчанию использует сборщик в контейнере в своей bridge сети, поэтому надо указать что мы используем сеть хоста, чтобы впоследствии можно было в регистри пушить:

docker buildx create --name host-builder --driver docker-container --driver-opt network=host --use

time docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t localhost:5000/app:${GIT_SHA} \
  --push .
```

**Ожидаемо:** сборка под **две** платформы, `--push` отправляет manifest list в `localhost:5000`.

```bash
docker buildx imagetools inspect localhost:5000/app:${GIT_SHA} | head -20

# Name:      localhost:5000/app:60122a4e3c0d
# MediaType: application/vnd.oci.image.index.v1+json
# Digest:    sha256:de5e91135ad0193be9c29d0b416c33bb3cdb21705810b3e03efac0b6854a2c54

# Manifests:
#   Name:        localhost:5000/app:60122a4e3c0d@sha256:fe22892ab84a4a0b6670d6bd8a01f9403f5139a06e13e7409bd2f692ead353a4
#   MediaType:   application/vnd.oci.image.manifest.v1+json
#   Platform:    linux/amd64

#   Name:        localhost:5000/app:60122a4e3c0d@sha256:c65a1499b3be07532e10da38663ebc53dc78fb10793b7b35e746900877b03af7
#   MediaType:   application/vnd.oci.image.manifest.v1+json
#   Platform:    linux/arm64

#   Name:        localhost:5000/app:60122a4e3c0d@sha256:7c746807d1dd837c893a37c4d069985ddf4f1deee95a3fde17587d4806811f8e
#   MediaType:   application/vnd.oci.image.manifest.v1+json
#   Platform:    unknown/unknown
#   Annotations:
#     vnd.docker.reference.digest: sha256:fe22892ab84a4a0b6670d6bd8a01f9403f5139a06e13e7409bd2f692ead353a4
#     vnd.docker.reference.type:   attestation-manifest
```

**Ожидаемо:**

```
Name:      localhost:5000/app:lab7-...
MediaType: application/vnd.oci.image.index.v1+json
Manifests:
  Platform:  linux/amd64
  Platform:  linux/arm64
```

### Часть B — scan (trivy или scout)

```bash
# sudo apt-get install wget gnupg
# wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | gpg --dearmor | sudo tee /usr/share/keyrings/trivy.gpg > /dev/null
# echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb generic main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
# sudo apt-get update
# sudo apt-get install trivy

trivy image --severity HIGH,CRITICAL --exit-code 0 localhost:5000/app:${GIT_SHA}

# 2026-11-23T16:15:14+03:00       WARN    Using severities from other vendors for some vulnerabilities. Read https://trivy.dev/docs/v0.76/guide/scanner/vulnerability#severity-selection for details.
# 2026-11-23T16:15:14+03:00       WARN    This OS version is no longer supported by the distribution      family="alpine" version="3.20.10"
# 2026-11-23T16:15:14+03:00       WARN    The vulnerability detection may be insufficient because security updates are not provided

# ┌──────────────────────────────────────────────────┬────────┬─────────────────┬─────────┐
# │                      Target                      │  Type  │ Vulnerabilities │ Secrets │
# ├──────────────────────────────────────────────────┼────────┼─────────────────┼─────────┤
# │ localhost:5000/app:60122a4e3c0d (alpine 3.20.10) │ alpine │        2        │    -    │
# └──────────────────────────────────────────────────┴────────┴─────────────────┴─────────┘


# ┌────────────┬─────────────────┬──────────┬────────┬───────────────────┬───────────────┬──────────────────────────────────────────────────────────────┐
# │  Library   │  Vulnerability  │ Severity │ Status │ Installed Version │ Fixed Version │                            Title                             │
# ├────────────┼─────────────────┼──────────┼────────┼───────────────────┼───────────────┼──────────────────────────────────────────────────────────────┤
# │ musl       │ CVE-2026-107891 │ HIGH     │ fixed  │ 1.2.5-r3          │ 1.2.5-r4      │ musl: musl: Arbitrary code execution via integer overflow in │
# │            │                 │          │        │                   │               │ regcomp                                                      │
# │            │                 │          │        │                   │               │ https://avd.aquasec.com/nvd/cve-2026-107891                  │
# ├────────────┤                 │          │        │                   │               │                                                              │
# │ musl-utils │                 │          │        │                   │               │                                                              │
# │            │                 │          │        │                   │               │                                                              │
# │            │                 │          │        │                   │               │                                                              │
# └────────────┴─────────────────┴──────────┴────────┴───────────────────┴───────────────┴──────────────────────────────────────────────────────────────┘
```

**Ожидаемо:** таблица уязвимостей для `alpine:3.20` — **может быть 0 HIGH/CRITICAL** (alpine минималистичен). Если `--exit-code 1` и найдены HIGH/CRITICAL — команда вернёт **1** (для CI — фейл пайплайна).

```bash
# Вариант 2: docker scout (из PowerShell или WSL, работает через Docker API)
docker scout cves localhost:5000/app:${GIT_SHA} --only-severity critical,high
```

**Ожидаемо:** отчёт с CVE (или пусто, если нет). `docker scout` работает **без** `--push` (сканирует локальный образ), но для multi-arch — только одну платформу.

**Что записать:** сколько HIGH/CRITICAL нашлось; если `0` — это **не значит** «безопасно», это значит «в базовом alpine нет известных HIGH/CRITICAL на дату базы trivy».

### Часть C — `pull` и `run` с **immutable** тегом

```bash
# Имитация "второго места" (другой хост / другой CI-раннер)
docker rmi localhost:5000/app:${GIT_SHA} 2>/dev/null || true

docker pull --platform linux/amd64 localhost:5000/app:${GIT_SHA}
# 60122a4e3c0d: Pulling from app
# 25f1d6b1951a: Already exists
# d0c18f16fe4a: Pull complete
# Digest: sha256:de5e91135ad0193be9c29d0b416c33bb3cdb21705810b3e03efac0b6854a2c54
# Status: Downloaded newer image for localhost:5000/app:60122a4e3c0d
# localhost:5000/app:60122a4e3c0d

docker run --rm --platform linux/amd64 localhost:5000/app:${GIT_SHA}
# hello from CI
```

**Ожидаемо:** `hello from CI`. Образ **тот самый**, что был собран, — не «какой-то latest».

```bash
# Проверь digest — он должен совпадать с тем, что в registry
docker buildx imagetools inspect localhost:5000/app:${GIT_SHA} --format '{{.Manifest.Digest}}' 2>/dev/null \
  || docker buildx imagetools inspect localhost:5000/app:${GIT_SHA} | grep -i digest

# sha256:de5e91135ad0193be9c29d0b416c33bb3cdb21705810b3e03efac0b6854a2c54
```

### Часть D — почему `latest` — плохо

```bash
# Пушим два "релиза" с разным содержимым под ОДНИМ тегом latest
echo "v1" > msg.txt
docker buildx build --platform linux/amd64 -t localhost:5000/app:latest --push .

echo "v2 (изменение!)" > msg.txt
docker buildx build --platform linux/amd64 -t localhost:5000/app:latest --push .

# "Потребитель" тянет latest и НЕ ЗНАЕТ, что получит
docker rmi localhost:5000/app:latest 2>/dev/null || true
docker pull localhost:5000/app:latest
docker run --rm localhost:5000/app:latest
# v2 (изменение!)  ← "latest" — это уже v2, хотя "никто не менял тег"
```

**Вывод:** `latest` — **мутабельный**. `docker pull latest` не говорит, **какой** коммит / **какая** сборка. В проде — только `${GIT_SHA}` или semver.

### Часть E — digest pinning

```bash
DIGEST=$(docker buildx imagetools inspect localhost:5000/app:${GIT_SHA} 2>/dev/null | grep -iE '^Digest:' | awk '{print $2}')
echo "DIGEST=$DIGEST"
# DIGEST=sha256:de5e91135ad0193be9c29d0b416c33bb3cdb21705810b3e03efac0b6854a2c54

docker pull localhost:5000/app@${DIGEST}
docker run --rm localhost:5000/app@${DIGEST}
# hello from CI
```

**Ожидаемо:** работает. Digest **не меняется** никогда — это самый надёжный способ зафиксировать версию.

**Что записать:**
- `buildx build --platform ... --push` — единственный способ получить multi-arch в registry;
- `trivy` / `scout` — scan **до** deploy;
- immutable tag (`${GIT_SHA}`) + digest pinning — единственный production-путь;
- `latest` — **не** использовать.

```bash
rm -rf /tmp/lab7/lab4
```

---

## Lab 5. Cache export в registry: что ускоряет, а что нет — 20 мин

**Цель:** переиспользовать **Lab 6 урока 2** — `--cache-to type=registry` ускоряет **слои** на чистом раннере, но **не** сохраняет `--mount=type=cache`. В этом лабе — быстро воспроизвести и **увидеть**, что compose-сборка **тоже** это умеет через `build.cache_to` (появилось в Compose v2.20+).

```bash
wsl -d docker-desktop
mkdir -p /tmp/lab7/lab5 && cd /tmp/lab7/lab5

cat > Dockerfile <<'EOF'
# syntax=dockerhub.timeweb.cloud/docker/dockerfile:1
FROM dockerhub.timeweb.cloud/library/alpine:3.20
RUN echo "expensive" && sleep 3 && echo "done" > /out.txt
CMD ["cat", "/out.txt"]
EOF
```

### Часть A — без cache export

```bash
docker buildx create --name ci-runner1 --driver docker-container --bootstrap 2>/dev/null || true
docker buildx create --name ci-runner2 --driver docker-container --bootstrap 2>/dev/null || true

# "Раннер 1"
time docker buildx build --builder ci-runner1 -t localhost:5000/lab5:run1 --push .

# "Раннер 2" — чистый кэш
time docker buildx build --builder ci-runner2 -t localhost:5000/lab5:run2 --push .
```

**Ожидаемо:** обе сборки — **~3+ секунды** (`sleep 3` выполняется **каждый раз**, кэш **не** переиспользуется между builder’ами).

### Часть B — с cache export

```bash
# "Раннер 1" — экспорт
time docker buildx build --builder ci-runner1 \
  -t localhost:5000/lab5:cache1 \
  --cache-to type=registry,ref=localhost:5000/lab5:cache,mode=max \
  --push .

# "Раннер 2" — импорт
time docker buildx build --builder ci-runner2 \
  -t localhost:5000/lab5:cache2 \
  --cache-from type=registry,ref=localhost:5000/lab5:cache \
  --push .
```

**Ожидаемо:** вторая сборка — **мгновенно** (~0.5 сек), в выводе `CACHED` для `RUN`. `mode=max` — для multi-stage (экспорт **всех** стадий); `mode=min` — только финальной.

### Часть C — проверить, что cache mount **НЕ** экспортируется

```bash
cat > Dockerfile.cachemount <<'EOF'
# syntax=dockerhub.timeweb.cloud/docker/dockerfile:1
FROM dockerhub.timeweb.cloud/library/alpine:3.20
RUN --mount=type=cache,target=/tmp/pipcache \
    sh -c 'echo "cache dir content:"; ls /tmp/pipcache/ 2>/dev/null | wc -l' > /out.txt
CMD ["cat", "/out.txt"]
EOF

# Раннер 1 — пишет что-то в cache mount
docker buildx build --builder ci-runner1 \
  -f Dockerfile.cachemount \
  -t localhost:5000/lab5:cm1 \
  --cache-to type=registry,ref=localhost:5000/lab5:cm,mode=max \
  --push .

# Раннер 2 — читает: cache mount должен быть ПУСТ
docker buildx build --builder ci-runner2 \
  -f Dockerfile.cachemount \
  -t localhost:5000/lab5:cm2 \
  --cache-from type=registry,ref=localhost:5000/lab5:cm \
  --push . 2>&1 | grep -iE 'CACHED|DONE|cache dir content' | head
```

**Ожидаемо:** на раннере 2 `RUN --mount=type=cache` **не `CACHED`** в части содержимого mount’а (или `CACHED` слой, но **сам mount** пуст). В выводе `ls /tmp/pipcache | wc -l` → `0`. Это подтверждает: `--cache-to` экспортирует **слои**, но **не** содержимое `--mount=type=cache`.

**Что записать:**
- `--cache-to type=registry` **ускоряет** повторную сборку слоёв на чистом раннере;
- `--cache-to` **не** переносит `--mount=type=cache` — в CI cache mount стартует пустым;
- `mode=max` — для multi-stage, `mode=min` — только финал;
- В Compose v2.20+ это же можно задать в `build.cache_to:` / `build.cache_from:` в `compose.yaml` — но синтаксис тот же, что у `buildx`.

```bash
docker buildx use lab7
docker buildx rm ci-runner1 ci-runner2 2>/dev/null || true
rm -rf /tmp/lab7/lab5
```

---

## Lab 6. Антипаттерны: 4 конфига, которые надо сломать и починить — 25 мин

**Цель:** воспроизвести **4** классические ошибки из §7.8 и **увидеть** последствия. Каждую — починить и **объяснить**, что было не так.

```bash
wsl -d docker-desktop
mkdir -p /tmp/lab7/lab6 && cd /tmp/lab7/lab6
```

### Часть A — `depends_on` без `condition: service_healthy` → race

```bash
cat > compose.bad.yaml <<'EOF'
services:
  db:
    image: dockerhub.timeweb.cloud/library/postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: example

  app:
    image: dockerhub.timeweb.cloud/library/alpine:3.20
    command: ["sh", "-c", "until nc -z db 5432; do echo 'waiting...'; sleep 0.2; done; echo READY"]
    depends_on:
      - db
EOF

docker compose -f compose.bad.yaml up -d
docker compose -f compose.bad.yaml logs app | head -10

# app-1  | waiting...
# app-1  | waiting...
# app-1  | waiting...
# app-1  | waiting...
# app-1  | waiting...
# app-1  | waiting...
```

**Ожидаемо:** `app` стартует **сразу** (одновременно с `db`), видит, что `db:5432` **ещё не** принимает соединения, и **крутит** `waiting...` — **или** падает с `nc: bad address` (если DNS ещё не поднялся). Это и есть race: `depends_on` **без** `condition` не ждёт готовности.

```bash
docker compose -f compose.bad.yaml down -v
```

**Фикс:**

```bash
cat > compose.good.yaml <<'EOF'
services:
  db:
    image: dockerhub.timeweb.cloud/library/postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: example
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5
      start_period: 15s

  app:
    image: dockerhub.timeweb.cloud/library/alpine:3.20
    command: ["sh", "-c", "nc -z db 5432 && echo READY || echo FAIL"]
    depends_on:
      db:
        condition: service_healthy
EOF

docker compose -f compose.good.yaml up -d
sleep 2
docker compose -f compose.good.yaml logs app

# app-1  | READY
# Ожидаемо: READY  ← app стартовал ПОСЛЕ того, как db стала healthy
docker compose -f compose.good.yaml down -v
```

**Что записать:** без `condition: service_healthy` — race; с ним — `app` ждёт `pg_isready`.

### Часть B — `restart: always` vs `unless-stopped`

```bash
cat > compose.always.yaml <<'EOF'
services:
  app:
    image: dockerhub.timeweb.cloud/library/alpine:3.20
    command: ["sleep", "3600"]
    restart: always
EOF

docker compose -f compose.always.yaml up -d
sleep 1
docker compose -f compose.always.yaml stop app
sleep 2
docker compose -f compose.always.yaml ps
# app — не работачий. в современном докере при restart=always и stop контейнер не переподнимается по новой
```

**Ожидаемо:** после `docker compose stop` (эквивалент `docker stop`) контейнер — **снова `Up`**, потому что `restart: always` игнорирует **явную** остановку пользователем. Это **антипаттерн**: вы не можете остановить сервис для дебага.

```bash
docker compose -f compose.always.yaml down

cat > compose.unless.yaml <<'EOF'
services:
  app:
    image: dockerhub.timeweb.cloud/library/alpine:3.20
    command: ["sleep", "3600"]
    restart: unless-stopped
EOF

docker compose -f compose.unless.yaml up -d
sleep 1
docker compose -f compose.unless.yaml stop app
sleep 2
docker compose -f compose.unless.yaml ps
# app — Exited (0)  ← unless-stopped уважает явную остановку
```

**Ожидаемо:** `app` — `Exited`. `unless-stopped` **не** перезапускает **явно** остановленный контейнер. **Правильный** выбор для прода.

```bash
docker compose -f compose.unless.yaml down
```

**Что записать:** `restart: always` «не даёт остановить», `unless-stopped` — уважает `docker stop`.

### Часть C — `ports:` для БД → доступна с хоста

```bash
cat > compose.ports.yaml <<'EOF'
services:
  db:
    image: dockerhub.timeweb.cloud/library/postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: example
    ports:
      - "5432:5432"
EOF

docker compose -f compose.ports.yaml up -d
sleep 3
# С хоста (PowerShell) — проверь:
# Test-NetConnection localhost -Port 5432
# или через nc из WSL:
nc -zv localhost 5432 && echo "DB ДОСТУПНА С ХОСТА"
```

**Ожидаемо:** `localhost:5432` открыт. Если хост имеет **публичный IP** и файрвол не закрывает порт — **БД доступна из интернета**. Это **катастрофа**.

```bash
docker compose -f compose.ports.yaml down -v

cat > compose.expose.yaml <<'EOF'
services:
  db:
    image: dockerhub.timeweb.cloud/library/postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: example
    expose:
      - "5432"

  # проверим, что из app до db доходит
  app:
    image: dockerhub.timeweb.cloud/library/alpine:3.20
    command: ["sh", "-c", "nc -zv db 5432 && sleep 3600 || exit 1"]
    depends_on:
      - db
EOF

docker compose -f compose.expose.yaml up -d
sleep 5
docker compose -f compose.expose.yaml logs app
# Ожидаемо: connection to db (172.x.x.x) 5432 port [tcp/postgresql] succeeded!

# А с хоста:
nc -zv localhost 5432 2>&1 | head -1
# nc: connect to localhost (127.0.0.1) port 5432 (tcp) failed: Connection refused  ← с хоста НЕ доступна
docker compose -f compose.expose.yaml down -v
```

**Что записать:** `ports` → публикация на хост (и потенциально в интернет); `expose` → только внутри сетей compose. **Для БД в проде — `expose`, не `ports`.**

### Часть D — секрет в `.env` → виден в `docker inspect`

```bash
cat > compose.secret-in-env.yaml <<'EOF'
services:
  db:
    image: dockerhub.timeweb.cloud/library/postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: supersecret123
EOF

docker compose -f compose.secret-in-env.yaml up -d
docker inspect $(docker compose -f compose.secret-in-env.yaml ps -q db) --format '{{json .Config.Env}}' | tr ',' '\n' | grep POSTGRES_PASSWORD
# "POSTGRES_PASSWORD=supersecret123"  ← пароль в открытом виде
```

**Ожидаемо:** `POSTGRES_PASSWORD=supersecret123` — **виден** любому, у кого есть доступ к Docker API. Плюс если `.env` в git — пароль **навсегда** в истории.

```bash
docker compose -f compose.secret-in-env.yaml down -v
```

**Фикс — `secrets:` (non-Swarm → bind-mount в `/run/secrets/`):**

```bash
echo -n "supersecret123" > db_password.txt

cat > compose.secret.yaml <<'EOF'
services:
  db:
    image: dockerhub.timeweb.cloud/library/postgres:16-alpine
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password

secrets:
  db_password:
    file: ./db_password.txt
EOF

docker compose -f compose.secret.yaml up -d
sleep 3
docker inspect $(docker compose -f compose.secret.yaml ps -q db) --format '{{json .Config.Env}}' | tr ',' '\n' | grep -i password
# ["POSTGRES_PASSWORD_FILE=/run/secrets/db_password"  ← только ПУТЬ, не значение

docker compose -f compose.secret.yaml exec db cat /run/secrets/db_password
# supersecret123  ← значение есть, но через файл
docker compose -f compose.secret.yaml down -v
```

**Ожидаемо:** в `inspect` — **только путь** `/run/secrets/db_password`, **не** значение. В контейнере — значение **есть**, но только по пути `/run/secrets/`.

**Что записать:**

| Антипаттерн | Симптом | Фикс |
|---|---|---|
| `depends_on` без `condition` | race, `connection refused` | `condition: service_healthy` + `healthcheck` |
| `restart: always` | нельзя остановить явно | `restart: unless-stopped` |
| `ports` для db | доступна с хоста | `expose` |
| секрет в `environment` | виден в `docker inspect` | `secrets:` + `_FILE` env |

```bash
rm -rf /tmp/lab7/lab6
```

---

## 🏁 Капстоун. Pipeline «commit → build → scan → push → deploy» — 45 мин

**Цель:** собрать **полный** цикл, применив **все** механики урока 7:

- compose для деплоя;
- `build:` с multi-stage, `ARG`, `--mount=type=cache`;
- `healthcheck` + `depends_on: condition: service_healthy`;
- `read_only: true`, `cap_drop: [ALL]`, `user:`, `init: true`;
- `deploy.resources.limits` (memory, cpus);
- `logging.options` (`max-size`, `max-file`);
- `secrets:`;
- `buildx build --platform ... --cache-to type=registry --cache-from` (из Lab 5);
- scan (trivy или scout);
- immutable tag (`${GIT_SHA}`) + **не** `latest`;
- проверка через `docker events`, `docker logs`, `curl`.

**Сделай сам**, без подсказок. Ниже — только чек-лист требований и что **записать** в журнал.

```bash
wsl -d docker-desktop
mkdir -p /tmp/lab7/capstone && cd /tmp/lab7/capstone
```

### Задание

1. **`Dockerfile`** — production-ready:
   - pinned base (`python:3.12.3-slim-bookworm` или `nginx:1.25-alpine` — на выбор);
   - multi-stage (builder + финал);
   - `.dockerignore` (`.git`, `node_modules`, `.venv`, `.env`, `*.log`);
   - порядок `COPY requirements.txt` → `RUN pip install` → `COPY . .`;
   - `--mount=type=cache,target=/root/.cache/pip`;
   - `USER appuser` (uid 1000);
   - `HEALTHCHECK`;
   - `CMD [...]` в exec form.

2. **`compose.yaml`** — production:
   - сервис `app` с `build:` (multi-stage target);
   - `read_only: true`, `tmpfs: [/tmp]`;
   - `cap_drop: [ALL]`;
   - `init: true`;
   - `deploy.resources.limits` — `memory: 256M`, `cpus: '0.5'`;
   - `logging.options` — `max-size: 10m`, `max-file: 3`;
   - `secrets:` — файл `app_secret.txt` → `/run/secrets/app_secret`;
   - `healthcheck` с `interval: 10s`, `start_period: 5s`;
   - **не** `ports: 8080` для внутренних (только для `app`, если нужно);
   - сервис `db` (postgres) — с `expose: 5432` (не `ports`), `healthcheck`, `depends_on: condition: service_healthy` у `app`.

3. **CI-симуляция** (можно в PowerShell или WSL):
   - `GIT_SHA=$(echo "capstone-$(date +%s)" | sha256sum | cut -c1-12)`;
   - `docker buildx build --platform linux/amd64,linux/arm64 --cache-to type=registry,ref=localhost:5000/capstone:cache,mode=max --cache-from ... -t localhost:5000/capstone:${GIT_SHA} --push .`;
   - scan: `trivy image --severity HIGH,CRITICAL --exit-code 1 localhost:5000/capstone:${GIT_SHA}` (или `docker scout cves`);
   - **если scan упал** — не деплоить, записать в журнал **какие** CVE.

4. **Deploy:**
   - `docker compose up -d`;
   - `docker compose ps` — `db` healthy, `app` healthy (после `start_period`);
   - `curl` с хоста — приложение отвечает (если `ports` опубликован);
   - `docker compose exec app cat /run/secrets/app_secret` — секрет есть;
   - `docker compose exec app id` — `uid=1000(appuser)`.

5. **Observability:**
   - `docker events --filter container=<app> --format '{{.Time}} {{.Action}} {{.Actor.Attributes.name}}'` — увидеть `start`, `health_status: healthy`, `exec_create`, `die` (после `docker compose down`);
   - `docker logs --tail=20 <app>` — структурные логи или просто `healthcheck`-логи;
   - `docker stats --no-stream <app>` — memory, cpu **в пределах** limits.

6. **Failure test:**
   - убери `condition: service_healthy` у `app` → запусти → app падает с `connection refused` (race);
   - верни → работает;
   - `docker compose down && docker compose up -d` — всё восстанавливается;
   - **не** используй `--privileged` / `seccomp=unconfined` — если что-то не работает **без** них, найди **минимальный** capability / seccomp-профиль.

### Что записать в журнал

Не «получилось / не получилось», а **полный путь**:

1. **Dockerfile** — что было, что стало:
   - размер образа (`docker image inspect --format '{{.Size}}'`) — bad vs good;
   - количество слоёв (`docker history | wc -l`) — bad vs good;
   - время повторной сборки при изменении `app.py` — bad vs good;
   - `id` в контейнере — root vs `appuser`.

2. **Compose** — что включено и **зачем**:
   - `read_only` → попробуй `touch /test` — `Read-only file system`;
   - `cap_drop: [ALL]` → `apk add` (для alpine) — `Permission denied` (если от non-root);
   - `init: true` → `docker exec app ps -ef | head` — `tini` как PID 1;
   - `deploy.resources.limits` → `docker stats --no-stream` — не превышает `256M` / `0.5` CPU;
   - `logging.options` → `ls /mnt/docker-desktop-disk/data/docker/containers/<id>/` (в WSL) — видно `*-json.log.1`, `*-json.log.2` после превышения 10MB.

3. **CI-симуляция**:
   - `${GIT_SHA}` — уникальный;
   - scan — **сколько** HIGH/CRITICAL (если `0` — почему: маленький alpine / python-slim);
   - `--cache-to` → **вторая** сборка на «чистом» builder — время `~0.5 сек` vs `~30 сек` без кэша.

4. **Failure test**:
   - **что** сломал (убрал `condition`);
   - **что** увидел (`connection refused` в логах `app`);
   - **как** починил (вернул `condition`);
   - **почему** `read_only` / `cap_drop` **не** ломают приложение (если ломают — что **минимально** разрешил).

5. **Итоговая таблица «было → стало»** по всем метрикам.

Это твой эталонный compose-файл + Dockerfile + CI-шаги для раскатки на 8 продуктовых команд.

---

## 📋 Чек-лист покрытия Урока 7

| Тема | Лаба |
|---|---|
| `docker compose version` — v2 (не v1) | 0 |
| `buildx create --driver docker-container` | 0, 3, 5 |
| Локальный registry `localhost:5000` | 0, 4, 5, капстоун |
| Compose из 3 сервисов (`frontend`, `backend`, `db`) | 1A |
| `front-net` / `back-net` — изоляция | 1B |
| `depends_on: condition: service_healthy` | 1C |
| `healthcheck` (`pg_isready`) | 1A |
| `ports` vs `expose` | 1B, 6C |
| `profiles:` | 2A |
| `compose.override.yml` (авто-мерж) | 2B |
| `compose.prod.yml` (явный `-f`) | 2C |
| `.env` — variable substitution | 2D |
| `build:` в compose (`args`, `target`) | 3A |
| `docker-bake.hcl` + `inherits` | 3B |
| `buildx bake --print` | 3B |
| `buildx bake` с `BUILD_VERSION` override | 3C |
| `buildx build --platform ... --push` (multi-arch) | 4A |
| `trivy` / `docker scout` scan | 4B |
| Immutable tag (`${GIT_SHA}`) | 4A, 4C |
| `latest` — мутабельный (плохо) | 4D |
| Digest pinning | 4E |
| `--cache-to type=registry` (слои) | 5B |
| Cache mount **не** экспортируется | 5C |
| `depends_on` без `condition` → race | 6A |
| `restart: always` vs `unless-stopped` | 6B |
| `ports` для db → доступна с хоста | 6C |
| Секрет в `environment` → `docker inspect` | 6D |
| `secrets:` + `_FILE` env | 6D |
| `read_only`, `cap_drop`, `user`, `init` | капстоун |
| `deploy.resources.limits` | капстоун |
| `logging.options` | капстоун |
| `docker events`, `docker logs`, `docker stats` | капстоун |
| Failure test (вернуть `condition`, проверить) | капстоун |

---

## Что дальше

- **Урок 8 (Отладка в проде):** `exec` vs `nsenter`, `strace` с кастомным seccomp, `tcpdump` / `netshoot`, `docker events` с фильтрами, cgroup v2 (`memory.current`, `memory.events`, `cpu.stat`), «чёрный ящик» и капстоун «сервис не отвечает».