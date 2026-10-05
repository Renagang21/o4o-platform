# CHECK-O4O-PERSONAL-ASSISTANT-PHASE-B-PLANNING-SEPARATION-V1

> **WO**: `WO-O4O-PERSONAL-ASSISTANT-PHASE-B-PLANNING-SEPARATION-V1` (사용자 지시 2026-10-04, WO 문서 없음 — 이 CHECK 가 기록)
> **일자**: 2026-10-04
> **정본**: [`O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2`](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) §0-1(P3 개인화) · §2-1(Assistant Planning ≠ Execution Planning) · §4-3(완료 계약) · §18 단계 B
> **선행**: Phase A [`CHECK-…-PHASE-A-TASK-FOUNDATION-V1`](CHECK-O4O-PERSONAL-ASSISTANT-PHASE-A-TASK-FOUNDATION-V1.md) (배포 완료 · closure smoke PENDING — 이 WO 범위 밖)
> **작업공간**: 전용 worktree `D:/o4o-wt/pa-phase-b` · branch `wo/personal-assistant-phase-b-planning-separation-v1` · base `origin/main` `4a843feab`
>
> **현재 해석 (2026-10-05 · `WO-O4O-PERSONAL-ASSISTANT-PC-INDEPENDENCE-DOCUMENT-ALIGNMENT-V1`)** — 본문은 당시 기록 그대로 둔다. 본문의 "실 PC 는 Phase A closure 와 같은 조건(사무실 PC)" · §6-2 "실 PC 에서만 확인 가능한 것" 은 V2 §11-1-a 에 따라 이렇게 읽는다.
> - **Execution Report → Task 판정 = Architecture / Execution integration 검증** — 주입한 실행 본체 · 실 runtime harness 로 자동 검증 대상이며 특정 PC 가 필요하지 않다. Phase B 판정(CLOSED)은 이것으로 유지된다.
> - 실행 지시가 실제 planner 에 실리고 실제 화면에서 run 이 열리는 장면 = **Execution Runtime smoke** — capability 를 가진 아무 Execution Node 면 된다. 특정 PC("사무실 PC")는 조건이 아니다.

---

## 0. 판정

```text
STATE                    = CLOSED (2026-10-04 · §6) — main 통합 PR #290 (1497a9d26) · API LEVEL 2 배포 · production 경로 확인. 실 PC 전용 항목은 §6-2 에 분리
(이전 판정)               = READY_TO_INTEGRATE (main 미통합 · 배포 0)
ASSISTANT_PLANNING       = services/assistant/assistant-planning.ts — Task 마다 ExecutionIntent(수행 방향) · 결정론(AI 호출 0)
EXECUTION_PLANNING       = 기존 work-agent planner — 실행 지시 안에서 화면 행동만 · 결과는 ExecutionReport(주장 + 근거)
COMPLETION_JUDGEMENT     = Assistant(judgeTaskStatus) — 완료 계약(result_observed) + 실행 근거. planner 의 done 은 주장일 뿐
WORKFLOW_SELECTOR        = 없음 — ExecutionIntent 에 절차/workflow/candidate/skill 칸 없음 · Task type 은 이어받기 힌트
EVIDENCE (P3)            = own_experience · knowledge · shared_candidate · discovery — 전부 binding=false · 결정적 실행 허락은 own_experience 만
OWNERSHIP vs PROCEDURE   = USER/ORGANIZATION 은 실행 지시를 바꾸지 않는다(테스트 ④)
SCHEMA / MIGRATION       = 0 (Phase A 구조로 충분 — §2)
RAW_TEXT                 = 실행 지시 · plan · Task 저장 경로에 원문 0 (sentinel 테스트 ⑦)
USER_RESPONSE            = 무변경 — HTTP 응답 형상 · runtime goal.status · 메시지 그대로(Task 상태만 판정 근거가 바뀜)
DEPLOYMENT               = LEVEL 2 AUTO_DEPLOY — o4o-core-api-03816-jiw traffic 100% · /health/ready 200 · migration 실행 0
```

## 1. 무엇을 분리했나

```text
/api/ai/request (work)
  → Assistant → Task (Phase A)
  → Assistant Planning      planAssistantTask()  → ExecutionIntent
        시작 역할(discovery | resume) · 이어갈 Task type 힌트 · 근거 목록(비구속) · 완료 계약 · 승인 경계
  → Execution               performWorkAgentRun(…, intent) → runWorkAgent(input.intent)
        planner 입력에 intent · 프롬프트 "## 실행 지시 (Assistant · 구조)" · 결과에 ExecutionReport
  → Assistant 판정          judgeTaskStatus(contract, report) → Task 상태
```

