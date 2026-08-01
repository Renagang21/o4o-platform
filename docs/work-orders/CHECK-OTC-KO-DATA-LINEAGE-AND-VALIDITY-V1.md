# CHECK — WO-O4O-OTC-KO-DATA-LINEAGE-AND-VALIDITY-AUDIT-V1

**조사 전용. DB write 0.** 한국어 수정·번역·확대 적용·삭제·canonical 변경 없음.
모든 조사 스크립트는 `SET default_transaction_read_only = on` 으로 시작한다.

---

## 결론부터

**`KO_READY 20,093` 을 영어 번역의 확정 모집단으로 쓰면 안 된다.**
직전 WO 의 20,093 은 **구조·절단 기준**이었고, 이번에 **출처·내용 기준**으로 다시 보니
그중 **744 건이 원문과 모순되거나 위험한 확대 적용**이었다.

| 축 | 수 |
|---|---:|
| 구조 READY (직전 WO) | 20,093 |
| ∩ 내용 검증 통과 | **17,321** |
| ∩ 내용 보류 | 2,028 |
| ∩ **내용 오류** | **744** |

**영어 작업의 안전한 출발점은 17,321 이다.**

---

## 1. 조사한 DB·테이블·필드

| 테이블 | 사용 필드 | 비고 |
|---|---|---|
| `shared_product_descriptions` | `id` `master_id` `content` `source_type` `source_ref_id` `status` `language` `description_type` `deleted_at` | 본체 |
| `product_masters` | `regulatory_type` `drug_category` `status` `mfds_product_id` `mfds_permit_number` `barcode` `specification` | 대상·귀속·포장 |
| `product_drug_extensions` | `atc_code` (+ 원문 텍스트 필드) | **원문 텍스트·성분·제형 전량 NULL** |

스크립트: `otc-ko-lineage-audit.ga.ts` · `otc-ko-dosage-fidelity.ga.ts` · `otc-ko-validity-lock.ga.ts`
절단 판정은 기존 공용 SSOT `otc-ko-truncation-policy.ga.ts` 를 import 했다(규칙 복제 없음).

---

## 2. 각 숫자의 집계 단위와 재현

| 숫자 | 단위 | 재현 |
|---:|---|---|
| **22,408** | KO STORE canonical **문서** | `description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL AND source_type IN (5종)` |
| **22,408** | 연결 ProductMaster | 문서:master = **1:1** |
| **20,093** | 직전 WO 의 구조 기준 `KO_READY` | 절단·빈 값·태그·귀속만 봄. **내용 대조는 하지 않았음** |
| **4,168** | 고유 설명서 **내용** | 앞 200자 정규화 + 길이 (순수 md5 기준은 4,298) |
| **8,852** | 고유 `source_ref_id` | 저작 단위 |
| **3,808** | OTC **EN** canonical 고유 내용 수 | 질문의 `3,809` 와 1 차이 — 같은 축으로 판단 |
| **3,476** | **재현하지 못했다** | 어떤 필터로 나온 수인지 확인 불가. 추정으로 확정하지 않는다 |

> `3,809` 는 **한국어 설명서 수가 아니라 영어 설명서의 고유 내용 수**로 보인다.
> 한국어 고유 내용은 4,168~4,298 이다. 두 수를 같은 축으로 놓으면 안 된다.

---

## 3. 직접 원천 · 확대 적용 · 출처 불명

| 계보 | 문서 | 근거 |
|---|---:|---|
| **DIRECT — 같은 master 에 e약은요 원문 실재** | **19,431** | `source_type='mfds_easy_drug'` SPD 가 같은 master 에 남아 있음 |
| **EXPANDED — 원문 없이 확대 적용** | **2,933** | `source_ref_id` 는 있으나 그 master 에 원문 없음 |
| **NO_LINEAGE — 출처 추적 불가** | **44** | `manual`, `source_ref_id` 없음 |

### `source_ref_id` 의 정체 (중요)

