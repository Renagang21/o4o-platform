# IR-O4O-GLYCOPHARM-BASIC-FUNCTION-AUDIT-V1

> **GlycoPharm 혈당관리 서비스 기본 기능 감사 보고서**
>
> 작성일: 2026-03-21
> 범위: 환자용 기능(혈당/투약/운동/증상), 약사용 기능(환자 조회/기록 조회/연결), 코드 구조 매핑
> 목적: 현재 혈당관리 서비스의 기본 기능이 어디까지 살아 있고, 어디가 끊겨 있는지 정확히 조사

---

## 1. 조사 요약 (Executive Summary)

**핵심 발견**: 환자 측 4개 입력 기능(혈당/투약/운동/증상)은 **모두 동작**하지만, 약사 측에서는 **혈당만 조회 가능**하고 투약/운동/증상 데이터는 DB에 존재하나 **약사 화면에 표시되지 않음**.

| 구분 | 상태 |
|------|------|
| 환자 입력 (4종) | ✅ 전체 동작 |
| 환자 조회/분석 | ✅ 전체 동작 |
| 약사 환자 목록 | ✅ 동작 |
| 약사 혈당 조회 | ✅ 동작 |
| 약사 투약/운동/증상 조회 | ❌ 화면 없음 (데이터는 DB에 존재) |
| 코칭 세션 | ✅ 동작 (AI 초안 생성 포함) |
| 약국-환자 연결 | ✅ 요청/승인 동작 |

**아키텍처 특이사항**: 4개 데이터 타입(혈당, 투약, 운동, 증상)이 **단일 health_readings 테이블의 metadata JSONB 필드**에 통합 저장됨. 별도 테이블/엔드포인트 없음.

---

## 2. 기능별 상태표

### 2.1 환자용 기능

| # | 기능명 | 환자 화면 | 저장 API | DB 저장 | 조회 반영 | 약사 화면 반영 | 최종 상태 |
|---|--------|:---------:|:--------:|:-------:|:---------:|:--------------:|:---------:|
| 1 | **혈당 입력** | ✅ `GlucoseInputPage.tsx` | ✅ `POST /care/patient/health-readings` | ✅ `health_readings` table | ✅ 환자 대시보드 + 분석 | ✅ `PharmacistPatientDetailPage` | **완전 동작** |
| 2 | **투약 입력** | ✅ GlucoseInputPage 내 접이식 섹션 | ✅ 동일 API (metadata) | ✅ `health_readings.metadata` JSONB | ✅ 환자 측 조회 가능 | ❌ 약사 화면 미구현 | **부분 동작** |
| 3 | **운동 입력** | ✅ GlucoseInputPage 내 접이식 섹션 | ✅ 동일 API (metadata) | ✅ `health_readings.metadata` JSONB | ✅ 환자 측 조회 가능 | ❌ 약사 화면 미구현 | **부분 동작** |
| 4 | **증상 입력** | ✅ GlucoseInputPage 내 접이식 섹션 | ✅ 동일 API (metadata) | ✅ `health_readings.metadata` JSONB | ✅ 환자 측 조회 가능 | ❌ 약사 화면 미구현 | **부분 동작** |

### 2.2 환자 기본 흐름

| # | 흐름 단계 | 상태 | 비고 |
|---|----------|:----:|------|
| 1 | 로그인 | ✅ | `AuthContext` → `POST /auth/login` (localStorage 전략) |
| 2 | 환자 대시보드 진입 | ✅ | `PatientDashboardPage.tsx` — 7개 메뉴 항목 |
| 3 | 혈당 입력 폼 렌더링 | ✅ | 혈당값 + 측정시기 + 식사 타이밍 + 메모 |
| 4 | 투약/운동/증상 입력 | ✅ | 접이식(Collapsible) 섹션, 선택적 입력 |
| 5 | 저장 → API 호출 | ✅ | `POST /care/patient/health-readings` |
| 6 | 저장 성공 피드백 | ✅ | 토스트 메시지 + 입력 폼 초기화 |
| 7 | 기록 조회 (목록) | ✅ | `GlucoseHistoryPage.tsx` — 날짜별 그룹핑 |
| 8 | 데이터 분석 | ✅ | `GlucoseAnalysisPage.tsx` — TIR, 변동성, 트렌드 차트 |
| 9 | 프로필 관리 | ✅ | `PatientProfilePage.tsx` — 생성/수정 |

