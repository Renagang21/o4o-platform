# CHECK-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-A-GEMINI-WEB-RESEARCH-V1

> **WO**: [WO-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-A-GEMINI-WEB-RESEARCH-V1](../work-orders/WO-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-A-GEMINI-WEB-RESEARCH-V1.md)
> **상태**: 구현·결정적 검증 COMPLETE · **실측 grounding 스모크 PASS(gemini-3.8-flash)** · 운영 통합(admin→Web Research 실호출) = **단계 D 로 유보**(production 소비처 부재) · CAPABILITY_A_CLOSED 는 사용자 판단 대기

---

## 1. 구현 (전부 additive)

| 파일 | 변경 |
|---|---|
| `packages/ai-core/src/orchestration/types.ts` | `AIProviderConfig.grounding?: boolean` · `AIGroundingMetadata` 신설 · `AIProviderResponse.grounding?` |
| `packages/ai-core/src/orchestration/index.ts` | `AIGroundingMetadata` type export |
| `packages/ai-core/src/orchestration/providers/gemini.provider.ts` | `complete()` grounding 분기(`tools:[{google_search:{}}]` + text 경로 강제 + json+grounding 거부) · `GeminiAPIResponse.groundingMetadata` · `parseResponse()` 정규화 |
| `packages/ai-core/src/orchestration/execute.ts` | `ExecuteRequest.grounding?` · gemini 전용 가드 · providerConfig 전달(text 기본 분리) · `ExecuteResult.grounding?` |
| `apps/api-server/src/__tests__/security/ai-orchestration.spec.ts` | grounding 결정적 테스트 7건 |
| `scripts/ai/gemini-grounding-smoke.mts` | 실측 스모크(env 키만) |

**streamComplete·openai·Astra·특정 Source(health.kr/HIRA/MFDS/약품) 로직 무접촉.** `/hospital-drug` 재연결 안 함.

## 2. 검증 결과

- `pnpm --filter @o4o/ai-core typecheck` → **PASS**.
- `npx jest ai-orchestration.spec.ts` (api-server 프로젝트) → **34/34 PASS** (기존 26 + grounding 8).
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

**그러나 실호출 production 소비처는 아직 없다**: `execute({ grounding: true })` 를 호출하는 운영 서비스는 저장소 전역 0건
(`grounding` 은 `@o4o/ai-core` 3파일 + 본 스펙에만 존재). Web Research 실행 소비처(=`/hospital-drug` 재연결)는 합의된 순서상
**단계 D**(B·C 이후)로 유보되어 있어, admin→resolver→**Web Research 실호출** 의 end-to-end 는 지금 만들지 않는다
("빈 capability 선연결 금지"). 따라서 `ADMIN_MODEL_RESOLUTION`/`WEB_RESEARCH_USES_ADMIN_MODEL` 의 **운영 런타임 검증은 단계 D 로 유보**하고,
지금은 계약 레벨(pass-through)까지만 PASS 로 기록한다.

**상태 요약**:
```
GEMINI_GROUNDING_CAPABILITY   = PASS (실측)
GEMINI_3_8_FLASH_GROUNDING    = PASS (실측 · used=true · sources=4)
MODEL_PASSTHROUGH_CONTRACT    = PASS (결정적 테스트 ⑧ · grounding 이 모델 override 안 함)
WEB_RESEARCH_PRODUCTION_TARGET= ABSENT (소비처 0 · 단계 D 유보)
ADMIN_MODEL_RESOLUTION(런타임) = 단계 D 유보
CAPABILITY_A_CLOSED           = 사용자 판단 대기 (아래 §5 결정 항목)
```

## 4. 중지 조건 준수

- grounding+JSON 병용: **금지(명시 json+grounding→throw) + 분리(grounding=text 기본)** 동시 구현.
- 모델 미지원 시 PASS 금지 → 실측 스모크로 지원 확인 후에만 PASS 기록.
- citation 부재 → `used:false` 정직 반영.
- 비-grounding 회귀 → 회귀 가드 테스트 PASS.
- 특정 사이트/약품 로직 → 추가 없음(범용).

## 5. CAPABILITY_A_CLOSED — 사용자 결정 항목

실측 grounding PASS·additive 계약·모델 pass-through 까지 확인됐으나, admin→resolver→**Web Research 실호출**
end-to-end 는 그 소비처가 단계 D 로 유보돼 지금은 존재하지 않는다. 따라서 A 종료 경계는 두 갈래 중 사용자 선택이 필요하다.

- **옵션 1 (권장) — A = CLOSED, 운영 통합 검증은 단계 D 로 유보**: capability(계약+실측+모델 pass-through)는 완결로 보고,
  admin→Web Research 실호출 검증은 소비처를 실제로 만드는 단계 D(/hospital-drug 재연결)에서 함께 수행. 다음 = Capability B 착수.
- **옵션 2 — 지금 최소 Web Research 실호출 소비처를 만들어 admin→resolver→grounding end-to-end 실측**: 합의된 순서(A→B→C→D)에서
  D 를 앞당기는 것이라 "빈 capability 선연결 금지"와 상충. 채택 시 별도 지시 필요.

## 6. 다음

- (옵션 1 선택 시) **Capability B(Astra Screen)** — 코드 변경 전 `gpt-6-astra` 이미지 입력 수용 실측 → PASS 시에만 openai vision 분기(현행 Gemini vision 존치).
- 그 다음 Capability C(Router) → `/hospital-drug` 재연결(단계 D) — 이때 admin→Web Research 실호출 운영 통합을 함께 검증.

---

*문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건*
*작성일: 2026-09-18*
