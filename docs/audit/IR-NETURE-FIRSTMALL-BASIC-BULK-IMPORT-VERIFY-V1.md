# IR-NETURE-FIRSTMALL-BASIC-BULK-IMPORT-VERIFY-V1

> **Status: COMPLETE**
> Date: 2026-03-21
> 검증 대상: WO-NETURE-FIRSTMALL-BASIC-BULK-IMPORT-ENABLEMENT-V1 배포 후 실제 동작 검증
> 검증 방법: 실제 API 호출 (curl/node fetch → `https://api.neture.co.kr`)
> 검증 계정: admin-neture@o4o.com (neture:admin)

---

## Executive Summary

**최종 판정: Case B + Case E**

> 기본 동작은 되지만, **옵션 상품 거부 로직에 버그**가 있고 **일부 필드 반영 경로에 누락**이 있다.

| 항목 | 결과 |
|------|------|
| 마이그레이션 | ✅ 3개 컬럼 정상 생성 |
| 업로드 (Upload) | ✅ firstmall 파싱 + 신규 필드 정상 |
| 옵션 상품 거부 | ⚠️ **BUG** — Upload 시 REJECTED → Validate 시 VALID로 덮어씀 |
| Validate | ✅ GTIN 검증, Master 조회/생성 분기 정상 |
| Apply | ✅ Offer UPSERT 정상, Master 생성 정상 |
| consumer_reference_price (MSRP) | ✅ 정상 반영 (25000, 35000, 30000) |
| consumer_short_description | ✅ 정상 반영 (`<p>` 래핑) |
| stock_quantity | ⚠️ 저장은 되나 admin 조회 API 응답에 미포함 |
| Brand 매핑 | ✅ 신규 브랜드 생성 + Master 연결 정상 |
| 이미지 처리 | ⚠️ fire-and-forget — 검증 불가 (placeholder URL 사용) |

---

## 1. 마이그레이션 적용 확인

### 결과: ✅ PASS

3개 컬럼이 `catalog_import_rows` 테이블에 정상 존재함을 **실제 API 응답**으로 확인:

| 컬럼 | API 응답 필드 | 테스트 값 | 확인 |
|------|-------------|----------|:----:|
| `parsed_msrp` | `parsedMsrp` | 25000, 35000, 30000 | ✅ |
| `parsed_stock_qty` | `parsedStockQty` | 100, 50, 75 | ✅ |
| `parsed_description` | `parsedDescription` | "고함량 비타민C..." 등 | ✅ |

**Migration**: `20260321100000-AddFieldsToCatalogImportRows.ts` — CI/CD 자동 실행 확인됨

---

## 2. 업로드 결과

### 결과: ✅ PASS

| 항목 | 값 |
|------|------|
| 업로드 API | `POST /api/v1/catalog-import/jobs` ✅ 201 Created |
| Job ID | `ee767bc1-35d4-4db0-97ff-ceb473c40ce4` |
| extension_key | `firstmall` |
| supplier_id | `5d888132-c4f0-47be-a962-a630a7476e58` (Firstmall Test Store) |
| 파일명 | `firstmall_test2.xlsx` |
| totalRows | 3 |
| status | `UPLOADED` |

### 파싱 결과 상세

| Row | 바코드 | 상품명 | 판매가 | 소비자가 | 재고 | 설명 | 이미지 | 옵션 |
|:---:|--------|--------|:------:|:-------:|:----:|------|:------:|:----:|
| 1 | 8801234567893 | 비타민C 1000mg 테스트 | 15000 | 25000 | 100 | ✅ | 1개 URL | ❌ |
| 2 | 8801234567909 | 오메가3 트리플 | 22000 | 35000 | 50 | ✅ | 1개 URL | ❌ |
| 3 | 8801234567916 | 프로바이오틱스 옵션상품 | 18000 | 30000 | 75 | ✅ | 1개 URL | ✅ `필수옵션=30정/60정/90정` |

**Upload 시 Row 3 상태**: `validationStatus=REJECTED`, `validationError="HAS_OPTIONS: 옵션 상품은 현재 미지원"`, `actionType=REJECT`

---

## 3. 옵션 처리 결과

### 결과: ⚠️ BUG FOUND

#### Upload 단계 (정상)

| Row | 옵션 데이터 | Upload 시 status | Upload 시 error |
|:---:|-----------|:-------:|:-------:|
| 1 | (없음) | PENDING | — |
| 2 | (없음) | PENDING | — |
| 3 | `필수옵션=30정/60정/90정` | **REJECTED** | `HAS_OPTIONS: 옵션 상품은 현재 미지원` |

