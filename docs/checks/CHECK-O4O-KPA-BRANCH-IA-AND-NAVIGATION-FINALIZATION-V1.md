# CHECK-O4O-KPA-BRANCH-IA-AND-NAVIGATION-FINALIZATION-V1

- **WO**: WO-O4O-KPA-BRANCH-IA-AND-NAVIGATION-FINALIZATION-V1
- **대상**: `services/web-kpa-branch` (분회 서비스 단일 tenant 코드)
- **성격**: 신규 기능 아님. 이미 구현된 화면을 실제 사용 흐름에 맞게 배치하고 중복·누락·잘못된 진입점을 정리
- **판정**: **PASS_WITH_DATA_NOTE** — 코드 결함 0, 남은 항목은 프로덕션 데이터(분회 미게시) 1건
- **작성일**: 2026-09-10

---

## 1. Route census (§1)

기준 진입은 두 가지이며 한 번들이 처리한다.
`BrowserRouter basename=detectBasename()` → 공용경로 `/kpa/{slug}` (basePath=`/{slug}`) 또는 자체 도메인 루트 (basePath=`''`).

### 1-1. 셸 밖 (AUTH / 레지스트리)

| route | 분류 | 비고 |
|---|---|---|
| `/` | PUBLIC | `DirectoryPage` — 분회 registry. 자체 도메인 진입에서는 없음 |
| `/login` | AUTH | `LoginPage` |
| `/reset-password` | AUTH | `ResetPasswordPage` |
| `/me` | MEMBER | `MyBranchPage` — 소속·전입/전출 이력. 셸 밖이므로 분회 nav 가 없다 |
| `*` | DEAD-END | `NotFoundPage` |

### 1-2. 분회 셸 안 (`BranchLayout`)

| route | 분류 | 메뉴 노출 |
|---|---|---|
| `(index)` | PUBLIC | 홈 |
| `notices` | PUBLIC | 공지 |
| `events` | PUBLIC | 행사 ← **본 WO 신설** |
| `resources` | PUBLIC | 자료실 |
| `officers` | PUBLIC | 임원소개 ← 메뉴 누락이었음 |
| `meetings` | MEMBER | 회의록 (공개 메뉴에 넣지 않는다 — §2 계약 유지) |
| `mypage` | MEMBER | 내 정보 ← **본 WO 신설** |
| `mypage/annual-report` | MEMBER | 신상신고 |
| `mypage/fees` | MEMBER | 회비 |
| `mypage/education` | MEMBER | 연수교육 |
| `mypage/events` | MEMBER | 행사 참가신청 |
| `operator/members` | OPERATOR | 회원관리 (대표 진입점) |
| `operator/annual-reports` | OPERATOR | 신상신고 검수 |
| `operator/fees` | OPERATOR | 회비 관리 |
| `operator/education` | OPERATOR | 연수교육 원장 |
| `operator/posts` | OPERATOR | 글 관리 |
| `operator/events` | OPERATOR | 행사 관리 |
| `operator/officers` | OPERATOR | 임원 명부 |
| `operator/site` | OPERATOR | 사이트 정보 |
| `operator/domains` | OPERATOR | 도메인 연결 |
| `*` | DEAD-END | `NotFoundPage` |

### 1-3. census 로 확정한 결함

| # | 유형 | 내용 |
|---|---|---|
| C1 | 메뉴에 없지만 살아있는 화면 | `officers` — 공개 임원 명부가 라우트만 존재 |
| C2 | 메뉴는 있으나 화면 없음 | 공개 행사 진입점 부재. `BranchEventService.listPublic` 은 이미 구현돼 있었다 |
| C3 | 누락 | `/mypage` 인덱스 없음 → 회원이 개별 화면 URL 을 알아야 진입 가능 |
| C4 | 중복/혼선 | 헤더 우상단 `내 분회`(`/me`, 셸 밖) 가 회원 대표 진입점처럼 보임 |
| C5 | 모바일 | nav 가 한 줄 가로 배치라 폭이 좁으면 잘림 |
| C6 | 권한 | 운영자 메뉴가 평면 나열이라 공개·회원 메뉴와 구분되지 않음 |
| C7 | 용어 | 화면 h1 과 메뉴 라벨 불일치 10곳 |
| **C8** | **권한** | **운영자에게 운영자 메뉴가 전혀 안 보임** (browser smoke 에서 발견) |
| **C9** | **권한** | **kpa-branch 미가입 로그인 사용자에게 회원 메뉴 노출** (browser smoke 에서 발견) |

