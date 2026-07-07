# WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2-V1

## 0. 중요 지시

이번 요청은 **작업 요청서 실행**이다.

이번 단계의 범위는 **점안제 원문 grounding + 인공눈물 중심 설명서 초안 작성 + CHECK 작성**까지다.

금지:

- DB write 금지
- `product_candidate_description_drafts` insert/update/upsert 금지
- `shared_product_descriptions` insert/update 금지
- `ProductDrugExtension` 변경 금지
- `ProductMaster` / `ProductCandidate` 상태 변경 금지
- canonical 승격 금지
- registry 상태 직접 변경 금지
- 매장 콘텐츠, QR, POP, 태블릿 연결 금지
- 처방의약품 설명 작성 금지

이번 단계는 **점안제 설명서 초안 작성 dry-run**이다.  
운영 DB에는 SELECT만 허용한다.

---

## 1. 작업 목적

비경구 OTC 설명서 2단계 첫 batch로, 점안제 중 **인공눈물·윤활 점안제 계열**을 우선 대상으로 설명서 초안을 작성한다.

1단계 조사 결과:

```text
OTC ProductMaster 총수: 57,572
비경구 후보: 6,952
점안제 후보: 1,392
점안제 e약은요 원문 보유: 913 / 66%
S01XA20 인공눈물 계열: 897
```

이번 작업의 핵심은 `S01XA20`을 하나로 병합하지 않고, 성분군별로 분리해 설명서를 작성하는 것이다.

---

## 2. 기준 문서

먼저 확인한다.

```text
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-NONORAL-STAGE1-INVENTORY-AND-PRIORITY-V1.md
docs/work-orders/WO-O4O-DRUG-OTC-DESCRIPTION-NONORAL-STAGE1-INVENTORY-AND-PRIORITY-V1.md
docs/work-orders/WO-O4O-DRUG-OTC-DESCRIPTION-NONORAL-END-TO-END-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-V1.md
```

있으면 추가 확인한다.

```text
docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md
docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md
```

누락 문서는 CHECK에 기록하되 작업을 중단하지 않는다.

---

## 3. 작업 범위

### 이번 단계에서 한다

1. 운영 DB read-only로 점안제 후보를 재확인한다.
2. `shared_product_descriptions.content` 원문 보유 점안제를 우선 대상으로 삼는다.
3. 인공눈물 성분군을 분리한다.
4. 각 성분군별 대표 group 후보를 만든다.
5. 원문 근거가 충분한 그룹만 설명서 초안을 작성한다.
6. 근거 부족·성분 불명확·고위험 점안제는 작업 문서에만 보류 사유를 남긴다.
7. CHECK 문서를 작성한다.

### 이번 단계에서 하지 않는다

- 점안제 전체 1,392건 전량 작성
- 항알레르기 점안제 본문 작성
- 충혈제거 복합 점안제 본문 작성
- 브랜드명만 있고 성분 불명확한 점안제 본문 작성
- DB 반영

---

## 4. 우선 대상

1단계 조사 기준 우선 대상:

| 성분군 | 1단계 실측 | 처리 |
|---|---:|---|
| CMC / 카르복시메틸셀룰로오스 | 441 | 우선 작성 |
| 트레할로스 | 122 | 우선 작성 |
| 포비돈 | 25 | 우선 작성 |
| 히알루론산 | name 명시 6 + 원문 확인분 | 원문 확인 후 작성 |
| PDRN / 폴리데옥시리보뉴클레오티드 | other 내 다수 추정 | 원문 확인 후 작성 |

우선 작성 조건:

```text
점안제 route 명확
성분군 명확
e약은요 또는 SPD content 원문 보유
효능·사용법·주의사항 근거 확인 가능
OTC 일반의약품
```

---

## 5. 보류 대상

아래는 이번 단계에서 본문을 작성하지 않는다.

