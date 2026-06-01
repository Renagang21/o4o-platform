# IR-O4O-AI-SYSTEM-AUDIT-PHASE2

> **AI 정비 결과 검증 + 다음 WO 준비 조사**
> 실행일: 2026-03-14
> 선행: WO-O4O-AI-CODE-CLEANUP-PHASE1 (commit `28c97a201`)
> 원칙: 코드 수정 금지 / 구조 변경 금지 / 파일 이동 금지 — 조사만 수행

---

## 1. Cleanup 결과 검증

### 삭제 파일 존재 여부

| 경로 | 상태 |
|------|------|
| `apps/api-server/src/services/ai-block-writer.service.ts` | **삭제 완료** |
| `packages/ai-common-core/` | **삭제 완료** |
| `services/web-neture/src/components/ai-insight/` | **삭제 완료** |

### 잔존 참조 검색

| 검색어 | 소스 코드 (.ts/.tsx) | 설정 파일 (.json/.yaml) | 문서 (.md) |
|--------|:-------------------:|:---------------------:|:-----------:|
| `ai-block-writer` | 0건 | 0건 | audit 문서만 |
| `@o4o/ai-common-core` | 0건 | 0건 | audit 문서 + **ai-core README** |
| `AIInsightCard` / `DetailPanel` / `Badge` | 0건 | 0건 | audit 문서만 |

### 발견된 잔존 이슈

`packages/ai-core/README.md` (line 72, 81)에 삭제된 `@o4o/ai-common-core` 패키지 참조 잔존.
- 코드 영향: 없음 (문서만)
- 조치 필요: README 업데이트 (다음 WO에서 처리)

### 검증 결과: **PASS** (코드 레벨 완전 정리, 문서 잔존 1건)

---

## 2. 현재 AI 코드 실제 규모

### 분류별 규모

| 분류 | Packages | API Server | Frontend | 합계 |
|------|:--------:|:----------:|:--------:|:----:|
| **AI Core** | 1,665 | — | — | **1,665** |
| **AI Infra** | — | 6,108 | — | **6,108** |
| **AI Extension** | 3,585 | 3,458 | — | **7,043** |
| **AI App** | 846 | — | 5,145 | **5,991** |
| **합계** | **6,096** | **9,566** | **5,145** | **~20,800** |

> Admin Dashboard AI 코드 (~3,000-4,000줄) 별도. 총 추정: **~24,000줄**

### Package별 상세

| Package | Files | Lines |
|---------|:-----:|:-----:|
| packages/ai-core | 22 | 1,665 |
| packages/o4o-ai-components | 7 | 846 |
| packages/partner-ai-builder | 19 | 1,956 |
| packages/pharmacy-ai-insight | 20 | 1,629 |
| ~~packages/ai-common-core~~ | — | ~~삭제됨~~ |

### API Server AI 모듈 상세

| 영역 | Lines | 주요 파일 |
|------|:-----:|-----------|
| Core Infra Services | 3,612 | ai-proxy (652), ai-operations (592), ai-query (466) |
| Controllers & Routes | 1,067 | AiQueryController (229), ai-admin.routes (313) |
| Store-AI Module | 2,215 | 5 controllers + 9 services + 7 entities |
| Care Module AI | 1,243 | 4 LLM services + 2 controllers |
| Copilot Services | 612 | supplier-copilot, operator-copilot |
| Types & Workers | 394 | ai-job.worker (217), type defs (177) |
| Tests | 267 | ai-orchestration.spec.ts |
| Entities | 156 | AiEngine, AiQueryLog, AiQueryPolicy, AiSettings |

### Frontend AI 코드 상세

| 서비스 | Lines | 주요 구성 |
|--------|:-----:|-----------|
| web-neture | 2,787 | FloatingAiButton + Admin AI 대시보드 (8개 페이지) |
| web-glycopharm | 1,816 | Care AI UI (5개 컴포넌트) + Operator AI Report |
| web-glucoseview | 497 | AIChatWidget + AIChatButton |
| web-kpa-society | 45 | OperatorAiReportPage |

