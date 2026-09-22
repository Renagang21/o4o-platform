# CHECK-O4O-ADMIN-CI-CD-AFFECTED-SCOPE-AND-DUPLICATE-WORK-REDUCTION-V1

Admin Dashboard CI/CD — affected scope 판정 · Admin-only fast path · 같은 runner 중복 install/build 제거

- 작업 branch: `main` (직접 작업)
- 작업일: 2026-09-22
- 실행 commit: `93964ffc6`

---

## 1. PR #213 선행 상태 (되돌리지 않은 것)

`ci: reduce Admin CD work and parallelize API regression gate` 가 이미 main 에 있다.

| 선행 적용 | 현재 상태 |
|---|---|
| Admin CD 의 repository-wide `build:packages` 제거 | **유지** |
| `pnpm --filter '@o4o/admin-dashboard^...' run build` (transitive closure 만) | **유지** |
| API Server Jest 를 별도 병렬 job 으로 분리 | **유지** |
| API Jest `--maxWorkers=1` | **유지** (WO §12) |
| 테스트 범위 · blocking gate 축소 없음 | **유지** |

PR #213 이 후속으로 남긴 3항목(중복 package build 제거 · affected/change-based CI ·
Admin deploy trigger 정밀화)이 이번 WO 의 범위다.

---

## 2. 수정 전 실측 baseline (GitHub Actions)

`gh run list` 실측. queue 대기는 포함되지 않은 run 단위 wall-clock 이다.

| 구간 | commit | 실측 | run id |
|---|---|---|---|
| Admin-only 변경의 CI Pipeline | `1e69ef257` | **853s = 14분 13초** | 35698331635 |
| 같은 변경의 Deploy Admin | `1e69ef257` | **157s = 2분 37초** | 35698331696 |
| 무관한 변경(병원약국)의 Deploy Admin | `5f463c95d` | **181s = 3분 01초** | 35694403672 |
| Deploy Admin 중앙값 (최근 100 run) | — | **184s ≈ 3분** | — |

`1e69ef257` 의 실제 코드 변경은 `apps/admin-dashboard/src/pages/auth/ForgotPassword.tsx`
**1 파일**이고 나머지는 CHECK/WO 문서 2건이다. 그럼에도 API Server 전체 Jest
(job 약 10분 50초 · Jest 자체 약 9분)가 critical path 였다.

### 2-1. Admin CD 낭비 전수 (실측)

최근 100 개의 `deploy-admin.yml` push 실행을 각 commit 의 실제 diff 로 재판정했다
(`scripts/ci/detect-affected.mjs` · 로컬 실행).

| 판정 | 건수 | 누적 시간 |
|---|---|---|
| Admin 영향 있음 (정상 배포) | **68** | — |
| **Admin 영향 없음 (낭비)** | **32** | **약 104분** |
| 판정 불가 | 0 | — |

