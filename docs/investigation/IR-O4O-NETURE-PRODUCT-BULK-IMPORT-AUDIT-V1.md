# IR-O4O-NETURE-PRODUCT-BULK-IMPORT-AUDIT-V1

> Neture Product Bulk Registration Audit
> 조사일: 2026-03-16
> 상태: Complete

---

## 1. 핵심 판정: **Bulk Import 2중 시스템 구현 완료**

예상과 달리, O4O 플랫폼에는 **2개의 독립적인 대량등록 시스템**이 이미 구현되어 있다.

| # | 시스템 | 대상 | 상태 | 엔드포인트 |
|---|--------|------|------|-----------|
| 1 | **Catalog Import** | Neture Admin 전용 | ✅ 완성 | `/api/v1/catalog-import/*` |
| 2 | **CSV Import** | Supplier 셀프서비스 | ✅ 완성 | `/supplier/csv-import/*` |

---

## 2. System 1: Catalog Import (Admin)

### 2.1 개요

| 항목 | 값 |
|------|------|
| 인증 | `requireAuth` + `requireNetureScope('neture:admin')` |
| 파서 | Pluggable (CSV + Firstmall Excel) |
| 흐름 | 3단계: Upload → Validate → Apply |
| WO | WO-O4O-CATALOG-IMPORT-APP-IMPLEMENTATION-V1 |

### 2.2 API

```
POST   /api/v1/catalog-import/jobs              — 파일 업로드 + 파싱
GET    /api/v1/catalog-import/jobs              — Job 목록
GET    /api/v1/catalog-import/jobs/:id          — Job 상세 (rows 포함)
POST   /api/v1/catalog-import/jobs/:id/validate — 검증 실행
POST   /api/v1/catalog-import/jobs/:id/apply    — 카탈로그 적용
```

### 2.3 상태 머신

```
UPLOADED → VALIDATING → VALIDATED → APPLYING → APPLIED
                                             → FAILED
```

### 2.4 파서 확장

| 확장 키 | 파일 | 라이브러리 | 설명 |
|---------|------|-----------|------|
| `csv` | `csv-parser.extension.ts` | `csv-parse/sync` | 표준 CSV (UTF-8 BOM 지원) |
| `firstmall` | `firstmall-parser.extension.ts` | `xlsx` | 퍼스트몰 Excel (한글 헤더 매핑) |

**CSV 컬럼 매핑:**
```
barcode, product_name, brand_name, manufacturer_name,
supply_price, distribution_type, supplier_sku
```

**Firstmall 헤더 매핑 (한글):**
```
상품명, 바코드, 브랜드, 제조사, 판매가, 상품코드
이미지/대표이미지/상세이미지/추가이미지 (자동 감지)
```

### 2.5 검증 파이프라인

| # | 검증 | 실패 시 |
|---|------|--------|
| 1 | Barcode 존재 여부 | REJECTED |
| 2 | GTIN 유효성 (8/12/13/14자리 + 체크디짓) | REJECTED |
| 3 | 배치 내 중복 (seenBarcodes Set) | REJECTED |
| 4 | 가격 형식 (정수, ≥0) | REJECTED |
| 5 | distributionType (PUBLIC/SERVICE/PRIVATE) | REJECTED |
| 6 | ProductMaster 조회 → 존재 시 LINK_EXISTING | VALID |
| 7 | ProductMaster 미존재 + 이름/제조사 있음 → CREATE_MASTER | VALID/WARNING |
| 8 | ProductMaster 미존재 + 필수 필드 부재 | WARNING |

### 2.6 적용 파이프라인

```
Transaction 시작
  ↓
  For each actionable row (VALID/WARNING, action ≠ REJECT):
    ↓
    CREATE_MASTER → NetureService.resolveOrCreateMaster()
    LINK_EXISTING → 기존 masterId 사용
    ↓
    INSERT INTO supplier_product_offers (...)
    ON CONFLICT (master_id, supplier_id) DO UPDATE SET
      price_general = EXCLUDED.price_general,
      distribution_type = EXCLUDED.distribution_type,
      updated_at = NOW()
  ↓
Transaction 커밋
Job status → APPLIED
```

---

## 3. System 2: CSV Import (Supplier)

### 3.1 개요

| 항목 | 값 |
|------|------|
| 인증 | `requireAuth` + `requireActiveSupplier` |
| 파서 | CSV 전용 |
| 흐름 | 2단계: Upload+Validate (1콜) → Apply |
| WO | WO-O4O-B2B-CSV-INGEST-PIPELINE-V1 |

### 3.2 API

