# IR-O4O-STORE-APP-CORE-EXTENSION-ARCHITECTURE-AUDIT-V1

> **Investigation Report — Store App Core + Extension 아키텍처 현황 감사**
> Date: 2026-03-11
> Status: READ-ONLY Investigation (코드 변경 없음)

---

## 목차

1. [Store Core 구성 요소](#1-store-core-구성-요소)
2. [Store HUB 구조](#2-store-hub-구조)
3. [Store Product System](#3-store-product-system)
4. [Store Channel System](#4-store-channel-system)
5. [Store Extensions](#5-store-extensions)
6. [Local Product System](#6-local-product-system)
7. [AI Content System](#7-ai-content-system)
8. [Store App Architecture](#8-store-app-architecture)

---

## 1. Store Core 구성 요소

### 분류: Core

Store Core는 **모든 서비스에서 공통으로 사용하는 매장 기반 인프라**이다.

### 1.1 Store Core 엔티티 목록

| # | 엔티티 | 테이블 | 위치 | 역할 |
|---|--------|--------|------|------|
| 1 | `OrganizationStore` | `organizations` | `routes/kpa/entities/organization-store.entity.ts` | 매장 기본 엔티티 (이름, 코드, 주소, 설정) |
| 2 | `PlatformStoreSlug` | `platform_store_slugs` | `packages/platform-core/src/store-identity/` | 플랫폼 전체 고유 URL 슬러그 |
| 3 | `PlatformStoreSlugHistory` | `platform_store_slug_history` | `packages/platform-core/src/store-identity/` | 슬러그 변경 이력/리다이렉트 |
| 4 | `OrganizationChannel` | `organization_channels` | `routes/kpa/entities/organization-channel.entity.ts` | 매장 판매 채널 (B2C/KIOSK/TABLET/SIGNAGE) |
| 5 | `OrganizationProductListing` | `organization_product_listings` | `routes/kpa/entities/organization-product-listing.entity.ts` | 매장 상품 채택 레이어 |
| 6 | `OrganizationProductChannel` | `organization_product_channels` | `routes/kpa/entities/organization-product-channel.entity.ts` | 채널별 상품 노출 매핑 |
| 7 | `StoreProductProfile` | `store_product_profiles` | `modules/neture/entities/StoreProductProfile.entity.ts` | 매장별 상품 표시 커스터마이징 |
| 8 | `PlatformStorePolicy` | `platform_store_policies` | `packages/platform-core/src/store-policy/` | 매장 정책 설정 |
| 9 | `PlatformStorePaymentConfig` | `platform_store_payment_configs` | `packages/platform-core/src/store-policy/` | 매장 결제 설정 |
| 10 | `OrganizationServiceEnrollment` | `organization_service_enrollments` | `routes/kpa/entities/` | 매장 서비스 등록 |

### 1.2 Store Core 서비스

| 서비스 | 위치 | 역할 |
|--------|------|------|
| `StoreSlugService` | `packages/platform-core/src/store-identity/services/` | 슬러그 조회/생성/리다이렉트 |
| `StorePolicyService` | `packages/platform-core/src/store-policy/services/` | 매장 정책 적용 |
| `StoreSummaryEngine` | `packages/store-core/src/` | 월매출, 주문수, 채널 KPI |
| `StoreInsightsEngine` | `packages/store-core/src/` | AI 인사이트 생성 |
| `StoreDataAdapter` | `packages/store-core/src/` | 서비스별 데이터 어댑터 인터페이스 |

### 1.3 Store Core 패키지

| 패키지 | 역할 | 상태 | 소비자 |
|--------|------|:----:|--------|
| `@o4o/store-ui-core` | Shell Layout (Dashboard, Menu, Topbar) | Active | web-kpa, web-glycopharm, web-k-cosmetics, web-glucoseview |
| `@o4o/store-core` | KPI Engine (Summary, Insights) | Active | api-server |
| `@o4o/hub-core` | Hub Layout, Signals | 🔒 FROZEN | web-glycopharm, web-neture |
| `@o4o/asset-copy-core` | Snapshot Engine (생성/발행) | 🔒 FROZEN | api-server |
| `@o4o/store-asset-policy-core` | Asset Policy UI (필터, 뱃지, 제어) | Active | web-kpa, web-glycopharm |

### 1.4 패키지 의존 방향 (FROZEN)

```
❌ 금지 방향:
  store-ui-core → store-asset-policy-core
  store-asset-policy-core → store-core
  hub-core → store-asset-policy-core
  Core 패키지 간 상호 의존

✅ 허용 방향:
  web-* → store-ui-core (Layout + Menu)
  web-* → store-asset-policy-core (Policy UI)
  web-* → hub-core (일부 서비스만)
  api-server → store-core (KPI)
  api-server → asset-copy-core (Snapshots)
```

### 1.5 Store UI Core 주요 Export

```typescript
// Layout
export { StoreDashboardLayout }   // 메인 대시보드 래퍼
export { StorePlaceholderPage }   // 플레이스홀더
export { StoreTopBar }            // 상단 네비게이션
export { StoreSidebar }           // 좌측 사이드바 메뉴

// 서비스별 메뉴 설정
export {
  ALL_STORE_MENUS,
  COSMETICS_STORE_CONFIG,
  GLYCOPHARM_STORE_CONFIG,
  GLUCOSEVIEW_STORE_CONFIG,
  KPA_SOCIETY_STORE_CONFIG,
}

// Engine
export { computeStoreInsights }   // KPI 인사이트 계산
```

---

## 2. Store HUB 구조

### 분류: Core

### 2.1 Store HUB 컨트롤러

| 항목 | 값 |
|------|------|
| 컨트롤러 | `store-hub.controller.ts` |
| 위치 | `apps/api-server/src/routes/o4o-store/controllers/store-hub.controller.ts` |
| 팩토리 | `createStoreHubController()` |
| 마운트 | `/api/v1/kpa/store-hub` (KPA), GlycoPharm에서도 사용 |

### 2.2 O4O Store 컨트롤러 허브 (19개)

**위치:** `apps/api-server/src/routes/o4o-store/controllers/`

| # | 컨트롤러 | 팩토리 | 역할 | 분류 |
|---|----------|--------|------|:----:|
| 1 | `store-hub.controller.ts` | `createStoreHubController()` | Store HUB 대시보드 | **Core** |
| 2 | `pharmacy-store-config.controller.ts` | `createPharmacyStoreConfigController()` | 매장 설정 | **Core** |
| 3 | `pharmacy-products.controller.ts` | `createPharmacyProductsController()` | 매장 상품 관리 | **Core** |
| 4 | `store-channel-products.controller.ts` | `createStoreChannelProductsController()` | 채널별 상품 표시 | **Core** |
| 5 | `layout.controller.ts` | `createLayoutController()` | 스토어 레이아웃/블록 관리 | **Core** |
| 6 | `store-analytics.controller.ts` | `createStoreAnalyticsController()` | 매장 분석/KPI | **Core** |
| 7 | `tablet.controller.ts` | `createTabletController()` | 태블릿 디바이스 관리 | Extension |
| 8 | `store-qr.controller.ts` | `createStoreQrController()` | QR 코드 관리 | Extension |
| 9 | `store-qr-landing.controller.ts` | `createStoreQrLandingController()` | QR 랜딩 페이지 | Extension |
| 10 | `store-pop.controller.ts` | `createStorePopController()` | POP 인쇄물 콘텐츠 | Extension |
| 11 | `store-playlist.controller.ts` | `createStorePlaylistController()` | 사이니지 플레이리스트 | Extension |
| 12 | `store-content.controller.ts` | `createStoreContentController()` | 블로그/이벤트 콘텐츠 | Extension |
| 13 | `store-library.controller.ts` | `createStoreLibraryController()` | 자료실 관리 | Extension |
| 14 | `store-asset-control.controller.ts` | `createStoreAssetControlController()` | 에셋 스냅샷 제어 | Extension |
| 15 | `asset-snapshot.controller.ts` | `createAssetSnapshotController()` | 에셋 스냅샷 생성 | Extension |
| 16 | `published-assets.controller.ts` | `createPublishedAssetsController()` | 발행 에셋 조회 | Extension |
| 17 | `store-events.controller.ts` | `createStoreEventsController()` | 매장 이벤트 관리 | Extension |
| 18 | `blog.controller.ts` | `createBlogController()` | 블로그 관리 | Extension |
| 19 | `product-marketing.controller.ts` | `createProductMarketingController()` | 마케팅 에셋 관리 | Extension |
| 20 | `kpa-store-template.controller.ts` | `createKpaStoreTemplateController()` | KPA 전용 스토어 템플릿 | Extension |

**현재 사용:** KPA `kpa.routes.ts`에서 19개 컨트롤러 전부 import하여 `/api/v1/kpa` 하위에 마운트.

### 2.3 서비스별 Store HUB 페이지

**GlycoPharm — 가장 풍부한 HUB UI:**

| 페이지 | 위치 | 역할 |
|--------|------|------|
| `StoreMainPage.tsx` | `pages/pharmacy/` | 매장 메인/대시보드 |
| `PharmacySettings.tsx` | `pages/pharmacy/` | 매장 설정 (템플릿, 테마, 프로필) |
| `StoreApplyPage.tsx` | `pages/pharmacy/` | 매장 신청/등록 |
| `StoreBillingPage.tsx` | `pages/pharmacy/` | 매장 청구 |
| `PharmacyB2BProducts.tsx` | `pages/pharmacy/` | B2B 상품 리스팅 |
| `CustomerRequestsPage.tsx` | `pages/pharmacy/` | 고객 요청 (태블릿) |
| `FunnelPage.tsx` | `pages/pharmacy/` | 전환 퍼널 분석 |

**KPA Society — 서비스 페이지 기반:**

| 페이지 | 위치 | 역할 |
|--------|------|------|
| `PharmacyServicePage.tsx` | `pages/pharmacy/` | 약국 서비스 소개 |
| `HubB2BCatalogPage.tsx` | `pages/pharmacy/` | B2B 카탈로그 |
| `PharmacyB2BPage.tsx` | `pages/pharmacy/` | 채택 상품 관리 |
| `StoreChannelsPage.tsx` | `pages/pharmacy/` | 채널 관리 |

---

## 3. Store Product System

### 분류: Core

### 3.1 상품 흐름 (데이터)

```
┌──────────────┐     ┌─────────────────────┐     ┌─────────────────────────┐
│ ProductMaster│────→│ SupplierProductOffer │────→│ OrganizationProduct     │
│ (SSOT)       │     │ (가격/재고/유통)       │     │ Listing (매장 채택)      │
└──────────────┘     └─────────────────────┘     └────────────┬────────────┘
                                                              │
                                                              ▼
                                                 ┌─────────────────────────┐
                                                 │ OrganizationProduct     │
                                                 │ Channel (채널 노출)      │
                                                 └─────────────────────────┘
```

### 3.2 상품 채택 API (KPA 기준)

| 용도 | API | 메서드 |
|------|-----|--------|
| B2B 카탈로그 조회 | `/pharmacy/products/catalog` | GET |
| 판매 신청 | `/pharmacy/products/apply` | POST |
| 내 신청 목록 | `/pharmacy/products/applications` | GET |
| 승인 상품 목록 | `/pharmacy/products/approved` | GET |
| 채택 상품 목록 | `/pharmacy/products/listings` | GET |
| 리스팅 수정 | `/pharmacy/products/listings/:id` | PUT |
| 채널 설정 조회 | `/pharmacy/products/listings/:id/channels` | GET |
| 채널 설정 변경 | `/pharmacy/products/listings/:id/channels` | PUT |

### 3.3 운영자 승인 API

| 용도 | API | 메서드 |
|------|-----|--------|
| 신청 목록 | `/operator/product-applications` | GET |
| 신청 통계 | `/operator/product-applications/stats` | GET |
| 승인 | `/operator/product-applications/:id/approve` | PATCH |
| 거절 | `/operator/product-applications/:id/reject` | PATCH |

**컨트롤러:** `operator-product-applications.controller.ts`

**승인 시 동작:** `OrganizationProductListing` 자동 생성 → 매장 재고에 즉시 추가

### 3.4 서비스별 구현 상태

| 서비스 | 카탈로그 | 채택 신청 | 운영자 승인 | 채택 관리 |
|--------|:--------:|:--------:|:----------:|:--------:|
| KPA Society | ✅ | ✅ | ✅ | ✅ |
| GlycoPharm | ❌ | ❌ | ❌ | ❌ |
| K-Cosmetics | ❌ | ❌ | ❌ | ❌ |
| Neture | ❌ | ❌ | ❌ | ❌ |

---

## 4. Store Channel System

### 분류: Core

### 4.1 채널 타입

| 채널 | ENUM | 용도 | 자동 승인 |
|------|------|------|:--------:|
| B2C | `B2C` | 온라인 스토어프론트 | ✅ |
| 키오스크 | `KIOSK` | 매장 내 키오스크 | ✅ |
| 태블릿 | `TABLET` | 태블릿 디바이스 | ❌ |
| 사이니지 | `SIGNAGE` | 사이니지 디스플레이 | ❌ |

### 4.2 채널 승인 상태 머신

```
PENDING → APPROVED → SUSPENDED → APPROVED (복원)
PENDING → REJECTED
APPROVED → EXPIRED
APPROVED → TERMINATED (영구)
```

### 4.3 채널 상품 관리 API

| 용도 | API | 메서드 |
|------|-----|--------|
| 채널 현황 | `/channels/overview` | GET |
| 채널 상품 목록 | `/channels/:type/products` | GET |
| 추가 가능 상품 | `/listings/available` | GET |
| 상품 추가 | `/channels/:type/products` | POST |
| 상품 제거 | `/channels/:type/products/:productId` | DELETE |
| 순서 변경 | `/channels/:type/products/reorder` | PUT |

### 4.4 B2C 가시성 게이트 (6중)

```
Gate 1: organization_product_listings.is_active = true
Gate 2: organization_product_channels.is_active = true
Gate 3: organization_channels.channel_type = 'B2C'
Gate 4: organization_channels.status = 'APPROVED'
Gate 5: supplier_product_offers.is_active = true
Gate 6: neture_suppliers.status = 'ACTIVE'
```

**엔드포인트:** `GET /api/v1/stores/:slug/products`
**파일:** `unified-store-public.routes.ts`

---

## 5. Store Extensions

### 5.1 분류 매트릭스

| # | 서비스 | 분류 | Core 의존 | 엔티티 | 컨트롤러 |
|---|--------|:----:|:---------:|--------|----------|
| 1 | **B2C Commerce** | Extension | OrganizationProductListing + Channel | - | `unified-store-public.routes.ts` |
| 2 | **Tablet** | Extension | OrganizationChannel (TABLET) | `StoreTablet`, `StoreTabletDisplay`, `TabletInterestRequest` | `tablet.controller.ts` |
| 3 | **Kiosk** | Extension | OrganizationChannel (KIOSK) | - (채널만 사용) | `store-channel-products.controller.ts` |
| 4 | **POP** | Extension | ProductAiContent (pop_short/pop_long) | `ProductMarketingAsset` | `store-pop.controller.ts` |
| 5 | **QR** | Extension | ProductAiContent (qr_description) | `StoreQrCode`, `StoreQrScanEvent` | `store-qr.controller.ts`, `store-qr-landing.controller.ts` |
| 6 | **Signage** | Extension | OrganizationChannel (SIGNAGE) | Core Signage API 별도 | `store-playlist.controller.ts` |
| 7 | **AI Content** | Extension | SupplierProductOffer | `ProductAiContent` | (store-ai module) |
| 8 | **Local Products** | Extension | organization_id 격리만 | `StoreLocalProduct` | `store-local-product.routes.ts` |
| 9 | **Asset Snapshot** | Extension | hub-core, asset-copy-core | 스냅샷 엔티티들 | `asset-snapshot.controller.ts`, `store-asset-control.controller.ts` |
| 10 | **Blog/Events** | Extension | organization_id 격리만 | `StoreBlogPost`, `StoreEvent` | `blog.controller.ts`, `store-events.controller.ts` |
| 11 | **Library** | Extension | organization_id 격리만 | `StoreLibraryItem` | `store-library.controller.ts` |
| 12 | **Marketing Assets** | Extension | ProductMarketingAsset | `ProductMarketingAsset` | `product-marketing.controller.ts` |

### 5.2 Extension 엔티티 목록

| # | 엔티티 | 테이블 | 위치 | Domain |
|---|--------|--------|------|--------|
| 1 | `StoreLocalProduct` | `store_local_products` | `routes/platform/entities/` | Display |
| 2 | `StoreLibraryItem` | `store_library_items` | `routes/platform/entities/` | Display |
| 3 | `StoreTablet` | `store_tablets` | `routes/platform/entities/` | Device |
| 4 | `StoreTabletDisplay` | `store_tablet_displays` | `routes/platform/entities/` | Device |
| 5 | `StoreQrCode` | `store_qr_codes` | `routes/platform/entities/` | Marketing |
| 6 | `StoreQrScanEvent` | `store_qr_scan_events` | `routes/platform/entities/` | Analytics |
| 7 | `StoreEvent` | `store_events` | `routes/platform/entities/` | Content |
| 8 | `TabletInterestRequest` | `tablet_interest_requests` | `routes/platform/entities/` | Commerce |
| 9 | `ProductMarketingAsset` | `product_marketing_assets` | `routes/platform/entities/` | Marketing |
| 10 | `ProductAiContent` | `product_ai_contents` | `modules/store-ai/entities/` | AI |
| 11 | `StoreAiSnapshot` | `store_ai_snapshots` | `modules/store-ai/entities/` | AI |
| 12 | `StoreAiInsight` | `store_ai_insights` | `modules/store-ai/entities/` | AI |
| 13 | `StoreAiProductSnapshot` | `store_ai_product_snapshots` | `modules/store-ai/entities/` | AI |
| 14 | `StoreAiProductInsight` | `store_ai_product_insights` | `modules/store-ai/entities/` | AI |
| 15 | `PhysicalStore` | `physical_stores` | `routes/platform/entities/` | Network |
| 16 | `PhysicalStoreLink` | `physical_store_links` | `routes/platform/entities/` | Network |

### 5.3 Extension별 Core 의존 관계

```
B2C Commerce
 └→ Core: OrganizationProductListing + OrganizationProductChannel + OrganizationChannel
 └→ Core: PlatformStoreSlug (슬러그 해석)

Tablet
 └→ Core: OrganizationChannel (channel_type = 'TABLET')
 └→ Extension: StoreTablet, TabletInterestRequest

QR
 └→ Extension: ProductAiContent (qr_description)
 └→ Extension: StoreQrCode, StoreQrScanEvent, ProductMarketingAsset

POP
 └→ Extension: ProductAiContent (pop_short, pop_long)
 └→ Extension: ProductMarketingAsset

Signage
 └→ Core: OrganizationChannel (channel_type = 'SIGNAGE')
 └→ External: Core Signage API (/api/signage/:serviceKey/)

AI Content
 └→ Core: SupplierProductOffer (product_id 참조)
 └→ Extension: ProductAiContent (5종 콘텐츠)

Local Products
 └→ Core: organization_id (멀티테넌트 격리만)
 └→ Display Domain (Commerce 연결 금지)
```

---

## 6. Local Product System

### 분류: Extension (Display Domain)

### 6.1 StoreLocalProduct

| 항목 | 값 |
|------|------|
| 엔티티 | `StoreLocalProduct` |
| 테이블 | `store_local_products` |
| 위치 | `routes/platform/entities/store-local-product.entity.ts` |
| 컨트롤러 | `store-local-product.routes.ts` |

**핵심 규칙:**
```
⚠️  Display Domain ONLY
- CheckoutOrder / EcommerceOrder와 연결 금지
- Commerce 상품과 DB UNION 금지
- B2C 스토어프론트에서 별도 섹션으로 표시
- 앱 레이어에서만 병합
```

### 6.2 Commerce 상품과의 관계

```
Commerce 상품 (Core):
  ProductMaster → SupplierProductOffer → OrgProductListing → OrgProductChannel
  → B2C 가시성 게이트 통과 → 구매 가능

Local 상품 (Extension):
  StoreLocalProduct (organization_id 격리)
  → B2C에서 별도 쿼리
  → 구매 불가 (Display Only)
```

### 6.3 B2C 스토어프론트 통합

`unified-store-public.routes.ts`의 태블릿 엔드포인트에서 확인:
- Commerce 상품: 6중 게이트 쿼리 (supplier_product_offers JOIN)
- Local 상품: `store_local_products` 별도 쿼리
- **앱 레이어에서 병합** (DB UNION 금지)

---

## 7. AI Content System

### 분류: Extension

### 7.1 ProductAiContent

| 항목 | 값 |
|------|------|
| 엔티티 | `ProductAiContent` |
| 테이블 | `product_ai_contents` |
| 위치 | `modules/store-ai/entities/product-ai-content.entity.ts` |
| 서비스 | `ProductAiContentService` |

### 7.2 콘텐츠 타입 → 채널 매핑

| 콘텐츠 타입 | 소비 채널 | Extension |
|------------|----------|-----------|
| `product_description` | B2C Commerce | B2C |
| `pop_short` | POP 인쇄물 | POP |
| `pop_long` | POP 인쇄물 | POP |
| `qr_description` | QR 스캔 | QR |
| `signage_text` | 사이니지 | Signage |

### 7.3 AI 분석 엔티티

| 엔티티 | 역할 |
|--------|------|
| `StoreAiSnapshot` | 매장 AI 분석 스냅샷 |
| `StoreAiInsight` | 매장 AI 인사이트 |
| `StoreAiProductSnapshot` | 상품별 AI 분석 |
| `StoreAiProductInsight` | 상품별 AI 인사이트 |

### 7.4 생성 구조

```
SupplierProductOffer
       │
       ▼
ProductAiContentService (Gemini 3.0 Flash)
       │
       ├→ product_description (B2C)
       ├→ pop_short (POP)
       ├→ pop_long (POP)
       ├→ qr_description (QR)
       └→ signage_text (Signage)
```

---

## 8. Store App Architecture

### 8.1 현재 코드 구조

```
packages/
 ├ store-ui-core/        ← Frontend Shell (Layout, Menu, Dashboard)
 ├ store-core/           ← Backend Engine (KPI, Insights)
 ├ store-asset-policy-core/ ← Asset Policy UI
 ├ hub-core/             ← Hub Layout (FROZEN)
 ├ asset-copy-core/      ← Snapshot Engine (FROZEN)
 └ platform-core/
    ├ store-identity/    ← Slug System
    └ store-policy/      ← Policy/Payment Config

apps/api-server/src/
 ├ routes/o4o-store/controllers/ ← 19개 통합 Store 컨트롤러
 ├ routes/platform/     ← B2C, Slug, Local Product, Tablet 라우트
 ├ routes/kpa/          ← KPA 매장 라우트 (o4o-store 컨트롤러 소비)
 ├ routes/glycopharm/   ← GlycoPharm 매장 엔티티
 ├ routes/cosmetics/    ← Cosmetics 매장 엔티티
 └ modules/store-ai/    ← AI 콘텐츠/인사이트

services/
 ├ web-kpa-society/     ← 가장 완전한 Store UI
 ├ web-glycopharm/      ← 풍부한 HUB UI, 채택 UX 미완
 ├ web-k-cosmetics/     ← 기본 구조만
 ├ web-glucoseview/     ← 최소 구조
 └ web-neture/          ← 공급자 중심 (매장 채택 불필요)
```

### 8.2 Store App = Core + Extension 분류

```
Store App
 │
 ├─ Core ─────────────────────────────────────────────────
 │   │
 │   ├─ Store Identity
 │   │   ├ OrganizationStore (매장 엔티티)
 │   │   ├ PlatformStoreSlug (URL 슬러그)
 │   │   └ OrganizationServiceEnrollment (서비스 등록)
 │   │
 │   ├─ Store Product
 │   │   ├ OrganizationProductListing (상품 채택)
 │   │   ├ StoreProductProfile (매장별 커스터마이징)
 │   │   └ 승인 워크플로우 (product_approvals)
 │   │
 │   ├─ Store Channel
 │   │   ├ OrganizationChannel (4종 채널)
 │   │   ├ OrganizationProductChannel (채널별 상품)
 │   │   └ 가시성 게이트 (6중)
 │   │
 │   ├─ Store Layout
 │   │   ├ StoreDashboardLayout (UI Shell)
 │   │   ├ storefront_blocks (블록 엔진)
 │   │   └ storefront_config (설정)
 │   │
 │   ├─ Store Policy
 │   │   ├ PlatformStorePolicy
 │   │   └ PlatformStorePaymentConfig
 │   │
 │   └─ Store Analytics
 │       ├ StoreSummaryEngine (KPI)
 │       └ StoreInsightsEngine (인사이트)
 │
 ├─ Extensions ───────────────────────────────────────────
 │   │
 │   ├─ B2C Commerce
 │   │   └ unified-store-public.routes.ts (공개 스토어프론트)
 │   │
 │   ├─ Tablet
 │   │   ├ StoreTablet (디바이스 관리)
 │   │   ├ TabletInterestRequest (고객 관심)
 │   │   └ tablet.controller.ts
 │   │
 │   ├─ Kiosk
 │   │   └ 채널 기반 (별도 엔티티 없음)
 │   │
 │   ├─ POP
 │   │   ├ ProductAiContent (pop_short, pop_long)
 │   │   └ store-pop.controller.ts
 │   │
 │   ├─ QR
 │   │   ├ StoreQrCode, StoreQrScanEvent
 │   │   ├ ProductAiContent (qr_description)
 │   │   └ store-qr.controller.ts
 │   │
 │   ├─ Signage
 │   │   ├ Core Signage API (External)
 │   │   └ store-playlist.controller.ts
 │   │
 │   ├─ AI Content
 │   │   ├ ProductAiContent (5종)
 │   │   ├ StoreAi* 엔티티 (4종)
 │   │   └ ProductAiContentService
 │   │
 │   ├─ Local Products
 │   │   ├ StoreLocalProduct (Display Domain)
 │   │   └ store-local-product.routes.ts
 │   │
 │   ├─ Asset Snapshot
 │   │   ├ asset-copy-core (FROZEN)
 │   │   └ store-asset-control.controller.ts
 │   │
 │   ├─ Blog / Events
 │   │   ├ StoreBlogPost, StoreEvent
 │   │   └ blog.controller.ts, store-events.controller.ts
 │   │
 │   ├─ Library
 │   │   ├ StoreLibraryItem
 │   │   └ store-library.controller.ts
 │   │
 │   └─ Marketing Assets
 │       ├ ProductMarketingAsset (다형성)
 │       └ product-marketing.controller.ts
 │
 └─ External ────────────────────────────────────────────
     │
     ├─ Core Signage API (/api/signage/:serviceKey/)
     ├─ CMS Core (cms_contents, cms_media)
     ├─ E-commerce Core (checkoutService.createOrder())
     └─ Store Network (cross-service 물리매장 연결)
```

### 8.3 서비스별 Store 엔티티

| 서비스 | 매장 엔티티 | 슬러그 키 | OrderType | 템플릿 |
|--------|:-----------:|:---------:|:---------:|:------:|
| KPA Society | `OrganizationStore` (organizations) | `kpa` | DROPSHIPPING | BASIC |
| GlycoPharm | `OrganizationStore` (organizations) | `glycopharm` | ❌ BLOCKED | BASIC/COMMERCE_FOCUS |
| K-Cosmetics | `CosmeticsStore` (cosmetics_stores) | `cosmetics` | COSMETICS | BASIC |
| GlucoseView | (최소 구조) | `glucoseview` | GENERIC | BASIC |
| Neture | (Partner/Supplier 중심) | `neture` | DROPSHIPPING | - |

### 8.4 현재 Core/Extension 분리 상태 평가

| 영역 | 상태 | 설명 |
|------|:----:|------|
| Store Identity (슬러그, 매장 엔티티) | ✅ 분리됨 | `platform-core/store-identity/`에 독립 |
| Store Policy (정책, 결제) | ✅ 분리됨 | `platform-core/store-policy/`에 독립 |
| Store UI Shell (Layout, Menu) | ✅ 분리됨 | `packages/store-ui-core/`에 독립 |
| Store KPI Engine | ✅ 분리됨 | `packages/store-core/`에 독립 |
| Store Product (채택, 프로필) | ⚠️ 혼재 | 엔티티는 `routes/kpa/entities/`, 컨트롤러는 `routes/o4o-store/` |
| Store Channel (채널, 게이트) | ⚠️ 혼재 | 엔티티는 `routes/kpa/entities/`, 컨트롤러는 `routes/o4o-store/` |
| Extension 컨트롤러 | ⚠️ 혼재 | 모두 `routes/o4o-store/controllers/`에 Core와 함께 위치 |
| Extension 엔티티 | ✅ 분리됨 | `routes/platform/entities/`에 독립 |

### 8.5 Core/Extension 분리를 위한 구조적 관찰

**이미 분리된 것:**
1. `packages/` — Core 패키지 5개가 독립 존재
2. `platform-core/` — Store Identity + Policy 분리됨
3. Extension 엔티티 — `routes/platform/entities/`에 모아져 있음

**분리가 필요한 것:**
1. `OrganizationProductListing`, `OrganizationChannel` 등 Core 엔티티가 `routes/kpa/entities/`에 위치 → 서비스 비종속 경로로 이동 필요
2. O4O Store 컨트롤러 19개가 한 디렉토리에 Core/Extension 혼재 → 분리 필요
3. `CosmeticsStore` 별도 엔티티 → `OrganizationStore` 통합 또는 어댑터 패턴 필요

---

## 부록: 전체 파일 참조

### Core 패키지

| 패키지 | 경로 |
|--------|------|
| store-ui-core | `packages/store-ui-core/src/index.ts` |
| store-core | `packages/store-core/src/` |
| hub-core | `packages/hub-core/src/` |
| asset-copy-core | `packages/asset-copy-core/src/` |
| store-asset-policy-core | `packages/store-asset-policy-core/src/` |
| platform-core/store-identity | `packages/platform-core/src/store-identity/` |
| platform-core/store-policy | `packages/platform-core/src/store-policy/` |

### Core 엔티티

| 엔티티 | 경로 |
|--------|------|
| OrganizationStore | `apps/api-server/src/routes/kpa/entities/organization-store.entity.ts` |
| OrganizationChannel | `apps/api-server/src/routes/kpa/entities/organization-channel.entity.ts` |
| OrganizationProductListing | `apps/api-server/src/routes/kpa/entities/organization-product-listing.entity.ts` |
| OrganizationProductChannel | `apps/api-server/src/routes/kpa/entities/organization-product-channel.entity.ts` |
| StoreProductProfile | `apps/api-server/src/modules/neture/entities/StoreProductProfile.entity.ts` |
| PlatformStoreSlug | `packages/platform-core/src/store-identity/entities/platform-store-slug.entity.ts` |
| PlatformStorePolicy | `packages/platform-core/src/store-policy/entities/platform-store-policy.entity.ts` |

### Extension 엔티티

| 엔티티 | 경로 |
|--------|------|
| StoreLocalProduct | `apps/api-server/src/routes/platform/entities/store-local-product.entity.ts` |
| StoreLibraryItem | `apps/api-server/src/routes/platform/entities/store-library-item.entity.ts` |
| StoreTablet | `apps/api-server/src/routes/platform/entities/store-tablet.entity.ts` |
| StoreQrCode | `apps/api-server/src/routes/platform/entities/store-qr-code.entity.ts` |
| StoreEvent | `apps/api-server/src/routes/platform/entities/store-event.entity.ts` |
| ProductMarketingAsset | `apps/api-server/src/routes/platform/entities/product-marketing-asset.entity.ts` |
| ProductAiContent | `apps/api-server/src/modules/store-ai/entities/product-ai-content.entity.ts` |

### 컨트롤러 (O4O Store)

| 컨트롤러 | 경로 |
|----------|------|
| 19개 컨트롤러 | `apps/api-server/src/routes/o4o-store/controllers/*.ts` |

### 플랫폼 라우트

| 라우트 | 경로 |
|--------|------|
| B2C Storefront | `apps/api-server/src/routes/platform/unified-store-public.routes.ts` |
| Store Network | `apps/api-server/src/routes/platform/store-network.routes.ts` |
| Physical Store | `apps/api-server/src/routes/platform/physical-store.routes.ts` |
| Local Products | `apps/api-server/src/routes/platform/store-local-product.routes.ts` |
| Slug | `apps/api-server/src/routes/platform/slug.routes.ts` |
| Store Policy | `apps/api-server/src/routes/platform/store-policy.routes.ts` |
| Store Tablet | `apps/api-server/src/routes/platform/store-tablet.routes.ts` |

### 프론트엔드 주요 파일

| 서비스 | 경로 |
|--------|------|
| KPA 카탈로그 | `services/web-kpa-society/src/pages/pharmacy/HubB2BCatalogPage.tsx` |
| KPA 채택 관리 | `services/web-kpa-society/src/pages/pharmacy/PharmacyB2BPage.tsx` |
| KPA 채널 관리 | `services/web-kpa-society/src/pages/pharmacy/StoreChannelsPage.tsx` |
| GlycoPharm 매장 메인 | `services/web-glycopharm/src/pages/pharmacy/StoreMainPage.tsx` |
| GlycoPharm 매장 설정 | `services/web-glycopharm/src/pages/pharmacy/PharmacySettings.tsx` |
| GlycoPharm B2C | `services/web-glycopharm/src/pages/store/StoreFront.tsx` |
| Neture 스토어 상품 | `services/web-neture/src/pages/store/StoreProductPage.tsx` |

---

*Generated: 2026-03-11*
*Status: Investigation Complete — READ-ONLY*
