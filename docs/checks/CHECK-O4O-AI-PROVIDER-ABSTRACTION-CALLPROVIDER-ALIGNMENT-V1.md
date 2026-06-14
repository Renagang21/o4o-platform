# CHECK-O4O-AI-PROVIDER-ABSTRACTION-CALLPROVIDER-ALIGNMENT-V1

> **작업명:** WO-O4O-AI-PROVIDER-ABSTRACTION-CALLPROVIDER-ALIGNMENT-V1
> **유형:** 편집 AI 생성 경로의 provider 결정을 guardrail-enforced 게이트로 수렴 (backend, Gemini-preserving)
> **결과: PASS** — 편집 6 endpoint 중 generateRawContent 기반 5개(`/api/ai/content`·`url-to-blocks`·`content-to-store-use`·`course-structure`·`lesson-body`)가 provider/model 하드코딩 대신 **`generateEditingRawContent({surface})` 게이트**를 통과. 게이트는 `resolveEditingProvider(surface)` 로 provider 를 guardrail(`isProviderAllowedForSurface`) 강제 결정 → **gemini 는 기존 `generateRawContent`(불변) / 비-gemini 는 transport 미배선이라 안전하게 gemini fallback**. Gemini 기본값·동작 불변, 비-gemini 실호출 0(키·모델·transport 없음). api-server typecheck 0. DB·migration/package.json/Dockerfile 변경 없음.
> **선행:** `WO-O4O-AI-PROVIDER-GUARDRAIL-CONFIG-V1`(guardrail SSOT) · `IR-O4O-AI-DATA-GOVERNANCE-FOR-CHINESE-PROVIDERS-V1`
> **작성일:** 2026-06-14 · 기준 HEAD `d94eefd3e`

---

## 1. 목적

편집 AI 생성 경로의 provider 를 endpoint 하드코딩(`provider:'gemini'`)에서 **guardrail-enforced 결정**으로 수렴한다. 단 비-Gemini 무제한 개방이 아니라, **Gemini 기본값 유지 + guardrail 통과 surface 에서만 provider abstraction 이 가능해지는** 게이트를 세운다. 비-Gemini 실호출(Qwen)은 후속.

## 2. 선행 guardrail 요약

- `@o4o/types` `AI_PROVIDER_GUARDRAILS`: gemini(default·전 surface) / qwen(admin opt-in·pop/qr/blog) / deepseek(기본 금지). `isProviderAllowedForSurface(provider, surface)`. `HIGH_RISK_DATA_TYPES` 전송 금지 원칙.

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/utils/ai-editing-model-resolver.ts` | `resolveEditingProvider({surface})`(guardrail 결정) + `editingSurfaceForOutputType` + `deriveProviderFromModel` 추가 |
| `apps/api-server/src/services/ai-proxy.service.ts` | `generateEditingRawContent({surface})` 게이트 wrapper 추가(gemini→기존 generateRawContent, 비-gemini→gemini fallback) |
| `apps/api-server/src/routes/ai-proxy.routes.ts` | 편집 5 endpoint 가 `generateRawContent`(provider/model 하드코딩) → `generateEditingRawContent({surface})` |
| `docs/checks/CHECK-...-V1.md` | 본 문서 |

**무변경:** `generateRawContent`(검증된 Gemini raw transport — **byte 불변**), `callProvider`/`callGemini`(blocks path), `@o4o/types`(guardrail 소비만), vision endpoint(인라인 Gemini — surface 불명확, 유지), AIUsageLog(기존 provider 기록), admin UI(`PROVIDER_WARNINGS` 배선은 후속 — 비-gemini 선택 UI 부재), DB/migration, package.json/pnpm-lock, Dockerfile.

## 4. provider 결정 로직 (resolveEditingProvider)

```
defaultModel(AiQueryPolicy) → deriveProviderFromModel(접두사: qwen*/deepseek*/else=gemini)
  ├ gemini   → { provider:'gemini', model: resolveEditingModel()(gemini 검증) }
  └ 비-gemini → surface && isProviderAllowedForSurface(provider, surface) ?
                 { provider, model: rawModel }            // guardrail 통과
               : { provider:'gemini', model: gemini fallback }  // guardrail 차단/ surface 없음
