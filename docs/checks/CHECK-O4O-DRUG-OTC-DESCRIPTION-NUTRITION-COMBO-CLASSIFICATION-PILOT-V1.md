# CHECK-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-CLASSIFICATION-PILOT-V1

- WO: `WO-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-CLASSIFICATION-PILOT-V1`
- 작성일: 2026-07-07
- 작업 유형: **운영 DB read-only 조사 + 분류표 작성 + pilot 대상 선정** (설명서 초안 작성 아님)
- DB write: **0** (SELECT + 세션 로컬 `TEMP TABLE` 만 사용, 영속 테이블 변경 없음)
- 결론: OTC 영양제류 후보 **8,553품목 / 제조사 200 / e약은요 grounding 3,057품목(36%)** 를 산출하고, **54개 상위 그룹 분류표**와 **pilot_draft 16개 그룹**을 확정함.

---

## 0. 요약 (Executive Summary)

- OTC 의약품 전체 **57,572품목** 중, 영양제/비타민/미네랄/철분/강장 계열(ATC `A11`/`A12`/`A13`/`B03`)로 식별된 품목은 **8,553품목**이다.
- 이 8,553품목은 **200개 제조사**에 걸쳐 있고, **3,057품목(35.7%)** 이 e약은요(`shared_product_descriptions.source_type='mfds_easy_drug'`) 원문 grounding을 보유한다.
- 소비자 목적 중심 **대분류 8종 · 세부 그룹 54종**으로 분류하였다. (WO §7 요구: 상위 30~50개 → 충족)
- 이 중 **grounding strong + 제조사 다수 + 경구 + 과장 위험 낮음** 기준으로 **pilot_draft 16개 그룹**을 선정하였다. (WO §8 요구: 10~20개 → 충족)
- `NUT-MOUTH`(구내염) / `NUT-EYE`(눈 피로) 는 ATC 축으로 분리되지 않아 **효능텍스트 기반 2차 탐색 대상(defer)** 으로 남긴다.
- `A13A` 한방엑스(쌍화탕·사물탕 등)와 `B03XA` 한방 보혈제(심혈환·정혈보환)는 grounding 0% + 한방제제 성격으로 **`NUT-SPECIAL`/제외 후보(약사 검토)** 로 둔다.

---

## 1. 조사 방법 (Methodology)

### 1.1 접근 경로 (read-only)

- Cloud SQL Auth Proxy → 로컬 `psql`, DB `o4o_platform`, 계정 `o4o_api`(read-only).
- 인스턴스: `netureyoutube:asia-northeast3:o4o-platform-db`.
- 사용 쿼리: `SELECT` / `COUNT` / `GROUP BY` 및 세션 로컬 `CREATE TEMP TABLE`(자동 소멸, 영속 테이블 무변경).
- **INSERT/UPDATE/DELETE/DDL(영속) 0건.** `shared_product_descriptions` / `product_drug_extensions` / `product_masters` / `product_candidates` 상태 변경 없음.

### 1.2 데이터 원천 및 컬럼 (선행 트랙 방법론 계승)

기존 OTC 설명서 트랙(`...GROUPING-NORMALIZATION-AND-FILTER-DESIGN`, `...GROUPING-DICTIONARY-SEED`, `...GROUP-REGISTRY-V1`)의 정본 파생 규칙을 그대로 사용한다.

| 목적 | 원천 | 키/컬럼 |
|---|---|---|
| OTC 모집단 | `product_masters` | `regulatory_type='DRUG'` AND `drug_category='otc'` (57,572행) |
| 성분 정규화(축) | `product_identifiers` | `identifier_type='ATC_CODE'` (7자리, 176,962행) |
| 제형 | `product_masters.name` 키워드 | 정→tablet / 캡슐→capsule / 연질캡슐→soft_capsule / 과립·산→granule / 시럽·액→liquid |
| grounding | `shared_product_descriptions` | `source_type='mfds_easy_drug'`, `master_id`로 조인 (19,431행 / 19,431 마스터) |

