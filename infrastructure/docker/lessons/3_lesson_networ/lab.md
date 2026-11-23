# Docker — Lab 3 Journal. Сети: bridge, host, none, overlay, DNS, port publishing, network inspect

**Итого: ~3 часа 15 минут.** Перерывы — после Lab 2 (DNS) и Lab 6 (overlay): там больше всего «почему не работает».

---

## Lab 0. Проверка окружения — 5 мин

**Цель:** увидеть, какие сети существуют по умолчанию, какой subnet у `docker0`, доступен ли `iptables` (в Docker Desktop он может быть недоступен — тогда работаем через `docker network inspect`).

```bash
wsl -d docker-desktop

docker network ls
# NETWORK ID     NAME      DRIVER    SCOPE
# xxxx           bridge    bridge    local
# yyyy           host      host      local
# zzzz           none      null      local

NETWORK ID     NAME                  DRIVER    SCOPE
946f085fcd96   app-network           bridge    local
28bc5b439311   bridge                bridge    local
706f32189e1f   docker_gwbridge       bridge    local
ad0820c31711   dotnet-libs_default   bridge    local
31d9cc3585d2   host                  host      local
olisbihunw82   ingress               overlay   swarm
b460862ef063   none                  null      local

docker network inspect bridge --format '{{range .IPAM.Config}}subnet={{.Subnet}} gateway={{.Gateway}}{{end}}'
# subnet=172.17.0.0/16 gateway=172.17.0.1

# iptables доступен?
which iptables && iptables -t nat -L DOCKER -n 2>/dev/null | head -10 || echo "iptables недоступен"
```

**Записать:** список дефолтных сетей, subnet `docker0`. Если `iptables` недоступен — не страшно, для всех лаб хватит `docker network inspect` и `docker inspect` (у контейнера будет поле `NetworkSettings`).

---

## Lab 1. Дефолтный bridge: изоляция слабая, DNS нет — 25 мин

**Цель:** увидеть, что в `docker0` контейнеры видят друг друга **по IP** без всяких сетей, но **не по имени**, и что «изоляция» — это про пользовательские сети, а не про дефолт.

### Часть A — два контейнера в `docker0`

```bash
docker run -d --name c1 alpine sleep 1000
docker run -d --name c2 alpine sleep 1000

# IP-адреса
docker inspect c1 --format 'c1 ip={{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'
# c1 ip=172.17.0.2

docker inspect c2 --format 'c2 ip={{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'
# c2 ip=172.17.0.3
# Ожидаемо: оба в 172.17.0.0/16, например 172.17.0.2 и 172.17.0.3
```

**Проверка «видят друг друга по IP»:**

```bash
C2IP=$(docker inspect c2 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
docker exec c1 ping -c 2 "$C2IP"

# PING 172.17.0.3 (172.17.0.3): 56 data bytes
# 64 bytes from 172.17.0.3: seq=0 ttl=64 time=1.132 ms
# 64 bytes from 172.17.0.3: seq=1 ttl=64 time=0.081 ms

# --- 172.17.0.3 ping statistics ---
# 2 packets transmitted, 2 packets received, 0% packet loss
# round-trip min/avg/max = 0.081/0.606/1.132 ms

# Ожидаемо: 2 packets transmitted, 2 received
```

**Проверка «не видят по имени»:**

```bash
docker exec c1 ping -c 1 c2

# PING c2 (89.223.69.201): 56 data bytes
# 64 bytes from 89.223.69.201: seq=0 ttl=63 time=18.072 ms
# --- c2 ping statistics ---
# 1 packets transmitted, 1 packets received, 0% packet loss
# round-trip min/avg/max = 18.072/18.072/18.072 ms
# но это просто есть вне сети докер такой адрес

# Ожидаемо: ping: bad address 'c2'
```

**Вывод:** в дефолтном bridge **все контейнеры видят друг друга по IP** (это не изоляция), но **DNS по именам не работает**.

### Часть B — «изоляция» в дефолтном bridge: её нет

```bash
docker run -d --name c3 alpine sleep 1000
C3IP=$(docker inspect c3 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')

docker exec c1 ping -c 1 "$C3IP"
# 64 bytes from 172.17.0.4: seq=0 ttl=64 time=0.216 ms

# --- 172.17.0.4 ping statistics ---
# 1 packets transmitted, 1 packets received, 0% packet loss
# round-trip min/avg/max = 0.216/0.216/0.216 ms

# 172.17.0.4
```

