# WO-O4O-GCP-PRELAUNCH-COST-MINIMIZATION-CENSUS-V1 — CHECK

> **성격**: 조사 전용(read-only census). **실제 infra 변경 0 · DB write 0 · DNS 변경 0 · deploy 0 · API 활성화 0.**
> **산출물**: 본 CHECK 1개.
> **작성일**: 2026-09-04

---

## 1. 기준선

| 항목 | 값 |
|---|---|
| START_HEAD / origin/main | `30ba6dfe945e00b1430e7f495a438bb151d25570` |
| 작업 트리 | `c:/Users/sohae/o4o-platform` (시작 시 clean · `main`) |
| 조사 방식 | `gcloud` read-only 조회만 (`list` / `describe` / `logging read`) |

### 1-1. 프로젝트 (WO §4)

| 항목 | 값 |
|---|---|
| project id | **`netureyoutube`** |
| project name | `neture-services` |
| project number | `117791934476` |
| lifecycle | ACTIVE |
| billing account | `01ADEB-43314C-B959B4` ("24년 신한카드") · **billingEnabled = True** |
| 주 region | **`asia-northeast3`** (Seoul) — Cloud Run 11개 전부 이 region 단일 |

> 나머지 결제 계정 3개(`011959-…` · `013F71-…` · `01E496-…`)는 전부 `OPEN: False` → 과금 대상 아님.

---

## 2. ⚠️ 비용 산출 근거의 한계 (먼저 밝힌다)

**실제 청구 금액을 CLI 로 읽지 못했다.** 시도한 경로와 결과:

| 경로 | 결과 |
|---|---|
| BigQuery billing export | **데이터셋 0개** — export 미설정 |
| `gcloud billing budgets list` | **실패** — `billingbudgets.googleapis.com` 비활성 (활성화는 §37 금지 범위로 판단해 **시도하지 않음**) |
| `gcloud billing accounts describe` | 계정 메타데이터만 반환, 금액 없음 |

따라서 본 CHECK 의 모든 금액은 **`resource census × 공시 단가` 기준 추정치**이며 (WO §3 이 허용한 대체 경로),
**실제 청구액은 Billing Console 에서 사용자가 확인해야 한다.** 추정과 실제의 오차 요인은 §12-3 에 적었다.

### 2-1. 단가 기준 (명시)

| 항목 | 적용 단가 (asia-northeast3 기준) |
|---|---|
| Cloud SQL vCPU | $0.0590 / vCPU·hour |
| Cloud SQL RAM | $0.0100 / GB·hour |
| Cloud SQL SSD | $0.204 / GB·month |
| Cloud Run idle(min-instance) CPU | $0.0000035 / vCPU·s (Tier 2) |
| Cloud Run idle 메모리 | $0.00000035 / GiB·s (Tier 2) |
| 외부 ALB forwarding rule | $0.025 / hour (최초 5개 구간) |
| Artifact Registry | $0.10 / GB·month |
| Cloud Storage (Standard, Seoul) | $0.023 / GB·month |
| Cloud Logging | 월 50 GiB 무료, 초과분 $0.50 / GiB |
| **기준환율** | **1 USD = 1,400 KRW (본 CHECK 의 선언 기준환율 — 실시간 시세 조회 불가)** |
| 월 시간 | 730 h = 2,628,000 s |

---

## 3. Cloud SQL (WO §5~§8)

### 3-1. 실측

| 항목 | 값 |
|---|---|
| instance | `o4o-platform-db` |
| engine | **POSTGRES_15** |
| region / zone | `asia-northeast3` / `asia-northeast3-a` |
| tier | **`db-custom-1-3840`** = **1 vCPU / 3.75 GB RAM** |
| availabilityType | **ZONAL** (HA 아님) |
| storage | **15 GB · PD_SSD** · autoResize **ON** |
| activationPolicy | **ALWAYS** (상시 기동) |
| state | RUNNABLE |
| backup | **enabled** · 보존 **7개** · 시작 18:00 |
| PITR | **enabled** · transaction log **7일** · CLOUD_STORAGE |
| IP | **public IPv4 only** (`ipv4Enabled: true`, `privateNetwork` **없음**) |

