# IR-O4O-CARE-EXTENSION-CAPABILITY-AUDIT

> **Status**: Complete
> **Date**: 2026-03-06
> **Scope**: Care Extension 가능 구조 조사 (READ-ONLY)
> **Purpose**: 현재 코드에서 Care Extension 구현 수준 파악

---

## 1. 핵심 결론

**Care Extension의 ~70%는 이미 존재한다.**

| 영역 | 존재 여부 | 상세 |
|------|:---------:|------|
| Care Core (domain/services/controllers) | **100%** | 완성, Frozen |
| Patient 모델 | **100%** | `glucoseview_customers` + CRUD API |
| Analysis Engine (TIR/CV/Risk) | **100%** | 순수 함수, 동작 중 |
| KPI Snapshot 영속화 | **100%** | auto-snapshot 포함 |
| Coaching Session API | **100%** | CRUD 완비 |
| Dashboard 집계 | **100%** | pharmacy-scoped, admin global |
| Provider 패턴 (CgmProvider) | **100%** | 인터페이스 + Mock 구현 |
| LLM Integration | **50%** | 패키지 존재, 규칙 기반 (실제 LLM 호출 없음) |
| GlycoPharm Care UI | **60%** | Dashboard/환자목록 live, 코칭/분석 탭 mock/placeholder |
| GlucoseView Care UI | **70%** | InsightsPage 완전 live, 나머지 부분 live |
| **Glucose 데이터 입력** | **0%** | **전무. Mock만 존재. 실데이터 경로 없음** |

---

## 2. 이미 존재하는 기능

### 2.1 Backend — 완성된 것

| 기능 | 위치 | 상태 |
|------|------|:----:|
| CgmProvider 인터페이스 | `domain/provider/cgm.provider.ts` | DONE |
| MockCgmProvider | `infrastructure/provider/mock-cgm.provider.ts` | DONE |
| AnalysisProvider 인터페이스 | `domain/analysis/analysis.provider.ts` | DONE |
| DefaultAnalysisProvider (규칙 기반) | `domain/analysis/analysis.provider.ts` | DONE |
| AiInsightProvider (규칙 기반, LLM 아님) | `infrastructure/provider/ai-analysis.provider.ts` | DONE |
| Analysis Engine (TIR/CV/Risk) | `domain/analysis/analysis.engine.ts` | DONE |
| CareKpiSnapshotService | `services/kpi/care-kpi-snapshot.service.ts` | DONE |
| CareCoachingSessionService | `services/coaching/care-coaching-session.service.ts` | DONE |
| PharmacyContextMiddleware | `care-pharmacy-context.middleware.ts` | DONE |
| Care Analysis API | `GET /api/v1/care/analysis/:patientId` | DONE |
| Care KPI API | `GET /api/v1/care/kpi/:patientId` | DONE |
| Care Coaching API | `POST/GET /api/v1/care/coaching` | DONE |
| Care Dashboard API | `GET /api/v1/care/dashboard` | DONE |
| Care Diagnostic API | `GET /api/v1/ops/care-diagnostic` | DONE |
| Patient CRUD API | `glucoseview/customers` CRUD 5개 | DONE |

### 2.2 Frontend — GlycoPharm (약국 운영)

| 페이지 | 상태 | API 연동 | Mock |
|--------|:----:|:--------:|:----:|
| CareDashboardPage | **LIVE** | dashboard + customers | 없음 |
| PatientsPage | **LIVE** | dashboard + customers | 없음 |
| PatientDetailPage | **LIVE** | customer detail + dashboard | Quick Stats `--` |
| SummaryTab | **LIVE** | context에서 읽음 | 없음 |
| AnalysisTab | PLACEHOLDER | 미연동 | 전체 `--` |
| CoachingTab | **MOCK** | 미연동 | `MOCK_SESSIONS` 3건 |
| HistoryTab | 부분 LIVE | snapshot live, coaching mock | `MOCK_COACHING_EVENTS` |
| AnalysisPage (top-level) | PLACEHOLDER | 미연동 | 없음 |
| CoachingPage (top-level) | PLACEHOLDER | 미연동 | 없음 |

**GlycoPharm pharmacyApi 클라이언트**: `/api/v1/care/*` 중 dashboard만 호출. analysis/kpi/coaching 메서드 미정의.

### 2.3 Frontend — GlucoseView (환자 서비스)

| 페이지 | 상태 | API 연동 | Mock |
|--------|:----:|:--------:|:----:|
| CareDashboardPage | **LIVE** | dashboard + customers | 없음 |
| PatientsPage | **LIVE** | customer CRUD | 약사 조언 텍스트, PlaceholderChart |
| **InsightsPage** | **FULLY LIVE** | analysis + kpi + coaching CRUD | **없음** |

**GlucoseView api 클라이언트**: Care API 5개 메서드 모두 정의 + InsightsPage에서 전부 사용.

---

## 3. 존재하지 않는 것 (새로 개발 필요)

### 3.1 Glucose 데이터 입력 — 가장 큰 Gap

**현재 상태**: glucose 데이터 입력 경로가 전혀 없음.

| 항목 | 상태 |
|------|------|
| `glucose_readings` 테이블 | 없음 |
| Manual glucose entry API | 없음 |
| CGM device data upload API | 없음 |
| BGM file import API | 없음 |
| Manual glucose entry UI | 없음 |
| CGM vendor integration | 주석 처리된 placeholder만 존재 |

`MockCgmProvider`가 `patientId` hash 기반으로 매 요청마다 합성 데이터를 생성.
KPI만 `care_kpi_snapshots`에 영속화되고, 원시 glucose 데이터는 어디에도 저장되지 않음.

