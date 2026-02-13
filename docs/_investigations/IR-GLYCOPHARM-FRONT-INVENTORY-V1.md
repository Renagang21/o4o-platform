# IR-GLYCOPHARM-FRONT-INVENTORY-V1

## web-glycopharm Frontend Structure Inventory

> **Step 2-1**: Frontend Structure Mapping — GlycoPharm
> **Date**: 2026-02-13
> **Type**: Investigation Report (Read-Only)

---

## 1. Executive Summary

**web-glycopharm은 100% API-연결 프론트엔드이다.**

- Mock 데이터 사용: **없음**
- Dead 페이지: **없음**
- E-commerce 잔재: **해당 없음** (활성 기능)
- 전체 ~60+ 페이지, 모두 실제 API 호출

**결론**: Care 플랫폼으로의 전환 시 Commerce UI 제거/분리 판단이 필요하나,
현재 모든 기능은 **정상 작동 중**.

---

## 2. Route Inventory

### 2-A. Public Routes (MainLayout)

| Route | Page | API Calls | Mock | Status |
|-------|------|-----------|------|--------|
| `/` | RoleBasedHome | - | - | 🟢 Live (role redirect) |
| `/login` | LoginPage | auth API | No | 🟢 Live |
| `/service-login` | ServiceLoginPage | auth API | No | 🟢 Live |
| `/register` | RegisterPage | auth API | No | 🟢 Live |
| `/role-select` | RoleSelectPage | - | No | 🟢 Live |
| `/contact` | ContactPage | - | No | 🟢 Live |
| `/partners` | PartnerInfoPage | - | No | 🟢 Live |
| `/partners/apply` | PartnerApplyPage | glycopharm API | No | 🟢 Live |
| `/apply` | PharmacyApplyPage | glycopharm API | No | 🟢 Live |
| `/apply/my-applications` | MyApplicationsPage | glycopharm API | No | 🟢 Live |
| `/forum/*` | ForumHubPage, ForumPage, etc. | forum API | No | 🟢 Live |
| `/forum-ext/*` | ForumListPage, ForumFeedPage | forum API | No | 🟢 Live |
| `/education` | EducationPage | - | No | 🟢 Live |
| `/test-center` | TestCenterPage | - | No | 🟢 Live |
| `/test-guide/*` | Test guide pages | - | No | 🟢 Live |
| `/signage` | ContentLibraryPage | signage API | No | 🟢 Live |
| `/b2b/supply` | SupplyPage | b2b API | No | 🟢 Live |
| `/qr/:pharmacyId` | QrLandingPage | event API | No | 🟢 Live |

### 2-B. Pharmacy Dashboard (role: pharmacy)

| Route | Page | API Calls | Mock | Status |
|-------|------|-----------|------|--------|
| `/pharmacy` | PharmacyDashboard | cockpit API (5 endpoints) | No | 🟢 Live |
| `/pharmacy/store-main` | StoreMainPage | cockpit API | No | 🟢 Live |
| `/pharmacy/products` | PharmacyProducts | pharmacy/products API | No | 🟢 Live |
| `/pharmacy/orders` | PharmacyOrders | pharmacy/orders API | No | 🟢 Live |
| `/pharmacy/patients` | PharmacyPatients | pharmacy/customers API | No | 🟢 Live |
| `/pharmacy/settings` | PharmacySettings | pharmacy API | No | 🟢 Live |
| `/pharmacy/management` | PharmacyManagement | pharmacy API | No | 🟢 Live |
| `/pharmacy/management/b2b` | PharmacyB2BProducts | b2b API | No | 🟢 Live |
| `/pharmacy/smart-display/*` | Smart Display (Legacy) | display API | No | 🟢 Live |
| `/pharmacy/signage/*` | Signage Extension (New) | signage API | No | 🟢 Live |
| `/pharmacy/market-trial` | MarketTrialListPage | trial API | No | 🟢 Live |
| `/pharmacy/b2b-order` | B2BOrderPage | b2b API | No | 🟢 Live |
| `/pharmacy/store-apply` | StoreApplyPage | application API | No | 🟢 Live |
| `/pharmacy/requests` | CustomerRequestsPage | requests API | No | 🟢 Live |
| `/pharmacy/funnel` | FunnelPage | funnel API | No | 🟢 Live |

