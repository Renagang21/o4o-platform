# CHECK-O4O-OTC-FULL-CORPUS-FINGERPRINT-SHARD-1-AGENT-NA-V1 — 원문 지문 조사 (에이전트 나 · shard 1)

WO: `WO-O4O-OTC-FULL-CORPUS-SOURCE-FINGERPRINT-AUDIT-3-AGENT-V1` · 일자: 2026-07-18 · 상태: **완료 (조사)**
근거: 실행 지침서 · 병렬 3-shard (가=0 완료 / **나=1 본 조사** / 다=2 별도)
계승: shard 0 산출물(`drug-otc-full-corpus-fingerprint-shard-0.ts` 8ba528924·17dbc98e3, bridge `c4b2f6665`) — 로직 동일 계승, shard 0/2 파일 미수정.

> **read-only.** DB write **0** · draft/canonical/번역/연결 변경 **0**. shard 1 만 분석. 통합은 별도 WO.

---

## 0. 결론

> **shard 1 = 6,452 master / 1,590 item_seq 전수 지문화(추출 실패 0). content-지문 그룹 2,232 · Tier1 4,270(66%)/Tier5 2,014(31%). 경구 단일제 4,438 은 안전지문 통합 시 1,224 그룹. e약은요 ko canonical 전건 보유·authored 구조적 disjoint(0). authored bridge 검토후확장후보 165그룹/998 master. 무성분명 3,141 master 는 atc_code 100% 보유 → ATC 후보+안전지문 일치 2,883. ⚠️동일 성분·함량·제형이 제품별 e약은요 문구차로 다수 그룹 분열(79키, 약당 1건은 통합단계 사람 판단).**

**shard 0 로직 재현 검증(validate 모드, 파일 미기록)**: 본 스크립트로 `SHARD=0` 재실행 → shard 0 산출물과 **정확히 일치**(6,407 master · 2,285 그룹 · Tier1 4,158/1,287 · Tier5 2,157/986 · authored bridge 183·953 / 381·896 / 736·2,405 / 985·2,153 · 무성분명 1,182그룹·3,299 master). 즉 본 shard 1 결과는 shard 0 과 **동일 methodology**.

---

## 1. 모집단 · shard (침범 0)

| 항목 | 값 |
|---|---|
| 원문 확보 OTC 모집단 | `regulatory_type=DRUG` · `drug_category=otc`(pde) · **e약은요 STORE canonical 보유** = **19,131** |
| shard 규칙 | `(('x'||substr(md5(item_seq),1,8))::bit(32)::bigint % 3)` (item_seq=MFDS_CODE, 전건 보유) |
| shard 분포(실측) | 0: 6,407 / **1: 6,452** / 2: 6,272 (총 19,131, 균등) |
| **내 shard 1** | **6,452 master / 1,590 item_seq** |
| 침범 검증 | §8 참조 — 교집합 0 증명 |

> 예상 6,452 = 실측 6,452 **정확 일치**. 원문 = e약은요 SPD content(pde `efficacy_text/caution_text` 미populate — shard 0 검증 계승).

---

## 2. 원문 추출

| 항목 | 값 |
|---|---:|
| 추출 성공(섹션 파싱) | **6,452** |
| 추출 실패 | **0** |
| distinct item_seq | 1,590 |

지문: raw_{indication,dosage,caution,full}_hash · normalized_* · 안전(ingredient_strength·dose_form·route·dosage_numeric·age·duration·contraindication·pregnancy·interaction·allergy_additive)_signature.
정규화 = HTML·공백·목록기호·문장부호변형·NFKC(전각) 만 제거. **숫자·함량·횟수·간격·연령·기간·금기·첨가제·경로·제형·성분 보존.**

---

## 3. Tier 집계 · 그룹 규모

| Tier | master | 그룹 | 판정 |
|---|---:|---:|---|
| **Tier1** (raw_full 동일) | **4,270** | 1,271 | 원문 완전 동일 — 자동 그룹화 |
| Tier2 (normalized 동일) | 35 | 5 | 정규화 후 동일 |
| Tier3 (섹션 지문 동일) | 133 | 10 | 대표 1건 검토 후 공유 |
| Tier4 (안전 다름) | 0¹ | 0 | — |
| **Tier5** (비경구·특수제형·복합제) | **2,014** | 946 | 별도 수동 트랙 |
| 합 | **6,452** | **2,232** | |

