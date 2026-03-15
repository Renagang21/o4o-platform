# IR-GLYCOPHARM-PATIENT-MANAGEMENT-AUDIT-V1

> GlycoPharm Care 시스템 — 환자 관리 구조와 환자 데이터 입력 구조의 실제 구현 상태 조사
> 조사일: 2026-03-15
> 상태: **조사 완료**

---

## Executive Summary

| 질문 | 답변 | 판정 |
|------|------|------|
| 환자가 특정 약국에 소속되는 구조인가? | YES — `organization_id` 기반 스코핑 | **구현됨** |
| 약사가 환자를 직접 생성할 수 있는가? | GlucoseView에서만 가능, GlycoPharm Care에서는 불가 | **부분 구현** |
| 약사가 환자 데이터를 직접 입력할 수 있는가? | YES — Care DataTab에서 입력 가능 | **구현됨** |
| Care가 실제 환자 관리 시스템인가? | YES — 대시보드, 목록, 상세, 데이터입력, 분석, 코칭, 이력 전체 존재 | **구현됨** |
| 웹 UI와 PWA가 동일 서비스인가? | 기능적 YES, 기술적 NO (별도 앱, 동일 API/DB) | **확인** |

---

## 1. 환자 데이터 구조

### 테이블: `glucoseview_customers`

**Entity**: `apps/api-server/src/routes/glucoseview/entities/glucoseview-customer.entity.ts`
**Migration**: `apps/api-server/src/database/migrations/20260222300000-CreateGlucoseViewCustomersTable.ts`

| 컬럼 | 타입 | Nullable | 설명 |
|------|------|:--------:|------|
| `id` | UUID PK | NO | 자동 생성 |
| `pharmacist_id` | VARCHAR(255) | NO | 등록한 약사의 user ID |
| `organization_id` | UUID | YES | 소속 약국 (조직) — 스코핑 기본 축 |
| `name` | VARCHAR(100) | NO | 환자 이름 |
| `phone` | VARCHAR(20) | YES | 전화번호 |
| `email` | VARCHAR(255) | YES | 이메일 |
| `birth_year` | INT | YES | 출생연도 |
| `gender` | VARCHAR(10) | YES | male / female |
| `kakao_id` | VARCHAR(100) | YES | 카카오톡 ID |
| `last_visit` | TIMESTAMP | YES | 최근 방문일 |
| `visit_count` | INT | NO | 방문 횟수 (기본 1) |
| `sync_status` | VARCHAR(20) | NO | pending / synced / error |
| `last_sync_at` | TIMESTAMP | YES | 최근 동기화 |
| `notes` | TEXT | YES | 메모 |
| `data_sharing_consent` | BOOLEAN | NO | 데이터 공유 동의 (기본 false) |
| `consent_date` | TIMESTAMP | YES | 동의 일시 |
| `created_at` | TIMESTAMP | NO | 생성일 |
| `updated_at` | TIMESTAMP | NO | 수정일 |

**인덱스**:
- `idx_gv_customers_pharmacist_id` — 약사별 조회
- `idx_gv_customers_pharmacist_phone` — (pharmacist_id, phone) 복합
- `idx_gv_customers_pharmacist_email` — (pharmacist_id, email) 복합
- `idx_gv_customers_organization_id` — 약국별 조회

### 핵심 확인 사항

| 항목 | 결과 |
|------|------|
| `pharmacy_id` 존재 여부 | **NO** — `organization_id`가 약국 스코핑 역할 수행 |
| `user_id` 존재 여부 | **NO** — `pharmacist_id`(등록자)와 `email`(환자 식별)로 분리 |
| 환자 생성 시 필수 필드 | `name` (유일한 필수 입력), `pharmacist_id`/`visit_count`/`sync_status`는 자동 설정 |
| 약국 소속 구조 | **YES** — `organization_id` 기반, 동일 환자가 여러 약국에 별도 레코드 가능 |

---

## 2. 환자 생성 기능