---

## 3. LLM 호출 경로 구조

### Provider 현황

| Provider | 역할 | Default Model | API Endpoint |
|----------|------|---------------|-------------|
| **Gemini** | Primary | gemini-2.0-flash | generativelanguage.googleapis.com |
| **OpenAI** | Fallback | gpt-4o-mini | api.openai.com |
| **Claude** | Backup | claude-sonnet-4.5 | api.anthropic.com |

### LLM 호출 경로 지도 (10개 경로)

```
Path 1: ai-core Orchestrator (Platform Insights)
  cockpit/operator-copilot/hub-trigger Controller
    → runAIInsight()
    → GeminiProvider | OpenAIProvider
    → Gemini/OpenAI API

Path 2: ai-proxy Service (Async Multi-Provider)
  BullMQ Worker
    → aiProxyService.generateContent()
    → callOpenAI() | callGemini() | callClaude()
    → 3개 Provider API

Path 3: ai-query Service (User Q&A)
  POST /api/ai/query → AiQueryController
    → aiQueryService.query()
    → googleAI.executeGemini()
    → Gemini API

Path 4: Care LLM Insight (Fire-and-Forget)
  Care Analytics Pipeline
    → CareLlmInsightService.generateAndCache()
    → GeminiProvider.complete()
    → Gemini API → care_llm_insights DB

Path 5: Care AI Chat (Pharmacist Copilot)
  POST /care/ai-chat
    → CareAiChatService.chat()
    → GeminiProvider.complete()
    → Gemini API (5-10min cache)

Path 6: Care Coaching Draft (Fire-and-Forget)
  Care Analytics Pipeline
    → CareCoachingDraftService.generateAndCache()
    → GeminiProvider.complete()
    → Gemini API → care_coaching_drafts DB

Path 7: Patient AI Insight (GlucoseView)
  GET /patient/ai-insight
    → PatientAiInsightService.getOrGenerate()
    → GeminiProvider.complete()
    → Gemini API (24h cache)

Path 8: Google AI Service (Legacy Direct)
  ai-query.service / siteguide.routes
    → googleAI.executeGemini()
    → Gemini API (30s timeout)

Path 9: AI Admin (Control Plane, No LLM Call)
  GET/PUT /api/ai/admin/*
    → aiAdminService (engine/policy/dashboard)

Path 10: AI Operations (Monitoring, No LLM Call)
  GET /api/ai/operations/*
    → aiOperationsService (guardrails/circuit-breaker)
```

### LLM 호출 통합 분석

| 특성 | ai-core Orchestrator | ai-proxy | google-ai.service | Care LLM Services |
|------|:-------------------:|:--------:|:-----------------:|:-----------------:|
| Provider | Gemini + OpenAI | Gemini + OpenAI + Claude | Gemini only | Gemini only |
| 방식 | Sync | Async (BullMQ) | Sync | Sync + Fire-and-Forget |
| 재시도 | 1회 (JSON parse) | 2회 (exponential backoff) | 없음 | 1회 (2s delay) |
| Timeout | 10s | 120s | 30s | 10s |
| ai-core 경유 | **자체** | 별도 | 별도 | GeminiProvider만 import |
| DB 로깅 | audit log | ai_usage_logs | 없음 | 도메인별 테이블 |

### 핵심 발견

1. **3개 독립 LLM 호출 경로** 존재 (ai-core orchestrator / ai-proxy / google-ai.service)
2. google-ai.service는 ai-query.service에서만 사용 → **ai-core provider로 통합 가능**
3. Care 서비스는 이미 ai-core GeminiProvider 사용 → **올바른 패턴**
4. ai-proxy는 BullMQ async 전용 → 다른 경로와 역할 분리됨

---

## 4. Client-side LLM 호출 보안 조사

