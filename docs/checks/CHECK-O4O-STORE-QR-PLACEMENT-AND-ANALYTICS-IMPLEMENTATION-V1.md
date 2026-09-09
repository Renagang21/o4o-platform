# CHECK-O4O-STORE-QR-PLACEMENT-AND-ANALYTICS-IMPLEMENTATION-V1

- **WO**: WO-O4O-STORE-QR-PLACEMENT-AND-ANALYTICS-IMPLEMENTATION-V1
- **작업일**: 2026-09-09
- **worktree / branch**: `C:\tmp\o4o-qr-placement` · `work/store-qr-placement-analytics-v1`
- **시작 기준**: `d780e2da0` → 작업 중 `origin/main` 진행분(`a70fbdfdf`) 위로 rebase
- **환경**: Node `v22.18.0` / pnpm `10.25.0`

---

## 0. 이 회차가 무엇을 확정했나

QR 의 **두 질문을 분리**했다.

```text
Target     찍으면 무엇이 나오는가   store_qr_codes.landing_type / content_source   (기존)
Placement  어디에서 사용하는가      store_qr_placements                            (신규)
```

지금까지 QR 은 대상만 알고 있었다. "이 QR 을 매대에 붙였다 / 상담 테이블로 옮겼다 / 뗐다" 를
기록할 자리가 없어서, 스캔이 늘어도 **어디에서 늘었는지** 말할 수 없었다.
이번 회차는 그 축을 원장으로 만들고, 스캔을 그 축에 귀속시키고, 두 서비스에서 같은 UI 로 열었다.

---

## 1. 격리 · Git 계약

| 항목 | 값 |
|---|---|
| 작업 위치 | 별도 worktree `C:\tmp\o4o-qr-placement` (공유 main 체크아웃 미접촉) |
| 브랜치 | `work/store-qr-placement-analytics-v1` (dedicated) |
| `git add .` | **실행 0건** — 전 파일 path-specific staging |
| 다른 세션 dirty/미추적 파일 | 미접촉 (공유 main 의 `apps/admin-dashboard/**` staged 변경 포함) |
| 운영 SQL 직접 수정 | **0건** — 정리는 canonical API/UI 경로로만 |
| 수동 migration 실행 | **0건** — CLAUDE.md §0 대로 main 배포 시 CI/CD 가 실행 |

---

## 2. 스키마 (§3·§4) — additive only

신규 테이블 1 · nullable 컬럼 1 · index 3. **기존 컬럼·행·스캔 이력 무변경.**

`apps/api-server/src/database/migrations/20270330000000-CreateStoreQrPlacements.ts`

```sql
CREATE TABLE IF NOT EXISTS store_qr_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  qr_code_id      UUID NOT NULL,
  placement       VARCHAR(40)  NOT NULL,   -- 개방형: CHECK/enum 없음
  label           VARCHAR(200) NULL,
  corner_ref      VARCHAR(200) NULL,
  status          VARCHAR(16)  NOT NULL DEFAULT 'active',
  started_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  ended_at        TIMESTAMPTZ  NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- IDX_..._org_qr / IDX_..._org_active (partial WHERE status='active') / IDX_..._qr_interval
ALTER TABLE store_qr_codes ADD COLUMN IF NOT EXISTS primary_placement VARCHAR(40) NULL;
```

### 2-1. 의도적으로 하지 않은 것

| 항목 | 판단 |
|---|---|
| `placement` CHECK / enum | **걸지 않았다.** 실제 사용 분포를 관측한 뒤 정규화한다. preset 은 프론트에서만 제시하고 서버는 임의 문자열도 저장한다. 지금 좁히면 매장이 쓰는 실제 어휘를 영영 못 본다. |
| 기존 QR 90건 backfill | **0건.** `title`·`type`·`content_source` 로 위치를 추정하지 않는다. `screen_set` QR 이라고 `TABLET` 배치를 자동 생성하지도 않는다. 추정 배치는 실측처럼 보이는 허구가 되고, 뒤에 오는 스캔 귀속을 통째로 오염시킨다. 기존 행은 `primary_placement = NULL` · placement row 0 으로 남는다. |
| `store_qr_scan_events` 스키마 | **무변경.** 귀속은 컬럼 추가가 아니라 구간 조인으로 한다(§5). |
| `store_qr_codes.type` DROP | 범위 밖 — 이번에도 손대지 않았다. |
| 물리 FK | 두지 않았다. 형제 테이블 `store_qr_scan_events` 관행대로 `qr_code_id` 는 논리 참조이고, 테넌트 경계는 `organization_id` 복합 조건으로 강제한다(Boundary Guard Rule 1·3). |

