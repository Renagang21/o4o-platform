# IR-O4O-SUPPLIER-PRODUCT-INGESTION-AUDIT-V1

**O4O Supplier Product Ingestion 구조 조사**

| 항목 | 값 |
|------|------|
| 작성일 | 2026-03-09 |
| 상태 | 완료 |
| 구조 판정 | **SAFE** (데이터 품질 Gate 보강 권장) |

---

## Executive Summary

O4O 플랫폼의 공급자 상품 등록 파이프라인을 전체 조사한 결과:

- **Ingestion Pipeline**: 바코드 기반 `resolveOrCreateMaster` → Offer 생성 → Admin 승인 → 자동 배포 (**SAFE**)
- **Product Master 보호**: 6개 불변 필드 런타임 Guard + Admin-only 수정 (**SAFE**)
- **Multi-supplier 공유**: 동일 바코드 → 동일 Master 자동 연결 (**SAFE**, 알림 없음)
- **이미지 관리**: GCS 업로드 + Master 레벨 공유 (**SAFE**)
- **데이터 품질**: 승인 전 이미지/설명 존재 검증 없음 (**PARTIAL**)

---

## 1. Supplier 상품 등록 API

### 1.1 엔드포인트

```
POST /api/v1/neture/supplier/products
Middleware: requireAuth → requireActiveSupplier
```

**위치**: `neture.routes.ts:1029-1063`

### 1.2 입력 데이터

```typescript
{
  barcode: string;                // 필수 — GTIN (8/12/13/14자리)
  manualData?: {                  // MFDS 미검증 시 수동 입력
    regulatoryType?: string;      // MFDS 분류
    regulatoryName: string;       // 공식 명칭 (필수)
    manufacturerName: string;     // 제조사 (필수)
    marketingName?: string;       // 마케팅명
    mfdsPermitNumber?: string;    // MFDS 허가번호
    categoryId?: string;          // 카테고리
    brandId?: string;             // 브랜드
    specification?: string;       // 규격
    originCountry?: string;       // 원산지
    tags?: string[];              // 태그
  };
  distributionType?: string;      // PUBLIC | SERVICE | PRIVATE (기본: PRIVATE)
  priceGeneral?: number;          // B2B 일반가
  priceGold?: number;             // B2B 골드가
  pricePlatinum?: number;         // B2B 플래티넘가
  consumerReferencePrice?: number;// 소비자 참고가
}
```

### 1.3 등록 파이프라인 (5단계)

```
Step 1: Barcode GTIN 검증
  └─ validateGtin(barcode) — 숫자, 8/12/13/14자리, Luhn check digit
  └─ 실패 시: INVALID_GTIN 에러

Step 2: Supplier Active Guard
  └─ supplier.status !== ACTIVE → SUPPLIER_NOT_ACTIVE 에러
  └─ PENDING/REJECTED/INACTIVE 차단

Step 3: masterId 직접 주입 차단
  └─ 'masterId' in data → MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED

Step 4: resolveOrCreateMaster(barcode, manualData)
  ├─ DB lookup: product_masters WHERE barcode = $1
  │   └─ 있으면 → 기존 Master 반환 (multi-supplier 공유)
  ├─ MFDS API 호출 (현재 stub)
  │   └─ MFDS 검증 → Master 생성 (isMfdsVerified=true)
  ├─ manualData 제공 시
  │   └─ Master 생성 (isMfdsVerified=false)
  └─ 둘 다 없음 → MASTER_RESOLVE_FAILED

Step 5: SupplierProductOffer 생성
  └─ approvalStatus = PENDING
  └─ isActive = false
  └─ distributionType = 요청값 또는 PRIVATE
```

**위치**: `neture.service.ts:1334-1435` (createSupplierOffer), `1566-1633` (resolveOrCreateMaster)

---

## 2. Supplier 상품 데이터 저장 구조

### 2.1 테이블 관계

```
product_masters          (상품 SSOT — 바코드 기준 1:1)
      ↑ master_id FK
supplier_product_offers  (공급자별 Offer — 가격, 배포, 재고)
      ↑ offer_id FK
organization_product_listings  (매장 진열)
      ↑ listing_id FK
organization_product_channels  (채널 노출)
```

### 2.2 테이블 이력

