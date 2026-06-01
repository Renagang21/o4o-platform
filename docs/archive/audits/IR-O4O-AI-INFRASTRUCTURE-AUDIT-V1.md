# IR-O4O-AI-INFRASTRUCTURE-AUDIT-V1

> **Investigation Report — O4O Platform AI Infrastructure Comprehensive Audit**
> Date: 2026-03-09
> Status: Complete
> Scope: Platform-wide AI/LLM provider, model configuration, services, prompts, UI integration, error handling, usage tracking

---

## Executive Summary

O4O Platform의 AI 인프라를 전수 조사한 결과, **3개 계층**의 AI 시스템이 존재한다:

| Layer | Component | Status |
|-------|-----------|--------|
| **L1 — AI Core Package** | `@o4o/ai-core` orchestration + GeminiProvider + OpenAIProvider | Implemented, not actively used by Care |
| **L2 — API Server Services** | AI Proxy, Google AI, Care LLM, Care Coaching, SiteGuide | Active (Care + SiteGuide) |
| **L3 — Frontend Prompts** | `ai-common-core` GlucoseView prompts (7 templates) | Defined, frontend-only |

**Critical Finding**: `GEMINI_API_KEY`가 Cloud Run에 미설정 → **Care AI 미동작** (WO-O4O-CARE-AI-EXPLANATION-LAYER-V1에서 수정 완료, 배포 대기)

---

## 1. Provider Layer

### 1.1 GeminiProvider (AI Core)

**File**: `packages/ai-core/src/orchestration/providers/gemini.provider.ts`

| Item | Value |
|------|-------|
| API Endpoint | `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` |
| Auth | Query parameter `?key={apiKey}` |
| Default Model | `gemini-2.0-flash` |
| Timeout | 10,000ms |
| Max Retries | 1 (JSON parse failure only) |
| JSON Mode | `responseMimeType: 'application/json'` |
| Default Temperature | 0.3 |
| Default Max Tokens | 2048 |

**Token Tracking**: `usageMetadata.promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`

### 1.2 OpenAIProvider (AI Core)

**File**: `packages/ai-core/src/orchestration/providers/openai.provider.ts`

| Item | Value |
|------|-------|
| API Endpoint | `https://api.openai.com/v1/chat/completions` |
| Auth | `Authorization: Bearer {apiKey}` |
| Default Model | `gpt-4o-mini` |
| Timeout | 10,000ms |
| Max Retries | 1 (JSON parse failure only) |
| JSON Mode | `response_format: { type: 'json_object' }` |

### 1.3 AI Proxy Service (3-Provider Gateway)

**File**: `apps/api-server/src/services/ai-proxy.service.ts`

| Provider | Default Model | Endpoint | Auth |
|----------|--------------|----------|------|
| OpenAI | `gpt-5-mini` | `https://api.openai.com/v1/chat/completions` | Bearer token |
| Gemini | `gemini-2.5-flash` | `v1beta/models/{model}:generateContent` | Query param key |
| Claude | `claude-sonnet-4.5` | `https://api.anthropic.com/v1/messages` | `x-api-key` header |

**Timeout**: 120,000ms | **Max Retries**: 2 | **Backoff**: Exponential with ±20% jitter

**Model Whitelist**:
```
openai: gpt-5, gpt-5-mini, gpt-5-nano, gpt-4.1, gpt-4o
gemini: gemini-3.0-flash, gemini-3.0-pro, gemini-2.0-flash, gemini-2.0-flash-lite, gemini-1.5-flash, gemini-1.5-pro
claude: claude-sonnet-4.5, claude-opus-4, claude-sonnet-4
```

**Parameter Limits**:
| Param | OpenAI | Gemini | Claude |
|-------|--------|--------|--------|
| maxTokens | 8192 | 32768 | 8192 |
| temperature | 0–2 | 0–2 | 0–2 |
| maxRequestSize | 256KB | 256KB | 256KB |

