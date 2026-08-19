# WO-O4O-CLOUD-RUN-MINSCALE-COST-AND-COLDSTART-ASSESSMENT-V1 — CHECK

- **작업일**: 2026-08-19
- **프로젝트**: `netureyoutube` (display name `neture-services`) / region `asia-northeast3`
- **성격**: 조사·실측·판정 (production 설정 변경 0)
- **최종 판정**: **`KEEP_MIN_1`**

---

## 1. Cloud Run 전체 Census (§3)

측정 창: 최근 30일, Cloud Monitoring `request_count` · `container/billable_instance_time`.

| service | minScale | maxScale | CPU | Mem | conc | timeout | ingress | 30일 요청 | 30일 billable h |
|---|:---:|:---:|:---:|:---:|:---:|:---:|---|---:|---:|
| **o4o-core-api** | **1** | 10 | 1 | 1Gi | 80 | 300s | internal-and-cloud-load-balancing | 261,869 | **724.12** |
| neture-web | 0 | 5 | 1 | 256Mi | 80 | 60s | all | 249,363 | 5.97 |
| k-cosmetics-web | 0 | 5 | 1 | 256Mi | 80 | 300s | all | 33,583 | 1.20 |
| glycopharm-web | 0 | 5 | 1 | 256Mi | 80 | 300s | all | 25,672 | 1.04 |
| kpa-society-web | 0 | 5 | 1 | 256Mi | 80 | 300s | all | 32,761 | 0.87 |
| glucoseview-web | 0 | 5 | 1 | 256Mi | 80 | 300s | all | 18,065 | 0.75 |
| o4o-admin-dashboard | 0 | 5 | 1 | 256Mi | 80 | 60s | all | 16,396 | 0.33 |
| pharmacy-hub-web | 0 | 5 | 1 | 256Mi | 80 | 300s | all | 3,972 | 0.21 |
| kpa-branch-web | 0 | 5 | 1 | 256Mi | 80 | 300s | all | 27 | 0.02 |
| o4o-main-site | 0 | 5 | 1 | 256Mi | 80 | 60s | all | 11 | 0.00 |
| o4o-admin-dashboard-dev | 0 | 5 | 1 | 256Mi | 80 | 60s | all | 3 | 0.00 |
| account-center-web | 0 | (미설정) | 1 | 512Mi | 80 | 300s | all | 1 | 0.00 |
| **합계 (12)** | | | | | | | | 641,723 | **734.51** |

- **`minScale > 0` 서비스 = `o4o-core-api` 1건뿐.** 나머지 11개는 annotation 부재 = 0.
- `o4o-core-api` 가 전체 billable instance-hours 의 **98.6%**.
- 전 서비스 traffic 100% = latest revision, `startup-cpu-boost = true`, execution environment 기본값.

---

## 2. `o4o-core-api` 상세 (§4)

### Runtime 설정

| 항목 | 값 |
|---|---|
| minScale / maxScale | 1 / 10 (service-level annotation `maxScale=20` 은 잔재, template 값 10 이 유효) |
| CPU / Memory | 1 vCPU / 1 GiB |
| concurrency / timeout | 80 / 300s |
| CPU allocation | `run.googleapis.com/cpu-throttling` **annotation 부재 = 기본값(요청 처리 중에만 CPU)** |
| startup CPU boost | `true` |
| session affinity | `None` |
| startup probe | tcpSocket:8080, period 240s, failureThreshold 1 (livenessProbe 없음) |
| Cloud SQL | `netureyoutube:asia-northeast3:o4o-platform-db` (unix socket) |
| 조사 시점 revision | `o4o-core-api-03381-hv5` (traffic 100%, 2026-08-19T04:24Z) |
| image | `.../o4o-api/api-server:eed18b9e14cdc036193994fa8f1eda6ae30bce3e` |

### 실측 부팅 시퀀스 — revision `o4o-core-api-03381-hv5` (production 로그)

