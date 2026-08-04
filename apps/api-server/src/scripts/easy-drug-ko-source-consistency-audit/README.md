# WO-O4O-EASY-DRUG-KO-SOURCE-CONSISTENCY-AUDIT-V1

**제품별 식약처 e약은요 공식 원문 ↔ 현재 KO STORE canonical 설명서 내용 정합성 전수 검증**

- 단계: **read-only 감사** — DB write 0
- 판정 규칙 버전: `KO_SOURCE_CONSISTENCY_V1`
- 독립검증 결과: **PASS** (`results/independent-verification.json`)

---

## 1. 왜 이 감사를 하는가

직전 구조 절단 복구 트랙(`aa5e529e7`)은 **구조**를 복구했을 뿐이다. 그 과정에서 드러난 사실:

- 복구 대상 1,561건 중 실제 복구 925건, 공식 원문에서 완결본을 찾지 못한 항목 609건
- 수치 충돌 2건, 초기 구현에서 다른 섹션 문장 혼입
- 구조 READY 수가 판정기마다 `18,223` / `16,950` 로 갈림

따라서 `16,950` 은 번역 확정 모집단이 아니라 **구조상 보수적으로 통과한 잠정 모집단**이다.
이 감사는 두 값을 모두 잠정값으로 버리고, **제품별 원문 대조**로 번역 모집단을 다시 산출한다.

원칙:

- 제품별 e약은요 원문이 기준
- 구조 READY만으로 번역 승인 금지
- 같은 성분군·ATC·제품명만으로 동일 설명서 인정 금지

## 2. 대조 단위

ProductMaster 단위(19,431)로 대조하면 동일 본문을 수천 번 재대조하게 된다.
**(허가품목 itemSeq × canonical 본문 md5)** 로 접는다.

| 축 | 수 |
|---|---:|
| 대조 단위 | **5,198** |
| 허가품목(itemSeq) | 4,757 |
| 포괄 ProductMaster | 19,431 |
| 서로 다른 본문 | 4,232 |

부수 사실 — 이것이 "제품명·성분군으로 동일 설명서 인정 금지" 규칙의 근거다:

- **387 허가품목**이 한 품목 안에서 서로 다른 canonical 본문을 갖는다 (포장군 내 불일치)
- **331 본문**이 서로 다른 허가품목에 걸쳐 재사용된다 (최대 **48** 품목이 한 본문 공유)

## 3. 대조 축 14개 → 판정 8종

효능·효과 / 용법·용량 / 연령 / 1회량 / 1일 횟수 / 투여 경로 / 사용 기간·간격 /
경고·금기 / 상담 필요 조건 / 이상반응 / 상호작용 / 부정어와 경고 강도 /
다른 제품 내용 혼입 / 원문에 없는 확대 설명

| 판정 | 의미 | 번역 |
|---|---|:---:|
| `KO_SOURCE_MATCH` | 원문과 내용 일치 | 가능 |
| `KO_DISPLAY_ONLY_DIFFERENCE` | 표현·배치만 다름 | 가능 |
| `KO_MISSING_CONTENT` | 원문 내용 누락 | KO 복구 후 재검 |
| `KO_EXTRA_CONTENT` | 원문에 없는 확대 설명 | KO 수정 후 재검 |
| `KO_CONTRADICTED` | 원문과 모순 | 즉시 제외 |
| `KO_WRONG_ATTRIBUTION` | 다른 제품 설명서 | 기존 설명서 해제 |
| `KO_SOURCE_UNRESOLVED` | 원문 자체 결손 | HOLD |
| `KO_STRUCTURE_REMAINING` | 구조 결함 잔존 | 구조 복구 후 재검 |

판정 우선순위(심각도 높은 쪽 우선):
`STRUCTURE_REMAINING` > `SOURCE_UNRESOLVED` > `WRONG_ATTRIBUTION` > `CONTRADICTED` >
`MISSING_CONTENT` > `EXTRA_CONTENT` > `DISPLAY_ONLY_DIFFERENCE` > `SOURCE_MATCH`

## 4. 결과

| 판정 | 대조단위 | 허가품목 | ProductMaster |
|---|---:|---:|---:|
| KO_DISPLAY_ONLY_DIFFERENCE | 1,844 | 1,478 | 7,085 |
| KO_MISSING_CONTENT | 2,627 | 2,581 | 9,751 |
| KO_EXTRA_CONTENT | 246 | 235 | 843 |
| KO_STRUCTURE_REMAINING | 278 | 270 | 909 |
| KO_CONTRADICTED | 161 | 151 | 608 |
| KO_WRONG_ATTRIBUTION | 32 | 32 | 203 |
| KO_SOURCE_UNRESOLVED | 10 | 10 | 32 |
| **KO_SOURCE_MATCH** | **0** | 0 | 0 |

`KO_SOURCE_MATCH` 0 은 정상이다. 현재 canonical 은 원문을 그대로 옮긴 문서가 아니라
카드형으로 재구성된 문서이므로, 축자 동일은 원리상 나오지 않는다.

### 확정 번역 모집단

**`KO_SOURCE_MATCH` + `KO_DISPLAY_ONLY_DIFFERENCE` 만** 승인한다.

| 축 | 수 |
|---|---:|
| 대조 단위 | **1,844** |
| 허가품목 (전 본문 승인) | **1,478** |
| ProductMaster | **7,085** |

기존 잠정값 `16,950` / `18,223` 대비 **7,085** 로 축소된다.
차이는 구조가 아니라 **내용 결함**이며, 대부분 `KO_MISSING_CONTENT` 다.

### 주요 결함 축