### 1.4 Google AI Service (Legacy)

**File**: `apps/api-server/src/services/google-ai.service.ts`

| Item | Value |
|------|-------|
| Pattern | Singleton (`getInstance()`) |
| Default Model | `gemini-2.0-flash` |
| Timeout | 30,000ms |
| Default Temperature | 0.7 |
| Used By | SiteGuide |

### 1.5 AI Core Orchestrator

**File**: `packages/ai-core/src/orchestration/orchestrator.ts`

Pipeline: Request → Context Builder → Prompt Composer → Provider → Response Normalizer → Action Mapper → Audit

**Service IDs**: `kpa`, `neture`, `glycopharm`, `glucoseview`, `cosmetics`

---

## 2. Model Configuration (DB)

### 2.1 ai_settings Table

**Entity**: `apps/api-server/src/entities/AiSettings.ts`

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| provider | VARCHAR(255) UNIQUE | `openai` / `gemini` / `claude` |
| apiKey | TEXT, nullable | Provider API key |
| defaultModel | VARCHAR(255), nullable | Default model name |
| settings | JSON, nullable | Additional settings |
| isActive | BOOLEAN (default true) | Active flag |
| createdAt / updatedAt | TIMESTAMP | |

**API Key Resolution (all AI services)**:
1. DB: `ai_settings` WHERE provider=X AND isActive=true → `apiKey`
2. Env: `GEMINI_API_KEY` / `OPENAI_API_KEY` / `CLAUDE_API_KEY`

### 2.2 ai_model_settings Table

**Entity**: `apps/api-server/src/modules/care/entities/ai-model-setting.entity.ts`

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | SERIAL PK | | |
| service | VARCHAR(50) UNIQUE | | `'care'` seeded |
| model | VARCHAR(100) | `gemini-2.0-flash` | |
| temperature | NUMERIC(3,2) | 0.3 | |
| max_tokens | INT | 2048 | |
| updated_at | TIMESTAMPTZ | now() | |

---

## 3. AI Call Services

### 3.1 CareLlmInsightService

**File**: `apps/api-server/src/modules/care/services/llm/care-llm-insight.service.ts`

| Item | Value |
|------|-------|
| Provider | Gemini (via `@o4o/ai-core` GeminiProvider) |
| Trigger | `care-analysis.controller.ts` → `generateAndCache()` fire-and-forget |
| Key Source | ai_settings DB → GEMINI_API_KEY env fallback |
| Model Source | ai_model_settings WHERE service='care' |
| Output | `{ pharmacyInsight, patientMessage }` |
| Storage | `care_llm_insights` table |
| Token Tracking | prompt_tokens, completion_tokens per record |
| Error Pattern | Fire-and-forget (catch → console.error, never throws) |

### 3.2 CareCoachingDraftService

**File**: `apps/api-server/src/modules/care/services/llm/care-coaching-draft.service.ts`

| Item | Value |
|------|-------|
| Provider | Gemini (same as above) |
| Trigger | `care-analysis.controller.ts` → `generateAndCache()` fire-and-forget |
| Output | `{ draftMessage }` |
| Storage | `care_coaching_drafts` table |
| Lifecycle | `draft` → `approved` (creates coaching session) / `discarded` |
| Error Pattern | Fire-and-forget |

### 3.3 SiteGuide AI Query

**File**: `apps/api-server/src/routes/siteguide/siteguide.routes.ts`

| Item | Value |
|------|-------|
| Provider | Gemini (via GoogleAIService) |
| Key Source | `GOOGLE_AI_API_KEY` / `GEMINI_API_KEY` env |
| Auth | `X-SITEGUIDE-KEY` header (per-business API key) |
| Max Output | 500 tokens |
| Temperature | 0.7 |
| Daily Quota | Per-business limit |
| Kill Switch | Global disable via admin endpoint |

### 3.4 AI Proxy Service

**File**: `apps/api-server/src/services/ai-proxy.service.ts`

