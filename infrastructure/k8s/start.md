# Kubernetes с нуля: дружелюбный роадмап для senior-бэкендера

> **Кому:** ты уже уверенно работаешь с Docker (слои, multi-stage, SIGTERM, exit codes, compose, сети, volume, секреты, non-root). Это главное. **Kubernetes ты пока не знаешь вообще — и это нормально.**
>
> **Что будет:** мы пойдём маленькими шагами. Сначала ты запустишь свой первый кластер и задеплоишь в него nginx. Потом разберёшься, почему это работает именно так. И только потом — сеть, безопасность, операторы. **Не наоборот.**
>
> **Главное правило:** не зубри `kubectl`. Понимай **сущности**. Команды запомнятся сами за пару дней практики.

---

## Как читать этот документ

Каждая фаза — это один «этаж». Не перескакивай.

Внутри фазы три уровня — как в твоём Docker-README:

- **🟢 Уровень 1 — делаешь руками.** Это твоя ежедневная работа. Без этого нельзя.
- **🟡 Уровень 2 — понимаешь модель.** Знаешь, «куда смотреть», но не обязан помнить флаги.
- **🔵 Уровень 3 — слышал звон.** Знаешь, что существует, и зовёшь человека. Это зона SRE/платформы/безопасности.

В конце каждой фазы — **🧪 лаборатория** (конкретные шаги) и **✅ проверка** (можешь объяснить и починить — значит, идёшь дальше).

---

## Прежде чем начать: одна аналогия, которая всё объясняет

Kubernetes — это **кухня ресторана**。

| На кухне | В Kubernetes | Что это значит для тебя |
|---|---|---|
| **Шеф-повар** | Control plane | Решает, какая станция что готовит |
| **Станции** (гриль, паста, десерт) | Nodes (ноды) | Машины, на которых всё крутится |
| **Повара** | Pods (поды) | Кто реально выполняет работу |
| **Рецепты** | YAML-манифесты | Инструкции: «приготовить вот это» |
| **Официант** | Service | Стабильная точка, куда приходит заказ |

Ты **не говоришь повару «положи кирпич сюда»** (императивно). Ты даёшь **чертёж** (YAML) менеджеру, и он **постоянно проверяет**: кирпича нет → добавить; криво → выровнять; рухнул → перестроить. Это и есть **declarative + control loop** — главная идея Kubernetes.

**Твоя Docker-база уже даёт тебе половину понимания.** Ты знаешь, что такое контейнер, слой, SIGTERM, OOM. Kubernetes просто **оркестрирует** эти контейнеры на многих машинах. Он не заменяет Docker — он им управляет.

---

## Фаза 0. Первый кластер за 15 минут (неделя 1)

**Цель фазы:** увидеть Kubernetes своими глазами и запустить первый под. Не читать про него — **запустить**.

### 🟢 Уровень 1 — делаешь руками

**Поставь локальный кластер.** Два самых дружелюбных варианта:

| Инструмент | Что это | Кому подходит |
|---|---|---|
| **Minikube** | Один узел в VM или контейнере. Самый документированный, «для обучения». | Если хочешь «просто работает» |
| **kind** (Kubernetes in Docker) | Узлы — это Docker-контейнеры. Быстро стартует, ты уже знаешь Docker. | Если хочешь быстрее и ближе к CI |

**Рекомендация:** начни с **Minikube**. Потом попробуй kind — увидишь разницу.

**Установка (Minikube, Linux/Mac):**
```bash
# 1. Установи minikube (инструкция на minikube.sigs.k8s.io)
# 2. Запусти кластер
minikube start

# 3. Проверь, что всё живо
kubectl get nodes
# Должен увидеть одну ноду в статусе Ready
```

**Запусти первый под:**
```bash
kubectl run nginx --image=nginx:1.25 --port=80
kubectl get pods
# nginx   1/1   Running   0   10s
```

