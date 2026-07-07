# CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-ORAL-COMBO-DRAFT-V1

> **WO:** WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-ORAL-COMBO-DRAFT-V1
> **성격:** 복합제 경구 OTC 설명서 초안 작성 **dry-run** (DB write 0 · registry 직접 변경 0 · canonical 승격 0 · 매장 콘텐츠 연결 0)
> **핸드오프 전제 정정:** 인계 문서는 "현재 checkout에 registry 파일이 없어 blocker"라고 기록했으나, **이 작업공간에는 registry(`docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md`, 46KB)와 선행 CHECK가 모두 존재**한다. 따라서 blocker 조건이 성립하지 않아 실제 초안 작업을 진행했다. (핸드오프 §1·§9의 blocker 시나리오는 checkout 불일치 환경에 한한 것)
> **결과 요약:** 대상 68 확정(registry 필터 일치, 기대치 68) · drafted 0 · needs_review 47 · manual_curation 11 · blocked 9 · excluded 1 · 기존 imported 66(단일제) 대비 group_key exact 중복 0(single/combo prefix 상이로 구조상 0).

---

## 1. 작업 일시

- 작성일: 2026-07-07
- 환경: 문서 registry 기준 (production DB 신규 read/write 없음)

---

## 2. 사용한 선행 문서

| 문서 | 존재 | 사용 |
|---|:-:|---|
| `docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md` | ✅ | 템플릿·문체·금지표현·§6 GMP 문구·§3.5 함량축·§3.9 민감군 |
| `docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md` | ✅ | 대상 추출(필터)·imported 66 대조·상태값·batch 정의·§2 group_key 규칙 |
| `docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-REGISTRY-POPULATE-V1.md` | ✅ | registry 채움 출처(부록A 근거) 확인 |
| `docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-100-GROUP-DRAFT-V1.md` | ✅ | 100그룹 후보(단일 32 + 복합 68) 산출 관행 확인 |
| `docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-COMBINATION-GROUPING-RULE-V1.md` | ✅ | **복합제 판정 규칙(v2 정정): 복합제=ATC 조합코드 탐지(substr(atc7,6,2)≥50 or R05X)** |
| `docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-GROUPING-DICTIONARY-SEED-V1.md` | ✅ | 성분 표기변형 정규화 사전 참조 |
| `docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-GROUPING-NORMALIZATION-AND-FILTER-DESIGN-V1.md` | ✅ | 정규화·필터 설계 참조 |
| `docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-ORAL-SINGLE-DRAFT-V1.md` | ✅ | 직전 batch(단일제) 형식·집계·§11 flag 연계 |

## 3. 누락된 선행 문서와 처리

- 핸드오프가 "누락"으로 지목한 6개 문서(registry + 5 CHECK)는 **현재 checkout에 전부 존재**한다. 누락 없음 → blocker 해제.
- 단, **e약은요/허가 원문 텍스트(itemSeq 단위 raw)** 와 **복합제의 실제 성분·함량 조합 데이터**는 이 세션에서 직접 조회하지 않았다. registry는 **ATC 조합코드 + 대표 제품명 + 원문 건수(grounding count)** 만 제공한다.
- COMBINATION-GROUPING-RULE(v2)가 명시하듯 **복합제는 조합 성분이 DB에 없어** ATC 조합코드로만 탐지된다. 따라서 초안의 성분 조합은 **ATC 계열 수준의 대표 조합**으로만 기술하고, **구체 성분·함량 조합 수치는 창작하지 않는다**(§8 근거 처리 원칙). 그 결과 **모든 대상은 최소 `needs_review`** 이며, `drafted`(완결)로 올린 건은 0이다.

---

## 4. 대상 추출 기준

registry §5 표에서 다음 필터로만 추출:

```text
assigned_batch  = BATCH-ORAL-COMBO
status          = candidate
single_or_combo = combo
route           = oral
```

- registry 물리적 위치: `docs/registries/...-V1.md` 라인 **201~268**(연속 68행, batch 정의행 86 제외).
- imported 66행(라인 103~168, 전량 단일제)은 대조에만 사용.

**count 게이트:** 추출 결과 **68행** — WO/registry 명시치(68)와 **일치**. 보정/추가 없음.

---

## 5. 대상 68개 목록 (ATC 조합코드 계열별)

> `ing_key` = registry ingredient_key(ATC 조합코드 기반). `g` = grounding(e약은요 건수). 전 행 risk_class=`review_required`.

### 5.1 a06ab52 — 자극성 완하제 복합(비사코딜 계열, "변비약") · 14행

