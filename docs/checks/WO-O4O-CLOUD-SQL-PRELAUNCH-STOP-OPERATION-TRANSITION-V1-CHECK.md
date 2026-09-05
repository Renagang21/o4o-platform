# WO-O4O-CLOUD-SQL-PRELAUNCH-STOP-OPERATION-TRANSITION-V1 — CHECK

> **결과**: **STOP 을 실행하지 않았다.** WO §6 의 STOP 금지 조건과 §33 의 중지 조건에 해당한다.
> **Cloud SQL 변경 0** · production DB write 0 · 코드 변경 0.
> **판정**: `CLOUD_SQL_STOP_OPERATION_HOLD`
> **작성일**: 2026-09-05

---

## 1. 기준선 (WO §3)

| 항목 | 값 |
|---|---|
| START_HEAD / origin/main | `d700df67153a39cd77448b8f6cfb151f47bc3c0e` |
| branch | `main` |
| project | `netureyoutube` |

**Cloud SQL before-state (WO §7)** — 작업 종료 시점까지 **그대로 유지**

| 항목 | 값 |
|---|---|
| instance | `o4o-platform-db` |
| state | **RUNNABLE** |
| **activationPolicy** | **ALWAYS** |
| tier | `db-custom-1-3840` |
| region | `asia-northeast3` |
| databaseVersion | POSTGRES_15 |
| connectionName | `netureyoutube:asia-northeast3:o4o-platform-db` |
| disk / autoResize | 15 GB / True |

**작업 시작 시 작업트리 상태 — 다른 세션의 진행 중 작업이 존재했다**

```text
 M packages/shared-space-ui/src/guide/copy/pharmacy-hub.ts
 M services/web-pharmacy-hub/src/App.tsx
 M services/web-pharmacy-hub/src/config/navigation.ts
 M services/web-pharmacy-hub/src/pages/community/CommunityHomePage.tsx
?? ph-smoke.local.mjs                                   ← 스모크 스크립트
?? services/web-pharmacy-hub/src/components/HomeNewsCard.tsx
?? services/web-pharmacy-hub/src/lib/api/pharmacyHubNews.ts
?? services/web-pharmacy-hub/src/pages/news/
```

**이 파일들은 일절 건드리지 않았다.**

---

## 2. 선행 조건 재확인 (WO §4)

직전 WO(`…RESTORE-EXECUTION-VERIFICATION-AND-CLOUD-SQL-STOP-READINESS-V1`) 기준으로 충족되어 있다.

| 항목 | 상태 |
|---|:---:|
| export object exists | PASS |
| md5 verified | PASS |
| schema restore execution | PASS |
| 291/291 tables | PASS |
| critical data restore | PASS (row 7/7 일치) |
| backup healthy | PASS |
| PITR healthy | PASS |

→ **restore asset 측면의 STOP 준비는 여전히 유효하다.** 이번 HOLD 는 restore 문제가 아니다.

---

## 3. ⛔ STOP 금지 조건 발동 (WO §5 · §6)

### 3-1. 다른 세션이 production DB 를 실사용 중

STOP 실행 직전 최근 30분 요청 로그를 확인했다.

| 서비스 | 최근 30분 요청 수 |
|---|---:|
| **`o4o-core-api`** | **63** |
| `neture-web` | 14 |
| `pharmacy-hub-web` | 9 |
| `kpa-society-web` | 6 |

`o4o-core-api` 요청 63건이 **전부 PharmacyHub 계열 엔드포인트**였다.

```text
/api/v1/pharmacy-hub/news?type=news&sort=latest&page=1&limit=20
/api/v1/pharmacy-hub/home/latest?type=all&limit=6
/api/v1/pharmacy-hub/forum/posts?limit=20&sortBy=latest
/api/v1/public/services/pharmacy-hub/footer-legal
```

**마지막 요청은 확인 시점 기준 10초 전**이었고, 이후 5분 구간에서도 45건이 이어졌다.
즉 **조회 시점에 실시간으로 진행 중**인 작업이다.

### 3-2. 작업트리 증거와 정확히 일치

로그의 엔드포인트(`/pharmacy-hub/news`)와 작업트리의 미추적 파일
(`lib/api/pharmacyHubNews.ts` · `pages/news/` · `components/HomeNewsCard.tsx`) 및
`ph-smoke.local.mjs` 가 **같은 작업**을 가리킨다.

### 3-3. WO 조항 대조

WO §6 은 다음이 진행 중이면 STOP 을 금지한다.

```text
migration / production smoke / DB census / admin·operator E2E
/ B2B order test / PharmacyHub demo
```

관측된 상황은 **PharmacyHub 기능 개발 + production API 스모크**로,
"production smoke" 와 "PharmacyHub demo" 양쪽에 해당한다.

WO §33 의 중지 조건 **"다른 production 세션이 DB를 필요로 함"** 에도 직접 해당한다.

