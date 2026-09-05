# WO-O4O-GCP-ULTRA-LOW-COST-PRELAUNCH-CONFIG-CENSUS-V1 — CHECK

> **성격**: **조사 전용.** infra 변경 0 · DB write 0 · DNS 변경 0.
> **판정**: `GCP_ULTRA_LOW_COST_PRELAUNCH_PLAN_READY`
> **작성일**: 2026-09-05

---

## 0. 먼저 정정 — 현재 실제 비용은 아직 $118.5 다

WO §2 는 현재 비용을 `≈ $113.3` 로 제시했다. **실측 결과 그보다 높다.**

| 항목 | 상태 |
|---|---|
| `minScale=0` (월 −$8.6) | **소멸** — CI 배포가 `--min-instances=1` 로 복원 (선행 CHECK 참조) |
| Artifact Registry cleanup (월 −$5.2) | **미실현** — 정책은 LIVE 이나 **아직 실행되지 않음** (§6-1) |

```text
현재 실제 월비용 ≈ $118.5 (약 165,900원)
→ 이번 트랙에서 지금까지 실현된 절감액은 사실상 $0 이다.
```

`o4o-admin-dashboard-dev` 삭제는 위생 개선이며 직접 절감액은 $0 이었다.

---

## 1. 기준선

| 항목 | 값 |
|---|---|
| HEAD / origin/main | `2943395dcb4ee01a365f8da49f6b40b8bb6f07ed` |
| project / region | `netureyoutube` / `asia-northeast3` (Artifact `gcr.io` 는 `us`) |
| 작업트리 | clean |

**비용 산출 근거에 대한 고지**: 프로젝트에 **BigQuery 청구 export 가 없어** 실비 조회가 불가능하다
(`bq` 데이터셋 없음). 따라서 본 문서의 금액은 **선행 census WO 에서 확정된 항목별 추정치**를 유지해
계산한 것이며, **실측 청구액이 아니다.** 환율은 1 USD = 1,400원 기준.

---

# A. Cloud SQL

## 2. 현재 구성

| 항목 | 값 |
|---|---|
| tier | `db-custom-1-3840` (1 vCPU / 3.75 GB) |
| state / policy | RUNNABLE / **ALWAYS** |
| disk | **15 GB PD_SSD** · autoResize **True** |
| availability | **ZONAL** (HA 아님 — 이미 저비용 구성) |
| version | POSTGRES_15 |
| PITR / txlog | enabled / 7일 |

## 3. 실측 workload (최근 7일 · 1시간 ALIGN_MAX · Monitoring API)

| 지표 | min | p50 | p95 | max |
|---|---:|---:|---:|---:|
| **CPU utilization** | 7.67% | **8.31%** | **10.81%** | **100%** |
| **Memory utilization** | 25.5% | **27.1%** | **59.4%** | 59.6% |
| **connections (num_backends)** | 0 | **1** | **3** | **20** |
| disk bytes used | 3.14 GB | 3.14 GB | 3.17 GB | 3.24 GB |

### 3-1. CPU 100% 스파이크의 정체

7일간 CPU > 50% 인 시간대는 **단 2개**였다.

```text
2026-09-04 04h UTC → 100.0%
2026-09-04 05h UTC →  71.4%
```

이는 **내가 실행한 production DB export(2026-09-04 14:20 KST = 05:20 UTC)** 시간대와 일치한다.
즉 **상시 서비스 부하가 아니라 1회성 배치**다. 상시 CPU 는 p95 기준 **10.8%** 에 불과하다.

## 4. DB 규모

```text
database size   ≈ 2.9 GB (o4o_platform)  ·  디스크 사용 3.14 GB / 15 GB 프로비저닝
tables          = 291 (public 275 / cosmetics 12 / neture 4)
최대 테이블      product_candidates 938MB · shared_product_descriptions 587MB
                product_identifiers 492MB · product_master_cleanup_audits 313MB
증가 추이        7일간 3.14 → 3.24 GB (완만)
connections peak = 20 (p95 = 3)
```

## 5. 현재 tier 적정성 판정

```text
CPU    : OVERSIZED   (p95 10.8% — 1 vCPU 도 과하다)
Memory : RIGHT_SIZED (p95 59.4% ≈ 2.23 GB — 여유가 크지 않다)
전체   : NOT_DOWNSIZABLE
```

**CPU 만 보면 축소 여지가 크지만, 메모리가 축소를 막는다.**

## 6. 축소 후보 실제 조회 (WO §6)

`gcloud sql tiers list` 실측 — `db-custom-1-3840` 미만은 **shared-core 2종뿐**이다.

