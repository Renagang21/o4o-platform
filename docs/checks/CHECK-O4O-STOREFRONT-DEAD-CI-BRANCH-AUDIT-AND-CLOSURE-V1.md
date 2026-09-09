# CHECK-O4O-STOREFRONT-DEAD-CI-BRANCH-AUDIT-AND-CLOSURE-V1

`scripts/ci-build-app.sh` 의 `@o4o/storefront` 분기 호출 가능성 감사 및 종결

- 작업 branch: `work/storefront-dead-ci-branch-closure-v1`
- 작업일: 2026-09-09

---

## 1. 시작 · 종료 HEAD

| 항목 | 값 |
|---|---|
| 시작 HEAD | `c199e9e84a828c34f920bd5669aaf374e902d847` |
| 시작 `origin/main` | `c199e9e84a828c34f920bd5669aaf374e902d847` (동일 확인) |
| 종료 HEAD | 본 문서 커밋 시점 (완료 보고에 기재) |
| 작업 트리 | `?? scratchpad/` 외 변경 없음 — `scratchpad/` 는 사용자 작업물이므로 접촉하지 않았다 |
| `pnpm install --frozen-lockfile` | PASS (pnpm 10.25.0) |

---

## 2. 전체 `storefront` 참조와 분류

`@o4o/storefront` 문자열은 저장소 전체에서 **2개 파일**에만 존재했다.

| # | 파일 | 성격 | 분류 |
|---|---|---|---|
| 1 | `scripts/ci-build-app.sh:41-44` (`"storefront")` case) | 유일한 실행 경로 참조 | **DEAD_CI_BRANCH** |
| 2 | `docs/checks/CHECK-O4O-WINDOWS-PNPM-FILTER-NOOP-GUARD-CLOSURE-V1.md` (5줄) | 직전 WO 가 이 결함을 발견해 후속 WO 를 권고한 기록 | **HISTORICAL_RECORD** |

- 2번은 `docs/checks/` 기록물이므로 CLAUDE.md §16-1 에 따라 **수정하지 않았다.**
- `.github/` 전체에 `storefront` 문자열 **0건**.
- `pnpm-lock.yaml` 의 `storefront` 매칭 **0건** (importer · dependency 어느 쪽도 없음).
- `apps/admin-dashboard/src/pages/storefront/*` 가 존재하지만 이는 admin-dashboard 내부 화면 경로이며
  `@o4o/storefront` 패키지와 무관하다. WO 의 "이름 유사성으로 임의 연결 금지" 원칙에 따라
  Neture / KPA storefront / Store Hub / PharmacyHub / 외부 판매채널 / 소비자 상품정보 화면 어느 것과도
  대체 관계로 연결하지 않았다. → **FALSE_POSITIVE**

---

## 3. 과거 package 이력 (삭제 · 은퇴 여부)

| 조사 | 결과 |
|---|---|
| `packages/storefront` · `apps/storefront` · `services/storefront` 삭제 이력 | **없음** |
| `git log --all -S'"@o4o/storefront"' -- '*/package.json'` | **결과 0건** — 어떤 manifest 에도 등재된 적이 없다 |
| 분기 도입 커밋 | `98f8a854b fix: add missing CI build app script` |
| 도입 시점의 `apps/` 구성 | admin-dashboard, api-gateway, api-server, crowdfunding, digital-signage, ecommerce, forum, healthcare, main-site — **storefront 없음** |

판정: `@o4o/storefront` 는 **삭제된 패키지가 아니라 처음부터 존재한 적이 없는 추측성 분기**다.
스크립트 작성 시 "있을 법한 app" 을 함께 나열한 결과물이다.

선례: `0dd1d28bf fix(ci): Fix CI build script and remove non-existent forum-cosmetics` —
동일 스크립트에서 존재하지 않는 case 를 제거한 전례가 이미 있다.

---

## 4. 호출 가능성 판정

`scripts/ci-build-app.sh` 의 호출자 전수:

| 호출자 | 인자 | 도달 가능 값 |
|---|---|---|
| `.github/workflows/ci-pipeline.yml:262` | `${{ matrix.app }}` | matrix 가 `app: [admin-dashboard]` 로 하드코딩 (line ~227) |
| `scripts/README.md:69` | 인자 없음 (문서 예시) | 무인자 → `all` |

워크플로 도달 경로:

| 경로 | 상태 |
|---|---|
| `workflow_dispatch` | 존재하나 **`inputs:` 없음** → 사용자가 app 을 지정할 방법이 없다 |
| `workflow_call` (reusable) | **없음** |
| `repository_dispatch` | **없음** |
| 배포 워크플로 · 로컬 · 배포 script 호출 | **0건** (`ci-build-app.sh` 문자열 전수 검색) |