> **중요**: private network 가 설정돼 있지 않다. Cloud Run 은 `run.googleapis.com/cloudsql-instances`
> 어노테이션(Cloud SQL 커넥터 / unix socket)으로 붙는다 → **VPC Connector 불필요** (§6 에서 재확인).

### 3-2. 월 비용 추정

| 구성요소 | 계산 | 월 USD |
|---|---|---:|
| vCPU | 1 × 730h × $0.0590 | **$43.07** |
| RAM | 3.75 GB × 730h × $0.0100 | **$27.38** |
| SSD storage | 15 GB × $0.204 | **$3.06** |
| backup(7) + PITR log | 추정 | **~$2.00** |
| **합계** | | **≈ $75.5 / 월 (≈ 105,700원)** |

→ **현재 전체 GCP 비용의 최대 항목**이며, 단일 리소스로 약 **65%** 를 차지한다.

### 3-3. 최적화 후보 검토

| 후보 | 판정 | 근거 |
|---|---|---|
| **A. STOP (미사용 시)** | **가능** | 서비스 전 단계이므로 상시 기동 불필요. 정지 시 **compute($70.45) 과금 중단**, storage·backup(≈$5)만 잔존. 개발 세션에만 START. `activationPolicy` 변경으로 가역 |
| **B. 더 작은 tier** | **가능하나 효과 제한적** | shared-core(`db-f1-micro` ≈ $11/월)로 내리면 크게 절감되나 3.75GB→0.6GB 는 현재 데이터량(15GB·PM 230,841행 등) 대비 실사용 시 성능 위험. `db-g1-small`(1.7GB) ≈ $36/월로 **약 절반**. **STOP 이 downsize 보다 절감폭이 크다** |
| **C. backup / PITR 축소** | **부분 가능** | 서비스 전 단계에서 PITR 7일은 과함. PITR OFF + backup 보존 7→2 로 축소 시 ≈$1.5 절감. 다만 절감액이 작고 **데이터 안전 축소**이므로 우선순위 낮음 |

> **C 관련 경고**: §8-1 에서 확인했듯 별도 export 백업이 **사실상 비어 있다**. 그 상태에서 PITR 을 끄는 것은
> 위험하다. **PITR 축소는 유효한 export 백업을 확보한 뒤에만** 검토한다.

### 3-4. 판정

```text
STOP_WHEN_UNUSED   (1순위 · 절감 최대)
+ DOWNSIZE 는 상시 기동이 필요해질 때의 대안
```

| 시나리오 | 월 USD | 월 KRW |
|---|---:|---:|
| 현재 (24h ALWAYS) | $75.5 | 105,700원 |
| 8h/일 가동 | **$28.5** | 39,900원 |
| 4h/일 가동 | **$16.8** | 23,500원 |
| 완전 정지(storage+backup만) | **$5.1** | 7,100원 |

---

## 4. Cloud Run (WO §9~§12)

### 4-1. 전체 census — 11개 서비스, 전부 `asia-northeast3`

| Service | minScale | maxScale | CPU/Mem | 최근 요청 | LB backend | 판정 |
|---|---:|---:|---|---|:---:|---|
| `o4o-core-api` | **1** | 10 | 1 / 1Gi | 2026-09-04 13:53 | O | **SCALE_TO_ZERO** |
| `neture-web` | 0 | 5 | 1 / 256Mi | 2026-09-04 13:53 | O | KEEP_MINIMAL |
| `o4o-admin-dashboard` | 0 | 5 | 1 / 256Mi | 2026-09-04 13:52 | O | KEEP_MINIMAL |
| `signage-player-web` | 0 | 5 | 1 / 256Mi | 2026-09-04 13:52 | X | KEEP_MINIMAL |
| `k-cosmetics-web` | 0 | 5 | 1 / 256Mi | 2026-09-04 13:47 | O | KEEP_MINIMAL |
| `kpa-society-web` | 0 | 5 | 1 / 256Mi | 2026-09-04 13:40 | O | KEEP_MINIMAL |
| `glycopharm-web` | 0 | 5 | 1 / 256Mi | 2026-09-04 13:13 | O | KEEP_MINIMAL |
| `pharmacy-hub-web` | 0 | 5 | 1 / 256Mi | 2026-09-04 13:11 | O | KEEP_MINIMAL |
| `glucoseview-web` | 0 | 5 | 1 / 256Mi | 2026-09-04 12:53 | O | KEEP_MINIMAL |
| `kpa-branch-web` | 0 | 5 | 1 / 256Mi | 요청 로그 **0** | X | **KEEP_MINIMAL** (아래 주석) |
| `o4o-admin-dashboard-dev` | 0 | 5 | 1 / 256Mi | **로그 자체 0** | X | **DELETE_CANDIDATE** |

