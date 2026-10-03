# IR-O4O-PERSONAL-ASSISTANT-PHASE-A-TASK-FOUNDATION-CENSUS-AND-DESIGN-V1

> **상태**: COMPLETED (조사 · 설계 전용) — 코드 · DB · migration · 배포 변경 0건
> **작성일**: 2026-10-03
> **근거 WO**: `WO-O4O-PERSONAL-ASSISTANT-PHASE-A-TASK-FOUNDATION-CENSUS-AND-DESIGN-V1` (사용자 지시 2026-10-03, WO 문서 없음 — 이 IR 이 기록)
> **기준 커밋**: `origin/main` a1ff654c8 (V2 ACTIVE)
> **기준 정본**: [`O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2`](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) §2 · §3 · §4 · §9 · §17 · §18 (단계 A)
> **방법**: 요청 경로(route → router → runtime → command)와 run 상태 저장(Cloud · Local)을 두 축으로 병렬 추적하고, 결론을 좌우하는 주장은 원 코드에서 다시 확인했다(부록 A).

---

## 0. 결론

1. **Assistant 는 Phase A 에서 DB entity 로 만들지 않는다.** `userId` 하나에 결정적으로 대응하는 **논리 orchestration 계층**(서비스 모듈)이면 V2 §3 ONE Assistant 를 만족한다. Assistant 가 들고 있어야 할 상태(선호 · 기억)는 단계 C(Legal Gate 이후)의 일이다.
2. **Task 는 새 Cloud 레코드로 만든다 — `work_run` 의 이름 변경이 아니다.** 현재 코드에는 "한 업무가 여러 실행에 걸치는" 경우가 이미 있다: TAKEOVER 뒤 재시도는 **연결 없는 새 runId** 가 되고(§2-3), 실행 노드가 바뀌면 run 의 `device_id` 가 덮어써진다. 그리고 run 없이 끝나는 업무(확인 대기 · 노드 없음 · chat 답변)도 있다. 이 셋은 run 하나로 표현되지 않는다.
3. **관계는 `Task 1 : N run`, `run 1 : N segment`** 로 둔다. run = **한 노드에서의 한 실행 시도**, segment = 같은 run 안의 질문 → 답변 재개(현행 유지). discovery / execution / recovery / verification 을 run **종류**로 나누는 것은 Phase A 에서 하지 않는다 — 지금 replay → 어긋남 → AI loop 전환은 한 run 안에서 일어나고 그것으로 충분하다. 종류 구분이 필요해지는 시점은 단계 B(planner 분리) · D(Node 계약)다.
4. **Task 의 최소 Cloud 필드는 "업무의 뼈대" 뿐이고, 요청 원문은 저장하지 않는다.** 원문 · 대화를 Cloud 에 두는 것은 V2 §17 Gate 대상(처리방침 "프롬프트 원문 미저장" · home-chat "conversation persistence 금지" · EXP D3/D4)이다. Phase A 의 Task 는 구조(소유 · 대상 · 상태 · 결과 등급 · run 연결)만 가진다.
5. **기존 `/api/ai/request` · router · `runWorkAgent` · planner 는 그대로 살린다.** 삽입 지점은 두 곳이다: ① router 결정 직후 **Assistant → Task**(Task 생성/이어받기 · 소유 context 확정) ② `performWorkAgentRun` 호출부 **Task → Execution**(run 을 Task 에 붙이고 종료 결과를 Task 로 올림). planner 내부는 Phase A 에서 건드리지 않는다(분리는 단계 B).
6. Phase A 구현은 **DB migration · API 응답 계약 변경**을 포함하므로 CLAUDE.md 중지 조건에 해당한다 — 구현 WO 에서 사용자 승인 항목으로 명시해야 한다(§7).

---

## 1. 현재 경로 (AS-IS)

