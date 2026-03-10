# IR-O4O-PRODUCT-DATA-FLOW-AUDIT-V1

**O4O Product Data Flow 코드 구조 조사**

| 항목 | 값 |
|------|------|
| 작성일 | 2026-03-09 |
| 상태 | 완료 |
| 구조 판정 | **SAFE** (일부 PARTIAL 요소 포함) |

---

## Executive Summary

O4O 플랫폼의 상품 데이터 흐름 `Supplier → Product → Store → Order`를 전체 조사한 결과:

- **Product Master SSOT**: 바코드 기반 단일 진실 소스 구현 완료
- **Distribution Engine**: 3-Tier (PUBLIC/SERVICE/PRIVATE) 자동 배포 체계 정상
- **Storefront**: 5-Gate 가시성 필터로 안전한 상품 노출
- **Order → Commission**: 배송 완료 시 파트너 커미션 자동 생성 정상
- **AI 연동**: 6종 AI 서비스 (태깅, 검색, 추천, 인사이트, Copilot, 화장품 설명) 활성

**주요 발견**: 주문 시스템이 이중 구조 (checkout_orders + neture_orders)로 운영 중. ecommerce_orders 통합은 아직 미완.

---

## 1. Product Master 구조

### 1.1 테이블: `product_masters`

**Migration**: `20260301100000-ProductMasterCoreReset.ts`
**Entity**: `modules/neture/entities/ProductMaster.entity.ts`

| 컬럼 | 타입 | 제약 | 불변 | 설명 |
|------|------|------|------|------|
| `id` | UUID | PK | - | Auto-generated |
| `barcode` | VARCHAR(14) | **NOT NULL, UNIQUE** | **YES** | GTIN (8/12/13/14자리) |
| `regulatory_type` | VARCHAR(50) | NOT NULL, DEFAULT 'UNKNOWN' | YES | MFDS 분류 |
| `regulatory_name` | VARCHAR(255) | NOT NULL | YES | MFDS 공식 명칭 |
| `marketing_name` | VARCHAR(255) | NOT NULL | NO | 마케팅 표시명 |
| `brand_name` | VARCHAR(255) | NULLABLE | NO | 브랜드명 (legacy) |
| `category_id` | UUID | FK → product_categories | NO | 카테고리 |
| `brand_id` | UUID | FK → brands | NO | 브랜드 FK |
| `specification` | TEXT | NULLABLE | NO | 규격 ("500mg x 60정") |
| `origin_country` | VARCHAR(100) | NULLABLE | NO | 원산지 |
| `tags` | JSONB | DEFAULT '[]' | NO | 검색/필터 태그 |
| `manufacturer_name` | VARCHAR(255) | NOT NULL | YES | 제조사 |
| `mfds_permit_number` | VARCHAR(100) | NULLABLE | YES | MFDS 허가번호 |
| `mfds_product_id` | VARCHAR(100) | NOT NULL, UNIQUE | YES | MFDS 제품 ID |
| `is_mfds_verified` | BOOLEAN | NOT NULL, DEFAULT TRUE | NO | MFDS 검증 여부 |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | - | 타임스탬프 |

**인덱스**: barcode, manufacturer, category, brand, tags(GIN)

### 1.2 바코드 정책

| 정책 | 구현 | 위치 |
|------|------|------|
| 바코드 필수 | `if (!barcode) return 400 MISSING_BARCODE` | neture.routes.ts:1035-1037 |
| GTIN 형식 검증 | 숫자만, 8/12/13/14자리, Luhn check digit | utils/gtin.ts |
| DB UNIQUE 제약 | `uq_product_masters_barcode` | Migration |
| 불변 | barcode 변경 불가 (immutable field) | Entity 정책 |
| masterId 직접 주입 차단 | `MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED` | neture.service.ts:1364 |

**결론**: 바코드 없으면 상품 생성 불가 → 바코드 없으면 판매 불가. **정책 완전 구현.**

### 1.3 상품 설명 구조

