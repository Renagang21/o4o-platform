# WO-O4O-CROSS-SERVICE-MYPAGE-HELP-SUPPORT-COMMONIZATION-V1

* **대상**: Agent D
* **성격**: My Page `Help / 문의 / 지원` 기능 census → 공통화 → 5서비스 adoption → production 검증
* **선행 완료**

  * `PROFILE TRACK = FINAL CLOSED`
  * `MYPAGE SHELL/LAYOUT TRACK = FINAL CLOSED`
  * `MYPAGE HOME/HUB TRACK = FINAL CLOSED`
  * `MYPAGE REQUESTS TRACK = FINAL CLOSED`
  * `MYPAGE SETTINGS/SECURITY TRACK = FINAL CLOSED`
  * `MYPAGE MEMBERSHIP/ROLE STATUS TRACK = FINAL CLOSED`
  * `MYPAGE NOTIFICATIONS TRACK = FINAL CLOSED`
  * `MYPAGE ACTIVITY/HISTORY TRACK = FINAL CLOSED`

---

## 1. 목표

My Page의 마지막 개별 기능 후보인 **Help / 문의 / 지원**을 5서비스 기준으로 전수 조사하고, 실제로 존재하는 사용자 지원 진입과 문의 경험을 공통화한다.

핵심:

```text
5서비스 Help/Support census
→ 문의/도움말 기능 존재 여부 확인
→ 공통 진입/연락처/문의목록 표현 분리
→ 서비스별 지원 채널은 Extension 유지
→ 5서비스 adoption
→ production desktop/mobile 검증
```

**기능이 없는 서비스에 새 고객센터나 문의 backend를 만들지 않는다.**

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

`git add .` 금지. path-specific stage만 사용.

---

## 4. Help/Support 모집단 재산출

현재 main에서 개인 사용자 관점의 도움말/문의/지원 기능을 전수 조사한다.

대표 검색 범위:

```text
/mypage/help
/mypage/support
/mypage/contact
/contact
/help
/faq
/inquiry
/support
고객센터
문의하기
내 문의
FAQ
도움말
서비스 안내
운영자 문의
```

과거 CHECK나 추정치를 모집단으로 재사용하지 않는다.

---

## 5. 기능 census

화면 수가 아니라 아래 기능 단위로 5서비스를 판정한다.

```text
1. Help/Support 기능 존재 여부
2. Help/FAQ 목록
3. FAQ 상세
4. 문의 작성
5. 내 문의 목록
6. 문의 상세
7. 답변 상태 표시
8. 답변 내용 표시
9. 문의 수정
10. 문의 취소/삭제
11. 연락처/지원 채널 표시
12. 운영시간/지원 안내
13. Home/Nav 진입
14. empty/loading/error
15. mobile UX
16. 서비스별 지원 Extension
```

각 항목 기록:

