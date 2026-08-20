# WO-O4O-CROSS-SERVICE-MYPAGE-FINAL-AUDIT-AND-CLOSURE-V1

* **대상**: Agent D
* **성격**: My Page 전체 cross-service 최종 감사 + 잔존 공통화 결함 판정 + production 검증 + 전체 트랙 FINAL CLOSE
* **선행 상태**

  * `PROFILE TRACK = FINAL CLOSED`
  * `MYPAGE SHELL/LAYOUT TRACK = FINAL CLOSED`
  * `MYPAGE HOME/HUB TRACK = FINAL CLOSED`
  * `MYPAGE REQUESTS TRACK = FINAL CLOSED`
  * `MYPAGE SETTINGS/SECURITY TRACK = FINAL CLOSED`
  * `MYPAGE MEMBERSHIP/ROLE STATUS TRACK = FINAL CLOSED`
  * `MYPAGE NOTIFICATIONS TRACK = FINAL CLOSED`
  * `MYPAGE ACTIVITY/HISTORY TRACK = FINAL CLOSED`
  * `MYPAGE HELP/SUPPORT TRACK = CLOSED_WITH_FOLLOWUPS`

---

## 1. 목표

지금까지 My Page를 기능별로 공통화했다.

이번 WO는 **새 기능을 개발하는 작업이 아니라**, 현재 `origin/main` 기준으로 My Page 전체를 다시 전수 감사하여:

```text
공통화 누락
Shell 우회
로컬 복제 재발
dead route/nav/card
role/membership 오노출
미인증/pending/rejected UX 단절
production runtime 결함
```

이 남아 있는지 확인하고,

```text
MYPAGE TRACK = FINAL CLOSED
```

가능 여부를 최종 판정한다.

---

## 2. 대상 서비스

```text
KPA-Society
GlycoPharm
K-Cosmetics
Neture
Pharmacy-Hub
```

PH는 현행 canonical 축인:

```text
/account
/store-owner/account
```

를 포함한다.

`/mypage` 신설이나 route 명칭 통일은 이번 범위가 아니다.

---

## 3. 시작

최신 `origin/main` 기준으로 시작한다.

```bash
git fetch origin
git status -sb
git diff --cached --name-only
git rev-parse HEAD
git rev-parse origin/main
```

다른 세션의 dirty/staged/untracked 파일은:

```text
수정 금지
삭제 금지
stash 금지
```

`git add .` 금지.

path-specific stage만 사용한다.

---

## 4. 전체 route/page/menu census 재산출

과거 CHECK 숫자를 합산해 전체 모집단으로 삼지 않는다.

현재 main에서 My Page 관련 다음을 전수 재산출한다.

```text
route
page
layout
navigation item
entry card
header/profile menu entry
role/membership guard
account/profile compatibility route
```

대표 검색 범위:

```text
/mypage
/mypage/*
/account
/store-owner/account
MyPageShell
MyPageNavigation
MyPageEntryCardGrid
MyPageUserSummary
MyPageAuthRequired
```

**미조사 0 필수.**

---

## 5. 전체 기능 census

다음 9개 트랙을 5서비스 기준으로 다시 판정한다.

```text
1. Profile
2. Shell / Layout
3. Home / Hub
4. Requests
5. Settings / Security
6. Membership / Role Status
7. Notifications
8. Activity / History
9. Help / Support
```

각 셀 판정:

```text
FULLY_COMMON
CORE_ONLY
VIEW_DUPLICATED
SERVICE_SPECIFIC
NOT_IMPLEMENTED
OUT_OF_SCOPE
```

최종 목표:

```text
미조사 = 0
VIEW_DUPLICATED = 0
CORE_ONLY = 0
```

---

## 6. 선행 FINAL CLOSED 재검증

선행 트랙의 `FINAL CLOSED`를 문서만 믿고 재인용하지 않는다.

현재 main에서 실제로 다음을 확인한다.