| 책임 | 전 | 후 |
|---|---|---|
| 수행 방향(시작 역할 · 이어받기 · 근거) | runtime 안에서 planner 가 암묵적으로 | Assistant Planning 이 ExecutionIntent 로 명시 |
| Task 완료 | planner `done` → goal.status completed → Task completed (Phase A 매핑) | Execution 은 `execution_complete` 를 **주장**, Assistant 가 결과 근거(문서 이동 · 결과 읽기 · 결정적 재생 완료)로 판정. 근거 없으면 `handed_over` |
| Task type | planner 선언 → Task 에 기록 | 같음(Execution 의 관찰) + 이어받는 Task 의 이전 Task type 을 Assistant 가 다음 실행에 힌트로 준다 — 절차를 고정하지 않는다 |
| 화면 행동 | planner | planner (무변경) |

### 주요 설계 판단

1. **결정론 Assistant Planner.** 실행 전에 Assistant 가 확실히 아는 것(재개 · 이전 Task type · 사용자 방법 힌트)만으로 방향을 정한다. LLM 호출을 더하지 않았다 — 속도 문제(GAP-CENSUS §D)를 키우지 않기 위해서다. `AssistantPlan` 은 교체 가능한 결과 객체라 이후 모델 기반 판단으로 바꿔도 경계는 같다.
2. **자기 Experience 는 아직 노드에 있다.** V2 §9-4 · §17 Gate 전이라 Experience 를 Cloud 로 옮기지 않았다. 그래서 "검증된 자기 방법이 있으면 Experienced" 판정은 Execution 이 노드에서 읽은 근거로 하되, 그 규칙(근거 출처 = 자기 Experience 만)을 ExecutionIntent 의 `mayAuthorizeExperienced` 로 고정했다.
3. **사용자 응답 무변경.** 실행 계층의 goal.status · 메시지는 그대로 두고 Task 상태만 Assistant 판정으로 바꿨다 — 사용자가 보는 흐름은 회귀하지 않는다.
4. **프롬프트 변경 최소.** `done` 정의 한 줄(결과 화면 도달 = 실행 주장, 업무 완료는 Assistant 판정)과, 지시가 있을 때만 붙는 "실행 지시" 블록뿐이다. `/work-agent/run` 직접 호출(지시 없음)은 종전 프롬프트 그대로다.

## 2. Phase A 구조가 Phase B 를 막는가 — 막지 않음

- Assistant Identity = 인증 사용자(f(userId)) · Work Context = Task 의 ownership(USER/ORGANIZATION · organization · serviceKey) · Request Channel · Execution Node 는 Task 행에 없지만 **Task 소유와 절차 선택이 이미 분리**돼 있어 실행 지시에 담을 필요가 없었다. 노드는 기존대로 Execution 이 고르고(resolveTargetDevice), 채널은 현재 O4O Web 하나다.
- 그래서 schema · migration 추가 없음. Request Channel · Node 를 Task 에 기록하는 것은 단계 D · G 의 일이다.

## 3. 변경 파일

| 파일 | 내용 |
|---|---|
| `services/assistant/assistant-planning.ts` (신규) | `planAssistantTask` · `planningEvidence` · `judgeTaskStatus` |
| `services/assistant/personal-assistant.ts` | Task 획득 → Assistant Planning → 지시와 함께 위임 → 보고로 판정(`taskStatusFor`) · 결과에 `plan` |
| `services/ai-tools/work-agent-contract.ts` | `ExecutionIntent` · `PlanningEvidence` · `CompletionContract` · `ExecutionReport` 타입(Assistant ↔ Execution 경계) |
| `services/ai-tools/work-agent-runtime.ts` | `input.intent` 수신 · planner 입력 전달 · `describeExecutionIntent` · Task type 힌트를 확인된 업무 키 앞에 · `result.report` · `done` 정의 1줄 |
| `routes/ai-proxy.routes.ts` | `performWorkAgentRun(…, intent?)` · `execution.report` 전달 |
| `__tests__/personal-assistant-planning-separation.spec.ts` (신규) | ①~⑦ 15 tests |
| `__tests__/personal-assistant-task-boundary.spec.ts` | ① 호출 단언에 실행 지시(3번째 인자) 반영 1줄 |

