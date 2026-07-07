# WO-O4O-DRUG-OTC-DESCRIPTION-NONORAL-END-TO-END-V1

## 1. 목표

일반의약품 OTC 중 비경구 의약품 설명서 제작을 이 작업방에서 끝까지 진행한다.

이번 작업방의 범위는 단순 route 조사나 handoff가 아니다. 비경구 대상 조사, route별 분류, group_key 후보화, 설명서 초안 작성, 보류 사유 기록, 후속 registry 반영 제안까지 포함한다.

단, 운영 DB 반영과 canonical 승격은 별도 승인 전까지 하지 않는다.

핵심 목표:

- 비경구 OTC 후보를 route별로 조사한다.
- 성분, 함량, 제형, route 기준으로 설명서 작성 그룹을 만든다.
- 포장 용량과 실제 성분 농도/함량을 분리한다.
- route별 공통 주의문구를 반영해 매장용 설명서 초안을 작성한다.
- 위험군은 `needs_review`, `manual_curation`, `blocked`, `excluded`로 분리한다.
- 작성 결과를 CHECK 문서에 남긴다.

## 2. 현재 checkout 상태

현재 checkout에서 확인된 문서:

```text
docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md
docs/work-orders/WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-ORAL-SINGLE-DRAFT-V1.md
docs/work-orders/WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-ORAL-COMBO-DRAFT-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-ORAL-COMBO-DRAFT-V1.md
docs/checks/CHECK-O4O-DRUG-STORE-DESCRIPTION-PIPELINE-READONLY-AUDIT-V1.md
```

현재 checkout에서 누락된 선행 문서:

```text
docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-REGISTRY-POPULATE-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-ROUTE-TEMPLATE-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-HIGH-RISK-GROUP-CURATION-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-GROUPING-DICTIONARY-SEED-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-100-GROUP-DRAFT-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-GROUPING-NORMALIZATION-AND-FILTER-DESIGN-V1.md
```

누락 문서는 작업 중단 사유가 아니라 CHECK 기록 대상이다. 다만 registry 파일이 없으므로 기존 registry와의 자동 중복 비교는 DB 또는 선행 문서 확보 전까지 보류한다.

## 3. 운영 DB 접근 상태

2026-07-07 현재 실행 환경에는 다음 도구가 없다.

```text
gcloud: 없음
psql: 없음
DATABASE_URL/DB_* 환경변수: 없음
```

따라서 이 환경에서 운영 DB read-only SELECT를 직접 실행할 수 없다. 운영 DB 실측이 필요한 단계는 다음 중 하나가 확보된 후 재개한다.

- gcloud/psql 사용 가능한 실행 환경
- DB read-only 결과 export
- 선행 registry 파일 복구
- 별도 에이전트가 생성한 route enumeration CHECK

## 4. 대상 route

비경구 설명서 제작 route는 다음을 기본 대상으로 둔다.

| batch | route | 대상 |
|---|---|---|
| BATCH-EYE-DRAFT | ophthalmic | 점안제, 인공눈물 |
| BATCH-TOPICAL-DRAFT | topical | 크림, 연고, 겔, 로션, 액 |
| BATCH-PATCH-DRAFT | patch | 파스, 첩부제 |
| BATCH-NASAL-DRAFT | nasal | 점비제, 비강분무제 |
| BATCH-RECTAL-DRAFT | rectal | 좌제 |
| BATCH-VAGINAL-DRAFT | vaginal | 질정, 질좌제 |
| BATCH-ORAL-LOCAL-DRAFT | oral_local | 트로키, 구강정, 가글 |

## 5. group_key 기준

기존 경구 batch 규칙과 동일하게 성분, 함량, 제형, route 중심으로 만든다.

```text
drug_otc::{single|combo}::{route}::{ingredient_key}::{strength_key}::{dosage_form}
```

예:

```text
drug_otc::single::ophthalmic::sodium_hyaluronate::0.1pct::eye_drop
drug_otc::single::ophthalmic::carboxymethylcellulose_sodium::0.5pct::eye_drop
drug_otc::single::topical::terbinafine_hcl::1pct::cream
drug_otc::single::patch::ketoprofen::30mg::plaster
drug_otc::single::vaginal::clotrimazole::100mg::vaginal_tablet
```

주의:

- 병 용량, 튜브 용량, 파스 매수, 포장단위는 key에서 제외한다.
- `0.5mL`, `15mL`, `20g`는 대개 포장 용량이므로 strength_key로 쓰지 않는다.
- `%`, `mg/g`, `mg/mL`, `IU/g` 등 실제 성분 농도/함량을 우선한다.
- route가 다르면 같은 성분이라도 별도 group_key로 둔다.
- 외용제와 점안제는 같은 ATC 또는 같은 성분 계열이라도 route와 제형이 다르면 병합하지 않는다.

## 6. route별 작성 원칙

### 6.1 점안제

우선 작성 가능 route로 둔다.

공통 문구:

- 눈에만 사용한다.
- 용기 끝이 눈, 손, 속눈썹에 닿지 않게 한다.
- 오염이나 변색이 의심되면 사용하지 않는다.
- 통증, 심한 충혈, 시야 이상, 증상 악화가 있으면 사용을 중단하고 약사 또는 의사에게 확인한다.
- 콘택트렌즈 착용 중 사용 가능 여부는 제품별로 확인한다.

S01XA20 인공눈물은 과병합하지 않는다. 최소 다음 성분군은 분리한다.

```text
히알루론산
카르복시메틸셀룰로오스
트레할로스
포비돈
기타 demulcent
```

### 6.2 외용제

저위험 보습/항진균부터 작성한다. 스테로이드, 항생제, 미백제, 강한 항진균제, 소아/임부 주의가 큰 제품은 기본 `manual_curation` 또는 `needs_review`로 둔다.

공통 문구:

- 외용으로만 사용한다.
- 눈, 입, 점막, 상처 부위 사용 여부를 확인한다.
- 넓은 부위, 장기간 사용은 약사 확인이 필요하다.
- 발진, 자극, 악화가 있으면 사용을 중단한다.

### 6.3 파스/첩부제

기본 `needs_review`로 둔다.

공통 문구:

- 상처, 습진, 점막 부위에는 붙이지 않는다.
- 부착 시간과 교체 간격을 확인한다.
- 같은 부위 반복 부착 시 피부 자극을 확인한다.
- NSAID 성분은 다른 진통소염제와 중복 사용, 광과민, 천식 병력, 임부 사용에 주의한다.

### 6.4 좌제/질정

기본 `manual_curation`으로 둔다.

공통 문구:

- 경구 복용하지 않는다.
- 사용 부위와 삽입 방법을 제품별로 확인한다.
- 임부, 소아, 출혈, 통증, 반복 증상은 약사 또는 의사 확인이 필요하다.

### 6.5 점비/비강

비충혈 제거제와 스테로이드/항히스타민 계열을 분리한다. 연속 사용 제한, 반동성 비충혈, 고혈압/심혈관 질환 주의가 필요한 경우 `needs_review`로 둔다.

### 6.6 구강국소제

트로키, 구강정, 가글은 삼킴 여부, 사용 간격, 소아 사용, 알코올 함유 여부, 국소 자극을 확인한다.

## 7. 분류 기준

| 분류 | 기준 |
|---|---|
| drafted | 근거가 충분하고 매장용 초안을 작성함 |
| candidate | group_key는 명확하나 아직 초안 미작성 |
| needs_review | 초안은 가능하나 약사 검토 강화 필요 |
| manual_curation | 스테로이드, 항생제, 좌제, 질정, 미백제 등 수동 판단 필요 |
| blocked | 성분, 농도, route, 제형 기준 불명확 |
| excluded | OTC 매장 설명서 대상이 아님 |

## 8. 설명서 기본 구조

비경구 설명서는 경구제의 "복용 안내" 대신 route에 맞는 "사용 안내"를 쓴다.

```md
## [성분명] [함량/농도] [제형]

| 항목 | 내용 |
|---|---|
| 성분 |  |
| 분류 | 일반의약품 |
| route |  |
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

## 9. 금지사항

이번 비경구 설명서 제작 작업방 전체에서, 별도 사용자 승인 전까지 다음을 하지 않는다.

- DB write
- `product_candidate_description_drafts` insert/update/upsert
- `shared_product_descriptions` insert/update
- `ProductDrugExtension` 임상/설명 텍스트 입력
- `ProductMaster` 또는 `ProductCandidate` 상태 변경
- canonical 승격
- registry 파일의 imported/drafted 상태 직접 변경
- 매장 콘텐츠, QR, POP, 태블릿 연결
- 처방의약품 설명 작성

## 10. 1차 실행 계획

운영 DB 실측이 불가한 현재 checkout에서는 저위험 route인 점안제부터 1차 seed draft를 만든다.

1차 batch:

```text
WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-V1
```

1차 후보:

| group_key | 처리 |
|---|---|
| drug_otc::single::ophthalmic::sodium_hyaluronate::0.1pct::eye_drop | drafted |
| drug_otc::single::ophthalmic::carboxymethylcellulose_sodium::0.5pct::eye_drop | drafted |
| drug_otc::single::ophthalmic::povidone::2pct::eye_drop | drafted |
| drug_otc::single::ophthalmic::ketotifen_fumarate::0.025pct::eye_drop | needs_review |
| drug_otc::combo::ophthalmic::naphazoline_pheniramine::various::eye_drop | manual_curation |

주의:

- 위 1차 후보는 DB 실측 확정 목록이 아니라, 비경구 점안 route 설명서 제작을 시작하기 위한 seed draft다.
- 운영 DB 또는 registry 확보 후 실제 product group과 매칭한다.

## 11. 성공 기준

- 비경구 작업방의 범위가 조사부터 제작까지로 고정됨
- route별 작성 원칙이 확정됨
- 첫 점안제 seed draft CHECK가 작성됨
- DB write 0
- 설명서 초안과 보류 사유가 구분됨
- 운영 DB 실측 불가 사유가 기록됨

