# WO-O4O-CROSS-SERVICE-MYPAGE-ACTIVITY-HISTORY-COMMONIZATION-V1

* **대상**: Agent D
* **성격**: My Page `Activity / 이력` 기능 census → 공통화 → 5서비스 adoption → production 검증
* **선행 완료**

  * `PROFILE TRACK = FINAL CLOSED`
  * `MYPAGE SHELL/LAYOUT TRACK = FINAL CLOSED`
  * `MYPAGE HOME/HUB TRACK = FINAL CLOSED`
  * `MYPAGE REQUESTS TRACK = FINAL CLOSED`
  * `MYPAGE SETTINGS/SECURITY TRACK = FINAL CLOSED`
  * `MYPAGE MEMBERSHIP/ROLE STATUS TRACK = FINAL CLOSED`
  * `MYPAGE NOTIFICATIONS TRACK = FINAL CLOSED`

---

## 1. 목표

My Page의 다음 개별 기능인 **Activity / 이력**을 5서비스 기준으로 전수 조사하고, 실제로 존재하는 개인 활동/최근 이력/처리 이력의 표시 구조를 공통화한다.

핵심:

```text
5서비스 Activity/History census
→ 데이터 의미와 소유 축 판별
→ 공통 feed/list/timeline 표현 분리
→ 서비스별 activity type은 Extension 유지
→ 5서비스 adoption
→ production desktop/mobile 검증
```

이번 WO의 핵심은 **서로 의미가 다른 데이터를 하나의 공통 활동 원장으로 억지로 합치는 것이 아니라, 사용자에게 보여주는 이력 표현 계층을 공통화하는 것**이다.

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

최신 `origin/main` 기준.

```bash
git fetch origin
git status -sb
git diff --cached --name-only
git rev-parse HEAD
git rev-parse origin/main
```

다른 세션 dirty/staged/untracked 파일:

```text
수정 금지
삭제 금지
stash 금지
```

`git add .` 금지.

path-specific stage만 사용.

---

## 4. Activity 모집단 재산출

현재 main에서 **개인 사용자에게 보여주는 활동/이력 관련 기능**을 전수 조사한다.

대표 범위:

```text
/mypage
/mypage/activity
/mypage/history
최근 활동
내 활동
처리 이력
신청 처리 이력
교육 이력
커뮤니티 활동
매장/공급자 업무 이력
감사/감사받은 활동
로그/타임라인
```

과거 Home/Hub CHECK의 activity 관련 수치를 모집단으로 재사용하지 않는다.

현재 main에서 재산출한다.

---

## 5. 기능 census

화면 수가 아니라 아래 기능 단위로 5서비스를 판정한다.

```text
1. Activity/History 기능 존재 여부
2. 최근 활동 목록
3. 전체 이력 목록
4. 활동 유형 표시
5. 발생 시각
6. 행위 주체/대상 표시
7. 상태/결과 표시
8. 상세/대상 deep link
9. 필터/탭
10. pagination/load more
11. empty/loading/error
12. Home/Navigation 진입
13. 날짜/상대시간 표시
14. mobile UX
15. 감사/평가/보상성 활동
16. 서비스별 Activity Extension
```

각 항목 기록:

```text
route
page/component
API
data source
read/write
activity type
target/entity
deep link
role/capability gate
desktop/mobile
현재 공통 component 사용 여부
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

## 6. 먼저 데이터 의미를 분리

아래 데이터를 Activity라는 이유만으로 합치지 않는다.

```text
Notifications
Requests
Membership 상태
Audit log
커뮤니티 활동
교육 이력
감사/칭찬
주문/거래 이력
운영자 activity
```

이번 WO의 대상은:

```text
사용자가 My Page에서
“최근 내가 했거나 내 계정/업무와 관련해 발생한 활동”
을 확인하는 기능
```

이다.

---

## 7. Notifications와 경계

이미 종료된 Notifications 트랙과 구분한다.

```text
Notification
= 사용자가 확인해야 할 사건/알림

