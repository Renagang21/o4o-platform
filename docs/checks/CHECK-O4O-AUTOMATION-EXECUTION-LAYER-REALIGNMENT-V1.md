# CHECK-O4O-AUTOMATION-EXECUTION-LAYER-REALIGNMENT-V1

> **WO**: `WO-O4O-AUTOMATION-EXECUTION-LAYER-REALIGNMENT-V1`
> **상태**: 검증 완료 — 자동 게이트 전 항목 PASS (WO 종료 판단은 사용자 몫)
> **작성일**: 2026-09-11
> **성격**: architecture realignment · contract alignment · routing alignment · 문서 정합 · 최소 refactor (§2). 실행기 구현 WO 가 아니다.
> **선행**: Local Work Agent 계열(AI Capability/Tool Routing V0 · Windows App Window Control V0 · Browser Control V0 · Computer Use V0 · Local Data SQLite/Tool Bridge · Chrome Extension/Native Bridge V0) = 전부 CLOSED/PASS
> **commit**: 본 커밋 (contract · registry 메타 · drift 가드 · 테스트 · 본 문서)

---

## 0. 한 줄 요약

O4O 자동화의 **공통 실행 계층을 두 축으로 재정의**했다 — 실행이 **어디서**(executionMode:
server|local|browser) 일어나는가와, 자동화를 **어떻게**(automationMethod: api|browser_dom|
windows_uia|computer_use) 하는가는 별개의 축이다. 가장 결정적인 수단이 먼저이고 Computer Use 는
**기본 엔진이 아니라 universal fallback** 이라는 원칙(Deterministic First)을 순수 계약 함수
`resolveAutomationMethod()` 와 registry 메타데이터·drift 가드로 고정했다. **실제 DOM/UIA/MCP
실행기는 구현하지 않았다**(§38·§48) — browser_dom·windows_uia 를 쓰는 tool 은 지금 0개이며
축과 게이트만 미리 고정했다. DB 마이그레이션 0, cloud 무변경.

---

## 1. 기존 tool census (§36)

`origin/main`(`e0a8e96c8`) 기준 `AI_TOOL_REGISTRY` 전수 조사. 16개 → 자동화 수단 분류:

| tool | executionMode (WHERE) | automationMethod (HOW) | riskLevel | readOnly |
|---|---|---|---|---|
| `workscope.get_context` | server | api | READ | ✅ |
| `store.get_context` | server | api | READ | ✅ |
| `local.get_agent_status` | server | api | READ | ✅ |
| `local.get_system_info` | local | api | READ | ✅ |
| `local.find_application` | local | api | READ | ✅ |
| `local.activate_window` | local | api | REVERSIBLE | — |
| `local.browser.get_site_status` | local | api | READ | ✅ |
| `local.browser.open_site` | local | api | REVERSIBLE | — |
| `local.computer.inspect` | local | **computer_use** | READ | ✅ |
| `local.computer.click` | local | **computer_use** | REVERSIBLE | — |
| `local.computer.type_text` | local | **computer_use** | REVERSIBLE | — |
| `local.computer.key` | local | **computer_use** | REVERSIBLE | — |
| `local.data.health` | local | api | READ | ✅ |
| `local.data.get_meta` | local | api | READ | ✅ |
| `local.data.set_setting` | local | api | REVERSIBLE | — |

census 결론: 화면 좌표 fallback(`computer_use`)을 쓰는 tool 은 `local.computer.*` **넷뿐**이다.
나머지 전부는 결정적 구조화 수단(`api`)이다. `browser_dom`·`windows_uia` 를 쓰는 tool 은 **0개**.

---

## 2. 발견한 drift (§37)

핵심 drift 는 **라우팅 순서 위반이 아니라 어휘의 부재**였다.

- 라우팅(`ai-tool-router.ts`)은 이미 구조화 수단을 먼저 고르고 `computer.*` 는 명시적 의도가
  있을 때만 선택한다 — Deterministic First 를 **행동으로는** 이미 지키고 있었다.
