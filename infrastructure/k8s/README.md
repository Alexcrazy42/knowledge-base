# Kubernetes Deep-Dive Roadmap — Senior Platform Engineer

> **Для кого:** senior инженер платформенной команды с сильным Docker-фундаментом (namespaces, cgroups, overlay2, OOM, capabilities, seccomp, BuildKit secrets).
> **Цель:** не «научиться kubectl», а понимать Kubernetes ниже API-поверхности — control plane, CNI/CSI, admission, etcd, scheduling, multi-tenancy — и уметь строить и эксплуатировать платформу, а не просто деплоить Pod’ы.

---

## 0. Предварительные требования (закрыть до старта)

Docker-база снимает нижний слой, но в K8s есть два места, где пробелы из Docker-теста станут ежедневной болью. Закройте их **до** погружения в control plane.

| Тема | Что нужно понять | Зачем в K8s |
|---|---|---|
| **CNI и IP-per-Pod** | Как Pod получает IP, чем overlay (VXLAN) отличается от routed/L2, что такое veth, bridge, iptables/IPVS | В Docker вы знали bridge/host/overlay/macvlan — здесь это **CNI-плагины** (Calico, Cilium, Flannel) |
| **DNS в кластере** | CoreDNS, резолвинг `<svc>.<ns>.svc.cluster.local`, headless-сервисы, `ndots` | В Docker был embedded DNS `127.0.0.11` — здесь CoreDNS + kube-dns Service |
| **Linux networking** | iptables conntrack, IPVS, eBPF (обзорно) | kube-proxy, NetworkPolicy, Cilium |

