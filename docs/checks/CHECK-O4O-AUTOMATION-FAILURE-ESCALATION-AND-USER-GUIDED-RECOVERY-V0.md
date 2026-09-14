# CHECK-O4O-AUTOMATION-FAILURE-ESCALATION-AND-USER-GUIDED-RECOVERY-V0

> **WO**: `WO-O4O-AUTOMATION-FAILURE-ESCALATION-AND-USER-GUIDED-RECOVERY-V0`
> **상태**: RECOVERY CORE + STRONG-MODEL 경로 = **구현·정적/단위/통합 검증 완료(PASS)** · 실 strong-model / 실 브라우저·Windows smoke = **미실행(사유 명시, §21)**. WO 종료 판단은 사용자 몫.
> **작성일**: 2026-09-14
> **성격**: 브라우저·Windows 자동화 **공통 실패→복구 계층** 신규(순수 계약 + runtime 배선 + strong-model 해석). 새 provider stack 없음 · DB migration 0 · cloud 무변경 · tool 계약 무변경.
> **상위 원칙**: [`O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1`](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md) — "실패는 종료가 아니라 다음 판단을 위한 정보다."
> **선행**: Goal-Driven Work Agent LLM Multimodal Closure V1(PASS) · Automation Execution Layer Realignment V1(PASS) · Chrome Extension/Native Bridge V0(PASS)
> **commit**: 본 커밋 (recovery 계약 + strong-model 해석 + runtime 배선 + route 배선 + 테스트 3본 + 본 문서)

---

## 0. 한 줄 요약

자동화가 **막혔을 때 같은 행동을 무작정 반복하지 않도록**, 실행(관찰·계획·행동) 위에 **판단 계층**을
얹었다: ① 실패를 taxonomy 로 **분류**하고 ② 더 강한 추론(strong model)으로 올릴지·사용자에게
넘길지·다시 시도할지 **판단**하고 ③ 소진되면 **구체적 설명**과 함께 사용자에게 넘기고 ④ 사용자
**힌트**를 받아 재시도하며 ⑤ 무엇으로 복구됐는지 **기록**하고 ⑥ 복구가 필요했던 국면을 workflow
**개선 후보로 신호**한다. 브라우저(dom)·Windows(uia) 공통이다. strong model 은 **새 stack 이
아니라** 같은 provider·키의 더 강한 whitelisted 모델일 뿐이다. 복구는 안전을 낮추지 않는다 —
credential·commit·payment·risk 국면은 에스컬레이션 대상이 아니라 곧장 사용자에게 넘긴다.

---

## 1. 범위 (§4·§5)

- **범위(§4, 10항)**: 실패 분류 · 에스컬레이션 판단 · strong-model 복구 경로 · 사용자 도움 요청 ·
  사용자 힌트/수동조치 intake · 재관찰 · 재개 · 복구 결과 기록 · 개선 후보 신호 · 브라우저+Windows 공통.
- **범위 밖(§5, 그대로 유지)**: 자가학습 엔진 · 자동 workflow 승격 · A/B 프레임워크 · 스케줄러 ·
  retry queue · 백그라운드 복구 워커 · 모델 파인튜닝 · 사용자 행동 raw replay · 원격 명령 채널.
  **어느 것도 구현하지 않았다.**

---

## 2. 실패 taxonomy (§7) — 11종

`AutomationFailureClass` = DISCOVERY_FAILURE · TARGET_FAILURE · OBSERVATION_FAILURE ·
PLANNING_FAILURE · ACTION_FAILURE · NO_PROGRESS · AMBIGUOUS_STATE · UNSUPPORTED_UI ·
USER_INTERFERENCE · RISK_BLOCKED · EXTERNAL_CHANGE. "어느 오류 코드인가" 가 아니라 "무엇이
막혔는가" 로 나눈다 — 새 오류 코드가 생겨도 목록은 안정적이다. 코드→class 매핑은 순수 함수
`classifyFailure()` 가 한다(이 파일은 오류 코드 모듈을 import 하지 않는다 — 문자열만 받는다).