- 그러나 tool 이 "어떤 자동화 수단인가(HOW)" 와 "얼마나 위험한가(risk)" 를 **선언할 자리가
  없었다.** executionMode 하나가 WHERE 와 HOW 를 뭉뚱그리고 있었고, readOnly 하나가 "되돌릴
  수 있는 입력" 과 "결제·주문 확정" 을 구분하지 못했다.
- 따라서 이번 realignment 는 **HOW 축(automationMethod)과 risk 축(riskLevel)을 추가**하고,
  둘을 강제하는 drift 가드를 두어 미래 tool 이 분류를 건너뛰지 못하게 한 것이다.

---

## 3. 두 축 분리 (§13·§14)

`automation-execution-contract.ts` (신규 · 순수 · registry import 없음 — 순환 방지):

- `AutomationMethod = 'api' | 'browser_dom' | 'windows_uia' | 'computer_use'` — HOW 축.
- executionMode(WHERE)와 **곱집합**이다. 예: `local + computer_use` = 사용자 PC 에서 화면
  좌표로; `local + api` = 사용자 PC 에서 구조화 명령으로.
- `api` 는 W1(§6)/P1(§7)만이 아니라 아직 browser_dom/windows_uia 로 세분되지 않은 **모든
  결정적 수단**을 담는 상위 라벨이다. 후속 WO 가 그중 일부를 승격시킨다.

---

## 4. Canonical stack — Deterministic First (§5·§6·§7)

`AUTOMATION_METHOD_PREFERENCE = ['api','browser_dom','windows_uia','computer_use']` 하나가
Web 스택(W1 API → W2 DOM → W3 접근성 → W4 Computer Use)과 Windows 스택(P1 native API →
P2 UIA → P3 접근성 → P4 Computer Use) 모두의 "structured first, computer_use last" 를
표현한다. `computer_use` 는 언제나 배열의 마지막 = 항상 최후 수단(§9).

- `isMoreDeterministic(a,b)` — 선호 순서 비교.
- `isComputerUseMethod(m)` — fallback 계층 판정 단일 지점.

---

## 5. Method 결정 함수 (§39·§40·§41)

`resolveAutomationMethod({availableMethods, riskLevel, fallbackReason?})` — 순수 함수,
실행하지 않음(eligibility-only, V0 허용 범위):

1. 선호 순서대로 **구조화 수단**(computer_use 이전)이 available 이면 그것을 쓴다.
2. computer_use 만 남았으면:
   - `fallbackReason` 없으면 → `FALLBACK_REASON_REQUIRED` 로 막는다(§41 structured-first 가드).
   - 위험 등급이 자동 fallback 을 허용 안 하면 → `HUMAN_REQUIRED` 로 막는다(§17·§19).
3. 아무 수단도 없으면 → `NO_METHOD_AVAILABLE`.

반환은 평평한 형상(`strictNullChecks:false` — union narrowing 미동작).

---

## 6. 위험 등급 (§18·§19)

`AutomationRiskLevel = 'READ' | 'REVERSIBLE' | 'REVIEW_REQUIRED' | 'COMMIT'`.
`computerUseFallbackAllowed()` = READ·REVERSIBLE 만 true. REVIEW_REQUIRED·COMMIT 는 화면
자동화로 **자동 진입하지 않는다** — 로그인/비밀번호/OTP/결제/구독/최종 주문 확정/게시·전송/삭제/
계정 설정 변경(§17)은 사람이 하거나 명시적 확인이 있어야 한다. V0 registry 에 REVIEW_REQUIRED·
COMMIT tool 은 아직 없다.

---

## 7. Fallback 사유 (§16)

