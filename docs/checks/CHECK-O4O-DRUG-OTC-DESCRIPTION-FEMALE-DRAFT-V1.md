# CHECK-O4O-DRUG-OTC-DESCRIPTION-FEMALE-DRAFT-V1

## 1. 작업 일시

2026-07-08

WO: `WO-O4O-DRUG-OTC-DESCRIPTION-FEMALE-DRAFT-V1`

이번 CHECK는 **운영 DB read-only 3축 조사(ATC + Primary Clinical Use + 제형·사용부위) 기반 여성질환 OTC 질환 중심 재구성 + 대표 초안 dry-run** 결과다. DB write·draft insert·shared_product_descriptions 변경·canonical 승격·admin apply 설계는 하지 않았다.

> **핵심: 질정을 추가로 만드는 것이 아니라 여성질환 축으로 재구성.** 기존 RECTAL/VAGINAL 트랙과 **중복 작성하지 않고**, **의약품 vs 의약외품**을 명확히 구분한다.

## 2. 사용한 기준 문서 · 기존 CHECK 교차 검증

```text
docs/guides/O4O-DRUG-STORE-DESCRIPTION-CANONICAL-STANDARD-V1.md (§3.1 Primary Clinical Use·§4·§5·§6·§11·§12-A)
docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md (§3.6 질정 선례·§3.10 질정 route·§3.11 SOURCE GAP)
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-RECTAL-VAGINAL-MANUAL-DRAFT-V1.md (기존 질정 트랙 — 중복 방지)
```

**기존 RECTAL/VAGINAL CHECK 교차 검증 결과(중복 여부):**

| 기존 작업(성분군) | 기존 상태 | 본 WO(질환 중심) 처리 |
|---|---|---|
| 클로트리마졸 질정 (칸디다) | **drafted** | **재작성 안 함** — 질환 표제(FEMALE-CANDIDA)로 재프레이밍 + Selection/Counseling 추가 |
| 포비돈요오드 질좌제 | draft_ready | 좌제와 별개인 **살균 질세정액**(액제)은 신규 대표(FEMALE-VAGINITIS) |
| 락트산 질정 | hold_for_source(원문 0) | HOLD 유지 |
| 니스타틴/other 질정 | hold_for_pharmacist | HOLD 유지 |
| G02CX 경구 한방(온경탕 222) | exclude | EXCLUDE 유지(경구·월경) |

→ **중복 없음**. 기존 성분군 결과를 질환 축으로 재정렬하고, 미작성분(포비돈 질세정액)만 신규 대표.

## 3. DB read-only 3축 조사

- 접속: `cloud-sql-proxy netureyoutube:...`(127.0.0.1:5434) + `psql` user `o4o_api`. **SELECT 전용**.

**조사 SQL 요지:**
```sql
-- 축1 ATC: G01(부인과 항감염) OTC
SELECT substr(atc_code,1,5), count, grounded ... WHERE atc_code LIKE 'G01%' AND drug_category='otc';
-- 축2 Primary Use: 원문 효능 신호
count FILTER (content ~ '칸디다성 질염') / '세균성 질염' / '외음부' / '질 건조';
-- 축3 제형·의약품구분: regulatory_type + 질세정/윤활 name
SELECT regulatory_type, count(*) ...;   -- DRUG 177413 / QUASI_DRUG 17148 / MEDICAL_DEVICE 3826
```

## 4. 후보 규모 (G01 부인과 항감염 OTC)

| atc5 | 의미 | masters | grounded |
|---|---|---:|---:|
| G01AF | 이미다졸 항진균(클로트리마졸) | 70 | 29 |
| G01AX | 기타 항감염(포비돈요오드 질세정 등) | 34 | 27 |
| G01AD | 유기산(락트산 질 산도) | 13 | 0 |
| G01AA | 항생제(니스타틴 등) | 10 | 3 |

