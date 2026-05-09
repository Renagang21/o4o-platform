# IR-O4O-GLYCO-STORE-CANONICAL-GAP-AUDIT-V1

> GlycoPharm `/store` 영역이 KPA-Society Store canonical 구조와 어떻게 다른지 조사한 보고서.
> **수정 없음. 조사 전용.**

- 작성일: 2026-05-09
- 기준 브랜치: `main` (origin 동기화 완료)
- 대상 서비스
  - `services/web-glycopharm` (GlycoPharm)
  - `services/web-kpa-society` (KPA-Society — canonical reference)
  - `packages/store-ui-core` (공통 Store Layout/Menu)

---

## 0. 결론 요약

| 항목 | KPA-Society (canonical) | GlycoPharm (현재) | 상태 |
|------|--------------------------|-------------------|------|
| `/store` 진입 시 화면 | StoreHomePage (운영 홈, 사이드바 O) | StoreEntryPage (3-step 카드, 사이드바 X) | **불일치** |
| 사이드바 + 헤더 | KpaGlobalHeader + StoreDashboardLayout | (`/store` 인덱스에서) MainLayout만 | **불일치** |
| `/store` 라우트 정의 수 | 1개 단일 | 2개 중복 (MainLayout 내부 + 별도) | **불일치** |
| 사이드바 첫 메뉴 진입 | `/store` (subPath `''`) | `/store/hub` (subPath `/hub`) | **불일치** |
| `/store/hub` 라우트 존재 | 없음 (운영 홈은 `/store`) | StoreOverviewPage + HubLayout | **불일치** |
| 메뉴 섹션 구조 | 6섹션 (홈/상품/내 자료함/디지털 사이니지/매장 실행/분석/설정) | 5섹션 (운영/디지털 사이니지/마케팅·콘텐츠/경영/설정) | **불일치** |
| 공통 Layout 컴포넌트 | `@o4o/store-ui-core`의 `StoreDashboardLayout` | 동일 | 일치 |
| Capability 필터링 hook | `useStoreCapabilities` | 동일 (파일 내용까지 일치) | 일치 |
| GlobalHeader 브릿지 패턴 | KpaGlobalHeader → `@o4o/ui` GlobalHeader | GlycoGlobalHeader → 동일 | 일치 |
| Guard | `PharmacyGuard` (인증+승인 통합) | `SoftGuard` + `RoleGuard` (분리) | 부분 불일치 |

핵심: **GlycoPharm `/store`는 layout/header/sidebar가 적용되지 않은 진입 카드 페이지(StoreEntryPage)를 보여주고, 실제 운영 화면은 `/store/hub`에 분리되어 있음.** KPA는 `/store` 자체가 운영 홈.

---

## 1. 현재 GlycoPharm `/store` 진입 구조

### 1-1. 라우트 정의 (services/web-glycopharm/src/App.tsx)

**라우트 A — 인덱스 진입 (사이드바 없음)**
```tsx
// services/web-glycopharm/src/App.tsx:431-435 (MainLayout 자식)
<Route path="store" element={
  <SoftGuard feature="store" allowedRoles={[GLYCOPHARM_ROLES.PHARMACIST]}>
    <StoreEntryPage />
  </SoftGuard>
} />
```
- 부모 라우트: `<MainLayout />` (services/web-glycopharm/src/App.tsx:350)
- 페이지: `services/web-glycopharm/src/pages/store/StoreEntryPage.tsx`
- 형태: "약국 운영 시작하기" 헤더 + 3-step 카드 (상품/콘텐츠/매장에 적용) + Quick Access 버튼
- **layout/sidebar/storeHeader 없음**

