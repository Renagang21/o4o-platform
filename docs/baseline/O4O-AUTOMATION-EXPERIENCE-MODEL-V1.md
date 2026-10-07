# O4O-AUTOMATION-EXPERIENCE-MODEL-V1

> **상태**: ACTIVE — Experience 개념 모델 · 저장 계약 정본 (`CANONICAL-INDEX` §6)
> **작성일**: 2026-10-01 · **개정**: 2026-10-04 §0-1 개인화 행 · §8 표 문구 (`WO-O4O-PERSONAL-ASSISTANT-PERSONALIZATION-PRINCIPLE-ALIGNMENT-V1`) · **최종 갱신**: 2026-10-01 (사용자 검토 D1~D8 확정 · DRAFT → ACTIVE · `WO-O4O-AI-AUTOMATION-PRINCIPLES-USER-CORRECTION-KNOWLEDGE-AND-MODEL-ROUTING-ALIGNMENT-V1`: §7-5 User Correction · §7-6 Preferred/Avoid Pattern · §8-1~8-4 Knowledge 출처 · Manual · 공식 웹 Knowledge · Knowledge Watch · 사례 D · §20 순서 보강)
> **근거 WO**: `WO-O4O-AUTOMATION-CANONICAL-ENTRYPOINT-ALIGNMENT-AND-EXPERIENCE-MODEL-DESIGN-V1` Phase B (= `WO-O4O-AUTOMATION-EXPERIENCE-MODEL-DESIGN-V1`)
> **상위 정본**: [`O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2`](O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) §6 (Experience 계층화) · §7 (Skill) · §8 (Promotion) · §9 (Memory Ownership) · §10 (Shared) — 그 위 [`O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1`](O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md). (2026-10-03 변경 · 종전 상위 [`AGENT-ARCHITECTURE-V1`](O4O-AUTOMATION-AGENT-ARCHITECTURE-V1.md) 은 SUPERSEDED)
> **V2 정합 개정 (2026-10-03)**: 아래 "V2 정합" 절이 이 문서의 해당 조항보다 우선한다. 본문의 "ARCHITECTURE §n" 참조는 작성 시점 기록이며 현재 위치는 [V2 §21 승계표](O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md)로 찾는다.
> **근거 census**: [`IR-O4O-AUTOMATION-AGENT-ARCHITECTURE-REALIGNMENT-V1`](../investigations/IR-O4O-AUTOMATION-AGENT-ARCHITECTURE-REALIGNMENT-V1.md) §3·§5 + 이 문서 부록 A 의 코드 재확인
> **성격**: **개념 모델 + 저장 계약**. DB 테이블 · enum · API · 구현이 아니다. 이름은 의미를 고정하기 위한 것이며 코드 식별자는 구현 WO 가 정한다.

---

## 0. 이 문서가 답하는 질문

> **오늘 사용자가 Agent 에게 무언가를 가르쳐 줬다면, 내일 Agent 는 무엇을 알고 있어야 같은 질문을 하지 않는가?**

더 넓게: 한 번의 실행에서 무엇을 남겨야 다음 실행이 **더 빠르고 · 더 정확하고 · 사용자 도움이 적고 · AI 비용이 낮아지는가**.

### 0-1. V2 정합 (2026-10-03 · `WO-O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2-CANONICALIZATION`)

[`PERSONAL-ASSISTANT-ARCHITECTURE-V2`](O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) ACTIVE 에 맞춰 아래 조항을 이렇게 읽는다. 개념 모델(§1~§14)과 D2~D8 은 그대로 유효하다.

| 조항 | V2 이후 |
|---|---|
| **D1 질의형 recall** (§21) | **유일한 사용 방식이 아니다.** Experience 의 저장 위치는 V2 §9 Ownership-first(organization · user · run · node)로 정한다. Experience 가 실행 노드에 있는 동안(배치 이동 전 · 또는 node 소유 항목)에는 질의형 recall 이 그 노드에서 쓰는 방식으로 남는다. "Cloud 는 Local 원장을 read-back · 동기화하지 않는다" 는 **소유 주체 밖으로의 무단 복제 · 공유 금지**로 읽는다 |
| D2 Task identity | 유지. V2 §4 의 Task(인스턴스)와 구분해 이 문서의 Task 는 **Task type** 이다(V2 §4-1) |
| D3 · D4 | 유지 — 저장 위치와 무관하게 적용(V2 §6-2 · §9-3) |
| §15 Local 최소 저장 집합 | 집합(MUST · SHOULD · OPTIONAL · DO_NOT_STORE)은 유지한다. "Local" 은 V1 시점의 저장 위치 이름이며, 각 항목의 위치는 V2 §9-2 소유 주체 배치를 따른다. 실제 이동은 V2 §17 Gate 통과 후 |
| §16 `LOCAL_ONLY` | "실행 PC 에만" 이 아니라 **소유 주체 전용 · 공유 금지**로 읽는다. 단 개인 환경(PC 이름 · 경로 · 계정 식별자)은 node 소유다. `DO_NOT_STORE` 는 그대로 — 어디에도 저장하지 않는다 |
| §17 Shared Experience | 유지(V2 §10). Digest 는 소유 주체가 동의 · 익명화 후 명시적으로 publish 한다. 수신 측에서는 **Shared Candidate(추천 · 우선 후보)** 이며 강제 규칙 · 표준 절차가 아니다 — 수신 사용자의 검증된 방법 · 교정을 덮어쓰지 않는다(V2 §0-1 · 2026-10-04) |
| 개인화 (2026-10-04 · V2 §0-1) | 이 문서의 승격 · 공유 흐름(§7-6 · §13 · §14 · §17)은 **사용자 공통 Workflow 를 만드는 흐름이 아니다.** Procedure / Skill 은 소유 주체마다 다를 수 있고, 같은 Task type 에 여러 Procedure 가 공존한다. §3 의 alias "수렴" · D2 "정규화" 는 업무 유형의 식별을 맞추는 것이지 수행 절차를 통일하는 것이 아니다 |
| §20 구현 Phase · §22 다음 작업 | Phase 1 = 완료 자산 승계 · Phase 2 = KEEP_BUT_REPOSITION · Phase 3~5 동결. 다음 작업은 V2 §18 의 단계 A(Assistant + Task Foundation) |
| Experience ≠ 업무 데이터 | 유지 · 강조(V2 §6-3). 재고 · 판매 · 가격은 Experience 가 아닌 업무 데이터 영역 |
| PC 독립 (2026-10-05 · V2 §3-1 · §11-1) | 이 문서의 "Local" · "사용자 PC" · `local.db` 는 **원 기록이 놓인 실행 노드**를 가리킬 뿐이다. Experience 의 주인은 소유 주체(사용자 · 조직)이고, 사용자가 PC 를 여러 대 써도 Assistant · 업무가 PC 별로 나뉘지 않고, Cloud 배치가 허용된 Experience(업무 식별 · 재개 구조 · 공개 사이트 대상 검증된 방법)는 노드와 무관하게 쓰인다. 사설 시스템 · Windows 앱 대상 절차 기억은 노드에만 있다(MEMORY-PLACEMENT M9 — V2 §11-1 (4) 예외). 특정 PC 의 `local.db` 를 Experience 의 기준 원장으로 읽지 않는다. 본문의 "실 PC smoke" 기록은 그 시점의 historical evidence 다(V2 §11-1-a) |
| 노드 원장 소유 주체 (2026-10-05 · Phase D) | local.db v8(에이전트 0.2.0)부터 Preferred/Avoid 패턴 · Workflow Candidate · run · 도움 기록에 `owner_key`(소유 주체의 불투명 해시)가 붙고, 조회는 그 소유 주체 것만 돌려준다. §15 의 Local 최소 집합 · §16 분류는 그대로이며 경계만 소유 주체로 좁아진다. 이전 행(owner_key 없음)은 격리된다. 노드 패턴과 Cloud 패턴을 합칠 때는 Cloud 가 앞선다(V2 §23 ② 해소) |