Activity
= 이미 발생한 행동이나 상태 변화의 기록
```

같은 backend 데이터를 쓰더라도 사용자 의미가 다르면 별개로 판정한다.

Notification feed를 Activity feed로 재사용하는 식의 억지 통합 금지.

---

## 8. Requests와 경계

Requests:

```text
내가 신청한 항목과 처리 상태
```

Activity:

```text
그 신청을 포함해 내 계정에서 발생한 사건/행동의 시간순 기록
```

Requests의 신청 목록을 Activity라고 재분류하지 않는다.

---

## 9. 공통화 목표

공통화 대상은 **이력의 표현 구조**다.

개념:

```text
MyPageActivityView
├─ ActivityHeader
├─ ActivityFilter
├─ ActivityFeed
│  └─ ActivityItem
├─ ActivityTime
├─ ActivityTarget
└─ Empty/Loading/Error
```

실제 필요한 최소 컴포넌트만 만든다.

신규 package 생성 금지.

가능하면 `@o4o/account-ui`를 additive 확장한다.

---

## 10. 기존 자산 우선 재사용

먼저 현재 공통 자산을 조사한다.

대표:

```text
MyPageActivityFeed
MyPageAppreciationCard
MyPageEntryCardGrid
formatRelative
MyPageShell
MyPageNavigation
```

Home/Hub 트랙에서 만든 `MyPageActivityFeed`가 실제 Activity 공통화에 충분한지 우선 확인한다.

같은 feed를 새로 만들지 않는다.

---

## 11. 최소 공통 View Model

서비스별 API/entity를 하나의 DB 모델로 합치지 않는다.

필요하면 frontend adapter에서 최소 표시 모델로 변환한다.

예:

```text
id
type
typeLabel
title
description
occurredAt
actor
targetLabel
targetRoute
status
statusTone
metadata
```

공통 View는 이 최소 모델만 소비한다.

---

## 12. Activity type

서비스별 activity type enum은 그대로 유지한다.

예:

```text
profile_update
request_submitted
request_approved
education_completed
community_post
store_action
supplier_action
appreciation
```

실제 값은 current main에서 조사한다.

공통화 대상:

```text
label
icon
tone
description
target
```

공통 View 내부에서 serviceKey별 분기 금지.

---

## 13. 시간 표시

상대시간/날짜 표현이 중복돼 있으면 공통화한다.

예:

```text
방금 전
10분 전
어제
2026.08.20
```

이미 Notifications 트랙의 `formatRelative`가 재사용 가능하면 재사용한다.

Activity용으로 별도 상대시간 구현을 다시 만들지 않는다.

---

## 14. Deep link

Activity item 클릭 시 target이 있는 경우 실제 destination을 확인한다.

예:

```text
게시물
신청 상세
교육 이력
매장 업무
공급자 업무
```

공통 View 내부 route 하드코딩 금지.

`targetRoute` 또는 callback/config로 주입한다.

dead destination은 MUST_FIX 후보.

---

## 15. 감사/Appreciation 기능

Home/Hub에서 이미 `MyPageAppreciationCard`가 존재한다.

감사/칭찬/보상성 활동이 Activity와 연결되는 서비스가 있으면:

```text
최근 activity feed에 포함하는지
별도 summary/card로 유지하는지
```

현행 UX 의미를 확인한다.

억지로 feed에 병합하지 않는다.

---

## 16. 데이터 계약 없음

특히 선행 Home/Hub에서 확인된:

```text
Neture
개인 활동 원장 API 계약 부재
items={[]} empty state만 렌더
```

를 다시 current main에서 확인한다.

실제로 backend 계약이 없다면:

```text
NOT_IMPLEMENTED
```

또는 근거 있는 `SERVICE_SPECIFIC`으로 판정한다.

**이번 WO에서 새 Activity backend endpoint를 만들지 않는다.**

---

## 17. Backend 계약 확인

각 서비스에서 실제 activity source를 확인한다.

분류:

```text
A. backend + UI 존재
B. backend만 존재
C. UI만 존재
D. 둘 다 없음
```

확인:

```text
endpoint
scope
user self-read 여부
pagination
sort
filter
activity type
target metadata
```

기능이 없다고 새 통합 activity API를 만들지 않는다.

---

## 18. Audit Log와 경계

운영/보안 audit log가 존재하면 개인 Activity와 분리한다.

예:

```text
관리자 감사 로그
운영자 변경 로그
시스템 보안 로그
```

는 개인 My Page에서 소비하지 않는다면 `OUT_OF_SCOPE`.

Activity 공통화를 위해 민감한 audit log를 사용자에게 노출하지 않는다.

---

## 19. 주문/거래 이력과 경계

주문·결제·거래 원장은 My Page Activity와 별도 업무축일 수 있다.

다음 경우에만 Activity item으로 포함:

```text
현재 My Page Home/Activity가
그 사건을 최근 활동으로 실제 표시하고 있는 경우
```

주문 원장 자체를 Activity로 공통화하지 않는다.

---

## 20. 필터/탭

2서비스 이상에서 유사한 필터 구조가 있으면 공통화 후보.

예:

```text
전체
신청
교육
커뮤니티
매장
```

서비스별 type 집합이 다르면 config 주입.

모든 서비스에 같은 filter를 강제하지 않는다.

---

## 21. Pagination / load more

실제 계약이 있는 경우만 공통화한다.

```text
page
limit
cursor
load more
```

API가 전체 소량 데이터를 반환하는 서비스에 억지 pagination을 도입하지 않는다.

---

## 22. Empty / Loading / Error

가능한 공통 상태:

```text
활동 내역이 없습니다
불러오는 중
조회 실패
재시도
```

다음은 반드시 구분한다.

```text
실제 empty
401/403 → empty 삼킴
5xx → empty 삼킴
API 계약 자체 없음
```

조회 실패를 `[]`로 숨기는 계약을 발견하면 이번 WO에서 무단 수정하지 않고 **Load-Error/조회 실패 삼킴 트랙 followup**으로 기록한다.

---

## 23. Service Extension

서비스별 Activity 특성은 정상 잔존 가능.

예:

### KPA

```text
약사회 활동
교육/증명
커뮤니티
감사
```

### GlycoPharm

```text
교육/학점
서비스 신청
```

### K-Cosmetics

```text
교육/LMS
매장 관련 활동
```

### Neture

```text
supplier/partner 활동
community
```

### Pharmacy-Hub

```text
가입/매장 연결
store-owner 활동
```

실제 존재하는 기능만 반영한다.

---

## 24. 기능 없는 서비스

Activity 기능이 없으면:

```text
NOT_IMPLEMENTED
```

로 판정한다.

금지:

```text
빈 Activity 페이지 신설
dummy history 생성
새 backend endpoint 생성
Home에 dead entry 추가
```

dead entry가 없는지만 확인한다.

---

## 25. 5서비스 adoption

공통 Activity View/Core를 만들었다면 반드시:

```text
KPA
GP
KCos
Neture
PH
```

전부 adoption 여부를 판정한다.

한 서비스 적용만으로 완료 선언 금지.

---

## 26. 완료 census 기준

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

## 27. Mobile

실측:

```text
긴 activity title wrap
description 잘림 없음
상대시간/날짜 잘림 없음
badge/status 표시
deep link 터치 가능
filter overflow 정상
horizontal overflow 없음
navigation 유지
```

---

## 28. Production browser

기능이 실제 존재하는 모든 서비스에서 production 검증.

최소:

```text
로그인
→ My Page
→ Activity/최근 활동 확인
→ activity item 렌더
→ 시간/유형/상태 확인
→ target 있는 item 클릭
→ 뒤로가기
→ 새로고침
```

기능 없는 서비스는:

```text
dead Activity entry 0
JS exception 0
```

확인.

desktop/mobile 모두 수행.

---

## 29. Production write

이번 WO는 **read-only**.

금지:

```text
테스트 activity 직접 생성
DB activity insert
실사용자 상태 변경
요청/교육/커뮤니티 이벤트 강제 생성
```

기존 production 테스트 계정 데이터만 읽는다.

실제 activity sample이 없으면:

```text
API payload
adapter/view model
renderer
route tree
```

증거로 대체하고 이유를 CHECK에 기록한다.

---

## 30. Browser 합격 기준

```text
white screen = 0
JS exception = 0
unexpected 401/403 = 0
404 = 0
5xx = 0
dead activity link = 0
잘못된 activity type label = 0
잘못된 time display = 0
mobile 기능 소실 = 0
double shell = 0
```

---

## 31. 결함 발견 시

이번 Activity 범위 결함이면:

```text
원인 확인
→ 최소 수정
→ typecheck/build
→ 필요 시 frontend test
→ 배포
→ production 재검증
```

까지 중간 승인 없이 수행.

다음이면 중지:

```text
새 Activity backend contract
DB schema/migration
새 activity entity
audit architecture 변경
Identity/membership 변경
다른 세션 WIP 충돌
```

---

## 32. 정적 검증

공통 package 변경 시 최소:

```text
@o4o/account-ui build

