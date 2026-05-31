# IR-O4O-NETURE-OPERATOR-SIDEBAR-LAYOUT-MIGRATION-AUDIT-V1

**조사 일자**: 2026-05-31
**조사 환경**: HEAD (main) `76985d814` 시점 정적 코드 (read-only)
**조사 도구**: Read / Grep / Glob
**작업 성격**: read-only 조사 — 코드/DB/source 수정 없음
**선행 완료**: WO-O4O-CROSSSERVICE-OPERATOR-SIDEBAR-COMMON-COMPONENT-V1 (DomainIASidebar) / WO-O4O-CROSSSERVICE-OPERATOR-LAYOUT-WRAPPER-COMMON-COMPONENT-V1 (OperatorAreaShell) — 둘 다 운영 smoke PASS

---

## 0. 핵심 결론 (TL;DR)

> ⚠️ **판정: B — menu/domain IA 정리 후 이행 가능 (즉시 이행 불가)**
>
> 컴포넌트 **메커니즘**(menuItems shape / active route / capability gate / header slot / NotificationBell)은 전부 호환되어 OperatorAreaShell 결합은 기술적으로 trivial 하다. 그러나 **domain IA 의 의미(semantics)** 가 막힌다:
>
> 1. **DomainIASidebar 는 KPA 축(커뮤니티 / 매장 HUB / 운영 공통) domain IA 를 하드코딩** (operatorDomainIA.ts). Neture 는 **Supplier/B2B 축** (가입 승인 / 유통 펀딩 / 공급자 활성화 / 상품·카탈로그 / 주문·정산·커미션 / 파트너) — 기존 IA 를 그대로 적용하면 supplier/product/order/settlement 가 **"매장 HUB 운영" 헤딩 아래로 오분류**된다. Twin Axis(KPA + Neture canonical) 위반.
> 2. **Neture 는 domain IA 메타데이터(DOMAIN_LABELS/GROUP_TO_DOMAIN/DOMAIN_GROUP_ORDER) 부재** — KPA/Glyco/KCos 와 달리 flat STANDARD_GROUPS sidebar(OperatorShell) 사용 중. 이행 = **flat → domain-grouped 헤딩 도입 = 의도적 UX 변화** (no-op 리팩토링 아님).
> 3. **DomainIASidebar 가 operatorDomainIA 를 static import** → Neture 에 다른 domain 집합을 주려면 DomainIASidebar 를 **IA config 주입형으로 파라미터화**(operator-ux-core, additive, Freeze-safe)해야 함.
>
> 호환 OK: menuItems shape / active 로직 / capability gate / NetureGlobalHeader slot / profile dropdown / NotificationBell / isAdmin=false(보존 가능).
> 막힘: Neture 전용 domain IA **설계 결정** + DomainIASidebar **IA 주입 파라미터화** 가 선행.
>
> → 즉시 이행 WO 가 아니라 **(1) Neture operator domain IA 설계 결정 → (2) DomainIASidebar IA 파라미터화 → (3) Neture 이행 WO → (4) Neture operator 전용 smoke** 4단계 분리 권장.

---

## 1. 조사한 파일 목록

| # | 파일 | 역할 |
|---|------|------|
| 1 | [web-neture/.../layouts/OperatorLayoutWrapper.tsx](../../services/web-neture/src/components/layouts/OperatorLayoutWrapper.tsx) | Neture operator wrapper (legacy OperatorShell) |
| 2 | [web-neture/.../config/operatorMenuGroups.ts](../../services/web-neture/src/config/operatorMenuGroups.ts) | UNIFIED_MENU + getAdminMenu + filterMenuByRole (**domain IA 메타 부재**) |
| 3 | [web-neture/.../config/operatorCapabilities.ts](../../services/web-neture/src/config/operatorCapabilities.ts) | ENABLED_CAPABILITIES (8개) |
| 4 | [web-neture/.../components/NetureGlobalHeader.tsx](../../services/web-neture/src/components/NetureGlobalHeader.tsx) | header 브릿지 (profile dropdown / NotificationBell) |
| 5 | [packages/ui/.../operator-shell/OperatorShell.tsx](../../packages/ui/src/operator-shell/OperatorShell.tsx) | legacy flat sidebar + header + footer shell |
| 6 | `@o4o/operator-ux-core` DomainIASidebar / operatorDomainIA / OperatorAreaShell | 이행 대상 공통 컴포넌트 |
| 7 | web-neture AdminLayoutWrapper.tsx (참조) | OperatorShell 의 또 다른 소비자 (admin 영역) |

