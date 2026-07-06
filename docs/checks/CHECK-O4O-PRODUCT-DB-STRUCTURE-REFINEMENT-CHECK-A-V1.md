# CHECK-O4O-PRODUCT-DB-STRUCTURE-REFINEMENT-CHECK-A-V1

Status: READY — read-only SQL runbook
Date: 2026-07-06
Scope: O4O 상품 DB 구조 정비 전, 운영 DB의 현재 의약품/ProductMaster/Identifier/Extension/Representative/Description 상태를 실측한다.

Related:

- `docs/work-orders/WO-O4O-PRODUCT-DB-STRUCTURE-REFINEMENT-HANDOFF-V1.md`
- `docs/work-orders/WO-O4O-DRUG-O4O-DB-APPLY-HANDOFF-V1.md`
- `docs/investigations/PROPOSAL-O4O-PRODUCT-STRUCTURE-REFINEMENT-FOR-MFDS-PUBLIC-DATA-V1.md`

---

## 0. 목적

이 CHECK는 구조 정비 WO의 Step 0이다.

확인할 것:

1. 의약품 Gate B가 현재 부분 적용인지, 완료인지, 후속 삭제/정제가 반영됐는지 확인한다.
2. `ProductIdentifier` 코드 연결률을 확인한다.
3. `ProductDrugExtension`, `RepresentativeProduct`, `SharedProductDescription` 생성/연결률을 확인한다.
4. `MFDS_CODE`별 master/제조사 분포를 실측해 RepresentativeProduct grouping key 결정을 뒷받침한다.

주의:

- 전부 read-only `SELECT`다.
- 운영 DB write 금지.
- 과거 dry-run 숫자(`eligible=230,841`, `identifier=703,483`)를 현재 상태로 가정하지 않는다.
- 최근 `drug_unspecified` 삭제/정제 커밋 이후 기준으로 실측한다.

---

## 1. 실행 전제

프록시 예시:

```bash
cloud-sql-proxy netureyoutube:asia-northeast3:o4o-platform-db --port 15432
```

이 문서는 DB 비밀번호/자격증명 추출을 요구하지 않는다. 접속은 사용자 또는 승인된 운영 채널에서 수행한다.

---

## 2. CHECK-A SQL

### 2.1 ProductMaster 의약품 현재 수

```sql
SELECT
  COUNT(*) AS total_product_masters,
  COUNT(*) FILTER (WHERE regulatory_type = 'DRUG') AS drug_masters,
  COUNT(*) FILTER (WHERE regulatory_type = 'DRUG' AND drug_category = 'rx') AS rx_masters,
  COUNT(*) FILTER (WHERE regulatory_type = 'DRUG' AND drug_category = 'otc') AS otc_masters,
  COUNT(*) FILTER (WHERE regulatory_type = 'DRUG' AND drug_category = 'drug_unspecified') AS drug_unspecified_masters,
  COUNT(*) FILTER (WHERE regulatory_type = 'DRUG' AND drug_category IS NULL) AS drug_category_null_masters
FROM product_masters;
```

판단:

- `drug_masters`는 현재 의약품 Gate B 적용/정제 후 실제 기준이다.
- `drug_unspecified_masters`가 0인지, 일부 남았는지 확인한다.

### 2.2 의약품 import tag 기준 수

```sql
SELECT
  COUNT(*) AS hira_import_masters,
  COUNT(*) FILTER (WHERE drug_category = 'rx') AS rx,
  COUNT(*) FILTER (WHERE drug_category = 'otc') AS otc,
  COUNT(*) FILTER (WHERE drug_category = 'drug_unspecified') AS drug_unspecified,
  COUNT(*) FILTER (WHERE representative_product_id IS NOT NULL) AS with_representative_product
FROM product_masters
WHERE regulatory_type = 'DRUG'
  AND tags ? 'import:hira-drug-master';
```

### 2.3 ProductIdentifier type별 수

```sql
SELECT
  identifier_type,
  COUNT(*) AS total,
  COUNT(DISTINCT product_master_id) AS distinct_masters
FROM product_identifiers
WHERE deleted_at IS NULL
  AND identifier_type IN ('KOREA_DRUG_CODE', 'MFDS_CODE', 'KOREA_INSURANCE_CODE', 'ATC_CODE')
GROUP BY identifier_type
ORDER BY identifier_type;
```

### 2.4 의약품 Master 대비 Identifier 연결률