| 라인 | strength | form | g | 대표제품 | decision |
|-:|---|---|-:|---|---|
| 202 | 5mg | tablet | 53 | 비센큐정 | needs_review |
| 207 | 16.75mg | tablet | 32 | 씨락정 | needs_review |
| 209 | 55mg | tablet | 19 | 쾌통정 | needs_review |
| 216 | 6mg | tablet | 11 | 비사린정 | needs_review |
| 219 | 10mg | tablet | 10 | 이지굿정 | needs_review |
| 225 | 100mg | tablet | 7 | 비카린엠장용정 | needs_review |
| 228 | 20mg | soft_capsule | 6 | 센스락유연질캡슐 | needs_review |
| 232 | 3mg | liquid | 6 | 액티큐정 | needs_review |
| 234 | 12mg | tablet | 5 | 듀오그린정 | needs_review |
| 235 | 15mg | tablet | 5 | 디유비정 | needs_review |
| 240 | 21mg | soft_capsule | 4 | 이지클린장용연질캡슐 | needs_review |
| 242 | 50mg | tablet | 4 | 아락실큐정 | needs_review |
| 247 | 3mg | tablet | 4 | 뉴코딜정 | needs_review |
| 256 | 6mg | soft_capsule | 2 | 듀얼싹플러스장용연질캡슐 | needs_review |

### 5.2 r01ba52 — 비충혈제거+항히스타민 복합(슈도에페드린 계열, "코감기") · 11행

| 라인 | strength | form | g | 대표제품 | decision |
|-:|---|---|-:|---|---|
| 206 | 60mg | tablet | 34 | 가네카정 | needs_review |
| 210 | 60mg | liquid | 18 | 액소도스정 | needs_review |
| 215 | 5ml | liquid | 12 | 챔프노즈시럽 | needs_review |
| 224 | 30mg | capsule | 8 | 코코엔캡슐 | needs_review |
| 231 | 2.5mg | tablet | 6 | 러지피드정 | needs_review |
| 233 | na | liquid | 5 | 액티피드시럽 | needs_review (대표) |
| 243 | 200mg | soft_capsule | 4 | 레티코연질캡슐 | needs_review |
| 253 | 100ml | liquid | 3 | 모드콜노즈시럽 | needs_review |
| 245 | 500ml | liquid | 4 | 액티피드시럽 | **blocked** (233 중복·용기용량) |
| 255 | 90ml | liquid | 3 | 액티피드시럽 | **blocked** (233 중복·용기용량) |
| 266 | 75ml | liquid | 1 | 코스펜에이시럽 | **blocked** (저grounding·용기용량) |

### 5.3 r01ba53 — 비충혈제거 복합(슈도에페드린 다른 조합) · 5행

| 라인 | strength | form | g | 대표제품 | decision |
|-:|---|---|-:|---|---|
| 218 | 10mg | tablet | 10 | 콜민-에이정 | needs_review |
| 220 | na | liquid | 9 | 콜민-에이시럽 | needs_review (대표) |
| 254 | 4mg | tablet | 3 | 코비안에스정 | needs_review |
| 261 | 10mg | soft_capsule | 2 | 노즈그린연질캡슐 | needs_review |
| 217 | 500ml | liquid | 11 | 콜민-에이시럽 | **blocked** (220 중복·용기용량) |

### 5.4 r06ab54 — 항히스타민 복합(클로르페니라민 계열, "종합감기/비염") · 8행

| 라인 | strength | form | g | 대표제품 | decision |
|-:|---|---|-:|---|---|
| 226 | 3mg | capsule | 7 | 감콜파워캡슐 | needs_review |
| 229 | 0.13mg | capsule | 6 | 시노카엔캡슐 | needs_review |
| 241 | 10mg | capsule | 4 | 콘택골드캡슐 | needs_review |
| 252 | 100ml | liquid | 3 | 베비맥시럽 | needs_review (대표) |
| 260 | 15mg | tablet | 2 | 세리펙에스정 | needs_review |
| 263 | na | liquid | 1 | 베비맥시럽 | **blocked** (252 중복·저grounding) |
| 264 | 60ml | liquid | 1 | 베비맥시럽 | **blocked** (252 중복·저grounding) |
| 267 | 30mg | capsule | 1 | 하벤유에스캡슐 | **blocked** (저grounding) |

### 5.5 r06aa52 — 항히스타민 복합(디펜히드라민 계열) · 1행

| 라인 | strength | form | g | 대표제품 | decision |
|-:|---|---|-:|---|---|
| 257 | 45mg | tablet | 2 | 파인에스정 | needs_review |

### 5.6 m01ae51 — 이부프로펜 복합(진통, 생리통/감기) · 6행

| 라인 | strength | form | g | 대표제품 | decision |
|-:|---|---|-:|---|---|
| 205 | 200mg | soft_capsule | 36 | 퓨어펜연질캡슐 | needs_review |
| 208 | 400mg | soft_capsule | 24 | 이브엔연질캡슐 | needs_review |
| 211 | 200mg | tablet | 17 | 원펜정 | needs_review |
| 222 | 368.9mg | tablet | 8 | 캐롤에프정 | needs_review |
| 239 | 75mg | tablet | 4 | 그날엔정 | needs_review |
| 244 | 250mg | soft_capsule | 4 | 도나펜알파연질캡슐 | needs_review |