---

## 2. Neture 현재 operator wrapper 구조

[OperatorLayoutWrapper.tsx](../../services/web-neture/src/components/layouts/OperatorLayoutWrapper.tsx):

```tsx
const { user, logout } = useAuth();
const navigate = useNavigate();
const menuItems = filterMenuByRole(UNIFIED_MENU, false);   // ← isAdmin 하드코딩 false

return (
  <div className="min-h-screen flex flex-col">
    <NetureGlobalHeader />                                   {/* Header (별도) */}
    <OperatorShell
      serviceName="Neture"
      menuItems={menuItems}
      capabilities={ENABLED_CAPABILITIES}
      dashboardLink="/operator"
      user={user ? { name: user.name || '', email: user.email } : null}
      onLogout={() => { logout(); navigate('/'); }}
      renderHeader={() => null}                              {/* OperatorShell 자체 header 억제 */}
      sidebarTopOffset="top-20"
    >
      <Outlet />
    </OperatorShell>
  </div>
);
```

| 영역 | 현재 |
|------|------|
| Header | **NetureGlobalHeader** (OperatorShell 외부, 위에 별도 렌더). OperatorShell 내장 header 는 `renderHeader={() => null}` 로 억제 |
| Sidebar | **OperatorShell 의 flat STANDARD_GROUPS sidebar** (11-group 고정 순서, **domain 헤딩 없음**) |
| Outlet | OperatorShell children 으로 `<Outlet/>` |
| main container | OperatorShell 내부 `max-w-[1400px] ... flex gap-6` + `main flex-1 min-w-0` (3 서비스와 동일 spacing) |
| **Footer** | **OperatorShell 기본 footer 렌더** (`© 2026 Neture. 플랫폼 운영` + `메인으로`) ← OperatorAreaShell 에는 없음 |
| responsive | OperatorShell flat mobile 탭 (헤딩 없음) |
| active route | OperatorShell isItemActive (exact / signage startsWith / path+'/') |
| 외곽 div | `min-h-screen flex flex-col` (bg-gray-50 는 OperatorShell 내부에 존재) |

---

## 3. legacy OperatorShell 책임 분석

[OperatorShell.tsx](../../packages/ui/src/operator-shell/OperatorShell.tsx) props 와 Neture 사용 여부:

| prop | OperatorShell 책임 | Neture 사용 | 이행 시 |
|------|--------------------|:----------:|--------|
| `serviceName` | 내장 header 로고 + **footer 카피라이트** | footer 에서 사용 | footer 제거 시 불필요 |
| `menuItems` | flat sidebar 렌더 | ✅ | OperatorAreaShell/DomainIASidebar 동일 prop |
| `capabilities` | group capability gate | ✅ | 동일 |
| `user` | 내장 header 사용자 표시 | renderHeader=null → **미사용** | 불필요 |
| `onLogout` | 내장 header 로그아웃 | renderHeader=null → **미사용** | 불필요 (NetureGlobalHeader 가 logout 자체 처리) |
| `dashboardLink` | 내장 header 로고 링크 | renderHeader=null → **미사용** | 불필요 |
| `homeLink` | footer "메인으로" | footer default | footer 제거 시 불필요 |
| `renderHeader` | header override | `() => null` (억제) | OperatorAreaShell 은 header slot — 불필요 |
| `sidebarTopOffset` | sidebar sticky offset | `top-20` | OperatorAreaShell 동일 (default top-20) |
| `footer` | footer 영역 | 미지정 → **기본 footer 렌더** | OperatorAreaShell 미보유 — **제거 결정 필요** |
| `children` | main content | `<Outlet/>` | OperatorAreaShell children/Outlet 동일 |

