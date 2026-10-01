# IR-O4O-AUTOMATION-AGENT-ARCHITECTURE-REALIGNMENT-V1

> **상태**: COMPLETED (조사) — 판정의 정본 승격 대상 = [`O4O-AUTOMATION-AGENT-ARCHITECTURE-V1`](../baseline/O4O-AUTOMATION-AGENT-ARCHITECTURE-V1.md) (**DRAFT · 사용자 검토 대기**)
> **작성일**: 2026-10-01
> **근거**: 사용자 지시 "O4O Automation Agent 아키텍처 재정렬 조사 및 정본 문서화" (2026-10-01, WO 문서 없음 — 이 IR 이 기록)
> **기준 커밋**: `origin/main` 146ef5eb6
> **성격**: 조사·문서 전용. 코드 · DB · migration · 배포 · 실 PC smoke **0건**. 진행 중 결함(polling · relay · site_not_ready)은 **수정하지 않았다**.
> **상위 정본**: [`O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1`](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md) (§25 = 2026-09-12 정렬 상태 — 이 IR 은 그 후속 census)

---

## 0. 한 줄 결론

**실행 계층(Layer 6)은 성숙했고, 그 위의 경험 계층(Layer 4)·승격 계층(Layer 5)은 사실상 비어 있다.** 유일한 "학습" 산출물인 Workflow Candidate 는 **사용자 도움이 들어간 run 을 저장 대상에서 제외**한다 — 원칙 B·C 가 가장 가치 있다고 보는 경험을 구조적으로 버리고 있다. 개발 투자는 **Local RPA / Workflow Player 쪽으로 기울어 있다**(코드량 약 30:1, 최근 CHECK 대부분이 runtime 결함). 방향이 틀린 것은 아니다 — AI 가 먼저 해결하고 성공 경로를 결정적으로 재생한다는 뼈대는 원칙과 같다. 다만 **"무엇을 경험으로 남길지" 가 정의되지 않은 채 실행 계층만 깊어지고 있다.**

---

## 1. 조사 범위와 방법

- 최신 `origin/main` 실제 코드·스키마·CHECK/WO 를 계층별로 병렬 추적(Request/Reasoning · Experience 저장 · Execution 인벤토리). 이름 검색이 아니라 호출 경로를 따라갔다.
- 핵심 주장은 원 코드에서 직접 재확인했다(§9 근거표에 `파일:행`).
- 상위 원칙 A~F 는 사용자 지시(2026-10-01)를 전제로 삼았다. 기존 정본 EVOLUTION-PRINCIPLES 와의 관계는 §8.

---

## 2. 현재 데이터 흐름 (요청 → 결과)

```text
사용자 자연어 (Neture Home Composer · /hospital-drug)
  │ POST /api/ai/request                              ai-proxy.routes.ts:2201
  ▼
classifyUnifiedRequest  ── 결정론(키워드) · AI 0회      unified-request-router.ts:134-149
  │  runId 있음 → work(resume)
  │  등재 대상 없음 → chat   ← 처음 보는 사이트/프로그램은 여기서 끝난다
  │  task 동사(찾아/검색/조회) → work · 그 밖 → confirm_work
  ▼
resolveWorkTarget  ── 등재 allowlist 별칭 매칭            work-target-resolver.ts:36-49
  │  사이트 2(o4o.neture · healthkr) · 앱 4(notepad · kakaotalk · calculator · doctors)
  ▼
classifyTaskModality → screen → provider openai          task-modality-router.ts:124-135
  ▼
runWorkAgent (work-agent-runtime.ts)
  ├ coordination claim (Cloud work_run_coordination: 상태·버전만, 24h 뒤 삭제)
  ├ local.target.prepare (탭 재사용/열기 · 창 활성화)
  ├ [DOM · 신규 run · 힌트/이미지 없음] Workflow Candidate match → replayPreflight → 결정적 replay
  │      불일치 → diverged → AI loop
  ├ observe(local.browser.dom.get_context / UIA inspect) → LLM plan(JSON action ≤4) → validate → execute
  │      반복: maxSteps 14 · maxAiPlans 8 · 90s
  ├ 막힘: decideRecovery normal×2 → strong×2 → user
  └ 종료: completed / waiting_for_user(QUESTION, 재개 가능) / taken_over(종료)
        ├ completed & 신규 & 힌트 없음 & DOM → buildWorkflowCandidate → Local SQLite 저장
        ├ Local SQLite local_work_runs: status 만 갱신
        └ logger.info('work-agent run', usage event) → Cloud Logging (DB 아님)
```

