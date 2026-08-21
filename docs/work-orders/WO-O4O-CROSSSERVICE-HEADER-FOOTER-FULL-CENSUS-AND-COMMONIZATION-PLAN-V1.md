# WO-O4O-CROSSSERVICE-HEADER-FOOTER-FULL-CENSUS-AND-COMMONIZATION-PLAN-V1

## 1. 목적

KPA Society / K-Cosmetics / GlycoPharm / PharmacyHub / Neture 전반에 존재하는 **Header / Footer / 관련 Layout·Shell 구조를 전수조사**하고, 실제 공통화 가능한 범위를 확정한다.

이번 WO는 **조사·분류·공통화 계획 수립**이 목적이다.

코드를 일부 공통화한 뒤 전체 완료로 선언하지 않는다.

최종 결과는 다음 후속 구현 WO들이 바로 실행될 수 있을 정도로 구체적이어야 한다.

---

## 2. 시작 기준

현재 작업 PC의 `o4o-platform` 저장소에서 진행한다.

```bash
git fetch origin
git status -sb
git branch --show-current
git pull --ff-only origin main
```

원칙:

```text
origin/main 최신 상태를 기준으로 조사한다.
특정 과거 commit을 기준점으로 삼지 않는다.
다른 세션의 미커밋 WIP는 수정·삭제·stash하지 않는다.
```

작업트리가 병행 작업으로 dirty이면 관련 파일 소유권을 먼저 구분하고, 이번 WO 범위와 충돌하는 경우에만 중지한다.

---

## 3. 대상 서비스

전수조사 대상:

```text
KPA Society
K-Cosmetics
GlycoPharm
PharmacyHub
Neture
```

서비스 단위만 세지 말고 **실제 UI Shell / Layout 계열 단위**로 조사한다.

예:

```text
Public
Authenticated member
Store / My Store
StoreHub
Operator
Admin
Supplier / Partner
Login / Join
기타 독립 Shell
```

동일 서비스 내부에 Header/Footer가 여러 종류 존재하면 각각 별도 모집단으로 기록한다.

---

## 4. 모집단 범위

다음 코드를 모두 조사한다.

### Header

```text
Header*
Topbar*
Navbar*
Navigation*
AppBar*
Toolbar*
MobileHeader*
MobileNav*
UserMenu*
ProfileMenu*
Hamburger*
```

파일명에 Header가 없어도 Layout 내부에 직접 구현된 상단 영역을 포함한다.

확인 항목:

```text
로고
서비스명
navigation
profile/user menu
로그아웃
role 표시
service switch
알림
장바구니
mobile menu
sticky/fixed 처리
content offset
desktop/mobile 분기
public/auth 분기
```

### Footer

```text
Footer*
LegalFooter*
PublicFooter*
ServiceFooter*
```

파일명이 없어도 Layout/Page에 직접 작성된 하단 영역을 포함한다.

확인 항목:

```text
회사/서비스 정보
사업자 정보
copyright
이용약관
개인정보처리방침
고객지원
문의
법적 고지
서비스별 정책 링크
desktop/mobile 차이
public/auth 차이
```

### Layout / Shell

반드시 함께 조사한다.

```text
*Layout*
*Shell*
*Frame*
*Wrapper*
App.tsx
route layout
Outlet wrapper
service root layout
```

Header/Footer가 Layout 내부에 묻혀 있으면 해당 Layout을 모집단에 포함한다.

---

## 5. Route 연결 전수조사

단순 파일 census로 끝내지 않는다.

각 Header/Footer/Layout에 대해 실제 사용 route를 확인한다.

최소 기록:

| 항목         | 내용                          |
| ---------- | --------------------------- |
| service    | 서비스                         |
| shell      | Public / Store / Operator 등 |
| component  | Header/Footer/Layout 파일     |
| route      | 실제 사용 경로                    |
| desktop    | 적용 여부                       |
| mobile     | 적용 여부                       |
| auth state | public/authenticated        |
| role       | 적용 role                     |
| reuse      | 다른 서비스 재사용 여부               |

dead component인지 실제 active route인지 구분한다.

---

