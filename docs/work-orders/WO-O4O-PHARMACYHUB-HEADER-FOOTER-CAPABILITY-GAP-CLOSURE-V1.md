# WO-O4O-PHARMACYHUB-HEADER-FOOTER-CAPABILITY-GAP-CLOSURE-V1

## 1. 목적

PharmacyHub의 Header / Footer / Mobile navigation / 관련 Shell이 현재 공통 UI 계약을 어느 수준까지 채택하고 있는지 다시 전수 확인하고, **실제 필요한 기능격차만 구현하여 닫는다.**

이번 작업은 다음을 한 번에 수행한다.

```text
PharmacyHub Header/Footer capability 재조사
→ 필요한 gap 판정
→ 필요한 것만 구현
→ desktop/mobile 검증
→ 최종 판정 갱신
```

다른 서비스에 존재한다는 이유만으로 PharmacyHub에 기능을 추가하지 않는다.

---

## 2. 선행 기준

반드시 아래 선행 작업 결과를 확인한다.

```text
WO-O4O-CROSSSERVICE-HEADER-FOOTER-FULL-CENSUS-AND-COMMONIZATION-PLAN-V1
WO-O4O-KPA-PLATFORM-FOOTER-LEGAL-CONTRACT-ADOPTION-V1
WO-O4O-NETURE-SHELL-FOOTER-LEGAL-CONTRACT-ADOPTION-V1
WO-O4O-CROSSSERVICE-MOBILE-BOTTOM-NAV-COMMONIZATION-V1
```

특히 census CHECK에서 PharmacyHub 관련 항목을 다시 추출한다.

```text
docs/checks/CHECK-O4O-CROSSSERVICE-HEADER-FOOTER-FULL-CENSUS-AND-COMMONIZATION-PLAN-V1.md
```

선행 census의 숫자와 판정을 그대로 믿지 말고 **현재 main 기준으로 재확인**한다.

---

## 3. 시작 기준

현재 `origin/main` 최신 상태에서 시작한다.

```bash
git fetch origin
git status -sb
git branch --show-current
git pull --ff-only origin main
```

원칙:

```text
특정 과거 commit 기준 고정 금지
다른 세션 WIP 수정·삭제·stash 금지
관련 없는 파일 접촉 금지
```

---

## 4. 대상 범위

서비스:

```text
PharmacyHub
```

하지만 단순 `web-pharmacy-hub` 파일만 보는 것이 아니라 PharmacyHub가 재사용하는 공통 package / shell / bridge까지 추적한다.

최소 조사 대상:

```text
Public Header
Public Footer

Authenticated Header
Store Owner / My Store Header
StoreHub Header
Operator Header

Mobile Header
Mobile Bottom Navigation
Mobile Drawer/Menu

Authenticated Footer
Store / StoreHub Footer
Operator Footer

관련 Layout / Shell / Wrapper / bridge
```

---

## 5. 모집단 재확인

현재 main에서 PharmacyHub의 Header/Footer 관련 실사용 컴포넌트를 전수 확인한다.

검색 예:

```text
Header
GlobalHeader
Footer
LegalFooter
MobileBottomNav
MobileNav
Navbar
Layout
Shell
Wrapper
<footer
<header
```

각 항목마다 최소 다음을 기록한다.

| 항목                     | 내용                           |
| ---------------------- | ---------------------------- |
| component              | 실제 파일                        |
| source                 | local/shared                 |
| consumer               | 실제 layout/page               |
| route                  | 소비 route                     |
| role                   | public/member/store/operator |
| desktop                | 적용 여부                        |
| mobile                 | 적용 여부                        |
| active/dead            | 실사용 여부                       |
| current classification | 현재 판정                        |

`UNCLASSIFIED`는 0이어야 한다.

---

## 6. Capability 기준

이번 WO에서는 단순 component 비교가 아니라 **사용자 기능 단위**로 gap을 판정한다.