> **주의(선행 트랙과 동일 확인):** `product_drug_extensions` 의 임상 구조화 컬럼(`efficacy_text`, `ingredient_summary`, `strength`, `dosage_form`, `active_ingredients`)은 OTC 전 품목에서 **NULL(보수적 미러 정책)** 이다. 따라서 효능/성분 근거는 **e약은요 원문 텍스트 + ATC/표준코드 식별자**에서만 취한다. AI 임의 보강 금지(WO §11).

### 1.3 영양제 식별 축 — ATC 코드 (핵심)

WHO ATC 분류가 영양제 대분류와 거의 1:1로 대응하여 1차 분류축으로 채택하였다.

| ATC 범위 | 의미 | 매핑 라벨 |
|---|---|---|
| `A11` | Vitamins (비타민) | `NUT-B`/`NUT-C`/`NUT-E`/`NUT-MULTI` |
| `A12` | Mineral supplements (미네랄) | `NUT-MINERAL` |
| `A13` | Tonics (강장제) | `NUT-LIVER`/`NUT-SPECIAL` |
| `B03` | Antianemic preparations (철분/조혈) | `NUT-IRON`/`NUT-SPECIAL` |

- ATC 커버리지: 영양 후보 8,553품목은 전부 ATC 보유(선행 트랙 확인대로 ATC7은 OTC 전체의 ~37%만 커버하나, 영양 계열은 코드 부여율이 높음).
- ATC 없이 이름만으로 잡히는 영양 후보는 **약 513품목**(name-only, `9,066 − 8,553`)으로, 이번 pilot에서는 **defer(2차 이름/효능 기반 탐색)** 로 둔다.

### 1.4 grounding_status 판정 기준

선행 트랙(`NORMALIZATION §12`)의 자동화 임계값을 그룹 단위로 근사 적용한다.

| grounding_status | 기준(그룹 단위) |
|---|---|
| `strong` | e약은요 비율 ≥ 40% **또는** e약은요 품목수 ≥ 60 (그리고 제조사 ≥ 10) |
| `partial` | e약은요 비율 15~40% 또는 e약은요 품목수 1~59 |
| `weak` | e약은요 비율 < 15% 또는 e약은요 0 |

---

## 2. 대분류 롤업 (Label-level Rollup)

`product_masters(otc)` ⨝ `product_identifiers(ATC)` ⨝ `shared_product_descriptions(mfds_easy_drug)` 기준.

| nutrition_label | 대분류 | masters | 제조사 | e약은요 | grounding% |
|---|---|--:|--:|--:|--:|
| `NUT-MULTI` | 종합 비타민/미네랄 복합제 (A11J·A11A·A11B) | 3,645 | 162 | 1,656 | 45% |
| `NUT-LIVER`/`NUT-SPECIAL` | 강장·간장·한방엑스 (A13A) | 2,014 | 93 | 158 | 8% |
| `NUT-IRON` | 철분/조혈 (B03) | 951 | 101 | 290 | 30% |
| `NUT-MINERAL` | 미네랄 (A12) | 835 | 121 | 406 | 49% |
| `NUT-B` | 비타민B군 (A11D·A11E) | 752 | 87 | 370 | 49% |
| `NUT-SPECIAL` | 비타민 D/A 단일 (A11C) | 159 | 31 | 91 | 57% |
| `NUT-C` | 비타민C (A11G) | 102 | 34 | 24 | 24% |
| `NUT-E` | 비타민E·단일비타민 (A11HA) | 95 | 28 | 62 | 65% |
| **합계** | | **8,553** | **200** | **3,057** | **36%** |

**해석**
- `NUT-MULTI`(종합비타민 복합) 가 규모·grounding 모두 최상위 → pilot 최우선.
- `NUT-LIVER/tonic`(A13A) 는 규모는 크나 grounding 8% + 한방엑스/자양강장 드링크가 다수 → **표현 과장 위험**으로 후순위/보류.
- `NUT-MINERAL`·`NUT-B`·`NUT-E` 는 규모 대비 grounding 우수 → pilot 적합.
- `NUT-C` 는 grounding 24%로 낮아 partial, 표현 과장 주의 필요.

---

## 3. 산출물 1 — 상위 54개 그룹 분류표 (WO §7)