```
POST   /supplier/csv-import/upload              — 업로드 + 즉시 검증
GET    /supplier/csv-import/batches             — 배치 목록
GET    /supplier/csv-import/batches/:id         — 배치 상세
POST   /supplier/csv-import/batches/:id/apply   — 배치 적용
```

### 3.3 상태 머신

```
UPLOADED → VALIDATING → READY → APPLIED
                      → FAILED
```

### 3.4 CSV 컬럼

```
barcode (필수)
supplier_sku
supply_price
msrp
stock_qty
distribution_type (PUBLIC/SERVICE/PRIVATE)
description
```

### 3.5 검증 차이점

| 항목 | Catalog Import | CSV Import |
|------|---------------|-----------|
| MFDS 연동 | ❌ 없음 | ✅ `verifyProductByBarcode()` 호출 |
| Master 생성 조건 | productName + manufacturerName 존재 시 | MFDS 검증 통과 시만 |
| Master 미존재 처리 | WARNING (적용 가능) | REJECTED (적용 불가) |

### 3.6 적용 파이프라인

```
Transaction 시작
  ↓
  Batch status = READY 확인
  Supplier status = ACTIVE 확인
  ↓
  For each valid row:
    ↓
    CREATE_MASTER → MFDS 재검증 + Master 생성 (UNIQUE(barcode) 보호)
    LINK_EXISTING → 기존 masterId 사용
    ↓
    INSERT INTO supplier_product_offers (...)
    ON CONFLICT (master_id, supplier_id) DO UPDATE
  ↓
Transaction 커밋
Batch status → APPLIED
```

---

## 4. 데이터 구조

### 4.1 제품 계층

```
ProductMaster (barcode = SSOT, 1 제품 = 1 마스터)
  │
  ├──→ SupplierProductOffer (1:N, supplier별 공급 조건)
  │      ├─ UNIQUE(master_id, supplier_id)
  │      ├─ slug: "{barcode}-{supplierId.slice(0,8)}-{Date.now()}"
  │      ├─ distributionType: PUBLIC/SERVICE/PRIVATE
  │      ├─ approvalStatus: PENDING/APPROVED/REJECTED
  │      ├─ isActive: boolean (default: false)
  │      └─ 3-tier pricing: priceGeneral/Gold/Platinum + consumerReferencePrice
  │
  ├──→ ProductImage (1:N, GCS 저장)
  │      └─ imageUrl + gcsPath + sortOrder + isPrimary
  │
  └──→ Organization Product Listings (1:N, 약국별 진열)
         ├─ UNIQUE(organization_id, service_key, offer_id)
         ├─ price: 약국 소매가 (nullable)
         └─ is_active: 약국 수동 활성화

ProductCategory (4단계 계층: 대/중/소/세부)
Brand (이름 + slug + 제조사)
```

### 4.2 핵심 엔티티

| 엔티티 | 테이블 | 주요 필드 |
|--------|--------|----------|
| ProductMaster | `product_masters` | barcode(UNIQUE), regulatoryType/Name, manufacturerName, isMfdsVerified |
| SupplierProductOffer | `supplier_product_offers` | masterId, supplierId, slug(UNIQUE), distributionType, approvalStatus |
| ProductImage | `product_images` | masterId, imageUrl, gcsPath, sortOrder, isPrimary |
| CatalogImportJob | `catalog_import_jobs` | supplierId, fileName, status, totalRows/validRows/rejectedRows |
| CatalogImportRow | `catalog_import_rows` | jobId, rowNumber, rawJson, parsedFields, validationStatus, actionType |
| SupplierCsvImportBatch | `supplier_csv_import_batches` | supplierId, fileName, status, counts |
| SupplierCsvImportRow | `supplier_csv_import_rows` | batchId, rowNumber, parsedBarcode/Price/DistributionType, validationStatus |

### 4.3 Enum 값 (대소문자)

| Enum | 값 | 표기 | 이슈 |
|------|------|------|------|
| OfferDistributionType | PUBLIC, SERVICE, PRIVATE | UPPER | ✅ 안전 (CSV에서 toUpperCase() 처리) |
| OfferApprovalStatus | PENDING, APPROVED, REJECTED | UPPER | ✅ 안전 |
| SupplierStatus | PENDING, ACTIVE, INACTIVE, REJECTED | UPPER | ✅ 안전 |
| CatalogImportJobStatus | UPLOADED, VALIDATING, VALIDATED, APPLYING, APPLIED, FAILED | UPPER | ✅ 안전 |

---

## 5. Slug 생성 & 중복 처리

### 5.1 현재 구현

```typescript
const slug = `${barcode}-${supplierId.slice(0, 8)}-${Date.now()}`;
// 예: "8801234567890-a1b2c3d4-1710456789012"
```