모든 실행 명령은 `local_agent_commands` 큐 → PC Local Agent heartbeat 수령 → (웹) native host relay → Chrome 확장 → content script 순서로 간다.

---

## 3. 6계층 매핑과 판정

판정어: `IMPLEMENTED` · `PARTIAL` · `MISSING` · `MISALIGNED`(있지만 원칙과 반대 방향으로 작동).

### Layer 1 — Request / Intent : **PARTIAL**

| 있는 것 | 없는 것 |
|---|---|
| chat/work/confirm_work 결정론 분기(AI 0회 · 비용 0) | 업무 유형(Task/Intent) 개념 — 요청은 원문 문자열로만 planner 에 간다(runtime `:187`) |
| 등재 대상 별칭 해석 · 파일 첨부 축 분리 · modality(research/screen/question) | 필요 입력값 정의·추출 — 값은 LLM 이 화면 보며 고른다. 결정적 추출은 Candidate slot 뿐 |
| | 같은 업무의 다른 표현을 하나로 묶는 키(현재 Candidate 템플릿은 문장형 정확일치 — "찾아줘"≠"검색해줘") |

### Layer 2 — Discovery / Reasoning : **PARTIAL** (하위 항목 1건 MISALIGNED)

- **현재 Strong Agent 의 실체**: 웹 work 는 modality `screen` → OpenAI 기본 모델 `gpt-6-astra`(플래그십). 즉 등재 사이트 안의 작업은 **우연히** 강한 모델로 시작한다 — 설계 의도가 아니라 기본값이 플래그십이라서다(`utils/ai-provider-runtime.ts:60`).
- **strong 승격은 실패 구동이다**: `RECOVERY_TIERS = normal_retry → strong_model → user_assistance` (`automation-recovery-contract.ts:122`). OpenAI 경로는 normal 과 strong 이 **같은 모델**(`STRONG_MODEL_DEFAULT.openai = 'gpt-6-astra'`, `ai-provider-runtime.ts:138-141`)이라 승격이 실질적으로 무효다.
- **처음 보는 대상 → 탐색하지 않고 거절**: 등재 대상이 없으면 chat 으로 보내고(`unified-request-router.ts:140`) work 에서는 `SITE_UNRESOLVED` "어느 사이트나 프로그램에서 할 일인지 알려 주세요"(runtime `:489`). **MISALIGNED** — 원칙 A("새 업무는 강한 AI 에서 시작") 와 EVOLUTION §14("사이트별 업무 사전 정의 금지") 모두 등재부가 발견의 **전제 조건**이 되는 것을 원하지 않는다. 지금은 등재부가 문(gate)이다.
- 예산이 실행용 크기다: maxAiPlans 8 · 90s · 웹 screenshot 없음(DOM 텍스트만). Discovery 를 위한 별도 예산·관찰 수단이 없다.
- 완료 판정이 LLM 단독(`:1091-1095`) — 결정적 성공 검증이 없어 Outcome 의 신뢰도 근거가 약하다(Layer 4 에 영향).

### Layer 3 — Assistance / Knowledge Acquisition : **PARTIAL**

