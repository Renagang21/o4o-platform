# IR-O4O-AI-LLM-CORE-ARCHITECTURE-AUDIT-V1

> **조사일**: 2026-03-22
> **상태**: 완료
> **목적**: O4O 전체 AI 서비스 LLM 사용 구조 전수 조사
> **수정**: ❌ 없음 (읽기 전용 조사)

---

## 1. 조사 요약 (Executive Summary)

| 항목 | 수치 |
|------|------|
| AI/LLM 관련 백엔드 파일 | **15개 핵심 + 20개 보조** |
| LLM 직접 호출 서비스 | **7개** (Care 4 + Store 3) |
| AI Proxy 서비스 | **1개** (3개 프로바이더 지원) |
| AI Core 패키지 | **1개** (orchestrator + 2 providers) |
| 프론트엔드 AI 호출 경로 | **4개 서비스** (모두 Backend 경유 ✓) |
| LLM 프로바이더 | **Gemini** (주력), OpenAI, Claude |
| DB 설정 테이블 | **4개** (ai_settings, ai_model_settings, ai_engines, ai_query_policy) |

---

## 2. 현재 아키텍처 다이어그램

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                                │
│                                                                      │
│  web-glycopharm        web-glucoseview       web-neture              │
│  ├ CareAiChatPanel     ├ AIChatWidget        ├ supplierCopilotApi   │
│  ├ pharmacyApi         ├ api.aiQuery()       └ sellerDashboard      │
│  └ POST /care/ai-chat  └ POST /api/ai/query                        │
│                                                                      │
│  web-k-cosmetics                                                    │
│  └ AiReportPage (Mock only)                                         │
├──────────────────────────────────────────────────────────────────────┤
│                     ⬇ HTTP (authClient.api) ⬇                       │
├──────────────────────────────────────────────────────────────────────┤
│                        Backend API Layer                             │
│                                                                      │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────┐   │
│  │   AI Proxy       │  │   Care AI        │  │   Store AI        │   │
│  │   (클라이언트용)  │  │   (도메인 전용)   │  │   (도메인 전용)    │   │
│  │                  │  │                  │  │                   │   │
│  │ • generateContent│  │ • CareAiChat     │  │ • StoreAiInsight  │   │
│  │ • callOpenAI()  │  │ • CoachingDraft  │  │ • ProductInsight  │   │
│  │ • callGemini()  │  │ • LlmInsight     │  │ • ProductTagging  │   │
│  │ • callClaude()  │  │ • PatientInsight │  │                   │   │
│  └────────┬────────┘  └────────┬─────────┘  └────────┬──────────┘   │
│           │                    │                      │              │
│      Raw fetch()         GeminiProvider          GeminiProvider      │
│           │               (ai-core)              (ai-core)          │
├───────────┴────────────────────┴──────────────────────┴──────────────┤
│                        Provider Layer                                │
│                                                                      │
│  ┌─────────────┐  ┌──────────────────────┐  ┌────────────────┐      │
│  │ ai-proxy     │  │ @o4o/ai-core         │  │ gemini.helper  │      │
│  │ (Raw fetch)  │  │ orchestrator.ts      │  │ (유틸리티)      │      │
│  │              │  │ ├ gemini.provider.ts │  │                │      │
│  │ 3 providers  │  │ └ openai.provider.ts │  │ 1 provider     │      │
│  └──────┬───────┘  └──────────┬───────────┘  └───────┬────────┘      │
│         │                     │                      │               │
├─────────┴─────────────────────┴──────────────────────┴───────────────┤
│                     External LLM APIs                                │
│                                                                      │
│  Google Gemini API          OpenAI API          Anthropic Claude API  │
│  generativelanguage.        api.openai.com      api.anthropic.com    │
│  googleapis.com             /v1/chat/           /v1/messages          │
└──────────────────────────────────────────────────────────────────────┘
```

**핵심 문제: 3개의 독립적 LLM 호출 경로가 병존**

---

## 3. 조사 결과

### 3.1 LLM 호출 구조 조사

#### Care AI 서비스 (4개)

```
Service: care-ai-chat.service.ts
- 파일: apps/api-server/src/modules/care/services/llm/care-ai-chat.service.ts
- 호출 위치: line 127 → this.gemini.complete()
- 호출 방식: GeminiProvider wrapper (@o4o/ai-core)
- 공통 proxy 사용: ❌ 독립 호출
- 컨텍스트: Population(전체 환자) / Patient(개별 환자) 2모드
- 캐시: 인메모리 Map (SHA256 key, 5분/10분 TTL)
```

```
Service: care-coaching-draft.service.ts
- 파일: apps/api-server/src/modules/care/services/llm/care-coaching-draft.service.ts
- 호출 위치: line 73 → this.gemini.complete()
- 호출 방식: GeminiProvider wrapper
- 공통 proxy 사용: ❌
- 특성: Fire-and-Forget, snapshotId 중복 방어
```

```
Service: care-llm-insight.service.ts
- 파일: apps/api-server/src/modules/care/services/llm/care-llm-insight.service.ts
- 호출 위치: line 76 → this.gemini.complete()
- 호출 방식: GeminiProvider wrapper
- 공통 proxy 사용: ❌
- 특성: Fire-and-Forget, snapshotId 중복 방어
```

```
Service: patient-ai-insight.service.ts
- 파일: apps/api-server/src/modules/care/services/llm/patient-ai-insight.service.ts
- 호출 위치: line 241 → this.gemini.complete()
- 호출 방식: GeminiProvider wrapper
- 공통 proxy 사용: ❌
- 특성: 24시간 캐시, 최소 3건 측정값 필요
```

#### Store AI 서비스 (3개)

```
Service: store-ai-insight.service.ts
- 파일: apps/api-server/src/modules/store-ai/services/store-ai-insight.service.ts
- 호출 위치: line 71 → this.gemini.complete()
- 호출 방식: GeminiProvider wrapper
- 공통 proxy 사용: ❌
- 특성: Fire-and-Forget, snapshotId 중복 방어
```

```
Service: store-ai-product-insight.service.ts
- 파일: apps/api-server/src/modules/store-ai/services/store-ai-product-insight.service.ts
- 호출 위치: line 78 → this.gemini.complete()
- 호출 방식: GeminiProvider wrapper
- 공통 proxy 사용: ❌
- 특성: organizationId + snapshotDate 중복 방어
```

```
Service: product-ai-tagging.service.ts
- 파일: apps/api-server/src/modules/store-ai/services/product-ai-tagging.service.ts
- 호출 위치: line 69 → this.gemini.complete()
- 호출 방식: GeminiProvider wrapper
- 공통 proxy 사용: ❌
- 특성: 신뢰도 >= 0.7 필터링
```

#### AI Proxy (1개 — 3 프로바이더)

```
Service: ai-proxy.service.ts
- 파일: apps/api-server/src/services/ai-proxy.service.ts (822줄)
- 호출 위치:
  - line 366: callOpenAI() → fetch() to api.openai.com
  - line 487: callGemini() → fetch() to googleapis.com
  - line 657: callClaude() → fetch() to api.anthropic.com