### 5.7 m03bb53 — 근이완 복합(클로르족사존 계열) · 3행

| 라인 | strength | form | g | 대표제품 | decision |
|-:|---|---|-:|---|---|
| 201 | 150mg | tablet | 64 | 담엔쿨정 | needs_review |
| 248 | 25mg | tablet | 4 | 스카풀라정 | needs_review |
| 249 | 300mg | tablet | 3 | 리렉사정 | needs_review |

### 5.8 m09ab52 — 소염효소 복합 · 2행

| 라인 | strength | form | g | 대표제품 | decision |
|-:|---|---|-:|---|---|
| 203 | 40mg | tablet | 44 | 인플라정 | needs_review |
| 258 | 1mg | tablet | 2 | 트로멜정 | needs_review |

### 5.9 a02ba53 — 파모티딘+제산 복합("속쓰림") · 2행

| 라인 | strength | form | g | 대표제품 | decision |
|-:|---|---|-:|---|---|
| 212 | 10mg | tablet | 17 | 파모컴정 | needs_review |
| 251 | 800mg | tablet | 3 | 파모콤푸츄정 | needs_review |

### 5.10 a06ac51 — 팽창성 완하제 복합(차전자피 계열) · 2행

| 라인 | strength | form | g | 대표제품 | decision |
|-:|---|---|-:|---|---|
| 236 | 4g | granule | 4 | 아락실과립 | needs_review (대표) |
| 262 | na | granule | 1 | 아락실과립 | **blocked** (236 중복·저grounding) |

### 5.11 c05ca53 — 정맥·치질 플라보노이드 복합 · 1행

| 라인 | strength | form | g | 대표제품 | decision |
|-:|---|---|-:|---|---|
| 237 | 500mg | tablet | 4 | 프라본정 | needs_review |

### 5.12 n02be51 — 아세트아미노펜 복합(진통/감기 혼재) · 8행 → 전량 manual_curation

| 라인 | strength | form | g | 대표제품 | decision |
|-:|---|---|-:|---|---|
| 204 | 500mg | tablet | 40 | 편해정 | manual_curation |
| 213 | 400mg | tablet | 14 | 수프리정 | manual_curation |
| 214 | 450mg | tablet | 12 | 다아펜정 | manual_curation |
| 221 | 300mg | tablet | 8 | 속콜펜정 | manual_curation |
| 227 | 14.888g | liquid | 7 | 테라플루데이타임건조시럽 | manual_curation |
| 230 | na | liquid | 6 | 테라플루데이타임건조시럽 | manual_curation |
| 250 | 250mg | tablet | 3 | 사리돈에이정 | manual_curation |
| 259 | 400mg | soft_capsule | 2 | 그날엔에이스연질캡슐 | manual_curation |

### 5.13 a04ad51 — 멀미약 복합(항콜린/항히스타민) · 4행

| 라인 | strength | form | g | 대표제품 | decision |
|-:|---|---|-:|---|---|
| 223 | 20ml | liquid | 8 | 오네론액 | manual_curation |
| 238 | 25mg | tablet | 4 | 메카인정 | manual_curation |
| 246 | 20mg | tablet | 4 | 키미테정 | manual_curation |
| 268 | na | liquid | 1 | 토스롱액 | **blocked** (저grounding) |

### 5.14 p03ac51 — 외용 살충(피레트린 계열) · 1행 → excluded

| 라인 | strength | form | g | 대표제품 | decision |
|-:|---|---|-:|---|---|
| 265 | na | liquid | 1 | 라이센드플러스액 | **excluded** (경구 아님·route 오분류) |

---

## 6. 기존 imported 66개와 중복/충돌 확인

- **group_key exact 중복: 0건.** imported 66은 전량 `single`, 본 대상 68은 전량 `combo` → group_key의 `{single|combo}` 세그먼트가 달라 **구조상 exact 일치 불가**.
- **대표 제품명 대조:** imported 대표제품과 겹치는 제품 없음(단일제 성분명 vs 복합제 브랜드명).
- **성분 계열 교차(충돌 아님, 정합 참고):**

| combo 후보 | 관련 imported/single | 관계 | 판단 |
|---|---|---|---|
| c05ca53_combo 프라본정(237) | SINGLE No.7 미세정제플라보노이드분획물(single) | 동일 정맥·치질 플라보노이드 계열이 single·combo로 병존 | 충돌 아님. SINGLE §11-3 flag와 연계(§11-A) |
| m01ae51_combo(이부프로펜 복합) | imported 이부프로펜 200/400 단일 | 단일 vs 복합 정당 분리 | 충돌 아님 |
| n02be51_combo(아세트아미노펜 복합) | imported 아세트아미노펜 325/500/650 단일 | 단일 vs 복합 정당 분리 | 충돌 아님 |
| a02ba53_combo(파모티딘 복합) | imported 파모티딘 10mg 단일 | 단일 vs 복합 정당 분리 | 충돌 아님 |

