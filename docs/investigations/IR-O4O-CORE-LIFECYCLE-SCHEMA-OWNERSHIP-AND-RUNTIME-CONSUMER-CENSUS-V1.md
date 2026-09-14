# IR-O4O-CORE-LIFECYCLE-SCHEMA-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1

> **종류**: 조사 전용(IR) · 구현 0 · 마이그레이션 추가/수정/실행 0 · 프로덕션 스키마/데이터 변경 0
> **조사일**: 2026-09-14
> **대상 Core**: `auth-core` · `platform-core` · `organization-core` · `lms-core`
> **대상 파일**: 각 `packages/<core>/src/lifecycle/install.ts` · `uninstall.ts` (+ `activate.ts` · `deactivate.ts` 는 보조 기록)
> **선행 IR(형식 모델)**: [`IR-O4O-CMS-LIFECYCLE-TABLE-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1`](IR-O4O-CMS-LIFECYCLE-TABLE-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1.md)
> **상위 기준**: [`PRODUCTION-MIGRATION-STANDARD`](../baseline/operations/PRODUCTION-MIGRATION-STANDARD.md) · [`O4O-CORE-FREEZE-V1`](../architecture/O4O-CORE-FREEZE-V1.md) · [`CLAUDE.md §3`](../../CLAUDE.md)
> **Git 변경**: 이 IR 문서 1개만

---

## 0. 결론 요약 (한 줄)

**4개 Core 의 lifecycle `install()`·`uninstall()` 은 전부 호출자 0 · 프로덕션 실행 흔적 0 인 DEAD_SCHEMA_INSTALLER 다.** 테이블은 살아 있으나(24개 중 21개 존재) 그 소유자는 lifecycle 이 아니라 마이그레이션(또는 과거 synchronize)이며, lifecycle DDL 과 프로덕션 실물 사이에 컬럼 명명 규약(snake_case ↔ camelCase) 수준의 구조 drift 가 있다. 따라서 **lifecycle 코드는 어떤 경우에도 "canonical schema 정의"로 취급하면 안 되고**, 제거·보존은 Core 별 별도 WO 로 결정한다. `auth-core` 테이블은 REMOVE 대상이 아니다(§11).

```
TARGET_CORE_CENSUS_COMPLETE = PASS
LIFECYCLE_CALLER_CENSUS_COMPLETE = PASS
MIGRATION_OWNERSHIP_MATRIX_COMPLETE = PASS
PRODUCTION_VERIFICATION = PASS (read-only · counts/metadata only)
STOP_CONDITION_TRIGGERED = NONE
CORE_LIFECYCLE_SCHEMA_OWNERSHIP_AND_RUNTIME_CONSUMER_CENSUS = COMPLETE
```

---

## 1. 전제 · 계약 (§1 · §2)

| 항목 | 값 | 근거 |
|---|---|---|
| `PRODUCTION_MIGRATION_OWNER` | `DEPLOY_MIGRATION_JOB_ONLY` | `.github/workflows/deploy-api.yml` → Cloud Run Job `o4o-api-migrations` (`dist/migrate.js`) |
| `API_STARTUP_MIGRATION_EXECUTION` | `ZERO` | api-server DataSource `synchronize: false` · `migrationsRun: false` (2026-09-12 이후 기동 시 마이그레이션 없음) |
| migration DataSource | `apps/api-server/src/database/migration-config.ts` | glob `src/database/migrations/*.{js,ts}` · 이력 테이블 `typeorm_migrations` |
| AppManager 쓰기 축 | 은퇴 | `WO-O4O-APP-MANAGEMENT-CANONICAL-MODEL-AND-RUNTIME-RESIDUE-CLOSURE-V1` — facade 는 `app_registry` read-only, lifecycle hook 호출 없음 |
| appstore-guard | `REQUIRED_LIFECYCLE_FILES`(install/activate/deactivate) 는 **warning only** | `scripts/appstore-guard.ts` · `ci-appstore-guard.yml` (cms-core 는 install.ts 없이 통과) |

> **판정 원칙(§0)**: 테이블 존재 ≠ installer canonical. 직접 import 0 ≠ dead(호출 경로 전체를 본다). 프로덕션 실측은 read-only · COUNT/메타데이터만.

---

## 2. Baseline (§3)

