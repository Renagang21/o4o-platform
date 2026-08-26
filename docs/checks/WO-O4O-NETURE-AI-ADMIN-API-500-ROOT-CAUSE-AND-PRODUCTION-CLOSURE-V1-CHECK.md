# WO-O4O-NETURE-AI-ADMIN-API-500-ROOT-CAUSE-AND-PRODUCTION-CLOSURE-V1 — CHECK

- 작성일: 2026-08-26
- 대상: `/api/ai/admin/*` (api-server) + Neture AI 관리 UI (`/admin/ai-admin/*`)
- 원칙: 실제 기능 장애 정비. 500 을 빈 결과/무조건 200 으로 삼키지 않는다.

---

## §1 시작 상태

- base: `origin/main` (fetch 완료)
- 작업트리에 **타 세션의 dirty 파일이 존재**했다:
  `.github/workflows/ci-pipeline.yml`, `apps/main-site/README.md`,
  `services/signage-player-web/src/{api/channels.ts,components/ContentRenderer.tsx,pages/ChannelPlayerPage.tsx}`,
  untracked `apps/api-server/src/__tests__/{main-site-ci-build-contract,signage-player-channel-code-lookup-contract}.spec.ts`
- 이 파일들은 **수정·삭제·stash 하지 않았다.** 본 WO 는 경로 지정 staging 으로만 커밋한다.

---

## §2 endpoint 모집단 (현재 코드에서 재도출, 과거 목록 재사용 없음)

`apps/api-server/src/routes/ai-admin.routes.ts` 의 라우트 24개가 전부이며,
**24/24 가 `authenticate, requireAdmin`** 을 건다 (spec 에서 정적 카운트로 강제).

- `requireAdmin` = `hasAnyRole(['platform:super_admin'])` — 즉 expected role 은 전 라우트 `platform:super_admin`.
- frontend `AdminRoute` 는 `['neture:admin','platform:super_admin']` 을 통과시키므로
  `neture:admin` 은 화면에는 진입하지만 API 는 403 이다(권한 축 불일치, §3-G 로 판정).
- 판정: **UNJUDGED = 0 (24/24 판정 완료)**

| # | endpoint | consumer | expected role | actual status (배포 전) | 500 재현 | root cause | disposition |
|---|---|---|---|---|---|---|---|
| 1 | GET /dashboard | neture `AiAdminDashboardPage` | platform:super_admin | **500** | 재현 | A+C | FIXED (entity 등록) |
| 2 | GET /engines | neture `AiEnginesPage` | platform:super_admin | **500** | 재현 | A+C | FIXED |
| 3 | PUT /engines/:id/activate | neture `AiEnginesPage` | platform:super_admin | (선행 500 으로 도달 불가) | 재현 | A+C | FIXED |
| 4 | GET /policy | neture `AiPolicyPage` | platform:super_admin | **500** | 재현 | A+C | FIXED |
| 5 | PUT /policy | neture `AiPolicyPage` | platform:super_admin | (선행 500 으로 도달 불가) | 재현 | A+C | FIXED |
| 6 | GET /usage | neture `AiAdminDashboardPage` | platform:super_admin | **500** | 재현 | A+C | FIXED |
| 7 | GET /ops/summary | 없음 | platform:super_admin | 200 | 미재현 | — | KEEP(비소비, 계약 정상) |
| 8 | GET /ops/errors | 없음 | platform:super_admin | 200 | 미재현 | — | KEEP(비소비, 계약 정상) |
| 9 | GET /analytics/summary | glycopharm `AiUsageDashboardPage`, neture `AiCostPage` | platform:super_admin | 200 | 미재현 | — | KEEP |
| 10 | GET /analytics/by-scope | 동상 | platform:super_admin | 200 (`data: []`) | 미재현 | — | KEEP |
| 11 | GET /analytics/by-model | 동상 | platform:super_admin | 200 (`data: []`) | 미재현 | — | KEEP |
| 12 | GET /analytics/recent | glycopharm `AiUsageDashboardPage` | platform:super_admin | 200 | 미재현 | — | KEEP |
| 13 | GET /quotas | 없음 | platform:super_admin | 200 | 미재현 | — | KEEP(쓰기/관리 API) |
| 14 | GET /quotas/status | glycopharm `AiUsageDashboardPage` | platform:super_admin | 200 | 미재현 | — | KEEP |
| 15 | POST /quotas | 없음 | platform:super_admin | 201/400/409 계약 | 미재현 | — | KEEP(쓰기 API) |
| 16 | PUT /quotas/:id | 없음 | platform:super_admin | 200/400 계약 | 미재현 | — | KEEP |
| 17 | DELETE /quotas/:id | 없음 | platform:super_admin | 200/400 계약 | 미재현 | — | KEEP |
| 18 | GET /billing | glycopharm `AiBillingPage` | platform:super_admin | 200 (`[]`) | 미재현 | — | KEEP |
| 19 | GET /billing/:id | 없음(목록/CSV 로 대체) | platform:super_admin | 200/404 계약 | 미재현 | — | KEEP |
| 20 | POST /billing/generate | glycopharm `AiBillingPage` | platform:super_admin | 계약 정상 | 미재현 | — | KEEP |
| 21 | PUT /billing/:id/adjustment | glycopharm `AiBillingPage` | platform:super_admin | 계약 정상 | 미재현 | — | KEEP |
| 22 | PUT /billing/:id/confirm | glycopharm `AiBillingPage` | platform:super_admin | 계약 정상 | 미재현 | — | KEEP |
| 23 | PUT /billing/:id/paid | glycopharm `AiBillingPage` | platform:super_admin | 계약 정상 | 미재현 | — | KEEP |
| 24 | GET /billing/:id/export.csv | glycopharm `AiBillingPage` | platform:super_admin | 계약 정상 | 미재현 | — | KEEP |

