# IR-O4O-DRUG-DESCRIPTION-DOCUMENT-ARCHITECTURE-V1

작성일: 2026-07-08

문서 성격: **Information Request (IR)** — 문서 체계(Architecture) 결정

목적:
O4O 의약품 소비자 설명서 제작과 관련된 **문서 체계를 장기 운영 가능한 구조로 재정의**한다.

이번 IR은 규칙을 새로 만드는 문서가 **아니다**. `WO-O4O-DRUG-DESCRIPTION-RULES-CONSOLIDATION-V1`(CHECK: `CHECK-O4O-DRUG-DESCRIPTION-RULES-CONSOLIDATION-V1`, 규칙 62건 추출)에서 조사된 규칙을 **어떤 문서에 어떻게 배치할 것인지**를 결정한다.

- DB write 없음 · 코드 변경 없음 · 설명서 작성 없음
- **문서 구조 설계만** 수행한다.

선행: `CHECK-O4O-DRUG-DESCRIPTION-RULES-CONSOLIDATION-V1` (규칙 지도 · KEEP/MERGE/REMOVE/MOVE/NEW)
후속: `WO-O4O-DRUG-DESCRIPTION-STANDARD-DOCUMENT-APPLY-V1` (본 IR 구조를 실제 저장소에 반영)

---

# 1. 배경

현재 설명서 관련 규칙은 Guide / WO / CHECK / IR / Template / STANDARD / CLAUDE.md / MEMORY.md 등 여러 문서에 분산되어 있다. (규칙 통합 CHECK 실측: 설명서 관련 ~119 문서, 규칙 62건, 24건이 2개 이상 문서에 중복 — 최다 `ATC≠route`가 7개 문서.)

이번 IR의 목적은 **문서의 역할을 명확히 분리**하여 중복 규칙을 제거하고, 향후 모든 Batch가 동일한 기준을 사용하도록 하는 것이다.

---

# 2. 목표 (확정 대상)

문서 계층 · 문서 역할 · 문서 참조 관계 · 규칙 저장 위치 · 불변 규칙 저장 위치 · 작업 절차 저장 위치 · CHECK 저장 원칙 · WO 최소 작성 원칙 · CLAUDE.md 역할 · MEMORY.md 역할.

---

# 3. 기본 원칙

| 원칙 | 내용 |
|---|---|
| **단일 위치(SSOT)** | 하나의 규칙은 하나의 위치에만 존재한다. 동일 규칙을 Guide/WO/CHECK/CLAUDE에 반복 작성하지 않는다. |
| **CHECK는 규칙을 설명하지 않는다** | CHECK는 무엇을 적용했는지·검증했는지·결과만 기록한다. |
| **WO는 작업 차이만 기술한다** | 공통 규칙은 STANDARD를 참조한다. |
| **Guide는 규칙의 원본(SoT)이다** | 설명서 작성 규칙은 Guide만 수정한다. |
| **CLAUDE.md는 작업 진입점이다** | 규칙을 복사하지 않고 Guide를 참조하도록 안내만 한다. |
| **MEMORY.md는 불변식만 기록한다** | 프로젝트가 진행되어도 변하지 않는 원칙만 둔다. Batch 진행 상황은 기록하지 않는다. |

---

# 4. 문서 계층

```text
Level 1  CLAUDE.md            (작업 진입점 · 포인터)
   ↓
Level 2  Guide                (규칙 SSOT · Rule Registry 포함)
   ↓
Level 3  WO                   (작업 차이만)
   ↓
Level 4  CHECK                (결과만)
   ↓
         Track Memory         (배치 진행)
```

Rule Registry는 **Guide 계층에서 관리**한다. MEMORY.md는 Level과 별개로 **불변식 스냅샷**만 유지한다.

---

# 5. 권장 Guide 구조

```text
docs/
└── guides/
      └── drug-description/
            DRUG-DESCRIPTION-STANDARD.md        (상위 규칙 · 설계 철학)
            DRUG-DESCRIPTION-WRITING.md         (소비자 설명서 작성 방법)
            DRUG-DESCRIPTION-GROUPING.md        (대표 설명서 공유 기준 · group_key · 정규화 · 복합 · 과병합 예외)
            DRUG-DESCRIPTION-TEMPLATE.md        (설명서 형식 · 필수/선택 블록 · GMP 문구)
            DRUG-DESCRIPTION-PROCESS.md         (작업 절차 · 조사 원칙 · ATC≠route · read-only)
            DRUG-DESCRIPTION-PIPELINE.md        (draft → review → canonical 승격 · 이중게이트)
            DRUG-DESCRIPTION-CHECK-STANDARD.md  (CHECK 작성 규칙)
            RULE-REGISTRY.md                    (모든 규칙 목록 · Rule ID)
```

