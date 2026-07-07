# CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2-V1

## 1. 작업 일시

2026-07-07

WO: `WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2-V1`

이번 CHECK는 **운영 DB read-only 원문 grounding 기반 점안제 설명서 초안 작성 dry-run** 결과다. DB write·canonical 승격·registry 상태 변경은 하지 않았다.

> 참고: DB 도구가 없던 다른 실행 환경에서 생성된 `BLOCKED_IN_THIS_ENVIRONMENT` CHECK는 이 방(STAGE1을 실제 실행한 DB 접근 가능 환경)의 실측과 어긋나므로 리포에 반영하지 않는다. 본 CHECK가 STAGE2의 실제 결과다.

## 2. 사용한 기준 문서

```text
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-NONORAL-STAGE1-INVENTORY-AND-PRIORITY-V1.md
docs/work-orders/WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2-V1.md
docs/work-orders/WO-O4O-DRUG-OTC-DESCRIPTION-NONORAL-STAGE1-INVENTORY-AND-PRIORITY-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-V1.md
```

누락(중단 사유 아님): `docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md`, `docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md`.

## 3. DB read-only 확인

- 접속: `cloud-sql-proxy netureyoutube:asia-northeast3:o4o-platform-db` (127.0.0.1:15432) + `psql` user `o4o_api`.
- 실행: **SELECT 전용**. 한글 정규식은 UTF-8 `.sql` + `psql -f`.
- 원문 출처: `shared_product_descriptions.content`, `source_type='mfds_easy_drug'` (e약은요).

## 4. 점안제 후보 재확인 (원문 grounding)

점안 1,392 중 원문 보유 913. 성분군별 원문 보유 실측:

| 성분군 | 점안 후보 | 원문 보유 | 명칭 명시 농도 |
|---|---:|---:|---|
| CMC (카르복시메틸셀룰로오스나트륨) | 441 | 353 | **0.5%(54) / 1%(68)** / 1.5%(6) / 0.6%(4) / 미표기 221 |
| 트레할로스(수화물) | 122 | 109 | 미표기 (109 전부) |
| PDRN (폴리데옥시리보뉴클레오티드나트륨) | 52 | 42 | 미표기 (%아님, mg/mL 계열) |
| 포비돈 | 25 | 10 | 2%(3) / 미표기 7 |
| 히알루론산나트륨 | 6(명칭) | 3 | 미표기 |
| anti_allergy(케토티펜·크로몰린 등) | 134 | 84 | — (보류) |
| decongestant(나파졸린 등) | 9 | 0 | — (보류) |
| other(브랜드명만) | 603 | 312 | — (보류) |

### 4.1 핵심 확정 — spec은 농도가 아니라 병 용량

점안 `specification` 첫 토큰은 전부 **밀리리터(병/1회용기 용량)**다 (예: CMC "0.5밀리리터"=0.5mL 용기, 0.5% 아님). STAGE1 경고 재확인. → **group_key 농도는 spec 금지, 명칭 명시 %만 사용**. 명칭에 없으면 성분군 레벨로 두고 농도는 창작하지 않는다(가이드 §3.8 저grounding).

## 5. 원문 grounding 방식

- 각 성분군 대표 제품의 `content`(효능·효과 / 용법·용량 / 사용상 주의사항 / 이상반응 / 저장방법)를 직접 조회해 초안 근거로 사용.
- **용법 수치(방울·횟수)는 제품별로 상이**(CMC 1~2방울, 트레할로스 1방울 1일 수회, 포비돈 1~2방울 1일 4~5회, 히알루론산 1방울 최대 1일 6회, PDRN 2~3방울 1일 2~4회) → 그룹 설명서는 특정 제품 수치를 그룹 전체에 고정하지 않고 **"제품의 허가된 용법·용량을 따르세요"** + 원문 근거 효능/주의를 기술.
- 콘택트렌즈 정책이 성분군별로 다름을 원문에서 확인(트레할로스=착용중 사용가능 / CMC·히알루론산=소프트렌즈 착용중 금지·15분 후 재착용 / 포비돈=하드렌즈 착용시 사용, 소프트 피함) → 그룹별 반영.

## 6. 작성한 설명서 초안 목록

