# WO-O4O-PACKAGE-LEVEL-VITEST-CI-ADOPTION-FULL-CENSUS-AND-CLOSURE-V1 — CHECK

package-level Vitest 가 존재하지만 CI 에서 실행되지 않는 패키지를 전수 조사하고,
선행 실행으로 실제 green 여부·테스트 유효성을 확인한 뒤 기존 quality gate 에 blocking 으로 연결한다.

기준: `origin/main` = `063e811a5`

---

## 1. 모집단 Fresh Census

이전 WO 의 "5개 / 17파일" 숫자를 재사용하지 않고 현재 저장소에서 다시 산출했다.

### 1-1. `packages/**` 테스트 파일 전수 (node_modules · dist 제외)

`*.test.ts|tsx` · `*.spec.ts|tsx` = **28 파일 / 11 패키지**.

### 1-2. 패키지별 판정 (`UNJUDGED = 0`)

| 패키지 | 테스트 파일 | 러너 | 분류(작업 전) | 조치 |
|---|:--:|---|---|---|
| `packages/ui` | 2 | vitest | **RUN_IN_CI** | 모집단 기록만 (직전 WO 에서 연결됨). 수정 대상 제외 |
| `packages/shared-space-ui` | 7 | vitest | **LOCAL_ONLY_GREEN** | CI 연결 |
| `packages/operator-core-ui` | 4 | vitest | **LOCAL_ONLY_GREEN** | CI 연결 |
| `packages/auth-react` | 3 | vitest | **LOCAL_ONLY_GREEN** | CI 연결 |
| `packages/auth-utils` | 2 | vitest | **LOCAL_ONLY_GREEN** | CI 연결 |
| `packages/store-ui-core` | 1 | vitest | **LOCAL_ONLY_GREEN** | CI 연결 |
| `packages/asset-copy-core` | 4 | **jest** (`jest.config.cjs` + test script) | **범위 밖 (jest)** | §7 기록 |
| `packages/account-ui` | 1 | **jest** (`jest.config.cjs` + test script) | **범위 밖 (jest)** | §7 기록 |
| `packages/appearance-system` | 1 | **jest** (`@jest/globals` import) | **범위 밖 (jest)** | §7 기록 |
| `packages/partner-core` | 2 | 불명 — config·script 모두 없음, typeorm DataSource 의존 | **NOT_RUNNABLE** | §7 기록 |
| `packages/shortcodes` | 1 | 불명 — config·script 모두 없음 (`*.spec.ts`) | **NOT_RUNNABLE** | §7 기록 |

`RUN_IN_CI = 1` · `LOCAL_ONLY_GREEN = 5`(연결 후 0) · `LOCAL_ONLY_RED = 0` ·
`NOT_RUNNABLE = 2` · `DUPLICATED = 0` · `DEAD = 0` · `INTENTIONALLY_EXCLUDED = 0` · `UNJUDGED = 0`.

> `packages/block-core` 는 `test: jest --passWithNoTests` script 만 있고 테스트 파일 0건이라
> 파일 census 에 나타나지 않는다. vitest 도 아니고 테스트도 없어 모집단에서 제외한다.

### 1-3. vitest config 전수

`packages/**` 의 `vitest.config.*` = **6건** (ui · auth-react · auth-utils · operator-core-ui ·
shared-space-ui · store-ui-core). `vite.config.*` 는 0건.
5개 대상 패키지 모두 `scripts.test` 가 **없고**, canonical 명령은 각 config 헤더에 명시된 루트 실행이다:
`npx vitest run --config packages/<pkg>/vitest.config.mjs`.

### 1-4. 기존 CI 미연결 원인 (실측)

workflow 의 vitest 참조는 admin-dashboard · multi-tenant · packages/ui **3건뿐**이다.
5개 패키지는 **테스트가 깨져서가 아니라 workflow step 이 아예 없어서** 실행되지 않았다.
`auth-react` · `auth-utils` config 헤더에는
"CI 파이프라인 연결은 CI 인프라 변경이라 이번 WO 범위 밖이다" 로 **의도적으로 미룬 부채**임이
명시돼 있었고, `operator-core-ui` · `shared-space-ui` · `store-ui-core` 는
"`packages/ui/vitest.config.mjs` 와 동일한 방식" 이라며 같은 미연결 관행을 답습했다.

