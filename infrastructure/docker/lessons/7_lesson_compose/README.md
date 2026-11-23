# Docker — Урок 7. Compose + прод-паттерны + CI/CD

## 7.1 Compose: зачем и что это

### 7.1.1 Проблема, которую решает Compose

Пять сервисов (frontend, backend, worker, db, cache) — это пять длинных `docker run` с десятками флагов:

```bash
docker network create front-net
docker network create back-net
docker run -d --name db --network back-net -v pgdata:/var/lib/postgresql/data -e POSTGRES_PASSWORD=... postgres:16-alpine
docker run -d --name backend --network back-net --network front-net -e DATABASE_URL=... myapp:1.0.0
# ... и ещё три
```

Проблемы: **не воспроизводится**, **не версионируется**, **забыл флаг — сломалось**, **порядок запуска не гарантирован**. Compose заменяет это **декларативным YAML**: вы описываете **желаемое состояние**, а не последовательность команд.

### 7.1.2 Минимальный `compose.yaml` (frontend + backend + db)

```yaml
services:
  frontend:
    image: nginx:1.25-alpine
    ports:
      - "8080:80"
    networks:
      - front-net
    depends_on:
      backend:
        condition: service_started

  backend:
    image: myapp:1.0.0
    expose:
      - "3000"
    networks:
      - front-net
      - back-net
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - back-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  front-net:
  back-net:

volumes:
  pgdata:
```

**Ключевые блоки верхнего уровня:**

| Блок | Назначение |
|---|---|
| `services` | Контейнеры (образ, порты, сети, тома, healthcheck, ресурсы) |
| `networks` | Изолированные L2-сегменты (DNS между сервисами в одной сети) |
| `volumes` | Именованные постоянные хранилища |
| `configs` | Несекретные конфиги (файл → `/name` в контейнере, режим `0444`) |
| `secrets` | Секреты (файл → `/run/secrets/<name>`) |

**Мнемоника:** `services` — «что запустить», `networks` — «кто кого видит», `volumes` — «что переживёт пересоздание», `configs` — «несекретные файлы», `secrets` — «секретные файлы».

---

## 7.2 Compose v2 vs v1, profiles, override, `.env`

### 7.2.1 `docker compose` (v2) vs `docker-compose` (v1)

| | `docker-compose` (v1) | `docker compose` (v2) |
|---|---|---|
| **Реализация** | Python-скрипт | Go-плагин к Docker CLI |
| **Статус** | Deprecated (EOL с 2023) | **Актуальная версия** |
| **`depends_on: condition`** | Ограниченно (v2.x схемы) | ✅ Полностью |
| **`profiles`** | ❌ (появились в поздних v1) | ✅ |
| **Интеграция с BuildKit** | ❌ | ✅ (`build:` → BuildKit) |

**Правило:** в этом курсе **только `docker compose` (v2)**. `docker-compose` (v1) **не использовать** — синтаксис схемы v3 **не поддерживает** `condition: service_healthy` в том же виде, что v2.

### 7.2.2 `profiles:` — «опциональные» сервисы

`profiles` позволяет **не запускать** сервис по умолчанию, если он не нужен в данном окружении. Сервис **без** `profiles` запускается всегда; сервис **с** `profiles` — только когда профиль активирован.

```yaml
services:
  app:
    image: myapp:1.0.0

  debug-tools:
    image: nicolaka/netshoot
    profiles: ["debug"]
    networks: ["front-net"]

  adminer:
    image: adminer:4
    profiles: ["debug", "admin"]
    ports: ["8081:8080"]
```

```bash
docker compose up -d                        # только app
docker compose --profile debug up -d        # app + debug-tools + adminer
docker compose --profile admin up -d        # app + adminer
```

**Подводный камень:** если сервис с `profiles` **зависит** от сервиса **без** `profiles` — это нормально. Если наоборот — сервис **без** профиля зависит от сервиса **с** профилем, и профиль не активирован — Compose выдаст ошибку о неразрешённой зависимости.