### 2-2. migration 타임스탬프 충돌 정정

작업 중 `origin/main` 에 `20270329000000-CreateBranchEvents.ts` 가 들어와
내 migration 과 타임스탬프가 같아졌다. rebase 는 충돌 없이 통과했고,
`20270330000000-CreateStoreQrPlacements.ts` 로 옮겼다(클래스명·`name` 동반 변경,
참조처는 자기 자신 1곳뿐 — migration 은 glob 으로 로드된다).

**다만 이것을 결함 수정으로 적지 않는다.** 이 저장소에는 이미 타임스탬프가 겹치는
migration 쌍이 40건 있다(`ls migrations | sed 's/-.*//' | sort | uniq -d`).
동일 타임스탬프는 이 저장소에서 예외가 아니라 통상 상태이고, 실행은 정상적으로 돌고 있었다.
따라서 이번 rename 은 **정리**이지 사고를 막은 조치가 아니다.
두 migration 은 서로 다른 테이블을 만들어 순서 의존도 없다.

---

## 3. 생애주기 (§6·§14) — 배치와 QR 은 다른 축이다

`apps/api-server/src/services/store/store-qr-placement.service.ts` (SSOT)

```text
시작   startQrPlacement(placement, label?, cornerRef?)
이동   startQrPlacement(..., endOthers: true)   기존 활성 종료 → 새 행 INSERT (두 행이 남아 이력 보존)
종료   endQrPlacement(placementId)              ended_at = COALESCE(ended_at, now())
```

**배치 종료는 `store_qr_codes.is_active` 를 건드리지 않는다.**
매대에서 QR 을 떼도 인쇄물·전단·기존 스캔 경로는 살아 있어야 한다.
두 축을 묶으면 "자리를 옮겼을 뿐인데 고객 화면이 죽는" 사고가 난다.

`primary_placement` 는 목록 표시용 캐시다.

```text
활성 0개 → NULL
활성 1개 → 그 값
활성 2개+ → 'MULTIPLE'      ← 임의로 하나를 고르지 않는다
```

정규화: 대문자화 + `[A-Z0-9_]` 외 문자를 `_` 로 + 40자 절단. 빈 값은 400.

---

## 4. API (§7·§15) — KPA/PH 동일 계약, 구현 1벌

| 메서드 | KPA | PharmacyHub |
|---|---|---|
| GET/POST | `/pharmacy/qr/:id/placements` | `/store-owner/qr/:id/placements` |
| PATCH | `/pharmacy/qr/:id/placements/:placementId` | `/store-owner/qr/:id/placements/:placementId` |
| POST | `/pharmacy/qr/:id/placements/:placementId/end` | `/store-owner/qr/:id/placements/:placementId/end` |
| GET | `/pharmacy/qr/:id/placement-analytics` | `/store-owner/qr/:id/placement-analytics` |
| GET | `/pharmacy/qr-analytics/placements` | `/store-owner/qr-analytics/placements` |
| POST | `/pharmacy/qr/:id/clone` | `/store-owner/qr/:id/clone` |

두 컨트롤러는 **organizationId 해석만** 하고 같은 서비스 함수를 부른다.
서비스별 placement 로직 복제 0. `listStoreQrCodes` 는 `primaryPlacement` ·
`activePlacementCount` 를 **additive** 로 얹었다(LEFT JOIN 집계) — 기존 필드 무변경.

---

## 5. 스캔 귀속 (§12) — 사실대로 접는다

이벤트 스키마를 바꾸지 않고 **구간 조인**으로 귀속한다.

