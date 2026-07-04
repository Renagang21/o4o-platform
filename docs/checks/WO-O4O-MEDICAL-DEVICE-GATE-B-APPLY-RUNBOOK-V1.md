# WO-O4O-MEDICAL-DEVICE-GATE-B-APPLY-RUNBOOK-V1

> 작업 성격: **Gate B ProductMaster/ProductIdentifier 승격 apply runbook (문서 전용).** apply 미실행, ProductMaster/ProductIdentifier 생성 0, DB write 0, migration 0, Cloud Run Job 0. 산출물 = 본 문서 1개.
> 작성일: 2026-07-05
> 기준 저장소: `C:\Users\sohae\o4o-platform` (집 PC). Linux `/workspace` 무시.
> 선행: `WO-O4O-MEDICAL-DEVICE-GTIN-UDI-PROMOTION-DRYRUN-GATE-B-V1`, `WO-O4O-MEDICAL-DEVICE-GATE-B-DB-COLLISION-CHECK-V1`, `WO-O4O-MEDICAL-DEVICE-PERMIT-STATUS-CODE-TABLE-AND-JOIN-COVERAGE-V1`, `WO-O4O-MEDICAL-DEVICE-UDI-DI-IDENTIFIER-TYPE-IMPLEMENTATION-V1`, `CHECK-O4O-MEDICAL-DEVICE-PUBLIC-CANDIDATE-APPLY-RESULT-V1`
> **승인 게이트: 사용자가 명시적으로 "의료기기 Gate B apply 승인" 이라고 말하기 전 apply 실행 금지.**

---

## 1. Gate B 의미

```text
Gate B apply = ProductCandidate 중 안전 후보만 ProductMaster/ProductIdentifier 로 승격하는 작업.
Gate A 완료(적재)와 별개이며, 사용자 명시 승인 없이는 실행 금지.
이번 문서는 runbook 이며 apply 미실행.
```

Gate A(적재)는 완료됐다(`product_candidates` +19,996, ProductMaster/Identifier 불변). Gate B 는 그 후보 중 승격 조건을 모두 통과한 행만 **Core 계층(ProductMaster + ProductIdentifier)** 으로 올린다.

> ⚠️ ProductMaster/ProductIdentifier 는 **Core 동결 정책(CLAUDE.md §3)** 및 barcode UNIQUE 제약이 걸린 SSOT 계층이다. Gate B 는 되돌리기 어려운 write 이므로 batch/sourceLabel/sourceKind/sourceId 추적이 필수다.

---

## 2. 대상 범위

```text
sourceType='external_api'
sourceLabel='MFDS_MEDICAL_DEVICE_STANDARD_CODE'
sourceKind='medical_device_standard_code'
deleted_at IS NULL
Gate A applied candidates = 19,996
```

승격 대상은 **전체 19,996 이 아니라** 아래 조건을 모두 통과한 행이다:

| # | 조건 | 근거 |
|---|---|---|
| 1 | `identifier_type='GTIN'` | 숫자 GTIN 만 barcode 승격 (D2/D3) |
| 2 | UDIDI_CD 숫자 13/14 | GTIN 형식 |
| 3 | GTIN check-digit pass | `utils/gtin.ts:isValidGtin` (표본 전량 pass) |
| 4 | `UDI_DI_DUP_CONFLICT` 아님 (`match_status != 'conflict'`) | barcode UNIQUE — 충돌행 자동 승격 불가 |
| 5 | PERMIT_NO 가 허가 데이터셋에 존재 | orphan 보류 |
| 6 | `RTRCN_DSCTN_DIVS_CD IS NULL` (active) | inactive 제외 |
| 7 | 필수 표시 필드 존재 (name + manufacturer) | ProductMaster NOT NULL |
| 8 | DB barcode/identifier 충돌 없음 | collision check 0 |

기대값 (표본 20,000 기준, 선행 dry-run):

```text
PROMOTABLE_AFTER_DB_CHECK = 19,606 rows
distinct barcode(=ProductMaster 예상 수) = 19,602
```

> 주: 조건 4·5·6 은 Gate A candidate 에 이미 반영/표시돼 있으나(match_status=conflict, reviewFlags), **조건 6(active)은 candidate 가 `STATUS_UNCHECKED`(status 미조인)** 이므로 Gate B 승격 시점에 status map 을 조인해 재판정해야 한다(§3).

---

## 3. status map 조인 (Gate B 승격 필수)

Gate A importer 는 허가 상태를 조인하지 않았다(전건 `STATUS_UNCHECKED`, `rawPayload.statusJoined=false`). Gate B 는 active 판정을 위해 status map 을 조인한다.

