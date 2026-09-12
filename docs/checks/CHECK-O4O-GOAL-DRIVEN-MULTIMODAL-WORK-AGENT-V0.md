# CHECK-O4O-GOAL-DRIVEN-MULTIMODAL-WORK-AGENT-V0

> **WO**: `WO-O4O-GOAL-DRIVEN-MULTIMODAL-WORK-AGENT-V0`
> **상태**: loop ESTABLISHED · 실 Chrome loop smoke PASS(scripted planner) — **LLM planner 실측 · production 왕복 = PENDING**
> **작성일**: 2026-09-12
> **상위 원칙**: [`O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1`](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md)
> **선행**: Pharmacy Web Core · health.kr Adapter · Browser DOM Control · Chrome Bridge · Supplier Adapter · Automation Execution Layer · Local Work Agent
> **commit**: `e51d99917` (코드 · 테스트 · UI) · 본 문서

---

## 0. 한 줄 요약

"등록된 기능을 실행하는 자동화" 에서 **"목적을 이해하고 현재 화면을 보면서 일을 진행하는 자동화"** 로 넘어가는 첫 V0.
`User Goal → Observe → Plan → Act → Observe Result → Progress → Continue / Takeover` 를 runtime contract 로 세웠다. AI(Planner)는
다음 행동 **하나**를 제안할 뿐이고, runtime 이 검증(행동 allowlist · 관찰 밖 ref · URL/selector/JS/credential 키 · COMMIT 대상 · 입력 deny)
해 기존 `local.browser.dom.*` 명령으로 실행하고 다시 관찰한다. 실 Chrome + 실 health.kr 에서 결정적 planner 로 loop 를 왕복(5/5)했고,
Chrome 에는 검색 결과 화면이 그대로 남아 사용자에게 인계됐다. 상태는 요청 안에서만 산다 — `automation_jobs` · 큐 · 스케줄러 · DB 접촉 0.

---

## 1. 기존 Agent/runtime census

| 축 | 착수 전 | 이번 WO |
|---|---|---|
| 실행 | 문장 → 결정론 라우터 → 등재 tool 1개(DOM 8 · supplier 1 · pharmacyweb 1) — "등록된 기능 실행" | + `local.workagent.perform` 1 — Goal 기반 loop(관찰·계획·행동·재관찰) |
| AI 판단 | tool 선택에 미개입(키워드 결정론) | Planner 가 관찰을 보고 다음 행동 제안(§10) — runtime 검증 뒤 실행 |
| provider | `@o4o/ai-core execute()`(json/text) · gemini inline_data(vision/analyze) | 그대로 재사용 — 새 provider stack 0(§44) |
| DOM 발행 공통 | `browser-dom-executor.ts` | 그대로 사용 — 새 agent action 0 |
| 상태 | tool 결과 1회 | `WorkAgentState`(요청 안) — DB 0 |

## 2. Goal contract (§5)

`WorkGoal { goalId, request, targetHint?, status: active|waiting_for_user|completed|stopped }`. 사이트는 `targetHint`(등재 siteId) 또는 문장의
별칭(site 축 + Pharmacy Web 등재부)으로 정한다 — 못 정하면 `WORK_AGENT_SITE_UNRESOLVED` → `needs_user`, 명령 0. 메뉴명 · URL · 클릭 순서를
요구하지 않는다. 인자 형상 `{ request, targetHint?, image? }` 에 URL · selector · elementRef 칸 없음.

## 3. Observation (§7)

`get_context`(path · ready · siteId) + `inspect`(≤80 요소 요약) → `WorkObservation { path, elements, elementCount, source:'webpage', fingerprint }`.
전체 HTML/텍스트 dump 없음(DOM 계약이 이미 막는다). 프롬프트에는 `[webpage] … [/webpage]` + UNTRUSTED 로 들어간다. 이동 직후 content
script 가 서기 전(`DOM_CONTENT_UNAVAILABLE`)은 짧게 재시도. `find` 결과는 새 snapshot 의 후보로 관찰을 대체(ref–snapshot 짝 유지).

## 4. Planner (§8·§10)

