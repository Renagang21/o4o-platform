# WO-O4O-CROSS-SERVICE-MYPAGE-NOTIFICATIONS-COMMONIZATION-V1

* **대상**: Agent D
* **성격**: My Page `Notifications / 알림` 기능 census → 공통화 → 5서비스 adoption → production 검증
* **선행 완료**

  * `PROFILE TRACK = FINAL CLOSED`
  * `MYPAGE SHELL/LAYOUT TRACK = FINAL CLOSED`
  * `MYPAGE HOME/HUB TRACK = FINAL CLOSED`
  * `MYPAGE REQUESTS TRACK = FINAL CLOSED`
  * `MYPAGE SETTINGS/SECURITY TRACK = FINAL CLOSED`
  * `MYPAGE MEMBERSHIP/ROLE STATUS TRACK = FINAL CLOSED`

---

## 1. 목표

My Page의 다음 개별 기능인 **Notifications / 알림**을 5서비스 기준으로 전수 조사하고, 실제로 존재하는 알림 기능의 표시·진입·상태 표현을 공통화한다.

핵심:

```text
5서비스 Notifications census
→ 알림 기능 존재 여부와 backend 계약 확인
→ 공통 목록/배지/읽음 상태 View 분리
→ 서비스별 알림 유형은 Extension 유지
→ 5서비스 adoption
→ production desktop/mobile 검증
```

**알림 기능이나 backend 계약이 없는 서비스에 억지로 새 알림 시스템을 만들지 않는다.**

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

## 3. 시작

최신 `origin/main` 기준으로 시작한다.

```bash
git fetch origin
git status -sb
git diff --cached --name-only
git rev-parse HEAD
git rev-parse origin/main
```

다른 세션 dirty/staged/untracked 파일은 수정·삭제·stash하지 않는다.

```text
git add . 금지
path-specific stage만 사용
```

---

## 4. Notifications 모집단 재산출

현재 main에서 개인 사용자 관점의 알림 관련 route/page/component/API를 전수 조사한다.

대표 범위:

```text
/mypage/notifications
/notifications
알림 센터
헤더 notification bell
My Page 알림 카드
읽지 않은 알림 badge
알림 설정 진입
서비스별 개인 알림
```

과거 CHECK 수치나 추측으로 모집단을 만들지 않는다.

---

## 5. 기능 census

화면 개수가 아니라 아래 기능 단위로 5서비스를 판정한다.

```text
1. 알림 기능 존재 여부
2. 알림 목록
3. 알림 상세
4. unread/read 상태
5. unread count/badge
6. 단건 읽음 처리
7. 전체 읽음 처리
8. 알림 삭제
9. 알림 유형 표시
10. 발생 시각 표시
11. 대상 route/deep link
12. Home/Header/MyPage 진입
13. 알림 설정 진입
14. empty/loading/error
15. mobile UX
16. 서비스별 알림 Extension
```

각 항목 기록:

```text
route
page/component
API
data source
write/read 여부
notification type
read state
deep link
role/capability gate
desktop/mobile
공통 component 사용 여부
```

판정:

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

## 6. Backend 계약 먼저 확인

UI 공통화 전에 각 서비스의 실제 알림 backend 계약을 확인한다.

최소:

```text
목록 조회 API
unread count API
읽음 처리 API
전체 읽음 처리 API
삭제 API
notification type/data shape
service/user scope
```

다음 상황을 구분한다.

```text
A. backend + UI 존재
→ 공통화 대상

B. backend만 존재
→ 소비처/adoption gap 판정

C. UI만 존재하지만 backend 없음
→ NOT_IMPLEMENTED 또는 MUST_FIX

D. backend/UI 모두 없음
→ NOT_IMPLEMENTED
```

기능이 없다는 이유만으로 새 endpoint를 만들지 않는다.

---

## 7. 공통화 목표

공통화 대상은 **알림의 사용자 표시 계층**이다.

개념:

```text
MyPageNotificationsView
├─ NotificationHeader
├─ UnreadSummary
├─ NotificationList
│  └─ NotificationItem
├─ NotificationStatus
├─ NotificationActions
└─ Empty/Loading/Error
```

실제 필요한 최소 컴포넌트만 만든다.

신규 package 생성 금지.

가능하면 `@o4o/account-ui` 안에서 additive 확장한다.

---

## 8. 최소 공통 View Model

서비스별 backend payload를 하나의 DB/entity로 통합하지 않는다.

필요하면 frontend adapter에서 최소 모델로 변환한다.

예:

```text
id
title
message
type
typeLabel
createdAt
isRead
targetRoute
actionLabel
metadata
```

공통 View는 이 모델만 소비한다.

---

## 9. 알림 유형

서비스별 실제 notification type은 유지한다.

예:

```text
approval
request
membership
system
community
education
store
supplier
```

실제 값은 현재 코드에서 조사한다.

공통화 대상은:

```text
label
icon
tone
description
destination
```

이다.

공통 View 내부에서 serviceKey별 type 분기 금지.

---

## 10. 읽음 상태

기능이 존재하는 경우:

```text
unread
read
```

표시와 액션을 공통화한다.

확인:

```text
단건 읽음
전체 읽음
새로고침 후 persist
unread badge 감소
중복 request 없음
```

backend write 계약은 기존 것을 그대로 사용한다.

---

## 11. Badge / unread count

헤더 또는 My Page에 unread count가 있으면 전수 조사한다.

중복 구현이 2서비스 이상이면 공통화 후보.

확인:

```text
0일 때 숨김 여부
99+ 등 상한 처리
새 알림 후 갱신
읽음 후 감소
mobile 표시
```

새 polling/WebSocket 계약을 만들지 않는다.

---

## 12. Deep link

알림 클릭 시 목적지를 확인한다.

예:

```text
신청 상세
회원 상태
커뮤니티 게시물
교육
매장
공급자 업무
```

dead destination은 MUST_FIX 후보.

공통 View 내부에 서비스 route를 하드코딩하지 않는다.

`targetRoute` 또는 callback/config로 주입한다.

---

## 13. 알림 설정과 경계

Settings/Security 트랙과 경계를 유지한다.

이번 WO:

```text
알림 설정 진입
현재 notification preference 표시 여부
```

까지만 포함.

KPA처럼 toggle이 실제 존재하면 현재 계약을 조사한다.

다음은 이번 범위 밖:

```text
알림 backend 정책 재설계
수신 채널 모델 신설
email/SMS/push 통합
KPA 알림 backend 공통화
```

Settings 트랙 followup을 여기서 억지로 해결하지 않는다.

---

## 14. 채널 구분

현재 시스템에 실제 존재하는 채널만 기록한다.

예:

```text
in-app
email
SMS
push
```

구현되지 않은 채널을 설계하거나 UI에 노출하지 않는다.

---

## 15. Service Extension

서비스별 고유 알림은 정상 잔존 가능.

예:

### KPA

```text
회원/직역
커뮤니티
교육
약사회 업무
```

### GlycoPharm

```text
신청/교육
서비스 상태
```

### K-Cosmetics

```text
매장/교육/LMS
신청 상태
```

### Neture

```text
supplier/partner
community
business workflow
```

### Pharmacy-Hub

```text
가입/매장 연결
store-owner 업무
```

실제 존재하는 항목만 반영한다.

---

## 16. Notifications가 없는 서비스

기능 자체가 없다면:

```text
NOT_IMPLEMENTED
```

로 판정한다.

다음 금지:

```text
빈 Notifications 페이지 신설
dummy 알림 생성
새 backend endpoint 생성
Home에 dead entry 추가
```

대신 dead entry가 없는지만 확인한다.

---

## 17. Home/Header 진입

기능이 존재하는 서비스는 다음을 확인한다.

```text
My Page Home
Header bell
Navigation
```

중 어디에서 진입하는지 기록.

같은 기능으로 가는 중복 entry가 문제는 아니지만, dead link/상이한 unread count는 결함 후보.

---

## 18. Empty / Loading / Error

공통화 가능한 상태:

```text
알림이 없습니다
불러오는 중
조회 실패
재시도
권한 없음
```

특히 다음을 구분한다.

```text
실제 empty
401/403을 empty로 삼킴
5xx를 empty로 삼킴
```

**조회 실패를 빈 목록으로 숨기는 기존 계약이 발견되면 이번 WO에서 임의 수정하지 말고 별도 "조회 실패 삼킴 계약화" followup으로 기록한다.**

---

## 19. Activity와 경계

Notifications:

```text
"나에게 알려야 할 사건"
```

Activity:

```text
"내가 했거나 내 계정에서 발생한 활동 이력"
```

두 기능을 하나의 feed로 합치지 않는다.

최근 활동 UI가 알림처럼 보이더라도 데이터 의미를 확인해 판정한다.

---

## 20. Production write 원칙

읽음 처리 같은 **복원 불필요한 사용자 개인 알림 write**는 TEST-ACCOUNTS에서 최소 수행 가능하다.