```text
route
page/component
API
data source
read/write
status
role/capability gate
destination
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

## 6. 문의 기능 의미 구분

아래를 하나로 섞지 않는다.

```text
일반 고객 문의
서비스 가입 문의
운영자에게 보내는 업무 문의
Contact Inquiry
FAQ
법정문서/정책 문의
커뮤니티 질문
운영자/관리자 내부 ticket
```

이번 WO의 대상은:

```text
로그인 사용자가 My Page에서
도움말을 찾거나 서비스 지원에 문의하는 경험
```

이다.

---

## 7. Backend 계약 먼저 확인

각 서비스에서 Help/문의 관련 실제 backend 계약을 확인한다.

최소:

```text
문의 생성
내 문의 조회
문의 상세
답변 조회
문의 수정/취소
FAQ 조회
support/contact metadata
```

분류:

```text
A. backend + UI 존재
B. backend만 존재
C. UI만 존재
D. 둘 다 없음
```

새 endpoint를 이번 WO에서 만들지 않는다.

---

## 8. 공통화 목표

공통화 대상은 **지원 기능의 표현·진입 구조**다.

개념:

```text
MyPageSupportView
├─ SupportIntro
├─ HelpLinks / FAQ
├─ ContactChannels
├─ InquiryEntry
├─ InquiryList
│  └─ InquiryItem
└─ Empty/Loading/Error
```

실제 필요한 최소 컴포넌트만 만든다.

신규 package 생성 금지.

가능하면 `@o4o/account-ui` additive 확장.

---

## 9. 기존 자산 우선 재사용

현재 저장소에서 이미 존재하는 자산을 먼저 조사한다.

예:

```text
contact inquiry UI
FAQ components
support card
help link
MyPageEntryCardGrid
MyPageShell
MyPageNavigation
```

동일 기능을 새로 만들지 않는다.

---

## 10. 최소 공통 Inquiry View Model

서비스별 API/entity를 하나로 합치지 않는다.

필요하면 frontend adapter에서 최소 표시 모델로 변환한다.

예:

```text
id
title
category
status
statusLabel
submittedAt
answeredAt
summary
answer
detailRoute
metadata
```

공통 View는 이 최소 모델만 소비한다.

---

## 11. 문의 상태

서비스별 실제 enum을 유지한다.

예:

```text
pending
received
in_progress
answered
closed
rejected
```

실제 값은 current main에서 조사한다.

공통화 대상:

```text
label
tone
description
action availability
```

backend enum 재설계 금지.

---

## 12. 문의 작성

실제 사용자 self-write 계약이 있으면 조사한다.

확인:

```text
제목
분류
내용
연락처
첨부
submit
success/error
```

공통화 가능한 UI가 2서비스 이상 중복되면 수렴 후보.

단:

```text
새 문의 backend
새 첨부 시스템
새 ticket workflow
```

를 이번 WO에서 만들지 않는다.

---

## 13. 내 문의 목록/상세

2서비스 이상에서 동등 목록/상세 UI가 있으면 공통화한다.

금지:

```text
목록만 공통화
상세 중복은 그대로
전체 완료 선언
```

상세가 서비스 고유라면 `SERVICE_SPECIFIC` 근거 기록.

---

## 14. FAQ / Help

FAQ가 실제 존재하면:

```text
목록
검색
카테고리
상세
```

를 조사한다.

FAQ backend/콘텐츠 자체가 없는 경우 새 기능을 만들지 않는다.

단순 외부/정적 도움말 링크도 정상적인 `SERVICE_SPECIFIC`일 수 있다.

---

## 15. 지원 채널

현재 실제 존재하는 채널만 기록한다.

예:

```text
웹 문의
전화
이메일
카카오/메신저
운영자 문의
```

구현되지 않은 채널을 UI에 새로 노출하지 않는다.

전화번호/이메일 등의 실제 운영 정보가 코드에 하드코딩돼 있으면 출처와 소유 축을 확인한다.

---

## 16. 법정문서와 경계

이용약관/개인정보처리방침은 Settings/Legal 영역 소유다.

이번 WO에서는:

```text
도움말에서 해당 문서로 연결되는 진입
```

만 조사한다.

문서 내용 자체는 수정하지 않는다.

dead 404는 MUST_FIX 후보.

---

## 17. Contact Inquiry와 경계

선행 Notifications target audit에서 등장한:

```text
contact.new
/operator/contacts
```

같은 **운영자 처리 화면**은 사용자 My Page 문의 화면과 구분한다.

이번 WO 범위:

```text
사용자가 문의를 제출하고 자신의 문의를 확인하는 UX
```

운영자 응답 콘솔 공통화는 범위 밖.

---

## 18. Community 질문과 경계

포럼/커뮤니티 게시물을 고객문의로 재분류하지 않는다.

```text
community question
≠ support inquiry
```

현재 서비스가 커뮤니티를 공식 지원 채널로 사용하고 있는 근거가 있을 때만 진입 링크로 표시한다.

---

## 19. Empty / Loading / Error

공통화 가능한 상태:

```text
문의 내역이 없습니다
도움말이 없습니다
불러오는 중
조회 실패
재시도
```

반드시 구분:

```text
실제 empty
401/403 → empty 삼킴
5xx → empty 삼킴
backend 계약 없음
```

조회 실패 삼킴이 발견되면 이번 WO에서 무단 수정하지 않고 기존 Load-Error 트랙 followup으로 기록한다.

---

## 20. Service Extension

서비스별 지원 성격은 정상 잔존 가능.

예:

### KPA

```text
약사회 관련 문의
회원/직역 문의
```

### GlycoPharm

```text
교육/서비스 이용 문의
```

### K-Cosmetics

```text
매장/교육/LMS 문의
```

### Neture

```text
supplier/partner 문의
business 관련 문의
```

### Pharmacy-Hub

```text
가입/약국/매장 연결 문의
store-owner 지원
```

실제 존재하는 기능만 반영.

---

## 21. 기능 없는 서비스

Help/Support 기능이 없으면:

```text
NOT_IMPLEMENTED
```

로 판정.

금지:

```text
빈 Help 페이지 신설
dummy FAQ
새 문의 endpoint
Home에 dead support entry 추가
```

dead entry가 없는지만 확인한다.

---

## 22. Home / Navigation 진입

기능이 실제 존재하는 서비스에서:

```text
My Page Home
My Page Navigation
Header/Footer
```

중 어디서 진입하는지 기록한다.

동일 지원 기능에 가는 중복 entry 자체는 결함이 아니지만:

```text
dead link
서로 다른 destination
권한 불일치
```

는 결함 후보.

---

## 23. Production write

문의 작성 기능이 실제 존재하면 TEST-ACCOUNTS에 한해 최소 write 가능.

허용:

```text
테스트 문의 1건 생성
생성 확인
상세 조회
```

조건:

```text
실사용자 0
운영자 답변 강제 생성 0
복구 불가능한 상태 변경 0
```

문의 삭제 API가 없으면 테스트 row를 만들지 않는 편을 우선한다.

불필요한 production data를 남기지 않는다.

---

## 24. 5서비스 adoption

공통 Help/Support View/Core를 만든 경우:

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

## 25. 완료 census 기준

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

## 26. Mobile

실측:

```text
긴 FAQ/문의 제목 wrap
상태 badge 잘림 없음
전화/이메일 링크 터치 가능
문의 CTA 접근 가능
목록/상세 overflow 없음
navigation 유지
```

---

## 27. Production browser

기능이 존재하는 모든 서비스에서 실제 production 검증.

최소:

```text
로그인
→ My Page
→ Help/문의 진입
→ FAQ 또는 지원 안내
→ 문의 목록/상세(존재 시)
→ 문의 CTA(존재 시)
→ 뒤로가기
→ 새로고침
```

기능 없는 서비스는:

```text
dead Help entry = 0
JS exception = 0
```

확인.

desktop/mobile 모두 수행.

---

## 28. Browser 합격 기준

```text
white screen = 0
JS exception = 0
unexpected 401/403 = 0
404 = 0
5xx = 0
dead support link = 0
잘못된 문의 상태 label = 0
잘못된 지원 채널 노출 = 0
mobile 기능 소실 = 0
double shell = 0
```

---

## 29. 결함 발견 시

이번 Help/Support 범위 결함이면:

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
새 support backend contract
새 ticket workflow
DB schema/migration
새 attachment system
Identity/membership 변경
다른 세션 WIP 충돌
```

