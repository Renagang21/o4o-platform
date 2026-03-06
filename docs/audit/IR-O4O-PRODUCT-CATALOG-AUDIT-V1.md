# IR-O4O-PRODUCT-CATALOG-AUDIT-V1

> Investigation Report: Product Catalog Database Audit
> Date: 2026-03-06
> Status: Complete
> WO: WO-O4O-PRODUCT-CATALOG-DATABASE-AUDIT-V1

---

## Executive Summary

O4O 플랫폼의 상품 데이터베이스 구조를 전수 조사한 결과,
**Product Master SSOT 구조가 이미 안정적으로 구현**되어 있으며,
Barcode 정책, CSV Import, Approval Flow가 정상 동작하는 것을 확인했다.

### 핵심 발견

| 항목 | 상태 | 위험도 |
|------|------|--------|
| Product Master SSOT | 구현 완료 | LOW |
| Barcode UNIQUE 정책 | 정상 | LOW |
| Supplier Product Offer | 구현 완료 | LOW |
| CSV Import Pipeline | 구현 완료 | LOW |
| Product Approval Flow | 구현 완료 (v2) | LOW |
| POS Barcode Lookup | **미구현** | MEDIUM |
| Product Group | **미존재** | LOW |
| MFDS 연동 | **스텁 상태** | MEDIUM |
| 도메인별 상품 통합 | **미통합** | INFO |

---

## 1. Product Master 구조

### 1.1 Core SSOT: `product_masters` 테이블

**파일**: `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts`
**마이그레이션**: `20260301100000-ProductMasterCoreReset.ts`

| 컬럼 | 타입 | 제약 | 불변 | 설명 |
|------|------|------|------|------|
| `id` | UUID | PK | - | 자동 생성 |
| `barcode` | VARCHAR(14) | **UNIQUE, NOT NULL** | **YES** | GTIN (8/12/13/14자리) |
| `regulatory_type` | VARCHAR(50) | NOT NULL, default 'UNKNOWN' | YES | 식약처 분류 |
| `regulatory_name` | VARCHAR(255) | NOT NULL | YES | 식약처 공식 명칭 |
| `marketing_name` | VARCHAR(255) | NOT NULL | NO | 마케팅 표시명 |
| `brand_name` | VARCHAR(255) | nullable | NO | 브랜드 |
| `manufacturer_name` | VARCHAR(255) | NOT NULL | YES | 제조사 |
| `mfds_product_id` | VARCHAR(100) | **UNIQUE** | YES | 식약처 ID |
| `mfds_permit_number` | VARCHAR(100) | nullable | YES | 허가번호 |
| `is_mfds_verified` | BOOLEAN | default TRUE | - | 식약처 검증 여부 |
| `mfds_synced_at` | TIMESTAMP | nullable | - | 마지막 동기화 |
| `created_at` | TIMESTAMP | NOT NULL | - | - |
| `updated_at` | TIMESTAMP | NOT NULL | - | - |

**인덱스**: `idx_product_masters_barcode`, `idx_product_masters_manufacturer`

**평가**: 설계 기준 충족. barcode UNIQUE + 불변 필드 정책 정상.

### 1.2 도메인별 상품 엔티티 (별도 테이블)

| 도메인 | 테이블 | barcode 컬럼 | 타입 | UNIQUE | ProductMaster 연결 |
|--------|--------|-------------|------|--------|-------------------|
| **Core SSOT** | `product_masters` | `barcode` | VARCHAR(14) | **YES** | - (자기 자신) |
| Glycopharm | `glycopharm_products` | `barcodes` | JSONB[] | NO | **NO** |
| Cosmetics | `cosmetics_products` | `barcodes` | JSONB[] | NO | **NO** |
| Neture | `neture_products` | `barcodes` | JSONB[] | NO | **NO** |
| Store Local | `store_local_products` | (없음) | - | - | **NO** |

**관찰**: 도메인별 상품 테이블은 ProductMaster와 직접 연결되지 않음.
각 도메인이 독립적으로 barcode를 JSONB 배열로 저장하며, UNIQUE 제약 없음.