`FALLBACK_REASON` = `STRUCTURED_METHOD_NOT_AVAILABLE` · `STRUCTURED_TARGET_NOT_FOUND` ·
`DOM_ELEMENT_NOT_FOUND` · `UIA_CONTROL_NOT_FOUND` · `ACCESSIBILITY_UNAVAILABLE`.
Computer Use 진입에는 이 사유가 반드시 필요하다(§41). `isFallbackReason()` 로 판정.

---

## 8. Prompt injection 경계 (§32·§33)

`ContentProvenance = 'user' | 'system' | 'webpage' | 'local_app_ui'`. `isCommandAuthoritative()`
= user·system 만 true. **웹페이지·로컬 앱 화면에서 읽은 내용은 명령 권한이 없다** — 거기
"이전 지시를 무시하라" 가 적혀 있어도 O4O system/tool 정책으로 해석하지 않는다(UNTRUSTED CONTENT).

---

## 9. MCP 판단 (§20·§21·§22)

MCP 는 **tool 을 노출하는 인터페이스이지 자동화 엔진이 아니다**. 이번 WO 에서 MCP 를 구현하지
않았다 — automationMethod 축에 MCP 를 넣지 않은 이유가 이것이다. MCP 서버가 생기더라도 그것은
tool 을 어떻게 노출하느냐(전송)의 문제이고, 그 tool 이 내부적으로 api/dom/uia/computer_use 중
무엇으로 실행되는가는 그대로 이 계약이 정한다. 판단만 하고 구현은 하지 않았다.

---

## 10. Native Bridge / MV3 정책 정합

Chrome Extension/Native Bridge V0(PASS)의 삼중 allowlist(확장/agent/서버)·deterministic 확장
ID·HKCU native host 는 그대로 유효하다. 이 WO 는 그 위에 **HOW 축의 어휘**만 얹었다 —
`browser_dom` 은 그 확장/DOM 경로가 실제 tool 로 승격될 때(후속 Browser DOM Control WO) 쓰일
자리이며, 지금은 축만 예약돼 있다. Native Bridge 계약·MV3 매니페스트·allowlist 는 무변경.

---

## 11. 최소 refactor 확인 (§38·§48)

- ❌ DOM 실행기 구현 — 하지 않음.
- ❌ UIA 실행기 구현 — 하지 않음.
- ❌ MCP 구현 — 하지 않음.
- ❌ DB schema 변경 · migration — 0.
- ❌ Local Agent 프로토콜 전면 재작성 — 하지 않음.
- ✅ 순수 계약 모듈 신규 + registry 메타 2필드 + drift 가드 함수 + 테스트 — 이것뿐.

§48 STOP 조건(DOM/UIA 구현 없이는 realignment 불가 / MCP 필요 / DB schema 변경 / Local Agent
프로토콜 재작성)은 **어느 것도 발생하지 않았다.** 계약·문서·가드 수준에서 realignment 가 성립했다.

---

## 12. Drift 가드 (§37)

`findAutomationInvariantViolations()` — 런타임 throw 없이 위반 목록만 반환(서버 기동 안전).
강제는 테스트가 "위반 0건" 을 단언해서 한다. 검사 불변식 3개:

1. `readOnly ⇔ riskLevel==='READ'`.
2. `automationMethod==='computer_use' ⇔ 이름이 'local.computer.*'`.
3. computer_use tool 은 자동 fallback 허용 위험 등급(READ·REVERSIBLE)이어야 함.

미래 tool 이 HOW/risk 를 잘못 분류하거나 생략하면(필드 required → tsc 실패, 또는 가드 위반 →
테스트 실패) 즉시 드러난다.

---

## 13. 테스트 (§43)

신규 `apps/api-server/src/__tests__/automation-execution-layer.spec.ts` — **19항목 PASS**
(최소 17 초과). 축(§13)·registry 메타(§14·§15)·위험 등급(§18)·resolveAutomationMethod
(§39~§41)·fallback 사유(§16)·prompt injection 경계(§32·§33)·drift 가드(§37) 전부 고정.
실제 DOM/UIA/화면 조작은 부르지 않는다(계약 함수·메타데이터만).