General-purpose AI gateway (OpenAI/Gemini/Claude). Used by signage content generation and other block-based AI features.

### 3.5 Non-LLM AI Services

| Service | File | Nature |
|---------|------|--------|
| AIDescriptionService | `packages/cosmetics-partner-extension/.../ai-description.service.ts` | Template-based (no LLM call) |
| AIRoutineService | `packages/cosmetics-partner-extension/.../ai-routine.service.ts` | Template-based (no LLM call) |
| ForumAIService | `apps/api-server/src/services/forum/ForumAIService.ts` | Rule-based default (adapter pattern for future LLM) |

### 3.6 Supporting Services

| Service | Purpose |
|---------|---------|
| `ai-admin.service.ts` | Admin control plane for AI engines |
| `ai-query.service.ts` | B2C AI query with daily quotas |
| `ai-metrics.service.ts` | Token and cost metrics tracking |
| `ai-block-writer.service.ts` | Saves AI-generated React blocks + git auto-commit |
| `ai-dlq.service.ts` | Dead Letter Queue for failed AI jobs |
| `ai-job-queue.service.ts` | BullMQ async AI job queue |
| `ai-operations.service.ts` | Operational tasks |
| `ai-usage-report.service.ts` | Usage analytics and reporting |

---

## 4. Prompt Structure

### 4.1 Care LLM Insight — System Prompt

```
당신은 약국 환자 케어 데이터를 설명하는 전문 도우미입니다.

역할:
- 분석 결과를 쉬운 한국어로 설명합니다.
- 의료적 진단, 처방, 치료 권고를 절대 하지 않습니다.
- 관찰된 데이터 패턴만 설명합니다.
- "~경향이 관찰됩니다", "~패턴이 보입니다" 형태로 표현합니다.

출력 형식 (반드시 아래 JSON만 출력):
{
  "pharmacyInsight": "약사를 위한 전문적 분석 설명 (2-3문장). 전문의 상담 권장 문구를 끝에 포함.",
  "patientMessage": "환자를 위한 쉬운 설명 (2-3문장). 격려와 생활 습관 팁 포함."
}

제약:
- 반드시 위 JSON 형식만 출력하세요. JSON 외의 텍스트를 포함하지 마세요.
- 구체적인 약품명을 언급하지 마세요.
- "전문의 상담을 권장합니다" 문구를 pharmacyInsight 끝에 포함하세요.
```

### 4.2 Care Coaching Draft — System Prompt

```
당신은 약국 환자 건강 행동 코칭 도우미입니다.

역할:
- 환자에게 도움이 되는 생활 습관 조언을 작성합니다.
- 의료적 진단, 처방, 치료 권고를 절대 하지 않습니다.
- 구체적이고 실행 가능한 조언을 제공합니다.
- 격려하는 톤으로 작성합니다.

출력 형식 (반드시 아래 JSON만 출력):
{
  "draftMessage": "환자에게 전달할 코칭 메시지 (3-5문장)"
}

제약:
- 반드시 위 JSON 형식만 출력하세요.
- 구체적인 약품명을 언급하지 마세요.
- "자세한 상담은 약사와 상의하시기 바랍니다" 문구를 끝에 포함하세요.
- 실천 가능한 구체적 행동을 1~2개 제안하세요.
```

### 4.3 SiteGuide — System Prompt

```
당신은 웹사이트 방문자를 돕는 친절한 AI 안내 도우미입니다.
사용자가 현재 보고 있는 페이지의 맥락을 바탕으로 질문에 답변해 주세요.

## 현재 페이지 정보
- URL: {pageContext.url}
- 제목: {pageContext.title}
- 설명: {pageContext.description}
- 페이지 유형: {pageContext.pageType}
- 카테고리: {pageContext.category}
- 태그: {pageContext.tags}

## 응답 원칙
1. 친절하고 자연스러운 한국어로 답변합니다.
2. 페이지 내용과 관련된 답변을 우선합니다.
3. 확실하지 않은 정보는 "확인이 필요합니다"라고 말합니다.
4. 답변은 간결하게, 핵심만 전달합니다.
5. 사이트와 무관한 질문은 정중히 범위를 안내합니다.
```