| 시각(UTC) | 구간 | 소요 |
|---|---|---:|
| 04:24:39.261 | 컨테이너 시작 (`Starting new instance`) | — |
| 04:24:48.378 | 최초 애플리케이션 로그 | **9.12 s** (Node ESM 모듈 로딩) |
| 04:24:48.833 → 04:24:51.212 | DB 연결 (attempt 1/5 → 성공) | 2.38 s |
| 04:24:51.258 | health check + `Executed migrations: 645` | 0.05 s |
| 04:24:51.297 | `Database migrations completed (0 executed)` | 0.04 s |
| 04:24:51.31 → 04:24:52.46 | App Registry · Monitoring · 스케줄러 · Email(SMTP verify) | 1.15 s |
| 04:24:52.712 | `API Server listening … (all routes registered)` | 0.25 s |
| **합계** | 컨테이너 시작 → listen | **13.45 s** |

### Startup 시 수행 항목

- **DB connection pool 초기화** — `extra.max=20 / min=2 / idleTimeout 30s / connectionTimeout 10s` (`database/connection.ts`)
- **migration 실행** — `startup.service.ts` 에서 `env.isProduction()` 조건으로 **매 부팅마다** `showMigrations()` + `runMigrations({ transaction: "each" })`. 현재 pending 0 → 실행 0건(약 90ms)
- **ORM metadata loading** — entity registry 전체 로드 (모듈 로딩 9.12s 의 주된 원인)
- **auth 초기화** — `initializePassport()` (DB 에서 OAuth 설정 조회, 현재 활성 전략 0)
- **외부 연동** — Email SMTP verify(1.1s) / Prometheus / PaymentEventHub / CPT Registry(4건)
- **filesystem** — Cloud Run read-only 파일시스템이라 upload 디렉토리 생성은 skip

### Background task 존재 여부 (§4 핵심 · §14 중지 조건 대상)

| job | 주기 | 부팅 tick | 정합성 안전장치 |
|---|---|---|---|
| `marketTrialLifecycleJob` | `setInterval` **5분** (`MARKET_TRIAL_LIFECYCLE_INTERVAL_MS`) | 있음 | **read-path 평가기 존재** — `MarketTrialService.evaluateStatusIfNeeded()` 가 조회 시 동일 transition 수행. cron 은 catch-up 역할 |
| `spdRevisionExpiryJob` | `setInterval` **24시간** | 있음 (apply = hard delete) | 코드 주석 명시: *"서버 부팅 시 1회 즉시 실행(Cloud Run 콜드스타트마다 = 실질 daily 트리거)"*. kill-switch `SPD_REVISION_EXPIRY_ENABLED=false` |

**판정**: 두 job 모두 "요청이 없어도 상시 인스턴스가 필요한" 성격은 **아니다**.

1. SPD job 은 애초에 cold start 를 daily 트리거로 삼도록 설계되었다 (주석이 명시).
2. market trial job 은 read-path 평가기가 정확성 정본이고 cron 은 지연 보정이다.
3. 결정적으로 **현재 설정(cpu-throttling 기본값)에서는 idle min-instance 의 CPU 가 throttle 되므로 5분 `setInterval` 이 이미 정시 실행을 보장하지 못한다.** 즉 `minScale=1` 이 background job 을 지켜주고 있다는 전제 자체가 성립하지 않는다.

→ **§14 의 "background worker/cron 역할 발견" 중지 조건은 발동하지 않는다.** background task 는 `minScale=1` 유지의 근거가 되지 못한다. (실제 판정 근거는 §4·§6 의 cold start 비용이다.)

---

## 3. 최근 30일 트래픽 패턴 (§5)

1시간 버킷 720개 기준 (`run.googleapis.com/request_count`).

| 지표 | 값 |
|---|---|
| 총 요청 | 261,991 |
| 평균 / 시간 | 363.9 |
| p50 / p90 / p99 (시간당) | 53 / 396 / 2,760 |
| 최대 / 시간 | 69,847 |
| **요청 0인 시간** | **53 h / 720 h (7.4%)** |
| 1~10 요청 시간 | 183 h (25.4%) |
| 평일 평균 / 시간 | 408.4 (528 h, 215,610건) |
| 주말 평균 / 시간 | 241.6 (192 h, 46,381건) |
| 야간 00–07 KST 평균 / 시간 | 81.4 (240 h 중 0요청 27 h) |

KST 기준 피크는 14시(평균 2,590/h)·15시(평균 1,605/h). 새벽에도 시간당 60~140건이 꾸준히 발생하며 **완전 무트래픽 시간대는 존재하지 않는다.**

### 5분 버킷 idle 분석 (scale-to-zero 실효성)