허용:

```text
test account
단건 read
전체 read
```

단, 실제 테스트 알림이 존재하는 경우에만 한다.

금지:

```text
실사용자 알림 변경
운영 알림 삭제
강제 알림 생성
backend DB 직접 write
```

삭제는 기본적으로 수행하지 않는다.

---

## 21. 5서비스 adoption

공통 Notifications View/Core를 만들었다면 반드시:

```text
KPA
GP
KCos
Neture
PH
```

전부 adoption 여부를 판정한다.

기능이 없는 서비스에 새 화면을 만들지 않는다.

---

## 22. 완료 census 기준

목표:

```text
미조사          = 0
VIEW_DUPLICATED = 0
CORE_ONLY       = 0
```

근거 있는:

```text
SERVICE_SPECIFIC
NOT_IMPLEMENTED
OUT_OF_SCOPE
```

는 잔존 가능.

---

## 23. Mobile

실측 확인:

```text
긴 메시지 wrap
날짜/시간 잘림 없음
badge 잘림 없음
deep link 터치 가능
읽음/안읽음 식별 가능
horizontal overflow 없음
navigation 유지
```

---

## 24. Production browser

기능이 실제 존재하는 모든 서비스에서 production 검증한다.

최소:

```text
로그인
→ 알림 진입
→ 목록
→ unread/read 표시
→ 알림 클릭/deep link
→ 뒤로가기
→ 새로고침
```

읽음 write가 안전한 테스트 알림에 가능하면:

```text
unread
→ read
→ 새로고침
→ persist
```

까지 확인.

기능이 없는 서비스는 dead entry 0 확인.

desktop/mobile 모두 수행.

---

## 25. Browser 합격 기준

```text
white screen = 0
JS exception = 0
unexpected 401/403 = 0
404 = 0
5xx = 0
dead notification link = 0
잘못된 unread count = 0
잘못된 type label = 0
mobile 기능 소실 = 0
double shell = 0
```

의도된 guard는 실패로 세지 않는다.

---

## 26. 결함 발견 시

이번 Notifications 범위 결함이면:

```text
원인 확인
→ 최소 수정
→ typecheck/build
→ 필요 시 관련 frontend test
→ 배포
→ production 재검증
```

까지 중간 승인 없이 진행.

다음이면 중지:

```text
신규 notification backend contract
DB schema/migration
새 notification entity
push/email/SMS 인프라 설계
Identity 변경
membership lifecycle 변경
다른 세션 WIP 충돌
```

---

## 27. 정적 검증

공통 package 변경 시 최소:

```text
@o4o/account-ui build

KPA typecheck/build
GP typecheck/build
KCos typecheck/build
Neture typecheck/build
PH typecheck/build
```

backend 변경이 없으면 backend test는 불필요.

관련 기존 frontend test가 있으면 수행.

---

## 28. CHECK

작성:

```text
docs/checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-NOTIFICATIONS-COMMONIZATION-V1.md
```

포함:

```text
1. 기준 commit
2. 5서비스 Notifications 모집단
3. 16기능 census
4. backend/API 계약
5. Before / After
6. 공통 Notifications Core/View
7. View model / adapter
8. notification type mapping
9. unread/read
10. unread badge
11. deep link
12. settings 진입
13. Service Extension
14. empty/loading/error
15. 5서비스 adoption
16. desktop/mobile
17. production browser
18. production write
19. backend/DB/schema
20. 잔존 followup
21. MUST_FIX_BEFORE_CLOSE
22. CHECK/commit/push
```

---

## 29. FINAL CLOSE

다음 전부 충족 시:

```text
미조사 = 0
VIEW_DUPLICATED = 0
CORE_ONLY = 0

존재하는 중복 Notifications UI 수렴 완료
기능 없는 서비스 dead entry = 0
5서비스 adoption 판정 완료
dead deep link = 0
desktop/mobile PASS
production browser PASS
MUST_FIX_BEFORE_CLOSE = 0
```

최종:

```text
MYPAGE NOTIFICATIONS TRACK = FINAL CLOSED
```

---

## 30. 후속

종료 후 다음 후보:

```text
Activity / 이력
Help / 문의
```

다음은 별도 트랙으로 유지:

```text
membership 메타 self-read 계약
KPA 알림 backend 공통화
조회 실패 삼킴 계약화
```

이번 WO에서 섞지 않는다.

---

## 31. Git

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

## 32. 최종 보고

