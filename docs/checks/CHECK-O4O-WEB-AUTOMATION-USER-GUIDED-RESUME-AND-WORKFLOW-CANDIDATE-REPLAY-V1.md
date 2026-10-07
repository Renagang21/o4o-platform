# CHECK-O4O-WEB-AUTOMATION-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1

> **WO**: `WO-O4O-WEB-AUTOMATION-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1`
> **상태**: **`MAIN_AUTOMATION_WORKFLOW_STATUS = BLOCKED`** (실 PC smoke 2026-09-30, `WO-O4O-MAIN-AUTOMATION-PHASE2-REAL-PC-REPLAY-AND-CLOSURE-V1`) — 결함 2건(FAIL 1 같은 run 짧은 답변 재개 · FAIL 2 재생 전 의미 검증 부재)으로 CLOSED 아님. 판정 전문 §10. 수정은 별도 WO. (이력: PHASE 1 구현 + self 검증 완료 · PHASE 2 구현 + self 검증 완료 2026-09-29)
> **작성일**: 2026-09-16
> **선행**: `WO-O4O-PHARMACY-WEB-AUTOMATION-CORE-AND-HEALTHKR-ADAPTER-V0` · `WO-O4O-COMPUTER-USE-V0` · `WO-O4O-AUTOMATION-EXECUTION-LAYER-REALIGNMENT-V1` · PHASE 0 preflight IR(commit `52a9df42a`)
> **commit**: `d9b11d204` (PHASE 1 코드 · 테스트 · migration · manifest) · 본 문서

> **갱신 2026-09-16 (WO-O4O-PHASE1-SAME-RUN-CI-AND-MIGRATION-EXPECTED-STATE-REPAIR-V1)**: `d9b11d204` 는 `expected-schema-states.ts` 5번째 항목 · ledger 명령(`local.data.work_run_*`) spec 4종 · agent `local-db.test` 테이블 수 · lint(`local-agent-protocol.ts` 제어문자 정규식) 를 함께 갱신하지 않아 **origin/main CI red + Deploy API migration Job 실패**(운영 API 가 `fb08c0dd1` 에 머묾)를 일으켰다. `7dfed9a19` · `851552cf6` 로 수리 — 운영 migration Job `SUCCESS`(prefix 4/4 · fingerprint `8b5be7bd…` 5722) · serving `o4o-core-api-03682-9zv`. PHASE 1 코드 자체는 운영에 배포 완료. **§58 실 smoke A~F 는 여전히 PENDING**(Local Agent 연결 환경 필요). 상세: [`CHECK-O4O-PHASE1-SAME-RUN-CI-AND-MIGRATION-EXPECTED-STATE-REPAIR-V1`](CHECK-O4O-PHASE1-SAME-RUN-CI-AND-MIGRATION-EXPECTED-STATE-REPAIR-V1.md).

---

## 0. 한 줄 요약

AI 가 막히면 run 을 무조건 종료하지 않고, **사용자 판단이 필요한 국면(QUESTION)** 은 `waiting_for_user` 로 **일시정지**한다.
사용자가 답하면 **같은 logical run(runId)** 으로 이어받아 — 저장된 관찰을 되살리지 않고 **현재 화면을 재관찰**하고 planner 를
re-prime 해 — 목표를 전진시킨다. 자동 재개가 불가한 국면(never-escalate: credential·commit·모호·미지원 등)은 그대로 **TAKEOVER**
(`taken_over`, 재개 불가)로 끝난다. logical run 의 **정본은 사용자 PC 의 Local SQLite**, Cloud 에는 재개를 위한 **최소 coordination
ledger**(runId·소유자·device·status·version·만료)만 둔다(옵션 B). raw 관찰·DOM·이미지·목표 원문·credential·개인정보는 Cloud 에
저장하지 않는다.

---

## 1. 착수 전 → 이번 PHASE 1 뒤

