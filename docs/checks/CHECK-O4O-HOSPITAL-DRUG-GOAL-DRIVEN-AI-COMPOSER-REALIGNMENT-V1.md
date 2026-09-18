# CHECK-O4O-HOSPITAL-DRUG-GOAL-DRIVEN-AI-COMPOSER-REALIGNMENT-V1

> **대상 WO**: `WO-O4O-HOSPITAL-DRUG-GOAL-DRIVEN-AI-COMPOSER-REALIGNMENT-V1`
> **표기일**: 2026-09-18
> **판정**: 증분 1 = COMPLETE (전역 Router 오염 제거 · surface 격리 · 예시문구 일반화).
> 증분 2 = **STOP (구조적 차단)** — 착수 게이트 조사 결과 "검색=Gemini · 화면=Astra" 두 전제가 모두
> 현재 코드에 **없다**(§11 게이트). 코드 변경 없이 원인·최소 대안만 보고. 아래 **증분 2 착수 게이트 판정** 절 참조.

이 CHECK는 본 WO를 **두 증분**으로 나눠 그 중 **증분 1(전역 Router 병원 특수 규칙 격리)** 를 기록한다.
핵심 원칙("고정되는 것은 Source가 아니라 Context다")에서, 이번 증분은 **전역 Router에서 병원 특수 규칙을
빼고 그 결정을 hospital-drug 화면(surface)으로 격리**하는 데까지다. Composite 오케스트레이션 **내부 구현은
바꾸지 않았다** — health.kr 웹 + Local SQLite 결합 로직은 그대로다(§17 not-doing 준수: 새 Workflow Engine·
공공 API 신규·MFDS client·HIRA 색인·Local Agent 재설계 없음).

---

## 15. 구현 전 조사 (census 판정)

| # | 대상 | 판정 | 근거 |
|---|---|---|---|
| 1 | `unified-request-router.ts` | REMOVE_FROM_GLOBAL_ROUTING | `hospital-drug-composite` import·`composite` route·`isCompositeHospitalDrugRequest`·전역 가로채기 |
| 2 | `hospital-drug-composite.ts` | KEEP (술어만 이관) | 결합 오케스트레이터 내부 불변. composite 경계 술어(`isCompositeHospitalDrugRequest`)를 이 모듈로 이관 |
| 3 | `/api/ai/request` | ISOLATE | composite 결정을 HTTP 계층에서 `surface==='hospital-drug'` 로만 게이트 |
| 4 | `HospitalDrugPage.tsx` | ISOLATE | `surface:'hospital-drug'` 전송 · 예시문구에서 하드코딩 Source(약학정보원) 제거 |
| 5 | Work Agent planner | KEEP (FOLLOW-UP) | goal별 모델 선택 미존재 — 증분 2에서 구축 |
| 6 | Gemini provider/runtime | KEEP (FOLLOW-UP) | 조사 경로 재배선은 증분 2 |
| 7 | Astra/OpenAI provider/runtime | KEEP (FOLLOW-UP) | `gpt-6-astra`는 provider 아님(OpenAI 모델 id). 화면 실행 재배선은 증분 2 |
| 8 | Local Context 전달 | KEEP (FOLLOW-UP) | 현재 Local SQLite 조회는 composite 내부 경로. surface Context 주입은 증분 2 |
| 9 | `healthkr` registry/adapter | KEEP | 범용 재사용 자산 — composite의 하드코딩 entryPoint 문자열만 SUPERSEDE 후보(증분 2) |
| 10 | tests/CHECK/WO | ISOLATE | 3개 spec 갱신 · 본 CHECK 신설 |

**PUBLIC_DRUG_API_SERVICE_KEY** 는 이번 증분에서 손대지 않았다 — runtime 미배선 상태 그대로(스크립트·문서 외
소비처 0). 인증키는 코드·문서·테스트·로그 어디에도 기록하지 않는다.

---

## 변경 요약 (증분 1)

**전역 Router 오염 제거** — `apps/api-server/src/services/ai-tools/unified-request-router.ts`
- `hospital-drug-composite` import 삭제.
- `UnifiedRoute` 에서 `'composite'` · `UnifiedRouteReason` 에서 `'hospital_drug_composite'` 삭제.
- `isCompositeHospitalDrugRequest` 함수 삭제 + `classifyUnifiedRequest` 의 composite 가로채기 삭제.
- 이제 이 pure Router 는 hospital-drug module 을 import 하지 않는다.