```text
[web-neture O4OHomePage / HospitalDrugPage]
   │ POST /api/ai/request {text, attachments?, runId?, targetHint?, routeHint?, workScope}
   │   (동기 HTTP 1회 · 응답까지 spinner · 폴링 없음 · runId 는 React state resumeAnchor 뿐)
   ▼
ai-proxy.routes.ts:2201
   ├ classifyUnifiedRequest (결정론 · AI 호출 없음) → chat | work | confirm_work
   │    runId 있으면 무조건 work(resume)
   ├ confirm_work → 확인 문구만 반환 (실행 0 · 기록 0)
   ├ chat → performHomeChat (DB write 0 · 대화 저장 금지)
   └ work → performWorkAgentRun  ── toolCtx = { userId, workspace:'home' } 고정
                                    (workScope 미전달 · serviceKey/organizationId 없음)
        └ runWorkAgent (단일 loop · 14 step · 8 plan · 90 s)
             goalId = 'g_'+Date.now(36) = 새 runId
             ├ resolveTargetDevice (온라인 1대만 · 2대↑ ambiguous)
             ├ work_run_coordination INSERT/transition (user_id · device_id · status · version · TTL 30분)
             ├ Candidate replay → planner loop (업무판단 + 다음 행동 + 완료 선언 = JSON 1개)
             ├ 명령 1개씩 local_agent_commands INSERT → 250ms 폴링 (≤12 s)
             └ finish: Cloud status + Local ledger 5종 기록 (전부 같은 명령 큐)
```

---

## 2. 사실 (Census)

### 2-1. 진입 · 문맥

| 사실 | 근거 |
|---|---|
| work 요청은 동기 HTTP 1회. run 상태 조회 · 폴링 endpoint 없음 | `ai-proxy.routes.ts:2201-2292` · `:308` |
| work 경로 문맥은 `{ userId, workspace:'home' }` 고정. `workScope` 는 work 경로로 전달되지 않음 | `ai-proxy.routes.ts:288` · `:2278-2284` |
| chat 경로는 `resolveWorkScopeStore` 로 serviceKey · organizationId 를 서버에서 확정 | `ai-proxy.routes.ts:1883-1901` |
| 정본 조직 해석기 존재 — serviceKey 기준 후보 · 2개↑ 임의 선택 금지 · 클라이언트 선택은 힌트만 | `utils/store-organization.resolver.ts:236` |
| home-chat: "DB write 0 · conversation persistence 금지" | `ai-proxy.routes.ts:1838-1840` |
| confirm_work 는 확인 문구만 돌려주고 아무것도 남기지 않음. 사용자가 [진행]을 누르면 같은 문장을 `routeHint:'work'` 로 재전송 | `ai-proxy.routes.ts:2261-2274` · `unified-request-router.ts:141` |

### 2-2. 업무 판단과 실행 판단의 위치

| Assistant 수준 판단 (V2 L1/L2) | 위치 |
|---|---|
| chat/work/confirm 분기 · 대상 해석 · modality | `unified-request-router.ts:134` · `work-target-resolver.ts:36` · `task-modality-router.ts:124` |
| task · stage · strategy · ask · `assessment` · `done` · takeover | **planner JSON 1개** (`work-agent-runtime.ts:234-292`) — 다음 행동과 같은 호출 |
| 질문 근거 분류 · method discovery · planner 모드 | `work-agent-runtime.ts:156` · `:1595-1609` · `:167` |
| 종료 상태 매핑 · 재개 가능 판정 | `work-agent-runtime.ts:963-972` · `work-run-coordination-service.ts:181` |

| Execution 수준 판단 | 위치 |
|---|---|
| action/actions · 검증 · 실행 · 관찰 · replay · batch · 안전 매핑 | `work-agent-contract.ts:332-518` · `work-agent-runtime.ts:1312-1395` · `:1413-1472` · `:1735-1765` · `:1772-1782` |

**완료는 planner 의 `done`/`completed` 선언으로만 정해진다**(`work-agent-runtime.ts:1627-1631`). 완료 계약 객체는 없다.

### 2-3. run 의 실제 수명