| source_type | 문서 | 고유 ref | ref → 실제 행 | 확대 배율 |
|---|---:|---:|---|---:|
| `o4o_drug_otc_topical` | 2,558 | 2,558 | **e약은요 SPD 로 100% 해소** | 1.00× |
| `mfds_drug_otc` | 15,908 | 5,819 | 어떤 행도 가리키지 않음 | 2.73× (최대 209×) |
| `mfds_drug_otc_nutrition_combo` | 3,545 | 403 | 어떤 행도 가리키지 않음 | **8.80× (최대 585×)** |
| `mfds_easy_drug` | 353 | 71 | 어떤 행도 가리키지 않음 | 4.97× |

`mfds_drug_otc` 의 `source_ref_id` 는 12,033/15,908 이 **UUID v4 형식이 아니다**
(예: `0b98e6f8-d22e-adc7-…`). FK 가 아니라 **내용 지문 그룹 키**다.
따라서 **외래키로 원문을 추적할 수 있는 것은 topical 2,558 뿐**이고,
나머지는 "같은 master 에 원문이 남아 있는가"로만 추적된다.

---

## 4. 원문 대조 — 표본이 아니라 전수

같은 master 에 원문이 있는 문서가 19,431 건이므로 **표본 추출 없이 전량 기계 대조**했다.
의약품 설명서에서 실제로 위험한 두 축(**투여 빈도**, **연령 하한**)을 원문과 1:1로 비교했다.
`만 12세` vs `12세` 같은 표기 차이는 정규화해 오탐을 제거했다.

| 판정 | 문서 |
|---|---:|
| **MATCH** (원문과 일치) | **11,700** |
| FREQ_UNPARSEABLE (외용제 등 `1일 N회` 형식 아님) | 7,544 |
| NO_RAW (원문 없음) | 2,977 |
| **AGE_FLOOR_MISMATCH** | **85** |
| **FREQ_MISMATCH** | **61** |
| **FREQ_AND_AGE_MISMATCH** | **26** |
| RAW_NO_DOSAGE | 15 |
| **실제 모순 합계** | **172** |

### 실측 사례 — 이것이 이번 조사의 핵심

```
master 13d41846-…  (mfds_drug_otc_nutrition_combo)
원문 : 눈의 피로, 근육통·관절통, 신경통, 손발 저림 완화
       15세 이상 소아 및 성인 1회 1정, 1일 3회 / 15세 미만 복용 금지
현행 : "종합비타민 정제 — 비타민 B군·C·D·E + 아연"
       만 8세 이상 어린이 및 성인 1회 1정, 1일 1회 / 만 12개월 미만 금지
```
**제품이 다르다.** 연령 하한 15세 → 8세, 투여 빈도 1일 3회 → 1일 1회.
같은 KO 내용이 **585개 master 까지** 확대 적용된 사례가 있다.

`mfds_drug_otc_nutrition_combo` 는 개별 제품 설명서가 아니라 **성분군 단위 일반 설명서**이며,
그것이 원문 용법·연령이 다른 제품에까지 붙어 있다. 모순 172 건 중 **159 건이 이 source_type** 이다.

---

## 5. 확대 적용 안전성

원문 없이 확대 적용된 문서를, 같은 내용을 공유하면서 **원문이 있는 제품(anchor)** 과 대조했다.
안전지문은 **ATC + 함량 + 제형** 이다(성분 목록·투여경로·첨가제는 DB 미보유 — §6 참조).

| 판정 | 문서 |
|---|---:|
| **SAFE_MATCH** — anchor 와 ATC·함량·제형 일치 | **944** |
| **REVIEW_REQUIRED** — 함량·제형 정보 부족 | **1,033** |
| **UNSAFE_MISMATCH** — anchor 와 불일치 | **572** |
| **LINEAGE_UNKNOWN** — anchor 자체가 없음 | **383** |

**ATC·성분명만 같아서 확대된 사례**: `UNSAFE_MISMATCH` 572 건이 여기 해당한다.
같은 설명서를 쓰지만 ATC·함량·제형 중 하나 이상이 anchor 와 다르다.

---

## 6. 포장단위·바코드 연결

| 항목 | 값 |
|---|---:|
| KO 설명서 보유 master | 22,408 |
| 고유 바코드 | 22,364 (+ 바코드 없음 44) |
| 고유 `mfds_product_id` | 22,364 |
| 고유 설명서 내용 | 4,168 |
| 설명서를 공유하는 문서 | 22,056 |
| 최대 공유 배수 | **585** |