| 구현됨 | 부족·없음 |
|---|---|
| QUESTION(`waiting_for_user`·재개 가능) ↔ TAKEOVER(`taken_over`·종료) 분리, version-checked same-run resume, `neededInput` 문구, 막힘 소진 시 QUESTION 종료 (CHECK USER-COLLABORATION-V1 READY) | **재개 시 원래 목표가 planner 에 돌아오지 않는다** — 답변문이 `goal.request` 가 되고(runtime `:475`) 원 목표는 Local `goal_summary` 에만 있고 read-back 없음. 짧은 답("타이레놀")만 보고 이어간다 |
| replayPreflight — 불특정 어휘면 실행 전 질문(행동 0) | 질문 유형이 "값 확인" 뿐 — **업무 순서·메뉴 위치·매뉴얼 요청**이라는 질문 종류가 없다 |
| `recoveryHint` 서버 수용 | `recoveryHint` 를 보내는 클라이언트가 없다(사실상 미사용) |
| Generic File Understanding(스프레드시트 구조 추론) | **매뉴얼/문서 ingestion 없음** — 문서 첨부는 work 가 아니라 chat 으로 간다(`unified-request-router.ts:146`) · `manual\|procedure\|매뉴얼` grep 0건(ai-tools · local-agent) |
| | 사용자 답변·교정이 저장되지 않는다(Layer 4) |

### Layer 4 — Experience / Learning : **MISALIGNED** (가장 중요)

현재 저장되는 것 전부:

| 저장소 | 위치 | 담는 것 | 의미 |
|---|---|---|---|
| `local_work_runs` | Local SQLite v3 | run_id · status · target_id · goal_summary(요청 200자) | 상태 원장. **아무도 읽지 않는다**(`get()` 은 진단용) |
| `local_work_run_steps` | Local v5 | 성공 trajectory step(JSON) | Candidate 저장 때만 기록 |
| `local_workflow_candidates` | Local v5 | target × 요청 템플릿 → step 최대 12 · success/failure count · active/disabled | **유일한 학습 산출물**. 개인 범위 전용 |
| `work_run_coordination` | Cloud PG | run_id · user · device · status · version | 동시성 조정. 종료 24h 뒤 삭제 |
| `local_agent_commands` | Cloud PG | tool · action · status · error_code · 시각 | 명령 큐(결과 본문은 읽으면 NULL) |
| usage event | Cloud Logging | siteId · actionCount · aiPlanCount · takeoverReason/Step · completionState · durationMs · failureClass · recoveryTier | 로그. DB·집계 없음. `userCorrectionCount` 는 **상수 0**(`work-agent-contract.ts:585`) |

**MISALIGNED 판정 근거**:
1. Candidate 는 **재개된 run · 힌트가 있는 run 을 저장하지 않는다**(runtime `:558-559`, 결과 `skipped`). 사용자가 도와 성공한 업무 — 원칙 B·C 가 "업무 경험 데이터 후보" 라고 정의한 바로 그 경험 — 이 저장 대상에서 빠진다. 실 PC B run(10/01)도 `candidate: skipped · 0 steps` 로 확인됐다.
2. 저장되는 것은 **성공한 DOM 클릭 경로**뿐이다. 실패 · 실패 원인 · 복구 방법 · 사용자 답변 · 참조 자료 · 실행 수단 · 소요시간 · AI 판단 수는 run 과 묶여 저장되지 않는다(로그에 흩어짐).
3. Windows(UIA) · computer-use run 은 Candidate 자체가 없다.

질문별 답변 가능 여부:

| 질문 | 판정 | 근거 |
|---|---|---|
| 이 업무를 해본 적 있는가 | PARTIAL | 본인 PC · 일반화 가능한 DOM 성공만(템플릿 정규식 매칭) |
| 누가 어떻게 성공했는가 | PARTIAL | 본인 것만. 사용자 간 0 |
| 평균 소요시간 | PARTIAL | Cloud Logging durationMs 뿐 · 업무 키 없음 |
| 어디서 자주 실패하는가 | PARTIAL | 로그 failureClass/takeoverStep · Local 은 candidate 단위 failure_count(위치·원인 없음) |
| 사용자가 무엇을 가르쳤는가 | **NO** | 저장 안 함 · 오히려 저장 억제 |
| 어떤 매뉴얼을 참고했는가 | **NO** | 매뉴얼 개념 없음 |
| 다른 사용자에게 활용 가능한가 | **NO** | Local 전용 · 공유 승격 명시적 제외(`local-db.mjs:263`) |

