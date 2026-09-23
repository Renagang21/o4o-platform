# CHECK · O4O API Jest affected test execution — Phase 0 Shadow

> **WO**: `WO-O4O-API-JEST-AFFECTED-TEST-EXECUTION-PHASE0-SHADOW-V1`
> **선행 IR**: [`IR-O4O-API-JEST-AFFECTED-TEST-EXECUTION-CENSUS-V1`](../investigations/IR-O4O-API-JEST-AFFECTED-TEST-EXECUTION-CENSUS-V1.md)
> **상태**: Phase 0 (shadow) 구현 완료 · **구현 검증 미완(§13-4 ②)** · **Phase 1 미적용**
> **작성일**: 2026-09-23 · 최종 갱신: 2026-09-23 (§13-4 실 Actions 검증 4항목 판정)

---

## 0. 한 줄 요약

API Jest affected selector 를 구현해 **CI 로그·artifact 로만** 남기는 shadow 모드를 켰다.
**실제 Jest 실행 범위는 전혀 줄이지 않았다** — `api-tests` 는 계속 `npx jest --maxWorkers=1`
전체를 돌린다. 함께 정기(일 1회) full API Jest workflow 를 추가했다.

---

## 1. §4 — W1 (migration append 취약 단언) 상태

| 항목 | 결과 |
|---|---|
| 대상 | `apps/api-server/src/__tests__/unified-store-workspace-handoff.spec.ts` |
| 본 세션의 수정 | **없음** |
| 실제 처리 | **다른 세션이 `cc87a9385` 에서 이미 교정**했다 |
| 교정 내용 | 목록 끝 고정(`\]` 앵커) → `CreateStoreOwnerTerminationCases…, AlterHandoffTokensTargetWorkspace…,` **직후 관계**만 고정 |
| 의미 약화 여부 | 없음 — canonical migration 등록과 `expected-schema-states` lockstep 을 계속 검증한다 |

> 본 WO 가 W1 을 선행 조건으로 둔 이유(full baseline 이 red 면 shadow 를 평가할 수 없다)는
> 그대로 충족됐다. 다만 **그 수정은 이 세션의 산출물이 아니다.**

## 2. §4 — full Jest baseline

| 시점 | 결과 |
|---|---|
| `ce79a97b7` (작업 시작) | **347 passed / 4 skipped / 0 failed**, 5,829 tests, 368.11s (로컬 `--maxWorkers=6`) |
| 본 WO 변경 적용 후 | **347 passed / 4 skipped / 0 failed**, 5,829 tests, 191.45s |

IR 조사 시점에 red 였던 4 suite 는 전부 PASS 로 회복돼 있었다.

---

## 3. §5 — selector 위치

신규 detector 파일을 만들지 않았다. SSOT `scripts/ci/detect-affected.mjs` 를 확장했다.

신규 export:

| 함수 | 역할 |
|---|---|
| `listApiJestSpecs(root)` | api-server 의 spec 을 **열거**한다 (목록 하드코딩 없음) |
| `deriveAlwaysRunSpecs(specs)` | ALWAYS_RUN 을 **규칙**으로 도출 |
| `deriveMigrationSpecs(specs)` | MIGRATION 특별군을 **규칙**으로 도출 |
| `deriveRouteInventorySpecs(specs)` / `touchesApiRoutes()` | route inventory 축 |
| `apiJestNeedles()` / `apiJestNeedleMatches()` / `selectApiJestRawSourceSpecs()` | raw-source 축 |
| `buildApiSourceImportGraph()` / `staticImportApiJestSpecs()` | api-server 내부 **정적** import graph 축 |
| `apiImporterFilesFor()` / `reverseWorkspaceClosure()` | cross-workspace import bridge |
| `findRelatedApiJestSpecs()` | jest 런타임 module graph 축 |
| `changedApiJestSpecs()` | 변경된 test 자신 |
| `apiJestFullFallbackReason()` | §12 mandatory full 조건 |
| `selectApiJestSpecs()` | 위 전부의 **합집합** → `{ mode, specs, reason, components }` |