### 7.2.3 `compose.override.yml` — авто-мерж

`docker compose up` **автоматически** читает `compose.yaml` и `compose.override.yml` (если существует) и **мержит** их: `override` **переопределяет** скалярные значения и **дополняет** списки.

```yaml
# compose.override.yml (для локальной разработки — НЕ коммитить в прод-бранч)
services:
  app:
    environment:
      DEBUG: "true"
    volumes:
      - ./src:/app/src   # bind-mount кода для hot-reload
    ports:
      - "9229:9229"      # debug-порт
```

**Правило:** `compose.override.yml` — для **локальной разработки**. В git хранится `compose.override.yml.example`, а реальный — в `.gitignore`.

### 7.2.4 `compose.prod.yml` — явный `-f`

Для прода **не полагайтесь** на авто-мерж `override`. Используйте **явный** prod-файл, который **дополняет** базовый:

```bash
docker compose -f compose.yaml -f compose.prod.yml up -d
```

`compose.prod.yml` содержит **только изменения** относительно базы: убрать `ports:` у внутренних сервисов, включить `read_only: true`, `cap_drop: [ALL]`, `restart: unless-stopped`, `logging.options`.

### 7.2.5 `.env` и `env_file` — **разные** вещи

| | `.env` | `env_file:` |
|---|---|---|
| **Для чего** | **Variable substitution** в самом YAML (`${DB_PASSWORD}`) | Передача переменных **в контейнер** |
| **Где читается** | Docker Compose CLI (на хосте) | Docker Engine (в контейнере) |
| **Формат** | `KEY=VALUE` | `KEY=VALUE` |
| **Приоритет** | Меньше, чем `--env` / shell | Меньше, чем `environment:` в YAML |

```yaml
services:
  app:
    image: myapp:${APP_VERSION:-1.0.0}   # ← подстановка из .env / shell
    env_file:
      - .env.app                          # ← переменные ВНУТРЬ контейнера
    environment:
      DATABASE_URL: postgresql://db:5432/app   # ← переопределяет env_file
```

**Антипаттерн:** хранить **секреты** в `.env` в git. `.env` — для **несекретных** значений по умолчанию. Секреты — через `secrets:` (см. 7.4.7).

### 7.2.6 `extends:` — переиспользование сервиса

`extends` позволяет **наследовать** определение сервиса от другого сервиса (в том же файле или в другом).

```yaml
# base.yaml
services:
  base-app:
    image: myapp:1.0.0
    networks: [back-net]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
```

```yaml
# compose.yaml
services:
  api:
    extends:
      file: base.yaml
      service: base-app
    environment:
      ROLE: api

  worker:
    extends:
      file: base.yaml
      service: base-app
    environment:
      ROLE: worker
```

**Ограничение:** `extends` **не** мержит `profiles` — если базовый сервис имеет `profiles`, они **не** наследуются автоматически. Для профилей используйте **override-файлы** или явные `profiles` в каждом сервисе.

---

## 7.3 Compose в production: что можно, что нельзя

### 7.3.1 Честная таблица

| Задача | Compose (single-host) | Kubernetes | Другое |
|---|---|---|---|
| **Локальная разработка** | ✅ Лучший выбор | ❌ Overkill | — |
| **CI / тесты** | ✅ (`docker compose up` в CI) | ❌ | Testcontainers |
| **Single-host small prod** | ✅ **Можно** — если закрыть operational gaps | Возможно, но дороже | systemd + Compose |
| **Multi-host / кластер** | ❌ **Нельзя** | ✅ | Nomad, ECS |
| **Rolling updates / zero-downtime** | ❌ (только `docker compose up --no-deps -d`) | ✅ | — |
| **Self-healing (перезапуск на другом узле)** | ❌ | ✅ | — |
| **RBAC, namespaces, quotas** | ❌ | ✅ | — |
| **Auto-scaling** | ❌ | ✅ (HPA) | — |

**Мнемоника:** *Compose — «docker run, который не забыл флаги». Это **не** оркестратор. Он не умеет multi-host, self-healing и rolling updates — и **не должен**.*

