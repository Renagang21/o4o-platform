# CHECK-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-C-TASK-MODALITY-ROUTER-V1

> **선행**: [Capability A](CHECK-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-A-GEMINI-WEB-RESEARCH-V1.md)(CLOSED · `runWebResearch`) · [Capability B](CHECK-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-B-ASTRA-SCREEN-V1.md)(B0 PASS · B1 `4de158a09`)
> **상태**: **구현 완료 · 성공 기준 A~F 단위 실증** — `/hospital-drug` 재연결(단계 D)은 이 WO 아님
> **작성일**: 2026-09-19
> **provider 정책 정정(사용자 · 2026-09-19)**: `AI_DEFAULT_PROVIDER` 를 openai 로 바꾸지 않는다. 운영 기본 provider = **gemini 유지**. provider 는 **per-task 실행 결정**이며 Capability C 가 modality 별로 `requestedProvider` 를 명시한다. (Capability B CHECK §4-1 의 "전환 시에만 탄다" 표현은 이 정정으로 대체.)

---

## 1. 설계 — 얇은 Task Modality Router

파일: [task-modality-router.ts](../../apps/api-server/src/services/ai-tools/task-modality-router.ts) (순수 · DB/AI 호출 0)

```text
classifyTaskModality({ request, targetHint?, image?, hasVerifiedWorkflow? })
  ① hasVerifiedWorkflow(request)                          → workflow  (provider null · deterministic)
  ② resolveWorkTarget(request, targetHint) 있음           → screen    (등재부 경유 · reason registered_target|target_hint)
     image.provenance === 'screen_capture'               → screen    (reason screen_image)
  ③ UI 어휘(화면·버튼·클릭·눌러·입력창·메뉴·팝업·스크롤…)   → screen    (reason ui_interaction_vocabulary)
  ④ 조사 어휘(조사·검색·알아봐·비교·요약·최신·뉴스·설명해…) → research  (reason research_vocabulary)
  ⑤ 그 밖                                                  → question  (reason no_execution_surface)

MODALITY_PROVIDER = { workflow: null, screen: 'openai', research: 'gemini', question: null }
executor          = { workflow, vision_planner(B), web_research(A), question }
```

- taxonomy 4개 고정(research · screen · workflow · question). 세분화 없음.
- **workflow** 는 주입 hook(`hasVerifiedWorkflow`)이 있을 때만 — PHASE 2 Workflow 저장소가 붙기 전엔 절대 나오지 않는다. 새 Workflow Engine 0.
- **question** 은 실행 표면·조사 대상이 모두 없을 때(무엇을·어디서를 사용자가 정해야 함). 런타임의 QUESTION/TAKEOVER/same-run 은 그대로(이 모듈은 실행 **전** 1회 판정).
- 등재 대상이 있으면 조사 어휘가 있어도 screen("그 사이트에서 찾아줘" 는 그 화면에서 하는 일).
- 모델 이름은 router 에 없다(provider 만) — 모델은 `resolveAiTarget(ds, provider)` 가 admin/env SSOT 로 정한다. 업종·사이트·약품 키워드 0(소스 계약 테스트로 고정) · 비용 점수 0 · AI classifier 0 · UI 노출 0.

## 2. 배선 — per-task provider

| 위치 | 변경 |
|---|---|
| [work-agent-runtime.ts](../../apps/api-server/src/services/ai-tools/work-agent-runtime.ts) | `createPlannerTargetResolverForProvider(provider, strong)` · `createLlmPlannerForProvider(ds, provider)` · `createStrongLlmPlannerForProvider(ds, provider)` — `resolveAiTarget(ds, provider)` / `resolveStrongAiTarget(ds, provider)` 로 **요청 인자**만 명시. 요청한 provider 의 키가 없으면 planner 를 죽이지 않고 전역 기본 provider 로 fallback + 경고 1회 |
| [ai-proxy.routes.ts](../../apps/api-server/src/routes/ai-proxy.routes.ts) `performWorkAgentRun` | `classifyTaskModality({request, targetHint, image})` → `screen` 이면 planner 쌍(일반+strong)을 `openai` 로 생성 → Capability B vision 분기가 탄다. 그 외는 기존 `createLlmPlanner`(전역 기본). 로그는 `modality/reason/provider` 만(문장·이미지 없음) |
| 기존 unified router(`/api/ai/request` chat\|work\|confirm\|composite) | 불변. modality 판정은 work 본체 안에서만 |
| 전역 `AI_DEFAULT_PROVIDER` · `resolveProvider` · Safety · QUESTION/resume · Capability A/B 본체 | 불변 |

