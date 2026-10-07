# CHECK-O4O-AUTOMATION-USER-ASSISTANCE-AND-CORRECTION-V1

> **WO**: WO-O4O-AUTOMATION-USER-ASSISTANCE-AND-CORRECTION-V1 (Experience Model V1 Phase 2 — User Assistance · Correction)
> **기준**: [O4O-AUTOMATION-EXPERIENCE-MODEL-V1](../baseline/O4O-AUTOMATION-EXPERIENCE-MODEL-V1.md) (ACTIVE, D1~D8 · §7) · [O4O-AUTOMATION-AGENT-ARCHITECTURE-V1](../baseline/O4O-AUTOMATION-AGENT-ARCHITECTURE-V1.md) §5-1 · §10-1 · Phase 1 [CHECK](CHECK-O4O-AUTOMATION-LOCAL-EXPERIENCE-MINIMUM-STORAGE-V1.md)(PHASE1_PASS · 재설계 없음)
> **일자**: 2026-10-01
> **판정**: **CODE_COMPLETE · API_DEPLOYED · REAL_PC_SMOKE_PENDING** — API 통제 배포 완료(§9-1), 실 PC 검증은 Phase 1 PC 에서(§9-2)

---

## 1. 범위

사용자가 Run 중에 준 도움 · 교정을 **구조로** Local SQLite 에 남기고, **실제 성공으로 검증된 방법만** 같은 Task × Target × Stage 에서 다시 쓴다.

| 사용자 입력 | 분류 | 기억 |
|---|---|---|
| "게보린" | 값 확인 → **Assistance · per_run_value** | 안 함(slot 키만 · 값 없음) |
| "나는 보통 A도매를 써" | **personal_preference** | 패턴 안 만듦(Phase 2 밖) |
| "그 방법 말고 제품 상세의 동일성분 탭을 써" | **Correction · procedure_method** | 대안이 실제 성공한 뒤에만 Preferred(대안) / Avoid(틀린 방법) |

제외(WO): Shared Experience · 서버 Correction DB · Manual ingestion · Knowledge Watch · Promotion Engine · model routing · Discovery 확장 · runtime 최적화.

## 2. Local Schema — migration v7 `work_assistance_correction_v1` (additive)

[local-db.mjs](../../tools/o4o-local-agent/src/local-db.mjs) `SCHEMA_VERSION` 6→7. `CREATE TABLE IF NOT EXISTS` 만 — v1~v6 테이블 · 행(Candidate · Phase 1 Experience) 불변. 기동 시 pre-migration 백업 후 적용(Phase 1 과 같은 경로).

| 테이블 | 담는 것 | 담지 않는 것 |
|---|---|---|
| `local_work_run_context` | QUESTION 시점 원래 업무 구조: task · stage · ask kind · slot 키 · 하던 방법 · 재생 위치(candidateId · stepIndex) | 요청 원문 · 값 |
| `local_work_run_assistance` | stage · ask kind · provided kind · structured(slot 키 또는 방법) · resolution · progressed steps · reusability | 답변 원문 · slot 값 |
| `local_work_run_corrections` | 교정 유형 · 이유 코드 · 틀린 방법(op 순서만) · 대안 · 검증 결과/근거 | 교정 문장 원문 |
| `local_experience_patterns` | verified Preferred/Avoid — `UNIQUE(target, task, stage, polarity, sig)` · verified/failed count · status | 출처 문장 · 화면 글 |

방법(strategy) = 정해진 op 어휘(`search · open_detail · open_tab · open_menu · select_filter · read_result · extract_field · re_search · return_to_list · compare`) ≤ 8개. label 은 `open_tab · open_menu · select_filter` 에만, **검증된 화면 이름**만.

## 3. 명령 경계 — action 4개 (기존 cloud→local 명령 경로 재사용, 새 HTTP endpoint 없음)

