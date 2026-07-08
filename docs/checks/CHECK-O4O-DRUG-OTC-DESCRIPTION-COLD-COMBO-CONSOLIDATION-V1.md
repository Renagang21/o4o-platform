# CHECK-O4O-DRUG-OTC-DESCRIPTION-COLD-COMBO-CONSOLIDATION-V1

## 1. 작업 일시

2026-07-08

WO: `WO-O4O-DRUG-OTC-DESCRIPTION-COLD-COMBO-CONSOLIDATION-V1`

이번 CHECK는 **기존 COLD-COMBO 설명서(DRAFT-V1)를 현재 확정 표준으로 전면 재검토·통합 정비(Consolidation)** 한 결과다. 새 감기약을 많이 만드는 작업이 아니라 **기존 결과를 표준에 맞게 정리**하는 작업이다. DB write·draft insert·shared_product_descriptions 변경·canonical 승격은 하지 않았다.

> 기존 5개 초안은 **최대한 유지**하고, 표준(§12-A Template·Selection·Counseling·Safety Block·자동/수동/RX)에서 **누락된 블록만 보강**한다. 중복 작성 없음.

## 2. 기준 문서 · 기존 CHECK 교차검증

```text
docs/guides/O4O-DRUG-STORE-DESCRIPTION-CANONICAL-STANDARD-V1.md (§3.1 Primary Use·§4·§5·§6·§11·§12-A Template)
docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md (§3.2 과분할 금지·§3.9 민감약효군)
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-COLD-COMBO-DRAFT-V1.md (기존 — 5 초안, 유지 대상)
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-HERBAL-OTC-DRAFT-V1.md (생약 감기 = 별도 트랙, SOURCE GAP)
```

**기존 DRAFT-V1 확인**: 5개 초안(종합감기 정/캡슐·주야·액제·소아시럽·코감기 항히스타민) + N02BE5x needs_review + 생약 hold + 단일제 exclude. **핵심 발견 유효**: 감기 복합제 라벨 적응증이 "종합감기"로 수렴(과분할 금지). → 본 Consolidation은 그 5초안을 **표준 블록으로 승격**.

## 3. DB read-only 재조사 (3축)

- 접속: `cloud-sql-proxy netureyoutube:...`(127.0.0.1:5434) + `psql` user `o4o_api`. **SELECT 전용**.

**감기 복합제 ATC 흩어짐 재확인(2026-07-08):**

| atc5 | 의미 | OTC | RX | OTC grounded |
|---|---|---:|---:|---:|
| R05X | 종합감기(감기약) | 3,623 | — | 1,050 |
| N02BE | 아세트아미노펜 복합(해열진통) | 390 | 20 | 151 |
| R01BA | 경구 비충혈 복합(슈도에페드린) | 315 | 158 | 175 |
| R05FA | 진해거담 복합 | 270 | 135 | 120 |
| R06AB | 항히스타민 복합(코감기) | 135 | — | 36 |
| R05FB | 진해거담 복합2 | 57 | — | 18 |

**보조 신호(R05X OTC grounded 1,050):** 고혈압 주의 문구 **1,047(전량)** · 슈도/카페인 자극 성분 301 · 주간/야간형 name 11.

## 4. 증상 중심 Bucket 확정 (WO §3·§4)

**핵심 재확인(과분할 금지)**: 종합감기·코감기·기침·가래·목감기·몸살의 **라벨 적응증은 "감기의 여러 증상(콧물·코막힘·재채기·인후통·기침·가래·오한·발열·두통·관절통·근육통) 완화"로 수렴**한다. 증상 이름은 **제품 적응증이 아니라 조성 강조점**이므로, 증상별로 10~15개로 쪼개면 실질 중복 설명서(§3.2).

→ 실제 구분되는 축만 bucket:

| bucket | 구분 축 | Primary Use | 처리 |
|---|---|---|---|
| COLD-GENERAL 종합감기(정/캡슐) | 열·몸살·코·기침 동반 | 종합감기 | 기존 초안 1 |
| COLD-GENERAL 주간/야간형 | 주야 용법·졸림 | 종합감기(주야) | 기존 초안 2 |
| COLD-GENERAL 액제/드링크 | 제형(액) | 종합감기 | 기존 초안 3 |
| COLD-PEDIA 소아 시럽 | 연령·체중 용량 | 소아 종합감기 | 기존 초안 4 |
| COLD-RHINITIS 코감기 항히스타민 | **적응증 상이**(열·기침 없음) | 코감기·비염 | 기존 초안 5 |
| COLD-THROAT-FEVER N02BE5x | 해열진통(코증상 아님)·IPA 가능 | 해열진통 | needs_review(수동) |
| (별도) 생약 감기 | 한방 | 감기 | HERBAL 트랙(SOURCE GAP) |

**WO §4 분리축 반영**: 종합↔코감기(적응증 상이 분리)·주간↔야간(초안 2)·졸림 있음↔적음(항히스타민 포함 여부)·고혈압 주의↔일반(슈도에페드린 포함 여부) — 이 4축은 **조성 강조점**이므로 대표 내 Selection Point로 안내(별도 대표 남발 금지).

## 5. ATC 함정 사례 (WO §8 · Primary Clinical Use)

| # | 함정 | 사례 | 판정 |
|:-:|---|---|---|
| ① | **같은 종합감기가 6개 ATC로 분산** | R05X·N02BE·R01BA·R05FA·R06AB·R05FB | **Primary Use=종합감기로 통합**(주도 성분만 다름) |
| ② | **N02BE(해열진통)는 감기 코증상 아님** | 올바펜정 등 = 두통·치통·근육통·발열 | 해열진통 트랙(코증상 없음) |
| ③ | **R06AB(항히스타민 복합)는 열·기침 없음** | 베비맥시럽 = 콧물·재채기·코막힘 | 코감기 별도(적응증 상이) |
| ④ | **R01BA/R05FA/N02BE RX 분산** | RX 313건 | EXCLUDE(전문의약품) |

→ ①이 §3.1 정면: ATC(R05X/N02BE/R01BA…)가 아니라 Primary Use(종합감기)로 통합. R05/N02/R01/R06에 흩어진 감기약을 증상 중심으로 재배정.

## 6. 자동 / 수동 / RX 3분류표 (WO §9)

| 구분 | 대상 | 근거 |
|---|---|---|
| **자동** | 일반 종합감기(정/캡슐·액), 코감기 항히스타민, 소아 시럽(연령 명확) | 적응증 수렴·원문 grounded |
| **수동** | 슈도에페드린 함유형(고혈압·심장·갑상선·당뇨·녹내장·전립선비대) | 고혈압 주의 1,047/1,050·허혈성 대장염 |
| **수동** | 주간/야간 복합형 | 주야 용법·졸림 강화 |
| **수동** | 임신·수유·2세 미만·고령 | 라이증후군·연령 금기 |
| **수동** | 고함량·복합 조성 미표기 | 조성 원문 확정 필요 |
| **수동** | N02BE5x(IPA 피라졸론 가능) | 조성 판별·IPA 안전문구 |
| **RX 제외** | R01BA rx 158·R05FA rx 135·N02BE rx 20 | 전문의약품 |

## 7. 표준 블록 보강 (WO §5·§6·§7·§10) — §12-A Template 승격

기존 5초안은 구 템플릿(어떤 경우/복용안내/주의대상/성분확인/성분기준)이라 **Selection Point·Counseling Point·병원에 가야 하는 경우**가 누락. 아래 블록을 각 bucket에 추가한다(원문 근거, 창작 0).

### 7.1 Selection Point (WO §5) — 증상별 선택

