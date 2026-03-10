# IR-O4O-PRODUCT-BARCODE-GOVERNANCE-AUDIT-V1

> **O4O Product Barcode Governance 조사 보고서**

- 조사일: 2026-03-09
- 조사자: Claude Code (AI Audit Agent)
- 대상: O4O Platform Barcode 운영 정책 전체
- 선행 조사: IR-O4O-PRODUCT-MASTER-INTEGRITY-AUDIT-V1

---

## 0. 조사 목적

```
O4O 플랫폼에서 Barcode가 Product Master의
핵심 식별자로 올바르게 관리되고 있는지 조사한다.

핵심 질문:
Supplier → Barcode → Product Master → Store → Order
구조가 깨지지 않는가?

특히 multi-supplier 환경에서
Barcode 기준 Product 구조가 일관되게 적용되는지 확인한다.
```

---

## 1. Barcode 저장 구조

### 1.1 Production SSOT — `product_masters`

| 항목 | 값 |
|------|-----|
| Entity | `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts` |
| 테이블 | `product_masters` |
| 필드 | `barcode VARCHAR(14) NOT NULL` |
| UNIQUE | YES — `CONSTRAINT uq_product_masters_barcode UNIQUE (barcode)` |
| INDEX | YES — `idx_product_masters_barcode` (B-tree) |
| Nullable | NO |
| Immutable | YES — 코드 레벨 강제 |

**Migration 근거:** `20260301100000-ProductMasterCoreReset.ts`

```sql
CREATE TABLE product_masters (
  barcode VARCHAR(14) NOT NULL,
  ...
  CONSTRAINT uq_product_masters_barcode UNIQUE (barcode)
);
CREATE INDEX idx_product_masters_barcode ON product_masters (barcode);
```

**평가: SAFE** — DB 레벨 UNIQUE + NOT NULL + INDEX 완비

### 1.2 도메인별 Barcode 저장 비교

| 도메인 | 테이블 | 바코드 필드 | 타입 | UNIQUE | SSOT 연결 |
|--------|--------|------------|------|:------:|:---------:|
| **Neture Core** | `product_masters` | `barcode` | VARCHAR(14) | **YES** | Self (SSOT) |
| Dropshipping | `dropshipping_product_masters` | `barcode` | VARCHAR(100) | NO | NO |
| Pharmaceutical | `pharma_product_masters` | `barcode` | VARCHAR(100) | NO | NO |
| Glycopharm | `glycopharm_products` | `barcodes` | JSONB[] | NO | NO |
| Cosmetics | `cosmetics_products` | `barcodes` | JSONB[] | NO | NO |
| Neture Legacy | `neture_products` | `barcodes` | JSONB[] | NO | NO |
| Store Local | `store_local_products` | (없음) | - | - | NO |

**핵심:** 운영 경로(Neture Distribution Engine)는 `product_masters` 단일 SSOT만 사용.
레거시 도메인의 barcode 필드는 별도 카탈로그 용도이며 운영 경로에 관여하지 않음.

---

## 2. Barcode 형식 검증

### 2.1 GTIN 검증 유틸리티

| 항목 | 값 |
|------|-----|
| 파일 | `apps/api-server/src/utils/gtin.ts` |
| 함수 | `validateGtin(barcode): string | null` |
| 보조 | `isValidGtin(barcode): boolean` |

**검증 단계:**

| 순서 | 검증 | 실패 메시지 |
|:----:|------|-----------|
| 1 | 필수값 (non-null, non-empty) | `Barcode is required` |
| 2 | 숫자만 허용 (0-9) | `Barcode must contain only digits` |
| 3 | 길이: 8, 12, 13, 14 | `Barcode length must be 8, 12, 13, or 14 (got X)` |
| 4 | Check digit (Luhn mod-10) | `Invalid check digit: expected X, got Y` |

**지원 표준:**

| 표준 | 길이 | 예시 |
|------|:----:|------|
| GTIN-8 (EAN-8) | 8 | `96385074` |
| GTIN-12 (UPC-A) | 12 | `012345678905` |
| GTIN-13 (EAN-13) | 13 | `5901234123457` |
| GTIN-14 | 14 | `01234567890128` |

**Check Digit 알고리즘:**
- 마지막 자리 제외, 우측부터 짝수 위치 ×3, 홀수 위치 ×1
- Check digit = (10 - (sum % 10)) % 10

