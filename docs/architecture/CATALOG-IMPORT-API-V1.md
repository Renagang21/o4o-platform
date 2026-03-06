# CATALOG-IMPORT-API-V1

> Catalog Import API 명세
> WO: WO-O4O-CATALOG-IMPORT-APP-IMPLEMENTATION-V1

---

## Base URL

```
/api/v1/catalog-import
```

## Authentication

모든 엔드포인트: `requireAuth` + `requireNetureScope('neture:admin')`

---

## Endpoints

### POST /jobs — Upload File

파일을 업로드하고 Import Job을 생성합니다.

**Request**: `multipart/form-data`
- `file`: 업로드 파일 (CSV 또는 Excel)
- `extension_key`: `csv` | `firstmall`
- `supplier_id`: 공급자 UUID

**Response** `201`:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "supplierId": "uuid",
    "fileName": "products.csv",
    "extensionKey": "csv",
    "totalRows": 10,
    "status": "UPLOADED",
    "rows": [...]
  }
}
```

---

### GET /jobs — List Jobs

Import Job 목록을 조회합니다.

**Query**: `?supplier_id=uuid` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "status": "APPLIED", "totalRows": 10, ... }
  ]
}
```

---

### GET /jobs/:id — Job Detail

Job 상세 정보와 모든 Row를 조회합니다.

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "VALIDATED",
    "validRows": 8,
    "warningRows": 1,
    "rejectedRows": 1,
    "rows": [
      {
        "rowNumber": 1,
        "parsedBarcode": "8801234567893",
        "validationStatus": "VALID",
        "actionType": "LINK_EXISTING",
        "masterId": "uuid"
      }
    ]
  }
}
```

---

### POST /jobs/:id/validate — Validate Job

Job의 모든 Row를 검증합니다.

**Precondition**: Job status = `UPLOADED`

**Validation Rules**:
1. Barcode presence
2. GTIN format + check digit
3. Batch-internal barcode dedup
4. Price validation (>= 0)
5. Distribution type (PUBLIC, PRIVATE, SERVICE)
6. ProductMaster lookup → LINK_EXISTING or CREATE_MASTER

**Response**:
```json
{
  "success": true,
  "data": {
    "validRows": 8,
    "warningRows": 1,
    "rejectedRows": 1
  }
}
```

---

### POST /jobs/:id/apply — Apply Job

검증된 Job을 카탈로그에 적용합니다.

**Precondition**: Job status = `VALIDATED`

**Request Body**:
```json
{
  "supplier_id": "uuid"
}
```

**Apply Actions**:
1. CREATE_MASTER rows → `NetureService.resolveOrCreateMaster(barcode, manualData)`
2. All actionable rows → Offer UPSERT (`ON CONFLICT (master_id, supplier_id)`)

**Response**:
```json
{
  "success": true,
  "data": {
    "appliedOffers": 9,
    "createdMasters": 3
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| FILE_REQUIRED | 파일 미첨부 |
| SUPPLIER_ID_REQUIRED | supplier_id 미입력 |
| INVALID_EXTENSION | 지원하지 않는 extension_key |
| PARSE_ERROR | 파일 파싱 실패 |
| EMPTY_FILE | 빈 파일 |
| JOB_NOT_FOUND | Job 미존재 |
| INVALID_STATUS | 잘못된 Job 상태 전이 |
| APPLY_FAILED | Apply 트랜잭션 실패 |

---

*Created: 2026-03-07*
