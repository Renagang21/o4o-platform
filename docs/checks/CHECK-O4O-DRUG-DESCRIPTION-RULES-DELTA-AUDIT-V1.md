# CHECK-O4O-DRUG-DESCRIPTION-RULES-DELTA-AUDIT-V1

Status: DONE — read-only 증분 감사 · DB write 0 · 코드 변경 0 (2026-07-08)
WO: `WO-O4O-DRUG-DESCRIPTION-RULES-DELTA-AUDIT-V1`

이번 CHECK는 `RULES-CONSOLIDATION-V1`(R1~R62) **이후** 확정된 규칙을 조사하여 현재 CR/DR/AR Registry와 대조한 결과다. **규칙을 창작하지 않고**, 후속 작업에서 실제 확정된 규칙만 추출·분류했다. Registry 직접 수정·Guide 이동·삭제는 하지 않았다(감사 전용).

---

## 1. 조사 범위

| 유형 | 문서 | 조사 |
|---|---|---|
| 아키텍처 IR | IR-O4O-CONTENT-AUTHORING-DOCUMENT-ARCHITECTURE-V1 | 정독 |
| APPLY CHECK | CHECK-O4O-CONTENT-DOCUMENT-ARCHITECTURE-APPLY-V1 | 정독 |
| Consolidation CHECK | CHECK-O4O-DRUG-DESCRIPTION-RULES-CONSOLIDATION-V1 | 대조 기준 |
| Batch CHECK | RHINITIS-ALLERGY(+보강) · ORAL-THROAT | 정독 |
| 신규 Guide | common/*(5) · content-authoring/* · ai/*(5) · products/drug/*(5) · scaffolds | 대조 |
| Registry | CR(14) · DR(17) · AR(6) | 대조 기준 |
| 진입/헌법 | CLAUDE.md · MEMORY(auto) · track memory | 확인 |

**조사 문서 수**: 약 **28** (신규 guide 23 + IR/APPLY/RHINITIS/ORAL-THROAT/CONSOLIDATION CHECK 5). 대조 registry 3.

> 참고: WO §2가 열거한 `IR-O4O-DRUG-DESCRIPTION-DOCUMENT-ARCHITECTURE-V1`·`docs/guides/drug-description/`는 **일반화로 대체·제거됨**(현행 = `IR-O4O-CONTENT-AUTHORING-...` + `guides/common,products/drug`). 감사 대상을 현행 문서로 정정.

## 2. Delta 표

| delta_id | candidate_rule | source_doc | current_registry | classification | proposed_action | note |
|---|---|---|---|---|---|---|
| **D-001** | IR=역사(불변) / DOCUMENT-ARCHITECTURE=운영 | IR §1-1 · APPLY CHECK · ARCH §1 | 없음(prose) | **NEW_RULE** | CR 신규 | 문서 운영 핵심 |
| **D-002** | 문서 4역할(Guide=설계·CHECK=실행·Registry=운영·Memory=불변) | ARCH §1 | 없음(prose) | **NEW_RULE** | CR 신규 | 혼동 방지 근간 |
| **D-003** | DOCUMENT-INDEX = 단일 진입점 | DOCUMENT-INDEX · CLAUDE.md | 없음 | **NEW_RULE** | CR 신규 | 온보딩 단일 지도 |
| **D-004** | 5축(common/content-authoring/ai/products/services) | ARCH §2 | 없음(구조) | **ARCHIVE** | ARCH가 구조 SSOT | 번호 규칙 불필요 |
| **D-005** | products·services 직교 | IR §14 · ARCH §2 | 없음 | **NEW_RULE** | CR 신규 | 서비스≠제품군 |
| **D-006** | service 문서는 Rule Registry 없음(Rule ID 참조만) | IR §4-3 · services/*/README | 없음 | **NEW_RULE** | CR 신규 | 등록 위치 규율 |
| **D-007** | 신규 규칙은 CHECK 아니라 Guide/Registry에 반영 | ARCH §6 · CR-011 | CR-011(부분) | **MERGE** | CR-011 보강 | 이미 근접 |
| **D-008** | 기존 Guide 삭제 금지·운영 이관 헤더로 처리 | APPLY CHECK §2 | 없음 | **NEW_RULE** | CR 신규(doc-ops) | 참조 보호 |
| **D-009** | 병렬 작업 보호 — force rewrite 금지(commit 오염 있어도) | APPLY CHECK §7 | 없음 | **NEW_RULE** | CR 신규(doc-ops) | 히스토리 안전 |
| **D-010** | 대량 삭제 금지 | APPLY CHECK §2 | 없음 | **MERGE** | D-008에 병합 | 동일 doc-ops |
| **D-011** | WORKFLOW: 작성→검토→승인→배포 | WORKFLOW | CR-009 | **EXISTING** | — | |
| **D-012** | Process+Pipeline → WORKFLOW 통합 | WORKFLOW | CR-009(구조) | **ARCHIVE** | 구조, ARCH 보존 | |
| **D-013** | canonical·이중게이트·rollback=승인 세부 | WORKFLOW §4-5 | CR-008·CR-009 | **EXISTING** | — | |
| **D-014** | AI를 제품군·콘텐츠 유형에서 분리(축) | ai/* · ARCH §2 | 없음(구조) | **ARCHIVE** | ARCH 구조 | |
| **D-015** | AI grounding 보조·허가사항 창작 금지 | AI-GROUNDING | AR-002 | **EXISTING** | — | |
| **D-016** | 외부 LLM 무제한 초안 자동생성 금지 | AI-SAFETY | AR-005 | **EXISTING** | — | |
| **D-017** | AI = 편집·검수·번역 보조로 제한 | AI-SAFETY | AR-005 | **MERGE** | AR-005 보강 | 표현 확장 |
| **D-018** | AI Safety/Review/Grounding 독립 Guide | ai/* | AR-003·004 | **EXISTING** | — | |
| **D-019** | 대표 설명서 목록을 CHECK에 남긴다 | STANDARD · CHECK-STANDARD §1 | CONTENT-CHECK-STANDARD | **EXISTING** | — | |
| **D-020** | 적용 ProductMaster 수를 CHECK에 남긴다 | STANDARD · APPLY | CONTENT-CHECK-STANDARD §1 | **UPDATE** | CHECK-STANDARD 문구 강화 | "적용 대상 수"를 ProductMaster 명시 |
| **D-021** | ATC 후보검색 + 오탐 카탈로그(R01B·R02A·S01) | RHINITIS · ORAL-THROAT CHECK | DR-001 | **UPDATE** | DR-001 note에 오탐 사례 추가 | 실증 강화 |
| **D-022** | 성분별 대표 ↔ 세대/계열 대표는 목적 다르면 공존 가능 | RHINITIS 보강 §14 | 없음 | **NEW_RULE** | DR 신규 | 과병합/과분할 균형 |
| **D-023** | canonical 승격 시 성분·함량 group_key 분할 근거를 남긴다 | RHINITIS 보강(펙소페나딘 60/120) | DR-005·DR-010(부분) | **UPDATE** | DR-005 보강 | 함량축 분할 추적 |
| **D-024** | spec 첫 토큰 = 용기 용량 ≠ 농도(재확인) | ORAL-THROAT | DR-012 | **EXISTING** | — | |
| **D-025** | 복합제 name 키워드 게이트 금지(재확인) | ORAL-THROAT/CONSOLIDATION | DR-006 | **EXISTING** | — | |

## 3. 분류 집계

| 분류 | 수 | delta_id |
|---|---:|---|
| **EXISTING** | 8 | D-011·013·015·016·018·019·024·025 |
| **NEW_RULE** | 7 | D-001·002·003·005·006·008·009·022 (doc-ops·아키텍처 CR + DR 1) → 실제 8건이나 D-010 MERGE 반영 시 7 신규 ID |
| **MERGE** | 3 | D-007(→CR-011)·D-010(→D-008)·D-017(→AR-005) |
| **UPDATE** | 3 | D-020(CHECK-STANDARD)·D-021(DR-001)·D-023(DR-005) |
| **ARCHIVE** | 3 | D-004·012·014 (구조는 ARCHITECTURE가 SSOT, 번호 규칙 불필요) |
| **CONFLICT** | 0 | — |

- **추가 후보 규칙 수**: 25 (D-001~D-025)
- 대다수(Workflow·AI·batch-CHECK)는 APPLY에서 이미 CR/DR/AR로 실체화되어 **EXISTING/ARCHIVE**. 실질 gap은 **문서 아키텍처 메타규칙(CR 신규 6)** 과 **의약품 배치 경험칙(DR 신규 1 + UPDATE 2)** 에 집중.

## 4. Rule Registry 반영 필요 항목 (제안 — 본 WO는 미반영)

**CR 신규 (common/CONTENT-RULE-REGISTRY, CR-015~):**
- CR-015 IR=역사 / DOCUMENT-ARCHITECTURE=운영 (D-001)
- CR-016 문서 4역할 분리 (D-002)
- CR-017 DOCUMENT-INDEX 단일 진입점 (D-003)
- CR-018 products·services 직교 + service는 Registry 없이 Rule ID 참조 (D-005·D-006)
- CR-019 문서 운영: 대량 삭제 금지·기존 문서 운영 이관 헤더·force rewrite 금지(병렬 보호) (D-008·D-010·D-009)

**CR 보강:** CR-011에 "신규 규칙은 CHECK 아닌 Guide/Registry에 등재" 명문 추가 (D-007).

**DR 신규 (products/drug/DRUG-RULE-REGISTRY, DR-018~):**
- DR-018 성분별 대표 ↔ 세대/계열 대표 공존 조건(목적·축 다르면 공존) (D-022)

**DR 보강:**
- DR-001 note에 ATC 오탐 카탈로그(R01B·R02A 경구·S01 눈영양 캡슐) (D-021)
- DR-005에 canonical 승격 시 함량축 group_key 분할 근거 기록 (D-023)

**AR 보강:** AR-005에 "편집·검수·번역 보조로 제한" 문구 (D-017).

## 5. Guide 보강 필요 항목

- `common/CONTENT-CHECK-STANDARD.md`: "적용 대상 수"를 **적용 ProductMaster 수(총/grounded)** 로 명시 (D-020).
- `products/drug/DRUG-GROUPING.md`: DR-001 오탐 카탈로그 · DR-005 함량 분할 근거 반영 (D-021·D-023).
- `products/drug/DRUG-STANDARD.md` 또는 DRUG-GROUPING: 성분별·세대별 대표 공존 규칙 (D-022).

## 6. 변경 필요 여부

| 대상 | 필요? | 비고 |
|---|---|---|
| Rule Registry 보강 | **필요** | CR +5신규/1보강 · DR +1신규/2보강 · AR 1보강 (후속 APPLY) |
| Guide 보강 | **필요(소규모)** | CHECK-STANDARD·DRUG-GROUPING 문구 |
| CLAUDE.md 변경 | **불필요** | 진입점 포인터로 충분(규칙 본문 미포함 원칙) |
| MEMORY 변경 | **불필요** | 불변식 블록에 이미 반영(경로/제형·ATC·read-only·외부LLM) |
| 후속 APPLY WO | **필요** | `WO-O4O-CONTENT-RULES-DELTA-APPLY-V1` |

## 7. 변경 없음 확인

- **DB write 0** · 코드 변경 0 · Registry 직접 수정 0 · Guide 이동/삭제 0 · CLAUDE/MEMORY 무변경(본 WO 범위)
- 변경 파일: 본 CHECK 1건 + WO 1건(선행) — **문서 감사만**

## 8. 완료 보고

- **조사 문서 수**: ~28 (guide 23 + CHECK 5) + registry 3 대조
- **추가 후보 규칙 수**: **25** (D-001~D-025)
- **EXISTING 8 · NEW_RULE 7(신규 ID) · MERGE 3 · UPDATE 3 · ARCHIVE 3 · CONFLICT 0**
- **Rule Registry 보강 필요**: 예 (CR +6, DR +3, AR +1 — 후속 APPLY)
- **Guide 보강 필요**: 예 (CHECK-STANDARD·DRUG-GROUPING 소규모)
- **CLAUDE.md 변경 필요**: 아니오
- **MEMORY 변경 필요**: 아니오
- **후속 APPLY WO 필요**: 예 (`WO-O4O-CONTENT-RULES-DELTA-APPLY-V1`)
- **DB write 0**: ✅
- **commit / push**: 아래

## 9. 후속 WO

`WO-O4O-CONTENT-RULES-DELTA-APPLY-V1` — 본 감사의 NEW_RULE(CR-015~019, DR-018)·UPDATE(DR-001/005, CHECK-STANDARD)·MERGE(CR-011, AR-005)를 Registry·Guide에 실제 반영. 기존 문서 삭제 금지, CHECK/WO 역사 보존.