- 호출 방식: Raw HTTP fetch (SDK 미사용)
- 공통 proxy 사용: 자체가 proxy
- 특성: 모델 화이트리스트 검증, usage logging, retry with backoff
```

#### AI Core 패키지 (오케스트레이터)

```
Package: @o4o/ai-core
- orchestrator.ts: line 112 → Provider registry dispatch
- gemini.provider.ts: line 96 → fetch() to googleapis.com
- openai.provider.ts: line 91 → fetch() to api.openai.com
- 특성: Context Builder → Prompt Composer → Provider → Normalizer → Action Mapper
```

#### Gemini Helper (유틸리티)

```
Service: gemini.helper.ts
- 파일: apps/api-server/src/utils/gemini.helper.ts (148줄)
- 호출 위치: line 88 → fetch() to googleapis.com
- 호출 방식: Raw HTTP fetch
- 용도: 자유 텍스트 응답 (JSON 모드 미강제)
- 공통 proxy 사용: ❌ 독립
```

---

### 3.2 모델 설정 방식 조사

#### 모델 해결 우선순위 (Care/Store 공통)

```
1순위: DB 조회 → ai_model_settings WHERE service = '{care|store}'
2순위: 하드코딩 기본값 → 'gemini-3.0-flash'
```

#### 서비스별 모델 설정 현황

```
File: care-ai-chat.service.ts
- model: setting?.model || 'gemini-3.0-flash'
- DB 조회: ✅ ai_model_settings WHERE service='care' (line 417)
- 하드코딩 기본값: 'gemini-3.0-flash' (line 417)
- env 사용: ❌