### 비소비 endpoint 판정 근거 (dead 아님)

- `/ops/summary`, `/ops/errors`: 프런트 소비자 없음. Neture `AiOperationsPage` 는 별도 `/api/ai/operations` 를 쓴다.
  다만 두 endpoint 는 **정상 200 을 반환하는 운영 진단 read API** 이며, 프런트가 호출했는데 깨진 "dead link" 가 아니다.
  본 WO 는 500 원인 규명 범위이므로 **제거하지 않고 비소비 사실만 기록**한다(제거는 별도 dead-code WO 사안).
- `/quotas` CRUD, `/billing/:id`: UI 는 아직 read 측(`/quotas/status`, `/billing`)만 쓰지만
  **쓰기 경로는 quota/billing 모델의 정식 관리 API** 이고 계약이 정상이다. 유지.
- **깨진 dead endpoint(프런트가 부르는데 없는/항상 실패하는 endpoint) = 0.**

### 블라스트 반경 (같은 원인, WO 제목 밖)

같은 미등록 원인으로 아래도 500 이었다 — `ai-query.service.ts:114-115` 가 동일 Repository 를 쓴다.

- `GET /api/ai/usage` → 500
- `GET /api/ai/history` → 500
- `GET /api/ai/policy` → 500
- `utils/ai-editing-model-resolver.ts:57,118` — 정책 조회 실패 시 조용히 env 기본 모델로 폴백(= 관리자가 고른 엔진이 무시됨)

---

## §3 500 분류

**A. CODE_DEFECT + C. MISSING_RUNTIME_DEPENDENCY** (단일 원인)

- `AiEngine` / `AiQueryPolicy` / `AiQueryLog` 가 **entity 등록 SSOT**
  (`apps/api-server/src/database/entities.ts` 의 `entities` 배열)에 없었다.
- `ai-admin.service.ts#ensureInitialized()` 가 `AppDataSource.getRepository(AiEngine)` 를 부르는 순간
  `EntityMetadataNotFoundError` 가 나고 라우터 catch 가 그대로 500 을 반환했다.
- 500 경계가 **"Repository 사용 여부"** 와 정확히 일치했다: raw `AppDataSource.query` 만 쓰는
  ops/analytics/quotas/billing 계열은 전부 200 이었다.
- B/D/E/F/G 해당 없음. 단 §5 의 권한 축 불일치는 **G. EXPECTED_NON_500_ERROR**
  (`neture:admin` 딥링크 → 403 이 정상 계약) 로 판정하고, 권한을 넓히지 않았다.

### schema / migration

**불필요.** 세 테이블은 이미 migration 으로 존재한다.