| 사실 | 근거 |
|---|---|
| 새 요청 = 새 runId (`g_`+밀리초 base36 — 전역 · 사용자 무관) | `work-agent-runtime.ts:610` · `:1128` |
| QUESTION → 답변 재개는 **같은 runId**, Local 에서 segment 증가 | `work-run-coordination-service.ts:181-193` · `local-db.mjs:918-921` |
| TAKEOVER · 완료 · 중지로 끝나면 클라이언트가 앵커를 해제 → 사용자가 같은 업무를 다시 요청해도 runId 없이 **새 run** — 앞 run 과 연결 없음. (API 의 `recoveryHint` 도 runId 없는 새 run 경로이며 web-neture 는 현재 보내지 않음) | `services/web-neture/src/lib/ai/work-agent.ts:71-79` · `ai-proxy.routes.ts:2283` |
| 재개 시 노드를 다시 고르고 `device_id` 를 덮어씀 (`COALESCE(new, old)`) | `work-run-coordination-service.ts:144-175` · `work-agent-runtime.ts:1075-1083` |
| status 5종(`active · waiting_for_user · completed · taken_over · expired`). `stopped` 은 `taken_over` 로 저장 · `failed` 없음 | `work-run-coordination-service.ts:35-45` · `work-agent-runtime.ts:733-736` |
| run 간 parent/child · 묶음 없음. Cloud row 에 task 개념 없음 (`task_key` 는 Local 만) | run 저장 조사 §2 · §4 |
| Cloud row 경계 키 = `user_id` · `device_id` 만 (organization · service 없음) | `canonical-schema-baseline.ts:4486-4496` |
| `local_agent_commands` 에 `run_id` 없음 — 명령과 run 은 시간창으로만 연결 | `work-run-executor.ts:179-204` |
| 클라이언트의 runId 는 React state 뿐 — 새로고침하면 잃음 | `O4OHomePage.tsx:215` · `:224` |

### 2-4. Task · 대화 저장소

- task / assistant / conversation / chat_history / ai_session 테이블 · entity **0건**.
- 업무 단위 기록이 있는 곳은 Local SQLite(`local_work_runs.task_key` · `goal_summary`) 뿐. Local 테이블 어디에도 user · organization 차원이 없다.
- 가장 가까운 Cloud 기록은 `ai_query_logs`(`/api/ai/query` 전용 Q/A 원문) · `automation_jobs`(VIDEO 전용 — 계약상 이 축에 재사용 금지, `work-agent-contract.ts:41`).

### 2-5. 코드 계약 주석과의 관계

`work-agent-contract.ts:41-46` 은 "scheduler · background queue · executor · general workflow engine · agent loop · retry orchestration · **planner state machine** · tool execution queue · background worker · 사이트별 사전 정의 workflow · 단일 실행의 공용 workflow 자동 승격 · Safety/Risk/capability 완화" 를 금지하고, "PHASE 1 run ledger is Local-canonical; cloud holds coordination only" 라고 적는다.

- Task 레코드(소유 · 상태 · run 연결)는 위 금지 목록의 어느 것도 아니다 — 스케줄 · 큐 · 재시도 orchestration 을 하지 않는다.
- 그러나 마지막 문장(cloud = coordination only)은 V2 §9 Ownership-first 이후 **원칙상 낡았다**(물리 이동은 Gate 뒤). Phase A 구현 WO 는 이 주석을 V2 기준으로 고쳐 써야 한다 — 금지 목록 중 scheduler · background queue · worker · 사전 정의 workflow · Safety 완화는 **유지**.

---

## 3. 결정 1 — Assistant 를 entity 로 만드는가

**판정: Phase A 에서는 만들지 않는다.**

