# WO-O4O-AUTOMATION-RECOVERY-REAL-SMOKE-CLOSURE-V1

> **성격**: 실측 종료(closure) WO — 신규 기능 개발 아님. 코드 확장 최소.
> **선행**: `WO-O4O-AUTOMATION-FAILURE-ESCALATION-AND-USER-GUIDED-RECOVERY-V0` = `IMPLEMENTED / DEPLOYED / REAL-SMOKE-PENDING` (커밋 `5d6e3bf03`, [CHECK-O4O-AUTOMATION-FAILURE-ESCALATION-AND-USER-GUIDED-RECOVERY-V0](../checks/CHECK-O4O-AUTOMATION-FAILURE-ESCALATION-AND-USER-GUIDED-RECOVERY-V0.md) §21).
> **핸드오프 전용** — 명시 지시 전에는 실행하지 않는다. 실 paired Local Agent + 실 Chrome/Windows + 실 provider 키가 있는 대화형 세션에서 수행한다.

---

## 1. 목적

자동화 실패→복구 계층 V0 를 **실제 실패 상황**에서 검증해 선행 WO 를 완전 종료(CLOSED)한다.
단위·통합 테스트(32항목 PASS)는 planner 주입 하네스로 배선만 결정적으로 증명했을 뿐, **실 화면·실 모델·실 사용자 힌트**는 아직 돌지 않았다. 이 WO 는 세 가지 실측만 확인한다.

핵심 원칙(선행 WO 계승): **"실패는 종료가 아니라 다음 판단을 위한 정보다."** 그리고 O4O 철학 — **"AI 가 잘 모르면 사용자에게 배우고, 그 다음부터 더 잘하게 되는 서비스."**

## 2. 배경

- 복구 계층은 브라우저(dom)·Windows(uia) **공통**으로, 실행(observe→plan→act) 위에 얹힌 판단 계층이다.
- tier 진행: `normal_retry`(2) → `strong_model`(2) → `user_assistance`. strong model = 새 provider stack 이 아니라 **같은 `execute()`·같은 키·더 강한 whitelisted 모델 ID**(`gemini-2.5-pro` / `gpt-6-astra`).
- `strongPlanner` 가 없으면 escalation 없이 기존 인계로 무회귀. 사용자 힌트는 `sanitizeRecoveryHint`(≤500·제어문자/개행 제거) 후 planner 입력·프롬프트에 `source=user` 로 실린다.
- CHECK §21 이 §73~§77 실 smoke 를 **미실행(사유 명시)**으로 남겼고, §22 가 이 WO 를 별도 제안했다.

## 3. 범위

**In scope (실측 3종):**

1. **브라우저 실 복구** — 일부러 막힌 경로: 정상 planner 가 같은 행동만 반복하거나 무진전 → 국면 분류(`NO_PROGRESS` 등) → strong 복구 planner 로 갈아끼움 → **다른 안전한 경로**로 성공하거나 사용자 인계.
2. **Windows 실 복구** — O4O Canonical Test Surface(계측 창) 또는 KakaoTalk 자기채팅 대상: `no_progress` / `ambiguous_state` 유발 → 에스컬레이션 → 복구 또는 사용자 도움 요청.
3. **사용자 유도 복구 (★ 가장 중요)** — AI 가 실패 → 사용자에게 **무엇이 필요한지 구체적으로** 질문(내부 용어 노출 금지) → 사용자가 힌트 제공(예: "채팅 탭에서 찾아") → 낡은 상태(stale observation) 폐기 → 재관찰 → 새 plan → 계속.

**Out of scope (건드리지 않음):**
- 신규 기능·새 tool·새 taxonomy·새 tier·새 provider stack.
- Safety Gate / Risk level / capability / 권한 / tool contract 변경.
- DB schema·migration(=0)·`automation_jobs`·cloud 배선 변경.
- 복구 UI 신설(Work Agent 상태 영역 + 기존 chat 입력만 재사용, "Recovery Studio" 류 금지).

## 4. 단계

