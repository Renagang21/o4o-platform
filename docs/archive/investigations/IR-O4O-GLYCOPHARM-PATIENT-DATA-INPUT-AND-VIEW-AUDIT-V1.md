# IR-O4O-GLYCOPHARM-PATIENT-DATA-INPUT-AND-VIEW-AUDIT-V1

> **조사 보고서** — GlycoPharm/GlucoseView 환자 데이터 입력·조회 구조 전수 감사
>
> 작성일: 2026-03-23
> 상태: COMPLETE

---

## 1. 서비스 구조 요약

| 서비스 | 역할 | 사용자 |
|--------|------|--------|
| **web-glucoseview** | 환자(당뇨인) 전용 앱 | 환자 본인 |
| **web-glycopharm** | 약사/약국 관리 앱 | 약사, 약국 운영자 |

두 서비스가 **동일한 API 서버** (`o4o-core-api`)의 Care 모듈을 공유한다.

---

## 2. 환자 데이터 입력 화면

### 2-A. 환자 자가 입력 (GlucoseView)

#### 혈당 입력 — `GlucoseInputPage.tsx`

| 필드 | 타입 | 입력 방식 | 필수 | 비고 |
|------|------|----------|------|------|
| 혈당 수치 | number | 텍스트 입력 | ✅ | 20-600 mg/dL 범위 검증 |
| 식사 시점 | enum | 버튼 그룹 + 드롭다운 | ✅ | fasting/before_meal/after_meal/bedtime/random |
| 측정 시간 | datetime | datetime-local 입력 | ✅ | 현재 시각 기본값 |
| 복약 이름 | text | 텍스트 입력 | ❌ | 접이식 섹션 |
| 복약 용량 | text | 텍스트 입력 | ❌ | 예: "500mg 1정" |
| 복약 시간 | datetime | datetime-local 입력 | ❌ | 측정 시간 기본값 |
| 운동 종류 | enum | select 드롭다운 | ❌ | walking/running/cycling/swimming/strength/yoga/other |
| 운동 시간 | number | 텍스트 입력 | ❌ | 1-600분 |
| 운동 강도 | enum | 버튼 그룹 | ❌ | light/moderate/vigorous |
| 증상 | array | 체크박스 버튼 | ❌ | 어지러움/식은땀/손떨림/피로/두통/갈증/기타 (다중선택) |

**API**: `POST /api/v1/care/patient/health-readings`
**페이로드**:
```json
{
  "metricType": "glucose",
  "valueNumeric": 120,
  "unit": "mg/dL",
  "measuredAt": "2026-03-23T09:00:00+09:00",
  "metadata": {
    "mealTiming": "fasting",
    "mealTimingLabel": "공복",
    "medication": { "name": "메트포르민", "dose": "500mg 1정", "takenAt": "..." },
    "exercise": { "type": "walking", "duration": 30, "intensity": "moderate" },
    "symptoms": ["피로", "갈증"]
  }
}
```

**파일**: `services/web-glucoseview/src/pages/patient/GlucoseInputPage.tsx`

---

#### 건강 프로필 — `ProfilePage.tsx`

| 필드 | 타입 | 비고 |
|------|------|------|
| 당뇨 유형 | enum | type1/type2/gestational/prediabetes/unknown |
| 치료 방법 | enum | insulin/oral/diet/combined/unknown |
| 키 | number | 80-250cm |
| 몸무게 | number | 20-300kg |
| 목표 HbA1c | decimal | 4.0-15.0% |
| 목표 혈당 하한 | number | 기본 70 mg/dL |
| 목표 혈당 상한 | number | 기본 180 mg/dL |
| 생년월일 | date | |

**API**: `POST/PUT /api/v1/care/patient-profile`
**파일**: `services/web-glucoseview/src/pages/patient/ProfilePage.tsx`

---

### 2-B. 약사 입력 (GlycoPharm)

#### 환자 건강 데이터 수동 입력 — `DataTab.tsx`

| 필드 | 타입 | 비고 |
|------|------|------|
| 항목 유형 | enum | glucose / blood_pressure_systolic / blood_pressure_diastolic / weight |
| 수치 | number | 자유 입력 |
| 측정 일시 | datetime | datetime-local |

**API**: `POST /api/v1/care/health-readings` (pharmacyContext 필수)
**파일**: `services/web-glycopharm/src/pages/care/patient-tabs/DataTab.tsx`

> **⚠️ 차이점**: 약사 입력 시 `metadata` (식사시점, 복약, 운동, 증상) 입력 UI 없음.
> 환자 자가 입력보다 데이터 풍부도가 현저히 낮음.