**라우트 B — 운영 대시보드 (사이드바 있음)**
```tsx
// services/web-glycopharm/src/App.tsx:584-636
<Route
  path="store"
  element={
    <ProtectedRoute allowedRoles={[GLYCOPHARM_ROLES.PHARMACIST]}>
      <StoreLayoutWrapper />
    </ProtectedRoute>
  }
>
  <Route path="hub" element={<StoreOverviewPage />} />
  <Route path="identity" element={<StoreMainPage />} />
  <Route path="products" element={<Navigate to="/store/my-products" replace />} />
  <Route path="my-products" element={<RoleGuard ...><StoreProductsManagerPage /></RoleGuard>} />
  <Route path="local-products" element={<StoreLocalProductsPage />} />
  <Route path="tablet-displays" element={<StoreTabletDisplaysPage />} />
  <Route path="channels" element={<StoreChannelsPage />} />
  <Route path="orders" element={<PharmacyOrders />} />
  <Route path="content" element={<StoreAssetsPage />} />
  <Route path="services" element={<PharmacyPatients />} />
  <Route path="settings" element={<PharmacySettings />} />
  <Route path="apply" element={<StoreApplyPage />} />
  <Route path="billing" element={<StoreBillingPage />} />
  <Route path="signage" element={<Navigate to="playlist" replace />} />
  <Route path="signage/playlist" element={<StoreSignageMainPage />} />
  // ...signage/videos, schedules, player, play/:id, library, preview...
  <Route path="market-trial" element={<MarketTrialNetureRedirect />} />
  <Route path="market-trial/:id" element={<MarketTrialNetureRedirect />} />
  <Route path="b2b-order" element={<B2BOrderPage />} />
  <Route path="requests" element={<CustomerRequestsPage />} />
  <Route path="funnel" element={<FunnelPage />} />
  <Route path="management" element={<PharmacyManagement />} />
  <Route path="management/b2b" element={<PharmacyB2BProducts />} />
</Route>
```

### 1-2. StoreLayoutWrapper (services/web-glycopharm/src/App.tsx:296-315)
```tsx
function StoreLayoutWrapper() {
  const { user, logout } = useAuth();
  const enabledCaps = useStoreCapabilities();
  const resolvedConfig = resolveStoreMenu(GLYCOPHARM_STORE_CONFIG, enabledCaps);
  return (
    <div className="min-h-screen flex flex-col">
      <GlycoGlobalHeader />
      <StoreDashboardLayout
        config={resolvedConfig}
        userName={user?.name || user?.email || ''}
        homeLink="/"
        onLogout={() => { logout(); navigate('/'); }}
        banner={<RedirectNoticeBanner />}
        hideTopBar
      />
    </div>
  );
}
```

### 1-3. 진입 화면 정리

| 경로 | 렌더 결과 | 컴포넌트 |
|------|-----------|----------|
| `/store` | MainLayout 내부 카드형 진입 페이지 (사이드바 X) | `StoreEntryPage` |
| `/store/hub` | StoreDashboardLayout (좌측 사이드바 + GlycoGlobalHeader) → StoreOverviewPage(HubLayout) | `StoreLayoutWrapper` + `StoreOverviewPage` |
| `/store/<sub>` | StoreDashboardLayout 자식 outlet | 위 라우트 정의 참고 |
| `/store/:pharmacyId` | 별도 Consumer Storefront (`StoreLayout` 다른 컴포넌트) | `StoreLayout` (services/web-glycopharm/src/components/layouts/StoreLayout.tsx) |
| `/store/:pharmacyId/kiosk` | KioskLayout | (Consumer 모드) |
| `/store/:pharmacyId/tablet` | TabletLayout | (Consumer 모드) |

**라우트 충돌 주의**: `/store` 인덱스는 라우트 A에 매칭되며, `/store/hub` 등 자식 경로는 라우트 B에 매칭된다. 두 라우트는 같은 `path="store"`를 두 번 등록하고 있고 react-router v6의 매칭 규칙으로 동작한다 (인덱스 vs 자식 분리). **동일 경로 이중 등록 자체가 비표준 패턴이며 KPA에는 없음.**

---

## 2. KPA-Society canonical `/store` 구조 (참조)

