# IR-O4O-STORE-LISTING-CHANNEL-FLOW-V1

> **Investigation Report — 매장 HUB → Listing → Channel → Storefront 흐름 검증**
> Date: 2026-03-09
> Status: Complete
> Scope: KPA-a / KPA-b / KPA-c 매장 상품 운영 흐름

---

## Executive Summary

O4O 플랫폼의 **매장 상품 운영 루프**(Supplier → Store → Channel → Customer)를 전수 조사한 결과:

| 단계 | 판정 | 비고 |
|------|------|------|
| HUB 카탈로그 표시 | **PASS** | API 존재, SQL 정상, PUBLIC/SERVICE 필터 동작 |
| Listing 활성화 | **PASS** | PUT /listings/:id API 존재, is_active 토글 정상 |
| Channel 등록 | **PASS** | POST /store-hub/channels + POST /:channelId (B2C/KIOSK) |
| Storefront 노출 | **PASS (조건부)** | 4-Layer Visibility Gate 정상, **단 KPA slug 미등록 문제 존재** |

### CRITICAL FINDING

**KPA 매장은 `platform_store_slugs` 테이블에 slug이 등록되지 않는다.**
- BackfillPlatformStoreSlugs 마이그레이션은 glycopharm/cosmetics만 처리
- KPA 서비스에는 `reserveSlug()` 호출 코드 부재
- **결과**: `/api/v1/stores/:slug/products` 공개 Storefront API에서 KPA 매장 접근 불가
- **영향**: B2C 채널을 통한 일반 소비자 상품 노출이 동작하지 않음

---

## 1. 검증 1: HUB 카탈로그 → Listing 활성화

### 1.1 HUB 카탈로그 API

**Endpoint**: `GET /api/v1/kpa/pharmacy/products/catalog`
**File**: `apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts:57-146`
**Auth**: `requireAuth` + `requirePharmacyOwner`

**SQL 핵심**:
```sql
FROM supplier_product_offers spo
JOIN product_masters pm ON pm.id = spo.master_id
JOIN neture_suppliers s ON s.id = spo.supplier_id
WHERE spo.distribution_type IN ('PUBLIC', 'SERVICE')
  AND spo.is_active = true
  AND s.status = 'ACTIVE'
```

**필터링 조건**:
- ✅ PUBLIC + SERVICE 제품만 표시
- ✅ is_active = true (승인된 제품만)
- ✅ Supplier ACTIVE 상태만
- ✅ 사용자별 신청/승인/진열 상태 3개 boolean 포함 (isApplied, isApproved, isListed)
- ✅ Pagination (limit/offset)

**판정**: **PASS**

### 1.2 Listing 활성화 API

**Endpoint**: `PUT /api/v1/kpa/pharmacy/products/listings/:id`
**File**: `pharmacy-products.controller.ts:270-311`
**Auth**: `requireAuth` + `requirePharmacyOwner`

**Request Body**:
```json
{ "service_key": "kpa", "isActive": true }
```

**동작**:
1. listingRepo.findOne({ id, organization_id, service_key })
2. listing.is_active = isActive
3. listingRepo.save(listing)
4. Audit log 기록

**판정**: **PASS**

### 1.3 autoExpandPublicProduct()

**File**: `apps/api-server/src/utils/auto-listing.utils.ts:27-60`

```sql
INSERT INTO organization_product_listings
  (id, organization_id, service_key, master_id, offer_id, is_active, ...)
SELECT gen_random_uuid(), ose.organization_id, ose.service_code, $2, $1, false, ...
FROM organization_service_enrollments ose
JOIN organizations o ON o.id = ose.organization_id
WHERE o."isActive" = true AND ose.status = 'active'
ON CONFLICT (organization_id, service_key, offer_id) DO NOTHING
```

- ✅ PUBLIC 제품 승인 시 자동 실행
- ✅ 초기 is_active = **false** (매장 운영자가 수동 활성화 필요)
- ✅ 모든 활성 조직에 자동 확장
- ✅ ON CONFLICT DO NOTHING (중복 방지)

**Trigger 위치**:
1. `neture.service.ts:534` — PUBLIC Offer 승인 시
2. `neture.service.ts:1501` — Offer가 PUBLIC으로 변경 시

