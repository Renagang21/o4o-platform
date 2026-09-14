# CHECK-O4O-AUTH-CORE-DEAD-LIFECYCLE-AND-RETIRED-USER-ROLES-RESURRECTION-FINAL-CLOSURE-V1

> **WO**: `WO-O4O-AUTH-CORE-DEAD-LIFECYCLE-AND-RETIRED-USER-ROLES-RESURRECTION-FINAL-CLOSURE-V1` (Core lifecycle 정비 3/5)
> **근거 IR**: [`IR-O4O-CORE-LIFECYCLE-SCHEMA-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1`](../investigations/IR-O4O-CORE-LIFECYCLE-SCHEMA-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1.md) §3.1 · §12 · §15.4
> **선행**: [`CHECK-O4O-LMS-CORE-DEAD-LIFECYCLE-DESTRUCTIVE-UNINSTALL-AND-ORPHAN-MIGRATION-FINAL-RETIREMENT-V1`](CHECK-O4O-LMS-CORE-DEAD-LIFECYCLE-DESTRUCTIVE-UNINSTALL-AND-ORPHAN-MIGRATION-FINAL-RETIREMENT-V1.md)
> **작업일**: 2026-09-14

## 1. 문제

- `packages/auth-core/src/lifecycle/install.ts`(367줄) 는 `CREATE EXTENSION uuid-ossp` · `CREATE TYPE user_status / user_role_enum` · `CREATE TABLE IF NOT EXISTS users · roles · permissions · role_permissions · **user_roles** · linked_accounts · refresh_tokens · login_attempts` 와 `INSERT INTO roles / permissions / role_permissions` seed 를 raw SQL 로 실행하는 installer 였다.
- `user_roles` 는 RBAC SSOT 전환(`role_assignments`) 으로 이미 은퇴한 구조다. 이 코드가 어떤 경로로든 실행됐다면 폐기된 join 테이블과 legacy ENUM · 역할 seed 를 프로덕션에 되살렸다. 호출자는 저장소 전체 0 (`@o4o/auth-core/lifecycle` import 0) 이라 실제 실행 이력은 없다.
- `uninstall.ts` 는 로그만 남기는 no-op (파괴 경로 없음) 이지만 install 과 쌍인 dead 선언이라 함께 은퇴한다.
- `manifest.ts` `lifecycle` 블록과 `lifecycle/index.ts` · `src/index.ts` 주석이 install/uninstall 을 계속 선언·안내했다.

## 2. 재확인 (제거 전)

| 항목 | 결과 |
|---|---|
| 호출자 | `auth-core/lifecycle` · `install(`/`uninstall(` 참조 저장소 전체 0 (api-server · platform-core · scripts) |
| 스키마 정본 | `1700000000000-CreateUsersTable` · `1703000000000-AddRefreshTokenAndLoginAttempt` · `20260224100000-CreateRoleAssignmentsTable` · `20260228000002-DropLegacyRbacColumns` 등 api-server migration (deploy job 단일 소유) |
| `InstallContext` · `UninstallContext` | install.ts / uninstall.ts 내부 정의 · 외부 참조 0 |
| package `exports["./lifecycle"]` | `./dist/lifecycle/index.js` — activate · deactivate 가 남으므로 subpath 유지 가능 |
| 잔여 `user_roles` 참조 | `manifest.ts` `ownsTables` 선언 문자열 1 (+ 주석) · api-server `create-admin-user.ts` / `create-manager-user.ts` 의 "dropped" 설명 주석 — 실행 경로 아님 |

## 3. 변경 (코드)

| 파일 | 변경 |
|---|---|
| `packages/auth-core/src/lifecycle/install.ts` · `uninstall.ts` | **삭제** (−397줄) |
| `packages/auth-core/src/lifecycle/index.ts` | `activate` · `deactivate` 만 export (WO 주석) |
| `packages/auth-core/src/manifest.ts` | `lifecycle.install` · `lifecycle.uninstall` 선언 제거 (activate/deactivate 유지) |
| `packages/auth-core/src/index.ts` | 주석 정정 (install/uninstall 은퇴 명시) |
| `apps/api-server/src/__tests__/auth-core-dead-lifecycle-retired-user-roles-resurrection-closure.spec.ts` | **신규** 계약 spec 10 tests — A. 파일 부재 · DDL/`CREATE TYPE`/`CREATE EXTENSION`/CASCADE 0 · 실행 코드 `user_roles`/`INSERT INTO`/`DELETE FROM` 0 · B. manifest/barrel stale 선언 0 · api-server 의 lifecycle import 0 · C. 인증 entity 8 + `database/entities.ts` 등록 · 정본 migration 4 · manifest/subpath export · auth 서비스 경로 보존 |