```text
→ STOP 실행하지 않음. activationPolicy 는 ALWAYS 그대로.
```

---

## 4. 부수 발견 — `minScale=0` 로 인한 cold-start 500 구간 (중요)

STOP 가능 여부를 판정하다가 **직전 WO 변경의 실사용 부작용**을 발견했다. 별도 보고한다.

### 4-1. 관측

최근 60분 `o4o-core-api` 상태코드 분포:

| 상태 | 건수 |
|---|---:|
| 200 | 12 |
| 204 | 5 |
| 304 | 4 |
| 401 | 2 |
| 403 | 4 |
| **500** | **38** |

500 은 **`00:00`~`00:01` 두 구간에만 집중**되었다 (14건 + 24건). 그 전후는 정상이다.

```text
23:33 / 23:40 / 23:43 / 23:59   200 (분당 2~3건, 희박한 트래픽)
00:00                            500 × 14
00:01                            500 × 24
00:02                            200 × 4
00:03                            200 × 26   ← 완전 회복
```

### 4-2. 근본 원인 — 인스턴스가 0 으로 축소된 뒤의 기동 구간

```text
23:59:45.60  Starting new instance. Reason: AUTOSCALING —
             "no existing capacity for current traffic"     ← 인스턴스가 0 이었다
23:59:52.10  앱 부팅 중 (connect.session MemoryStore 경고)
00:00~00:01  HTTP 500 × 38
00:02~       정상 200
```

**희박한 트래픽 → `minScale=0` 이라 인스턴스가 0 으로 축소 → 요청이 몰려 들어옴 →
기동·초기화가 끝나기 전 응답하여 약 2분간 500.**

`minScale=1` 이던 시기에는 항상 warm 인스턴스가 있어 이 구간 자체가 존재하지 않았다.

### 4-3. 단일 요청 cold start 와 다른 이유

직전 WO 의 cold-start 실측은 **단일 요청**이어서 Cloud Run 이 기동 완료까지 큐잉해
`200 / 15.78초` 로 정상 응답했다.
이번은 **동시 다발 요청 버스트**여서 앱이 준비 완료 전에 트래픽을 받아 500 을 반환했다.
즉 **"cold start 가 느리다"** 가 아니라 **"cold start 중 버스트에서 실패한다"** 는 다른 성질의 문제다.

### 4-4. 현재 상태

확인 시점에 문제가 되었던 URL 을 그대로 재호출한 결과 **전부 200** 이다.

| 엔드포인트 | 결과 |
|---|:---:|
| `/health` | 200 |
| `/health/database` | **200** |
| `/api/v1/public/services/pharmacy-hub/footer-legal` | 200 |
| `/api/v1/pharmacy-hub/news?type=news&sort=latest&page=1&limit=20` | 200 |
| `/api/v1/pharmacy-hub/home/latest?type=all&limit=6` | 200 |
| `/api/v1/pharmacy-hub/forum/posts?limit=20&sortBy=latest` | 200 |
| `/api/v1/apps/availability` | 401 (인증 필요 — 정상) |

**지속 장애가 아니라 기동 구간에 한정된 일시적 실패**이며 이미 해소되었다.

### 4-5. 이번 WO 에서 조치하지 않은 이유

WO §2 가 **`Cloud Run env 변경`을 금지**하고 있다. `minScale` 되돌리기는 이 WO 의 허용 범위 밖이므로
**보고만 하고 변경하지 않았다.** 판단은 사용자 몫이다.

> **STOP 과의 관계**: Cloud SQL 을 STOP 하면 이 문제는 더 커진다.
> STOP 상태에서 트래픽이 들어오면 **DB 기동(수 분) + 컨테이너 cold start** 가 겹쳐
> 500 구간이 2분보다 길어진다. 지금처럼 **다른 세션이 수시로 production 을 쓰는 동안에는
> STOP 운영이 실질적으로 성립하지 않는다.**

---

## 5. 실행하지 않은 항목 (WO §9 ~ §19)

| WO 항목 | 실행 여부 |
|---|:---:|
| §9 STOP (`--activation-policy=NEVER`) | **미실행** |
| §11 STOP 상태 확인 | 해당 없음 |
| §12~§13 STOP 중 동작 검증 | 해당 없음 |
| §14 START (`--activation-policy=ALWAYS`) | 해당 없음 (STOP 하지 않았으므로 복구 불필요) |
| §15~§17 START 시간·복구 smoke | 해당 없음 |
| §18 cold start 동시 영향 측정 | **§4 에서 의도치 않게 실사용 데이터로 관측됨** |
| §19 최종 STOP 상태 | **미적용** — `ALWAYS` 유지 |

---

## 6. 운영 명령 (WO §22 ~ §25) — 확정만, 실행 안 함

```bash
# START
gcloud sql instances patch o4o-platform-db --activation-policy=ALWAYS

# STOP
gcloud sql instances patch o4o-platform-db --activation-policy=NEVER

# STATUS
gcloud sql instances describe o4o-platform-db \
  --format='value(state,settings.activationPolicy)'
```