| 축 | 착수 전 | PHASE 1 뒤 |
|---|---|---|
| run 종료 종류 | takeover 단일(모두 사실상 `needs_user`) | **QUESTION(`waiting_for_user`·resumable) ↔ TAKEOVER(`taken_over`·재개 불가)** 2분기 |
| logical run 식별 | 없음(요청마다 새 goalId, 이어짐 없음) | **runId** — 새 run=goalId 승격, 재개=같은 runId claim |
| run 상태 저장소 | 없음(요청 안에서만 생존) | **Local SQLite 정본**(`work_runs` semantic) + **Cloud `work_run_coordination` 최소 ledger** |
| cloud→local | local.data.* 왕복(SQLite V0) | + `local.data.work_run_upsert` · `local.data.work_run_set_status`(cloud→local write only) |
| agent action 종류 | 변경 0 | 변경 0 (ledger 는 데이터 채널, site-scoped DOM 어휘 불변) |
| 신규 tool verb | — | **없음**(기존 컨벤션 준수 · WO §6) |

## 2. runId 계약 (우선순위 1)

- `WorkGoal.runId?` — logical Work Run 의 유일 앵커. 같은 runId 로 다시 오면 같은 업무를 잇는다.
- `workAgentGoal` 스키마: 허용 키에 `runId` 추가 + 형상 검증(`/^[A-Za-z0-9_-]{1,64}$/`). URL·selector·elementRef 칸은 여전히 없다.
- `POST /api/ai/work-agent/run`: `body.runId` 수신 → args 전달 → runtime 입력. 응답 `data.runId`(opaque) · `data.resumable`.
- 새 run: `goal.runId = goalId`(`g_<base36>` — RUN_ID_RE 적합) → `createWorkRun`. 재개: 입력 runId 로 진입.

## 3. QUESTION ↔ TAKEOVER 분리 (우선순위 2 · §조건 5)

- `QUESTION_TAKEOVER_REASONS = { user_judgment_required }` — 이 사유만 QUESTION. `takeover()` 가 이 사유를 받으면 `question()` 으로 위임한다(모든 호출처 자동 적용).
- `question()` → `terminalKind='question'` · `progress='needs_user'` · `goal.status='waiting_for_user'` · `resumable=true`.
- 그 밖 사유(`ambiguous_result` · `unsupported_control` · `commit_required` · `credential_required` · `site_not_ready` 등) → TAKEOVER → `goal.status='taken_over'` · `resumable=false`.
- 복구 소진(`recover()` giveup): `recoveryGiveupKind = decision.askUser && isEscalatable(cls) ? 'question' : 'takeover'`. NO_PROGRESS·PLANNING_FAILURE=escalatable → QUESTION 가능; RISK_BLOCKED·USER_INTERFERENCE·UNSUPPORTED_UI·AMBIGUOUS_STATE=non-escalatable → TAKEOVER.
- never-escalate 영역(credential·commit·심평원/공단/정부 제출·청구·결제·전자서명·외부 전송)은 **항상 TAKEOVER**.

## 4. waiting_for_user 상태 보존 + 재개 (우선순위 3·4·5·6·7)

- `finish()` 를 async 단일 funnel 로: 종료 종류(kind) 매핑 → `goal.status` → `resumable` → `runCreated && goal.runId` 일 때만 `persistTerminalRun(kind)`(coordination transition + Local SQLite set_status). **pre-run 경로(대상 준비 실패 등)는 `runCreated` 가드로 종전 progress 기준 매핑을 유지**해 회귀 없음.
- 재개 흐름:
  1. 대상 준비 **전** `checkResumable`(읽기 전용) — `waiting_for_user` + 미만료 + 소유자만 통과. 종료·만료·비소유·비대기는 `WORK_AGENT_RESUME_REJECTED` 즉시 거부(대상 준비 비용 전에).
  2. 대상 준비 **후** `transitionWorkRun(status=active, expectedVersion)` 로 claim — version 불일치(다른 인스턴스 선점) → 거부(검증 E).
  3. 재개는 **저장된 관찰을 되살리지 않는다** — loop 가 현재 화면을 새로 관찰(get_context+inspect)하고 planner 를 re-prime 한다(우선순위 6·7).