### GlucoseView (glucoseview.co.kr) — **존재함**

| 항목 | 내용 |
|------|------|
| UI 위치 | `services/web-glucoseview/src/pages/PatientsPage.tsx:776-916` |
| 버튼 | "신규 고객 등록" (+ 아이콘, 파란색) |
| 폼 필드 | 이름(필수), 나이, 성별, 카카오ID, 전화, 이메일 |
| API | `POST /api/v1/glucoseview/customers` |
| 서비스 | `CustomerService.createCustomer()` |

### GlycoPharm Care (glycopharm.co.kr) — **존재하지 않음**

| 항목 | 내용 |
|------|------|
| 환자 생성 버튼 | **없음** |
| 환자 등록 화면 | **없음** |
| 환자 생성 API | **없음** (읽기 전용 API만 존재) |

**결론**: 환자 생성은 **GlucoseView 전용 기능**. GlycoPharm Care에서는 기존 환자만 조회 가능.

### 환자 생성 API 상세

```
POST /api/v1/glucoseview/customers

Controller: apps/api-server/src/routes/glucoseview/controllers/customer.controller.ts
Service:    apps/api-server/src/routes/glucoseview/services/customer.service.ts

Request:
{
  "name": "string (필수)",
  "phone": "string (선택)",
  "email": "string (선택)",
  "birth_year": "number (선택)",
  "gender": "'male' | 'female' (선택)",
  "kakao_id": "string (선택)",
  "notes": "string (선택)"
}

자동 설정:
- pharmacist_id ← 로그인한 약사의 user ID
- visit_count ← 1
- sync_status ← 'pending'
- data_sharing_consent ← false
```

---

## 3. 환자 데이터 입력 기능

### 테이블: `health_readings`

**Entity**: `apps/api-server/src/modules/care/entities/health-reading.entity.ts`

| 컬럼 | 타입 | Nullable | 설명 |
|------|------|:--------:|------|
| `id` | UUID PK | NO | 자동 생성 |
| `patientId` | UUID | NO | 환자 ID |
| `metricType` | VARCHAR(50) | NO | glucose / blood_pressure_systolic / blood_pressure_diastolic / weight |
| `valueNumeric` | NUMERIC(10,2) | YES | 측정값 |
| `valueText` | TEXT | YES | 텍스트 표현 |
| `unit` | VARCHAR(20) | NO | mg/dL 등 |
| `measuredAt` | TIMESTAMPTZ | NO | 측정 시각 |
| `sourceType` | VARCHAR(30) | NO | manual / patient_self / device / auto |
| `createdBy` | UUID | YES | 입력자 ID |
| `metadata` | JSONB | NO | 확장 메타데이터 (식사, 약물, 운동, 증상) |
| `pharmacyId` | UUID | YES | 약국 ID (약사 입력 시 설정) |
| `createdAt` | TIMESTAMPTZ | NO | 생성일 |

### 데이터 입력 경로 (2가지)

#### 경로 A: 약사 입력 (Care 워크스페이스)

| 항목 | 내용 |
|------|------|
| UI | `services/web-glycopharm/src/pages/care/patient-tabs/DataTab.tsx` |
| 경로 | `/care/patients/:id` (기본 탭) |
| API | `POST /api/v1/care/health-readings` |
| 미들웨어 | `authenticate` + `requirePharmacyContext` |
| sourceType | `'manual'` |
| pharmacyId | 약국 컨텍스트에서 자동 설정 |
| 입력 항목 | metricType(혈당/혈압/체중), 값, 측정시각 |

#### 경로 B: 환자 자가 입력

| 항목 | 내용 |
|------|------|
| UI | `services/web-glycopharm/src/pages/patient/GlucoseInputPage.tsx` |
| 경로 | `/patient/glucose-input` |
| API | `POST /patient/health-readings` |
| 미들웨어 | `authenticate` (환자 인증만) |
| sourceType | `'patient_self'` |
| pharmacyId | `null` |
| 입력 항목 | 혈당값 + 식사타이밍 + 약물/운동/증상 (선택적 메타데이터) |

