# WO-O4O-WEB-AUTOMATION-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1

> **성격**: 기존 자동화 기반의 **수정·보완(재정렬)** — 새 방향 신설이 아니다. 이미 배선된 실행 근육(Browser DOM · Work Agent · Recovery · Local SQLite) 위에 **"기억(재사용)"과 "대화(재개)"** 를 얹는다.
> **선행 조사**: 이 WO 는 origin/main(`ccbd16be4`) 실 코드 조사 결론에서 도출됐다 — 웹 실행계층은 완비(8-verb DOM + 삼중 allowlist + native host + 런타임 배선), 단 ① same-run 사용자질문 resume 부재 ② 성공 trajectory 저장·결정론적 재생 부재 ③ 업무메뉴/추천 부재. 이 WO 는 ①②만 다룬다.
> **핸드오프 전용** — 명시 지시 전에는 실행하지 않는다.
> **상위 정본**: [`O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1`](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md) — 사용자 행동은 학습 자료 · 완전 자동화가 아닌 시간 절감 · **사이트별 업무 사전 정의 금지**.

---

## 1. 목적

첫 성공은 AI 탐색으로 풀되, **그 성공을 두 번째부터 다시 처음부터 풀지 않도록** 만든다. 두 축이다.

- **PHASE 1 — Same-run 사용자 유도 재개**: AI 가 막히면 run 을 종료(takeover)하지 않고 **일시정지**한다. 사용자가 텍스트/이미지/메뉴 위치로 답하면 **현재 화면을 재관찰하고 같은 업무를 이어간다.** 사용자 도움은 실패가 아니라 Workflow 구축의 정상 입력이다.
- **PHASE 2 — Workflow Candidate & Deterministic Replay**: 첫 성공 경로를 trajectory 로 남겨 **Workflow Candidate** 로 만들고, 반복 실행 시 **결정론적 재생(빠른 실행, AI 최소 호출)** 한다. 재생 중 실패하면 AI self-healing 으로 재개입한다.

핵심 원칙: **"처음 보는 업무 → AI 적극 + 사용자 도움 / 성공 경로 발견 → Workflow / 반복 → 결정론적 빠른 실행 / 변경·실패 → AI 재개입."**

## 2. 배경

