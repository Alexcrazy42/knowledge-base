# Docker — Урок 2. BuildKit, buildx, multi-arch, cache mounts, .dockerignore, ARG/ENV/secrets

## 2.1 BuildKit: не «новый сборщик», а другой движок

### 2.1.1 Что это
**BuildKit** — это движок сборки, который пришёл на смену legacy builder. Он строит **LLB** (Low-Level Build — внутренний граф зависимостей), где каждый шаг Dockerfile — узел, а зависимости между узлами определяются автоматически.

Главная идея: **это не последовательный конвейер, а параллельный решатель графа.** Если два этапа не зависят друг от друга — они собираются одновременно.

В современных версиях Docker BuildKit — **дефолт**. Переменная `DOCKER_BUILDKIT=1` больше не нужна (кроме очень старых версий). Проверка: если в выводе сборки видны строки вида `=> [stage 1/3]` и `=> CACHED`, это BuildKit.

### 2.1.2 Что даёт по сравнению с legacy

| Возможность | legacy builder | BuildKit |
|---|---|---|
| Параллельная сборка независимых этапов | ❌ | ✅ |
| Пропуск неиспользуемых этапов (multi-stage) | ❌ | ✅ |
| Инкрементальная передача контекста | ❌ (весь контекст) | ✅ (только изменённые файлы) |
| `RUN --mount=type=cache` | ❌ | ✅ |
| `RUN --mount=type=secret` | ❌ | ✅ |
| `RUN --mount=type=ssh` | ❌ | ✅ |
| Экспорт/импорт кэша через registry | ❌ | ✅ (`--cache-to` / `--cache-from`) |
| Multi-platform в одном билде | ❌ | ✅ (через `buildx`) |

### 2.1.3 Как читать вывод сборки
Вывод изменился, и это важно для дебага:

```
#12 [stage 1/3] FROM docker.io/library/node:20
#12 CACHED

#13 [stage 1/3] COPY package.json package-lock.json ./
#13 DONE 0.0s

#14 [stage 1/3] RUN npm ci
#14 1.234 ...
```

- `CACHED` — узел переиспользован из кэша.
- `DONE 0.0s` — выполнен (быстро, но не из кэша — например, `COPY` с новым файлом).
- `[stage N/M]` — какой этап и какой шаг.
- `[linux/amd64 build ...]` — если собираешь multi-arch, по умолчанию BuildKit печатает **всё в один поток**; есть `--progress=plain` для подробного, `--progress=auto` для компактного.

### 2.1.4 Garbage Collection — почему кэш «сам пропал»

В отличие от legacy, BuildKit управляет кэшем **автоматически**. GC работает по политикам:

- сначала удаляется то, что не использовалось ~48 часов;
- потом — что не использовалось ~60 дней;
- потом — что превышает лимит размера (по умолчанию ограничение зависит от свободного места).

**Следствие:** «вчера собиралось быстро, сегодня всё пересобирается» — это не баг, а сработавшая политика. Лечится либо ручной настройкой GC (`docker builder prune --filter until=...`), либо явным экспортом кэша в registry (см. 2.4).

---

## 2.2 buildx: зачем нужен и когда без него нельзя

### 2.2.1 Что это
`docker build` — это **обёртка** над клиентом сборки. `docker buildx build` — это **полноценный клиент к BuildKit** с поддержкой дополнительных драйверов, multi-arch и экспорта кэша.

В 95% случаев синтаксис совпадает, но есть 5% (multi-arch, cache export, `--load`/`--push`), где `buildx` **обязателен**.

### 2.2.2 Драйверы

Драйвер — это **где** работает BuildKit и **как** он изолирован.

| Драйвер | Где работает | Multi-arch | Изоляция | Когда использовать |
|---|---|---|---|---|
| **`docker`** (дефолт) | В основном демоне `dockerd` | Ограниченно (нужен ручной QEMU) | Нет | Простые локальные сборки |
| **`docker-container`** | В отдельном контейнере `buildkitd` | ✅ QEMU ставится автоматически | Полная | Multi-arch, cache export, секреты |
| **`remote`** | На удалённом BuildKit (по TCP/SSH) | ✅ | Полная | CI, удалённые сборки |

Проверить текущий:
```bash
docker buildx ls
docker buildx inspect
```