허가 정보 endpoint:
```text
https://apis.data.go.kr/1471000/MdlpPrdlstPrmisnInfoService05/getMdlpPrdlstPrmisnList04
요청 필터: prductPrmisnNo (camelCase — 출력 PRDUCT_PRMISN_NO 와 이름 다름)
```

join key:
```text
ProductCandidate.rawPayload.permitNo  (= rawPayload.source.PERMIT_NO)
= 허가 API 출력 PRDUCT_PRMISN_NO   (문자열 exact match, 정규화 불필요)
```

active 판정:
```text
active   := RTRCN_DSCTN_DIVS_CD IS NULL
inactive := RTRCN_DSCTN_DIVS_CD IS NOT NULL   (취하/폐지, 승격 제외)
```

주의:
```text
PRMISN_STTEMNT 는 lifecycle 판별자로 쓰지 않는다.
코드 1/2/4 가 active 제품에 모두 공존하므로 Gate B active 조건에 단독 사용 금지.
(선행 WO-...-PERMIT-STATUS-CODE-TABLE-AND-JOIN-COVERAGE-V1 §3)
```

status map 신선도: Gate A(2026-07-04) 이후 status 가 바뀔 수 있으므로 Gate B apply 직전 status map 재생성(distinct PERMIT_NO targeted lookup) 또는 신선도 확인. 표본 distinct PERMIT_NO = 786.

---

## 4. ProductMaster 매핑

숫자형 GTIN 승격 후보만 대상. **ProductMaster NOT NULL 컬럼**(entity/migration 확인): `barcode, regulatory_type, regulatory_name, name, manufacturer_name, mfds_product_id`.

| ProductMaster 컬럼 | 매핑 | 비고 |
|---|---|---|
| `barcode` (NOT NULL, UNIQUE, varchar14) | `UDIDI_CD` (원형) | **GTIN-13 zero-pad 금지.** HIBCC 금지 |
| `regulatory_type` (NOT NULL) | `MEDICAL_DEVICE` | **기존 union/정책 값 확인 후 사용** |
| `regulatory_name` (NOT NULL) | `PRDLST_NM` | 공식 품목명 |
| `name` (NOT NULL) | `PRDLST_NM` 우선, 없으면 `PRDT_NM_INFO` | |
| `manufacturer_name` (NOT NULL) | `MNFT_IPRT_ENTP_NM` | 결측 6건은 조건7에서 이미 제외 |
| `mfds_product_id` (NOT NULL, varchar100) | `MFDS:MEDICAL_DEVICE:{UDIDI_CD}` | 길이 100 내 |
| `mfds_permit_number` (nullable) | `PERMIT_NO` | 승격 시 권장 |
| `specification` (nullable) | `FOML_INFO` (모델/형명) | |
| `is_mfds_verified` | `true` | MFDS 직접 출처 |
| `drug_category` | null | 비의약품 |

주의:
```text
GTIN-13 은 zero-pad 하지 않는다 (barcode 컬럼이 8/12/13/14 허용).
HIBCC 는 ProductMaster.barcode 로 승격하지 않는다.
UDIDI_CD 충돌행(match_status=conflict)은 ProductMaster 생성 금지.
동일 barcode 재삽입은 UNIQUE 위반 → 승격 전 존재 여부 확인(idempotency).
```

---

## 5. ProductIdentifier 매핑

승격된 ProductMaster 1건당 identifier 2건(GTIN primary + UDI_DI 맥락):

```text
GTIN (primary, barcode mirror):
- product_master_id = 승격된 master id
- identifier_type = 'GTIN'
- identifier_value = UDIDI_CD (원형)
- normalized_value = normalizeIdentifier('GTIN', UDIDI_CD)  (숫자)
- is_primary = true
- verification_status = 'imported'
- source_type = 'medical_device_standard_code_promotion' (또는 규약값)
- source_label = 'MFDS_MEDICAL_DEVICE_STANDARD_CODE'

UDI_DI (맥락 보존):
- product_master_id = 동일 master id
- identifier_type = 'UDI_DI'
- identifier_value = UDIDI_CD (원형)
- normalized_value = normalizeIdentifier('UDI_DI', UDIDI_CD)  (원형 보존)
- is_primary = false
- verification_status = 'imported'
- metadata = { permitNo, model(FOML_INFO), sourceDatasetId '15073875', candidateId }
```

> partial unique = `(product_master_id, identifier_type, normalized_value, deleted_at IS NULL)`. 숫자형은 GTIN·UDI_DI 두 type 이 같은 normalized(숫자) 값을 가져도 type 이 달라 공존 가능.

HIBCC/non-GTIN 155건:
```text
ProductMaster 생성 금지.
ProductIdentifier 단독 생성도 Gate B 에서는 하지 않는다.
사유: ProductIdentifier 는 product_master_id(FK, NOT NULL) 필요 → Master 없는 HIBCC candidate 에 단독 생성 불가.
→ Candidate 에 UDI_DI 로 보존된 상태 유지(별도 후속 정책 시 재검토).
```

