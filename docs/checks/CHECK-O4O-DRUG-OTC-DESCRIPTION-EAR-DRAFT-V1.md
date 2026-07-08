# CHECK-O4O-DRUG-OTC-DESCRIPTION-EAR-DRAFT-V1

## 1. 작업 일시

2026-07-08

WO: `WO-O4O-DRUG-OTC-DESCRIPTION-EAR-DRAFT-V1`

이번 CHECK는 **운영 DB read-only 3축 조사(ATC + Primary Clinical Use + 제형·사용부위) 기반 귀(이과) OTC bucket 분류 + 대표 초안 dry-run** 결과다. DB write·draft insert·shared_product_descriptions 변경·canonical 승격·admin apply 설계는 하지 않았다.

> **핵심 결론: OTC로 귀에 직접 넣거나 바르는 국소 치료제(외이염 점이제·귀지 제거·귀 소독)는 O4O DB에 사실상 없다.** 유일한 OTC 귀 카테고리는 **이명(귀울림) 경구제**뿐이며, 국소 귀약은 전량 전문의약품(RX)·의약외품이다. **Primary Clinical Use 원칙(설계표준 §3.1)이 가장 극적으로 드러난 트랙.**

## 2. 사용한 기준 문서

```text
docs/guides/O4O-DRUG-STORE-DESCRIPTION-CANONICAL-STANDARD-V1.md (§3.1 Primary Clinical Use 우선·§4.1 분리·§5·§6·§11·§12-A Template)
docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md (§3.11 SOURCE GAP)
```

## 3. DB read-only 조사 (3축)

- 접속: `cloud-sql-proxy netureyoutube:asia-northeast3:o4o-platform-db`(127.0.0.1:5434, ADC) + `psql` user `o4o_api`. **SELECT 전용**.
- **축① ATC**: `S02%`(귀). **축② Primary Clinical Use**: e약은요 원문 효능에 외이도/외이염/귀지/귓속/점이. **축③ 제형·사용부위**: 점이제·귀 세정·외용 vs 경구.

**조사 SQL 요지:**
```sql
-- 축1: S02 OTC atc5
SELECT substr(e.atc_code,1,5), count(*), count(grounded) ... WHERE atc_code LIKE 'S02%' AND drug_category='otc';
-- 축2: OTC 원문 효능 PRIMARY(앞 60자)에 외이/귀지/점이
WHERE eff ~ '외이|귀지|귀 안|귓속|점이';   -- 결과 0
-- 축3: S02 전문 vs 일반 대조
SELECT drug_category, count(*) ... WHERE atc_code LIKE 'S02%';  -- rx 45 / otc 14
```

## 4. 핵심 발견 — 3축 교차 결과

| 조사 축 | 결과 |
|---|---|
| **S02(귀 ATC) OTC** | **14건** — 전부 `S02D` **이명(귀울림) 경구정**(노이제로·실비도·이어링·노이텍·테보민, grounded 11) |
| **S02 전문/일반 대조** | **RX 45 / OTC 14** — 국소 귀약(점이제 등)은 전량 **전문의약품** |
| **OTC 원문 효능 PRIMARY=귀 국소** | **0건** — 외이염·귀지·점이를 주 효능으로 하는 OTC 없음 |
| **귀지 제거·귀 세정** | 일반의약품 아님 → **의약외품/화장품** 영역(범위 밖) |
| **붕산/과산화수소 귀 소독 OTC 점이** | **0건** |

**즉: OTC 국소 귀약(외이염 점이제·귀지제거액·귀 소독제·귀 가려움제)은 존재하지 않는다.** OTC로 가능한 것은 **이명 경구제 1개 카테고리뿐**.

## 5. ATC 함정 사례 기록 (WO §8 — 이번 WO 핵심 목적)

Primary Clinical Use 원칙(§3.1)이 왜 필요한지 EAR 트랙이 4가지 함정으로 입증한다.

| # | 함정 유형 | 실제 사례 | 판정 |
|:-:|---|---|---|
| ① | **S02(귀 ATC)인데 국소 귀약 아님** | S02D OTC 14 = **이명 경구정**(먹는 약, 항히스타민계 복합) | 이명 경구 트랙(국소 귀약 아님) |
| ② | **Primary use=귀 국소인데 OTC 없음** | 외이염 점이제·귀 소독 = **전량 RX 45건** | EXCLUDE(전문의약품) |
| ③ | **"귀" 문자열 대량 오탐** | name `귀` 매칭 = **당귀(當歸)·귀비탕** 한방 다수(당귀연교음·가미귀비탕 등) | 오탐 — 귀 제품 아님 |
| ④ | **피부약이 외이도염을 부수 적응증으로 포함** | D07 스테로이드 크림·D11 등이 원문에 "외이도염" 부수 기재(679건 오탐) | 피부 주력 → 피부 트랙(§3.1로 배제) |