**충돌(conflict:) 없음.** 새 초안이 imported 원본을 덮어쓰는 경우 없음.

---

## 7. 제외/보류 대상 요약

| decision | 건수 | 라인 | 핵심 사유 |
|---|-:|---|---|
| **excluded** | 1 | 265 | 라이센드플러스액 = 외용 페르메트린/피레트린 살충제. **경구 복합제 OTC 아님** — route=oral 오분류. TOPICAL batch로 재배정 권장 |
| **blocked** | 9 | 245·255·266·217·263·264·267·262·268 | (a) 동일 제품 strength 파편화 중복(액티피드/베비맥/콜민에이/아락실 = 용기용량 ml·g 오파싱) + (b) grounding=1 저근거. 그룹 기준(함량축) 불명확 → 초안 미작성 |
| **manual_curation** | 11 | n02be51 8행 + a04ad51 3행(223·238·246) | 아세트아미노펜 복합(진통 vs 감기 혼재·중복복용/간독성·사리돈에이 피린계·테라플루 다성분) / 멀미약 복합(항콜린·소아·운전·키미테 제형 이상). 자동 초안 위험 |

---

## 8. 각 그룹 grounding·성분 조합 근거

**근거 처리 원칙(가이드 §3.8 + COMBINATION-GROUPING-RULE v2 준수):**
- 이 세션은 e약은요 **원문 텍스트**와 **복합제 성분 조합 raw** 를 직접 조회하지 않았고, registry의 **ATC 조합코드 + 대표제품 + grounding count** 만 보유.
- 따라서 초안의 성분 조합/효능은 **ATC 계열 수준의 대표 조합**으로만 기술하고, **구체 성분·함량 조합 수치와 용법 수치는 창작하지 않는다**("허가된 용법·용량에 따라"·"구체 조합은 원문 확인").
- 복합제는 규칙상 **review_required 기본** → 원문 대조로 조합·주의를 확정해야 하므로 **초안 제공 그룹도 최소 `needs_review`**. 완결(`drafted`) 0건.

| 계열 | 대표 조합(ATC 계열 수준) | 주요 증상 | 성분 조합 작용 | 주의 축 | 판단 |
|---|---|---|---|---|---|
| a06ab52 | 자극성 완하제(비사코딜 등)+연화·배변 보조 | 변비 | 대장 자극 배변 촉진 | 장기·연용 금지·복통·탈수·소아 | needs_review |
| r01ba52 | 슈도에페드린(비충혈)+항히스타민(트리프롤리딘 등) | 코막힘·콧물·재채기(코감기) | 비충혈 제거 + 콧물 억제 | 고혈압·심질환·전립선·졸음·운전·항히스타민 중복 | needs_review |
| r01ba53 | 슈도에페드린+항히스타민(다른 조합) | 코감기 | 상동 | 상동 | needs_review |
| r06ab54 | 클로르페니라민(항히스타민)+비충혈·진해 등 종합 | 감기 제증상·비염 | 콧물·재채기 억제 + 감기 보조 | 졸음·항콜린·다성분 중복·소아 | needs_review |
| r06aa52 | 디펜히드라민+보조 성분 | 알레르기·비염(적응증 원문 확인) | 항히스타민 | 졸음·항콜린·수면유도 혼동 | needs_review |
| m01ae51 | 이부프로펜+파마브롬(이뇨) 또는 +비충혈/항히스타민 | 생리통·두통 또는 감기 | NSAID 진통 + (부기/콧물 보조) | NSAID 민감(§3.9)·위장·신장·임신후기·조합 상이 | needs_review |
| m03bb53 | 클로르족사존(근이완)+아세트아미노펜/NSAID | 근골격계 통증·근경련 | 근이완 + 진통 | 졸음·간·아세트아미노펜 중복복용 | needs_review |
| m09ab52 | 소염효소(브로멜라인/세라티오펩티다제 등)+보조 | 부기·염증 완화 보조 | 단백분해 소염 | 소화성궤양·항응고 병용·grounding 편차 | needs_review |
| a02ba53 | 파모티딘(H2)+제산제 | 속쓰림·위산과다 | 위산 분비 억제 + 중화 | 신장애·장기복용·병용흡수 | needs_review |
| a06ac51 | 차전자피(팽창성)+자극성/센나 등 | 변비 | 변 용적 증대 + 배변 보조 | 수분 섭취·연하곤란·장폐색 | needs_review |
| c05ca53 | 플라보노이드(트록세루틴/디오스민 등) 복합 | 정맥부전·치질 증상 | 정맥 긴장·순환 보조 | 임부·증상 지속 상담·SINGLE MPFF와 분류 정합 | needs_review |
| n02be51 | 아세트아미노펜+카페인/항히스타민/비충혈 등 | **진통 또는 감기(혼재)** | 해열진통 + (감기 보조) | **아세트아미노펜 중복복용·간독성**·피린계(사리돈에이)·다성분 | **manual_curation** |
| a04ad51 | 항콜린/항히스타민 멀미 성분 복합 | 멀미(오심·구토) | 전정기·구토 억제 | 항콜린 금기·녹내장·전립선·**운전·소아**·키미테 제형 이상 | **manual_curation** |
| p03ac51 | 피레트린/페르메트린 외용 살충 | 머릿니·이 구제 | 외용 살충 | **경구 아님** | **excluded** |