| # | group_key | status | 농도 grounding |
|---:|---|---|---|
| 1 | `drug_otc::single::ophthalmic::carboxymethylcellulose_sodium::0.5pct::eye_drop` | drafted | 명칭 명시 0.5% |
| 2 | `drug_otc::single::ophthalmic::carboxymethylcellulose_sodium::1pct::eye_drop` | drafted | 명칭 명시 1% |
| 3 | `drug_otc::single::ophthalmic::trehalose::unspecified::eye_drop` | drafted | 농도 미표기(성분군 레벨) |
| 4 | `drug_otc::single::ophthalmic::povidone::2pct::eye_drop` | drafted | 명칭 명시 2% |
| 5 | `drug_otc::single::ophthalmic::sodium_hyaluronate::unspecified::eye_drop` | drafted | 농도 미표기(성분군 레벨) |
| 6 | `drug_otc::single::ophthalmic::polydeoxyribonucleotide_sodium::unspecified::eye_drop` | drafted | 각막영양/미세손상(인공눈물과 별개) |

---

### 초안 1 — 카르복시메틸셀룰로오스나트륨 0.5% 점안제

```text
group_key: drug_otc::single::ophthalmic::carboxymethylcellulose_sodium::0.5pct::eye_drop
status: drafted   grounding: mfds_easy_drug (아이톡씨엠씨점안액 계열)
```

| 항목 | 내용 |
|---|---|
| 성분 | 카르복시메틸셀룰로오스나트륨 0.5% |
| 분류 | 일반의약품 |
| route | 점안 |
| 작용 | 눈 표면을 적셔 윤활과 보습을 돕는 인공눈물 성분 |
| 주요 증상 | 눈 건조감, 화끈거림, 자극감, 불쾌감 |
| 선택 포인트 | 바람·태양·건조로 인한 일시적 눈 불편감 완화를 성분·농도 기준으로 확인할 때 |
| 주의 대상 | 눈 통증이 심한 사람, 안약 알레르기 경험자, 소프트렌즈 착용자 |

**효능·효과**
눈의 건조 또는 바람·태양에 의한 화끈거리는 증상, 자극감, 불쾌감의 일시적 완화에 사용합니다.

**사용 안내**
제품의 허가된 용법·용량에 따라 필요 시 증상이 있는 눈에 점안합니다. 용기 끝이 눈·손·속눈썹에 닿지 않게 하고, 다른 점안제와 함께 쓰는 경우 약 15분 간격을 둡니다. 점도가 높아 점안 직후 일시적으로 시야가 흐릴 수 있습니다. 소프트콘택트렌즈 착용 중에는 사용하지 말고, 렌즈는 점안 15분 후에 다시 착용하세요.

**주의 대상**
증상이 악화되거나 72시간 이상 지속되면 사용을 중단하고 약사 또는 의사에게 확인하세요. 가려움, 부종, 눈 통증, 시야 변화, 지속적 충혈·자극감이 나타나면 즉시 사용을 중단합니다. 색이 변했거나 혼탁한 약은 사용하지 않습니다.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 2 — 카르복시메틸셀룰로오스나트륨 1% 점안제

```text
group_key: drug_otc::single::ophthalmic::carboxymethylcellulose_sodium::1pct::eye_drop
status: drafted   grounding: mfds_easy_drug (CMC 1% 계열, 명칭 명시 68건)
```

| 항목 | 내용 |
|---|---|
| 성분 | 카르복시메틸셀룰로오스나트륨 1% |
| 분류 | 일반의약품 |
| route | 점안 |
| 작용 | 눈 표면을 적셔 윤활과 보습을 돕는 인공눈물 성분(0.5% 대비 점도 높음) |
| 주요 증상 | 눈 건조감, 화끈거림, 자극감, 불쾌감 |
| 선택 포인트 | 더 점성이 있는 인공눈물이 필요할 때 성분·농도(1%) 기준으로 확인 |
| 주의 대상 | 눈 통증이 심한 사람, 안약 알레르기 경험자, 소프트렌즈 착용자 |

**효능·효과**
눈의 건조 또는 바람·태양에 의한 화끈거리는 증상, 자극감, 불쾌감의 일시적 완화에 사용합니다.

**사용 안내**
제품의 허가된 용법·용량에 따라 필요 시 눈에 점안합니다. 용기 끝이 눈·손·속눈썹에 닿지 않게 하고, 다른 점안제와는 약 15분 간격을 둡니다. 농도가 높아 점안 직후 시야가 일시적으로 더 흐릴 수 있으므로 운전·기계 조작 전에는 상태를 확인하세요. 소프트콘택트렌즈 착용 중에는 사용하지 말고, 렌즈는 점안 15분 후에 다시 착용하세요.