`DEAD`/`UNREACHABLE` 라우트는 0건. LEGACY·REDIRECT 라우트도 0건 — 리다이렉트를 새로 만들지 않았다.

---

## 2. 최종 IA (§2~§4)

```
PUBLIC   홈 · 공지 · 행사 · 자료실 · 임원소개
MEMBER   내 정보 · 신상신고 · 회비 · 연수교육 · 행사 참가신청 · 회의록
OPERATOR 운영 · 회원   : 회원관리 / 신상신고 검수 / 회비 관리 / 연수교육 원장
         운영 · 콘텐츠 : 글 관리 / 행사 관리 / 임원 명부
         운영 · 분회 설정: 사이트 정보 / 도메인 연결
```

- **회의록은 공개 메뉴에 없다.** `branch_posts` 에 visibility 컬럼이 없어 공개 목록은 notice/resource 만 내려가고, meeting 은 `/me/posts`(member 가드)로만 조회된다 — 기존 계약 그대로.
- **회원에게 운영자·가입관리 메뉴를 노출하지 않는다.** 가입승인/Identity 는 이 콘솔에 섞지 않았다(§4).
- 운영자는 PUBLIC+MEMBER+OPERATOR 를 모두 본다.

---

## 3. 제거·수정한 중복 메뉴 (§6)

| 항목 | 처리 |
|---|---|
| 헤더 `내 분회`(`/me`) | `내 정보`(`{basePath}/mypage`) 로 교체. `/me` 라우트 자체는 유지(전입/전출 이력 화면) |
| 운영자 메뉴 평면 나열 | 3개 그룹(`운영 · 회원` / `운영 · 콘텐츠` / `운영 · 분회 설정`)으로 묶음 |
| 회원 업무 전문화면 | 유지. `operator/members` 콘솔이 `operator/annual-reports · fees · education` 로 링크하는 대표 진입점 구조는 이미 충족돼 있었다(변경 없음) |

메뉴 항목 **삭제는 0건**이다. 중복은 라벨·계층 정리로 해소했다.

---

## 4. Route 변경 (§10)

WO 권고 URL 과 실제 구현을 대조한 결과 **기존 라우트는 전부 권고와 일치**했다. 신설 2건만 추가했다.

| 변경 | route |
|---|---|
| 신설 | `events` (PUBLIC 행사 안내) |
| 신설 | `mypage` (MEMBER 인덱스) |
| 신설(메뉴만) | `officers` — 라우트는 이미 있었고 메뉴만 추가 |

기존 route 의 **rename·이동·삭제는 0건**. redirect 신설 0건.

---

## 5. 용어 통일 (§7)

메뉴 라벨과 화면 h1 을 다음 표로 맞췄다. **내부 코드명(컴포넌트·파일·API 경로)은 rename 하지 않았다.**

| 화면 | 이전 h1 | 확정 |
|---|---|---|
| `BranchOfficersPage` | 임원 · 위원회 | 임원소개 |
| `operator/OfficersPage` | 임원 · 위원회 | 임원 명부 |
| `MyEventsPage` | 분회 행사 | 행사 참가신청 |
| `operator/EventsPage` | 행사 | 행사 관리 |
| `MyFeePage` | 내 회비 | 회비 |
| `MyEducationPage` | 내 연수교육 | 연수교육 |
| `operator/FeeLedgerPage` | 연회비 관리 | 회비 관리 |
| `operator/EducationCreditsPage` | 연수교육 평점 | 연수교육 원장 |
| `operator/SiteSettingsPage` | 홈페이지 설정 | 사이트 정보 |
| `operator/MembersConsolePage` | 회원 업무 현황 | 회원관리 |

`App.tsx` 헤더의 route map 주석도 같은 용어로 갱신했다.

---

## 6. 권한 기반 navigation (§8)

**메뉴 숨김으로 보안을 대체하지 않았다. backend guard 는 한 줄도 변경하지 않았다.**

nav 그룹 구성:

```
groups = [ public,
           ...(!isAuthLoading && isAuthenticated && canUseMemberArea ? [member] : []),
           ...(!isAuthLoading && canOperate ? operatorGroups : []) ]
```

