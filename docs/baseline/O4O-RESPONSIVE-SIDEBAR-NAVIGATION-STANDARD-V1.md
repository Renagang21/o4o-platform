# O4O-RESPONSIVE-SIDEBAR-NAVIGATION-STANDARD-V1

> **유형**: Baseline / UI Standard (documentation only — 코드/route/권한/backend/DB 변경 0)
> **지위**: O4O 업무형 화면 좌측 사이드바 **반응형 Navigation 표준 V1** (신규/수정 구현이 따라야 할 기준)
> **확정일**: 2026-06-17
> **선행 조사**: `IR-O4O-RESPONSIVE-SIDEBAR-NAVIGATION-STANDARD-AUDIT-V1`
> **상태**: Active Standard — 1차 표준화 사이클(사이드바 6종) 완료 후 고정

---

## 1. 표준 목적

여러 WO에 걸쳐 확정된 O4O 좌측 사이드바의 반응형 기준을 단일 문서로 고정한다. 신규 업무형 화면·신규 사이드바 구현 시 `md냐 lg냐` · `tablet 고정이냐 drawer냐` · `active bg -50이냐 -100이냐` 같은 판단을 반복하지 않도록 한다.

본 문서는 **결과 보고가 아니라 앞으로 따라야 할 UI 표준**이다. 충돌 시 본 문서 기준으로 정렬한다(영역별 baseline 하위).

---

## 2. 적용 대상

좌측 사이드바가 있는 모든 업무형 화면:

```
- operator (/operator/*)        — 전 서비스
- service admin (/admin/*)      — Neture / GlycoPharm / K-Cosmetics / KPA
- platform admin (/admin/platform/*)
- store / 내 매장 / 내 약국 (/store/*)
- store-hub / 매장 허브 (/store-hub/*)
- supplier / 공급자 (/supplier/*)
- 향후 좌측 사이드바가 추가되는 모든 업무형 화면
```

(공개 페이지·랜딩·로그인 등 비업무형 화면은 대상 아님.)

---

## 3. Breakpoint 표준

| 구간 | 기준 | 사이드바 동작 |
|------|------|---------------|
| **Desktop** | **`>= 1024px` (Tailwind `lg`)** | 고정 좌측 사이드바, 항상 표시 |
| **Tablet/Mobile** | **`< 1024px`** | 사이드바 기본 숨김 → hamburger + drawer |

- **표준 breakpoint = `lg`(1024).** tablet 구간(768~1023)도 **drawer** 로 동작한다.
- ⚠️ 과거 `md`(768) 기준(= tablet 에서 고정 사이드바 노출) 패턴은 **신규 구현에서 지양**. O4O 는 업무 메뉴가 많아 tablet 폭에서 고정 사이드바가 본문을 압박하기 쉽다.
- 기존 `md` 기준 화면은 본 사이클에서 `lg` 로 정렬 완료(§9).

---

## 4. Mobile/Tablet Drawer 표준 (`<1024px`)

```
- drawer 는 <1024px 에서만 사용
- 좌측 slide-in 방식 (translate-x: -100% ↔ 0)
- hamburger 토글 버튼으로 open
- overlay 표시 (bg-black/40 수준)
- drawer open 시 본문 horizontal scroll 없음
- 사이드바는 fixed (out-of-flow) → 본문을 밀거나 가리지 않음
```

### close trigger
| trigger | 요구 수준 |
|---------|-----------|
| overlay click | **필수** |
| 메뉴(Link) 선택 | **필수** (onClick → close) |
| drawer 내 X 버튼 | 권장 |
| **ESC** | **권장** (operator/store-hub/supplier 적용 완료) |

### group toggle 동작
```
- collapsible group 의 펼침/접힘(chevron) 토글은 drawer 를 닫지 않는다.
- close 는 실제 네비게이션(Link 선택) 또는 overlay/ESC 에서만.
```

---

## 5. Desktop Sidebar Layout 표준 (`>=1024px`)

두 패턴 모두 허용하되, **겹침 0 · horizontal scroll 0** 이 필수 조건.

### 허용 A — fixed sidebar + lg margin
```
- sidebar: position fixed, width W
- 본문: lg:ml-[W]  (margin 은 반드시 lg 이상에서만)
- sidebar width(W) 와 본문 margin 이 정확히 일치해야 함 (겹침 방지)
- <lg 에서는 margin 미적용(본문 full-width) + drawer
```
> 검증된 예: KPA admin AdminSidebar (`w-[260px]` + `lg:ml-[260px]`).