---

## 1. Experience 의 정의

**Experience = 특정 업무(Task)를 특정 대상(Target)에서 실제로 수행하며 확인된 사실들의 구조화된 기록과 그 누적.**

- "실제로 일어난 일" 이다. 추측·설명(Knowledge)·재사용 방법(Skill)과 구분한다(§7, §11).
- **구조**를 남긴다. 원문(요청 문장 · 사용자 답변 · 화면 텍스트 · 입력값)은 Experience 의 재료가 아니다.
- 실행 수단(DOM · UIA · API · WebMCP …)이 바뀌어도 의미가 유지되도록 **업무 단계의 의미**를 중심에 둔다.
- 사용자 도움 · 실패 · 복구가 들어간 run 도 Experience 다. 오히려 가장 정보량이 많다.

Experience 가 아닌 것:

| 아닌 것 | 이유 |
|---|---|
| 화면 녹화 · screenshot | 민감정보 · 재사용 불가 |
| 전체 prompt · 전체 대화 | 원문 · 민감정보 · 의미 추출 안 됨 |
| 환자/고객 데이터 · 거래 원장 | 업무 데이터이지 업무 경험이 아니다 |
| 단순 DOM locator 목록 | 실행 수단에 종속 · 왜 그 단계인지 모름 |

---

## 2. 개념 지도

```text
                  ┌───────────── Knowledge (외부에서 얻은 설명 · 미검증 주장)
                  │                    │ 참조 / 검증
Task ──┐          ▼                    ▼
       ├─► Run ──► Step(Observation → Decision → Action → Result)
Target ┘     │       ├─ Assistance Event (막힘 → 질문 → 제공 정보 → 해결)
             │       └─ Failure Event (위치 · 층 · 복구)
             ├─ Outcome (상태 + 근거)
             └─ Run Metric (시간 분해 · AI · 개입)
                    │
                    ▼ 누적 (Task × Target)
              Experience Profile ──► Procedure / Skill 후보 ──► Promotion State (단계별 L1~L4)
```

| 개념 | 한 줄 | §  |
|---|---|---|
| Task | 업무 종류(문장이 아님) | 3 |
| Target | 업무를 수행하는 대상 | 4 |
| Run | 한 번의 실제 수행 | 5 |
| Step | 관찰 → 판단 → 행동 → 결과 | 6 |
| Assistance Event | 사용자에게서 얻은 도움 하나 | 7 |
| Knowledge Item | 외부 설명의 구조화된 주장 | 8 |
| Outcome | 결과 + 그 근거 | 9 |
| Failure Event | 실패 · 원인 층 · 복구 | 10 |
| Run Metric | 시간·비용·개입 분해 | 11 |
| Experience Profile | Task × Target 누적 관점 | 12 |
| Procedure / Skill | 여러 Experience 에서 추출한 재사용 방법 | 13 |
| Promotion State | 단계별 수준과 근거 | 14 |

---

## 3. Task / Intent

**사용자가 하려는 업무의 종류.** 문장이 아니다.

```text
"약학정보원에서 타이레놀 찾아줘"
"health.kr 에서 타이레놀 검색"           ─►  Task: 의약품 정보 조회 (slot drug_name = "타이레놀")
"타이레놀 약품정보 좀 찾아줘"
```

| 속성 | 의미 |
|---|---|
| task identity | 업무 영역 · 동작 · 대상 객체의 조합(예: `drug_info · lookup · product`). 대상(Target)과 독립 — 같은 Task 를 여러 Target 에서 할 수 있다 |
| purpose | 업무 목적 한 줄(구조화된 분류). 사용자 문장 아님 |
| required slots | 수행에 반드시 필요한 입력의 **종류**(예: `drug_name: 의약품명`). 값 아님 |
| optional slots | 있으면 쓰는 입력의 종류(예: 기간 · 거래처) |
| expected outcome | 성공이 무엇인가(예: "검색 결과 목록이 보인다" · "파일이 받아진다") — 결정적 검증 조건의 근거(§9) |
| risk class | READ / REVERSIBLE / COMMIT 근접 / 사용자 확정 필수(ARCHITECTURE §9-3) |
| phrasing aliases | 이 Task 로 해석된 요청 표현의 **템플릿**(값 자리는 slot 으로 치환). Local 전용 |

규칙:
1. Task identity 는 처음 만날 때 Discovery 단계에서 **제안**되고, 같은 표현·다른 표현이 같은 Task 로 수렴하도록 alias 가 누적된다.
2. 처음 보는 업무는 **임시(provisional) Task** 로 시작해도 된다. Run 이 끝난 뒤 기존 Task 와 합치거나 새 Task 로 확정한다.
3. 현재 Workflow Candidate 의 `request_template` 은 "표현 하나 = Candidate 하나" 다. Task identity 는 그 위에서 여러 표현을 묶는 키다.

---

## 4. Target

**업무를 수행하는 대상.** hostname 하나가 아니다.

| 속성 | 의미 |
|---|---|
| kind | website · web application · Windows application · API · file · 그 밖 |
| identity | 사이트: origin(+ 의미 있는 앱 경로) / 앱: 실행 파일 · 제품명 / API: 서비스명 · 버전 / file: 형식 · 구조 fingerprint |
| environment | 브라우저 · 앱 버전 · OS · 화면 크기 등급 — 환경 차이 판단용(§14) |
| entry state | 업무 시작 시 필요한 상태(로그인됨 · 특정 화면 · 파일 열림) |
| capabilities | 이 대상에서 확인된 실행 수단(DOM · UIA · API · WebMCP · visual) |
| visibility | public(공개 사이트) / private(사내·개인 시스템) — 공유 가능성 판단(§15) |
| registration | registered(실행 허락 + 경험 있음) / provisional(처음 봄 · 이번 run 에서 관찰 중) |

규칙:
1. **처음 보는 Target 도 provisional 로 표현할 수 있어야 한다**(ARCHITECTURE §2-4). 현재 등재 registry 는 registration=registered 인 Target 의 초기값이다.
2. Target 의 UI 버전은 명시적으로 알 수 없을 때가 많다. 그래서 "UI 변경 의심" 은 Failure Event(§10)에서 추론해 Target 에 누적한다.

---

## 5. Run

**한 번의 실제 업무 수행.** QUESTION 으로 멈췄다 재개해도 같은 Run 이다(runId 유지).

| 속성 | 의미 |
|---|---|
| run identity | runId (재개 시 유지) |
| task · target | §3 · §4 참조 |
| slot state | 각 slot 이 채워졌는가 · 어디서 왔는가(요청 / 사용자 답 / 기본값 / Knowledge) — **값은 실행 중 Local 에만 두고 Run 종료 시 삭제 · 공유 안 함**(D3) |
| startedAt · endedAt · segments | 재개로 나뉜 구간들(사용자 대기는 segment 사이) |
| execution level | 이 Run 이 시작한 수준(L1~L4)과 단계별 실제 수준 |
| executor | 단계별 수행자(Strong / Lower-cost / Deterministic / User) |
| outcome | §9 |
| assistance events · failure events | §7 · §10 |
| metric | §11 |
| procedure relation | 이 Run 이 사용한 / 만들어 낸 Procedure 후보(§13) |