File: care-coaching-draft.service.ts
- model: setting?.model || 'gemini-3.0-flash'
- DB 조회: ✅ (line 211)
- 하드코딩 기본값: 'gemini-3.0-flash' (line 218)

File: care-llm-insight.service.ts
- model: setting?.model || 'gemini-3.0-flash'
- DB 조회: ✅ (line 218)
- 하드코딩 기본값: 'gemini-3.0-flash' (line 218)

File: patient-ai-insight.service.ts
- model: setting?.model || 'gemini-3.0-flash'
- DB 조회: ✅ (line 280)
- 하드코딩 기본값: 'gemini-3.0-flash' (line 280)

File: store-ai-insight.service.ts
- model: setting?.model || 'gemini-3.0-flash'
- DB 조회: ✅ (line 178)
- 하드코딩 기본값: 'gemini-3.0-flash'

File: store-ai-product-insight.service.ts
- model: setting?.model || 'gemini-3.0-flash'
- DB 조회: ✅ (line 178)
- 하드코딩 기본값: 'gemini-3.0-flash'

File: product-ai-tagging.service.ts
- model: setting?.model || 'gemini-3.0-flash'
- DB 조회: ✅ (line 202)
- 하드코딩 기본값: 'gemini-3.0-flash'

File: ai-proxy.service.ts
- model: request.model (클라이언트 지정)
- 기본값: gpt-5-mini / gemini-3.0-flash / claude-sonnet-4.5 (line 194-196)
- 화이트리스트 검증: ✅

File: gemini.helper.ts
- model: 파라미터 || 'gemini-3.0-flash' (line 24)
- DB 조회: ❌
- env 사용: ❌

File: ai-core/gemini.provider.ts
- model: config.model || 'gemini-3.0-flash' (line 52)
- DB 조회: ❌ (호출자가 전달)

File: ai-core/openai.provider.ts
- model: config.model || 'gpt-4o-mini' (line 52)
- DB 조회: ❌ (호출자가 전달)
```

#### 모델 화이트리스트 (ai-proxy.types.ts)

```
openai: ['gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4.1', 'gpt-4o']
gemini: ['gemini-3.0-flash', 'gemini-3.0-pro', 'gemini-2.0-flash',
         'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro']
claude: ['claude-sonnet-4.5', 'claude-opus-4', 'claude-sonnet-4']
```

---

### 3.3 API Key 관리 방식 조사

#### Key 해결 전략 (3단계 — 모든 서비스 공통)

```typescript
// 1단계: DB 조회
SELECT apikey FROM ai_settings WHERE provider = 'gemini' AND isactive = true LIMIT 1

// 2단계: 환경변수 fallback
process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY

// 3단계: 오류
throw new Error('API key not configured')
```

#### 서비스별 Key 소스

```
Service: Care AI (4개 서비스 모두 동일)
- key source: ai_settings DB → process.env.GEMINI_API_KEY fallback
- 서비스별 분리: ❌ (공유)
- DB 암호화: ❌ (plaintext)

Service: Store AI (3개 서비스 모두 동일)
- key source: ai_settings DB → process.env.GEMINI_API_KEY fallback
- 서비스별 분리: ❌ (공유)
- DB 암호화: ❌ (plaintext)

Service: ai-proxy.service
- key source: ai_settings DB → process.env.{OPENAI|GEMINI|CLAUDE}_API_KEY fallback
- 3개 프로바이더별 독립 키: ✅
- DB 암호화: ❌ (plaintext)

Service: gemini.helper.ts
- key source: process.env.GEMINI_API_KEY 만 (DB 미사용)
- DB 조회: ❌

