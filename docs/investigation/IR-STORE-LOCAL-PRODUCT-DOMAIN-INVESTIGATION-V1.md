# IR-STORE-LOCAL-PRODUCT-DOMAIN-INVESTIGATION-V1

> **Investigation Report: StoreLocalProduct & Tablet Display Domain 구조 조사**
> Date: 2026-02-24
> Status: Complete
> Scope: Read-only audit (코드 변경 없음)
> Method: Source code static analysis (4개 병렬 조사 수행)

---

## Executive Summary

O4O 플랫폼에 **StoreLocalProduct(매장 자체 상품) + Tablet 전용 Display Domain**을 추가하기 전,
기존 Core 및 Product/Channel/KPI/RBAC 구조와의 충돌 여부를 전수 조사하였다.

### 핵심 판정

> **StoreLocalProduct는 Commerce Object가 아니다.**
> **StoreLocalProduct는 Store Private Display Domain이다.**

이 선언은 **구조적으로 안전하게 구현 가능**하다.
단, 기존 Commerce 인프라(Checkout, EcommerceOrder, KPI)와의 경계를 명확히 분리해야 한다.

| 영역 | 안전성 등급 | 비고 |
|------|:----------:|------|
| Core 영향 | **Safe** | Frozen Core 변경 불필요 |
| Product Domain 충돌 | **Caution** | 네임스페이스 분리 필수 |
| Channel 구조 | **Safe** | 기존 패턴 재사용 가능 |
| KPI 오염 | **Caution** | getTopProducts() 격리 필요 |
| RBAC/멀티테넌트 | **Safe** | 기존 격리 패턴 완전 재사용 |

---

## A. Product Domain 조사 결과

### A-1. 구조 요약

현재 Product Domain은 **서비스별 격리된 3개 제품 스키마** + **공유 유통 인프라**로 구성된다.

```
┌─────────────────────────────────────────────────────────────────┐
│                    ECOMMERCE CORE (Universal)                    │
│  EcommerceOrder (OrderType: RETAIL)                              │
│  └── EcommerceOrderItem (productId: UUID, productName: snapshot) │
│      metadata.serviceKey = 'glycopharm' | 'cosmetics'           │
└─────────┬───────────────────────────────────┬───────────────────┘
          │                                   │
          ▼                                   ▼
┌─────────────────────┐          ┌─────────────────────────┐
│ GLYCOPHARM DOMAIN   │          │ COSMETICS DOMAIN        │
│ glycopharm_products │          │ cosmetics_products      │
│ ├─ pharmacy_id      │          │ ├─ brand_id, line_id    │
│ ├─ status (4-enum)  │          │ ├─ status (4-enum)      │
│ └─ stock_quantity   │          │ └─ variants (JSONB)     │
│                     │          │                         │
│ SCHEMA: public      │          │ SCHEMA: cosmetics       │
└────────┬────────────┘          └────────┬────────────────┘
         │                                │
         │ external_product_id            │ product_id
         ▼                                ▼
┌────────────────────────────┐  ┌────────────────────────────┐
│ OrganizationProductListing │  │ CosmeticsStoreListing      │
│ (공유 유통 인프라)          │  │ (격리 스키마)               │
│ ├─ organization_id (FK)    │  │ ├─ store_id (FK)           │
│ ├─ service_key='kpa'       │  │ ├─ priceOverride           │
│ ├─ retail_price            │  │ └─ isVisible               │
│ └─ is_active               │  └────────────────────────────┘
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ OrganizationProductChannel     │
│ ├─ channel_id (FK)             │
│ ├─ sales_limit (FOR UPDATE)    │
│ └─ channel_price (override)    │
└────────────────────────────────┘

┌────────────────────────────────┐
│ SUPPLY LAYER                   │
│ NetureSupplierProduct          │
│ ├─ distributionType            │
│ │   (PUBLIC | PRIVATE)         │
│ ├─ allowedSellerIds            │
│ └─ purpose (CATALOG|           │
│    APPLICATION|ACTIVE_SALES)   │
└────────────────────────────────┘
```

### A-2. 전체 Product 관련 Entity 목록