---

## 2. CI 연결 전 선행 실행 (§3)

CI step 을 먼저 추가해 red 를 만드는 방식이 아니라, **로컬에서 canonical 명령을 먼저 실행**했다.

| 패키지 | 결과 |
|---|---|
| auth-utils | **2 files / 17 tests passed** |
| auth-react | **3 files / 44 tests passed** |
| store-ui-core | **1 file / 18 tests passed** |
| operator-core-ui | **4 files / 53 tests passed** |
| shared-space-ui | **7 files / 109 tests passed** |
| **합계** | **17 files / 241 tests, 실패 0** |

### 2-1. 실패 분류

```text
A. REAL_PRODUCT_DEFECT        = 0
B. STALE_TEST                 = 0
C. TEST_ENVIRONMENT_OR_CONFIG = 0
D. MISSING_BUILD_DEPENDENCY   = 0
E. FLAKE                      = 0
F. UNJUDGED                   = 0
```

실패 0건이므로 §4 의 실패 처리(수정 · BLOCKED_BY_REAL_DEFECT · stale 갱신)는 발동하지 않았다.
**테스트 코드는 한 줄도 수정하지 않았다** — green 을 만들기 위한 기대값 변경 0건.

---

## 3. 테스트 유효성 확인 (§5)

"전부 green" 으로 끝내지 않고, 각 패키지 테스트가 실제 계약을 검출하는지 확인했다.

| 패키지 | negative 성격 단정 라인 | 대표 반대조건 계약 |
|---|:--:|---|
| shared-space-ui | 57 | guide route/coverage 계약 — mount 된 route 중 copy 미참조 orphan 0 |
| auth-react | 43 | 금지 역할이면 deniedRedirect · 미인증이면 fallback + state.from 보존 |
| operator-core-ui | 28 | community console adoption · resources lifecycle 전이 계약 |
| store-ui-core | 4 | 서비스 식별자로 분기하지 않는다 · 경로 문자열 하드코딩 부재 |
| auth-utils | 3 | 비밀번호 정책 invalid input 거부 |

**전부 render smoke 수준이 아니다** — 권한/가시성 반대 조건, state transition, invalid input 이 이미 존재한다.

### 3-1. mutation check (대표 1건)

가장 보안 민감한 계약(`createRouteGuard` 의 allowedRoles)을 일시 무력화했다:

```diff
- (allowedRoles ? hasAnyRole(userRoles, allowedRoles) : true) &&
+ (allowedRoles ? true : true) &&
```

결과 — **3 failed / 41 passed**. 실패한 것은 정확히 권한 거부 계약 3건:

```text
× 금지 역할이면 deniedRedirect 로 보낸다(기본 "/")
× KPA 계약: accessDeniedMessage 가 있으면 리다이렉트 대신 안내를 그린다
× KPA 계약: accessDeniedMessage 가 없으면 renderDenied 가 null 을 반환해 "/" 로 떨어진다
```

검증 후 원복(`git diff` = 0). **false-green 아님이 실증됐다.**

---

## 4. 수정

### 4-1. CI 연결

`.github/workflows/ci-pipeline.yml` — `quality-check`(Code Quality Check) job,
`Run tests (packages/ui Vitest)` 바로 뒤에 **개별 step 5개** 추가:

```yaml
    - name: Run tests (auth-utils Vitest)
      run: npx vitest run --config packages/auth-utils/vitest.config.mjs
    - name: Run tests (auth-react Vitest)
      run: npx vitest run --config packages/auth-react/vitest.config.mjs
    - name: Run tests (store-ui-core Vitest)
      run: npx vitest run --config packages/store-ui-core/vitest.config.mjs
    - name: Run tests (operator-core-ui Vitest)
      run: npx vitest run --config packages/operator-core-ui/vitest.config.mjs
    - name: Run tests (shared-space-ui Vitest)
      run: npx vitest run --config packages/shared-space-ui/vitest.config.mjs
```