| tier | RAM | vCPU | 판정 |
|---|---:|---|:---:|
| **`db-custom-1-3840`** (현재) | **3.75 GB** | 1 dedicated | 현행 |
| `db-g1-small` | **1.70 GB** | shared (burstable) | **부적합** |
| `db-f1-micro` | **0.60 GB** | shared (burstable) | **부적합** |

> `db-custom-1-3840` 은 **custom tier 가 허용하는 최소 구성**이다 (1 vCPU 기준 최소 메모리).
> 더 줄이려면 shared-core 로 내려가는 방법밖에 없다.

### 6-1. 축소 불가 판정 근거

| 근거 | 내용 |
|---|---|
| **메모리 초과** | 실측 메모리 p95 = 3.75 GB × 59.4% ≈ **2.23 GB** > `db-g1-small` **총 1.70 GB** |
| **shared vCPU** | burst 크레딧 소진 시 성능이 급락한다. export 때 관측된 **CPU 100% 구간이 shared-core 에서는 수 배로 길어진다** |
| **migration 위험** | CI/CD 가 배포 시 migration 을 실행한다. 291 테이블 · 3 GB 규모에서 shared-core 는 migration 시간과 타임아웃 위험을 키운다 |
| **connection burst** | peak 20 connections. 작은 인스턴스는 `max_connections` 도 함께 줄어든다 |

```text
판정: SQL DOWNSIZE = NOT_VIABLE
→ WO §9 의 SQL-C(더 작은 tier + STOP) 시나리오는 성립하지 않는다.
```

> 참고: PostgreSQL 메모리 사용량은 인스턴스 크기에 비례해 `shared_buffers` 가 조정되므로
> "2.23 GB 가 반드시 필요하다" 고 단정할 수는 없다. 그러나 **1.70 GB 로 2.2배 축소**하면서
> 위 4가지 위험을 동시에 감수할 근거는 없다. 서비스 전 단계의 절감 목적으로는 **STOP 이 훨씬 안전하고 효과도 크다.**

## 7. Cloud SQL 비용 분해

STOP(`activation-policy=NEVER`) 시 **컴퓨트만 미과금**이고 스토리지·백업은 계속 과금된다.

| 구성 | 월 USD | STOP 시 |
|---|---:|:---:|
| 컴퓨트 (vCPU + RAM) | **58.7** | **미과금** |
| 스토리지 15 GB SSD + 백업 + PITR 로그 | **16.8** | **계속 과금** |
| **합계 (ALWAYS)** | **75.5** | — |

## 8. ON 비율별 Cloud SQL 비용 (WO §10)

```text
Cloud SQL 월비용 = 58.7 × (ON 비율) + 16.8
```

| ON 비율 | Cloud SQL 월 USD | 월 KRW |
|---:|---:|---:|
| 10% | **$22.7** | 31,800원 |
| 25% | **$31.5** | 44,100원 |
| 50% | **$46.2** | 64,700원 |
| 75% | **$60.8** | 85,100원 |
| 100% (현재) | **$75.5** | 105,700원 |

---

# B. Cloud Run

## 9. 현재 정책 (WO §11)

**`o4o-core-api` 만 `minScale=1` 이고 나머지 9개는 전부 0 이다** (실측 전수 확인).

```text
glucoseview-web · glycopharm-web · k-cosmetics-web · kpa-branch-web
kpa-society-web · neture-web · o4o-admin-dashboard · pharmacy-hub-web
signage-player-web                                    → minScale = 0
o4o-core-api                                          → minScale = 1
```

**canonical 은 workflow 다** (`.github/workflows/deploy-api.yml`):

```text
284:  --memory=1Gi
285:  --cpu=1
286:  --min-instances=1     ← 이 값이 배포 때마다 적용된다
287:  --max-instances=10
```

→ **추가 절감 후보는 `o4o-core-api` 하나뿐이며, 다른 서비스에는 여지가 없다.**

## 10. 트래픽 실측 (WO §12)

```text
최근 2일 요청 수: 2026-09-04 806건 · 2026-09-05 194건 (조회 시점까지)
```

**요청량 자체는 무시 가능한 수준**이며 Cloud Run 요청 과금은 사실상 0 이다.
비용을 좌우하는 것은 **요청 수가 아니라 인스턴스 상주 시간**이다
(`minScale=1` = 월 730시간 상주).

## 11. minScale 시나리오 (WO §13)

