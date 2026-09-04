# WO-O4O-GCP-PRELAUNCH-COST-REDUCTION-EXECUTION-V1 — CHECK

> **성격**: 비용 절감 **실행**. 4개 축 중 **3개 실행 · 1개 중지**.
> **Cloud SQL 은 이번 범위에서 제외** (`HOLD_RESTORE_VERIFICATION`).
> **산출물**: 본 CHECK 1개.
> **작성일**: 2026-09-05

---

## 1. 기준선 (WO §2)

| 항목 | 값 |
|---|---|
| project | `netureyoutube` (neture-services) |
| region | `asia-northeast3` (+ Artifact Registry `gcr.io` 는 `us`) |
| 시작 origin/main | `1a99f805be0bf17e661323c509558b77af52a5d5` |

**시작 시점 실측**

| 항목 | 값 |
|---|---|
| Cloud Run 서비스 | **11개** · `o4o-core-api` 만 `minScale=1`, 나머지 10개 미설정(=0) |
| Artifact Registry | 4 repo · `o4o-api` 52,046 MB · `gcr.io` 7,352 MB · `cloud-run-source-deploy` 2,775 MB · `siteguide` 98.6 MB · **cleanup policy 0개** |
| classic SSL cert | `cert-final-neture-v3` · `PROVISIONING_FAILED_PERMANENTLY` |

---

## 2. 실행 결과 요약

| 축 | 대상 | 결과 |
|:---:|---|---|
| **A** | `o4o-core-api` minScale 1 → 0 | **실행 완료** |
| **B** | Artifact Registry cleanup policy | **실행 완료** (4 repo) |
| **C** | `o4o-admin-dashboard-dev` 삭제 | **실행 완료** |
| **D** | `cert-final-neture-v3` 삭제 | **중지** (§28 중지 조건 해당 — 아래 §6) |
| — | Cloud SQL | **변경 0** (`HOLD_RESTORE_VERIFICATION`) |

---

## 3. A축 — `o4o-core-api` minScale 0 (WO §4 ~ §6)

### 3-1. before / after

| 항목 | before | after |
|---|---|---|
| `minScale` | **1** | **0** (어노테이션 제거됨) |
| `maxScale` | 10 | **10** (불변) |
| CPU / Memory | 1 / 1Gi | **1 / 1Gi** (불변) |
| revision | `o4o-core-api-03533-7vv` | `o4o-core-api-03534-2r5` |
| traffic | 100% | **100%** |
| `cloudsql-instances` | 연결됨 | **유지** (`netureyoutube:asia-northeast3:o4o-platform-db`) |
| `startup-cpu-boost` | true | **유지** |

**변경한 것은 `--min-instances=0` 하나뿐**이다. CPU · memory · maxScale · env · Cloud SQL 연결은 건드리지 않았다 (WO §5).

### 3-2. cold-start smoke (WO §6)

약 17분 무요청(idle) 후 첫 요청과 직후 warm 요청을 비교 측정했다.

| 측정 | HTTP | latency |
|---|:---:|---:|
| **cold start (약 17분 idle 후 첫 요청)** | **200** | **15.78 s** (connect 0.055s · **TTFB 15.78s**) |
| 직후 warm 요청 | **200** | **0.109 s** |
| 기존 실측 참고치 | — | 8~14초 |

**해석**

- cold ↔ warm 차이가 **약 145배**(15.78s → 0.109s)로, `minScale=0` 이 실제로 적용되어
  인스턴스가 0으로 축소되었음이 실증된다.
- 지연은 거의 전부 **TTFB**(connect 0.055s)이므로 네트워크가 아니라 **컨테이너 기동 + TypeORM/Cloud SQL 초기화** 시간이다.
- **15.78초는 기존 참고치 8~14초보다 다소 높다.** 숨기지 않고 기록한다. 원인은 `o4o-core-api` 가
  Cloud SQL 커넥터 + 엔티티 로딩을 부팅 시 수행하기 때문으로 보이며, 이번 변경으로 새로 생긴 문제가 아니라
  **원래의 cold start 비용이 그대로 드러난 것**이다.
