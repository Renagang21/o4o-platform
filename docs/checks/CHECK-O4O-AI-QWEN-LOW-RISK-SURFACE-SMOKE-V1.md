# CHECK-O4O-AI-QWEN-LOW-RISK-SURFACE-SMOKE-V1

> **선행**: `WO-O4O-AI-QWEN-SINGAPORE-LOW-RISK-SURFACE-EXPERIMENT-V1`(Qwen Singapore transport key-gated 배선) · `WO-O4O-AI-PROVIDER-ABSTRACTION-CALLPROVIDER-ALIGNMENT-V1`(provider×surface guardrail).
> **성격**: smoke / check. **production 기본값 미변경.** staging/local 전용.
> **결과**: **정적 코드 경로 검증 PASS (4/4)** · **라이브 실측(4.3 Qwen 성공 + 4.1/4.2/4.4 런타임) DEFERRED** — staging QWEN_API_KEY/임시 정책 필요(본 세션 환경 미보유).
> **작성일**: 2026-06-15

---

## 1. 목적
Qwen Singapore transport가 저위험 surface(pop/qr/blog)에서만 동작하고, 실패/키부재 시 Gemini fallback이 정상 작동하는지 검증한다. production 기본값을 변경하지 않는다.

## 2. 검증 방식 결정 (CLAUDE.md §8)
CLAUDE.md §8 검증 표는 "**코드 경로 정적 분석 ✅**" 과 "API 직접 호출 ✅" 를 모두 허용한다. 본 CHECK는 두 층으로 구성한다.

| 층 | 항목 | 본 세션 수행 가능? |
|----|------|:---:|
| A. 정적 코드 경로 검증 | guardrail·fallback·transport 정합 | ✅ 수행(PASS) |
| B. 라이브 런타임 실측 | 실제 생성/응답/속도/품질 | ⏭ DEFERRED(staging 필요) |

**B 가 본 세션에서 불가한 이유 (환경 제약, 날조 금지):**
- 로컬/스테이징 DB 부재 — `apps/api-server/.env` 의 `DB_HOST` 는 **프로덕션(방화벽 차단)**. 편집 AI 의 Gemini/Claude/OpenAI 키는 **DB(`resolveAiApiKey`) 저장** → 프로덕션 전용.
- `QWEN_API_KEY` 가 로컬 env 어디에도 없음(env 기반 유일 키).
- 제약상 production 에 QWEN_API_KEY 등록·기본 모델 qwen 변경 **금지**.
- 따라서 실제 호출(4.1 런타임/4.2 런타임/4.3/4.4 런타임)은 **staging 환경 + 임시 정책 + staging QWEN_API_KEY** 에서 운영자가 수행해야 함(§7 runbook). 결과 날조 대신 DEFERRED 로 정직 기록.

## 3. 검증 환경
- 정적 분석: 현재 main 체크아웃 코드(읽기 전용). 코드/DB/env 변경 0.
- 라이브(후속): staging 또는 local 전용. production 금지.

## 4. 정적 코드 경로 검증 (PASS 4/4)

### SSOT — provider×surface guardrail
`packages/types/src/ai-provider-guardrail.ts`:
- `AI_PROVIDER_GUARDRAILS`:
  - `gemini`: `defaultAllowed:true`, 전 surface 허용, 민감 default.
  - `qwen`: `defaultAllowed:false`, `requiresAdminOptIn:true`, **`allowedSurfaces:['pop','qr','blog']`**, `region:'singapore'`, `warningRequired:true`.
  - `deepseek`: `allowedSurfaces:[]` (**기본 금지**), `region:'china'`.
- `SURFACE_RISK`: pop/qr/blog = **low**; product-description/library-entry/resource/lms-lesson = **medium**.
- `isProviderAllowedForSurface(provider, surface)` = `allowedSurfaces.includes(surface)`.

### 결정 게이트 — `resolveEditingProvider({ surface })`
`apps/api-server/src/utils/ai-editing-model-resolver.ts:113-131`:
1. `geminiModel = resolveEditingModel()` (항상 gemini whitelist 유효값, throw 없음).
2. `intended = deriveProviderFromModel(policy.defaultModel)` — 접두사 `qwen`/`deepseek`/그외→gemini.
3. `intended==='gemini'` → `{gemini, geminiModel}`.
4. 비-gemini → **`surface && isProviderAllowedForSurface(intended, surface)` 일 때만** `{intended, rawModel}`, 아니면 **gemini fallback**.

### Transport 게이트 — `generateEditingRawContent(...)`
`apps/api-server/src/services/ai-proxy.service.ts:662-697`:
- `provider==='gemini'` → 검증된 `generateRawContent(gemini)` (불변 경로).
- `provider==='qwen'`:
  - `QWEN_API_KEY` 존재 → `fetchQwenRawContent` 시도, **catch 시 `logger.warn` + gemini fallback**.
  - 키 부재 → `logger.warn('… QWEN_API_KEY missing — gemini fallback')` + gemini fallback.
