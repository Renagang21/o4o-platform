# CHECK-O4O-AI-MODEL-SELECTION-RUNTIME-RESOLVER-V1

> **작업명:** WO-O4O-AI-MODEL-SELECTION-RUNTIME-RESOLVER-V1
> **유형:** 편집 AI 생성 endpoint 가 admin 모델 선택값을 읽도록 runtime model resolver 배선 (backend-only, model id 한정)
> **결과: PASS** — 편집 AI 생성 6개 endpoint 의 `gemini-2.5-flash` 하드코딩을 공통 `resolveEditingModel()`(SSOT=`AiQueryPolicy.defaultModel`) 호출로 교체. admin 엔진 활성화 → `defaultModel` → 편집 AI 생성까지 모델이 연결됨. 하드코딩은 fallback 으로 강등(제거 아님). provider 교체·정책 테이블 통합·prompt preset 은 범위 밖(후속). api-server typecheck 0. package.json/pnpm-lock/Dockerfile/DB·migration 변경 없음.
> **선행:** `IR-O4O-AI-MODEL-PROVIDER-SELECTION-SETTINGS-V1`(판정 B+D)
> **작성일:** 2026-06-14 · 기준 HEAD `6dcdf1f0e`

---

## 1. 목적

선행 IR 결론: admin 엔진 활성화는 `AiQueryPolicy.defaultModel = engine.slug` 로 **저장되나**, 편집 AI 생성 6개 endpoint 가 `gemini-2.5-flash` 를 하드코딩하여 그 값을 **읽지 않음**(판정 B). 본 WO 는 편집 생성 경로가 **공통 resolver 를 통해 모델을 결정**하도록 배선한다. **model id 배선만 1차** — provider 교체는 후속.

## 2. 선행 IR 요약

- admin activate → `ai_engines.is_active` + `AiQueryPolicy.defaultModel`/`activeEngineId` 기록(`ai-admin.service.ts:207-217`).
- `/api/ai/query` 는 `policy.defaultModel` 사용(배선됨, `ai-query.service.ts:482`).
- 편집 생성 6개(`/api/ai/content`·`url-to-blocks`·`vision/analyze`·`course-structure`·`lesson-body`·`content-to-store-use`)는 하드코딩 → admin 무시(핵심 갭).

## 3. SSOT 결정

**1차 runtime model SSOT = `AiQueryPolicy.defaultModel`.**
- admin activate 가 이미 `defaultModel = engine.slug` 기록 → 별도 `AiEngine` 조회 불필요(단일 read, `/api/ai/query` 와 동일 소스 → 정합).
- `AiLlmPolicy` / `AiSettings` / `ai_model_settings` **통합 안 함**(후속 — §8).

## 4. 변경 파일

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/utils/ai-editing-model-resolver.ts` | **신규** — `resolveEditingModel()`(정책→env→fallback, gemini whitelist 검증, throw 없음) |
| `apps/api-server/src/routes/ai-proxy.routes.ts` | import 추가 + 편집 6개 endpoint 의 `gemini-2.5-flash` 리터럴 → `await resolveEditingModel()` |
| `docs/checks/CHECK-...-V1.md` | 본 문서 |

**무변경:** `ai-proxy.service.ts`(generateRawContent 의 내부 `resolveModel` 검증 그대로 — 이중 안전), `ai-query.service.ts`(`/api/ai/query` 동작 유지), `ai-admin.service.ts`(activate 동작 유지), AiQueryPolicy/AiEngine entity, backend 그 외, DB/migration, package.json/pnpm-lock, Dockerfile, frontend(AiContentModal/ProductionTemplate), signage, admin-dashboard builder.

## 5. resolver 구조

```ts
// ai-editing-model-resolver.ts
resolveEditingModel(): Promise<string>
  1. AiQueryPolicy.defaultModel (id=1) — gemini whitelist 포함 시 채택
  2. process.env.AI_DEFAULT_MODEL — gemini whitelist 포함 시 채택
  3. fallback 'gemini-2.5-flash' (EDITING_MODEL_FALLBACK)