---

## 30. 정적 검증

공통 package 변경 시 최소:

```text
@o4o/account-ui build

KPA typecheck/build
GP typecheck/build
KCos typecheck/build
Neture typecheck/build
PH typecheck/build
```

backend 변경이 없다면 backend test 불필요.

관련 existing test가 있으면 수행.

---

## 31. CHECK

작성:

```text
docs/checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-HELP-SUPPORT-COMMONIZATION-V1.md
```

포함:

```text
1. 기준 commit / deployed revision
2. 5서비스 Help/Support 모집단
3. 16기능 census
4. backend/API/data source
5. Before / After
6. 기존 공통 자산
7. 공통 Help/Support Core/View
8. Inquiry View Model
9. 문의 상태
10. FAQ/Help
11. 지원 채널
12. 문의 목록/상세
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

## 32. FINAL CLOSE

다음 전부 충족 시:

```text
미조사 = 0
VIEW_DUPLICATED = 0
CORE_ONLY = 0

존재하는 중복 Help/Support UI 수렴 완료
기능 없는 서비스 dead entry = 0
5서비스 adoption 판정 완료
dead support link = 0
desktop/mobile PASS
production browser PASS
MUST_FIX_BEFORE_CLOSE = 0
```

최종:

```text
MYPAGE HELP/SUPPORT TRACK = FINAL CLOSED
```

---

## 33. 후속

본 WO 종료 후 **새 개별 My Page 기능 공통화에는 바로 착수하지 않는다.**

다음 단계는:

```text
MY PAGE 전체 cross-service FINAL AUDIT
```

로 진행한다.

그 감사에서:

```text
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

전체 트랙의 현재 main adoption과 production 상태를 한 번 더 확인한다.

별도 유지:

```text
조회 실패 삼킴 계약화
membership metadata self-read
Activity backend 신규 계약
Email 변경
탈퇴 lifecycle
기타 신규 기능
```