| 항목 | 값 |
|---|---|
| `origin/main` = HEAD | `7ab1fce602cd407963a0e088d8283086f7d17145` (`HEAD...origin/main` 0/0) |
| 작업 worktree | `C:\tmp\o4o-core-lifecycle-census` · 브랜치 `work/core-lifecycle-census-v1` (조사 전용) |
| 본 저장소 dirty(타 세션 · 불가침) | `M scripts/media/minerock600-pilot/build_graphics.py` · `?? docs/media-pilot/` |
| Node / pnpm | v22.18.0 / 10.25.0 |
| 패키지 버전 | 4개 모두 `1.0.0` (appsCatalog 는 lms-core `0.1.0` 표기 → 카탈로그 drift, 관찰만) |

---

## 3. Core 별 lifecycle 구조 census (§4)

### 3.1 auth-core

| 항목 | 내용 |
|---|---|
| `install.ts` (367줄) | `InstallContext {dataSource, organizationId?, config?}`. `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`; DO-block `CREATE TYPE user_status` · `user_role_enum`; `CREATE TABLE IF NOT EXISTS` × 8 (`users` · `roles` · `permissions` · `role_permissions` · `user_roles` · `linked_accounts` · `refresh_tokens` · `login_attempts`, 전부 snake_case 컬럼); `idx_*` 22개; seed = roles 4(`super_admin/admin/staff/user`, `ON CONFLICT (name) DO UPDATE`) · permissions 14(`app_id='auth-core'`, `ON CONFLICT (key)`) · role_permissions cross-join(super_admin). **트랜잭션 없음**. |
| `uninstall.ts` | 로그만. purge 경로 없음. |
| `activate.ts` / `deactivate.ts` | 로그만. |
| export 경로 | `lifecycle/index.ts` 가 4 hook export · `src/index.ts` 는 manifest 만 export · package.json `./lifecycle` subpath |
| api-server 의존 | **`apps/api-server/package.json` 에 미등록** · 저장소 전체 importer 0 |
| manifest | `ownsTables` 8 · `uninstallPolicy {keep-data, allowPurge:false, autoBackup:true}` · backend entities `[]`("Entities are currently in api-server") |

### 3.2 platform-core

| 항목 | 내용 |
|---|---|
| `install.ts` | DO-block `CREATE TYPE app_status`; `CREATE TABLE IF NOT EXISTS` × 3 (`app_registry` · `settings` · `account_activities`, snake_case); `idx_*` 11; seed = settings 4 (`platform.name/language/timezone/activityLogRetention`, `app_id='platform-core'`, `ON CONFLICT (key) DO UPDATE`). 트랜잭션 없음. |
| `uninstall.ts` | 로그만 (allowPurge false). |
| `activate.ts` / `deactivate.ts` | 로그만. |
| export 경로 | `src/index.ts` = manifest 만 · subpath `./lifecycle` · `./store-identity` · `./store-policy` |
| api-server 의존 | 등록됨. **import 는 `store-identity` · `store-policy` 만** (다수 파일 + `entities.ts`) · `lifecycle` subpath importer 0 |
| manifest | `ownsTables` 3 · allowPurge false |
| 부수 관찰 | `disabled-apps.registry` 의 "api-server dependencies 에 미등록" 문구는 stale(현재 등록됨) |

### 3.3 organization-core

| 항목 | 내용 |
|---|---|
| Context 타입 | `types/context.ts` — `InstallContext {dataSource, manifest, logger, options?{seedDefaultData}}` · `UninstallContext options {purgeData, dropTables}` (auth/platform 과 다른 시그니처) |
| `install.ts` | `CREATE TABLE IF NOT EXISTS` × 4 (`organizations` · `organization_members`(FK→organizations CASCADE, UNIQUE(organization_id,user_id)) · `organization_units` · `organization_roles`); `idx_*`; `registerPermissions`(permissions 테이블 존재 가드 후 `INSERT … ON CONFLICT (id) DO NOTHING`); `extendRoleAssignment`(`role_assignments` 에 `scope_type/scope_id` ADD · `idx_role_assignments_scope` · CHECK `chk_org_scope` — 모두 존재 가드). |
| `uninstall.ts` | `purgeData` → `DELETE FROM organization_members` · `organizations`; **옵션 무관하게** `DELETE FROM role_assignments WHERE scope_type='organization'` · manifest permission 별 `DELETE FROM permissions WHERE id=$1`(테이블 존재 가드); `dropTables` → `DROP TABLE IF EXISTS organization_members, organizations CASCADE` (units/roles 는 drop 안 함). |
| `activate.ts` | `UPDATE app_registry SET status, "updatedAt" WHERE "appId"` (camelCase) |
| `deactivate.ts` | `UPDATE app_registry SET status, deactivated_at, updated_at WHERE app_id` (snake — 프로덕션 컬럼 없음 → **패키지 내부 drift**) |
| export 경로 | **`src/index.ts` 가 `export * from './lifecycle/index.js'`** → install/uninstall 이 barrel 로 노출 |
| api-server 의존 | `OrganizationService` (`routes/organization.routes.ts`) · `/entities` (`entities.ts`) import → lifecycle 은 **번들 포함(BUILD_ONLY) · 호출 0** |
| manifest | `ownsTables` 4 · allowPurge true · backend entities Organization/OrganizationMember |

