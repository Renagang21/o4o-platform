# WO-O4O-CROSSSERVICE-HEADER-FOOTER-FINAL-CLOSURE-AUDIT-V1

## 1. 목적

KPA Society / GlycoPharm / K-Cosmetics / PharmacyHub / Neture의 Header / Footer / Mobile navigation / 관련 Shell 공통화 상태를 **현재 main 기준으로 최종 재감사**하고, 필요한 최소 수정까지 포함하여 이번 트랙의 **전체 CLOSE / NOT CLOSE**를 판정한다.

이번 WO는 별도 W5를 분리하지 않고 다음을 한 번에 수행한다.

```text
Public Footer config alignment 필요성 재판정
→ 5서비스 Header/Footer 최신 census 재산출
→ 잔존 중복/누락/계약 위반 확인
→ 반드시 필요한 최소 수정
→ desktop/mobile 검증
→ 최종 closure 판정
```

---

## 2. 선행 완료 상태

반드시 다음 CHECK들을 확인한다.

```text
docs/checks/CHECK-O4O-CROSSSERVICE-HEADER-FOOTER-FULL-CENSUS-AND-COMMONIZATION-PLAN-V1.md
docs/checks/CHECK-O4O-KPA-PLATFORM-FOOTER-LEGAL-CONTRACT-ADOPTION-V1.md
docs/checks/CHECK-O4O-NETURE-SHELL-FOOTER-LEGAL-CONTRACT-ADOPTION-V1.md
docs/checks/CHECK-O4O-CROSSSERVICE-MOBILE-BOTTOM-NAV-COMMONIZATION-V1.md
docs/checks/CHECK-O4O-PHARMACYHUB-HEADER-FOOTER-CAPABILITY-GAP-CLOSURE-V1.md
```

선행 흐름:

```text
전체 census                     완료
KPA PlatformFooter legal        완료
Neture shell footer legal       완료
MobileBottomNav 공통화          완료 (CORE_ONLY)
PharmacyHub capability gap      완료 (MISSING_REQUIRED 0)
최종 closure audit              이번 WO
```

과거 census 수치는 참고값이며, 최종 판정은 **현재 main 실코드**를 기준으로 다시 산출한다.

---

## 3. 시작 기준

