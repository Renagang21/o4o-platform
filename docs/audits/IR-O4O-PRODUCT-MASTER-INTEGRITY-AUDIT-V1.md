# IR-O4O-PRODUCT-MASTER-INTEGRITY-AUDIT-V1

> **O4O Product Master 데이터 정합성 조사 보고서**

- 조사일: 2026-03-09
- 조사자: Claude Code (AI Audit Agent)
- 대상: O4O Platform 전체 Product 구조

---

## 0. 조사 목적

```
Product Master가 플랫폼의 Single Source of Truth(SSOT)인지 확인

Supplier → Product → Store → Order
전체 구조가 Barcode 기준 Product Master로 제대로 연결되어 있는지 확인
```

---

## 1. Product Master 테이블 구조

### 1.1 Neture Core ProductMaster (SSOT)

| 항목 | 값 |
|------|------|
| Entity | `ProductMaster.entity.ts` |
| 위치 | `apps/api-server/src/modules/neture/entities/` |
| 테이블 | `product_masters` |

**컬럼 구조:**

| 컬럼 | 타입 | 제약 | 불변 |
|------|------|------|:----:|
| `id` | UUID | PK | - |
| `barcode` | VARCHAR(14) | NOT NULL, **UNIQUE** | ✅ |
| `regulatory_type` | VARCHAR(50) | NOT NULL | ✅ |
| `regulatory_name` | VARCHAR(255) | NOT NULL | ✅ |
| `marketing_name` | VARCHAR(255) | NOT NULL | ❌ |
| `brand_name` | VARCHAR(255) | nullable | ❌ |
| `manufacturer_name` | VARCHAR(255) | NOT NULL | ✅ |
| `mfds_permit_number` | VARCHAR(100) | nullable | ✅ |
| `mfds_product_id` | VARCHAR(100) | NOT NULL, UNIQUE | ✅ |
| `is_mfds_verified` | BOOLEAN | default TRUE | ❌ |
| `mfds_synced_at` | TIMESTAMP | nullable | ❌ |
| `category_id` | UUID FK | nullable | ❌ |
| `brand_id` | UUID FK | nullable | ❌ |
| `specification` | TEXT | nullable | ❌ |
| `origin_country` | VARCHAR(100) | nullable | ❌ |
| `tags` | JSONB | default [] | ❌ |
| `created_at` | TIMESTAMP | auto | - |
| `updated_at` | TIMESTAMP | auto | - |

**Relations:**

| 관계 | 대상 | 타입 |
|------|------|------|
| `offers` | SupplierProductOffer[] | OneToMany |
| `images` | ProductImage[] | OneToMany |
| `category` | ProductCategory | ManyToOne |
| `brand` | Brand | ManyToOne |

**불변 필드 (Runtime Guard 적용):**
- `barcode`, `regulatory_type`, `regulatory_name`
- `manufacturer_name`, `mfds_permit_number`, `mfds_product_id`

---

### 1.2 기타 Product 엔티티 (도메인별)

| 엔티티 | 테이블 | 스키마 | barcode 타입 | UNIQUE | 용도 |
|--------|--------|--------|:----:|:----:|------|
| **ProductMaster** (Neture Core) | `product_masters` | public | VARCHAR(14) | ✅ | **SSOT** |
| ProductMaster (Dropshipping) | `dropshipping_product_masters` | public | VARCHAR(100) | ❌ | Generic S2S |
| PharmaProductMaster | `pharma_product_masters` | public | VARCHAR(100) | ❌ | 의약품 전용 |
| CosmeticsProduct | `cosmetics_products` | cosmetics | JSONB array | ❌ | 화장품 |
| GlycopharmProduct | `glycopharm_products` | public | JSONB array | ❌ | 혈당측정기기 |
| NetureProduct (legacy) | `neture_products` | neture | JSONB array | ❌ | 레거시 |
| StoreLocalProduct | `store_local_products` | public | **없음** | - | 매장 진열용 (비커머스) |

---

## 2. Barcode 정책 조사

### 2.1 GTIN 검증 유틸리티

| 항목 | 값 |
|------|------|
| 위치 | `apps/api-server/src/utils/gtin.ts` |
| 함수 | `validateGtin(barcode)`, `isValidGtin(barcode)` |

**검증 규칙:**
1. 숫자만 허용 (0-9)
2. 길이: 8, 12, 13, 14자리 (GTIN-8/12/13/14)
3. Modulo-10 체크디짓 검증
4. 유효하면 `null`, 무효하면 에러 메시지 반환

