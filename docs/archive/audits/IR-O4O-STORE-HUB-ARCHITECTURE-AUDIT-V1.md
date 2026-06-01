# IR-O4O-STORE-HUB-ARCHITECTURE-AUDIT-V1

> **Investigation Report — O4O Platform Store Hub Architecture Comprehensive Audit**
> Date: 2026-03-09
> Status: Complete
> Scope: Store Hub structure, service navigation, product listings, account architecture, data sharing across GlycoPharm / Neture / K-Cosmetics / KPA

---

## Executive Summary

O4O Platform의 Store Hub 구조를 전수 조사한 결과, **구조 A: Platform Store Hub + Service Extension** 모델임을 확인했다.

### Architecture Verdict: **Platform Common Infrastructure**

```
Platform Store Hub (Core)
   ├── @o4o/store-ui-core       ← 공통 Dashboard UI Shell
   ├── @o4o/hub-core            ← 공통 Operator Control Tower (FROZEN F1)
   ├── @o4o/store-core          ← 공통 KPI Engine (Adapter Pattern)
   ├── @o4o/store-asset-policy-core  ← 공통 Asset Policy
   ├── @o4o/hub-exploration-core     ← 공통 Marketplace Layout
   │
   ├── GlycoPharm Extension     (8/8 menus, /store/hub)
   ├── K-Cosmetics Extension    (6/8 menus, /store)
   ├── KPA Society Extension    (Section-based menus, /store)
   └── GlucoseView Extension    (2/8 menus, /store)
```

| 판정 항목 | 결과 |
|-----------|------|
| Route 구조 | Platform Common (`/store` base, 서비스별 config) |
| API 구조 | Hybrid (공통 Store Hub API + 서비스별 확장 API) |
| DB 구조 | Platform Common + Schema Isolation (organizations 공통, cosmetics_* 격리) |
| 데이터 공유 | 공유 (organizations, channels, product_listings 공통 테이블) |
| UI Shell | 100% 공통 (`@o4o/store-ui-core`) |

---

## 1. Service Navigation Structure

### 1.1 Login Redirect per Service

| Service | Role | Default Landing | Store Entry |
|---------|------|----------------|-------------|
| **GlycoPharm** | pharmacy | `/care` (Care Dashboard) | `/store` → `/store/hub` |
| **GlycoPharm** | admin | `/admin` | `/store` |
| **K-Cosmetics** | operator | `/operator` | `/store` (StoreCockpitPage) |
| **KPA Society** | pharmacy | `/` → PharmacyGate 검사 | `/store` (approval 후) |
| **KPA Society** | admin | `/admin/dashboard` | `/store` |
| **Neture** | supplier | `/account/supplier` | N/A (supplier space) |
| **Neture** | partner | `/account/partner` | N/A (partner space) |
| **GlucoseView** | operator | `/operator` | `/store` (minimal) |

### 1.2 Service Switch UI

**결론: 서비스 간 이동 UI 미존재**

| 항목 | 상태 |
|------|------|
| Service Switch 메뉴 | **없음** — 각 서비스는 독립 도메인 |
| Cross-service 링크 | **없음** — Frontend에서 다른 서비스 링크 없음 |
| Handoff API | **부분 존재** — `/api/sso/check` endpoint |

### 1.3 Service Handoff Structure

**SSO Check Endpoint**: `GET /api/sso/check`

```json
{
  "authenticated": true,
  "user": { "id": "uuid", "email": "...", "roles": [...], "status": "active" },
  "sessionId": "session-uuid"
}
```

**Linked Accounts API**: `/api/linked-accounts`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/linked-accounts` | 연결된 계정 조회 |
| GET | `/sessions` | 활성 세션 조회 |
| POST | `/link-account` | 계정 연결 |
| DELETE | `/unlink-account` | 계정 해제 |

**Service Navigation Pattern (현재)**:
```
사용자 → GlycoPharm 로그인 → Store Hub 사용
      → K-Cosmetics 도메인 직접 방문 → 세션 공유 (Redis)
      → 별도 로그인 불필요 (같은 세션)
