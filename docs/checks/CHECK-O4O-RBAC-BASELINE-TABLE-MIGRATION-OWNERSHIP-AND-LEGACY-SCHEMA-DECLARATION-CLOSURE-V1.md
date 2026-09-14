# CHECK-O4O-RBAC-BASELINE-TABLE-MIGRATION-OWNERSHIP-AND-LEGACY-SCHEMA-DECLARATION-CLOSURE-V1

> **WO**: `WO-O4O-RBAC-BASELINE-TABLE-MIGRATION-OWNERSHIP-AND-LEGACY-SCHEMA-DECLARATION-CLOSURE-V1` (Core lifecycle 정비 5/5)
> **근거 IR**: [`IR-O4O-CORE-LIFECYCLE-SCHEMA-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1`](../investigations/IR-O4O-CORE-LIFECYCLE-SCHEMA-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1.md) §6 · §7 · §8 · §10 · §15.4 P4
> **선행**: Organization(`2eab061af`) · LMS(`ee4473437`) · Auth(`9a37fda30`) · Platform(`3069f36e2`) CHECK 4건
> **기준**: [`RBAC-FREEZE-DECLARATION-V1`](../rbac/RBAC-FREEZE-DECLARATION-V1.md) (F9 · `user_roles` 재생성 금지) · [`O4O-CORE-FREEZE-V1`](../architecture/O4O-CORE-FREEZE-V1.md)
> **작업일**: 2026-09-14

## 1. 문제

IR 이 `NO_CREATION_OWNER` 로 분류한 7 테이블은 "프로덕션에 있거나(5) 없거나(2) 하지만 어느 migration 도 만들지 않은 테이블" 이다. 은퇴한 4 Core lifecycle installer 가 유일한 CREATE 코드였고 그마저 호출 0 이었다. Core manifest 의 `ownsTables` 는 이 테이블들을 계속 "소유" 로 선언했으며, 은퇴한 `user_roles` 와 부재한 `organization_units` · `organization_roles` 까지 포함하고 있었다.

본 WO 는 **테이블을 만들지 않는다.** 7 테이블을 한꺼번에 baseline migration 으로 생성하는 것은 금지(사용자 지시) 이며, 테이블별로 판정만 확정하고 legacy 선언을 정리한다.

## 2. 테이블별 판정 (DDL 0)

| 테이블 | 실물(2026-09-14 read-only) | entity / 런타임 | 창조 migration | **판정** | 근거 |
|---|---|---|---|---|---|
| `permissions` | ✓ · 0 row | `modules/auth/entities/Permission.ts` 등록 · `Role.permissions` **eager** ManyToMany → Role 을 읽을 때마다 JOIN | 없음 | **MIGRATION_OWNERSHIP_REQUIRED** | Role 로드 경로에 물리적으로 묶여 있어 DEAD 판정 불가 · F9 보존 원칙 |
| `role_permissions` | ✓ · 0 row | standalone entity 없음 · `Role` `@JoinTable({ name: 'role_permissions' })` | 없음 | **MIGRATION_OWNERSHIP_REQUIRED** | 위와 동일 join table |
| `linked_accounts` | ✓ · 0 row | `entities/LinkedAccount.ts` 등록 · account-linking · auth-login · auth-account-inquiry 소비 | 없음 | **MIGRATION_OWNERSHIP_REQUIRED** | 활성 기능(OAuth 연결) 의 테이블 |
| `settings` | ✓ · 4 row | `entities/Settings.ts` 등록 · settingsService · passportDynamic · encryption-key-rotation 소비 | 없음 | **MIGRATION_OWNERSHIP_REQUIRED** | 활성 · 데이터 존재 (STOP 사유 아님 — 제거 제안이 없으므로) |
| `account_activities` | ✓ · 8,944 row (30d 2,102) | `entities/AccountActivity.ts` 등록 · 로그인 · guest · 서비스 사용자 경로 | 없음 | **MIGRATION_OWNERSHIP_REQUIRED** | ACTIVE_CRITICAL |
| `organization_units` | ✗ | entity 없음 · 소비 0 · 은퇴한 organization-core `install.ts` 만 정의 | 없음 | **ABSENT_AND_UNUSED** | 선언만 제거 |
| `organization_roles` | ✗ | 동상 | 없음 | **ABSENT_AND_UNUSED** | 선언만 제거 |
| (부수) `user_roles` | ✗ | entity 없음 · `20260228000002-DropLegacyRbacColumns` 가 backfill 후 DROP | (DROP 만) | **HISTORICAL_RETIRED** | F9 "재생성 금지" — auth-core ownsTables 에서 제거 |
| (부수) `roles` | ✓ · 41 row | `Role.ts` · RBAC 핵심 | `ExtendRolesTable` ALTER 만 ("synchronize created") | 사용자 지정 7 테이블 밖 — **관찰만** (MIGRATION_OWNERSHIP_REQUIRED 후보) | 별도 판단 |

- `ACTIVE_WITH_EXISTING_OWNER` · `DEAD_ENTITY_AND_RUNTIME` · `STOP_DATA_PRESENT` 에 해당하는 테이블: **0**.
- MIGRATION_OWNERSHIP_REQUIRED 5 테이블의 "ownership" 은 **실물 스키마를 그대로 스냅샷하는 baseline migration**(`CREATE TABLE IF NOT EXISTS` + 실물 컬럼 · camelCase) 을 뜻하며, 그 작성은 [`PRODUCTION-MIGRATION-STANDARD`](../baseline/operations/PRODUCTION-MIGRATION-STANDARD.md) 와 F9 절차를 따르는 **별도 WO** 다. 본 WO 의 spec 은 baseline migration 이 추가돼도 그대로 통과하도록 "창조 migration 부재" 를 고정하지 않는다.

