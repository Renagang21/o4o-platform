# O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2

> **상태**: ACTIVE — O4O AI 업무 비서 · 자동화 **구조 정본** (`CANONICAL-INDEX` §6)
> **작성일**: 2026-10-03 · **개정**: 2026-10-04 §0-1 개인화 원칙(P3) 신설 · §4-4 · §7 · §8-3 · §10 · §19 · §22 정렬 (`WO-O4O-PERSONAL-ASSISTANT-PERSONALIZATION-PRINCIPLE-ALIGNMENT-V1`)
> **근거 WO**: `WO-O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2-CANONICALIZATION` + `WO-O4O-PERSONAL-ASSISTANT-V2-ENVIRONMENT-REFRESH-AND-CANONICALIZATION-UPDATE` (사용자 확정 2026-10-03)
> **근거 IR**: [`IR-…-V2-GAP-CENSUS`](../investigations/IR-O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2-GAP-CENSUS.md) (코드 vs 목표) · [`IR-…-V2-CANONICAL-CONSISTENCY-REVIEW`](../investigations/IR-O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2-CANONICAL-CONSISTENCY-REVIEW.md) (초안 vs 정본) · [`IR-…-V2-ENVIRONMENT-REFRESH`](../investigations/IR-O4O-PERSONAL-ASSISTANT-V2-ENVIRONMENT-REFRESH.md) (환경 기준선)
> **상위 정본**: [`O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1`](O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md) (2026-10-03 부분 개정으로 이 문서와 정합). EVOLUTION = 왜 그렇게 발전해야 하는가 · 이 문서 = 그것을 어떤 구조로 만드는가. 둘이 충돌하면 EVOLUTION 이 우선하며, 충돌은 개정 WO 로 해소한다.
> **하위 정본**: [`O4O-AUTOMATION-EXPERIENCE-MODEL-V1`](O4O-AUTOMATION-EXPERIENCE-MODEL-V1.md) (Experience 개념 모델 · 저장 계약 — 2026-10-03 V2 정합 개정)
> **대체**: [`O4O-AUTOMATION-AGENT-ARCHITECTURE-V1`](O4O-AUTOMATION-AGENT-ARCHITECTURE-V1.md) → SUPERSEDED. V1 의 유효 조항은 §21 승계표로 이 문서에 옮겼다.
> **적용 범위**: O4O 의 모든 AI 업무 비서 · 반복 업무 자동화 — 약국 · 매장 · 공급자 · 운영자. 특정 사이트 · 프로그램 · 모델에 묶이지 않는다.
> **성격**: 구조 원칙. DB 테이블 · API · enum · 구현이 아니다. 이름은 의미를 고정하기 위한 것이며 코드 식별자는 구현 WO 가 정한다.

---

## 0. 두 원칙

> **P1. O4O 의 최상위 제품은 Automation 이 아니라 Personal Work Assistant 다.**
> 사용자의 업무 의도와 상황을 이해하고, 필요한 업무정보와 경험을 기억하며, 업무를 계획 · 수행 · 검증한다. RPA · Computer Use · API · MCP · Skill · Worker · 개별 PC 는 이 비서가 필요에 따라 고르는 하위 실행 수단이다.

> **P2. Assistant 의 기억은 업무 주체에 귀속되고, PC 는 기억의 소유자가 아니라 필요할 때 선택되는 Execution Node 다.**
> 매장 업무의 기억은 organization, 개인 선호 · 교정은 user, 진행 중 업무의 상태는 run 에 속한다. node 에는 실행환경 상태(credential · 로그인 세션 · 현재 화면 · 로컬 파일 경로)만 속한다(§9).

두 원칙은 EVOLUTION 의 세 문장(사용자 행동은 학습 자료 · 업무를 미리 정의하지 않는다 · 완전 자동화가 아닌 시간 절감)을 바꾸지 않는다. 그 원칙이 작동하는 **제품 구조**를 정한다.

### 0-1. 개인화 원칙 — 표준 Workflow 를 만들지 않는다 (2026-10-04 사용자 확정)

> **P3. O4O 는 사용자를 하나의 표준 자동화 프로세스에 맞추지 않는다.**
> 여러 사용자의 Experience 는 다른 사용자에게 **추천 · 후보 · 판단 근거**가 될 수 있지만, 모든 사용자가 따라야 하는 공통 Workflow 나 강제 규칙이 되지 않는다.
> O4O 가 학습하는 목적은 표준 Workflow 를 만드는 것이 아니라, **각 사용자의 Assistant 가 그 사용자의 Experience 와 현재 상황에 맞는 방법을 더 잘 고르게** 하는 것이다.

1. **판단 근거의 자리.** 그 사용자(와 그 매장)의 Experience · Correction 이 그 사용자의 Assistant 가 방법을 고르는 **가장 가까운 근거**다. 다른 사용자들의 반복된 성공은 **Shared Candidate · Knowledge · Evidence** 로만 쓰인다(§10).
2. **처음 쓰는 사용자.** 자기 Experience 가 아직 부족하면 Manual · Shared Candidate · 다른 사용자의 정제된 Experience(Digest) · AI Discovery 를 초기 근거로 쓴다. 이것들은 출발점일 뿐이다. 그 사용자의 Run 에서 다시 검증되며, 쓸수록 그 사용자 · 매장의 Experience 가 근거의 중심이 된다.

   ```text
   처음      Manual · Shared Candidate · Digest · Discovery  → 이 사용자의 Run 에서 검증
   반복      이 사용자의 Experience · Correction 이 쌓인다    → 이 사용자에게 맞는 방법
   이후      이 사용자의 Procedure / Skill                    → Shared 는 참고 · 비교 근거로 남음
   ```

3. **추천 ≠ 강제.** 많이 쓰이거나 반복 검증된 방법은 추천하거나 우선 후보로 고려할 수 있다. 그러나 사용자에게 강제하지 않고, 그 사용자의 검증된 방법 · 교정을 덮어쓰지 않는다. 사용자가 다른 방법을 고르거나 교정하면 그 사용자의 Experience 가 우선한다.
4. **교정은 그 사용자의 것.** User Correction 은 그 사용자(또는 그 매장)의 Task type × Target × Stage 범위에서만 효력을 갖는다. 다른 사용자에게 자동으로 적용되지 않는다. 공유되더라도 동의 · 익명화 · publish 를 거쳐 상대에게 **후보(Knowledge)** 로만 도착한다(§10).
5. **Skill 은 공통 RPA Workflow 가 아니다.** Skill / Procedure 는 Assistant 가 상황에 따라 **고르고 조합하는 재사용 수행 능력**이다(§7). 같은 Task type 에 여러 Skill 이 공존할 수 있고, 사용자 · 매장마다 다른 Skill 을 쓸 수 있다.
6. **Task 소유 ≠ 절차 선택.** Task 의 소유 범위(`USER` / `ORGANIZATION` — §4 · §9)는 그 업무와 기억이 누구에게 속하는가다. 어떤 Procedure 로 수행할지는 별개로, Assistant 가 그 소유 주체의 Experience 와 현재 상황으로 고른다. ORGANIZATION 소유 Task 라고 매장 전원이 하나의 고정 절차를 따라야 하는 것은 아니다.
7. **하나의 Assistant 가 이어진다.** 사용자 · 업무공간(Work Context) · 요청 채널 · 실행 노드가 달라졌다는 이유로 서로 다른 자동화 체계를 만들지 않는다. 같은 사용자의 Assistant 와 그 기억은 여러 공간과 접점에서 지속된다(§3 · §11 · §14). 다르게 처리되는 것은 소유 경계(§9) 와 노드 capability(§11) 뿐이다.

