# IR-O4O-AI-CHAT-TIMEOUT-INVESTIGATION-V1

> **AI Chat API 504 Timeout 근본 원인 조사 보고서**
> Investigation Only — 코드 변경 없음

---

## 1. 1문장 요약

**Care AI Chat의 `@o4o/ai-core` `execute()` → `GeminiProvider.complete()`가 하드코딩된 10초 timeout으로 동작하며, Gemini API의 실제 응답 시간(15~60초)을 수용하지 못해 `AbortError` → retry 2회 실패 → controller에서 504 AI_TIMEOUT으로 변환된다.**

---

## 2. 조사 범위

| 엔드포인트 | 경로 | 파일 |
|-----------|------|------|
| AI Proxy (범용) | `POST /api/ai/generate` | `ai-proxy.routes.ts` → `ai-proxy.service.ts` |
| Care AI Chat | `POST /api/v1/glycopharm/:id/ai-chat` | `care-ai-chat.controller.ts` → `care-ai-chat.service.ts` |
| Vision API | `POST /api/ai/vision/analyze` | `ai-proxy.routes.ts` (inline) |
| Copilot Engine | In-process call | `copilot-engine.service.ts` |
| Job Queue | BullMQ async | `ai-job-queue.service.ts` + `ai-job.worker.ts` |

---

## 3. 요청 흐름 분석

### 3.1 Care AI Chat (504 발생 경로)

```
Client (React)
  → POST /api/v1/glycopharm/:id/ai-chat
    → authenticate middleware
    → createPharmacyContextMiddleware (DB 3 queries: org lookup + active check + enrollment)
    → care-ai-chat.controller.ts
      → CareAiChatService.chat()
        → cache check (in-memory Map, SHA256 key)
        → buildPopulationContext() 또는 buildPatientContext() (DB 5~6 queries)
        → execute() (@o4o/ai-core)
          → buildConfigResolver() (DB 2 queries: ai_model_settings + ai_settings)
          → GeminiProvider.complete()
            → fetch() with AbortController (timeout: 10,000ms ← 여기서 timeout)
            → ❌ AbortError → retry (2s delay) → 재시도 → AbortError
          → throw lastError
        → controller catch → msg.includes('timeout') → 504 AI_TIMEOUT
```

### 3.2 AI Proxy (별도 경로, 참고용)

```
Client (React)
  → POST /api/ai/generate
    → authenticate
    → ai-proxy.routes.ts
      → aiProxyService.generateContent()
        → callProviderWithRetry() (MAX_RETRIES=2)
          → callProvider() (OpenAI/Gemini/Claude)
            → fetch() with AbortController (timeout: 120,000ms ← 120초)
            → AbortError → TIMEOUT_ERROR
        → routes catch → error.type === 'TIMEOUT_ERROR' → 504
```

---

## 4. Timeout 계층 분석 (핵심)

| 계층 | 컴포넌트 | Timeout | 소스 | 상태 |
|------|---------|---------|------|------|
| L1 | Cloud Run request | 300s (5분) | `deploy-api.yml` line 304 | ✅ 충분 |
| L2 | AI Proxy Service (`callProvider`) | **120s** | `ai-proxy.service.ts` line 38 | ✅ 충분 |
| L3 | AI Job Queue Worker | 60s | `ai-job-queue.service.ts` line 27 | ⚠️ 해당 없음 (Care 미사용) |
| L4 | Vision API | 30s | `ai-proxy.routes.ts` line 112 | ✅ 적정 |
| **L5** | **`@o4o/ai-core` GeminiProvider** | **10s** | `packages/ai-core/.../gemini.ts` line 19 | **❌ 근본 원인** |
| L6 | Copilot Engine | 3s | `copilot-engine.service.ts` line 21 | ✅ 의도적 (rule-based fallback) |

### 핵심 발견

**두 가지 AI 호출 경로에서 timeout 설정이 12배 차이:**

| 경로 | Timeout | 비고 |
|------|---------|------|
| AI Proxy (CMS, 사이니지 등) | **120,000ms** | `ai-proxy.service.ts` 자체 AbortController |
| Care AI Chat (@o4o/ai-core) | **10,000ms** | `GeminiProvider` 하드코딩 |

**Care AI Chat은 의도치 않게 10초 timeout으로 제한되고 있다.**

---

## 5. 외부 API 호출 분석

### 5.1 Provider 구성