**Вывод:** дефолтный `docker0` — это **одна общая сеть** для всех контейнеров, запущенных без `--network`. Никакой изоляции между ними нет.

### Часть C — `--link` (устаревший способ)

```bash
docker run -d --name c4 --link c1:linked-c1 alpine sleep 1000
docker exec c4 ping -c 1 linked-c1

# PING linked-c1 (172.17.0.2): 56 data bytes
# 64 bytes from 172.17.0.2: seq=0 ttl=64 time=0.193 ms

# --- linked-c1 ping statistics ---
# 1 packets transmitted, 1 packets received, 0% packet loss
# round-trip min/avg/max = 0.193/0.193/0.193 ms


docker exec c4 cat /etc/hosts

# 172.17.0.2      linked-c1 bceffe503a1b c1
# 172.17.0.5      bda662603a5c
```

**Вывод:** `--link` работает, но **устарел**: он односторонний (c4 видит c1, но не наоборот), не масштабируется, и Docker рекомендует **не использовать** его в новых проектах.

**Что записать:**
- дефолтный `docker0` — все контейнеры в одной сети без изоляции;
- IP-резолвинг работает, **DNS по именам — нет**;
- `--link` — legacy, работает через `/etc/hosts`, не использовать.

```bash
docker rm -f c1 c2 c3 c4
```

---

## Lab 2. User-defined bridge: DNS по именам, изоляция — 30 мин

**Цель:** увидеть **встроенный DNS** (`127.0.0.11`) и **изоляцию** между пользовательскими сетями. Это базовая механика для compose и production.

### Часть A — своя сеть + DNS по имени

```bash
docker network create lab-net

docker run -d --name web  --network lab-net alpine sleep 1000
docker run -d --name db   --network lab-net alpine sleep 1000

# Проверка DNS
docker exec web ping -c 2 db
# Ожидаемо: 2 packets transmitted, 2 received — работает по имени!

# Внутри контейнера /etc/resolv.conf - конфигурационный файл linux, который говорит системному резолверу (glibc, musl, .NET Dns.GetHostEntry и тд) куда отправлять днс запросы

# Когда любое приложение делает getaddrinfo("db-service") или ping db-service, библиотека резолвера читает этот файл и идёт по указанным nameserver'ам.

docker exec web cat /etc/resolv.conf
# Ожидаемо:
# nameserver 127.0.0.11 подмена dns сервера
# options ndots:0 

# ndots — это количество точек в имени, после которого резолвер считает имя "полным" (FQDN) и не пытается добавлять доменные суффиксы из search.
```

### Часть B — `--network-alias`

```bash
docker run -d --name api --network lab-net --network-alias backend alpine sleep 1000

docker exec web ping -c 1 api
docker exec web ping -c 1 backend
# Ожидаемо: оба работают — "api" и "backend" резолвятся в один IP
```

**Зачем:** когда сервис пересоздаётся с новым именем, но старые клиенты используют алиас — DNS продолжает работать.

### Часть C — изоляция между сетями

```bash
docker network create isolated-net
docker run -d --name secret --network isolated-net alpine sleep 1000

docker exec web ping -c 1 secret
# Ожидаемо: ping: bad address 'secret'
```

**Вывод:** пользовательская сеть **изолирована**: контейнер из `lab-net` **не видит** контейнер из `isolated-net` ни по имени, ни по IP.

### Часть D — контейнер в двух сетях

```bash
docker network connect lab-net secret
docker exec web ping -c 1 secret

# PING secret (172.19.0.5): 56 data bytes
# 64 bytes from 172.19.0.5: seq=0 ttl=64 time=0.303 ms

# Ожидаемо: теперь работает — secret подключён к обеим сетям
```

**Что записать:**
- user-defined bridge → встроенный DNS `127.0.0.11`;
- `--network-alias` даёт дополнительные имена;
- сети **изолированы** друг от друга;
- `docker network connect` подключает **уже запущенный** контейнер к дополнительной сети (без перезапуска).

```bash
docker rm -f web db api secret
docker network rm lab-net isolated-net
```

---

## Lab 3. Port publishing: `-p`, `-P`, EXPOSE и iptables — 30 мин