→ **ATC(S02)로 잡으면 이명 경구정만, 넓은 "귀" 신호로 잡으면 당귀 한방·피부 스테로이드가 폭증.** 3축(ATC+Primary Use+제형)으로만 정확한 판정 가능. **"ATC만으로는 설명서를 만들 수 없다"의 가장 강한 사례.**

## 6. Bucket 분류 (WO §4 대비 — 조사 결과 반영)

| WO 예상 bucket | 조사 결과 | 처리 |
|---|---|---|
| EAR-WAX (귀지 제거) | OTC 0 (의약외품/화장품 영역) | **EXCLUDE** |
| EAR-INFLAMMATION (외이염·통증) | OTC 0 (전량 RX 점이제) | **EXCLUDE(전문의약품)** |
| EAR-ANTISEPTIC (귀 소독·세척) | OTC 0 (RX/의약외품) | **EXCLUDE** |
| EAR-ITCH (귀 가려움) | OTC 0 (피부 스테로이드 부수적응=피부 트랙) | **EXCLUDE/피부 트랙** |
| (신규) **EAR-TINNITUS** (이명 경구) | S02D 14 (grounded 11) | **대표 초안 1** · 약사 검토 강화 |
| EAR-HOLD (전문·고위험) | RX 45 | **EXCLUDE(전문의약품)** |

## 7. 필수 표

| group_key | bucket | route | dosage_form | efficacy_signature | master_count | grounding | action | reason |
|---|---|---|---|---|---:|---:|---|---|
| `drug_otc::ear::tinnitus::oral` | EAR-TINNITUS | 경구 | 정 | 이명(귀울림) | 14 | 11 | DRAFT(약사 검토 강화) | 유일 OTC 귀 카테고리·원문 확보 |
| `drug_otc::ear::topical::*` | (없음) | 점이/외용 | 점이제 | 외이염·귀지·귀소독 | 0 | 0 | EXCLUDE | OTC 국소 귀약 부재(전량 RX) |
| `drug_otc::ear::rx` | EXCLUDE | 점이/외용 | 점이제 | 외이염 등 | 45 | — | EXCLUDE | 전문의약품 |

## 8. SOURCE GAP / Primary Clinical Use 판정

- **Primary Clinical Use 검증(§3.1)**: 3축 조사로 S02(이명 경구)·당귀 오탐·피부 스테로이드 부수적응을 정확히 분리. **국소 귀약 Primary=OTC 0**을 확정.
- **SOURCE GAP**: 이명 경구제는 원문 grounding 확보(대표 가능). 국소 귀약은 OTC 부재라 **작성 대상 자체가 없음**(HOLD 아님 = EXCLUDE).
- **조성·항생·스테로이드 추정 금지(WO §9)**: 이명약 성분(항히스타민계 복합)은 원문 주의만 반영, 조성 단정 없음.
- **성분 창작 0**: 대표 초안 §4 원문 실조회 근거.

## 9. 대표 초안 1건 (dry-run, DB write 0)

> 설계표준 §12-A Template + Selection·Counseling 적용. e약은요 원문(노이제로정 등) 근거.

### 초안 1 — 이명(귀울림) 완화 경구제 (EAR-TINNITUS, S02D) · 약사 검토 강화

**어떤 경우에 사용하나** 이명(귀에서 소리가 나는 귀울림) 증상 완화에 먹는 약으로 사용하는 일반의약품입니다.
**사용 방법** 성인 및 만 15세 이상은 1회 2~3정을 1일 3회 식사 후 물과 함께 복용합니다. **장기간 계속 복용하지 않습니다.**
**주의사항** **15세 미만은 복용하지 않습니다.** 항히스타민 성분이 포함되어 **감기약·멀미약·진해거담제·비염약·다른 항히스타민제와 함께 복용하지 않습니다**(성분 중복). 전립선비대 등 배뇨장애, 녹내장, 심장질환, 천식 경험자, 임부는 복용 전 약사와 상담하세요. **복용 후 졸음이 올 수 있어 운전·기계 조작에 주의합니다.**
**병원에 가야 하는 경우** **갑작스러운 난청, 어지럼증, 한쪽 귀에만 나는 이명, 심장 박동에 맞춰 들리는 박동성 이명, 귀 통증·분비물·발열이 동반되면 단순 귀울림으로 보지 말고 즉시 진료(이비인후과)를 받으세요.** 이명은 원인이 다양하므로 오래 지속되면 원인 확인이 필요합니다.
**Selection Point** 외이염·귀지·귀 통증·귀 가려움 같은 **귀 국소 증상은 이 먹는 약의 대상이 아니며**, 국소 귀약은 대부분 처방이 필요하니 약사·의료진에 확인하세요.
**Counseling Point**
```
■ 졸음이 올 수 있어 운전 전 주의합니다
■ 감기약·멀미약·항히스타민제와 함께 먹지 않습니다(중복)
■ 장기간 계속 복용하지 않습니다
■ 갑작스러운 난청·어지럼·한쪽 귀 이명은 즉시 진료
```
**성분 기준 선택** *(공통 GMP 문구)*