---

## 34. Git

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

## 35. 최종 보고

```text
1. 기준 commit / deployed revision
2. 5서비스 census
3. Before / After
4. backend/API/data source
5. 공통 Help/Support Core/View
6. Inquiry View Model
7. 문의 상태
8. FAQ/Help
9. 지원 채널
10. Service Extension
11. 5서비스 adoption
12. desktop/mobile
13. production browser
14. production write
15. typecheck/build/test
16. backend/DB/schema
17. 잔존 followup
18. MYPAGE HELP/SUPPORT FINAL CLOSED 여부
19. CHECK/commit/push
20. 최종 Git 상태
```

마지막 줄:

```text
문서 정합: 발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건
```

## 36. 실행 원칙

중간 승인 없이:

```text
현재 main census
→ backend/API/data source 조사
→ 기존 지원 자산 재사용 판정
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

**이번 작업의 핵심은 새로운 고객센터를 만드는 것이 아니라, 현재 실제로 존재하는 도움말·문의·지원 기능만 찾아 My Page 안에서 일관된 진입과 표시 경험으로 수렴시키는 것이다.**

---

## 부기 — 실행 시점 저장소 실측 (WO 원문 아님)

> 아래는 WO 착수 전 저장소에서 직접 측정한 사실이다. **§4 는 과거 수치 재사용을 금지하므로 이 값들도 모집단의 출발점일 뿐 결론이 아니다.** 실행 시점에 직접 재산출할 것. 원문과 충돌하면 원문(§1~§36)이 우선한다.

### A. 기준

* base `origin/main` = `6d61f8c5b`
* 선행 트랙 `MYPAGE ACTIVITY/HISTORY TRACK = FINAL CLOSED` (commit `acace8f92`)

### B. 결정적 구조 — **문의는 "공개 접수(write-only)" 이고, "내 문의 조회" 계약은 사용자 축에 없다**

측정한 backend 실체:

| 경로 | 인증 | 성격 |
|---|---|---|
| `POST /api/v1/public/services/:serviceKey/contact-inquiries` | **없음(no auth)** | GP · KCos 공개 문의 접수 |
| `POST /api/v1/kpa/contact-requests` | **없음** | KPA 공개 문의 접수 |
| `GET /api/v1/kpa/operator/contact-requests` | `requireAuth` + `requireKpaScope('kpa:operator')` | **운영자 콘솔** |
| `PATCH /api/v1/kpa/operator/contact-requests/:id/status` | 동일 | **운영자 콘솔** |

`apps/api-server/src/modules/contact-inquiry/public-contact-inquiry.controller.ts` 헤더 주석 원문:

```
Mount: /api/v1/public/services
  POST /:serviceKey/contact-inquiries — 공개 문의 접수 + 운영자 in-app 알림
범위: GlycoPharm / K-Cosmetics (기존 contact 백엔드 없던 서비스).
  Neture(/neture/contact) / KPA(/kpa/contact-requests) 는 기존 경로 유지 — 본 컨트롤러 미사용.
정책:
  - 인증 없음. validation + 개인정보 동의 필수 + honeypot spam guard.