**설계 금지**: 다수 사용자의 성공 경로를 모아 하나의 표준 Workflow 로 만들고 모든 사용자에게 적용하는 설계. "가장 많이 성공한 경로" 는 추천 근거이지 정답이 아니다.

---

## 1. 중심의 구분

| 축 | 중심 | 의미 |
|---|---|---|
| **제품 구조의 중심** | **Assistant** | 사용자는 하나의 비서에게 업무를 맡긴다. 계획 · 기억 · 노드 선택 · 결과 전달은 Assistant 가 한다 |
| **자산의 중심** | **Experience** | 실제로 수행하며 확인된 사실이 쌓여 같은 업무를 점점 싸고 확실하게 만든다(V1 "실행 도구는 손이고, 경험이 자산이다" 승계) |

Assistant 가 Experience 를 대체하지 않는다. Assistant 는 Experience 를 **쓰고 만드는** 주체이고, Experience 는 Assistant 가 시간이 갈수록 나아지는 근거다.

---

## 2. 계층

```text
┌──────────────────────────────────────────────────────────────────────┐
│ L1 Personal Assistant   의도 이해 · 업무 맥락 · 기억 · Task 생성/추적 │  ← 업무 판단
│                          · 결과 전달 · 승인 요청                      │
├──────────────────────────────────────────────────────────────────────┤
│ L2 Task                  업무 인스턴스 · 목표 · 완료 계약 · 상태       │
├──────────────────────────────────────────────────────────────────────┤
│ L3 Skill / Procedure     검증된 Experience 에서 승격된 업무 절차       │
│    Discovery capability  모르는 업무를 푸는 탐색(Strong Discovery)     │
├──────────────────────────────────────────────────────────────────────┤
│ L4 Execution             DOM · UIA · API · WebMCP · Computer Use ·    │  ← 손
│                          RPA · Script — 화면 판단은 여기까지          │
├──────────────────────────────────────────────────────────────────────┤
│ L5 Execution Node        Office PC · Home PC · Cloud Browser · 미래 노드│
└──────────────────────────────────────────────────────────────────────┘
        Experience (가로축) — 모든 계층이 남기고 모든 계층이 참조한다
```

### 2-1. Assistant Planning ≠ Execution Planning

| | Assistant Planning (L1 · L2) | Execution Planning (L3 · L4) |
|---|---|---|
| 묻는 것 | 무슨 업무인가 · 어떤 결과가 필요한가 · 어느 Skill · 어느 Node 인가 · 사용자 승인이 필요한가 · 끝났는가 | 지금 화면에서 다음 행동은 무엇인가 · 이 단계가 성공했는가 |
| 단위 | Task | step · stage |
| 근거 | 업무 맥락 · 기억 · Task type 의 Experience | 현재 관찰 · Skill · Execution Experience |

- 두 판단을 한 planner 출력에 섞지 않는다. 화면 조작 판단이 업무 완료를 선언하거나, 업무 판단이 DOM 후보를 고르지 않는다.
- Execution 이 어긋나면 판단을 Assistant 로 되돌린다(V1 §8-1 "실행 계층은 두뇌가 아니다" 승계).

---

## 3. ONE Assistant

1. **사용자 한 명에게 Assistant 는 하나다.** 채널(O4O Web · Kakao · 외부 AI · Device Agent)과 실행 노드가 달라도 같은 Assistant 가 같은 기억으로 응답한다.
2. 한 사용자는 여러 업무공간(ROLE-WORKSPACE §1)을 가질 수 있다. 그래서 **Task 마다 업무공간과 organization 을 지닌다.** 매장 A 의 업무 기억이 매장 B 의 Task 에 섞이지 않는다(역할 drift 방지 — PHILOSOPHY §7).
3. 서비스별 · 역할별로 Assistant 를 따로 만들지 않는다. 역할 경계는 Task 의 context 와 권한이 정한다.

---

## 4. Task — 1급 객체

### 4-1. Task 와 Task type

| 용어 | 뜻 | 정본 |
|---|---|---|
| **Task** | 업무 **인스턴스** — 이번에 맡긴 일 하나 | 이 문서 |
| **Task type** | 업무 **유형** — 도메인 · 행위 · 대상(문장이 아님). 같은 일을 다르게 말해도 같은 유형 | EXPERIENCE-MODEL §3 의 Task identity |

### 4-2. Task 가 지니는 것 (개념)

`owner(organization · user)` · `업무공간` · `goal(사용자 목적)` · `Task type` · `completion contract` · `status` · `run 들` · `요청 채널` · `실행 노드` · `승인 지점` · `결과 요약`.

### 4-3. 완료 계약

- 완료 계약은 **실행 검증 기준**이다. KPI 가 아니다(EVOLUTION §4 · §22 — 핵심 지표는 업무 완료율이 아니라 시간 절감).
- `USER_COMPLETED`(사용자가 이어서 끝냄) · 부분 완료 · `BLOCKED`(사용자 결정 · 권한 · 정책) 는 **정상 결과**다. 실패로 세지 않는다(EXPERIENCE-MODEL §9).
- 완료는 planner 가 `done` 을 선언해서가 아니라 완료 계약의 확인으로 판정한다. 확인 근거의 등급은 EXPERIENCE-MODEL §9 Outcome 근거를 따른다.

### 4-4. Task type 은 미리 정하지 않는다

- `REPLENISHMENT_REVIEW` · `HEALTHKR_PRODUCT_SEARCH` 같은 이름은 **예시**다. Task type 과 Skill 은 운영자가 미리 정하는 목록이 아니라 **실제 사용 → Experience → 검증 승격(§7 · §8)** 으로 생긴다(EVOLUTION §14 · §15 · EXPERIENCE-MODEL D2).
- Task type 결정 주체: Discovery 가 제안 + alias 누적, 정규화는 공유 단계에서(EXPERIENCE-MODEL D2 유지). 여기서 정규화는 **업무 유형의 이름 · 식별을 맞추는 것**이지 수행 절차를 하나로 통일하는 것이 아니다(§0-1).

---

## 5. Discovery — 모르는 업무를 푸는 하위 capability

### 5-1. 위치

Strong Discovery 는 V1 에서 최상위 진입점이었다. V2 에서는 **Assistant 아래의 Unknown-task Discovery capability** 다 — Assistant 가 "이 업무에 쓸 검증된 Skill 이 없다 / 현재 화면과 맞지 않는다" 고 판단할 때 호출한다. Strong Discovery A~D 구현 자산은 폐기하지 않고 이 위치로 재배치한다(§20).

