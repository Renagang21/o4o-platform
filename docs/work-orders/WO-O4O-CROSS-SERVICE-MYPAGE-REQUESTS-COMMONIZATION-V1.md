# WO-O4O-CROSS-SERVICE-MYPAGE-REQUESTS-COMMONIZATION-V1

* **대상**: Agent D
* **성격**: My Page `Requests / 신청·승인 내역` 기능 census → 공통화 → 5서비스 adoption → production 검증
* **선행 완료**

  * `PROFILE TRACK = FINAL CLOSED` — [CHECK-O4O-CROSS-SERVICE-PROFILE-FINAL-BROWSER-CLOSURE-V1](../checks/CHECK-O4O-CROSS-SERVICE-PROFILE-FINAL-BROWSER-CLOSURE-V1.md)
  * `MYPAGE SHELL/LAYOUT TRACK = FINAL CLOSED` — [CHECK-O4O-CROSS-SERVICE-MYPAGE-SHELL-FINAL-CLOSURE-V1](../checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-SHELL-FINAL-CLOSURE-V1.md)
  * `MYPAGE HOME/HUB TRACK = FINAL CLOSED` — [CHECK-O4O-CROSS-SERVICE-MYPAGE-HOME-HUB-COMMONIZATION-V1](../checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-HOME-HUB-COMMONIZATION-V1.md)

---

## 1. 목표

My Page의 공통 Shell과 Home/Hub가 안정화된 상태에서, 다음 개별 기능인 **신청·승인·요청 내역(Requests)** 을 5서비스 기준으로 공통화한다.

핵심:

```text
5서비스 Requests 기능 census
→ 공통 목록/상태/액션 구조 분리
→ 공통 Requests View/Core 구현
→ 서비스별 workflow는 Extension 유지
→ 5서비스 adoption
→ production desktop/mobile 검증
```

이번 WO에서는 membership lifecycle 자체나 승인 backend 정책을 재설계하지 않는다.

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

다른 세션 dirty/staged 파일은 수정·삭제·stash하지 않는다.

`git add .` 금지. path-specific stage만 사용.

---

## 4. Requests 모집단 재산출

현재 main에서 My Page 개인 사용자 관점의 요청/신청/승인 관련 기능을 전수 조사한다.

대표 범위:

```text
/mypage/requests
/mypage/applications
/mypage/enrollments
/account/...request
개인 신청내역
가입 신청
승인 대기
반려/취소
서비스 이용 신청
```

과거 CHECK 수치를 모집단으로 재사용하지 않는다.

---

## 5. 기능 census

화면 개수가 아니라 아래 기능 단위로 5서비스를 판정한다.

```text
1. 요청/신청 목록
2. 요청/신청 상세
3. 상태 표시
4. 신청일/처리일 표시
5. 승인/반려 결과 표시
6. 사용자 취소
7. 재신청
8. 보완/수정
9. 처리 사유/메모
10. 대상 서비스/조직 표시
11. empty/loading/error
12. Home/Navigation 진입
13. mobile UX
14. 서비스별 고유 workflow
```

각 항목:

