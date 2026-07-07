# CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-V1

## 1. 작업 일시

2026-07-07

## 2. 작업 목적

비경구 일반의약품 설명서 제작을 실제로 시작하기 위해, 점안제 route를 1차 batch로 삼아 seed draft를 작성한다.

이번 CHECK는 운영 DB 반영 문서가 아니다. 운영 DB write, canonical 승격, registry 상태 변경은 하지 않는다.

## 3. 사용한 선행 문서

확인한 문서:

```text
docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md
docs/work-orders/WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-ORAL-SINGLE-DRAFT-V1.md
docs/work-orders/WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-ORAL-COMBO-DRAFT-V1.md
docs/checks/CHECK-O4O-DRUG-STORE-DESCRIPTION-PIPELINE-READONLY-AUDIT-V1.md
```

현재 checkout에서 누락된 문서:

```text
docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-REGISTRY-POPULATE-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-ROUTE-TEMPLATE-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-HIGH-RISK-GROUP-CURATION-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-GROUPING-DICTIONARY-SEED-V1.md
```

## 4. 운영 DB read-only 조사 상태

현재 실행 환경에는 `gcloud`, `psql`, DB 환경변수가 없어 운영 DB에 직접 SELECT를 실행할 수 없었다.

따라서 이번 CHECK의 1차 점안제 초안은 다음 성격을 가진다.

- DB 실측 기반 최종 후보가 아님
- registry 반영 전 seed draft
- 후속 DB read-only 조사에서 실제 제품군과 매칭 필요
- group_key와 설명서 구조 검증용

## 5. 점안제 route 작성 기준

점안제는 비경구 route 중 1차 작성 대상으로 적합하다.

이유:

- 사용 route가 명확하다.
- 공통 주의문구가 안정적이다.
- 인공눈물 계열은 소비자 설명 필요성이 높다.
- 성분군을 분리하면 과병합 위험을 줄일 수 있다.

공통 주의문구:

- 눈에만 사용한다.
- 용기 끝이 눈, 손, 속눈썹에 닿지 않게 한다.
- 오염, 변색, 혼탁이 의심되면 사용하지 않는다.
- 심한 통증, 시야 이상, 심한 충혈, 증상 악화가 있으면 사용을 중단하고 약사 또는 의사에게 확인한다.
- 콘택트렌즈 착용 중 사용 가능 여부는 제품별 안내를 확인한다.

## 6. S01XA20 과병합 방지

인공눈물 또는 안구건조 완화 계열은 같은 ATC 또는 같은 용도만으로 병합하지 않는다.

이번 seed draft에서는 다음을 별도 그룹으로 분리했다.

| 성분군 | 처리 |
|---|---|
| 히알루론산나트륨 | 별도 |
| 카르복시메틸셀룰로오스나트륨 | 별도 |
| 포비돈 | 별도 |
| 항알레르기 점안제 | 별도 |
| 충혈/가려움 복합 점안제 | 수동 큐레이션 |

## 7. 1차 후보 집계

| 상태 | 수 |
|---|---:|
| drafted | 3 |
| needs_review | 1 |
| manual_curation | 1 |
| blocked | 0 |
| excluded | 0 |
| 합계 | 5 |

## 8. 초안 1 — 히알루론산나트륨 0.1% 점안제

```text
group_key: drug_otc::single::ophthalmic::sodium_hyaluronate::0.1pct::eye_drop
status_proposal: drafted
route: ophthalmic
single_or_combo: single
```

## 히알루론산나트륨 0.1% 점안제

| 항목 | 내용 |
|---|---|
| 성분 | 히알루론산나트륨 0.1% |
| 분류 | 일반의약품 |
| route | 점안 |
| 작용 | 눈 표면을 촉촉하게 유지하고 윤활을 돕는 점안 성분 |
| 주요 증상 | 눈 건조감, 이물감, 뻑뻑함 |
| 선택 포인트 | 안구건조감이나 렌즈 착용 전후의 불편감 완화가 필요할 때 성분과 농도를 확인 |
| 주의 대상 | 눈 통증, 심한 충혈, 시야 이상, 지속 악화가 있는 사람 |