→ `storefront` 인자가 이 스크립트에 전달될 수 있는 경로는 **자동·수동 어느 쪽으로도 존재하지 않는다.**
설령 수동으로 전달하더라도 `@o4o/storefront` 패키지가 없어 빌드는 성립할 수 없다.

---

## 5. 유지 또는 제거 결정

판정 원칙 6개 항목 전수 확인:

| 조건 | 결과 |
|---|---|
| workspace package 존재하지 않음 | ✅ 충족 (70개 workspace 중 없음) |
| lockfile importer · dependency 존재하지 않음 | ✅ 충족 (0건) |
| 현재 workflow matrix 에서 호출하지 않음 | ✅ 충족 (`[admin-dashboard]` 뿐) |
| workflow input 으로 도달 불가 | ✅ 충족 (`inputs:` 없음 / `workflow_call`·`repository_dispatch` 없음) |
| 배포 · 로컬 script 호출자 없음 | ✅ 충족 |
| 복구 또는 대체 계획이 canonical 문서에 없음 | ✅ 충족 |

**6/6 충족 → 판정 `DEAD_CI_BRANCH` → 제거.**

### main-site 보존 선례가 적용되지 않는 이유

`WO-O4O-MAIN-SITE-CI-BUILD-CONTRACT-CENSUS-AND-DISPOSITION-V1` 은 같은 스크립트의 `main-site` 분기를
보존했다. 그 근거는 "CI 가 더 이상 호출하지 않을 뿐, **수동 호출 경로로는 유효하다**" 였고,
`apps/main-site` 가 실재하기 때문에 성립한다.

`@o4o/storefront` 는 수동으로 호출해도 실행될 수 없으므로 이 보존 근거가 성립하지 않는다.
두 판정은 모순이 아니라 같은 기준(실행 가능성)의 서로 다른 결과다.

---

## 6. 수정 파일

| 파일 | 변경 |
|---|---|
| `scripts/ci-build-app.sh` | `"storefront")` case 4줄 제거 + usage 안내에서 `storefront` 제거 (2 hunk / 1 insertion, 5 deletions) |
| `apps/api-server/src/__tests__/ci-build-app-target-validity.spec.ts` | 신규 회귀 가드 |
| `docs/checks/CHECK-O4O-STOREFRONT-DEAD-CI-BRANCH-AUDIT-AND-CLOSURE-V1.md` | 본 문서 |

제거 대상 case 전용 주석 · dead 변수 · dead helper 는 별도로 없었다 (case 블록 4줄이 전부).

---

## 7. 회귀 가드

`apps/api-server/src/__tests__/ci-build-app-target-validity.spec.ts` — raw-source census, DB·네트워크 0.

| # | 단언 |
|---|---|
| 0 | census 가 워크스페이스(50개 초과)와 스크립트를 실제로 읽는다 |
| 1 | `storefront` case 와 `@o4o/storefront` 참조가 다시 들어오지 않는다 |
| 2 | 모든 `--filter=<name>` 대상이 실재하는 워크스페이스 패키지다 |
| 3 | 모든 `cd apps/<name>` 대상 디렉터리가 실재한다 |
| 4 | 호출하는 루트 `pnpm run <script>` 가 루트 `package.json` 에 존재한다 |
| 5 | 미지원 app 입력은 `exit 1` 로 실패한다 (조용한 성공 금지) |
| 6 | usage 안내가 실제 지원 case 만 나열한다 |

주석(`#`)을 제거한 실행 라인만 모집단으로 삼아 주석 속 이름을 오탐하지 않는다.

**실효성 검증 (negative test)**: `"storefront")` case 를 다시 주입한 상태에서 실행하면
단언 1 · 2 가 실패한다 (`Tests: 2 failed, 5 passed`). 주입분 제거 후 7/7 PASS 복귀 확인.

기존 Windows pnpm filter 가드(`windows-pnpm-filter-noop-guard.spec.ts`)는 `package.json` scripts 만을
모집단으로 하므로 `.sh` 스크립트를 덮지 못한다. 따라서 확장이 아니라 **별도 가드**로 추가했다.

---

## 8. build · type-check · test 결과

| # | 검증 | 결과 |
|---|---|---|
| 1 | `@o4o/storefront` 실행 참조 재검색 | **0건** (`scripts/` · `.github/` · `apps/` · `packages/` · `services/`) |
| 2 | `bash -n scripts/ci-build-app.sh` | **PASS** |
| 3 | 현재 matrix target `admin-dashboard` 빌드 | **PASS** |
| 4 | 미지원 app 입력(`storefront`) 명확한 실패 | **PASS** — `⚠️ Unknown app: storefront` / `exit 1` |
| 5 | `pnpm run build:packages` | **PASS** |
| 6 | api-server `type-check` | **PASS** |
| 7 | 관련 회귀 가드 3 suite | **PASS** — 24 tests (신규 7 + `windows-pnpm-filter-noop-guard` 4 + `main-site-ci-build-contract` 13) |
| 8 | `pnpm-lock.yaml` 변경 | **0** |
| 9 | dependency 변경 | **0** |
| 10 | 무관 변경 | **0** |