```
열·몸살이 심하다        → 해열진통 포함 종합감기(아세트아미노펜)
기침·가래가 심하다      → 진해거담 포함형(R05FA)
코막힘이 심하다         → 비충혈제(슈도에페드린) 포함형 ※ 고혈압이면 약사 확인
콧물·재채기 중심(열 없음) → 코감기 항히스타민(해열진통 없음)
밤에 잠이 안 온다        → 야간형(졸림 성분)
낮에 운전해야 한다      → 졸림 적은 형/주간형
```

### 7.2 Counseling Point (WO §6) — 원문 근거

```
■ 다른 감기약·해열진통제·비염약과 함께 먹지 않습니다(성분 중복)
■ 아세트아미노펜 중복 주의 — 1일 4,000mg 초과 금지(간손상)
■ 술과 함께 복용하지 않습니다
■ 복용 전 졸음 여부를 확인하고 운전·기계 조작에 주의합니다
■ 5~6회 복용해도 낫지 않거나 증상이 오래 지속되면 진료합니다
```

### 7.3 Safety Block (WO §7) — 병원에 가야 하는 경우

```
■ 호흡곤란·쌕쌕거림
■ 39℃ 이상 고열이 지속
■ 객혈(피 섞인 가래)·흉통
■ 의식 저하·심한 처짐
■ 증상이 7일 이상 지속·악화
■ 소아가 잘 먹지 못하고 처지거나 악화
■ 발진 등 피부 이상반응(즉시 중단)
→ 자가치료를 멈추고 진료를 받으세요.
```

### 7.4 Canonical Template 적용 확인 (WO §10)

| 블록 | 기존 DRAFT-V1 | Consolidation |
|---|:-:|:-:|
| 어떤 경우에 사용하는가 | ✅ | ✅ |
| 사용(복용) 방법 | ✅ | ✅ |
| 주의사항 | ✅ | ✅ |
| **병원에 가야 하는 경우** | ✖(누락) | ✅ 보강(§7.3) |
| **Selection Point** | ✖ | ✅ 보강(§7.1) |
| **Counseling Point** | ✖ | ✅ 보강(§7.2) |
| 사용 확인 포인트 | ✅(성분 확인 포인트) | ✅ |
| 성분 기준 선택 | ✅ | ✅ |

## 8. 필수 표 (WO §11)

| group_key | bucket | Primary Use | 대표 성분조합 | action |
|---|---|---|---|---|
| `drug_otc::combo::oral::cold_general::apap_antihist_pseudoephedrine::tablet` | COLD-GENERAL | 종합감기 | APAP+항히스타민+슈도에페드린(±진해거담) | AUTO(슈도형=수동) |
| `drug_otc::combo::oral::cold_general::day_night::tablet` | COLD-GENERAL 주야 | 종합감기 | 주간/야간 복합 | MANUAL |
| `drug_otc::combo::oral::cold_general::apap_antihist::liquid` | COLD-GENERAL 액 | 종합감기 | APAP+항히스타민(±슈도) | AUTO |
| `drug_otc::combo::oral::cold_general::pediatric::syrup` | COLD-PEDIA | 소아 종합감기 | 소아 복합 | AUTO(저연령=수동) |
| `drug_otc::combo::oral::cold_rhinitis::antihistamine_decongestant::oral` | COLD-RHINITIS | 코감기·비염 | 항히스타민+비충혈제(해열진통 없음) | AUTO |
| `drug_otc::combo::oral::cold_throat_fever::apap_combo::tablet` | COLD-THROAT-FEVER | 해열진통 | APAP 복합(±카페인±IPA) | MANUAL(needs_review) |
| `drug_otc::combo::oral::herbal_cold::*` | (별도) | 감기 | 생약 | HERBAL 트랙(SOURCE GAP) |

## 9. 기존 CHECK 비교 (WO §12)