- `product_masters`에는 `b2c_description` / `b2b_description` 없음
- 대신 `store_product_profiles` 테이블이 조직별 커스텀 설명 제공:
  - `organization_id` + `master_id` → `display_name`, `description`
  - 각 약국이 독립적으로 상품 설명 커스터마이징 가능

### 1.4 상품 이미지: `product_images`

**Migration**: `20260307210000-CreateProductImages.ts`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK |
| `master_id` | UUID | FK → product_masters (CASCADE) |
| `image_url` | TEXT | 공개 URL |
| `gcs_path` | TEXT | GCS 경로 |
| `sort_order` | INT | 정렬 순서 |
| `is_primary` | BOOLEAN | 대표 이미지 플래그 |

- `image_type` 열 없음 → `is_primary` boolean으로 대표 이미지 구분
- Partial Index: `(master_id, is_primary) WHERE is_primary = true`

### 1.5 상품 태그

- 별도 `product_tags` 테이블 없음
- `product_masters.tags` (JSONB 배열)로 저장
- `product_ai_tags` 테이블이 AI 생성 태그 별도 관리 (confidence ≥ 0.7 → master.tags에 동기화)

---

## 2. Supplier 상품 등록 & Offer 구조

### 2.1 등록 API

```
POST /api/v1/neture/supplier/products
Middleware: requireAuth → requireActiveSupplier
```

**위치**: `neture.routes.ts:1029-1063`
**서비스**: `netureService.createSupplierOffer()` → `neture.service.ts:1334-1435`

### 2.2 등록 파이프라인 (5단계)

```
1. Barcode GTIN 검증 (validateGtin)
2. Supplier Active Guard
3. resolveOrCreateMaster(barcode, manualData)
   ├─ DB lookup by barcode → 있으면 기존 Master 사용
   ├─ MFDS API 호출 (현재 stub)
   ├─ MFDS 검증 → Master 생성 (isMfdsVerified=true)
   ├─ manualData → Master 생성 (isMfdsVerified=false)
   └─ 둘 다 없음 → ERROR
4. Extended fields 적용 (category, brand, specification...)
5. SupplierProductOffer 생성 (approvalStatus=PENDING, isActive=false)
```

### 2.3 테이블: `supplier_product_offers`

**Migration**: `20260301100000-ProductMasterCoreReset.ts:76-123`
**Entity**: `modules/neture/entities/SupplierProductOffer.entity.ts`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK |
| `master_id` | UUID | FK → product_masters (RESTRICT) |
| `supplier_id` | UUID | FK → neture_suppliers (CASCADE) |
| `distribution_type` | ENUM | PUBLIC / SERVICE / PRIVATE |
| `approval_status` | ENUM | PENDING / APPROVED / REJECTED |
| `is_active` | BOOLEAN | 공급자 활성화 토글 |
| `allowed_seller_ids` | TEXT[] | PRIVATE 배포 대상 |
| `price_general` | INT | B2B 일반 가격 |
| `price_gold` | INT | B2B 골드 가격 |
| `price_platinum` | INT | B2B 플래티넘 가격 |
| `consumer_reference_price` | INT | 소비자 참고가 |
| `stock_quantity` | INT | 재고 수량 |
| `reserved_quantity` | INT | 예약 수량 |
| `low_stock_threshold` | INT | 저재고 알림 기준 |
| `track_inventory` | BOOLEAN | 재고 추적 활성화 |
| `slug` | VARCHAR(160) | SEO URL (UNIQUE) |

**UNIQUE**: `(master_id, supplier_id)` — 공급자당 하나의 Offer

### 2.4 상품 승인 플로우

```
POST /api/v1/neture/admin/products/:id/approve
POST /api/v1/neture/admin/products/:id/reject
```

| 전이 | 조건 |
|------|------|
| PENDING → APPROVED | Admin 승인, isActive=true, PUBLIC이면 자동 확장 |
| PENDING → REJECTED | Admin 거절, isActive 유지 false |

**가드**: PENDING 상태에서만 승인/거절 가능

### 2.5 Legacy 정리

- `neture_supplier_products` (구): **DROP** in ProductMasterCoreReset migration
- `supplier_product_offers` (현): Product Master + Offer 분리 아키텍처

