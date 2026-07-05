# CHECK-O4O-MEDICAL-DEVICE-GATE-B-PROMOTION-APPLY-RESULT-V1

> 작업 성격: **Gate B ProductMaster/ProductIdentifier 승격 apply 실행 결과 기록.** 사용자 "의료기기 Gate B apply 승인" 후 실행. write 범위 = product_masters INSERT + product_identifiers INSERT + product_candidates status UPDATE.
> 작성일: 2026-07-05
> 기준 저장소: `C:\Users\sohae\o4o-platform` (집 PC).
> 선행 runbook/구현: `WO-O4O-MEDICAL-DEVICE-GATE-B-APPLY-RUNBOOK-V1`, `WO-O4O-MEDICAL-DEVICE-GATE-B-PROMOTION-APPLY-IMPLEMENTATION-V1` (commit ac1ab6374)

---

## 1. 결론

의료기기 Gate B 승격을 프로덕션에 실행 완료했다. **ProductMaster +19,602 / ProductIdentifier +39,204**, 보류 394건 미승격, Offer/Listing/StoreLocal 불변. 검증 §9 A~J 전부 통과.

---

## 2. 실행 정보

| 항목 | 값 |
|---|---|
| 승인 | 사용자 "의료기기 Gate B apply 승인" (범위 명시) |
| 범위 | sourceKind=medical_device_standard_code, promotable 19,602 |
| 채널 | local + Cloud SQL Auth Proxy v2 (127.0.0.1:5433) |
| env gate | `MEDICAL_DEVICE_GATE_B_ALLOW_APPLY=I_UNDERSTAND` |
| write 방식 | 단일 트랜잭션 배치 (master INSERT RETURNING → identifier ×2 → candidate UPDATE) |
| 실행 시각 | 2026-07-05 01:33:24 (UTC, master created_at 단일 시각) |

> 재시도 주: 최초 실행은 포트 5433 잔여 proxy 로 기동 실패(write 0). 잔여 proxy 정리 후 재실행 성공.

---

## 3. apply 리포트

```json
{"mode":"apply","candidateInput":19996,"promotableRows":19602,
 "createdMasters":19602,"createdIdentifiers":39204,"candidateUpdates":19602,
 "dbBarcodeConflicts":0,"dbIdentifierConflicts":0,
 "holdBreakdown":{"NON_GTIN_HIBCC":155,"GTIN_CHECKDIGIT_FAIL":0,"DUP_CONFLICT":220,
   "PERMIT_NOT_FOUND":10,"PERMIT_INACTIVE_RTRCN":3,"REQUIRED_FIELD_MISSING":6}}
```

---

## 4. 검증 (§9 A~J, apply 직후)

| # | 지표 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| A | promoted ProductMaster | 19,602 | **19,602** | ✓ |
| B | promoted Identifier by type | GTIN·UDI_DI 각 19,602 | **19,602 / 19,602** | ✓ |
| C | masters / identifiers total | 250,445 / 742,687 | **250,445 / 742,687** | ✓ (+19,602 / +39,204) |
| D | ProductMaster.barcode 중복 | 0 | **0** | ✓ |
| E | ProductIdentifier 중복(master,type,norm) | 0 | **0** | ✓ |
| F | md candidate status | approved_new_master 19,602 + pending 394 | **19,602 + 394** | ✓ |
| G | conflict candidate 승격 | 0 | **0** | ✓ |
| H | HIBCC/비숫자 barcode 승격 | 0 | **0** | ✓ |
| I | Offer / Listing / StoreLocal | PRE 불변 (0/0/35) | **0/0/35** | ✓ 불변 |
| J | batch 추적 (mfds_product_id prefix) | 19,602, 단일 시각 | **19,602, 01:33:24 단일** | ✓ |

PRE-snapshot: masters 230,843 / identifiers 703,483 / md candidate pending 19,996 / offers·listings·store_local 0·0·35.

### F 보충
보류 394 = NON_GTIN_HIBCC 155 + DUP_CONFLICT 220 + PERMIT_NOT_FOUND 10 + INACTIVE 3 + REQUIRED_MISSING 6. 전부 `pending` 유지(미승격). `merged` 0 — promotable 19,602 전부 distinct barcode(중복 candidate 그룹 없음) → 전건 representative(approved_new_master).

---

## 5. 완료 기준 대조 (사용자 요구)

```text
ProductMaster: +19,602                          ✓
ProductIdentifier: +39,204                       ✓
ProductCandidate approved_new_master/merged 갱신  ✓ (approved_new_master 19,602)
ProductMaster barcode 중복 0                      ✓
ProductIdentifier 중복 0                          ✓
HIBCC 155 미승격                                  ✓ (H=0)
conflict/orphan/inactive/required-missing 미승격   ✓ (G=0, 보류 394 pending)
Offer/Listing/StoreLocalProduct 증가 0            ✓ (0/0/35 불변)
```

---

## 6. 준수/경계

| 항목 | 결과 |
|---|---|
| write 범위 | product_masters +19,602 / product_identifiers +39,204 / product_candidates status 19,602 |
| SupplierProductOffer/OrgProductListing/StoreLocalProduct | 0 (불변) |
| Cloud Run Job | 0 |
| 전량 2.65M | 0 (표본 20,000 한정) |
| DB secret 원문 기록 | 0 |
| 추적 키 | `mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%'`, identifier `source_type='medical_device_standard_code_promotion'` |

---

## 7. rollback (필요 시)

runbook §8 / 구현 WO §8 순서: ProductIdentifier soft-delete → ProductCandidate 원복(approved_new_master→pending, matched_product_master_id=NULL) → ProductMaster hard-delete. 추적 키 `mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%'`.

---

## 8. 다음 단계

1. **전량 2.65M 재수집/재계산/확장 WO** — 표본 20,000 Gate A→B 완주로 파이프라인·배치 write 검증됨. 전량은 재수집(serviceKey) + Gate A import + Gate B promotion 배치로 확장.
2. 의료기기 설명/이미지 보강은 별도 후속(Store 설명 제작과 분리).
3. (선택) 승격된 ProductMaster 의 Neture/Store 노출·활용 정책 검토.

**최종: 의료기기 Gate B 승격 완료 — ProductMaster +19,602 / ProductIdentifier +39,204(GTIN+UDI_DI), candidate 19,602 approved_new_master, 보류 394 pending 유지, barcode/identifier 중복 0, HIBCC·conflict·orphan·inactive·required 미승격, Offer/Listing/StoreLocal 불변. 표본 20,000 트랙이 Gate A→B 완주했다.**