---

## 14. 검증 게이트

| 게이트 | 결과 |
|---|---|
| `tsc --noEmit` (api-server) | **PASS (0)** |
| jest 신규 spec | **19/19 PASS** |
| jest 회귀 (ai-capability · computer-use · browser-* · local-* · windows-* · security) | 이번 변경 유발 실패 **0건** (아래 §15 참조) |
| eslint (신규·수정 3파일) | **PASS (0)** |
| agent `node --test` (local-db · native-bridge 회귀) | **42/42 PASS** |
| cloud DB migration / schema / raw write | **0 / 0 / 0** |

---

## 15. 사전 존재하던(무관한) 테스트 실패 — 정직 보고

신규 worktree(clean origin/main `e0a8e96c8`)에서 **내 변경을 stash 하고** 회귀 스펙을 돌린
결과와 내 변경 적용 후 결과가 **동일**하다(11 failed / 235 passed, byte-identical). 즉 아래
실패는 **전부 origin/main 에 이미 존재**하며 이번 WO 와 무관하다(CLAUDE.md 중지 조건: "현재
변경과 무관한 build·test 실패" → 수정하지 않고 보고):

1. `ai-capability-tool-routing.spec.ts` — "registry 는 … browser-mode tool 은 0 이다":
   하드코딩된 `allowedEffects` 목록에 `LOCAL_DATA_WRITE` 가 빠져 있다(Local Data Tool Bridge
   Closure 가 effect 를 추가했으나 이 스펙이 갱신 안 됨). **stale 스펙 — 별도 정비 대상**.
2. `ai-capability-tool-routing.spec.ts` · `windows-app-window-control.spec.ts` — "한글 의도
   키워드 ASCII 이스케이프 / 번들 후 생존": esbuild 번들 기반 검사, 신규 worktree 환경 이슈.
3. `local-agent-oneclick-pairing.spec.ts` — localhost origin/nonce 8건: HTTP 서버·포트 기반,
   신규 worktree 환경 이슈.

**이번 WO 코드는 이 실패 중 어느 것도 유발하지 않았고, 어느 것도 건드리지 않았다.**

---

## 16. 문서 정합 (§44) · 후속

**문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건**

- 발견: `docs/baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md` §13(현재 불가능/미구현) · §14(Home AI
  향후 단계)가 tool calling · Local Work Agent · Browser/Computer Use · Local SQLite 를 **"전부
  미구현"** 으로 적고 있으나, 이들은 이미 V0 로 구현·검증(Tool Routing/Agent/Browser Control/
  Computer Use/Local Data/Chrome Extension 트랙 = CLOSED/PASS)됐다.
- 처리: 이 절은 **본문 내용 변경**(§16-4 인라인 금지 — 기준 문서 내용 수정)이며, SUPERSEDED
  대상도 아니다(문서 전체가 폐기된 게 아니라 §13/§14 만 stale). 따라서 **인라인 수정하지 않고
  보고**한다.
- 별도 WO 제안: `WO-O4O-AI-USAGE-FLOW-BASELINE-V1 §13·§14 realignment` — 자동화 스택이 미구현
  → 구현·검증됨으로 현행화. (본 CHECK 와 각 트랙 CHECK 를 근거로.)

**후속 (미착수, 이 WO 밖):**
- Browser DOM Control V0 — `browser_dom` 을 쓰는 첫 실제 tool. Chrome Extension/Native Bridge
  V0 위에 DOM 실행기를 얹는다.
- Windows UI Automation V0 — `windows_uia` 를 쓰는 첫 실제 tool.
- 위 §15-1 stale 스펙(`allowedEffects` 에 `LOCAL_DATA_WRITE` 추가) 정비.
- §15-2·§15-3 신규 worktree 환경 의존 테스트(esbuild 번들 · localhost pairing) 재현/정비.
