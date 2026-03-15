# IR-O4O-NETURE-SUPPLIER-CSV-PRODUCT-STRUCTURE-AUDIT-V1

> **Status: INTERIM** (내부 코드 분석 완료, 외부 플랫폼 조사 미완)
> Date: 2026-03-15

---

## Executive Summary

Neture CSV Import 시스템은 **2-Phase Pipeline** (Upload+Validate → Apply)으로 구현되어 있다.
그러나 현재 **7개 허용 컬럼 중 3개만 실제 동작**하며, 나머지 4개(supplier_sku, msrp, stock_qty, description)는
코드에 선언만 되어 있고 실제로 검증·저장되지 않는 **비활성(Inert) 상태**이다.

### 핵심 발견 사항

| # | 발견 | 심각도 |
|---|------|--------|
| 1 | MFDS 연동이 **STUB** — Master 자동 생성 불가 | CRITICAL |
| 2 | 7개 컬럼 중 4개가 비활성 (파싱은 되지만 저장 안 됨) | HIGH |
| 3 | 설명 필드 4개 (WO-NETURE-PRODUCT-DESCRIPTION-FIELDS-V1) CSV 미지원 | MEDIUM |
| 4 | B2B 티어 가격 (Gold/Platinum) CSV 미지원 | MEDIUM |
| 5 | consumerReferencePrice(소비자 참고가) CSV 미지원 | MEDIUM |
| 6 | 재고(stockQuantity) CSV 미지원 | LOW |

---

## 1. 현재 CSV 허용 컬럼 구조

**Source**: `apps/api-server/src/modules/neture/services/csv-import.service.ts` (line 30-38)

### 1.1 컬럼 목록 및 상태

| CSV 컬럼 | 필수 | 검증 | 저장 | 매핑 대상 | 실제 동작 |
|----------|:----:|:----:|:----:|----------|:---------:|
| `barcode` | **YES** | GTIN 8-14자 + 체크디짓 | ✅ parsedBarcode | ProductMaster.barcode | **ACTIVE** |
| `supply_price` | no | 정수 ≥ 0 | ✅ parsedSupplyPrice | Offer.priceGeneral | **ACTIVE** |
| `distribution_type` | no | PUBLIC/SERVICE/PRIVATE | ✅ parsedDistributionType | Offer.distributionType | **ACTIVE** |
| `supplier_sku` | no | ❌ 없음 | ❌ 저장 안 됨 | — | **INERT** |
| `msrp` | no | ❌ 없음 | ❌ 저장 안 됨 | — | **INERT** |
| `stock_qty` | no | ❌ 없음 | ❌ 저장 안 됨 | — | **INERT** |
| `description` | no | ❌ 없음 | ❌ 저장 안 됨 | — | **INERT** |

### 1.2 기본값 (미입력 시)

| 필드 | 기본값 |
|------|--------|
| supply_price | `0` |
| distribution_type | `PRIVATE` |

### 1.3 CSV에 없는 Offer 필드

다음 필드들은 CSV로 설정할 수 없으며, API(POST/PATCH)로만 설정 가능하다.

| Offer 필드 | 유형 | CSV 지원 |
|-----------|------|:--------:|
| priceGold | B2B Gold 단가 | ❌ |
| pricePlatinum | B2B Platinum 단가 | ❌ |
| consumerReferencePrice | 소비자 참고가 | ❌ |
| consumerShortDescription | B2C 간이 설명 | ❌ |
| consumerDetailDescription | B2C 상세 설명 | ❌ |
| businessShortDescription | B2B 간이 설명 | ❌ |
| businessDetailDescription | B2B 상세 설명 | ❌ |
| allowedSellerIds | 판매자 허용 목록 | ❌ |
| stockQuantity | 재고 수량 | ❌ |
| trackInventory | 재고 추적 여부 | ❌ |

---

## 2. CSV Import Pipeline 상세

### 2.1 Phase 1: Upload + Validate

**Endpoint**: `POST /supplier/csv-import/upload`
**Auth**: requireAuth + requireActiveSupplier

```
CSV 파일 (multipart/form-data)
  ↓
csv-parse/sync 파싱
  config: { columns: true, skip_empty_lines: true, trim: true, bom: true }
  ↓
Batch 생성 (status: VALIDATING)
  ↓
Row별 검증 루프:
  ┌─ 1. barcode 추출 (필수, 빈값 → INVALID_BARCODE)
  ├─ 2. GTIN 검증 (utils/gtin.js → INVALID_GTIN)
  ├─ 3. 배치 내 중복 체크 (Set → DUPLICATE_IN_BATCH)
  ├─ 4. supply_price 파싱 (정수 ≥ 0 → INVALID_PRICE)
  ├─ 5. distribution_type 파싱 (enum → INVALID_DISTRIBUTION_TYPE)
  └─ 6. ProductMaster 연결:
       ├─ 기존 Master 존재 → actionType: LINK_EXISTING ✅
       └─ 미존재 → MFDS 조회
            ├─ 검증 성공 → actionType: CREATE_MASTER ✅
            └─ 검증 실패 → REJECT (MASTER_NOT_FOUND_IN_MFDS) ❌
  ↓
Batch 상태 결정:
  valid rows > 0 → status: READY
  valid rows = 0 → status: FAILED
```