**평가: SAFE** — 국제 GTIN 표준 준수, Check digit 검증 완비

### 2.2 검증 적용 위치

| 위치 | 파일 | GTIN 검증 |
|------|------|:--------:|
| Supplier 단건 등록 | `neture.service.ts` → `resolveOrCreateMaster()` | **YES** |
| CSV 일괄 등록 | `csv-import.service.ts` → `uploadAndValidate()` | **YES** |
| 카탈로그 임포트 | `catalog-import-validator.ts` | **YES** |
| 태블릿 바코드 등록 | `store-tablet.routes.ts` → `register-by-barcode` | **YES** |
| Dropshipping Admin | `dropshipping-admin.controller.ts` | **NO** (길이 체크만) |
| Cosmetics DTO | `cosmetics/dto/index.ts` | **NO** (무검증) |

**평가: SAFE** (핵심 경로 4곳 모두 검증) / **PARTIAL** (레거시 2곳 무검증)

---

## 3. Barcode 입력 위치 (Ingestion Points)

### 3.1 Flow A — Supplier 단건 등록 (REST API)

```
POST /api/v1/neture/supplier/products
인증: requireAuth + active supplier
```

```
barcode 입력
  ↓ MISSING_BARCODE 검사
  ↓ masterId 직접 주입 차단 (MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED)
  ↓ Supplier ACTIVE 상태 검증
  ↓ resolveOrCreateMaster(barcode, manualData?)
  ↓ SupplierProductOffer 생성 (PENDING, inactive)
```

### 3.2 Flow B — CSV 일괄 등록

```
POST /api/v1/neture/supplier/csv-import/upload        → 검증
POST /api/v1/neture/supplier/csv-import/batches/:id/apply → 적용
```

**검증 단계 (행 단위):**

| 순서 | 검증 | 실패 코드 |
|:----:|------|----------|
| 1 | barcode 필수 | `INVALID_BARCODE` |
| 2 | GTIN 형식 + check digit | `INVALID_GTIN` |
| 3 | 배치 내 중복 | `DUPLICATE_IN_BATCH` |
| 4 | ProductMaster 조회 | 있으면 `LINK_EXISTING` |
| 5 | MFDS 검증 (신규) | 실패 시 `MASTER_NOT_FOUND_IN_MFDS` |

### 3.3 Flow C — Admin Master Resolve

```
POST /api/v1/neture/admin/masters/resolve
인증: requireAuth + requireNetureScope('neture:admin')
```

### 3.4 Flow D — 태블릿 바코드 등록

```
POST /api/v1/stores/:slug/tablet/products/register-by-barcode
Body: { barcode: string }
흐름: GTIN 검증 → ProductMaster 조회 → StoreProductProfile upsert
```

---

## 4. Barcode 중복 정책

### 4.1 핵심 정책

```
같은 barcode → 반드시 하나의 Product Master
```

### 4.2 3중 방어 구현

**Layer 1 — DB 레벨:**
```sql
CONSTRAINT uq_product_masters_barcode UNIQUE (barcode)
```

**Layer 2 — Application 레벨 (`resolveOrCreateMaster`):**
```typescript
const existing = await masterRepo.findOne({ where: { barcode } });
if (existing) {
  return { success: true, data: existing };  // 기존 Master 재사용
}
// 없으면 → MFDS 검증 → 신규 생성
```

**Layer 3 — CSV 배치 레벨:**
```typescript
// 검증 단계: 배치 내 중복 차단
if (seenBarcodes.has(barcode)) → DUPLICATE_IN_BATCH

// 적용 단계: 트랜잭션 내 재조회
const existing = await masterRepo.findOne({ where: { barcode } });
// UNIQUE 제약이 최종 방어선
```

**평가: SAFE** — 3중 방어 (Application lookup + Batch dedup + DB UNIQUE)

### 4.3 Supplier 간 Barcode 공유 (Multi-Supplier)

```
Supplier A → barcode 8801234567890 → ProductMaster(X) → OfferA
Supplier B → barcode 8801234567890 → ProductMaster(X) → OfferB
```

| 제약 | 설명 |
|------|------|
| `UNIQUE(master_id, supplier_id)` | 같은 Master에 Supplier당 1개 Offer만 |
| ProductMaster 공유 | 같은 barcode는 같은 Master를 참조 |
| Offer 독립성 | 각 Supplier가 독립적 가격/재고/배포 타입 설정 |

**평가: SAFE** — Multi-supplier 환경에서 올바른 구조