| 근거 | |
|---|---|
| Assistant 에 고유 상태가 아직 없다 | 선호 · 기억 · 대화 맥락은 단계 C(Gate 뒤). Phase A 의 Assistant 가 하는 일은 판단(분기 · Task 생성/이어받기 · 소유 확정)이지 저장이 아니다 |
| ONE Assistant 는 키로 보장된다 | Assistant = `f(userId)`. 채널이 달라도 같은 userId 면 같은 Assistant 다(V2 §3-1). row 가 없어도 깨지지 않는다 |
| row 를 먼저 만들면 비어 있는 테이블이 계약이 된다 | 나중에 기억 · 선호가 들어올 때 어디에 둘지는 §9 소유 주체(organization · user)로 정해야 하며, "assistant" 라는 중간 주인을 만들면 소유 축이 하나 늘어난다 |

구현 형태: `services/ai-tools/` 아래(또는 새 `services/assistant/`) **Assistant 서비스 모듈** — 입력 = 인증 userId + 요청 + 서버 확정 문맥, 출력 = Task 결정(새로 만든다 / 이어받는다 / chat 으로 답한다 / 확인을 받는다). 기존 `classifyUnifiedRequest` 는 이 모듈 안의 빠른 사전 분류로 재배치한다(V2 §20).

**다시 볼 시점**: 단계 C 에서 user 소유 선호 · 대화 맥락을 둘 때. 그때도 별도 `assistants` 테이블보다 user 소유 저장소가 먼저 검토 대상이다.

---

## 4. 결정 2 — Task 최소 모델

### 4-1. Cloud 에 저장할 것 (Phase A)

| 필드 (개념명) | 이유 | 비고 |
|---|---|---|
| `task_id` | 1급 식별자 | **서버가 생성하는 UUID**. runId 의 밀리초 문자열 방식을 쓰지 않는다(§8-1) |
| `user_id` | 요청자 · 1차 경계 | 인증 세션에서만 |
| `organization_id` · `service_key` | V2 §3-2 Task 마다 업무공간 · 조직 | **서버가 확정** — `resolveStoreOrganization` 등 기존 해석기. 클라이언트 값은 힌트. 없으면 NULL(개인 업무) |
| `workspace` | 업무공간 | 현행 `'home'` 고정을 그대로 기록하되 컬럼은 둔다 |
| `channel` | 요청 채널 (web 등) | 단계 G ingress 대비. Phase A 는 `web` 하나 |
| `target_id` · `target_kind` | 업무 대상 | 등재 id 또는 provisional |
| `task_type_key` (nullable) | V2 §4-4 Task type | planner 가 제안한 값을 **provisional** 로만. 목록을 미리 만들지 않는다 |
| `status` | §4-3 | 아래 4-2 |
| `outcome` · `outcome_evidence` | 완료 계약의 결과 등급 | EXP §9 근거 3등급 재사용 |
| `current_run_id` | 진행 중 run | run 쪽에 `task_id` 를 두면 생략 가능 — 구현 WO 에서 택1 |
| `created_at` · `updated_at` · `ended_at` · `expires_at` | 수명 · 보유 | 보유기간은 Gate 전에도 **무기한 금지**(보유기간 정책) — 기본안: 종료 후 run 과 같은 수준의 짧은 보존 |

### 4-2. status

```text
대기/진행:  open · running · waiting_for_user · waiting_for_confirm · blocked
종결:       completed · user_completed · cancelled · expired

open → running ⇄ waiting_for_user
     └ waiting_for_confirm (confirm_work)
running → blocked (노드 없음 · 권한 · 사용자 결정 필요 · 막힌 takeover) → 사용자 조치 뒤 같은 Task 에 새 run
running → user_completed (사용자가 화면을 이어받아 끝냄)
```

- `user_completed` · `blocked` 는 정상 결과(V2 §4-3). 실패 카운트에 넣지 않는다. `blocked` 는 종결이 아니다 — 같은 Task 로 재시도할 수 있다.
- 이어붙임 규칙(§6-2): 요청에 `taskId` 가 있고 그 Task 가 **종결 상태가 아닐 때만** 새 run 을 붙인다. 종결 Task 에 대한 요청은 새 Task 다.
- run status(5종)는 그대로 두고, Task status 는 run 결과에서 **파생**한다. run 의 `taken_over` 가 Task 에서는 "사용자가 이어 끝냄(user_completed)" 인지 "막힘(blocked)" 인지 나뉜다 — 현재는 구분 근거가 takeover reason 뿐이므로 Phase A 는 reason → Task status 매핑 표를 둔다.