### 2.3 약사용 기능

| # | 기능명 | 화면 | API 연결 | 데이터 표시 | 최종 상태 |
|---|--------|:----:|:--------:|:----------:|:---------:|
| 1 | **환자 목록 조회** | ✅ `PharmacistPatientsPage.tsx` | ✅ `getCustomers()` | ✅ 이름, 위험도, 마지막 측정 | **동작** |
| 2 | **환자 상세 — 혈당** | ✅ `PharmacistPatientDetailPage.tsx` | ✅ `getHealthReadings()` | ✅ 혈당 차트 + 목록 | **동작** |
| 3 | **환자 상세 — 투약** | ❌ 전용 화면 없음 | ⚠️ API 응답 metadata에 포함 | ❌ 미표시 | **미구현** |
| 4 | **환자 상세 — 운동** | ❌ 전용 화면 없음 | ⚠️ API 응답 metadata에 포함 | ❌ 미표시 | **미구현** |
| 5 | **환자 상세 — 증상** | ❌ 전용 화면 없음 | ⚠️ API 응답 metadata에 포함 | ❌ 미표시 | **미구현** |
| 6 | **코칭 세션** | ✅ `PharmacistCoachingPage.tsx` | ✅ `getCoachingSessions()` | ✅ AI 초안 + 수정 + 발송 | **동작** |
| 7 | **예약 관리** | ✅ `AppointmentsPage.tsx` | ✅ `getAppointments()` | ✅ 예약 목록 + 상태 | **동작** |
| 8 | **환자 연결 요청** | ✅ `PatientRequestsPage.tsx` | ✅ `getLinkRequests()` | ✅ 승인/거절 | **동작** |
| 9 | **Care 워크스페이스** | ✅ `CareWorkspacePage.tsx` | ✅ 4탭 구조 | ✅ 대시보드/환자/코칭/알림 | **동작** |

---

## 3. 끊긴 지점 상세

### 3.1 데이터 흐름 단절 지점

```
[환자 입력] → [API 저장] → [DB] → [API 조회] → [약사 화면]
                                                    ↑
                                              여기서 끊김
                                       (투약/운동/증상 metadata)
```

**단절 상세:**

| 데이터 | 환자→DB | DB 저장 위치 | 약사 API 응답 | 약사 화면 | 단절 지점 |
|--------|:------:|-------------|:------------:|:---------:|----------|
| 혈당 | ✅ | `health_readings.reading_value` | ✅ 직접 필드 | ✅ 차트+목록 | — |
| 투약 | ✅ | `health_readings.metadata.medications[]` | ✅ metadata에 포함 | ❌ | **화면 렌더링 누락** |
| 운동 | ✅ | `health_readings.metadata.exercise{}` | ✅ metadata에 포함 | ❌ | **화면 렌더링 누락** |
| 증상 | ✅ | `health_readings.metadata.symptoms[]` | ✅ metadata에 포함 | ❌ | **화면 렌더링 누락** |

### 3.2 프론트엔드 구조

**환자 측 (동작):**

| 파일 | 경로 | 역할 |
|------|------|------|
| `GlucoseInputPage.tsx` | `/patient/glucose-input` | 4종 통합 입력 (혈당 + 투약/운동/증상 접이식) |
| `GlucoseHistoryPage.tsx` | `/patient/glucose-history` | 기록 조회 (날짜별 그룹핑) |
| `GlucoseAnalysisPage.tsx` | `/patient/glucose-analysis` | TIR/변동성/트렌드 분석 |
| `PatientDashboardPage.tsx` | `/patient/dashboard` | 대시보드 (7개 메뉴) |
| `PatientProfilePage.tsx` | `/patient/profile` | 프로필 관리 |

**약사 측 (동작):**

