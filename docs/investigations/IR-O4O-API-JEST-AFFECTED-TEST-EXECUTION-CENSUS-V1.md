# IR-O4O-API-JEST-AFFECTED-TEST-EXECUTION-CENSUS-V1

> **API Jest affected-test 최적화 사전 조사 (조사 전용 · 구현 금지)**
>
> - 상태: **CLOSED — 구현 WO 작성 권고**
> - 조사일: 2026-09-23
> - 기준 baseline: `b4c8a6c9b` (측정 일부는 `6cb6d4789` 시점 · 본문에 명시)
> - read-only 경계 준수: production code 0 · CI workflow 0 · test 삭제/skip 0 · Jest config 0
>   - **예외 1건(사전 보고 후 사용자 승인)**: 조사 중 main 의 API Jest 가 red 인 것을 발견했고, 그중 1건이 직전 WO 에서 **내가 만든 회귀**였다. 사용자 지시("4건 전부 조사 후 보고")에 따라 내 회귀만 수정·push(`b4c8a6c9b`)하고 나머지는 read-only 로 원인만 규명했다. 상세는 §17.

---

## 1. Jest 전체 모집단

### 1-1. 실측 모집단

| 항목 | 값 |
|---|---|
| test suite | **350** |
| test | **5,847** |
| jest config | `apps/api-server/jest.config.cjs` (`roots: ['<rootDir>/src']`, `maxWorkers: 1`, `forceExit: true`) |
| CI 실행 명령 | `cd apps/api-server && npx jest --maxWorkers=1` |

### 1-2. CI 시간 (SSOT — GitHub Actions 실 run)

`ci-pipeline.yml` run 49건 표본 중 **성공 run 23건**만 사용(실패 run 은 조기 종료로 시간이 왜곡된다).

| 구간 | 평균 |
|---|---|
| `API Server Jest` step | **514.2s (8.6분)** |
| `API Server Jest` job 전체 | **614.2s (10.2분)** |
| ├ setup (checkout/pnpm/node) | 28.7s |
| ├ `pnpm --filter '@o4o/api-server^...' run build` | 45.3s |
| └ **고정 오버헤드 소계** | **74.0s** |

> **한계선**: affected 선택이 압축할 수 있는 것은 514s 구간뿐이다. **74s 는 어떤 모델에서도 줄지 않는다.** 따라서 job 시간의 이론적 하한은 `74s + (always-run 집합 시간)` 이다.

### 1-3. 로컬 실행

Windows 로컬에서 `--maxWorkers=1` 은 suite 당 ~90s 로 CI(1.5s/suite) 대비 60배 느려 전수 실행이 불가능했다. `--maxWorkers=6` 으로 **350 suite / 377s wall-clock** 완주했고, **per-suite 시간 합계 2,087s** 를 얻었다.

- **로컬 절대 시간은 SSOT 가 아니다.** CI 514.2s ÷ 로컬 2,087s = **환산계수 K = 0.246** 을 정의하고, 이후 모든 시간 추정은 `로컬 per-suite 시간 × K` 로 환산한다.
- 로컬 실행의 용도는 ① suite 간 **상대 순위** ② 아래 §3 의 **fs trace** 두 가지뿐이다.

---

## 2. Suite 유형별 분류 (정적 census · 중복 태그 허용)

350 suite 전량을 소스 텍스트 기준으로 태깅했다.

| 태그 | suite 수 | 비중 |
|---|---|---|
| A MODULE_DEPENDENCY | 283 | 80.9% |
| E SECURITY_AUTH_CONTRACT | 261 | 74.6% |
| B RAW_SOURCE_CONTRACT | 152 | 43.4% |
| C REPOSITORY_CENSUS | 124 | 35.4% |
| D DATABASE_MIGRATION_CONTRACT | 89 | 25.4% |
| F API_INTEGRATION | 39 | 11.1% |
| H DATA_FIXTURE_CONSUMER | 12 | 3.4% |
| G PURE_UNIT | 2 | 0.6% |
| I GLOBAL_ALWAYS_RUN_CANDIDATE | §11 에서 20 확정 | 5.7% |
| J UNKNOWN | 0 | — |

**판정**: 이 저장소의 API Jest 는 "단위 테스트 모음"이 **아니다.** `src/__tests__` 최상위에만 `.spec.ts` 197 + `.test.ts` 6 이 있고 대부분이 **은퇴·폐기·계약 census spec** 이다. `--findRelatedTests` 단독(= module graph 단독) 선택은 구조적으로 **불가능**하다. 근거는 §3 · §6.

---

## 3. Raw-source consumer census (import graph 로 도달 불가능한 결합)

### 3-1. 방법

정적 문자열 추출은 노이즈가 커서(예: api-server 자신의 `src/services/...` 가 저장소 루트 `services/` 로 오인됨) **ground truth 로 쓰지 않았다.** 대신 jest `setupFilesAfterEach` 를 **scratchpad 에만** 추가해(저장소 config 무변경) `fs.readFileSync / existsSync / readdirSync / statSync / lstatSync / openSync / realpathSync / opendirSync` 및 `fs.promises.*` 를 런타임 계측하고, suite 별 실제 읽은 저장소 상대경로를 JSONL 로 수집했다.

- trace 확보 suite: **346 / 350**
- 추적된 저장소 파일: **13,072개**

### 3-2. 결과

- **`apps/api-server/` 밖 파일을 실제로 읽는 suite: 203개 (58.7%)**