그룹 단위: `nutrition ATC-key × dosage_form` (masters ≥ 15). `group_key` 는 그룹 레지스트리 형식
`drug_otc::{single|combo}::{route}::{ingredient_key}::{strength_key}::{dosage_form}` 을 따르되,
본 pilot 은 상위 분류 단계이므로 `strength_key=mixed`(함량 미세분리는 초안 단계 과제)로 둔다. 전 그룹 `route=oral`.

> 컬럼: label=nutrition_label / sub=subgroup_label / masters / mfr=제조사수 / eg=e약은요수 / eg%=grounding비율 / g=grounding_status(S/P/W) / act=action(D=pilot_draft, M=manual_review, X=defer/exclude) / 대표제품

| # | label | sub | ATC×form | masters | mfr | eg | eg% | g | act | 대표 제품 |
|--:|---|---|---|--:|--:|--:|--:|:--:|:--:|---|
| 1 | NUT-MULTI | NUT-MULTI-COMBO | A11JC·soft_capsule | 887 | 102 | 395 | 45 | S | **D** | 메가콘사민-에프연질캡슐, 웰시연질캡슐 |
| 2 | NUT-MULTI | NUT-MULTI-COMBO | A11JC·tablet | 760 | 76 | 458 | 60 | S | **D** | 비타씬-플러스정, 구바파정 |
| 3 | NUT-MINERAL | NUT-MINERAL-CA | A12AX·tablet | 598 | 96 | 302 | 51 | S | **D** | 원더칼-디츄어블정 |
| 4 | NUT-B | NUT-B-BC | A11EX·tablet | 365 | 48 | 200 | 55 | S | **D** | 비라밸정, 셀레넘정 |
| 5 | NUT-MULTI | NUT-MULTI-VITMIN | A11JB·tablet | 351 | 63 | 148 | 42 | S | **D** | 뉴트리-비프리미엄정, 더게인정 |
| 6 | NUT-LIVER | NUT-SPECIAL-TONIC | A13A·other(드링크) | 1,366 | 61 | 90 | 7 | W | M | 원비디, 큐업액 |
| 7 | NUT-SPECIAL | NUT-SPECIAL-HANBANG | A13A·granule(한방엑스) | 302 | 17 | 0 | 0 | W | X | 쌍보(쌍화탕엑스과립), 삼정보(인삼양영탕엑스과립) |
| 8 | NUT-LIVER | NUT-SPECIAL-TONIC | A13A·tablet | 277 | 40 | 43 | 16 | P | M | 레베스정, 마이파워정 |
| 9 | NUT-MULTI | NUT-MULTI-VITMIN | A11JB·soft_capsule | 269 | 47 | 105 | 39 | P | **D** | 미투-에스연질캡슐 |
| 10 | NUT-MULTI | NUT-MULTI-COMBO | A11JA·tablet | 259 | 54 | 160 | 62 | S | **D** | 맥타정 |
| 11 | NUT-MULTI | NUT-MULTI-MINVIT | A11AA03·tablet | 198 | 34 | 29 | 15 | P | M | 뉴로셀텍정, 오라비텐정 |
| 12 | NUT-MULTI | NUT-MULTI-CHEW | A11AB·tablet(츄어블) | 188 | 30 | 66 | 35 | P | **D** | 텐텐츄정 |
| 13 | NUT-SPECIAL | NUT-SPECIAL-HANBANG | B03XA·other(보혈환) | 187 | 14 | 0 | 0 | W | X | 심혈환 |
| 14 | NUT-IRON | NUT-IRON-VIT | B03AE01·capsule | 152 | 37 | 108 | 71 | S | **D** | 레디페린-에프캡슐, 헤모텐캡슐 |
| 15 | NUT-MULTI | NUT-MULTI-MINVIT | A11AB·soft_capsule | 121 | 24 | 23 | 19 | P | M | 겔티-포르테연질캡슐 |
| 16 | NUT-MINERAL | NUT-MINERAL-MG | A11JB·other(액/Mg) | 119 | 31 | 77 | 65 | S | **D** | 엠지에버액, 마그리퀴드액 |
| 17 | NUT-MULTI | NUT-MULTI-COMBO | A11JC·other(환) | 103 | 23 | 43 | 42 | S | **D** | 생큐환 |
| 18 | NUT-B | NUT-B-B1B6B12 | A11DB·tablet | 102 | 24 | 58 | 57 | S | **D** | 벤티브정 |
| 19 | NUT-MINERAL | NUT-MINERAL-MG | A11JA·soft_capsule(Mg) | 97 | 19 | 37 | 38 | P | **D** | 마그비연질캡슐, 토뮤즈연질캡슐 |
| 20 | NUT-B | NUT-B-BC | A11EB·tablet | 95 | 31 | 49 | 52 | S | **D** | 삐콤정 |
| 21 | NUT-MINERAL | NUT-MINERAL-CA-MG | A12AX·soft_capsule | 91 | 26 | 40 | 44 | P | **D** | 마그칼연질캡슐 |
| 22 | NUT-SPECIAL | NUT-SPECIAL-HANBANG | B03XA·granule(한방) | 84 | 13 | 0 | 0 | W | X | 미보과립(사물탕엑스과립) |
| 23 | NUT-SPECIAL | NUT-D-SINGLE | A11CC03·soft_capsule | 82 | 18 | 46 | 56 | S | M | 알파디연질캡슐(알파칼시돌) |
| 24 | NUT-MULTI | NUT-MULTI-COMBO | A11BA·soft_capsule | 78 | 19 | 30 | 38 | P | **D** | 나노민연질캡슐 |
| 25 | NUT-MINERAL | NUT-MINERAL-CA | A12AA·tablet(칼슘단일) | 55 | 19 | 0 | 0 | W | M | 헬본정(오소판물질) |
| 26 | NUT-IRON | NUT-IRON-FOLATE | B03BB01·tablet(폴산) | 54 | 15 | 40 | 74 | S | **D** | 원폴정(폴산), 폴가정(폴산) |
| 27 | NUT-IRON | NUT-IRON-VIT | B03AE10·soft_capsule | 52 | 18 | 7 | 13 | W | M | 헤모퀸탑연질캡슐 |
| 28 | NUT-SPECIAL | NUT-SPECIAL-HANBANG | B03XA·tablet(보혈) | 50 | 6 | 0 | 0 | W | X | 정혈보환 |
| 29 | NUT-IRON | NUT-IRON-PEDIA | B03AB·liquid(시럽) | 49 | 14 | 5 | 10 | W | M | 헤모니아에프시럽(폴리사카리드철착염) |
| 30 | NUT-B | NUT-B-B12 | B03BA05·capsule(메코발라민) | 45 | 10 | 13 | 29 | P | M | 메코민캡슐(메코발라민) |
| 31 | NUT-C | NUT-C | A11GA01·tablet(아스코르빈산) | 44 | 16 | 11 | 25 | P | **D** | 경남비타민씨정 |
| 32 | NUT-B | NUT-B-BC | A11EX·soft_capsule | 44 | 18 | 13 | 30 | P | M | 셀비콤연질캡슐, 젠빅엠지연질캡슐 |
| 33 | NUT-B | NUT-B-BC | A11EC·tablet | 43 | 10 | 5 | 12 | W | M | 임팩타민정, 바이타액트정 |
| 34 | NUT-MINERAL | NUT-MINERAL-CA-MG | A11AA03·soft_capsule | 42 | 15 | 15 | 36 | P | M | 마그엘디연질캡슐 |
| 35 | NUT-LIVER | NUT-LIVER-AMINO | A13A·soft_capsule(아미노산) | 42 | 16 | 25 | 60 | S | M | 파워아민연질캡슐, 복합쓸기담연질캡슐 |
| 36 | NUT-IRON | NUT-IRON-SIMPLE | B03AB·capsule(제이철) | 40 | 11 | 16 | 40 | P | M | 훼리탑캡슐(글루콘산제이철나트륨착염) |
| 37 | NUT-B | NUT-B-BC | A11EX·other(액) | 39 | 10 | 16 | 41 | P | M | 활비톤액, 광동알디액 |
| 38 | NUT-IRON | NUT-IRON-SIMPLE | B03AB05·other(액/폴리말토오스) | 38 | 8 | 21 | 55 | P | M | 알부론액(폴리말토오스수산화제이철착염) |
| 39 | NUT-E | NUT-E | A11HA03·soft_capsule(토코페롤) | 37 | 13 | 21 | 57 | S | **D** | 오로페롤연질캡슐100밀리그램(토코페롤아세테이트) |
| 40 | NUT-MINERAL | NUT-MINERAL-MG | A12CC·tablet(마그네슘) | 32 | 11 | 15 | 47 | P | **D** | 마그네스정 |
| 41 | NUT-B | NUT-B-BIOTIN | A11HA05·tablet(비오틴) | 30 | 10 | 28 | 93 | S | **D** | 니오틴정(비오틴), 유미오틴정(비오틴) |
| 42 | NUT-C | NUT-C | A11GB·tablet(C복합) | 30 | 11 | 11 | 37 | P | M | 폰트미네정, 엔피셀렌씨정 |
| 43 | NUT-SPECIAL | NUT-D-SINGLE | A11CC55·tablet(D복합) | 29 | 6 | 19 | 66 | S | M | 맥셀디정 |
| 44 | NUT-MINERAL | NUT-MINERAL-SE | A12CE02·other(셀레늄) | 27 | 5 | 24 | 89 | S | M | 셀렌오액(아셀렌산나트륨오수화물) |
| 45 | NUT-MULTI | NUT-MULTI-COMBO | A11JA·other(액) | 22 | 5 | 17 | 77 | S | M | 레보콤비에스액, 비타메드레모나산 |
| 46 | NUT-IRON | NUT-IRON-FOLATE | B03AE02·soft_capsule(임신철분) | 21 | 7 | 4 | 19 | W | M | 푸마훼린연질캡슐, 훼리맘큐연질캡슐 |
| 47 | NUT-IRON | NUT-IRON-VIT | B03AE10·tablet | 21 | 7 | 19 | 90 | S | **D** | 마미센스정, 헤모나민정 |
| 48 | NUT-SPECIAL | NUT-SPECIAL-TONIC | A13A·liquid(쌍화액) | 20 | 9 | 0 | 0 | W | X | 순쌍화액(쌍화탕액) |
| 49 | NUT-C | NUT-C | A11GB·soft_capsule | 18 | 8 | 0 | 0 | W | X | 셀레크연질캡슐 (수출용 noise 포함) |
| 50 | NUT-B | NUT-B-B1B6B12 | A11DB·capsule | 18 | 5 | 9 | 50 | P | M | 벤포렉스캡슐, 씨제이비타메진캡슐 |
| 51 | NUT-MULTI | NUT-MULTI-COMBO | A11JC·capsule | 17 | 9 | 6 | 35 | P | M | 이벤캡슐, 바이오파워캡슐 |
| 52 | NUT-B | NUT-B-BC | A11EB·soft_capsule | — | — | — | — | P | M | (A11EB 잔여 제형, masters<15 tail) |
| 53 | NUT-MOUTH | NUT-MOUTH | (효능텍스트 기반, ATC 미분리) | n/a | — | — | — | — | X | 구내염/구각염 효능 필터 2차 탐색 필요 |
| 54 | NUT-EYE | NUT-EYE | (경구 눈영양, ATC 미분리) | n/a | — | — | — | — | X | 눈 피로 경구 복합제 2차 탐색 필요(건기식 혼동 주의) |