| action | 방향 · 용도 |
|---|---|
| `local.data.work_run_context_save` | QUESTION 으로 멈출 때 원래 업무 구조 저장 |
| `local.data.work_run_context_recall` | 재개 때 같은 run 의 구조 복원. 답이 "값 하나" 면 `slotValue` 로 막힌 재생 자리만 채운 단계를 돌려받는다(**Local 은 slotValue 를 저장하지 않는다**) |
| `local.data.work_run_assistance_record` | 도움 · 교정 기록 + 패턴 파생 |
| `local.data.work_run_experience_recall` | D1 질의형 최소 recall — taskKey 없음 → 업무 키(≤10), taskKey → 그 Task × Target 의 verified 패턴(≤8). dump · sync 아님 |

- 양쪽 검증: 서버 [work-assistance.ts](../../apps/api-server/src/services/ai-tools/work-assistance.ts) + [local-agent-protocol.ts](../../apps/api-server/src/services/local-agent/local-agent-protocol.ts) / agent [work-assistance.mjs](../../tools/o4o-local-agent/src/work-assistance.mjs)(손 복제) → [handlers.mjs](../../tools/o4o-local-agent/src/handlers.mjs). 정해진 키 · enum · 형식 밖은 거절.
- 경계 불변식: 값 확인(`providedKind=value`)은 반드시 Assistance · per_run_value / 틀린 방법에 label 금지 / 검증 전(`not_verified · failed`) 방법에 label 금지 / evidence ∈ `system_verified · user_confirmed · agent_inferred`.
- recall 응답 화이트리스트: 출처 run · 시각 · 원문 · id 는 통과하지 않는다.
- 이름 규칙: 모두 `local.data.work_run_*` ledger 가족(site-agnostic) — 처음 `local.data.experience_recall` 로 만들었다가 기존 ledger 규칙(테스트 필터 · 사이트 스코프 예외)에 맞춰 개명.

## 4. Runtime 통합 ([work-agent-runtime.ts](../../apps/api-server/src/services/ai-tools/work-agent-runtime.ts))

1. **Planner 구조 선언(선택)** — proposal 에 `task · stage · strategy · ask · userInput`([work-agent-contract.ts](../../apps/api-server/src/services/ai-tools/work-agent-contract.ts)). 이번 run 값(재개 답 · 입력한 글)은 `forbiddenValues` 로 label 에서 제거.
2. **QUESTION** → `context_save`(구조만).
3. **재개 = 같은 runId · 원래 업무** — `context_recall` → `resumeFrame`. Planner 프롬프트는 "사용자 답변은 새 목적이 아니다" + 원래 업무 구조 + 답변을 분리해 보여 준다. goalSummary 는 덮지 않는다(Phase 1 유지). 값 답이면 막힌 재생 단계를 채워 결정적 재생(이때 Candidate 통계는 건드리지 않는다).
4. **recall** — run 시작 시 업무 키 목록, 업무가 처음 선언되면 그 Task × Target 패턴을 한 번 읽고(패턴이 있으면 그 제안은 실행하지 않고 다시 계획) Preferred/Avoid 를 프롬프트에 보인다.
5. **Avoid 실행 차단** — 선언된 strategy 가 같은 stage 의 verified Avoid 를 부분열로 포함하면 `AVOID_PATTERN` 으로 거절(실행 0) → 재계획.
6. **종료 시 기록** — `recordAssistance`: 대안 label 이 이번 segment 에서 **실제 성공한 click/select 단계 locator** 와 맞고 Outcome 이 SUCCESS/PARTIAL_SUCCESS 일 때만 `verified`(D5). 재개 run 에 분류가 없으면 보수 분류(값 → per_run_value / 그 외 → confirmation · not_reusable).
7. **패턴 파생은 Local 이 한다** — verified + reusable_knowledge + task · stage 있음일 때만. procedure_method → 대안=preferred · 틀린 방법=avoid, 반대 극성 같은 방법은 retired. task_intent · target · outcome 교정 · personal_preference 는 패턴 없음. Shared Skill · 전역 규칙 없음.

## 5. Fixture 결과