**효능 신호(grounded):** 칸디다성 질염 44 · 세균성/트리코모나스 18(전부 포비돈 광범위와 공존) · 질염 일반 2 · 외음부 227(대부분 질정/외용 언급) · 질 건조 3.

**의약품 vs 의약외품(WO §5 핵심):** `regulatory_type` = **DRUG 177,413 / QUASI_DRUG 17,148 / MEDICAL_DEVICE 3,826**. **여성청결제류 의약외품(QUASI_DRUG) = 769건** → **EXCLUDE**.

## 5. 질환 중심 Bucket 재구성 (WO §4)

| bucket | 질환 | 근거 | 처리 |
|---|---|---|---|
| FEMALE-CANDIDA | 칸디다성 질염 | 클로트리마졸 질정(G01AF 70/g29) | **대표 1**(기존 재프레이밍) |
| FEMALE-VAGINITIS | 질염 일반·혼합(살균 세척) | 포비돈요오드 질세정액(G01AX11, grounded) | **대표 2** · 약사 검토 강화 |
| FEMALE-BACTERIAL | 세균성 질염 | 단독 OTC 0 (포비돈 광범위가 커버·순수 세균성=메트로니다졸 RX) | 포비돈에 흡수 / 단독 EXCLUDE(RX) |
| FEMALE-ITCH | 외음부 가려움 | 칸디다 외음부=CANDIDA 흡수 / 비감염 소양=피부 트랙 | 피부 트랙 참조 |
| FEMALE-DRYNESS | 질 건조 | dryness grounded 3 미미·대부분 윤활/보습 의약외품·의료기기 | **EXCLUDE** |
| FEMALE-CLEANSING | 질 세정 | **의약품 살균 질세정(포비돈)** = VAGINITIS 흡수 / **의약외품 여성청결제 769** | 의약외품 **EXCLUDE** |
| FEMALE-HOLD | 원문·민감 | 락트산 질정 13(g0)·니스타틴/항생 질정·호르몬 질정(RX) | **HOLD/EXCLUDE** |

## 6. 필수 표

| group_key | bucket | route | dosage_form | efficacy_signature | master_count | grounding | action | reason |
|---|---|---|---|---|---:|---:|---|---|
| `drug_otc::female::candida::clotrimazole::vaginal_tablet` | FEMALE-CANDIDA | 질 내 삽입 | 질정 | 칸디다성 질염 | 70 | 29 | DRAFT(기존 재프레이밍) | 클로트리마졸·질 전용 |
| `drug_otc::female::vaginitis::povidone::vaginal_wash` | FEMALE-VAGINITIS | 질 세척 | 세정액 | 칸디다·트리코모나스·혼합 질염 살균세척 | ~11 | grounded | DRAFT(약사 검토 강화) | 포비돈 광범위·요오드 주의 |
| `drug_otc::female::bacterial::*` | (없음) | 질 | — | 세균성 질염 단독 | 0 | 0 | EXCLUDE | 순수 세균성=메트로니다졸 RX |
| `drug_otc::female::vaginitis::lactic::vaginal_tablet` | FEMALE-HOLD | 질 | 질정 | 질 산도 회복 | 13 | 0 | HOLD_SOURCE | 원문 부재 |
| `drug_otc::female::cleansing::quasi_drug` | EXCLUDE | 외음부 | 세정제 | 여성청결 | 769 | — | EXCLUDE | 의약외품(QUASI_DRUG) |

## 7. ATC 함정 사례 (WO §8) — Primary Clinical Use 검증

| # | 함정 유형 | 사례 | 판정 |
|:-:|---|---|---|
| ① | **질정인데 name '질캡슐' 오탐** | `연질캡슐`(경구)의 `질캡슐` 부분일치 4,900+ 오탐 → **ATC G01로 확정** | 경구 캡슐 배제 |
| ② | **피부약이 외음부 적응증 포함** | 엠피록스액(시클로피록스 D01AE14) = **지루성 피부염**(외음부 아님) | 피부 트랙(§3.1) |
| ③ | **소독제가 여성질환으로 판매** | 포비돈요오드(G01AX11) = 소독제이나 **질염 치료·살균 질세정 목적** | **Primary Use=여성질환 → FEMALE 배정**(알보칠 D08과 동형) |
| ④ | **경구 한방이 부인과 name** | G02CX 온경탕·온청음(월경 경구 한방) 222 | EXCLUDE(경구·vaginal 아님) |