> **`kpa-branch-web` 는 삭제 대상이 아니다.** HTTP 요청 로그는 0 이지만 **오늘(2026-09-04 13:51) revision
> `00088-nkb` 가 새로 배포**되었고 INFO 로그가 살아 있다. 활발히 개발 중인 서비스다. minScale 이 이미 0 이라
> 고정비도 없다.
>
> **`o4o-admin-dashboard-dev` 는 `resource.type=cloud_run_revision` 로그가 단 1건도 없다.** 2025-12-30 생성,
> 최신 revision `00008`(8회 배포 후 방치). LB backend 0 · NEG 0 · DNS 0 → **DELETE_CANDIDATE**.
> 다만 minScale=0 이라 **실질 고정비는 이미 0** 이므로 절감액은 없고 **정리 목적**이다.

### 4-2. `o4o-core-api` minScale=1 비용 (WO §10)

현재 어노테이션: `minScale: '1'`, `maxScale: '10'`, `startup-cpu-boost: true`, `cloudsql-instances` 연결.
`cpu-throttling` 어노테이션이 없으므로 **기본값(요청 기반 과금 + idle 인스턴스 감액 요율)** 이 적용된다.

| 구성요소 | 계산 | 월 USD |
|---|---|---:|
| idle CPU | 1 vCPU × 2,628,000s × $0.0000035 | $9.20 |
| idle memory | 1 GiB × 2,628,000s × $0.00000035 | $0.92 |
| **minScale=1 고정비** | | **≈ $10.1 (≈ 14,100원)** |

**minScale 1 → 0 시 이 $10.1 이 사라진다.**

- **cold start 대가**: 기존 실측 8~14초. 서비스 전 단계이므로 **허용 가능**으로 판단한다.
- 단, `o4o-core-api` 는 Cloud SQL 커넥터 + TypeORM 부팅이 있어 cold start 가 web 서비스보다 길다.
  **Tier 3(서비스 개시 직전)에서 minScale=1 로 복원**하는 것을 전제로 한다.

### 4-3. 나머지 10개 서비스

전부 **minScale 미설정(=0)** → **이미 scale-to-zero**. 고정비 없음. 실제 요청량이 개발/시범 수준이라
합산 **≈ $3~6/월** 로 추정한다. 추가 최적화 여지 없음 → `KEEP_MINIMAL`.

### 4-4. dead service (WO §12)

```text
DELETE_CANDIDATE = 1건 : o4o-admin-dashboard-dev
```

이번 WO 에서는 **삭제하지 않고 목록만 확정**한다 (WO §37).

---

## 5. Memorystore / Redis (WO §13~§14)

```text
gcloud redis instances list --region=asia-northeast3  → 0건
gcloud redis instances list --region=-                → 0건
```

**Memorystore 인스턴스가 존재하지 않는다.** (`redis.googleapis.com` API 는 enabled 이지만 **API 활성화 자체는 무과금**)

| 판정 | 절감액 |
|---|---|
| **N/A — 이미 0** | **$0** (이미 제거되어 절감 여지 없음) |

> 코드상 Redis/BullMQ/ioredis 런타임 제거와 **GCP 리소스 상태가 이미 일치**한다. 추가 조치 불필요.

---

## 6. Serverless VPC Access / VPC (WO §15~§16)

```text
gcloud compute networks vpc-access connectors list --region=asia-northeast3  → 0건
```

**VPC Connector 가 존재하지 않는다.**

### 6-1. 필요성 재확인

| 질문 | 답 |
|---|---|
| Cloud Run → Cloud SQL 에 필요한가? | **아니다.** `o4o-core-api` 는 `run.googleapis.com/cloudsql-instances` (Cloud SQL 커넥터/unix socket)로 붙는다. Cloud SQL 은 **public IP only** 이고 private network 미설정 |
| Redis 제거 후에도 필요한가? | 필요 없음 (Redis 자체가 없음) |
| Direct VPC egress 대체? | 대체할 대상이 없음 |

