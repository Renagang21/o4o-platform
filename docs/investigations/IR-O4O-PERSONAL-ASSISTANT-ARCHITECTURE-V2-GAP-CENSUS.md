# IR-O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2-GAP-CENSUS

> **상태**: COMPLETED (조사 전용) — 구현 WO 없음. V2 구조 확정은 이 IR 과 외부 기술 조사를 대조한 뒤 별도 결정
> **작성일**: 2026-10-02
> **근거**: `WO-O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2-GAP-CENSUS` (사용자 지시 2026-10-02, WO 문서 없음 — 이 IR 이 기록)
> **기준 커밋**: `origin/main` 03b9c8bc4
> **성격**: 코드 · DB · migration · 배포 · DEPLOY_FREEZE · Chrome extension · Local Agent 변경 **0건**. Strong Discovery smoke · waiting run resume · Local Agent 재기동 **0건**. `87ebdb074` 의 `BLOCKED_FREEZE` 상태 무변경.
> **선행 IR**: [`IR-O4O-AUTOMATION-AGENT-ARCHITECTURE-REALIGNMENT-V1`](IR-O4O-AUTOMATION-AGENT-ARCHITECTURE-REALIGNMENT-V1.md) (2026-10-01) — 그 IR 은 6계층 안의 균형(Execution 편중)을 봤고, 이 IR 은 **6계층 위에 Personal Assistant 계층이 있는가 · 실행 PC 와 기억이 분리돼 있는가**를 본다.
> **관련 정본**: [`O4O-AUTOMATION-AGENT-ARCHITECTURE-V1`](../baseline/O4O-AUTOMATION-AGENT-ARCHITECTURE-V1.md) · [`O4O-AUTOMATION-EXPERIENCE-MODEL-V1`](../baseline/O4O-AUTOMATION-EXPERIENCE-MODEL-V1.md) · [`O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1`](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md)

---

## 판단 기준 (WO 고정)

> O4O 는 RPA/자동화 제품이 아니라 소규모 사업자의 개인 업무 비서다. 사용자의 업무 의도와 상황을 이해하고, 필요한 업무정보와 경험을 기억하며, 업무를 계획·수행·검증한다. RPA, Computer Use, API, MCP, Skill, Worker 및 개별 PC 는 이 비서가 필요에 따라 선택하는 하위 실행수단이다.

조사 방법: 실제 호출 경로를 따라 5개 축(요청 흐름·latency / 관찰 능력 / Experience·Skill / Node·Worker·Ingress / 계층·ProductMaster·데이터 경계)을 병렬 추적하고, 결론에 쓰인 핵심 주장은 원 코드에서 다시 확인했다(§부록 A). 숫자는 **[code]**(코드에서 도출) 와 **[measured]**(CHECK 문서 실측) 를 구분한다. 추측 숫자는 쓰지 않았다.

---

## A. Executive finding

**현재 O4O 는 "RPA 중심 Hybrid" 다. Personal Assistant 계층(L1)은 존재하지 않는다.**

1. **L1 부재.** 요청은 매번 단일 `message` 하나로 들어오고(`ai-proxy.routes.ts:1855-1860`), 대화 이력 · 사용자 업무 context · 선호 profile 이 없다. 요청 사이를 잇는 유일한 연속성은 같은 run 의 `runId` 재개뿐이다.
2. **업무 판단과 UI 조작이 한 planner 에 섞여 있다.** `WORK_PLANNER_SYSTEM_PROMPT` 가 "다음 행동 하나" 를 고르면서 동시에 `task` · `stage` · `strategy` · 완료 여부까지 선언한다(`work-agent-runtime.ts:234-292`). Goal 객체에는 완료 조건이 없고(`work-agent-contract.ts:83-95`), 완료는 planner LLM 이 `done` 을 내면 끝이다.
3. **기억이 실행 PC 에 묶여 있다.** Experience · Workflow Candidate · Preferred/Avoid · run context 는 전부 그 PC 의 `local.db` 에 있고 user 차원이 없다. 같은 사용자가 다른 PC 에서 요청하면 경험이 없는 상태에서 시작하며, 다른 PC 로 재개하면 context recall 이 조용히 비어 버린다(§I).
4. **브라우저 관찰은 사람의 화면이 아니다.** LLM 은 확장이 고른 DOM 후보 최대 80개의 텍스트 목록만 본다. 스크린샷 · vision · 좌표 · 스크롤 · Enter 키가 브라우저 경로에 없다(§E).
5. **느림의 주원인은 AI 가 아니라 명령 프로토콜이다.** 실측 게보린 run 48.69 s 중 Local 명령 대기 44.0 s, AI 계획 ≈8.0 s [measured]. 모든 DOM 명령이 Cloud DB insert → agent 폴링 → 4단 IPC → 결과 POST → Cloud DB 폴링을 순차로 지난다(§D).
6. **그러나 폐기 대상은 거의 없다.** Execution(DOM·UIA·visual) · 안전 경계 · Experience 구조 기록 · Workflow Candidate(값 없는 semantic step + 슬롯 + AI fallback) 는 목표 구조의 L3/L4 로 그대로 재배치할 수 있다. 문제는 **계층이 아래에서부터만 쌓였고 위(L1·L2)와 분리 축(기억 ≠ 실행 PC)이 없다는 것**이다.

---

## B. AS-IS architecture

```text
 [frontend: Neture Home Composer · /hospital-drug]      ← 유일한 ingress (사용자 JWT · 동기 HTTP ≤90 s)
            │ POST /api/ai/request
            ▼
 ┌─────────────────────── Cloud (api-server) ───────────────────────────────┐
 │ classifyUnifiedRequest  (결정론 키워드: chat / work / confirm_work)        │
 │ resolveWorkTarget       (allowlist 별칭: healthkr · o4o.neture · 앱 4)     │
 │ classifyTaskModality    (screen→openai · research→gemini …)               │
 │                                                                          │
 │ runWorkAgent  ── 단일 loop (14 step · 8 plan · 90 s)                      │
 │   ├ Workflow Candidate match → 결정적 replay → (어긋나면) AI loop         │
 │   ├ observe → LLM planner (업무판단 + UI조작 + 완료판정 동시) → validate   │
 │   ├ execute (명령 1개씩 순차)                                             │
 │   └ finish → experience_record · candidate_save                          │
 │                                                                          │
 │ Cloud 저장: work_run_coordination (상태·버전·TTL 만) · local_agent_*      │
 └───────────────┬──────────────────────────────────────────────────────────┘
                 │ local_agent_commands (DB 큐) ⇄ heartbeat 폴링 / result POST
                 ▼
 ┌──────────── Execution PC (사용자 1 PC) ─────────────────────────────────┐
 │ o4o-local-agent  ── local.db (Experience · Candidate · Pattern · Context) │
 │   ├ named pipe → native-host → Chrome 확장 SW → content script (DOM)      │
 │   └ PowerShell UIA · computer input/capture (Windows 앱)                  │
 └──────────────────────────────────────────────────────────────────────────┘
```