**위험도**: LOW — 현재 상품 유통은 `product_masters → supplier_product_offers → organization_product_listings` 경로로 동작하므로, 도메인별 테이블은 레거시/독립 카탈로그 용도.

---

## 2. Barcode 정책

### 2.1 GTIN 검증

**파일**: `apps/api-server/src/utils/gtin.ts`

```
validateGtin(barcode: string): string | null
isValidGtin(barcode: string): boolean
```

- 허용 길이: 8, 12, 13, 14자리
- 체크 디짓: Luhn mod-10 알고리즘
- 숫자만 허용

### 2.2 Barcode 정책 정합성

| 정책 항목 | 설계 기준 | 실제 구현 | 일치 |
|----------|----------|----------|------|
| barcode = 상품 식별자 | YES | `product_masters.barcode` UNIQUE | **일치** |
| barcode UNIQUE | YES | UNIQUE constraint + INDEX | **일치** |
| barcode NULL 허용 | YES (도메인별) | ProductMaster: NOT NULL, 도메인별: nullable JSONB | **일치** |
| barcode 불변 | YES | ProductMaster: immutable 정책 (코드 레벨) | **일치** |
| GTIN 검증 | YES | `validateGtin()` 함수 | **일치** |

**평가**: 설계 기준 완전 충족.

---

## 3. Supplier Product 구조

### 3.1 `supplier_product_offers` 테이블

**파일**: `apps/api-server/src/modules/neture/entities/SupplierProductOffer.entity.ts`

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | UUID | PK | - |
| `master_id` | UUID | FK → product_masters (RESTRICT) | 상품 마스터 |
| `supplier_id` | UUID | FK → neture_suppliers (CASCADE) | 공급자 |
| `distribution_type` | ENUM | PUBLIC/SERVICE/PRIVATE, default PRIVATE | 유통 정책 |
| `approval_status` | ENUM | PENDING/APPROVED/REJECTED, default PENDING | 승인 상태 |
| `is_active` | BOOLEAN | default FALSE | 활성 상태 |
| `allowed_seller_ids` | TEXT[] | nullable | PRIVATE 판매자 목록 |
| `price_general` | INT | default 0 | B2B 일반가 |
| `price_gold` | INT | nullable | B2B 골드가 |
| `price_platinum` | INT | nullable | B2B 플래티넘가 |
| `consumer_reference_price` | INT | nullable | 소비자 참고가 |

**제약**: UNIQUE(master_id, supplier_id) — 공급자당 상품 1개 오퍼만 허용

### 3.2 공급자-상품 관계 구조

```
NetureSupplier (neture_suppliers)
    │
    ├──< SupplierProductOffer (supplier_product_offers)
    │       │
    │       └── ProductMaster (product_masters)
    │
    └── status: PENDING → ACTIVE → INACTIVE/REJECTED
```

**평가**: 공급자 ↔ 상품 관계가 `supplier_product_offers`를 통해 명확히 분리됨. 설계 기준 충족.

### 3.3 `neture_suppliers` 테이블

**파일**: `apps/api-server/src/modules/neture/entities/NetureSupplier.entity.ts`

주요 필드: `slug` (UNIQUE), `name`, `category`, `status` (PENDING/ACTIVE/INACTIVE/REJECTED), `user_id` (계정 연결), `contact_*` (연락처), `moq` (최소 주문량)

---

## 4. Product Group 존재 여부

### 결과: **전용 Product Group 엔티티 없음**

`product_group`, `product-group`, `ProductGroup` 테이블/엔티티 미발견.

### 현재 그룹핑 메커니즘

| 방식 | 구현 | 위치 |
|------|------|------|
| 카테고리 | ENUM/VARCHAR 컬럼 | 각 도메인 엔티티 |
| 조직 경계 | `organization_id` | organization_product_listings |
| 서비스 키 | `service_key` | organization_product_listings |
| 브랜드/라인 | `brand_id`, `line_id` FK | cosmetics_products |
| 공급자 | `supplier_id` FK | supplier_product_offers |
| 채널 | `channel_id` FK | organization_product_channels |

**평가**: 현재 단계에서 별도 Product Group 테이블이 필요하지 않음.
카테고리/서비스/채널/조직 기반 그룹핑으로 충분. 향후 필요 시 추가 가능.

