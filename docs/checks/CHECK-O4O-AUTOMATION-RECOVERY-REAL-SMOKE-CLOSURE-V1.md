# CHECK-O4O-AUTOMATION-RECOVERY-REAL-SMOKE-CLOSURE-V1

> **대상 WO**: [WO-O4O-AUTOMATION-RECOVERY-REAL-SMOKE-CLOSURE-V1](../work-orders/WO-O4O-AUTOMATION-RECOVERY-REAL-SMOKE-CLOSURE-V1.md)
> **선행 WO**: `WO-O4O-AUTOMATION-FAILURE-ESCALATION-AND-USER-GUIDED-RECOVERY-V0` = `IMPLEMENTED / DEPLOYED / REAL-SMOKE-PENDING` (코드 커밋 `5d6e3bf03`).
> **판정(현재)**: **BLOCKED** — 실 smoke 3종 미실행(실행 전제 미충족). CLOSURE 닫지 않음.
> **census 기준**: 최신 `origin/main` `5e08e23ef`.

---

## 0. 이 CHECK 의 성격

이 문서는 세 가지를 기록한다. (1) 최신 main 기준 복구 계층 재census 와 Agent 테스트 green 확인(§1 전제), (2) census 중 발견한 **main 의 stale 테스트 1건 최소 수정**, (3) 실 smoke 3종의 **BLOCKED 사유와 재현 방법**. 실 화면·실 모델·실 사용자 힌트 smoke 는 **실행하지 못했으므로 PASS 로 적지 않는다**(CLAUDE.md 검증·보고 원칙, 선행 CHECK §21 방식).

## 1. 최신 main 재census (§1) — PASS

- HEAD 를 clean fast-forward 로 `origin/main` `5e08e23ef` 에 맞춤. 선행 WO 코드 `5d6e3bf03` 및 문서 통합 커밋 `dc9fe66ba` 모두 `origin/main` 에 포함(브랜치는 origin/main 대비 behind 2·ahead 0, 앞선 2 커밋은 이 WO 와 무관 — migration 정렬 IR·Neture 대표 홈).
- 복구 계층 파일 4종 존재 확인(최신 main):
  - `apps/api-server/src/services/ai-tools/automation-recovery-contract.ts` (339 lines)
  - `apps/api-server/src/services/ai-tools/work-agent-runtime.ts` (818 lines)
  - `apps/api-server/src/utils/ai-provider-runtime.ts`
  - `apps/api-server/src/routes/ai-proxy.routes.ts`
- 상태 팩토리 `createWorkAgentState`(`work-agent-contract.ts:430`)가 `recovery: createRecoveryState()` 를 포함 — 복구 계층 설계대로.

## 2. Agent 테스트 green (§1) — PASS (최소 수정 1건 포함)

- 실행: `npx jest`(이 저장소 러너는 Jest·`jest.config.cjs`. vitest 아님).
- 대상 4 스위트 결과(최종): **46 tests / 46 passed / 0 failed**.
  - `automation-recovery.spec.ts` — PASS
  - `work-agent-recovery-runtime.spec.ts` — PASS
  - `work-agent-llm-closure.spec.ts` — PASS
  - `work-agent.spec.ts` — PASS(수정 후, 아래 §3)

## 3. census 중 발견·수정한 결함 (§14 최소 수정) — 1건

- **증상**: 최신 main 에서 `work-agent.spec.ts:402` 실패. 이 boundary 테스트는 `createWorkAgentState()` 반환 객체의 키 목록을 하드코딩 비교하는데, 복구 계층(`5d6e3bf03`)이 상태에 `recovery` 키를 **의도적으로 추가**했으나 이 assertion 배열이 갱신되지 않아 stale.
- **성격**: 제품 런타임 결함이 아니라 **stale 테스트 단언**. main 에 이미 존재하던 깨진 테스트(내가 fast-forward 직후 최초 실행에서 재현). 복구 계층이 만든 broken-window.
- **수정**: 기대 키 배열에 `'recovery'` 1개 추가(테스트 전용 1줄). 기능·계약·tier·provider 무변경 → §14 금지 항목 저촉 없음.
- **검증**: `work-agent.spec` 재실행 14/14 PASS.

## 4. 실 smoke 3종 (§3·§4) — 전부 BLOCKED (실행 전제 미충족)