### 2.2 Phase 2: Apply Batch

**Endpoint**: `POST /supplier/csv-import/batches/:id/apply`
**Auth**: requireAuth + requireActiveSupplier

```
사전 검증:
  1. Batch 존재 + 소유권 확인
  2. status == READY 확인
  3. Supplier status == ACTIVE 확인
  4. 유효 행 ≥ 1 확인
  ↓
트랜잭션 내 처리 (valid rows만):
  ┌─ actionType == CREATE_MASTER:
  │    1. MFDS 재검증 (apply 시점 한 번 더)
  │    2. 기존 Master 존재 여부 재확인 (race condition 방어)
  │    3. Master 생성 (MFDS 데이터 사용)
  └─ Offer UPSERT:
       INSERT INTO supplier_product_offers
         (id, master_id, supplier_id, distribution_type,
          approval_status='PENDING', is_active=false,
          price_general, created_at, updated_at)
       ON CONFLICT (master_id, supplier_id) DO UPDATE SET
         price_general = EXCLUDED.price_general,
         distribution_type = EXCLUDED.distribution_type,
         updated_at = NOW()
  ↓
Batch status → APPLIED
```

### 2.3 Upsert 전략

- **Unique 제약**: `(master_id, supplier_id)` — 공급자당 마스터 1개 오퍼
- **신규 삽입**: `is_active=false`, `approvalStatus=PENDING`
- **충돌 시 업데이트**: `price_general`, `distribution_type`만 갱신
- **변경 안 됨**: `approval_status`, `is_active` (기존 값 유지)

---

## 3. 검증 에러 코드 목록

### Phase 1 (행 단위 검증)

| 에러 코드 | 원인 | 처리 |
|----------|------|------|
| `INVALID_BARCODE` | barcode 빈값 또는 누락 | Row REJECTED |
| `INVALID_GTIN` | GTIN 체크디짓 불일치 | Row REJECTED |
| `DUPLICATE_IN_BATCH` | 같은 배치 내 바코드 중복 | Row REJECTED |
| `INVALID_PRICE` | supply_price가 정수 아니거나 음수 | Row REJECTED |
| `INVALID_DISTRIBUTION_TYPE` | PUBLIC/SERVICE/PRIVATE 아닌 값 | Row REJECTED |
| `MASTER_NOT_FOUND_IN_MFDS` | MFDS 검증 실패 (현재 항상 실패) | Row REJECTED |
| `CSV_PARSE_ERROR` | CSV 문법 오류 | 전체 실패 |
| `CSV_EMPTY` | 파싱 후 행 0개 | 전체 실패 |

### Phase 2 (Apply 단위)

| 에러 코드 | HTTP | 원인 |
|----------|------|------|
| `BATCH_NOT_FOUND` | 404 | 배치 미존재 또는 소유권 불일치 |
| `BATCH_NOT_READY` | 400 | status ≠ READY |
| `SUPPLIER_NOT_ACTIVE` | 403 | 공급자 비활성 |
| `NO_VALID_ROWS` | 400 | 유효 행 0개 |

---

## 4. MFDS 연동 현황 — CRITICAL BLOCKER

**Source**: `apps/api-server/src/modules/neture/services/mfds.service.ts`

```typescript
// 현재 STUB 상태 — 항상 실패 반환
{
  verified: false,
  product: null,
  error: 'MFDS_NOT_IMPLEMENTED'
}
```

### 영향

- **기존 Master가 있는 barcode**: CSV 등록 가능 (`LINK_EXISTING`)
- **신규 barcode (Master 없음)**: CSV 등록 불가 (`MASTER_NOT_FOUND_IN_MFDS`)
- 즉, **현재 CSV Import는 이미 개별 등록된 상품의 가격·유통정책 일괄 변경 용도로만 사용 가능**

### MFDS 인터페이스 (Frozen)

```typescript
interface MfdsProductResult {
  regulatoryType: string;      // '의약품', '건강기능식품' 등
  regulatoryName: string;       // 공식 제품명
  manufacturerName: string;     // 제조사
  permitNumber: string | null;  // 허가번호
  productId: string | null;     // MFDS 제품 ID
}
```

---

## 5. Entity 구조 매핑

### 5.1 ProductMaster — CSV로 생성되는 필드