---

## 9. 설명서 초안 (needs_review — ATC 계열 대표 골격)

> 공통: 모든 초안 하단에 가이드 §6 GMP/"성분 기준 선택" 문구를 포함(중복 표기를 피해 초안별 축약, 실제 반영 시 §6 전문 삽입). 복합제 특성상 **구체 성분·함량 조합은 "원문 확인"**, 용법은 "허가된 용법·용량에 따라"로 둔다. 각 계열의 함량/제형 변형(라인별)은 **동일 골격을 공유**하며 실제 반영 시 §9.1 형식으로 개별 전개한다. **전 초안 `needs_review`(완결 drafted 0).**

### 9.1 [needs_review] 자극성 완하제 복합 정/캡슐 (a06ab52 · 14행 공유)

| 항목 | 내용 |
|---|---|
| 성분 | 비사코딜 등 자극성 완하 성분 복합(구체 조합·함량 원문 확인) |
| 분류 | 일반의약품 |
| 작용 | 대장 자극에 의한 배변 촉진 |
| 주요 증상 | 변비, 배변 곤란 |
| 선택 포인트 | 성분 조합과 함량 기준으로 확인하는 변비약 |
| 주의 대상 | 복통·오심 동반 변비, 장기 복용, 임부, 소아 |

**효능·효과** 변비 및 배변 곤란의 완화(구체 조합에 따른 적응증은 원문 확인).
**복용 안내** 허가된 용법·용량에 따라 복용하며, 장기 연용하지 않습니다. 충분한 수분과 함께 복용합니다.
**주의 대상** 복통·구역·구토를 동반한 원인 불명의 변비, 장폐색 의심, 임부는 복용 전 약사와 상담하세요. 며칠 사용해도 배변이 없으면 상담이 필요합니다.
**⚠ 검토 필요:** 복합 조합 성분·함량 원문 확정. 자극성 완하제 연용·의존 주의(§3.9). grounding 편차(2~53).
**성분 기준 선택** (§6 공통 문구)

### 9.2 [needs_review] 코감기 복합 정/캡슐/시럽 (r01ba52 + r01ba53 · 대표행 공유)

| 항목 | 내용 |
|---|---|
| 성분 | 슈도에페드린(비충혈제거) + 항히스타민 등 복합(구체 조합·함량 원문 확인) |
| 분류 | 일반의약품 |
| 작용 | 코막힘 완화 및 콧물·재채기 억제 |
| 주요 증상 | 코막힘, 콧물, 재채기 등 감기·비염의 코 증상 |
| 선택 포인트 | 코 증상 조합에 맞춘 복합 성분, 성분·함량 기준 확인 |
| 주의 대상 | 고혈압·심장질환, 전립선비대, 운전·기계조작, 다른 감기약과 중복 |

**효능·효과** 감기 또는 알레르기성 비염에 의한 코막힘·콧물·재채기 등 코 증상의 완화(구체 적응증은 원문 확인).
**복용 안내** 허가된 용법·용량에 따라 복용합니다. 같은 계열 성분이 다른 감기약에 함께 들어 있는 경우가 많아 중복 복용을 확인합니다.
**주의 대상** 고혈압·심장질환·갑상선질환·전립선비대가 있으면 복용 전 상담하세요. 졸음이 올 수 있어 운전·기계조작에 주의합니다. 증상이 오래 지속되면 상담이 필요합니다.
**⚠ 검토 필요:** 슈도에페드린 심혈관 민감·항히스타민 졸음(§3.9). 액티피드시럽·콜민에이시럽은 **동일 제품이 용기용량으로 파편화**(§11-B) → 대표행만 초안, 나머지 blocked.
**성분 기준 선택** (§6 공통 문구)

### 9.3 [needs_review] 종합감기/비염 항히스타민 복합 (r06ab54 + r06aa52 · 대표행 공유)

| 항목 | 내용 |
|---|---|
| 성분 | 클로르페니라민/디펜히드라민 등 항히스타민 + 감기 보조 성분 복합(원문 확인) |
| 분류 | 일반의약품 |
| 작용 | 콧물·재채기 등 감기·알레르기 증상 완화 |
| 주요 증상 | 콧물, 재채기, 코막힘 등 감기 제증상 및 비염 |
| 선택 포인트 | 증상 조합에 맞춘 복합 성분, 성분 기준 확인 |
| 주의 대상 | 졸음(운전·기계조작), 녹내장·전립선비대(항콜린), 소아, 다른 감기약 중복 |