### 4.4 GlucoseView Prompts (Frontend, 7 Templates)

**File**: `packages/ai-common-core/src/prompts/glucoseview/index.ts`

| Template | Purpose | Temperature |
|----------|---------|-------------|
| Dashboard Today Summary | Daily dashboard summary | 0.3 |
| Weekly Report | Weekly KPI analysis | 0.3 |
| Patient Analysis | Individual CGM data analysis | 0.3 |
| Period Comparison | Period-over-period comparison | 0.3 |
| Lifestyle Recommendations | Behavioral health tips | 0.3 |
| Consultation Talking Points | Pharmacist consultation prep | 0.3 |
| Report Generation | Patient-facing report | 0.3 |

**Common Constraint**: 의학적 조언이 아닌 데이터 분석임을 명시

---

## 5. AI Usage Locations (UI)

### 5.1 GlycoPharm Web

| Page | File | AI Data Displayed |
|------|------|-------------------|
| **AnalysisTab** | `services/web-glycopharm/.../patient-tabs/AnalysisTab.tsx` | `pharmacyInsight` (AI 분석 해석) + model + timestamp |
| **CoachingTab** | `services/web-glycopharm/.../patient-tabs/CoachingTab.tsx` | `draftMessage` + approve/discard buttons |
| **HomeLivePage** | `services/web-glycopharm/.../HomeLivePage.tsx` | Priority patient's `pharmacyInsight` |

### 5.2 GlucoseView Web

| Page | File | AI Data Displayed |
|------|------|-------------------|
| **CareDashboardPage** | `services/web-glucoseview/.../CareDashboardPage.tsx` | `llmInsight` (pharmacyInsight + patientMessage) |

### 5.3 Error Handling (Frontend)

All AI API calls use **`.catch(() => null)`** pattern:
- Missing data → section simply doesn't render
- No error toast shown to user for AI failures
- Graceful degradation — analysis page works without AI section

---

## 6. Connection State

### 6.1 Current State (Pre-deployment)

| Check | Status | Notes |
|-------|--------|-------|
| `GEMINI_API_KEY` in Cloud Run | **NOT SET** | Added to `deploy-api.yml` (pending deploy) |
| `ai_settings` DB record | Unknown | No migration seeds gemini key |
| `ai_model_settings` seed | **EXISTS** | service='care', model='gemini-2.0-flash' |
| `care_llm_insights` count | **0** | No insights generated yet |
| `care_coaching_drafts` count | **0** | No drafts generated yet |

### 6.2 Diagnostic Endpoint

`GET /api/v1/care/llm-insight/health` (no auth)

```json
{
  "success": true,
  "data": {
    "geminiKeyConfigured": false,
    "envKeySet": false,
    "dbKeyActive": false,
    "model": "gemini-2.0-flash",
    "totalInsights": 0,
    "totalDrafts": 0,
    "status": "missing_api_key"
  }
}
```

### 6.3 Required Actions

1. **GitHub Secrets**: Add `GEMINI_API_KEY` value
2. **Deploy**: Push to main → CI/CD sets env var on Cloud Run
3. **Verify**: `GET /api/v1/care/llm-insight/health` → `status: 'ready'`
4. **Trigger**: `GET /api/v1/care/analysis/{patientId}` → generates insight

---

## 7. Model Selection Architecture

### 7.1 Resolution Chain

```
Request → AI Proxy whitelist check
       → ai_model_settings (per-service config)
       → Provider default model
       → Hardcoded fallback
```

### 7.2 Model Defaults by Layer

