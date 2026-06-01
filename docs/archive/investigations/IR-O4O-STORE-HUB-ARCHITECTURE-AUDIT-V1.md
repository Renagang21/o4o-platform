# IR-O4O-STORE-HUB-ARCHITECTURE-AUDIT-V1

> **Investigation Report: Store HUB Architecture Cross-Service Audit**
> Date: 2026-03-08
> Status: Complete
> Scope: Read-only audit (코드 변경 없음)
> Method: Source code static analysis (4개 서비스 병렬 조사)

---

## Executive Summary

O4O 플랫폼의 **Store HUB가 서비스 간 일관된 Core Pattern을 형성하는지** 전수 조사하였다.
KPA, GlycoPharm, K-Cosmetics, Neture 4개 서비스의 Store 진입 구조, Controller/API 구조, 상품 구조, 채널 구조, KPI 구조, service_key 사용 현황을 비교 분석한다.

### 핵심 판정

> **Store HUB는 이미 80% Core Pattern을 형성하고 있다.**
> **나머지 20%는 GlycoPharm의 service_key 하드코딩 + Cosmetics 독립 스키마 문제이다.**

| 영역 | Core Pattern 준수 | 비고 |
|------|:------------------:|------|
| Slug 기반 Public 진입 | **Unified** | `unified-store-public.routes.ts` (서비스 무관) |
| 상품 가시성 게이트 | **Unified** | 4-tier Visibility Gate 공유 |
| 채널 모델 | **Unified** | B2C/KIOSK/TABLET/SIGNAGE 공통 |
| service_key 파라미터화 | **Partial** | GlycoPharm에 `'kpa'` 하드코딩 3건 |
| KPI 집계 | **Unified** | Store HUB에서 service_key 무관 집계 |
| 상품 스키마 | **Split** | Cosmetics 독립 (`cosmetics_*`), KPA/GlycoPharm 공유 |
| 프론트엔드 대시보드 | **Unified** | `@o4o/store-ui-core` 공통 레이아웃 |

---

## A. 서비스별 Store HUB 구조

### A-1. KPA Society (기준 구현)

```
진입 경로:
  Operator Dashboard → Store HUB → /pharmacy/store/*
  Public Storefront  → /stores/:slug/*

Backend 라우트:
  /api/v1/o4o-store/hub/*          → store-hub.controller.ts (인증)
  /api/v1/o4o-store/products/*     → pharmacy-products.controller.ts (인증)
  /api/v1/stores/:slug/*           → unified-store-public.routes.ts (공개)

상품 소스:
  organization_product_listings (service_key='kpa')
    → supplier_product_offers
    → product_masters
    → organization_product_channels
    → organization_channels (B2C/KIOSK/TABLET/SIGNAGE)

채널 구조:
  organization_channels: B2C, KIOSK, TABLET, SIGNAGE
  organization_product_channels: listing ↔ channel 매핑
  4-tier Visibility Gate:
    1. organization_product_listings.is_active = true
    2. organization_product_channels.is_active = true
    3. organization_channels.status = 'APPROVED' AND channel_type = 'B2C'
    4. supplier_product_offers.is_active = true AND neture_suppliers.status = 'ACTIVE'

KPI:
  /api/v1/o4o-store/hub/kpi-summary → checkout_orders (sellerOrganizationId)
  /api/v1/o4o-store/hub/channels    → visibility 메트릭 (service_key 무관)
  /api/v1/o4o-store/hub/live-signals → newOrders, pendingRequests 등

특이사항:
  - KPA는 Store HUB의 기준(Reference) 구현
  - channel execution console, product tabs, channel management 전체 구현
  - StoreLocalProduct (Display Domain) 명시적 KPI 격리
```

**프론트엔드 페이지:**

| 페이지 | 파일 | 역할 |
|--------|------|------|
| StorefrontHomePage | `store/StorefrontHomePage.tsx` | Block Engine 기반 공개 매장 |
| StoreOverviewPage | `pharmacy/StoreOverviewPage.tsx` | 운영자 대시보드 |
| StoreChannelsPage | `pharmacy/StoreChannelsPage.tsx` | 채널 관리 |
| StoreOrdersPage | `pharmacy/StoreOrdersPage.tsx` | 주문 관리 |
| StoreContentEditPage | `pharmacy/StoreContentEditPage.tsx` | 콘텐츠 편집 |
| StoreSignagePage | `pharmacy/StoreSignagePage.tsx` | 사이니지 관리 |
| StoreLibraryPage | `pharmacy/StoreLibraryPage.tsx` | 리소스 라이브러리 |
| TabletStorePage | `tablet/TabletStorePage.tsx` | 태블릿 디스플레이 |