| fixture | 기대 | 확인 |
|---|---|---|
| 일반 Assistance ("게보린") | 같은 runId · 원래 업무 유지 · `value/per_run_value` · structured=slot 키 · 값 미저장 · 다음 run 에 다시 묻는 것이 정상 | jest C-1 · agent fixture A |
| Task/Target 의미 교정 | `correction/task_intent` 로 기록 · 대안 없음 → not_verified · 패턴 없음 | jest C-2 · agent fixture B |
| health.kr 동일성분 | wrong=`search→extract_field→re_search`(label 없음) · alternative=`open_detail→open_tab("동일성분")` · 성공 후 verified · 다음 같은 Task × Target 에서 옛 방법 실행 0(AVOID_PATTERN) · 같은 질문 0 · 제품명 미저장 | jest C-3 · C-5 · agent fixture D |
| 대안이 성공 근거와 불일치 | label 제거 · not_verified · 패턴 없음 | jest C-4 |

## 6. 민감정보

- 저장 영역 4테이블 어디에도 답변 원문 · slot 값 · 요청 원문 · 화면 글이 실릴 칸이 없다. sentinel 테스트(agent `Phase 2 경계`) · jest `expectNoSensitive`(제품명 · 답변 문장 · elementRef · snapshotId) 통과.
- label 로 남는 것은 사이트 UI 이름("동일성분")뿐이고, 그것도 성공 locator 와 맞은 경우에만.
- `slotValue` 는 context_recall 인자로만 왕복하고 Local 에 쓰지 않는다.

## 7. 테스트

