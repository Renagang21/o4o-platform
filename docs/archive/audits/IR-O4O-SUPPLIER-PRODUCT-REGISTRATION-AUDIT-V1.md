# IR-O4O-SUPPLIER-PRODUCT-REGISTRATION-AUDIT-V1

> **Status**: Complete (READ-ONLY Investigation)
> **Date**: 2026-03-16
> **Scope**: Neture 공급자 상품 등록 시스템 전수 조사
> **코드 수정**: 없음

---

## 1. 조사 범위

| 조사 대상 | 범위 |
|-----------|------|
| 서비스 | api-server, web-neture |
| 기능 | 단일 상품 등록, CSV Import, Catalog Import, 이미지 처리, B2B/B2C 구조, 공개 정책, 승인 프로세스, 매장 연계 |

---

## 2. 상품 등록 방식

### 2-1. 단일 상품 등록

| 항목 | 내용 |
|------|------|
| 등록 API | `POST /api/v1/neture/supplier/products` |
| 컨트롤러 | `supplier-product.controller.ts` |
| 서비스 | `NetureService.createSupplierOffer()` |
| 사용 엔티티 | `ProductMaster`, `SupplierProductOffer` |
| 저장 테이블 | `product_masters`, `supplier_product_offers`, `product_images` |
| 인증 | `requireAuth` + `requireActiveSupplier` (supplier.status = ACTIVE) |

**필수 필드:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|:----:|------|
| `barcode` | string | **O** | GTIN (8/12/13/14자리) |
| `priceGeneral` | number | **O** | B2B 일반 공급가 (원) |
| `manualData.regulatoryName` | string | △ | 바코드 미등록 시 필수 |
| `manualData.manufacturerName` | string | △ | 바코드 미등록 시 필수 |
| `distributionType` | string | - | PUBLIC / SERVICE / PRIVATE (기본: PRIVATE) |
| `priceGold` | number | - | B2B Gold 등급가 |
| `pricePlatinum` | number | - | B2B Platinum 등급가 |
| `consumerReferencePrice` | number | - | 소비자 참고가 |
| `consumerShortDescription` | string | - | B2C 짧은 설명 (Tiptap HTML) |
| `consumerDetailDescription` | string | - | B2C 상세 설명 (Tiptap HTML) |
| `businessShortDescription` | string | - | B2B 짧은 설명 (Tiptap HTML) |
| `businessDetailDescription` | string | - | B2B 상세 설명 (Tiptap HTML) |

**등록 파이프라인:**

```
1. 바코드 검증 (GTIN 포맷)
2. masterId 직접 주입 차단 (보안 가드)
3. 공급자 ACTIVE 상태 확인
4. Master 해석/생성 (resolveOrCreateMaster)
   ├─ 기존 Master 존재 → 재사용
   ├─ MFDS 검증 성공 → MFDS 데이터로 Master 생성
   └─ MFDS 미검증 + manualData → 수동 데이터로 Master 생성
5. 확장 필드 적용 (카테고리, 브랜드, 스펙 등)
6. Slug 생성: {barcode}-{supplierId:8}-{timestamp}
7. SupplierProductOffer 생성 (isActive=false, approvalStatus=PENDING)
```

**프론트엔드 3단계 위저드:**

| 단계 | 내용 | 화면 |
|:----:|------|------|
| 1 | 바코드 검색 | 바코드 입력 → getMasterByBarcode() 호출 |
| 2 | Master 정보 입력 (바코드 미등록 시) | regulatoryName, manufacturerName, 카테고리, 브랜드 등 |
| 3 | Offer 정보 입력 | 가격(3 tier), 설명(B2C/B2B), 공개 정책 |

---

### 2-2. CSV Import 등록

| 항목 | 내용 |
|------|------|
| 서비스 | `CsvImportService` (`csv-import.service.ts`) |
| 모듈 | `neture` 모듈 내 |
| WO | WO-O4O-B2B-CSV-INGEST-PIPELINE-V1 |

**CSV 컬럼 구조:**

| 컬럼 | 필수 | 설명 |
|------|:----:|------|
| `barcode` | **O** | GTIN 바코드 |
| `supplier_sku` | - | 공급자 내부 SKU |
| `supply_price` | - | 공급가 (원, 정수) |
| `distribution_type` | - | PUBLIC / SERVICE / PRIVATE |
| `description` | - | 설명 (rawJson 캡처) |
| `msrp` | - | 소비자 권장가 (파싱만, 미사용) |
| `stock_qty` | - | 재고 (파싱만, 미사용) |