**Цель:** увидеть, как `-p` публикует порт (и не публикует, если не указан), как `-P` использует `EXPOSE`, и что значит binding на `127.0.0.1`.

### Часть A — без `-p`: с хоста недоступно

```bash
docker run -d --name nginx1 dockerhub.timeweb.cloud/library/nginx:alpine

# Из WSL — попробуем достучаться по IP контейнера
IP=$(docker inspect nginx1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
echo "container IP: $IP"
# container IP: 172.17.0.2
docker exec nginx1 curl -s -o /dev/null -w 'statusCode: %{http_code}\n' "http://$IP:80"
# statusCode: 200
# Ожидаемо: 200 — из контейнера работает!

# С Windows-хоста (в PowerShell) — попробуем
# curl http://localhost:80  → ошибка (порт не проброшен)
# curl: (7) Failed to connect to localhost:80 after 2 ms: Could not connect to server
```

**Почему из контейнера работает, а с Windows — нет:** контейнер и Docker Desktop используют **общую VM**, у которой есть доступ к bridge-сети контейнера. Windows-хост **не видит** bridge-сеть — только опубликованные порты. Это **важный** нюанс: «работает в WSL» ≠ «работает снаружи».

### Часть B — с `-p`: публикация

```bash
docker run -d --name nginx2 -p 8080:80 dockerhub.timeweb.cloud/library/nginx:alpine

# Из wsl
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080
# 200

# Из PowerShell (отдельное окно)
# curl http://localhost:8080  → 200
```

**Вывод:** `-p 8080:80` создаёт **iptables DNAT**-правило: пакет на `host:8080` → `container:80`.

### Часть C — binding на `127.0.0.1`

```bash
docker run -d --name nginx3 -p 127.0.0.1:8081:80 dockerhub.timeweb.cloud/library/nginx:alpine

# Из WSL
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8081
# Ожидаемо: 200

# С другой машины в сети (или из другой WSL-сессии на другой подсети) — недоступно
# (это сложно проверить в Docker Desktop, но семантически порт привязан только к loopback)
```

**Зачем:** для безопасности — когда сервис должен быть доступен **только** локальному клиенту (например, метрики Prometheus, admin-панель).

### Часть D — `-P` (publish all) и `EXPOSE`

```bash
# dockerhub.timeweb.cloud/library/nginx:alpine имеет EXPOSE 80 в Dockerfile
docker image inspect dockerhub.timeweb.cloud/library/nginx:alpine --format '{{json .Config.ExposedPorts}}'
# Ожидаемо: {"80/tcp":{}}

docker run -d --name nginx4 -P dockerhub.timeweb.cloud/library/nginx:alpine
docker port nginx4
# Ожидаемо: 80/tcp -> 0.0.0.0:32768 (случайный порт)
```

**Вывод:** `-P` берёт `EXPOSE` из образа и публикует на **случайный** порт хоста. Полезно для динамических окружений, но **плохо** для прода (непредсказуемый порт).

### Часть E — «а если iptables доступен»

В WSL docker-desktop `iptables` **обычно недоступен**, но если есть — можно увидеть правило:

```bash
# Только если iptables работает
iptables -t nat -L DOCKER -n | grep 8080
# Ожидаемо: DNAT tcp -- 0.0.0.0/0 0.0.0.0/0 tcp dpt:8080 to:172.17.0.X:80
```

Если `iptables` нет — используй `docker inspect nginx2 --format '{{json .NetworkSettings.Ports}}'` — там видно `HostPort` и `HostIp`.

```
{"80/tcp":[{"HostIp":"0.0.0.0","HostPort":"8080"},{"HostIp":"::","HostPort":"8080"}]}
```

**Что записать:**
- без `-p` порт **не опубликован** (доступен только из контейнера, но не с Windows-хоста);
- `-p host:container` создаёт DNAT; `-p 127.0.0.1:host:container` — только для loopback;
- `-P` использует `EXPOSE` и даёт случайный порт;
- `EXPOSE` **сам по себе** не публикует — только метаданные.

```bash
docker rm -f nginx1 nginx2 nginx3 nginx4
```

---

## Lab 4. Host network: `-p` игнорируется, порты конфликтуют — 20 мин

**Цель:** увидеть, что `--network host` **убирает** сетевой namespace (контейнер видит `lo` и `eth0` хоста), `-p` не работает, а конфликт портов — реален.

