# CHECK-O4O-DRUG-PENDING-REMAINING-ONE-ARCHIVE-V1

> WO: `WO-O4O-DRUG-PENDING-REMAINING-ONE-ARCHIVE-V1`
> 근거 IR: `IR-O4O-DRUG-PENDING-REMAINING-ONE-MANUAL-REVIEW-V1`
> 작성일: 2026-07-11 · 상태: **apply 완료 (단건 archived) · 사후검증 PASS**

---

## 1. 범위

드럭 pending 잔여 1건(`3a6fc346-1d4a-4610-8c22-7071814b34b3`)을 `archived` 로 전환.
1건이라 신규 엔드포인트/배포 없이, **승인된 채널(Cloud SQL Auth Proxy)에서 가드를 건 단일 UPDATE** 로 처리.
candidate_status 전환만 — ProductMaster/ProductIdentifier/raw_payload/식별자 불변, hard delete 없음, migration 없음.

## 2. 사유

- 바이락스정(아시클로버)[수출명 이노바이락스정200mg] / 고려제약(주) / 전문의약품.
- 비취소(취소일자 null, isCancelled=false) 유효 품목이나 표준코드 `8806428006706` 의 **GTIN 체크디짓 불일치**
  (computed 7 ≠ actual 6). 승격 엔진 `validateGtin` 이 거절 → pending 잔존.
- **같은 품목기준코드 199101746 의 sibling ProductMaster 가 이미 유효 barcode 로 존재**:
  `8806428006714`(valid) / `8806428006721`(valid). 신규 등록 대상 아님.
- 원천 표준코드 임의 보정(706→707) 정책 부재 → 보정 승격 금지. pending 유지 시 '등록 전 후보'로 오인.
- 따라서 데이터 품질 holdout 으로 **archived**(등록/검토 흐름에서 제외 보관, 가역) 가 적절. (`rejected` 아님.)

## 3. 실행 전 재확인 (read-only, 전부 일치)

| 확인 | 결과 |
|---|---|
| 대상 id 가 모든 가드 충족(1건) | ✅ 1 |
| candidate_status = pending | ✅ |
| source_label LIKE 'mfds-drug-master-standard-code%' | ✅ |
| normalized_identifier_value = 8806428006706 | ✅ |
| 품목기준코드(mfdsCode) = 199101746 | ✅ |
| 취소일자 null / isCancelled=false | ✅ |
| sibling master 8806428006714 / 8806428006721 존재 | ✅ 둘 다 |
| 드럭 pending 총량 | 1 |

## 4. 실행

승인된 프록시에서 단일 트랜잭션 UPDATE (WHERE 에 id + 상태 + 소스 + 식별자 + 비취소 가드 전부 포함):

```sql
BEGIN;
UPDATE product_candidates
SET candidate_status='archived', reviewed_at=NOW(),
    review_note='drug-pending-holdout: invalid GTIN check digit (8806428006706); sibling master exists (8806428006714/8806428006721); not a new registerable asset. WO-O4O-DRUG-PENDING-REMAINING-ONE-ARCHIVE-V1'
WHERE id='3a6fc346-1d4a-4610-8c22-7071814b34b3'
  AND candidate_status='pending' AND deleted_at IS NULL
  AND source_label LIKE 'mfds-drug-master-standard-code%'
  AND normalized_identifier_value='8806428006706'
  AND (raw_payload->>'isCancelled')='false';
COMMIT;
```

→ **UPDATE 1** (정확히 1행). id=PK 라 최대 1행 보장.

## 5. 사후검증 (BEFORE→AFTER)

| 검증 | BEFORE | AFTER | 판정 |
|---|---:|---:|:--:|
| 드럭 pending 잔량 | 1 | **0** | ✅ |
| 대상 candidate_status | pending | **archived** | ✅ |
| DRUG ProductMaster 총량 | 177,413 | 177,413 | ✅ 불변 |
| ProductIdentifier active | 621,280 | 621,280 | ✅ 불변 |
| ProductCandidate active 총량 | 394,495 | 394,495 | ✅ 보존(hard delete 0) |

## 6. 드럭 트랙 정비 마무리 상태

```text
등록 완료 고아          = 0   (53,428 archived, ...-ORPHAN-...-APPLY-V1)
취소 의약품 pending     = 0   (74,680 archived, ...-CANCELLED-DRUG-...-V1)
드럭 pending            = 0   (잔여 1 archived, 본 WO)
신규 승격 가능 후보     = 0
```

→ **드럭 후보 정비 종료.** 다음은 의료기기 / 의약외품 / HFF 중 택1 → 조사 → 명확한 정비 항목 1개 → dry-run/apply.

---

*Status: 단건 archived 완료 · candidate_status 전환만 · ProductMaster/Identifier 불변 · hard delete 0 · migration 0 · 드럭 pending 0.*