**Validation 규칙:**

| # | 검증 | 실패 시 |
|:-:|------|---------|
| 1 | 바코드 존재 여부 | REJECTED: INVALID_BARCODE |
| 2 | GTIN 포맷 검증 | REJECTED: INVALID_GTIN |
| 3 | 배치 내 중복 | REJECTED: DUPLICATE_IN_BATCH |
| 4 | 가격 검증 (≥ 0) | REJECTED: INVALID_PRICE |
| 5 | Distribution Type 검증 | REJECTED: INVALID_DISTRIBUTION_TYPE |
| 6 | Master 조회 | LINK_EXISTING / MFDS 검증 → CREATE_MASTER / REJECTED |

**핵심 제약**: CSV Import는 **MFDS 검증된 제품만** Master 생성 가능. 수동 데이터 입력 불가.

**상태 흐름:**

```
UPLOADED → VALIDATING → READY (또는 FAILED) → APPLIED
```

---

### 2-3. Catalog Import 등록

| 항목 | 내용 |
|------|------|
| 서비스 | `CatalogImportService` (`catalog-import.service.ts`) |
| 모듈 | `catalog-import` 독립 모듈 |
| WO | WO-O4O-CATALOG-IMPORT-APP-IMPLEMENTATION-V1 |
| 확장 지원 | CSV, Firstmall Excel (확장 가능) |

**Extension Registry:**

| 키 | 파서 | 소스 |
|----|------|------|
| `csv` | `csvParserExtension` | CSV 파일 |
| `firstmall` | `firstmallParserExtension` | Firstmall Excel |

**NormalizedProduct 공통 출력:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `barcode` | string | GTIN 바코드 |
| `productName` | string | 상품명 |
| `brandName` | string | 브랜드명 |
| `manufacturerName` | string | 제조사명 |
| `regulatoryName` | string | 식약처 등록명 |
| `price` | number | 공급가 |
| `distributionType` | string | 공개 정책 |
| `supplierSku` | string | 공급자 SKU |
| `imageUrls` | string[] | 이미지 URL 목록 |

**Firstmall 전용 매핑:**

| 엑셀 헤더 | 매핑 필드 |
|-----------|----------|
| 상품명 | productName |
| 바코드 | barcode |
| 브랜드 | brandName |
| 제조사 | manufacturerName |
| 판매가 | price |
| 상품코드 | supplierSku |
| 이미지/대표이미지/상세이미지/추가이미지 | imageUrls[] |

**CSV Import와의 핵심 차이:**

| 항목 | CSV Import | Catalog Import |
|------|-----------|----------------|
| 소스 | CSV만 | CSV, Excel (확장 가능) |
| 이미지 지원 | **없음** | **있음** (Excel 헤더에서 추출) |
| 수동 Master 생성 | **불가** (MFDS만) | **가능** (manualData 폴백) |
| Validation 상태 | VALID / REJECTED | VALID / **WARNING** / REJECTED |
| WARNING 행 | 없음 | **있음** (apply 가능) |
| 모듈 위치 | neture 모듈 내 | 독립 catalog-import 모듈 |

**상태 흐름:**

```
UPLOADED → VALIDATING → VALIDATED (또는 FAILED) → APPLYING → APPLIED
```

---

## 3. 상품 데이터 구조

### 3-1. 엔티티 관계도