registry 데이터(배치 관리·상태머신)는 `docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md` 로 **분리 유지**(규칙 문서와 데이터 문서 분리).

---

# 6. 각 문서 역할

| 문서 | 역할 | 흡수 출처 (RULES-CONSOLIDATION 기준) |
|---|---|---|
| **STANDARD** | 가장 상위 규칙 · 설계 철학(분리 4축·canonical 3단계·HOLD_SOURCE 철학) | CANONICAL-STANDARD-V1 |
| **Writing** | 소비자 설명서 작성 방법(문체·§3.5~§3.11·민감약효군·grounding) | WRITING-GUIDE-V1 |
| **Grouping** | 대표 설명서 공유 기준(group_key·정규화 사전·복합·과병합 예외) | REGISTRY §2 + NORM/SEED/COMBO/HIGHRISK |
| **Template** | 설명서 형식(구조·필수/선택 블록·GMP 공통문구·AI 10개조) | WRITING §5·§6 + CANONICAL-STANDARD §12-A |
| **Process** | 작업 절차(WO→조사→grounding→작성→SOURCE GAP→CHECK→commit→push) | STANDARD-V1 (process WO) |
| **Pipeline** | draft 적재 → review → canonical 승격(이중게이트·rollback) | DRAFT-TO-SHARED / DRAFT-DB-APPLY / PARALLEL-BATCH |
| **CHECK Standard** | CHECK 작성 규칙(필수 항목·표·완료 보고) | STANDARD-V1 §10 + PARALLEL-BATCH §7 |
| **Rule Registry** | 모든 규칙 목록(Rule ID) | 62 규칙 (§11) |

---

# 7. CLAUDE.md 역할

| 포함 | 포함하지 않음 |
|---|---|
| 작업 진입(설명서 작업 시작점) | 상세 작성 규칙 |
| 반드시 읽어야 할 Guide 포인터 | 설명서 Template |
| Read-only 조사 원칙(1줄) | Bucket 정의 |
| 불변 원칙 요약(1줄) | Grouping 규칙 |

**현황(실측)**: CLAUDE.md에 설명서 규칙 참조 **0건** → "상세 규칙 문서 목록"에 drug-description 표준 1행 + 불변 1행만 추가.

---

# 8. MEMORY.md 역할

Memory는 **변하지 않는 규칙만** 유지한다. Batch 결과는 기록하지 않는다.

```text
- ATC는 후보 검색용이다 (설명서 그룹핑 기준 아님)
- Route가 다르면 공유하지 않는다
- 제형이 다르면 공유하지 않는다
- 대표 설명서를 우선 수정한다
- 신규 설명서는 공유 불가능한 경우에만 생성한다
- grounding 없으면 추정하지 말고 HOLD_SOURCE
- 설명서 작업은 read-only, draft/SPD/canonical은 승인·이중게이트 후에만
```

Batch 진행 상세는 track memory 파일(`wo-drug-otc-description-nonoral-track` 등)로 유지하고, MEMORY.md에는 포인터 1행만.

---

# 9. WO 역할

WO는 공통 규칙을 다시 쓰지 않는다. 다음만 작성한다:

```text
대상 · 제외 대상 · Bucket · 조사 키워드 · 필수 주의문구 · 우선순위 · 후속 WO
```

나머지는 STANDARD(PROCESS)를 참조.

---

# 10. CHECK 역할

CHECK에는 **결과만** 기록하고 규칙은 반복하지 않는다. 필수 항목:

```text
후보 수 · 대표 설명서 · Grounding · HOLD · EXCLUDE · 적용 ProductMaster 수 · DB write · Commit · Push
```

---

# 11. Rule Registry

모든 규칙은 **Rule ID**로 관리한다. Registry는 Guide의 일부이며 다른 문서는 **Rule ID만 참조**한다.

```text
R-001  소비자 중심 · 목적 우선순위
R-002  MFDS 허가사항 우선
R-003  ATC는 후보 검색용 (그룹핑 기준 아님)
R-016  공유기준 = 성분+함량+제형+경로+효능/용법 동일
R-020  제형/투여경로 다르면 별도
R-034  과병합 예외 (인공눈물 S01XA20 · 생균 A07FA)
R-035  SOURCE GAP 정의 4조건 AND
R-038  HOLD_SOURCE = 안전 판단 (group_key 세분화 금지)
R-047  draft 적재 = product_candidate_description_drafts · needs_review 고정
R-049  SPD 승격 = needs_review로만 · master당 canonical 1개 불변
R-052  registry = 문서(DB 아님) · 상태변경 중앙 전용
...    (RULES-CONSOLIDATION-V1 §4 의 R1~R62 전량 등재)
```