### 3.4 lms-core

| 항목 | 내용 |
|---|---|
| `install.ts` | `onInstall(dataSource)`(다른 시그니처) — `CREATE TABLE IF NOT EXISTS` × 8 (`lms_courses` · `lms_lessons` · `lms_enrollments` · `lms_progress` · `lms_certificates` · `lms_events` · `lms_attendance` · `lms_content_bundles`, snake_case) · `idx_*` 21. **같은 파일에 두 번째 `onUninstall`(테이블 보존)** 존재. |
| `uninstall.ts` | `onUninstall` — **lms 테이블 7개 `DROP TABLE … CASCADE`** (`lms_content_bundles` 제외). 가드 · 옵션 없음. |
| `activate.ts` / `deactivate.ts` | 로그만 (`onActivate/onDeactivate`). |
| export 경로 | **`lifecycle/index.ts` 없음** · `src/index.ts` 가 lifecycle 을 export 하지 않음 · subpath `./entities` |
| 패키지 내 migration | `src/migrations/001-create-lms-tables.ts`(`CreateLMSTables1701346000000`) · `002-…`(`CreateLMSAdditionalTables1701346100000`) — camelCase(`queryRunner.createTable`). **api-server migration glob 밖 · 어디서도 참조 0 · 프로덕션 `typeorm_migrations` 미기록 → 고아** |
| api-server 의존 | `@o4o/lms-core` 를 ~18 파일(`modules/lms`, `modules/survey`, `entities.ts`)에서 import → **entity/service 는 RUNTIME_CONFIRMED**. 실제 entity 는 `@o4o/interactive-content-core`(Course/Lesson/ContentBundle) · `@o4o/education-extension`(Enrollment/Progress/Certificate/LMSEvent/Attendance)에 있고 lms-core `entities/index` 가 재export |
| manifest | `ownsTables` 8 · allowPurge true |

---

## 4. 호출자 census (§5)

| 호출 경로 후보 | auth-core | platform-core | organization-core | lms-core | 등급 |
|---|---|---|---|---|---|
| `lifecycle/install\|uninstall` 직접 import (apps/packages/services/scripts) | 0 | 0 | 0 | 0 | ZERO |
| 패키지 barrel 경유 도달 | 불가(index 미export) | 불가 | **가능**(`export *`) — 그러나 호출 0 | 불가 | BUILD_ONLY (org-core) / ZERO |
| `manifest.lifecycle.*` 경로 선언 | 선언 | 선언 | 선언 | 선언 | MANIFEST_DECLARATION_ONLY |
| AppManager / app facade | 호출 없음(쓰기 축 은퇴) | 동일 | 동일 | 동일 | HISTORICAL_ONLY |
| `scripts/appstore-guard.ts` | 파일 존재 검사(warning) | 동일 | 동일 | 동일 | BUILD_ONLY |
| 테스트 | 계약 spec 에서 이름만 참조 | — | — | — | TEST_ONLY |
| 문서(WO/IR/README) | 언급 | 언급 | 언급 | 언급 | HISTORICAL_ONLY |
| **프로덕션 실행 흔적(§10 · §9)** | 0 | 0 | 0 | 0 | ZERO |

**호출자 최종 등급: 4개 Core 모두 `ZERO`(runtime) / `MANIFEST_DECLARATION_ONLY` + `BUILD_ONLY`(정적).**

---

## 5. DDL 전수표 (§6)

`호출 상태` 는 §4 결과(전부 UNCALLED). `Guard` = `IF NOT EXISTS` / 존재 검사. `Tx` = 명시 트랜잭션.