### 1.4 자동 비활성화

**Supplier 비활성화 시** (`neture.service.ts:405-411`):
```sql
UPDATE organization_product_listings SET is_active = false
WHERE offer_id IN (SELECT id FROM supplier_product_offers WHERE supplier_id = $1)
```

**Offer 거절 시** (`neture.service.ts:596-600`):
```sql
UPDATE organization_product_listings SET is_active = false WHERE offer_id = $1
```

---

## 2. 검증 2: Listing → Channel 등록

### 2.1 Organization Channel Entity

**Entity**: `routes/kpa/entities/organization-channel.entity.ts`
**Table**: `organization_channels`

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | UUID PK | | |
| organization_id | UUID FK | | organization_stores 참조 |
| channel_type | ENUM | | 'B2C' / 'KIOSK' / 'TABLET' / 'SIGNAGE' |
| status | ENUM | 'PENDING' | 'PENDING' / 'APPROVED' / 'REJECTED' / 'SUSPENDED' / 'EXPIRED' / 'TERMINATED' |
| approved_at | TIMESTAMP | null | |
| config | JSONB | {} | |

### 2.2 Channel 생성 API

**Endpoint**: `POST /api/v1/kpa/store-hub/channels`
**File**: `store-hub.controller.ts:315-389`

**WO-STORE-CHANNEL-BASE-RIGHT-ACTIVATION-V1**:
- ✅ 4개 기본 채널(B2C, KIOSK, TABLET, SIGNAGE) → **즉시 APPROVED**
- ✅ status = 'APPROVED', approved_at = new Date()
- ✅ UNIQUE(organization_id, channel_type) 제약
- ✅ 중복 시 409 반환

**판정**: **PASS**

### 2.3 Channel Product 등록 API

**Endpoint**: `POST /api/v1/kpa/store-hub/channel-products/:channelId`
**File**: `store-channel-products.controller.ts:181-257`

**등록 조건**:
1. Channel 소속 조직 확인
2. **Channel type = B2C 또는 KIOSK만** (PRODUCT_CHANNELS = ['B2C', 'KIOSK'])
3. Channel status = APPROVED 필수
4. Listing이 is_active = true이고 같은 조직 소유
5. display_order 자동 계산 (max + 1)
6. 이미 활성이면 409 반환
7. 비활성 매핑 재활성화 가능

**생성 데이터**: `organization_product_channels`
| Column | Default |
|--------|---------|
| channel_id | 지정 |
| product_listing_id | 지정 |
| is_active | true |
| display_order | auto |
| sales_limit | null |

**CRITICAL CONSTRAINT**: TABLET / SIGNAGE 채널에는 직접 상품 등록 불가

**판정**: **PASS**

### 2.4 Channel KPI 조회

**Endpoint**: `GET /api/v1/kpa/store-hub/channels`
**Cache**: TTL=30s

반환 데이터:
- visibleProductCount (5-Layer Gate 통과 상품 수)
- totalProductCount, salesLimitConfiguredCount
- publicProductCount, serviceProductCount, privateProductCount

---

## 3. 검증 3: Channel → Storefront 노출

### 3.1 4-Layer Visibility Gate

**File**: `routes/platform/unified-store-public.routes.ts:103-236`
**Endpoint**: `GET /api/v1/stores/:slug/products`

```sql
SELECT DISTINCT ON (spo.id) ...
FROM supplier_product_offers spo
JOIN product_masters pm ON pm.id = spo.master_id
JOIN neture_suppliers s ON s.id = spo.supplier_id
INNER JOIN organization_product_listings opl
  ON opl.offer_id = spo.id
  AND opl.organization_id = $1
  AND opl.service_key = ANY($2)
  AND opl.is_active = true             -- LAYER 1
INNER JOIN organization_product_channels opc
  ON opc.product_listing_id = opl.id
  AND opc.is_active = true             -- LAYER 2
INNER JOIN organization_channels oc
  ON oc.id = opc.channel_id
  AND oc.channel_type = 'B2C'
  AND oc.status = 'APPROVED'           -- LAYER 3
WHERE spo.is_active = true             -- LAYER 4
  AND s.status = 'ACTIVE'             -- LAYER 4
```