CLI: `node scripts/ci/detect-affected.mjs --mode=api-jest` → JSON.
GITHUB_OUTPUT: `api_jest_mode` · `api_jest_specs` · `api_jest_reason`.

## 4. §6 — 실제로 구현된 모델 (WO 대비 **확장**)

WO §6 의 6 축에 더해 **2 축을 추가**했다. 추가하지 않으면 false-negative 가 남았기 때문이다.

```
SELECTED = ALWAYS_RUN
         ∪ MIGRATION_SET               (src/database/** 변경 시)
         ∪ ROUTE_INVENTORY             (★추가 — routes/controllers/bootstrap 변경 시)
         ∪ STATIC_IMPORT_CLOSURE       (★추가 — api-server 내부 정적 import 역폐포)
         ∪ FIND_RELATED                (api-server 내부 + workspace bridge/anchor 대상)
         ∪ RAW_SOURCE
         ∪ CHANGED_TEST_ITSELF
```

추가 근거(둘 다 260 commit 재현에서 **실제로 관측된 누락**):

- **STATIC_IMPORT_CLOSURE** — `jest --findRelatedTests` 는 **런타임** module graph 라서
  `import type` 으로만 이어진 의존을 보지 못한다(타입은 컴파일 시 지워진다).
  `product-promotion.types.ts` · `product-type.util.ts` 변경이 정확히 이 이유로
  16 개 suite 를 놓쳤다. ts-jest 는 타입을 검사하므로 이 결합은 실제로 깨질 수 있다.
- **ROUTE_INVENTORY** — `admin-api-guard-inventory.spec.ts` 는 route 등록 파일을 읽고
  거기서 얻은 경로를 `existsSync` 로 따라간다. 파일 이름으로는 결합을 알 수 없어
  5 개 commit 에서 누락됐다.

또 raw-source needle 매칭을 **세그먼트 분해 형태**까지 확장했다. contract spec 들은
경로를 통째로 쓰지 않고 `path.join(SRC, 'modules', 'deployment')` 처럼 쪼개서 쓴다.
이 한 가지로 누락 commit 이 14 → 8 로 줄었다.

> `false positive 는 허용, false negative 는 불허` 원칙에 따라 전부 **덧셈**이다.
> 어느 축도 다른 축을 대체하지 않는다.

## 5. §10 — ALWAYS_RUN 도출 (**WO 문구와 다른 선택**)

WO §10 은 "IR 에서 확인된 20 개와 selector 산출 결과가 **정확히 일치**하는지" 를 요구했다.
**그렇게 하지 않았다.** 대신 규칙 도출 결과(**57 개**)가 그 20 개를 **포함**하는지를 고정했다.

- 규칙: **디렉터리를 열거하거나 workspace manifest 를 읽는 spec 은 언제나 돈다.**
  (`readdirSync` · `globSync` · `fast-glob` · `ls-files` · `pnpm-lock.yaml` · `pnpm-workspace.yaml`)
- 정확히 20 개로 맞추려면 파일 목록을 박아야 하는데, 그러면 WO §10 의 본래 요구
  ("신규 광역 census spec 이 조용히 누락되지 않는 구조를 우선한다") 와 충돌한다.
- 비용: job 하한 257s (하드코딩 20 개였다면 178s). 현재 614s 대비 -58%.

**이 편차는 사용자 판단 대상이다.**

## 6. §11 — MIGRATION 특별군

`src/database/**` 를 실제로 읽는 suite 는 runtime 계측상 **139** 개다.

| 축 | 수 |
|---|---|
| raw-text 규칙 (`deriveMigrationSpecs`) | 93 |
| findRelatedTests anchor (`entities.ts` · `data-source.ts` · `connection.ts`) | 123 |
| ALWAYS_RUN | 57 |
| **UNION 의 실측 누락** | **0 / 139** |

개별 migration 파일은 아무도 import 하지 않아 findRelatedTests 가 0 을 낸다.
그래서 schema anchor 3 개를 findRelatedTests 대상에 **추가로** 넘긴다.