- Rule ID 체계는 `CHECK-O4O-DRUG-DESCRIPTION-RULES-CONSOLIDATION-V1 §4`의 R1~R62 를 정본으로 하여 `R-0NN`로 승격한다.
- 각 Rule 엔트리: `Rule ID · 요지 · SSOT 문서(§) · 상태(active/superseded)`.
- 신규/변경 규칙은 Rule Registry에 ID를 부여하고 해당 Guide 본문을 수정한다.

---

# 12. 참조 관계

```text
CLAUDE.md ──▶ Guide(drug-description/*) ──▶ WO ──▶ CHECK ──▶ Track Memory
                     │
                     └── Rule Registry (Guide 내부 관리, 모든 문서는 Rule ID만 참조)
```

---

# 13. 장기 운영 원칙

- 새 규칙이 생기면 **CHECK에 추가하지 않고 Guide를 수정**한다(+ Rule Registry에 ID 등재).
- WO는 Guide를 참조한다.
- CHECK는 결과만 기록한다.
- 규칙 변경 시 **Guide 한 곳만 수정**하면 전체 프로젝트에 반영된다.

---

# 14. 확장 계층 — 다중 제품군 (권장 결정)

의약품에서 검증된 이 문서 체계는 **의료기기·의약외품·건강기능식품**도 동일하게 사용할 가능성이 높다. 따라서 문서 구조 자체를 제품군 공통으로 재사용하도록, 공통 계층(`common/`)과 제품군별 계층을 분리한다.

```text
docs/
└── guides/
      ├── common/
      │     DOCUMENT-ARCHITECTURE.md      (본 IR이 정한 문서 체계 원칙 — 제품군 공통)
      │     CHECK-STANDARD.md             (CHECK 작성 규칙 — 제품군 공통)
      │     PROCESS.md                    (작업 절차 골격 — 제품군 공통, 세부는 제품군이 override)
      ├── drug-description/               (의약품 — 본 IR §5 구조)
      │     DRUG-DESCRIPTION-STANDARD.md
      │     DRUG-DESCRIPTION-WRITING.md
      │     DRUG-DESCRIPTION-GROUPING.md
      │     DRUG-DESCRIPTION-TEMPLATE.md
      │     DRUG-DESCRIPTION-PIPELINE.md
      │     RULE-REGISTRY.md
      ├── medical-device-description/     (의료기기 — 후속)
      ├── quasi-drug-description/          (의약외품 — 후속)
      └── health-functional-food/         (건강기능식품 — 후속)
```

**분담 원칙:**
- `common/` = 문서 체계·CHECK 규격·작업 절차 골격(제품군 불변).
- 제품군별 폴더 = 그 제품군 고유의 작성/그룹핑/템플릿/파이프라인 규칙 + 자체 Rule Registry.
- 의약품(drug-description)이 **레퍼런스 구현**이며, 검증된 운영 방식을 다른 제품군이 상속·override 한다.

> 결정: 초기 APPLY 범위는 **의약품 우선**(drug-description + common 골격). 의료기기·의약외품·건기식 폴더는 스캐폴드만 두거나 후속 IR로 분리한다(과도한 선행 생성 금지).

---

# 15. 변경 없음 확인

- DB write 0 · 코드 변경 0 · 설명서 작성 0 · 기존 규칙 문서 무수정
- 본 IR은 **구조 결정 문서**이며, 실제 문서 재배치·생성은 후속 APPLY-V1에서 수행
- 변경 파일: 본 IR 1건(신규 폴더 `docs/guides/drug-description/` 부트스트랩)

---

# 16. 후속 WO

`WO-O4O-DRUG-DESCRIPTION-STANDARD-DOCUMENT-APPLY-V1` — 본 IR에서 확정한 구조를 실제 저장소에 반영:

```text
Guide 재배치 (CS/WG/RG/STANDARD → drug-description/*)
Pipeline · Check-Standard 신설
Rule Registry 생성 (R-001~R-062)
common/ 골격 생성 (DOCUMENT-ARCHITECTURE · CHECK-STANDARD)
중복 규칙 제거 (MERGE/REMOVE 8+6)
CLAUDE.md 수정 (포인터 1행 + 불변 1행)
MEMORY.md 수정 (불변식 블록 + track 이관)
문서 참조 관계 정비
```

---

# 기대 효과

- 설명서 규칙의 Source of Truth를 **Guide로 단일화**
- WO와 CHECK의 **중복 제거**
- CLAUDE.md·MEMORY.md **역할 명확화**
- 장기 유지보수성 향상 · 신규 증상군 추가 시 **최소 문서 작성**
- 규칙 변경 시 **Guide만 수정**하면 전체 프로젝트에 반영
- 문서 체계를 **의료기기·의약외품·건기식으로 확장** 가능(§14)