### 7.3.2 Что значит «закрыть operational gaps» для single-host prod

Если вы всё же используете Compose в проде на одном сервере, вы **обязаны** добавить то, что K8s даёт «из коробки»:

1. **`restart: unless-stopped`** — не `always` (см. 7.4.2 и 7.8.2).
2. **`healthcheck` + `depends_on: condition: service_healthy`** — иначе race при старте.
3. **`logging.options` с `max-size` / `max-file`** — иначе диск закончится (см. Урок 8, Lab 1).
4. **`deploy.resources.limits`** — иначе один контейнер съест всю память хоста.
5. **`read_only: true`, `cap_drop: [ALL]`, `user:`** — базовая безопасность (см. Урок 5).
6. **`secrets:`** — не `.env` с паролями в git.
7. **Мониторинг** (`docker events`, `docker stats`, внешний Prometheus / node_exporter).
8. **Бэкап named volumes** (см. Урок 4).

Без этих восьми пунктов Compose в проде — это **не прод**, а «работает на моей машине, но на сервере».

---

## 7.4 Прод-паттерны в compose

### 7.4.1 `healthcheck` + `depends_on: condition: service_healthy`

`depends_on` **без** `condition` ждёт только **запуска** контейнера, но **не готовности** приложения. `condition: service_healthy` ждёт, пока `healthcheck` не станет `healthy`.

```yaml
services:
  db:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s   # ← дать время на initdb

  backend:
    image: myapp:1.0.0
    depends_on:
      db:
        condition: service_healthy
        restart: true   # ← перезапустить backend, если db перезапущен
```

**Подводный камень:** `service_healthy` **требует** наличия `healthcheck` у зависимости. Если `healthcheck` нет — Compose **упадёт** с ошибкой о том, что зависимость не имеет healthcheck.

**Healthcheck должен проверять готовность, а не существование процесса.** `pg_isready` — готовность; `test -f /var/run/postgresql/.s.PGSQL.5432` — существование файла, который может быть создан до готовности принимать соединения.

### 7.4.2 `restart: unless-stopped` (не `always`)

| Политика | Поведение | Проблема |
|---|---|---|
| `no` (default) | Не перезапускать | — |
| `on-failure` | Перезапускать только при exit code ≠ 0 | Не перезапустит при OOM-kill? (OOM → 137 → перезапустит) |
| `always` | **Всегда** перезапускать, даже если остановлен вручную | **Не переживает `systemctl stop docker`**: при остановке демона контейнеры останавливаются, а при старте демона `always` пытается их поднять — но если демон **не** перезапускает их автоматически (зависит от версии), контейнер остаётся в `Exited` |
| **`unless-stopped`** | Перезапускать **всегда**, **кроме** случая, когда контейнер был **явно остановлен** (`docker stop`) | ✅ **Рекомендуется** |

**Мнемоника:** `always` — «перезапускай, что бы ни случилось», `unless-stopped` — «перезапускай, пока я сам не сказал "стоп"».

### 7.4.3 `init: true` (tini)

Если приложение **не** умеет быть PID 1 (не жнёт зомби, не форвардит сигналы — см. Урок 1, Lab 2), включите `init: true`:

```yaml
services:
  app:
    image: myapp:1.0.0
    init: true   # Docker подставит tini как PID 1
```

Эквивалент `docker run --init`. `tini` — минимальный init, который форвардит сигналы дочернему процессу и **реапит** зомби.

### 7.4.4 `user:` — non-root

```yaml
services:
  app:
    image: myapp:1.0.0
    user: "1000:1000"   # UID:GID
```

Это **переопределяет** `USER` из Dockerfile. Если в образе **нет** пользователя с UID 1000 — приложение не сможет писать в файлы, принадлежащие root. **Лучше** задавать `USER` в Dockerfile (см. Урок 5), а `user:` в compose — как **второй слой** защиты (defense in depth).

### 7.4.5 `read_only: true` + `tmpfs`

