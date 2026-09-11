# CHECK — kpa-branch 서비스 가입 승인/반려 플랫폼 관리자 UI

- **WO**: `WO-O4O-KPA-BRANCH-SERVICE-MEMBER-APPROVAL-UI-V1`
- **일자**: 2026-09-11
- **판정**: **`SERVICE_MEMBER_APPROVAL_UI_READY`** — 필수 10항목 중 10항목 실측 PASS(§5). 한계 4건(§8)은 READY 를 막지 않는다
- **선행**: [WO④ 신규 분회 개통 운영 절차](CHECK-O4O-KPA-BRANCH-NEW-TENANT-ONBOARDING-OPERATIONS-V1.md) · [service credential 온보딩](CHECK-O4O-KPA-BRANCH-SERVICE-CREDENTIAL-ONBOARDING-V1.md)
- **commit**: `63c934347` (화면·route·메뉴·권한표·테스트 3건) · `2131fce18` (행 액션 인라인 전환) · 본 CHECK 는 후속 커밋
- **환경**: 프로덕션 — 관리자 `https://admin.neture.co.kr` · API `https://api.neture.co.kr/api/v1` · DB `o4o_platform`(read-only 스냅샷)
- **CI**: Deploy Admin Dashboard `34565249169`(63c934347) · `34566081482`(2131fce18) success · CodeQL success · **CI Pipeline failure = 선행 커밋부터 동일한 api-server Jest 3건**(§9, 본 WO 무관)

> 이 WO 는 승인 로직을 만들지 않는다. 이미 있는 canonical API(`GET/PATCH /kpa-branch/admin/service-members*`)를
> **개발자 API 호출 없이 플랫폼 관리자가 화면에서 누를 수 있게** 하는 얇은 UI 다. 서버·guard·Identity·MembershipApprovalService 변경 0.

---

## 1. 조사 — 기존 Admin UI 재사용 여부

| 후보 | 결과 |
|---|---|
| kpa-branch 서비스 가입 승인 화면 | **0건** (admin-dashboard · web-kpa-society 모두 없음 — API 만 존재) |
| `pages/RoleApplicationsAdminPage.tsx` (역할 신청 승인) | **패턴 재사용** — 탭 · `BaseTable` · `RowActionMenu` confirm/showReason 구조를 그대로 따름. 화면 자체는 API(`/admin/role-applications`)·상태 어휘(`approved`)가 달라 직접 재사용 불가 |
| `OperatorsPage`(Service Operators) | 운영자 카탈로그 — 회원 승인과 축이 다름. 후속 WO(`WO-O4O-ADMIN-OPERATOR-CATALOG-KPA-BRANCH-V1`) 대상 |
| cross-service 공통 "서비스 회원 승인" 화면 | **만들지 않음**(WO 제약). kpa-branch 전용 1페이지 |

## 2. 변경 (admin-dashboard 만)

| 파일 | 변경 |
|---|---|
| `src/pages/kpa/BranchServiceMembersPage.tsx` | **신규** — 탭(대기중/승인됨/반려됨) · 컬럼(신청자 이름·이메일 / 서비스 `kpa-branch` / 신청일 / 상태) · 행 액션 승인·반려(인라인, `inlineMax={2}`) · 승인 toast "서비스 가입 승인 완료 — 분회 소속은 별도로 지정해야 합니다." |
| `src/routes/users.routes.tsx` | `/admin/kpa-branch/service-members` lazy route · `AdminProtectedRoute requiredRoles={PLATFORM_ADMIN_ROLES}` |
| `src/admin/menu/admin-menu.static.tsx` | Core 그룹 `core-kpa-branch-service-members` "분회 서비스 가입 승인" (Service Operators 다음) |
| `src/config/rolePermissions.ts` | `core-kpa-branch-service-members` → `PLATFORM_ADMIN_ROLES` (deny-by-default 표에 등록) |
| 테스트 3건 | `admin-authorization-registry-and-dead-surface-final-closure`(클릭 22→23 · 노드 27→28) · `admin-information-architecture`(EXPECTED_PATHS · PLATFORM_ONLY_MENUS) · `admin-menu-route-backend-alignment`(PLATFORM_SCOPED_SCREENS) |

**미변경**: `apps/api-server/**` 전부(guard · controller · MembershipApprovalService · auth-core) · `packages/ui` · 공통 레이아웃/CSS.

## 3. 승인/반려 계약 (UI 가 소비하는 그대로)