핵심: **renderHeader=null 로 OperatorShell 의 header/user/onLogout/dashboardLink 가 전부 미사용** 상태. OperatorShell 이 실제로 기여하는 것은 (a) **flat sidebar** + (b) **container/main layout** + (c) **기본 footer** 3가지. (b)는 OperatorAreaShell 과 동일, (a)는 DomainIASidebar 로 대체(단 의미 변화), (c)는 미보유(제거 결정).

---

## 4. Neture operator menu 구조 분석

[operatorMenuGroups.ts](../../services/web-neture/src/config/operatorMenuGroups.ts) — `UNIFIED_MENU` (11 group key, OperatorGroupKey 사용):

| group | Neture 항목 | 성격 (Supplier/B2B 축) |
|-------|-------------|------------------------|
| dashboard | 대시보드, Action Queue | 운영 공통 |
| users | 회원 관리, 운영자 관리(admin), 회원 완전삭제(admin), 문의 메시지 | 커뮤니티/운영 |
| approvals | 가입 승인, **유통 참여형 펀딩(market-trial)**, 서비스 승인(admin), **공급자 활성화** | **공급/유통 승인** |
| products | 상품 관리, 카테고리/브랜드/마스터/카탈로그/매핑(대부분 admin) | **공급자 카탈로그** |
| stores | 매장 관리 | 매장 |
| orders | 주문 관리, **파트너 현황/정산/커미션(admin)** | **커머스·정산** |
| content | 홈페이지 CMS, 안내 문구, 커뮤니티 광고(admin) | 콘텐츠 |
| signage | 사이니지 | 콘텐츠 |
| forum | 포럼 신청/삭제 요청/분석 | 커뮤니티 |
| analytics | AI 리포트 ×9 (AI 카드/운영/품질/관리…) | **AI 운영** |
| system | 알림 설정, 역할 관리(admin), 이메일 설정(admin) | 운영 공통 |

- **menuItems shape = `Partial<Record<OperatorGroupKey, OperatorMenuItem[]>>`** — DomainIASidebar 입력과 **동일** ✅
- **lms / resources group 없음** (KPA 에는 있음). Neture 고유: market-trial(유통 펀딩) / 공급자 활성화 / 파트너·커미션 정산 / AI 9종.
- `getAdminMenu()` 가 **별도 admin sidebar** 제공 (operator 와 분리). admin 은 AdminLayoutWrapper 가 사용.
- **domain IA 메타데이터(DOMAIN_LABELS / GROUP_TO_DOMAIN / DOMAIN_GROUP_ORDER / DOMAIN_DISPLAY_ORDER / TOP_PINNED_GROUPS) 전무** — flat 사용이므로 애초에 없음.

---

## 5. DomainIASidebar 호환성

| 항목 | 호환 | 비고 |
|------|:----:|------|
| menuItems prop shape | ✅ | 동일 타입 |
| capabilities prop | ✅ | 동일 (ENABLED_CAPABILITIES) |
| active route 로직 | ✅ | OperatorShell 과 isItemActive 동일 |
| single/multi group 렌더 | ✅ | 동일 패턴 |
| **domain 그룹핑 메타(operatorDomainIA)** | ❌ | **static import — KPA 축 하드코딩**. Neture 에 다른 domain 집합 주입 불가 |
| TOP_PINNED dashboard | ⚠️ | KPA 는 dashboard 1-item top-pin. Neture dashboard 는 2-item (대시보드+Action Queue) — top-pin 시 collapsible 가능하나 KPA 와 시각 다름 |
| **GROUP_TO_DOMAIN 의미** | ❌ | 현 매핑은 approvals/products/orders/stores/signage → `store_hub`. Neture 에선 이들이 **공급/유통/커머스·정산** — "매장 HUB 운영" 헤딩이 의미 왜곡 |