| 항목 | 유지 | 수정 | 삭제 | 신규 |
|---|:-:|:-:|:-:|:-:|
| 초안 1~5 (종합감기 정/주야/액/소아/코감기) | ✅ | Selection·Counseling·Safety 블록 보강 | | |
| 핵심 발견(적응증 종합감기 수렴·과분할 금지) | ✅ | | | |
| N02BE5x needs_review | ✅ | 자동/수동 3분류에 편입(수동) | | |
| 생약 감기 hold | ✅ | HERBAL 트랙(SOURCE GAP)으로 갱신 | | |
| ATC 함정 표 | | | | ✅ 신규(§5) |
| 자동/수동/RX 3분류 | | | | ✅ 신규(§6) |
| Selection/Counseling/Safety Block | | | | ✅ 신규(§7) |
| Canonical Template 적용 확인 | | | | ✅ 신규(§7.4) |

→ **삭제 없음**. 기존 5초안 전량 유지 + 표준 블록 신규 보강. 새 감기약 초안 추가 0(재구성만).

## 10. SOURCE GAP / EXCLUDE

- **HOLD/needs_review**: N02BE5x 390(조성·IPA 원문 확정 필요 = 수동).
- **EXCLUDE**: 단일 거담(R05CB 1,443)·단일 항히스타민(740)·단일 진해(65) = 단일제(별도) / R01BA·R05FA·N02BE RX 313 = 전문의약품 / 생약 감기 = HERBAL 트랙(원문 부재).
- **조성·함량 추정 금지**: 슈도에페드린·IPA·카페인 포함 여부는 원문 근거로만, 미표기는 수동.

## 11. 변경 없음 확인

- DB write 0 (SELECT 전용) · draft insert 0 · shared_product_descriptions 변경 0 · canonical 승격 0
- 코드 변경 없음 · MFDS API 호출 없음 · ProductMaster/ProductCandidate 변경 없음
- 성분 창작 0 · 기존 5초안 재작성 0(블록 보강만)
- 변경 파일: 본 CHECK 1건 (문서만)

## 12. 완료 기준 대비

| 기준 | 상태 |
|---|---|
| 기존 CHECK 교차검증 | ✅ DRAFT-V1 5초안 유지 |
| Primary Clinical Use 재분류 | ✅ 6 ATC → 종합감기 통합 |
| 증상 중심 bucket 확정 | ✅ (과분할 금지·적응증 수렴) |
| ATC 함정 조사 | ✅ §5 |
| Selection/Counseling/Safety Block | ✅ §7 |
| Canonical Template 적용 | ✅ §7.4 |
| 자동/수동/RX 경계 | ✅ §6 |
| 대표 설명서 정비 | ✅ 5초안 표준 승격 |
| 기존 비교표 | ✅ §9 |
| DB write 0 / 코드 0 / 성분 창작 0 | ✅ |

## 13. 결론 — OTC 설명서 1차 구축 완료

- COLD-COMBO 정비로 **양약 OTC 설명서 주요 축이 표준판으로 정리**되었다: 위장약·지사제·변비약·직장변비·치질·피부·안과·비염·구강인후·귀·여성·스테로이드 큐레이션·감기약.
- 남은 것은 **신규 트랙이 아니라**: (1) 한방 SOURCE ETL, (2) N02BE5x 등 needs_review 조성 확정, (3) Canonical 승격(초안→SPD), (4) 품질 개선.
- 즉 **OTC 설명서 1차 구축 프로젝트는 사실상 완료**, 이후 품질 개선·Source 보강·Canonical 승격 단계로 전환.

## 14. 후속 WO 후보

- `WO-...-COLD-THROAT-FEVER-APAP-COMBO-REVIEW-V1` — N02BE5x 조성·IPA 확정(수동)
- `WO-...-COLD-COMBO-DRAFT-DB-APPLY-DESIGN-V1` — 초안 canonical 승격 설계
- `WO-O4O-HIGH-RISK-TOPICAL-CURATION-STANDARD-V1` — 자동/수동/RX 3분류 공통 표준 승격(스테로이드 트랙과 통합)