```
ProductMaster (SSOT)
├─ barcode (UNIQUE, 불변)
├─ mfdsProductId (UNIQUE, 불변)
├─ regulatoryName (불변)
├─ manufacturerName (불변)
├─ marketingName (변경 가능)
├─ categoryId → ProductCategory (4단계 계층)
├─ brandId → Brand
│
├─ 1:N offers[]
│  └─ SupplierProductOffer
│     ├─ masterId (FK RESTRICT)
│     ├─ supplierId (FK CASCADE)
│     ├─ slug (UNIQUE)
│     ├─ distributionType (PUBLIC|SERVICE|PRIVATE)
│     ├─ approvalStatus (PENDING|APPROVED|REJECTED)
│     ├─ isActive (boolean)
│     ├─ priceGeneral, priceGold, pricePlatinum (B2B)
│     ├─ consumerReferencePrice (B2C 참고)
│     ├─ consumer/business Short/DetailDescription (Tiptap)
│     ├─ stockQuantity, reservedQuantity, lowStockThreshold
│     │
│     └─ 1:N organization_product_listings[]
│        ├─ organizationId (매장)
│        ├─ offerId (FK CASCADE)
│        ├─ masterId (FK RESTRICT)
│        ├─ serviceKey ('neture', 'glycopharm' 등)
│        ├─ price (매장 가격 오버라이드, nullable)
│        ├─ is_active (매장 진열 여부)
│        │
│        └─ 1:N organization_product_channels[]
│           ├─ channelId → OrganizationChannel (B2C|KIOSK|TABLET|SIGNAGE)
│           ├─ displayOrder
│           └─ is_active
│
├─ 1:N images[]
│  └─ ProductImage
│     ├─ imageUrl (GCS 공개 URL)
│     ├─ gcsPath (GCS 내부 경로)
│     ├─ sortOrder
│     └─ isPrimary (대표 이미지)
│
├─ N:1 category
│  └─ ProductCategory (depth 0~3, 4단계 계층)
│
└─ N:1 brand
   └─ Brand (name, manufacturerName, countryOfOrigin)
```

### 3-2. 핵심 제약 조건

| 제약 | 테이블 | 내용 |
|------|--------|------|
| `UNIQUE(barcode)` | product_masters | 1 바코드 = 1 Master |
| `UNIQUE(mfds_product_id)` | product_masters | 식약처 ID 고유 |
| `UNIQUE(master_id, supplier_id)` | supplier_product_offers | 공급자당 Master 1개 Offer |
| `UNIQUE(slug)` | supplier_product_offers | SEO 슬러그 고유 |
| `UNIQUE(org_id, service_key, offer_id)` | organization_product_listings | 매장-서비스-Offer 고유 |
| `FK RESTRICT` | offers → masters | Master 삭제 방지 |
| `FK CASCADE` | offers → suppliers | 공급자 삭제 시 Offer 연쇄 삭제 |
| `FK CASCADE` | listings → offers | Offer 삭제 시 Listing 연쇄 삭제 |

### 3-3. Slug 정책

**공식**: `{barcode}-{supplierId.slice(0,8)}-{Date.now()}`

**예시**: `8801234567890-a1b2c3d4-1710682800000`

| 항목 | 값 |
|------|---|
| 생성 시점 | Offer 생성 시 자동 |
| 수정 | 불가 |
| UNIQUE | 제약 있음 |
| 용도 | 매장 URL: `/store/{storeSlug}/product/{slug}` |
| ON CONFLICT | 기존 Offer 업데이트 시 slug 변경 안 함 |

---

## 4. B2B / B2C 구조

### 4-1. 핵심 발견: **별도 B2B/B2C 상품 없음**

O4O 플랫폼은 **B2B와 B2C를 하나의 Offer 레코드에 통합**한다.

| 항목 | 구조 |
|------|------|
| B2B 가격 | `priceGeneral`, `priceGold`, `pricePlatinum` (3 tier) |
| B2C 참고가 | `consumerReferencePrice` (정보용, 비구속) |
| B2B 설명 | `businessShortDescription`, `businessDetailDescription` (Tiptap HTML) |
| B2C 설명 | `consumerShortDescription`, `consumerDetailDescription` (Tiptap HTML) |
| 매장 가격 오버라이드 | `organization_product_listings.price` (nullable) |

### 4-2. 가격 계층 구조

```
SupplierProductOffer (B2B 공급 기준)
├─ priceGeneral    → 일반 등급 공급가
├─ priceGold       → Gold 등급 공급가 (nullable)
├─ pricePlatinum   → Platinum 등급 공급가 (nullable)
└─ consumerReferencePrice → 소비자 참고가 (nullable)

OrganizationProductListing (매장 판매 기준)
└─ price → 매장 자체 판매가 (nullable, 미설정 시 offer 가격 사용)
```

### 4-3. B2B → B2C 복사 로직

**존재하지 않음.** 별도의 B2B/B2C 복사 로직이 코드에 없다.
하나의 Offer 레코드 안에 `consumer*` 필드(B2C)와 `business*` 필드(B2B)가 공존한다.

