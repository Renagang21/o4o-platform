# CHECK-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-A-GEMINI-WEB-RESEARCH-V1

> **WO**: [WO-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-A-GEMINI-WEB-RESEARCH-V1](../work-orders/WO-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-A-GEMINI-WEB-RESEARCH-V1.md)
> **상태**: **CAPABILITY_A_CLOSED = YES** · 실측 grounding 스모크 PASS(gemini-3.8-flash) · admin 모델 해석→grounding end-to-end 통합 PASS(내부 service `runWebResearch`) · 실업무 연결(/hospital-drug)만 단계 D 로 유보

---

## 1. 구현 (전부 additive)

| 파일 | 변경 |
|---|---|
| `packages/ai-core/src/orchestration/types.ts` | `AIProviderConfig.grounding?: boolean` · `AIGroundingMetadata` 신설 · `AIProviderResponse.grounding?` |
| `packages/ai-core/src/orchestration/index.ts` | `AIGroundingMetadata` type export |
| `packages/ai-core/src/orchestration/providers/gemini.provider.ts` | `complete()` grounding 분기(`tools:[{google_search:{}}]` + text 경로 강제 + json+grounding 거부) · `GeminiAPIResponse.groundingMetadata` · `parseResponse()` 정규화 |
| `packages/ai-core/src/orchestration/execute.ts` | `ExecuteRequest.grounding?` · gemini 전용 가드 · providerConfig 전달(text 기본 분리) · `ExecuteResult.grounding?` |
| `apps/api-server/src/__tests__/security/ai-orchestration.spec.ts` | grounding 결정적 테스트 8건 |
| `scripts/ai/gemini-grounding-smoke.mts` | 실측 스모크(env 키만) |
| `apps/api-server/src/services/ai/web-research.service.ts` | **범용 Web Research 소비자 `runWebResearch()`** — admin SSOT 모델 해석→grounding 실호출(내부 service 함수 · HTTP route 없음) |
| `apps/api-server/src/__tests__/ai/web-research.service.spec.ts` | admin 모델 해석→grounding end-to-end 통합 테스트 4건 |

**streamComplete·openai·Astra·특정 Source(health.kr/HIRA/MFDS/약품) 로직 무접촉.** `/hospital-drug` 재연결 안 함.

## 2. 검증 결과

- `pnpm --filter @o4o/ai-core typecheck` → **PASS**. `@o4o/ai-core` 재빌드(dist 갱신, gitignore·미추적)로 api-server tsc 가 grounding 타입 해석 · `apps/api-server tsc --noEmit` 신규 파일 오류 0.
- `apps/api-server` eslint(신규 2파일) → 0 error / 0 warning (lint-ratchet 회귀 없음).
- `npx jest ai-orchestration.spec.ts` (api-server 프로젝트) → **34/34 PASS** (기존 26 + grounding 8).
- `npx jest src/__tests__/ai/web-research.service.spec.ts` → **4/4 PASS** (admin 모델 해석→grounding end-to-end · §3-c).
  - ① grounding=true → `tools:[{google_search:{}}]` 존재 · `responseMimeType` 부재(text 경로) — PASS
  - ② `groundingMetadata` → `response.grounding.{used,queries,sources}` 정규화(빈 uri 제거) — PASS
  - ③ groundingMetadata 부재 → `used:false`(grounded 로 간주 안 함) — PASS
  - ④ **회귀 가드**: 비-grounding 호출 body 종전 동일(`application/json` 유지·tools 부재·grounding undefined) — PASS
  - ⑤ 명시 `responseMode:'json'`+grounding → `INVALID_ARGUMENT` throw — PASS
  - ⑥ execute 비-gemini + grounding → `INVALID_ARGUMENT` — PASS
  - ⑦ execute grounding → text 경로 분리 + grounding metadata 반환 — PASS
  - ⑧ grounding 호출이 resolved model(GEMINI_CANONICAL_MODEL='gemini-3.8-flash')을 override 없이 요청 URL 에 그대로 사용 — PASS
- **lint-ratchet 회귀 해소(738f7671d)**: 최초 grounding 테스트 3곳의 `require('@o4o/ai-core')`가
  `@typescript-eslint/no-require-imports` 신규 오류 3건 → baseline 46 초과(49). `GeminiProvider`·`execute` 를
  파일 상단 static import 로 전환 → 저장소 총계 46 복귀(ratchet 통과). 기존 "Provider structural checks" 의 require() 4건은 baseline 소속이라 무접촉.