```
- **gemini whitelist 검증**(`MODEL_WHITELIST.gemini`): 편집 경로는 gemini-only(`generateRawContent` 가 provider 강제) → 비-gemini 정책값이면 fallback + warn. provider 교체는 후속.
- **resilient:** `AppDataSource` 미초기화 / 정책 row 부재 / 조회 예외 → 모두 fallback. **AI 생성이 정책 read 실패로 깨지지 않음**(throw 0).

## 6. endpoint별 적용 결과

| endpoint | 이전 | 이후 | 위치 |
|----------|------|------|------|
| `/api/ai/content` | `model: 'gemini-2.5-flash'` | `model: await resolveEditingModel()` | routes:238 |
| `/api/ai/url-to-blocks` | 동상 | 동상 | routes:1072 |
| `/api/ai/content-to-store-use` | 동상 | 동상 | routes:1329 |
| `/api/ai/course-structure` | 동상 | 동상 | routes:1471 |
| `/api/ai/lesson-body` | 동상 | 동상 | routes:1624 |
| `/api/ai/vision/analyze` | `const model = 'gemini-2.5-flash'`(인라인 URL) | `const model = await resolveEditingModel()` | routes:126 |

- 5개(generateRawContent 경유): resolver 결과를 `model` 로 주입 → 서비스 내부 `resolveModel`(whitelist) 이 한 번 더 검증(이중 안전).
- vision(인라인 gemini URL): resolver 가 gemini whitelist 모델만 반환 → URL 안전.

## 7. hardcode fallback 정리 결과

- 편집 6개 endpoint 에서 **직접 모델 리터럴 0**(`rg "gemini-2.5-flash"` → 주석 0건/코드 0건). 모든 모델 결정이 `resolveEditingModel()` 경유.
- `gemini-2.5-flash` 는 **resolver 의 fallback 상수(`EDITING_MODEL_FALLBACK`)로만 잔존** — 제거 아님(WO §4).
- **범위 밖 잔여 hardcode 유지(후속 §8-4):** `ai-proxy.service.resolveModel`/`generateRawContent`(provider 기본), `ai-config-resolver.ts`, `ai-policy-executor.ts`, `LmsAIService`, `operator-ai-llm.service`, admin-dashboard builders.

## 8. 제외한 영역 (범위 밖)

- provider 교체(DeepSeek/Qwen/Kimi), `callProvider` 추상화 수렴(`generateRawContent` provider 고정 유지).
- 정책 테이블 SSOT 통합(`AiLlmPolicy`/`AiSettings`/`ai_model_settings`).
- 모델 후보 비교/확정, 가격/비용 최적화, prompt preset 표준, AiContentModal/ProductionTemplate, signage 구현, admin-builder 정리.
- DB/migration, reward/결제, LMS closure·Neture LMS 재논의.

## 9. 검증 결과

- **TypeScript:** `apps/api-server` `npx tsc --noEmit` **error 0**(신규 resolver + routes 포함).
- **정적:**
  - 편집 6개 endpoint 모두 `resolveEditingModel()` 사용(routes 6 call sites: 126/238/1072/1329/1471/1624). 직접 모델 리터럴 0.
  - `resolveEditingModel` 은 `AiQueryPolicy.defaultModel` read → admin 선택값이 편집 생성 경로에 **도달**.
  - `gemini-2.5-flash` 는 resolver fallback 으로만 잔존.
  - `/api/ai/query`(ai-query.service) 미변경 → 기존 동작 유지. admin activate(ai-admin.service) 미변경 → 기존 동작 유지.
  - provider 교체 미수행(편집 경로 gemini 유지). signage/admin-builder 미변경.
- **무변경:** package.json/pnpm-lock/Dockerfile, DB/migration.
- **런타임 smoke:** 미수행 — 배포 후 admin `AiEnginesPage` 에서 엔진(gemini 계열) 전환 → 편집 AI(예: POP/블로그 생성) 응답 로그의 `model` 이 선택값과 일치하는지 확인 권장(production write 없음).

## 10. 후속 작업

1. **`IR-O4O-AI-MODEL-CANDIDATE-COMPARISON-V1`** — Gemini/DeepSeek/Qwen/Kimi 후보 비교(배선 완료로 후보 교체가 비로소 의미).
2. **`WO-O4O-AI-PROVIDER-ABSTRACTION-CALLPROVIDER-ALIGNMENT-V1`** — `generateRawContent` 의 gemini 고정 provider 경로를 `callProvider` 계열로 수렴(provider 교체 가능화).
3. **`IR-O4O-AI-EDITING-PROMPT-PRESET-STANDARD-V1`** — surface별 preset prompt/tone/length/output 표준(모델 배선과 독립).
4. **`WO-O4O-AI-HARDCODED-GEMINI-CALLSITE-INVENTORY-FIX-V1`** — admin-builder·resolver·LMS service 등 §7 잔여 hardcode 단계 제거 + 정책 테이블 SSOT 통합.

## 11. 완료 판정

**PASS.** 편집 AI 생성 6개 endpoint 가 `resolveEditingModel()`(SSOT=`AiQueryPolicy.defaultModel`)로 모델을 결정 → admin 엔진 선택이 편집 AI 생성에 **도달**. 하드코딩은 fallback 으로 강등, provider/정책통합/preset 은 후속 분리. api-server typecheck 0, `/api/ai/query`·admin activate 무회귀, DB/package/Dockerfile 무변경. **이 배선이 끝나야 모델 후보 비교가 편집 AI 에 실제 적용 가능해진다.**
