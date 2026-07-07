# WO-O4O-DRUG-OTC-DESCRIPTION-NONORAL-STAGE1-INVENTORY-AND-PRIORITY-V1

## 1. 목표

비경구 일반의약품 설명서 제작의 1단계로, 운영 DB를 read-only로 조사하여 **실제 설명서 작성 대상 제품군을 route별로 확정**한다.

이번 작업은 설명서 본문 작성이 아니다.  
이번 작업의 목적은 비경구 제품을 무리하게 쓰기 시작하기 전에, 어떤 route와 제품군부터 설명서를 만들지 결정할 수 있도록 대상 목록과 우선순위를 만드는 것이다.

핵심 목표:

- OTC ProductMaster 중 비경구 후보를 추출한다.
- 점안, 외용, 파스/첩부, 점비/비강, 좌제, 질정, 구강국소 route로 분류한다.
- 포장 용량과 실제 성분 농도/함량을 분리한다.
- 같은 성분·농도·제형·route로 묶을 수 있는 설명서 그룹 후보를 만든다.
- 근거가 충분해 2단계에서 바로 설명서 작성 가능한 그룹을 우선순위화한다.
- 근거가 부족하거나 위험도가 높은 그룹은 DB 상태값으로 만들지 않고, 작업 문서에만 보류 사유를 남긴다.

## 2. 배경

비경구 설명서는 경구제보다 route별 주의사항 차이가 크다.

예:

- 점안제: 오염 방지, 렌즈 착용, 눈 통증/시야 이상 확인
- 외용제: 상처·점막·넓은 부위·장기 사용 주의
- 파스/첩부제: 부착 시간, 피부 자극, NSAID 중복, 광과민 주의
- 점비제: 연속 사용 제한, 반동성 비충혈, 고혈압/심혈관 질환 주의
- 좌제/질정: 경구 복용 금지, 사용 부위와 삽입 방법 확인
- 구강국소제: 삼킴 여부, 사용 간격, 국소 자극 확인

따라서 1단계에서는 설명서 본문을 작성하지 않고, 실제 제품군을 정확히 나누는 데 집중한다.

## 3. 기준 문서

먼저 아래 문서를 확인한다.

```text
docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md
docs/work-orders/WO-O4O-DRUG-OTC-DESCRIPTION-NONORAL-END-TO-END-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-V1.md
docs/checks/CHECK-O4O-DRUG-STORE-DESCRIPTION-PIPELINE-READONLY-AUDIT-V1.md
```

있으면 추가로 확인한다.

```text
docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-REGISTRY-POPULATE-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-ROUTE-TEMPLATE-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-HIGH-RISK-GROUP-CURATION-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-GROUPING-DICTIONARY-SEED-V1.md
```

누락 문서가 있으면 작업을 중단하지 말고 CHECK에 기록한다.

## 4. 작업 범위

### 4.1 이번 단계에서 한다

1. 운영 DB read-only로 OTC ProductMaster 전체 count를 확인한다.
2. 비경구 후보를 제품명, 규격, 성분 요약, 제형 키워드 기준으로 추출한다.
3. route별 후보 수를 산출한다.
4. 같은 설명서로 묶을 수 있는 group 후보를 만든다.
5. 포장 용량과 성분 농도/함량을 분리한다.
6. 점안제 S01XA20 인공눈물 과병합 방지 기준을 적용한다.
7. 2단계에서 바로 초안 작성할 우선순위 batch를 제안한다.
8. CHECK 문서를 작성한다.

### 4.2 이번 단계에서 하지 않는다

- 설명서 본문 작성
- DB write
- `product_candidate_description_drafts` insert/update/upsert
- `shared_product_descriptions` insert/update
- `ProductDrugExtension` 임상/설명 텍스트 입력
- `ProductMaster` 또는 `ProductCandidate` 상태 변경
- canonical 승격
- registry 상태 직접 변경
- 매장 콘텐츠, QR, POP, 태블릿 연결
- 처방의약품 설명 작성

## 5. 조사 대상

기본 대상:

```text
product_masters.drug_category = 'otc'
regulatory_type = DRUG 계열
```

