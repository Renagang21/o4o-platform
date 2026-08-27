# WO-O4O-UI-VITEST-CI-ADOPTION-AND-PLATFORMONLY-MENU-GUARD-REGRESSION-V1 — CHECK

`packages/ui` 테스트를 CI quality gate 에 연결하고, `UnifiedMenuItem.platformOnly` /
`filterMenuByRole(menu, isAdmin, isPlatformAdmin)` 계약을 자동 회귀 테스트로 잠근다.

기준: `origin/main` = `c2b7eb505`

---

## 1. 테스트 / CI census

### 1-1. `packages/ui`

| 항목 | 실측 |
|---|---|
| `package.json` `scripts.test` | **없음** (`build` · `type-check` 만) |
| vitest devDependency | **없음** (의도적 — 루트 vitest 사용) |
| `vitest.config.mjs` | 존재. `environment: jsdom`, `include: packages/ui/src/**/*.test.{ts,tsx}`, `passWithNoTests: false` |
| 기존 테스트 | `src/operator-user-detail/__tests__/UserDetailPasswordModal.test.tsx` (9 tests) |
| workflow 참조 | **0건** (`grep vitest .github/workflows` → admin-dashboard · multi-tenant 만) |

### 1-2. 테스트 분류 (`UNJUDGED = 0`)

| 테스트 | 분류(작업 전) | 조치 |
|---|---|---|
| `UserDetailPasswordModal.test.tsx` (9) | **LOCAL_ONLY** | CI 연결 → `RUN_IN_CI`. 로컬 선행 실행 **9/9 pass** (stale 아님, 수정 불요) |
| `filterMenuByRole.test.ts` (10) | 신규 | `RUN_IN_CI` |

`NOT_RUNNABLE` = 0 · `DUPLICATED` = 0 · `DEAD` = 0 · `UNJUDGED` = 0.

### 1-3. CI 미실행 원인 (실측)

`packages/ui` 는 **테스트가 깨져 있어서가 아니라 workflow 에 step 이 아예 없어서** 실행되지 않았다.
`vitest.config.mjs` 헤더에도 "CI 파이프라인 연결은 CI 인프라 변경이라 이번 WO 범위 밖이다"
(`WO-O4O-OPERATOR-USER-DETAIL-PASSWORD-SERVICEKEY-SELECTION-V1`) 로 명시돼 있었다 —
**의도적으로 미룬 부채**이지 결함 은폐가 아니다.

### 1-4. `filterMenuByRole` consumer census

| 서비스 | 호출 | 인자 |
|---|---|:--:|
| GlycoPharm | `components/layouts/OperatorLayoutWrapper.tsx:35` | **3-인자** (`isPlatformAdmin`) |
| K-Cosmetics | `components/layouts/OperatorLayoutWrapper.tsx:30` | 2-인자 |
| KPA-Society | `components/kpa-operator/KpaOperatorLayoutWrapper.tsx:31` | 2-인자 |
| Neture | `components/layouts/OperatorLayoutWrapper.tsx:25` | 2-인자 (`false` 고정) |
| PharmacyHub | `layouts/OperatorLayoutWrapper.tsx:60` | 2-인자 |

`platformOnly` 를 실제로 쓰는 메뉴는 GlycoPharm 의 `AI 사용량` · `AI 정산` 2건뿐이다.
메뉴 구조는 **flat group**(중첩 child 없음) 이므로 §3-6 의 nested 검증은 해당 없음 →
대신 **"통과 항목 0개 그룹은 결과에서 제외"** 계약을 검증한다.

---

## 2. 수정

### 2-1. 신규 회귀 spec

`packages/ui/src/operator-shell/__tests__/filterMenuByRole.test.ts` (10 tests).
서비스 실제 `UNIFIED_MENU` 를 복사하지 않고 **작은 fixture 2개**로 공통 함수 계약만 검증한다.

| # | 계약 | 테스트 |
|---|---|---|
| 1 | `platformOnly` 미지정 → 2-인자 결과와 동일 | `platformOnly 를 쓰지 않는 메뉴는 3번째 인자와 무관하게 동일한 결과를 낸다` |
| 2 | `platformOnly=true` + `isPlatformAdmin=false` → 제거 | `isPlatformAdmin=false 면 platformOnly 항목을 제거한다` |
| 3 | `platformOnly=true` + `isPlatformAdmin=true` → 노출 | `isPlatformAdmin=true 면 platformOnly 항목을 노출한다` |
| 4 | 일반 `adminOnly` 계약 유지 | `일반 항목은 항상 통과하고 adminOnly 는 isAdmin 일 때만 통과한다` |
| 5 | 두 플래그 교집합 | `adminOnly 와 platformOnly 가 함께 있으면 교집합이다` (4조합 전수) |
| 6 | 그룹 처리 (nested 없음) | `통과 항목이 0개인 그룹은 결과에서 제외한다` · `platformOnly 만 있는 그룹은 그룹째 사라진다` |
| 7 | 2-인자 하위호환 | `3번째 인자 기본값은 false 다` (`PLATFORM_MENU` 기준 deep-equal) |
| + | 부수효과 | 순서·부가필드 보존 · 플래그 키 제거 · 입력 메뉴 불변 |