**주의 대상**
증상이 악화되거나 72시간 이상 지속되면 사용을 중단하고 약사 또는 의사에게 확인하세요. 가려움, 부종, 눈 통증, 시야 변화, 지속적 충혈·자극감이 나타나면 즉시 사용을 중단합니다.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 3 — 트레할로스 점안제

```text
group_key: drug_otc::single::ophthalmic::trehalose::unspecified::eye_drop
status: drafted   grounding: mfds_easy_drug (더아이즈톡점안액 등). 농도 명칭·원문 미표기 → 성분군 레벨
```

| 항목 | 내용 |
|---|---|
| 성분 | 트레할로스(수화물) |
| 분류 | 일반의약품 |
| route | 점안 |
| 작용 | 눈 표면을 보호·보습하여 건조와 피로를 완화하는 인공눈물 성분 |
| 주요 증상 | 눈 건조감, 피로감, 찌르는 듯한 자극, 불쾌감 |
| 선택 포인트 | 컴퓨터 사용·에어컨·공해 등으로 인한 눈 건조·피로 완화, 렌즈 착용 중 사용 가능 여부를 성분 기준으로 확인 |
| 주의 대상 | 눈 통증이 심한 사람, 녹내장 환자, 안약 알레르기 경험자 |

**효능·효과**
바람, 연기, 공해, 먼지, 건조한 열, 에어컨, 항공 여행, 장시간 컴퓨터 사용 등으로 생기는 불쾌감·자극과 눈의 건조 및 피로에 사용합니다.

**사용 안내**
제품의 허가된 용법·용량에 따라 필요 시 눈에 점안합니다. 사용 전 손을 깨끗이 씻고, 용기 끝이 눈꺼풀·속눈썹에 닿지 않게 합니다. 이 성분의 점안제는 대체로 콘택트렌즈 착용 중에도 사용할 수 있으나, 제품별 안내를 확인하세요. 다른 점안제와 함께 쓰는 경우 다른 점안제를 먼저 넣고 약 10분 후에 사용합니다.

**주의 대상**
증상이 악화되거나 3일 이상 지속되면 사용을 중단하고 약사 또는 의사에게 확인하세요. 혼탁한 약은 사용하지 않습니다. 1회용 제품은 1회만 사용하고, 무보존제 다회용은 개봉 후 4주까지만 사용합니다.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 4 — 포비돈 2% 점안제

```text
group_key: drug_otc::single::ophthalmic::povidone::2pct::eye_drop
status: drafted   grounding: mfds_easy_drug (한림포비돈점안액 등)
```

| 항목 | 내용 |
|---|---|
| 성분 | 포비돈 2% |
| 분류 | 일반의약품 |
| route | 점안 |
| 작용 | 눈 표면을 적셔 건조감을 완화하는 윤활 성분 |
| 주요 증상 | 눈 건조감 |
| 선택 포인트 | 건조한 눈, 하드콘택트렌즈 착용 시 윤활이 필요할 때 성분 기준으로 확인 |
| 주의 대상 | 소프트콘택트렌즈 착용자 |

**효능·효과**
건조한 눈, 하드콘택트렌즈 착용 시에 사용합니다.

**사용 안내**
제품의 허가된 용법·용량에 따라 눈에 점안합니다(대개 1회 1~2방울, 1일 4~5회, 증상에 따라 조절). 치료 중에는 소프트콘택트렌즈 착용을 피하고, 점안용으로만 사용하며, 오염 방지를 위해 가능하면 공동으로 사용하지 않습니다.

**주의 대상**
매우 드물게 과민반응이 나타날 수 있으며, 이 경우 사용을 중단하고 약사 또는 의사에게 확인하세요. 색이 변했거나 혼탁한 약은 사용하지 않습니다.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 5 — 히알루론산나트륨 점안제

```text
group_key: drug_otc::single::ophthalmic::sodium_hyaluronate::unspecified::eye_drop
status: drafted   grounding: mfds_easy_drug (히알핑점안액 등). 농도(0.1/0.15/0.18/0.3%) 명칭·원문 미표기 → 성분군 레벨, 농도 창작 안 함
```