### 허용 B — sticky in-flow + flex sibling **(신규 구현 권장)**
```
- sidebar 와 content 가 flex row sibling
  <div class="flex">
    <aside class="... lg:sticky lg:top-N">   // mobile: fixed drawer
    <div class="flex-1 min-w-0">             // content, margin 불필요
- 본문 margin 불필요 → 폭 자동, 겹침 구조적으로 불가
```
> 검증된 예: OperatorAreaShell(operator/admin 공통), GP/KCos admin DashboardLayout(fixed+margin → flex sibling 전환), store-hub.

**원칙**: 신규/리팩터 구현은 **B(flex sibling)** 우선. 이미 안전 검증된 A(fixed+lg margin) 구조는 유지 가능.

---

## 6. 메뉴 계층 토큰

| 레벨 | font-size | font-weight | height | padding | active |
|------|-----------|-------------|--------|---------|--------|
| **top-level** | `text-sm` (14px) | `font-medium` (500) | ~42–44px (`py-3`) | `px-4` | primary + `bg-*-50` + (강조 `font-semibold` 권장) |
| **group** | `text-sm` (14px) | `font-semibold` (600) | ~42–44px | `px-4`/`px-5` | chevron **right aligned** |
| **child** | `text-[13px]` (13px) | `font-normal` (400) | ~34–36px (`py-2`) | `pl-14`(~56px) 수준 | primary + `bg-*-50` + `font-medium` (500) |

- group 은 chevron(ChevronDown/Right) 우측 정렬.
- child 계층이 없는 사이드바(아이콘 보유 1급 메뉴만 있는 경우, 예: StoreSidebar)는 child 토큰(13px/pl-14) 미적용 — 과적용 회피.
- domain heading(operator) 은 `text-[11px] uppercase tracking` 유지.

---

## 7. Active 상태 규약

```
active background = service primary 계열의 -50 shade 를 기본으로 한다.
  - blue-50   (operator/admin 공통 DomainIASidebar)
  - indigo-50 (KPA admin)
  - teal-50   (store / GlycoPharm store-hub)
  - pink-50   (K-Cosmetics)
```

- ⚠️ `-100` 이상 shade 는 메뉴가 과하게 강조되어 보이므로 **특별한 이유 없으면 지양**. (StoreSidebar `bg-teal-100` → `bg-teal-50` 정렬 완료)
- active text = service primary(예: `text-teal-700`/`text-blue-600`).
- 강조 보조: active 시 `font-semibold`(top-level) 또는 `font-medium`(child), 또는 border-l-2 accent(DomainIASidebar) 중 하나.

---

## 8. 접근성 권장

```
- hamburger 토글 버튼: aria-label, aria-expanded, aria-controls
- drawer aside: id (aria-controls 대상), 닫힘 시 aria-hidden 고려
- overlay: aria-hidden="true"
- ESC close 권장 (open 시에만 keydown 리스너 등록/해제)
```

---

## 9. 1차 사이클 정렬 완료 — 사이드바 6종 matrix

| # | 사이드바 | 영역 | 정렬 내용 | 패턴 |
|---|----------|------|-----------|------|
| **#1** | `DomainIASidebar` + `OperatorAreaShell` | operator/admin 공통(5 surface) | md→lg + 메뉴 토큰(group 600, child 13px/pl-14) + ESC | B (flex sibling, sticky) |
| **#2** | GP/KCos admin `DashboardLayout` | GP·KCos admin | fixed+`lg:ml-64` 제거 → flex sibling | A→**B** 전환 |
| **#3** | KPA admin `AdminSidebar`/`AdminLayout` | KPA admin | md→lg + 최소 토큰. **라이브 smoke PASS** | A (fixed + `lg:ml-[260px]`) |
| **#4** | `StoreSidebar` (store-ui-core) | store(3서비스) | 메뉴 토큰 정렬, active `bg-teal-100`→`bg-teal-50` + group height | (drawer는 StoreDashboardLayout, 이미 lg) |
| **#5** | GP/KCos `*HubLayout` | store-hub | P0 mobile drawer 신규(lg, hamburger+overlay+ESC) | B |
| **#6** | Neture `SupplierSpaceLayout` | supplier | P0 mobile drawer + 모바일 중첩 메뉴 도달 | B |

