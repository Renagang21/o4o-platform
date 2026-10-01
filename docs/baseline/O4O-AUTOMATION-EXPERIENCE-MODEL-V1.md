# O4O-AUTOMATION-EXPERIENCE-MODEL-V1

> **상태**: DRAFT — 사용자 검토 대기 (§17 결정 사항 확정 후 ACTIVE 전환 · `CANONICAL-INDEX` 등재는 그때)
> **작성일**: 2026-10-01 · **최종 갱신**: 2026-10-01
> **근거 WO**: `WO-O4O-AUTOMATION-CANONICAL-ENTRYPOINT-ALIGNMENT-AND-EXPERIENCE-MODEL-DESIGN-V1` Phase B (= `WO-O4O-AUTOMATION-EXPERIENCE-MODEL-DESIGN-V1`)
> **상위 정본**: [`O4O-AUTOMATION-AGENT-ARCHITECTURE-V1`](O4O-AUTOMATION-AGENT-ARCHITECTURE-V1.md) §4 (Experience as Asset) · §5 (Local/Shared) · §9 (Promotion) — 그 위 [`O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1`](O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md)
> **근거 census**: [`IR-O4O-AUTOMATION-AGENT-ARCHITECTURE-REALIGNMENT-V1`](../investigations/IR-O4O-AUTOMATION-AGENT-ARCHITECTURE-REALIGNMENT-V1.md) §3·§5 + 이 문서 부록 A 의 코드 재확인
> **성격**: **개념 모델 + 저장 계약**. DB 테이블 · enum · API · 구현이 아니다. 이름은 의미를 고정하기 위한 것이며 코드 식별자는 구현 WO 가 정한다.

---

## 0. 이 문서가 답하는 질문

> **오늘 사용자가 Agent 에게 무언가를 가르쳐 줬다면, 내일 Agent 는 무엇을 알고 있어야 같은 질문을 하지 않는가?**

