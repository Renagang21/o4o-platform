# WO-O4O-MAIN-AUTOMATION-RESUME-AND-REPLAY-PREFLIGHT-FIX-V1

> **선행 판정**: [`CHECK-O4O-WEB-AUTOMATION-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1`](../checks/CHECK-O4O-WEB-AUTOMATION-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1.md) §10 — `MAIN_AUTOMATION_WORKFLOW_STATUS = BLOCKED` (commit `ee9883a21`)
> **상위 원칙**: [`O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1`](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md)
> **작성일**: 2026-09-30 · **성격**: 수정 WO (closure 와 분리)

---

## 1. 목표와 배경

2026-09-30 실 PC smoke 에서 G/H 재생·저장 경계는 PASS 였으나 결함 2건으로 BLOCKED 판정되었다.

- **FAIL 1 `SAME_RUN_RESUME_SHORT_ANSWER`** — `waiting_for_user` run(`g_munng2tv`)에 짧은 답변 "게보린" 을 보내자 router 는 `resume` 으로 보냈지만 runtime 이 **resume 처리 전에 답변 문장으로 대상을 해석**해 `SITE_UNRESOLVED`(행동 0)로 끝났다. 원래 run 의 `target_id` 를 상속하지 않고, 실패 뒤 `O4OHomePage` 가 runId 를 버려 다음 입력이 **새 run** 이 되었다.
- **FAIL 2 `REPLAY_PRE_EXECUTION_SEMANTIC_VALIDATION`**(안전 경계) — 재생이 **템플릿 일치만으로** 시작해 "내가 먹을 약" 을 검색어로 실제 실행했다. 멈춤은 실행 **뒤** 였다.

목표: ① 모호한 자리 값은 **실행 전에** 묻는다 ② 짧은 답변이 **같은 logical run** 으로 재개된다 ③ 한 번의 재개 실패로 대기 중인 run 을 잃지 않는다.

## 2. 승인 범위

**A. Replay preflight semantic validation**
- Candidate 대조 성공 직후, 재생 실행 **전에** 자리 값이 구체적·충분한지 판단한다(예: "아모디핀" = 구체적 → 재생 / "내가 먹을 약" = 대상 불명 → 실행 전 QUESTION → `waiting_for_user`).
- 값이 명확할 때만 결정론적 재생. 모호하면 행동 0 으로 QUESTION. 판단 방식(규칙·LLM 1회 등)은 구현자가 정하되, 판단 결과는 로그 enum 으로만 남기고 값 원문은 Cloud 로그·DB 에 남기지 않는다.
- 모호 판정 run 은 Candidate 실패 통계에 넣지 않는다(재생을 시도하지 않았으므로).

**B. Same-run resume target inheritance**
- runId 가 있으면 **`checkResumable` → 원래 run 의 대상 상속 → 그 다음에** 새 답변에서 대상 해석(답변에 다른 등재 대상이 명시된 경우만 덮어쓰기 여부 판단).
- 원래 run 의 `target_id` 는 Local `local_work_runs` 가 정본이다. Cloud `work_run_coordination` 에 컬럼 추가 없이 가져온다(기존 Local 조회 경로 또는 클라이언트 전달 중 택1 — Cloud schema 변경이 필요해지면 §5 중지).
- 짧은 답변은 같은 runId 로 재개하고, 재개 시 **현재 화면 재관찰(fresh re-observation)** 은 그대로 유지한다. 답변은 원래 목표의 보충으로 planner 에 전달한다.

**C. Resume failure state retention**
- `services/web-neture/src/pages/O4OHomePage.tsx` 가 재개 실패 1회로 runId 를 버리지 않는다.
- run 이 여전히 `waiting_for_user` / resumable 이면 runId 유지. **terminal 또는 거부(not_found · not_owner · terminal · expired) 확인 시에만** 해제. 서버 응답에 이를 구분할 최소 신호가 없으면 기존 응답 필드 안에서 해결하고, API contract 변경이 필요하면 §5 중지.

## 3. 실행 순서

