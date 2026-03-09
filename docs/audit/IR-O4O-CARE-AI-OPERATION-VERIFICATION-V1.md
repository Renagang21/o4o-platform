# IR-O4O-CARE-AI-OPERATION-VERIFICATION-V1

> Care AI 운영 검증 보고서
> 검증일: 2026-03-09
> 대상 WO: AI-INFRA-READINESS-FIX-V1, CARE-AI-RESILIENCE-FIX-V1, AI-OBSERVABILITY-MINIMUM-V1

---

## 검증 요약

| # | 검증 항목 | 상태 | 비고 |
|---|----------|------|------|
| 1 | AI Provider 연결 | **PASS** | GEMINI_API_KEY 설정 완료, status=ready |
| 2 | AI 운영 상태 (ops/summary) | PENDING | 인증 필요 — 관리자 로그인 후 확인 |
| 3 | Care AI 실제 생성 | PENDING | 인증 필요 — GlycoPharm에서 환자 분석 실행 필요 |
| 4 | DB 상태 | PENDING | AI 실행 후 확인 가능 |
| 5 | 운영 API (ops/care-status) | PENDING | 인증 필요 |
| 6 | Retry 동작 | **PASS** (코드 분석) | 정상 구현 확인 |
| 7 | UI 표시 | **PASS** (코드 분석) | Graceful degradation 확인 |
| 8 | 오류 확인 (ops/errors) | PENDING | 인증 필요 |

### 최종 판정

```
Care AI operational status: READY (awaiting first trigger)
GEMINI_API_KEY: CONFIGURED (env)
Code: ALL VERIFIED
```

---

## Phase 1: 최초 검증 (API Key 미설정 상태)

### 검증 시각: 2026-03-09T01:41Z

```
GET https://api.neture.co.kr/api/v1/care/llm-insight/health
```

```json
{
  "geminiKeyConfigured": false,
  "keySource": "none",
  "status": "missing_api_key"
}
```

**판정**: BLOCKED — GEMINI_API_KEY 미설정

---

## Phase 2: API Key 등록 + 재배포

### 조치

1. `gh secret set GEMINI_API_KEY` → GitHub Secret 등록
2. `gh workflow run deploy-api.yml --ref main` → 재배포 트리거
3. 배포 완료: Run #22835058057, 6m39s

### 재검증 시각: 2026-03-09T01:56Z

```
GET https://api.neture.co.kr/api/v1/care/llm-insight/health
```

```json
{
  "success": true,
  "data": {
    "geminiKeyConfigured": true,
    "keySource": "env",
    "envKeySet": true,
    "dbKeyActive": false,
    "model": "gemini-2.0-flash",
    "temperature": 0.3,
    "maxTokens": 2048,
    "totalInsights": 0,
    "lastInsightAt": null,
    "totalDrafts": 0,
    "lastDraftAt": null,
    "status": "ready"
  }
}
```

### 분석

| 항목 | 기대값 | 실제값 | 판정 |
|------|--------|--------|------|
| geminiKeyConfigured | true | **true** | **PASS** |
| keySource | env 또는 db | **env** | **PASS** |
| model | gemini-2.0-flash | gemini-2.0-flash | **PASS** |
| temperature | 0.3 | 0.3 | **PASS** |
| maxTokens | 2048 | 2048 | **PASS** |
| totalInsights | 0 (첫 실행 전) | 0 | **PASS** |
| totalDrafts | 0 (첫 실행 전) | 0 | **PASS** |
| status | ready | **ready** | **PASS** |

---

## Admin API 검증 (인증 필요)

### 호출 결과

```
GET /api/ai/admin/ops/summary   → 401 AUTH_REQUIRED
GET /api/ai/admin/ops/errors    → 401 AUTH_REQUIRED
GET /api/ai/admin/ops/care-status → 401 AUTH_REQUIRED
```

Admin API는 `authenticate` + `requireAdmin` 미들웨어로 보호됨.
외부에서 인증 없이 접근 불가 — **정상 동작** (보안 설계대로).

테스트 계정(`admin@test.com`)은 프로덕션에 존재하지 않음 — **정상** (프로덕션 보안).

**검증 방법**: 관리자 계정으로 GlycoPharm 또는 Neture 웹에 로그인 후 브라우저 DevTools에서 직접 확인.

---

## 코드 경로 분석: Care AI 실행 흐름

### 분석 트리거 → LLM 생성 체인