별도 경로: `pharmacy-web-executor.ts` + `healthkr-adapter.ts` 의 **결정론 health.kr 검색**(LLM planner 0회)이 있으나, home-chat tool 선택(`ai-tool-router.ts:1403-1410`)에서만 쓰이고 `/api/ai/request` 의 work 경로에서는 쓰이지 않는다(§C).

---

## C. 실제 health.kr request sequence — "약학정보원에서 게보린을 찾아줘"

### C-1. 라우팅 결론

- `classifyUnifiedRequest` 가 `찾아` 를 task 동사로 보고 **work** 로 보낸다(`unified-request-router.ts:134-149`, 호출 `ai-proxy.routes.ts:2248`) → `performWorkAgentRun` → **범용 LLM planner loop**.
- 결정론 health.kr adapter 는 이 요청에서 **쓰이지 않는다**. 같은 사이트에 대해 "이미 아는 절차(adapter)" 와 "범용 Discovery loop" 가 공존하지만, 둘을 고르는 판단 계층이 없다.

### C-2. 단계별 표 (Candidate replay 없는 신규 run)

RT = Cloud↔Local 명령 왕복 1회.

| 단계 | 위치 (file:line) | 실행 위치 | 판단 주체 | RT | LLM |
|---|---|---|---|---|---|
| request ingress | `ai-proxy.routes.ts:2201-2286` | Cloud | code | 0 | 0 |
| intent / task 해석 | `unified-request-router.ts:134-149` (키워드) · `task-modality-router.ts:124-134` | Cloud | code | 0 | 0 |
| target resolution | `work-agent-runtime.ts:622` `resolveWorkTarget` | Cloud | code (allowlist) | 0 | 0 |
| target prepare (탭 재사용) | `:1102` → `work-target-executor.ts:33` | Cloud→Agent→확장 | code | 1 | 0 |
| run 생성 | `:1129` (Cloud) · `:1135` `work_run_upsert` | Cloud + Local | code | 1 | 0 |
| experience recall (task key 목록) | `:1170` | Local SQLite | code | 1 | 0 |
| observation | `:1261-1302` `dom.get_context` + `dom.inspect` | 확장 content script | code | 2 | 0 |
| workflow match | `:1477` `candidate_match` | Local | code | 1 | 0 |
| **planner** | `:1525` → `createLlmPlanner` `:457-523` | Cloud → OpenAI `gpt-6-astra` | **LLM** | 0 | 1 / turn |
| proposal 검증 | `work-agent-contract.ts:469` | Cloud | code | 0 | 0 |
| task pattern recall | `:1568-1573` — 패턴이 있으면 제안 폐기 후 **재계획** | Local | code | 1 | +1 |
| action 실행 | `:1312-1395` · batch `:1735-1765` | 확장 content script | code | 1 / action | 0 |
| 결과 관찰 | `:1761-1765` settle 700 ms + `observe` | 확장 | code | ≥2 | 0 |
| verification / 완료 판단 | 다음 planner turn 이 `done` / `takeover(goal_sufficiently_advanced)` (`:1615-1631`) | Cloud → OpenAI | **LLM** | 0 | 1 (+ `read_table` 시 추가) |
| experience 기록 | `finish` `:960-993` · `:794-866` | Cloud + Local | code | 3-4 | 0 |

### C-3. Sequence (탭이 열려 있고 첫 관찰까지 끝난 상태부터)

```text
Cloud runtime              OpenAI          Agent(poll)       확장 SW / content
plan T1 ─────────────────▶ gpt-6-astra
       ◀── {actions:[set_input "게보린", click "검 색"]}
validate
INSERT set_input ───────────────────────▶ heartbeat ─▶ pipe→host→SW→CS  setNativeValue (+200 ms)
await (DB poll 250 ms) ◀────── /result ◀── reply
  [changed=false → 계속 · changed=true → batch 중단 후 재관찰]
INSERT click ───────────────────────────▶ heartbeat ─▶ … CS el.click → pagehide → navigated
await ◀────────────────────── /result
settle 700 ms
get_context × N (새 문서까지 700 ms 간격, ≤10) ─▶ …
inspect ────────────────────────────────▶ …
plan T2 ─────────────────▶ gpt-6-astra ◀── done | takeover(goal_sufficiently_advanced) | read_table → T3
finish: set_status · candidate_save · experience_record (RT 3)
```

---

## D. Latency / round-trip 분석

### D-1. 실측 [measured]

| 출처 | run | 총 시간 | 구성 |
|---|---|---|---|
| [`CHECK-…-RESUME-AND-REPLAY-PREFLIGHT-FIX-V1`](../checks/CHECK-O4O-MAIN-AUTOMATION-RESUME-AND-REPLAY-PREFLIGHT-FIX-V1.md) §3-0 | 게보린 재개 run B | **48.69 s** | Local 명령 9개 = **44.0 s** · AI 계획 2회 ≈ **8.0 s** (5.1 + 2.9) · settle 0.7 s |
| 같은 문서 | run A (질문으로 종료) | 30.36 s | Local 명령 6개 ≈ 30.3 s · AI 0 |
| [`CHECK-…-LOCAL-EXPERIENCE-MINIMUM-STORAGE-V1`](../checks/CHECK-O4O-AUTOMATION-LOCAL-EXPERIENCE-MINIMUM-STORAGE-V1.md):114 | 타이레놀 run | 23.27 s | AI 8.93 s / 2회 · command_wait 6.61 s · execution 3.73 s · settle 0.7 s · step 10 |
| [`CHECK-…-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1`](../checks/CHECK-O4O-WEB-AUTOMATION-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1.md):188-236 | 여러 run | 61.5 · 65.2 · 64.9 · 100.6 s | 명령 11-12개 · "명령 1개당 ~5초" |

