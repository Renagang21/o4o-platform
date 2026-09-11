# CHECK-O4O-NETURE-KPA-ASSET-HARDCODING-AND-DEAD-PACKAGE-GENERATED-ARTIFACT-CLOSURE-V1

- **WO**: WO-O4O-NETURE-KPA-ASSET-HARDCODING-AND-DEAD-PACKAGE-GENERATED-ARTIFACT-CLOSURE-V1
- **작업일**: 2026-09-11 ~ 12
- **입력**: `IR-O4O-REPOSITORY-WIDE-DEAD-CODE-AND-LEGACY-SURFACE-CENSUS-V1-PASS2` F02 · F15 · F16 · F17 · F30 · F31 · F34 · F35
- **worktree / branch**: `C:\tmp\o4o-housekeeping` · `work/neture-asset-dead-package-cleanup-v1` (base `427df9413`)
- **커밋**: `4c4f93ecd` (본체) · `2f3b1b263` (배포 후 smoke 가 잡은 두 번째 마운트)
- **schema / migration / production data**: **0 · 0 · 0**

---

## 1. Neture `/assets` 최종 판정

### 1-1. 조사 (§2)

| 축 | 결과 |
|---|---|
| frontend consumer (`web-neture` · tools · e2e · admin) | **0** |
| backend/internal consumer | 0 (마운트 외) |
| test consumer | 0 |
| docs (non-archive) | census IR 2건 · KCos CHECK 2건 — 기록만 |
| 60일 production 요청 | **`Python-urllib` 4건 (09-11 00:25·00:30) = 첫 IR 의 검증 probe** · 실사용 0 |
| Neture business 의미 | **없음** — Neture 는 매장 자료함/스냅샷 축이 없다 (프로덕션 `source_service='neture'` 스냅샷 0) |

### 1-2. 마운트가 둘이었다 — 배포 후 smoke 가 잡은 것

`/api/v1/neture` 에는 라우터가 **4개** 마운트돼 있다(`register-routes.ts:817·833·841·859`).

```text
routes/neture/neture.routes.ts:55      /assets → createAssetSnapshotController      (KPA 전용 · 먼저 등록 → 승자)
modules/neture/neture.routes.ts:219    /assets → createNetureAssetSnapshotController (Neture 전용 · 가려져 있었음)
```

1차 커밋(`4c4f93ecd`)에서 KPA 마운트만 제거하고 배포하자 `/api/v1/neture/assets` 가 **404 가 아니라 500** 이었다.
가려져 있던 Neture 전용 컨트롤러가 처음으로 도달 가능해졌는데, `resolveNetureOrgId` 가
`neture_suppliers."userId"` 를 조회한다 — 실제 컬럼은 `user_id`(`NetureSupplier.entity.ts:189`).
**생성 이후 한 번도 동작한 적 없는 잠재 결함**이었다.

WO 원칙(대체 기능 신규 구현 금지 · KPA snapshot 승격 금지)대로 **고치지 않고 마운트를 닫았다**(`2f3b1b263`).
orphan 이 된 `neture-asset-snapshot.controller.ts` · `NetureAssetResolver` 도 제거(참조 0).

```text
NETURE KPA-HARDCODED /assets = REMOVED   (+ 잠재 결함 Neture 전용 /assets 도 REMOVED → 의도된 404)
```

---

## 2. dead package 재실측 (§3)

| 패키지 | import | pkg dep | CI/config | manifest | 보호 spec | 판정 |
|---|:---:|:---:|:---:|:---:|:---:|---|
| `apps/forum-api` | 0 | 0 | 0 | — | 0 | **제거** (2025-12 이후 미변경 · api-server `/api/v1/forum` 이 대체) |
| `apps/forum-web` | 0 | 0 | 0 | — | 0 | **제거** |
| `apps/mobile-app` (android/.gitignore 1파일) | 0 | 0 | 0 | — | 0 | **제거** |
| `packages/partner-core` | 0 | 0 | root script 1 | ✓ | **2 spec 보호** | **STOP** |
| `packages/financial-core` | 0 | 0 | 0 | — | **1 spec 보호** | **STOP** |
| `packages/forum-cosmetics` | 0 | 0 | 0 | ✓ | manifest 12 고정 | **STOP** |
| `packages/organization-lms` | 0 | 0 | 0 | ✓ | manifest 12 고정 | **STOP** |
| `packages/api-types` | **1** (`scripts/generators/openapi-types-generator.ts` 출력 대상) | 0 | 2 | — | — | **dead 아님** — PASS2 과탐 정정 |
| `packages/organization-forum` | 0 | api-server 1 | `deploy-api.yml` build | ✓ | — | 범위 밖 (dependency+CI 변경 필요) |
| `packages/operator-core` | 0 | 3 services | `ci-pipeline.yml` | — | — | 범위 밖 (동일) |

