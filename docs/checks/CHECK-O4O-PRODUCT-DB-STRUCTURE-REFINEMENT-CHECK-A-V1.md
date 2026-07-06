# CHECK-O4O-PRODUCT-DB-STRUCTURE-REFINEMENT-CHECK-A-V1

Status: DONE — 실측 완료 (2026-07-06, read-only). 결과·해석 §3-§4 반영
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

## 3. 실측 결과 (2026-07-06)

| 항목 | 결과 |
| --- | --- |
| 실행일시 | 2026-07-06 ~11:53 KST |
| 실행자/채널 | Claude Code · cloud-sql-proxy(127.0.0.1:15432) + psql read-only |
| DB write 여부 | **0** (전부 SELECT) |
| DRUG ProductMaster 수 | **177,413** |
| `rx` 수 | 119,548 |
| `otc` 수 | 57,572 |
| `drug_unspecified` 수 | **293** (잔여) / `drug_category` NULL 0 |
| `KOREA_DRUG_CODE` identifier 수 | 177,413 (연결률 **100%**) |
| `MFDS_CODE` identifier 수 | 177,413 (연결률 **100%**) |
| `KOREA_INSURANCE_CODE` identifier 수 | 64,692 (36%) |
| `ATC_CODE` identifier 수 | 176,962 (99.7%) |
| ProductDrugExtension 생성률 | **0 / 177,413 (0%)** — 전무 |
| RepresentativeProduct 연결률 | **177,413 / 177,413 (100%)** — 이미 그룹핑 완료 |
| SharedProductDescription 생성률 | 19,431 master (11%), canonical 15,962, 전량 `mfds_easy_drug`, `drug_extension` 0 |
| MFDS_CODE 그룹 수 | 48,101 |
| MFDS_CODE multi-manufacturer group 수 | **4,899 / 48,101 (10.2%)** (max 6 제조사, max 487 master/그룹) |
| candidate 승격 상태 | approved_new_master 229,841 + matched 1,000 + pending(cancel) 74,681 |

### 3.1 대표상품(RepresentativeProduct) 실태 — 이미 적용됨

- 총 `representative_products` = **64,672**. 그중 DRUG 연결 rep = **48,101**, **member 0개 orphan rep = 16,571**.
- 그룹핑 근거(metadata): `source='WO-O4O-DRUG-REPRESENTATIVE-PRODUCT-GROUPING-V1'`, `groupKey='MFDS_CODE:{n}'`, `reviewFlags.multiManufacturer/multiName/duplicateDisplayName`, `memberMasterCount`.
- **그룹핑 키 = `MFDS_CODE` 단독** (rep당 distinct MFDS_CODE = 1, 전건). 제조사 분리는 하지 않았고, 다제조사 4,899건은 **`reviewFlags.multiManufacturer=true`로 표시만** 되어 있음(침묵 병합 아님).
- orphan rep 16,571 = drug_unspecified master 53,428 삭제(commit 3914b5400)로 member를 잃은 대표상품 잔재로 추정.

### 3.2 핵심 해석

- **Gate B는 부분 적용이 아니라 사실상 완료.** 230,841 승격(approved_new 229,841 + matched 1,000) → drug_unspecified 53,428 삭제 → 현재 177,413. (230,841 − 53,428 = 177,413, 정확히 일치)
- **Identifier 계층은 100% 건강.** KOREA_DRUG_CODE/MFDS_CODE 결측 0.
- **대표상품 그룹핑도 이미 완료(MFDS_CODE 키).** 제안서의 "grouping apply 실측 전 금지"는 이미 무의미 — 이미 라이브.
- **ProductDrugExtension은 전무(0).** 코드 이중저장 divergence는 아직 물리적으로 존재하지 않음(mirror 미생성).
- **설명(SharedProductDescription)은 11%만, 전량 e약은요.** drug_extension 소스 0.

---

## 4. 다음 판단 (실측 반영)

1. **의약품 apply WO** — 신규 apply 불필요. Gate B 완료 + drug_unspecified 정제 완료. `WO-O4O-DRUG-O4O-DB-APPLY-HANDOFF-V1`은 **"완료 처리(HOLD 해제 불요)"**로 종결하고, 잔여 293 drug_unspecified 처리만 별도 판단.
2. **결정 2(그룹핑 키)** — 이미 `MFDS_CODE` 단독으로 적용됨. 개방 이슈는 "키 선택"이 아니라 **"multiManufacturer 10.2%(4,899)를 그대로 둘지 재분할할지"** 의 refinement. reviewFlags로 이미 격리돼 있어 긴급도 낮음.
3. **결정 4(anchorType)** — drug rep은 이미 `metadata.groupKey='MFDS_CODE:*'`/`source`로 식별 가능. HFF는 다른 groupKey/source면 충돌 없음. anchorType 신설은 정합성 개선이지 필수 아님. **단 orphan rep 16,571 정리 필요 여부는 별도 판단.**
4. **결정 1(코드 SSOT)** — ProductDrugExtension 0개라 divergence 없음. Extension 생성 WO에서 정책으로만 명문화.
5. **설명 파생** — e약은요 19,431건 이미 파생. 나머지 89%는 미파생. 후속 설명 WO 필요.

### 새로 드러난 후속 작업

- **orphan RepresentativeProduct 16,571** (drug_unspecified 삭제 잔재) 정리 여부 판단 WO.
- **ProductDrugExtension 전무** — 의약품 표시/정책 계층 미존재. 매장 설명서/노출 단계 전 mirror 생성 필요.
- **drug_unspecified 잔여 293** 후처리.
