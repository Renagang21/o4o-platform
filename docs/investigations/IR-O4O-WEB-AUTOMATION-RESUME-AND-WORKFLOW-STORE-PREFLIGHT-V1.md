# IR-O4O-WEB-AUTOMATION-RESUME-AND-WORKFLOW-STORE-PREFLIGHT-V1

> **성격**: PHASE 0 Preflight 조사·설계 보고서 (Investigation Report). **코드 변경 없음.**
> **상위 정본**: `docs/baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md`
> **선행 WO**: `docs/work-orders/WO-O4O-WEB-AUTOMATION-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1.md` (PHASE 1+2 집행 요청서, PHASE 0 승인 대기)
> **관련 트랙 메모리**: `project-o4o-web-automation-first-realignment-track` · `project-o4o-local-work-agent-track` · `project-o4o-local-data-sqlite-track`
> **작성일**: 2026-09-16 · **상태**: DRAFT · **승인 게이트**: §10 (본 IR 승인 전 코드 0)

---

## 1. 목적 · 범위

WO 의 PHASE 1(same-run 사용자 유도 재개) + PHASE 2(성공 trajectory 저장 → Workflow Candidate → 결정론적 재생)를 구현하기 전에, **저장 위치와 재개 조정(coordination) 방식을 실제 현재 코드 구조 위에서 확정**하기 위한 조사·설계다.

- **In scope**: (a) 현재 Cloud/HTTP work-agent 표면 · Local Agent command/device 상관 · Local SQLite 구조의 코드-진실 확인, (b) same-run 재개와 trajectory/Candidate 저장을 위한 **최소안 2~3개 비교 + 1개 권고**, (c) QUESTION vs TAKEOVER 상태 분리 설계, (d) Workflow Candidate 의 semantic 저장 형태 설계, (e) 승인이 필요한 신규 항목(스키마 draft · 계약 완화 범위)의 명시.
- **Out of scope**: 코드 변경 · 실제 마이그레이션 적용 · 새 tool verb 구현 · PHASE 3~7 · PC(Windows) 확대. 본 IR 은 **승인 게이트**이며, 승인 후에만 WO 의 PHASE 1 코드로 넘어간다.

---

## 2. 고정 개념 (사용자 승인 2026-09-16 — 설계가 반드시 준수)

| # | 개념 | 정의 |
|---|---|---|
| C1 | **same-run** | 동일 **logical Work Run**. 동일 HTTP 요청이 아니다. 사용자 답변까지 수십 초~수분 소요, Cloud Run 인스턴스 교체 가능 → 하나의 요청/서버 메모리를 붙잡는 구조 금지. |
| C2 | **QUESTION ≠ TAKEOVER** | `QUESTION`(=`waiting_for_user`): run 살아 있음 · 답 대기 · **재개 가능**. `TAKEOVER`: 자동화 **종료** · 사용자가 직접 이어 처리 · 자동화 재개 불가. 현재는 둘이 같은 방식으로 run 을 끝낸다 — 분리가 핵심 계약. |
| C3 | **Local-first** | 정본(full run state · semantic trajectory · Workflow Candidate · 사용자 variation)은 사용자 PC **Local SQLite**. Cloud 는 **재개 연결용 최소 coordination 메타만**. |
| C4 | **Cloud 금지 저장물** | 화면 캡처 · DOM 전문 · 사용자 힌트 전문 · 입력 업무 데이터 · 환자/처방 · Excel 원자료 · credential 은 cloud 에 저장하지 않는다. |
| C5 | **Candidate = semantic** | Workflow Candidate 는 좌표(x/y)·`elementRef` raw replay 가 아니라 target · semantic goal · action kind · semantic locator(role/name/label/text) · state transition · checkpoint · 사용자 힌트 decision point 로 저장·일반화. |

---

## 3. 현재 구조 코드-진실 요약

### 3-1. Cloud/HTTP work-agent 표면