### 4-3. Cloud 에 저장하지 않는 것 (runtime object · 또는 Gate 뒤)

| 항목 | 이유 |
|---|---|
| 요청 원문 · 대화 · 답변 원문 | 처리방침(프롬프트 원문 미저장) · home-chat 계약 · EXP D4 → **V2 §17 Gate 대상** |
| slot 값(약품명 · 거래처 · 금액) | EXP D3 — run 소유 · 종료 시 삭제 |
| 완료 계약의 세부(무엇을 확인하면 끝인가) | Phase A 는 runtime object. 계약 객체를 영속화할지는 단계 B(planner 분리)에서 — 그때 Assistant 가 완료를 판정하게 된다 |
| planner 계획 · history · 화면 관찰 | Execution 영역 · 저장 금지 항목 |

**표시용 제목**: 사용자가 Task 목록을 보려면 무엇인가 라벨이 필요하다. 원문 대신 `task_type_key` + `target` 의 표시명으로 만든다. 원문 요약을 Cloud 에 두려면 Gate 가 먼저다(§7 결정 항목 P-2).

---

## 5. 결정 3 — Task 와 `work_run` 의 관계

**판정: `Task 1 : N run` · `run 1 : N segment`. Task ≠ work_run 이름 변경.**

### 5-1. 근거 (현재 코드에서 이미 일어나는 일)

| 상황 | 현재 | Task 가 있으면 |
|---|---|---|
| QUESTION → 답 → 재개 | 같은 runId · segment +1 | 같은 Task · 같은 run (변경 없음) |
| TAKEOVER → 사용자가 "다시 해줘" | 앵커 해제 → **새 runId · 앞 run 과 연결 없음** | 같은 Task 의 두 번째 run (클라이언트가 `taskId` 유지) |
| 재개 시 노드 변경 | run 의 `device_id` 덮어씀 | 같은 Task · 새 run(노드별 시도 분리) — 단계 D 에서 채택. Phase A 는 현행 유지 가능 |
| confirm_work 대기 | 아무것도 안 남음 | Task `waiting_for_confirm` · run 0개 |
| 노드 없음 / ambiguous / offline | run 생성 전 종료 | Task `blocked` · run 0개 |
| chat 으로 답한 질문 | — | Task 를 만들지 않는다(§6-2) |

### 5-2. run 종류(discovery · execution · recovery · verification)

- **Phase A 에서 도입하지 않는다.** 현재 replay(결정적) → 어긋남 → AI loop(Discovery) 전환은 **한 run 안의 수준 전환**이다(V2 §8-3 "stage 별로 수준이 섞일 수 있다"). 이를 run 종류로 쪼개면 같은 화면 상태를 run 사이로 넘겨야 하고, 현재 명령 프로토콜에서 비용만 늘어난다.
- 재시도(recovery)만은 위 표처럼 이미 **별도 run** 으로 일어나고 있으므로 Task 아래 두 번째 run 으로 묶는다.
- verification run(완료 확인용 별도 실행)은 완료 계약을 Assistant 가 판정하는 단계 B 에서 필요 여부를 다시 본다.

### 5-3. 연결 방식

- run 쪽에 `task_id` 를 단다(`work_run_coordination.task_id` nullable · 기존 row 는 NULL). Task 쪽 `current_run_id` 는 보조.
- 이것은 **Cloud migration** 이다(§7).
- Local SQLite 는 Phase A 에서 바꾸지 않는다 — Local 원장에 `task_id` 를 넣는 것은 단계 C(Memory Placement) 이전에 할 이유가 없고, Local 쪽 run_id 로 충분히 역추적된다.

---