| 파일 | 경로 | 역할 |
|------|------|------|
| `PharmacistPatientsPage.tsx` | `/pharmacy/patients` | 환자 목록 |
| `PharmacistPatientDetailPage.tsx` | `/pharmacy/patient/:patientId` | 환자 상세 (혈당만) |
| `PharmacistCoachingPage.tsx` | `/pharmacy/coaching` | 코칭 세션 관리 |
| `AppointmentsPage.tsx` | `/pharmacy/appointments` | 예약 관리 |
| `PatientRequestsPage.tsx` | `/pharmacy/patient-requests` | 연결 요청 관리 |
| `CareWorkspacePage.tsx` | `/care/workspace` | 통합 워크스페이스 (4탭) |

**약사 측 (미구현 — 필요):**

| 필요 화면 | 위치 제안 | 설명 |
|-----------|----------|------|
| 투약 이력 뷰 | `PharmacistPatientDetailPage` 탭/섹션 | health_readings.metadata.medications 표시 |
| 운동 이력 뷰 | `PharmacistPatientDetailPage` 탭/섹션 | health_readings.metadata.exercise 표시 |
| 증상 이력 뷰 | `PharmacistPatientDetailPage` 탭/섹션 | health_readings.metadata.symptoms 표시 |

### 3.3 백엔드 구조

**API 엔드포인트 — Care 모듈:**

| 엔드포인트 | 메서드 | 미들웨어 | 상태 |
|-----------|--------|---------|:----:|
| `/care/dashboard` | GET | pharmacyContext | ✅ |
| `/care/patients` / `/care/customers` | GET | pharmacyContext | ✅ |
| `/care/patients/:id` | GET | pharmacyContext | ✅ |
| `/care/patients/:patientId/health-readings` | GET | pharmacyContext | ✅ |
| `/care/patients/:patientId/coaching-sessions` | GET/POST | pharmacyContext | ✅ |
| `/care/patient/health-readings` | POST | authenticate | ✅ (환자 self-input) |
| `/care/patient/health-readings` | GET | authenticate | ✅ (환자 자기 기록) |
| `/care/patient/profile` | GET/POST/PUT | authenticate | ✅ |
| `/care/link-requests` | GET/POST/PATCH | pharmacyContext or authenticate | ✅ |
| `/care/appointments` | GET/POST/PATCH | pharmacyContext or authenticate | ✅ |

**Entity 목록:**

| Entity | 테이블 | 역할 | 활용도 |
|--------|--------|------|:------:|
| `HealthReading` | `health_readings` | 혈당 + metadata(투약/운동/증상) | **핵심** |
| `PatientHealthProfile` | `patient_health_profiles` | 환자 건강 프로필 | ✅ 사용 |
| `CareCoachingSession` | `care_coaching_sessions` | 코칭 세션 | ✅ 사용 |
| `CareCoachingDraft` | `care_coaching_drafts` | AI 코칭 초안 | ✅ 사용 |
| `CareKpiSnapshot` | `care_kpi_snapshots` | KPI 스냅샷 | ✅ 사용 |
| `CareLlmInsight` | `care_llm_insights` | AI 인사이트 | ✅ 사용 |
| `CareAlert` | `care_alerts` | 알림 | ✅ 사용 |
| `CarePharmacyLinkRequest` | `care_pharmacy_link_requests` | 약국-환자 연결 | ✅ 사용 |
| `CareAppointment` | `care_appointments` | 예약 | ✅ 사용 |
| `PatientAiInsight` | `patient_ai_insights` | 환자 AI 인사이트 | ✅ 사용 |

---

## 4. 아키텍처 분석

### 4.1 통합 metadata 저장 방식

환자 입력 시 단일 API 호출로 모든 데이터 저장:

```typescript
// POST /care/patient/health-readings
{
  readingType: "glucose",
  readingValue: 120,              // 혈당값 (mg/dL)
  measuredAt: "2026-03-21T08:00",
  mealTiming: "before_meal",
  sourceType: "patient_self",
  metadata: {
    medications: [                // 투약 정보
      { name: "메트포르민", dosage: "500mg", timing: "아침 식전" }
    ],
    exercise: {                   // 운동 정보
      type: "걷기", duration: 30, intensity: "moderate"
    },
    symptoms: ["두통", "어지러움"],  // 증상 목록
    notes: "아침 공복 측정"
  }
}
```

**장점**: 단일 테이블/API로 간단한 구조
**단점**: 별도 쿼리/분석 어려움, 약사 측 표시 시 metadata 파싱 필요