## 7. §12 — mandatory full fallback

| 조건 | 구현 |
|---|---|
| global_or_unknown | `classify()` 판정을 그대로 신뢰 (`.github/**` `scripts/**` `tools/**` `e2e/**` `config/**` `bundles/**` `.husky/**` 완화 없음) |
| changed files 수집 실패 / base SHA 이상 · all-zero · force-push | `read.ok === false` → full |
| root build config (`package.json` · `turbo.json` · `pnpm-workspace.yaml`) | `API_JEST_ROOT_BUILD_EXACT` |
| `pnpm-lock.yaml` | 동상 (+ 기존 global 판정에도 걸린다) |
| root `tsconfig*.json` | `API_JEST_ROOT_TSCONFIG` |
| Jest config · setup | `API_JEST_CONFIG_EXACT` · `API_JEST_SETUP_PREFIX` |
| test framework dependency | `apiJestFrameworkDepChanged()` (파싱 실패 = full) |
| workspace graph 실패 · manifest parse 실패 | `fullCount === 0` → full |
| selector result 이상 (미지 경로 · 0 건) | full |
| selected > full 의 80% | `API_JEST_SELECTED_RATIO_LIMIT = 0.8` |
| 대규모 변경 | `API_JEST_LARGE_CHANGE_THRESHOLD = 200` |
| manual full override | §13 |

## 8. §13 — manual override (축 하나)

`workflow_dispatch` 입력 `full_jest` **하나만** 뒀다 (`FULL_JEST=true` → 무조건 full).
commit convention(`[full-jest]`)은 채택하지 않았다.

## 9. §14 · §15 · §16 — shadow step 과 artifact

`.github/workflows/ci-pipeline.yml` 의 `api-tests` 에 step 2 개를 **추가만** 했다.

- `Calculate API Jest affected set (shadow)` — `continue-on-error: true`.
  selector 실패가 Jest gate 를 깨뜨리지 않는다.
  로그: mode · reason · changed files 수 · components(findRelated / staticImport /
  routeInventory / importerBridge / rawSource / alwaysRun / migration / changedTests) ·
  selected / full · 비율 · spec 경로 전체.
- `Upload API Jest shadow selection` — `shadow/api-jest-shadow.json`, 보존 30 일.
  필드: `baseSha` `headSha` `mode` `reason` `changedFiles` `fullSuiteCount`
  `selectedSuiteCount` `components` `specs`.

full 이 실패하면 그 실패 suite 이름을 artifact 의 `specs` 와 대조하면 된다.
별도 failure parser 시스템은 만들지 않았다(§16).

기존 full Jest 실행 step 은 **문자 그대로 그대로다**: `cd apps/api-server && npx jest --maxWorkers=1`.

## 10. §17 · §18 · §19 — 정기 full Jest

`.github/workflows/scheduled-api-full-jest.yml` (신규).

- `schedule: 0 18 * * *` (03:00 KST) + `workflow_dispatch`
- `ref: main`, checkout → setup → `pnpm --filter '@o4o/api-server^...' run build` → full Jest
- Docker · Cloud Run · migration Job 과 **연결하지 않는다** (회귀 테스트 J18 이 고정)
- 일반 push 의 docs/admin fast path 는 **손대지 않았다** (별도 workflow)

## 11. §20 · §21 — Phase 1 전환 조건 (미충족 · 대기)

- 최소 2 주 shadow **또는** API full Jest failure 5 건 이상 관측
- 그 기간의 **shadow false-negative = 0**
- 사용자의 명시적 Phase 1 승인

**아직 아무것도 충족되지 않았다. selected 실행은 켜지 않았다.**

여기에 더해 **Phase 0 구현 검증 자체가 아직 닫히지 않았다** — §13-4 ②
(`mode=selected` 실작동)가 PENDING 이다. 관측 시작점은 run `35831578605`
(2026-09-23 07:24:53Z)이고, 현재까지 유효 shadow run 4건은 전부 정당한 full 이다.

## 12. §22 — detector 회귀 테스트