Создать `docker-container` драйвер:
```bash
docker buildx create --name multiarch --driver docker-container --use
docker buildx inspect --bootstrap   # поднимет контейнер buildkitd и настроит QEMU
```

**Правило:** как только речь заходит о `--platform` с более чем одной архитектурой, либо о `--cache-to type=registry` — нужен `docker-container` драйвер. С дефолтным `docker` это не сработает.

### 2.2.3 `bake` — декларативная сборка
`docker buildx bake` позволяет описать несколько образов в `docker-bake.hcl` или `compose.yaml` и собрать их **параллельно с общим кэшем**. Удобно для монорепо, где несколько сервисов делят базовый слой.

---

## 2.3 Multi-arch: QEMU, манифесты, почему только `--push`

### 2.3.1 Что такое multi-arch образ
Это **не один** образ, а **манифест-список**, который указывает на разные образы под разные архитектуры. При `docker pull` клиент выбирает нужный по своей архитектуре.

Структура:
```
manifest list (application/vnd.docker.distribution.manifest.list.v2+json)
├── linux/amd64  → image digest sha256:aaa...
├── linux/arm64  → image digest sha256:bbb...
└── linux/arm/v7 → image digest sha256:ccc...
```

Посмотреть манифест:
```bash
docker manifest inspect user/app:latest
docker buildx imagetools inspect user/app:latest
```

В registry можно положить сразу несколько образом под разные архитектуры.

Docker Registry - HTTP-сервер, реализующий стандарт OCI (Open Container Initiative) Distribution Specification. Он хранит слои образов и манифесты (json файлы с метаданными)

огда вы делаете docker push multi-arch образа, в реестр загружается:

```
registry.gitlab.com/myproject/myapp/
├── blobs/
│   ├── sha256:aaa...  (слой с .NET runtime для amd64)
│   ├── sha256:bbb...  (слой с .NET runtime для arm64)
│   ├── sha256:ccc...  (ваш скомпилированный код для amd64)
│   └── sha256:ddd...  (ваш скомпилированный код для arm64)
│
└── manifests/
    ├── sha256:111...  (манифест amd64-образа, ссылается на blob'ы aaa, ccc)
    ├── sha256:222...  (манифест arm64-образа, ссылается на blob'ы bbb, ddd)
    └── sha256:333...  (Manifest List, ссылается на манифесты 111, 222)
         ↑
         Это и есть то самое "меню"
```

### 2.3.2 Как это собирается
Под капотом BuildKit:
1. Запускает **отдельную сборку** для каждой платформы.
2. Для не-нативных архитектур использует **QEMU-эмуляцию** (бинари `qemu-*-static` регистрируются через `binfmt_misc`).
3. Склеивает результаты в **manifest list**.

**Следствие:** сборка под arm64 на amd64-хосте будет **в разы медленнее** (полная эмуляция инструкций). Для тяжёлых сборок лучше использовать **нативные runners** (например, `arm64` runner в GitHub Actions).

### 2.3.3 Почему только `--push`, а не `--load`

