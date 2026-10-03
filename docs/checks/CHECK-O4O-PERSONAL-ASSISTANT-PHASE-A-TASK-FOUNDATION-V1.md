# CHECK-O4O-PERSONAL-ASSISTANT-PHASE-A-TASK-FOUNDATION-V1

> **WO**: `WO-O4O-PERSONAL-ASSISTANT-PHASE-A-TASK-FOUNDATION-V1` (사용자 지시 2026-10-03, WO 문서 없음 — 이 CHECK 가 기록)
> **일자**: 2026-10-03
> **정본**: [`O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2`](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) §2 · §3 · §4 · §9 · §17 · §18 단계 A
> **설계**: [`IR-O4O-PERSONAL-ASSISTANT-PHASE-A-TASK-FOUNDATION-CENSUS-AND-DESIGN-V1`](../investigations/IR-O4O-PERSONAL-ASSISTANT-PHASE-A-TASK-FOUNDATION-CENSUS-AND-DESIGN-V1.md) (`d5c1b2d12`)
> **작업공간**: 전용 worktree `../o4o-wt/personal-assistant-phase-a` · branch `wo/personal-assistant-phase-a-task-foundation-v1` · base `origin/main` `f324173b1` (AGENTS.md §4-1)

---

## 0. 판정

```text
STATE                     = READY_TO_INTEGRATE  (main 미통합 · 배포 0 · production migration 0)
ASSISTANT_ENTITY          = NONE (논리 계층 · Assistant = f(userId))
TASK_PERSISTENCE          = assistant_tasks (신규) + work_run_coordination.task_id (nullable · additive)
TASK_RUN_RELATION         = Task 1 : N run · run 1 : N segment (현행 유지)
OWNERSHIP                 = requested_by_user_id ≠ ownership_scope(USER|ORGANIZATION) + organization_id + service_key
API                       = /api/ai/request work 응답 data.taskId · data.taskStatus (additive) · 요청 taskId? 수용
RAW_TEXT_IN_TASK          = 0 (컬럼 없음 · 식별자 형식 검사 · sentinel 테스트 + 실DB 검사)
RETENTION_POLICY          = PENDING_LEGAL_DATA_PROCESSING_GATE (TTL · purge 없음)
LEGAL_GATE_OPENAI_GAP     = STILL_OPEN / KNOWN GAP (이번 WO 는 새 외부 처리 · Memory 이동 없음)
PLANNER / RUNTIME         = 무변경 (결과에 provisional taskKey 1필드 추가만)
LOCAL_AGENT / EXTENSION   = 0
DEPLOYMENT (통합 시)       = MANUAL/GATED — migration 포함 → Delivery LEVEL 3 → 소유자 promote 1회
```

## 1. Schema — `1791012819443-CreateAssistantTasks`

| 컬럼 | 의미 |
|---|---|
| `id` uuid PK | taskId (서버 생성) |
| `requested_by_user_id` uuid FK users | 요청자 — 인증 세션 |
| `ownership_scope` varchar(16) | `USER` · `ORGANIZATION` (CHECK) |
| `organization_id` uuid FK organizations NULL | ORGANIZATION 일 때만 (CHECK 로 일관성 강제) |
| `service_key` varchar(64) NULL | membership 확인된 canonical serviceKey |
| `target_kind` · `target_id` | 대상 구조 식별자 (형식 검사 통과 값만) |
| `task_type_key` varchar(100) NULL | planner provisional Task type (`TASK_KEY_RE`) |
| `status` | `running · waiting_for_user · blocked · completed · handed_over · stopped` (CHECK) |
| `created_at` · `updated_at` · `completed_at` | completed_at 은 종결 상태에서만 |

- 종결 = completed · handed_over · stopped. `blocked` · `waiting_for_user` 는 같은 Task 로 재시도 가능.
- `work_run_coordination.task_id` uuid NULL FK `ON DELETE SET NULL` + 부분 인덱스. 기존 run 은 NULL 그대로.
- 범용 JSON metadata · 원문 컬럼 없음.
- **fingerprint** `42e44a34…5e20` (5972 lines) — 격리 PostgreSQL 17.10 일회용 클러스터(127.0.0.1:55432, trust)에서 baseline bootstrap + incremental 1..13 실제 적용으로 산출. 같은 클러스터에서 기존 state 12 가 등록값(`09d5a917…`, 5944)으로 재현됨을 먼저 확인. 운영 DB 값 채택 아님.
- `down()` → `up()` 왕복 확인 · `check-migration-contract` 21/21 · 관련 jest 5 suites PASS.

## 2. 소유 판정 (`services/assistant/task-ownership.ts`)

새 판정 로직 없음 — home-chat 이 쓰는 기존 SSOT 재사용.

| 입력(서버 확정) | 결과 |
|---|---|
| workspace = store + `resolveWorkScopeStore` resolved | ORGANIZATION (그 조직 · serviceKey) |
| store 축이지만 0개 · ambiguous · 매장 축 없음 | USER (membership 확인된 serviceKey 유지) |
| store 축 + membership 없음 | USER · serviceKey NULL |
| 비-store 축 + serviceKey | USER · active membership 일 때만 serviceKey |
| workScope 없음 | USER (조회 0) |