#### Validate 단계 (BUG)

| Row | Validate 후 status | Validate 후 action | 문제 |
|:---:|:---------:|:---------:|------|
| 1 | VALID | LINK_EXISTING | ✅ 정상 |
| 2 | VALID | CREATE_MASTER | ✅ 정상 |
| 3 | **VALID** | **CREATE_MASTER** | **❌ BUG: REJECTED → VALID로 덮어씀** |

#### 근본 원인

`CatalogImportValidator.validateRows()`가 **모든 행을 순회하며 validationStatus를 재설정**한다.
Upload 시 `REJECTED`로 설정된 옵션 상품도, GTIN이 유효하고 productName+manufacturerName이 존재하면
`VALID + CREATE_MASTER`로 덮어쓴다.

```
Upload: Row 3 → REJECTED (HAS_OPTIONS)
Validate: Row 3 → 바코드 유효 + 이름+제조사 존재 → VALID (CREATE_MASTER) ← BUG
Apply: Row 3 → Offer 생성됨 ← 의도하지 않은 동작
```

#### 영향

- 옵션 상품이 **정상 상품으로 등록**됨
- Master 생성 + Offer 생성까지 완료
- 사실상 옵션 거부 로직이 **무효화**됨

#### 수정 방향

`CatalogImportValidator.validateRows()`에서 **이미 REJECTED인 행은 건너뛰는** 로직 추가:

```typescript
// 수정 필요: catalog-import-validator.ts
if (row.validationStatus === 'REJECTED') continue;  // 이미 거부된 행 스킵
```

---

## 4. Apply 결과

### 결과: ✅ PASS (옵션 버그 제외)

| 항목 | 값 |
|------|------|
| 적용 성공 수 | 3 (옵션 상품 포함 — 버그) |
| Master 생성 수 | 2 (Row 2, Row 3) |
| 적용 실패 수 | 0 |
| Job 최종 상태 | `APPLIED` |
| appliedAt | `2026-03-21T02:51:25.752Z` |

### Row별 Apply 결과

| Row | actionType | Master ID | 결과 |
|:---:|:----------:|:---------:|------|
| 1 | LINK_EXISTING | `5216e46c...` | 기존 Master 연결 + Offer UPSERT |
| 2 | CREATE_MASTER | `1c506a8f...` | 신규 Master 생성 + Offer INSERT |
| 3 | CREATE_MASTER | `368c2347...` | 신규 Master 생성 + Offer INSERT (옵션 버그) |

---

## 5. Offer 반영 결과

### 결과: ✅ consumer_reference_price, consumer_short_description 정상 반영

| Offer | 상품명 | priceGeneral | consumerReferencePrice | consumerShortDescription | approvalStatus |
|:-----:|--------|:------------:|:---------------------:|--------------------------|:--------------:|
| Row 1 | IR Runtime Verification Product | 15000 | **25000** ✅ | **`<p>고함량 비타민C 1000mg 건강기능식품</p>`** ✅ | APPROVED (기존) |
| Row 2 | 오메가3 트리플 | 22000 | **35000** ✅ | **`<p>고순도 오메가3 EPA DHA</p>`** ✅ | PENDING |
| Row 3 | 프로바이오틱스 옵션상품 | 18000 | **30000** | **`<p>유산균 100억 CFU</p>`** | PENDING |

### 필드별 확인

| 필드 | 매핑 | 저장 확인 | 비고 |
|------|------|:--------:|------|
| `consumer_reference_price` | `parsedMsrp → consumerReferencePrice` | ✅ | 25000, 35000, 30000 정확히 반영 |
| `consumer_short_description` | `parsedDescription → <p>텍스트</p>` | ✅ | HTML `<p>` 태그 래핑 정상 |
| `stock_quantity` | `parsedStockQty → stockQuantity` | ⚠️ | **admin 조회 API 응답에 미포함** — `getAllProducts()`가 `stockQuantity` 미반환 |

### stock_quantity 누락 상세

`getAllProducts()` (neture.service.ts line 688-702)의 응답 매핑에 `stockQuantity` 필드가 **포함되지 않음**.
Offer 엔티티에는 값이 저장되었을 가능성이 높으나, API 응답에서 확인 불가.

```typescript
// neture.service.ts getAllProducts() 반환 필드
return offers.map((o) => ({
  id: o.id,
  masterId: o.masterId,
  masterName: o.master?.marketingName || '',
  // ... priceGeneral, consumerReferencePrice 포함
  // ❌ stockQuantity 미포함
}));
```