```text
1. 기준 commit / deployed revision
2. 5서비스 census
3. Before / After
4. backend/API 계약
5. 공통 Notifications Core/View
6. View model
7. type mapping
8. unread/read
9. unread badge
10. deep link
11. settings 진입
12. Service Extension
13. 5서비스 adoption
14. desktop/mobile
15. production browser
16. production write
17. typecheck/build/test
18. backend/DB/schema
19. 잔존 followup
20. MYPAGE NOTIFICATIONS FINAL CLOSED 여부
21. CHECK/commit/push
22. 최종 Git 상태
```

마지막 줄:

```text
문서 정합: 발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건
```

## 33. 실행 원칙

중간 승인 없이:

```text
현재 main census
→ backend/API 계약 조사
→ 공통화
→ 5서비스 adoption
→ 정적 검증
→ 배포
→ production desktop/mobile
→ CHECK
→ path-specific commit
→ push
```

까지 한 번에 완료한다.

**이번 작업의 핵심은 새로운 알림 시스템을 만드는 것이 아니라, 현재 실제로 존재하는 알림 기능만 찾아 사용자에게 보이는 목록·읽음 상태·배지·진입 경험을 공통화하는 것이다.**

---

## 부기 (실행 시점 사실 · 알려진 함정)

> 본문 §1~§33 은 발주 원문이다. 아래는 착수 시점의 저장소 실측 사실과 선행 트랙에서 확인된 함정이며, 원문과 충돌하면 원문이 우선한다.
> 아래 경로 목록은 **모집단 재산출(§4)의 출발점일 뿐 결론이 아니다.** 반드시 현재 main 에서 직접 재확인한다.

### A. 기준 상태

* 기준 commit: `7d6ee08e2` (`HEAD == origin/main`, 작업트리 clean)
* 선행 6트랙 CHECK: Shell `0d7a47707` · Home/Hub `08b68a60d` · Requests `732743649` · Settings/Security `ada123e72` · Membership/Role `894917d91`

### B. 이미 존재하는 공통 알림 자산 (§7 additive 확장 대상)

```text
packages/account-ui/src/components/NotificationBell.tsx   ← §11 badge 공통 자산이 이미 있다
packages/account-ui/src/notifications/useNotifications.ts ← 조회 훅
packages/account-ui/src/notifications/types.ts            ← 타입
```

세 자산 전부 `packages/account-ui/src/index.ts` 에서 export 된다(`NotificationBell` · `useNotifications` · `NotificationBellProps`). **§11 "중복 구현이 2서비스 이상이면 공통화 후보" 판정 전에 이 자산의 실제 소비처를 먼저 세라.** 이미 공통 자산이 있는데 서비스가 안 쓰고 있다면 `VIEW_DUPLICATED` 가 아니라 `CORE_ONLY`(adoption gap) 다.

### C. 서비스별 알림 client (§5·§6 조사 출발점)

**5서비스 전부 자체 notifications client 를 가지고 있다.** 이것 자체가 §22 의 `VIEW_DUPLICATED`/`CORE_ONLY` 1순위 후보다.

```text
services/web-kpa-society/src/api/notifications.ts
services/web-glycopharm/src/lib/api/notifications.ts
services/web-k-cosmetics/src/lib/api/notifications.ts
services/web-neture/src/lib/api/notifications.ts
services/web-pharmacy-hub/src/lib/api/notifications.ts
```

**deep link 라우팅(§12)은 2서비스에만 있다** — 나머지 3서비스가 어떻게 처리하는지가 census 핵심 질문이다.

```text
services/web-kpa-society/src/lib/notificationRouting.ts
services/web-neture/src/lib/notificationRouting.ts
```

`services/web-neture/src/pages/operator/settings/EmailNotificationSettingsPage.tsx` 는 **operator 화면**이다 — §13 범위 밖(개인 My Page 관점)인지 먼저 판정하고, 범위 밖이면 `OUT_OF_SCOPE` 로 기록만 한다.

### D. Backend 계약 실측 (§6)

```text
apps/api-server/src/routes/notifications.routes.ts          ← 공통 알림 route (1순위 조사)
apps/api-server/src/services/NotificationService.ts
apps/api-server/src/entities/Notification.ts
apps/api-server/src/database/migrations/20260913000000-CreateNotificationsTable.ts

apps/api-server/src/routes/forum/forum.notifications.routes.ts   ← Forum 별도 축
apps/api-server/src/services/forum/ForumNotificationService.ts
apps/api-server/src/entities/ForumNotification.ts
apps/api-server/src/services/forum/NotificationEventHub.ts

apps/api-server/src/routes/operator-notification.routes.ts       ← operator 축 (§13 범위 밖 가능성)
```