| Entity | Table | Schema | Service | 핵심 역할 |
|--------|-------|--------|---------|-----------|
| GlycopharmProduct | `glycopharm_products` | public | Glycopharm | 혈당 관련 상품 |
| CosmeticsProduct | `cosmetics_products` | cosmetics | Cosmetics | K-화장품 |
| NetureProduct | `neture_products` | neture | Neture | 파트너 건강 상품 |
| NetureSupplierProduct | `neture_supplier_products` | public | Neture | 공급자 카탈로그 (유통 정책 정의) |
| OrganizationProductListing | `organization_product_listings` | public | KPA | 약국별 상품 리스팅 |
| OrganizationProductApplication | `organization_product_applications` | public | KPA | 상품 신청 |
| OrganizationProductChannel | `organization_product_channels` | public | KPA | 채널별 상품 설정 |
| CosmeticsStoreListing | `cosmetics_store_listings` | cosmetics | Cosmetics | 매장별 상품 노출 |
| Product (stub) | `products` | public | — | DEPRECATED, 미사용 |

### A-3. Checkout 연결 흐름도

**GlycoPharm (7-step + Distribution Hardening):**
```
POST /glycopharm/checkout
├─ 1. OrganizationStore 활성 확인
├─ 2. Supply contract 검증 (neture_supplier_requests)
├─ 3. B2C channel 승인 확인 (organization_channels)
├─ 4. GlycopharmProduct 로드 + status='active' + stock 확인
├─ 5. Distribution policy 검증 (neture_supplier_products.distributionType)
├─ 6. Channel mapping 검증 (org_product_channels + org_product_listings)
├─ 7. Sales limit FOR UPDATE → EcommerceOrder 생성
└─ FK chain: EcommerceOrderItem.productId → GlycopharmProduct.id
```

**Cosmetics (Product Validation):**
```
POST /cosmetics/orders
├─ 1. Supply contract 검증 (CheckoutGuard)
├─ 2. Product availability (cosmetics_store_listings + cosmetics_products)
├─ 3. EcommerceOrder 생성 (OrderType.RETAIL, metadata.serviceKey='cosmetics')
└─ FK chain: EcommerceOrderItem.productId → CosmeticsProduct.id
```

### A-4. StoreLocalProduct 충돌 예상 지점

| 충돌 지점 | 현재 구조 | 위험도 | 분석 |
|-----------|----------|:------:|------|
| **Product ID 네임스페이스** | `external_product_id`가 공급자 상품 ID를 가정 | **Caution** | 별도 테이블 사용 시 충돌 없음 |
| **EcommerceOrderItem.productId** | 공급자 상품 UUID를 가정, FK 제약 없음 | **Caution** | Display Domain이면 Checkout 진입 자체가 불필요 |
| **Checkout validation** | GlycopharmProduct / CosmeticsProduct 기준 검증 | **Safe** | Display Domain은 Checkout 경로 없음 |
| **Distribution policy** | NetureSupplierProduct 기반 | **Safe** | LocalProduct는 유통 정책 대상 아님 |
| **Sales limit** | OrganizationProductChannel 기반 FOR UPDATE | **Safe** | Display Domain은 주문 없음 |
| **Supply contract** | neture_supplier_requests 기반 | **Safe** | LocalProduct는 공급자 계약 불필요 |

### A-5. 판정

**StoreLocalProduct를 Display Domain으로 정의하면, 기존 Commerce 인프라와의 충돌이 원천 차단된다.**
- Checkout 경로 진입 불가 → EcommerceOrder 오염 없음
- 별도 테이블 사용 → Product ID 네임스페이스 분리
- OrganizationProductListing/Channel 인프라 비사용 → 유통 정책 무관

---

## B. Channel 구조 조사 결과

### B-1. 현재 Channel Type 정의

`OrganizationChannelType` (organization-channel.entity.ts):

```typescript
'B2C' | 'KIOSK' | 'TABLET' | 'SIGNAGE'
```

### B-2. Commerce vs Display 채널 분류

| 분류 | 채널 | 목적 | Checkout 연결 | 상태 |
|------|------|------|:------------:|------|
| **Commerce** | B2C | 온라인 스토어프론트 | ✅ 있음 | 구현 완료 |
| **Commerce** | KIOSK | 매장 결제 키오스크 | 미정 | enum만 정의 |
| **Display** | TABLET | 매장 태블릿 (서비스 요청) | ❌ 없음 | 구현 완료 |
| **Display** | SIGNAGE | 디지털 사이니지 | ❌ 없음 | 구현 완료 (CMS 모델) |

### B-3. 4중 게이트 패턴 (Visibility Gate)