### 2.2 Barcode 정책 구현 현황

```
Barcode 존재 + GTIN 유효
→ ProductMaster 생성 또는 기존 Master 연결
→ SupplierProductOffer 생성 가능
→ Store Listing 생성 가능

Barcode 없음 또는 GTIN 무효
→ ProductMaster 생성 차단
→ SupplierProductOffer 생성 불가
→ Store Listing 생성 불가 (간접 차단)
```

**구현 확인 위치:**

| 위치 | 동작 |
|------|------|
| `neture.service.ts` → `createOrGetProductMaster()` | GTIN 무효 시 에러 반환 |
| `neture.service.ts` → `createSupplierOffer()` | barcode 기반 Master Pipeline 강제 |
| `csv-import.service.ts` → `uploadAndValidate()` | barcode 없음/무효 시 행 거부 |
| `catalog-import-validator.ts` | `MISSING_BARCODE`, `INVALID_GTIN` 거부 |

### 2.3 평가

```
Barcode 정책: ✅ 정상 구현

Neture Core에서 barcode는 필수이며 GTIN 포맷 검증이 적용된다.
barcode 없이는 ProductMaster 생성이 불가하고,
ProductMaster 없이는 SupplierProductOffer 생성이 불가하며,
Offer 없이는 OrganizationProductListing 생성이 불가하다.

⚠️ 단, Dropshipping Core / Pharmaceutical Core에서는
barcode가 선택적이고 UNIQUE 제약이 없다.
이는 현재 활성화된 도메인이 아니므로 즉각적 위험은 아니지만,
향후 통합 시 정합성 리스크가 된다.
```

---

## 3. Product 중복 조사

### 3.1 Neture Core (SSOT)

```sql
-- 중복 barcode 확인 쿼리
SELECT barcode, COUNT(*)
FROM product_masters
GROUP BY barcode
HAVING COUNT(*) > 1;
```

**구조적 분석:**

| 보호 기제 | 상태 |
|-----------|------|
| `barcode` UNIQUE 제약조건 | ✅ DB 레벨 |
| `mfds_product_id` UNIQUE 제약조건 | ✅ DB 레벨 |
| `createOrGetProductMaster()` 조회 후 생성 | ✅ 앱 레벨 |
| CSV Import 배치 내 중복 검사 | ✅ 앱 레벨 |

```
평가: ✅ SAFE

DB UNIQUE 제약 + 앱 레벨 조회-후-생성 패턴으로
동일 barcode 중복 Product 생성이 구조적으로 차단된다.
```

### 3.2 기타 도메인

| 도메인 | barcode 중복 보호 |
|--------|:----:|
| Dropshipping Core | ❌ |
| Pharmaceutical Core | ❌ |
| Cosmetics | ❌ (JSONB array) |
| Glycopharm | ❌ (JSONB array) |

```
평가: ⚠️ PARTIAL

비-Neture 도메인은 barcode UNIQUE 제약이 없다.
현재 활성 도메인(Neture)은 안전하나,
Dropshipping/Pharmaceutical Core는 잠재적 중복 리스크 존재.
```

---

## 4. Supplier Offer 연결 조사

### 4.1 SupplierProductOffer 구조

| 항목 | 값 |
|------|------|
| Entity | `SupplierProductOffer.entity.ts` |
| 테이블 | `supplier_product_offers` |

**핵심 연결 필드:**

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `master_id` | UUID FK | NOT NULL, ON DELETE RESTRICT | ProductMaster 연결 |
| `supplier_id` | UUID FK | NOT NULL, ON DELETE CASCADE | NetureSupplier 연결 |

**Unique 제약:** `UNIQUE(master_id, supplier_id)` — 공급사당 상품당 1개 Offer

**가격 구조:**

| 필드 | 설명 |
|------|------|
| `price_general` | B2B 일반 등급 가격 |
| `price_gold` | B2B 골드 등급 가격 |
| `price_platinum` | B2B 플래티넘 등급 가격 |
| `consumer_reference_price` | 소비자 참고가격 |

**재고 관리:**

| 필드 | 설명 |
|------|------|
| `stock_quantity` | 총 재고량 |
| `reserved_quantity` | 주문 예약량 |
| `low_stock_threshold` | 부족 경고 기준 |
| `track_inventory` | 재고 추적 여부 (false = 무한 재고) |

**가용 재고:** `available_stock = stock_quantity - reserved_quantity`

### 4.2 연결 메커니즘