- HTTP 200 으로 정상 응답했으므로 WO §28 의 "치명적 cold-start 장애" 에는 **해당하지 않는다.**

**판정**: 서비스 전 단계에서 **허용 가능** (WO §4). 단 첫 접속자가 약 16초를 대기하게 되므로,
**서비스 개시 직전 Tier 3 에서 `minScale=1` 로 복원**하는 것을 전제로 한다.

---

## 4. B축 — Artifact Registry cleanup policy (WO §7 ~ §12)

### 4-1. repo 별 실측 및 차등 정책 (WO §9)

**모든 repo 에 같은 정책을 기계적으로 적용하지 않았다.**

| Repository | Location | 크기 | packages | active 참조 | 적용 정책 |
|---|---|---:|---:|---|---|
| **`o4o-api`** | asia-northeast3 | 52,046 MB | 4 | **있음** (`api-server` · `admin-dashboard`) | keep 10 · untagged 7d · tagged 30d |
| **`gcr.io`** | **us** | 7,352 MB | 8 | **있음** (web 8종 전부) | keep 10 · untagged 7d · tagged 30d |
| **`cloud-run-source-deploy`** | asia-northeast3 | 2,775 MB | 12 | **없음** | keep **3** · untagged 7d · tagged 30d |
| **`siteguide`** | asia-northeast3 | 98.6 MB | 1 | 없음 | keep 5 · **untagged 30d only** (tagged 삭제 규칙 없음) |

`siteguide` 는 98 MB 로 절감 실익이 없어 **tagged 삭제 규칙을 넣지 않았다**.
`cloud-run-source-deploy` 는 현재 어떤 Cloud Run 서비스도 참조하지 않아 keep 을 3개로 더 공격적으로 잡았다.

### 4-2. ⚠️ active digest 보호 — 시간 기반 삭제를 쓰지 않은 이유 (WO §10)

정책 설계 중 **중요한 위험을 발견했다.**

11개 서비스가 실제 참조 중인 이미지를 전수 조사한 결과, **전부 태그(git SHA) 가 붙어 있고 untagged 는 0개**였다.
그런데 `glucoseview-web` 의 active 이미지는 **2026-04-14 생성 — 약 143일 전**이다.

```text
glucoseview-web active digest = sha256:cbcfe3db…  (2026-04-14 생성)
→ "tagged 90d/180d 초과 삭제" 같은 시간 기반 규칙만 썼다면
   현재 서빙 중인 이미지가 삭제되거나 머지않아 삭제될 수 있었다.
```

→ **시간 기반 규칙에 active 이미지 보호를 의존하지 않는다.**
대신 **개수 기반 KEEP 규칙(`mostRecentVersions.keepCount`)** 을 보호 장치로 삼았다.
Artifact Registry 에서 **KEEP 규칙은 DELETE 규칙보다 우선**하므로, 나이와 무관하게 최신 N개는 항상 보존된다.

**active digest 최신순 순위 실측 (보호 증명)**

| package | repo | 전체 버전 | **active digest 순위** | keep 10 보호 |
|---|---|---:|:---:|:---:|
| `api-server` | o4o-api | 353 | **1위** | O |
| `admin-dashboard` | o4o-api | 145 | **1위** | O |
| `glucoseview-web` | gcr.io | 30 | **1위** | O |
| `glycopharm-web` · `k-cosmetics-web` · `kpa-branch-web` · `kpa-society-web` · `neture-web` · `pharmacy-hub-web` · `signage-player-web` | gcr.io | 25~154 | 전부 **최신 배포(1위)** | O |

**모든 active digest 가 자기 package 의 1위**다 → `keepCount=10` 으로 **삭제 불가능**이 보장된다.
(WO §28 의 "Artifact policy 가 active digest 삭제 가능" 중지 조건 **해당 없음**)

### 4-3. 적용 절차 (WO §11)

