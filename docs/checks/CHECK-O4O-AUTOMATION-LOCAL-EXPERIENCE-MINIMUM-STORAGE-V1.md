# CHECK-O4O-AUTOMATION-LOCAL-EXPERIENCE-MINIMUM-STORAGE-V1

> **WO**: WO-O4O-AUTOMATION-LOCAL-EXPERIENCE-MINIMUM-STORAGE-V1 (Experience Model Phase 1)
> **기준**: [O4O-AUTOMATION-EXPERIENCE-MODEL-V1](../baseline/O4O-AUTOMATION-EXPERIENCE-MODEL-V1.md) (ACTIVE, D1~D8) · [O4O-AUTOMATION-AGENT-ARCHITECTURE-V1](../baseline/O4O-AUTOMATION-AGENT-ARCHITECTURE-V1.md) §5-1 · §10-2
> **일자**: 2026-10-01
> **판정**: **CODE_COMPLETE · REAL_PC_SMOKE_PENDING (배포 승인 대기)** — 상세 §10

---

## 1. 범위

자동화 Run 하나가 끝날 때마다(성공 · 실패 · 사용자 대기) **구조화된 최소 Experience** 를 Local SQLite 에 쓴다. 이번 Phase 는 **쓰기만** 한다.

```text
cloud runtime(work-agent-runtime) ──구조화 write 명령──▶ Local Agent ──▶ local.db
                                    (기존 cloud→local 명령 경로 재사용)
cloud 는 local.db 를 읽지 않는다(read-back · 동기화 없음, ARCHITECTURE §5-1).
```

제외(§17): recall · Assistance · Knowledge · Promotion · Strong Discovery · Shared/Digest · Cloud Experience DB · WebMCP · runtime 결함 수정.

## 2. 사전 census — 재사용 판정

| 기존 자산 | 판정 | 근거 |
|---|---|---|
| `local_work_runs`(v4) | **재사용 · 확장** | run 정체성 원장. 칸 8개 additive 추가 |
| `local_work_run_steps`(v5) | **재사용 안 함** | Candidate 저장이 run 단위로 지우고 다시 쓰는 *성공 경로* 원장. 실패 · 거절 단계까지 담으면 Candidate 의미가 깨진다 |
| cloud→local 명령 경로(`issue()` · `local_agent_commands`) | **재사용** | 새 HTTP endpoint 없음. action 1개 추가 |
| `DATA_TARGET_ACTIONS` allowlist · 등재 대상 검사 | **재사용** | experience action 을 같은 목록에 등록 |
| target resolver(`local.target.prepare`) | **재사용** | 대상 정체성 = 등재 `targetId` + `targetKind` |
| Workflow Candidate 결과 경로 | **재사용 · 조건 1개 추가** | D7(아래 §7) |
| Task 분류 | **만들지 않음**(§5) | `task_key` 칸만 두고 NULL · `task_provisional=1` |

## 3. Schema · Migration (Local Agent)

[local-db.mjs](../../tools/o4o-local-agent/src/local-db.mjs) migration **v6 `work_experience_v1`**, `SCHEMA_VERSION` 5→6.

- `local_work_runs` 에 칸 추가 — `task_key` · `task_provisional` · `target_kind` · `started_at` · `ended_at` · `segment_count`(기본 0) · `outcome_status` · `outcome_evidence`. `PRAGMA table_info` 로 있으면 건너뛴다(재실행 안전).
- 신규 테이블 3개(`CREATE TABLE IF NOT EXISTS`)
  - `local_work_run_segments` — 요청 1회 = segment 1개. end_state · resumed · user_wait_ms · 시간 분해 metric
  - `local_work_run_experience_steps` — run 의 **모든** 단계. seq(segment 를 넘어 이어짐) · stage · stage_provisional · action_kind · method · locator_json(semantic) · decided_by · result_status/evidence · error_code · duration_ms
  - `local_work_run_failures` — 실패 이벤트. step_seq · stage · layer · failure_class · error_code · method · recovery_tier/result · ui_change_suspected
- 기존 DB 자동 승격: 기동 시 pre-migration 백업(`createBackup`) → v6 적용. 기존 run · Candidate · run 단계 원장 보존.

## 4. 데이터 형상 · 경계 검증

action `local.data.work_run_experience_record` — 인자는 정해진 키만:

`runId · segment{startedAt, endedAt, endState, resumed} · target{targetId, targetKind} · outcome{status, evidence}|null · metric{9칸} · steps[≤60] · failures[≤20]`