¹ **Tier4=0**: 그룹 키가 섹션 지문을 포함하므로 안전이 다르면 애초에 다른 지문 그룹으로 분리(§7 분열로 나타남). shard 0 과 동일 구조.

**그룹 규모 분포**: singleton **795** · 2–5: 1,238 · 6–20: 183 · 21–50: 15 · 51+: 1(에르도스테인300캡슐 96).
**경로 분포**: oral **4,438** · topical 1,296 · ophthalmic 365 · unknown(특수제형) 309 · nasal 21 · vaginal 16 · rectal 7. **경구 4,438 / 비경구 2,014.**

---

## 4. 커버리지

| | content-지문 (2,232 그룹) | 안전통합 (경구 단일제, 1,224 그룹) |
|---|---:|---:|
| 50% master | 456 그룹 | 242 그룹 |
| 70% | 869 | 496 |
| 80% | 1,190 | 660 |
| 90% | 1,587 | 882 |

> **안전통합**(성분·함량·제형·경로+안전지문 동일 → 문구변이 무시)해도 경구 4,438 master 가 1,224 그룹 — content-지문(경구부)과 큰 차이 없음. 분열의 상당 부분은 서식이 아니라 제품별 안전 텍스트 실차이. 약당 1건 대표화는 통합단계 사람 판단.

---

## 5. canonical 재검증 (master_id 직접 조인)

> `기존 canonical 0` 신호를 master_id 직접 조인 + 전 source_type·language·status 로 재검증. **조인 버그 아님 — 구조적 disjoint.**

| 연결(master_id 직접) | ko | en | 미보유 |
|---|---:|---:|---:|
| **e약은요**(mfds_easy_drug) canonical | **6,452** | 0 | 0 |
| **authored**(mfds_drug_otc·nutrition_combo) canonical | **0** | **0** | — |
| needs_review(ko·en) | 0 | 0 | — |

**source_type·language·status 별 실측(shard 1 모집단 join)**: `mfds_easy_drug / ko / canonical = 6,452` **단일**. authored·en·needs_review·기타 source_type **전무**.

**원인 = 구조적 disjoint**(조인·조건 문제 아님):
- 내 모집단 = e약은요-grounded OTC. master_id 직접 조인상 **전건 e약은요 ko canonical(표시본) 보유**.
- authored OTC canonical(mfds_drug_otc ko 1,213 + nutrition_combo 1,915 = 3,128 master, 전 shard global)은 **A_no_spd_only**(e약은요 미보유) 대상 승격분 → 내 e약은요-grounded 모집단과 완전 disjoint. shard 1 값 0 은 정상.

> **⚠️ 함의**: OTC master 3집단(①e약은요-grounded 19,131 ②authored-ungrounded 3,128 ③무canonical). 내 audit 은 ①만 지문화. "canonical 재사용"은 ①의 e약은요 표시본 + ②의 authored 표시본을 통합단계에서 fingerprint/그룹으로 연결해 산정 — **shard 단독·현 시점 확정 불가.**

---

## 5-B. grounded ↔ authored bridge (ADDENDUM-...-BRIDGE-V1 재현)

> 목적 = **authored 설명서 1건을 grounded 제품 몇 개로 확장 가능한지**. bridge 키 = `성분|함량|제형|경로` 일치(무성분명 authored 제외 — 이질약 과병합 방지). **확장은 안전지문 대조 후(검토후)만.** authored 모집단은 global(전 shard). 산출물 `otc-fingerprint-shard-1-bridge-v1.json`.

| bridge 판정 | 그룹 | grounded master |
|---|---:|---:|
| **검토후 확장후보**(authored 존재, 성분·함량·제형·경로 일치) | **165** | **998** |
| 새 설명서 필요(경구·성분명·authored 없음) | 397 | 1,009 |
| **주성분코드 필요**(무성분명 — name에 `(성분)` 없어 bridge 불가) | 724 | 2,431 |
| 비경구(별도 트랙) | 946 | 2,014 |
| 합 | **2,232** | **6,452** |

