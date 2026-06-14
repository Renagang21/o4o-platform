# CHECK-O4O-AI-QWEN-SINGAPORE-LOW-RISK-SURFACE-EXPERIMENT-V1

> **작업명:** WO-O4O-AI-QWEN-SINGAPORE-LOW-RISK-SURFACE-EXPERIMENT-V1
> **유형:** Qwen(Singapore International) OpenAI-compatible raw transport 최소 연결 — 저위험 surface 제한 실험 (backend, key-gated)
> **결과: PASS** — `generateEditingRawContent` 의 비-gemini 분기에 **Qwen transport(`fetchQwenRawContent`)** 배선. **`QWEN_API_KEY` 존재 + guardrail 통과 surface(pop/qr/blog) + admin 이 qwen 모델 선택** 시에만 도달. key 미설정/호출 실패 시 **Gemini fallback + warn**(UX 무중단). Gemini 기본값·`generateRawContent` 불변, DeepSeek 미배선. api-server typecheck 0. DB·migration/package.json/Dockerfile/env 파일 변경 없음.
> **선행:** `WO-O4O-AI-PROVIDER-ABSTRACTION-CALLPROVIDER-ALIGNMENT-V1`(게이트) · `IR-O4O-AI-DATA-GOVERNANCE-FOR-CHINESE-PROVIDERS-V1`
> **작성일:** 2026-06-14 · 기준 HEAD `25f9c9622`

---

## 1. 목적

provider abstraction 게이트 위에서, **첫 실제 비-Gemini 외부 호출**(Qwen Singapore)을 저위험 surface 한정·key-gated 로 연결한다. 기본 provider 를 Qwen 으로 바꾸지 않으며, staging/local 실험 가능 상태까지만.

## 2. 선행 요약