**효능·효과** 감기의 제증상(콧물·재채기·코막힘 등) 및 알레르기성 비염 증상의 완화(구체 조합은 원문 확인).
**복용 안내** 허가된 용법·용량에 따라 복용하며, 같은 성분이 든 다른 감기약과 중복 복용하지 않습니다.
**주의 대상** 졸음이 올 수 있어 운전·기계조작에 주의합니다. 녹내장·전립선비대·심한 심장질환이 있으면 복용 전 상담하세요. 소아는 용량·연령 기준을 확인합니다.
**⚠ 검토 필요:** 다성분 종합감기약 → 타깃 증상·조합 상이(§부록 병합 주의). 항콜린·졸음 계열(§3.9). 베비맥시럽 용기용량 파편화(§11-B).
**성분 기준 선택** (§6 공통 문구)

### 9.4 [needs_review] 이부프로펜 복합 정/연질캡슐 (m01ae51 · 6행 공유)

| 항목 | 내용 |
|---|---|
| 성분 | 이부프로펜 + 파마브롬(이뇨) 또는 비충혈/항히스타민 등 복합(조합 원문 확인) |
| 분류 | 일반의약품 |
| 작용 | 진통·소염 및 (조합에 따라) 부기·코 증상 보조 |
| 주요 증상 | 생리통·두통 또는 감기 관련 통증(조합에 따라 상이) |
| 선택 포인트 | 통증 유형과 동반 증상 조합 기준으로 확인 |
| 주의 대상 | 위장장애·신장·심혈관, 항응고제 병용, 임신 후기, NSAID 과민 |

**효능·효과** 생리통·두통 등 통증 완화, 또는 감기에 수반되는 통증·발열 완화(구체 적응증·조합은 원문 확인).
**복용 안내** 허가된 용법·용량에 따라 복용합니다. 위가 약하면 식후 복용을 권장하고, 다른 소염진통제(NSAID)와 중복 복용하지 않습니다.
**주의 대상** 위궤양·위장출혈 병력, 신장·심혈관질환, 항응고제 복용자, 임신 후기에는 복용 전 상담하세요. 위통·흑색변·발진·호흡곤란 시 중단 후 상담.
**⚠ 검토 필요:** 조합이 **생리통(파마브롬)** 인지 **감기(비충혈/항히스타민)** 인지 제품별 상이 → 원문으로 적응증·조합 확정. NSAID 민감군(§3.9).
**성분 기준 선택** (§6 공통 문구)

### 9.5 [needs_review] 클로르족사존 근이완 복합 정 (m03bb53 · 3행 공유)

| 항목 | 내용 |
|---|---|
| 성분 | 클로르족사존(근이완) + 아세트아미노펜/소염진통 등 복합(조합 원문 확인) |
| 분류 | 일반의약품 |
| 작용 | 근육 이완 및 진통 |
| 주요 증상 | 근육통, 결림, 근경련을 동반한 통증 |
| 선택 포인트 | 근경련·근긴장 동반 통증에 맞춘 복합 성분 |
| 주의 대상 | 졸음(운전), 간질환, 아세트아미노펜 중복복용 |

**효능·효과** 근육의 긴장·경련을 동반한 통증(요통·어깨결림 등)의 완화(구체 조합은 원문 확인).
**복용 안내** 허가된 용법·용량에 따라 복용합니다. 진통 성분이 다른 약과 겹치지 않도록 확인합니다.
**주의 대상** 졸음이 올 수 있어 운전에 주의하고, 간질환이 있으면 복용 전 상담하세요. 아세트아미노펜 함유 시 다른 해열진통제와 중복하지 않습니다.
**⚠ 검토 필요:** 조합 성분(진통 성분 종류·함량) 원문 확정. 졸음·간(§3.9).
**성분 기준 선택** (§6 공통 문구)

### 9.6 [needs_review] 소염효소 복합 정 (m09ab52 · 2행)

- **인플라정 40mg(203, g44)·트로멜정 1mg(258, g2):** 소염효소(브로멜라인/세라티오펩티다제 등) 복합. 부기·염증 완화 보조. 요약표(성분=소염효소 복합·분류=일반의약품·작용=단백분해 소염·주요 증상=부기·염증·선택 포인트=성분 기준·주의 대상=소화성궤양·항응고 병용) + 효능·효과(수술 후/외상 부기 완화 보조, 원문 확인) + 복용 안내(허가 용법) + 주의 대상 + §6. **⚠ 트로멜정 grounding 2, 조합 성분 원문 확정 필요.**

### 9.7 [needs_review] 파모티딘+제산 복합 정 (a02ba53 · 2행)

- **파모컴정 10mg(212, g17)·파모콤푸츄정 800mg(251, g3):** 파모티딘(H2 차단) + 제산제 복합. 속쓰림·위산과다·위부불쾌감. 요약표 + 효능·효과(위산과다에 의한 속쓰림·신트림) + 복용 안내(허가 용법·장기복용 회피) + 주의 대상(신장애·장기복용·다른 약 흡수 영향) + §6. **⚠ 800mg=제산제 함량축, 조합 원문 확인. 신장애(§3.9).**