**Composite 경계 = 화면(surface)** — `apps/api-server/src/routes/ai-proxy.routes.ts`
- `isCompositeHospitalDrugRequest` 를 `hospital-drug-composite.js` 에서 import.
- `POST /api/ai/request` 에서 classify **이전에** `!runId && body.surface === 'hospital-drug' &&
  isCompositeHospitalDrugRequest(text)` 일 때만 composite 로 분해. runId 재개가 우선.

**경계 술어 이관** — `apps/api-server/src/services/ai-tools/hospital-drug-composite.ts`
- `isCompositeHospitalDrugRequest` 를 이 모듈로 이관(내부 `extractProduct/mentionsHospital/mentionsSameIngredient` 재사용).

**클라이언트 surface 전송** — `services/web-neture/src/lib/ai/unified-request.ts`
- `UnifiedRequestInput.surface?: 'hospital-drug'` 추가 · POST 본문에 additive 전송.

**hospital-drug 화면** — `services/web-neture/src/pages/HospitalDrugPage.tsx`
- `sendUnifiedRequest({ ..., surface: 'hospital-drug' })`.
- 예시문구 `'리피토정 동일성분 의약품 약학정보원에서 찾아줘'` → `'리피토정과 동일성분 의약품 찾아줘'`
  (Source(약학정보원) 하드코딩 제거 · Context 는 유지).

---

## 검증

- `apps/api-server` `tsc --noEmit` PASS.
- `services/web-neture` `tsc --noEmit` PASS.
- jest: `unified-request-router.spec` · `unified-request-http.spec` · `hospital-drug-composite.spec` — **50/50 PASS**.
  - router: 전역 Router 가 composite 를 내지 않음(등재 사이트 업무어→work · 등재 없음 원내문장→chat).
  - http: `surface='hospital-drug'` 결합요청→composite(1회) · **surface 없으면 composite 로 라우팅되지 않음**(오염 제거 직접 확인).
- vitest: `HospitalDrugPage.test.tsx` — **7/7 PASS**(composite 응답 렌더 포함).
- 배포 간극: 클라이언트가 web 먼저 배포되어 `surface` 를 보내도 구 API 는 무시(additive) → 잠깐 chat 로 강등될 뿐 파손 없음. 반대로 API 먼저 배포되면 surface 없는 요청은 기존대로 동작.

---

## 19. 완료 보고 (형식)

```text
A. 기존 global hospital-drug 결합 상태 = 제거됨 (pure Router 에서 composite route·reason·술어·import 삭제)
B. 메인 Unified Router 분리 = 완료 (홈 Composer 는 surface 미전송 → composite 불가 · hospital-drug module import 0)
C. hospital-drug Context 전달 구조 = 부분 (surface='hospital-drug' 로 화면 경계 전달 · Context 주입 재구축은 FOLLOW-UP)
D. Gemini 조사 경로 = FOLLOW-UP (증분 2 · 현재 composite 내부 health.kr 경로 유지)
E. Astra 화면 실행 경로 = FOLLOW-UP (증분 2 · Work Agent 경로는 기존대로 동작)
F. health.kr 위치 재정의 = 부분 (전역 Router 에서 제거 · adapter/registry 는 범용 자산 KEEP · composite 내부 문자열 SUPERSEDE 는 증분 2)
G. 공공 API runtime 제거/비사용 확인 = 확인 (PUBLIC_DRUG_API_SERVICE_KEY runtime 미배선 · 본 증분 무접촉)
H. Local Context 결합 = 유지 (composite 내부 Local SQLite 경로 불변 · surface 주입은 FOLLOW-UP)
I. Workflow/Recovery 회귀 = 없음 (work/confirm/resume 경로·테스트 불변)
J. UI 변경 = 예시문구 1건 일반화 (Source 하드코딩 제거) · 그 외 화면 불변
K. 테스트 = jest 50/50 · vitest 7/7 · tsc(api·web) PASS
L. PENDING = 프로덕션 실 PC smoke(무접촉) · 증분 2(goal-driven 재구축)
M. commit/CHECK = 본 CHECK + path-specific commit
```