```sql
LEFT JOIN store_qr_placements p
       ON p.qr_code_id = e.qr_code_id
      AND p.organization_id = e.organization_id
      AND e.created_at >= p.started_at
      AND (p.ended_at IS NULL OR e.created_at < p.ended_at)
```

```text
match 0개  → UNPLACED    그 시점에 등록된 사용처가 없던 스캔
match 1개  → 그 placement
match 2개+ → AMBIGUOUS   동시에 여러 곳에 배치돼 위치를 특정할 수 없는 스캔
```

**임의 배분(1/n 분배·최근 배치 우선 등)을 하지 않는다.**
같은 QR 이미지를 두 곳에 붙이면 어느 쪽에서 찍혔는지는 어떤 소프트웨어로도 알 수 없다.
모델의 한계가 아니라 물리 현실이다. 숫자를 만들어내면 매장은 그 숫자로 매대를 옮긴다.

도입 직후에는 backfill 을 하지 않았으므로(§2-1) **대부분의 스캔이 `UNPLACED` 로 나오는 것이 정상이다.**
UI 도 이를 0 으로 감추지 않는다.

---

## 6. clone (§8) — 위치별 분석의 전제 동선

`cloneStoreQrCode` 는 target 축(`landing_type` · `landing_target_id` · `library_item_id` ·
`content_source` · CTA)을 복제하고 **새 slug 를 발급**한다(충돌 시 최대 5회 재시도).
스캔·배치는 복제하지 않는다 — 새 인스턴스는 0에서 시작한다.

`screen_set` 은 **409 `SCREEN_SET_QR_NOT_CLONEABLE` 로 거부**한다.
화면 세트당 QR 1개 partial UNIQUE 가 있어 복제하면 제약을 깨거나 조용히 다른 화면을 가리킨다.

이 동선이 없으면 매장은 같은 QR 이미지를 복사해 여러 곳에 붙이고,
그 순간 위치별 귀속은 **영구히** 불가능해진다. clone 은 편의 기능이 아니라 모델의 전제다.

---

## 7. UI (§9·§13) — 공통 Core 에만 구현

| 파일 | 역할 |
|---|---|
| `packages/store-ui-core/.../StoreQrPlacementPanel.tsx` (신규) | QR 1건의 사용처 시작/이동/종료 · 사용처별 스캔 · clone 진입 |
| `packages/store-ui-core/.../StoreQrPlacementAnalyticsPanel.tsx` (신규, §13) | 매장 전체 스캔 분포 3축(사용처 / 콘텐츠 출처 / 대상) · 기간 7·30·90·전체 |
| `packages/store-ui-core/.../StoreQrOperationBoard.tsx` | 행 액션 `onShowPlacements` + `placementPanel` 슬롯 + 행 **사용처 배지** — 전부 optional additive |
| `packages/store-ui-core/.../storeQrOperationModel.ts` | `STORE_QR_PLACEMENT_PRESETS` · `storeQrPlacementLabel()` · `hasAmbiguousPlacement()` |

`'kpa-society'` / `'pharmacy-hub'` 같은 **serviceKey 리터럴 분기 0**.
KPA/PH 는 endpoint · accent 색 · 문구만 주입한다. 두 화면의 UX 는 동일하다.

### 7-1. 반드시 고지하는 것 (§9-3)

활성 배치가 2개 이상이면 패널이 경고를 띄운다.

> 이 QR 은 여러 사용처에 배치되어 있습니다. **스캔이 어느 위치에서 발생했는지는 구분할 수 없습니다.**
> 위치별 통계가 필요하면 [같은 콘텐츠로 QR 추가] 로 사용처별 QR 을 발급하세요.

`UNPLACED`(배치 없음) · `AMBIGUOUS`(구분 불가)는 분포에서 빼지 않고 그대로 보여준다.

목록에도 같은 사실이 드러난다. `primary_placement` 를 행 배지로 그리고,
`MULTIPLE`(활성 2개+)이면 경고색 + 활성 개수를 함께 표시한다 —
패널을 열지 않아도 "이 QR 은 위치 구분이 안 된다" 를 알 수 있어야 하기 때문이다.
`primaryPlacement` 를 내려주지 않는 서비스에서는 배지를 그리지 않는다(K-Cosmetics 무영향).

---