### Header capability

최소 확인:

```text
서비스 logo/name
home navigation
desktop navigation
mobile navigation
hamburger/drawer
사용자 표시
profile 진입
logout
role 표시
권한별 action
notification
cart
service switch
authenticated/public 분기
sticky/fixed 처리
content offset
```

### Footer capability

최소 확인:

```text
회사/서비스 정보
canonical legal info
terms
privacy
contact/support
copyright
public footer
authenticated shell footer
store/storehub footer
operator footer
mobile 표현
```

---

## 7. Gap 판정

각 capability를 아래 중 하나로 판정한다.

```text
ADOPTED
MISSING_REQUIRED
NOT_APPLICABLE
SERVICE_SPECIFIC
DEAD_OR_UNUSED
```

의미:

### ADOPTED

```text
현재 PharmacyHub에서 이미 정상 구현되어 있고
공통 계약 또는 서비스 적합 구조를 사용함
```

### MISSING_REQUIRED

```text
실제 PharmacyHub 사용자 흐름상 필요한 기능인데
없거나 비정상적으로 끊겨 있음
```

이번 WO의 구현 대상이다.

### NOT_APPLICABLE

```text
다른 서비스에는 있으나 PharmacyHub 업무 구조상 필요하지 않음
```

예:

```text
실제로 존재하지 않는 role의 메뉴
필요 없는 service switch
PharmacyHub에 없는 업무 action
```

### SERVICE_SPECIFIC

```text
PharmacyHub 특성 때문에 별도 구현이 타당함
```

### DEAD_OR_UNUSED

```text
코드는 있으나 현재 route에서 사용되지 않음
```

이번 WO에서 삭제하지 않는다.

---

## 8. 가장 중요한 원칙

### 8.1 대칭 맞추기 금지

다음 접근 금지:

```text
KPA에 있으니 PharmacyHub에도 추가
GP에 있으니 PharmacyHub에도 추가
KCos에 있으니 PharmacyHub에도 추가
```

판정 기준은 오직:

```text
PharmacyHub의 실제 사용자 흐름에서 필요한가?
```

이다.

---

### 8.2 기존 공통 Core 우선

필요한 capability가 다른 서비스에서 이미 공통 Core로 제공되면 새로 만들지 않는다.

우선 확인:

```text
GlobalHeader
GlobalHeader bridge
PublicLegalFooterInfo
OperatorAreaShell
MyStoreShell
StoreHubShell
MobileBottomNav Core
@o4o/account-ui
@o4o/shared-space-ui
```

가능하면:

```text
기존 Core
+ PharmacyHub config/bridge
```

로 해결한다.

---

### 8.3 신규 abstraction 최소화

이번 PharmacyHub 1서비스 때문에 다음을 만들지 않는다.

```text
새 GlobalHeader 시스템
새 Footer 시스템
새 Navigation Registry
새 서비스 config framework
새 role framework
```

필요한 경우 기존 abstraction에 작은 extension만 허용한다.

---

## 9. GlobalHeader 조사

PharmacyHub의 GlobalHeader 또는 equivalent가 현재 어떤 구조인지 확인한다.

확인:

```text
공통 GlobalHeader 직접 사용 여부
bridge/wrapper 존재 여부
AuthContext 의존성
navigation source
user/profile source
logout source
role 처리
mobile 처리
```

선행 census에서 다른 서비스 `*GlobalHeader`들이 실제로는 완전 복제가 아니라 `CORE_ONLY`였다는 점을 고려한다.

PharmacyHub도 단순 LOC 유사성만으로 판단하지 않는다.

---

## 10. Profile / Logout

Header에서 최소 다음 사용자 기능을 검증한다.

```text
로그인 사용자 식별 가능
profile 진입 가능
logout 가능
logout 후 정상 route 이동
```

단, 다른 서비스의 role menu를 그대로 가져오지 않는다.