| Layer | Component | Default Model |
|-------|-----------|---------------|
| AI Core | GeminiProvider | `gemini-2.0-flash` |
| AI Core | OpenAIProvider | `gpt-4o-mini` |
| AI Proxy | Gemini | `gemini-2.5-flash` |
| AI Proxy | OpenAI | `gpt-5-mini` |
| AI Proxy | Claude | `claude-sonnet-4.5` |
| Care Services | ai_model_settings | `gemini-2.0-flash` |
| SiteGuide | GoogleAIService | `gemini-2.0-flash` |

### 7.3 Admin Control

`ai_model_settings` allows runtime model/temperature/maxTokens changes per service without redeployment.

---

## 8. Usage Tracking

### 8.1 AI Usage Log

**Entity**: `apps/api-server/src/entities/AIUsageLog.ts`
**Table**: `ai_usage_logs`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| userId | UUID FK → User | |
| provider | ENUM (openai/gemini/claude) | |
| model | VARCHAR(100) | |
| requestId | UUID, nullable | Correlation |
| promptTokens | INT, nullable | |
| completionTokens | INT, nullable | |
| totalTokens | INT, nullable | |
| durationMs | INT, nullable | |
| status | ENUM (success/error) | |
| errorMessage | TEXT, nullable | |
| errorType | VARCHAR(100), nullable | |
| createdAt | TIMESTAMP | |

**Indexes**: (userId, createdAt), (provider, createdAt), (status, createdAt)

**Cost Estimation** (built-in method):
- OpenAI GPT-4: $0.03/1K prompt, $0.06/1K completion
- Gemini Pro: $0.0005/1K prompt, $0.0015/1K completion
- Claude Opus: $0.015/1K prompt, $0.075/1K completion

### 8.2 Signage AI Generation Log

**Entity**: `packages/digital-signage-core/src/backend/entities/SignageAiGenerationLog.entity.ts`
**Table**: `signage_ai_generation_logs`

Tracks: generationType, tokensUsed, costUsd, modelName, modelProvider, processingTimeMs, status

### 8.3 Care-Level Token Tracking

`care_llm_insights` stores `prompt_tokens` and `completion_tokens` per insight record directly.

---

## 9. Error Handling Matrix

### 9.1 Backend Error Patterns

| Service | Pattern | Retry | Throws | Logs |
|---------|---------|-------|--------|------|
| CareLlmInsightService | Fire-and-forget | No | Never | console.error |
| CareCoachingDraftService | Fire-and-forget | No | Never | console.error |
| AI Proxy | Retry with backoff | 2 retries | Yes (to caller) | AIUsageLog |
| GeminiProvider (Core) | Single retry | 1 retry (JSON only) | Yes | console |
| OpenAIProvider (Core) | Single retry | 1 retry (JSON only) | Yes | console |
| SiteGuide | No retry | No | HTTP error codes | console |

### 9.2 AI Proxy Error Types

| Error Type | Retryable | HTTP Status |
|------------|-----------|-------------|
| `VALIDATION_ERROR` | No | 400 |
| `AUTH_ERROR` | No | 401/403 |
| `PROVIDER_ERROR` | No | 500 |
| `TIMEOUT_ERROR` | Yes | 504 |
| `RATE_LIMIT_ERROR` | Yes (with Retry-After) | 429 |

### 9.3 SiteGuide Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `SERVICE_DISABLED` | 503 | Global kill switch |
| `LIMIT_EXCEEDED` | 429 | Daily quota exhausted |
| `DOMAIN_NOT_ALLOWED` | 403 | Referer not whitelisted |
| `AI_NOT_CONFIGURED` | 503 | No Gemini API key |
| `AI_ERROR` | 500 | Empty response from Gemini |
| `SERVER_ERROR` | 500 | Unexpected exception |

### 9.4 Frontend Error Handling

All AI API calls: `.catch(() => null)` → conditional render → section hidden if null

---

## 10. Call Flow Diagrams

### 10.1 Care AI Pipeline

