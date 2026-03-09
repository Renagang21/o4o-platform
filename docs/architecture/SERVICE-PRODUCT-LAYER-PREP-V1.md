# SERVICE-PRODUCT-LAYER-PREP-V1

> WO-O4O-SERVICE-PRODUCT-LAYER-PREP-V1 | 2026-03-09

## Purpose

서비스별 제품 정책 레이어 준비. 기존 동작 무변경.

## Current vs Future Architecture

```
현재 (변경 없음):
  SupplierProductOffer → OrganizationProductListing (service_key 컬럼)

미래:
  SupplierProductOffer → ServiceProduct → OrganizationProductListing (service_product_id FK)
```

## Created Artifacts

### 1. `service_products` Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | gen_random_uuid() |
| service_key | VARCHAR(50) | 서비스 식별자 (kpa, glycopharm, cosmetics) |
| master_id | UUID FK | → product_masters.id |
| offer_id | UUID FK | → supplier_product_offers.id (CASCADE) |
| status | VARCHAR(20) | active / inactive / suspended |
| visibility | VARCHAR(20) | visible / hidden / restricted |
| created_at | TIMESTAMPTZ | auto |
| updated_at | TIMESTAMPTZ | auto |

**Constraints:**
- `UQ_service_products_service_offer` — (service_key, offer_id) UNIQUE
- `IDX_service_products_service_status` — (service_key, status)
- `IDX_service_products_offer` — (offer_id)

### 2. `organization_product_listings.service_product_id`

- Type: UUID, nullable
- 현재 사용하지 않음. 미래 ServiceProduct 연결용 준비 컬럼.

### 3. Entity: `ServiceProduct`

- Path: `apps/api-server/src/routes/kpa/entities/service-product.entity.ts`
- ESM 규칙 준수: `import type` + string `@ManyToOne`

### 4. Query Helper: `getServiceProducts()`

- Path: `apps/api-server/src/utils/service-product.utils.ts`
- service_products 테이블 우선 조회
- 데이터 없으면 supplier_product_offers fallback

## Migration

- `20260309100000-CreateServiceProducts.ts`
- Idempotent (IF NOT EXISTS / information_schema check)

## Impact

- 기존 API: 변경 없음
- 기존 테이블: organization_product_listings에 nullable 컬럼 1개 추가만
- 기존 코드: 변경 없음 (auto-listing, approval, controllers 모두 무변경)