---

### A-2. GlycoPharm

```
진입 경로:
  Operator Dashboard → Store → /store/*
  Public Storefront  → /stores/:slug/* (unified)
  Legacy Storefront  → /store/* (glycopharm 전용)

Backend 라우트:
  /api/v1/o4o-store/hub/*          → store-hub.controller.ts (공유, 인증)
  /api/v1/o4o-store/products/*     → pharmacy-products.controller.ts (공유, 인증)
  /api/v1/stores/:slug/*           → unified-store-public.routes.ts (공유, 공개)
  /api/v1/glycopharm/store/*       → store.controller.ts (독립, 인증)  ← 문제

상품 소스:
  organization_product_listings (service_key='kpa' ← 하드코딩!)
    → 동일 KPA 파이프라인 사용

채널 구조:
  KPA와 동일한 organization_channels/product_channels 사용

KPI:
  공유 Store HUB KPI + 독자 GlycoPharm Cockpit
  useStoreHub Hook: AI Summary, Today Actions, Care, Signage, Products 5개 병렬 fetch

특이사항:
  ⚠️ service_key='kpa' 하드코딩 (store.controller.ts 3곳)
  → GlycoPharm 전용 상품 구분 불가
  → Unified Store와 동작이 다름 (Unified는 파라미터화)
```

**service_key 하드코딩 상세:**

| 위치 | 라인 | SQL 컨텍스트 |
|------|------|-------------|
| `queryVisibleProducts()` COUNT | L116 | `AND opl.service_key = 'kpa'` |
| `queryVisibleProducts()` DATA | L153 | `AND opl.service_key = 'kpa'` |
| Categories 쿼리 | L271 | `AND opl.service_key = 'kpa'` |

**파일:** `apps/api-server/src/routes/glycopharm/controllers/store.controller.ts`

**프론트엔드 페이지:**

| 페이지 | 파일 | 역할 |
|--------|------|------|
| StoreFront | `store/StoreFront.tsx` | 공개 매장 (API-driven) |
| StoreOverviewPage | `store/StoreOverviewPage.tsx` | 운영자 대시보드 |
| StoreProducts | `store/StoreProducts.tsx` | 상품 목록 |
| StoreProductDetail | `store/StoreProductDetail.tsx` | 상품 상세 |
| StoreCart | `store/StoreCart.tsx` | 장바구니 |
| StoreBillingPage | `pharmacy/StoreBillingPage.tsx` | 결제 설정 |
| StoreEntryPage | `store/StoreEntryPage.tsx` | 매장 진입 |
| StoreAssetsPage | `store/StoreAssetsPage.tsx` | 에셋 관리 |

---

### A-3. K-Cosmetics

```
진입 경로:
  Operator Dashboard → Store → /store/*
  Public Storefront  → /stores/:slug/* (unified, 별도 상품 소스)

Backend 라우트:
  /api/v1/cosmetics/stores/*       → cosmetics-store.controller.ts (독립, 인증)
  /api/v1/stores/:slug/*           → unified-store-public.routes.ts (공유, 공개)

상품 소스:
  cosmetics_products (독립 스키마)
    → cosmetics_store_listings
    → cosmetics_brands / cosmetics_lines
  ❌ organization_product_listings 미사용
  ❌ supplier_product_offers 미연결

채널 구조:
  ❌ organization_channels/product_channels 미사용
  → 자체 cosmetics_stores 테이블 기반
  → Scope-based 접근 제어 (cosmetics:admin, cosmetics:staff)

KPI:
  Store HUB KPI 직접 참여 불가 (상품 소스가 다름)
  checkout_orders의 metadata.serviceKey = 'cosmetics'로 주문만 공유

특이사항:
  - 완전 독립 스키마 (cosmetics_* prefix)
  - Organization 기반이 아닌 Scope 기반 접근 제어
  - Unified Store Public API는 slug 해석까지만 공유
  - 상품 가시성 게이트가 KPA/GlycoPharm과 다름
  - 사이니지 연동 (WO-KCOS-STORES-PHASE4-SIGNAGE-INTEGRATION-V1) 별도 구현
```