- QUESTION 메시지는 "답을 주시면 같은 작업을 이어서 진행합니다."로 재개 가능함을 알린다. TAKEOVER 는 화면을 직접 이어받으라고 한다.

## 5. 저장 경계 (옵션 B · §조건 1·2·4)

- **Cloud `work_run_coordination`**(migration `1789540958496-CreateWorkRunCoordination`): `run_id · user_id · device_id · status · version · created_at · updated_at · expires_at` 만. goal/질문/답변 원문 · DOM · screenshot · trajectory · workflow step · 환자/처방/약품 · file path · credential **컬럼 없음**. TTL 30분(비종료) · 종료 보존 24h · `cleanupExpiredWorkRuns`.
- **Local SQLite `work_runs`**(local-db v3 migration): semantic 정본 — `run_id · status · target_id · goal_summary · created_at · updated_at`. 이미지·screenshot·raw DOM 전문·credential/token·개인정보 컬럼 **없음**(검증 D).
- **방향**: cloud→local write 만(`issueWorkRunUpsert` · `issueWorkRunSetStatus`). local→cloud raw read-back 경로 **없음**. generic SQL·arbitrary table·file escape hatch **없음**.

## 6. 검증

### 6-1. self (이번 세션 실측)

| 항목 | 결과 |
|---|---|
| `tsc --noEmit`(default tsconfig) | **PASS** |
| `tsc -p tsconfig.build.json --noEmit` | **PASS** |
| `jest work-agent.spec` (14) | **PASS** |
| `jest work-agent-llm-closure` (10) | **PASS** |
| `jest work-agent-recovery-runtime` · `work-agent-visual-fastloop` | **PASS** |
| `jest local-agent-runtime` · `local-agent-oneclick-pairing` | **PASS** |
| **합계** | **124/124 PASS** |

단위 수준에서 **QUESTION(`user_judgment_required`) → `goal.status='waiting_for_user'` · `resumable=true`** vs
**TAKEOVER(모호·미지원·commit) → `goal.status='taken_over'` · `resumable=false`** 를 결정적으로 확인(work-agent.spec Takeover 절).
ledger 명령은 site-scoped DOM 불변식과 별개 채널임을 하네스에서 분리(응답+seen 제외).

### 6-2. 실 web smoke A~F (§58) — 2026-09-30 실측 결과는 §10

아래는 **실 Chrome + 실 사이트 + Agent 가 대상앱을 조작**해야 성립한다(사람이 대신 조작하면 검증 무효). **결과(§10 매핑)**: A 질문→`waiting_for_user` PASS · **A 의 "답변 → 같은 run resume" 은 FAIL(§10 FAIL 1)** · B PASS · C PASS · D PASS · E 는 version-checked claim 하네스로만 확인 · F PASS_HARNESS.

- **A**. AI 막힘 → QUESTION → runId 유지 → 사용자 답변 → 같은 logical run resume → 현재 화면 재관찰 → 목표 전진.
- **B**. TAKEOVER 는 resume 되지 않음.
- **C**. Cloud DB 에 금지 데이터(원문·DOM·이미지·credential·개인정보) 저장 안 됨.
- **D**. Local SQLite 에 이미지·credential·개인정보 저장 안 됨.
- **E**. Cloud Run 인스턴스가 달라도 runId 기반 재개(version-checked claim).
- **F**. TTL 만료 run 재개 거부.

> PHASE 2 착수 전, 실 web 업무 하나에서 **질문 → 답변 → 같은 run 재개**를 최소 1회 smoke 하는 것이 WO 의 순서다.

## 7. 재현

```bash
# 격리 없이 자체 검증(대상앱 조작 없음)
cd apps/api-server
npx tsc --noEmit
npx tsc -p tsconfig.build.json --noEmit
npx jest work-agent local-agent-runtime local-agent-oneclick-pairing
```

## 8. 남은 것