### 2-1. STOP 4개 — 첫 제거 시도가 정확히 잡혔다

처음엔 import 0 인 4개 패키지를 함께 제거했다. 전체 suite 가 **선행 마감 WO 의 raw-source 보호 spec 4 suite** 로 즉시 막았다:

```text
partnerops-registry-and-lint-gate-final-closure.spec   "packages/partner-core 는 그대로 존재한다"
auth-runtime-and-legacy-package-final-closure.spec     "packages/partner-core 는 그대로 남아 있다 (§9 보호 대상)"
ecommerce-core-and-commerce-residue-retirement.spec    "packages/financial-core 가 유지된다"
app-management-runtime-residue-retirement.spec         "packages 하위 manifest.ts 는 12개로 유지된다 (CI AppStore Guard 소비)"
```

`ci-appstore-guard.yml` 이 `packages/**/manifest.ts` 와 `appsCatalog.ts` 를 짝으로 검사한다 —
내 census 는 패키지 **이름**으로만 CI 를 찾아 manifest **glob** 소비를 놓쳤다. WO 중지 조건 2·4 에 해당해 **4개 전부 원복**했다.
이 4개는 app catalog 은퇴 판단(`appsCatalog.ts` 엔트리 · `ecommerce-core` 선례)이 선행돼야 한다.

---

## 3. tracked generated artifacts (§5·§6)

| 위치 | 파일 | 판정 | 근거 |
|---|---|---|---|
| `packages/forum-core/src/**` | **32** (`.js/.d.ts/.map`) | GENERATED_TRACKED_RESIDUE → 제거 | `outDir=dist` · `exports` 전부 `dist/` · `allowJs` 없음 · 모든 `.js` 에 `.ts` 형제 |
| ↳ `ForumTag.js` | 1 (위에 포함) | stale 산출물 → 제거 | 소스 `.ts` 없음 · 참조는 같은 산출물(`manifest.js`/`index.js`/`index.d.ts`) 안에만 · 소스 `index.ts`/`manifest.ts` 는 ForumTag 미참조 |
| `packages/auth-client/src/**` | **28** | GENERATED_TRACKED_RESIDUE → 제거 | 동일 |
| `apps/admin-dashboard/public/mockServiceWorker.js` | 1 | 제거 | `msw` import 0 |
| `tools/o4o-chrome-extension/src/*.js` | 7 | ACTIVE_SOURCE | 확장 프로그램 JS 소스 |
| `packages/utils/src/tailwind-merge.d.ts` | 1 | ACTIVE_SOURCE | 수기 타입 shim |

`.gitignore` 에 `@o4o/types` 선례(`.gitignore:64-69`)와 같은 형태로 두 패키지 경로를 차단했다.

```text
TRACKED GENERATED RESIDUE = ZERO (예외: 위 ACTIVE_SOURCE 8 — 산출물 아님)
```

---

## 4. before / after

```text
tracked files   27,945 → 27,845 (-100)   [산출물 62 + 앱 38 + msw 1 삭제 · spec 1 추가]   (4c4f93ecd)
                         → 27,843 (-2)    [orphan controller · resolver]                     (2f3b1b263)
pnpm-lock       forum-api / forum-web importer 제거 · @types/node peer-key 재라벨 (버전 상승 0) · --frozen-lockfile 통과
root package.json  무변경 (build:partner-packages 는 partner-core 원복과 함께 원복)
```

---

## 5. 검증