| 지표 | 값 |
|---|---|
| 5분 버킷 총수 | 8,626 |
| 요청 0인 5분 버킷 | 5,738 (**66.5%**) |
| **최장 연속 idle** | 55 버킷 = **4.58 h** (2026-08-14T02:45Z 시작) |
| 15분 이상 연속 idle 구간 수 | **689 회 (하루 평균 23.0회)** |
| scale-to-zero 로 실제 인스턴스를 내릴 수 있는 시간 | **226.2 h / 720 h = 31.4%** |

→ 무트래픽 5분 버킷은 많지만 **짧게 흩어져 있다.** Cloud Run 의 idle shutdown 지연(약 15분)을 빼면 실제 scale-to-zero 가능 시간은 31.4%뿐이고, 그 대가로 **하루 약 23회의 cold start** 가 발생한다.

**하루 평균 idle 시간**: 5분 버킷 기준 무요청 16.0 h/일, 그중 scale-to-zero 로 실현되는 것은 7.5 h/일.

---

## 4. Cold Start 실측 (§6·§7)

### 측정 환경 (production 무변경)

production `o4o-core-api` 를 건드리지 않기 위해 **별도 Cloud Run 서비스**를 만들어 측정했다.

| 항목 | 값 |
|---|---|
| 서비스 | `o4o-core-api-coldstart-test` (revision `…-00001-bst`) |
| image | production 과 **동일** (`api-server:eed18b9e14…`) |
| CPU / Mem / concurrency | 1 / 1Gi / 80 (production 동일) |
| minScale / maxScale | **0** / 2 |
| traffic | production 서비스에 **0%** (완전 독립 서비스) |
| 노출 | `--no-allow-unauthenticated` (ID token 필요, 공개 노출 없음) |
| Cloud SQL | production `o4o-platform-db` 연결 (read 경로 검증 목적) |
| 안전 조치 | `SPD_REVISION_EXPIRY_ENABLED=false` (부팅 시 유일한 production DB write 차단) · `EMAIL_SERVICE_ENABLED=false` |

**production DB write 0건 확인** — 부팅 7회 모두 로그에 `[spd-revision-expiry] disabled via SPD_REVISION_EXPIRY_ENABLED=false — skip` 이 남았다. migration 도 매 부팅 `0 executed` (645 기적용).

### 측정 유효성 (§7) — 무효 1건을 포함해 기록한다

총 6라운드를 돌렸고 그중 **1건(Round 2)을 무효 처리**했다.

- **무효 사유**: `instance_count` 메트릭이 2~3분 지연되어, 직전 idle 구간의 0 값을 그대로 읽고 실제로는 warm 인스턴스에 요청했다. 게다가 앞선 측정 스크립트가 종료되지 않고 살아남아 05:21:34 에 인스턴스를 깨웠다. 결과 COLD = 0.109s 로 warm 수준이었다.
- **시정**: 라운드마다 **17분 고정 idle 을 강제한 뒤** 메트릭 0 을 확인하도록 스크립트를 교체하고, 잔존 프로세스를 종료했다.
- **최종 검증**: 유효 5회 각각에 대해 Cloud Run 로그에서 `Starting new instance. Reason: AUTOSCALING` 신규 인스턴스 기동을 **1:1 대조 확인**했다. 설정값이나 메트릭만 보고 cold start 라고 판정하지 않았다.

| Round | 판정 | 신규 인스턴스 기동 로그 (UTC) |
|---|:---:|---|
| 1 | 유효 | 05:03:47 AUTOSCALING |
| 2 | **무효** (warm hit) | 기동 05:21:34 — 요청(05:23:1x)보다 1.5분 앞섬 |
| 3 | 유효 | 05:41:27 AUTOSCALING |
| 4 | 유효 | 05:58:46 AUTOSCALING |
| 5 | 유효 | 06:16:13 AUTOSCALING |
| 6 | 유효 | 06:33:36 AUTOSCALING |

### Scale-down 시간 (§7)

애플리케이션 shutdown hook 로그(`[spd-revision-expiry] stopping scheduled job`)로 인스턴스 종료 시각을 정확히 특정했다.