**저장소 광역 스캐너 상위 (읽은 파일 수)**

| 읽은 파일 | suite |
|---:|---|
| 12,129 | `src/__tests__/legacy-wordpress-block-editor-retirement.spec.ts` |
| 11,892 | `src/__tests__/archive-retention-and-tracked-backup-disposition.spec.ts` |
| 10,496 | `src/__tests__/neture-asset-mount-and-dead-package-residue.spec.ts` |
| 9,282 | `src/__tests__/rbac-baseline-table-migration-ownership-legacy-schema-declaration-closure.spec.ts` |
| 7,607 | `src/__tests__/main-site-full-source-deletion.spec.ts` |
| 7,486 | `src/__tests__/platform-core-dead-lifecycle-manifest-appstore-schema-contract-closure.spec.ts` |
| 7,462 | `src/__tests__/auth-core-dead-lifecycle-retired-user-roles-resurrection-closure.spec.ts` |
| 7,332 | `src/__tests__/ecommerce-core-and-commerce-residue-retirement.spec.ts` |
| 6,934 | `src/__tests__/public-appstore-read-retirement.spec.ts` |
| 6,539 | `src/utils/__tests__/business-info-json-column-guard.test.ts` |

읽은 파일 2,000개 초과 suite 는 **20개**이며, 이들은 저장소 거의 전체를 훑으므로 사실상 **always-run** 이다(§11-I).

**외부 루트별 — 그 아래 파일을 읽는 suite 수**

| suite 수 | 루트 |
|---:|---|
| 107 | `packages/security-core` |
| 35 | `packages/capabilities` |
| 34 | `services/web-kpa-society` |
| 34 | `packages/platform-core` |
| 30 | `services/web-k-cosmetics` |
| 30 | `services/web-pharmacy-hub` |
| 30 | `packages/types` |
| 29 | `packages/ai-core` |
| 26 | `apps/admin-dashboard` |
| 25 | `packages/store-ui-core` |
| 23 | `services/web-neture` |
| 17 | `tools/o4o-local-agent` |

**가장 많은 suite 가 읽는 단일 파일 (always-run 신호)**

| suite 수 | 파일 |
|---:|---|
| 174 | `apps/api-server/src/utils/logger.ts` |
| 113 | `apps/api-server/src/database/connection.ts` |
| 96 | `apps/api-server/src/database/entities.ts` |
| 91 | `packages/security-core/src/service-configs.ts` |
| 89 | `packages/security-core/src/index.ts` · `service-scope-guard.ts` · `dist/index.d.ts` |
| 87 | `apps/api-server/src/types/auth.ts` |
| 86 | `apps/api-server/src/database/SnakeNamingStrategy.ts` |

### 3-3. 파급 분포 (핵심 수치)

**저장소 파일 1개를 바꿨을 때 그 파일을 실제로 읽는 suite 수**

| p50 | p75 | p90 | p99 | max |
|---:|---:|---:|---:|---:|
| **8** | 12 | 20 | 27 | 174 (`logger.ts`) |

→ **전형적 변경의 파급은 350 중 8~20 suite.** 절감 여지가 크다는 1차 근거다.

---

## 4. 기존 SSOT(`scripts/ci/detect-affected.mjs`) 확장 가능성

**결론: 신규 detector 불필요. 기존 SSOT 확장으로 충분하다.**

이미 존재하는 재사용 가능한 부품:

| 기존 함수 | affected-jest 에서의 역할 |
|---|---|
| `buildWorkspaceGraph()` · `dependencyClosure()` · `workspaceDirOf()` | 변경 package → API 영향 판정 (findRelatedTests 가 **못 하는** 영역, §6-3) |
| `selectDocsConsumerSpecs(changedFiles, root)` | **이미 `apps/api-server/src` 전체를 재귀 순회하며 각 test 소스에 needle 을 텍스트 매칭하고 `src/<rel>` 경로를 반환한다.** 즉 raw-source selector 의 실체가 이미 SSOT 안에 있다. needle 생성기를 `docs/` 전용에서 일반 경로로 넓히면 그대로 재사용된다 |
| `selectPathGuardSpecs()` | 변경 파일의 workspace dir · dir basename · package name · **모든 상위 경로**를 needle 로 만들어 최상위 spec 을 고른다 — 일반화의 설계 원형이 이미 여기 있다 |
| `classify()` / `GLOBAL_EXACT` / `GLOBAL_PREFIXES` / `NEUTRAL_PREFIXES` | §14 fallback 판정을 **이미 정확히** 수행한다 (§7 의 유일한 false-negative 를 이것이 막는다) |
| `readChangedFiles()` · `parseFileList()` | base SHA 이상 시 `ok:false` → fallback 신호 |

권고: 신규 파일 대신 `detect-affected.mjs` 에 `selectApiJestSpecs(changedFiles, graph, root)` 를 **추가**하고, 새 output `api_jest_specs`(공백 구분 경로 목록) + `api_jest_mode`(`full` | `selected`) 를 노출한다.

---

## 5. 변경 시나리오별 예상 test 집합

집합 정의: `AFFECTED = TRACE(변경파일) ∪ FIND_RELATED(변경파일) ∪ ALWAYS_RUN(20) ∪ 변경된 test 자신`