Поздравляю. Ты только что запустил контейнер в Kubernetes. **Но пока — как в Docker, только командой `kubectl`.** Дальше — интереснее.

### 🟡 Уровень 2 — понимаешь модель

**Что такое Pod и почему не контейнер.**

Pod — **минимальная единица деплоя**. Не контейнер. Не Deployment. **Pod.**

Pod — это **обёртка** вокруг одного или нескольких контейнеров, которые:
- делят **сеть** (один IP, `localhost` между ними),
- делят **хранилище** (volumes),
- всегда **вместе** планируются на одну ноду,
- **смертны**: могут умереть в любой момент и не воскреснут сами.

**Зачем несколько контейнеров в одном поде?** Иногда они жёстко связаны: основной app + sidecar с логами. Им нужно общаться через `localhost` и делить файлы. Pod это позволяет.

> **Мост из Docker:** в Docker ты запускал один контейнер = один процесс. В Kubernetes ты запускаешь Pod = «логическая машина» с одним или несколькими контейнерами. Это следующий уровень абстракции.

### 🔵 Уровень 3 — слышал звон

Пока не надо. Всё, что касается внутренностей control plane (apiserver, etcd, scheduler) — на этом этапе просто знай, что они **существуют**.

### 🧪 Лаборатория

1. `minikube start` → `kubectl get nodes` → `kubectl get pods`
2. `kubectl run nginx --image=nginx:1.25`
3. `kubectl describe pod nginx` — посмотри Events (pull image, start container).
4. `kubectl logs nginx` — это как `docker logs`.
5. `kubectl exec -it nginx -- /bin/bash` — зайди внутрь, сделай `curl localhost`.
6. `kubectl port-forward pod/nginx 8080:80` → открой `http://localhost:8080` — увидишь «Welcome to nginx!».

### ✅ Проверка

Ты можешь:
- запустить кластер одной командой,
- запустить под,
- посмотреть его логи,
- зайти внутрь,
- достучаться до него с ноутбука.

**Этого достаточно, чтобы двигаться дальше.** Не пытайся понять всё сразу.

---

## Фаза 1. Три кирпича: Pod, Deployment, Service (2 недели)

**Цель фазы:** понять три сущности, которые ты будешь использовать в **99% реальных сценариев**.

### 🟢 Уровень 1 — делаешь руками

**Пиши YAML, а не команды.** `kubectl run` — это как `docker run`: быстро, но не для прода. Сразу привыкай к манифестам.

**`first-deployment.yaml`:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        ports:
        - containerPort: 80
```

```bash
kubectl apply -f first-deployment.yaml
kubectl get deployments
kubectl get pods
# Будет 2 пода
```

**Теперь Service — стабильная точка входа:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  selector:
    app: nginx
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

```bash
kubectl apply -f service.yaml
kubectl get svc
```

Поды **эфемерны** — их IP меняются. Service даёт **постоянный вход** и распределяет трафик.

### 🟡 Уровень 2 — понимаешь модель

**Чем Deployment отличается от Pod.**

| Pod | Deployment |
|---|---|
| Один. Умер — всё. | Говорит: «хочу 2 реплики». Умерла одна — **поднимает новую**. |
| Для тестов. | Для реальных приложений. |
| Не обновляется «на лету». | Умеет **rolling update** и **rollback**. |

**Deployment — это «рабочая лошадка» для stateless-приложений.** Ты говоришь *сколько* подов хочешь, а не *какие*. Он сам следит, чтобы их всегда было столько.

**Service — зачем он нужен.** Поды приходят и уходят, их IP меняются. Service — это **постоянный DNS-имя и IP**, который не меняется. За ним стоит набор подов, и трафик распределяется между ними.

> **Мост из Docker:** в compose ты ходил в `db` по имени сервиса. В Kubernetes ты ходишь в `my-service` — но за этим именем стоит не один контейнер, а **набор подов**, и Service сам решает, кому отдать запрос.

### 🔵 Уровень 3 — слышал звон

ReplicaSet, DaemonSet, Job, CronJob — существуют, ReplicaSet, DaemonSet, Job, CronJob — существуют, но пока не нужны. Deployment покрывает 80% случаев.но пока не нужны. Deployment покрывает 80% случаев.

### 🧪 Лаборатория

1. Примени `first-deployment.yaml` → `kubectl get pods` (должно быть 2).
2. Убей один под: `kubectl delete pod <имя>` → `kubectl get pods` → **Deployment поднял новый**.
3. Примени `service.yaml` → `kubectl get svc`.
4. `kubectl port-forward svc/nginx-service 8080:80` → открой `http://localhost:8080`.
5. Измени `replicas: 2` на `3` → `kubectl apply` → `kubectl get pods` (стало 3). Это **scaling**.