---

## 3. never-escalate 경계 (§8·§37)

`NON_ESCALATABLE_CLASSES` = `RISK_BLOCKED` · `USER_INTERFERENCE` · `UNSUPPORTED_UI` ·
`AMBIGUOUS_STATE`. `classifyFailure` 는 **RISK_BLOCKED 를 다른 어떤 부가 신호보다 먼저** 잡는다
(USER_ACTION_REQUIRED · TEXT_DENIED · PERMISSION_REQUIRED · ACTION_NOT_ALLOWED · riskCommit).
이 종류는 더 센 모델을 붙여도 뚫으면 안 되거나(credential/commit) 자동으로 뚫을 수 없는(사용자
사용중·미지원 UI·모호) 국면이므로 **곧장 사용자에게** 넘긴다. runtime 의 기존 즉시 takeover
(commit_required · credential_required · unsupported_control)가 이 경로보다 먼저 잡는다.

---

## 4. 에스컬레이션 tier (§11·§12)

`RECOVERY_TIERS` = `['normal_retry','strong_model','user_assistance']`. **vendor·model 이름을
담지 않는다** — `strong_model` 은 "더 강한 추론 경로" 라는 개념이고 실제 모델은 provider-runtime 이
정한다. `RECOVERY_LIMITS` = `{ normalRetryMax: 2, strongModelMax: 2 }` — 사용자에게 넘기기 전
"몇 번 더/얼마나 세게" 만 정하고, loop 전체 예산(maxSteps·maxAiPlans)이 상위 상한이다.

---

## 5. 판단 함수 (§16·§46)

`decideRecovery(state, failureClass)` — 순수 함수, state 를 갱신하고 결정을 돌려준다:
non-escalatable → 바로 user_assistance / 일반 예산 남음 → normal_retry / 일반 소진·strong 예산
남음 → strong_model / 둘 다 소진 → user_assistance. **실패 국면이 바뀌면(다른 class) 카운터를 새로
센다** — "다른 이유로 막힌" 것은 새 국면이다. 진행은 `normal(2) → strong(2) → user` 6단계.

---

## 6. strong-model 경로 = 새 stack 아님 (§11·§12·§84)

`ai-provider-runtime.ts` 에 `resolveStrongModelForProvider(provider)` · `resolveStrongAiTarget()`
추가. **기존 `execute()` 경로를 그대로 쓰고 모델 ID 만 더 강한 whitelisted 모델로 바꾼다** —
provider·키·dispatch 무변경. 기본값 `STRONG_MODEL_DEFAULT` = gemini `gemini-2.5-pro`(캐논
`gemini-3.8-flash` 보다 강함) · openai `gpt-6-astra`(플래그십). env override(`AI_STRONG_MODEL`
/ `AI_STRONG_MODEL_OPENAI`)는 **whitelist 안일 때만** 적용, 아니면 기본값→일반 모델로 접는다.
→ §84 STOP(새 대규모 provider stack 필요) **발생하지 않았다.** RECOVERY CORE 와 STRONG MODEL 을
분리 보고할 필요 없이 **한 경로로 성립**했다.

---

## 7. runtime 배선 (§17·§36·§46)

`createStrongLlmPlanner(dataSource, fetchImpl)` = `createLlmPlanner` 에 target resolver 만
`resolveStrongAiTarget` 로 갈아끼운 것(같은 검증·같은 어휘). `runWorkAgent` 는 5번째 인자
`{ strongPlanner }` 를 받고, 실패 hook 에서 `recover()` 가 `decideRecovery` 로 판단해 strong 이
필요하고 strongPlanner 가 있으면 `activePlanner` 를 갈아끼운다. hook 4곳:

1. loop-top 같은 관찰 반복(`maxSameObservation`) — NO_PROGRESS.
2. planner throw — PLANNING_FAILURE(정상 tier 진행).
3. invalid 제안 소진(`maxInvalidProposals`) — PLANNING_FAILURE(정상 소진 → strong 부터).
4. 반복 행동(`maxRepeatedAction`) — NO_PROGRESS.