| # | 시나리오 | 현재 full | affected suite | 전체 대비 | 비고 |
|---|---|---:|---:|---:|---|
| 1 | API 순수 unit source 1파일 | 350 | **50** | 14.3% | raw-source 로 +44 |
| 2 | API route/controller 1파일 | 350 | **27** | 7.7% | raw-source 로 +20 |
| 3 | auth/security source (`auth.middleware.ts`) | 350 | **51** | 14.6% | §10 |
| 3b | `role-assignment.service.ts` | 350 | **82** | 23.4% | §10 |
| 4 | migration 변경(+manifest) | 350 | **23** | 6.6% | §9 |
| 5 | API test-only 변경 | 350 | **21** | 6.0% | **0 이 되지 않는다** (§8) |
| 6 | API 의존 package (`security-core`) | 350 | **100** | 28.6% | findRelatedTests 는 **0** 반환 (§6-3) |
| 6b | API 의존 package (`types`) | 350 | **22** | 6.3% | — |
| 7 | API 무관 frontend package (`store-ui-core`) | 350 | **22** | 6.3% | always-run 하한 근처 |
| 8 | Admin-only source | 350 | — | — | **현재도 `admin_only` 로 Jest skip** — 변화 없음 |
| 9 | docs Markdown | 350 | — | — | **현재도 `docs_fast_eligible` 로 skip** — 변화 없음 |
| 10 | `scripts/` · `.github/` · root config | 350 | **350** | 100% | §14 fallback 강제 (§7 근거) |
| 11 | 혼합 (route + package + docs) | 350 | **101** | 28.9% | 합집합 |
| 12 | `src/utils/logger.ts` (최악) | 350 | **175** | 50.0% | 절감 -22% 에 그침 |
| 13 | `src/database/entities.ts` | 350 | **152** | 43.4% | — |

**always-run 로 반드시 포함되는 20 suite** = §11-I 목록. 이것이 모든 시나리오의 하한(21~22 suite)을 만든다.

---

## 6. `--findRelatedTests` 실측 정확도

### 6-1. UNION 표

| 변경 파일 | FULL | FIND_RELATED | RAW_SOURCE_EXTRA | ALWAYS_RUN | **UNION** | UNION/FULL |
|---|---:|---:|---:|---:|---:|---:|
| `src/modules/neture/utils/product-type.util.ts` | 350 | 5 | **+44** | 20 | 50 | 14.3% |
| `src/controllers/admin/AdminUserController.ts` | 350 | 6 | **+20** | 20 | 27 | 7.7% |
| `src/common/middleware/auth.middleware.ts` | 350 | 27 | **+23** | 20 | 51 | 14.6% |
| `src/database/incremental/manifest.ts` | 350 | 3 | **+19** | 20 | 23 | 6.6% |
| `src/database/entities.ts` | 350 | 123 | **+28** | 20 | 152 | 43.4% |
| `src/modules/auth/services/role-assignment.service.ts` | 350 | 60 | **+21** | 20 | 82 | 23.4% |

### 6-2. findRelatedTests 단독 사용은 불가

모든 표본에서 **raw-source 로만 도달하는 suite 가 19~44개** 존재한다. 단독 사용 시 그만큼이 통째로 false-negative 가 된다.

### 6-3. **치명적 false-negative — workspace 외부 파일**

`jest.config.cjs` 의 `roots` 가 `<rootDir>/src` 로 한정되어 있어, `apps/api-server` **밖** 파일에 대해 `--findRelatedTests` 는 **항상 0 을 반환한다.**

| 변경 파일 | findRelatedTests | 실제 trace |
|---|---:|---:|
| `packages/security-core/src/service-scope-guard.ts` | **0** | **89** |
| `packages/types/src/index.ts` | **0** | 22 |
| `packages/store-ui-core/src/index.ts` | **0** | 11 |
| `apps/admin-dashboard/src/main.tsx` | **0** | 12 |

→ 구현 WO 는 **package 변경을 findRelatedTests 에 맡기면 안 된다.** `dependencyClosure()` + raw-source selector 로만 처리한다. **이것을 §13 불변식으로 고정한다.**

### 6-4. 역방향 비교 주의

`src/database/entities.ts` 는 FIND_RELATED 123 > TRACE 96 이다. jest 가 자체 module registry/graceful-fs 로 읽는 경로가 내 계측보다 앞서 패치되어 trace 가 module 읽기를 **일부 누락**하기 때문이다. 따라서 **trace 는 엄밀한 상위집합이 아니며, 두 축의 UNION 이 반드시 필요하다.**

---

## 7. 대표 commit 재현 (가장 중요)

### 7-1. detector 판정 분포 (최근 260 commit)

| 구분 | 건수 | 비중 |
|---|---:|---:|
| 현재 full API Jest 실행 | **137** | 52.7% |
| `docs_fast_eligible` 로 skip | 122 | 46.9% |
| `admin_only` 로 skip | 1 | 0.4% |

full 실행 137건의 내역:

- `global_or_unknown` **48건** (globals 내역: `scripts` 45 · `.github` 26 · root `pnpm-lock.yaml` 11 · `e2e` 10 — 중복 포함)
- 비-global 89건 — 이 중 api-server 파일을 건드리는 것 76건, 전혀 안 건드리는 것 13건, **api-server test-only 21건**

→ 최적화 가능 모수는 **89건 (전체의 34%)** 이다. 나머지는 이미 skip 되거나 §14 fallback 대상이다.

### 7-2. 실제 실패 run 재현

