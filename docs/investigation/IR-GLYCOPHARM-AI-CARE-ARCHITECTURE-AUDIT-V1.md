# IR-GLYCOPHARM-AI-CARE-ARCHITECTURE-AUDIT-V1

> GlycoPharm AI Care 구조 조사 보고서
> 조사일: 2026-03-15
> 상태: Complete

---

## 1. 시스템 구조

### 1.1 전체 아키텍처

```
┌─────────────────────┐     ┌─────────────────────┐
│   GlucoseView       │     │   GlycoPharm        │
│   (환자 앱)          │     │   (약사 앱)          │
│                     │     │                     │
│  · 혈당 자가입력     │     │  · 환자 목록/관리    │
│  · AI 인사이트       │     │  · KPI 대시보드      │
│  · 코칭 확인         │     │  · AI 분석/코칭      │
│  · 약국 연결         │     │  · 코칭 작성/승인    │
│  · 상담 예약         │     │  · 예약 관리         │
└────────┬────────────┘     └────────┬────────────┘
         │                           │
         │  credentials: 'include'   │  Bearer + Cookie
         │                           │
         └───────────┬───────────────┘
                     ↓
         ┌───────────────────────┐
         │    o4o-core-api       │
         │    /api/v1/care/*     │
         │                       │
         │  · 환자 전용 API       │  authenticate only
         │  · 약사 전용 API       │  authenticate + pharmacyContext
         │  · AI 서비스           │  Gemini Flash 2.0
         │  · 공유 DB             │  health_readings 등
         └───────────────────────┘
```

### 1.2 핵심 발견

| 항목 | 상태 | 설명 |
|------|------|------|
| **단일 API 서버** | 확인 | GlucoseView와 GlycoPharm 모두 `o4o-core-api` 사용 |
| **단일 DB** | 확인 | `o4o_platform` DB 공유, 테이블 레벨 격리 |
| **patient_id = user.id** | 확인 | `users.id`가 모든 care 테이블의 `patient_id` |
| **약국 스코프 격리** | 확인 | `pharmacy_id`(= `organization_id`)로 약국별 데이터 분리 |

---

## 2. Care 데이터 구조

### 2.1 엔티티 목록 (11개)

| # | 테이블명 | 엔티티 | 용도 | 상태 |
|---|---------|--------|------|------|
| 1 | `health_readings` | HealthReading | 혈당/BP/체중 측정값 | ✅ 운영중 |
| 2 | `care_kpi_snapshots` | CareKpiSnapshot | TIR/CV/위험도 스냅샷 | ✅ 운영중 |
| 3 | `care_coaching_sessions` | CareCoachingSession | 약사 코칭 세션 | ✅ 운영중 |
| 4 | `care_coaching_drafts` | CareCoachingDraft | AI 생성 코칭 초안 | ✅ 운영중 |
| 5 | `care_llm_insights` | CareLlmInsight | 약사용 AI 분석 결과 | ✅ 운영중 |
| 6 | `patient_ai_insights` | PatientAiInsight | 환자용 AI 인사이트 | ✅ 운영중 |
| 7 | `care_alerts` | CareAlert | 자동 알림 (고/저혈당) | ✅ 운영중 |
| 8 | `care_pharmacy_link_requests` | CarePharmacyLinkRequest | 환자↔약국 연결 요청 | ✅ 운영중 |
| 9 | `care_appointments` | CareAppointment | 상담 예약 | ✅ 운영중 |
| 10 | `ai_model_settings` | AiModelSetting | AI 모델 설정 | ✅ 운영중 |
| 11 | `patient_health_profiles` | PatientHealthProfile | 환자 건강 프로필 | ⚠️ 마이그레이션 없음 |

### 2.2 ERD (핵심 관계)