---

## 6. 보류 사유별 처리

| 보류 그룹 | 표본 수 | ProductMaster | 처리 |
|---|---:|---|---|
| HIBCC / non-GTIN | 155 | 미승격 | Candidate 유지(UDI_DI) |
| UDI_DI_DUP_CONFLICT | 244 (match_status=conflict) | 미승격 | conflict 유지 |
| PERMIT_NOT_FOUND | ~10 | 미승격 | 상태 미확인, 보류 |
| RTRCN non-null (inactive) | status map 조인 후 산출 | 미승격 | inactive |
| required field missing | 6 | 미승격 | 검토 필요 |
| DB barcode/identifier conflict | 0 (collision check) | 미승격 | 발견 시 |

> 보류 행은 Candidate 로 남는다(삭제하지 않음). Gate B 는 승격만, 보류행 상태는 review_note/reviewFlags 로 기록 가능.

---

## 7. 사전조건 (apply 직전)

| # | 항목 | 기대 |
|---|---|---|
| 1 | git clean / origin/main 최신 | `0 0` |
| 2 | Gate A apply result 문서 확인 | CHECK-...-CANDIDATE-APPLY-RESULT-V1 |
| 3 | ProductCandidate count snapshot | md_candidates 19,996 |
| 4 | ProductMaster count snapshot | 230,843 (기준선) |
| 5 | ProductIdentifier count snapshot | 703,483 (기준선) |
| 6 | status map 재생성/신선도 확인 | distinct PERMIT_NO 786 조인 |
| 7 | Gate B dry-run 재실행 | promotable/보류 수 산출 |
| 8 | DB collision check 재실행 | 충돌 0 재확인 |
| 9 | 백업/스냅샷 id 기록 | Cloud SQL 백업 id |
| 10 | 사용자 명시 승인 문구 확보 | 아래 |

승인 문구 예:
```text
의료기기 Gate B apply 승인.
범위는 sourceKind=medical_device_standard_code 표본 20,000 중 PROMOTABLE 후보로 한정.
ProductMaster/ProductIdentifier 생성 허용.
SupplierProductOffer/OrganizationProductListing/StoreLocalProduct 생성 금지.
Cloud Run Job 금지 또는 별도 승인.
```

---

## 8. 실행 명령 (예시 — 실제 실행 금지)

> **⚠️ 승격 스크립트 `medical-device-gate-b-promotion.ts` 는 아직 없다 → 후속 구현 WO 필요(§12-1).** 아래는 설계 예시.

예상 env gate:
```text
MEDICAL_DEVICE_GATE_B_ALLOW_APPLY=I_UNDERSTAND
```

예상 dry-run (read-only, status map 조인 + promotable/보류 산출):
```bash
npx tsx apps/api-server/src/scripts/medical-device-gate-b-promotion.ts --dry-run --use-db
```

예상 apply (ProductMaster+ProductIdentifier 승격, 단일 트랜잭션 배치):
```bash
MEDICAL_DEVICE_GATE_B_ALLOW_APPLY=I_UNDERSTAND \
npx tsx apps/api-server/src/scripts/medical-device-gate-b-promotion.ts --apply --use-db
```

채널: local + Cloud SQL Auth Proxy (`reference` = Gate A apply 와 동일). write=승격이므로 **사용자 승인 후에만.**

---

## 9. 검증 SQL (apply 전/후, read-only)