#### 코칭 기록 작성 — `CoachingTab.tsx` / `CoachingPage.tsx`

| 필드 | 비고 |
|------|------|
| 상담 요약 | textarea |
| 실행 계획 | textarea |

**API**: `POST /api/v1/care/coaching`

#### 환자 등록 — `PharmacyPatients.tsx`

| 필드 | 비고 |
|------|------|
| 이름 | 필수 |
| 전화번호 | 선택 |
| 이메일 | 선택 |
| 메모 | 선택 |

**API**: `POST /glycopharm/pharmacy/customers`

> **⚠️ 미완성**: "고객 등록" 버튼 존재하나, 입력 폼 UI가 완전히 구현되어 있지 않음.

---

## 3. 데이터 모델 (전체 Care 테이블)

### 핵심 테이블 11개

| # | 테이블 | 용도 | PK 유형 |
|---|--------|------|---------|
| 1 | `health_readings` | 건강 데이터 포인트 (혈당, 혈압, 체중) | UUID |
| 2 | `patient_health_profiles` | 환자 건강 프로필 (1:1 user) | UUID |
| 3 | `care_kpi_snapshots` | KPI 스냅샷 (TIR, CV, 위험도) | UUID |
| 4 | `care_coaching_sessions` | 코칭 상담 기록 | UUID |
| 5 | `care_coaching_drafts` | AI 코칭 초안 | UUID |
| 6 | `care_llm_insights` | LLM 분석 캐시 (약사용+환자용) | UUID |
| 7 | `patient_ai_insights` | 환자 온디맨드 AI 인사이트 | UUID |
| 8 | `care_alerts` | 자동 생성 약사 알림 | UUID |
| 9 | `care_appointments` | 상담 예약 | UUID |
| 10 | `care_pharmacy_link_requests` | 환자-약국 연결 요청 | UUID |
| 11 | `ai_model_settings` | LLM 모델 설정 (글로벌) | SERIAL |

### health_readings 스키마 상세

```
id              UUID        PK
patient_id      UUID        환자 user.id
metric_type     varchar(50) 'glucose' | 'blood_pressure_systolic' | 'blood_pressure_diastolic' | 'weight'
value_numeric   numeric(10,2)  측정값
value_text      text        텍스트 값 (미사용)
unit            varchar(20) 'mg/dL' | 'mmHg' | 'kg'
measured_at     timestamptz 측정 시각
source_type     varchar(30) 'manual' | 'patient_self'
created_by      UUID        입력자 user.id (nullable)
metadata        jsonb       { mealTiming, medication, exercise, symptoms }
pharmacy_id     UUID        연결 약국 (nullable — 환자 자가입력 시 null)
created_at      timestamptz 시스템 생성 시각
```

**인덱스**:
- `(patient_id, measured_at DESC)` — 환자별 시계열 조회
- `(pharmacy_id)` — 약국 범위 조회

### patient_health_profiles 스키마

```
id                  UUID    PK
user_id             UUID    UNIQUE (1:1)
diabetes_type       varchar(20)   type1/type2/gestational/prediabetes
treatment_method    varchar(20)   insulin/oral/diet/combined
height              numeric(5,1)  cm
weight              numeric(5,1)  kg
target_hba1c        numeric(3,1)  %
target_glucose_low  int           기본 70
target_glucose_high int           기본 180
birth_date          date
created_at          timestamptz
updated_at          timestamptz
```

### glucoseview_customers 스키마 (환자-약국 연결)

```
id                    UUID    PK
organization_id       UUID    약국 org ID (nullable)
pharmacist_id         varchar(255)  등록 약사 user.id
name                  varchar(100)
phone                 varchar(20)
email                 varchar(255)
birth_year            int
gender                varchar(10)
kakao_id              varchar(100)
last_visit            timestamp
visit_count           int
sync_status           varchar(20)   pending/synced/error
last_sync_at          timestamp
notes                 text
data_sharing_consent  boolean
consent_date          timestamp
created_at            timestamp
updated_at            timestamp
```

---

## 4. 데이터 조회 화면 구조

### 4-A. 환자 화면 (GlucoseView)

