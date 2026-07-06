# WO-O4O-MEDICAL-DEVICE-CURRENT-DB-BASELINE-AND-MINIMAL-FIELD-DRYRUN-V1

> 상태: READY / READ-ONLY FIRST
> 작성일: 2026-07-06
> 선행 기준:
> - `docs/checks/CHECK-O4O-MEDICAL-DEVICE-MFDS-CENTERED-WORK-RESOLUTION-V1.md`
> - `docs/checks/CHECK-O4O-MEDICAL-DEVICE-O4O-DB-CURRENT-STATE-V1.md`
> - `docs/work-orders/WO-O4O-MEDICAL-DEVICE-MINIMAL-PRODUCT-DATA-CURRENT-STATE-CLEANUP-AND-DRYRUN-V1.md`

---

## 0. 작업 목적

의료기기 데이터 작업에서 식약처 원천 row를 기준으로 진행되던 흐름을 정리했으므로, 이제 실제 운영 DB 기준으로 현재 상태를 확인하고 O4O 상품 데이터에 필요한 식약처 의료기기 정보만 최소 범위로 적용할 수 있는지 dry-run한다.

이번 작업의 기준은 식약처 데이터가 아니라 **O4O 유통 상품 데이터**다.

---

## 1. 핵심 원칙

1. `ProductMaster`는 O4O 상품/SKU/포장 단위의 기본 상품 SSOT다.
2. 식약처 의료기기 데이터는 O4O 상품 데이터를 보강하는 원천일 뿐이다.
3. 식약처 raw row 수, API totalCount, UDI-DI row 수를 O4O 상품 수로 보지 않는다.
4. 약국에서 판매되지 않을 의료기관/치과 등 대상 제품은 이미 삭제·정리된 이력일 수 있으므로, 현재 DB 잔존 상품과 과거 삭제 이력을 분리한다.
5. 사용자 승인 전에는 DB write, migration, apply를 하지 않는다.

---

## 2. 이번 작업에서 하지 않는 것

| 금지 항목 | 이유 |
|---|---|
| 식약처 row 전량 `ProductMaster` 승격 | 원천 grain과 O4O 상품 grain이 다름 |
| 2.65M totalCount 기준 작업 | UDI-DI 중심 raw/streaming 수치일 수 있음 |
| 전량 raw fetch | O4O 상품 DB 적용에 불필요 |
| `ProductCandidate` 전량 적재 | O4O 상품 데이터가 아님 |
| `rawPayload` 원문 전체 보존 | 유통 상품정보에 직접 필요 없음 |
| 허가상태/허가일자/품목상태 기준 정리 | O4O 유통 상품정보가 아님 |
| 허가번호 정규 저장 | 기본 제외. 충돌 조사 시 read-only 참고만 가능 |
| 등급/분류번호 정규 저장 | 기본 제외. 검색 태그로도 우선순위 낮음 |
| `RepresentativeProduct` 생성/연결 | 의료기기는 개별 상품별 설명서 제작 전제 |
| 의료기기 Extension 생성 | 현 단계 불필요 |
| hard delete/상태 변경 | 사용자 승인 전 금지 |

---

## 3. 산출물

필수 산출:

1. `docs/checks/CHECK-O4O-MEDICAL-DEVICE-CURRENT-DB-BASELINE-V1.md`
2. `docs/checks/CHECK-O4O-MEDICAL-DEVICE-MINIMAL-FIELD-DRYRUN-V1.md`

둘을 하나로 합쳐 작성해도 되지만, read-only baseline과 dry-run 결과는 섹션으로 명확히 분리한다.

---

## 4. Step 1 - 운영 DB current baseline 실측

운영 DB에서 read-only로만 실행한다.

### 4.1 schema 존재 확인

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'product_masters',
    'product_identifiers',
    'product_candidates',
    'representative_products',
    'product_master_cleanup_audits'
  )
ORDER BY table_name, ordinal_position;
```

확인 목적:

| 항목 | 판단 |
|---|---|
| `medical_device_grade` | 과거 등급 정리 이력 확인용. 새 상품정보 필드로 쓰지 않음 |
| `product_data_status` | 과거 active/review/delete 정리 이력 확인용 |
| `product_data_curation_reason` | 삭제/정리 사유 확인용 |
| `product_master_cleanup_audits` | 삭제 이력 확인용 |

### 4.2 의료기기 ProductMaster count

```sql
SELECT
  regulatory_type,
  COUNT(*)::int AS count
FROM product_masters
GROUP BY regulatory_type
ORDER BY count DESC;
```

```sql
SELECT
  COUNT(*)::int AS medical_device_master_count
FROM product_masters
WHERE deleted_at IS NULL
  AND (
    regulatory_type IN ('MEDICAL_DEVICE', 'medical_device', '의료기기')
    OR mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%'
  );
