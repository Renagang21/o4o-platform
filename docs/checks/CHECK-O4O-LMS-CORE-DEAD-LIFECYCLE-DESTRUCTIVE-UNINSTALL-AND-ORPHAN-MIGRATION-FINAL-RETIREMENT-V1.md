# CHECK-O4O-LMS-CORE-DEAD-LIFECYCLE-DESTRUCTIVE-UNINSTALL-AND-ORPHAN-MIGRATION-FINAL-RETIREMENT-V1

> **WO**: `WO-O4O-LMS-CORE-DEAD-LIFECYCLE-DESTRUCTIVE-UNINSTALL-AND-ORPHAN-MIGRATION-FINAL-RETIREMENT-V1` (Core lifecycle 정비 2/5)
> **근거 IR**: [`IR-O4O-CORE-LIFECYCLE-SCHEMA-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1`](../investigations/IR-O4O-CORE-LIFECYCLE-SCHEMA-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1.md) §3.4 · §12 · §15.4 P0/P2
> **선행**: [`CHECK-O4O-ORGANIZATION-CORE-DEAD-LIFECYCLE-AND-DESTRUCTIVE-UNINSTALL-FINAL-RETIREMENT-V1`](CHECK-O4O-ORGANIZATION-CORE-DEAD-LIFECYCLE-AND-DESTRUCTIVE-UNINSTALL-FINAL-RETIREMENT-V1.md)
> **작업일**: 2026-09-14

## 1. 문제

- `packages/lms-core/src/lifecycle/uninstall.ts` 의 `onUninstall` 은 옵션·가드 없이 `lms_courses` 등 7 테이블을 `DROP TABLE … CASCADE` 했다 (운영 강좌 11 · 수강 11 · 수료 1 소실 경로). `install.ts` 는 프로덕션에 실행된 적 없는 installer(호출자 0 · `idx_*` 21개 중 0) 이며 같은 파일에 두 번째 `onUninstall`(보존형)이 공존했다.
- `src/migrations/001-create-lms-tables.ts` · `002-create-lms-additional-tables.ts`(`CreateLMSTables1701346000000` · `CreateLMSAdditionalTables1701346100000`) 는 tsconfig `exclude` · api-server migration glob 밖 · 프로덕션 `typeorm_migrations` 미기록(676건 중 0) · 어디서도 import 0 → **고아**. 만드는 테이블 7개는 정본 `20260410000001-CreateLmsCoreTables`(8개) 의 부분집합.

## 2. 재확인 (고아 migration 제거 전)

| 항목 | 결과 |
|---|---|
| 실행 이력 | 프로덕션 `typeorm_migrations` 에 `CreateLMSTables*` 0건 (IR §8) |
| 등록 경로 | `migration-config.ts` glob 은 `apps/api-server/src/database/migrations/*` 만 · 패키지 tsconfig 가 `src/migrations/**` exclude → dist 에도 없음 |
| 정본 중복 | orphan 7 테이블 ⊂ 정본 8 테이블 (`lms_content_bundles` 만 정본 전용) |
| 참조 | 저장소 전체 0 |

## 3. 변경 (코드)

| 파일 | 변경 |
|---|---|
| `packages/lms-core/src/lifecycle/install.ts` · `uninstall.ts` | **삭제** |
| `packages/lms-core/src/migrations/001-create-lms-tables.ts` · `002-create-lms-additional-tables.ts` | **삭제** (디렉터리 소멸) |
| `packages/lms-core/src/manifest.ts` | `lifecycle.install` · `lifecycle.uninstall` 선언 제거 (activate/deactivate 유지) |
| `packages/lms-core/tsconfig.json` | 사라진 `src/migrations/**/*` exclude 항목 제거 |
| `apps/api-server/src/__tests__/lms-core-dead-lifecycle-destructive-uninstall-orphan-migration-retirement.spec.ts` | **신규** 계약 spec |

## 4. 미변경 (보존)

- `packages/lms-core/src/entities/*`(interactive-content-core · education-extension 재export) · `services/*` · `controllers/*` · `utils/*` · `src/index.ts`(원래 lifecycle 미export)
- `apps/api-server/src/database/migrations/20260410000001-CreateLmsCoreTables.ts` 및 후속 ALTER 정본
- `apps/api-server/src/modules/lms` · `modules/survey` 의 `@o4o/lms-core` 소비 · `database/entities.ts` 등록
- `lifecycle/activate.ts` · `deactivate.ts` (로그만 · 선언용)
- manifest `ownsTables` 8 · `uninstallPolicy` (별도 정비) · appsCatalog 버전 표기(`0.1.0`, 관찰만)
- 운영 lms_* 테이블 · 데이터: **변경 0**

## 5. 검증

| 항목 | 결과 |
|---|---|
| `pnpm exec jest lms-core-dead-lifecycle-…` | PASS 9 tests |
| `pnpm exec jest --testPathPattern=lms` (14 suites: 소유권 경계 · 서비스 scope · 수료 체인 · KPA 프론트 계약 · PharmacyHub learner) | **PASS** 14 suites / 207 tests |
| `packages/lms-core` `tsc -p tsconfig.json` | PASS |
| `apps/api-server` `tsc -p tsconfig.build.json --noEmit` | PASS (exit 0) |
| `scripts/appstore-guard.ts` | PASSED (`lms-core: missing lifecycle files: install.ts` = warning only) |
| 프로덕션 스키마/데이터 | 접근 없음 · 변경 0 |
| 브라우저 smoke | 해당 없음(런타임 경로 무변경 · 제거 코드 호출자 0 실측) |

## 6. 완료 조건

```
CORE_LIFECYCLE_INSTALL_RUNTIME       = ZERO
CORE_LIFECYCLE_UNINSTALL_RUNTIME     = ZERO
RUNTIME_SCHEMA_WRITE                 = ZERO
DESTRUCTIVE_UNINSTALL_PATH           = ZERO
ORPHAN_PACKAGE_MIGRATION             = ZERO
STALE_LIFECYCLE_EXPORT               = ZERO
STALE_MANIFEST_LIFECYCLE_DECLARATION = ZERO
CANONICAL_ENTITIES                   = PRESERVED
CANONICAL_MIGRATIONS                 = PRESERVED
PRODUCTION_SCHEMA_CHANGE             = ZERO
PRODUCTION_DATA_CHANGE               = ZERO
PRODUCTION_AUTHORIZATION_CHANGE      = ZERO
OTHER_SERVICE_REGRESSION             = PASS
LMS_CORE_DEAD_LIFECYCLE_RETIREMENT   = CLOSED
```

## 7. 잔여 · 후속

- 다음 순서: Auth Core → Platform Core → RBAC baseline 소유권.

**문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건**