### 5-2. Strong-first (V1 §2 승계)

1. 새 업무 · 처음 보는 대상 · 불확실한 상황은 **Strong Discovery Agent** 에서 시작한다. 싼 수행자로 먼저 해 보고 실패하면 올리는 순서를 기본으로 하지 않는다.
2. "새로움" 은 Experience 가 판정한다. 표현이 다르다고 새 업무가 되지 않고, 대상 UI 가 바뀌었으면 익숙한 업무라도 불확실 상황이다.
3. **Discovery 비용은 투자다.** 비용 최적화는 경험이 축적된 뒤에 시작한다. **Experience 가 남지 않는 Strong Discovery 실행은 미완성 구현이다.**
4. **등재 목록은 발견의 문이 아니다.** 처음 보는 사이트 · 프로그램이라고 거절하지 않는다. 단 안전 경계(§15)는 처음 보는 대상에도 그대로 적용되며, 무제한 조작을 뜻하지 않는다.

### 5-3. User Convenience First (V1 §2-3 · 2026-10-01 사용자 확정 · 문장 그대로 승계)

> **사용자 편의성과 업무 성공 가능성이 AI 비용보다 우선한다.**

1. Lower-cost 수행자로 충분하다는 **근거**(검증된 Skill · 신뢰할 만한 Experience)가 있으면 그것을 쓴다.
2. 새 업무 · 처음 보는 상황 · 큰 불확실성 · 낮은 Experience 신뢰도 · Skill 과 현재 화면 불일치 → Strong Discovery 가 기본이다.
3. 판단하기 어려우면 Strong 을 쓴다.
4. 금지: 비용을 줄이려고 사용자에게 자세한 prompt · AI 모델 선택 · **자동화 절차의 사전 구조화**를 요구하거나 불필요한 실패를 허용하는 것. O4O Web 의 Skill 관리 화면도 사용자에게 절차 구조화를 요구하는 방향으로 쓰지 않는다.
5. 수행자 선택은 사용자가 아니라 O4O 가 Experience 근거로 한다.

### 5-4. Human-Assisted Discovery (V1 §3 승계 · orphan O1)

1. 확실하지 않으면 **추측하지 말고 묻는다.** 질문은 실패가 아니다.
2. 물을 수 있는 것: 값 · 대상 확인 · 메뉴 위치 · 업무 순서 · 매뉴얼 · 사내 문서 · 화면 캡처 · 로그인 · 권한 상태(로그인 대행은 하지 않는다) · 성공 판정.
3. 사용자의 답 · 교정 · 시연은 Experience 후보다. 사용자 도움이 들어간 성공은 **가장 값진 run** 이다.
4. 재개 시 원래 업무 목표와 진행이 이어진다. 답 하나만 보고 새 업무처럼 다시 시작하지 않는다.
5. **같은 것을 두 번 묻지 않는 것**이 성숙 지표다.
6. **Takeover 는 실패가 아니라 학습 신호다**(EVOLUTION §6 · orphan O2). correction 과 함께 자동화 경계 · 수정 지점으로 남는다.

---

## 6. Experience 계층화

### 6-1. 세 층

| 층 | 담는 것 | 주된 소유 |
|---|---|---|
| **Assistant Experience** | 사용자 · 매장의 업무 방식, 구조화된 도움 · 교정, 선호(Preferred/Avoid), 같은 질문 회피 근거 | organization / user (§9) |
| **Procedural Memory** | Task type × Target × **Stage** 의 업무 절차 — stage(의미 단계) 경로 · 입력 슬롯 · 성공 판정 · 알려진 실패와 복구 | organization / user, 검증 후 Shared(§10) |
| **Execution Experience** | semantic locator · DOM/UIA trace · 실행 수단 · runtime 실패 · 시간 분해 | Procedural Memory 에 종속 · 실행 근거 |

- **stage 는 Procedural Memory, locator · DOM trace 는 Execution Experience** 다. EXPERIENCE-MODEL §6 의 stage 중심 Step(orphan O7)을 그대로 쓴다.
- 교정 · 선호의 축적 단위는 **Task type × Target × Stage** 를 유지한다(EXPERIENCE-MODEL §7-6). 추가 맥락이 필요하면 Stage 를 대체하지 않고 한정 조건으로 붙인다.

### 6-2. 유지되는 원칙

1. **내용이 아니라 구조를 남긴다**(EVOLUTION §7). 이 원칙은 저장 위치(§9)와 무관하게 모든 층에 적용된다.
2. 성공만 남기지 않는다. 실패 · 복구 · 질문이 다음 시도의 가장 큰 단축 경로다.
3. **실패 원인 층을 구분한다.** runtime 층 실패(확장 끊김 · site_not_ready)는 업무 절차의 신뢰를 깎지 않는다(EXPERIENCE-MODEL §10-2 · D7 · orphan O8).
4. Run Metric 의 시간 분해(user wait · AI · command wait · execution)를 남긴다(EXPERIENCE-MODEL §11 · orphan O9).
5. slot 값은 Run 종료 시 삭제(D3), 도움 · 교정 원문은 저장하지 않는다(D4) — orphan O10. Assistant Experience 를 어느 위치에 두든 원문을 올리지 않는다.
6. **Experience 가 아닌 것**(orphan O14): 화면 녹화 · screenshot · 전체 prompt · 전체 대화 · 환자/고객 데이터 · 거래 원장 · 단순 DOM locator 목록.

### 6-3. Experience ≠ 업무 데이터

매장 재고 · 판매량 · 주문 · 가격 같은 **업무 데이터**는 Experience 가 아니다. Assistant 가 업무에 쓰기 위해 보관하더라도 Experience 와 분리된 **업무 데이터 영역**으로 두고, 사업 · 구조 경계(§16)와 Legal Gate(§17)를 따른다.

---

## 7. Skill — 검증된 Experience 의 승격 형태

1. **Skill 은 검증된 Experience 에서 승격되는 업무 Procedure 다.** "이 업무를 이 대상에서 하려면, 이런 입력을 받아, 이런 순서로, 이런 확인을 거친다." Skill 은 **Assistant 가 상황에 따라 고르고 조합하는 재사용 수행 능력**이며, 모든 사용자가 따라야 하는 RPA Workflow 가 아니다(§0-1). 같은 Task type 에 여러 Skill 이 공존할 수 있다.
2. Skill 은 좌표 · DOM 경로의 녹화가 아니다. **stage + 각 stage 의 의미적 대상 + 입력 슬롯 + 성공 판정 + 알려진 실패와 복구** 로 표현한다.
3. Skill 은 사용자 도움 · 매뉴얼에서 얻은 단계도 포함한다.
4. Skill 은 항상 현재 화면으로 재검증하며 실행하고, 어긋나면 Discovery 로 되돌아간다.
5. **Skill registry 는 승격된 Experience 의 저장 형태다.** 첫 대상을 여는 최소 seed 는 허용한다(EVOLUTION §14). 기존 결정론 adapter(health.kr · supplier site 등)는 seed 로 분류한다.
6. **등록된 Skill 개수 · 지원 사이트 수는 진척 지표가 아니다**(EVOLUTION §22).

