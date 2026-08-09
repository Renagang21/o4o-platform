# CHECK — WO-O4O-STORE-QR-SCAN-EVENT-INSERT-TYPE-FIX-V1

| 항목 | 값 |
|------|------|
| 작업요청서 | `WO-O4O-STORE-QR-SCAN-EVENT-INSERT-TYPE-FIX-V1` (QR 스캔 이벤트 INSERT 타입 결함) |
| 발견 경위 | `WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1` (W9) 정상 경로 검증 중 유일한 실패 항목 → 부채 ④ 로 분리 |
| 작업 방식 | **별도 git worktree + 전용 branch** (`C:\tmp\o4o-qr-scan-fix` / `fix/o4o-store-qr-scan-event-insert-type`) |
| 기준 커밋 | `e8dfde70b` (origin/main) |
| 구현 커밋 | `db39a3aa0` — main fast-forward 반영 |
| 검증일 | 2026-08-08 |
| 결과 | **PASS** |

---

## 1. 문제

`store_qr_scan_events` 전체 row **0건** (`max(created_at)` = null).
KPA · GlycoPharm · K-Cosmetics · Pharmacy-Hub **모든 서비스**에서 QR 목록의 `scanCount` 와
스캔 통계 화면이 항상 0 이었다 — 집계가 **한 번도 기록된 적이 없다**.

프로덕션 로그:

```
[QR Scan Event] Insert failed: QueryFailedError: inconsistent types deduced for parameter $6
```

### 원인

```sql
INSERT INTO store_qr_scan_events
  (organization_id, qr_code_id, device_type, user_agent, referer, ip_hash)
SELECT $1, $2, $3, $4, $5, $6            -- ← select-list: unknown 으로 남음
WHERE NOT EXISTS (
  SELECT 1 FROM store_qr_scan_events
  WHERE qr_code_id = $2 AND ip_hash = $6 -- ← 비교식: 컬럼 타입으로 추론
    AND created_at > NOW() - INTERVAL '5 seconds'
)
```

`$6`(ip_hash)이 **두 문맥**에 쓰인다. `INSERT … SELECT` 의 select-list 파라미터는 대상 컬럼과
별개로 해석돼 unknown 으로 남고, 비교식에서는 컬럼 타입으로 추론된다. 한 파라미터에 두 타입이
잡히면서 **INSERT 전체가 실패**했다.

이 쿼리는 **fire-and-forget**(`.catch()` 로 로그만 남김)이라 공개 랜딩 응답은 정상 `200` 이었다.
그래서 사용자에게 드러나지 않은 채 프로덕션에서 조용히 실패해 왔다.

> 이 결함은 W9 의 위임 전환(`store-qr-landing.controller.ts` → `services/store/store-qr.service.ts`)이
> **만든 것이 아니다.** 해당 SQL 은 위임 전 원본과 **바이트 동일**함을
> `git show b3aae68b1^:…/store-qr-landing.controller.ts` 대조로 확인했다.
> 서비스로 추출되면서 W9 검증 과정에서 **드러났을 뿐**이다.

---

## 2. 수정

`apps/api-server/src/services/store/store-qr.service.ts` — `resolvePublicQrLanding()` 내 1개 쿼리.

```diff
- SELECT $1, $2, $3, $4, $5, $6
+ SELECT $1, $2, $3, $4, $5, $6::text
  WHERE NOT EXISTS (
    SELECT 1 FROM store_qr_scan_events
-   WHERE qr_code_id = $2 AND ip_hash = $6
+   WHERE qr_code_id = $2 AND ip_hash = $6::text
```

**두 자리 모두** 캐스팅한다 — 한쪽만 하면 타입이 다시 갈린다.

### 의도적으로 바꾸지 않은 것

`ipHash` 가 null 이면(신뢰 가능한 IP 미확보) `ip_hash = NULL` 이 참이 되지 않아 중복 방지가
걸리지 않고 매 스캔이 기록된다. 식별자 없이 중복 판정을 할 수 없으므로 **기존 의미를 그대로 뒀다** —
본 수정으로 바뀐 동작이 아니다. (`IS NOT DISTINCT FROM` 으로 바꾸는 것은 별개 정책 판단이다.)