---

## 6. Brand 처리 결과

### 결과: ✅ PASS

| 항목 | 값 |
|------|------|
| 기존 브랜드 매칭 | 0개 |
| **신규 브랜드 생성** | **1개** ✅ |
| 실패 | 0개 |

### 생성된 브랜드

| 브랜드명 | Slug | ID | 생성일 |
|---------|------|-----|-------|
| 뉴트리원 | `뉴트리원` | `5fd8f95f...` | 2026-03-21 |

### Master-Brand 연결

| Master | 바코드 | brand_id | 비고 |
|--------|--------|:--------:|------|
| IR Runtime Verification Product | 8801234567893 | **null** | LINK_EXISTING → 기존 Master에 brand_id 미업데이트 (정상 — 코드가 CREATE_MASTER만 업데이트) |
| 오메가3 트리플 | 8801234567909 | **✅ 5fd8f95f** | CREATE_MASTER → brand_id 설정됨 |
| 프로바이오틱스 옵션상품 | 8801234567916 | **✅ 5fd8f95f** | CREATE_MASTER → brand_id 설정됨 |

**참고**: LINK_EXISTING 상품의 경우 기존 Master의 `brand_id`가 null이어도 업데이트하지 않음.
이는 코드 설계 의도 (`UPDATE ... WHERE brand_id IS NULL` 조건 + `CREATE_MASTER` 분기 내에서만 실행)에 부합.

---

## 7. 이미지 처리 결과

### 결과: ⚠️ 제한적 검증

테스트에서 `https://via.placeholder.com/500` (placeholder 이미지)을 사용.

| 항목 | 분석 |
|------|------|
| 이미지 fetch 시도 여부 | ✅ 코드 상 fire-and-forget으로 실행 (`processImportImages()`) |
| GCS 저장 여부 | **검증 불가** — placeholder URL이 실제 이미지 반환하나 GCS 저장 확인 API 없음 |
| ProductImage 생성 여부 | **검증 불가** — ProductImage 조회 전용 API 없음 |

### 코드 경로 분석 (정적 검증)

```
Apply 완료
  ↓ (fire-and-forget)
processImportImages(imageJobs)
  ↓ for each { masterId, imageUrls }
  fetch(url) → buffer
  ↓
  ImageStorageService.uploadImage(masterId, buffer, mimeType, filename)
  ↓
  GCS upload → products/{masterId}/{uuid}{ext}
  ↓
  INSERT INTO product_images (master_id, image_url, gcs_path, is_primary, ...)
```

이미지 처리는 **비동기 fire-and-forget**이므로 실패해도 Apply 결과에 영향 없음.
실제 이미지 URL이 포함된 파일로 별도 검증 필요.

---

## 8. 최종 판정

### **Case B + Case E**

> **기본 동작은 되지만 일부 필드 반영 누락 + 구조적 제약 존재**

| 판정 | 해당 여부 | 설명 |
|------|:---------:|------|
| **Case A**: 정상 동작 | ❌ | 옵션 버그로 완전 정상 아님 |
| **Case B**: 일부 필드 반영 누락 | ✅ | `stockQuantity` admin API 미노출 |
| **Case C**: API/DB 문제 | ❌ | API 정상 동작 |
| **Case D**: 마이그레이션 미적용 | ❌ | 3개 컬럼 정상 생성 |
| **Case E**: 구조적 제약 | ✅ | 옵션 거부 validate 덮어쓰기 버그 |

### 실사용 테스트 가능 수준?

**조건부 YES** — 옵션 없는 상품만 포함된 파일이라면 즉시 사용 가능.
옵션 상품이 포함된 파일은 현재 옵션 상품도 등록되어 버림.

---

## 9. 발견된 이슈 요약

### BUG-1: 옵션 상품 거부 Validate 덮어쓰기 (HIGH)

| 항목 | 값 |
|------|------|
| 심각도 | **HIGH** |
| 위치 | `catalog-import-validator.ts` → `validateRows()` |
| 증상 | Upload 시 REJECTED 된 옵션 상품이 Validate 시 VALID로 변경 |
| 영향 | 옵션 상품이 정상 상품으로 등록됨 |
| 수정 | Validate 시 이미 REJECTED인 행 스킵 |

### GAP-1: stockQuantity admin API 미노출 (MEDIUM)