**결론**: 약사는 Care DataTab에서 **환자 데이터를 직접 입력할 수 있다** (혈당, 혈압, 체중).

---

## 4. Care UI 환자 관리 기능

### 전체 화면 구성

| 화면 | 경로 | 기능 | 파일 |
|------|------|------|------|
| **Care 대시보드** | `/care` | 요약 통계, 우선순위 환자, 알림, 환자 테이블 | `pages/care/CareDashboardPage.tsx` |
| **환자 목록** | `/care/patients` | 검색, 위험도 필터, 정렬 | `pages/care/PatientsPage.tsx` |
| **환자 상세** | `/care/patients/:id` | 헤더 + 액션 패널 + 4개 탭 | `pages/care/PatientDetailPage.tsx` |
| **데이터 탭** | `/care/patients/:id` (기본) | 건강 데이터 입력 + 조회 | `pages/care/patient-tabs/DataTab.tsx` |
| **분석 탭** | `/care/patients/:id/analysis` | TIR/CV/위험도/AI 인사이트 | `pages/care/patient-tabs/AnalysisTab.tsx` |
| **코칭 탭** | `/care/patients/:id/coaching` | 코칭 기록/AI 초안 승인 | `pages/care/patient-tabs/CoachingTab.tsx` |
| **이력 탭** | `/care/patients/:id/history` | 통합 타임라인 | `pages/care/patient-tabs/HistoryTab.tsx` |

### 기능별 존재 여부

| 기능 | 존재 | 위치 |
|------|:----:|------|
| 환자 목록 조회 | **YES** | CareDashboard + PatientsPage |
| 환자 상세 조회 | **YES** | PatientDetailPage |
| 환자 생성 | **NO** | Care에는 없음 (GlucoseView 전용) |
| 환자 수정 | **NO** | Care에는 없음 |
| 데이터 입력 | **YES** | DataTab (혈당/혈압/체중) |
| 데이터 분석 | **YES** | AnalysisTab (TIR/CV/위험도/LLM) |
| 코칭 기록 | **YES** | CoachingTab (수동 + AI 초안) |
| 통합 이력 | **YES** | HistoryTab (4종 이벤트 타임라인) |
| 알림 관리 | **YES** | CareDashboard (확인/해결) |

### Care 대시보드 상세

- **Population Summary**: 전체 환자, 고위험, 주의, 최근 7일 코칭 건수
- **Priority Patients**: 우선순위 점수(0-100), 위험도, TIR%, 위험 요인
- **Alert Stream**: 활성 알림 + 확인/해결 액션
- **평균 지표**: 평균 TIR%, 평균 CV%, 코칭 활동 요약
- **환자 검색**: 이름/전화 검색, 위험도 필터, 정렬

### 환자 상세 4개 탭

| 탭 | 읽기 | 쓰기 | API |
|----|:----:|:----:|-----|
| **데이터** | 건강 기록 테이블 | 혈당/혈압/체중 입력 | `getHealthReadings`, `postHealthReading` |
| **분석** | TIR/CV/위험도, LLM 인사이트, 혈압/체중/대사 위험 | (읽기 전용) | `getCareAnalysis`, `getCareLlmInsight` |
| **코칭** | 코칭 세션 목록, AI 초안 | 코칭 생성, AI 초안 승인/폐기 | `getCoachingSessions`, `createCoachingSession` |
| **이력** | 통합 타임라인 (건강데이터/분석/코칭/알림) | (읽기 전용) | `getPatientTimeline` |

**결론**: Care 시스템은 **실제 환자 관리 시스템으로 동작 가능**하다. 대시보드, 환자 관리, 데이터 입력/분석, AI 코칭까지 전체 파이프라인이 구현되어 있다. **단, 환자 생성(등록) 기능만 Care에 없다.**