### 7-1. Knowledge / Manual (EXPERIENCE-MODEL §8 승계 · orphan O3)

- 매뉴얼 · 사내 문서 · 공식 웹 정보 · 사용자 설명은 **Knowledge(미검증 주장)** 로 들어온다. 실제 성공하면 Experience, 여러 실행에서 검증되면 Skill 이 된다(D5).
- **AI 는 원본 매뉴얼을 수정하지 않는다.** 공식 업데이트만으로 Skill 을 자동 변경하지 않는다(Knowledge Watch — 변화 감지는 재검증 신호일 뿐).
- PC 업무 프로그램은 공식 매뉴얼을 Knowledge 로 갖는 것을 전제로 한다. 화면만 보고 메뉴를 추측해 위험한 조작을 하지 않는다.

---

## 8. 수행자 수준 — Strong → Lower-cost → Deterministic

### 8-1. 역할 (model-agnostic · V1 §1-2 승계)

| 역할 | 정의 | 고정하지 않는 것 |
|---|---|---|
| **Strong Discovery Agent** | 처음 보는 업무 · 불확실한 상황에서 관찰 · 추론 · 계획 · 질문을 가장 잘 하는 수행자 | 모델명 · 공급사 |
| **Lower-cost Reasoning Agent** | 검증된 절차를 따라가며 작은 판단(값 확인 · 분기 선택 · 이상 감지)만 하는 저비용 수행자 | 모델명 |
| **Deterministic Executor** | 판단 없이 확정된 절차를 수행 (DOM · UIA · API · WebMCP · RPA · Script) | 기술 종류 |

- 세 역할의 호출은 API · 코드다. **O4O 가 외부 생성형 AI 서비스의 사용자 화면을 조작해 Strong Agent 로 삼지 않는다**(orphan O5). 외부 AI 가 O4O 를 호출하는 방향(§14)과는 다르다.
- 모델 선택은 설정 · 운영의 문제다. 모델을 바꿔도 이 문서는 바뀌지 않는다.

### 8-2. 기본 경로

```text
Unknown (Skill 없음 · 불확실)   → Discovery (Strong)
Known  (검증된 Skill)           → Skill 을 Lower-cost 수행자가 따라감 (작은 판단만)
Repeated (판단 불필요)          → Deterministic
Failure / 화면 불일치           → 즉시 Discovery 로 강등
```

Lower-cost Reasoning 단계는 유지한다. "속도는 약한 모델로 해결하지 않는다" 와 "검증된 절차의 작은 판단은 저비용 수행자" 는 양립한다.

### 8-3. 수준과 승격 (V1 §7 · §9 승계 · orphan O11)

| 수준 | 수행자 | 상태 |
|---|---|---|
| L1 Discovery | Strong (+ 사용자) | 처음 · 불확실 — 결과와 경험을 함께 얻는다 |
| L2 Assisted | Strong 또는 Lower-cost + Experience/Skill 참고 | 경험은 있으나 판단이 많이 필요 |
| L3 Learned Procedure | Lower-cost 가 Skill 을 따라감 | 절차 확정 · 작은 판단만 |
| L4 Deterministic | Deterministic Executor | 판단 불필요 — 확인만 |

1. 비용 최적화는 목표가 아니라 결과다. **한 번 비싸게 해결한 문제를 계속 비싸게 풀지 않는 것**이 O4O 의 비용 최적화다. 사용자 편의를 줄여서 낮추지 않는다(§5-3).
2. 업무 전체가 한 수준일 필요는 없다. **stage 별로 수준이 섞일 수 있다.**
3. **강등은 즉시, 승격은 신중히.** 한 번의 성공으로 승격하지 않는다(EVOLUTION §9).
4. 승격 신호: 성공률 · 실패율 · 최근 실패 · UI 안정성 · 입력값 변화 폭 · 사용자 개입 빈도 · 평균 소요시간과 편차 · 환경 차이 · 남은 판단 필요성. 실행 횟수만으로 승격하지 않는다.
5. **개인(소유 주체) 범위 승격과 공유 범위 승격은 다르다.** 공유 승격은 더 높은 근거와 검증을 요구한다. 공유 범위로 승격된 것은 **Shared Candidate**(다른 사용자에게 추천 · 우선 후보가 되는 상태)이지 전 사용자 표준이 아니다(§0-1 · §10).
6. 승격 상태와 근거는 기록된다. LLM 단독 완료 판정은 승격 신호에서 제외한다(EXPERIENCE-MODEL D6).

---

## 9. Memory Ownership — Ownership-first / Purpose-based Placement

### 9-1. 원칙 (Local-first 대체 · 2026-10-03 사용자 확정)

> **기억은 실행 위치가 아니라 그 의미의 소유 주체에 귀속된다. 저장 위치는 소유와 목적으로 정한다.**

- V1 의 **Local-first**(구조적 경험의 저장 위치는 사용자 PC · 서버는 질의형 recall 만)는 **V2 최종 원칙으로 폐기**한다.
- 이것은 **Cloud-first 로의 단순 반전이 아니다.** "무조건 PC" 도 "무조건 Cloud" 도 기준이 아니다. 기준은 ① 이 기억의 소유 주체는 누구인가 ② 무엇을 위해 어디서 필요한가 ③ 경계 정책(§16 · §17)이 허용하는가 다.

### 9-2. 소유 주체 4종

| 소유 주체 | 귀속되는 것 | 경계 |
|---|---|---|
| **organization** | 매장 업무의 절차 기억(Procedural Memory) · 매장 업무 방식 · 매장의 업무 데이터 사본 · 매장 Task | `organizationId` (BOUNDARY Store Ops · ROLE-WORKSPACE "My Store 는 Store 소유") |
| **user** | 개인 선호 · 개인 교정 · 개인 기본값(personal preference) · 대화 맥락 | `userId` |
| **run** | 진행 중 업무의 상태 · 재개 frame(task · stage · slot 종류 · 전략) · 이번 run 의 slot 값(종료 시 삭제 — D3) | run 은 노드와 무관하다. 다른 노드로 재개해도 run 기억이 따라간다 |
| **node** | **실행환경 상태만** — credential · 로그인 세션 · 현재 화면 · 로컬 파일 경로 · 노드 고유 환경 · 노드의 로컬 데이터 소스 바인딩 | `deviceId`. 이 목록 밖의 기억을 node 에 묶지 않는다 |

- 다인 매장(`organization_members`)에서 직원이 퇴사하거나 매장이 이전될 때: organization 소유 기억은 매장에 남고, user 소유 기억은 사용자를 따라간다. 반환 · 이전 분류의 상세는 §24 후속 설계다.
- 소유 주체 사이에 기억을 옮기거나 공유하는 것은 §10 경로만 따른다. organization 간 · user 간 임의 공유는 없다.