원칙: Run 은 성공 여부와 무관하게 남긴다. 현재는 Run 원장(`local_work_runs`)에 상태만 있고, 단계는 Candidate 저장 때만 남는다(부록 A).

---

## 6. Step — Observation → Decision → Action → Result

Step 을 click/type 으로 정의하지 않는다. **업무 단계의 의미**가 중심이고 행동은 그 실현 수단이다.

```text
Observation : 검색 입력란과 검색 버튼이 있다              (구조적 요약 — 화면 텍스트 dump 아님)
Decision    : stage "검색어 입력" — slot drug_name 을 검색 입력란에   (누가 결정: Strong / Lower-cost / Skill / User)
Action      : method browser_dom · set_input · locator {role: searchbox, name: "검색어"}
Result      : 입력 반영됨 · 검증 = system_verified
```

| 부분 | 남기는 것 | 남기지 않는 것 |
|---|---|---|
| Observation | 화면 경로(pathname) · 존재한 주요 affordance 의 종류 · 대화상자 유무 · 로그인 상태 신호 | 화면 텍스트 전문 · DOM 전문 · screenshot · 결과 목록 내용 |
| Decision | **stage**(업무 단계 이름) · 사용한 slot · 결정 주체 · 근거 종류(Skill / Knowledge / Assistance / 추론) | prompt · rationale 원문 |
| Action | method · action kind · semantic locator(role/name/text) | 좌표 · elementRef · 입력값 |
| Result | 기대 효과 충족 여부(이동 · 변화) · 검증 근거 · 소요시간 | 결과 화면 데이터 |

**stage** 가 이 모델의 핵심 연결점이다:
- 같은 stage 를 DOM 에서 API 로 바꿔 수행해도 Experience 는 이어진다.
- Assistance · Knowledge · Failure 가 모두 stage 에 붙는다 → "어느 단계를 누가 가르쳐 줬고 어느 단계가 자주 깨지는가" 를 답할 수 있다.
- Promotion 은 업무 전체가 아니라 stage 단위로 수준이 다를 수 있다(ARCHITECTURE §7-2-2).

---

## 7. User Assistance (핵심)

**사용자 도움은 오염이 아니라 학습 자산이다**(ARCHITECTURE §3-3 · 사용자 확정 2026-10-01). 도움이 들어간 Run 을 저장에서 빼지 않는다.

### 7-1. Assistance Event 의 구조

```text
어디서 막혔는가        blocking point : stage · step · 막힘 원인(Failure Event 연결 가능)
무엇을 물었는가        ask kind        : 아래 7-2
사용자가 준 정보 종류   provided kind   : value · target · path · procedure · document · confirmation · takeover
구조화된 내용          structured      : 정보 종류별 정규형 (예: menu path ["거래관리", "거래명세서"])
원문                  raw             : 저장 안 함 (§7-4 · D4)
무엇이 풀렸는가        resolution      : resolved / partially / not_resolved + 이후 몇 step 이 진행됐는가
다음에 다시 물어야 하나 reusability     : reusable_knowledge / per_run_value / personal_preference / not_reusable
```

### 7-2. 도움의 의미 분류 (명칭은 미확정 — 의미를 고정)

| 의미 | 예 | 다음 Run 에서 | reusability 기본값 |
|---|---|---|---|
| 값 확인 | "어느 약을 찾을까요?" → "게보린" | **매번 묻는 것이 정상**(slot 값). 다만 "불특정 표현이 오면 묻는다" 는 패턴은 경험 | per_run_value |
| 대상 확인 | "어느 사이트에서요?" → "약학정보원" | 같은 Task 의 기본 Target 후보로 기억 | personal_preference |
| 메뉴 위치 | "거래관리 → 거래명세서" | **다시 묻지 않는다** — stage 경로로 저장, Knowledge 와 같은 형태로 검증 대상 | reusable_knowledge |
| 업무 순서 | "기간을 먼저 고르고 조회" | 다시 묻지 않는다 — stage 순서로 저장 | reusable_knowledge |
| 매뉴얼 요청 | 사용 설명서 파일 제공 | Knowledge Item 생성(§8) — Assistance 는 그 출처 연결만 | reusable_knowledge |
| 로그인 필요 | "로그인했어요" | Target entry state 로 기억. 로그인 대행은 하지 않음 | not_reusable(상태) |
| 사용자 교정 | "그거 말고 두 번째 결과" | Decision 의 오류 신호 — 해당 stage 의 판단 필요성 ↑ · Skill 신뢰도 ↓ | reusable_knowledge 또는 personal_preference |
| 성공 확인 | "네, 이 화면 맞아요" | Outcome 근거 = user_confirmed(§9) · expected outcome 조건 보강 | reusable_knowledge |
| 사용자 인계(takeover) | 사용자가 직접 마무리 | 인계 지점 stage = 자동화 경계 후보. 사용자가 무엇을 했는지 관찰 가능하면 다음 Discovery 의 입력 | 경우에 따라 |

### 7-3. "같은 질문을 하지 않는다" 의 판정

다음 Run 시작 시 Task × Target 의 Experience 에서 **reusable_knowledge 인 Assistance** 를 먼저 불러와 Decision 근거로 쓴다. 성공 Run 에서 그것이 쓰였다면 검증 횟수가 오르고, 실패에 연루되면 내려간다. 같은 ask kind × stage 가 반복되면 그 자체가 Assistance 계층의 결함 지표다(ARCHITECTURE §3-5).

### 7-4. 원문과 구조의 분리

```text
사용자: "거래관리 들어가서 왼쪽 아래 거래명세서를 눌러"
          ↓ 구조화 (Run 중 Agent 가 수행)
Experience: ask=메뉴 위치 · stage="거래명세서 화면 진입" · structured.menu_path=["거래관리","거래명세서"]
            · hint.region="왼쪽 아래" · resolution=resolved · reusability=reusable_knowledge
원문: 실행 중에만 사용 · 저장 안 함. 구조화에 실패하면 그 도움은 Experience 로 남기지 않는다(D4)
```

- 값 확인 답(예: "게보린")은 slot state 로만 들어가고 Experience 의 재사용 지식이 되지 않는다.
- 구조화된 내용에 고객명·환자명·금액 같은 업무 데이터가 섞이면 그 필드는 버린다(§16).

### 7-5. User Correction — 구조화된 교정 (2026-10-01 정렬)

§7-2 의 "사용자 교정" 행을 구조로 고정한다. 교정은 **"이 Task × Target × Stage 에서 AI 가 고른 방법이 틀렸고, 더 나은 방법은 이것이다"** 라는 Assistance Event 의 한 종류다.

```text
AI 의 방법 → 사용자 교정 → 더 나은 방법 → 실제 실행 → 결과 검증 → Experience
```

| 구분 | 의미 |
|---|---|
| 무엇이 잘못됐나 | AI 가 택한 경로 · 방법(구조로) |
| 왜 잘못됐나 | 사용자가 준 이유(구조화 가능한 것만 — 원문 미저장, D4) |
| 어느 단계 | stage |
| 어떤 전략 | 그때 쓴 수행자 수준 · Procedure/Skill · 수단(decided_by · method) |
| 사용자의 대안 | 더 나은 경로 · 방법(구조로) |
| 실제 성공 여부 | 대안으로 실행한 Step 의 Result · 근거 등급(§9) |
| 재사용 가능성 | 다음 Run 에서 다시 쓸 수 있는지(§7-1 reusability) |