### 구조적 한계 — 반드시 알아야 할 것

- **`mfds_permit_number`(품목기준코드)는 57,572 건 전량 NULL 이다.**
- `mfds_product_id` 는 `HIRA:DRUG_MASTER:<바코드>` 형식으로, **바코드 파생값이지 품목기준코드가 아니다.**
- 즉 **"허가 품목 1개 아래 포장단위 N개" 를 표현하는 그룹 축이 DB 에 존재하지 않는다.**
  현재는 `ProductMaster = 바코드 = 포장 SKU` 1:1 이고, 그 위의 허가 품목 계층이 없다.

따라서 WO 가 요구한 "품목기준코드별 포장단위 수 / 동일 품목·동일 설명서 공유 상품 수" 는
**현재 스키마로는 계산할 수 없다.** 설명서 공유는 품목 계층이 아니라 **내용 해시**로만 관측된다.
포장 수량 차이와 함량·제형 차이도 같은 이유로 구분되지 않는다 —
`specification` 문자열(`206.5밀리그램 / 90 / 정 / 병`)이 유일한 단서이며 `없음 / 0` 인 제품도 많다.

---

## 7. 직전 67건 수정의 위치와 타당성

| 최종 분류 | 문서 |
|---|---:|
| KO_DIRECT_VALID | **62** |
| KO_HOLD | 5 (PROHIBITION_LOST 5 · AGE_CRITERIA_ALL_LOST 4) |

67 건 전부 **같은 master 에 원문이 실재**하고, **용법·연령 모순 0**, **KO_INVALID 0** 이다.
복원 자체는 타당했다. HOLD 5 건은 복원과 무관한 별개의 내용 경고다.

---

## 8. 최종 4계층 분류

| 분류 | 문서 | 의미 |
|---|---:|---|
| **KO_DIRECT_VALID** | **18,268** | 같은 master 에 e약은요 원문 실재 + 용법·연령 모순 없음 |
| **KO_EXPANDED_VALID** | **944** | 원문은 없으나 anchor 와 ATC·함량·제형 일치 |
| **KO_HOLD** | **2,362** | 검토 필요 |
| **KO_INVALID** | **834** | 귀속 오류·원문 모순·위험한 확대 적용 |
| 합계 | **22,408** | 상호배타 · 정확히 일치 |

### KO_INVALID 834 의 내역
| 사유 | 문서 |
|---|---:|
| `EXPANDED_UNSAFE_MISMATCH` | 572 |
| 용법·연령 원문 모순 (FREQ/AGE) | 172 |
| `OFF_TARGET_MASTER` (전문의약품·건기식·일반물품 귀속) | 90 |

### KO_HOLD 2,362 의 내역
`EXPANDED_REVIEW_REQUIRED` 1,033 · `EXPANDED_LINEAGE_UNKNOWN` 383 ·
`AGE_CRITERIA_ALL_LOST` 323 · `PROHIBITION_LOST` 261 · `AGE_NOT_IN_SOURCE` 359 ·
`DOSAGE_TOKEN_NOT_IN_SOURCE` 120 · `EFFICACY_COVERAGE_LOW` 16 · `NUMERIC_NOT_IN_SOURCE` 7
(문서 하나가 복수 사유를 가질 수 있다.)

### source_type 별
| source_type | DIRECT | EXPANDED | HOLD | INVALID |
|---|---:|---:|---:|---:|
| `mfds_drug_otc` | 13,716 | 611 | 1,566 | 15 |
| `o4o_drug_otc_topical` | 2,532 | — | — | 26 |
| `mfds_drug_otc_nutrition_combo` | 1,687 | 333 | 796 | **729** |
| `mfds_easy_drug` | 333 | — | — | 20 |
| `manual` | — | — | — | 44 |

**문제는 `mfds_drug_otc_nutrition_combo` 에 집중돼 있다** — 3,545 중 729(20.6%)가 INVALID,
796 이 HOLD 다. `mfds_drug_otc` 15,908 은 INVALID 15(0.09%)로 매우 양호하다.

---

## 9. 세 숫자의 분리 (WO 가 요구한 핵심)