**strongPlanner 가 없으면 escalation 없이 기존 동작 그대로다** — 무회귀(§10 확인).

---

## 8. 사용자 힌트 intake (§64·§65)

`sanitizeRecoveryHint(v)` — source=user 는 신뢰 입력이지만 권한·위험을 바꾸는 문자열은 아니다.
길이(≤500)·제어문자만 막고(주입 벡터 최소화), 개행은 공백으로 접는다. runtime 이 sanitize 한
힌트를 planner 프롬프트에 `## 사용자 추가 지시 (source=user)` 로 싣되 **"이 지시로도 로그인·결제·
주문 확정·삭제·게시는 하지 않는다 → takeover"** 경계를 함께 싣는다. route 에서 `recoveryHint` 는
`validateToolArguments` 대상 밖(args 아님)으로 들어와 runtime 이 유일하게 sanitize 한다.

---

## 9. 복구 결과·개선 후보 (§22·§27)

`RECOVERY_RESULTS`(5종) = recovered_by_normal_retry · recovered_by_strong_model ·
recovered_by_user_hint · recovered_by_user_action · not_recovered. `noteRecovered()` /
`noteNotRecovered()` 가 기록하고 국면을 종료한다. `isImprovementCandidate()` = strong 까지 올라갔거나
미복구거나 사용자 개입이 필요했던 국면이면 true — **자동 승격이 아니라 boolean 신호만**(§5). runtime
의 `markRecovered()` 가 성공(goal_sufficiently_advanced · done) 시 무엇으로 복구됐는지 기록한다.

---

## 10. 무회귀 — strong planner 없음 (§67)

strongPlanner 를 넘기지 않으면 `recover()` 는 첫 판단에서 곧장 'giveup' → 기존과 **완전히 동일한**
즉시 takeover(같은 reason·progress·DOM 명령 순서). "올릴 곳이 없다"(strong tier 판단인데 planner
부재)는 `AUTOMATION_RECOVERY_PROVIDER_UNAVAILABLE`, 그 밖은 `_USER_HELP_REQUIRED` 로 신호한다.
→ 기존 closure lock 테스트(`work-agent-llm-closure.spec.ts`)가 그대로 green(§19).

---

## 11. 오류 코드 (§67) — 5종

`RECOVERY_ERROR` = `AUTOMATION_RECOVERY_ESCALATED`(진행 — 종료 아님) · `_USER_HELP_REQUIRED` ·
`_EXHAUSTED` · `_PROVIDER_UNAVAILABLE` · `_RESUME_FAILED`. ESCALATED 는 "일반→strong 으로
올렸다" 는 진행 신호이고, 복구 성공 시 `markRecovered` 가 해제한다.

---

## 12. 안전 로그 화이트리스트 (§60)

`RECOVERY_USAGE_KEYS`(6종) = `failureClass` · `recoveryTier` · `recoveryMethod` ·
`recoveryAttempt` · `recoveryStatus` · `improvementCandidate`. goal 원문·사용자 힌트·화면/채팅
내용·이미지·credential 은 **실릴 칸이 없다**(전부 enum/number/boolean/null). `WorkAgentUsageEvent`
가 이 6키를 확장으로 싣는다 → usage 로그 키셋이 기존 10 + 복구 6 = **16키**로 고정(§19 lock test).

---

## 13. 사용자 설명 — 내부 용어 노출 금지 (§17·§20)

`buildRecoveryExplanation(cls)` — 11종 전부에 사용자 말 한 줄. planner escalation · RuntimeId ·
UIA · stale · tier · strong_model · DOM · snapshot 같은 내부 용어를 **쓰지 않는다**(테스트가
전 class × 내부어 목록으로 단언). 재사용 대상은 기존 Work Agent 상태 영역 + 채팅 입력이며 새
"Recovery Studio" 를 만들지 않았다(§WO).