이미 공통 Profile/Menu Core를 사용 중이면 유지한다.

---

## 11. Notification / Cart

다른 서비스에 있다고 무조건 추가하지 않는다.

### Notification

확인:

```text
PharmacyHub에 실제 notification 기능/API/UI가 존재하는가
사용자 흐름에서 Header 진입이 필요한가
```

없거나 사용되지 않으면:

```text
NOT_APPLICABLE
```

또는 실제 상태에 맞는 판정을 한다.

### Cart

PharmacyHub에는 매장 공급 주문 흐름이 있으므로 cart capability를 실제로 확인한다.

확인:

```text
cart route 존재
현재 Header/StoreHub에서 접근 경로 존재
모바일 접근성
중복 shortcut 여부
```

필요한데 접근이 끊겨 있으면 `MISSING_REQUIRED`.

이미 StoreHub shell/menu에서 충분히 접근 가능하면 Header에 중복 추가하지 않는다.

---

## 12. Mobile navigation

W3에서 공통화한 MobileBottomNav Core가 PharmacyHub에는 적용되지 않았다.

따라서 먼저 다음을 판정한다.

```text
PharmacyHub에 bottom nav가 실제로 필요한가?
```

무조건 W3 Core를 적용하지 않는다.

확인:

```text
현재 모바일 primary navigation
hamburger/drawer 존재
StoreHub shortcut/navigation
사용자 주요 task 수
bottom nav 없이도 핵심 route 접근 가능한지
```

판정:

```text
필요 없음 → NOT_APPLICABLE
필요함 + 기존 구현 있음 → ADOPTED/SERVICE_SPECIFIC
필요함 + 없음 → MISSING_REQUIRED
```

`MISSING_REQUIRED`인 경우에만 기존 공통 `MobileBottomNav` Core 채택을 검토한다.

---

## 13. Public Footer

PharmacyHub 공개 Footer가 canonical legal 계약을 쓰는지 확인한다.

확인:

```text
PublicLegalFooterInfo
serviceKey
legal loader
terms route
privacy route
contact route
실제 API source
```

필수:

```text
href="#" 0
존재하지 않는 route 0
다른 서비스 route 복사 0
```

---

## 14. Authenticated Footer

다음을 별도로 확인한다.

```text
Store Owner shell
StoreHub shell
Operator shell
기타 authenticated shell
```

모든 authenticated shell에 Footer가 반드시 있어야 한다고 가정하지 않는다.

Footer가 없는 경우 다음을 판단한다.

```text
고정 app shell이라 의도적으로 Footer 없음
→ NOT_APPLICABLE / SERVICE_SPECIFIC

법정정보/지원 접근이 실제로 끊김
→ MISSING_REQUIRED
```

---

## 15. Legal contract

법정정보가 필요한 영역에는 현재 canonical source를 사용한다.

우선:

```text
PublicLegalFooterInfo
+ PharmacyHub serviceKey
+ 기존 footerLegal loader/config
```

없으면 현재 PharmacyHub public footer가 사용하는 source를 추적한다.

금지:

```text
사업자 정보 하드코딩
약관 URL 추정
KPA / Neture route 복사
새 legal config 생성
```

---

## 16. Copyright

Footer 조사 과정에서 연도 하드코딩 여부도 확인한다.

예:

```text
© 2025
```

처럼 이미 stale한 값이면 PharmacyHub 대상에서 발견된 경우에만 이번 WO에서 최소 수정할 수 있다.

다른 서비스 stale copyright는 이번 작업에서 수정하지 않는다.

---

## 17. 구현 범위

재조사 후 `MISSING_REQUIRED`로 판정된 capability만 구현한다.

가능한 작업 예:

```text
기존 common Header bridge 채택
profile/logout 연결
canonical legal footer 채택
잘못된 terms/privacy/contact route 수정
mobile navigation 연결
필요한 cart shortcut 연결
```