GitHub Actions 로그 보존 기간 때문에 **실패 suite 이름을 실제로 추출할 수 있었던 run 은 1건**뿐이었다(최근 100 push run 표본). 표본이 얇다는 점을 숨기지 않고 기록한다. 그러나 그 1건이 결정적이다.

| commit | 변경 | 실패 suite | 모델(§14 미적용) 판정 |
|---|---|---|---|
| `00b96bc81` `ci: rebase frontend prebuild dedup on latest main (#215)` | `.github/actions/setup-build-env/action.yml`, `scripts/dev.mjs` (2파일) | `src/__tests__/encryption-key-canonical-rollout.spec.ts` | **FALSE NEGATIVE** — affected 21 suite 안에 없음 |

**원인 규명**: 이 spec 은 저장소 파일을 4개만 읽고, 실제 판정 대상은 **`process.env.ENCRYPTION_KEY`** 다. 즉 **저장소 파일이 아니라 CI 실행 환경에 결합**되어 있다. 변경된 `.github/actions/setup-build-env/action.yml` 이 그 환경을 바꿨고 테스트가 깨졌다. 이 결합은 module graph 로도 raw-source scan 으로도 **원리적으로 탐지 불가능**하다.

**해소**: 같은 commit 에 대해 현행 detector 는 이미 `global_or_unknown: true` 를 반환한다(실측 확인).

```
{ "global_or_unknown": true, "docs_fast": false, "admin_only": false, "api_ci_affected": true }
```

→ **§14 fallback(`global_or_unknown` → full Jest)을 필수로 두면 이 false-negative 는 발생하지 않는다.** 관측된 유일한 false-negative 가 §14 로 정확히 막힌다는 것이 이 IR 의 가장 중요한 실증 근거다.

### 7-3. 판정

- suite 수 절감만으로 성공 판정하지 않았다. **환경 결합이라는 제3의 축**을 실제 실패 사례에서 발견했고, 그것이 §14 의 존재 이유가 되었다.
- 표본이 1건인 것은 한계다. 구현 WO 는 **shadow 기간(§13-7)** 으로 이 표본을 늘려야 한다.

---

## 8. API test-only 변경

- 최근 260 commit 중 **21건**이 api-server test-only 변경이다.
- 모델 적용 시 시나리오 5 결과 **21 suite** — always-run 20 + 변경된 test 자신. **0 으로 붕괴하지 않는다.**
- 불변식: `apps/api-server/src/**` 의 `*.spec.ts` · `*.test.ts` · `**/__tests__/**` 가 변경되면 **그 파일 자신을 무조건 선택 목록에 넣는다.** (§13-2)

---

## 9. Migration 특별군

`src/database/migrations/**` 또는 `src/database/incremental/**` 을 **실제로 읽는 suite 는 32개**다(migrations 31 · incremental 21 · 합집합 32). 주요 항목:

`canonical-database-bootstrap-incremental-migration-separation` · `database-migration-ownership-startup-health-final-closure` · `database-state-classifier-schema-drift-and-connection-log-hardening` · `rbac-baseline-table-migration-ownership-legacy-schema-declaration-closure` · `rbac-account-baseline-snapshot-migration-ownership-closure` · `cms-retired-physical-table-final-drop` · `platform-store-slug-fk-cascade` · `users-timestamp-canonical` · `store-slug-store-id-axis` · `store-owner-backcompat-servicekey` · `unified-store-workspace-handoff` · `media-library-v2` · `business-info-json-column-guard` 외.

**권고 (보수적)**: `apps/api-server/src/database/**` 변경 시 이 **32 suite 를 통째로 always-run** 한다. 시나리오 4 의 23 suite 보다 크지만 여전히 350 대비 9% 이고, migration 은 false-negative 비용이 프로덕션 스키마 사고이므로 여기서 아끼지 않는다.

**주의(별도 WO 대상)**: `unified-store-workspace-handoff.spec.ts:107` 이 `INCREMENTAL_MIGRATIONS` 배열의 **마지막 원소**를 `\]` 앵커로 단언한다. 이 단언은 **앞으로 migration 을 append 할 때마다 깨진다.** 현재 main red 의 원인이기도 하다(§17-3). affected 모델과 무관한 별도 결함이므로 이 IR 에서 고치지 않는다.

---

## 10. Auth / Security 특별군

| suite 수 | 파일 |
|---:|---|
| 91 | `packages/security-core/src/service-configs.ts` |
| 89 | `packages/security-core/src/service-scope-guard.ts` |
| 87 | `apps/api-server/src/types/auth.ts` |
| 49 | `apps/api-server/src/common/middleware/auth.middleware.ts` |

`modules/auth/**` · `routes/auth*` · `packages/security-core/**` 중 하나라도 읽는 suite 의 합집합은 **147개 (42%)** 다.

**권고**: `AUTH_ALWAYS_RUN_SET` 을 **147 전체로 잡지 않는다.** 그러면 절감이 사라진다. 대신

- 변경 경로가 `packages/security-core/**` · `apps/api-server/src/modules/auth/**` · `src/common/middleware/auth*` · `src/types/auth.ts` 중 하나면 → 해당 파일의 trace 소비자 전체(§5 시나리오 3/6 = 51~100 suite)를 선택한다.
- 그 외 변경에서는 auth core regression 최소 집합만 always-run 에 포함한다.
- **이 IR 은 최소 집합의 확정을 하지 않는다.** 확정은 구현 WO 에서 shadow 결과로 한다(§13-7). 근거 없이 숫자를 고정하지 않는다.