- `1736900000000-CreateAIQueryTables.ts` → `ai_query_policy`, `ai_query_logs`
- `1737100700000-CreateAiEnginesAndAdminColumns.ts` → `ai_engines` + `warning_threshold`/`global_daily_limit`/`active_engine_id`

entity 등록은 metadata 만 만들고 `synchronize:false` / `migrationsRun:false` 이므로 DDL 을 유발하지 않는다.
entity 컬럼 ↔ migration 컬럼 일치는 신규 spec 이 `databaseName` 단위로 고정 비교한다.

### 왜 지금까지 안 잡혔나 (부수 발견)

`scripts/check-typeorm-entities.mjs` 는 현재
`"❌ connection.ts entities 배열 파싱 실패. 스크립트를 업데이트하세요."` 를 출력하고 **exit 2** 로 끝난다
(등록 배열이 `entities.ts` 로 분리된 뒤 갱신되지 않음). 또한 `src/entities/` 를 "레거시" 로 제외한다.
→ 이번 WO 에서는 **스크립트를 고치지 않고 사실만 보고**한다(범위 밖). 대신 동일 축을 jest spec 으로 고정했다.

---

## §4 수정 (허용 범위 내)

### 백엔드

1. `apps/api-server/src/database/entities.ts` (+8)
   - `AiEngine`, `AiQueryPolicy`, `AiQueryLog` import + `entities` 배열 등록 (부분 등록 금지)
2. `apps/api-server/src/routes/ai-admin.routes.ts` (+5)
   - 파일에 로깅이 전혀 없어 production 원인 추적이 불가능했다 → 4개 500 catch 에 `logger.error(...)` 추가.
   - 응답 body 는 그대로 사용자용 한글 메시지만 내보낸다(TypeORM 내부 문자열 비노출, spec 으로 고정).

### 프런트 (Neture, §5)

3. `services/web-neture/src/pages/admin/ai/AiAdminStates.tsx` (신규)
   - `toAiAdminError()` (401/403/404/5xx/network → 한글 메시지), `AiAdminErrorState`(재시도 버튼, `role="alert"`), `AiAdminEmptyState`
4. `AiAdminDashboardPage.tsx` — `Promise.all` → `Promise.allSettled`, dashboard/usage 실패를 **각각** 노출,
   quick link 3개를 `/operator/…` → `/admin/…` 로 교정(`/operator/ai-business-pack` 은 alias 도 없어 NotFound 로 가던 **dead link**)
5. `AiEnginesPage.tsx` — 실패를 빈 목록으로 위장하지 않음(error state ↔ empty state 분리)
6. `AiPolicyPage.tsx` — 조회 실패 시 기본값 폼을 띄우지 않고 **폼 자체를 차단**(실제 정책 덮어쓰기 방지)
7. `AiCostPage.tsx` — `mockCostData` **전량 제거**, 실제 `/analytics/{summary,by-scope,by-model}` 소비로 재작성.
   근거 데이터가 없는 dailyTrend / packageCompliance / `ENGINE_PRICING_TABLE` 블록 삭제.

금지사항 준수: 500→`[]`/`{}` 삼키기 없음, 무조건 200 없음, 권한 확대 없음, mock 표시 없음,
schema/migration 없음, AI 기능 재설계 없음, Neture 외 서비스 의미 변경 없음.

---

## §6 테스트

| 항목 | 결과 |
|---|---|
| 신규 spec `ai-admin-typeorm-entity-registration.spec.ts` | **16/16 PASS** (metadata↔migration, 등록 SSOT, 500↔200 runtime 재현, requireAdmin 403) |
| api-server 전체 jest | **205/206 suite, 3436/3437 test PASS** |
| ↑ 유일 실패 | `encryption-key-canonical-rollout.spec.ts` — `utils/crypto.js` 만 의존, 본 WO diff 와 무관한 **선행/환경(ENCRYPTION_KEY) 실패** |
| api-server `tsc --noEmit` | PASS |
| web-neture `tsc --noEmit` | PASS |
| web-neture `vite build` | PASS |
| 권한 negative | spec: `requireAdmin` 불충족 시 `/dashboard`,`/engines`,`/policy`,`/usage` 전부 403 (200 아님) |
| 정적 guard | `router.<verb>(` 개수 == `authenticate, requireAdmin` 개수 (24 == 24) |