---

## 3. Store Listing 구조

### 3.1 핵심 관계

```
ProductMaster (1) ←── SupplierProductOffer (N)
                                ↓
                    OrganizationProductListing (N)
                                ↓
                    OrganizationProductChannel (N)
                                ↓
                      Organization (Store)
```

### 3.2 테이블: `organization_product_listings`

**Migration**: `20260215000021-CreateOrganizationProductListings.ts`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK |
| `organization_id` | UUID | FK → organizations |
| `service_key` | VARCHAR(50) | 서비스 범위 (kpa, neture 등) |
| `master_id` | UUID | FK → product_masters |
| `offer_id` | UUID | FK → supplier_product_offers |
| `is_active` | BOOLEAN | 진열 활성화 |
| `price` | NUMERIC(12,2) | 매장별 가격 오버라이드 |

**UNIQUE**: `(organization_id, service_key, offer_id)`

### 3.3 테이블: `organization_product_channels`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK |
| `channel_id` | UUID | FK → organization_channels |
| `product_listing_id` | UUID | FK → organization_product_listings |
| `is_active` | BOOLEAN | 채널 노출 활성화 |
| `display_order` | INT | 정렬 순서 |
| `channel_price` | INT | 채널별 가격 오버라이드 |
| `sales_limit` | INT | 판매 한도 |

### 3.4 Distribution Engine — 3-Tier 자동 배포

**위치**: `utils/auto-listing.utils.ts`

| Tier | 방식 | 상세 |
|------|------|------|
| **PUBLIC** | 자동 (Auto-cascade) | 승인 시 모든 활성 조직에 listing 생성 (`is_active=false` 기본) |
| **SERVICE** | 신청 → 승인 | ProductApprovalV2Service, PENDING → APPROVED → 리스팅 생성 |
| **PRIVATE** | 화이트리스트 | `allowed_seller_ids[]` 검증 후 SERVICE와 동일 플로우 |

**자동 확장 함수**: `autoExpandPublicProduct(executor, offerId, masterId)`

```sql
INSERT INTO organization_product_listings
  (organization_id, service_key, master_id, offer_id, is_active)
SELECT ose.organization_id, ose.service_code, $2, $1, false
FROM organization_service_enrollments ose
JOIN organizations o ON o.id = ose.organization_id
WHERE o.isActive = true AND ose.status = 'active'
ON CONFLICT DO NOTHING
```

**역 캐스케이드**: 공급자 INACTIVE → 모든 listing 자동 비활성화

### 3.5 신규 조직 자동 리스팅

`autoListPublicProductsForOrg(dataSource, organizationId, serviceKey)` — 새 매장 생성 시 모든 승인된 PUBLIC offer 자동 리스팅

---

## 4. Storefront 상품 조회

### 4.1 공개 API

**위치**: `routes/platform/unified-store-public.routes.ts`
**마운트**: `/api/v1/stores`

| 엔드포인트 | 설명 |
|------------|------|
| `GET /:slug/products` | 페이지네이션 상품 목록 |
| `GET /:slug/products/:id` | 상품 상세 |
| `GET /:slug/products/featured` | 추천 상품 (max 8) |
| `GET /:slug/categories` | 카테고리 목록 |
| `GET /:slug/tablet/products` | 태블릿 채널 상품 |

### 4.2 5-Gate 가시성 필터

Storefront 상품 조회 시 5중 필터가 적용됨:

```sql
FROM supplier_product_offers spo
JOIN product_masters pm ON pm.id = spo.master_id
JOIN neture_suppliers s ON s.id = spo.supplier_id
INNER JOIN organization_product_listings opl
  ON opl.offer_id = spo.id
  AND opl.organization_id = $1
  AND opl.service_key = ANY($2::text[])
  AND opl.is_active = true               -- Gate 1: Listing 활성
INNER JOIN organization_product_channels opc
  ON opc.product_listing_id = opl.id
  AND opc.is_active = true               -- Gate 2: Channel 매핑 활성
INNER JOIN organization_channels oc
  ON oc.id = opc.channel_id
  AND oc.channel_type = 'B2C'
  AND oc.status = 'APPROVED'             -- Gate 3: Channel 승인
WHERE spo.is_active = true               -- Gate 4: Offer 활성
  AND s.status = 'ACTIVE'                -- Gate 5: Supplier 활성
```