```yaml
services:
  app:
    image: myapp:1.0.0
    read_only: true
    tmpfs:
      - /tmp
      - /run
```

`read_only: true` делает корневую файловую систему **только для чтения**. Приложение, которому нужно писать в `/tmp` — получает `tmpfs`. Это **сильно** снижает поверхность атаки: злоумышленник не может записать бинарник в writable layer.

**Подводный камень:** многие приложения **падают** с `read_only: true`, если пытаются писать в `/var/cache`, `/var/run` или `/app/logs`. Решение — `tmpfs` или named volume для конкретных путей.

### 7.4.6 `cap_drop: [ALL]` + `cap_add: [...]`

```yaml
services:
  app:
    image: myapp:1.0.0
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE   # если нужно слушать порт < 1024
```

**Правило:** всегда `cap_drop: [ALL]`, затем **точечно** `cap_add` только те capabilities, которые **действительно** нужны. `--privileged` — **антипаттерн** (см. Урок 5).

### 7.4.7 `secrets:` — файл → `/run/secrets/<name>`

В **non-Swarm** Compose `secrets` — это **bind-mount** файла с хоста в `/run/secrets/<name>` **с режимом `0444`** (read-only). **Не** шифрование, **не** tmpfs — просто монтирование.

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

В контейнере: `cat /run/secrets/db_password`. **Не** виден в `docker inspect` (в отличие от `environment`) и **не** попадает в `docker history`.

**Подводный камень:** файл секрета должен существовать **на хосте** до `docker compose up`. В CI — создаётся из CI-секрета перед запуском.

### 7.4.8 `deploy.resources.limits` — memory и cpus

```yaml
services:
  app:
    image: myapp:1.0.0
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

В **non-Swarm** Compose `deploy.resources.limits` **работает** (Docker Compose v2 транслирует в `--memory` / `--cpus`). Это **не** «только для Swarm», как иногда пишут.

**Что произойдёт при OOM:** контейнер получит `SIGKILL` (exit code **137**), `docker inspect` покажет `OOMKilled: true`. Событие `docker events --filter event=oom` (см. Урок 8, Lab 2).

### 7.4.9 `logging.options` — ротация логов

По умолчанию `json-file` **растёт без ограничений**. В проде **обязательно**:

```yaml
services:
  app:
    image: myapp:1.0.0
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

Это ограничивает **размер одного файла** (10 MB) и **количество файлов** (3). Старые ротируются автоматически. Альтернативы: `journald` (в `daemon.json`), `fluentd`, `gelf`, `awslogs`.

---

## 7.5 Сборка в compose и bake

### 7.5.1 `build:` в compose

```yaml
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
      target: production        # ← multi-stage target
      args:
        NODE_VERSION: "20"
        BUILD_VERSION: "${GIT_SHA:-dev}"
    image: myregistry.local/backend:${GIT_SHA:-dev}
```

`docker compose build backend` — собирает образ для сервиса `backend`. `docker compose up --build` — собирает **все** сервисы с `build:` и запускает.

**Важно:** `args` в compose — это **build args** (`ARG`), **не** runtime env (`ENV`). Для секретов в сборке — **не** `args`, а `secrets` в `build:` (см. Урок 2, 2.6.4).

### 7.5.2 `docker buildx bake` — декларативная сборка нескольких сервисов

`docker buildx bake` читает **`compose.yaml`** (или `docker-bake.hcl`) и собирает **все** target’ы **параллельно с общим кэшем**. Это **быстрее**, чем последовательный `docker compose build`, потому что BuildKit видит граф зависимостей между образами и переиспользует общие слои.

```bash
docker buildx bake --print          # показать, что будет собрано (JSON)
docker buildx bake                  # собрать всё
docker buildx bake --push           # собрать и запушить
```

**Порядок поиска файла:** `compose.yaml` → `compose.yml` → `docker-compose.yml` → `docker-compose.yaml` → `docker-bake.json` → `docker-bake.hcl`.

### 7.5.3 `docker-bake.hcl` — предпочтительный формат для сложных сборок