→ 메커니즘은 호환되나 **domain IA 의미가 KPA 전용**. Neture 적용 = 오분류 or 별도 IA 필요.

---

## 6. OperatorAreaShell 호환성

| 항목 | 호환 | 비고 |
|------|:----:|------|
| header slot | ✅ | NetureGlobalHeader 를 `header={<NetureGlobalHeader/>}` 로 전달 (이미 OperatorShell 외부 렌더 중 — 동일 패턴) |
| menuItems / capabilities | ✅ | `filterMenuByRole(UNIFIED_MENU, false)` 그대로 |
| sidebarTopOffset | ✅ | default top-20 |
| children/Outlet | ✅ | OperatorAreaShell children 미지정 시 `<Outlet/>` |
| 외곽 div / container / main spacing | ✅ | OperatorAreaShell = `min-h-screen flex flex-col bg-gray-50` + `max-w-[1400px] flex gap-6` + `main flex-1 min-w-0` — Neture OperatorShell 과 동일 spacing |
| **footer** | ❌ | OperatorAreaShell 미보유. Neture 현재 OperatorShell 기본 footer 렌더 중 → **이행 시 footer 사라짐** (결정 필요: 제거 수용 vs OperatorAreaShell footer slot 추가) |

→ OperatorAreaShell 결합은 footer 1건 외 전부 호환. (footer 는 KPA/Glyco/KCos operator 영역에도 없음 → 제거가 cross-service 정합이긴 함.)

---

## 7. NetureGlobalHeader / profile dropdown / NotificationBell 영향

[NetureGlobalHeader.tsx](../../services/web-neture/src/components/NetureGlobalHeader.tsx) — 다른 3 서비스와 동일한 `GlobalHeader` 브릿지:

| 요소 | 내용 | 이행 영향 |
|------|------|:---------:|
| brand | 🌿 Neture / 공급자·파트너 협업 플랫폼 / #059669 | 변화 없음 |
| profile dropdown (userMenuItems) | 관리자 대시보드(/admin) · 운영 대시보드(/operator) · **공급자 대시보드(/supplier/dashboard)** · **파트너 대시보드(/partner/dashboard)** · 마이페이지 · 설정 | **변화 없음** (header 브릿지 미변경) |
| NotificationBell | `NOTIFICATION_SERVICE_KEY` + handleNotificationClick | **변화 없음** |
| logout | NetureGlobalHeader 자체 처리 (`logout(); navigate('/')`) | wrapper 의 onLogout 불필요해짐 |
| role 판정 | isAdmin/isOperator/isSupplier/isPartner | header 내부 — 변화 없음 |

→ **header slot 으로 그대로 전달, profile dropdown / NotificationBell 무변경 유지 가능** ✅. Neture 는 supplier/partner 항목이 추가로 있는 점만 KPA/Glyco/KCos 대비 다름(정당한 차이, slot 보존).

---

## 8. isAdmin 하드코딩 false 영향