**`Notification` 과 `ForumNotification` 은 별개 entity·별개 route 다.** 하나로 합치려는 시도는 §26 중지 조건(신규 notification backend contract / 새 notification entity)에 해당한다. 두 축이 사용자 화면에서 어떻게 합쳐 보이는지만 census 에 기록한다.

`apps/api-server/notification.service.legacy.txt` 는 legacy 텍스트 파일이다. 코드가 아니므로 판정 근거로 쓰지 않는다.

### E. 선행 조사 문서 (읽되 수치는 재사용 금지 — §4)

```text
docs/archive/investigations/IR-O4O-CROSSSERVICE-NOTIFICATION-BELL-EXPOSURE-AUDIT-V1.md
docs/archive/investigations/IR-O4O-CROSSSERVICE-NOTIFICATION-EMISSION-AUDIT-V1.md
```

두 문서는 이미 crossservice bell 노출·알림 발생을 감사한 이력이다. **배경 이해에는 쓰되, §4 대로 모집단 수치는 현재 main 에서 다시 산출한다.** archive 문서는 CLAUDE.md §16-1 상 정비 대상이 아니므로 손대지 않는다.

### F. `apps/` 하위는 대상이 아닐 가능성이 높다

`apps/admin-dashboard/**` 와 `apps/main-site/**` 에도 NotificationBell·NotificationList·NotificationFeedPage 가 있으나, 이번 WO 대상은 **5서비스(`services/**`)의 개인 My Page** 다. `apps/` 것은 `OUT_OF_SCOPE` 로 판정하고 근거만 남긴다. 공통화한다며 `apps/` 를 끌어들이지 않는다.

### G. §12 anti-hardcoding 자체 점검

공통 컴포넌트 커밋 전 실행하고, 매칭이 주석 외에 남으면 §9·§12 위반이다.

```bash
grep -nE "serviceKey|kpa|glycopharm|cosmetics|neture|pharmacy|type ===|'/mypage|'/forum" \
  packages/account-ui/src/<새-또는-변경-파일>
```

props 타입 선언은 허용되나 그 값으로 분기하면 위반이다. Membership 트랙에서 이 점검은 주석 2줄만 남기고 PASS 했다 — 같은 기준을 적용한다.

### H. §18 조회 실패 삼킴 — 이미 알려진 사례

KPA `listMyRequests` 의 `catch { return [] }` 가 Requests 트랙 followup 으로 이미 기록돼 있다. 알림 client 에도 같은 패턴이 있을 가능성이 높다. **§18 대로 발견해도 고치지 말고 followup 으로만 기록한다.** 별도 "조회 실패 삼킴 계약화" 트랙(`project-neture-load-error-contract-series`)이 이 문제의 정본 소유자다.

### I. 검증 함정

* 로그인 API 는 **`serviceKey` 필수**. 없으면 `users.password` 로 검증돼 정상 계정도 401 이 된다. "UI 는 되는데 curl 만 401" 이면 이 원인이다.
* K-Cosmetics 프로덕션 도메인은 **`k-cosmetics.site`** (`k-cosmetics.co.kr` 은 무관한 외부 쇼핑몰).
* PH 로그인 화면의 데모 버튼 비밀번호는 stale 하다. 자격증명은 `docs/local/TEST-ACCOUNTS.local.md` 만 신뢰한다 (CLAUDE.md §15).
* 배포 후 stale chunk 로 구버전이 보일 수 있다 — 캐시 버스트 후 재확인.
* **선행 3트랙 모두, 정적 분석으로는 통과했으나 실제 브라우저 렌더 문자열에서만 결함이 드러났다** (raw enum 노출 · 같은 신청의 label 불일치 · role 사전 키 접두 불일치). §24 는 스냅샷이 아니라 실제 렌더 문자열과 실제 네트워크 응답으로 판정한다.
* §20 read write 를 수행했다면 **어느 계정의 어떤 알림인지**를 CHECK 에 남긴다. 삭제는 하지 않는다.

### J. Git

* main 직접 작업. path-specific stage 만 사용하고 `git add .` 는 금지한다.
* 다른 세션의 dirty/untracked 파일은 stage·수정·stash 하지 않는다. 경로가 충돌하면 중지·보고한다.
* push 된 커밋은 amend·force-push 하지 않는다.
* 완료 조건은 저장소 전체 clean 이 아니라 **이번 WO 범위 미커밋 0건 + `HEAD == origin/main`** 이다.
