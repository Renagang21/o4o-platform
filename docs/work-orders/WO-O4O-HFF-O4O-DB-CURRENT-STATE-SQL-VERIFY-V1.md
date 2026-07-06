# WO-O4O-HFF-O4O-DB-CURRENT-STATE-SQL-VERIFY-V1

## 1. 목표

건강기능식품(HFF) 식약처 원천 데이터가 현재 O4O 상품 DB에 어디까지 적용되어 있는지 **프로덕션 DB 기준으로 read-only 실측**한다.

이번 작업은 `CHECK-O4O-HFF-O4O-DB-CURRENT-STATE-V1.md`의 PARTIAL 상태를 COMPLETE로 만드는 작업이다.

핵심 목표:

1. 건강기능식품 `ProductCandidate` 실제 수 확인
2. `source_label = 'MFDS_HEALTH_FUNCTIONAL_FOOD'`가 실제 운영 DB 기준인지 확인
3. candidate `status` / `match_status` / `source_type` 분포 확인
4. `STTEMNT_NO`와 rawPayload 주요 필드가 어디에 어떻게 보존되어 있는지 실측
5. 건강기능식품 `ProductMaster` 승격 여부 확인
6. 건강기능식품 관련 `ProductIdentifier` type 존재 여부 확인
7. admin.neture.co.kr의 O4O 상품 DB 화면에서 현재 확인 가능한 범위와 부족한 UI를 정리
8. 다음 단계가 `parser dry-run`, `candidate import 복구`, `admin filter 보강`, `ProductMaster subset dry-run` 중 무엇인지 결정

이번 작업은 **조사/검증 전용**이다.

---

## 2. 기준 문서

작업자는 먼저 아래 문서를 읽는다.

필수:

- `docs/checks/CHECK-O4O-HFF-O4O-DB-CURRENT-STATE-V1.md`
- `docs/work-orders/WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-SEED-GATE0-CHECK-V1.md`
- `docs/work-orders/WO-O4O-HEALTH-FUNCTIONAL-FOOD-OFFICIAL-TEXT-PARSER-DRYRUN-V1.md`
- `docs/investigations/IR-O4O-MFDS-PUBLIC-PRODUCT-DATA-PIPELINE-STATUS-AUDIT-V1.md`
- `docs/investigations/PROPOSAL-O4O-PRODUCT-STRUCTURE-REFINEMENT-FOR-MFDS-PUBLIC-DATA-V1.md`
- `docs/handoffs/HANDOFF-O4O-ADMIN-PRODUCT-MANAGEMENT-CURRENT-STATE-V1.md`

기준 판단:

- `STTEMNT_NO`는 SKU/barcode가 아니다.
- `ProductMaster` 전량 승격은 금지한다.
- 건강기능식품 상세설명서 생성은 이번 작업 범위가 아니다.
- 식약처 원문은 소비자 직접 노출용이 아니라 source material이다.
- 원문 텍스트는 `raw_payload`에 보존하고, 매장용 설명/AI 정리는 별도 검수 단계에서 진행한다.

---

## 3. 작업 범위

### 3.1 포함

- 프로덕션 DB read-only SQL 실행
- HFF candidate 수와 분포 실측
- HFF rawPayload 주요 필드 커버리지 실측
- ProductMaster HFF 존재 여부 확인
- ProductIdentifier HFF 관련 type 존재 여부 확인
- RepresentativeProduct HFF anchor 존재 여부 확인
- admin.neture.co.kr read-only 화면 확인
- CHECK 문서 COMPLETE 갱신 또는 신규 CHECK 결과 문서 작성

### 3.2 제외

- DB insert/update/delete
- migration 작성
- 코드 변경
- 배포
- ProductMaster 생성
- ProductIdentifier 생성
- RepresentativeProduct 생성
- ProductHealthFunctionalFoodExtension 생성
- SharedProductDescription 생성
- AI 설명 생성
- 건강기능식품 상세설명서 생성
- 매장 QR/POP/태블릿 연결

---

## 4. 실행 전 주의

현재 저장소에는 다른 세션/작업자의 미커밋 변경이 있을 수 있다.

작업 규칙:

1. 기존 미커밋 변경을 되돌리지 않는다.
2. 이번 작업은 문서만 생성/갱신한다.
3. SQL은 반드시 read-only로 실행한다.
4. 운영 DB 쓰기 권한이 있더라도 이번 작업에서는 쓰기 쿼리를 실행하지 않는다.
5. SQL 결과에 rawPayload 전문을 대량 저장하지 않는다.
6. secret, DB 접속 문자열, service key, token을 문서에 남기지 않는다.

---

## 5. 필수 실측 SQL