```sql
WITH drug_masters AS (
  SELECT id
  FROM product_masters
  WHERE regulatory_type = 'DRUG'
),
identifier_pivot AS (
  SELECT
    product_master_id,
    BOOL_OR(identifier_type = 'KOREA_DRUG_CODE') AS has_korea_drug_code,
    BOOL_OR(identifier_type = 'MFDS_CODE') AS has_mfds_code,
    BOOL_OR(identifier_type = 'KOREA_INSURANCE_CODE') AS has_insurance_code,
    BOOL_OR(identifier_type = 'ATC_CODE') AS has_atc_code
  FROM product_identifiers
  WHERE deleted_at IS NULL
  GROUP BY product_master_id
)
SELECT
  COUNT(*) AS drug_masters,
  COUNT(*) FILTER (WHERE COALESCE(ip.has_korea_drug_code, FALSE)) AS with_korea_drug_code,
  COUNT(*) FILTER (WHERE COALESCE(ip.has_mfds_code, FALSE)) AS with_mfds_code,
  COUNT(*) FILTER (WHERE COALESCE(ip.has_insurance_code, FALSE)) AS with_insurance_code,
  COUNT(*) FILTER (WHERE COALESCE(ip.has_atc_code, FALSE)) AS with_atc_code,
  COUNT(*) FILTER (WHERE NOT COALESCE(ip.has_korea_drug_code, FALSE)) AS missing_korea_drug_code,
  COUNT(*) FILTER (WHERE NOT COALESCE(ip.has_mfds_code, FALSE)) AS missing_mfds_code
FROM drug_masters dm
LEFT JOIN identifier_pivot ip ON ip.product_master_id = dm.id;
```

### 2.5 ProductCandidate 약가마스터 잔여/승격 상태

```sql
SELECT
  candidate_status,
  match_status,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE matched_product_master_id IS NOT NULL) AS with_matched_master
FROM product_candidates
WHERE source_type = 'csv_import'
  AND identifier_type = 'KOREA_DRUG_CODE'
  AND deleted_at IS NULL
  AND raw_payload->>'sourceBaseDate' = '2025-10-31'
GROUP BY candidate_status, match_status
ORDER BY candidate_status, match_status;
```

### 2.6 ProductDrugExtension 생성률

```sql
SELECT
  COUNT(pm.id) AS drug_masters,
  COUNT(pde.id) AS with_drug_extension,
  COUNT(pm.id) - COUNT(pde.id) AS missing_drug_extension,
  COUNT(pde.id) FILTER (WHERE pde.deleted_at IS NULL) AS active_drug_extensions
FROM product_masters pm
LEFT JOIN product_drug_extensions pde
  ON pde.product_master_id = pm.id
WHERE pm.regulatory_type = 'DRUG';
```

### 2.7 DrugExtension 코드 mirror 정합성 샘플

```sql
WITH id_codes AS (
  SELECT
    product_master_id,
    MAX(normalized_value) FILTER (WHERE identifier_type = 'KOREA_DRUG_CODE') AS korea_drug_code,
    MAX(normalized_value) FILTER (WHERE identifier_type = 'MFDS_CODE') AS mfds_code,
    MAX(normalized_value) FILTER (WHERE identifier_type = 'KOREA_INSURANCE_CODE') AS insurance_code,
    MAX(normalized_value) FILTER (WHERE identifier_type = 'ATC_CODE') AS atc_code
  FROM product_identifiers
  WHERE deleted_at IS NULL
  GROUP BY product_master_id
)
SELECT
  pm.id,
  pm.name,
  pm.manufacturer_name,
  ids.korea_drug_code,
  pde.drug_code,
  ids.mfds_code,
  pde.mfds_code AS extension_mfds_code,
  ids.insurance_code,
  pde.insurance_code AS extension_insurance_code,
  ids.atc_code,
  pde.atc_code AS extension_atc_code
FROM product_masters pm
JOIN product_drug_extensions pde ON pde.product_master_id = pm.id AND pde.deleted_at IS NULL
LEFT JOIN id_codes ids ON ids.product_master_id = pm.id
WHERE pm.regulatory_type = 'DRUG'
  AND (
    COALESCE(ids.korea_drug_code, '') IS DISTINCT FROM COALESCE(pde.drug_code, '')
    OR COALESCE(ids.mfds_code, '') IS DISTINCT FROM COALESCE(pde.mfds_code, '')
    OR COALESCE(ids.insurance_code, '') IS DISTINCT FROM COALESCE(pde.insurance_code, '')
    OR COALESCE(ids.atc_code, '') IS DISTINCT FROM COALESCE(pde.atc_code, '')
  )
LIMIT 50;
```

### 2.8 RepresentativeProduct 연결률

```sql
SELECT
  COUNT(*) AS drug_masters,
  COUNT(*) FILTER (WHERE representative_product_id IS NOT NULL) AS with_representative_product,
  COUNT(*) FILTER (WHERE representative_product_id IS NULL) AS without_representative_product
FROM product_masters
WHERE regulatory_type = 'DRUG';
```

### 2.9 RepresentativeProduct anchorType/groupType 현황

```sql
SELECT
  COALESCE(metadata->>'anchorType', metadata->>'groupType', '(none)') AS representative_anchor_type,
  COUNT(*) AS total
FROM representative_products
GROUP BY 1
ORDER BY total DESC;
```