```
Supplier가 barcode로 Offer 생성 요청
    ↓
barcode → ProductMaster 조회/생성 (resolveOrCreateMaster)
    ↓
ProductMaster.id → SupplierProductOffer.master_id
    ↓
Offer 생성 완료 (approval_status = PENDING)
```

**핵심 보호:**
- Supplier는 `masterId`를 직접 주입할 수 없음 (barcode Pipeline 강제)
- Master 불변 필드는 생성 후 변경 불가
- 모든 Offer는 유효한 Master를 참조해야 함

### 4.3 평가

```
Supplier → Product 연결: ✅ SAFE

barcode 기반 Master Pipeline이 강제되어
Supplier가 임의의 Product에 연결하는 것이 구조적으로 차단된다.
UNIQUE(master_id, supplier_id) 제약으로 동일 상품에 대한
중복 Offer도 방지된다.
```

---

## 5. Store Listing 연결 조사

### 5.1 OrganizationProductListing 구조

| 항목 | 값 |
|------|------|
| Entity | `organization-product-listing.entity.ts` |
| 테이블 | `organization_product_listings` |

**핵심 연결 필드:**

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `organization_id` | UUID FK | NOT NULL | 매장(약국) |
| `master_id` | UUID FK | NOT NULL | ProductMaster 연결 |
| `offer_id` | UUID FK | NOT NULL, ON DELETE CASCADE | SupplierProductOffer 연결 |
| `service_key` | VARCHAR(50) | default 'kpa' | 서비스 구분 |
| `service_product_id` | UUID FK | nullable | 미래 서비스 레이어 |
| `price` | NUMERIC(12,2) | nullable | 매장별 가격 오버라이드 |
| `is_active` | BOOLEAN | default false | 매장 노출 여부 |

**Unique 제약:** `UNIQUE(organization_id, service_key, offer_id)`

### 5.2 Listing 생성 흐름

#### PUBLIC Offer 자동 배포

```
Supplier Offer 승인 (distribution_type = PUBLIC)
    ↓
autoExpandPublicProduct() 호출
    ↓
모든 활성 조직에 Listing 자동 생성 (is_active = false)
    ↓
매장 소유자가 수동으로 is_active = true 설정
```

#### 신규 조직 생성 시

```
새 조직 생성
    ↓
autoListPublicProductsForOrg() 호출
    ↓
기존 승인된 PUBLIC Offer에 대한 Listing 자동 생성
```

### 5.3 5단계 가시성 필터

```
1. Supplier 레벨:  NetureSupplier.status = 'ACTIVE'
2. Offer 레벨:     supplier_product_offers.is_active = true
                   + approval_status = 'APPROVED'
3. 배포 레벨:      distribution_type (PUBLIC/SERVICE/PRIVATE)
4. 조직 레벨:      organization_product_listings.is_active = true
5. 채널 레벨:      organization_product_channels.is_active = true
```

### 5.4 Barcode 없는 Product의 Store Listing 포함 여부

```
결론: ❌ 포함되지 않음

ProductMaster 생성에 barcode가 필수이므로,
barcode 없는 Product는 ProductMaster에 존재할 수 없고,
Master 없이는 Offer가 생성될 수 없으며,
Offer 없이는 Listing이 생성될 수 없다.

따라서 barcode 없는 Product는 구조적으로
Store Listing에 포함될 수 없다.
```

### 5.5 평가

```
Store → Product 연결: ✅ SAFE

Organization → Listing → Offer → ProductMaster 체인이
FK 제약으로 보장되며, barcode 없는 상품의 Listing 진입이
구조적으로 차단된다.
```

---

## 6. Order 연결 조사

### 6.1 주문 시스템 구조

플랫폼에 **2개의 주문 시스템**이 병존한다:

#### A. CheckoutOrder (Phase N-2: E-commerce MVP)

| 항목 | 값 |
|------|------|
| Entity | `CheckoutOrder.entity.ts` |
| 테이블 | `checkout_orders` |
| 결제 | Toss Payments 연동 |

**상품 연결 방식: JSONB Snapshot (비정규화)**

```typescript
items: {
  productId: string;      // SupplierProductOffer.id 또는 상품 ID
  productName: string;    // 이름 스냅샷
  quantity: number;
  unitPrice: number;
  subtotal: number;
}[]
```

| 특성 | 상태 |
|------|------|
| ProductMaster FK | ❌ 없음 (JSONB 내 productId) |
| 재고 추적 | ❌ 없음 |
| 가격 서버 검증 | ⚠️ 제한적 |

