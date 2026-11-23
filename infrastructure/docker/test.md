# Docker Assessment

## Block A. Основы и внутреннее устройство (калибровка)

**A1.** Чем `docker run` отличается от `docker create` + `docker start` + `docker attach`? Когда бы ты осознанно выбрал второй вариант?

docker run по умолчанию делает create + start и показывает логи в консоль если не выбран detached mode. docker attach опасен тем, что по умолчанию проксирует SIGINT (Ctrl+C убивает процесс) — лечится --sig-proxy=false. Второй вариант (create + start + attach) осознанно выбирают, когда нужно подготовить контейнер заранее (сеть, volume, конфиг), стартовать позже и подключиться к выводу.

**A2.** Объясни разницу между образом, контейнером, слоем (layer) и volume. Где что физически лежит на хосте?

Слой - набор инструкций, которые выполняются и сохраняют состояние для дальнейшего выполнения. ead-only diff (набор файловых изменений), хранится в /var/lib/docker/overlay2/<id>/diff.

Образ - упорядоченный набор read-only слоёв + манифест/конфиг.

Контейнер - образ + writable layer (upperdir) + runtime state (namespaces, cgroups).

Volume - место, куда можно сохранять данные между запусками контейнеров. /var/lib/docker/volumes/<name>/_data (на Linux).

**A3.** Что такое `overlay2` и зачем Docker его использует? Что такое `copy-on-write` в контексте запуска контейнера и записи файла в него?

 overlay2 — storage driver по умолчанию. Собирает merged-ФС из lowerdir (слои образа), upperdir (writable), workdir. Copy-on-write: при записи в файл из нижнего слоя ядро сначала копирует файл в upperdir (copy-up), потом пишет. Следствия: первая запись дороже, изменения в больших файлах копируют файл целиком, overlayfs плохо подходит для БД. Это база для понимания «почему контейнер тормозит на записи» и «почему данные в writable layer теряются».

**A4.** Контейнер упал с кодом 137. Какие 3–4 наиболее вероятные причины, и как ты будешь их различать?

(1) OOM-killer cgroup (проверять docker inspect .State.OOMKilled), (2) OOM хоста, (3) docker stop не дождался SIGTERM → SIGKILL, (4) docker kill, (5) host reboot/daemon kill. Различать: OOMKilled=true, dmesg, docker events, docker inspect .State.ExitCode.

**A5.** Чем PID 1 в контейнере отличается от PID 1 на хосте? Почему это важно для корректного shutdown приложения?

PID 1 по умолчанию не реагирует на мягкую попытку отключения, если у него нет handler для этого. При shutdown docker сначала отправляет мягкий запрос и если за таймаут нет реакции - жесткий kill, и приложение падает не graceful
плюс reaping зомби — PID 1 должен вызывать wait(), иначе зомби копятся. Поэтому нужен --init (tini) или dumb-init, или приложение само обрабатывает SIGTERM и reaps.

**A6.** `docker run --rm alpine echo hi` — опиши, что происходит на уровне runc/containerd (последовательно, хотя бы 6–8 шагов).

CLI → dockerd (API) → containerd → образ (pull, если нет; распаковка в snapshotter) → подготовка rootfs (overlay2 mounts) → runc create (namespaces: pid/mnt/net/uts/ipc/user, cgroups, mounts, capabilities, seccomp) → runc start → процесс echo hi → exit → containerd фиксирует exit → --rm → cleanup rootfs

**A7.** Что происходит с процессами в контейнере, если ты сделал `docker stop` и приложение не реагирует на SIGTERM? Сколько по умолчанию ждёт Docker?

Docker ждёт 10 сек (SIGTERM), затем шлёт SIGKILL — процессы убиваются принудительно, exit code 137

---

## Block B. Образы и сборка (senior-фокус)

**B1.** Почему `COPY . .` перед `RUN pip install -r requirements.txt` — антипаттерн? Опиши конкретный эффект на кэш и время сборки.

Потому что не будет возможности заиспользовать кэш слоев. Небольшое изменение исходного кода заставит по новой скачать пакеты pip. сначала надо сделать COPY только requirements и pip install. После COPY остального