낭비 사례(일부): `3a41a04fe`(166s, store-ui-core) · `d8edbf95a`(164s, PR #222) ·
`55c60e081`(173s) · `999fa5101`(164s, 문서) · `fb08c0dd1`(164s) · `ccbd16be4`(160s, 문서).

원인은 `on.paths` 의 `packages/**` 다. Admin 의 dependency closure 는 실측 **18개**이고
`@o4o/hospital-pharmacy-core` · `@o4o/store-ui-core` 등은 여기에 없다.

---

## 3. 중복 install / build census

`scripts/ci-build-app.sh` 소비처 전수 (`Grep` 기준):

| 소비처 | 성격 |
|---|---|
| `.github/workflows/ci-pipeline.yml:build` | 유일한 자동 호출부 |
| `apps/admin-dashboard/ci.build.config` | 스크립트가 읽는 설정 |
| `ci-install-lockfile-contract.spec.ts` · `ci-build-app-target-validity.spec.ts` · `main-site-full-source-deletion.spec.ts` | **raw source 를 읽는 정적 계약 spec** (스크립트 실행 안 함) |
| `docs/checks/**` · `docs/investigations/**` | 기록물 |

→ 스크립트를 삭제하지 않는다(WO §4). 정적 계약 spec 3건이 소스를 직접 읽으므로
`pnpm install --frozen-lockfile` 라인 자체도 남겨야 한다.

수정 전 Admin build job 의 실제 실행 순서:

```text
setup-build-env           → pnpm install --frozen-lockfile
Build admin workspace deps → pnpm --filter '@o4o/admin-dashboard^...' run build
ci-build-app.sh           → pnpm run build:packages     ← 전체 재빌드 (중복)
                          → pnpm install --frozen-lockfile ← 재설치 (중복)
                          → pnpm --filter=@o4o/admin-dashboard run build
```

`build:packages` 는 `build:types → … → build:api-deps` 체인으로, Admin 과 무관한
api-server 의존 패키지까지 전부 빌드한다.

수정 후:

```text
setup-build-env           → install 1회
Build admin workspace deps → Admin closure(18) build 1회
ci-build-app.sh (O4O_PACKAGES_PREBUILT=1)
                          → build:packages / install 건너뜀
                          → Admin production build 1회
```

`O4O_PACKAGES_PREBUILT` 는 새 규약이 아니다. `.github/actions/setup-build-env` 가
package 빌드 후 설정하고 `scripts/dev.mjs:31` 이 같은 의미로 읽는 기존 표식이며,
**항상 install 이 선행된 뒤에만** 설정되므로 install 재실행도 함께 건너뛸 수 있다.
표식이 없는 standalone 실행(로컬 · 수동)은 기존 동작 그대로다.

로컬 실측: `O4O_PACKAGES_PREBUILT=1 bash scripts/ci-build-app.sh admin-dashboard`
→ **37초** (`✓ built in 31.00s` + postbuild), `build:packages` · `install` 0회.

---

## 4. affected 판정 규칙 (SSOT)

`scripts/ci/detect-affected.mjs` 단일 지점. `ci-pipeline.yml` 과 `deploy-admin.yml`
이 **같은 스크립트**를 쓴다 — workflow 두 곳에 glob 을 손으로 유지하지 않는다.

### 4-1. Admin dependency closure — 하드코딩하지 않는다

`pnpm-workspace.yaml` 의 packages 축(`apps/*` · `packages/*` · `packages/@o4o-apps/*` ·
`services/*`, `!services/mobile-app`)에서 package.json 을 읽어
`dependencies` / `devDependencies` / `peerDependencies` / `optionalDependencies` 중
workspace 이름을 따라 transitive 하게 계산한다.

실측: 워크스페이스 68개, Admin closure **18개**.

```text
@o4o-apps/content-core · @o4o/ai-prompts · @o4o/appearance-system · @o4o/auth-client
@o4o/auth-context · @o4o/auth-react · @o4o/auth-utils · @o4o/block-renderer
@o4o/content-editor · @o4o/forum-core · @o4o/operator-ux-core · @o4o/organization-core
@o4o/pharmacy-ai-insight · @o4o/security-core · @o4o/slide-app · @o4o/types
@o4o/ui · @o4o/utils
```

### 4-2. 출력

`admin_affected` · `admin_only` · `api_affected` · `global_or_unknown` · `fallback` · `reason`.

| 분류 | 규칙 |
|---|---|
| `admin_affected` | `apps/admin-dashboard/**` · closure 안 package · global 판정 전부 |
| `admin_only` | 코드 변경이 `apps/admin-dashboard/**` 에만 있고 나머지가 **문서 추가·수정**뿐 |
| `api_affected` | `apps/api-server/**` · api closure 안 package · global |
| `global_or_unknown` | 아래 §5 |

### 4-3. Git diff 기준

- push: `github.event.before` .. `github.sha` (merge-base 경유) — **push batch 전체**
- pull_request: `base.sha` .. `head.sha` (merge-base 경유)
- rename/copy 는 **양쪽 경로 모두** 변경으로 본다
- `HEAD~1` 비교는 쓰지 않는다. multi-commit push 에서 앞쪽 commit 을 놓친다
  (회귀 시험 Case 7 이 이 동작을 고정한다)

---

## 5. safe fallback 규칙

아래는 전부 `global_or_unknown=true` → `admin_affected=true` · `api_affected=true` ·
`admin_only=false` → **기존 full CI 경로 그대로**.

| 조건 | 근거 |
|---|---|
| base SHA all-zero · 부재 · 존재하지 않는 commit (force push · shallow) | 판정 근거 없음 |
| `git diff` 실패 · 스크립트 예외 | 판정 불가 |
| 변경 파일 0건 | 판정 불가 |
| root manifest/config — `package.json` · `pnpm-lock.yaml` · `pnpm-workspace.yaml` · `.npmrc` · `.nvmrc` · root `tsconfig*.json` · `eslint.config.js` · `.eslintrc.cjs` · `.dockerignore` · `.gcloudignore` | 설치·빌드 결과 전반에 영향 |
| `.github/**` · `scripts/**` · `tools/**` · `e2e/**` · `config/**` · `bundles/**` · `.husky/**` | api-server 정적 계약 spec 6건 이상이 이 파일들을 **raw text 로 읽는다** |
| workspace 에 매핑되지 않는 경로 (`README.md`, 기타) | 조용한 skip 금지 |
| `docs/**` 의 **삭제 · 이동(D/R)** | `archive-retention-*` · `cross-session-safe-commit-guard` 등이 기록물 존재를 단언한다 |

`docs/**` 의 **추가 · 수정(A/M)** 만 중립이다.

판정기는 어떤 경우에도 exit 0 이다. 판정기 자체의 실패가 파이프라인을 막는 대신
안전한 fallback 이 되도록 했다.

---

## 6. Admin-only fast path — 무엇을 줄이지 않았는가

`admin_only == true` 일 때 `quality-check` / `api-tests` / `build` 대신
**병렬 2 job**(`admin-fast-validate` · `admin-fast-guards`)이 실행된다.

### 6-1. 유지 (범위 축소 없음)

| 검증 | 기존 | fast path |
|---|---|---|
| frozen lockfile install | `setup-build-env` (strict) | 동일 |
| Admin transitive dependency build | closure 18개 | 동일 |
| `packages/types/dist` freshness guard | 있음 | 동일 |
| Admin TypeScript type-check | `type-check:frontend` 안 | `pnpm --filter @o4o/admin-dashboard run type-check` |
| Admin ESLint | `eslint … src --max-warnings 500` (417 파일) | `eslint apps/admin-dashboard --report-unused-disable-directives --max-warnings 500` (**424 파일 — 범위 확대**) |
| console.log 게이트 | `apps/` | `apps/admin-dashboard/` (같은 스크립트) |
| Admin Vitest | 있음 | 동일 (`--pool=forks --poolOptions.forks.maxForks=1`) |
| Admin production build + artifact | 있음 | 동일 (`ci-build-app.sh`) |
| **Admin 소스를 읽는 api-server 정적 guard** | 전체 suite 안 | **선별 실행 (실측 27 spec)** |

ESLint 실측(로컬): 기존 `src` 범위 417 파일 / 0 errors / 327 warnings,
새 워크스페이스 범위 424 파일 / **0 errors / 327 warnings** → 기준선 500 유지,
검사 파일만 7개 늘었다(`vite.config.ts` 등 non-src). 즉 **넓어졌고 좁아지지 않았다**.

repository-wide `lint-ratchet.mjs`(ERROR_BASELINE=46)는 fast path 에서 실행하지 않는다.
ESLint 는 error 가 1건이라도 있으면 `--max-warnings` 와 무관하게 exit 1 이므로,
Admin 워크스페이스 전체를 보는 위 단계가 **Admin 범위에서는 ratchet 보다 엄격**하다.
Admin-only 변경은 다른 워크스페이스의 error 수를 바꿀 수 없다.

### 6-2. 정적 guard spec 선별 — 왜 `--findRelatedTests` 가 아닌가

api-server spec 208개 중 24개가 `apps/admin-dashboard/**` 소스를
`fs.readFileSync` 로 직접 읽어 은퇴 패턴 재유입을 막는다(legacy-partner ·
wordpress-block-editor · shortcode-domain · registry-audit 등).
jest `--findRelatedTests` 는 **모듈 import 그래프만** 보므로 이 축을 전부 놓친다.

따라서 변경 경로를 **raw text 참조**로 선별한다. 후보 문자열은 경로
(`apps/admin-dashboard/...`) · 패키지명(`@o4o/admin-dashboard`) · 디렉터리명
(`admin-dashboard`) 셋이며, 문서 변경은 `docs/<area>` 깊이까지 본다.

실측: `1e69ef257` 범위 → **27 spec** 선별
(경로 축 24 = grep `admin-dashboard` 결과와 일치, 문서 축 +3).
선별이 비면(판정 실패) **전체 suite 로 fallback** 한다.

### 6-3. 건너뛰는 축 (Admin-only 변경이 닿을 수 없는 것만)

api-server type-check · TypeORM entity registry guard · migration contract ·
unsafe route guard · multi-tenant Vitest · KPA Vitest · Neture Vitest ·
Admin closure 밖 package 테스트(store-ui-core · operator-core-ui · shared-space-ui ·
asset-copy-core · account-ui) · `tools/o4o-local-agent` node:test ·
API Server 전체 Jest.

`tools/**` · `scripts/**` 변경은 global 이므로 이 축을 건드리는 변경은
`admin_only` 가 될 수 없다.

---

## 7. Admin CD trigger 정비

`on.paths` 에서 `packages/**` 를 **지우지 않았다.** 지우면 Admin 의존성 package 변경이
조용히 배포되지 않는 false negative 가 된다. 대신:

```text
workflow trigger (넓게)
  → detect (checkout + node 만, pnpm install · GCP 인증 없음)
     → admin_affected=false → deploy job 자체가 skip
        (install · dependency build · Admin build · Docker build/push · Cloud Run 0)
     → admin_affected=true  → 기존 deploy 경로 그대로
```

### 7-1. root trigger 보완 (census 근거)

| 추가한 path | 근거 |
|---|---|
| `package.json` | root manifest — `build:packages` 체인 · Admin build script 정의 |
| `pnpm-lock.yaml` | 해석된 의존성 버전이 Admin 산출물을 바꾼다 |
| `pnpm-workspace.yaml` | workspace 축 자체 |
| `.npmrc` | 설치 동작 |
| `.github/actions/setup-build-env/**` | Admin CD 의 install/build 환경 그 자체 |

추가하지 않은 것: root `tsconfig*.json` · `eslint.config.js` — Admin **빌드 산출물**을
바꾸지 않는다(Admin 빌드는 `vite build`, `tsc --noEmit` 은 검증 경로). 판정기 쪽에서는
global 로 취급하므로 CI 는 full 로 돈다.

`force_deploy` 수동 배포 경로는 그대로 유지했다.

---

## 8. 변경 파일

| 파일 | 변경 |
|---|---|
| `scripts/ci/detect-affected.mjs` | **신규** — affected scope 판정 SSOT |
| `scripts/ci/__tests__/detect-affected.test.mjs` | **신규** — WO §13 Case 1~8 회귀 시험 |
| `scripts/ci/check-console-log.sh` | **신규** — 기존 인라인 게이트를 **무수정** 이전 + 범위 인자화 |
| `scripts/ci-build-app.sh` | `O4O_PACKAGES_PREBUILT=1` 일 때 `build:packages` · `install` 재실행 skip |
| `.github/workflows/ci-pipeline.yml` | `detect` job 추가 · `quality-check`/`api-tests`/`build` 를 `admin_only != true` 로 gate · `admin-fast-validate` / `admin-fast-guards` 추가 · build job 에 dedupe 표식 · 판정기 node:test 연결 · workflow_dispatch 검증 입력 |
| `.github/workflows/deploy-admin.yml` | `detect` job 추가 · `deploy` 를 `admin_affected` 로 gate · root path trigger 보완 · workflow_dispatch 검증 입력 |

production code · Admin UI 기능 · Docker · Cloud Run 아키텍처 변경 **0건**.

---

## 9. 테스트 결과 (로컬)

| 검증 | 결과 |
|---|---|
| `node --test scripts/ci/__tests__/detect-affected.test.mjs` | **12/12 PASS** (1.76s) |
| api-server `ci-install-lockfile-contract.spec.ts` | **PASS** — 가드 안의 `pnpm install --frozen-lockfile` 이 계약을 계속 만족 |
| api-server `ci-build-app-target-validity.spec.ts` | **PASS** |
| api-server `deployment-domain-retirement.spec.ts` | **PASS** |
| api-server `main-site-full-source-deletion.spec.ts` | **FAIL (로컬 환경 원인 · 본 WO 무관)** — §12 참조 |
| 선별 27 spec 일괄 실행 | 26 suites PASS / 1 = 위 환경 실패 (702 tests pass) |
| `npx eslint scripts/ci` | exit 0 |
| `npx eslint apps/admin-dashboard --report-unused-disable-directives --max-warnings 500` | exit 0 (0 errors / 327 warnings / 424 파일) |
| `bash scripts/ci/check-console-log.sh apps/` / `… apps/admin-dashboard/` | 둘 다 PASS (기존과 동일) |
| `O4O_PACKAGES_PREBUILT=1 bash scripts/ci-build-app.sh admin-dashboard` | **exit 0, 37초** |
| YAML 파싱 | 두 workflow 모두 OK |

### 9-1. 판정 회귀 시험 (WO §13 Case 대응)

| Case | 입력 | 기대 | 결과 |
|---|---|---|---|
| 1 | Admin 소스 + docs | `admin_only=true` · API full Jest SKIP | **PASS** |
| 2 | `packages/hospital-pharmacy-core` · `services/web-hospital-pharmacy` | `admin_affected=false` | **PASS** |
| 3 | `packages/auth-react` · `types` · `ui` | `admin_affected=true` · `admin_only=false` | **PASS** |
| 4 | `apps/api-server/**` | Admin 미영향 · `api_affected=true` | **PASS** |
| 5 | Admin + API | `admin_only=false` · full regression | **PASS** |
| 6 | root manifest · lockfile · CI infra (11경로) | global fallback | **PASS** |
| 6b | 매핑 불가 경로 | global fallback | **PASS** |
| 6c | 문서 삭제 · 이동 | global fallback | **PASS** |
| 7 | multi-commit push (앞 commit Admin, 마지막 docs-only) | Admin 감지 | **PASS** (임시 git 저장소 실측) |
| 8 | all-zero · 빈 값 · 없는 commit | safe fallback | **PASS** |
| — | admin_only 에서도 Admin guard spec 선별 | 부분집합 · 대표 spec 포함 | **PASS** |

---

## 10. GitHub Actions 실제 before / after

로컬 시험만으로 종결하지 않았다. 아래는 전부 실제 run 기록이다.

### 10-1. Admin-only 변경 — CI Pipeline

`workflow_dispatch` 로 **같은 판정 입력**(`1e69ef257` 의 base..head)을 실제 Actions 에서
재현했다. 판정 입력은 workflow input 으로 주고 코드는 현재 main 을 쓴다.

| | before | after |
|---|---|---|
| run | 35698331635 (`1e69ef257` push) | **35727951242** (dispatch) |
| 결과 | success | **success** |
| wall-clock | **853s = 14분 13초** | **177s = 2분 57초** |

잡 구성 (after):

| job | 결과 | 시간 |
|---|---|---|
| Detect affected scope | success | 27s |
| Admin Fast — validate & build | success | (critical path) |
| Admin Fast — repo static guards | success | **97s** |
| Code Quality Check | **skipped** | 0s |
| API Server Jest | **skipped** | 0s |
| Build Applications | **skipped** | 0s |

`Admin Fast — validate & build` 단계별 실측:

```text
checkout                              24s
Setup build environment (install)     23s
Build admin workspace dependencies    36s
Verify types dist freshness            0s
TypeScript check (admin-dashboard)    24s
ESLint (admin workspace)               7s
console.log gate (admin-dashboard)     0s
admin-dashboard Vitest                14s
Build admin-dashboard                 ~11s (vite)
```

판정 로그 (detect job):

```text
changed files   : 3
admin_affected  : true
admin_only      : true
api_affected    : false
global_or_unknown: false
fallback        : false
```

**목표 대비**: WO §15 의 "Admin-only CI 4~5분 이하" 를 만족한다(2분 57초).
"API Server 전체 Jest 가 critical path 가 되지 않는다" 도 만족한다 — 전체 suite 대신
선별 27 spec 이 97초에 끝나고, 이는 critical path 가 아니다(validate 잡과 병렬).

### 10-2. 무관한 package 변경 — Admin CD skip (실증)

`3a41a04fe` (store-ui-core · web-k-cosmetics · web-kpa-society · api-server) 범위로
`deploy-admin.yml` 을 dispatch 했다.

| | before | after |
|---|---|---|
| run | 35353030211 (`3a41a04fe` push) | **35727962607** (dispatch) |
| 결과 | success (실제 배포 수행) | **success (deploy job skipped)** |
| wall-clock | **166s** | **34s** |

after 잡 구성:

```text
Detect admin impact | success  (admin_affected=false, api_affected=true, fallback=false)
deploy              | skipped
```

즉 **pnpm install · dependency build · Admin build · Docker build/push ·
Cloud Run deploy 가 0회**다.

### 10-3. Admin 의존성 변경 — 정상 배포 유지

| 근거 | 내용 |
|---|---|
| 실제 run | `93964ffc6` push → deploy-admin run 35727457733 — `detect` 가 `admin_affected=true`(global: `.github/**` · `scripts/**`) 로 판정하고 **deploy job 정상 수행** |
| 판정 실측 | `09dfc1d00` (`packages/auth-react/**` = Admin closure 안) → `admin_affected=true` · `admin_only=false` |
| 회귀 시험 | Case 3 (`auth-react` · `types` · `ui`) PASS |

`packages/auth-react` 범위로 별도 dispatch 는 하지 않았다 — 판정이 `true` 면 그 뒤는
기존과 **완전히 같은** deploy 경로이고, 검증만을 위해 운영 Cloud Run 을 한 번 더
배포할 이유가 없다. gate 는 단일 boolean 이며 그 boolean 이 `true` 로 나오는 것을
위 3개 근거로 실증했다.

### 10-4. 전체 CI 경로(admin_only 아님) — 무손상 + 중복 제거 효과

`60bf7b5db` push (api-server + admin-dashboard + packages 혼합) → run **35728228723**,
**conclusion success**.

| job | 결과 | 시간 |
|---|---|---|
| Detect affected scope | success | 29s |
| Code Quality Check | success | 461s |
| API Server Jest | success | 662s |
| Build Applications (admin-dashboard) | success | **101s** |
| Admin Fast — validate & build / repo static guards | **skipped** | 0s |

같은 `Build Applications` 잡의 before (run 35698331635):

| | before | after |
|---|---|---|
| Build Applications (admin-dashboard) | **191s** | **101s** (−90s, −47%) |

이 잡은 `quality-check` · `api-tests` 뒤에 직렬로 붙으므로 **−90초가 full CI
critical path 에서 그대로 빠진다.** 중복 제거의 순효과다.

critical path 비교 (queue 제외):

```text
before : api-tests 654s + build 191s            = 845s
after  : detect 29s + api-tests 662s + build 101s = 792s   (−53s)
```

`detect` 잡은 full CI 경로에 **+29초를 추가**한다. 이것이 판정 도입의 고정 비용이며,
중복 제거분(−90초)이 이를 상쇄하고도 남는다. run 전체 wall-clock(853s → 862s)은
commit 이 달라(api-tests 654→662s, jest 13건 신규) 직접 비교 대상이 아니다.

### 10-5. quality-check 단계 무손상

`a568dc0c3` push 의 CI run 35727697613 에서 `Code Quality Check` 의 **32 단계 전부
success** 였다(런 자체는 병렬 세션의 후속 push 로 concurrency 취소됨 — 본 변경과 무관).
여기에는 이번에 추가·변경한 2단계가 포함된다.

```text
Check for console.log statements              success   (스크립트로 분리한 게이트)
Run tests (CI affected-scope detector node:test) success (12/12)
```

같은 run 의 `detect` 는 docs-only 를 `admin_only=false` 로 판정해 **기존 full CI 경로가
그대로** 돌았다(Admin Fast 2잡 skipped).

### 10-6. 중복 install / build 횟수 (run 로그 실측)

`Admin Fast — validate & build` 잡 로그 기준:

| 항목 | before (설계상) | after (실측) |
|---|---|---|
| `pnpm install` | 2회 | **1회** (`Lockfile is up to date` 1줄) |
| `pnpm run build:packages` | 1회 (전체) | **0회** |
| Admin dependency closure build | 1회 | 1회 |
| Admin production build (vite) | 1회 | **1회** |

로그 증거:

```text
⏭️ O4O_PACKAGES_PREBUILT=1 — 같은 runner 의 install / build:packages 재실행을 건너뜁니다
✅ Build completed successfully!
```

---

## 11. 남아 있는 전체 CI 병목

Admin-only 가 **아닌** 변경(대부분의 commit)은 여전히 기존 full CI 를 돈다.
순서대로 남은 병목:

| 순위 | 병목 | 실측 (run 35728228723) | 비고 |
|---|---|---|---|
| 1 | API Server Jest 전체 (208 suite, `--maxWorkers=1`) | **662s** | WO §12 로 이번 범위 밖. critical path 의 84% |
| 2 | `quality-check` 의 저장소 전체 `build:packages` + 13개 테스트 단계 | **461s** | 병렬이라 현재는 critical path 가 아니다. 1 이 줄면 곧 병목이 된다 |
| 3 | `build` 가 1·2 완료를 기다리는 직렬 구조 | +101s | 1·2 가 줄면 함께 줄어든다 |
| 4 | 문서 전용 commit 도 full CI (§12-2) | 700~800s | 후속 WO 후보 |
| 5 | `detect` 고정 비용 | +29s | checkout `fetch-depth: 0` 이 대부분. shallow 로 줄이면 multi-commit 감지가 깨진다 |

Admin-only 경로에서는 1·2·3 이 전부 제거됐다(전체 177초).

이번 WO 는 Docker · Cloud Run · hosting · `deploy-web-services.yml` 을 건드리지 않았다.
Admin CD 자체 속도(2분 30초~3분)는 WO §12 판단대로 손대지 않았다.

---

## 12. 범위 밖에서 발견한 것 (수정하지 않음)

### 12-1. 로컬 `apps/main-site` 잔존 디렉터리

`main-site-full-source-deletion.spec.ts` 가 로컬에서 실패한다.

```text
apps/main-site/
  dist/
  node_modules/
```

소스는 `WO-O4O-MAIN-SITE-FULL-SOURCE-DELETION-V1` 에서 삭제됐고 git 추적 파일은 0건이지만,
빌드 산출물과 `node_modules` 가 로컬에 남아 디렉터리 자체가 존재한다.
spec 은 `apps/` 하위 디렉터리 이름을 스캔하므로 이 잔존물에 걸린다.
**CI 는 clean checkout 이라 영향이 없다**(현재 main 의 CI green 이 근거).

본 WO 범위 밖이고, 다른 세션의 작업 공간일 수 있어 삭제하지 않았다.
정리하려면 별도 확인이 필요하다 — `node_modules` 가 pnpm store hardlink 이고
과거 junction 재귀 삭제 사고 선례가 있다.

### 12-2. 문서 전용 commit 도 full CI 를 돈다

실측: `3960af039`(IR 문서) 715s · `7761929b0`(WO 문서) 247s(취소) ·
`c41551ae5`(CHECK 문서) 795s. 판정기는 docs-only 를 `admin_only=false` 로 보므로
기존 full CI 경로로 간다(보수적). 문서 전용 fast path 는 이번 WO 범위 밖이다.

api-server 정적 spec 6건 이상이 `docs/**` 를 읽으므로 단순 skip 은 불가하며,
§6-2 의 경로 참조 선별을 그대로 적용하는 후속 WO 가 필요하다.

### 12-3. `deploy-web-services.yml` 의 동일 패턴

`packages/** → all services` 패턴이 그대로 있다. WO §12 에 따라 이번에는 수정하지 않았다.
본 WO 의 `detect` job 구조(트리거는 넓게 · 실행은 판정으로 gate)를 서비스별
`admin_affected` 대응 출력으로 확장하면 같은 방식으로 적용 가능하다 — **후속 권고**.

---

## 13. WO §17 완료 조건 대조

| 조건 | 상태 | 근거 |
|---|---|---|
| Admin CI 내 중복 `build:packages` 제거 | **충족** | §10-6 — run 로그 0회 |
| Admin CI 내 중복 install 제거 | **충족** | §10-6 — install 1회 |
| Admin-only 변경에서 API full Jest 불필요 실행 제거 | **충족** | §10-1 — `API Server Jest` skipped, 대신 선별 27 spec 97초 |
| unrelated package 변경에서 Admin build/deploy 제거 | **충족** | §10-2 — `deploy` job skipped, 34초 |
| Admin transitive dependency 변경은 정상 감지 | **충족** | §10-3 |
| multi-commit push 감지 정상 | **충족** | Case 7 (임시 git 저장소 실측) + `fetch-depth: 0` + `event.before..sha` |
| detector failure 시 safe fallback 정상 | **충족** | Case 8 + §5 |
| 기존 Admin lint/typecheck/test/build protection 유지 | **충족** | §6-1 (ESLint 범위는 오히려 확대) |
| 실제 GitHub Actions green | **충족** | 35727951242 success · 35727962607 success · 35728228723 success |
| before/after wall-clock 기록 | **충족** | §10 |
| CHECK 작성 | 본 문서 |
| main 반영 후 `HEAD == origin/main` | 완료 보고에 기재 |

---

## 14. Git 상태

| 항목 | 값 |
|---|---|
| 작업 시작 `origin/main` | `7a64d8739` |
| 구현 commit | `93964ffc6` |
| 문서 commit | 본 문서 (+ `detect-affected.mjs` 의 사유 문구 1줄 보정) |

검증용 브랜치 `ci/verify-admin-affected-scope-v1` 를 `93964ffc6` 에 만들어
`ci-pipeline.yml` 을 dispatch 했다. **main 에 dispatch 하면 concurrency 가 ref 단위라
병렬 세션의 진행 중 CI 를 취소**하기 때문이다(`cancel-in-progress: true`).
`deploy-admin.yml` 은 `cancel-in-progress: false` 라 main 에 dispatch 해도 안전하다.
검증 후 브랜치는 삭제했다 — run 기록은 브랜치와 무관하게 보존된다.

작업 중 병렬 세션의 아래 파일이 작업 트리에 있었고 **접촉 · stage 하지 않았다**.

```text
 M docs/baseline/O4O-STORE-OWNER-SERVICE-AGREEMENT-V1.0.md
?? apps/api-server/src/config/google-admin-bootstrap.config.ts
```

`node scripts/git/check-staged-scope.mjs` 로 staged 6건이 전부 본 WO 범위임을 확인한 뒤
pathspec commit 했다.