---

## 5. CSV Import 구조

### 5.1 Import 엔티티

**Batch**: `apps/api-server/src/modules/neture/entities/SupplierCsvImportBatch.entity.ts`

| 필드 | 설명 |
|------|------|
| `supplier_id` | FK → neture_suppliers |
| `uploaded_by` | 업로드 사용자 |
| `file_name` | CSV 파일명 |
| `total_rows` / `valid_rows` / `rejected_rows` | 통계 |
| `status` | UPLOADED → VALIDATING → READY/FAILED → APPLIED |

**Row**: `apps/api-server/src/modules/neture/entities/SupplierCsvImportRow.entity.ts`

| 필드 | 설명 |
|------|------|
| `batch_id` | FK → batch (CASCADE) |
| `row_number` | CSV 행 번호 |
| `raw_json` | 원본 CSV 행 (JSONB) |
| `parsed_barcode` | VARCHAR(14), 검증된 바코드 |
| `parsed_supply_price` | INT, 공급가 |
| `parsed_distribution_type` | PUBLIC/SERVICE/PRIVATE |
| `validation_status` | PENDING/VALID/REJECTED |
| `validation_error` | 오류 메시지 |
| `master_id` | 매칭된 ProductMaster UUID |
| `action_type` | LINK_EXISTING / CREATE_MASTER / REJECT |

### 5.2 Import Flow

**서비스**: `apps/api-server/src/modules/neture/services/csv-import.service.ts`
**라우트**: `apps/api-server/src/modules/neture/neture.routes.ts` (line 761-848)

```
Phase 1: uploadAndValidate()
  POST /api/v1/neture/supplier/csv-import/upload
  ├ CSV 파싱 (csv-parse/sync)
  ├ 행별 검증:
  │   ├ barcode 존재 여부
  │   ├ GTIN 포맷 검증
  │   ├ 배치 내 중복 검사
  │   ├ 공급가 검증 (≥ 0)
  │   ├ distribution_type 검증
  │   └ ProductMaster 조회 (barcode → master)
  │       ├ 존재: LINK_EXISTING
  │       └ 미존재: MFDS 검증 → CREATE_MASTER 또는 REJECT
  └ Batch 상태: READY (validRows > 0) 또는 FAILED

Phase 2: applyBatch()
  POST /api/v1/neture/supplier/csv-import/batches/:id/apply
  ├ Batch 상태 = READY 확인
  ├ 트랜잭션 내 처리:
  │   ├ CREATE_MASTER → ProductMaster 생성
  │   ├ LINK_EXISTING → 기존 master 연결
  │   └ Offer UPSERT (ON CONFLICT DO UPDATE)
  └ Batch 상태: APPLIED
```

### 5.3 CSV 허용 컬럼

```
barcode            (필수, GTIN)
supplier_sku       (선택)
supply_price       (선택, 정수 KRW)
msrp               (선택, 무시)
stock_qty          (선택, 무시)
distribution_type  (선택, PUBLIC/SERVICE/PRIVATE)
description        (선택, 무시)
```

**평가**: CSV Import 파이프라인이 2단계(검증 → 적용)로 안전하게 구현됨.
GTIN 검증, 중복 방지, UPSERT 충돌 처리 모두 정상.

---

## 6. Barcode 충돌 처리

### 6.1 ProductMaster 레벨

**UNIQUE(barcode)** 제약으로 DB 레벨에서 중복 방지.

CSV Import 시 처리 흐름:
```
barcode 검색 → SELECT * FROM product_masters WHERE barcode = $1
  ├ 존재: action_type = LINK_EXISTING, master_id 설정
  └ 미존재: MFDS 검증 → CREATE_MASTER
```

### 6.2 Offer 레벨

**UNIQUE(master_id, supplier_id)** 제약 + `ON CONFLICT DO UPDATE`:
```sql
INSERT INTO supplier_product_offers (...)
VALUES (...)
ON CONFLICT (master_id, supplier_id) DO UPDATE SET
  price_general = EXCLUDED.price_general,
  distribution_type = EXCLUDED.distribution_type,
  updated_at = NOW()
```