- 교정 자체는 Failure 층의 **판단 오류**(§10-2) 와 같은 Run · stage 에 연결된다. 교정 = 사용자 잘못이 아니다.
- 교정만으로는 "대안이 맞다" 가 확정되지 않는다 — 대안으로 실제 성공해야 Experience 가 된다(D5 절차 도움 규칙과 같다).

### 7-6. Preferred Pattern / Avoid Pattern

교정에서 두 가지가 나온다.

- **Preferred Pattern**: 같은 Task × Target × Stage 에서 다음에 **먼저 쓸** 방법.
- **Avoid Pattern**: 같은 Task × Target × Stage 에서 **다시 고르지 않을** 방법.

범위 규칙:
1. 둘 다 **Task × Target × Stage 범위**다. 다른 Task · 다른 사이트로 번지지 않는다.
2. **한 번의 교정은 Shared Skill 이나 전역 금지 규칙을 만들지 않는다.** 단일 Run 은 공용 규칙이 아니다(EVOLUTION §9 · ARCHITECTURE §9-2).
3. Avoid Pattern 은 "그 방법이 어디서나 틀렸다" 가 아니라 "이 업무 · 이 대상 · 이 단계에서 더 나은 방법이 확인됐다" 는 뜻이다.

승격 흐름:

```text
User Correction → Correction Knowledge 후보 → 실제 Run 검증 → Local Experience(Preferred/Avoid)
  → 반복 검증 → Procedure / Skill 의 단계 → sanitization + 사용자 동의 → Shared Experience
  → 다른 사용자에게는 Knowledge 로 도착해 그 사용자의 Run 에서 다시 검증(§17)
```

---

## 8. Knowledge / Manual

| | Knowledge | Experience | Skill |
|---|---|---|---|
| 정의 | 외부에서 얻은 설명 · 매뉴얼 · 문서 · 사용자 설명 | 실제 실행에서 확인된 사실 | 반복 경험으로 신뢰도가 오른 실행 방법 |
| 신뢰 | 미검증 주장 | 관찰된 사실(근거 등급 있음) | 조건부 신뢰(승격 상태 보유) |
| 예 | "거래관리 → 거래명세서" (매뉴얼 p.12) | 그 경로로 실제 진입 성공(run X) | 여러 run 성공 → 그 소유 주체의 Procedure 단계 후보 |

**Knowledge Item** 개념:
- source: manual / 업무 문서 / 사용자 설명(Assistance 에서 승격) / web research / 공유 Experience
- scope: Task · Target · stage
- claims: 구조화된 주장 목록(메뉴 경로 · 단계 순서 · 필드 의미 · 주의 사항)
- verification: unverified → confirmed_by_run(n) / contradicted_by_run(n)
- 원본 문서 자체는 Local 파일로 두고 Knowledge 는 **추출된 주장**만 가진다(원문 문서 재배포 금지).

관계:

```text
Knowledge(주장, 미검증) ──Decision 근거로 사용──► Step 성공 ──► claim confirmed (+Experience)
                                         └──► Step 실패 ──► claim contradicted (+Failure: 업무 지식층)
여러 Run 에서 confirmed + 안정 ──► Procedure / Skill 후보의 단계
```

### 8-1. Knowledge 출처와 신뢰 (2026-10-01 정렬)

| 출처 | 예 | 성격 |
|---|---|---|
| Official Knowledge | 공식 Help · FAQ · Release Note · Update Notice | 외부 · 공식 |
| Manual Knowledge | 프로그램 기준 매뉴얼(§8-2) | 외부 · 문서 |
| User-provided Knowledge | 사용자 설명 · 업무 문서 | 사용자 |
| User Correction Knowledge | 교정에서 나온 Preferred/Avoid 후보(§7-5 · §7-6) | 사용자 · 이 Task×Target×Stage 한정 |
| Local Experience | 이 사용자(소유 주체)의 실제 Run — 어느 Execution Node 에서 실행됐든 같은 소유 주체의 경험이다. 노드를 넘어 쓰이는 범위는 Cloud 배치가 허용된 것뿐이고 사설 대상 절차 기억은 노드 전용(V2 §3-1 · §11-1 (4) · 2026-10-05 정렬, 종전 표기 "이 사용자 PC") | 관찰된 사실 |
| Shared Experience | 다른 사용자에서 검증 · 공유된 Digest | 다른 환경의 사실 → 여기서는 Knowledge(§17) |

- 출처마다 신뢰가 다르지만 **최종 검증 기준은 이 사용자의 실제 Run Experience** 다. 어떤 출처도 Run 검증 없이 Skill 이 되지 않는다.

### 8-2. PC 프로그램 기준 매뉴얼

1. 프로그램마다 **기준 매뉴얼 하나**를 Initial Knowledge 로 둔다. 버전별 매뉴얼을 모두 갖추는 것을 전제로 하지 않는다.
2. 사용자의 실제 버전은 매뉴얼보다 오래됐거나 · 같거나 · 새롭거나 · 알 수 없을 수 있다. **버전 차이는 자동화를 막는 조건이 아니다.**
3. 흐름:

   ```text
   Source Manual → Initial Knowledge(claims) → Run → Experience
     → claim 별 confirmed / contradicted / supplemented → O4O Knowledge 보완
   ```

   - `supplemented`: 매뉴얼에 없던 단계 · 화면을 Run 이 채운 경우.
4. **AI 는 Source Manual 원본을 수정하지 않는다.** 보완은 O4O Knowledge(추출된 claim) 쪽에만 쌓는다.
5. 한 claim 이 contradicted 돼도 **"프로그램 전체가 바뀌었다" 로 판단하지 않는다** — 그 stage 의 claim 만 낮춘다.
6. 버전은 **선택적 환경 정보**다. 필수 입력이 아니며, 사용자에게 반복해서 묻지 않는다.

### 8-3. 공식 웹 Knowledge

- 공식 Help · Manual · FAQ · Release Note · Update Notice · 공식 사용 설명은 Knowledge 출처다(§8-1).
- **기본적으로 매 Run 마다 실시간 조회하지 않는다.** Strong Discovery 중 필요하면 조회할 수 있다(ARCHITECTURE §3).
- 조회한 내용도 미검증 claim 이며 Run 으로 검증한다.

### 8-4. Knowledge Watch (향후 · 미구현)

공식 업데이트를 지켜 Knowledge 를 갱신 후보로 올리는 기능. 이 문서는 방향만 정한다.

- 우선순위 신호: 사용 빈도 · 사용자 수 · 업무 중요도 · 최근 실패 증가 · UI 변경 신호 · 공식 업데이트.
- 흐름: `Official Update → Knowledge Candidate → Experience 검증 → Knowledge / Skill 보완`.
- **공식 업데이트만으로 Skill 을 자동 변경하지 않는다.**
- 위치: Manual / Knowledge ingestion 뒤(§20 · ARCHITECTURE §10-1 의 4).

---

## 9. Outcome

| 상태 | 의미 |
|---|---|
| SUCCESS | 기대 결과 도달 |
| PARTIAL_SUCCESS | 일부 단계까지(예: 목록까지, 상세는 미진입) |
| USER_COMPLETED | Agent 가 준비하고 사용자가 마무리(인계) — 고위험 확정 직전 정상 종료 포함 |
| BLOCKED | 정책·권한·환경 때문에 진행 불가(로그인 필요 · 위험 차단) |
| FAILED | 시도했으나 도달 못 함 |
| CANCELLED | 사용자가 중단 |
| ABANDONED | QUESTION 뒤 재개되지 않고 만료 |

**근거(evidence)** — 신뢰도 가중의 기준:

| 근거 | 의미 | 신뢰 가중 |
|---|---|---|
| system_verified | expected outcome 조건을 결정적으로 확인(URL · 요소 · 파일 존재) | 높음 |
| user_confirmed | 사용자가 결과를 확인 | 높음 |
| agent_inferred | LLM 이 완료라고 판단 | **낮음** — 단독으로 Skill 신뢰도를 올리지 않는다 |

현재 완료 판정은 agent_inferred 뿐이다(IR §3 Layer 2). Task 의 expected outcome 이 정의되면 system_verified 로 올릴 수 있다.

---

## 10. Failure / Recovery

### 10-1. Failure Event

| 속성 | 의미 |
|---|---|
| where | stage · step |
| layer | **원인 층** — 아래 표 |
| class | 기존 `AUTOMATION_FAILURE_CLASSES`(11종) 재사용 |
| code | 원 오류 코드(예: `DOM_CONTENT_UNAVAILABLE`) |
| method | 실패 당시 실행 수단 |
| recovery | 시도 목록: tier(normal · strong · user) · 방법 · 성공 여부 |
| assistance | 복구에 사용자 도움이 쓰였으면 Assistance Event 연결 |
| ui_change_suspected | 같은 stage 의 기존 locator 가 안 맞고 새 경로로 성공했는가 |

### 10-2. 원인 층 — 반드시 구분

| 층 | 예 | Skill/Experience 신뢰에 미치는 영향 |
|---|---|---|
| runtime / 실행 기반 | site_not_ready · DOM_CONTENT_UNAVAILABLE · relay disconnected · 명령 timeout | **절차 신뢰도를 깎지 않는다.** Target/환경의 runtime 안정성 지표로만 집계(ARCHITECTURE §10-1 0번 트랙 근거) |
| UI 변경 | selector mismatch 후 새 경로 성공 · 예상 밖 대화상자 | 해당 stage 의 UI 안정성 ↓ · Skill 해당 단계 재검증 |
| 업무 지식 부족 | 메뉴를 모름 · 절차 순서 모름 | Assistance/Knowledge 필요 신호 · 해당 stage 수준 L1 유지 |
| 입력 부족 | slot 미충족 · 불특정 값 | 값 확인 Assistance — 절차 신뢰도와 무관 |
| 판단 오류 | 잘못된 결과 선택 · 사용자 교정 | 해당 stage 판단 필요성 ↑ · 저가 수행자 승격 보류 |
| 정책 · 위험 | 로그인 · 결제 · 확정 차단 | 실패가 아니라 정상 경계 — Outcome BLOCKED/USER_COMPLETED |

이 구분이 없으면 "확장 새로고침 안 함" 같은 환경 문제가 업무 절차의 실패로 기록되어 Promotion 판단을 오염시킨다.

---

## 11. Run Metric

| 지표 | 정의 |
|---|---|
| total duration | 요청 수신 → 응답 (segment 합) |
| user wait | QUESTION ~ 재개 사이(segment 간) — **Agent 성능에서 분리** |
| AI time | 계획·판단 호출 시간 합 |
| command wait | 명령 발행 → PC 수령까지(큐 · polling) |
| execution time | PC 실제 조작 시간 |
| settle time | 이동 · 렌더 대기 |
| AI calls · AI cost | 수행자 등급별 호출 수 · 비용(추정 가능 수준) |
| action count · step count · retry count | 행동 수 · 단계 수 · 재시도 |
| assistance count · takeover | 도움 수(의미별) · 인계 여부 |
| execution method | 단계별 수단 |

**검증 예 (2026-10-01 B 재개 run, [CHECK 근거](../checks/CHECK-O4O-MAIN-AUTOMATION-RESUME-AND-REPLAY-PREFLIGHT-FIX-V1.md))**:

```text
total 48.69 s = command 경로 44.0 s (그중 PC 실조작 ≈1 s · 나머지 ≈43 s 는 수령 대기)
              + AI 계획 2회 ≈8.0 s (5.1 + 2.9)
              + settle 0.7 s
→ 개선 대상 = Runtime(명령 수령) — AI · 사이트가 아님
```

이 분해가 없으면 "느리다" 는 증상만 있고 어느 층을 고칠지 판단할 수 없다. 현재 usage event 에는 durationMs 합계뿐이다.

---

## 12. Experience Profile (Task × Target 누적)

Run 들을 Task × Target 단위로 모은 관점. 별도 원장이 아니라 Run 들의 집계로 볼 수 있다(저장 여부는 구현 결정).

| 답할 질문 | 근거 |
|---|---|
| 해본 적 있는가 | Run 수 · 마지막 Run |
| 누가 어떻게 성공했는가 | Outcome(근거별) · stage 경로 · executor |
| 평균 시간 · 편차 | Run Metric |
| 어디서 자주 실패하는가 | Failure Event(층별) × stage |
| 사용자가 무엇을 가르쳤는가 | reusable Assistance × stage |
| 어떤 매뉴얼을 참고했는가 | Knowledge Item 연결 · 검증 상태 |
| 다른 사용자에게 쓸 수 있는가 | §15 공유 가능 필드 · Target visibility |

---

## 13. Experience ↔ Procedure / Skill

```text
Experience = 실제로 일어난 일 (Run 하나하나 + 누적)
Procedure / Skill = 여러 Experience 에서 추출한 재사용 방법 (stage 순서 · 각 stage 의 실현 수단 후보 · slot · expected outcome · 알려진 실패와 복구)
```

1. 한 번 성공했다고 Skill 이 되지 않는다(EVOLUTION §9). 한 번의 성공은 **Procedure 후보**까지다.
2. Procedure 는 출처 Run **여러 개**를 가리킨다. 사용자 도움 Run 도 출처가 될 수 있다 — 도움으로 얻은 stage 가 Procedure 에 들어가야 다음에 같은 곳에서 막히지 않는다.
3. Procedure 의 stage 는 실현 수단을 여러 개 가질 수 있다(DOM locator · API 호출 · WebMCP tool). 수단이 깨져도 stage 는 남는다.

**현재 `local_workflow_candidates` 의 위치**: Experience 와 Skill 의 **중간 형태**다.
- Skill 쪽 성질: 값 없는 재사용 단계 · slot 템플릿 · success/failure 집계 · disable.
- Experience 쪽 성질: 출처 Run 하나(`source_run_id`) · 표현(template) 하나에 묶임.
- 부족: stage 의미 없음 · DOM 단일 수단 · 도움 Run 제외 · 실패 원인 층 없음 · Task 단위가 아님.
- **제안**: 폐기하지 않는다. Procedure 의 "DOM 실현 수단 + 결정적 재생 캐시" 로 위치시키고, 상위에 Task 단위 Procedure 를 두어 여러 Candidate(표현별)를 묶는다. 기존 success/failure 집계는 Promotion 신호로 계속 쓴다. 단 runtime 층 실패는 failure_count 에 넣지 않도록 분리한다(§10-2).

---

## 14. Promotion 을 위한 데이터 준비 (엔진 설계 아님)

ARCHITECTURE §9-1 판단 신호 ↔ 이 모델의 출처:

| 신호 | 출처 | 현재 |
|---|---|---|
| 성공률 · 실패율 | Outcome(근거 가중) | 상태만(근거 없음) |
| 최근 실패 | Failure Event 시각 · 층 | 없음(Candidate 누계만) |
| UI 안정성 | ui_change_suspected × stage | 없음 |
| 입력 변화 | slot 종류 · 값 형태 분포(값 아님) | 없음 |
| 사용자 개입 빈도 | Assistance Event(의미별) · takeover | 없음(`userCorrectionCount`=0 상수) |
| 평균시간 · 편차 | Run Metric | 로그 합계만 |
| 환경 차이 | Target environment × Outcome | 없음 |
| 판단 필요성 | Decision 주체 · 사용자 교정 · 판단 오류 층 | 없음 |

