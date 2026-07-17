# CHECK-O4O-OTC-FULL-CORPUS-FINGERPRINT-SHARD-0-AGENT-GA-V1 — 원문 지문 조사 (에이전트 가 · shard 0)

WO: `WO-O4O-OTC-FULL-CORPUS-SOURCE-FINGERPRINT-AUDIT-3-AGENT-V1` · 일자: 2026-07-17 · 상태: **완료 (조사)**
근거: 실행 지침서 · 병렬 3-shard (가=0 / 나=1 / 다=2)

> **read-only.** DB write **0** · draft/canonical/번역/연결 변경 **0**. shard 0 만 분석. 통합은 별도 WO.

---

## 0. 결론

> **shard 0 = 6,407 master / 1,560 item_seq 전수 지문화(추출 실패 0). content-지문 그룹 2,285 · Tier1 4,158(65%)/Tier5 2,157(34%). 경구 단일제 4,250 은 안전지문 통합 시 1,244 그룹. 기존 canonical 0. ⚠️동일 성분·함량·제형이 제품별 e약은요 문구 차이로 다수 그룹으로 분열(약당 1건은 통합단계 사람 판단 필요).**

---

## 1. 모집단 · shard (침범 0)

| 항목 | 값 |
|---|---|
| 원문 확보 OTC 모집단 | `regulatory_type=DRUG` · `drug_category=otc`(pde) · **e약은요 STORE canonical 보유** = **19,131** |
| shard 규칙 | `(('x'||substr(md5(item_seq),1,8))::bit(32)::bigint % 3)` (item_seq=MFDS_CODE, 전건 보유) |
| shard 분포 | 0: **6,407** / 1: 6,452 / 2: 6,272 (균등) |
| **내 shard 0** | **6,407 master / 1,560 item_seq** |
| shard 1·2 침범 | **0** (모집단 SQL 이 `%3=0` 필터 — 구조적 배타) |

> 원문 = **e약은요 SPD content**. `product_drug_extensions.efficacy_text/caution_text` 는 **전건 미populate**(0) 확인 → e약은요 가 유일 원문.

---

## 2. 원문 추출

| 항목 | 값 |
|---|---:|
| 추출 성공(섹션 파싱) | **6,407** |
| 추출 실패 | **0** |
| 섹션 = 효능·효과 / 용법·용량 / 경고 / 사용상 주의사항 / 상호작용 / 이상반응 / 저장방법 | — |

지문: raw_{indication,dosage,caution,full}_hash · normalized_* · 안전(ingredient_strength·dose_form·route·dosage_numeric·age·duration·contraindication·pregnancy·interaction·allergy_additive)_signature.
정규화 = HTML·공백·목록기호·문장부호변형·NFKC(전각) 만 제거. **숫자·함량·횟수·간격·연령·기간·금기·첨가제·경로·제형·성분 보존.**

---

## 3. Tier 집계 · 그룹 규모

| Tier | master | 그룹 | 판정 |
|---|---:|---:|---|
| **Tier1** (raw_full 동일) | **4,158** | 1,287 | 원문 완전 동일 — 자동 그룹화 |
| Tier2 (normalized 동일) | 31 | 4 | 정규화 후 동일 |
| Tier3 (섹션 지문 동일) | 61 | 8 | 대표 1건 검토 후 공유 |
| Tier4 (안전 다름) | 0¹ | 0 | — |
| **Tier5** (비경구·특수제형·복합제) | **2,157** | 986 | 별도 수동 트랙 |

¹ **Tier4=0 해석**: 그룹 키가 섹션 지문을 포함하므로, 용량·금기 등 안전이 다르면 **애초에 다른 지문 그룹**으로 분리됨(같은 그룹 내 안전차이가 존재할 수 없음). Tier4 는 "동일 그룹 내" 개념이 아니라 **동일 성분의 별개 그룹**으로 나타남(§7 분열 144건).

**그룹 규모 분포**: singleton **804** · 2–5: 1,247 · 6–20: 227 · 21–50: 6 · 51+: 1(에르도스테인 52).
**Tier5 경로**: topical 1,633 · ophthalmic 228 · unknown(특수제형) 227 · vaginal 29 · rectal 21 · nasal 15 · oral 4(복합제).

---

## 4. 커버리지

| | content-지문 (2,285 그룹) | 안전통합 (경구 단일제, 1,244 그룹) |
|---|---:|---:|
| 50% master | 506 그룹 | 283 그룹 |
| 70% | 924 | 533 |
| 80% | 1,243 | 692 |
| 90% | 1,645 | 904 |