### 위험 파일 목록

| # | 파일 | Provider | 위험 수준 | 현재 상태 |
|---|------|----------|:---------:|-----------|
| 1 | `apps/admin-dashboard/src/services/ai/visionAI.ts` | OpenAI + Gemini + Claude | **HIGH** | 3개 Provider 직접 호출, API Key in header/URL |
| 2 | `services/web-glucoseview/src/components/ai/AIChatWidget.tsx` | OpenAI | **HIGH** | fetch → api.openai.com, Authorization header |
| 3 | `apps/main-site/src/ai/config.ts` | OpenAI + Anthropic + Google | **MEDIUM** | VITE_*_API_KEY 환경변수 참조 (현재 비어있음) |

### 상세 분석

#### visionAI.ts (CRITICAL)
```
analyzeWithOpenAI() → fetch('api.openai.com') + Authorization: Bearer ${apiKey}
analyzeWithGemini() → fetch('googleapis.com?key=${apiKey}')  ← URL에 Key 노출
analyzeWithClaude() → fetch('api.anthropic.com') + x-api-key: ${apiKey}
```
- `ImageUploader.tsx`에서 사용 중
- API Key가 브라우저 네트워크 탭에서 완전 노출

#### AIChatWidget.tsx (CRITICAL)
```
fetch('api.openai.com/v1/chat/completions') + Authorization: Bearer ${apiKey}
```
- apiKey prop으로 전달받는 구조
- 현재 Layout.tsx에서 key 미전달 (demo mode)

### 긍정적 발견
- `.env` 파일에 실제 API Key 없음
- 소스 코드에 하드코딩된 Key 없음 (`sk-`, `AIza` 패턴 0건)
- Backend ai-proxy.service는 올바른 서버사이드 패턴 사용 중

### 권고: WO-O4O-AI-SECURITY-APIKEY-REMEDIATION

| 우선순위 | 대상 | 조치 |
|:--------:|------|------|
| CRITICAL | visionAI.ts | Backend proxy 엔드포인트 신설, 프론트엔드 직접 호출 제거 |
| CRITICAL | AIChatWidget.tsx | Backend proxy로 교체 |
| HIGH | main-site config.ts | VITE_*_API_KEY 참조 제거 |
| MEDIUM | CSP 헤더 | LLM Provider 도메인 직접 연결 차단 |

---

## 5. Prompt 구조 조사

### Prompt 분포 지도

| 영역 | 파일 수 | 라인 수 | 유형 |
|------|:------:|:------:|------|
| Admin Dashboard AI Generators | 6 | 2,398 | Embedded (Multi-mode system prompts) |
| AI Proxy/Query Services | 3 | 1,675 | Embedded (Prompt building logic) |
| Care LLM Services | 4 | 1,236 | Embedded (SYSTEM_PROMPT constants) |
| Store-AI Services | 4 | 1,039 | Embedded (SYSTEM_PROMPT + PROMPTS dict) |
| AI Core Orchestration | 2 | 493 | Standalone (prompt-composer + types) |
| GlucoseView Frontend | 3 | 474 | Standalone (prompts.ts) + Embedded |
| **합계** | **22** | **~8,315** | |

### Standalone vs Embedded

| 유형 | 파일 수 | 비율 |
|------|:------:|:----:|
| Standalone (별도 prompt 파일) | 4 | 18% |
| Embedded (서비스 코드 내 인라인) | 18 | **82%** |

### 핵심 발견

1. **Prompt의 82%가 서비스 코드에 인라인** — 관리/재사용 어려움
2. Care 서비스: SYSTEM_PROMPT 상수로 파일 상단 정의 → **비교적 양호한 패턴**
3. Store-AI: PROMPTS 딕셔너리로 다중 타입 관리 → **양호**
4. Admin Dashboard: 6개 Generator에 각각 buildSystemPrompt/buildUserPrompt → **가장 분산됨**
5. ai-core prompt-composer: 66줄로 최소 구현, INSIGHT_RESPONSE_SCHEMA 제공