- Shared Module Protocol: `check-literal-consumers.mjs --source types.ts` → 살아있는 소비처는 문서·
  admin-dashboard 테스트 계약(RAW_SOURCE_CONTRACT). additive optional 필드라 무영향.

## 3. 실측 grounding 스모크 — PASS

사용자 환경에서 직접 실행(키는 PowerShell 현재 세션 env 로만 주입 · 실행 후 `Remove-Item Env:GEMINI_API_KEY` 로 제거 ·
채팅·코드·문서·로그에 키 미전달). 사용자가 키 없는 출력만 전달.

```
$env:GEMINI_API_KEY="<key>"; npx tsx scripts/ai/gemini-grounding-smoke.mts
```

실측 결과(2026-09-18):
- `model = gemini-3.8-flash`
- `grounding.used = true`
- `grounding.sources = 4` (≥1)
- `groundingMetadata`(webSearchQueries + groundingChunks) **실존**
- 응답 본문 생성 **성공**

판정 기준(`grounding.used===true` + `sources≥1` + groundingMetadata 실존 + 본문 생성) **충족 → GEMINI_GROUNDING_CAPABILITY = PASS**.
즉 실제 Gemini(3.8-flash) 가 `google_search` grounding 을 지원하고 응답에 citation/query 를 담는 것을 실측으로 확인.

## 3-b. 운영 모델 해석·통합 게이트 — 조사 결과 (production 소비처 부재 → 단계 D 유보)

**모델 SSOT 체인(코드 확인)**: `AiQueryPolicy.defaultModel`(admin `activateEngine` 이 기록) →
`process.env.AI_DEFAULT_MODEL` → 하드코딩 fallback `GEMINI_CANONICAL_MODEL='gemini-3.8-flash'`.
whitelist ∪ Google ListModels 로 검증. resolver = `resolveEditingModel()`
([ai-editing-model-resolver.ts](../../apps/api-server/src/utils/ai-editing-model-resolver.ts)).

**grounding 은 모델을 덮어쓰지 않는다(코드 확인)**: `gemini.provider.ts complete()` 는 `model = config.model` 을 그대로
요청 URL(`/models/{model}:generateContent`)에 사용하고, grounding 분기는 `tools:[{google_search:{}}]` 추가 + text 경로 강제만
한다. resolved model 은 grounding 여부와 무관하게 그대로 통과.

**결정적 통합 테스트 추가(⑧)**: `model=GEMINI_CANONICAL_MODEL('gemini-3.8-flash')` + `grounding:true` 호출 →
요청 URL 에 `/models/gemini-3.8-flash:generateContent` 그대로 실림 · `tools` 존재 · `grounding.used=true` 확인.
→ **모델 pass-through(WEB_RESEARCH_USES_ADMIN_MODEL 계약 레벨) PASS**.

계약 레벨(pass-through)까지는 결정적 테스트 ⑧ 로 확정. admin→resolver→**실호출** end-to-end 는 §3-c 의 범용 소비자로 닫는다.

**상태 요약**:
```
GEMINI_GROUNDING_CAPABILITY   = PASS (실측)
GEMINI_3_8_FLASH_GROUNDING    = PASS (실측 · used=true · sources=4)
MODEL_PASSTHROUGH_CONTRACT    = PASS (결정적 테스트 ⑧ · grounding 이 모델 override 안 함)
```

## 3-c. admin 모델 해석 → grounding end-to-end (범용 소비자) — PASS

사용자 결정 = **옵션 2**(내부 service 함수만 · HTTP route 없음). Capability A 종료 검증을 위해 **범용 Web Research 소비자 하나**만 만든다.

**구현**: `apps/api-server/src/services/ai/web-research.service.ts` 의 `runWebResearch({ query })`:
```
resolveEditingModel()               // admin SSOT(AiQueryPolicy.defaultModel) → 모델 해석 (하드코딩 금지)
→ resolveAiApiKey(AppDataSource,'gemini')   // 키는 ai_settings/env 에서만
→ execute({ provider:'gemini', model: resolvedModel, grounding:true, ... })
```
- **범용**: 특정 약품·사이트(health.kr/HIRA/MFDS) 로직 없음 · 임의 질의 pass-through.
- **HTTP route 없음** · 인증/guard/route contract 신설 없음 · `/hospital-drug` 미연결(실업무=단계 D).
- 모델 강제(`AI_DEFAULT_MODEL`/새 상수) 없음 · fallback = `GEMINI_CANONICAL_MODEL`.