`gcloud sql instances` 에 `stop` / `start` 하위 명령은 **없다**. `patch --activation-policy` 가 canonical.

**STOP 전 매번 확인할 것 (WO §21)**

```text
1. 다른 세션의 production DB 작업 여부   ← 이번에 여기서 걸렸다
2. migration 진행 여부
3. 배포 진행 여부
4. 실사용 여부 (최근 15~30분 요청 로그)
```

---

## 7. 비용 (WO §26 ~ §28) — 미실현

STOP 을 하지 않았으므로 **절감은 발생하지 않았다.**

| 상태 | 월 USD | 월 KRW |
|---|---:|---:|
| **현재 (변동 없음)** | **≈ $104.7** | **≈ 146,600원** |
| STOP 운영 시 (미실현) | ≈ $46.0 | ≈ 64,400원 |

**Cloud SQL 월간 ON 비율별 예상** (STOP 중에도 storage·backup·PITR 로그 비용은 남는다)

| ON 비율 | 예상 월 전체 비용 |
|---:|---:|
| 0% 에 가까움 | 약 $46 |
| 10% | 약 $52 |
| 25% | 약 $61 |
| 50% | 약 $75 |
| **100% (현재)** | **약 $105** |

> 현재처럼 개발이 활발한 동안에는 ON 비율이 높아 절감 폭이 표의 아래쪽에 가깝다.
> **STOP 운영의 실익은 "개발이 멈춘 기간"에 집중된다.**

---

## 8. 변경 / 부작용

| 항목 | 값 |
|---|:---:|
| **Cloud SQL activationPolicy 변경** | **0** (ALWAYS 유지) |
| **Cloud SQL 그 외 설정 변경** | **0** (tier·storage·backup·PITR·network 전부) |
| **production DB write** | **0** |
| schema 변경 / migration | **0** |
| Cloud Run 변경 | **0** |
| DNS / LB 변경 | **0** |
| 다른 세션 파일 접촉 | **0** |
| 코드 변경 | **0** — 산출물은 본 CHECK 1개 |
| **UNKNOWN** | **0** |

수행한 것은 **조회(describe · logging read)와 read-only API smoke** 뿐이다.

---

## 9. 최종 판정

| WO §38 완료 기준 | 결과 |
|---|:---:|
| STOP transition = PASS | **미실행** |
| START recovery = PASS | 해당 없음 |
| backup/PITR unchanged | **PASS** |
| tier/network unchanged | **PASS** |
| final activationPolicy = NEVER | **미달성 (ALWAYS 유지)** |
| UNKNOWN = 0 | **PASS** |

```text
CLOUD_SQL_STOP_OPERATION_HOLD
```

`CLOUD_SQL_PRELAUNCH_STOP_OPERATION_ENABLED` 는 선언하지 않는다.
**restore 준비는 되어 있으나 실행 시점이 맞지 않았다** — WO 자체가 정한 안전 게이트에서 멈춘 것이다.

---

## 10. 재개 조건 및 다음 단계

### 10-1. STOP 재개 조건

```text
1. PharmacyHub 작업 세션 종료 확인 (작업트리 clean 또는 커밋 완료)
2. 최근 15~30분 o4o-core-api 요청 0건 또는 무시 가능한 수준
3. 배포·migration 미진행
```

### 10-2. 먼저 판단이 필요한 사항 — `minScale`

§4 의 cold-start 500 구간(약 2분·38건)은 **STOP 여부와 무관하게 이미 발생 중**이다.
선택지는 다음과 같다. **이 WO 범위 밖이라 실행하지 않았다.**

| 선택 | 내용 | 비용 영향 |
|---|---|---|
| A | `minScale=1` 복원 — 개발 기간 중 500 구간 제거 | +$8.6/월 |
| B | `minScale=0` 유지 — 개발 중 cold-start 500 감수 | 현행 유지 |
| C | 앱의 readiness 를 DB 초기화 완료 후로 미루기 (startup probe) | $0, 코드 변경 필요 |

> **C 가 근본 해결**이다. 컨테이너가 DB 준비 전에 트래픽을 받는 것이 원인이므로,
> startup probe / readiness 를 DataSource 초기화 완료에 연동하면
> `minScale=0` 을 유지하면서도 버스트 500 을 없앨 수 있다. 별도 WO 로 분리 권고.

### 10-3. 다음 WO 후보

```text
1. WO-O4O-CORE-API-STARTUP-READINESS-GATE-V1   (권고 — 위 C)
2. WO-O4O-CLOUD-SQL-PRELAUNCH-STOP-OPERATION-TRANSITION-V2
   (개발 세션이 없는 시간대에 재시도)
3. classic certificate cert-final-neture-v3 정리 (LB 변경 허용 범위에서)
```

---

## 11. 문서 정합 (CLAUDE.md §16-5)

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건
```