- ~~PHASE 1 실 web smoke A~F(사용자 검증).~~ → 2026-09-30 실측, §10 (resume 은 FAIL 1).
- ~~PHASE 2: trajectory 캡처 → semantic Workflow Candidate → 재검증형 결정론적 재생 → self-healing 전환(WO §3·§4·§5).~~ → §9 구현 완료. 실 replay smoke G~K 남음.
- coordination service · executor · 스키마의 실 Postgres 왕복(격리 PG 또는 production smoke)은 별도 표기.

---

## 9. PHASE 2 — Workflow Candidate & Deterministic Replay (2026-09-29)

**사용자 결정(2026-09-29)**: ① PHASE 1 실 smoke 와 병행해 PHASE 2 코드 착수(CLOSED 전 PHASE 1 · PHASE 2 실 smoke 모두 필요) ② IR §9-2·§9-3 초안 승인 — Local SQLite v5 + guarded verb, **Cloud 테이블·migration 0**.

핵심 원칙: **클릭 매크로가 아니라 semantic trajectory 를 저장한다** — "첫 실행은 AI, 반복은 Workflow, 예외에서만 AI".

### 9-1. 흐름

| 단계 | 동작 | 위치 |
|---|---|---|
| 기록 | 성공한 DOM 행동(set_input · select_option · click)마다 **행동 전 관찰의 같은 요소** → `{actionKind, locator(role·name\|text), expect(navigated·changed), path(pathname만)}` | `work-agent-runtime.ts` `execActOnce` → `buildTrajectoryEntry` |
| 일반화 | 완료된 새 run → 입력값을 요청 문장 안의 자리로 바꾼 **요청 템플릿**(`약학정보원에서 {{1}} 검색해줘`) + 값 없는 단계(set_input 은 `slot` 번호, 요청에 없는 select_option 은 고정 UI 라벨). 값이 요청에서 오지 않으면 저장 안 함(`not_generalizable`) | `workflow-candidate.ts` `buildWorkflowCandidate` |
| 저장 | `local.data.work_run_candidate_save` → Local `local_work_run_steps`(run 원장) + `local_workflow_candidates`((대상, 템플릿) 하나 = 하나, 다시 성공하면 최신 경로로 갱신 · 재활성) | agent `local-db.mjs` v5 |
| 대조 | 새 run(재개·사용자 힌트·이미지 아님, DOM 표면) 첫 관찰 뒤 `local.data.work_run_candidate_match` — **대조는 Local 이 한다**. 돌아오는 것은 candidateId + 이번 요청의 값을 채운 단계뿐(템플릿·통계·source run 미반환, `pickSafeWorkflowMatchInfo`) | agent `LocalWorkflowCandidateRepository.match` |
| 재생 | 단계마다 **현재 화면에서** `find(role·name\|text)` → 정확히 같은 이름이 하나일 때만 대상(`pickReplayTarget`) → 같은 `validateWorkProposal` → 같은 `execActOnce`(안전 경계·COMMIT·credential 인계 그대로) → checkpoint(저장 때 이동했던 단계가 이동하지 않으면 어긋남) | runtime 재생 prefix |
| self-healing | 찾지 못함 · 모호 · 검증 거절 · 실패 · checkpoint 불일치 → 즉시 멈추고 전체 화면 재관찰 뒤 **AI loop 가 이어받음**. 완료되면 AI 가 고친 경로로 같은 템플릿 Candidate 갱신 | runtime |
| 완료 판단 | 재생이 하지 않는다 — 재생 뒤에도 Planner 가 확인(보통 계획 1회). 맹목 재생 금지 | runtime |
| 통계 | 재생 run 이 완료로 저장되면 재생 Candidate 성공 +1, 완료되지 않으면 `candidate_result(replay_diverged)`. 실패 ≥3 이고 성공보다 많으면 Local 이 `disabled` | agent |

### 9-2. 저장 경계