```
- **현행:** `defaultModel` 이 gemini-* 이므로 항상 `{gemini, gemini모델}`. 게이트는 실재하나 결과는 gemini(무회귀).

## 5. surface mapping (endpoint → EditingSurface)

| endpoint | surface | provider(현행) |
|----------|---------|:---:|
| `/api/ai/content` | `editingSurfaceForOutputType(outputType)`(pop/store_qr→qr/blog/product_detail→product-description, 그외 undefined) | gemini |
| `/api/ai/content-to-store-use` | 동(useCase→outputType→surface) | gemini |
| `/api/ai/lesson-body` | `'lms-lesson'` | gemini |
| `/api/ai/url-to-blocks` | (undefined — 범용) | gemini |
| `/api/ai/course-structure` | (undefined — EditingSurface 밖, 2단계) | gemini |
| `/api/ai/vision/analyze` | (게이트 미경유 — 인라인 Gemini) | gemini |

- summary/title_suggest/store_sns/flexible → surface undefined → gemini(보수적).

## 6. guardrail enforcement 결과

- **gemini:** 전 surface 허용 → 항상 통과(기본값).
- **qwen:** `allowedSurfaces=['pop','qr','blog']` → 해당 surface + admin 이 qwen 모델 설정 시에만 비-gemini 결정. **단 transport 미배선 → 서비스 wrapper 가 gemini fallback**(다음 WO 에서 실호출).
- **deepseek:** `allowedSurfaces=[]` → 어떤 surface 도 통과 못 함 → 항상 gemini.
- **medium surface(product-description/resource/lms-lesson):** qwen `allowedSurfaces` 미포함 → qwen 불허(gemini).

## 7. Gemini default 유지 확인

- `generateRawContent` **byte 불변**(Gemini raw transport). `generateEditingRawContent` 의 gemini 분기가 `generateRawContent({...request, provider:'gemini', model})` 를 그대로 호출 — model 은 `resolveEditingModel()` 결과(이전과 동일). → **Gemini 생성 동작 무회귀.**
- `defaultModel` 이 gemini 인 한(현행) 모든 편집 endpoint 는 gemini 로 동작.

## 8. Qwen 제한 통과 / DeepSeek 차단 / medium 불허 (정적)

- Qwen: pop/qr/blog 만 guardrail 통과(transport 후속). DeepSeek 1st-party: `allowedSurfaces:[]` → 통과 0. product-description/resource/lms-lesson: qwen 불허 → gemini. (모두 `isProviderAllowedForSurface` 로 강제, 코드 반영.)

## 9. 비-Gemini transport / admin 경고 미수행 확인

- **비-Gemini 실호출 0:** Qwen/DeepSeek 호출 코드 없음. `generateEditingRawContent` 비-gemini 분기는 **gemini fallback + warn 로그**만(transport 미배선). API key 미등록, base_url 미설정. → 실제 외부 비-gemini 전송 불가.
- **admin 경고:** `PROVIDER_WARNINGS` UI 배선은 후속(현재 비-gemini 선택 UI 자체 부재 — abstraction 다음 단계에서 모델 선택 UI 확장 시 소비). WO §5 "비-Gemini 선택 UI 없으면 UI 변경 말고 후속" 준수.

## 10. 고위험 데이터 원칙

- `HIGH_RISK_DATA_TYPES`(환자/처방/PII/계약 등)는 편집 AI 입력 대상 아님 — 게이트는 보수적 fallback(surface 불명확→gemini)으로 비-gemini 노출을 최소화. DLP 미구현(원칙 SSOT 유지).

## 11. 검증 결과

- **TypeScript:** `apps/api-server` `tsc --noEmit` **error 0**(resolver/service/routes 포함).
- **정적:**
  - 편집 5 endpoint 모두 `generateEditingRawContent({surface})` 사용(routes 5 call sites). 편집 endpoint 의 `provider:'gemini'` 하드코딩 **0**(vision 인라인만 gemini).
  - `generateRawContent` 호출은 게이트 wrapper 만(this.generateRawContent ×2) → Gemini transport 단일 진입.
  - `resolveEditingProvider` 가 guardrail 강제, gemini fallback. defaultModel=gemini → 무회귀.
  - 비-gemini 실호출 코드 0(fallback+warn). callProvider/callGemini blocks path 무변경.
- **무변경:** generateRawContent(byte), @o4o/types, DB/migration, package.json/pnpm-lock, Dockerfile.
- **smoke:** 미수행 — 배포 후 Gemini default 로 POP/블로그/레슨 생성 정상 + 로그 provider=gemini 확인 권장(production write 없음). 비-gemini key 미설정이라 Qwen 미실행.

## 12. 후속 작업

1. **`WO-O4O-AI-QWEN-SINGAPORE-LOW-RISK-SURFACE-EXPERIMENT-V1`** — `generateEditingRawContent` 비-gemini 분기에 **OpenAI-compatible raw transport**(Qwen Singapore base_url+key) 배선 + 저위험 surface(pop/qr/blog) 실험. key/모델 동반.
2. **`IR-O4O-AI-PROVIDER-SURFACE-RISK-MATRIX-V1`** — medium surface(product-description/resource/lms-lesson) qwen 확장 전 세부 매트릭스.
3. **`KEEP-O4O-AI-DEEPSEEK-FIRSTPARTY-BLOCKED-V1`** — DeepSeek 1st-party 기본 금지 유지(guardrail 코드 반영).
4. **`IR-O4O-AI-SIGNAGE-AND-ADMIN-BUILDER-PIPELINE-SCOPE-V1`** — 별도 파이프라인 provider 확장 조사.

## 13. 완료 판정

**PASS.** 편집 5 endpoint 의 provider 결정을 guardrail-enforced 게이트(`generateEditingRawContent`)로 수렴 — **provider/model 하드코딩 제거, surface→guardrail→provider, Gemini 기본값·`generateRawContent` 불변**. 비-gemini 는 guardrail 통과해도 transport 미배선이라 gemini 안전 fallback(실호출 0). api-server typecheck 0, DB/package/Dockerfile 무변경. **"Gemini 유지한 채 guardrail 통과 surface 에서만 abstraction 가능"** 성공 기준 충족 — 비-Gemini 실호출은 Qwen 실험 WO 에서 key+transport 동반.