### 6.3 동시성 안전

- 여러 CSV 배치가 동시에 같은 barcode 참조 가능
- UNIQUE 제약이 중복 master 생성 방지
- 첫 트랜잭션이 master 생성, 후속 트랜잭션이 재사용

**평가**: 충돌 처리 완전함. Race condition safe.

---

## 7. POS Barcode Lookup

### 7.1 현재 상태: **미구현**

| 기능 | 상태 | 설명 |
|------|------|------|
| Barcode 스캔 조회 | **미구현** | barcode 기반 상품 조회 엔드포인트 없음 |
| SKU 조회 | 정의됨 | `findProductBySku()` 존재하나 checkout에서 미사용 |
| UUID 조회 | **활성** | checkout은 `productId` UUID로만 상품 조회 |

### 7.2 Checkout Flow

**파일**: `apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts`

```typescript
// 입력: productId (UUID)
interface CheckoutItemDto {
  productId: string;   // UUID
  quantity: number;
  unitPrice?: number;
}

// 조회: UUID 기반
const products = await productRepo.find({
  where: { id: In(productIds) }  // UUID lookup ONLY
});
```

### 7.3 상품 검색

**파일**: `apps/api-server/src/routes/glycopharm/repositories/glycopharm.repository.ts`

```
검색 대상: name, sku, description (ILIKE)
barcode 검색: 미포함
```

### 7.4 Tablet Channel

- 서비스 요청 시스템 (POS가 아님)
- `supplier_product_offers` 기반 상품 표시
- barcode 스캔 없음

**평가**: POS barcode lookup은 향후 구현 필요.
`glycopharm_products.barcodes` 필드는 예약됨 (WO-PRODUCT-IMAGES-AND-BARCODE-UNBLOCK-V1).
ProductMaster 기반 barcode lookup 엔드포인트 추가 필요.

---

## 8. Product Approval Flow

### 8.1 `product_approvals` 테이블

**파일**: `apps/api-server/src/entities/ProductApproval.ts`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `offer_id` | UUID FK → supplier_product_offers (CASCADE) | 오퍼 참조 |
| `organization_id` | UUID | 요청 약국 |
| `service_key` | VARCHAR(50), default 'kpa' | 서비스 구분 |
| `approval_type` | ENUM: service/private | 승인 유형 |
| `approval_status` | ENUM: pending/approved/rejected/revoked | 승인 상태 |
| `requested_by` | UUID | 요청자 |
| `decided_by` | UUID | 승인자 |
| `decided_at` | TIMESTAMP | 결정 시점 |
| `reason` | TEXT | 거절 사유 |

**제약**: UNIQUE(offer_id, organization_id, approval_type)

### 8.2 Approval Workflow

**서비스**: `apps/api-server/src/modules/product-policy-v2/product-approval-v2.service.ts`

```
SERVICE 승인:
  약국 → createServiceApproval(offerId, orgId)
    → 검증: offer 존재, distribution_type=SERVICE, is_active=true, supplier ACTIVE
    → 중복 검사: PENDING/APPROVED 이미 존재 시 오류
    → ProductApproval 생성 (status=PENDING)

  관리자 → approveServiceProduct(approvalId)
    → ProductApproval status=APPROVED
    → OrganizationProductListing 생성 (is_active=FALSE)

PRIVATE 승인:
  약국 → createPrivateApproval(offerId, orgId)
    → 검증: distribution_type=PRIVATE, orgId in allowedSellerIds
    → ProductApproval 생성

  관리자 → approvePrivateProduct(approvalId)
    → 동일 Flow
```

### 8.3 관리자 UI API

**파일**: `apps/api-server/src/routes/kpa/controllers/operator-product-applications.controller.ts`

| 엔드포인트 | 메서드 | 기능 |
|-----------|--------|------|
| `/api/v1/kpa/product-applications` | GET | 승인 목록 (필터/페이지네이션) |
| `/api/v1/kpa/product-applications/stats` | GET | 상태별 통계 |
| `/api/v1/kpa/product-applications/:id/approve` | PATCH | 승인 |
| `/api/v1/kpa/product-applications/:id/reject` | PATCH | 거절 |