**프론트엔드 페이지:**

| 페이지 | 파일 | 역할 |
|--------|------|------|
| StoresPage | `operator/StoresPage.tsx` | 매장 관리 (관리자) |
| StoreCockpitPage | `operator/StoreCockpitPage.tsx` | 매장 콕핏 |
| StoreOverviewPage | `store/StoreOverviewPage.tsx` | 매장 개요 |

---

### A-4. Neture

```
진입 경로:
  Supplier/Partner Dashboard → /supplier/*, /partner/*
  Public Storefront          → /stores/:slug/* (unified)
  Consumer Store            → /neture/store/*

Backend 라우트:
  /api/v1/stores/:slug/*           → unified-store-public.routes.ts (공유, 공개)
  /api/v1/neture/*                 → neture 전용 routes (Supplier/Partner)
  → Store HUB Controller 직접 사용하지 않음 (B2B 구조)

상품 소스:
  supplier_product_offers (Neture 유통 엔진)
    → product_masters
    → distribution_type: PUBLIC/SERVICE/PRIVATE
  → organization_product_listings에 자동 분배 (auto-listing.utils.ts)

채널 구조:
  Neture 자체는 채널 소비자가 아닌 채널 공급자
  auto-listing → organization별 listing 생성 → 각 서비스가 채널로 소비

KPI:
  Supplier Dashboard: 자체 B2B KPI (주문량, 매출, 파트너 수)
  Store HUB KPI에 간접 기여 (auto-listed 상품 → 각 서비스 매장에서 판매)

특이사항:
  - Neture는 "상품 공급 엔진"이며, Store HUB의 직접 소비자가 아님
  - auto-listing이 organization_service_enrollments.service_code 기반으로 동작 (하드코딩 없음)
  - HubPage는 workspace-only (외부 미노출)
```

---

## B. 비교 요약 테이블

### B-1. Store HUB 구조 비교

| 항목 | KPA | GlycoPharm | K-Cosmetics | Neture |
|------|:---:|:----------:|:-----------:|:------:|
| **Unified Public API** | ✅ | ✅ | ✅ (slug만) | ✅ |
| **Store HUB Controller** | ✅ | ✅ | ❌ | ❌ |
| **Pharmacy Products** | ✅ | ✅ | ❌ | ❌ |
| **org_product_listings** | ✅ | ✅ | ❌ | ✅ (공급) |
| **org_product_channels** | ✅ | ✅ | ❌ | ❌ |
| **organization_channels** | ✅ | ✅ | ❌ | ❌ |
| **4-tier Visibility Gate** | ✅ | ✅ | ❌ | ❌ |
| **service_key 파라미터화** | ✅ | ⚠️ 하드코딩 | N/A | ✅ |
| **store-ui-core 사용** | ✅ | ✅ | ✅ | ❌ |
| **Checkout 연동** | ✅ | ✅ | ✅ | ❌ (B2B) |
| **Block Engine** | ✅ | ❌ (API-driven) | ❌ | ❌ |
| **StoreLocalProduct** | ✅ | ✅ | ❌ | ❌ |
| **독자 store controller** | ❌ | ✅ (`store.controller.ts`) | ✅ (`cosmetics-store.controller.ts`) | ❌ |

### B-2. service_key 사용 현황

| 파일 | 방식 | service_key 값 | 위험도 |
|------|------|---------------|:------:|
| `pharmacy-products.controller.ts` | `resolveServiceKeyFromQuery()` | query param, default 'kpa' | **Safe** |
| `unified-store-public.routes.ts` | `resolvePublicStore()` → slug 해석 | 동적 (slug 기반) | **Safe** |
| `auto-listing.utils.ts` | `organization_service_enrollments.service_code` | 동적 (enrollment 기반) | **Safe** |
| `store-hub.controller.ts` | service_key 미필터링 | 전체 집계 | **Safe** |
| `glycopharm/store.controller.ts` | **하드코딩** | `'kpa'` 3곳 | **Critical** |
| `organization-product-listing.entity.ts` | Entity default | `'kpa'` (DDL default) | **Info** |
| `constants/service-keys.ts` | 상수 정의 | kpa, kpa-groupbuy, cosmetics, glycopharm | **Ref** |

### B-3. 프론트엔드 Store 메뉴 구성