### Часть A — контейнер видит сеть хоста

```bash
# Порт 80 на хосте должен быть свободен — проверь
ss -tlnp | grep ':80 '

docker run -d --name host-nginx --network host dockerhub.timeweb.cloud/library/nginx:alpine

# Смотрим, что видит контейнер
docker exec host-nginx ip addr
# Ожидаемо: те же интерфейсы, что и у WSL-хоста (lo, eth0), не 172.17.x.x

# Порт 80 занят на хосте — контейнер слушает напрямую
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:80
# Ожидаемо: 200 — БЕЗ -p, потому что -p здесь не нужен
```

### Часть B — `-p` в host-режиме

```bash
docker run -d --name host-nginx2 --network host -p 8080:80 dockerhub.timeweb.cloud/library/nginx:alpine
# Ожидаемо (в новых версиях Docker):
# WARNING: Published ports are discarded when using host network mode
```

**Вывод:** `-p` и `--network host` **несовместимы**. Если контейнер в host-режиме — он слушает порты **напрямую**, и `-p` ни на что не влияет.

### Часть C — конфликт портов

```bash
# Убиваем первый
docker rm -f host-nginx

# Запускаем ДВА контейнера в host-режиме, оба хотят порт 80
docker run -d --name h1 --network host dockerhub.timeweb.cloud/library/nginx:alpine
docker run -d --name h2 --network host dockerhub.timeweb.cloud/library/nginx:alpine
# Ожидаемо: второй упадёт с "bind: address already in use" (или "port is already allocated")

# Логи контейнера:
# 2026/11/20 18:55:41 [emerg] 1#1: bind() to [::]:80 failed (98: Address in use)
# nginx: [emerg] bind() to [::]:80 failed (98: Address in use)
```

### Часть D — изоляция (её нет)

```bash
docker exec h1 ip addr
# Тот же вывод, что у хоста — все интерфейсы, включая eth0 с реальным IP
```

**Вывод:** в host-режиме контейнер видит **всю сеть хоста**, включая другие интерфейсы (VPN, локальная сеть). Это **плохо для безопасности**, но **хорошо для производительности**.

**Что записать:**
- `--network host` → контейнер использует сеть хоста напрямую;
- `-p` игнорируется (или ошибка);
- конфликт портов реален: два контейнера на 80 не запустятся;
- безопасность хуже: контейнер видит все интерфейсы.

```bash
docker rm -f host-nginx host-nginx2 h1 h2 2>/dev/null
```

---

## Lab 5. None network: полная изоляция — 10 мин

**Цель:** убедиться, что `--network none` оставляет **только loopback**, и что приложение без сети может работать.

```bash
docker run -d --name none-lab --network none alpine sleep 1000

docker exec none-lab ip addr
# Ожидаемо:
# 1: lo: <LOOPBACK,UP> mtu 65536 ...
# (никаких eth0)

# Нет доступа наружу
docker exec none-lab ping -c 1 8.8.8.8
# ping: sendto: Network unreachable

# И нет DNS
docker exec none-lab ping -c 1 google.com
# ping: bad address 'google.com'

# Проверка: loopback работает
docker exec none-lab ping -c 1 127.0.0.1
# Ожидаемо: 1 packets transmitted, 1 received
```

**Зачем:** для безопасных batch-задач (обработка файлов, криптография) или тестов, доказывающих отсутствие сетевых вызовов.

**Что записать:**
- `--network none` → только `lo`;
- нет выхода наружу, нет DNS;
- приложение всё равно может работать (если не требует сети).

```bash
docker rm -f none-lab
```

---

## Lab 6. DNS deep-dive: `127.0.0.11`, `--dns`, upstream — 25 мин

**Цель:** понять **двухуровневый** DNS: `127.0.0.11` (Docker) → upstream. Увидеть, что делать, если корпоративный DNS не вписан.

### Часть A — как выглядит `resolv.conf`

```bash
docker network create dns-lab
docker run -d --name app --network dns-lab alpine sleep 1000
docker run -d --name db  --network dns-lab alpine sleep 1000

docker exec app cat /etc/resolv.conf
# nameserver 127.0.0.11
# options ndots:0
```

`127.0.0.11` — это **встроенный DNS Docker**. Он отвечает за **локальные** имена (контейнеры в этой сети, алиасы) и **форвардит** остальное на upstream.

