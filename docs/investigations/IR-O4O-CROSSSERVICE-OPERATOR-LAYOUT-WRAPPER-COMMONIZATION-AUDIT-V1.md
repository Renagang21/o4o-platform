# IR-O4O-CROSSSERVICE-OPERATOR-LAYOUT-WRAPPER-COMMONIZATION-AUDIT-V1

**조사 일자**: 2026-05-31
**조사 환경**: HEAD (main) `8ccb79f55` 시점 정적 코드 (read-only)
**조사 도구**: Read / Grep / Glob
**작업 성격**: read-only 조사 — 코드/DB/source 수정 없음
**선행 작업**: WO-O4O-CROSSSERVICE-OPERATOR-SIDEBAR-COMMON-COMPONENT-V1 (완료 고정, impl `55c87570d` + hotfix `9c37faecb`)

---

## 0. 핵심 결론 (TL;DR)

> ✅ **판정: 즉시 공통화 가능 (slot 기반 `OperatorAreaLayout` 추출)**
>
> KPA-Society / GlycoPharm / K-Cosmetics 의 operator layout wrapper 3개는 **layout shell 이 byte-identical** 이며, 차이는 (1) 컴포넌트명, (2) 렌더하는 `*GlobalHeader`, (3) `isAdminOrAbove` 에 넘기는 serviceKey 문자열 **3가지뿐**이다. 서비스별 복잡도(profile dropdown / NotificationBell / brand)는 전부 `*GlobalHeader` **브릿지 내부**에 있어 wrapper 공통화와 직교한다.
>
> - **공통화 방식**: operator-ux-core 에 `OperatorAreaLayout` 추가 — `header` slot + `menuItems` + `capabilities` props. wrapper 는 6~8줄로 축소.
> - **Neture 제외**: Neture wrapper 는 아직 **legacy `OperatorShell`** (flat sidebar) 사용 — DomainIASidebar 미이행. 선이행 WO 필요, 본 범위 제외.
> - **header/profile/notification 미변경**: GlobalHeader 브릿지는 서비스별 유지(brand·credit·register 방식 상이). wrapper 는 이를 slot 으로만 받음.
> - Operator OS Freeze: DomainIASidebar 와 동일 분류(동일 로직 공통 위치 이동, 기능 변경 없음) — 안전.
> - 후속 WO: **WO-O4O-CROSSSERVICE-OPERATOR-LAYOUT-WRAPPER-COMMON-COMPONENT-V1**

---

## 1. 조사한 파일 목록

| # | 파일 | 역할 |
|---|------|------|
| 1 | [web-kpa-society/.../kpa-operator/KpaOperatorLayoutWrapper.tsx](../../services/web-kpa-society/src/components/kpa-operator/KpaOperatorLayoutWrapper.tsx) | KPA operator layout wrapper |
| 2 | [web-glycopharm/.../layouts/OperatorLayoutWrapper.tsx](../../services/web-glycopharm/src/components/layouts/OperatorLayoutWrapper.tsx) | GlycoPharm operator layout wrapper |
| 3 | [web-k-cosmetics/.../layouts/OperatorLayoutWrapper.tsx](../../services/web-k-cosmetics/src/components/layouts/OperatorLayoutWrapper.tsx) | K-Cosmetics operator layout wrapper |
| 4 | [web-kpa-society/.../KpaGlobalHeader.tsx](../../services/web-kpa-society/src/components/KpaGlobalHeader.tsx) | KPA header 브릿지 (profile/notif 포함) |
| 5 | [web-glycopharm/.../GlycoGlobalHeader.tsx](../../services/web-glycopharm/src/components/GlycoGlobalHeader.tsx) | GlycoPharm header 브릿지 |
| 6 | [web-k-cosmetics/.../KCosGlobalHeader.tsx](../../services/web-k-cosmetics/src/components/KCosGlobalHeader.tsx) | K-Cosmetics header 브릿지 |
| 7 | [web-neture/.../layouts/OperatorLayoutWrapper.tsx](../../services/web-neture/src/components/layouts/OperatorLayoutWrapper.tsx) | Neture operator wrapper (legacy OperatorShell) |
| 8 | `@o4o/operator-ux-core/src/sidebar/DomainIASidebar.tsx` | 공통 sidebar (선행 WO 산출물) |
| 9 | 각 서비스 `config/operatorCapabilities.ts` / `config/operatorMenuGroups.ts` | menuItems / capabilities 출처 |
| 10 | 각 서비스 `App.tsx` (route mount) | wrapper 마운트 지점 |