| 서비스 | 메뉴 수 | 활성 메뉴 |
|--------|:-------:|----------|
| KPA Society | 커스텀 | Operation/Marketing/Commerce/Analytics 그룹 |
| GlycoPharm | 8 | dashboard, products, channels, orders, content, signage, billing, settings |
| K-Cosmetics | 6 | dashboard, products, orders, billing, content, settings |
| GlucoseView | 2 | dashboard, settings |

---

## C. Core Pattern 분석

### C-1. 이미 Core인 것 (추출 불필요)

| 계층 | 구성요소 | 상태 |
|------|---------|------|
| **Platform Core** | `unified-store-public.routes.ts` | ✅ 서비스 무관 |
| **Platform Core** | `StoreSlugService` + `PlatformStoreSlug` | ✅ 서비스 무관 |
| **Platform Core** | `store-policy.routes.ts` (정책/결제) | ✅ 서비스 무관 |
| **Platform Core** | `store-local-product.routes.ts` (Display Domain) | ✅ 서비스 무관 |
| **Platform Core** | `store-tablet.routes.ts` | ✅ 서비스 무관 |
| **Shared Package** | `@o4o/store-ui-core` (StoreDashboardLayout) | ✅ 서비스별 config |
| **Shared Utils** | `auto-listing.utils.ts` | ✅ service_code 기반 |
| **Entity Model** | `organization_product_listings.service_key` | ✅ 파라미터화 |
| **Entity Model** | `organization_channels` + `organization_product_channels` | ✅ 서비스 무관 |
| **Entity Model** | `organization_service_enrollments` | ✅ 서비스 바인딩 |

### C-2. Core 후보 (추출 필요)

| 구성요소 | 현재 위치 | Core 추출 시 효과 |
|---------|----------|------------------|
| `store-hub.controller.ts` | `o4o-store/controllers/` | ✅ 이미 공유 위치, 리네임만 필요 |
| `pharmacy-products.controller.ts` | `o4o-store/controllers/` | ✅ 이미 공유 위치 |
| GlycoPharm `store.controller.ts` | `glycopharm/controllers/` | ⚠️ service_key 파라미터화 후 unified로 흡수 가능 |

### C-3. Core 외부 유지 (서비스 고유)

| 구성요소 | 서비스 | 이유 |
|---------|-------|------|
| `cosmetics-store.controller.ts` | K-Cosmetics | 독립 스키마 (`cosmetics_*`), Scope 기반 접근 |
| Neture Supplier/Partner routes | Neture | B2B 구조, Store HUB 직접 소비자 아님 |
| GlycoPharm Cockpit (`useStoreHub`) | GlycoPharm | 서비스 고유 대시보드 집계 |

---

## D. 핵심 발견사항

### D-1. GlycoPharm service_key 하드코딩 (Critical)

**문제:**
`glycopharm/controllers/store.controller.ts`의 `queryVisibleProducts()` 함수가 `service_key = 'kpa'`를 하드코딩하고 있다.

```sql
-- store.controller.ts L116, L153, L271
AND opl.service_key = 'kpa'   -- ← 하드코딩
```

**영향:**
1. GlycoPharm 매장에서 `service_key='glycopharm'` 상품을 볼 수 없음
2. GlycoPharm 전용 상품/카테고리 구분 불가
3. Unified Store Public API와 동작 불일치 (unified는 파라미터화)

**권장 수정:**
```sql
-- Before (하드코딩)
AND opl.service_key = 'kpa'

-- After (파라미터화)
AND opl.service_key = $N   -- pharmacy의 service enrollment에서 resolve
```

또는 `unified-store-public.routes.ts`의 `queryVisibleProducts()`를 재사용하여 중복 제거.

### D-2. Cosmetics 독립 스키마 (Design Decision)

**현황:** Cosmetics는 `cosmetics_*` prefix 독립 스키마를 사용하며, `organization_product_listings`를 공유하지 않는다.

**이유:** `COSMETICS-DOMAIN-RULES.md`에 의한 의도적 설계. Cosmetics는 brand/line/variant 기반 상품 구조를 가지며, KPA/GlycoPharm의 supplier_product_offers 기반 구조와 다르다.

**판정:** 이는 **의도적 아키텍처 결정**이며, 무리한 통합은 오히려 복잡성을 증가시킨다. Slug 기반 Public 진입과 Checkout만 공유하는 현재 구조가 적절하다.