```
[Pharmacist requests analysis]
        ↓
GET /care/analysis/:patientId
        ↓
care-analysis.controller.ts
        ↓
┌─ 1. Analyze health data (sync)
├─ 2. Record KPI snapshot (sync)
├─ 3. llmInsightService.generateAndCache()     ← fire-and-forget
├─ 4. coachingDraftService.generateAndCache()   ← fire-and-forget
└─ 5. alertService.evaluateAndCreate()          ← fire-and-forget
        ↓
Response: { analysis, snapshot } (immediate)
        ↓
[LLM calls complete in background]
        ↓
care_llm_insights: { pharmacyInsight, patientMessage }
care_coaching_drafts: { draftMessage, status='draft' }
```

### 10.2 SiteGuide AI Query

```
[Website visitor asks question]
        ↓
POST /api/siteguide/query  (X-SITEGUIDE-KEY header)
        ↓
1. Validate API key (sg_ prefix, SHA256 hash lookup)
2. Check kill switch
3. Validate domain (referer check)
4. Check daily quota
5. Build system prompt (page context)
6. GoogleAIService.executeGemini()
        ↓
Response: { success, answer, remaining }
```

### 10.3 AI Proxy Block Generation

```
[Admin/Operator requests content]
        ↓
AIProxyService.generate(request)
        ↓
1. Validate model (whitelist)
2. Validate parameters (bounds)
3. Resolve API key (DB → env)
4. Call provider (OpenAI/Gemini/Claude)
   ├─ Retry on timeout/rate-limit (max 2)
   └─ Exponential backoff with jitter
5. Parse JSON response
6. Normalize to { blocks: [...] }
7. Log to AIUsageLog
        ↓
Response: { success, result: { blocks }, usage }
```

---

## 11. Findings & Recommendations

### FINDING-1: GEMINI_API_KEY 미설정 (CRITICAL)

**Status**: 수정 완료 (deploy-api.yml), 배포 대기
**Impact**: Care AI 전체 미동작 (care_llm_insights = 0, care_coaching_drafts = 0)
**Action**: GitHub Secrets에 `GEMINI_API_KEY` 등록 → 배포

### FINDING-2: AI Core vs AI Proxy 이중 구조 (INFO)

`@o4o/ai-core` 패키지(GeminiProvider)와 `ai-proxy.service.ts`가 병존.
- Care services → AI Core GeminiProvider 사용
- Signage/Block generation → AI Proxy 사용

구조적 중복이지만 각각 다른 use case에 최적화되어 있어 현 시점에서는 허용.

### FINDING-3: Care AI — No Retry (MEDIUM)

Care LLM/Coaching 서비스는 retry 없이 단 1회 호출. Gemini 일시적 오류 시 insight 누락.
- **현재**: fire-and-forget, no retry
- **권장**: 1회 retry (2초 delay) 추가 검토

### FINDING-4: Cost Estimation 미갱신 (LOW)

`AIUsageLog.estimateCost()` 내 가격 정보가 2025년 기준. 현재 모델(GPT-5, Gemini 3.0 등)에 대한 가격 미포함.

### FINDING-5: ai_settings DB Record 부재 가능성 (MEDIUM)

`ai_settings` 테이블에 gemini provider 레코드가 없을 수 있음. 환경변수 fallback이 있어 동작에는 문제 없으나, health endpoint가 `dbKeyActive: false`를 반환할 수 있음.

### FINDING-6: Frontend Silent Failure (LOW)

모든 AI API 실패가 `.catch(() => null)`로 무시됨. 사용자에게 "AI 분석 생성 중" 또는 "AI 미지원" 상태 안내 없음. 개선 시 사용자 경험 향상 가능.

---

## 12. File Manifest