- 그 외 비-gemini(deepseek 등) → `logger.warn('non-gemini provider not wired — gemini fallback')` + gemini fallback.
- 최종 fallback: `generateRawContent({provider:'gemini', model: EDITING_MODEL_FALLBACK='gemini-2.5-flash'})`.

### Qwen transport 정합 — `fetchQwenRawContent(...)`
`ai-proxy.service.ts:708-787`:
- endpoint = `${QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'}/chat/completions` (**Singapore International**, trailing slash 제거).
- headers `Authorization: Bearer <QWEN_API_KEY>`, `response_format:{type:'json_object'}`, `temperature` 기본 0.5, `max_tokens` 기본 4096, `DEFAULT_TIMEOUT` AbortController.
- 429 → `RATE_LIMIT_ERROR(retryable)`, !ok → `PROVIDER_ERROR(upstream 200자)`, 빈 content → `PROVIDER_ERROR`.
- JSON 파싱: `JSON.parse` → 실패 시 ```` ```json ```` / `{…}` 정규식 추출 재시도.
- `logger.info('Qwen raw content generated', {promptTokens, completionTokens})` — **usage 토큰 로그(비용 모니터링 기반)**.
- 반환 `provider:'qwen'`(정보용 표기) — AIUsageLog enum(OPENAI/GEMINI/CLAUDE) 미포함 → DB usage log 미기록(후속 enum migration 필요, 코드 주석 명시).

### 4.1 Gemini default — **정적 PASS**
- 키 조건: QWEN_API_KEY 무관. `policy.defaultModel` gemini(또는 비-gemini라도 surface 매핑 무) → `resolveEditingProvider` → `{gemini}` → `generateRawContent(gemini)`.
- 로그: gemini 경로(`generateRawContent` telemetry). Qwen 분기 미진입.

### 4.2 Qwen key 없음 fallback — **정적 PASS**
- `policy.defaultModel='qwen-*'` + surface∈{pop,qr,blog} → `resolveEditingProvider` → `{qwen}`.
- `generateEditingRawContent`: `QWEN_API_KEY` 부재 → **`fetchQwen` 미호출**, `logger.warn('qwen selected but QWEN_API_KEY missing — gemini fallback')` → `generateRawContent(gemini, gemini-2.5-flash)`.

### 4.3 Qwen key 있음 success — **transport 정적 PASS · 라이브 DEFERRED**
- 키/베이스 존재 시 `fetchQwenRawContent` 도달 경로·요청/파싱/usage 로그 정합 확인(위).
- **라이브 실측(실제 생성·JSON 파싱 성공·한국어 품질·응답 속도)은 staging QWEN_API_KEY 필요 → DEFERRED**(§7).

### 4.4 불허 surface fallback — **정적 PASS**
- **product-description**: `editingSurfaceForOutputType('product_detail')='product-description'` → qwen allowedSurfaces 밖 → guardrail false → `{gemini}`. (medium)
- **lms-lesson**: 라우트가 `{surface:'lms-lesson'}` 명시 전달(routes:1627) → qwen 밖 → gemini fallback. (medium)
- **course-structure**: `generateEditingRawContent` 호출 시 **surface 미전달**(routes:1466-1467, "EditingSurface 밖 → gemini 유지") → `resolveEditingProvider({surface:undefined})` → 비-gemini라도 `args.surface` falsy → gemini fallback.
- **vision/analyze**: gemini-only 인라인 경로(routes:91-126), `resolveEditingModel`(gemini whitelist)만 사용, `generateEditingRawContent`/qwen transport 미경유 → **qwen 미개방**.
- 결론: qwen 은 pop/qr/blog 외 어떤 surface 에서도 열리지 않음(정적 확정).

## 5. 기록 항목

| 항목 | 값 / 결과 |
|------|----------|
| 테스트 환경 | 정적: main 코드 읽기 전용 / 라이브: staging·local (후속, 본 세션 미보유) |
| QWEN_API_KEY 사용 여부 | **미사용**(로컬 부재) — 라이브는 staging 전용 설정 필요 |
| QWEN_BASE_URL | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` (Singapore International, 코드 기본값) |
| 테스트 surface | 정적: pop/qr/blog(허용) + product-description/lms-lesson/course-structure/vision(불허·미개방) |
| defaultModel 임시 설정 방식 | `AiQueryPolicy`(id=1)`.defaultModel='qwen-*'` — **staging DB 에서만** 임시. production 금지 |
| Gemini default 결과 | 정적 PASS (Qwen 분기 미진입) · 라이브 DEFERRED |
| key 없음 fallback 결과 | 정적 PASS (warn + gemini, fetchQwen 미호출) · 라이브 DEFERRED |
| key 있음 Qwen 결과 | transport 정적 PASS · **라이브 DEFERRED**(생성/파싱/품질/속도 미측정) |
| 불허 surface fallback 결과 | 정적 PASS (pop/qr/blog 외 미개방) · 라이브 DEFERRED |
| 품질 평가 | 미측정(staging 라이브 필요) |
| 속도 평가 | 미측정(staging 라이브 필요) — 코드 timeout = `DEFAULT_TIMEOUT` |
| 오류/fallback 로그 | 코드상 `logger.warn`(키부재/transport 실패/미배선) + `logger.info`(qwen routing/generated) 존재 확인 |
| 비용 모니터링 가능 여부 | logger.info 에 prompt/completion 토큰 기록. **AIUsageLog DB 기록은 qwen enum 부재로 불가** → 후속 enum 확장 필요 |
| production 미변경 확인 | ✅ 코드/DB/env/migration/package.json/lockfile 변경 0. 산출물 = 본 CHECK 문서 1개 |