```text
공통 component 소비 유지
local duplicate 재생성 여부
route 이동 여부
guard 변경 여부
entry/link 변경 여부
```

선행 완료 뒤 다른 세션 변경으로 회귀한 경우 현재 결함으로 판정한다.

---

## 7. Shell 우회 감사

5서비스에서 My Page 관련 모든 화면이 공통 Shell 계약을 올바르게 소비하는지 확인한다.

검사:

```text
MyPageShell 사용
MyPageNavigation 사용
미인증 분기 위치
pending/rejected 상태 렌더 위치
mobile navigation
double shell
```

다음은 결함 후보:

```text
Shell 밖 early return
인증 실패 화면이 별도 layout
로컬 nav 복제
서비스별 동일 Shell 재구현
```

---

## 8. 로컬 복제 재발 감사

다음 공통 자산과 동등한 로컬 구현이 다시 생겼는지 전수 grep/census 한다.

```text
MyPageShell
MyPageNavigation
MyPageUserSummary
MyPageEntryCardGrid
MyPageActivityFeed
MyPageAppreciationCard
MyRequestsInbox
AccountSecuritySettings
MembershipStatusNotice
MembershipStatusBadge
NotificationSheet
NotificationListBody
```

동등 구현이 다시 생겼다면:

```text
VIEW_DUPLICATED
```

또는:

```text
CORE_ONLY
```

로 판정하고 closure 전에 제거한다.

---

## 9. Navigation/entry 전수 감사

다음 진입점을 모두 확인한다.

```text
My Page nav
Home/Hub cards
Header profile/account menu
Footer/support entry
role-specific cards
compatibility route entry
```

확인:

```text
destination 존재
현재 route 활성 표시
권한과 visibility 일치
모바일 진입 가능
dead link 없음
```

---

## 10. role/membership matrix

가능한 범위에서 다음 사용자 상태를 분리해서 본다.

```text
authenticated active member
membership none
pending
rejected
store_owner
supplier
partner
operator
admin
복수 역할 사용자
```

모든 서비스에 모든 테스트 상태가 존재할 필요는 없다.

실제 존재하는 TEST-ACCOUNTS/안전한 계정만 사용한다.

확인:

```text
잘못된 메뉴 노출
잘못된 role label
접근 불가 route 노출
Shell 유실
무한 redirect
```

---

## 11. 미인증 UX

5서비스에서 실제 로그아웃 상태 또는 미인증 새 세션으로 My Page 축을 확인한다.

검사:

```text
white screen 아님
Shell 계약에 맞는 인증 안내
로그인 진입 가능
dead navigation 없음
unexpected 5xx 없음
```

선행 followup이던:

```text
KCos 미인증 상태가 MyPageLayout 밖에서 렌더
```

는 current main에서 반드시 재확인한다.

실제 잔존하면 **이번 FINAL AUDIT의 공통화 결함**으로 취급하고 최소 수정한다.

---

## 12. pending/rejected UX

해당 상태의 안전한 테스트 계정이 존재하는 서비스는 실제 브라우저 확인.

없으면:

```text
guard
component path
render branch
```

3단 정적 증거로 대체 가능.

확인:

```text
Profile/Settings 접근 계약
현재 membership 상태 표시
dead end 여부
navigation 유지
```

---

## 13. Profile 최종 회귀

Profile 내부를 재설계하지 않는다.

최소 확인:

```text
조회
편집 진입
AccountProfileSection
AccountSecuritySettings 연계
self-profile route
```

production write는 이번 감사에서 기본적으로 하지 않는다.

선행 write 계약을 재검증하기 위해 실사용자 변경 금지.

---

## 14. Requests 최종 회귀

확인:

```text
목록
status label
type label
detail/result link
empty state
```

선행 교정 사항:

```text
raw enum 노출 0
동일 상태 라벨 불일치 0
```

재확인.

취소/재신청/보완은 현재 `NOT_IMPLEMENTED` 상태를 blocker로 보지 않는다.