### Layer 5 — Promotion / Cost Optimization : **MISSING**

- Strong AI → cheaper AI 전환: **없다.** 축적 경험으로 모델을 낮추는 코드 0. OpenAI 라인업에 경제형(`gpt-5.6-luna`, 입력 단가 약 1/50)이 있으나 쓰는 경로 없음.
- saved procedure → deterministic: Candidate replay 가 **유일한 결정적 경로**다. 그러나 이것은 승격 엔진이 아니라 "본인의 직전 성공을 템플릿 일치 시 재생" 이다 — 성공률·UI 안정성·입력 변화·개입 빈도를 보지 않는다. replay 뒤에도 planner 가 최소 1회 완료 확인을 한다.
- `hasVerifiedWorkflow` modality hook 은 **정의만 있고 주입되지 않는다**(`task-modality-router.ts:46,126` · route 미주입).
- 강등은 있다(최소): `failure ≥ 3 AND failure > success` → disabled(`local-db.mjs:857`).
- Promotion state · 수준(Level) 개념 · 공유 표준 Procedure: 없음.

> saved workflow(Candidate) 가 존재한다는 이유로 이 계층을 구현됨으로 보지 않는다(지시 §4).

### Layer 6 — Execution : **IMPLEMENTED** (runtime 결함 · 일부 수단 부재)

- 규모: 실행 계열 약 21k LOC · 약 70 파일 · 테스트 약 10k LOC/22 spec. Local 명령 33종(DOM 8 · UIA 5 · computer 5 · target · local.data 9 …). 삼중 allowlist · COMMIT 클릭 거부 · password 차단 · 사용자 입력 감지 takeover.
- Deterministic First 계약(`api → browser_dom → windows_uia → computer_use`, `automation-execution-contract.ts:55-60`)은 **기록용**이고 실제 수단 선택은 target 유형(windows_app→UIA, 그 밖→DOM)이다.
- **없는 수단**: WebMCP(코드 0) · API 실행 경로(계약 축만 있음) · 웹 visual fallback.
- **사이트 지식이 코드 상수**: 사이트 registry 가 TS·agent·확장 3곳 중복, health.kr EntryPoint 4 · Adapter 테이블 frozen.
- **현행 runtime 결함(이 계층 소속 — 전체 설계와 분리)**:

| 결함 | 상태 |
|---|---|
| 명령 수령 5s 고정 polling (B run 48.7s 중 44s) | d68e6a24a 코드 완료 · 실 PC 재측정 BLOCKED |
| native host → relay 단발 연결(재시도 없음) | 결함 기록만 · WO 없음 |
| 확장 새로고침 전 열린 탭에 content script 없음 → `DOM_CONTENT_UNAVAILABLE` → `site_not_ready` | 10/01 원인 확정 · 미수정 |
| resume/runId · targetHint · replay preflight | 4a1bec70e · A/B PASS · H1/C/회귀 보류 |

---

## 4. Gap 요약

| Layer | 판정 | 한 줄 |
|---|---|---|
| 1 Request/Intent | PARTIAL | 결정론 분기는 좋다. 업무 유형·입력값 개념이 없다 |
| 2 Discovery | PARTIAL (+MISALIGNED 1) | 등재 대상 안에서는 강한 모델로 시작. 처음 보는 대상은 거절 · strong 은 실패 구동 |
| 3 Assistance | PARTIAL | QUESTION/resume 기계는 READY. 원 목표 유실 · 절차/매뉴얼 질문 없음 |
| 4 Experience | **MISALIGNED** | 사용자 도움이 들어간 성공을 저장에서 제외 · 실패/교정/지표 미저장 |
| 5 Promotion | **MISSING** | 단계·조건·저가 모델 전환 없음. replay 는 승격이 아니다 |
| 6 Execution | IMPLEMENTED | 성숙. runtime 안정화 결함 3 · WebMCP/API 수단 없음 |