`WorkPlanner.plan(input) → JSON` 인터페이스. 입력 = Goal · 사이트 · 현재 관찰 · 최근 행동 6 · 직전 읽은 내용(≤600자) · 이미지 유무 ·
직전 거절 사유 · 남은 행동 수. 출력 = `{ assessment, action{kind…}, rationale, neededInput }`. 행동 어휘 9(inspect · find · read_text ·
read_table · set_input · select_option · click · takeover · done) — 전부 기존 DOM tool 또는 loop 제어. system prompt 에 URL/selector/JS/명령어/좌표
금지 · COMMIT/credential 은 takeover · 결과 화면에서 인계 · 이미지는 "현재 화면이 요구하는 값만" · UNTRUSTED 규칙.

## 5. Runtime validation (§9·§10·§47)

`validateWorkProposal(raw, observation)`: 형상 → 금지 키(`url · href · navigate · selector · css · xpath · js · script · eval · shell · command ·
password · otp · token · cookie · credential · capability · permission · riskLevel · computer · coordinates`, 3단계 깊이) → 행동 종류 →
elementRef 는 **직전 관찰에 있고** role 이 맞고 disabled 아님 → click 대상이 관찰에서 COMMIT 이면 거절 → set_input 텍스트는
`domInputDenyReason` + `<>{}` 거절 → find 는 DOM 5키 → takeover 사유는 등재분. 거절은 실행되지 않고 Planner 에 사유를 돌려주며 연속 2회면
`planner_unavailable` 인계. 확장의 COMMIT/credential/cross-origin 차단은 그 위에 한 번 더 있다.

## 6. Multimodal interpretation (§11·§12·§13·§45·§46)

이미지 `{ mimeType(jpeg/png/webp), base64 }` 는 Planner 입력으로만 전달(`provenance: user_image`, UNTRUSTED). gemini 면 기존
inline_data 경로, openai 면 텍스트만(프롬프트에 "이미지를 볼 수 없다 → 필요하면 takeover" 명시). **고정 스키마 없음** — 소스 잠금
(`PillVisualFeatures · frontMark · backMark · drugName · productName` 부재). 불확실하면 가능한 값으로 진행하고 후보 여럿 허용(§13).
이미지 바이트는 DOM 명령 인자 · 로그 · 응답 어디에도 없다.

## 7. Browser DOM action (§14·§16)

READ(inspect/find/read_*) · REVERSIBLE(set_input/select_option/click) 만. 전부 `local.browser.dom.*#siteId`. computer.* 0(자동 fallback 없음 §15).
COMMIT 은 제안 단계(관찰 riskLevel) + 확장 이중 차단 → `commit_required` 인계. 비밀번호 필드 → `credential_required`. 등재 밖 이동 → `unsupported_control`.

## 8. Result observation · 9. Progress (§17·§18)

행동 성공 ≠ 목적 달성. click · 이동 · 화면 변화 뒤에는 반드시 `observe()`(입력/선택은 응답 `hasValue` 가 결과 확인이라 문서 불변 시 재관찰 생략 — 예산 절약).
요소 없음 실패는 재관찰 뒤 Planner 가 다른 길을 찾게 한다. Progress = `progress · no_progress · needs_user · completed · failed`; 같은 관찰 지문 3회 →
`no_progress` 인계, Planner 의 `needs_user` 판단 → `user_judgment_required` 인계.

## 10. Takeover (§19·§20·§21)

사유 등재: `goal_sufficiently_advanced · user_judgment_required · ambiguous_result · unsupported_control · review_required · commit_required ·
credential_required · site_not_ready · no_progress · loop_limit · planner_unavailable`. 인계는 실패가 아니다(`ok:true`, goal `waiting_for_user`).
**Chrome 의 실제 화면을 그대로 둔다** — 뒤로가기/닫기 어휘 자체가 없다. 렌더 문구가 "Chrome 의 현재 화면은 그대로 두었습니다" 를 붙인다.

## 11. Usage / learning signal (§22·§23)

