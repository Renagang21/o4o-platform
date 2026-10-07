# IR-O4O-PERSONAL-ASSISTANT-AFTER-PHASE-A-E-GAP-CENSUS-V1

> **유형**: IR (조사 전용 — 구현 · runtime · DB · migration · deploy 변경 없음)
> **작성일**: 2026-10-07
> **기준 코드**: `origin/main` `014c90163` (Phase E #325 `5e97815c7` · CHECK #338 `3ae9b5142` 포함)
> **상위 정본**: [`O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2`](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) · [`O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1`](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md)
> **선행 IR**: [V2 Gap Census](IR-O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2-GAP-CENSUS.md) · [V2 Environment Refresh](IR-O4O-PERSONAL-ASSISTANT-V2-ENVIRONMENT-REFRESH.md) · [Phase A Census](IR-O4O-PERSONAL-ASSISTANT-PHASE-A-TASK-FOUNDATION-CENSUS-AND-DESIGN-V1.md)

---

## 0. 질문과 판정 기준

**핵심 질문**: Phase A~E 이후 O4O 는 "등록된 화면을 자동 조작하는 RPA 도구"에서 "사용자를 이해하고 경험으로 달라지는 Personal Assistant"로 얼마나 이동했는가.

판정 기준(이 IR 전체에 동일 적용):

- **기억의 3단계를 구분한다** — ⓐ 기억하고 있음(저장) ≠ ⓑ 판단에 사용함(프롬프트 · 후보로 읽힘) ≠ ⓒ 실제로 다음 행동이 결정적으로 달라짐.
- **사용자 부담을 2종으로 구분한다** — `SECURITY_REQUIRED`(보안 · 동의상 사람이 해야 하는 것) / `PRODUCT_GAP`(제품이 덜 만들어져 사람이 대신 하는 것).
- **속도 수치는 측정된 것만 숫자로 쓴다.** 측정되지 않은 것은 `MEASUREMENT_PENDING`. 시뮬레이션 수치는 시뮬레이션이라고 표기한다.
- **해법을 미리 정하지 않는다** — Multi-Agent · Workflow Engine · MCP · Cloud Browser · Memory 추가 · 더 강한 LLM 을 결론으로 두지 않는다. "많은 사용자가 X 를 한다 → 표준 Workflow" 로 가지 않는다(V2 §0-1 P3 개인화 원칙 유지).

조사 방법: 코드 정적 조사(4 축 병렬 census) + 핵심 주장 직접 재확인(코드 위치는 본문에 기재). 운영 로그 · DB · 실 PC 실행은 하지 않았다.

---

## 1. 현재 구조 한 장 요약

```text
[web-neture O4O 홈 Composer]  ── POST /api/ai/request (ai-proxy.routes.ts:2212, 동기 JSON)
        │
        ├─ classifyUnifiedRequest (unified-request-router.ts) — keyword/alias 부분일치
        │     └─ 등재 대상 없음 → chat (no_registered_target, :140)
        │
        ├─ runAssistantWorkTask (assistant/personal-assistant.ts:168)  ← L1 Assistant · L2 Task
        │     acquireTask → recallAssistantMemory → planAssistantTask(결정적, LLM 0) → execute → judgeTaskStatus → rememberExecution
        │
        └─ execute = runWorkAgent (ai-tools/work-agent-runtime.ts, 2224줄)  ← L3/L4 가 실제로 판단
              매 관측마다 LLM planner 1회 (maxAiPlans 8 · maxSteps 14 · 90 s)
              명령은 Cloud DB queue → PC agent heartbeat claim → 결과 polling
              DOM + agent 0.3.0 이면 run_unit(Phase E) 으로 묶음
```

**한 줄 판정**: Assistant/Task/Memory 의 **골격(소유 · 연속성 · 경계)** 은 Personal Assistant 형태로 섰다. 그러나 **이해 · 판단 · 적응의 실체**는 여전히 "등재된 사이트/앱 1개 안에서 매 화면마다 LLM 이 다음 클릭을 고르는" 실행 런타임 안에 있다.

---

## 2. 축별 Census

### 2-1. 업무 이해 · 판단

| 항목 | 현재 | 근거 |
|---|---|---|
| Assistant 층의 판단 | **결정적 · LLM 0회**. Task 획득 · 기억 회상 · ExecutionIntent 구성 · 상태 판정만 한다 | `assistant-planning.ts:75` · `personal-assistant.ts:168-279` |
| 요청 해석 | keyword/alias **부분 문자열 일치**로 대상(사이트/앱)을 고른다. 목표의 구조화(무엇을 · 어디서 · 완료 조건) 없음 — 원문 문장이 그대로 planner 로 간다 | `unified-request-router.ts:134-149` |
| 완료 판정 | 계약은 상수 `result_observed`. 런타임 해석은 "이력에 성공한 이동 또는 read_text/read_table 이 하나라도 있으면" — **목표와 대조하지 않는다** | `assistant-planning.ts:57` · `work-agent-runtime.ts:1077-1078` |
| `acceptsUserCompletion` | 계약에 `true` 로 선언만, 읽는 코드 없음 | `work-agent-contract.ts:713` (참조 0) |
| 실질 판단 주체 | 실행 런타임의 `WORK_PLANNER_SYSTEM_PROMPT` 가 목표 도달 · task/stage/strategy 선언 · 사용자 질문 작성 · 답변 분류(assistance/correction)까지 한다. Assistant 는 사후에 그 주장을 매핑 | `work-agent-runtime.ts:257-315` |
| research modality | hospital-drug 표면에서만 쓰임 | `task-modality-router.ts` |

**판정**: "업무를 이해한다"는 기능은 L1 Assistant 가 아니라 **L4 실행 planner 의 한 프롬프트 안**에 있다. 업무 단위의 이해(목표 · 완료 조건 · 단계)는 구조화되어 있지 않다.

### 2-2. Experience 가 다음 업무를 실제로 바꾸는가

| 기억 | ⓐ 저장 | ⓑ 판단에 사용 | ⓒ 다음 행동이 결정적으로 바뀜 | 비고 |
|---|---|---|---|---|
| Workflow Candidate (PC SQLite) | O | O | **O — LLM 없이 재생** | 정확한 key 일치 · regex literal template. resume/recovery/이미지/비DOM/Windows 에서는 skip (`work-agent-runtime.ts:~829`) |
| Avoid pattern (verified) | O | O | **O — 같은 strategy 실행 차단** | 단, planner 가 strategy 를 **선언해야** 걸린다 (`:1907-1910`) |
| 노드 선호(Execution Node) | O | O | O | PC 선택 |
| Preferred pattern | O | O | △ — 프롬프트 주입만, 따를지는 LLM 재량 | |
| task keys · resume frame | O | O | △ — 프롬프트 주입 | |
| Experience ledger (Local SQLite) | O | **X** | X | `work-experience.ts:5-6` "쓰기만 한다(read-back · 동기화 없음)" |
| 방법이 아닌 교정(correction) | O | X | X | |
| assistance rows · failed_count | O | X | X | |
| `knowledge` · `shared_candidate` | X | X | X | `assistant-planning.ts:69-70` `available:false` |

추가 관찰:

- **회상 시점이 늦다.** run 시작 시 `recallExperience(null)` 은 task key 목록만 읽는다(`:~1315`). 패턴은 planner 가 task 를 **선언한 뒤**에 읽고, 패턴이 있으면 방금 받은 제안을 버리고 다시 계획한다(`:1901-1906`) — 경험이 있을수록 **LLM 호출이 1회 늘어난다**.
- **재개 답변은 기본적으로 재사용 불가**로 기록된다(`per_run_value`/`not_reusable`, `:976-981`). 도움을 받아 성공한 run 은 Candidate 가 되지 않는다.
- **일치는 정확한 key 뿐**이다 — 유사 업무 · 다른 사이트의 같은 업무로 전이되지 않는다.
- **recall 이 last_used_at 을 갱신한다**(`procedural-memory-store.ts:167`) — 실제로 쓰였는지와 무관하게 "회상됨 = 사용됨"으로 만료가 연장된다.

**판정**: 결정적 개인화(ⓒ)는 **Candidate 재생 · Avoid 차단 · 노드 선호 3종**뿐이고, 셋 다 "같은 사용자 · 같은 등재 대상 · 같은 task key" 에서만 동작한다. 나머지 기억은 저장되거나 프롬프트 힌트로만 쓰인다. **"기억하고 있음"은 넓고 "행동이 달라짐"은 좁다.**

### 2-3. 처음 보는 업무

| 상황 | 동작 |
|---|---|
| 등재 사이트/앱 안의 새 업무 | planner 가 discovery 모드로 스스로 단계를 찾는다(method discovery 재시도 최대 2). **여기는 RPA 가 아니다** |
| 등재되지 않은 사이트 · 앱 | **chat 으로 빠진다**(`no_registered_target`). 탐색 · 실행 · Task · 경험 모두 없음 |
| URL 직접 지정 | target 이 되지 않음. navigate action 없음. cross_origin 이면 run 종료 |
| 등재 범위 | browser **2** (`o4o.neture`, `healthkr` — `browser-site-registry.ts`) · Windows **4** (notepad, kakaotalk, calculator, doctors — `windows-app-registry.ts:64-92`). 사이트 목록은 서버 · agent · 확장 · manifest **4곳에 중복 하드코딩** |
| 사용자 등록 경로 | 없음 — 코드 릴리스 필요 |

`hasVerifiedWorkflow` 는 `task-modality-router.ts:46,126` 에 정의만 있고 주입되지 않는다(배선 없음).

**판정**: "처음 보는 업무"는 **등재 대상 안에서만** 적응적이고, 대상 밖에서는 아예 시작하지 못한다. allowlist 자체는 보안상 필요하지만(§2-6), 확장 경로가 없는 것은 제품 갭이다.

### 2-4. 실패 · 교정 후 행동

- 교정 답변이 **방법(strategy)** 으로 분류되고 대안이 성공하면 → Avoid/Preferred 로 승격 → 다음 run 에서 차단/힌트(ⓒ/ⓑ).
- 방법이 아닌 교정(예: "그 값이 아니라 이 값")은 저장만 되고 다음 판단에 읽히지 않는다(ⓐ).
- recover() 는 strong planner 로 승격해 재시도한다(`:1133-1159`) — 같은 run 안의 회복이지 학습이 아니다.
- handback 후 재개 정보: 서버는 `recoveryHint` · `taskId` 를 받지만(ai-proxy `:2294` · `:2210,2299`) **web 클라이언트는 둘 다 보내지 않는다**(web-neture 전체 grep 0건 — 직접 확인). 재개 앵커는 React 메모리 상태라 새로고침하면 사라진다.

**판정**: 실패 → 학습 경로는 "방법 교정 + 성공 확인"이라는 좁은 조건에서만 닫혀 있다. 사용자 입장에서는 **실패 후 다시 설명해야 하는 경우가 대부분**이다.

### 2-5. Assistant / Execution 분리

| 항목 | 현재 |
|---|---|
| 분리된 것 | Task 소유 · 메모리 소유(Phase C 10종) · 노드 선택 · capability heartbeat(Phase D) · DOM 작업 단위 dispatch(Phase E) |
| 섞여 있는 것 | 목표 도달 판단 · 업무/단계 명명 · 사용자 질문 작성 · 답변 분류 — 모두 **실행 planner** 안 |
| 사이트 전용 로직 | `pharmacy-web-executor.ts` HEALTHKR_ADAPTER 가 서버에 절차 하드코딩(DOM 20 명령 · READY_POLLS 4×700 ms) |
| 작업 단위가 안 되는 경로 | UIA · Computer Use · 단독 DOM find/read · pharmacy-web · **agent 0.2.x 이하 PC 전부** — 명령마다 queue 왕복 |
| 고정 원장 왕복 | preflight(`issueTargetPrepare`, `issueWorkRunUpsert`, recall, candidate match)와 `finish()`(persistTerminalRun → persistWorkflow → recordExperience → saveRunContext → recordAssistance)가 **모두 `local.data.*` queue 왕복이고 직렬**. 사용자 응답 전에 끝나야 한다 (`work-run-executor.ts:31-55` · `work-agent-runtime.ts:1034-1062`) |

**판정**: Phase D/E 로 **"어디서 · 어떤 단위로 실행할지"** 는 분리됐다. **"무엇을 해야 하고 언제 끝났는지"** 는 아직 실행 루프가 결정한다.

### 2-6. 사용자 관리 부담

| # | 사용자가 하는 일 | 분류 |
|---|---|---|
| 1 | Node 18 설치 · `node src/index.mjs run` 수동 실행 (installer · 서비스 · 자동 시작 없음) | PRODUCT_GAP |
| 2 | agent 수동 업데이트 (자동 업데이트 없음 — Phase E 혜택도 수동 0.3.0 업데이트 전제) | PRODUCT_GAP |
| 3 | PC 연결 동의 · Chrome Local Network Access 허용 | SECURITY_REQUIRED (진입이 My Page 카드뿐인 것은 소 PRODUCT_GAP) |
| 4 | 확장 설치: native host 스크립트 실행 + 개발자 모드 "압축해제 로드" (Web Store · 자동 업데이트 없음) | 배포 방식 PRODUCT_GAP / opt-in 자체는 정당 |
| 5 | PC · agent · 확장을 켜 두기 (없으면 403) | PRODUCT_GAP (구조적 — 실행 노드 대체 없음) |
| 6 | 요청 문장에 사이트/앱 이름 넣기 (안 맞으면 조용히 chat) | PRODUCT_GAP |
| 7 | 새 사이트/앱 추가 요청 → 코드 릴리스 대기 | allowlist=SECURITY_REQUIRED / 등록 경로 없음=PRODUCT_GAP |
| 8 | 판단 애매 시 [진행] 확인 | 대부분 PRODUCT_GAP (안전 commit 이 아닌 휴리스틱 보완) |
| 9 | 사이트 로그인 | SECURITY_REQUIRED |
| 10 | [로그인 완료] 버튼 — `setLoginReady(true)` React 상태만 바뀌고 서버 · run 에 전달되지 않음 (`O4OHomePage.tsx:663`, 직접 확인) | PRODUCT_GAP (장식적 · 새로고침 시 소실) |
| 11 | 새로고침 · 다음 날 이전 업무 재설명 | PRODUCT_GAP |
| 12 | handback 후 "현재 화면에서 직접 이어서 진행" | PRODUCT_GAP |
| 13 | 로그인 · 비밀번호 · 주문 · 결제 · 제출 확정 승인 | SECURITY_REQUIRED |
| — | PC 선택 · 모드/모델/사이트 선택 | 부담 없음 (서버 자동) |

**판정**: SECURITY_REQUIRED 는 4종(동의 · 로그인 · 민감 확정 · allowlist)으로 정당하다. 나머지 부담의 대부분은 **설치 · 업데이트 · 연속성 · 대상 확장** 의 PRODUCT_GAP 이다.

### 2-7. 채널 독립성

- **이미 채널 중립인 것**: 인증(Bearer 우선, cookie fallback) · 핵심 함수 `runAssistantWorkTask(dataSource, {userId, ...})` (req/res 무의존) · Task/Memory 소유가 user/org 키 기준 · 입력 계약이 UI 중립.
- **새 채널이 부딪힐 결합점**:
  1. ingress/channel 추상화 없음 (V2 §14 · §18-2 G 미구현).
  2. 라우팅 · hospital-drug 분기 · confirm · 첨부 검증 · 응답 형성이 **HTTP route 본문 안**에 있음 (`ai-proxy.routes.ts:2212-2319`, `performWorkAgentRun` 은 route 파일 내부 함수).
  3. **"지금 열린 업무"를 서버가 스스로 찾지 않는다** — 클라이언트가 runId/taskId/targetHint 를 들고 다녀야 한다 (`personal-assistant.ts:136-152`).
  4. 동기 장시간 요청 · 비동기 전달/푸시 없음 — 짧은 응답 시간 제한이 있는 메신저 채널, `waiting_for_user` 알림 불가.
  5. `workspace: 'home'` 하드코딩 · workScope 가 neture route 파생.
- **UI 호스팅**: Composer 는 web-neture main host `/` 와 `/hospital-drug` 뿐. 확장 manifest 도 neture.co.kr · health.kr 만.

**판정**: 핵심은 채널 중립에 가깝다. **채널 독립을 막는 실제 원인은 ingress 부재보다 "서버 측 현재 업무 연속성 없음 + 동기 응답 모델"** 이다. (이 IR 은 새 ingress 를 제안하지 않는다.)

### 2-8. 속도 병목

| 항목 | 상태 |
|---|---|
| 1 run 당 LLM 호출 | 매 관측마다 1회. 상한 8. 추가 호출 원인: 패턴 주입 재계획 · method discovery · inspect · find/read 후 재계획 · `done` 선언만을 위한 마지막 호출 · recover 승격. **분포는 MEASUREMENT_PENDING** |
| LLM 설정 | 새 run 은 strong 모델로 시작(`:708`). 매 호출 고정 system prompt + 관측 요소(DOM 최대 80 · UIA 최대 150) 재전송, prompt caching 없음. timeout 40 s |
| LLM 지연 · 전체 비중 | **MEASUREMENT_PENDING** (`poll-schedule.mjs:10` 의 "AI 계획 3~5 s" 는 주석의 가정이지 계측이 아님) |
| queue 왕복 | 서버 결과 poll 250 ms · 노드 idle poll 5 s / 명령 직후 250 ms→500 ms→1 s 적응형. **적응형 이후 실측 MEASUREMENT_PENDING** |
| 측정된 유일한 실측 | 2026-10-01 재개 run 48.7 s 중 약 44 s 가 poll 공백, PC 실처리는 명령당 수십 ms (`poll-schedule.mjs:5-6`) — **적응형 poll 도입 전** |
| Phase E 절감 | **시뮬레이션만**(RTT 150 ms · LLM 0 가정): search 6→3 왕복, batch 6→2, replay 8→2. 실 PC 측정 없음 |
| 원장 왕복(preflight + finish) 비용 | **MEASUREMENT_PENDING** — `measureSegmentCommandTiming` 이 `local.data.*` 를 제외 |
| 계측 상태 | `aiMs` · `aiCalls` · `roundTrips` · `commandWaitMs` 등은 수집되지만 **사용자 PC 의 Local SQLite 로만** 간다. Cloud 집계 없음 |

**판정(가설, 측정으로 확정 필요)**: 적응형 poll 로 44 s 공백이 줄었다면, 남은 최대 항은 **직렬 LLM planner 호출**일 가능성이 높고, 그다음이 **단위화되지 않은 경로의 명령별 queue 왕복 + 직렬 원장 왕복**이다. 순위 자체가 측정되지 않았다는 것이 지금의 가장 큰 속도 문제다 — **최적화 대상을 숫자로 고를 수 없다.**

---

## 3. 8개 질문에 대한 답

### Q1. 이미 Personal Assistant 인 부분

- **사용자 소유 Task** — 요청이 user(또는 org) 소유 Task 로 잡히고 상태가 판정된다 (Phase A/B).
- **기억의 소유 경계** — 10종 메모리의 USER/ORGANIZATION 귀속 · Cloud 연속성 (Phase C).
- **실행 노드 추상화** — 사용자가 PC 를 고르지 않는다. capability 보고 · 자동 선택 (Phase D).
- **등재 대상 안의 적응적 실행** — 사전 정의 절차 없이 planner 가 화면을 보고 단계를 찾는다(health.kr 어댑터 제외).
- **좁은 결정적 개인화** — Candidate 재생 · Avoid 차단 · 노드 선호.
- **보안 경계** — 로그인 대행 안 함 · 민감 확정 전 handback. (원칙에 부합)
- **UI 단순성** — 모드/모델/사이트 선택 UI 없음.

### Q2. 아직 RPA 적인 부분

- 대상 = **하드코딩 allowlist(사이트 2 · 앱 4)** 안에서만 동작하고, 대상 선택이 키워드 일치.
- 업무 이해 = 원문 문장 → **화면 단위 다음 클릭 고르기** 루프. 목표 · 완료 조건의 구조화 없음.
- 완료 = "뭔가 읽거나 이동했으면 완료"라는 약한 기준.
- 재사용 = **정확히 같은 key 의 매크로 재생**(Candidate) — 의미 수준 일반화 없음.
- health.kr 은 서버 측 고정 절차 어댑터.
- 사용자 PC 에서 수동 실행하는 agent + 개발자 모드 확장 = 운영 형태가 RPA 봇 설치와 같다.

### Q3. 없는 핵심 능력

1. **업무 수준 이해(Task Understanding)** — 목표 · 완료 조건 · 필요한 정보를 실행 전에 구조화하고, 완료를 그 기준으로 판정하는 능력. 현재는 L4 planner 프롬프트에 묻혀 있음.
2. **서버 측 업무 연속성** — "이 사용자의 열린 업무"를 서버가 스스로 찾아 이어가는 능력(새로고침 · 다음 날 · 다른 채널).
3. **경험의 판단 반영 경로** — 저장된 Experience · 비방법 교정 · 도움 이력이 다음 판단에 읽히는 경로(현재 write-only).
4. **대상 확장 경로** — allowlist 를 유지하면서 사용자/관리자가 새 대상을 등록하는 경로.
5. **효과 측정** — V2 §19 KPI(완료 시간 · 수동 조작 · 반복 질문 · AI 호출 수 등)를 Cloud 에서 볼 수 있는 계측.

### Q4. Experience/Memory 의 실제 개인화 정도

**좁고 깊다.** 결정적 효과(ⓒ)는 3종(Candidate 재생 · Avoid 차단 · 노드 선호), 그것도 같은 사용자 · 같은 등재 대상 · 같은 정확 key 에서만. 넓게 저장된 Experience ledger · 교정 · 도움 이력은 다음 판단에 읽히지 않는다(ⓐ만). 경험이 있으면 오히려 LLM 호출이 1회 늘어나는 구조(늦은 패턴 회상)도 있다.

**P3 관점 주의 2건** (해법 제안 아님 · 판정 필요 사항):

- ORGANIZATION 범위 Avoid 패턴은 그 조직 모든 구성원의 실행을 차단한다 — 한 사람의 교정이 조직 전원의 방법을 바꾸는 것이 개인화 원칙과 맞는지 판정이 필요하다.
- 구 agent 의 노드 기억은 `owner_key IS NULL` 버킷이라, 한 PC 를 여러 사용자가 쓰면 기억이 섞인다.
- (부수) recall 만으로 `last_used_at` 이 갱신되어 "안 쓰인 패턴 만료"가 실제 사용과 무관하게 연장된다.

### Q5. 사용자가 아직 지는 판단 · 관리

- **판단**: 대상 이름을 문장에 넣기 · 애매 시 [진행] 확인 · handback 후 직접 이어서 처리 · 실패 후 재요청 문장 작성 · 끝났는지 스스로 확인(완료 판정이 약하므로).
- **관리**: agent 설치/실행/업데이트 · 확장 개발자 모드 설치 · PC 상시 켜두기 · 새 대상 요청.
- 이 중 **SECURITY_REQUIRED 는 PC 연결 동의 · 사이트 로그인 · 민감 확정 승인 · allowlist 존재** 4가지. 나머지는 PRODUCT_GAP.

### Q6. 가장 큰 속도 · 효율 병목

**1순위 병목은 "측정 부재"** 다. 가설 순위는 ① 직렬 LLM planner 호출(관측마다 1회 · strong 시작 · 매번 전체 프롬프트) ② 비단위 경로의 명령별 queue 왕복 ③ 직렬 원장 왕복(preflight/finish) — 그러나 ①~③ 모두 `MEASUREMENT_PENDING` 이며, Phase E 절감도 시뮬레이션 수치뿐이다. 계측 값(`aiMs` 등)은 이미 수집되지만 사용자 PC 밖으로 나오지 않는다.

### Q7. A~E 자산 KEEP / REDESIGN / REPOSITION

| 자산 | 판정 | 이유 |
|---|---|---|
| A Task Foundation (assistant_tasks · 소유) | **KEEP** | 소유 · 상태 골격으로 유효 |
| B Planner 분리 (결정적 ExecutionIntent) | **REDESIGN** | 분리 형태는 맞지만 내용이 비어 있다 — completion 상수 · 목표 비구조화 · `acceptsUserCompletion` 미사용. 업무 이해가 실제로 들어갈 자리 |
| C Memory Ownership (10종 · Cloud 연속성) | **KEEP** (+ P3 판정 2건) | 경계는 맞다. 부족한 것은 저장이 아니라 **읽기 경로** |
| D Execution Node (selection · heartbeat · owner_key) | **KEEP** | 사용자 부담을 실제로 줄였다 |
| E Task-unit dispatch (run_unit) | **KEEP** (적용 범위 제한 인지) | DOM + 0.3.0 에서만. 효과 실측 전 다른 표면으로 확장하지 않는다 |
| Workflow Candidate 재생 | **REPOSITION** | "개인화의 주 경로"가 아니라 **결정적 가속기**(같은 업무 반복의 지름길)로 위치. 정확 key 매크로를 일반화된 학습으로 오인하지 않는다 |
| Experience ledger (Local SQLite write-only) | **REPOSITION** | 지금은 기록 보관소. 판단 반영 경로를 만들지, 측정용 원장으로 둘지 결정 필요 |
| HEALTHKR_ADAPTER (서버 고정 절차) | **REPOSITION** | V2 원칙(사이트별 업무 사전 정의 금지)과 긴장. 범용 경로의 fallback/참조로 위치 재정의 |
| `hasVerifiedWorkflow` (미배선) | **REDESIGN or 제거 판정** | 정의만 있고 배선 없음 |
| web-neture 전용 Composer | **KEEP** (현 단계) | 채널 확장은 서버 측 연속성 이후 |

### Q8. 다음 목표 후보 (최대 3, 우선순위순)

1. **Task Understanding & Completion — 업무 이해를 L1/L2 로 끌어올리기**
   요청을 실행 전에 "목표 · 완료 조건 · 필요한 사용자 정보"로 구조화하고, 완료를 그 기준으로 판정하며, 사용자의 "됐다" 를 완료로 받는다. 현재 L4 planner 프롬프트에 묻힌 판단(목표 도달 · 질문 · 답변 분류)의 소유를 Assistant 로 옮기는 것. *해법 형태(LLM 1회 이해 단계인지, 결정적 규칙인지)는 설계 WO 에서 정한다.*
2. **Measured Baseline — 실 PC 기준 시간 · 호출 계측의 Cloud 집계**
   이미 수집되는 `aiMs · aiCalls · roundTrips · commandWaitMs` 와 원장 왕복 시간을 Cloud 에서 run 단위로 볼 수 있게 하고, Phase E 를 실 PC 로 측정한다. V2 §19 KPI 의 기준선. 속도 최적화 대상은 이 결과로 고른다.
3. **Server-side Task Continuity + Experience read-back**
   서버가 "이 사용자의 열린 업무"를 찾아 이어가고(taskId/recoveryHint 를 클라이언트 기억에 의존하지 않음), 저장된 교정 · 도움 이력이 다음 판단에 읽히게 한다. 채널 독립의 실제 선행 조건이기도 하다.

---

## 4. 만들지 말 것 (지금)

- **Multi-Agent · Workflow Engine · 표준 Workflow 라이브러리** — 업무 이해 단위가 없는 상태에서 조립 계층을 올리면 RPA 를 정교하게 만들 뿐이다. 다수 사용자 행동에서 표준 절차를 만들지 않는다(P3).
- **새 ingress(Kakao · MCP · ChatGPT 연결)** — 서버 측 연속성 · 비동기 전달 없이 붙이면 pseudo-web client 가 된다.
- **Memory 종류 추가** — 부족한 것은 저장이 아니라 읽기 · 판단 반영이다.
- **더 강한 모델로 교체 · Cloud Browser** — 병목이 측정되지 않았다. 이미 strong 모델로 시작한다.
- **run_unit 을 UIA · CU 로 확장, 사이트/앱 allowlist 대량 추가** — Phase E 실측 전, 대상 확장 경로(보안 모델) 설계 전.
- **Installer · 자동 업데이트 · Web Store 배포**는 명백한 PRODUCT_GAP 이지만 Personal Assistant 능력 갭이 아니라 배포 갭이므로 **별도 트랙**으로 둔다(우선순위 판정은 사용자).

---

## 5. 문서 정합 (보고 — 이 IR 에서 고치지 않음, §16-2)

1. **Phase 문자 drift** — V2 §18-2 의 개발 순서는 `A Assistant+Task · B Planner 분리 · C Memory Placement · D Execution Node 계약 · E Skill · F Hybrid Observation · G Ingress …` 이다. 구현 트랙의 "Phase D(런타임 상태 조정)"와 "Phase E(작업 단위 dispatch)"는 **둘 다 §18-2 D** 범위이고, **§18-2 E(Skill) 는 착수되지 않았다.** 다음 트랙 명명 시 혼동 위험 → 별도 WO 로 정본 §23 매핑 또는 트랙 명명 규칙 정리 제안.
2. **completion 계약** — `acceptsUserCompletion: true` 가 계약 · 테스트에 있으나 소비 코드 없음. 정본 서술과 구현 차이(보고만).
3. **Phase E CHECK 의 절감 수치는 시뮬레이션** — CHECK 본문에 이미 명시되어 있음(drift 아님, 인용 시 주의).

---

## 6. 최종 판정

```text
CURRENT_STATE = A~E 로 Personal Assistant 의 골격(사용자 소유 Task · 기억 소유 경계 · 실행 노드 자동 선택 · DOM 작업 단위)은 섰다. 이해 · 판단 · 적응의 실체는 여전히 등재 대상(사이트 2 · 앱 4) 1개 안에서 매 관측마다 LLM 이 다음 행동을 고르는 실행 런타임에 있다. Assistant 층은 결정적 배선(LLM 0회)이다.

PERSONAL_ASSISTANT_CAPABILITY = 부분적 — 소유 · 연속성(단일 페이지 세션 내) · 노드 추상화 · 보안 경계는 PA 수준. 업무 이해 · 완료 판정 · 경험 기반 판단 변화는 좁다(결정적 개인화 3종: Candidate 재생 · Avoid 차단 · 노드 선호, 정확 key 일치 한정).

RPA_DEPENDENCY = 높음 — 하드코딩 allowlist + 키워드 대상 선택 · 화면 단위 다음 클릭 루프 · 약한 완료 기준(무언가 읽었으면 완료) · 정확 key 매크로 재생 · 서버 고정 health.kr 절차 · 수동 실행 PC agent/개발자 모드 확장. 미등재 대상은 chat 으로 빠진다.

TOP_GAPS = ① 업무 수준 이해 · 완료 판정이 Assistant 에 없음(L4 프롬프트에 매몰) ② 저장된 경험 대부분이 다음 판단에 읽히지 않음(write-only ledger · 비방법 교정 · 도움 이력) ③ 서버 측 업무 연속성 없음(taskId/recoveryHint 클라이언트 미전송 · 새로고침 소실) ④ 속도 · 효과 측정 부재(LLM 비중 · 실 queue RTT · 원장 왕복 · Phase E 실효 모두 MEASUREMENT_PENDING) ⑤ 대상 확장 경로 없음.

NEXT_PHASE_RECOMMENDATION = 1순위 Task Understanding & Completion(목표 · 완료 조건 구조화와 완료 판정의 소유를 L1/L2 로) — 동시에 최소 비용으로 2순위 Measured Baseline(기존 수집 지표의 Cloud 집계 + Phase E 실 PC 측정)을 병행 · 3순위 Server-side Task Continuity + Experience read-back.

WHY_THIS_FIRST = "RPA → PA" 의 경계는 업무를 이해하고 끝났는지 아는 능력이다. 이것이 L4 프롬프트에 있는 한 Memory · 채널 · 속도 개선은 모두 화면 클릭 루프를 강화할 뿐이고, 경험이 무엇을 바꿨는지도 판정할 기준(완료)이 없다. 측정은 이 변경과 이후 속도 작업의 효과를 숫자로 확인하기 위한 전제라 비용이 작을 때 같이 깐다.

WHAT_NOT_TO_BUILD_YET = Multi-Agent · Workflow Engine · 표준 Workflow(P3 위반 위험) · 새 ingress(Kakao/MCP/ChatGPT) · Memory 종류 추가 · 모델 교체/Cloud Browser · run_unit 의 UIA/CU 확장 · allowlist 대량 추가. (installer · 자동 업데이트는 PA 능력과 별개인 배포 트랙으로 분리 판정)
```

---

*조사 전용 IR — 코드 · DB · runtime · 배포 변경 없음.*
