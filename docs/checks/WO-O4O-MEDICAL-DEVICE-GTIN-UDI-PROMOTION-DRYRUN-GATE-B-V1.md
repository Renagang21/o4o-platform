# WO-O4O-MEDICAL-DEVICE-GTIN-UDI-PROMOTION-DRYRUN-GATE-B-V1

> 작업 성격: Gate B 제한 승격 **dry-run (수치 산출만).** ProductMaster/ProductIdentifier/ProductCandidate apply 0, DB write 0, migration 0, Cloud Run Job 0, raw 대용량 커밋 0, serviceKey 원문 기록 0.
> 작성일: 2026-07-04
> 범위 고정: **의료기기 트랙 전용.** 표본 20,000건(원천 2.65M 아님).
> 선행: `docs/checks/CHECK-O4O-MEDICAL-DEVICE-UDI-IDENTIFIER-CONFLICT-POLICY-V1.md`(판정식·D1~D4), `docs/checks/WO-O4O-MEDICAL-DEVICE-PERMIT-STATUS-CODE-TABLE-AND-JOIN-COVERAGE-V1.md`(active 판정·coverage), `docs/checks/CHECK-O4O-MEDICAL-DEVICE-PERMIT-INFO-ENDPOINT-DISCOVERY-V1.md`

---

## 0. 이번 dry-run 범위 (중요)

```text
이번 dry-run 범위:
- public raw/sample(20k) 기준 Gate B promotion eligibility 산출
- PERMIT 상태 join 포함 (active = RTRCN_DSCTN_DIVS_CD IS NULL)
- UDI-DI 충돌 / GTIN / HIBCC / orphan / inactive / 필수결측 보류 산출
- 기존 DB barcode/product_identifier 충돌 대조는 미수행

따라서 최종 promotable 수는:
- DB conflict check 전 preliminary promotable (= PROMOTABLE_PRE_DB_CHECK)
- 실제 apply 전 별도 read-only DB collision check(별도 WO)에서 최종 차감 필요
```

---

## 1. 판정식 (적용)

```text
promotable :=
  UDIDI_CD numeric 13/14
  AND GTIN check-digit pass
  AND NOT UDI_DI_DUP_CONFLICT
  AND PERMIT_NO matched (허가 데이터셋 존재)
  AND RTRCN_DSCTN_DIVS_CD IS NULL (active)
  AND required display fields present (PRDLST_NM 또는 PRDT_NM_INFO) AND MNFT_IPRT_ENTP_NM
  AND [DB barcode/identifier 충돌 없음]   ← 이번 dry-run 미수행 (별도 WO)
```

입력:
- raw: `G:\내 드라이브\자료실\public-data-api-samples\mfds-medical-device-standard-code-raw.jsonl` (20,000행)
- PERMIT 상태 맵: distinct PERMIT_NO 786 targeted lookup 결과(persistent error 0, transient는 재시도 해소)

---

## 2. 결과 (표본 20,000)

| 지표 | 값 | 비율 |
|---|---:|---:|
| **PROMOTABLE_PRE_DB_CHECK** | **19,606** | **98.03%** |
| HOLD_NON_GTIN_HIBCC (identifier-only) | 155 | 0.78% |
| HOLD_GTIN_CHECKDIGIT_FAIL | 0 | 0.00% |
| HOLD_UDI_DI_DUP_CONFLICT | 220 | 1.10% |
| HOLD_PERMIT_NOT_FOUND | 10 | 0.05% |
| HOLD_PERMIT_INACTIVE_RTRCN | 3 | 0.015% |
| HOLD_REQUIRED_FIELD_MISSING | 6 | 0.03% |
| DB_CONFLICT_CHECK_PENDING | (미수행) | — |
| 합계 검증 | 20,000 | 100% (waterfall 배타적, sum=20,000 확인) |

형식 분포(참고): GTIN-14 19,055 / GTIN-13 790 / HIBCC 155 / 결측·기타 0. check-digit fail 0.

### 2.1 Waterfall (배타적, 판정 순서)

각 row는 첫 탈락 사유 1개에만 계상된다(중복 없음, 합=20,000).

```text
W1 non-GTIN(HIBCC) → identifier-only track : 155
W2 GTIN check-digit fail (hold)            : 0
W3 UDI_DI_DUP_CONFLICT (hold)              : 220
W4 PERMIT_NOT_FOUND (hold)                 : 10
W5 INACTIVE (RTRCN non-null) (hold)        : 3
W6 required field missing (hold)           : 6
W7 PROMOTABLE (pre-DB-check)               : 19,606
```

### 2.2 독립 flag 카운트 (row가 복수 사유에 해당 가능)