```

주의:

- 과거 문서의 19,602 / 3,837 / 712 수치와 다를 수 있다.
- 차이가 있으면 먼저 삭제/정리 이력 반영 여부를 본다.

### 4.3 의료기기 sample

```sql
SELECT
  id,
  barcode,
  regulatory_type,
  name,
  regulatory_name,
  manufacturer_name,
  specification,
  mfds_permit_number,
  mfds_product_id,
  representative_product_id,
  created_at,
  updated_at
FROM product_masters
WHERE deleted_at IS NULL
  AND (
    regulatory_type IN ('MEDICAL_DEVICE', 'medical_device', '의료기기')
    OR mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%'
  )
ORDER BY updated_at DESC
LIMIT 100;
```

### 4.4 ProductIdentifier 분포

```sql
SELECT
  pi.identifier_type,
  COUNT(*)::int AS count,
  COUNT(DISTINCT pi.product_master_id)::int AS distinct_masters
FROM product_identifiers pi
JOIN product_masters pm ON pm.id = pi.product_master_id
WHERE pi.deleted_at IS NULL
  AND pm.deleted_at IS NULL
  AND (
    pm.regulatory_type IN ('MEDICAL_DEVICE', 'medical_device', '의료기기')
    OR pm.mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%'
  )
GROUP BY pi.identifier_type
ORDER BY count DESC;
```

### 4.5 UDI-DI 중복 확인

```sql
SELECT
  pi.normalized_value,
  COUNT(*)::int AS identifier_count,
  COUNT(DISTINCT pi.product_master_id)::int AS master_count
FROM product_identifiers pi
WHERE pi.deleted_at IS NULL
  AND pi.identifier_type = 'UDI_DI'
GROUP BY pi.normalized_value
HAVING COUNT(DISTINCT pi.product_master_id) > 1
ORDER BY master_count DESC, identifier_count DESC
LIMIT 100;
```

### 4.6 barcode 유효성 확인

가능하면 application code 또는 SQL 함수로 GTIN-14 check-digit을 검증한다. 최소한 아래 분포를 먼저 확인한다.

```sql
SELECT
  CASE
    WHEN barcode IS NULL OR TRIM(barcode) = '' THEN 'missing'
    WHEN barcode ~ '^[0-9]{14}$' THEN 'numeric_14'
    ELSE 'other'
  END AS barcode_shape,
  COUNT(*)::int AS count
FROM product_masters
WHERE deleted_at IS NULL
  AND (
    regulatory_type IN ('MEDICAL_DEVICE', 'medical_device', '의료기기')
    OR mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%'
  )
GROUP BY barcode_shape
ORDER BY count DESC;
```

### 4.7 ProductCandidate 의료기기 흔적

이번 작업은 `ProductCandidate` 전량 적재를 하지 않는다. 아래는 과거 적재 흔적 확인용이다.

```sql
SELECT
  source_type,
  source_label,
  candidate_status,
  match_status,
  COUNT(*)::int AS count
FROM product_candidates
WHERE deleted_at IS NULL
  AND (
    source_label ILIKE '%MEDICAL%'
    OR source_label ILIKE '%DEVICE%'
    OR source_label ILIKE '%UDI%'
    OR source_label ILIKE '%의료%'
  )
GROUP BY source_type, source_label, candidate_status, match_status
ORDER BY count DESC;
```

### 4.8 RepresentativeProduct 오연결 확인

의료기기 신규 적용에서는 대표상품을 쓰지 않는다. 이미 연결된 건이 있는지 확인만 한다.

```sql
SELECT
  CASE WHEN representative_product_id IS NULL THEN 'unlinked' ELSE 'linked' END AS representative_link_status,
  COUNT(*)::int AS count
FROM product_masters
WHERE deleted_at IS NULL
  AND (
    regulatory_type IN ('MEDICAL_DEVICE', 'medical_device', '의료기기')
    OR mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%'
  )
