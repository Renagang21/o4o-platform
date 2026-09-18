# CHECK-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-A-GEMINI-WEB-RESEARCH-V1

> **WO**: [WO-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-A-GEMINI-WEB-RESEARCH-V1](../work-orders/WO-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-A-GEMINI-WEB-RESEARCH-V1.md)
> **상태**: 구현·결정적 검증 COMPLETE · 실측 게이트 PENDING(키 부재)

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
- `npx jest ai-orchestration.spec.ts` → **33/33 PASS** (기존 26 + grounding 7).
  - ① grounding=true → `tools:[{google_search:{}}]` 존재 · `responseMimeType` 부재(text 경로) — PASS
  - ② `groundingMetadata` → `response.grounding.{used,queries,sources}` 정규화(빈 uri 제거) — PASS
  - ③ groundingMetadata 부재 → `used:false`(grounded 로 간주 안 함) — PASS
  - ④ **회귀 가드**: 비-grounding 호출 body 종전 동일(`application/json` 유지·tools 부재·grounding undefined) — PASS
  - ⑤ 명시 `responseMode:'json'`+grounding → `INVALID_ARGUMENT` throw — PASS
  - ⑥ execute 비-gemini + grounding → `INVALID_ARGUMENT` — PASS
  - ⑦ execute grounding → text 경로 분리 + grounding metadata 반환 — PASS
- Shared Module Protocol: `check-literal-consumers.mjs --source types.ts` → 살아있는 소비처는 문서·
  admin-dashboard 테스트 계약(RAW_SOURCE_CONTRACT). additive optional 필드라 무영향.

## 3. 실측 게이트 — PENDING (PASS 아님)

로컬 env 에 Gemini 키 부재(`GEMINI_API_KEY`/`GOOGLE_API_KEY`/`GOOGLE_GENAI_API_KEY` 모두 NONE).
**실제 모델의 `google_search` 지원 + `groundingMetadata` 실존을 아직 확인하지 못했다 → PASS 로 보고하지 않는다.**

재현(키는 env 로만 주입 · 코드·문서·로그 미기록):
```
GEMINI_API_KEY=<key> npx tsx scripts/ai/gemini-grounding-smoke.mts
```
판정: `grounding.used===true` + `sources≥1` → PASS(exit 0) / groundingMetadata 부재 → FAIL(exit 1) / 키 부재 → PENDING(exit 2).

## 4. 중지 조건 준수

- grounding+JSON 병용: **금지(명시 json+grounding→throw) + 분리(grounding=text 기본)** 동시 구현.
- 모델 미지원 시 PASS 금지 → 실측 게이트 PENDING 유지.
- citation 부재 → `used:false` 정직 반영.
- 비-grounding 회귀 → 회귀 가드 테스트 PASS.
- 특정 사이트/약품 로직 → 추가 없음(범용).

## 5. 다음

- 실측 스모크 PASS 확인(사용자 키 주입) 후 A 완전 종료.
- 이후 **Capability B(Astra Screen)** — 코드 변경 전 `gpt-6-astra` 이미지 입력 수용 실측 → PASS 시에만 openai vision 분기.
- 그 다음 Capability C(Router) → `/hospital-drug` 재연결.

---

*문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건*
*작성일: 2026-09-18*