---

## 15. Settings/Security 최종 회귀

확인:

```text
AccountSecuritySettings 수렴 유지
비밀번호 modal 진입
logout
logout-all 존재 서비스
Profile link
```

이메일 변경·탈퇴·sessions UI 부재는 **신규 기능 후보**로 별도 유지.

이번 감사에서 구현하지 않는다.

---

## 16. Membership/Role 최종 회귀

확인:

```text
status badge
role label
복수 role
role-based entry
membership none/pending/rejected 표시
```

특히 과거 교정한:

```text
service-prefixed role label
```

회귀 여부 확인.

---

## 17. Notifications 최종 회귀

확인:

```text
목록
empty
badge/unread
target resolver
deep link
legacy row remediation 결과
```

최종 조건:

```text
dead notification target = 0
wrong-service navigation = 0
actual 404 = 0
```

KPA fallback 존재 사실도 CHECK에서 정확히 기록한다.

fallback으로 dead producer target을 숨긴 사례가 있는지 다시 확인한다.

---

## 18. Activity/History 최종 판정

현재 Activity는 기능 자체가 대부분 `NOT_IMPLEMENTED`.

다시 확인:

```text
전용 route 신설 여부
실제 backend 계약 신설 여부
MyPageActivityFeed 소비처
dead activity entry
```

기능 부재 자체를 결함으로 보지 않는다.

새 backend를 만들지 않는다.

---

## 19. Help/Support 최종 판정

가장 중요한 최종 판단 대상이다.

현재 상태:

```text
Help/Support UI 중복 = 0
dead support link = 0
사용자 self-read 문의 계약 부재
```

이번 감사에서는 이를 다음 둘 중 하나로 확정한다.

### A. 공통화 완료 + 신규 기능 미구현

다음이 사실이면:

```text
현재 My Page에 사용자 "내 문의" 기능을 제공한다는
확정된 제품 계약이 없음
+
기능 부재가 서비스 간 UI 공통화 결함이 아님
+
dead entry 없음
```

→ `NOT_IMPLEMENTED / 별도 신규 기능`

→ **My Page 전체 FINAL CLOSE를 막지 않는다.**

### B. 현행 My Page 계약에 필수인데 backend만 단절

현재 route/menu/UI가 존재하고 self-read만 없어 기능이 죽어 있다면:

```text
MUST_FIX
```

→ 전체 FINAL CLOSE 보류.

**기능이 아직 만들어지지 않은 것과 깨진 기능을 반드시 구분한다.**

---

## 20. Load-error / 조회 실패 삼킴

이전 트랙에서 발견된:

```text
401/403/5xx → []
catch { return [] }
```

유형은 별도 계약화 트랙으로 유지한다.

이번 FINAL AUDIT에서는:

```text
실제 My Page 브라우저에서
오류가 empty로 잘못 보이는 현재 사용자 결함이 있는가
```

만 확인한다.

아키텍처 전체를 이번 WO에서 고치지 않는다.

---

## 21. dead route 전체 검사

My Page 관련 route/entry를 가능한 한 정적으로 전수 대조한다.

판정:

```text
VALID
DEAD_ROUTE
ROLE_MISMATCH
LEGACY_COMPAT
NOT_IMPLEMENTED_NO_ENTRY
```

완료 기준:

```text
DEAD_ROUTE = 0
ROLE_MISMATCH = 0
```

---

## 22. desktop/mobile production matrix

5서비스 모두:

```text
desktop: 1440×900 수준
mobile: 390×844 수준
```

실제 production browser 검증.

최소 진입:

### KPA / GP / KCos / Neture

```text
로그인
→ /mypage
→ Profile
→ Settings
→ Requests 또는 존재 기능
→ Membership/role 표시
→ Notifications
→ Home으로 복귀
```

### PharmacyHub

```text
로그인
→ /account
→ Profile/Security
→ /store-owner/account (해당 role)
→ Home/entry 회귀 확인
```