---

## 5. Barcode 없는 상품 정책

### 5.1 ProductMaster 생성 차단

```
barcode 없음 → ProductMaster 생성 불가
```

| 방어 레이어 | 구현 |
|------------|------|
| DB | `barcode VARCHAR(14) NOT NULL` |
| Service | `resolveOrCreateMaster()` → `MISSING_BARCODE` 에러 |
| CSV | 행 거부 (`INVALID_BARCODE`) |
| Route | `body('barcode').notEmpty()` 검증 |

### 5.2 Store 판매 진입 차단 (구조적)

```
ProductMaster 없음
  → SupplierProductOffer 없음
    → OrganizationProductListing 없음
      → Store 판매 불가
```

**6중 가시성 Gate (Storefront 조회 시):**

| # | 조건 |
|:-:|------|
| 1 | `supplier.status = 'ACTIVE'` |
| 2 | `spo.is_active = true` |
| 3 | `spo.approval_status = 'APPROVED'` |
| 4 | `opl.is_active = true` |
| 5 | `opc.is_active = true` |
| 6 | `oc.channel_type = 'B2C'` AND `oc.status = 'APPROVED'` |

**결론:** Barcode 없는 상품은 ProductMaster 생성 자체가 불가하므로
Store 판매 경로에 진입할 수 없음.

**평가: SAFE** — Barcode 필수 정책이 구조적으로 강제됨

---

## 6. Barcode 변경 정책

### 6.1 Immutable Fields 선언

```typescript
// ProductMaster.entity.ts
// Immutable: barcode, regulatoryType, regulatoryName,
//   manufacturerName, mfdsPermitNumber, mfdsProductId
```

### 6.2 Runtime Guard

```typescript
// neture.service.ts — updateProductMaster()
static MASTER_IMMUTABLE_FIELDS = [
  'barcode',
  'regulatoryType',
  'regulatoryName',
  'manufacturerName',
  'mfdsPermitNumber',
  'mfdsProductId'
];

// 위반 시:
{ success: false, error: 'IMMUTABLE_FIELD_VIOLATION: barcode' }
```

### 6.3 변경 가능 필드 (Mutable)

- `marketingName`, `brandName`, `categoryId`, `brandId`
- `specification`, `originCountry`, `tags`

### 6.4 변경 권한

| 작업 | 권한 |
|------|------|
| barcode 수정 | **불가** (코드 레벨 차단) |
| mutable 필드 수정 | Admin (`neture:admin` scope) |
| Supplier가 Master 수정 | 불가 (Offer만 관리 가능) |

**평가: SAFE** — Barcode 불변성이 코드 레벨에서 강제됨

---

## 7. Barcode 기반 검색/조회 API

### 7.1 구현된 엔드포인트

| 엔드포인트 | 인증 | 용도 |
|-----------|------|------|
| `GET /api/v1/neture/admin/masters/barcode/:barcode` | Admin scope | 관리자 Master 조회 |
| `GET /api/v1/neture/masters/barcode/:barcode` | 기본 인증 | Supplier용 Master 존재 확인 |
| `POST /api/v1/stores/:slug/tablet/products/register-by-barcode` | Store 인증 | 태블릿 바코드 스캔 등록 |

### 7.2 모바일 바코드 스캔

| 파일 | 함수 | 스캔 포맷 |
|------|------|----------|
| `apps/mobile-app/src/plugins/barcode.ts` | `scanBarcode()` | 전체 포맷 |
| | `scanProductBarcode()` | EAN, UPC, CODE_* |
| | `scanQRCode()` | QR만 |

### 7.3 미구현 Gap

| Gap | 설명 | 영향 |
|-----|------|------|
| POS Barcode Lookup | Checkout에서 바코드 스캔 직접 주문 불가 | MEDIUM |
| Storefront barcode 검색 | 사용자 바코드 검색 미지원 | LOW |

**평가: PARTIAL** — 관리/공급자 조회 존재. POS/Storefront 바코드 조회 미구현

---

## 8. Barcode와 AI 연결

### 8.1 연결 경로

```
store_ai_product_snapshots
  → productId (= offer_id)
    → supplier_product_offers.master_id
      → product_masters.barcode
```

### 8.2 AI Snapshot 수집

| 수집 데이터 | 소스 |
|------------|------|
| QR 스캔 수 | `product_marketing_assets` → `store_qr_scan_events` |
| 주문 수/매출 | `checkout_orders` JSONB items |
| 전환율 | orders / qrScans |