- **양쪽 검증**: 서버 [work-experience.ts](../../apps/api-server/src/services/ai-tools/work-experience.ts) `validateWorkExperienceRecordShape` + [local-agent-protocol.ts](../../apps/api-server/src/services/local-agent/local-agent-protocol.ts)(runId 형식 · 등재 대상) / agent [handlers.mjs](../../tools/o4o-local-agent/src/handlers.mjs) 재검증. 모르는 키 · enum 밖 값 · 비정수 · 대기 segment 의 outcome 은 거부.
- locator 는 semantic(role · name · text 등)만, `validateWorkflowLocator` 재사용. 좌표 · elementRef · snapshotId 거부. **입력값이 locator 이름/글에 비치면 locator 를 버린다**(`experienceLocatorOf`).
- 응답(`pickSafeDataInfo`)은 `saved` 만 돌려준다 — cloud 로 내용이 돌아오지 않는다.
- 멱등: `(run_id, started_at)` 이 이미 있으면 다시 쓰지 않는다.

## 5. Run · Step · Failure · Metric · Outcome

| 축 | 기록 | 근거 없을 때 |
|---|---|---|
| Run | runId(재개 시 같은 runId) · target · 시작/종료 · segment_count · outcome | run 행이 없으면(대상 준비 실패 등) 최소 행 upsert |
| Segment | end_state(`completed`·`waiting_for_user`·`taken_over`·`stopped`·`resume_failed`) · resumed · **user_wait_ms = 직전 대기 segment 종료→재개 시작**(agent 계산) | 첫 segment 는 NULL |
| Step | 모든 실행 단계(성공 · 실패 · 거절) · stage(observe/read/input/activate, provisional) · method(browser_dom/uia/visual) · 행위자(`deterministic`=재생 · `ai_normal` · `ai_strong`) · 결과 · duration | stage 판단 불가 → NULL |
| Failure | 원인 층 `runtime`·`ui_change`·`business_knowledge`·`input_missing`·`judgment`·`policy_risk` · class · code · 회복 tier/결과 · ui_change_suspected | 층 근거 없으면 NULL(추측 안 함) |
| Metric | total · ai_ms/ai_calls · command_wait/execution(`local_agent_commands` 시각 집계, local.data.* 제외) · settle · action/step/retry count | 근거 없으면 NULL (예: AI 호출 0 → ai_ms NULL) |
| Outcome | SUCCESS · PARTIAL_SUCCESS(goal_sufficiently_advanced) · BLOCKED(자격 · 확정 필요) · FAILED. 대기 segment 는 NULL | evidence: LLM 완료 판단 = `agent_inferred`(승격 없음, D6) · 시스템 판정 = `system_verified` |

`USER_COMPLETED` · `CANCELLED` · `ABANDONED` 은 현재 runtime 에 정확히 대응하는 종료 신호가 없어 **만들지 않는다**(억지 매핑 금지).

## 6. 민감정보 (§9)

저장하지 않음: slot 값 · 사용자 답변 원문 · 요청 원문(goal_summary 중복 포함) · 화면 글 · DOM · 캡처 · 프롬프트 · LLM 근거 · 결과 데이터 · 환자 정보 · password · OTP · token · 인증정보. 형상 검증이 원문을 담을 칸 자체를 허용하지 않고, error_code 는 코드 형식(`safeErrorCode`)만 통과한다. 테스트가 요청어 · 입력값 · 답변 · 화면 글 · elementRef · snapshotId sentinel 부재를 확인한다.

## 7. Candidate 회귀 · D7

- [work-agent-runtime.ts](../../apps/api-server/src/services/ai-tools/work-agent-runtime.ts) `persistWorkflow`: 재생 이탈(`replay_diverged`)의 원인이 **runtime 층**(재생 중 runtime 코드, 또는 run 이 runtime 으로 끝남)이면 `candidate_result` 를 보내지 않는다 → `failure_count` 불변.
- 그 밖(사용자 판단 · locator 없음 등)은 종전대로 `replay_diverged` 반영. Candidate 저장 · 재생 · 삭제 로직 무변경.
- Experience 기록은 best-effort(try/catch) — 실패해도 run 결과에 영향 없음.

## 8. 테스트