| 축·유형 | 건수 | 성격 |
|---|---:|---|
| `sideEffect::MISSING` | 2,446 | 카드형 문서에 이상반응 절이 아예 없음 — 최대 단일 결함 |
| `caution::MISSING` | 1,387 | 금기 대상 열거가 부분만 반영 |
| `interaction::MISSING` | 1,375 | 병용 금기 문장 누락 |
| `efficacy::MISSING` | 651 | 적응증 일부 탈락 |
| `extraIndication::EXTRA` | 499 | 원문에 없는 개념 추가 |
| `prohibition::MISSING`/`WEAKENED` | 312 / 299 | 금지 표현이 사라지거나 약화 |
| `age`/`interval`/`perDose`/`perDay` `::CONTRADICT` | 97 / 69 / 29 / 14 | **수치 모순** — 즉시 제외 대상 |

`KO_WRONG_ATTRIBUTION` 32건은 전부 `mfds_drug_otc_nutrition_combo` 에서 나왔다.
`KO_STRUCTURE_REMAINING` 278건은 직전 트랙의 "완결본을 찾지 못한 609건" 과 같은 뿌리다.

## 5. 파일

| 파일 | 역할 |
|---|---|
| `export-audit-pairs.sql` | 대조 단위 5,198건 read-only export |
| `audit-ko-source-consistency.mjs` | 대조 엔진 (DB 접근 없음) |
| `verify-audit-independently.mjs` | **독립검증기** — 엔진을 import 하지 않고 같은 입력에서 다른 구현으로 재도출 |
| `results/audit-summary.json` | 판정 집계 |
| `results/verdict-index.jsonl` | 단위별 판정 (다음 단계 입력) |
| `results/independent-verification.json` | 독립검증 결과 |

### 실행

```sh
# 1) export (read-only 세션)
psql ... -At -f export-audit-pairs.sql > pairs.jsonl
# 2) 대조
node audit-ko-source-consistency.mjs --in pairs.jsonl --out audit_out
# 3) 독립검증
node verify-audit-independently.mjs --in pairs.jsonl --audit audit_out
```

## 6. 독립검증

검증기는 엔진을 **import 하지 않는다.** 구현을 공유하면 같은 버그를 함께 통과시키므로,
의도적으로 다른 방법을 쓴다 — 문장 3-gram 커버리지 대신 **어절 포함 검사**,
용량 정규식 대신 **문맥 창 파싱**, 귀속 Jaccard 대신 **원문 효능 문자열 동일성**.

| 검사 | 결과 |
|---|---|
| V1 모집단 (units·permits·masters 재계수) | 일치 |
| V2 인덱스 정합 (중복·누락·판정 불일치) | 0건 |
| V3 **승인 안전성** — 승인 1,844건에 독립 결함 | **0건** |
| V4 배제 근거 — 배제 3,354건 | 독립 근거 2,201 / 부분반영(보수적 배제) 736 / 검증범위 밖 축 408 / 근거 없음 **9 (0.27%)** |
| V5 확정 모집단 재산출 | 일치 |

V3 이 0 인 것이 핵심이다. **번역 승인 방향의 오탐이 없다** — 즉 이 모집단은 안전하다.
V4 의 9건(0.27%)은 반대 방향(과잉 배제)이며 안전 측 오차다.

### 감사 중 제거한 판정기 오탐

정확도가 확정 모집단의 전제이므로, 발견한 오탐은 모두 제거했다.

| 오탐 | 원인 | 조치 |
|---|---|---|
| `otic` 경로 1,092건 | `점이` 가 "궁금한 **점이** 있으면" 에 매칭 | 어휘를 `점이액·점이제·귀에 넣` 등으로 한정 |
| `route` MISSING 321건 | 관장약·외용제의 "**복용**하지 마십시오" 경고가 `oral` 로 추론됨 | 경로는 **용법 문맥에서만** 판정 |
| `prohibition` MISSING 1,017건 | 금지 어휘가 `마십시오` 체만 인식 | `마세요`·`마시오` 체 추가 |
| 수치축 62% 오탐 | 카드형 문서가 같은 값을 배지·요약·본문에 반복 → 다중집합 카운팅이 유령 초과 생성 | **집합** 비교로 전환 |
| 용량 모순 오탐 | 원문 전각 물결(`～`·`∼`)·`100 mg` 공백 표기 | 수치축 추출 전 표기 정규화 |
| 용량 모순 오탐 | 원문이 `1회 0.5~1정(100~200 mg)` 로 병기, 본문은 뒤 단위 선택 | 원문에 그대로 있는 값은 모순에서 제외 |
| `extraIndication` 조각 오탐 1,251건 | 원문 "…에 사용합니다" vs 본문 "…에 사용하는 일반의약품입니다" 어미 차 | 내용어 토큰 단위 비교로 전환 |
| `storage` 유래 문장이 "원문에 없는 내용" 으로 집계 | 보관법 절이 대조 코퍼스에서 빠져 있었음 | 코퍼스에 7개 절 전부 포함 |
| `strength` 모순 609건 | ProductMaster 성분·함량은 원문에 없는 것이 정상이고, 함량은 14축 밖 | 판정 축에서 제외, 참고 기록만 |

## 7. 다음 순서

1. **KO 기준본 확정** — `KO_MISSING_CONTENT` 2,627 / `KO_EXTRA_CONTENT` 246 KO 복구·수정 후 재검
2. EN 240건 원문 대조
3. 기존 영어 전체 검증
4. 중국어·일본어 번역

`KO_CONTRADICTED` 161 · `KO_WRONG_ATTRIBUTION` 32 는 번역 대상이 아니라
**현행 설명서 자체의 시정 대상**이다. 특히 오귀속 32건은 기존 설명서 해제가 필요하다.
