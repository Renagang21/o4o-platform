# CHECK-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-STRENGTH-SPLIT-V1

- WO: `WO-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-STRENGTH-SPLIT-V1`
- 선행: `CHECK-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-CLASSIFICATION-PILOT-V1`, `CHECK-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-PILOT-DRAFT-V1`
- 작성일: 2026-07-07
- 작업 유형: **운영 DB read-only 재분해 + 설명서 적용 단위 분리표 작성** (DB 저장 아님)
- DB write: **0** (SELECT + 세션 로컬 TEMP TABLE만)
- 결론: pilot 16개 그룹을 **적용 단위 35개 split_group_key**로 재분리. 이 중 **use_existing_draft 19 · revise_draft 11 · manual_review 5**. **중요 발견: A11JC/tab·A11EX/tab·A11JB/tab·A11JB/sc의 기존 pilot 대표가 소수 하위군이어서 기준 초안 revise 필요.**

---

## 1. 분해 방법

### 1.1 두 개의 분리 축

pilot 초안이 `strength_key=mixed` 였던 이유는 그룹 안에 (a) 함량이 다른 단일제와 (b) 성분 조합이 다른 복합제가 섞여 있었기 때문이다. 두 유형은 분리 축이 다르다.

| 유형 | 분리 축 | 근거 컬럼 |
|---|---|---|
| **단일제** (비타민C·비오틴·비타민E·마그네슘·엽산) | **함량(mg/IU)** | `product_masters.specification` 첫 토큰(= 함량, 단위 `밀리그램`) |
| **복합제** (종합비타민·비타민+미네랄+철) | **성분 조합** (비타민A 포함·철분 포함) | e약은요 원문(`shared_product_descriptions.content`)의 안전문구 |

### 1.2 규격 포맷 확인

`specification` = `함량 / 포장수량 / 제형 / 포장형태` (예: `1030밀리그램 / 180 / 정 / PTP`). **첫 토큰만 함량**이고 나머지는 포장 축이므로 분리 기준에서 제외한다(가이드 §3.2). 같은 제품명이 `/0`, `/180/정/PTP` 등으로 여러 row인 것은 전부 포장 변형이다.

### 1.3 복합제 성분 조합 축 (안전문구 기반)

복합제는 첫 토큰 함량이 제품마다 제각각(60·618·75·51.55mg 등 = 총량/주성분 중량)이라 **함량 축이 무의미**하다. 대신 복용법·경고를 실제로 가르는 두 성분을 e약은요 원문에서 탐지했다.

| 태그 | 탐지 근거 | 왜 분리하나 |
|---|---|---|
| `A+` | 원문에 "비타민 A를 1일 5,000 IU 이상 … 선천성 기형" 경고 | **임신 3개월 이내 복용 금지 경고**가 갈림 |
| `Fe+` | 원문에 "철 결핍성 빈혈" 효능 또는 "철분 중독성 사망" 경고 | **철분제 경고·병용 주의·흡수 상호작용**이 갈림 |

> 이 축은 **안전 문구가 갈리는 최소 성분 분리**다. 더 미세한 성분 세트(정확히 어떤 비타민이 몇 mg인지)까지의 분리는 마스터별 주성분 파싱이 추가로 필요하며, 본 표에서는 안전 임계 축(A/Fe)까지만 확정하고 나머지는 초안 단계 과제로 둔다(§5 한계).

---

## 2. 핵심 발견 — 기존 pilot 대표가 소수 하위군인 경우

pilot 초안(선행 CHECK §4)은 그룹당 대표 ProductMaster 1건 원문으로 작성했는데, 재분해 결과 **일부 대표가 그룹 내 다수 하위군이 아니었다.** 해당 초안은 다수(baseline) 하위군용으로 revise가 필요하다.