### D-3. Store HUB Controller의 서비스 무관 집계 (Good Pattern)

`store-hub.controller.ts`의 KPI 및 채널 메트릭 쿼리는 service_key로 필터링하지 않는다. 이는 **의도적 설계**이다:
- 약국(Organization)은 여러 service에 동시 가입 가능 (KPA + GlycoPharm)
- Store HUB는 모든 서비스의 상품/채널을 통합 표시
- KPI는 서비스 구분 없이 매장 전체 성과를 보여줌

### D-4. auto-listing의 service_code 기반 동작 (Excellent)

`auto-listing.utils.ts`는 `organization_service_enrollments.service_code`를 사용하여 서비스 바인딩을 동적으로 해석한다. 하드코딩 없이 새 서비스 추가 시 enrollment만 등록하면 자동 분배가 동작한다.

```
새 서비스 추가 시:
1. SERVICE_KEYS에 상수 추가
2. organization_service_enrollments에 enrollment 등록
3. auto-listing이 자동으로 해당 서비스 org에 listing 생성
```

### D-5. Slug 시스템의 완전한 서비스 무관성 (Excellent)

`PlatformStoreSlug`는 `serviceKey`를 저장하지만, slug 자체는 플랫폼 전역 unique이다. 어떤 서비스든 slug 하나로 매장을 식별할 수 있다. 301 redirect 지원으로 slug 변경도 안전하게 처리된다.

---

## E. Core 추출 필요성 판정

### 질문 1: Store HUB가 서비스 간 일관된 Core Pattern인가?

**답: Yes (80%).** Unified Public API, Slug System, Channel Model, auto-listing, store-ui-core가 이미 서비스 무관하게 동작한다. GlycoPharm의 하드코딩 3건만 수정하면 95%까지 올라간다.

### 질문 2: 서비스별 차이점은 무엇인가?

| 차이점 | 범위 | 해결 방법 |
|--------|------|----------|
| GlycoPharm service_key 하드코딩 | Controller 3곳 | 파라미터화 (WO 1건) |
| Cosmetics 독립 스키마 | 의도적 설계 | 유지 (통합 불필요) |
| GlycoPharm 독자 store.controller | Legacy 매장 페이지 | Unified 흡수 가능 (WO 1건) |
| Block Engine vs API-driven 매장 | 프론트엔드 | 점진적 Block Engine 확산 |

### 질문 3: Core + Extension 경계는 어디인가?

```
┌─────────────────────────────────────────────────────────────────┐
│  STORE CORE (서비스 무관)                                        │
│                                                                 │
│  Platform Layer:                                                │
│    unified-store-public.routes.ts  (Public Storefront API)      │
│    store-policy.routes.ts          (Policy + Payment)           │
│    store-local-product.routes.ts   (Display Domain)             │
│    store-tablet.routes.ts          (Tablet Channel)             │
│    StoreSlugService                (Identity)                   │
│                                                                 │
│  Shared Controllers:                                            │
│    store-hub.controller.ts         (HUB Dashboard + KPI)        │
│    pharmacy-products.controller.ts (B2B Catalog + Listings)     │
│                                                                 │
│  Entity Model:                                                  │
│    organization_product_listings   (service_key 파라미터화)       │
│    organization_channels           (4 channel types)            │
│    organization_product_channels   (listing ↔ channel 매핑)     │
│    organization_service_enrollments (서비스 바인딩)               │
│    platform_store_slugs            (slug registry)              │
│                                                                 │
│  Shared Package:                                                │
│    @o4o/store-ui-core              (Dashboard Layout + Config)  │
│                                                                 │
│  Utilities:                                                     │
│    auto-listing.utils.ts           (자동 상품 분배)               │
│    constants/service-keys.ts       (서비스 키 상수)               │
├─────────────────────────────────────────────────────────────────┤
│  SERVICE EXTENSIONS (서비스 고유)                                 │
│                                                                 │
│  KPA:        Block Engine StorefrontHomePage                    │
│  GlycoPharm: Cockpit useStoreHub, AI Summary, Today Actions    │
│  Cosmetics:  독립 cosmetics_* 스키마, Scope 기반 접근            │
│  Neture:     B2B Supplier/Partner 구조, 유통 엔진               │
│  GlucoseView: 최소 대시보드 (dashboard + settings only)          │
└─────────────────────────────────────────────────────────────────┘
```