- **Cloud(Postgres)**: 신규 테이블·컬럼·migration **0**. `work_run_coordination` 무변경.
- **Local SQLite v5 `workflow_candidates_v1`**: `local_work_run_steps(run_id, step_index, action_kind, step_json)` · `local_workflow_candidates(candidate_id, target_id, request_template, steps_json, source_run_id, success_count, failure_count, status)`. 좌표 · elementRef · snapshot · DOM 전문 · 캡처 · **입력값** · 인증정보 · 개인정보 컬럼 없음.
- 명령 인자는 기존 명령과 같이 `local_agent_commands.result_data` 를 한 번 지나가고 전달 즉시 wipe(저장 아님).
- 개인 범위 전용 — 공유 workflow 자동 승격 없음. UIA(windows_app) 표면은 이번 범위 밖(DOM 우선, WO).
- 새 verb 3개는 `local.data.work_run_candidate_{save,match,result}` — 서버·agent 양쪽 형상 검증(알 수 없는 키 · 값 · 좌표 · elementRef · 미등재 대상 · 템플릿 자리 불일치 거부). 서버 `workflow-candidate.ts` ↔ agent `handlers.mjs`/`local-db.mjs` 규칙은 손 복제이며 spec 이 상수·action 이름·DDL 을 대조한다.
- 계약 완화(IR §9-4)는 `work-agent-contract.ts` 머리 주석에 PHASE 2 범위만 추가 — scheduler · queue · workflow engine · `automation_jobs` 사용 금지는 그대로.

### 9-3. 결과 · 측정 신호

- `WorkAgentRunResult.workflow = { replay: none|completed|diverged, replayedSteps, candidate: none|saved|not_generalizable|skipped|failed }` — HTTP 응답 `data.workflow` · 로그 `work-agent workflow`(enum · 개수 · aiPlanCount 만).
- 결정적 테스트 기준 AI 계획 횟수: 첫 성공 **3회** → 같은 형태 재생 **1회**(완료 확인만).

### 9-4. self 검증 (이번 세션 실측)

| 검증 | 결과 |
|---|---|
| 신규 `workflow-candidate.spec.ts` | **15/15 PASS** — 템플릿 일반화·대조 · semantic 단계(값·elementRef·좌표 없음) · 재생 대상 선택 · protocol 검증기 · match 응답 화이트리스트 · 서버↔agent 복제 정합 · runtime(저장 / 재생 AI 3→1 / 어긋남 → AI 이어받음 + self-healing 저장 / 미완료 → diverged 반영 / not_generalizable · 힌트 run skip / 회귀) |
| 자동화 관련 server suite 14개(work-agent · llm-closure · recovery · visual-fastloop · target-discovery · windows × 2 · local-data-bridge · local-agent-runtime · computer-use · browser-dom-control · unified-request × 2 · workflow-candidate) | **257/257 PASS** |
| agent `node --test test/*.test.mjs` | **123/123 PASS**(local-db 신규 4건: 저장→대조 값 채움·템플릿 미반환 / 재저장 갱신·반복 실패 disabled·재성공 재활성 / 형상 밖 인자 거부 / 템플릿 대조 규칙) |
| api `tsc --noEmit` | 0 |
| ESLint(변경 파일) · lint ratchet | 0 · 46(기준선 불변) |
| `handlers.mjs` 제어문자 | 추가 0(기존 2 그대로) |

### 9-5. 실 replay smoke G~K — 2026-09-30 실측 결과는 §10

Local Agent 가 연결된 PC + 실 Chrome + 등재 사이트에서, **Agent 가 조작**해야 성립한다(PHASE 1 A~F 와 같은 창에서 함께). **결과**: G PASS · H PASS · I PASS_HARNESS(실 PC self-healing = PENDING) · J PASS · K PASS_HARNESS. 단 **재생 전 의미 검증 부재(§10 FAIL 2)**.