더 넓게: 한 번의 실행에서 무엇을 남겨야 다음 실행이 **더 빠르고 · 더 정확하고 · 사용자 도움이 적고 · AI 비용이 낮아지는가**.

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
| slot state | 각 slot 이 채워졌는가 · 어디서 왔는가(요청 / 사용자 답 / 기본값 / Knowledge) — **값은 Local 에만, 공유 안 함** |
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
원문                  raw             : 기본 저장 안 함 (§7-4)
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
원문: 저장 안 함(기본). 구조화 실패 시에만 Local 에 짧게, 보존 기한부(§17 결정 D4)
```

- 값 확인 답(예: "게보린")은 slot state 로만 들어가고 Experience 의 재사용 지식이 되지 않는다.
- 구조화된 내용에 고객명·환자명·금액 같은 업무 데이터가 섞이면 그 필드는 버린다(§16).

---

## 8. Knowledge / Manual

| | Knowledge | Experience | Skill |
|---|---|---|---|
| 정의 | 외부에서 얻은 설명 · 매뉴얼 · 문서 · 사용자 설명 | 실제 실행에서 확인된 사실 | 반복 경험으로 신뢰도가 오른 실행 방법 |
| 신뢰 | 미검증 주장 | 관찰된 사실(근거 등급 있음) | 조건부 신뢰(승격 상태 보유) |
| 예 | "거래관리 → 거래명세서" (매뉴얼 p.12) | 그 경로로 실제 진입 성공(run X) | 여러 run 성공 → 표준 단계 후보 |

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
| slot 값 | **OPTIONAL · LOCAL_ONLY · 기한부** | 재개용. Run 종료 후 보존 여부는 §17 결정 |
| Assistance 원문 | **DO_NOT_STORE(기본)** | 구조화 실패 시 예외 — §17 결정 |
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
| slot 값(약품명 · 거래처 · 기간 · 금액) | LOCAL_ONLY (또는 저장 불필요) |
| 사용자의 실제 거래금액 · 거래처 실명 | LOCAL_ONLY 또는 DO_NOT_STORE |
| 요청 원문 · 사용자 답변 원문 | LOCAL_ONLY(요청 요약) / DO_NOT_STORE(답변 원문 기본) |
| 개인 환경(PC 이름 · 경로 · 계정 식별자) | LOCAL_ONLY |
| 환자명 · 고객명 · 주민번호 · 연락처 · 처방 내용 | DO_NOT_STORE |
| 비밀번호 · OTP · 인증서 · 토큰 | DO_NOT_STORE |

규칙: 구조화 단계에서 업무 데이터로 판정되는 필드는 버린다. 판정이 애매하면 LOCAL_ONLY 로 둔다.

---

## 17. Shared Experience 인터페이스 (DB · API · 동의 UX 는 후속)

- 공유 단위: **Experience Digest** — Task × Target(public) 하나에 대한 정제된 요약.
  - Task identity · Target identity(public 만) · stage 경로와 semantic locator · reusable Assistance/Knowledge 의 구조화 내용 · 실패 층 분포 · 시간 · 성공률(구간화) · 환경 등급.
- 정제 순서: ① SHAREABLE 필드만 선택 → ② 값·원문·개인 환경 제거 → ③ 수치 구간화 → ④ 사용자 동의 → ⑤ 명시적 publish.
- 서버는 Local 을 read-back 하지 않는다. Digest 는 Local 이 만들어 올린다.
- 수신 측에서 공유 Digest 는 **Knowledge(미검증 주장)** 로 들어온다 — 다른 사용자 PC 에서 바로 Skill 로 쓰지 않는다(ARCHITECTURE §5).

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
  A1.resolution = resolved (slot 채움 · 값은 Local slot state 에만)
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

| Phase | 내용 | 완료 기준 |
|---|---|---|
| 1 Local Experience 최소 저장 | Run(Outcome+근거 · segments) · Step(모든 run · stage · 결과) · Failure Event(층) 를 Local 에 additive 저장 | 성공/실패/도움 run 모두 Run+Step 이 남는다 |
| 2 User Assistance 연결 | Assistance Event 기록 · 재개 시 Task·slot state 이어받기 · reusable 도움을 다음 run Decision 근거로 recall | 사례 B 에서 두 번째 run 이 메뉴를 묻지 않는다 |
| 3 Candidate 연결 | 도움 run skip 해제 · Candidate 를 Procedure 하위 수단으로 연결 · runtime 층 실패 분리 | 사례 A 도움 run 이 Candidate 성공으로 집계 |
| 4 Metrics 연결 | 시간 분해(user wait · AI · command wait · exec · settle) · 호출 수 · 비용 | B run 수준의 분해가 자동으로 남는다 |
| 5 Strong Discovery 연결 | provisional Task/Target · Discovery run 이 Experience 를 생성(ARCHITECTURE §2-2 완성 조건) | 처음 보는 업무 1건이 Experience + Procedure 후보를 남긴다 |

이후: Manual/Knowledge ingestion → Promotion Engine → Shared Digest (ARCHITECTURE §10-1 순서).

---

## 21. DRAFT — 사용자가 결정해야 할 사항

| # | 결정 | 선택지 | 제안 |
|---|---|---|---|
| D1 | **재개·다음 run 에서 Local Experience 를 어떻게 불러오나** — 현행 불변식 "cloud 는 Local 을 read-back 하지 않는다" 와의 관계 | (a) 질의형 recall: 서버가 Task×Target 을 묻고 Local 이 필요한 구조 정보만 돌려줌(현재 Candidate 대조와 같은 방식) (b) 서버 단기 저장(coordination 에 구조 정보만) (c) recall 없음 | **(a)** — 이미 Candidate 재생이 같은 형태. 불변식을 "전체 read-back 금지 · 질의형 recall 허용" 으로 명확화 필요 |
| D2 | Task identity 를 누가 정하나 | (a) Discovery Agent 가 제안 + Local alias 누적 (b) 운영자가 정의한 목록 (c) 혼합 | **(a)** — 사전 정의 금지(EVOLUTION §14). 공유 단계에서 정규화 |
| D3 | slot 값 보존 | (a) Run 종료 시 삭제 (b) Local 에 기한부 보존(재개·개인 기본값용) | (a) 기본 + 개인 기본값은 별도 personal_preference 로 |
| D4 | Assistance 원문 | (a) 저장 안 함 (b) 구조화 실패 시만 Local 기한부 | **(b)** — 기한 짧게(예: 30일). 공유 금지 |
| D5 | 도움 run 을 Candidate/Procedure 출처로 인정하는 범위 | (a) 모든 도움 run (b) 값 확인 도움만 즉시, 절차 도움은 검증 1회 후 | (b) |
| D6 | Outcome 근거 agent_inferred 의 반영 | (a) 집계하되 승격 신호 제외 (b) 낮은 가중 | (a) |
| D7 | runtime 층 실패의 Candidate failure_count 반영 | (a) 제외 (b) 별도 카운터 | (a) — Target runtime 지표로만 |
| D8 | 사내·개인 시스템 Target 판정 | (a) 사용자가 표시 (b) 자동(사설 IP · 인트라넷 패턴) + 사용자 확인 | (b) |

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