KPA typecheck/build
GP typecheck/build
KCos typecheck/build
Neture typecheck/build
PH typecheck/build
```

backend 무변경이면 backend test 불필요.

관련 frontend/unit test가 있으면 수행.

---

## 33. CHECK

작성:

```text
docs/checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-ACTIVITY-HISTORY-COMMONIZATION-V1.md
```

포함:

```text
1. 기준 commit / deployed revision
2. 5서비스 Activity 모집단
3. 16기능 census
4. backend/API/data source
5. Before / After
6. 기존 공통 자산
7. 공통 Activity Core/View
8. View model / adapter
9. activity type mapping
10. time formatting
11. deep link
12. appreciation 경계
13. Requests/Notifications 경계
14. Service Extension
15. empty/loading/error
16. 5서비스 adoption
17. desktop/mobile
18. production browser
19. production write
20. backend/DB/schema
21. 잔존 followup
22. MUST_FIX_BEFORE_CLOSE
23. CHECK/commit/push
```

---

## 34. FINAL CLOSE

다음 전부 충족 시:

```text
미조사 = 0
VIEW_DUPLICATED = 0
CORE_ONLY = 0

존재하는 중복 Activity UI 수렴 완료
기능 없는 서비스 dead entry = 0
5서비스 adoption 판정 완료
dead activity link = 0
desktop/mobile PASS
production browser PASS
MUST_FIX_BEFORE_CLOSE = 0
```

최종:

```text
MYPAGE ACTIVITY/HISTORY TRACK = FINAL CLOSED
```

---

## 35. 후속

종료 후 다음 My Page 기능 후보:

```text
Help / 문의
```

별도 유지:

```text
조회 실패 삼킴 계약화
membership 메타 self-read 계약
Neture activity backend 부재
기타 신규 backend 계약
```

이번 WO에 섞지 않는다.

---

## 36. Git

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

## 37. 최종 보고

```text
1. 기준 commit / deployed revision
2. 5서비스 census
3. Before / After
4. backend/API/data source
5. 공통 Activity Core/View
6. View model
7. type mapping
8. time formatting
9. deep link
10. appreciation 경계
11. Service Extension
12. 5서비스 adoption
13. desktop/mobile
14. production browser
15. production write
16. typecheck/build/test
17. backend/DB/schema
18. 잔존 followup
19. MYPAGE ACTIVITY/HISTORY FINAL CLOSED 여부
20. CHECK/commit/push
21. 최종 Git 상태
```

마지막 줄:

```text
문서 정합: 발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건
```

## 38. 실행 원칙

중간 승인 없이:

```text
현재 main census
→ 데이터 의미/API 계약 조사
→ 기존 Activity 자산 재사용 판정
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