Package: @o4o/ai-core orchestrator
- key source: process.env.GEMINI_API_KEY / process.env.OPENAI_API_KEY
- DB 조회: ❌
```

---

### 3.4 Retry / Error Handling 구조

#### 서비스별 Retry 정책

| 서비스 | Retry 횟수 | Delay | Backoff | Fallback |
|--------|-----------|-------|---------|----------|
| care-ai-chat | 2회 | 2초 | ❌ 고정 | ❌ |
| care-coaching-draft | 2회 | 2초 | ❌ 고정 | ❌ |
| care-llm-insight | 2회 | 2초 | ❌ 고정 | ❌ |
| patient-ai-insight | 2회 | 2초 | ❌ 고정 | ❌ |
| store-ai-insight | 2회 | 2초 | ❌ 고정 | ❌ |
| store-ai-product-insight | 2회 | 2초 | ❌ 고정 | ❌ |
| product-ai-tagging | 2회 | 2초 | ❌ 고정 | ❌ |
| **ai-proxy** | **2회** | **1초** | **✅ 지수 (×2, max 20s)** | ❌ |
| ai-core gemini | 1회 | - | ❌ | ❌ |
| ai-core openai | 1회 | - | ❌ | ❌ |
| gemini.helper | 1회 | - | ❌ | ❌ |

#### AI Proxy 에러 분류 체계 (유일하게 구조화됨)

```
VALIDATION_ERROR  → 400 (모델 미허용, 파라미터 오류)
AUTH_ERROR        → 401 (API 키 인증 실패)
RATE_LIMIT_ERROR  → 429 (Retry-After 존중)
PROVIDER_ERROR    → 502 (LLM 서버 오류)
TIMEOUT_ERROR     → 504 (AbortController 타임아웃)
```

#### Care AI 에러 핸들링 (care-ai-chat.controller.ts)

```
AI_NOT_CONFIGURED               → 503
'Gemini API error' / 'AI_CHAT_FAILED' → 502
'timeout'                        → 504
else                             → 500
```

#### 타임아웃 불일치 ⚠️

| 계층 | 타임아웃 |
|------|---------|
| ai-proxy.service | **120초** |
| ai-core providers | **10초** |
| gemini.helper | **10초** |
| ai-proxy vision route | **10초** |

---

### 3.5 Usage / Logging 조사

```
Service: ai-proxy.service ✅ (유일하게 완전한 로깅)
- token 기록: ✅ (promptTokens, completionTokens, totalTokens)
- latency 기록: ✅ (durationMs)
- 비용 추적: ❌
- 저장 위치: ai_usage_logs 테이블
- requestId 추적: ✅

Service: care-ai-chat.service
- token 기록: ❌
- latency 기록: ❌
- 로그 위치: console.error / console.warn only

Service: care-coaching-draft.service
- token 기록: ❌
- latency 기록: ❌
- 로그 위치: console.error only

Service: care-llm-insight.service
- token 기록: ✅ (care_llm_insights 테이블에 prompt_tokens, completion_tokens 저장)
- latency 기록: ❌
- 비용 추적: ❌

Service: patient-ai-insight.service
- token 기록: ❌
- latency 기록: ❌
- 로그 위치: console.error only

Service: store-ai-insight.service
- token 기록: ❌
- latency 기록: ❌
- 로그 위치: console.error only

Service: store-ai-product-insight.service
- token 기록: ❌
- latency 기록: ❌
- 로그 위치: console.error only

Service: product-ai-tagging.service
- token 기록: ❌
- latency 기록: ❌
- 로그 위치: console.error only

Package: @o4o/ai-core orchestrator
- token 기록: ✅ (감사 로그 — promptHash, responseHash, 토큰)
- latency 기록: ❌
- 저장 위치: 콜백 기반 (호출자 책임)
```

---

### 3.6 서비스별 중복 구조 분석

#### 중복 패턴 1: GeminiProvider 초기화 (7개 서비스)

```
모든 Care/Store 서비스에서 동일한 패턴 반복:

constructor() {
  this.gemini = new GeminiProvider();
}

→ 7개 서비스 × 동일 초기화 코드
```

#### 중복 패턴 2: API Key 해결 로직 (7개 서비스)

```
모든 서비스에서 동일한 3단계 키 해결 로직 복사:

1. DB에서 ai_settings 조회
2. process.env.GEMINI_API_KEY fallback
3. throw Error

→ 약 15줄 × 7개 서비스 = ~105줄 중복
```

#### 중복 패턴 3: 모델 설정 해결 로직 (7개 서비스)

```
모든 서비스에서 동일한 패턴:

const setting = await dataSource.query(
  'SELECT * FROM ai_model_settings WHERE service = $1', ['{service}']
);
const model = setting?.[0]?.model || 'gemini-3.0-flash';

→ 약 10줄 × 7개 서비스 = ~70줄 중복
```

#### 중복 패턴 4: Retry 래퍼 (7개 서비스)

```
모든 서비스에서 동일한 retry 구현:

for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
  try { return await fn(); }
  catch (e) {
    if (attempt < MAX_RETRIES) { await delay(RETRY_DELAY); continue; }
    throw e;
  }
}

→ 약 12줄 × 7개 서비스 = ~84줄 중복
```

#### 중복 패턴 5: Fire-and-Forget 패턴 (5개 서비스)

```
coaching-draft, llm-insight, store-insight, store-product-insight, product-tagging:

try {
  const result = await this.generateAndCache(...);
} catch (error) {
  console.error('[Service] AI generation failed', error);
  // 무시 - fire and forget
}

→ 동일 패턴 5회 반복
```

#### 총 중복 코드 추정

```
중복 문제 요약:
- GeminiProvider 초기화: ~7개 서비스
- API Key 해결: ~105줄
- 모델 설정 해결: ~70줄
- Retry 래퍼: ~84줄
- Fire-and-Forget: ~5개 서비스
- 중복 방어 (snapshotId check): ~4개 서비스

총 추정: ~300줄+ 중복 코드
```

---

### 3.7 AI Proxy 존재 여부 및 역할

```
ai-proxy.service.ts (822줄)

역할:
  - 클라이언트(프론트엔드)의 LLM API 키 보호를 위한 서버사이드 프록시
  - 3개 프로바이더 (Gemini, OpenAI, Claude) 통합 게이트웨이
  - 모델 화이트리스트 검증
  - Usage logging (ai_usage_logs)
  - Retry with exponential backoff
  - 파라미터 제한 (maxTokens, temperature, topP, topK)

사용 서비스:
  - ✅ web-glucoseview (POST /api/ai/query → ai-proxy)
  - ✅ Signage TemplateBuilder (POST /api/ai/generate)
  - ❌ Care AI 서비스 → ai-proxy 미사용 (독립 GeminiProvider)
  - ❌ Store AI 서비스 → ai-proxy 미사용 (독립 GeminiProvider)

중앙 통제 여부:
  - ❌ 부분적 — 프록시 역할만 수행
  - Care/Store 도메인 서비스는 완전히 독립 경로
  - ai-core 패키지도 별도 독립 경로
  - 실질적 "Core" 역할 아님 → 클라이언트 프록시에 가까움
```

---

### 3.8 DB / 설정 구조 조사

#### AI 관련 테이블 목록

```
1. ai_settings
   - 용도: 프로바이더별 API Key + 기본 모델 저장
   - 컬럼: id, provider(UNIQUE), apiKey, defaultModel, settings(JSON), isActive
   - Seed: gemini, openai, claude (3 rows)
   - Runtime 변경: ✅ (Admin API 경유)

2. ai_model_settings
   - 용도: 서비스별 LLM 모델/파라미터 설정
   - 컬럼: id, service(UNIQUE), model, temperature, max_tokens, updated_at
   - Seed: service='care' → gemini-3.0-flash
   - Runtime 변경: ✅ (Admin API 경유)

3. ai_engines
   - 용도: 사용 가능한 AI 엔진 목록
   - 컬럼: id, slug(UNIQUE), name, description, provider, is_active, is_available, sort_order
   - Seed: gemini-2.0-flash(inactive), gemini-3.0-flash(active)
   - Runtime 변경: ✅ (Admin API 경유)

