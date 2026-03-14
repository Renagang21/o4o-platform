# IR-O4O-AI-SYSTEM-AUDIT-PHASE1

> O4O Platform AI System Map — 1차 구조 조사
> 작성일: 2026-03-14
>
> **[UPDATE 2026-03-14] WO-O4O-AI-CODE-CLEANUP-PHASE1 반영:**
> - `packages/ai-common-core/` — REMOVED (미사용 확인, import 0건)
> - `ai-block-writer.service.ts` — REMOVED (미사용 확인, import 0건)
> - `AIInsightCard/DetailPanel/Badge` — REMOVED (미사용 확인, import 0건)

---

## 1. AI Modules

O4O 플랫폼에서 발견된 AI 관련 모듈 전체 목록이다.

### 1.1 Core Packages

| # | Module | Path | Purpose | Status |
|---|--------|------|---------|--------|
| 1 | **ai-core** | `packages/ai-core/` | 중앙 AI Orchestration Layer | ACTIVE |
| 2 | **ai-common-core** | `packages/ai-common-core/` | 공통 AI 타입/프롬프트 (GlucoseView 등) | ACTIVE |
| 3 | **o4o-ai-components** | `packages/o4o-ai-components/` | 공유 AI UI 컴포넌트 | ACTIVE |
| 4 | **partner-ai-builder** | `packages/partner-ai-builder/` | 화장품 파트너 AI 콘텐츠 도구 | ACTIVE |
| 5 | **pharmacy-ai-insight** | `packages/pharmacy-ai-insight/` | Care AI 인사이트 패키지 | ACTIVE |

### 1.2 Server-Side Modules

| # | Module | Path | Purpose | Status |
|---|--------|------|---------|--------|
| 6 | **Store AI** | `apps/api-server/src/modules/store-ai/` | 매장 운영 AI 분석 + 상품 AI 콘텐츠 | ACTIVE |
| 7 | **Care LLM** | `apps/api-server/src/modules/care/services/llm/` | 환자 케어 AI (인사이트, 코칭, 채팅) | ACTIVE |
| 8 | **Care Analysis** | `apps/api-server/src/modules/care/domain/analysis/` | 혈당 분석 엔진 (Rule-based + AI) | ACTIVE |
| 9 | **Operator Copilot** | `apps/api-server/src/modules/operator/` | 플랫폼 운영자 AI 대시보드 | ACTIVE |
| 10 | **Neture Copilot** | `apps/api-server/src/modules/neture/services/supplier-copilot.service.ts` | 공급자 대시보드 분석 | ACTIVE |
| 11 | **Forum AI** | `apps/api-server/src/routes/forum/forum.ai.routes.ts` | 포럼 AI 요약/자동 태깅 | ACTIVE |
| 12 | **Signage AI** | `apps/api-server/src/routes/signage/` | 사이니지 AI 콘텐츠 생성 | ACTIVE |

### 1.3 Platform AI Infrastructure

| # | Module | Path | Purpose | Status |
|---|--------|------|---------|--------|
| 13 | **AI Proxy** | `apps/api-server/src/services/ai-proxy.service.ts` | 멀티 프로바이더 LLM 프록시 | ACTIVE |
| 14 | **AI Query** | `apps/api-server/src/services/ai-query.service.ts` | 일반 Q&A 서비스 (컨텍스트 기반) | ACTIVE |
| 15 | **AI Admin** | `apps/api-server/src/services/ai-admin.service.ts` | AI 관리 Control Plane | ACTIVE |
| 16 | **AI Job Queue** | `apps/api-server/src/services/ai-job-queue.service.ts` | 비동기 AI 작업 큐 | ACTIVE |
| 17 | **AI DLQ** | `apps/api-server/src/services/ai-dlq.service.ts` | Dead Letter Queue | ACTIVE |
| 18 | **AI Metrics** | `apps/api-server/src/services/ai-metrics.service.ts` | AI 사용량 메트릭 | ACTIVE |
| 19 | **AI Usage Report** | `apps/api-server/src/services/ai-usage-report.service.ts` | AI 사용량 분석 리포트 | ACTIVE |
| 20 | **AI Block Writer** | `apps/api-server/src/services/ai-block-writer.service.ts` | AI 생성 UI 블록 저장 | ACTIVE |
| 21 | **Google AI** | `apps/api-server/src/services/google-ai.service.ts` | Google Gemini 직접 호출 서비스 | ACTIVE |