| original_group | 기존 초안 대표 | 대표의 조합 | 실제 다수 하위군 | 조치 |
|---|---|---|---|---|
| [1] A11JC/tablet | 맥시라민에이정 | **A+/Fe+** (21건) | **A-/Fe-** 407건 | 다수용 baseline 초안 revise 필요 |
| [4] A11EX/tablet | 모아헬드원정 | **A+/Fe+** (2건) | **A-/Fe-** 188건 | 다수용 baseline 초안 revise 필요 |
| [5] A11JB/tablet | 엠디멀티비타정 | **A-/Fe+** (29건) | **A-/Fe-** 117건 | 다수용 baseline 초안 revise 필요 |
| [8] A11JB/soft_capsule | 쎌업연질캡슐 | **A+/Fe-** (29건) | **A-/Fe-** 76건 | 다수용 baseline 초안 revise 필요 |
| [2] A11JC/soft_capsule | 마그랑비연질캡슐 | A-/Fe- (277건) | A-/Fe- 277건 | 대표=다수 (기존 초안 사용 가능) |

---

## 3. 산출물 — split 분리표 (WO 필수 표)

`action`: `use_existing_draft` / `revise_draft` / `manual_review` / `defer` / `exclude`

### 3.1 단일제 (함량 축)

| original_group | split_group_key | 성분/함량 기준 | master_count | manufacturer_count | action | reason |
|---|---|---|--:|--:|---|---|
| [14] A11HA05 biotin/tab | `drug_otc::single::oral::a11ha05::5mg::tablet` | 비오틴 5mg 단일 | 30 | 10 | **use_existing_draft** | 전량 5mg 단일 함량, 분리 불필요 |
| [16] A11GA01 VitC/tab | `drug_otc::single::oral::a11ga01::1000mg::tablet` | 비타민C 1000mg급 | 38 | 15 | **use_existing_draft** | 기존 대표(유한비타민씨정1000mg)=이 버킷 |
| [16] A11GA01 VitC/tab | `drug_otc::single::oral::a11ga01::500mg::tablet` | 비타민C 500mg | 6 | 2 | **revise_draft** | 효능 동일, 용법·함량 문구만 조정 |
| [16] A11GA01 VitC/tab | `drug_otc::single::oral::a11ga01::100mg::tablet` | 비타민C ~100mg | 6 | 2 | **revise_draft** | 저함량, 용법·고함량주의 완화 |
| [16] A11GA01 VitC/tab | `drug_otc::single::oral::a11ga01::200-300mg::tablet` | 비타민C 206mg 등 | 1 | 1 | **manual_review** | 비정형 단일 함량 |
| [13] A11HA03 VitE/sc | `drug_otc::single::oral::a11ha03::100iu::soft_capsule` | 비타민E 100 IU | 8 | 3 | **use_existing_draft** | 효능 동일, 초안 용량범위(50~1,000IU) 포함 |
| [13] A11HA03 VitE/sc | `drug_otc::single::oral::a11ha03::400iu::soft_capsule` | 비타민E 400 IU | 9 | 6 | **use_existing_draft** | 동일 초안 공유 |
| [13] A11HA03 VitE/sc | `drug_otc::single::oral::a11ha03::1000iu::soft_capsule` | 비타민E 1000 IU | 20 | 7 | **use_existing_draft** | 고용량, 초안에 임신 고용량 주의 이미 포함 |
| [15] A12CC Mg/tab | `drug_otc::single::oral::a12cc::470mg::tablet` | 마그네슘(+B6) 470mg급 | 21 | 8 | **use_existing_draft** | 다수 버킷, 기존 대표(마그네스정)=이 급 |
| [15] A12CC Mg/tab | `drug_otc::single::oral::a12cc::940mg::tablet` | 마그네슘 940mg | 4 | 1 | **revise_draft** | 염 중량 차이, 효능 동일·용법 조정 |
| [15] A12CC Mg/tab | `drug_otc::single::oral::a12cc::290mg::tablet` | 마그네슘 290.8mg | 3 | 1 | **revise_draft** | 염 중량 차이 |
| [15] A12CC Mg/tab | `drug_otc::single::oral::a12cc::5mg::tablet` | 규격 5mg(비정형) | 4 | 2 | **manual_review** | 5mg은 마그네슘 함량으로 비정형, 조성 재확인 |
| [11] B03BB01 folic/tab | `drug_otc::single::oral::b03bb01::1mg::tablet` | 엽산 1mg | 46 | 15 | **use_existing_draft** | 다수 버킷, 초안 용량범위(0.1~1mg) 포함 |
| [11] B03BB01 folic/tab | `drug_otc::single::oral::b03bb01::0.4mg::tablet` | 엽산 0.4mg(예방용량) | 8 | 2 | **use_existing_draft** | 동일 초안 공유(예방 용량대) |