4. ai_query_policy
   - 용도: AI 쿼리 정책 (일일 제한, 기본 모델)
   - 컬럼: id, free_daily_limit, paid_daily_limit, ai_enabled, default_model, system_prompt
   - Seed: free_daily_limit=10, paid_daily_limit=100, default_model='gemini-3.0-flash'
   - Runtime 변경: ✅

5. ai_usage_logs
   - 용도: AI Proxy 사용량 추적
   - 컬럼: id, userId, provider, model, requestId, promptTokens, completionTokens, totalTokens, durationMs, status, errorMessage, errorType
   - 기록: ai-proxy.service만 (Care/Store ❌)

6. care_llm_insights
   - 용도: Care LLM 인사이트 결과 저장
   - 컬럼: id(UUID), snapshot_id, pharmacy_id, patient_id, pharmacy_insight, patient_message, model, prompt_tokens, completion_tokens
```

#### Admin API (ai-admin.service.ts)

```
- GET  /api/ai/admin/dashboard    → 대시보드 (사용 통계)
- GET  /api/ai/admin/engines      → 엔진 목록
- PUT  /api/ai/admin/engines/:id  → 엔진 활성화/비활성화
- GET  /api/ai/admin/settings     → 설정 조회
- PUT  /api/ai/admin/settings     → 설정 변경
```

---

## 4. 산출물

### 4.1 구조 다이어그램

#### 현재 구조 (분산)

```
┌──────────────────────────────────────────────────────┐
│              3개의 독립 LLM 호출 경로                  │
│                                                      │
│  경로 A: Care/Store → GeminiProvider → Gemini API    │
│  경로 B: Frontend  → AI Proxy → Gemini/OpenAI/Claude │
│  경로 C: 기타      → gemini.helper → Gemini API      │
│                                                      │
│  ⚠ 공통 제어 지점 없음                                │
│  ⚠ 모델/키/retry/logging 각각 독립 구현               │
└──────────────────────────────────────────────────────┘
```

#### 목표 구조 (초안)

```
┌──────────────────────────────────────────────────────┐
│  Service Layer (Care, Store, Proxy, Query)            │
│         │                                            │
│         ▼                                            │
│  ┌──────────────────────────────────────┐            │
│  │         AI Core Service              │            │
│  │  ┌──────────────────────────────┐    │            │
│  │  │ • Model Resolution (DB)     │    │            │
│  │  │ • API Key Resolution (DB)   │    │            │
│  │  │ • Retry Policy (통일)        │    │            │
│  │  │ • Usage Logging (통합)       │    │            │
│  │  │ • Error Classification      │    │            │
│  │  │ • Circuit Breaker           │    │            │
│  │  └──────────────────────────────┘    │            │
│  │         │                            │            │
│  │  ┌──────┴──────────┐                │            │
│  │  │ Provider Registry│                │            │
│  │  │ ├ Gemini         │                │            │
│  │  │ ├ OpenAI         │                │            │
│  │  │ └ Claude         │                │            │
│  │  └─────────────────┘                │            │
│  └──────────────────────────────────────┘            │
│         │                                            │
│         ▼                                            │
│  External LLM APIs                                   │
└──────────────────────────────────────────────────────┘
```

---

### 4.2 문제 요약 (핵심 7개)

| # | 문제 | 심각도 | 영향 범위 |
|---|------|--------|----------|
| 1 | **3개 독립 LLM 호출 경로** — ai-proxy, GeminiProvider, gemini.helper가 각각 독립적으로 LLM 호출 | 🔴 High | 전체 |
| 2 | **API Key 해결 로직 7중 복사** — 동일한 DB→env fallback 코드가 7개 서비스에 복사됨 | 🟠 Medium | Care + Store |
| 3 | **모델 설정 분산** — ai_model_settings DB 사용하지만 fallback 하드코딩이 7곳에 산재 | 🟠 Medium | 전체 |
| 4 | **Usage 추적 불완전** — ai-proxy만 ai_usage_logs 기록, Care/Store 7개 서비스는 ❌ | 🔴 High | Care + Store |
| 5 | **타임아웃 불일치** — ai-proxy 120초 vs ai-core 10초 vs helper 10초 | 🟡 Low | 전체 |
| 6 | **Fallback/Circuit Breaker 부재** — 모든 서비스에 provider fallback 없음, 장애 시 전면 영향 | 🔴 High | 전체 |
| 7 | **Temperature 정책 불일치** — Care/Store 0.3 vs ai-proxy 0.7 (기본값) | 🟡 Low | ai-proxy |

---

### 4.3 개선 필요 영역 매핑

```
Priority 1 (장애 방지 — 즉시):
├─ Usage Logging 통합: Care/Store → ai_usage_logs 기록 추가
├─ Fallback 설계: Gemini 장애 시 OpenAI/Claude 전환
└─ Circuit Breaker: 연속 실패 시 자동 차단