- 명령당 PC 실처리는 수십~수백 ms 다. 명령당 ≈5.1 s 는 agent 의 고정 5 s 폴링 대기였다.
- 폴링을 active/idle 2단(250 ms → 500 ms → 1 s → idle 5 s)으로 바꾼 `d68e6a24a` 이후의 **실 PC 재측정은 PENDING** 이다([`CHECK-…-POLLING-LATENCY-V1`](../checks/CHECK-O4O-LOCAL-AGENT-COMMAND-POLLING-LATENCY-V1.md) §5). 타이레놀 run 이 어느 폴링 스케줄에서 측정됐는지는 문서에 없다. 따라서 **현재 latency 는 미측정**이다.

### D-2. type + Enter 구간 구조 [code]

| | 배치 (최선) | 비배치 |
|---|---|---|
| 행동을 위한 LLM 호출 | 1 | 2 |
| 완료 판단 LLM 호출 | +1 (표 읽기 시 +1) | +1 |
| action proposal | 1 (행동 2개 포함) | 2 |
| 행동 RT | 2 | 2 |
| 행동 후 관찰 RT | ≥2 (get_context × N + inspect) | 같음 |
| 고정 대기 | settle 700 ms + 재시도당 700 ms + content script 200/300 ms | 같음 |

검색창을 "알아보는" 단계는 별도 `find` 없이 첫 관찰(RT 2) + 첫 계획 LLM 1회다.

### D-3. 왜 단순 type + Enter 가 느린 구조인가

1. **명령 1개 = 왕복 1회, 전부 순차.** DOM 명령마다 Cloud DB insert → agent heartbeat HTTP → named pipe → native host → service worker → content script → 역방향 4단 → result HTTP → Cloud DB 폴링(250 ms). 에이전트 HTTP 2회 + 로컬 IPC 10홉 [code]. 배치는 **LLM 호출만** 줄이고 명령 왕복은 줄이지 않는다(`work-agent-runtime.ts:1735-1765`).
2. **브라우저에 Enter 가 없다.** `key` 행동은 `uia` 표면 전용이다(`work-agent-contract.ts:369-371` → `SURFACE_MISMATCH`). 검색은 항상 "입력" + "검색 버튼 click" 두 행동이고, "입력 후 제출" 결합 행동이 없다.
3. **관찰이 무겁고 매번 두 명령이다.** 관찰 = `get_context` + `inspect` 2 RT, 페이지 이동 후에는 새 문서가 뜰 때까지 `get_context` 를 700 ms 간격으로 최대 10회 반복한다.
4. **완료 확인에 LLM 1회가 항상 붙는다.** Goal 에 완료 조건이 없으므로 결과 화면을 보고 "끝났다" 고 판단하는 것도 planner 의 몫이다. Workflow replay 뒤에도 마찬가지다(`work-agent-runtime.ts:1411`).
5. **장부 명령이 실행 경로에 끼어 있다.** run upsert · task key recall · candidate match · pattern recall · set_status · candidate_save · experience_record 가 모두 같은 순차 명령 큐를 쓴다(신규 run 기준 5-7 RT). 기억이 실행 PC 에 있기 때문에 생기는 비용이다.
6. **task 선언 시 재계획.** planner 가 task 를 처음 선언하면 패턴 recall 후 제안을 버리고 다시 계획한다(`:1568-1573`).

정리: 사람의 "검색창 확인 → 입력 → Enter" 3동작이 O4O 에서는 **관찰 2 RT + LLM 1 + 행동 2 RT + 이동 대기·재관찰 ≥2 RT + 완료 LLM 1 + 장부 RT** 가 된다. 지연의 성격은 "AI 가 어렵게 생각한다" 가 아니라 **"원격 순차 명령 프로토콜 + 행동 원자성 과세분 + 기억의 원격 위치"** 다.

---

## E. Browser observation capability matrix

B = Browser (Chrome 확장) · W = Windows (UIA + computer use).

| 능력 | B | W | 근거 |
|---|---|---|---|
| full DOM / full tree | NOT_SUPPORTED | NOT_SUPPORTED | `content-script.js:13-15` (innerHTML 없음) · `windows-uia-host.ps1:51-52` (150개 · 깊이 12) |
| interactive candidate subset | SUPPORTED — 고정 selector, 문서 순서 **첫 80개**, name 80자 · text 120자, 좌표 없음 | SUPPORTED — DFS 150개 | `content-script.js:50, 104-111, 263-295` · `windows-uia.mjs:106-121` |
| accessibility tree | PARTIAL — 평면 목록, 계층 없음 | PARTIAL — 실제 UIA 지만 평면화 | `content-script.js:205-234` |
| semantic element reference | PARTIAL — `e_n` snapshot 범위, 최근 2개 snapshot | PARTIAL — 최근 5개 · automationId 재식별 | `content-script.js:258, 299` · `windows-uia.mjs:35, 189` |
| visible page text | PARTIAL — `read_text` 2000자 → prompt 600자 · `read_table` prompt 8행 | PARTIAL — name/value 80자 | `work-agent-runtime.ts:193, 1723-1728` |
| screenshot | NOT_SUPPORTED — manifest 권한 `sidePanel, tabs, nativeMessaging` 뿐 | SUPPORTED — 전면 창 client 영역 JPEG ≤1280 | `manifest.json:18` · `windows-computer-inspect.ps1:66-126` |
| vision (이미지 → LLM) | NOT_SUPPORTED (사용자 첨부 이미지만) | PARTIAL — UIA 실패 후 visual fallback 에서만 · gemini/openai 만 | `work-agent-runtime.ts:1212, 1527, 467-513` |
| coordinates | NOT_SUPPORTED (prompt 가 좌표 금지) | SUPPORTED — 0..1 정규화 | `work-agent-runtime.ts:264` · `windows-computer-input.ps1:150-175` |
| zoom / crop | NOT_SUPPORTED | NOT_SUPPORTED | `windows-computer-inspect.ps1:97` |
| keyboard | PARTIAL — `set_input` 값 주입만, **키 입력·Enter 없음** | PARTIAL — ENTER/TAB/ESC/CTRL+ENTER | `content-script.js:409-440` · `windows-uia.mjs:30` |
| mouse | PARTIAL — `el.click()` 만, 스크롤·hover·drag 없음 | PARTIAL — 좌클릭·더블클릭만 | `content-script.js:491-539` · `windows-computer-input.ps1:18` |
| arbitrary JavaScript | NOT_SUPPORTED (의도적) | n/a | `content-script.js:14` |
| network / console | NOT_SUPPORTED | NOT_SUPPORTED | manifest |
| iframe / shadow DOM | NOT_SUPPORTED — top frame 만 | n/a | `manifest.json:20-26` |
| 허용 사이트 | neture.co.kr · health.kr **2개 origin 뿐** | 등재 앱 allowlist | `manifest.json:19` |