## 6. 분류 기준

모든 모집단을 아래 6종 중 하나로 판정한다.

```text
FULLY_COMMON
CORE_ONLY
VIEW_DUPLICATED
SERVICE_SPECIFIC
NOT_IMPLEMENTED
OUT_OF_SCOPE
```

### FULLY_COMMON

```text
동일한 공통 component를 사용하거나
service config만 다르게 주면 동일 component로 수렴 가능
```

### CORE_ONLY

```text
shell 구조 대부분은 동일하지만
서비스별 extension/slot/role action 차이가 본질적으로 존재
```

### VIEW_DUPLICATED

```text
실제 UI/행동은 동일하거나 거의 동일한데
서비스별 파일로 복제되어 있음
```

가장 중요한 공통화 후보이다.

### SERVICE_SPECIFIC

```text
업무 목적 또는 정보구조 자체가 달라
하나로 합치는 것이 오히려 복잡도를 증가시킴
```

단순 색상·로고·문구 차이는 SERVICE_SPECIFIC 사유가 아니다.

### NOT_IMPLEMENTED

```text
정상 UX상 필요하지만 해당 shell에는 Header/Footer가 없거나
다른 서비스 대비 기능 누락이 확인됨
```

### OUT_OF_SCOPE

```text
독립 kiosk/player/signage 등
이번 웹 서비스 Header/Footer 공통화와 관련 없는 UI
```

---

## 7. Header 비교 기준

각 Header 그룹에서 다음을 비교한다.

```text
DOM 구조
component tree
navigation source
service branding
logo source
user/profile source
logout 처리
role 처리
permissions
mobile breakpoint
drawer/menu 처리
sticky/fixed 여부
height
content top padding
notification/cart/action
service switch
API dependency
route dependency
```

차이를 다음으로 분리한다.

```text
STYLE_DIFFERENCE
CONFIG_DIFFERENCE
ROLE_DIFFERENCE
FEATURE_DIFFERENCE
STRUCTURAL_DIFFERENCE
```

`STYLE_DIFFERENCE` 또는 `CONFIG_DIFFERENCE`만 존재하면 공통화 우선 후보로 본다.

---

## 8. Footer 비교 기준

각 Footer 그룹에서 다음을 조사한다.

```text
회사/사업자 정보 source
서비스명
copyright
terms URL
privacy URL
legal document route
support/contact
서비스별 추가 고지
DB 기반 정책 여부
hard-coded URL 여부
desktop/mobile layout
public/auth layout 차이
```

특히 아래를 별도로 확인한다.

```text
terms/privacy 링크가 서비스별로 정확히 연결되는가
404가 발생할 수 있는 route가 남아 있는가
법정문서가 DB 기반인지 static route인지
서비스키가 hard-code되어 있는가
```

Footer 공통화가 법정문서 계약을 깨뜨리면 안 된다.

---

## 9. 공통화 구조 후보

조사 결과를 바탕으로 최소 다음 3개 구조를 비교한다.

### A. 완전 단일 Component

```text
SharedHeader
SharedFooter
+ service config
```

### B. Core + Extension

```text
HeaderCore
├─ Brand
├─ Navigation
├─ UserArea
├─ Actions slot
└─ Mobile shell

FooterCore
├─ CompanyInfo
├─ LegalLinks
├─ Support
└─ Extension slot
```

### C. 계열별 Shell

예:

```text
PublicShell
StoreShell
StoreHubShell
OperatorShell
SupplierShell
```

각 shell이 공통 Header/Footer Core를 재사용한다.

무조건 하나의 Header/Footer로 통합하려 하지 않는다.

**코드 복잡도가 커지면 공통화하지 않는 방향을 우선한다.**

---

## 10. Config 후보 조사

현재 이미 존재하는 service config 구조를 먼저 찾는다.

예:

```text
ServiceConfig
StoreHubConfig
service metadata
branding config
navigation config
legal config
```

새 config를 만들기 전에 기존 구조로 흡수 가능한지 판정한다.

공통화 시 필요한 예상 값:

```ts
serviceKey
serviceName
logo
homePath
navigation
legalLinks
supportLinks
showUserMenu
showNotifications
showCart
mobileBehavior
```

단, 조사 단계에서 실제 신규 abstraction을 구현하지 않는다.

---

## 11. 중복도 정량화

가능한 범위에서 다음을 산출한다.

```text
Header 관련 파일 수
Footer 관련 파일 수
Layout/Shell 관련 파일 수
active route 수
dead component 수

FULLY_COMMON 수
CORE_ONLY 수
VIEW_DUPLICATED 수
SERVICE_SPECIFIC 수
NOT_IMPLEMENTED 수
OUT_OF_SCOPE 수
UNCLASSIFIED 수
```

추가로 주요 중복 그룹별:

```text
파일 수
대략적 LOC
동일/유사 구조
서비스 목록
예상 제거 가능 중복 LOC
```

를 기록한다.

---

## 12. 우선순위 판정

구현 순서는 조사 결과를 기준으로 정한다.

원칙:

```text
1. VIEW_DUPLICATED가 크고 위험이 낮은 그룹
2. Public/Auth 공통 Shell
3. Store 계열
4. StoreHub 계열
5. Operator/Admin 계열
6. Supplier/Partner 특수 계열
7. 최종 adoption
```

다만 실제 census 결과가 다르면 결과를 우선한다.

Header와 Footer가 동일 Layout에 묶여 있으면 별도 WO로 억지 분리하지 않는다.

---

## 13. 이번 WO에서 하지 않을 것

기본적으로 다음은 하지 않는다.

```text
대규모 Header/Footer 공통화 구현
route 구조 변경
navigation 정책 변경
권한 정책 변경
법정문서 DB 변경
회원 인증 변경
UI redesign
branding redesign
새 디자인시스템 도입
```

조사 중 명백한 dead import나 잘못된 주석을 발견해도 이번 WO 목적과 직접 관계없으면 수정하지 않는다.

---

## 14. 결과 문서

CHECK 작성:

```text
docs/checks/CHECK-O4O-CROSSSERVICE-HEADER-FOOTER-FULL-CENSUS-AND-COMMONIZATION-PLAN-V1.md
```

반드시 다음 내용을 포함한다.

### A. 모집단

```text
서비스별 Header/Footer/Layout 전체 목록
active/dead 판정
route 연결
```

### B. 분류 총계

```text
FULLY_COMMON
CORE_ONLY
VIEW_DUPLICATED
SERVICE_SPECIFIC
NOT_IMPLEMENTED
OUT_OF_SCOPE
UNCLASSIFIED
```

**UNCLASSIFIED는 반드시 0이어야 한다.**

### C. 중복 그룹

예:

```text
GROUP-H1
KPA / KCos / GP
Store Header
VIEW_DUPLICATED
```

식으로 그룹화한다.

### D. 서비스별 고유 차이

```text
왜 config 차이인지
왜 extension이 필요한지
왜 SERVICE_SPECIFIC인지
```

근거를 기록한다.

### E. Footer 법정문서 계약

```text
각 서비스 terms/privacy route
source
404 위험
hard-code 여부
```

### F. 목표 구조

현재 코드 기준으로 현실적인 공통화 구조를 제시한다.

### G. 구현 WO 순서

후속 WO를 너무 작게 나누지 않는다.

예:

```text
WO-1 Public/Auth Shell 공통화
WO-2 Store/StoreHub Header/Footer 공통화
WO-3 Operator/Admin Shell 공통화
WO-4 Supplier/Neture 특수 Shell 정리
WO-5 Cross-service adoption + browser closure
```

실제 census 결과에 따라 더 합칠 수 있으면 합친다.

---

## 15. 완료 판정

이번 WO 완료 조건:

```text
5개 서비스 조사 완료
Header 모집단 누락 0
Footer 모집단 누락 0
Layout/Shell 연결 조사 완료
active/dead 판정 완료
route 연결 완료
6종 분류 완료
UNCLASSIFIED 0
공통화 후보 그룹 확정
SERVICE_SPECIFIC 근거 명시
법정문서 Footer 계약 확인
후속 구현 순서 확정
CHECK 작성
```