### Часть B — резолвинг локального и внешнего

```bash
# Локальный (в этой сети)
docker exec app nslookup db 2>/dev/null || docker exec app getent hosts db
# Address: 172.19.0.3

# Внешний (через upstream)
docker exec app nslookup google.com 2>/dev/null || docker exec app getent hosts google.com
# Ожидаемо: резолвится

# Если хочешь увидеть, куда форвардится:
docker exec app cat /etc/resolv.conf
```

### Часть C — кастомный `--dns`

```bash
docker run -d --name app-custom-dns --network dns-lab \
  --dns 1.1.1.1 --dns 8.8.8.8 alpine sleep 1000

docker exec app-custom-dns cat /etc/resolv.conf
# Generated by Docker Engine.
# This file can be edited; Docker Engine will not make further changes once it
# has been modified.

# nameserver 127.0.0.11
# options ndots:0

# Based on host file: '/etc/resolv.conf' (internal resolver)
# ExtServers: [1.1.1.1 8.8.8.8]
# Overrides: [nameservers]
# Option ndots from: internal
```

**Важно:** `127.0.0.11` **остаётся первым** — Docker сначала пробует локальный резолвинг, потом форвардит на указанные upstream.

### Часть D — «localhost vs имя контейнера»

```bash
# В контейнере app: "localhost" — это сам app
docker exec app ping -c 1 localhost
# Ожидаемо: 127.0.0.1 — это app, а не db!

# А "db" — это db
docker exec app ping -c 1 db
# Ожидаемо: 172.XX.0.Y — это db
```

**Классическая ошибка:** приложение настраивают на `localhost:5432`, думая, что это «база», а на самом деле это **сам контейнер**. В bridge-сети к БД ходят по имени `db:5432`, а не `localhost:5432`.

**Что записать:**
- `/etc/resolv.conf` содержит `127.0.0.11` — встроенный DNS Docker;
- локальные имена → `127.0.0.11` → upstream;
- `--dns` добавляет upstream, но `127.0.0.11` остаётся первым;
- `localhost` в контейнере — это **сам контейнер**, а не сосед.

```bash
docker rm -f app db app-custom-dns
docker network rm dns-lab
```

---

## Lab 7. Overlay + Swarm: сеть между «хостами» — 30 мин

**Цель:** увидеть overlay-сеть в действии. В Docker Desktop у нас **один** хост, поэтому overlay между настоящими машинами не проверить — но **single-node Swarm** позволяет создать overlay-сеть и убедиться, что:
- `--attachable` нужен для standalone-контейнеров;
- VIP (virtual IP) появляется у сервисов;
- DNS в overlay работает так же, как в bridge.

### Часть A — инициализация Swarm (single-node)

```bash
docker swarm init
# Ожидаемо: Swarm initialized: current node (xxxx) is now a manager.

docker node ls
# Ожидаемо: одна нода, Manager, Ready
```

### Часть B — overlay-сеть без `--attachable` (fail)

```bash
docker network create -d overlay my-overlay

docker run -d --name app --network my-overlay alpine sleep 1000
# docker: Error response from daemon: failed to set up container networking: Could not attach to network my-overlay: rpc error: code = PermissionDenied desc = network my-overlay not manually attachable
```

**Причина:** overlay без `--attachable` **не подключает** standalone-контейнеры, только Swarm-сервисы.

### Часть C — overlay с `--attachable` (success)

```bash
docker network rm my-overlay
docker network create -d overlay --attachable my-overlay

docker run -d --name app --network my-overlay alpine sleep 1000
docker run -d --name db  --network my-overlay alpine sleep 1000

docker exec app ping -c 2 db
# PING db (10.0.1.4): 56 data bytes
# 64 bytes from 10.0.1.4: seq=0 ttl=64 time=0.434 ms
# 64 bytes from 10.0.1.4: seq=1 ttl=64 time=0.206 ms
# --- db ping statistics ---
# 2 packets transmitted, 2 packets received, 0% packet loss
# round-trip min/avg/max = 0.206/0.320/0.434 ms
```

### Часть D — overlay + Swarm service (VIP)