**결론**: 브라우저 경로의 LLM 은 사람과 같은 화면을 보지 않는다. **확장이 고른 DOM 후보의 앞 80개 텍스트 목록**을 본다(prompt 헤더도 "M 개 중 N 개" 로 잘렸음을 알린다 — `work-agent-runtime.ts:351`). 레이아웃 · 이미지 · canvas · 81번째 이후 요소 · iframe 안은 보지 못한다. Windows 경로는 텍스트 우선이고 UIA 가 실패한 뒤에만 실제 픽셀을 본다. 최신 Computer Use 의 "구조 트리 + 스크린샷을 한 agent 가 함께 쓰는" hybrid 관찰은 **어느 경로에도 없다**.

참고(문서 drift 아님 · 코드 주석): `work-agent-runtime.ts:372-373` 주석은 "openai 는 이미지 입력 경로가 없다" 고 쓰지만 아래 코드(`4de158a09`)는 openai vision 분기를 갖고 있다. 범위 밖이라 수정하지 않았다.

---

## F. Layer mapping

| 계층 | 판정 | 현재 자산 | 비고 |
|---|---|---|---|
| **L1 Personal Assistant** | **ABSENT** | 없음. `/home-chat` · `/request` 는 단일 message, `ai-tool-router.ts:20-28` 은 "tool 최대 1회 → LLM 1회" | 대화 이력 · 사용자 업무 context · 선호 profile 저장소 없음. `personal_preference` 는 분류 라벨일 뿐 profile 로 쓰이지 않음(`work-assistance.ts:31, 142`) |
| **L2 Task / Workflow** | **PARTIAL (암묵)** | LLM 이 선언하는 `task` · `stage` key, `local_work_run_context`(재개 frame) | Task 객체 · 분해 · 완료 계약 없음. 계약이 "general workflow engine · planner state machine" 을 명시적으로 금지(`work-agent-contract.ts:41-44`) |
| **L3 Skill / Procedure** | **PARTIAL** | `workflow-candidate.ts`(값 없는 semantic step + `{{n}}` 슬롯) · `local_experience_patterns`(Preferred/Avoid) · 하드코딩 절차 `pharmacy-web-executor.ts` · `healthkr-adapter.ts` · supplier adapter | 범용 skill registry 없음. 하드코딩 절차와 학습된 절차가 서로를 모름 |
| **L4 Execution** | **EXISTS** | `browser-dom-executor.ts` · `windows-uia-executor.ts` · `windows-computer-executor.ts` · `work-target-executor.ts` · API tool | MCP 없음. 실행 방식 우선순위 정책은 `automation-execution-contract.ts`(api > dom > uia > computer_use) |
| **L5 Execution Node** | **EXISTS (단일 노드 가정)** | `tools/o4o-local-agent` · Chrome 확장 · `local_agent_devices` | capability 선언 없음 · 다중 노드 선택 없음(§I) |

**혼합 위치**: A(업무 판단) 와 B(UI 조작) 는 `WORK_PLANNER_SYSTEM_PROMPT`(`work-agent-runtime.ts:234-292`) **한 곳**에서 같은 JSON 출력(`{assessment, action, actions, task, stage, strategy, ask, userInput}` — `:291`, 타입 `work-agent-contract.ts:252-278`)으로 동시에 결정된다. 앞단 두 router 는 결정론 키워드 분류로 경로만 고르고 업무를 이해하지 않는다.

---

## G. Experience / Memory classification

모든 Experience 저장소는 PC 1대의 `%LOCALAPPDATA%\o4o-local-agent\local.db` 에 있다(`local-db.mjs:77-85`). **local 테이블 어디에도 user 차원이 없다** — device 1 = user 1 이라는 가정 위에 있다.

| 저장소 | 위치 | 내용 | 분류 | Local 이어야 하는가 / Cloud 여야 하는가 |
|---|---|---|---|---|
| `local_work_runs` | Local | run 헤더 · task_key · outcome · **goal_summary(요청 원문 ≤200자)** | Task/Workflow Experience | 사용자 계정을 따라가야 함 → Local 일 이유 약함 |
| `local_work_run_segments` | Local | 시간 · AI 호출 · 대기 ms | Execution/RPA Trace (metric) | 집계는 Cloud 가 유용. 원 trace 는 어디든 가능 |
| `local_work_run_experience_steps` | Local | stage · action_kind · method · semantic locator · decided_by | Execution/RPA Trace | 사이트 단위 절차 학습 재료 → 계정 소속 |
| `local_work_run_failures` | Local | 실패 층 · 복구 tier | Execution/RPA Trace | 공통 Skill 승격 재료(UI 변경 감지) |
| `local_work_run_steps` · `local_workflow_candidates` | Local | 값 없는 semantic step + `{{n}}` 템플릿 · 성공/실패 수 | **Procedural/Skill Memory** | 계정 소속. 대상 사이트 공통 부분은 공통 Skill 후보 |
| `local_work_run_context` | Local | 재개 frame(task · stage · slot 종류 · 전략) | Task/Workflow Experience | **run 소속** — 노드와 무관해야 함(현재 노드에 묶여 재개 이동 불가) |
| `local_work_run_assistance` · `_corrections` | Local | 구조화된 도움 · 교정(원문 미저장) | **Assistant Experience** | 사용자 계정을 따라가야 함 |
| `local_experience_patterns` | Local | Task × Target × Stage 의 Preferred/Avoid 전략 | Assistant / Procedural | 계정 소속. 다수 사용자 검증 시 공통 Skill 후보 |
| `local_datasets` · `local_dataset_rows` 등 | Local | 원내 약품 등 사용자 파일 import(원 행) | Device-local business data | 업무 데이터 — Experience 아님(§H) |
| `local_source_bindings` | Local | 로컬 파일 경로 | Device-local Runtime State | **Local 이 맞음** |
| `credentials.json` | Local 파일 | deviceId · agentCredential | Credential/Secret | **Local 이 맞음** |
| backups `*.db` | Local | DB 스냅샷 5개 | Device-local | Local |
| `work_run_coordination` | Cloud | run_id · user_id · device_id · status · version · TTL 30분 | Device/Run Runtime State | Cloud 맞음. 단 내용 없음 |
| `local_agent_commands` | Cloud | 명령 큐 · 감사(인자는 claim 시 삭제) | Execution transport | Cloud |
| `local_agent_devices/pairings/sessions` | Cloud | user_id · credential hash | Credential | Cloud |