## 4. 미변경 (보존)

- `apps/api-server` 인증 정본: `entities/User.ts` · `entities/LinkedAccount.ts` · `modules/auth/entities/{Role, RoleAssignment, RefreshToken, LoginAttempt, ServiceMembership, ServiceCredential, Permission}.ts` · `modules/auth/**` 서비스 · 로그인 · 토큰 · 비밀번호 재설정 · auth-context
- `apps/api-server/src/database/migrations/*` 인증 migration 전부
- `packages/auth-core/src/manifest.ts` 의 `ownsTables`(`user_roles` 항목 포함) · `dependencies` · `capabilities` — **ownsTables 는 RBAC baseline 소유권 WO(5/5) 에서 migration 소유 기준으로 정비** (본 WO 범위 밖, 의도적 미변경)
- `packages/auth-core/package.json` (`./lifecycle` subpath 유지) · `tsconfig.json` · `backend/index.ts`
- `lifecycle/activate.ts` · `deactivate.ts` (로그만 · 선언용)
- 역할 seed · 관리자 역할 · 운영 권한 · auth 테이블: **변경 0** (역할 seed 재실행 · DROP · 신규 RBAC 구조 없음)

## 5. 검증

| 항목 | 결과 |
|---|---|
| `pnpm exec jest auth-core-dead-lifecycle-…` | PASS 10 tests |
| `pnpm exec jest --testPathPattern="__tests__/(auth-\|rbac-\|app-management)"` | **PASS** 4 suites / 96 tests (`auth-runtime-and-legacy-package-final-closure` · `app-management-runtime-residue-retirement` · `auth-account.businessInfoWrite` 포함) |
| `packages/auth-core` `tsc --build` | PASS |
| `apps/api-server` `tsc -p tsconfig.build.json --noEmit` | PASS (exit 0) |
| `scripts/appstore-guard.ts` | PASSED (`auth-core: missing lifecycle files: install.ts` = warning only) |
| 프로덕션 스키마/데이터/권한 | 접근 없음 · 변경 0 |
| 브라우저 smoke | 해당 없음(런타임 경로 무변경 · 제거 코드 호출자 0 실측 · 로그인 경로는 api-server `modules/auth` 이며 auth-core 패키지 코드를 실행하지 않음) |

## 6. 완료 조건

```
CORE_LIFECYCLE_INSTALL_RUNTIME       = ZERO
CORE_LIFECYCLE_UNINSTALL_RUNTIME     = ZERO
RUNTIME_SCHEMA_WRITE                 = ZERO
DESTRUCTIVE_UNINSTALL_PATH           = ZERO
RETIRED_USER_ROLES_RESURRECTION_PATH = ZERO
ROLE_SEED_REPLAY_PATH                = ZERO
STALE_LIFECYCLE_EXPORT               = ZERO
STALE_MANIFEST_LIFECYCLE_DECLARATION = ZERO
CANONICAL_ENTITIES                   = PRESERVED
CANONICAL_MIGRATIONS                 = PRESERVED
PRODUCTION_SCHEMA_CHANGE             = ZERO
PRODUCTION_DATA_CHANGE               = ZERO
PRODUCTION_AUTHORIZATION_CHANGE      = ZERO
OTHER_SERVICE_REGRESSION             = PASS
AUTH_CORE_DEAD_LIFECYCLE_CLOSURE     = CLOSED
```

## 7. 잔여 · 후속

- `manifest.ts` `ownsTables` 의 `user_roles`(은퇴 테이블) · `permissions` · `role_permissions` · `linked_accounts` 등 선언은 RBAC baseline 소유권 WO(5/5) 대상.
- 다음 순서: Platform Core → RBAC baseline 소유권.

**문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건**