- Neture wrapper: `filterMenuByRole(UNIFIED_MENU, false)` — **operator sidebar 에는 항상 operator-scope 메뉴만** (adminOnly 항목 제외).
- 이유: Neture 는 **admin/operator 레이아웃 분리** — admin 은 `AdminLayoutWrapper` + `getAdminMenu()` 별도 사용. operator route 는 operator 항목만 노출하는 의도적 설계 (다른 3 서비스는 operator sidebar 에 admin 항목을 inline 노출).
- **legacy OperatorShell 전용 값 아님** — `false` 는 `filterMenuByRole` 의 인자이고, OperatorShell/DomainIASidebar 와 무관. DomainIASidebar/OperatorAreaShell 도 **pre-filtered menuItems 를 받으므로 `filterMenuByRole(UNIFIED_MENU, false)` 그대로 전달하면 동일 동작** 보존.
- **제거 금지**: false → true 변경 시 operator sidebar 에 admin 항목 노출 = 메뉴 회귀 + admin/operator 분리 정책 위반. **이행 시 false 그대로 유지**.

---

## 9. Neture domain IA 설계 필요 여부

**YES — Neture 전용 domain IA 설계가 핵심 선행 작업.**

기존 KPA IA (커뮤니티 / 매장 HUB / 운영 공통) 를 Neture 에 그대로 쓰면:
- approvals(가입/유통펀딩/공급자활성화) + products(카탈로그) + orders(정산/커미션) + stores + signage → 전부 **"매장 HUB 운영"** 으로 묶임 → Neture(공급자·B2B 유통)에 **의미 왜곡** (Twin Axis 위반).

Neture 축에 맞는 domain 후보 (설계 결정 대상):

| 후보 domain | 포함 group | 비고 |
|-------------|-----------|------|
| 공급·유통 운영 | approvals(가입/유통펀딩/공급자활성화), products(상품/카탈로그) | Neture 핵심 축 |
| 커머스·정산 | orders(주문/파트너/정산/커미션), stores | partner/commission Neture 고유 |
| 커뮤니티·콘텐츠 | users, content, signage, forum | |
| 운영 공통 | dashboard(top-pin), analytics(AI), system | |

→ 이는 **정책 결정**(어떤 domain 으로 묶을지)이며, 본 IR 범위 외 **별도 결정**으로 분리. 결정 후 Neture `operatorMenuGroups.ts` 에 KPA 와 동형의 메타데이터(NETURE 전용 DOMAIN_LABELS/GROUP_TO_DOMAIN/DOMAIN_GROUP_ORDER) 추가 필요.

**연동 전제**: DomainIASidebar 가 현재 operatorDomainIA 를 static import 하므로, Neture 가 다른 IA 를 쓰려면 **DomainIASidebar 를 IA config 주입형으로 파라미터화**(optional prop `domainIA`, default = 현 KPA 모델)해야 한다. operator-ux-core(F1 Freeze) 의 **additive·backward-compatible 변경** — 기존 3 서비스는 default 로 무변화.

---

## 10. 이행 시 위험 요소

| 위험 | 수준 | 분석 / 완화 |
|------|:----:|------------|
| 메뉴 노출 변화 (flat → domain 헤딩) | **HIGH** | 항목 집합은 불변이나 **그룹 클러스터링/헤딩 도입 = 의도적 UX 변화**. 설계 승인 + smoke 필수 |
| supplier/product/order semantics 오분류 | **HIGH** | KPA IA 재사용 시 발생. Neture 전용 IA 설계로 회피 |
| DomainIASidebar 파라미터화 회귀 (3 서비스) | 중간 | optional prop + default = 현 모델 → 기존 3 서비스 무변화. 3 서비스 재빌드/smoke 로 검증 |
| footer 제거 | 중간 | © 2026 Neture footer 사라짐. cross-service 정합(다른 3개 없음)이나 시각 변화 — 결정 + 확인 |
| profile dropdown href 회귀 | 낮음 | NetureGlobalHeader 미변경 → 무영향 |
| active route 오판 | 낮음 | isItemActive 로직 동일 |
| NotificationBell serviceKey | 낮음 | header 내부 유지 → 무영향 |
| legacy OperatorShell 의존 누락 | 낮음 | OperatorShell 은 **Neture AdminLayoutWrapper + (glyco/kcos) DashboardLayout 등에서 계속 사용** → 이행해도 orphan 아님. import 제거는 Neture operator wrapper 1곳만 |
| 운영 smoke 범위 부족 | **HIGH** | smoke2.mjs 는 **glyco+kcos 만 커버 — Neture 미포함**. Neture 이행은 **신규 Neture operator smoke** 필요 |
| isAdmin false 변질 | 낮음 | false 그대로 유지 (§8) |