> **안전통합**(성분·함량·제형·경로+안전지문 동일 → 문구변이 무시)해도 경구 4,250 master 가 1,244 그룹 — content-지문(경구 ~1,299)과 큰 차이 없음. **즉 분열의 상당 부분은 단순 서식이 아니라 제품별 안전 텍스트 실차이**(금기 문구 등). 약당 1건 대표화는 사람 판단(통합단계) 필요.

---

## 5. 기존 canonical

| 항목 | 값 |
|---|---:|
| shard 0 master 중 mfds_drug_otc STORE canonical 보유 | **0** |
| canonical 보유 그룹 / 확장 후보 master | 0 / 0 |

> shard 0 에는 기 승격 제품 없음(Batch 01·복합제 등은 특정 그룹/타 shard). 전량 신규 대상.

---

## 6. 상위 30 그룹

`otc-fingerprint-shard-0-groups-v1.json` 참조. 상위: 에르도스테인300캡슐(52,Tier1) · (무성분명)100캡슐(25) · 클로닉신125정(22) · 트리메부틴150정(22) · 암브록솔30정(19) · 알마게이트500정(18) · 바실루스250캡슐(17) …

---

## 7. 표본 감사 결과 (통합단계 반영 후보)

| 관찰 | 내용 |
|---|---|
| **동일 성분·함량·제형인데 지문 분열** | **144건**. 예: 에르도스테인300캡슐 **12그룹**(52/21/10/…), 알마게이트500정 12그룹, 세티리진10정 9그룹. **제품별 e약은요 문구·안전 텍스트 차이** — 자동 지문만으론 약당 1건 미달, 통합단계 사람 대표화 필요. |
| 다른 성분인데 동일 지문 | 지문 키가 성분·함량 포함이라 구조적 방지. 무성분명은 content-지문으로 분리(오병합 없음). |
| **무성분명**(name에 `(성분)` 없음) | **1,182 그룹 / 3,299 master**. 브랜드명만인 제품 — content-지문으론 분리되나 성분 라벨 약함 → **통합단계 성분코드(주성분) 보강 후보**. |
| 첨가제 분리 | allergy_additive_signature 가 금기 지문에 반영 → 첨가제 다르면 분열(정상). |
| 복합제 | multiIngredient(name `·` 2+) = Tier5. |
| **비경구** | topical/ophthalmic/vaginal/rectal/nasal + 특수제형(구강붕해필름·좌약·TTS패치·질정) = Tier5 2,157. |

> **⚠️ route 판정 정정(버그 수정)**: 초기 routeSig 가 caution 의 증상 키워드(`눈에`·`피부`)로 판정해 **세티리진 정·알벤다졸 정 등 경구약을 topical/ophthalmic 오분류**, 또 `질캡슐` 패턴이 **연질캡슐**을 vaginal 오매칭. **제형(name) 표기 전수 기반으로 정정**(증상 무관). 이는 정규화 튜닝이 아닌 경로검출 버그 수정.

---

## 8. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 담당 shard 전수 열거 | ✅ 6,407 |
| 원문 보유 조건 위반 0 | ✅ 전건 e약은요 보유 |
| 다른 shard master 중복 0 | ✅ SQL `%3=0` 구조적 배타 |
| 모든 제품에 Tier/exception 부여 | ✅ (Tier1–5 + parse_fail 0) |
| fingerprint 재실행 동일 | ✅ 결정론(md5) |
| DB write 0 | ✅ |
| 자기 shard 산출물만 commit | ✅ (Batch·공유·타 shard 미수정, pathspec) |

---

## 9. 산출물

- `apps/api-server/src/scripts/data/otc-fingerprint-shard-0-summary-v1.json` (집계·커버리지·top30)
- `apps/api-server/src/scripts/data/otc-fingerprint-shard-0-groups-v1.json` (2,285 그룹)
- `apps/api-server/src/scripts/data/otc-fingerprint-shard-0-exceptions-v1.json` (parse_fail 0 + Tier5 986 그룹)
- `apps/api-server/src/scripts/drug-otc-full-corpus-fingerprint-shard-0.ts`

> **통합 WO 반영 후보**: ① 동일 성분·함량·제형 분열 144 — 대표화 규칙 · ② 무성분명 3,299 — 주성분코드 보강 · ③ route/특수제형 Tier5 경계 재확인 · ④ 안전지문 세분화(금기 semantic). **개별 shard 로 전체 그룹수·자동화 수 확정 금지** — 3 shard fingerprint 병합 후 산정.
