# CHECK-O4O-SIGNAGE-CAMPAIGN-FORCED-CONTENT-TABLET-SURFACE-DELIVERY-FIX-V1

> **WO**: `WO-O4O-SIGNAGE-CAMPAIGN-FORCED-CONTENT-TABLET-SURFACE-DELIVERY-FIX-V1`
> **선행 baseline**: [`O4O-SIGNAGE-CANONICAL-PLAYBACK-PATH-V1`](../baseline/O4O-SIGNAGE-CANONICAL-PLAYBACK-PATH-V1.md)
> **선행 감사**: `CHECK-O4O-SIGNAGE-LEGACY-STACK-SIMPLIFICATION-AND-TABLET-AUTHORING-CLOSURE-V1` (§9 에서 `signage_forced_content = ACTIVE` 확정)
> **작성일**: 2026-08-27

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| base | `origin/main = c2b7eb505f6502af89f71dc89e01d59755e2c36d` |
| branch | `work/signage-campaign-forced-content-tablet-surface-v1` |
| 시작 시 working tree | clean (변경 0 · untracked 0) |
| 다른 세션 WIP | 미접촉 (`git stash` 2건 그대로 둠) |

### 1-1. 직전 Signage retirement 반영 여부 (§3)

```text
work/signage-legacy-stack-simplification-v2 @ bc8aba79e   ← push 완료
origin/main 에 포함?  아니오 (PR 미생성 · 미머지)
```

`git rev-list --left-right --count origin/main...bc8aba79e` = `5 / 1`.
새 main 5커밋(glycopharm AI 리포트 · 암호화 키 회전 · registry audit)은 signage 파일과 **교집합 0**.

→ 본 수정은 retirement 와 **독립적**이므로 retirement 브랜치 위에 쌓지 않고
최신 `origin/main` 기준 별도 브랜치에서 진행했다. 두 브랜치는 파일 교집합이 없다
(`content-approval.service.ts` 는 retirement 대상이 아니었다).

**단, `scripts/lint-ratchet.mjs` 의 `ERROR_BASELINE` 은 두 브랜치가 모두 건드릴 수 있는 지점이다.
본 브랜치에서는 건드리지 않았다 (§13-2).**

### 1-2. 보호 계약 유지 확인

```text
Channel stack retired            → channels-stack-retirement.spec 42/42 PASS
Tablet ScreenSet canonical       → 변경 0 (reader 무수정)
signage_forced_content ACTIVE    → 본 WO 의 전제, 유지
cms_content_slots                → 미접촉
```

---

## 2. 수정 전 재현 (§4)

### 2-1. 코드 재현

```text
createCampaignForcedContent()  (content-approval.service.ts)
  INSERT INTO signage_forced_content
    (service_key, title, video_url, source_type, embed_id, thumbnail_url,
     start_at, end_at, is_active, note, created_by_user_id,
     media_id, campaign_request_id)          ← target_surface 없음
  ↓
DB default (migration 20261203000000)
  target_surface VARCHAR(20) NOT NULL DEFAULT 'signage'
  ↓
canonical Tablet idle resolver (store-public-tablet-idle-resolve.ts)
  WHERE ... fc.target_surface IN ('tablet_idle','both')
  ↓
결과: 조회 0 — 승인된 캠페인이 태블릿에 영원히 도달하지 않는다.
```

### 2-2. 실행 재현 (test)

test DB 하네스가 없는 저장소이므로(§20) 서비스 레이어 + QueryRunner 모의로 재현했다.
**수정 전 소스**(`git checkout -- content-approval.service.ts`)에 신규 spec 을 그대로 실행:

```text
× target_surface 를 태블릿 도달 값으로, tablet_duration_seconds 를 함께 저장한다
    Expected: "both"
    Received: undefined
Tests: 1 failed, 14 skipped, 15 total
```

수정 후 동일 spec 15/15 PASS. → 재현 → 수정 → 회귀 고정이 성립한다.

