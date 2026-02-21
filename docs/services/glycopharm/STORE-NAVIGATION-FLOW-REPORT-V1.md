# STORE-NAVIGATION-FLOW-REPORT-V1

> **Work Order**: WO-STORE-NAVIGATION-FLOW-AUDIT-V1
> **Date**: 2026-02-20
> **Scope**: `/store` 진입 → 내부 이동 → 복귀 흐름 현상 기록
> **방침**: 현 상태 기록만 수행. 수정/제안 없음.

---

## 1. Entry → Hub/Management 클릭 흐름

### 1-A. StoreEntryPage 카드 구현

| 항목 | 값 |
|------|------|
| 컴포넌트 | `StoreEntryPage.tsx` |
| 렌더링 경로 | `/store` (exact) |
| 레이아웃 | `MainLayout` (Header + max-w-7xl) |
| 보호 | `ProtectedRoute allowedRoles={['pharmacy']}` |

**카드 목록:**

| 카드 | 링크 대상 | 아이콘 |
|------|-----------|--------|
| 약국 허브 | `/store/hub` | BarChart3 |
| 내 약국 관리 | `/store/management` | Settings |

### 1-B. 클릭 동작

| 항목 | 현재 상태 |
|------|-----------|
| 링크 방식 | `<NavLink to={card.link}>` |
| replace 사용 | No → history stack에 `/store` 보존 |
| onClick 핸들러 | 없음 (NavLink 기본 동작) |
| 브라우저 뒤로가기 | `/store/hub` → `/store` 복귀 가능 |

### 1-C. 라우트 매칭 (React Router v6)

```
App.tsx 내 두 개의 /store 라우트:

1) MainLayout 내부 leaf route:
   <Route path="store" element={<ProtectedRoute><StoreEntryPage /></ProtectedRoute>} />

2) StoreLayoutWrapper 부모 route:
   <Route path="store" element={<ProtectedRoute><StoreLayoutWrapper /></ProtectedRoute>}>
     <Route path="hub" element={<StoreOverviewPage />} />
     <Route path="identity" element={<StoreMainPage />} />
     ...
   </Route>
```

- `/store` exact → (1) leaf route 우선 → MainLayout + StoreEntryPage
- `/store/hub` → (2) parent route 매칭 → StoreLayoutWrapper + StoreOverviewPage
- `/store/management` → (2) parent route 매칭 → 해당 child route 필요 (현재 미존재, 아래 §5 참조)

---

## 2. 내부 Navigation (Store Dashboard 내)

### 2-A. StoreDashboardLayout 사이드바

| 항목 | 값 |
|------|------|
| 소스 | `packages/operator-core/src/store/StoreDashboardLayout.tsx` |
| 설정 | `GLYCOPHARM_STORE_CONFIG` (storeMenuConfig.ts) |
| basePath | `/store` |
| 활성 메뉴 | overview, identity, products, orders, content, display, services, settings |

**사이드바 메뉴 → 실제 경로 매핑:**

| 메뉴 키 | 라벨 | subPath | 최종 경로 | end prop |
|---------|------|---------|-----------|----------|
| overview | 대시보드 | `''` | `/store` | `true` |
| identity | 매장 정보 | `/identity` | `/store/identity` | `false` |
| products | 상품 관리 | `/products` | `/store/products` | `false` |
| orders | 주문 관리 | `/orders` | `/store/orders` | `false` |
| content | 콘텐츠/사이니지 | `/content` | `/store/content` | `false` |
| display | 디스플레이 | `/display` | `/store/display` | `false` |
| services | 서비스 관리 | `/services` | `/store/services` | `false` |
| settings | 설정 | `/settings` | `/store/settings` | `false` |

### 2-B. 사이드바 "대시보드" 클릭 시 흐름

```
사이드바 "대시보드" 클릭
→ NavLink to="/store" (end=true)
→ React Router: /store exact → MainLayout leaf route 우선
→ StoreEntryPage 렌더 (MainLayout)
→ StoreDashboardLayout 사라짐 (레이아웃 전환)
```

**결과**: 사이드바 "대시보드" 클릭 시 Store Dashboard에서 빠져나와 StoreEntryPage(MainLayout)로 이동.

---

## 3. Return Paths (복귀 경로)

### 3-A. StoreDashboardLayout 헤더

| 요소 | 링크 대상 | 동작 |
|------|-----------|------|
| 로고 (Store 아이콘 + "GlycoPharm") | `homeLink` = `/` | GlycoPharm 메인 홈으로 이동 |
| "홈" 버튼 (Home 아이콘) | `homeLink` = `/` | GlycoPharm 메인 홈으로 이동 |
| 로그아웃 | `onLogout` 콜백 | 로그아웃 + `/` 이동 |

### 3-B. StoreEntryPage 복귀 경로

| 출발점 | 복귀 방법 | 대상 |
|--------|-----------|------|
| `/store/hub` → `/store` | 사이드바 "대시보드" 클릭 | StoreEntryPage (레이아웃 전환 발생) |
| `/store/hub` → `/store` | 브라우저 뒤로가기 | StoreEntryPage (history에 보존) |
| `/store/hub` → `/` | 헤더 로고/홈 클릭 | GlycoPharm 메인 (StoreEntry 건너뜀) |
| `/store` → `/` | Header "Home" 메뉴 | GlycoPharm 메인 |