---

## 3. 회귀 가드 (신규 테스트 4개)

이 INSERT 는 실패해도 랜딩이 `200` 으로 나가므로 **응답만 보는 테스트로는 회귀를 잡을 수 없다.**
그래서 SQL 자체를 고정했다 — `apps/api-server/src/services/store/__tests__/store-qr.service.test.ts`.

| 테스트 | 고정하는 것 |
|---|---|
| ip_hash 파라미터 양쪽 명시 캐스팅 | `$6::text` 2회 + **캐스팅 없는 raw `$6` 부재** |
| 5초 중복 방지 조건 유지 | `NOT EXISTS` · `INTERVAL '5 seconds'` · `qr_code_id = $2` |
| 파라미터 순서 | `(org, qr, device, ua, referer, ipHash)` |
| fire-and-forget 계약 | INSERT 가 throw 해도 랜딩 결과는 `ok:true` |

---

## 4. 소비처 영향 조사 (0 고정 가정 여부)

`scanCount` 는 이제 실제 값을 갖는다. 0 을 전제한 화면·KPI 가 있는지 전수 확인했다.

| 소비처 | 사용 형태 | 영향 |
|---|---|---|
| `admin-dashboard` QrListPage | `scanCount.toLocaleString()` | 값 렌더뿐 — 없음 |
| GlycoPharm `StoreQrPage` · `ProductMarketingPage` · `StoreMarketingAnalyticsPage` | `스캔 {qr.scanCount}회` | 없음 |
| K-Cosmetics `ProductMarketingPage` · `StoreMarketingAnalyticsPage` | 동일 | 없음 |
| Pharmacy-Hub `QrPage` | `스캔 {qr.scanCount}회` | 없음 |
| `product-marketing.controller` | `reduce` 합산 (`totalScans`) | 없음 |
| `store-analytics.controller` top QR | `ORDER BY "scanCount" DESC` | **의도된 개선** — 전부 0 이라 사실상 임의였던 정렬이 실제 스캔 기준이 된다 |
| `store-screen-set-qr.service` **활성 QR KPI** | `QR_LANDABLE_CONDITION` (landability 판정) | **스캔 이벤트와 무관 — 영향 없음** |

> 사용자가 특히 지목한 "활성 QR KPI" 는 공개 랜딩 가능 여부를 세는 산식이며
> `store_qr_scan_events` 를 참조하지 않는다. 이번 수정과 독립이다.

**별도 부채로 기록할 항목 없음** — 억지로 이번 fix 에 끌어들일 문제가 발견되지 않았다.

---

## 5. 검증

### 5-1. 배포 전

| 항목 | 결과 |
|---|---|
| `store` 서비스 단위 테스트 (`store-qr` 19 + `store-pop` 18) | ✅ **37/37 PASS** |
| `api-server` `tsc --noEmit` | ✅ **clean** |

> 새 worktree 는 워크스페이스 패키지 `dist` 가 없어 TS2307 이 대량 발생한다(코드 결함 아님).
> `build:packages` 만으로는 부족했고 `security-core` · `action-log-core` · `market-trial` ·
> `payment-core` · `ai-core` · `forum-core` · `capabilities` · `mail-core` · `platform-core` ·
> `ecommerce-core` · `cms-core` · `digital-signage-core` · `lms-core` ·
> `interactive-content-core` · `education-extension` · `signage` · `organization-forum` ·
> `cosmetics-seller-extension` · `organization-core` · `store-core` · `cpt-registry` ·
> `asset-copy-core` · `hub-core` · `store-asset-policy-core` · `operator-core` · `shortcodes` ·
> `block-renderer` · `utils` · `ui` · `auth-client` 를 추가로 빌드한 뒤 clean 이 됐다.
> (`apps/api-server` 의 `build:deps` 는 중첩 pnpm 호출에서 Volta pnpm 을 못 찾아 실패 —
> 루트에서 `pnpm --filter <pkg> run build` 로 개별 실행해야 한다.)