---

## 3. `signage_forced_content` write/read census (§5) — 미조사 0

전 저장소 sweep (`signage_forced_content|forcedContent|target_surface`, 38 files) 중
**runtime write/read 경로 전수**:

### 3-1. WRITE

| # | file / function | 종류 | target_surface 설정 | serviceKey | organizationId | status/시간 | 판정 |
|---|---|---|---|---|---|---|---|
| W1 | `kpa/services/content-approval.service.ts` → `createCampaignForcedContent()` | CREATE (캠페인 승인) | **없음 → DB default `signage`** | `payload.targetServices[]` 각각 | 없음(컬럼 없음) | `is_active=true`, `start_at/end_at`=payload | **본 결함 · 수정 대상** |
| W2 | `signage/controllers/forced-content.controller.ts` → `create` | CREATE (운영자 수동) | 명시. body 미지정 시 `'signage'`, `VALID_TARGET_SURFACES` 검증 | `getSignageServiceKey(req)` | 없음 | `is_active` default true | KEEP (불변) |
| W3 | 〃 → `update` | UPDATE | body 로 부분 변경 가능, 동일 검증 | 〃 | 없음 | `is_active` 토글 | KEEP (불변) |
| W4 | 〃 → `remove` | soft DELETE | — | 〃 | 없음 | `deleted_at = NOW()` | KEEP (불변) |
| W5 | `platform/store-tablet.routes.ts` → `POST /tablets/:id/operator-common-idle-selection` | 선택 저장 (**forced content 자체는 write 하지 않음**) | 읽기 검증만 (`IN ('tablet_idle','both')`) | `'kpa-society'` 고정 | `store_tablet_operator_idle_selections.organization_id` | `cleared_at` | KEEP (불변) |

**`signage_forced_content` 를 INSERT 하는 경로는 W1·W2 두 개뿐이다.**

### 3-2. READ

| # | file | 조회 목적 | target_surface 필터 | 소비처 | 판정 |
|---|---|---|---|---|---|
| R1 | `platform/store-public/store-public-tablet-idle-resolve.ts` (selection JOIN) | canonical 태블릿 대기화면 — 매장 선택분 | **`IN ('tablet_idle','both')`** | Tablet kiosk 공개 재생 | **canonical reader · 무수정** |
| R2 | 〃 (fallback) | 선택 없을 때 deterministic 1건 | **`IN ('tablet_idle','both')`** | 〃 | **canonical reader · 무수정** |
| R3 | `platform/store-tablet.routes.ts` 후보 목록 | 매장 경영자 선택 UI 후보 | `IN ('tablet_idle','both')` | `StoreTabletDisplaysPage` 등 | KEEP |
| R4 | 〃 selection 상태 조회 | `unavailable` 판정 | `NOT IN ('tablet_idle','both')` → unavailable | 〃 | KEEP |
| R5 | `signage/controllers/forced-content.controller.ts` → `list` | 운영자 HQ 관리 목록 | 없음(전체) + `targetSurface` 필드 반환 | `operator-core-ui/signage-hq/ForcedContentPage` (3개 서비스 라우팅) | KEEP |
| R6 | `o4o-store/repositories/store-playlist.repository.ts` (`findPublicPlaylistItems`, `findPlaylistItems`) | **사이니지 surface** — store playlist 에 forced merge | **없음(전체 surface)** | `kpa` / `glycopharm` / `cosmetics` / `neture` 4개 서비스에 `/store-playlists` 마운트 + `PharmacyHubStoreSignageController` | KEEP (§4-2 참고) |
| R7 | `signage/services/media-usage.service.ts`, `signage/repositories/media.repository.ts` | 미디어 사용처 판정(삭제 가드) | 없음 | media library | KEEP |

**UNKNOWN 0.**

---

## 4. `target_surface` 계약 (§6)

### 4-1. 값 집합 — 코드 기준 확정

정본은 `forced-content.controller.ts`:

```ts
const VALID_TARGET_SURFACES = ['signage', 'tablet_idle', 'both'];
```

DB 는 `VARCHAR(20) NOT NULL DEFAULT 'signage'` — **enum / CHECK constraint 없음**.
즉 값 집합의 강제는 application layer 단독이다.

| 값 | 누가 생성 | 누가 읽음 | UI 의미 |
|---|---|---|---|
| `signage` | W2(기본값) · **W1(누락으로 인한 사고)** | R5 · R6 (사이니지 surface) | "디지털 사이니지" |
| `tablet_idle` | W2(운영자 선택) | R1·R2·R3 (+R5·R6 는 필터 안 함) | "태블릿 대기화면" |
| `both` | W2(운영자 선택) · **W1(수정 후)** | R1·R2·R3·R5·R6 전부 | "둘 다" |

### 4-2. reader 비대칭 (중요, 이번에 고치지 않음)

**태블릿 reader 는 surface 를 필터하지만, 사이니지 reader(R6)는 필터하지 않는다.**
따라서 `tablet_idle` 로 저장해도 사이니지 playlist 에는 계속 나타난다.
이 비대칭은 본 결함과 별개의 잔존 부채이며(§16-2), 본 WO 는 reader 를 건드리지 않는다(§10 금지사항).

---

## 5. caller census (§8) — 미조사 0

```text
createCampaignForcedContent()  호출자: 정확히 1개
  content-approval.service.ts:164
    ContentApprovalService.approve()
      조건: ar.entity_type === 'signage_campaign_request'
```

| 항목 | 값 |
|---|---|
| 캠페인 타입 | `signage_campaign_request` **1종** (`CONTENT_APPROVAL_ENTITY_TYPES` 의 나머지 1종은 `hub_content_submission` — forced content 를 만들지 않는다) |
| 승인 flow | 운영자 승인 → 트랜잭션 내 `targetServices.length` 개 row 생성 |
| 요청 생성 | `supplier-campaign-request.controller.ts` `POST /supplier/signage/campaign-requests` |
| 요청 payload 의 surface 필드 | **없음** |
| 승인 UI 의 surface 선택 | **없음** (`ContentApprovalsPage`, `SupplierContentApprovalPage` 모두 승인/반려만) |

→ **caller 별로 surface 가 달라질 여지가 없다** (§31 "caller별 target surface가 달라 제품 정책 결정 필요" 해당 없음).

---

## 6. 제품 의도 판정 (§7) — **B. `both`**

### 6-1. 결정적 근거: 시간 순서

```text
2026-04-30  3ac4aff9b  캠페인 flow 최초 도입 (target_surface 컬럼 존재하지 않음)
2026-05-09  f9164dc4a  content-approval.service.ts 마지막 실질 수정
2026-07-03  dde6ebb94  target_surface 컬럼 도입 (DEFAULT 'signage' = 회귀 방지)
```

`target_surface` 는 캠페인 writer 가 마지막으로 수정된 **뒤에** 생겼고, 그 뒤로 writer 는 갱신되지 않았다.
migration 주석이 밝힌 default 의 목적은 명시적이다:

> `target_surface DEFAULT 'signage'` → **기존** forced content 는 태블릿에 노출되지 않음(회귀 방지)

즉 `'signage'` 는 **기존 데이터 보호용 default** 이지 캠페인에 대한 결정이 아니다.
→ **write omission** 이며 signage-only 라는 제품 결정의 흔적은 없다.

### 6-2. `tablet_idle` 이 아니라 `both` 인 이유

* 사이니지 surface(R6)는 4개 서비스에 실제로 마운트되어 있고, 캠페인 row 는 현재 거기에 노출된다.
  `'tablet_idle'` 은 UI 상 "사이니지 제외" 를 뜻하므로 기존 노출 계약을 의미상 부정한다.