| 항목 | 내용 |
|---|---|
| 성분 | 히알루론산나트륨 |
| 분류 | 일반의약품 |
| route | 점안 |
| 작용 | 눈 표면에 수분을 유지시켜 습윤을 돕는 인공눈물 성분 |
| 주요 증상 | 눈 건조감, 이물감, 피로감, 렌즈 착용에 의한 불쾌감 |
| 선택 포인트 | 습윤이 필요할 때. 농도(0.1~0.3%)가 제품마다 다르므로 성분·농도를 약사에게 확인 |
| 주의 대상 | 눈 통증이 심한 사람, 녹내장 환자, 단백질계 약물 과민증·안약 알레르기 경험자 |

**효능·효과**
먼지, 바람, 건조한 공기, 장시간 컴퓨터 사용에 의한 눈의 건조감·이물감·피로감, 콘택트렌즈 착용에 의한 불쾌감 증상에서 눈의 습윤에 사용합니다.

**사용 안내**
제품의 허가된 용법·용량에 따라 성인은 필요 시 점안합니다(대개 1회 1방울, 최대 1일 6회). 점안용으로만 사용하고, 다른 점안제와 함께 쓰는 경우 다른 점안제를 먼저 넣고 약 30분 후에 사용합니다. 소프트렌즈 착용 중에는 사용하지 말고, 렌즈는 점안 15분 후에 다시 착용하세요.

**주의 대상**
혼탁한 약은 사용하지 않습니다. 눈의 충혈·가려움·부종, 안검 가려움, 자극감, 결막염·각막장해 등이 나타나면 사용을 중단하고 약사 또는 의사에게 확인하세요. 농도가 제품마다 다르므로(0.1~0.3%) 제품 표시를 확인하세요.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 6 — 폴리데옥시리보뉴클레오티드나트륨(PDRN) 점안제

```text
group_key: drug_otc::single::ophthalmic::polydeoxyribonucleotide_sodium::unspecified::eye_drop
status: drafted   grounding: mfds_easy_drug (마이안점안액 등). 인공눈물과 효능 축이 다름(각막·결막 영양/미세손상) → 별도 그룹
```

| 항목 | 내용 |
|---|---|
| 성분 | 폴리데옥시리보뉴클레오티드나트륨(PDRN) |
| 분류 | 일반의약품 |
| route | 점안 |
| 작용 | 각막·결막에 영양을 공급하고 미세손상 회복을 돕는 점안 성분 |
| 주요 증상 | 영양부족에 의한 각막·결막 불편, 렌즈 착용에 의한 미세손상 |
| 선택 포인트 | 단순 보습(인공눈물)과 달리 각막·결막 영양·미세손상 목적일 때 |
| 주의 대상 | 상당한 각막 손상이 있는 사람, 소아(보호자 감독) |

**효능·효과**
영양부족으로 인한 각막 및 결막의 궤양성 질환에 대한 영양공급, 콘택트렌즈 착용 등으로 인한 각막 및 결막의 미세손상에 사용합니다.

**사용 안내**
제품의 허가된 용법·용량에 따라 눈에 점안합니다(대개 1회 2~3방울, 1일 2~4회). 1회용 제품은 개봉 후 1회만 사용하고, 최초 사용 시 1~2방울은 버린 뒤 점안합니다. 용기 끝이 눈꺼풀·속눈썹에 닿지 않게 합니다.

**주의 대상**
2주 정도 사용 후에도 증상이 개선되지 않으면 사용을 중단하고 약사 또는 의사에게 확인하세요. 상당한 각막 손상이 있는 사람은 사용 전 상의하고, 성분 과민반응이 나타나면 즉시 사용을 중단합니다.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

## 7. 기존 seed 3건 원문 대조 검증

`CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-V1.md` seed 대조:

| seed group_key | 판정 | 조치 |
|---|---|---|
| `...sodium_hyaluronate::0.1pct::eye_drop` | **수정** | 농도 0.1%는 명칭·원문에서 확인 불가 → 초안 5에서 `unspecified`로 변경, 농도 창작 제거 |
| `...carboxymethylcellulose_sodium::0.5pct::eye_drop` | **유지+보강** | 0.5% 명칭 확인(54건). 효능/주의를 원문 기반으로 구체화(72시간 지속 중단, 소프트렌즈 15분, 점도 흐림) |
| `...povidone::2pct::eye_drop` | **유지+보강** | 2% 명칭 확인(3건). 용법(1~2방울 1일 4~5회), 하드렌즈 사용/소프트 회피 원문 반영 |

추가: seed에 없던 **CMC 1%**(명칭 68건, 0.5%보다 많음)와 **PDRN**(효능 축 상이) 신규 그룹 확인.