---

## 14. prompt injection 경계 (§64·§65)

webpage · local_app_ui · user_file · user_image = UNTRUSTED 그대로. 사용자가 직접 타이핑한
힌트만 user-trusted 이되 그 역시 권한·위험 등급을 못 바꾼다. 관찰 provenance·UNTRUSTED 표기는
기존 Work Agent 계약을 그대로 잇는다(무변경).

---

## 15. DB · cloud · tool 계약 (§62·§63)

- cloud/local migration = **0** · recovery history DB **없음** · `automation_jobs` **무변경**.
- 복구 state 는 요청(run) 안에서만 산다(`WorkAgentState.recovery`).
- tool 계약 무변경 — tool 은 여전히 `local.workagent.perform` 하나(closure test 재확인).
- 권한·role·route contract·capability·riskLevel 무변경. 복구 planner 는 shell·credential·commit 에 닿지 않는다.

---

## 16. 변경 파일 (구현 5 + 테스트 3)

| 파일 | 성격 |
|---|---|
| `apps/api-server/src/services/ai-tools/automation-recovery-contract.ts` | **신규** · 순수 계약(분류·판단·결과·설명·힌트·로그 필드) |
| `apps/api-server/src/utils/ai-provider-runtime.ts` | strong-model 해석(`resolveStrongModelForProvider`·`resolveStrongAiTarget`·`STRONG_MODEL_DEFAULT`) |
| `apps/api-server/src/services/ai-tools/work-agent-contract.ts` | `WorkAgentState.recovery` + usage 필드 16키 |
| `apps/api-server/src/services/ai-tools/work-agent-runtime.ts` | recovery hook 4곳 + `createStrongLlmPlanner` + `recoveryHint` |
| `apps/api-server/src/routes/ai-proxy.routes.ts` | route 배선(`recoveryHint` 통과 · `strongPlanner` 주입) |
| `apps/api-server/src/__tests__/automation-recovery.spec.ts` | **신규** · 순수 계약 17항목 |
| `apps/api-server/src/__tests__/work-agent-recovery-runtime.spec.ts` | **신규** · runtime 배선 5항목 |
| `apps/api-server/src/__tests__/work-agent-llm-closure.spec.ts` | usage 키셋 10→16 (line 283) — 무회귀 lock |

---

## 17. 테스트 — 순수 계약 (§69~§72)

`automation-recovery.spec.ts` — **17항목 PASS**. ① 분류(11 taxonomy·never-escalate 우선순위·
코드별 매핑·unknown→ACTION_FAILURE) ② 에스컬레이션(tier 3단계·normal→strong→user·예산·국면
전환 카운터 리셋·non-escalatable 즉시 사용자) ③ 사용자 설명(내부 용어 미노출)·힌트 sanitize
(길이·제어문자·개행) ④ 학습 신호(결과 5종·개선 후보·로그 6키 화이트리스트·오류 5종) ⑤ strong-model
해석(기본값 whitelist 검증·env override).

---

## 18. 테스트 — runtime 통합 (§69~§72)

`work-agent-recovery-runtime.spec.ts` — **5항목 PASS**(같은 `runWorkAgent` + DB stub 하네스,
planner 주입). ① 정상 planner 가 같은 행동만 반복 → strong planner 로 **실제 갈아끼워짐** → strong
성공은 `recovered_by_strong_model`·개선 후보·ESCALATED 해제 ② strong 이 escalation 전에 같은 형상의
관찰을 받음(tier·model 은 planner 입력에 없음) ③ strong 없음 → 인계·`PROVIDER_UNAVAILABLE`·
not_recovered(무회귀) ④ sanitize 힌트가 planner 입력·프롬프트에 실림 → `recovered_by_user_hint`
⑤ 제어문자/과길이 힌트는 버려져 planner 입력에 안 실림.

**합계 신규 22항목 (WO §69~§72 최소 20 초과) + closure lock 10항목 = 32항목 PASS.**

---