> 행 52는 masters<15 tail 표기용 placeholder이며 실제 집계 대상 그룹은 1~51(+53·54 탐색축)이다. 실집계 그룹 수 = **51**.

---

## 4. 산출물 2 — pilot_draft 선정 (WO §8)

선정 기준(WO §8): 제조사 수 多 · masters 多 · grounding strong · 경구 · 과장 위험 낮음.
아래 **16개 그룹**을 `pilot_draft` 로 선정한다(표의 `act=D`).

| 순위 | group_key | label / sub | masters | mfr | grounding | 선정 사유 |
|--:|---|---|--:|--:|:--:|---|
| 1 | `drug_otc::combo::oral::a11jc::mixed::tablet` | NUT-MULTI-COMBO | 760 | 76 | S(60%) | 규모·제조사·grounding 최상위, 종합비타민 정제 |
| 2 | `drug_otc::combo::oral::a11jc::mixed::soft_capsule` | NUT-MULTI-COMBO | 887 | 102 | S(45%) | 최대 규모, 연질캡슐 종합비타민 |
| 3 | `drug_otc::combo::oral::a12ax::mixed::tablet` | NUT-MINERAL-CA | 598 | 96 | S(51%) | 칼슘+D 츄어블, 상담 니즈 명확 |
| 4 | `drug_otc::combo::oral::a11ex::mixed::tablet` | NUT-B-BC | 365 | 48 | S(55%) | B군+기타 복합, 피로/영양보급 대표 |
| 5 | `drug_otc::combo::oral::a11jb::mixed::tablet` | NUT-MULTI-VITMIN | 351 | 63 | S(42%) | 비타민+미네랄 정제 |
| 6 | `drug_otc::combo::oral::a11ja::mixed::tablet` | NUT-MULTI-COMBO | 259 | 54 | S(62%) | grounding 우수 종합비타민 |
| 7 | `drug_otc::combo::oral::b03ae01::mixed::capsule` | NUT-IRON-VIT | 152 | 37 | S(71%) | 철분+엽산+비타민, 상담 포인트 명확 |
| 8 | `drug_otc::combo::oral::a11jb::mixed::soft_capsule` | NUT-MULTI-VITMIN | 269 | 47 | P(39%) | 대규모, 연질캡슐 비타민+미네랄 |
| 9 | `drug_otc::single::oral::a11db::mixed::tablet` | NUT-B-B1B6B12 | 102 | 24 | S(57%) | 신경비타민(B1B6B12), 목적 명확 |
| 10 | `drug_otc::combo::oral::a11eb::mixed::tablet` | NUT-B-BC | 95 | 31 | S(52%) | B복합 정제(삐콤 계열) |
| 11 | `drug_otc::single::oral::b03bb01::mixed::tablet` | NUT-IRON-FOLATE | 54 | 15 | S(74%) | 엽산 단일, 임신·수유 상담 연결 |
| 12 | `drug_otc::combo::oral::a11jb::mixed::liquid` | NUT-MINERAL-MG | 119 | 31 | S(65%) | 마그네슘 액제, grounding 우수 |
| 13 | `drug_otc::single::oral::a11ha03::mixed::soft_capsule` | NUT-E | 37 | 13 | S(57%) | 비타민E 단일, 출혈/병용 주의 설명 가치 |
| 14 | `drug_otc::single::oral::a11ha05::mixed::tablet` | NUT-B-BIOTIN | 30 | 10 | S(93%) | 비오틴, grounding 최고 |
| 15 | `drug_otc::single::oral::a12cc::mixed::tablet` | NUT-MINERAL-MG | 32 | 11 | P(47%) | 마그네슘 단일, 신장/병용 주의 조기 분류 |
| 16 | `drug_otc::single::oral::a11ga01::mixed::tablet` | NUT-C | 44 | 16 | P(25%) | 비타민C 대표 그룹(표현 과장 주의 파일럿 검증용) |