- 게이트 `generateEditingRawContent({surface})` → `resolveEditingProvider`(guardrail). gemini→기존 transport, 비-gemini→(이전엔) gemini fallback. 본 WO 가 qwen 분기에 실제 transport 추가.
- guardrail: qwen `allowedSurfaces=['pop','qr','blog']`, deepseek `[]`, gemini default.

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/services/ai-proxy.service.ts` | `generateEditingRawContent` 비-gemini 분기: qwen + `QWEN_API_KEY` 시 `fetchQwenRawContent` 호출(실패→gemini fallback). `fetchQwenRawContent`(OpenAI-compatible chat/completions) 신규 |
| `docs/checks/CHECK-...-V1.md` | 본 문서 |

**무변경:** `generateRawContent`(Gemini transport **byte 불변**), `resolveEditingProvider`/guardrail(이전 WO), routes(게이트 호출 그대로), `@o4o/types`, callProvider/callGemini, DeepSeek(미배선), admin UI(qwen 선택 UI 부재 — `PROVIDER_WARNINGS.qwen` 후속), DB/migration, package.json/pnpm-lock, Dockerfile, **env 파일(런타임 설정)**.

## 4. Qwen transport 구조 (`fetchQwenRawContent`)

- OpenAI-compatible: `POST {baseUrl}/chat/completions`, `Authorization: Bearer {QWEN_API_KEY}`, body `{ model, messages:[system,user], temperature, max_tokens, response_format:{type:'json_object'} }`, 120s timeout(AbortController).
- 응답 `choices[0].message.content` → JSON.parse(코드펜스/중괄호 fallback 파싱, Gemini 경로와 동일 방식) → `AIRawContentResponse{ success, provider:'qwen'(정보용), model, usage(prompt/completion/total), parsed, rawText }`.
- 429 → RATE_LIMIT_ERROR, !ok → PROVIDER_ERROR(상태+본문 200자), 무응답 → PROVIDER_ERROR, AbortError → TIMEOUT_ERROR. **모든 실패는 호출부에서 catch → Gemini fallback.**

## 5. env 설정 (런타임 — 파일 미커밋)

| env | 기본값 | 비고 |
|-----|--------|------|
| `QWEN_API_KEY` | (없음) | **없으면 qwen 미실행 → gemini fallback** |
| `QWEN_BASE_URL` | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | **Singapore International** 만. 중국 본토 endpoint 미사용 |
| `QWEN_DEFAULT_MODEL` | (미사용 — 모델은 `AiQueryPolicy.defaultModel` 의 qwen slug) | admin 이 qwen 모델 선택 시 그 slug 사용 |

## 6. 허용 / 불허 surface

- **허용(qwen 도달 가능):** `pop`·`qr`·`blog`(guardrail `allowedSurfaces`). + admin 이 qwen 모델 선택 + key 존재.
- **불허(gemini fallback):** `product-description`·`library-entry`·`resource`·`lms-lesson`·`course-structure`·`vision`·signage·admin-builder. (guardrail 미통과 → `resolveEditingProvider` 가 gemini 반환 → qwen 분기 미도달.)

## 7. Gemini fallback 동작

- qwen 미선택(defaultModel=gemini): gemini(현행).
- qwen 선택 + key 없음: warn + gemini fallback.
- qwen 선택 + key 있음 + 호출 실패(429/오류/timeout/파싱): warn + gemini fallback.
- qwen 선택 + key 있음 + 성공: qwen 결과 반환(`provider:'qwen'`).
→ **어떤 경우에도 사용자 생성 경험이 깨지지 않음**(항상 유효 결과 or gemini fallback).

## 8. DeepSeek 미개방 확인

- DeepSeek transport **없음**, env **없음**, guardrail `allowedSurfaces:[]` 유지 → `resolveEditingProvider` 가 deepseek 를 반환하지 않음(gemini fallback). 비-gemini 분기에서도 `provider==='qwen'` 만 처리.

## 9. admin 경고 반영 여부

- qwen 선택 UI **부재**(AiQuerySettings 드롭다운·AiEnginesPage 모두 gemini 계열만) → 현재 admin 이 qwen 을 선택할 경로가 사실상 없음(정책 DB 직접 수정 외). `PROVIDER_WARNINGS.qwen` 은 준비됨 — **provider 선택 UI 확장(`WO-...-ADMIN-PROVIDER-SELECTION-UX-V1`)에서 배선**. WO §5 준수(UI 신규 대규모 개편 금지).

## 10. 검증 결과

- **TypeScript:** `apps/api-server` `tsc --noEmit` **error 0**.
- **정적:**
  - Gemini default 유지(`generateRawContent` byte 불변, defaultModel=gemini → 무회귀).
  - Qwen transport 는 guardrail 통과 surface(pop/qr/blog) + qwen 모델 선택 + key 존재 시에만 도달.
  - `QWEN_API_KEY` 미설정 → qwen 미실행, gemini fallback.
  - DeepSeek transport 0, deepseek env 0.
  - medium surface(product-description/resource/lms-lesson) qwen 불허(guardrail).
  - course-structure/vision/signage/admin-builder provider 확장 0.
- **무변경:** generateRawContent(byte), @o4o/types, DB/migration, package.json/pnpm-lock, Dockerfile, env 파일.
- **smoke:** 미수행 — `QWEN_API_KEY` 미설정 상태(현 prod)에서는 qwen 미실행·gemini fallback. 실측은 §11 체크리스트대로 staging 에서.

## 11. 운영 전 체크리스트 (실측 가이드)

- [ ] **Qwen API key 를 production 에 바로 넣지 않음** — staging/local 먼저.
- [ ] staging/local 에서 `QWEN_API_KEY`/`QWEN_BASE_URL`(Singapore) 설정 후 실측.
- [ ] 테스트 surface 는 **pop 또는 blog 1개부터**(admin 이 해당 흐름에서 qwen 모델 선택 — 현재 선택 UI 없으면 정책 DB 임시 설정).
- [ ] 로그에서 `routing to qwen` + `Qwen raw content generated`(provider/model/tokens) 확인.
- [ ] 결과 **품질**(한국어/형식) 확인.
- [ ] **응답 속도** 확인(timeout 120s 내).
- [ ] **fallback 동작** 확인(key 제거 시 gemini 로 회귀).
- [ ] **비용 모니터링** 가능 여부 확인(Alibaba 콘솔; AIUsageLog 는 qwen 미기록 — enum 후속).
- [ ] **약국/의료/개인정보 포함 입력 금지**(저위험 surface·비식별 콘텐츠만).

## 12. 후속 작업

1. **`CHECK-O4O-AI-QWEN-LOW-RISK-SURFACE-SMOKE-V1`** — staging/local 실측 결과 고정.
2. **`IR-O4O-AI-PROVIDER-SURFACE-RISK-MATRIX-V1`** — medium surface 확장 전 세부 위험도.
3. **`WO-O4O-AI-ADMIN-PROVIDER-SELECTION-UX-V1`** — admin provider/model 선택 UI + `PROVIDER_WARNINGS` 경고 배선(+ AIUsageLog qwen enum 검토).
4. **`KEEP-O4O-AI-DEEPSEEK-FIRSTPARTY-BLOCKED-V1`** — DeepSeek 1st-party blocked 고정.

## 13. 완료 판정

**PASS.** Qwen(Singapore) OpenAI-compatible raw transport 를 `generateEditingRawContent` 비-gemini 분기에 key-gated 로 연결 — **pop/qr/blog + qwen 모델 선택 + QWEN_API_KEY 시에만 도달, 그 외 전부 Gemini fallback**. Gemini 기본값·`generateRawContent` 불변, DeepSeek 미배선, 고위험/medium surface 차단 유지. api-server typecheck 0, DB/package/Dockerfile/env 무변경. **production 기본값 변경 없이 staging/local 실험 가능 상태**까지 도달 — 실측은 §11 체크리스트로 진행.
