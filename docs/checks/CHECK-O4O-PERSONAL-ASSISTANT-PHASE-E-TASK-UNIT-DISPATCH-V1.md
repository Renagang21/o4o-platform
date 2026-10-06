# CHECK-O4O-PERSONAL-ASSISTANT-PHASE-E-TASK-UNIT-DISPATCH-V1

> **WO**: `WO-O4O-PERSONAL-ASSISTANT-PHASE-E-TASK-UNIT-DISPATCH-V1` (사용자 지시 2026-10-06, WO 문서 없음 — 이 CHECK 가 기록)
> **일자**: 2026-10-06
> **정본**: [`O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2`](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) §11-2 · §23 L5
> **작업공간**: 전용 worktree `../o4o-wt/personal-assistant-phase-e-task-unit-dispatch-v1` · branch `wo/personal-assistant-phase-e-task-unit-dispatch-v1` · base `origin/main` `e0be29869`

---

## 0. 판정

```text
STATE              = READY_TO_INTEGRATE (main 미통합 · 배포 0 · production migration 0)
RT 병목            = 완화 — 브라우저(DOM) 표면에서 관찰 · 같은 화면 행동 묶음 · 절차 재생을 작업 단위 1 왕복으로
경계               = 판단은 Assistant, 연속 실행은 Execution Node — 노드는 Task 목적 · 절차를 정하지 않는다
안전               = 단위 안 각 단계는 단발 action 과 같은 검증 · 자격 · COMMIT 은 사용자 몫으로 멈춤(단발과 동일 결과)
호환               = taskUnit 미보고 노드 · 0.2.0 이하 agent · 단위 거절 → 기존 단발 경로 그대로
MIGRATION          = 0 · package.json/lockfile 변경 0 · Chrome 확장 변경 0
AGENT              = 0.3.0 (run_unit · heartbeat taskUnit) — 사용자 PC 수동 업데이트
DEPLOYMENT (통합 시) = API 코드 변경만(migration 없음) → 일반 API delivery · agent 0.3.0 배포는 별도
실 PC 측정          = 미실시 (Known Gap ①)
```

## 1. RT 병목 (변경 전)

Assistant(서버)의 DOM 명령 하나 = Cloud DB 큐 왕복 1회(노드 polling + 서버 결과 polling 250ms 간격 `RESULT_POLL_INTERVAL_MS`).

| 동작 | 변경 전 왕복 | 비고 |
|---|---|---|
| 관찰 | 2 (get_context + inspect) | 이동 직후엔 재시도로 더 늘 수 있음 |
| 행동 1 | 1 + (이동 시 서버 대기 700ms) + 재관찰 2 | 행동 n 개 묶음 = n + 2 |
| 절차 재생 1 단계 | 약 4 (find + act + 재관찰 2) | 2 단계 재생 = 8 |

화면 동작마다 판단과 무관한 왕복이 붙어, 판단이 필요 없는 구간에서도 시간이 선형으로 늘었다.

## 2. 설계

- 새 action `local.browser.dom.run_unit#<siteId>` — agent 가 받아 **기존 단발 DOM 실행 함수를 단계마다 그대로 호출**하는 loop(`tools/o4o-local-agent/src/browser-dom-unit.mjs`, 순수 모듈 · 프로세스/네트워크 수단 없음). Chrome 확장은 그대로(로컬 bridge 로 기존 명령을 쓴다).
- 단위 종류: ① 관찰 전용(단계 0 · `observe:true` · `afterNavigation` 선택) ② `act` 묶음(같은 snapshot 의 ref 행동들) ③ `find_act` 재생(지금 화면에서 찾고 → `pickUnitTarget` → `targetFits` 로 role · disabled · 클릭 COMMIT 재확인 → 실행).
- 끝에 노드가 지금 화면을 관찰해 함께 돌려준다(이동 settle 도 노드가). 예산(`maxCommands`) · 시간(`maxDurationMs`)은 서버가 이번 run 의 남은 몫 안에서 정한다.
- capability gate: heartbeat `taskUnit` (agent 0.3.0 · 확장 연결 시 true) → `local_agent_devices.capabilities`. 서버는 `surface === 'dom'` 이고 노드가 `taskUnit` 을 보고했을 때만 단위를 보낸다.
- 인자 · 결과는 정확 키 검증(`browser-dom-contract.ts` · `local-agent-protocol.ts`). 결과는 whitelist — 입력 원문은 돌아오지 않는다.

## 3. Assistant / Node 경계

| Assistant(서버)에 남는 것 | Node 가 이어서 하는 것 |
|---|---|
| 목적 · 다음 행동 판단(LLM planner) · 재생 여부 · 모호성 해소 · 사용자 질문 · takeover | 이미 정해진 단계의 연속 실행 · 단계 사이 대기 · 끝 관찰 |

노드가 멈추고 판단을 돌려주는 경우(`stop.cause`): `step_failed` · `reobserve`(화면 변경 — 다음 판단 필요) · `find_failed`/`locator_not_found`(대상 없음 · 모호) · `validation_rejected` · `expect_mismatch`(이동 결과 다름) · `cross_origin`(다른 사이트) · `not_ready` · `budget` · `time`.
단위는 Task 목적이나 절차를 정의하지 않는다 — 서버가 매번 지금 판단으로 만든 일회성 묶음이다(사이트 스크립트 · 공유 workflow 아님, P3 유지).

