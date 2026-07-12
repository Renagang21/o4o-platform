# IR-O4O-STORE-RESPONSIVE-SIDEBAR-DRAWER-CROSSSERVICE-AUDIT-V1

> **유형**: Investigation (조사 전용 — 코드/CSS/route/권한/API/DB/배포 변경 0)
> **조사일**: 2026-07-12
> **선행**: `WO-O4O-KPA-STORE-RESPONSIVE-AND-HAMBURGER-MENU-SIMPLIFY-V1`(KPA `/store` KPI·햄버거 정리, 커밋 `f0ccc4f42`) 후속. KPA만 임시 보정하지 않고 전 서비스 store 반응형 사이드바를 전수 조사.
> **기준 표준**: `docs/baseline/O4O-RESPONSIVE-SIDEBAR-NAVIGATION-STANDARD-V1.md` (breakpoint lg=1024, <1024 hamburger+drawer)

---

## 1. Executive Summary

**결론: 공용 layout 결함 (유형 A). KPA 전용 아님.**

공용 `StoreDashboardLayout`(`packages/store-ui-core`)에는 모바일 drawer 기능(`sidebarOpen` state + overlay + 좌측 slide-in `<aside>` + close 트리거들)이 **모두 구현되어 있으나**, drawer 를 여는 **유일한 트리거(hamburger `onMenuToggle`)가 `StoreTopBar` 안에만** 존재한다. store 를 소비하는 3개 서비스(KPA / GlycoPharm / K-Cosmetics)가 **모두 `hideTopBar` 로 `StoreTopBar` 를 숨기고 외부 GlobalHeader 를 형제로 렌더**하므로, `<1024px` 에서 **store 업무 사이드바를 열 수 있는 진입점이 아예 렌더되지 않는다.**

결과적으로 3개 서비스 모두 `/store` 에서 화면 폭 `<1024px` 이면 좌측 업무 사이드바(진열/자료/POP/QR/블로그/사이니지 등)가 화면 밖(`translateX(-256px)`)으로 밀려나고, 이를 다시 불러올 방법이 없다. 특히 **768~1023px(tablet) 구간에서는 사이트 햄버거(`md:hidden`)조차 사라져** 업무 메뉴 접근 수단이 0이다.

- **분류**: 유형 A(공용 layout 결함) + 유형 D(drawer 는 렌더되나 트리거 부재로 도달 불가).
- **영향 서비스**: KPA / GlycoPharm / K-Cosmetics (동일 공용 layout · 동일 `hideTopBar` 패턴).
- **Neture**: 비해당 (store layout 미소비. 공급자 영역은 별도 `SupplierSpaceLayout`).
- **수정 위치**: 공용 `StoreDashboardLayout` 1곳 수정으로 3서비스 동시 해결 가능(서비스별 중복 구현 불필요).

---

## 2. 조사 방법

- 코드: `StoreDashboardLayout` / `StoreTopBar` / `StoreSidebar` 및 3서비스 `App.tsx` 소비 지점 정적 분석.
- 운영 브라우저(Playwright, prod): KPA `kpa-society.co.kr/store`, K-Cosmetics `k-cosmetics.site/store` 에서 1023/1024 경계 DOM 실측(`getComputedStyle`/`getBoundingClientRect`).
- git 이력: `hideTopBar` 도입 시점 추적.

---

## 3. 공용 소비처 그래프 (코드 확정)

```
StoreDashboardLayout  (packages/store-ui-core/src/layout/StoreDashboardLayout.tsx)
├─ StoreTopBar   (내부, !hideTopBar 일 때만 렌더) ← 모바일 hamburger(onMenuToggle) 유일 보유처
├─ StoreSidebar  (drawer/desktop 공통 aside 내부)
│    └─ onItemClick / onClose(X) / overlay click  ← close 트리거(구현됨)
└─ sidebarOpen state (내부 useState)              ← 외부 header 접근 불가

소비 (모두 hideTopBar + 외부 GlobalHeader 형제):
├─ web-kpa-society   App.tsx:512-528  <KpaGlobalHeader/> + <StoreDashboardLayout hideTopBar .../>
├─ web-k-cosmetics   App.tsx:361-377  <KCosGlobalHeader/> + <StoreDashboardLayout hideTopBar .../>
└─ web-glycopharm    App.tsx:454-470  <GlycoGlobalHeader/> + <StoreDashboardLayout hideTopBar .../>

web-neture: StoreDashboardLayout/StoreSidebar 미소비 (MediaPickerModal 만 store-ui-core 공유)
```

---

## 4. 원인 확정 (구체)