### 9-3. 유지되는 금지

| 정보 | 규칙 |
|---|---|
| 비밀번호 · OTP · 토큰 · 인증서 · 인증 정보 | **DO_NOT_STORE — 어디에도.** node 의 credential 은 노드 자체 인증(device credential)만이며 제3자 사이트 인증 정보를 수집하지 않는다(EVOLUTION §25 #8 credential 0) |
| 환자명 · 고객명 · 주민번호 · 연락처 · 처방 내용 | DO_NOT_STORE (EXPERIENCE-MODEL §16) |
| 도움 · 교정 원문 · 화면 텍스트 전문 · screenshot · prompt 전문 | DO_NOT_STORE (D4 · §6-2) |
| slot 값 | run 소유 · Run 종료 시 삭제 (D3) |

### 9-4. 배치 전환의 선행 조건

- 현재 구현은 Experience 전부를 실행 PC 의 `local.db` 에 둔다. 이를 §9-2 배치로 옮기는 것은 **§17 Legal / Data Processing Gate 통과 후**에만 한다. 원칙 전환(이 문서 ACTIVE)과 물리 이동(구현)은 다른 단계다.
- 저장 정책(Storage · Processing · Retention · Sharing)은 이동 구현보다 먼저 확정한다(V1 §10 "데이터가 PC 밖으로 나가는 작업은 경계 정책이 선행" 승계 · orphan O12).

---

## 10. Shared Experience (V1 §5 · EXPERIENCE-MODEL §17 승계 · orphan O4)

1. 소유 주체 밖으로 나가는 공유는 **동의 전제 · 익명화 · 명시적 publish** 로만 일어난다.
2. 공유 단위는 **Experience Digest** — 정제 순서: SHAREABLE 필드만 선택 → 값 · 원문 · 개인 환경 제거 → 수치 구간화 → 동의 → publish.
3. 수신 측에서 공유 Digest 는 **Knowledge(미검증 주장)** 로 들어온다. 다른 사용자 · 매장에서 검증 없이 바로 결정적으로 실행하지 않는다.
4. 한 사용자의 한 번 성공으로 공유 절차가 되지 않는다.
5. **공유는 강제가 아니다.** 여러 사용자 · 매장에서 반복 검증된 방법은 Shared Candidate 로서 추천 순위 · 우선 후보 · 처음 쓰는 사용자의 출발점이 될 수 있다. 수신 측 사용자의 검증된 방법 · 교정을 덮어쓰지 않고, 수신 측에서 다시 검증된 뒤에야 그 사용자의 Experience 가 된다(§0-1).
6. 공유 승격이 이용계약상 "학습 · 데이터 재사용" 에 해당하는지의 해석은 §17 Gate 대상이다.

---

## 11. Execution Node

### 11-1. PC = Execution Node

1. **PC 는 Execution Node 다.** 기억의 소유자도, 업무 판단의 주체도 아니다.
2. **Request Device ≠ Execution Device.** 요청한 기기(휴대폰 · 다른 PC · 외부 채널)와 실행할 노드는 다를 수 있다. Assistant 가 Task 에 맞는 노드를 고른다.
3. 노드 종류: Office PC · Home PC · Cloud Browser(§13) · 미래 노드. 노드는 **capability 를 선언**하고 Assistant 는 capability · 가용성 · 사용자 지정으로 노드를 선택한다.

### 11-2. Node 계약

- 노드는 Assistant 에게서 **작업 단위**(Skill 실행 · 관찰 · 탐색 구간)를 받는다. 명령 하나마다 원격 왕복하는 것은 계약이 아니라 현재 구현의 한계다.
- 노드 안에서는 **검증된 Skill 의 결정적 실행만** 내부에서 끝까지 수행하고, 어긋나면 판단을 Assistant 로 되돌린다.
- 노드는 관찰 제공 · 지시된 행동의 안전한 수행 · 결과와 실패의 정직한 보고 · 위험 행동 차단(최종 확정 클릭 · 결제 · 서명 · 비밀번호 입력)을 책임진다.

### 11-3. 실행 계층 원칙 (V1 §8 승계)

1. Local Agent · Chrome Extension · Browser DOM · Windows UIA · Computer Use · API · WebMCP · RPA · Script 는 **실행 계층**이다. 두뇌가 아니다.
2. **RPA 는 AI Automation 과 경쟁하는 별도 개념이 아니라 실행 수단 중 하나다.**
3. 수단 선택은 결정론 우선(API → 구조적 DOM/UIA → 시각 fallback)이며, 선택 근거 · fallback 사유는 Experience 로 남는다.
4. 실행 계층은 어느 수준(L1~L4)의 지시든 같은 방식으로 수행한다.
5. **실행 완성도 ≠ 진척**(orphan O13). 실행 계층 smoke PASS 수 · runtime 최적화는 Assistant 의 완성도가 아니다.

---

## 12. 결과 인계 — Handover

EVOLUTION §5(실제 화면 인계)를 요청 기기와 실행 노드의 관계로 나눈다(EVOLUTION §5 2026-10-03 개정과 같은 내용).

| 상황 | 기본값 |
|---|---|
| 사용자가 실행 노드 화면 앞에 있다 | **실제 사이트 · 프로그램 화면을 인계**한다. 요약 화면만 보여주고 원본 업무 화면을 숨기지 않는다 |
| 원격 요청(요청 기기 ≠ 실행 노드) | **결과 요약 + 실행 노드의 실제 화면으로 가는 경로**(노드에서 결과 화면을 열어 둔 상태 유지 · 노드에서 이어갈 수 있는 링크/표시). 요약만 남기고 원본 화면을 닫지 않는다 |

원격 요청에서 사용자 입력(OTP 등) · 승인을 어떻게 받는지는 §24 후속 설계다. 정해지기 전에는 그런 단계에서 Task 를 `BLOCKED` 로 두고 사용자가 노드 앞에서 이어가게 한다.

---

## 13. Cloud Browser · Cloud Node

1. Cloud Browser 는 Execution Node 의 한 종류다.
2. **제3자 사이트의 인증 세션(로그인 상태 · 쿠키) 보관은 별도 정책 승인 전 허용하지 않는다**(2026-10-03 사용자 확정). 그 전까지 Cloud Browser 는 **로그인 없는 공개 사이트 전용**이다.
3. 로그인이 필요한 업무는 사용자의 노드(사용자가 직접 로그인한 브라우저 · 세션)에서 수행한다. O4O 는 로그인을 대행하지 않고 쿠키를 복사하지 않는다(`CHECK-O4O-LOCAL-WORK-AGENT-V0` 금지 승계).

---

## 14. Ingress — O4O Web 밖에서 들어오는 요청

1. Assistant 는 O4O Web 외의 요청 경로를 **수용할 수 있는 구조**로 만든다: 외부 AI(ChatGPT 등) · Kakao 등 업무 채널 · Device Agent · 업무 소프트웨어.
2. 모든 ingress 는 같은 Assistant(§3) · 같은 Task(§4)로 들어온다. 채널마다 별도 실행 경로를 만들지 않는다.
3. 진행 · 질문 · 결과는 요청 채널로 돌려줄 수 있어야 한다(비동기 Task). 결과 인계는 §12 를 따른다.
4. **인증 방식은 이 문서에서 정하지 않는다.** API key · OAuth client · MCP credential/scope · 위임 토큰 타입은 후속 설계다(§24). 단 다음은 고정한다:
   - 폐기된 `service_credentials` 를 재사용하지 않는다(Identity V3).
   - Core auth(F10) 를 바꾸는 방식이면 명시 WO 가 필요하다. Local Agent 의 별도 device-token 경로는 Core 를 건드리지 않은 선례다.
   - Kakao 등 메신저는 **로그인 Identity 가 아니라 업무 채널**이다(Identity V3 — Connected Channel = Phase 7).
5. 외부 채널로 O4O 결과가 나가는 것의 성격(이용자 지시 전송 vs 제3자 제공)과 동의 문구는 §17 Gate 대상이다.

---

## 15. 승인 · 위험 경계

1. **실제 발주 확정은 사용자가 직접 승인한다**(2026-10-03 사용자 확정). 자동화 수준 · 정책 설정 · Skill 신뢰도와 무관하다.
2. 조제 보고 · 마약류 · 청구 · 결제 · 전자서명 · 계약 · 법적 확정 · 개인정보 대량 처리 같은 **최종 확정 · 고위험 행위는 수준과 무관하게 사용자가 직접 확정한다**(V1 §9-3 · 2026-10-01 사용자 확정 승계). 자동화는 그 직전까지 준비한다. 세부 목록은 도메인 정책 문서가 정한다.
3. 실행 노드는 최종 확정 클릭 · 결제 · 비밀번호 입력을 차단한다(§11-2). COMMIT 단계는 사용자 takeover 다.
4. 매장 경영자 이용계약의 "의약품 · 건강 관련 정보는 매장 경영자가 최종 확인" 원칙과 일치한다.

---

## 16. 사업 · 구조 경계

이 문서는 사업 · 정책 정본(CLAUDE.md 우선순위 2)과 구조 계약(우선순위 3)을 바꾸지 않는다. Assistant 는 아래 경계 안에서 동작한다.

| 영역 | 경계 |
|---|---|
| **외부 도매 발주** | 외부 도매 사이트가 주문의 System of Record 인 B2B 발주는 **매장 자신의 행위이고 O4O 는 대리 실행자**다. O4O `checkout_orders` 원장 행으로 만들지 않고, 새 `*_orders` 테이블도 만들지 않는다. `createOrder()` 단일 지점 규칙(CLAUDE.md §4)은 O4O 내부 주문에 그대로 적용된다. COMMERCE-BOUNDARY · B2B 계약의 구조는 이 문서로 바뀌지 않는다 |
| 매장 재고 · 판매량 · 가격 | **업무지원을 위한 사본**만(COMMERCE-BOUNDARY §6 · §11). 판매 원장 · 결제 실행 · 재고 시스템이 되지 않는다 |
| POS | 현행 정본("POS 비개발")을 유지한다. 이 문서는 POS 연동 정책을 만들지 않는다 |
| ProductMaster | **단방향 · read-only 참조**만. Assistant 쪽이 `product_master_id` 를 참조하고 ProductMaster 에 역방향 FK 를 두지 않는다(F12 Freeze #6). 미매칭 품목은 ProductCandidate 경로. 수집 데이터로 ProductMaster 를 직접 확정하지 않는다 |
| 도메인 간 연결 | ID 참조 + 개별 조회. Cross-domain JOIN 은 BOUNDARY Rule 5 의 명시 WO 예외로만 |
| 의약품 | O4O 내부 cart · `createOrder()` 의 의약품 거래 차단은 그대로다. 외부 도매 의약품 발주 자동화의 법률 검토는 §17 Gate 대상이다 |
| 건강 · 병원약국 데이터 | 기존 결정(병원약국 = Local-only)을 유지한다. §9 배치 전환의 예외로 둔다 |
| AI 의 역할 | PHILOSOPHY §6("AI 는 사람의 검수 없이 최종 기준을 결정하지 않는다")을 유지한다. PHILOSOPHY 개정은 이 문서의 범위가 아니다 |
| 공급자 역할 | Supplier Domain §9(Supplier 내부 LLM 호출 금지)를 유지한다. 공급자 역할 사용자에 대한 Assistant 적용 범위를 이 문서가 넓히지 않는다 |

V2 와 이 정본들이 직접 충돌하는 새 사실이 확인되면 구현을 멈추고 결정을 올린다.

---

## 17. Legal / Data Processing Gate

### 17-1. Gate

**Assistant Memory 의 Cloud 이동, 또는 새로운 외부 데이터 처리(새 provider · 화면 캡처 전송 · 외부 채널 결과 전달 등)를 실제로 구현하기 전에 이 Gate 를 반드시 통과한다.**

통과 조건(모두):

1. 개인정보처리방침 · 보유기간 정책 · 국외 이전 고지 · 매장 경영자 이용계약이 해당 처리를 기재하도록 개정됐다(필요 시).
2. 해당 데이터의 목적 · 근거 · 보유기간(무기한 금지 — 보유기간 정책) · 공유 범위가 정해졌다.
3. "AI 를 쓰지 않는 방법으로 거부" 경로 · 재동의 필요 여부가 정해졌다.
4. 사용자(저장소 소유자)가 Gate 통과를 승인했다.

### 17-2. 범위

- 이 Gate 는 **이 문서의 ACTIVE 자체를 막지 않는다.** 원칙과 구조는 지금 확정하고, 데이터가 실제로 움직이는 구현만 Gate 뒤에 둔다.
- 법률 판단과 처리방침 개정은 이 문서가 하지 않는다.

### 17-3. KNOWN GAP — `STILL_OPEN`

| 항목 | 상태 (2026-10-03) |
|---|---|
| 현재 work-agent planner 의 OpenAI 처리 vs 개인정보처리방침 국외 이전 고지(Gemini · Gmail 만) | **STILL_OPEN / KNOWN GAP** — V2 이전부터 있던 격차. 법률 판단 대상. [`IR-…-ENVIRONMENT-REFRESH`](../investigations/IR-O4O-PERSONAL-ASSISTANT-V2-ENVIRONMENT-REFRESH.md) §K |
| Assistant 기억 · task history · 대화 맥락의 보유기간 | 미정 — 출시 전 확정 필수 |
| 요청 원문(`goal_summary`) 무기한 보관 · Experience TTL 없음 | 현재 구현의 D3 어긋남 — 구현 WO 대상 |

---

## 18. 개발 순서 (V1 §10-1 대체)

### 18-1. V1 트랙 동결 (2026-10-03 사용자 확정)

| V1 트랙 | 처리 |
|---|---|
| Phase 1 — Local Experience 최소 저장 (`c387789ee`) | **완료 자산으로 승계.** 구조는 유지하고 저장 위치는 §9 로 재정의 |
| Phase 2 — User Assistance · Correction (`6cd618217`) | **KEEP_BUT_REPOSITION** — Assistant Experience · Procedural Memory 로 승계 |
| Strong Discovery (`87ebdb074` · server 측 배포됨) | **KEEP_BUT_REPOSITION** — §5 Unknown-task Discovery capability 로 승계 |
| V1 Phase 3~5 · ARCH-V1 §10-1 순서 | **동결** — 아래 V2 순서로 대체 |

V1 구조를 전제로 한 추가 확장 · 최적화 · smoke 는 하지 않는다. 보류 중이던 실 PC smoke(Phase 1 · 폴링 재측정 · Strong Discovery)는 V2 구현에서 필요한 시점에 V2 기준으로 다시 정한다.

### 18-2. V2 순서

```text
A  Assistant + Task Foundation   L1 · L2 최소 구조 (Task 1급 객체 · 완료 계약 · 채널 무관 진입)
B  Planner 분리                   Assistant Planning ≠ Execution Planning
── Legal / Data Processing Gate (§17) ──
C  Memory Placement               §9 ownership 배치 이동
D  Execution Node 계약            capability · 선택 · 작업 단위 dispatch (구조 — 성능 튜닝 아님)
E  Skill                          Experience → Skill 승격 · registry = 저장 형태
F  Hybrid Observation             vision 포함 관찰 (새 provider 전송은 Gate 대상)
G  Ingress                        외부 채널 · 인증 방식 확정 (§14)
H  ProductMaster 연결             단방향 참조 · 다중 식별자 매칭은 Identifier Core 선행
I  Worker                         업무 단위 병렬 (parent/child run · 탭 격리)
```

- A · B 는 Gate 이전에 할 수 있다 — 기억을 PC 밖으로 옮기지 않고도 만들 수 있는 구조다.
- **Runtime 은 0번 트랙이다**(V1 §10-1 원칙 승계). 진행 중 runtime 결함은 필요한 만큼 마감하되, 새로운 runtime 최적화(polling · vision · 프로토콜 튜닝)는 해당 구조 단계보다 선행하지 않는다. D 를 성능 튜닝으로 시작하면 "더 좋은 RPA" 로 기운 것이다.
- 순서를 바꾸려면 이 절을 고치는 명시 WO 가 필요하다.

### 18-3. 작업 선택 질문 (V1 §10 승계 · orphan O12)

1. 이 작업은 어느 계층(§2)을 강화하는가? 분류하지 못하면 범위가 불명확하다.
2. Experience 가 남는가?
3. 실행 계층 작업은 "Experience 를 얻기 위해 필요한 만큼" 인가?
4. 비용 최적화를 근거 데이터보다 먼저 하고 있지 않은가?
5. **특정 사이트 · 업무 전용 코드는 사례로만 둔다.** 다른 영역(공급자 · 매장 · 운영자)에도 적용되는가?
6. 데이터가 소유 주체 밖으로 나가는가? 그러면 경계 정책 · Gate 가 먼저다.
7. 완료 판단은 §19 지표로 한다.

---

## 19. 평가 기준

EVOLUTION §22 를 그대로 쓴다.

| 핵심 KPI 가 **아닌** 것 | 더 중요한 지표 |
|---|---|
| 지원 사이트 수 · 사전 정의 Workflow/Skill 수 · AI 자동 완료율 · 실행 계층 smoke PASS 수 · 사용자 간 절차 통일도(표준 Workflow 채택률) | 동일 업무 완료시간 감소 · 사용자 수동 조작 감소 · takeover 위치 변화 · 반복 질문/수정 감소 · Skill 재사용률 · 새 업무 적응 속도 · AI 판단 호출 감소 · 결정적 실행 비율 증가 · 다른 노드/채널에서도 같은 기억이 쓰이는 비율 |

---

## 20. V1 실행 자산 재배치

V1 자산은 폐기하지 않고 V2 계층으로 옮긴다. 상세 판정: [`GAP-CENSUS`](../investigations/IR-O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2-GAP-CENSUS.md) §M.

| 자산 | V2 위치 | 판정 |
|---|---|---|
| Chrome 확장 DOM executor · Windows UIA · computer input/capture | L4 Execution | KEEP / KEEP_BUT_REPOSITION |
| 안전 경계(password/OTP 차단 · COMMIT takeover · origin 제한) | Node 공통 안전층 | KEEP |
| Local Agent | L5 Execution Node | KEEP_BUT_REPOSITION |
| 명령 큐 + heartbeat 폴링 · `resolveTargetDevice` | Node 계약(작업 단위 dispatch · 다중 노드 선택) | REDESIGN (단계 D) |
| `work_run_coordination` | run 상태의 중심 · L2 Task 와 연결 | KEEP_BUT_REPOSITION |
| 결정론 request/modality router | L1 아래 빠른 사전 분류 | KEEP_BUT_REPOSITION |
| 단일 work-agent planner loop | Discovery / Execution 측 판단만 | REDESIGN (단계 B) |
| health.kr · pharmacy web · supplier adapter | Skill seed | KEEP_BUT_REPOSITION |
| Strong Discovery A~D (Candidate replay · Experience 저장 · Assistance/Correction · Strong-first routing) | §5 Discovery · §6 Experience · §7 Skill | KEEP_BUT_REPOSITION |
| `local_work_run_context` | run 소유 | REDESIGN (저장 위치 — 단계 C) |
| `local_datasets` · 로컬 파일 질의 | Node 로컬 데이터 capability | KEEP |
| visual fallback | Hybrid Observation 기반 | KEEP_BUT_REPOSITION |

---

## 21. V1 조항 승계표

`O4O-AUTOMATION-AGENT-ARCHITECTURE-V1` 대체 · `O4O-AUTOMATION-EXPERIENCE-MODEL-V1` 개정으로 사라질 수 있던 조항(Consistency Review §6 · O1~O14)의 위치다. **이 표의 조항은 V2 의 일부로 유효하다.**

| # | 조항 | V1 출처 | V2 위치 |
|---|---|---|---|
| O1 | Human-Assisted Discovery — 추측하지 말고 묻는다 · 같은 질문 두 번 금지 · 재개 시 목표 유지 | ARCH §3 · EXP §7-3 | §5-4 |
| O2 | Takeover 는 학습 신호 | EVOLUTION §6 | §5-4 (6) |
| O3 | Knowledge / Manual — 원본 매뉴얼 수정 금지 · 공식 업데이트로 Skill 자동 변경 금지 | EXP §8~§8-4 | §7-1 |
| O4 | Shared Experience — 동의 · 익명화 · 받은 Digest 는 미검증 Knowledge | ARCH §5 · EXP §17 · EVOLUTION §8 | §10 |
| O5 | 모델 비종속 역할 · 외부 생성형 AI 사용자 화면 조작 금지 | ARCH §1-2 | §8-1 |
| O6 | Target 개념(종류 · provisional · 가시성 · D8 사설 시스템) | EXP §4 · D8 | EXPERIENCE-MODEL §4 유지 |
| O7 | Stage 중심 Step | EXP §6 | §6-1 |
| O8 | 실패 원인 층 · D7 | EXP §10-2 · D7 | §6-2 (3) |
| O9 | Run Metric 시간 분해 | EXP §11 | §6-2 (4) |
| O10 | D3 slot 값 삭제 · D4 원문 미저장 | EXP §21 | §6-2 (5) · §9-3 |
| O11 | 승격 신호 · 개인 vs 공유 승격 · 강등 즉시 승격 신중 · stage 별 혼합 수준 | ARCH §7-2 · §9-1 · §9-2 | §8-3 |
| O12 | 우선순위 판단 — 사이트 전용 코드는 사례로만 · 경계 정책 선행 · EVOLUTION §22 KPI | ARCH §10 | §18-3 · §19 |
| O13 | 실행 완성도 ≠ 진척 | ARCH §8-5 | §11-3 (5) |
| O14 | Experience 제외 대상 | EXP §1 | §6-2 (6) |
| — | User Convenience First (사용자 확정) | ARCH §2-3 | §5-3 (문장 그대로) |
| — | Strong-first · Discovery 비용 = 투자 · Experience 없는 Discovery 는 미완성 | ARCH §2 · §2-1 · §2-2 | §5-2 |
| — | 최종 확정 · 고위험 행위 사용자 직접 확정 (사용자 확정) | ARCH §9-3 | §15 |
| — | Experience → Skill 표현 형식 | ARCH §6 | §7 |
| — | 실행 계층 ≠ 두뇌 · RPA = 실행 수단 · 결정론 우선 | ARCH §8 | §11-3 |
| — | Runtime = 0번 트랙 | ARCH §10-1 | §18-2 |

V1 에서 **승계하지 않는 것**: Local-first 저장 원칙(ARCH §5 의 Local/Shared 2단 표 · §5-1 질의형 recall 을 유일한 사용 방식으로 둔 것) → §9 로 대체. "Experience 가 구조의 중심" → §1 로 대체(자산의 중심으로 유지). 개발 순서 §10-1 → §18 로 대체.

---

## 22. 용어

| 용어 | 뜻 |
|---|---|
| Assistant | L1. 사용자 한 명의 업무 비서 |
| Task / Task type | §4-1 |
| Skill / Procedure | §7. 검증된 Experience 의 승격 형태 · Assistant 가 고르고 조합하는 재사용 수행 능력(공통 Workflow 아님) |
| Shared Candidate | §0-1 · §10. 여러 사용자에서 반복 검증돼 다른 사용자에게 추천 · 우선 후보가 되는 방법. 강제 규칙 · 표준 아님 |
| Discovery capability | §5. 모르는 업무를 푸는 하위 capability. Strong Discovery Agent 가 기본 수행자 |
| Execution Node | §11. 실행 환경 — PC · Cloud Browser 등 |
| Request Device | 요청이 들어온 기기 · 채널 |
| 소유 주체 | organization · user · run · node (§9-2) |
| Handover | §12. 결과와 실제 화면의 인계 |

---

## 23. 현재 구현과의 대응 (2026-10-04 · 시점 기록)

| 계층 | 판정 | 근거 |
|---|---|---|
| L1 Personal Assistant | PARTIAL — 논리 계층(Assistant = f(userId)) · Assistant Planning(결정론 ExecutionIntent) · 완료 판정. 기억 · 대화 맥락 없음(단계 C) | Phase A · B CHECK |
| L2 Task | EXISTS — `assistant_tasks` 1급 객체 · Task 1:N run · 완료 계약으로 상태 판정(planner `done` 은 주장) | Phase A · B CHECK |
| L3 Skill / Discovery | PARTIAL (Candidate · adapter seed · Strong-first routing) | GAP-CENSUS §J · §M |
| L4 Execution | EXISTS | GAP-CENSUS §F |
| L5 Execution Node | EXISTS (단일 노드 가정 · 다중 노드 `ambiguous`) | GAP-CENSUS §I |
| Memory 배치 | 전부 실행 PC `local.db` (§9 와 어긋남 — Gate 후 단계 C) | GAP-CENSUS §G |

이 표는 시점 기록이다. 갱신할 때는 이 절만 고치고 본문 원칙은 바꾸지 않는다.

---

## 24. 후속 설계 (이 문서가 정하지 않은 것)

| 항목 | 정하는 곳 |
|---|---|
| 외부 ingress 인증(API key · OAuth · MCP credential/scope · 위임 토큰) · rate limit · quota | 단계 G 설계 WO (Core 변경 시 명시 WO) |
| 원격 요청 시 OTP 입력 · 주문 승인 방법 | 단계 A · G 설계 |
| Cloud Browser 인증 세션 정책 | 별도 정책 승인 |
| 소유 기억의 반환 · 이전 분류(퇴사 · 매장 이전 · 해지) | 단계 C 설계 + 이용계약 검토(§17) |
| Assistant 기억 · task history 보유기간 · 처리방침 · 국외 이전 고지 · 재동의 | §17 Gate |
| 외부 도매 가격 · 재고의 저장 위치 · `storeProductId` 의 기존 엔티티 매핑 | 단계 H 설계 |
| Boundary Policy 에 Assistant 도메인 신설 여부(1차 경계 = `organizationId` + `userId`) | 단계 A 설계 — Boundary(F6) 변경이 필요하면 명시 WO |
| 의약품 외부 도매 발주 자동화의 법률 검토 | §17 Gate |

---

## 25. 관련 문서

- [`O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1`](O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md) — 상위 철학 (2026-10-03 부분 개정)
- [`O4O-AUTOMATION-EXPERIENCE-MODEL-V1`](O4O-AUTOMATION-EXPERIENCE-MODEL-V1.md) — 하위 정본 (V2 정합 개정)
- [`O4O-AUTOMATION-AGENT-ARCHITECTURE-V1`](O4O-AUTOMATION-AGENT-ARCHITECTURE-V1.md) — SUPERSEDED
- [`O4O-STORE-COMMERCE-BOUNDARY-V1`](O4O-STORE-COMMERCE-BOUNDARY-V1.md) · [`O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1`](O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md) — §16
- [`O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1`](O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md) — §16 ProductMaster
- [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) · [`O4O-BUSINESS-PHILOSOPHY-V1`](O4O-BUSINESS-PHILOSOPHY-V1.md) — §3 · §16
- [`O4O-IDENTITY-ARCHITECTURE-V3`](../architecture/O4O-IDENTITY-ARCHITECTURE-V3.md) — §14
- [`O4O-PRIVACY-POLICY-V1.0`](O4O-PRIVACY-POLICY-V1.0.md) · [`O4O-PRIVACY-DATA-RETENTION-POLICY-V1`](O4O-PRIVACY-DATA-RETENTION-POLICY-V1.md) — §17