### 2-1. 라우트 (services/web-kpa-society/src/App.tsx:826-894)
```tsx
<Route path="/store" element={<PharmacyGuard><KpaStoreLayoutWrapper /></PharmacyGuard>}>
  <Route index element={<StoreHomePage />} />
  <Route path="dashboard" element={<Navigate to="/store" replace />} />

  <Route path="info" element={<PharmacyInfoPage />} />

  {/* Marketing */}
  <Route path="marketing/qr" element={<StoreQRPage />} />
  <Route path="marketing/pop" element={<StorePopPage />} />
  <Route path="marketing/signage" element={<Navigate to="playlist" replace />} />
  <Route path="marketing/signage/playlist" element={<StoreSignagePage />} />
  <Route path="marketing/signage/videos" element={<StoreSignagePage />} />
  <Route path="marketing/signage/schedules" element={<StoreSignagePage />} />
  <Route path="marketing/signage/player" element={<SignagePlayerSelectPage />} />
  <Route path="marketing/signage/play/:playlistId" element={<SignagePlaybackPage />} />

  {/* Commerce */}
  <Route path="commerce/products" element={<PharmacyB2BPage />} />
  <Route path="commerce/products/b2c" element={<PharmacySellPage />} />
  <Route path="my-products" element={<PharmacyOwnerOnlyGuard><StoreProductsManagerPage /></PharmacyOwnerOnlyGuard>} />
  <Route path="commerce/products/suppliers" element={<SupplierListPage />} />
  <Route path="commerce/products/:productId/marketing" element={<ProductMarketingPage />} />
  <Route path="commerce/products/:productId/pop" element={<ProductPopBuilderPage />} />
  <Route path="library/contents" element={<StoreLibraryContentsPage />} />
  <Route path="library/resources" element={<StoreLibraryResourcesPage />} />
  <Route path="marketing/product-descriptions" element={<StoreProductDescriptionsPage />} />
  <Route path="commerce/local-products" element={<StoreLocalProductsPage />} />
  <Route path="commerce/tablet-displays" element={<StoreTabletDisplaysPage />} />
  <Route path="commerce/order-worktable" element={<StoreOrderWorktablePage />} />
  <Route path="commerce/orders" element={<StoreOrdersPage />} />

  {/* Analytics */}
  <Route path="analytics/marketing" element={<MarketingAnalyticsPage />} />

  {/* Legacy redirects ...생략 */}
  <Route path="requests" element={<TabletRequestsPage />} />
  <Route path="channels" element={<StoreChannelsPage />} />
  <Route path="content" element={<StoreAssetsPage />} />
  <Route path="content/blog" element={<PharmacyBlogPage />} />
  <Route path="billing" element={<StoreBillingPage />} />
  <Route path="settings" element={<PharmacyStorePage />} />
  <Route path="settings/template" element={<PharmacyTemplatePage />} />
</Route>
```

### 2-2. KpaStoreLayoutWrapper (services/web-kpa-society/src/App.tsx:368-399)
- `KpaGlobalHeader` (브릿지) + `StoreDashboardLayout` (`@o4o/store-ui-core`)
- pharmacy 이름 fetch → `orgName` prop 으로 전달 (사이드바 상단에 표시)
- `hideTopBar` 옵션 활성

### 2-3. 메뉴 구성 (`KPA_SOCIETY_STORE_CONFIG`, packages/store-ui-core/src/config/storeMenuConfig.ts:192-241)
- 6 섹션:
  - `(레이블 없음)` → `홈` (subPath `''`)
  - `상품` → 공급 상품 / 내 매장 상품(통합) / 내 매장 상품 / 주문 내역
  - `내 자료함` → 콘텐츠 / 자료
  - `디지털 사이니지` → 플레이리스트 / 동영상 / 스케줄 / 재생
  - `매장 실행` → 채널 관리 / 태블릿 진열 / POP / QR 코드 / 블로그 / 상품 상세설명 / 상담 요청
  - `분석` → 마케팅 분석
  - `설정` → 약국 정보 / 매장 설정

핵심: **첫 항목 subPath = `''` → 사이드바의 "홈" 클릭 = `/store` 인덱스 = StoreHomePage.**

---

## 3. KPA canonical과 다른 점 (GAP 매트릭스)

### 3-1. 구조적 GAP (Layout / Routing)

| # | 항목 | KPA | GlycoPharm | 영향 |
|---|------|-----|------------|------|
| G1 | `/store` 진입 시 layout | StoreDashboardLayout (사이드바 O) | MainLayout (사이드바 X) | UX 단절 |
| G2 | `/store` 인덱스 페이지 | `<StoreHomePage>` (KPI/실행흐름/분석/콘텐츠) | `<StoreEntryPage>` (단순 카드 진입) | 운영 홈 미부재 |
| G3 | `path="store"` 라우트 정의 | 1개 (PharmacyGuard 보호) | 2개 중복 (MainLayout 내부 + Protected) | 라우트 비표준 |
| G4 | "운영 대시보드" 경로 | `/store` (인덱스) | `/store/hub` (자식) | 1-tier 깊어짐 |
| G5 | 운영 대시보드 페이지 구현 | StoreHomePage (직접 렌더) | StoreOverviewPage → 내부에서 `HubLayout` (`@o4o/hub-core`) 한 번 더 감쌈 | 시각적 차이 |
| G6 | Guard | `<PharmacyGuard>` 통합 (인증+약국 승인) | `<SoftGuard>` (인덱스) + `<ProtectedRoute>` (자식) 분리 | Guard 정책 불일치 |
| G7 | 사이드바 dashboard subPath | `''` (= `/store`) | `/hub` (= `/store/hub`) | 사이드바 첫 메뉴가 `/store` 가 아님 |
| G8 | `/pharmacy` 진입 | `/pharmacy/dashboard` → `/store` 등 다수 redirect | `/pharmacy` → `/store/hub` redirect (App.tsx:347) | redirect 목적지 분리 |