실제 스키마에 route, single/combo, strength 전용 컬럼이 없으면 다음 필드를 조합해 파생한다.

```text
product_masters.name
product_masters.regulatory_name
product_masters.specification
product_masters.manufacturer_name
product_drug_extensions.ingredient_summary
product_drug_extensions.active_ingredients
product_drug_extensions.dosage_form
product_drug_extensions.strength
product_drug_extensions.efficacy_text
product_drug_extensions.dosage_text
product_drug_extensions.caution_text
product_drug_extensions.atc_code
```

## 6. route 분류 기준

| route | 포함 키워드 예 | batch |
|---|---|---|
| ophthalmic | 점안, 안약, 인공눈물, 안구건조, 결막 | BATCH-EYE-DRAFT |
| topical | 크림, 연고, 겔, 로션, 외용액, 도포 | BATCH-TOPICAL-DRAFT |
| patch | 파스, 첩부, 카타플라스마, 플라스타 | BATCH-PATCH-DRAFT |
| nasal | 점비, 비강, 나잘, 분무 | BATCH-NASAL-DRAFT |
| rectal | 좌제, 항문, 직장 | BATCH-RECTAL-DRAFT |
| vaginal | 질정, 질좌제, 질캡슐 | BATCH-VAGINAL-DRAFT |
| oral_local | 트로키, 구강정, 가글, 함소, 구강용 | BATCH-ORAL-LOCAL-DRAFT |

주의:

- "액"은 외용액, 점안액, 내용액이 섞일 수 있으므로 단독 키워드로 route를 확정하지 않는다.
- "정"은 경구정과 구강정/질정이 섞일 수 있으므로 제품명과 용법을 함께 확인한다.
- "스프레이"는 구강, 비강, 외용이 섞일 수 있으므로 효능/용법으로 route를 확인한다.

## 7. group 후보 기준

설명서 그룹은 ProductMaster 1건이 아니라 아래 기준으로 묶는다.

```text
성분 또는 성분군 + 농도/함량 + 제형 + route + 허가 효능/용법 일치
```

group_key 형식:

```text
drug_otc::{single|combo}::{route}::{ingredient_key}::{strength_key}::{dosage_form}
```

예:

```text
drug_otc::single::ophthalmic::sodium_hyaluronate::0.1pct::eye_drop
drug_otc::single::topical::terbinafine_hcl::1pct::cream
drug_otc::single::patch::ketoprofen::30mg::plaster
drug_otc::single::vaginal::clotrimazole::100mg::vaginal_tablet
```

주의:

- 병 용량, 튜브 용량, 파스 매수, 포장 단위는 group_key에서 제외한다.
- `0.5mL`, `15mL`, `20g`, `30매`는 대개 포장 용량이므로 성분 함량으로 쓰지 않는다.
- `%`, `mg/g`, `mg/mL`, `IU/g`, `mg/매` 등 실제 성분 농도/함량을 우선한다.
- 같은 성분이라도 route가 다르면 별도 그룹이다.
- 같은 route라도 효능·용법이 다르면 같은 설명서로 묶지 않는다.

## 8. S01XA20 인공눈물 과병합 방지

점안제 중 인공눈물 또는 안구건조 완화 제품은 같은 ATC나 같은 용도만으로 병합하지 않는다.

최소 다음 성분군은 분리한다.

```text
히알루론산
카르복시메틸셀룰로오스
트레할로스
포비돈
기타 demulcent
```

또한 히알루론산 0.1%, 0.15%, 0.18%, 0.3%처럼 농도가 다른 경우 별도 그룹 후보로 둔다.

## 9. 작업상 분류 기준

이 분류는 DB 상태값이 아니다.  
서비스 DB에 보류/검토 상태를 만들자는 뜻이 아니며, 1단계 조사 CHECK 안에서만 쓰는 작업 기록이다.

| 작업상 분류 | 의미 |
|---|---|
| draft_ready | 2단계에서 설명서 초안 작성 가능 |
| hold_for_source | 성분·농도·용법 근거 확인 후 작성 |
| hold_for_pharmacist | 약사 판단이 필요한 고위험 route 또는 성분 |
| exclude_from_otc_description | OTC 매장 설명서 대상이 아님 |