```bash
# Создаём сервис из 2 реплик
docker service create --name web --network my-overlay --replicas 2 dockerhub.timeweb.cloud/library/nginx:alpine

docker service ls
# Ожидаемо: web replicated 2/2

# Смотрим VIP сервиса
docker service inspect web --format '{{json .Endpoint.VirtualIPs}}'
# [{"NetworkID":"q1z7tg3g5afk3mgf2mxb99fxt","Addr":"10.0.1.5/24"}] ← VIP

# А теперь DNS-запрос из app к "web" — вернётся VIP, а не IP конкретного контейнера
docker exec app nslookup web 2>/dev/null || docker exec app getent hosts web

# Server:         127.0.0.11
# Address:        127.0.0.11:53

# Non-authoritative answer:

# Non-authoritative answer:
# Name:   web
# Address: 10.0.1.5
```

**Ключевое:** в Swarm-сервисах за одним именем стоит **VIP** (virtual IP), и балансировка на уровне ядра (IPVS) раскидывает запросы по репликам. Это **не** DNS round-robin — это **настоящий** L4-балансировщик.

### Часть E — сравнение с standalone

```bash
docker exec app getent hosts db
# Ожидаемо: 10.0.0.X db  ← конкретный IP, не VIP (standalone-контейнер)
```

**Что записать:**
- overlay требует Swarm (даже для standalone);
- `--attachable` обязателен для standalone-контейнеров;
- Swarm-сервисы получают **VIP**, и трафик балансируется на L4 (IPVS);
- DNS в overlay работает так же, как в bridge.

```bash
docker service rm web
docker rm -f app db
docker network rm my-overlay
docker swarm leave --force
```

---

## Lab 8. `network inspect`: разбор и `--format` — 20 мин

**Цель:** научиться быстро вытаскивать нужное из огромного JSON.

### Часть A — создать тестовую сеть с контейнерами

```bash
docker network create inspect-lab --subnet 172.30.0.0/16
docker run -d --name a1 --network inspect-lab alpine sleep 1000
docker run -d --name a2 --network inspect-lab --network-alias backend alpine sleep 1000

docker network inspect inspect-lab | head -60
```

**Что искать в JSON:**
- `.Driver` = `bridge`;
- `.IPAM.Config[0].Subnet` = `172.30.0.0/16`;
- `.Containers` — словарь `{container_id: {Name, IPv4Address, MacAddress}}`;
- `.Options` — опции драйвера.

### Часть B — `--format` для повседневных задач

**Подсеть и шлюз:**

```bash
docker network inspect inspect-lab \
  --format '{{range .IPAM.Config}}subnet={{.Subnet}} gateway={{.Gateway}}{{end}}'
# subnet=172.30.0.0/16 gateway=172.30.0.1
```

**Список контейнеров с IP:**

```bash
docker network inspect inspect-lab \
  --format '{{range .Containers}}{{.Name}} → {{.IPv4Address}}{{"\n"}}{{end}}'
# a1 → 172.30.0.2/16
# a2 → 172.30.0.3/16
```

**Только имена:**

```bash
docker network inspect inspect-lab --format '{{range .Containers}}{{.Name}} {{end}}'
# Ожидаемо: a1 a2
```

**Для всех сетей — подсеть:**

```bash
docker network ls --format '{{.Name}}' | while read n; do
  echo -n "$n: "
  docker network inspect "$n" --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}' 2>/dev/null || echo "-"
done

# app-network: 172.21.0.0/16
# bridge: 172.17.0.0/16
# docker_gwbridge: 172.24.0.0/16
# dotnet-libs_default: 172.18.0.0/16
# host:
# inspect-lab: 172.30.0.0/16
# none:
```

### Часть C — «а какой контейнер в какой сети?»

```bash
docker inspect a1 --format '{{range $name, $net := .NetworkSettings.Networks}}{{$name}}: {{$net.IPAddress}}{{"\n"}}{{end}}'
# inspect-lab: 172.30.0.2
```

Это **обратный** запрос — не «что в сети», а «в каких сетях контейнер».

**Что записать:**
- `.IPAM.Config` — подсеть/шлюз;
- `.Containers` — контейнеры с IP;
- `--format` с `range` — самый быстрый способ вытащить нужное;
- `docker inspect <container>` даёт **обратный** маппинг (сеть → IP).

```bash
docker rm -f a1 a2
docker network rm inspect-lab
```

---

## Lab 9. Контейнер в двух сетях, `gw-priority` — 20 мин

**Цель:** увидеть, как контейнер с двумя сетями выбирает **default gateway**, и как `gw-priority` это контролирует.

