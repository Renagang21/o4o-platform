# WO-O4O-CROSSSERVICE-MOBILE-BOTTOM-NAV-COMMONIZATION-V1

## 1. 목적

KPA Society / GlycoPharm / K-Cosmetics / Neture에 각각 복제되어 있는 모바일 하단 네비게이션 구현을 공통화한다.

선행 census 기준 대상:

```text
KPA MobileBottomNav        약 303 LOC
GlycoPharm MobileBottomNav 약 256 LOC
K-Cosmetics MobileBottomNav 약 254 LOC
NetureBottomNav            약 217 LOC
총 약 1,030 LOC
```

선행 판정:

```text
GROUP-H1
VIEW_DUPLICATED
실차이 = 색상 / 라벨 / active path / 서비스별 메뉴 구성
예상 제거 가능 중복 ≈ 700 LOC
```

이번 작업의 목표는 **거대한 navigation framework를 새로 만드는 것이 아니라**, 네 구현에서 실제 공통인 렌더링·active 판정·모바일 shell만 추출하고 서비스별 메뉴 정의는 각 서비스에 남기는 것이다.

---

## 2. 선행 기준

반드시 확인:

```text
docs/checks/CHECK-O4O-CROSSSERVICE-HEADER-FOOTER-FULL-CENSUS-AND-COMMONIZATION-PLAN-V1.md
```

선행 완료 상태:

```text
R1 KPA PlatformFooter legal contract → 완료
R2 Neture shell footer legal contract → 완료
W3 MobileBottomNav commonization → 이번 작업
```

이번 작업은 Header/Footer 전체 재설계가 아니다.

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
특정 과거 commit 고정 금지
다른 세션 WIP 수정·삭제·stash 금지
관련 없는 파일 접촉 금지
```

---

## 4. 대상 모집단 재확인

선행 census 숫자를 그대로 사용하지 말고 현재 main에서 다시 확인한다.

최소 대상:

```text
KPA Society
GlycoPharm
K-Cosmetics
Neture
```

각 서비스의 실제 모바일 하단 navigation component와 소비 route/layout을 확인한다.

기록:

| 항목                | 내용             |
| ----------------- | -------------- |
| service           | 서비스            |
| component         | 실제 파일          |
| consumers         | 소비 layout/page |
| mobile breakpoint | 표시 조건          |
| item count        | 메뉴 수           |
| active logic      | 활성 판정 방식       |
| icon source       | 아이콘 방식         |
| label source      | 라벨             |
| route source      | href/to        |
| permission        | 역할/권한 조건       |
| badge/action      | 특수 기능          |

dead component가 있으면 공통화 대상으로 포함하지 않는다.

---

## 5. 공통/차이 분석

네 구현을 실제 diff하여 다음을 분리한다.

### 공통 후보

```text
fixed bottom positioning
mobile-only visibility
container/layout
nav item rendering
icon + label rendering
active/inactive state
active class/style
safe-area 처리
z-index
navigation click/link 처리
```

### 서비스별로 남길 항목

```text
menu item 배열
label
route
icon
active path 조건
서비스 색상/token
역할별 노출 조건
서비스별 특수 action
```

차이를 억지로 공통 Core 안에 `if (serviceKey === ...)`로 넣지 않는다.

---

## 6. 목표 구조

권장:

```text
shared-space-ui 또는 현재 가장 적절한 공통 UI package
└─ MobileBottomNav Core

각 서비스
├─ mobileBottomNavItems/config
└─ thin bridge/wrapper
```

예시 개념:

```ts
<MobileBottomNav
  items={items}
  activePath={pathname}
  activeMatcher={...}