HCL **выразительнее** YAML для описания нескольких target’ов, переменных и групп.

```hcl
variable "GIT_SHA" {
  default = "dev"
}

group "default" {
  targets = ["backend", "frontend"]
}

target "base" {
  context    = "."
  dockerfile = "Dockerfile"
  args = {
    BUILD_VERSION = GIT_SHA
  }
}

target "backend" {
  inherits = ["base"]
  target   = "production"
  tags     = ["myregistry.local/backend:${GIT_SHA}"]
}

target "frontend" {
  inherits = ["base"]
  target   = "production"
  tags     = ["myregistry.local/frontend:${GIT_SHA}"]
}
```

`inherits` — ключевая возможность HCL: `backend` и `frontend` **наследуют** общий `base`, но переопределяют `target` и `tags`.

### 7.5.4 `compose build` vs `buildx bake` — когда что

| | `docker compose build` | `docker buildx bake` |
|---|---|---|
| **Читает** | `compose.yaml` | `compose.yaml` / `docker-bake.hcl` |
| **Параллельность** | ✅ (BuildKit внутри) | ✅ **Лучше** — видит граф между сервисами |
| **Общий кэш** | Ограниченно | ✅ Явно (через `inherits` / общий `base`) |
| **`--print`** | ❌ | ✅ |
| **Группы / переменные** | ❌ | ✅ (HCL) |
| **Когда** | Простые проекты | Монорепо, несколько образов с общим базовым слоем |

---

## 7.6 CI/CD: build → scan → push → deploy

### 7.6.1 Стадии

```
git push → [build] → [scan] → [push] → [deploy] → [verify]
              │         │         │          │
              │         │         │          └─ docker compose up -d / kubectl apply
              │         │         └─ docker push registry/app:${GIT_SHA}
              │         └─ trivy image / docker scout cves
              └─ docker buildx build --cache-from ...
```

### 7.6.2 Теги: `git sha` — **основной**, `latest` — **плохо**

| Тег | Плюсы | Минусы |
|---|---|---|
| **`${GIT_SHA}`** | Уникальный, воспроизводимый, трассируется до коммита | Длинный |
| **Semver (`1.2.3`)** | Понятный, для релизов | Нужно управлять вручную |
| **`latest`** | Удобно «для быстрого старта» | **Непредсказуемо**: какой коммит? какая сборка? При `docker pull latest` — **неизвестно, что получишь** |

**Правило:** в проде — **никогда `latest`**. Минимум — **immutable tag** (`git sha` или semver). Максимум — **digest pinning**:

```yaml
services:
  db:
    image: postgres@sha256:abc123...   # ← точный digest
```

Digest **никогда** не меняется. Тег можно перезаписать; digest — нет.

### 7.6.3 Cache export / import в registry

Переиспользуем **Урок 2, Lab 6** (cache export):

```bash
docker buildx build \
  --cache-to type=registry,ref=registry.local/app:cache,mode=max \
  --cache-from type=registry,ref=registry.local/app:cache \
  -t registry.local/app:${GIT_SHA} \
  --push .
```

`mode=max` экспортирует кэш **всех** стадий (не только финальной), что критично для multi-stage. `--cache-from` **импортирует** кэш с **предыдущей** сборки — даже если она была на **другом** раннере.

**Важно:** cache mount (`RUN --mount=type=cache`) **не экспортируется** в registry (Урок 2, 2.4.3). `--cache-to type=registry` ускоряет **слои**, но не `apt`/`npm` cache mounts на **чистом** CI-раннере.

### 7.6.4 Scan: `trivy` или `docker scout`

```bash
# Trivy
trivy image --severity HIGH,CRITICAL --exit-code 1 registry.local/app:${GIT_SHA}

# Docker Scout (встроен в Docker Desktop)
docker scout cves registry.local/app:${GIT_SHA}
```

**Правило:** сканировать **до** push (или сразу после push, но **до** deploy). `--exit-code 1` — упасть, если найдены **HIGH/CRITICAL** уязвимости. **Не** деплоить образ с критическими CVE.