B2C와 TABLET 모두 동일한 4중 게이트를 사용한다:

```sql
glycopharm_products p
  INNER JOIN organization_product_listings opl
    ON opl.external_product_id = p.id::text
    AND opl.organization_id = $1 AND opl.is_active = true
  INNER JOIN organization_product_channels opc
    ON opc.product_listing_id = opl.id AND opc.is_active = true
  INNER JOIN organization_channels oc
    ON oc.id = opc.channel_id
    AND oc.channel_type = '{{CHANNEL_TYPE}}'
    AND oc.status = 'APPROVED'
WHERE p.pharmacy_id = $1 AND p.status = 'active'
```

| 게이트 | 테이블 | 조건 |
|--------|--------|------|
| Gate 1 | `glycopharm_products` | `status = 'active'` |
| Gate 2 | `organization_product_listings` | `is_active = true` |
| Gate 3 | `organization_product_channels` | `is_active = true` |
| Gate 4 | `organization_channels` | `channel_type = X AND status = 'APPROVED'` |

### B-4. Tablet 현재 구현 상태

**Tablet은 이미 Display Channel로 구현되어 있다:**

```
Public (no auth):
  GET  /:slug/tablet/products           — 상품 카탈로그 (4중 게이트)
  POST /:slug/tablet/requests           — 서비스 요청 생성 (Rate limit: 10/10min)
  GET  /:slug/tablet/requests/:id       — 요청 상태 확인

Staff (auth required):
  GET  /:slug/tablet/staff/requests     — 대기 요청 목록 (polling)
  PATCH /:slug/tablet/staff/requests/:id — 상태 전이 (acknowledged → served/cancelled)
```

**핵심:** `TabletServiceRequest`는 **Order가 아니다** (별도 `tablet_service_requests` 테이블).

**상태 머신:**
```
requested → acknowledged → served (완료)
                         → cancelled (취소)
```

### B-5. Channel 추상화 레이어 분석

| 추상화 수준 | 존재 여부 | 설명 |
|-------------|:---------:|------|
| 채널 타입 정의 | ✅ 있음 | `OrganizationChannelType` enum |
| 채널 승인 생명주기 | ✅ 있음 | 6-status enum (PENDING → APPROVED → ...) |
| 채널-상품 매핑 | ✅ 있음 | `organization_product_channels` 테이블 |
| **쿼리 추상화** | ❌ 없음 | 채널별 별도 함수 (queryVisibleProducts, queryTabletVisibleProducts) |
| **채널 팩토리** | ❌ 없음 | 새 채널 추가 시 코드 변경 필요 |

### B-6. Signage 구조

Signage는 **완전히 별도 데이터 모델** (CMS 기반 플레이리스트)을 사용한다:
- `signage_media`, `signage_playlists` 테이블
- Product 4중 게이트와 무관
- CMS 콘텐츠 → 미디어 스케줄링 방식

### B-7. StoreLocalProduct + Tablet Display Domain 적합성

**결론: 기존 TABLET 패턴을 그대로 재사용할 수 있다.**

| 항목 | TABLET (현재) | StoreLocalProduct + Tablet Display (제안) |
|------|--------------|------------------------------------------|
| 상품 소스 | GlycopharmProduct (공급자) | StoreLocalProduct (매장 자체) |
| 게이트 | 4중 게이트 (공급자 인프라) | **별도 게이트 필요** (자체 상품 테이블) |
| 요청 엔티티 | TabletServiceRequest | 동일 또는 확장 가능 |
| Checkout | ❌ 없음 | ❌ 없음 (Display Domain) |
| 정렬 | sort_order ASC | sort_order ASC |

**핵심 차이점:** StoreLocalProduct는 공급자 인프라(OrganizationProductListing, Channel)를 **사용하지 않는다.**
대신 자체 테이블에서 직접 조회한다. 이것이 "Store Private Display Domain"의 의미이다.

---

## C. KPI 영향 분석

### C-1. KPI 집계 구조

```
┌─────────────────────────┐     ┌─────────────────────────┐
│  KPA Store Hub          │     │  StoreSummaryEngine      │
│  (store-hub.controller) │     │  (@o4o/store-core)       │
│                         │     │                          │
│  checkout_orders 기반    │     │  ecommerce_orders 기반   │
│  ├─ todayOrders         │     │  ├─ getOrderStats()      │
│  ├─ monthRevenue        │     │  ├─ getTopProducts()     │
│  └─ avgOrderValue       │     │  ├─ getChannelBreakdown()│
│                         │     │  └─ getRecentOrders()    │
│  TTL: 30s cache         │     │  TTL: 60s cache          │
└─────────────────────────┘     └─────────────────────────┘
```