```text
GLOBAL_HOSPITAL_DRUG_SPECIAL_ROUTING = REMOVED
HOSPITAL_DRUG_CONTEXTUAL_AI          = PARTIAL (surface 경계만 · 재구축 FOLLOW-UP)
GEMINI_RESEARCH_PATH                 = FOLLOW-UP
ASTRA_SCREEN_PATH                    = FOLLOW-UP
HEALTHKR_HARDCODE                    = REMOVED_FROM_GLOBAL_ROUTER (composite 내부 문자열은 증분 2)
PUBLIC_API_AUTOMATION                = NOT_WIRED (무접촉)
LOCAL_CONTEXT                        = UNCHANGED (composite 내부 유지)
WORKFLOW_REGRESSION                  = NONE
PRODUCTION_SMOKE                     = PENDING
```

---

## FOLLOW-UP (증분 2 — 미착수)

`/hospital-drug` 를 공통 Goal-driven Core 위에 재구축:
- 조사/검색 → Gemini · 화면 이해/조작 → Astra(`gpt-6-astra`) 로 **goal별 per-task 모델 선택 신설**(현재 미존재).
- 원내 약품 Excel = **Local Context surface 주입**으로 재배선(현 composite 내부 하드코딩 2-source 경로 대체).
- composite 의 하드코딩 entryPoint 문자열(`healthkr.same_ingredient` 등) SUPERSEDE 여부 재판정.

이는 신규 capability(모델 선택 런타임) 구축 = 구조적 증분이라 최소 수정 범위를 넘는다. 별도 착수 지시로 진행한다.

---

## 증분 2 착수 게이트 판정 (2026-09-18 · STOP)

증분 2 착수 승인을 받아, WO §11 이 요구한 **두 구조적 게이트를 코드 변경 전 실제 main(afe519c80) 기준으로
확인**했다. 두 게이트 모두 현재 코드에 **없다**. WO §7·§8·§11·§13 은 이 경우 "기능이 있다고 가정해 구현하지 않는다 ·
구조적 변경이 크면 STOP" 을 명령한다 → **코드 변경 0, STOP.**

### 게이트 1 — GEMINI_RESEARCH_CAPABILITY = ABSENT

Gemini 호출은 3개 지점 모두 순수 `generateContent`(텍스트/이미지 in → 텍스트 out)다. 어떤 요청에도
`tools`·`googleSearch`·`google_search_retrieval`·grounding 이 붙지 않고, provider config 타입에 그것을
표현할 필드조차 없다. AI-tools 계약에도 범용 web-search/fetch/research tool 이 없다(web 접촉 tool 은
전부 allowlist 사이트 DOM 자동화뿐).
- `packages/ai-core/src/orchestration/providers/gemini.provider.ts:57-69` — body = `system_instruction` +
  `contents`(text) + `generationConfig`. tools/grounding 없음.
- `packages/ai-core/src/orchestration/types.ts` `AIProviderConfig` — apiKey/model/temperature/maxTokens/
  responseMode/timeoutMs 만. tools/search 를 넘길 필드 없음.
- `apps/api-server/src/services/ai-tools/ai-tool-contract.ts` — `AI_TOOL_NAMES`/`AI_TOOL_REGISTRY` 에
  범용 웹조사 tool 없음. `browser` executionMode 는 비활성(`EXECUTABLE_MODES = ['server','local']`).

즉 "조사/검색 → Gemini" 를 실제로 구현하려면 **`@o4o/ai-core` provider 계약에 grounding/tool 입력을
신설**해야 한다(+ grounding 응답 파싱). 이는 공통 패키지 계약 변경 = 구조적 증분. WO §13 은 "새 대형 검색
시스템" 을 금지한다.

### 게이트 2 — ASTRA_SCREEN_CAPABILITY = ABSENT

이미지 입력은 **현재 Gemini 전용**이다. `gpt-6-astra`(=OpenAI 플래그십 모델 id, provider 아님) 는
스크린샷을 받지 못한다.
- `apps/api-server/src/services/ai-tools/work-agent-runtime.ts:253` — `if (input.image && provider === 'gemini')`
  일 때만 이미지를 `inline_data` 로 전송.
- 같은 파일 `:277` — openai 분기는 이미지를 버리고 프롬프트에 "이 provider 는 이미지를 볼 수 없다 · 필요하면
  takeover(user_judgment_required)" 를 적는다.
- `apps/api-server/src/services/ai-tools/multimodal-chat.ts:42` — inline 이미지/PDF 도 `provider === 'gemini'`
  전용, 그 외엔 "이미지·PDF 를 볼 수 없다" 안내 후 텍스트 경로.