**핵심 negative**: `isAdmin=true, isPlatformAdmin=false`(= 서비스 admin) 에서
`platformOnly` 항목이 보이지 않아야 한다. `requireAdmin`(= `platform:super_admin` 단독)
backend guard 와 메뉴 진입점을 정합시킨 계약이며, 이게 깨지면 403 이 빈 화면으로 위장된다.

### 2-2. CI 연결

`.github/workflows/ci-pipeline.yml` — `quality-check`(Code Quality Check) job,
기존 multi-tenant Vitest step 바로 뒤:

```yaml
    - name: Run tests (packages/ui Vitest)
      run: npx vitest run --config packages/ui/vitest.config.mjs
```

- 새 workflow 미생성 (기존 job 에 편입)
- `continue-on-error` 없음 · `|| true` 없음 · warning-only 아님 → **blocking**
- DB 불필요 · secret 불필요 (jsdom 단위 테스트)
- `passWithNoTests: false` 이므로 include 가 비면 CI 가 실패한다 (조용한 무실행 방지)
- 의존성·lockfile 무변경 (루트에 이미 `vitest 3.2.4` · `@testing-library/react 16.3.0` · `jsdom` 설치됨)

`packages/ui` **type-check** 는 이미 CI 가 커버한다 — `type-check:frontend` 가
`packages/ui` 를 `npx tsc` 로 사전 빌드하므로 타입 오류는 그 단계에서 실패한다.
따라서 별도 type-check step 을 추가하지 않았다.

### 2-3. 문서 정합

`packages/ui/vitest.config.mjs` 헤더의 "CI 파이프라인 연결은 … 범위 밖" 문구를
현재 상태(CI blocking 연결됨) 로 교체.

---

## 3. 검증 실측

### 3-1. `packages/ui` vitest

```
✓ packages/ui/src/operator-shell/__tests__/filterMenuByRole.test.ts (10 tests) 8ms
✓ packages/ui/src/operator-user-detail/__tests__/UserDetailPasswordModal.test.tsx (9 tests) 1336ms
Test Files  2 passed (2)     Tests  19 passed (19)
```

### 3-2. false positive = 0 (mutation 검증)

테스트가 실제로 계약을 잡는지 확인하기 위해 구현에서 guard 를 일시 제거했다:

```diff
- .filter(item => (!item.adminOnly || isAdmin) && (!item.platformOnly || isPlatformAdmin))
+ .filter(item => (!item.adminOnly || isAdmin))
```

결과 — **3 failed / 16 passed**. 실패한 것은 정확히 platformOnly 계약 3건:

```
× isPlatformAdmin=false 면 platformOnly 항목을 제거한다 (서비스 admin 도 제외)
× platformOnly 만 있는 그룹은 비-platform 운영자에게 그룹째 사라진다
× adminOnly 와 platformOnly 가 함께 있으면 교집합이다 (둘 다 true 여야 통과)
```

`adminOnly` · 하위호환 테스트는 통과 → 테스트가 guard 제거를 **정확히** 잡는다.
검증 후 구현 원복 (`git diff` = 0).

### 3-3. type-check

- `pnpm --filter @o4o/ui type-check` (`npx tsc --noEmit`) → exit 0
- `pnpm run type-check:frontend` → §3-4
- 테스트 파일은 `tsconfig.json` `exclude: ["**/*.test.ts", "**/*.test.tsx"]` 로 빌드에서 제외된다
  (기존 규약 유지 — dist 오염 방지). 즉 **테스트 파일 자체의 타입 오류는 tsc 가 아니라
  vitest 실행이 잡는다.**

---

## 4. 금지 항목 준수

```text
새 테스트 framework 도입          = 0  (기존 vitest 3.2.4)
snapshot 대량 생성                = 0  (toMatchSnapshot 0건)
skip/todo 로 green 만들기         = 0  (it.skip / it.todo 0건, 기존 테스트도 9/9 실제 통과)
platformOnly 계약 변경            = 0  (filterMenuByRole.ts · types.ts 무수정)
기존 role model 변경              = 0
서비스 메뉴 공통화 추가 작업       = 0  (서비스 config 무수정)
```