| Core | 파일 | 객체 | DDL | 테이블/객체 | Seed | Tx | Guard | Down/Uninstall | 호출 상태 |
|---|---|---|---|---|---|---|---|---|---|
| auth | install.ts | extension | CREATE EXTENSION | uuid-ossp | – | ✗ | IF NOT EXISTS | 없음 | UNCALLED |
| auth | install.ts | type | CREATE TYPE | user_status · user_role_enum | – | ✗ | DO-block | 없음 | UNCALLED |
| auth | install.ts | table | CREATE TABLE | users · roles · permissions · role_permissions · user_roles · linked_accounts · refresh_tokens · login_attempts | roles 4 · permissions 14 · role_permissions | ✗ | IF NOT EXISTS · ON CONFLICT | uninstall = 로그만 | UNCALLED |
| auth | install.ts | index | CREATE INDEX | `idx_*` 22 | – | ✗ | IF NOT EXISTS | 없음 | UNCALLED |
| platform | install.ts | type | CREATE TYPE | app_status | – | ✗ | DO-block | 없음 | UNCALLED |
| platform | install.ts | table | CREATE TABLE | app_registry · settings · account_activities | settings 4 (`platform.*`) | ✗ | IF NOT EXISTS · ON CONFLICT | uninstall = 로그만 | UNCALLED |
| platform | install.ts | index | CREATE INDEX | `idx_*` 11 | – | ✗ | IF NOT EXISTS | 없음 | UNCALLED |
| org | install.ts | table | CREATE TABLE | organizations · organization_members · organization_units · organization_roles | permissions INSERT(manifest) | ✗ | IF NOT EXISTS · information_schema | uninstall: purge/drop 옵션 (members/organizations 만) | UNCALLED |
| org | install.ts | alter | ALTER TABLE ADD COLUMN / CONSTRAINT | role_assignments.scope_type · scope_id · chk_org_scope · idx_role_assignments_scope | – | ✗ | 존재 검사 | 없음(uninstall 은 row DELETE 만) | UNCALLED |
| org | uninstall.ts | dml | DELETE | role_assignments(scope_type='organization') · permissions(manifest id) | – | ✗ | 테이블 존재 가드 · **옵션 무관** | – | UNCALLED |
| org | uninstall.ts | table | DROP TABLE CASCADE | organization_members · organizations (`dropTables`) | – | ✗ | IF EXISTS | – | UNCALLED |
| org | activate/deactivate | dml | UPDATE | app_registry (camel ↔ snake 불일치) | – | ✗ | 없음 | – | UNCALLED |
| lms | install.ts | table | CREATE TABLE | lms_* 8 | 없음 | ✗ | IF NOT EXISTS | install.ts 내 `onUninstall` = 보존 / uninstall.ts = DROP | UNCALLED |
| lms | install.ts | index | CREATE INDEX | `idx_*` 21 | – | ✗ | IF NOT EXISTS | 없음 | UNCALLED |
| lms | uninstall.ts | table | DROP TABLE CASCADE | lms_* 7 (content_bundles 제외) | – | ✗ | IF EXISTS · **옵션/가드 없음** | – | UNCALLED |

---

## 6. 마이그레이션 소유권 매트릭스 (§7)

`api-server/src/database/migrations` 643 파일 · 프로덕션 `typeorm_migrations` 676 건(최신 `DropRetiredCmsCptResidueTables20270412000000`) 대조. Drift 는 "lifecycle DDL vs 마이그레이션(=프로덕션 실물)".

| 테이블 | Core | 마이그레이션 생성자 | 프로덕션 존재 | 소유 판정 | Drift 요지 |
|---|---|---|---|---|---|
| users | auth | `1700000000000-CreateUsersTable` | ✓ | BOTH_DRIFTED | 마이그레이션 camelCase(`firstName`…) vs lifecycle snake · enum 타입 없음 |
| refresh_tokens | auth | `1703000000000-AddRefreshTokenAndLoginAttempt` | ✓ | BOTH_DRIFTED | 실물 `userId, expiresAt, isRevoked` camel |
| login_attempts | auth | 동상 | ✓ | BOTH_DRIFTED | camel |
| roles | auth | **CREATE 없음** — `20260318100000-ExtendRolesTable` ALTER 만("synchronize created the table") | ✓ | NO_CREATION_OWNER(HISTORICAL synchronize) | 실물에 camel + snake 중복 컬럼(`displayName`&`display_name` 등) |
| permissions | auth | CREATE 없음 | ✓ | NO_CREATION_OWNER | 실물 `id,name,displayName,description,resource,action,key,category,isActive,…` · **`app_id` 없음** → lifecycle seed 실행 불가 |
| role_permissions | auth | CREATE 없음 | ✓ (0 row) | NO_CREATION_OWNER | – |
| user_roles | auth | `20260228000002-DropLegacyRbacColumns` 가 DROP | ✗ | HISTORICAL_RETIRED | lifecycle 은 재생성함(`IF NOT EXISTS`) → 실행 시 은퇴 테이블 부활 위험 |
| linked_accounts | auth | CREATE 없음 | ✓ (0 row) | NO_CREATION_OWNER | camel |
| app_registry | platform | `2026012200001-CreateAppRegistryTable` | ✓ | BOTH_DRIFTED | 실물 `appId, previousVersion, source…` camel · enum 없음 |
| settings | platform | CREATE 없음 | ✓ | NO_CREATION_OWNER | 실물 `key,value,type,description,createdAt,updatedAt` · **`id/category/app_id/is_public/is_system` 없음** → lifecycle seed 실행 불가 |
| account_activities | platform | CREATE 없음 | ✓ | NO_CREATION_OWNER | 실물 `userId,email,action,ipAddress,userAgent,success,details,type` |
| organizations | org | `20260221000000-OrgServiceModelNormalizationPhaseA` | ✓ | BOTH_DRIFTED | 실물 camel(`parentId, isActive`) |
| organization_members | org | `20260311200000-CosmeticsStoreOrgBridge` | ✓ | BOTH_IDENTICAL(근사) | snake 동일 · 마이그레이션은 FK 없음/`UQ_org_member_org_user` |
| organization_units | org | CREATE 없음 | ✗ | NO_CREATION_OWNER(미존재) | lifecycle 만 정의 |
| organization_roles | org | CREATE 없음 | ✗ | NO_CREATION_OWNER(미존재) | lifecycle 만 정의 |
| role_assignments.scope_* | org(ALTER) | `20260224100000-CreateRoleAssignmentsTable` | ✓ (chk_org_scope 존재) | BOTH_IDENTICAL(근사) | – |
| lms_* 8 | lms | `20260410000001-CreateLmsCoreTables` + 후속 ALTER | ✓ | BOTH_DRIFTED | 실물 camel(`instructorId`…) · 패키지 내 `CreateLMSTables1701…` 는 미등록 고아 |