## 6. 결정 4 — 기존 경로를 얼마나 살리는가

### 6-1. 삽입 지점

```text
POST /api/ai/request  (유지 · 동기 HTTP 유지)
   │
   ▼
[Assistant 모듈]  ← 신규 (논리 계층 · entity 없음)
   ├ 문맥 확정: userId(세션) · serviceKey/organizationId(서버 해석 — chat 경로와 같은 방식을 work 에도)
   ├ classifyUnifiedRequest (유지 · 사전 분류로 재배치)
   ├ chat         → performHomeChat (유지 · Task 없음)
   ├ confirm_work → Task(waiting_for_confirm) 생성 · taskId 반환
   └ work         → Task 생성 또는 이어받기(taskId · runId)
                     │
                     ▼
              [Task → Execution 경계]  ← 신규 (얇은 adapter)
                     ├ 노드 해석 결과 없음/ambiguous → Task blocked (run 0)
                     ├ performWorkAgentRun → runWorkAgent (유지 · planner 무변경)
                     │     run 에 task_id 부착
                     └ run 종료 결과 → Task status/outcome 갱신 (매핑 표)
```

### 6-2. Task 를 만드는 경우 / 만들지 않는 경우

| 분기 | Task |
|---|---|
| work (새 요청) | 생성 |
| work (resume · runId) | 기존 Task 이어받기 — runId 로 Task 를 찾되 **소유자 확인(user_id) 필수** |
| work (종료된 run 뒤 재시도) | 기존 Task 에 새 run — 클라이언트가 `taskId` 를 보내야 연결된다. 같은 업무의 재시도인지 새 업무인지는 Assistant 가 판단(Phase A 기본: `taskId` 가 있고 Task 가 종결 상태가 아닐 때만 이어붙임 — §4-2) |
| confirm_work | 생성(`waiting_for_confirm`) — [진행] 시 같은 Task 로 이어감 |
| chat | 만들지 않는다 (home-chat 계약 · DB write 0 유지) |
| hospital-drug surface | Phase A 범위 밖 — 병원약국 Local-only 결정(V2 §16) · 별도 판단 |

### 6-3. 응답 · 클라이언트 계약

- 기존 응답에 `taskId` · `task.status` 를 **추가**한다(additive). `runId` · `resumable` 은 유지.
- 클라이언트 `resumeAnchor` 에 `taskId` 를 더한다. 새로고침 후 이어가기(Task 조회 endpoint)는 Phase A 최소 범위에서 **선택** — 넣으면 GET 1개(소유자 한정 · read-only)다.
- 이는 **API contract 변경**이다(CLAUDE.md 중지 조건) — additive 지만 승인 항목에 넣는다.

### 6-4. Phase A 에서 하지 않는 것

planner 분리(단계 B) · 비동기 Task 실행 · 진행 상황 push · 다중 노드 선택 · 명령 프로토콜 변경 · Local 스키마 변경 · Memory 이동 · 요청 원문 Cloud 저장 · Skill registry.

---

## 7. Phase A 구현 WO 에 넣을 승인 항목

| # | 항목 | 성격 |
|---|---|---|
| P-1 | Cloud 신규 테이블(Task) 1개 + `work_run_coordination.task_id` nullable 컬럼 | DB migration (CI 자동 · LEVEL 3 → promote) |
| P-2 | Task 에 요청 원문/요약을 **저장하지 않는다**(구조만) — 기본안. 저장하려면 V2 §17 Gate 먼저 | 데이터 처리 경계 (기본안은 기존 정본 그대로 · 새 정책 아님) |
| P-3 | Task 도메인 경계: Primary = `userId`, Secondary = `organizationId` · `serviceKey`(서버 확정) — BOUNDARY "신규 Domain 추가(기존 Domain 무영향)" 허용 범위 | 구조 (V2 §24 가 Phase A 설계에 위임한 항목) |
| P-4 | `/api/ai/request` 응답 additive(`taskId` · `task.status`) + 요청 `taskId` 수용 · (선택) 소유자 한정 GET Task | API contract |
| P-5 | work 경로에 serviceKey/organizationId 서버 확정 추가(chat 경로와 동일 해석기) | 권한 문맥 — 해석기 재사용 · 권한 완화 없음 |
| P-6 | `work-agent-contract.ts:41-46` 주석을 V2 기준으로 갱신(금지 목록 유지 · "cloud = coordination only" 문장 정정) | 코드 계약 문서 |
| P-7 | Task 보존기간 기본값(무기한 금지) | 보유기간 정책 정합 |