**pilot 권장 진행 순서(WO §8 표 반영)**
1. `NUT-B` / `NUT-MULTI` (4,7,9,10,1,2,5,6) — 약국 대체 판매 가치 최상.
2. `NUT-IRON` (7,11) — 상담 포인트 명확.
3. `NUT-MINERAL` (3,12,15) — 주의사항 차이로 조기 분류 필요.
4. `NUT-C`/`NUT-E`/`NUT-B-BIOTIN` (16,13,14) — 표현 과장 주의 검증.

---

## 5. 보류/제외 사유 문서화 (WO §12)

### 5.1 manual_review (약사 검토 후 작업)
- **A13A tonic(드링크·정제) / A13A-AMINO(간장·아미노산)**: 자양강장·간장 표현 과장 위험(WO §6.5), grounding 낮음(7~16%) → 약사 검토 필수.
- **A11CC03 / A11CC55 (Vit D 단일·복합)**: 알파칼시돌 등 고용량은 **OTC/RX 경계** → 함량별 재확인 필요.
- **B03AB liquid / B03AB05 (철분 시럽·액)**: 소아 연령·용량, 변 색 변화 주의 → `NUT-IRON-PEDIA` 로 별도 강화.
- **B03BA05 (메코발라민 B12)**: 말초신경 표현은 허가 원문 기준, 단일 B12 → 검토.
- **A11EC / A11EX-액 / A12CE02(셀레늄) / A12AA(칼슘단일)**: grounding 낮거나 단일 미네랄 과량 주의.