전이별로 특히 필요한 것:

| 전이 | 핵심 데이터 |
|---|---|
| L1 → L2 | 같은 Task × Target 의 SUCCESS(근거 system/user) 존재 · 업무 지식 부족 막힘이 Assistance 로 해소됨 |
| L2 → L3 | stage 순서 안정 · 판단 오류/교정 없음 · stage 별 Decision 근거가 Skill/Knowledge 로 충족 |
| L3 → L4 | stage 의 Decision 이 결정적(slot 바인딩만) · UI 변경 의심 없음 · 최근 실패 없음 · 환경 간 결과 일치 |
| 강등 | 최근 연속 실패(runtime 층 제외) · UI 변경 감지 · 사용자 교정 |

---

## 15. Local 최소 저장 집합 (V1)

| 항목 | 분류 | 비고 |
|---|---|---|
| Task identity (+ provisional 여부) | **MUST** | |
| Target identity · kind · registration | **MUST** | |
| Run: runId · 시작/종료 · segments · Outcome 상태 + 근거 | **MUST** | 성공·실패·도움 run 모두 |
| Step: stage · action kind · method · semantic locator · result · 결정 주체 | **MUST** | 성공 step 만이 아니라 실패 step 포함 |
| Assistance Event: blocking stage · ask kind · provided kind · structured · resolution · reusability | **MUST** | 이번 설계의 핵심 |
| Failure Event: stage · 층 · class · code · method · 복구 tier/결과 | **MUST** | |
| Run Metric: total · user wait · AI time · command wait · execution · AI calls · assistance count | **MUST** | |
| Execution level · executor (단계별) | **SHOULD** | Promotion 착수 전까지 Run 단위로 충분 |
| Procedure 후보 관계(사용/생성한 Candidate) | **SHOULD** | 기존 Candidate 와 연결 |
| Knowledge Item 연결 · claim 검증 결과 | **SHOULD** | Manual 단계 전에는 Assistance 에서 승격된 것만 |
| Observation 구조 요약(경로 · affordance 종류) | **SHOULD** | |
| Target environment(브라우저 · 버전 등급) | **OPTIONAL** | 환경 차이 판단 시작 시 MUST |
| AI cost 추정 | **OPTIONAL** | 호출 수가 있으면 계산 가능 |
| phrasing alias(템플릿) | **OPTIONAL** | 기존 request_template 재사용 |
| slot 값 | **LOCAL_ONLY · Run 중에만** | 재개용. Run 종료 시 삭제(D3). 개인 기본값은 별도 personal preference(V1 범위 밖) |
| Assistance 원문 | **DO_NOT_STORE** | 구조화 실패 원문 포함(D4). 향후 필요 시 opt-in + 짧은 TTL 로 별도 검토 |
| 요청 원문 | 현행 `goal_summary`(≤200자) 유지 · LOCAL_ONLY | 공유 금지 |
| 화면 텍스트 · DOM 전문 · screenshot · prompt 전문 · 결과 데이터 | **DO_NOT_STORE** | |
| 비밀번호 · OTP · 토큰 · 인증 정보 | **DO_NOT_STORE** | 어디에도 |

---

## 16. 민감정보 분류

| 정보 | 분류 |
|---|---|
| 업무 유형(Task identity · purpose · slot 종류) | SHAREABLE_AFTER_SANITIZATION |
| 공개 사이트 Target identity · 메뉴 구조 · stage 경로 · semantic locator | SHAREABLE_AFTER_SANITIZATION |
| 사내·개인 시스템 Target identity(내부 hostname · 사내 앱 이름) | LOCAL_ONLY |
| 평균 소요시간 · 성공률 · 실패 층 분포 · 도움 의미 분포 | SHAREABLE_AFTER_SANITIZATION (집계 · 구간화) |
| 구조화된 "금액 입력 단계가 있다" · "기간 선택이 먼저" | SHAREABLE_AFTER_SANITIZATION |
| 매뉴얼에서 추출한 일반 claim | SHAREABLE_AFTER_SANITIZATION (저작권 원문 제외) |
| slot 값(약품명 · 거래처 · 기간 · 금액) | LOCAL_ONLY · Run 종료 시 삭제(D3) |
| 사용자의 실제 거래금액 · 거래처 실명 | LOCAL_ONLY 또는 DO_NOT_STORE |
| 요청 원문 · 사용자 답변 원문 | LOCAL_ONLY(요청 요약) / DO_NOT_STORE(답변 원문 — D4) |
| 개인 환경(PC 이름 · 경로 · 계정 식별자) | LOCAL_ONLY |
| 환자명 · 고객명 · 주민번호 · 연락처 · 처방 내용 | DO_NOT_STORE |
| 비밀번호 · OTP · 인증서 · 토큰 | DO_NOT_STORE |

규칙: 구조화 단계에서 업무 데이터로 판정되는 필드는 버린다. 판정이 애매하면 LOCAL_ONLY 로 둔다.

---

## 17. Shared Experience 인터페이스 (DB · API · 동의 UX 는 후속)

- 공유 단위: **Experience Digest** — Task × Target(public) 하나에 대한 정제된 요약.
  - Task identity · Target identity(public 만) · stage 경로와 semantic locator · reusable Assistance/Knowledge 의 구조화 내용 · 실패 층 분포 · 시간 · 성공률(구간화) · 환경 등급.
- 정제 순서: ① SHAREABLE 필드만 선택 → ② 값·원문·개인 환경 제거 → ③ 수치 구간화 → ④ 사용자 동의 → ⑤ 명시적 publish.
- 서버는 Local 원장을 read-back · 동기화하지 않는다. Digest 는 Local 이 만들어 올린다. (현재 Run 을 위한 질의형 recall 은 공유가 아니다 — D1 · ARCHITECTURE §5-1)
- 수신 측에서 공유 Digest 는 **Knowledge(미검증 주장)** 로 들어온다 — 다른 사용자(소유 주체)에게서 바로 Skill 로 쓰지 않는다(ARCHITECTURE §5 · V2 §10. 2026-10-05 정렬, 종전 표기 "다른 사용자 PC").

---

## 18. 사례 적용

### 사례 A — health.kr 의약품 검색 ("내가 먹을 약 검색" → 질문 → "게보린" → 성공)

```text
Task    : drug_info · lookup (slot drug_name: 필수)      Target: health.kr (public · registered)
Run R1  segment 1
  preflight: Candidate 대조 성공 · slot drug_name = 불특정 표현
  Assistance A1: blocking stage="검색어 입력" · ask=값 확인 · provided=value
                 resolution=(대기) · reusability=per_run_value
  Outcome(중간): QUESTION — 사용자 대기 시작
Run R1  segment 2 (같은 runId · targetHint 로 대상 상속)
  A1.resolution = resolved (slot 채움 · 값은 Run 중 Local slot state 에만 · 종료 시 삭제)
  Step S1 stage="검색어 입력"  Decision=slot 바인딩  Action=dom.set_input  Result=system_verified
  Step S2 stage="검색 실행"    Action=dom.click  Result=이동 · 결과 8건 (내용 저장 안 함)
  Outcome: SUCCESS · 근거=agent_inferred (expected outcome "결과 목록 표시" 정의되면 system_verified)
  Metric : total 48.69 · user wait(segment 간) 별도 · command wait ≈43 · AI ≈8.0 · exec ≈1 · settle 0.7
  Procedure: 기존 Candidate 사용 — 도움 run 이지만 SUCCESS 로 집계(현행은 skipped)
남는 지식: "이 Task 는 불특정 drug_name 이 오면 먼저 묻는다"(패턴) · "게보린" 자체는 지식 아님
내일: 같은 불특정 표현 → 바로 값 확인 질문(시도·실패 없이) · 구체적 이름 → 질문 없이 L4 재생
```