### Часть A — две сети, дефолтный gateway

```bash
docker network create net-front
docker network create net-back
docker run -d --name multi --network net-front --network net-back alpine sleep 1000

docker exec multi ip route
# default via 172.20.0.1 dev eth0
# 172.19.0.0/16 dev eth1 scope link  src 172.19.0.2
# 172.20.0.0/16 dev eth0 scope link  src 172.20.0.2
```

**Проблема:** какой из двух шлюзов **default** — не гарантировано. Зависит от порядка подключения, и в разных версиях Docker может быть по-разному.

### Часть B — `gw-priority` для контроля

```bash
docker rm -f multi

docker run -d --name multi \
  --network name=net-front,gw-priority=100 \
  --network name=net-back,gw-priority=10 \
  alpine sleep 1000

docker exec multi ip route
# default via 172.19.0.1 dev eth1
# это gateway для net-front сети
```

**Зачем:** если одна сеть имеет выход в интернет (DMZ), а другая — внутренняя (backend), нужно явно указать, что default gateway — **внешняя**.

### Часть C — проверка через `docker inspect`

```bash
docker inspect multi --format '{{json .NetworkSettings.Networks}}' | python3 -m json.tool

{
    "net-back": {
        "IPAMConfig": null,
        "Links": null,
        "Aliases": null,
        "DriverOpts": null,
        "GwPriority": 10,
        "NetworkID": "fb5e729a3d85d0eaa81b47ef526748b9bce14ae042547829c8b159fd2aeb9ec0",
        "EndpointID": "6cd1c272c341222942bd2c3daadd75ce318e55eff7fdb744ae0ac23c0a730332",
        "Gateway": "172.20.0.1",
        "IPAddress": "172.20.0.2",
        "MacAddress": "2e:b5:67:c6:8a:56",
        "IPPrefixLen": 16,
        "IPv6Gateway": "",
        "GlobalIPv6Address": "",
        "GlobalIPv6PrefixLen": 0,
        "DNSNames": [
            "multi",
            "1fd435614cd1"
        ]
    },
    "net-front": {
        "IPAMConfig": null,
        "Links": null,
        "Aliases": null,
        "DriverOpts": null,
        "GwPriority": 100,
        "NetworkID": "b7d4633cfcfe08264d62ea4367dbe616d148ca2b51d95772e92d706cf8e35692",
        "EndpointID": "668a10e8020040ab190ce92b49b816301c3e8f90b0a4e093f215de939c4c9ba0",
        "Gateway": "172.19.0.1",
        "IPAddress": "172.19.0.2",
        "MacAddress": "f6:7c:df:ec:72:f4",
        "IPPrefixLen": 16,
        "IPv6Gateway": "",
        "GlobalIPv6Address": "",
        "GlobalIPv6PrefixLen": 0,
        "DNSNames": [
            "multi",
            "1fd435614cd1"
        ]
    }
}
```

**Что записать:**
- контейнер может быть в нескольких сетях;
- **default gateway** не гарантирован без `gw-priority`;
- `gw-priority` задаётся **на сеть**, не на контейнер;
- для мульти-сетевых приложений — **всегда** указывай приоритет.

```bash
docker rm -f multi
docker network rm net-front net-back
```

---

## 🏁 Капстоун: 3-tier приложение на изолированной сети — 40 мин

**Цель:** собрать **frontend → backend → db** с правильной изоляцией и публикацией только frontend’а.

### Требования

- `frontend` (nginx) — публикуется на `8080:80`, доступен с Windows-хоста.
- `backend` (nginx, чтобы не ставить приложение) — **не** публикуется, доступен только из `frontend`.
- `db` (postgres) — **не** публикуется, доступен **только** из `backend`, **недоступен** из `frontend`.
- Сеть `front-net` — `frontend` + `backend`.
- Сеть `back-net` — `backend` + `db`.
- Все контейнеры **не** должны быть в дефолтном `docker0`.

### Шаги (сам, без подсказок)

1. Создай две сети.
2. Запусти `db` в `back-net` с паролем через `--env`.
3. Запусти `backend` в обеих сетях (`--network back-net` + `--network front-net`), с `--network-alias backend` в обеих.
4. Запусти `frontend` в `front-net` с `-p 8080:80`.
5. Проверь из `frontend`:
   - `ping backend` → работает;
   - `ping db` → **не** работает (изоляция);