**AI 콘텐츠는 ProductMaster 기준으로 간접 연결됨.**
Barcode 직접 참조는 없으나 `offer_id → master_id` JOIN으로 접근 가능.

**평가: SAFE** — 정상적인 간접 연결 구조

---

## 9. Race Condition 안전성

### 시나리오: 동시 CSV 배치

```
Batch A: barcode 8801234567890 → CREATE_MASTER
Batch B: barcode 8801234567890 → CREATE_MASTER (동시)
```

**4중 방어:**

| Layer | 방어 메커니즘 |
|:-----:|-------------|
| 1 | Application: `findOne({ where: { barcode } })` 선조회 |
| 2 | Transaction: `dataSource.transaction()` 스코프 |
| 3 | DB: `UNIQUE(barcode)` → 두 번째 INSERT 실패 |
| 4 | Recovery: UNIQUE 위반 시 기존 Master 재조회 후 연결 |

**Offer 충돌 방어:**
```sql
ON CONFLICT (master_id, supplier_id) DO UPDATE SET
  price_general = EXCLUDED.price_general, ...
```

**평가: SAFE** — 동시성 안전

---

## 10. Barcode 데이터 품질 (코드 기반 추론)

| 품질 지표 | 값 | 근거 |
|----------|-----|------|
| Null 비율 | **0%** | `NOT NULL` DB 제약 |
| 중복 비율 | **0%** | `UNIQUE` DB 제약 |
| 형식 오류 | **0%** (정상 경로) | GTIN 검증 필수 통과 |
| 비표준 길이 | **0%** | 8/12/13/14만 허용 |

**예외:** DB에 직접 INSERT (Admin API / Migration)한 경우 GTIN 무검증 가능

**레거시 도메인:**
- `glycopharm_products.barcodes`, `cosmetics_products.barcodes` = JSONB[]
- UNIQUE 없음, 형식 검증 없음 → 품질 보증 불가
- 운영 경로에서 미사용

**평가: SAFE** (core) / **UNKNOWN** (legacy — 데이터 직접 조회 불가)

---

## 11. 종합 구조 평가

### 11.1 핵심 경로 (Neture Distribution Engine)

```
Supplier
  ↓ barcode 입력 (GTIN 검증)
  ↓
ProductMaster (UNIQUE barcode, NOT NULL, Immutable)
  ↓ 1:N
SupplierProductOffer (UNIQUE master_id + supplier_id)
  ↓ auto-expand
OrganizationProductListing
  ↓ 6-layer visibility gate
Storefront (B2C)
  ↓
NetureOrder (FK 기반, 7-Gate 검증)
```

### 11.2 항목별 평가

| # | 항목 | 평가 | 근거 |
|:-:|------|:----:|------|
| 1 | Barcode UNIQUE | **SAFE** | DB UNIQUE constraint |
| 2 | Barcode NOT NULL | **SAFE** | DB NOT NULL constraint |
| 3 | Barcode Immutable | **SAFE** | `IMMUTABLE_FIELD_VIOLATION` guard |
| 4 | GTIN 형식 검증 | **SAFE** | Luhn mod-10 check digit |
| 5 | Multi-supplier 공유 | **SAFE** | Master 공유 + Offer 분리 |
| 6 | Race condition | **SAFE** | 4중 방어 |
| 7 | Barcode 없는 상품 차단 | **SAFE** | NOT NULL → 구조적 진입 차단 |
| 8 | Barcode 조회 API | **PARTIAL** | Admin/Supplier 존재. POS 미구현 |
| 9 | AI 연결 | **SAFE** | offer_id → master_id 간접 연결 |
| 10 | 레거시 도메인 | **UNSAFE** | nullable, no UNIQUE, no GTIN 검증 |

### 11.3 레거시 도메인 상세

| 도메인 | barcode 타입 | UNIQUE | GTIN 검증 | 영향도 |
|--------|-------------|:------:|:---------:|:------:|
| Dropshipping | VARCHAR(100), nullable | NO | NO | 비활성 |
| Pharmaceutical | VARCHAR(100), nullable | NO | NO | 비활성 |
| Cosmetics | JSONB[] | NO | NO | 비활성 |
| Glycopharm | JSONB[] | NO | NO | 비활성 |

**영향도:** 낮음 — 운영 경로(Neture Distribution)에서 사용되지 않음