| 구분 | 필드 | 용도 |
|------|------|------|
| B2C 짧은 설명 | `consumerShortDescription` | 소비자 대상 카드 설명 |
| B2C 상세 설명 | `consumerDetailDescription` | 소비자 대상 상품 상세 |
| B2B 짧은 설명 | `businessShortDescription` | 매장/약국 대상 요약 |
| B2B 상세 설명 | `businessDetailDescription` | 매장/약국 대상 상세 |

---

## 5. 이미지 처리 구조

### 5-1. 이미지 저장

| 항목 | 내용 |
|------|------|
| 테이블 | `product_images` |
| 저장소 | Google Cloud Storage (GCS) |
| 버킷 | `o4o-neture-product-images` (환경변수: `GCS_PRODUCT_IMAGE_BUCKET`) |
| 경로 패턴 | `products/{masterId}/{uuid}{ext}` |
| 서비스 | `ImageStorageService` |

### 5-2. 이미지 테이블 구조

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK |
| `master_id` | UUID FK | ProductMaster 연결 (CASCADE 삭제) |
| `image_url` | TEXT | GCS 공개 URL |
| `gcs_path` | TEXT | GCS 내부 경로 |
| `sort_order` | INT | 정렬 순서 (0부터) |
| `is_primary` | BOOLEAN | 대표 이미지 여부 |

### 5-3. 이미지 등록 경로

| 등록 방식 | 이미지 처리 | 설명 |
|----------|-----------|------|
| **단일 등록** | 별도 업로드 API | `POST /api/v1/neture/products/{masterId}/images` (multipart) |
| **CSV Import** | **없음** | CSV에는 이미지 컬럼 없음 |
| **Catalog Import** | **자동** (fire-and-forget) | Excel 이미지 URL → fetch → GCS 업로드 → ProductImage 생성 |

### 5-4. Catalog Import 이미지 파이프라인

```
1. Firstmall Excel에서 이미지 URL 추출
2. Apply 트랜잭션 완료 후 (fire-and-forget)
3. 각 URL에 대해:
   ├─ fetch(url) → 외부 이미지 다운로드
   ├─ ImageStorageService.uploadImage() → GCS 업로드
   └─ INSERT INTO product_images (ON CONFLICT DO NOTHING)
4. 첫 번째 이미지 = is_primary = true
5. 실패 시 로그만, 트랜잭션 롤백 없음
```

### 5-5. 이미지 소유 구조

| 항목 | 소유 단위 | 설명 |
|------|----------|------|
| product_images | **ProductMaster** | Master 기준으로 이미지 관리 |
| 공급자별 이미지 | **없음** | 공급자별 별도 이미지 분리 없음 |
| 매장별 이미지 | **없음** | 매장별 이미지 오버라이드 없음 |

---

## 6. 상품 공개 정책

### 6-1. Distribution Type

| 타입 | 설명 | 자동 진열 | 승인 필요 |
|------|------|:---------:|:---------:|
| `PUBLIC` | HUB 전체 공개 | **O** (모든 활성 매장) | **X** |
| `SERVICE` | 서비스 범위 공개 | **X** (수동 요청) | **O** (운영자) |
| `PRIVATE` | 지정 판매자 전용 | **X** (수동) | **X** (allowedSellerIds) |

### 6-2. 공개 흐름

```
PUBLIC:
  Offer APPROVED → autoExpandPublicProduct()
  → 모든 활성 매장에 Listing 생성 (is_active=false)
  → 매장 운영자가 개별 활성화

SERVICE:
  Offer APPROVED → 판매자가 취급 요청
  → product_approvals 레코드 생성 (PENDING)
  → 운영자 승인 → Listing 생성 (is_active=false)
  → 매장 운영자가 개별 활성화

PRIVATE:
  Offer 생성 시 allowedSellerIds 지정
  → 지정된 판매자만 취급 요청 가능
  → 승인 후 Listing 생성
```

### 6-3. Listing 자동 생성 (Tier 1 Auto-Expansion)

**트리거**: PUBLIC Offer가 APPROVED될 때