```sql
-- A. ProductMaster 증가 = 승격 수 (barcode 기준, 예상 ~19,602)
SELECT count(*) FROM product_masters WHERE mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%';

-- B. ProductIdentifier 증가 = 승격 수 * 2 (GTIN + UDI_DI, 예상 ~39,204)
SELECT identifier_type, count(*) FROM product_identifiers i
  JOIN product_masters m ON m.id = i.product_master_id
 WHERE m.mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%' AND i.deleted_at IS NULL
 GROUP BY identifier_type;

-- C. ProductMaster.barcode 중복 0 (UNIQUE 제약 확인)
SELECT barcode, count(*) FROM product_masters GROUP BY barcode HAVING count(*) > 1;

-- D. ProductIdentifier 중복 0 (per master+type+normalized)
SELECT product_master_id, identifier_type, normalized_value, count(*)
  FROM product_identifiers WHERE deleted_at IS NULL
 GROUP BY 1,2,3 HAVING count(*) > 1;

-- E. 승격된 candidate status 분포 (승격분 status → matched/approved_new_master 등)
SELECT candidate_status, match_status, count(*) FROM product_candidates
 WHERE source_label='MFDS_MEDICAL_DEVICE_STANDARD_CODE'
   AND raw_payload->>'sourceKind'='medical_device_standard_code' AND deleted_at IS NULL
 GROUP BY 1,2;

-- F. conflict candidate 가 승격되지 않았는지 (conflict → ProductMaster 없음)
SELECT count(*) FROM product_candidates c
 WHERE c.source_label='MFDS_MEDICAL_DEVICE_STANDARD_CODE'
   AND c.match_status='conflict'
   AND EXISTS (SELECT 1 FROM product_masters m WHERE m.barcode = c.identifier_value);
-- 기대 0

-- G. HIBCC 155 가 ProductMaster 로 승격되지 않았는지
SELECT count(*) FROM product_masters
 WHERE mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%' AND barcode !~ '^\d{13,14}$';
-- 기대 0

-- H. inactive/orphan/required-missing 보류 확인 (해당 barcode ProductMaster 없음)
--    (status map/보류 목록 기준, 승격 제외 재확인)

-- I. Offer/Listing/StoreLocalProduct 증가 0
SELECT (SELECT count(*) FROM supplier_product_offers) AS offers,
       (SELECT count(*) FROM organization_product_listings) AS listings,
       (SELECT count(*) FROM store_local_products) AS store_local;
-- apply 전후 불변

-- J. rollback 추적: 승격 batch 식별 (mfds_product_id prefix + created_at 범위 기록)
SELECT min(created_at), max(created_at), count(*)
  FROM product_masters WHERE mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%';
```

---

## 10. rollback

```text
Gate B rollback 은 Gate A rollback 보다 위험하다.
ProductMaster/ProductIdentifier 를 생성하므로 batch/sourceLabel/sourceKind/sourceId(mfds_product_id prefix) 기준 추적 필수.
```

rollback 전략(순서):
```text
1. 생성된 ProductIdentifier soft delete
   UPDATE product_identifiers SET deleted_at=NOW()
    WHERE product_master_id IN (SELECT id FROM product_masters WHERE mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%')
      AND deleted_at IS NULL;
2. 생성된 ProductMaster 삭제/soft delete (Core 삭제 정책 확인 — hard delete vs soft)
   DELETE FROM product_masters WHERE mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%';
   (offer/listing FK 없음 확인 후. ProductMaster 는 soft delete 컬럼 없음 → hard delete 또는 정책 확정 필요)
3. ProductCandidate status 원복 (matched/approved_new_master → pending)
4. ProductCandidate 자체는 삭제하지 않음 (Gate A 적재분 유지)
5. Offer/Listing/StoreLocalProduct 는 생성하지 않았으므로 rollback 대상 없음
```

> **미확정: ProductMaster soft delete 여부.** ProductMaster 엔티티에 `deleted_at` 이 없다(hard delete). rollback 시 hard delete 안전성(FK 참조 0 확인)은 승격 스크립트 구현 WO 에서 확정한다. 트랜잭션 단위 apply 로 실패 시 자동 rollback 이 1차 방어.

---

## 11. 금지 사항 (본 runbook 작성 WO)

| 항목 | 결과 |
|---|---|
| Gate B apply 실행 | **0** |
| ProductMaster 생성 | 0 |
| ProductIdentifier 생성 | 0 |
| ProductCandidate 수정 | 0 |
| DB write / migration / Cloud Run Job | 0 |
| 대량 API 호출 | 0 |
| serviceKey / DB secret 기록 | 0 |
| SupplierProductOffer / OrgProductListing / StoreLocalProduct 생성 | 0 |

이번 변경 = 본 runbook 문서 1건.

---

## 12. 다음 단계

```text
1. Gate B promotion dry-run/apply 구현 WO
   (medical-device-gate-b-promotion.ts: status map 조인 + promotable 필터
    + ProductMaster/ProductIdentifier 배치 승격 + env gate. ProductMaster hard-delete rollback 정책 확정)
2. 사용자 명시 승인 후 Gate B apply
3. Gate B apply result CHECK
4. 전량 2.65M 재수집/재계산/확장 WO
5. 의료기기 설명/이미지 보강은 별도 후속(Store 설명 제작과 분리)
```

**최종: 의료기기 Gate B 승격 runbook — 대상(8조건, PROMOTABLE 19,606/barcode 19,602), status map 조인(RTRCN_DSCTN_DIVS_CD IS NULL), ProductMaster(NOT NULL 컬럼)·ProductIdentifier(GTIN+UDI_DI) 매핑, 보류 사유별 처리, 검증 SQL A~J, rollback(Gate A보다 위험, mfds_product_id prefix 추적)을 고정했다. 승격 스크립트는 미구현 → 후속 구현 WO 필요. apply 는 "의료기기 Gate B apply 승인" 후에만. Gate A 완료 ≠ Gate B 승격.**