### 7.6.5 Sign: `cosign` (кратко)

```bash
cosign sign --key cosign.key registry.local/app:${GIT_SHA}
```

Подпись привязывает образ к **ключу**. При deploy — `cosign verify` проверяет, что образ подписан **доверенным** ключом. Подробно — в **уроке 4.5** (supply chain).

---

## 7.7 Скелет pipeline (GitHub Actions / GitLab CI)

### 7.7.1 GitHub Actions с `docker/build-push-action@v5`

```yaml
name: build-scan-push
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to registry
        uses: docker/login-action@v3
        with:
          registry: registry.local
          username: ${{ secrets.REGISTRY_USER }}
          password: ${{ secrets.REGISTRY_PASS }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: registry.local/app:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: registry.local/app:${{ github.sha }}
          severity: HIGH,CRITICAL
          exit-code: '1'
```

**Ключевые параметры:**

| Параметр | Значение |
|---|---|
| `platforms` | `linux/amd64,linux/arm64` — multi-arch (нужен `docker-container` драйвер, Урок 2) |
| `push: true` | Обязательно для multi-arch (Урок 2, 2.3.3) |
| `tags` | `${GIT_SHA}` — immutable |
| `cache-from` / `cache-to` | `type=gha` — GitHub Actions cache (слои, **не** cache mounts) |

### 7.7.2 GitLab CI (эквивалент)

```yaml
build:
  image: docker:24
  services:
    - docker:24-dind
  variables:
    DOCKER_BUILDKIT: "1"
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - |
      docker buildx build \
        --platform linux/amd64,linux/arm64 \
        --cache-from type=registry,ref=$CI_REGISTRY_IMAGE:cache \
        --cache-to type=registry,ref=$CI_REGISTRY_IMAGE:cache,mode=max \
        -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA \
        --push .
    - trivy image --exit-code 1 --severity HIGH,CRITICAL $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

---

## 7.8 Антипаттерны compose в проде

### 7.8.1 `depends_on` **без** `condition: service_healthy`

```yaml
# ❌ ПЛОХО
services:
  backend:
    depends_on:
      - db   # ждёт только запуска, НЕ готовности
```

**Что происходит:** `backend` стартует, `db` ещё в `initdb` → `backend` падает с `connection refused` → `restart: unless-stopped` перезапускает → **crash loop**, пока `db` не поднимется. Решение: `condition: service_healthy`.

### 7.8.2 `restart: always`

**Почему плохо:** `always` перезапускает контейнер **даже если он был остановлен вручную** (`docker stop`). При `systemctl stop docker` контейнеры останавливаются, но при старте демона `always` может **не** поднять их автоматически (поведение зависит от версии Docker). `unless-stopped` — **правильный** выбор: перезапускает всё, **кроме** явно остановленных.

### 7.8.3 `ports:` для внутренних сервисов

```yaml
# ❌ ПЛОХО: db доступен с хоста (и из интернета, если хост открыт)
db:
  ports:
    - "5432:5432"
```

```yaml
# ✅ ХОРОШО: db доступен ТОЛЬКО внутри сети compose
db:
  expose:
    - "5432"
```

`ports` публикует порт **на хост**. `expose` делает порт доступным **только** для других сервисов в **той же сети**. В проде БД **не должна** быть доступна с хоста, если это не явно необходимо.

### 7.8.4 Секреты в `.env` в git

```yaml
# ❌ ПЛОХО
environment:
  POSTGRES_PASSWORD: supersecret   # в git, в истории, в docker inspect
```

**Почему плохо:** `.env` в git → пароль в **истории git** навсегда. `docker inspect` показывает `Env` **всем**, у кого есть доступ к Docker API. Решение: `secrets:` (файл монтируется в `/run/secrets/`, **не** виден в `inspect`).

### 7.8.5 Named volume для кода

```yaml
# ❌ ПЛОХО
volumes:
  - app-code:/app   # код «застревает» в volume, обновление образа не обновляет код