### ✅ Проверка

Можешь объяснить **своими словами**:
- Чем Pod отличается от Deployment.
- Зачем нужен Service, если есть Pod.
- Что произойдёт, если удалить под, которым управляет Deployment.

**Если можешь — переходи дальше.** Не надо помнить синтаксис YAML наизусть.

---

## Фаза 2. Как приложение «живёт»: probes, ресурсы, конфиги (2 недели)

**Цель фазы:** научиться говорить Kubernetes, **как понять, что приложение здорово**, и **сколько ему ресурсов**.

### 🟢 Уровень 1 — делаешь руками

**Добавь probes в Deployment:**
```yaml
spec:
  containers:
  - name: nginx
    image: nginx:1.25
    resources:
      requests:
        memory: "64Mi"
        cpu: "100m"
      limits:
        memory: "128Mi"
        cpu: "200m"
    readinessProbe:
      httpGet:
        path: /
        port: 80
      initialDelaySeconds: 5
      periodSeconds: 10
    livenessProbe:
      httpGet:
        path: /
        port: 80
      initialDelaySeconds: 15
      periodSeconds: 20
```

**Requests vs Limits — главная путаница новичков:**

| | Requests | Limits |
|---|---|---|
| Что это | «Мне **минимум** столько нужно» | «Мне **максимум** столько можно» |
| Кто использует | **Scheduler** — ищет ноду, где хватит места | **Ядро (cgroups)** — режет, если превысил |
| Если превысил | Под не запустится (Pending) | CPU throttling или **OOMKilled** |

> **Мост из Docker:** в Docker ты ставил `--memory` и `--cpus`. В Kubernetes `limits` — это **то же самое**. А `requests` — новая штука: это **бронь** для планировщика. Ты как бы говоришь: «не ставь меня на ноду, где нет столько свободного места».

**ConfigMap и Secret — конфиги отдельно от образа:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  APP_MODE: "production"
  LOG_LEVEL: "info"
```

```bash
kubectl create configmap app-config --from-literal=APP_MODE=production
# или
kubectl apply -f configmap.yaml
```

В Deployment:
```yaml
envFrom:
- configMapRef:
    name: app-config