## 10. 귀 질환 Safety Block (WO §7)

이명 경구제 외 **국소 귀약이 OTC에 없으므로**, 귀 증상 소비자에게는 **자가치료보다 진료 전환 기준**이 핵심이다(대표 초안·상담에 반영):

```
■ 고막 천공 의심(귀 먹먹함·소리 후 통증)   → 진료
■ 귀 분비물(고름·피)                     → 진료
■ 심한 귀 통증                          → 진료
■ 난청(갑자기 안 들림)                   → 즉시 진료(돌발성 난청 응급)
■ 어지럼증 동반                         → 진료
■ 발열 동반                            → 진료
```

- 외이염·귀지 막힘·귀 통증 등은 **OTC 국소약으로 자가치료할 수 없으며 진료 대상**임을 명확히 안내.

## 11. HOLD_SOURCE / EXCLUDE

**EXCLUDE(범위 밖):**
- **국소 귀약 전량 RX 45건**(외이염 점이제·항생/스테로이드 점이 = 전문의약품).
- **귀지 제거액·귀 세정제** = 의약외품/화장품(일반의약품 아님).
- **당귀·귀비탕 한방**("귀" 문자열 오탐, 실제 귀 제품 아님).
- **피부 스테로이드/외용제**(외이도염 부수 적응증 — 피부 트랙, §3.1로 배제).
- 처방 귀약·수술용·전문의 전용.

**HOLD_SOURCE:** 없음(이명 경구는 grounded, 국소 귀약은 OTC 부재라 HOLD가 아니라 EXCLUDE).

## 12. 변경 없음 확인

- DB write 0 (SELECT 전용) · draft insert 0 · shared_product_descriptions 변경 0 · canonical 승격 0
- 코드 변경 없음 · MFDS API 호출 없음 · ProductMaster/ProductCandidate 변경 없음
- 성분 창작 0 (대표 초안 e약은요 원문 grounding)
- 변경 파일: 본 CHECK 1건 (문서만)

## 13. 완료 기준 대비

| 기준 | 상태 |
|---|---|
| 운영 DB read-only 조사 | ✅ 3축(ATC+Primary Use+제형) |
| EAR bucket 분류 | ✅ EAR-TINNITUS(유일) + WAX/INFLAMMATION/ANTISEPTIC/ITCH = EXCLUDE |
| Primary Clinical Use 검증 | ✅ 국소 귀약 OTC 0·함정 4사례 |
| 대표 설명서 초안 | ✅ 1건(이명 경구) |
| Selection Point / Counseling Point | ✅ |
| 귀 질환 Safety Block | ✅ |
| ATC 함정 사례 기록 | ✅ §5 (S02=이명경구·당귀오탐·피부 부수적응) |
| SOURCE GAP 처리 | ✅ 국소 귀약=EXCLUDE(부재) |
| DB write 0 | ✅ |
| CHECK 문서 작성 | ✅ 본 문서 |

## 14. 결론 — 표준 사례로 남길 것

- **EAR는 "ATC만으로는 설명서를 만들 수 없다"의 가장 강한 실증 사례**다. S02로 잡으면 이명 경구정만, "귀" 신호로 잡으면 당귀 한방·피부 스테로이드 오탐이 폭증한다.
- **OTC 귀 국소약은 사실상 없다**(전량 RX/의약외품) — 이 사실 자체가 약국 상담 시 "귀 증상은 대부분 진료 대상"이라는 안내 근거가 된다.
- 설계표준 §3.1 Primary Clinical Use 원칙의 **레퍼런스 케이스**로 인용 가능.

## 15. 후속 WO 후보

- `WO-O4O-DRUG-OTC-DESCRIPTION-FEMALE-DRAFT-V1` — 여성질환(질정·질세정) — 기존 비경구 트랙 중복 방지·3축 적용
- (참고) 국소 귀약은 RX라 OTC 설명서 대상 아님 — 필요 시 별도 RX 설명 트랙