### 3-2. 메뉴 구성 GAP (storeMenuConfig.ts)

KPA에는 있고 GlycoPharm에는 **없는** 메뉴 / 그룹:

| 메뉴 | KPA subPath | GlycoPharm 상태 |
|------|--------------|------------------|
| `홈` (subPath `''`) | `/store` | (메뉴 항목 자체 없음. dashboard가 `/hub`) |
| `내 자료함` 그룹 (콘텐츠 / 자료) | `/library/contents`, `/library/resources` | 그룹·라우트 모두 없음 |
| `POP` | `/marketing/pop` | 메뉴·라우트 모두 없음 (KPA 고유 신규 기능) |
| `QR 코드` | `/marketing/qr` | 메뉴·라우트 모두 없음 |
| `블로그` | `/content/blog` | 메뉴·라우트 없음 |
| `상품 상세설명` | `/marketing/product-descriptions` | 없음 |
| `마케팅 분석` | `/analytics/marketing` | 없음 |
| `약국 정보` | `/info` | 없음 (`identity`/settings 하위에 분산) |
| `상담 요청` | `/requests` | `requests` 라우트는 존재 (`CustomerRequestsPage`) — 메뉴 라벨/그룹만 다름 |
| `채널 관리` | `/channels` (매장 실행 그룹) | `/channels` (마케팅·콘텐츠 그룹) |
| `태블릿 진열` | `/commerce/tablet-displays` (매장 실행 그룹) | `/tablet-displays` (운영 그룹) |

GlycoPharm에는 있고 KPA에는 **없는** 메뉴:

| 메뉴 | GlycoPharm subPath | 비고 |
|------|---------------------|------|
| `B2B 주문` | `/b2b-order` | 운영 그룹. GlycoPharm 도메인 특수 (B2BOrderPage) |
| `유통 참여형 펀딩` | `/market-trial` | 마케팅·콘텐츠 그룹. Neture 로 redirect |
| `전환 퍼널` | `/funnel` | 마케팅·콘텐츠 그룹. WO-O4O-FUNNEL-VISUALIZATION-PHASE3A-CP1 |
| `약국 경영` | `/management` | 경영 그룹. PharmacyManagement |
| `콘텐츠 가져오기` | `/content` | 마케팅·콘텐츠 그룹. KPA의 library 구조와 의도 다름 |
| `상품 관리` (구) | `/products` (→ /my-products redirect) | KPA는 "공급 상품"으로 라벨 분리 |

섹션 라벨 차이:
- KPA: `(홈)` / `상품` / `내 자료함` / `디지털 사이니지` / `매장 실행` / `분석` / `설정`
- GlycoPharm: `(홈없음)` / `운영` / `디지털 사이니지` / `마케팅·콘텐츠` / `경영` / `설정`

### 3-3. 페이지 GAP (canonical 대비 GlycoPharm 미보유)

| KPA 페이지 | 경로 | GlycoPharm 동등물 |
|------------|------|--------------------|
| `StoreHomePage` (운영 홈) | `/store` | (없음) `/store/hub`의 `StoreOverviewPage`는 다른 디자인 |
| `PharmacyInfoPage` | `/store/info` | (없음) — `StoreMainPage` (=identity) 와 `PharmacySettings` 가 일부 흡수 |
| `StorePopPage`, `ProductPopBuilderPage` | `/store/marketing/pop`, `/store/commerce/products/:id/pop` | 없음 |
| `StoreQRPage` | `/store/marketing/qr` | 없음 |
| `PharmacyBlogPage` | `/store/content/blog` | 없음 |
| `StoreLibraryContentsPage`, `StoreLibraryResourcesPage` | `/store/library/...` | 없음 (글리코는 `/store/content` = StoreAssetsPage 단일) |
| `StoreProductDescriptionsPage` | `/store/marketing/product-descriptions` | 없음 |
| `MarketingAnalyticsPage` | `/store/analytics/marketing` | 없음 |
| `ProductMarketingPage` | `/store/commerce/products/:productId/marketing` | 없음 |

### 3-4. URL 패턴 GAP