| 대상 | 사유 |
|---|---|
| 브랜드명만 있고 성분이 name에 없는 점안제 | 원문에서 성분 확정 필요 |
| 항알레르기 점안제 | 연령, 렌즈, 사용 기간, 병용 주의 필요 |
| 충혈제거 점안제 | 장기 사용, 녹내장, 심혈관 질환 주의 |
| 복합 점안제 | 성분 조합·함량별 분리 필요 |
| 세안액 | 점안제와 route/사용법 다름 |
| 경구 눈영양제 | 점안제가 아니므로 제외 |

보류 항목은 DB 상태값으로 만들지 않고 CHECK에만 기록한다.

---

## 6. group_key 기준

형식:

```text
drug_otc::single::ophthalmic::{ingredient_key}::{strength_key}::eye_drop
```

예:

```text
drug_otc::single::ophthalmic::carboxymethylcellulose_sodium::0.5pct::eye_drop
drug_otc::single::ophthalmic::trehalose::3pct::eye_drop
drug_otc::single::ophthalmic::povidone::2pct::eye_drop
drug_otc::single::ophthalmic::sodium_hyaluronate::0.1pct::eye_drop
```

주의:

- 병 용량 `0.5mL`, `5mL`, `10mL`는 함량으로 쓰지 않는다.
- 농도 `%`, `mg/mL` 등을 우선한다.
- 히알루론산 0.1%, 0.15%, 0.18%, 0.3%는 별도 그룹 후보로 둔다.
- 같은 S01XA20이라도 성분군이 다르면 병합 금지.

---

## 7. 설명서 작성 형식

각 초안은 아래 형식을 따른다.

```md
## [성분명] [농도] 점안제

| 항목 | 내용 |
|---|---|
| 성분 |  |
| 분류 | 일반의약품 |
| route | 점안 |
| 작용 |  |
| 주요 증상 |  |
| 선택 포인트 |  |
| 주의 대상 |  |

**효능·효과**  
...

**사용 안내**  
...

**주의 대상**  
...

**성분 기준 선택**  
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.  
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.  
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.
```

공통 점안 주의문구:

- 눈에만 사용한다.
- 용기 끝이 눈, 손, 속눈썹에 닿지 않게 한다.
- 오염, 변색, 혼탁이 의심되면 사용하지 않는다.
- 심한 통증, 시야 이상, 심한 충혈, 증상 악화가 있으면 사용을 중단하고 약사 또는 의사에게 확인한다.
- 콘택트렌즈 착용 중 사용 가능 여부는 제품별 안내를 확인한다.

---

## 8. CHECK 문서

작성 파일:

```text
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2-V1.md
```

포함 항목:

1. 작업 일시
2. 사용한 기준 문서
3. DB read-only 확인
4. 점안제 후보 재확인
5. 성분군별 후보 수
6. 원문 grounding 방식
7. 작성한 설명서 초안 목록
8. 보류한 그룹과 사유
9. registry 반영 제안
10. 금지사항 준수 확인

---

## 9. 성공 기준

- 점안제 후보 중 원문 보유 인공눈물 성분군이 분리됨
- CMC / 트레할로스 / 포비돈 / 히알루론산 / PDRN 중 근거 충분 그룹에 대해 초안 작성
- S01XA20 과병합 없음
- 성분 불명확 제품은 작성하지 않음
- 항알레르기·충혈제거·복합 점안제는 이번 단계에서 제외 또는 보류
- DB write 0
- canonical 승격 0

---

## 10. 완료 보고 형식

```text
완료 보고 — WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2-V1

수행:
- 점안제 후보 read-only 재확인
- 인공눈물 성분군 분리
- e약은요/SPD 원문 grounding
- 근거 충분 그룹 설명서 초안 작성
- 보류 그룹 사유 기록

결과:
- 점안제 후보:
- 원문 보유:
- 작성 그룹:
- 작성 초안 수:
- 보류 그룹:
- registry 반영 제안:

금지사항:
- DB write 0
- product_candidate_description_drafts 변경 0
- shared_product_descriptions 변경 0
- ProductDrugExtension 변경 0
- canonical 승격 0

산출물:
- docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2-V1.md

다음 제안:
- BATCH-TOPICAL-LOW-RISK-DRAFT
- 또는 BATCH-EYE-ANTIALLERGY-CURATION
```
