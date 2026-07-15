# DRUG-RULE-REGISTRY (DR) — 의약품 전용 규칙

상태: Active · V1 (2026-07-08) · 진입: [DOCUMENT-INDEX](../../common/DOCUMENT-INDEX.md)

> 의약품에 **고유한** 규칙(성분·함량·제형·투여경로·ATC·복합제). 공통 규칙은 [CR](../../common/CONTENT-RULE-REGISTRY.md), AI는 [AR](../../ai/AI-RULE-REGISTRY.md).
> 정본 이력: `CHECK-O4O-DRUG-DESCRIPTION-RULES-CONSOLIDATION-V1 §4` (R1~R62). 상세 원문은 [DRUG-WRITING](DRUG-WRITING.md) / [DRUG-GROUPING](DRUG-GROUPING.md) / [DRUG-STANDARD](DRUG-STANDARD.md).

---

| Rule ID | 요지 | SSOT | 상태 |
|---|---|---|---|
| **DR-001** | ATC는 후보 검색용 (설명서 그룹핑 기준 아님, 해부학군은 1차 route 필터). 실증 오탐 사례 = [ATC-FALSE-POSITIVE-CATALOG](knowledge/ATC-FALSE-POSITIVE-CATALOG.md) | DRUG-GROUPING · KB | active |
| **DR-002** | Route가 다르면 공유 금지 | DRUG-GROUPING | active |
| **DR-003** | 제형이 다르면 공유 금지 | DRUG-GROUPING | active |
| **DR-004** | 공유기준 = 성분 + 함량 + 제형 + 투여경로 + 허가 효능/용법 동일 | DRUG-GROUPING | active |
| **DR-005** | 함량이 OTC/RX·용법을 가르면 분리(저함량 OTC 한정). canonical 승격 시 함량축 group_key 분할 근거를 남긴다. 패턴 = [GROUPING-PATTERNS](knowledge/GROUPING-PATTERNS.md) | DRUG-GROUPING · KB | active |
| **DR-006** | 복합제 탐지 = ATC 조합코드(substr(6,2)≥50 or R05X). name 키워드 게이트 금지 | DRUG-GROUPING | active |
| **DR-007** | 과병합 예외 = 인공눈물 S01XA20 · 정장 생균 A07FA (성분별 분리) | DRUG-GROUPING | active |
| **DR-008** | 민감 약효군 기본값 = 약사 검토 강화 | DRUG-WRITING | active |
| **DR-009** | route별 "사용 안내" 템플릿(복용→사용, 좌제/질정 경구 금지) | DRUG-TEMPLATE | active |
| **DR-010** | group_key = `drug_otc::{single|combo}::{route}::{ingredient}::{strength}::{form}` | DRUG-GROUPING | active |
| **DR-011** | 정규화 우선순위(itemSeq>품목코드>주성분명>표기변형 사전>name 파싱) | DRUG-GROUPING | active |
| **DR-012** | spec 첫 토큰 = 용기/병/개수 용량 ≠ 농도. 원문 %·mg/g로 재파싱 | DRUG-GROUPING | active |
| **DR-013** | 노이즈 필터(수출·군납·비매) 후보 1차 배제 | DRUG-GROUPING | active |
| **DR-014** | 복합제 기본 = 약사 검토 강화(자동초안 0), R05X 감기약 = blocked/no_merge | DRUG-GROUPING | active |
| **DR-015** | 대표 분리 4축(투여경로·작용기전·소비자 선택축·안전성) + 함량축 독립 | DRUG-STANDARD | active |
| **DR-016** | canonical 3단계(대표 → 성분 canonical → 제품), 조성 추정 금지 | DRUG-STANDARD | active |
| **DR-017** | 필수 블록(사용 경우→방법→주의→병원 방문→사용 확인 포인트→성분 기준 선택) + GMP 문구 | DRUG-TEMPLATE | active |
| **DR-018** | 성분별 대표 ↔ 세대/계열 대표는 **목적(진입 축)이 다르면 공존**한다. 소비자 진입용 세대/계열 대표(예: "졸림 적은 알레르기약")와 canonical 승격용 성분별 대표(로라타딘·펙소페나딘·세티리진)는 동시에 유효 — 과병합(하나로 뭉갬)도 과분할(불필요 분리)도 아님 | DRUG-STANDARD · DRUG-GROUPING | active |

| **DR-019** | **투여경로를 제형명(`doseForm`)으로 판단·추정하지 않는다.** 제형명은 경로를 구분하지 못하고 값도 불일치한다(실증: 질정·경구정 모두 `doseForm='정'` / 95건 값 = 정 38·tablet 15·캡슐 15·soft_capsule 7·null 6…). **판별 우선순위 = ① `groupKey` route 축(`drug_otc::…::{route}::…`, DR-010) → ② `usageLabel`(복용 안내=경구 / 사용 안내=비경구) → ③ 비경구인 경우에 한해 성분·제목의 명시적 제형 토큰(질정·좌제·점안액…)으로 구체 경로 확정.** 근거 없으면 **추정 대신 `needs_review`**. **본문 키워드 매칭 금지**(오탐 실증: 디오스민 경구정의 "항문검사" → rectal 오분류). 최소 경로값 = `oral·vaginal·topical·ophthalmic·rectal·inhalation·transdermal`. 경로 오판은 DR-002·DR-003 위반과 오투여로 직결 | DRUG-GROUPING · DRUG-TEMPLATE · 파생 = `modules/neture/drug-import/drug-otc-route.ts` · 실증 = `CHECK-O4O-OTC-ROUTE-SIGNAL-ENRICHMENT-V1` | active |

> DR-NNN은 R1~R62 + DELTA-AUDIT 확정분. 신규는 DR-020부터.
> DR-019 는 DR-002/003/009("경로가 **다르면**" 어떻게 하나)가 다루지 않던 "**경로를 무엇으로 판단하나**"를 채운다. 실증 사례·패턴은 [knowledge/](knowledge/)(Rule 아님)에 축적, Registry는 규칙 문장만 유지.