* `'both'` 는 **기존 사이니지 노출을 그대로 두고 태블릿 도달만 추가**한다 → 회귀 0.
* 운영자 수동 경로가 `both` 를 이미 선택 가능한 정당한 값으로 노출하고 있다.

### 6-3. 반대 근거와 그 처리 (은폐하지 않음)

공급자 요청 UI 문구:

> `CampaignRequestPage.tsx:481` — "승인된 캠페인은 선택한 서비스의 모든 매장 **사이니지**에 기간 동안 자동 노출됩니다."

이 문구는 `'signage'` 를 지지하는 것처럼 읽힌다. 그러나

1. 이 문구는 **2026-04-30 캠페인 도입 시점의 문구**이고(마지막 수정 `4274982e5` 는 GlucoseView 잔재 제거로 surface 와 무관), `target_surface` 개념이 존재하기 전에 쓰였다.
2. `'both'` 는 이 문구가 약속한 사이니지 노출을 **전혀 축소하지 않는다**. 추가 노출만 발생한다.

→ 문구가 약속을 어기는 방향의 변경이 아니므로 §31 중지 조건("signage-only 가 제품 의도인 것으로 **확인**")에 해당하지 않는다고 판정했다.
**다만 문구가 태블릿 노출을 언급하지 않는 것은 사실이므로 §16-3 잔존 부채로 남긴다.**
정책을 `signage` 로 되돌리기로 결정한다면 상수 1줄(`CAMPAIGN_TARGET_SURFACE`) 변경으로 원복 가능하다.

---

## 7. entity / schema 정합 (§9) — **SCHEMA_OK**

| 확인 항목 | 결과 |
|---|---|
| TypeORM entity | **없음.** `signage_forced_content` 전용 entity 파일 0 — 전 경로가 raw SQL |
| DB 컬럼 | `target_surface VARCHAR(20) NOT NULL DEFAULT 'signage'` (migration `20261203000000`) |
| `tablet_duration_seconds` | `INTEGER` nullable (동일 migration) |
| enum / CHECK constraint | **없음** — application layer(`VALID_TARGET_SURFACES`) 단독 강제 |
| DTO | 별도 DTO 클래스 없음. `ForcedContentPage.tsx` 의 TS union 타입이 프론트 계약 |
| migration 필요성 | **없음** |

→ **schema 변경 0 · migration 0.** 순수 write omission.

---

## 8. 근본 원인

```text
target_surface 컬럼이 나중에 추가되면서(2026-07-03)
  운영자 수동 writer(W2)에는 전달됐지만
  캠페인 승인 writer(W1)에는 전달되지 않았다.
DB default 'signage' 가 이를 조용히 흡수했고,
canonical Tablet idle reader 는 'signage' 를 읽지 않으므로
승인된 캠페인이 태블릿에 도달하지 않았다.
```

reader 결함이 아니다. **writer 누락이다.**

---

## 9. 실제 수정 (§10)

`apps/api-server/src/routes/kpa/services/content-approval.service.ts` **1파일**:

```ts
const CAMPAIGN_TARGET_SURFACE = 'both';
const CAMPAIGN_TABLET_DURATION_SECONDS = 30;   // 수동 경로 기본값과 동일
```

```diff
   INSERT INTO signage_forced_content
     (service_key, title, video_url, source_type, embed_id, thumbnail_url,
      start_at, end_at, is_active, note, created_by_user_id,
-     media_id, campaign_request_id)
-  VALUES ($1, ..., $12)
+     media_id, campaign_request_id, target_surface, tablet_duration_seconds)
+  VALUES ($1, ..., $12, $13, $14)
```

`tablet_duration_seconds` 를 함께 넣는 이유: 미지정 시 resolver 가 30000ms 로 폴백하므로 값 자체는 같지만,
운영자 수동 경로(W2)가 태블릿 대상일 때 30 을 명시 저장하는 계약과 일치시켜 두 writer 의 산출 row 형태를 동일하게 만든다.

### 금지사항 준수 (§10)