하지만 실제 조사 결과가 `MISSING_REQUIRED 0`이면 코드 변경을 억지로 만들지 않는다.

그 경우:

```text
PharmacyHub gap 없음
→ 조사 결과 + 판정 갱신만 CHECK
```

도 정상 완료다.

---

## 18. 범위 밖

이번 WO에서는 다음을 하지 않는다.

```text
PharmacyHub 전체 UI redesign
Header/Footer 전체 재설계
StoreHub 기능 추가
주문 기능 수정
결제 수정
상품 탐색 수정
인증 구조 변경
role/permission 정책 변경
새 notification 시스템
새 cart 시스템
다른 서비스 Header/Footer 수정
GlycoPharm privacy API 수정
GlycoPharm copyright 수정
Neture AdminVault 정책 결정
MobileBottomNav 서비스 전체 framework화
dead component 삭제
```

---

## 19. 구현 후 판정 갱신

PharmacyHub Header/Footer 모집단 각각에 대해 최종 판정을 갱신한다.

기존 census 분류 기준도 함께 사용한다.

```text
FULLY_COMMON
CORE_ONLY
VIEW_DUPLICATED
SERVICE_SPECIFIC
NOT_IMPLEMENTED
OUT_OF_SCOPE
```

목표:

```text
PharmacyHub Header/Footer에서
실질적 VIEW_DUPLICATED → 0
필요한 NOT_IMPLEMENTED → 0
UNCLASSIFIED → 0
```

단:

```text
업무상 불필요한 capability는 NOT_IMPLEMENTED가 아니라 NOT_APPLICABLE로 별도 기록
```

한다.

---

## 20. 정적 검증

최소:

```text
route 존재 확인
dead link 0
href="#" 0
서비스별 잘못된 route 복사 0
serviceKey 확인
user/profile/logout 계약 확인
legal contract 확인
```

실행:

```bash
git diff --check
```

관련 package가 변경되면 package build/typecheck도 수행한다.

---

## 21. Typecheck / Build

최소 PharmacyHub web build:

```text
web-pharmacy-hub
```

현재 repository의 canonical 명령을 사용한다.

공통 package 수정 시 해당 package도 먼저 build/typecheck한다.

목표:

```text
TypeScript error 0
build PASS
```

전체 monorepo build는 필수 아니다.

---

## 22. Browser E2E / Smoke

가능한 범위에서 desktop + mobile 모두 실브라우저로 확인한다.

### Public

최소:

```text
공개 메인
terms
privacy
contact/support
```

확인:

```text
Header 정상
Footer 정상
법정 링크 정상
404 0
console error 0
```

### Store / StoreHub

최소 대표 route:

```text
/store-owner
/store-hub
/store-owner/products
/store-owner/cart
```

실제 현행 route가 다르면 현재 route를 기준으로 한다.

확인:

```text
Header
profile
logout 진입 가능 여부
primary navigation
cart 접근
mobile navigation
layout 깨짐
```

### Operator

실제 로그인 가능한 경우 대표 operator route 하나 이상 확인한다.

---

## 23. Mobile 검증

권장 viewport:

```text
390 x 844
```

확인:

```text
Header layout
hamburger/drawer
profile 접근
핵심 navigation
Footer 또는 Footer 대체 접근
화면 하단 고정 UI 충돌
content overlap
safe-area
```

bottom nav가 없다면 없는 것이 의도된 계약인지 CHECK에 명시한다.

---

## 24. Desktop 검증

권장:

```text
1280px 이상
```

확인:

```text
mobile-only UI 미노출
navigation 정상
Header/Footer layout 정상
content offset 정상
```

---

## 25. Production 검증

현재 커밋이 배포 가능한 환경이고 기존 작업 방식상 production browser 검증이 가능하면 수행한다.

구분해서 기록한다.

```text
local/preview smoke
production smoke
```

