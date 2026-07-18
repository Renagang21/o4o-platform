# CHECK-O4O-OTC-FULL-CORPUS-FINGERPRINT-SHARD-2-AGENT-DA-V1 — 원문 지문 조사 (에이전트 다 · shard 2)

WO: `WO-O4O-OTC-FULL-CORPUS-SOURCE-FINGERPRINT-AUDIT-3-AGENT-V1` · 일자: 2026-07-18 · 상태: **완료 (조사)**
근거: 실행 지침서 · 병렬 3-shard (가=0 완료 / 나=1 병행 / **다=2 본 문서**) · shard 0 로직 계승([shard-0 CHECK](CHECK-O4O-OTC-FULL-CORPUS-FINGERPRINT-SHARD-0-AGENT-GA-V1.md), commits `8ba528924`·`17dbc98e3`·`c4b2f6665`·`1562eed28`)

> **read-only.** DB write **0** · draft/canonical/번역/ProductMaster 연결 변경 **0**. shard 2 만 분석. 통합은 별도 WO. shard 0·1 파일 미수정.

---

## 0. 결론

> **shard 2 = 6,272 master / 1,559 item_seq 전수 지문화(추출 실패 0). content-지문 그룹 2,265 · Tier1 4,117(65.6%) / Tier5 2,052(32.7%, 비경구). 경구 4,220 · 비경구 2,052. 무성분명 3,182. 기존 STORE canonical = 전건 e약은요 ko 표시본, authored/en/needs_review 0(구조적 disjoint). authored bridge: 검토후확장후보 141그룹/781master. ⚠️같은 성분·함량·제형(bridgeKey)이 e약은요 문구차로 다수 fingerprint 그룹 분열 = 73 bridgeKey, 그중 69는 안전지문까지 상이 → authored 1건 일괄확장 불가(안전지문 대조 필수). ⚠️shard 0·1 침범 0 (master 단위 교집합 0, master당 MFDS_CODE 1개로 multi-shard 없음).**

> **⚠️ 시점 차이(중요):** shard 0 bridge(2026-07-18 01:00)는 authored 코퍼스 3,128(mfds_drug_otc 1,213 + **nutrition_combo 1,915**)을 사용했으나, **현재 DB 에는 nutrition_combo STORE canonical = 0**(mfds_drug_otc ko 1,213만 존재). 본 조사는 **현재 DB 실측**이며, 이로 인해 검토후확장후보 규모가 shard 0 like-for-like 대비 축소(authored bridgeKey 281→55). 통합단계는 authored 코퍼스 현재 상태를 기준으로 재산정 필요.

---

## 1. 모집단 · shard (침범 0 증명)

| 항목 | 값 |
|---|---|
| 원문 확보 OTC 모집단 | `regulatory_type=DRUG` · `drug_category=otc`(pde) · **e약은요 STORE canonical 보유** = **19,131** |
| shard 규칙 | `(('x'||substr(md5(item_seq),1,8))::bit(32)::bigint % 3)` (item_seq=MFDS_CODE) |
| shard 분포 | 0: **6,407** / 1: **6,452** / 2: **6,272** (합 19,131) |
| **내 shard 2** | **6,272 master / 1,559 item_seq** |

**침범 0 증명(master 단위 DB 실측):**

| 검증 | 결과 |
|---|---|
| master당 distinct MFDS_CODE > 1 (multi-shard 위험) | **0** (19,131 master = 19,131 seq_row, 1:1) |
| 여러 shard 에 걸친 master | **0** |
| shard 2 master ∩ shard 0 master | **0** |
| shard 2 master ∩ shard 1 master | **0** |
| shard 2 내부 master 중복 | **0** (distinct=6,272) |

> master당 MFDS_CODE 가 정확히 1개이므로 item_seq→shard 매핑이 master를 유일 shard로 확정 → **modulo 분할이 master 단위로도 배타적**. (item_seq 1,559 ↔ master 6,272 = 한 item_seq 가 다수 포장/master variant 로 확장되나 동일 shard 로 함께 귀속.)

> 원문 = **e약은요 SPD content**(`source_type='mfds_easy_drug'`, description_type STORE canonical). `product_drug_extensions.efficacy_text/caution_text` 은 원문 축으로 미사용(shard 0 확인 계승) → e약은요 가 유일 원문.

---

## 2. 원문 추출

| 항목 | 값 |
|---|---:|
| 추출 성공(섹션 파싱) | **6,272** |
| 추출 실패 | **0** |
| distinct item_seq | 1,559 |