**요약**: MIGRATION_OWNED 11 · NO_CREATION_OWNER 7(존재 5 = historical synchronize 산물, 미존재 2) · HISTORICAL_RETIRED 1. **LIFECYCLE_ONLY 로 프로덕션에 존재하는 테이블 0**.

---

## 7. 런타임 소비자 체인 (§8)

| 테이블 | Entity (api-server `database/entities.ts` 등록) | 주요 소비자 | 등급 |
|---|---|---|---|
| users | `modules/auth/entities/User.ts` | 인증 전반 | ACTIVE_CRITICAL |
| roles | `Role.ts` | `role.service.ts` → RoleController · MembershipConsoleController(raw SQL 포함) · AdminUserController · seed 마이그레이션 3 | ACTIVE_CRITICAL |
| permissions | `Permission.ts` | 등록만 · 런타임 repo 소비자 0 (forum-core lifecycle install 의 `getRepository('Permission')` 뿐, 그것도 UNCALLED) | REGISTERED_NO_CONSUMER (0 row) |
| role_permissions · user_roles · organization_units · organization_roles | entity 없음 | 0 | ZERO |
| linked_accounts | `LinkedAccount.ts` | account-linking · auth-login · auth-account-inquiry service | ACTIVE (0 row) |
| refresh_tokens / login_attempts | `RefreshToken.ts` / `LoginAttempt.ts` | 인증 | ACTIVE (0 row 현재) |
| app_registry | `entities/AppRegistry.ts` | AppManager read facade | ACTIVE |
| settings | `entities/Settings.ts` | settingsService ← settingsController · `scripts/encryption-key-rotation.ts` raw SQL | ACTIVE |
| account_activities | `AccountActivity.ts` | auth-service-user · auth-login · auth-guest · account-linking | ACTIVE_CRITICAL(30d 2,102 row) |
| organizations / organization_members | `packages/organization-core/src/entities/*` (+ organization-store.entity · work-scope-store-resolution) | OrganizationService · 매장/조직 축 | ACTIVE_CRITICAL |
| role_assignments | `RoleAssignment.ts` | RBAC SSOT | ACTIVE_CRITICAL |
| lms_* | interactive-content-core · education-extension entity | `modules/lms` · `modules/survey` | ACTIVE |

**소비자는 전부 entity 경로다. lifecycle 코드를 통해 테이블에 도달하는 런타임 경로는 0.**

---

## 8. 프로덕션 실측 (§9 · read-only · 2026-09-14)

접속: Cloud SQL Auth Proxy(로컬 포트) + psql `BEGIN READ ONLY … ROLLBACK`. 조회 = `information_schema` · `pg_catalog` · `COUNT` 만. 데이터 값 · 이메일 · ID · 이름 · 조직명 · 토큰 · 권한값 출력 0. 자격정보는 Secret Manager → 환경변수로만 사용, 어디에도 기록하지 않음. 프록시는 조사 후 종료.