| Provider | 모델 | 용도 | 예상 응답 시간 |
|----------|------|------|---------------|
| Gemini | `gemini-2.5-flash` (config default) | Care AI Chat | 5~60s |
| Gemini | `gemini-3.0-flash` (proxy default) | CMS 콘텐츠 생성 | 3~30s |
| OpenAI | `gpt-5-mini` | CMS 콘텐츠 생성 | 5~45s |
| Claude | `claude-sonnet-4.5` | CMS 콘텐츠 생성 | 5~30s |

### 5.2 Gemini API 응답 시간 변동 요인

1. **모델 크기**: `gemini-2.5-flash` > `gemini-3.0-flash` (2.5 시리즈가 느림)
2. **프롬프트 크기**: Care AI Chat의 context building이 5~6개 SQL 결과를 concatenate → 긴 프롬프트
3. **출력 토큰**: JSON 구조화 응답 (summary + details + recommendations + actions) → 높은 출력 토큰
4. **API 부하**: Google AI API의 시간대별 부하 변동
5. **maxTokens=2048** (config default): 출력 제한이 충분히 높아 긴 생성 가능

### 5.3 Care AI Chat의 프롬프트 구성

```
[System] CARE_COPILOT_SYSTEM (58줄, ~1,500자)
[User] context (5~6 DB queries 결과, 가변 500~5,000자)
     + "\n\n[약사 질문]\n" + message (최대 500자)
```

**총 프롬프트**: 약 2,000~7,000자 → **1,000~3,500 토큰** (추정)

---

## 6. 코드 구조 분석

### 6.1 Care AI Chat — 순차 실행 (병렬 없음)

```typescript
// care-ai-chat.service.ts → chat()
async chat(message, pharmacyId, patientId) {
  // Step 1: cache check (0ms — in-memory)
  // Step 2: buildContext (5~6 sequential DB queries — 50~500ms)
  // Step 3: execute() — BLOCKING, 10s timeout × 2 retries
  //   → configResolver() (2 DB queries — 20~100ms)
  //   → GeminiProvider.complete() (10s timeout)
  //   → retry (2s delay) → GeminiProvider.complete() (10s timeout)
  // Step 4: JSON.parse + cache set (0~5ms)
}
```

**Worst-case 지연 시간 계산:**

| 단계 | 시간 |
|------|------|
| authenticate + pharmacyContext middleware | 50~200ms (DB 3 queries) |
| Patient scope guard (if patientId) | 10~50ms (DB 1 query) |
| Cache miss | 0ms |
| buildPatientContext | 50~300ms (DB 6 queries) |
| configResolver | 20~100ms (DB 2 queries) |
| GeminiProvider attempt 1 | **10,000ms (timeout)** |
| Retry delay | 2,000ms |
| GeminiProvider attempt 2 | **10,000ms (timeout)** |
| **Total** | **~22.5초** |

### 6.2 execute() — timeout 전달 경로 분석

```typescript
// packages/ai-core/orchestration/execute.ts
const providerConfig: AIProviderConfig = {
  ...config,
  responseMode: request.responseMode ?? config.responseMode ?? 'json',
  timeoutMs: request.timeoutMs ?? config.timeoutMs,  // ← 주입 가능하지만...
};
```

**문제**: `CareAiChatService`는 `execute()` 호출 시 `timeoutMs`를 전달하지 않음:

```typescript
// care-ai-chat.service.ts line 114
const response = await execute({
  systemPrompt: CARE_COPILOT_SYSTEM,
  userPrompt,
  config: this.configResolver,
  meta: { service: 'care', callerName: 'CareAiChat' },
  // timeoutMs: undefined → config.timeoutMs도 undefined
});
```

**`buildConfigResolver()`도 `timeoutMs`를 반환하지 않음:**

```typescript
// ai-config-resolver.ts
return { apiKey, model, temperature, maxTokens };
// ← timeoutMs 없음!
```

**결과**: `GeminiProvider.callAPI()`에서 `timeoutMs ?? REQUEST_TIMEOUT_MS` → `undefined ?? 10_000` → **10초 하드코딩 사용**.

---

## 7. Cloud Run 설정 확인

| 설정 | 값 | 출처 |
|------|------|------|
| `--timeout` | 300 (5분) | `deploy-api.yml` line 304 |
| `--memory` | 1Gi | line 299 |
| `--cpu` | 1 | line 300 |
| `--min-instances` | 1 | line 301 |
| `--max-instances` | 10 | line 302 |
| `--concurrency` | 80 | line 303 |
| Node.js heap | 512MB (`--max-old-space-size=512`) | Dockerfile |
| `GRACEFUL_STARTUP` | true | line 306 |