→ **③이 §3.1의 정면 사례**: ATC(소독제 G01AX)가 아니라 Primary Clinical Use(질염 살균 치료)로 FEMALE 트랙 배정.

## 8. 대표 초안 2건 (dry-run, DB write 0)

> 설계표준 §12-A Template + Selection·Counseling. e약은요 원문 근거.

### 초안 1 — 칸디다성 질염 질정 (FEMALE-CANDIDA, 클로트리마졸) · 기존 재프레이밍

**어떤 경우에 사용하나** 칸디다(곰팡이)에 의한 질염(외음부 가려움·비지 같은 분비물)에 질 내에 삽입해 사용하는 항진균 질정입니다.
**사용 방법** 제품의 허가 함량·용법에 따라 취침 시 질 내 깊숙이 삽입합니다(100mg 1일 1정 6일 / 200mg 1일 1정 3일 / 500mg 1정 1회 등 제품별). **이 약은 질에만 사용하고 삼키지 않습니다(경구 복용 금지).** 삽입 전 손을 씻고, **생리 기간에는 사용하지 않습니다.** 사용 중 탐폰·질세척·질 삽입제품·질내 성교를 피합니다. 콘돔·페서리(라텍스)를 약화시킬 수 있습니다. 만 12세 이상만 사용합니다.
**주의사항** 이 약 과민증·갈락토오스 불내성은 사용하지 않습니다. 임부·임신 가능성·수유부는 사용 전 약사·의사와 상담하세요.
**병원에 가야 하는 경우** **처음 생겼거나 자주 재발하는 경우, 38℃ 이상 고열·하복부(골반) 통증·악취 나는 분비물·질 출혈이 있으면** 단순 칸디다로 보지 말고 사용을 중단하고 진료를 받으세요.
**Selection Point** 냄새가 심하거나 회색·거품성 분비물이면 세균성/트리코모나스일 수 있어 칸디다약이 맞지 않으니 약사·의료진에 확인하세요.
**Counseling Point**
```
■ 질에만 사용, 삼키지 않습니다
■ 생리 중에는 사용하지 않습니다
■ 콘돔·페서리를 약화시킬 수 있습니다
■ 재발·고열·골반통·출혈은 진료
```
**성분 기준 선택** *(공통 GMP 문구)*

### 초안 2 — 살균 질세정액 (FEMALE-VAGINITIS, 포비돈요오드) · 약사 검토 강화

> 소독제(포비돈요오드)이나 질염 치료·살균 질세정 목적 = Primary Use로 FEMALE 배정(§3.1).

**어떤 경우에 사용하나** 칸디다성·트리코모나스성·비특이성 및 혼합감염에 의한 질염의 살균 질세정, 국소 세척·방취에 사용하는 포비돈요오드 질세정액입니다.
**사용 방법** 제품의 허가 용법에 따라 희석해 질을 세정합니다. **질 국소 세정용이며 삼키지 않습니다.**
**주의사항** **요오드 과민증, 갑상선 질환자, 임부·수유부는 요오드 흡수 우려가 있어 사용 전 약사·의사와 상담하세요.** 넓게·장기간 반복 사용하지 않습니다. 정상 질 세균총에 영향을 줄 수 있습니다.
**병원에 가야 하는 경우** **반복되는 질염, 악취 나는 분비물, 질 출혈, 38℃ 이상 발열, 하복부(골반) 통증, 성병이 의심되는 경우에는** 자가 세정만 하지 말고 진료를 받으세요.
**Selection Point** 원인균에 따라 치료가 다르므로(칸디다=항진균 질정), 반복·불명확한 질염은 진단이 필요하니 약사·의료진에 확인하세요.
**Counseling Point**
```
■ 요오드 과민·갑상선 질환·임부는 상담 필요
■ 넓게·오래 반복 사용하지 않습니다
■ 질 국소 세정용, 삼키지 않습니다
■ 반복 질염·악취·출혈·골반통·성병 의심은 진료
```
**성분 기준 선택** *(공통 GMP 문구)*