| 관찰 | 결과 |
|---|---|
| 대상 24 테이블 존재 | **21 존재 / 3 부재**(`organization_units` · `organization_roles` · `user_roles`) |
| row count | users 58 · roles 41 · permissions 0 · role_permissions 0 · linked_accounts 0 · refresh_tokens 0 · login_attempts 0 · app_registry 2 · settings 4 · account_activities 8,944(30d 2,102) · organizations 26(전부 active) · organization_members 22(left_at null 20) · role_assignments 73(전부 scope global · org 0) · lms_courses 11(published 6) · lms_lessons 10 · lms_enrollments 11(active 6) · lms_progress 6 · lms_certificates 1 · lms_events 0 · lms_attendance 0 · lms_content_bundles 0 |
| 테이블 크기 | 전부 ≤ 3.3 MB |
| lifecycle 지문 — `idx_*` 인덱스 | **62개 중 0개 존재** |
| lifecycle 지문 — ENUM `user_status` · `user_role_enum` · `app_status` | **부재** |
| lifecycle 지문 — seed | `app_registry` 에 4 Core 등록 0(`digital-signage-core` active · `partnerops` inactive 2건만) · `settings` `platform.%` 0 · `permissions` 0 · roles 의 legacy 4 이름 0 |
| uuid-ossp | 존재(다른 경로로 설치됨) |
| 컬럼 규약 | 마이그레이션/synchronize 형(camelCase). roles 는 camel+snake 중복(`is_system` true 39 / `isSystem` true 0) |
| `typeorm_migrations` | 676 건. 관련 기록: CreateUsersTable · AddRefreshTokenAndLoginAttempt · CreateAppRegistryTable · OrgServiceModelNormalizationPhaseA · CosmeticsStoreOrgBridge · CreateRoleAssignmentsTable · DropLegacyRbacColumns×2 · ExtendRolesTable · CreateLmsCoreTables. lms-core 패키지 내 `CreateLMSTables1701…` **미기록** |

**결론: lifecycle `install()` 은 프로덕션에 단 한 번도 실행된 적이 없다** (인덱스 · enum · seed 지문 3중 부재).

---

## 9. 프로덕션 로그 30일 (§10)

`o4o-core-api` stderr, 2026-08-15 ~ 2026-09-14.

| 검색 | 결과 |
|---|---|
| lifecycle 로그 태그(`[auth-core] Installing` 등 4 Core) | 0 |
| API 서비스 발행 DDL(`CREATE/ALTER/DROP TABLE` · `CREATE INDEX` · `CREATE TYPE`) | **0** → `API_SERVICE_SCHEMA_WRITE = ZERO` |
| `MIGRATION_JOB_SCHEMA_WRITE` | Cloud Run Job `o4o-api-migrations` 로그 존재(최근 2026-09-13) — 정상 경로 |
| `does not exist` | 18줄. `relation "cms_media" does not exist` ×12(기지 D8 · 범위 외) · `column "created_by_user_id" does not exist` ×6(2026-08-18 · `cosmetics.cosmetics_stores` 대상 StorePolicyRoutes 쿼리 · **본 IR 범위 외 관찰**, 별도 보고) |

§17 중지 조건 "API 서비스가 lifecycle DDL 실행" **미발동**.

---

## 10. Core 별 특수 판정 (§11)

- **auth-core (가장 보수적)**: users/roles/refresh_tokens/login_attempts/linked_accounts/account 관련 테이블은 모두 ACTIVE. `permissions`(0 row · 소비자 0) · `role_permissions`(0 row · entity 없음)도 **REMOVE 판정하지 않는다** — RBAC Freeze(F9) 대상이며 소비처 불명확 시 보존이 원칙. `user_roles` 는 이미 마이그레이션으로 은퇴한 테이블이므로 lifecycle 이 재생성하는 코드는 **위험 잔재**.
- **platform-core**: `app_registry` 는 AppManager read facade 의 canonical 테이블(마이그레이션 소유). lifecycle 의 `settings` seed(`platform.*`, `app_id` 컬럼 전제)는 실물 스키마와 호환되지 않아 실행 시 즉시 실패한다 → 이미 실질 dead.
- **organization-core**: barrel `export *` 로 lifecycle 이 api-server 번들에 실려 있으나 호출 0. `uninstall.ts` 의 옵션 무관 `DELETE FROM role_assignments/permissions` 는 RBAC SSOT 를 건드리는 코드 → 배선 시 P0 위험. `deactivate.ts` 는 실물 컬럼(`deactivated_at` 등) 부재로 실행 불가.
- **lms-core (운영 중)**: entity · service 는 RUNTIME_CONFIRMED 이므로 **entity/feature 는 제거 대상 아님**. 제거 후보는 lifecycle(`install.ts`·`uninstall.ts`·activate/deactivate)과 고아 `src/migrations/*` 뿐. `uninstall.ts` 의 무가드 DROP ×7 은 운영 데이터(courses 11 · enrollments 11 · certificates 1) 소실 코드.