현재 `origin/main` 최신 상태에서 진행한다.

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
과거 CHECK 숫자를 현재값으로 간주하지 않음
```

---

## 4. 대상 서비스

전수 대상:

```text
KPA Society
GlycoPharm
K-Cosmetics
PharmacyHub
Neture
```

공통 package도 포함한다.

최소:

```text
packages/ui
packages/account-ui
packages/shared-space-ui 또는 실제 legal/footer 공통 package
서비스별 Header/Footer/Layout/Shell/bridge/config
```

---

## 5. 최종 모집단 재산출

현재 main에서 Header/Footer 관련 실사용 모집단을 다시 산출한다.

최소 검색:

```text
Header
GlobalHeader
Footer
LegalFooter
MobileBottomNav
BottomNav
MobileNav
Navbar
Layout
Shell
Wrapper
<header
<footer
```

각 항목을 실제 consumer / route까지 추적한다.

반드시 구분:

```text
ACTIVE
DEAD
DELETED_SINCE_CENSUS
NEW_SINCE_CENSUS
```

과거 census에 있었으나 삭제된 파일은 현재 모집단에서 제외하고, stale census 항목으로 기록한다.

---

## 6. 최종 분류

실사용 모집단 전체를 다음 6종으로 다시 판정한다.

```text
FULLY_COMMON
CORE_ONLY
VIEW_DUPLICATED
SERVICE_SPECIFIC
NOT_IMPLEMENTED
OUT_OF_SCOPE
```

추가 보조 판정:

```text
NOT_APPLICABLE
DEAD_OR_UNUSED
```

최종 목표:

```text
UNCLASSIFIED = 0
```

그리고 전체 closure를 위해 특히 다음을 확인한다.

```text
VIEW_DUPLICATED 잔존 0
실제 필요한 NOT_IMPLEMENTED 잔존 0
법정 계약 우회 0
dead navigation 0
```

단, `CORE_ONLY`나 `SERVICE_SPECIFIC` 자체는 closure 실패 사유가 아니다.

---

## 7. MUST_FIX_BEFORE_CLOSE 기준

이번 WO에서 발견되는 모든 문제를 같은 수준으로 취급하지 않는다.

다음은 `MUST_FIX_BEFORE_CLOSE` 후보이다.

```text
활성 route의 dead link
href="#"
존재하지 않는 terms/privacy/contact route
Header/Footer 때문에 핵심 route 접근 불가
logout/profile 등 기본 사용자 동작 단절
실제 같은 UI가 서비스별 복제로 남아 있는 VIEW_DUPLICATED
필요한 Header/Footer capability가 NOT_IMPLEMENTED
법정정보 canonical 계약을 활성 UI가 우회
모바일에서 핵심 navigation 불가능
content가 fixed header/nav에 가려지는 구조적 회귀
```

이 항목이 남으면 전체 CLOSE 금지.

---

## 8. FOLLOW_UP 기준

다음은 자동으로 closure를 막지 않는다.

```text
정책 문서 콘텐츠 미게시
API에 실제 법정정보 값이 아직 없음
업무상 필요하지 않은 MobileBottomNav
서비스별 정당한 navigation semantics
CORE_ONLY 구조
SERVICE_SPECIFIC shell
dead component
stale 문서
향후 UX 개선 가능성
```

각 항목을 반드시:

```text
MUST_FIX_BEFORE_CLOSE
FOLLOW_UP
OUT_OF_SCOPE
```

중 하나로 명확히 분류한다.

---

## 9. Public Footer config alignment 재판정

별도 W5를 만들지 않고 이번 WO에서 판단한다.

5서비스 공개 Footer를 비교한다.

확인:

```text
공통 legal component 사용 여부
serviceKey 전달 방식
legal loader/config
terms route
privacy route
contact/support route
company/legal profile source
copyright
hard-coded legal data
fallback/null 정책
```

핵심 질문:

```text
현재 5서비스 Public Footer가 실질적으로 같은 canonical 계약을 사용하고 있는가?
```

### 판정 A — 정렬 불필요

다음이면 코드 변경하지 않는다.

```text
같은 canonical Core 사용
서비스별 config 차이는 정상
route 차이는 실제 서비스 route 차이
UI 차이는 branding/layout 차이
```

### 판정 B — 최소 정렬 필요

다음이면 이번 WO에서 수정 가능하다.

```text
한 서비스만 동일 정보를 hard-code
잘못된 serviceKey
중복 loader/config
dead route
명백한 config drift
```

단, 새 Footer framework는 만들지 않는다.

---

## 10. Legal contract 최종 감사

5서비스 각각 최소 확인:

```text
terms
privacy
contact/support
법정 사업자 정보
```

다음을 찾아낸다.

```text
href="#"
잘못된 route
서비스 간 route 복사 오류
404
canonical legal loader 미사용
하드코딩 사업자 정보
```

KPA/Neture에서 이미 수정한 계약이 회귀하지 않았는지도 확인한다.

---

## 11. GlycoPharm `/privacy` 기존 404 재판정

W3에서 발견된 GlycoPharm `/privacy` 관련 API 404를 다시 확인한다.

반드시 다음을 분리한다.

```text
A. Footer link가 잘못된 route로 감
B. route는 정상인데 정책 콘텐츠/API가 없음
C. API endpoint 자체가 Header/Footer 계약과 불일치
```

판정:

```text
A → MUST_FIX_BEFORE_CLOSE
B → FOLLOW_UP
C → 실제 사용자 Footer 계약이 깨지면 MUST_FIX, 아니면 별도 정책/API FOLLOW_UP
```

이번 WO에서 범위를 과도하게 정책 시스템 수정으로 확대하지 않는다.

---

## 12. PharmacyHub GlobalHeader `children` 미렌더 재판정

W4에서 발견:

```text
공통 GlobalHeader가 nav item.children을 렌더하지 않음
children을 실제 채우는 서비스는 PharmacyHub
```

이번 audit에서 다음을 실제로 확인한다.

```text
children 항목이 사용자에게 반드시 Header에서 노출되어야 하는가
하위 route가 다른 정상 UI에서 접근 가능한가
숨겨진 결과로 핵심 업무가 막히는가
현재 children 필드가 의도된 계약인가 단순 미사용 데이터인가
다른 4서비스에 영향 없이 수정 가능한가
```

판정:

### FOLLOW_UP 가능

```text
하위 route 접근 가능
핵심 업무 단절 없음
Header dropdown 자체가 현재 제품 계약이 아님
수정 시 공통 Header API 확장이 필요
```

### MUST_FIX_BEFORE_CLOSE

```text
Header가 children을 지원한다고 계약되어 있음
실사용 메뉴가 사용자에게 사라짐
핵심 업무 접근이 사실상 누락
```

판정 근거를 CHECK에 명확히 남긴다.

자동으로 구현하지 않는다.

---

## 13. AdminVaultLayout legal Footer 정책

Neture `AdminVaultLayout`의 공개 법정정보 표시 여부도 재판정한다.

질문:

```text
운영자 전용 Vault shell에 public legal footer가 제품 계약상 필요한가?
다른 operator/admin shell에도 동일 요구가 존재하는가?
법정 링크 접근이 다른 global shell에서 가능한가?
```

명확한 필요성이 없으면:

```text
FOLLOW_UP 또는 NOT_APPLICABLE
```

로 두고 closure를 막지 않는다.

---

## 14. MobileBottomNav adoption 최종 확인

W3 공통화 결과를 확인한다.

대상:

```text
KPA
GlycoPharm
K-Cosmetics
Neture
```

확인:

```text
공통 Core import
서비스별 wrapper
서비스별 menu/config
active predicate
profile sheet
notification interaction
mobile-only visibility
desktop 미노출
```

최종 판정:

```text
VIEW_DUPLICATED 잔존 여부
CORE_ONLY 판정 유지 여부
```

서비스별 route semantics가 달라 wrapper/config가 남는 것은 정상이다.

---

## 15. PharmacyHub MobileBottomNav 제외 재확인

PharmacyHub에는 W4 결과상 bottom nav가 필요하지 않았다.

최종 audit에서도:

```text
현재 drawer/header/account navigation으로 핵심 기능 접근 가능
```

이면 `NOT_APPLICABLE` 유지한다.

다른 4서비스와 대칭을 맞추기 위해 추가하지 않는다.

---

## 16. Header 최종 감사

5서비스 Header 계열에서 최소 확인:

```text
logo/service name
home
desktop nav
mobile nav
profile
logout
role
permission filtering
notification
cart
service-specific action
fixed/sticky
content offset
duplicate header
```

특히 확인:

```text
이중 Header
중복 top offset
모바일 overflow
dead menu
권한 없는 메뉴 노출
```

---

## 17. Footer 최종 감사

최소 확인:

```text
public footer
authenticated footer 또는 의도된 미사용
terms/privacy/contact
canonical legal info
copyright
mobile layout
```

Footer가 없는 업무 shell은 무조건 결함으로 보지 않는다.

판정 근거를 남긴다.

---

## 18. stale copyright

5서비스 Footer에서 연도 하드코딩을 확인한다.

예:

```text
© 2025
```

현재 시점에 stale이고 활성 UI라면 다음을 판단한다.

```text
단순 명백한 stale 표기이며 수정 위험 낮음
→ 이번 WO에서 최소 수정 가능