- **G**. 첫 요청(예: "약학정보원에서 타이레놀 검색해줘") 완료 → 응답 `workflow.candidate=saved` · Local `local_workflow_candidates` 1행(입력값 없음).
- **H**. 같은 형태 요청("…아스피린 검색해줘") → `workflow.replay=completed` · `aiPlanCount` 감소 · 실제 검색 결과 화면 도달.
- **I**. 화면이 달라 재생이 어긋나는 경우 → `replay=diverged` → AI 가 이어서 완료 · Candidate 갱신.
- **J**. Cloud DB 에 trajectory · 템플릿 · 값 저장 없음(`work_run_coordination` 컬럼 불변, `local_agent_commands.result_data` wipe).
- **K**. 반복 실패 Candidate 는 Local 에서 disabled → 다음 요청은 AI 가 처음부터.

### 9-6. 남은 것

- ~~PHASE 1 A~F + PHASE 2 G~K 실 smoke~~ → 2026-09-30 실측 완료, 판정 BLOCKED(§10). 남은 것 = FAIL 1 · FAIL 2 수정 WO + I 실 PC self-healing smoke.
- 사용자 힌트로 푼 분기(decisionPoint)의 일반화 — 이번 구현은 재개·힌트 run 을 Candidate 로 만들지 않는다(`skipped`). 다음 단계.
- UIA(windows_app) 표면 재생 — DOM 우선 원칙에 따라 이번 범위 밖.
- 배포: API · agent 배포 대상. Cloud migration 없음. Local SQLite v5 는 agent 기동 시 자동 적용(백업 선행 기존 절차).

---

## 10. 실 PC smoke closure 판정 (2026-09-30, `WO-O4O-MAIN-AUTOMATION-PHASE2-REAL-PC-REPLAY-AND-CLOSURE-V1`)

**환경**: serving `o4o-core-api-03758-wdt`(image `bfa48c135`, traffic 100%) · `DEPLOY_ENABLED=false`(새 배포·revision 없음) · Local Agent = 저장소 코드 `node src/index.mjs run`(schema v5) · 실 Chrome + O4O 확장 + native host · 대상 = 약학정보원. 대상앱 조작은 전부 Agent, 사용자는 요청 입력·결과 관찰만. Cloud DB 확인은 read-only(SELECT).

**현재 UI 경로(문구 정정)**: 과거 CHECK 들의 `[작업 수행]`(▶) 버튼은 `WO-O4O-AI-COMPOSER-UNIFIED-REQUEST-AND-ATTACHMENT-UX-V1` 에서 제거됐다. 현재는 **목표 입력 → ↑ 전송(버튼 1개) → Unified Router(`POST /api/ai/request`)가 chat / work 를 자동 판정**(reason `task_intent` · `no_registered_target` · `resume`). 과거 CHECK 본문은 기록물이므로 고치지 않는다.

### 10-1. 실측 run (UTC)

| run | 요청 | 결과 | aiPlanCount | 소요 |
|---|---|---|---|---|
| `g_munln7gj` | G 1차 | `DOM_TAB_NOT_FOUND` → taken_over | — | 43.2s |
| `g_munloizx` | 약학정보원에서 타이레놀 검색해줘 | completed · `candidate=saved`(템플릿 `약학정보원에서 {{1}} 검색해줘`) | 2 | 61.5s · 명령 11 |
| `g_munmnrac` | 약학정보원에서 아모디핀 검색해줘 | `replay=completed` · replayedSteps 2 · 같은 Candidate success_count 1 | **1** | 65.2s · 명령 12 |
| `g_munmy4lm` | 약학정보원에서 세파클러를 찾아줘 | 템플릿 불일치 → AI 첫 실행 → 새 Candidate(`…{{1}}를 찾아줘`) | 2 | — |
| `g_munn2rn2` | 약학정보원에서 뉴로케이 동일성분을 찾아줘 | loop_limit · no_progress → taken_over · 저장 안 함 | 6 | 100.6s |
| `g_munn631u` | 약학정보원에서 뉴로케이를 찾아줘 | 두 번째 Candidate 로 `replay=completed` | 1 | 64.9s |
| `g_munng2tv` | 약학정보원에서 내가 먹을 약 검색해줘 | "내가 먹을 약" 을 검색어로 **재생** → user_judgment_required → `waiting_for_user` · Candidate failure_count 1 | 1 | 63.7s |
| (05:14:16) | "게보린"(답변) | reason=`resume` 이나 `SITE_UNRESOLVED` · 행동 0 | 0 | — |
| `g_munnl3op` | 약학정보원에서 게보린 검색해줘 | **새 run**(reason `task_intent`) · replay completed | 1 | — |