/>
```

아이템 개념 예:

```ts
{
  key,
  label,
  to,
  icon,
  isActive?
}
```

실제 타입은 현재 코드 패턴을 우선한다.

---

## 7. 중요한 설계 제한

### 7.1 서비스 전체 navigation config 통합 금지

이번 작업에서 다음을 만들지 않는다.

```text
GlobalNavigationRegistry
CrossServiceNavigationEngine
서비스별 모든 Header/Sidebar/BottomNav 통합 config
```

Mobile Bottom Nav만 다룬다.

### 7.2 serviceKey switch 남발 금지

공통 Core 내부에:

```ts
if (serviceKey === 'kpa-society') ...
if (serviceKey === 'glycopharm') ...
```

형태의 분기를 쌓지 않는다.

서비스별 차이는 props/config/wrapper에 둔다.

### 7.3 기존 UX 유지

이번 작업은 redesign이 아니다.

다음은 가능한 한 그대로 유지한다.

```text
메뉴 순서
라벨
아이콘
색상
active 표시
높이
위치
모바일 breakpoint
role별 노출
```

---

## 8. active path 계약

가장 주의해서 조사한다.

서비스별 구현에서 다음 차이가 있을 수 있다.

```text
exact match
startsWith
nested route
alias route
home special case
query/hash
```

공통화 후 active 표시가 달라지면 회귀다.

필요하면 item 단위로:

```ts
isActive(pathname)
```

또는:

```ts
matchPaths
```

같은 최소 확장을 허용한다.

단, React Router 전체 matching engine을 새로 만들지 않는다.

---

## 9. Icon 계약

기존 서비스들이 서로 다른 icon source를 사용한다면 공통 Core에서 특정 icon library를 강제하지 않는다.

가능한 구조:

```ts
icon: ReactNode
```

또는 기존 프로젝트 관례에 맞는 component type.

아이콘 변경은 하지 않는다.

---

## 10. 스타일 계약

공통화 대상:

```text
배치
item container
icon/label structure
active/inactive 구조
safe-area
```

서비스별 차이로 남길 수 있는 것:

```text
active color
brand color
특정 className
일부 높이/spacing 차이
```

가능하면 className/style props 또는 기존 token을 사용한다.

새 디자인 시스템을 만들지 않는다.

---

## 11. 구현 범위

### 11.1 공통 Core 생성

4개 구현의 실질 공통 부분을 추출한다.

위치는 현재 repository 패키지 의존관계를 확인한 뒤 정한다.

우선 후보:

```text
@o4o/shared-space-ui
```

단, dependency 방향이 맞지 않으면 이미 사용 중인 더 적절한 공통 package를 사용한다.

### 11.2 서비스별 thin wrapper

각 서비스 기존 component 이름을 유지하는 편이 route/layout 변경을 최소화한다면 유지한다.

예:

```text
KPA MobileBottomNav
→ items 정의
→ common MobileBottomNav 호출
```

동일하게 GP/KCos/Neture 적용.

### 11.3 중복 코드 제거

공통 Core로 옮긴 렌더링 코드는 서비스 파일에서 제거한다.

최종적으로 서비스 wrapper가 수백 LOC로 남으면 공통화가 충분히 된 것인지 재검토한다.

---

## 12. Neture 주의사항

Neture는 component 이름과 route 축이 다른 가능성이 높다.

다음은 유지한다.

```text
Neture 고유 메뉴 구성
공급자/파트너 관련 route semantics
기존 active path 규칙
권한 차이
```

KPA/GP/KCos 구조에 억지로 맞추지 않는다.

공통 rendering contract만 채택한다.

---

## 13. 범위 밖

이번 WO에서는 수정하지 않는다.

```text
Header
Desktop navigation
Sidebar
Footer
법정문서
Operator shell
StoreHub shell
MyStore shell
navigation route 자체
role/permission 정책
AuthContext 구조
메뉴 명칭 개편
아이콘 redesign
PharmacyHub Header/Footer
Glyco stale copyright
dead component 정리
```

PharmacyHub는 선행 census에서 이번 GROUP-H1 대상이 아니므로 새로 끼워 넣지 않는다.

---

## 14. 정량 결과

CHECK에 반드시 전후 수치를 남긴다.

최소:

```text
수정 전 대상 파일 LOC
공통 Core LOC
수정 후 서비스 wrapper LOC
삭제된 중복 LOC
순증/순감 LOC
```

그리고 판정:

```text
VIEW_DUPLICATED → FULLY_COMMON
```

또는 실제 차이가 남으면:

```text
VIEW_DUPLICATED → CORE_ONLY
```

중 하나로 명확히 기록한다.

목표는 LOC 숫자 자체가 아니라 **중복 렌더링 코드 제거**다.

---

## 15. 검증

### 15.1 정적 검증

4서비스 모두:

```text
import 정상
unused code 0
route 변경 0
메뉴 item 누락 0
active matcher 유지
```

```bash
git diff --check
```

### 15.2 Typecheck / Build

최소 다음 4서비스를 각각 검증한다.

```text
KPA Society
GlycoPharm
K-Cosmetics
Neture
```

현재 저장소의 canonical filter/build 명령을 사용한다.

공통 package 변경이 있으면 해당 package build/typecheck도 수행한다.

전체 monorepo build는 이번 범위에서 필수 아님.

---

## 16. Browser smoke

모바일 viewport에서 반드시 실제 렌더를 확인한다.

권장 viewport:

```text
390 x 844
```

각 서비스 최소:

```text
Home 또는 기본 route
두 번째 탭
nested route 하나
```

확인 항목:

```text
bottom nav 표시
메뉴 개수 정상
라벨 정상
아이콘 정상
active tab 정상
탭 클릭 navigation 정상
nested route active 정상
content가 nav 뒤에 가려지지 않음
safe-area/layout 이상 없음
desktop에서는 기존 계약대로 미노출
404 0
console error 0
```

가능하면 desktop viewport도 한 번 확인한다.

---

## 17. 회귀 중점

다음은 반드시 비교한다.

### KPA

```text
기존 메뉴 순서
active path
브랜드 색상
```

### GlycoPharm

```text
기존 메뉴 순서
Store 관련 route active 처리
```

### K-Cosmetics

```text
기존 메뉴 순서
active styling
```

### Neture

```text
Neture 고유 route
NetureBottomNav active 규칙
권한/노출 차이
```

---

## 18. CHECK 문서

작성:

```text
docs/checks/CHECK-O4O-CROSSSERVICE-MOBILE-BOTTOM-NAV-COMMONIZATION-V1.md
```

반드시 포함:

```text
1. 현재 main 모집단 재확인
2. 4개 기존 구현 비교
3. 실제 공통 부분
4. 서비스별 유지 차이
5. 공통 Core 위치 및 이유
6. 변경 파일
7. before/after LOC
8. 삭제한 중복 LOC
9. active-path 계약
10. 서비스별 wrapper/config
11. 4서비스 typecheck/build
12. mobile browser smoke
13. desktop 회귀
14. 미확인 항목
15. 최종 판정 FULLY_COMMON 또는 CORE_ONLY
```

---

## 19. 중단 기준

다음이 확인되면 무리하게 하나로 합치지 않는다.

```text
4개 구현의 navigation semantics가 선행 census와 달리 본질적으로 다름
공통화를 위해 다수 serviceKey conditional이 필요함
role/permission 구조까지 재설계해야 함
router 구조 변경이 필요함
공통 package dependency cycle이 발생함
다른 세션 WIP와 직접 충돌함
```

이 경우 가장 자연스러운 하위 그룹까지만 공통화하고 이유를 CHECK에 기록한다.

---

## 20. 완료 기준

다음을 만족하면 완료다.

```text
현재 main 기준 4서비스 모집단 재확인
공통 MobileBottomNav Core 생성 또는 기존 공통 Core 채택
KPA 적용
GlycoPharm 적용
K-Cosmetics 적용
Neture 적용
서비스별 메뉴/route semantics 유지
중복 렌더링 코드 실질 제거
4서비스 typecheck/build PASS
모바일 browser smoke PASS
desktop 회귀 확인
CHECK 작성
commit/push 완료
```

이번 완료는:

```text
Cross-service MobileBottomNav commonization 완료
```

만 의미한다.

Header/Footer 전체 공통화 완료로 선언하지 않는다.

---

## 21. 작업 종료

```bash
git status --short
git diff --check
```

이번 WO 관련 파일만 path-specific stage 한다.

```bash
git add <이번 WO 관련 파일>
git commit -m "refactor(ui): commonize mobile bottom navigation"
git push origin <현재 브랜치>
```

`git add .` 금지.

---

## 22. 최종 보고 형식

최종 보고는 다음만 간단히 보고한다.

```text
1. 실제 대상 파일/LOC
2. 공통 Core 위치
3. 서비스별 wrapper/config 방식
4. before/after LOC 및 중복 제거량
5. active path 보존 결과
6. 4서비스 typecheck/build
7. 모바일 browser smoke
8. 최종 판정
9. CHECK 경로
10. commit/push
```

작업 중 PharmacyHub Header/Footer 또는 다른 Header/Footer 문제가 보여도 수정하지 않는다.
---

## 부기 — 실행 시점 측정값 (WO 본문 아님)

> 아래는 **2026-08-21 기준 `origin/main` 에서 실제로 측정한 값**이며 지시가 아니다.
> **부기와 코드가 다르면 코드가 정답이다.** §4 에 따라 실행자가 현재 main 에서 다시 확인한다.

### A. 기준 커밋

- 측정 시점 `HEAD == origin/main == 6ea5d4169`
- 작업트리에 **다른 세션 WIP 10건** 존재 (`apps/api-server/**` staged 삭제 3건, `packages/action-log-core/**` 미스테이지 삭제 7건).
  → **`git add .` 금지** (§21). path-specific stage 만 사용한다. 이 파일들을 되돌리거나 stash 하지 않는다.

### B. 대상 4개 파일 (실측 LOC — census 숫자와 일치)

| 서비스 | 파일 | LOC |
|---|---|---:|
| KPA | `services/web-kpa-society/src/components/MobileBottomNav.tsx` | 303 |
| GlycoPharm | `services/web-glycopharm/src/components/MobileBottomNav.tsx` | 256 |
| K-Cosmetics | `services/web-k-cosmetics/src/components/MobileBottomNav.tsx` | 254 |
| Neture | `services/web-neture/src/components/NetureBottomNav.tsx` | 217 |
| | **합계** | **1,030** |

**네 파일 모두 CRLF** 다. cross-service diff 전에 `tr -d '\r'` 로 정규화하지 않으면
"전 라인 상이" 로 보이는 오탐이 난다 (선행 트랙에서 `*GlobalHeader.tsx` 168 LOC 4종이
실제로 이 오탐을 냈다). **LOC 가 같다고 같은 코드가 아니다 — grep 분류 말고 파일을 연다.**

### C. dead component 아님 — 소비처 실측 (§4)

전부 살아있는 렌더 경로가 있다. 어느 것도 dead 로 제외할 수 없다.

- KPA (4곳): `App.tsx:532` · `components/Layout.tsx:35` · `components/admin/AdminLayout.tsx:58` · `components/instructor/InstructorLayout.tsx:176` · `components/kpa-operator/KpaOperatorLayoutWrapper.tsx:45`
- GlycoPharm (1곳): `components/layouts/MainLayout.tsx:23`
- K-Cosmetics (1곳): `components/layouts/MainLayout.tsx:21`
- Neture (6곳): `MainLayout.tsx:56` · `NetureLayout.tsx:58` · `AdminLayoutWrapper.tsx:40` · `OperatorLayoutWrapper.tsx:36` · `PartnerSpaceLayout.tsx:262` · `SupplierSpaceLayout.tsx:403`

→ **소비처 수가 서비스마다 다르다.** 공통화 후 회귀 검증은 각 서비스 1화면이 아니라
위 shell 별로 확인해야 한다 (특히 Neture 6 shell, KPA admin/instructor/operator shell).

### D. 실제 구성은 2계열이다 — §12/§19 의 핵심 신호

측정한 구조상 네 구현은 동일 계열이 아니다.

**계열 1 — GP · KCos (사실상 쌍둥이, 256/254 LOC)**
- 탭: 커뮤니티 / 약국(매장) 경영 / 알림 / 내정보, 비로그인 시 로그인 버튼
- 알림 라우팅 = **`@o4o/account-ui` 의 `resolveNotificationTarget`** (이미 공통 자산)
- 프로필 시트 없음. `notifOpen` boolean 하나
- 차이는 라벨(`약국 경영` vs `매장 경영`) · route(`/mobile/pharmacy` vs `/mobile/store`) · `isPharmacyActive`/`isStoreActive` 내부 제외 규칙

**계열 2 — KPA · Neture (프로필 시트 보유)**
- `openSheet: 'none' | 'profile' | 'notif'` 3-state, ESC 닫기 + 배경 스크롤 잠금
- 알림 라우팅 = **서비스 로컬 `src/lib/notificationRouting.ts`** (KPA `resolveNotificationTarget`, Neture `resolveNetureNotificationTarget`) — account-ui 공통본이 **아니다**
- 프로필 시트가 서비스 로컬 SSOT(`KpaUserMenu` / `NetureUserMenu`)를 재사용
- **Neture 는 primary 탭바가 아니다.** 헤더 주석: "상단 햄버거 = 사이트 이동 / 하단 utility = 알림·프로필(개인 기능)", 그리고 `isAuthenticated` 아니면 `null` 렌더(공개 랜딩/QR 누출 방지). 탭 구성도 Home/알림/내정보뿐이다.

→ §12 대로 **Neture 를 KPA/GP/KCos 모양에 억지로 맞추지 않는다.**
→ 알림 라우팅 SSOT 가 두 갈래(공통 vs 로컬)인 것은 이번 WO 범위 밖이다. **통합하지 말고 주입으로 받는다.**
→ §19 에 따라 계열 1만, 혹은 계열 1+2 의 렌더 shell 만 공통화하고 나머지는 이유를 CHECK 에 기록하는 결말이 정당하다. **무리한 100% 통합보다 정직한 부분 공통화가 맞다.**

### E. §11.1 공통 Core 위치 — 측정된 dependency 사실

- **`@o4o/account-ui` 는 4개 서비스 전부가 이미 dependency 로 가진다.** 게다가 이번 대상이
  이미 쓰고 있는 `useNotifications` · `NotificationSheet` · `NotificationTabBadge` · `resolveNotificationTarget` 의 소유 패키지다.
  `peerDependencies` 에 `react-router-dom` · `lucide-react` 가 이미 선언돼 있고 내부에서 `Link` 를 쓴다.
- `@o4o/shared-space-ui` 도 4개 서비스 전부에 있으나, 현재 내용은 community home 프레젠테이션 계열이고
  `@o4o/ui` · `@o4o/content-editor` 를 dependency 로 끌고 있다.
- 두 패키지의 빌드 방식이 다르다: account-ui = `dist` 빌드 산출물 export(`tsc --build`), shared-space-ui = `src` 직접 export.
  전자를 고르면 **패키지 build 순서/산출물 확인이 검증 항목에 추가**된다.

→ WO 본문의 "우선 후보 `@o4o/shared-space-ui`" 는 유지하되, §11.1 이 허용한 대로
**실제 dependency 방향과 자산 응집도를 근거로 `@o4o/account-ui` 를 선택하는 것도 정당하다.**
어느 쪽을 고르든 **선택 근거를 CHECK 에 남긴다.**

### F. 신규 패키지 금지에 준하는 실무 함정

`services/web-kpa-society/Dockerfile` 은 **선별 COPY** 방식이다.
**신규 패키지를 만들면 Dockerfile COPY 2줄을 함께 추가하지 않는 한 KPA 프로덕션 빌드가 깨진다**
(선행 `@o4o/screen-content-core` 추출에서 실제 발생). 이번 WO 는 §7.1 이 새 framework 를 금지하므로
**기존에 이미 소비 중인 패키지에 얹는 것이 안전하다.** 부득이 신규 패키지가 필요하다고 판단되면
그것 자체가 §19 중단 신호에 가깝다.

### G. §8 active 판정 — 회귀 위험이 가장 큰 지점

세 서비스의 active 함수는 겉보기만 비슷하고 **제외 규칙이 서로 다르다.**

- KPA `isPharmacyActive`: `/mobile/pharmacy` exact · `/pharmacy*` · `/store-hub*` · `/store`,`/store/*` 에서 **slug 판별 정규식(`dashboard|info|marketing|commerce|...` 화이트리스트)** 으로 공개 매장 페이지 제외
- GP `isPharmacyActive`: `/mobile/pharmacy` exact · `/store-hub*` · `/store/*` 에서 **`/^\d/` 숫자 시작이면 소비자 스토어로 제외**
- KCos `isStoreActive`: `/mobile/store` exact · `/store-hub*` · `/store/*` 에서 **`/^\d/` 제외**
- 커뮤니티 탭: KPA 는 `pathname === '/' || /forum* || /lms* || /resources*`

→ 이 판정 로직은 **서비스 config 로 주입**하고 공통 Core 는 "주어진 predicate 로 active 를 계산"만 한다.
공통 Core 안에 위 화이트리스트/정규식을 넣거나 `if (serviceKey === ...)` 로 분기하면 §7.2 위반이다.
→ §8 검증은 위 경로들을 **실제로 이동해 보고** 하이라이트가 이전과 동일한지 확인해야 한다. 코드 리뷰만으로 통과시키지 않는다.

### H. 보고 시 유의

- §14 는 LOC 감소 자체가 목표가 아니라고 명시한다. **중복 렌더링 코드 제거량**과
  **최종 판정(`FULLY_COMMON` vs `CORE_ONLY`)** 을 근거와 함께 적는다.
- §20 대로 이번 완료는 `Cross-service MobileBottomNav commonization 완료` 만 의미한다.
- CLAUDE.md §16-5 에 따라 완료 보고에 `문서 정합:` 한 줄을 반드시 포함한다.