### 2-C. Operator Dashboard (role: operator)

| Route | Page | API Calls | Mock | Status |
|-------|------|-----------|------|--------|
| `/operator` | GlycoPharmOperatorDashboard | operator/dashboard API | No | 🟢 Live |
| `/operator/pharmacies` | PharmaciesPage | admin/pharmacies API | No | 🟢 Live |
| `/operator/applications` | ApplicationsPage | applications/admin API | No | 🟢 Live |
| `/operator/products` | ProductsPage | admin/products API | No | 🟢 Live |
| `/operator/orders` | OrdersPage | operator/orders API | No | 🟢 Live |
| `/operator/inventory` | InventoryPage | inventory API | No | 🟢 Live |
| `/operator/settlements` | SettlementsPage | settlements API | No | 🟢 Live |
| `/operator/analytics` | AnalyticsPage | analytics API | No | 🟢 Live |
| `/operator/reports` | ReportsPage | reports API (Phase 3-B) | No | 🟢 Live |
| `/operator/billing-preview` | BillingPreviewPage | billing/preview API (Phase 3-C) | No | 🟢 Live |
| `/operator/invoices` | InvoicesPage | invoices API (Phase 3-D) | No | 🟢 Live |
| `/operator/marketing` | MarketingPage | marketing API | No | 🟢 Live |
| `/operator/forum-*` | Forum management pages | forum admin API | No | 🟢 Live |
| `/operator/store-*` | Store approvals/template | store admin API | No | 🟢 Live |
| `/operator/users` | UsersPage | users API | No | 🟢 Live |
| `/operator/support` | SupportPage | support API | No | 🟢 Live |
| `/operator/settings` | SettingsPage | settings API | No | 🟢 Live |
| `/operator/ai-report` | AiReportPage | ai-report API | No | 🟢 Live |

### 2-D. Consumer Store (public)

| Route | Page | API Calls | Mock | Status |
|-------|------|-----------|------|--------|
| `/store/:pharmacyId` | StoreFront | storeApi.getStoreBySlug() | No | 🟢 Live |
| `/store/:pharmacyId/products` | StoreProducts | storeApi.getStoreProducts() | No | 🟢 Live |
| `/store/:pharmacyId/products/:id` | StoreProductDetail | storeApi.getProductDetail() | No | 🟢 Live |
| `/store/:pharmacyId/cart` | StoreCart | storeApi.getCart() | No | 🟢 Live |
| `/store/:pharmacyId/kiosk/*` | (same as store, KioskLayout) | same | No | 🟢 Live |
| `/store/:pharmacyId/tablet/*` | (same as store, TabletLayout) | same | No | 🟢 Live |

### 2-E. Partner Dashboard (role: partner)

| Route | Page | API Calls | Mock | Status |
|-------|------|-----------|------|--------|
| `/partner` | PartnerIndex | partner API | No | 🟢 Live |
| `/partner/overview` | PartnerOverviewPage | partner/overview API | No | 🟢 Live |
| `/partner/targets` | PartnerTargetsPage | partner/targets API | No | 🟢 Live |
| `/partner/content` | PartnerContentPage | partner/content API | No | 🟢 Live |
| `/partner/events` | PartnerEventsPage | partner/events API | No | 🟢 Live |
| `/partner/status` | PartnerStatusPage | partner/status API | No | 🟢 Live |
| `/partner/signage/*` | Signage Extension | signage API | No | 🟢 Live |

### 2-F. Service User Dashboard

| Route | Page | API Calls | Mock | Status |
|-------|------|-----------|------|--------|
| `/service` | ServiceDashboardPage | service API | No | 🟢 Live |

---

## 3. Commerce Residue Check

### Active E-Commerce Features (NOT Residue)