**검증**: 누적 post-deploy smoke(#1/#2/#5/#6) + KPA admin(#3) 라이브 smoke — 전 구간 horizontal scroll 0 · 겹침 0 · 1023↔1024 경계 정상 · console error 0.

---

## 10. 신규/수정 작업 체크리스트

```
□ breakpoint = lg(1024). <1024 drawer / >=1024 고정.
□ desktop: flex sibling(권장) 또는 fixed+lg:margin(width 일치). 겹침/가로스크롤 0.
□ <1024: hamburger + 좌측 slide-in drawer + overlay(bg-black/40).
□ close: overlay click + 메뉴 선택 필수, ESC 권장. group toggle 은 close 안 함.
□ 본문: flex-1 min-w-0 (B) 또는 lg:ml-[W] (A, <lg 미적용).
□ 메뉴 토큰: top 14/500, group 14/600+chevron, child 13/400/pl-14(해당 시).
□ active: primary + bg-*-50 (-100 지양).
□ 접근성: aria-label/expanded/controls.
□ route/권한/menu visibility/메뉴명 변경 없음(레이아웃·토큰만).
□ 공통 컴포넌트(DomainIASidebar/OperatorAreaShell/StoreSidebar) 변경 시 Shared Module Change Protocol — 전 소비처 회귀 검증.
□ 검증: 변경 앱 build/typecheck + viewport 375/768/1023/1024/wide smoke.
```

---

## 11. Known Limitations

```
- ESC close 미적용 영역: GP/KCos/KPA admin layout(DashboardLayout/AdminSidebar).
  → admin layout 간 일관성 유지(overlay+X+메뉴선택 close 동작). 후속 공통화 시 ESC 정합 일괄 판단.
- fixed+lg:margin(A) 구조는 KPA admin 에 유지(검증됨). 신규는 flex sibling(B) 권장.
- child(13px/pl-14) 토큰은 해당 계층이 없는 사이드바(StoreSidebar 등)엔 미적용.
- 6종 외 신규 사이드바 등장 시 본 표준으로 정렬.
```

---

## 12. 관련 WO / SMOKE / 커밋

| 단계 | 항목 | commit |
|------|------|--------|
| 조사 | `IR-O4O-RESPONSIVE-SIDEBAR-NAVIGATION-STANDARD-AUDIT-V1` | `2bacb502a` |
| #5/#6 P0 | `WO-O4O-RESPONSIVE-SIDEBAR-P0-BROKEN-MOBILE-DRAWER-FIX-V1` | `700e15b7a` |
| #1 | `WO-O4O-RESPONSIVE-SIDEBAR-OPERATOR-ADMIN-LG-STANDARDIZATION-V1` | `927edb23e` |
| #2 | `WO-O4O-GP-KCOS-ADMIN-DASHBOARD-LAYOUT-RESPONSIVE-CLEANUP-V1` | `34f54469d` |
| smoke | `SMOKE-O4O-RESPONSIVE-SIDEBAR-CUMULATIVE-POST-DEPLOY-V1` | `57b9177c4` |
| #3 | `WO-O4O-KPA-ADMIN-SIDEBAR-LG-STANDARDIZATION-V1` (+live smoke) | `611162583` / `fa1ff5be9` |
| #4 | `WO-O4O-STORE-SIDEBAR-HIERARCHY-TOKEN-ALIGNMENT-V1` | `33db40b6a` |
| 표준 고정 | 본 문서 `O4O-RESPONSIVE-SIDEBAR-NAVIGATION-STANDARD-V1` | (이 커밋) |

---

## 13. 준수 확인

```
✅ documentation only — 코드/route/권한/backend/DB/package/lock 변경 0
✅ 산출물 = 본 표준 문서 1개 (docs/baseline/)
✅ 사이드바 6종 정렬 상태 + 신규 구현 기준 명시
```

---

*O4O Responsive Sidebar Navigation Standard V1 · breakpoint lg(1024), tablet 도 drawer · desktop flex sibling 권장(fixed+lg margin 허용) · drawer: hamburger+overlay+close(overlay/메뉴/ESC), group toggle 은 close 안 함 · 토큰 top 14/500·group 14/600·child 13/400/pl-14 · active bg-*-50(-100 지양) · 사이드바 6종 정렬 완료 · 신규 구현은 본 표준 준수.*
