# WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1

- **대상 에이전트**: Agent D
- **작성일**: 2026-08-19
- **성격**: My Page 화면 구조 전수조사 + Shell/Layout/Navigation 공통화 + 5서비스 adoption + production 검증
- **선행 완료**: Profile Track = `FINAL CLOSED`
- **선행 CHECK**: [`docs/checks/CHECK-O4O-CROSS-SERVICE-PROFILE-FINAL-BROWSER-CLOSURE-V1.md`](../checks/CHECK-O4O-CROSS-SERVICE-PROFILE-FINAL-BROWSER-CLOSURE-V1.md)

---

## 1. 목표

Profile 공통화는 종료됐다.

이제 My Page 트랙을 시작하되, 개별 기능을 하나씩 공통화하기 전에 **화면 골격과 Navigation/Layout을 먼저 공통화**한다.

목표:

```text
5서비스 My Page 전체 census
→ 화면 구조 공통점/차이 판정
→ 공통 MyPage Shell/Layout/Navigation 구현
→ 5서비스 adoption
→ 기존 Profile Core 연결
→ production browser 검증
```

이번 WO의 핵심은 기능 내부를 다시 만드는 것이 아니라,

```text
"개별 기능을 넣을 공통 그릇을 먼저 만든다"
```

이다.

---

## 2. 대상 서비스

```text
KPA-Society
GlycoPharm
K-Cosmetics
Neture
Pharmacy-Hub
```

---

## 3. 범위

My Page 관련 전체 route/page/menu를 조사한다.

대표 범위:

```text
/mypage
/mypage/profile
/mypage/settings
/mypage/requests
/mypage/*
/account
/store-owner/account
서비스별 My Page Hub / 개인 영역
```

실제 route는 현재 main 기준으로 전수 확인한다.

---

## 4. Census — 화면 개수가 아니라 기능 단위

다음 12개 기능 단위를 5서비스 전부 판정한다.

```text
1. My Page Home / Hub
2. 내 프로필 진입
3. 설정 / 보안
4. 가입·신청·승인 상태
5. 내 요청 / 신청내역
6. 알림
7. 내 활동 / 이력
8. 서비스 업무 바로가기
9. 매장·사업자·공급자 영역 진입
10. 회원/역할 상태
11. 도움말·문의
12. 서비스별 고유 기능
```

각 항목:

```text
route
page
component
navigation entry
desktop/mobile UI
권한/role gate
실제 destination
공통 component 사용 여부
```

기록.

판정 라벨:

```text
FULLY_COMMON
CORE_ONLY
VIEW_DUPLICATED
SERVICE_SPECIFIC
NOT_IMPLEMENTED
OUT_OF_SCOPE
```

**미조사 0 필수.**

---

## 5. 화면 구조 census

기능 census와 별도로 다음 UI 구조를 비교한다.

```text
Page title/header
user summary
breadcrumb
tab
sidebar
top nav
card grid
shortcut
status/notice
content container
desktop/mobile navigation
empty/loading/error state
service extension 영역
```

화면 수 기준이 아니라 **구조 요소 기준**으로 판정한다.

---

## 6. 공통화 목표 구조

개념 구조:

```text
MyPageShell
├─ MyPageHeader
├─ UserSummary
├─ MyPageNavigation
│  ├─ desktop
│  └─ mobile
├─ StatusNoticeSlot
├─ MyPageContent
├─ CommonEntryCards
└─ ServiceExtensionSlot
```

실제 컴포넌트 수와 파일 위치는 현재 코드 구조를 보고 최소화한다.

### 원칙

```text
서비스별 정책을 Shell 안에 하드코딩하지 않는다.
서비스 차이는 props/config/slot으로 주입한다.
```

---

## 7. 공통화 우선순위

이번 WO에서는 다음 순서로 진행한다.

```text
1. Shell
2. Header / Title
3. Content container
4. Navigation
5. Mobile navigation
6. 공통 entry/card 구조
7. Extension slot
```

개별 기능 내부 공통화는 후속 트랙으로 남긴다.

---

## 8. Profile 연결 원칙

Profile Track은 이미 `FINAL CLOSED`.

이번 WO에서는 Profile Core 내부를 수정하지 않는다.

연결만 한다.

```text
MyPageShell
→ "내 프로필"
→ 기존 canonical Profile route
→ AccountProfileSection 등 기존 Profile Core
```

금지:

```text
Profile Core 재설계
self-profile API 재수정
Profile field ownership 변경
KPA Profile UX 재공통화
```

---

## 9. 서비스별 Extension

다음은 공통 Shell 안에서 Extension으로 남길 수 있다.