| 시나리오 | 구성 | 월 USD | cold start | 운영 |
|---|---|---:|---|---|
| **RUN-A** | `minScale=1` 항상 (현행) | **10.1** | 없음 | 단순 |
| **RUN-B** | `minScale=0` 항상 | **1.5** | 첫 요청 **15.8초** | 단순 (workflow 1줄) |
| **RUN-C** | 업무시간 1 / 그 외 0 | **≈ 4.0** | 업무시간 외 첫 요청만 | **자동화 필요** |

### 11-1. RUN-C 는 비추천

업무시간(평일 09~19시 KST ≈ 월 220시간 / 730시간 = 30%) 가정 시 약 $4.0 로,
RUN-B 대비 추가 이득은 **월 $2.5 (약 3,500원)** 에 불과하다. 반면:

- Cloud Scheduler + 권한 설정이 필요하고
- **배포가 일어나면 workflow 값(1)으로 덮어써져** 스케줄러와 충돌한다

```text
판정: RUN-C = 복잡성 대비 실익 없음 (WO §28 복잡성 패널티 적용)
```

### 11-2. cold start 재평가 (WO §14)

- 500 의 원인은 **CORS 였고 cold start 가 아니었음**이 이미 확정되었다 (선행 CHECK).
- 남은 것은 **지연 15.8초** 하나뿐이며, 이는 **장애가 아니라 대기**다.
- 서비스 전 단계이고 실사용자가 없으므로 **감수 가능**하다.
- 단, 개발자가 오랜만에 접속할 때마다 16초를 기다리는 개발 편의 저하는 실재한다.

## 12. workflow 지속성 (WO §15)

```text
수동 gcloud run services update  ≠  지속 설정
```

실증: 2026-09-04 14:55 에 수동으로 `minScale=0` 을 적용했으나
2026-09-05 00:12 CI 배포가 **1 로 복원**했다 (약 9시간 만에 소멸).

```text
판정: minScale 정책은 deploy-api.yml 이 canonical 이어야 한다.
      이번 WO 에서는 수정하지 않았다 (census-only + CLAUDE.md CI 변경 중지 조건).
```

---

# C. Load Balancer

## 13. 현재 구조 (WO §16-17)

| 구성 | 내용 |
|---|---|
| static IP | **1개** — `neture-static-ip` (`136.110.132.35`) · IN_USE |
| forwarding rules | **2개** — HTTP(80) 리다이렉트 + HTTPS(443) |
| target proxies | 2개 (`o4o-global-lb-target-proxy-2` + 리다이렉트용) |
| URL maps | 2개 (`o4o-global-lb` + `neture-https-frontend-redirect`) |
| **host rules** | **10개 규칙 / 실제 호스트명 20개** |
| backend services | **9개** |
| NEG | **9개** (serverless NEG → Cloud Run) |
| TLS | Certificate Manager (`cm-cert-neture` 등 3개 ACTIVE) |

**host rule 전체**

```text
admin.neture.co.kr
neture.co.kr / www.neture.co.kr
glycopharm.co.kr / www.glycopharm.co.kr
kpa-society.co.kr / www.kpa-society.co.kr
k-cosmetics.site / www.k-cosmetics.site
glucoseview.co.kr / www.glucoseview.co.kr
pharmacyhub.co.kr / www.pharmacyhub.co.kr
api.neture.co.kr / api.glycopharm.co.kr / api.glucoseview.co.kr
  / api.kpa-society.co.kr / api.k-cosmetics.site   ← API 5개 호스트가 1개 backend 로 수렴
```

## 14. LB 판정 (WO §18-20)

```text
판정: KEEP_RECOMMENDED
```

| 관점 | 내용 |
|---|---|
| 절감액 | 월 **$18.8** (약 26,300원) |
| 대체 작업량 | **20개 호스트명**에 대한 Cloud Run 도메인 매핑 재구성 |
| DNS | Gabia 에서 **20건 레코드 재작성** (현재는 A 레코드가 전부 단일 IP 를 가리켜 단순) |
| TLS | Certificate Manager → 매핑별 인증서 체계로 이전. 전환 중 **TLS 중단 위험** |
| API 라우팅 | `api.*` 5개 호스트가 한 backend 로 수렴하는 구조를 매핑 5건으로 분해해야 함 |
| 복구 난이도 | **높음** — 되돌리려면 LB 를 재구축하고 DNS 를 다시 20건 되돌려야 한다 |
| static IP | LB 제거 시 고정 IP 이점 상실 |

**WO §28 의 복잡성 패널티가 정확히 적용되는 사례다.**
월 2.6만원을 아끼려고 **20개 도메인의 DNS·TLS 를 재구성**하는 것은 서비스 전 단계에서도
위험 대비 실익이 낮다. **유지를 권고한다.**