아래 SQL은 `CHECK-O4O-HFF-O4O-DB-CURRENT-STATE-V1.md`의 §9를 기준으로 한다. 운영 DB SQL Editor, read-only DB 접속, 또는 승인된 운영 점검 환경에서 실행한다.

### 5.1 테이블/컬럼 확인

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'product_candidates',
    'product_masters',
    'product_identifiers',
    'representative_products',
    'shared_product_descriptions'
  )
ORDER BY table_name, ordinal_position;
```

### 5.2 HFF 후보 source 탐색

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
    source_label ILIKE '%HEALTH%'
    OR source_label ILIKE '%HFF%'
    OR source_label ILIKE '%FUNCTIONAL%'
    OR source_label ILIKE '%건강기능%'
    OR raw_payload::text ILIKE '%STTEMNT_NO%'
    OR raw_payload::text ILIKE '%MAIN_FNCTN%'
    OR raw_payload::text ILIKE '%건강기능식품%'
  )
GROUP BY source_type, source_label, candidate_status, match_status
ORDER BY count DESC;
```

### 5.3 기존 기준 source_label 정밀 집계

```sql
SELECT
  COUNT(*)::int AS total,
  COUNT(*) FILTER (WHERE raw_payload IS NOT NULL)::int AS raw_payload_present,
  COUNT(DISTINCT normalized_identifier_value)::int AS distinct_normalized_identifier,
  COUNT(DISTINCT raw_payload->>'STTEMNT_NO')::int AS distinct_raw_sttemnt_no
FROM product_candidates
WHERE deleted_at IS NULL
  AND source_label = 'MFDS_HEALTH_FUNCTIONAL_FOOD';
```

### 5.4 상태 분포

```sql
SELECT candidate_status, COUNT(*)::int AS count
FROM product_candidates
WHERE deleted_at IS NULL
  AND source_label = 'MFDS_HEALTH_FUNCTIONAL_FOOD'
GROUP BY candidate_status
ORDER BY count DESC;

SELECT match_status, COUNT(*)::int AS count
FROM product_candidates
WHERE deleted_at IS NULL
  AND source_label = 'MFDS_HEALTH_FUNCTIONAL_FOOD'
GROUP BY match_status
ORDER BY count DESC;

SELECT source_type, COUNT(*)::int AS count
FROM product_candidates
WHERE deleted_at IS NULL
  AND source_label = 'MFDS_HEALTH_FUNCTIONAL_FOOD'
GROUP BY source_type
ORDER BY count DESC;
```

### 5.5 rawPayload 주요 필드 커버리지

```sql
SELECT
  COUNT(*)::int AS total,
  COUNT(*) FILTER (WHERE raw_payload IS NOT NULL)::int AS raw_payload_present,
  COUNT(*) FILTER (WHERE NULLIF(BTRIM(raw_payload->>'STTEMNT_NO'), '') IS NOT NULL)::int AS sttemnt_no_present,
  COUNT(*) FILTER (WHERE NULLIF(BTRIM(raw_payload->>'PRDLST_NM'), '') IS NOT NULL)::int AS product_name_present,
  COUNT(*) FILTER (WHERE NULLIF(BTRIM(raw_payload->>'BSSH_NM'), '') IS NOT NULL)::int AS business_name_present,
  COUNT(*) FILTER (WHERE NULLIF(BTRIM(raw_payload->>'MAIN_FNCTN'), '') IS NOT NULL)::int AS main_fnctn_present,
  COUNT(*) FILTER (WHERE NULLIF(BTRIM(raw_payload->>'SRV_USE'), '') IS NOT NULL)::int AS srv_use_present,
  COUNT(*) FILTER (WHERE NULLIF(BTRIM(raw_payload->>'INTAKE_HINT1'), '') IS NOT NULL)::int AS intake_hint1_present,
  COUNT(*) FILTER (WHERE NULLIF(BTRIM(raw_payload->>'PRSRV_PD'), '') IS NOT NULL)::int AS prsrv_pd_present,
  COUNT(*) FILTER (WHERE NULLIF(BTRIM(raw_payload->>'SUNGSANG'), '') IS NOT NULL)::int AS sungsang_present,
  COUNT(*) FILTER (WHERE NULLIF(BTRIM(raw_payload->>'BASE_STANDARD'), '') IS NOT NULL)::int AS base_standard_present
FROM product_candidates
WHERE deleted_at IS NULL
  AND source_label = 'MFDS_HEALTH_FUNCTIONAL_FOOD';
```

### 5.6 rawPayload key 목록

```sql
SELECT key, COUNT(*)::int AS rows_with_key
FROM product_candidates pc
CROSS JOIN LATERAL jsonb_object_keys(pc.raw_payload) AS key
WHERE pc.deleted_at IS NULL
  AND pc.source_label = 'MFDS_HEALTH_FUNCTIONAL_FOOD'
  AND pc.raw_payload IS NOT NULL
GROUP BY key
ORDER BY rows_with_key DESC, key
LIMIT 100;
```