#### B. NetureOrder (Phase G-3: B2B 주문)

| 항목 | 값 |
|------|------|
| Entity | `neture-order.entity.ts` |
| 테이블 | `neture.neture_orders` + `neture.neture_order_items` |

**상품 연결 방식: FK 기반 (정규화)**

```
NetureOrderItem.productId → SupplierProductOffer.id
    ↓
SupplierProductOffer.masterId → ProductMaster.id
```

| 특성 | 상태 |
|------|------|
| ProductMaster FK | ✅ 간접 (Offer → Master) |
| 재고 추적 | ✅ reserved_quantity 증감 |
| 가격 서버 검증 | ✅ DB 가격 사용 (클라이언트 가격 무시) |

### 6.2 NetureOrder 7-Gate 검증

```
Gate 1: offer.isActive = true
Gate 2: offer.approvalStatus = 'APPROVED'
Gate 3: supplier.status = 'ACTIVE'
Gate 4: distributionType 검증 (PRIVATE/SERVICE/PUBLIC)
Gate 5: quantity 검증 (정수, 1-1000)
Gate 6: unitPrice > 0 (서버가 DB에서 조회)
Gate 7: 재고 검증 (trackInventory=true 시)
        availableStock ≥ requestedQuantity
```

### 6.3 주문 생성 트랜잭션

```sql
BEGIN TRANSACTION
  1. NetureOrder 레코드 생성
  2. NetureOrderItem 레코드 생성 (각 항목)
  3. UPDATE supplier_product_offers
     SET reserved_quantity = reserved_quantity + quantity
     WHERE id = offer_id AND track_inventory = true
COMMIT
```

### 6.4 평가

```
Order → Product 연결: ⚠️ PARTIAL

NetureOrder (B2B): ✅ SAFE
  - FK 기반 연결로 Product Master까지 추적 가능
  - 7-Gate 검증 + 재고 트랜잭션 보장

CheckoutOrder (E-commerce): ⚠️ WEAK
  - JSONB 스냅샷 방식으로 ProductMaster와 직접 FK 연결 없음
  - productId가 문자열로만 저장되어 참조 무결성 미보장
  - Phase N-2 MVP 특성상 의도된 제한이나,
    장기적으로 FK 기반 Order Item 분리가 필요
```

---

## 7. Product Image 연결 조사

### 7.1 ProductImage 구조

| 항목 | 값 |
|------|------|
| Entity | `ProductImage.entity.ts` |
| 테이블 | `product_images` |

**컬럼:**

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK |
| `master_id` | UUID FK | ProductMaster 연결 (CASCADE) |
| `image_url` | TEXT | 이미지 전체 URL |
| `gcs_path` | TEXT | GCS 저장 경로 |
| `sort_order` | INT | 정렬 순서 (default 0) |
| `is_primary` | BOOLEAN | 대표 이미지 여부 (default false) |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

**인덱스:**
- `idx_product_images_master_id` (master_id)
- `idx_product_images_primary` (master_id, is_primary) WHERE is_primary = true

### 7.2 평가

```
Product Image 구조: ✅ SAFE

ProductMaster와 1:N FK 관계로 연결.
GCS 기반 이미지 저장.
대표 이미지(is_primary) + 정렬(sort_order) 구조 제공.
CASCADE 삭제로 Master 삭제 시 이미지 자동 삭제.
```

---

## 8. Product Tag 연결 조사

### 8.1 3중 태깅 시스템

#### A. ProductMaster.tags (JSONB Array)

| 항목 | 값 |
|------|------|
| 필드 | `product_masters.tags` |
| 타입 | JSONB (`string[]`) |
| 인덱스 | GIN index |
| 용도 | 검색/필터용 태그 |

#### B. ProductAiTag (AI 생성 태그)

| 항목 | 값 |
|------|------|
| 테이블 | `product_ai_tags` |
| 필드 | `product_id`, `tag`, `confidence`, `source`, `model` |
| 용도 | AI 기반 자동 태깅 + 수동 태깅 |

#### C. ServiceProduct (서비스 레이어, 미래)

현재 태그 필드 없음. 확장 예정.

### 8.2 평가

```
Product Tag 구조: ✅ SAFE

JSONB 배열(간편 조회) + 관계 테이블(AI 메타데이터) 2중 구조.
GIN 인덱스로 검색 성능 보장.
```

---

## 9. Product 상태 구조 조사

### 9.1 상태 값 종합