섹션 = 효능·효과 / 용법·용량 / 경고 / 사용상 주의사항 / 상호작용 / 이상반응 / 저장방법.
지문 = raw_{indication,dosage,caution,full}_hash · normalized_* · 안전(ingredient_strength·dose_form·route·dosage_numeric·age·duration·contraindication·pregnancy·interaction·allergy_additive)_signature.
정규화 = HTML·공백·목록기호·문장부호변형·NFKC(전각) 만 제거. **숫자·함량·횟수·간격·연령·기간·금기·첨가제·경로·제형·성분 보존**(shard 0 과 md5 결정론 동일).

---

## 3. Tier 집계 · 그룹 규모

| Tier | master | 그룹 | 판정 |
|---|---:|---:|---|
| **Tier1** (raw_full 동일) | **4,117** (65.6%) | 1,302 | 원문 완전 동일 — 자동 그룹화 |
| Tier2 (normalized 동일) | 15 | 2 | 정규화 후 동일 |
| Tier3 (섹션 지문 동일) | 88 | 5 | 대표 1건 검토 후 공유 |
| Tier4 (그룹 내 안전 다름) | **0**¹ | 0 | — |
| **Tier5** (비경구·특수제형·복합제) | **2,052** (32.7%) | 956 | 별도 수동 트랙 |

¹ **Tier4=0 해석**(shard 0 동일): 그룹 키가 섹션 지문(효능+용법+금기)을 포함하므로 안전이 다르면 애초에 다른 지문 그룹으로 분리 → "동일 그룹 내 안전차이"는 구조적으로 불가. 안전차이는 **동일 성분의 별개 그룹 분열**로 나타남(§7 · 73 bridgeKey).

**그룹 규모 분포**: singleton **803** · 2–5: 1,249 · 6–20: 205 · 21–50: 8 · 51+: 0.
**최대 그룹**: 에르도스테인300캡슐 **42**(Tier1) · 트리메부틴말레산염100정 39 · 이부프로펜400정 31 · 아세틸시스테인200캡슐 30 · 아스피린100정 27 · 시트룰린말산염20mL액 27 · (무성분명)155캡슐 20 · 알벤다졸400정 20.

---

## 4. 경구 · 비경구

| route | master | 트랙 |
|---|---:|---|
| **oral** (경구·단일제 포함) | **4,220** | 지문 자동 그룹화 대상 |
| topical | 1,436 | Tier5 |
| ophthalmic | 329 | Tier5 |
| unknown(특수제형·미상 제형표기) | 278 | Tier5 |
| vaginal | 7 | Tier5 |
| nasal | 2 | Tier5 |
| rectal / otic | 0 | — |
| **비경구·복합제 계** | **2,052** | Tier5 |

> 경로 = **제형(name) 표기 전수 기반**(증상 키워드 무관). `연질캡슐`→oral(질정 오분류 방지), 눈·피부 주의문구로 점안·외용 오분류 방지(shard 0 route 버그수정 계승).

---

## 5. 커버리지 · 안전통합

| | content-지문 (2,265 그룹) | 안전통합 (경구·단일제, 1,260 그룹) |
|---|---:|---:|
| 50% master | 494 그룹 | 273 그룹 |
| 70% | 923 | 527 |
| 80% | 1,237 | 697 |
| 90% | 1,638 | 908 |

> 경구 단일제 4,220 master 를 **성분·함량·제형·경로+안전지문 동일**로 묶으면 1,260 그룹(content-지문 경구 대비 소폭 축소). 분열의 상당부분이 서식이 아닌 **제품별 안전 텍스트 실차이** — 약당 1건 대표화는 통합단계 사람 판단 필요.

---

## 6. canonical 연결 현황 (master_id 직접 조인 · 6-버킷)

| 버킷 | master |
|---|---:|
| **e약은요 ko canonical** (표시본) | **6,272** (전건) |
| authored ko canonical (mfds_drug_otc·nutrition_combo) | **0** |
| authored en canonical | **0** |
| ko needs_review | **0** |
| en needs_review | **0** |
| STORE 설명서 미보유 | **0** |

> **구조적 disjoint (조인 버그 아님, shard 0 ADDENDUM 계승):** 내 모집단은 e약은요-grounded. authored OTC canonical 은 A_no_spd_only(e약은요 미보유) master 대상 승격이라 이 모집단과 완전 분리 → authored/en/needs_review 0 은 정상. **e약은요 표시본과 authored 설명서는 구분**되며, "canonical 재사용" 수치는 두 모집단을 통합단계 fingerprint 로 연결해 산정(shard 단독 확정 불가).