`StoreDashboardLayout` 는 drawer 를 완전히 구현하고 있다:

```tsx
const [sidebarOpen, setSidebarOpen] = useState(false);
// ...
{!hideTopBar && (
  <StoreTopBar ... onMenuToggle={() => setSidebarOpen(true)} />   // ← 트리거는 여기에만
)}
// ...
{sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick=...) }   // overlay OK
<aside className="fixed left-0 ... lg:sticky ...
     ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}">    // slide-in OK
  <StoreSidebar onItemClick={close} onClose={close} ... />        // close OK
</aside>
```

`StoreTopBar` 의 hamburger(유일 트리거):

```tsx
{onMenuToggle && (
  <button onClick={onMenuToggle} className="lg:hidden p-2 ...">   // StoreTopBar.tsx:139-146
    <Menu ... />
  </button>
)}
```

**결정적 지점**: 3서비스 모두 `hideTopBar` 를 전달 → `StoreTopBar` 미렌더 → `onMenuToggle` hamburger 미렌더 → `setSidebarOpen(true)` 를 호출할 UI 없음. `sidebarOpen` 은 `StoreDashboardLayout` 내부 state 라 형제로 렌더된 외부 GlobalHeader(`KpaGlobalHeader` 등)에서 접근 불가. 따라서 `<1024px` 에서 store 업무 사이드바는 영구히 닫힌 상태.

**외부 GlobalHeader 의 햄버거는 사이트 메뉴용**: `packages/ui GlobalHeader` 의 모바일 hamburger(`메뉴 열기`)는 사이트 nav(커뮤니티/내 약국/약국 운영 허브/…)를 여는 것이며 store 업무 사이드바와 무관. 게다가 이 버튼은 `md:hidden`(≥768px 숨김)이라 tablet(768~1023) 구간에서는 표시조차 되지 않는다.

---

## 5. 운영 브라우저 smoke (prod, 2026-07-12)

계정: `sohae2100@gmail.com` (operator-or-above → `/store` 진입). Playwright DOM 실측.

### 5-A. KPA `kpa-society.co.kr/store`
| viewport | store `<aside>` transform | 사이드바 표시 | store drawer 트리거 | 가로 스크롤 |
|---|---|---|---|---|
| 1023px | `translateX(-256px)` (fixed) | ❌ 화면 밖 | ❌ 없음 (헤더 버튼: 알림/사용자메뉴/메뉴열기[`md:hidden` 사이트]/새로고침) | 없음 |
| 1024px | `translateX(0)` (sticky) | ✅ 표시(x=0, w=256) | (해당 없음, 고정 사이드바) | 없음 |

### 5-B. K-Cosmetics `k-cosmetics.site/store`
| viewport | store `<aside>` transform | 사이드바 표시 | store drawer 트리거 |
|---|---|---|---|
| 1023px | `translateX(-256px)` (fixed) | ❌ 화면 밖 | ❌ 없음 (헤더 버튼: 알림/사용자메뉴/메뉴열기[`md:hidden` 사이트]) |

→ 두 서비스 live 동일. GlycoPharm 은 코드 동일(`GlycoGlobalHeader` 형제 + `hideTopBar`)로 동일 판정. (GP live 도메인은 SiteGuide 서빙 이슈로 별도 URL 확인 필요 — 본 조사는 코드 확정.)

---

## 6. 서비스별 결과 Matrix

| 서비스 | store layout | sidebar 소스 | Desktop(≥1024) | Mobile 트리거(<1024) | Drawer 구현 | Overlay | 메뉴선택 close | X 버튼 | ESC | 사이트 vs 업무 햄버거 | 판정 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **KPA** | 공용 `StoreDashboardLayout`(`hideTopBar`) | 공용 `StoreSidebar` | ✅ sticky 표시(live) | ❌ **부재** | 있음(도달불가) | 있음 | 있음 | 있음 | ❌ 없음 | 사이트 햄버거만(업무 없음), tablet 은 사이트마저 `md:hidden` | **결함** |
| **GlycoPharm** | 공용(`hideTopBar`) | 공용 `StoreSidebar` | ✅(코드) | ❌ **부재** | 있음(도달불가) | 있음 | 있음 | 있음 | ❌ 없음 | 동일 | **결함(코드확정)** |
| **K-Cosmetics** | 공용(`hideTopBar`) | 공용 `StoreSidebar` | ✅(코드) | ❌ **부재**(live 확인) | 있음(도달불가) | 있음 | 있음 | 있음 | ❌ 없음 | 동일 | **결함** |
| **Neture** | — (store layout 미소비) | — | — | — | — | — | — | — | — | 공급자=`SupplierSpaceLayout` 별도 | **비해당** |

