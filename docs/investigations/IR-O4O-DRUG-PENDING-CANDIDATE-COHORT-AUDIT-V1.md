# IR-O4O-DRUG-PENDING-CANDIDATE-COHORT-AUDIT-V1

> **조사 전용 (read-only).** DB write 0 · 코드 변경 0 · migration 0 · apply 0.
> 목적: 드럭 트랙 `pending` 후보 74,681건이 왜 남아 있는지 코호트별로 분류하고, 승격 가능 여부를 판정한다.
>
> - 선행 IR: `IR-O4O-ADMIN-PRODUCT-DB-MAINTENANCE-REGISTER-MISSING-CANDIDATES-AUDIT-V1`
> - 선행 완료: `CHECK-...-ORPHAN-CANDIDATE-ARCHIVE-APPLY-V1` (고아 53,428 archived 완료)
> - 검증 채널: Cloud SQL Auth Proxy v2 (read-only SELECT, 프로덕션)
> - 작성일: 2026-07-11

---

## 0. 요약 (Executive Summary)

**드럭 pending 74,681건 중 74,680건(99.999%)은 "허가취소된 의약품"(취소일자 존재)이다.** 승격 엔진이
취소 행을 skip 하므로 pending 으로 남았다. **실제 신규 승격 가능 후보는 0건**(비취소 1건도 GTIN
체크디짓 불일치로 부적격).

| 코호트 | 수량 | 성격 | 승격 |
|---|---:|---|---|
| **1. 취소(cancelled)** | **74,680** | 허가취소된 의약품(취소일자 존재). 엔진 skipReason=`cancelled` | ❌ |
| 4. GTIN 체크디짓 불일치 | 1 | 비취소지만 표준코드 체크디짓 실패 | ❌ |
| 2·3·5. 코드없음/포맷오류/필수부족 | 0 | — | — |
| **6. 승격 가능(eligible)** | **0** | — | — |
| **합계** | **74,681** | | |

**판정: (B) 대부분 정합화(archived) 대상 · (D) 승격 기능 불필요.** 이 pending 은 "미등록 후보"가
아니라 **취소된 의약품 허가**다. 고아 53,428 정합화와 동일한 성격(등록/검토 흐름에서 제외)이며,
**다음 WO 는 승격이 아니라 취소 pending 74,680 을 archived 로 정합화**하는 것이 맞다.

---

## 1. 선행 상태 재확인 (실측)

| 항목 | 기대 | 실측 |
|---|---:|---:|
| 드럭 pending (`source_label LIKE 'mfds-drug-master-standard-code%'`) | 74,681 | **74,681** ✅ |
| 고아 잔량 (등록완료 & master 없음) | 0 | **0** ✅ |

## 2. 코호트 분류 방법 (승격 엔진 eligibility ladder 재현)

승격 엔진 `evaluateEligibility`(`drug-master-promotion-apply.service.ts:155`)의 판정 순서를 SQL 로 재현
(first failure wins). 각 코호트는 상호배타적이며 합계 = 74,681.

1. **취소** — `raw_payload->>'isCancelled'='true'` OR `raw_payload->'source'->>'취소일자' IS NOT NULL` → skip `cancelled`
2. **표준코드 없음** — `COALESCE(raw_payload->>'standardCode', normalized_identifier_value)` IS NULL
3. **포맷 오류** — 표준코드가 `^[0-9]{13}$` 아님
4. **체크디짓 불일치** — 13자리지만 GTIN-13 체크디짓 실패 (SQL 로 체크디짓 계산 재현)
5. **필수 부족** — `candidate_name` 또는 `candidate_manufacturer` NULL
6. **승격 가능(eligible)** — 위 전부 통과 → `promoteOne` 에서 conflict/create 판정

> raw_payload 키는 실제 매퍼(`promotionFieldsFromCandidate` / 배치 스캐너 `scanCandidatesPaged`)가 읽는
> 경로만 사용: `취소일자`(=취소), `전문일반구분`(=rx/otc), `standardCode`. 임의 경로 미사용.

## 3. 코호트별 count (실측)