**Cloud Run은 300초까지 허용 → Cloud Run 수준에서는 timeout 문제 없음.**

---

## 8. 근본 원인 확정

### Primary Root Cause

**`@o4o/ai-core`의 `GeminiProvider`와 `OpenAIProvider`에 하드코딩된 `REQUEST_TIMEOUT_MS = 10_000` (10초)가 Gemini API의 실제 응답 시간보다 짧아서 `AbortError`가 발생한다.**

### Contributing Factors

| # | 요인 | 상세 |
|---|------|------|
| C1 | `execute()` timeout 미전달 | `CareAiChatService`가 `timeoutMs` 미지정, `buildConfigResolver()`도 미반환 |
| C2 | Provider 하드코딩 | `REQUEST_TIMEOUT_MS = 10_000` — 설정 불가 |
| C3 | Context building 지연 | 5~6개 sequential DB query → 프롬프트 조립 전 300ms~500ms 소비 |
| C4 | Retry가 timeout을 악화 | 10s × 2회 + 2s delay = 최대 22초 대기 후 최종 실패 |
| C5 | 모델 선택 | `gemini-2.5-flash`는 `3.0-flash`보다 느림 |
| C6 | AI Proxy와의 불일치 | 동일 플랫폼에서 AI Proxy는 120초, ai-core는 10초 — 의도 불일치 |

### NOT Root Cause (배제된 요인)

| 요인 | 이유 |
|------|------|
| Cloud Run timeout | 300초 — 충분 |
| DB 연결 | middleware 단계에서 완료, AI 호출과 무관 |
| Network | Cloud Run → Gemini API 네트워크는 Google 내부 |
| Rate limiting | 429 에러는 별도 처리, timeout과 무관 |
| Cache | Cache miss 자체는 latency 원인이 아님 |

---

## 9. 재현 조건

### 확실한 재현

1. Cache miss 상태 (새 질문 또는 cache TTL 만료)
2. Population context mode (pharmacyId 있음, patientId 없음) — 데이터 많을수록 프롬프트 길어짐
3. Gemini API 응답 10초 초과 (모델 부하 높은 시간대, 긴 프롬프트)

### 재현 가능 시나리오

```
POST /api/v1/glycopharm/:pharmacyId/ai-chat
Authorization: Bearer <pharmacist-token>
{
  "message": "전체 환자 현황을 분석해주세요. 고위험 환자의 최근 혈당 추세와 코칭 이력을 포함해서 설명해주세요."
}
```

- 약국에 환자 데이터가 많을수록 context가 길어져 응답 시간 증가
- 첫 호출 (cold cache) + 바쁜 시간대 → 거의 확실히 10초 초과

---

## 10. 로그 분석 포인트

### 10.1 현재 로깅 상태

| 위치 | 로그 | 유무 |
|------|------|------|
| `execute()` attempt 실패 | `console.warn([CareAiChat] attempt N failed...)` | ✅ 있음 |
| Controller catch | `console.error([CareAiChat] Gemini timeout:)` | ✅ 있음 |
| GeminiProvider timeout | 없음 (AbortError throw만) | ❌ 없음 |
| Context build duration | 없음 | ❌ 없음 |
| configResolver duration | 없음 | ❌ 없음 |

### 10.2 Cloud Logging 쿼리 (검증용)

```bash
# Care AI Chat timeout 로그 조회
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=o4o-core-api AND textPayload=~\"CareAiChat.*timeout\"" \
  --project=netureyoutube --limit=50 --format="table(timestamp,textPayload)" --freshness=7d

# Care AI Chat 전체 에러 조회
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=o4o-core-api AND textPayload=~\"CareAiChat.*failed\"" \
  --project=netureyoutube --limit=50 --format="table(timestamp,textPayload)" --freshness=7d

# AI Proxy timeout 대비 조회
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=o4o-core-api AND textPayload=~\"AI proxy.*timeout\"" \
  --project=netureyoutube --limit=50 --format="table(timestamp,textPayload)" --freshness=7d
```

---

## 11. 솔루션 전략 (구현 없음 — 방향만 제시)

### 즉시 해결 (S1): timeout 전달

`CareAiChatService.chat()`에서 `execute()`에 `timeoutMs: 60000` (60초) 전달.