```

**구현 상태**: SSO check + Redis 세션 동기화는 존재하나, **UI 레벨 서비스 전환 메뉴는 미구현**

---

## 2. Store Hub Route Structure

### 2.1 Frontend Route Map

| Service | Store Base | Hub Route | Entry Guard |
|---------|-----------|-----------|-------------|
| **GlycoPharm** | `/store` | `/store/hub` (StoreOverviewPage) | SoftGuard (pharmacy role) |
| **K-Cosmetics** | `/store` | `/store` (StoreCockpitPage) | ProtectedRoute (operator role) |
| **KPA Society** | `/store` | `/store/dashboard` (StoreMarketingDashboardPage) | PharmacyGuard (approval check) |
| **GlucoseView** | `/store` | `/store` (StoreDashboardLayout) | ProtectedRoute (operator role) |
| **Neture** | `/store/:slug` | N/A (consumer storefront) | N/A |

### 2.2 GlycoPharm Store Routes (Full)

| Route | Page | Purpose |
|-------|------|---------|
| `/store` | StoreEntryPage | Store 진입 |
| `/store/hub` | StoreOverviewPage | Hub Dashboard (HubLayout) |
| `/store/identity` | StoreMainPage | Store 프로필 |
| `/store/products` | PharmacyProducts | 제품 관리 |
| `/store/channels` | StorePlaceholderPage | 채널 관리 |
| `/store/orders` | PharmacyOrders | 주문 관리 |
| `/store/content` | StoreAssetsPage | 콘텐츠 관리 |
| `/store/services` | PharmacyPatients | 서비스 관리 |
| `/store/settings` | PharmacySettings | 설정 |
| `/store/billing` | StoreBillingPage | 정산 |
| `/store/signage/*` | (8 sub-routes) | 디지털 사이니지 |

### 2.3 KPA Society Store Routes (Section-based)

| Section | Route | Page |
|---------|-------|------|
| Dashboard | `/store/dashboard` | StoreMarketingDashboardPage |
| Operation | `/store/operation/library` | StoreLibraryPage |
| Marketing | `/store/marketing/qr` | StoreQRPage |
| Marketing | `/store/marketing/pop` | StorePopPage |
| Marketing | `/store/marketing/signage` | StoreSignagePage |
| Commerce | `/store/commerce/products` | PharmacyB2BPage |
| Commerce | `/store/commerce/orders` | StoreOrdersPage |
| Analytics | `/store/analytics/marketing` | MarketingAnalyticsPage |

### 2.4 K-Cosmetics Store Routes

| Route | Page | Status |
|-------|------|--------|
| `/store` | StoreCockpitPage | Active |
| `/store/products` | StorePlaceholderPage | Placeholder |
| `/store/orders` | StorePlaceholderPage | Placeholder |
| `/store/billing` | StorePlaceholderPage | Placeholder |
| `/store/content` | StorePlaceholderPage | Placeholder |
| `/store/market-trial` | MarketTrialListPage | Active |
| `/store/settings` | StorePlaceholderPage | Placeholder |

### 2.5 Backend Store Hub API

**Mount Point**: `/api/v1/kpa/store-hub`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/overview` | Store Hub KPI Overview (products, contents, signage) |
| GET | `/channels` | Channel 관리 (product KPI 포함, cache: 30s) |
| POST | `/channels` | Channel 생성 (B2C/KIOSK/TABLET/SIGNAGE, auto-APPROVED) |
| GET | `/kpi-summary` | 주문 KPI (daily/weekly/monthly) |
| GET | `/live-signals` | 실시간 운영 신호 |
| GET | `/channel-products/:channelId` | Channel 제품 목록 |
| POST | `/channel-products/:channelId` | Channel에 제품 추가 |
| PATCH | `/channel-products/:channelId/reorder` | 제품 순서 변경 |

---

## 3. Store Hub Menu Structure

### 3.1 Platform Standard Menu (Store Core v1.0)

`@o4o/store-ui-core`에서 **8개 표준 메뉴** 정의:

| Key | Label | Icon |
|-----|-------|------|
| `dashboard` | 대시보드 | LayoutDashboard |
| `products` | 제품 | Package |
| `channels` | 채널 | Tv2 |
| `orders` | 주문 | ShoppingCart |
| `content` | 콘텐츠 | FileText |
| `signage` | 사이니지 | Monitor |
| `billing` | 정산 | CreditCard |
| `settings` | 설정 | Settings |

### 3.2 Service Menu Activation Matrix

| Menu | GlycoPharm | K-Cosmetics | KPA Society | GlucoseView |
|------|:----------:|:-----------:|:-----------:|:-----------:|
| dashboard | O | O | O (Section) | O |
| products | O | O | O (Commerce) | - |
| channels | O | - | - | - |
| orders | O | O | O (Commerce) | - |
| content | O | O | - | - |
| signage | O | - | O (Marketing) | - |
| billing | O | O | - | - |
| settings | O | O | - | O |

### 3.3 KPA Society 고유 메뉴 (Section-based)

```
Dashboard
  Operation
    - Library (라이브러리)
  Marketing
    - QR (QR 코드)
    - POP (매장 POP)
    - Signage (디지털 사이니지)
  Commerce
    - Products (제품)
    - Orders (주문)
  Analytics
    - Marketing (마케팅 분석)
```

### 3.4 공통 vs 서비스 전용 비교

| 구분 | 항목 |
|------|------|
| **공통 메뉴** | dashboard, products, orders, settings |
| **GlycoPharm 전용** | channels, services (환자 관리), signage (8 sub-routes) |
| **KPA 전용** | library, QR, POP, marketing analytics |
| **K-Cosmetics 전용** | market-trial |
| **GlucoseView** | minimal (dashboard + settings만) |

---

## 4. Product List Structure

### 4.1 Product Entity Architecture

```
ProductMaster (SSOT)                    ← Neture Core, barcode-keyed
    ↓
SupplierProductOffer                    ← 공급자 제공 조건
    ↓
ProductApproval (v2)                    ← 승인 워크플로우
    ↓
OrganizationProductListing              ← 매장별 제품 로스터 (service_key 분리)
    ↓
OrganizationProductChannel              ← 채널별 제품 매핑 (B2C, KIOSK, TABLET)
    ↓
Customer Visibility                     ← 4중 Gate 통과 시 노출
```

### 4.2 Data Source per Service

| Service | 제품 테이블 | Service Key | Schema |
|---------|-----------|-------------|--------|
| **KPA** | organization_product_listings | `kpa` | public |
| **GlycoPharm** | organization_product_listings + glycopharm_products | `glycopharm` | public + glycopharm |
| **K-Cosmetics** | cosmetics_products + cosmetics_store_listings | `cosmetics` | cosmetics (격리) |
| **Neture** | supplier_product_offers (공급자측) | N/A | public |

### 4.3 Product API Endpoints

| Service | Endpoint | Purpose |
|---------|----------|---------|
| KPA/GlycoPharm | `GET /api/v1/o4o-store/pharmacy-products/listings` | 매장 제품 로스터 (service_key 필터) |
| KPA/GlycoPharm | `GET /api/v1/o4o-store/pharmacy-products/catalog` | 제품 카탈로그 (승인 가능 제품) |
| GlycoPharm | `GET /api/v1/glycopharm/stores/:slug/products` | Public 스토어프론트 제품 |
| K-Cosmetics | `GET /api/v1/cosmetics/stores/:storeId/listings` | Cosmetics 매장 제품 |
| Platform | `GET /api/v1/stores/:slug/products` | Unified 공용 스토어프론트 |

### 4.4 Operator 추천 제품 구조

**핵심 질문**: 여러 서비스를 이용하는 매장 사업자의 Operator 추천 탭에 모든 서비스의 추천 제품이 나타나는가?

**Answer: 분리됨 (Backend) / 통합 가능 (B2C Storefront)**

| 구분 | 동작 |
|------|------|
| **Backend 관리** | `service_key`별 분리 — KPA 추천과 GlycoPharm 추천 별도 관리 |
| **B2C Storefront** | `service_key IN ('kpa', 'glycopharm')` — **통합 노출** |
| **추천 방식** | GlycoPharmFeaturedProduct (position-ordered curation) |
| **StoreLocalProduct** | `badgeType: 'recommend'` (매장 자체 추천) |

### 4.5 B2C Storefront Visibility Gate (4중 검증)

```sql
-- Visibility Path
1. organization_channels.status = 'APPROVED' AND channel_type = 'B2C'
2. organization_product_listings.is_active = true AND service_key = ANY(:serviceKeys)
3. organization_product_channels.is_active = true
4. supplier_product_offers.is_active = true AND neture_suppliers.status = 'ACTIVE'
```

### 4.6 Distribution Type별 승인 Flow

| Distribution Type | 승인 | Listing 생성 |
|------------------|------|-------------|
| **PUBLIC** | 불필요 | Supplier 활성화 시 자동 |
| **SERVICE** | Admin 승인 필요 | 승인 시 자동 (is_active=false) |
| **PRIVATE** | 수동 (allowedSellerIds) | 승인 시 자동 |

---

## 5. Store Owner Account Structure

### 5.1 Entity Relationship

```
User (Identity Only)
    ↓
RoleAssignment (RBAC SSOT)
    ↓ role: 'admin' | 'supplier' | 'seller' | 'partner'
    ↓ scopeType: 'global' | 'organization'
    ↓
OrganizationMember
    ↓ role: 'admin' | 'manager' | 'member' | 'moderator'
    ↓ isPrimary: boolean (max 1 per user)
    ↓
Organization (Hierarchical Tree)
    ↓ type: 'division' | 'branch'
    ↓ parentId → tree structure
    ↓
OrganizationServiceEnrollment (M:N)
    ↓ service_code: 'kpa' | 'glycopharm' | 'neture' | 'cosmetics'
    ↓ status: 'active'
    ↓
OrganizationChannel (Multi-channel)
    ↓ channel_type: 'B2C' | 'KIOSK' | 'TABLET' | 'SIGNAGE'
    ↓ status: 'APPROVED'
    ↓
OrganizationStore (storefront_config, template_profile)
```

### 5.2 핵심 질문 답변

| 질문 | 답변 |
|------|------|
| 한 사용자가 여러 매장을 가질 수 있는가? | **Yes** — OrganizationMember로 여러 Organization에 소속 가능 (isPrimary=1 제한) |
| 한 매장이 여러 서비스를 사용할 수 있는가? | **Yes** — OrganizationServiceEnrollment로 M:N 관계 |
| 서비스별 매장 분리 여부 | **Hybrid** — Organization은 공유, cosmetics_stores는 별도 |

### 5.3 Cross-Service Store Linking

**PhysicalStore** (business_number 기준 통합):

```
PhysicalStore (business_number UNIQUE)
    ↓
PhysicalStoreLink (serviceType + serviceStoreId)
    ├── serviceType='kpa',       serviceStoreId=Organization.id
    ├── serviceType='cosmetics', serviceStoreId=CosmeticsStore.id
    ├── serviceType='glycopharm', serviceStoreId=GlycopharmPharmacy.id
    └── serviceType='neture',    serviceStoreId=NeturePartner.id
```

### 5.4 Service-Specific Store Entities

| Service | Store Entity | Table | Isolation |
|---------|-------------|-------|-----------|
| **KPA** | Organization (확장) | `organizations` | 공통 테이블 |
| **GlycoPharm** | Organization (공유) | `organizations` | KPA와 공유 |
| **K-Cosmetics** | CosmeticsStore | `cosmetics_stores` | cosmetics schema 격리 |
| **Neture** | NeturePartner | `neture_partners` | neture schema 격리 |
| **GlucoseView** | GlucoseviewPharmacy | `glucoseview_pharmacies` | Legacy 별도 |

---

## 6. Data Sharing Structure

### 6.1 Platform Common Tables (공유)

| Table | Purpose | Service Key | Shared |
|-------|---------|------------|--------|
| `organizations` | 매장/조직 기본 정보 | N/A | KPA + GlycoPharm 공유 |
| `organization_members` | 매장 구성원 | N/A | 공유 |
| `organization_channels` | B2C/KIOSK/TABLET/SIGNAGE | N/A | 공유 |
| `organization_product_listings` | 매장 제품 로스터 | `service_key` 컬럼 | 서비스별 격리 |
| `organization_product_channels` | 채널별 제품 매핑 | N/A | 공유 |
| `organization_service_enrollments` | 서비스 등록 | `service_code` | M:N 매핑 |
| `product_masters` | 제품 SSOT | N/A | 전체 공유 |
| `supplier_product_offers` | 공급 조건 | N/A | 전체 공유 |
| `checkout_orders` | 통합 주문 | `orderType` | 전체 공유 |
| `physical_stores` | 사업자번호 기준 통합 | N/A | 전체 공유 |
| `physical_store_links` | 서비스별 매장 매핑 | `serviceType` | 서비스별 링크 |
| `store_local_products` | 매장 자체 제품 | `organizationId` | 조직 격리 |
| `store_qr_codes` | QR 코드 | `organizationId` | 조직 격리 |

### 6.2 Service-Isolated Tables (격리)

| Schema | Table | Purpose | Isolation Level |
|--------|-------|---------|----------------|
| cosmetics | `cosmetics_stores` | K-Cosmetics 매장 | Schema 격리 |
| cosmetics | `cosmetics_products` | K-Cosmetics 제품 | Schema 격리 |
| neture | `neture_partners` | Neture 파트너 | Schema 격리 |
| public | `glycopharm_products` | GlycoPharm 제품 | Table prefix 격리 |
| public | `glycopharm_featured_products` | GlycoPharm 추천 | Table prefix 격리 |

### 6.3 Data Sharing Diagram

```
              ┌─────────────────────────────────────┐
              │    Platform Common (public schema)    │
              │                                       │
              │  organizations ◄──── org_members       │
              │       │                                │
              │  org_service_enrollments (M:N)         │
              │       │                                │
              │  org_channels ◄── org_product_channels │
              │       │                                │
              │  org_product_listings (service_key)    │
              │       │                                │
              │  product_masters ◄── supplier_offers   │
              │       │                                │
              │  checkout_orders (unified)             │
              │       │                                │
              │  physical_stores ◄── physical_links    │
              └───────┬───────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   cosmetics.*   neture.*    glycopharm_*
   (Schema)      (Schema)    (Prefix)
```

### 6.4 Domain Primary Boundary 적용

| Domain | Primary Boundary | 테이블 |
|--------|:----------------:|--------|
| Store Ops | `organizationId` | store_local_products, store_qr_codes |
| Broadcast | `serviceKey` | cms_content_slots, signage_contents |
| Commerce | `storeId` | checkout_orders, ecommerce_order_items |
| Community | `organizationId` | forum_posts |

---

## 7. Store Hub Architecture Verdict

### 7.1 Final Determination

**Structure A: Platform Store Hub + Service Extension**

증거:

| 판정 기준 | 증거 | 결론 |
|-----------|------|------|
| **UI Shell** | 모든 서비스가 `@o4o/store-ui-core` `StoreDashboardLayout` 사용 | Platform Common |
| **Menu Config** | `storeMenuConfig.ts`에서 서비스별 활성화 메뉴만 다름 | Config-driven Extension |
| **Hub Control** | `@o4o/hub-core` `HubLayout`을 GlycoPharm + Neture 공유 | Platform Common (FROZEN) |
| **KPI Engine** | `@o4o/store-core` Adapter Pattern으로 서비스별 주입 | Platform Common |
| **Asset Policy** | `@o4o/store-asset-policy-core` 전체 공유 | Platform Common |
| **DB Organizations** | KPA + GlycoPharm `organizations` 테이블 공유 | Shared Foundation |
| **Product Listings** | `organization_product_listings.service_key`로 서비스 구분 | Shared Table + Service Key |
| **Checkout** | `checkout_orders` 단일 주문 테이블 | Platform Common |
| **Store Linking** | `physical_stores` + `physical_store_links` cross-service | Platform Bridge |

### 7.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  O4O Platform Store Hub                       │
│                                                               │
│  ┌─────────────┐ ┌──────────┐ ┌───────────┐ ┌─────────────┐ │
│  │store-ui-core│ │ hub-core │ │store-core │ │asset-policy │ │
│  │ (UI Shell)  │ │(FROZEN)  │ │(KPI Eng.) │ │   -core     │ │
│  └──────┬──────┘ └────┬─────┘ └─────┬─────┘ └──────┬──────┘ │
│         │             │             │               │        │
│  ┌──────┼─────────────┼─────────────┼───────────────┼──────┐ │
│  │      ▼             ▼             ▼               ▼      │ │
│  │   StoreDashboard  HubLayout  SummaryEngine  AssetPanel  │ │
│  │      Layout       + Signal   + Adapter      + Policy    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              Service Extensions                           │ │
│  │                                                           │ │
│  │  GlycoPharm    K-Cosmetics    KPA Society    GlucoseView │ │
│  │  ─────────     ───────────    ──────────     ─────────── │ │
│  │  8/8 menus     6/8 menus     Section-based   2/8 menus  │ │
│  │  Care hub      Cockpit       Marketing hub   Minimal    │ │
│  │  Signage 8x    Market trial  QR/POP/Library  Monitor    │ │
│  │  Patient mgmt  Member mgmt   Analytics       Settings   │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              Data Layer                                    │ │
│  │                                                           │ │
│  │  organizations (shared) ─── org_service_enrollments       │ │
│  │       │                                                   │ │
│  │  org_channels ─── org_product_listings (service_key)      │ │
│  │       │                                                   │ │
│  │  product_masters ─── supplier_product_offers              │ │
│  │       │                                                   │ │
│  │  checkout_orders (unified)                                │ │
│  │       │                                                   │ │
│  │  physical_stores ─── physical_store_links (cross-svc)     │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 Package Dependency Diagram

```
Services (web-glycopharm, web-k-cosmetics, web-kpa-society, web-glucoseview)
    │
    ├── @o4o/store-ui-core     (StoreDashboardLayout, StoreSidebar, StoreTopBar)
    ├── @o4o/hub-core          (HubLayout, HubCard, role-filter, signal-adapter)
    ├── @o4o/store-core        (StoreSummaryEngine, StoreInsightsEngine, StoreDataAdapter)
    ├── @o4o/store-asset-policy-core (StoreAssetsPanel, policyGate, snapshot types)
    └── @o4o/hub-exploration-core    (HubExplorationLayout, HeroCarousel, tabs)

    역방향 의존 금지 (Core → Extension → Feature → Service)
```

---

## 8. Risk Analysis

### RISK-1: Service Navigation 부재 (HIGH)

**현상**: 서비스 간 이동 UI가 없음
**영향**: 여러 서비스를 사용하는 매장 사업자가 서비스 전환 시 도메인을 직접 입력해야 함
**현재 상태**: SSO check endpoint + Redis 세션 동기화만 존재
**권장**: Store Hub Dashboard에 Service Switch Panel 추가 검토

### RISK-2: K-Cosmetics Store 격리 (MEDIUM)

**현상**: `cosmetics_stores`는 별도 schema, `organizations` 테이블 미사용
**영향**: KPA/GlycoPharm과 달리 Organization 기반 공통 기능 (channels, product_listings) 사용 불가
**현재 상태**: `physical_store_links`로 bridge만 존재
**권장**: K-Cosmetics의 Organization 통합 여부 검토 (또는 의도적 격리 유지 확인)

### RISK-3: Store Hub API가 KPA Route에 종속 (MEDIUM)

**현상**: Store Hub Controller가 `/api/v1/kpa/store-hub`에 mount됨
**영향**: "kpa" prefix가 platform-common 기능과 불일치
**현재 상태**: KPA routes가 O4O Store controllers의 mounting point 역할
**권장**: Store Hub API를 `/api/v1/store-hub`로 독립 검토

### RISK-4: GlucoseView Store 최소 구현 (LOW)

**현상**: GlucoseView는 store-ui-core를 사용하지만 2/8 메뉴만 활성화
**영향**: Store Hub 기능을 거의 사용하지 않음
**현재 상태**: dashboard + settings만 활성
**권장**: GlucoseView가 Store Hub를 실제로 필요로 하는지 검토

### RISK-5: Product Listing service_key 분리 (LOW)

**현상**: B2C Storefront에서 `service_key IN (...)` 으로 통합 노출
**영향**: 고객이 KPA 제품과 GlycoPharm 제품을 구분하지 못할 수 있음
**현재 상태**: 의도된 설계로 보임 (통합 스토어프론트)
**권장**: 서비스 출처 표시 여부 검토

### RISK-6: Neture가 Store Hub 외부에 존재 (INFO)

**현상**: Neture는 공급자/파트너 관리 서비스로 Store Hub 패턴을 사용하지 않음
**영향**: Neture는 `hub-core` HubLayout만 사용 (store-ui-core 미사용)
**현재 상태**: 의도된 설계 — Neture는 매장이 아닌 공급 플랫폼
**권장**: 현행 유지

---

## 9. Frozen Baselines Impact

| Baseline | Store Hub 영향 |
|----------|---------------|
| **F1: Operator OS** (2026-02-16) | `hub-core` 구조 동결 — HubLayout, HubCard, signal 패턴 변경 금지 |
| **F3: Store Layer** (2026-02-22) | `store-ui-core` → `store-asset-policy-core` → `hub-core` 의존 방향 동결 |
| **F4: Platform Content Policy** (2026-02-23) | Hub Exploration 콘텐츠 타입 동결 |
| **F5: Content Stable** (2026-02-23) | Hub 콘텐츠 API 계약 동결 |
| **F6: Boundary Policy** (2026-02-24) | Domain Boundary Matrix 동결 — Store Ops = organizationId |
| **F8: Distribution Engine** (2026-02-27) | Distribution Tier 3단계 + Checkout Guard 동결 |

---

## 10. File Manifest

### Platform Core Packages

| Package | Path | Purpose |
|---------|------|---------|
| `@o4o/store-ui-core` | `packages/store-ui-core/` | Store Dashboard UI Shell |
| `@o4o/hub-core` | `packages/hub-core/` | Operator Control Tower (FROZEN) |
| `@o4o/store-core` | `packages/store-core/` | KPI Engine (Adapter Pattern) |
| `@o4o/store-asset-policy-core` | `packages/store-asset-policy-core/` | Asset Snapshot Policy |
| `@o4o/hub-exploration-core` | `packages/hub-exploration-core/` | Marketplace Layout |

### Store Hub API

| File | Purpose |
|------|---------|
| `apps/api-server/src/routes/o4o-store/controllers/store-hub.controller.ts` | Store Hub KPI + Channel API |
| `apps/api-server/src/routes/o4o-store/controllers/store-channel-products.controller.ts` | Channel Execution Console |
| `apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts` | Product Listing Management |
| `apps/api-server/src/routes/platform/store-network.routes.ts` | Admin Store Network Dashboard |
| `apps/api-server/src/routes/platform/physical-store.routes.ts` | Cross-Service Store Linking |
| `apps/api-server/src/routes/platform/store-policy.routes.ts` | Store Policy + Payment Config |
| `apps/api-server/src/routes/platform/unified-store-public.routes.ts` | Public Storefront (4-Gate) |
| `apps/api-server/src/routes/platform/store-local-product.routes.ts` | Store Local Products |
| `apps/api-server/src/routes/platform/store-tablet.routes.ts` | Tablet Display |

### Service-Specific Store Routes

| Service | File | Purpose |
|---------|------|---------|
| GlycoPharm | `apps/api-server/src/routes/glycopharm/controllers/store.controller.ts` | Public Storefront |
| K-Cosmetics | `apps/api-server/src/routes/cosmetics/controllers/cosmetics-store.controller.ts` | Cosmetics Store Management |
| KPA | `apps/api-server/src/routes/kpa/kpa.routes.ts` | KPA Store Controllers Mount Point |

### Key Entities

| Entity | Table | Purpose |
|--------|-------|---------|
| Organization | `organizations` | Store Identity (KPA/GlycoPharm) |
| OrganizationStore | `organizations` (extended) | Storefront Config |
| OrganizationServiceEnrollment | `organization_service_enrollments` | Service M:N |
| OrganizationChannel | `organization_channels` | Sales Channels |
| OrganizationProductListing | `organization_product_listings` | Product Roster |
| OrganizationProductChannel | `organization_product_channels` | Channel Products |
| CosmeticsStore | `cosmetics_stores` | K-Cosmetics Store (isolated) |
| PhysicalStore | `physical_stores` | Cross-Service Bridge |
| PhysicalStoreLink | `physical_store_links` | Service-Store Mapping |
| ProductMaster | `product_masters` | Product SSOT |
| SupplierProductOffer | `supplier_product_offers` | Supply Conditions |
| StoreLocalProduct | `store_local_products` | Display-Only Products |
| StoreQrCode | `store_qr_codes` | QR Codes |
| CheckoutOrder | `checkout_orders` | Unified Orders |

### Frontend Store Pages

| Service | File | Page |
|---------|------|------|
| GlycoPharm | `services/web-glycopharm/src/App.tsx` | Store routes (lines 255-380) |
| K-Cosmetics | `services/web-k-cosmetics/src/App.tsx` | Store routes (lines 265-280) |
| KPA Society | `services/web-kpa-society/src/App.tsx` | Store routes (lines 380-480) |
| GlucoseView | `services/web-glucoseview/src/App.tsx` | Store routes |

---

*Investigation complete. 2026-03-09*
*Architecture Verdict: Platform Common Infrastructure with Service Extensions*