---

## 11. 운영 smoke 필요 범위

- **현 smoke2.mjs 는 Neture 미커버** (glycopharm.co.kr / k-cosmetics.site 만). Neture 이행 검증 불가.
- 이행 WO 는 **Neture operator 전용 smoke** 신규 필요:
  - origin: neture.co.kr (또는 운영 도메인)
  - `/operator` 진입 + sidebar 도메인 헤딩 노출
  - 공급/유통·커머스·정산 등 Neture 도메인 항목 노출 (가입 승인 / 공급자 활성화 / 상품 관리 / 주문 / 파트너 / AI 리포트 등)
  - profile dropdown: 관리자/운영/**공급자/파트너** 대시보드 href + 마이페이지/설정
  - active route / collapse / footer 유무
  - operator 계정: SSOT 의 Neture operator(`operator-neture@o4o.com` 또는 통합 운영자 `sohae2100@gmail.com`) — 단, smoke 단일계정 cross-origin 특성 확인 필요
- baseline: 이행 전 Neture flat sidebar 스냅샷을 **사전 캡처(out-neture-before)** 후 이행 후와 비교 (단, flat→domain 변화는 의도된 diff 이므로 항목 집합 동등성 위주 비교).

---

## 12. 최종 판정

### ⚠️ **B — menu/domain IA 정리 후 이행 가능**

| 기준 | 결과 |
|------|------|
| 메커니즘 호환 (shape/active/capability/header slot/notif) | ✅ |
| isAdmin false 보존 | ✅ |
| NetureGlobalHeader slot 결합 | ✅ |
| **Neture domain IA 메타데이터** | ❌ 부재 — 설계 필요 |
| **KPA IA 재사용 적합성** | ❌ Supplier/B2B 축 오분류 (Twin Axis 위반) |
| **DomainIASidebar IA 주입 파라미터화** | ❌ 현재 static — 선행 필요 |
| flat → domain UX 변화 | ⚠️ 의도적 변화 (설계 승인 + smoke) |
| footer 처리 | ⚠️ 결정 필요 |
| Neture smoke | ❌ 신규 필요 |

→ **즉시 이행 불가**. 기술 결합은 쉬우나 **(a) Neture domain IA 설계 결정 + (b) DomainIASidebar IA 파라미터화** 가 막는다. 이 둘을 먼저 처리하면 안전 이행 가능.

---

## 13. 후속 WO 후보

| 순서 | WO/결정 (가칭) | 범위 |
|:---:|----------------|------|
| 1 | **결정: Neture operator domain IA 설계** | Neture 축(공급·유통 / 커머스·정산 / 커뮤니티·콘텐츠 / 운영 공통 등) domain 집합 + group→domain 매핑 + 표시 순서 확정. (본 IR §9 후보 기반 정책 결정) |
| 2 | **WO-O4O-OPERATOR-UX-CORE-DOMAINIASIDEBAR-IA-CONFIG-PARAM-V1** | DomainIASidebar 를 optional `domainIA` config 주입형으로 파라미터화(default=현 KPA 모델). operator-ux-core Freeze additive 변경. 기존 3 서비스 무변화 검증 |
| 3 | **WO-O4O-NETURE-OPERATOR-MENU-DOMAIN-IA-METADATA-V1** | Neture `operatorMenuGroups.ts` 에 NETURE 전용 domain IA 메타 추가 (1번 결정 반영) |
| 4 | **WO-O4O-NETURE-OPERATOR-SIDEBAR-LAYOUT-MIGRATION-V1** | Neture wrapper: OperatorShell → OperatorAreaShell + DomainIASidebar(netureDomainIA). isAdmin=false 보존. footer 제거 결정 반영. NetureGlobalHeader slot |
| 5 | **CHECK-O4O-NETURE-OPERATOR-SIDEBAR-LAYOUT-MIGRATION-SMOKE-V1** | Neture 전용 운영 smoke (신규) — §11 범위 |

> 대안: 1+3 을 묶고, 2 를 1번째로 당겨도 됨. 단 **2(DomainIASidebar 파라미터화)가 4(이행)의 하드 전제**.

---

## 14. Current Structure vs O4O Philosophy Conflict Check

| 원칙 | 판정 |
|------|------|
| **Twin Axis (KPA Community + Neture Supplier/B2B canonical)** | ⚠️ **핵심** — KPA 3-domain IA 를 Neture 에 재사용하면 supplier/product/order 가 "매장 HUB"로 오분류 → **Twin Axis 위반**. Neture 전용 IA 설계가 철학 정합의 전제. (Neture 한쪽만 canonical 단축 표현 금지 원칙과도 일치) |
| O4O 공통 구조 원칙 (§13: forum/lms/signage 등 플랫폼 공통 구조 위 서비스별 데이터) | ✅ 정합 방향 — **메커니즘(DomainIASidebar/OperatorAreaShell)은 공통화, 정책(domain IA 내용)은 축별로 파라미터화**. 컴포넌트 공통 + IA 주입이 철학 정합 경로 |
| 사업 철학 (Operator = 운영 사업자, 동일 운영 UX 메커니즘) | ✅ 메커니즘 공통화는 정합. Neture 의 공급자·파트너 특화 메뉴는 정당한 축 차이 |
| Operator OS Freeze (F1, operator-ux-core) | ⚠️ DomainIASidebar 파라미터화는 Freeze 영역 변경이나 **additive·backward-compatible** (default=현 모델) → DomainIASidebar/OperatorAreaShell 추출과 동일 분류로 안전. 단 "신규 IA 정책 주입 능력 추가"이므로 WO 보고에 명시 필요 |
| Workspace UX 직교성 | ✅ sidebar IA 변경은 navigation shell 한정, workspace 진입/정책 무관 |
| Drift 방지 | ⚠️ KPA IA 강제 재사용이 곧 drift. Neture 전용 IA 로 회피 |

**결론**: 컴포넌트 공통화는 철학 정합이나, **KPA domain IA 를 Neture 에 그대로 이식하면 Twin Axis drift**. 따라서 "domain IA 를 축별 파라미터로 분리"가 철학상 올바른 이행 형태이며, 이것이 곧 판정 B(정리 후 이행)의 근거다.

---

## 15. Working tree 격리 / commit 정책

- 조사 시작 시점: 다른 세션 WIP 존재 — `M apps/api-server/src/routes/cosmetics/action-definitions.ts`, `?? docs/investigations/IR-O4O-GLYCOPHARM-EVENT-OFFER-APPROVAL-SCOPE-AUDIT-V1.md`. **둘 다 본 IR 무관 — 미접촉/미포함.**
- 본 IR 문서 1개만 생성. **read-only — 코드/Neture/공통 컴포넌트/menu/capability/route/header 미변경.**
- commit 시 본 IR 문서 1개만 path-restricted. `git add .` / `-am` 금지.

---

> **상태**: read-only 조사 완료. 판정 = **B (menu/domain IA 정리 후 이행 가능)**. 기술 결합은 trivial 하나 **Neture 전용 domain IA 설계 + DomainIASidebar IA 파라미터화**가 선행. 후속 5단계(설계 결정 → DomainIASidebar 파라미터화 → Neture IA 메타 → 이행 WO → Neture smoke). KPA IA 단순 재사용은 Twin Axis drift 이므로 금지.