| 마지막 요청 (UTC) | 인스턴스 종료 | **경과** |
|---|---|---:|
| 05:41:36 | 05:56:43 | 15m 07s |
| 05:58:56 | 06:14:03 | 15m 07s |
| 06:16:23 | 06:31:23 | 15m 00s |
| 05:23:59 | 05:38:23 | 14m 24s |
| 05:04:00 | 05:20:13 | 16m 13s |

→ **마지막 요청 후 약 15분(±1분)에 active instance = 0.** §5 의 15분 idle 모델과 일치한다.

### Cold start 실측 — 유효 5회

모든 요청에 ID token 첨부, curl `time_connect / time_appconnect / time_starttransfer / time_total` 기준. 단위 초.

| Round | COLD `/health` (TCP conn) | (TLS) | **COLD ttfb** | W1 `/health/database` | W2 `/api/v1/kpa/forum/posts` | W3 `POST /auth/login` | WARM `/health` |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 0.097 | 0.146 | **8.287** | 0.107 | 0.154 | 0.297 | 0.085 |
| 3 | 0.118 | 0.177 | **8.104** | 0.101 | 0.106 | 0.312 | 0.094 |
| 4 | 0.119 | 0.179 | **8.457** | 0.108 | 0.107 | 0.292 | 0.094 |
| 5 | 0.126 | 0.184 | **8.286** | 0.142 | 0.119 | 0.305 | 0.120 |
| 6 | 0.054 | 0.112 | **8.510** | 0.124 | 0.114 | 0.278 | 0.082 |

HTTP status 는 **5회 × 5요청 = 25건 모두 200**. 에러·timeout **0건**.

| 지표 | min | **median** | max |
|---|---:|---:|---:|
| COLD `/health` 총 응답 | 8.104 | **8.287** | 8.510 |
| 최초 TCP connect | 0.054 | 0.118 | 0.126 |
| 최초 TLS handshake | 0.112 | 0.177 | 0.184 |
| WARM `/health` | 0.082 | 0.094 | 0.120 |
| **cold start 추가 지연** (COLD − WARM) | 8.010 | **8.202** | 8.428 |
| W1 `/health/database` (cold 직후) | 0.101 | 0.108 | 0.142 |
| W2 forum (cold 직후) | 0.106 | 0.114 | 0.154 |
| W3 login (cold 직후) | 0.278 | 0.297 | 0.312 |

**서버 처리 시간** — Cloud Run 로그의 `Starting new instance` → `API Server listening` 구간:

| 부팅 | 소요 |
|---|---:|
| 05:03:47 → 05:03:55 | 8.044 s |
| 05:41:27 → 05:41:35 | 7.880 s |
| 05:58:46 → 05:58:54 | 8.199 s |
| 06:16:13 → 06:16:21 | 7.983 s |
| 06:33:36 → 06:33:45 | 8.260 s |
| **min / median / max** | **7.880 / 8.044 / 8.260** |

→ COLD ttfb median 8.287s 중 **8.04s 가 서버 부팅**, 나머지 약 0.24s 가 네트워크·라우팅이다. 즉 cold start 지연은 전부 애플리케이션 기동 시간이다.

### 테스트 부팅 분해 (2026-08-19T06:33:36 인스턴스)

| 구간 | 소요 |
|---|---:|
| 컨테이너 시작 → 최초 애플리케이션 로그 | **6.40 s** (Node ESM 모듈 로딩, 77%) |
| DB 연결 (attempt 1/5 → 성공) | 1.34 s |
| migration 확인 (`0 executed`, 645 기적용) | 0.09 s |
| 스케줄러·Backup·ErrorAlert 초기화 | 0.005 s |
| 도메인 route 등록 → listen | 0.22 s |
| **합계** | **8.26 s** |

### DB 초기 연결 영향 (§6·§8)

- **첫 DB 연결 1.34 s** (테스트) / **2.38 s** (production 로그). pool 은 `listen` **이전에** 생성되므로 cold start 시간에 포함되고, 첫 실사용 요청에는 추가 penalty 가 없다.
- 근거: cold 직후 첫 DB 접근 요청인 W1 `/health/database` 가 median **0.108 s** 로 warm 수준이었다.
- DB 관련 에러 **0건**. `pingMs` 정상, PG 15.17.

### production 대비 보정 — 실측 8.3s 는 **하한값**이다