판단:

- **Device 에 묶여야 할 것은 credential · 로컬 파일 경로 · 로그인 세션 · 현재 화면뿐이다.** 나머지 Experience 는 성격상 **사용자 계정 또는 run** 에 속하는데, 현재는 "개인정보 최소화 → Local-first" 원칙(ARCHITECTURE §5 · §5-1) 때문에 전부 실행 PC 에 놓였다.
- 그 결과 (1) 다른 PC · 다른 채널에서 같은 사용자의 경험이 없고, (2) 매 run 의 recall · 기록이 실행 경로의 순차 명령 RT 가 되며(§D-3-5), (3) 재개 run 을 다른 PC 로 옮길 수 없다.
- task key 는 LLM 이 자유 선언하는 문자열(`TASK_KEY_RE`, `work-assistance.ts:17`)이고 항상 `task_provisional=1` 이다. Candidate 는 task key 가 아니라 `(target_id, request_template)` 로 식별된다 — 같은 업무를 다르게 말하면 다른 Candidate 다(정규식 전체 일치, `local-db.mjs:1014-1041`).

### G-1. 원칙과 구현의 어긋남 (문서 drift 보고 — 수정 안 함)

- EXPERIENCE-MODEL D3 "slot 값은 Run 종료 시 삭제" 와 달리 `local_work_runs.goal_summary` 가 **값이 들어간 요청 원문**(예: 약 이름)을 무기한 보관한다(`local-db.mjs:196-206`, 기록 `work-agent-runtime.ts:1137`). 삭제 코드 없음. Experience 테이블 전체에 TTL/purge 없음.
- `buildWorkflowLocator`(`workflow-candidate.ts:114`)는 click 대상의 name/text 를 locator 로 쓴다. 검색 **결과 링크**를 클릭한 경우 그 텍스트(값)가 `steps_json` 에 들어가, 다음 replay 에서 새 검색어로 입력하고도 옛 결과를 클릭할 수 있다 [code, 실측 없음].

---

## H. Cloud vs Personal vs Local data classification

WO 지시대로 사업 운영 데이터와 환자/건강정보를 같은 범주로 두지 않는다.

| 데이터 | O4O Cloud 가능/필요 | Personal Data Store 후보 | Execution Node local 필요 | 고위험 별도 영역 | 공통 Knowledge |
|---|---|---|---|---|---|
| 제품명 · ProductMaster ID | ● (이미 Cloud 정본) | | | | ● |
| 가격 · 재고 · 판매량 · 주문량 | ● (업무 비서가 기억해야 할 운영정보) | ○ | | | |
| 거래처 · 주문이력 | ● (B2B 주문은 이미 `checkout_orders`) | ○ | | | |
| 업무 선호 · 업무 패턴 | ● (계정 소속) | ● | | | |
| Automation Experience · Procedural Memory · Skill | ● (계정 소속) | | | | ○ (다수 검증 후) |
| 환자 · 건강정보 | | ○ | | ● | |
| 원내 약품 파일 원 행 | ○ (사업장 판단) | ● | ● (파일 원본·경로) | | |
| password · OTP | | | (입력 순간만, 저장 금지) | ● | |
| cookie · 로그인 session | | | ● | | |
| 현재 화면 · 일시 입력값 | | | ● | | |

● 주 위치 · ○ 조건부 후보.

현재 코드와의 비교:

- **저장 규칙은 엄격하다.** Local 테이블마다 원문 · 화면 글 · DOM · 캡처 · 입력값 · 인증정보 저장 금지가 명시돼 있고(`local-db.mjs:199-200, 262, 304-305, 390`), Cloud coordination 은 내용을 전혀 갖지 않는다(`work-agent-contract.ts:33-34`). password/OTP 입력 차단도 이중이다(`computer-use-contract.ts:98-146` · `content-script.js:120, 276`).
- **그러나 그 경계는 "LLM 에 보내는 것" 에는 적용되지 않는다.** 요청 원문 · 사용자 답변 · 관찰된 요소 이름/텍스트 · `lastRead`(최대 600자) · 화면 캡처가 planner prompt 로 외부 LLM(OpenAI/Gemini)에 그대로 간다(`work-agent-runtime.ts:309-358`). UNTRUSTED 표시만 있고 redaction 은 없다.
- 즉 현재 경계는 "O4O Cloud DB 에 남기지 않는다" 이지 "PC 밖으로 나가지 않는다" 가 아니다. **업무 비서가 기억해야 할 운영정보는 O4O Cloud 에 못 두면서, 같은 정보가 외부 LLM 에는 매 run 전송되는 비대칭**이 있다. V2 의 데이터 분류는 이 두 축(저장 위치 · 처리 위치)을 분리해 정해야 한다.

---

## H-2. ProductMaster 연결 가능성 (Census G)

| 요소 | 현황 | 근거 |
|---|---|---|
| ProductMaster | 있음 (GTIN nullable · MFDS 필드) | `modules/neture/entities/ProductMaster.entity.ts:36, 46` |
| ProductIdentifier | 있음 (GTIN · EAN13 · KOREA_DRUG_CODE · 보험코드 · ATC · UDI_DI 등) | `ProductIdentifier.entity.ts:55-65, 113` |
| 공급자 재고 | 있음 (`supplier_product_offers.stock_quantity`) | `SupplierProductOffer` `:128-140` |
| 매장 보유 재고 · 판매량 | **없음** | `local-db.mjs:96` 도 주문·재고 테이블 생성 안 함 |
| B2B 주문 | `store_cart_items`(product_master_id nullable) → `checkout_orders` | `StoreCartItem.entity.ts:66, 78` · `b2b-checkout-confirm.core.ts:413` (items.productId = offer id) |
| Automation ↔ ProductMaster | **연결 0** — ai-tools · local-agent · o4o-local-agent 에서 product_master/barcode 참조 0건 | grep |

