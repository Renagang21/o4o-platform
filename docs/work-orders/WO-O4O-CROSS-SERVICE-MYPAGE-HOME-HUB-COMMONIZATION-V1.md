# WO-O4O-CROSS-SERVICE-MYPAGE-HOME-HUB-COMMONIZATION-V1

* **대상**: Agent D
* **성격**: My Page Home/Hub 기능 census → 공통화 → 5서비스 adoption → production 검증
* **선행 완료**

  * `PROFILE TRACK = FINAL CLOSED` — [CHECK-O4O-CROSS-SERVICE-PROFILE-FINAL-BROWSER-CLOSURE-V1](../checks/CHECK-O4O-CROSS-SERVICE-PROFILE-FINAL-BROWSER-CLOSURE-V1.md)
  * `MYPAGE SHELL/LAYOUT TRACK = FINAL CLOSED` — [CHECK-O4O-CROSS-SERVICE-MYPAGE-SHELL-FINAL-CLOSURE-V1](../checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-SHELL-FINAL-CLOSURE-V1.md)

---

## 1. 목표

공통 Shell/Layout 위에서 **My Page 첫 화면(Home/Hub)** 의 중복 구조를 제거한다.

```text
5서비스 Home/Hub 전수 census
→ 공통 기능 / 서비스 고유 기능 분리
→ 공통 Home/Hub Core 구현
→ Service Extension 주입
→ 5서비스 adoption
→ production desktop/mobile 검증
```

Requests, Settings, Membership 등 개별 업무 내부는 이번 WO에서 공통화하지 않는다.

---

## 2. 대상 서비스

```text
KPA-Society
GlycoPharm
K-Cosmetics
Neture
Pharmacy-Hub
```

PH는 `/mypage`를 새로 만들지 말고 현행 `/account` 축을 기준으로 판정한다.

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

`git add .` 금지. 전부 path-specific stage.

---

## 4. Home/Hub census

각 서비스에서 사용자가 개인영역에 처음 진입하는 실제 route/page를 다시 산출한다.

기능 단위:

```text
1. 사용자 요약
2. 내 프로필 진입
3. 설정 / 보안 진입
4. 가입·승인 상태
5. 내 요청 / 신청내역 진입
6. 내 활동 / 이력
7. 알림
8. 주요 업무 바로가기
9. 매장 / 사업자 / 공급자 영역 진입
10. 회원 / 역할 상태
11. 도움말 / 문의
12. 서비스별 고유 Home 기능
```

각 항목에 대해 기록:

```text
route
source page/component
표시 조건
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

기존 CHECK 수치를 모집단으로 재사용하지 말고 현재 main에서 재산출한다.

---

## 5. 공통화 목표

기존 `@o4o/account-ui`와 이미 완료된 My Page Shell을 재사용한다.

개념 구조:

```text
MyPageShell
└─ MyPageHome
   ├─ MyPageUserSummary
   ├─ StatusSummary
   ├─ PrimaryActions
   ├─ MyPageEntryCardGrid
   └─ ServiceExtension
```

실제 필요한 컴포넌트만 최소 추가한다.

**신규 UI package 생성 금지.**

---

## 6. Core 원칙

공통 Home Core 내부에는 다음을 넣지 않는다.

```text
serviceKey별 if/switch
서비스명별 분기
role 문자열 직접 비교
서비스별 route 하드코딩
서비스별 lifecycle 판단
```

차이는 `props / config / slot`으로 주입한다.

권한 판정은 기존 role/capability SSOT를 재사용한다.

---

## 7. 기존 Shell 재사용

반드시 현재 공통 컴포넌트를 기반으로 한다.

```text
MyPageShell
MyPageNavigation
MyPageUserSummary
MyPageEntryCardGrid
```

Home용 별도 Shell을 만들지 않는다.

Profile 역시 이미 `FINAL CLOSED`이므로 내부 구현을 다시 수정하지 않고 기존 route/Core를 연결만 한다.

---

## 8. Entry / Action 공통화

Home의 카드·바로가기 중복을 공통 모델로 수렴한다.

예상 모델:

```text
label
description
route
icon
badge/status
visibility
disabled
group
```

대표 진입:

```text
내 프로필
설정
신청내역
교육
증명서/학점
매장 관리
사업자/공급자 관리
기타 서비스 업무
```

모든 서비스에 같은 메뉴를 강제하지 않는다.

---

## 9. 상태 표시

가입·승인·역할 상태는 서비스별 lifecycle을 유지한다.

공통화 대상은 표시 구조만이다.

```text
status
label
description
badge
action
```

서비스별 상태값을 하나의 enum으로 재설계하지 않는다.

---

## 10. 서비스별 Extension

근거 있는 고유 기능은 `SERVICE_SPECIFIC`으로 유지한다.

예:

```text
KPA
- 직역/면허
- 약사회 업무
- 교육/증명