1. **환경 준비** — 실 paired Local Agent(이 PC) 연결 확인(`/api/local-agent/devices` 토큰 probe, chat input 존재로 판정 금지), 실 Chrome/등재 Windows 앱 창, 실 provider 키(프로덕션 Gemini) 가용 확인.
2. **smoke 1 (브라우저)** — 막힌 경로 시나리오 구성 → 정상→strong 전환이 실제로 일어나는지, 다른 경로/인계로 귀결하는지 관찰. usage 로그(`failureClass`·`recoveryMethod`·`improvementCandidate`·`recoveryStatus`) 확인.
3. **smoke 2 (Windows)** — Canonical Test Surface 또는 KakaoTalk 자기채팅에서 무진전/모호 유발 → 에스컬레이션·복구·사용자 도움 경로 관찰.
4. **smoke 3 (사용자 유도 복구)** — AI 실패 → 사용자 대상 구체 질문 문구 확인(내부 용어 없음) → 힌트 주입 → stale 폐기·재관찰·재계획·재개 확인 → `recovered_by_user_hint` 기록 확인.
5. **로그 whitelist 재확인** — 6키(`failureClass`·`recoveryTier`·`recoveryMethod`·`recoveryAttempt`·`recoveryStatus`·`improvementCandidate`)만 남고, 채팅 원문·힌트 전문·창 제목·비밀번호/토큰이 로그에 없는지 negative search.
6. **CHECK 작성** — `CHECK-O4O-AUTOMATION-RECOVERY-REAL-SMOKE-CLOSURE-V1` 에 각 smoke 를 PASS/FAIL/PARTIAL + 리비전 + 재현 방법으로 기록.

## 5. 검증 · 성공 기준

- **smoke 성공 기준은 "strong model 이 혼자 다 풀었다"가 아니다.** 다음 중 하나면 성공:
  - strong 복구 planner 가 다른 안전 경로로 목표를 전진시킴(`recovered_by_strong_model`), 또는
  - **사용자 힌트로 재관찰→재계획→전진**(`recovered_by_user_hint`) — 이것이 O4O 철학상 **최고의 결과**, 또는
  - 예산 소진 시 내부 용어 없이 구체적 설명과 함께 사용자에게 안전하게 인계(`not_recovered` + 명확한 사유).
- 각 실패 국면이 **맹목 반복 없이** 분류→판단→(재시도/강화/질문)로 흐르는지.
- Safety/Risk 경계가 복구 과정에서 **낮아지지 않는지**(never-escalate 블록=credential·commit·payment·security·risk 는 즉시 사용자).
- 로그 whitelist 밖 데이터 누출 0건.

각 항목은 **실측했을 때만 PASS**. 못 돌린 항목은 사유와 함께 PENDING 유지(선행 CHECK §21 방식).

## 6. 산출물

- `docs/checks/CHECK-O4O-AUTOMATION-RECOVERY-REAL-SMOKE-CLOSURE-V1.md` — 3 smoke 결과·리비전·재현·로그 확인.
- (필요 최소) smoke 보조 스크립트/ps1 이 생기면 기존 `tools/o4o-local-agent` 컨벤션 준수. **없이 되면 만들지 않는다.**
- 선행 WO 종료 판정 갱신 + `memory/project-o4o-local-work-agent-track.md` 한 줄 갱신.
- 완료 보고에 `문서 정합` 한 줄(§16-5).

## 7. 금지 · 안전 경계

- **코드 확장 최소.** smoke 를 위해 기능·계약·tool·taxonomy·tier·provider 를 늘리지 않는다.
- 복구 planner 는 safety 비활성·capability 변경·권한 상승·shell 실행·credential 접근·commit 실행을 **할 수 없다**(선행 WO 경계 그대로).
- 내부 용어(planner escalation·RuntimeId·UIA stale·tier 명)를 사용자에게 노출하지 않는다.
- 실제 DB host·password·계정·provider 키를 문서·로그·커밋에 기록하지 않는다.
- KakaoTalk 대상은 **자기채팅만**. 실 타인 대화·발송·결제·주문 확정·삭제·게시 금지.
- smoke 불가 항목은 PASS 로 적지 않고 사유를 명시한다(CLAUDE.md 검증·보고 원칙).
- Git: 전용 worktree·최신 origin/main·path-specific stage·`--force` 금지(선행 WO 와 동일).