### 권고: WO-O4O-AI-PROMPT-RESTRUCTURE

| 대상 | 현재 | 목표 |
|------|------|------|
| Care SYSTEM_PROMPT (4개) | 서비스 내 상수 | packages/ai-prompts/care/ |
| Store PROMPTS (4개) | 서비스 내 딕셔너리 | packages/ai-prompts/store/ |
| Admin Generator prompts (6개) | 컴포넌트 내 builder | packages/ai-prompts/admin/ |
| GlucoseView prompts | 별도 파일 (양호) | packages/ai-prompts/glucoseview/ |

---

## 6. AI UI Entry Points (Copilot) 구조

### 컴포넌트 목록

| # | 컴포넌트 | 정의 위치 | Import 수 | 서비스 | 유형 |
|---|----------|-----------|:---------:|--------|------|
| 1 | **AiSummaryButton** | packages/o4o-ai-components | 19 | 5개 서비스 | 공유 Core |
| 2 | **FloatingAiButton** | web-neture/components/ai/ | 2 | neture | B2C Copilot |
| 3 | **AIChatButton + Widget** | web-glucoseview/components/ai/ | 3 | glucoseview | Patient Chat |
| 4 | **CareAiChatPanel** | web-glycopharm/pages/care/ | 2 | glycopharm | Provider Chat |
| 5 | **CareAiChatEntry** | web-glycopharm/pages/care/ | 2 | glycopharm | Chat Entry |
| 6 | **PatientAiSummary** | web-glycopharm/pages/care/ | 1 | glycopharm | Insight Card |
| 7 | **CareAiPrioritySummary** | web-glycopharm/pages/care/ | 1 | glycopharm | Priority Card |
| 8 | **CareAiPopulationSummary** | web-glycopharm/pages/care/ | 1 | glycopharm | Population Card |

### 서비스별 AI UI 현황

| 서비스 | AI 컴포넌트 수 | 주요 역할 |
|--------|:------------:|-----------|
| web-neture | 2 | B2C Store/Product Copilot + Dashboard Summary |
| web-glycopharm | 6 | Healthcare Provider AI (Chat + 4 Insight Cards) |
| web-glucoseview | 2 | Patient Glucose AI Assistant |
| web-k-cosmetics | 1 | Dashboard Summary only (AiSummaryButton) |
| web-kpa-society | 1 | Dashboard Summary only (AiSummaryButton) |
| web-account | 0 | — |
| signage-player-web | 0 | — |

### AiSummaryButton 사용 현황 (19개 페이지)

| 서비스 | 페이지 수 | 대표 페이지 |
|--------|:--------:|-----------|
| web-k-cosmetics | 7 | SupplyPage, ProductsPage, StoresPage 등 |
| web-kpa-society | 6 | DashboardPage (4개 변형), OperatorDashboard 등 |
| web-neture | 4 | PartnerDashboardPage, SupplierDashboardPage 등 |
| web-glucoseview | 1 | DashboardPage |
| web-glycopharm | 1 | AiReportPage |

### 권고: WO-O4O-AI-COPILOT-ENTRY-UNIFICATION

현재 3가지 독립 UI 패턴:
1. **Summary Button** — AiSummaryButton (19개 페이지, Modal 팝업)
2. **Floating Chat** — FloatingAiButton (neture), AIChatButton (glucoseview)
3. **Inline Panel** — CareAiChatPanel (glycopharm, 슬라이드 패널)

통합 시 고려사항:
- Summary와 Chat의 UX 차이가 크므로 완전 통합보다 **공통 진입점 + 모드 전환** 방식 권장
- Care AI는 도메인 특수성이 높아 별도 유지 타당

---

## 7. AI 서비스 의존 구조

### 의존성 그래프