### 3.2 복합제 — 동질 그룹 (분리 불필요)

| original_group | split_group_key | 성분/조합 기준 | master_count | manufacturer_count | action | reason |
|---|---|---|--:|--:|---|---|
| [3] A12AX/tab | `drug_otc::combo::oral::a12ax::caD::tablet` | 칼슘+비타민D (A-/Fe-) | 302 | 58 | **use_existing_draft** | 조합 동질(비타민A·철 없음) |
| [6] A11JA/tab | `drug_otc::combo::oral::a11ja::DEC::tablet` | 비타민 D·E·C (A-/Fe-) | 160 | 34 | **use_existing_draft** | 조합 동질 |
| [7] B03AE01/cap | `drug_otc::combo::oral::b03ae01::feFolVit::capsule` | 철분+엽산·비타민 (Fe+) | 108 | 27 | **use_existing_draft** | 조합 동질(철분·약사검토강화 유지) |
| [9] A11DB/tab | `drug_otc::combo::oral::a11db::Bcomplex::tablet` | 비타민B 중심 복합 (A-/Fe-) | 58 | 13 | **use_existing_draft** | 조합 동질(B12/활성형 세분화는 후속) |
| [10] A11EB/tab | `drug_otc::combo::oral::a11eb::B1B2B6C::tablet` | 비타민 B1·B2·B6·C (A-/Fe-) | 49 | 14 | **use_existing_draft** | 조합 동질 |
| [12] A11JB/liq | `drug_otc::combo::oral::a11jb::mgB::liquid` | 마그네슘+B2·B6 액 (A-/Fe-) | 77 | 16 | **use_existing_draft** | 조합 동질 |

### 3.3 복합제 — 이질 그룹 (성분 조합으로 분리)