### C-2. product_id 기반 집계 분석

| KPI 쿼리 | 테이블 | product_id 사용 | StoreLocalProduct 오염 위험 |
|-----------|--------|:--------------:|:-------------------------:|
| ORDER_COUNT | `checkout_orders` | ❌ 미사용 | **없음** |
| ORDER_STATS (매출) | `checkout_orders` | ❌ 미사용 | **없음** |
| getOrderStats() | `ecommerce_orders` | ❌ 미사용 | **없음** |
| getChannelBreakdown() | `ecommerce_orders` | ❌ 미사용 | **없음** |
| getRecentOrders() | `ecommerce_orders` | ❌ 미사용 | **없음** |
| **getTopProducts()** | `ecommerce_order_items` | ✅ **GROUP BY productId** | **⚠️ HIGH** |
| Hub Channel KPI | `org_product_channels` + `glycopharm_products` | ✅ LEFT JOIN | **없음** (NULL 필터) |

### C-3. 핵심 위험: getTopProducts() 오염

```sql
-- 현재 쿼리 (glycopharm-store-data.adapter.ts, cosmetics-store-summary.service.ts)
SELECT
  oi."productId", oi."productName",
  SUM(oi.quantity)::int as quantity,
  SUM(oi.subtotal)::numeric as revenue
FROM ecommerce_order_items oi
INNER JOIN ecommerce_orders o ON o.id = oi."orderId"
WHERE o.store_id = $1 AND o."createdAt" >= $2 AND o.status != 'cancelled'
GROUP BY oi."productId", oi."productName"
ORDER BY revenue DESC LIMIT $3
```

**오염 시나리오:**
- StoreLocalProduct가 EcommerceOrder를 통해 주문 생성 시, `ecommerce_order_items`에 삽입됨
- `getTopProducts()` GROUP BY에 StoreLocalProduct가 포함됨
- "인기 상품" 목록에 공급자 상품과 매장 자체 상품이 혼재

### C-4. KPI 오염 판정

| 조건 | 오염 여부 | 근거 |
|------|:---------:|------|
| StoreLocalProduct = **Display Domain** (Checkout 미진입) | **오염 없음** | EcommerceOrderItem에 삽입되지 않음 |
| StoreLocalProduct = Commerce Object (Checkout 진입) | **오염 있음** | getTopProducts()에 혼입 |

**결론:** StoreLocalProduct를 Display Domain으로 정의하면 KPI 오염이 **원천 차단**된다.
만약 향후 Commerce로 전환할 경우, `ecommerce_order_items`에 `productType` 컬럼 추가가 필요하다.

### C-5. Insight Rules 영향

`@o4o/store-core`의 Insight Rules:

| Rule | getTopProducts() 의존 | Display Domain 시 영향 |
|------|:--------------------:|:---------------------:|
| revenueRule | ❌ | 없음 |
| channelRule | ❌ | 없음 |
| **productRule** | ✅ | **없음** (Checkout 미진입이므로) |
| activityRule | ❌ | 없음 |

---

## D. RBAC / 멀티테넌트 분석

### D-1. organizationId 격리 메커니즘

| 레이어 | 메커니즘 | 상세 |
|--------|---------|------|
| **인증** | `requireAuth()` → JWT 검증 → User 로드 | JWT에 org_id 미포함 (DB에서 조회) |
| **조직 추출** | `getUserOrganizationId(userId)` → KpaMember 조회 | 요청마다 DB 조회 (토큰 스푸핑 방지) |
| **쿼리 스코프** | `WHERE organization_id = $1` 필수 | 모든 product 쿼리에 적용됨 |
| **교차 테넌트** | `TenantAwareRepository` + `preventCrossTenantAccess()` | 리소스 소유권 검증 |
| **Body 검증** | `validateBodyTenant()` | request body의 org_id 주입 차단 |

### D-2. 공격 벡터 차단 현황