```
GET /api/v1/care/analysis/:patientId
  → authenticate() + requirePharmacyContext()
  → provider.analyzePatient(patientId)
  → HTTP 200 반환 (분석 결과)

  → (fire-and-forget, 비동기)
     kpiService.recordSnapshot(patientId, analysis, pharmacyId)
       .then(snapshot => {
         // 3개 병렬 실행 (no await)
         llmInsightService.generateAndCache(snapshot, analysis, pharmacyId).catch(() => {});
         coachingDraftService.generateAndCache(snapshot, analysis, pharmacyId).catch(() => {});
         alertService.evaluateAndCreate(patientId, analysis, pharmacyId).catch(() => {});
       })
       .catch(() => {});
```

### GEMINI_API_KEY 설정 후 예상 동작

```
generateAndCache() 진입
  → buildProviderConfig()
    → ai_settings 조회 → apiKey = '' (DB에 미등록)
    → process.env.GEMINI_API_KEY → 'AIzaSy...' (env에서 획득)
  → config.apiKey 존재 → LLM 호출 진행
  → gemini.complete(SYSTEM_PROMPT, userPrompt, config)
  → JSON parse → DB 저장 (care_llm_insights / care_coaching_drafts)
```

---

## Retry 동작 확인 (코드 분석)

### CareLlmInsightService.generateAndCache()

**파일**: `apps/api-server/src/modules/care/services/llm/care-llm-insight.service.ts`

| 항목 | 구현 | 판정 |
|------|------|------|
| 중복 방어 (dedup) | `findOne({ where: { snapshotId } })` → 있으면 skip | **PASS** |
| API Key 체크 | `!config.apiKey` → warn + return | **PASS** |
| 최대 시도 | `MAX_ATTEMPTS = 2` | **PASS** |
| 재시도 대기 | `RETRY_DELAY_MS = 2_000` (2초) | **PASS** |
| Non-retryable 분류 | `'not configured'`, `'INVALID_ARGUMENT'` → 즉시 return | **PASS** |
| Retryable 분류 | timeout, 5xx, network, JSON parse → 재시도 | **PASS** |
| 최종 실패 로그 | `snapshotId`, `patientId`, `attempts`, `lastError` 포함 | **PASS** |
| Outer guard | 최외곽 try/catch → 예외 시 console.error만 | **PASS** |

### CareCoachingDraftService.generateAndCache()

**파일**: `apps/api-server/src/modules/care/services/llm/care-coaching-draft.service.ts`

동일 패턴 적용 확인: dedup + API key check + retry loop + structured logging

**판정**: Retry 로직 **정상 구현** 확인.

---

## UI 확인 (코드 분석)

### GlycoPharm AnalysisTab

**파일**: `services/web-glycopharm/src/pages/care/patient-tabs/AnalysisTab.tsx`

| 항목 | 구현 | 판정 |
|------|------|------|
| API 호출 | `GET /api/v1/care/llm-insight/{patientId}` | **PASS** |
| 표시 필드 | `pharmacyInsight` | **PASS** |
| Null 처리 | `{llmInsight?.pharmacyInsight && (...)}` — 없으면 숨김 | **PASS** |
| 로딩 상태 | Spinner (Loader2 icon) | **PASS** |
| 모델/시각 표시 | model + createdAt 표시 | **PASS** |

### GlycoPharm CoachingTab

**파일**: `services/web-glycopharm/src/pages/care/patient-tabs/CoachingTab.tsx`

| 항목 | 구현 | 판정 |
|------|------|------|
| API 호출 | `GET /api/v1/care/coaching-drafts/{patientId}` | **PASS** |
| 표시 필드 | `draftMessage` | **PASS** |
| Null 처리 | `{draft && (...)}` — 없으면 숨김 | **PASS** |
| 승인/거절 | Approve + Discard 버튼 | **PASS** |
| 편집 가능 | 약사가 draftMessage 수정 가능 | **PASS** |

### GlycoPharm HomeLivePage

**파일**: `services/web-glycopharm/src/pages/HomeLivePage.tsx`

| 항목 | 구현 | 판정 |
|------|------|------|
| API 호출 | `GET /api/v1/care/llm-insight/{topPriorityPatientId}` | **PASS** |
| 표시 필드 | `pharmacyInsight` (우선순위 1위 환자) | **PASS** |
| Null 처리 | `{aiInsight?.pharmacyInsight && todayPriority.length > 0 && (...)}` | **PASS** |

### GlucoseView CareDashboardPage

**파일**: `services/web-glucoseview/src/pages/CareDashboardPage.tsx`