기능 없는 route는 억지 방문하지 않는다.

---

## 23. production browser 합격 기준

```text
white screen = 0
JS exception = 0
unexpected 401/403 = 0
404 = 0
5xx = 0
dead nav/card = 0
navigation loop = 0
double shell = 0
mobile 기능 소실 = 0
잘못된 role/status 노출 = 0
wrong-service navigation = 0
```

---

## 24. production write

이번 FINAL AUDIT은 기본:

```text
production write = 0
```

Profile/Password/Membership/Request/Notification 상태를 변경하지 않는다.

기존 데이터의 read-only 검증이 원칙.

특정 결함 재현에 최소 write가 절대 필요하면:

```text
TEST-ACCOUNTS
복원 가능
실사용자 0
```

일 때만 허용하되, 원칙적으로 피한다.

---

## 25. 결함 발견 시

이번 My Page 공통화 범위의 명확한 결함이면 중간 승인 없이:

```text
원인 확인
→ 최소 수정
→ 관련 typecheck/build/test
→ 표준 배포
→ 동일 production 재검증
```

까지 수행한다.

다음이면 중지/별도 WO:

```text
신규 backend 기능 계약
DB schema/migration
Identity 변경
membership lifecycle 재설계
email 변경 기능
탈퇴 기능
Activity backend
Help self-read 신규 기능
다른 세션 WIP 충돌
```

---

## 26. 정적 검증

코드 수정이 발생하면 영향 범위에 따라 최소:

```text
@o4o/account-ui build
KPA typecheck/build
GP typecheck/build
KCos typecheck/build
Neture typecheck/build
PH typecheck/build
```

backend 변경이 발생한 경우에만 관련 backend test/typecheck 추가.

코드 변경 0이면 불필요한 전체 build를 위해 작업을 늘리지 않는다.

---

## 27. 전체 closure matrix

CHECK에 다음 표를 반드시 포함한다.

```text
Track                         KPA   GP   KCos   Neture   PH   Final
Profile
Shell/Layout
Home/Hub
Requests
Settings/Security
Membership/Role
Notifications
Activity/History
Help/Support
```

각 셀은:

```text
ADOPTED
SERVICE_SPECIFIC
NOT_IMPLEMENTED
OUT_OF_SCOPE
```

중 현행 사실을 기록.

---

## 28. 전체 완료 기준

다음 전부 충족해야 한다.

```text
5서비스 route/page/menu census 미조사 = 0

전체 기능 census:
VIEW_DUPLICATED = 0
CORE_ONLY = 0

Shell 우회 = 0
dead route/nav/card = 0
role mismatch = 0

5서비스 desktop/mobile PASS
production browser PASS

이번 My Page 공통화 범위
MUST_FIX_BEFORE_CLOSE = 0
```

`NOT_IMPLEMENTED`는 그 자체로 blocker가 아니다.

단:

```text
이미 사용자에게 노출된 기능이 backend/API 단절로 죽어 있음
```

은 `NOT_IMPLEMENTED`로 숨기지 말고 MUST_FIX로 판정한다.

---

## 29. Help/Support 상태 정합

FINAL AUDIT 결과 Help/Support가 §19-A로 판정되면 기존:

```text
MYPAGE HELP/SUPPORT TRACK
= CLOSED_WITH_FOLLOWUPS
```

를:

```text
MYPAGE HELP/SUPPORT TRACK
= FINAL CLOSED
```

로 정합화한다.

단 의미는:

```text
사용자 self-read 문의 기능까지 구현 완료
```

가 아니라:

```text
현행 공통화 대상은 모두 수렴했고
self-read 문의는 별도 신규 기능
```

임을 CHECK에 명확히 쓴다.

---

## 30. My Page 전체 FINAL CLOSE

모든 기준 충족 시:

```text
CROSS-SERVICE MY PAGE TRACK = FINAL CLOSED
```