| 코호트 | count |
|---|---:|
| 1_cancelled | **74,680** |
| 4_invalid_check_digit | 1 |
| 2_missing_standard_code | 0 |
| 3_invalid_format | 0 |
| 5_missing_required | 0 |
| 6_eligible_pre_conflict | **0** |
| **합계** | **74,681** |

- 취소 신호 교차검증: `isCancelled='true'` AND `취소일자` 존재 = **74,680** (두 신호 완전 일치), 비취소 = 1.
- 취소일자 연도 분포: 2016~2025 각 3,000~6,200건 고르게 분포(+ sentinel `9999` 172건, `8999` 1건). → **지난 약 10년간 허가취소된 의약품**.

## 4. ProductMaster/ProductIdentifier 충돌 여부

- eligible 집합이 사실상 공집합(1건도 체크디짓 실패)이라 충돌 조사 무의미하나, 안전 확인:
  - eligible nv vs 살아있는 `product_masters.barcode` 충돌 = **0**
  - eligible nv vs active `product_identifiers.normalized_value`(KOREA_DRUG_CODE/GTIN) 충돌 = **0**
- 즉 **신규 create 될 승격 대상이 존재하지 않음**.

## 5. rx/otc 분포 (맥락) 및 고아 53,428 과의 비교

**드럭 pending 74,681 (candidate_category=전문일반구분):**

| 분류 | count |
|---|---:|
| rx (전문의약품) | 43,488 |
| otc (일반의약품) | 28,788 |
| 한약재 | 1,917 |
| null | 486 |
| 원료의약품 | 2 |

**이미 archived 완료된 고아 53,428 (직전 WO, candidate_category):**

| 분류 | count |
|---|---:|
| 한약재 | 39,666 |
| null | 12,615 |
| 원료의약품 | 1,147 |

→ **두 집합은 성격이 다르다.** 고아 53,428 = 한약재/원료/null 계열(drug_unspecified 로 승격됐다가 master
삭제된 잔재). pending 74,681 = **대부분 rx/otc 인데 허가취소된 의약품**(승격 시도조차 안 됨, 취소 skip).
"drug_unspecified 계열인가?"에 대한 답: **아니다** — pending 은 rx/otc 취소분이다.

## 6. raw_payload 주요 필드 구조 (매퍼 ground truth)

Gate A import(`drug-candidate-import.service.ts` + `drug-master-row.mapper.ts`)가 쓰는 구조:

- 컬럼: `candidate_name`=한글상품명, `candidate_manufacturer`=업체명, `candidate_category`=전문일반구분,
  `identifier_type`=`KOREA_DRUG_CODE`(13자리 통과 시), `normalized_identifier_value`=검증된 13자리 표준코드.
- `raw_payload` top-level: `standardCode`(원본), `mfdsCode`(=품목기준코드), `atcCode`, `isCancelled`(bool),
  `cancelledAt`, `groupKey`, `reviewFlags`, `source`(원본 22키 무손실).
- `raw_payload.source` 22키: 한글상품명/업체명/약품규격/제품총수량/제형구분/포장형태/품목기준코드/품목허가일자/
  **전문일반구분**/대표코드/표준코드/제품코드(개정후)/일반명코드(성분명코드)/비고/**취소일자**/양도양수적용(공고)일자/
  양도양수종료일자/일련번호생략여부/일련번호생략사유/국제표준코드(ATC코드)/특수관리약품구분/의약품판독장비구분.

> ⚠️ **원료/한약 구분 전용 필드는 없다.** 약가마스터 데이터셋에 원료/한약 컬럼 부재. candidate_category 의
> `한약재`/`원료의약품` 값은 전문일반구분 칸에 그 문자열이 들어온 경우로, 별도 신뢰 분류축 아님.
> **GTIN 체크디짓**은 단순 regex 로 불가하여 SQL 로 알고리즘 재현(§2-4).

## 7. 코호트별 샘플 (마스킹, 취소 코호트)

| name | mfr | 분류 | 취소일자 | std13 |
|---|---|---|---|---|
| 덕산만응고 | (주)동호팜 | 일반의약품 | 2015-08-27 | 88068170001xx |
| 에버펜플라스타(플루르비프로펜) | (주)동호팜 | 일반의약품 | 2019-08-13 | 88068170003xx |