```

> **Мост из Docker:** в Docker ты использовал `ENV` и `.env` файлы. ConfigMap — это **то же самое**, но конфиг живёт **отдельно от образа** и обновляется без пересборки. Secret — то же, но для чувствительных данных (base64 — это **не шифрование**, просто кодировка; для реальной защиты нужен External Secrets / Vault).

### 🟡 Уровень 2 — понимаешь модель

**Три типа probes — что они **не** лечат.**

| Probe | Вопрос | Что будет, если не проходит |
|---|---|---|
| **readinessProbe** | «Готов принимать трафик?» | Service **перестанет** слать трафик в этот под |
| **livenessProbe** | «Ты ещё жив?» | Kubelet **убьёт** под и создаст новый |
| **startupProbe** | «Ты уже запустился?» | Пока не пройдёт — liveness не работает |

**Важно:** probes **не лечат** плохой код. Если приложение зависло из-за дедлока, liveness убьёт его — но дедлок вернётся. Probes — это **детектор**, а не лекарство.

**Graceful shutdown — твоя зона ответственности.**
В Docker ты знал: приложение должно ловить SIGTERM и умирать за 10 секунд. В Kubernetes — **то же самое**, но с нюансом: `terminationGracePeriodSeconds` (по умолчанию 30 секунд). Kubernetes сначала **выводит под из Service** (перестаёт слать трафик), потом шлёт SIGTERM. Если приложение не умерло за grace period — **SIGKILL**.

> **Мост из Docker:** это прямой перенос твоего Docker-знания про PID 1 и SIGTERM. Просто в Kubernetes добавляется шаг «сначала убрать из балансировки».

### 🔵 Уровень 3 — слышал звон

QoS-классы (Guaranteed/Burstable/BestEffort) и eviction — платформенная тема. Знай, что существуют, но не углубляйся.

### 🧪 Лаборатория

1. Добавь probes в Deployment → `kubectl describe pod` → посмотри, как меняется статус.
2. Создай ConfigMap → подключи через `envFrom` → `kubectl exec` → `env | grep APP_MODE`.
3. Поставь `limits.memory: "32Mi"` для nginx → под должен упасть с **OOMKilled** (`kubectl describe pod` покажет `OOMKilled`).
4. Поставь `requests.memory: "10Gi"` → под уйдёт в **Pending** (`kubectl describe pod` → `Events` → `Insufficient memory`). Это **scheduling**, а не OOM.

### ✅ Проверка

Можешь по `kubectl describe pod` определить:
- Почему под в `Pending` (не хватает resources / affinity / PVC).
- Почему под в `CrashLoopBackOff` (смотри `logs --previous`).
- Почему под `OOMKilled` (limits слишком маленькие).

---

## Фаза 3. Отладка: что делать, когда «не работает» (1–2 недели)

**Цель фазы:** превратить «оно сломалось» в «вот причина и вот фикс». Это твоя **ежедневная** суперсила.

### 🟢 Уровень 1 — делаешь руками

**Порядок действий при любом инциденте:**

```bash
# 1. Что вообще происходит?
kubectl get pods
kubectl get events --sort-by=.metadata.creationTimestamp

# 2. Детали конкретного пода
kubectl describe pod <имя>

# 3. Логи (и предыдущего запуска, если CrashLoopBackOff)
kubectl logs <имя>
kubectl logs <имя> --previous

# 4. Зайти внутрь (если есть shell)
kubectl exec -it <имя> -- sh