로 선언한다.

의미:

```text
현재 존재하는 My Page 기능의
공통화/adoption/runtime 정합이 완료됨
```

이지:

```text
향후 가능한 모든 My Page 기능이 구현됨
```

을 의미하지 않는다.

---

## 31. 별도 backlog 유지

이번 전체 closure와 분리:

```text
email 변경 계약
탈퇴 3축
sessions UI
KPA 알림 backend 공통화
조회 실패 삼킴 계약화
membership metadata self-read
Neture membership none 가입동선
PH 복수 role 표현 개선
Activity backend
Activity type enum
Help/문의 self-read 신규 계약
FAQ
법정문서 운영 콘텐츠
formatRelativeTime repository-wide 정비
```

이들을 이유로 현재 공통화 트랙을 자동 미완료 처리하지 않는다.

---

## 32. CHECK

작성:

```text
docs/checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-FINAL-AUDIT-AND-CLOSURE-V1.md
```

포함:

```text
1. 기준 commit / deployed revision
2. route/page/menu census
3. 전체 기능 census
4. 전체 closure matrix
5. Shell 우회 감사
6. local duplicate 재발 감사
7. navigation/entry
8. role/membership matrix
9. unauthenticated UX
10. pending/rejected UX
11. Profile
12. Requests
13. Settings/Security
14. Membership/Role
15. Notifications
16. Activity/History
17. Help/Support 최종 판정
18. dead route 검사
19. desktop/mobile
20. production browser
21. production write
22. typecheck/build/test
23. backend/DB/schema
24. 잔존 backlog
25. MUST_FIX_BEFORE_CLOSE
26. Help/Support 상태 정합
27. CROSS-SERVICE MY PAGE FINAL CLOSE 판정
28. CHECK/commit/push
```

선행 CHECK는 history를 삭제하지 말고 필요한 상태만 정합화한다.

---

## 33. Git

```text
git add . 금지
path-specific stage
다른 세션 dirty/staged/untracked 파일 미접촉
```

완료 후:

```text
이번 WO 범위 dirty 0
push 완료
origin/main 반영 확인
```

---

## 34. 최종 보고

```text
1. 기준 commit / deployed revision
2. 전체 route/page/menu census
3. 전체 기능 census
4. closure matrix
5. Shell/duplicate 감사
6. navigation/dead route
7. role/membership
8. unauth/pending/rejected
9. Profile
10. Requests
11. Settings/Security
12. Membership/Role
13. Notifications
14. Activity/History
15. Help/Support 최종 판정
16. desktop/mobile
17. production browser
18. production write
19. typecheck/build/test
20. backend/DB/schema
21. 잔존 backlog
22. MUST_FIX_BEFORE_CLOSE
23. CROSS-SERVICE MY PAGE FINAL CLOSED 여부
24. CHECK/commit/push
25. 최종 Git 상태
```

마지막 줄:

```text
문서 정합: 발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건
```

## 35. 실행 원칙

중간 승인 없이:

```text
최신 main 확인
→ 5서비스 전체 재-census
→ 선행 9트랙 current-main adoption 검증
→ Shell/duplicate/dead-route 감사
→ role/unauth/pending UX 감사
→ 필요한 최소 수정
→ 정적 검증
→ 배포
→ production desktop/mobile 전체 검증
→ Help/Support 최종 판정
→ 전체 CHECK
→ path-specific commit
→ push
```

까지 한 번에 완료한다.

**이번 작업의 핵심은 지금까지 만든 공통 컴포넌트의 존재를 확인하는 것이 아니라, 현재 production에서 5서비스 My Page가 실제로 하나의 공통화된 계약으로 작동하는지를 마지막으로 증명하는 것이다.**

---

## 부기 — 실행 시점 저장소 실측 (WO 원문 아님)