### 사례 B — 처음 보는 업무 ("도매사이트에서 지난달 거래명세서 받아줘")

```text
Task    : wholesale · download · transaction_statement (provisional) · slots: period(필수)
Target  : 도매사이트 X (provisional · visibility 판정 필요)
Run R1  L1 Discovery (Strong)
  S1 stage="로그인 상태 확인"     → 로그인됨 (entry state 기록)
  S2 stage="거래명세서 화면 진입" → Failure F1: 층=업무 지식 부족(메뉴 모름)
     Assistance A1: ask=메뉴 위치 · structured.menu_path=["거래관리","거래명세서"]
                    · reusability=reusable_knowledge → Knowledge 후보 K1 생성(source=사용자 설명)
     F1.recovery = user tier · resolved
  S3 stage="거래명세서 화면 진입" (재시도) Action=dom.click×2 → 성공 → K1 confirmed_by_run(1)
  S4 stage="기간 지정"  slot period="지난달" → 해석은 Strong · Result verified
  S5 stage="다운로드"   Action=click → 파일 생성 → Outcome 근거 system_verified(파일 존재)
  Outcome: SUCCESS(system_verified) · Assistance 1 (메뉴 위치)
  Procedure 후보 P1: stages [로그인 확인 → 메뉴 진입(K1) → 기간 지정 → 다운로드] · 출처 R1 · 수준 L1→L2 후보
내일: 메뉴 위치를 묻지 않는다(K1 confirmed) · S4 기간 해석만 판단 필요 → L2 시작
```

### 사례 C — 실패 후 복구 (Skill 실행 → UI 변경 → 재탐색 성공)

```text
Run R9  L4 Deterministic (Procedure P1, DOM 수단)
  S2 stage="거래명세서 화면 진입" Action locator {text:"거래관리"} → selector mismatch
     Failure F9: 층=UI 변경(의심) · class=ACTION_FAILURE · method=dom
  강등: 같은 run 안에서 stage S2 만 L1 (Strong 재탐색)
     → 새 경로 ["정산","거래명세서"] 로 성공 → F9.ui_change_suspected = true · recovery=strong tier resolved
  나머지 stage 는 기존 수준 유지 · Outcome SUCCESS(system_verified)
연결:
  P1.stage S2 : 수단 v1(거래관리) = 최근 실패 · 수단 v2(정산) 추가(출처 R9)
  K1(사용자 설명) : contradicted_by_run(R9) — 사용자 설명이 낡았을 수 있음 표시
  Target X    : UI 안정성 ↓ (S2)
  Promotion   : P1 S2 = L2 로 강등, 다음 몇 run 성공 후 재승격 · 다른 stage 는 유지
  runtime 층 실패였다면(site_not_ready 등): P1 신뢰도는 그대로, Target runtime 지표만 기록
```

### 사례 D — 사용자 교정 (health.kr 동일성분 제품 탐색)

```text
요청: "이 약이랑 성분이 같은 제품 찾아줘"
Run R12 AI 방법: 성분 확인 → 성분명 재검색 → 결과에서 추정
  사용자 교정: "제품을 검색해서 상세에 들어가면 '동일성분' 탭이 있다"
  대안 실행: 제품 검색 → 제품 상세 → 동일성분 탭 → 성공(system_verified)
기록:
  Failure     : stage="동일성분 탐색" · 층=판단 오류(사용자 교정)
  Correction  : wrong=성분명 재추출·재검색 / alt=제품 상세→동일성분 기능 / 성공 여부=성공 / reusable
  Task        : 동일성분 제품 탐색 · Target: health.kr
  Preferred   : 제품 상세 → 동일성분 기능
  Avoid 후보  : 성분명 재추출 → 재검색 (이 Task × Target × Stage 한정)
  slot        : 제품명은 slot 값 — Experience 에 남기지 않는다(D3)
의미:
  복합제처럼 성분명 재검색으로는 정확히 찾기 어려운 경우, 사이트 고유 기능이 더 적합한 방법이다.
  이 1회 교정으로 Skill 이나 전역 금지를 만들지 않는다 — 다음 Run 들에서 검증된 뒤 Procedure 단계 후보(§7-6).
```

---

## 19. 기존 자산 재사용 방향

| 자산 | 분류 | 방향 |
|---|---|---|
| `local_work_runs` | **확장 가능** | Run 원장의 머리. Outcome(상태+근거) · segments · Task/Target identity · Metric 연결을 additive 로 |
| `local_work_run_steps` | **확장 가능** | Step 원장. 현재는 Candidate 저장 때 성공 step 만 → 모든 Run 의 step(실패 포함) · stage · 결정 주체 · 결과 근거로 |
| `local_workflow_candidates` | **재사용** | Procedure 의 DOM 실현 수단 + 재생 캐시(§13). 폐기하지 않음. runtime 층 실패 분리 |
| `work_run_coordination` (Cloud) | **Experience 와 별개** | 동시성 · 재개 조정 전용. 유지 |
| `local_agent_commands` (Cloud) | **Experience 와 별개**(지표 출처) | 명령 시각으로 command wait 를 계산하는 출처로만 사용 |
| usage event (로그) | **향후 대체 가능** | Run Outcome/Metric 의 임시 출처. Local Experience 가 정본이 되면 정제 집계(공유 Digest 의 전 단계)로 역할 축소. `userCorrectionCount` 는 Assistance Event 로 대체 |
| runId / resume | **재사용** | Run identity(재개해도 같은 Run). Assistance Event 의 부착점 |
| targetHint | **재사용** | 재개 시 Target 연속성 |
| `replayPreflight` | **재사용** | 값 확인 Assistance 의 발생원(사례 A) — 결과를 Assistance Event 로 기록 |
| `TAKEOVER_REASONS` · `AUTOMATION_FAILURE_CLASSES` | **재사용** | Failure Event 의 class 어휘. 원인 층(§10-2)은 그 위에 추가 |
| Local SQLite additive migration · "cloud → local write" | **재사용** | 저장 경로. Experience 도 run 종료 시 Local 명령으로 기록 |

---

## 20. 구현 Phase 제안 (설계 승인 이후 · 이번 작업에서 구현하지 않음)

> **2026-10-03 V2 전환으로 동결** — Phase 1 = 완료 자산 승계 · Phase 2 = KEEP_BUT_REPOSITION · Phase 3~5 는 진행하지 않는다. 현재 개발 순서는 [V2 §18](O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md). 아래 표는 V1 시점 기록이다.