이 세션은 **비대화형 dev worktree** 로, 부록 A 가 명시한 실행 loop(`O4O 채팅/AI proxy → 서버측 runWorkAgent → paired Local Agent(loopback 127.0.0.1:47821) → UIA → Windows 앱`)를 구동하지 못한다. 전제 probe 결과(사실):

| 전제 | 결과 |
|---|---|
| paired Local Agent (loopback 47821) | **미기동** (listener 없음) |
| API 서버 runWorkAgent host (3000/4000/8080) | **미기동** (listener 없음) |
| Doctors 창 | **실행 중** (`Doctors.exe` PID 20640) |
| 실 provider 키(프로덕션 Gemini) | 이 worktree env 에 **없음** |
| Doctors 환경 A/B/C 판별 | **미확인** → `BLOCKED_ENVIRONMENT_NOT_VERIFIED` |

- **smoke 1 (브라우저 실 복구)** — **BLOCKED**. 정상→strong 전환·다른 경로/인계를 실제 모델·실 provider 로 관찰해야 하나 API 서버·provider 키 부재.
- **smoke 2 (Windows·Doctors)** — **BLOCKED**. Doctors 창은 떠 있으나, 이를 *구동할* 서버측 runWorkAgent·paired Agent·provider 키가 없다. 이 Claude 세션이 UIA/playwright 로 직접 Doctors 를 조작하는 것은 **제품(Goal-Driven Work Agent)이 아니라 사람이 대신 조작**하는 것이라 `runWorkAgent`/`decideRecovery`/strong 에스컬레이션/사용자 힌트 복구에 대한 증거가 0 → 금지(증거 조작). 또한 Doctors 환경 A/B/C 미확인.
- **smoke 3 (사용자 유도 복구·★핵심)** — **BLOCKED**. 실 실패→구체 질문→힌트 주입→stale 폐기·재관찰·재계획 흐름은 살아 있는 loop 안에서만 관찰 가능.

> **판정 원칙(부록 A)**: 환경 확인 불가·paired Agent/API/provider 키 미비 등 **실행 전제 미충족은 제품 실패가 아니라 BLOCKED**. **BLOCKED 이면 CLOSURE 를 닫지 않는다.**

## 5. 로그 whitelist (§4-5) — 코드 정적 확인만 (실 로그 미발생)

- `WORK_AGENT_USAGE_KEYS`(`work-agent-contract.ts:443`)가 10 기본 + 6 복구키(`failureClass·recoveryTier·recoveryMethod·recoveryAttempt·recoveryStatus·improvementCandidate`)로 동결(`Object.freeze`). 실 실행 로그가 없어 negative search 는 실 smoke 시 수행.

## 6. CLOSURE 판정

- 선행 WO `...FAILURE-ESCALATION...-V0` 종료 판정: **CLOSED 아님 (REAL-SMOKE-PENDING 유지)**.
- 사유: 실 smoke 3종 BLOCKED. 실 paired Local Agent + 실행 중 Doctors + 실 provider 키 + O4O 채팅/AI proxy 서버측 runWorkAgent 가 동시에 있는 **대화형 세션**에서 재집행 필요.

## 7. 재현 (실 smoke 를 돌리는 방법)

1. 대화형 세션(이 PC)에서 API 서버 기동(runWorkAgent host) + 실 provider 키(프로덕션 Gemini) 주입.
2. O4O Local Work Agent 페어링 → loopback 47821 listener 확인(`/api/local-agent/devices` 토큰 probe, chat input 존재로 판정 금지).
3. Doctors 환경을 A(교육)/B(테스트 DB)/C(운영) 로 **확인**(추정 금지). C 면 저장 직전 STOP·takeover only.
4. O4O 채팅으로 업무 목표 자연어 Goal 전달(약품명·입력값은 사용자/테스트 책임자 제공). Agent 가 화면 보며 판단.
5. smoke 1(브라우저 막힌 경로)·smoke 3(유도 복구)도 같은 loop 에서 관찰.
6. 관찰 항목(§12) 로그 → 이 CHECK 갱신 → CLOSURE 판정.

## 8. 실 smoke 재개(2026-09-15) — 실행 전제 충족 + 범용 UTF-8 stdout 결함 발견·수정