> 아래는 WO 착수 전 저장소에서 직접 측정한 사실이다. **§4·§6 은 과거 수치·문서 재인용을 금지하므로 이 값들도 모집단의 출발점일 뿐 결론이 아니다.** 실행 시점에 직접 재산출할 것. 원문과 충돌하면 원문(§1~§35)이 우선한다.

### A. 기준

* base `origin/main` = `8502aec8d`
* 직전 트랙: Help/Support `CLOSED_WITH_FOLLOWUPS` (commit `8c6a88079`) · Activity `FINAL CLOSED` (commit `acace8f92`)
* **다른 세션이 동시에 작업 중이다.** 착수 시점에 `.github/workflows/deploy-api.yml` dirty, cafe24 관련 커밋 유입 확인. §3 대로 **미접촉**하고 path-specific stage 만 사용할 것.

### B. Shell 소비 실측 — **KPA 로컬 `MyPageLayout` 은 중복이 아니라 문서화된 어댑터다**

`MyPageShell` 직접 소비:

```
packages/account-ui/src/components/MyPageLayout.tsx      (공통)
services/web-kpa-society/src/layouts/MyPageLayout.tsx     (KPA 로컬, 64줄)
services/web-pharmacy-hub/src/pages/account/MyProfilePage.tsx
```

KPA 로컬 파일 헤더 주석 원문:

```
변경: 골격(container 폭 · header · navigation)을 자체 구현하지 않고 공통
      `MyPageShell` 에 위임한다. …
이 파일은 **KPA 호출부 호환 어댑터**로만 남는다:
  - prop 이름 `description` (Shell 은 `subtitle`)
  - KPA_MYPAGE_NAV_ITEMS 주입
  - width 기본값 'wide'
```

**§8 의 grep 을 그대로 돌리면 이 파일이 `MyPageShell` 로컬 복제로 오탐된다.** 위임 어댑터와 재구현은 다르다. §8 판정 전에 **파일을 열어 위임 여부를 확인**할 것. 같은 오탐이 `packages/shared-space-ui/src/forum-owner/ForumOwnerDashboard.tsx`(공통 패키지가 `MyPageLayout` 소비)에서도 발생할 수 있다.

`MyPageLayout` 소비 페이지 실측(dist 제외 30개 파일): GP 7 · KCos 7 · KPA 9(+로컬 layout 1) · Neture 4 · PH 0(`MyProfilePage` 가 Shell 직접 소비).

### C. §11 KCos 미인증 followup — **현재 main 에서는 이미 Layout 안에서 렌더된다**

`services/web-k-cosmetics/src/pages/mypage/MyPageHub.tsx` 실측:

```
60:  if (!isAuthenticated || !user) {
61:    return (
62:      <MyPageLayout
68:        <MyPageAuthRequired actionLabel="로그인" onAction={() => navigate('/login')} />
69:      </MyPageLayout>
```

즉 §11 이 지목한 "MyPageLayout 밖에서 렌더"는 **소스상 이미 해소된 것으로 보인다.** 그러나 §11 은 "current main 에서 반드시 재확인"을 요구하므로, **소스 1곳만 보고 해소로 적지 말 것** — KCos 의 나머지 mypage 페이지 6개(`MyProfilePage`·`MySettingsPage`·`MyCertificatesPage`·`MyCreditsPage`·`MyEnrollmentsPage`·`MyRequestsPage`)와 **프로덕션 실제 로그아웃 세션**까지 확인해야 판정이 성립한다.

`MyPageAuthRequired` 소비 실측: GP 6 · KCos 6 · Neture 3 · PH 1 · **KPA 0**.

**KPA 0 은 결함일 수도, 정상일 수도 있다.** KPA 는 route guard 로 미인증을 처리하는 구조일 수 있다(F11 기록: KPA-a 는 OperatorRoute 대신 RoleGuard+allowedRoles 사용 — 구조 동등 예외). §7 의 "인증 실패 화면이 별도 layout" 결함 후보에 해당하는지 **KPA 의 실제 미인증 경로를 프로덕션에서 확인한 뒤** 판정할 것. 라우팅 단계에서 로그인으로 보내는 것은 정상 계약이다.