**평가**: Approval Flow v2가 완전히 구현됨. SERVICE/PRIVATE 분리, REVOKED 상태 지원.

---

## 9. 전체 상품 아키텍처 (현재)

```
                    ┌──────────────────────┐
                    │   product_masters    │  ← Core SSOT
                    │  barcode (UNIQUE)    │
                    │  regulatory_name     │
                    │  manufacturer_name   │
                    │  mfds_product_id     │
                    └──────────┬───────────┘
                               │
                    ┌──────────┴───────────┐
                    │ supplier_product_    │  ← 공급 계약
                    │ offers               │
                    │  master_id + supplier │
                    │  distribution_type   │
                    │  pricing (3-tier)    │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────┴──────┐ ┌──────┴───────┐ ┌──────┴───────────┐
    │ product_       │ │ organization_│ │ organization_    │
    │ approvals      │ │ product_     │ │ product_         │
    │ (승인 워크플로)  │ │ listings     │ │ channels         │
    └────────────────┘ │ (약국 진열)   │ │ (채널별 설정)     │
                       └──────────────┘ └──────────────────┘

  별도 도메인 (ProductMaster 미연결):
    glycopharm_products   — 약국 자체 카탈로그
    cosmetics_products    — 화장품 카탈로그
    neture_products       — 네처 카탈로그
    store_local_products  — 매장 전시용 (Display Domain Only)
```

---

## 10. 위험 요소 및 개선 권고

### RISK-1: MFDS 서비스 스텁 (MEDIUM)

**파일**: `apps/api-server/src/modules/neture/services/mfds.service.ts`

현재 `verifyProductByBarcode()`가 항상 `{ verified: false, error: 'MFDS_NOT_IMPLEMENTED' }` 반환.
CSV Import에서 MFDS 미검증 barcode는 `REJECT` 처리됨.

**영향**: 새 상품 (기존 ProductMaster에 없는 barcode)의 CSV Import가 실패.
**권고**: MFDS 연동 구현 또는 수동 ProductMaster 생성 경로 확보.

### RISK-2: POS Barcode Lookup 미구현 (MEDIUM)

POS에서 barcode 스캔으로 상품을 조회하는 엔드포인트가 없음.
Checkout은 UUID 기반으로만 동작.

**권고**: `GET /api/v1/products/barcode/:barcode` 엔드포인트 추가.
ProductMaster → SupplierProductOffer → OrganizationProductListing 경로로 조회.

### RISK-3: 도메인별 상품 테이블 미통합 (INFO)

`glycopharm_products`, `cosmetics_products`, `neture_products`는 각각 독립 테이블로,
`product_masters`와 연결되어 있지 않음.

**현재 영향**: 없음 — 이 테이블들은 레거시/도메인별 독립 카탈로그.
**향후**: ProductMaster 기반으로 통합할지 여부는 정책 결정 필요.

### RISK-4: store_local_products Display 경계 (LOW)

Display Domain으로 명확히 격리됨. Commerce 연결 없음.
테이블 코멘트로 경계 문서화됨. 위험 없음.

---

## 11. 설계 기준 대비 정합성 요약

| 설계 기준 | 구현 상태 | 정합성 |
|----------|----------|--------|
| Product Master = 상품 SSOT | `product_masters` 테이블 | **MATCH** |
| Barcode = 상품 식별자, UNIQUE | VARCHAR(14), UNIQUE constraint | **MATCH** |
| Barcode 불변 | 코드 레벨 immutable 정책 | **MATCH** |
| GTIN 검증 | `validateGtin()` 유틸리티 | **MATCH** |
| Supplier → Product 분리 | `supplier_product_offers` junction | **MATCH** |
| CSV Import 2단계 | uploadAndValidate → applyBatch | **MATCH** |
| Barcode 충돌 = 기존 연결 | LINK_EXISTING + UPSERT | **MATCH** |
| Approval Flow | product_approvals v2 (SERVICE/PRIVATE) | **MATCH** |
| POS barcode lookup | **미구현** | **GAP** |
| Product Group | 미존재 (카테고리 기반 그룹핑) | **ACCEPTABLE** |
| MFDS 연동 | 스텁 | **GAP** |