| 항목 | 구현 | 판정 |
|------|------|------|
| API 호출 | `GET /api/v1/care/llm-insight/{patientId}` | **PASS** |
| 표시 필드 | `patientMessage` | **PASS** |
| Null 처리 | `{llmInsight?.patientMessage && (...)}` — 없으면 숨김 | **PASS** |
| 시각 표시 | createdAt 표시 | **PASS** |

### UI Graceful Degradation

모든 UI에서 AI 데이터가 `null`일 때:
- AI 섹션이 조건부 렌더링으로 숨겨짐
- 비-AI 분석 데이터(TIR, CV, riskLevel, insights)는 정상 표시
- 에러 메시지 없음, 빈 상태 없음 — **깨끗한 fallback**

**판정**: UI **정상 구현** 확인. AI 데이터 생성 시 자동 표시.

---

## 서버 상태

### Health Check

```json
{
  "status": "alive",
  "environment": "production",
  "version": "0.5.0"
}
```

### Detailed Health

```json
{
  "status": "healthy",
  "database": "healthy (v15.15)",
  "system": "healthy (memory 24%)"
}
```

### 배포 이력

```
2026-03-09T01:49:41Z  GEMINI_API_KEY 설정 재배포 (workflow_dispatch)  ✅ 6m39s
2026-03-09T01:27:44Z  feat(ai): AI infrastructure stabilization       ✅ 6m20s
2026-03-09T00:13:03Z  feat(care): CARE-AI-EXPLANATION-LAYER-V1         ✅ 6m20s
```

---

## 검증 결과 종합

### 코드 레벨 검증 (Claude Code 직접 확인)

| 항목 | 판정 | 근거 |
|------|------|------|
| Health endpoint | **PASS** | status=ready, keySource=env |
| GEMINI_API_KEY 연결 | **PASS** | geminiKeyConfigured=true |
| Retry 로직 | **PASS** | 2회 시도, 2초 대기, 에러 분류 |
| 중복 방어 | **PASS** | snapshotId dedup check |
| Fire-and-forget 패턴 | **PASS** | 3개 서비스 병렬 + catch 억제 |
| Ops API 구현 | **PASS** | summary + errors + care-status |
| Ops API 보안 | **PASS** | 401 AUTH_REQUIRED (인증 보호) |
| UI Graceful Degradation | **PASS** | 4개 화면 조건부 렌더링 |

### 운영 레벨 검증 (실제 API 호출)

| 항목 | 판정 | 근거 |
|------|------|------|
| GEMINI_API_KEY 설정 | **PASS** | keySource=env, status=ready |
| AI 생성 (insight) | **PENDING** | 인증된 환자 분석 실행 필요 |
| AI 생성 (draft) | **PENDING** | 인증된 환자 분석 실행 필요 |
| Ops API 접근 | **PENDING** | 관리자 로그인 후 확인 필요 |
| UI 실제 표시 | **PENDING** | AI 데이터 생성 후 확인 필요 |

---

## 다음 단계: 수동 검증 절차

대표님이 직접 확인해야 할 항목:

### Step 1: GlycoPharm 로그인
```
https://glycopharm.co.kr (또는 glycopharm.neture.co.kr)
→ 약사 계정으로 로그인
```

### Step 2: 환자 분석 실행
```
Care 메뉴 → 환자 선택 → Analysis Tab
→ 분석 실행 (자동 또는 새로고침)
→ 10~30초 대기
```

### Step 3: AI Insight 확인
```
Analysis Tab → 하단 파란색 카드
→ "pharmacyInsight" 텍스트 표시 여부 확인
→ 모델명 + 생성 시각 표시 여부 확인
```

### Step 4: Coaching Draft 확인
```
Coaching Tab → AI 코칭 초안
→ "draftMessage" 표시 여부 확인
→ 승인/거절 버튼 작동 여부 확인
```

### Step 5: Health 재확인
```
GET https://api.neture.co.kr/api/v1/care/llm-insight/health
→ totalInsights > 0
→ lastInsightAt ≠ null
```

### Step 6 (선택): GlucoseView 확인
```
https://glucoseview.co.kr
→ Care Dashboard → patientMessage 표시 여부
```

---

*Generated: 2026-03-09*
*Updated: 2026-03-09T01:56Z (GEMINI_API_KEY 등록 + 재배포 완료)*
*Status: READY — 첫 AI 실행 대기*
*Next Action: GlycoPharm에서 환자 분석 실행 → AI 생성 확인*