---

## 11. 저장소 광역 계약 spec 분할

trace 확보 346 suite 를 읽는 범위로 분할했다.

| 분류 | suite 수 | 의미 |
|---|---:|---|
| **A. `apps/api-server` 내부만 읽음** | **144** | module graph + 내부 raw-source 로 충분 |
| **B. 다른 workspace 코드(`packages`/`services`/`apps`/`tools`)까지 읽음** | **194** | **raw-source selector 필수** |
| **C. `scripts`/`.github`/`e2e`/`config` 를 추가로 읽음** | **7** | 해당 경로 변경에서만 필요 — 단 그 경로는 §14 로 어차피 full |
| **D. `docs` 만 추가로 읽음** | **1** | `src/modules/content-guard/__tests__/liquid-guard.test.ts` |

C 분류 7개: `api-database-readiness-cold-start-gate` · `block-registry-report-untrack` · `canonical-database-bootstrap-incremental-migration-separation` · `database-migration-ownership-startup-health-final-closure` · `deployment-domain-retirement` · `legacy-production-schema-final-closure` · `registry-audit-generator-canonicalization`

### I. ALWAYS_RUN 확정 후보 (20 suite)

읽은 파일 2,000개 초과 = 저장소 거의 전체를 훑는 census spec. 어떤 변경이든 대부분 걸리므로 선택 비용보다 always-run 이 싸다.

`legacy-wordpress-block-editor-retirement` · `archive-retention-and-tracked-backup-disposition` · `neture-asset-mount-and-dead-package-residue` · `rbac-baseline-table-migration-ownership-legacy-schema-declaration-closure` · `main-site-full-source-deletion` · `platform-core-dead-lifecycle-manifest-appstore-schema-contract-closure` · `auth-core-dead-lifecycle-retired-user-roles-resurrection-closure` · `ecommerce-core-and-commerce-residue-retirement` · `public-appstore-read-retirement` · `business-info-json-column-guard` · `b2b-supplier-to-store-order-canonical-contract` · `store-internal-ai-retirement-contract` · `wordpress-compat-field-and-theme-final-disposition` · `unprovisioned-form-and-legacy-app-axis-final-disposition` · `cms-lifecycle-schema-cpt-acf-dead-entity-retirement` · `database-migration-ownership-startup-health-final-closure` · `canonical-database-bootstrap-incremental-migration-separation` · `store-owner-backcompat-servicekey` · `store-slug-store-id-axis` · `users-timestamp-canonical`

이 20개의 실행 시간 합계는 전체의 **20.2% (환산 104s)** 이다. 즉 **always-run 만으로도 job 하한이 178s** 가 된다.

---

## 12. Suite 별 실행 시간

### 12-1. 느린 suite 상위 20 (로컬 per-suite · 비중은 합계 2,087s 대비)

| 시간 | 비중 | suite |
|---:|---:|---|
| 160.1s | 7.7% | `src/__tests__/healthkr-adapter.spec.ts` |
| 117.3s | 5.6% | `src/__tests__/work-agent.spec.ts` |
| 112.5s | 5.4% | `src/__tests__/neture-asset-mount-and-dead-package-residue.spec.ts` |
| 106.3s | 5.1% | `src/__tests__/legacy-wordpress-block-editor-retirement.spec.ts` |
| 105.3s | 5.0% | `src/__tests__/windows-automation-safety.spec.ts` |
| 73.2s | 3.5% | `src/__tests__/work-agent-llm-closure.spec.ts` |
| 66.6s | 3.2% | `src/__tests__/archive-retention-and-tracked-backup-disposition.spec.ts` |
| 60.0s | 2.9% | `src/__tests__/work-target-discovery.spec.ts` |
| 59.6s | 2.9% | `src/__tests__/typeorm-entity-registry-guard.spec.ts` |
| 56.0s | 2.7% | `src/__tests__/cross-session-safe-commit-guard.spec.ts` |
| 55.1s | 2.6% | `src/__tests__/work-agent-recovery-runtime.spec.ts` |
| 43.5s | 2.1% | `src/__tests__/supplier-site-adapter.spec.ts` |
| 40.8s | 2.0% | `src/__tests__/work-agent-visual-fastloop.spec.ts` |
| 34.7s | 1.7% | `src/__tests__/windows-ui-automation.spec.ts` |
| 26.2s | 1.3% | `src/modules/neture/drug-import/__tests__/composer-escape-before-sanitize.test.ts` |
| 26.0s | 1.2% | `src/__tests__/browser-dom-control.spec.ts` |
| 25.6s | 1.2% | `src/__tests__/computer-use.spec.ts` |
| 24.4s | 1.2% | `src/bootstrap/__tests__/product-db-write-authority.test.ts` |
| 21.5s | 1.0% | `src/__tests__/local-agent-runtime.spec.ts` |
| 20.0s | 1.0% | `src/__tests__/cms-lifecycle-schema-cpt-acf-dead-entity-retirement.spec.ts` |

### 12-2. 집중도

| 지표 | 값 |
|---|---|
| 총시간 **50%** 를 차지하는 suite 수 | **13개 (3.7%)** |
| 총시간 **80%** 를 차지하는 suite 수 | **85개 (24.3%)** |
| 중앙값 suite 시간 | 1.80s |
| 평균 suite 시간 | 5.96s |

