# IR-O4O-CONTENT-AUTHORING-DOCUMENT-ARCHITECTURE-V1

작성일: 2026-07-08

문서 성격: **Information Request (IR)** — 문서 체계(Architecture) 결정

> 본 IR은 `IR-O4O-DRUG-DESCRIPTION-DOCUMENT-ARCHITECTURE-V1`(의약품 설명서 한정)을 **한 단계 상위인 Content Authoring 아키텍처로 일반화**하여 대체한다. 의약품뿐 아니라 의료기기·의약외품·건강기능식품, 그리고 설명서 외 QR·POP·블로그·동영상 대본·태블릿 콘텐츠까지 **동일한 문서 체계**로 운영하기 위함이다.

목적:
O4O **콘텐츠 생성(Content Authoring) 전반**의 문서 체계를 장기 운영 가능한 구조로 재정의한다. 규칙을 새로 만들지 않고, 조사된 규칙(`CHECK-O4O-DRUG-DESCRIPTION-RULES-CONSOLIDATION-V1`, 62건)을 **어떤 문서에 어떻게 배치할 것인지**를 결정하되, 그 배치를 **제품군·콘텐츠 유형 공통으로 재사용 가능한 계층**으로 설계한다.

- DB write 없음 · 코드 변경 없음 · 콘텐츠/설명서 작성 없음 · **문서 구조 설계만** 수행한다.

선행: `CHECK-O4O-DRUG-DESCRIPTION-RULES-CONSOLIDATION-V1` (규칙 지도)
후속: `WO-O4O-CONTENT-DOCUMENT-ARCHITECTURE-APPLY-V1` (본 IR 구조를 실제 저장소에 반영)

---

# 0. 핵심 재정의 (이 IR의 방향 수정)

기존 IR은 **"설명서(Drug Description)" 중심**이었다. 그러나 O4O는:

- **제품군 확장**: 의약품 → 의료기기·의약외품·건강기능식품
- **콘텐츠 유형 확장**: 설명서 → QR 콘텐츠·POP·블로그·동영상 대본·태블릿 콘텐츠

를 같은 방식으로 운영할 예정이다. 따라서 문서 체계를 **"설명서 아키텍처"가 아니라 "Content Authoring 아키텍처"** 로 한 단계 상위에서 설계한다.

의약품 설명서는 이 아키텍처의 **레퍼런스 구현(reference implementation)** 이며, 검증된 운영 방식을 다른 제품군·콘텐츠 유형이 **상속·override** 한다.

---

# 1. 문서의 4가지 역할 (혼동 방지 — 최상위 정의)

| 문서 | 역할 | 한 단어 |
|---|---|---|
| **Guide** | 어떻게 만들 것인가 — 규칙·원칙의 원본(SoT) | **설계** |
| **CHECK** | 무엇을 적용·검증했는가 — 배치 실행의 결과·감사 근거 | **실행 결과** |
| **Registry** | 지금 어느 그룹이 어떤 상태인가 — 배치·승격 진행 상태 | **운영 상태** |
| **Memory** | 변하지 않는 결정 — 프로젝트가 진행돼도 불변인 원칙 | **불변 결정** |

이 4역할 분리가 이 아키텍처의 근간이다. 하나의 정보는 자신의 역할 문서에만 존재한다.

---

# 2. 기본 원칙

| 원칙 | 내용 |
|---|---|
| **단일 위치(SSOT)** | 하나의 규칙은 하나의 위치에만. Guide/WO/CHECK/CLAUDE 반복 금지. |
| **CHECK는 규칙을 설명하지 않는다** | 적용·검증·결과만 기록. |
| **WO는 작업 차이만 기술한다** | 공통 규칙은 common/PROCESS를 참조. |
| **Guide는 규칙의 원본(SoT)** | 규칙은 Guide만 수정. |
| **CLAUDE.md는 작업 진입점** | 규칙 복사 금지, Guide 참조 안내만. |
| **MEMORY.md는 불변식만** | Batch 진행 상황 미기록. |
| **공통 우선(common-first)** | 제품군·콘텐츠 유형에 걸쳐 같은 규칙은 `common/`으로 올린다. 제품군 전용만 하위에 둔다. |

