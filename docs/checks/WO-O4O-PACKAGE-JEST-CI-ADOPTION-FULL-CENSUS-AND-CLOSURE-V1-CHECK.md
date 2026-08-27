# WO-O4O-PACKAGE-JEST-CI-ADOPTION-FULL-CENSUS-AND-CLOSURE-V1 — CHECK

package-level Jest 테스트 전수 조사 → 실행 가능성·유효성 검증 → 기존 CI quality gate 에 blocking 연결.

---

## §1 시작 상태

| 항목 | 값 |
|---|---|
| 기준 | `origin/main` = `d16c38caf` |
| 작업 worktree | `C:/tmp/o4o-glyco-ai-report` (branch `work/package-jest-ci-adoption-v1`) |
| 시작 시 dirty | 없음. 메인 체크아웃에 다른 세션의 untracked 문서 1건(`WO-O4O-SHORTCODE-ACTUAL-USAGE-...-CHECK.md`) 존재 — **접촉하지 않음** |

---

## §2 Fresh Census (과거 숫자 미재사용, 현재 저장소에서 재산출)

- `packages/*` 총 **62** 패키지
- `packages/**/*.{test,spec}.{ts,tsx}` 총 **28** 파일 / **11** 패키지
- `packages/**/jest.config.*` = **3** (`account-ui` · `appearance-system` · `asset-copy-core`)
- 루트 `jest.config.js` = 1 (§9 판정)

### Jest 모집단 (Vitest 로 이미 실행되는 테스트는 중복 포함하지 않음)

| 패키지 | 파일 | runner | 시작 시 분류 | 종료 시 분류 |
|---|---|---|---|---|
| `packages/asset-copy-core` | 4 | package-local `jest.config.cjs` | `LOCAL_ONLY_GREEN` | **`RUN_IN_CI`** |
| `packages/account-ui` | 1 | package-local `jest.config.cjs` | `LOCAL_ONLY_GREEN` | **`RUN_IN_CI`** |
| `packages/appearance-system` | 1 | package-local `jest.config.cjs` | `LOCAL_ONLY_RED`(Windows 스크립트) → §4 | **`RUN_IN_CI`** |

**Jest 모집단 = 3 패키지 / 6 파일 / 96 tests.**

### Vitest 로 이미 실행되는 패키지 (별도 기록 · Jest 모집단에서 제외)

`ui`(2) · `auth-utils`(2) · `auth-react`(3) · `store-ui-core`(1) · `operator-core-ui`(4) · `shared-space-ui`(7) = 6 패키지 / 19 파일 — 선행 WO 에서 이미 CI 연결됨(`RUN_IN_CI`).

### 나머지

| 대상 | 파일 | 분류 | 근거 |
|---|---|---|---|
| `packages/partner-core` | 2 | `NOT_RUNNABLE` | jest/vitest config 없음. typeorm `DataSource` 의존 — 단순 unit test 로 위장 불가(§12) |
| `packages/shortcodes` | 1 | `NOT_RUNNABLE` | `*.spec.ts` — 어떤 config 의 testMatch 에도 매칭되지 않음 |
| `packages/block-core` | 0 | `DEAD` | `"test": "jest --passWithNoTests"` 스크립트만 있고 test 파일 0개. CI 미연결 유지(무실행 통과 금지 원칙, §12) |

`UNJUDGED = 0`.

### 기존 CI 미연결 원인

세 패키지 모두 config·test script 는 갖췄으나 `.github/workflows/*` 어디에도 호출 step 이 없었다. 즉 **"로컬에서만 도는 테스트"** 였고, 회귀는 CI 에서 잡히지 않았다.

---

## §3 canonical runner 확정

우선순위 `package.json test script → package-local jest config → workspace 관행` 으로 판정.

| 패키지 | package.json `test` | canonical 실행 명령 |
|---|---|---|
| `asset-copy-core` | `npx jest --config jest.config.cjs` | `cd packages/asset-copy-core && npx jest --config jest.config.cjs` |
| `account-ui` | `npx jest --config jest.config.cjs` | `cd packages/account-ui && npx jest --config jest.config.cjs` |
| `appearance-system` | `NODE_OPTIONS=--experimental-vm-modules jest` | `cd packages/appearance-system && NODE_OPTIONS=--experimental-vm-modules npx jest --config jest.config.cjs` |

세 config 모두 `preset: ts-jest` · `roots: ['<rootDir>']` · `testMatch: ['**/__tests__/**/*.test.ts']` 로 동일 관행이고, 테스트가 `src/` 밖 `__tests__/` 에 있어 패키지 tsconfig(`include: src/**`) 의 build·type-check 산출물을 오염시키지 않는다. `jest`·`ts-jest` 는 루트에 호이스트돼 있어 패키지별 test 의존성 추가가 필요 없다.