**해석**: 시간의 절반이 13개 suite 에 몰려 있고, 그 대부분은 **자동화/Work Agent 계열**(`work-agent*`, `windows-*`, `browser-dom-control`, `computer-use`, `local-agent-runtime`, `work-target-discovery`, `supplier-site-adapter`)과 `healthkr-adapter` 다. 이들은 저장소 광역 스캐너가 **아니라** 경로가 뚜렷한 도메인 suite 이므로 **affected 선택으로 정확히 제외된다.** 이것이 절감 효과가 큰 두 번째 이유다.

> 이 IR 은 병렬화·`maxWorkers` 변경을 다루지 않는다(요청 범위 밖).

---

## 13. 모델 A / B / C 비교

| 축 | **A. full vs affected 2단계** | **B. findRelatedTests + raw-source selector + always-run** | **C. 도메인 bucket** |
|---|---|---|---|
| 설명 | 변경이 api-server 안이면 full, 밖이면 skip | 세 축 UNION 으로 spec 목록 산출 | `auth` / `store` / `automation` / `cms` 등 bucket 단위 선택 |
| false-negative 위험 | **낮음**(거의 안 줄임) | **낮음** — 단 §14 fallback 필수(§7 실증) | **높음** — bucket 경계가 사람 판단이라 신규 spec 이 누락됨 |
| 유지보수 비용 | 낮음 | **중간** — needle 생성기 1곳, 신규 spec 자동 포섭 | **높음** — spec 추가마다 bucket 등록 필요, 등록 누락이 곧 미실행 |
| 예상 시간 (job) | 614s → 약 600s (거의 무효) | **614s → p50 182s** | 추정 불가(경계 미정) |
| 기존 detector 재사용성 | `classify()` 만 | **`selectDocsConsumerSpecs` · `selectPathGuardSpecs` · `dependencyClosure` 전부 재사용** | 신규 registry 필요 |
| §3 결과와의 정합 | 무관 | **정합** — 203/346 이 외부 파일을 읽는다는 사실을 정면으로 처리 | 불합 — bucket 이 raw-source 결합을 표현 못 함 |

**권고: 모델 B.** A 는 절감이 없고(최적화 모수 89건 대부분이 api-server 안 변경), C 는 이 저장소의 은퇴·census spec 구조에서 **누락이 침묵으로 나타나** 가장 위험하다.

---

## 14. Full Jest 로 되돌아가야 하는 조건 (fallback · 전부 필수)

아래 중 **하나라도** 해당하면 선택 없이 **full Jest** 를 실행한다.

1. `classify()` 가 `global_or_unknown: true` — `.github/` · `scripts/` · `tools/` · `e2e/` · `config/` · `bundles/` · `.husky/` · `GLOBAL_EXACT` 변경 **(§7 의 유일한 false-negative 를 막는 조건 — 타협 불가)**
2. `readChangedFiles()` 가 `ok: false` (base SHA 이상 · force-push · 최초 commit · shallow clone)
3. root build config 변경 — `tsconfig*.json` · `pnpm-workspace.yaml` · `pnpm-lock.yaml` · root `package.json`
4. **Jest config 변경** — `apps/api-server/jest.config.cjs` · `src/__tests__/setup/**`
5. test framework 계열 의존성 변경 — `jest` · `ts-jest` · `@types/jest` · `supertest` 등
6. `buildWorkspaceGraph()` 실패 또는 workspace manifest 파싱 실패
7. selector 결과 이상 — 빈 목록 / 존재하지 않는 경로 포함 / `FULL × 0.8` 초과 (그럴 바엔 full 이 싸다)
8. 변경 파일 수가 임계치 초과 (대규모 리팩터링 · 대형 merge)
9. 수동 override — commit message `[full-jest]` 또는 workflow_dispatch 입력

---

## 15. 예상 시간

기준: 현재 job **614.2s** / Jest step **514.2s**. 환산계수 K = 0.246, 고정 오버헤드 74s.

### 15-1. 시나리오별

| 시나리오 | suite | Jest 예상 | job 예상 | 절감 |
|---|---:|---:|---:|---:|
| API 순수 unit 1파일 | 50 | 138s | **212s** | -65% |
| route/controller | 27 | 108s | **182s** | -70% |
| auth middleware | 50 | 144s | **218s** | -65% |
| migration + manifest | 22 | 108s | **182s** | -70% |
| API test-only | 21 | 104s | **178s** | -71% |
| `security-core` 변경 | 100 | 154s | **228s** | -63% |
| 무관 frontend package | 22 | 105s | **179s** | -71% |
| `entities.ts` | 97 | 182s | **256s** | -58% |
| **`logger.ts` (최악)** | 175 | 406s | **480s** | **-22%** |
| **always-run 만 (하한)** | 20 | 104s | **178s** | -71% |

### 15-2. 260 commit 표본 전체 적용

| 구분 | 건수 |
|---|---:|
| 현재도 Jest skip (docs_fast/admin_only) | 123 |
| §14 fallback → full 유지 | 48 |
| affected 선택 적용 | **89** |

| 지표 | 값 |
|---|---|
| 현재 API Jest job 총 소요 | **1,402분** |
| 모델 B 적용 후 | **773분** |
| **절감** | **-45%** |

affected 가 적용된 89 commit 의 job 시간 분포: **p25 179s / p50 182s / p75 190s / p90 209s / max 309s** (현재 614s). suite 수 p50 **26** / p90 **57**. **절감률이 20% 미만인 commit 은 0건.**