```text
DB default 전역 변경        → 하지 않음
resolver 완화(signage 포함) → 하지 않음 (reader 파일 변경 0)
legacy /api/signage 확장    → 하지 않음
서비스별 if/else            → 하지 않음 (상수 1개, 분기 0)
```

---

## 10. 기존 manual write 경로 영향 (§11)

| 경로 | 영향 |
|---|---|
| W2 `create` (수동) | **0** — default `'signage'` 그대로. 코드 무수정 |
| W3 `update` | **0** |
| W4 `remove` | **0** |
| 기존 `target_surface='signage'` row | **0** — backfill 없음. 태블릿 노출 계속 없음 |

→ "이번 수정 때문에 기존 signage-only 콘텐츠가 tablet 에 노출" = **발생하지 않음** (§11 FAIL 조건 회피).
spec `M1` 3건이 이를 고정한다.

---

## 11. invariant 고정 (§12·§13·§25)

신규 spec: `apps/api-server/src/__tests__/signage-campaign-forced-content-tablet-surface.spec.ts` — **15 tests PASS**

| ID | 계약 | 검증 방식 |
|---|---|---|
| R1 | resolver 의 forced content 조회 2건 모두 `target_surface IN ('tablet_idle','both')` | resolver **원본 소스** 파싱 |
| R2 | 허용 집합 = {`tablet_idle`,`both`}, `signage` 미포함 | 〃 |
| R3 | `store-tablet.routes.ts` 후보/상태 조회도 동일 집합 | 원본 소스 파싱 |
| W1 | 캠페인 write → `target_surface='both'`, `tablet_duration_seconds=30` | QueryRunner 모의로 INSERT 포획 후 컬럼↔파라미터 매핑 |
| W2 | `targetServices` 개수만큼 row, service_key 각각 | 〃 |
| L1 | `is_active=true` · `start_at/end_at`=payload · `source_type`=youtube (resolver 재생 조건) | 〃 |
| B1 | `organization_id` 를 쓰지 않는다 (경계는 service_key) | 〃 |
| E1 | **writer 가 쓰는 값 ∈ reader 허용 집합** — 본 결함의 본질 | writer 실행 결과 × reader 원본 소스 교차 |
| E1-neg | `'signage'` ∉ reader 허용 집합 | reader 원본 소스 |
| E1-neg2 | 타 서비스 캠페인은 해당 service_key 로만 저장 | writer 포획 |
| M1 | 수동 create default `'signage'` 불변 | controller 원본 소스 |
| M1-2 | `VALID_TARGET_SURFACES` = 3값 | 〃 |
| M1-3 | 캠페인 상수 ∈ 허용 집합 | 소스 교차 |
| 회귀 | 수정 파일에 channel 축 참조 0 | 소스 |

**reader 를 mock 이 아니라 실제 소스로 검증**하므로 순환 검증(자기가 만든 가짜 필터를 자기가 통과)이 되지 않는다.
DB 하네스가 없는 저장소 관례(`signage-forced-content-delete-not-found.spec.ts` 의 "DB 는 붙이지 않는다")를 따랐다.

---

## 12. 경계 회귀 (§14·§15·§22·§23)

### 12-1. organization 경계 (§14)

`signage_forced_content` 에는 **`organization_id` 컬럼이 없다.** (migration 3개 전수 확인)

```text
forced content 경계 = service_key
태블릿별 선택      = store_tablet_operator_idle_selections.organization_id + tablet_id
```

캠페인 row 도 `service_key` 로만 귀속되며, 이는 **수정 전과 완전히 동일**하다.
본 WO 는 ownership 정책을 신설하지 않았다. spec `B1` + `E1-neg2` 가 고정한다.

> 주의(정책 아님, 사실 기록): reader 의 fallback 경로(R2)는 선택이 없을 때 service_key 범위에서
> deterministic 하게 1건을 고른다 — 이는 "서비스 운영자 공통 영상" 이라는 기존 설계이며 본 WO 에서 변경하지 않았다.