---

## 7. authored bridge (4구획) + 원문 분열 안전대조

> 목적 = authored 설명서 1건을 grounded 제품 몇 개로 확장 가능한가. bridgeKey = `성분|함량|제형|경로`. **확장은 안전지문 대조 후(검토후)만** — 후보 키만으로 확정하지 않음.

| bridge 판정 | 그룹 | grounded master |
|---|---:|---:|
| **검토후확장후보**(authored 존재, 성분·함량·제형·경로 일치) | 141 | **781** |
| 새 설명서 필요(경구·성분명·authored 없음) | 380 | 974 |
| **주성분코드 필요**(무성분명 — name에 `(성분)` 없음, ATC bridge §8) | 788 | 2,465 |
| 비경구(별도 트랙) | 956 | 2,052 |
| **합** | **2,265** | **6,272** |

**authored 코퍼스(현재 DB)**: mfds_drug_otc ko **1,213 master / 55 source_ref_id / 55 bridgeKey**. nutrition_combo = **0**(§0 시점차이).

**⚠️ 동일 약학단위 원문 분열 + 안전대조 (후보키만으로 확정 금지 근거):**

경구·단일제 bridgeKey(`성분|함량|제형|경로`) 중 **여러 fingerprint 그룹으로 분열된 것 = 73 bridgeKey**. 그중 **안전지문까지 상이한 것 = 69**. → authored 1건으로 일괄 확장하면 안전정보가 다른 제품을 뭉갬. 반드시 **안전지문 변이별 분리 검토**.

| bridgeKey | fp 그룹 | master | 안전지문 변이 | authored |
|---|---:|---:|---:|:---:|
| 덱시부프로펜\|300밀리그램\|연질캡슐\|oral | 11 | 29 | **9** | 없음 |
| 파모티딘\|10밀리그램\|정\|oral | 8 | 43 | 6 | 없음 |
| 브로멜라인\|100밀리그램\|정\|oral | 8 | 48 | 7 | 있음 |
| 아세틸시스테인\|200밀리그램\|캡슐\|oral | 7 | 75 | 5 | 있음 |
| 나프록센\|250밀리그램\|연질캡슐\|oral | … | | | |

> 예: 에르도스테인300캡슐 grounded 42 ↔ authored 67 master(1 source_ref) — 검토후확장후보이나 **동일 bridgeKey 의 안전지문 변이 확인 후** 확장. 아세틸시스테인200캡슐은 2개 fp 그룹(30+24)로 분열, 안전지문 5변이 → 통합단계 대표화 대상.

---

## 8. 무성분명 ATC bridge (5구획)

> 대상 = **경구·단일제·무성분명 2,465 master**(name에 `(성분)` 없음). 후보 키 = `atc_code|함량|제형|경로`. 안전지문 = 최종 분리 키.
> **고정 원칙: ATC = 후보 연결 키 / 안전지문 = 최종 분리 키.** 같은 ATC라도 안전정보 다르면 반드시 분리.

| 구획 | master |
|---|---:|
| ATC 코드 없음 | **0** (전건 ATC 보유) |
| ATC 후보 없음 | **2,044** |
| **ATC 후보 있음** (= 일치 + 불일치) | **421** |
| └ ATC 후보 + 안전지문 **일치** | 213 |
| └ ATC 후보 있으나 안전지문 **불일치** | 208 |

**해석:**
- **ATC 100% 보유** — `product_drug_extensions.atc_code` 및 ATC_CODE identifier 전건. 무성분명 bridge 는 `active_ingredients`(pde 미populate) 아닌 **atc_code** 축으로 가능(shard 0 `1562eed28` de-risk 계승).
- **후보 없음 2,044** 은 대부분 **cross-shard 아티팩트** — 같은 ATC 의 성분명 twin 이 shard 0·1 에 있을 수 있으나 본 조사는 shard-local(성분 identity 대조를 shard 2 내 grounded-named + authored 코퍼스로 한정). **통합단계에서 3 shard grounded-named atc-key 병합 시 후보 다수 회복 예상** → "새 설명서 필요" 과대평가 방지.
- **안전 일치 213**: 같은 atc-key grounded-named 후보의 안전지문과 일치 → 성분 identity 안전 차용 가능. **불일치 208**: atc 는 같으나 안전정보 상이 → 반드시 분리(같은 ATC ≠ 같은 안전).

