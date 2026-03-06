# CATALOG-IMPORT-ERD-V1

> Catalog Import 테이블 설계
> WO: WO-O4O-CATALOG-IMPORT-APP-IMPLEMENTATION-V1

---

## ERD

```
┌──────────────────────────┐
│   neture_suppliers       │
│   (existing)             │
│──────────────────────────│
│ id: UUID PK              │
│ name, slug, status       │
└──────────┬───────────────┘
           │ 1:N
           ▼
┌──────────────────────────────┐
│   catalog_import_jobs        │
│──────────────────────────────│
│ id: UUID PK                  │
│ supplier_id: UUID FK         │──→ neture_suppliers.id
│ uploaded_by: UUID             │
│ file_name: VARCHAR(255)       │
│ extension_key: VARCHAR(50)    │   'csv' | 'firstmall'
│ total_rows: INT               │
│ valid_rows: INT               │
│ warning_rows: INT             │
│ rejected_rows: INT            │
│ status: ENUM                  │   UPLOADED→VALIDATING→VALIDATED→APPLYING→APPLIED|FAILED
│ created_at: TIMESTAMPTZ       │
│ validated_at: TIMESTAMPTZ     │
│ applied_at: TIMESTAMPTZ       │
└──────────┬───────────────────┘
           │ 1:N (CASCADE DELETE)
           ▼
┌──────────────────────────────────┐
│   catalog_import_rows            │
│──────────────────────────────────│
│ id: UUID PK                      │
│ job_id: UUID FK                  │──→ catalog_import_jobs.id
│ row_number: INT                  │
│ raw_json: JSONB                  │   원본 row 데이터
│ parsed_barcode: VARCHAR(50)      │
│ parsed_product_name: VARCHAR(500)│
│ parsed_price: INT                │
│ parsed_distribution_type: VARCHAR│
│ parsed_manufacturer_name: VARCHAR│
│ parsed_brand_name: VARCHAR       │
│ parsed_supplier_sku: VARCHAR     │
│ parsed_image_urls: JSONB         │
│ validation_status: ENUM          │   PENDING→VALID|WARNING|REJECTED
│ validation_error: VARCHAR(500)   │
│ master_id: UUID                  │   validated/applied 후 설정
│ action_type: ENUM                │   LINK_EXISTING|CREATE_MASTER|REJECT
│ created_at: TIMESTAMPTZ          │
└──────────────────────────────────┘
```

## Indexes

- `IDX_catalog_import_jobs_supplier` ON jobs(supplier_id)
- `IDX_catalog_import_rows_job` ON rows(job_id)
- `IDX_catalog_import_rows_barcode` ON rows(parsed_barcode)

## Enum Types

- `catalog_import_job_status_enum`: UPLOADED, VALIDATING, VALIDATED, APPLYING, APPLIED, FAILED
- `catalog_import_row_status_enum`: PENDING, VALID, WARNING, REJECTED
- `catalog_import_row_action_enum`: LINK_EXISTING, CREATE_MASTER, REJECT

---

*Created: 2026-03-07*