### 4.2 인증 흐름

```
[환자] → AuthContext(localStorage) → POST /auth/login → JWT 발급
       → POST /care/patient/health-readings → authenticate 미들웨어 → user.id 기반

[약사] → AuthContext(localStorage) → POST /auth/login → JWT 발급
       → GET /care/patients → pharmacyContext 미들웨어 → org.id 기반 스코핑
```

**최근 수정 (WO-O4O-AUTH-MIDDLEWARE-CONSOLIDATION-V1)**:
- `care-pharmacy-context.middleware.ts`의 admin bypass가 JWT snapshot(`user.roles`) → DB 실시간 조회(`roleAssignmentService.hasAnyRole()`)로 전환됨

### 4.3 API 클라이언트 구조

| 파일 | 역할 | 엔드포인트 수 |
|------|------|:------------:|
| `api/pharmacy.ts` | 약사용 API (pharmacyContext 경유) | 25+ |
| `api/patient.ts` | 환자용 API (authenticate 경유) | 8+ |
| `api/care.ts` | Care 공통 API | 5+ |

---

## 5. 우선순위 분류

### P0 — 기본 테스트 차단 (Critical)

> 현재 P0 이슈 없음. 기본 흐름(입력→저장→조회)은 모두 동작.

### P1 — 부분 동작 (Important)

| # | 이슈 | 영향 | 설명 |
|---|------|------|------|
| P1-1 | **약사 화면: 투약 이력 미표시** | 약사가 환자 투약 정보 확인 불가 | `PharmacistPatientDetailPage`에서 `health_readings.metadata.medications` 미렌더링 |
| P1-2 | **약사 화면: 운동 이력 미표시** | 약사가 환자 운동 정보 확인 불가 | `PharmacistPatientDetailPage`에서 `health_readings.metadata.exercise` 미렌더링 |
| P1-3 | **약사 화면: 증상 이력 미표시** | 약사가 환자 증상 정보 확인 불가 | `PharmacistPatientDetailPage`에서 `health_readings.metadata.symptoms` 미렌더링 |

> **P1-1~3 공통 해결 방향**: `PharmacistPatientDetailPage.tsx` 내 건강 기록 목록에 metadata 표시 섹션 추가. 별도 API 수정 불필요 — 이미 응답에 metadata 포함됨.

### P2 — 후속 개선 (Follow-up)

| # | 이슈 | 설명 |
|---|------|------|
| P2-1 | 투약/운동/증상 별도 분석 화면 | 환자 측 `GlucoseAnalysisPage`에 투약/운동/증상 상관관계 분석 추가 |
| P2-2 | 코칭 시 metadata 연계 | 코칭 세션 작성 시 환자의 투약/운동/증상 이력 참조 UI |
| P2-3 | metadata 검색/필터 | 약사가 특정 투약 또는 증상 기준으로 환자 기록 필터링 |
| P2-4 | 데이터 내보내기 | 건강 기록(혈당+metadata) CSV/PDF 내보내기 기능 |

---

## 6. 코드 파일 매핑

### 6.1 환자 프론트엔드

```
services/web-glycopharm/src/
├── pages/patient/
│   ├── GlucoseInputPage.tsx        ← 4종 통합 입력 (핵심)
│   ├── GlucoseHistoryPage.tsx      ← 기록 조회
│   ├── GlucoseAnalysisPage.tsx     ← 분석 (TIR/변동성)
│   ├── PatientDashboardPage.tsx    ← 환자 대시보드
│   └── PatientProfilePage.tsx      ← 프로필 관리
├── api/
│   └── patient.ts                  ← 환자 API 클라이언트
```

### 6.2 약사 프론트엔드

```
services/web-glycopharm/src/
├── pages/pharmacist/
│   ├── PharmacistPatientsPage.tsx         ← 환자 목록
│   ├── PharmacistPatientDetailPage.tsx    ← 환자 상세 (혈당만 — P1 수정 대상)
│   ├── PharmacistCoachingPage.tsx         ← 코칭 세션
│   ├── AppointmentsPage.tsx              ← 예약 관리
│   └── PatientRequestsPage.tsx           ← 연결 요청
├── pages/care/
│   ├── CareWorkspacePage.tsx             ← 통합 워크스페이스
│   ├── CareDashboardPage.tsx             ← Care 대시보드
│   └── PatientsPage.tsx                  ← 환자 목록 (Care 버전)
├── api/
│   ├── pharmacy.ts                       ← 약사 API 클라이언트 (25+ endpoints)
│   └── care.ts                           ← Care 공통 API
```