research 의 실 소비(`runWebResearch` 호출)는 **단계 D**에서 실업무(`/hospital-drug` 등)에 연결한다 — Capability A CHECK §6 순서 그대로. 이 WO 는 판정+executor 이름까지.

## 3. 성공 기준 실증 ([task-modality-router.spec.ts](../../apps/api-server/src/__tests__/task-modality-router.spec.ts) 9/9 · [unified-request-http.spec.ts](../../apps/api-server/src/__tests__/unified-request-http.spec.ts) ②-C)

| 기준 | 실증 |
|---|---|
| A `이 제품에 대해 조사해줘` → research → Gemini Web Research | modality research · provider gemini · executor web_research (+ 비교/요약 · 영어 look up) |
| B `현재 이 화면에서 다음 버튼을 찾아 진행해줘` → screen → OpenAI/Astra image planner | modality screen · reason ui_interaction_vocabulary · provider openai · executor vision_planner (대상 이름 없이도) |
| C 검증된 반복 업무 → workflow | hook 주입 시 workflow(provider null) · hook 없으면 절대 workflow 아님 · hook 이 등재 대상보다 우선 |
| D 사용자 고유 정보 부족 → question | `그거 해줘` · 빈 문장 · user_image 만 있는 요청 → question · no_execution_surface |
| E 전역 기본 gemini 여도 screen task 가 Astra 경로 | resolver 실증: `resolveAiTarget(ds,'openai')` 호출 · `process.env.AI_DEFAULT_PROVIDER` 불변 / HTTP: work 요청 → planner 팩토리 호출 `['provider:openai','provider-strong:openai']` · 로그 `modality=screen provider=openai` |
| F `/hospital-drug` 없이 성립 | 모든 예문 일반어 · 소스 계약: router 에 `gpt-` `gemini-` `astra` `hospital` `health.kr` `doctors` `약학정보원` `닥터스` `약국` `우루사` `타이레놀` `cost` `score` 0 · `execute(`/`fetch(` 0 |
| 키 부재 fallback | openai 키 빈 값 → gemini target 반환 + `falling back` 경고 |

## 4. 검증 (self)

| 항목 | 결과 |
|---|---|
| jest 7 suites(`task-modality-router` 9 · `unified-request-http` · `work-agent-llm-closure` · `work-agent` · `work-agent-visual-fastloop` · `ai-multi-provider-runtime` · `local-agent-runtime`) | **154/154** |
| `tsc --noEmit`(api-server) | EXIT 0 |
| eslint(변경 5파일) | 0 errors |

## 5. 운영 전제 · PENDING

- 운영 `o4o-core-api` env 에 `OPENAI_API_KEY` 설정 확인(이름만 · 값 미열람). 키가 비면 §2 fallback 으로 gemini planner 로 돌아간다(중단 없음).
- **비용 주의**: work 경로의 모든 Goal(등재 대상 있음 = screen) 이 이제 openai(gpt-6-astra · 입력 $10/M)로 간다. 이전(gemini)과 달라지는 첫 운영 배포 — 실측 후 planner 호출 수·비용을 CHECK 에 추가 기록할 것.
- PENDING: (1) 운영 실측 — Local Agent 연결 PC 에서 work 요청 1건 → 서버 로그 `work-agent task modality {modality:'screen', provider:'openai'}` + planner 응답 정상 (2) `runWebResearch` 실 소비 = 단계 D (3) workflow hook = PHASE 2.

```text
CAPABILITY_C_ROUTER  = DONE (taxonomy 4 · 결정론 · 도메인 키워드 0)
PER_TASK_PROVIDER    = DONE (screen→openai · research→gemini · 전역 provider 불변 · 키 부재 fallback)
A~F                  = PASS (단위 · HTTP 계약)
PROD_MEASURE         = PENDING (agent 연결 환경)
NEXT                 = 단계 D — /hospital-drug contextual 재연결(runWebResearch 실 소비 + admin 실계정 운영 통합 smoke)
```