루트 `jest.config.js` 는 **억지로 사용하지 않았다** — §9 참조.

---

## §4 CI 연결 전 선행 실행 (실측)

| 패키지 | 명령 | 결과 |
|---|---|---|
| `asset-copy-core` | `npx jest --config jest.config.cjs` | **4 suites / 64 tests PASS** |
| `account-ui` | `npx jest --config jest.config.cjs` | **1 suite / 20 tests PASS** |
| `appearance-system` | `pnpm test` | **FAIL** (`ELIFECYCLE`) |
| `appearance-system` | `npx jest --config jest.config.cjs` | **1 suite / 12 tests PASS** |
| `appearance-system` | `NODE_OPTIONS=--experimental-vm-modules npx jest --config jest.config.cjs` | **1 suite / 12 tests PASS** |

### 실패 분류 — `appearance-system` `pnpm test`

**`C. TEST_CONFIG` (Windows 로컬 이식성).** 스크립트 `NODE_OPTIONS=--experimental-vm-modules jest` 는 POSIX inline env 대입인데, Windows 에서 pnpm 이 `cmd.exe` 로 실행해 문법이 깨진다. 테스트 자체는 green 이며 제품 결함이 아니다(`A` 아님). CI 는 ubuntu bash 라 이 문법이 정상 동작하므로 **스크립트를 고치지 않고**, CI step 에서 동일 의미의 명령을 직접 실행한다. 이번 WO 범위(CI 연결) 밖의 Windows 로컬 DX 이슈로 기록만 한다.

`REAL_PRODUCT_DEFECT` 0건 · `STALE_TEST` 0건 · `MODULE_RESOLUTION_OR_BUILD` 0건 · `ENVIRONMENT_DEPENDENCY` 0건 · `FLAKE` 0건 · `UNJUDGED` 0건.
`LOCAL_ONLY_GREEN = 0` · `LOCAL_ONLY_RED = 0` (전부 `RUN_IN_CI` 로 전환).

---

## §5 실패 처리

skip·todo·기대값 완화·snapshot 갱신 **0건**. 제품 코드 수정 **0건**. §4 의 유일한 실패는 `C` 로 분류돼 CI step 명령 형태로 흡수했다.

---

## §6 테스트 유효성 실증 (mutation — 3/3 패키지 전부)

실제 구현 파일을 임시로 훼손해 **정확히 해당 계약 테스트가 실패하는지** 확인하고 원복했다.

| 패키지 | 훼손 대상 | 훼손 내용 | 결과 | 원복 |
|---|---|---|---|---|
| `asset-copy-core` | `src/interfaces/permission-checker.interface.ts:28` `hasAnyRole` | `return userRoles.some(...)` → `return true;` | **3 suites / 15 tests 실패** (권한 거부·빈 allowedRoles·크로스서비스 격리) | `git diff = 0` |
| `account-ui` | `src/utils/getUserDisplayName.ts` | 강제 `return 'X';` | **1 suite / 20 tests 전부 실패** | `git diff = 0` |
| `appearance-system` | `src/css-generators.ts:235` | `if (!enabled)` → `if (false)` (disabled early-return 제거) | **1 tests 실패** (`generates disabled scroll-to-top`), 나머지 11 통과 | `git diff = 0` |

세 건 모두 **negative / state-transition-opposite** 계약을 실제로 잡는다. 원복 후 재실행 결과 전부 green, `git diff --name-only` = 0 파일.

`appearance-system` 은 나머지 11개가 CSS 출력 문자열 단언 위주라 negative 밀도가 낮다 — 이번 mutation 으로 최소 1건의 실질 계약(비활성화 시 CSS 미생성)은 실증됐으나, **테스트 강도 자체는 다른 두 패키지보다 약하다**는 점을 숨기지 않고 기록한다.

---

## §7 CI 연결

기존 `.github/workflows/ci-pipeline.yml` `quality-check` job 에 **개별 step 3개**를 추가했다(신규 workflow 없음). 기존 vitest step 뒤에 배치.

```yaml
- name: Run tests (asset-copy-core Jest)
  run: cd packages/asset-copy-core && npx jest --config jest.config.cjs

- name: Run tests (account-ui Jest)
  run: cd packages/account-ui && npx jest --config jest.config.cjs

- name: Run tests (appearance-system Jest)
  run: cd packages/appearance-system && NODE_OPTIONS=--experimental-vm-modules npx jest --config jest.config.cjs
```

| 조건 | 상태 |
|---|---|
| blocking (step 실패 → job 실패) | ✅ |
| `continue-on-error` | 없음 |
| `\|\| true` | 없음 |
| warning-only | 없음 |
| production DB 필요 | 없음 |
| secret 필요 | 없음 |
| `--passWithNoTests` | **사용 안 함** |