```sql
INSERT INTO organization_product_listings
  (id, organization_id, service_key, master_id, offer_id, is_active, ...)
SELECT gen_random_uuid(), ose.organization_id, ose.service_code, $masterId, $offerId, false, ...
FROM organization_service_enrollments ose
JOIN organizations o ON o.id = ose.organization_id
WHERE o."isActive" = true AND ose.status = 'active'
ON CONFLICT (organization_id, service_key, offer_id) DO NOTHING
```

**역방향**: 신규 매장 생성 시 `autoListPublicProductsForOrg()`로 기존 PUBLIC Offer 역진열.

---

## 7. 상품 승인 구조

### 7-1. Offer 수준 승인 (기본)

| 항목 | 내용 |
|------|------|
| 승인 상태 | `PENDING` → `APPROVED` / `REJECTED` |
| 단일 승인 API | `POST /api/v1/neture/admin/products/:id/approve` |
| 단일 거절 API | `POST /api/v1/neture/admin/products/:id/reject` |
| Bulk 승인 API | `POST /api/v1/neture/admin/offers/bulk-approve` (최대 100건) |
| 권한 | `neture:admin` 스코프 |

**승인 시 동작:**

| 단계 | 동작 |
|:----:|------|
| 1 | Offer `approvalStatus` = APPROVED |
| 2 | Offer `isActive` = **true** |
| 3 | PUBLIC인 경우: `autoExpandPublicProduct()` 실행 |
| 4 | 자동 진열 수 반환 |

**거절 시 동작:**

| 단계 | 동작 |
|:----:|------|
| 1 | Offer `approvalStatus` = REJECTED |
| 2 | 기존 APPROVED product_approvals → REVOKED |
| 3 | 관련 Listing `is_active` = false |

### 7-2. 서비스 수준 승인 (product_approvals)

**테이블**: `product_approvals`

| 필드 | 타입 | 설명 |
|------|------|------|
| `offer_id` | UUID FK | SupplierProductOffer |
| `organization_id` | UUID FK | 매장/판매자 |
| `approval_type` | ENUM | `service` / `private` |
| `approval_status` | ENUM | `pending` / `approved` / `rejected` / `revoked` |
| `service_key` | VARCHAR | 서비스 키 (neture, glycopharm 등) |
| `requested_by` | UUID | 요청자 |
| `decided_by` | UUID | 결정자 |
| `decided_at` | TIMESTAMP | 결정 시각 |
| `reason` | TEXT | 거절/취소 사유 |

**상태 전이:**

```
PENDING → APPROVED (승인) → REVOKED (취소)
PENDING → REJECTED (거절)
REJECTED → PENDING (재요청)
REVOKED → PENDING (재요청)
```

### 7-3. 공급자 비활성화 시 연쇄

```
공급자 INACTIVE 전환
├─ 해당 공급자의 모든 APPROVED approval → REVOKED
└─ 해당 공급자의 모든 listing → is_active = false
```

### 7-4. is_active와 approval_status 상호작용

| 엔티티 | 필드 | 의미 | 설정 시점 |
|--------|------|------|----------|
| SupplierProductOffer | `isActive` | Offer 활성 (시스템 전체) | 승인 시 true |
| SupplierProductOffer | `approvalStatus` | 승인 상태 | 승인/거절 시 |
| OrganizationProductListing | `is_active` | 매장 진열 활성 | 매장 운영자 수동 |

**중요**: Offer 승인(APPROVED + isActive=true) ≠ 매장 진열(Listing.is_active=true). 매장 운영자가 별도로 활성화해야 함.

---

## 8. 매장 상품 연계 구조

### 8-1. Store Product Library (WO-O4O-STORE-PRODUCT-LIBRARY-INTEGRATION-V1)

| 항목 | 내용 |
|------|------|
| 검색 API | `GET /api/v1/store/products/search` |
| Offer 조회 | `GET /api/v1/store/products/master/:masterId/offers` |
| Listing 생성 | `POST /api/v1/store/products/list` |
| 내 매장 목록 | `GET /api/v1/store/products` |
| Listing 수정 | `PATCH /api/v1/store/products/:id` |
| 인증 | `requireAuth` + `requireStoreOwner` |

### 8-2. 매장 진열 흐름