```
@o4o/ai-core (FROZEN)
├── contracts, policies, ai-logs
├── cards (types + rules)
│   ← ai-card-exposure.service
│   ← ai-query.service
├── operations (types + constants)
│   ← ai-operations.service
│   ← ai-admin.service
└── orchestration (providers + orchestrator)
    ├── GeminiProvider
    │   ← care-ai-chat.service
    │   ← care-llm-insight.service
    │   ← care-coaching-draft.service
    │   ← patient-ai-insight.service
    │   ← product-ai-content.service
    │   ← product-ai-tagging.service
    │   ← store-ai-insight.service
    │   ← store-ai-product-insight.service
    └── runAIInsight()
        ← cockpit.controller
        ← operator-copilot.controller
        ← hub-trigger.controller

ai-query.service
  → google-ai.service (Gemini 직접)
  → ai-card-exposure.service
  → ai-operations.service
  ← AiQueryController

ai-admin.service
  → ai-operations.service
  ← ai-admin.routes

ai-proxy.service
  → DB (AiSettings, AIUsageLog)
  ← ai-job.worker

ai-job-queue.service
  ← ai-metrics.service
  ← ai-usage-report.service
  ← ai-job.worker

ai-dlq.service
  ← ai-job.worker

google-ai.service
  ← ai-query.service
  ← siteguide.routes
  ← app-registry.service
```

### 의존 계층 (Tier)

| Tier | 서비스 | 역할 |
|:----:|--------|------|
| 1 (Infra) | aiJobQueue, Redis, DB | 기반 인프라 |
| 2 (Core Ops) | aiOperationsService, aiCardExposure, googleAI, aiProxy | 핵심 운영 |
| 3 (Business) | aiQueryService, aiAdminService, aiMetrics, aiUsageReport | 비즈니스 로직 |
| 4 (Feature) | Care AI (5), Store-AI (8), Copilot (2) | 도메인 기능 |

### 핵심 발견
- **순환 의존 없음** — 깨끗한 단방향 의존 구조
- ai-core는 types + interfaces 제공 (Frozen Core 역할 충실)
- 모든 의존이 하향 방향 (acyclic)
- Lazy initialization 패턴으로 Redis 장애 시 서버 기동 보호

---

## 8. AI Copilot 서비스 구조

### Backend Copilot 서비스

| 서비스 | 경로 | Lines | 기능 | LLM 호출 |
|--------|------|:-----:|------|:--------:|
| supplier-copilot | modules/neture/services/ | 167 | KPI 요약, 상품 성과, 유통 추적 | **없음** (SQL) |
| operator-copilot | modules/operator/ | 218 | 플랫폼 KPI, 매장/공급자 추적 | **없음** (SQL) |

### Copilot 특성
- 두 서비스 모두 **LLM 미사용** — 순수 SQL 집계
- runAIInsight()는 Controller 레벨에서 호출 (Copilot Service와 별도)
- 실질적 "Copilot"은 Controller → runAIInsight() 체인

### Care AI 서비스 (실질적 AI Copilot)

| 서비스 | Lines | 기능 | Provider | 캐시 |
|--------|:-----:|------|----------|------|
| care-ai-chat | 320 | 약사용 Q&A Copilot | Gemini | 5-10min |
| care-llm-insight | 217 | KPI 설명 생성 | Gemini | snapshot 기반 |
| care-coaching-draft | 210 | 환자 코칭 초안 | Gemini | snapshot 기반 |
| patient-ai-insight | 270 | 환자 혈당 인사이트 | Gemini | 24h |
| care-priority-ai | 118 | 우선순위 점수 조정 | — | — |

---

## 9. AI 사용량 로깅 (Observability) 구조

### 데이터 흐름