- 비취소 1건(체크디짓 실패): 바이락스정(아시클로버)[수출명…] / 고려제약(주) / 전문의약품 / 표준코드 8806428006706(체크디짓 불일치).

## 8. 기존 승격 엔진 재사용성 판정

- `evaluatePromotable`(metadata gate: source label+status+link)은 이 74,681 대부분에 **eligible=true 반환**한다
  — **취소 여부를 보지 않기 때문**이다. 실제 취소 배제는 `promoteOne`/`evaluateEligibility` 단계에서 일어난다.
- dry-run 가능: `runCandidatePromotionDryRun`(read-only, `PreloadedPromotionMasterStore`)은 write 0 으로
  전체 엔진을 돌려 `skippedCancelled` 등 코호트 카운트를 낸다. 돌리면 **create 0 / skippedCancelled 74,680**
  이 나올 것(본 IR SQL 과 동치).

**결론: (C) pending 코호트 성격상 bulk 승격 부적합 + (D) 승격 전 정합화가 먼저.**
승격 엔진을 bulk dry-run 으로 돌릴 수는 있으나 **결과가 전부 skip(cancelled)** 이므로 승격 기능을 만들 이유가 없다.

## 9. 승격 가능성 평가 (판정)

| 판정 | 수량 | 대상 |
|---|---:|---|
| 승격 가능 후보 | **0** | 없음 |
| 보류 | 1 | 비취소·체크디짓 실패 1건(수동 확인) |
| 제외/정합화 대상 | **74,680** | 허가취소 의약품 → archived 권장 |
| 별도 트랙 | 0 | (한약재/원료는 위 취소분에 포함, 별도 없음) |

## 10. 다음 WO 추천안

**추천: `WO-O4O-ADMIN-PRODUCT-DB-MAINTENANCE-CANCELLED-DRUG-PENDING-ARCHIVE-V1` (정합화, 승격 아님).**

- 대상: `candidate_status='pending'` AND 드럭 트랙 AND (`isCancelled='true'` OR `취소일자 IS NOT NULL`) = **74,680**.
- 전환: `archived` (고아 정합화와 동일 패턴 — dry-run + confirmation + expectedCount 가드 + 청크 update,
  candidate_status 만 변경, ProductMaster/Identifier 불변, hard delete 없음, migration 금지).
- 근거: 취소된 의약품 허가는 유통 자산 가치 없음(distribution-evidence 원칙). 등록/검토 흐름에서 제외.
- 비취소 1건은 대상에서 제외하고 수동 확인(별도).
- **승격(promote) 기능은 만들지 않는다** — 대상 0.

> 실행 방식은 기존 `product-db-maintenance.controller.ts` 에 대상 필터만 취소조건으로 바꾼 dry-run/apply
> job 을 추가하는 형태로 재사용 가능(엔진 신설 불필요).

## 11. 금지 / 주의 사항

- ❌ pending 74,681 을 "미등록 후보"로 보고 bulk 승격 금지(전부 취소분, create 0).
- ❌ raw_payload 임의 경로로 취소/분류 재계산 금지 — `취소일자`/`isCancelled`/`전문일반구분` 만 사용.
- ❌ 원료/한약을 신뢰 분류축으로 쓰지 말 것(전용 필드 부재).
- ❌ hard delete 금지 — 정합화는 archived 상태 전환(가역).
- ✅ 정합화 WO 도 dry-run + confirmation + expectedCount + 청크 update + 사후검증(고아 정합화와 동형).

## 부록. 조사 SQL

`scratchpad/cohort_audit.sql` — eligibility ladder 분류(GTIN 체크디짓 SQL 재현 포함), rx/otc split,
충돌 검사, 취소신호 교차검증, 취소일자 연도분포, 샘플. 전부 SELECT, DB write 0.

---

*Status: Investigation complete — DB write 0 / code change 0 / migration 0 / apply 0.*
*결론: 드럭 pending 74,681 ≈ 전량 허가취소 의약품. 승격 대상 0. 다음 = 취소 pending archived 정합화 WO.*