`work-agent run` 로그 = `siteId · inputMode · actionCount · aiPlanCount · takeoverReason · takeoverStep · userCorrectionCount(V0=0) · completionState ·
durationMs · timestamp` **10키뿐**(spec 단언). goal 원문 · 관찰 · 입력값 · 이미지 · 페이지 텍스트 없음. 기존 logger 인프라 재사용, 새 DB 0.

## 12. Workflow candidate boundary (§24·§25·§26)

V0 는 학습 엔진을 만들지 않는다. 비교 가능한 sequence(Goal → Observation → Action → Result → Takeover)가 `history` · usage signal 에 남는다.
사용자 행동 1회 → production Workflow 변경 경로 없음(등재부는 코드 상수, 이 WO 가 건드리지 않음).

## 13. Loop safety (§34·§35·§36)

`maxSteps 14 · maxAiPlans 8 · maxDuration 90s · 같은 행동 2회 · 같은 관찰 3회 · 잘못된 제안 연속 2회`. 상한은 `loop_limit`/`no_progress`/`planner_unavailable`
인계로 끝난다 — 무한 loop 없음(spec: 30개 제안 → 14 steps · 8 plans 안에서 종료).

## 14. Risk (§16) · 15. Prompt injection (§45·§46)

기존 READ/REVERSIBLE/REVIEW_REQUIRED/COMMIT 그대로. 관찰 · 읽은 텍스트 · 이미지 = UNTRUSTED(`isUntrustedProvenance`), Planner 규칙에 명시,
runtime 검증이 어떤 문장도 tool authority 로 바꾸지 못하게 한다.

## 16. automation_jobs boundary (§37~§43)

- `automation_jobs`(VIDEO P0 트랙) 는 **장기 작업의 상태 · 지시 · Media asset 관계를 보관하는 얇은 persistence record** 다.
  `automation_jobs is a lightweight persistent work record. It is not a scheduler, executor, workflow engine, agent runtime, or tool execution queue.`
- Work Agent 상태(goal · observation · planned action · last result · step count · takeover)는 요청 안의 `WorkAgentState` 다 — schema 에 넣지 않는다.
- 이 WO 는 VIDEO P0 소유 파일(entity · migration · media 모듈)을 건드리지 않았다(그 트랙에 위임). spec 이 Work Agent 소스에
  `automation_job* · scheduler · setInterval · cron · queue · BullMQ · Worker( · retryQueue · workflow_dag · agent_run_history` 부재와
  `getRepository · save( · INSERT · migration` 부재, 그리고 migrations 디렉터리에 agent run/DAG/job steps 테이블 부재를 단언한다.

```text
AUTOMATION_JOB ≠ AGENT_RUNTIME  = PASS
JOB / EXECUTION RESPONSIBILITY  = SEPARATED
SCHEDULER ADDED                 = 0
WORKFLOW ENGINE ADDED           = 0
AGENT EXECUTION QUEUE ADDED     = 0
```

## 17. Chrome smoke (§52) — 실 Chromium + unpacked 확장 + native host + agent runAction + api-server `runWorkAgent`, **실 health.kr**

| # | 시나리오 | 결과 |
|---|---|---|
| A | Goal "약학정보원에서 아모디핀정을 찾아서 검색 결과 화면까지 가줘" (scripted planner) → get_context · inspect(128 요소) → set_input(e_11) → click(e_12, navigated) → get_context · inspect(65 요소, `/searchDrug/search_total_result.asp`) → takeover `goal_sufficiently_advanced` · 6 명령 · 3 plans · 2.3 s | PASS |
| A' | Chrome 에 실제 결과 화면 유지 — heading "검색결과 리스트 ( 2개 )" | PASS |
| C | 6 명령 전부 `#healthkr` · computer.* 0 · 인자에 URL/selector/JS 0 | PASS |

**5/5 PASS**(scripted planner). 하네스는 scratchpad(미커밋).

## 18. Multimodal smoke (§53) · LLM planner 실측