GlycoPharm
- 교육/학점/증명
- 서비스 신청

K-Cosmetics
- 매장 관련 신청
- LMS/교육

Neture
- supplier / partner
- business profile

Pharmacy-Hub
- store-owner 진입
- 가입/매장 연결 상태
```

공통화율을 높이기 위해 억지로 Core에 넣지 않는다.

---

## 11. 서비스별 주의

### GlycoPharm

선행 작업에서 정리된 My Page navigation과 Home entry가 실제 route와 일치하는지 확인한다.

dead entry/card 0.

### Neture

supplier/business-profile 노출은 기존 역할 SSOT를 사용한다.

비공급자에게 공급자 기능을 노출하지 않는다.

### PharmacyHub

현행 계약 유지:

```text
/account
/store-owner/account
```

`/mypage` 신설이나 route 강제 통일은 이번 범위 밖.

필요 이상으로 새 Dashboard를 만들지 않는다.

---

## 12. 개별 기능 내부 변경 금지

이번 WO에서 깊게 들어가지 않는다.

```text
Requests workflow
Security/password
Membership lifecycle
Notification backend
Activity data model
LMS
Supplier workflow
Store workflow
Profile Core
```

Home에서의 **진입/표현 구조만** 공통화한다.

---

## 13. Backend

원칙적으로 frontend-only.

다음이 필요하면 중지하고 blocker로 보고:

```text
신규 API
role contract 변경
membership 정책 변경
DB schema/migration
Identity 변경
```

---

## 14. 5서비스 adoption

공통 Core를 만든 뒤 반드시:

```text
KPA
GP
KCos
Neture
PH
```

전부 실제 적용 또는 근거 있는 `SERVICE_SPECIFIC` 판정을 한다.

한 서비스 적용만으로 완료 선언 금지.

---

## 15. 완료 census 기준

최종 목표:

```text
미조사          = 0
VIEW_DUPLICATED = 0
CORE_ONLY       = 0
```

다음은 근거가 명확하면 잔존 가능:

```text
SERVICE_SPECIFIC
NOT_IMPLEMENTED
OUT_OF_SCOPE
```

---

## 16. 정적 검증

공통 package 변경 시 최소:

```text
@o4o/account-ui build
KPA typecheck/build
GP typecheck/build
KCos typecheck/build
Neture typecheck/build
PH typecheck/build
```

기존 unrelated 오류가 있으면 이번 변경과의 인과관계를 구분해서 기록한다.

---

## 17. Production browser

5서비스 모두 실제 production에서 desktop/mobile 검증.

최소 흐름:

```text
로그인
→ My Page Home/Hub
→ 사용자 요약
→ 주요 카드/바로가기
→ Profile
→ Settings 또는 실제 존재 기능
→ 서비스별 Extension
→ 뒤로가기
→ 새로고침
```

화면 기준:

```text
desktop: 1440×900 수준
mobile: 390×844 수준
```

---

## 18. Browser 합격 기준

```text
white screen = 0
JS exception = 0
unexpected 401/403 = 0
404 = 0
5xx = 0
dead card/link = 0
navigation loop = 0
잘못된 role 노출 = 0
mobile 기능 진입 소실 = 0
double shell = 0
```

의도된 role guard는 실패로 세지 않는다.

---

## 19. 결함 발견 시

이번 Home/Hub 범위 결함이면 중간 승인 없이:

```text
원인 확인
→ 최소 수정
→ 정적 검증
→ commit/push
→ 표준 배포
→ production 재검증
```

까지 진행한다.

다음이면 중지:

```text
DB/schema/migration
새 backend 계약
Identity 재설계
membership 정책 변경
다른 세션 WIP 충돌
```

---

## 20. CHECK

작성:

```text
docs/checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-HOME-HUB-COMMONIZATION-V1.md
```

포함:

```text
1. 기준 commit
2. 5서비스 Home/Hub route/page census
3. 12기능 census
4. Before / After
5. 공통 Home/Hub Core
6. UserSummary
7. Entry/Action
8. Status 표시
9. Service Extension
10. 5서비스 adoption
11. desktop/mobile
12. production browser
13. backend/DB/schema 변경 여부
14. 잔존 후속 기능
15. MUST_FIX_BEFORE_CLOSE
16. CHECK/commit/push
```

---

## 21. FINAL CLOSE

다음 전부 충족 시:

```text
미조사 = 0
VIEW_DUPLICATED = 0
CORE_ONLY = 0