---

## 2. AI Services

### 2.1 LLM 호출 서비스 (실제 LLM API 호출)

| # | Service | Path | LLM | Used By |
|---|---------|------|-----|---------|
| 1 | **AIProxyService** | `apps/api-server/src/services/ai-proxy.service.ts` | Gemini + OpenAI + Claude | 범용 프록시 |
| 2 | **GoogleAIService** | `apps/api-server/src/services/google-ai.service.ts` | Gemini 2.0 Flash | AI Query, Forum AI |
| 3 | **GeminiProvider** | `packages/ai-core/src/orchestration/providers/gemini.provider.ts` | Gemini | ai-core Orchestrator |
| 4 | **OpenAIProvider** | `packages/ai-core/src/orchestration/providers/openai.provider.ts` | OpenAI | ai-core Fallback |
| 5 | **CareLlmInsightService** | `apps/api-server/src/modules/care/services/llm/care-llm-insight.service.ts` | Gemini | GlycoPharm Care |
| 6 | **PatientAiInsightService** | `apps/api-server/src/modules/care/services/llm/patient-ai-insight.service.ts` | Gemini | GlucoseView 환자앱 |
| 7 | **CareCoachingDraftService** | `apps/api-server/src/modules/care/services/llm/care-coaching-draft.service.ts` | Gemini | 코칭 초안 |
| 8 | **CareAiChatService** | `apps/api-server/src/modules/care/services/llm/care-ai-chat.service.ts` | Gemini | Care Copilot 채팅 |
| 9 | **StoreAiInsightService** | `apps/api-server/src/modules/store-ai/services/store-ai-insight.service.ts` | Gemini | 매장 운영 인사이트 |
| 10 | **StoreAiProductInsightService** | `apps/api-server/src/modules/store-ai/services/store-ai-product-insight.service.ts` | Gemini | 상품별 분석 |
| 11 | **ProductAiContentService** | `apps/api-server/src/modules/store-ai/services/product-ai-content.service.ts` | Gemini | 상품 설명 생성 |
| 12 | **ProductAiTaggingService** | `apps/api-server/src/modules/store-ai/services/product-ai-tagging.service.ts` | Gemini | 자동 태깅 |
| 13 | **ProductOcrService** | `apps/api-server/src/modules/store-ai/services/product-ocr.service.ts` | Google Vision | OCR 텍스트 추출 |

### 2.2 분석 서비스 (LLM 미사용, 데이터 집계/분석)

| # | Service | Path | Purpose |
|---|---------|------|---------|
| 1 | **OperatorCopilotService** | `apps/api-server/src/modules/operator/operator-copilot.service.ts` | 플랫폼 KPI 집계 (Rule-based + AI fallback) |
| 2 | **SupplierCopilotService** | `apps/api-server/src/modules/neture/services/supplier-copilot.service.ts` | 공급자 KPI 집계 (SQL-based) |
| 3 | **StoreAiSnapshotService** | `apps/api-server/src/modules/store-ai/services/store-ai-snapshot.service.ts` | 매장 스냅샷 데이터 집계 |
| 4 | **CareRiskService** | `apps/api-server/src/modules/care/services/care-risk.service.ts` | 환자 위험도 분류 (Rule-based) |
| 5 | **CarePriorityService** | `apps/api-server/src/modules/care/services/care-priority.service.ts` | 우선 환자 점수 산출 |
| 6 | **CarePriorityAiService** | `apps/api-server/src/modules/care/services/care-priority-ai.service.ts` | AI 기반 Priority Score 보정 |

### 2.3 Cosmetics Partner AI (템플릿 기반, LLM 미사용)

| # | Service | Path | Purpose |
|---|---------|------|---------|
| 1 | **AiDescriptionService** | `packages/partner-ai-builder/src/backend/services/ai-description.service.ts` | 상품 설명 생성 (플랫폼별 템플릿) |
| 2 | **AiRoutineService** | `packages/partner-ai-builder/src/backend/services/ai-routine.service.ts` | 스킨케어 루틴 생성 |
| 3 | **AiContentService** | `packages/partner-ai-builder/src/backend/services/AiContentService.ts` | 콘텐츠 생성 |
| 4 | **AiRecommendationService** | `packages/partner-ai-builder/src/backend/services/AiRecommendationService.ts` | 상품 추천 |

---

## 3. AI Providers

### 3.1 Provider 매트릭스