Локальное хранилище Docker (то самое `/var/lib/docker/overlay2`) **не поддерживает multi-platform образы**. В нём образ — это **одна** платформа. Поэтому:

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t user/app . --push  # ✅
docker buildx build --platform linux/amd64,linux/arm64 -t user/app . --load  # ❌ error
```

Ошибка обычно выглядит как:
```
error: docker exporter does not currently support exporting manifest lists
```

**Что делать, если нужно локально:** собирать **по одной платформе** и грузить каждую отдельно:
```bash
docker buildx build --platform linux/amd64 -t user/app:amd64 . --load
docker buildx build --platform linux/arm64 -t user/app:arm64 . --push  # или в registry
```

### 2.3.4 Полезные флаги

| Флаг | Что делает |
|---|---|
| `--platform linux/amd64,linux/arm64` | Собрать под несколько архитектур |
| `--push` | Запушить все платформы в registry (обязательно для multi-arch) |
| `--load` | Загрузить в локальный Docker (только одна платформа) |
| `--builder <name>` | Выбрать конкретный buildx-инстанс |
| `--build-arg` | Передать ARG |
| `--secret id=...,src=...` | Смонтировать секрет |
| `--ssh default` | Пробросить SSH-агент |
| `--cache-to type=registry,ref=...` | Экспорт кэша в registry |
| `--cache-from type=registry,ref=...` | Импорт кэша из registry |

---

## 2.4 Cache mounts: когда кэш слоёв уже не спасает

### 2.4.1 Проблема, которую решают
Кэш слоёв инвалидируется **каскадно**. Изменился `package.json` → слой `RUN npm ci` пересобирается **целиком**, даже если 99% пакетов те же.

**Cache mount** — это **постоянный каталог**, который:
- **сохраняется между сборками** (даже если слой инвалидирован);
- **не попадает в финальный образ**;
- **не считается слоем** (не виден в `docker history`).

```dockerfile
RUN --mount=type=cache,target=/root/.npm npm ci
```

Здесь `npm ci` при каждом вызове будет видеть **тот же** `/root/.npm`, даже если `package.json` изменился. Скачиваются только новые пакеты.

### 2.4.2 `sharing` — режим доступа при параллельных сборках

Когда **несколько сборок одновременно** используют один cache mount (например, два CI-джоба), режим определяет поведение:

| Режим | Поведение | Когда использовать |
|---|---|---|
| **`shared`** (дефолт) | Несколько сборок пишут в один каталог. Быстро, но возможны гонки. | `npm`, `go`, `pip` — толерантны к гонкам |
| **`locked`** | Сборки **ждут** друг друга. Медленнее, но безопасно. | `apt`, `apk` — **не** терпят конкурентного доступа |
| **`private`** | У каждой сборки **свой** каталог. Изоляция, но кэш не шарится. | Когда нужна полная изоляция |

Классика для `apt`:
```dockerfile
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y gcc
```

Без `locked` параллельные сборки **портят** базу `dpkg` и получают `dpkg: error: dpkg frontend lock is locked by another process`.

### 2.4.3 Что важно знать про CI

**Cache mounts НЕ экспортируются в registry.** Это не «слой», и `--cache-to` его **не сохраняет**.

Следствия:

- На **локальной** машине cache mount живёт между сборками → ускорение есть.
- На **чистом CI-раннере** (каждый раз новый) cache mount **стартует пустым** → ускорения нет.
- `--cache-to type=registry` сохраняет **кэш слоёв**, но **не** cache mounts.

**Как жить в CI:**
1. **Постоянные раннеры** (self-hosted) — cache mounts работают между джобами.
2. **Registry cache** (`--cache-to type=registry`) — работает для слоёв, а для cache mounts — **только если раннер сам умеет их персистить** (например, через `--mount=type=cache,id=...,...` + volume на хосте).
3. В GitHub Actions — `docker/build-push-action@v5` с `cache-from: type=gha` (слой-кэш, но не cache mount).

**Мнемоника:** *cache mount ускоряет **повторные** сборки на **той же** машине; cache export ускоряет **повторные** сборки на **разных** машинах — но только для слоёв, не для cache mounts.*

### 2.4.4 `id` — идентификатор cache mount

Если в Dockerfile несколько cache mounts с **разными** `target`, они и так различны. Но если несколько cache mounts с **одним** `target` (например, в разных стадиях) — нужно задать уникальный `id`:

```dockerfile
RUN --mount=type=cache,id=build-cache,target=/root/.cache/go-build go build
```

`id` — это **ключ**, под которым cache mount хранится. Без `id` при нескольких `target=/root/.cache/go-build` они будут **конфликтовать**.

---

## 2.5 `.dockerignore`: не про «убрать лишнее», а про две конкретные проблемы

### 2.5.1 Проблема 1 — раздутый контекст

Docker **всегда** отправляет весь контекст (всю директорию) в демон — **даже если `COPY` не ссылается на файлы**. На Docker Desktop это особенно заметно: контекст **сериализуется** и передаётся в WSL VM.

Типичный размер контекста в проекте с `node_modules/`:
```
$ docker build .
...
=> => transferring context: 487.32MB
```

`.dockerignore` с одной строкой `node_modules` уменьшает контекст до **единиц мегабайт**. На сборке в 100 раз быстрее — это не шутка.

### 2.5.2 Проблема 2 — ложная инвалидация кэша

Если в Dockerfile есть `COPY . .`, то **любое изменение любого файла** в контексте инвалидирует этот слой. Изменил `README.md` — пересобирается всё, что после `COPY . .`.

**Мнемоника:** `.dockerignore` не для «уменьшить образ», а для «не трогать кэш» и «не слать лишнее».

### 2.5.3 Ключевое заблуждение

> `.dockerignore` **не** читает `.gitignore`.

Это **разные файлы** с **разным синтаксисом глобов**. Docker **не** парсит `.gitignore` автоматически. Если в проекте есть `.gitignore` и нет `.dockerignore` — в контекст уйдёт всё, включая `.git`, `node_modules`, `.env`, `dist`.

### 2.5.4 Минимальный рабочий `.dockerignore`

```
.git
.gitignore
node_modules
.venv
venv
__pycache__
*.pyc
*.pyo
.env
.env.*
dist
build
target
.idea
.vscode
*.log
.DS_Store
```

**Правило:** `.dockerignore` **должен быть** в любом проекте, где есть `.gitignore`. Дублирование строк — это нормально, лучше дублировать, чем утечь `.env`.

### 2.5.5 Тонкость: `!` — исключения

Как и в `.gitignore`, можно **исключать** файлы из игнора:
```
*.md
!README.md
```

Это полезно, когда хочешь игнорировать всю документацию, но оставить README для `COPY README.md .` в образе (например, для метаданных).

---

## 2.6 ARG, ENV, secret, ssh: четырёхуровневая модель

### 2.6.1 Сравнительная таблица

| | **ARG** | **ENV** | **Secret mount** | **SSH mount** |
|---|---|---|---|---|
| **Когда доступен** | Только build | Build **и** runtime | Только конкретный `RUN` | Только конкретный `RUN` |
| **Остаётся в образе?** | Нет (но виден в `history`/`inspect` метаданных) | **Да**, навсегда в конфиге | **Нет** | **Нет** |
| **Виден в `docker history`?** | **Да** (в виде `ARG XXX=...`) | Да | Нет | Нет |
| **Виден в `docker inspect`?** | Нет (нет в runtime) | **Да** (в `Env`) | Нет | Нет |
| **Можно переопределить при `docker run`?** | Нет | Да (`-e`) | Нет | Нет |
| **Для секретов?** | ❌ **Категорически нет** | ❌ **Категорически нет** | ✅ **Только так** | ✅ Для SSH-ключей |

**Мнемоника:** `ARG` — «параметр сборки», `ENV` — «параметр runtime», `secret` — «не оставлять следов», `ssh` — «пробросить ключ, не копируя».

### 2.6.2 ARG: когда он уместен

**Уместен** для **не-секретных** параметров:
```dockerfile
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y ...
```

Запуск:
```bash
docker build --build-arg NODE_VERSION=22 -t app .
```

**Важно:** `ARG` **исчезает** после build. Если нужно передать значение в runtime — только через `ENV` (или `--env` при `docker run`):
```dockerfile
ARG BUILD_VERSION
ENV APP_VERSION=${BUILD_VERSION}   # ← теперь значение навсегда в образе
```

Здесь кроется **ловушка**: чтобы использовать `ARG` в runtime, приходится делать `ENV`, и **значение остаётся навсегда**. Для секретов это **недопустимо**.

### 2.6.3 ENV: параметр runtime

```dockerfile
ENV APP_ENV=production \
    APP_PORT=8080
