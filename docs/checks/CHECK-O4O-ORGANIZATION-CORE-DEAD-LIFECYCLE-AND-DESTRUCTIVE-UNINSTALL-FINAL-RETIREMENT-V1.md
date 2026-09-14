# CHECK-O4O-ORGANIZATION-CORE-DEAD-LIFECYCLE-AND-DESTRUCTIVE-UNINSTALL-FINAL-RETIREMENT-V1

> **WO**: `WO-O4O-ORGANIZATION-CORE-DEAD-LIFECYCLE-AND-DESTRUCTIVE-UNINSTALL-FINAL-RETIREMENT-V1` (Core lifecycle 정비 1/5)
> **근거 IR**: [`IR-O4O-CORE-LIFECYCLE-SCHEMA-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1`](../investigations/IR-O4O-CORE-LIFECYCLE-SCHEMA-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1.md) §3.3 · §12 · §15.4 P0
> **작업일**: 2026-09-14
> **Core Freeze 예외 근거**: 사용자 명시 지시(2026-09-14) — 업무 기능·entity·migration·운영 테이블 보존, 실행되지 않는 installer 와 파괴적 uninstaller 만 제거

## 1. 문제

`packages/organization-core/src/lifecycle/uninstall.ts` 는 옵션과 무관하게 `DELETE FROM role_assignments WHERE scope_type='organization'` · `DELETE FROM permissions WHERE id=$1` 을 실행하고, `dropTables` 시 `organizations` · `organization_members` 를 `DROP TABLE … CASCADE` 하는 코드였다. `install.ts` 는 프로덕션에 한 번도 실행된 적 없는 스키마 installer(호출자 0 · `idx_*` 0 · `organization_units/roles` 부재)다. `src/index.ts` 가 `export * from './lifecycle/index.js'` 로 이 코드를 api-server 번들에 실어 왔다.

## 2. 변경 (코드)

| 파일 | 변경 |
|---|---|
| `packages/organization-core/src/lifecycle/install.ts` | **삭제** |
| `packages/organization-core/src/lifecycle/uninstall.ts` | **삭제** |
| `packages/organization-core/src/lifecycle/index.ts` | `activate` · `deactivate` 만 export (cms-core 선례와 동일) |
| `packages/organization-core/src/index.ts` | `export * from './lifecycle/index.js'` 제거 (barrel 누출 차단) |
| `packages/organization-core/src/manifest.ts` | `lifecycle.install` · `lifecycle.uninstall` 선언 제거 (activate/deactivate 유지) |
| `packages/organization-core/src/types/context.ts` | 은퇴한 `InstallContext` · `UninstallContext` 인터페이스 제거 (소비자 0 확인) |
| `packages/organization-core/README.md` | 설계 문서 링크 1줄(존재하지 않는 lifecycle_hooks 문서) 은퇴 표기 |
| `apps/api-server/src/__tests__/organization-core-dead-lifecycle-destructive-uninstall-retirement.spec.ts` | **신규** 계약 spec (A. DDL/CASCADE/RBAC DELETE 0 · B. stale export/manifest 0 · C. entity/migration/OrganizationService 보존) |

## 3. 미변경 (보존)

- `packages/organization-core/src/entities/*` (Organization · OrganizationMember) · `services/*` · `controllers/*` · `utils/*`
- `apps/api-server/src/database/migrations/20260221000000-OrgServiceModelNormalizationPhaseA.ts` · `20260311200000-CosmeticsStoreOrgBridge.ts` · `20260224100000-CreateRoleAssignmentsTable.ts`
- `apps/api-server/src/routes/organization.routes.ts` 의 `OrganizationService` 소비 경로 · `database/entities.ts` 등록
- manifest `ownsTables` · `uninstallPolicy` · `permissions` (별도 WO — `ownsTables` 는 migration 소유 기준 정비 예정)
- `lifecycle/activate.ts` · `deactivate.ts` (호출자 0 · 선언용. `deactivate.ts` 의 `app_registry` snake 컬럼 UPDATE 는 실물과 불일치하는 dead 코드로 남아 있음 — 파괴적이지 않아 이번 범위 밖, Platform Core WO 에서 함께 판단)
- 운영 DB 스키마 · 데이터 · 권한: **변경 0**

## 4. 검증

| 항목 | 결과 |
|---|---|
| `pnpm exec jest organization-core-dead-lifecycle-… + app-management-runtime-residue-retirement + cms-lifecycle-…` | **PASS** 3 suites / 132 tests |
| `packages/organization-core` `tsc -p tsconfig.json` | PASS |
| `apps/api-server` `build:deps` + `tsc -p tsconfig.build.json` | PASS (exit 0) — 새 worktree 라 `@o4o/security-core` 등 7개 패키지 선빌드 필요(기지 함정, 본 변경과 무관) |
| `scripts/appstore-guard.ts` | PASSED (`organization-core: missing lifecycle files: install.ts` = warning only, cms-core 와 동일) |
| 저장소 전체 `install`/`uninstall`/`InstallContext`/`UninstallContext` from organization-core 참조 | 0 |
| 프로덕션 스키마/데이터 | 접근 없음 · 변경 0 |
| 브라우저 smoke | 해당 없음(런타임 경로 무변경 — 제거된 코드의 호출자 0 을 IR 에서 실측) |

## 5. 완료 조건

```
CORE_LIFECYCLE_INSTALL_RUNTIME       = ZERO
CORE_LIFECYCLE_UNINSTALL_RUNTIME     = ZERO
RUNTIME_SCHEMA_WRITE                 = ZERO
DESTRUCTIVE_UNINSTALL_PATH           = ZERO
STALE_LIFECYCLE_EXPORT               = ZERO
STALE_MANIFEST_LIFECYCLE_DECLARATION = ZERO
CANONICAL_ENTITIES                   = PRESERVED
CANONICAL_MIGRATIONS                 = PRESERVED
PRODUCTION_SCHEMA_CHANGE             = ZERO
PRODUCTION_DATA_CHANGE               = ZERO
PRODUCTION_AUTHORIZATION_CHANGE      = ZERO
OTHER_SERVICE_REGRESSION             = PASS (typecheck · 계약 spec)
ORGANIZATION_CORE_DEAD_LIFECYCLE_RETIREMENT = CLOSED
```

## 6. 잔여 · 후속

- 다음 순서: LMS Core → Auth Core → Platform Core → RBAC baseline 소유권 (IR §15 · 사용자 지시 순서).
- `ownsTables` 의 `organization_units` · `organization_roles`(실물 부재) 는 RBAC baseline WO 에서 `ABSENT_AND_UNUSED` 판정 후 정비.

**문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건**