### 무실행 통과(silent no-test pass) 불가 실측

```
$ npx jest --config jest.config.cjs --testPathPattern "zzz-nonexistent"
Pattern: zzz-nonexistent - 0 matches
EXIT=1
```

세 config 어디에도 `passWithNoTests` 설정이 없다(grep 0건) → discovery 가 비면 exit 1.

---

## §8 중복 실행 확인

| 기존 실행 경로 | 범위 | 이번 3개와 중복 |
|---|---|---|
| api-server Jest (`cd apps/api-server && npx jest`) | `roots` = api-server `src` 전용 | 없음 |
| admin-dashboard Vitest | `apps/admin-dashboard` | 없음 |
| multi-tenant Vitest | `apps/api-server/tests/multi-tenant` | 없음 |
| package Vitest 6개 | 각 `packages/<pkg>/src/**/*.test.*` | 없음 — 대상 3패키지는 vitest config 자체가 없고, 테스트도 `src/` 밖 `__tests__/` 에 있다 |
| 루트 Jest invocation | **존재하지 않음** (§9) | 없음 |
| workspace-wide test script | 루트 `test` = `node scripts/dev.mjs test` — **CI 어떤 step 에서도 호출되지 않음** | 없음 |

type-check / build 는 테스트 실행으로 보지 않았다. **`duplicate execution = 0`.**

---

## §9 루트 `jest.config.js` 판정 — **DEAD → 삭제**

### 근거

| 확인 | 결과 |
|---|---|
| 기동 가능 여부 | **불가.** `npx jest --listTests` → `ReferenceError: require is not defined in ES module scope` (파일은 CommonJS `require`/`module.exports` 인데 루트 `package.json` 이 `"type": "module"`) |
| workflow consumer | **0** — `.github/workflows/*` 의 jest 호출은 api-server(자체 `jest.config.cjs`)와 이번에 추가한 package-local 3개뿐 |
| script consumer | **0** — 루트 `test` 는 `node scripts/dev.mjs test` 이고, `runTests()` 는 test script 를 가진 workspace 에서 `pnpm test` 를 돌릴 뿐 루트 jest 를 호출하지 않는다 |
| 숨은 workspace script | **0** — `git grep "jest.config"` 결과 중 실행 경로는 package-local `.cjs` 참조뿐 |
| 문서 참조 | 과거 CHECK 문서 4건(과거 상태 기록물, 수정 불필요) + `packages/account-ui/jest.config.cjs` 헤더 주석 1건 → **함께 정리함** |

`ACTIVE_CANONICAL` / `ACTIVE_LIMITED` / `LEGACY_BUT_REFERENCED` 어디에도 해당하지 않는다. 실행되면 잡히는 것도 없고(기동 자체가 불가), 남겨두면 "루트에 canonical jest 규약이 있다"는 잘못된 신호만 준다.

### 조치

- `jest.config.js` **삭제**
- `packages/account-ui/jest.config.cjs` 헤더의 "루트 config 는 ESM 충돌로 기동하지 않는다(범위 밖 결함)" 주석을 **삭제 사실 반영**으로 갱신 — 주석이 존재하지 않는 파일을 가리키는 상태를 남기지 않는다
- 과거 CHECK 문서에서 제안됐던 `WO-O4O-ROOT-JEST-CONFIG-ESM-FIX-V1`(루트 config 를 `.cjs` 로 전환) 은 **불필요해졌다** — consumer 0 인 config 를 되살릴 이유가 없다. 해당 문서는 과거 시점 기록이므로 수정하지 않는다

### 부작용 확인

삭제 전에도 루트 `npx jest` 는 기동 불가였으므로 잃는 실행 경로는 없다. `partner-core`(2) · `shortcodes`(1) 는 이 config 의 testMatch 에 이론적으로만 걸렸을 뿐(`*.spec.ts` 는 애초에 testMatch 밖) 실제 실행된 적이 없어, 삭제로 커버리지가 줄지 않는다. 두 패키지는 `NOT_RUNNABLE` 로 유지된다.

---

## §10 회귀

### package-level Jest (3/3)

| 패키지 | 결과 |
|---|---|
| `asset-copy-core` | 64 passed / 64 |
| `account-ui` | 20 passed / 20 |
| `appearance-system` | 12 passed / 12 |

### package-level Vitest (6/6, 선행 WO 자산)

| 패키지 | 결과 |
|---|---|
| `ui` | 19 passed |
| `auth-utils` | 17 passed |
| `auth-react` | 44 passed |
| `store-ui-core` | 18 passed |
| `operator-core-ui` | 53 passed |
| `shared-space-ui` | 109 passed |

### 그 외