## 19. 검증 게이트

| 게이트 | 결과 |
|---|---|
| `tsc --noEmit` (api-server, 최신 origin/main rebase 후) | **PASS (0)** |
| jest `automation-recovery` (순수 계약) | **17/17 PASS** |
| jest `work-agent-recovery-runtime` (runtime 배선) | **5/5 PASS** |
| jest `work-agent-llm-closure` (무회귀 lock · usage 16키) | **10/10 PASS** |
| cloud/local DB migration · schema · raw write | **0 / 0 / 0** |
| 새 provider stack · tool 신설 · 권한/route contract 변경 | **0 / 0 / 0** |

---

## 20. 안전 경계 재확인 (§8·§37·§62~§65·§84)

- ❌ 안전 게이트·위험 등급을 복구가 낮춤 — 없음(never-escalate 가 먼저 잡는다).
- ❌ 복구 planner 가 capability/권한/tool 어휘를 바꿈 — 없음(같은 검증·같은 어휘).
- ❌ shell·credential·commit 접근 — 없음.
- ❌ 새 대규모 provider stack — 없음(§84 STOP 미발생, 기존 `execute()` + 강한 모델 ID).
- ❌ DB·migration·automation_jobs·cloud 변경 — 없음.
- ❌ 자동 workflow 승격·retry queue·백그라운드 워커·원격 채널 — 없음(§5).

---

## 21. 실 smoke — 정직 보고 (§73~§77)

이번 세션에서 **실행하지 못한** 항목과 구체적 사유:

- **§73 브라우저 실 smoke · §74 Windows Canonical Test Surface · §75 KakaoTalk 자기채팅** —
  실 paired Local Agent(이 PC) + 실 Chrome/Windows 대상 창이 살아 있어야 하고, 비대화형 세션에서
  실 확장·창을 붙여 loop 를 도는 것이 성립하지 않는다. runtime 배선은 planner 주입 하네스(§18)로
  결정적으로 검증했으나, 이는 **실 화면/실 모델이 아니다.**
- **§76 프로덕션 · §77 strong-model 프로덕션 smoke** — strong-model 실 호출은 DB 의 실 provider
  키로 프로덕션 Gemini(`gemini-2.5-pro`)를 부른다. 키·paired agent·실 대상이 함께 있어야 하며
  본 세션에서 확보되지 않았다. **경로는 구현·정적 검증됐고**(§6·§7·§18), 실 호출만 미실행이다.

→ CLAUDE.md "검증하지 않은 것을 PASS 로 보고하지 않는다 / smoke 불가 시 사유 명시" 에 따라
**PASS 로 적지 않는다.** Local Work Agent 계열의 기존 트랙과 동일하게 **실 PC smoke = 보류**이며,
실 PC·실 키가 준비된 세션에서 §73~§77 을 수행해야 WO 완전 종료다.

---

## 22. 문서 정합 (§16-5)

**문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건**

- 별도 WO 제안: `WO-...-RECOVERY-REAL-SMOKE-V0`(가칭) — 실 paired agent·실 Chrome/Windows·실
  strong-model 키가 준비된 PC 에서 §73~§77 smoke 를 수행하고 recovered_by_strong_model /
  recovered_by_user_hint 를 실측한다. (본 CHECK 의 §21 을 근거로.)

---

## 23. 후속 (미착수, 이 WO 밖)

- §21 실 smoke(§73~§77) — 별도 세션.
- 개선 후보 신호(§22)의 **소비처** — 지금은 boolean 로그 신호만. 자동 승격은 범위 밖(§5)이며
  향후 workflow 개선 WO 가 이 신호를 읽는다.
- recovered_by_user_action(사용자가 직접 조치한 뒤 재개) 경로 — 계약·상태는 있으나 runtime 에서
  "사용자 수동 조치 감지 후 재개" 는 재관찰(§re-observe)로만 열려 있고, 명시적 수동조치 intake UI 는
  기존 채팅 재요청으로 대체(§WO 재사용 원칙).