| 공격 벡터 | 차단 여부 | 메커니즘 |
|-----------|:---------:|---------|
| URL 파라미터 org_id 조작 | ✅ 차단 | 라우트에 org_id 파라미터 미존재 |
| Request body org_id 주입 | ✅ 차단 | `validateBodyTenant()` |
| JWT org_id 스푸핑 | ✅ 차단 | org_id를 DB에서 실시간 조회 |
| SQL injection on org_id | ✅ 차단 | 파라미터화 쿼리 ($1, $2) |
| 교차 서비스 역할 우회 | ✅ 차단 | `kpa:admin` ≠ `glycopharm:admin` |
| 스코프 없는 글로벌 쿼리 | ✅ 없음 | 전수 조사에서 미발견 |

### D-3. StoreLocalProduct 격리 가능성 평가

**판정: ✅ 완전 격리 가능**

기존 패턴을 그대로 재사용하면 된다:

```
1. Entity: organization_id (UUID FK) 컬럼 + 인덱스
2. Middleware: getUserOrganizationId() 패턴 재사용
3. Query: WHERE organization_id = $1 필수 적용
4. Auth: requirePharmacyOwner 또는 requireOrgRole('admin')
5. Body: validateBodyTenant('organization_id')
6. Cross-tenant: preventCrossTenantAccess() 적용
```

### D-4. store_id 필터 적용 위치 목록

| 컨트롤러 | 엔드포인트 | 필터 방식 | 검증 |
|----------|-----------|----------|:----:|
| pharmacy-products | GET /catalog | organization_id = $1 | ✅ |
| pharmacy-products | POST /apply | organization_id = $1 | ✅ |
| pharmacy-products | GET /listings | organization_id = $1 | ✅ |
| pharmacy-products | PUT /listings/:id | organization_id = $1 | ✅ |
| store-hub | GET /overview | organizationId | ✅ |
| store-hub | GET /channels | organizationId | ✅ |
| unified-store-public | GET /:slug/products | pharmacy_id = $1 | ✅ |
| unified-store-public | GET /:slug/tablet/products | pharmacy_id = $1 | ✅ |
| unified-store-public | POST /:slug/tablet/requests | pharmacy_id | ✅ |

---

## E. 종합 판정

### E-1. Core 영향 여부

| Frozen Core | 변경 필요 여부 | 근거 |
|-------------|:------------:|------|
| `@o4o/security-core` | **불필요** | 기존 RBAC 패턴 재사용 |
| `@o4o/hub-core` | **불필요** | Hub 레이아웃 변경 없음 |
| `@o4o/store-core` | **불필요** | KPI 엔진 변경 없음 (Display Domain이므로) |
| `@o4o/store-ui-core` | **불필요** | Shell 레이아웃 변경 없음 |
| `@o4o/store-asset-policy-core` | **불필요** | Snapshot 정책 무관 |
| `cms-core` | **불필요** | CMS 구조 무관 |
| `auth-core` | **불필요** | 인증 구조 변경 없음 |
| `ecommerce-core` | **불필요** | Checkout 미진입 (Display Domain) |

**판정: Core 변경 제로.**

### E-2. 구조 안전성 등급

| 영역 | 등급 | 근거 |
|------|:----:|------|
| Product Domain | **Safe** | 별도 테이블, 기존 인프라 비사용 |
| Channel 구조 | **Safe** | TABLET 패턴 재사용, 또는 독립 Display 경로 |
| KPI 오염 | **Safe** | Display Domain → EcommerceOrder 미진입 → 오염 원천 차단 |
| RBAC 격리 | **Safe** | 기존 organization_id 격리 패턴 완전 재사용 |
| Checkout 충돌 | **Safe** | Display Domain → Checkout 경로 없음 |
| Core Freeze 준수 | **Safe** | Frozen Core 변경 불필요 |

### E-3. 아키텍처 결정 요약