### 10-2. 판정

**PASS**

- G 첫 AI 실행 · Candidate 저장 (`g_munloizx`, Local `local_workflow_candidates` 1행, 입력값 없음)
- H 결정론적 재생 (`g_munmnrac`, 실제 검색 결과 화면 도달)
- AI 계획 감소 2 → 1 (G 2 · H 1, `g_munn631u` 도 1)
- C TAKEOVER 재개 불가 (`g_munn2rn2` taken_over → resumable=false)
- D/J Cloud 에 workflow 저장 없음 — `work_run_coordination` 컬럼 = run_id · user_id · device_id · status · version · created/updated/expires_at 뿐(6 run Local 과 일치) · 당일 `local_agent_commands` 74건 `result_data` 전부 NULL · 값(약품명) 검색 0건 · workflow/trajectory 테이블 없음
- E Local privacy 경계 — Candidate·step 에 약품명·좌표·elementRef·HTML·이미지·credential 없음. `local_work_runs.goal_summary` 의 약품명은 Local 전용 설계(§3)
- A QUESTION → `waiting_for_user` (`g_munng2tv`)
- `DOM_TAB_NOT_FOUND` 재현 안 됨 (G 1차 1회 뒤 재발 0)

**PASS_HARNESS** (실 PC 미재현 · 결정적 하네스로만 확인)

- F terminated / expired run 재개 거부 — `checkResumable` 단독 하네스 8/8(not_found · not_owner · terminal · expired · not_waiting). 하네스는 미커밋 임시 파일
- I 재생 재검증 · self-healing — `workflow-candidate.spec.ts` 15/15("재생이 어긋나면 … AI 가 이어받는다" · "재생 후 run 이 완료되지 않으면 재생 실패를 Local 에 반영")
- K Candidate disabled — agent `node --test test/*.test.mjs` 123/123(`local-db.test.mjs` 반복 실패 disabled · 재성공 재활성)

**FAIL 1 — `SAME_RUN_RESUME_SHORT_ANSWER`**

- 질문 run `g_munng2tv` 는 `waiting_for_user` 였다.
- 짧은 답변 "게보린" 은 resume 로 이어지지 못했고(router reason=`resume` 이었으나 runtime 에서 `SITE_UNRESOLVED` · 행동 0), 사용자가 다시 입력한 전체 문장은 **새 run `g_munnl3op`** 가 되었다.
- 원인 ① `work-agent-runtime.ts` 에서 **대상 해석(`resolveWorkTarget(goal.request, …)`)이 resume 처리(`checkResumable`)보다 먼저** 답변 문장에 대해 실행된다.
- 원인 ② 원래 run 의 `target_id` 를 상속하지 않는다(답변 "게보린" 에는 사이트명이 없음).
- 원인 ③ resume 실패 뒤 `O4OHomePage.tsx` 가 `setResumeRunId(result.work.resumable && … ? runId : null)` 로 **runId 를 버린다** — 원래 run 은 여전히 waiting 인데 다음 입력은 새 run 이 된다.

**FAIL 2 — `REPLAY_PRE_EXECUTION_SEMANTIC_VALIDATION`** (안전 경계 문제로 분류)

- 재생은 **템플릿 일치만으로** 시작하고, 자리(`{{1}}`) 값이 무엇을 뜻하는지 확인하지 않는다.
- "내가 먹을 약" 이 구체적 약품명이 아닌데도 검색어로 그대로 실행됐다(`g_munng2tv`). 사후에 Planner 가 user_judgment_required 로 멈췄지만, **실행 뒤**였다.
- 재생 전 값의 구체성·충분성·모호성 판단(모호하면 실행 전 QUESTION)이 필요하다.

