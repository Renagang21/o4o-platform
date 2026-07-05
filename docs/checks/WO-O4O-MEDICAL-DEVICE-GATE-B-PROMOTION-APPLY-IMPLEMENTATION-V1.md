# WO-O4O-MEDICAL-DEVICE-GATE-B-PROMOTION-APPLY-IMPLEMENTATION-V1

> 작업 성격: **Gate B promotion apply 경로 구현 + 안전장치/로직 검증.** 프로덕션 apply 미실행, ProductMaster/ProductIdentifier 실제 생성 0, DB write 0, migration 0.
> 작성일: 2026-07-05
> 기준 저장소: `C:\Users\sohae\o4o-platform` (집 PC).
> 선행: `WO-O4O-MEDICAL-DEVICE-GATE-B-PROMOTION-SCRIPT-V1`(dry-run, commit 24ad077c2), `WO-O4O-MEDICAL-DEVICE-GATE-B-APPLY-RUNBOOK-V1`
> **승인 게이트: 프로덕션 apply 실행은 사용자 "의료기기 Gate B apply 승인" 후에만.**

---

## 1. 결론

Gate B dry-run 로직 위에 **실제 승격 write 경로를 구현**하고, env gate 차단·apply 로직(fake sink)·dry-run 수치 재현을 검증했다. **프로덕션 apply 는 실행하지 않았다(DB write 0).**

| 항목 | 결과 |
|---|---|
| apply path 구현 | 완료 (단일 트랜잭션 배치 승격) |
| env gate 차단 | 3종 검증 PASS |
| dry-run 수치 재현 | promotable 19,602 / masters 19,602 / identifiers 39,204 (동일) |
| 유닛테스트 | 15/15 PASS |
| 타입체크 | 이번 변경 관련 에러 0 |
| 프로덕션 DB write | **0** (apply 미실행) |

---

## 2. 변경 파일 (수정 3)

| 파일 | 변경 |
|---|---|
| `.../drug-import/medical-device-gate-b-promotion.service.ts` | apply 계층: `MasterRow/IdentifierRow/CandidateUpdate` 타입, `PromotionSink` 추상화, `toMasterRow/toIdentifierRows`, `executePromotion`(배치 executor) |
| `.../scripts/medical-device-gate-b-promotion.ts` | `--apply` 경로: env+use-db+map 가드, `QueryRunnerSink`(배치 INSERT RETURNING/UPDATE VALUES), 단일 트랜잭션 |
| `.../drug-import/__tests__/medical-device-gate-b-promotion.test.ts` | apply 테스트 3 케이스 추가 (총 15) |

> dry-run 로직(classifyCandidate/buildPromotionPlan/groupIntoMasters)은 **재사용** — dry-run/apply 후보 산출 기준 단일. package.json 미등록 유지(tsx 직접).

---

## 3. apply gate 조건 (모두 필요, 하나라도 없으면 fail-fast)

```text
--apply
--use-db
--permit-status-map <path>
env MEDICAL_DEVICE_GATE_B_ALLOW_APPLY=I_UNDERSTAND
```

검증(§9): DB 연결·write **이전**에 차단.

| gate | 조건 | 결과 |
|---|---|---|
| 1 | `--apply` env 없음 | `APPLY_BLOCKED: ... 안전 경계` |
| 2 | `--apply` + env, `--use-db` 없음 | `APPLY_BLOCKED: --apply 는 --use-db 필수` |
| 3 | `--apply` + env + `--use-db`, map 없음 | `APPLY_BLOCKED: --apply 는 --permit-status-map 필수` |

---

## 4. ProductMaster 매핑 (승격 write)

distinct barcode 기준. NOT NULL 컬럼 충족 + 기본값 활용.

```text
INSERT product_masters (id=gen_random_uuid(), barcode, regulatory_type, regulatory_name,
  name, manufacturer_name, mfds_product_id, mfds_permit_number, specification,
  is_mfds_verified=true, tags='[]'::jsonb, created_at=NOW(), updated_at=NOW()) RETURNING id, barcode
```

| 컬럼 | 값 |
|---|---|
| barcode | UDIDI (원형, GTIN-13 zero-pad 금지) |
| regulatory_type | `MEDICAL_DEVICE` |
| regulatory_name | PRDLST_NM |
| name | candidate_name (PRDLST_NM 우선) |
| manufacturer_name | MNFT_IPRT_ENTP_NM |
| mfds_product_id | `MFDS:MEDICAL_DEVICE:{UDIDI}` (rollback 추적 prefix) |
| mfds_permit_number | PERMIT_NO |
| specification | FOML_INFO |

HIBCC/conflict/보류 후보는 masters 목록에 없음 → 생성 안 됨.

---

## 5. ProductIdentifier 매핑

master 당 2건 (`toIdentifierRows`):

```text
GTIN : identifier_value=UDIDI, normalized_value=normalizeIdentifier('GTIN',UDIDI), is_primary=true
UDI_DI: identifier_value=UDIDI, normalized_value=normalizeIdentifier('UDI_DI',UDIDI), is_primary=false
공통 : verification_status='imported', source_type='medical_device_standard_code_promotion',
       source_id=representativeCandidateId, source_label=MFDS_MEDICAL_DEVICE_STANDARD_CODE,
       metadata={permitNo, model, sourceDatasetId '15073875', sourceKind, candidateIds[]}
```

wouldCreate = masters × 2 = **39,204**.

---