이번 WO 완료는 **"조사와 공통화 계획 완료"**만 의미한다.

```text
Header/Footer 공통화 전체 완료
```

라고 선언하면 안 된다.

---

## 16. 검증

최소 수행:

```bash
git diff --check
```

코드를 수정하지 않았다면 전체 build는 불필요하다.

분석용 스크립트나 문서 외 코드 변경이 발생했다면 해당 범위 typecheck를 수행한다.

---

## 17. 작업 종료

CHECK 작성 후:

```bash
git status --short
git diff --check
```

이번 WO 관련 파일만 path-specific stage 한다.

```bash
git add <이번 WO 관련 파일>
git commit -m "docs(o4o): audit cross-service header footer commonization"
git push origin <현재 브랜치>
```

`git add .` 사용 금지.

---

## 18. 보고 형식

최종 보고는 짧게 다음만 포함한다.

```text
1. 전체 모집단 수
2. 6종 분류 총계
3. 가장 큰 중복 그룹
4. SERVICE_SPECIFIC 주요 항목
5. 법정문서/Footer 위험 여부
6. 권고 공통화 구조
7. 후속 WO 순서
8. CHECK 경로
9. commit/push
```

조사 결과 일부 영역만 공통화 가능하더라도 전체 완료로 확대 해석하지 않는다.

---

## 부기 (실행 시점 저장소 사실 · 함정)

> 아래는 WO 지시가 아니라 **실행 시점에 측정한 출발점**이다. §2 지시대로 조사자는 origin/main 최신 기준으로 스스로 재측정한다.
> 여기 숫자가 틀렸다고 판단되면 여기 숫자가 아니라 **코드가 정답**이다.

### A. 기준점

- 작성 시점 `HEAD == origin/main == 2ea6cd81f`, 작업트리 clean.
- 직전 트랙(cross-service My Page)은 `FINAL CLOSED` 로 종료됨. 이번 WO 는 별개 축이다.

### B. 헤더는 이미 상당 부분 공통화되어 있다 (가장 중요)

- `packages/ui/src/layout/GlobalHeader.tsx` 를 소비하는 파일이 **44개**다.
- 5개 서비스 모두 자체 wrapper 를 갖고 있다:
  `KpaGlobalHeader.tsx` · `KCosGlobalHeader.tsx` · `GlycoGlobalHeader.tsx` · `PharmacyHubGlobalHeader.tsx` · `NetureGlobalHeader.tsx`
- 파일명만 보면 5중 복제(VIEW_DUPLICATED)로 보이지만, **얇은 config adapter 일 가능성이 높다.**
  직전 트랙에서 KPA `MyPageLayout` 이 정확히 같은 모양이었고, grep 만으로 "복제"라 판정했다면 오탐이었다.
  → **반드시 5개 파일을 열어서 내용으로 판정한다.** grep 결과로 분류하지 않는다.
- 즉 이번 census 의 결론은 "공통화가 안 되어 있다"가 아니라
  "**어디까지 이미 되어 있고, 남은 건 무엇인가**"일 가능성이 크다. 결론을 미리 정하지 않는다.

### C. 파일 수 (참고용 대략치, 재측정 필요)

| 서비스 | header | footer | layout |
|---|---:|---:|---:|
| KPA-Society | 5 | 2 | 8 |
| K-Cosmetics | 1 | 1 | 4 |
| GlycoPharm | 2 | 1 | 7 |
| PharmacyHub | 3 | 1 | 5 |
| Neture | 2 | **0** | 10 |

- PharmacyHub 는 `components/operator/OperatorHeader.tsx` · `components/supplier/SupplierHeader.tsx` 를 추가로 갖는다 (§3 의 별도 shell 계열).
- **Neture 의 footer 파일 0 건은 "footer 없음"이 아니다.** Neture 는 `MainLayout.tsx` / `NetureLayout.tsx` 에서 공용 footer 를 소비한다.
  파일 부재를 `NOT_IMPLEMENTED` 로 바로 찍으면 오판이다.

### D. 공통 패키지 측 모집단 (§4 Layout/Shell 에 포함해야 함)