### 질문 4: Store HUB Core 추출이 필요한가?

**답: 추출보다는 정비가 필요하다.**

이미 대부분 Core 위치(`routes/platform/`, `routes/o4o-store/`, `packages/store-ui-core/`)에 존재한다. 신규 추출보다는:

1. **GlycoPharm 하드코딩 제거** (WO 1건, 영향 최소)
2. **GlycoPharm store.controller.ts → Unified 흡수** (WO 1건)
3. **Freeze 선언** (Store Core 경계 확정)

이 3건으로 "새 서비스 → Store HUB 자동 사용" 패턴이 완성된다.

---

## F. Store HUB Core 정비 후 사라지는 개발 작업

| 기존 작업 | 소요 (추정) | Core 정비 후 |
|----------|:-----------:|-------------|
| 새 서비스 매장 컨트롤러 작성 | 3-5일 | **불필요** — Store HUB Controller 재사용 |
| 새 서비스 상품 목록 API 작성 | 2-3일 | **불필요** — pharmacy-products.controller 재사용 |
| 새 서비스 매장 공개 페이지 API | 3-5일 | **불필요** — unified-store-public.routes 재사용 |
| 새 서비스 채널 관리 구현 | 2-3일 | **불필요** — organization_channels 공유 |
| 새 서비스 KPI 대시보드 | 2-3일 | **불필요** — store-hub KPI 자동 집계 |
| 새 서비스 프론트엔드 대시보드 | 2-3일 | **1일** — store-ui-core config 1개 추가 |
| 새 서비스 매장 정책/결제 | 2-3일 | **불필요** — store-policy.routes 재사용 |
| 새 서비스 상품 자동 분배 | 1-2일 | **불필요** — auto-listing + enrollment 자동 |
| 새 서비스 slug 시스템 | 1-2일 | **불필요** — PlatformStoreSlug 재사용 |
| **합계** | **18-29일** | **1일** (config 추가만) |

> **Core 정비 후 새 서비스 Store HUB 추가: 18-29일 → 1일**

---

## G. 후속 WO 제안

### WO-1: GlycoPharm service_key 파라미터화 (Priority: High)

```
대상: apps/api-server/src/routes/glycopharm/controllers/store.controller.ts
작업:
  1. queryVisibleProducts()의 'kpa' → 파라미터 변수로 변경
  2. 또는 unified-store-public.routes.ts의 queryVisibleProducts() 재사용
예상 영향: 최소 (같은 'kpa' 값이 파라미터로 전달될 뿐)
위험도: Low
```

### WO-2: GlycoPharm Legacy Store Controller 통합 (Priority: Medium)

```
대상: glycopharm/controllers/store.controller.ts → unified 흡수
작업:
  1. GlycoPharm 전용 매장 페이지를 unified 기반으로 전환
  2. store.controller.ts의 고유 기능(categories 등) unified로 이관
  3. 레거시 라우트 deprecation
예상 영향: GlycoPharm 매장 프론트엔드 수정 필요
위험도: Medium
```

### WO-3: Store Core Freeze 선언 (Priority: High)

```
대상: docs/baseline/STORE-CORE-FREEZE-V2.md (신규)
작업:
  1. Store Core 경계 확정 (Section E 기준)
  2. Core 변경 시 WO 필수 규칙 선언
  3. 새 서비스 추가 체크리스트 문서화
의존: WO-1 완료 후
```

---

## H. 결론

1. **Store HUB는 이미 사실상 Core이다.** 별도 "추출" 작업 없이 정비만으로 Core 완성도 95%+ 달성 가능.

2. **GlycoPharm service_key 하드코딩이 유일한 Critical 이슈.** 3곳 파라미터화로 해결.

3. **Cosmetics 독립 스키마는 의도적 설계.** 무리한 통합은 복잡성만 증가시킨다. Slug + Checkout 수준의 공유가 적절.

4. **새 서비스 추가 비용: 18-29일 → 1일.** Core 정비 후 `SERVICE_KEYS` 상수 + `store-ui-core` config + `organization_service_enrollments` enrollment 등록만으로 Store HUB 전체 기능을 사용할 수 있다.

---

*Investigation Complete: 2026-03-08*
*Files Analyzed: 15+ across 4 services*
*Hardcoding Issues Found: 3 (Critical)*
*Recommended Follow-up WOs: 3*