6. Проверь из `backend`:
   - `ping db` → работает;
   - `ping frontend` → работает.
7. Проверь из PowerShell:
   - `curl http://localhost:8080` → 200 (frontend);
   - **нельзя** достучаться до backend или db напрямую.
8. **Bonus:** замени nginx-конфиг frontend’а на proxy_pass к `backend:80` — увидишь, что DNS работает и в **конфиге nginx** (не только в `ping`).

### Что измерить и записать

| Что | Как проверить | Ожидаемо |
|---|---|---|
| Frontend доступен с хоста | `curl localhost:8080` (PowerShell) | 200 |
| Backend **не** доступен с хоста | `curl localhost:80` | connection refused |
| DB **не** доступен с frontend | `docker exec frontend ping db` | bad address |
| DB доступен с backend | `docker exec backend ping db` | 0% packet loss |
| Backend доступен с frontend | `docker exec frontend ping backend` | 0% packet loss |
| Все контейнеры вне `docker0` | `docker network inspect bridge \| grep name` | пусто |

### Что записать в журнал

1. **Схема сетей** — кто в какой сети, кто с кем видится.
2. **Что сломалось на первом заходе** и почему (почти наверняка: забыл `--network-alias`, или подключил db к `front-net`).
3. **Проверка изоляции** — что реально проверял, что получил.
4. **Финальный compose** (если хочешь) — перепиши в `docker-compose.yml` с `networks:` и проверь, что `up` даёт то же поведение. Это мост к уроку 7.

### «Плохие» варианты, которые нужно уметь объяснить

- **Все три в одной сети** — просто, но db доступен из frontend. Если frontend скомпрометирован — db тоже.
- **Frontend в host-режиме** — работает, но `-p` игнорируется, и frontend видит **всю** сеть WSL-хоста.
- **DB в дефолтном bridge** — работает, но **любой** другой контейнер в `docker0` видит БД. И нет DNS между frontend и db.

В журнале — **сравнительная таблица**: «плохо vs хорошо» по безопасности и по DNS.

```bash
docker rm -f frontend backend db
docker network rm front-net back-net
```

---

## 📋 Чек-лист покрытия Урока 3

| Тема | Лаба |
|---|---|
| Дефолтный bridge `docker0`, его IP и ограничения | 0, 1 |
| IP-резолвинг в дефолтном bridge работает, DNS по именам — нет | 1A |
| `--link` legacy, работает через `/etc/hosts` | 1C |
| User-defined bridge, встроенный DNS `127.0.0.11` | 2A |
| `--network-alias` | 2B |
| Изоляция между сетями | 2C |
| `docker network connect` для запущенного контейнера | 2D |
| `-p host:container` (DNAT) | 3B |
| `-p 127.0.0.1:host:container` (только loopback) | 3C |
| `-P` и `EXPOSE` | 3D |
| «Из WSL работает, с Windows-хоста — нет» | 3A |
| `--network host`: `-p` игнорируется, конфликт портов | 4A, 4B, 4C |
| `--network none`: только loopback | 5 |
| `/etc/resolv.conf` с `127.0.0.11` | 6A |
| `--dns` и upstream | 6C |
| `localhost` в контейнере — это сам контейнер | 6D |
| Overlay требует Swarm | 7A, 7B |
| `--attachable` для standalone | 7C |
| Swarm-сервис → VIP (IPVS) | 7D |
| `network inspect`: `.IPAM`, `.Containers`, `--format` | 8 |
| `docker inspect` контейнера → обратный маппинг сетей | 8C |
| Контейнер в нескольких сетях, `gw-priority` | 9 |
| Капстоун: 3-tier с изоляцией | 🏁 |

---

## Что дальше

- **Урок 4 (Данные):** volumes, bind mounts, tmpfs, backup/restore, права, `/var/lib/docker/volumes`.
- **Урок 5 (Безопасность):** capabilities, seccomp, `--read-only`, `USER`, rootless.
- **Урок 6 (Ресурсы):** `--memory`, `--cpus`, `--pids-limit`, cgroup v2.
- **Урок 7 (Compose + CI/CD):** `docker compose`, `buildx bake`, GitHub Actions.
- **Урок 8 (Отладка в проде):** `exec`, `nsenter`, traces, structured logs.