| Provider | 모델 | 용도 | 환경변수 | 상태 |
|----------|------|------|---------|------|
| **Google Gemini** | gemini-2.0-flash (기본) | Primary LLM | `GEMINI_API_KEY` | **PRIMARY** |
| **Google Gemini** | gemini-3.0-flash | ai-core 오케스트레이터 | `GEMINI_API_KEY` | ACTIVE |
| **Google Gemini** | gemini-2.5-flash | AI Proxy | `GEMINI_API_KEY` | ACTIVE |
| **OpenAI** | gpt-5-mini (기본) | AI Proxy Fallback | `OPENAI_API_KEY` | FALLBACK |
| **OpenAI** | gpt-4o-mini | ai-core Fallback | `OPENAI_API_KEY` | FALLBACK |
| **Claude** | claude-sonnet-4.5 | AI Proxy | `CLAUDE_API_KEY` | AVAILABLE |
| **Google Vision** | Vision API | OCR 텍스트 추출 | `GOOGLE_CLOUD_PROJECT` | ACTIVE |

### 3.2 API Key 해결 우선순위

```
1. Database (ai_settings 테이블)
2. 환경변수 (GEMINI_API_KEY, OPENAI_API_KEY, CLAUDE_API_KEY)
3. 에러: "API key not configured"
```

### 3.3 기본 설정

| 항목 | 값 |
|------|------|
| Temperature | 0.3 (구조화 출력) |
| Max Tokens | 2,048 |
| Timeout | 10–120초 (서비스별 상이) |
| Retry | 1–2회 (2초 대기) |
| 출력 형식 | JSON Only (모든 서비스) |
| 언어 | 한국어 (100%) |

---

## 4. AI Prompts

### 4.1 Prompt 위치 목록

| # | Location | Purpose | LLM | 언어 |
|---|----------|---------|-----|------|
| 1 | `packages/ai-common-core/src/prompts/glucoseview/index.ts` | GlucoseView 7개 프롬프트 템플릿 | Gemini | KR |
| 2 | `services/web-glucoseview/src/components/ai/prompts.ts` | GlucoseView 프론트엔드 프롬프트 | Gemini | KR |
| 3 | `apps/api-server/src/modules/care/services/llm/care-llm-insight.service.ts` | 약사용 분석 설명 | Gemini | KR |
| 4 | `apps/api-server/src/modules/care/services/llm/patient-ai-insight.service.ts` | 환자용 건강 요약 | Gemini | KR |
| 5 | `apps/api-server/src/modules/care/services/llm/care-coaching-draft.service.ts` | AI 코칭 초안 | Gemini | KR |
| 6 | `apps/api-server/src/modules/care/services/llm/care-ai-chat.service.ts` | Care Copilot 채팅 | Gemini | KR |
| 7 | `apps/api-server/src/modules/store-ai/services/store-ai-insight.service.ts` | 매장 운영 요약 | Gemini | KR |
| 8 | `apps/api-server/src/modules/store-ai/services/store-ai-product-insight.service.ts` | 상품별 분석 | Gemini | KR |
| 9 | `apps/api-server/src/modules/store-ai/services/product-ai-content.service.ts` | 상품 설명/POP 생성 | Gemini | KR |
| 10 | `apps/api-server/src/modules/store-ai/services/product-ai-tagging.service.ts` | 자동 태깅 | Gemini | KR |
| 11 | `apps/api-server/src/services/ai-query.service.ts` | 일반 Q&A | Gemini | KR |
| 12 | `packages/ai-core/src/orchestration/prompt-composer.ts` | 오케스트레이터 범용 템플릿 | Gemini/OpenAI | KR |

### 4.2 GlucoseView Prompt 카탈로그

| Prompt ID | Name | Category |
|-----------|------|----------|
| `glucoseview.dashboard.today` | 오늘의 요약 | Dashboard |
| `glucoseview.dashboard.weekly` | 주간 리포트 | Dashboard |
| `glucoseview.analysis.patient` | 환자 분석 | Analysis |
| `glucoseview.analysis.compare` | 기간 비교 | Analysis |
| `glucoseview.recommendation.lifestyle` | 생활습관 제안 | Recommendation |
| `glucoseview.consultation.talking-points` | 상담 포인트 | Consultation |
| `glucoseview.report.summary` | 리포트 생성 | Report |

### 4.3 안전 규칙 (모든 Healthcare Prompt 공통)

