# CHECK — KPA Operator Dashboard Local Layout Override Implement V1

## 범위

- 공통 `OperatorDashboardLayout`과 공통 block 계약은 변경하지 않았다.
- KPA 전용 composer를 추가하고 KPA 운영자 대시보드만 opt-in 했다.
- API, 권한, KPI 종류, route, DB는 변경하지 않았다.

## 구현 결과

KPA 화면의 block 순서는 다음과 같다.

1. Action Queue — 항목이 있을 때만 렌더
2. KPI
3. Quick Actions
4. AI Summary — 항목이 있을 때만 렌더
5. Activity
6. 2축 네비게이션
7. 역할 안내

공통의 `ActionQueueBlock`, `KpiGrid`, `QuickActionBlock`, `AiSummaryBlock`,
`ActivityLogBlock`을 그대로 조합했으며 block markup은 복사하지 않았다.
`OperatorDashboardConfig` 데이터 계약과 기존 링크도 그대로 유지했다.

## 역할·반응형·타 서비스 영향

- `kpa:operator`와 `kpa:admin`은 기존 API 응답과 권한 분기를 그대로 사용한다.
- composer는 두 역할 모두 동일한 우선순위로 전달받은 데이터만 렌더한다.
- grid, 카드, 반응형 동작은 기존 공통 block component가 담당하므로 새 breakpoint나
  고정 폭을 추가하지 않았다.
- GP, KCos, Neture가 사용하는 공통 `OperatorDashboardLayout` 및 공통 exports/types는
  수정하지 않았다.

## 변경 파일

- `services/web-kpa-society/src/components/kpa-operator/KpaOperatorDashboardLayout.tsx`
- `services/web-kpa-society/src/pages/operator/KpaOperatorDashboard.tsx`
- `docs/investigations/CHECK-O4O-KPA-OPERATOR-DASHBOARD-LOCAL-LAYOUT-OVERRIDE-IMPLEMENT-V1.md`

## 검증

- `git diff --check` — PASS
- `pnpm --filter @o4o/web-kpa-society exec tsc --noEmit` — PASS
- `pnpm --filter @o4o/web-kpa-society run build` — PASS
- Deploy Web Services workflow — PASS (KPA만 배포, 타 web service job은 skip)
- `https://kpa-society.co.kr/operator` — HTTP 200
- Cloud Run service URL `/operator` — HTTP 200
- 배포 이미지와 구현 commit SHA 일치 — PASS
- 빈 Queue/AI 조건, block 순서, 두 역할 공통 composer 적용은 source/typecheck/build로 확인했다.
- 데스크톱·모바일은 기존 공통 block의 responsive grid를 그대로 재사용하고 고정 폭이나
  신규 breakpoint가 없음을 확인했다.
- 인증 브라우저 viewport smoke는 후속 WO에서 수행 완료 — 아래 §인증 브라우저 viewport smoke 참조.

## Git·배포 이력

- 설계 CHECK commit: `472f41516e9cc4f04a8dd288d97848ed51a5a6b5`
- 구현 commit: `ed3630c1430a21cb2f478b2f11c37382624c95a3`
- 배포 workflow: `30146461632` — success
- Cloud Run revision: `kpa-society-web-01698-rjz`
- 배포 image: `gcr.io/netureyoutube/kpa-society-web:ed3630c1430a21cb2f478b2f11c37382624c95a3`
- 운영 smoke: canonical/Cloud Run `/operator` HTTP 200

## 인증 브라우저 viewport smoke

WO-O4O-KPA-OPERATOR-DASHBOARD-AUTHENTICATED-VIEWPORT-SMOKE-V1 수행 결과 (2026-07-25).

### 실행 조건

- 대상: `https://kpa-society.co.kr/operator` (프로덕션)
- 브라우저: Playwright MCP, 실제 로그인 세션
- 계정: `sohae2100@gmail.com` (CLAUDE.md §15 → `docs/local/TEST-ACCOUNTS.local.md`)
- 로그인 경로: `/operator` 접근 → 미인증 `/login` redirect → 폼 로그인 → `/operator` 복귀
- `/api/v1/auth/status` 확인 roles: `kpa:operator`, `kpa:admin`, `platform:super_admin` 등 보유

### 역할 분리 한계 (실증된 제약)

- SSOT 자격 매트릭스에서 KPA admin·operator 행이 **동일 계정**이며, `kpa:operator` 전용 계정은 존재하지 않는다.
- backend `isAdmin = roles.includes('kpa:admin') || roles.includes('platform:super_admin')`
  (`apps/api-server/src/routes/kpa/controllers/operator-summary.controller.ts`) 이므로 이 계정은 항상 admin 분기로 응답한다.