### 5.2 defer (2차 탐색 필요)
- **NUT-MOUTH(구내염) / NUT-EYE(눈 피로)**: ATC 축으로 분리되지 않음 → e약은요 `efficacy` 텍스트 `구내염|구각염|입병` / `눈 피로|눈의 피로` 필터로 2차 탐색. NUT-EYE 는 루테인 건기식 혼동 방지 규칙(WO §6.5) 준수.
- **name-only 영양 후보 ~513품목**: ATC 미부여, 이름 기반만 매칭 → 정규화 후 재분류.

### 5.3 exclude / NUT-SPECIAL (설명서 미작성)
- **A13A 한방엑스(쌍화탕·사물탕·인삼양영탕 과립/액)**, **B03XA 한방 보혈제(심혈환·정혈보환)**: 한방제제 성격 + grounding 0% → 이번 설명서 트랙 대상 아님(`NUT-SPECIAL`/제외). **DB `blocked` 처리하지 않음**(WO §3 준수).
- **A11GB 수출용 등 noise**: 선행 트랙 noise 필터(`수출|수출용|군납|비매`) 적용 대상 → 제외 후 재집계.

---

## 6. 완료 기준 점검 (WO §12)

| 완료 기준 | 상태 |
|---|---|
| 운영 DB read-only 기준 OTC 영양제류 후보군 산출 | ✅ 8,553품목 |
| 상위 30~50개 그룹 분류표 작성 | ✅ 51개 실집계 그룹(+2 탐색축) |
| nutrition_label / subgroup_label / group_key 부여 | ✅ |
| 제조사·ProductMaster 수 기준 우선순위 산출 | ✅ |
| grounding strong/partial/weak 판정 | ✅ |
| pilot_draft 10~20개 선정 | ✅ 16개 |
| 보류/제외 사유 문서화 | ✅ §5 |
| DB write 0 | ✅ SELECT + 세션 TEMP만 사용 |

