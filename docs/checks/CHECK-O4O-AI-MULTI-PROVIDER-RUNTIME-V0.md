# CHECK-O4O-AI-MULTI-PROVIDER-RUNTIME-V0

- **WO**: WO-O4O-AI-MULTI-PROVIDER-RUNTIME-V0
- **일자**: 2026-09-09
- **선행**: PHASE 3 CLOSED (COMMON-HOME-AI-INPUT-V0 · HOME-AI-PRODUCTION-CREDENTIAL-AND-CLOSURE-V1 · AI-USAGE-FLOW-BASELINE-REALIGNMENT-V1)
- **작업 브랜치**: `work/ai-multi-provider-runtime-v0` (전용 worktree `C:/tmp/o4o-work-scope`)
- **범위**: 두 provider(gemini/openai)를 **같은 공통 런타임에서 선택 호출**. 자동 라우팅·비용 최적화 없음.

---

## 1. 기존 `@o4o/ai-core` 조사

### 1-1. Multi-provider 는 이미 절반 이상 구현돼 있었다

| 항목 | 실측 | 판정 |
|---|---|:---:|
| `execute()` | `packages/ai-core/src/orchestration/execute.ts:99` | 이미 provider-agnostic |
| provider 타입 | `:27` `AIExecuteProviderId = 'gemini' \| 'openai'` | 이미 존재 |
| registry | `:74-77` `{ gemini: new GeminiProvider(), openai: new OpenAIProvider() }` | 이미 존재 |
| dispatch | `:102-107` `request.provider ?? 'gemini'` → 없으면 `INVALID_PROVIDER` throw | 이미 존재 |
| OpenAI adapter | `providers/openai.provider.ts:40` (chat/completions, timeout, json/text, usage 파싱) | 이미 존재 |
| 키 해석 | `apps/api-server/src/utils/ai-key.util.ts:17` `{gemini:'GEMINI_API_KEY', openai:'OPENAI_API_KEY', claude:'CLAUDE_API_KEY'}` | 이미 provider-keyed |

**따라서 이번 WO 는 런타임을 새로 만들지 않았다.** 실제 결손만 메웠다.

### 1-2. 실제 결손 (이번 WO 가 고친 것)

1. **OpenAI adapter 가 현행 세대 모델과 파라미터가 맞지 않았다** — `max_tokens` + `temperature` 를 보낸다(`openai.provider.ts:55-64` 기존). 현행 세대는 `max_completion_tokens` 를 쓰고 `temperature`/`top_p` 를 거부한다.
2. **앱 계층에 provider-aware 해석기가 없었다** — `ai-config-resolver.ts` 는 gemini 하드코딩, `ai-editing-model-resolver.ts` 는 `MODEL_WHITELIST.gemini` 로만 검증(`isGeminiModel`), `deriveProviderFromModel()` 에 `openai` 분기 없음.
3. **`/home-chat` 이 `provider: 'gemini'` 로 고정**(`ai-proxy.routes.ts` 기존 :1878).
4. **오류 코드 체계가 없었다** — ai-core 는 평문 `Error` 만 던지고 retry 판정도 `msg.includes(...)` 문자열 매칭(`execute.ts:152`).
5. **`MODEL_WHITELIST.openai` 가 낡았다** — `gpt-5/gpt-4o` 세대만 있고 현행 라인업 부재.
6. **`OPENAI_API_KEY` 가 배포되지 않는다** — `deploy-api.yml` 에 `GEMINI_API_KEY` 만 존재.

### 1-3. Frozen Core 취급

`@o4o/ai-core` 는 **F1 Frozen** (Operator OS, 2026-02-16). 이번 변경은 F1 의 허용 범위인
**버그 수정**(현행 모델에 거부되는 파라미터를 보내던 문제)에 해당하고, 본 WO §22 가
`packages/ai-core` 내 provider abstraction 정리를 명시 지시했다. **구조 변경 없음** —
인터페이스·registry·`execute()` 시그니처 전부 그대로다.

---

## 2. OpenAI 기존 코드 조사 (§5-B)