## 4. 안전 · 확인 경계

- 자격 입력(비밀번호 등) · COMMIT(주문 · 결제 · 제출 확정)은 단위 안에서도 실행하지 않고 멈춘다 → 단발 경로와 **같은 takeover**(테스트: credential · COMMIT 재생 · 노드 executor COMMIT 거절 parity).
- 노드 측 기존 validator(origin · ref · 위험도)는 단계마다 그대로 적용된다.
- 거절(denied — 아무것도 실행 안 됨) → 같은 일을 단발 경로로, 이번 run 의 남은 부분은 단발.
- 유실(lost — 만료 · 전송 실패, 무엇이 실행됐는지 모름) → **다시 보내지 않고** 단발 관찰부터(입력 1회만 실행됨을 테스트로 확인).

## 5. 호환

- `taskUnit` 미보고 노드(0.2.0 이하 · 확장 미연결) → 단발 경로만(테스트).
- 결과 parity: 같은 시나리오에서 단발 ≡ 단위 — ok · errorCode · goal · progress · takeover · stepCount · aiPlanCount · path · history · workflow · executed 일치(10 시나리오). stepCount 는 단발 회계에 맞춰 환산(행동 +1 · find +1 · 관찰 +2 …).
- UIA · Computer Use · read 계열 action 은 변경 없음(단발).
- 운영 로그 `work-agent dispatch` `{roundTrips, unitDispatches, stepCount, taskUnit}` 추가(내용 없음) — 실 PC 전후 비교 근거.

## 6. RT / 시간 비교 (시뮬레이션)

조건: 왕복 지연 150ms · 노드 로컬 동작 20ms · 이동 settle 700ms · planner 즉시(LLM 지연 미포함). 출처: `work-agent-task-unit-dispatch.spec.ts` §D 로그 `PHASE-E RT/TIME`.

| 시나리오 | 왕복 (전→후) | 시간 ms (전→후) |
|---|---|---|
| AI 검색(입력 + 검색 클릭 + 이동) | 6 → 3 | 3852 → 3138 |
| AI 같은 화면 행동 묶음 | 6 → 2 | 3837 → 2849 |
| 저장 절차 재생 2 단계 | 8 → 2 | 4359 → 3127 |

시간에는 prepare · match · 원장 · settle 같은 고정 비용이 포함된다. 실제 Cloud 큐 왕복은 polling 간격 때문에 150ms 보다 크므로 실환경 절감 폭은 이 표보다 클 것으로 보지만 **측정 전이다**.

## 7. 검증

| 항목 | 결과 |
|---|---|
| agent `node --test test/*.test.mjs` | 167/167 PASS (신규 `browser-dom-unit.test.mjs` 포함) |
| 신규 API spec `work-agent-task-unit-dispatch.spec.ts` | 20/20 PASS (A 계약 · B parity 10 · C 왕복/fallback/lost/예산/시간 · D 비교) |
| 관련 API 회귀 23 suite(work-agent · browser-dom · local-agent · personal-assistant · windows-* 등) | PASS (`local-agent-runtime.spec` import allowlist 에 `browser-dom-unit.mjs` 추가 후) |
| `pharmacy-web-core.spec` site 당 allowlist 수 | 11 → 12 기대 갱신(`run_unit` 1 — 의도된 계약 변경, CI 1차에서 발견) · PASS |
| api-server `tsc --noEmit` | clean |
| 실 PC · Chrome smoke | **미실시** |

## 8. Known Gaps

1. 실 PC · Chrome 에서의 smoke · 왕복/시간 측정 미실시(시뮬레이션 수치만).
2. UIA · Computer Use · read/find 단독 action 은 여전히 명령당 왕복.
3. 관찰 결과가 결과 상한을 넘으면 단발 관찰로 다시 본다(그 경우 절감 없음).
4. `not_ready` 재시도(probe) 의 stepCount 환산은 근사치.
5. planner(LLM) 지연은 모델에 넣지 않았다 — 실환경 총시간 비중은 측정 필요.
6. agent 0.3.0 은 사용자 PC 수동 업데이트가 필요하다(미업데이트 노드는 예전 속도).
7. (기존 동작 · 이번 범위 밖) 저장 절차의 `set_input` 값은 workflow 상 200자까지 저장되지만 재생 시 100자(`DOM_QUERY_VALUE_MAX`)로 잘린다 — 단발 재생(`validateWorkProposal`)도 main 에서 같게 자르므로 단위 경로는 parity 를 유지한다. 한도 정합은 별도 WO 후보(PR #325 Codex P2 지적에서 확인).

## 9. 배포 영향

- API: runtime · protocol 코드 변경(migration 0) → 통합 후 일반 API delivery.
- agent 0.3.0 배포(수동 업데이트) — 업데이트 전까지 서버는 단발 경로로 동작하므로 순서 의존 없음.
- Chrome 확장 · Web · Admin 변경 없음.

## 10. 문서 정합

V2 §11-2 (Phase E 구현 · 멈춤 목록 · P3 · 단발 유지/유실 비재전송) · §23 L5 (해소 범위 · 남은 한계) 갱신 · agent README capability 표에 `taskUnit` · 0.3.0 안내 추가.
발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(Known Gap 7 — 코드 한도 정합).