**PENDING**

- I 실 PC self-healing smoke(화면이 달라 재생이 어긋나는 경우 AI 이어받기 · Candidate 갱신).

**PERFORMANCE_FINDING** (blocker 아님)

- Local Agent polling 5초(`POLL_INTERVAL_MS = 5000`) — 명령 1개당 ~5초, 실 작업 1건 ~1분(H 65.2s / 명령 12). 사용자가 결과 대기 중 이전 탭을 새 결과로 착각한 사례 1회. latency 최적화는 별도 후보.

**기타 관찰(수정 안 함, 보고만)**

- 웹 로그인 계정 ≠ pairing 계정이면 `resolveTargetDevice` 가 403 "이 PC 의 O4O 확장이 연결되어 있어야 합니다." — 원인(계정 불일치)과 다른 안내 문구.
- 템플릿 대조는 문장 형태가 정확히 같아야 한다("찾아줘" ≠ "검색해줘", "을" ≠ "를") — 설계대로. "…를 찾아줘" 단독 요청 2건은 등재 대상이 없어 chat 으로 라우팅(`no_registered_target`) — 설계대로.

### 10-3. 판정 키

```text
G_FIRST_AI_RUN                          = PASS
G_CANDIDATE_SAVED                       = PASS
H_DETERMINISTIC_REPLAY                  = PASS
H_AI_PLAN_COUNT                         = 2 -> 1
H_TOTAL_DURATION                        = 65.2s
I_REPLAY_REVALIDATION_SELF_HEALING      = PASS_HARNESS (real PC = PENDING)
A_QUESTION_WAITING_FOR_USER             = PASS
B_SAME_RUN_RESUME_SHORT_ANSWER          = FAIL
C_TAKEOVER_NON_RESUMABLE                = PASS
D_J_CLOUD_WORKFLOW_STORAGE              = NONE (PASS)
E_LOCAL_PRIVACY_BOUNDARY                = PASS
F_TERMINATED_EXPIRED_RESUME_REJECTED    = PASS_HARNESS
K_CANDIDATE_DISABLE                     = PASS_HARNESS
REPLAY_PRE_EXECUTION_SEMANTIC_VALIDATION = FAIL (safety boundary)
DOM_TAB_NOT_FOUND_REPRODUCED            = NO (1회, G 1차에서만)
LOCAL_AGENT_POLL_INTERVAL_MS            = 5000 (PERFORMANCE_FINDING, non-blocker)
SAFETY_REGRESSION                       = FAIL 2 외 신규 없음
MAIN_AUTOMATION_WORKFLOW_STATUS         = BLOCKED
```

### 10-4. 다음

- 별도 수정 WO(범위 A 재생 전 의미 검증 · B 같은 run resume 대상 상속 · C resume 실패 시 runId 유지). 이 closure 에서는 구현하지 않는다.
- 수정 WO 뒤 최소 재검증: QUESTION → "게보린" → 같은 runId 재개 · "아모디핀 검색" replay · "내가 먹을 약 검색" 실행 전 QUESTION · H 회귀 · 안전 회귀. I 실 PC self-healing 은 그때 함께.
- smoke 중 agentCredential 이 로그에 한 번 노출되었다 — smoke 종료 후 해당 device credential revoke + 재 pairing 권장(사용자 직접).

**문서 정합(§10 갱신)**: 발견 1건(과거 CHECK 들의 `[작업 수행]` 표기 — 기록물이라 수정 대상 아님, 본 CHECK 에 현재 UI 경로 명시) / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(FAIL 1 · FAIL 2 수정 WO).

**문서 정합(PHASE 2 구현 시점, 2026-09-29)**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건 — 기준 문서(`O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1`)와 충돌 없음(사이트별 업무 사전 정의 없음 · 사용자 성공에서 학습 · 재생은 현재 화면 재검증).