```

- Виден в `docker inspect` (в `Config.Env`).
- Можно переопределить при `docker run -e APP_PORT=9000`.
- **Наследуется** от базового образа.

**Правило:** `ENV` — для **не-секретных** конфигов. Пароли, токены, ключи — **никогда** через `ENV`.

### 2.6.4 secret mount: единственный правильный способ

```dockerfile
# syntax=docker/dockerfile:1
FROM alpine
RUN --mount=type=secret,id=my_token \
    cat /run/secrets/my_token | some-tool --token-stdin
```

Запуск:
```bash
docker build --secret id=my_token,src=./token.txt -t app .
```

Что происходит:
1. BuildKit **монтирует** файл `./token.txt` в `/run/secrets/my_token` **только на время этого `RUN`**.
2. Файл монтируется как **tmpfs** — в слой **не попадает**, даже после `RUN`.
3. В `docker history` и `docker inspect` его **нет**.
4. После `RUN` монтирование **исчезает**.

**Проверка:** `docker history --no-trunc app | grep -i token` — пусто. `docker run --rm app ls /run/secrets/` — `No such file or directory`.

### 2.6.5 ssh mount: проброс ключа без копирования

Для доступа к **приватным Git-репозиториям** через SSH:

```dockerfile
# syntax=docker/dockerfile:1
FROM alpine
RUN apk add --no-cache git openssh-client
RUN --mount=type=ssh git clone git@github.com:user/private-repo.git /repo
```

Запуск:
```bash
eval $(ssh-agent) && ssh-add ~/.ssh/id_ed25519
docker build --ssh default -t app .
```

**Что делает:** пробрасывает **SSH-агент** хоста в build-контейнер. Ключ **не копируется** в образ, не попадает в слои. Временный сокет `/run/buildkit/ssh_agent.0` монтируется только на время `RUN`.

**Альтернатива** (если нет агента) — secret mount с ключом:
```dockerfile
RUN --mount=type=secret,id=ssh_key \
    mkdir -p ~/.ssh && cp /run/secrets/ssh_key ~/.ssh/id_rsa && \
    chmod 600 ~/.ssh/id_rsa && \
    ssh -o StrictHostKeyChecking=no git clone git@... && \
    rm -rf ~/.ssh