```
users (Identity)
  │
  ├──→ health_readings (1:N)
  │      ├─ patient_id = user.id
  │      ├─ pharmacy_id = organization.id (nullable)
  │      └─ source_type: 'patient_self' | 'manual'
  │
  ├──→ care_kpi_snapshots (1:N)
  │      ├─ patient_id + pharmacy_id (복합 스코프)
  │      └─ tir, cv, risk_level, metadata(JSONB)
  │            │
  │            ├──→ care_llm_insights (1:1 per snapshot)
  │            │      └─ pharmacy_insight + patient_message
  │            │
  │            ├──→ care_coaching_drafts (1:1 per snapshot)
  │            │      └─ draft_message, status
  │            │
  │            └──→ care_coaching_sessions (1:N)
  │                   └─ summary + action_plan
  │
  ├──→ patient_ai_insights (1:N, 24h 캐시)
  │      └─ summary + warning + tip
  │
  ├──→ care_pharmacy_link_requests (1:N)
  │      └─ pending → approved → glucoseview_customers 생성
  │
  ├──→ care_appointments (1:N)
  │      └─ requested → confirmed → completed
  │
  └──→ care_alerts (1:N)
         └─ open → acknowledged → resolved

organizations (Pharmacy)
  └──→ 위 모든 테이블의 pharmacy_id FK
```

### 2.3 데이터 격리 정책

| 패턴 | 설명 |
|------|------|
| **pharmacy_id NOT NULL** | KPI, Coaching, LLM Insight, Draft, Alert — 약국 스코프 필수 |
| **pharmacy_id NULLABLE** | health_readings — 환자 자가입력(`patient_self`)은 null |
| **pharmacy_id 없음** | patient_ai_insights — 환자 전용, 약국 스코프 불필요 |

---

## 3. API 구조

### 3.1 환자 전용 API (authenticate only)

| Method | Path | 용도 |
|--------|------|------|
| GET | `/patient-profile/me` | 내 건강 프로필 |
| POST/PUT | `/patient-profile` | 프로필 생성/수정 |
| POST | `/patient/health-readings` | 혈당 자가입력 |
| GET | `/patient/health-readings` | 내 기록 조회 |
| GET | `/patient/coaching` | 내 코칭 확인 |
| GET | `/patient/ai-insight` | AI 인사이트 (on-demand) |
| GET | `/pharmacy-link/pharmacies` | 약국 목록 |
| GET | `/pharmacy-link/my-status` | 연결 상태 확인 |
| POST | `/pharmacy-link/request` | 약국 연결 요청 |
| GET | `/appointments/my` | 내 예약 목록 |
| POST | `/appointments` | 예약 생성 |
| DELETE | `/appointments/:id` | 예약 취소 |

### 3.2 약사 전용 API (authenticate + pharmacyContext)

| Method | Path | 용도 |
|--------|------|------|
| GET | `/dashboard` | 대시보드 KPI 요약 |
| GET | `/risk-patients` | 위험 환자 감지 |
| GET | `/priority-patients` | 우선순위 환자 |
| GET | `/population-dashboard` | 인구통계 대시보드 |
| GET | `/today-priority` | 오늘의 우선 환자 |
| GET | `/alerts` | 활성 알림 |
| PATCH | `/alerts/:id/ack` | 알림 확인 |
| PATCH | `/alerts/:id/resolve` | 알림 해결 |
| GET | `/analysis/:patientId` | 환자 분석 (KPI + AI 트리거) |
| GET | `/kpi/:patientId` | KPI 비교 |
| POST | `/health-readings` | 약사 혈당 입력 |
| GET | `/health-readings/:patientId` | 환자 기록 조회 |
| GET | `/llm-insight/:patientId` | AI 분석 결과 |
| POST | `/coaching` | 코칭 세션 생성 |
| GET | `/coaching/:patientId` | 코칭 이력 |
| GET | `/coaching-drafts/:patientId` | AI 코칭 초안 |
| POST | `/coaching-drafts/:id/approve` | 초안 승인 |
| POST | `/coaching-drafts/:id/discard` | 초안 폐기 |
| GET | `/pharmacy-link/requests` | 연결 요청 목록 |
| POST | `/pharmacy-link/approve` | 연결 승인 |
| POST | `/pharmacy-link/reject` | 연결 거절 |
| GET | `/appointments/pharmacy` | 약국 예약 목록 |
| PATCH | `/appointments/:id/confirm` | 예약 확인 |
| PATCH | `/appointments/:id/reject` | 예약 거절 |
| PATCH | `/appointments/:id/complete` | 예약 완료 |

### 3.3 관리자/진단 API

| Method | Path | 용도 |
|--------|------|------|
| GET | `/llm-insight/health` | AI 인프라 상태 (Public) |
| GET | `/api/ai/admin/ops/care-status` | Care AI 상태 (Admin) |
| GET | `/api/ai/admin/ops/summary` | AI 전체 요약 (Admin) |