| 항목 | 상태 |
|------|------|
| 중복 방지 | ✅ Date.now() 밀리초 + UNIQUE 제약 |
| 충돌 시 | DB UNIQUE 에러 (retry 로직 없음) |
| 사람 가독성 | ✅ barcode 접두사 포함 |

### 5.2 Bulk Import 시 Slug

Bulk Import(CSV/Catalog)에서는 **slug를 생성하지 않는 경우가 있음**.
- Catalog Import: `ON CONFLICT ... DO UPDATE` → 기존 slug 유지
- CSV Import: 새 offer 생성 시 UUID 자동 생성 (slug 미설정 가능성)

---

## 6. Transaction 사용 현황

| 작업 | Transaction | 안전성 |
|------|:-----------:|--------|
| **단일 제품 등록** | ❌ | ⚠️ Master 생성 후 Offer 실패 시 orphan master |
| **CSV Batch Apply** | ✅ | ✅ 전체 rollback |
| **Catalog Import Apply** | ✅ | ✅ 전체 rollback |
| **Offer 승인** | ✅ | ✅ Offer + Auto-listing 원자적 |
| **제품 업데이트** | ❌ | ✅ 단일 save (위험 낮음) |

---

## 7. 이미지 처리

| 항목 | 상태 |
|------|------|
| 저장소 | GCS (o4o-neture-product-images 버킷) |
| 경로 | `products/{masterId}/{uuid}{ext}` |
| 형식 | JPEG, PNG, WebP, GIF |
| Bulk Import 이미지 | ❌ 미처리 (Firstmall 파서에서 imageUrls 추출만, 저장 미구현) |
| CSV Import 이미지 | ❌ 이미지 컬럼 없음 |
| 캐시 | 1년 public (Cache-Control) |

---

## 8. Auto-Listing 확장 (Tier 1)

```
Supplier가 PUBLIC Offer 생성
  ↓
Admin이 Offer 승인 (approvalStatus → APPROVED)
  ↓ [Transaction 내]
autoExpandPublicProduct(queryRunner, offerId, masterId)
  ↓
INSERT INTO organization_product_listings
  (organization_id, service_key, master_id, offer_id, is_active=false)
  FROM organization_service_enrollments
  WHERE org.isActive=true AND enrollment.status='active'
  ON CONFLICT DO NOTHING
  ↓
각 약국에서 수동으로 is_active=true 설정 → 판매 시작
```

Bulk Import 시에는 approvalStatus=PENDING으로 생성되므로 **자동 listing 미발동**.
Admin이 별도로 승인해야 함.

---

## 9. MFDS 연동

| 항목 | 상태 |
|------|------|
| 구현 | **Stub** — `{ verified: false, error: 'MFDS_NOT_IMPLEMENTED' }` 반환 |
| 인터페이스 | Frozen (WO-O4O-PRODUCT-MASTER-CORE-RESET-V1) |
| 영향 | CSV Import에서 새 Master 생성 시 항상 REJECTED |
| 우회 | Catalog Import는 MFDS 미사용 → manualData로 Master 생성 가능 |

---

## 10. AI 콘텐츠 생성

| 항목 | 상태 |
|------|------|
| 제품 등록 시 자동 생성 | ❌ 없음 |
| 수동 트리거 | 존재 (`product-ai-content.service.ts`) |
| Bulk Import 연동 | ❌ 없음 |
| 설명 필드 | 수동 입력만 (4개: consumer/business × short/detail) |

---

## 11. Frontend UI 존재 여부

| 화면 | 상태 | 설명 |
|------|------|------|
| Supplier Bulk Import UI | ❌ 없음 | API만 존재, 프론트엔드 미구현 |
| Admin Catalog Import UI | ❌ 없음 | API만 존재, 프론트엔드 미구현 |
| Supplier 단일 제품 등록 UI | ⚠️ 확인 필요 | 별도 조사 필요 |

---

## 12. 발견된 문제점

### 12.1 심각도 높음

| # | 문제 | 설명 | 영향 |
|---|------|------|------|
| 1 | **MFDS Stub** | CSV Import에서 새 Master 생성이 항상 실패 | Supplier가 기존 Master 없는 제품 등록 불가 |
| 2 | **Bulk Import 시 slug 미생성** | CSV Import의 Offer 생성에서 slug 설정 누락 가능 | 스토어 URL 접근 불가 |
| 3 | **Frontend UI 부재** | 2개 Import 시스템 모두 API만 존재 | 실제 운영 사용 불가 |

### 12.2 심각도 중간

