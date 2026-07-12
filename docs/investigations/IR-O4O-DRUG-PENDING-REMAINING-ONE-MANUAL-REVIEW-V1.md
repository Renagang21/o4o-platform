# IR-O4O-DRUG-PENDING-REMAINING-ONE-MANUAL-REVIEW-V1

> **조사 전용 (read-only).** DB write 0 · 코드 변경 0 · migration 0 · apply 0.
> 취소 의약품 pending 74,680 archived 이후 남은 **드럭 pending 1건**을 수동 확인한다.
>
> - 선행: `CHECK-...-CANCELLED-DRUG-PENDING-ARCHIVE-V1` (취소 pending 74,680 archived 완료)
> - 근거 코호트: `IR-O4O-DRUG-PENDING-CANDIDATE-COHORT-AUDIT-V1`
> - 작성일: 2026-07-11

---

## 0. 요약

남은 1건은 **비취소·유효 전문의약품이지만 표준코드의 GTIN 체크디짓이 깨진** 후보다. 그리고 **같은 제품
(품목기준코드 199101746)은 이미 유효 barcode ProductMaster 로 등록돼 있다**(형제 SKU 8806428006714 /
8806428006721). 따라서 이 후보는 "미등록 신제품"이 아니라 **식별자(표준코드)만 잘못된 별도 SKU 코드**다.

**판정: 자동 승격 금지.** 식별자 보정 정책이 없고(임의 코드 조작 금지), 제품 자체는 이미 커버됨.
권고 = **archived(데이터 품질 holdout)** 또는 **문서화된 의도적 pending-1 보류**. (아래 §5)

## 1. 선행 상태

- 드럭 pending 총량 = **1** (취소 74,680 archived 후).
- 대상: `candidate_status='pending' AND source_label LIKE 'mfds-drug-master-standard-code%'`.

## 2. 후보 상세 (실측)

| 필드 | 값 |
|---|---|
| candidate_id | `3a6fc346-1d4a-4610-8c22-7071814b34b3` |
| 상품명 | 바이락스정(아시클로버)[수출명:이노바이락스정200mg(InnoVIRAX200mgTablet)] |
| 제조사 | 고려제약(주) |
| 전문/일반 | 전문의약품 |
| identifier_type | KOREA_DRUG_CODE |
| identifier_value / normalized | **8806428006706** |
| 표준코드 / 대표코드 (source) | 8806428006706 / 8806428006706 |
| 품목기준코드 | 199101746 |
| ATC | J05AB01 (아시클로버) |
| 품목허가일자 | 1991-10-05 |
| 제품코드(개정후) 보험코드 | 642800670 |
| **취소일자** | **null (비취소)** · isCancelled=false · cancelledAt=null |
| reviewFlags | `PACKAGE_FORM_MISSING` (제형/포장/제품총수량 0·null) |
| matched_product_master_id | null |

## 3. GTIN 체크디짓 실패 원인 (재계산)

표준코드 8806428006706 을 GTIN-13 로 검산:

```
data d1..d12 = 8 8 0 6 4 2 8 0 0 6 7 0
weight       = 1 3 1 3 1 3 1 3 1 3 1 3
weighted sum = 8+24+0+18+4+6+8+0+0+18+7+0 = 93
check digit  = (10 - (93 mod 10)) mod 10 = 7
실제 13번째  = 6   →   7 ≠ 6  ⇒ 체크디짓 불일치(invalid GTIN)
```

- 즉 마지막 자리가 `6`(=8806428006706)이나 **정상 GTIN 이라면 `7`(=8806428006707)** 이어야 한다.
- 원천(약가마스터)에 그대로 `...706` 으로 적재된 값이며, 승격 엔진 `validateGtin` 이 이 값을 거절해 pending 유지됨.
  (원천 데이터 오류이거나, 이 표준코드가 GTIN 규격 비준수 코드일 가능성. 둘 다 자동 승격 부적합.)

## 4. 충돌 / 중복 조사

- 8806428006706 vs 살아있는 `product_masters.barcode` 충돌: **0** (없음).
- 8806428006706 vs active `product_identifiers.normalized_value`: **0** (없음).
- **동일 제품(품목기준코드 199101746, 바이락스정 200mg)의 기존 ProductMaster** (이름 ILIKE 조회):

| master id | barcode | GTIN 검산 |
|---|---|---|
| 68dc2800-f31c-4b1c-9416-50fda1f304d6 | 8806428006721 | valid (check=1 ✓) |
| d9fc8e8c-7fb4-498f-abff-2da65c598a84 | 8806428006714 | valid (check=4 ✓) |

→ **약 자체는 이미 유효 barcode master 로 DB 에 존재**한다. 이 pending 은 같은 품목의 또 다른 표준코드
(체크디짓 불량, 수출/구 포장 추정 — 제품총수량 0·포장정보 없음)일 뿐, 신규 등록 대상이 아니다.

## 5. 후속 처리안

| 옵션 | 적합성 | 비고 |
|---|---|---|
| 자동 승격(create master) | ❌ 금지 | invalid GTIN. 잘못된 barcode master 생성. |
| 수동 코드 보정(706→707) 후 승격 | ⚠️ 보류 | **식별자 보정 정책 부재** — 원천 코드 임의 변경 금지. 별도 정책 WO 필요. 또한 제품은 이미 커버됨. |
| **archived (권고)** | ✅ | 제품은 sibling master 로 커버 + 코드 불량 → 데이터 품질 holdout 으로 제외 보관(가역). |
| 문서화된 pending-1 보류 | ✅(대안) | "드럭 pending = 의도적 보류 1건" 으로 남기고 본 IR 로 근거 기록. |
| rejected | △ | 원천 코드 오류 관점에선 가능하나, archived 가 sibling-covered 성격에 더 부합. |

**권고: archived 또는 문서화 보류.** 어느 쪽도 신규 정비 job 을 만들 필요는 없다(1건).
archived 로 정리하려면 기존 후보 `bulk-action archive`(단건) 또는 `promote-master` 아닌 단순 상태 전환으로
가능하나, **1건이므로 정책 결정 후 처리**한다. 이번 IR 범위는 조사·권고까지.

## 6. 금지 / 주의

- ❌ invalid GTIN 후보 자동 승격 금지.
- ❌ 원천 표준코드 임의 보정(706→707) 후 승격 금지(식별자 보정 정책 부재).
- ❌ 제품이 이미 sibling master 로 존재하므로 중복 master 생성 금지.
- ✅ 처리 시 candidate_status 전환만(archived/rejected), ProductMaster/Identifier 불변, hard delete 금지.

## 7. 결론

드럭 pending 은 이제 **의미상 0** 이다(유일 잔여 1건은 "이미 등록된 제품의 체크디짓 불량 표준코드"로,
신규 등록 대상 아님). 드럭 후보 정비는 사실상 마무리. 이 1건은 archived 또는 문서화 보류로 정리하면
드럭 pending = 0(또는 의도적 보류 1)로 깔끔히 닫힌다.

## 부록. 조사 SQL

`scratchpad/remaining_one.sql` — raw_payload(source/top-level) 덤프, 주요 코드, GTIN 체크디짓 재계산,
ProductMaster/Identifier 충돌, 동일 제품 sibling master 조회. 전부 SELECT, DB write 0.
(Korean JSON 키는 `psql -c` 에서 CP949 로 깨져 `.sql` 파일 `-f` UTF-8 로 실행.)

---

*Status: Investigation complete — DB write 0 / code change 0 / migration 0 / apply 0.*