---

## 11. manifest · ownsTables 정합 (§12)

| Core | ownsTables | 실물 존재 | 마이그레이션 소유 | 판정 |
|---|---|---|---|---|
| auth-core | 8 | 7 (user_roles 부재) | 3 + historical 4 | manifest 는 lifecycle 기준으로 작성됨 · **선언 ≠ 소유** |
| platform-core | 3 | 3 | 1 + historical 2 | 동상 |
| organization-core | 4 | 2 (units/roles 부재) | 2 | 동상 |
| lms-core | 8 | 8 | 8 | 선언 = 실물이지만 소유는 마이그레이션 |

manifest `lifecycle.*` 경로는 4 Core 모두 MANIFEST_DECLARATION_ONLY. manifest 변경은 본 IR 범위 밖(Core Freeze) — 별도 WO.

---

## 12. uninstall 위험 등급 (§13)

| Core | 코드 상 도달 가능한 최대 행위 | 등급 | 현재 배선 |
|---|---|---|---|
| auth-core | 로그 | DEACTIVATE_APP 이하 | 없음 |
| platform-core | 로그 | DEACTIVATE_APP 이하 | 없음 |
| organization-core | `DELETE role_assignments/permissions`(무조건) + `DELETE organizations/members`(purge) + `DROP` 2 (dropTables) | **DELETE_BUSINESS_DATA / DROP_SCHEMA** | 없음(barrel 노출만) |
| lms-core | `DROP TABLE … CASCADE` ×7 무가드 | **DROP_SCHEMA + DELETE_BUSINESS_DATA** | 없음 |

---

## 13. 최종 분류 (§14 · §15)

### 15.1 Installer 분류

| Core | install.ts | uninstall.ts | activate/deactivate |
|---|---|---|---|
| auth-core | DEAD_SCHEMA_INSTALLER (MIGRATION_OWNED_AND_DUPLICATED + user_roles 부활 위험) | DEAD (no-op) | DEAD (no-op) |
| platform-core | DEAD_SCHEMA_INSTALLER (seed 실물 비호환) | DEAD (no-op) | DEAD (no-op) |
| organization-core | DEAD_SCHEMA_INSTALLER (BUILD_ONLY 노출) | DEAD · **위험 코드**(SSOT DELETE) | DEAD · 내부 drift |
| lms-core | DEAD_SCHEMA_INSTALLER | DEAD · **위험 코드**(DROP ×7) | DEAD (no-op) |

### 15.2 테이블 처분

| 처분 | 테이블 |
|---|---|
| KEEP (ACTIVE · migration owned) | users · roles · refresh_tokens · login_attempts · linked_accounts · app_registry · settings · account_activities · organizations · organization_members · role_assignments · lms_* 8 |
| KEEP + MIGRATION_OWNERSHIP_REQUIRED(정식 창조자 부재 · 별도 WO 판단) | permissions · role_permissions · settings · account_activities · linked_accounts · roles |
| 정의만 존재 · 실물 없음(REMOVE_CANDIDATE 는 lifecycle 정의 쪽) | organization_units · organization_roles |
| HISTORICAL_RETIRED(재생성 코드 제거 후보) | user_roles |

### 15.3 코드 처분(제안 · 실행은 WO)

| 대상 | 처분 |
|---|---|
| 4 Core `lifecycle/install.ts` · `uninstall.ts` · `activate.ts` · `deactivate.ts` | REMOVE_CANDIDATE (cms-core 선례: install.ts 없이 guard 통과) |
| organization-core `src/index.ts` 의 `export * from './lifecycle/index.js'` | REMOVE_CANDIDATE (barrel 누출 차단) |
| lms-core `src/migrations/001,002` | REMOVE_CANDIDATE (고아) |
| manifest `lifecycle` 필드 · `ownsTables` | 별도 WO 판단(Core Freeze) |
| `disabled-apps.registry` platform-core 문구 · appsCatalog lms-core 버전 | 관찰 보고(범위 외) |

### 15.4 우선순위