```

**따라서 §5 의 5~10번 기능(내 문의 목록 / 상세 / 답변 상태 / 답변 내용 / 수정 / 취소)은 사용자 축 backend 계약 자체가 없을 가능성이 높다.** 이 경우 §7 분류는 `D. 둘 다 없음` 이고 §5 판정은 `NOT_IMPLEMENTED` 다. **§7·§29 가 새 endpoint 생성을 금지하므로 이 결론은 결함이 아니라 정상 산출물이다.**

주의: 문의 row 는 저장되지만 **제출자에게 되돌려주는 read 경로가 없다**. 이것을 "조회 실패 삼킴"(§19)으로 오분류하지 말 것 — 삼킴이 아니라 **계약 부재**다. 이 둘의 구분은 §19 가 명시적으로 요구한다.

### C. `/contact` 는 My Page 가 아니다 — **범위 확대(scope creep) 함정**

4서비스에 공개 `/contact` 페이지가 있고 서로 다른 구현이다:

| 서비스 | 파일 | 줄수 | route |
|---|---|---:|---|
| KPA | `services/web-kpa-society/src/pages/contact/ContactPage.tsx` | 239 | `/contact` (App.tsx:918) |
| GlycoPharm | `services/web-glycopharm/src/pages/ContactPage.tsx` | 138 | `contact` (App.tsx:669) |
| K-Cosmetics | `services/web-k-cosmetics/src/pages/ContactPage.tsx` | 112 | `contact` (App.tsx:443) |
| Neture | `services/web-neture/src/pages/ContactPage.tsx` | 356 | `/contact` (App.tsx:747) |
| Pharmacy-Hub | — | — | **없음** |

**이 4벌은 겉보기에 매력적인 `VIEW_DUPLICATED` 후보지만, §6 이 정의한 이번 WO 대상은 "로그인 사용자가 My Page 에서" 겪는 경험이다.** 공개 랜딩 문의 폼은 비로그인 마케팅 진입점이며 My Page 소유가 아니다. 성급히 `@o4o/account-ui` 로 끌어올리면 **비로그인 페이지가 account-ui 에 의존**하게 되어 계층 축이 뒤틀린다.

판단 순서를 지킬 것:
1. My Page(또는 PH `/account`)에서 이 `/contact` 로 가는 **진입이 실제로 존재하는가**를 먼저 측정한다.
2. 진입이 없으면 `/contact` 4벌은 이번 WO 에서 `OUT_OF_SCOPE` 이고, 공통화 후보로 별도 followup 에 적는다.
3. 진입이 있으면 그 **진입(링크·카드)** 만 §8 대상이고, 페이지 본문 4벌 수렴은 별도 판단이다.

실측 참고: `services/*/src/pages/mypage` · `pages/account` 하위에서 `'/contact'` · `/service-guide` 문자열 **0건**. 즉 현재로선 2번 경로일 가능성이 크다.

### D. `/service-guide` — 도움말 성격의 인접 자산

KPA · GP · KCos 3서비스에 `ServiceGuidePage` 가 있고 route 등록도 되어 있다(각 App.tsx:920 / 674 / 448). 한글 키워드("도움말"·"서비스 안내") 검색에 걸린다.

이것이 §14 가 말한 "단순 외부/정적 도움말 링크도 정상적인 `SERVICE_SPECIFIC`" 에 해당하는지, 아니면 FAQ 성격의 실기능인지 **내용을 열어보고 판정**할 것. 서비스 소개 마케팅 페이지라면 Help 가 아니라 `OUT_OF_SCOPE` 다.

### E. FAQ backend 는 실측되지 않았다

`/faq` route · FAQ entity · FAQ endpoint 를 찾지 못했다. FAQ 콘텐츠 소스가 없으면 §14 대로 **새로 만들지 않는다.** dummy FAQ 는 §21 금지 항목이다.

### F. My Page 축에 Help 진입이 없다

* `packages/account-ui/src/components/MyPageNavigation.tsx` · `MyPageEntryCardGrid.tsx` 에 help/support/문의 항목 **0건** (매칭된 줄은 전부 role/capability 주석)
* 서비스별 nav 정의: `services/web-k-cosmetics/src/pages/mypage/navItems.ts` 등 — 실행 시점에 5서비스 전부 재확인할 것
* `/mypage/help` · `/mypage/support` · `/mypage/contact` route **0건**

→ Activity 트랙과 같은 구조일 가능성이 있다. **없으면 만들지 않는 것이 §21·§29 를 지키는 것이다.** 공통화 실적을 만들려고 빈 Help 페이지를 신설하지 말 것.

다만 Activity 와 다른 점이 하나 있다: **문의 write 계약은 실제로 살아 있다.** 그러므로 "기능 자체가 없다"고 단정하지 말고, **write 는 있는데 My Page 진입과 read 가 없다**는 비대칭을 정확히 기록할 것.

### G. 기존 공통 자산 (§9 — 새로 만들기 전에 확인)

`packages/account-ui/src/components/` 현황(33개). Help/Support 관련 재사용 후보:

```
MyPageShell.tsx  MyPageLayout.tsx  MyPageNavigation.tsx  MyPageEntryCardGrid.tsx
MyPageHubCard.tsx  MyPageEmptyState.tsx  MyPageLoadingState.tsx  MyPageAuthRequired.tsx
MyRequestsInbox.tsx  RequestStatusBadge.tsx  RequestTypeBadge.tsx
```

특히 **`RequestStatusBadge` 는 §11 의 "label / tone / description" 공통화 요구와 정면으로 겹친다.** 문의 상태 badge 를 새로 만들기 전에 이 자산의 additive 확장으로 충분한지 먼저 판정할 것. 단 §17 경계상 `MyRequestsInbox`(승인 요청 inbox)를 문의 목록으로 재사용하는 것은 다른 문제다 — **의미가 다르면 컴포넌트만 공유하고 개념은 합치지 말 것.**

### H. 문의 유형 enum 실측 (§11 — backend enum 재설계 금지)

`public-contact-inquiry.controller.ts` 의 `VALID_INQUIRY_TYPES`:

```
service_usage      → 서비스 이용 문의
account_permission → 가입/권한 문의
partnership        → 공급·제휴 문의
technical_issue    → 오류 신고
other              → 기타 문의
```

이것은 **문의 유형(category)** 이지 **처리 상태(status)** 가 아니다. §11 이 예시로 든 `pending/answered/closed` 와 혼동하지 말 것. 실제 status 컬럼은 `ContactInquiry.entity.ts` 와 KPA `contact-requests` 쪽에서 각각 확인해야 하며, **두 서비스군의 status 값이 다를 수 있다.**

또한 `SERVICE_ROLE_PREFIX` 는 `glycopharm` · `k-cosmetics` 2개뿐이고 KCos 의 role prefix 는 `cosmetics` 다(serviceKey ≠ role prefix). 알려진 함정 `service_key kpa ≠ kpa-society` 와 같은 계열이다.

### I. §17 경계 — 운영자 콘솔은 이미 살아 있다

KPA `GET/PATCH /operator/contact-requests` 는 실제 운영자 화면 계약이고, Notifications 트랙에서 확정된 `contact.new` → `/operator/contacts` 도 **VALID 로 종결된 살아 있는 경로**다. 이번 WO 에서 이 축을 건드리지 말 것. 사용자 문의 read 계약이 없다고 해서 **운영자 endpoint 를 사용자에게 열어주는 것은 §29 중지 조건(새 support backend contract)이자 권한 경계 위반**이다.

### J. §23 production write — 기본값은 "만들지 않는다"

문의 접수는 **인증 없이 성공하고, 삭제 API 가 없으며, 운영자에게 in-app 알림 + 이메일이 발송된다.** 즉 테스트 문의 1건이 실제 운영자에게 도달하고 지워지지 않는다.

§23 이 "문의 삭제 API가 없으면 테스트 row를 만들지 않는 편을 우선한다"고 명시했으므로, **기본 판단은 write 0** 이다. 폼 검증까지만 확인하고 최종 submit 을 하지 않는 방식으로 UX 를 검증할 것. write 를 수행했다면 CHECK 에 row id·서비스·사유를 남길 것.

### K. §19 — 삼킴과 계약 부재의 구분

이번 영역에서 `[]` 를 보게 되면 원인이 셋 중 하나다:

1. 실제 empty (문의 이력 0건)
2. 401/403·5xx 삼킴 → **Load-Error 트랙 followup**(무단 수정 금지)
3. **계약 부재** — read endpoint 자체가 없음 (부기 B 참조)

3번을 2번으로 적으면 없는 결함을 만들어내는 것이고, 2번을 3번으로 적으면 실재 결함을 은폐하는 것이다. 네트워크 탭에서 **요청이 나갔는지 여부**로 먼저 가른다.

### L. 프론트 진입점 참고

* KPA `services/web-kpa-society/src/components/platform/JoinInquiryForm.tsx` — 가입 문의 폼. §6 의 "서비스 가입 문의" 로 **일반 지원 문의와 분리해서 판정**할 것
* Footer 3서비스(`PlatformFooter.tsx` · GP/KCos `Footer.tsx`)에 문의/고객센터 문자열 존재 → §22 의 "Header/Footer 진입" 조사 대상
* `services/web-neture/src/config/seoRegistry.ts` 에도 문의 관련 문자열 — SEO 메타이므로 기능 아님, 모집단에서 제외 판단 근거로 기록

### M. 검증 계정 · 도메인

* 테스트 계정 SSOT: `docs/local/TEST-ACCOUNTS.local.md` (CLAUDE.md §15)
* KCos 프로덕션 도메인은 **`k-cosmetics.site`** (`k-cosmetics.co.kr` 은 외부 쇼핑몰)
* PH 는 `/mypage` 가 없고 `/account` · `/store-owner/account` 축이다 — §24 adoption 판정 시 "route 가 없다"를 곧바로 `NOT_IMPLEMENTED` 로 적기 전에 `/account` 축을 확인할 것