## 6. ProductCandidate update 정책

```text
대표 candidate : candidate_status='approved_new_master', matched_product_master_id=master.id
중복 candidate : candidate_status='merged',            matched_product_master_id=master.id
```

배치 UPDATE (VALUES CTE join). 보류 candidate 는 변경하지 않음(promotable 만 승격).

---

## 7. transaction / idempotency

- **단일 트랜잭션**: `createQueryRunner` → `startTransaction` → executePromotion(배치 500) → `commitTransaction`. 실패 시 `rollbackTransaction`(전체). 표본 19,602 단일 트랜잭션 가능.
- **배치**: master INSERT…RETURNING(500) → barcode↔id 매핑 → identifier INSERT(1000) → candidate UPDATE(VALUES). 40k 순차 왕복 회피(Gate A 배치 선례).
- **idempotency**: dry-run 단계의 DB 충돌 대조(`product_masters.barcode` / `product_identifiers.normalized_value` = ANY)가 이미 존재분을 masters 에서 제외 → 중복 생성 방지. barcode UNIQUE + mfds_product_id 1:1 이 2차 방어. 재실행 시 이미 승격된 barcode 는 충돌로 제외.

---

## 8. rollback 정책 (확정)

```text
dry-run: rollback 불필요 (write 0)
apply 중 실패: 단일 트랜잭션 rollback (자동)
apply 완료 후 rollback (수동, 별도 승인):
  1. ProductIdentifier soft-delete:
     UPDATE product_identifiers SET deleted_at=NOW()
      WHERE product_master_id IN (SELECT id FROM product_masters WHERE mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%')
        AND deleted_at IS NULL;
  2. ProductCandidate 원복:
     UPDATE product_candidates SET candidate_status='pending', matched_product_master_id=NULL
      WHERE matched_product_master_id IN (SELECT id FROM product_masters WHERE mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%');
  3. ProductMaster hard-delete (deleted_at 없음 → 삭제):
     DELETE FROM product_masters WHERE mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%';
```

추적 키: `mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%'` + identifier `source_type='medical_device_standard_code_promotion'` + metadata.candidateIds. rollback 스크립트 자체는 본 WO 미포함(승인 후 별도).

---

## 9. 테스트 / 검증

```text
유닛테스트: medical-device-gate-b-promotion.test.ts → 15 passed / 15 (PASS)
  기존 12 + apply 3:
    - executePromotion: masters=distinct barcode, identifiers=master*2, candidateUpdate=대표+중복
    - 대표/중복 role 분류, master_id 연결
    - 빈 masters → write 호출 없음
    - toIdentifierRows: GTIN(primary)+UDI_DI, metadata.candidateIds 보존
apply gate(CLI 실측): GATE 1/2/3 모두 APPLY_BLOCKED (DB 연결·write 이전 차단)
타입체크: tsc 이번 변경 관련 에러 0 (전체 1건=marketTrialController, 기존/무관)
```

---

## 10. dry-run 재검증 (Gate A applied DB)

```json
{"candidateInput":19996,"promotableRows":19602,"wouldCreateMasters":19602,
 "wouldCreateIdentifiers":39204,"dbBarcodeConflicts":0,"dbIdentifierConflicts":0,
 "holdBreakdown":{"NON_GTIN_HIBCC":155,"GTIN_CHECKDIGIT_FAIL":0,"DUP_CONFLICT":220,
   "PERMIT_NOT_FOUND":10,"PERMIT_INACTIVE_RTRCN":3,"REQUIRED_FIELD_MISSING":6},"write":0}
```

apply 구현 후에도 dry-run 수치 **불변**(선행 WO 와 동일).

---

## 11. apply 미실행 확인

| 항목 | 결과 |
|---|---|
| 프로덕션 Gate B apply 실행 | **0** (env 설정 조합 미실행) |
| ProductMaster 실제 생성 | 0 (masters 230,843 불변 — 별도 확인 시) |
| ProductIdentifier 실제 생성 | 0 (703,483 불변) |
| ProductCandidate update | 0 |
| DB write / migration / Cloud Run Job | 0 |
| SupplierProductOffer/Listing/StoreLocalProduct | 0 |
| serviceKey / DB secret 기록 | 0 |

검증한 apply 경로는 **gate 차단 케이스(write 없음)** 와 **fake sink 유닛테스트** 뿐. `--apply --use-db --permit-status-map` + env 조합(실 write)은 실행하지 않았다.

---

## 12. 다음 단계

1. 사용자 **"의료기기 Gate B apply 승인"** → `--apply --use-db --permit-status-map <map>` + env 로 프로덕션 승격 실행.
2. 승격 후 검증(runbook §9 검증 SQL A~J: master +19,602 / identifier +39,204 / conflict·HIBCC 미승격 / offer·listing 불변 / mfds_product_id 추적).
3. `CHECK-O4O-MEDICAL-DEVICE-GATE-B-PROMOTION-APPLY-RESULT-V1` 결과 기록.
4. 전량 2.65M 재수집/재계산/확장 WO.

**최종: Gate B promotion apply 경로 구현 완료 — 단일 트랜잭션 배치 승격(ProductMaster + ProductIdentifier×2 + candidate status), env+use-db+map 3중 gate, rollback 정책(mfds_product_id prefix 추적) 확정. 유닛 15/15, gate 3종 차단, dry-run 19,602/39,204 재현, 프로덕션 write 0. 실 apply 는 사용자 승인 후.**