### 12-2. service scope (§15)

`screen_sets.service_key` / `channels.serviceKey` 를 새 경계로 도입하지 않았다. 변경 0.

### 12-3. Channel retirement 회귀 (§22)

```text
channels-stack-retirement.spec.ts   42/42 PASS
/api/v1/channels* · admin channel ops · ChannelPlayer · heartbeat/playback-log  → 재도입 0
```

### 12-4. Signage retirement 회귀 (§23)

직전 감축 대상(dead admin v2 / extensions / legacy packages·routes)을 다시 import·mount 하지 않았다.
본 브랜치는 `origin/main` 기준이라 해당 파일들이 아직 존재하지만, **본 수정은 그중 어느 것도 참조하지 않는다**
(수정 파일 1개 = `kpa/services/content-approval.service.ts`).

---

## 13. 검증 (§27)

### 13-1. 결과

| 검사 | 결과 |
|---|---|
| `lint-ratchet.mjs` (**build 산출물 생성 전**) | 65 errors / baseline 69 → **PASS** (exit 0) |
| `tsc --noEmit` (api-server) | **clean** |
| 신규 spec | **15/15 PASS** |
| 관련 회귀 4 suite (`campaign-forced-content-tablet-surface`, `forced-content-delete-not-found`, `store-owner-backcompat-servicekey`, `channels-stack-retirement`) | **92/92 PASS** |
| api-server 전체 Jest | §13-3 |

### 13-2. lint baseline 관련 기록

현재 `origin/main` 기준 실측 error = **65**, 파일의 `ERROR_BASELINE` = 69 → 통과(exit 0)이며
ratchet 은 "65 로 낮추라"는 notice 를 낸다. **본 브랜치에서는 낮추지 않았다.**
이유: retirement 브랜치(`bc8aba79e`)가 같은 줄을 63 으로 이미 낮췄고, 여기서 65 로 바꾸면
두 브랜치가 같은 줄에서 충돌한다. 본 수정은 error 를 **0건 추가하지 않았다**(65는 수정 전 main 값과 동일).

### 13-3. api-server 전체 Jest

```text
Test Suites: 218 passed, 1 failed, 219 total
Tests:       3680 passed, 1 failed, 3681 total
```

유일한 실패는 **본 변경과 무관한 사전 존재 실패**다.

```text
ecommerce-core-and-commerce-residue-retirement.spec.ts
  × packages/ecommerce-core 디렉토리가 존재하지 않는다
```

원인: 로컬 worktree 에 `packages/ecommerce-core/{dist, node_modules, tsconfig.tsbuildinfo}` 빌드 잔여물이 남아 있다.
`git ls-files packages/ecommerce-core` = **빈 출력** → 저장소에 추적되는 파일 0.
직전 retirement WO 에서도 동일하게 관측된 것과 같은 잔여물이며, 다른 세션의 빌드 산출물일 수 있어 **삭제하지 않았다.**
clean checkout(CI)에서는 통과한다. 테스트 삭제·skip 0.

### 13-4. frontend 영향 (§27)

**frontend 수정 0.**

`targetSurface` 를 다루는 프론트는 `packages/operator-core-ui/src/modules/signage-hq/ForcedContentPage.tsx` 뿐이며
(운영자 수동 등록/수정 UI), 값 집합과 default 가 그대로이므로 변경이 필요 없다.
공급자 캠페인 요청 UI(`CampaignRequestPage.tsx`)에는 surface 필드가 애초에 없다.

---

## 14. production 데이터 census (§18) — `BLOCKED_ENV`

| 시도 | 결과 |
|---|---|
| `psql` 바이너리 | 존재 (`PostgreSQL/17/bin/psql`) |
| DB 접속 정보 | **없음** — 환경변수 `DB_*`/`DATABASE_URL` 미설정, 저장소에는 `.env*.example` 만 존재 |
| `GET /hq/forced-content` | 운영자 인증 필요 (`requireSignageOperator`) — 우회 credential 생성 금지(§20) |