- 공급자 사이트 조회는 정규화된 **제품명 텍스트**로 표 행을 매칭한다(`supplier-site-adapter-contract.ts:370-385`).
- Experience/slot 어휘가 업무 값을 금지하므로, 현재 구조에서는 run 이 "어느 ProductMaster 에 대한 업무인가" 를 기록할 수 없다.
- 판단: ProductMaster/Identifier 는 주문 Assistant 의 **식별 축으로 쓸 수 있는 강점**이지만, Automation 쪽에 그 축을 받을 자리가 없고, 매장 재고·판매량은 데이터 자체가 없다. schema 제안은 이 IR 범위 밖.

---

## I. Execution Node gap

**Local Agent 는 Assistant 가 아니라 Execution Node 다.** 모든 판단은 Cloud 의 work-agent loop 에 있고, PC 는 고정 allowlist 행동만 수행한다(`local-agent-protocol.ts:84-176`). 연결은 PC → Cloud 단방향(`index.mjs:18-22`).

| 항목 | 현황 | GAP |
|---|---|---|
| node identity | pairing grant(2분 1회) → `deviceId` + 해시 credential, `user_id` 귀속 (`local-agent-service.ts:139-258`) | 충분 |
| capability 선언 | **없음** — platform(Windows) · agentVersion 만. 미지원 action 은 실행 중 실패로 발견 | 노드별 능력(브라우저/UIA/로그인된 사이트) 선언 없음 |
| online/offline | heartbeat `last_seen_at` 90 s (`:60, 403`) | 충분 |
| 노드 선택 | `resolveTargetDevice`: 온라인 1대 → 사용, **2대 이상 → `ambiguous` 로 중단**, 0대 → offline (`:415-434`) | 사용자 선택 · capability 기반 · 부하 기반 선택 없음. **다중 PC 는 현재 오류 상태** |
| session / credential ownership | 사이트 로그인은 사용자 실제 Chrome 에만 존재 · password/OTP 거절 | 올바른 위치. 다만 어느 노드가 어느 사이트에 로그인돼 있는지 Cloud 가 모름 |
| task dispatch | DB 명령 큐 + 폴링, 명령 TTL 20 s · 대기 12 s | 명령 단위 원격 조종(§D) — 노드에 "작업" 을 맡기는 단위가 없음 |
| run state | Cloud = 상태·버전만 · 내용(context · candidate · experience)은 PC | **run 의 기억이 노드에 있음** |
| continuation / 이동 | `checkResumable` 은 device 를 확인하지 않고 claim 이 device_id 를 덮어씀 → 다른 PC 재개 가능하지만 `context_recall` 이 새 PC 의 SQLite 를 조회해 **context 가 조용히 사라짐** | handoff · 재배정 없음. PC offline 시 run 은 만료될 뿐 |
| 노드 종류 | Windows PC + Chrome 확장 1종 | Cloud Browser 등 다른 노드 없음 |

목표 구조(`Assistant → {Cloud Browser · Office PC · Home PC · Future}`) 수용 기반: identity · liveness 는 있다. **capability · 선택 · run 기억의 노드 분리 · 작업 단위 dispatch** 가 없다.

---

## J. Skill / Fast-path gap

| 질문 | 현황 | 근거 |
|---|---|---|
| semantic workflow 표현 | **있음** — `{actionKind, locator:{role, name\|text}, slot?, expect}` · 좌표/elementRef 없음 | `workflow-candidate.ts:54-64` |
| stage / 의도 descriptor | **없음** — step 에 의미 단계가 없음(EXPERIENCE-MODEL §13 이 인정) | |
| parameter / variable | **있음** — `{{1}}..{{4}}` 슬롯, 입력값이 요청에서 와야 함, 모호하면 preflight 질문 | `:156-180, 234, 386-411` |
| LLM 없는 replay | **step 은 LLM 0, 그러나 end-to-end 아님** — replay 뒤 반드시 planner 가 완료 판단 | `work-agent-runtime.ts:1411` |
| batching | **없음** — replay step 마다 find + action + observe 각각 RT. LLM 배치(≤4)는 AI 호출만 절약 | `:1420-1454` · `work-agent-contract.ts:207` |
| 실패 → Discovery 복귀 | **있음** — 어긋나면 `diverged` → discovery 모드로 AI loop 가 현재 화면에서 이어받음, AI 성공 시 Candidate step 덮어씀(self-healing) | `:710, 1495-1511` · `local-db.mjs:1061-1065` |
| 승격 기준 | **없음** — 신규 run 1회 성공이면 즉시 active · 실패 ≥3 & 실패 > 성공이면 비활성 | `:754-773` · `local-db.mjs:1007, 1131` |
| 매칭 | 요청 문장 정규식 **전체 일치** — 표현이 바뀌면 miss. task key 와 무관 | `local-db.mjs:1014-1041` |
| 대상 범위 | DOM 만 (windows_app 제외) · 신규·무힌트·무이미지 run 만 | `:755` |
| 공유 skill library | **없음** (설계만, EXPERIENCE-MODEL §17) | `local-db.mjs:263` |

`local_workflow_candidates` 와 목표 개념의 관계: **목표 구조의 "Skill" 중 가장 아래층 — 특정 사이트 DOM 에서의 실현(realization) + 재생 cache — 에 해당한다.** 그 위의 "업무 단위 Procedure"(이 업무는 어떤 단계로 하는가) 와 Known/Unknown 판정(이미 아는 업무인가)은 없다. 하드코딩 절차(`healthkr-adapter.ts` 등)도 같은 층의 다른 형태인데 둘이 연결돼 있지 않다.

Fast execution 이 빠르지 않은 이유: replay 가 LLM 은 뺐지만 **원격 순차 명령 구조(§D-3-1) 는 그대로**이고, 끝에 planner 1회가 붙는다. 실측에서도 replay run(65.2 s · 64.9 s, 계획 1회)이 비-replay run(61.5 s, 계획 2회)보다 빠르지 않았다 [measured, 구 폴링].

---

## K. External Assistant ingress gap