**PENDING** — 이 PC 에 Gemini API 키가 없다(사용자: "아직 만들지 않았어, gemini 는 나중에"). LLM planner(`createLlmPlanner`) 코드 경로와 이미지
inline_data 형상은 spec 이 fetch 주입으로 검증했고, loop 자체는 §17 로 실측했다. 키가 준비되면 같은 하네스(`PLANNER=llm SMOKE_IMAGE=…`)로 텍스트 Goal +
알약 이미지 Goal 을 실측한다.

## 19. Production smoke (§54)

**PENDING** — 이 PC 폴링 agent 의 production 페어링 부재(사용자 계정 단계). 배포는 CI(아래).

```text
IMPLEMENTATION       = ESTABLISHED
REAL CHROME LOOP     = PASS (scripted planner · 실 health.kr)
LLM PLANNER          = PENDING (Gemini 키)
PRODUCTION ROUNDTRIP = PENDING (pairing)
```

## 20. Tests · CI (§50·§51)

| 게이트 | 결과 |
|---|---|
| `work-agent.spec.ts` — Goal 2 · Observation 1 · Planning 2 · Action 1 · Result 1 · Takeover 1 · Loop 1 · Multimodal 2 · Boundary 1 · Regression 2 (14 test) | **14 PASS** |
| census 잠금 갱신 — `automation-execution-layer.spec`(browser_dom 집합) · `ai-capability-tool-routing.spec`(non-readOnly 목록) | PASS |
| 관련 api-server jest 13 스위트(AI Tool Routing · Execution Layer · Browser DOM · Bridge · Computer Use · Pharmacy Web · Supplier · Local Agent …) | **298 PASS** |
| agent node:test 3 파일 | **59 PASS** |
| tsc(api-server · web-neture) | WO 파일 오류 0 |
| eslint(변경 9 파일) | 0 |
| CI | `e51d99917` Deploy API · Deploy Web · CodeQL success(리비전 `o4o-core-api-03631-s2x`); CI Pipeline 은 다른 세션 push(`bb3ae1e5c` · `a49572c38`) 의 concurrency 로 두 번 cancelled → `a49572c38`(본 commit 포함) **CI Pipeline success** — `work-agent.spec.ts` PASS · agent node:test 59 |

## 21. DB migration · write (§55)

cloud/local migration **0** · agent run history · workflow DAG · scheduler · automation_job_steps 테이블 **0** · 사용 이벤트는 logger 재사용 · DB write 는 기존
`local_agent_commands` envelope 범위.

## 22. Limitations

1. **LLM planner 미실측** — 프롬프트 · JSON 형상은 계약대로지만 실제 모델의 제안 품질(불필요한 탐색 · 잘못된 ref)은 키 확보 후 실측해야 한다. 초기 비용은 §32 대로 허용.
2. 행동 예산 14(관찰 포함) — 관찰 2 + [행동 1 + 재관찰 2]×~4. 긴 업무는 loop_limit 인계로 끝나고 사용자가 이어간다(설계 의도).
3. 관찰 = `inspect` 80 요소 상한 — 큰 페이지(health.kr 128 요소)는 앞 80개만 Planner 가 본다. `find` 로 좁히는 것은 Planner 몫.
4. 사이트는 등재 browser site 만(§29). 미등록 사이트 자동 발견 없음.
5. `userCorrectionCount` 는 계약만(클라이언트 보고 없음). takeover 이후 사용자 행동은 관측하지 않는다.
6. UI 는 Home 입력창 + [작업 수행] + 이미지 첨부 + 결과 문장 — 진행 중 단계 표시는 없다(요청 1회 동기 실행).
7. Windows UIA · PC 프로그램 · 두 번째 실사이트 · 학습 엔진 · 자동 승격 · 스케줄러 · retry 는 범위 밖(§58).

## 23. Follow-up (§59)

Gemini 키 확보 → LLM planner 실측(텍스트 · 이미지) → production pairing → 왕복. 이후 실제 사용에서 반복되는 필요에 따라: Workflow Candidate/Learning V0 ·
Browser DOM V1(커스텀 클릭 대상 · read_section) · Windows UIA V0 · 두 번째 실사이트 · Takeover/Correction metrics · Validated Workflow Replay — 순서 고정 없음.

---

*문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건*