**이번 작업의 핵심은 모든 이벤트를 하나의 활동 원장으로 합치는 것이 아니라, 현재 실제로 존재하는 개인 활동·최근 이력을 동일한 My Page 표현 계약으로 수렴시키는 것이다.**

---

# 부기 — 실행 시점 저장소 실측 (원문 아님)

> 아래는 WO 원문이 아니라, 착수 시점(2026-08-20) 저장소 실측이다.
> 원문과 충돌하면 **원문이 우선**한다. 여기 적힌 경로·수치는 **모집단의 출발점일 뿐 결론이 아니다.**
> §4 는 과거 CHECK 수치 재사용을 금지한다. 아래 내용도 직접 재확인 대상이다.

## A. 기준

- 기준 `origin/main` = `858787430`
- 선행 트랙 CHECK 는 `docs/checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-*.md` 에 있다. **읽되 수치를 옮겨오지 말 것**(§4).
- 확장점은 `@o4o/account-ui` 하나다. **신규 package 생성 금지**(§9) — `services/web-kpa-society/Dockerfile` 이 선별 COPY 라 신규 패키지는 빌드를 깨뜨린다.

## B. §10 기존 자산 — 이미 존재한다

`packages/account-ui/src/components/` 에 33개 컴포넌트가 있다. Activity 관련 실측:

| 자산 | 소비처 | 비고 |
|---|---|---|
| `MyPageActivityFeed.tsx` (110줄) | KPA `MyDashboardPage`, Neture `MyPageHub` | Home 카드용. **데이터 조회·모델 정의를 하지 않는다**(서비스가 표시용 item 을 넣는 구조) |
| `MyPageAppreciationCard.tsx` | KPA, GP, KCos (3서비스) | §15 경계 대상 |
| `MyPageEmptyState` / `MyPageLoadingState` | 다수 | §22 |
| `MyEnrollmentsView` / `MyCertificatesView` / `MyCreditsView` | GP, KCos | **이력 성격이지만 별도 화면축이다. Activity 로 재분류할지 §6·§19 에서 판단할 것** |

`MyPageActivityFeed` 의 item 모델은 이미 `key/icon/title/description/meta/href` 다. §11 의 최소 View Model 을 새로 만들기 전에 **이 모델의 확장으로 충분한지 먼저 판정**하라. 충분하면 새 컴포넌트 트리(§9 의 6개)를 만들지 않는 것이 옳다.

## C. **가장 중요 — Activity 전용 route 가 어느 서비스에도 없다**

`services/*/src/App.tsx` 전수 grep 결과 `/mypage/activity` · `/mypage/history` 계열 route **0건**이다.
(`/setup-activity`(KPA)·`/admin/catalog-import/history`(Neture) 는 이름만 겹치는 무관 route다.)

즉 현재 Activity 는 **Home 안의 카드 하나로만 존재**한다. §4 의 모집단은 "전체 이력 화면" 이 아니라 그 카드에서 출발한다.
**§24 가 금지하는 "빈 Activity 페이지 신설" 에 정확히 해당하므로, 전체 이력 route 를 새로 만들지 말 것.**

## D. **KPA `/mypage/activities` 는 상수 빈 배열 stub 이다**

`apps/api-server/src/routes/kpa/services/mypage.service.ts:235`

```ts
getActivities(): { data: any[]; pagination: any } {
  return { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
}
```

`mypage.controller.ts:91` 이 이를 그대로 반환하며 주석도 `(placeholder)` 다. 인접한 `GET /summary` 도 전부 0 을 돌려주는 동일 stub 이다.

**함정**: §17 의 분류에서 이것을 "B. backend만 존재" 로 적으면 오판이다. endpoint 는 200 을 주지만 **계약이 없다.** 실데이터를 반환하는 경로가 존재하지 않으므로 `NOT_IMPLEMENTED` 계열이다. 프로덕션에서 실제 응답을 확인해 판정 근거로 남겨라.

Neture 는 `MyPageHub.tsx:108` 에서 `<MyPageActivityFeed items={[]} />` 로 **하드코딩 빈 배열**을 넘긴다(주석에 계약 부재 명시).

따라서 **KPA·Neture 양쪽 모두 현재 화면에 활동이 한 건도 표시되지 않을 가능성이 높다.** 이 경우 §26 의 `VIEW_DUPLICATED = 0` · `CORE_ONLY = 0` 은 이미 충족돼 있고, 이번 WO 의 산출물은 공통화가 아니라 **정확한 census 와 근거 있는 `NOT_IMPLEMENTED` 판정**이 된다. 만들 것이 없으면 만들지 않는 것이 §16·§24 를 지키는 것이다. **없는 기능을 공통화하려고 채워 넣지 말 것.**

## E. **`activity` 라는 단어의 동음이의 함정**

`kpa_members.activity_type` 이 존재하지만 이것은 **근무형태**(`pharmacy_owner` / `pharmacy_employee` / `hospital` 등)이며 사용자 활동 이력과 **아무 관계가 없다**. 회원 정보 축이고 organization 동기화 트리거다.