| 판정 | 절감액 |
|---|---|
| **N/A — 이미 0** | **$0** |

> `vpcaccess.googleapis.com` API 는 enabled 이나 인스턴스 0 → 무과금. **Cloud NAT · router · compute instance · disk · snapshot 도 전부 0건**으로 확인했다.

---

## 7. Load Balancer (WO §17~§19)

### 7-1. 현재 구조

| 구성요소 | 실측 |
|---|---|
| static IP | **`neture-static-ip` = 136.110.132.35** (global · EXTERNAL · **IN_USE** · users 2) |
| forwarding rules | **2개** — `o4o-global-lb-forwarding-rule-2`(443) · `neture-https-frontend-forwarding-rule`(80) |
| target proxies | `o4o-global-lb-target-proxy-2`(HTTPS) · `neture-https-frontend-target-proxy`(HTTP→리다이렉트) |
| URL maps | `o4o-global-lb`(본 라우팅) · `neture-https-frontend-redirect`(HTTP→HTTPS) |
| backend services | **8개** (전부 `EXTERNAL_MANAGED`) |
| serverless NEGs | **8개** (전부 asia-northeast3) |
| TLS | **Certificate Manager** map `o4o-main-cert-map` → `cm-cert-neture`(ACTIVE) · `cm-cert-pharmacyhub` |
| 레거시 인증서 | `cert-final-neture-v3` (classic managed) — **PROVISIONING_FAILED_PERMANENTLY · 16개 도메인 전부 FAILED_NOT_VISIBLE** |

**호스트 라우팅(10개 host rule)**: `neture.co.kr`/`www` · `admin.neture.co.kr` · `api.*`(5개 도메인 통합) ·
`glycopharm.co.kr`/`www` · `glucoseview.co.kr`/`www` · `kpa-society.co.kr`/`www` · `k-cosmetics.site`/`www` ·
`pharmacyhub.co.kr`/`www`

> **주의**: 실제 TLS 는 **Certificate Manager 가 서빙**하고 있고, target proxy 에 함께 붙어 있는
> classic 인증서 `cert-final-neture-v3` 는 **영구 실패 상태의 잔재**다. HTTPS 가 정상 동작하는 이유가
> classic 인증서가 아님을 혼동하지 않도록 기록한다.

### 7-2. 월 비용 추정

| 구성요소 | 월 USD |
|---|---:|
| forwarding rule 2개 (최초 5개 구간 $0.025/h) | **$18.25** |
| data processing (개발 수준 트래픽) | ~$0.5 |
| static IP (IN_USE → 무료) | $0 |
| **합계** | **≈ $18.8 (≈ 26,300원)** |

### 7-3. 삭제 시 영향 (WO §19) 및 판정

LB 를 없애고 Cloud Run 커스텀 도메인 매핑으로 대체하면 $18.8 을 절감하지만 **잃는 것이 크다**:

| 잃는 것 | 내용 |
|---|---|
| 다중 도메인 경로 라우팅 | `api.*` 5개 도메인 → 단일 backend 통합, `admin.` 별도 경로 등 **10개 host rule** 을 도메인 매핑으로 1:1 재현 불가 |
| 단일 고정 IP | 8개 서비스가 한 IP 를 공유 중. 도메인 매핑 전환 시 **DNS 레코드 전면 재작성** (등록기관 = Gabia, GCP 통제 밖) |
| TLS 일괄 관리 | Certificate Manager map → 서비스별 개별 인증서 프로비저닝으로 분산 |
| HTTP→HTTPS 리다이렉트 | 별도 URL map 으로 구현 중 |

```text
판정: KEEP_REQUIRED (Tier 3 에서 재검토)
```

**DNS 가 외부 등록기관(Gabia)에 있어 롤백 난이도가 높다.** 월 $18.8 을 아끼려고
전체 도메인 접근을 위험에 빠뜨리는 것은 비용 대비 효과가 나쁘다.

다만 **`cert-final-neture-v3`(영구 실패 classic 인증서)는 무위험 정리 대상**이다 →
`DELETE` 가능 (절감 $0, 위생 목적). 실제 TLS 는 Certificate Manager 가 서빙하므로 제거해도 영향이 없으나,
target proxy 에서 분리한 뒤 삭제해야 한다.