- `isAdmin` 분기는 `operator-dashboard.service.ts` 에서 **KPI +1 (`total-members`)** 과
  **Quick Actions +2 (`qa-roles`, `qa-audit`)** 두 곳뿐이다. `aiSummary`, `actionQueue`,
  `activityLog`, block 순서에는 `isAdmin` 분기가 없다.
- 따라서 operator 역할 화면은 admin 화면의 **진부분집합**(KPI 8 / Quick Actions 6)이며,
  본 WO가 검증 대상으로 삼은 block 순서·빈 상태 조건은 role-independent 임이 소스로 확정된다.
  live 렌더는 admin superset 으로 수행했고, operator 전용 렌더는 계정 부재로 미수행이다.
- 서비스 코드 상 doc comment "Quick Actions 3 추가" 는 실제 구현(2개)과 불일치하는 stale 주석이다. 본 WO 범위 외로 수정하지 않았다.

### block 순서 (live DOM 실측)

`main` 하위 composer 자식 순서 — 3개 viewport 모두 동일.

| # | block | 렌더 |
|---|-------|:---:|
| — | Action Queue | 미렌더 (`actionQueue` 0건) |
| 1 | KPI (`Overview`) | ✅ 9개 (admin 분기 `전체 회원 6` 포함) |
| 2 | `Quick Actions` | ✅ 8개 (base 6 + admin 2) |
| — | AI Summary | 미렌더 (`aiSummary` 0건) |
| 3 | `Recent Activity` | ✅ 10건 |
| 4 | 2축 네비게이션 | ✅ 커뮤니티 운영 / 매장 HUB 운영 |
| 5 | 역할 안내 | ✅ "운영자는 관리자가 아닙니다" |

설계 순서와 일치한다. 운영 데이터가 0건인 상태를 그대로 실증했으며 테스트 데이터는 생성하지 않았다.

### 빈 Queue·AI 미렌더 실증

`GET /api/v1/kpa/operator/dashboard` → `actionQueue: 0`, `aiSummary: 0`,
`kpis: 9`, `activityLog: 10`. 3개 viewport 전부에서 DOM 내 Action Queue / AI Summary
텍스트 부재 확인. 빈 배열일 때 빈 카드·placeholder 를 남기지 않고 block 자체가 제거된다.

### viewport 3종

| viewport | 크기 | KPI grid | 가로 overflow | block 순서 |
|---|---|---|:---:|---|
| 데스크톱 | 1440×900 | 4열 (256px×4) | 없음 (scrollW=clientW=1425) | 동일 |
| 노트북 | 1280×800 | 4열 (222.25px×4) | 없음 (scrollW=clientW=1265) | 동일 |
| 모바일 | 390×844 | 2열 (163.5px×2) | 없음 (scrollW=clientW=375) | 동일 |

모바일에서 viewport 폭을 넘는 element 0건. 고정 폭·신규 breakpoint 없이 공통 block 의 responsive grid 만으로 재배치된다.

### Quick Action 목적지

base 6개는 클릭 이동, admin 추가 2개는 직접 진입으로 확인. 전부 정상 렌더(권한 오류·404 없음).

| # | label | route | 도착 화면 heading |
|---|-------|-------|------------------|
| 1 | 콘텐츠 관리 | `/operator/content` | 공지사항/뉴스 관리 |
| 2 | Home 편집 | `/operator/community` | Home 편집 |
| 3 | 콘텐츠 허브 관리 | `/operator/docs` | 콘텐츠 허브 관리 |
| 4 | 강의 관리 | `/operator/lms` | 강의 관리 |
| 5 | 사이니지 | `/operator/signage/hq-media` | HQ 미디어 관리 |
| 6 | 매장 관리 | `/operator/stores` | 매장 관리 |
| +A | 역할 관리 (admin) | `/operator/roles` | 역할 관리 |
| +A | 감사 로그 (admin) | `/operator/audit-logs` | 감사 로그 |

데드링크 0 / 권한 거부 0.

### 콘솔·네트워크

- 세션 전체 콘솔 error 3건 + warning 1건 — **전부 로그인 이전 bootstrap** 의 `auth/me`,
  `auth/refresh` 401 및 그에 따른 "Authentication failed. Tokens cleared." 이다. 미인증 상태의 정상 동작.
- 로그인 이후 신규 콘솔 error 0건.
- 네트워크: `/operator` 및 6+2 Quick Action 화면의 모든 `/api/v1/*` 요청 200. 404·403·5xx 0건.

### 코드 수정

없음. 본 smoke 에서 애플리케이션 코드·설정·DB 는 변경하지 않았다 (문서만 갱신).

## 보존·제외

- 기존 dirty `docs/investigations/CHECK-CODEX-ENV-SETUP-V1.md`는 수정·stage하지 않았다.
- 기존 untracked `.codex/`, `apps/api-server/_msm.mjs`,
  `apps/api-server/_msmx.mjs`는 수정·stage하지 않았다.
