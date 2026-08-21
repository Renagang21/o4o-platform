# CHECK — GlobalHeader submenu(`children`) 계약 결정

> **WO**: WO-O4O-GLOBAL-HEADER-SUBMENU-CONTRACT-DECISION-V1
> **일자**: 2026-08-21
> **성격**: 조사·결정 WO (코드 변경 0)
> **최종 판정**: **B — `GLOBAL_HEADER_CHILDREN_CONTRACT = REMOVE_UNUSED_CHILDREN`**

---

## 1. 기준 main commit

| 항목 | 값 |
|------|-----|
| 브랜치 | `main` (feature 브랜치 없음) |
| 기준 commit | `82e54ff21` (조사 착수 시점 이후 `git pull --ff-only` 로 갱신. 그 사이 유입된 변경은 backend membership/approval 계열로 Header 계열 파일 무변경) |
| 방식 | `git fetch origin` → `git status -sb` → `git branch --show-current` → `git pull --ff-only origin main` |
| 다른 세션 WIP | 접촉하지 않음 (수정·삭제·stash 0) |

선행 문서 확인: [GLOBAL-HEADER-STANDARD-V1](../architecture/ui/GLOBAL-HEADER-STANDARD-V1.md) §12 에서 `children` 이 **미결정**으로 표기되어 있음 · [CHECK-O4O-CROSSSERVICE-HEADER-FOOTER-FINAL-CLOSURE-AUDIT-V1](CHECK-O4O-CROSSSERVICE-HEADER-FOOTER-FINAL-CLOSURE-AUDIT-V1.md) FOLLOW_UP 항목 · [CHECK-O4O-GLOBAL-HEADER-STANDARD-CURRENT-STATE-ALIGNMENT-V1](CHECK-O4O-GLOBAL-HEADER-STANDARD-CURRENT-STATE-ALIGNMENT-V1.md) 7절.

---

## 2. `children` 타입 정의