원칙:

- 근거가 충분한 것만 2단계 설명서 작성 대상으로 넘긴다.
- 근거가 부족한 것은 억지로 설명서를 만들지 않는다.
- 보류 항목은 DB에 별도 상태로 넣지 않고 작업 문서에만 남긴다.

## 10. 우선순위 산출 기준

2단계 설명서 작성 우선순위는 다음 기준으로 정한다.

1. 같은 성분·농도·제형으로 여러 회사 제품이 존재하는 그룹
2. 약국 현장에서 소비자 설명 필요성이 높은 그룹
3. route 공통 문구가 안정적인 그룹
4. 허가 효능·용법·주의 근거가 명확한 그룹
5. 고위험 성분, 민감 부위, 장기 사용 제한이 적은 그룹

권장 2단계 순서:

| 순서 | batch | 이유 |
|---:|---|---|
| 1 | BATCH-EYE-DRAFT | route 문구가 비교적 안정적이고 인공눈물 수요가 큼 |
| 2 | BATCH-TOPICAL-LOW-RISK-DRAFT | 항진균/보습 등 일부 그룹부터 시작 가능 |
| 3 | BATCH-PATCH-DRAFT | 수요가 크지만 NSAID/광과민/부착시간 검토 필요 |
| 4 | BATCH-NASAL-DRAFT | 연속 사용 제한과 질환 주의 확인 필요 |
| 5 | BATCH-ORAL-LOCAL-DRAFT | 수량은 적지만 route 구분 필요 |
| 6 | BATCH-RECTAL-VAGINAL-MANUAL-DRAFT | 경구 금지, 민감 부위, 약사 검토 필요 |

## 11. CHECK 문서

작성 파일:

```text
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-NONORAL-STAGE1-INVENTORY-AND-PRIORITY-V1.md
```

포함 항목:

1. 작업 일시
2. 사용한 기준 문서
3. DB 접속 방식과 read-only 확인
4. OTC ProductMaster 전체 count
5. 비경구 후보 추출 조건
6. route별 ProductMaster 수
7. route별 group 후보 수
8. 포장 용량/성분 함량 분리 기준
9. S01XA20 과병합 방지 적용 결과
10. draft_ready 그룹 목록
11. hold/exclude 그룹 목록과 사유
12. 2단계 batch 우선순위
13. 금지사항 준수 확인

## 12. 성공 기준

- 비경구 OTC 후보가 route별로 집계됨
- route별 설명서 group 후보가 산출됨
- 포장 용량과 성분 농도/함량이 구분됨
- 점안제 S01XA20 과병합 방지 기준이 반영됨
- 2단계 초안 작성 대상이 확정됨
- 설명서 본문 작성 0
- DB write 0

## 13. 완료 보고 형식

```text
완료 보고 — WO-O4O-DRUG-OTC-DESCRIPTION-NONORAL-STAGE1-INVENTORY-AND-PRIORITY-V1

수행:
- 운영 DB read-only 조사
- 비경구 OTC 후보 추출
- route별 후보 분류
- group_key 후보 산출
- 포장 용량/성분 함량 분리
- 2단계 작성 우선순위 제안

결과:
- OTC ProductMaster 총수:
- 비경구 후보 ProductMaster:
- route별 ProductMaster:
  - EYE:
  - TOPICAL:
  - PATCH:
  - NASAL:
  - RECTAL:
  - VAGINAL:
  - ORAL_LOCAL:
- route별 group 후보:
- draft_ready:
- hold_for_source:
- hold_for_pharmacist:
- exclude_from_otc_description:

금지사항:
- DB write 0
- 설명서 본문 작성 0
- product_candidate_description_drafts 변경 0
- shared_product_descriptions 변경 0
- ProductDrugExtension 변경 0
- canonical 승격 0

산출물:
- docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-NONORAL-STAGE1-INVENTORY-AND-PRIORITY-V1.md

다음 제안:
- BATCH-EYE-DRAFT
- BATCH-TOPICAL-LOW-RISK-DRAFT
- BATCH-PATCH-DRAFT
```