### 3.2 LLM 실제 연동

`@o4o/pharmacy-ai-insight` 패키지는 **LLM 호출 없는 순수 규칙 엔진**:
- OpenAI/Claude API 호출 없음
- LLM API 키 참조 없음
- 3-5개 InsightCard를 규칙 기반으로 생성
- `AiInsightProvider`는 `glucoseSummary`를 넘기지도 않음 (patientId만 pharmacyId로 전달)

### 3.3 GlycoPharm Care API 클라이언트 갭

GlycoPharm `pharmacyApi`에 다음 메서드 미정의:
- `getCareAnalysis(patientId)` — 없음
- `getCareKpi(patientId)` — 없음
- `createCoachingSession(data)` — 없음
- `getCoachingSessions(patientId)` — 없음

### 3.4 GlycoPharm UI 미연동

| 컴포넌트 | 필요한 연동 |
|----------|------------|
| AnalysisTab | `getCareAnalysis` → TIR/CV/Risk 표시 |
| CoachingTab | `getCoachingSessions` + `createCoachingSession` → mock 제거 |
| HistoryTab | `getCoachingSessions` → mock coaching events 제거 |
| AnalysisPage | 전체 구현 또는 제거 |
| CoachingPage | 전체 구현 또는 제거 |

---

## 4. Data Source 현황

### 4.1 Patient Data

| 소스 | 테이블 | 접근 경로 |
|------|--------|----------|
| GlycoPharm | `glucoseview_customers` | `GET /api/v1/glycopharm/pharmacy/customers` (organization_id scope) |
| GlucoseView | `glucoseview_customers` | `GET /api/v1/glucoseview/customers` (pharmacist_id scope) |
| Care Core | `glucoseview_customers` | `care-dashboard.controller` 직접 SQL (organization_id scope) |

동일 테이블, 3가지 접근 경로, 약간 다른 scoping.

### 4.2 Glucose Data

```
현재: MockCgmProvider → 합성 데이터 (매 요청 계산, 비영속)
       ↓
     analyzeReadings() → AnalysisResult (tir, cv, riskLevel)
       ↓
     care_kpi_snapshots (영속화)
```

**glucose_readings 테이블 없음. 원시 데이터 저장 없음.**

### 4.3 GlucoseView 인프라 (vendor/connection)

GlucoseView 라우트에 CGM vendor 관리 구조가 이미 존재:

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /admin/vendors` | CGM 벤더 목록 |
| `POST /admin/vendors` | 벤더 등록 |
| `PATCH /admin/vendors/:id/status` | 벤더 상태 변경 |
| `GET /admin/view-profiles` | 뷰 프로파일 목록 |
| `POST /admin/view-profiles` | 뷰 프로파일 생성 |
| `GET /admin/connections` | 약국-벤더 연결 목록 |
| `POST /admin/connections` | 연결 생성 |
| `PATCH /admin/connections/:id/status` | 연결 상태 변경 |

**Vendor/Connection 인프라는 존재하지만 실제 CGM 데이터 수신 로직은 없음.**

---

## 5. Analysis Engine 확장 가능성

### 5.1 현재 지표

| 지표 | 계산 | 범위 |
|------|------|------|
| TIR | 70-180 mg/dL 범위 내 비율 | 0-100% |
| CV | (stddev / mean) × 100 | 0-100% |
| Risk Level | TIR ≥ 70 → low, 50-69 → moderate, <50 → high | 3단계 |

### 5.2 확장 구조

```
CgmProvider (인터페이스) → 새 구현체 추가 가능
  ↓
analyzeReadings() (순수 함수) → 새 지표 추가 가능 (GMI, TAR, TBR 등)
  ↓
AnalysisProvider (인터페이스) → 새 Provider 추가 가능
  ↓
CareInsightDto → insights[] 확장 가능
```

**확장 시 변경 필요 파일**: `analysis.engine.ts` (지표 추가), `cgm.provider.ts` (필요 시 인터페이스 확장)

---

## 6. 최종 답변: 새로 개발해야 하는 것 vs 이미 존재하는 것

### 이미 존재 (재사용 가능)

1. Care Core 전체 (domain + services + controllers + entities)
2. Patient CRUD (glucoseview_customers + 3가지 API 경로)
3. Analysis Engine + Provider 패턴
4. KPI Snapshot 자동 기록
5. Coaching Session CRUD
6. Dashboard 집계
7. PharmacyContextMiddleware
8. CGM Vendor/Connection 관리 인프라 (GlucoseView admin)
9. GlycoPharm Care Dashboard/환자목록 UI
10. GlucoseView InsightsPage (완전 live)

### 새로 개발 필요

1. **Glucose 데이터 입력 경로** (가장 큰 Gap)
   - `glucose_readings` 테이블 설계
   - Manual entry API
   - 또는 CGM vendor webhook/import API
   - 입력 UI (manual entry form)
2. **Real CgmProvider 구현** (VendorCgmProvider)
   - DB에서 실제 glucose readings 조회
3. **LLM 실제 연동** (선택적)
   - `AiInsightService`에 실제 LLM API 호출 추가
   - `glucoseSummary` 데이터 전달
4. **GlycoPharm pharmacyApi 확장**
   - getCareAnalysis, getCareKpi, coaching 메서드 추가
5. **GlycoPharm Care UI Mock → API 전환**
   - AnalysisTab: mock → getCareAnalysis
   - CoachingTab: MOCK_SESSIONS → getCoachingSessions + createCoachingSession
   - HistoryTab: MOCK_COACHING_EVENTS → getCoachingSessions

---

*Generated: 2026-03-06*
*Classification: Internal / Architecture Audit*