## 3. 변경 (코드 · 선언만)

| 파일 | 변경 |
|---|---|
| `packages/auth-core/src/manifest.ts` | `ownsTables` 에서 `'user_roles'` 제거 · 헤더 주석 "User-Role assignments (user_roles table)" → role_assignments SSOT 로 정정 · ownsTables 의미("스키마 창조자 아님") · 판정 주석 |
| `packages/organization-core/src/manifest.ts` | `ownsTables` 에서 `'organization_units'` · `'organization_roles'` 제거 · 판정 주석 |
| `packages/platform-core/src/manifest.ts` | `ownsTables` 항목 불변 · 판정 주석만 추가 |
| `apps/api-server/src/__tests__/rbac-baseline-table-migration-ownership-legacy-schema-declaration-closure.spec.ts` | **신규** 계약 spec 9 tests — A. 3 manifest ownsTables 정합 + 전 패키지 manifest 에 은퇴/부재 테이블 선언 0 · B. 은퇴/부재 3 테이블에 대한 `@Entity` · `CREATE TABLE` · `createTable` 0 (packages + api-server) · `DropLegacyRbacColumns` 이후 user_roles 재생성 migration 0 · C. 5 테이블 entity 존재 · 테이블명 일치 · DataSource 등록 · packages 내 DDL 0 |

`ownsTables` 의 소비처: `scripts/appstore-guard.ts` 는 존재 여부만 informational 로 읽음 (판정 없음) · api-server 런타임 소비 0 (`app-management-runtime-residue-retirement.spec` 이 "ownsTables 참조 없음" 을 고정) → 선언 변경의 런타임 영향 0.

## 4. 미변경 (보존)

- 운영 테이블 · 데이터 · 권한 · 역할 seed: **변경 0** (DDL 0 · INSERT/UPDATE/DELETE 0 · migration 추가 0)
- `Permission` · `Role`(eager `permissions` 관계 · `role_permissions` JoinTable) · `LinkedAccount` · `Settings` · `AccountActivity` entity 및 `database/entities.ts` 등록
- `20260228000002-DropLegacyRbacColumns` 를 포함한 모든 migration
- `RBAC-FREEZE-DECLARATION-V1` · `O4O-CORE-FREEZE-V1` 본문 (F9 · F10 — 인라인 수정 없음)
- `ownsTables` 의 나머지 항목 (`users` · `roles` · `permissions` · `role_permissions` · `linked_accounts` · `refresh_tokens` · `login_attempts` · `organizations` · `organization_members` · `app_registry` · `settings` · `account_activities` · lms 8)

## 5. 검증

| 항목 | 결과 |
|---|---|
| `pnpm exec jest rbac-baseline-table-…` | PASS 9 tests |
| Core lifecycle 계약 spec 7 suites (`rbac-baseline` · `auth-core-dead` · `organization-core-dead` · `platform-core-dead` · `lms-core-dead` · `cms-lifecycle` · `app-management`) | **PASS** 7 suites / 171 tests |
| `packages/{auth-core, organization-core, platform-core}` `tsc --build` | PASS ×3 |
| `apps/api-server` `tsc -p tsconfig.build.json --noEmit` | PASS (exit 0) |
| `scripts/appstore-guard.ts` | PASSED |
| 프로덕션 | 접근 없음 (실물 수치는 IR §8 의 2026-09-14 read-only 실측 인용) · 변경 0 |
| 브라우저 smoke | 해당 없음 (선언 문자열 · 주석 · 테스트만 변경) |

## 6. 완료 조건

```
PER_TABLE_VERDICT                    = 7/7 확정 (MIGRATION_OWNERSHIP_REQUIRED 5 · ABSENT_AND_UNUSED 2)
BULK_TABLE_CREATION                  = ZERO (지시대로 일괄 생성 안 함)
DDL                                  = ZERO
LEGACY_OWNS_TABLES_DECLARATION       = ZERO (user_roles · organization_units · organization_roles 제거)
RETIRED_TABLE_RESURRECTION_PATH      = ZERO (entity · DDL · migration 재생성 0 — spec 고정)
CANONICAL_ENTITIES                   = PRESERVED
CANONICAL_MIGRATIONS                 = PRESERVED
PRODUCTION_SCHEMA_CHANGE             = ZERO
PRODUCTION_DATA_CHANGE               = ZERO
PRODUCTION_AUTHORIZATION_CHANGE      = ZERO
OTHER_SERVICE_REGRESSION             = PASS
RBAC_BASELINE_OWNERSHIP_CLOSURE      = CLOSED (선언 종결 · migration 작성은 후속 WO)
```

## 7. 잔여 · 후속 (별도 WO 제안)

1. **baseline snapshot migration WO** — MIGRATION_OWNERSHIP_REQUIRED 5 테이블(+ `roles` 검토) 을 실물 컬럼 그대로 `CREATE TABLE IF NOT EXISTS` 로 명문화. 테이블별 · F9 절차 · CI 자동 실행 · 프로덕션은 no-op 이어야 함. 우선순위: `account_activities` · `settings`(데이터 존재) → `linked_accounts` → `permissions` · `role_permissions`.
2. `permissions`(0 row · 런타임 소비 = Role eager JOIN 뿐) 의 장기 처분(유지 vs eager 해제) 은 RBAC Freeze 절차의 판단 — 본 WO 는 보존.
3. Core lifecycle 정비 5/5 완료. IR §15.4 의 후속 WO 5건 전부 CLOSED.

**문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건 (baseline snapshot migration)**