[packages/ui/src/layout/GlobalHeader.tsx:21-25](../../packages/ui/src/layout/GlobalHeader.tsx#L21-L25)

```ts
export interface GlobalHeaderNavItem {
  label: string;
  href: string;
  children?: { label: string; href: string }[];   // ← 대상 필드
}
```

- 1단 중첩만 표현 가능 (child 는 `label`/`href` 뿐 — 재귀 구조 아님)
- child 단위 권한 조건 필드 **없음**
- `ContextualNavItem<TCondition>` 이 이 인터페이스를 상속하므로 형식상 `children` 을 물려받는다

---

## 3. producer census — `children` 을 채우는 곳

전수 확인 방법: `GlobalHeaderNavItem` 타입 사용처 전수(9곳) + 5서비스 `src/config/navigation.ts` 의 `children:` 검색.

| service | source file | parent item | children | child routes | role filtering | mobile relevance | alternative entry |
|---|---|---|:--:|---|---|---|---|
| PharmacyHub | [config/navigation.ts:32-45](../../services/web-pharmacy-hub/src/config/navigation.ts#L32-L45) | 커뮤니티 (`/community`) | 6 | `/community` · `/forum` · `/community/search` · `/forum/my-posts` · `/forum/my-dashboard` · `/forum/request` | 없음 (public nav) | 낮음 — drawer 는 1단 | CommunityHomePage 카드 · ForumHubPage 링크 |
| PharmacyHub | [config/navigation.ts:49-57](../../services/web-pharmacy-hub/src/config/navigation.ts#L49-L57) | 교육 (`/education`) | 3 | `/education` · `/account/enrollments` · `/account/certificates` | 없음 | 낮음 | Footer '서비스' 섹션 · My Page(`/account`) nav · 사용자 드롭다운 |
| PharmacyHub | [config/navigation.ts:61-69](../../services/web-pharmacy-hub/src/config/navigation.ts#L61-L69) | 이용 안내 (`/service-guide`) | 3 | `/service-guide` · `/guide/intro` · `/guide/features` | 없음 | 낮음 | Footer '이용 안내' 섹션 · CommunityHomePage 가이드 카드 · StoreOwnerShell |

**producer = PharmacyHub 1개 서비스 · parent 3개 · child 항목 12개.**
이 중 3개(`/community`, `/education`, `/service-guide`)는 **parent 자신의 href 와 동일**하므로,
submenu 로만 표현되는 고유 route 는 **9개**다.

KPA Society / GlycoPharm / K-Cosmetics / Neture 의 `config/navigation.ts` 에는 `children` 이 **1건도 없다**.

---

## 4. consumer census — `children` 을 읽는 곳

| 확인 대상 | 결과 |
|-----------|------|
| desktop PrimaryNav 렌더 | `publicNav.map` → `item.href`/`item.label` 만 사용. **children 미참조** |
| desktop contextualNav 렌더 | 동일 — `label`/`href` 만 |
| mobile drawer | `allNav.map` → `label`/`href` 만. nested section·아코디언 없음 |
| dropdown / submenu 시맨틱 | 존재하지 않음 (`aria-haspopup`·`aria-expanded` 사용처는 사용자 메뉴 버튼뿐) |
| active parent 계산 | `isActive(item.href, pathname)` — parent href 단독 판정, children 미참조 |
| `filterContextualNav` | **children 을 명시적으로 버린다** — `toNavItem` 이 `{ label, href }` 로 정규화 ([filterContextualNav.ts:38-45](../../packages/ui/src/layout/filterContextualNav.ts#L38-L45), 주석 "반환값은 `{ label, href }` 로 정규화한다") |
| 기타 helper (permission filter / menu flattening / route matching / breadcrumb / sidebar / analytics) | `.children` 을 읽는 코드는 전부 `apps/admin-dashboard` 의 **CPT·관리자 메뉴 빌더** (menu API·AdminSidebar·RoleBasedMenu·MenuItemTree) 로, `GlobalHeaderNavItem` 과 **무관한 별도 타입**이다 |
| 테스트 fixture | `GlobalHeaderNavItem` · `PH_PUBLIC_NAV` 를 참조하는 spec/test **0건** |
| `GlobalHeaderMenuItem` 의 `children` | React 노드 `children` (드롭다운 항목 내용) — nav 필드와 **다른 것**이다 |

> 단순 JSX 렌더 검색만으로 판정하지 않았다. ① 타입 사용처 전수 ② `PH_PUBLIC_NAV` 소비처(브릿지 1곳)
> ③ 저장소 전체 `.children` 읽기 ④ 테스트/픽스처 를 각각 확인했다.

**consumer = 0.** `children` 은 렌더·필터·라우팅·분석 어디에서도 소비되지 않으며, 공통 필터는 오히려 이 필드를 **제거**한다.

---

## 5·6. PharmacyHub child route 목록과 대체 진입경로

route 존재 여부는 `services/web-pharmacy-hub/src/App.tsx` 등재 기준.

| # | child route | route 존재 | 대체 진입경로 (Header submenu 외) | 모바일 도달 |
|:-:|-------------|:---------:|-----------------------------------|:-----------:|
| 1 | `/forum` | O | HomePage CTA · CommunityHomePage 카드 · Footer '서비스' 섹션 | O |
| 2 | `/community/search` | O | CommunityHomePage 카드 '커뮤니티 검색' | O |
| 3 | `/forum/my-posts` | O | CommunityHomePage 카드 '내 글' | O |
| 4 | `/forum/my-dashboard` | O | ForumHubPage 링크 '내 포럼' | O |
| 5 | `/forum/request` | O | ForumHubPage 링크 '포럼 개설 신청' · MyForumDashboardPage `requestFormHref` | O |
| 6 | `/account/enrollments` | O | **My Page nav** `PHARMACY_HUB_ACCOUNT_NAV_ITEMS` '내 수강' · Footer '서비스' 섹션 · 사용자 드롭다운 → `/account` | O |
| 7 | `/account/certificates` | O | 동일 My Page nav '내 수료증' · Footer · MyEnrollmentsPage 수료증 이동 | O |
| 8 | `/guide/intro` | O | Footer '이용 안내' 섹션 · CommunityHomePage 가이드 카드 | O |
| 9 | `/guide/features` | O | Footer '이용 안내' 섹션 · CommunityHomePage 카드 · StoreOwnerShell 링크 | O |

- **9/9 전부 다른 정상 UI 로 도달 가능**하며, 모두 데드링크가 아니다.
- PharmacyHub Footer([components/Footer.tsx](../../services/web-pharmacy-hub/src/components/Footer.tsx))에는 `hidden`/`md:` 숨김이 없어 **모바일에서도 렌더**된다 → 6·7·8·9 는 모바일에서 Footer 로도 도달한다.
- PharmacyHub 는 MobileBottomNav 가 `NOT_APPLICABLE` 이라 모바일 헤더 진입은 상단 drawer 뿐이지만, drawer 는 1단으로 parent(홈/커뮤니티/교육/이용 안내)를 노출하고 각 허브 화면이 하위 카드를 제공한다 → **모바일 기능 단절 0**.

### 7. desktop / mobile 필요성

| 축 | 판단 |
|----|------|
| desktop | 없어도 무방. parent 1클릭 → 허브 화면이 하위 카드를 제공. submenu 로 절약되는 것은 **1클릭**뿐 |
| mobile | 도입 시 drawer 가 2단 아코디언이 되어 탐색 비용이 오히려 증가. 현재 1단 구조가 단순하다 |

### 8. role / permission 영향

- producer 3개 parent 는 모두 **public nav** 로 권한 조건이 없다.
- `GlobalHeaderNavItem.children` 에는 **권한 조건 필드가 없고**, `ContextualNavItem.visibleWhen` 은 parent 레벨에만 존재한다.
- A(구현) 를 택하면 child 단위 노출 조건을 새로 설계해야 하고, `filterContextualNav` 의 정규화 계약(`{ label, href }`)도 함께 바꿔야 한다 → **5서비스 공통 계약 변경**.
- B(제거) 는 권한 경로에 영향이 없다 (현재 소비 0).

---

## 9·10·11. A / B 복잡도 비교

| 항목 | A: submenu 구현 | B: children 제거 |
|------|-----------------|------------------|
| 공통 Core 변경 | 큼 — desktop dropdown(open/close·outside click·ESC·focus trap·`aria-haspopup`/`aria-expanded`/`role="menu"`), mobile nested 아코디언, parent active 계산 변경, `filterContextualNav` 정규화 계약 변경, child 권한 필드 신설 | 작음 — 타입 1줄 삭제 |
| 서비스 변경 | PH 를 그대로 두더라도 나머지 4서비스 회귀 검증 필요. 실제 활용하려면 각 서비스 config 재설계 | PH `navigation.ts` children 3블록(12항목) 제거. 나머지 4서비스 **변경 0** |
| 모바일 UX | 신규 설계 필요(2단) — 현재보다 복잡 | 변화 없음 |
| 접근성 | 부담 큼 (키보드 이동·포커스·스크린리더 submenu 시맨틱) | 변화 없음 |
| 권한 처리 | child 단위 조건 신설 + 가드 정합 재검증 | 영향 없음 |
| 테스트 범위 | Core 상호작용 테스트 + 5서비스 Header 회귀 | 타입 컴파일 + 5서비스 빌드 |
| 향후 유지비 | 공통 Core 상호작용 컴포넌트 1개 추가 유지 | 감소 (미사용 계약 소멸) |
| **사용자 가치** | 낮음 — 9개 route 전부 이미 도달 가능, 절약분은 1클릭 | 중립 — 런타임 동작 변화 **0** (현재도 렌더되지 않음) |
| 런타임 회귀 위험 | 중~높음 (5서비스 공통 Header 상호작용 변경) | 낮음 (렌더 경로 무변경) |

### 12. 5서비스 영향

- **A**: 공통 `GlobalHeader` 변경 → KPA·GlycoPharm·K-Cosmetics·Neture·PharmacyHub 전부 desktop nav·mobile drawer·active 판정 회귀 검증 필요. children 이 없는 4서비스는 이득 0인데 회귀 위험만 부담한다.
- **B**: `children` 을 실제로 채우는 곳은 PH 1곳. `PH_FOOTER_SECTIONS` 도 `GlobalHeaderNavItem[]` 을 쓰지만 `children` 을 설정하지 않아 영향 없음. 테스트 fixture 0건, 문서 예시는 본 표준 문서 1곳.

---

## 13. 최종 판정

```text
GLOBAL_HEADER_CHILDREN_CONTRACT = REMOVE_UNUSED_CHILDREN
```

B 채택 근거 (WO §10 조건 전부 충족):

1. consumer 0 — 렌더러가 없을 뿐 아니라 공통 필터가 필드를 **제거**한다 (4절)
2. producer = PharmacyHub 1곳 (3절)
3. 하위 route 9/9 가 다른 정상 UI 로 접근 가능 · 모바일 포함 (5·6절)
4. Header submenu 가 제품 요구사항으로 확인되지 않음 — PH config 주석의 요구는 "deep-link only 를 남기지 않는다"였고, 그 요구는 Footer · My Page nav · 허브 카드로 **이미 충족**되어 있다
5. 구현 시 공통 Core 복잡도가 의미 있게 증가 (9~11절)
6. 현재 `children` 은 사실상 future placeholder

WO §11 원칙("사용자 가치가 작고 코드 복잡도가 커지면 구현하지 않는다") 적용 결과 **A 를 채택하지 않는다.**
HOLD 도 아니다 — 현재 코드·route 만으로 판정에 필요한 사실이 모두 확보되었다.

### 후속 제거 WO 가 지켜야 할 제약

- 하위 route **자체는 삭제하지 않는다** (9개 전부 유지).
- PH 에서 상단 노출이 실제로 필요한 항목이 있으면 `children` 이 아니라 **parent 항목 승격**으로 처리한다 (PrimaryNav 1단 유지).
- 제거 후 5서비스 Header 렌더 회귀(빌드 · desktop/mobile smoke)를 확인한다.

---

## 14. 후속 WO

```text
WO-O4O-GLOBAL-HEADER-UNUSED-CHILDREN-CONTRACT-REMOVAL-V1
```

범위: `GlobalHeaderNavItem.children` 타입 제거 + PH `navigation.ts` children 3블록 제거 + 표준 문서 정리 + 5서비스 회귀 확인.
**단일 WO 로 수행한다** (WO §16 — 잘게 쪼개지 않는다).

---

## 15. 코드 변경 0 여부

- 변경 파일 2건: 본 CHECK + [GLOBAL-HEADER-STANDARD-V1.md](../architecture/ui/GLOBAL-HEADER-STANDARD-V1.md) (§12 결정 상태 최소 반영)
- `services/` · `packages/` · `apps/` 변경 **0건** — submenu 구현·`children` 삭제·route 삭제 모두 수행하지 않았다 (WO §13·§14 준수, 결정과 구현 분리)
- Header/Footer 공통화 CLOSED 상태 변경 없음