```
매장 운영자 → 제품 검색 (searchProductMasters)
          → 제품 선택 → Offer 목록 조회 (APPROVED + isActive)
          → 공급자 선택 → Listing 생성
             INSERT INTO organization_product_listings
             (organization_id, service_key='neture', master_id, offer_id, is_active=true, price)
             ON CONFLICT DO NOTHING
          → 진열 관리 (활성/비활성 토글, 매장가 설정)
```

### 8-3. Listing → 매장 표시 구조

```
OrganizationProductListing
├─ organization_id → 매장
├─ master_id → ProductMaster (상품 정보, 이미지)
├─ offer_id → SupplierProductOffer (공급자, 가격, 설명)
├─ service_key → 서비스 범위 ('neture')
├─ price → 매장 가격 오버라이드 (nullable)
└─ is_active → 매장 진열 여부

StoreProductProfile (선택적)
├─ organization_id + master_id → 매장별 상품 커스텀
├─ displayName → 매장 자체 상품명
├─ description → 매장 자체 설명
└─ pharmacistComment → 약사 코멘트
```

---

## 9. AI 콘텐츠 자동 생성

### 9-1. 트리거 조건

| 등록 방식 | AI 생성 | 트리거 시점 |
|----------|:-------:|-----------|
| 단일 등록 | **X** | 없음 (수동 설명 입력) |
| CSV Import | **O** | applyBatch() 후 fire-and-forget |
| Catalog Import | **O** | applyJob() 후 fire-and-forget |

### 9-2. AI 입력 데이터

```typescript
{
  id: masterId,
  regulatoryName: string,
  marketingName: string,
  manufacturerName: string,
  brandName?: string
}
```

### 9-3. 생성 콘텐츠

`ProductAiContentService.generateAllContents()` → 5가지 콘텐츠 유형 (Gemini 3.0 Flash)

---

## 10. 전체 상품 데이터 흐름도