공통 코드 회귀(KPA / K-Cosmetics / PharmacyHub / GlycoPharm): 변경된 공통 파일은 `entities.ts` 하나이며
**추가 등록만** 했다(기존 항목 변경/삭제 없음). api-server 전체 스위트에 각 서비스 계약 spec 이 포함되어 있고 전부 PASS.
GlycoPharm 은 `/api/ai/admin/{analytics,quotas,billing}` 를 실제로 쓰므로 배포 후 §7 에서 재확인한다.

---

## §7 production 검증

### 배포 전 baseline (api.neture.co.kr, `platform:super_admin`)

- 500: `/dashboard`, `/engines`, `/policy`, `/usage?days=7`, `/api/ai/usage`, `/api/ai/history`, `/api/ai/policy`
- 200: `/ops/summary`(gemini calls 25 / errors 3), `/ops/errors`, `/analytics/summary?days=7`(totalRequests 0),
  `/analytics/by-scope`(`[]`), `/analytics/by-model`(`[]`), `/analytics/recent`(row 있음, `scope: null`),
  `/quotas`, `/quotas/status`, `/billing`(`[]`)
- 참고: `ai_usage_logs` 최신 row 가 7일보다 오래되어 days=7 집계는 **정상적으로 0건**이다(빈 상태 = 장애 아님).

### 배포 후

→ 아래 "배포 후 재검증" 절에 기록한다.

---

## §8 완료 기준 대비

| 기준 | 상태 |
|---|---|
| endpoint 모집단 100% | 24/24 |
| UNJUDGED | 0 |
| unexpected 500 | 배포 후 절 참조 |
| 깨진 dead endpoint | 0 |
| dead menu/link | 0 (`/operator/ai-business-pack` 교정) |
| cross-service leak | 배포 후 절 참조 |
| white screen / JS exception | 배포 후 절 참조 |

---

## 배포 후 재검증

- commit: `f8c9aedfc` (main), 배포 workflow **Deploy API Server (Cloud Run) success / Deploy Web Services (Cloud Run) success**
- 검증: 2026-08-26, actor `renariver21@gmail.com` (`platform:super_admin`)

### production API (24/24)

| endpoint | 배포 전 | 배포 후 |
|---|---|---|
| GET /dashboard | **500** | **200** |
| GET /engines | **500** | **200** |
| GET /policy | **500** | **200** |
| GET /usage?days=7 | **500** | **200** |
| PUT /policy (현재값 그대로 no-op) | 미검증 | **200** (재조회 시 값 보존 확인) |
| PUT /policy (`freeDailyLimit:-5`) | 미검증 | **400** |
| PUT /engines/999999/activate | 미검증 | **400** |
| GET /ops/summary · /ops/errors | 200 | 200 |
| GET /analytics/{summary,by-scope,by-model,recent} | 200 | 200 |
| GET /quotas · /quotas/status · /billing | 200 | 200 |
| GET /billing/999999 · /billing/999999/export.csv | 미검증 | **404** |
| POST /quotas (필드 누락) | 미검증 | **400** |
| PUT /quotas/abc | 미검증 | **400** |
| DELETE /quotas/999999 | 미검증 | **404** |
| POST /billing/generate (month 누락) | 미검증 | **400** |
| PUT /billing/999999/{confirm,paid,adjustment} | 미검증 | **400** |

**unexpected 500 = 0.** 쓰기 endpoint 는 §7("안전한 fixture 가 없으면 무리해서 production 데이터를 만들지 않는다")에 따라
**존재하지 않는 id / 누락 필드 negative probe** 와 **정책 no-op round-trip** 으로만 계약을 확인했다.
실제 row 를 만드는 `POST /quotas`, `POST /billing/generate`(정상 인자), `PUT /billing/:id/{confirm,paid}` 의
**성공 경로는 미실행** — 사유: production 과금/쿼터 데이터를 생성하게 된다.

### 블라스트 반경 (같은 원인)

| endpoint | 배포 전 | 배포 후 |
|---|---|---|
| GET /api/ai/usage | **500** | **200** |
| GET /api/ai/history | **500** | **200** |
| GET /api/ai/policy | **500** | **200** |

`ai-editing-model-resolver` 의 정책 조회도 성공하므로, 관리자가 고른 엔진이 env 기본 모델로 조용히 대체되지 않는다.