**위치**: `queryVisibleProducts()` — unified-store-public.routes.ts:103-236

| Gate | 테이블 | 조건 |
|------|--------|------|
| 1 | organization_product_listings | `is_active = true` |
| 2 | organization_product_channels | `is_active = true` |
| 3 | organization_channels | `status = 'APPROVED'` |
| 4 | supplier_product_offers | `is_active = true` |
| 5 | neture_suppliers | `status = 'ACTIVE'` |

### 4.3 태블릿 채널 특수 구조

태블릿 상품 조회는 이중 쿼리:
1. **Supplier 상품**: 4-gate 쿼리 (channel_type='TABLET')
2. **로컬 상품**: `store_local_products` 별도 조회 (Display 전용, 체크아웃 불가)
- **Hardening Guard**: DB UNION 금지, 앱 레벨 병합만 허용

---

## 5. Order 생성 흐름

### 5.1 이중 주문 시스템

현재 **두 개의 주문 시스템**이 병행 운영:

| 시스템 | 테이블 | 용도 | 상태 |
|--------|--------|------|------|
| Generic Checkout | `checkout_orders` | 일반 이커머스 | 활성 (프로덕션 미확인) |
| Neture B2B Store | `neture_orders` + `neture_order_items` | B2B 도매 주문 | **프로덕션 주력** |
| EcommerceOrder | `ecommerce_orders` | 통합 주문 (미래) | **미생성** |

### 5.2 Neture 주문 흐름

```
localStorage Cart → POST /api/v1/neture/seller/orders → neture_orders 생성
```

**위치**: `neture.routes.ts:3331`

**Cart 구조** (프론트엔드 localStorage):

```typescript
interface CartItem {
  offerId: string;        // supplier_product_offers.id
  name: string;
  imageUrl: string | null;
  priceGeneral: number;   // 표시용 (서버에서 재계산)
  quantity: number;
  supplierId: string;
  supplierName: string;
}
```

**주문 생성 요청**:

```json
{
  "items": [{ "product_id": "<offerId>", "quantity": 3 }],
  "shipping": { "recipient_name": "...", "phone": "...", "address": "..." },
  "orderer_name": "...",
  "orderer_phone": "...",
  "referral_token": "abc123"
}
```

**핵심**: `product_id` = `supplier_product_offers.id` (Offer ID)

### 5.3 neture_order_items 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK |
| `orderId` | UUID | FK → neture_orders |
| `productId` | UUID | **supplier_product_offers.id** (Offer ID!) |
| `productName` | VARCHAR(200) | 상품명 스냅샷 |
| `productImage` | JSONB | 이미지 스냅샷 |
| `quantity` | INT | 수량 |
| `unitPrice` | INT | 단가 (원) |
| `totalPrice` | INT | 합계 (원) |

### 5.4 주문 상태 흐름

```
CREATED → PENDING_PAYMENT → PAID → PREPARING → SHIPPED → DELIVERED
                                                              ↓
                                              Partner Commission 자동 생성
```

### 5.5 Order → Commission 트리거

**트리거 조건**: `status === 'DELIVERED'`
**위치**: `neture.service.ts:751-760 (updateOrderStatus)`

```typescript
if (data.status === NetureOrderStatus.DELIVERED) {
  await this.partnerCommissionService.createContractCommissionsForOrder(id);
}
```

**Commission 관계 체인**:

```
OrderItem.productId (offer UUID)
  → SupplierProductOffer.id
    → SupplierProductOffer.master_id
      → NeturePartnerRecruitment.product_id
        → NetureSellerPartnerContract.recruitment_id
          → partner_commissions 생성 (status=pending)
```

---

## 6. AI & OCR 연결 조사

### 6.1 AI 서비스 (6종 활성)

