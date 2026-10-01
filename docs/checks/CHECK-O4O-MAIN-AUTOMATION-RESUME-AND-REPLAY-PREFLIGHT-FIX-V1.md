# CHECK-O4O-MAIN-AUTOMATION-RESUME-AND-REPLAY-PREFLIGHT-FIX-V1

> **WO**: [`WO-O4O-MAIN-AUTOMATION-RESUME-AND-REPLAY-PREFLIGHT-FIX-V1`](../work-orders/WO-O4O-MAIN-AUTOMATION-RESUME-AND-REPLAY-PREFLIGHT-FIX-V1.md)
> **선행 판정**: [`CHECK-O4O-WEB-AUTOMATION-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1`](CHECK-O4O-WEB-AUTOMATION-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1.md) §10 — `BLOCKED` (FAIL 1 SAME_RUN_RESUME_SHORT_ANSWER · FAIL 2 REPLAY_PRE_EXECUTION_SEMANTIC_VALIDATION)
> **작성일**: 2026-09-30
> **현재 판정**: `CODE_COMPLETE` · 배포 serving 확인(api `03774-qeq` · web `01666-qam`, `e2e1be6cc` ⊇ 4a1bec70e, §3-1-a) · 실 PC 재검증 **A · B PASS**(2026-10-01, §3) · H1 · C(재개 실패 유지) · 회귀 **보류** — 선행 [Local Agent polling 지연 WO](CHECK-O4O-LOCAL-AGENT-COMMAND-POLLING-LATENCY-V1.md) 뒤 재개 → `PRODUCTION_READY` 미판정

---

## 1. 변경 요약

| 축 | 결함 | 수정 | 파일 |
|---|---|---|---|
| A | Candidate 템플릿이 맞으면 값의 의미와 무관하게 재생("내가 먹을 약" 입력·클릭 후 AI 가 뒤늦게 판단) | 대조 성공 직후 · **재생 실행 전** `replayPreflight` — 요청에서 온 자리 값이 지시·불특정 표현이면 행동 0 으로 QUESTION(`waiting_for_user`, resumable). 재생을 시도하지 않았으므로 Candidate 결과(실패 통계) 미반영. 로그는 `result: 'ambiguous'` enum 만(값 원문 없음) | `apps/api-server/src/services/ai-tools/workflow-candidate.ts` · `work-agent-runtime.ts` |
| B | runId 재개 요청도 짧은 답("게보린")에서 대상을 다시 찾아 `SITE_UNRESOLVED` | runId 가 있으면 답변 문장으로 대상을 해석하지 않고 **원래 run 대상**(`targetHint` 로 상속)만 쓴다. 상속 대상이 없으면 추측하지 않고 `RESUME_REJECTED`. 재개 시 Local 원장의 원래 `goal_summary` 를 답변으로 덮지 않는다. fresh re-observation 유지 | `work-agent-runtime.ts` · `routes/ai-proxy.routes.ts` · `web-neture/src/lib/ai/unified-request.ts` |
| C | 재개 실패 1회로 client 가 runId 를 버림 | `nextResumeAnchor` — resumable 이면 {runId, 원래 대상} 유지·갱신, `RESUME_REJECTED` · run 이 열린 채 종료(완료·인계·중지)면 해제, run 을 열기 전 실패(runId 없음)는 직전 앵커 유지 | `web-neture/src/lib/ai/work-agent.ts` · `pages/O4OHomePage.tsx` |

### B 데이터 경로 판단

- Cloud `work_run_coordination` 에는 대상 컬럼이 없고(추가 = migration, WO §5 중지), Local `local_work_runs.target_id` 는 read-back verb 가 없으며 설계상 cloud 로 되읽지 않는다(`LocalWorkRunRepository.get` 주석 §조건 4).
- WO §2-B 가 허용한 **클라이언트 전달**을 택했다: 직전 QUESTION 응답의 `goal.siteId` 를 client 앵커에 보관 → 재개 요청에 `targetHint` 로 싣는다.
- `targetHint` 는 `POST /api/ai/work-agent/run` · `work.agent.perform` tool contract 에 **이미 있는 필드**다. `POST /api/ai/request` 는 이를 **runId 가 있을 때만** 본체로 전달하도록 1줄 추가했다(재개가 아니면 무시). 서버는 등재 대상만 받아들인다(`resolveWorkTarget` · contract 검증). 응답 형상 · 의미 변경 없음, Local protocol · DB 무변경.

### 알려진 한계(범위 외 — 기록만)

