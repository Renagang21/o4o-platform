# CHECK-O4O-PLATFORM-CORE-DEAD-LIFECYCLE-MANIFEST-AND-APPSTORE-SCHEMA-CONTRACT-FINAL-CLOSURE-V1

> **WO**: `WO-O4O-PLATFORM-CORE-DEAD-LIFECYCLE-MANIFEST-AND-APPSTORE-SCHEMA-CONTRACT-FINAL-CLOSURE-V1` (Core lifecycle 정비 4/5)
> **근거 IR**: [`IR-O4O-CORE-LIFECYCLE-SCHEMA-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1`](../investigations/IR-O4O-CORE-LIFECYCLE-SCHEMA-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1.md) §3.2 · §10 · §12 · §15.4
> **선행**: [`CHECK-O4O-AUTH-CORE-DEAD-LIFECYCLE-AND-RETIRED-USER-ROLES-RESURRECTION-FINAL-CLOSURE-V1`](CHECK-O4O-AUTH-CORE-DEAD-LIFECYCLE-AND-RETIRED-USER-ROLES-RESURRECTION-FINAL-CLOSURE-V1.md)
> **작업일**: 2026-09-14

## 1. 문제

- `packages/platform-core/src/lifecycle/install.ts` 는 `CREATE TYPE app_status` · `CREATE TABLE IF NOT EXISTS app_registry · settings · account_activities` · `idx_*` 11 · `INSERT INTO settings` seed 4 를 raw SQL 로 실행하는 installer 였다. 호출자 저장소 전체 0 (`@o4o/platform-core/lifecycle` import 0) 이고, seed 는 실물 `settings` 스키마와 비호환(`app_id` 컬럼 전제)이라 실행됐다면 즉시 실패하는 실질 dead 코드.
- "앱 설치(app_registry 상태 · manifest 기반 앱 identity)" 와 "운영 DB CREATE TABLE" 이 한 installer 에 섞여 있었다. app_registry 의 실제 정본은 api-server migration `2026012200001-CreateAppRegistryTable` (+ `SeedDefaultApps`) 이며 AppManager read facade · `/api/v1/apps/availability` · `/api/v1/admin/apps` READ 가 그 위에서 동작한다.
- `uninstall.ts` 는 로그만 남기는 no-op (allowPurge false) 이지만 install 과 쌍인 dead 선언.
- `apps/api-server/src/app-manifests/disabled-apps.registry.ts` 의 platform-core 항목 `reason: 'api-server dependencies에 미등록'` · `nextAction: 'package.json에 의존성 추가 후 import 활성화'` 는 stale — `@o4o/platform-core` 는 `workspace:*` 로 등록돼 있고 `store-identity` · `store-policy` subpath 를 21개 파일이 소비한다. 이 항목은 `GET /api/v1/admin/apps/disabled` 로 관리자 UI 에 노출된다.

## 2. 재확인 (제거 전)

| 항목 | 결과 |
|---|---|
| 호출자 | `platform-core/lifecycle` import 저장소 전체 0 · api-server 소비 = `store-identity` · `store-policy` subpath 21 파일 |
| 스키마 정본 | `2026012200001-CreateAppRegistryTable` · `2026012200002-SeedDefaultApps` · `20270219000000-RemoveLegacyCosmeticsPartnerAppRegistry` · `20270404000000-DeactivateRetiredPartnerOpsAppRegistry` (deploy job 단일 소유) |
| entity 정본 | `apps/api-server/src/entities/{AppRegistry, Settings, AccountActivity}.ts` · `database/entities.ts` 에 AppRegistry · AccountActivity 등록 |
| `InstallContext` · `UninstallContext` | install.ts / uninstall.ts 내부 정의 · 외부 참조 0 |
| package `exports["./lifecycle"]` | activate · deactivate 가 남으므로 subpath 유지 |
| disabled-apps.registry | api-server `package.json` 에 `@o4o/platform-core: workspace:*` 존재 → 문구 stale 확정. auth-core 항목은 실제로 미등록이라 **정확** (미변경) |

## 3. 변경 (코드)

| 파일 | 변경 |
|---|---|
| `packages/platform-core/src/lifecycle/install.ts` · `uninstall.ts` | **삭제** |
| `packages/platform-core/src/lifecycle/index.ts` | `activate` · `deactivate` 만 export (WO 주석 · "앱 설치 ≠ CREATE TABLE" 명시) |
| `packages/platform-core/src/manifest.ts` | `lifecycle.install` · `lifecycle.uninstall` 선언 제거 (activate/deactivate 유지) |
| `packages/platform-core/src/index.ts` | 주석 정정 |
| `apps/api-server/src/app-manifests/disabled-apps.registry.ts` | platform-core 항목 `reason` · `nextAction` 문구를 사실로 정정 (status · disabledAt · 항목 자체는 유지 → API 응답 형태 불변) |
| `apps/api-server/src/__tests__/platform-core-dead-lifecycle-manifest-appstore-schema-contract-closure.spec.ts` | **신규** 계약 spec 11 tests — A. 파일 부재 · DDL/`CREATE TYPE|INDEX|EXTENSION`/CASCADE 0 · raw seed 0 · B. manifest/barrel stale 선언 0 · api-server lifecycle import 0 (subpath 소비 >0) · registry stale 문구 0 + 의존성 등록 확인 · C. entity 3 + 등록 · migration 정본 · availability/admin READ/appsCatalog · manifest identity/ownsTables/subpath export 보존 |