# 5. Если образа distroless (нет shell) — debug-под
kubectl debug -it <имя> --image=busybox --target=<имя>
```

**Самые частые статусы и что они значат:**

| Статус | Что случилось | Куда смотреть |
|---|---|---|
| `Pending` | Не может найти ноду | `describe` → Events: resources, affinity, PVC |
| `ImagePullBackOff` | Не может скачать образ | Опечатка в имени, нет доступа к registry |
| `CrashLoopBackOff` | Приложение падает при старте | `logs --previous` — там ответ |
| `OOMKilled` | Превысил memory limit | `describe` → Last State → OOMKilled |
| `Running`, но не работает | Живой, но не готов | `readinessProbe`, Service selector, порт |

### 🟡 Уровень 2 — понимаешь модель

**Почему `kubectl logs` — не всегда ответ.**
Если под упал **до** того, как приложение успело что-то написать, логов не будет. Тогда смотри `describe` → `Events`. Там будет `Failed to pull image`, `FailedMount`, `Insufficient memory` и т.д.

**Почему `kubectl debug` — must know.**
С distroless-образами (без shell) `kubectl exec` не работает. `kubectl debug` поднимает **ephemeral container** рядом с твоим — с shell и инструментами. Это современный способ отладки в Kubernetes.

### 🔵 Уровень 3 — слышал звон

`nsenter`, sidecar-дебаг через `--pid=container`, auditd — SRE-инструментарий. Знай, что существует.

### 🧪 Лаборатория

1. Специально сломай Deployment: `image: nginx:does-not-exist` → `kubectl get pods` → `ImagePullBackOff`.
2. `kubectl describe pod` → найди в Events причину.
3. Поставь `command: ["sh", "-c", "exit 1"]` → `CrashLoopBackOff` → `kubectl logs --previous`.
4. Установи `limits.memory: "16Mi"` для nginx → `OOMKilled` → `kubectl describe pod` → `Last State: OOMKilled`.

### ✅ Проверка

По симптому («под не запускается») ты **за 5 минут** находишь причину через `describe` + `logs` + `events`.

---

## Фаза 4. Сеть: Service, Ingress, DNS (2–3 недели)

**Цель фазы:** понять, как трафик попадает в под, и почему «api не видит db» — это почти всегда DNS или Service.

### 🟢 Уровень 1 — делаешь руками

**Три типа Service:**

| Тип | Что делает | Когда использовать |
|---|---|---|
| **ClusterIP** | Внутренний IP, доступен только внутри кластера | Межсервисное общение |
| **NodePort** | Открывает порт на каждой ноде | Быстрый доступ снаружи (dev) |
| **LoadBalancer** | Создаёт внешний LB (в облаке) | Прод, если есть облако |

**Ingress — один вход для HTTP-трафика:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx-ingress
spec:
  rules:
  - host: myapp.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nginx-service
            port:
              number: 80
```

**DNS внутри кластера:**
```bash
kubectl run debug --image=busybox --rm -it --restart=Never -- sh
# внутри:
nslookup nginx-service
# nginx-service.default.svc.cluster.local
```

Формат: `<service>.<namespace>.svc.cluster.local`.

### 🟡 Уровень 2 — понимаешь модель

**Почему «api не видит db» — это не магия.**
Когда ты обращаешься к `db` из пода `api`, CoreDNS резолвит `db` в `db.<namespace>.svc.cluster.local`. Если это не работает, причины почти всегда одни и те же:

1. `db` — не Service, а Pod (у пода нет стабильного DNS-имени).
2. `api` и `db` в **разных namespace**, а ты не указал полное имя.
3. Service `db` существует, но **selector не совпадает** с labels подов (поэтому endpoints пустые).
4. NetworkPolicy блокирует трафик.

> **Мост из Docker:** в Docker user-defined bridge ты ходил по имени контейнера через embedded DNS. В Kubernetes — то же самое, но через **CoreDNS**, и имя имеет формат `<service>.<ns>.svc.cluster.local`. Если в Docker ты уже дебажил «почему api не видит db», здесь принцип тот же.

**Gateway API вместо Ingress.**
Ingress — старый стандарт, и Ingress-NGINX **EOL в марте 2026**. Для новых проектов смотри **Gateway API** — это рекомендованный путь. Но для обучения начни с Ingress: концепция та же, а материалов больше.

### 🔵 Уровень 3 — слышал звон

CNI-плагины (Calico, Cilium), eBPF, kube-proxy в режиме IPVS — платформенная зона. Знай, что «сеть в Kubernetes — это CNI-плагин», и не углубляйся, пока не понадобится.

### 🧪 Лаборатория

1. Создай два Deployment (`api`, `db`) и Service для каждого.
2. Из пода `api`: `kubectl exec -it <api-pod> -- nslookup db`.
3. **Сломай** selector в Service `db` (поставь неправильный label) → `kubectl get endpoints db` → пусто. Починить → endpoints появились.
4. Настрой Ingress → добавь `127.0.0.1 myapp.local` в `/etc/hosts` → `kubectl port-forward` для ingress-контроллера → открой `http://myapp.local`.

### ✅ Проверка

По симптому «api не видит db по имени» ты выдаёшь **чеклист из 5+ шагов**: Service существует? selector совпадает? namespace тот? DNS резолвится? NetworkPolicy пускает?