| 의도 | KPA | GlycoPharm |
|------|-----|-------------|
| 상품 관리 | `/store/commerce/products` | `/store/products` (→ `/store/my-products` redirect) |
| 내 매장 상품 | `/store/my-products` 또는 `/store/commerce/local-products` | `/store/my-products` 또는 `/store/local-products` |
| 사이니지 플레이리스트 | `/store/marketing/signage/playlist` | `/store/signage/playlist` |
| 채널 관리 | `/store/channels` (사이드바 노출) | `/store/channels` (사이드바 노출) — 라우트 일치 |
| 정산 | `/store/billing` | `/store/billing` — 일치 |
| 설정 | `/store/settings` | `/store/settings` — 일치 |
| 사이니지 그룹 prefix | `/store/marketing/signage/*` (마케팅 하위) | `/store/signage/*` (top-level) |

핵심 차이: KPA는 `commerce / marketing / library / analytics / content` 의미 그룹 prefix를 채택. GlycoPharm은 평탄(flat) 구조 + 일부 의미 그룹 혼재.

---

## 4. 예전 약국/케어 중심 표현 / GlycoPharm 독자 구현

### 4-1. 직접 가시 영역 (`/store` 인덱스)

- `services/web-glycopharm/src/pages/store/StoreEntryPage.tsx` — "약국 운영 시작하기" 헤더 + 3-step 카드 (상품 선택 / 콘텐츠 만들기 / 매장에 적용)
- KPA에는 동일 의도가 `StoreHomePage` 하단 "실행 흐름" 섹션 (3-step) 으로 흡수됨 → **GlycoPharm StoreEntryPage 는 KPA 흡수 후 사라질 수 있는 layer**
- "약국 운영 시작하기" 카피 → KPA는 "내 약국 홈" 표현 사용

### 4-2. 메뉴 라벨 / 그룹

- "약국 경영" (`management`) — 약국 도메인 특수
- "약국 경영 / 정산·인보이스" — 정산이 경영 그룹 안. KPA는 (현재) 정산 메뉴 자체가 사이드바 미노출 (라우트만 유지)
- "콘텐츠 가져오기" — KPA는 "내 자료함 / 콘텐츠 / 자료"로 분리·정렬됨
- "유통 참여형 펀딩" (`market-trial`) — Neture 로 redirect만 하는 항목이 KPA Store 사이드바에는 없음
- "전환 퍼널" (`funnel`) — KPA Store 사이드바에 없음

### 4-3. 라우트/컴포넌트

- `/store/identity` → `StoreMainPage` (services/web-glycopharm/src/pages/store-management/StoreMainPage.tsx) — KPA에는 동등 라우트 없음 (KPA는 `/store/info` 신설)
- `/store/services` → `PharmacyPatients` — 구 환자 관리 잔재. KPA에는 patient 표현 제거됨
- `/store/management/*` (`PharmacyManagement`, `PharmacyB2BProducts`) — KPA 미존재
- `/store/funnel` → `FunnelPage` — KPA 미존재
- `/store/b2b-order` → `B2BOrderPage` — KPA는 `/store/commerce/products` + `/store-hub/b2b` 분리
- `StoreOverviewPage` 내부 `HubLayout` 사용 — KPA `StoreHomePage` 는 평면 컴포지션

### 4-4. 라우트 네이밍 잔재

- `services/web-glycopharm/src/pages/store-management/` 디렉터리 — `pages/pharmacy/` 에서 이동된 흔적 (App.tsx:54-55 코멘트). 일부는 여전히 `Pharmacy*` 컴포넌트명 (PharmacyOrders, PharmacyPatients, PharmacySettings, PharmacyManagement, PharmacyB2BProducts)
- Consumer Storefront 측 컴포넌트도 `StoreLayout` (사이드바 없는 storefront layout) 이라는 동명 컴포넌트가 layouts/ 에 별도 존재 — KPA에는 storefront 레이아웃이 별도 존재하지만 `StoreLayout` 명칭 충돌 없음. **이름 충돌 / 혼동 위험.**

---

## 5. 그대로 이식 가능한 부분 vs 별도 판단 필요한 부분

### 5-1. 그대로 이식 가능 (KPA 패턴 직접 적용)

| 항목 | 적용 방식 |
|------|-----------|
| `/store` 인덱스를 `StoreLayoutWrapper` 보호로 통합 | App.tsx 라우트 A 제거. 라우트 B의 `<Route index>` 추가 |
| 사이드바 dashboard subPath = `''` | `GLYCOPHARM_STORE_CONFIG.menuSections[0].items[0].subPath` 를 `/hub` → `''` 로 변경 |
| 운영 홈 컴포넌트 → `/store` 인덱스로 이동 | `StoreOverviewPage` 를 `/store` 인덱스에 직접 연결 (또는 `StoreHomePage` 패턴 도입) |
| `/store/hub` 백워드 호환 | `<Route path="hub" element={<Navigate to="/store" replace />} />` 단일 redirect 로 축소 |
| `KpaStoreLayoutWrapper` 의 orgName 패턴 | `StoreLayoutWrapper` 에 약국명 fetch 추가 (선택) |
| `PharmacyGuard` 동등 Guard | KPA `PharmacyGuard` 의 인증+승인 로직을 GlycoPharm 컨텍스트로 포팅 (또는 기존 `RoleGuard`+승인 체크 조합) |
| `StoreEntryPage` 카드 → 운영 홈에 흡수 | StoreHomePage 패턴 그대로 — 3-step 카드를 운영 홈 하단 섹션으로 통합 |