**B2.** Чем `ARG` отличается от `ENV`? Приведи пример, где путаница между ними приводит к багу или утечке секрета.

ARG работает только на уровне сборки, если думать что прокидывается переменная окружения эта, то будет баг - не находка переменной окружения
ENV работает на уровне рантайма

ARG виден в docker history (не только inspect), ENV — в docker inspect и в окружении процесса. Оба не для секретов

**B3.** Что такое multi-stage build? Опиши кейс, где он даёт **не только** уменьшение размера, но и улучшение безопасности.

Multi-stage build - это возможно разнести разные действия по разным этапам. Например на stage 1 скачать sdk и компилятор, прогнать линтер, тестинг и тд, а на финальный stage отправить только артефакт сборки - файл для запуска. Это поможет не прокидывать sdk в финальный образ и скачать туда только рантайм.

**B4.** `docker build` с `--cache-from` — зачем это в CI, и какие подводные камни? Что такое BuildKit cache mounts (`--mount=type=cache`) и зачем они?

--cache-from импортирует кэш из образа (обычно из registry); в CI с buildx нужен ещё --cache-to (например type=registry,mode=max). BuildKit cache mounts (RUN --mount=type=cache,target=/root/.cache/pip) — это persistent-каталог между сборкам

**B5.** Distroless / scratch / alpine — когда что выбираешь и какие компромиссы?

scratch — пустой, только для статических бинарников (Go/Rust), никакого shell/CA.

distroless — только приложение + runtime-либы, нет shell/package manager → минимальная поверхность атаки, но сложнее дебажить (нет sh).

alpine — musl libc (~5 MB, есть shell/apk), но несовместимость с glibc-бинарниками и известные проблемы с .NET (нужен libc6-compat/icu-libs) и Python (сборка колёс). Для .NET/Python часто distroless/chiseled лучше.

**B6.** В чём разница между `docker build` и `buildx`? Что такое `linux/amd64` vs `linux/arm64` и как собрать multi-arch образ?

buildx — CLI-плагин поверх BuildKit: multi-arch, cache-to/from, secrets, provenance, SBOM. Multi-arch: docker buildx build --platform linux/amd64,linux/arm64 --push, требует QEMU/binfmt или нативных билдеров; создаётся manifest list. Без этого — только свой arch.

**B7.** Как уменьшить итоговый размер образа Python-сервиса с 1.2 GB до <200 MB, не сломав работоспособность? Назови 5–7 конкретных приёмов.