---

## 2. 서비스별 wrapper 구조 요약

### 2.1 KPA / GlycoPharm / K-Cosmetics (동일 패턴 — 본 공통화 대상)

세 wrapper 의 본문은 **완전히 동일한 layout shell** 이다:

```tsx
const { user } = useAuth();
const isAdmin = user ? isAdminOrAbove(user.roles, <serviceKey>) : false;
const menuItems = useMemo(() => filterMenuByRole(UNIFIED_MENU, isAdmin), [isAdmin]);

return (
  <div className="min-h-screen flex flex-col bg-gray-50">
    <XGlobalHeader />
    <div className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex gap-6">
        <DomainIASidebar menuItems={menuItems} capabilities={ENABLED_CAPABILITIES} sidebarTopOffset="top-20" />
        <main className="flex-1 min-w-0"><Outlet /></main>
      </div>
    </div>
  </div>
);
```

마운트: route element layout (`<OperatorRoute><OperatorLayoutWrapper /></OperatorRoute>` — glyco/kcos / neture, KPA 는 RoleGuard 경유). Outlet 기반.

### 2.2 Neture (legacy 패턴 — 제외)

Neture wrapper 는 **`@o4o/ui` 의 `OperatorShell`** (구 flat 11-feature sidebar) 을 그대로 사용:

```tsx
<NetureGlobalHeader />
<OperatorShell serviceName="Neture" menuItems={...} capabilities={...}
  dashboardLink="/operator" user={...} onLogout={...} renderHeader={() => null} sidebarTopOffset="top-20">
  <Outlet />
</OperatorShell>
```

- `DomainIASidebar` 미사용 / domain IA(커뮤니티·매장 HUB·운영 공통) 미적용.
- `filterMenuByRole(UNIFIED_MENU, false)` — isAdmin 하드코딩 `false`.
- `OperatorShell` 이 sidebar+user+logout 를 모두 흡수 → 3 서비스와 구조 상이.

→ **Neture 는 본 공통화 이전에 DomainIASidebar 이행이 선행되어야 함.** 본 IR 범위 제외.

---

## 3. KPA / GlycoPharm / K-Cosmetics wrapper 비교표

| 축 | KPA | GlycoPharm | K-Cosmetics |
|----|-----|-----------|-------------|
| 컴포넌트명 | `KpaOperatorLayoutWrapper` | `OperatorLayoutWrapper` | `OperatorLayoutWrapper` |
| export | default | default | default |
| header import | `KpaGlobalHeader` | `GlycoGlobalHeader` | `KCosGlobalHeader` |
| isAdmin serviceKey | `'kpa'` | `'glycopharm'` | `'cosmetics'` |
| isAdmin helper | `isAdminOrAbove` | `isAdminOrAbove` | `isAdminOrAbove` |
| menuItems | `filterMenuByRole(UNIFIED_MENU, isAdmin)` | 동일 | 동일 |
| capabilities | `ENABLED_CAPABILITIES` | 동일 | 동일 |
| useAuth source | `../../contexts/AuthContext` | `../../contexts/AuthContext` | `../../contexts/AuthContext` |
| 외곽 div | `min-h-screen flex flex-col bg-gray-50` | 동일 | 동일 |
| container | `max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6` | 동일 | 동일 |
| inner flex | `flex gap-6` | 동일 | 동일 |
| sidebar | `DomainIASidebar` (offset `top-20`) | 동일 | 동일 |
| main | `flex-1 min-w-0` + `<Outlet/>` | 동일 | 동일 |
| useMemo deps | `[isAdmin]` | 동일 | 동일 |

**차이 라인 수**: 본문 기준 실질 차이 = 컴포넌트명 1줄 + header import/엘리먼트 1줄 + serviceKey 1토큰. **나머지 100% 동일.**

---

## 4. 공통 구조 (추출 대상)

다음은 3개 wrapper 가 byte-identical 로 공유 → 공통 컴포넌트로 이동 가능:

1. 외곽 `div.min-h-screen flex flex-col bg-gray-50`
2. content container (`max-w-[1400px] mx-auto px-... py-6`)
3. inner `flex gap-6`
4. `DomainIASidebar` 마운트 + `sidebarTopOffset="top-20"`
5. `main.flex-1 min-w-0` + `Outlet`
6. responsive/spacing/className 전부