즉 "화면 이해/조작 → Astra" 는 **현행 설계(Gemini = vision provider · openai = vision 없음 → takeover)를
역전**시켜야 한다. OpenAI vision content-part 구성 신설 + visual planner provider 게이팅 반전 = 구조적
provider 계약 변경. WO §7 은 이 경우 "가장하지 않고 capability gap·최소안·계약 변경 범위 보고, 크면 STOP" 을
명령한다.

### 판정 근거 — 왜 STOP 인가 (모달리티 라우팅에 실 target 이 없다)

증분 2 의 핵심 산출물은 "입력창 → 공통 Core → **Gemini/Astra/Local Context 선택**" 3분기다. 그중 두 분기의
실제 target 이 없다:
- "화면 → Astra" 라우팅을 지금 붙이면, 화면을 **못 보는** provider 로 보내는 것이라 오늘보다 **더 나쁘다**
  (오늘은 화면 국면에 Gemini vision 을 쓴다). 작동하는 vision 경로를 깨뜨린다.
- "조사 → Gemini" 는 실제 웹조사가 없어, 라우팅해도 그냥 텍스트 LLM 응답이다(약효 조사에 grounding 없는
  환각 위험). 라우팅할 실 capability 가 없다.

모델 선택 seam 자체(`resolveProvider(requestedProvider)`)는 `ai-provider-runtime.ts:88-94·201-211` 에 이미
있으나, **route 할 대상 capability 가 두 모달리티 모두 부재**하므로 지금 seam 을 배선하는 것은 "없는 기능을
있다고 가정한 구현"(§11 금지)이 된다.

### 안전하게 가능한 잔여 범위(참고 · 미착수)

- 성공기준 B("우리 원내에 이 약 있어?")의 **Local Context surface 주입**은 두 부재 capability 와 무관하게 분리
  구현 가능(현 composite `local_only` 경로 = SQLite). 단독 소증분으로 뗄 수 있다.
- 성공기준 E(홈 hospital-drug 로직 0)는 증분 1 에서 이미 달성.
- 성공기준 A·C·D 는 위 두 부재 capability 에 의존 → 이번 STOP 대상.

### 최소 대안 (사용자 판단 필요 · 셋 중 택)

1. **Local Context 소증분만 진행** — B 기준의 surface Context 주입만. provider 계약 무변경. 안전.
2. **capability 신설 승인** — `@o4o/ai-core` 에 (a) Gemini grounding/web-search 입력 또는 (b) OpenAI vision
   입력 중 필요한 것을 별도 WO 로 신설. 공통 패키지 계약 변경이라 명시 WO·범위 합의 필요.
3. **재정의** — "조사=Gemini 텍스트(grounding 없음)", "화면=현행 Gemini vision 유지" 로 성공기준을 현 capability
   에 맞게 낮춰 재작성 후 라우팅 seam 만 구현. (WO 원문 "화면=Astra" 와 배치되므로 사용자 승인 필요.)

**PUBLIC_DRUG_API_SERVICE_KEY** 는 이 조사에서도 무접촉. 인증키는 코드·문서·로그 어디에도 기록하지 않았다.

### 완료 보고 (증분 2 게이트 · STOP)

```text
GEMINI_RESEARCH_CAPABILITY            = ABSENT (generateContent 텍스트 전용 · tools/grounding 없음 · config 표현 불가)
ASTRA_SCREEN_CAPABILITY               = ABSENT (이미지 입력 Gemini 전용 · openai=takeover)
TASK_MODALITY_ROUTING                 = NOT_IMPLEMENTED (route 대상 capability 부재 → 배선 보류)
HOSPITAL_DRUG_LOCAL_CONTEXT           = UNCHANGED (composite 내부 SQLite 경로 · surface 주입은 소증분 후보)
HOSPITAL_DRUG_COMPOSITE_ACTIVE_PATH   = UNCHANGED (증분 1 격리 유지 · active-path 재판정은 재구축 시)
GLOBAL_ROUTER_REGRESSION              = NONE (코드 무변경)
QUESTION_RESUME_REGRESSION            = NONE (코드 무변경)
SAFETY_REGRESSION                     = NONE (코드 무변경)
PRODUCTION_SMOKE                      = N/A (코드 무변경)
DECISION                              = STOP · 사용자 판단 대기(위 최소 대안 1/2/3)
```

---

## 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건.
(증분 2 게이트 STOP 은 본 WO 내 기록 · capability 신설을 택하면 그때 별도 WO 로 분리 제안.)