### 5-2. 별도 판단 필요 (GlycoPharm 도메인 특수)

| 항목 | 이유 / 판단 포인트 |
|------|---------------------|
| `/store/management`, `/store/management/b2b` (PharmacyManagement, PharmacyB2BProducts) | KPA 미존재. 의약품 도매·B2B 가격 운영 등 GlycoPharm 고유. 유지/이동/제거 별도 결정 |
| `/store/b2b-order` (B2BOrderPage) | GlycoPharm 측 B2B 주문 워크플로우. KPA는 `/store-hub/b2b` 로 분리 — GlycoPharm이 같은 경로로 갈지 정책 결정 필요 |
| `/store/funnel` (FunnelPage) | Funnel Phase 3-A. KPA 미존재. 분석 그룹 신설 / 또는 기존 위치 유지 |
| `/store/market-trial/*` (Neture redirect) | KPA에는 사이드바 항목으로 없음 — 글리코 사이드바에서도 제거 가능한지 검토 |
| `/store/services` (PharmacyPatients) | "환자 관리" 잔재. WO-O4O-GLYCOPHARM-PATIENT-SURFACE-REMOVAL-V1 흔적이 일부 남음 (App.tsx 코멘트와 모순). 제거/유지 별도 결정 |
| `/store/identity` (StoreMainPage) | KPA의 `/store/info` 와 의도 유사하나 컨텐츠 다름. 하나로 통합할지 별도 검토 |
| GlycoPharm 콘텐츠 그룹 (`/store/content` = StoreAssetsPage) vs KPA `/store/library/contents` + `/store/library/resources` | KPA는 contents/resources 분리. GlycoPharm은 통합 단일 페이지. 통합 vs 분리 정책 결정 |
| 사이니지 prefix (`/store/signage/*` vs `/store/marketing/signage/*`) | KPA 패턴 따라가면 마케팅 하위로 재배치 — 모든 외부 링크 영향 큼 |
| KPA 신규 메뉴 (POP, QR, 블로그, 상품 상세설명, 마케팅 분석, 약국 정보) | GlycoPharm 전반적으로 미구현. WO 단계별 도입 또는 단계 보류 결정 필요 |
| `StoreOverviewPage` 의 HubLayout 의존 (`@o4o/hub-core`) | KPA StoreHomePage 는 HubLayout 미사용. 동등 디자인을 위해 HubLayout 제거가 필요한지 검토 |

---

## 6. 다음 WO에서 수정해야 할 파일 목록

> **이 IR은 수정하지 않음.** 후속 WO 작성 시 다음 파일이 영향 범위에 포함된다.

### 6-1. 라우팅 / 진입 단일화 (가장 먼저)

- `services/web-glycopharm/src/App.tsx`
  - 라우트 A 제거 (line 431-435)
  - 라우트 B에 `<Route index element={...} />` 추가
  - `/store/hub` → `/store` redirect 또는 hub 라우트 유지 결정
  - `/pharmacy → /store/hub` redirect (line 347) 를 `/store` 로 변경
  - `/pharmacist → /store/hub` redirect (line 456-457) 를 `/store` 로 변경
- `services/web-glycopharm/src/pages/store/StoreEntryPage.tsx` — 흡수 대상. 삭제 또는 운영 홈 안의 한 섹션으로 이전
- `services/web-glycopharm/src/pages/store/StoreOverviewPage.tsx` — `/store` 인덱스 페이지로 이동. HubLayout 의존 제거 검토

### 6-2. 메뉴 구성

- `packages/store-ui-core/src/config/storeMenuConfig.ts`
  - `GLYCOPHARM_STORE_CONFIG.menuSections[0].items[0].subPath`: `/hub` → `''`
  - `dashboard` 키 → `home` 으로 정렬 (KPA와 키 통일은 필수 아님 — 라벨/subPath 정렬이 본질)
  - 섹션 라벨 KPA 패턴(`상품 / 매장 실행 / 분석 / 설정`)으로 정렬할지 결정
  - GlycoPharm 고유 메뉴 (b2b-order, market-trial, funnel, management) 위치 재정렬