```
[AI Request]
    │
    ├─→ aiOperationsService.recordRequest()  [In-Memory]
    │   ├── 사용량 임계치 모니터링
    │   ├── 이상 탐지 (rapid fire, session flood)
    │   └── Circuit Breaker (3연속 timeout → 차단)
    │
    ├─→ AIJobQueue (BullMQ/Redis)
    │   ├── concurrency: 10, rate: 20/sec
    │   ├── retry: 3회, exponential backoff
    │   └── 완료 1h 보관, 실패 24h 보관
    │
    ├─→ AIUsageLog (PostgreSQL)
    │   ├── provider, model, tokens, cost, status
    │   └── idx: userId+createdAt, provider+createdAt
    │
    ├─→ aiMetrics (Redis)
    │   ├── success/failure rate
    │   ├── avg/median/p95 처리 시간
    │   └── provider별 통계
    │
    ├─→ Prometheus Metrics
    │   ├── ai_jobs_total (counter)
    │   ├── ai_jobs_processing_duration_seconds (histogram)
    │   ├── ai_llm_tokens_total (counter)
    │   └── ai_queue_size (gauge)
    │
    └─→ DLQ (ai-generation-dlq)
        ├── max 10,000 entries
        ├── retryable/non-retryable 분류
        └── 1시간 주기 정리
```

### DB 테이블 현황

| 테이블 | 용도 | 서비스 |
|--------|------|--------|
| ai_settings | Provider별 API Key 저장 | aiProxy, all services |
| ai_query_policies | 사용량 정책 (free/paid limits) | aiQuery, aiAdmin |
| ai_query_logs | 사용자 쿼리 이력 | aiQuery |
| ai_usage_logs | 토큰 사용량, 비용 추적 | aiProxy |
| ai_card_exposures | AI 카드 추천 추적 | aiCardExposure |
| ai_engines | LLM 엔진 정의 | aiAdmin |
| ai_model_settings | 서비스별 모델 설정 | Care LLM |
| care_llm_insights | Care 분석 설명 | CareLlmInsight |
| care_coaching_drafts | 코칭 초안 | CareCoachingDraft |
| patient_ai_insights | 환자 혈당 인사이트 | PatientAiInsight |

### Admin API 엔드포인트

| 엔드포인트 | 용도 |
|-----------|------|
| GET `/api/ai/admin/dashboard` | 종합 대시보드 |
| GET `/api/ai/admin/usage` | 사용량 통계 (N일) |
| GET `/api/ai/admin/ops/summary` | Provider별 호출/에러, 토큰 합계 |
| GET `/api/ai/admin/ops/errors` | 최근 에러 목록 (20-100건) |
| GET `/api/ai/admin/ops/care-status` | Care AI 생성 현황 |
| GET `/api/ai/operations` | 운영 대시보드 |
| GET `/api/ai/operations/summary` | 오늘 요약 |

### Observability 갭 분석

| 영역 | 현재 | 갭 | 영향 |
|------|------|----|----|
| 메트릭 저장 | In-memory + Redis | 시계열 DB 없음 | 재시작 시 메트릭 초기화 |
| 알림 | In-memory alert | 외부 통합 없음 (Slack/PagerDuty) | 재시작 시 알림 유실 |
| 분산 추적 | Job ID 로깅 | Correlation ID 부재 | 서비스 간 추적 어려움 |
| 비용 귀속 | 전체 합산 | 조직/서비스별 분리 없음 | 비용 분석 제한 |

---

## 10. 다음 WO 범위 결정을 위한 종합 분석

### WO 우선순위 재확인

| # | WO | 우선순위 | Phase2 조사 결과 기반 범위 |
|---|---|:--------:|---------------------------|
| 1 | **WO-O4O-AI-SECURITY-APIKEY-REMEDIATION** | **CRITICAL** | 2개 파일 (visionAI.ts, AIChatWidget.tsx) + 1개 config 수정. Backend proxy 1개 신설 필요 |
| 2 | **WO-O4O-AI-LLM-PATH-CONSOLIDATION** | MEDIUM | google-ai.service → ai-core provider 통합 (ai-query.service 수정). ai-proxy는 async 전용으로 유지 |
| 3 | **WO-O4O-AI-PROMPT-RESTRUCTURE** | LOW | 22개 파일에서 prompt 추출 → packages/ai-prompts/ 신설. 가장 넓은 범위 |
| 4 | **WO-O4O-AI-COPILOT-ENTRY-UNIFICATION** | LOW | 3가지 UI 패턴 존재. 완전 통합보다 공통 진입점 + 모드 전환 권장 |

