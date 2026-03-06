# CATALOG-IMPORT-ARCHITECTURE-V1

> Catalog Import App 아키텍처 문서
> WO: WO-O4O-CATALOG-IMPORT-APP-IMPLEMENTATION-V1
> Date: 2026-03-07

---

## Overview

외부 상품 데이터(CSV, Firstmall Excel 등)를 O4O Product Catalog(ProductMaster → SupplierProductOffer)으로 Import하는 모듈.

기존 시스템 수정 없이 새 모듈로 구현. Extension Framework를 통해 다양한 소스 형식 지원.

---

## Module Structure

```
apps/api-server/src/modules/catalog-import/
├── types/catalog-import.types.ts          ← NormalizedProduct, enums, interfaces
├── entities/
│   ├── index.ts
│   ├── CatalogImportJob.entity.ts         ← catalog_import_jobs
│   └── CatalogImportRow.entity.ts         ← catalog_import_rows
├── services/
│   ├── catalog-import.service.ts          ← Core orchestration
│   ├── catalog-import-validator.ts        ← GTIN + barcode + price validation
│   ├── catalog-import-resolver.ts         ← Delegates to NetureService.resolveOrCreateMaster()
│   └── catalog-import-offer.service.ts    ← Offer UPSERT
├── extensions/
│   ├── csv/csv-parser.extension.ts        ← CSV → NormalizedProduct[]
│   └── firstmall/firstmall-parser.extension.ts ← Excel → NormalizedProduct[]
├── catalog-import.routes.ts               ← Express Router
└── index.ts                               ← Re-exports
```

---

## Data Flow

```
External File (CSV/Excel)
  ↓ Upload
CatalogParserExtension.parse()
  ↓ NormalizedProduct[]
CatalogImportJob + CatalogImportRow (UPLOADED)
  ↓ Validate
CatalogImportValidator.validateRows()
  ↓ GTIN check, dedup, price, distribution_type
Rows: VALID / WARNING / REJECTED
  ↓ Apply (transaction)
CatalogImportResolver → NetureService.resolveOrCreateMaster()
CatalogImportOfferService → INSERT ... ON CONFLICT UPSERT
  ↓
SupplierProductOffer (PENDING, isActive=false)
  ↓ Admin Approve (existing flow)
SupplierProductOffer (APPROVED, isActive=true)
```

---

## Extension Framework

새 소스 형식 추가 시:
1. `CatalogParserExtension` 인터페이스 구현
2. `EXTENSION_REGISTRY`에 등록
3. `CatalogImportExtensionKey` 타입에 키 추가

---

## Reused Infrastructure

| Component | Location | Usage |
|-----------|----------|-------|
| `validateGtin()` | `utils/gtin.ts` | Barcode validation |
| `resolveOrCreateMaster()` | `neture.service.ts` | ProductMaster creation |
| Offer UPSERT SQL | `csv-import.service.ts` | ON CONFLICT pattern |
| `uploadSingleMiddleware()` | `middleware/upload.middleware.ts` | File upload |
| `requireNetureScope()` | `middleware/neture-scope.middleware.ts` | Auth guard |

---

## Frontend

```
services/web-neture/src/pages/admin/catalog-import/
├── CatalogImportDashboardPage.tsx    ← Dashboard with cards
├── CSVImportPage.tsx                 ← CSV 3-step wizard
├── FirstmallImportPage.tsx           ← Firstmall Excel 3-step wizard
└── ImportHistoryPage.tsx             ← Job list with expandable rows
```

Routes: `/workspace/admin/catalog-import/*`

---

*Created: 2026-03-07*
*WO: WO-O4O-CATALOG-IMPORT-APP-IMPLEMENTATION-V1*