### KPA

```text
직역/면허
약사회 관련 개인 업무
소속/활동
```

### GlycoPharm

```text
약사/서비스 특화 신청
```

### K-Cosmetics

```text
매장 신청
LMS/교육 관련 진입
```

### Neture

```text
supplier / partner 업무
business-profile 역할 게이팅
```

### Pharmacy-Hub

```text
약국/매장 연결
가입 상태
store-owner/operator 역할 진입
```

공통화율을 높이기 위해 억지로 합치지 않는다.

---

## 10. 이관된 관측 2건

Profile Final Closure에서 이관된 항목:

```text
1. Neture business-profile 역할 게이팅
2. KCos / Neture 프로필 필드 집합 차이
```

이번 WO에서는:

```text
My Page에서 어디에 노출할지
어떤 역할에게 보여줄지
어떤 Extension으로 둘지
```

만 판정한다.

Profile 내부 필드 계약은 다시 수정하지 않는다.

---

## 11. Navigation 계약

My Page navigation은 기능 route를 직접 하드코딩한 복사본이 서비스마다 생기지 않게 한다.

가능하면:

```text
common nav item model
+
service config
```

구조를 사용한다.

예:

```text
label
route
icon
visibility
role/capability
group
mobile visibility
```

단, 역할 판정 로직 자체를 새로 만들지 않는다.

기존 service role/capability helper를 재사용한다.

---

## 12. Mobile 우선 확인

Shell 공통화에서는 desktop만 보고 끝내지 않는다.

최소 확인:

```text
desktop sidebar/nav
mobile compact nav
tab overflow
card stacking
header wrapping
content width
touch target
```

모바일에서 기능 진입이 사라지는 구조 금지.

---

## 13. PharmacyHub 주의

PharmacyHub는 `/account`와 `/store-owner/account` 구조가 이미 정리됐다.

이번 WO에서는:

```text
/account = 개인 Profile
/store-owner/account = compatibility route
```

계약을 유지한다.

My Page Shell에 넣기 위해 store-owner 전용 계정 화면으로 되돌리지 않는다.

---

## 14. My Page Home / Hub

각 서비스에 `/mypage` 또는 동일 역할의 개인 허브가 존재하는지 확인한다.

경우별 처리:

### A. 공통 허브 존재

Shell로 수렴.

### B. 서비스별 허브만 존재

공통 구조만 적용하고 고유 카드/링크는 Extension 유지.

### C. 허브 자체 없음

필요성이 명확하면 기존 기능 진입을 모으는 **얇은 공통 Hub adoption** 허용.

단, 새로운 대형 Dashboard를 만들지 않는다.

---

## 15. 개별 기능 내부 변경 금지

이번 WO에서 다음 기능 내부를 깊게 공통화하지 않는다.

```text
Requests 상세 로직
Membership workflow
Notification backend
Activity history
Help/Support 시스템
LMS
Supplier workflow
Store workflow
```

이들은 Shell/Layout 이후 후속 기능 WO에서 다룬다.

---

## 16. Backend

기본적으로 frontend 중심 작업이다.

backend 변경은 원칙적으로 하지 않는다.

다음이 필요하면 중지/보고:

```text
새 API 필요
role contract 변경
membership 변경
schema/migration
```

단순 frontend route/config 정렬은 허용.

---

## 17. 실제 5서비스 adoption

공통 Shell을 만들고 한 서비스만 적용한 상태로 종료 금지.

반드시:

```text
KPA
GP
KCos
Neture
PH
```

전부 적용 여부를 판정한다.

실제 구조상 적용 불가한 서비스는 `SERVICE_SPECIFIC` 사유를 명시한다.

---

## 18. 완료 판정

최종 census:

```text
미조사          = 0
VIEW_DUPLICATED = 0
CORE_ONLY       = 0
```

목표.

단:

```text
SERVICE_SPECIFIC
NOT_IMPLEMENTED
OUT_OF_SCOPE
```

는 근거가 명확하면 정상 잔존 가능.

---

## 19. Production browser 검증

5서비스 모두 실제 production에서 최소:

```text
로그인
→ My Page 진입
→ Navigation 표시
→ Profile 진입
→ Settings/Requests 등 존재 기능 진입
→ 서비스 고유 Extension 진입
→ 뒤로가기/새로고침
```

확인.

desktop/mobile 모두 수행.

---

## 20. Browser 기준

확인:

```text
white screen 0
JS exception 0
예상 외 401/403/404/5xx 0
dead link 0
잘못된 role 노출 0
모바일 진입 누락 0
navigation loop 0
```

---

## 21. 결함 발견 시