## 4. 미변경 (보존)

- `app_registry` 테이블 · 6행 운영 상태 · `AppRegistry` entity · migration 정본 · AppManager read facade
- `/api/v1/apps/availability` · `/api/v1/admin/apps` READ 9종 · `/api/v1/appstore` · `appsCatalog.ts` (APPS_CATALOG) · `disabled-apps.registry` 항목 구조
- `packages/platform-core/src/manifest.ts` 의 `id/appId/type` 앱 identity · `ownsTables` 3 · `uninstallPolicy` · `permissions` · `menus` · `exposes` · `backend` 선언 — **ownsTables(`settings` · `account_activities`) 는 RBAC baseline 소유권 WO(5/5) 에서 migration 소유 기준으로 정비**
- `packages/platform-core/src/{store-identity, store-policy, settings, backend}` · `package.json` (`./lifecycle` · `./store-identity` · `./store-policy` subpath) · `tsconfig.json`
- `lifecycle/activate.ts` · `deactivate.ts` (로그만 · 선언용)
- 운영 스키마 · 데이터 · 권한: **변경 0**

## 5. 검증

| 항목 | 결과 |
|---|---|
| `pnpm exec jest platform-core-dead-lifecycle-…` | PASS 11 tests |
| `pnpm exec jest --testPathPattern="__tests__/(platform-core-\|app-management\|store-policy\|store-slug\|…)"` | **PASS** 5 suites / 110 tests (`app-management-runtime-residue-retirement` · `store-slug-store-id-axis` · `store-policy-ownership-axis` · `store-slug-canonical-contract` 포함) |
| `packages/platform-core` `tsc --build` | PASS |
| `apps/api-server` `tsc -p tsconfig.build.json --noEmit` | PASS (exit 0) |
| `scripts/appstore-guard.ts` | PASSED (`platform-core: missing lifecycle files: install.ts` = warning only) |
| 프로덕션 스키마/데이터/권한 | 접근 없음 · 변경 0 |
| 브라우저 smoke | 해당 없음(런타임 경로 무변경 · 제거 코드 호출자 0 실측). `GET /admin/apps/disabled` 응답은 platform-core 항목의 문자열 2개만 달라짐 |

## 6. 완료 조건

```
CORE_LIFECYCLE_INSTALL_RUNTIME       = ZERO
CORE_LIFECYCLE_UNINSTALL_RUNTIME     = ZERO
RUNTIME_SCHEMA_WRITE                 = ZERO
DESTRUCTIVE_UNINSTALL_PATH           = ZERO
STALE_LIFECYCLE_EXPORT               = ZERO
STALE_MANIFEST_LIFECYCLE_DECLARATION = ZERO
STALE_DISABLED_APP_REGISTRY_TEXT     = ZERO
APP_INSTALL_VS_DDL_AXIS              = SEPARATED
APPSTORE_CANONICAL                   = PRESERVED (app_registry · availability · manifest identity · appsCatalog)
CANONICAL_ENTITIES                   = PRESERVED
CANONICAL_MIGRATIONS                 = PRESERVED
PRODUCTION_SCHEMA_CHANGE             = ZERO
PRODUCTION_DATA_CHANGE               = ZERO
PRODUCTION_AUTHORIZATION_CHANGE      = ZERO
OTHER_SERVICE_REGRESSION             = PASS
PLATFORM_CORE_DEAD_LIFECYCLE_CLOSURE = CLOSED
```

## 7. 잔여 · 후속

- manifest `exposes.entities/services` (`AppRegistry` · `Setting` · `AccountActivity` · `*Service`) 와 `backend.routesExport: 'createRoutes'` 는 패키지 안에 실체가 없는 선언 (entity/route 는 api-server 에 있음). AppStore Guard 가 소비하는 metadata 이므로 본 WO 에서는 관찰만 — 별도 정비 대상 후보.
- `ownsTables` 3 (`app_registry` · `settings` · `account_activities`) 의 migration 소유 기준 정비 → RBAC baseline 소유권 WO(5/5).
- 다음 순서: RBAC baseline 테이블 소유권 (`WO-O4O-RBAC-BASELINE-TABLE-MIGRATION-OWNERSHIP-AND-LEGACY-SCHEMA-DECLARATION-CLOSURE-V1`).

**문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건 (manifest exposes/backend 허위 선언 정비 — 기준 문서 아님, 코드 관찰)**
