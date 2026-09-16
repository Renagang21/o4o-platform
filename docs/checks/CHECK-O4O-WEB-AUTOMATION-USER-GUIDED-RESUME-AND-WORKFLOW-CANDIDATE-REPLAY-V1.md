# CHECK-O4O-WEB-AUTOMATION-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1

> **WO**: `WO-O4O-WEB-AUTOMATION-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1`
> **상태**: **PHASE 1 구현 + self 검증(tsc · 단위 124/124) 완료** — 실 web smoke A~F = **PENDING_USER_VERIFICATION**(§58). PHASE 2(trajectory·Candidate·replay) 미착수. WO 종료 판단은 사용자 몫.
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

### 6-2. 실 web smoke A~F = PENDING_USER_VERIFICATION (§58)

아래는 **실 Chrome + 실 사이트 + Agent 가 대상앱을 조작**해야 성립한다(사람이 대신 조작하면 검증 무효). 이번 세션 미실시.

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

- PHASE 1 실 web smoke A~F(사용자 검증).
- PHASE 2: trajectory 캡처 → semantic Workflow Candidate → 재검증형 결정론적 재생 → self-healing 전환(WO §3·§4·§5).
- coordination service · executor · 스키마의 실 Postgres 왕복(격리 PG 또는 production smoke)은 별도 표기.