> 목표 숫자를 맞추려 조정하지 않았다. -45% 는 §14 fallback 48건을 **절감 0 으로 그대로 계산**에 포함한 결과다.

---

## 16. False-negative 위험 정리

| # | 위험 | 실측 근거 | 해소 |
|---|---|---|---|
| R1 | module graph 밖 raw-source 결합 | 표본 전량에서 +19~44 suite | raw-source selector 필수 (§6-1) |
| R2 | **workspace 외부 파일에 대해 findRelatedTests 가 0 반환** | `security-core` 0 vs 실제 89 | `dependencyClosure()` + raw-source 로 처리, findRelatedTests 에 위임 금지 (§6-3) |
| R3 | **CI 환경(env) 결합** — 파일 결합이 전혀 없음 | `encryption-key-canonical-rollout` 실패 (§7-2) | §14-1 global fallback |
| R4 | trace 가 module 읽기를 일부 누락 | `entities.ts` FRT 123 > trace 96 | 두 축 **UNION** 필수 (§6-4) |
| R5 | 신규 spec 이 selector 에 안 잡힘 | — | needle 자동 생성 + `FULL×0.8` 상한 + shadow 기간 |
| R6 | migration append 로 계약 spec 이 깨짐 | `unified-store-workspace-handoff` (§9) | migration 32 suite always-run + 별도 WO 로 앵커 수정 |
| R7 | 실패 run 재현 표본 1건 | Actions 로그 보존 한계 | **shadow 기간 의무화** (§17-2) |

---

## 17. 중지 조건 확인 결과 (보고 전용 · 고치지 않음)

### 17-1. **현재 main 의 API Jest 가 red 다 — 그리고 docs fast path 가 그것을 가리고 있었다**

- 마지막 green: `6d1942b8e`
- 이후 Jest 가 **실제로 실행된** 모든 run 이 failure
- tip `6cb6d4789` 가 green 으로 보였던 이유는 **`docs_fast_eligible` 로 Jest 자체가 skip** 되었기 때문

> **구조적 발견**: `api-tests` 는 `admin_only != 'true' && docs_fast_eligible != 'true'` 일 때만 돈다. 따라서 **docs-only commit 이 연속되면 red 가 green 으로 위장된다.** 이것은 affected 최적화와 무관한 현재 CI 의 결함이며, affected 모델을 도입하면 **skip 범위가 넓어져 이 위장이 더 쉬워진다.** 구현 WO 는 반드시 §13-6(정기 full 실행)을 포함해야 한다.

### 17-2. red 4건 처리 (사용자 지시 "4건 전부 조사 후 보고")

| suite | 원인 | 처리 |
|---|---|---|
| `signage-player-web-deployment-contract.spec.ts` | **내 회귀.** 직전 WO `682c1eea7` 가 `deploy-web-services.yml` 의 `decide()` 헬퍼를 SSOT 로 옮겼는데, 이 spec 이 그 리터럴 텍스트를 단언하고 있었다 | **수정·push (`b4c8a6c9b`)** — 단언 대상을 사라진 구현 세부가 아니라 현재 판정 지점(`detect-affected.mjs` 의 WEB_SERVICES registry)으로 옮겼다. 막는 회귀는 동일. 14/14 PASS |
| `AdminUserController.membershipStatusPreservation.test.ts` | 타 세션 소관 | **타 세션이 `cc87a9385` 로 이미 해결** — 손대지 않음 |
| `AdminUserController.statusPreservation.test.ts` | 동일 | 동일 |
| `unified-store-workspace-handoff.spec.ts:107` | `INCREMENTAL_MIGRATIONS` 배열의 **마지막 원소**를 `\]` 앵커로 단언 → migration append 마다 깨짐 | **read-only 원인 규명만.** 범위 밖이므로 수정하지 않음 → **별도 WO 제안** |

**자기 보고**: 직전 WO 를 완료로 보고할 때 detector 자체 테스트 54건과 deploy workflow run 만 확인했고, **workflow 를 raw text 로 읽는 api-server Jest 를 돌리지 않았으며, 그 push 의 CI Pipeline 결론(`failure`)도 확인하지 않았다.** 이 IR 의 §6·§11 이 정확히 그 실수의 구조적 원인(raw-source 결합)을 다룬다.

### 17-3. 그 밖의 중지 조건

| 조건 | 결과 |
|---|---|
| test 가 production write 수행 | **미발견** |
| 외부 DB·secret 의존 | **발견 — 단 현재 CI 에서 실질 미실행.** `automation-job` · `automation-video-temp-output` · `privacy-retention` · `media-library-v2` 는 `process.env.MEDIA_V2_TEST_PORT === '55439'` 일 때만, `security/terms-acceptance-isolated-pg` · `store-owner-termination.integration` 은 `O4O_ISOLATED_PG_URL` 이 있을 때만 `describe` 가 활성화된다. CI 에는 둘 다 없으므로 **이 6 suite 는 CI 에서 사실상 0 test 를 실행한다.** affected 모델과 무관한 기존 상태이며, 보고만 한다 |
| 테스트 순서 의존 | **미발견** (maxWorkers=1 → 6 변경 후에도 실패 집합 동일) |
| 중대한 undeclared dependency | **발견 = §6-3** (workspace 외부 파일에 findRelatedTests 가 0). 구현 WO 의 핵심 제약으로 반영 |
| 현재 CI 가 테스트를 실제로 누락 | **발견 = §17-1** (docs fast path 가 red 를 가림) |