- 재개 시 planner 목표는 답변 문장뿐이다(원래 요청 원문은 서버에 없음). 대상 · 현재 화면은 상속/재관찰되므로 "게보린" 같은 보충 답은 진행되지만, 원래 목표 문맥까지 넘기려면 새 필드가 필요해 WO §5 에 걸린다.
- A 판정은 언어 수준 어휘 규칙(지시어 · 불특정어 · 관형형 수식)이다. 사이트별 업무 사전이 아니며, 오판은 "묻는 쪽"으로 기운다.

## 2. self 검증

| 항목 | 결과 |
|---|---|
| `workflow-candidate.spec.ts` + `unified-request-http.spec.ts` + `work-agent.spec.ts` | **53/53 PASS** (신규: A 단위 3 · A runtime 1 · B runtime 2 · B route 1) |
| web-neture vitest `src/lib/__tests__/` | **82/82 PASS** (신규 `work-agent.resume-retention.test.ts` 6) |
| web-neture `tsc --noEmit` | PASS |
| Local Agent `node --test test/*.test.mjs` | **123/123 PASS** (agent 코드 무변경) |
| 변경 파일 ESLint | error 0 · warning 1(`O4OHomePage.tsx:282` unused eslint-disable — 기존 줄, 이번 diff 밖) |
| api `tsc --noEmit` | 변경 파일 오류 0. 무관 오류 3건(`community/funding/supplier-service-scope.middleware.ts` ServiceKey) — `@o4o/security-core` dist 가 src 보다 오래됨(build:deps 미실행). 이번 변경과 무관 |

## 3. 실 PC 최소 재검증 — A · B PASS · 나머지 보류

선행: 노출됐던 agentCredential 을 **사용자가 revoke 후 재-pairing**(자동화 안 함). 대상앱 조작은 Agent 가 한다.

| # | 입력 | 기대 | 결과 |
|---|---|---|---|
| B-1 | QUESTION 유도 | `waiting_for_user` · runId 발급 | **PASS** (A 실행이 겸함 — run `g_muovtsol` 발급 · `needs_user`) |
| B-2 | 짧은 답 "게보린" | **같은 runId** · 대상(약학정보원) 상속 · 재관찰 후 전진 | **PASS** — 같은 run `g_muovtsol` 이 completed · modality reason `target_hint` · 기존 탭 재사용 · 재관찰 → 입력 → 클릭 → 결과 8건 · 행동 2 · AI 계획 2 |
| H1 | 약학정보원에서 아모디핀 검색해줘 | 기존 Candidate `replay=completed` | 보류 |
| A | 약학정보원에서 내가 먹을 약 검색해줘 | **입력·클릭 전** QUESTION(행동 0) · Candidate 결과 미기록 | **PASS** — `workflow preflight result=ambiguous` · actionCount 0 · aiPlanCount 0 · Candidate 2건 success/failure 9/30 값 불변 |
| C | 일시적 재개 실패 뒤 runId 유지 | 앵커 유지 · 다음 답으로 같은 run 재개 | 보류 |
| H 회귀 | G/H 기존 흐름 | 결과 동일 | 보류 |
| 안전 회귀 | TAKEOVER 재개 불가 · Cloud 저장 경계 | 변화 없음 | 보류 |

- 선행 조치: Chrome 확장 미연결(`extension_not_connected`)로 첫 A 시도 BLOCKED — native host 가 agent 보다 먼저 떠서 relay 에 한 번만 붙고 재시도하지 않는 구조(`bridge-relay.mjs` `connectBridgeRelay`). agent 실행 후 확장 새로고침으로 해소. 재시도 부재는 사용성 결함으로 기록만(별도 WO).
- 관찰: B 재개 run 은 Candidate `skipped` · `local_work_run_steps` 0행(재개 run 은 학습 대상 아님으로 보임). 판정 영향 없음.

#### 3-0. 실행 시간 실측 (2026-10-01, read-only — api 로그 + local.db)

| run | 구간 | 시간 | 구성 |
|---|---|---|---|
| A | 요청 → 응답 | **30.36 s** | Local 명령 6(탭 준비 · 원장 upsert · get_context · inspect · candidate_match · set_status) ≈ 30.3 s · AI 0 |
| B | 요청 → 응답 | **48.69 s** | Local 명령 9 = 44.0 s · AI 계획 2 ≈ 8.0 s(5.1 + 2.9) · 이동 settle 0.7 s |