```
- 의료적 진단, 처방, 치료 권고 절대 금지
- 관찰된 데이터 패턴만 설명
- "~경향이 관찰됩니다" 형태로 표현
- "전문의 상담을 권장합니다" 필수 포함 (약사용 인사이트)
- "자세한 상담은 약사와 상의하시기 바랍니다" 필수 포함 (코칭)
```

---

## 5. AI Insights / Analysis 기능

### 5.1 Care AI (GlycoPharm / GlucoseView)

| Feature | Input | Output | Screen | 캐시 |
|---------|-------|--------|--------|------|
| **CareLlmInsight** | KPI Snapshot (TIR, CV, risk) | `{ pharmacyInsight, patientMessage }` | 약사 대시보드 | Snapshot별 1회 |
| **PatientAiInsight** | 14일 glucose readings | `{ summary, warning, tip }` | 환자 앱 | 24시간 TTL |
| **CareCoachingDraft** | KPI Snapshot + 환자 데이터 | `{ draftMessage }` | 코칭 화면 | Snapshot별 1회 |
| **CareAiChat** | 약사 질문 + 환자 데이터 | `{ summary, details, recommendations }` | Care Copilot | 5–10분 |
| **CareRiskAnalysis** | TIR, CV, BP, Weight | `{ riskLevel, metabolicRisk }` | 위험 환자 목록 | Rule-based |
| **CarePriorityScore** | 5개 요소 복합 점수 | `priority_score (0-100)` | 오늘의 우선 환자 | Rule-based + AI보정 |

### 5.2 Store AI

| Feature | Input | Output | Screen | 캐시 |
|---------|-------|--------|--------|------|
| **StoreAiInsight** | 주문/QR/상품/채널 데이터 | `{ summary, issues, actions }` | 매장 대시보드 | 일 1회 Snapshot |
| **StoreAiProductInsight** | 상품별 QR/주문/매출/전환율 | `{ summary, productHighlights, issues, actions }` | 상품 분석 | 일 1회 Snapshot |
| **ProductAiContent** | 상품명/규격/카테고리/OCR | 설명/POP/사이니지 텍스트 | 상품 상세 | 영구 저장 |
| **ProductAiTag** | 상품 정보 | `{ tags: [{ tag, confidence }] }` | 상품 태그 | 영구 저장 |
| **ProductOcr** | 상품 이미지 | OCR 텍스트 | AI Content 입력 | 영구 저장 |

### 5.3 Platform AI

| Feature | Input | Output | Screen |
|---------|-------|--------|--------|
| **OperatorCopilot** | 플랫폼 KPI | KPI + AI Summary | 운영자 대시보드 |
| **SupplierCopilot** | 공급자 KPI | KPI + Trending | 공급자 대시보드 |
| **ForumAI** | 포럼 게시글 | 요약 + 자동 태그 | 포럼 |
| **AiQuery** | 사용자 질문 + Context | 답변 + Cards | FloatingAiButton |

---

## 6. AI Chat / Copilot

### 6.1 Chat 기능

| # | Chat | Service | LLM | Context | Screen |
|---|------|---------|-----|---------|--------|
| 1 | **Care AI Chat** | CareAiChatService | Gemini | Population / Patient | GlycoPharm Care Copilot 패널 |
| 2 | **AI Query (FloatingAiButton)** | AiQueryService | Gemini | Store/Product/Category/Page | Neture/Admin 전역 |

### 6.2 Copilot 기능

| # | Copilot | Service | LLM | Screen |
|---|---------|---------|-----|--------|
| 1 | **Operator Copilot** | OperatorCopilotService | ai-core (fallback: rule-based) | 운영자 대시보드 |
| 2 | **Supplier Copilot** | SupplierCopilotService | 없음 (SQL 집계) | 공급자 대시보드 |
| 3 | **Partner AI Builder** | AiDescriptionService 등 | 없음 (템플릿 기반) | 화장품 파트너 도구 |

### 6.3 Frontend 컴포넌트