production 미배포라서 확인하지 못하면 명확히 `미확인`으로 기록한다.

preview PASS를 production PASS로 보고하지 않는다.

---

## 26. CHECK 문서

작성:

```text
docs/checks/CHECK-O4O-PHARMACYHUB-HEADER-FOOTER-CAPABILITY-GAP-CLOSURE-V1.md
```

반드시 포함:

```text
1. 현재 main 모집단
2. Header/Footer/Shell별 실제 소비 route
3. capability census
4. ADOPTED
5. MISSING_REQUIRED
6. NOT_APPLICABLE
7. SERVICE_SPECIFIC
8. DEAD_OR_UNUSED
9. 구현한 gap
10. 구현하지 않은 기능과 이유
11. canonical Core/config 재사용 내역
12. legal contract 결과
13. mobile navigation 판정
14. typecheck/build
15. desktop/mobile browser 결과
16. production 검증 여부
17. census 최종 분류 갱신
18. 미확인 항목
19. 범위 밖 발견
```

---

## 27. 중단 기준

다음이 확인되면 무리하게 확대하지 않는다.

```text
Header gap 해결이 Auth/Role 재설계까지 확대됨
Footer gap 해결에 legal API/schema 변경 필요
새 navigation framework가 필요함
PharmacyHub 업무 정책 자체가 불명확해짐
다른 세션 WIP와 직접 충돌
```

이 경우 현재까지의 조사 결과를 CHECK에 남기고 별도 WO 후보만 제시한다.

---

## 28. 완료 기준

다음을 모두 만족하면 완료다.

```text
현재 main 기준 PharmacyHub Header/Footer 모집단 재확인
capability 미판정 0
실제 필요한 gap 식별
MISSING_REQUIRED 항목 구현 완료
불필요 기능은 NOT_APPLICABLE로 명시
기존 공통 Core/config 우선 재사용
dead link 0
필요한 legal contract 정상
Header/Profile/Logout 회귀 없음
모바일 사용자 흐름 확인
PharmacyHub typecheck/build PASS
desktop/mobile browser smoke
CHECK 작성
commit/push 완료
```

`MISSING_REQUIRED=0`으로 재판정되어 코드 변경이 없어도 위 조사·검증을 충족하면 정상 완료로 인정한다.

---

## 29. 이번 WO 완료의 의미

완료 선언은 정확히:

```text
PharmacyHub Header/Footer capability gap closure 완료
```

만 의미한다.

아직 다음은 별개다.

```text
W5 Public Footer config alignment 재판정
Header/Footer 전체 최종 closure audit
```

따라서 이번 WO 하나로 Header/Footer 공통화 전체 완료를 선언하지 않는다.

---

## 30. 작업 종료

```bash
git status --short
git diff --check
```

이번 WO 관련 파일만 path-specific stage 한다.

```bash
git add <이번 WO 관련 파일>
git commit -m "refactor(pharmacy-hub): close header footer capability gaps"
git push origin <현재 브랜치>
```

`git add .` 금지.

코드 변경이 없고 CHECK만 추가된 경우 커밋 메시지는 조사 결과에 맞게 조정한다.

---

## 31. 최종 보고 형식

최종 보고는 다음 중심으로 짧게 작성한다.

```text
1. 재확인한 PharmacyHub 모집단
2. capability 판정 총계
3. 실제 MISSING_REQUIRED 항목
4. 구현 내용
5. NOT_APPLICABLE 주요 항목
6. Header/Profile/Logout 결과
7. Footer/legal 결과
8. mobile navigation 최종 판정
9. typecheck/build
10. desktop/mobile browser smoke
11. production 확인 여부
12. 최종 census 판정
13. CHECK 경로
14. commit/push
```

범위 밖 결함이 발견되면 수정하지 않고 별도로 보고한다.

---

## 부기 — 실행 시점 측정값 (WO 본문 아님)