### 6.3 백엔드

```
apps/api-server/src/modules/care/
├── care-pharmacy-context.middleware.ts   ← 약국 컨텍스트 미들웨어 (최근 수정)
├── controllers/
│   ├── care-pharmacy.controller.ts       ← 약사용 엔드포인트
│   ├── care-patient.controller.ts        ← 환자 self-input 엔드포인트
│   ├── care-coaching.controller.ts       ← 코칭 세션
│   ├── care-link-request.controller.ts   ← 약국-환자 연결
│   ├── care-appointment.controller.ts    ← 예약
│   ├── care-dashboard.controller.ts      ← 대시보드
│   ├── care-kpi.controller.ts            ← KPI
│   ├── care-alert.controller.ts          ← 알림
│   └── ...
├── services/
│   ├── care-pharmacy.service.ts
│   ├── care-patient.service.ts
│   ├── care-coaching.service.ts
│   └── ...
├── entities/
│   ├── health-reading.entity.ts          ← 핵심 Entity (metadata JSONB)
│   ├── patient-health-profile.entity.ts
│   ├── care-coaching-session.entity.ts
│   ├── care-coaching-draft.entity.ts
│   ├── care-kpi-snapshot.entity.ts
│   ├── care-llm-insight.entity.ts
│   ├── care-alert.entity.ts
│   ├── care-pharmacy-link-request.entity.ts
│   ├── care-appointment.entity.ts
│   └── patient-ai-insight.entity.ts
```

---

## 7. 조사 제외 항목

본 감사에서 의도적으로 제외된 항목 (향후 별도 WO):

| 항목 | 사유 |
|------|------|
| 약국 매칭 시스템 | 별도 비즈니스 로직 — 기본 기능 범위 외 |
| 코칭 자동화 | AI 고도화 영역 — 기본 기능 범위 외 |
| 알림 자동화 | 인프라 의존 — 기본 기능 범위 외 |
| AI 분석 고도화 | LLM 연계 — 기본 기능 범위 외 |
| Care Action Engine | 미래 확장 — 기본 기능 범위 외 |

---

## 8. 결론 및 다음 단계 권장

### 현재 상태 요약

GlycoPharm 혈당관리 서비스의 **기본 기능은 대부분 살아 있다**.

- **환자 측**: 4개 입력 기능 모두 동작, 기록 조회/분석 동작, 프로필 관리 동작
- **약사 측**: 환자 목록/상세/코칭/예약/연결 요청 모두 동작
- **유일한 끊김**: 약사가 환자의 투약/운동/증상 데이터를 볼 수 없음 (데이터는 DB에 존재)

### 권장 다음 단계

| 우선순위 | 작업 | 예상 범위 | WO 제안 |
|:--------:|------|----------|---------|
| **1순위** | `PharmacistPatientDetailPage`에 투약/운동/증상 metadata 표시 섹션 추가 | 프론트엔드 1파일 수정 (백엔드 수정 불필요) | WO-GLYCOPHARM-PHARMACIST-METADATA-VIEW-V1 |
| **2순위** | Care 대시보드에 투약/운동/증상 요약 통계 추가 | 프론트엔드 1-2파일 | WO-GLYCOPHARM-CARE-DASHBOARD-METADATA-V1 |
| **3순위** | 코칭 세션에 환자 metadata 연계 참조 | 프론트엔드 1파일 | WO-GLYCOPHARM-COACHING-METADATA-REF-V1 |

> **1순위 작업은 백엔드 변경 없이 프론트엔드만 수정하면 완료 가능** — API 응답에 이미 metadata가 포함되어 있으므로, `PharmacistPatientDetailPage.tsx`에서 `healthReadings[n].metadata`를 파싱하여 표시하면 됨.

---

*IR-O4O-GLYCOPHARM-BASIC-FUNCTION-AUDIT-V1 — End of Report*