```text
route
page/component
API
data shape
status mapping
action
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

## 6. 공통화 목표

공통화 대상은 **사용자에게 보이는 Requests 표현 구조와 상태 표현**이다.

개념:

```text
MyPageRequestsView
├─ RequestsHeader
├─ RequestsFilter
├─ RequestList
│  └─ RequestRow/Card
├─ RequestStatusBadge
├─ RequestActionArea
└─ Empty/Loading/Error
```

실제 필요한 컴포넌트만 최소 추가한다.

신규 패키지는 만들지 않는다.

가능하면 기존 `@o4o/account-ui`를 확장한다.

---

## 7. 기존 My Page 구조 재사용

반드시 기존 공통 구조 안에서 동작해야 한다.

```text
MyPageShell
MyPageNavigation
MyPageEntryCardGrid
```

Requests용 별도 Shell/Layout을 만들지 않는다.

Home/Hub의 Requests 진입도 기존 entry 모델을 유지한다.

---

## 8. 데이터 계약 원칙

서비스별 backend 응답을 하나의 DB 모델로 강제 통합하지 않는다.

필요하면 frontend adapter에서 최소 공통 view model로 변환한다.

예:

```text
id
title
type
status
statusLabel
submittedAt
processedAt
description
reason
actions
metadata
```

공통 View는 이 최소 모델만 소비한다.

---

## 9. 상태값 공통화 원칙

서비스별 실제 상태 enum은 유지한다.

예를 들어:

```text
pending
approved
rejected
cancelled
completed
```

이 서로 다르게 구현돼 있어도 backend enum을 재설계하지 않는다.

공통화 대상은:

```text
tone
label
description
available action
```

이다.

서비스별 상태 → 공통 표시 모델 변환은 adapter/config에서 처리한다.

---

## 10. 액션 공통화

액션 UI는 공통화할 수 있다.

예:

```text
상세 보기
취소
재신청
보완
관련 업무 이동
```

하지만 **실제 액션 가능 여부는 서비스 정책을 유지**한다.

공통 View 내부에서 serviceKey/role/status 조합을 하드코딩하지 않는다.

---

## 11. 서비스별 workflow 유지

근거 있는 차이는 `SERVICE_SPECIFIC`.

예상:

### KPA

```text
회원/직역/서비스 관련 신청
약사회 특화 승인 흐름
```

### GlycoPharm

```text
서비스 신청
교육/등록 관련 신청
```

### K-Cosmetics

```text
매장/서비스 신청
교육/LMS 관련 신청
```

### Neture

```text
supplier / partner 관련 신청
```

### PharmacyHub

```text
가입/매장 연결/역할 관련 상태
```

이 workflow들을 하나의 승인 엔진으로 합치지 않는다.

---

## 12. Membership과 경계

Requests와 Membership은 겹칠 수 있지만 이번 WO에서는 경계를 명확히 한다.

Requests:

```text
"내가 무엇을 신청했고 지금 어떤 상태인가"
```

Membership:

```text
"현재 내가 어떤 회원/역할 상태인가"
```

이번 WO에서는 **신청 이력과 처리 상태**만 다룬다.

현재 membership SSOT나 lifecycle은 변경하지 않는다.

---

## 13. 승인자 기능 제외

이번 WO는 사용자 My Page 관점이다.

다음은 범위 밖:

```text
운영자 승인 콘솔
관리자 심사 화면
승인 큐
대량 승인
운영자 반려 메모 작성
```

사용자는 그 결과를 조회하는 것만 대상.

---

## 14. 상세 화면

서비스별 요청 상세가 2서비스 이상에서 중복된다면 공통화 후보로 포함한다.

단:

```text
목록 공통화만 하고
상세 중복을 그대로 남긴 채
전체 완료 선언
```

금지.

상세가 genuinely 서비스 고유면 `SERVICE_SPECIFIC` 사유를 명시한다.

---

## 15. Empty / Loading / Error

다음 상태 표현은 가능한 한 공통화한다.

```text
신청 내역 없음
불러오는 중
조회 실패
권한 없음
재시도
```

의도된 인증/권한 guard와 실제 오류를 구분한다.

---

## 16. Mobile

Requests는 모바일에서 카드형/행형 UI 차이가 생기기 쉬우므로 반드시 실측한다.

확인:

```text
status 잘림 없음
날짜 잘림 없음
action button 접근 가능
상세 진입 가능
horizontal overflow 없음
filter/tab 사용 가능
```

---

## 17. Backend 원칙

먼저 현행 API를 전수 조사한다.

공통화 때문에 새 backend endpoint를 만들지 않는다.

다음이 확인되면 별도 blocker/followup:

```text
frontend 화면은 있으나 API 없음
동일 사용자 요청조회 계약이 서비스별로 구조적으로 불완전
권한상 사용자 self-read 불가
```

새 API/DB/schema/migration이 필요하면 이번 WO에서 확장하지 않는다.

---

## 18. 죽은/미구현 기능 처리

다음은 명확히 구분한다.

```text
UI와 API 모두 없음
→ NOT_IMPLEMENTED

API만 있고 사용자 화면 없음
→ NOT_IMPLEMENTED 또는 SERVICE_SPECIFIC 근거 기록

route/menu만 있고 실화면 dead
→ MUST_FIX 또는 제거 판정

사용되지 않는 legacy view
→ adoption 대상에서 제외하되 근거 기록
```

dead link를 `SERVICE_SPECIFIC`으로 숨기지 않는다.

---

## 19. 5서비스 adoption

공통 Requests View/Core를 만들었다면 반드시 5서비스를 판정한다.

```text
KPA
GP
KCos
Neture
PH
```

한 서비스만 적용한 뒤 완료 선언 금지.

기능 자체가 없는 서비스는 억지로 새 화면을 만들지 않는다.

---

## 20. 완료 census 기준

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

## 21. 정적 검증

공통 package 변경 시 최소:

```text
@o4o/account-ui build

