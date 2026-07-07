# WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-TOPICAL-LOW-RISK-DRAFT-V1

## 0. 중요 지시

이번 요청은 **작업 요청서 실행**이다.

이번 단계의 범위는 비경구 OTC 중 **외용제 저위험군**을 대상으로 운영 DB read-only 조사, e약은요/SPD 원문 grounding, 성분군별 group 후보 확정, 매장용 설명서 초안 작성, CHECK 문서 작성까지다.

운영 DB에는 **SELECT만** 허용한다.

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

이번 단계는 **외용제 저위험군 설명서 초안 dry-run**이다.

---

## 1. 작업 목적

비경구 OTC 설명서 제작의 다음 batch로, 외용제 중 비교적 원문 grounding과 소비자 안내가 안정적인 저위험군을 우선 작성한다.

1단계 조사 결과:

```text
비경구 후보: 6,952
외용 topical 후보: 2,710
외용 topical e약은요/SPD 원문 보유: 1,562 / 58%
```

이번 작업의 핵심은 외용제를 한꺼번에 쓰는 것이 아니라, **저위험 외용군만 먼저 분리해 설명서 초안을 작성**하는 것이다.

---

## 2. 기준 문서

먼저 확인한다.

```text
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-NONORAL-STAGE1-INVENTORY-AND-PRIORITY-V1.md
docs/work-orders/WO-O4O-DRUG-OTC-DESCRIPTION-NONORAL-STAGE1-INVENTORY-AND-PRIORITY-V1.md
docs/work-orders/WO-O4O-DRUG-OTC-DESCRIPTION-NONORAL-END-TO-END-V1.md
docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md
```

있으면 추가 확인한다.

```text
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2B-OTHER-INGREDIENT-EXTRACTION-V1.md
docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md
```

누락 문서는 CHECK에 기록하되 작업을 중단하지 않는다.

---

## 3. 작업 범위

### 이번 단계에서 한다

1. 운영 DB read-only로 외용제 후보를 재확인한다.
2. `shared_product_descriptions.content` 원문 보유 외용제를 우선 대상으로 삼는다.
3. 저위험 외용군을 분리한다.
4. 성분·농도·제형·효능/용법 기준으로 group 후보를 만든다.
5. 원문 근거가 충분한 그룹만 설명서 초안을 작성한다.
6. 스테로이드, 항생제, 국소마취제, 미백제, 복합제 등은 보류 사유를 기록한다.
7. CHECK 문서를 작성한다.

### 이번 단계에서 하지 않는다

- 외용제 2,710건 전량 작성
- 스테로이드 외용제 본문 작성
- 항생제 외용제 본문 작성
- 국소마취제 본문 작성
- 미백제/색소침착 관련 제품 본문 작성
- 성분·농도·제형이 불명확한 제품 본문 작성
- DB 반영

---

## 4. 우선 대상

1단계 조사 기준 외용 저위험 후보:

| 성분군 | 처리 |
|---|---|
| 단순 항진균 외용제 | 우선 작성 후보 |
| 보습·피부보호 외용제 | 우선 작성 후보 |
| 단순 소독 외용제 | 우선 작성 후보 |
| 저위험 피부 진정·보호제 | 원문 확인 후 후보 |
| 복합 성분 외용제 | 원문 확인 후 제한적으로 후보 |

우선 작성 조건:

```text
외용 route 명확
성분군 명확
농도 또는 함량 원문 확인 가능
제형 명확: 크림 / 연고 / 겔 / 로션 / 외용액 등
e약은요 또는 SPD content 원문 보유
효능·사용법·주의사항 근거 확인 가능
OTC 일반의약품
```

참고 (STAGE1 실측 위험 하위버킷):

```text
저위험 후보군 규모: emollient(D02) 127 / 소독(D08) 104 / 단순 항진균(D01 저위험분)
분리 대상(보류): 스테로이드(D07) 558 / 항생·항진균(D06) 506 / 국소마취(N01BB) 234
```

---

## 5. 보류 대상

아래는 이번 단계에서 본문을 작성하지 않는다.

| 대상 | 사유 |
|---|---|
| 스테로이드 외용제 | 장기 사용, 넓은 부위, 얼굴·소아 사용 주의 |
| 항생제 외용제 | 내성, 감작, 상처 상태 확인 필요 |
| 국소마취제 | 용량, 점막 흡수, 사용 부위 제한 필요 |
| 미백제·색소침착 관련 제품 | 효능 표현과 사용 기간 주의 필요 |
| 강한 자극성 외용제 | 화상·상처·점막 주의 필요 |
| 복합 외용제 | 성분 조합·함량별 분리 필요 |
| 성분·농도 불명확 제품 | 원문 근거 부족 |

보류 항목은 DB 상태값으로 만들지 않고 CHECK에만 기록한다.

---

## 6. group_key 기준

형식:

```text
drug_otc::{single|combo}::topical::{ingredient_key}::{strength_key|unspecified}::{dosage_form}
```

예:

```text
drug_otc::single::topical::terbinafine_hcl::1pct::cream
drug_otc::single::topical::clotrimazole::1pct::cream
drug_otc::single::topical::povidone_iodine::10pct::solution
drug_otc::single::topical::dexpanthenol::5pct::ointment
```

주의:

- 튜브 용량 `10g`, `15g`, `20g`, `30g`는 strength_key로 쓰지 않는다.
- 병 용량 `30mL`, `50mL`, `100mL`는 strength_key로 쓰지 않는다.
- 농도 `%`, `mg/g`, `mg/mL`, `IU/g` 등 실제 성분 농도/함량을 우선한다.
- 같은 성분이라도 크림/연고/겔/외용액은 용법과 사용감이 달라질 수 있으므로 제형별 분리한다.
- 같은 ATC라도 스테로이드 복합, 항생제 복합, 단순 항진균은 병합하지 않는다.

> STAGE2 확정: 비경구 `specification` 첫 토큰은 대개 **용기·포장 용량(g/mL)이지 농도가 아니다**. 외용도 동일하게 spec을 strength_key로 쓰지 않고, 농도는 명칭·원문 값만 사용한다.

---

## 7. 설명서 작성 형식

각 초안은 아래 형식을 따른다.

```md
## [성분명] [농도/함량] [제형]

| 항목 | 내용 |
|---|---|
| 성분 |  |
| 분류 | 일반의약품 |
| route | 외용 |
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

공통 외용 주의문구:

- 외용으로만 사용한다.
- 눈, 입, 점막, 상처 부위에 들어가지 않도록 주의한다.
- 사용 후 자극감, 발진, 가려움, 붓기, 증상 악화가 있으면 사용을 중단하고 약사 또는 의사에게 확인한다.
- 넓은 부위 또는 장기간 사용은 제품별 안내와 약사 확인이 필요하다.
- 같은 부위에 여러 외용제를 함께 쓰는 경우 사용 순서와 간격을 약사에게 확인한다.

---

## 8. 원문 grounding 기준

설명서 초안은 반드시 `shared_product_descriptions.content` 또는 e약은요 원문을 근거로 작성한다.

확인할 항목:

```text
효능·효과
사용법
사용 횟수
사용 부위
사용 금지 부위
주의 대상
이상반응
소아/임부 관련 주의
보관·오염 관련 주의
```

원문에 없는 농도, 사용 기간, 주의사항은 창작하지 않는다.
불명확한 경우 `unspecified` 또는 `hold_for_source`로 둔다.

---

## 9. 작업상 분류 기준

이 분류는 DB 상태값이 아니다. CHECK 안에서만 쓰는 작업 기록이다.

| 작업상 분류 | 의미 |
|---|---|
| drafted | 원문 근거가 충분해 설명서 초안을 작성 |
| draft_ready | group 후보는 명확하나 이번 batch에서 본문 미작성 |
| hold_for_source | 원문 없음 또는 성분·농도·용법 불명확 |
| hold_for_pharmacist | 스테로이드, 항생제, 국소마취제 등 약사 판단 필요 |
| exclude | OTC 매장 설명서 대상 아님 또는 외용 route 아님 |

---

## 10. CHECK 문서

작성 파일:

```text
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-TOPICAL-LOW-RISK-DRAFT-V1.md
```

포함 항목:

1. 작업 일시
2. 사용한 기준 문서
3. DB read-only 확인
4. 외용제 후보 재확인
5. 원문 보유 외용제 수
6. 저위험 외용군 선별 기준
7. 작성한 설명서 초안 목록
8. 보류한 그룹과 사유
9. 스테로이드/항생제/국소마취제 등 분리 결과
10. registry 반영 제안
11. 금지사항 준수 확인

---

## 11. 성공 기준

- 외용제 후보 중 저위험군이 분리됨
- 원문 보유분 기준으로 설명서 초안이 작성됨
- 튜브 용량과 실제 성분 농도/함량이 구분됨
- 스테로이드·항생제·국소마취제·미백제는 자동 작성하지 않음
- 성분·농도 불명확 제품은 작성하지 않음
- DB write 0
- canonical 승격 0

---

## 12. 완료 보고 형식

```text
완료 보고 — WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-TOPICAL-LOW-RISK-DRAFT-V1

수행:
- 외용제 후보 read-only 재확인
- 원문 보유 외용제 확인
- 저위험 외용군 분리
- 성분·농도·제형 기준 group 후보 산출
- 원문 grounding 기반 설명서 초안 작성
- 보류 그룹 사유 기록

결과:
- 외용제 후보:
- 원문 보유:
- 저위험 후보:
- 작성 그룹:
- 작성 초안 수:
- hold_for_source:
- hold_for_pharmacist:
- exclude:
- registry 반영 제안:

금지사항:
- DB write 0
- product_candidate_description_drafts 변경 0
- shared_product_descriptions 변경 0
- ProductDrugExtension 변경 0
- canonical 승격 0
- registry 상태 변경 0

산출물:
- docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-TOPICAL-LOW-RISK-DRAFT-V1.md

다음 제안:
- BATCH-PATCH-DRAFT
- 또는 BATCH-EYE-ANTIALLERGY-CURATION
```