따라서 다음은 **미측정**이며 추정하지 않는다:

```text
signage_forced_content total          BLOCKED_ENV
target_surface 별 count               BLOCKED_ENV
status(is_active/deleted_at) 별 count  BLOCKED_ENV
campaign-generated 식별(= campaign_request_id IS NOT NULL) count   BLOCKED_ENV
organization 별 count                  N/A — 컬럼 자체가 없음 (코드로 확정)
```

> 판정에 미치는 영향: **없음.** 본 결함은 row 수가 아니라
> **writer 가 쓰는 값과 reader 가 읽는 값의 코드상 불일치**로 확정되며, §2-2 에서 실행 재현했다.

---

## 15. 기존 잘못 저장된 row 처리 (§19) — **REVIEW · backfill 0**

```text
판정: REVIEW
조치: 이번 WO 에서 UPDATE 0
```

근거:

* 대상 row 를 식별하는 조건은 명확하다 — `campaign_request_id IS NOT NULL AND target_surface = 'signage'`.
* 그러나 **§18 이 BLOCKED_ENV 라 그런 row 가 실제로 있는지, 몇 건인지 확인하지 못했다.**
* 확인되지 않은 대상에 대한 자동 UPDATE 는 §19("자동 UPDATE 는 하지 않는다") 위반이다.
* 또한 이미 **기간이 끝난** 과거 캠페인을 backfill 하면 종료된 광고가 태블릿에 되살아날 수 있다.
  backfill 을 한다면 최소한 `NOW() <= end_at` 조건이 필요하며, 이는 별도 근거·별도 WO 사안이다.

→ **코드 수정으로 신규 오류 생성만 차단**했다. 기존 데이터는 그대로 둔다.

---

## 16. 잔존 부채

1. **사이니지 reader 의 surface 미필터 (§4-2)**
   `store-playlist.repository.ts` 의 forced merge 는 `target_surface` 를 보지 않는다.
   따라서 `tablet_idle` 로 지정한 콘텐츠도 사이니지 playlist 에 나타난다.
   운영자 UI 가 "디지털 사이니지 / 태블릿 대기화면 / 둘 다" 로 약속한 의미와 어긋난다.
   → reader 를 강화하는 별도 WO 필요. (본 WO §10 이 reader 변경을 금지하므로 여기서 하지 않는다.)

2. **기존 캠페인 row backfill 판정 (§15)** — production SELECT 권한 확보 후 재판정.

3. **공급자 캠페인 요청 UI 문구**
   `CampaignRequestPage.tsx:481` 이 사이니지 노출만 안내한다. `'both'` 로 태블릿에도 노출되므로
   문구 갱신이 필요하다 — 제품 문구 결정이므로 임의 수정하지 않았다.

4. **`target_surface` 에 DB CHECK constraint 없음** — 값 강제가 application 단독.
   §9 금지사항(필요성 확인 전 schema 변경 금지)에 따라 이번에 만들지 않았다.

5. `KPA_FORCED_SERVICE_KEY = 'kpa-society'` 하드코딩 (`store-tablet.routes.ts`)
   태블릿 선택 후보 목록이 kpa-society 로 고정이라, 다른 서비스(glycopharm 등)를 대상으로 한 캠페인은
   **매장 경영자가 명시 선택할 수는 없고** resolver fallback(R2)으로만 도달한다. 기존 구조이며 본 WO 범위 밖.

---

## 17. 범위 밖 준수 (§30)

```text
Channel stack 복원                 0
/api/signage active-content 수정   0
signage playlist 재설계            0
screen_sets.service_key NULL 정리  0
device credential                  0
legacy forced-content 전체 migration 0
schema DROP                        0
```

---

## 18. 최종 상태

_(commit / push / deploy / production smoke 는 아래에 기록)_