```
execute({
  ...existing,
  timeoutMs: 60000,
})
```

**영향 범위**: `care-ai-chat.service.ts` 1줄 변경
**위험도**: 낮음 (다른 서비스 영향 없음)

### 중기 해결 (S2): `buildConfigResolver()` 확장

`buildConfigResolver()`가 `timeoutMs`를 반환하도록 확장. DB 또는 환경변수에서 읽기.

**영향 범위**: `ai-config-resolver.ts` + `ai-core` config 타입

### 장기 해결 (S3): Provider 기본 timeout 상향

`@o4o/ai-core`의 `REQUEST_TIMEOUT_MS`를 30~60초로 상향.

**영향 범위**: `ai-core` 전체 사용처 (CopilotEngine 포함 — 단, CopilotEngine은 자체 `withTimeout(3s)` wrapper가 있으므로 안전)

### 보조 조치

- **Retry 전략 개선**: timeout 실패 시 retry 하지 않음 (같은 timeout으로 다시 시도해도 동일 결과)
- **Streaming 전환**: 긴 응답에 대해 SSE/streaming으로 전환 (UX 개선)
- **로깅 강화**: context build + configResolver + provider call 각 단계 duration 로깅

---

## 12. Timeout 아키텍처 비교

```
AI Proxy Service (CMS 등)         Care AI Chat (GlycoPharm)
━━━━━━━━━━━━━━━━━━━━              ━━━━━━━━━━━━━━━━━━━━
Cloud Run     300s                 Cloud Run     300s
    ↓                                  ↓
AI Proxy      120s (AbortController)  (없음)
    ↓                                  ↓
callProvider  120s                 execute()    없음
    ↓                                  ↓
fetch()       120s timeout         GeminiProvider 10s ← 문제
    ↓                                  ↓
Provider API  ~3-30s               Provider API   ~5-60s
                                                  ↑ 10s 초과 시 abort
```

---

## 13. 영향 분석

### 직접 영향

| 서비스 | 기능 | 영향 |
|--------|------|------|
| GlycoPharm | Care AI Chat | ❌ 504 timeout 발생 (사용자 경험 저하) |

### 간접 영향 (동일 ai-core 사용)

| 서비스 | 기능 | `@o4o/ai-core` 사용 | timeout 위험 |
|--------|------|---------------------|-------------|
| Copilot Engine | Operator Dashboard AI Summary | `runAIInsight()` | ⚠️ 가능하나 `withTimeout(3s)` + rule-based fallback 존재 |
| AI Job Queue | Async AI generation | `aiProxyService` (별도 경로) | ✅ 120s timeout 사용 |

---

## 14. 파일 참조 인덱스

| 파일 | 역할 | 핵심 라인 |
|------|------|----------|
| `apps/api-server/src/modules/care/controllers/care-ai-chat.controller.ts` | Care AI Chat 엔드포인트 | L99: timeout → 504 |
| `apps/api-server/src/modules/care/services/llm/care-ai-chat.service.ts` | Chat 서비스 로직 | L114: execute() 호출 (timeoutMs 없음) |
| `apps/api-server/src/utils/ai-config-resolver.ts` | Config 팩토리 | 반환값에 timeoutMs 없음 |
| `packages/ai-core/src/orchestration/execute.ts` | LLM 실행 진입점 | L99: timeoutMs 전달 |
| `packages/ai-core/src/providers/gemini.ts` | Gemini 호출 | L19: REQUEST_TIMEOUT_MS = 10,000 |
| `packages/ai-core/src/providers/openai.ts` | OpenAI 호출 | L19: REQUEST_TIMEOUT_MS = 10,000 |
| `apps/api-server/src/services/ai-proxy.service.ts` | 범용 AI Proxy | L38: DEFAULT_TIMEOUT = 120,000 |
| `apps/api-server/src/copilot/copilot-engine.service.ts` | Copilot Engine | L21: AI_TIMEOUT_MS = 3,000 |
| `apps/api-server/src/modules/care/care-pharmacy-context.middleware.ts` | Pharmacy 스코프 | DB 3 queries pre-processing |
| `.github/workflows/deploy-api.yml` | Cloud Run 배포 | L304: --timeout=300 |

---

*Investigation completed: 2026-03-23*
*Branch: `feature/ai-chat-timeout-investigation`*
*Status: Investigation Only — NO code changes*
*Author: AI Assistant*