### 3-C. "약국 매장 허브로 돌아가기" 명시적 링크

**없음.** StoreDashboardLayout 내에 StoreEntryPage(`/store`)로 돌아가는 명시적 버튼/링크 없음.
복귀 방법은 사이드바 "대시보드"(→ `/store`) 또는 브라우저 뒤로가기만 존재.

---

## 4. Header Active Menu 로직

### 4-A. 메인 Header (MainLayout)

```typescript
// Header.tsx appMenuItems
{ path: '/store', label: '약국 매장 허브', icon: Store, end: false, requiresAuth: true }
```

| 항목 | 값 |
|------|------|
| NavLink `end` | `false` |
| `/store` 방문 시 | Active ✅ |
| `/store/hub` 방문 시 | Active 해당 (prefix match) — **단, Header 미노출** |

### 4-B. Header 가시성

| 경로 | 레이아웃 | Header 노출 |
|------|----------|-------------|
| `/store` (exact) | MainLayout | ✅ 노출 → "약국 매장 허브" active |
| `/store/hub` | StoreDashboardLayout | ❌ 미노출 (자체 teal 헤더 사용) |
| `/store/products` | StoreDashboardLayout | ❌ 미노출 |

**결론**: Header의 `/store` active 로직은 StoreEntryPage(`/store` exact)에서만 실질적으로 보임. Store 내부 페이지에서는 StoreDashboardLayout의 자체 헤더가 대체.

---

## 5. Layout 전환 (MainLayout ↔ StoreDashboardLayout)

### 5-A. 전환 지점

```
StoreEntryPage (/store)          →  StoreOverviewPage (/store/hub)
├─ MainLayout                         ├─ StoreDashboardLayout
├─ Header (primary gradient)           ├─ 자체 헤더 (teal, h-14, "내 매장")
├─ max-w-7xl center                    ├─ Sidebar (w-64, 9메뉴)
└─ No sidebar                         └─ lg:ml-64 content area
```

### 5-B. 시각적 차이

| 요소 | MainLayout (StoreEntryPage) | StoreDashboardLayout (Store 내부) |
|------|---------------------------|----------------------------------|
| 헤더 색상 | 흰색/primary gradient | 흰색 + teal 뱃지 |
| 헤더 높이 | h-16 | h-14 |
| 사이드바 | 없음 | w-64 (좌측 고정) |
| 콘텐츠 폭 | max-w-4xl center | lg:ml-64 전체 폭 |
| 네비게이션 | 상단 4-메뉴 | 좌측 사이드바 8-메뉴 |

---

## 6. 직접 URL 접근

| URL | 인증 없음 | 인증 있음 (pharmacy) |
|-----|-----------|---------------------|
| `/store` | 로그인 리다이렉트 | StoreEntryPage 정상 |
| `/store/hub` | 로그인 리다이렉트 | StoreOverviewPage 정상 |
| `/store/products` | 로그인 리다이렉트 | PharmacyProducts 정상 |
| `/store/management` | 로그인 리다이렉트 | **빈 페이지** (child route 미존재) |

---

## 7. UX 이슈 현황 (Yes/No)

| # | 이슈 | 존재 여부 |
|---|------|-----------|
| 1 | 사이드바 "대시보드" 클릭 시 StoreEntry로 빠져나옴 (레이아웃 전환) | **Yes** |
| 2 | `/store/management` child route 미존재 (StoreEntry 카드 링크 깨짐) | **Yes** |
| 3 | Store 내부에서 StoreEntryPage로 돌아가는 명시적 링크 없음 | **Yes** |
| 4 | MainLayout → StoreDashboardLayout 전환 시 시각적 단절 | **Yes** |
| 5 | Header "약국 매장 허브" active 상태가 Store 내부 페이지에서 무의미 (Header 미노출) | **Yes** |
| 6 | 브라우저 뒤로가기로 `/store` 복귀 가능 | **Yes** (정상) |
| 7 | 직접 URL `/store/hub` 접근 시 인증 처리 정상 | **Yes** (정상) |

---

## 8. 파일 참조

| 파일 | 역할 |
|------|------|
| `services/web-glycopharm/src/App.tsx:296-302` | `/store` leaf route (MainLayout) |
| `services/web-glycopharm/src/App.tsx:450-469` | `/store/*` parent route (StoreLayoutWrapper) |
| `services/web-glycopharm/src/pages/store/StoreEntryPage.tsx` | Entry 포털 (2카드) |
| `services/web-glycopharm/src/components/common/Header.tsx:27` | "약국 매장 허브" 메뉴 정의 |
| `packages/operator-core/src/store/StoreDashboardLayout.tsx:160-185` | 사이드바 NavLink 렌더링 |
| `packages/operator-core/src/store/storeMenuConfig.ts:35` | overview subPath='' → `/store` |
| `packages/operator-core/src/store/storeMenuConfig.ts:59-67` | GLYCOPHARM_STORE_CONFIG |

---

*End of Report*