| | 테스트 | production |
|---|---:|---:|
| 모듈 로딩 | 6.40 s | 9.12 s |
| DB 연결 | 1.34 s | 2.38 s |
| Email SMTP verify | 0 s (비활성) | 1.15 s |
| **총 부팅** | **8.26 s** | **13.45 s** |
| Cloud Run `startup_latencies` p50 / p95 / p99 | — | **14,223 / 16,871 / 18,973 ms** |

테스트는 안전 조치로 Email·SPD job 을 껐고, 같은 이미지를 반복 pull 해 image cache 가 warm 했다. 따라서 **production 에서 `minScale=0` 을 적용했을 때 실제 사용자가 겪는 cold start 는 8.3s 가 아니라 13~14s 대**로 보아야 한다 (production 자체 `startup_latencies` p50 14.2s 가 이를 뒷받침한다).

---

## 5. DB 영향 (§8)

| 항목 | 값 |
|---|---|
| 인스턴스 | `o4o-platform-db`, tier `db-custom-1-3840`, RUNNABLE |
| `max_connections` | **100** (read-only `SHOW max_connections`) |
| 현재 `pg_stat_activity` | total 13 / idle 6 |
| 7일 `num_backends` | mean 4.2 / p50 4 / p95 6 / max 8 |
| 애플리케이션 pool | instance 당 `max 20`, `min 2` |
| 첫 DB 연결 시간 | **2.38 s** (production 부팅 로그 실측, Cloud SQL unix socket) |
| pool 생성 시간 | DB 연결 시간에 포함 (min 2 connection 선점) |

- **scale-out 시 잠재 과다 할당 (기존 문제)**: `maxScale 10 × pool max 20 = 200` > `max_connections 100`. `minScale` 값과 무관한 **기존 latent 위험**이며 이번 WO 범위 밖 — 후속 WO 후보로 기록한다.
- `minScale=0` 이 이 위험을 키우지는 않는다 (maxScale 불변). 다만 월 약 689회의 pool 재생성(각 min 2 connection)이 추가되는데, `num_backends max 8` 대비 무시할 수준이다.
- **동시 cold start 위험**: concurrency 80 이므로 트래픽 급증 시 다수 인스턴스가 동시에 부팅하며 각각 pool 을 만든다. 다만 이는 현재 minScale=1 에서도 2번째 인스턴스부터 동일하게 발생한다.
- connection leak 징후 없음 (`num_backends max 8`, long-running query 0).

→ **`minScale=0` 이 1-vCPU급 production DB 에 불필요한 부담을 준다고 볼 근거는 없다.**

---

## 6. 비용 (§10)

### Billing mode — request-based 로 **실증 확인**

`cpu-throttling` annotation 부재 = gcloud 기본값(throttled) 이지만, 설정값만으로 판정하지 않고 메트릭으로 교차검증했다.

| 모델 | 예상 billable instance-hours | 실측 `billable_instance_time` |
|---|---:|---:|
| **request-based** (active + min-instance idle) | 123.1 + 601.0 = **724.1 h** | **724.12 h** ✅ 일치 |
| instance-based (active + 전체 idle) | 123.1 + 959.0 = 1,082.1 h | ❌ 불일치 |

→ **request-based billing 확정.**

### 단가 (Cloud Billing Catalog API, service `152E-C115-5142`, `asia-northeast3` = Tier 2)

| SKU | 단가 |
|---|---|
| Services CPU Tier 2 (Request-based) | $0.0000336 / vCPU·s |
| Services Memory Tier 2 (Request-based) | $0.0000035 / GiB·s |
| **Services Min Instance CPU Tier 2** | $0.0000035 / vCPU·s |
| **Services Min Instance Memory Tier 2** | $0.0000035 / GiB·s |
| Requests | 월 2M 무료, 이후 $0.40 / M |

1 vCPU + 1 GiB 구성 → **active $0.0000371/s**, **min-instance idle $0.0000070/s** (**5.3배 차이**).

### 현재 vs `minScale=0`

| | 구성 | 월 비용 |
|---|---|---:|
| **현재 (minScale=1)** | active 123.1 h ($16.44) + min-idle 601.0 h ($15.15) | **$31.59** |
| **변경 후 (minScale=0)** | active 123.1 h ($16.44) + 부팅 689회 × 13.5s ($0.35) | **$16.79** |
| **절감** | | **월 $14.80 · 연 $177.61 (47%)** |