| 페이지 | 라우트 | 주요 표시 |
|--------|--------|----------|
| **PatientMainPage** | `/patient/` | 오늘 혈당 요약, 최근 5건 기록, AI 인사이트, 최근 코칭 |
| **DataAnalysisPage** | `/patient/data-analysis` | 7/14/30일 KPI 카드 4개, SVG 혈당 추이 차트, 변동성, AI 인사이트 |
| **PharmacistCoachingPage** | `/patient/pharmacist-coaching` | 약사 코칭 세션 목록 |
| **AppointmentsPage** | `/patient/appointments` | 상담 예약 목록 |
| **CareGuidelinePage** | `/patient/care-guideline` | 교육 자료 |

### 4-B. 약사 화면 (GlycoPharm)

| 페이지 | 라우트 | 주요 표시 |
|--------|--------|----------|
| **CareDashboardPage** | `/care` | 모집단 요약(4카드), AI 인구 분석, 우선순위 환자 5명, 알림 스트림, 위험도 분포, KPI 평균 |
| **PatientDetailPage** | `/care/patient/:id` | 환자 헤더(이름+위험도), Quick Stats(TIR/CV/코칭 수), 액션 패널, 4-탭 네비게이션 |
| └ **DataTab** | `.../data` | 건강 데이터 입력 폼 + 최근 기록 테이블 (metadata 태그 포함) |
| └ **AnalysisTab** | `.../analysis` | TIR/CV/위험도 카드, 인사이트 목록, LLM 분석, 다중지표(혈압/체중/대사위험) |
| └ **CoachingTab** | `.../coaching` | 코칭 요약, AI 초안, 새 코칭 폼, 세션 목록 |
| └ **HistoryTab** | `.../history` | 통합 타임라인 (건강데이터/분석/코칭/알림 필터) |
| **AnalysisPage** | `/care/analysis` | 환자 선택 → 개별 혈당 분석 (차트+KPI+인사이트) |
| **CoachingPage** | `/care/coaching` | 전체/개별 환자 코칭 관리 |

---

## 5. 데이터 흐름 아키텍처

```
┌─────────────────────────────────────────────────┐
│  환자 (GlucoseView App)                         │
│  ┌───────────┐  ┌──────────────┐               │
│  │ 혈당 입력  │  │ 건강 프로필   │               │
│  │ +복약/운동 │  │ 당뇨유형/치료 │               │
│  │ +증상     │  │ 키/체중/목표  │               │
│  └─────┬─────┘  └──────┬───────┘               │
│        │               │                        │
│   POST /care/     POST/PUT /care/               │
│   patient/        patient-profile               │
│   health-readings                                │
└────────┼───────────────┼────────────────────────┘
         │               │
         ▼               ▼
┌─────────────────────────────────────────────────┐
│  API Server (o4o-core-api)                      │
│                                                  │
│  health_readings ←──── patient_health_profiles  │
│       │                                          │
│       ▼                                          │
│  Analysis Engine → care_kpi_snapshots           │
│       │                     │                    │
│       ├──→ care_alerts      ├──→ care_llm_insights│
│       │                     └──→ care_coaching_drafts│
│       │                                          │
│       └──→ patient_ai_insights                   │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  약사 (GlycoPharm App)                          │
│                                                  │
│  CareDashboard → 모집단 KPI, 우선순위, 알림     │
│  PatientDetail → 개별 환자 4-탭 뷰              │
│  CoachingPage  → 코칭 관리 + AI 초안 승인       │
│  AnalysisPage  → 혈당 분석 차트 + 인사이트      │
└─────────────────────────────────────────────────┘
```

---

## 6. 환자-약사 연결 흐름

```
1. 환자: POST /pharmacy-link/request → care_pharmacy_link_requests (pending)
2. 약사: POST /pharmacy-link/approve → 트랜잭션 {
     care_pharmacy_link_requests.status = 'approved'
     + INSERT glucoseview_customers (환자-약국 연결 레코드)
   }
3. 이후: 약사는 pharmacy-scoped 쿼리로 해당 환자 데이터 접근 가능
```

---

## 7. GAP 분석 — 현재 vs 비즈니스 요구사항

### 7-A. 입력 데이터 GAP

| 항목 | 환자 입력 | 약사 입력 | GAP |
|------|----------|----------|-----|
| 혈당 수치 | ✅ | ✅ | - |
| 식사 시점 | ✅ (5종) | ❌ | **약사 입력 시 식사 시점 없음** |
| 복약 정보 | ✅ (이름+용량+시간) | ❌ | **약사 입력 시 복약 정보 없음** |
| 운동 정보 | ✅ (종류+시간+강도) | ❌ | **약사 입력 시 운동 정보 없음** |
| 증상 | ✅ (7종 다중선택) | ❌ | **약사 입력 시 증상 없음** |
| 혈압 | ❌ | ✅ (systolic/diastolic) | **환자 자가 혈압 입력 없음** |
| 체중 | ❌ (프로필에만) | ✅ | **환자 자가 체중 추적 없음** |
| HbA1c | ❌ (목표만) | ❌ | **실측 HbA1c 입력 없음** |
| 식사 내용 | ❌ | ❌ | **식단 기록 기능 없음** |
| CGM 연동 | ❌ (인터페이스만) | ❌ | **CGM 디바이스 연동 미구현** |