### 4-1. "Local RPA / Workflow Player 최적화 쪽으로 기울었는가?" — **예, 투자 면에서 기울어 있다.**

근거:
1. **코드량**: 실행 계열 약 21.3k LOC vs 학습 계열 약 0.7k LOC(workflow-candidate.ts 430 + local-db candidate 약 300) ≈ **30:1**. `experience` · `promotion` · `learning` 식별자 0건.
2. **유일한 학습 산출물의 형태**: Candidate = locator 시퀀스 + slot 템플릿 = **record & replay** 의 의미적 버전. Player 의 입력 형식이다.
3. **사용자 도움 run 제외**(§3 Layer 4) — Player 관점에서는 "깨끗한 trajectory 만 재생" 이 합리적이지만, Agent 관점에서는 가장 중요한 학습 신호를 버린다.
4. **최근 작업 흐름**: 2026-09-30~10-01 의 WO/CHECK 는 resume 버그 · polling · relay · content script 등 runtime 결함이 연속이다.
5. **EVOLUTION §25 격차가 3주째 그대로**: #2(takeover step · correction count · completion state 미기록 — correction 은 지금도 상수 0) · #3(AI 판단 층) · #7(§22 지표 측정 구조 없음).

단, **방향 자체는 원칙과 일치**한다 — AI planner 가 먼저 풀고, 성공 경로를 결정적으로 재생하며, 재생은 매 step 현재 화면으로 재검증하고, 실패 시 AI 로 돌아간다. 문제는 그 사이(무엇을 경험으로 남기고 어떻게 신뢰도를 매겨 내리는가)가 비어 있다는 것이다.

---

## 5. Experience Model — 현재 구조와의 대응 (개념만 · schema 아님)

| 개념 | 현재 대응 | 판정 | 비고 |
|---|---|---|---|
| Task / Intent (업무 유형) | 없음 — Candidate 템플릿이 대리 | MISSING | 표현이 달라도 같은 업무로 묶는 키 필요 |
| Target | 사이트/앱 registry(코드 상수) | PARTIAL | 정적. 처음 보는 대상 표현 불가 |
| Run | `local_work_runs` + `work_run_coordination` | PARTIAL | 상태뿐 · 결과/지표/수단 없음 |
| Step | `local_work_run_steps` | PARTIAL | 성공 DOM 만 · 실패 step 없음 |
| User Assistance (질문·답·교정) | 없음 | MISSING | 현재는 저장 억제 |
| Knowledge / Manual | 없음 (File Understanding 은 데이터 파일용) | MISSING | |
| Outcome | run status + LLM 완료 판정 | PARTIAL | 결정적 검증 없음 |
| Failure Pattern | 로그 failureClass · candidate failure_count | PARTIAL | run·step 에 묶이지 않음 |
| Performance Metric | 로그 durationMs · aiPlanCount | PARTIAL | 저장·집계 없음 |
| Procedure / Skill | `local_workflow_candidates` | PARTIAL | 개인 · DOM · 일반화 조건 엄격 |
| Promotion State | active/disabled 2값 | MISSING | 수준 개념 없음 |
| Experience (Task×Target 누적 관점) | 없음 | MISSING | 위 항목들의 집계 뷰 |

**재사용 가능한 기존 자산**: Local SQLite 정본 + additive migration 체계 · "cloud → local write only, read-back 없음" 불변식 · Candidate 의 semantic locator(role/name/text, 원문 값 미포함) · slot 일반화 · replay 재검증 · usage event 키 목록. 새 모델은 이것들 **위에** 얹는 것이 자연스럽다.