### D. route 규모 실측 (§4 모집단 출발점)

`App.tsx` 의 `path="mypage|/mypage|account|/account|/store-owner/account"` 매칭 수:

| 서비스 | 매칭 | 비고 |
|---|---:|---|
| Neture | 15 | 최다 — supplier/partner 축 포함 가능성 |
| KPA | 12 | |
| GlycoPharm | 7 | |
| K-Cosmetics | 7 | |
| Pharmacy-Hub | 2 | `/account` · `/store-owner/account` |

**이 숫자는 grep 매칭 수이지 route 수가 아니다.** 중첩 route·index route·compatibility redirect 가 섞여 있으므로 §4 대로 파일을 열어 실제 route 트리를 재산출할 것. PH 는 `pages/account/` 에 `MyProfilePage.tsx` + `navItems.ts` 2파일뿐이므로 §2 의 "PH canonical 축" 판정 시 **route 수가 적은 것이 곧 결함은 아님**을 유의.

### E. §17 Notifications — KPA fallback 은 실재한다 (기록 정확성)

`services/web-kpa-society/src/lib/notificationRouting.ts:34-36`:

```ts
export function resolveNotificationTarget(n: NotificationItem): string | null {
  return resolveCommon(n, { fallback: kpaFallback });
}
```

`kpaFallback` 은 `store.*` 알림을 `/store` 로 보낸다. **5서비스 중 fallback 을 주입하는 것은 KPA 뿐**이다. §17 이 요구한 "KPA fallback 존재 사실을 CHECK 에 정확히 기록"은 이것을 가리킨다.

동시에 §17 은 "fallback 으로 dead producer target 을 숨긴 사례"를 재확인하라고 한다. 판별 기준: **fallback 이 걸리는 알림 type 의 producer 가 `metadata.targetUrl` 을 채우고 있는가.** 채우지 않는데 fallback 이 화면을 정상으로 보이게 하고 있다면 그것이 은폐다. 선행 Notifications 트랙에서 `packages/account-ui/` 는 무변경으로 종결됐으므로(§17 계약 유지), **공통 resolver 를 건드리는 방식으로 고치지 말 것.**

### F. §19 Help/Support A/B 판정 — 판단 재료는 이미 측정돼 있다

직전 WO 에서 확정된 사실:

* 사용자 축 문의는 **인증 없는 공개 write 3건뿐**, 모든 read 는 admin/operator 전용
* 소유자 컬럼: `contact_inquiries`(GP·KCos) **없음** · `neture_contact_messages` **없음** · `contact_requests`(KPA) **`created_by` 존재하나 소비 endpoint 0**
* My Page nav 에 Help/Support 항목 **0건**, `@o4o/account-ui` 33 component 중 Help 전용 **0건**
* 지원 진입은 **footer** 로만 존재하고 전부 `/contact` LIVE, **dead support link 0**

§19 의 갈림길은 명확하다: **"route/menu/UI 가 존재하는데 self-read 만 없어 죽어 있는가"** 가 B 이고, **"애초에 My Page 에 노출된 적이 없는가"** 가 A 다. 실측상 **My Page 에 문의 진입 자체가 0건**이므로 A 쪽 근거가 강하다. 그러나 §19 는 이 판정을 이번 감사에서 **직접 확정**하라고 요구하므로, 직전 WO 결론을 인용하지 말고 **현재 main 에서 재확인**할 것(§6 이 문서 재인용을 금지한다).

주의: 직전 WO 보고 표에 KPA 소유자 컬럼이 `user_id` 로 적혀 있었으나 **실제 컬럼명은 `created_by`** 다(`20260922000000-CreateContactRequests.ts`). 컨트롤러 77행 `created_by: user?.id ?? null` 로 저장은 되나 읽는 endpoint 가 없다. 컬럼명을 잘못 적으면 grep 이 헛돈다.