## 8. 기존 계약 보존 (§16·§17·§21)

| 대상 | 결과 |
|---|---|
| 공개 QR 주소 `/qr/{slug}` | **무변경** — slug · is_active · landing_type 미접촉 |
| 기존 analytics 응답 shape (`total`/`today`/`weekly`/`device`) | **무변경** — placement 는 **별도 endpoint** 로만 노출 |
| 공개 랜딩 PRODUCT / CONTENT / SCREEN_SET / EXTERNAL_LINK | 계약 spec 회귀 통과 (아래 §9) |
| K-Cosmetics | **코드 변경 0.** Board 신규 prop 이 전부 optional 이라 1세대 `StoreQrConsoleView` 소비처는 영향 없음 |
| GlycoPharm 등 공통 라우터 주입 서비스 | placement 라우트는 KPA/PH 컨트롤러에만 추가 — 공통 `createStoreTabletRoutes` 미접촉 |

### 8-1. Phase 1 범위 가드 갱신 (회귀 아님)

`store-qr-canonical-contract.spec.ts` 에는 Phase 1 당시
"Placement 원장을 도입하지 않는다(설계상 Phase 2)" 를 단언하는 가드가 있었다.
이번 구현이 바로 그 Phase 2 이므로 **금지 단언을 target 축 ↔ 배치 축의 분리 검사로 갱신**했다.
계약을 약화한 것이 아니라, 낡은 시점 단언을 현재 계약으로 옮긴 것이다.

---

## 9. 검증 결과

| 항목 | 결과 |
|---|---|
| `apps/api-server` `tsc --noEmit` | **PASS** (rebase 후 재실행) |
| jest `store-qr` (4 suites) | **87 / 87 PASS** — 신규 placement 28 · clone 7 포함 |
| jest `pharmacy-hub` (10 suites) | **182 / 182 PASS** |
| `pnpm run type-check:frontend` | (아래 §9-1) |
| `node scripts/lint-ratchet.mjs` | (아래 §9-1) |
| 수동 migration 실행 | **0건** (CI/CD 배포 시 실행) |

신규 계약 spec 2종:

- `store-qr-placement-contract.spec.ts` (22) — primary 값 0/1/2+ · 생애주기 · `ended_at` 미덮어쓰기 ·
  정규화 · 개방형 값 허용 · 빈 값 400 · QR 비활성 시 이력 보존 · 조직 경계 5건 ·
  Guard Rule 1 · 구간 조인 · UNPLACED/AMBIGUOUS · **임의 배분 없음**
- `store-qr-clone-contract.spec.ts` (7) — target 복제 · 새 slug · 충돌 재시도 · 제목 기본값 ·
  스캔/배치 미복제 · `screen_set` 거부 · 타 조직 404

### 9-2. 작업 중 스스로 고친 것

`getOrganizationPlacementAnalytics` 의 기간 조건이 정규화된 정수를 **SQL 문자열에 끼워 넣고 있었다**.
값 자체는 `Math.max(1, Math.min(365, Number(...)))` 로 안전했지만 Guard Rule 2(파라미터 바인딩 필수)의
문자 그대로의 위반이고, 그 자리에 다음 사람이 문자열을 넣게 되는 자리다.
`$2::int * INTERVAL '1 day'` 바인딩으로 바꾸고, **바인딩 여부 자체를 spec 으로 고정**했다
(`INTERVAL '30 days'` 가 SQL 에 나타나지 않을 것 · `params === [org, 30]`).

---

## 10. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```

---

## 11. 남은 것

| 항목 | 상태 |
|---|---|
| 프로덕션 E2E (§19 A–L) | 배포 후 수행 — 검증용 QR 한정, canonical API/UI 경로로만, 운영 SQL 직접 수정 금지 |
| `store_qr_codes.type` DROP | 범위 밖 (후순위 정비) |
| K-Cosmetics 공개 QR route | 범위 밖 (후순위) |
| ESL 실제 연동 | `placement='ESL'` 은 값으로만 존재. 기기 연동은 별도 WO |
| `placement` 정규화(CHECK/enum) | 사용 분포 관측 후 판단 — 지금 좁히지 않는다 |