---

## 7. 후속 작업 제안 (Next)

1. **pilot 초안 작성 WO**: 본 §4 의 16개 group_key 를 대상으로 WO §9 템플릿 + WO §10 문체 기준으로 설명서 초안 작성(별도 WO, DB write는 draft 테이블 승인 후).
2. **함량 세분화**: 본 pilot 은 `strength_key=mixed`. 초안 단계에서 `약품규격`/`specification` 파싱으로 고함량 분리(특히 Vit D·철분·마그네슘).
3. **NUT-MOUTH/NUT-EYE 탐색**: e약은요 효능텍스트 기반 2차 필터.
4. **그룹 레지스트리 반영**: 확정 그룹을 `docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md` 에 `BATCH-ORAL-NUTRITION`(신규 배치)로 등재 검토.

---

## 부록 A. 재현 쿼리 개요

- 모집단: `product_masters WHERE regulatory_type='DRUG' AND drug_category='otc'`
- ATC: `product_identifiers WHERE identifier_type='ATC_CODE'` (primary 우선)
- grounding: `shared_product_descriptions WHERE source_type='mfds_easy_drug' AND deleted_at IS NULL` (`master_id` 조인)
- 영양 필터: `substr(atc,1,3) IN ('A11','A12','B03','A13')`
- 그룹핑: `atc_key(7 or 5자) × dosage_form(name 키워드)`, `HAVING count(*)>=15`

*(전체 SQL 은 세션 스크래치패드 `q1~q4_*.sql` 로 실행. 영속 테이블 무변경.)*