> 2026-08-21 `origin/main` (`0f5641a84`) 에서 실제 측정한 값이며 **지시가 아니다.**
> **부기와 코드가 다르면 코드가 정답이다.** §2·§5 대로 실행자가 현재 main 에서 다시 확인한다.
> 아래 값은 조사 출발점일 뿐이며, 이 부기가 판정을 대신하지 않는다.

### A. 기준 · Git

- 측정 시점 `HEAD == origin/main == 0f5641a84`
- 작업트리에 **다른 세션 WIP** 존재(`apps/api-server/**`, `packages/action-log-core/**`).
  → §30 **`git add .` 금지**, path-specific stage 만. 되돌리거나 stash 하지 않는다.

### B. PharmacyHub Header/Footer/Shell 모집단 실측 (§5 출발점)

| 파일 | LOC | 성격 |
|---|---:|---|
| `services/web-pharmacy-hub/src/components/PharmacyHubGlobalHeader.tsx` | 161 | 공통 `GlobalHeader(@o4o/ui)` 브릿지 |
| `services/web-pharmacy-hub/src/components/Footer.tsx` | 67 | 공개 Footer |
| `services/web-pharmacy-hub/src/components/operator/OperatorHeader.tsx` | 81 | 운영자 상단바 |
| `services/web-pharmacy-hub/src/layouts/PublicLayout.tsx` | 32 | 공개 셸 |
| `services/web-pharmacy-hub/src/layouts/StoreOwnerShell.tsx` | 96 | `MyStoreShell(@o4o/store-ui-core)` wrapper |
| `services/web-pharmacy-hub/src/layouts/OperatorLayoutWrapper.tsx` | 83 | `OperatorAreaShell(@o4o/operator-ux-core)` wrapper |
| `services/web-pharmacy-hub/src/layouts/AdminLayoutWrapper.tsx` | 63 | 관리자 셸 wrapper |
| `services/web-pharmacy-hub/src/config/navigation.ts` | 127 | nav/footer 링크 SSOT |
| `services/web-pharmacy-hub/src/lib/footerLegal.ts` | 13 | legal loader |

**`MobileBottomNav` / `NetureBottomNav` 계열 파일은 0건이다** (grep 실측). §12 는 여기서 시작한다.

### C. 이미 공통 계약을 쓰고 있는 것으로 보이는 항목 (재확인 대상)

측정상 PharmacyHub 는 census 시점보다 상태가 좋다. **아래를 gap 으로 착각하지 않도록** 먼저 확인한다.

- **공개 Footer 법정정보**: `Footer.tsx` 가 이미 `PublicLegalFooterInfo serviceKey={SERVICE_KEY} loadProfile={loadFooterLegal}` 를 사용한다(§13·§15 계약). `href="#"` **0건**, 링크는 전부 `config/navigation.ts` SSOT 경유.
- **copyright**: `© 2026` 으로 stale 아님 (§16 대상 아님).
- **Header**: 공통 `GlobalHeader(@o4o/ui)` + `filterContextualNav` 브릿지. `NotificationBell` + `useNotifications` + `resolveNotificationTarget`(`@o4o/account-ui`) 이미 연결됨 → §11 notification 은 **없음이 아니라 이미 있음**일 가능성이 높다.
- **모바일 drawer**: 공통 `GlobalHeader` 가 `mobileMenuOpen` 햄버거 + `mobileUserMenuItems` + `showMobileUserMenu` 를 이미 제공한다. PharmacyHub 가 이를 쓰는지/끄고 있는지 확인이 필요하다.
- **업무 셸**: `StoreOwnerShell` → `MyStoreShell` + `StoreOwnerGuard` + `PHARMACY_HUB_STORE_CONFIG`, `OperatorLayoutWrapper` → `OperatorAreaShell` + `DomainIASidebar`. 둘 다 **공통 Core 채택 완료 상태**로 보인다.