## 9. 여성질환 Safety Block (WO §7)

여성질환 OTC는 **감별·진료 전환 기준**이 핵심(자가치료 한계 명확). 전 대표에 반영:

```
■ 임신 중·수유 중          → 사용 전 상담
■ 반복되는 질염           → 진단 필요(자가치료 반복 금지)
■ 악취 나는 분비물         → 세균성/트리코모나스 감별 필요 → 진료
■ 질 출혈                 → 진료
■ 38℃ 이상 발열·오한       → 진료(상행 감염 우려)
■ 하복부(골반) 통증        → 진료(골반염 우려)
■ 성병 의심(파트너 증상 등) → 진료
```

## 10. SOURCE GAP / HOLD / EXCLUDE

- **HOLD_SOURCE**: 락트산 질정(G01AD 13, 원문 0)·니스타틴/항생 질정(민감·원문 부족).
- **EXCLUDE**: 
  - **의약외품 여성청결제 769건**(QUASI_DRUG) — 의약품 아님.
  - **질윤활제·질보습제** — 대부분 의약외품/의료기기.
  - **세균성 질염 단독 치료제**(메트로니다졸) = 전문의약품.
  - **호르몬 질정(에스트로겐 등)** = 전문의약품.
  - **G02CX 경구 한방 부인과**(온경탕 222) = 경구·월경(vaginal 아님).
  - 피부 지루성 피부염 외용(엠피록스 등) = 피부 트랙.
- **조성·호르몬·항생·항진균 추정 금지(WO §9)**: 원문 효능만 사용, 조성 단정 없음.

## 11. 변경 없음 확인

- DB write 0 (SELECT 전용) · draft insert 0 · shared_product_descriptions 변경 0 · canonical 승격 0
- 코드 변경 없음 · MFDS API 호출 없음 · ProductMaster/ProductCandidate 변경 없음
- 성분 창작 0 (대표 초안 e약은요 원문 grounding)
- **기존 RECTAL/VAGINAL 초안 중복 작성 0**(재프레이밍만)
- 변경 파일: 본 CHECK 1건 (문서만)

## 12. 완료 기준 대비

| 기준 | 상태 |
|---|---|
| 운영 DB read-only 조사 | ✅ 3축 |
| 기존 질정 CHECK 교차 검증 | ✅ 중복 없음(§2) |
| 여성질환 Bucket(질환 중심) | ✅ CANDIDA/VAGINITIS + HOLD/EXCLUDE |
| Primary Clinical Use 검증 | ✅ 포비돈 소독제→FEMALE(§7-③) |
| 대표 설명서 | ✅ 2건 |
| Selection/Counseling Point | ✅ |
| Safety Block | ✅ |
| ATC 함정 사례 기록 | ✅ §7 4사례 |
| 의약품/의약외품 구분 | ✅ QUASI_DRUG 769 EXCLUDE |
| SOURCE GAP / EXCLUDE | ✅ |
| 중복 작성 없음 | ✅ |
| DB write 0 | ✅ |

## 13. 후속 WO 후보

- `WO-O4O-DRUG-OTC-DESCRIPTION-STEROID-TOPICAL-CURATION-V1` — 스테로이드 외용(수동 큐레이션)
- `WO-O4O-DRUG-OTC-DESCRIPTION-COLD-COMBO-CONSOLIDATION-V1` — 감기약 복합제 정비(기존 COLD-COMBO 트랙 정합)
- (참고) 세균성 질염·호르몬 질정은 RX — OTC 설명서 대상 아님