---

## 12. 파일 매니페스트

### Core Product
| 파일 | 역할 |
|------|------|
| `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts` | Product Master SSOT |
| `apps/api-server/src/modules/neture/entities/SupplierProductOffer.entity.ts` | 공급 오퍼 |
| `apps/api-server/src/modules/neture/entities/NetureSupplier.entity.ts` | 공급자 |
| `apps/api-server/src/modules/neture/entities/SupplierCsvImportBatch.entity.ts` | CSV 배치 |
| `apps/api-server/src/modules/neture/entities/SupplierCsvImportRow.entity.ts` | CSV 행 |

### Services
| 파일 | 역할 |
|------|------|
| `apps/api-server/src/modules/neture/services/csv-import.service.ts` | CSV Import 서비스 |
| `apps/api-server/src/modules/neture/services/mfds.service.ts` | MFDS 연동 (스텁) |
| `apps/api-server/src/modules/product-policy-v2/product-approval-v2.service.ts` | Approval v2 서비스 |
| `apps/api-server/src/utils/gtin.ts` | GTIN 검증 유틸리티 |

### Domain Products
| 파일 | 테이블 |
|------|--------|
| `apps/api-server/src/routes/glycopharm/entities/glycopharm-product.entity.ts` | glycopharm_products |
| `apps/api-server/src/routes/cosmetics/entities/cosmetics-product.entity.ts` | cosmetics_products |
| `apps/api-server/src/routes/neture/entities/neture-product.entity.ts` | neture_products |
| `apps/api-server/src/routes/platform/entities/store-local-product.entity.ts` | store_local_products |

### Organization Products
| 파일 | 테이블 |
|------|--------|
| `apps/api-server/src/routes/kpa/entities/organization-product-listing.entity.ts` | organization_product_listings |
| `apps/api-server/src/routes/kpa/entities/organization-product-channel.entity.ts` | organization_product_channels |
| `apps/api-server/src/routes/platform/entities/product-marketing-asset.entity.ts` | product_marketing_assets |
| `apps/api-server/src/entities/ProductApproval.ts` | product_approvals |

### Routes & Controllers
| 파일 | 역할 |
|------|------|
| `apps/api-server/src/modules/neture/neture.routes.ts` | CSV Import 라우트 |
| `apps/api-server/src/routes/kpa/controllers/operator-product-applications.controller.ts` | 승인 관리 |
| `apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts` | Checkout |
| `apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts` | 약국 상품 |
| `apps/api-server/src/routes/o4o-store/controllers/store-channel-products.controller.ts` | 채널 상품 |
| `apps/api-server/src/routes/o4o-store/controllers/tablet.controller.ts` | 태블릿 채널 |

### Migrations (주요)
| 파일 | 날짜 | 내용 |
|------|------|------|
| `20260301100000-ProductMasterCoreReset.ts` | 2026-03-01 | product_masters + supplier_product_offers 생성 |
| `20260301200000-ProductMasterWOAlignment.ts` | 2026-03-01 | regulatory_type 추가, store_product_profiles 생성 |
| `20260301300000-CsvImportBatchTables.ts` | 2026-03-01 | CSV import 테이블 생성 |
| `20260225100000-CreateProductApprovalsTable.ts` | 2026-02-25 | product_approvals 생성 |
| `20260304200000-CreateProductMarketingAssets.ts` | 2026-03-04 | 마케팅 에셋 매핑 |

---

## 결론

O4O 플랫폼의 상품 데이터베이스 구조는 **설계 기준과 높은 정합성**을 보인다.
Product Master SSOT, Barcode UNIQUE 정책, CSV Import, Approval Flow가 모두 구현되어 있다.

**Product Master 구조 Freeze** 진행 가능.

Freeze 전 해결 권고:
1. MFDS 서비스 실제 연동 또는 수동 마스터 생성 경로
2. POS barcode lookup 엔드포인트

---

*Investigation completed: 2026-03-06*
*Investigator: Claude Code (AI)*
*No code modifications were made during this audit.*