---

## 8. 범위 밖 발견 (별도 WO 제안 · 수정 안 함)

| # | 발견 | 근거 | 영향 |
|---|---|---|---|
| 8-1 | runId 가 `g_`+밀리초(전역)이고 `createWorkRun` 은 `ON CONFLICT DO NOTHING` 후 **user 필터 없는** `getWorkRun` 으로 기존 row 를 돌려준다 → 같은 밀리초에 두 사용자가 시작하면 두 번째 사용자가 첫 사용자의 coordination row 를 받는다 | `work-agent-runtime.ts:610` · `work-run-coordination-service.ts:113-133` | 드묾 · Guard Rule 1(UUID 단독 조회 금지) 성격. Task 는 UUID 를 쓰므로 Phase A 와 함께 run 쪽도 정리 권장 |
| 8-2 | `cleanupExpiredWorkRuns` 호출처 0 — 종료 row 24시간 보존 · 만료 전환이 실제로 일어나지 않음(만료는 `checkResumable` 시각 비교로만) | `work-run-coordination-service.ts:200` (호출 grep 0) | row 무기한 누적 — 보유기간 원칙과 어긋남 |
| 8-3 | `local_agent_commands` 삭제 · 정리 경로 없음 | run 저장 조사 §1 | 감사 행 무기한 누적 |
| 8-4 | 클라이언트 `goal.status` 타입에 `'taken_over'` 누락 | `services/web-neture/src/lib/ai/work-agent.ts:36` vs `work-agent-contract.ts:81` | 타입 drift |
| 8-5 | Local SQLite 는 사용자 차원이 없어, PC 를 다른 사용자로 재페어링하면 이전 사용자의 Local 기록을 물려받는다 | `local-db.mjs` 전 테이블 · `local_agent_devices.user_id` | V2 §9(node 에는 실행환경만)와 어긋남 — 단계 C 입력 |
| 8-6 | work-agent planner LLM 호출이 `ai_usage_logs` 에 남지 않음(비용 telemetry 공백) | `work-agent-runtime.ts:467-520` · `ai-core execute` | 사용량 · 비용 집계 누락 |

---

## 부록 A. 원 코드 재확인 (2026-10-03, `a1ff654c8`)

| 주장 | 위치 |
|---|---|
| `goalId = 'g_'+Date.now().toString(36)` · 새 run = goalId | `work-agent-runtime.ts:610` · `:1128` |
| `ON CONFLICT (run_id) DO NOTHING` → `getWorkRun(runId)` (user 필터 없음) | `work-run-coordination-service.ts:113-133` |
| `cleanupExpiredWorkRuns` 정의만 존재 | `work-run-coordination-service.ts:200` |
| work 경로 `toolCtx = { userId, workspace:'home' }` | `ai-proxy.routes.ts:288` |
| home-chat "DB write 0 · conversation persistence 금지" | `ai-proxy.routes.ts:1838-1840` |
| 금지 목록 · "cloud holds coordination only" | `work-agent-contract.ts:41-46` |
| 조직 해석기 — serviceKey 후보 · ambiguous 시 임의 선택 금지 | `utils/store-organization.resolver.ts:236` |

## 부록 B. 하지 않은 것

코드 · DB · migration · 배포 · Local Agent · Chrome Extension 변경 0건. 실 PC smoke · production DB 조회 0건. 범위 밖 결함(§8)은 보고만 했다.