| Component | Package | Used In |
|-----------|---------|---------|
| `FloatingAiButton` | `@o4o/ai-components` | Neture Web, Admin Dashboard |
| `AiSummaryButton` | `@o4o/ai-components` | 공급자/파트너 대시보드 |
| `AiSummaryModal` | `@o4o/ai-components` | AI 요약 모달 |
| `AiPreviewModal` | `@o4o/ai-components` | AI 미리보기 |
| `CareAiChatPanel` | web-glycopharm | Care Copilot 사이드 패널 |
| `AIInsightCard` | web-neture | AI 인사이트 카드 |
| `AIInsightBadge` | web-neture | AI 뱃지 |
| `CareAiPopulationSummary` | web-glycopharm | 모집단 요약 |
| `CareAiPrioritySummary` | web-glycopharm | 우선 환자 AI 요약 |
| `PatientAiSummary` | web-glycopharm | 환자 AI 인사이트 |
| `CareRiskSummary` | web-glycopharm | 위험도 요약 |

---

## 7. AI Usage / 통계 구조

### 7.1 사용량 추적

| Table | Purpose | Provider | Status |
|-------|---------|----------|--------|
| `ai_usage_logs` | 모든 AI API 호출 추적 (토큰, 비용, 에러) | OpenAI/Gemini/Claude | ACTIVE |
| `ai_settings` | 프로바이더 설정/API 키 관리 | 전체 | ACTIVE |
| `ai_model_settings` | 서비스별 모델 설정 (temperature, maxTokens) | Care/Store | ACTIVE |

### 7.2 AIUsageLog 컬럼

```
id, userId, provider (OPENAI|GEMINI|CLAUDE), model, requestId
promptTokens, completionTokens, totalTokens, durationMs
status (SUCCESS|ERROR), errorMessage, errorType
createdAt
```

### 7.3 관리 엔드포인트

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ai/admin/dashboard` | GET | 대시보드 데이터 |
| `/api/ai/admin/engines` | GET | 엔진 목록 |
| `/api/ai/admin/engines/:id/activate` | PUT | 엔진 활성화 |
| `/api/ai/admin/policy` | GET/PUT | 정책 조회/수정 |
| `/api/ai/admin/usage` | GET | 사용량 통계 |
| `/api/ai/admin/ops/summary` | GET | 프로바이더 호출/에러 통계 |
| `/api/ai/admin/ops/errors` | GET | 최근 에러 로그 |
| `/api/ai/admin/ops/care-status` | GET | Care AI 생성 상태 |

---

## 8. AI Database Tables

### 8.1 전체 테이블 목록

| # | Table | Entity | Module | Purpose | Status |
|---|-------|--------|--------|---------|--------|
| 1 | `ai_settings` | AiSettings | Platform | 프로바이더 설정/API 키 | ACTIVE |
| 2 | `ai_usage_logs` | AIUsageLog | Platform | 사용량 추적 | ACTIVE |
| 3 | `ai_model_settings` | AiModelSetting | Care | 서비스별 모델 설정 | ACTIVE |
| 4 | `care_llm_insights` | CareLlmInsight | Care | 약사/환자 AI 인사이트 캐시 | ACTIVE |
| 5 | `patient_ai_insights` | PatientAiInsight | Care | 환자 AI 건강 요약 | ACTIVE |
| 6 | `care_coaching_drafts` | CareCoachingDraft | Care | AI 코칭 초안 | ACTIVE |
| 7 | `care_coaching_sessions` | CareCoachingSession | Care | 승인된 코칭 세션 | ACTIVE |
| 8 | `care_kpi_snapshots` | CareKpiSnapshot | Care | 환자 건강 KPI 스냅샷 | ACTIVE |
| 9 | `store_ai_snapshots` | StoreAiSnapshot | Store-AI | 매장 KPI 스냅샷 | ACTIVE |
| 10 | `store_ai_insights` | StoreAiInsight | Store-AI | 매장 AI 인사이트 | ACTIVE |
| 11 | `store_ai_product_snapshots` | StoreAiProductSnapshot | Store-AI | 상품별 KPI 스냅샷 | ACTIVE |
| 12 | `store_ai_product_insights` | StoreAiProductInsight | Store-AI | 상품별 AI 분석 | ACTIVE |
| 13 | `product_ai_tags` | ProductAiTag | Store-AI | AI 자동 태그 | ACTIVE |
| 14 | `product_ai_contents` | ProductAiContent | Store-AI | AI 생성 상품 콘텐츠 | ACTIVE |
| 15 | `product_ocr_texts` | ProductOcrText | Store-AI | OCR 텍스트 캐시 | ACTIVE |

### 8.2 데이터 흐름 패턴

```
Snapshot → Insight 패턴 (모든 AI 분석):

[데이터 수집] → [Snapshot 저장] → [LLM 호출] → [Insight 저장]
                                     ↓ (실패 시)
                              [Rule-based Fallback]