```

Но это **хуже**: ключ живёт дольше (несколько команд), и есть риск забыть `rm`.

### 2.6.6 Антипаттерны (типичные ошибки)

| ❌ Плохо | ✅ Хорошо | Почему |
|---|---|---|
| `ARG DB_PASSWORD=secret` | `RUN --mount=type=secret,id=db_password` | `ARG` виден в `history` |
| `ENV API_TOKEN=...` | `--mount=type=secret` | `ENV` виден в `inspect` |
| `RUN echo $PASSWORD > /app/config` | `--mount=type=secret` | Остаётся в слое навсегда |
| `COPY .env .` | `--mount=type=secret` или `docker run --env-file` | `.env` остаётся в слое |
| `git clone https://user:pass@github.com/...` | `--mount=type=ssh` или secret | Пароль остаётся в `.git/config` в слое |

**Главный принцип:** **если значение можно увидеть** через `docker history` или `docker inspect` — оно **не секрет**. Точка.

---

## 2.7 Типичные антипаттерны Dockerfile

Собрано из практики; каждый пункт — отдельная ошибка, которую видно в код-ревью.

### 2.7.1 Порядок инструкций

```dockerfile
# ❌ ПЛОХО: любое изменение кода инвалидирует pip install
COPY . .
RUN pip install -r requirements.txt

# ✅ ХОРОШО: зависимости кэшируются отдельно от кода
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
```

**Правило:** «меняется реже → выше в Dockerfile».

### 2.7.2 Shell form vs exec form

```dockerfile
# ❌ ПЛОХО: PID 1 = /bin/sh -c, сигналы не доходят до приложения
CMD python app.py

# ✅ ХОРОШО: PID 1 = python, сигналы доходят
CMD ["python", "app.py"]
```

См. Lab 2 в уроке 1.

### 2.7.3 Без `--init` и без `tini`

Если приложение **само** не умеет быть PID 1 (не жнёт зомби, не форвардит сигналы) — нужен `tini`:
```dockerfile
ENTRYPOINT ["tini", "--", "python", "app.py"]
```

Или `docker run --init` (Docker сам подставит tini).

### 2.7.4 `RUN rm` не уменьшает образ

```dockerfile
# ❌ ПЛОХО: файл остаётся в нижнем слое (whiteout)
RUN wget https://... -O /tmp/big.tar.gz && \
    tar -xzf /tmp/big.tar.gz -C /app

RUN rm /tmp/big.tar.gz
```

Решение — **multi-stage** или **один `RUN`** с `rm` внутри той же команды:
```dockerfile
# ✅ ХОРОШО: rm в том же RUN, что и wget — слой один
RUN wget https://... -O /tmp/big.tar.gz && \
    tar -xzf /tmp/big.tar.gz -C /app && \
    rm /tmp/big.tar.gz
```

Или `COPY --from=builder` (см. урок 1, Lab 7).

### 2.7.5 `apt-get update` отдельно от `install`