5서비스 adoption 완료
Home/Hub 공통 Core 적용 완료
서비스별 Extension 분리 완료
desktop/mobile PASS
production browser PASS
dead link = 0
MUST_FIX_BEFORE_CLOSE = 0
```

최종 판정:

```text
MYPAGE HOME/HUB TRACK = FINAL CLOSED
```

---

## 22. 후속

FINAL CLOSED 후 다음 기능 공통화 후보:

```text
Requests / 신청·승인 내역
Settings / Security
Membership / 회원·역할 상태
Notifications
Activity / 이력
Help / 문의
```

이번 WO에서는 착수하지 않는다.

---

## 23. 최종 보고

```text
1. 기준 commit / deployed revision
2. 5서비스 census
3. Before / After
4. 공통 Home/Hub Core
5. UserSummary
6. Entry/Action
7. Status
8. Service Extension
9. 5서비스 adoption
10. desktop/mobile
11. production browser
12. typecheck/build
13. backend/DB/schema
14. 잔존 followup
15. MYPAGE HOME/HUB FINAL CLOSED 여부
16. CHECK/commit/push
17. 최종 Git 상태
```

마지막 줄:

```text
문서 정합: 발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건
```

## 24. 실행 원칙

중간 승인 없이:

```text
현재 main census
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

**이번 작업의 목적은 개별 My Page 업무를 구현하는 것이 아니라, 모든 후속 기능이 반복적인 화면 수정 없이 들어갈 수 있도록 My Page Home/Hub의 공통 진입면을 확정하는 것이다.**

---

## 부기 — 작성 시점 사실 (2026-08-19)

선행 트랙에서 이미 main 에 존재하는 공통 자산 (신규 생성 금지, 재사용 대상):

```text
packages/account-ui/src/components/MyPageShell.tsx
packages/account-ui/src/components/MyPageLayout.tsx        (re-export shim)
packages/account-ui/src/components/MyPageNavigation.tsx
packages/account-ui/src/components/MyPageUserSummary.tsx
packages/account-ui/src/components/MyPageEntryCardGrid.tsx
```

서비스별 현행 Home/Hub 진입 축:

```text
KPA-Society      /mypage  (MyDashboardPage)
GlycoPharm       /mypage  (MyPageHub) + navItems.ts
K-Cosmetics      /mypage  (MyPageHub)
Neture           /mypage  (MyPageHub) + navItems.ts
Pharmacy-Hub     /account (+ /store-owner/account 호환 계약 유지)
```

검증 도메인 주의: K-Cosmetics 정본은 **`k-cosmetics.site`** 다. `k-cosmetics.co.kr` 은 플랫폼과 무관한 외부 쇼핑몰이므로 검증에 사용하지 않는다.

인증 주의: PharmacyHub 로그인 화면의 **데모 계정 채우기 버튼은 stale password** 라 401 이 난다. 검증 수단으로 사용하지 않고 `docs/local/TEST-ACCOUNTS.local.md` 기준 interactive login 을 사용한다. 자격증명은 코드·스크립트·CHECK·Git·shell history·로그 어디에도 평문으로 남기지 않는다.