**Ресурс:** [Kubernetes Networking Deep Dive](https://iq-universe.github.io/iq-blog/series/kubernetes-deep-dive/) (серия из 7 частей, включая сеть и storage).

**Практика:** поднимите kind-кластер, запустите два Pod’а, посмотрите `ip route`, `iptables-save`, `nslookup` изнутри Pod’а. Это лучший способ «пощупать» CNI и DNS.

---

## 1. Control Plane Deep Dive

**Цель:** понимать каждый компонент и путь запроса от `kubectl apply` до Running-контейнера.

| Компонент | Что копать |
|---|---|
| **kube-apiserver** | Цепочка AuthN → AuthZ → Mutating Admission → Schema/CEL validation → Validating Admission → Conversion → Storage → Watch fan-out |
| **etcd** | Raft, MVCC, watch, lease, compaction, backup/restore, defrag, квоты |
| **kube-scheduler** | Framework plugins, predicates/priorities, preemption, topology spread, custom schedulers |
| **kube-controller-manager** | Reconcile loop, informer/workqueue, Deployment/ReplicaSet/GC/Node controllers |
| **kubelet** | PLEG state machine, CRI, probes, graceful shutdown, eviction |
| **CRI** | containerd vs CRI-O, snapshotter, `crictl` |
| **Cloud-controller-manager** | LB, route, node, volume — как облако интегрируется |

**Ключевая ментальная модель:** Kubernetes — это распределённая машина состояний вокруг etcd-лога, где каждый компонент — контроллер, который watch’ит объекты и reconcile’ит реальное состояние к декларированному.

**Ресурсы:**
- **Kubernetes the Hard Way** (Kelsey Hightower) — обязательный практикум: собрать control plane и worker’ы вручную, без скриптов.
- «Kubernetes Production Mastery» curriculum — production-фокус для senior platform engineers.
- Статьи из deep-dive серии: «Почему всё через API Server», «Как Pod рождается и умирает».

**Практика (lab):**
1. Поднимите кластер через `kubeadm` на 3 VM (1 CP + 2 worker).
2. Сломайте etcd (остановите) — посмотрите, что происходит с API и с уже запущенными Pod’ами.
3. Сделайте `etcdctl snapshot save` и restore.
4. Напишите простой controller на client-go, который watch’ит ConfigMap и пишет лог.

**Критерий готовности:** можете нарисовать полный путь `kubectl apply` → apiserver → etcd → scheduler → kubelet → CRI → running container, с указанием, где что может сломаться.

---

## 2. Networking (CNI, Service, Ingress, NetworkPolicy)

**Цель:** диагностировать «Pod не видит Service», «Ingress 502», «NetworkPolicy не пускает», понимать data plane.

| Слой | Темы |
|---|---|
| **Pod-to-Pod** | CNI-плагины: Calico (BGP, iptables), Cilium (eBPF), Flannel (VXLAN), routed vs overlay |
| **Service** | ClusterIP, NodePort, LoadBalancer, ExternalName; kube-proxy iptables vs IPVS; headless |
| **Ingress / Gateway API** | Ingress-контроллеры (nginx, Traefik), Gateway API как successor |
| **DNS** | CoreDNS, stub domains, `ndots`, headless-резолвинг |
| **NetworkPolicy** | Default-deny, egress/ingress, namespaceSelector, ipBlock; ограничения CNI |
| **Service Mesh** | Istio/Linkerd: mTLS, traffic shifting, observability — когда нужен, когда overkill |

**Ресурсы:**
- [Kubernetes Deep Dive — Networking](https://iq-universe.github.io/iq-blog/series/kubernetes-deep-dive/).
- Cilium docs (eBPF dataplane) — для platform-уровня.
- «Kubernetes Networking» (книга / курс) — если нужен структурированный текст.

**Практика (lab):**
1. Разверните Calico и Cilium по очереди на kind; сравните `iptables-save` и eBPF-карты.
2. Напишите NetworkPolicy default-deny + разрешите только конкретный namespace.
3. Сломайте CoreDNS — посмотрите, как ведёт себя резолвинг и как это диагностировать (`kubectl run debug --image=nicolaka/netshoot`).
4. Настройте Ingress с TLS и Gateway API — сравните.

**Критерий готовности:** по симптому («A не пингует B по имени») выдаёте упорядоченный чеклист из 8+ шагов, включая DNS, NetworkPolicy, CNI, kube-proxy, Service endpoints.

---

## 3. Storage (CSI, PV/PVC, StatefulSet)

**Цель:** понимать жизненный цикл тома, выбирать StorageClass, запускать stateful-нагрузки осознанно.

| Тема | Что копать |
|---|---|
| **CSI** | Три фазы: provisioning, attach, mount; controller vs node plugins |
| **PV/PVC** | Binding, reclaim policy, access modes (RWO/ROX/RWX/RWOP) |
| **StorageClass** | Dynamic provisioning, volumeBindingMode (WaitForFirstConsumer), allowVolumeExpansion |
| **StatefulSet** | Stable network ID, ordered rollout, PVC templates |
| **emptyDir / hostPath** | Когда можно, когда антипаттерн |
| **БД в K8s** | Операторы (CloudNativePG, Vitess), когда managed-БД лучше |

**Ресурсы:**
- Deep-dive серия, часть 4: «Почему storage такой сложный» — от emptyDir до CSI three-phase mount.
- CSI spec (обзорно) + docs вашего облачного CSI (EBS, Azure Disk, GCE PD).

**Практика (lab):**
1. Разверните StatefulSet с PVC template (3 реплики), убейте Pod — проверьте, что PVC переиспользуется.
2. Создайте StorageClass с `WaitForFirstConsumer` и без — сравните поведение scheduling.
3. Разверните оператор CloudNativePG (или PostgreSQL operator) и сделайте failover.

**Критерий готовности:** можете объяснить, почему Pod в `Pending` из-за PVC, и как это исправить на уровне StorageClass / node affinity.

---

## 4. Workloads, Scheduling & Resource Management

**Цель:** управлять размещением, ресурсами и жизненным циклом нагрузок в production.

| Тема | Что копать |
|---|---|
| **Requests vs Limits** | Главная путаница новичков: requests → scheduling, limits → throttling/OOM |
| **QoS** | Guaranteed / Burstable / BestEffort — как влияет на eviction |
| **Scheduling** | Affinity/anti-affinity, taints/tolerations, topology spread, priority/preemption |
| **Autoscaling** | HPA (metrics), VPA, Cluster Autoscaler / Karpenter |
| **PDB** | PodDisruptionBudget — защита при drain/upgrade |
| **Probes** | Startup / readiness / liveness — правильные таймауты и что они **не** лечат |
| **Graceful shutdown** | `terminationGracePeriodSeconds`, preStop, SIGTERM — прямой перенос Docker-знания |

**Ресурсы:**
- Deep-dive часть 5: «Как K8s делит и защищает ресурсы» — cgroups → QoS → HPA/VPA/CA.
- Karpenter docs (если облако) — современный autoscaling.

**Практика (lab):**
1. Создайте Deployment с `requests` без `limits` и с `limits` — сравните поведение при нагрузке и OOM.
2. Настройте HPA на custom metric (например, RPS через Prometheus Adapter).
3. Сделайте drain ноды с PDB и без — посмотрите разницу.
4. Смоделируйте «Pod OOMKilled» и «Pod Pending из-за requests» — напишите runbook.

**Критерий готовности:** можете по `kubectl describe pod` определить, почему Pod не запускается (resources, affinity, taints, PVC), и предложить фикс.

---

## 5. Security & Multi-tenancy

**Цель:** строить платформу с least privilege, изоляцией и supply-chain безопасностью.

| Тема | Что копать |
|---|---|
| **AuthN/AuthZ** | ServiceAccount, RBAC (Role/ClusterRole/Binding), OIDC, impersonation |
| **Admission** | Validating/Mutating webhooks, CEL `ValidatingAdmissionPolicy`, Kyverno/OPA Gatekeeper |
| **Pod Security** | Pod Security Standards (restricted/baseline), `securityContext`: runAsNonRoot, readOnlyRootFilesystem, capabilities drop, seccomp |
| **Secrets** | External Secrets Operator, Vault, sealed-secrets — почему native Secret не «секрет» |
| **Supply chain** | cosign verify, SBOM (syft), trivy, Kyverno policy на digest/signature |
| **Multi-tenancy** | Namespace isolation, NetworkPolicy, ResourceQuota, LimitRange, vCluster / Capsule / HNC |

**Ресурсы:**
- CKS (Certified Kubernetes Security Specialist) curriculum — обязательный ориентир.
- Deep-dive часть 7: «Как K8s управляет собой» — Operator, Admission Webhook, Service Mesh.
- «Kubernetes & OpenShift Best Practices Guide 2026» — Part 5 (RBAC, Pod Security Admission).

**Практика (lab):**
1. Настройте RBAC: разработчик может только `get/list` Pod’ов в своём namespace.
2. Напишите Kyverno-политику, запрещающую `:latest` и require `runAsNonRoot`.
3. Разверните External Secrets Operator + Vault (dev) — секрет не в Git.
4. Проверьте образ через cosign verify + trivy; настройте admission, который блокирует unsigned образы.

**Критерий готовности:** можете провести аудит кластера на PSS restricted и объяснить каждый пункт, который не проходит.

---

## 6. Observability & Day-2 Operations

**Цель:** видеть кластер и приложения, диагностировать деградацию и инциденты.

| Тема | Что копать |
|---|---|
| **Metrics** | Prometheus, kube-state-metrics, cAdvisor, node-exporter; recording rules, alerting |
| **Logs** | Loki / ELK; kubelet log rotation; structured logging |
| **Traces** | OpenTelemetry Collector, Tempo/Jaeger; инструментирование приложений |
| **Events & audit** | `kubectl events`, audit policy, `docker events` → k8s events |
| **Day-2** | Upgrade strategy (control plane, nodes), etcd backup/DR, node lifecycle, capacity |
| **Cost** | Kubecost / OpenCost, requests overprovisioning, right-sizing |

**Ресурсы:**
- «Kubernetes Production Mastery» — observability stack, alerting, cost optimization.
- OpenTelemetry docs — vendor-neutral instrumentation.

**Практика (lab):**
1. Разверните kube-prometheus-stack; настройте алерт на `OOMKilled` и `PodNotReady`.
2. Соберите OTel Collector + Tempo, отправьте трейсы из тестового приложения.
3. Сделайте etcd backup и restore на отдельном кластере — измерьте RTO.
4. Проведите upgrade кластера с 1.29 → 1.30 (kubeadm) с PDB и без — сравните downtime.

**Критерий готовности:** по инциденту («латентность выросла») строите цепочку: Service → Pod → node → CNI → storage → app metrics, и знаете, какой инструмент на каждом шаге.

---

## 7. Extensibility: CRD, Controllers, Operators

**Цель:** расширять Kubernetes под нужды платформы, а не только потреблять API.

| Тема | Что копать |
|---|---|
| **CRD** | Схема, versioning, conversion webhooks, structural schema |
| **Controller-runtime** | Informer, workqueue, reconcile loop, finalizers |
| **Operator pattern** | Stateful-приложения, day-2 автоматизация |
| **Admission webhooks** | Mutating/Validating, sidecar injection, policy |
| **Aggregation layer** | Custom API servers (редко, но для platform — полезно знать) |

**Ресурсы:**
- «Programming Kubernetes» (Kubernetes API, controller-runtime) — книга.
- Kubebuilder / Operator SDK tutorials.
- Deep-dive часть 7 (Operator, webhook).

**Практика (lab):**
1. Напишите CRD `PlatformApp` и контроллер, который создаёт Deployment + Service + Ingress.
2. Добавьте finalizer, который чистит внешний ресурс (например, DNS-запись) при удалении.
3. Напишите mutating webhook, который инжектит sidecar с OTel.

**Критерий готовности:** можете объяснить разницу между reconciliation и императивным скриптом, и почему operator устойчив к рестартам.

---

## 8. GitOps & Delivery

**Цель:** декларативная, аудируемая и обратимая доставка.

| Тема | Что копать |
|---|---|
| **GitOps** | Argo CD / Flux: sync, drift detection, app-of-apps, multi-cluster |
| **Helm / Kustomize** | Chart design, values, overlays; когда что |
| **Progressive delivery** | Canary/blue-green (Argo Rollouts, Flagger) |
| **Image policy** | digest, cosign verify в admission, автоматический bump |
| **CI для образов** | Kaniko/Buildah/buildx, registry cache, affected-only builds |

**Ресурсы:**
- DevOps/SRE roadmap 2026: GitOps (Argo CD/Flux) — default Kubernetes delivery model.
- Argo CD docs + «Kubernetes Production Mastery» GitOps module.

**Практика (lab):**
1. Разверните Argo CD, подключите Git-репозиторий, настройте auto-sync + self-heal.
2. Сделайте app-of-apps для 5 сервисов.
3. Настройте Argo Rollouts canary с анализом Prometheus-метрик.

**Критерий готовности:** любой деплой воспроизводим из Git, откат — через `git revert`, и вы можете объяснить, что произойдёт при drift.

---

## 9. Multi-cluster, Scale & Platform Engineering

**Цель:** мыслить категориями платформы, а не одного кластера.

| Тема | Что копать |
|---|---|
| **Multi-cluster** | Cluster API, Karmada, fleet management; когда нужен второй кластер |
| **Scale** | 5000-node clusters, apiserver latency, etcd sizing, watch optimization |
| **Platform Engineering** | Internal Developer Platform, Backstage, golden paths, self-service |
| **SLO** | SLI/SLO/error budget для платформы (не только приложений) |

**Ресурсы:**
- Staff-level roadmap от harut8: multi-cluster control planes, GitOps engines, supply-chain security, performance tuning 5000-node clusters.
- DevOps/SRE roadmap 2026: Platform Engineering + Backstage как доминирующая senior-траектория.

**Практика (capstone):**
Постройте **мини-платформу**:  
- 2 кластера (kind + managed),  
- Argo CD fleet,  
- Golden path: разработчик делает PR с `PlatformApp` CR → платформа создаёт namespace, quota, NetworkPolicy, Deployment, Service, Ingress, мониторинг, алерты.  
- Admission-политики (Kyverno) на PSS restricted + signed images.  
- Документация и runbook’и.

---

## 10. Сертификации (ориентир, не самоцель)

| Сертификация | Когда | Зачем |
|---|---|---|
| **CKA** | После этапов 1–4 | Подтверждает операционный фундамент; полезно, но для platform — недостаточно |
| **CKS** | После этапа 5 | Security-фокус; для платформенной команды — практически обязательный ориентир |
| **KCNA / KCSA** | Опционально | Обзорные; не заменяют глубину |

Рынок: CKA + CKS — стандартный набор для platform/senior; salary band senior platform engineer ~$160–220k. Не собирайте сертификаты ради сертификатов — стройте портфолио работающих систем.

---

## 11. Ресурсы (сводка)

**Книги:**
- «Kubernetes Patterns» (Ibryam, Huß) — паттерны для платформы.
- «Programming Kubernetes» (Hausenblas, Schimanski) — controllers/CRD.
- «Production Kubernetes» (Rosset et al.) — production-практики.

**Практикумы:**
- **Kubernetes the Hard Way** — обязательный.
- **Kubernetes Production Mastery** (curriculum) — senior platform/SRE.
- **Exploring Kubernetes** — прогрессивный путь от app dev до platform engineer.

**Серии статей:**
- Kubernetes Deep Dive (7 частей: API, Pod lifecycle, networking, storage, resources, deployment, operators).
- Staff-level roadmap (Linux primitives → multi-cluster federation).

**Справочники:**
- DevOps/SRE Roadmap 2026 — зависимостная цепочка навыков.
- CKS curriculum — для security-этапа.

---

## 12. Примерный таймлайн (при 10–15 ч/нед)

| Месяц | Фокус | Артефакт |
|---|---|---|
| 0 | Предварительные: CNI, DNS, Linux networking | kind + tcpdump/netshoot отчёт |
| 1 | Control plane + etcd + kubeadm | Hard Way кластер + etcd restore |
| 2 | Networking + Storage | NetworkPolicy lab + StatefulSet + CSI |
| 3 | Workloads, scheduling, resources | HPA/VPA/PDB lab + OOM runbook |
| 4 | Security & multi-tenancy | Kyverno policies + RBAC audit + cosign |
| 5 | Observability & Day-2 | Prometheus/OTel + upgrade + etcd DR |
| 6 | Extensibility | Свой operator на kubebuilder |
| 7 | GitOps & delivery | Argo CD app-of-apps + Rollouts |
| 8 | Multi-cluster + capstone | Мини-платформа с golden path |

---

## 13. Чеклист «senior platform engineer по K8s»

- [ ] Могу нарисовать путь запроса от `kubectl apply` до running container и назвать точки отказа.
- [ ] Объясняю разницу requests/limits и последствия для QoS/eviction.
- [ ] Диагностирую Pod в `Pending`/`CrashLoopBackOff`/`OOMKilled` по `describe`/`events`/`logs`.
- [ ] Настраиваю CNI (Calico/Cilium) и объясняю data plane.
- [ ] Пишу NetworkPolicy default-deny и проверяю её.
- [ ] Разворачиваю StatefulSet с CSI и делаю failover.
- [ ] Провожу аудит на PSS restricted и чиню несоответствия.
- [ ] Настраиваю admission-политики (Kyverno/OPA) на signed images.
- [ ] Делаю etcd backup/restore и upgrade кластера с PDB.
- [ ] Пишу собственный controller/operator на controller-runtime.
- [ ] Строю GitOps-пайплайн с Argo CD и canary.
- [ ] Могу спроектировать multi-tenant платформу с golden path.

---

> **Главный принцип:** не учите K8s через `kubectl run` и императивные команды. Сразу — манифесты, Helm/Kustomize, GitOps. Docker-фундамент даёт вам понимание нижнего слоя; задача этого роадмапа — надстроить control plane, сеть, storage, security и платформенную инженерию так, чтобы вы могли **объяснять, а не запоминать**.