### 6-3. Layout / Header

- `services/web-glycopharm/src/App.tsx` 내 `StoreLayoutWrapper` (line 296-315)
  - 약국명 fetch 추가 (선택)
  - 인덱스 라우트 자식으로 운영 홈 연결

### 6-4. Guard

- `services/web-glycopharm/src/components/auth/RoleGuard.tsx` — 또는 신규 `PharmacyGuard.tsx` 추가 검토 (KPA `services/web-kpa-society/src/components/auth/PharmacyGuard.tsx` 참고)
- `services/web-glycopharm/src/App.tsx` 내 `SoftGuard` 사용 — `/store` 인덱스에서 제거 후 단일 Guard 로 통합

### 6-5. 페이지 (단계별 도입 — 별도 WO)

- (선택) GlycoPharm용 `StoreHomePage` 신규 작성 (`services/web-glycopharm/src/pages/store/`)
- (선택) `PharmacyInfoPage` 동등 페이지
- (선택) POP / QR / 블로그 / 상품 상세설명 등 KPA canonical 페이지 단계별 이식

---

## 7. 위험 요소 / 확인 필요한 사항

### 7-1. 라우트 충돌 / 백워드 호환

- `path="store"` 이중 등록을 단일화하면 `/store` 인덱스가 다르게 매칭된다. **외부에서 `/store` 를 직접 링크하는 위치 (메뉴/네비게이션/외부 도메인) 영향 점검 필요.**
- `/store/hub` 백워드 호환: GlycoPharm 코드 다수 위치에서 `/store/hub` 를 직접 사용 중 (StoreEntryPage, /pharmacy/*, /pharmacist/* redirect, navigation config 등). 일괄 교체 또는 redirect 유지 결정 필요. (사용처는 별도 grep 필요)
- 라우트 B의 자식 `<Route path="hub" element={<StoreOverviewPage />} />` 에 외부 링크 다수 — 한 번에 제거 시 dead link 발생.

### 7-2. 도메인 특수 메뉴/라우트

- `market-trial`, `funnel`, `management/*`, `b2b-order` 는 KPA에 없는 GlycoPharm 고유 기능. 단순 흡수 시 기능 손실. **사용자 의사 결정 필요**: 사이드바에 유지 / 다른 그룹으로 이동 / 메뉴 숨김(라우트 유지) / 제거.
- `services` (PharmacyPatients) 는 patient 표면이 사실상 제거된 상태에서 잔재. App.tsx:52-53 코멘트("Patient/pharmacist pages removed")와 모순. 라우트 자체 제거 가능성 점검 필요.
- `identity` (StoreMainPage) vs KPA `info` (PharmacyInfoPage) — 두 페이지 의도/필드가 다른지 별도 비교 필요 (이 IR은 라우트 매칭만 다룸).

### 7-3. Guard / 약국 승인

- KPA `PharmacyGuard` 는 인증 + pharmacy 승인 (서비스 가입 + 약국 등록) 까지 검사. GlycoPharm 의 `RoleGuard` + `SoftGuard` 조합은 약국 승인 게이트가 분산되어 있다. 단순히 `PharmacyGuard` 흡수 시 GlycoPharm 의 승인 모델과 호환성 확인 필요.

### 7-4. capability 필터링

- `useStoreCapabilities` 는 두 서비스가 동일한 hook (파일 내용 동일). 그러나 GlycoPharm 의 capability 키 전체 집합과 KPA 키 집합이 다를 수 있음. `GLYCOPHARM_STORE_CONFIG` 의 capability/key 매핑 (`packages/store-ui-core/src/config/menuCapabilityMap.ts`) 영향 점검 필요 (이 IR에서 미조사).

### 7-5. Layout 컴포넌트 이름 충돌

- `services/web-glycopharm/src/components/layouts/StoreLayout.tsx` 는 Consumer Storefront 용 별도 레이아웃. `StoreLayoutWrapper` (App.tsx 내부) 와 명칭이 비슷해 혼동. 리네이밍 검토.

### 7-6. StoreOverviewPage 의 `@o4o/hub-core` 의존

- `StoreOverviewPage` 는 HubLayout (`@o4o/hub-core`) + `HubSectionDefinition` 사용. 이를 `/store` 인덱스로 이동시 KPA StoreHomePage 와 시각적 균질성 확보를 위해 HubLayout 제거 또는 KPA용 컴포지션으로 재작성 필요. **시각적 차이 발생 가능.**

### 7-7. 기타 사용처 영향 (별도 grep 필요 — 본 IR 미커버)

- `services/web-glycopharm/src/config/navigation.ts` (GLYCO_PUBLIC_NAV / GLYCO_CONTEXTUAL_NAV)
- 외부에서 `/store` 또는 `/store/hub` 를 가리키는 링크 (GlobalHeader 메뉴, ServiceSwitcher, MainLayout 등)
- 운영 가이드 / Help 컨텐츠 내 URL
- 외부 마케팅 자료 / 메일 / 리워드 URL

---

## 8. 부록 — 핵심 파일 인벤토리

### GlycoPharm (조사 대상)
- App.tsx → [services/web-glycopharm/src/App.tsx](../../services/web-glycopharm/src/App.tsx)
  - StoreLayoutWrapper: line 296-315
  - 라우트 A (`/store` index, MainLayout 자식): line 431-435
  - 라우트 B (`/store/*`, ProtectedRoute): line 584-636
- StoreEntryPage → [services/web-glycopharm/src/pages/store/StoreEntryPage.tsx](../../services/web-glycopharm/src/pages/store/StoreEntryPage.tsx)
- StoreOverviewPage → [services/web-glycopharm/src/pages/store/StoreOverviewPage.tsx](../../services/web-glycopharm/src/pages/store/StoreOverviewPage.tsx)
- StoreChannelsPage → [services/web-glycopharm/src/pages/store/StoreChannelsPage.tsx](../../services/web-glycopharm/src/pages/store/StoreChannelsPage.tsx)
- StoreLayout (Consumer Storefront — 별도) → [services/web-glycopharm/src/components/layouts/StoreLayout.tsx](../../services/web-glycopharm/src/components/layouts/StoreLayout.tsx)
- GlycoGlobalHeader → [services/web-glycopharm/src/components/GlycoGlobalHeader.tsx](../../services/web-glycopharm/src/components/GlycoGlobalHeader.tsx)
- useStoreCapabilities → [services/web-glycopharm/src/hooks/useStoreCapabilities.ts](../../services/web-glycopharm/src/hooks/useStoreCapabilities.ts)
- RoleGuard → [services/web-glycopharm/src/components/auth/RoleGuard.tsx](../../services/web-glycopharm/src/components/auth/RoleGuard.tsx)

### KPA-Society (canonical 참조)
- App.tsx → [services/web-kpa-society/src/App.tsx](../../services/web-kpa-society/src/App.tsx)
  - KpaStoreLayoutWrapper: line 368-399
  - `/store` 단일 라우트 + 자식: line 826-894
- StoreHomePage → [services/web-kpa-society/src/pages/pharmacy/StoreHomePage.tsx](../../services/web-kpa-society/src/pages/pharmacy/StoreHomePage.tsx)
- KpaGlobalHeader → [services/web-kpa-society/src/components/KpaGlobalHeader.tsx](../../services/web-kpa-society/src/components/KpaGlobalHeader.tsx)
- PharmacyGuard → [services/web-kpa-society/src/components/auth/PharmacyGuard.tsx](../../services/web-kpa-society/src/components/auth/PharmacyGuard.tsx)
- useStoreCapabilities → [services/web-kpa-society/src/hooks/useStoreCapabilities.ts](../../services/web-kpa-society/src/hooks/useStoreCapabilities.ts)

### 공통 (`@o4o/store-ui-core`)
- storeMenuConfig.ts → [packages/store-ui-core/src/config/storeMenuConfig.ts](../../packages/store-ui-core/src/config/storeMenuConfig.ts)
  - GLYCOPHARM_STORE_CONFIG: line 110-167
  - KPA_SOCIETY_STORE_CONFIG: line 192-241
- StoreDashboardLayout → [packages/store-ui-core/src/layout/StoreDashboardLayout.tsx](../../packages/store-ui-core/src/layout/StoreDashboardLayout.tsx)
- StoreSidebar / StoreTopBar → [packages/store-ui-core/src/components/](../../packages/store-ui-core/src/components/)

### 정책 / Canonical 문서
- [docs/architecture/STORE-LAYER-ARCHITECTURE.md](../architecture/STORE-LAYER-ARCHITECTURE.md)
- [docs/architecture/STORE-PRODUCTS-CANONICAL-V1.md](../architecture/STORE-PRODUCTS-CANONICAL-V1.md)
- [docs/baseline/STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1.md](../baseline/STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1.md)

---

*수정 없음 — 본 IR은 GAP 정리 전용. 다음 단계는 후속 WO 에서 부분별 도입.*