KPA typecheck/build
GP typecheck/build
KCos typecheck/build
Neture typecheck/build
PH typecheck/build
```

API 코드를 건드린 경우 관련 backend test/typecheck도 수행.

기존 unrelated 오류는 이번 변경과 분리해서 기록한다.

---

## 22. Production browser

기능이 실제 존재하는 모든 서비스에서 production 검증한다.

최소:

```text
로그인
→ My Page
→ Requests 진입
→ 목록 렌더
→ 상태 확인
→ 상세 또는 존재 action
→ 뒤로가기
→ 새로고침
```

desktop/mobile 모두 확인.

기능이 없는 서비스는 Home/Nav에서 dead entry가 없는지 검증한다.

---

## 23. Production write

이번 WO는 기본적으로 read 중심이다.

취소/재신청 같은 실제 write 검증이 필요하면:

```text
TEST-ACCOUNTS
테스트용 요청
최소 write
실사용자 0
```

만 허용.

기존 실제 신청을 임의 취소하지 않는다.

복원 불가능한 상태 전이는 수행하지 않는다.

---

## 24. Browser 합격 기준

```text
white screen = 0
JS exception = 0
unexpected 401/403 = 0
404 = 0
5xx = 0
dead link = 0
잘못된 상태 라벨 = 0
잘못된 action 노출 = 0
mobile 기능 소실 = 0
double shell = 0
```

---

## 25. 결함 발견 시

이번 Requests 범위 결함이면:

```text
원인 확인
→ 최소 수정
→ 정적 검증
→ 배포
→ production 재검증
```

까지 중간 승인 없이 진행.

다음이면 중지:

```text
DB schema/migration
membership lifecycle 재설계
승인 정책 재설계
새 공통 backend workflow
Identity 변경
다른 세션 WIP 충돌
```

---

## 26. CHECK

작성:

```text
docs/checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-REQUESTS-COMMONIZATION-V1.md
```

포함:

```text
1. 기준 commit
2. 5서비스 Requests 모집단
3. 기능 census
4. API/data shape
5. status mapping
6. Before / After
7. 공통 Requests View/Core
8. 서비스별 adapter/Extension
9. 목록
10. 상세
11. action
12. empty/loading/error
13. desktop/mobile
14. production browser
15. production write 여부
16. backend/DB/schema
17. 잔존 followup
18. MUST_FIX_BEFORE_CLOSE
19. CHECK/commit/push
```

---

## 27. FINAL CLOSE

다음 전부 충족 시:

```text
미조사 = 0
VIEW_DUPLICATED = 0
CORE_ONLY = 0

2서비스 이상 중복 Requests UI 수렴 완료
서비스별 workflow Extension 분리
dead request route/link = 0
desktop/mobile PASS
production browser PASS
MUST_FIX_BEFORE_CLOSE = 0
```

최종:

```text
MYPAGE REQUESTS TRACK = FINAL CLOSED
```

---

## 28. 후속

Requests 종료 후 다음 후보:

```text
Settings / Security
Membership / 역할 상태
Notifications
Activity / 이력
Help / 문의
```

이번 WO에서는 착수하지 않는다.

---

## 29. Git

```text
git add . 금지
path-specific stage
다른 세션 dirty/staged 파일 미접촉
```

완료 후:

```text
이번 WO 범위 dirty 0
push 완료
origin/main 반영 확인
```

로 종료.

---

## 30. 최종 보고

```text
1. 기준 commit / deployed revision
2. 5서비스 census
3. Before / After
4. 공통 Requests Core/View
5. API/data shape
6. status mapping
7. 서비스별 Extension
8. 목록/상세/action
9. 5서비스 adoption
10. desktop/mobile
11. production browser
12. production write
13. typecheck/build/test
14. backend/DB/schema
15. 잔존 followup
16. MYPAGE REQUESTS FINAL CLOSED 여부
17. CHECK/commit/push
18. 최종 Git 상태
```

마지막 줄:

```text
문서 정합: 발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건
```

## 31. 실행 원칙

중간 승인 없이:

```text
현재 main census
→ API/data shape 조사
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

**이번 작업의 핵심은 서로 다른 승인 정책을 하나로 만드는 것이 아니라, 사용자가 자신의 신청·요청 상태를 보는 My Page 경험을 공통화하는 것이다.**

---

## 부기 — 작성 시점 사실 (2026-08-19)

선행 트랙에서 이미 main 에 존재하는 공통 자산 (신규 생성 금지, 재사용·확장 대상):

```text
packages/account-ui/src/components/MyPageShell.tsx
packages/account-ui/src/components/MyPageLayout.tsx        (re-export shim)
packages/account-ui/src/components/MyPageNavigation.tsx
packages/account-ui/src/components/MyPageUserSummary.tsx
packages/account-ui/src/components/MyPageEntryCardGrid.tsx
packages/account-ui/src/components/MyPageActivityFeed.tsx
packages/account-ui/src/components/MyPageAppreciationCard.tsx
```

서비스별 My Page 진입 축 (Home/Hub 트랙에서 확정):

```text
KPA-Society      /mypage  (MyDashboardPage)
GlycoPharm       /mypage  (MyPageHub) + navItems.ts
K-Cosmetics      /mypage  (MyPageHub)
Neture           /mypage  (MyPageHub) + navItems.ts
Pharmacy-Hub     /account (+ /store-owner/account 호환 계약 유지 — /mypage 신설 금지)
```

**신규 UI package 생성 금지** — `services/web-kpa-society/Dockerfile` 이 패키지를 선별 COPY 하므로 신규 패키지는 빌드를 깨뜨린다. 공통화는 `@o4o/account-ui` 확장으로 수행한다.

검증 도메인 주의: K-Cosmetics 정본은 **`k-cosmetics.site`** 다. `k-cosmetics.co.kr` 은 플랫폼과 무관한 외부 쇼핑몰이므로 검증에 사용하지 않는다.

인증 주의: PharmacyHub 로그인 화면의 **데모 계정 채우기 버튼은 stale password** 라 401 이 난다. 검증 수단으로 사용하지 않고 `docs/local/TEST-ACCOUNTS.local.md` 기준 interactive login 을 사용한다. 자격증명은 코드·스크립트·CHECK·Git·shell history·로그 어디에도 평문으로 남기지 않는다.