## 6. 안전 경계 재확인
- production 에 QWEN_API_KEY 미등록 · 기본 모델 qwen 미변경 · 환자/처방/PII/계약정보 미입력 · medium surface 미테스트 · DeepSeek 미테스트(allowedSurfaces 빈 배열, transport 미배선). 모두 준수.

## 7. 라이브 실측 runbook (staging 운영자 수행 — DEFERRED 항목)
> 모두 **staging/local 한정**. production 금지. 실측 후 본 CHECK 의 5절 DEFERRED 항목을 갱신한다.

1. **4.1 Gemini default**: staging 에서 QWEN_API_KEY 미설정, `AiQueryPolicy.defaultModel`=gemini 계열. POP 또는 blog 생성 → 정상 + 로그 gemini 경로 확인.
2. **4.2 key 없음 fallback**: staging DB 에서 `defaultModel='qwen-*'` 임시 설정, QWEN_API_KEY **미설정**. pop/blog 호출 → 생성 정상 + 로그 `QWEN_API_KEY missing — gemini fallback` warn 확인(Qwen 호출 0).
3. **4.3 key 있음 success**: staging 에만 `QWEN_API_KEY` + `QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1` 설정, `defaultModel='qwen-*'`. **pop 또는 blog 1개만** 호출 → 로그 `routing to qwen (Singapore)` + `Qwen raw content generated` 확인, 결과 JSON 파싱 정상·한국어 품질·응답 속도 기록.
4. **4.4 불허 surface fallback**: `defaultModel='qwen-*'` 상태에서 product-description / lms-lesson 호출 → gemini fallback 확인. course-structure / vision → qwen 미개방 확인.
5. 실측 종료 후 staging 의 임시 `defaultModel`·QWEN_API_KEY **원복/제거**.

## 8. 완료 판정
**정적 검증 PASS (4/4)** — guardrail(pop/qr/blog 한정)·key-gating·transport 실패/부재 시 Gemini fallback·불허 surface 미개방·DeepSeek 금지 모두 코드 경로로 확정. production 미변경. **라이브 런타임 실측은 staging QWEN_API_KEY/임시 정책 환경에서 DEFERRED**(§7 runbook). 본 세션에서 라이브 실행은 환경 미보유로 불가하여 날조 대신 정직 기록.

## 9. 후속 작업 (제안)
1. `WO-O4O-AI-ADMIN-PROVIDER-SELECTION-UX-V1` — admin 에서 Qwen 선택 + 경고 문구(`PROVIDER_WARNINGS.qwen`) 안전 노출. **이 smoke 라이브 PASS 후 진행 권장**(UI 먼저 열지 않음).
2. `WO-O4O-AI-USAGELOG-PROVIDER-ENUM-EXTEND-V1` — AIUsageLog provider enum 에 qwen 추가(DB usage/비용 기록 가능화).
3. `IR-O4O-AI-PROVIDER-SURFACE-RISK-MATRIX-V1` — medium surface(product-description/library-entry/resource/lms-lesson) 확장 전 세부 위험도 조사.
4. `KEEP-O4O-AI-DEEPSEEK-FIRSTPARTY-BLOCKED-V1` — DeepSeek 1st-party(`allowedSurfaces:[]`, transport 미배선) blocked 상태 고정.

---

*Date: 2026-06-15 · CHECK-O4O-AI-QWEN-LOW-RISK-SURFACE-SMOKE-V1 · 정적 PASS 4/4 + 라이브 DEFERRED(staging). production 미변경. Qwen=pop/qr/blog 한정·key-gated·Gemini fallback 정합 확정.*