| 항목 | 계약 |
|---|---|
| 목록 | `GET /kpa-branch/admin/service-members?status=pending\|active\|rejected&limit=100` → `data.items[]`. **탭 "승인됨" = `status=active`** (서버 어휘에 `approved` 없음 — `status=approved` 는 400 `INVALID_STATUS`, 5-9 실측) |
| 승인 | `PATCH .../:id/approve` (body 없음) → membership `active` + `kpa-branch:member` role 활성 + 약사 profile 승격(Extension 경계). 허용 전이 = `pending\|rejected → active`, 그 외 404 `MEMBERSHIP_NOT_APPROVABLE` |
| 반려 | `PATCH .../:id/reject { reason }` — `reason` 필수(400 `REJECTION_REASON_REQUIRED`, 5-6 실측). 허용 전이 = `pending\|active → rejected`, 그 외 404 `MEMBERSHIP_NOT_REJECTABLE`. 해당 membership 의 role 만 비활성 |
| 축 분리 | 승인은 `service_memberships` 만 바꾼다. `branch_memberships` 생성 없음(5-5 · DB 스냅샷 §6) — 화면 confirm 문구·toast 로 "분회 소속 별도 지정" 안내만 |
| 클라이언트 검증 | 빈 반려 사유는 서버에 보내지 않고 toast 로 차단(2-7 실측) |

## 4. 권한

- **인가 경계 = 서버** `adminGuards = [requireAuth, requireKpaBranchScope('kpa-branch:admin')]`(platformBypass). 변경 없음.
- 프론트는 그 경계 안쪽에서 3중: App 진입 floor(`platform:super_admin` 단독) → route `AdminProtectedRoute requiredRoles=PLATFORM_ADMIN_ROLES` → 메뉴 `rolePermissions`(deny-by-default). UI 숨김을 보안으로 쓰지 않는다.
- 실측: `kpa-branch:member` 계정은 admin 사이트 로그인 시 "접근 권한 없음"(4-1) · deep-link 도 목록 0행(4-2) · API 직접 호출 403(5-3 목록 · 5-4 승인).
- `kpa-branch:operator` 는 **실측 계정 없음** → 코드 근거: `platformBypass` 는 `platform:super_admin` 에만 열리고 operator scope 는 `kpa-branch:admin` 요구를 통과하지 못한다(`requireKpaBranchScope`). PARTIAL(§8).

## 5. E2E (프로덕션 · Playwright · `w19_e2e.mjs`)

fixture = 영구 계정 `renagang21@gmail.com`(사용자 결정: 기존 계정 join 1건, 새 계정 생성·삭제 없음). membership `c172f920-27d1-47fb-889a-1002c9247c2e`.

| # | WO 필수 항목 | 실측 | 결과 |
|---|---|---|---|
| 1 | pending 목록 표시 | 1-3 join 201 → 1-5 SA 목록에 pending 행 · 2-4 브라우저 행(이름·이메일·신청일·`kpa-branch`·대기중) | PASS |
| 2 | 승인 (브라우저) | 2-9 confirm 에 "분회 소속은 이 화면에서 지정되지 않습니다" → 2-10 toast → 2-11 pending 에서 제거 → 2-12 승인됨 탭 표시 | PASS |
| 3 | membership active | 5-1 API `status=active` · DB 스냅샷 `sm\|kpa-branch\|active` | PASS |
| 4 | `kpa-branch:member` role | 5-1 `role=kpa-branch:member` · 5-2 kpa-branch 로그인 200 roles 포함 · DB `role\|kpa-branch:member\|true` | PASS |
| 5 | 반려 | 브라우저: 2-6 dialog(사유 입력) · 2-7 빈 사유 차단 · 2-8 취소 후 pending 유지. **API 실행**: 5-7 `active → rejected` 200(사유 `[TEST] …`) → 5-8 `rejected → active` 재승인 200 — 계약 확인용 호출이 실제 전이를 일으켰다(§8-3). 반려 전이·role 비활성/재활성 모두 실측 | PASS (브라우저 반려 실행은 미수행, dialog·검증·취소까지) |
| 6 | 필터 approved/rejected | 2-12 승인됨 탭(`status=active`) · 2-13 반려됨 탭 로드 · 5-10 `rejected` 200 items=0 | PASS |
| 7 | member/operator 차단 | member: 4-1 · 4-2 · 5-3 · 5-4 실측. operator: 코드 근거(§4) | PASS / operator PARTIAL |
| 8 | branch membership 자동 생성 없음 | 5-5 `/me/branch` → `organizationId` 없음 · DB `bm` 0 → 0 | PASS |
| 9 | 타 서비스 불변 | §6 스냅샷 diff = kpa-branch 3행 추가만 | PASS |
| 10 | 데스크톱/모바일 smoke | 2-0~2-13 데스크톱 · 3-1~3-3 모바일(가로 overflow 없음 · 탭 전환 · fixture 표시) | PASS |

부수 실측: 1-2 kpa-society 회원 → 403 · 1-4 중복 join 409 `ALREADY_PENDING` · 5-6 사유 없음 400 · 5-9 `status=approved` 400.