- `isAuthLoading` 동안 회원·운영자 그룹을 **아예 렌더하지 않는다** → 익명 메뉴가 잠깐 보였다 바뀌는 flicker 없음.
- 판정원은 `config/service.ts` 의 `ROLE_SCOPE_MAPPING` 하나뿐이며, backend `KPA_BRANCH_SCOPE_CONFIG.scopeRoleMapping` 과 1:1 이다.

### 6-1. C8 — 운영자 nav 미노출 (수정)

실측 (`POST /auth/login` serviceKey=kpa-branch → roles):

```
["kpa:store_owner","pharmacy-hub:operator","pharmacy-hub:admin",
 "platform:super_admin","cosmetics:admin","cosmetics:operator",
 "kpa:admin","kpa:operator","neture:operator","neture:admin"]
```

`kpa-branch:` 계열 역할이 **0건**이다. 그런데 backend 는 통과시킨다:

- `KPA_BRANCH_SCOPE_CONFIG.platformBypass = true`
- `isBranchServiceAdmin()` = `roles.includes('kpa-branch:admin') || roles.includes('platform:super_admin')`

즉 `/operator/*` 9개 화면은 전부 200 인데 프론트만 prefix 매칭으로 메뉴를 지우고 있었다 — §8 위반(“operator·admin → PUBLIC+MEMBER+OPERATOR”).

수정: `PLATFORM_ADMIN_ROLE = 'platform:super_admin'` 을 `ROLE_SCOPE_MAPPING` 3계층 전부에 추가.
프론트가 backend 보다 넓어지지 않도록 근거 파일 경로를 주석에 남겼다.

### 6-2. C9 — 비회원에게 회원 nav 노출 (수정)

`renagang21@gmail.com` 은 `POST /auth/login` (serviceKey=kpa-branch) 이 `401 SERVICE_NOT_MEMBER` 다.
그런데 형제 서비스(kpa-society) 세션으로 분회 화면에 들어오면 `isAuthenticated=true` 가 되어
회원 메뉴 6개가 모두 떴다. 실제로는 `/me/*` 가 전부 403 이라 전부 막힌 링크였다.

수정: 회원 그룹 · 헤더 `내 정보` 링크 · `MyPageIndexPage` 를
`satisfiesRole(roles, 'kpa-branch:member')` 로 좁혔다. 비회원에게는
`이 계정은 분회 서비스 회원이 아닙니다.` 안내를 보여주고 회원 API 를 호출하지 않는다(403 을 ‘확인 불가’ 로 오인시키지 않는다).

---

## 7. 대시보드 진입점 (§5) — 새 통계 API 없음

**신규 API·신규 집계 엔드포인트 0건.** 기존 회원 API 5개를 독립 호출해 표현했다.

| 카드 | 사용 API | 표시 |
|---|---|---|
| 현재 소속 | `getMyBranchHistory` + `listBranches` | 분회명 |
| 신상신고 | `getAnnualReport` | 미제출(todo) / 기간 아님(muted) / 상태 라벨 |
| 회비 | `listMyFees` | 미납 N원(todo) / 미납 없음(ok) / 내역 없음(muted) |
| 연수교육 | `listMyEducationCredits` | `{year}년 {remaining}점 미이수` |
| 행사 | `listMyEvents` | 참가 응답 필요 / 응답 완료 / 응답 마감 |

각 호출은 독립 `catch` 를 가지며 실패 시 `확인 불가`(muted) 로 떨어진다 — **정상 0건과 조회 실패를 구분**한다.
공개 홈에는 `listPublicEvents` 로 다가오는 행사 5건 섹션을 추가했고, 이 조회가 실패해도 홈 전체가 죽지 않는다.

---

## 8. Mobile (§9)

**새 bottom-nav 를 만들지 않았다.** 같은 nav 그룹을 접이식으로 재배치했다.

- `md:hidden` `메뉴 열기/닫기` 버튼 + `aria-expanded` / `aria-controls="branch-nav"`
- `<div id="branch-nav" className="{menuOpen?block:hidden} space-y-2 md:block md:space-y-0">`
- 그룹별 `flex flex-col gap-1 md:flex-row md:flex-wrap md:items-center md:gap-4`
- 라우트 변경 시 `setMenuOpen(false)` — 이동 후 메뉴가 화면을 덮지 않는다

실측: 390×844 에서 토글 `before=False → after=True`, 데스크톱(md 이상)은 항상 펼침.

---

## 9. Browser smoke (§11)