> 예: 에르도스테인300캡슐 grounded **96**(단일 대표 그룹, §6) ↔ authored 존재 / 트리메부틴100정 grounded 21 ↔ authored 존재 / 아스피린100정 grounded 26 ↔ authored 존재. **동일 약의 grounded 지문 분열(§7)이 authored 1건으로 수렴 가능**(검토후).
> **⚠️ shard 부분값**: 전체 authored 재사용·최종 작성단위 수는 **3 shard 병합 + 안전지문 대조 후** 확정. 무성분명(grounded 2,431 master)은 §5-C ATC 축으로 통합단계 보강.

---

## 5-C. 무성분명 ATC bridge (신설 — 통합 step4 de-risk)

> §5-B "주성분코드 필요" 무성분명을 **atc_code 축**으로 후보 연결. shard 0 실측 계승: `active_ingredients`/`ingredient_summary` 전건 empty, **`atc_code` = shard 1 100% 보유(무성분명 3,373·명명 3,079 전건)**. 고정 원칙: **ATC = 후보 연결 키 / 안전지문 = 최종 분리 키**.
>
> 후보 연결 키 = `atc_code|함량|제형|경로`. 후보 풀 = shard 1 grounded 전체(명명+무성분명, 경로 포함) → 무성분명이 명명약 그룹에 합류 가능한지 측정. 안전지문 번들 = 용법수치·연령·기간·금기·임신·첨가제·**상호작용·단일복합**(WO 분리 기준 전량).

무성분명 master **3,141** (name에 `(성분)` 없음) 5구획:

| 구획 | master |
|---|---:|
| **ATC 후보 있음** (= 아래 둘의 합) | **3,014** |
|  └ ATC 후보 + **안전지문 일치** | **2,883** |
|  └ ATC 후보 있으나 **안전지문 불일치** | 131 |
| ATC 후보 없음 (singleton — 동일 atc·함량·제형·경로 peer 없음) | 127 |
| ATC 코드 없음 (atc_code null) | **0** |
| 합 | **3,141** |

> **해석**: 무성분명 3,141 중 **2,883(91.8%)** 이 동일 atc·함량·제형·경로 + 동일 안전지문 peer 를 shard 내에 보유 → **통합단계 "새 설명서 필요" 과대평가 방지 실측**(무성분명이 명명 그룹/서로에게 합류 가능). 안전 불일치 131 은 같은 ATC라도 용법·금기 등 실차이라 **분리 유지**(오병합 방지 작동).
> **⚠️ shard-local**: twin 이 item_seq 해시로 타 shard 산재 가능 → 전량 후보 수·명명약 매칭은 통합단계(3 shard 병합) 확정. broad ATC(R05X 등)는 함량·제형·경로 + 안전지문이 분리 담보.

무성분명 그룹·master: **1,097 그룹 / 3,141 master** (content-지문 기준).

---

## 6. 상위 30 그룹

`otc-fingerprint-shard-1-groups-v1.json` 참조. 상위: 에르도스테인300캡슐(96,Tier1) · 케펜텍플라스타류(49,Tier5,첩부) · 아세틸시스테인200캡슐(48,Tier3) · (무성분명)150캡슐(29) · 바실루스250캡슐(29) · 암브록솔30정(28) · 에르도스테인300캡슐(27,별그룹) · 아스피린100정(26) · 아세틸시스테인200캡슐(26,별그룹) · 디오스민300캡슐(23) …

> withCanonical 전 그룹 0 = authored disjoint(§5) 재확인.

---

## 7. 표본 감사 결과 (통합단계 반영 후보)