| 항목 | 결과 |
|---|---|
| `packages/account-ui` `tsc --noEmit` | error 0 |
| `packages/appearance-system` `tsc --noEmit` | error 0 |
| `packages/asset-copy-core` `tsc --noEmit` | error 0 |
| `node scripts/lint-ratchet.mjs` | 64 errors / 2141 warnings (baseline 64) → PASS |

기존 CI step 의 의미·순서는 보존했다(추가만, 수정·삭제 없음).

### `type-check:frontend`

`pnpm run type-check:frontend` → **`type-check:frontend: OK` (exit 0)**.

첫 실행은 이 worktree 의 workspace dist 산출물이 갖춰지지 않아 9 step 실패(`@o4o/auth-utils` 모듈 미해결 등)했으나, dev.mjs 의 선행 build 가 산출물을 채운 뒤 재실행에서 전부 통과했다. **이번 WO 의 변경(YAML·주석·문서·루트 config 삭제)은 TypeScript 소스를 건드리지 않는다.**

---

## §11 실제 CI 검증 (실측)

| 항목 | 값 |
|---|---|
| 이번 commit | `18033e1cf` (push `5c398652b..18033e1cf`) |
| 근거 run | **run `33051324480`** — `CI Pipeline`, head `b5bab1f4d`, **completed / success** |
| commit 포함 여부 | `git merge-base --is-ancestor 18033e1cf b5bab1f4d` = **YES** |
| 취소 run 취급 | `18033e1cf` 직행 run `33050887958` 은 concurrency 로 `cancelled` — **근거로 쓰지 않음**. 후속 run 으로 판정 |

### 신규 3개 step 실측 (해당 run 의 `Code Quality Check` job)

| step | 결과 | CI 로그 |
|---|---|---|
| `Run tests (asset-copy-core Jest)` | **success** | `Test Suites: 4 passed, 4 total` / `Tests: 64 passed, 64 total` |
| `Run tests (account-ui Jest)` | **success** | `Test Suites: 1 passed, 1 total` / `Tests: 20 passed, 20 total` |
| `Run tests (appearance-system Jest)` | **success** | `Test Suites: 1 passed, 1 total` / `Tests: 12 passed, 12 total` |

기존 9개 test step(api-server Jest · admin-dashboard Vitest · multi-tenant Vitest · package Vitest 6개) 도 전부 `success` — 기존 CI 의미·순서 보존 확인.

---

## §12 금지 항목 준수

| 금지 | 상태 |
|---|---|
| skip/todo 로 green 만들기 | 0건 |
| `--passWithNoTests` | 0건 (기존 admin-dashboard·multi-tenant step 의 플래그는 이번 WO 가 만든 것이 아니며 손대지 않음) |
| `\|\| true` | 0건 |
| `continue-on-error` | 0건 |
| snapshot 대량 갱신 | 0건 |
| 새 테스트 framework 도입 | 0건 |
| 실제 결함을 테스트 수정으로 은폐 | 0건 (제품 코드 수정 0) |
| DB·secret 필요한 테스트를 unit test 로 위장 연결 | 0건 (`partner-core` 는 `NOT_RUNNABLE` 로 남김) |

---

## §13 완료 기준

| 기준 | 결과 |
|---|---|
| 전수 판정 | 62 패키지 / 28 test 파일 전부 분류 |
| `LOCAL_ONLY_GREEN` | **0** |
| `LOCAL_ONLY_RED` | **0** |
| `UNJUDGED` | **0** |
| CI 실행 대상 Jest 전부 success | **3/3** |
| silent no-test pass | **0** (exit 1 실측) |
| duplicate execution | **0** |
| false-green | **0** (mutation 3/3 실증) |
| `CI_GREEN` | **PASS** (run `33051324480`) |

---

## 최종 판정

```text
PACKAGE_JEST_CI_ADOPTION = CLOSED
PACKAGE_JESTS_IN_CI      = PASS
UNJUDGED                 = 0
CI_GREEN                 = PASS
MUST_FIX_BEFORE_CLOSE    = 0
```

### 잔여 (이번 WO 범위 밖 · 별도 WO 후보)

| 항목 | 내용 |
|---|---|
| `packages/partner-core` | test 2 파일, typeorm `DataSource` 의존으로 `NOT_RUNNABLE`. 실행 환경 설계가 필요 |
| `packages/shortcodes` | `*.spec.ts` 1 파일, 어떤 config 의 testMatch 에도 안 걸림 |
| `packages/block-core` | test 0개인데 `jest --passWithNoTests` 스크립트만 존재 — 스크립트 정리 또는 테스트 작성 |
| `appearance-system` `pnpm test` | Windows 로컬에서 inline env 문법으로 실패 (CI 는 정상). cross-env 도입 등 DX 개선 |
| `appearance-system` 테스트 강도 | CSS 출력 문자열 단언 위주로 negative 밀도 낮음 |
