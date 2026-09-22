# CHECK — WO-O4O-COMMON-AUTOMATION-CORE-INTEGRATION-AND-CLOSURE-V1

> 대상: O4O Main 공통 자동화 Core **전체 통합 점검·잔여 구조결함 정리·트랙 종결**
> 결과: **PASS · CLOSED** — `AUTOMATION_CORE_STATUS = READY_FOR_SURFACE_ADOPTION`
> 일자: 2026-09-21
> 성격: 개별 capability 재분할 아님(§0). 하나의 공통 환경으로 통합 판정하고 닫는다.

---

## 1. 한 줄 요약

Gemini Web Research · Astra Screen · Task Modality Router · Generic File Understanding · QUESTION/resume · Workflow/deterministic · Context 를 **하나의 결정론 2-tier 라우팅 공통 환경**으로 통합 점검했다. 공통 Core 의 판정 경로는 도메인 중립·건전하며, 발견된 결합 1건은 tool-실행 계층의 surface co-location(비-blocking REALIGN)으로 **개별 서비스로 내려가지 않고 보고**한다(§13/§14). 새 구조 수정 없이 통합 테스트·기존 실 smoke 로 건전성을 실증하고 트랙을 닫는다.

## 2. 통합 아키텍처 (as-verified)

```
POST /api/ai/request
  └─ classifyUnifiedRequest (unified-request-router.ts)   ← chat vs work, 결정론·AI 0회
       ├─ chat  → performHomeChat / document_attached
       └─ work  → performWorkAgentRun
                    └─ classifyTaskModality (task-modality-router.ts)  ← 결정론·AI 0회
                         ├─ workflow (hasVerifiedWorkflow, prod 미주입 → dead path)
                         ├─ screen   → provider=openai (gpt-6-astra vision)
                         ├─ research → provider=gemini (google_search grounding)
                         └─ question → provider=null (QUESTION/resume)
```

- **provider 정책**: `MODALITY_PROVIDER`(task-modality-router.ts, Object.freeze) `{workflow:null, screen:'openai', research:'gemini', question:null}` — task 단위. 전역 `AI_DEFAULT_PROVIDER=gemini` 불변.
- **파일 축 분리**: document/spreadsheet 첨부는 task modality 가 아니라 unified-request-router `document_attached → chat`.
- **resolveWorkTarget** = 두 라우터 공유 SSOT. 등재 site/app allowlist(canonical id)만 통과 — AI 가 URL 합성 불가.
- **모든 판정 결정론(AI 호출 0)**. AI 는 실행 payload(research 질의·screen vision·file 구조해석)에서만 호출.

## 3. 통합 판정표 (§12 대상 × §13 카테고리)

| # | 대상 | 판정 | 근거 |
|---|---|---|---|
| 1 | Unified Composer entry (`POST /api/ai/request`) | **KEEP** | 단일 목표 진입점·결정론 분기 |
| 2 | unified-request-router (chat vs work) | **KEEP** | 도메인 무관 분류·AI 0회 |
| 3 | task-modality-router (workflow/screen/research/question) | **KEEP** | 정책 순서 명시·provider 매핑 freeze |
| 4 | resolveWorkTarget (공유 SSOT) | **KEEP** | 등재 allowlist·URL 합성 불가 |
| 5 | web-research.service (`runWebResearch`) | **KEEP** | Gemini grounding·특정 Source 강제 없음 |
| 6 | Work Agent runtime (Astra vision 분기) | **KEEP** | openai/image → Astra, gemini vision 존치(additive) |
| 7 | Generic File Understanding (`file-understanding/`) | **KEEP** | 도메인 result type 미import·구조만 AI |
| 8 | attachment pipeline (extractSpreadsheetText) | **DEFER_TO_SURFACE** | File Understanding 배선은 surface 소유 TargetSchema 필요 |
| 9 | Context transfer paths | **KEEP** | run scope·observation 미영속 |
| 10 | QUESTION / same-run resume (coordination) | **KEEP** | version-checked optimistic claim·observation 미영속(stale 구조적 불가) |
| 11 | workflow candidate / store | **MISSING_COMMON_CAPABILITY** | §10 census-only·§15 새 Workflow Engine 금지 → 미구축 유지 |
| 12 | recovery contract (automation-recovery-contract) | **KEEP** | 티어 escalation·권한 상향 없음·RISK_BLOCKED→TAKEOVER |
| 13 | site/app registry (BROWSER_SITE/WINDOWS_APP) | **KEEP** | 코드 상수 allowlist·DB 미의존 |
| 14 | MODALITY_PROVIDER per-task 정책 | **KEEP** | freeze·전역 provider 불변 |
| 15 | **pharmacy-web-core 결합(ai-tools 3파일)** | **REALIGN** | tool-실행 계층 surface co-location. 판정 경로 무오염·비-blocking. §14 로 지금 내려가지 않고 보고(§4) |
| 16 | hospital-drug-surface (도메인 어휘 소유) | **HISTORICAL_ONLY / CONSUMER** | 공통 Core 아님·§14 불가침·surface 소비자 |
| 17 | 구 hospital-drug-composite (health.kr+SQLite 고정) | **HISTORICAL_ONLY** | SUPERSEDED 표기·미배선 |
| 18 | Public API (PUBLIC_DRUG_API/MFDS) | **DEFER_TO_SURFACE (EXCLUDED)** | Core runtime 0회·seed 파이프라인 별개 |

**REMOVE_SPECIAL_CASE 대상 = 없음.** 공통 판정 경로에 도메인 로직 오염 없음.

## 4. 유일 구조결함(REALIGN #15) — 보고·비-descent 판정