---

## 6. Local Knowledge vs Shared Knowledge — 현재와 충돌 지점

- 현재는 **Local 만 있다.** 서버는 상태·명령·로그만 갖는다. 공유 승격은 코드 주석으로 명시 제외됐다.
- 기존 확정 경계(웹 자동화 재정렬 트랙, 2026-09-16): "단일 실행 → 공유 workflow 자동승격 금지 · 공유는 raw data 가 아닌 구조 패턴(업무명/빈도/소요시간/절감시간/성공률)만". 원칙 D 와 일치한다.
- **긴장 1건**: "cloud 는 Local 을 read-back 하지 않는다" 불변식(PHASE 0 IR finding #4)은 Shared Experience 의 **원천 수집**과 충돌할 수 있다. 해소 방향은 read-back 이 아니라 **Local 이 정제·익명화한 요약을 명시적으로 올리는(publish) 별도 경로**다 — 이것은 신규 Cloud 저장소·동의 정책이 필요하므로 중지조건(설계 WO + 승인) 대상이다.

---

## 7. 진행 중 결함의 위치 (폐기하지 않음)

polling latency · Chrome relay 재연결 · site_not_ready(content script) · DOM 관찰 · resume/runId · targetHint 는 모두 **Layer 6 Execution/Runtime 안정화** 문제다. 필요한 작업이며 계속한다. 다만 이것들의 PASS 가 "O4O Automation Agent 완성" 을 뜻하지 않는다 — 완료 기준을 smoke PASS 개수로만 잡지 않는다(EVOLUTION §22).

---

## 8. 기존 정본과의 관계

| 문서 | 관계 |
|---|---|
| [`O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1`](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md) | **상위 철학(왜)**. 원칙 A~F 와 충돌 없음 — §6(takeover=학습 신호)·§8(사용자 간 비교)·§11(결정적 runtime)·§12(초기 비용 허용)·§14(사전 정의 금지)·§17(단계적 자동화)이 A·C·D·E 의 근거다. **새로 고정해야 할 것**: Strong-first 발견(A) · 사용자 도움을 경험으로 저장(B·C) · Local/Shared 경계(D) · 수준별 승격 조건(E) · 두뇌/실행 분리(F) · 개발 우선순위 판단 규칙 |
| 신규 [`O4O-AUTOMATION-AGENT-ARCHITECTURE-V1`](../baseline/O4O-AUTOMATION-AGENT-ARCHITECTURE-V1.md) | **아키텍처(무엇을 어느 계층에)**. EVOLUTION 아래에 놓인다. DRAFT — 사용자 검토 후 ACTIVE 와 CANONICAL-INDEX 등재 |
| CHECK AUTOMATION-EXECUTION-LAYER-REALIGNMENT-V1 | Layer 6 내부의 수단 순서(Deterministic First). 유효 |
| 메모 "외부 생성 AI UI 자동화 금지"(2026-09-16 사용자 결정) | Strong Discovery Agent 는 **API 로 호출되는 모델/agent** 로 정의한다 — O4O 가 외부 AI 서비스 UI 를 조작하는 구조가 아니다 |

---

## 9. 근거 (원 코드 직접 확인분 표기 ✓)

| 주장 | 근거 |
|---|---|
| 등재 대상 없음 → chat ✓ | `apps/api-server/src/services/ai-tools/unified-request-router.ts:139-140` |
| 문서 첨부 → chat ✓ | 같은 파일 `:146` |
| OpenAI 기본 = gpt-6-astra ✓ · strong 도 같은 모델 ✓ | `apps/api-server/src/utils/ai-provider-runtime.ts:60` · `:138-141` |
| recovery tier 순서 ✓ | `automation-recovery-contract.ts:122` |
| `hasVerifiedWorkflow` 정의만 · 미주입 ✓ | `task-modality-router.ts:46,126` (호출처 0) |
| `userCorrectionCount: 0` 상수 ✓ | `work-agent-contract.ts:585` |
| content script 없으면 DOM_CONTENT_UNAVAILABLE · executeScript 없음 ✓ | `tools/o4o-chrome-extension/src/service-worker.js:88-113` |
| resume 시 답변문 = goal.request | `work-agent-runtime.ts:475` |
| resumed/hint run Candidate skipped | `work-agent-runtime.ts:552-583` (`:558-559`) |
| Candidate 일반화 조건 · replayPreflight | `workflow-candidate.ts:224-257` · `:383-408` |
| Candidate 공유 승격 제외 · disable 규칙 | `tools/o4o-local-agent/src/local-db.mjs:263` · `:857-859` |
| SITE_UNRESOLVED | `work-agent-runtime.ts:489` |
| loop 예산 | `work-agent-contract.ts:496-508` |
| Deterministic First 순서 | `automation-execution-contract.ts:55-60` |
| WebMCP 코드 0 | repo grep `webmcp\|navigator.modelContext` (docs·주석 외 0) |

---

## 10. 다음 개발 순서 제안 (구현 WO 아님)

| 순 | 항목 | 이유 · 선행관계 |
|---|---|---|
| 0 | **Execution Runtime 안정화 — 진행 중인 것만 마감** (polling 재측정 · content script 재주입/안내 · relay 재시도) | 실 PC 에서 run 이 안정적으로 돌아야 어떤 경험도 쌓인다. **확대 금지** — 새 실행 수단·최적화 추가 안 함 |
| 1 | **Experience Model 설계** (개념 → Local 최소 기록 단위 계약) | 2~6 이 전부 "무엇이 기록되는가" 에 의존한다. 지금 이 순간에도 사용자 도움 경험이 버려지고 있다 |
| 2 | **User Assistance 보강** (재개 시 원 목표 보존 · 답변/교정을 Experience 로 저장 · 절차/메뉴 질문 유형) | 1 의 첫 소비자. 기계는 이미 있어 작은 변경으로 효과가 크다 |
| 3 | **Strong Discovery Agent 정책** (처음 보는 대상의 진입 정책 · discovery 예산 · 웹 관찰 수단) | 1·2 없이 열면 비싼 탐색 결과가 다시 버려진다 |
| 4 | **Manual / Knowledge ingestion** | File Understanding 재사용 가능. PC 프로그램 확대(웹 이후)의 전제 |
| 5 | **Promotion Engine** | 1 의 데이터가 일정량 쌓여야 조건을 정할 수 있다 |
| 6 | **Shared Experience aggregation** | 동의·익명화 정책 + 신규 Cloud 저장소(중지조건) + 다수 사용자 데이터 필요 — 가장 나중 |

**다음에 실제로 실행할 작업 1개**: `WO-O4O-AUTOMATION-EXPERIENCE-MODEL-DESIGN-V1` — **설계·계약 문서 전용**(코드·schema·migration 0). 범위: §5 개념 단위 중 Local 에 먼저 기록할 최소 집합(Run Outcome · Assistance · Metric · 실행 수단) 정의, 사용자 도움 run 을 경험으로 남기는 규칙(현행 skip 정책의 대체안), Local/Shared 경계 필드 분류, 기존 Local SQLite·Candidate 와의 관계. 0번(진행 중 runtime 마감)은 사용자 실 PC 조작만 남아 있어 병행 가능하다.

---

*문서 정합: 기준 문서 drift 발견 1건 — EVOLUTION-PRINCIPLES §25 는 2026-09-12 시점 정렬표로 현행과 차이가 있다(#2 correction 미기록은 여전, PHASE 1·2 resume/Candidate 는 그 뒤 구현). 본문 수정은 §16-4 금지 범위이므로 보고만 한다 — 신규 아키텍처 문서 ACTIVE 전환 시 함께 정리하는 별도 WO 제안.*