---

## 4. AI 기능 구현 상태

### 4.1 판정: **AI 기능 완성** (3개 서비스 운영중)

| # | 서비스 | 트리거 | 입력 | 출력 | 캐시 | 대상 |
|---|--------|--------|------|------|------|------|
| 1 | **CareLlmInsightService** | KPI 분석 완료 시 (fire-and-forget) | Snapshot + 다중지표 | pharmacyInsight + patientMessage | Snapshot 기반 (영구) | 약사 |
| 2 | **CareCoachingDraftService** | KPI 분석 완료 시 (fire-and-forget) | Snapshot + 다중지표 | draftMessage | Snapshot 기반 (영구) | 약사 (승인 후 환자) |
| 3 | **PatientAiInsightService** | 환자 요청 시 (on-demand) | 14일 혈당 데이터 | summary + warning + tip | 24시간 | 환자 |

### 4.2 AI 인프라

```
┌─────────────────────────────────────────────┐
│  packages/ai-core (Frozen Baseline)         │
│                                             │
│  GeminiProvider                             │
│   · Model: gemini-2.0-flash                │
│   · API: generativelanguage.googleapis.com  │
│   · Timeout: 10초                           │
│   · Response: JSON only                     │
│                                             │
│  Orchestrator (미사용 — 직접 Provider 호출)   │
│   · Context Builder                         │
│   · Prompt Composer                         │
│   · Response Normalizer                     │
│   · Action Mapper                           │
└─────────────────────────────────────────────┘

API Key 해상도:
  1. ai_settings 테이블 (provider='gemini', isactive=true)
  2. GEMINI_API_KEY 환경변수
  3. GOOGLE_AI_API_KEY 환경변수
  4. 없으면 → 조용히 skip (에러 없음)

모델 설정:
  ai_model_settings (service='care')
  · model: gemini-2.0-flash
  · temperature: 0.3
  · max_tokens: 2048
```

### 4.3 AI 파이프라인 흐름

```
[약사] GET /analysis/:patientId
  ↓
  1. health_readings 조회 (pharmacy_id 스코프)
  2. KPI 계산 (TIR, CV, risk)
  3. care_kpi_snapshots 저장
  4. 병렬 fire-and-forget:
     ├─ CareLlmInsightService.generateAndCache()
     │   → Gemini 호출 → care_llm_insights 저장
     ├─ CareCoachingDraftService.generateAndCache()
     │   → Gemini 호출 → care_coaching_drafts 저장
     └─ CareAlertService.evaluateAndCreate()
         → 규칙 기반 → care_alerts 저장
  5. 분석 결과 즉시 반환 (AI 완료 안 기다림)

[환자] GET /patient/ai-insight
  ↓
  1. 24시간 캐시 확인
  2. 캐시 없으면:
     · health_readings 14일 조회 (pharmacy_id 무관)
     · 3건 미만 → { summary: null }
     · 통계 계산 → Gemini 호출 → patient_ai_insights 저장
  3. 결과 반환
```

### 4.4 프롬프트 규칙 (공통)

```
✅ 관찰된 패턴 설명
✅ "~경향이 관찰됩니다" 형태
✅ 격려하는 톤
✅ 쉬운 한국어

❌ 의료적 진단 금지
❌ 치료 권고 금지
❌ 약품명 언급 금지
❌ 처방 금지
```

### 4.5 복원력 (Resilience)

| 패턴 | 설명 |
|------|------|
| Retry | 최대 2회, 2초 대기 |
| Non-retryable | API key 에러, INVALID_ARGUMENT → 즉시 중단 |
| Fire-and-forget | 분석 결과는 AI 완료 안 기다리고 반환 |
| Graceful degradation | AI 실패 → `{ summary: null }` 반환 (에러 없음) |
| 비용 제어 | Snapshot 기반 캐시 (중복 호출 방지), 24시간 환자 캐시 |

---

## 5. GlucoseView 연동 구조

### 5.1 판정: **완전 연동**

### 5.2 데이터 흐름