**통합 테스트**(`apps/api-server/src/__tests__/ai/web-research.service.spec.ts`, AppDataSource·fetch mock) — **4/4 PASS**:
- ① **ADMIN_MODEL_RESOLUTION**: admin 이 고른 `gemini-2.5-pro`(fallback `gemini-3.8-flash` 와 **다른** 값)가 실제로 읽혀
  요청 URL `/models/gemini-2.5-pro:generateContent` 에 실림 — fallback 이 아니라 admin 값이 해석됨을 증명 — PASS
- ② **운영 canonical**: admin 활성 모델 = `gemini-3.8-flash` → grounding 요청 URL 일치 · `tools:[{google_search:{}}]` ·
  `responseMimeType` 부재(text) · `grounding.used=true` · sources 2 · queries 정규화 — PASS
- ③ **범용성**: 임의 질의 pass-through · 요청 body 에 하드코딩 도메인(health.kr/hira/mfds) 없음 — PASS
- ④ **안전 강등**: admin 이 비-gemini(`gpt-6-astra`) 설정 시 grounding 은 gemini 전용 → `gemini-3.8-flash` fallback — PASS

**상태 요약**:
```
ADMIN_MODEL_RESOLUTION        = PASS (admin gemini-2.5-pro ≠ fallback 실제 해석)
WEB_RESEARCH_USES_ADMIN_MODEL = PASS (해석 모델이 grounding 요청 URL 에 그대로 사용)
GROUNDING_END_TO_END          = PASS (used=true · googleSearch tool · metadata 정규화)
WEB_RESEARCH_CONSUMER         = PRESENT (runWebResearch · 내부 service · route 없음)
CAPABILITY_A_CLOSED           = YES
```
실업무 연결(/hospital-drug)만 순서상 단계 D 로 유보. admin 화면 실계정에서의 최종 운영 smoke 도 소비처가 실업무에 연결되는
단계 D 에서 함께 수행한다(현재는 결정적 통합으로 admin 모델 해석 경로를 확정).

## 4. 중지 조건 준수

- grounding+JSON 병용: **금지(명시 json+grounding→throw) + 분리(grounding=text 기본)** 동시 구현.
- 모델 미지원 시 PASS 금지 → 실측 스모크로 지원 확인 후에만 PASS 기록.
- citation 부재 → `used:false` 정직 반영.
- 비-grounding 회귀 → 회귀 가드 테스트 PASS.
- 특정 사이트/약품 로직 → 추가 없음(범용).

## 5. CAPABILITY_A_CLOSED = YES

사용자가 **옵션 2**(지금 최소 Web Research 소비처 선행 · 내부 service 함수만)를 선택. §3-c 의 `runWebResearch()` 로
admin→resolver→grounding end-to-end 를 결정적으로 확정했다. Capability A 종료 조건 전부 충족:

```
GEMINI_GROUNDING_CAPABILITY   = PASS (실측)
ADMIN_MODEL_RESOLUTION        = PASS
WEB_RESEARCH_USES_ADMIN_MODEL = PASS
GROUNDING_END_TO_END          = PASS
범용성(특정 사이트/약품 로직 없음) = 유지
회귀(비-grounding·기존 편집 경로)   = 없음
CAPABILITY_A_CLOSED           = YES
```

유보(단계 D): `/hospital-drug` 등 **실업무 연결** + admin 실계정 최종 운영 smoke. 소비처(`runWebResearch`)는 이미 존재하므로
단계 D 는 "빈 capability 선연결"이 아니라 기존 범용 소비자를 실업무에 연결하는 작업이다.

## 6. 다음

- **Capability B(Astra Screen)** — 코드 변경 전 `gpt-6-astra` 이미지 입력 수용 실측 → PASS 시에만 openai vision 분기(현행 Gemini vision 존치, B1).
- 그 다음 Capability C(Router) → `/hospital-drug` 재연결(단계 D) — 이때 `runWebResearch` 를 실업무에 연결하고 admin 실계정 운영 통합 smoke 를 함께 수행.

---

*문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건*
*작성일: 2026-09-18*