| original_group | split_group_key | 성분/조합 기준 | master_count | manufacturer_count | action | reason |
|---|---|---|--:|--:|---|---|
| [1] A11JC/tab | `drug_otc::combo::oral::a11jc::noA-noFe::tablet` | 비타민A·철 없음 (baseline) | 407 | 57 | **revise_draft** | 다수 하위군, 기존 초안(A+/Fe+)에서 A·철 경고 제거해 baseline화 |
| [1] A11JC/tab | `drug_otc::combo::oral::a11jc::A-noFe::tablet` | 비타민A 포함, 철 없음 | 20 | 7 | **revise_draft** | 비타민A 5,000IU 임신경고 유지, 철 문구 제거 |
| [1] A11JC/tab | `drug_otc::combo::oral::a11jc::A-Fe::tablet` | 비타민A+철 포함 | 21 | 6 | **use_existing_draft** | 기존 대표(맥시라민에이정)=이 조합 |
| [1] A11JC/tab | `drug_otc::combo::oral::a11jc::noA-Fe::tablet` | 철 포함, 비타민A 없음 | 10 | 2 | **revise_draft** | 철 경고 유지, 비타민A 경고 제거 |
| [2] A11JC/sc | `drug_otc::combo::oral::a11jc::noA-noFe::soft_capsule` | 비타민A·철 없음 | 277 | 48 | **use_existing_draft** | 다수 하위군=기존 대표(마그랑비) |
| [2] A11JC/sc | `drug_otc::combo::oral::a11jc::A-noFe::soft_capsule` | 비타민A 포함 | 118 | 26 | **revise_draft** | 비타민A 5,000IU 임신경고 추가 |
| [4] A11EX/tab | `drug_otc::combo::oral::a11ex::noA-noFe::tablet` | 비타민A·철 없음 (baseline) | 188 | 31 | **revise_draft** | 다수 하위군, 기존 초안(A+/Fe+)에서 경고 제거해 baseline화 |
| [4] A11EX/tab | `drug_otc::combo::oral::a11ex::A-Fe::tablet` | 비타민A+철 포함 | 2 | 1 | **use_existing_draft** | 기존 대표(모아헬드원정)=이 조합 |
| [4] A11EX/tab | `drug_otc::combo::oral::a11ex::A-noFe::tablet` | 비타민A 포함, 철 없음 | 4 | 1 | **manual_review** | 소수, 원문 개별 확인 |
| [4] A11EX/tab | `drug_otc::combo::oral::a11ex::noA-Fe::tablet` | 철 포함, 비타민A 없음 | 6 | 1 | **manual_review** | 소수, 원문 개별 확인 |
| [5] A11JB/tab | `drug_otc::combo::oral::a11jb::noA-noFe::tablet` | 비타민A·철 없음 (baseline) | 117 | 24 | **revise_draft** | 다수 하위군, 기존 초안(A-/Fe+)에서 철 문구 제거 |
| [5] A11JB/tab | `drug_otc::combo::oral::a11jb::noA-Fe::tablet` | 철 포함 | 29 | 7 | **use_existing_draft** | 기존 대표(엠디멀티비타정)=이 조합 |
| [5] A11JB/tab | `drug_otc::combo::oral::a11jb::A-noFe::tablet` | 비타민A 포함 | 2 | 1 | **manual_review** | 소수, 원문 개별 확인 |
| [8] A11JB/sc | `drug_otc::combo::oral::a11jb::noA-noFe::soft_capsule` | 비타민A·철 없음 (baseline) | 76 | 18 | **revise_draft** | 다수 하위군, 기존 초안(A+/Fe-)에서 비타민A 경고 제거 |
| [8] A11JB/sc | `drug_otc::combo::oral::a11jb::A-noFe::soft_capsule` | 비타민A 포함 | 29 | 8 | **use_existing_draft** | 기존 대표(쎌업연질캡슐)=이 조합 |

---

## 4. 조치 집계

| action | split_group_key 수 | 비고 |
|---|--:|---|
| `use_existing_draft` | 19 | 기존 pilot 초안 그대로 적용 가능 |
| `revise_draft` | 11 | 함량 문구 조정 또는 A/철 경고 가감 |
| `manual_review` | 5 | 소수·비정형, 원문 개별 확인 |
| `defer` | 0 | — |
| `exclude` | 0 | — |
| **합계** | **35** | pilot 16그룹 → 적용 단위 35 split |

---

## 5. 판단 근거 및 한계

- **분리한 것**: 비타민C(100/500/1000mg), 마그네슘 염중량(290/470/940mg), 복합제의 비타민A 포함(임신 5,000IU 경고)·철분 포함(철분 경고/빈혈 효능). 모두 복용법·경고·주의가 실제로 갈리는 축.
- **분리하지 않은 것**: 제조사·브랜드·포장단위·병/갑/PTP 수량(가이드 §3.2). biotin 5mg, 엽산 0.1~1mg대, 비타민E 50~1,000IU는 효능이 동일해 하나의 초안을 공유(용량범위가 이미 초안에 반영됨).
- **한계(초안 단계 과제)**: 복합제의 A/Fe 축은 **안전 임계 최소 분리**다. 정확한 비타민 세트(예: A11JC 안에서 D·E·B군 구성 차이)까지의 세분화는 마스터별 주성분코드 파싱이 추가로 필요하며 본 표 범위 밖. `manual_review` 5건과 baseline revise 초안은 원문 개별 확인 후 확정한다.
- **A11DB(B1B6B12) 명칭 vs 원문**: 원문 대표는 B1·B2·B6 중심으로, B12/활성형(벤포티아민·메코발라민) 포함 여부 세분화는 별도 배치(선행 PILOT-DRAFT §10-2)에서 처리.