```
[GlucoseView 환자]                    [GlycoPharm 약사]

1. 약국 연결 요청                      2. 연결 승인
   POST /pharmacy-link/request            POST /pharmacy-link/approve
   → care_pharmacy_link_requests          → glucoseview_customers 생성

3. 혈당 자가입력                       4. 약사 혈당 입력
   POST /patient/health-readings          POST /health-readings
   → pharmacy_id = null                   → pharmacy_id = :pharmacyId

5. AI 인사이트 요청                    6. KPI 분석
   GET /patient/ai-insight                GET /analysis/:patientId
   → patient_ai_insights                  → care_kpi_snapshots
   → 14일 전체 혈당 기반                    → pharmacy_id 스코프 기반
                                           → AI 자동 생성 (LLM + Draft)

7. 코칭 확인                           8. 코칭 작성
   GET /patient/coaching                  POST /coaching or
   → 연결된 약국 코칭만 표시                 POST /coaching-drafts/:id/approve
```

### 5.3 데이터 공유 매트릭스

| 데이터 | GlucoseView 접근 | GlycoPharm 접근 | 공유 방식 |
|--------|-------------------|-----------------|-----------|
| `health_readings` | 본인 것 (patient_id=user.id) | 약국 스코프 (pharmacy_id) | DB 공유 |
| `patient_ai_insights` | 본인 것 | ❌ 접근 불가 | 환자 전용 |
| `care_llm_insights` | ❌ 접근 불가 | 약국 스코프 | 약사 전용 |
| `care_kpi_snapshots` | ❌ 접근 불가 | 약국 스코프 | 약사 전용 |
| `care_coaching_sessions` | 본인 코칭 (READ) | 약국 스코프 (WRITE) | 약사→환자 |
| `care_alerts` | ❌ 접근 불가 | 약국 스코프 | 약사 전용 |

### 5.4 핵심 격리 규칙

> **환자 자가입력 데이터(pharmacy_id=null)는 약사 Care API에서 직접 조회 불가.**
> 약사는 pharmacy_id가 자신의 약국인 데이터만 볼 수 있다.
>
> **그러나** PatientAiInsightService는 pharmacy_id 무관하게 환자의 전체 14일 혈당으로 인사이트를 생성한다.
> 이는 환자 전용 기능이므로 약사에게 노출되지 않는다.

---

## 6. 약사 UI 구조

### 6.1 Care Workspace (신규)

| 경로 | 페이지 | 기능 |
|------|--------|------|
| `/care` | CareDashboardPage | KPI 요약, 알림, 우선순위 환자, 인구통계 |
| `/care/patients` | PatientsPage | 환자 목록 (필터/정렬) |
| `/care/patients/:id` | PatientDetailPage | 환자 상세 (4탭) |
| `/care/patients/:id/` | DataTab | 혈당 입력 + 이력 |
| `/care/patients/:id/analysis` | AnalysisTab | TIR/CV/Risk 분석 + AI |
| `/care/patients/:id/coaching` | CoachingTab | AI 초안 + 수동 코칭 |
| `/care/patients/:id/history` | HistoryTab | 코칭 이력 |

### 6.2 약사 UI에서 AI 표시

| 화면 | AI 요소 | 설명 |
|------|---------|------|
| AnalysisTab | LLM Insight | `pharmacyInsight` — 약사용 전문 분석 |
| CoachingTab | Coaching Draft | AI 생성 코칭 초안, 편집/승인/폐기 가능 |
| CareDashboardPage | Alerts | 규칙 기반 자동 알림 (고/저혈당, TIR 하락) |

### 6.3 환자 UI에서 AI 표시

| 화면 | AI 요소 | 설명 |
|------|---------|------|
| PatientMainPage | AI 인사이트 카드 | summary + warning + tip (violet 카드) |
| DataAnalysisPage | AI 인사이트 카드 | 동일 데이터, Chart 아래 배치 |
| PharmacistCoachingPage | 코칭 기록 | 약사가 승인한 코칭 세션 표시 |

---

## 7. 문제점

### 7.1 데이터 격리 갭

| 문제 | 심각도 | 설명 |
|------|--------|------|
| **환자 자가입력 → 약사 미반영** | 중 | 환자가 GlucoseView에서 입력한 데이터(`pharmacy_id=null`)가 약사의 KPI 분석에 포함되지 않음. 약사는 자신이 입력한 데이터만 분석 가능 |
| **이중 AI 시스템** | 낮 | CareLlmInsight(약사용)과 PatientAiInsight(환자용)가 동일 데이터를 다른 방식으로 분석. 결과가 일치하지 않을 수 있음 |
| **PatientHealthProfile 미등록** | 중 | 엔티티 존재하나 마이그레이션 없음, connection.ts 미등록 |