| 컨텍스트 | Enum | 값 |
|----------|------|------|
| SupplierProductOffer 승인 | OfferApprovalStatus | `PENDING`, `APPROVED`, `REJECTED` |
| SupplierProductOffer 배포 | OfferDistributionType | `PUBLIC`, `SERVICE`, `PRIVATE` |
| ProductApproval | ProductApprovalStatus | `pending`, `approved`, `rejected`, `revoked` |
| ProductApproval 유형 | ProductApprovalType | `service`, `private` |
| Neture Legacy | NetureProductStatus | `draft`, `visible`, `hidden`, `sold_out` |
| Cosmetics | CosmeticsProductStatus | `draft`, `visible`, `hidden`, `sold_out` |
| Glycopharm | GlycopharmProductStatus | `draft`, `active`, `inactive`, `discontinued` |

### 9.2 평가

```
Product 상태 구조: ✅ SAFE

ProductMaster 자체에는 상태가 없다 (SSOT는 항상 존재).
상태는 SupplierProductOffer(공급 상태)와
ProductApproval(승인 상태)에서 관리된다.

이 설계는 올바르다:
- 상품 자체(Master)는 불변의 기준 데이터
- 공급 여부(Offer)는 공급사가 결정
- 승인 여부(Approval)는 플랫폼/매장이 결정
```

---

## 10. 데이터 정합성 종합 평가

### 10.1 정합성 항목별 평가

| 항목 | 상태 | 설명 |
|------|:----:|------|
| barcode 중복 Product | ✅ SAFE | DB UNIQUE 제약 + 앱 레벨 보호 |
| Offer → Product 연결 | ✅ SAFE | barcode Pipeline + FK 보장 |
| Store Listing → Product 연결 | ✅ SAFE | master_id + offer_id FK |
| Order → Product 연결 (Neture B2B) | ✅ SAFE | FK 기반 + 7-Gate 검증 |
| Order → Product 연결 (Checkout) | ⚠️ WEAK | JSONB 스냅샷, FK 없음 |
| Product Image 연결 | ✅ SAFE | FK + CASCADE |
| Product Tag 연결 | ✅ SAFE | JSONB + 관계 테이블 |
| Product Status 구조 | ✅ SAFE | Master/Offer/Approval 분리 |

### 10.2 전체 구조 평가

```
Product Master 구조: ✅ SAFE (단, 아래 주의사항 참고)
```

---

## 11. 구조 다이어그램

```
┌──────────────────────────────────────────────────────┐
│                    PRODUCT MASTER                      │
│                  (Single Source of Truth)               │
│                                                        │
│  barcode (UNIQUE, IMMUTABLE, GTIN-validated)           │
│  regulatory_type, regulatory_name (IMMUTABLE)          │
│  manufacturer_name, mfds_product_id (IMMUTABLE)        │
│  marketing_name, category_id, brand_id (MUTABLE)       │
│  tags (JSONB), specification, origin_country           │
└──────────────┬────────────┬───────────────────────────┘
               │            │
    ┌──────────▼──┐    ┌────▼────────────┐
    │ ProductImage │    │ ProductCategory  │
    │ product_images│   │ product_categories│
    │ (1:N, CASCADE)│   │ (4-tier tree)     │
    └──────────────┘    └─────────────────┘

               │
    ┌──────────▼──────────────────────────────┐
    │        SupplierProductOffer              │
    │     supplier_product_offers              │
    │                                          │
    │  master_id FK (RESTRICT)                 │
    │  supplier_id FK (CASCADE)                │
    │  UNIQUE(master_id, supplier_id)          │
    │  distribution_type: PUBLIC/SERVICE/PRIVATE│
    │  approval_status: PENDING/APPROVED/REJECTED│
    │  pricing: general/gold/platinum          │
    │  inventory: stock_qty/reserved_qty       │
    └──────────┬──────────────────────────────┘
               │
    ┌──────────▼──────────────────────────────┐
    │   OrganizationProductListing            │
    │   organization_product_listings         │
    │                                          │
    │  organization_id FK                      │
    │  master_id FK                             │
    │  offer_id FK (CASCADE)                   │
    │  service_key ('kpa', etc.)               │
    │  UNIQUE(org_id, service_key, offer_id)   │
    │  is_active (default false)               │
    └──────────┬──────────────────────────────┘
               │
    ┌──────────▼──────────────────────────────┐
    │     OrganizationProductChannel          │
    │   organization_product_channels         │
    │                                          │
    │  channel_id FK                           │
    │  product_listing_id FK                   │
    │  is_active, display_order               │
    └──────────┬──────────────────────────────┘
               │
    ┌──────────▼──────────────────────────────┐
    │        NetureOrder / OrderItem           │
    │   neture.neture_orders / _order_items    │
    │                                          │
    │  productId → SupplierProductOffer.id     │
    │  (Offer → Master 간접 추적)              │
    │  재고: reserved_quantity 증감            │
    │  7-Gate 검증                             │
    └─────────────────────────────────────────┘
```