| Phase | 내용 | 완료 기준 |
|---|---|---|
| 1 Local Experience 최소 저장 | Run(Outcome+근거 · segments) · Step(모든 run · stage · 결과) · Failure Event(층) 를 Local 에 additive 저장 | 성공/실패/도움 run 모두 Run+Step 이 남는다 |
| 2 User Assistance + User Correction 연결 | Assistance Event 기록 · User Correction 구조(§7-5) · Preferred/Avoid Pattern(§7-6) · 재개 시 Task·slot state 이어받기 · reusable 도움을 다음 run Decision 근거로 recall | 사례 B 에서 두 번째 run 이 메뉴를 묻지 않는다 · 사례 D 에서 다음 run 이 Avoid 경로를 다시 고르지 않는다 |
| 3 Candidate 연결 | 도움 run skip 해제 · Candidate 를 Procedure 하위 수단으로 연결 · runtime 층 실패 분리 | 사례 A 도움 run 이 Candidate 성공으로 집계 |
| 4 Metrics 연결 | 시간 분해(user wait · AI · command wait · exec · settle) · 호출 수 · 비용 | B run 수준의 분해가 자동으로 남는다 |
| 5 Strong Discovery 연결 | provisional Task/Target · Discovery run 이 Experience 를 생성(ARCHITECTURE §2-2 완성 조건) | 처음 보는 업무 1건이 Experience + Procedure 후보를 남긴다 |

이후: Manual/Knowledge ingestion → Knowledge Watch(§8-4) → Promotion Engine → Shared Digest (ARCHITECTURE §10-1 순서).

Phase 1 구조와의 관계(2026-10-01 판정): Phase 1 v6 테이블은 Correction · Knowledge · Preferred/Avoid 를 막지 않는다. `local_work_run_experience_steps` 의 `decided_by` · `stage`, `local_work_run_failures` 의 판단 오류 층, 예약된 `task_key` 에 run_id · seq · stage 로 연결되는 테이블 · 컬럼을 **additive** 로 더하면 된다. Phase 1 은 재설계하지 않는다.

---

## 21. 확정 결정 (2026-10-01 사용자 검토 · D1~D8)

> **2026-10-03**: D1 은 V2 Ownership-first 로 범위가 바뀌었다(§0-1). D2~D8 은 유지.

| # | 결정 | 확정 | 근거 · 의미 |
|---|---|---|---|
| D1 | 다음 run 에서 Local Experience 를 쓰는 방식 | **(a) 질의형 recall** | Cloud 는 Local 원장을 직접 read-back · 동기화하지 않는다. 현재 업무 수행을 위해 Task × Target 등 **제한된 조건으로 Local Agent 에 질의**하고, Local Agent 가 Local 에서 검색 · 선택해 **그 Run 에 필요한 최소 구조화 Experience 만** 반환한다. 서버가 Local DB 를 임의 조회하거나 전체 Experience 를 가져가는 의미가 아니다. 정본 문구: [ARCHITECTURE §5-1](O4O-AUTOMATION-AGENT-ARCHITECTURE-V1.md) |
| D2 | Task identity 결정 주체 | **(a) Discovery Agent 제안 + Local alias 누적** | 사이트별 업무 사전 정의 금지(EVOLUTION §14). 정규화는 공유 단계에서 |
| D3 | slot 값 보존 | **(a) Run 종료 시 삭제(기본)** | "게보린" · "지난달" · 실제 거래처명 · 실제 금액처럼 이번 업무에 쓴 값은 Experience 가 아니다. "나는 보통 A도매를 쓴다" 같은 **개인 기본값은 Experience 가 아닌 별도 personal preference 개념**으로, 사용자가 명시적으로 원할 때 후속 설계에서 다룬다(V1 범위 밖) |
| D4 | Assistance 원문 | **(a) 저장하지 않음** — 제안안 (b) 불채택 | 사용자가 가르치는 문장에는 거래처명 · 환자명 · 직원명 · 내부 메뉴명 · 업무 데이터가 의도치 않게 섞일 수 있다. 원문은 실행 중에만 쓰고, 구조화에 성공한 것만 Experience 로 남긴다. **구조화에 실패한 원문도 저장하지 않는다**(Experience 로 남기지 않음). 실측으로 필요가 확인되면 **명시적 opt-in + 짧은 TTL** 방식으로 별도 검토 |
| D5 | 도움 run 의 Candidate/Procedure 출처 인정 범위 | **(b) 값 확인 도움은 즉시 · 절차 도움은 검증 후** | 사용자 설명("거래관리 → 거래명세서")은 먼저 Knowledge(미검증)이고, 그 경로로 실제 성공하면 Experience, 여러 실행에서 검증되면 Skill(§8 · §13) |
| D6 | agent_inferred 근거의 반영 | **(a) 집계하되 승격 신호에서 제외** | LLM 단독 완료 판정만으로 Skill 신뢰도를 올리지 않는다(§9) |
| D7 | runtime 층 실패의 Candidate failure_count 반영 | **(a) 제외** — Target runtime 지표로만 | 확장 연결 끊김 · site_not_ready 가 "업무 절차가 틀렸다" 는 학습으로 오염되지 않게(§10-2) |
| D8 | 사내 · 개인 시스템 Target 판정 | **(b) 자동 판정 + 사용자 확인** | 사설 IP · 인트라넷 패턴으로 제안, 사용자가 확인. 애매하면 LOCAL_ONLY(§16) |

## 22. 다음 작업

다음 구현 작업은 **`Phase 1 — Local Experience 최소 저장`**(§20) 이며 별도 WO 로 진행한다. 이 문서의 활성화 작업에서는 시작하지 않는다.

개발 중심이 "자동화를 더 잘 실행하는 코드" 에서 **"자동화하면서 경험을 남기는 코드"** 로 처음 이동하는 단계다 — 성공이든 실패든 실제 Run 이 Local Experience 에 남고(무엇을 했는지 · 어디서 실패했는지 · 얼마나 걸렸는지 · 어떤 근거로 성공했는지), 다음 단계(Assistance 연결 · recall)가 그것을 활용한다.

2026-10-01 상태: Phase 1 코드 완료 · 실 PC smoke PENDING. 다음은 Phase 1 실환경 closure, 그 다음 Phase 2(Assistance + Correction).

**2026-10-03 갱신**: V1 트랙은 V2 전환 시점에서 동결됐다(§0-1). 다음 작업은 [V2 §18](O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) 단계 A — Assistant + Task Foundation. V1 구조를 전제로 한 Phase 1 실 PC smoke · 추가 확장은 하지 않는다.

---

## 부록 A. 코드 재확인 (2026-10-01, `origin/main` 7480b9760)

| 사실 | 근거 |
|---|---|
| `local_work_runs` = run_id · status · target_id · goal_summary · note (상태 원장) | `tools/o4o-local-agent/src/local-db.mjs:202-213` |
| `local_work_run_steps` · `local_workflow_candidates` 정의 · "개인 범위 전용 · cloud 미열람" | `local-db.mjs:265-290` |
| 재개 run · 힌트 run → Candidate `skipped` | `apps/api-server/src/services/ai-tools/work-agent-runtime.ts:558-559` |
| Local 저장은 run 끝 명령(`issueWorkRunSetStatus` · `issueWorkflowCandidateSave`)으로 — cloud → local write | `work-agent-runtime.ts:541, 565-568` |
| Candidate 단계 형상 = actionKind · locator(role/name/text) · slot · expect · path (stage 의미 없음 · DOM 전용) | `workflow-candidate.ts:43-82` |
| usage event 키 · `userCorrectionCount: 0` 상수 | `work-agent-contract.ts:551-586` |
| 실패 class 11종 | `automation-recovery-contract.ts:32-56` |
| takeover 사유 20종 · QUESTION 은 `user_judgment_required` | `work-agent-contract.ts:208-224` |
| B 재개 run 시간 분해 · A preflight QUESTION · B candidate skipped | [`CHECK-O4O-MAIN-AUTOMATION-RESUME-AND-REPLAY-PREFLIGHT-FIX-V1`](../checks/CHECK-O4O-MAIN-AUTOMATION-RESUME-AND-REPLAY-PREFLIGHT-FIX-V1.md) §3 |