**5개 노출 조건** (ALL must be true):

| # | 조건 | 테이블 | 컬럼 |
|---|------|--------|------|
| 1 | Listing 활성 | organization_product_listings | is_active = true |
| 2 | Channel 매핑 활성 | organization_product_channels | is_active = true |
| 3 | Channel 승인 | organization_channels | status = 'APPROVED' |
| 4 | Offer 활성 | supplier_product_offers | is_active = true |
| 5 | Supplier 활성 | neture_suppliers | status = 'ACTIVE' |

**Cache**: `sf:{pharmacyId}` + SHA1 key, TTL = STOREFRONT 설정값

**판정**: **PASS** (코드 구조 완전)

### 3.2 Tablet Storefront

**Endpoint**: `GET /api/v1/stores/:slug/tablet/products`
- 동일 4-Layer Gate + channel_type = 'TABLET'
- 추가: `store_local_products` (Display Domain, Checkout 불가)
- Supplier 상품 + Local 상품 별도 쿼리 (DB UNION 금지)

### 3.3 Slug Resolution

**Service**: `StoreSlugService` (`packages/platform-core/src/store-identity/`)
**Table**: `platform_store_slugs`

slug → storeId + serviceKey 변환. 불일치 시 301 redirect (old slug history).

---

## 4. CRITICAL FINDING: KPA Slug 미등록

### 4.1 현재 상태

| 서비스 | platform_store_slugs 등록 | 방법 |
|--------|:------------------------:|------|
| glycopharm | ✅ | BackfillPlatformStoreSlugs 마이그레이션 |
| cosmetics | ✅ | BackfillPlatformStoreSlugs 마이그레이션 |
| glucoseview | ✅ | application.controller.ts:559 |
| **KPA** | **❌** | **등록 코드 부재** |

### 4.2 원인 분석

1. `BackfillPlatformStoreSlugs` 마이그레이션은 glycopharm/cosmetics만 처리
2. KPA 서비스(`routes/kpa/`)에는 `reserveSlug()` 호출 코드 없음
3. KPA organization 생성 시 `platform_store_slugs`에 slug 등록하는 로직 없음
4. `organization_service_enrollments`에 `service_code = 'kpa-society'`로 등록되지만 slug 미생성

### 4.3 영향

- `/api/v1/stores/:slug/products` → **KPA 매장 접근 불가** (resolvePublicStore 실패)
- `/api/v1/stores/:slug/tablet/products` → **KPA 매장 접근 불가**
- KPA HUB 내부 기능 (store-hub/channels, pharmacy/products) → **정상** (organizationId 기반)
- **결론**: KPA 매장의 B2C 공개 Storefront가 동작하지 않음

### 4.4 권장 조치

```
WO-KPA-STORE-SLUG-REGISTRATION-V1 필요:
1. KPA organization 생성/활성화 시 reserveSlug() 호출 추가
2. 기존 KPA organizations를 platform_store_slugs에 backfill하는 마이그레이션
3. service_key = 'kpa' (또는 'kpa-society') 결정
```

---

## 5. 추가 확인 사항

### 5.1 Listing 활성화 없이 Channel 등록이 가능한가?

**❌ 불가능**

`store-channel-products.controller.ts:209-218`:
```typescript
const listing = await listingRepo.findOne({
  where: { id: productListingId, organization_id: organizationId, is_active: true },
});
if (!listing) → 404 "Product listing not found or inactive"
```

Listing이 `is_active = true`여야 Channel 등록 가능.

### 5.2 Channel 등록 없이 Storefront 노출이 가능한가?

**❌ 불가능**

Visibility Gate Layer 2: `INNER JOIN organization_product_channels opc`
Channel 매핑 레코드가 없으면 INNER JOIN 실패 → 상품 미노출.

### 5.3 PUBLIC / SERVICE 제품이 동일 채널 구조를 사용하는가?

**✅ 동일 구조 사용**