```

---

## 9. AI APIs

### 9.1 전체 API 엔드포인트

#### Care AI

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/v1/care/ai-chat` | ✅ | Care Copilot Q&A |
| GET | `/api/v1/care/llm-insight/:patientId` | ✅ | 환자 LLM 인사이트 |
| GET | `/api/v1/care/patient/ai-insight` | ✅ | 환자용 AI 건강 요약 |
| GET | `/api/v1/care/coaching-drafts/:patientId` | ✅ | AI 코칭 초안 |
| POST | `/api/v1/care/coaching-drafts/:id/approve` | ✅ | 초안 승인 |
| POST | `/api/v1/care/coaching-drafts/:id/discard` | ✅ | 초안 삭제 |
| GET | `/api/v1/care/ai-priority-patients` | ✅ | AI 우선 환자 목록 |
| GET | `/api/v1/care/analysis/:patientId` | ✅ | CGM 분석 (→ AI fire-and-forget) |

#### Store AI

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/v1/stores/*/ai/health` | ❌ | 시스템 진단 |
| POST | `/api/v1/stores/*/ai/snapshot` | ✅ | 스냅샷 생성 + AI |
| GET | `/api/v1/stores/*/ai/summary` | ✅ | AI 인사이트 조회 |
| POST | `/api/v1/stores/*/products/*/ai-contents/generate` | ✅ | 상품 콘텐츠 생성 |
| POST | `/api/v1/stores/*/products/*/ai-contents/generate/:type` | ✅ | 특정 타입 생성 |
| GET | `/api/v1/stores/*/products/*/ai-contents` | ✅ | 생성 콘텐츠 조회 |
| POST | `/api/v1/stores/*/products/*/ai-tags/regenerate` | ✅ | 태그 재생성 |
| GET | `/api/v1/stores/*/products/search/ai` | ✅ | AI 검색 |

#### Forum AI

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/v1/forum/ai/status` | ❌ | 서비스 상태 |
| POST | `/api/v1/forum/posts/:id/ai/process` | ✅ | AI 처리 |
| POST | `/api/v1/forum/posts/:id/ai/regenerate` | ✅ | 재생성 |
| POST | `/api/v1/forum/posts/:id/ai/apply-tags` | ✅ | 태그 적용 |

#### Platform AI

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/ai/query` | ✅ | 일반 Q&A |
| GET | `/api/ai/usage` | ✅ | 사용량 조회 |
| GET | `/api/ai/admin/dashboard` | ✅ Admin | 대시보드 |
| GET | `/api/ai/admin/engines` | ✅ Admin | 엔진 목록 |
| PUT | `/api/ai/admin/engines/:id/activate` | ✅ Admin | 엔진 활성화 |
| GET/PUT | `/api/ai/admin/policy` | ✅ Admin | 정책 관리 |

#### Copilot

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/v1/admin/operator/copilot/ai-summary` | ✅ Admin | 운영자 AI 요약 |
| GET | `/api/v1/admin/operator/copilot/kpi` | ✅ Admin | 플랫폼 KPI |
| GET | `/api/v1/neture/supplier/copilot/kpi` | ✅ | 공급자 KPI |
| GET | `/api/v1/neture/seller/dashboard/ai-insight` | ✅ | 셀러 AI 인사이트 |