GROUP BY representative_link_status
ORDER BY representative_link_status;
```

---

## 5. Step 2 - 삭제/정리 이력과 현재 잔존 상품 분리

baseline CHECK에는 아래를 반드시 분리해 기록한다.

| 구분 | 기록 내용 |
|---|---|
| 과거 삭제 완료 수 | audit 또는 문서 근거가 있을 때만 기록 |
| 현재 잔존 의료기기 ProductMaster | 후속 O4O 상품 DB 작업 대상 |
| 현재 active/review_required | 컬럼이 있을 때만 기록 |
| ProductCandidate 적재 흔적 | 후속 정리 필요 여부 판단 |
| UDI-DI 중복 | dry-run 차단 조건 |
| RepresentativeProduct 연결 | 정정 후보. 신규 연결 금지 |

중요:

- 삭제된 약국 비유통 대상은 다시 살리지 않는다.
- 현재 잔존 상품 기준으로 식약처 최소 필드 보강 여부를 판단한다.

---

## 6. Step 3 - 식약처 최소 필드 매핑 dry-run

식약처 의료기기 표준코드별 제품정보에서 가져올 수 있는 필드는 아래로 제한한다.

| 식약처 필드 | O4O 후보 | 적용 |
|---|---|---|
| `UDIDI_CD` | `ProductIdentifier.identifierType='UDI_DI'` | 기본 후보 |
| `UDIDI_CD` 숫자14 + GTIN valid | `ProductMaster.barcode` | barcode 후보 |
| `PRDT_NM_INFO` | `ProductMaster.name` | 상품명 후보 |
| `PRDLST_NM` | `ProductMaster.regulatoryName` 또는 name fallback | 공식명/품목명 후보 |
| `FOML_INFO` | `ProductMaster.specification` | 모델/규격 후보 |
| `MNFT_IPRT_ENTP_NM` | `ProductMaster.manufacturerName` | 제조/수입 업체 후보 |

제외 필드:

| 식약처 필드 | 처리 |
|---|---|
| `PERMIT_NO` | 기본 제외. 충돌 조사 시 read-only 참고 |
| `PRMSN_YMD` | 제외 |
| 허가상태/품목상태 | 제외 |
| `MDEQ_CLSF_NO` | 제외 |
| `CLSF_NO_GRAD_CD` | 제외 |
| `USE_PURPS_CONT` | 상품 DB 제외. 설명서 트랙에서 별도 판단 |
| `STRG_CND_INFO` | 상품 DB 제외. 설명서 트랙에서 별도 판단 |
| raw 원문 전체 | 제외 |

---

## 7. dry-run 결과 형식

`CHECK-O4O-MEDICAL-DEVICE-MINIMAL-FIELD-DRYRUN-V1.md`에는 아래 지표를 기록한다.

| 지표 | 설명 |
|---|---|
| sourceRowsChecked | dry-run에 사용한 식약처 row 수 |
| existingMedicalDeviceMasters | 현재 의료기기 ProductMaster 수 |
| wouldMatchExistingByUDI | 기존 master와 UDI-DI 매칭 |
| wouldCreateProductMaster | 신규 master 후보 |
| wouldCreateUDIIdentifier | 신규 UDI-DI identifier 후보 |
| wouldSetBarcode | GTIN형 UDI-DI를 barcode 후보로 볼 수 있는 건 |
| skipNonGtinBarcode | UDI-DI는 있으나 barcode 부적합 |
| skipMissingName | 상품명/품목명 없음 |
| skipMissingManufacturer | 업체명 없음 |
| skipDuplicateUDI | 같은 UDI-DI 충돌 |
| skipExistingConflict | 기존 barcode/identifier 충돌 |
| reviewRequired | 상품 grain을 확정하기 어려운 건 |

차단 조건:

| 차단 조건 | 처리 |
|---|---|
| 같은 UDI-DI가 여러 ProductMaster에 연결 | apply 금지 |
| 비숫자/HIBCC UDI-DI를 barcode로 넣으려는 경우 | barcode 적용 금지 |
| 제품명/모델명/업체명 결측이 과다한 경우 | ProductMaster 생성 보류 |
| 원천 row grain이 상품/포장 단위로 설명되지 않는 경우 | ProductMaster 생성 보류 |
| wouldCreate 수가 사용자 예상 범위를 크게 초과 | apply 금지, 원인 조사 |

---

## 8. 사용자 승인 전 보고

apply 전에 사용자에게 아래를 보고하고 승인받는다.

| 보고 항목 |
|---|
| 현재 운영 DB 의료기기 ProductMaster 수 |
| 현재 의료기기 ProductIdentifier 분포 |
| UDI-DI 중복 여부 |
| barcode 유효성 분포 |
| 과거 삭제/정리 이력과 현재 잔존 상품의 차이 |
| dry-run 생성/매칭/skip/review count |
| apply 대상 row 수 |
| rollback 또는 정정 계획 |
| admin smoke 항목 |

승인 전 금지:

- ProductMaster insert/update
- ProductIdentifier insert/update
- ProductCandidate import/apply
- RepresentativeProduct 생성/연결
- Extension 생성
- 삭제/상태 변경

---

## 9. apply 이후 admin smoke 후보

apply가 승인되어 실행된 뒤에만 진행한다.

| 확인 | 기준 |
|---|---|
| O4O 상품 DB > 기본 상품 검색 | 상품명/업체명/barcode로 검색 가능 |
| 상세 regulatory type | 의료기기로 확인 가능 |
| UDI-DI 확인 | 상세 API/UI에서 identifier 노출 필요 여부 기록 |
| barcode 확인 | GTIN형 UDI-DI만 barcode로 들어갔는지 확인 |
| 대표상품 | 의료기기에는 신규 연결되지 않았는지 확인 |

---

## 10. 완료 기준

1. 현재 운영 DB 기준 의료기기 baseline이 read-only로 문서화된다.
2. 과거 삭제/정리 이력과 현재 잔존 의료기기가 분리된다.
3. 식약처 최소 필드 dry-run 결과가 생성/매칭/skip/review 사유별로 정리된다.
4. 사용자 승인 전까지 DB write가 발생하지 않는다.
5. 다음 apply 여부를 판단할 수 있는 수치와 차단 조건이 명확해진다.