- 요청 수 261,869건은 월 2M 무료 한도 내 → 양쪽 동일, 비교에 영향 없음.
- **오차 범위 ±25%** (월 $11 ~ $19). 근거: ① active instance-seconds 를 1시간 정렬 평균에서 유도 ② 부팅 횟수는 5분 버킷 근사 ③ Cloud Run idle shutdown 시간이 고정 계약이 아님.
- 나머지 11개 서비스 합계 10.4 h/월 ≈ **$1.4/월** — 최적화 여지 없음.
- 이 절감액은 프로젝트 Cloud Run 지출의 거의 전부(≈$33 → ≈$18)이지만 **절대액은 월 $15 수준**이다.

---

## 7. 인증 / 사용자 체감 경로 (§9)

### Production 기준선 (최근 30일)

| 지표 | 값 |
|---|---|
| request latency p50 / p95 / p99 | **8 ms / 51 ms / 168 ms** |
| 응답 class | 2xx 106,252 / 3xx 27,405 / 4xx 126,703 / 5xx 1,670 |
| production `startup_latencies` | **p50 14,223 ms · p95 16,871 ms · p99 18,973 ms** |

→ cold start 는 **정상 응답 p99 의 약 85배**다.

### 실측 (테스트 서비스, cold start 직후 순차 요청 · 유효 5회 median)

| 경로 | 성격 | cold 직후 응답 | production warm p50 | 판정 |
|---|---|---:|---:|:---:|
| `GET /health` (**cold 1st**) | 프로세스 기동 | **8.287 s** | 0.008 s | ⚠️ |
| `GET /health/database` | DB pool + ping | 0.108 s | — | ✅ |
| `GET /api/v1/kpa/forum/posts` | 비인증 일반 API (커뮤니티 목록) | 0.114 s | — | ✅ 200 |
| `POST /api/v1/auth/login` (serviceKey `neture`) | **로그인** | 0.297 s | — | ✅ 200 |
| `GET /health` (warm 재요청) | 재확인 | 0.094 s | 0.008 s | ✅ |

- 로그인은 `docs/local/TEST-ACCOUNTS.local.md` SSOT 계정(Neture 공급자2)으로 수행했고 **5회 모두 200**. 자격증명은 스크립트가 문서에서 직접 읽었으며 저장소·로그 어디에도 기록하지 않았다.
- **핵심**: cold start 비용은 **첫 요청 1건에만** 부과되고, 그 뒤 로그인·DB·API 는 전부 warm 수준이다. 즉 "느려지는 것"이 아니라 "특정 1명이 8~14초를 기다리는" 형태다.

### 사용자 영향 규모

§5 에서 15분 이상 idle 구간이 월 **689회(하루 23회)** 였다. `minScale=0` 이면 그 689개 구간을 깨우는 **첫 요청 689건이 8~14초를 대기**한다.

영향받는 대표 경로 — 어느 것이 첫 요청이 될지는 제어할 수 없다:

| 경로 | cold 시 사용자 체감 |
|---|---|
| 소비자 QR 진입 (`/qr/{slug}` 첫 API) | 매장 방문객이 스캔 후 8~14초 백지 — **이탈 위험 최대** |
| 매장 화면 / 태블릿 초기 로드 | 매장 오픈 직후 첫 진입이 지연 |
| 운영자 화면 초기 API | 업무 시작 시점 지연 |
| 로그인 (`/auth/login`) | warm 0.297s → cold 8.5~14.5s |
| 상품 조회 | 목록 첫 진입 지연 |

**주의**: 30일 요청 261,869건 중 4xx 가 126,703건(48%)으로 스캐너·봇 트래픽 비중이 높다. idle 을 깨우는 첫 요청이 실제 사용자가 아니라 봇일 확률도 상당하며, 그 경우 사용자 체감 피해는 없고 오히려 봇이 warm-up 을 대신한다. 다만 **어느 요청이 첫 요청이 될지는 사전에 통제·예측할 수 없으므로**, 689회 중 사용자 피해 건수를 하한 0 · 상한 689 사이로만 말할 수 있다. 이 불확실성 자체가 위험이다.

---

## 8. 보완안 (§12)