| 테이블 | 상태 | 비고 |
|--------|------|------|
| `neture_supplier_products` | **DROP (삭제됨)** | P1 레거시, ProductMasterCoreReset에서 삭제 |
| `supplier_product_offers` | **현행** | Master + Offer 분리 아키텍처 |
| `supplier_catalog` | **없음** | 존재하지 않음 |

---

## 3. Product Master 매칭 로직

### 3.1 Case 1: 바코드 존재 → 기존 Master 연결

```typescript
// neture.service.ts:1584-1587
const existing = await this.masterRepo.findOne({ where: { barcode } });
if (existing) {
  return { success: true, data: existing };  // ← 기존 Master 재사용
}
```

**특징**:
- **Silent reuse** — 로그 없음, 알림 없음
- Supplier A가 이미 등록한 상품을 Supplier B가 등록해도 동일 Master 사용
- 각 Supplier는 자신만의 Offer (가격, 배포, 재고) 유지

### 3.2 Case 2: 바코드 없음 → Master 생성

```
MFDS API 호출 (stub)
  ├─ 검증 성공 → Master 생성 (isMfdsVerified=true)
  ├─ stub + manualData → Master 생성 (isMfdsVerified=false)
  └─ 둘 다 없음 → ERROR
```

**MFDS stub 위치**: `modules/neture/services/mfds.service.js`

### 3.3 프론트엔드 3-Step Wizard

**위치**: `SupplierProductCreatePage.tsx`

```
Step 1: 바코드 입력 → productApi.getMasterByBarcode(barcode)
  ├─ Master 발견 → Step 3으로 건너뜀 (가격/배포 설정만)
  └─ Master 미발견 → Step 2

Step 2: 수동 데이터 입력
  └─ regulatoryName, manufacturerName (필수)
  └─ 이미지 선택 (React state, 아직 업로드 안 함)

Step 3: 가격/배포 설정 → 제출
  └─ createProduct() → 이미지 순차 업로드
```

---

## 4. Supplier Offer 생성 구조

### 4.1 테이블: `supplier_product_offers`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK |
| `master_id` | UUID | FK → product_masters (RESTRICT) |
| `supplier_id` | UUID | FK → neture_suppliers (CASCADE) |
| `distribution_type` | ENUM | PUBLIC / SERVICE / PRIVATE |
| `approval_status` | ENUM | PENDING / APPROVED / REJECTED |
| `is_active` | BOOLEAN | 공급자 활성화 (기본 false) |
| `allowed_seller_ids` | TEXT[] | PRIVATE 배포 대상 |
| `price_general` | INT | B2B 일반 가격 |
| `price_gold` | INT | B2B 골드 가격 |
| `price_platinum` | INT | B2B 플래티넘 가격 |
| `consumer_reference_price` | INT | 소비자 참고가 |
| `stock_quantity` | INT | 재고 수량 |
| `reserved_quantity` | INT | 예약 수량 |
| `low_stock_threshold` | INT | 저재고 알림 기준 (기본 10) |
| `track_inventory` | BOOLEAN | 재고 추적 활성화 |
| `slug` | VARCHAR(160) | SEO URL (UNIQUE) |

**제약조건**: `UNIQUE(master_id, supplier_id)` — 공급자당 상품별 1개 Offer만 가능

---

## 5. 상품 승인 프로세스

### 5.1 승인 흐름

```
Supplier 등록
  └─ approvalStatus = PENDING, isActive = false

Admin 승인 (POST /admin/products/:id/approve)
  └─ approvalStatus = APPROVED, isActive = true
  └─ PUBLIC → autoExpandPublicProduct() → 모든 매장에 listing 생성

Admin 거절 (POST /admin/products/:id/reject)
  └─ approvalStatus = REJECTED, isActive = false
  └─ 기존 listing 취소 (product_approvals → revoked)
```

**위치**: `neture.service.ts:510-561` (approve), `566-612` (reject)

### 5.2 승인 가드

| 규칙 | 구현 |
|------|------|
| PENDING에서만 승인/거절 가능 | `if (offer.approvalStatus !== 'PENDING') return error` |
| Admin만 승인 가능 | `requireNetureScope('neture:admin')` |
| PUBLIC 승인 시 자동 확장 | `autoExpandPublicProduct()` |

### 5.3 승인 전 품질 검증

| 검증 항목 | 구현 여부 |
|-----------|----------|
| 바코드 형식 | **검증됨** (GTIN) |
| 바코드 존재 | **검증됨** (NOT NULL) |
| 이미지 존재 | **미검증** |
| 설명/마케팅명 | **미검증** |
| 가격 유효성 | **미검증** |