| 항목 | 값 |
|------|------|
| 심각도 | MEDIUM |
| 위치 | `neture.service.ts` → `getAllProducts()` |
| 증상 | Offer에 stockQuantity 저장되나 admin 조회 시 반환 안 됨 |
| 수정 | `getAllProducts()` 응답 매핑에 `stockQuantity: o.stockQuantity` 추가 |

### GAP-2: LINK_EXISTING Master brand_id 미업데이트 (LOW)

| 항목 | 값 |
|------|------|
| 심각도 | LOW |
| 위치 | `catalog-import.service.ts` → Apply 단계 |
| 증상 | 기존 Master에 brand_id가 null이어도 import 시 업데이트 안 됨 |
| 수정 | LINK_EXISTING 분기에서도 brand_id IS NULL이면 업데이트 |

### GAP-3: 이미지 처리 결과 확인 불가 (LOW)

| 항목 | 값 |
|------|------|
| 심각도 | LOW |
| 위치 | fire-and-forget 이미지 파이프라인 |
| 증상 | 이미지 처리 성공/실패 확인 API 없음 |
| 수정 | Job에 이미지 처리 상태 필드 추가 (또는 ProductImage 조회 API) |

---

## 10. 다음 단계 권장

| 우선순위 | 작업 | WO 제안 |
|:--------:|------|---------|
| **P0** | 옵션 상품 거부 Validate 덮어쓰기 버그 수정 | WO-NETURE-CATALOG-IMPORT-OPTION-REJECT-FIX-V1 |
| **P1** | stockQuantity admin API 응답 추가 | WO-NETURE-SUPPLIER-CSV-TEMPLATE-V1에 포함 |
| **P2** | LINK_EXISTING brand_id 업데이트 | WO-NETURE-SUPPLIER-CSV-TEMPLATE-V1에 포함 |
| **P2** | 이미지 처리 결과 확인 API | 별도 WO |
| **P2** | 실제 FirstMall 엑셀 파일로 E2E 검증 | 수동 테스트 |

---

## 테스트 실행 기록

### 테스트 1: GTIN 체크디짓 검증 (Invalid Barcodes)

```
파일: firstmall_test.xlsx
바코드: 8801234567890 (invalid), 8801234567906 (invalid), 8801234567913 (invalid)
Upload: ✅ 3 rows parsed
Validate: 3 REJECTED (INVALID_GTIN)
결론: GTIN 검증 정상 동작
```

### 테스트 2: 전체 파이프라인 (Valid Barcodes)

```
파일: firstmall_test2.xlsx
바코드: 8801234567893, 8801234567909, 8801234567916
Upload: ✅ 3 rows (Row 3 = REJECTED HAS_OPTIONS)
Validate: ⚠️ 3 VALID (Row 3 옵션 거부 덮어씀)
Apply: ✅ 3 offers created, 2 masters created
Brand: ✅ '뉴트리원' 신규 생성
Offer fields: ✅ MSRP, description 반영 / ⚠️ stockQuantity 미확인
```

### 검증 환경

```
API: https://api.neture.co.kr
Auth: admin-neture@o4o.com (neture:admin)
Supplier: Firstmall Test Store (5d888132-c4f0-47be-a962-a630a7476e58)
배포 시점: 2026-03-21T02:07 (uptime ~2780s at first health check)
Commit: eb12eb933 (WO-NETURE-FIRSTMALL-BASIC-BULK-IMPORT-ENABLEMENT-V1)
```

---

## 참조 파일

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/modules/catalog-import/services/catalog-import.service.ts` | Import 서비스 (Upload/Validate/Apply) |
| `apps/api-server/src/modules/catalog-import/services/catalog-import-validator.ts` | Validator (BUG-1 위치) |
| `apps/api-server/src/modules/catalog-import/extensions/firstmall/firstmall-parser.extension.ts` | FirstMall 파서 |
| `apps/api-server/src/modules/catalog-import/entities/CatalogImportRow.entity.ts` | Row 엔티티 (3개 신규 컬럼) |
| `apps/api-server/src/modules/neture/services/product-import-common.service.ts` | Offer UPSERT + Brand 해석 + 이미지 처리 |
| `apps/api-server/src/modules/neture/neture.service.ts` | getAllProducts (GAP-1 위치) |
| `apps/api-server/src/database/migrations/20260321100000-AddFieldsToCatalogImportRows.ts` | 3개 컬럼 마이그레이션 |

---

*IR-NETURE-FIRSTMALL-BASIC-BULK-IMPORT-VERIFY-V1 — End of Report*