```dockerfile
# ❌ ПЛОХО: кэш update протухает, install падает
RUN apt-get update
RUN apt-get install -y curl

# ✅ ХОРОШО: одной командой
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
```

`--no-install-recommends` — не ставить «рекомендованные» пакеты (экономия сотен МБ). `rm -rf /var/lib/apt/lists/*` — чистить индексы (они тоже оседают в слое).

### 2.7.6 `latest` тег

```dockerfile
# ❌ ПЛОХО: непредсказуемо
FROM python:latest

# ✅ ХОРОШО: pinned major.minor.patch или digest
FROM python:3.12.3-slim-bookworm
# или ещё лучше — по digest
FROM python@sha256:abc123...
```

`latest` — это «что угодно, когда угодно». В проде — только pinned версия (или digest, если нужна максимальная воспроизводимость).

### 2.7.7 Root user

```dockerfile
# ❌ ПЛОХО: всё от root
FROM python:3.12-slim
CMD ["python", "app.py"]

# ✅ ХОРОШО: непривилегированный пользователь
FROM python:3.12-slim
RUN useradd -m -u 1000 appuser
USER appuser
CMD ["python", "app.py"]
```

См. блок «Безопасность» (урок 5).

### 2.7.8 Нет `HEALTHCHECK`

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1
```

Без `HEALTHCHECK` Docker **не знает**, жив ли сервис, — только «процесс ещё крутится». `docker ps` покажет `Up 5 hours`, даже если приложение зависло.

### 2.7.9 Нет `.dockerignore`

См. 2.5. Самая частая ошибка новичков: `COPY . .` без `.dockerignore` → в контекст улетают `.git`, `node_modules`, `.env`.

### 2.7.10 `ADD` вместо `COPY`

`ADD` умеет:
- распаковывать `tar` автоматически;
- тянуть по URL.

Это **неявное поведение** — источник сюрпризов. **Правило:** всегда `COPY`, кроме случаев, когда **явно** нужна распаковка (и то лучше `tar` в `RUN`).

---

## 2.8 Шпаргалка: что использовать в каком случае

| Задача | Инструмент |
|---|---|
| Ускорить повторную сборку **на той же машине** | **cache mount** (`--mount=type=cache`) |
| Ускорить повторную сборку **на разных машинах** (CI) | **`--cache-to type=registry`** + `--cache-from` |
| Уменьшить образ | **multi-stage build** (`COPY --from=`) |
| Собрать под arm64 и amd64 | **`buildx` + `docker-container` драйвер** + `--platform` |
| Передать версию зависимости в build | **`ARG`** |
| Передать конфиг в runtime | **`ENV`** (или `-e`) |
| Передать **секрет** в build | **`--mount=type=secret`** |
| Доступ к приватному Git | **`--mount=type=ssh`** |
| Уменьшить контекст | **`.dockerignore`** |
| Отладить сборку | **`--progress=plain`**, `docker history`, `docker buildx du` |
| Очистить кэш | **`docker builder prune`** (с `--filter`) |

---

## Вопросы контрольные

**1. Почему `docker buildx build --platform linux/amd64,linux/arm64 --load .` падает с ошибкой, а с `--push` работает?**

Ответ: локальное хранилище Docker (`/var/lib/docker/overlay2`) не поддерживает multi-platform образы — образ в нём представлен **одной** платформой. `--load` пытается загрузить результат в локальный Docker, а результат multi-arch — это **manifest list**, а не один образ. Manifest list — это структура registry, не Docker. `--push` пушит manifest list в registry, где он поддерживается нативно. Обходной путь — собирать по одной платформе отдельно, либо использовать `--load` только с одной платформой в `--platform`.

**2. Ты добавил `RUN --mount=type=cache,target=/root/.npm npm ci`. Локально сборка ускорилась в 10 раз, а в CI — нет. Почему?**

Ответ: cache mount — это **постоянный каталог**, который живёт **между сборками на одном BuildKit-инстансе**. В CI каждый раз новый раннер → новый BuildKit → cache mount **стартует пустым**. `--cache-to type=registry` **не сохраняет** cache mounts (это не слои), поэтому экспорт кэша в registry их **не** переносит. Решения: постоянные (self-hosted) раннеры, либо персист cache mount через volume на хосте, либо смириться и использовать только слой-кэш (`--cache-to type=registry` ускоряет пересборку слоёв, но не cache mounts).

**3. У тебя в Dockerfile `ARG DB_PASSWORD=secret`. Ты собираешь образ и пушишь в registry. Кто и как увидит пароль?**

Ответ: **все, у кого есть доступ к образу**. `ARG` попадает в **метаданные образа** и виден в `docker history --no-trunc` (строка `ARG DB_PASSWORD=secret`). Также `docker buildx imagetools inspect` покажет его в истории слоёв. Пароль **не** в файловой системе контейнера, но в **истории сборки** — да. Правильно — только `RUN --mount=type=secret,id=db_password`: он монтируется в tmpfs, в слой не попадает, в истории не остаётся.

**4. Ты используешь `sharing=locked` для cache mount `/var/cache/apt`. Что произойдёт, если два CI-джоба одновременно запустят сборку?**

Ответ: один джоб **получит** cache mount, второй **будет ждать**, пока первый не отпустит. Это предотвращает повреждение `dpkg`-базы (классическая гонка, из-за которой `apt-get install` падает с `dpkg frontend lock is locked`). Цена — последовательное выполнение (медленнее, чем `shared`), но для `apt`/`apk` это **единственный безопасный** режим.

**5. В чём разница между `COPY . .` с `.dockerignore` и `COPY requirements.txt .` без `.dockerignore`?**

Ответ: `COPY requirements.txt .` в **контекст** всё равно отправляет **всю** директорию (Docker передаёт весь контекст в демон, даже если `COPY` ссылается на один файл). `.dockerignore` уменьшает **размер контекста** — критично для больших проектов (гигабайты `node_modules`). `COPY requirements.txt .` **не** инвалидирует слой при изменении других файлов, а `COPY . .` — инвалидирует. То есть `.dockerignore` решает «размер контекста», а правильный `COPY` — «инвалидацию кэша». Обычно нужны **оба**: `.dockerignore` + точечный `COPY`.

**6. Ты собрал multi-arch образ и запушил в registry. На amd64-хосте `docker pull` тянет amd64-вариант. Как registry понимает, какой вариант отдать?**

Ответ: в registry лежит **manifest list** (index), содержащий ссылки на **digest**-ы для каждой платформы. При `docker pull` клиент передаёт свою платформу (`linux/amd64`) в заголовке `Accept`/`User-Agent`, и registry по манифесту выбирает **правильный digest**. Если нужной платформы в манифесте нет — `docker pull` падает с `no matching manifest for linux/amd64 in the manifest list`. Посмотреть список: `docker buildx imagetools inspect user/app:latest`.

**7. Ты собрал образ, в `docker history` видишь 12 слоёв. В `docker inspect` видишь `Env: ["PATH=...", "APP_ENV=production"]`. Сколько «настоящих» слоёв с данными, а сколько — пустых?**

Ответ: «Настоящие» слои с данными создают `RUN`, `COPY`, `ADD`. `ENV`, `ARG`, `LABEL`, `WORKDIR`, `USER`, `EXPOSE`, `ENTRYPOINT`, `CMD` создают **zero-byte слои** — в `docker history` они видны, но данных в них нет, только изменения конфига. `FROM` вообще не создаёт слой, а подтягивает готовые слои базового образа. Чтобы увидеть, какие слои «толстые», а какие пустые: `docker history app` (колонка `SIZE`) или `dive app`.

---

## Чек-лист покрытия Урока 2

| Тема | Раздел |
|---|---|
| BuildKit: что это, зачем, как читать вывод | 2.1 |
| Garbage Collection кэша BuildKit | 2.1.4 |
| buildx: зачем, драйверы `docker` / `docker-container` / `remote` | 2.2 |
| Multi-arch: manifest list, QEMU, почему `--push` | 2.3 |
| Cache mounts: синтаксис, `sharing=locked`, `id` | 2.4 |
| Cache mounts в CI: почему не работают | 2.4.3 |
| `.dockerignore`: контекст + инвалидация | 2.5 |
| `.dockerignore` ≠ `.gitignore` | 2.5.3 |
| `ARG` vs `ENV` vs `secret` vs `ssh` | 2.6 |
| Антипаттерны Dockerfile (порядок, shell form, `rm`, `latest`, root) | 2.7 |
| Шпаргалка «задача → инструмент» | 2.8 |