→ **layout shell 전체가 공통.** sidebar width(`w-60`)·mobile handling 은 이미 DomainIASidebar 내부에 있어 wrapper 가 관여하지 않음.

---

## 5. 서비스별 차이 (공통화 시 파라미터화 대상)

| 차이 | 처리 방식 |
|------|-----------|
| serviceKey (`kpa`/`glycopharm`/`cosmetics`) | wrapper 가 isAdmin 계산 후 menuItems 만 전달 → 공통 컴포넌트는 serviceKey 불필요 (또는 prop) |
| service label / logo / title | **header 브릿지 내부** (brand prop). wrapper 미관여 |
| GlobalHeader 종류 | `header` **slot prop** (`React.ReactNode`) |
| menuItems (service config) | `menuItems` **prop** (이미 role-filtered) |
| ENABLED_CAPABILITIES (service config) | `capabilities` **prop** |
| auth/user source | service-local `useAuth` → wrapper 에 잔류 (menuItems 계산용) |
| role 판단 (isAdmin) | wrapper 에 잔류 (`isAdminOrAbove(roles, serviceKey)`) |

핵심: **service config(`UNIFIED_MENU`, `ENABLED_CAPABILITIES`) 와 service context(`useAuth`) 는 공통 패키지가 import 할 수 없으므로**, 서비스 wrapper 가 menuItems 계산 후 props 로 주입하는 구조가 정답이다.

---

## 6. profile dropdown / NotificationBell 차이 (header 브릿지 내부 — wrapper 미관여)

> 이 영역은 전부 `*GlobalHeader` 의 `userMenuItems` / `utilitySlot` prop 안에 있다. wrapper 공통화와 **직교** — 변경 없음.

| 항목 | KPA | GlycoPharm | K-Cosmetics |
|------|-----|-----------|-------------|
| 강의 대시보드 (`/instructor`) | isInstructor | isInstructor | isInstructor (showInstructor) |
| 관리자 대시보드 (`/admin`) | isAdmin | isAdmin | isAdmin |
| 운영 대시보드 (`/operator`) | isOperator | isOperator | isOperator |
| fallback 대시보드 | 없음 | 없음 | **있음** (`!isAdmin&&!isOperator` → `getKCosmeticsDashboardRoute`) |
| 내 매장 (`/store`) | **있음** (isStoreOwner) | 없음(메뉴엔 없음) | 없음 |
| 마이페이지 icon | LayoutDashboard | LayoutDashboard | **UserCircle** |
| 설정 (`/mypage/settings`) | 공통 | 공통 | 공통 |
| utilitySlot | **credit 뱃지(⭐C)** + NotificationBell | NotificationBell | NotificationBell |
| register 진입 | `openRegisterModal` (useAuthModal) | `openRegisterModal` (별도 RegisterModalContext) | `navigate('/register')` (모달 없음) |
| login 진입 | `openLoginModal` (useAuthModal) | `useLoginModal` | `useLoginModal` |
| notif serviceKey | `'kpa-society'` | `'glycopharm'` | `'k-cosmetics'` |
| logout | `await logout()` → `/` | `logout()` → `/` | `logout()` → `/` |
| brand | 💊 KPA-Society / #2563eb | 💉 GlycoPharm / #059669 | 💄 K-Cosmetics / #db2777 |

→ **header/profile/notification 은 서비스별 정당한 차이** (brand 정체성·credit·register UX). 공통화 대상 아님 — slot 으로 유지.

---

## 7. 공통 wrapper 추출 시 props/API 초안

operator-ux-core 신규 `OperatorAreaLayout`:

```tsx
export interface OperatorAreaLayoutProps {
  /** 서비스별 GlobalHeader 브릿지 (예: <KpaGlobalHeader/>) */
  header: React.ReactNode;
  /** 이미 role-filter 된 메뉴 (filterMenuByRole 결과) */
  menuItems: Partial<Record<OperatorGroupKey, OperatorMenuItem[]>>;
  /** 서비스 활성 capability */
  capabilities: OperatorCapability[];
  /** sidebar sticky offset (default 'top-20') */
  sidebarTopOffset?: string;
  /** content. 미지정 시 <Outlet/> */
  children?: React.ReactNode;
}
```

렌더:

```tsx
<div className="min-h-screen flex flex-col bg-gray-50">
  {header}
  <div className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
    <div className="flex gap-6">
      <DomainIASidebar menuItems={menuItems} capabilities={capabilities} sidebarTopOffset={sidebarTopOffset ?? 'top-20'} />
      <main className="flex-1 min-w-0">{children ?? <Outlet />}</main>
    </div>
  </div>
</div>
```