### 5.7 ProductMaster HFF 존재 여부

```sql
SELECT
  regulatory_type,
  COUNT(*)::int AS count
FROM product_masters
GROUP BY regulatory_type
ORDER BY count DESC;

SELECT
  regulatory_type,
  COUNT(*)::int AS count
FROM product_masters
WHERE regulatory_type ILIKE '%HEALTH%'
   OR regulatory_type ILIKE '%FUNCTIONAL%'
   OR regulatory_type ILIKE '%HFF%'
   OR regulatory_type ILIKE '%건강기능%'
GROUP BY regulatory_type
ORDER BY count DESC;
```

### 5.8 ProductIdentifier HFF 관련 type 확인

```sql
SELECT
  identifier_type,
  COUNT(*)::int AS count,
  COUNT(DISTINCT product_master_id)::int AS distinct_masters,
  COUNT(DISTINCT normalized_value)::int AS distinct_values
FROM product_identifiers
WHERE deleted_at IS NULL
GROUP BY identifier_type
ORDER BY count DESC;

SELECT
  identifier_type,
  COUNT(*)::int AS count
FROM product_identifiers
WHERE deleted_at IS NULL
  AND (
    identifier_type ILIKE '%STTEMNT%'
    OR identifier_type ILIKE '%HEALTH%'
    OR identifier_type ILIKE '%FUNCTIONAL%'
    OR identifier_type ILIKE '%HFF%'
  )
GROUP BY identifier_type
ORDER BY count DESC;
```

### 5.9 RepresentativeProduct HFF anchor 확인

```sql
SELECT
  metadata->>'anchorType' AS anchor_type,
  metadata->>'sourceLabel' AS source_label,
  COUNT(*)::int AS count
FROM representative_products
WHERE metadata IS NOT NULL
  AND (
    metadata->>'anchorType' ILIKE '%hff%'
    OR metadata->>'anchorType' ILIKE '%health%'
    OR metadata->>'sourceLabel' ILIKE '%HEALTH%'
    OR metadata::text ILIKE '%STTEMNT_NO%'
  )
GROUP BY metadata->>'anchorType', metadata->>'sourceLabel'
ORDER BY count DESC;
```

### 5.10 샘플 20건

```sql
SELECT
  id,
  candidate_name,
  candidate_manufacturer,
  candidate_category,
  identifier_type,
  identifier_value,
  normalized_identifier_value,
  candidate_status,
  match_status,
  raw_payload->>'STTEMNT_NO' AS sttemnt_no,
  raw_payload->>'PRDLST_NM' AS raw_product_name,
  raw_payload->>'BSSH_NM' AS raw_business_name,
  LEFT(COALESCE(raw_payload->>'MAIN_FNCTN', ''), 200) AS main_fnctn_sample,
  created_at
FROM product_candidates
WHERE deleted_at IS NULL
  AND source_label = 'MFDS_HEALTH_FUNCTIONAL_FOOD'
ORDER BY created_at DESC
LIMIT 20;
```

---

## 6. admin.neture.co.kr 확인

운영 admin에서 read-only로 확인한다.

확인 화면:

- `admin.neture.co.kr` > O4O 상품 DB > 현황
- O4O 상품 DB > 공공데이터 후보
- O4O 상품 DB > 공공데이터 후보 상세
- O4O 상품 DB > 기본 상품
- O4O 상품 DB > 기본 상품 상세

확인 항목:

| 항목 | 기대/기록 |
|---|---|
| 후보 목록 총량 | SQL 결과와 큰 차이가 없는지 확인 |
| 후보 필터 | `sourceType=external_api` 또는 실제 HFF sourceType으로 좁힐 수 있는지 확인 |
| sourceLabel 표시 | `MFDS_HEALTH_FUNCTIONAL_FOOD`가 목록에 표시되는지 확인 |
| 후보 상세 rawPayload | `STTEMNT_NO`, `MAIN_FNCTN`, `SRV_USE`, `INTAKE_HINT1` 등이 보이는지 확인 |
| 기본 상품 검색 | HFF ProductMaster가 있다면 검색 가능한지 확인 |
| mutation | 상품 DB 관련 POST/PUT/PATCH/DELETE가 없는지 확인 |

주의:

- 현재 UI에는 `sourceLabel` 필터가 없을 가능성이 높다.
- HFF 후보가 많아도 목록에서 직접 찾기 어렵다면 API/SQL 결과를 기준으로 UI 부족 사항을 기록한다.

---

## 7. 판정 기준

### 7.1 HFF 후보 존재 판정