- `packages/ui/src/layout/` — `GlobalHeader.tsx` · `AGHeader.tsx` · `AGPageHeader.tsx`
- `packages/shared-space-ui/src/` — `legal/PublicLegalFooterInfo.tsx` · `legal/StoreFacingFooter.tsx` · `blog/BlogPublicHeader.tsx` · `ForumPostHeader.tsx`
- `packages/store-ui-core/src/components/hub-shell/StoreHubShell.tsx` · `layout/MyStoreShell.tsx` · `layout/StoreDashboardLayout.tsx`
  → Store 계열은 이미 공통 shell 이 존재한다. §9-C 후보를 "새로 만들 것"으로 쓰지 말고 **기존 것과 대조**한다.

### E. §8 법정문서 계약 — 이미 공통 계약이 있다

- `PublicLegalFooterInfo` / `StoreFacingFooter` 가 5개 서비스 + `store-ui-core` 3개 shell 에서 소비된다.
- 따라서 §8 의 위험은 "계약이 없다"가 아니라 **"공통 계약을 우회해 하드코딩한 곳이 남아 있는가"**다.
  terms/privacy 링크 hard-code · serviceKey hard-code · 404 route 를 그 관점에서 찾는다.

### F. §16 문서 정합 — 보고만 하고 고치지 않는다

- `docs/architecture/ui/GLOBAL-HEADER-STANDARD-V1.md` (2026-04-17, "Active Standard") 의 문제 정의는
  "Main/Public Header 에 대한 플랫폼 공통 컴포넌트가 존재하지 않는다 / 4개 서비스 모두 독립적으로 Header 를 구현하고 있다" 로 적혀 있다.
  `GlobalHeader` 소비 44 파일과 충돌하므로 **stale 의심**이다. 또 범위에 PharmacyHub 가 빠져 있다.
- 근거로 적힌 `IR-O4O-GLOBAL-LAYOUT-HEADER-AUDIT-V1` 는 `docs/ir/` · `docs/investigations/` 에서 찾지 못했다.
- CLAUDE.md §16-2/§16-4 에 따라 **인라인 수정 대상이 아니다.** 완료 보고의 `문서 정합` 줄에 기록만 한다.
  (§13 의 "dead import/잘못된 주석을 발견해도 고치지 않는다"와 같은 취지)

### G. §5 는 파일 census 가 아니다

- 각 component 에 대해 **실제 route 연결**과 **active/dead** 를 판정해야 §14-A 를 채울 수 있다.
- `App.tsx` 의 route tree 와 Layout wrapper 를 따라가야 한다. import 존재만으로 active 로 보지 않는다.
- dead 로 판정했다면 근거(어느 route 에서도 도달 불가)를 남긴다. 그리고 §13 대로 **삭제하지 않는다.**

### H. §14-B UNCLASSIFIED = 0

- 애매한 항목을 분류하지 않고 남기면 실패다. 애매하면 `SERVICE_SPECIFIC` 로 도피하지 말고
  §6 의 정의에 맞춰 판정하고 근거를 §14-D 에 적는다.
- 반대로 §6 단서대로 **단순 색상·로고·문구 차이는 SERVICE_SPECIFIC 사유가 아니다.**

### I. §9 의 방향성

- "코드 복잡도가 커지면 공통화하지 않는 방향을 우선한다"는 이번 WO 의 실질 판단 기준이다.
- B(Core+Extension) 가 그럴듯해 보인다는 이유로 자동 선택하지 않는다. 세 후보를 **현재 코드 기준으로** 비교한다.
- 이미 `GlobalHeader` + service wrapper 구조가 존재하므로, 권고안이 "현 구조 유지 + 잔여 흡수"가 될 수도 있다.
  그것도 정당한 결론이다.

### J. 검증·커밋

- 코드 변경이 없으면 build 불필요(§16). `git diff --check` 만 수행한다.
- 다른 세션이 병행 중이다. `git add .` 금지, path-specific stage 만 사용한다(§17).
- push 된 커밋은 재작성하지 않는다. push 경합이 나면 rebase 후 재push 하고 보고에 명시한다.