> close 트리거(overlay/메뉴선택/X)는 코드상 구현되어 있으나 drawer 자체를 열 수 없어 **도달 불가**. ESC 는 layout 에 keydown 핸들러 부재 → 미구현(표준상 권장 항목).

---

## 7. 결함 분류 및 타임라인

- **분류**: **유형 A(공용 layout 결함)**. `hideTopBar` 모드에 모바일 drawer 트리거가 없음. 부차적으로 유형 D(렌더되나 가려짐/도달불가) 성격.
- **타임라인**: `hideTopBar` 지원과 3서비스 적용이 커밋 `795ac74be`(2026-04-17)에서 동시 도입. 즉 외부 GlobalHeader 패턴은 처음부터 store drawer 트리거 없이 배포됨(정상 상태에서의 회귀가 아니라, `hideTopBar` 경로에 트리거가 애초에 누락).
- **표준과의 관계**: 사이드바 표준(`...NAVIGATION-STANDARD-V1`, 2026-06-17) matrix #4 는 "drawer 는 StoreDashboardLayout, 이미 lg" 로 기록했으나, 이는 layout 코드(drawer 존재)만 본 판정이며 `hideTopBar` 런타임에서 트리거가 사라지는 점은 포착되지 않았다. 본 IR 이 그 gap 을 확정.

---

## 8. 후속 WO 권고

**단일 공용 수정 권고** (KPA-only 금지):

```
WO-O4O-STORE-MOBILE-SIDEBAR-DRAWER-CROSSSERVICE-STANDARDIZE-V1
```

- 범위: 공용 `StoreDashboardLayout` 1곳. `hideTopBar=true` 모드에서도 `<1024px` store drawer 진입점을 제공.
- 설계 후보(택1, WO 에서 확정):
  1. **layout 내부에 독립 store hamburger 렌더** — `hideTopBar` 시 본문 상단(또는 외부 header 높이 `top-16` 아래)에 `lg:hidden` 업무 메뉴 버튼을 자체 렌더. 외부 header 무변경으로 가장 격리적.
  2. **toggle 을 외부로 노출**(context 또는 render-prop) — `KpaGlobalHeader`/`GlycoGlobalHeader`/`KCosGlobalHeader` 가 `/store` 에서 store 햄버거를 host. 사이트/업무 햄버거 구분(유형 E) 동시 정리 가능하나 3 header 변경 필요.
- 필수 준수: breakpoint lg(1024), overlay/메뉴선택 close 유지, ESC 권장 추가, aria-label/expanded/controls, **route/권한/menu visibility/메뉴명 무변경**.
- 검증: 3서비스 build/typecheck + 375/768/1023/1024/wide smoke(전 구간 가로 스크롤 0·겹침 0·경계 정상) + Shared Module Change Protocol(전 소비처 회귀).
- 표준 문서(`...NAVIGATION-STANDARD-V1`) matrix #4 주석 갱신(“hideTopBar 모드 트리거” 명문화) 병행 권장.

우선순위: **P1** — 3서비스 tablet/mobile 에서 store 업무 메뉴 전면 도달 불가(기능 은폐)에 해당.

---

## 9. 준수 확인 (본 IR)

```
✅ 코드 변경 0 · CSS 0 · route 0 · 권한 0 · API 0 · DB 0 · 배포 0
✅ 산출물 = 본 IR 문서 1개 (docs/investigations/)
✅ 무관한 워킹트리 변경 미접촉 (stash/reset/revert/`git add .` 미사용)
✅ KPA 단독 수정 안 함 — 전 서비스 전수 조사 후 공용 결함 확정
```

---

## 10. 완료 기준 체크

- [x] 모든 `StoreDashboardLayout`/`StoreSidebar` 소비처 확인 (KPA/GP/KCos + Neture 비해당)
- [x] 공용 결함 vs service-local 확정 → **공용(유형 A)**
- [x] 사이트 햄버거 vs 업무 햄버거 관계 확인 (사이트만 존재, `md:hidden`)
- [x] 1023/1024 경계 확인 (live KPA + K-Cosmetics)
- [x] 코드 변경 0 / 배포 0
- [x] 후속 WO 권고안 작성

---

*작성: 2026-07-12 · Investigation only · 결론: 공용 StoreDashboardLayout 의 hideTopBar 모드 모바일 drawer 트리거 부재 → KPA/GP/KCos 동시 결함, 공용 1곳 수정 권고.*