이번 Shell/Layout 범위의 결함이면:

```text
원인 증명
→ 최소 수정
→ typecheck/build
→ 배포
→ production 재검증
```

까지 중간 승인 없이 진행.

다음이면 중지:

```text
DB schema/migration
backend 새 계약
Identity 재설계
membership 정책 변경
다른 세션 WIP 충돌
```

---

## 22. 정적 검증

필수:

```text
공통 UI package build
KPA typecheck/build
GP typecheck/build
KCos typecheck/build
Neture typecheck/build
PH typecheck/build
```

공통 package 변경 시 모든 소비처 확인.

---

## 23. Git 안전

시작:

```bash
git fetch origin
git status -sb
git diff --cached --name-only
git pull --ff-only origin main
```

공유 main index 오염 가능성이 있으므로:

```text
다른 세션 staged 파일 미접촉
git add . 금지
path-specific stage
```

필수.

---

## 24. CHECK

작성:

```text
docs/checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1.md
```

포함:

```text
1. 기준 commit
2. 5서비스 route/page census
3. 12개 기능 census
4. 화면 구조 census
5. Before/After 판정
6. 공통 Shell/Layout
7. Navigation 계약
8. 서비스별 Extension
9. 5서비스 adoption
10. Profile 연결
11. desktop/mobile
12. production browser
13. backend/DB 변경 여부
14. 잔존 기능 공통화 후보
15. MUST_FIX_BEFORE_CLOSE
16. CHECK/commit/push
```

---

## 25. 완료 기준

```text
5서비스 My Page census 미조사 0
공통 Shell 구현
공통 Navigation/Layout 구현
5서비스 adoption 판정 완료
Profile 기존 Core 정상 연결
desktop/mobile PASS
production browser PASS

VIEW_DUPLICATED = 0
CORE_ONLY = 0

이번 WO 범위 MUST_FIX_BEFORE_CLOSE = 0
```

---

## 26. 최종 보고

```text
1. 기준 commit
2. 전체 census
3. Before/After
4. 공통 Shell/Layout
5. Navigation
6. 서비스별 Extension
7. 5서비스 adoption
8. Profile 연결
9. production browser
10. desktop/mobile
11. typecheck/build
12. backend/DB/schema
13. 잔존 기능 공통화 후보
14. My Page 다음 작업
15. CHECK/commit/push
16. 최종 작업트리
```

마지막 줄:

```text
문서 정합: 발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건
```

---

## 27. 실행 원칙

중간 승인 없이:

```text
최신 main 확인
→ 5서비스 census
→ Shell/Layout/Navigation 설계
→ 공통 구현
→ 5서비스 adoption
→ 정적 검증
→ 배포
→ production browser desktop/mobile
→ CHECK
→ path-specific commit
→ push
```

까지 한 번에 진행한다.

**이번 WO의 핵심은 My Page 개별 기능을 먼저 공통화하는 것이 아니라,
앞으로 모든 기능 공통화가 반복 수정 없이 들어갈 수 있는 공통 화면 골격을 먼저 만드는 것이다.**

---

## 부기 — 작성 시점 병행 세션 경고 (§21 관련)

본 WO 작성 시점(2026-08-19)에 **다른 세션이 My Page 인접 영역을 작업 중**인 것이 확인됐다.

해당 세션의 미커밋 변경(참고용, 접촉 금지):

```text
packages/account-ui/src/index.ts
packages/account-ui/src/components/MyCertificatesView.tsx   (untracked)
packages/account-ui/src/components/MyCreditsView.tsx        (untracked)
packages/account-ui/src/components/MyEnrollmentsView.tsx    (untracked)
packages/shared-space-ui/src/*
services/web-glycopharm/src/pages/mypage/My{Certificates,Credits,Enrollments}Page.tsx
services/web-k-cosmetics/src/pages/mypage/My{Certificates,Credits,Enrollments}Page.tsx
+ forum 계열 파일 다수
```

즉 **LMS 계열 My Page 하위 화면(수료증·크레딧·수강)의 View 공통화**가 병행 중이다.

따라서 본 WO 실행 시:

- 위 파일들은 **접촉하지 않는다**. 실행 시점에 이미 커밋·push 되어 있으면 그 결과를 census 입력으로 사용한다.
- 본 WO의 대상은 **Shell / Layout / Navigation 골격**이며, 위 하위 화면 내부는 §15 에 따라 범위 밖이다.
- 실행 시점에도 해당 파일들이 미커밋 상태이고 Shell adoption 과 경로가 겹치면 §21 의 `다른 세션 WIP 충돌` 중지 조건을 적용해 보고한다.