| 서비스 | 위치 | 기능 | 제공자 |
|--------|------|------|--------|
| Product AI Tagging | `store-ai/services/product-ai-tagging.service.ts` | 상품 자동 태그 생성 (confidence ≥ 0.7 → master.tags 동기화) | Gemini |
| Product AI Search | `store-ai/services/product-ai-search.service.ts` | AI 태그 + 상품명 통합 검색 | Algorithm |
| Product AI Recommendation | `store-ai/services/product-ai-recommendation.service.ts` | 태그 기반 추천 (60% 태그 + 30% confidence + 10% 인기도) | Algorithm |
| Store AI Insight | `store-ai/services/store-ai-insight.service.ts` | 매장 KPI 요약 (LLM) | Gemini |
| Product Store AI Insight | `store-ai/services/store-ai-product-insight.service.ts` | 상품별 매출 분석 (LLM) | Gemini |
| Cosmetics AI Description | `cosmetics-partner-extension/.../ai-description.service.ts` | SNS/블로그 상품 설명 생성 | Template |

### 6.2 Copilot 서비스 (3종)

| Copilot | 위치 | AI 방식 |
|---------|------|---------|
| Partner Copilot | `neture/services/partner-copilot.service.ts` | Gemini + Rule-based fallback |
| Supplier Copilot | `neture/services/supplier-copilot.service.ts` | Algorithm (SQL 집계) |
| Operator Copilot | `operator/operator-copilot.service.ts` | Gemini + Rule-based fallback |

### 6.3 Care AI 서비스 (2종)

| 서비스 | 기능 | 제약 |
|--------|------|------|
| Care LLM Insight | 환자 KPI 분석 (약사용/환자용) | 의료 진단/처방/치료 추천 금지 |
| Care Coaching Draft | AI 건강 행동 코칭 초안 | 약품명/의료 조언 금지 |

### 6.4 AI 인프라

- **@o4o/ai-core**: Gemini Provider (temperature 0.2-0.4, JSON 강제 모드, 10초 timeout)
- **Vision AI**: OpenAI/Gemini/Claude 3종 Vision 분석 (admin-dashboard)

### 6.5 OCR 기능

**OCR 미구현.** tesseract, textract, Google Vision OCR 등 텍스트 추출 기능 없음.
QR 코드는 매출 추적 지표로만 사용 (생성/스캔 기능 없음).

---

## 7. 전체 데이터 흐름 다이어그램

```
┌──────────────┐
│   Supplier   │
│  (공급자)     │
└──────┬───────┘
       │ POST /supplier/products
       │ barcode 필수
       ▼
┌──────────────────┐     ┌─────────────────┐
│ resolveOrCreate  │────▶│  product_masters │
│  Master          │     │  (SSOT, UNIQUE   │
│ (barcode lookup) │     │   barcode)       │
└──────┬───────────┘     └─────────────────┘
       │                          ▲
       ▼                          │ master_id FK
┌──────────────────────┐          │
│ supplier_product_    │──────────┘
│ offers               │
│ (PENDING → APPROVED) │
│ distribution_type:   │
│  PUBLIC/SERVICE/     │
│  PRIVATE             │
└──────┬───────────────┘
       │
       │ Admin Approve
       │ (PUBLIC → Auto-cascade)
       ▼
┌──────────────────────────┐
│ organization_product_    │
│ listings                 │
│ (org_id + offer_id)      │
│ is_active = false 기본   │
└──────┬───────────────────┘
       │ Store Owner 활성화
       │ + 채널 매핑
       ▼
┌──────────────────────────┐
│ organization_product_    │
│ channels                 │
│ (channel_id +            │
│  listing_id)             │
│ B2C / TABLET / KIOSK     │
└──────┬───────────────────┘
       │
       │ 5-Gate 가시성 필터
       ▼
┌──────────────────────────┐
│ Storefront API           │
│ GET /stores/:slug/       │
│  products                │
│ (queryVisibleProducts)   │
└──────┬───────────────────┘
       │
       │ Add to Cart (localStorage)
       │ POST /seller/orders
       ▼
┌──────────────────────────┐
│ neture_orders +          │
│ neture_order_items       │
│ (productId = offerId)    │
└──────┬───────────────────┘
       │
       │ DELIVERED 상태
       ▼
┌──────────────────────────┐
│ partner_commissions      │
│ (자동 생성, pending)      │
└──────────────────────────┘
```

