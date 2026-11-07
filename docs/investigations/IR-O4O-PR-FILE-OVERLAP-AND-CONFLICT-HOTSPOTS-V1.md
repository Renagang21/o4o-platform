# PR 동시 수정 · 충돌 파일 상위 20 · 구조 개선안 · 병합/운영 반영 분리 조사

> **상태**: DRAFT (조사 전용 · 코드 · workflow · 설정 변경 없음)
> **작성일**: 2026-11-07
> **범위**: 최근 60일(2026-09-08 ~ 2026-11-07) 병합 PR 738건 + 조사 시점 열린 PR 3건(#968 · #973 · #975)
> **실행 위치**: CLOUD (GitHub 조회 · git 이력 재계산만. 운영 DB · GCP 조회 없음)
> **관련**: [`IR-O4O-PRIVATE-CI-BUDGET-V1`](IR-O4O-PRIVATE-CI-BUDGET-V1.md) §8 (Actions 사용량 수치 출처) · [`AGENTS.md` §4-1](../../AGENTS.md) · [README — 배포](../../README.md#배포)

---

## 0. 요약

1. 충돌 기록이 남은 파일 충돌 321건 중 **37건(12%)이 migration 등록 파일 2개**(`manifest.ts` · `expected-schema-states.ts`)에서 났다. 이 둘은 누적 fingerprint 사슬이라 **구조상 동시에 진행할 수 없다**. 병렬 개발로는 해결되지 않고, 한 번에 하나씩 진행하는 순서(lane) 규칙과 재생성 절차가 필요하다.
2. 그다음은 **경로가 한곳에 모이는 허브 파일**이다. 서비스 웹 `App.tsx`(route 345개), API `register-routes.ts`(등록 140개), 공통 패키지 `index.ts` barrel(export 136개), 서비스별 `SiteShell` · `RootShell`, WO 진행표(TODO 문서)가 해당한다. 기능이 달라도 같은 줄 근처에 추가하므로 충돌한다. 기능별 분리, 정렬된 자기 파일, 공통 shell 구조로 줄일 수 있다.
3. 충돌 기록이 남은 충돌은 **서비스(웹) 154건 · core(API 플랫폼) 100건**에 집중된다. 공통 패키지는 17건, extension은 0건이다. 공통 UI를 바꾸면 **서비스마다 있는 shell · route 파일이 연쇄로 수정**되는 것이 실제 충돌 경로다.
4. **오래 열린 PR일수록 충돌이 많다.** 충돌률은 2시간 이내 병합 PR 5.2%(29/557), 2~8시간 16%(15/92), 8~24시간 22%(15/67), 24시간 초과 36%(8/22)다. 하루 병합은 중앙값 13건, 최대 57건이다.
5. 현재 배포 구조: **main 에 병합하면 CI가 끝난 뒤 Delivery가 자동 배포한다.** LEVEL 2(일반 runtime)는 운영까지 반영된다. LEVEL 3(migration · 인증 · 권한 · 결제 · 배포 설정)는 자동 배포가 차단되고 Promote 1회로 반영된다. 30일 기준 Delivery 624회(3,743분), Promote 207회(4,412분)였다.
6. "병합은 자주, 운영 반영은 묶어서"를 하려면 **Delivery의 트리거를 바꿔 하루 2회 release train으로 운영하는 방식**을 권장한다. 대신 WIF 조건과 CI gate의 target 선택을 함께 바꿔야 한다. 그러면 배포 계열 Actions 사용량은 월 약 8,150분에서 약 1,200~2,200분으로 줄어든다(추정). main push CI(월 23,822분)는 그대로 남는다.

---

## 1. 방법 · 한계

| 항목 | 방법 |
|---|---|
| PR 목록 | GitHub search API(`is:pr is:merged merged:<기간>` · `is:open`)로 번호 · 생성 · 병합 시각을 얻었다. 병합 738건, 열린 PR 3건이다 |
| PR별 변경 파일 | main first-parent 의 PR 커밋(`Merge pull request #N` · `Merge PR #N` · `(#N)`)이 있으면 `M^1..M` diff 를 썼다(688건). 없으면 `refs/pull/N/head` 와 **PR 생성 시점 main** 의 merge-base diff 를 썼다. 파일을 얻지 못한 PR 은 #975 1건이다(조사 중 생성되어 ref 미수신) |
| 동시 수정 | 같은 파일을 바꾼 두 PR 의 열린 구간 [생성, 병합(열린 PR 은 조사 시점)] 이 겹치면 "동시"로 봤다. **동시 수정 PR 수** = 그 파일에서 다른 PR 과 한 번이라도 겹친 PR 수 |
| 충돌 횟수 | 각 PR head 이력에서 PR 고유 merge commit(주로 `Merge origin/main into …`)을 찾았다(105개 · PR 67건). 각 commit 의 두 parent 를 `git merge-tree --write-tree` 로 다시 merge 해 **실제 충돌한 파일**을 셌다. 파일 충돌은 321건이다. 열린 PR 은 현재 main 과의 충돌도 확인했다(#968 · #973 충돌 0, #975 ref 미수신) |
| main 직접 커밋 | PR 번호가 없는 main first-parent 커밋은 761건이다(9월 674 · 10월 87 · 11월 0). ruleset 적용(2026-10-04) 이전의 직접 반영이므로 "동시 수정"에는 넣지 않고 참고 열로만 집계했다 |

**한계 (과소 집계 쪽):**

- **rebase 로 충돌을 해결한 PR 은 기록이 남지 않는다.** 위 충돌 수는 "merge commit 으로 해결한 충돌"만 센 하한이다.
- 충돌 후 PR 을 닫고 새로 만든 경우나, 로컬에서 해결하고 push 하지 않은 시도는 보이지 않는다.
- shallow clone(2026-08-25 이후 이력)이라, 그 전에 분기한 극소수 PR 은 merge-base 가 부정확할 수 있다.
- 파일 경로가 바뀐 경우(rename)는 다른 파일로 셌다(`--no-renames`).
- 대량 이동 PR(archive 이동 등)이 "수정 파일 수"를 부풀린다. 그래서 순위는 **충돌 횟수 × 3 + 동시 수정 PR 수**로 정했다.

재현 스크립트와 원자료는 커밋하지 않았다(§10-1 데이터 자산 규칙). 같은 방법은 §6 Action 초안의 계산 방식과 같다.

---

## 2. 상위 20개 파일

분류 기준:

- **core** — 동결 Core 패키지(`packages/*-core`)와 API 플랫폼 공통 계층(`apps/api-server/src` 에서 `modules/` 를 뺀 부분: bootstrap · database · controllers · services 등)
- **공통 패키지** — `packages/*` 중 core · extension 이 아닌 것(`shared-space-ui` · `auth-react` · `operator-core-ui` 등)
- **extension** — `packages/*-extension` · `organization-forum/lms` · `apps/api-server/src/extensions`
- **서비스** — `services/web-*` · `apps/admin-dashboard`(웹), `apps/api-server/src/modules/<서비스>`(API 모듈)
- **문서 · CI** — 위 4분류에 들지 않는 것

| # | 파일 | 분류 | 60일 수정 PR | 동시 수정 PR 수 | 충돌 횟수 | 파일 성격 |
|---:|---|---|---:|---:|---:|---|
| 1 | `apps/api-server/src/database/incremental/manifest.ts` | core | 55 | 38 | **19** | migration 등록부. 정렬된 import, append 전용, epoch 엄격 증가 |
| 2 | `apps/api-server/src/database/incremental/expected-schema-states.ts` | core | 56 | 38 | **18** | migration 누적 fingerprint 등록부(1번과 함께 바뀜). 값은 격리 PG 로 계산 |
| 3 | `services/web-neture/src/App.tsx` | 서비스(웹) | 52 | **42** | 7 | route 허브(1,354줄 · `<Route>` 345개) |
| 4 | `docs/CANONICAL-INDEX.md` | 문서 | 49 | 36 | 1 | 정본 색인 표(행 추가 · 상태 변경) |
| 5 | `docs/work-orders/WO-O4O-OPERATOR-CODE-REFINEMENT-TODO-V1.md` | 문서 | 22 | 21 | 5 | WO 진행표. 여러 세션이 같은 표의 상태 칸을 갱신 |
| 6 | `docs/baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md` | 문서 | 36 | 22 | 4 | 기준 문서. 기능 PR 마다 결정 사항을 추가 |
| 7 | `docs/work-orders/WO-O4O-PHARMACYHUB-RETIREMENT-TODO-V1.md` | 문서 | 37 | 33 | 0 | WO 진행표(동시 수정은 많고 충돌은 기록 없음) |
| 8 | `.github/workflows/pharmacyhub-qr-cutover.yml` | 문서 · CI | 22 | 20 | 4 | 일회성 cutover 운영 workflow(420줄). 단계마다 수정 |
| 9 | `services/web-neture/src/lib/home-entry.ts` | 서비스(웹) | 27 | 15 | 5 | 로그인 후 진입 판정(역할 · 서비스 · 매장)(801줄) |
| 10 | `apps/api-server/src/modules/neture-pharmacy/neture-pharmacy.routes.ts` | 서비스(API 모듈) | 38 | 20 | 3 | 서비스 API router(538줄). 기능별 endpoint 가 한 파일에 있음 |
| 11 | `apps/api-server/src/bootstrap/register-routes.ts` | core | 33 | 21 | 2 | 전 서비스 API route 등록 허브(1,204줄 · 등록 140개) |
| 12 | `services/web-lecture/src/components/SiteShell.tsx` | 서비스(웹) | 24 | 10 | 4 | 서비스 shell(42줄). 공통 header · footer 정비 때마다 연쇄 수정 |
| 13 | `services/web-store/src/pages/pharmacy/StoreSignagePage.tsx` | 서비스(웹) | 21 | 13 | 3 | 대형 화면(1,030줄). signage 는 플랫폼 공통 구조(§13)를 소비 |
| 14 | `SETUP.md` | 문서 | 31 | 15 | 2 | 환경 · 검증 절차 정본 |
| 15 | `services/web-neture/src/pages/operator/ProductServiceApprovalPage.tsx` | 서비스(웹) → 공통 패키지로 이전 완료 | 11 | 9 | 4 | 지금은 `operator-core-ui` 를 감싸는 4줄 파일. 충돌은 이전 중에 발생 |
| 16 | `.github/workflows/ci-pipeline.yml` | 문서 · CI | 35 | 17 | 1 | CI 본체(1,040줄 · required check `CI Gate`) |
| 17 | `docs/work-orders/WO-O4O-OPERATOR-COMPLEXITY-PHASE2-TODO-V1.md` | 문서 | 14 | 14 | 2 | WO 진행표 |
| 18 | `docs/work-orders/WO-O4O-AUTH-KAKAO-AND-EXPLICIT-LINK-V1.md` | 문서 | 19 | 19 | 0 | WO 본문 · 진행표 |
| 19 | `packages/shared-space-ui/src/index.ts` | 공통 패키지 | 18 | 13 | 2 | 공통 UI barrel(357줄 · export 136개) |
| 20 | `apps/api-server/src/controllers/operator/MembershipConsoleController.ts` | core | 16 | 10 | 3 | 공통 회원 · 운영 콘솔 controller(1,632줄) |

**21~25위 (참고):** `services/web-store/src/App.tsx`(서비스 · 충돌 2) · `packages/auth-react/src/index.ts`(공통 패키지 · 2) · `services/web-store/src/components/RootShell.tsx`(서비스 · 2) · `docs/work-orders/WO-O4O-AUTH-REFACTOR-V1.md`(문서 · 1) · `services/web-neture/src/pages/O4OHomePage.tsx`(서비스 · 2).

**열린 PR 과 겹치는 상위 파일:** #968 이 1 · 2 · 6번을 바꾼다. migration lane 에 들어가는 PR 이다. #973 은 16번을 바꾼다.

### 2-1. 분류별 집계 (60일 전체 파일)

| 분류 | 충돌 횟수 | 동시 수정이 있었던 파일 수 | 동시 수정 PR 쌍 |
|---|---:|---:|---:|
| 서비스(웹) | **154** | 1,138 | 2,418 |
| core(API 플랫폼) | **100** | 750 | 1,352 |
| 문서 | 22 | 642 | 1,297 |
| 서비스(API 모듈) | 20 | 265 | 408 |
| 공통 패키지 | 17 | 187 | 404 |
| 문서 · CI(workflow · scripts) | 7 | 92 | 236 |
| core(`packages/*-core`) | 1 | 33 | 35 |
| extension | 0 | 0 | 0 |

- 공통 패키지 자체의 충돌은 적다(17건). 공통 구조를 바꾸는 PR 이 **서비스 쪽 소비 파일**(App · Shell · 진입 판정 · 화면)을 함께 고치기 때문에 충돌이 서비스(웹)에 쌓인다.
- core(API 플랫폼) 충돌 100건 가운데 37건이 migration 등록부다. 나머지는 route 등록 · 공통 controller · startup 같은 허브 파일이다.
- extension 계층은 60일간 거의 수정되지 않았다(파일 1개). 이번 개선안은 core · 공통 패키지 · 서비스 세 층을 대상으로 한다.

### 2-2. 충돌 PR 의 성격

- 상위 파일 충돌을 많이 일으킨 PR: #345(Assistant · 8일 열림), #641(운영자 초대 통일 · 10일), #758(운영 문의함 · 공통 shell), #945(signage · 1일), #586(보류 PR 통합).
- **긴 수명 PR 과 공통 shell · 진입 판정을 넓게 바꾸는 PR** 이 충돌의 주원인이다. 짧은 단일 화면 정비 PR 은 대부분 충돌 없이 병합됐다.

---

## 3. 파일별 구조 개선안 (분류 기준)

작업량: S = 반나절 이하 · M = 1~2일 · L = 3일 이상.
위험은 실패 시 영향이다. **모든 안은 별도 WO 로 진행한다.** 아래 "승인" 열은 AGENTS.md §5 기준으로 사전 확인이 필요한 항목이다.

### 3-1. core

| 대상 | 개선안 | 작업량 | 위험 | 승인 |
|---|---|:-:|:-:|---|
| 1 · 2 migration 등록부 | **(a) migration lane 규칙**: migration 을 포함한 Ready PR 은 동시에 1개만 둔다. 나머지 PR 은 migration commit 을 마지막에 붙이고 lane 이 비면 Ready 로 바꾼다. 코드 변경이 없다 | S | 낮음 | 규칙 문서 변경(통합 담당 결정) |
| | **(b) 재생성 규칙**: 충돌이 나면 main 쪽을 그대로 받은 뒤 자기 migration 의 epoch 를 새로 받고 다시 append 한다. 격리 PG bootstrap 으로 fingerprint 를 다시 계산하는 **로컬 스크립트**를 둔다(`disposable-postgres-fixture` 재사용). 정본의 "CI 가 재생성하지 않는다 · 자동 채택하지 않는다"는 유지한다. 실행 주체는 작성 세션이다 | M | 중간 | migration 계약 도구 추가 — WO |
| | **(c) manifest 생성 파일화**: `manifest.ts` 를 `migrations/` 의 epoch 정렬로 생성하고, CI 에서 "생성 결과 = 커밋본"을 검사한다. import 충돌은 사라진다. fingerprint 사슬의 직렬성은 그대로라서 (a) 를 대체하지 못한다 | M | **높음** | Core · migration 계약(`check-migration-contract.mjs`) 변경 — 명시 WO 필수 |
| 11 `register-routes.ts` | 서비스 · 도메인별 registrar(`modules/<x>/register.ts` 가 `(app, deps) => void` 를 export)로 나눈다. 중앙 파일은 **정렬된 registrar 배열**만 둔다. 등록 순서에 의미가 있는 route(catch-all · 전역 middleware 앞뒤)는 배열 앞뒤의 명시 구간으로 고정한다. 순서 snapshot 테스트를 추가한다 | M | 중간 | route 계약 불변 확인. 경로 · guard 변경 0 이 조건 |
| 20 `MembershipConsoleController.ts` | 진행 중인 "같은 기능 모듈을 함수로 묶는 정리"와 같은 방향이다. 승인 · 생애주기 · 자격 · 조회를 기능별 handler 파일로 나누고, controller 는 route ↔ handler 연결만 맡는다. guard 위치는 바꾸지 않는다(F9 RBAC · F11) | M | 중간 | 권한 변경 0 이 조건. 순수 이동 PR 로 진행 |
| `startup.service.ts` 등 기타 허브 | 같은 원칙: 등록 목록은 정렬된 배열, 내용은 기능 파일 | S | 낮음 | — |

### 3-2. 공통 패키지

| 대상 | 개선안 | 작업량 | 위험 | 승인 |
|---|---|:-:|:-:|---|
| 19 `shared-space-ui/src/index.ts` · `auth-react/src/index.ts` | **기능별 barrel**(`src/footer/index.ts` · `src/inbox/index.ts` …)을 두고 루트 `index.ts` 는 `export * from './<기능>'` 한 줄씩 **알파벳순**으로 둔다. 새 기능을 추가하면 자기 폴더 안에서만 바뀌고 루트는 한 줄만 늘어난다. `package.json` 의 `exports` subpath 방식은 dependency 설정 변경(§5)이라 2순위로 둔다 | S~M | 낮음 | 없음(공개 API 이름 불변) |
| 12 · 23 서비스 `SiteShell` · `RootShell` (공통 정비가 서비스로 번지는 경로) | `shared-space-ui` 에 **`ServiceShell`(slot · 설정 기반)** 을 두고, 서비스는 `nav` · 메뉴 · 브랜드 설정만 넘긴다. header · footer · 계정 메뉴 정비는 패키지 한 곳만 바꾼다 → 서비스 N 개 연쇄 수정이 사라진다. 서비스별 차이가 큰 shell 은 slot 으로 남긴다 | L(서비스 수만큼) | 중간 | 공통 layout 변경 — Shared Module Protocol 의 전 소비처 확인, 서비스별 desktop/mobile smoke |
| 15 이전 중 파일(서비스 → `operator-core-ui`) | 이전은 **순수 이동 PR** 으로 짧게(2시간 이내) 끝낸다. 이전 PR 이 열려 있는 동안 해당 파일을 다른 PR 이 고치지 않도록 §6 Action 이 경고한다. 이전 후 서비스 파일은 4줄 래퍼로 남아 충돌이 사라진다(이미 증명됨) | S | 낮음 | — |

### 3-3. 서비스

| 대상 | 개선안 | 작업량 | 위험 | 승인 |
|---|---|:-:|:-:|---|
| 3 `web-neture/App.tsx` · 21 `web-store/App.tsx` | 영역별 route 모듈(`routes/public.tsx` · `operator.tsx` · `admin.tsx` · `store.tsx` …)로 나눈다. `App.tsx` 는 provider + 모듈 조합만 맡는다. route 정의는 `RouteObject[]` 배열로 두고, 각 배열 안은 path 알파벳순으로 정렬한다 | M | 중간 | route 경로 · guard 불변. 직접 URL · 메뉴 진입 smoke(desktop · mobile) |
| 9 `home-entry.ts` | 역할 · 서비스별 resolver 를 **표(배열)로 등록**하고 파일을 나눈다(`entry/resolvers/*.ts`). 판정 순서는 표의 순서로 명시하고 기존 단위 테스트를 그대로 통과해야 한다 | M | 중간~높음(로그인 직후 이동) | 판정 결과 불변 테스트 |
| 10 `neture-pharmacy.routes.ts` | 기능별 sub-router(membership · commerce · semi-franchise …)로 나누고 index 는 `router.use()` 만 둔다 | S~M | 중간 | 경로 · guard · Boundary 필터 불변 |
| 13 `StoreSignagePage.tsx` | 탭 · 패널 단위 컴포넌트로 나눈다. 데이터 로직은 hook 으로 뺀다. signage 는 플랫폼 공통 구조(§13)이므로, 같은 로직이 다른 서비스에도 있으면 공통 UI 로 올린다 | M | 낮음~중간 | UI smoke |

### 3-4. 문서 · CI

| 대상 | 개선안 | 작업량 | 위험 |
|---|---|:-:|:-:|
| 5 · 7 · 17 · 18 WO 진행표 | **진행표는 통합 담당(또는 통합 세션)만 갱신한다.** 작업 세션은 PR 설명에 "TODO 항목 ID → 완료"를 적는다. 또는 항목마다 파일을 따로 둔다(`<WO>/items/<id>.md`) | S | 낮음 |
| 4 `CANONICAL-INDEX.md` · 6 기준 문서 · 14 `SETUP.md` | 기능 PR 에 기준 문서 수정을 섞지 않고 **문서 전용 소형 PR** 로 분리한다(빠른 경로 #973 과 맞물림). 기준 문서의 결정 기록은 절 끝 append 로 쓴다 | S | 낮음 |
| 8 `pharmacyhub-qr-cutover.yml` | 단계 로직은 `scripts/` 의 `.mjs` 로 옮기고 workflow 는 얇은 진입점으로 둔다. cutover 가 끝나면 은퇴한다 | M | 중간(§5 CI · 배포 인프라) |
| 16 `ci-pipeline.yml` | job 묶음별 reusable workflow 또는 composite action 으로 나눈다. `CI Gate` 이름 · needs · 실패 전파는 그대로 둔다 | M~L | **높음**(required check) |

### 3-5. 우선순위 제안

1. **규칙만으로 되는 것(코드 0)**: migration lane, WO 진행표 갱신 주체, 문서 전용 PR 분리, 짧은 PR 규칙(§4). → 즉시 효과가 크다(상위 20 중 9개 파일).
2. §6 겹침 알림 Action → 규칙을 사람이 기억하지 않아도 되게 한다.
3. 공통 패키지 barrel 정렬 · `App.tsx` route 모듈 분리 · `register-routes` registrar 분리 (S~M, 중간 위험).
4. `ServiceShell` 통합 (L) — 공통 정비가 서비스로 번지는 경로를 구조적으로 끊는다. 효과는 가장 크지만 전 서비스 smoke 가 필요하다.
5. migration manifest 생성 파일화 — Core · migration 계약 변경이라 마지막에 별도 판단한다.

---

## 4. 현재 작업 방식에 맞춘 병렬 작업 규칙 (제안)

전제(사용자 설명): 새 기능보다 UI · UX 정비가 많다. 공통 구조(core + 공통 패키지)를 한 번 고치면 여러 서비스가 함께 바뀐다. 같은 기능 모듈을 함수로 묶는 정리가 진행 중이다. 하루 병합은 중앙값 13건이다.

| # | 규칙 | 근거(이번 조사) |
|---|---|---|
| R1 | **공통 lane 직렬화** — 같은 공통 패키지(`packages/<이름>`) 또는 core 허브 파일(§2 의 core 행)을 바꾸는 **Ready PR 은 동시에 1개**만 둔다. 다른 세션은 드래프트로 개발을 계속하고, lane 이 비면 `origin/main` 을 merge 한 뒤 Ready 로 바꾼다 | 공통 변경이 서비스 파일로 번져 서비스(웹) 충돌 154건 |
| R2 | **core 먼저, 서비스 나중 (expand → migrate → contract)** — ① core/공통 패키지 PR 은 **기존 API 를 유지한 채 새 API 를 추가**만 한다. ② 그 PR 이 병합되면 서비스별 소비 전환을 **서비스당 1 PR** 로 병렬 진행한다. ③ 마지막에 옛 API 제거 PR 을 낸다. 한 PR 이 공통 + 서비스 N 개를 같이 바꾸지 않는다 | #345 · #641 · #758 같은 광역 PR 이 상위 파일 충돌의 다수 |
| R3 | **이동 PR 분리** — "함수로 묶는 정리"(파일 이동 · 추출)는 동작 변경 없는 **순수 이동 PR** 로 2시간 안에 병합한다. 제목 prefix `move:`. 열려 있는 동안 다른 PR 은 그 파일을 고치지 않는다(§6 Action 경고) | 15번 파일: 이전 중 충돌 4건, 이전 후 0 |
| R4 | **migration lane** — migration 을 포함한 Ready PR 은 1개. migration commit 은 PR 마지막에 둔다(§3-1 (a)) | 상위 1 · 2위 · 37건 |
| R5 | **짧은 PR** — 8시간을 넘기면 계속 작업하기 전에 `origin/main` 을 merge 한다. 24시간을 넘길 작업은 R2 단위로 쪼갠다 | 충돌률 2h 이하 5% → 24h 초과 36% |
| R6 | **허브 파일 추가 규칙** — route · registrar · barrel · 등록 배열에는 끝에 붙이지 않고 **정렬된 자리**에 한 줄만 추가한다. 내용은 자기 기능 파일에 둔다 | 3 · 11 · 19번 |
| R7 | **하루 통합 순서** — 통합 담당이 병합할 때 core/공통 lane PR → migration lane PR → 서비스 PR → 문서 PR 순으로 처리한다. 앞 PR 이 병합되면 뒤 PR 의 CI 를 재확인한다 | 하루 병합 중앙값 13 · 최대 57 |

- 기존 [`AGENTS.md` §4-1(g)](../../AGENTS.md)는 "코드 개발은 병렬, 공유 runtime 변경은 직렬"이다. R1 · R4 는 이 원칙을 **공유 코드 허브**까지 넓힌 것이다. 채택 여부는 통합 담당이 결정하며, 채택하면 `AGENTS.md` §4-1 에 반영하는 별도 문서 PR 이 필요하다.
- R1 의 "Ready 1개"는 처음에는 §6 Action 의 경고(코멘트 · 라벨)로 운영한다. 강제 차단(required check)은 1~2주 관찰한 뒤 판단한다.

---

## 5. Delivery · Promote — 무엇을 어디에, 병합마다 운영 반영되는가

### 5-1. 현재 구조 (코드 기준: `.github/workflows/delivery.yml` · `promote.yml` · `scripts/ci/deploy-orchestrate.mjs` · `deploy-risk.mjs`)

```text
PR merge → main push → CI Pipeline(main) → [workflow_run] Delivery
  classify: 서비스별 "서빙 중인 SHA → 이번 main SHA" diff 로 위험 등급 판정 (+ DEPLOY_FREEZE · CI gate)
    LEVEL 1  runtime 무영향(문서 · CI · 테스트)       → 배포 없음
    LEVEL 2  일반 runtime 변경                      → 자동 verified 배포 (운영 반영)
    LEVEL 3  migration · auth · rbac · 접근제어 · secret · 결제 · 배포 설정 · 서비스 삭제 · 판정 불가
                                                   → 자동 배포 차단(HELD_LEVEL_3) → Promote 대기
  deploy-api (o4o-core-api + migration Job) → API 에 의존하는 web → 독립 web(병렬) · admin
  report: 서빙 SHA 확인 → commit status `production`

Promote(workflow_dispatch · 통합 담당) → delivery.yml 을 mode=promote 로 호출
  → 입력 SHA(= main HEAD)까지의 누적 변경을 LEVEL 3 포함 배포 (같은 SHA 의 LEVEL 2 서비스도 함께)
```

| workflow | 배포 대상 | 배포 위치 |
|---|---|---|
| `deploy-api.yml` | API `o4o-core-api` + migration Job(운영 DB) | GCP Cloud Run · 프로젝트 `netureyoutube` · `asia-northeast3` |
| `deploy-web-services.yml` | 서비스별 web(neture · kpa-society · lecture · store · kpa-branch · hospital-pharmacy · partner 등) | 같음 |
| `deploy-admin.yml` | 관리자 대시보드 | 같음 |
| `delivery.yml` | 위 셋을 `workflow_call` 로 호출하는 **자동 진입점** | — |
| `promote.yml` | `delivery.yml` 을 promote 모드로 호출하는 **수동 진입점**(LEVEL 3 · 첫 rollout) | — |

**답: 병합할 때마다 운영까지 반영되는가?**

- **LEVEL 2 변경은 그렇다.** 병합 → main CI 성공 → Delivery 가 자동으로 verified rollout 을 한다. 다만 concurrency 그룹 `delivery-production`(`cancel-in-progress: false`)은 대기 run 을 1개만 유지한다. 그래서 짧은 시간에 여러 번 병합하면 중간 run 은 대체(SUPERSEDED)되고 마지막 run 이 누적 변경을 배포한다. 지금도 이미 "약한 묶음 배포"가 일어나고 있다.
- **LEVEL 3 변경은 아니다.** 병합 후 HELD 상태로 남는다. 통합 담당이 Promote 를 1회 실행해야 반영된다. LEVEL 3 가 대기 중인 서비스는 그 뒤의 LEVEL 2 변경도 함께 막힌다(누적 판정 · 「LEVEL_3 누적 표시」).
- LEVEL 1(문서 · 테스트 · CI)은 배포하지 않는다.
- 30일 실측(IR-O4O-PRIVATE-CI-BUDGET-V1 §8-2 · 2026-09-30~10-29 · dry-run 포함): Delivery 624회 · 3,743분, Promote **207회** · 4,412분(하루 약 7회, 회당 약 21분), main push CI 664회 + CodeQL 664회 · 23,822분.

### 5-2. "병합은 자주, 운영 반영은 묶어서" — 바꿔야 할 것

**권장안 A — 하루 2회 release train (Delivery 트리거 변경)**

| 바꿀 것 | 내용 | 위험 · 승인 |
|---|---|---|
| ① `delivery.yml` 트리거 | `workflow_run`(main CI 마다)을 빼고 `schedule`(예: KST 12:40 · 18:40 — 정시를 피한다)과 `workflow_dispatch`(통합 담당의 수동 release)를 둔다. 판정 로직은 이미 "서빙 SHA → target 누적 diff" 라서 묶음 배포를 그대로 처리한다 | CI · 배포 인프라 변경(§5) — 통합 담당 승인 · WO |
| ② target 선택 | 지금 target 은 "CI 를 끝낸 그 commit"이다. 앞으로는 **"main 에서 CI 가 green 인 가장 최근 SHA"** 를 고른다. `deploy-orchestrate.mjs` 에 선택 함수를 추가한다. CI 진행 중인 HEAD 는 건너뛴다 | 중간 — 판정 스크립트 테스트 필수 |
| ③ WIF provider 조건 | README 기준 provider 조건에 "허용 workflow · **소유자 dispatch**"가 있다. `schedule` 이벤트의 actor 가 이 조건을 통과하는지 확인해야 하고, 통과하지 않으면 조건을 바꿔야 한다 | **IAM/WIF 변경 — 통합 담당 승인 필수.** 미확인(이번 조사는 GCP 조회 없음) |
| ④ LEVEL 3 묶음 | Promote 를 "LEVEL 3 병합마다"가 아니라 **release train 시점에 1회**로 바꾼다. 같은 train 의 LEVEL 2 도 함께 나간다(현행 promote 동작 그대로). migration 이 여러 개면 manifest 순서대로 한 번에 실행된다 | **migration 묶음은 운영 DB DDL 을 한 번에 여러 개 적용**한다. migration 이 있는 train 은 통합 담당이 개별 확인한다(§5) |
| ⑤ hotfix 경로 | 장애 수정은 지금의 `promote.yml` 을 `services` 를 지정해 즉시 실행한다(코드 변경 없음) | 낮음 |
| ⑥ 문서 | README 「배포」 · AGENTS §4-1(f) · `PRODUCTION-MIGRATION-STANDARD` 의 "main push → 자동 배포" 서술을 train 기준으로 고친다 | 문서 PR |

**대안 B — 트리거는 두고 배포 창 변수만 추가:** 저장소 변수(예: `DELIVERY_WINDOW`)로 창 밖에서는 classify 만 하고 commit status 를 `pending(train 대기)`로 남긴다. 변경은 작지만 classify run 은 그대로 돈다(절감 약 1/3).

**대안 C — main push CI 까지 묶기:** GitHub merge queue 를 쓰면 여러 PR 을 묶어 CI 를 1회 돌릴 수 있다. 다만 merge queue 는 **조직 소유 저장소** 기능이다(이 저장소는 개인 계정 소유로 보인다). 적용 가능 여부는 확인이 필요하다. 그 대신 "main commit 의 tree 가 PR 의 마지막 green merge-ref tree 와 같으면 CI 결과를 재사용" 하는 방안은 IR-O4O-PRIVATE-CI-BUDGET-V1 §4 의 남은 과제와 같은 축이다.

### 5-3. Actions 사용량 변화 (추정 · 30일 · 청구 기준 분)

| 항목 | 현재 | 권장안 A (하루 2회 train) | 근거 |
|---|---:|---:|---|
| Delivery | 3,743 (624 run · 평균 6분) | 약 600~900 (60 run · 묶음이라 회당 10~15분) | 배포 build 는 서비스당 train 1회로 줄어든다 |
| Promote | 4,412 (207 run · 평균 21분) | 약 600~1,300 (train 당 0~1회 · hotfix 포함 30~60 run) | LEVEL 3 를 train 에 흡수 |
| main push CI · CodeQL | 23,822 | 23,822 (변동 없음) | Delivery 의 CI gate 가 target SHA 의 green 을 요구하므로 유지 |
| **배포 계열 합계** | **약 8,150** | **약 1,200~2,200** | **월 약 5,950~6,950분 감소**(표준 Linux $0.006/분 기준 약 $36~42) |

- 지금은 저장소가 공개라 표준 실행기 비용이 없다. 위 금액은 비공개로 전환할 때의 의미다. 앞의 IR 은 "배포 계열 잔여 9,200분이 Pro 포함 3,000분을 넘는다"고 봤다. 권장안 A 를 적용하면 이 잔여가 **약 2,300~3,300분**이 되어 Pro 포함분 근처로 내려온다.
- 대안 B 는 classify 만 남는다(624 run × 1~2분). 그래서 배포 build 절감만 생기고 감소폭은 약 4,500~5,500분이다.
- Cloud Build · Artifact Registry · Cloud Run revision 생성 횟수도 비슷한 비율로 줄어든다(GCP 비용 · 미실측).

### 5-4. 묶음 배포의 대가

- **한 번 배포에 변경이 많아져** 장애 원인을 좁히기 어렵다. verified rollout(0% → 검사 → 전환 · API 자동 복귀)은 서비스 단위로 그대로 작동하지만, 롤백하면 그 train 의 해당 서비스 변경이 전부 되돌아간다.
- 병합 후 운영 확인까지 최대 반나절 지연된다. UI 정비 결과를 운영에서 바로 확인하던 흐름이 바뀐다 → hotfix 경로(⑤)를 함께 운영한다.
- migration 이 여러 개 묶이면 forward-only DDL 이 한 번에 적용된다. migration 이 있는 train 은 통합 담당이 개별 확인한다.

---

## 6. 겹치는 열린 PR 자동 코멘트 Action — 초안 (커밋하지 않음)

목적: AGENTS.md §4-1(e) 「겹치는 PR 표시」를 자동화한다. §4 의 R1 · R3 · R4 lane 경고도 함께 낸다.

설계:

- `pull_request`(not `_target`) — 이 저장소의 branch PR 만 대상으로 한다. fork PR 은 토큰이 읽기 전용이라 코멘트를 skip 한다.
- **코멘트는 PR 당 1개를 갱신**한다(marker 로 찾아 update). push 마다 새 코멘트가 쌓이지 않는다.
- 트리거는 `opened` · `reopened` · `ready_for_review` 만 둔다. `synchronize` 는 쓰지 않는다. 앞 IR §8-4 의 "1분 미만 job 의 분 단위 올림 손실"을 피하기 위해서다. 월 약 520 run × 1분 = **약 520분**(공개 저장소인 지금은 무료)이다. 더 줄이려면 CI Pipeline 의 Detect job 안 step 으로 넣는다(추가 job 0).
- 다른 PR 에는 코멘트를 남기지 않는다(알림 소음 방지). 상대 PR 은 자기 PR 이 갱신될 때 같은 코멘트로 알게 된다.

```yaml
# .github/workflows/pr-overlap-notice.yml (초안)
name: PR Overlap Notice
on:
  pull_request:
    types: [opened, reopened, ready_for_review]
permissions:
  contents: read
  pull-requests: write
concurrency:
  group: pr-overlap-${{ github.event.pull_request.number }}
  cancel-in-progress: true
jobs:
  notice:
    if: github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-latest
    timeout-minutes: 3
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            const MARK = '<!-- pr-overlap-notice -->';
            const { owner, repo } = context.repo;
            const me = context.payload.pull_request.number;
            // lane 파일: R1 공통 · core 허브, R4 migration (§2 상위 표 기준 — 별도 설정 파일로 빼도 된다)
            const LANES = [
              { name: 'migration', re: /^apps\/api-server\/src\/database\/incremental\/(manifest|expected-schema-states)\.ts$|^apps\/api-server\/src\/database\/migrations\// },
              { name: 'api-route-hub', re: /^apps\/api-server\/src\/bootstrap\/register-routes\.ts$/ },
              { name: 'shared-package', re: /^packages\/([^/]+)\// },
              { name: 'service-route-hub', re: /^services\/[^/]+\/src\/App\.tsx$/ },
              { name: 'wo-progress', re: /^docs\/work-orders\/.*TODO.*\.md$/ },
            ];
            const files = async (n) => (await github.paginate(github.rest.pulls.listFiles,
              { owner, repo, pull_number: n, per_page: 100 })).map(f => f.filename);
            const mine = new Set(await files(me));
            const open = await github.paginate(github.rest.pulls.list, { owner, repo, state: 'open', per_page: 100 });
            const rows = [];
            for (const pr of open) {
              if (pr.number === me) continue;
              const both = (await files(pr.number)).filter(f => mine.has(f));
              if (!both.length) continue;
              const lanes = [...new Set(both.flatMap(f => LANES.filter(l => l.re.test(f))
                .map(l => l.name === 'shared-package' ? `shared-package:${f.split('/')[1]}` : l.name)))];
              rows.push({ pr, both, lanes });
            }
            let body;
            if (!rows.length) {
              body = `${MARK}\n**겹치는 열린 PR 없음** (확인 시점 기준).`;
            } else {
              body = [MARK, '### 같은 파일을 바꾸는 열린 PR',
                '| PR | 상태 | 겹치는 파일 | lane |', '|---|---|---|---|',
                ...rows.map(({ pr, both, lanes }) =>
                  `| #${pr.number} ${pr.title.replace(/\|/g, '/')} | ${pr.draft ? 'Draft' : 'Ready'} | ` +
                  `${both.slice(0, 8).map(f => '`' + f + '`').join('<br>')}${both.length > 8 ? `<br>외 ${both.length - 8}개` : ''} | ` +
                  `${lanes.join(', ') || '-'} |`),
                '',
                rows.some(r => r.lanes.length && !r.pr.draft)
                  ? '> ⚠️ lane 파일을 바꾸는 **Ready PR** 이 이미 있습니다. 그 PR 이 병합될 때까지 이 PR 은 드래프트로 두는 것을 권장합니다 (IR-O4O-PR-FILE-OVERLAP-AND-CONFLICT-HOTSPOTS-V1 §4).'
                  : '> PR 설명의 「겹치는 PR」 칸에 위 PR 을 적어 주세요 (AGENTS.md §4-1(e)).',
              ].join('\n');
            }
            const comments = await github.paginate(github.rest.issues.listComments, { owner, repo, issue_number: me, per_page: 100 });
            const prev = comments.find(c => c.user.type === 'Bot' && c.body.includes(MARK));
            if (prev) await github.rest.issues.updateComment({ owner, repo, comment_id: prev.id, body });
            else await github.rest.issues.createComment({ owner, repo, issue_number: me, body });
```

도입 시 확인할 것:

- 새 workflow 추가는 §5 의 CI 변경이다 → 통합 담당 승인 후 별도 PR 로 낸다. `actions/github-script` 버전은 저장소의 기존 action 고정 방식(태그 · SHA)에 맞춘다.
- 실제 git 충돌 예측(`git merge-tree`)까지 하려면 checkout 이 필요해 실행 시간이 늘어난다. 1차는 "파일 겹침"만 알리고, 충돌 예측은 2차로 둔다.
- 열린 PR 이 많아지면 `listFiles` 호출이 PR 수만큼 늘어난다. 지금 규모(열린 PR 3~20개)에서는 문제가 없다.
- 라벨(`lane:migration` 등) 부착과 R1 강제(required check)는 2주 운영 후 판단한다.

---

## 7. 후속 WO 제안 (각각 별도 · 통합 담당 결정)

1. **규칙** — §4 R1~R7 의 채택 여부 결정 → `AGENTS.md` §4-1 반영 문서 PR. 코드 변경은 없다.
2. **Action** — §6 초안을 `pr-overlap-notice.yml` 로 도입한다(CI 변경 승인).
3. **구조 S~M** — 공통 패키지 barrel 정렬 · `web-neture`/`web-store` route 모듈 분리 · `register-routes` registrar 분리 · `neture-pharmacy.routes` sub-router. 각각 순수 이동 PR 로 진행한다.
4. **구조 L** — `ServiceShell` 공통화(Shared Module Protocol · 전 서비스 smoke).
5. **migration** — lane 규칙(즉시)과 재생성 스크립트(M). manifest 생성 파일화는 Core · 계약 변경이라 별도로 판단한다.
6. **배포** — release train(권장안 A): WIF 조건 확인(LOCAL · 통합 담당) → `delivery.yml` 트리거 · target 선택 변경 → README · AGENTS 문서 갱신.

## 8. 확인하지 못한 것

- rebase 로 해결한 충돌 수(§1 한계). 실제 충돌 수는 이 보고보다 많다.
- WIF provider 의 `schedule` 이벤트 허용 여부(GCP IAM 조회 필요 · LOCAL).
- 이 저장소에서 merge queue 를 쓸 수 있는지(계정 유형 · 요금제).
- §5-3 의 train 회당 시간은 추정이다. 적용 후 `actions-cost.mjs` 로 2주 실측해야 한다.

## 9. 문서 정합

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 6건(§7 — 신규 작업 제안이며 기준 문서 drift 는 아님)