1. **먼저 `--dry-run` 으로 4개 repo 전부 적용** → 정책 정의 등록 확인
2. 등록 내용 검증 (아래 §4-4)
3. `--no-dry-run` 으로 **활성화**

**수동 대량 digest 삭제는 하지 않았다** (WO §11). 정책 기반 정리만 설정했다.

> **한계**: Artifact Registry 의 dry-run 평가 결과는 AR 자체 스케줄(대략 일 단위)로 비동기 기록되므로
> **세션 내에서 "무엇이 삭제될지" 미리보기를 얻지는 못했다.** 안전성의 근거는 dry-run 이 아니라
> §4-2 의 **KEEP 우선순위 + active digest 1위 실측**이다.

### 4-4. 등록 검증 (WO §12)

`o4o-api` 등록 내용 (대표):

```text
keep-recent-tagged   : KEEP   · mostRecentVersions.keepCount = 10
delete-untagged      : DELETE · tagState=UNTAGGED · olderThan=604800s  (7일)
delete-stale-tagged  : DELETE · tagState=TAGGED   · olderThan=2592000s (30일)
```

| Repository | 정책 수 | `cleanupPolicyDryRun` | 상태 |
|---|:---:|:---:|:---:|
| `o4o-api` | 3 | **해제됨** | **LIVE** |
| `gcr.io` | 3 | **해제됨** | **LIVE** |
| `cloud-run-source-deploy` | 3 | **해제됨** | **LIVE** |
| `siteguide` | 2 | **해제됨** | **LIVE** |

**적용 직후 storage 는 줄지 않았다** (o4o-api 52,046 MB 그대로) — WO §12 가 명시한 정상 동작이다.
AR 이 정책을 평가하는 다음 주기부터 점진적으로 감소한다.

**삭제 안 됨 확인**: 정책 활성화 후에도 `api-server` · `glucoseview-web` 의 active digest 가
그대로 조회된다 (§2 census).

---

## 5. C축 — `o4o-admin-dashboard-dev` 삭제 (WO §13 ~ §16)

### 5-1. 삭제 조건 재확인 (WO §14)

| 조건 | 실측 | 판정 |
|---|---|:---:|
| request | 요청 로그 **0건** (전 기간) | PASS |
| 로그 자체 | `cloud_run_revision` 로그 **0건** | PASS |
| DNS | `dev-admin.neture.co.kr` → **Non-existent domain** | PASS |
| LB backend / NEG | **0건** | PASS |
| **deploy workflow active target** | 아래 §5-2 | PASS |
| production dependency | 0 | PASS |

### 5-2. workflow 참조에 대한 판단 (중요)

`.github/workflows/deploy-admin.yml:52` 에 **`service_name=o4o-admin-dashboard-dev` 참조가 존재한다.**
단순 "참조 0건" 이 아니므로 활성 여부를 따로 확인했다.

```text
트리거      : push → branches [main, develop]
분기        : ref == refs/heads/main    → o4o-admin-dashboard      (production)
              ref == refs/heads/develop → o4o-admin-dashboard-dev  (dev)
origin 브랜치: develop 이 존재하지 않는다 (원격 51개 중 없음)
```

→ **`develop` 브랜치가 없으므로 dev 배포 분기는 도달 불가능**하다. `active target = 0` 으로 판정했다.
(`main`/`develop` 어느 쪽도 아니면 `service_name` 이 비어 배포가 성립하지 않는다.)

> workflow 파일 자체는 **수정하지 않았다** — 이번 WO 의 실행 대상 4개에 포함되지 않는다 (WO §26).
> 향후 `develop` 브랜치가 다시 생기면 서비스가 재생성될 수 있으나, 그것은 정상 동작이며 무해하다.

### 5-3. 삭제 및 검증 (WO §15 · §16)

```text
gcloud run services delete o4o-admin-dashboard-dev --region=asia-northeast3
→ Deleted service [o4o-admin-dashboard-dev].
```