| 묶음 | 결과 |
|---|---|
| agent `node --test test/*.test.mjs` | **142/142 PASS** (Phase 2 6건 + v6→v7 migration 1건 포함). 첫 실행에서 `import apply`(#30, 이번 WO 무관) 1건 간헐 실패 → 재실행 3회 연속 142/142 |
| jest 신규 [work-assistance.spec.ts](../../apps/api-server/src/__tests__/work-assistance.spec.ts) | **14/14 PASS** (A 순수 7 · B 경계 2 · C runtime 5) |
| jest 기존 회귀 — work-agent · work-agent-llm-closure · local-data-bridge · local-agent-runtime | **111/111 PASS** (action 목록 · handler import 목록 기대값 갱신, ledger 이름 정렬 · 프롬프트 op 개명 후) |
| jest 기존 회귀 — work-experience · workflow-candidate · work-agent-recovery-runtime · work-agent-visual-fastloop · browser-dom-control | **77/77 PASS** |
| `tsc --noEmit`(api-server) | 이번 WO 파일 오류 0. 기존 오류(`@o4o/auth-utils` 미빌드 export · ServiceKey 3건)는 이번 변경과 무관 — 손대지 않음 |

## 8. 한계 (의도적으로 남김)

- 성공 근거는 Planner 완료 판단(agent_inferred) + 성공 locator 와 label 일치. system_verified 결과 판정은 없다.
- Avoid 차단은 Planner 가 strategy 를 **선언했을 때만** 작동한다(선언 없는 행동은 판정 근거가 없다).
- 패턴 재사용 성공 시 verified_count 증가(사용 피드백)는 다음 단계로 미룸 — 지금은 교정 검증 때만 증가.
- 업무가 처음 선언되고 패턴이 있으면 AI 계획 1회가 추가된다.
- 요청 안의 값은 입력되기 전까지 forbiddenValues 에 없다(label 은 성공 locator 일치 검증으로 한 번 더 걸러진다).
- 구 agent(미지원 action)는 recall/record 가 실패로 끝나고 Phase 1 동작으로 남는다(경고 로그만).

## 9. 실 PC 검증 — PENDING

필요: api-server 배포(사용자 승인) + Local Agent 재기동(v6→v7 migration · 백업 확인). 확인 항목:

1. 기동 후 `schemaVersion=7` · pre-migration 백업 1개 · Candidate · Phase 1 Experience 행 수 불변.
2. health.kr 동일성분 Run: 옛 방법으로 멈춤/질문 → "그 방법 말고 제품 상세의 동일성분 탭을 써" → 같은 runId 로 완료 → `local_work_run_corrections` 1행(verified) · `local_experience_patterns` preferred 1 · avoid 1.
3. 다음 같은 Task × Target Run: 같은 질문 없음 · 옛 방법 실행 없음(로그 `work-agent avoid pattern` 또는 Preferred 바로 사용).
4. "게보린" 류 값 답: assistance 1행 per_run_value · 패턴 0.
5. 4테이블 read-only 조회 — 답변 원문 · 제품명 · slot 값 0건.

대상 앱 조작은 Agent 가 한다(사람은 Composer 입력만). runtime 결함으로 막히면 확장하지 않고 BLOCKED 로 원인만 보고.

### 9-1. API 통제 배포 — DONE (2026-10-01, 사용자 승인)

- 사전 확인: HEAD == origin/main `5f12c4acd` ⊇ `6cd618217`. API serving `ac601b0d7` → 함께 반영되는 API runtime 변경은 `6cd618217`(이 WO) + `5f12c4acd`(Web Research 시간 예산, 다른 세션 · CI green) 2건. migration 추가 0. deploy-auto 판정 `CONTROLLED_FIRST_ROLLOUT_REQUIRED`(`eab0474f0` rollout 스크립트 변경) → 정본 통제 배포 절차.
- tag `deploy/2026-10-01-automation-assistance-correction` @ `5f12c4acd` → `deploy-api.yml` run 36859720054 (`rollout_mode=verified`) success. migration Job 성공(신규 0).
- serving: revision `o4o-core-api-03783-jex` traffic 100% · label `o4o-commit-sha=5f12c4acd…` · `/health/ready` ready · `/health` 200.
- 다른 서비스 배포 · CI/CD 수정 0.

### 9-2. 실 PC smoke — Phase 1 PC 에서 진행 (인계)

- 배포를 수행한 PC 의 local.db 는 **schema v2 · runs/Candidate/Experience 0건**(9/13 이후 미사용)이라 v6→v7 · Phase 1 보존 확인이 불가 → 사용자 결정으로 **Phase 1 실 PC(schema v6 · runs 12 · candidates 2)** 에서 §9 를 수행한다. 이 PC 의 local.db · agent · credential 은 건드리지 않았다(schema 조회는 스크래치 복사본에서만).
- Experience 를 PC 간 복사하지 않는다(Local-first).
- 그 PC 에서: `git pull --ff-only`(⊇ `6cd618217`) → agent 정상 종료 · 재기동 → `schemaVersion=7` · pre-migration 백업 · runs/candidates/Phase 1 Experience 행 수 불변 → Chrome bridge 연결 → §9 ①~⑤.
- smoke 문장: Claude Code 가 실제 사이트 화면을 먼저 관찰해 제안하고 사용자가 Composer 에 한 단계씩 입력. health.kr 동일성분은 실제 UI 에 해당 기능이 있을 때만 사용(fixture 에 맞춰 해석 금지). `약학정보원에서 내가 먹을 약 검색해줘` 는 Assistance fixture 로 쓰지 않는다.

## 10. 변경 파일

- 서버: `apps/api-server/src/services/ai-tools/{work-assistance.ts(신규), work-agent-contract.ts, work-agent-runtime.ts, work-run-executor.ts}` · `apps/api-server/src/services/local-agent/local-agent-protocol.ts`
- 테스트: `apps/api-server/src/__tests__/{work-assistance.spec.ts(신규), local-data-bridge.spec.ts, local-agent-runtime.spec.ts}`
- agent: `tools/o4o-local-agent/src/{local-db.mjs, handlers.mjs, work-assistance.mjs(신규)}` · `tools/o4o-local-agent/test/{local-db.test.mjs, local-data-runtime.test.mjs}`
- 무변경: cloud DB schema · package.json · lockfile · CI · Core/Frozen · public route/API(새 endpoint 없음 — 기존 명령 경로의 action 만 추가)