## 6. DB read-only 스냅샷 (fixture user 한정 · `w19_snap.sh`)

| 축 | before | after | 판정 |
|---|---|---|---|
| `service_credentials` | k-cosmetics · kpa-society · neture · pharmacy-hub (4) | + `kpa-branch` (5) | 기존 4건 불변 |
| `service_memberships` | 5건 active (k-cosmetics · kpa-society · neture · pharmacy-hub · platform) | + `kpa-branch active kpa-branch:member` (6) | 기존 5건 불변 |
| `role_assignments` | 9건 | + `kpa-branch:member is_active=true` (10) — 반려/재승인은 같은 row 를 토글 | 기존 9건 불변 |
| `branch_memberships` | 0 | 0 | 자동 생성 없음 |
| `kpa_pharmacist_profiles` | 1 | 1 | 불변 |

## 7. 회귀

- admin-dashboard: `tsc --noEmit` 0 · eslint 0 · vitest 15 files / 312 tests 통과(63c934347 시점, IA·권한 레지스트리 3 spec 갱신 포함).
- `RoleApplicationsAdminPage` 등 기존 화면 무변경. 공통 컴포넌트 `RowActionMenu` 무변경(기존 prop 만 사용).
- 프로덕션 번들 확인: `BranchServiceMembersPage-DmdNkI05.js` 에 `inlineMax:2` 포함.

## 8. 한계 · 관찰 (READY 를 막지 않음)

1. **행 액션 kebab 드롭다운이 고정 사이드바에 가려짐** — `RowActionMenu` 드롭다운은 `position:fixed z-[9999]` 지만 관리자 본문 래퍼(`admin-layout-fixed.css` 의 `position:relative; z-index:1`)가 stacking context 를 만들어 `.admin-sidebar`(z 9998) 아래로 깔린다. `_actions` system 컬럼이 표 왼쪽에 놓여 드롭다운(w-48, 트리거 우측 기준 좌정렬)이 사이드바 영역과 겹칠 때 클릭 불가(Playwright: `admin-sidebar intercepts pointer events`). **공통 레이아웃/컴포넌트 문제**로 `RoleApplicationsAdminPage` 등 같은 패턴 화면도 동일 조건에서 재현 가능. 본 WO 는 범위 밖이므로 이 화면만 `inlineMax={2}` 로 회피(2131fce18). → **별도 WO 제안**: `RowActionMenu` 드롭다운 portal 화 또는 admin 레이아웃 stacking 정리.
2. **`kpa-branch:operator` 차단은 코드 근거만** — 영구 operator 계정(`sohae2100`)이 `platform:super_admin` 을 겸해 실측 분리가 불가. PARTIAL.
3. **반려는 브라우저에서 실행하지 않음** — 사용자 결정(승인만 실제 실행). 다만 API 계약 확인 스크립트가 `active → rejected` 를 404 로 잘못 가정해 실제 반려·재승인이 1회 일어났다(fixture 최종 상태 active · role 활성 · 타 축 불변, §6). 결과적으로 반려 전이는 API 로 실측됐고 화면 반려는 dialog·빈 사유 차단·취소까지 검증.
4. **IA 긴장** — admin 사이트는 원칙상 서비스 전용 업무를 두지 않으나, WO 가 admin-dashboard 를 명시했고 backend guard 가 platformBypass(플랫폼 관리자 전용)이므로 Core(사람·권한) 그룹에 배치. 분회 운영자용 승인 화면이 필요해지면 web-kpa-society operator 축에서 별도 WO.

관찰(코드 결함 아님, 보고만): pending 상태 kpa-branch 로그인이 200 을 반환(auth core 정책 — 이전 실행에선 401 `SERVICE_NOT_MEMBER`, credential 생성 뒤 200) · 기존 사용자 join 시 body 의 name 은 무시되고 users.name 유지 · 목록 API 응답에 `phone` 포함(UI 미표시).

## 9. CI 참고

`CI Pipeline` 은 `e19aeb2aa`·`68b6d3896`·`63c934347` 모두 같은 api-server Jest 3건(`windows-app-window-control.spec.ts` · `ai-capability-tool-routing.spec.ts` — 한글 의도 키워드 ASCII 이스케이프 · browser-mode tool 0 단언)으로 실패 중. Local Work Agent 트랙 소관이며 본 WO 변경(admin-dashboard 만)과 무관. 별도 처리 필요.

## 10. 영구 계정 기록

`renagang21@gmail.com` 은 이번 WO 로 kpa-branch 서비스 **영구 회원(active · `kpa-branch:member` · credential 보유)** 이 됐다. 삭제하지 않는다. 분회 소속(`branch_memberships`)은 없음 — 이후 분회 소속 지정 E2E 의 fixture 로 재사용 가능.