```
┌─────────────────────────────────────────────────────────────┐
│                    상품 등록 (공급자)                         │
│                                                             │
│  ┌─────────┐  ┌──────────┐  ┌───────────────┐             │
│  │ 단일등록  │  │CSV Import│  │Catalog Import │             │
│  │ (위저드)  │  │ (CSV)    │  │ (CSV/Excel)   │             │
│  └────┬─────┘  └────┬─────┘  └──────┬────────┘             │
│       │              │               │                      │
│       └──────────┬───┴───────────────┘                      │
│                  ▼                                           │
│  ┌───────────────────────────────┐                          │
│  │ resolveOrCreateMaster()       │                          │
│  │ 바코드 → 기존 Master / MFDS / │                          │
│  │ 수동 입력 → ProductMaster     │                          │
│  └──────────────┬────────────────┘                          │
│                 ▼                                            │
│  ┌───────────────────────────────┐                          │
│  │ SupplierProductOffer 생성      │                          │
│  │ isActive=false                │                          │
│  │ approvalStatus=PENDING        │                          │
│  │ slug={barcode}-{sid}-{ts}     │                          │
│  └──────────────┬────────────────┘                          │
│                 │                                            │
└─────────────────┼────────────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    상품 승인 (관리자)                         │
│                                                             │
│  ┌───────────────────────────────┐                          │
│  │ POST /admin/products/:id/     │                          │
│  │   approve / reject            │                          │
│  │ POST /admin/offers/           │                          │
│  │   bulk-approve                │                          │
│  └──────────────┬────────────────┘                          │
│                 │                                            │
│     ┌───────────┼───────────┐                               │
│     ▼           ▼           ▼                               │
│  PUBLIC      SERVICE     PRIVATE                            │
│  (자동진열)   (요청→승인)  (지정판매자)                        │
│     │           │           │                               │
└─────┼───────────┼───────────┼────────────────────────────────┘
      ▼           ▼           ▼
┌─────────────────────────────────────────────────────────────┐
│                    매장 진열 (매장 운영자)                     │
│                                                             │
│  ┌───────────────────────────────┐                          │
│  │ organization_product_listings  │                          │
│  │ is_active = false (자동생성)   │                          │
│  │ → 매장 운영자가 활성화         │                          │
│  │ → 매장가(price) 설정          │                          │
│  └───────────────────────────────┘                          │
│                                                             │
│  Store Product Library (/store/manage/products/library)     │
│  → 검색 → Offer 선택 → Listing 생성 → 진열 관리             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. GAP 분석 및 개선 필요 항목

### 11-1. 구조적 GAP

| # | GAP | 현재 상태 | 영향 | 우선순위 |
|:-:|-----|----------|------|:--------:|
| G1 | **CSV Import에 이미지 처리 없음** | CSV 컬럼에 이미지 URL 없음 | CSV 등록 상품은 이미지 없이 생성됨 | P2 |
| G2 | **단일 등록에 AI 콘텐츠 없음** | Catalog/CSV Import만 AI 트리거 | 단일 등록 상품은 수동 설명에 의존 | P3 |
| G3 | **CSV Import는 MFDS 전용** | MFDS 미검증 시 Master 생성 불가 | 미등록 제품은 CSV Import 불가, Catalog Import 필요 | P2 |
| G4 | **MFDS API가 Stub** | `verifyProductByBarcode()`는 항상 unverified 반환 | 모든 새 Master는 수동 입력에 의존 | P1 |
| G5 | **이미지 소유가 Master 단위** | 공급자/매장별 이미지 분리 없음 | 한 공급자가 업로드한 이미지를 다른 공급자 Offer도 사용 | P3 |
| G6 | **Inventory 기본 비활성** | `trackInventory=false`가 기본 | 대부분의 상품이 무한 재고 모드 | P3 |

### 11-2. 데이터 불일치

| # | 불일치 | 설명 | 우선순위 |
|:-:|--------|------|:--------:|
| D1 | **CSV와 Catalog의 Offer 생성 SQL 중복** | 동일한 INSERT ON CONFLICT 패턴이 두 곳에 존재 | P3 |
| D2 | **msrp/stock_qty 파싱 후 미사용** | CSV Import에서 파싱하지만 Offer에 반영하지 않음 | P3 |
| D3 | **regulatoryType 기본값 불일치** | 단일등록: '건강기능식품', Catalog: 'UNKNOWN' | P3 |

### 11-3. 프론트엔드 GAP

| # | GAP | 설명 | 우선순위 |
|:-:|-----|------|:--------:|
| F1 | **매장 진열 시 B2B/B2C 설명 미표시** | Store Library에서 Offer 선택 시 설명 확인 불가 | P2 |
| F2 | **Offer 가격 tier 미구분** | 매장 진열 시 General/Gold/Platinum 구분 없음 | P2 |
| F3 | **Listing 가격 기본값 없음** | 매장가(price) 미설정 시 동작 미정의 (null) | P2 |

### 11-4. 권장 후속 작업

| 우선순위 | 작업 | 설명 |
|:--------:|------|------|
| P1 | MFDS API 연동 | Stub을 실제 API로 교체 → 자동 Master 생성 활성화 |
| P2 | CSV Import 이미지 지원 | 이미지 URL 컬럼 추가 (Catalog Import 패턴 재사용) |
| P2 | CSV Import MFDS 미등록 폴백 | manualData 지원 또는 Catalog Import로 통합 |
| P2 | 매장 진열 UX 보강 | Offer 상세 정보 (설명, 가격 tier) 표시 |
| P3 | Import 서비스 통합 | CSV Import → Catalog Import 통합 (중복 SQL 제거) |
| P3 | 이미지 소유 구조 검토 | Offer 수준 이미지 vs Master 수준 이미지 정책 결정 |

---

## 12. 요약

O4O 플랫폼의 공급자 상품 등록은 **3가지 경로**(단일 등록, CSV Import, Catalog Import)를 통해 이루어지며, 모든 경로가 **ProductMaster(SSOT) + SupplierProductOffer(공급 제안)** 2단계 구조를 공유한다.

**B2B/B2C는 별도 상품이 아니라 하나의 Offer에 가격 tier와 설명이 공존**하는 통합 구조이다.

**3단계 유통 정책**(PUBLIC/SERVICE/PRIVATE)과 **2단계 승인**(Offer 승인 + 서비스 수준 승인)을 통해 상품이 매장에 도달하며, **매장 진열은 항상 비활성 상태로 생성**되어 매장 운영자의 수동 활성화가 필요하다.

주요 GAP은 MFDS API Stub 상태, CSV Import의 이미지 미지원, Import 서비스 간 코드 중복이며, 이는 별도 WO에서 정비 가능하다.

---

*Generated: 2026-03-16*
*Investigation Type: READ-ONLY (코드 수정 없음)*