| 항목 | 현황 | 근거 |
|---|---|---|
| 진입점 | `POST /api/ai/request` · `/work-agent/run` · `/home-chat` | `ai-proxy.routes.ts:2201, 352, 2090` |
| 인증 | 사용자 JWT 만 (Bearer 또는 httpOnly cookie). `tokenType !== 'user'` 거절 | `auth-context.helpers.ts:86-98, 224-228` |
| 기계 자격 | **없음** — API key · personal access token · OAuth client · scope 없음 | |
| 응답 모델 | **동기** — HTTP 를 최대 ≈90 s 붙잡고 최종 결과 반환. run 상태 GET · SSE · webhook 없음. 계속은 `runId` 재 POST | |
| MCP / WebMCP | **없음** (`@modelcontextprotocol` 의존 0) | |
| OpenAPI | Swagger 는 있으나 AI route 주석 0건 | `config/swagger-enhanced.ts:467` |
| Kakao 등 채널 | 메시지 연동 없음 (OAuth 설정 잔재 · 연락처 필드만) | `config/app.config.ts:182` |
| 비동기 job 모델 | `automation_jobs` 는 VIDEO 전용 수동 job, AI/work-agent 와 무관 | `modules/automation/entities/AutomationJob.entity.ts` |

결론: **요청 채널 = O4O 웹 UI 1개, 실행 노드 = 사용자 PC 1대** 가 사실상 고정이다. 외부 Assistant 가 O4O 를 호출하려면 (1) 기계 자격 · scope, (2) 비동기 task API(생성 → 진행/질문 → 결과), (3) 도구 manifest(MCP 등), (4) 채널 adapter 가 필요하다. 특히 (2) 가 없으면 "Kakao 에서 요청 → 사무실 PC 에서 실행 → 결과/질문을 Kakao 로" 흐름이 성립하지 않는다 — 현재 질문(QUESTION) 도 동기 응답 안에서만 돌아온다.

---

## L. Multi-Agent 필요성 / 불필요성

- 현재 병렬 orchestration 은 **없다.** 유일한 다중 소스 결합(`hospital-drug-composite.ts`, `6f8d7656e`)은 **순차** 단일 tool 호출 + 결정론 병합이었고 지금은 SUPERSEDED · route 미연결이다(`:8-15, 375-459`). ai-tools · local-agent 에 `Promise.all` 없음. supplier adapter 는 조회당 검색 1회(`supplier-site-adapter-contract.ts:45`).
- **지금 Multi-Agent 는 필요하지 않다.** 기준 사례(게보린 검색)는 짧고 서로 의존하는 단일 업무다. 병목은 agent 수가 아니라 §D 의 프로토콜과 §F 의 계층 부재다.
- **"30제품 × A/B/C 도매 조사" 같은 업무 병렬화를 하려면** 현재 다음이 없다:
  1. parent/child run 상태 (coordination 에 parent_run_id · 하위 작업 · 집계 상태 없음)
  2. 노드 내 동시성 통제 — agent 는 명령을 하나씩 처리(`index.mjs:269-271`)하고 DOM 명령은 tabId 없이 "활성 탭" 에 작동한다. 같은 PC 에서 두 run 이 돌면 같은 탭에서 섞인다(`work-target.mjs:74-84, 126` · `work-run-executor.ts:179`).
  3. 노드 간 분산 — 다중 PC 는 `ambiguous` 오류(§I)
  4. 결과 취합 · 부분 실패 처리
  5. 직렬 왕복을 전제한 명령 타임아웃(12 s · TTL 20 s)
- 판단: worker 는 **업무 단위 병렬성**이 생길 때 L2 아래에 붙을 확장이며, click/type 같은 행동 단위 분할 대상은 현재 코드 어디에도 없고 필요하지도 않다. 선행 조건은 L2(Task 객체) · run 기억의 노드 분리 · 탭 단위 실행 격리다.

---

## M. 기존 자산 판정

Strong Discovery A~D 는 커밋 시간순(A `c41b6d293` → B `c387789ee` → C `6cd618217` → D `87ebdb074`).

| component | current role | desired role | 판정 |
|---|---|---|---|
| Chrome 확장 DOM executor (`content-script.js`) | 유일한 브라우저 관찰·실행 수단 | L4 의 구조 관찰 채널 하나 (visual 채널과 병행) | **KEEP_BUT_REPOSITION** |
| Windows UIA · computer input/capture | PC 앱 실행 · UIA 실패 시 visual | L4 Desktop executor | **KEEP** |
| 안전 경계 (password/OTP 차단 · COMMIT takeover · origin 제한) | 실행 안전층 | 그대로 (Node 공통 안전층) | **KEEP** |
| Local Agent (`o4o-local-agent`) | 명령 단위로 원격 조종되는 PC + 기억 저장소 | Execution Node (작업 단위 수행 · 능력 선언) | **KEEP_BUT_REPOSITION** |
| `local_agent_commands` 큐 + heartbeat 폴링 | 모든 행동·장부의 순차 전송로 | 노드 작업 dispatch 채널 | **REDESIGN** (§D 지연의 주원인) |
| `resolveTargetDevice` | 온라인 1대만 허용 | 다중 노드 선택 | **REDESIGN** |
| `work_run_coordination` | 상태·버전·TTL | run 상태의 중심 (L2 Task 와 연결) | **KEEP_BUT_REPOSITION** |
| `unified-request-router` · `task-modality-router` | 키워드 결정론 경로 선택 | L1 아래의 빠른 사전 분류(보조) | **KEEP_BUT_REPOSITION** |
| `WORK_PLANNER_SYSTEM_PROMPT` 단일 loop | 업무 판단 + UI 조작 + 완료 판정 | Unknown task 의 Discovery executor (L4 측 판단만) | **REDESIGN** (분리 필요) |
| `healthkr-adapter` · `pharmacy-web-executor` | home-chat 전용 결정론 절차 | Known task 의 Skill 한 종류 | **KEEP_BUT_REPOSITION** |
| supplier site adapter | 하드코딩 절차 | 동일 | **KEEP_BUT_REPOSITION** |
| `hospital-drug-composite.ts` | SUPERSEDED · 미연결 | — | **OBSOLETE** (이미 은퇴, helper 만 재사용 중) |
| **A** Workflow Candidate + replay (`c41b6d293`) | Local 재생 cache · 1회 성공 즉시 active | Skill 의 DOM 실현층 (+ 승격 기준 · 업무 Procedure 와 연결) | **KEEP_BUT_REPOSITION** |
| **B** Local Experience 최소 저장 (`c387789ee`) | PC 별 write-only 구조 기록 | 계정 소속 Experience 원장의 Execution trace 부분 | **KEEP_BUT_REPOSITION** (구조 KEEP · 저장 위치 재정의) |
| **C** User Assistance / Correction · Preferred/Avoid (`6cd618217`) | Task×Target×Stage 방법 기억 (PC 별) | Assistant Experience · Procedural Memory (계정 소속) | **KEEP_BUT_REPOSITION** |
| **D** Strong-First Discovery routing (`87ebdb074`, 미배포 · BLOCKED_FREEZE) | 단일 loop 안의 discovery/experienced 역할 전환 + 질문 이유 분리 | "모르는 브라우저 업무" 를 푸는 Discovery capability | **KEEP_BUT_REPOSITION** |
| `local_work_run_context` 재개 frame | 노드 SQLite 에 저장 | run 소속 (노드 무관) | **REDESIGN** (저장 위치) |
| `local_datasets` · `local.data.query` | 원내 파일 → 로컬 질의 | Execution Node 의 로컬 데이터 capability | **KEEP** |
| 결정론 file-understanding (`@o4o/file-understanding-core`) | 범용 파일 구조 이해 | L4 tool | **KEEP** |
| visual fallback (openai/gemini vision, UIA 전용) | UIA 실패 후 픽셀 | Browser 포함 hybrid 관찰의 기반 | **KEEP_BUT_REPOSITION** |