Priority 2 (중복 제거 — 단기):
├─ API Key Resolution → 공통 함수 추출 (1곳)
├─ Model Resolution → 공통 함수 추출 (1곳)
├─ Retry Wrapper → 공통 유틸리티 (1곳)
└─ GeminiProvider 초기화 → DI 또는 싱글톤

Priority 3 (구조 통합 — 중기):
├─ ai-proxy.service → AI Core Service로 확장
├─ gemini.helper → ai-core에 통합
├─ 3개 호출 경로 → 1개 Core 경유로 통합
└─ 모델 정책 → Admin UI에서 runtime 제어

Priority 4 (관측성 — 장기):
├─ 분산 로깅 (console → structured logging)
├─ 비용 추적 (토큰 × 단가)
├─ 대시보드 (서비스별 사용량, 에러율, 지연)
└─ 알림 (에러율 임계치 초과 시)
```

---

### 4.4 수정 대상 파일 리스트

#### Backend 핵심 (직접 LLM 호출 — 반드시 수정)

| # | 파일 | 줄수 | 역할 | 수정 사유 |
|---|------|------|------|----------|
| 1 | `apps/api-server/src/services/ai-proxy.service.ts` | 822 | 클라이언트 프록시 | Core로 확장 |
| 2 | `apps/api-server/src/services/ai-admin.service.ts` | 413 | Admin API | Core 연동 |
| 3 | `apps/api-server/src/modules/care/services/llm/care-ai-chat.service.ts` | 440 | Care 채팅 | Core 경유로 전환 |
| 4 | `apps/api-server/src/modules/care/services/llm/care-coaching-draft.service.ts` | ~220 | 코칭 초안 | Core 경유로 전환 |
| 5 | `apps/api-server/src/modules/care/services/llm/care-llm-insight.service.ts` | ~240 | LLM 인사이트 | Core 경유로 전환 |
| 6 | `apps/api-server/src/modules/care/services/llm/patient-ai-insight.service.ts` | ~300 | 환자 인사이트 | Core 경유로 전환 |
| 7 | `apps/api-server/src/modules/store-ai/services/store-ai-insight.service.ts` | ~200 | 매장 인사이트 | Core 경유로 전환 |
| 8 | `apps/api-server/src/modules/store-ai/services/store-ai-product-insight.service.ts` | ~200 | 상품 인사이트 | Core 경유로 전환 |
| 9 | `apps/api-server/src/modules/store-ai/services/product-ai-tagging.service.ts` | ~220 | 상품 태깅 | Core 경유로 전환 |
| 10 | `apps/api-server/src/utils/gemini.helper.ts` | 148 | 유틸리티 | Core에 통합 |

#### Backend 보조 (라우트/컨트롤러/타입)

| # | 파일 | 역할 |
|---|------|------|
| 11 | `apps/api-server/src/routes/ai-proxy.routes.ts` | Proxy 라우트 |
| 12 | `apps/api-server/src/routes/ai-admin.routes.ts` | Admin 라우트 |
| 13 | `apps/api-server/src/modules/care/controllers/care-ai-chat.controller.ts` | Care 컨트롤러 |
| 14 | `apps/api-server/src/modules/care/controllers/care-llm-insight.controller.ts` | Insight 컨트롤러 |
| 15 | `apps/api-server/src/modules/store-ai/controllers/store-ai.controller.ts` | Store 컨트롤러 |
| 16 | `apps/api-server/src/modules/care/care-pharmacy-context.middleware.ts` | 미들웨어 |

#### AI Core 패키지

| # | 파일 | 역할 |
|---|------|------|
| 17 | `packages/ai-core/src/orchestration/orchestrator.ts` | 오케스트레이터 |
| 18 | `packages/ai-core/src/orchestration/providers/gemini.provider.ts` | Gemini 프로바이더 |
| 19 | `packages/ai-core/src/orchestration/providers/openai.provider.ts` | OpenAI 프로바이더 |

#### Entity / Migration

| # | 파일 | 역할 |
|---|------|------|
| 20 | `apps/api-server/src/modules/care/entities/ai-model-setting.entity.ts` | 모델 설정 엔티티 |
| 21 | 마이그레이션 파일들 (CreateAISettings, CreateAIQueryTables, CreateAiEngines, CreateCareLlmInsights) | DB 스키마 |

#### Frontend (호출 경로 확인용 — 수정 최소)

| # | 파일 | 서비스 | AI 엔드포인트 |
|---|------|--------|-------------|
| 22 | `services/web-glycopharm/src/api/pharmacy.ts` | glycopharm | POST /care/ai-chat |
| 23 | `services/web-glycopharm/src/pages/care/CareAiChatPanel.tsx` | glycopharm | AI Chat UI |
| 24 | `services/web-glucoseview/src/services/api.ts` | glucoseview | POST /api/ai/query |
| 25 | `services/web-glucoseview/src/components/ai/AIChatWidget.tsx` | glucoseview | AI Chat UI |
| 26 | `services/web-neture/src/lib/api/supplier.ts` | neture | GET /copilot/* |

---

## 5. 프론트엔드 AI 호출 경로 요약

### 보안 상태: ✅ 양호 (프론트에서 LLM 직접 호출 없음)

| 프론트엔드 서비스 | AI 기능 | 백엔드 엔드포인트 | 비고 |
|-----------------|--------|-----------------|------|
| **web-glycopharm** | 환자 AI 챗봇, 코칭 초안, LLM 인사이트 | `POST /care/ai-chat`, `GET /care/llm-insight/*`, `GET /care/coaching-drafts/*` | 가장 활발한 AI 사용 |
| **web-glucoseview** | 환자 AI 위젯, AI 인사이트 | `POST /api/ai/query`, `GET /care/patient/ai-insight` | 데모 모드 지원 |
| **web-neture** | 공급자 코파일럿 (KPI, 상품 성과, 유통) | `GET /neture/supplier/copilot/*`, `GET /*/dashboard/ai-insight` | 5개 코파일럿 API |
| **web-k-cosmetics** | AI 리포트 (Mock) | 없음 | 실제 AI 호출 ❌ |

### 공유 AI 컴포넌트

```
@o4o/ai-components → AiPreviewModal, AiSummaryModal, AiSummaryButton
→ 4개 프론트엔드 서비스 모두 import
```

---

## 6. 완료 기준 점검

| 기준 | 상태 | 근거 |
|------|------|------|
| LLM 호출 위치 100% 식별 | ✅ | 7개 도메인 서비스 + 1 Proxy + 1 Helper + 2 Core Provider |
| 모델/키 설정 방식 전체 파악 | ✅ | DB 3단계 해결, 하드코딩 fallback, 화이트리스트 |
| 중복 구조 목록화 | ✅ | 5개 중복 패턴, ~300줄 추정 |
| Core 전환 대상 명확화 | ✅ | 7개 서비스 → Core 경유 필요 |
| 수정 파일 리스트 확정 | ✅ | 21개 백엔드 + 5개 프론트엔드 |

---

## 7. 다음 단계 (IR 이후)

| 순서 | 작업 | 산출물 |
|------|------|--------|
| 1 | AI Core Service 설계 | `WO-O4O-AI-CORE-SERVICE-V1.md` |
| 2 | LLM Policy 설계 (모델/키/retry/fallback 정책) | `AI-LLM-POLICY-V1.md` |
| 3 | Usage Logging 통합 | 마이그레이션 + 서비스 수정 |
| 4 | 중복 코드 공통화 | 공통 유틸리티 추출 |
| 5 | Admin UI 설계 | 모델/엔진/정책 관리 화면 |

---

*Generated: 2026-03-22*
*Status: Complete*
*Author: Claude Code (IR Audit Agent)*