| # | 문제 | 설명 |
|---|------|------|
| 4 | **Bulk Import 이미지 미처리** | Firstmall 파서가 imageUrls 추출하지만 GCS 저장 안 함 |
| 5 | **단일 제품 등록 Transaction 없음** | Master 생성 후 Offer 실패 시 orphan master |
| 6 | **AI 콘텐츠 미연동** | Bulk Import 후 설명 필드가 비어있음 |
| 7 | **승인 워크플로 없음** | Bulk Import 후 Admin이 건건이 승인해야 함 (대량 승인 API 없음) |

### 12.3 심각도 낮음

| # | 문제 | 설명 |
|---|------|------|
| 8 | **Progress Tracking 없음** | WebSocket/Polling 미구현, 대용량 파일 처리 시 타임아웃 |
| 9 | **Batch 취소/재시도 없음** | FAILED 배치 재실행 불가 |
| 10 | **에러 리포트 다운로드 없음** | 검증 실패 상세를 CSV로 내려받는 기능 없음 |

---

## 13. 파일 인벤토리

### Catalog Import System (12개 파일)

```
apps/api-server/src/modules/catalog-import/
├── catalog-import.routes.ts
├── services/
│   ├── catalog-import.service.ts
│   ├── catalog-import-validator.ts
│   ├── catalog-import-resolver.ts
│   └── catalog-import-offer.service.ts
├── entities/
│   ├── CatalogImportJob.entity.ts
│   └── CatalogImportRow.entity.ts
├── extensions/
│   ├── csv-parser.extension.ts
│   └── firstmall-parser.extension.ts
├── types/
│   └── catalog-import.types.ts
└── index.ts
```

### CSV Import System (4개 파일)

```
apps/api-server/src/modules/neture/
├── controllers/supplier-product.controller.ts (lines 161-232)
├── services/csv-import.service.ts
└── entities/
    ├── SupplierCsvImportBatch.entity.ts
    └── SupplierCsvImportRow.entity.ts
```

### 공유 인프라

```
apps/api-server/src/
├── middleware/upload.middleware.ts (multer, 10MB 제한)
├── utils/gtin.ts (GTIN 검증)
└── modules/neture/services/mfds.service.ts (Stub)
```

---

## 14. 최종 판정

### **MINOR FIX** (코드 보완 필요, 전면 리팩토링은 불필요)

**근거:**
- 2개 Import 시스템이 구조적으로 잘 설계됨
- Transaction 적용됨 (Apply 단계)
- 검증 파이프라인 완성
- GTIN, 중복, 가격, enum 검증 모두 구현
- Pluggable 파서 아키텍처 (확장 가능)

**보완 필요:**
1. **MFDS 실제 연동** (현재 Stub) → 가장 중요
2. **Frontend UI** → 운영에 필수
3. **Bulk Import 시 slug 생성 보장** → 코드 검증
4. **이미지 URL → GCS 다운로드 파이프라인** → Firstmall 활용
5. **대량 승인 API** → Admin 운영 효율
6. **AI 콘텐츠 자동 생성 트리거** → Import 완료 후

---

## 15. 개선 제안 (WO-O4O-NETURE-PRODUCT-BULK-IMPORT-ENGINE-V1 범위)

### 단기 (즉시 가능)

| # | 작업 | 우선순위 |
|---|------|---------|
| 1 | Bulk Import 시 slug 생성 검증 및 보장 | 높음 |
| 2 | 대량 승인 API (`POST /admin/offers/bulk-approve`) | 높음 |
| 3 | 에러 리포트 CSV 다운로드 | 중 |

### 중기 (UI + 연동)

| # | 작업 | 설명 |
|---|------|------|
| 4 | **Supplier Bulk Import UI** | CSV 업로드 → 검증 결과 → 적용 3단계 화면 |
| 5 | **Admin Catalog Import UI** | Job 관리 + 검증 결과 + 적용 화면 |
| 6 | **이미지 URL 자동 다운로드** | Firstmall imageUrls → GCS 저장 → ProductImage 생성 |
| 7 | **Import 후 AI 콘텐츠 자동 생성** | Apply 완료 → fire-and-forget AI 설명 생성 |

### 장기 (MFDS + 확장)

| # | 작업 | 설명 |
|---|------|------|
| 8 | **MFDS API 실제 연동** | 식약처 DB 연동 → Master 자동 생성 활성화 |
| 9 | **추가 파서 확장** | 쿠팡/네이버 엑셀 포맷 등 |
| 10 | **실시간 진행률** | WebSocket/SSE 기반 Import 진행 상태 |

---

*Created: 2026-03-16*
*Based on: Codebase analysis of apps/api-server/src/modules/catalog-import/, apps/api-server/src/modules/neture/*
*Status: Complete*