---

## 12. 발견된 리스크 및 권고사항

### 12.1 즉각 조치 불필요 (안전)

| 항목 | 상태 |
|------|------|
| Neture Core ProductMaster barcode UNIQUE | ✅ 안전 |
| Supplier Offer → Master FK 연결 | ✅ 안전 |
| Store Listing → Offer → Master FK 체인 | ✅ 안전 |
| Neture B2B Order → Offer FK 연결 | ✅ 안전 |
| 불변 필드 보호 (barcode, regulatory) | ✅ 안전 |

### 12.2 관찰된 리스크 (향후 주의)

#### Risk 1: CheckoutOrder JSONB 스냅샷

```
위험도: MEDIUM
위치: checkout_orders.items (JSONB)

CheckoutOrder의 items 필드가 JSONB 스냅샷으로 저장되어
ProductMaster와의 FK 참조 무결성이 없다.
productId가 문자열로만 존재하여,
삭제된 상품이나 변경된 가격을 추적할 수 없다.

권고: Phase N-3에서 별도 order_items 테이블 분리 시
ProductMaster까지의 FK 체인 구성 권고.
```

#### Risk 2: 도메인 간 barcode 정책 불일치

```
위험도: LOW (현재) → MEDIUM (향후)
대상: dropshipping_product_masters, pharma_product_masters

비-Neture 도메인의 ProductMaster는 barcode가 선택적이고
UNIQUE 제약이 없다. 현재 이 도메인들이 비활성 상태이므로
즉각적 위험은 없으나, 향후 활성화 시 중복 barcode 리스크.

권고: 도메인 활성화 전 barcode UNIQUE 제약 추가 또는
Neture Core ProductMaster로 통합.
```

#### Risk 3: Cosmetics/Glycopharm barcode JSONB 배열

```
위험도: LOW
대상: cosmetics_products.barcodes, glycopharm_products.barcodes

barcode가 JSONB 배열로 저장되어 UNIQUE 제약 적용이 불가.
이 도메인들은 독립 스키마에서 운영되므로
현재 Neture Core와 충돌하지 않으나,
크로스 도메인 상품 검색 시 barcode 충돌 가능성.

권고: 크로스 도메인 barcode 검색 시
Neture Core ProductMaster를 우선 조회 소스로 사용.
```

---

## 13. 최종 결론

### Product Master 구조 평가

```
┌────────────────────────────────────────────┐
│                                            │
│   Product Master SSOT 평가:  ✅ SAFE       │
│                                            │
│   Neture Core의 product_masters 테이블이   │
│   플랫폼의 단일 상품 기준(SSOT)으로        │
│   정상적으로 동작하고 있다.                │
│                                            │
│   Barcode UNIQUE + GTIN 검증 +             │
│   불변 필드 보호 + FK 체인이               │
│   전체 흐름을 안전하게 보장한다.           │
│                                            │
│   Supplier → Product → Store → Order       │
│   연결이 barcode 기준으로 일관되게         │
│   구현되어 있다.                           │
│                                            │
└────────────────────────────────────────────┘
```

### 요약 점수

| 영역 | 평가 |
|------|:----:|
| Product Master 테이블 구조 | ✅ SAFE |
| Barcode 정책 (Neture Core) | ✅ SAFE |
| Barcode 정책 (타 도메인) | ⚠️ PARTIAL |
| Product 중복 방지 | ✅ SAFE |
| Supplier → Product 연결 | ✅ SAFE |
| Store → Product 연결 | ✅ SAFE |
| Order → Product 연결 (B2B) | ✅ SAFE |
| Order → Product 연결 (Checkout) | ⚠️ WEAK |
| Product Image 구조 | ✅ SAFE |
| Product Tag 구조 | ✅ SAFE |
| Product Status 구조 | ✅ SAFE |
| **종합** | **✅ SAFE** |

---

*조사 완료: 2026-03-09*
*조사 도구: Claude Code AI Audit Agent*
*문서 버전: V1*