---

# 3. 문서 계층

```text
Level 1  CLAUDE.md                 (작업 진입점 · 포인터)
   ↓
Level 2  Guide  (common/ + 제품군별) (규칙 SSOT · Rule Registry 포함)
   ↓
Level 3  WO                        (작업 차이만)
   ↓
Level 4  CHECK                     (결과만 · 감사)
   ↓
         Registry (운영 상태) · Track Memory (배치 진행)

MEMORY.md = Level과 별개, 불변식 스냅샷
```

---

# 4. 권장 Guide 구조 (일반화)

```text
docs/
└── guides/
      ├── common/                              ← 제품군·콘텐츠 유형 불변
      │     DOCUMENT-ARCHITECTURE.md           (본 IR이 정한 문서 체계 원칙)
      │     WORKFLOW.md                        (작성→검수→승인→canonical→배포: 절차+승격 통합)
      │     CONTENT-CHECK-STANDARD.md          (CHECK 작성 규칙)
      │     CONTENT-RULE-REGISTRY.md           (CR-NNN 공통 규칙)
      │
      ├── content-authoring/                   ← 콘텐츠 유형 공통(설명서/QR/POP/블로그/동영상/태블릿)
      │     CONTENT-AUTHORING-PRINCIPLES.md    (소비자 중심·원문 우선·과장 금지·grounding 필수)
      │
      ├── ai/                                  ← AI 계층 (제품군·콘텐츠 유형과 독립)
      │     AI-PROMPT-STANDARD.md              (프롬프트 표준)
      │     AI-GROUNDING.md                    (근거 주입·원문 결합)
      │     AI-REVIEW.md                       (AI 검수·자기검증)
      │     AI-SAFETY.md                       (안전·금지·환각 방지)
      │     AI-RULE-REGISTRY.md                (AR-NNN AI 전용 규칙)
      │
      ├── drug/                                ← 의약품 전용 (레퍼런스 구현)
      │     DRUG-WRITING.md                    (소비자 설명서 작성 방법)
      │     DRUG-GROUPING.md                   (대표 공유 기준·group_key·정규화·복합·과병합 예외)
      │     DRUG-TEMPLATE.md                   (설명서 형식·필수/선택 블록·GMP 문구)
      │     DRUG-RULE-REGISTRY.md              (DR-NNN 의약품 전용 규칙)
      │
      ├── medical-device/                      ← 의료기기 (후속)
      ├── quasi-drug/                          ← 의약외품 (후속)
      └── health-functional-food/              ← 건강기능식품 (후속)

docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md   ← 운영 상태 데이터(배치·상태머신), 규칙 문서와 분리 유지
```

**무엇이 어디로 가는가:**