---

## 9. 표본 감사 (통합단계 반영 후보)

| 관찰 | 내용 |
|---|---|
| **동일 성분·함량·제형 원문 분열** | **73 bridgeKey**(경구·단일제). 덱시부프로펜300연질캡슐 11그룹, 파모티딘10정 8그룹 등. 69개는 안전지문까지 상이 → 통합단계 안전 변이별 대표화. |
| 다른 성분인데 동일 지문 | 지문 키가 성분·함량 포함이라 구조적 방지. 무성분명은 content-지문으로 분리(오병합 없음). |
| **무성분명**(name에 `(성분)` 없음) | **3,182 master**. 그중 경구·단일제 2,465 = ATC bridge 대상(§8). content-지문으론 분리되나 성분 라벨 약함 → 통합단계 주성분(ATC) 보강. |
| ingredient 추출 artifact | 다중 괄호명(`(성분)(수출명:…)`)은 마지막 괄호를 성분으로 오추출, `1회용`·`150기타` 등 소수 노이즈. **shard 0 regex 동일 유지**(cross-shard 비교성 우선) — 통합단계 성분코드로 교정. |
| 복합제 | multiIngredient(name `·` 2+ 또는 성분에 구분자) = Tier5. |
| **비경구** | topical/ophthalmic/vaginal/nasal + 특수제형(unknown) = Tier5 2,052(rectal·otic 0). |

---

## 10. shard 0 대조 (정합성 sanity)

| 지표 | shard 0 | **shard 2** |
|---|---:|---:|
| master | 6,407 | 6,272 |
| 그룹 | 2,285 | 2,265 |
| Tier1 | 4,158 (65%) | 4,117 (65.6%) |
| Tier5 | 2,157 (34%) | 2,052 (32.7%) |
| 경구 | ~4,250 | 4,220 |
| 무성분명 | 3,299 | 3,182 |
| 검토후확장후보(master) | 953 | 781¹ |

¹ shard 2 가 낮은 것은 shard 차이가 아니라 **authored 코퍼스 시점차이**(nutrition_combo 1,915 제거 → authored bridgeKey 281→55). 나머지 지표는 균등 분할과 일치.

---

## 11. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 담당 shard 전수 열거 | ✅ 6,272 |
| 모든 master에 Tier/exception 부여 | ✅ (Tier1–5 + parse_fail 0) |
| fingerprint 재실행 동일 | ✅ md5 결정론 — 재실행 4개 산출물 byte-identical |
| shard 0 교집합 0 | ✅ (master 단위 실측 0) |
| shard 1 조건 master 포함 0 | ✅ (master 단위 실측 0) |
| 담당 shard 내부 중복 0 | ✅ (distinct 6,272) |
| DB write 0 | ✅ (read-only, temp table 검증 외 영속 write 0) |
| 자기 산출물만 commit(pathspec) | ✅ (shard 0·1·Batch·공유·GUIDE 미수정) |

---

## 12. 산출물

- `apps/api-server/src/scripts/drug-otc-full-corpus-fingerprint-shard-2.ts` (shard 0 로직 계승 + canonical 6-버킷 + authored bridge + ATC bridge)
- `apps/api-server/src/scripts/data/otc-fingerprint-shard-2-summary-v1.json` (집계·커버리지·bridge·top30)
- `apps/api-server/src/scripts/data/otc-fingerprint-shard-2-groups-v1.json` (2,265 그룹)
- `apps/api-server/src/scripts/data/otc-fingerprint-shard-2-exceptions-v1.json` (parse_fail 0 + Tier5 956 그룹)
- `apps/api-server/src/scripts/data/otc-fingerprint-shard-2-bridge-v1.json` (4구획 + ATC 5구획 + 원문분열 안전대조)

> **통합 WO 반영 후보**: ① 동일 약학단위 원문 분열 73(안전 변이 69) — 안전지문 변이별 대표화 · ② 무성분명 ATC bridge 후보없음 2,044 = cross-shard 병합으로 회복(3 shard grounded-named atc-key 통합) · ③ authored 코퍼스 시점차이(nutrition_combo 0) 재확인 후 검토후확장 재산정 · ④ ATC 후보 안전불일치 208 = 같은 ATC 내 안전 분리. **개별 shard 로 전체 재사용·작성단위 확정 금지** — 3 shard 병합 + 안전지문 대조 후 산정.