`scripts/ci/__tests__/detect-affected.test.mjs` 에 **J1~J18** 추가. 기존 54 개 전부 유지.

```
# tests 72   # pass 72   # fail 0
```

J17 은 "workflow 가 selector 출력을 jest 인자로 쓰지 않는다" 를 고정한다 —
Phase 0 계약이 코드로 깨지는 것을 막는다.

## 13. 검증 결과

### 13-1. 260 commit 표본 재현 (ground truth = runtime fs 계측 역인덱스)

| 항목 | 값 |
|---|---|
| 표본 | 260 commit |
| 현재도 Jest skip | 123 |
| mandatory full fallback | 51 |
| selected | 86 |
| **false-negative 발생 commit** | **0 / 86** |
| selected suite 수 | p50 91 · p90 204 · max 226 (전체 351) |

축을 추가하기 전 중간 측정: 14 → 8 → **0**.

### 13-2. 기대 절감 (IR §7 의 CI 환산 계수 K=0.246, 고정 overhead 74s)

| 항목 | 값 |
|---|---|
| 현재 API Jest job 총 시간 (표본) | 1,402 분 |
| 모델 B 적용 시 | 1,000 분 (**-29%**) |
| selected commit 의 job 시간 (현재 614s) | p25 264s · p50 292s · p75 424s · p90 456s |
| ALWAYS_RUN job 하한 | 257s |

> **IR 의 -45% 와 다르다.** IR 추정은 false-negative 를 남긴 selector 기준이었다.
> 누락 0 을 만들기 위해 축 2 개와 세그먼트 매칭을 추가하면서 선택 집합이 커졌고,
> 절감은 **-45% → -29%** 로 줄었다. 이 수치가 실측이다.

### 13-3. 로컬 검증

| 검증 | 결과 |
|---|---|
| `node --test scripts/ci/__tests__/detect-affected.test.mjs` | 72/72 PASS |
| `ci-pipeline.yml` YAML parse | OK |
| api-server full Jest (변경 적용 후) | **347 passed / 4 skipped / 0 failed** — 신규 workflow 파일이 어떤 census spec 도 깨뜨리지 않았다 |

### 13-4. 실제 GitHub Actions 검증 (§25)

#### 판정 요약 (2026-09-23 12:20 UTC 기준)

| # | 항목 | 판정 | 근거 |
|---|---|---|---|
| ① | base SHA 조회 · `git diff` 성공 · 변경 파일 탐지 | **PASS** | 수정 이후 shadow run 4건 전부 `changedFiles` 실제 수집 (2 / 302 / 194 / 194) — 아래 C |
| ② | **`mode=selected` 실작동 · `selectedSuiteCount > 0`** | **PENDING** | 수정 이후 shadow run 4건이 **전부 정당한 `global_or_unknown`** — 아래 D |
| ③ | artifact 보존 | **PASS** | `api-jest-shadow-<run>-<attempt>` 4건 업로드·미만료(30일) — 아래 C |
| ④ | full Jest green (Phase 0 불변식) | **PASS** | run `35856452802`: `cd apps/api-server && npx jest --maxWorkers=1` → 350 passed / 4 skipped, 6,010 tests |

> **②가 로그·artifact로 입증되기 전에는 Phase 0 구현 검증 완료가 아니다.**
> 수치를 만들기 위한 인위적 `api-server` 변경, detector·fast path·Jest 명령 수정은
> 하지 않았다(§28). 다음 정상 `api-server` 변경 run 에서 아래 E 절차로 바로 판정한다.

#### Scheduled API Full Jest — run `35829209575`

| 항목 | 결과 |
|---|---|
| 기동 방식 | **workflow_dispatch (수동)** |
| 명령 | `cd apps/api-server && npx jest --maxWorkers=1` (선별 없음) |
| 결과 | **347 passed / 4 skipped / 0 failed**, 5,829 tests, Jest step 553.4s |
| Docker · gcloud · migration 연결 | 없음 (§18 준수) |