---

## 8. Cloud Storage (WO §23~§24)

| Bucket | Location | 크기 | 객체 | 용도 | 판정 |
|---|---|---:|---:|---|---|
| `o4o-media-library` | ASIA-NORTHEAST3 | **423.74 MiB** | — | 미디어 라이브러리 | **ACTIVE_REQUIRED** |
| `netureyoutube_cloudbuild` | US | **589.80 MiB** | — | Cloud Build 산출물 | ARCHIVE → 정리 가능 |
| `run-sources-netureyoutube-asia-northeast3` | ASIA-NORTHEAST3 | **563.06 MiB** | — | Cloud Run 소스 배포 | ARCHIVE → 정리 가능 |
| `neture-db-final-export` | ASIA-NORTHEAST3 | **900 B** | 2 | DB 최종 export | **⚠️ 아래 §8-1** |
| `yaksasite` | ASIA-NORTHEAST3 | **42 B** | 1 | 2022-03-19 테스트 파일 1개 | **ORPHAN / DELETE_CANDIDATE** |

**총 ≈ 1.55 GB → 월 ≈ $0.04 (≈ 50원).** 비용 관점에서는 **무시 가능**하며 최적화 대상이 아니다.

### 8-1. ⚠️ `neture-db-final-export` 가 사실상 비어 있다 (비용 아닌 **위험** 보고)

```text
gs://neture-db-final-export/neture-db_neture_20260818.sql.gz     451 bytes
gs://neture-db-final-export/neture-db_postgres_20260818.sql.gz   449 bytes
TOTAL: 2 objects, 900 bytes
```

**빈 gzip 파일 크기(약 450 B)와 일치한다. 즉 이 "최종 export" 에는 실질 데이터가 없다.**

WO §24 는 이 버킷을 "복구용 export 이므로 삭제하지 않는다" 로 분류했으나, **실측 결과 복구 자산으로서
기능하지 않는다.** 비용은 0 에 가까우므로 **삭제하지 않고 그대로 두되**, 다음을 보고한다:

- 이 버킷을 백업으로 신뢰하면 안 된다.
- **§3-3 의 "PITR/backup 축소" 를 실행하기 전에 반드시 유효한 export 를 새로 확보해야 한다.**
- Coldline/Archive 전환은 900 B 에 대해 무의미 → 하지 않는다.

---

## 9. Artifact Registry (WO §20~§22)

| Repository | Format | 크기 | 이미지 수 | cleanup policy | 판정 |
|---|---|---:|---:|:---:|---|
| **`o4o-api`** | DOCKER | **51,616 MB ≈ 50.4 GB** | **509** | **없음** | **DOWNSIZE** |
| `gcr.io` | DOCKER | **7,352 MB ≈ 7.2 GB** | — | **없음** | **DOWNSIZE** |
| `cloud-run-source-deploy` | DOCKER | **2,775 MB ≈ 2.7 GB** | 147 | **없음** | **DOWNSIZE** |
| `siteguide` | DOCKER | 98.6 MB | — | 없음 | KEEP_MINIMAL |
| **합계** | | **≈ 61.8 GB** | | | |

### 9-1. 비용 및 목표

| 항목 | 값 |
|---|---:|
| 현재 | 61.8 GB × $0.10 = **$6.18 / 월 (≈ 8,650원)** |
| 목표 (WO §22: 10~30 GB) | 10 GB → **$1.00 / 월** |
| **절감** | **≈ $5.2 / 월 (≈ 7,300원)** |

### 9-2. 권장 retention (rollback 안전 유지)

`o4o-api` 509개 이미지 = 평균 약 100 MB. **cleanup policy 가 하나도 없어 무한 누적 중**이다.

```text
- 서비스별 최근 5~10 revision 이미지만 유지
- untagged digest 는 7일 후 삭제
- 그 외 90일 TTL
```

현재 Cloud Run 이 참조 중인 이미지(11개 서비스 × latest revision)는 **반드시 보존**하고,
롤백 여지를 위해 서비스당 최소 3개 이상은 남긴다.

---

## 10. Logging / Monitoring (WO §25~§26)