### 7-B. 조회/분석 GAP

| 항목 | 현재 상태 | GAP |
|------|----------|-----|
| 혈당 추이 차트 | ✅ SVG 라인 차트 (환자+약사) | - |
| TIR/CV/위험도 | ✅ 카드 + 트렌드 | - |
| 공복/식후 분리 분석 | ✅ 평균값 표시 | - |
| 혈압 추이 | ⚠️ AnalysisTab에 평균만 | **혈압 시계열 차트 없음** |
| 체중 추이 | ⚠️ 최근값+변화량만 | **체중 시계열 차트 없음** |
| 복약 이력 연계 | ⚠️ DataTab 태그로만 표시 | **복약-혈당 상관 분석 없음** |
| 운동 이력 연계 | ⚠️ DataTab 태그로만 표시 | **운동-혈당 상관 분석 없음** |
| 통합 타임라인 | ✅ HistoryTab (4종 필터) | - |
| AI 인사이트 | ✅ 약사용 + 환자용 분리 | - |
| PDF/인쇄 리포트 | ❌ | **리포트 내보내기 없음** |

### 7-C. 환자 관리 GAP

| 항목 | 현재 상태 | GAP |
|------|----------|-----|
| 환자 등록 | ⚠️ 약국 연결 시 자동 생성 | **약사 직접 등록 폼 미완성** |
| 환자 프로필 편집 (약사) | ❌ | **약사가 환자 정보 수정 불가** |
| 환자 검색 | ✅ 이름/전화번호 | - |
| 환자 필터 | ✅ 위험도 기반 | - |
| 환자 그룹핑 | ❌ | **환자 그룹/태그 기능 없음** |
| 비활성 환자 관리 | ⚠️ 대시보드 통계만 | **비활성 환자 알림/관리 없음** |

---

## 8. 주요 발견 사항

### 8-1. 약사 입력 빈약 문제 (Critical)

약사가 DataTab에서 건강 데이터를 입력할 때 `metricType + value + measuredAt`만 입력 가능.
환자 자가 입력의 `metadata` (식사시점, 복약, 운동, 증상)가 누락되어
**동일 테이블에 저장되지만 데이터 풍부도가 현저히 다름**.

→ 약사 입력 UI에 metadata 필드 추가 필요 (최소: 식사시점)

### 8-2. 환자 등록 폼 미완성

`PharmacyPatients.tsx`에 "고객 등록" 버튼이 있으나 실제 입력 폼 UI가 없음.
약국 연결 승인(`pharmacy-link/approve`)을 통한 자동 생성만 동작.

→ 약사 직접 환자 등록 기능 필요

### 8-3. organization_id NULL 문제 (Known — WO-AI-MULTI-TURN에서 수정)

`glucoseview_customers.organization_id`가 nullable이고 backfill이 불완전.
scope guard에 pharmacist_id fallback 추가로 임시 해결되었으나,
근본적으로 organization_id 채움이 필요.

### 8-4. 이중 환자 테이블 구조

- `glucoseview_customers`: 약국-환자 연결 (pharmacist_id, organization_id 기반)
- `patient_health_profiles`: 환자 건강 프로필 (user_id 기반, 1:1)
- `users`: 환자 계정 (기본 identity)

세 테이블이 각각 다른 키로 환자를 참조 → 조인 복잡성 증가.

### 8-5. CGM 인프라 준비 완료

`CgmProvider` 인터페이스와 `source_type` 필드가 이미 존재.
실제 CGM API 연동만 추가하면 즉시 활성화 가능.

---

## 9. 라우트 맵

### GlucoseView (환자)
```
/patient/
├── index          → PatientMainPage (홈 대시보드)
├── profile        → ProfilePage (건강 프로필 입력/수정)
├── glucose-input  → GlucoseInputPage (혈당+복약+운동+증상 입력)
├── data-analysis  → DataAnalysisPage (혈당 분석 차트)
├── pharmacist-coaching → PharmacistCoachingPage (코칭 열람)
├── select-pharmacy → SelectPharmacyPage (약국 연결)
├── appointments   → AppointmentsPage (상담 예약)
└── care-guideline → CareGuidelinePage (교육 자료)
```