---

## 6. 기존 초안 사용/수정/보류 판단 요약 (WO 완료기준)

| original pilot 그룹 | 판단 | 세부 |
|---|---|---|
| [1] A11JC/tab | 분리+revise | baseline(A-/Fe-) revise, A+/Fe+ use_existing, 그 외 revise |
| [2] A11JC/sc | 분리 | A-/Fe- use_existing, A+ revise |
| [3] A12AX/tab | use_existing | 동질 |
| [4] A11EX/tab | 분리+revise | baseline revise, 소수 manual_review |
| [5] A11JB/tab | 분리+revise | baseline revise, Fe+ use_existing |
| [6] A11JA/tab | use_existing | 동질 |
| [7] B03AE01/cap | use_existing | 동질(철분 검토강화 유지) |
| [8] A11JB/sc | 분리+revise | baseline revise, A+ use_existing |
| [9] A11DB/tab | use_existing | 동질(B12 세분화 후속) |
| [10] A11EB/tab | use_existing | 동질 |
| [11] B03BB01/tab | use_existing | 1mg·0.4mg 공유 |
| [12] A11JB/liq | use_existing | 동질 |
| [13] A11HA03/sc | use_existing | 100/400/1000IU 공유 |
| [14] A11HA05/tab | use_existing | 5mg 단일 |
| [15] A12CC/tab | 분리 | 470 use_existing, 940/290 revise, 5mg manual_review |
| [16] A11GA01/tab | 분리 | 1000mg use_existing, 500/100 revise, 206mg manual_review |

---

## 7. 금지사항 준수 확인

| 항목 | 상태 |
|---|---|
| DB write | ✅ 0 (SELECT + 세션 TEMP만) |
| shared_product_descriptions 변경 | ✅ 없음 |
| product_candidate_description_drafts insert/update | ✅ 없음 |
| canonical 승격 | ✅ 없음 |
| registry 직접 수정 | ✅ 없음 |
| 매장 콘텐츠/QR/POP/태블릿 연결 | ✅ 없음 |

---

## 8. 다음 단계 제안

1. **revise_draft 11건 실작성**: baseline(A-/Fe-) 초안을 pilot 초안에서 A·철 경고를 가감해 재작성.
2. **manual_review 5건**: 비타민C 206mg, 마그네슘 5mg, A11EX/A11JB 소수 A/Fe 조합을 원문 개별 확인.
3. **복합제 성분 세트 파싱 배치**: A/Fe 축 하위에서 정확한 비타민 세트 확정(주성분코드 기반).
4. **registry 반영 제안**: 30개 split_group_key를 `BATCH-ORAL-NUTRITION` 하위 키로 등재(직접 수정은 별도 승인).

---

## 부록. 재현 쿼리 개요

- 단일제 함량: `product_masters.specification` 첫 토큰 `substring(spec from '^[0-9.]+')::numeric` 버킷.
- 복합제 조합: e약은요 `content` 정규식 — 비타민A 경고 `비타민 ?A를 1일 ?5,?000` / 철분 `철 ?결핍성 ?빈혈|철분 ?중독`.
- 그룹 매칭: `product_identifiers(ATC_CODE)` × 제형(name 키워드). 세션 스크래치패드 `s2_split.sql`·`s3_vitc.sql`. 영속 테이블 무변경(DB write 0).
