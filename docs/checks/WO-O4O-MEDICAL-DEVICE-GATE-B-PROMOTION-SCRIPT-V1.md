# WO-O4O-MEDICAL-DEVICE-GATE-B-PROMOTION-SCRIPT-V1

> 작업 성격: **Gate B promotion 스크립트 구현 + dry-run 검증.** apply 미실행(env gate 차단), ProductMaster/ProductIdentifier 생성 0, DB write 0, migration 0.
> 작성일: 2026-07-05
> 기준 저장소: `C:\Users\sohae\o4o-platform` (집 PC).
> 선행: `WO-O4O-MEDICAL-DEVICE-GATE-B-APPLY-RUNBOOK-V1`, `WO-O4O-MEDICAL-DEVICE-GATE-B-DB-COLLISION-CHECK-V1`, `CHECK-O4O-MEDICAL-DEVICE-PUBLIC-CANDIDATE-APPLY-RESULT-V1`
> **승인 게이트: apply 는 사용자 "의료기기 Gate B apply 승인" 후 별도 WO. 본 스크립트는 dry-run 전용(apply 미구현).**

---

## 1. 결론

Gate B 승격 계획 스크립트를 구현하고, **Gate A applied 프로덕션 DB 기준 dry-run 을 PASS** 했다. write 0.

| 지표 | 값 |
|---|---:|
| candidateInput (Gate A applied) | 19,996 |
| promotableRows | **19,602** |
| wouldCreateMasters (distinct barcode) | **19,602** |
| wouldCreateIdentifiers (GTIN+UDI_DI) | **39,204** |
| dbBarcodeConflicts / dbIdentifierConflicts | 0 / 0 |
| write | **0** |
| apply gate | `--apply` → APPLY_BLOCKED (env 없음) |

> **19,606 vs 19,602 정합:** 선행 Gate B dry-run(raw 20,000)은 promotable 19,606 rows. 본 dry-run 은 **Gate A applied DB(완전동일 4행 dedup 후 19,996)** 기준이라 19,606 − 4 = **19,602**. 4행은 Gate A 에서 skip 된 완전 동일 GTIN 후보다. 완전 정합.

---

## 2. 변경 파일 (신규 3)

| 파일 | 역할 |
|---|---|
| `apps/api-server/src/modules/neture/drug-import/medical-device-gate-b-promotion.service.ts` | 계획 로직(순수): classifyCandidate / buildPromotionPlan / groupIntoMasters / parsePermitStatusMapTsv |
| `apps/api-server/src/scripts/medical-device-gate-b-promotion.ts` | CLI (dry-run, status map 파일 입력, DB 조회·충돌 대조, apply gate) |
| `apps/api-server/src/modules/neture/drug-import/__tests__/medical-device-gate-b-promotion.test.ts` | 유닛테스트 (12 케이스) |

> package.json 스크립트 미등록(병렬 세션 미커밋 흡수 회피) → `npx tsx` 직접 호출.

---

## 3. dry-run 대상

```sql
SELECT ... FROM product_candidates
 WHERE source_type='external_api' AND source_label='MFDS_MEDICAL_DEVICE_STANDARD_CODE'
   AND raw_payload->>'sourceKind'='medical_device_standard_code' AND deleted_at IS NULL
-- = 19,996 (Gate A applied)
```

추출 필드: identifier_type, identifier_value(UDIDI), match_status, candidate_name, candidate_manufacturer, candidate_spec, `raw_payload->>'permitNo'`, `raw_payload->'source'->>'PRDLST_NM'`, `raw_payload->>'sourceRowSignature'`.

---

## 4. status map 입력 방식

```text
--permit-status-map <path.tsv>  (필수, 없으면 fail-fast — API 재호출 안 함)
형식: PERMIT_NO \t MATCHED \t RTRCN_NULL \t STTEMNT \t RTRCN
active := MATCHED==1 AND RTRCN_NULL==1
```

- join key: candidate `raw_payload.permitNo` = 허가 `PRDUCT_PRMISN_NO` (exact).
- **`PRMISN_STTEMNT` 는 active 판정에 사용하지 않는다** (map 의 active 플래그 = RTRCN 기반). 유닛테스트로 고정.
- 본 dry-run 은 선행 WO(coverage)에서 생성한 786-permit map 재사용(재현성·serviceKey 불필요). statusMapEntries=786.

---

## 5. promotable 필터 (waterfall, 배타적)

| 순서 | 조건 | 미충족 hold |
|---|---|---|
| 1 | identifier_type='GTIN' | NON_GTIN_HIBCC |
| 2/3 | UDIDI 숫자13/14 + GTIN check-digit pass | GTIN_CHECKDIGIT_FAIL |
| 4 | match_status != 'conflict' | DUP_CONFLICT |
| 5 | permit matched | PERMIT_NOT_FOUND |
| 6 | active (RTRCN_DSCTN_DIVS_CD IS NULL) | PERMIT_INACTIVE_RTRCN |
| 7/8 | name + manufacturer 존재 | REQUIRED_FIELD_MISSING |
| 9/10 | DB barcode / normalized 충돌 없음 | (dbBarcodeConflicts / dbIdentifierConflicts) |