> **상태 구분**: `cron configured` / `dispatch verified` /
> **`first scheduled event pending`** (첫 03:00 KST 실기동 미확인).
> 수동 dispatch 성공은 **cron 이 동작했다는 증거가 아니다.**

2026-09-23 12:17 UTC 재확인 — `scheduled-api-full-jest.yml` 의 run 은 여전히
`35829209575` **1건뿐이고 event 는 `workflow_dispatch`** 다. `schedule` event run 0건.
cron 은 `0 18 * * *`(= 03:00 KST)이고 workflow 는 같은 날 06:57 UTC 에 생겼으므로
첫 예정 시각은 **2026-09-23 18:00 UTC** 다. 그 이후 다음으로 확인한다.

```bash
gh api "repos/:owner/:repo/actions/workflows/scheduled-api-full-jest.yml/runs?per_page=10" \
  -q '.workflow_runs[]|[.id,.event,(.conclusion//.status),.created_at]|@tsv'
# event == "schedule" 인 run 이 나타나고 conclusion == success 여야 PASS
```

> GitHub 의 schedule 은 러너 혼잡 시 지연·건너뜀이 있다. **한 번의 미기동으로 결함이라고
> 판정하지 않는다** — 연속 2회 이상 누락일 때 조사한다.

#### CI Pipeline — run `35829135129` (commit `257be3cfe`)

| 항목 | 결과 |
|---|---|
| job `API Server Jest` | success |
| shadow step 실행 | 됨 (`continue-on-error` 발동 없음) |
| shadow 출력 | `mode=full` / `reason=변경 파일 수집 실패 — git diff 실패 (fatal: bad object f651885ed…)` / `0 / 351` |
| 실제 Jest 실행 | **347 passed / 4 skipped / 0 failed** — full 유지 (§3 불변식 지켜짐) |
| Docs Fast · Admin Fast | skipped (§19 비회귀) |

> **이 run 은 shadow 관측 데이터로는 무효다.**
> safe fallback(수집 실패 → full) 과 Phase 0 불변식(실제 Jest 가 full) 은 실증됐지만,
> selector 가 변경 파일을 보지 못했으므로 false-negative 판정 근거가 아니다.

**원인** — selector 로직이 아니라 `api-tests` job 의 **shallow checkout** 이다.
`detect` · `docs-fast-validate` · `admin-fast-guards` 는 `fetch-depth: 0` 을 쓰지만
`api-tests` 만 기본값(depth 1)이어서 base SHA object 가 없었다.

**조치** — `api-tests` checkout 에 `fetch-depth: 0` 한 줄 추가. 기존 세 job 과 동일 기준이며
detector 로직 · Jest 명령 · fast path 는 건드리지 않았다.

#### 관측 시작일 기준

§20 의 **최소 2주 shadow 관측은 위 조치 이후 최초의 유효한 shadow run**
(= `mode` 와 `components` 가 실제 변경 파일에서 산출된 run) 시점부터 센다.
`35829135129` 은 그 시작점이 아니다.

**관측 시작점 = run `35831578605`** (commit `84cf13f22`, push, 2026-09-23 07:24:53Z).
이 run 부터 `changedFiles` 가 실제로 수집됐다. `mode=full` 이지만 그것은 수집 실패가
아니라 **정당하게 계산된 판정**(`.github/workflows/ci-pipeline.yml` → global)이므로
유효한 관측이다.

#### C. 수정(`84cf13f22`) 이후 shadow run 전수