---

## 12. Gap 목록

| # | Gap | 영향 | 심각도 |
|:-:|-----|------|:------:|
| G1 | POS Barcode Lookup 미구현 | Checkout에서 바코드 스캔 직접 주문 불가 | MEDIUM |
| G2 | MFDS 연동 Stub 상태 | 신규 바코드 자동 검증 불가, manualData 의존 | MEDIUM |
| G3 | 레거시 도메인 GTIN 무검증 | 레거시 데이터 품질 보증 불가 | LOW |
| G4 | Storefront barcode 검색 미포함 | 사용자 바코드 검색 불가 | LOW |
| G5 | Direct DB INSERT 시 GTIN 무검증 | Migration/Admin SQL 우회 가능 | LOW |

---

## 13. 최종 결론

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   Overall: SAFE (핵심 경로)                          │
│                                                     │
│   Barcode가 플랫폼의 Product 식별자로                │
│   정상적으로 운영되고 있다.                           │
│                                                     │
│   Supplier → Barcode → Product Master → Store → Order│
│   구조가 깨지지 않는다.                               │
│                                                     │
│   핵심 방어:                                         │
│   1. DB UNIQUE + NOT NULL                           │
│   2. GTIN Luhn check digit 검증                     │
│   3. Immutable field guard                          │
│   4. resolveOrCreateMaster() 단일 진입점             │
│   5. 4중 Race condition 방어                         │
│   6. 6중 Store Visibility Gate                       │
│                                                     │
│   레거시 도메인은 UNSAFE이나                          │
│   운영 경로에 영향 없음                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 14. 파일 매니페스트

### Core

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts` | SSOT Entity |
| `apps/api-server/src/modules/neture/entities/SupplierProductOffer.entity.ts` | Offer Entity |
| `apps/api-server/src/utils/gtin.ts` | GTIN 검증 유틸리티 |
| `apps/api-server/src/modules/neture/neture.service.ts` | resolveOrCreateMaster, updateProductMaster |
| `apps/api-server/src/modules/neture/neture.routes.ts` | Barcode Lookup API |
| `apps/api-server/src/modules/neture/services/csv-import.service.ts` | CSV 일괄 등록 |
| `apps/api-server/src/modules/neture/services/mfds.service.ts` | MFDS Stub |
| `apps/api-server/src/utils/auto-listing.utils.ts` | Auto-expansion |
| `apps/api-server/src/routes/platform/unified-store-public.routes.ts` | Storefront 조회 |
| `apps/api-server/src/routes/platform/store-tablet.routes.ts` | 태블릿 바코드 등록 |
| `apps/api-server/src/modules/catalog-import/services/catalog-import-validator.ts` | 카탈로그 임포트 검증 |

### Migrations

| 파일 | 내용 |
|------|------|
| `20260301100000-ProductMasterCoreReset.ts` | UNIQUE(barcode), NOT NULL, INDEX 생성 |
| `20260301200000-ProductMasterWOAlignment.ts` | regulatory 확장 |
| `20260307200000-CategoryBrandProductMasterExtension.ts` | category/brand FK |

### Mobile

| 파일 | 역할 |
|------|------|
| `apps/mobile-app/src/plugins/barcode.ts` | 바코드 스캐너 플러그인 |

### Legacy (참고)

| 파일 | 역할 |
|------|------|
| `packages/dropshipping-core/src/entities/ProductMaster.entity.ts` | Legacy Core |
| `packages/pharmaceutical-core/src/entities/PharmaProductMaster.entity.ts` | Pharma 도메인 |

---

## 15. 4개 조사 연결 구조

```
IR-O4O-PRODUCT-AI-DATA-AUDIT          → AI 데이터 구조
IR-O4O-PRODUCT-DATA-FLOW-AUDIT        → 데이터 흐름
IR-O4O-PRODUCT-MASTER-INTEGRITY-AUDIT  → Master 정합성
IR-O4O-PRODUCT-BARCODE-GOVERNANCE-AUDIT → Barcode 거버넌스 (본 보고서)
                                          ↓
                          O4O Product Core 전체 구조 확인 완료
```

**다음 권장 조사:** `IR-O4O-SUPPLIER-PRODUCT-INGESTION-AUDIT-V1` (공급자 상품 등록 구조)

---

*조사 완료: 2026-03-09*
*조사자: Claude Code (AI Audit Agent)*
*문서 버전: V1*