---

## Фаза 5. Безопасность: базовый минимум (2 недели)

**Цель фазы:** не быть тем, кто случайно дал разработчику `cluster-admin`.

### 🟢 Уровень 1 — делаешь руками

**RBAC — кто что может:**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: dev
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: dev
subjects:
- kind: User
  name: developer
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

**securityContext — non-root, read-only FS:**
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  readOnlyRootFilesystem: true
  capabilities:
    drop: ["ALL"]
```

> **Мост из Docker:** в Docker ты делал `USER`, `--read-only`, `--cap-drop=ALL`. В Kubernetes — **те же самые концепции**, только в YAML. Ты уже это знаешь.

**Pod Security Standards (PSS) — три профиля:**
- `privileged` — без ограничений (не для прода).
- `baseline` — минимальные ограничения.
- `restricted` — жёстко: non-root, no capabilities, seccomp required.

**Цель:** твой namespace должен проходить `restricted`. Проверка:
```bash
kubectl label namespace dev pod-security.kubernetes.io/enforce=restricted
kubectl get pods -n dev
# Если что-то не проходит — увидишь warning
```

### 🟡 Уровень 2 — понимаешь модель

**Secret — не секрет.**
Kubernetes Secret по умолчанию хранится в etcd в base64. Это **кодировка, а не шифрование**. Любой, у кого есть доступ к etcd, прочитает. Решение: **External Secrets Operator** + Vault. Секрет живёт в Vault, в Kubernetes приходит только ссылка.

**Kyverno — политики без кода.**
Пишешь YAML: «запретить `:latest`», «требовать `runAsNonRoot`», «запретить образы без подписи». Admission webhook блокирует неподходящие поды до запуска.

### 🔵 Уровень 3 — слышал звон

Falco (runtime security), seccomp-профили, auditd — security/platform-зона. Знай, что существует.

### 🧪 Лаборатория

1. Создай namespace `dev`, Role `pod-reader`, RoleBinding для пользователя.
2. Проверь: `kubectl auth can-i get pods --namespace=dev` (от имени пользователя).
3. Добавь `securityContext` с `runAsNonRoot: true` → попробуй запустить образ, который работает от root → под упадёт.
4. Поставь label `pod-security.kubernetes.io/enforce=restricted` → посмотри, какие поды не проходят.

### ✅ Проверка

Ты можешь провести аудит namespace на PSS `restricted` и объяснить, **почему** каждый непроходящий под не проходит.

---

## Фаза 6. GitOps: деплой из Git, а не из ноутбука (2 недели)

**Цель фазы:** перестать делать `kubectl apply` вручную. Всё — из Git.

### 🟢 Уровень 1 — делаешь руками

**Argo CD — самый популярный GitOps-инструмент.**

```bash
# Установка (упрощённо)
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Доступ к UI
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

**Что делает Argo CD:**
1. Смотрит в Git-репозиторий.
2. Сравнивает «что в Git» с «что в кластере».
3. Если расхождение — **синхронизирует** (или показывает drift).

**Откат = `git revert`.** Всё аудируемо, всё воспроизводимо.

**Helm или Kustomize — как шаблонизировать YAML:**
- **Helm** — пакетный менеджер, `values.yaml` для параметров.
- **Kustomize** — overlays для разных окружений (dev/staging/prod) без шаблонизации.

> **Мост из Docker:** в compose ты не делал GitOps, но идея та же, что «инфраструктура как код». Только теперь код в Git, а Argo CD — это «compose up», который следит за состоянием.

### 🟡 Уровень 2 — понимаешь модель

**Drift detection.** Кто-то сделал `kubectl edit` вручную → Argo CD видит расхождение с Git → показывает «OutOfSync». В правильно настроенном кластере ручные изменения **запрещены** (или автоматически откатываются).