- 명령당 PC 실처리는 수십~수백 ms. 명령당 ≈5.1 s 는 agent 의 **고정 5 s heartbeat 대기**(`POLL_INTERVAL_MS`) — 서버는 명령을 순차로 내려보내므로 명령마다 최대 5 s 공백.
- 2순위 AI ≈8 s · 관찰 2명령(get_context + inspect) · 원장 명령 별도 dispatch 는 후속 후보(이번 범위 밖).
- 조치: [`WO-O4O-LOCAL-AGENT-COMMAND-POLLING-LATENCY-V1`](CHECK-O4O-LOCAL-AGENT-COMMAND-POLLING-LATENCY-V1.md) 로 분리 · 이 WO 의 나머지 smoke 보다 먼저.

### 3-1. 배포 시도 기록 (2026-09-30) — `DEPLOY_PAUSED` (사용자 지시: 배포 과정 정비 후 재개)

- 선행 보안 조치: 노출 판단된 Local Agent device 1행 revoke(`status='revoked'`, `revoked_at` 기록 · 사용자 승인 단건 UPDATE) → 사용자가 설정 > 이 PC 연결로 re-pairing → 새 device 발급 확인.
- 배포 SHA `21e965436` (4a1bec70e 포함 · 이후 커밋은 scripts/tests/docs, migration 0).
- web-neture: `neture-web-01665-7wf` traffic 100% (image `21e965436`). 다른 웹 서비스 skip.
- api-server: 새 revision `o4o-core-api-03759-cgw`(image `21e965436`) Ready 이나 **traffic 0%**. 서비스 traffic 이 2026-09-30 02:07Z 에 `o4o-core-api-03758-wdt`(bfa48c135) 100% 로 **revision 고정**돼 있어 workflow 배포가 트래픽을 옮기지 않았다. 고정 의도 미확인 → `update-traffic` 미실행.
- 첫 API dispatch 는 게이트 개방 직후 생성돼 `DEPLOY_ENABLED='false'` 로 읽혀 skip(변수 반영 지연) → 재실행으로 build-and-deploy 성공. 현재 `DEPLOY_ENABLED=false`.
- 실 PC 재검증 미실행 — api 변경(A·B)이 serving 되지 않아 무효. `PRODUCTION_READY` 미판정.
- 재개 조건: api traffic 이 `4a1bec70e` 포함 revision 으로 100% 승격된 뒤 §3 표 전체.

#### 3-1-a. serving 상태 read-only 재확인 (2026-10-01) — 재개 조건 충족, traffic 변경 불요

- 배경: DEPLOY_FREEZE cutover(`WO-O4O-CICD-DEPLOY-FREEZE-CUTOVER-V1`)로 `DEPLOY_ENABLED` 은퇴. 이 WO 가 아닌 배포 정비 작업의 dispatch(run `36723753741`, SHA `e2e1be6cc`)가 api · web-neture 를 새로 올렸다.
- api: `o4o-core-api-03774-qeq` (2026-09-30T13:49:52Z) **100%** — spec.traffic 은 여전히 revisionName 고정(대상만 03774-qeq). image digest `sha256:cb687003…` = 해당 run 로그의 `exporting manifest` digest, 그 manifest list `sha256:fa5c3a12…` = registry tag `e2e1be6cc` · `latest`(digest 불일치는 index ↔ platform manifest 차이). `e2e1be6cc` 는 `4a1bec70e` 를 포함(`git merge-base --is-ancestor` 확인).
- web-neture: `neture-web-01666-qam` 100% (`e2e1be6cc`).
- `o4o-core-api-03759-cgw`(21e965436)로 전환하는 것은 **롤백**이므로 하지 않음. traffic 변경 0.
- 롤백 후보(필요 시 사용자 승인): `o4o-core-api-03759-cgw`(21e965436) → `o4o-core-api-03758-wdt`(bfa48c135).
- api `/health` HTTP 200.
- 남은 것: §3 실 PC 재검증(사용자가 Local Agent 실행 · Composer 입력, Agent 가 대상앱 조작).

**배포 선행 필요**: A · B 는 api-server(`o4o-core-api`), B · C 는 web-neture 변경이다. 선행 CHECK §10 smoke 는 운영 serving revision(`o4o-core-api-03758-wdt`, image `bfa48c135`)을 대상으로 했으므로, 이번 수정의 실 PC 재검증은 **두 서비스 배포 뒤에만 유효**하다. `DEPLOY_ENABLED=false` 유지 · 이번 WO 에서 배포하지 않음 — 배포는 별도 지시 대기.