## 4. 검증

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` (api-server) | PASS (rc 0) |
| eslint (변경 7 파일) | PASS (rc 0) |
| Phase B spec 15 tests | PASS — ① 방향 4종 ② 절차 칸 없음 ③ 근거 비구속 · Shared 결정적 실행 불가 ④ 소유 범위 무관 ⑤ 완료 판정 매트릭스 + done-무근거 = handed_over + 이어받기 힌트 ⑥ runtime 실 harness(지시 수신 · 힌트 · report · 지시 없음 회귀) ⑦ sentinel |
| 회귀 — Phase A 3 spec · work-agent 7 spec · work-assistance · work-experience · work-target-discovery · windows-automation-safety · windows-ui-automation · unified-request-http | **15 suites · 169 tests PASS** (`--maxWorkers=2`) |
| production · 실 PC smoke | 하지 않음 — 통합 · 배포 뒤 Delivery 판정에 따른다. 실 PC 는 Phase A closure 와 같은 조건(사무실 PC)이 필요 |

## 6. 통합 · 배포 · production 확인 (2026-10-04)

| 단계 | 결과 |
|---|---|
| PR | #290 — CI Gate · API Server Jest 3 shard · CodeQL · Code Quality PASS → merge `1497a9d26` (main 은 그사이 docs · `.claude/commands` · AGENTS/CLAUDE 1줄만 이동 — runtime · migration 0, 통합 규칙 변경 없음) |
| main CI | CI Pipeline · CodeQL success |
| Delivery | run `37179088557` — api **AUTO_DEPLOY(LEVEL 2) DEPLOYED** · web/admin 배포 없음 |
| migration Job | `o4o-api-migrations-4q6pm` SUCCESS — `INCREMENTAL_PENDING = 0` · `INCREMENTAL_EXECUTED = 0` · LIVE fingerprint `42e44a34…` (5972) 불변 |
| rollout | `o4o-core-api-03816-jiw` Ready → traffic 100% (pin 방식 보존) · 전환 후 `/health/ready` 200 (workflow + 수동 재확인) |

### 6-1. production 경로 확인 (read-only 관찰 + work 요청 1건)

- Demo 매장 경영자 계정 `POST /api/ai/request` work 1건 → 403 `WORK_AGENT_NOT_AVAILABLE` + `taskId` (노드 없는 계정 — 예상 경로).
- 새 revision 로그: `assistant plan` (reason=new_task · startMode=discovery · taskTypeHint=false) → `assistant task updated` (status=blocked · executionClaim=None · runLinked=false). **Assistant Planning 이 production 에서 Task 마다 실행되고, 실행 보고가 없는(실행 전 종료) 경우 응답 기준 판정으로 떨어지는 것을 확인.**
- 이 요청으로 생긴 production 행: `assistant_tasks` blocked 1행(구조만). 삭제하지 않았다.

### 6-2. 실 PC 에서만 확인 가능한 것 (Phase B closure 조건 밖)

- 실행 지시가 실제 planner 프롬프트에 실리는 것 · ExecutionReport 로 Task 상태가 판정되는 것(`completed` / 근거 없는 완료 = `handed_over`) — 노드(Local Agent + 확장)가 있어야 run 이 열린다. 실 harness 테스트(⑥)로 검증됐고, production 관찰은 Phase A closure smoke 와 같은 조건(사무실 PC)에서 함께 한다.

## 5. KNOWN GAP / FOLLOW-UP (Phase B 를 막지 않음)

1. **결과 근거의 폭** — `resultObserved` 는 행동 뒤 문서 이동 · 결과 읽기 성공 · 결정적 재생 완료만 본다. 페이지 이동 없이 결과가 바뀌는(ajax) 사이트에서 읽기 없이 끝나면 Task 는 `handed_over` 로 남는다(사용자 응답은 무변경). 근거 종류 확장은 단계 F(관찰) 이후.
2. **Knowledge · Shared Candidate 미배선** — 근거 목록에 자리만 있고 `available:false`. 배선은 단계 E 이후(Shared 는 §10 동의 · 익명화 선행).
3. **Assistant Planner 판단 폭** — 실행 전 정보가 적어 대부분 `discovery` 로 시작한다. 자기 Experience 가 Assistant 쪽으로 오는 것은 단계 C(Gate 후).
4. **완료 계약 영속화 없음** — 계약은 지시 안에서만 산다. Task 행 저장은 필요해질 때.
5. Phase A closure smoke(run↔task 연결) — 별도 PENDING(사무실 PC · 인증 해결 후).

`문서 정합: 해당 없음`