| 결과 | 판정 |
|---|---|
| `source_label = MFDS_HEALTH_FUNCTIONAL_FOOD`가 약 44,885건 전후 | 기존 문서 흐름과 일치. parser dry-run 가능 |
| HFF 후보가 있으나 source_label이 다름 | 실제 source_label 기준으로 문서 갱신 필요 |
| HFF 후보가 거의 없음 | import 상태 복구 또는 source 재수집 CHECK 필요 |

### 7.2 ProductMaster 승격 판정

| 결과 | 판정 |
|---|---|
| HFF ProductMaster 0건 | HOLD 유지. candidate/rawPayload 중심 |
| HFF ProductMaster 일부 존재 | 해당 subset의 생성 경로/identifier/barcode audit 필요 |
| HFF ProductMaster 대량 존재 | `STTEMNT_NO`를 SKU처럼 승격했는지 긴급 audit 필요 |

### 7.3 rawPayload parser 가능성

| 결과 | 판정 |
|---|---|
| `MAIN_FNCTN`, `STTEMNT_NO`, 제품명/업체명 커버리지 높음 | official text parser dry-run 진행 |
| `INTAKE_HINT1`, `SRV_USE`, `PRSRV_PD` 일부 결측 | parser에서 optional section 처리 |
| 핵심 필드 결측/형식 불안정 | import mapper/source 확인부터 진행 |

---

## 8. 산출물

다음 중 하나를 작성한다.

권장:

```text
docs/checks/CHECK-O4O-HFF-O4O-DB-CURRENT-STATE-SQL-VERIFY-V1.md
```

또는 기존 문서 갱신:

```text
docs/checks/CHECK-O4O-HFF-O4O-DB-CURRENT-STATE-V1.md
```

산출물 필수 섹션:

1. 결론 요약
2. 실행 환경과 DB 접속 방식(비밀값 제외)
3. HFF candidate 총수
4. source_type / source_label / candidate_status / match_status 분포
5. `STTEMNT_NO` 저장 위치와 distinct 수
6. rawPayload 주요 필드 커버리지
7. ProductMaster HFF 존재 여부
8. ProductIdentifier HFF 관련 type 존재 여부
9. RepresentativeProduct HFF anchor 존재 여부
10. admin 화면 확인 결과
11. ProductMaster 승격 가능성 판단
12. 다음 작업 추천
13. DB write 0 / 코드 변경 0 확인

---

## 9. 성공 기준

이 작업은 아래를 만족하면 완료다.

| 기준 | 완료 조건 |
|---|---|
| read-only 실측 | 운영 DB 기준 HFF candidate/master/identifier 상태가 숫자로 기록됨 |
| rawPayload 확인 | `STTEMNT_NO`, `MAIN_FNCTN`, `SRV_USE`, `INTAKE_HINT1`, `PRSRV_PD`, `SUNGSANG`, `BASE_STANDARD` 커버리지 기록 |
| ProductMaster 판단 | 전량 승격 금지/HOLD/가능 subset 여부가 명확히 정리됨 |
| admin 확인 | 현재 UI에서 보이는 범위와 부족한 필터/상세 항목이 정리됨 |
| mutation 없음 | DB write 0, 코드 변경 0 |
| 후속 작업 결정 | parser dry-run, import 복구, admin filter 보강 중 다음 작업이 좁혀짐 |

---

## 10. 후속 작업 후보

결과에 따라 다음 WO를 선택한다.

| 조건 | 후속 WO |
|---|---|
| HFF 후보와 rawPayload가 정상 | `WO-O4O-HFF-RAWPAYLOAD-PARSER-DRYRUN-V1` |
| HFF 후보 source가 불명확하거나 누락 | `WO-O4O-HFF-CANDIDATE-IMPORT-STATE-RECOVERY-V1` |
| admin에서 HFF 후보 확인이 어려움 | `WO-O4O-ADMIN-O4O-PRODUCT-CANDIDATE-SOURCELABEL-FILTER-V1` |
| 일부 HFF ProductMaster가 이미 존재 | `WO-O4O-HFF-PRODUCTMASTER-SUBSET-AUDIT-V1` |
| master-less 앵커가 필요하다고 확정 | `WO-O4O-HFF-REPRESENTATIVE-ANCHOR-DESIGN-V1` |

---

## 11. 금지 사항 재확인

이번 WO에서 하지 않는다.

- 건강기능식품 상세설명서 생성
- AI 소비자 문구 생성
- 원문 소비자 직접 공개
- `STTEMNT_NO`를 SKU/barcode로 취급
- ProductMaster 대량 승격
- ProductIdentifier 대량 생성
- Extension 선생성
- SharedProductDescription 저장
- 매장별 설명 저장
- QR/POP/태블릿 연결