- `OpenAIProvider` 는 존재하나 **실사용 호출부가 0** 이었다. `provider: 'openai'` 를 정적으로 넘기는 코드가 없고, 동적 분기 2곳(`LmsAIService.ts:135`, `operator-ai-llm.service.ts:146`)은 `process.env.GEMINI_API_KEY ? 'gemini' : 'openai'` 라 GEMINI 키가 있는 한 도달하지 않는다.
- **`openai` npm 패키지 미의존** (`apps/api-server/package.json` · `package.production.json` 모두). `@o4o/ai-core` 는 `dependencies: {}` 로 의존성 0 이고 전부 raw `fetch` 다.
  → **신규 dependency 를 추가하지 않았다.** 기존 fetch 클라이언트를 그대로 고쳤다(§9 "이미 dependency 가 있으면 재사용", CLAUDE.md dependency 변경 중지 조건 회피).

---

## 3. Astra 실제 API model mapping (§10 — 추측 금지 조항)

**공식 문서로 확인했다. 추측하지 않았다.**

| 확인 항목 | 결과 |
|---|---|
| API model identifier | **`gpt-6-astra`** |
| 엔드포인트 | `v1/chat/completions` **및** `v1/responses` **둘 다 지원** → 기존 chat/completions adapter 재사용 가능(Responses API 이관 불필요) |
| context / max output | 1,050,000 ctx / 128,000 max output |
| 단가 | 입력 **$10** / 출력 **$50** per 1M (cached input $1, cache write $12.5). 272K 초과 프롬프트는 입력 2x·출력 1.5x |
| snapshot alias | 없음 (`gpt-6-astra` 단일) |
| tool calling | 지원됨 → 이번 V0 는 **요청에 tool 을 싣지 않는다**(§4·§19 준수) |
| **파라미터 제약** | **`temperature` · `top_p` · `top_logprobs` 제거 필수** (공식 가이드 명시). reasoning 계열이라 `reasoning_effort` 사용, `none` effort 미지원 |
| 토큰 상한 필드 | reasoning 세대는 `max_tokens` 아닌 **`max_completion_tokens`** (구 필드는 조용히 실패) |

**현행 OpenAI 라인업 (2026-09 확인)** — 단가 차이가 매우 크다:

```text
gpt-6-astra    $10   / $50    (플래그십, 기본값)
gpt-5.6-sol    $4    / $20
gpt-5.6-terra  $2    / $12
gpt-5.6-luna   $0.20 / $1.20  (경제형)
```

> ⚠️ **"Astra" 는 OpenAI 제품이 맞다.** 사전 지식으로는 Google 계열로 오인할 여지가 있었으나
> 공식 문서 확인 결과 OpenAI 의 `gpt-6-astra` 이다. §10 이 요구한 확인 절차가 실제로 오판을 막았다.

