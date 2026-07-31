# OTC EN 전수 점검 배치 01 — 사람이 읽는 요약

- batch_id: `otc-en-audit-batch-01` · 모집단 22011 · 이번 배치 5000 · **DB write 0**
- 기존 EN 보유 5000 · EN 미보유 0

## 1. 분류 (상호배타 · 합계 = 배치 수)

| 분류 | 수 | 처리 |
|---|---:|---|
| PASS_EXISTING | 4751 | 변경 없음 |
| TRANSLATED_MISSING | 0 | 대응 EN 부재 0 |
| RETRANSLATED_INVALID | 1 | 확정 결함 |
| REVIEW_REQUIRED | 248 | 사람 검토 |

## 2. 검토 사유별

| 사유 | 문서 수 |
|---|---:|
| `NUMERIC_VALUE_MISSING_IN_EN` | 211 |
| `DOSE_LIMIT_SENTENCE_MISSING` | 55 |
| `POSSIBLE_ROUTE_VERB_ISSUE` | 31 |

## 3. 안전 상한 문장 소실 — 최우선 검토 (55건)

KO 가 일일 최대 용량을 **수치로** 명시했으나 EN 에는 수치 상한이 어떤 형태로도 없는 문서.
표기 변환(4,000 mg → 4 g)·문장 재구성까지 인정한 뒤에도 남은 건이다.

| seq | 상품명 | source_type | 신호 | 소실 수치 |
|---|---|---|---|---|
| 33 | 콜로덤에스액 | mfds_drug_otc | DOSE_LIMIT_SENTENCE_MISSING |  |
| 170 | 펜싹콜연질캡슐 | mfds_drug_otc | NUMERIC_VALUE_MISSING_IN_EN,DOSE_LIMIT_SENTENCE_MISSING | 4000mg |
| 210 | 알카파워정 | mfds_drug_otc | DOSE_LIMIT_SENTENCE_MISSING |  |
| 263 | 큐어콜플러스연질캡슐 | mfds_drug_otc | NUMERIC_VALUE_MISSING_IN_EN,DOSE_LIMIT_SENTENCE_MISSING | 4000mg |
| 297 | 펜싹코프연질캡슐 | mfds_drug_otc | NUMERIC_VALUE_MISSING_IN_EN,DOSE_LIMIT_SENTENCE_MISSING | 4000mg |
| 376 | 에모펜씨정 | mfds_drug_otc | NUMERIC_VALUE_MISSING_IN_EN,DOSE_LIMIT_SENTENCE_MISSING | 4000mg |
| 394 | 아드린정 | mfds_drug_otc | NUMERIC_VALUE_MISSING_IN_EN,DOSE_LIMIT_SENTENCE_MISSING | 4000mg |
| 425 | 판콜에스내복액 | mfds_drug_otc | NUMERIC_VALUE_MISSING_IN_EN,DOSE_LIMIT_SENTENCE_MISSING | 4000mg |
| 473 | 엔디콜정 | mfds_drug_otc | NUMERIC_VALUE_MISSING_IN_EN,DOSE_LIMIT_SENTENCE_MISSING | 4000mg |
| 642 | 모드코프에스연질캡슐 | mfds_drug_otc | NUMERIC_VALUE_MISSING_IN_EN,DOSE_LIMIT_SENTENCE_MISSING | 4000mg |
| 718 | 마더스코연질캡슐 | mfds_drug_otc | NUMERIC_VALUE_MISSING_IN_EN,DOSE_LIMIT_SENTENCE_MISSING | 4000mg |
| 940 | 지니펜정 | mfds_drug_otc | NUMERIC_VALUE_MISSING_IN_EN,DOSE_LIMIT_SENTENCE_MISSING | 4000mg |
| 1060 | 스파맥정 | mfds_drug_otc | NUMERIC_VALUE_MISSING_IN_EN,DOSE_LIMIT_SENTENCE_MISSING | 4000mg |
| 1177 | 이부플러스생정 | mfds_drug_otc | DOSE_LIMIT_SENTENCE_MISSING |  |
| 1247 | 콜민코프연질캡슐 | mfds_drug_otc | NUMERIC_VALUE_MISSING_IN_EN,DOSE_LIMIT_SENTENCE_MISSING | 4000mg |

## 4. 확정 결함 (1건)

| seq | 상품명 | source_type | 코드 | 소실 수치 |
|---|---|---|---|---|
| 430 | 일양아이콤연질캡슐 | mfds_drug_otc_nutrition_combo | ABNORMAL_REPETITION |  |

## 5. 그 밖의 검토 신호

- 수치 값 소실 `NUMERIC_VALUE_MISSING_IN_EN`: 211건 (그중 용량·농도 단위 소실 78건)
- route 동사 `POSSIBLE_ROUTE_VERB_ISSUE`: 31건 — KO 에 경구 표현이 전혀 없는데 EN 이 제품을 take 로 옮긴 후보

| seq | 상품명 | source_type | 신호 | 소실 수치 |
|---|---|---|---|---|
| 10 | 엘도비캡슐(에르도스테인) | mfds_drug_otc | NUMERIC_VALUE_MISSING_IN_EN | 25mL |
| 54 | 진고그린정80밀리그램(은행엽건조엑스) | mfds_drug_otc | NUMERIC_VALUE_MISSING_IN_EN |  |
| 74 | 속펜하겐정 | mfds_drug_otc | NUMERIC_VALUE_MISSING_IN_EN |  |
| 78 | 디쿨파워플라스타(디클로페낙나트륨) | o4o_drug_otc_topical | NUMERIC_VALUE_MISSING_IN_EN |  |
| 130 | 미놀노즈점비액(자일로메타졸린염산염) | mfds_drug_otc | NUMERIC_VALUE_MISSING_IN_EN |  |
| 170 | 펜싹콜연질캡슐 | mfds_drug_otc | NUMERIC_VALUE_MISSING_IN_EN,DOSE_LIMIT_SENTENCE_MISSING | 4000mg |
| 191 | 어린이타이레놀현탁액(아세트아미노펜) | mfds_drug_otc | NUMERIC_VALUE_MISSING_IN_EN |  |
| 209 | 대웅바이오덱시부프로펜정300밀리그램 | mfds_drug_otc | NUMERIC_VALUE_MISSING_IN_EN | 1200mg |
| 263 | 큐어콜플러스연질캡슐 | mfds_drug_otc | NUMERIC_VALUE_MISSING_IN_EN,DOSE_LIMIT_SENTENCE_MISSING | 4000mg |
| 267 | 디클로맥스플라스타(디클로페낙나트륨) | o4o_drug_otc_topical | NUMERIC_VALUE_MISSING_IN_EN |  |