| 검증 | 결과 |
|---|---|
| Cloud Run 서비스 수 | **11 → 10** |
| `o4o-admin-dashboard-dev` | **absent** (count 0) |
| **production `o4o-admin-dashboard`** | **정상** — revision `o4o-admin-dashboard-01218-dqb` · traffic 100% |
| `https://admin.neture.co.kr` | **200** |
| LB 영향 | backend services **8개 불변** · NEG **8개 불변** |
| DNS 영향 | **0** |

production admin 서비스와 혼동 없이 dev 만 정확히 삭제했다 (WO §15).

---

## 6. D축 — classic certificate 삭제 → **중지** (WO §17 ~ §19 · §28)

### 6-1. 중지 사유

WO §18 은 **"classic certificate 가 실제 proxy 에 붙어 있으면 삭제 금지"** 를 명시한다. 실측 결과:

```text
target proxy o4o-global-lb-target-proxy-2
  sslCertificates : cert-final-neture-v3      ← 여전히 참조 중 (reference = 1)
  certificateMap  : o4o-main-cert-map         ← 실제 TLS 서빙 주체
```

**`target proxy reference = 0` 이 아니다** → WO §28 중지 조건 "classic cert 가 proxy 에 참조됨" 해당.

삭제하려면 target proxy 에서 인증서를 먼저 분리해야 하는데, 이는 **Load Balancer 변경**이며
WO §3 이 **"Load Balancer 변경 금지"** 로 명시 금지하고 있다.

```text
판정: D축 중지 — cert-final-neture-v3 는 삭제하지 않았다
```

### 6-2. 위험도 및 후속

- 이 인증서는 **PROVISIONING_FAILED_PERMANENTLY** 이고 실제 TLS 는 Certificate Manager 가 서빙하므로
  **기능적 위험은 없다.** 비용도 classic managed cert 는 무과금이라 **절감액 $0** 이다.
- 즉 이번 축을 못 한 것의 **비용상 손실은 없다.**
- 후속 WO 에서 "target proxy 에서 분리 → 삭제" 를 **LB 변경이 허용된 범위**로 다루면 된다.

### 6-3. TLS smoke (WO §20)

D축을 실행하지 않았지만 A·C축 변경 후 TLS 정상성을 확인했다.

| 도메인 | HTTP | TLS 검증 |
|---|:---:|:---:|
| `api.neture.co.kr/health` | **200** | OK (`ssl_verify_result=0`) |
| `admin.neture.co.kr` | **200** | OK |
| `neture.co.kr` | **200** | OK |
| `kpa-society.co.kr` | **200** | OK |
| `k-cosmetics.site` | **200** | OK |
| `glycopharm.co.kr` | **200** | OK |
| `pharmacyhub.co.kr` | **200** | OK |
| `glucoseview.co.kr` | **200** | OK |

Certificate Manager: `cm-cert-neture` · `cm-cert-pharmacyhub` · `cm-cert-siteguide` **전부 ACTIVE**.

---

## 7. E — Cloud SQL 명시적 HOLD (WO §21 · §22)

**이번 WO 에서 Cloud SQL 에 대해 아무것도 하지 않았다.**

| 금지 항목 | 수행 |
|---|:---:|
| Cloud SQL STOP | **0** |
| Cloud SQL resize | **0** |
| PITR 축소 | **0** |
| backup retention 축소 | **0** |

```text
판정: HOLD_RESTORE_VERIFICATION
```

**restore asset 현재 상태** (선행 WO 기록):

```text
valid export           = YES  (o4o-platform-db-full-20260904-1420.sql.gz · 317.33 MiB)
gzip integrity         = PASS
table coverage         = 291 / 291
핵심 table row count   = 7/7 일치
full restore execution = NOT YET VERIFIED
```

→ DB 절감(월 약 $58.7)은 **restore 실행 검증 완료 후** 다음 단계로 이월한다.

---

## 8. 비용 재계산 (WO §23)