### 10-1. 실측

| 항목 | 값 |
|---|---|
| log buckets | `_Default` **보존 30일** · `_Required` **보존 400일**(변경 불가) |
| sinks | `_Required` · `_Default` 2개 (기본값) |
| **exclusion (제외 필터)** | **0건 — 모든 로그가 수집되고 있다** |
| 실측 유입량 | 5분간 전체 960건 · `cloud_run_revision` 276건 |
| 월 환산 | ≈ 8.3M entries/월 → 엔트리당 0.5~1 KB 가정 시 **≈ 4~8 GB/월** |

### 10-2. 비용 판정

**Cloud Logging 무료 한도는 프로젝트당 월 50 GiB 이며, 현재 추정 유입량(4~8 GB)은 그 한도 내다.**

```text
판정: KEEP_MINIMAL — 현재 로깅 비용 ≈ $0
```

→ **debug 로그 축소·보존기간 단축은 절감 효과가 없다.** 장애 진단 능력만 잃으므로 **권장하지 않는다**.
(향후 트래픽이 6배 이상 늘어 50 GiB 에 근접하면 그때 exclusion 을 검토한다.)

---

## 11. Secret Manager / Build / 기타 (WO §27~§30)

| 리소스 | 실측 | 월 USD | 판정 |
|---|---|---:|---|
| Secret Manager | **5 secrets** | ~$0.4 | **KEEP_REQUIRED** |
| Cloud Build | 전용 job 없음. CI = GitHub Actions. 버킷 590 MB 만 잔존 | ~$0 | KEEP_MINIMAL |
| Cloud Scheduler | **API 비활성** → 리소스 0 | $0 | N/A |
| Cloud Functions | **API 비활성** → 리소스 0 | $0 | N/A |
| Cloud DNS | **managed zone 0건** (DNS = 외부 Gabia) | $0 | N/A |
| Pub/Sub | `container-analysis-*` 4개 (자동 생성) | ~$0 | KEEP_MINIMAL |
| Compute instance / disk / snapshot | **전부 0건** | $0 | N/A |
| Cloud NAT / router | **0건** | $0 | N/A |
| static IP | 1개 · **IN_USE** | $0 | KEEP_REQUIRED |
| Certificate Manager | map 1 + cert 2 (ACTIVE) | ~$0 | KEEP_REQUIRED |
| classic SSL cert `cert-final-neture-v3` | **영구 실패 · 미사용** | $0 | **DELETE** (위생) |

**미사용 static IP = 0건** (WO §29 의 삭제 후보 없음).

---

## 12. 현재 월비용 종합 (WO §31)

| Resource | Current config | 월 USD | 월 KRW |
|---|---|---:|---:|
| **Cloud SQL** `o4o-platform-db` | db-custom-1-3840 · ZONAL · 15GB SSD · ALWAYS · PITR 7d | **$75.5** | 105,700 |
| **Load Balancer** | global ALB · FR 2 · backend 8 · NEG 8 | **$18.8** | 26,300 |
| **Cloud Run** `o4o-core-api` | minScale=1 · 1vCPU/1Gi | **$10.1** | 14,100 |
| **Artifact Registry** | 61.8 GB · cleanup policy 0 | **$6.2** | 8,650 |
| **Cloud Run** 나머지 10개 | 전부 minScale=0 | **~$4.5** | 6,300 |
| Network egress | 개발 수준 | ~$3.0 | 4,200 |
| Secret Manager | 5 secrets | $0.4 | 560 |
| Cloud Storage | 1.55 GB | $0.04 | 60 |
| Cloud Logging | 무료 한도 내 | $0 | 0 |
| Memorystore / VPC Connector / GCE / NAT / DNS | **전부 0건** | $0 | 0 |
| **CURRENT_ESTIMATE** | | **≈ $118.5** | **≈ 165,900원** |

### 12-3. 추정 오차 요인 (정직하게)

- Cloud Run **활성 요청 처리분**과 **egress** 는 실제 트래픽에 따라 변동 (±$5 수준)
- Cloud SQL **backup/PITR 저장량**을 직접 측정하지 못해 $2 로 가정
- 지역별 단가는 공시가 기준이며 **약정/크레딧/무료등급 적용분이 반영되지 않음**
- → **실제 청구액이 추정보다 낮을 가능성이 있다.** Billing Console 확인 필요.