---

## 5. 환자-약국 연결 구조

### 연결 테이블

| 테이블 | 역할 |
|--------|------|
| `glucoseview_customers` | 정규 환자-약국 연결 (SSOT) |
| `care_pharmacy_link_requests` | 연결 요청 워크플로 (pending → approved/rejected) |
| `patient_health_profiles` | 환자 자체 건강 프로필 (user_id 기반, 약국 독립) |

### 연결 흐름

```
환자 (glucoseview.co.kr / glycopharm.co.kr)
  ↓
POST /api/v1/care/pharmacy-link/request {pharmacyId, message?}
  ↓
INSERT care_pharmacy_link_requests (status='pending')
  ↓
약사 UI에서 대기 요청 확인
  ↓
POST /api/v1/care/pharmacy-link/approve {requestId}
  ↓
TRANSACTION:
  1. care_pharmacy_link_requests → status='approved'
  2. glucoseview_customers INSERT (organization_id + email 매칭)
  ↓
약국-환자 정규 연결 완료
```

### 데이터 격리

| 격리 방식 | 구현 |
|-----------|------|
| 약국별 환자 격리 | `organization_id` WHERE 조건 필수 |
| 약사별 환자 필터 | `pharmacist_id` WHERE 조건 |
| 다중 약국 환자 | 동일 환자가 여러 약국에 **별도 레코드** 존재 가능 |
| 데이터 공유 동의 | `data_sharing_consent` 플래그로 명시적 관리 |

**결론**: 환자 → 약국 소속 모델이 `organization_id` 기반으로 **구현되어 있다**. 약국 간 데이터 격리도 가능하다.

---

## 6. 웹 UI vs PWA 구조

### 비교표