---

## 5. 범위 밖 발견 (별도 WO 권장)

`packages/ui` 외에도 **package-level vitest config 5개가 동일하게 CI 미연결** 상태다:

| 패키지 | 테스트 파일 수 | CI |
|---|:--:|:--:|
| `packages/shared-space-ui` | 7 | 미실행 |
| `packages/operator-core-ui` | 4 | 미실행 |
| `packages/auth-react` | 3 | 미실행 |
| `packages/auth-utils` | 2 | 미실행 |
| `packages/store-ui-core` | 1 | 미실행 |

합계 17개 테스트 파일. 이번 WO 범위(`packages/ui`) 밖이라 건드리지 않았다.
동일 패턴(`npx vitest run --config <pkg>/vitest.config.mjs`)으로 확장 가능하지만,
각 패키지의 테스트가 현재 실제로 통과하는지 먼저 확인해야 하므로 별도 WO 로 분리한다.

---

## 6. 회귀 실측 (로컬)

| 검증 | 결과 |
|---|---|
| `npx vitest run --config packages/ui/vitest.config.mjs` | **19/19 pass** (2 files) |
| `pnpm --filter @o4o/ui type-check` | **OK** |
| `pnpm run type-check:frontend` | **`type-check:frontend: OK`** (0 실패) |
| `node scripts/lint-ratchet.mjs` | **통과** — `65 errors, 2185 warnings (error baseline 69)` |

`type-check:frontend` 는 `filterMenuByRole` 의 5개 consumer 를 전부 포함한다 —
GlycoPharm(3-인자) · K-Cosmetics · KPA-Society · Neture · PharmacyHub(2-인자) 및
admin-dashboard · web-account · web-kpa-branch. **2-인자 consumer 회귀 0.**

> lint-ratchet 이 `오류가 69 → 65 로 줄었습니다. ERROR_BASELINE 을 65 로 낮춰 주세요` notice 를
> 출력한다. 이 감소는 이번 변경이 아니라 다른 WO 의 결과이고, baseline 조정은 이 WO 범위 밖이라
> 건드리지 않았다 (병렬 세션 충돌 방지). 게이트는 정상 통과한다.

---

## 7. CI 실측 (push 후)

commit `3cfac5875` · CI Pipeline run `33045379102` · **conclusion = success**
(Code Quality Check: success · Build Applications (admin-dashboard): success)

신규 step 로그 원문:

```
Run npx vitest run --config packages/ui/vitest.config.mjs
 RUN  v3.2.4 /home/runner/work/o4o-platform/o4o-platform
 ✓ packages/ui/src/operator-shell/__tests__/filterMenuByRole.test.ts (10 tests) 9ms
 ✓ packages/ui/src/operator-user-detail/__tests__/UserDetailPasswordModal.test.tsx (9 tests) 647ms
 Test Files  2 passed (2)
      Tests  19 passed (19)
```

| CI step | 결과 |
|---|---|
| `Run tests (packages/ui Vitest)` | **success** — 19/19, 소요 1.97s |
| platformOnly regression | **PASS** (10/10) |
| `Run TypeScript check (Frontend only)` | `type-check:frontend: OK` |
| `Run ESLint (regression ratchet)` | `ESLint: 65 errors, 2185 warnings (error baseline 65)` — 통과 |

> 로컬 실행 시점의 baseline 은 69 였으나(§6), rebase 후 main 에는 다른 WO 가 이미
> 65 로 낮춰둔 상태였다. 실제 오류 수 65 = baseline 65 로 정확히 통과한다.
> CI 는 concurrency 취소 없이 완주했다.

---

## 8. 최종 판정

```text
packages/ui 테스트 CI 실행        = YES  (blocking step, continue-on-error/|| true 없음)
platformOnly negative regression = PASS (mutation 으로 3건 실패 확인 → false positive 0)
2-인자 backward compatibility     = PASS (4서비스 consumer + 전용 테스트 2건)
false positive                    = 0
UNJUDGED                          = 0
CI step                           = SUCCESS
```

```text
UI_VITEST_CI_ADOPTION = CLOSED
PLATFORMONLY_GUARD    = PASS
CI_GREEN              = PASS
MUST_FIX_BEFORE_CLOSE = 0
```

### 잔여 (종료를 막지 않음)

1. **package-level vitest config 5개(테스트 17개) 가 아직 CI 미연결** — §5. 별도 WO.
2. `packages/ui` 의 `tsconfig.json` 이 테스트 파일을 exclude 하므로 테스트 코드 자체의
   타입 오류는 tsc 가 아니라 vitest 실행이 잡는다 (기존 규약 유지, 의도적).