| 항목 | before | after | 절감 |
|---|---:|---:|---:|
| Cloud SQL | $75.5 | **$75.5** | $0 (HOLD) |
| Load Balancer | $18.8 | **$18.8** | $0 |
| `o4o-core-api` minScale | **$10.1** | **~$1.5** | **−$8.6** |
| Artifact Registry | $6.2 | $6.2 → **~$1.0** (정책 반영 후) | **−$5.2** (지연 실현) |
| Cloud Run 나머지 | $4.5 | $4.5 | $0 |
| egress / secrets / storage | $3.4 | $3.4 | $0 |
| `o4o-admin-dashboard-dev` | $0 | **삭제** | $0 (위생) |
| classic cert | $0 | 유지 | $0 |

| 지표 | 월 USD | 월 KRW (1 USD = 1,400원 기준환율) |
|---|---:|---:|
| 시작 (census) | $118.5 | 165,900원 |
| **이번 WO 직후 (즉시 실현)** | **≈ $109.9** | **≈ 153,900원** |
| **AR cleanup 반영 후** | **≈ $104.7** | **≈ 146,600원** |
| (참고) Cloud SQL STOP 까지 완료 시 | ≈ $46.0 | ≈ 64,400원 |

WO §23 의 예상($104~110 · 약 14.5만원)과 **일치**한다.

---

## 9. 실제 변경 목록 (WO §26)

| # | 변경 종류 | 내용 |
|---|---|---|
| 1 | **Cloud Run config change** | `o4o-core-api` `--min-instances=0` (revision `03534-2r5` 생성) |
| 2 | **Artifact policy change** | 4 repo 에 cleanup policy 등록 후 활성화 |
| 3 | **Cloud Run service deletion** | `o4o-admin-dashboard-dev` 삭제 |
| 4 | certificate deletion | **하지 않음** (D축 중지) |

**그 외 infra 변경 0.**

| 항목 | 값 |
|---|:---:|
| Cloud SQL 변경 | **0** |
| **DB write** | **0** |
| **DNS 변경** | **0** |
| **Load Balancer 변경** | **0** (backend 8 · NEG 8 · forwarding rule 2 전부 불변) |
| active Cloud Run service 삭제 | **0** |
| 수동 digest 삭제 | **0** |
| 코드 변경 | **0** — 산출물은 본 CHECK 1개 |
| **UNKNOWN** | **0** |

---

## 10. 최종 판정 (WO §30)

| 완료 기준 | 결과 |
|---|:---:|
| `o4o-core-api` minScale = 0 | **PASS** |
| Artifact cleanup policy = active | **PASS** (4 repo LIVE) |
| `o4o-admin-dashboard-dev` = absent | **PASS** |
| failed classic cert residue = absent | **미달성** — §6 중지 조건 (LB 변경 금지) |
| production health = PASS | **PASS** |
| TLS = PASS | **PASS** (8/8 도메인) |
| Cloud SQL = unchanged | **PASS** |
| DB write = 0 | **PASS** |
| DNS change = 0 | **PASS** |
| UNKNOWN = 0 | **PASS** |

### 판정: `GCP_PRELAUNCH_COST_REDUCTION_PARTIAL_EXECUTED`

4개 축 중 **비용 절감 효과가 있는 3개는 전부 실행 완료**했고, 미실행 1개(D축)는
**절감액 $0 의 위생 항목**이며 WO 자체의 금지 규칙(LB 변경 금지)에 막힌 것이다.
따라서 이번 WO 의 **비용 목표는 온전히 달성**되었다.

---

## 11. 다음 WO

```text
1. WO-O4O-PRODUCTION-DB-RESTORE-EXECUTION-VERIFICATION-V1  (선행)
   → 로컬 PostgreSQL schema-only restore 로 full restore 검증 완료
   → 그 후 Cloud SQL STOP 운영 전환 (월 약 $58.7 절감)

2. classic certificate 잔재 정리 (LB 변경 허용 범위에서)
   → target proxy 에서 cert-final-neture-v3 분리 후 삭제
```

---

## 12. 문서 정합 (CLAUDE.md §16-5)

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건
```