**App-of-apps.** Один Argo CD Application управляет другими Application. Так деплоят десятки сервисов.

### 🔵 Уровень 3 — слышал звон

Progressive delivery (canary, blue-green) через Argo Rollouts/Flagger — продвинутая тема.

### 🧪 Лаборатория

1. Установи Argo CD.
2. Создай Git-репозиторий с `deployment.yaml` и `service.yaml`.
3. Создай Application, укажи repo URL и path.
4. Нажми Sync → увидь, как поды появились в кластере.
5. Измени `replicas` в Git → Argo CD покажет `OutOfSync` → Sync → поды обновились.

### ✅ Проверка

Любой деплой воспроизводим из Git. Откат — `git revert`. Ты можешь объяснить, что произойдёт, если кто-то сделает `kubectl edit` вручную.

---

## Фаза 7. Что дальше (когда пройдёшь предыдущее)

**Это уже не для «начинающего».** Но чтобы ты знал, куда растёт senior platform engineer:

| Тема | Зачем |
|---|---|
| **Control plane deep dive** (apiserver, etcd, scheduler) | Понимать, где ломается кластер |
| **CNI/CSI** (Calico, Cilium, StorageClass) | Платформенная сеть и хранилище |
| **CRD + controllers/operators** | Расширять Kubernetes под свою платформу |
| **Multi-cluster / Cluster API** | Управлять >1 кластером |
| **etcd backup/restore** | Disaster recovery |
| **CKA / CKS** | Подтвердить навыки (ориентир, не самоцель) |

**Ресурсы для дальнейшего роста:**
- **Kubernetes the Hard Way** (Kelsey Hightower) — собрать control plane руками. Лучший способ понять, как всё устроено.
- **Killercoda** — интерактивные сценарии в браузере, без установки.
- **KodeKloud** — лабы, включая CKA/CKS.
- **CNCF Top 28 resources 2026** — курированный список.

---

## Таймлайн (при 10–15 ч/нед)

| Недели | Фаза | Что будет уметь |
|---|---|---|
| 1 | Фаза 0 | Запустить кластер, под, логи, exec, port-forward |
| 2–3 | Фаза 1 | Deployment, Service, scaling, YAML |
| 4–5 | Фаза 2 | Probes, resources, ConfigMap, Secret |
| 6–7 | Фаза 3 | Диагностика: Pending, CrashLoop, OOMKilled |
| 8–10 | Фаза 4 | Service types, Ingress, DNS, NetworkPolicy |
| 11–12 | Фаза 5 | RBAC, securityContext, PSS |
| 13–14 | Фаза 6 | Argo CD, GitOps |
| 15+ | Фаза 7 | Control plane, CNI, операторы — по желанию |

---

## Чеклист «я уверенно знаю базу Kubernetes»

- [ ] Могу запустить локальный кластер (Minikube/kind).
- [ ] Пишу Deployment + Service в YAML и деплою.
- [ ] Понимаю разницу Pod / Deployment / Service.
- [ ] Настраиваю probes и resources (requests/limits).
- [ ] По `kubectl describe pod` нахожу причину: Pending, CrashLoopBackOff, OOMKilled.
- [ ] Настраиваю Ingress и знаю, как резолвится DNS внутри кластера.
- [ ] Настраиваю RBAC и `securityContext` (non-root, read-only FS).
- [ ] Деплою через Argo CD из Git.

**Если 7 из 8 — ты готов идти дальше, в сторону платформенной инженерии.**

---

> **Последнее, самое важное:** Kubernetes **не учится за неделю**. И это нормально. Ты уже сделал главное — разобрался с Docker. Теперь просто иди **маленькими шагами**: запусти кластер → задеплой nginx → сломай → почини. Понимание придёт из **практики**, а не из чтения. Не сравнивай себя с теми, кто «уже знает» — они тоже когда-то запускали свой первый nginx и смотрели, почему он в `CrashLoopBackOff`.