```

**Почему плохо:** при обновлении образа (`docker compose up --build`) код в **volume** остаётся **старым** — образ новый, а volume старый. Решение: код **внутри** образа (без volume); для разработки — **bind mount** (`./src:/app/src`), но **не** в проде.

### 7.8.6 Bind mount для БД

```yaml
# ❌ ПЛОХО (в проде)
volumes:
  - ./pgdata:/var/lib/postgresql/data
```

**Почему плохо:** bind mount зависит от **прав хоста**, **SELinux**, **пути**. `postgres:16-alpine` **может** стартовать на пустом bind mount (entrypoint делает `chown` и `initdb`), но это **не рекомендовано** для прода: миграция на другой хост, бэкап и права — всё усложняется. **Named volume** — правильный выбор для БД.

### 7.8.7 `image: localbuild` без версии

```yaml
# ❌ ПЛОХО
services:
  app:
    image: myapp:latest   # или вообще без тега
```

**Почему плохо:** `latest` (или отсутствие тега) — **непредсказуемо**. При `docker compose pull` — **неизвестно**, что приедет. В проде — **только** `${GIT_SHA}` или semver + digest.

### 7.8.8 `docker compose up` без `-d` в CI

В CI `docker compose up` **блокирует** терминал и **не выходит**, пока все сервисы не остановятся. В CI — **всегда** `docker compose up -d` (detached), затем `docker compose ps` / healthcheck / тесты, затем `docker compose down -v`.

---

## Контрольные вопросы

**1. Почему `depends_on` без `condition: service_healthy` не решает проблему порядка запуска?**

`depends_on` без `condition` гарантирует только то, что контейнер-зависимость **создан и запущен** (`State.Running`), но **не** то, что приложение внутри **готово принимать соединения**. PostgreSQL в `initdb` уже `Running`, но **не** принимает соединения. `condition: service_healthy` ждёт, пока `healthcheck` (например, `pg_isready`) не вернёт успех. Без этого — race condition: зависимый сервис стартует, падает с `connection refused`, и если у него `restart` — уходит в crash loop.

**2. В чём разница между `restart: always` и `restart: unless-stopped`? Приведи сценарий, где разница критична.**

`always` перезапускает контейнер **всегда**, даже если он был **явно остановлен** (`docker stop`). `unless-stopped` — перезапускает **кроме** случая явной остановки. Критичный сценарий: вы **вручную** остановили контейнер для дебага (`docker stop app`). С `always` Docker **сразу** перезапустит его — вы не сможете его остановить. С `unless-stopped` — контейнер останется остановленным, пока вы не сделаете `docker start`. В проде `unless-stopped` — **стандарт**, потому что даёт **контроль** над остановкой.

**3. Почему `ports:` для БД в compose — плохо, и чем это отличается от `expose:`?**

`ports` публикует порт **на хост-интерфейс** (0.0.0.0:5432 → контейнер:5432). Если хост имеет публичный IP — БД **доступна из интернета**. `expose` делает порт доступным **только** для других контейнеров в **той же Docker-сети**; на хост он **не** публикуется. В проде БД должна быть доступна **только** backend’у, а не хосту и не интернету. `expose` — правильный выбор для внутренних сервисов.

**4. Ты используешь `secrets:` в compose (non-Swarm). Это шифрование?**

**Нет.** В non-Swarm Compose `secrets` — это **bind-mount** файла с хоста в `/run/secrets/<name>` с режимом `0444` (read-only). Это **не** tmpfs, **не** шифрование, **не** vault. Преимущество перед `environment`: секрет **не** виден в `docker inspect` (в `Config.Env`) и **не** попадает в `docker history`. Но файл **лежит на хосте** в открытом виде — защита хоста (права, ФС) остаётся вашей ответственностью.

**5. Чем `docker buildx bake` лучше `docker compose build` для монорепо с 5 сервисами, у которых общий базовый слой?**

`buildx bake` строит **граф** target’ов и видит, что `backend` и `frontend` наследуют общий `base`. BuildKit собирает `base` **один раз** и переиспользует его слои для обоих target’ов **параллельно**. `docker compose build` собирает каждый сервис **отдельно** (хотя BuildKit внутри может кэшировать, но **не** видит явного общего предка). В HCL можно явно описать `inherits = ["base"]`, что делает переиспользование **декларативным** и **гарантированным**.

**6. Почему `--cache-to type=registry` не ускоряет `RUN --mount=type=cache,target=/root/.npm` на чистом CI-раннере?**

`--cache-to type=registry` экспортирует **кэш слоёв** (результаты `RUN`, `COPY`). `--mount=type=cache` — это **отдельный** механизм: постоянный каталог, который **не** является слоем и **не** экспортируется в registry (Урок 2, 2.4.3). На **чистом** CI-раннере cache mount **стартует пустым**, и `npm ci` качает всё заново. Решение: **постоянные** (self-hosted) раннеры, либо персист cache mount через volume на хосте, либо смириться (слой-кэш всё равно ускорит **пересборку** образа, но не сам `npm ci`).

**7. Почему `latest` в проде — плохо, и что использовать вместо?**

`latest` — **мутабельный** тег: при каждом `docker push` он **перезаписывается**. `docker pull latest` **не говорит**, какой коммит / какая сборка / какие изменения. Воспроизводимость **нулевая**. В проде — **immutable** тег: `${GIT_SHA}` (уникальный, трассируется до коммита) или semver. Максимальная надёжность — **digest pinning** (`image: nginx@sha256:...`): digest **никогда** не меняется.

**8. Ты используешь `compose.override.yml` для прода. Почему это опасно?**

`compose.override.yml` **автоматически** мержится при **любом** `docker compose up`, если файл существует. Если вы случайно оставили override с `DEBUG=true`, `ports: 9229:9229` или bind-mount’ом кода — он **попадёт в прод** при `docker compose up` **без** явного `-f`. Безопаснее: **явный** `-f compose.yaml -f compose.prod.yml` для прода, а `override` — **только** для локальной разработки и в `.gitignore`.

---

## Чек-лист покрытия Урока 7

| Тема | Раздел |
|---|---|
| Compose: проблема `docker run`, декларативный YAML | 7.1 |
| `compose.yaml`: `services`, `networks`, `volumes`, `configs`, `secrets` | 7.1.2 |
| Compose v2 vs v1 | 7.2.1 |
| `profiles` | 7.2.2 |
| `compose.override.yml` (авто-мерж) | 7.2.3 |
| `compose.prod.yml` (явный `-f`) | 7.2.4 |
| `.env` vs `env_file` | 7.2.5 |
| `extends` | 7.2.6 |
| Compose в production: можно / нельзя (таблица) | 7.3 |
| `healthcheck` + `depends_on: condition: service_healthy` | 7.4.1 |
| `restart: unless-stopped` (не `always`) | 7.4.2 |
| `init: true` (tini) | 7.4.3 |
| `user:`, `read_only: true`, `cap_drop: [ALL]` | 7.4.4–7.4.6 |
| `secrets:` (файл → `/run/secrets/`) | 7.4.7 |
| `deploy.resources.limits` (memory, cpus) | 7.4.8 |
| `logging.options` (`max-size`, `max-file`) | 7.4.9 |
| `build:` в compose (`context`, `target`, `args`) | 7.5.1 |
| `docker buildx bake` + `docker-bake.hcl` | 7.5.2–7.5.3 |
| `compose build` vs `buildx bake` | 7.5.4 |
| CI/CD: стадии, теги (`git sha` vs `latest`), digest pinning | 7.6 |
| `--cache-to type=registry` / `--cache-from` | 7.6.3 |
| `trivy` / `docker scout` scan | 7.6.4 |
| GitHub Actions / GitLab CI скелет | 7.7 |
| Антипаттерны compose (8 штук) | 7.8 |

---

## Следующие уроки

- **Урок 8.** Отладка в проде: `exec`, `nsenter`, traces, логи, `docker events`, `strace`/`tcpdump` с capabilities.