### GlycoPharm (약사)
```
/care/
├── index               → CareDashboardPage (AI 관제탑)
├── patient/:id         → PatientDetailPage (환자 상세)
│   ├── data            → DataTab (건강 데이터 입력/조회)
│   ├── analysis        → AnalysisTab (분석 결과)
│   ├── coaching        → CoachingTab (코칭 관리)
│   └── history         → HistoryTab (통합 타임라인)
├── analysis            → AnalysisPage (혈당 분석)
└── coaching            → CoachingPage (코칭 관리)

/pharmacist/
├── patients            → 환자 목록 (위험도별)
├── patient/:patientId  → 환자 상세 (조회 전용)
├── coaching/:patientId → 코칭 작성
├── appointments        → 예약 관리
└── requests            → 약국 연결 요청 처리
```

---

## 10. API 엔드포인트 전체 목록

### 환자 API
| Method | Endpoint | 용도 |
|--------|----------|------|
| POST | `/care/patient/health-readings` | 혈당 자가 입력 |
| GET | `/care/patient/health-readings` | 내 기록 조회 |
| GET | `/care/patient-profile/me` | 내 건강 프로필 (users+profile+customer 병합) |
| POST | `/care/patient-profile` | 건강 프로필 생성 |
| PUT | `/care/patient-profile` | 건강 프로필 수정 |
| GET | `/care/patient/ai-insight` | 온디맨드 AI 인사이트 (1일 1회 캐시) |
| GET | `/care/appointments/my` | 내 예약 목록 |
| POST | `/care/appointments` | 예약 생성 |
| DELETE | `/care/appointments/:id` | 예약 취소 |
| GET | `/care/pharmacy-link/pharmacies` | 연결 가능 약국 목록 |
| GET | `/care/pharmacy-link/my-status` | 내 연결 상태 |
| POST | `/care/pharmacy-link/request` | 약국 연결 요청 |

### 약사 API
| Method | Endpoint | 용도 |
|--------|----------|------|
| POST | `/care/health-readings` | 건강 데이터 입력 (pharmacy-scoped) |
| GET | `/care/health-readings/:patientId` | 환자 데이터 조회 |
| GET | `/care/coaching` | 전체 코칭 세션 |
| POST | `/care/coaching` | 코칭 세션 생성 |
| GET | `/care/coaching/:patientId` | 환자별 코칭 이력 |
| GET | `/care/coaching-drafts/:patientId` | AI 코칭 초안 조회 |
| POST | `/care/coaching-drafts/:id/approve` | AI 초안 승인 |
| POST | `/care/coaching-drafts/:id/discard` | AI 초안 폐기 |
| GET | `/care/appointments/pharmacy` | 약국 예약 목록 |
| PATCH | `/care/appointments/:id/confirm` | 예약 확정 |
| PATCH | `/care/appointments/:id/reject` | 예약 거절 |
| PATCH | `/care/appointments/:id/complete` | 예약 완료 |
| GET | `/care/pharmacy-link/requests` | 연결 요청 목록 |
| POST | `/care/pharmacy-link/approve` | 연결 승인 |
| POST | `/care/pharmacy-link/reject` | 연결 거절 |
| POST | `/care/ai-chat` | AI 코파일럿 질의 |
| GET | `/care/analysis/:patientId` | 환자 분석 결과 |

---

## 11. 우선순위 개선 제안

| 순위 | 항목 | 영향도 | 난이도 |
|------|------|--------|--------|
| **P1** | 약사 입력 UI에 식사시점(mealTiming) 추가 | 높음 — 분석 품질 직결 | 낮음 |
| **P2** | 약사 직접 환자 등록 폼 완성 | 높음 — 운영 필수 | 중간 |
| **P3** | 환자 자가 혈압/체중 입력 추가 | 중간 — 다중지표 분석 활성화 | 중간 |
| **P4** | organization_id 완전 채움 마이그레이션 | 중간 — scope guard 안정화 | 낮음 |
| **P5** | 실측 HbA1c 입력 기능 | 중간 — 장기 추적 핵심 | 중간 |
| **P6** | 혈압/체중 시계열 차트 | 낮음 — 현재 평균값만 표시 | 중간 |
| **P7** | PDF 리포트 내보내기 | 낮음 — 대면 상담 보조 | 높음 |
| **P8** | CGM 디바이스 연동 | 낮음 — 인프라 준비 완료 | 높음 |

---

*End of Investigation Report*