### Provider Layer
| File | Purpose |
|------|---------|
| `packages/ai-core/src/orchestration/providers/gemini.provider.ts` | Gemini provider (native fetch) |
| `packages/ai-core/src/orchestration/providers/openai.provider.ts` | OpenAI provider (native fetch) |
| `packages/ai-core/src/orchestration/orchestrator.ts` | AI Core orchestration pipeline |
| `packages/ai-core/src/orchestration/types.ts` | Type definitions |
| `apps/api-server/src/services/ai-proxy.service.ts` | 3-provider API gateway |
| `apps/api-server/src/services/google-ai.service.ts` | Legacy Gemini singleton |
| `apps/api-server/src/types/ai-proxy.types.ts` | Proxy type definitions |

### Configuration
| File | Purpose |
|------|---------|
| `apps/api-server/src/entities/AiSettings.ts` | ai_settings entity |
| `apps/api-server/src/modules/care/entities/ai-model-setting.entity.ts` | ai_model_settings entity |

### Care AI Services
| File | Purpose |
|------|---------|
| `apps/api-server/src/modules/care/services/llm/care-llm-insight.service.ts` | LLM insight generation |
| `apps/api-server/src/modules/care/services/llm/care-coaching-draft.service.ts` | Coaching draft generation |
| `apps/api-server/src/modules/care/controllers/care-llm-insight.controller.ts` | LLM insight API + health |
| `apps/api-server/src/modules/care/controllers/care-analysis.controller.ts` | Analysis trigger + AI chain |
| `apps/api-server/src/modules/care/controllers/care-coaching.controller.ts` | Coaching session + draft API |

### Entities
| File | Table |
|------|-------|
| `apps/api-server/src/modules/care/entities/care-llm-insight.entity.ts` | care_llm_insights |
| `apps/api-server/src/modules/care/entities/care-coaching-draft.entity.ts` | care_coaching_drafts |
| `apps/api-server/src/entities/AIUsageLog.ts` | ai_usage_logs |
| `packages/digital-signage-core/.../SignageAiGenerationLog.entity.ts` | signage_ai_generation_logs |

### Frontend
| File | Purpose |
|------|---------|
| `services/web-glycopharm/.../patient-tabs/AnalysisTab.tsx` | pharmacyInsight display |
| `services/web-glycopharm/.../patient-tabs/CoachingTab.tsx` | draftMessage + approve/discard |
| `services/web-glycopharm/.../HomeLivePage.tsx` | Priority patient AI insight |
| `services/web-glucoseview/.../CareDashboardPage.tsx` | Patient care dashboard |
| `packages/ai-common-core/src/prompts/glucoseview/index.ts` | 7 GlucoseView prompt templates |

### Prompts
| File | Prompt |
|------|--------|
| `care-llm-insight.service.ts` (inline) | 약국 환자 케어 데이터 설명 도우미 |
| `care-coaching-draft.service.ts` (inline) | 건강 행동 코칭 도우미 |
| `siteguide.routes.ts` (inline) | 웹사이트 AI 안내 도우미 |
| `ai-common-core/prompts/glucoseview/` | CGM 데이터 분석 (7 templates) |

### Supporting Services
| File | Purpose |
|------|---------|
| `apps/api-server/src/services/ai-admin.service.ts` | Admin control |
| `apps/api-server/src/services/ai-query.service.ts` | B2C query + quota |
| `apps/api-server/src/services/ai-metrics.service.ts` | Token/cost metrics |
| `apps/api-server/src/services/ai-block-writer.service.ts` | Block file writer |
| `apps/api-server/src/services/ai-dlq.service.ts` | Dead letter queue |
| `apps/api-server/src/services/ai-job-queue.service.ts` | BullMQ job queue |
| `apps/api-server/src/workers/ai-job.worker.ts` | AI job worker (concurrency=10) |
| `apps/api-server/src/services/forum/ForumAIService.ts` | Forum summarization (rule-based) |
| `packages/cosmetics-partner-extension/.../ai-description.service.ts` | Product description (template) |
| `packages/cosmetics-partner-extension/.../ai-routine.service.ts` | Skincare routine (template) |

---

*Investigation complete. 2026-03-09*