### G. §29 상태 정합 — 선행 CHECK 수정 범위

§19-A 로 확정되면 `docs/checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-HELP-SUPPORT-COMMONIZATION-V1.md` 의 트랙 상태를 정합화한다. **§32 가 "history 를 삭제하지 말고 필요한 상태만 정합화" 를 명시**했으므로, Notifications 트랙에서 했던 것과 같은 방식으로 처리할 것:

* 상단 상태 줄만 `CLOSED_WITH_FOLLOWUPS` → `FINAL CLOSED` 로 변경
* **전이 이력을 본문에 남긴다** (언제·어느 WO 로 정합화됐는지)
* followup 10건은 지우지 않는다 — §31 backlog 로 유지

A 가 아니면 손대지 않는다.

### H. §28 의 핵심 구분선

```
기능이 아직 만들어지지 않음  → NOT_IMPLEMENTED (blocker 아님)
노출된 기능이 죽어 있음      → MUST_FIX (blocker)
```

이 구분은 §19·§28 이 반복해서 강조하는 이번 WO 의 판정 축이다. **`NOT_IMPLEMENTED` 로 죽은 기능을 숨기는 것**과 **없는 기능을 MUST_FIX 로 만들어 close 를 막는 것** 둘 다 오류다. 판정 근거는 항상 "**사용자에게 진입점이 노출돼 있는가**" 다.

### I. §24 production write = 0 · §13 Profile

이번 감사는 read-only 가 원칙이다. Profile write 계약 재검증을 이유로 실사용자 데이터를 바꾸지 말 것. **비밀번호 변경 modal 은 열어서 렌더까지만** 확인하고 submit 하지 않는다(직전 WO 에서 문의 modal 에 적용한 것과 같은 방식).

### J. §26 — 코드 변경 0 이면 build 를 늘리지 않는다

§26 이 "코드 변경 0이면 불필요한 전체 build 를 위해 작업을 늘리지 않는다"고 명시했다. 변경이 없으면 "**대상 없음**"으로 보고하면 된다. 실적을 만들려고 5서비스 build 를 돌리지 말 것. 반대로 **변경이 있으면 결과를 그대로 보고**하고, 통과한 것만 골라 적지 말 것. 알려진 선행 실패 `packages/financial-core` `tsup: No input files` 는 이번 변경과 무관한 기존 실패다(CLAUDE.md 중지 조건: "현재 변경과 무관한 build·test 실패"는 중지 사유).

### K. 검증 계정 · 도메인

* 테스트 계정 SSOT: `docs/local/TEST-ACCOUNTS.local.md` (CLAUDE.md §15) — 자격증명을 코드·문서·CHECK 에 적지 말 것
* KCos 프로덕션 도메인은 **`k-cosmetics.site`** (`k-cosmetics.co.kr` 은 외부 쇼핑몰)
* 로그인 API 는 **serviceKey 필수** — 없으면 정상 계정도 401. "UI 는 되는데 curl 만 401"이면 이 원인
* API 실 진입점은 `api.neture.co.kr` (run.app 직접 URL 은 `/health` 까지 404)

### L. 이번 WO 가 만들어낼 수 있는 가장 큰 위험

**"전체 FINAL CLOSED" 라는 목적지가 정해져 있다는 점** 자체다. §28 조건을 채우지 못했는데 close 하면 9개 트랙 전체가 잘못 봉인된다. §30 의 선언은 **조건 충족의 결과**이지 이번 WO 의 성공 기준이 아니다. 잔존 결함을 정확히 남긴 `CLOSED_WITH_FOLLOWUPS` 또는 `BLOCKED` 가 무리한 close 보다 낫다. 특히 §6 이 요구한 **선행 트랙 회귀 검증에서 결함이 나오면 그것이 곧 현재 결함**이며, "선행에서 이미 닫았다"는 이유로 넘어가지 말 것.