#### Signage / Partner AI

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/signage/:serviceKey/ai/generate` | ✅ | 사이니지 AI 생성 |
| POST | `/api/v1/partner/ai/routine` | ✅ | 스킨케어 루틴 생성 |
| POST | `/api/v1/partner/ai/description` | ✅ | 상품 설명 생성 |

---

## 10. AI 코드 상태 분류

### 10.1 상태별 분류

#### ACTIVE (실제 프로덕션 사용)

| Module | 주요 기능 |
|--------|----------|
| ai-core | 오케스트레이션 레이어 |
| AI Proxy | 멀티 프로바이더 LLM 프록시 |
| Care LLM (4개 서비스) | 약사/환자 인사이트, 코칭, 채팅 |
| Store AI (5개 서비스) | 매장 인사이트, 상품 콘텐츠/태깅/OCR |
| Operator Copilot | 운영자 대시보드 AI |
| Forum AI | 포럼 요약/자동 태깅 |
| AI Admin | Control Plane + 관찰성 |
| AI Query | FloatingAiButton Q&A |

#### PARTIAL (기능 일부만 활성)

| Module | 상태 |
|--------|------|
| Supplier Copilot | KPI 집계만 (LLM 미사용) |
| Partner AI Builder | 템플릿 기반만 (LLM 미사용) |
| Care Priority AI | Rule-based + AI 보정 (구현 진행 중) |

#### EXPERIMENTAL

| Module | 상태 |
|--------|------|
| GlucoseView 프론트엔드 프롬프트 | 프론트엔드 프롬프트만 존재, 백엔드 미연동 |

---

## 11. 아키텍처 요약

### 11.1 AI 시스템 구조도

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND LAYER                     │
│  FloatingAiButton │ CareAiChat │ AI Dashboard Pages │
│  AIInsightCard    │ AiSummary  │ PatientAiSummary   │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────┐
│                    API LAYER                         │
│  /api/ai/query  │ /api/v1/care/ai-*  │ /store/ai/* │
│  /api/ai/admin  │ /copilot/*         │ /forum/ai/* │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────┐
│                  SERVICE LAYER                       │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Care LLM │  │ Store AI │  │ Platform AI      │   │
│  │ 4 svc    │  │ 5 svc    │  │ (Proxy, Query,   │   │
│  │          │  │          │  │  Admin, Metrics)  │   │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
│       │              │                 │              │
│  ┌────┴──────────────┴─────────────────┴─────────┐   │
│  │            AI PROVIDER LAYER                   │   │
│  │  GeminiProvider │ OpenAIProvider │ Claude      │   │
│  │  (PRIMARY)      │ (FALLBACK)    │ (AVAILABLE) │   │
│  └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────┐
│                  DATA LAYER                          │
│  ai_settings    │ ai_usage_logs  │ ai_model_settings│
│  care_llm_*     │ store_ai_*     │ product_ai_*     │
│  care_kpi_*     │ patient_ai_*   │ product_ocr_*    │
└──────────────────────────────────────────────────────┘
```

### 11.2 핵심 패턴

| 패턴 | 설명 | 사용 서비스 |
|------|------|-----------|
| **Fire-and-Forget** | AI 실패가 비즈니스 로직 차단 안 함 | Care LLM, Store AI |
| **Snapshot → Insight** | 데이터 집계 → AI 분석 → 캐시 | Store AI, Care KPI |
| **JSON-Only Output** | 모든 AI 출력 JSON 강제 | 전체 |
| **DB-First Key** | API 키를 DB에서 먼저 조회 | AI Proxy, Google AI |
| **Audit Trail** | 모든 호출 ai_usage_logs 기록 | AI Proxy |
| **Draft → Approve** | AI 초안 → 사람 승인 → 실행 | Care Coaching |

### 11.3 핵심 수치

| 항목 | 값 |
|------|------|
| AI 관련 Package | 5개 |
| AI 관련 Server Module | 21개 |
| LLM 호출 Service | 13개 |
| AI Database Table | 15개 |
| AI API Endpoint | 50+ 개 |
| AI Frontend Component | 11+ 개 |
| AI Prompt | 25+ 개 |
| LLM Provider | 3개 (Gemini Primary) |

---

## 12. Phase 2 조사를 위한 관찰

### 12.1 중복 가능성

```
- ai-proxy.service.ts vs ai-core/providers → LLM 호출 경로 2개 존재
- google-ai.service.ts vs GeminiProvider → Gemini 호출 코드 중복
- AiQueryService vs CareAiChatService → Q&A 패턴 유사
```

### 12.2 Core 승격 후보

```
- AI Proxy (멀티 프로바이더 프록시) → ai-core에 통합 가능
- AI Usage Logging → ai-core에 통합 가능
- Prompt Composer → ai-core에 통합 가능
- JSON Output Enforcement → ai-core에 표준화 가능
```

### 12.3 Extension 후보

```
- Partner AI Builder (화장품 전용)
- Pharmacy AI Insight (약국 전용)
- Care AI Chat (GlycoPharm 전용)
- Forum AI (포럼 전용)
```

### 12.4 미사용/정리 후보

```
- GlucoseView 프론트엔드 프롬프트 (백엔드 미연동)
- AI Block Writer (사용 빈도 확인 필요)
- Supplier Copilot (LLM 미사용, 순수 SQL 집계)
```

---

*IR 작성 완료: 2026-03-14*
*Status: Phase 1 Complete — 구조 변경 없음, 조사만 수행*