### 9.8 [needs_review] 팽창성 완하제 복합 과립 (a06ac51 · 대표행 236)

- **아락실과립 4g(236, g4):** 차전자피 등 팽창성 완하 성분 복합. 변비. 요약표 + 효능·효과(변비 완화) + 복용 안내(충분한 수분과 복용·연하곤란 주의) + 주의 대상(장폐색·수분부족·소아) + §6. **⚠ na 파편행(262) blocked. 조합 성분 원문 확인.**

### 9.9 [needs_review] 정맥·치질 플라보노이드 복합 정 (c05ca53 · 237)

- **프라본정 500mg(237, g4):** 플라보노이드(디오스민/트록세루틴 등) 복합. 만성 정맥부전(다리 무거움·부종)·치질 증상 보조. 요약표 + 효능·효과(정맥·림프 순환 보조, 치질 급성 증상 완화 — 원문 확인) + 복용 안내(허가 용법) + 주의 대상(임부·수유부·증상 지속 상담) + §6. **⚠ SINGLE No.7 미세정제플라보노이드분획물(single)과 계열 중복 → 단일/복합 분류 정합(§11-A).**

### 9.10 [manual_curation] 아세트아미노펜 복합 (n02be51 · 8행) — 초안 미작성

- 사유: **진통 복합(편해/수프리/다아펜/속콜펜/사리돈에이)과 감기약(테라플루)이 한 ATC 코드에 혼재.** 아세트아미노펜 **중복복용·간독성**, 사리돈에이의 **이소프로필안티피린(피린계 과민)**, 테라플루의 **다성분 감기약** 등 자동 초안 위험이 크다(§부록 감기약 병합 주의·§3.9). 원문으로 제품군을 분리하고 성분 조합·주의를 확정한 뒤 개별 초안 권장. 테라플루(227·230)는 용기용량 파편 중복도 병존(§11-B).

### 9.11 [manual_curation] 멀미약 복합 (a04ad51 · 223·238·246) — 초안 미작성

- 사유: **항콜린/항히스타민 멀미 성분 복합.** 녹내장·전립선비대 금기, **운전·소아 주의**, 스코폴라민류의 항콜린 부작용. **키미테정(246)** 은 통상 경피 패치(키미테 패치) 브랜드로 알려져 있어 "정(tablet)" 제형 표기의 실제 제형 확인 필요(§11-C). 자동 초안 위험 → 수동 큐레이션. 토스롱액(268)은 grounding 1로 별도 blocked.

### 9.12 [blocked/excluded] 초안 미작성 목록

- **blocked(9):** 245·255(액티피드시럽 dup)·266(코스펜에이 g1)·217(콜민에이시럽 dup)·263·264(베비맥시럽 dup/g1)·267(하벤유에스 g1)·262(아락실과립 dup/g1)·268(토스롱액 g1). 사유 §7·§11-B.
- **excluded(1):** 265 라이센드플러스액 — 외용 살충제, 경구 아님. §11-D.

---

## 10. 분류 집계

| 분류 | 건수 | 계열/라인 |
|---|-:|---|
| drafted | **0** | — (복합제 review_required 기본 + 조합 원문 미확정) |
| needs_review | **47** | a06ab52 14 · r01ba52 8 · r01ba53 4 · r06ab54 5 · r06aa52 1 · m01ae51 6 · m03bb53 3 · m09ab52 2 · a02ba53 2 · a06ac51 1 · c05ca53 1 |
| manual_curation | **11** | n02be51 8 · a04ad51 3(223·238·246) |
| blocked | **9** | 245·255·266·217·263·264·267·262·268 |
| excluded | **1** | 265 |
| **합계** | **68** | |

- 초안 제공(needs_review): **47건**(ATC 계열 11종 대표 골격, 함량/제형 변형은 골격 공유).
- 초안 미작성(manual_curation + blocked + excluded): **21건**.

---

## 11. registry 업데이트 제안 (직접 변경 아님 — 중앙 승인 대상)

> 본 CHECK는 registry 파일을 **변경하지 않는다**. 아래는 제안이며 상태 전이는 중앙 배치 관리 방에서만.

**상태 전이 제안(candidate → …):**

| 대상 | current | proposed | reason |
|---|---|---|---|
| needs_review 47행 | candidate | needs_review | 계열 대표 초안 제공, 복합 조합·원문 검토 필요 |
| n02be51 8 + a04ad51 3(223·238·246) | candidate | manual_curation | 아세트아미노펜/감기 혼재·멀미 항콜린, 자동 초안 위험 |
| 245·255·266·217·263·264·267·262·268 | candidate | blocked | 용기용량 파편 중복 + 저grounding, 함량축 불명확 |
| 265 라이센드플러스액 | candidate | excluded | 경구 아님(외용 살충) |