```
┌──────────────────────────────────────────────────────────────────┐
│                  StoreLocalProduct 아키텍처 결정                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ✅ Display Domain으로 정의                                       │
│  ├─ Checkout 진입 불가 (Commerce Object 아님)                     │
│  ├─ EcommerceOrder 생성 불가                                      │
│  ├─ 공급자 유통 인프라(Listing/Channel) 비사용                     │
│  └─ KPI 집계 대상 아님                                            │
│                                                                  │
│  ✅ 별도 테이블 (store_local_products)                             │
│  ├─ organization_id FK (멀티테넌트 격리)                           │
│  ├─ 기존 product 테이블과 완전 분리                                │
│  └─ Product ID 네임스페이스 충돌 없음                              │
│                                                                  │
│  ✅ Tablet Display 경로                                           │
│  ├─ 기존 TABLET 채널의 product 쿼리를 참조하되                     │
│  │   4중 게이트 대신 자체 단순 게이트 사용                          │
│  ├─ TabletServiceRequest 재사용 또는 확장                          │
│  └─ 공급자 상품과 매장 자체 상품이 별도 쿼리로 분리됨               │
│                                                                  │
│  ❌ 금지 사항                                                      │
│  ├─ StoreLocalProduct → EcommerceOrder 직접 연결                   │
│  ├─ StoreLocalProduct → OrganizationProductListing 등록             │
│  ├─ StoreLocalProduct → OrganizationProductChannel 등록             │
│  └─ StoreLocalProduct → Checkout controller 진입                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### E-4. 다음 단계 권장

| 순서 | 작업 | 산출물 |
|:----:|------|--------|
| 1 | ERD 확정 | `store_local_products` 테이블 설계 |
| 2 | Display Gate 설계 | 자체 상품용 단순 게이트 (organization_id + is_active) |
| 3 | Tablet Display 경로 설계 | 공급자 상품 / 자체 상품 분리 쿼리 |
| 4 | WO 작성 | 개발 Work Order (Entity + Migration + Controller + Routes) |
| 5 | 구현 | 조사 → 문제확정 → 최소 수정 → 검증 → 종료 |

---

## 부록: 주요 파일 참조

### Product Domain
| 파일 | 역할 |
|------|------|
| `routes/glycopharm/entities/glycopharm-product.entity.ts` | GlycopharmProduct 정의 |
| `routes/cosmetics/entities/cosmetics-product.entity.ts` | CosmeticsProduct 정의 |
| `modules/neture/entities/NetureSupplierProduct.entity.ts` | 공급자 상품 + 유통 정책 |
| `routes/kpa/entities/organization-product-listing.entity.ts` | 매장 리스팅 |
| `routes/kpa/entities/organization-product-channel.entity.ts` | 채널 매핑 + sales_limit |
| `packages/ecommerce-core/src/entities/EcommerceOrder.entity.ts` | 주문 엔티티 |
| `packages/ecommerce-core/src/entities/EcommerceOrderItem.entity.ts` | 주문 항목 |

### Channel & Storefront
| 파일 | 역할 |
|------|------|
| `routes/kpa/entities/organization-channel.entity.ts` | 채널 타입/상태 정의 |
| `routes/platform/unified-store-public.routes.ts` | B2C + TABLET 4중 게이트 쿼리 |
| `routes/glycopharm/controllers/tablet.controller.ts` | Tablet 서비스 요청 |
| `routes/glycopharm/entities/tablet-service-request.entity.ts` | TabletServiceRequest 엔티티 |
| `routes/platform/store-policy.routes.ts` | 채널 활성화 |

### Checkout
| 파일 | 역할 |
|------|------|
| `routes/glycopharm/controllers/checkout.controller.ts` | GlycoPharm 7-step validation |
| `core/checkout/checkout-guard.service.ts` | Supply contract 검증 |
| `routes/cosmetics/controllers/cosmetics-order.controller.ts` | Cosmetics 주문 |

### KPI
| 파일 | 역할 |
|------|------|
| `routes/kpa/controllers/store-hub.controller.ts` | Hub KPI 집계 |
| `routes/glycopharm/services/glycopharm-store-data.adapter.ts` | GlycoPharm KPI 어댑터 |
| `routes/cosmetics/services/cosmetics-store-summary.service.ts` | Cosmetics KPI 어댑터 |
| `packages/store-core/src/insights.engine.ts` | Insight Rules 엔진 |

### RBAC
| 파일 | 역할 |
|------|------|
| `middleware/auth.middleware.ts` | 인증 미들웨어 |
| `middleware/tenant-isolation.middleware.ts` | 교차 테넌트 차단 |
| `middleware/tenant-context.middleware.ts` | 테넌트 컨텍스트 추출 |
| `routes/kpa/middleware/kpa-org-role.middleware.ts` | KPA 조직 역할 검증 |

---

*Investigation completed: 2026-02-24*
*Auditor: Claude Code (AI-assisted static analysis)*
*Method: Source code static analysis only (4 parallel agents, no DB access, no runtime test)*
*코드 변경: 없음*