**효능·효과**  
눈의 건조감, 이물감, 뻑뻑함 등 눈 표면의 건조로 인한 불편감을 완화하는 데 사용합니다.

**사용 안내**  
제품의 허가된 용법에 따라 눈에 점안합니다. 용기 끝이 눈, 손, 속눈썹에 닿지 않게 하고, 점안 후에는 뚜껑을 닫아 오염을 줄입니다. 여러 점안제를 함께 사용하는 경우 사용 간격을 약사에게 확인하세요.

**주의 대상**  
점안 후 통증, 심한 충혈, 시야 이상, 눈곱 증가, 증상 악화가 있으면 사용을 중단하고 약사 또는 의사에게 확인해야 합니다. 콘택트렌즈 착용 중 사용할 수 있는 제품인지 제품별 안내를 확인하세요.

**성분 기준 선택**  
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.  
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.  
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

## 9. 초안 2 — 카르복시메틸셀룰로오스나트륨 0.5% 점안제

```text
group_key: drug_otc::single::ophthalmic::carboxymethylcellulose_sodium::0.5pct::eye_drop
status_proposal: drafted
route: ophthalmic
single_or_combo: single
```

## 카르복시메틸셀룰로오스나트륨 0.5% 점안제

| 항목 | 내용 |
|---|---|
| 성분 | 카르복시메틸셀룰로오스나트륨 0.5% |
| 분류 | 일반의약품 |
| route | 점안 |
| 작용 | 눈 표면의 윤활과 보습을 돕는 인공눈물 성분 |
| 주요 증상 | 눈 건조감, 뻑뻑함, 이물감 |
| 선택 포인트 | 비교적 점성이 있는 인공눈물 계열을 성분 기준으로 확인할 때 |
| 주의 대상 | 눈 통증, 심한 충혈, 시야 이상, 지속 악화가 있는 사람 |

**효능·효과**  
눈 표면의 건조로 인한 뻑뻑함, 이물감, 건조감을 완화하는 데 사용합니다.

**사용 안내**  
제품의 허가된 용법에 따라 눈에 점안합니다. 용기 끝이 눈이나 손에 닿지 않도록 주의하고, 오염이나 변색이 의심되는 경우 사용하지 않습니다. 점안 직후 일시적으로 시야가 흐릴 수 있으므로 운전이나 기계 조작 전에는 상태를 확인하세요.

**주의 대상**  
점안 후 통증, 심한 충혈, 가려움 악화, 시야 이상이 나타나면 사용을 중단하고 약사 또는 의사에게 확인해야 합니다. 콘택트렌즈 착용 중 사용 가능 여부는 제품별 안내를 확인하세요.

**성분 기준 선택**  
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.  
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.  
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

## 10. 초안 3 — 포비돈 2% 점안제

```text
group_key: drug_otc::single::ophthalmic::povidone::2pct::eye_drop
status_proposal: drafted
route: ophthalmic
single_or_combo: single
```

## 포비돈 2% 점안제

| 항목 | 내용 |
|---|---|
| 성분 | 포비돈 2% |
| 분류 | 일반의약품 |
| route | 점안 |
| 작용 | 눈 표면을 적셔 건조감과 이물감을 완화하는 윤활 성분 |
| 주요 증상 | 눈 건조감, 이물감, 뻑뻑함 |
| 선택 포인트 | 인공눈물 계열 중 포비돈 성분을 기준으로 선택할 때 |
| 주의 대상 | 눈 통증, 심한 충혈, 시야 이상, 증상 악화가 있는 사람 |

**효능·효과**  
눈의 건조감, 이물감, 뻑뻑함 등 눈 표면의 불편감을 완화하는 데 사용합니다.

**사용 안내**  
제품의 허가된 용법에 따라 눈에 점안합니다. 용기 끝이 눈, 손, 속눈썹에 닿지 않게 하고, 개봉 후 보관 및 사용 가능 기간은 제품별 안내를 확인합니다.

**주의 대상**  
점안 후 눈 통증, 심한 충혈, 시야 이상, 자극감 악화가 있으면 사용을 중단하고 약사 또는 의사에게 확인해야 합니다. 다른 점안제와 함께 쓰는 경우 사용 순서와 간격을 약사에게 확인하세요.