| P | 항목 |
|---|---|
| **P0** | organization-core `uninstall.ts` SSOT DELETE · lms-core `uninstall.ts` 무가드 DROP — 배선되지 않았으나 코드 존재 자체가 위험. 제거 또는 계약 테스트로 봉인 |
| **P1** | auth-core install 의 `user_roles` 재생성 · enum 생성 코드(은퇴 스키마 부활 경로) |
| **P2** | organization-core barrel 누출 · lms-core 고아 migration |
| **P3** | 4 Core 공통 lifecycle no-op 파일 제거 · manifest 정합 |
| **P4** | permissions/settings/account_activities 등 NO_CREATION_OWNER 테이블의 baseline 마이그레이션 소유 명문화(RBAC Freeze 절차) |

---

## 14. 중지 조건 점검 (§17)

15개 조건 전수 점검 — **발동 0**. 특히: API 서비스 lifecycle DDL 실행 0 · LIFECYCLE_ONLY 운영 테이블 0 · 마이그레이션 실행/추가 0 · 타 세션 파일 접촉 0 · 자격정보 기록 0.

---

## 15. 후속 WO 제안 (§16 · Core 별 분리 · 통합 4-Core WO 없음)

| Core | 유형 | 제안 WO (명칭 초안) | 핵심 |
|---|---|---|---|
| auth-core | A(lifecycle 은퇴 · 계약 테스트) | `WO-O4O-AUTH-CORE-LIFECYCLE-DEAD-INSTALLER-RETIREMENT-V1` | 4 hook 제거 + manifest lifecycle 필드 정리 + "user_roles/enum 재생성 금지" spec. **테이블 무변경** |
| platform-core | A | `WO-O4O-PLATFORM-CORE-LIFECYCLE-DEAD-INSTALLER-RETIREMENT-V1` | 4 hook 제거 · disabled-apps.registry stale 문구 정정 |
| organization-core | A + B(barrel 누출 차단) | `WO-O4O-ORGANIZATION-CORE-LIFECYCLE-RETIREMENT-AND-BARREL-EXPORT-CLOSURE-V1` | P0 uninstall 제거 · `index.ts` export 정리 · 소비처(OrganizationService/entities) 무영향 검증 |
| lms-core | A + C(고아 migration 정리) | `WO-O4O-LMS-CORE-LIFECYCLE-AND-ORPHAN-MIGRATION-RETIREMENT-V1` | P0 uninstall DROP 제거 · `src/migrations` 제거 · entity/service 불변 · appsCatalog 버전 정합 |
| (공통 · 선택) | D(소유권 명문화) | `WO-O4O-RBAC-BASELINE-TABLE-OWNERSHIP-DECLARATION-V1` | permissions/role_permissions/settings/account_activities/linked_accounts/roles 의 baseline 소유 선언(RBAC Freeze F9 절차 · DDL 0) |

---

## 16. 검증 (§18)

| 항목 | 결과 |
|---|---|
| 정적 census(rg · Grep) 4 Core × install/uninstall/activate/deactivate | 완료 |
| api-server 의존 · import 경로 확인 | 완료 |
| 마이그레이션 643 파일 대조 | 완료 |
| 프로덕션 read-only 실측 | 완료(자격정보 미기록 · 프록시 종료) |
| 프로덕션 로그 30d | 완료 |
| 빌드/테스트 | 해당 없음(코드 변경 0) |

---

## 17. 완료 블록 (§19)

```
TARGET_CORE_CENSUS_COMPLETE = PASS
INSTALLER_CLASSIFICATION = DEAD_SCHEMA_INSTALLER × 4
PRODUCTION_LIFECYCLE_EXECUTION_EVIDENCE = ZERO
API_SERVICE_SCHEMA_WRITE = ZERO
MIGRATION_JOB_SCHEMA_WRITE = CONFIRMED (o4o-api-migrations)
LIFECYCLE_ONLY_PRODUCTION_TABLE = 0
NO_CREATION_OWNER_TABLE = 7 (5 존재 · 2 부재)
P0_RISK_CODE = 2 (organization-core uninstall · lms-core uninstall)
STOP_CONDITION = NONE
CORE_LIFECYCLE_SCHEMA_OWNERSHIP_AND_RUNTIME_CONSUMER_CENSUS = COMPLETE
```

---

## 18. 문서 정합

- 기준 문서 drift 발견: `disabled-apps.registry`(코드 내 주석) platform-core "미등록" 문구 stale — 기준 문서(§16-1)가 아니라 코드이므로 보고만.
- appsCatalog lms-core 버전(`0.1.0` vs package `1.0.0`) — 코드 · 보고만.
- 범위 외 관찰: `cosmetics.cosmetics_stores.created_by_user_id` 부재 오류(2026-08-18 ×6) — 별도 확인 권고.

**문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 5건**