**Strong Discovery 재정의 판단**: 가능하다. D 의 내용(질문 이유를 정보 부족/방법 부족/사용자 결정으로 나누고, 방법 부족이면 사용자에게 묻기 전에 최대 2회 재관찰·재계획)은 "**Personal Assistant 가 모르는 브라우저 업무를 해결하는 Discovery/Execution capability**" 의 내부 정책으로 그대로 성립한다. 지금 문제는 D 가 틀렸다는 것이 아니라 D 가 들어간 loop 가 업무 판단까지 맡고 있다는 것이다. OBSOLETE 판정 없음.

---

## N. Gap priority

### P0 — architecture blocker (이것 없이 개인 업무 비서 구조가 성립하지 않음)

| # | Gap | 근거 절 |
|---|---|---|
| P0-1 | **L1 Personal Assistant 계층 부재** — 요청 간 사용자 업무 context · 기억 · 대화 연속성 없음 | A · F |
| P0-2 | **업무 판단(L2) 과 UI 조작(L4) 이 한 planner 에 혼합** — Task 객체 · 완료 조건 · Known/Unknown 판정 없음 | F · J |
| P0-3 | **기억의 실행 PC 종속** — Experience · Skill · run context 가 device 의 `local.db` 에만 있음. 다른 PC · 다른 채널 · 재개 이동 불가 | G · I |

### P1 — important

| # | Gap | 근거 절 |
|---|---|---|
| P1-1 | 명령 단위 원격 순차 프로토콜 — 단순 type+submit 이 다수 RT · 장부 명령까지 실행 경로에 끼어 있음 | D |
| P1-2 | Execution Node 추상화 — capability 선언 · 다중 노드 선택(현재 `ambiguous` 오류) · 작업 단위 dispatch | I |
| P1-3 | 브라우저 관찰이 DOM 후보 80개 텍스트뿐 — vision · Enter · 스크롤 · iframe 없음, 허용 origin 2개 | E |
| P1-4 | Skill fast-path 가 빠르지 않음 — replay 무배치 · 끝에 planner 필수 · 1회 성공 즉시 active · 문장 전체 일치 매칭 | J |
| P1-5 | 외부 Assistant ingress — 기계 자격 · 비동기 task API · 진행/질문 전달 경로 없음 | K |
| P1-6 | 데이터 경계의 비대칭 — 저장은 엄격하나 외부 LLM 전송은 무제한 · `goal_summary` 원문 무기한(D3 어긋남) · Experience TTL 없음 | G-1 · H |

### P2 — later

| # | Gap | 근거 절 |
|---|---|---|
| P2-1 | 업무 병렬 worker (parent/child run · 탭 격리 · 취합) | L |
| P2-2 | ProductMaster ↔ Automation 연결 · 매장 재고/판매량 데이터 | H-2 |
| P2-3 | 공유 Skill library · 승격 엔진 | J |
| P2-4 | MCP / WebMCP 도구 manifest · OpenAPI 문서화 | K |

이 IR 은 구현 WO 를 작성하지 않는다(WO §18). P0 해소 방향은 외부 기술 조사와 대조한 뒤 V2 구조 결정에서 정한다.

---

## 부록 A. 핵심 주장 원 코드 재확인 (2026-10-02, `origin/main` 03b9c8bc4)

| 주장 | 확인 위치 |
|---|---|
| planner = "다음 행동 하나" | `work-agent-runtime.ts:235` |
| 배치 상한 4 | `work-agent-contract.ts:207` |
| `key` 는 uia 전용 → 브라우저 Enter 없음 | `work-agent-contract.ts:369-371` |
| loop 상한 14 step · 8 plan · 90 s | `work-agent-contract.ts:539-545` |
| 온라인 2대 이상 = `ambiguous` | `local-agent-service.ts:415-434` |
| DOM 후보 80개 | `content-script.js:50` |
| 확장 권한 · origin 2개 | `manifest.json:18-19` |
| goal_summary 원문 저장 | `local-db.mjs:196-206, 850` |
| replay 뒤 planner 가 완료 판단 | `work-agent-runtime.ts:1411` |
| planner 기본 모델 `gpt-6-astra` | `utils/ai-provider-runtime.ts:60` |

## 부록 B. 이번 조사에서 하지 않은 것

코드 수정 · DB read/write · migration · 배포 · DEPLOY_FREEZE 변경 · 확장 권한 변경 · Browser Visual 구현 · Local Experience Cloud 이전 · Multi-Agent 구현 · Strong Discovery smoke · waiting run resume · Local Agent 재기동 — 전부 0건. latency 수치는 기존 CHECK 실측만 인용했고 새로 측정하지 않았다(폴링 개선 후 수치는 PENDING 그대로).