| 묶음 | 결과 |
|---|---|
| agent `node --test test/*.test.mjs` (v5→v6 migration · 재실행 no-op · record 멱등 · segment/seq 이어짐 · user_wait · handler 검증 · sentinel) | **136/136 PASS** |
| 신규 [work-experience.spec.ts](../../apps/api-server/src/__tests__/work-experience.spec.ts) — 순수 규칙 · protocol 거부 13종 · 성공 · runtime 실패 2종 · D7 · 회귀(judgment→replay_diverged) · locator 이탈→ui_change_suspected · QUESTION→재개 같은 runId | **14/14 PASS** |
| 자동화 관련 spec 11개(work-agent* · workflow-candidate · work-target-discovery · local-data-bridge · local-agent-runtime 등) | **203/211** — 실패 8건은 모두 `local-agent-oneclick-pairing` 의 localhost 창구 테스트: 고정 포트 127.0.0.1:47821 을 **이 PC 에서 실행 중인 실제 Local Agent** 가 점유해 child server 기동 timeout. 이번 변경과 무관(해당 spec · local-server 무변경), 실행 중 agent 는 건드리지 않음 |
| `tsc --noEmit` | 기존 오류 3건만(community/funding/supplier-service-scope.middleware.ts `ServiceKey`) — 이번 변경과 무관, 수정 안 함 |

## 9. 실데이터 migration 검증 (복사본)

실 PC `local.db` 를 **read-only** 로 열어 `VACUUM INTO` 스냅샷 → 스크래치 복사본에서만 실행, 끝난 뒤 복사본 삭제. 원본 mtime 불변 확인.

- 원본: schema v5 · run 12건 · Candidate 2건(성공 합 3 · 실패 합 1)
- 복사본 기동: `appliedNow=[6]` · ready · run 12건 · Candidate 2건(3/1) **보존**
- 복사본에 대기→재개 2 segment 기록: segment_count 2 · user_wait_ms 60000(대기 segment 만 근거) · step seq 1~3 이어짐 · 재개 segment outcome PARTIAL_SUCCESS/agent_inferred
- (복사본 스크립트는 backup 함수를 넘기지 않아 `backupStatus=skipped` — 실제 agent 진입점은 `createBackup` 을 넘긴다, test 로 `created` 확인)

## 10. 실 PC smoke — PENDING

WO §16 의 실 PC smoke(성공 · runtime 실패 · QUESTION→재개 중 2개 이상)는 **미실행**이다. 실행하려면 다음이 필요하고, 둘 다 사용자 승인 사항이다.

1. API 배포(`deploy-api.yml` 은 workflow_dispatch + deploy 태그 전용 — push 로 배포되지 않음)
2. 실 PC Local Agent 재기동(새 코드 → 실 local.db v6 승격, pre-migration 백업 생성)

승인 후 절차: 배포 job success + 새 revision traffic 100% 확인 → agent 재기동 → Agent 가 약학정보원 검색(성공) 1회 + 대기→재개 1회 수행 → local.db 를 read-only 로 열어 §5 의 행 · NULL 규칙 · 민감 원문 부재 확인.

## 11. 한계 (Phase 1 범위에서 의도적으로 남김)

- 연결된 device 가 없으면 기록하지 않는다(쓸 곳이 없음). 재개 거부 · claim 실패처럼 run 상태가 없는 종료(`finishNoState`)도 기록하지 않는다.
- `business_knowledge` 층은 현재 runtime 신호로 판정할 수 없어 생성되지 않는다(칸만 존재).
- 같은 device 에서 run 이 동시에 돌면 command_wait/execution 집계가 섞인다(시간 창 기준).
- steps 60 · failures 20 상한(초과분 절단). `step_count` = 예산(명령 수) 기준.
- run 행 `status` 는 기존 run 원장 명령이 관리한다. experience record 는 행이 없을 때만 최소 행을 넣는다.

## 12. Phase 2 인계

- 질의형 recall(D1=a): 현재 Run 을 위한 최소 구조 조회 — 이번 테이블의 target · stage · locator · failure layer 를 대상으로. cloud read-back · 동기화는 여전히 금지.
- Task 정체성(`task_key`) 채우기 규칙, `USER_COMPLETED` 종료 신호(D8=b 자동판정+사용자 확인) 정의.
- `business_knowledge` 층 판정 신호 정의.

## 13. 변경 파일

- agent: `tools/o4o-local-agent/src/local-db.mjs` · `src/handlers.mjs` · `test/local-db.test.mjs` · `test/local-data-runtime.test.mjs`
- api: `services/ai-tools/work-experience.ts`(신규) · `work-agent-runtime.ts` · `work-run-executor.ts` · `workflow-candidate.ts`(`validateWorkflowLocator` export) · `services/local-agent/local-agent-protocol.ts` · `__tests__/work-experience.spec.ts`(신규) · `__tests__/local-data-bridge.spec.ts`(action 목록)
- DB schema(cloud) · migration · package · CI · route 변경 없음.