### 5-2. 배포

| 워크플로 | 커밋 | 결과 |
|---|---|---|
| Deploy API Server (Cloud Run) | `db39a3aa0` | ✅ success |
| CodeQL Security Analysis | `db39a3aa0` | ✅ success |

### 5-3. 배포 후 프로덕션 실측 — **핵심 증거**

Pharmacy-Hub 신규 QR 로 스캔 집계 전 구간을 측정했다.

| 단계 | `totalScans` | 판정 |
|---|:--:|---|
| 스캔 전 | `0` | 기준선 |
| 공개 랜딩 1회 후 | **`1`** | ✅ **최초로 기록됨** (기기 분류 `{"desktop":1}` 정상) |
| 5초 이내 재스캔 후 | `1` | ✅ **중복 방지 동작** — 증가하지 않음 |
| 5초 창 밖 재스캔 후 | **`2`** | ✅ 정상 증가 |
| QR 목록 `scanCount` | `2` | ✅ 집계 반영 |

### 5-4. 기존 서비스 회귀

| 항목 | 결과 |
|---|---|
| KPA QR 목록 | `200` · 41건 (변동 없음) |
| KPA 공개 랜딩 `page` | `200` · `pageContent` 렌더 정상 |
| **KPA 스캔 통계** | **`1`** — KPA 도 이번 배포로 처음 집계되기 시작 |
| 공개 랜딩 계약 4서비스 | `kpa`·`glycopharm`·`cosmetics` = `404 QR_NOT_FOUND` **nested envelope** / `pharmacy-hub` = **flat** — 전부 기존 계약 그대로 |

### 5-5. DB write

검증 중 만든 QR 1건은 비활성화(soft delete)로 정리했다.
스캔 이벤트 row 는 검증 목적으로 생성된 정상 데이터이며 되돌리지 않는다(집계 이력).

---

## 6. 작업 방식 — worktree 격리 (신규 표준 첫 적용)

W9 에서 "공유 checkout 의 main 에서는 push 보류가 성립하지 않는다" 는 문제가 실증된 뒤
확정된 표준을 이번 WO 부터 적용했다.

```
기본 저장소   C:\Users\sohae\o4o-platform     (main 전용, 무접촉)
병렬 worktree C:\tmp\o4o-<작업명>              (Claude Code 허용 경로)
```

- `C:\Users\sohae\o4o-qr-scan-fix` 로 먼저 만들었다가 **Claude Code 파일시스템 권한 경계 밖**이라
  파일 편집·백그라운드 프로세스마다 권한 게이트에 걸렸다 → clean 확인 후 제거하고
  이미 허용된 `C:\tmp` 아래로 재생성했다.
- 기존 main checkout 은 **한 번도 수정하지 않았다.** main 반영은 worktree 에서
  `git push origin HEAD:main` (fast-forward) 으로 처리해 공유 작업 트리를 건드리지 않았다.
- `git worktree list` 에 병행 세션 worktree(`o4o-auth-commonize`)가 `prunable` 로 표시됐으나
  **`git worktree prune` 을 실행하지 않았다** — 그 세션의 등록이 지워질 수 있다.

### 남은 정리 대상

`C:\Users\sohae\o4o-qr-scan-fix` 디렉터리가 남아 있다(git 등록은 해제됨, `node_modules` 만 잔존).
허용 경로 밖이라 삭제하면 권한 게이트에 걸리므로 손대지 않았다 — 수동 삭제 대상.

---

## 7. 변경 파일

```
apps/api-server/src/services/store/store-qr.service.ts            (+15 / -2)
apps/api-server/src/services/store/__tests__/store-qr.service.test.ts  (+72)
docs/checks/CHECK-O4O-STORE-QR-SCAN-EVENT-INSERT-TYPE-FIX-V1.md   (신규)
```

DB schema · migration · 다른 서비스 코드 · 공통 가드 · 랜딩 응답 계약 **무변경**.