### 7.2 AI 기능 제한

| 제한 | 설명 |
|------|------|
| **Orchestrator 미사용** | ai-core의 Orchestrator 파이프라인이 존재하나, Care 서비스들은 GeminiProvider를 직접 호출 |
| **Audit 미연결** | AI 호출 로그가 DB에 저장되지 않음 (콘솔 로그만) |
| **OpenAI 미구현** | Provider stub 존재하나 실제 구현 없음 |
| **일일 제한 없음** | 환자 AI 인사이트는 24시간 캐시로 제어하나, 약사 AI는 분석 호출 시마다 생성 |

### 7.3 구조적 이슈

| 이슈 | 설명 |
|------|------|
| **glucoseview_customers 레거시** | 환자-약국 연결이 `care_pharmacy_link_requests` + `glucoseview_customers` 이중 구조 |
| **코칭 조회 경로 복잡** | 환자 코칭 조회: user.email → glucoseview_customers.id → care_coaching_sessions (비정규화 부재) |

---

## 8. 개선 제안

### 8.1 단기 (즉시 가능)

| # | 제안 | 우선순위 |
|---|------|---------|
| 1 | `patient_health_profiles` 마이그레이션 생성 + connection.ts 등록 | 높음 |
| 2 | 환자 자가입력 데이터를 약사 분석에 포함하는 옵션 (data_sharing_consent 기반) | 높음 |
| 3 | AI audit 로그 DB 저장 연결 | 중 |

### 8.2 중기 (WO-GLYCOPHARM-AI-CARE-ENGINE-V1 범위)

| # | 제안 | 설명 |
|---|------|------|
| 1 | **약사 AI 대시보드** | 약사가 AI 분석 결과를 한 화면에서 관리 |
| 2 | **환자 데이터 통합 분석** | 자가입력 + 약사입력 통합 KPI (consent 기반) |
| 3 | **AI 코칭 자동 전달** | 승인된 코칭이 환자 GlucoseView에 자동 push |
| 4 | **다중 지표 환자 인사이트** | 현재 환자 AI는 혈당만 분석 → BP/체중/대사 추가 |

### 8.3 장기 (아키텍처)

| # | 제안 | 설명 |
|---|------|------|
| 1 | **Orchestrator 통합** | 직접 Provider 호출 → ai-core Orchestrator 파이프라인으로 통합 |
| 2 | **AI Provider 추상화** | Gemini 종속성 제거, 설정으로 Provider 교체 가능 |
| 3 | **환자-약국 연결 테이블 통합** | `glucoseview_customers` + `care_pharmacy_link_requests` → 단일 구조 |

---

## 9. 결론

### Care 시스템 구조: **완성도 높음**

- 11개 엔티티, 40+ API 엔드포인트, 완전한 CRUD
- 약국 스코프 격리 정책 일관 적용
- 워크플로 상태 머신 (연결 요청, 예약, 코칭 초안) 구현

### AI 기능: **기본 완성, 확장 가능**

- 3개 AI 서비스 운영중 (LLM Insight, Coaching Draft, Patient Insight)
- Gemini Flash 2.0 기반, 비용 효율적 (~$0.00008/요청)
- 캐시 전략 적용 (Snapshot 기반 + 24시간)
- 의료 규정 준수 프롬프트 (진단/처방 금지)

### GlucoseView 연동: **완전 연동**

- 동일 DB, 동일 API 서버
- patient_id = user.id (일관)
- 환자↔약국 연결 흐름 구현 (요청→승인→고객 레코드)
- 데이터 격리 정책 적용 (pharmacy_id 스코프)

### 다음 단계

이 조사 결과를 기반으로 **WO-GLYCOPHARM-AI-CARE-ENGINE-V1** 설계 시:
1. 환자 자가입력 데이터의 약사 분석 통합이 핵심 과제
2. AI Orchestrator 파이프라인 활용 검토
3. 환자 다중 지표 AI 인사이트 확장

---

*Created: 2026-03-15*
*Based on: Codebase analysis of apps/api-server/src/modules/care/, services/web-glycopharm/, services/web-glucoseview/, packages/ai-core/*
*Status: Complete*
