# CHECK — WO-O4O-FROZEN-AUTH-PERMISSIONS-DB-AND-KPA-SUPPLIER-ENDPOINT-FINAL-CLOSURE-V1

- **일자**: 2026-09-04
- **기준 커밋**: `origin/main` `30ff3f728`
- **작업 브랜치**: `work/o4o-frozen-auth-permissions-db-kpa-supplier-closure-v1`
- **선행 WO**: `WO-O4O-AUTH-RUNTIME-AND-LEGACY-PACKAGE-FINAL-CLOSURE-V1` (PR #201 merge, DEFERRED 3건)

---

## 0. 결론 요약

| 축 | 대상 | 판정 | 실행 |
|:--:|------|------|------|
| **A** | `@o4o/organization-core` `PermissionGuard` | **`REMOVE_SAFE`** | 제거 완료 |
| **B** | `users.permissions` 컬럼 | **`DROP_APPROVED_READY`** | 판정만 (DROP·migration 미수행 — §13) |
| **C** | `/kpa/supplier/*` 3 endpoint | **`CANONICAL_REEXPOSE`** | 계약 확정 · 신규 UX 0 (§21) |
| **D** | repo-wide 잔재 | 정리 완료 | stale 주석 현행화 1건 |
| **E** | 검증 | PASS | 아래 §5 |

- **UNKNOWN 0 / UNJUDGED 0 / DEFERRED 0**
- 신규 RBAC framework 0 · 신규 table/migration 0 · POS 개발 0 · 소비자 commerce 재유입 0

---

## 1. A축 — `PermissionGuard`: **`REMOVE_SAFE`**

### 1-1. consumer census (§4)

| 참조 | 위치 | 분류 |
|------|------|------|
| `PermissionGuard` 클래스 정의 | `packages/organization-core/src/guards/PermissionGuard.ts` | 정의 자신 |
| barrel re-export | `packages/organization-core/src/guards/index.ts` · `src/index.ts:24` · `src/backend/index.ts:17` | 정의 자신 |
| 문서 예제 | `packages/organization-core/EXAMPLES.md` §2.2 | `HISTORY_ONLY` |
| 주석 1줄 | `apps/api-server/.../authorization.middleware.ts:193` | `HISTORY_ONLY` |

- **runtime consumer 0** — `new PermissionGuard` / `requirePermission(` / `checkPermission(` (organization-core 유래) 호출 0건.
- **test consumer 0** — `packages/organization-core` 에 테스트 파일 자체가 0개.
- **external workspace consumer 0** — `package.json` 이 `"private": true`, npm 배포 없음.
- **public API consumer 0** — HTTP route 로 노출된 적 없음.

**동명 혼동 대상(무관, 무접촉)**: `packages/auth-client/src/rbac.ts` `checkPermission` · `createPermissionGuard`,
`packages/asset-copy-core` `checkPermission`, `apps/admin-dashboard/src/components/organization/PermissionGuard.tsx`.

**실제로 소비되는 `@o4o/organization-core` export (전부 보존)**:
`@o4o/organization-core/entities` (`apps/api-server/src/database/entities.ts:478`) ·
`OrganizationService` (`organization.routes.ts:10`) ·
`canManageResource` / `isSuperAdmin` / `isOrganizationAdmin` (`packages/forum-core/.../forumPermissions.ts`).
`packages/lms-core/src/utils/lmsPermissions.ts` 의 import 는 이미 주석 처리 + local stub 이다.

### 1-2. Frozen 판단 (§5·§7)

- CLAUDE.md §3 및 `docs/baseline/core-boundary.md:31` 의 freeze 범위는 **"구조/테이블 변경 금지"** 이다.
- dead guard 클래스 제거는 구조/테이블 변경이 아니며, entity·table·의존 방향·소비되는 계약을 바꾸지 않는다.
- §7: "단순히 'public export다'만으로 BLOCKED 처리하지 않는다" → `FROZEN_BLOCKED` 아님.
- 본 WO 자체가 CLAUDE.md §3 이 요구하는 **명시적 WO 승인**이다.
- canonical 대체 축은 이미 존재한다: `requireAuth` + `require{Service}Scope` + `role_assignments` (§8: 새 RBAC framework 를 만들지 않는다).

### 1-3. 제거한 것

| 파일 | 조치 |
|------|------|
| `packages/organization-core/src/guards/PermissionGuard.ts` | 삭제 |
| `packages/organization-core/src/guards/index.ts` | 삭제 |
| `packages/organization-core/src/index.ts` | `export * from './guards/index.js';` 제거 |
| `packages/organization-core/src/backend/index.ts` | `export * from '../guards/index.js';` 제거 |
| `packages/organization-core/EXAMPLES.md` | §2.2 "PermissionGuard 사용" 제거 (목차 항목 없음 — 수정 불필요) |

`PermissionService` 는 **유지**한다 — `utils/organizationPermissions.ts` 의 기반이며 forum-core 가 실제 소비한다.

---

## 2. B축 — `users.permissions`: **`DROP_APPROVED_READY`**

### 2-1. code consumer 재감사 (§9)

| 잔존 참조 | 분류 |
|-----------|------|
| `modules/auth/entities/User.ts` — `@Column ... permissions!: string[]` | 컬럼 정의(유지) |
| `modules/auth/entities/Role.ts:81,93` — `this.permissions` | **다른 엔티티** (`roles` 테이블의 Role→Permission 관계). `users.permissions` 아님 |
| `scripts/check-admin-permissions.ts:53` — `adminUser.permissions \|\| []` | 진단 CLI 의 logger 출력 1줄. 권한 판정 아님 |
| `types/auth.ts` `authUser.permissions` · `toPublicData().permissions` | 응답 형태 유지용 (선행 WO 판정 유지) |

- `getAllPermissions()` 의 스냅샷 read: **제거됨**(선행 WO) — 현재 non-admin 분기는 `return []`.
- write 경로: **0** (account-linking 병합 제거됨).
- JWT `permissions` claim: **0** (발급·소비 모두 제거됨).
- Raw SQL 에서 `users.permissions` 참조: **0건**.

### 2-2. schema dependency census (§10)

migration 내 언급 2건 — 둘 다 컬럼 생성/기본값 삽입뿐:

| migration | 내용 |
|-----------|------|
| `1700000000000-CreateUsersTable.ts:21` | `"permissions" json NOT NULL DEFAULT '[]'` |
| `2026012100001-CreateO4OAdminVaultAccount.ts:58` | INSERT 시 `'[]'` 고정값 |

seed / fixture: **0건**.

### 2-3. production census (§11) — 실측 수행

접속: Cloud SQL Auth Proxy (`netureyoutube:asia-northeast3:o4o-platform-db`, 127.0.0.1:5456) · **read-only SELECT 만** · write 0.

| 항목 | 결과 |
|------|------|
| 컬럼 정의 | `json` · `NOT NULL` · `DEFAULT '[]'::json` |
| 값 분포 | total **57** / NULL **0** / `[]` **57** / non-empty **0** |
| distinct 값 | `[]` × 57 (유일) |
| `users` 인덱스 중 permissions 참조 | **0** |
| `users` 제약조건 중 permissions 참조 | **0** |
| view / matview 참조 | **0** |
| `users` 트리거 (non-internal) | **0** |
| generated column | **0** |
| permissions 를 참조하는 function | **0** |
| `pg_depend` 컬럼 의존 | **1** — `pg_attrdef` (컬럼 자신의 DEFAULT, deptype `a`) |

`permissions` 컬럼을 가진 테이블은 `users` · `roles` 두 개이며, `roles.permissions` 는 별개 축이라 무관하다.

### 2-4. 판정 및 DROP 증거팩 (§12·§14)

**판정: `DROP_APPROVED_READY`**

| 증거 | 내용 |
|------|------|
| consumer 0 근거 | runtime read 0 · write 0 · JWT claim 0 · raw SQL 0 (§2-1) |
| production 값 분포 | 57행 전부 `[]` — 정보 손실 0 |
| schema dependency | index/constraint/view/trigger/function/generated 전부 0, 유일 의존은 자기 DEFAULT |
| 예상 영향 | `SELECT *` 를 쓰는 TypeORM find 경로에서 필드 1개 소멸. `toPublicData()` 응답 필드는 엔티티 정의 제거와 lockstep 필요 |
| rollback | `ALTER TABLE users ADD COLUMN permissions json NOT NULL DEFAULT '[]'::json` — 값이 전부 `[]` 이므로 원상복구 완전 |
| backup | DROP 실행 WO 에서 Cloud SQL on-demand backup 선행 |
| 실행 계획 (미실행) | ① 엔티티 컬럼 제거 + `toPublicData()` 필드 제거 → ② migration `ALTER TABLE users DROP COLUMN permissions` → ③ CI 자동 적용 |

### 2-5. 수행하지 않은 것 (§13)

- `ALTER TABLE users DROP COLUMN permissions` **미실행**.
- **DROP migration 파일 미작성** — migration 은 merge 후 CI 자동 적용 구조이므로 파일 작성 자체가 실행이다.
- 회귀 테스트가 이 두 금지선을 계약으로 고정한다(`frozen-auth-permissions-and-kpa-supplier-final-closure.spec.ts` B축).

---

## 3. C축 — `/kpa/supplier/*` 3 endpoint: **`CANONICAL_REEXPOSE`**

### 3-1. endpoint census (§15)

| method · route | controller | guard | 상태 |
|---|---|---|---|
| `GET/POST /api/v1/kpa/supplier/content-submissions` (+ `/:id`) | `supplier-content.controller.ts` | `requireAuth` | `CANONICAL_BUT_HIDDEN` |
| `GET/POST /api/v1/kpa/supplier/signage/campaign-requests` (+ `/my-media`) | `supplier-campaign-request.controller.ts` | `requireAuth` | `ACTIVE_CANONICAL` |
| `GET /api/v1/kpa/supplier/signage/reports` | `supplier-signage-report.controller.ts` | `requireAuth` | `CANONICAL_BUT_HIDDEN` |

- **frontend consumer 0** — repo 전역에서 이 3 경로를 호출하는 화면 0건.
- **§16 에 따라 frontend consumer 0 만으로 dead 판정하지 않았다.** backend 소비처를 실측했다:

| 소비 경로 | 근거 |
|---|---|
| operator 승인 축 | `routes/kpa/services/content-approval.service.ts` 가 `hub_content_submission` · `signage_campaign_request` 두 `entity_type` 을 처리 |
| signage forced content 축 | 승인 시 `signage_forced_content` row 생성 (`campaign_request_id` 추적 컬럼 · `20260430000001-AddCampaignFieldsToSignageForcedContent.ts` 인덱스) |
| 계약 의존 | `supplier-signage-media.controller.ts` (WO-O4O-NETURE-SUPPLIER-DIGITAL-SIGNAGE-AUTHORING-HUB-IMPORT-V1) 가 "`/supplier/signage/campaign-requests/my-media` 에 자동 노출(계약 무변경)" 을 전제 |
| 회귀 테스트 | `__tests__/signage-campaign-forced-content-tablet-surface.spec.ts` 가 `entity_type: 'signage_campaign_request'` 및 추적 컬럼을 계약으로 고정 |

### 3-2. Neture canonical 비교 (§17)

`/kpa/supplier/*` 는 **KPA 소유 legacy 가 아니라 Neture 공급자 canonical 면이 KPA route tree 에 마운트된 것**이다.
`services/web-neture` 가 같은 tree 를 실제로 소비한다:

| web-neture 소비 | 경로 |
|---|---|
| `lib/api/supplier.ts` | `/kpa/supplier/event-offers/stats` · `/kpa/supplier/my-offers` · `POST /kpa/supplier/event-offers` |
| `lib/api/supplierScreenSets.ts` | `/kpa/supplier/screen-sets` (V2b 확정 계약, 파일 주석이 경로 사유를 명시) |
| `lib/api/supplierSignage.ts` | `/kpa/supplier/signage/media` |

business semantics 는 Neture 공급자 축과 동일하다(공급자 소유 = `createdByUserId` / ACTIVE `neture_suppliers` 구성원).
즉 §31 의 "Neture 와 KPA supplier semantics 가 실제로 다름" 중지 조건은 **성립하지 않는다**.

### 3-3. `LEGACY_RETIRE` 불성립 (§19)

§19 는 6개 조건이 **모두** 참일 때만 은퇴를 허용한다. 최소 2개가 거짓이다:

- backend consumer 0 ❌ — operator 승인 축 + forced-content 축이 실사용.
- 다른 기능 계약 무의존 ❌ — `/supplier/signage/media` 가 `my-media` 계약에 의존.

### 3-4. 판정: `CANONICAL_REEXPOSE` — 다만 UI 는 만들지 않는다 (§18·§21)

- 3 endpoint 를 **canonical 공급자 면으로 확정**하고 은퇴 후보에서 제외한다.
- §18: 같은 UI 를 복제하지 않는다 → KPA 측 신규 화면 0.
- §21: "endpoint 가 있다"는 이유로 공급자 UX 를 다시 만들지 않는다 → **본 WO 에서 프론트 변경 0**.
  진입점이 필요해지면 web-neture `SupplierSpaceLayout` 의 기존 공급자 공간에 thin entry 로 붙이는 것이 canonical 방향이며, 별도 UX WO 사안이다.
- §20: legacy bare `supplier` role literal 로 권한을 열지 않았다 — guard 무변경(`requireAuth` + 소유권 필터 유지).

### 3-5. production read-only smoke (write 0)

| 경로 | 결과 |
|------|------|
| `GET /api/v1/kpa/supplier/content-submissions` | `401 application/json` |
| `GET /api/v1/kpa/supplier/signage/reports` | `401 application/json` |
| `GET /api/v1/kpa/supplier/signage/campaign-requests` | `401 application/json` |

3건 모두 **마운트 살아 있음**(가드 인터셉트). 404 text/html(미마운트) 아님.

---

## 4. D축 — repo-wide 잔재 (§23·§24)

| 검색어 | 결과 |
|--------|------|
| `PermissionGuard` | organization-core 잔재 **0** (제거 후). 남은 것은 무관한 auth-client `createPermissionGuard` · admin-dashboard `PermissionGuard.tsx` (`ACTIVE`) 와 과거 CHECK/IR 기록 (`HISTORY_ONLY` — §16-1 기록물이라 무접촉) |
| `users.permissions` | 위 §2-1 표가 전수. `DEAD` 0 |
| `/kpa/supplier` | 전부 `ACTIVE` (§3) |
| `supplierops` | `appsCatalog` serviceGroup id + admin `admin-apps.ts` union + 판정 주석 = `COMPATIBILITY` (선행 WO 판정 유지) |
| `partnerops` | `PartnerOpsGuidePage` 안내 화면 = `COMPATIBILITY` (선행 WO 판정 유지) |
| `organization-core` | 실소비 export 3종만 남음 (§1-1) |

**stale assertion 현행화 1건** — `apps/api-server/src/common/middleware/auth/authorization.middleware.ts` 의
"PermissionGuard 는 이번 WO 범위 밖으로 남긴다" 주석을 본 WO 판정으로 교체했다.
security·retirement guard 성격의 기존 테스트는 **전부 유지**했다.

---

## 5. E축 — 검증 결과 (§25~§29)

| 검증 | 결과 |
|------|------|
| `packages/organization-core` build (`tsc`) | **PASS** (exit 0) |
| `packages/forum-core` build (`tsc`) — organization-core 실소비처 | **PASS** (exit 0) |
| `apps/api-server` `pnpm type-check` | **PASS** |
| `apps/api-server` Jest 전체 | **PASS** — 223 suites / 3760 tests (`origin/main` rebase 후 재실행 · exit 0) |
| `node scripts/check-unsafe-routes.mjs` | **PASS** — 검사 1157개 · 위반 0 |
| `node scripts/check-typeorm-entities.mjs` | **PASS** — DEFINED_BUT_UNREGISTERED 0 / 중복 0 / stale 0 |
| `node scripts/lint-ratchet.mjs` | **PASS** |
| production read-only smoke | **PASS** (§3-5) — 실사용 금전 write **0** |
| production DB census | **수행** (§2-3) — read-only SELECT 만, write 0. `NO_PRODUCTION_DB_CENSUS` 아님 |

Vitest 단독 완료 판정은 하지 않았다 (§28). 프론트엔드 소스는 변경하지 않았으므로 frontend build 는 범위 밖이다.

---

## 6. 회귀 방지 계약

신규: `apps/api-server/src/__tests__/frozen-auth-permissions-and-kpa-supplier-final-closure.spec.ts`

- A축 — `src/guards` 디렉터리 부재 · barrel 무참조 · `PermissionService` 및 실소비 export 보존
- B축 — 스냅샷 read 무재유입 · 컬럼 정의 보존 · **DROP migration 파일 부재** · JWT claim 무재발급
- C축 — 3 endpoint 마운트 보존 · web-neture 소비 면 보존 · operator 승인 두 `entity_type` 보존 · 공급자 UX 무재생성

DB · 네트워크 접근 0.

---

## 7. 회귀 없음 확인 (§32)

| 축 | 확인 |
|----|------|
| Identity / RBAC | guard·role_assignments 무변경. `requireAuth` + `require{Service}Scope` 그대로 |
| KPA 매장(buyer) | 무접촉 |
| Neture 공급자 | `/kpa/supplier/*` 마운트·계약 무변경, web-neture 소비 면 보존 |
| 소비자 commerce 재유입 | 0 (cart/checkout/orders/payments 무접촉) |
| B2B canonical (`store_cart_items → checkout_orders`) | 무접촉 |
| POS | 개발 0 |

---

## 8. 문서 정합 (CLAUDE.md §16-5)

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
```

- 별도 WO 제안 1건: **`users.permissions` 컬럼 실제 DROP** — 본 WO §13 이 실행을 금지하므로 증거팩(§2-4)만 남긴다.
- 기록물(`docs/checks/**` · `docs/investigations/**` · `docs/archive/**`)의 과거 판정 문장은 §16-1 에 따라 손대지 않았다.

---

## 9. 변경 파일

| 파일 | 조치 |
|------|------|
| `packages/organization-core/src/guards/PermissionGuard.ts` | 삭제 |
| `packages/organization-core/src/guards/index.ts` | 삭제 |
| `packages/organization-core/src/index.ts` | guards re-export 제거 |
| `packages/organization-core/src/backend/index.ts` | guards re-export 제거 |
| `packages/organization-core/EXAMPLES.md` | §2.2 제거 |
| `apps/api-server/src/common/middleware/auth/authorization.middleware.ts` | stale 주석 현행화 |
| `apps/api-server/src/modules/auth/entities/User.ts` | 판정 주석 `DROP_READY` → `DROP_APPROVED_READY` + 근거 |
| `apps/api-server/src/__tests__/frozen-auth-permissions-and-kpa-supplier-final-closure.spec.ts` | 신규 회귀 계약 |

DB schema 변경 0 · migration 0 · lockfile 0 · package.json 0 · frontend 0.

---

## 10. Git

- 브랜치: `work/o4o-frozen-auth-permissions-db-kpa-supplier-closure-v1` (`origin/main` `30ff3f728` 기준)
- path-specific stage (`git add .` 미사용) · `check-staged-scope.mjs` 확인
- 다른 세션 WIP 무접촉 (격리 worktree `C:\tmp\o4o-legacy-cleanup-v1` 에서 작업)