### WO-1 (보안) 상세 범위

```
수정 대상:
  apps/admin-dashboard/src/services/ai/visionAI.ts — 직접 API 호출 제거
  apps/admin-dashboard/src/components/ai/ImageUploader.tsx — Backend proxy 호출로 교체
  services/web-glucoseview/src/components/ai/AIChatWidget.tsx — 직접 API 호출 제거
  apps/main-site/src/ai/config.ts — VITE_*_API_KEY 참조 제거

신규 생성:
  apps/api-server/src/routes/ai-vision.routes.ts — Vision AI backend proxy
  (ai-proxy.service 기존 패턴 활용)
```

### WO-2 (LLM 통합) 상세 범위

```
수정 대상:
  apps/api-server/src/services/ai-query.service.ts
    → googleAI.executeGemini() 호출을 GeminiProvider.complete()로 교체

삭제 후보:
  apps/api-server/src/services/google-ai.service.ts
    → siteguide.routes 의존 확인 후 판단

유지:
  apps/api-server/src/services/ai-proxy.service.ts (async BullMQ 전용, 역할 분리)
```

---

## 11. 아키텍처 다이어그램

### 현재 AI 아키텍처

```
                    ┌─────────────────────────────────────┐
                    │         Frontend Services           │
                    │                                     │
                    │  FloatingAiButton  AiSummaryButton  │
                    │  AIChatWidget     CareAiChatPanel   │
                    │  visionAI.ts ⚠️ (직접 LLM 호출)     │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │       API Server (Backend)          │
                    │                                     │
                    │  ┌─────────────────────────────┐    │
                    │  │ @o4o/ai-core (FROZEN)       │    │
                    │  │  ├── GeminiProvider         │    │
                    │  │  ├── OpenAIProvider          │    │
                    │  │  ├── Orchestrator            │    │
                    │  │  └── Types/Contracts         │    │
                    │  └──────────┬──────────────────┘    │
                    │             │                        │
                    │  ┌──────────▼──────────────────┐    │
                    │  │ Core Services               │    │
                    │  │  ├── ai-query.service        │    │
                    │  │  │   └→ google-ai.service ⚠️ │    │
                    │  │  ├── ai-proxy.service        │    │
                    │  │  │   └→ BullMQ Worker        │    │
                    │  │  ├── ai-operations.service   │    │
                    │  │  └── ai-admin.service        │    │
                    │  └─────────────────────────────┘    │
                    │                                     │
                    │  ┌─────────────────────────────┐    │
                    │  │ Domain Services             │    │
                    │  │  ├── Care AI (5 services)   │    │
                    │  │  ├── Store-AI (8 services)  │    │
                    │  │  └── Copilot (2 services)   │    │
                    │  └─────────────────────────────┘    │
                    │                                     │
                    │  ┌─────────────────────────────┐    │
                    │  │ Observability               │    │
                    │  │  ├── ai-metrics.service      │    │
                    │  │  ├── ai-usage-report.service │    │
                    │  │  ├── ai-dlq.service          │    │
                    │  │  └── Prometheus metrics      │    │
                    │  └─────────────────────────────┘    │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │       LLM Providers                 │
                    │  Gemini (Primary)                   │
                    │  OpenAI (Fallback)                  │
                    │  Claude (Backup)                    │
                    └─────────────────────────────────────┘
```

---

*작성: 2026-03-14*
*상태: Complete*
*다음 단계: WO-O4O-AI-SECURITY-APIKEY-REMEDIATION (CRITICAL)*