DB 충돌(9/10)은 promotable barcode 대상 targeted `= ANY($1)` 2쿼리로 대조.

---

## 6. ProductMaster grouping 정책

- **distinct barcode 기준 1 ProductMaster.** 동일 barcode 다건(완전 동일 signature 반복)이면 1 master 로 병합, `representativeCandidateId` + `duplicateCandidateIds` 기록.
- 동일 barcode + 다른 signature 는 상위 필터(conflict)에서 이미 제외 → 병합 대상 아님.
- 매핑: barcode=UDIDI(원형, GTIN-13 zero-pad 금지), name=candidate_name, regulatoryName=PRDLST_NM, manufacturerName, regulatoryType=MEDICAL_DEVICE, mfdsProductId=`MFDS:MEDICAL_DEVICE:{UDIDI}`, mfdsPermitNumber=permitNo, specification=FOML_INFO.

---

## 7. ProductIdentifier preview 정책

master 당 2건: GTIN(primary, normalized=숫자) + UDI_DI(normalized=원형 보존). `wouldCreateIdentifiers = masters × 2 = 39,204`. HIBCC 155 는 master(FK) 없어 단독 생성 불가 → Candidate 유지.

---

## 8. dry-run 결과 (Gate A applied DB)

```json
{"statusMapEntries":786,"candidateInput":19996,"promotableRows":19602,
 "wouldCreateMasters":19602,"wouldCreateIdentifiers":39204,
 "dbBarcodeConflicts":0,"dbIdentifierConflicts":0,
 "holdBreakdown":{"NON_GTIN_HIBCC":155,"GTIN_CHECKDIGIT_FAIL":0,"DUP_CONFLICT":220,
   "PERMIT_NOT_FOUND":10,"PERMIT_INACTIVE_RTRCN":3,"REQUIRED_FIELD_MISSING":6},
 "write":0}
```

holds 합 394 + promotable 19,602 = **19,996** (배타적 검증). dbConflict 0(선행 collision check 재확인).

---

## 9. 테스트 / 타입체크

```text
유닛테스트: medical-device-gate-b-promotion.test.ts → 12 passed / 12 (PASS)
  - classifyCandidate 6 hold 사유 + 승격 통과
  - PRMISN_STTEMNT 무관, active 플래그만 사용 (명시 테스트)
  - buildPromotionPlan hold 집계
  - groupIntoMasters: distinct barcode / 병합 / identifier 2개 / GTIN-13 원형
  - parsePermitStatusMapTsv matched·active 판정
타입체크: tsc 이번 변경 관련 에러 0 (전체 1건 = marketTrialController, 기존/무관)
```

---

## 10. apply 미실행 / env gate

- `--apply` 는 `MEDICAL_DEVICE_GATE_B_ALLOW_APPLY=I_UNDERSTAND` 없으면 **APPLY_BLOCKED** (dry-run 로그로 확인).
- env gate 가 있어도 이번 WO 는 **APPLY_NOT_IMPLEMENTED** (승격 write 미구현). 실제 승격은 사용자 승인 후 별도 WO.

---

## 11. rollback 정책 (설계)

```text
dry-run: rollback 불필요 (write 0).
apply 실패 중: 단일 트랜잭션 rollback (승격 write 구현 WO 에서).
apply 완료 후: ProductIdentifier soft-delete → ProductMaster hard-delete(deleted_at 없음, 별도 승인).
추적: mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%' + metadata.candidateIds.
```

---

## 12. read-only / 금지 준수

| 항목 | 결과 |
|---|---|
| ProductMaster/ProductIdentifier 생성 | 0 |
| ProductCandidate status update | 0 |
| DB write / migration / Cloud Run Job | 0 |
| 대량 API 호출 | 0 (status map 파일 재사용) |
| SupplierProductOffer/Listing/StoreLocalProduct | 0 |
| serviceKey / DB secret 기록 | 0 |

이번 변경 = 코드 3(service/CLI/test) + 문서 1.

---

## 13. 다음 단계

1. **Gate B promotion apply 구현 WO** — 본 계획 로직 위에 단일 트랜잭션 배치 승격(ProductMaster + ProductIdentifier + candidate status update) + rollback(ProductMaster hard-delete 정책 확정) 구현.
2. 사용자 "의료기기 Gate B apply 승인" → apply → `CHECK-...-GATE-B-APPLY-RESULT-V1`.
3. 전량 2.65M 재수집/재계산/확장 WO.

**최종: Gate B promotion dry-run 스크립트 구현 완료 — Gate A DB 기준 promotable 19,602 / masters 19,602 / identifiers 39,204 / DB충돌 0 / write 0, 유닛 12/12, apply gate 차단 확인. raw 19,606과의 −4는 Gate A dedup. apply write 는 별도 승인 WO.**