- 새 workflow 미생성 (기존 job 편입)
- 개별 step = 실패 패키지 즉시 식별
- `continue-on-error` 없음 · `|| true` 없음 · warning-only 아님 → **blocking**
- DB 불필요 · production secret 불필요 (jsdom/node 단위 테스트)
- **5개 config 전부 `passWithNoTests: false`** → include 가 비면 CI 실패. silent no-test pass 불가
- 의존성 · lockfile 무변경 (루트 vitest 3.2.4 · @testing-library/react 16.3.0 · jsdom 재사용)

### 4-2. 문서 정합

5개 `vitest.config.mjs` 헤더 갱신 — `auth-react` · `auth-utils` 의 stale 한
"CI 파이프라인 연결은 … 범위 밖" 문구를 제거하고, 5개 모두에
"CI Pipeline / Code Quality Check 의 Run tests (<pkg> Vitest) 로 연결됨(blocking)" 을 명시했다.

---

## 5. 중복 실행 확인 (§7)

| 기존 CI step | 실행 대상 | 이번 5개와 겹침 |
|---|---|:--:|
| api-server Jest | jest.config `roots` = api-server src 전용 | **없음** |
| admin-dashboard Vitest | admin-dashboard 디렉터리 기준 default include | **없음** |
| multi-tenant Vitest | 해당 디렉터리 전용 | **없음** |
| packages/ui Vitest | `packages/ui/src/**` | **없음** |
| 신규 5개 | 각 `packages/<pkg>/src/**` (config include 로 고정) | 상호 배타 |

각 config 의 include 가 자기 패키지 경로로 고정돼 있어 **이중 실행 0**.
루트 `jest.config.js` 는 testMatch 가 광범위하지만 **어떤 workflow 에서도 호출되지 않는다**
(CI 의 jest 는 api-server 자체 config 사용) — 중복 원인이 아니다.
`type-check:frontend` / build 는 Vitest 실행으로 간주하지 않았다.

---

## 6. 전체 회귀 (로컬 실측)

| 검증 | 결과 |
|---|---|
| `packages/ui` Vitest | 2 files / **19 passed** |
| `packages/auth-utils` Vitest | 2 files / **17 passed** |
| `packages/auth-react` Vitest | 3 files / **44 passed** |
| `packages/store-ui-core` Vitest | 1 file / **18 passed** |
| `packages/operator-core-ui` Vitest | 4 files / **53 passed** |
| `packages/shared-space-ui` Vitest | 7 files / **109 passed** |
| **합계** | **19 files / 260 tests, 실패 0** |
| 5개 패키지 `npx tsc --noEmit` | 전부 **OK** (자체 type-check script 는 없음) |
| `pnpm run type-check:frontend` | **`type-check:frontend: OK`** |
| `node scripts/lint-ratchet.mjs` | `ESLint: 65 errors, 2185 warnings (error baseline 65)` — 통과 |

기존 step(lint-ratchet · multi-tenant · packages/ui) 의 **순서와 의미를 바꾸지 않았다**.
신규 step 은 packages/ui Vitest 뒤에 append 만 했다.

---

## 7. 범위 밖 발견 (별도 WO 권장)

이번 WO 대상은 **package-level Vitest** 다. census 에서 함께 드러난 나머지:

| 발견 | 내용 |
|---|---|
| **jest 기반 package 테스트 3개 · 6파일 CI 미실행** | `asset-copy-core`(4) · `account-ui`(1) · `appearance-system`(1). 각각 test script 와 jest config 가 있으나 workflow 가 호출하지 않는다. 러너가 달라 이번 step 패턴을 그대로 쓸 수 없어 분리. |
| **NOT_RUNNABLE 2개 · 3파일** | `partner-core`(2, typeorm DataSource 의존 → DB 또는 mock 기반 결정 필요) · `shortcodes`(1, `*.spec.ts` 인데 어떤 config include 에도 걸리지 않음). 실행 기반을 새로 정해야 해서 조용히 연결하지 않았다. |
| **루트 `jest.config.js` 가 dead** | 어떤 workflow 도 호출하지 않는다. 위 jest WO 에서 함께 판정하는 것이 자연스럽다. |