- `organization_product_listings.offer_id` → `supplier_product_offers.distribution_type`
- 카탈로그 API: `distribution_type IN ('PUBLIC', 'SERVICE')` 동일 조회
- Channel 등록: distribution_type 무관하게 listing_id 기반
- Storefront: distribution_type 구분 없이 4-Layer Gate만 적용
- HUB KPI: public/service/private 별도 카운트 제공

---

## 6. 전체 흐름 정리

```
[공급자]
  SupplierProductOffer 등록 (distribution_type=PUBLIC, is_active=false)
        ↓
[Neture 운영자]
  승인 → approval_status=APPROVED, is_active=true
        ↓
[autoExpandPublicProduct()]  (PUBLIC만)
  organization_product_listings 생성 (is_active=false)
  → 모든 활성 조직에 자동 확장
        ↓
[매장 HUB 카탈로그]
  GET /pharmacy/products/catalog
  → PUBLIC/SERVICE 제품 목록 + 신청/승인/진열 상태 표시
        ↓
[매장 운영자]
  PUT /pharmacy/products/listings/:id  { isActive: true }
  → Listing 활성화
        ↓
[매장 운영자]
  POST /store-hub/channels  { channelType: "B2C" }
  → Channel 생성 (즉시 APPROVED)
        ↓
[매장 운영자]
  POST /store-hub/channel-products/:channelId  { productListingId: "..." }
  → Channel에 상품 등록 (is_active=true)
        ↓
[Storefront]  ⚠️ KPA slug 미등록으로 현재 접근 불가
  GET /stores/:slug/products
  → 4-Layer Visibility Gate 통과 시 노출
```

---

## 7. File Manifest

### 핵심 API 파일

| File | Purpose |
|------|---------|
| `routes/o4o-store/controllers/pharmacy-products.controller.ts` | 카탈로그 + Listing CRUD |
| `routes/o4o-store/controllers/store-hub.controller.ts` | Channel CRUD + KPI |
| `routes/o4o-store/controllers/store-channel-products.controller.ts` | Channel-Product 매핑 |
| `routes/platform/unified-store-public.routes.ts` | 공개 Storefront (4-Layer Gate) |

### Entity 파일

| File | Table |
|------|-------|
| `routes/kpa/entities/organization-product-listing.entity.ts` | organization_product_listings |
| `routes/kpa/entities/organization-product-channel.entity.ts` | organization_product_channels |
| `routes/kpa/entities/organization-channel.entity.ts` | organization_channels |

### Core 서비스

| File | Purpose |
|------|---------|
| `utils/auto-listing.utils.ts` | PUBLIC 자동 확장 |
| `utils/store-owner.utils.ts` | 매장 소유자 인증 |
| `packages/platform-core/src/store-identity/services/store-slug.service.ts` | Slug SSOT |

---

## 8. 종합 판정

| 단계 | 코드 존재 | API 동작 | DB 구조 | 판정 |
|------|:---------:|:--------:|:-------:|------|
| Supplier → Offer 승인 | ✅ | ✅ | ✅ | **PASS** |
| autoExpand → Listing 생성 | ✅ | ✅ | ✅ | **PASS** |
| HUB 카탈로그 표시 | ✅ | ✅ | ✅ | **PASS** |
| Listing 활성화 | ✅ | ✅ | ✅ | **PASS** |
| Channel 생성 | ✅ | ✅ | ✅ | **PASS** |
| Channel-Product 등록 | ✅ | ✅ | ✅ | **PASS** |
| Storefront 노출 (코드) | ✅ | ✅ | ✅ | **PASS** |
| **KPA Storefront 접근** | **❌** | **❌** | **❌** | **FAIL** |

### 최종 결론

**O4O 매장 상품 운영 루프의 코드 구조는 완전하다.**
모든 단계의 API, Entity, SQL이 정상적으로 존재하며, 4-Layer Visibility Gate가 올바르게 구현되어 있다.

**단, KPA 매장의 `platform_store_slugs` 미등록으로 인해 공개 Storefront(B2C) 접근이 불가능하다.**
이는 코드 버그가 아닌 **미구현 기능**이며, KPA slug 등록 WO가 필요하다.

이 문제가 해결되면 O4O 핵심 루프 `Supplier → Store → Channel → Customer`가 완전히 동작한다.

---

*Investigation complete. 2026-03-09*