**registry 데이터 품질 flag(별도 정비 WO 권장):**

- **§11-A single/combo 분류 정합:** 정맥·치질 플라보노이드가 SINGLE(No.7 MPFF, single)과 combo(`c05ca53_combo` 프라본정)로 병존. 단일/복합 판정 기준 정합 필요(SINGLE §11-3와 동일 이슈).
- **§11-B strength 파편화(중대):** 시럽·과립·건조시럽의 `strength_key`가 **농도가 아니라 용기 용량(ml·g)** 으로 파싱되어 **동일 제품이 여러 group_key로 분할**됨. 확인 사례:
  - 액티피드시럽 3행(233 na / 245 500ml / 255 90ml)
  - 베비맥시럽 3행(252 100ml / 263 na / 264 60ml)
  - 콜민-에이시럽 2행(217 500ml / 220 na)
  - 테라플루데이타임건조시럽 2행(227 14.888g / 230 na)
  - 아락실과립 2행(236 4g / 262 na)
  → §2 규칙("용기 용량 금지, 농도만") 위반. 원문 `%`·`mg/ml`·`mg/포` 재파싱 후 group_key 병합 권장. 본 CHECK는 대표행 1개만 초안, 나머지 blocked 처리.
- **§11-C 제형 표기 이상:** 키미테정(246, tablet) — 키미테는 통상 경피 패치 브랜드. 실제 제형/제품 동일성 확인 필요.
- **§11-D route 오분류:** 라이센드플러스액(265, `p03ac51`, route=oral) = 외용 피레트린 살충제 → TOPICAL(또는 별도 살충 batch)로 재배정.
- **§11-E na strength:** liquid/granule의 `strength_key=na`(233·220·230·262·263·268·265) 다수 — 파싱 실패 신호. §11-B와 함께 정비.

---

## 12. 추가 후보

- registry 필터(BATCH-ORAL-COMBO·candidate·combo·oral) 외 **신규 후보를 산출하지 않았다**(WO 금지).
- 발견 사항은 신규 후보가 아니라 위 §11의 **기존 registry 정합/파싱 이슈**이며 후보 추가가 아님.
- 추가 후보: **없음.**

---

## 13. 금지사항 준수 확인

| 금지 항목 | 준수 |
|---|:-:|
| DB write (product_candidate_description_drafts 등) | ✅ 0 |
| SharedProductDescription insert/update | ✅ 0 |
| ProductDrugExtension 임상/설명 텍스트 입력 | ✅ 0 |
| ProductMaster/ProductCandidate 상태 변경 | ✅ 0 |
| canonical 승격 | ✅ 0 |
| imported/drafted 상태 직접 변경 | ✅ 0 |
| **registry 파일 직접 상태 변경** | ✅ 0 (제안만 §11) |
| 매장 콘텐츠/QR/POP/태블릿 연결 | ✅ 0 |
| 단일제 경구 설명 작성 | ✅ 0 (본 batch=복합제 한정) |
| 비경구 route 설명 작성 | ✅ 0 (265 excluded 처리) |
| 처방의약품 설명 작성 | ✅ 0 (OTC 한정) |
| 임의 후보 추가 | ✅ 0 |
| 브랜드어(플러스/파워/콤비)만으로 복합제 판정 | ✅ 회피(ATC 조합코드 근거) |
| 근거 없는 성분·함량 조합 창작(§3.8) | ✅ 회피(조합="원문 확인", 용법="허가 용법·용량에 따라") |

---

## 14. 후속 batch 제안

1. **§11-B strength 재파싱 선행 WO(권장 최우선):** 시럽·과립·건조시럽 용기용량 오파싱 교정 → blocked 9건 중 파편 중복 6건 재통합·재분류. 각 route batch 진행 전 선행.
2. **원문 grounding 확정 batch:** needs_review 47건의 복합 **조합 성분·함량·주의 수치**를 e약은요/허가 원문으로 확정 → 계열 골격을 제품군별 개별 초안으로 확장, 일부 drafted 승격. (production DB read-only, write 0)
3. **manual_curation 큐레이션 WO:** n02be51(아세트아미노펜 진통 vs 감기 분리)·a04ad51(멀미 항콜린) 약사 검토 후 개별 초안.
4. **route 재배정:** 265 라이센드플러스액 → TOPICAL/살충 batch(§11-D).
5. **single/combo 정합 WO:** 정맥·치질 플라보노이드(§11-A) 단일/복합 판정 통일 — SINGLE §11-3와 합쳐 처리.

---

*V1 · 2026-07-07 · BATCH-ORAL-COMBO candidate 68 dry-run · drafted 0 / needs_review 47 / manual 11 / blocked 9 / excluded 1 · DB write 0 · registry 직접 변경 0 · 핸드오프 blocker 전제(registry 부재)는 본 workspace에서 불성립*