(1) multi-stage, (2) slim/distroless base, (3) pip install --no-cache-dir, (4) virtualenv и копирование только его, (5) .dockerignore, (6) удаление build-зависимостей/*.pyc/__pycache__, (7) правильный порядок слоёв, (8) PYTHONDONTWRITEBYTECODE, (9) не тащить тесты/доки.

**B8.** Что такое `.dockerignore` и как его неправильная настройка может *увеличить* время сборки и размер контекста? Приведи пример.

.dockerignore исключает файлы из build context (что отправляется демону/BuildKit). Плохая настройка: не исключены .git, node_modules, bin/obj, *.log, .env → контекст раздувается

---

## Block C. Сети

**C1.** Перечисли встроенные network drivers Docker и объясни, когда какой использовать: `bridge`, `host`, `overlay`, `macvlan`, `none`.

bridge - контейнеры можно объяснить в одну сеть между собой. под капотом будет veth пара, связывающая контейнер и хост
host - прямая трансляция на хост
none - нет доступа наружу извне контейнера

**C2.** Как контейнеры на одном user-defined bridge находят друг друга по имени? Какой механизм резолвинга? Чем это отличается от дефолтного `bridge`?

**C3.** Контейнер A не может достучаться до контейнера B по имени, оба на кастомной сети. Назови 5+ причин, которые будешь проверять по порядку.

контейнер B running; одна ли сеть (docker inspect .NetworkSettings.Networks); DNS (user-defined vs default); имя/alias совпадает; B слушает 0.0.0.0, а не 127.0.0.1; порт открыт внутри (не только -p); iptables/security groups; docker events / nslookup изнутри A; --network container: перекрывает.

**C4.** Что такое `--network host` и почему на macOS/Windows он ведёт себя иначе, чем на Linux?

На Linux --network host = общий netns с хостом (без изоляции, без NAT). На macOS/Windows Docker Desktop работает в VM, поэтому «host» = VM, а не реальная ОС — порты не появляются на хосте автоматически.

**C5.** Как опубликовать порт только на localhost и почему `-p 5432:5432` — потенциальная проблема безопасности в проде?

p 127.0.0.1:5432:5432 биндит только localhost; -p 5432:5432 биндит 0.0.0.0 (все интерфейсы). Плюс Docker обходит ufw/iptables при -p (известная проблема) — «файрвол есть, а порт открыт»

**C6.** DNS в контейнерах: что резолвит встроенный DNS, как передать кастомный DNS, и что происходит при `--network=container:xxx`?

Embedded DNS 127.0.0.11 на user-defined сетях, форвардит на host resolvers или --dns/--dns-search/--dns-option. При --network=container:xxx контейнер делит netns и resolv.conf с целевым.

---

## Block D. Данные и хранилища

**D1.** Разница между `volume`, `bind mount` и `tmpfs`. Для каждого — типичный прод-кейс и типичная ловушка.

- volume - докер сам создаст папку и будет ей управлять - перенесет все с контейнера туда если на хосте пусто
- bind mount - биндим папку хоста к докер контейнеру. минусы - если у контейнера есть там файлы, они не перенесутся, что может привести к проблемам
- tmpfs - fs в RAM

**D2.** Почему нельзя просто так взять и запустить stateful-БД в контейнере «как есть»? Назови минимум 4 проблемы, которые придётся решать (не только про volume).

persistence/бэкапы, I/O-производительность (overlayfs плох для БД — volume/block device лучше), graceful shutdown/fsync, ресурсы (OOM БД), репликация/failover (stateful нельзя просто масштабировать), ulimits, kernel/fs tuning, PID1/init, single point of failure.

**D3.** `docker volume ls` показывает «висячие» volumes. Как они появляются и как их безопасно чистить? Что делает `docker system prune -a --volumes` и почему это опасно?

в новых версиях докер можно безопасно выполнять команду, тк он не трогает named volume

**D4.** Bind mount на macOS тормозит. Почему, и какие есть решения (на уровне Docker Desktop и на уровне приложения)?

ричина: файловая система проходит через VM (gRPC-FUSE / VirtioFS). Решения: VirtioFS в Docker Desktop, cached/delegated consistency, не bind-mount'ить тяжёлые каталоги зависимостей (node_modules, .venv) — держать их в named volume или в образе, mutagen/sync.

**D5.** Как шарить данные между несколькими контейнерами (несколько реплик одного сервиса читают файлы)? Что здесь плохого и что использовать вместо этого?

object storage (S3/MinIO) для файлов, БД для состояния, распределённая ФС (NFS/EFS/CephFS) если реально нужен shared FS, либо рефакторинг под stateless

---

## Block E. Безопасность

**E1.** Зачем нужен `--user` / `USER` в Dockerfile? Почему «root внутри контейнера» — это не то же самое, что «root на хосте», но всё равно плохо?

escape-уязвимости ядра, доступ к смонтированным томам/сокету, CVEs, --privileged усугубляет. Решение: USER, rootless, --userns-remap.

**E2.** Что такое Linux capabilities? Как дропнуть все capabilities и добавить только нужные?

Capabilities — гранулярные привилегии ядра (CAP_NET_ADMIN, CAP_SYS_ADMIN, CAP_NET_BIND_SERVICE…). Дропать: --cap-drop=ALL --cap-add=NET_BIND_SERVICE. Знать дефолтный набор Docker и почему CAP_SYS_ADMIN = почти root.

**E3.** Что делает `--read-only` на файловой системе контейнера, и как при этом приложению писать в `/tmp`?

- read-only - нельзя писать никуда, но можно указать, что если хочешь писать туда-то то это можно делать

**E4.** `--privileged` — что он на самом деле даёт контейнеру и почему почти никогда не нужен?

--privileged = все capabilities + отключены seccomp/AppArmor/SELinux + доступ ко всем devices + /dev + почти root на хосте. Почти никогда не нужен; для конкретной device — --device, для capability — --cap-add.

**E5.** Как секреты попадают в образ при `docker build` и почему `.dockerignore` не спасает? Что такое BuildKit secrets и как ими пользоваться?

BuildKit secrets — RUN --mount=type=secret,id=mysecret ... монтирует секрет только на время RUN, в слой не пишется. Плюс docker buildx build --secret id=...,src=...

**E6.** Что такое seccomp / AppArmor в контексте Docker? Включены ли дефолтные профили и что они ограничивают?

 seccomp — фильтр syscall'ов (дефолтный профиль Docker блокирует ~40 опасных, например mount, reboot, kexec_load). AppArmor (Ubuntu/Debian) — MAC-профиль (docker-default). Оба включены по умолчанию. Это базовый уровень hardening для платформы

---

## Block F. Runtime, ресурсы, производительность

**F1.** Как ограничить контейнер по CPU и памяти? Чем `--memory` отличается от `--memory-swap`? Что произойдёт при превышении?

- memory - сколько можно RAM, memory-swap - сколько можно свапнуть на диск, при превышении - OOM killer

**F2.** `--cpus=1.5` — как это реализовано на уровне cgroups? Чем отличается от `--cpu-shares`?

--cpus=1.5: cgroup v2 cpu.max = "150000 100000" (квота/период), v1 CFS quota/period. --cpu-shares (default 1024) — относительный вес только при конкуренции, не жёсткий лимит. Разница принципиальная.

**F3.** Контейнер съел всю память хоста и хост завис. Что забыли указать в `docker run`? Опиши механизм.

забыли указать сколько может весить контейнера

**F4.** Как посмотреть текущее потребление ресурсов контейнера и его процессов? Чем `docker stats` отличается от `docker top`?

docker stats — live CPU/RAM/net/IO/limit по контейнерам. docker top <id> — список процессов внутри (ps). Разные задачи: мониторинг vs интроспекция процессов.

**F5.** Что такое `healthcheck` в Dockerfile/compose, зачем он нужен, и как с ним работает `depends_on` (и почему `depends_on` без `condition` — почти бесполезен)?

`depends_on` без `condition` — почти бесполезен, тк показывает только что докер встал, но внутренний сервис может быть еще неготов (например postgres внутренний)

healthcheck - специальная инструкция, которая заменит дефолтную что выдает up health когда контейнер просто встал

---

## Block G. Compose и оркестрация

**G1.** Чем `docker-compose` (v1) отличается от `docker compose` (v2 plugin)? Какие практические последствия для CI?

v1 — Python (docker-compose), v2 — Go-плагин (docker compose), быстрее, параллельный build, интегрирован в CLI. Для CI: v1 deprecated → миграция на v2, другие команды/пути, COMPOSE_FILE.

**G2.** В compose-файле сервисы `api` и `db`. Как гарантировать, что `api` стартует только после готовности `db`? Опиши 2–3 подхода и их недостатки.

depends_on от db для api с healthcheck для db

**G3.** Что такое Compose profiles и `extends`? Когда это лучше, чем держать несколько compose-файлов?

pfofiles - то как можно пометить сервис в компосе, и если мы запускаем не тот profile то он не запуститься
extends — наследование сервиса/конфига из другого файла/сервиса (DRY)

**G4.** Как в compose-файле передать секреты, не коммитя их? Опиши 3 варианта с плюсами/минусами.

(1) env_file (не коммитить .env), (2) secrets: (файл/Swarm secret; в non-swarm монтируется как файл), (3) внешний секрет-менеджер (Vault) / CI-vars. Плюсы/минусы: env_file прост, но переменные видны в inspect; secrets-файл безопаснее; Vault — сложнее, но правильнее.

---

## Block H. Отладка и наблюдаемость

**H1.** Контейнер в статусе `Restarting (1)` в цикле. Пошагово: что смотришь и в каком порядке?

docker logs --tail 100 <id> (+ --previous)
docker inspect .State (ExitCode, OOMKilled, Error)
docker events --filter container=...
проверить restart policy, healthcheck, depends_on, ресурсы.

**H2.** Нужно зайти внутрь «сломанного» контейнера, который сразу падает. Как это сделать?

docker run --rm -it --entrypoint sh <image> (переопределить entrypoint)
или docker run --entrypoint sh <image>
или docker cp бинарник/скрипт, nsenter если процесс жив.

**H3.** Как снять сетевой дамп с контейнера, не устанавливая в него tcpdump? Какие ещё способы «посмотреть, что происходит внутри», знаешь?

- exec
- nsenter

**H4.** Что такое `docker events` и как его использовать для алертинга/аудита?

docker events — поток событий демона (create/start/die/oom/kill/health_status). Для аудита/алертинга: фильтры по типу/образу/контейнеру, пайп в log-агрегатор (ELK/Loki), триггеры на oom/die с ненулевым кодом, интеграция с Prometheus (cAdvisor) и алертами.

**H5.** Логи контейнера растут бесконечно. Где они лежат, как ротировать, и как настроить ротацию в `daemon.json` / compose?

ефолт — json-file в /var/lib/docker/containers/<id>/<id>-json.log, растёт бесконечно. Ротация: daemon.json → log-opts: {"max-size":"10m","max-file":"3"} (глобально), --log-opt per-container, в compose logging.options. Другие драйверы (journald/syslog/fluentd) — выгрузка наружу.

---

## Block I. Прод-паттерны (senior-вопросы)

**I1.** Как бы ты построил CI/CD-пайплайн сборки Docker-образов для 20 микросервисов так, чтобы сборка не занимала час? Назови ключевые техники.

1. микросервисы собираются и деплоятся независимо
2. использовать все конструкции - multi-stage, кэш слоев чтобы каждый отдельный микросервис не занимал больше нужного времени

build matrix/параллелизм, --cache-to/--cache-from в registry, общие base-образы, сборка только изменённых сервисов (affected), dependency graph, rootless builders (Kaniko/Buildah), ephemeral runners, registry (Harbor/GHCR/ECR), отдельные pipeline на сервис.

**I2.** Что такое supply chain security в контексте образов? Что из этого ты реально используешь (или стал бы): cosign, SBOM, trivy, `--provenance`, pinned base images?

нужно использовать и SBOM и cosign и trivy, тк SBOM покажет быстро где у нас артефакты с проблемами (уязвимости и тд, очень актуально при появлении CVE на библиотеках и тулах), cosign всегда нужен чтобы мы могли понимать что pull именно то что нужно, trivy покажет где есть CVE в текущем образе
pinned base images - указывает всегда конкретную ссылку на image, а не Latests

**I3.** Почему в проде часто советуют **не** использовать `latest`-тег и не полагаться только на теги? Что использовать вместо?

тк latest не дерментирован, используем за место хеш или digest

**I4.** Приложение в контейнере работает, но медленно по сравнению с bare-metal. Назови 5+ факторов, которые могут быть причиной, и как их проверить.

Причины медленности: CPU throttling (cgroup quota), memory limit/swap, I/O на overlay2, network NAT/bridge overhead, storage driver, seccomp/AppArmor overhead, noisy neighbor, отсутствие huge pages, разные kernel/fs, GC. Проверять: docker stats, --cpu-shares vs --cpus, iostat, perf, cgroup metrics.

**I5.** Как бы ты диагностировал «утечку» дискового пространства на хосте, где крутится 50 контейнеров? Куда смотреть в первую очередь?

docker system df -v, du -sh /var/lib/docker/* (overlay2, volumes, containers, build cache), docker image prune, dangling images, writable layers контейнеров (docker ps -s), логи (json-file!), build cache (docker builder prune), named/anonymous volumes.

**I6.** Ты деплоишь новый образ, и он работает у тебя локально, но падает в проде. Назови класс причин, специфичных именно для контейнерной среды (не «код разный»).

1. не та архитектура процессора в проде
2. недостаточно окружения (нет переменной окружения и тд)

musl vs glibc (alpine), разные kernel/CPU features, права/user (read-only FS, USER), securityContext/seccomp блокирует, отсутствующие volumes/секреты, network policies, resource limits, timezone/locale, storage driver, разные DNS.