---

## 18. 구현 권고안

### 18-1. 형태

`scripts/ci/detect-affected.mjs` 에 **추가**한다. 신규 detector 파일을 만들지 않는다.

```
selectApiJestSpecs(changedFiles, graph, root) → { mode: 'full' | 'selected', specs: string[], reason: string }
```

출력 2개를 workflow 에 노출: `api_jest_mode`, `api_jest_specs`.

`ci-pipeline.yml` 의 `api-tests` step 은 `mode === 'selected'` 일 때만 `npx jest --maxWorkers=1 <specs...>` 로, 그 외에는 현행 그대로 실행한다.

### 18-2. 선택 알고리즘

```
if (fallback 조건 §14 중 하나) → mode: 'full'

specs = ALWAYS_RUN(20)
      ∪ MIGRATION_SET(32)          if 변경이 src/database/** 를 포함
      ∪ findRelatedTests(apps/api-server 안 변경 파일만)
      ∪ rawSourceSelect(모든 변경 파일)        // selectDocsConsumerSpecs 일반화
      ∪ 변경된 test 파일 자신
      ∪ dependencyClosure 로 API 영향이 있는 package 의 rawSourceSelect

if (specs.length > FULL * 0.8) → mode: 'full'
```

### 18-3. 단계

1. **Phase 0 — shadow.** selector 를 계산해 log 에만 출력하고 **실행은 계속 full.** 최소 2주 또는 API Jest 실패 5건 축적까지. 각 실패에서 "실패 suite 가 selector 결과 안에 있었는가"를 기록한다. §7 표본 1건 문제를 여기서 해소한다.
2. **Phase 1 — 적용.** shadow 에서 false-negative 0 이 확인되면 `mode: 'selected'` 활성화.
3. **Phase 2 — 정기 full.** main 에 대해 **하루 1회 이상 무조건 full Jest** 를 도는 scheduled run 을 둔다(§17-1 위장 방지). 이것은 Phase 1 과 **동시에** 들어가야 한다.

---

## 19. 구현 WO 가 반드시 지켜야 할 불변식

1. **§14 fallback 9조건은 전부 필수다.** 특히 `global_or_unknown → full` 은 관측된 유일한 false-negative(§7-2)를 막는 유일한 장치다. 절감을 위해 완화하지 않는다.
2. **변경된 test 파일 자신은 무조건 선택한다.** Jest 가 0 suite 로 붕괴하는 경로를 만들지 않는다.
3. **`apps/api-server` 밖 파일을 `--findRelatedTests` 에 넘기지 않는다.** 0 을 반환하므로 조용한 누락이 된다(§6-3). package 변경은 `dependencyClosure()` + raw-source selector 로만 처리한다.
4. **module graph 축과 raw-source 축의 UNION 을 쓴다.** 어느 한쪽도 다른 쪽의 상위집합이 아니다(§6-4).
5. **ALWAYS_RUN(20) 과 MIGRATION_SET(32) 은 하드코딩 목록이 아니라 규칙으로 재계산 가능해야 한다.** 목록을 코드에 박으면 신규 census spec 이 조용히 빠진다.
6. **`specs.length > FULL × 0.8` 이면 full 로 전환한다.** 선택 비용이 이득을 넘는다.
7. **Phase 0 shadow 없이 바로 적용하지 않는다.** false-negative 실증 표본이 §7 기준 1건뿐이다.
8. **정기 full Jest 를 같이 도입한다.** 도입하지 않으면 §17-1 의 red 위장이 악화된다.
9. **test 삭제·skip·`maxWorkers` 변경·병렬화를 이 WO 에 섞지 않는다.**
10. **CI 시간 SSOT 는 GitHub Actions 성공 run 이다.** 로컬 측정치를 성과 근거로 쓰지 않는다.

---

## 20. 별도 WO 제안

| # | 대상 | 내용 |
|---|---|---|
| W1 | `unified-store-workspace-handoff.spec.ts:107` | `INCREMENTAL_MIGRATIONS` 마지막 원소 `\]` 앵커 단언 → migration append 마다 깨진다. 앵커를 "포함" 단언으로 교정 (§9) |
| W2 | `ci-pipeline.yml` | docs fast path 가 red 를 green 으로 위장한다. 정기 full Jest scheduled run 도입 (§17-1) |
| W3 | env-gated integration suite 6종 | `MEDIA_V2_TEST_PORT` · `O4O_ISOLATED_PG_URL` 미설정으로 CI 에서 0 test 실행 중. 실행 여부 판정 필요 (§17-3) |
| W4 | (본 IR 의 후속) | `WO-O4O-API-JEST-AFFECTED-TEST-EXECUTION-V1` — §18 · §19 기준 |

---

## 부록 — 조사 방법의 재현

- 전용 census worktree `C:/tmp/o4o-jest-census` (main 체크아웃 미접촉)
- fs 계측은 scratchpad 의 `instr.cjs` + `jest.instr.cjs` 로만 주입 — **저장소 `jest.config.cjs` 무변경**
- CI 시간·판정은 `gh api` 로 실 run 조회
- detector 판정은 `detect-affected.mjs` 를 직접 import 해 260 commit 에 적용

*Investigated: 2026-09-23*
*Status: CLOSED — 구현 WO 작성 권고*