| 보완안 | 평가 |
|---|---|
| startup CPU boost | **이미 활성** (`true`). 추가 여지 없음 |
| startup 초기화 경량화 | Email SMTP verify(1.15s), Passport DB 조회 등을 listen 이후로 미루면 최대 1~1.5s 단축 |
| lazy DB/API initialization | DB 연결 2.38s 를 listen 이후로 미루면 `/health` 는 빨라지지만 첫 실사용 API 지연은 그대로 |
| **불필요 startup 작업 제거** | **매 부팅 `runMigrations()` 실행은 CI/CD 자동 마이그레이션 원칙(CLAUDE.md §0)과 중복.** 제거 시 90ms + 동시 부팅 경합 위험 제거 |
| **container image 경량화** | **가장 큰 항목.** 컨테이너 시작 → 최초 로그까지 9.12s 가 Node ESM 모듈 로딩이며 전체 부팅 13.45s 의 **68%** |

→ 모듈 로딩 구간을 손대지 않는 한 cold start 를 한 자릿수 초로 낮출 수 없다. 이는 **대규모 리팩토링 영역이라 이번 WO 범위 밖**이다 (§12 단서).

---

## 9. 최종 판정 (§11)

# 판정: `KEEP_MIN_1`

(`SAFE_TO_MIN_0` / `MIN_0_WITH_CONDITIONS` / `UNKNOWN` 아님 — UNKNOWN 항목 0건)

### 근거 — 절감액과 사용자 비용의 비교

| 얻는 것 | 잃는 것 |
|---|---|
| **월 $14.80 · 연 $177.61** (Cloud Run 지출의 47%) | 월 **689회 = 하루 23회**의 cold start |
| 오차 ±25% (월 $11~$19) | 회당 **8.3s(측정 하한) ~ 14.2s(production p50)** 대기 |
| | 정상 응답 p99 168ms 의 **50~85배** |
| | 대상 경로 통제 불가 — 소비자 QR 진입 포함 |

### `minScale=0` 을 지지하지 **않는** 이유

1. **절감 절대액이 작다.** 월 $14.80 은 Cloud Run 지출의 47%지만, 서비스 5개·소비자 QR 을 운영하는 플랫폼의 운영비 관점에서는 미미하다.
2. **cold start 가 너무 길다.** 8.04s 부팅 중 **6.40s(77%)가 Node ESM 모듈 로딩**이고, production 기준으로는 9.12s / 총 13.45s 다. 설정 조정으로 줄일 수 있는 값이 아니다.
3. **idle 이 짧게 흩어져 있다.** 무요청 5분 버킷은 66.5%나 되지만 15분 idle shutdown 을 빼면 실제 scale-to-zero 가능 시간은 **31.4%뿐**이고, 그 대가로 하루 23회 부팅이 발생한다. idle 이 길고 뭉쳐 있었다면(예: 야간 8시간 연속) 판단이 달랐겠지만 **최장 연속 idle 은 4.58h 에 불과**하고 새벽에도 시간당 60~140건이 들어온다.
4. **피해 대상을 고를 수 없다.** 첫 요청이 소비자 QR 스캔이면 8~14초 백지 화면이다.
5. **startup CPU boost 는 이미 켜져 있다.** 설정 레벨에서 더 당길 카드가 없다.

### `minScale=0` 을 막지 **않는** 요소 (기각한 반대 근거)

WO §14 의 중지 조건 중 다음은 **해당하지 않음**을 확인했다. 아래를 `KEEP_MIN_1` 의 근거로 쓰지 않았다.

- **background worker/cron 역할**: 존재하지만 상시 인스턴스를 요구하지 않는다. `spdRevisionExpiryJob` 은 cold start 를 daily 트리거로 삼도록 설계됐고, `marketTrialLifecycleJob` 은 read-path 평가기가 정확성 정본이다. 게다가 현재 CPU throttling 설정에서는 idle min-instance 의 5분 `setInterval` 이 이미 정시 실행을 보장하지 못한다.
- **DB 부담**: `num_backends` max 8 / `max_connections` 100. min=0 이 DB 에 유의미한 부담을 주지 않는다.
- **인증·로그인 오류**: cold start 직후 로그인 5/5 성공(200), 25개 요청 전부 200, 에러 0건.
- **테스트 환경 재현 불가**: 동일 image·리소스로 재현했고 신규 인스턴스 기동 로그로 5회 모두 대조 확인했다.
- **billing mode 불명**: request-based 로 메트릭 대조 실증했다.