---

# D. 기타 고정비

## 15. Artifact Registry — **정책은 켜졌으나 아직 실행되지 않았다** (WO §21)

| 시점 | o4o-api | gcr.io | cloud-run-source-deploy | siteguide | 합계 |
|---|---:|---:|---:|---:|---:|
| 정책 적용 전 (09-04) | 52,046 MB | 7,352 MB | 2,775 MB | 98.6 MB | **62,272 MB** |
| **현재 (09-05)** | 52,040 MB | 7,354 MB | 2,775 MB | 98.6 MB | **62,268 MB** |

```text
실제 감소량 ≈ 4 MB (사실상 0)
```

정책 상태는 **4개 repo 전부 LIVE** 이다 (`dryRun` 해제 확인). 즉 설정은 정상이며,
**Artifact Registry 가 정책을 평가하는 주기가 아직 도래하지 않았을 뿐**이다.

```text
판정: 설정 정상 / 효과 미실현 — 며칠 내 재확인 필요
예상 절감 월 $5.2 는 "예정" 이지 "실현" 이 아니다.
```

## 16. 기타 서비스 (WO §22-23)

- Cloud Run 9개 서비스: **전부 `minScale=0`** → 추가 절감 여지 **없음**
- Storage / Secret Manager / Logging: 소액. **`KEEP_MINIMAL`** 유지. 신규 이상치 **없음**
- Cloud SQL availability: 이미 **ZONAL**(비-HA) → 여기서 더 낮출 것 없음

---

# E. 비용 시나리오 (WO §24-25)

**공통 고정 항목**: LB $18.8 · 기타 Cloud Run $4.5 · Artifact(정책 실행 후) $1.0 · egress/secret/storage $3.4

| # | 시나리오 | Cloud SQL | core-api | LB | **월 USD** | **월 KRW** | 위험 / 불편 |
|:-:|---|---|---|---|---:|---:|---|
| **1** | **안정 우선** | ALWAYS | min=1 | 유지 | **$113.3** | **158,600원** | 없음 |
| **2** | **STOP 중심** | STOP (25% ON) | min=1 | 유지 | **$69.3** | **97,000원** | START 대기 · 수동 운영 |
| **3** | **절감 우선** | STOP (25% ON) | **min=0** | 유지 | **$60.7** | **85,000원** | + cold start 15.8초 |
| **4** | **극단적 최소화** | STOP (25% ON) | min=0 | **제거** | **$41.9** | **58,700원** | **DNS/TLS 20건 재구성 · 복구 난이도 높음** |

> **시나리오 3 에서 tier downsize 는 제외했다** (§6-1 NOT_VIABLE). WO §24 의 Scenario 3·4 원문은
> downsize 를 포함했으나 **실측 결과 불가능**하므로 STOP + minScale=0 조합으로 대체 계산했다.

## 17. 추천안(시나리오 3)의 ON 비율별 실제 비용

```text
월비용 = 58.7 × (SQL ON 비율) + 16.8 + 29.2
```

| SQL ON 비율 | 월 USD | 월 KRW | 비고 |
|---:|---:|---:|---|
| 10% | **$51.9** | **72,700원** | 개발 거의 없음 |
| 25% | **$60.7** | **85,000원** | **현실적 기준선** |
| 50% | **$75.4** | 105,500원 | 개발 활발 |
| 75% | **$90.0** | 126,000원 | — |
| 100% | **$104.7** | 146,600원 | STOP 안 한 것과 동일 |

> **중요**: 지금처럼 PharmacyHub 개발이 진행 중이면 ON 비율이 50% 를 넘기기 쉽다.
> 그 경우 절감 폭은 **$113.3 → $75.4 (약 5.3만원 절감)** 수준이며,
> 표 아래쪽 숫자는 **개발이 실제로 멈춘 기간에만** 달성된다.

---

# F. 목표 구간 (WO §26)

실측 기반으로 확정한 3개 구간이다.

| 구간 | 구성 | 월 KRW |
|---|---|---:|
| **안정 우선** | 시나리오 1 (현행 + AR 정리) | **158,600원** |
| **절감 우선 (추천)** | 시나리오 3 | **72,700 ~ 105,500원** (ON 비율별) |
| **최저 실용** | 시나리오 4 (LB 제거) | **58,700원** |