- 현재 실행 상태는 **request-scoped 전용**이며, `automation_jobs` 등에 Goal·step·observation·workflow engine 을 만들지 않도록 설계가 **명시적으로 금지**한다([work-agent-contract.ts:28-34](../../apps/api-server/src/services/ai-tools/work-agent-contract.ts#L28-L34)). 질문이 필요하면 run 을 끝내고([work-agent-runtime.ts:353](../../apps/api-server/src/services/ai-tools/work-agent-runtime.ts#L353)) `recoveryHint` 를 실은 **새 run** 으로만 재진입한다.
- 성공한 국면은 `improvementCandidate` **boolean 신호**로만 usage 로그에 남고([automation-recovery-contract.ts:242-247](../../apps/api-server/src/services/ai-tools/automation-recovery-contract.ts#L242-L247)), 저장·재생·승격되지 않는다.
- 따라서 이 WO 는 위 "request-scoped 전용 / 저장 없음" 계약을 **제한적으로 완화**하는 것을 전제로 한다 — 이는 설계 계약 변경 + 신규 저장소이므로 **중지 조건(§4·§7)** 이고, PHASE 0 preflight 승인 없이는 구현하지 않는다.
- batch(≤4) + 조건부 재관찰은 이미 구현돼 있으므로([work-agent-runtime.ts:801-823](../../apps/api-server/src/services/ai-tools/work-agent-runtime.ts#L801-L823)) 속도 개선의 본질은 batch 확대가 아니라 **결정론적 재생(PHASE 2)** 이다.

## 3. 범위

**In scope**

PHASE 1 — Same-run resume
1. AI 가 사용자 도움이 필요할 때 run 을 **일시정지 상태**로 보존(종료가 아님)하고, 사용자에게 **막힌 원인 + 필요한 것 하나만** 구체적으로 질문한다(내부 용어 노출 금지).
2. 사용자 답변을 **텍스트 + 이미지 + 화면/메뉴 위치 설명** 으로 받아, 낡은 관찰(stale observation)을 폐기 → **현재 화면 재관찰** → 같은 run 을 이어간다.
3. 이미지 답변은 기존 Visual CU 규칙(§4-1)을 그대로 계승 — **파일 저장 X / DB 저장 X / 장기 로그 X**, 요청 메모리 안에서만.

PHASE 2 — Workflow Candidate & Replay
4. 첫 성공 run 의 경로(타깃 · 액션 시퀀스 · 사용자 힌트로 메운 결정지점)를 **trajectory** 로 저장하고 **Workflow Candidate(개인 범위)** 로 만든다.
5. 같은 업무 재요청 시 후보를 **결정론적으로 재생**하되, 각 스텝은 재생 전 **현재 화면과 대조(재검증)** 한다 — 맹목 재생 금지. 불일치·실패 시 **AI self-healing(재개입)** 으로 전환한다.
6. `improvementCandidate` 신호를 실제 Workflow Candidate 갱신에 연결한다(반복·사용자 수정이 후보를 다듬는다).

**Out of scope (이 WO 에서 만들지 않음 — 후속 WO)**
- PHASE 3~5: 범용 Local Data Source 연결(파일 탐색기·Excel·컬럼 매핑·SQLite import) + 약학정보원 실제 Workflow + 병원 Local Data 결합. → **다음 WO**.
- PHASE 6~7: 내 업무 메뉴 UI · 활용 게시판 · 매장/직역 공통 Workflow · 추천 업무 · 구조적 패턴 공유(업무명/빈도/소요시간/절감시간/성공률).
- PC 프로그램 자동화 확대 · Hermes/cua-driver · UFO² 직접 도입(웹 안정화 이후).
- **단일 실행의 공유 workflow 자동 승격** — 이 WO 의 Workflow 는 **개인 범위 전용**. 매장/직역 공유는 별도 검증 트랙.
- 새 tool verb 신설 · Safety/Risk/capability/권한/tool contract 완화 · 새 provider stack.

## 4. 단계

0. **PHASE 0 — Preflight IR (구현 전 필수 · 승인 게이트)** — 아래 설계 결정을 조사·확정하고 승인받기 전에는 코드 변경 0. 산출: `IR-O4O-WEB-AUTOMATION-RESUME-AND-WORKFLOW-STORE-PREFLIGHT-V1`.
   - **저장 위치 결정(핵심)**: pending-run 상태와 trajectory/Workflow Candidate 를 어디에 둘지 — 권고 방향은 **민감 데이터를 사용자 PC(Local SQLite)에 두는 것**(raw workflow·관찰·이미지는 cloud 로 올리지 않음 → 데이터 소유권 + "raw data 공유 안 함" 원칙 부합, cloud migration 회피). 단 서버측 run 을 두 요청에 걸쳐 재개하려면 cloud 조정 상태가 필요할 수 있음 — 최소 TTL 방식/무저장 대안을 비교해 확정한다.
   - **계약 완화 범위**: `work-agent-contract.ts:28-34` 의 "저장 금지" 를 어디까지, 어떤 문장으로 완화할지(정본 문구 제안).
   - **신규 스키마(있다면)**: Local SQLite 테이블 or cloud 테이블 초안. cloud 테이블이면 **DB schema·migration = 사용자 명시 승인 필수**(CLAUDE.md 중지 조건).
   - trajectory 데이터 형상: 무엇을 저장하고(액션 시퀀스·결정지점) **무엇을 저장하지 않는지**(비밀번호·토큰·개인정보·이미지 원본).
1. **PHASE 1 구현** — pause/resume 배선 + 재관찰 + 이미지 답변 처리. 기존 chat 입력·Work Agent 상태 영역 재사용("Resume Studio" 류 신설 금지).
2. **PHASE 1 검증** — 단위/통합 테스트(planner 주입 하네스로 결정적 증명) + 실 smoke 는 별도 표기.
3. **PHASE 2 구현** — trajectory 캡처 → Candidate → 재검증형 결정론적 재생 → self-healing 전환.
4. **PHASE 2 검증** — "첫 실행=AI, 두 번째=재생, 변경 시=재개입"이 실제로 일어나는지. AI plan 호출 수가 재생에서 유의미하게 줄어드는지 계측.
5. **CHECK 작성** — `CHECK-O4O-WEB-AUTOMATION-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1` + 리비전 + 재현.

## 5. 검증 · 성공 기준

- **PHASE 1**: AI 가 막힌 뒤 run 이 **종료되지 않고** 사용자 답변(텍스트/이미지)으로 **같은 run** 이 이어져 목표를 전진시킨다. "처음부터 AI 가 다 알아냄"은 기준이 아니다 — **질문 1~2회로 이어서 성공**이 정상 PASS.
- **PHASE 2**: 동일 업무 2회차가 **결정론적 재생**으로 수행되고 AI plan 호출 수가 1회차 대비 감소한다. 화면이 바뀌면 재검증에서 걸러져 **self-healing 으로 재개입**한다(맹목 재생으로 오작동하지 않는다).
- 반복·사용자 수정으로 Workflow Candidate 가 다듬어지는지(개선 후보 신호 → 후보 갱신 연결).
- **안전 불변**: 재생/재개가 Safety·Risk 를 낮추지 않는다. never-escalate 경계(credential · COMMIT · **조제보고·마약류 관리센터 전송·심평원/공단/정부 제출·청구·결제·전자서명·외부 전송**)는 재생 대상이라도 **환경 불문 자동화 금지 → 사용자 직접**.
- 로그/저장 whitelist 밖 데이터(채팅 원문·힌트 전문·이미지·비밀번호/토큰·개인정보) 누출 0건.
- 각 항목은 **실측했을 때만 PASS**. 못 돌린 항목은 사유와 함께 PENDING.

## 6. 산출물

- `docs/investigations/IR-O4O-WEB-AUTOMATION-RESUME-AND-WORKFLOW-STORE-PREFLIGHT-V1.md` — 저장 위치·계약 완화·스키마 결정(승인 게이트).
- PHASE 1·2 코드(기존 `apps/api-server/src/services/ai-tools/*` · `tools/o4o-local-agent/src/*` 컨벤션 준수, 신규 tool verb 없이).
- `docs/checks/CHECK-O4O-WEB-AUTOMATION-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1.md`.
- `memory/project-o4o-local-work-agent-track.md` 한 줄 갱신.
- 완료 보고에 `문서 정합` 한 줄(§16-5).

## 7. 금지 · 안전 경계

- **PHASE 0 승인 전 코드 변경 0.** 저장소 신설·계약 완화·DB schema/migration 은 사용자 명시 승인 필수(중지 조건).
- **사이트별 업무 사전 정의 금지** — Workflow Candidate 는 사용자 행동·성공에서 **학습**되어야 하며, 사람이 미리 써넣은 스텝/셀렉터를 심지 않는다. 재생은 항상 **현재 화면 재검증**을 거친다.
- **단일 실행 → 공유 workflow 자동 승격 금지.** 개인 범위 전용.
- 웹(DOM) 표면 우선. UIA/PC 재생·확대는 이 WO 밖.
- 내부 용어(planner·RuntimeId·tier·stale observation)를 사용자에게 노출하지 않는다.
- 이미지 답변은 §4-1 계승(파일/DB/장기로그 X). 실 환자·개인정보 미사용. 실 DB host·password·계정·provider 키를 문서·로그·커밋에 남기지 않는다.
- Git: 최신 origin/main · path-specific stage · 다른 세션 WIP 불가침 · `--force` 금지.

---

*작성: 2026-09-16 · 상태: DRAFT (핸드오프 · PHASE 0 승인 대기)*