---

## 6. 상품 이미지 등록 구조

### 6.1 이미지 업로드 API

```
POST /api/v1/neture/products/:masterId/images
Middleware: requireAuth → requireActiveSupplier → uploadSingleMiddleware('image')
```

**위치**: `neture.routes.ts:715-746`

### 6.2 업로드 프로세스

```
Multipart FormData (max 10MB)
  → multer memoryStorage (메모리에 보관)
    → sharp 이미지 처리
      ├─ max 1200×1200 리사이즈
      └─ WebP 변환 (quality: 85%)
        → GCS 업로드
          ├─ 경로: products/{masterId}/{uuid}.webp
          └─ 버킷: o4o-neture-product-images
            → product_images 테이블 저장
```

### 6.3 이미지 관리 API

| API | 설명 |
|-----|------|
| `PATCH /products/images/:imageId/primary` | 대표 이미지 설정 |
| `DELETE /products/images/:imageId` | 이미지 삭제 (GCS 실패 시 non-fatal) |

### 6.4 핵심 설계

- 이미지는 **ProductMaster 레벨**에 저장 (`supplier_product_images` 테이블 없음)
- **동일 바코드의 모든 Supplier가 이미지를 공유**
- 첫 번째 이미지 자동으로 `isPrimary = true`
- 대표 이미지 삭제 시 다음 이미지가 자동 승격

### 6.5 이미지 접근 권한

| 역할 | 업로드 | 조건 |
|------|--------|------|
| Supplier (ACTIVE) | **가능** | Offer가 있는 Master에만 |
| Supplier (PENDING/REJECTED) | **불가** | requireActiveSupplier 차단 |
| Admin | **가능** | 모든 Master |

---

## 7. Supplier 상품 수정 흐름

### 7.1 수정 API

```
PATCH /api/v1/neture/supplier/products/:id
Middleware: requireAuth → requireActiveSupplier
```

**위치**: `neture.routes.ts:1093-1125`

### 7.2 수정 가능 필드 (Offer 레벨)

| 필드 | 타입 | 검증 |
|------|------|------|
| `isActive` | boolean | 없음 |
| `distributionType` | enum | PRIVATE → allowedSellerIds 필수 |
| `allowedSellerIds` | string[] | PRIVATE 배포 시 1개 이상 |
| `priceGeneral` | number | 없음 |
| `priceGold` | number | 없음 |
| `pricePlatinum` | number | 없음 |
| `consumerReferencePrice` | number | 없음 |

### 7.3 재고 수정 API

```
PATCH /api/v1/neture/supplier/inventory/:offerId
```

| 필드 | 설명 |
|------|------|
| `stock_quantity` | 재고 수량 |
| `low_stock_threshold` | 저재고 알림 기준 |
| `track_inventory` | 재고 추적 활성화 |

### 7.4 Product Master 수정 권한

| 역할 | Master 수정 | 위치 |
|------|------------|------|
| Supplier | **불가** | 직접 수정 API 없음 |
| Admin | **가능** | `PATCH /admin/masters/:id` (mutable 필드만) |

**불변 필드 (Immutable)** — 누구도 수정 불가:

```typescript
// neture.service.ts:1531-1538
private static readonly MASTER_IMMUTABLE_FIELDS = [
  'barcode',
  'regulatoryType',
  'regulatoryName',
  'manufacturerName',
  'mfdsPermitNumber',
  'mfdsProductId',
];
```

**수정 가능 필드 (Admin Only)**:
- `marketingName`, `brandName`, `categoryId`, `brandId`, `specification`, `originCountry`, `tags`

**런타임 가드**: `neture.service.ts:1641-1654`

```typescript
const violatedFields = NetureService.MASTER_IMMUTABLE_FIELDS.filter(f => f in updates);
if (violatedFields.length > 0) {
  return { success: false, error: `IMMUTABLE_FIELD_VIOLATION: ${violatedFields.join(', ')}` };
}
```

---

## 8. Supplier 상품 삭제 정책

### 8.1 Hard Delete

**없음.** DELETE 엔드포인트 미구현.

### 8.2 Soft Delete

`PATCH /supplier/products/:id` with `{ isActive: false }`

### 8.3 캐스케이드 동작