Playwright(저장소 `node_modules` 를 절대 `file:///` import) · 로그인은 UI 경로 `https://kpa-society.co.kr/login`.
3계층 × desktop(1280) / mobile(390) × deep link · refresh.

| 계층 | viewport | 항목 | 결과 |
|---|---|---|---|
| A 익명 | 1280 / 390 | nav = `홈 공지 행사 자료실 임원소개` | PASS (회원·운영자 노출 0) |
| A | 1280 | `/events` h1=`행사` | PASS |
| A | 1280 | `/mypage` deep link → `로그인이 필요합니다.` | PASS |
| A | 1280 | `/kpa/no-such-branch-xyz` → 셸 없는 `페이지를 찾을 수 없습니다` | PASS |
| A | 390 | 모바일 토글 `before=false → after=true` | PASS |
| B 비회원 로그인 | 1280 / 390 | nav = `홈 공지 행사 자료실 임원소개` | **PASS (C9 해소)** — 회원 메뉴 0 |
| B | 1280 | `/mypage` → `이 계정은 분회 서비스 회원이 아닙니다.` | PASS |
| B | 1280 | `/operator/*` 데이터 403 | PASS — 서버 guard 가 판정 (라우트는 UX 안내일 뿐) |
| B | 1280 / 390 | refresh 후 nav 동일 | PASS |
| C 운영자 | 1280 / 390 | 공개 5 + 회원 6 + 운영자 3그룹 9 = **20개 전부 노출** | **PASS (C8 해소)** |
| C | 1280 | `/mypage` h1=`내 정보` · `/mypage/fees` h1=`회비` | PASS |
| C | 1280 | `/operator/members` h1=`회원관리` · `/operator/site` h1=`사이트 정보` | PASS |
| C | 1280 / 390 | refresh 후 nav 20개 동일 | PASS |
| C | 390 | 모바일 토글 | PASS |
| 공통 | — | tenant 혼선 | 0 |
| 공통 | — | auth-loading flicker | 0 |
| 공통 | — | console error | 아래 9-1 파생 404 / 계층 B 의 정상 403 외 0 |

운영자 nav 실측(수정 후):

```
홈 공지 행사 자료실 임원소개
회원 · 내 정보 신상신고 회비 연수교육 행사 참가신청 회의록
운영 · 회원 · 회원관리 신상신고 검수 회비 관리 연수교육 원장
운영 · 콘텐츠 · 글 관리 행사 관리 임원 명부
운영 · 분회 설정 · 사이트 정보 도메인 연결
```

### 9-1. 코드 아님 — 프로덕션 데이터 (조치 보류)

검증 분회 `namgu` 가 **미게시** 상태라 `GET /branches/namgu/site` 가 전원에게 404 다.
화면은 설계대로 `아직 공개되지 않은 분회 홈페이지입니다.` 배너를 띄우고, console 에 그 404 가 남는다.
게시 전환은 프로덕션 데이터 변경이므로 **사용자 승인 없이 수행하지 않았다.**

---

## 10. Dead / Legacy route 처리 (§1)

**해당 없음.** dead·unreachable route 0건, legacy·redirect route 0건. 라우트를 삭제하거나 리다이렉트를 신설하지 않았다.

---

## 11. 범위 밖 (§12) — 손대지 않은 것

새 업무 도메인 / 신규 원장 / 새 공통 UI 프레임워크 / cross-service 공통화 / 전체 디자인 리뉴얼 / 새 통계·analytics / 가입승인·Identity 재설계 — 전부 미수행.
backend 는 `kpa-branch-scope.middleware.ts` 를 **읽기만** 했고 수정 0줄이다.

---

## 12. 변경 파일

**신규 (2)**
- `services/web-kpa-branch/src/pages/BranchEventsPage.tsx`
- `services/web-kpa-branch/src/pages/MyPageIndexPage.tsx`

**수정 (13)**
- `src/App.tsx` · `src/layouts/BranchLayout.tsx` · `src/config/service.ts`
- `src/lib/api/branchEvent.ts` (`listPublicEvents` 추가) · `src/pages/BranchHomePage.tsx`
- h1 라벨 정렬 9개: `BranchOfficersPage` · `MyEventsPage` · `MyFeePage` · `MyEducationPage` ·
  `operator/OfficersPage` · `operator/EventsPage` · `operator/FeeLedgerPage` ·
  `operator/EducationCreditsPage` · `operator/SiteSettingsPage` · `operator/MembersConsolePage`

**backend 변경 0건.**