서비스 wrapper 축소형(예 KPA):

```tsx
export default function KpaOperatorLayoutWrapper() {
  const { user } = useAuth();
  const isAdmin = user ? isAdminOrAbove(user.roles, 'kpa') : false;
  const menuItems = useMemo(() => filterMenuByRole(UNIFIED_MENU, isAdmin), [isAdmin]);
  return <OperatorAreaLayout header={<KpaGlobalHeader />} menuItems={menuItems} capabilities={ENABLED_CAPABILITIES} />;
}
```

> WO 요청 props 목록(serviceKey/serviceLabel/homePath/adminPath/...) 대비 검토: **homePath/adminPath/operatorPath/mypagePath/settingsPath 는 전부 header 브릿지의 userMenuItems 가 이미 보유** → 공통 wrapper 가 받을 필요 없음. serviceLabel/logo 도 header brand 소관. 따라서 공통 API 는 **header(slot) + menuItems + capabilities + sidebarTopOffset** 4개로 충분(최소 인터페이스). serviceKey 를 prop 으로 받아 isAdmin/menuItems 까지 공통이 계산하는 안은 service config import 불가로 **부적합** — menuItems 주입형이 정답.

---

## 8. 공통화하면 안 되는 부분

| 영역 | 판단 | 사유 |
|------|------|------|
| `*GlobalHeader` 브릿지 | **서비스별 유지** | brand·credit 뱃지·register UX·notif serviceKey·profile 메뉴(내 매장/fallback dashboard) 정당한 차이. slot 으로만 주입 |
| KPA `내 매장`(/store) profile 링크 | KPA 특수 — header 잔류 | store_owner 전용, KPA 만 보유 |
| K-Cos fallback dashboard | K-Cos 특수 — header 잔류 | `getKCosmeticsDashboardRoute` 의존 |
| KPA credit 뱃지 | KPA 특수 — header 잔류 | creditApi 의존 |
| register 진입 방식 | 서비스별 — header 잔류 | KPA/Glyco=모달, KCos=route nav |
| Neture wrapper | **이번 범위 제외** | legacy OperatorShell — DomainIASidebar 미이행 |
| useAuth / service config | 서비스 wrapper 잔류 | 공통 패키지가 import 불가 (service-local) |

---

## 9. Operator OS Freeze 검토

- `@o4o/operator-ux-core` 는 Freeze 영역(F1, BASELINE-OPERATOR-OS-V1).
- 본 공통화는 **신규 UX 정책 추가가 아니라** 3개 서비스에서 byte-identical 한 layout shell 을 공통 위치로 이동하는 **중복 제거 리팩토링** — DomainIASidebar 추출(WO-...-SIDEBAR-COMMON-COMPONENT-V1)과 **동일 분류**.
- 기능/노출/라우트/guard 변경 0. PR/보고에 "Freeze 영역 구조 변경 가능성 검토: 기능 변경 없음, 동일 wrapper layout shell 을 공통 위치로 이동" 명시 권장.
- **안전.**

---

## 10. Workspace UX 영향 검토

- `OperatorAreaLayout` 은 sidebar(3-domain IA) + Outlet 만 렌더 → **workspace 진입/구조를 강제하지 않음.**
- 3-domain IA(커뮤니티·매장 HUB·운영 공통)와 5/6 Workspace UX 는 **직교 축 유지** — 본 공통화는 navigation shell 만 다루고 workspace layout/entry 정책 미변경.
- **충돌 없음.**

---

## 11. Neture 포함 가능성 여부

- **현재 불가 (제외).** Neture wrapper 는 `OperatorShell`(legacy flat sidebar) 사용 — DomainIASidebar/domain IA 미이행, isAdmin 하드코딩 `false`, user/logout 을 OperatorShell 이 흡수하는 다른 구조.
- 포함하려면 **선행 WO**: `WO-O4O-NETURE-OPERATOR-SIDEBAR-DOMAIN-IA-MIGRATION-V1` (Neture 를 KPA/Glyco/KCos 와 동일한 DomainIASidebar + custom layout 으로 이행).
- 그 이후 Neture 도 동일 `OperatorAreaLayout` 사용 가능. **이번 범위에서는 3 서비스만.**

---

## 12. 최종 판정

### ✅ **즉시 공통화 가능**