| Master 필드 | CSV 매핑 | 데이터 출처 |
|------------|---------|-----------|
| barcode | CSV `barcode` | 공급자 입력 |
| regulatoryType | — | MFDS API |
| regulatoryName | — | MFDS API |
| marketingName | — | MFDS regulatoryName 복사 |
| manufacturerName | — | MFDS API |
| mfdsPermitNumber | — | MFDS API |
| mfdsProductId | — | MFDS API (없으면 barcode) |
| isMfdsVerified | — | 항상 true |
| brandName | — | CSV로 설정 불가 |
| categoryId | — | CSV로 설정 불가 |
| specification | — | CSV로 설정 불가 |

### 5.2 SupplierProductOffer — CSV로 생성되는 필드

| Offer 필드 | CSV 매핑 | 비고 |
|-----------|---------|------|
| masterId | barcode → Master 조회 | 자동 연결 |
| supplierId | Auth context | 자동 설정 |
| distributionType | CSV `distribution_type` | 기본 PRIVATE |
| priceGeneral | CSV `supply_price` | 기본 0 |
| approvalStatus | — | 항상 PENDING |
| isActive | — | 항상 false |

---

## 6. Batch/Row 엔티티 구조

### SupplierCsvImportBatch

| 필드 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| supplierId | UUID | FK → NetureSupplier |
| uploadedBy | UUID | 업로드 사용자 |
| fileName | varchar(255) | 원본 파일명 |
| totalRows | int | 전체 행 수 |
| validRows | int | 유효 행 수 |
| rejectedRows | int | 거부 행 수 |
| status | enum | UPLOADED → VALIDATING → READY/FAILED → APPLIED |
| appliedAt | timestamp | Apply 시각 |

### SupplierCsvImportRow

| 필드 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| batchId | UUID | FK → Batch |
| rowNumber | int | 1-indexed 행 번호 |
| rawJson | JSONB | 원본 CSV 행 전체 |
| parsedBarcode | varchar(14) | 파싱된 바코드 |
| parsedSupplyPrice | int | 파싱된 공급가 |
| parsedDistributionType | varchar(10) | 파싱된 유통정책 |
| validationStatus | enum | PENDING / VALID / REJECTED |
| validationError | varchar(255) | 거부 사유 |
| masterId | UUID | 연결된 Master ID |
| actionType | enum | LINK_EXISTING / CREATE_MASTER / REJECT |

---

## 7. API Endpoints 요약

| Method | Path | Auth | 용도 |
|--------|------|------|------|
| POST | `/supplier/csv-import/upload` | ActiveSupplier | CSV 업로드 + 검증 |
| GET | `/supplier/csv-import/batches` | LinkedSupplier | 배치 목록 조회 |
| GET | `/supplier/csv-import/batches/:id` | LinkedSupplier | 배치 상세 (rows 포함) |
| POST | `/supplier/csv-import/batches/:id/apply` | ActiveSupplier | 배치 적용 (Offer 생성/갱신) |

---

## 8. 현재 구조의 한계와 갭

### 8.1 구조적 한계

| # | 한계 | 설명 |
|---|------|------|
| 1 | **MFDS STUB** | Master 자동 생성 불가 → 신규 상품 CSV 등록 불가 |
| 2 | **비활성 컬럼 4개** | supplier_sku, msrp, stock_qty, description이 선언만 되고 무시됨 |
| 3 | **단일 가격** | priceGeneral만 지원, Gold/Platinum 티어 미지원 |
| 4 | **설명 미지원** | 4개 설명 필드 CSV 불가 (API만 가능) |
| 5 | **이미지 미지원** | image_url 컬럼 자체가 없음 |
| 6 | **재고 미지원** | stock_qty 선언만 있고 Offer.stockQuantity에 매핑 안 됨 |

### 8.2 실제 사용 가능한 시나리오

현재 CSV Import가 **실제로 동작하는 경우**:

```
시나리오 A: 기존 Master가 있는 상품의 가격/유통정책 일괄 변경
  ✅ barcode → 기존 Master LINK → Offer UPSERT

시나리오 B: 신규 상품 대량 등록
  ❌ MFDS STUB → 항상 MASTER_NOT_FOUND_IN_MFDS → 전체 REJECTED
```

---

## 9. 외부 플랫폼 CSV 구조 (조사 미완 — 추후 보완 필요)

외부 플랫폼 조사는 시간 제약으로 중단되었으며, 추후 보완이 필요하다.

### 9.1 일반적으로 알려진 공통 필수 컬럼 (업계 표준)