| run | commit | event | changedFiles | mode | reason | selected/full | artifact |
|---|---|---|---|---|---|---|---|
| `35831578605` | `84cf13f22` | push | 2 | full | `global_or_unknown` | 0 / 351 | `api-jest-shadow-35831578605-1` ✅ |
| `35832189915` | `6cc5fa58a` (PR #225) | pull_request | 302 | full | `global_or_unknown` | 0 / 354 | `api-jest-shadow-35832189915-1` ✅ |
| `35855595547` | `9a3b402b9` | push | 194 | full | `global_or_unknown` | 0 / 354 | `api-jest-shadow-35855595547-1` ✅ |
| `35856452802` | `9a3b402b9` | push | 194 | full | `global_or_unknown` | 0 / 354 | `api-jest-shadow-35856452802-1` ✅ |

각 run 이 global 로 떨어진 **실제 유발 경로**:

```text
35831578605  .github/workflows/ci-pipeline.yml
35832189915  .github/workflows/{ci-pipeline,ci-security,deploy-api,deploy-web-services,
             scheduled-api-full-jest}.yml · pnpm-lock.yaml · scripts/ci/detect-affected.mjs
             · scripts/ci/__tests__/detect-affected.test.mjs
35855595547  pnpm-lock.yaml
35856452802  pnpm-lock.yaml
```

즉 **선별기 결함이 아니라 설계된 mandatory full fallback(§12)** 이 정확히 동작한 결과다.

`35856452802` 의 로그 실측 (job `API Server Jest`):

```text
--- API Jest affected (SHADOW — 실행에는 영향 없음) ---
mode                : full
reason              : global_or_unknown — 전역/미분류 경로 변경
changed files       : 194
components          : {"fullSuiteCount":354,"findRelated":0,...,"alwaysRun":58,...}
selected / full     : 0 / 354 (0.0%)
...
Run cd apps/api-server && npx jest --maxWorkers=1
Test Suites: 4 skipped, 350 passed, 350 of 354 total
Tests:       32 skipped, 5978 passed, 6010 total
```

#### D. ② 가 아직 PENDING 인 이유

수정 이후 main 에 들어온 변경이 다음 셋 중 하나였다.

1. **docs-only** (`bc9174099` · `5db20bd0a` · `59db724e4`) → docs fast path, `api-tests` 자체가 skip → shadow artifact 없음
2. **전역 경로 동반** (위 C 4건) → `global_or_unknown` → `mode=full`
3. **적합했으나 run 이 취소됨** — 아래

**놓친 적합 후보**: commit `209efd3ff`
(`apps/api-server/src/__tests__/store-internal-ai-retirement-contract.spec.ts` 단일 파일, +54).
run `35856123023` 은 **job 이 하나도 시작하기 전에 cancelled** 됐다
(11:42:44 생성 → 11:43:37 취소, jobs 0건). 같은 구간에 `35856206653`(`b82a88120`) ·
`35856224124`(`7d17a1533`) 도 취소됐다. 세 건 모두 push event 이고 해당 트리의
`cancel-in-progress` 는 이미 `${{ github.event_name == 'pull_request' }}`(= push 는 false)
이므로 **concurrency 자동 취소가 아니다.** 같은 날 다른 main push run 12건은 정상 완주했다
(취소는 11:42~11:43 한 구간에 몰려 있다).

같은 범위를 **로컬**에서 돌리면 `mode=selected` 가 나온다:

```text
BASE_SHA=9a3b402b9 HEAD_SHA=209efd3ff  node scripts/ci/detect-affected.mjs --mode=api-jest
  mode              : selected
  reason            : always 58 + raw 5 + related 1 + staticImport 1 + changedTests 1
  selected / full   : 61 / 354
```

> **이 로컬 실행은 ② 의 근거가 아니다.** CI runner 의 로그·artifact 가 아니고,
> 작업트리도 해당 commit 시점이 아니다. ② 는 실제 run 으로만 닫는다.

#### E. ② 판정 절차 (다음 적합 run 에서 그대로 수행)

**적합 run 조건** — 아래를 **모두** 만족해야 한다.

- `detect` job 출력이 `global_or_unknown=false`
- 변경에 `apps/api-server/**` 포함
- `admin_only` · `docs_fast_eligible` 둘 다 false (= `API Server Jest` job 이 실제로 실행됨)
- 변경에 `.github/**` · `scripts/**` · `pnpm-lock.yaml` · root manifest **미포함**
  (하나라도 있으면 mandatory full 이라 selected 증거가 되지 못한다)

**확인 위치**

| 무엇 | 어디 |
|---|---|
| 로그 | job `API Server Jest` → step `Calculate API Jest affected set (shadow)` |
| artifact | `api-jest-shadow-<run_id>-<run_attempt>` 안의 `shadow/api-jest-shadow.json` |
| 실제 실행 명령 | 같은 job 의 step `Run tests (api-server Jest, serial to prevent OOM)` |

```bash
gh api repos/:owner/:repo/actions/runs/<RUN_ID>/artifacts \
  -q '.artifacts[]|[.id,.name]|@tsv'
gh api repos/:owner/:repo/actions/artifacts/<ARTIFACT_ID>/zip > a.zip && unzip -o a.zip
```

**판정 기준**

| # | 기준 | 통과 조건 |
|---|---|---|
| E1 | `git diff` 성공 | `changedFiles.length > 0`, `baseSha` 가 실제 base |
| E2 | selected 모드 | `mode === "selected"` |
| E3 | 선택 수치 | `0 < selectedSuiteCount < fullSuiteCount` |
| E4 | component 정합 | `specs.length === selectedSuiteCount`, 각 component 수치 합이 중복 제거 후 `selectedSuiteCount` 와 모순 없음, `reason` 문자열의 내역과 `components` 일치 |
| E5 | spec 실재성 | `specs` 의 모든 경로가 `apps/api-server/` 기준 실재 파일 |
| E6 | 실행 범위 불변 (Phase 0) | 같은 job 의 Jest 명령이 `cd apps/api-server && npx jest --maxWorkers=1` 그대로이고, 실행된 suite 수가 `fullSuiteCount` 와 일치 (**selected 가 실행에 반영되면 Phase 0 위반**) |
| E7 | false-negative | 그 run 의 full Jest 가 실패했다면, 실패 suite 가 전부 `specs` 안에 있어야 한다. 하나라도 밖이면 **false-negative 1건 기록** → §20 의 "false-negative = 0" 불충족 |
| E8 | artifact 보존 | artifact 존재 · `expired=false` |

E2~E6 이 모두 통과해야 ② PASS 다. E7 은 매 run 누적 집계 대상이다.

**하지 말 것** — 수치 확보 목적의 `api-server` 코드/테스트 변경, detector 로직 수정,
fast path 조건 수정, Jest 명령 수정. 어느 하나라도 하면 그 run 은 증거가 아니라 조작이다.

## 14. §23 · §24 — 섞지 않은 것

- env-gated 6 suite(`MEDIA_V2_TEST_PORT` · `O4O_ISOLATED_PG_URL`) — **손대지 않았다** (W3 미포함)
- API CD 미완 검증 — 본 WO 는 CI test selection 만 다룬다

## 15. §28 — 금지 항목 준수

| 금지 | 준수 |
|---|---|
| selected Jest 실제 적용 | 하지 않음 (J17 이 고정) |
| test 삭제 · skip | 없음 |
| `maxWorkers` 변경 · Jest 병렬화 | 없음 |
| env-gated 6종 활성화 · 삭제 | 없음 |
| Docker · CD 변경 | 없음 |
| production application 기능 변경 | 없음 |

## 16. 알려진 잔여 한계

1. **CI 환경 결합(`process.env.*`)은 어떤 파일 기반 selector 로도 보이지 않는다.**
   IR 에서 확인된 유일한 실제 false-negative 사례(`encryption-key-canonical-rollout.spec.ts`
   / `00b96bc81`)가 이 부류이며, `global_or_unknown → full` fallback 이 막는다.
2. `ci-install-lockfile-contract.spec.ts` 는 runtime trace 상 `packages/**` 를 읽지만
   그 읽기는 jest 의 module resolution 부산물로 보인다. 현재는 ALWAYS_RUN 규칙
   (workspace manifest 를 읽는다) 으로 포함된다.
3. ground truth 자체가 **한 번의 runtime 계측**이다. 조건부 분기로만 도달하는 파일 읽기는
   포착되지 않았을 수 있다. shadow 기간이 이것을 실증으로 보완한다.

---

*작성: 2026-09-23 · Phase 0 (shadow) · Phase 1 미적용*