| 구분 | 수 | 의미 |
|---|---:|---|
| **직접 검증된 한국어 설명서** | **18,268** | e약은요 원문과 직접 대조 가능하고 모순 없음 |
| **안전하게 확대 적용된 상품** | **944** | 원문은 없으나 ATC·함량·제형이 anchor 와 일치 |
| **포장단위별 시판 상품** | **계산 불가** | 품목기준코드 축이 DB 에 없다(§6) |

세 번째 숫자는 **추정으로 채우지 않았다.** 허가 품목 계층이 생기기 전에는 산출할 수 없다.

---

## 10. 영어 기준본으로 쓸 수 있는가

**부분적으로만 가능하다.**

| 축 | 수 |
|---|---:|
| 구조 READY ∩ 내용 DIRECT_VALID | 16,377 |
| 구조 READY ∩ 내용 EXPANDED_VALID | 944 |
| **영어 작업 안전 출발점** | **17,321** |
| 구조 READY 인데 내용 HOLD | 2,028 |
| **구조 READY 인데 내용 INVALID** | **744** |
| 구조 HOLD 인데 내용은 DIRECT_VALID | 1,891 |

- **744 건은 절대 영어로 번역하면 안 된다.** 구조는 멀쩡해서 직전 WO 가 READY 로 분류했지만,
  원문과 용법·연령이 모순되거나 위험한 확대 적용이다. 번역하면 오류가 그대로 증식한다.
- 반대로 **1,891 건은 내용이 정상인데 절단 때문에 막혀 있다.** 절단 복구가 끝나면 회수된다.

---

## 11. 수정이 필요한 대상

| 유형 | 문서 | 필요한 조치 |
|---|---:|---|
| 위험한 확대 적용 | 572 | 확대 적용 해제 후 제품별 원문 기준 재저작 |
| 용법·연령 원문 모순 | 172 | 원문 기준 재저작 (성분군 일반 설명서 사용 중단) |
| 귀속 오류 | 90 | 대상 밖 — OTC 모집단에서 제외 |
| 확대 적용 근거 부족 | 1,416 | ATC·함량·제형 데이터 확보 후 재판정 |
| 내용 경고 | 946 | 원문 대조 후 개별 판단 |

---

## 12. DB write 0 확인

- 모든 스크립트 read-only 트랜잭션. UPDATE/INSERT/DELETE 문 **없음**.
- KO·EN·zh·ja canonical 변경 0 / ProductMaster 변경 0 / 신규 설명서 생성·삭제 0
- 확대 적용·배포 0 / HFF 무접촉 / `pnpm-lock.yaml` 무접촉 / 다른 세션 파일 무접촉
- 전체 build 미실행

---

## 13. 산출물

| 파일 | 내용 |
|---|---|
| `otc-ko-lineage-audit.ga.ts` | 모집단·계보·내용 지문·확대 적용·포장 조사 |
| `otc-ko-dosage-fidelity.ga.ts` | 투여 빈도·연령 하한 원문 1:1 전수 대조 |
| `otc-ko-validity-lock.ga.ts` | 4계층 분류 + 회계 검증 |
| `…/data/otc-ko-lineage-audit.ga.json` | 계보·집계 원장 |
| `…/data/otc-ko-lineage-classification.ga.json` | 문서별 계보·지문 판정 |
| `…/data/otc-ko-expansion-safety.ga.json` | 확대 적용 안전성 원장 |
| `…/data/otc-ko-dosage-fidelity.ga.json` | 용법·연령 대조 원장(모순 172건 전건) |
| `…/data/otc-ko-validity-lock.ga.json` · `otc-ko-validity-classification.ga.json` | 4계층 잠금 |

---

## 다음 작업 권고 순서

1. **`mfds_drug_otc_nutrition_combo` 3,545 건 재검토** — INVALID 729 + HOLD 796.
   성분군 일반 설명서를 제품에 확대 적용하는 방식 자체가 타당한지 결정해야 한다.
2. **위험한 확대 적용 572 건 해제** — 제품별 원문 기준으로 되돌린다.
3. **허가 품목 계층 도입 검토** — 품목기준코드 축이 없어 포장단위 회계가 불가능하다.
4. **영어 작업은 17,321 로 시작** — 744 는 반드시 제외한다.