> WO §26 이 예시로 든 구간(7~9만 / 5~6만 / 3~4만)보다 **전 구간이 높다.**
> 이유는 **Cloud SQL 스토리지·백업 $16.8 과 LB $18.8 이 STOP 으로도 사라지지 않는 하한**이기 때문이다.
> LB 를 유지하는 한 **이론적 하한은 약 $51.9 (72,700원)** 이고, LB 까지 제거해야 5.8만원대에 닿는다.
> **3~4만원대는 현재 구조에서는 도달 불가능하다.**

---

# G. 최종 추천 (WO §29-30)

```text
RECOMMENDED_PRELAUNCH_CONFIG = 시나리오 3 (절감 우선)
```

| 축 | 권고 | 근거 |
|---|---|---|
| **Cloud SQL tier** | **현행 `db-custom-1-3840` 유지** | 축소 불가 (§6-1). 메모리 p95 2.23 GB > g1-small 1.70 GB |
| **Cloud SQL 운영** | **미사용 시 STOP** | 단일 최대 레버 (최대 월 $58.7). restore 검증 완료로 안전성 확보됨 |
| **`o4o-core-api`** | **`deploy-api.yml` 에서 `--min-instances=0`** | 월 $8.6. **SQL 이 STOP 인 동안 warm 인스턴스는 무의미**하므로 STOP 과 논리적으로 짝을 이룬다 |
| **Load Balancer** | **유지** | 월 $18.8 절감 대비 20개 도메인 DNS/TLS 재구성 위험이 과도 |
| **Artifact Registry** | **현행 정책 유지 + 며칠 후 실효 재확인** | 설정은 정상, 실행 대기 중 |
| **RUN-C (시간대 자동화)** | **하지 않음** | RUN-B 대비 월 $2.5 이득에 자동화·배포 충돌 리스크 |

**추천 구성 월비용: 약 $60.7 (85,000원) — SQL ON 25% 기준**
개발이 멈춘 달에는 **$51.9 (72,700원)** 까지 내려간다.

### 추천 우선순위 (WO §30 기준)

```text
1순위  Cloud SQL STOP 운영          — 절감 최대 · 복잡성 낮음 · 이미 준비 완료
2순위  deploy-api.yml minScale=0    — 절감 중간 · 1줄 변경 · SQL STOP 과 짝
3순위  Artifact Registry 실효 확인  — 절감 소액 · 추가 작업 없음 (대기만)
보류   LB 제거                       — 절감 있으나 복잡성/위험 과도
제외   Cloud SQL downsize            — 기술적으로 불가
제외   RUN-C 시간대 자동화           — 실익 없음
```

---

# H. 변경 내역 (WO §31)

| 항목 | 값 |
|---|:---:|
| Cloud SQL resize / STOP | **0** |
| Cloud Run minScale 변경 | **0** |
| deploy workflow 변경 | **0** |
| LB / DNS 변경 | **0** |
| Artifact policy 변경 | **0** |
| DB write | **0** |
| 코드 변경 | **0** — 산출물은 본 CHECK 1개 |
| **UNKNOWN** | **0** |

수행한 것은 **describe · Monitoring API 조회 · logging read · 소스 정독** 뿐이다.

---

# I. 최종 판정 (WO §34)

| 완료 기준 | 결과 |
|---|:---:|
| Cloud SQL right-sizing 판정 | **완료** (`NOT_DOWNSIZABLE`) |
| Cloud Run minScale 비용 판정 | **완료** (RUN-A/B/C) |
| LB 최종 판정 | **완료** (`KEEP_RECOMMENDED`) |
| Artifact cleanup 효과 확인 | **완료** (설정 정상 · **효과 미실현**) |
| 4개 cost scenario | **완료** |
| infra 변경 = 0 | **PASS** |
| DB write = 0 | **PASS** |
| DNS 변경 = 0 | **PASS** |
| UNKNOWN = 0 | **PASS** |

```text
GCP_ULTRA_LOW_COST_PRELAUNCH_PLAN_READY
```

---

# J. 다음 실행 WO

```text
1. deploy-api.yml 의 --min-instances 정책 확정 (CI 변경 → 승인 필요)
   → 0 으로 변경 시 월 $8.6 절감이 "지속" 된다

2. Cloud SQL STOP 운영 전환 (재시도)
   → 개발 세션이 없는 시간대 확인 후 STOP → START 왕복 검증
   → CLOUD_SQL_STOP_READY 는 유효

3. Artifact Registry cleanup 실효 재확인 (며칠 후)
   → 62.3 GB 가 실제로 줄었는지 확인, 안 줄었으면 정책 재검토

보류: LB 제거 · Cloud SQL downsize · RUN-C 자동화
```

---

## K. 문서 정합 (CLAUDE.md §16-5)

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건
```