즉 **기술적으로는 `minScale=0` 이 안전하게 동작한다.** 판정을 가른 것은 오직 **절감액 대비 사용자 체감 비용**이다.

### 재검토 조건 (조건부 전환 경로)

다음 중 하나가 충족되면 `MIN_0_WITH_CONDITIONS` 로 재판정할 여지가 있다.

1. **cold start 를 3초 이하로 단축** — 후속 WO 후보 3(컨테이너 이미지·모듈 로딩 경량화)이 선행 조건. 이것이 가장 본질적인 경로다.
2. 야간 등 특정 시간대에만 minScale 을 낮추는 스케줄 운영 (별도 인프라 필요)
3. Cloud Run 요금 체계 또는 트래픽 패턴의 유의미한 변화 (예: 최장 연속 idle 이 8시간 이상으로 확대)

### 후속 apply WO 필요 여부

**불필요.** 판정이 `KEEP_MIN_1` 이므로 `WO-O4O-CLOUD-RUN-CORE-API-MINSCALE-ZERO-APPLY-V1` 은 만들지 않는다. 비용 최적화를 계속하려면 apply WO 가 아니라 **후속 WO 후보 3(cold start 단축)** 을 먼저 수행해야 한다.

---

## 10. 저장소 · production 변경 (§13)

- 저장소 코드 변경 **0건**. 본 CHECK 문서만 추가.
- production `o4o-core-api` 설정 변경 **0건**. `minScale` 은 조사 전후 모두 `1` 이다.
- 측정 중 다른 작업의 CI/CD 배포로 revision 이 `03381-hv5` → `03382-wwj`(05:35Z) → `03383-fxh`(05:57Z) → `03384-wvs`(06:30Z) 로 진행됐다. 본 WO 와 무관한 정상 배포이며 `minScale` 을 포함한 scaling 설정은 변경되지 않았다. §4 의 부팅 분해는 조사 시점 revision `03381-hv5` 로그 기준이다.
- 실측용 임시 Cloud Run 서비스 `o4o-core-api-coldstart-test` 는 측정 종료 후 삭제 (§10 참조).

### 후속 WO 후보

1. `maxScale 10 × pool max 20 = 200 > max_connections 100` — Cloud SQL connection 과다 할당 정합 (기존 latent 위험)
2. 매 부팅 `runMigrations()` 실행 제거 — CI/CD 자동 마이그레이션 원칙과 중복, 동시 부팅 경합 위험
3. API 컨테이너 이미지/모듈 로딩 경량화 (cold start 9.12s 구간)
4. `o4o-core-api` service-level `maxScale=20` annotation 잔재 정리 (template 값 10 과 불일치)

---

## 11. 완료 기준 대조 (§16)

| # | 완료 기준 | 결과 |
|:-:|---|---|
| 1 | Cloud Run 전체 minScale Census 완료 | ✅ 12개 서비스 전수, `minScale > 0` 는 `o4o-core-api` 1건 |
| 2 | `o4o-core-api` idle 패턴 확인 | ✅ 720시간 + 8,626개 5분 버킷 분석, 최장 연속 idle 4.58h |
| 3 | 실제 scale-to-zero 상태에서 cold start 실측 | ✅ 유효 5회, 각각 신규 인스턴스 기동 로그로 대조 확인 (무효 1회 사유 명시) |
| 4 | DB · 인증 · 핵심 사용자 흐름 확인 | ✅ 25개 요청 전부 200, 로그인 5/5 성공, DB 에러 0 |
| 5 | 비용 절감 추정 | ✅ 월 $14.80 · 연 $177.61 (±25%), billing mode 실증 |
| 6 | UNKNOWN 없이 최종 판정 | ✅ `KEEP_MIN_1` |
| 7 | production 설정 변경 0 | ✅ `o4o-core-api` 무변경. 임시 서비스는 측정 후 삭제 |

### 정리 (cleanup)

- 임시 Cloud Run 서비스 `o4o-core-api-coldstart-test` **삭제 완료**
- 임시 파일 삭제 완료 — `c:/tmp/testenv.yaml`(production secret 포함) · `coldstart*.sh` · `coldstart*_results.txt` · `cq*.json`
- 저장소에 자격증명·secret 커밋 **0건**