| 컬럼 | 쿠팡 | 네이버 | Amazon | Shopify | Neture 현재 |
|------|:----:|:-----:|:------:|:-------:|:----------:|
| 상품식별자 (barcode/SKU) | ✅ | ✅ | ✅ | ✅ | ✅ barcode |
| 상품명 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 브랜드 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 카테고리 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 가격 | ✅ | ✅ | ✅ | ✅ | ✅ supply_price |
| 재고 | ✅ | ✅ | ✅ | ✅ | ❌ (선언만) |
| 상품 설명 | ✅ | ✅ | ✅ | ✅ | ❌ (선언만) |
| 이미지 URL | ✅ | ✅ | ✅ | ✅ | ❌ |
| 배송/유통 유형 | ✅ | ✅ | ✅ | — | ✅ distribution_type |

> 상세 플랫폼별 비교는 추후 조사 완료 시 보완 예정

---

## 10. 권장 Neture CSV 템플릿 (초안)

현재 코드 분석 결과를 기반으로 한 **권장 CSV 컬럼 구조 초안**:

### 필수 컬럼 (Required)

| 컬럼명 | 타입 | 검증 규칙 | 매핑 |
|--------|------|----------|------|
| `barcode` | string | GTIN 8-14자, 체크디짓 | ProductMaster.barcode |
| `supply_price` | integer | ≥ 0 | Offer.priceGeneral |

### 권장 컬럼 (Recommended)

| 컬럼명 | 타입 | 검증 규칙 | 매핑 | 현재 상태 |
|--------|------|----------|------|----------|
| `distribution_type` | enum | PUBLIC/SERVICE/PRIVATE | Offer.distributionType | ACTIVE (기본 PRIVATE) |
| `marketing_name` | string | — | 신규 Master용 상품명 | 미구현 |
| `consumer_reference_price` | integer | ≥ 0 | Offer.consumerReferencePrice | 미구현 |
| `price_gold` | integer | ≥ 0 | Offer.priceGold | 미구현 |
| `price_platinum` | integer | ≥ 0 | Offer.pricePlatinum | 미구현 |

### 선택 컬럼 (Optional)

| 컬럼명 | 타입 | 매핑 | 현재 상태 | CSV 적합성 |
|--------|------|------|----------|:---------:|
| `supplier_sku` | string | — | INERT | ✅ 적합 |
| `stock_qty` | integer | Offer.stockQuantity | INERT | ✅ 적합 |
| `consumer_short_description` | text | Offer.consumerShortDescription | 미구현 | ⚠️ Rich Text는 CSV 부적합 |
| `consumer_detail_description` | text | Offer.consumerDetailDescription | 미구현 | ❌ HTML을 CSV에 넣기 어려움 |
| `business_short_description` | text | Offer.businessShortDescription | 미구현 | ⚠️ Rich Text는 CSV 부적합 |
| `business_detail_description` | text | Offer.businessDetailDescription | 미구현 | ❌ HTML을 CSV에 넣기 어려움 |

### 설명 필드에 대한 판단

설명 필드(4개)는 **Tiptap HTML**을 저장하므로 CSV에 포함하기 부적합하다.
- 간이 설명(short): Plain text로 제한하면 CSV 가능 (별도 설계 필요)
- 상세 설명(detail): Rich text(HTML)이므로 CSV 부적합 → API 전용 유지 권장

---

## 11. 다음 단계

| 순서 | 작업 | 설명 |
|------|------|------|
| 1 | 외부 플랫폼 CSV 상세 조사 완료 | 쿠팡/네이버/Amazon/Shopify 템플릿 상세 비교 |
| 2 | **WO-NETURE-SUPPLIER-CSV-TEMPLATE-V1** | 최종 CSV 템플릿 정의 + 비활성 컬럼 활성화 |
| 3 | CSV Validation 규칙 확장 | 새 컬럼에 대한 검증 로직 추가 |
| 4 | Supplier CSV Upload UI | web-neture에 CSV 업로드 화면 구현 |
| 5 | MFDS 연동 (별도 WO) | Master 자동 생성을 위한 외부 API 연동 |

---

## 참조 파일

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/modules/neture/services/csv-import.service.ts` | CSV Import 핵심 서비스 |
| `apps/api-server/src/modules/neture/services/mfds.service.ts` | MFDS 연동 (STUB) |
| `apps/api-server/src/modules/neture/controllers/supplier-product.controller.ts` | CSV 엔드포인트 |
| `apps/api-server/src/modules/neture/entities/SupplierProductOffer.entity.ts` | Offer 엔티티 |
| `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts` | Master 엔티티 |
| `apps/api-server/src/modules/neture/entities/SupplierCsvImportBatch.entity.ts` | Batch 엔티티 |
| `apps/api-server/src/modules/neture/entities/SupplierCsvImportRow.entity.ts` | Row 엔티티 |
| `apps/api-server/src/modules/neture/utils/gtin.ts` | GTIN 검증 유틸 |

---

*Generated: 2026-03-15*
*Status: INTERIM — 외부 플랫폼 조사 미완*