| 관찰 | 내용 |
|---|---|
| **동일 성분·함량·제형인데 지문 분열** | **79키**(경구·명명·성분추출가능). 예: 에르도스테인300캡슐 **15그룹** · L-아스파르트산-L-아르기닌20mL액 14 · 세티리진10정 12 · 덱시부프로펜300연질캡슐 12 · 나프록센275정 11 · 알마게이트500정 10. **제품별 e약은요 문구·안전 텍스트 차이** — 자동 지문만으론 약당 1건 미달, 통합단계 사람 대표화 필요. |
| 다른 성분인데 동일 지문 | 지문 키가 성분·함량 포함이라 구조적 방지. 무성분명은 content-지문으로 분리(오병합 없음). |
| **무성분명**(name에 `(성분)` 없음) | **1,097 그룹 / 3,141 master**. §5-C ATC 축 보강 대상. |
| 첨가제 분리 | allergy_additive_signature 가 금기 지문에 반영 → 첨가제 다르면 분열(정상). |
| 복합제·비경구 | multiIngredient(name `·` 2+) / topical·ophthalmic·vaginal·rectal·nasal + 특수제형 = Tier5 2,014. |
| **성분 추출 아티팩트**(shard 0 계승) | name 마지막 괄호 채택이라 `(수출명:KEFEN)`·`(1회용)` 등 비성분 접미가 ingredient 로 잡히는 사례 존재(케펜텍플라스타·1회용 점안액). **전부 비경구(첩부/점안) → 비경구 트랙**이라 bridge 영향 없음. 정규화 튜닝 아님(shard 0 과 동일 규칙 유지 — methodology 일치 우선). |

> **route 판정**: 제형(name) 표기 전수 기반, 증상 키워드(`눈`·`피부`) 무관. `연질캡슐`→`질캡슐` 오매칭 방지(vaginal=질정/질좌/질내만). shard 0 정정 로직 계승.

---

## 8. shard 침범 0 증명

master_id 직접 재계산(원문 확보 OTC 전량 → shard 재산정):

| 검증 | 결과 |
|---|---|
| shard 1 rows | 6,452 |
| shard 1 distinct master | **6,452** (= rows → **내부 중복 0**) |
| 내 집합 중 non-shard1 row | **0** (침범 0) |
| global 다중 shard 걸친 master | **0** (master 1개 = shard 1개 고정) |
| 내 shard1 master 가 타 shard 에도 존재 | **0** → **shard 0·2 교집합 0** |

> master 1개가 정확히 shard 1개에만 매핑(다중 MFDS_CODE 로 인한 다중 shard 없음 확인). 따라서 shard 0(%3=0)·shard 2(%3=2) 와 **구조적 교집합 0**.

---

## 9. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 담당 shard 전수 열거 | ✅ 6,452 |
| 원문 보유 조건 위반 0 | ✅ 전건 e약은요 보유 |
| 모든 master Tier/exception 부여 | ✅ (Tier1–5 + parse_fail 0) |
| fingerprint 재실행 동일 | ✅ 재실행 그룹 signature md5 `725ee48aff0bb3455579c709a33b0cf5` **불변**(2,232 그룹) |
| shard 0·2 교집합 0 | ✅ §8 |
| shard 0 로직 재현 일치 | ✅ validate `SHARD=0` → shard 0 산출물 정확 일치 |
| DB write 0 | ✅ read-only(프록시 경유 SELECT only) |
| 자기 산출물만 commit | ✅ (Batch·공유·타 shard 미수정, pathspec) |

---

## 10. 산출물

- `apps/api-server/src/scripts/drug-otc-full-corpus-fingerprint-shard-1.ts` (shard 0 계승 + authored bridge + ATC bridge, `SHARD` 파라미터·`WRITE` 가드)
- `apps/api-server/src/scripts/data/otc-fingerprint-shard-1-summary-v1.json` (집계·커버리지·canonical·bridge·ATC·splitCases·top30)
- `apps/api-server/src/scripts/data/otc-fingerprint-shard-1-groups-v1.json` (2,232 그룹)
- `apps/api-server/src/scripts/data/otc-fingerprint-shard-1-exceptions-v1.json` (parse_fail 0 + Tier5 946 그룹)
- `apps/api-server/src/scripts/data/otc-fingerprint-shard-1-bridge-v1.json` (bridge 그룹 + ATC bridge 멤버)

> **통합 WO 반영 후보**: ① 동일 성분·함량·제형 분열 79키 — 대표화 규칙 · ② 무성분명 3,141 — **ATC 축 합류 2,883 실측**(안전 불일치 131 분리 유지) · ③ authored bridge 검토후확장 998 master(안전지문 대조 후) · ④ route/특수제형 Tier5 경계. **개별 shard 로 전체 그룹수·자동화 수 확정 금지** — 3 shard fingerprint 병합 후 산정.