| Feature | Location | Status |
|---------|----------|--------|
| Product Catalog | `/store/:id/products` | 🟢 Active |
| Product Detail + Pricing | `/store/:id/products/:id` | 🟢 Active |
| Shopping Cart | `/store/:id/cart` | 🟢 Active |
| Order Management (Pharmacy) | `/pharmacy/orders` | 🟢 Active |
| Order Management (Operator) | `/operator/orders` | 🟢 Active |
| Inventory Management | `/operator/inventory` | 🟢 Active |
| Settlement Processing | `/operator/settlements` | 🟢 Active |
| Billing Reports | `/operator/reports` | 🟢 Active |
| Invoice Finalization | `/operator/invoices` | 🟢 Active |

**판정**: 이것들은 "잔재"가 아니라 **GlycoPharm의 핵심 비즈니스 기능**이다.
GlycoPharm은 원래 약국 B2C/B2B 커머스 플랫폼으로 설계되었고, 이 기능들은 모두 작동 중.

### Commerce → Care 전환 시 영향 평가

| 영역 | 현재 | Care 전환 시 |
|------|------|-------------|
| Consumer Store (`/store/*`) | B2C 제품 판매 | REMOVE 후보 (약국 매장은 care 범위 밖) |
| Pharmacy Products | 제품 관리 CRUD | REFACTOR → 환자 케어 제품만 |
| Orders/Inventory | 주문/재고 관리 | KEEP (시약/란셋 발주 용도 유지) |
| Billing/Invoice | 상담 청구 | KEEP (care 핵심) |
| B2B | 도매 주문 | KEEP (시약 공급망) |

---

## 4. Critical Risk Check

### Mock 데이터 사용 페이지

**없음.** web-glycopharm에는 Mock 데이터 페이지가 존재하지 않는다.

### API 미연결 페이지

**없음.** 모든 페이지가 실제 API와 연결되어 있다.

### Raw SQL 의존 API 연결 화면

| Page | API | Raw SQL 의존 | Risk |
|------|-----|-------------|------|
| FunnelPage | `/funnel/consultation` | ReportService 내부 집계 쿼리 | LOW (production 검증됨) |
| BillingPreviewPage | `/billing/preview/consultation` | 동일 | LOW |
| StoreMainPage | cockpit APIs | StoreSummaryEngine (store-core) | LOW |

---

## 5. API Client Architecture

### API 클라이언트 구조

| Client | Base URL | Auth | Endpoints |
|--------|----------|------|-----------|
| `storeApi` | `api.neture.co.kr` | Bearer token | `/api/v1/glycopharm/stores/*` |
| `pharmacyApi` | `api.neture.co.kr` | Bearer token | `/api/v1/glycopharm/pharmacy/*` |
| `glycopharmApi` | `api.neture.co.kr` | Bearer token | `/api/v1/glycopharm/operator/*`, `/admin/*` |

**인증**: Bearer Token (localStorage) + Cookie fallback (`credentials: 'include'`)

---

## 6. Summary

| Metric | Count |
|--------|-------|
| Total Routes | ~60+ |
| 🟢 Live (API 연결) | ~60+ |
| 🟡 Partial | 0 |
| 🔴 Mock | 0 |
| ⚪ Dead | 0 |
| Commerce 페이지 | ~15 (활성 기능) |
| Mock 데이터 사용 | 0건 |

### 핵심 판정

1. **GlycoPharm은 Care 플랫폼으로 유지 가능한가?**
   → **YES, 하지만 Commerce 레이어 분리가 필요**. 현재 Commerce와 Care(상담/청구/펀넬)가 혼재.

2. **삭제해야 할 화면은?**
   → Consumer Store(`/store/*`)가 Care 범위 밖. 단 현재 운영 중이므로 즉시 삭제 불가.

3. **단순 연결만 하면 살릴 수 있는 화면은?**
   → 해당 없음. 모든 화면이 이미 연결되어 있음.

---

*Investigation Report - Read-Only, No Code Changes*
*Version: 1.0*
*Status: Complete*