- **진입점**: `POST /work-agent/run` — [ai-proxy.routes.ts:254](apps/api-server/src/routes/ai-proxy.routes.ts#L254). 요청 body = `{ request, targetHint?, image?, recoveryHint? }` (:258-285). **`runId`/`goalId`/`sessionId` 입력을 받지 않는다.**
- **goalId**: 매 호출 `g_${Date.now().toString(36)}` 로 **새로 발급** — [work-agent-runtime.ts:318](apps/api-server/src/services/ai-tools/work-agent-runtime.ts#L318). 응답에 실려 나가지만(:296) **다시 입력으로 받지 않는다** → 각 호출은 완전 독립.
- **상태 수명**: `createWorkAgentState` 가 매 호출 fresh in-memory 객체 생성([work-agent-contract.ts:516](apps/api-server/src/services/ai-tools/work-agent-contract.ts#L516)), 요청 종료 시 폐기. 교차-요청 run 저장소는 **계약이 명시적으로 금지**(work-agent-contract.ts:28-34 "scheduler · executor · workflow engine · agent loop · retry 를 여기서도, 거기서도 만들지 않는다"; runtime.ts:11; ai-proxy.routes.ts:250-253). `automation_jobs` 에 기록하지 않는다.
- **needs_user 종료**: `finish()` 가 `progress==='needs_user'` 이면 `goal.status='waiting_for_user'` ([runtime.ts:353](apps/api-server/src/services/ai-tools/work-agent-runtime.ts#L353)). takeover 도 동일하게 `needs_user` 로 귀결(:364-368, :705). **QUESTION 과 TAKEOVER 가 코드상 같은 종료**로 collapse.
- **현재의 "재개"**: run 을 잇는 것이 아니라 **새 POST** 를 던지되 `recoveryHint`(자유 텍스트)만 실어 planner 프롬프트 한 줄로 사용(:155, :349, :403). 이전 loop/observation 을 복원하지 않는다 → 처음부터 새 run.

### 3-2. Device 상관 · command 왕복 (multi-instance 안전)

- **deviceId**: `local_agent_devices.id`(Postgres uuid, user별 영속, 서버 발급 random UUID). run 시작 시 `resolveTargetDevice(userId)` 로 매 요청 재조회([local-agent-service.ts:415](apps/api-server/src/services/local-agent/local-agent-service.ts#L415)). **정확히 1대 online 일 때만 ok**(>1 ambiguous, 0 offline; online=heartbeat 90s 이내).
- **command 왕복**: 서버는 소켓을 쥐지 않고 `local_agent_commands` DB row(`device_id`/`command_id` 키, TTL 20s, 결과 읽으면 `result_data=NULL` wipe)로 enqueue. agent 가 long-poll(`/heartbeat`→claim, `/result`→submit). `FOR UPDATE SKIP LOCKED` + 상태조건 UPDATE 로 **인스턴스 A 발행 / B 수신이 안전**. → **재개 조정을 얹기 좋은 검증된 DB 매개 패턴이 이미 있다.**
- **envelope**: `{ commandId, action, args, issuedAt, expiresAt }` — [local-agent-protocol.ts:488](apps/api-server/src/services/local-agent/local-agent-protocol.ts#L488). **runId/sessionId 없음.** args 는 claim 시 wipe.

### 3-3. Local SQLite (PC 정본 후보 substrate)

- **스키마 성장 방식**: hardcoded `MIGRATIONS` 배열(checked-in)로만 — [local-db.mjs:100](tools/o4o-local-agent/src/local-db.mjs#L100). **런타임 CREATE TABLE / 임의 SQL 경로 없음**(:35-36, :435). 신규 테이블 = 새 migration 을 배열에 추가(코드 반영)해야 함.
- **기존 테이블**: `local_meta`/`local_settings`/`local_mappings`/`local_imports`/`local_exports`/`local_work_state`(범용 KV, **현재 미사용**)/`local_datasets`+`local_dataset_rows`(범용 named-dataset row 저장, `data`=JSON). → run/trajectory/candidate 를 **새 실테이블** 또는 **dataset row** 로 담을 수 있음.
- **cloud 구동 write 경로**: `local.data.set_setting`(유일 write, 3키: locale/preferred_export_format/selected_source_profile)뿐 — [handlers.mjs:663](tools/o4o-local-agent/src/handlers.mjs#L663). **row 데이터 put/get/query/import/export 는 cloud 에서 구동 불가**(local CLI 전용, 사용자 콘솔). `execute_sql` 없음.
- **device 식별**: `credentials.json`{deviceId, agentCredential}(mode 0600). `local_meta.local_db_id`(로컬 생성 UUID)는 **의도적으로 cloud 미노출**(local-agent-protocol.ts:250-253).
- **.db 위치**: `agentHome()/local.db`(WAL, FK on), 재시작 간 영속.

---

## 4. 재개 문제의 본질 (왜 지금은 same-run 재개가 불가능한가)

멀티-인스턴스 가정이 코드를 **깨는** 것이 아니다 — command 왕복은 이미 DB 매개라 안전하다. 문제는 **재개할 상태가 설계상 아예 저장되지 않는다**는 것이다(§40/§41). `needs_user` 도달 시 loop 이 return 하면 observation · history · step counter · recovery tier 가 전부 폐기된다.

따라서 same-run 재개를 만들려면 **없는 것을 추가**해야 하며, 추가해야 할 것은 정확히 3가지다:

1. **logical runId**: 클라이언트가 되받아 다음 요청에 실어 보내는 **영속 식별자**. 현재 `goalId`(throwaway)를 승격하는 것이 자연스럽다.
2. **재개 조정 상태**: "이 run 이 아직 살아있나 / 만료됐나 / 어느 device 인가 / 지금 QUESTION 대기인가" 를 인스턴스 무관하게 알 수 있는 최소 메타.
3. **trajectory/candidate 저장소**: 성공 경로를 semantic 하게 적재할 곳(Local SQLite 정본).

---

## 5. 최소안 비교 (2~3안)

세 안 모두 **trajectory · Workflow Candidate 의 정본은 Local SQLite**(C3)라는 점은 공통이다. 차이는 **재개 조정 상태를 어디에 두는가**, 그리고 **재개 시 cloud 가 Local 상태를 읽어오는가**이다.

### 옵션 A — Local 정본 + Cloud 조정행 + **Cloud 가 Local run 상태를 read-back 하여 재수화(rehydrate)**

- Cloud 신규 테이블 `work_run_coordination`(runId/user/device/status/currentStep/expiresAt/version) + Local SQLite 신규 실테이블 3종. 재개 시 cloud 가 **새 `local.data.*` read verb 로 Local 의 run 상태·trajectory 를 되읽어** loop 을 재수화.
- 장점: 재개가 "가장 원래 상태에 가깝게" 복원됨.
- 단점(치명): finding #4 위반 — 현재 설계는 result 를 per-action safe whitelist 로 strip 하고 `local_db_id`/경로를 **의도적으로 cloud 미노출**한다. "cloud 가 Local run 전문을 읽는" 채널은 **존재하지 않을뿐더러 명시적 불변식과 정면 충돌**. C4(원문 미전송)와도 마찰. 구현·리스크 최대.

### 옵션 B — Local 정본 + Cloud 최소 조정행 + **재개 = 현재화면 재관찰 + planner 재-prime (read-back 없음)** 〔권고〕

- **Cloud**: 신규 테이블 `work_run_coordination` — `runId, userId, deviceId, status(running|waiting_for_user|taken_over|completed|abandoned), lastCheckpoint(작은 정수/라벨), expiresAt, candidateVersion|hash`. **raw observation·이미지·힌트·업무데이터 없음.**
- **Local SQLite**: 신규 checked-in migration 으로 `work_runs` · `work_run_steps`(semantic trajectory) · `workflow_candidates` 실테이블. run 진행 중 agent 가 **신규 guarded write verb**(`local.data.append_run_step` 류, PC 로만 씀)로 append. **정본·전문은 여기에만.**
- **재개 흐름**: QUESTION 도달 → cloud 조정행 `status=waiting_for_user` + runId·question 을 클라이언트로 반환 → 사용자 답변 → 클라이언트가 **runId + 답변**으로 재-POST → 아무 인스턴스나 조정행 조회(DB 매개, C1 충족) → 같은 device still-online 확인 → **stale observation 폐기 → 현재 화면 재관찰 → planner 를 (goal + 사용자 답변 + lastCheckpoint)로 재-prime**(기존 recoveryHint 메커니즘을 runId 에 묶어 확장) → 같은 runId trajectory 에 이어서 append.
- 장점: C1~C5 전부 충족. **cloud 가 Local 을 read-back 하지 않음** → finding #4 불변식과 충돌 없음. "맹목 재생 금지 · 항상 현재화면 재검증" 원칙과 오히려 정합. 검증된 패턴 재사용(DB 매개 큐 · recoveryProUmpting). Cloud 신규는 **조정행 1테이블뿐**.
- 단점: 재개가 이전 loop 을 그대로 복원하지 않고 재관찰한다(느릴 수 있음) — 그러나 이는 안전 원칙상 **바람직한 성질**이다.

### 옵션 C — Cloud 신규 테이블 0 + 조정 상태도 Local

- Cloud 는 기존 `local_agent_devices` 만 사용, 신규 영속 상태 0. runId 는 발급하되 권위 상태는 Local `work_runs.status` 에만. 재개 = 클라이언트가 runId 지참 → cloud 가 device 해석 → "run X 재개" command 발행 → agent 가 자기 Local 을 읽어 잇는다.
- 장점: cloud 저장 최소화 극대(C4 가장 순수).
- 단점: 사용자가 **명시적으로 cloud 가 status/expiresAt 를 가져도 된다**고 허용(C3)했는데 그보다 더 금욕적. run 만료 GC · "재개 가능 여부" 가시성 · 답변 시 device offline 판정이 cloud 에서 안 보여 취약. 조정 상태가 device online 에 전적으로 의존.

### 비교표

| 축 | A (read-back) | **B (권고)** | C (cloud 0) |
|---|---|---|---|
| trajectory/candidate 정본 | Local | **Local** | Local |
| cloud 조정 상태 | 조정행 1 + **read-back 채널** | **조정행 1, read-back 없음** | 없음 |
| finding #4 불변식 충돌 | **충돌(치명)** | **없음** | 없음 |
| C1(logical run) | 충족 | **충족** | 충족(취약) |
| C3(최소 coordination) | 초과 | **정확히 부합** | 미달(더 금욕) |
| 재개 정확도 | 높음 | 재관찰(안전) | 재관찰(agent 주도) |
| 신규 cloud 테이블 | 1 | **1** | 0 |
| 신규 local verb | read+write | **write append + 조정 sync** | write + run-resume 명령 |
| 구현/리스크 | 최대 | **중** | 중(운영 취약) |

---

## 6. 권고안 — 옵션 B

**옵션 B 를 권고한다.** 근거:

1. **불변식 보존**: cloud 가 Local run 전문을 읽지 않으므로 finding #4(safe-whitelist strip · `local_db_id`/경로 미노출)과 충돌하지 않는다. 옵션 A 는 이 불변식을 깨야 하므로 채택 불가.
2. **C3 정확 부합**: cloud 에는 `runId/device/status/expiresAt/version` 만. 정본·전문은 Local. 사용자가 그은 경계와 1:1.
3. **안전 원칙 정합**: 재개 시 이전 관찰 복원이 아니라 **현재화면 재관찰**이므로 "맹목 재생 금지"(트랙 불변식)와 방향이 같다.
4. **검증된 패턴 재사용**: 재개 조정은 이미 multi-instance-safe 한 `local_agent_commands` DB 매개 모델을 미러링; 재개 prime 은 기존 `recoveryHint` 를 runId 에 묶어 확장 — 새 실행 엔진을 만들지 않는다(계약 정신 유지).
5. **cloud 저장 최소**: 신규 cloud 영속물은 조정행 1테이블. 옵션 C 보다 운영 가시성(만료·재개가능·device)이 낫고, 사용자가 허용한 범위 안.

---

## 7. QUESTION vs TAKEOVER 상태 설계 (C2)

현재 `finish()`/`takeover()` 가 모두 `needs_user`→`waiting_for_user` 로 귀결(§3-1)하는 것을 **두 갈래로 분기**한다. (설계만; 코드는 승인 후.)

| | QUESTION | TAKEOVER |
|---|---|---|
| 의미 | run 살아있음 · 답 대기 · 재개 가능 | 자동화 종료 · 사용자가 직접 처리 |
| cloud status | `waiting_for_user` | `taken_over`(신규) |
| 반환 | runId + 구체 질문(막힌 원인 + 필요한 것 하나) | 인계 사유 + 사용자 직접 안내, runId 재개 불가 |
| 유발 | 진전 없음 · 결정지점 · 사용자만 아는 정보(메뉴 위치 등) | 자동화 불가 · risk 과다 · **never-escalate 클래스** |
| 재개 | 같은 runId 로 §5-B 흐름 | 없음(새 run 은 사용자 재요청 시) |

- **분기 지점**: 현재 `decideRecovery` 의 `user_assistance` tier([automation-recovery-contract.ts:122-204](apps/api-server/src/services/ai-tools/automation-recovery-contract.ts#L122))가 단일 종료로 흐르는 것을, **답변으로 해소 가능 → QUESTION / 자동화 불가·never-escalate → TAKEOVER** 로 나눈다.
- **never-escalate 불변**: 조제보고·마약류 전송·심평원/공단/정부 제출·청구·결제·전자서명·외부 전송은 **항상 TAKEOVER**(재생/재개 대상이라도 사용자 직접). riskLevel `REVIEW_REQUIRED`/`COMMIT` 도 TAKEOVER 편향.

---

## 8. Workflow Candidate — semantic 저장 형태 (C5)

`work_run_steps`(성공 trajectory)와 `workflow_candidates`(승격 후보)는 **좌표/elementRef 스냅샷을 재생 단위로 저장하지 않는다.** step 당 semantic 필드(draft):

- `target`(siteId + 논리 화면), `semanticGoal`(이 step 이 이루려는 것)
- `actionKind`(get_context/inspect/find/read_text/read_table/set_input/select_option/click 중)
- `semanticLocator`(role/name/label/text — CSS/XPath/JS 금지, 기존 elementRef+snapshotId 계약 유지)
- `expectedStateTransition`(이 action 후 예상 화면 변화)
- `checkpoint`(재생 시 반드시 재검증할 술어)
- `decisionPoint?`(사용자 힌트로 푼 분기; 힌트 **전문 아님**, "무엇을 물어 무엇으로 갈렸는가" 구조만)

**재생 규칙**: 항상 현재 DOM 에서 semanticLocator 재해석 → checkpoint 재검증 → 실패 시 self-healing(role/name/text 재-find) → 그래도 불가면 **QUESTION**. UI 가 조금 달라져도 관용. **개인 범위 전용, 단일 성공→공유 workflow 자동 승격 금지.**

---

## 9. 승인이 필요한 신규 항목 (DRAFT — 구현 아님)

### 9-1. Cloud(Production Postgres) 신규 테이블 — **STOP 조건**

`work_run_coordination`(안): `run_id(pk)`, `user_id`, `device_id`, `status`, `last_checkpoint`, `candidate_version`, `expires_at`, `created_at`, `updated_at`. **원문 데이터 컬럼 없음.** → CLAUDE.md 중지조건(DB schema·migration). **마이그레이션은 CI/CD 자동 적용 원칙**([PRODUCTION-MIGRATION-STANDARD]) — 수동 적용 금지, 명시 승인 필요.

### 9-2. Local SQLite 신규 migration — 추가적·로컬(그러나 승인 대상)

`MIGRATIONS` 에 checked-in 항목 추가: `work_runs` · `work_run_steps` · `workflow_candidates`(§8 필드). 사용자 PC 로컬 DB 라 production Postgres 보다 리스크는 낮으나, 스키마 결정이므로 승인 목록에 포함.

### 9-3. 신규 `local.data.*` verb (guarded)

`append_run_step`(PC 로 write) · run/candidate 조회(사용자 콘솔·재생용). **기존 3키 write allowlist 확장** — 값 스키마·크기 가드 필수, cloud 로의 원문 read-back verb 는 만들지 않는다(옵션 B).

### 9-4. 계약(§40/§41) 완화 범위

`work-agent-contract.ts:28-34` 의 "요청 안에서만 산다"를 **runId + coordination 행 + Local trajectory 로 한정 완화**. 완화 대상이 아닌 것: scheduler/queue/workflow-engine 신설 금지, `automation_jobs` 사용 금지, cloud 원문 저장 금지는 **그대로 유지**. (완화는 "재개 조정 + Local 정본"에 국한.)

### 9-5. envelope/입력 확장

`POST /work-agent/run` 입력에 `runId?` 수용, envelope/args 에 runId 전달(§3-2 의 commandId 상관은 유지). goalId → 영속 runId 승격.

---

## 10. 승인 게이트 · 다음 단계

- 본 IR 의 **§6 권고(옵션 B)** 와 **§9 신규 항목**(특히 9-1 production 테이블 · 9-4 계약 완화)은 **STOP 조건**이다. 사용자 승인 전 코드 0.
- 승인 시 순서: (1) 계약 완화 범위 확정 → (2) Local SQLite migration + cloud coordination 테이블 draft 확정 → (3) WO PHASE 1(QUESTION/TAKEOVER 분기 + runId 재개) → (4) WO PHASE 2(semantic trajectory + Candidate + 재생).
- 승인 항목(사용자 판단 요청): ① 옵션 B 채택 여부, ② `work_run_coordination` 컬럼안, ③ Local SQLite 3테이블안, ④ `local.data.*` write verb 확장 범위, ⑤ 계약 완화 문구 범위.

---

## 11. 금지 · 안전 경계

- cloud 저장 금지물(C4) 불변. never-escalate 클래스는 항상 TAKEOVER(§7). 사이트별 업무 사전 정의 금지 — Candidate 는 사용자 성공에서 학습, 재생은 항상 현재화면 재검증(맹목 재생 금지). 단일 성공→공유 workflow 자동 승격 금지. 이미지 답변=§4-1(파일/DB/장기로그 X). 실 환자·개인정보·credential 문서/로그/커밋 금지.
- 본 IR 은 **조사·설계 전용** — 코드·마이그레이션·verb 구현 없음.

---

## 12. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건 — 본 IR 은 신규 조사 산출물이며 기준 문서(baseline/architecture/rules)를 수정하지 않는다.