서비스 정책/법인 문구와 결합
→ 별도 판정
```

특히 선행 발견된 GlycoPharm stale copyright를 재확인한다.

---

## 19. stale census / architecture 문서

다음 문서 정합성을 확인한다.

최소:

```text
CHECK-O4O-CROSSSERVICE-HEADER-FOOTER-FULL-CENSUS-AND-COMMONIZATION-PLAN-V1.md
GLOBAL-HEADER-STANDARD-V1.md
```

과거 CHECK는 실행 기록이므로 내용을 과거 사실처럼 보존한다.

현재 구조와 어긋난 architecture 문서는 현재 문서 관리 규칙에 따라:

```text
수정
SUPERSEDED 표기
별도 문서 보완
```

중 적절한 조치를 판단한다.

단, 범위가 커지면 문서 drift를 FOLLOW_UP으로 남겨도 된다.

---

## 20. 코드 수정 허용 범위

이번 WO는 audit이지만 **closure를 막는 명백한 작은 결함**은 같은 WO에서 수정한다.

허용 예:

```text
dead href 수정
잘못된 route 수정
잘못된 serviceKey/config 수정
stale copyright 최소 수정
명백한 중복 Footer config 제거
작은 bridge/config adoption
```

금지:

```text
Header 시스템 재설계
Footer 시스템 재설계
Auth/Role 재설계
Global navigation framework
대규모 route 변경
법정문서 API/schema 재설계
새 디자인시스템
```

큰 문제는 별도 WO로 분리하고 `NOT CLOSE` 판정한다.

---

## 21. 최종 census 표

CHECK에 현재 main 기준 최종 표를 반드시 작성한다.

최소:

| 서비스 | FULLY_COMMON | CORE_ONLY | VIEW_DUPLICATED | SERVICE_SPECIFIC | NOT_IMPLEMENTED | OUT_OF_SCOPE | 기타 |
| --- | -----------: | --------: | --------------: | ---------------: | --------------: | -----------: | -: |

그리고 전체 합계:

```text
FULLY_COMMON
CORE_ONLY
VIEW_DUPLICATED
SERVICE_SPECIFIC
NOT_IMPLEMENTED
OUT_OF_SCOPE
NOT_APPLICABLE
DEAD_OR_UNUSED
UNCLASSIFIED
```

반드시:

```text
UNCLASSIFIED = 0
```

---

## 22. Closure gate

전체 Header/Footer 트랙을 `CLOSE`하려면 최소 다음을 만족해야 한다.

```text
전체 active 모집단 조사 완료
UNCLASSIFIED 0
VIEW_DUPLICATED 0
필요한 NOT_IMPLEMENTED 0
MUST_FIX_BEFORE_CLOSE 0
법정 dead link 0
href="#" 0
대표 mobile/desktop 사용자 흐름 정상
공통 Core 채택 회귀 없음
서비스별 차이는 CORE_ONLY/SERVICE_SPECIFIC/NOT_APPLICABLE로 설명 가능
```

`CORE_ONLY > 0`은 CLOSE 실패가 아니다.

---

## 23. 최종 판정

정확히 둘 중 하나로 판정한다.

### CLOSE

```text
HEADER_FOOTER_COMMONIZATION = CLOSED
MUST_FIX_BEFORE_CLOSE = 0
```

### NOT CLOSE

```text
HEADER_FOOTER_COMMONIZATION = NOT_CLOSED
MUST_FIX_BEFORE_CLOSE > 0
```

NOT CLOSE라면 각 blocker에 대해 별도 후속 WO 이름을 제안한다.

---

## 24. Typecheck / Build

코드 수정이 없으면 관련 서비스 전체 build를 무조건 반복할 필요는 없다.

다만 최종 closure 신뢰성을 위해 최소 대표 검증을 수행한다.

코드 수정 발생 시 변경 영향을 받는:

```text
공통 package
KPA
GlycoPharm
K-Cosmetics
PharmacyHub
Neture
```

를 적절히 build/typecheck한다.

공통 Header/MobileNav package 수정 시 영향 4~5서비스를 검증한다.

`No projects matched`인데 exit 0인 필터는 PASS로 인정하지 않는다.

실제 package name을 확인하여 실행한다.

---

## 25. Browser smoke

가능하면 5서비스 모두 대표 route를 desktop/mobile에서 확인한다.

### 권장 viewport

```text
Desktop: 1440 × 900
Mobile: 390 × 844
```

### 각 서비스 최소 확인

```text
public route 1+
authenticated 대표 route 1+
가능하면 store/operator 대표 route
```

확인:

```text
Header 정상
Footer 정상 또는 의도된 미노출
mobile navigation 정상
profile/logout 진입
법정 link
dead link 0
404 0
console error 0
가로 overflow 0
fixed UI overlap 0
```

정책 콘텐츠가 미게시여서 API 404가 나는 경우 Header/Footer 계약 결함과 구분해서 기록한다.

---

## 26. Production 검증

가능하면 현재 배포본에서 확인한다.

반드시 구분:

```text
local/preview
production
```

프로덕션이 최신 commit을 포함하는지 배포 revision/time 또는 commit 기준으로 확인한다.

미배포 상태라면 production 미확인으로 기록한다.

---

## 27. 범위 밖 발견 처리

범위 밖 문제는 수정하지 않고 다음 형식으로 분류한다.

```text
문제
영향
Header/Footer closure blocker 여부
후속 WO 필요 여부
```

예:

```text
정책 문서 미게시
→ FOLLOW_UP
→ closure blocker 아님
```

---

## 28. CHECK 문서

작성:

```text
docs/checks/CHECK-O4O-CROSSSERVICE-HEADER-FOOTER-FINAL-CLOSURE-AUDIT-V1.md
```

반드시 포함:

```text
1. 현재 main 기준점
2. 최종 모집단
3. 과거 census 대비 삭제/신규 항목
4. 6종 최종 분류
5. Public Footer config alignment 재판정
6. 5서비스 legal contract
7. KPA/Neture legal 회귀 확인
8. Glyco privacy 404 재판정
9. PH GlobalHeader children 재판정
10. AdminVault Footer 정책 판정
11. MobileBottomNav 최종 상태
12. PH bottom nav NOT_APPLICABLE 재확인
13. stale copyright
14. 문서 drift
15. 수행한 코드 수정
16. typecheck/build
17. desktop/mobile browser smoke
18. production 검증
19. MUST_FIX_BEFORE_CLOSE 목록
20. FOLLOW_UP 목록
21. 최종 census 표
22. CLOSED / NOT_CLOSED 최종 판정
```

---

## 29. 완료 기준

다음을 모두 만족해야 한다.

```text
5서비스 전체 재감사
현재 main 모집단 확정
UNCLASSIFIED 0
Public Footer config alignment 필요성 판정
법정 링크 계약 확인
MobileBottomNav 공통화 회귀 확인
PharmacyHub gap 판정 회귀 확인
잔존 VIEW_DUPLICATED 확인
잔존 NOT_IMPLEMENTED 확인
MUST_FIX_BEFORE_CLOSE 전수 판정
필요한 최소 수정 완료
desktop/mobile 검증
CHECK 작성
commit/push 완료
```

---

## 30. 작업 종료

```bash
git status --short
git diff --check
```

이번 WO 관련 파일만 path-specific stage 한다.

```bash
git add <이번 WO 관련 파일>
git commit -m "docs(o4o): close header footer commonization audit"
git push origin <현재 브랜치>
```

코드 수정이 포함되면 커밋 메시지는 실제 변경 성격에 맞게 조정한다.

`git add .` 금지.

---

## 31. 최종 보고 형식

최종 보고는 다음 순서로 작성한다.

```text
1. 최종 모집단 수
2. 최종 분류 총계
3. Public Footer config alignment 판정
4. legal/dead-link 결과
5. MobileBottomNav 최종 판정
6. PharmacyHub 최종 판정
7. MUST_FIX_BEFORE_CLOSE 수
8. FOLLOW_UP 주요 항목
9. typecheck/build
10. desktop/mobile production/browser 결과
11. 최종 판정: CLOSED / NOT_CLOSED
12. CHECK 경로
13. commit/push
```

전체 완료 선언은 반드시 최종 gate 결과에 근거한다.
---

## 부기 — 실행 시점 측정값 및 알려진 함정 (2026-08-21)

> **이 부기는 실행 시점의 측정값이며 지시가 아니다. 부기와 코드가 다르면 코드가 정답이다.**
> **부기가 §23 판정을 대신하지 않는다.** 아래 수치도 §2 에 따라 현재 main 에서 다시 산출해야 한다.

### A. Git 기준선

- 부기 작성 시점 `HEAD == origin/main == eb7d814f0`.
- 선행 3 커밋 모두 ancestor 확인: `4e883b970`(W3 코드) · `101d85603`(W4 WO) · `4ac82e666`(W4 CHECK).
- **다른 세션 WIP 33건 존재** (`apps/api-server/**`, `packages/action-log-core/**` 등).
  → §30 `git add .` 금지는 형식 규칙이 아니라 실제 오염 위험이다. path-specific stage 만 사용한다.

### B. 선행 CHECK 5종 (§19 — 기록물이므로 내용 수정 금지)

| 문서 | 줄 수 |
|---|---:|
| `CHECK-O4O-CROSSSERVICE-HEADER-FOOTER-FULL-CENSUS-AND-COMMONIZATION-PLAN-V1.md` | 300 |
| `CHECK-O4O-KPA-PLATFORM-FOOTER-LEGAL-CONTRACT-ADOPTION-V1.md` | 162 |
| `CHECK-O4O-NETURE-SHELL-FOOTER-LEGAL-CONTRACT-ADOPTION-V1.md` | 217 |
| `CHECK-O4O-CROSSSERVICE-MOBILE-BOTTOM-NAV-COMMONIZATION-V1.md` | 170 |
| `CHECK-O4O-PHARMACYHUB-HEADER-FOOTER-CAPABILITY-GAP-CLOSURE-V1.md` | 277 |

### C. 모집단 — 서비스별 Header/Footer/Nav 컴포넌트 (§5)

```
web-kpa-society : Footer.tsx · KpaGlobalHeader.tsx · MobileBottomNav.tsx (+ platform/PlatformFooter.tsx)
web-glycopharm  : GlycoGlobalHeader.tsx · MobileBottomNav.tsx (+ common/Footer.tsx)
web-k-cosmetics : KCosGlobalHeader.tsx · MobileBottomNav.tsx (+ common/Footer.tsx)
web-neture      : NetureGlobalHeader.tsx · NetureBottomNav.tsx (+ layouts/* 5종 인라인 footer)
web-pharmacy-hub: Footer.tsx · PharmacyHubGlobalHeader.tsx (bottom nav 없음 — W4 판정 NOT_APPLICABLE)
```

- **census 대비 삭제 확인**: PharmacyHub `SupplierShell.tsx` · `components/supplier/SupplierHeader.tsx` 는 `769f562d5` 에서 삭제됐고 현재 물리적으로 부재. §5 `DELETED_SINCE_CENSUS` 후보다.
- Neture 는 단일 Footer 컴포넌트가 없고 **layout 5종에 인라인 footer** 가 있다. §21 census 에서 이를 1건으로 뭉개지 않는다.

### D. `PublicLegalFooterInfo` 실소비처 (§10 · §14)

```
web-glycopharm/components/common/Footer.tsx
web-k-cosmetics/components/common/Footer.tsx
web-kpa-society/components/Footer.tsx
web-kpa-society/components/platform/PlatformFooter.tsx
web-neture/components/layouts/{MainLayout,NetureLayout,PartnerSpaceLayout,SupplierOpsLayout,SupplierSpaceLayout}.tsx
web-neture/pages/ContactPage.tsx
web-pharmacy-hub/components/Footer.tsx
```

- 계약상 profile 부재·비활성·오류 시 `null` 을 반환한다(**침묵이 계약**).
  → **preview 에서 법정정보 블록이 비어 보이는 것은 그 자체로 실패가 아니다.** §14 판정 시 혼동 금지.

### E. 법정 route 실측 (§10 dead link 판정 기준)

| 서비스 | 이용약관 | 개인정보 | 문의 |
|---|---|---|---|
| KPA | **`/policy`** | `/privacy` | `/contact` |
| GlycoPharm | `terms` (중첩 route) | `privacy` | `contact` |
| K-Cosmetics | `terms` (중첩 route) | `privacy` | `contact` |
| Neture | `/terms` | `/privacy` | `/contact` |
| PharmacyHub | `/terms` | `/privacy` | **없음** |

- **함정 1**: GlycoPharm·KCos 는 `<Route path="terms">` 형태의 **상대 경로 중첩 route** 다.
  `path="/terms"` 로 grep 하면 0건이 나와 **dead link 오탐**이 발생한다. 반드시 중첩 부모까지 확인한다.
- **함정 2**: PharmacyHub 에는 `/contact` route 가 없다. §15 대칭 맞추기로 footer 에 `/contact` 를 추가하면
  **데드링크를 새로 만드는 것**이다. 기존 계약(데드링크 0)이 의도된 상태다.

### F. Footer config 중복 (§9 — W5 판정 대상)

- `FOOTER_SECTIONS` 류 상수를 가진 곳은 **PharmacyHub 하나뿐**이다 (`config/navigation.ts` — 4 섹션 / 12 링크).
- 나머지 4 서비스는 footer 링크를 **JSX 안에 직접** 쓴다.
- 즉 §9 의 "config 정렬"은 **정렬할 공통 config 자체가 없는** 상태에서 출발한다.
  §9 판정 B(최소 정렬)를 택하더라도 §20 이 금지한 **새 Footer framework 신설로 번지지 않도록** 한다.
  4 서비스를 PharmacyHub 모양으로 옮기는 것은 최소 정렬이 아니라 신설이다.

### G. copyright 실측 (§18)

```
GlycoPharm  common/Footer.tsx:121        © 2025   ← stale
GlycoPharm  layouts/StoreLayout.tsx:288  © 2025   ← stale
K-Cosmetics common/Footer.tsx:88         © 2025   ← stale
KPA         Footer.tsx:49                © 2026
KPA         platform/PlatformFooter.tsx  © {currentYear}  (동적)
Neture      layouts/* 5종                © 2026
PharmacyHub Footer.tsx:61                © 2026
```

- stale 은 **3건**이며 GlycoPharm 2 · KCos 1 이다. KCos 는 이전 보고에서 언급되지 않았다 —
  §2 대로 과거 수치를 믿지 말라는 실례다.
- stale copyright 는 §7 MUST_FIX 목록에 없다. §20 "허용된 최소 수정"에는 포함된다.
  **§7 blocker 로 승격시키지 않는다.**

### H. 이월 3건 재판정 (§11 · §12 · §13) — 이전 측정값

- **§11 GlycoPharm `/privacy`**: W3 smoke 중 `GET /api/v1/public/services/glycopharm/policies/privacy` 404 ×2 관측.
  route 자체는 존재(위 E 표) → **A(잘못된 route) 가 아닐 가능성이 높다**. B(콘텐츠 미게시) / C(API 불일치) 를 구분하라.
- **§12 PharmacyHub GlobalHeader `children`**: `packages/ui/src/layout/GlobalHeader.tsx:24` 가
  `children?: { label; href }[]` 를 타입으로 선언하지만 **nav 렌더링에서 `item.children` 을 읽는 코드가 0건**이다.
  `children:` 을 채우는 곳은 PharmacyHub `config/navigation.ts` (35행 · 53행) **단독**이다.
  하위 route 는 페이지 내 링크로 도달 가능해 **dead-end 는 0** 으로 관측됐다.
  §12 대로 **자동 구현 금지** — 판정 근거만 남긴다.
- **§13 Neture `AdminVaultLayout`**: shell footer legal WO 에서 **의도적으로 제외**됐고 근거가 그 CHECK §13-A 에 있다.

### I. 검증 함정 (§24 · §25 · §26)

- **pnpm filter 함정**: `pnpm --filter @o4o/web-pharmacy-hub build` 는 `No projects matched` 를 내면서 **exit 0** 이다.
  실제 package name 은 **`pharmacy-hub-web`** 이다. §24 대로 이런 결과를 PASS 로 인정하지 않는다.
- worktree 에서는 `pnpm install --frozen-lockfile` → `pnpm run build:packages` 를 먼저 해야
  workspace `dist` 부재로 인한 TS2307 가짜 FAIL 을 피한다.
- 4 서비스 `MobileBottomNav.tsx` 는 **전부 CRLF** 다. diff·문자열 비교 전 `tr -d '\r'` 로 정규화한다.
- Dockerfile 선별 COPY 함정: `services/web-kpa-society/Dockerfile` 은 패키지를 개별 COPY 한다.
  신규 패키지를 만들면 COPY 누락으로 빌드가 깨진다. 이번 WO 는 §20 상 신규 패키지를 만들지 않으므로 해당 없음이지만,
  §9 판정 B 가 패키지 신설로 번지면 이 함정에 걸린다.
- §25 preview PASS 를 production PASS 로 보고하지 않는다. 미배포면 §26 대로 **production 미확인**으로 기록한다.

### J. 문서 정합 (CLAUDE.md §16)

- `docs/architecture/ui/GLOBAL-HEADER-STANDARD-V1.md` 는 census 부기에서 stale 의심으로 지적됐으나
  마지막 실질 변경이 `bdbd60177`(2026-05-07, 파일명 정규화)뿐이다. §16-2 대로 **보고만** 한다.
  대체 문서 경로를 특정할 수 없으면 SUPERSEDED 표기 대상도 아니다(§16-3).
- 완료 보고에 `문서 정합:` 한 줄을 반드시 포함한다(§16-5).

### K. 보고 요구

- §31 의 13개 항목을 순서대로, 한국어로 보고한다.
- §23 은 **CLOSE / NOT CLOSE 둘 중 하나**만 허용한다. "조건부 CLOSE" 같은 제3의 판정을 만들지 않는다.
- NOT CLOSE 라면 blocker 별로 **후속 WO 이름을 제안**한다.