→ 즉 §17 의 "MISSING_REQUIRED 0 이면 코드 변경 없이 CHECK 만" 결말이 **실제로 유력하다.**
   변경을 만들어내기 위해 억지 gap 을 만들지 않는다.

### D. route 실측 — 데드링크 판정 근거 (§13·§20)

- 존재: `/terms`(`TermsPage`) · `/privacy`(`PrivacyPage`) — `App.tsx:220-221`
- **`/contact` route 는 없다.** 그래서 현재 Footer 는 문의 링크를 **의도적으로 넣지 않는다**(파일 주석에 근거 명시).
  → §13 의 "contact route" 는 **없음이 정상**일 수 있다. KPA `/contact` · Neture `/terms` 를 복사하면 §15 금지 위반이자 데드링크 생성이다.
- Footer 섹션 링크: `/` `/community` `/forum` `/education` `/service-guide` `/guide/intro` `/guide/features` `/join` `/join/status` `/terms` `/privacy` — **각 링크의 route 존재를 실행자가 직접 재확인**한다(부기를 근거로 삼지 않는다).

### E. §11 Cart — 이미 진입 경로가 여러 곳 있다

- route: `/store-owner/cart` (`App.tsx:486`, `CartPage`)
- 실측 진입점: `store-hub/StoreHubPage.tsx:50` · `store-owner/HomePage.tsx:91` · `OrdersPage.tsx:129` · `ProductDetailPage.tsx:216,241` · `PaymentPage.tsx:126`
→ WO §11 이 명시한 대로 **StoreHub/셸에서 충분히 접근 가능하면 Header 에 중복 shortcut 을 추가하지 않는다.**

### F. §12 Mobile bottom nav — 판정이 먼저다

W3 에서 만든 공통 Core 는 `packages/account-ui/src/mobile-nav/` 에 있고 PharmacyHub 도 `@o4o/account-ui` 를 이미 의존한다(기술적으로는 채택 가능).
**그러나 WO §12 는 "무조건 W3 Core 를 적용하지 않는다" 고 명시한다.** 판단 근거는 오직
PharmacyHub 의 실제 모바일 사용자 흐름(공통 GlobalHeader 햄버거 drawer 로 핵심 route 접근이 되는가,
업무 셸이 자체 상단바를 갖는가)이다. `NOT_APPLICABLE` 로 판정하고 **그것이 의도된 계약임을 §23 대로 CHECK 에 명시**하는 결말이 정당하다.

또한 `PublicLayout` 주석에 **"업무 셸은 자체 상단바를 갖는다 — 이중 헤더 금지"** 라는 기존 계약이 적혀 있다.
bottom nav 를 얹을 때 이 계약과 충돌하는지 확인해야 한다.

### G. §8.1 대칭 맞추기 금지 — 이번 WO 의 핵심 위험

직전 3개 WO 가 KPA·Neture·4서비스 nav 를 연속으로 다뤘기 때문에
"다른 서비스에 있으니 PharmacyHub 에도" 로 흐르기 쉽다. **다른 서비스 route·라벨·메뉴를 복사하지 않는다.**
특히 KPA 는 이용약관이 `/policy`, Neture 는 `/terms` 로 서로 다르다 — PharmacyHub 는 `/terms` 가 자체 route 로 존재한다.

### H. 검증·보고

- §21 typecheck/build 는 **PharmacyHub 최소**. 공통 package 를 건드리면 그 package 부터 build.
  워크트리에 node_modules 가 없으면 `pnpm install --frozen-lockfile` 선행이 필요하다.
- §25 **preview PASS 를 production PASS 로 보고하지 않는다.** 미배포면 `미확인` 으로 명시.
- CLAUDE.md §16-5 에 따라 완료 보고에 `문서 정합:` 한 줄을 포함한다.
- §29 대로 이번 완료는 `PharmacyHub Header/Footer capability gap closure 완료` 만 의미한다.