| 기준 | 결과 |
|------|------|
| layout shell 동일성 | byte-identical (3 서비스) |
| 차이의 파라미터화 가능성 | 가능 — header(slot) + menuItems + capabilities |
| backend/route/guard 의존 | 없음 |
| header/profile/notification 영향 | 없음 (slot 으로 분리 유지) |
| TypeScript 영향 | 낮음 — operator-ux-core 신규 컴포넌트 + wrapper import 교체 |
| Operator OS Freeze | 안전 (동일 로직 이동, 기능 변경 0) |
| Workspace UX 충돌 | 없음 |
| Neture | 제외 (선행 migration 필요) |

→ DomainIASidebar 와 동일하게 **slot 기반 `OperatorAreaLayout` 추출이 즉시 가능하고 저위험**.

---

## 13. 후속 WO 후보

| 우선순위 | WO (가칭) | 범위 |
|:---:|-----------|------|
| 1 | **WO-O4O-CROSSSERVICE-OPERATOR-LAYOUT-WRAPPER-COMMON-COMPONENT-V1** | operator-ux-core 에 `OperatorAreaLayout` 추가 + 3 서비스 wrapper 를 축소형으로 교체. menuItems/capabilities/header slot props. (GlycoPharm App.tsx 의 `OperatorAreaLayout()` 지역 alias 명 충돌 주의 — 공통 컴포넌트명 또는 alias 정리 필요) |
| 2 (선행조건부) | WO-O4O-NETURE-OPERATOR-SIDEBAR-DOMAIN-IA-MIGRATION-V1 | Neture 를 OperatorShell → DomainIASidebar 이행. 완료 후 Neture 도 OperatorAreaLayout 합류 |
| OPTIONAL | 명명 정합 | 3 서비스 wrapper 컴포넌트명 통일(KPA 만 `KpaOperatorLayoutWrapper`, 나머지 `OperatorLayoutWrapper`) — 기능 무관 cosmetic |

> ⚠️ **명명 충돌 주의**: GlycoPharm `App.tsx:412` 에 지역 함수 `OperatorAreaLayout()` 이 이미 존재(= `<OperatorLayoutWrapper/>` 의 thin alias). 공통 컴포넌트를 `OperatorAreaLayout` 으로 명명할 경우 import 충돌 → 공통명을 다르게(예 `OperatorAreaShell`) 하거나 glyco 지역 alias 를 정리해야 함.

---

## 14. Current Structure vs O4O Philosophy Conflict Check

| 관점 | 판정 |
|------|------|
| O4O 공통 구조 원칙 (CLAUDE.md §13: forum/lms/signage 등은 플랫폼 공통 구조, 서비스는 동일 구조 위 자기 데이터 노출) | ✅ **정합** — operator layout shell 도 플랫폼 공통 UX 구조. 공통화는 이 원칙을 강화 |
| 사업 철학 (Operator = 서비스 운영 사업자, 동일 운영 UX) | ✅ 정합 — 동일 운영 navigation shell 을 공통화, 서비스별 brand 정체성은 header 에 보존 |
| Twin Axis (KPA + Neture canonical) | ⚠️ 부분 — 현재 공통화는 KPA(+Glyco/KCos)만. **Neture 축은 OperatorShell 잔류로 미합류** → 완전한 twin-axis 정합은 Neture migration(후속 WO) 후 달성. 본 IR 은 이를 명시적 후속으로 분리 |
| Drift 위험 | 낮음 — 기능/노출/정책 불변, layout shell 위치만 이동 |

**결론**: O4O 철학과 충돌 없음. 단, **완전한 cross-service 정합(Neture 포함)은 Neture DomainIASidebar 이행이 전제** — 이를 후속 WO 로 분리 추적하면 철학 정합 유지.

---

## 15. Working tree 격리 / commit 정책

- 조사 시작 시점 working tree clean (HEAD `8ccb79f55`, 다른 세션 WIP 0).
- 본 IR 문서 1개만 생성. **read-only — 코드/route/header/sidebar/capability/menu 미변경.**
- commit 시 본 IR 문서 1개만 path-restricted (`git commit -- <path>`). `git add .` / `-am` 금지.

---

> **상태**: read-only 조사 완료. 판정 = **즉시 공통화 가능** (slot 기반 `OperatorAreaLayout`, Neture 제외). 후속 = WO-O4O-CROSSSERVICE-OPERATOR-LAYOUT-WRAPPER-COMMON-COMPONENT-V1.