1. `git fetch` · `git status -sb` — clean 확인.
2. 현행 경로 재확인: `work-agent-runtime.ts` 의 `resolveWorkTarget(goal.request, …)`(대상 해석) ↔ `checkResumable` 순서, 재생 prefix 진입점, `O4OHomePage.tsx` 의 `setResumeRunId`.
3. B → C → A 순으로 최소 수정(B·C 는 같은 결함의 서버/클라이언트 양면).
4. 결정적 테스트 추가: B(짧은 답변 → 같은 runId · 상속 target) · C(재개 실패 시 runId 유지/해제 분기) · A(구체 값 → 재생, 모호 값 → 행동 0 QUESTION, 실패 통계 미반영).
5. 기존 suite 회귀(아래 §6).
6. 실 PC 최소 재검증(§6) — 사용자 환경에서, 대상앱 조작은 Agent.
7. 원 CHECK §10 에 재검증 결과 추가(또는 본 WO 의 CHECK 신설) · commit · push.

## 4. 제외 범위

- **Hospital Pharmacy 관련 일체**.
- Local Agent polling 주기(5s) · latency 최적화 · `DOM_TAB_NOT_FOUND`.
- 템플릿 대조 규칙 완화("찾아줘"/"검색해줘", "을"/"를" 동일시) · 힌트 run 일반화 · UIA 재생.
- installer · onboarding · Web Store · pairing/로그인 자동화 · 403 계정 불일치 문구 개선.
- router 재설계 · 새 workflow 기능 · Cloud 테이블/컬럼/migration.

## 5. 중지 조건

- Cloud DB schema · migration 필요.
- API contract(요청/응답 필드 추가·의미 변경)나 Local agent protocol verb 추가 필요.
- `package.json` · lockfile 변경 필요.
- 안전 경계(never-escalate · COMMIT · credential 인계) 동작 변경이 필요해 보일 때.
- 기존 `local.db` 삭제·초기화 필요.
- 본 변경과 무관한 build/test 실패.
- 배포 필요 판단(`DEPLOY_ENABLED=false` 유지 — 배포는 별도 지시).

## 6. 검증과 Git

**self 검증**: api `tsc --noEmit` 0 · `workflow-candidate.spec.ts` + work-agent · unified-request 관련 suite 전량 PASS · agent `node --test test/*.test.mjs` PASS · 변경 파일 ESLint 0 · lint ratchet 기준선 불변 · web-neture 타입체크.

**실 PC 최소 재검증**(수치·runId 기록):

| # | 입력 | 기대 |
|---|---|---|
| B | QUESTION 상태에서 "게보린" | **같은 runId** 로 재개 · 원래 대상(약학정보원) 상속 · 재관찰 후 전진 |
| H1 | 약학정보원에서 아모디핀 검색해줘 | `replay=completed` · aiPlanCount 1 |
| A | 약학정보원에서 내가 먹을 약 검색해줘 | **실행 전** QUESTION(행동 0) · Candidate failure 미증가 |
| H 회귀 | G/H 기존 흐름 | 결과 동일 |
| 안전 회귀 | TAKEOVER 재개 불가 · Cloud 저장 경계 | 변화 없음 |

I 실 PC self-healing smoke 는 가능하면 함께(불가 시 PENDING 유지).

**Git**: path-specific stage · `node scripts/git/check-staged-scope.mjs <paths>` · `git commit -m … -- <paths>` · push · `HEAD == origin/main`. 다른 세션 WIP 불가침.

## 7. 완료 보고

- 제목에 WO 명.
- 범위 A/B/C 각각: 변경 파일 · 핵심 변경 1~2줄.
- self 검증 결과(실패·생략 포함) · 실 PC 재검증 표(runId · aiPlanCount · 소요).
- 판정 키: `REPLAY_PRE_EXECUTION_SEMANTIC_VALIDATION` · `SAME_RUN_RESUME_SHORT_ANSWER` · `RESUME_FAILURE_STATE_RETENTION` · `SAFETY_REGRESSION` · `MAIN_AUTOMATION_WORKFLOW_STATUS`(CLOSED 여부는 사용자 판정).
- Git 상태(commit hash · HEAD == origin/main).
- `문서 정합` 한 줄.