### 추가 확인 — 현재 지원 case 전수 유효성

| case | 대상 | 실재 |
|---|---|---|
| `admin` / `admin-dashboard` | `@o4o/admin-dashboard` | ✅ |
| `api` / `api-server` | `apps/api-server` | ✅ |
| `main` / `main-site` | `apps/main-site` | ✅ |
| `forum` / `ecommerce` / `signage` / `digital-signage` / `affiliate` / `vendors` | `@o4o/admin-dashboard` (통합 빌드) | ✅ |
| `all` | 루트 `build:apps` | ✅ (루트 `package.json` 에 존재) |

`storefront` 제거 후 **무효 build target 0건**.

---

## 9. lockfile · dependency 변경 여부

| 항목 | 값 |
|---|---|
| `pnpm-lock.yaml` | **변경 없음** (커밋 기준) |
| `package.json` dependency · version | **변경 없음** |
| 새 패키지 추가 · 제거 | **없음** |

WO 의 "dependency 또는 lockfile 변경이 필요하면 중지" 조건에 해당하는 상황은 발생하지 않았다.

### 검증 중 관찰된 lockfile 부수효과 (되돌림)

검증 3(`bash scripts/ci-build-app.sh admin-dashboard`) 실행 시 스크립트 내부의
**비-frozen `pnpm install`** 이 `pnpm-lock.yaml` 을 재생성해 아래 2가지를 만들었다.

- `services/web-glycopharm` importer 블록 제거 (해당 서비스는 이미 은퇴, lockfile 에만 잔존)
- `ts-jest` peer 해상도에 `(esbuild@0.27.0)` 추가

둘 다 이번 변경과 인과관계가 없는 스크립트 실행 부수효과이므로
`git checkout -- pnpm-lock.yaml` 으로 되돌렸고 **커밋에 포함하지 않았다.**
lockfile 이 실제로 drift 상태라는 사실 자체는 **후속 후보**로 §10 에 기록한다.

---

## 10. 후속 작업 필요 여부

이번 범위에 포함하지 않고 **별도 후보로만 보고**하는 항목:

1. **로컬 전용 jest 2 suite 실패** — `legacy-wordpress-block-editor-retirement.spec.ts`,
   `shortcode-domain-retirement.spec.ts`. 로컬에 `packages/block-core` ·
   `packages/cosmetics-seller-extension` 디렉터리가 git 추적 파일 0개(무시 대상 `dist/`,
   `node_modules/`, `tsconfig.tsbuildinfo` 만) 상태로 남아 있어 발생한다. 클린 CI 에서는 재현되지 않으며,
   로컬 디렉터리 삭제는 본 WO 금지 범위다. 이번 변경과 무관.
2. **`forum` / `ecommerce` / `signage` / `affiliate` / `vendors` case 가 모두
   `@o4o/admin-dashboard` 를 빌드한다** — 실행은 성립하므로 결함이 아니지만 의미상 중복이다.
   정리 여부는 별도 판단 대상.

3. **`pnpm-lock.yaml` drift** — 위 §9 참조. `ci-build-app.sh` 의 비-frozen `pnpm install` 이
   lockfile 을 재생성하면 `services/web-glycopharm` importer 제거 + `ts-jest` peer 해상도 변경이
   발생한다. 즉 커밋된 lockfile 이 현재 워크스페이스 구성과 완전히 일치하지 않는다.
   lockfile 변경은 본 WO 금지 범위이므로 손대지 않았다. 별도 WO 후보.

셋 다 이번 WO 범위에 포함하지 않았다.

---

## 11. 최종 판정

**`CLOSED`**

| 완료 조건 | 값 |
|---|---|
| `ACTIVE_STOREFRONT_PACKAGE` | 0 |
| `ACTIVE_STOREFRONT_CALLER` | 0 |
| `DEAD_STOREFRONT_CI_BRANCH` | 0 |
| `INVALID_CI_BUILD_TARGET` | 0 |
| `CURRENT_CI_MATRIX_BUILD` | PASS |
| `LOCKFILE_CHANGE` | 0 |
| `DEPENDENCY_CHANGE` | 0 |
| `UNRELATED_CHANGE` | 0 |

`@o4o/storefront` 는 복원 대상이 아니며, 다른 서비스를 대체로 지정하지도 않았다.
storefront 기능 재설계 · 소비자 commerce 복원은 수행하지 않았다.