### 권한 회귀 (production 실측)

| 주체 | 결과 |
|---|---|
| 미인증 | `/dashboard,/engines,/policy,/usage,/quotas,/billing` **전부 401** |
| `sohae2100@gmail.com` (`neture:admin`,`neture:operator`,`glycopharm:admin/operator`,`cosmetics:admin/operator`,`kpa:admin/operator`,`pharmacy-hub:admin/operator`,`kpa-branch:operator`,`kpa:store_owner`) | 위 4개 + `/ops/*`,`/analytics/*`,`/quotas*`,`/billing` **전부 403** |
| `platform:super_admin` | 200 |

**cross-service leak = 0.** 타 서비스 admin/operator 를 다수 보유한 계정도 200 을 받지 못한다. 권한을 넓히지 않았다(§4 준수).

> 파생 사실(범위 밖, 보고만): GlycoPharm 운영자 화면 `AiBillingPage` / `AiUsageDashboardPage` 는
> `/api/ai/admin/*` 를 호출하는데 `glycopharm:admin/operator` 는 `requireAdmin` 을 통과하지 못해 403 이다.
> 즉 두 화면은 현재 `platform:super_admin` 만 실사용 가능하다. 권한 모델 변경은 본 WO 금지사항이므로 기록만 한다.

### production browser E2E (www.neture.co.kr, `platform:super_admin`)

desktop **1440×900** / mobile **390×844** 각각에서 7개 경로를 최초 진입 + **하드 리프레시** 로 2회 렌더:
`/admin/ai-admin`, `/admin/ai-admin/engines`, `/admin/ai-admin/policy`, `/admin/ai-admin/cost`,
`/admin/ai-card-report`, `/admin/ai-operations`, `/admin/ai-business-pack`

| 항목 | 결과 |
|---|---|
| white screen | **0** |
| JS exception (`pageerror`) | **0** |
| 화면에서 발생한 `/api/ai/**` 응답 | **전부 200** (dashboard, usage, engines, policy, analytics×3, card-report, operations) |
| 가로 스크롤(모바일 포함) | **0** |
| dead link | **0** — `/admin/ai-admin` 내부 링크 16개 전부 방문, 404 없음 |
| 메뉴 클릭 경로 | `/admin` → 사이드바 **`분석`** 그룹 → **`AI 관리`** → `/admin/ai-admin` 도달 확인 (그룹 아코디언 기본 접힘일 뿐 dead menu 아님) |
| 딥링크 | 7개 경로 모두 직접 URL 진입 성공 |
| empty state | `/admin/ai-admin/cost` 는 최근 7일 `ai_usage_logs` 가 0건이라 **의도된 empty state** (오류와 구분해 렌더) |
| error state | production 에서 인위적 500 을 만들 수 없어 **미실행**. 대신 신규 spec 이 500↔200 분기와 "빈 배열로 삼키지 않음"을 고정한다. |

---

## 잔여 / 별도 처리 대상 (본 WO 범위 밖, 보고만)

1. **`scripts/check-typeorm-entities.mjs` 무력화** — 실행 시 `entities 배열 파싱 실패` 로 **exit 2**,
   게다가 `.github/workflows/` 어디에도 **연결되어 있지 않다**(grep 0건). 이번 결함이 오래 남은 직접적 이유.
2. **CI Pipeline 실패는 선행 상태** — `services/web-glycopharm/src/pages/store-management/b2b-order/B2BOrderPage.tsx:467`
   `TS1109: Expression expected` (커밋 `2bb1a3e65`, 타 세션 작업). `2d375cde1` 부터 연속 실패이며 본 커밋과 무관하다.
   타 세션 변경 불가침 원칙에 따라 만지지 않았다.
3. **api-server jest 1건 실패** — `encryption-key-canonical-rollout.spec.ts` (ENCRYPTION_KEY 환경 의존), 본 diff 무관.
4. **GlycoPharm AI 운영 화면의 권한 축 불일치** (위 권한 회귀 절 참조).

---

## 최종 판정

- `NETURE_AI_ADMIN_RUNTIME = CLOSED`
- `PRODUCTION_E2E = PASS`
- `MUST_FIX_BEFORE_CLOSE = 0` (잔여 4건은 모두 본 WO 범위 밖 · 타 세션 소유 · 별도 WO 대상)