| 항목 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | OK |
| `pnpm run build:packages` | OK |
| `pnpm run type-check:frontend` | OK (6) |
| api-server `tsc --noEmit` | PASS (2회) |
| 신규 spec `neture-asset-mount-and-dead-package-residue` | **12/12** — KPA/Neture 두 마운트 0 · 제거 앱 import/dep 0 · 보호 4패키지 존재 · src 산출물 0 · .gitignore · KPA `/assets` 유지 |
| 보호 spec 4 suite (원복 후) | **135/135** |
| multi-tenant appstore | 75/75 |
| CI 가 돌리는 package vitest (ui/auth-utils/auth-react/store-ui-core) | 145/145 |
| literal consumer (`check-literal-consumers --source routes/neture/neture.routes.ts`) | RAW_SOURCE 2 — 둘 다 `/assets` 무관(하나는 `/store-assets` 부재 단언) |
| lint-ratchet | 45 ≤ 51 |
| 전체 api-server suite | 원복 전 실행에서 보호 spec 4 suite 실패 → 원복 후 개별 PASS. 기지 baseline 실패(local-agent/AI 3건)는 본 변경 무관 |

### 5-1. CI

| SHA | CI Pipeline | CodeQL | Deploy API | Deploy Web/Admin | E2E Auth Runtime |
|---|---|---|---|---|---|
| `4c4f93ecd` | success | success | success | success | **failure — 기존** (`E2E_*_ADMIN_*` secret 미설정, 08-27 이후 매 실행 동일 · `packages/auth-client/**` path 트리거) |
| `2f3b1b263` | **success** | success | success | — (api 만) | — |

---

## 6. production smoke (§12) — `2f3b1b263` 배포 후 · 동일 계정(3서비스 조직 + Neture 공급자 조직 보유)

| # | 확인 | 결과 |
|---|---|---|
| 1 | `GET /neture/assets?type=signage` (auth) | **404** — 의도된 404 (1차 배포에선 500 이었음 · §1-2) |
| 2 | `GET /neture/assets` (unauth) | **404** (1차 배포 전엔 401 = 마운트 존재 증거) |
| 3 | `/neture/supplier/copilot/kpi` · `/neture/supplier/partner-commissions` | 200 · 200 |
| 4 | `/neture/store-playlists` · `/neture/event-offers` | 200 · 200 |
| 5 | KPA `/kpa/assets` · KCos `/cosmetics/assets` · PH `/store-owner/library` | 200 · 200 · 200 |
| 6 | `/health` | 200 |

smoke 중 관측한 무관 결함: `GET /neture/supplier/products?limit=1` → 500
(`NetureOfferService.getSupplierProductsPaginated` "cannot get array length of a non-array"). 본 변경이 손대지 않은 경로 — §7 로 보고.

---

## 7. 남긴 STOP 항목

| 항목 | 사유 |
|---|---|
| `packages/partner-core` · `financial-core` | 선행 WO 보호 spec (§2-1) |
| `packages/forum-cosmetics` · `organization-lms` | CI AppStore Guard manifest 12 고정 · `appsCatalog` 엔트리 |
| `packages/organization-forum` · `operator-core` | import 0 이나 dependency·CI 변경 필요 |
| `apps/page-generator` · `services/web-account` · `@o4o/auth-core` | WO §4 제외 |
| `neture/supplier/products` 500 (`getSupplierProductsPaginated`: "cannot get array length of a non-array") | smoke 중 관측 · 본 변경 무관 경로 · 7일 로그에 동일 오류 1건(내 probe) — 별도 조사 대상 |

---

## 8. 완료 조건

```text
NETURE KPA-HARDCODED /assets      = REMOVED
NETURE ACTIVE REGRESSION          = PASS (§6)
DEAD PACKAGES                     = REMOVED (앱 3) / STOP (패키지 4 · 보호 계약)
TRACKED GENERATED RESIDUE         = ZERO / EXCEPTIONS_RECORDED (ACTIVE_SOURCE 8)
AUTH-CLIENT GENERATED RESIDUE     = CLOSED (28)
FORUM-CORE GENERATED RESIDUE      = CLOSED (32 · ForumTag.js 포함)
BROKEN PACKAGE EXPORTS            = 0
ACTIVE CONSUMERS OF REMOVED CODE  = 0
SCHEMA CHANGE                     = 0
PRODUCTION DATA CHANGE            = 0
OTHER SERVICE REGRESSION          = PASS (KPA/KCos/PH API 200)
CI                                = SUCCESS (4c4f93ecd · 2f3b1b263)
```

---

## 9. 문서 정합

```text
문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```

발견 1: PASS2 IR F35 가 `@o4o/api-types` 를 DEAD_PACKAGE 로 분류했으나 codegen 출력 대상(ACTIVE)이다 — 기록물(`docs/investigations/`)이라 본문을 고치지 않고 여기 정정한다.