| 액션 | Listing 영향 | 이미지 영향 |
|------|-------------|------------|
| Supplier `isActive=false` | **캐스케이드 없음** — Listing 유지 | 영향 없음 |
| Admin Reject | **캐스케이드 있음** — Listing 비활성화 | 영향 없음 |
| Master DELETE (FK) | `ON DELETE RESTRICT` → Offer 삭제 차단 | `ON DELETE CASCADE` → 이미지 삭제 |

**발견**: Supplier가 Offer를 비활성화해도 매장의 Listing이 자동으로 비활성화되지 않음.
→ Storefront 5-Gate 필터에서 `spo.is_active = true` 조건으로 노출은 차단되지만, DB에는 고아 Listing이 남음.

---

## 9. Multi-supplier 중복 상품 구조

### 9.1 동작 방식

```
Supplier A: barcode "8801234567890" → Master #1 생성 → Offer A
Supplier B: barcode "8801234567890" → Master #1 재사용 → Offer B
```

| 항목 | 동작 |
|------|------|
| Master 공유 | **자동** — barcode lookup으로 기존 Master 재사용 |
| Offer 분리 | **보장** — UNIQUE(master_id, supplier_id) |
| 이미지 공유 | **공유** — Master 레벨 저장 |
| 가격 독립 | **독립** — 각 Offer별 독자 가격 |
| 알림 | **없음** — Silent reuse (로그/알림 없음) |
| 재고 독립 | **독립** — 각 Offer별 독자 재고 |

### 9.2 Supplier 간 영향

```
Supplier A가 이미지 업로드 → Master에 저장 → Supplier B도 동일 이미지 사용
Supplier A가 이미지 삭제 → Master에서 삭제 → Supplier B도 이미지 사라짐
```

**리스크**: 이미지 공유로 인한 의도하지 않은 영향 가능 (현재 Guard 없음)

---

## 10. Supplier 상품 조회 API

```
GET /api/v1/neture/supplier/products
Middleware: requireAuth → requireLinkedSupplier (ANY status)
```

**위치**: `neture.routes.ts:1069-1087`, `neture.service.ts:1258-1328`

**반환 데이터**:

```typescript
{
  id: string;                    // Offer ID
  isActive: boolean;
  distributionType: 'PUBLIC' | 'SERVICE' | 'PRIVATE';
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  priceGeneral: number;
  masterId: string;
  masterName: string;            // marketingName || regulatoryName
  barcode: string;
  brandName: string | null;
  categoryName: string | null;
  specification: string | null;
  primaryImageUrl: string | null;
  pendingRequestCount: number;   // v2 승인 대기 수
  activeServiceCount: number;    // v2 활성 계약 수
  createdAt: string;
}
```

**접근 권한**: PENDING 상태 Supplier도 자신의 상품 조회 가능 (requireLinkedSupplier)

---

## 11. 전체 데이터 흐름 다이어그램

```
┌──────────────┐
│   Supplier   │ ACTIVE 상태만 등록 가능
└──────┬───────┘
       │ POST /supplier/products
       │ barcode 필수 (GTIN 검증)
       ▼
┌──────────────────────┐
│ resolveOrCreateMaster│
│ (barcode 기반)       │
│                      │
│ Case 1: 바코드 존재  │──── 기존 Master 재사용 (Silent)
│ Case 2: 바코드 없음  │──── MFDS 또는 수동으로 Master 생성
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐     ┌─────────────────┐
│ supplier_product_    │────▶│  product_masters │
│ offers               │     │  (SSOT)         │
│                      │     │  불변 6필드      │
│ status: PENDING      │     │  수정 가능 7필드  │
│ isActive: false      │     │  (Admin Only)    │
└──────┬───────────────┘     └────────┬────────┘
       │                              │
       │ + 이미지 업로드               │
       │ POST /products/:masterId/    │
       │   images                     │
       │   ↓                          │
       │ product_images              ◀┘
       │ (Master 레벨 공유)
       │
       │ Admin 승인
       ▼
┌──────────────────────┐
│ APPROVED + isActive  │
│                      │
│ PUBLIC → 자동 확장   │──── organization_product_listings
│ SERVICE → 신청 승인  │     (매장 진열)
│ PRIVATE → 화이트리스트│
└──────┬───────────────┘
       │
       │ 5-Gate 가시성 필터
       ▼
┌──────────────────────┐
│ Storefront API       │
│ GET /stores/:slug/   │
│   products           │
└──────┬───────────────┘
       │
       │ Cart (localStorage) → Order
       ▼
┌──────────────────────┐
│ neture_orders +      │
│ neture_order_items   │
│ (productId = offerId)│
└──────────────────────┘
```