---

## 13. 서비스 전 최소비용 구성 (WO §32~§33)

| Resource | 현재 | 서비스 전 권장 | 현재 월 USD | 권장 월 USD |
|---|---|---|---:|---:|
| Cloud SQL | ALWAYS 24h | **필요 시에만 START (4h/일)** | $75.5 | **$16.8** |
| Cloud Run `o4o-core-api` | minScale=1 | **minScale=0** | $10.1 | **$1.5** |
| Load Balancer | 유지 | **유지 (KEEP_REQUIRED)** | $18.8 | $18.8 |
| Artifact Registry | 61.8 GB | **cleanup policy → 10 GB** | $6.2 | **$1.0** |
| Cloud Run 나머지 | minScale=0 | 그대로 | $4.5 | $4.5 |
| egress / secrets / storage | — | 그대로 | $3.4 | $3.4 |
| `o4o-admin-dashboard-dev` | 존재 | **삭제** | $0 | $0 |
| **합계** | | | **$118.5** | **≈ $46.0** |

### 13-1. 3개 숫자 (WO §33)

| 지표 | 월 USD | 월 KRW | 설명 |
|---|---:|---:|---|
| **CURRENT_ESTIMATE** | **$118.5** | **≈ 165,900원** | 현재 구성 그대로 |
| **OPTIMIZED_ESTIMATE** | **$46.0** | **≈ 64,400원** | LB 유지 · SQL 4h/일 · minScale 0 · AR 정리 → **WO §2 목표(3~7만원) 달성** |
| **MINIMUM_PRACTICAL_ESTIMATE** | **$17.5** | **≈ 24,500원** | 위 + LB 제거(도메인 매핑) + SQL 거의 상시 정지 → **공격적 목표(5만원 이하) 달성하나 DNS 위험 수반** |

> `MINIMUM_PRACTICAL` 은 **LB 제거가 전제**이며 §7-3 의 위험(외부 Gabia DNS 전면 재작성)을 감수해야 한다.
> **권장은 `OPTIMIZED_ESTIMATE` 구성이다.** LB $18.8 을 남기는 대가로 도메인 안정성을 지킨다.

---

## 14. 리소스별 최종 판정 (WO §34)

| 판정 | 건수 | 대상 |
|---|---:|---|
| **DELETE** | **2** | `o4o-admin-dashboard-dev` (Cloud Run) · `cert-final-neture-v3` (영구 실패 classic 인증서) |
| **STOP** | **1** | Cloud SQL `o4o-platform-db` (미사용 시) |
| **SCALE_TO_ZERO** | **1** | Cloud Run `o4o-core-api` (minScale 1→0) |
| **DOWNSIZE** | **3** | Artifact Registry `o4o-api` · `gcr.io` · `cloud-run-source-deploy` |
| **KEEP_REQUIRED** | **4** | Load Balancer 일체 · `neture-static-ip` · Certificate Manager · Secret Manager |
| **KEEP_MINIMAL** | **14** | Cloud Run 9개(live, min=0) + `kpa-branch-web` + AR `siteguide` + GCS 3개 + Logging |
| **HOLD** | **2** | GCS `neture-db-final-export`(§8-1 위험) · `yaksasite`(42 B ORPHAN, 절감 0) |
| **UNKNOWN** | **0** | — |

**billable resource census = complete · UNKNOWN = 0.**
(단 §2 대로 **실제 청구 금액**은 Billing Console 확인 필요 — 리소스 분류의 UNKNOWN 과는 별개)

---

## 15. 실행 우선순위 (WO §35)

| Rank | Action | 월 절감 (USD / KRW) | 위험 | 난이도 | 복구 |
|---:|---|---:|---|---|---|
| **1** | **Cloud SQL STOP (미사용 시)** | **$58.7 / 82,200원** | 중 — 정지 중 전 서비스 DB 접근 불가 | 하 (`gcloud sql instances patch --activation-policy NEVER`) | 즉시 START |
| **2** | **`o4o-core-api` minScale 1→0** | **$8.6 / 12,000원** | 하 — cold start 8~14초 | 하 (어노테이션 1줄) | 즉시 복원 |
| **3** | **Artifact Registry cleanup policy** | **$5.2 / 7,300원** | 하 — 최신 revision 보존 시 무영향 | 중 (정책 작성) | 이미지 재빌드 필요 |
| **4** | Load Balancer 제거 → 도메인 매핑 | $18.8 / 26,300원 | **높음** — 외부 DNS 전면 재작성 | 상 | **어려움** |
| **5** | `o4o-admin-dashboard-dev` 삭제 | $0 | 하 | 하 | 재배포 |