### 2.10 MFDS_CODE별 master/제조사 분포

```sql
WITH mfds_links AS (
  SELECT
    pi.normalized_value AS mfds_code,
    pm.id AS master_id,
    pm.manufacturer_name
  FROM product_identifiers pi
  JOIN product_masters pm ON pm.id = pi.product_master_id
  WHERE pi.deleted_at IS NULL
    AND pi.identifier_type = 'MFDS_CODE'
    AND pm.regulatory_type = 'DRUG'
)
SELECT
  COUNT(*) AS mfds_code_groups,
  COUNT(*) FILTER (WHERE master_count = 1) AS groups_with_1_master,
  COUNT(*) FILTER (WHERE master_count > 1) AS groups_with_multi_master,
  COUNT(*) FILTER (WHERE manufacturer_count = 1) AS groups_with_1_manufacturer,
  COUNT(*) FILTER (WHERE manufacturer_count > 1) AS groups_with_multi_manufacturer,
  MAX(master_count) AS max_masters_per_mfds_code,
  MAX(manufacturer_count) AS max_manufacturers_per_mfds_code
FROM (
  SELECT
    mfds_code,
    COUNT(DISTINCT master_id) AS master_count,
    COUNT(DISTINCT manufacturer_name) AS manufacturer_count
  FROM mfds_links
  GROUP BY mfds_code
) grouped;
```

### 2.11 MFDS_CODE 제조사 혼입 샘플

```sql
WITH mfds_grouped AS (
  SELECT
    pi.normalized_value AS mfds_code,
    COUNT(DISTINCT pm.id) AS master_count,
    COUNT(DISTINCT pm.manufacturer_name) AS manufacturer_count,
    ARRAY_AGG(DISTINCT pm.manufacturer_name ORDER BY pm.manufacturer_name) AS manufacturers,
    ARRAY_AGG(DISTINCT pm.name ORDER BY pm.name) AS sample_names
  FROM product_identifiers pi
  JOIN product_masters pm ON pm.id = pi.product_master_id
  WHERE pi.deleted_at IS NULL
    AND pi.identifier_type = 'MFDS_CODE'
    AND pm.regulatory_type = 'DRUG'
  GROUP BY pi.normalized_value
)
SELECT *
FROM mfds_grouped
WHERE manufacturer_count > 1
ORDER BY manufacturer_count DESC, master_count DESC
LIMIT 50;
```

### 2.12 SharedProductDescription 생성률

```sql
SELECT
  COUNT(pm.id) AS drug_masters,
  COUNT(DISTINCT spd.master_id) FILTER (WHERE spd.deleted_at IS NULL) AS masters_with_any_description,
  COUNT(DISTINCT spd.master_id) FILTER (WHERE spd.deleted_at IS NULL AND spd.status = 'canonical') AS masters_with_canonical_description,
  COUNT(spd.id) FILTER (WHERE spd.deleted_at IS NULL) AS total_descriptions,
  COUNT(spd.id) FILTER (WHERE spd.deleted_at IS NULL AND spd.source_type = 'mfds_easy_drug') AS mfds_easy_drug_descriptions,
  COUNT(spd.id) FILTER (WHERE spd.deleted_at IS NULL AND spd.source_type = 'drug_extension') AS drug_extension_descriptions
FROM product_masters pm
LEFT JOIN shared_product_descriptions spd ON spd.master_id = pm.id
WHERE pm.regulatory_type = 'DRUG';
```

---

## 3. 결과 기록 양식

| 항목 | 결과 |
| --- | --- |
| 실행일시 |  |
| 실행자/채널 |  |
| DB write 여부 | 0 |
| DRUG ProductMaster 수 |  |
| `rx` 수 |  |
| `otc` 수 |  |
| `drug_unspecified` 수 |  |
| `KOREA_DRUG_CODE` identifier 수 |  |
| `MFDS_CODE` identifier 수 |  |
| `KOREA_INSURANCE_CODE` identifier 수 |  |
| `ATC_CODE` identifier 수 |  |
| ProductDrugExtension 생성률 |  |
| RepresentativeProduct 연결률 |  |
| SharedProductDescription 생성률 |  |
| MFDS_CODE multi-manufacturer group 수 |  |
| CHECK-A 결론 |  |

---

## 4. 다음 판단

CHECK-A 결과로 결정할 것:

1. 의약품 apply WO를 갱신할지, 완료 처리할지, 복구/재검증 WO가 필요한지
2. `RepresentativeProduct` grouping key를 `MFDS_CODE` 단독으로 둘 수 있는 범위
3. 다제조사 혼입 케이스의 처리 방식
4. `ProductDrugExtension` mirror 생성/정합성 보정이 필요한지
5. `SharedProductDescription` 파생이 이미 되었는지, 후속 설명 WO가 필요한지