- **사실**: 공통 ai-tools 라우팅 3파일(`work-target-resolver.ts` · `unified-request-router.ts` · `ai-tool-router.ts`)이 도메인명 모듈 `local-agent/pharmacy-web-core.ts` 를 직접 import 해 site alias/resolver 를 끌어온다.
- **성격**: **결합(coupling)이지 로직 오염 아님.** 라우터의 *판정 로직*은 도메인 무관이고, 가져오는 것은 등재 site alias 문자열뿐이다. 특히 `ai-tool-router.ts` 는 pharmacy-web **tool 실행 로직 전체**(pill 식별 파싱·drug intent·entrypoint 실행)를 co-locate 하고 있어, 결합을 근본 해소하려면 **pharmacy-web surface 를 tool 라우터에서 추출**해야 한다.
- **판정(§13/§14)**: 그 추출은 **개별 surface 로 내려가는 작업**이며 이 통합-종결 WO 의 §14(개별 서비스 불가침)·§13(개별 서비스 문제 발견 ≠ 진입)가 금지한다. 2파일만 중립 aggregator 로 바꾸는 부분 수정은 `ai-tool-router.ts` 가 여전히 도메인 로직에 포화된 상태라 **cosmetic**이고 라우팅 hot path churn 만 남긴다. → **이번 WO 에서 코드 수정하지 않고 REALIGN 으로 보고**한다. surface 채택 단계(§19)의 bounded cleanup 이다.
- **영향 없음 확인**: `task-modality-router.ts` · `work-agent-runtime.ts` · `ai-proxy.routes.ts` 는 pharmacy-web-core 를 import 하지 않는다(결정 hot path 무오염).

## 5. 검증

### 5-A. 통합 결정론 테스트 (기존 하네스 재사용 · 키 불요)

| 스위트 | 결과 |
|---|---|
| task-modality-router.spec | PASS |
| unified-request-router.spec | PASS |
| work-target-discovery.spec | PASS |
| pharmacy-web-core.spec | PASS |
| hospital-drug-composite.spec | PASS |
| file-understanding.spec | PASS |
| automation-recovery.spec | PASS |
| **소계 (결정론 라우팅·계약)** | **7 suites / 96 tests PASS** |
| work-agent.spec · work-agent-llm-closure.spec · work-agent-recovery-runtime.spec · work-agent-visual-fastloop.spec · hospital-drug-surface.spec · unified-request-http.spec | PASS |
| **소계 (Work Agent 실행·resume·HTTP·surface 격리)** | **6 suites / 73 tests PASS** |
| **통합 합계** | **13 suites / 169 tests PASS** |

`npx tsc --noEmit -p tsconfig.json` = **0 에러**(전체).

### 5-B. E2E 5 시나리오(§11) — 근거 매핑

| 시나리오 | 판정 | 근거 |
|---|---|---|
| A. Research | **PASS** | task-modality research 라우팅 + web-research.service.spec + 실 grounding smoke PASS(a5d56fd04) |
| B. Screen | **PASS** | screen 라우팅 + Astra 실 smoke PASS·운영 배포($10 크레딧) |
| C. File | **PASS** | file-understanding.spec 12 + 실 Gemini 구조해석 smoke PASS(1f4538d42) |
| D. File+Research | **PASS** | hospital-drug-surface research_and_local plan(research=runWebResearch+local) 결정론 spec |
| E. Missing→QUESTION→resume | **PASS** | modality question 경로 + coordination same-run resume(observation 미영속) |

실 API 키 smoke(A/B/D)는 **이미 통과·기록된 결과를 근거로 인용**한다. §15(per-smoke 재승인 금지)에 따라 재실행/재승인 요청하지 않는다.

## 6. §18 완료 키

| 키 | 값 |
|---|---|
| UNIFIED_GOAL_ENTRY | PASS |
| TASK_MODALITY_ROUTING | PASS |
| GEMINI_RESEARCH | PASS |
| ASTRA_SCREEN | PASS |
| GENERIC_FILE_UNDERSTANDING | PASS |
| CONTEXT_INTEGRATION | PASS |
| QUESTION_RESUME | PASS |
| FAILURE_RECOVERY | PASS |
| WORKFLOW_CANDIDATE | CENSUS_ONLY (결정론 hasVerifiedWorkflow 경로 존재·store 미구축 §10/§15) |
| DETERMINISTIC_PATH | PASS (판정 AI 0회) |
| SPECIAL_CASE_POLLUTION | NONE_IN_DECISION_PATH (tool-exec 계층 REALIGN 1건 보고) |
| SAFETY_REGRESSION | NONE |
| E2E_GENERIC_SCENARIOS | PASS |
| PRODUCTION_SMOKE | PASS (A/B/D 실 smoke 기존 기록) |
| **AUTOMATION_CORE_STATUS** | **READY_FOR_SURFACE_ADOPTION** |

## 7. 경계 준수

- 개별 capability 재분할 안 함(§0). 개별 서비스(hospital-drug parser·content·POS·inventory/order/sales) 무접촉(§14).
- 새 Workflow Engine·public API·WebMCP·Astra 권한 상향·전역 provider 변경·main UI 개편 안 함(§15).
- 코드 수정 0(REALIGN 은 보고). 신규 저장소·packages 승격 없음. 다른 세션 dirty 파일(admin-dashboard 2건) 불가침.
- API 키는 env 로만·코드/문서/로그에 미기록.

## 8. 후속(§19 · 이번 범위 아님)

- **개별 서비스는 이제 완성된 자동화 환경의 CONSUMER 로 전환**된다.
- REALIGN #15: surface 채택 단계에서 pharmacy-web tool 을 ai-tool-router 에서 추출 + 중립 site aggregator 도입(별도 WO).
- attachment → File Understanding 배선(surface 소유 TargetSchema, DEFER_TO_SURFACE #8).

---
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(REALIGN #15 surface 추출)