`git grep activity` 는 이 값과 테스트 파일에 대량 적중한다. **문자열 매칭 결과를 모집단에 그대로 넣지 말고 의미로 걸러라**(§6).

## F. §13 시간 표시 — 이미 2벌 있다

```text
packages/account-ui/src/notifications/formatRelative.ts   (Notifications 트랙 산출물, 25줄)
packages/utils/src/format.ts                              (formatRelative — forum-core·shortcodes 가 소비)
```

§13 은 "Activity 용으로 별도 상대시간 구현을 다시 만들지 않는다" 고 명시한다. **3벌째를 만들지 말 것.** 다만 이미 2벌이 있다는 사실은 이번 WO 범위의 결함이 아니다 — 둘을 통합하려 들지 말고 재사용 판정만 하고, 통합이 필요하다고 보이면 followup 으로 기록하라.

## G. mypage backend 실측 (§17 출발점)

```text
KPA    /api/v1/kpa/mypage/*        profile · settings · activities(stub) · summary(stub)
                                    · enrollments · certificates · my-requests
GP     /api/v1/glycopharm/mypage/* my-requests · business-info          ← activities 없음
KCos   /api/v1/cosmetics/mypage/*  business-info                        ← activities 없음
Neture                              mypage 라우터 자체 없음
PH                                  `/mypage` 없음 — `/account` · `/store-owner/account`
```

PH 는 선행 트랙에서 확인됐듯 `/mypage` 를 쓰지 않는다. **PH 에 `/mypage/activity` 를 만들어 축을 맞추려 하지 말 것**(§24).

## H. §7·§8 경계에서 실제로 헷갈릴 지점

- `MyRequestsInbox` (Requests 트랙 산출물) 가 이미 신청 이력을 시간순으로 보여준다. **이것을 Activity 로 재분류하지 말 것**(§8 명시).
- Notifications 트랙은 `FINAL CLOSED` 다. `NotificationSheet`/`NotificationListBody` 를 Activity feed 로 재사용하는 것은 §7 이 금지하는 억지 통합이다.
- `MyEnrollmentsView`/`MyCertificatesView`/`MyCreditsView` 는 교육 **이력**이지만 이미 독립 화면·독립 공통 자산이다. Activity feed 에 병합하려 들지 말고 §23 Extension 으로 판정하는 쪽이 현행 UX 에 맞을 가능성이 높다.

## I. §22 조회 실패 삼킴

KPA `/mypage/activities` 는 stub 이라 **실패조차 없다**(항상 200 + `[]`). Neture 는 API 호출 자체가 없다. 따라서 이번 범위에서 "실패를 `[]` 로 숨기는" 계약이 새로 발견될 여지는 적지만, 발견되면 §22 대로 **무단 수정하지 말고 Load-Error 트랙 followup 으로만 기록**하라.

## J. §29 read-only

이번 WO 는 production write 0 이다. 활동 이벤트를 만들어 내기 위해 게시글 작성·수강 신청·요청 제출 같은 **실제 사용자 흐름을 실행하는 것도 금지**다(§29 "요청/교육/커뮤니티 이벤트 강제 생성"). 샘플이 없으면 §29 의 4단 증거로 대체하고 이유를 CHECK 에 남겨라.

## K. 다른 세션 WIP

착수 시점 작업트리 clean, `HEAD == origin/main == 858787430`. 이 트랙은 병렬 세션이 잦으니 착수 직전 `git status -sb` 를 다시 확인하고, 본인 것이 아닌 dirty/untracked 파일은 **접촉하지 않는다**(§3·§36).

## L. 보고

§37 의 21개 항목 순서를 그대로 지키고, 마지막 줄에 CLAUDE.md §16-5 의 `문서 정합:` 한 줄을 포함한다.
**§34 의 조건을 채우지 못하면 FINAL CLOSED 를 선언하지 말고 그대로 보고하라.** 반대로 census 결과 만들 것이 없다는 결론이면 그것도 정당한 완료다 — 근거를 CHECK 에 남기면 된다.