| flag | 독립 수 | waterfall 수 | 차이 사유 |
|---|---:|---:|---|
| dup-conflict | 244 | 220 | 24건은 HIBCC라 W1에서 먼저 분류됨 |
| permit-not-found | 10 | 10 | 동일 (진짜 고아 3 PERMIT_NO = 10 rows) |
| inactive | 3 | 3 | 동일 (inactive 1 PERMIT_NO = 3 rows) |
| required-field-missing | 6 | 6 | 동일 (`MNFT_IPRT_ENTP_NM` 결측 6) |

---

## 3. 트랙별 귀결 (Gate A/B 처리 방향)

| 그룹 | 수 | Gate A (Candidate) | Gate B (ProductMaster) | ProductIdentifier |
|---|---:|---|---|---|
| PROMOTABLE_PRE_DB_CHECK | 19,606 | 적재 | 승격 후보(DB 대조 후 확정) | GTIN + UDI_DI |
| HIBCC (identifier-only) | 155 | 적재 | **미승격** | UDI_DI only (barcode 없음) |
| dup-conflict | 220 | 적재(match_status=conflict) | **보류** | UDI_DI (verification_status=conflict) |
| permit-not-found | 10 | 적재(PERMIT_NOT_FOUND flag) | **보류** | GTIN/UDI_DI |
| inactive | 3 | 적재(inactive flag) | **미승격** | GTIN/UDI_DI |
| required-field-missing | 6 | 적재(검토 필요) | **보류** | — |

- 전체 20,000건은 **Gate A(ProductCandidate)에는 전건 적재 가능**(선행 정책 D4). 위 표는 Gate B(ProductMaster.barcode 승격) 자격만 구분한다.
- HIBCC 155건은 barcode 부적합이나 `UDI_DI` identifier로 보존(선행 정책 D3).

---

## 4. 해석

- **표본 98.03%가 형식·충돌·상태·필수필드 기준을 통과**한다. 의료기기 공공데이터의 Gate B 적합도는 (DB 대조 전) 매우 높다.
- 보류의 대부분은 **dup-conflict(220, 1.10%)** 이며, 이는 선행 dry-run에서 확인된 "동일 UDIDI_CD가 다른 업체/허가/모델" 충돌이다. barcode UNIQUE 제약상 자동 승격 불가가 정당하다.
- **inactive는 3건(0.015%)** 에 불과하다. 표준코드에 존재하는 제품은 현행 유통품이라 대부분 active라는 선행 판단과 정합.
- **permit-not-found 10건(0.05%)** 은 허가 스냅샷 시점 격차 추정. 소량이며 flag 보류로 안전 처리.
- check-digit fail 0 → 숫자형 UDI-DI의 GTIN 무결성이 표본상 완전.

> 주의: 이 수치는 20,000 표본이다. 원천 2.65M에서는 dup-conflict/orphan/inactive 비율이 달라질 수 있으므로 전량 dry-run에서 재산출한다.

---

## 5. read-only 준수 확인

| 항목 | 결과 |
|---|---|
| ProductMaster/Identifier/Candidate apply | 0 |
| DB write / migration / Cloud Run Job | 0 |
| DB barcode/identifier 대조 | **미수행**(의도적 — 별도 WO) |
| 대량 API 호출 | 0 (상태 맵은 distinct PERMIT_NO 786 targeted lookup, 기 수집분 재사용) |
| raw 대용량 커밋 / serviceKey 원문 | 0 |
| 코드 변경 | 0 (집계 스크립트는 세션 scratchpad에만) |

이번 변경은 CHECK 문서 추가 1건뿐이다.

---

## 6. 다음 단계

1. **`WO-O4O-MEDICAL-DEVICE-GATE-B-DB-COLLISION-CHECK-V1`** (apply 직전, read-only prod SELECT) — PROMOTABLE_PRE_DB_CHECK 19,606건의 barcode를 `product_masters.barcode` / `product_identifiers.normalized_value` 와 대조하여 DB 충돌 수 차감 → **최종 promotable 확정**. 프로덕션 read-only.
2. **`UDI_DI` identifier type 구현 WO**(선행 정책 D3) — Gate A/B apply 전 union 확장.
3. **Gate A Candidate import**(선행 정책 D4) — 20,000(또는 전량) 전건 적재. ProductMaster 승격 금지.
4. Gate B apply는 1·2 완료 후, 사용자 명시 승인 게이트 하에서만.
5. 전량 2.65M dry-run은 API 호출량·수집 전략이 달라 별도 WO로 분리(표본 수치 확정 후).

**최종: 표본 20,000 기준 Gate B 판정식 통과(PROMOTABLE_PRE_DB_CHECK) = 19,606건(98.03%). 보류 = HIBCC 155 / dup-conflict 220 / orphan 10 / inactive 3 / 필수결측 6 / checkdigit-fail 0. DB 충돌 대조는 apply 직전 별도 read-only WO로 분리하며, 최종 promotable은 그 차감 후 확정한다.**