**성분 기준 선택**  
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.  
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.  
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

## 11. 보류 1 — 케토티펜푸마르산염 0.025% 점안제

```text
group_key: drug_otc::single::ophthalmic::ketotifen_fumarate::0.025pct::eye_drop
status_proposal: needs_review
route: ophthalmic
single_or_combo: single
```

보류 사유:

- 알레르기성 결막염 등 증상 축이 인공눈물과 다르다.
- 항알레르기 점안제는 사용 가능 연령, 사용 기간, 렌즈 착용, 병용 점안제 확인이 필요하다.
- 초안 작성은 가능하지만 제품별 허가 원문 확인 후 약사 검토 강화가 필요하다.

초안 방향:

- "눈 가려움, 알레르기성 눈 증상 완화" 중심
- 감염성 결막염, 통증, 시야 이상은 의사 확인
- 콘택트렌즈 착용 중 사용 여부 확인

## 12. 보류 2 — 나파졸린/페니라민 등 충혈·가려움 복합 점안제

```text
group_key: drug_otc::combo::ophthalmic::naphazoline_pheniramine::various::eye_drop
status_proposal: manual_curation
route: ophthalmic
single_or_combo: combo
```

보류 사유:

- 복합 점안제는 혈관수축 성분, 항히스타민 성분, 보조 성분 조합이 제품마다 다를 수 있다.
- 충혈 완화 성분은 장기 사용, 녹내장, 심혈관 질환, 소아 사용 등 주의가 필요하다.
- 성분 조합과 함량이 확정되기 전에는 자동 초안으로 처리하지 않는다.

초안 방향:

- "일시적인 충혈과 가려움 완화" 수준으로 제한
- 장기간 반복 사용 금지
- 눈 통증, 시야 이상, 심한 충혈은 의사 확인

## 13. registry 추가 제안

운영 DB 또는 선행 registry 확보 후 다음 후보를 registry에 추가 또는 기존 항목과 매칭한다.

| group_key | batch | status_proposal | 비고 |
|---|---|---|---|
| drug_otc::single::ophthalmic::sodium_hyaluronate::0.1pct::eye_drop | BATCH-EYE-DRAFT | drafted | DB 매칭 필요 |
| drug_otc::single::ophthalmic::carboxymethylcellulose_sodium::0.5pct::eye_drop | BATCH-EYE-DRAFT | drafted | DB 매칭 필요 |
| drug_otc::single::ophthalmic::povidone::2pct::eye_drop | BATCH-EYE-DRAFT | drafted | DB 매칭 필요 |
| drug_otc::single::ophthalmic::ketotifen_fumarate::0.025pct::eye_drop | BATCH-EYE-DRAFT | needs_review | 허가 원문 확인 후 작성 |
| drug_otc::combo::ophthalmic::naphazoline_pheniramine::various::eye_drop | BATCH-EYE-DRAFT | manual_curation | 성분 조합별 분리 필요 |

## 14. 금지사항 준수 확인

| 항목 | 결과 |
|---|---|
| DB write | 0 |
| `product_candidate_description_drafts` insert/update/upsert | 0 |
| `shared_product_descriptions` insert/update | 0 |
| `ProductDrugExtension` 변경 | 0 |
| `ProductMaster`/`ProductCandidate` 상태 변경 | 0 |
| canonical 승격 | 0 |
| 매장 콘텐츠/QR/POP/태블릿 연결 | 0 |
| registry 상태 직접 변경 | 0 |

## 15. 다음 작업 제안

1. 운영 DB read-only 접근이 가능한 환경에서 점안제 실제 후보를 추출한다.
2. `dosage_form`, `strength`, `ingredient_summary`, `active_ingredients` 기준으로 위 seed draft와 매칭한다.
3. 히알루론산 0.15%, 0.18%, 0.3% 등 농도 차이가 있는 경우 별도 group_key로 분리한다.
4. 케토티펜 등 항알레르기 점안제는 허가 원문 확인 후 초안을 작성한다.
5. 충혈 완화 복합 점안제는 성분 조합별 manual curation으로 진행한다.