---

## 12. 구조 평가

### 항목별 판정

| # | 항목 | 판정 | 근거 |
|---|------|------|------|
| 1 | Barcode 기반 Product 매칭 | **SAFE** | GTIN 검증 + UNIQUE + NOT NULL + 불변 |
| 2 | Supplier Offer 구조 | **SAFE** | UNIQUE(master_id, supplier_id), 가격/재고 독립 |
| 3 | Product Master 보호 | **SAFE** | 6개 불변 필드 런타임 Guard, Supplier 수정 차단 |
| 4 | masterId 주입 차단 | **SAFE** | `MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED` |
| 5 | 이미지 관리 | **SAFE** | GCS + sharp 처리 + DB 기록, ACTIVE 가드 |
| 6 | 승인 프로세스 | **SAFE** | PENDING → APPROVED/REJECTED, Admin 전용 |
| 7 | Multi-supplier 공유 | **SAFE** | Master 재사용 정상, Offer 분리 보장 |
| 8 | Offer 비활성화 캐스케이드 | **PARTIAL** | Listing 자동 비활성화 없음 (5-Gate에서 차단되긴 함) |
| 9 | 이미지 공유 리스크 | **PARTIAL** | Supplier A 삭제 → Supplier B 이미지 사라짐 |
| 10 | 승인 전 품질 Gate | **PARTIAL** | 이미지/설명/가격 검증 없이 승인 가능 |

### 종합 판정: **SAFE** (데이터 품질 Gate 보강 권장)

Ingestion Pipeline의 핵심 구조(바코드 매칭, Master 보호, Offer 분리, 승인 플로우)는 모두 **설계대로 구현**되어 있음.

단, 3개 PARTIAL 항목은 운영 시 데이터 품질 문제를 유발할 수 있음:
1. Offer 비활성화 시 Listing 고아 발생 (5-Gate에서 노출은 차단)
2. 이미지 Master-level 공유로 인한 cross-supplier 영향
3. 승인 시 이미지/설명 존재 검증 없음

---

## 13. 후속 WO 제안

| # | WO | 목적 | 우선순위 |
|---|-----|------|---------|
| 1 | WO-O4O-APPROVAL-QUALITY-GATE-V1 | 승인 시 이미지 존재 + 가격 유효성 자동 검증 | High |
| 2 | WO-O4O-OFFER-DEACTIVATION-CASCADE-V1 | Offer 비활성화 → Listing 자동 비활성화 | Medium |
| 3 | WO-O4O-MULTI-SUPPLIER-IMAGE-ISOLATION-V1 | Supplier별 이미지 소유권 또는 삭제 보호 | Low |
| 4 | WO-O4O-MFDS-API-REAL-INTEGRATION-V1 | MFDS stub → 실제 API 연동 | Medium |

---

## 주요 파일 참조

| 파일 | 역할 | 핵심 라인 |
|------|------|----------|
| `neture.routes.ts` | 상품 등록/수정/이미지 API | 715-746, 1029-1063, 1093-1125 |
| `neture.service.ts` | createSupplierOffer, resolveOrCreateMaster, updateSupplierOffer | 1334-1435, 1566-1633, 1442-1521 |
| `neture.service.ts` | MASTER_IMMUTABLE_FIELDS, updateProductMaster | 1531-1538, 1641-1687 |
| `neture.service.ts` | addProductImage, deleteProductImage | 1839-1891 |
| `image-storage.service.ts` | GCS 업로드 | 1-83 |
| `gtin.ts` | GTIN 바코드 검증 | 전체 |
| `auto-listing.utils.ts` | PUBLIC 자동 확장 | 33-49, 70-105 |
| `ProductMaster.entity.ts` | Master 엔티티 정의 | 전체 |
| `SupplierProductOffer.entity.ts` | Offer 엔티티 정의 | 전체 |
| `ProductImage.entity.ts` | 이미지 엔티티 | 전체 |
| `SupplierProductCreatePage.tsx` | 프론트엔드 3-Step Wizard | 전체 |

---

*조사 완료: 2026-03-09*
*작성: AI Assistant (Claude)*