---

## 8. 구조 판정

### 항목별 평가

| # | 항목 | 판정 | 근거 |
|---|------|------|------|
| 1 | Product Master SSOT | **SAFE** | 바코드 UNIQUE, 불변 필드, 직접 주입 차단 |
| 2 | Barcode 정책 | **SAFE** | GTIN 검증 + DB UNIQUE + 필수 입력 |
| 3 | Supplier Offer 구조 | **SAFE** | Master 분리, 승인 플로우, 3-Tier 배포 |
| 4 | Store Listing 구조 | **SAFE** | 5-Gate 가시성, auto-cascade, 역 캐스케이드 |
| 5 | Storefront 조회 | **SAFE** | 5-Gate 복합 JOIN, 캐시 지원 |
| 6 | Order 생성 | **PARTIAL** | 이중 시스템 (neture_orders + checkout_orders), 통합 미완 |
| 7 | Order → Commission | **SAFE** | DELIVERED 자동 트리거, 중복 방지 (UNIQUE WHERE) |
| 8 | AI 연동 | **SAFE** | 6종 AI 서비스, fire-and-forget 패턴, 의료 제약 준수 |
| 9 | OCR | **N/A** | 미구현 |

### 종합 판정: **SAFE** (일부 PARTIAL)

**PARTIAL 사유**:
- `neture_orders` + `checkout_orders` 이중 주문 시스템 → `ecommerce_orders` 통합 필요
- `ecommerce_orders` 테이블이 프로덕션에 미생성
- `checkout_orders` 프로덕션 존재 여부 불확실

### 데이터 흐름 정상 여부: **정상**

설계 의도대로 `Supplier → Product Master → Offer → Listing → Storefront → Order → Commission` 흐름이 코드에 완전히 구현되어 있음.

### 설계와 코드 일치 여부: **일치** (이중 주문 시스템 제외)

- Distribution Engine Freeze (F8) 준수
- Boundary Policy (F6) 준수 (Storefront = storeId, Commerce = storeId)
- E-Commerce Order Contract는 `ecommerce_orders` 미생성으로 부분 준수

---

## 9. 후속 WO 제안

| # | WO | 목적 | 우선순위 |
|---|-----|------|---------|
| 1 | WO-O4O-ORDER-SYSTEM-UNIFICATION-V1 | neture_orders → ecommerce_orders 통합 | Medium |
| 2 | WO-O4O-PRODUCT-MASTER-INTEGRITY-AUDIT | 프로덕션 데이터 정합성 검증 (중복 바코드, 고아 Offer 등) | **High** |
| 3 | WO-O4O-MFDS-API-INTEGRATION-V1 | MFDS API stub → 실제 연동 | Low |

---

## 주요 파일 참조

| 파일 | 역할 |
|------|------|
| `modules/neture/entities/ProductMaster.entity.ts` | Product Master 엔티티 |
| `modules/neture/entities/SupplierProductOffer.entity.ts` | Offer 엔티티 |
| `modules/neture/neture.service.ts:1334-1435` | Supplier 상품 등록 |
| `modules/neture/neture.service.ts:1566-1633` | resolveOrCreateMaster |
| `utils/auto-listing.utils.ts` | 자동 리스팅 확장/축소 |
| `utils/gtin.ts` | GTIN 바코드 검증 |
| `routes/platform/unified-store-public.routes.ts` | Storefront API |
| `routes/neture/services/neture.service.ts:751` | Order → Commission 트리거 |
| `modules/neture/services/partner-commission.service.ts` | Commission 생성 |
| `modules/store-ai/services/` | AI 서비스 6종 |

---

*조사 완료: 2026-03-09*
*작성: AI Assistant (Claude)*
