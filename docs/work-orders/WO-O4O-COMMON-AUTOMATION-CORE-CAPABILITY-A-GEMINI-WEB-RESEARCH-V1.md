# WO-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-A-GEMINI-WEB-RESEARCH-V1

> **유형**: 구현 (조사+구현 승인 완료 · 재승인 없이 검증까지 진행)
> **상위 트랙**: 공통 자동화 Core capability 신설 트랙 (순서 **A** → B → C → /hospital-drug 재연결)
> **경계 근거**: [IR-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-GATE-V1](../ir/IR-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-GATE-V1.md) (4f78d99d7) — A = 가능(Gemini 네이티브 grounding · additive)
> **상태**: 실행

---

## 1. 목적 (Goal)

O4O 공통 자동화 Core 에 **범용 Web Research capability** 를 신설한다.
사용자 Goal → Gemini grounded web research → 실제 검색 수행 → grounded metadata/citation 확보 → 근거 있는 결과 반환.

capability 는 **범용**이다 — 특정 사이트/도메인/약품 로직을 넣지 않는다. `/hospital-drug` 는 이 capability 의
**소비처 중 하나**일 뿐이며, hospital-drug 에서 고정되는 것은 Source 가 아니라 Context 다.

## 2. 배경 (Why)

증분 2 착수 게이트에서 `GEMINI_RESEARCH_CAPABILITY = ABSENT` 확정: `gemini.provider.ts` body 에
tools/googleSearch/grounding 표현이 없고, `AIProviderConfig` 에 grounding 필드가 없다. Gemini 는
네이티브 "Grounding with Google Search"(body `tools: [{ google_search: {} }]`)를 제공하므로 **기존
provider·API 키를 재사용하는 additive 변경**만으로 capability 를 만들 수 있다(새 검색엔진·새 저장소 불요).

## 3. 범위 (Scope)

**대상 (`@o4o/ai-core`, 전부 additive):**
- `AIProviderConfig.grounding?: boolean` 추가 (types.ts)
- `AIGroundingMetadata` 신설 + `AIProviderResponse.grounding?` additive 필드 추가 (types.ts) · index.ts export
- gemini.provider.ts `complete()`: `grounding=true` 일 때 body 에 `tools: [{ google_search: {} }]` 추가 +
  text 경로 강제(JSON 강제와 병용 금지) · `GeminiAPIResponse` 에 `groundingMetadata` 파싱 추가 ·
  `parseResponse()` 가 `groundingMetadata → response.grounding` 로 정규화
- execute.ts `ExecuteRequest.grounding?` · providerConfig 전달 · `ExecuteResult.grounding?` 반환 ·
  grounding 은 gemini 전용 가드

**대상 아님 (STOP):**
- 특정 Source(health.kr / HIRA / MFDS / 약품) 로직 · `/hospital-drug` 재연결 (별도 후속)
- streamComplete grounding (비스코프 · 현행 유지)
- openai vision / Astra (= Capability B, A 종료 후)
- Task Modality Router (= Capability C)
- `PUBLIC_DRUG_API_SERVICE_KEY` 등 공공 API 배선 (무접촉)

## 4. 계약 (Contract — additive)

```ts
// AIProviderConfig
grounding?: boolean;   // true 만 활성 · undefined/false = 기존 동작 그대로 · gemini 전용 · text 경로에서만

// AIGroundingMetadata (신설)
interface AIGroundingMetadata {
  used: boolean;                                   // groundingMetadata 실제 존재 여부
  queries: string[];                               // 모델이 실행한 검색 질의
  sources: Array<{ uri: string; title?: string }>; // 인용 출처
}

// AIProviderResponse
grounding?: AIGroundingMetadata;  // grounding 요청에서만 채워짐(비-grounding 응답엔 없음)
```

## 5. 중지 조건 (STOP — verbatim)

- grounding + JSON responseMode 동시 사용은 **금지**하거나 **명시적으로 분리** — 본 WO 는 금지(명시 json+grounding
  → `INVALID_ARGUMENT` throw) + 분리(grounding 은 text 경로 기본)를 동시에 구현한다.
- 모델이 `google_search` 를 실제 지원하지 않으면 **PASS 처리 금지**.
- citation/`groundingMetadata` 가 실제 응답에 없으면 **grounded research 로 간주 금지** (`used: false` 로 정직 반영).
- 기존 non-grounded Gemini 호출 **회귀 시 STOP**.
- 특정 사이트/약품 로직 **추가 금지**.

## 6. 검증 (Verification)

- `pnpm --filter @o4o/ai-core typecheck` PASS.
- 결정적 단위 테스트(global fetch mock, apps/api-server ai-orchestration.spec.ts):
  ① grounding=true → body 에 `tools:[{google_search:{}}]` 존재 · `responseMimeType` 부재(text 경로)
  ② grounding 응답의 `groundingMetadata` → `response.grounding.{used,queries,sources}` 정규화
  ③ **회귀 가드**: grounding 미지정 호출 body 는 종전과 동일(`responseMimeType: application/json` 유지 · tools 부재)
  ④ 명시 `responseMode:'json'` + grounding → `INVALID_ARGUMENT` throw
- 실측 게이트: 실제 Gemini 키가 env 에 있으면 grounded 호출로 `groundingMetadata` 실존을 확인한다.
  키가 없으면 **PASS 로 보고하지 않고** PENDING 사유(키 부재)와 재현 절차를 명시한다.

## 7. 산출물 (Deliverables)

- 코드: types.ts · gemini.provider.ts · execute.ts · index.ts (additive)
- 테스트: ai-orchestration.spec.ts grounding describe 블록
- CHECK: 본 WO 검증 결과 + 실측 게이트 상태
- Shared Module Protocol: `check-literal-consumers.mjs --source` 소비처 확인 완료(살아있는 소비처는 문서·
  admin 테스트 계약 — additive 라 무영향)

---

*작성일: 2026-09-18 · 상위 트랙: project-o4o-common-automation-core-capability-track*