클라이언트 `organizationId` · `storeId` 는 읽지 않는다. Task 소유는 Phase A 에서 실행 권한에 쓰이지 않는다(실행 문맥은 기존 work-agent 그대로 `workspace:'home'`).

## 3. 경계

```text
POST /api/ai/request
  └ 기존 router(classifyUnifiedRequest)
      ├ chat / confirm        → Task 없음 (기존 그대로 · DB write 0)
      ├ hospital-drug surface → Task 없음 (Phase A 범위 밖 · 병원약국 Local-only)
      └ work → runAssistantWorkTask        ← Assistant → Task
                 ├ runId 의 Task → 요청 taskId(본인 · 미종결) → 없으면 새 Task(소유 판정)
                 ├ performWorkAgentRun → runWorkAgent   ← Task → Execution (무변경)
                 └ run 을 Task 에 붙임 · 상태 매핑 · 구조 키 갱신
```

- 상태 매핑: goal completed→completed · waiting_for_user→waiting_for_user · taken_over→handed_over · 그 밖→stopped · **run 미개설(기기 없음 · 재개 거부 · 대상 준비 실패) / 403 → blocked** · 400 → stopped.
- Task 저장 실패 시 실행은 그대로 · `taskId` 없음 · 경고 로그(값 · 원문 없음).
- `/api/ai/work-agent/run` 직접 endpoint(호출처 0)는 Task 경계를 거치지 않는다 — 기존 계약 유지.
- 원문은 실행 본체로만 흐른다. Task 저장 경로가 받는 인자는 userId · 소유 · 상태 · 구조 식별자뿐.

## 4. 검증

| 항목 | 결과 |
|---|---|
| 신규 spec — store(SQL 경계 · binding · sentinel · 1:N 연결 조건) | 9/9 |
| 신규 spec — ownership(ORG · 클라이언트 조직 불신 · ambiguous · membership) | 6/6 |
| 신규 spec — boundary(새 Task · 재개 · 1:N · 남의 Task · 매핑 · sentinel · 실패 허용 · legacy run) | 9/9 |
| `unified-request-http.spec` (기존 18 + ⑬ 5) | 23/23 |
| 격리 PG 실DB smoke (실제 SQL · 실제 createWorkRun) | 9/9 — 1 Task+run 연결 · 2 재개 같은 Task · 3 Task 1:N(2 runs)+completed_at · 4 남의 taskId 무시 · 4b 남의 Task 비가시 · 5 ORG Task · 6 legacy run NULL · 7 sentinel 0 |
| migration 계약 · DB 관련 jest | 21/21 · 5 suites PASS |
| `tsc --noEmit` (api-server) | 0 error |
| eslint (변경 파일) | 0 error · 0 warning |
| 회귀 묶음 (work-agent · Experience · Candidate · 재개 · local-agent · AI 라우트 등) | 아래 §4-1 |

### 4-1. 회귀

- 관련 24 suites 1차(기본 worker 수): **23 PASS · 1 FAIL**(`work-agent-recovery-runtime.spec.ts` 2건, 보고 소요 5992 s — 병렬 부하 아래 시간 의존 테스트로 보임). 422 중 420 통과.
- 같은 spec 단독 재실행 **5/5 PASS 2회** — 이번 변경(결과 객체에 `taskKey` 1필드 추가)으로 재현되지 않음.
- worker 2개 재실행: 커밋 시점 **진행 중** — 결과는 통합 단계에서 다시 확인한다(미확인을 PASS 로 적지 않는다).

## 5. 하지 않은 것

main merge · production migration · 배포 · 실 PC smoke · worktree 제거 — 0. planner 분리 · Strong Discovery · Execution runtime · Local Agent · Chrome Extension · Experience/Candidate 재설계 — 0. 요청 원문 · 대화의 Cloud 저장 · 새 외부 처리 — 0. 범위 밖 결함(Phase A IR §8: runId 생성/user filter · 만료 cleanup 미호출 · command cleanup · client `taken_over` 타입 · 재페어링 Local 승계 · ai_usage_logs 미기록)은 섞지 않았다.

## 6. 통합 메모 (작업 종료 지시 후)

1. `git fetch origin` → 이 branch(이미 push 됨)에 `git merge origin/main` → 재검증(migration 계약 · 관련 jest · tsc).
   main 에 다른 incremental migration 이 먼저 들어오면 epoch 순서 · `EXPECTED_SCHEMA_STATES` 를 다시 산출해야 한다(격리 PG 절차 §1).
2. fast-forward push `wo/personal-assistant-phase-a-task-foundation-v1:main` (AGENTS.md §4-1(e)).
3. Delivery 는 migration 포함 → **LEVEL 3** → 소유자 승인 후 `promote.yml` 1회. migration job 이 `assistant_tasks` 생성 ·
   POST assertion `42e44a34…`(5972) PASS 확인 → API verified rollout.
4. 배포 후 smoke: work 요청 1건 → 응답 `taskId` · `assistant_tasks` 1행(구조만) · run `task_id` 연결 (read-only 확인).
5. 웹 클라이언트는 `taskId` 를 아직 쓰지 않는다(additive · 기존 동작 불변). 재시도 시 같은 Task 이어가기는 후속 클라이언트 작업.

`문서 정합: 해당 없음`