| 항목 | 위치 | 이유 |
|---|---|---|
| **Workflow** (작성→검수→승인→canonical→배포) | **common/** | 절차(Process)와 승격(Pipeline)은 겹치므로 단일 WORKFLOW로 통합, 전 제품군 동일 |
| CHECK Standard | **common/** | CHECK 형식은 제품군 무관 |
| 공통 작성 원칙(소비자 중심·원문 우선·과장 금지·grounding) | **content-authoring/** | 콘텐츠 유형 공통 |
| **AI 규칙(프롬프트·grounding·검수·안전)** | **ai/** | 제품군·콘텐츠 유형과 독립, AI 종류별 공통 |
| Writing / Grouping / Template | **drug/** | 의약품 전용(성분·함량·제형·ATC) |
| STANDARD(설계 철학) | drug/ 또는 content-authoring/로 분할 | 공통 철학은 위로, 의약품 분리 4축은 drug/ |

의약품에 **고유하게 남는 것은 Writing · Grouping · Template + DR Registry** 정도이며, 나머지는 대부분 공통으로 상승한다.

## 4-1. WORKFLOW 통합 (Process + Pipeline)

기존의 `CONTENT-PROCESS`(작업 절차)와 `CONTENT-PIPELINE`(draft→review→canonical 승격)은 내용이 상당히 겹친다(둘 다 "만들어서 검수·승인·반영"의 단계를 서술). 이를 단일 `common/WORKFLOW.md` 로 통합하여 하나의 흐름으로 설명한다:

```text
작성 → 검수 → 승인 → canonical → 배포
(draft) (review) (approve) (promote) (publish)
```

- 앞단(작성·검수)은 기존 Process, 뒷단(승인·canonical·배포)은 기존 Pipeline에 해당하며, 이중게이트·rollback·중앙 승인은 WORKFLOW의 승격 단계 규칙으로 흡수한다.

## 4-2. AI 계층 (`ai/`)

AI 규칙은 **제품군과도 다르고 콘텐츠 유형과도 다른** 독립 축이다(콘텐츠 생성 AI·번역 AI·요약 AI·분류 AI·검수 AI 등이 계속 늘어남). 따라서 `guides/ai/` 를 별도 계층으로 둔다:

| 문서 | 역할 |
|---|---|
| `AI-PROMPT-STANDARD.md` | 프롬프트 표준(구조·역할·출력 형식) |
| `AI-GROUNDING.md` | 근거 주입·원문 결합(창작 금지의 AI 실행 규칙) |
| `AI-REVIEW.md` | AI 검수·자기검증·교차검증 |
| `AI-SAFETY.md` | 안전·금지·환각 방지·민감정보 |
| `AI-RULE-REGISTRY.md` | AR-NNN AI 전용 규칙 |

AI 계층은 common/content-authoring/제품군 어디에도 종속되지 않고, 각 작업이 필요 시 AR 규칙을 참조한다.

---

# 5. Rule Registry — 3계층 (CR / DR / AR)

규칙을 **콘텐츠 공통(CR)** · **의약품 전용(DR)** · **AI 전용(AR)** 으로 분리한다. 다른 문서는 **Rule ID만 참조**한다.

## 5-1. Content Rule Registry (CR — common/CONTENT-RULE-REGISTRY.md)

```text
CR-001  소비자 중심 · 목적 우선순위(선택>안전>상담>정보)
CR-002  공식 원문(허가사항·e약은요 등) 우선 — 기억·AI·인터넷·홍보 열위
CR-003  과장·우월성 단정 금지
CR-004  Grounding 필수 — 원문 근거 없으면 확장·창작 금지
CR-005  소비자 오해·혼동 방지 (사용 맥락 다르면 분리)
CR-006  안전성 안내 필수 (전문가/진료 연결 기준)
CR-007  원천 부재 시 추정 금지 → HOLD (SOURCE GAP 일반형)
CR-008  작업은 read-only 조사, DB 반영은 승인·이중게이트 후에만
CR-009  Pipeline: draft → review → canonical, canonical 승격은 항상 별도 승인
CR-010  Registry = 문서(운영 상태), 상태변경 중앙 전용
CR-011  CHECK = 결과만 기록(규칙 미반복)
```

## 5-2. Drug Rule Registry (DR — drug/DRUG-RULE-REGISTRY.md)

```text
DR-001  ATC는 후보 검색용 (설명서 그룹핑 기준 아님)
DR-002  Route가 다르면 공유 금지
DR-003  제형이 다르면 공유 금지
DR-004  공유기준 = 성분 + 함량 + 제형 + 투여경로 + 허가 효능/용법 동일
DR-005  함량이 OTC/RX·용법을 가르면 분리 (저함량 OTC 한정)
DR-006  복합제 탐지 = ATC 조합코드 (name 키워드 게이트 금지)
DR-007  과병합 예외 = 인공눈물 S01XA20 · 정장 생균 A07FA (성분별 분리)
DR-008  민감 약효군 기본값 = 약사 검토 강화
DR-009  route별 "사용 안내" 템플릿 (복용→사용, 좌제/질정 경구 금지)
DR-010  group_key = drug_otc::{single|combo}::{route}::{ingredient}::{strength}::{form}
```

## 5-3. AI Rule Registry (AR — ai/AI-RULE-REGISTRY.md)

```text
AR-001  프롬프트는 역할·입력·출력 형식을 명시한다
AR-002  AI는 원문 grounding 없이 성분·효능·수치를 생성하지 않는다 (창작 0)
AR-003  AI 출력은 검수 단계를 거친다 (자기검증 + 교차검증)
AR-004  환각·과장·민감정보 노출 금지
AR-005  O4O는 소비자 설명서 초안을 외부 LLM으로 자동 생성하지 않는다 (편집 보조만)
```

- 정본: `CHECK-O4O-DRUG-DESCRIPTION-RULES-CONSOLIDATION-V1 §4`의 R1~R62. APPLY 시 **각 규칙을 CR/DR/AR로 분류**하여 등재(공통성 판단 = 다른 제품군·콘텐츠 유형·AI에도 성립하는가).
- 각 엔트리: `Rule ID · 요지 · SSOT 문서(§) · 상태(active/superseded)`.
- 신규/변경 규칙: 공통이면 CR, 제품군 전용이면 DR, AI 전용이면 AR로 ID 부여 + 해당 Guide 본문 수정.

---

# 6. CLAUDE.md 역할

| 포함 | 포함하지 않음 |
|---|---|
| 작업 진입(콘텐츠 작업 시작점) | 상세 작성 규칙 |
| 반드시 읽어야 할 Guide 포인터(common + 제품군) | Template · Bucket · Grouping |
| Read-only·이중게이트 원칙(1줄) | Rule 본문 |
| 불변 원칙 요약(1줄) | |

**현황(실측)**: CLAUDE.md에 콘텐츠/설명서 규칙 참조 **0건** → "상세 규칙 문서 목록"에 `guides/common/DOCUMENT-ARCHITECTURE` 1행 + 불변 1행만 추가.

---

# 7. MEMORY.md 역할

**변하지 않는 규칙(불변 결정)만** 유지. Batch 결과 미기록.

```text
- ATC는 후보 검색용이다 (그룹핑 기준 아님)
- Route/제형이 다르면 공유하지 않는다
- 대표 콘텐츠를 우선 수정한다 (신규는 공유 불가할 때만 생성)
- Grounding 없으면 추정하지 말고 HOLD
- 콘텐츠 작업은 read-only, draft/승격은 승인·이중게이트 후에만
- Guide=설계 / CHECK=실행결과 / Registry=운영상태 / Memory=불변결정
```

Batch 진행 상세는 track memory로 유지, MEMORY.md는 포인터 1행만.

---

# 8. WO 역할 · CHECK 역할

**WO** — 공통 규칙 미기술, 다음만: `대상 · 제외 대상 · Bucket · 조사 키워드 · 필수 주의문구 · 우선순위 · 후속 WO`. 나머지는 common/PROCESS 참조.

**CHECK** — 결과만: `후보 수 · 대표 콘텐츠 · Grounding · HOLD · EXCLUDE · 적용 대상 수 · DB write · Commit · Push`.

---

# 9. content-authoring/ 계층 (콘텐츠 유형 공통)

설명서 외에도 QR·POP·블로그·동영상 대본·태블릿 콘텐츠가 같은 원칙(소비자 중심·원문 우선·과장 금지·grounding 필수·HOLD 규칙)을 공유한다. 이 공통 작성 원칙을 `content-authoring/CONTENT-AUTHORING-PRINCIPLES.md`에 두고, 각 콘텐츠 유형은 여기에 자신의 형식·채널 특성만 더한다.

> 초기 APPLY 범위는 **의약품 설명서 우선**(common 골격 + content-authoring 원칙 + drug/*). QR/POP/블로그/동영상, 의료기기·의약외품·건기식은 스캐폴드만 두거나 후속 IR로 분리(과도한 선행 생성 금지).

---

# 10. 참조 관계

```text
CLAUDE.md ─▶ Guide(common/* · content-authoring/* · ai/* · drug/*) ─▶ WO ─▶ CHECK ─▶ Registry(운영상태) · Track Memory
                        │
                        └── Rule Registry: CR(common) · DR(drug) · AR(ai) — 모든 문서는 Rule ID만 참조
```

---

# 11. 장기 운영 원칙

- 새 규칙 → CHECK가 아니라 Guide 수정 + Rule Registry(CR/DR) ID 등재.
- 규칙이 공통이면 CR(common), 제품군 전용이면 DR(drug 등).
- 규칙 변경 시 **Guide 한 곳만 수정**하면 전체 반영.
- 새 제품군(의료기기 등) 추가 = common 상속 + 자체 Writing/Grouping/Template + 자체 Rule Registry만 작성.

---

# 12. 변경 없음 확인

- DB write 0 · 코드 변경 0 · 콘텐츠 작성 0 · 기존 규칙 문서 무수정
- 본 IR은 **구조 결정 문서**, 실제 재배치·생성은 후속 APPLY에서 수행
- 변경 파일: 본 IR 1건 + 기존 drug-description IR 대체(상위 일반화)

---

# 13. 후속 WO (개명)

기존 `WO-O4O-DRUG-DESCRIPTION-STANDARD-DOCUMENT-APPLY-V1` 은 "문서 적용"이 아니라 **문서 체계 재구성**이므로 다음으로 개명한다:

**`WO-O4O-CONTENT-DOCUMENT-ARCHITECTURE-APPLY-V1`**

이 WO에서 한 번에 수행:

```text
common/ 생성 (DOCUMENT-ARCHITECTURE · WORKFLOW · CONTENT-CHECK-STANDARD · CONTENT-RULE-REGISTRY)
content-authoring/ 생성 (CONTENT-AUTHORING-PRINCIPLES)
ai/ 생성 (AI-PROMPT-STANDARD · AI-GROUNDING · AI-REVIEW · AI-SAFETY · AI-RULE-REGISTRY)
drug/ 정리 (DRUG-WRITING · DRUG-GROUPING · DRUG-TEMPLATE · DRUG-RULE-REGISTRY)
Rule Registry 생성 (R1~R62 → CR/DR/AR 분류)
CLAUDE.md 수정 (포인터 1행 + 불변 1행)
MEMORY.md 수정 (불변식 블록 + track 이관)
문서 이동 · 참조 변경 · 중복 규칙 제거(MERGE/REMOVE)
```

---

# 기대 효과

- 콘텐츠 규칙의 Source of Truth를 **Guide로 단일화**, 4역할(설계/실행결과/운영상태/불변결정) 명확화
- WO·CHECK 중복 제거, CLAUDE.md·MEMORY.md 역할 명확화
- **의료기기·의약외품·건기식 + QR·POP·블로그·동영상**까지 동일 문서 체계로 확장
- Process/Pipeline을 **WORKFLOW**로 통합해 중복 서술 제거, **AI 계층(`ai/`)** 분리로 AI 종류 확장 대비
- Rule Registry 3계층(CR/DR/AR)으로 공통·제품군·AI 규칙을 독립 관리
- 공통 규칙은 `common/` 한 곳 수정으로 전 제품군·전 콘텐츠 유형에 반영
- 신규 제품군/콘텐츠 유형/AI 추가 시 최소 문서 작성(common 상속)
