# IR-O4O-STORE-HUB-AI-SUMMARY-VERIFICATION-V1

> Store HUB AI 운영 검증 보고서
> 검증일: 2026-03-09
> 대상 WO: WO-O4O-STORE-HUB-AI-SUMMARY-V1

---

## 검증 요약

| # | 검증 항목 | 상태 | 비고 |
|---|----------|------|------|
| 1 | AI Provider 연결 | **PASS** | GEMINI_API_KEY 설정 완료, status=ready |
| 2 | Health Endpoint | **PASS** | geminiKeyConfigured=true, model=gemini-2.0-flash |
| 3 | Snapshot 생성 API | **PASS** (보안) | 인증 필요 — 401 AUTH_REQUIRED 정상 |
| 4 | AI Insight 생성 API | **PASS** (보안) | 인증 필요 — 401 AUTH_REQUIRED 정상 |
| 5 | DB 테이블 생성 | **PASS** | 마이그레이션 배포 완료 (Run #66233717378) |
| 6 | Retry 동작 | **PASS** (코드 분석) | MAX_ATTEMPTS=2, RETRY_DELAY_MS=2000 |
| 7 | UI 표시 | **PASS** (코드 분석) | LLM → rule-based fallback 정상 |
| 8 | Graceful Degradation | **PASS** (코드 분석) | AI 없이 기존 화면 정상 표시 |
| 9 | Auth 보호 | **PASS** | POST /snapshot, GET /summary 모두 인증 필수 |

### 최종 판정

```
Store HUB AI operational status: READY (awaiting first trigger)
GEMINI_API_KEY: CONFIGURED (env)
DB Tables: CREATED (migration deployed)
Code: ALL VERIFIED
```

---

## 1차 검증: AI Health Endpoint

### 검증 시각: 2026-03-09T03:04Z

```
GET https://api.neture.co.kr/api/v1/store-hub/ai/health
```

```json
{
  "success": true,
  "data": {
    "geminiKeyConfigured": true,
    "keySource": "env",
    "model": "gemini-2.0-flash",
    "totalInsights": 0,
    "lastInsightAt": null,
    "status": "ready"
  }
}
```

### 분석

| 항목 | 기대값 | 실제값 | 판정 |
|------|--------|--------|------|
| geminiKeyConfigured | true | **true** | **PASS** |
| keySource | env | **env** | **PASS** |
| model | gemini-2.0-flash | **gemini-2.0-flash** | **PASS** |
| totalInsights | 0 (첫 실행 전) | **0** | **PASS** |
| status | ready | **ready** | **PASS** |

---

## 2차 검증: API 인증 보호

### 인증 없이 호출

```
POST /api/v1/store-hub/ai/snapshot → 401 AUTH_REQUIRED
GET /api/v1/store-hub/ai/summary  → 401 AUTH_REQUIRED
GET /api/v1/store-hub/ai/health   → 200 (public)
```

Snapshot/Summary API는 `authenticate` + `requireStoreOwner` 미들웨어로 보호됨.
외부에서 인증 없이 접근 불가 — **정상 동작** (보안 설계대로).

---

## 3차 검증: DB 마이그레이션

### 배포 이력

```
2026-03-09T02:58:10Z  Migration: CreateStoreAiTables  ✅ 6m5s
  → store_ai_snapshots 테이블 생성
  → store_ai_insights 테이블 생성
  → 인덱스: org_id, snapshot_date, snapshot_id
  → UNIQUE: (organization_id, snapshot_date), snapshot_id
```

### 테이블 구조

#### store_ai_snapshots

| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | UUID PK | gen_random_uuid() |
| organization_id | UUID | NOT NULL, INDEX |
| snapshot_date | DATE | NOT NULL, INDEX |
| period_days | INT | DEFAULT 7 |
| data | JSONB | DEFAULT '{}' |
| created_at | TIMESTAMPTZ | DEFAULT now() |

UNIQUE: (organization_id, snapshot_date)

#### store_ai_insights

| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | UUID PK | gen_random_uuid() |
| snapshot_id | UUID | NOT NULL, UNIQUE, INDEX |
| organization_id | UUID | NOT NULL, INDEX |
| summary | TEXT | NOT NULL |
| issues | JSONB | DEFAULT '[]' |
| actions | JSONB | DEFAULT '[]' |
| model | VARCHAR(100) | NOT NULL |
| prompt_tokens | INT | DEFAULT 0 |
| completion_tokens | INT | DEFAULT 0 |
| created_at | TIMESTAMPTZ | DEFAULT now() |

---

## 4차 검증: 코드 경로 분석 — AI 실행 흐름

### Snapshot 생성 → LLM 인사이트 체인

```
POST /api/v1/store-hub/ai/snapshot
  → authenticate() + requireStoreOwner()
  → snapshotService.createOrRefreshSnapshot(organizationId, periodDays)
    → Dedup: findOne({ organizationId, snapshotDate: today })
    → 없으면: KPI 데이터 수집 (Promise.all 4개 병렬)
      → getOrderStats(): checkout_orders 집계
      → getQrStats(): store_qr_scan_events 집계
      → getProductStats(): organization_product_listings 집계
      → getChannelStats(): organization_channels 집계
    → store_ai_snapshots에 저장
  → HTTP 200 반환 (snapshot)

  → (fire-and-forget, 비동기)
     insightService.generateAndCache(snapshot, organizationId).catch(() => {})
       → Dedup: findOne({ snapshotId })
       → buildProviderConfig('store')
         → ai_model_settings 조회 (service='store') → fallback: gemini-2.0-flash
         → ai_settings 조회 (provider='gemini') → fallback: GEMINI_API_KEY env
       → gemini.complete(SYSTEM_PROMPT, userPrompt, config)
       → JSON.parse → { summary, issues, actions }
       → store_ai_insights에 저장
```

### System Prompt 분석

| 항목 | 구현 |
|------|------|
| 역할 | 매장 운영 데이터 설명 전문 도우미 |
| 금지 | 자동 실행, 판단 |
| 출력 형식 | JSON only (summary, issues, actions) |
| issues 구조 | type (revenue/engagement/product/channel), severity (high/medium/low) |
| actions 구조 | label, priority (high/medium/low), reason |
| 제한 | issues 0~5개, actions 0~5개 |
| 언어 | 한국어 |

**판정**: 시스템 프롬프트 **정상 설계** — 설명 전용, 판단/실행 금지.

---

## 5차 검증: Retry 동작 확인 (코드 분석)

### StoreAiInsightService.generateAndCache()

**파일**: `apps/api-server/src/modules/store-ai/services/store-ai-insight.service.ts`

| 항목 | 구현 | 판정 |
|------|------|------|
| 중복 방어 (dedup) | `findOne({ where: { snapshotId } })` → 있으면 skip | **PASS** |
| API Key 체크 | `!config.apiKey` → warn + return | **PASS** |
| 최대 시도 | `MAX_ATTEMPTS = 2` | **PASS** |
| 재시도 대기 | `RETRY_DELAY_MS = 2_000` (2초) | **PASS** |
| Non-retryable 분류 | `'not configured'`, `'INVALID_ARGUMENT'` → 즉시 return | **PASS** |
| Retryable 분류 | timeout, 5xx, network, JSON parse → 재시도 | **PASS** |
| 최종 실패 로그 | `snapshotId`, `organizationId`, `attempts`, `lastError` 포함 | **PASS** |
| Outer guard | 최외곽 try/catch → 예외 시 console.error만 | **PASS** |

### StoreAiSnapshotService.createOrRefreshSnapshot()

| 항목 | 구현 | 판정 |
|------|------|------|
| 일별 Dedup | `findOne({ organizationId, snapshotDate: today })` | **PASS** |
| 병렬 KPI 수집 | `Promise.all([orders, qr, products, channels])` | **PASS** |
| 개별 쿼리 에러 처리 | 각 쿼리 try/catch → 0값 fallback | **PASS** |
| Parameterized SQL | `$1`, `$2` 바인딩 사용 | **PASS** |

**판정**: Retry/Dedup/Error handling **정상 구현** 확인.

---

## 6차 검증: UI 확인 (코드 분석)

### GlycoPharm StoreMainPage

**파일**: `services/web-glycopharm/src/pages/pharmacy/StoreMainPage.tsx`

| 항목 | 구현 | 판정 |
|------|------|------|
| LLM 요약 조회 | `GET /api/v1/store-hub/ai/summary` (병렬, 비차단) | **PASS** |
| LLM 표시 필드 | summary + issues + actions | **PASS** |
| AI 배지 | `AI` 라벨 (llmSummary 있을 때) | **PASS** |
| Issues 색상 | high=red, medium=amber, low=blue | **PASS** |
| Actions 스타일 | high=primary, other=slate | **PASS** |
| 모델/시각 표시 | model + createdAt | **PASS** |
| "AI 분석 요청" 버튼 | POST /snapshot → GET /summary 체인 | **PASS** |
| 로딩 상태 | Spinner (Loader2) | **PASS** |

### Graceful Degradation

| 상태 | 동작 | 판정 |
|------|------|------|
| LLM 있음 | LLM summary/issues/actions 표시 | **PASS** |
| LLM 없음 + rule-based 있음 | rule-based 요약 + suggestions 표시 | **PASS** |
| 둘 다 없음 | Block 5 숨겨짐 (조건부 렌더링) | **PASS** |
| LLM 로딩 실패 | `.catch(() => {})` → rule-based fallback 유지 | **PASS** |

**판정**: UI **정상 구현** 확인. AI 데이터 생성 시 자동 표시.

---

## 7차 검증: 서버 상태

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
  "database": "healthy (v15.15, 8 connections)",
  "system": "healthy (memory 25%, CPU 90%, 2 cores)",
  "node": "v22.22.1"
}
```

### 배포 이력

```
2026-03-09T02:58:10Z  Migration: Store AI tables         ✅ 6m5s
2026-03-09T02:49:01Z  fix: platform_store_slug_history    ✅
2026-03-09T02:44:53Z  feat: Store HUB AI Summary          ✅
```

---

## 검증 결과 종합

### 코드 레벨 검증 (Claude Code 직접 확인)

| 항목 | 판정 | 근거 |
|------|------|------|
| Health endpoint | **PASS** | status=ready, keySource=env |
| GEMINI_API_KEY 연결 | **PASS** | geminiKeyConfigured=true |
| DB 마이그레이션 | **PASS** | 테이블 생성 완료, 인덱스 설정 |
| Retry 로직 | **PASS** | 2회 시도, 2초 대기, 에러 분류 |
| 중복 방어 | **PASS** | snapshotId dedup + 일별 dedup |
| Fire-and-forget 패턴 | **PASS** | insightService.generateAndCache().catch() |
| KPI 수집 | **PASS** | 4개 병렬 쿼리, 개별 fallback |
| Auth 보호 | **PASS** | 401 AUTH_REQUIRED (인증 보호) |
| UI LLM 통합 | **PASS** | summary/issues/actions 3-block 표시 |
| UI Graceful Degradation | **PASS** | LLM → rule-based → hidden |
| ESM Entity 규칙 | **PASS** | import type + UUID 컬럼만 사용 |
| System Prompt | **PASS** | 설명 전용, 판단/실행 금지 |

### 운영 레벨 검증 (실제 API 호출)

| 항목 | 판정 | 근거 |
|------|------|------|
| GEMINI_API_KEY 설정 | **PASS** | keySource=env, status=ready |
| DB 테이블 존재 | **PASS** | 마이그레이션 정상 실행 (health에서 count 쿼리 성공) |
| AI 생성 (snapshot) | **PENDING** | 인증된 매장 소유자 접근 필요 |
| AI 생성 (insight) | **PENDING** | 스냅샷 생성 후 자동 트리거 |
| UI 실제 표시 | **PENDING** | GlycoPharm 로그인 후 확인 필요 |

---

## 발견된 문제

### 해결 완료

| # | 문제 | 조치 | 상태 |
|---|------|------|------|
| 1 | DB 마이그레이션 누락 | `20260309120000-CreateStoreAiTables.ts` 생성 + 배포 | **해결** |
| 2 | Cloud Run cold start 지연 | 배포 후 ~90초 후 라우트 등록 완료 | **정상 동작** |

### 개선 필요 사항

없음. 현재 구현은 설계대로 정상 작동.

---

## 다음 단계: 수동 검증 절차

대표님이 직접 확인해야 할 항목:

### Step 1: GlycoPharm 로그인
```
https://glycopharm.co.kr
→ 약국(매장 소유자) 계정으로 로그인
```

### Step 2: Store 메인 이동
```
메뉴 → 매장 관리
→ StoreMainPage 진입
```

### Step 3: AI 요약 확인 (rule-based)
```
Block 5: AI 매장 요약
→ rule-based 요약이 표시되는지 확인
→ suggestions 칩이 표시되는지 확인
```

### Step 4: AI 분석 요청
```
"AI 분석 요청" 버튼 클릭
→ 로딩 스피너 표시
→ 10~30초 대기
→ 페이지 새로고침
```

### Step 5: LLM AI 요약 확인
```
Block 5 → AI 배지 표시 확인
→ summary 텍스트 (한국어 1~3문장)
→ issues 리스트 (severity별 색상)
→ actions 칩 (priority별 강조)
→ model + 생성 시각 표시
```

### Step 6: Health 재확인
```
GET https://api.neture.co.kr/api/v1/store-hub/ai/health
→ totalInsights > 0
→ lastInsightAt ≠ null
```

---

*Generated: 2026-03-09*
*Updated: 2026-03-09T03:04Z (마이그레이션 배포 완료)*
*Status: READY — 첫 AI 실행 대기*
*Next Action: GlycoPharm에서 매장 소유자 로그인 → AI 분석 요청 → AI 요약 확인*