**가장 큰 절감 5개**: ① Cloud SQL STOP $58.7 ② LB 제거 $18.8(비권장) ③ minScale 0 $8.6 ④ AR 정리 $5.2 ⑤ dev 서비스 삭제 $0(위생).

> **1~3번만 실행해도 $118.5 → $46.0 (165,900원 → 64,400원, 약 61% 절감)** 으로 WO 목표를 달성한다.

---

## 16. Tier 분리 (WO §36)

### Tier 1 — 즉시 가능 (무중단 · 복구 쉬움)

```text
- Artifact Registry cleanup policy 적용        (-$5.2)
- o4o-admin-dashboard-dev 삭제                 (-$0, 위생)
- cert-final-neture-v3 (영구 실패 인증서) 삭제  (-$0, 위생)
```

### Tier 2 — 개발단계 최적화 (약간의 불편 허용)

```text
- o4o-core-api minScale 1 → 0                  (-$8.6, cold start 8~14초 감수)
- Cloud SQL 미사용 시 STOP                     (-$58.7, 개발 세션에만 START)
```

### Tier 3 — 서비스 개시 직전 복원

```text
- o4o-core-api minScale 0 → 1
- Cloud SQL activationPolicy ALWAYS 복원 (+ 필요 시 tier 상향 · HA 검토)
- Load Balancer 는 애초에 유지했으므로 복원 작업 없음
- PITR / backup 보존 정책 재상향
```

---

## 17. 이번 WO 에서 수행하지 않은 것 (WO §37 준수)

| 금지 항목 | 수행 여부 |
|---|:---:|
| Cloud SQL STOP | **0** |
| Cloud SQL resize | **0** |
| Cloud Run minScale 변경 | **0** |
| Redis 삭제 | **0** (애초에 리소스 없음) |
| VPC Connector 삭제 | **0** (애초에 리소스 없음) |
| Load Balancer 삭제 | **0** |
| Artifact 삭제 | **0** |
| DNS 변경 | **0** |
| deploy | **0** |
| DB write | **0** |
| **API 활성화** | **0** — `billingbudgets` · `cloudscheduler` · `cloudfunctions` 활성화 프롬프트를 전부 **거부**하고 진행 |

**실제 infra 변경 = 0.** 모든 조회는 `list` / `describe` / `logging read` read-only 명령이다.

---

## 18. 최종 판정 (WO §40)

| 완료 기준 | 결과 |
|---|:---:|
| billable resource census = complete | PASS |
| monthly cost estimate = complete | PASS (§12 · §13) |
| UNKNOWN = 0 | PASS |
| actual infra change = 0 | PASS |
| DB write = 0 | PASS |
| DNS change = 0 | PASS |
| deploy = 0 | PASS |

### 판정: `GCP_PRELAUNCH_COST_MINIMIZATION_PLAN_READY`

---

## 19. 다음 실행 WO 제안

```text
WO-O4O-GCP-PRELAUNCH-COST-REDUCTION-EXECUTION-V1
```

범위(Tier 1 + Tier 2 일괄 실행):

1. Artifact Registry cleanup policy 3개 repo 적용 (최신 revision 보존 검증 포함)
2. `o4o-admin-dashboard-dev` Cloud Run 서비스 삭제
3. `cert-final-neture-v3` classic 인증서 삭제 (target proxy 에서 분리 후)
4. `o4o-core-api` minScale 1 → 0
5. Cloud SQL 운영 절차 수립 — START/STOP 스크립트 + 개발 세션 가이드
6. 실행 후 Billing Console 실측으로 **추정치 검증**

**선행 조건**: §8-1 에 따라 **유효한 DB export 확보**를 5번보다 먼저 수행할 것을 권고한다.

---

## 20. 문서 정합 (CLAUDE.md §16-5)

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
```