출처: [GPT-6 Astra Model | OpenAI API](https://developers.openai.com/api/docs/models/gpt-6-astra) · [Models | OpenAI API](https://developers.openai.com/api/docs/models) · [Model guidance](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-6-astra)

---

## 4. provider contract

기존 `ai-core` 계약을 **그대로 사용**한다. 새 타입을 만들지 않았다.

```ts
// packages/ai-core (기존)
type AIExecuteProviderId = 'gemini' | 'openai';
execute({ systemPrompt, userPrompt, provider?, responseMode?, config, retry?, timeoutMs?, meta? })
  → { content, model, promptTokens, completionTokens, durationMs, requestId }
```

앱 계층 해석기만 신규 (`apps/api-server/src/utils/ai-provider-runtime.ts`):

```ts
type RuntimeProvider = 'gemini' | 'openai';
resolveProvider(requested?) : RuntimeProvider          // 명시 → env → 코드기본
resolveModelForProvider(p)  : Promise<string>
resolveKeyForProvider(ds,p) : Promise<string>
resolveAiTarget(ds, requested?) : { provider, model, apiKey }
normalizeAiError(err) : { code: AiErrorCode; retryable: boolean }
aiErrorUserMessage(code) : string
```

---

## 5. Gemini adapter

**변경 없음.** 프로덕션에서 동작 중인 경로를 그대로 둔다(§8).
모델은 기존 `resolveEditingModel()`(정책 → `AI_DEFAULT_MODEL` → `gemini-2.5-flash`)을 그대로 재사용한다.

---

## 6. OpenAI adapter

`packages/ai-core/src/orchestration/providers/openai.provider.ts` — **세대별 body 분기**를 넣었다.

```ts
export function isReasoningGenerationModel(model: string): boolean {
  return /^(gpt-[56]|o[1-9])/i.test(model.trim());
}
```

- **현행 세대**(`gpt-6-astra`, `gpt-5.6-*`, `gpt-5*`, `o*`): `max_completion_tokens` 사용, `temperature`·`top_p` **미전송**.
- **구세대**(`gpt-4o`, `gpt-4.1`): 종전 계약(`max_tokens` + `temperature`) 유지 — 기존 호출부 회귀 0.
- `response_format: json_object` 는 양 세대 공통(단 `responseMode:'text'` 면 미적용).
- 모델 목록을 하드코딩하지 않고 접두사로 판별한다 — 새 모델이 나올 때마다 깨지지 않게.
- 부수 수정: 타임아웃 오류 메시지가 **실제 적용된 timeout** 을 표시하도록 고쳤다(기존에는 상수 10000ms 를 그대로 찍어 90s 타임아웃에도 "10000ms" 로 보고 → 진단 오도).

`reasoning_effort` 는 **보내지 않는다**(모델 기본값 사용). 값 선택은 품질/비용 정책이라 별도 WO 대상.

---

## 7. default provider 방식 (§7 · §16)

3경로만 허용한다. classifier·자동 라우팅 없음.

```text
1. 호출부 명시   execute 호출 시 provider 인자 / home-chat body.provider
2. env 기본값    AI_DEFAULT_PROVIDER = 'gemini' | 'openai'
3. 코드 기본값   FALLBACK_DEFAULT_PROVIDER = 'gemini'
```

**코드 기본값을 `gemini` 로 둔 이유** (§7 권장은 OpenAI 계열이었다):

`OPENAI_API_KEY` 가 아직 배포되지 않은 상태에서 코드 기본값을 `openai` 로 두면
**현재 정상 동작 중인 Home AI 가 배포 즉시 죽는다.** 그래서 코드 기본값은 안전한 gemini 로 두고,
전환은 **코드 변경 없이** `AI_DEFAULT_PROVIDER=openai` 하나로 되게 했다(§11 "config/env 로 정한다").

모델도 같은 원리로 env 조절 가능:

```text
AI_DEFAULT_MODEL         gemini 모델 (기존)
AI_DEFAULT_MODEL_OPENAI  openai 모델 — 미설정 시 gpt-6-astra
```

잘못된 env 값(오타 등)은 **차단하지 않고 경고 로그 후 기본값으로 접는다** — env 오타가 AI 전체 장애가 되면 안 된다.

Home UI 에 provider selector 를 노출하지 않았다(§11). Home 은 provider 를 보내지 않으므로 실사용에서는 env/기본값이 쓰인다.

---

## 8. secret / deploy 구조 (§17 · §18)

`.github/workflows/deploy-api.yml` 에 3줄 추가 (기존 canonical deploy 경로 재사용, 수동 우회 배포 없음):

```text
--set-env-vars="OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}"
--set-env-vars="AI_DEFAULT_PROVIDER=${{ vars.AI_DEFAULT_PROVIDER }}"
--set-env-vars="AI_DEFAULT_MODEL_OPENAI=${{ vars.AI_DEFAULT_MODEL_OPENAI }}"
```

- 키는 **서버 전용**. 프런트 번들·응답·로그 어디에도 싣지 않는다. `VITE_*` AI 키 미도입.
- 이번 WO 작업 중 credential 을 출력하지 않았다(§30). 본 CHECK 에도 키 값 없음(§17).

> **(2026-09-09 갱신)** 최초 작성 시점에는 `OPENAI_API_KEY` GitHub secret 이 없었다.
> 이후 사용자가 secret 을 추가했고 canonical deploy-api 를 통해 주입돼
> revision `o4o-core-api-03568-k9r` 에서 설정 확인됐다(§16). 배선은 정상 동작한다.

---

## 9. error normalization (§14)

`normalizeAiError()` 가 **유일한** 정규화 지점이다. provider 별 원문을 공통 코드로 접는다.

```text
AI_NOT_CONFIGURED · INVALID_PROVIDER · AUTH_ERROR · RATE_LIMIT
TIMEOUT · PROVIDER_UNAVAILABLE · INVALID_MODEL · PROVIDER_ERROR
```

- 429 를 401/403 보다 **먼저** 판정한다 — 두 패턴이 한 메시지에 섞여 나오는 경우가 있다.
- 사용자 응답에는 **코드와 정형 문구만** 나간다. 원문(키·모델·상태코드 포함 가능)은 서버 로그에만.
- `/home-chat` 상태코드 매핑: `RATE_LIMIT`→429, `TIMEOUT`→504, 그 외→502.
- 기존 `sanitizeHomeChatError()` 는 provider 가 둘이 되면서 Home 전용 계층에 둘 이유가 없어졌다 → **제거하고 이 계층으로 수렴**(dead code 미잔존).

---

## 10. tests

`apps/api-server/src/__tests__/ai-multi-provider-runtime.spec.ts` — 네트워크·DB 없음.

| §19 | 케이스 | 결과 |
|---|---|---|
| 5 | 알 수 없는 provider 차단 (`claude`/`qwen`/공백/비문자열) | PASS |
| 4 | 기본 provider = 코드 기본값(gemini) | PASS |
| 4 | `AI_DEFAULT_PROVIDER` 로 전환 (대소문자 허용) | PASS |
| — | 오타 env → 장애 아닌 기본값 fallback | PASS |
| 3 | 호출부 명시가 env 보다 우선 | PASS |
| — | 명시값 무효 시 안전 fallback | PASS |
| — | openai 기본 모델 = `gpt-6-astra` / env 로 변경 / whitelist 밖 거부 | PASS |
| 2 | **현행 세대: `temperature` 미전송 + `max_completion_tokens` 사용** | PASS |
| 1·2 | 구세대: `max_tokens` + `temperature` 유지 (회귀 0) | PASS |
| — | json 모드 `response_format` / 키 없으면 호출 전 차단 | PASS |
| 6 | auth 오류 정규화 (openai 401 · gemini "API key not valid") | PASS |
| 7 | rate limit 정규화 (openai 429 · gemini RESOURCE_EXHAUSTED) | PASS |
| 8 | timeout 정규화 (양 provider) | PASS |
| — | 429+401 혼재 시 rate limit 우선 / retryable 판정 | PASS |
| 9 | **사용자 문구에 키·provider·모델·상태코드 없음** | PASS |
| 9 | 모든 코드가 문구를 가짐 (빈 응답 방지) | PASS |

회귀 동시 실행: `home-chat-ai-input` · `security/ai-orchestration` · `work-scope-store-resolution`
→ **4 suites / 84 tests 전부 PASS** (§19-10 WorkScope 계약 회귀 없음 포함).

```text
apps/api-server   npx tsc --noEmit   → 내 파일 오류 0 (잔여 61 = 기존 baseline)
packages/ai-core  typecheck          → PASS (exit 0)
packages/ai-core  build              → PASS
eslint (변경 6파일)                   → PASS (0)
```

잔여 61건은 직전 WO 와 동일 baseline — 60건 미빌드 패키지 TS2307, 1건 `dashboard-assets.mutation-handlers.ts` 기존 TS2345. 내가 만든/수정한 파일에는 0건.

---

## 11. production smoke — Gemini PASS · OpenAI 키 부재로 미검증

배포: `Deploy API Server` success · `Deploy Web Services` success · CodeQL success (commit `1c234382e`).

배포 리비전 env 실측 (이름·설정여부만, 값 미조회):

```text
GEMINI_API_KEY           set
OPENAI_API_KEY           EMPTY   ← GitHub secret 미존재
AI_DEFAULT_PROVIDER      EMPTY   → 코드 기본값 gemini 적용
AI_DEFAULT_MODEL_OPENAI  EMPTY   → 미사용
```

동일 문구(`약국 POP 제작 시 기본 원칙을 3가지로 알려줘`)로 실측:

| 케이스 | 결과 | 판정 |
|---|---|:---:|
| default (env 전부 비어있음) | 200 · `provider=gemini` · `model=gemini-2.5-flash` · 정상 답변 | ✅ |
| explicit `provider=gemini` | 200 · `provider=gemini` · `model=gemini-2.5-flash` · 정상 답변 | ✅ |
| explicit `provider=openai` | 502 · `code=AI_NOT_CONFIGURED` · 사용자 문구만 | ⚠️ 키 부재 |
| invalid `provider=claude` | 200 · `provider=gemini` 로 안전 대체 (500 아님) | ✅ |

**§21 Home AI 기본 provider smoke**: default 경로가 곧 Home 이 쓰는 경로다(Home 은 provider 를 보내지 않는다).
위 1행이 그 검증이며 정상이다. **기존 Gemini 경로 회귀 0.**

### OpenAI 경로가 "배선되어 있음"은 실증됐다

응답은 sanitize 되어 내부를 볼 수 없으므로 서버 로그로 확인했다:

```text
home-chat error  code=AI_NOT_CONFIGURED  retryable=False
error="AI_NOT_CONFIGURED: openai API key missing"
```

즉 `execute()` 가 **openai provider 로 dispatch** 했고(gemini 로 새지 않았다), config 해석까지 도달한 뒤
키가 없어서 멈췄다. provider 선택·모델 해석·오류 정규화 경로는 전부 동작한다.
**남은 것은 키 하나뿐이다.**

부수 실증: 사용자 응답에 provider·model·키·원문이 일절 나가지 않았고(§14), 잘못된 provider 값이
500 이 아니라 기본값 대체로 흡수됐다(§16).

### 남은 검증 (키 추가 후 재개)

```text
1. OPENAI_API_KEY GitHub secret 추가 → deploy-api 재배포
2. provider=openai → 200 + gpt-6-astra 텍스트 응답 (§20)
3. temperature 미전송 / max_completion_tokens 계약이 실제 API 에서 수용되는지 확인
4. 필요 시 AI_DEFAULT_PROVIDER=openai 로 전환 후 Home 기본 경로 재확인 (§21)
```

---

## 12. known drift

1. **`ai_query_policy.default_model` drift (§23)** — 이번 WO 와 **충돌하지 않는다.**
   `resolveEditingModel()` 이 gemini whitelist 로 검증해 비-gemini/미등재 값을 자동으로 fallback 시키므로,
   policy 에 무엇이 들어 있든 gemini 경로는 유효 모델을 받는다. openai 경로는 이 policy 를 아예 보지 않는다
   (별도 env). → **억지 정리하지 않았다**(§23 지시대로). 별도 policy WO 대상.
2. **`deriveProviderFromModel()` 에 `openai` 분기 없음** (`ai-editing-model-resolver.ts:80`) —
   `gpt-*` policy 값이 `gemini` 로 파생된다. **편집 경로 전용**이라 이번 런타임과 무관해 손대지 않았다.
   편집 경로를 multi-provider 로 넓힐 때 함께 정리해야 한다.
3. **`OpenAIProvider.supportsStreaming = false`** — SSE 경로는 gemini 전용으로 남는다.
   `executeStream()` 은 여전히 소비처 0 이라 실제 영향 없음.
4. **`/api/ai/query` 의 `column AiSettings.apikey does not exist`** — 본 WO 범위 밖(§24). 미수정.
5. **ai-core 내 provider→model 기본 맵**(`orchestrator.ts:205-212`)이 `gpt-4o-mini` 를 가리킨다 —
   `MODEL_WHITELIST.openai` 에 없는 값이다. `orchestrator.ts` 는 `execute()` 와 별개 경로이고
   이번 런타임이 쓰지 않아 손대지 않았다. 정리 시 whitelist 와 함께 맞춰야 한다.

---

## 13. 후속 작업

1. **`OPENAI_API_KEY` GitHub secret 추가** → 그 뒤 OpenAI production smoke + `AI_DEFAULT_PROVIDER=openai` 전환 검토.
2. **비용 정책** — `gpt-6-astra` 는 출력 $50/1M 로 `gemini-2.5-flash` 대비 훨씬 비싸다. Home AI 처럼 사용자 직접 입력 표면의 기본 모델로 쓸지, `gpt-5.6-luna`($1.20/1M) 급으로 낮출지 결정 필요. 현재는 env 한 줄로 조절 가능.
3. **사용량/비용 집계** — 직전 WO 부터 이어지는 항목. `execute()` 경로는 DB write 0 이라 토큰 사용량이 집계되지 않는다.
4. **AI Capability / Tool Routing V0** — 이번 V0 는 tool 을 싣지 않는다. `gpt-6-astra` 는 tool calling 을 지원하므로 그 위에서 설계 가능.
5. **편집 경로 multi-provider 확장** — 위 drift 2번과 함께.
6. **`reasoning_effort` 정책** — 현재 모델 기본값. 품질/지연/비용 트레이드오프라 별도 결정 필요.

---

## 14. 문서 정합

```text
문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
```

- `docs/baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md` — 직전 WO(AI-USAGE-FLOW-BASELINE-REALIGNMENT-V1, `89440e639`)에서 이미 재정렬됐다. 이번 변경(provider 다변화)은 그 문서의 실행 인프라 서술과 충돌하지 않으나, provider 가 둘이 된 사실은 반영돼 있지 않다. **내용 변경은 §16-4 상 인라인 금지**라 보고만 한다.

---

## 15. 완료 기준 대조 (WO §28)

| 기준 | 결과 |
|---|---|
| 1. OpenAI provider 호출 가능 | 코드·테스트 충족 · dispatch 실증(로그) · **프로덕션 응답 미검증**(키 부재) |
| 2. Gemini provider 호출 가능 | 충족 |
| 3. 동일 공통 execute contract | 충족 (기존 계약 그대로) |
| 4. caller provider 명시 가능 | 충족 |
| 5. default provider 존재 | 충족 (env + 코드 기본값) |
| 6. Home AI 기본 provider 정상 | 충족 (프로덕션 200) |
| 7. WorkScope 회귀 없음 | 충족 (테스트 포함) |
| 8. tool calling 0 | 충족 |
| 9. 자동 routing 0 | 충족 |
| 10. DB migration 0 | 충족 |
| 11. DB write 0 | 충족 |
| 12. secret leakage 0 | 충족 |
| 13. tests PASS | 충족 (84) |
| 14. type-check/build PASS | 충족 (baseline 단서 포함) |
| 15. production smoke PASS | **부분** — Gemini PASS / OpenAI 키 부재로 미검증. §11 |
| 16. CHECK 작성 | 충족 |
| 17. commit/push | 충족 |

---

## 16. Production Closure 시도 (2026-09-09, revision `o4o-core-api-03568-k9r`)

`OPENAI_API_KEY` 가 canonical deploy-api 를 통해 주입된 뒤 최종 smoke 를 수행했다.

리비전 env 실측 (이름·설정여부만):

```text
GEMINI_API_KEY           set
OPENAI_API_KEY           set      ← 이번에 주입됨
AI_DEFAULT_PROVIDER      EMPTY    → 코드 기본값 gemini 유지 (의도대로)
AI_DEFAULT_MODEL_OPENAI  EMPTY    → gpt-6-astra 기본값
```

동일 문구(`약국 POP 제작 시 기본 원칙을 3가지로 알려줘`) 기준:

| # | 케이스 | 결과 | 판정 |
|:-:|---|---|:---:|
| 1 | `provider=openai` | **429 · `RATE_LIMIT`** (실제 원인은 크레딧 소진) | ❌ **BLOCKED** |
| 2 | `provider=gemini` | 200 · `provider=gemini` · `gemini-2.5-flash` · 정상 답변 | ✅ PASS |
| 3 | provider 생략 (default) | 200 · `provider=gemini` · `gemini-2.5-flash` · 정상 답변 | ✅ PASS |
| 4 | Home AI (`neture.co.kr/`) | 입력창 배포 확인(`/assets/index-C-gj_T5v.js`). Home 은 `provider` 를 보내지 않으므로 경로가 #3 과 동일 | ✅ PASS |

### #1 차단 원인 — 키가 아니라 **크레딧**

서버 로그 실측:

```text
home-chat error  code=RATE_LIMIT
error='OpenAI API error 429: {"error":{"message":"You have no credits remaining.
       Add credits to continue using the API at
       https://platform.openai.com/settings/organization/billing/.","type":"insufficient_quota"}}'
```

- **키는 유효하다.** 무효 키였다면 401 `AUTH_ERROR` 로 끊긴다. 401 을 지나 quota 판정까지 갔다는 것은
  인증이 통과했다는 뜻이다. 즉 배선·인증·모델 해석은 전부 정상이고 **남은 것은 결제 뿐이다.**
- 조치 주체가 결제이므로 CLAUDE.md 중지 조건(**실제 계정·자격정보·외부 서비스 승인 필요**)에 해당한다.
  크레딧 충전은 수행하지 않았다.

### smoke 가 드러낸 결함 — 오분류 수정 (이번에 함께 고침)

OpenAI 는 `insufficient_quota`(크레딧 없음)를 rate limit 과 **같은 HTTP 429** 로 돌려주고
메시지에 `quota` 가 들어간다. 그 결과 §9 의 정규화기가 이를 `RATE_LIMIT` 으로 접었고,
사용자에게 **"요청이 많아 잠시 후 다시 시도해 주세요"** 라는 잘못된 안내가 나갔다(`retryable: true`).
크레딧이 없으면 재시도는 영원히 실패하므로, 이 문구는 운영자가 원인(결제)을 못 보게 만든다.

→ `INSUFFICIENT_QUOTA` 코드를 분리했다.

```text
판정 순서   timeout → INSUFFICIENT_QUOTA → RATE_LIMIT → auth → 5xx → model → 기타
            (429 + "quota" 가 겹치므로 크레딧 판정을 rate limit 보다 먼저 둔다)
retryable   false
HTTP        503 (429 아님 — 재시도 안내로 오해되면 안 된다)
사용자 문구  "AI 사용량이 모두 소진되었습니다. 관리자에게 문의해 주세요."
            ("잠시 후" 문구 없음 · credit/billing/quota 등 내부 사정 미노출)
```

프로덕션 실측 원문을 그대로 fixture 로 넣어 회귀를 고정했고, 순수 rate limit 이 여전히
`RATE_LIMIT` 으로 남는지도 함께 검증했다(과잉 분리 방지). 테스트 50건 PASS.

### 오분류 수정 후 프로덕션 재확인 (revision `c4cb8b230` 배포)

수정 배포 후 동일 3케이스를 다시 실측했다.

| 케이스 | 수정 전 | 수정 후 | 판정 |
|---|---|---|:---:|
| `provider=openai` | 429 · `RATE_LIMIT` · "요청이 많아 **잠시 후 다시 시도**해 주세요." | **503 · `INSUFFICIENT_QUOTA` · "AI 사용량이 모두 소진되었습니다. 관리자에게 문의해 주세요."** | ✅ 의도대로 |
| `provider=gemini` | 200 | 200 · `gemini-2.5-flash` · 정상 답변 | ✅ 회귀 0 |
| default (생략) | 200 | 200 · `provider=gemini` · 정상 답변 | ✅ 회귀 0 |

이제 크레딧 문제가 **재시도로 풀리는 일시적 혼잡처럼 보이지 않는다.** 운영자가 로그·응답 코드만 보고
원인이 결제라는 것을 알 수 있다. 사용자 문구에는 여전히 credit/billing/quota/provider/model 이 노출되지 않는다.

### 판정

```text
WO-O4O-AI-MULTI-PROVIDER-RUNTIME-V0 = NOT CLOSED (OpenAI 응답 미검증)

OPENAI PROVIDER      = BLOCKED (크레딧 소진 — 키·배선·인증은 정상)
GEMINI PROVIDER      = PASS
DEFAULT PROVIDER     = GEMINI (의도대로 유지)
HOME AI              = PASS
MULTI-PROVIDER RUNTIME = ESTABLISHED (dispatch·모델해석·오류정규화 실증)
AUTOMATIC ROUTING    = NOT IMPLEMENTED
```

WO 의 종료 조건은 "위 smoke가 **모두** PASS면 CLOSED" 이다. #1 이 PASS 가 아니므로
**CLOSED 로 선언하지 않는다.** 크레딧 충전 후 #1 만 재수행하면 종결 가능하다.

### 남은 단 하나

```text
1. OpenAI 조직에 크레딧 충전 (platform.openai.com 결제)
2. provider=openai 재호출 → 200 + gpt-6-astra 텍스트 응답 확인
   (재배포 불필요 — 키·배선은 이미 적용돼 있다)
```

`AI_DEFAULT_PROVIDER` 는 이번에도 전환하지 않았다(WO 범위 유지). Home 기본은 Gemini 그대로다.