| 항목 | GlucoseView (glucoseview.co.kr) | GlycoPharm (glycopharm.co.kr) |
|------|--------------------------------|-------------------------------|
| **앱 유형** | PWA (모바일 우선) | 웹 (데스크탑 포함) |
| **환자 페이지** | 8개 라우트 (/patient/*) | 7개 라우트 (/patient/*) |
| **인증 방식** | httpOnly Cookie | Bearer Token |
| **API 베이스** | `https://api.neture.co.kr` | `https://api.neture.co.kr` |
| **API 엔드포인트** | `/api/v1/care/*` | `/api/v1/care/*` (동일) |
| **데이터 테이블** | 동일 | 동일 |
| **환자 기능** | 혈당 입력, 데이터 분석, 약국 연결, 코칭 확인, 예약 | 동일 |
| **약사 기능** | 고객 CRUD, CGM 관리 | Care 워크스페이스 (대시보드, 분석, 코칭) |

### 판정

| 질문 | 답변 |
|------|------|
| 동일 API 사용 여부 | **YES** — 모두 `api.neture.co.kr` 동일 백엔드 |
| 환자 데이터 테이블 동일 여부 | **YES** — `glucoseview_customers`, `health_readings`, `patient_health_profiles` 공유 |
| 동일 서비스 여부 | **기능적 YES** (동일 데이터), **기술적 NO** (별도 앱, 인증 방식 차이) |

---

## 7. Gap 분석

### 현재 구현 상태 vs 약국 중심 환자 구조

| 요구사항 | 현재 상태 | Gap |
|----------|----------|-----|
| 약국 소속 환자 모델 | `organization_id` 기반 구현 완료 | **없음** |
| 약사가 환자 데이터 입력 | Care DataTab에서 가능 | **없음** |
| 약사가 환자 생성 | GlucoseView에서만 가능 | **Care에 환자 등록 UI 없음** |
| 약국 간 데이터 격리 | `organization_id` WHERE 조건 | **없음** |
| 환자 자가 입력 | GlucoseInputPage 구현 완료 | **없음** |
| 환자-약국 연결 요청 | `care_pharmacy_link_requests` 구현 완료 | **없음** |
| Care 대시보드 | 전체 파이프라인 구현 (대시보드→분석→코칭) | **없음** |
| 환자 수정/편집 | Care UI에 없음 | **환자 정보 수정 UI 없음** |

### 핵심 Gap

1. **Care에서 환자 직접 등록 불가** — GlucoseView에서만 가능. Care에 "신규 환자 등록" 버튼/모달 추가 필요
2. **Care에서 환자 정보 수정 불가** — 이름, 전화, 이메일 등 기본 정보 수정 UI 없음

---

## 8. 수정 필요 여부

### 즉시 수정 불필요 항목 (이미 구현됨)

| 항목 | 상태 |
|------|------|
| 약국 소속 환자 모델 | ✅ `organization_id` 구현 완료 |
| 데이터 입력 | ✅ Care DataTab 구현 완료 |
| 데이터 분석 | ✅ AnalysisTab (TIR/CV/위험도/LLM) 구현 완료 |
| 코칭 시스템 | ✅ CoachingTab + AI 초안 구현 완료 |
| 환자-약국 연결 | ✅ 요청-승인 워크플로 구현 완료 |
| 약국 간 격리 | ✅ organization_id 기반 격리 구현 완료 |

### 선택적 수정 가능 항목

| 항목 | 현재 | 개선 방향 | 우선순위 |
|------|------|----------|:--------:|
| Care 환자 등록 | GlucoseView에서만 가능 | Care PatientsPage에 "신규 환자" 버튼 + 등록 모달 추가 | 중 |
| Care 환자 수정 | 수정 UI 없음 | PatientDetail에 기본정보 편집 기능 추가 | 낮 |

---

## 관련 파일 참조

### Backend

```
apps/api-server/src/routes/glucoseview/entities/glucoseview-customer.entity.ts
apps/api-server/src/routes/glucoseview/services/customer.service.ts
apps/api-server/src/routes/glucoseview/controllers/customer.controller.ts
apps/api-server/src/modules/care/entities/health-reading.entity.ts
apps/api-server/src/modules/care/entities/care-pharmacy-link-request.entity.ts
apps/api-server/src/modules/care/entities/patient-health-profile.entity.ts
apps/api-server/src/modules/care/controllers/health-readings.controller.ts
apps/api-server/src/modules/care/controllers/patient-health-readings.controller.ts
apps/api-server/src/modules/care/controllers/pharmacy-link.controller.ts
apps/api-server/src/modules/care/controllers/patient-profile.controller.ts
apps/api-server/src/database/migrations/20260222300000-CreateGlucoseViewCustomersTable.ts
apps/api-server/src/database/migrations/20260222400000-AddOrganizationIdToGlucoseViewCustomers.ts
```

### Frontend — GlycoPharm Care

```
services/web-glycopharm/src/pages/care/CareDashboardPage.tsx
services/web-glycopharm/src/pages/care/PatientsPage.tsx
services/web-glycopharm/src/pages/care/PatientDetailPage.tsx
services/web-glycopharm/src/pages/care/patient-tabs/DataTab.tsx
services/web-glycopharm/src/pages/care/patient-tabs/AnalysisTab.tsx
services/web-glycopharm/src/pages/care/patient-tabs/CoachingTab.tsx
services/web-glycopharm/src/pages/care/patient-tabs/HistoryTab.tsx
services/web-glycopharm/src/api/pharmacy.ts
services/web-glycopharm/src/api/patient.ts
```

### Frontend — GlucoseView

```
services/web-glucoseview/src/pages/PatientsPage.tsx
services/web-glucoseview/src/pages/patient/PatientMainPage.tsx
services/web-glucoseview/src/pages/patient/GlucoseInputPage.tsx
services/web-glucoseview/src/pages/patient/SelectPharmacyPage.tsx
services/web-glucoseview/src/api/patient.ts
```

---

*IR-GLYCOPHARM-PATIENT-MANAGEMENT-AUDIT-V1*
*조사일: 2026-03-15*
*Status: Complete*