## 8. 보류한 그룹과 사유

| 대상 | 수 | 작업상 분류 | 사유 |
|---|---:|---|---|
| other(브랜드명만, 성분 name 미표기) | 603 (원문 312) | hold_for_source | 성분을 원문 본문에서 추출해야 그룹 확정 가능 → STAGE2b |
| anti_allergy(케토티펜·크로몰린 등) | 134 (원문 84) | hold_for_pharmacist | 연령·기간·렌즈·병용 주의, 별도 큐레이션(BATCH-EYE-ANTIALLERGY) |
| decongestant(나파졸린 등) | 9 (원문 0) | manual_curation | 원문 없음, 장기사용·녹내장·심혈관 주의 |
| 복합 점안제 | — | manual_curation | 성분 조합·함량별 분리 필요 |
| 세안액 | — | exclude(점안 아님) | route·사용법 상이 |
| 경구 눈영양제(빌베리·은행엽 연질캡슐 S01L) | — | exclude | 점안제 아님(경구) |

## 9. registry 반영 제안

registry 파일 확보 후 아래를 추가/매칭(문서 반영 제안, 직접 변경 아님):

| group_key | batch | status | 비고 |
|---|---|---|---|
| `...carboxymethylcellulose_sodium::0.5pct::eye_drop` | BATCH-EYE-STAGE2 | drafted | 원문 grounded |
| `...carboxymethylcellulose_sodium::1pct::eye_drop` | BATCH-EYE-STAGE2 | drafted | 신규 |
| `...trehalose::unspecified::eye_drop` | BATCH-EYE-STAGE2 | drafted | 농도 성분군 레벨 |
| `...povidone::2pct::eye_drop` | BATCH-EYE-STAGE2 | drafted | 원문 grounded |
| `...sodium_hyaluronate::unspecified::eye_drop` | BATCH-EYE-STAGE2 | drafted | seed 0.1pct 대체 |
| `...polydeoxyribonucleotide_sodium::unspecified::eye_drop` | BATCH-EYE-STAGE2 | drafted | 별도 효능 축 |
| anti_allergy 계열 | BATCH-EYE-ANTIALLERGY | hold_for_pharmacist | 후속 큐레이션 |
| other 브랜드명만 | — | hold_for_source | STAGE2b 성분 추출 |

## 10. 금지사항 준수 확인

| 항목 | 결과 |
|---|---|
| DB write (INSERT/UPDATE/DELETE/DDL) | 0 (SELECT 전용) |
| `product_candidate_description_drafts` 변경 | 0 |
| `shared_product_descriptions` 변경 | 0 (read-only 조회) |
| `ProductDrugExtension` 변경 | 0 |
| `ProductMaster`/`ProductCandidate` 상태 변경 | 0 |
| canonical 승격 | 0 |
| registry 상태 직접 변경 | 0 |
| 매장 콘텐츠/QR/POP/태블릿 연결 | 0 |

## 11. 완료 보고

```text
완료 보고 — WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2-V1

수행:
- 점안제 후보 read-only 재확인 (원문 grounding)
- 인공눈물 성분군 분리 (CMC/트레할로스/포비돈/히알루론산/PDRN)
- e약은요/SPD content 원문 grounding
- 근거 충분 그룹 설명서 초안 6건 작성
- 기존 seed 3건 원문 대조 검증
- 보류 그룹 사유 기록

결과:
- 점안제 후보: 1,392 (원문 913)
- 작성 그룹: 6 (CMC 0.5% / CMC 1% / 트레할로스 / 포비돈 2% / 히알루론산 / PDRN)
- 작성 초안 수: 6
- seed 검증: 히알루론산 0.1%→unspecified 수정, CMC 0.5%·포비돈 2% 유지+보강
- 보류: anti_allergy 134(pharmacist) / decongestant 9(manual) / other 603(source)
- 핵심 확정: 점안 spec=병용량(농도 아님), 농도는 명칭 %만 사용·창작 금지

금지사항: DB write 0 / drafts 0 / SPD 0 / ext 0 / canonical 0 / registry 0

산출물:
- docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2-V1.md

다음 제안:
- BATCH-TOPICAL-LOW-RISK-DRAFT
- 또는 BATCH-EYE-ANTIALLERGY-CURATION
- 또는 STAGE2b: other 603 원문에서 성분 추출 후 그룹 편입
```