§4 의 BLOCKED 전제가 이번 대화형 세션(사용자 실 PC)에서 해소됐다: paired Local Agent 가 loopback 47821 에서 `connected:true`(사용자가 [이 PC 연결] 수행), Doctors 실행 중, O4O 채팅→서버측 `runWorkAgent`(프로덕션 `api.neture.co.kr`)→paired Agent loop 가 실제로 구동됐다. 그 결과 **선행 WO 가 목표로 한 "서비스 개선 갭 발견"이 실제로 일어났다.**

- **경위**: `[작업 수행]`(▶) 실행 시 Doctors 가 열려 있는데도 `인계 사유 site_not_ready`(행동 0단계·AI 판단 0회)로 끝났다. (그 전 두 전제 문제 — ① 웹 세션이 pairing 계정과 다른 계정으로 로그인되어 403 `WORK_AGENT_NOT_AVAILABLE`, ② `[전송/채팅]`(↑)·Enter 는 work-agent 가 아니라 일반 채팅 — 은 사용자 조치·경로 안내로 해소.)
- **근본 원인(확정)**: agent census 의 **UTF-8 stdout 인코딩 결함**. `windows-window-control.mjs` `runScript` 는 `execFile(powershell, [-File, census.ps1])` 을 인코딩 옵션 없이 호출 → Node 는 stdout 을 UTF-8 로 디코드하는데, 한국어 Windows PowerShell 5.1 은 리다이렉트된 stdout 을 OEM 코드페이지(cp949)로 출력. 결과로 census 의 `processName='Doctors.메인'` 이 `Doctors.` + U+FFFD×4 로 깨져 `matchWindows()` 가 **0건** → 실행 중인 창을 "실행 안 됨"으로 오판 → `site_not_ready`.
- **성격**: **범용 runtime 결함**. Doctors 특정이 아니라 **비ASCII 프로세스명을 가진 모든 Windows 앱**에 영향. real smoke 가 아니었으면 드러나지 않았을 실사용 결함(선행 WO 의 smoke 목적 = "Agent 가 막히는 지점 발견"에 정확히 부합).
- **수정(§14 최소 수정·CLOSURE 범위 내, 별도 WO 없음)**:
  - `tools/o4o-local-agent/src/windows-window-census.ps1` 상단에 `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8` 1줄 추가(이미 동일 계약을 가진 `windows-uia.ps1:23`·`windows-uia-host.ps1:33` 과 같은 idiom). Node 쪽 cp949 추측 디코딩은 하지 않음(경계는 스크립트가 자신의 stdout 계약을 UTF-8 로 고정하는 쪽).
  - PS5.1 `-File` 파싱 안전을 위해 해당 파일 **UTF-8 BOM 유지 확인**.
  - **census 범위 확정**: Node 가 stdout 을 파싱하는 .ps1 중 OS 유래 자유 텍스트(창 제목·프로세스명)를 내보내는 것은 census.ps1 하나뿐. UIA 계열 2종은 이미 계약 적용됨. 나머지(activate·app-launch·browser-open·computer-inspect·computer-input)는 출력이 boolean·int·고정 코드 문자열뿐이라 cp949 위험 없음 → 미적용.
- **검증**:
  - 실제 `execFile` 경로 재실측: `censusWindows()`→`Doctors.메인`(정상)·`matchWindows(windows.doctors)`=**1건**(수정 전 0건).
  - agent 계층 node:test 6 스위트 green: work-target 13 / windows-automation-safety 11 / windows-uia 5 / windows-test-surface 3 / windows-uia-persistent-client 6 / browser-dom 17.
  - api-server jest 5 스위트 green(53/53): windows-app-window-control · windows-automation-safety · windows-ui-automation · windows-uia-test-surface · work-target-discovery.
- **다음**: 같은 loop 에서 read-only 첫 smoke(`반납대상 리스트 조회`) 재개 → §12 관찰 항목 기록 → smoke 1·3 → CLOSURE 판정. Doctors 환경 A/B/C 확인은 등록/저장 성격 작업 전에 선행(§4 원칙 유지).

---

*기준 commit(census): `5e08e23ef` / 테스트 수정 commit: 본 CHECK 커밋과 동일 리비전*
*최종 판정: BLOCKED (실 smoke 미실행) · CLOSURE 미종료 — §8(2026-09-15) 이후 실 smoke 재개 중, 범용 UTF-8 stdout 결함 수정 반영. CLOSURE 판정은 smoke 1·2·3 관찰 완료 후.*
