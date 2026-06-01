# IR-GLYCOPHARM-BUSINESS-REQUIREMENT-SCREEN-AUDIT-V1

> **GlycoPharm 비즈니스 요구사항 대비 화면/API 구현 감사 보고서**
> Date: 2026-03-13
> Scope: 환자 시스템 + 약사 시스템 + Backend API + DB

---

## 1. Executive Summary

| 영역 | 상태 | 비고 |
|------|------|------|
| 환자 HOME (메인 메뉴) | ✅ IMPLEMENTED | 6개 메뉴 카드형 네비게이션 |
| 환자 개인 설정 관리 | ✅ IMPLEMENTED | 프로필 조회/수정, 투약 정보 |
| 환자 데이터 입력 및 조회 | ⚠️ PARTIAL | 혈당 값 + 식사 시기 + 측정 시간만. 투약/운동/증상/생활변수 미구현 |
| 환자 데이터 분석 확인 | ✅ IMPLEMENTED | 7일/30일 차트, 통계, 구간 분석 |
| 환자 약사 코칭 확인 | ✅ IMPLEMENTED | 코칭 목록 + 상세 보기 |
| 환자 당뇨 케어 가이드라인 | 🔲 PLACEHOLDER | 빈 placeholder 페이지 |
| 환자 약국 연결 | ✅ IMPLEMENTED | 약국 검색/선택/요청/상태 표시 |
| 환자 예약/방문 관리 | ❌ MISSING | API/UI 모두 없음 |
| 약사 HOME (메인 메뉴) | ✅ IMPLEMENTED | 3개 버튼 + 로그아웃 |
| 약사 환자 관리 | ✅ IMPLEMENTED | 환자 목록, 상세 화면 (메트릭 + 탭) |
| 약사 코칭 작성 | ✅ IMPLEMENTED | 코칭 노트 생성/이력 조회 |
| 약사 연결 요청 관리 | ✅ IMPLEMENTED | 승인/거절 (사유 포함) |
| 약사 Care 대시보드 | ✅ IMPLEMENTED | 알림/인구통계/우선환자/관리상태 |
| 약사 분석 탭 (환자 상세) | 🔲 PLACEHOLDER | CarePatientPage 내 분석 탭 미구현 |
| 예약/방문 시스템 | ❌ MISSING | 전체 미구현 |
| 케어 가이드 콘텐츠 | ❌ MISSING | 데이터/콘텐츠 없음 |

**종합**: 핵심 기능(혈당 기록, 환자-약사 연결, 코칭, 대시보드)은 구현 완료.
3대 미구현 영역: **예약/방문 시스템**, **케어 가이드라인 콘텐츠**, **데이터 입력 확장(투약·운동·증상)**.

---

## 2. Screen Implementation Table — 환자 시스템

| # | 화면 | 상태 | 파일 | 라우트 | 비고 |
|---|------|------|------|--------|------|
| P1 | 환자 메인 화면 | ✅ | `pages/PatientPlaceholderPage.tsx` | `/patient` | 6개 메뉴 카드: 약국연결, 개인설정, 데이터입력, 분석, 코칭, 가이드라인 |
| P2 | 개인 설정 관리 | ✅ | `pages/patient/PatientProfilePage.tsx` | `/patient/profile` | 이름/이메일/전화/생년월일/당뇨유형/진단일/투약정보/알레르기 |
| P3 | 데이터 입력 및 조회 | ⚠️ | `pages/patient/GlucoseInputPage.tsx` | `/patient/glucose-input` | **입력**: 혈당 값(mg/dL), 식사 시기(식전/식후/취침전/기타), 측정 시간, 메모. **미구현**: 투약 기록, 운동 기록, 증상/컨디션, 생활 변수 |
| P4 | 데이터 분석 확인 | ✅ | `pages/patient/DataAnalysisPage.tsx` | `/patient/data-analysis` | 7일/30일 차트, 평균/최저/최고, 목표 범위 비율, 구간별 분석, 최근 기록 목록 |
| P5 | 약사 코칭 확인 | ✅ | `pages/patient/PharmacistCoachingPage.tsx` | `/patient/pharmacist-coaching` | 코칭 노트 목록 + 개별 상세 조회, 카테고리별 아이콘 |
| P6 | 당뇨 케어 가이드라인 | 🔲 | `pages/patient/CareGuidelinePage.tsx` | `/patient/care-guideline` | **Placeholder only** — "준비 중" 메시지만 표시. 콘텐츠/API 없음 |
| P7 | 약국 연결 | ✅ | `pages/patient/SelectPharmacyPage.tsx` | `/patient/select-pharmacy` | 5단계 UI: 약국 목록→선택→메시지→전송→완료. 이미 연결/대기 상태 자동 표시 |
| P8 | 예약/방문 관리 | ❌ | — | — | **전체 미구현**. 페이지/라우트/API 없음 |

### P3 데이터 입력 상세 Gap 분석

| 입력 항목 | 상태 | 비고 |
|-----------|------|------|
| 혈당 값 (mg/dL) | ✅ | `value` 필드, 숫자 입력 |
| 식사 시기 (meal timing) | ✅ | `mealTiming`: before_meal, after_meal, before_bed, other |
| 측정 시간 | ✅ | `measuredAt`: datetime-local |
| 메모 | ✅ | `notes`: 자유 텍스트 |
| 투약 기록 (약물명/용량/시간) | ❌ | UI/API 없음 |
| 운동 기록 (종류/시간/강도) | ❌ | UI/API 없음 |
| 증상/컨디션 | ❌ | UI/API 없음 |
| 식사 상세 (탄수화물량 등) | ❌ | UI/API 없음 |
| 체중/혈압 | ❌ | UI/API 없음 |

> **참고**: Backend `care_health_readings` 테이블은 `metric_type` + `metadata` JSONB 컬럼으로 설계되어 있어, 스키마 변경 없이 다양한 건강 지표 확장 가능. 현재 UI에서 glucose만 지원.

---

## 3. Screen Implementation Table — 약사 시스템

| # | 화면 | 상태 | 파일 | 라우트 | 비고 |
|---|------|------|------|--------|------|
| D1 | 약사 메인 화면 | ✅ | `pages/PharmacistPlaceholderPage.tsx` | `/pharmacist` | 환자관리, 연결요청, Care대시보드, 로그아웃 |
| D2 | 환자 목록 | ✅ | `pages/pharmacist/PharmacistPatientsPage.tsx` | `/pharmacist/patients` | glucoseview_customers 기반, 동의상태/최근활동 표시 |
| D3 | 환자 상세 | ✅ | `pages/pharmacist/PharmacistPatientDetailPage.tsx` | `/pharmacist/patient/:patientId` | 환자 메트릭(최근혈당/평균/기록수) + 3탭(기록/코칭/분석) |
| D4 | 코칭 작성 | ✅ | (Care 시스템 내) | `/care/patient/:id` | CarePatientPage 코칭 탭에서 노트 작성, 카테고리 선택 |
| D5 | 연결 요청 관리 | ✅ | `pages/pharmacist/PatientRequestsPage.tsx` | `/pharmacist/patient-requests` | 승인/거절, 거절 사유 인라인 입력 |
| D6 | Care 대시보드 | ✅ | (Care 모듈) | `/care` | 알림(미확인 혈당), 인구 통계, 우선 관리 환자, 관리 상태 차트 |
| D7 | 환자 상세 분석 탭 | 🔲 | `PharmacistPatientDetailPage.tsx` | — | 분석 탭 exists but "준비 중" placeholder |
| D8 | 예약 관리 | ❌ | — | — | **전체 미구현** |
| D9 | 약사 가이드 | ❌ | — | — | **전체 미구현** |

---

## 4. API Implementation Table

### 4-A. Care Health Readings (혈당 기록)

| Endpoint | Method | 상태 | Controller |
|----------|--------|------|------------|
| `/api/v1/care/health-readings` | POST | ✅ | `care-health-readings.controller.ts` |
| `/api/v1/care/health-readings` | GET | ✅ | `care-health-readings.controller.ts` |
| `/api/v1/care/health-readings/stats` | GET | ✅ | `care-health-readings.controller.ts` |
| `/api/v1/care/health-readings/recent` | GET | ✅ | `care-health-readings.controller.ts` |

### 4-B. Care Coaching (코칭 노트)

| Endpoint | Method | 상태 | Controller |
|----------|--------|------|------------|
| `/api/v1/care/patient-coaching/pharmacist/:patientId/notes` | GET | ✅ | `patient-coaching.controller.ts` |
| `/api/v1/care/patient-coaching/pharmacist/:patientId/notes` | POST | ✅ | `patient-coaching.controller.ts` |
| `/api/v1/care/patient-coaching/patient/notes` | GET | ✅ | `patient-coaching.controller.ts` |
| `/api/v1/care/patient-coaching/patient/notes/:id` | GET | ✅ | `patient-coaching.controller.ts` |

### 4-C. Pharmacy Link (약국 연결)

| Endpoint | Method | 상태 | Controller |
|----------|--------|------|------------|
| `/api/v1/care/pharmacy-link/pharmacies` | GET | ✅ | `pharmacy-link.controller.ts` |
| `/api/v1/care/pharmacy-link/my-status` | GET | ✅ | `pharmacy-link.controller.ts` |
| `/api/v1/care/pharmacy-link/request` | POST | ✅ | `pharmacy-link.controller.ts` |
| `/api/v1/care/pharmacy-link/requests` | GET | ✅ | `pharmacy-link.controller.ts` |
| `/api/v1/care/pharmacy-link/approve` | POST | ✅ | `pharmacy-link.controller.ts` |
| `/api/v1/care/pharmacy-link/reject` | POST | ✅ | `pharmacy-link.controller.ts` |

### 4-D. Care Dashboard & Patient Management

| Endpoint | Method | 상태 | Controller |
|----------|--------|------|------------|
| `/api/v1/care/alerts` | GET | ✅ | `care-alert.controller.ts` |
| `/api/v1/care/alerts/:id/acknowledge` | PATCH | ✅ | `care-alert.controller.ts` |
| `/api/v1/care/patients` | GET | ✅ | `care-patient.controller.ts` |
| `/api/v1/care/patients/:id` | GET | ✅ | `care-patient.controller.ts` |
| `/api/v1/care/patients/:id/readings` | GET | ✅ | `care-patient.controller.ts` |
| `/api/v1/care/dashboard/summary` | GET | ✅ | `care-dashboard.controller.ts` |
| `/api/v1/care/dashboard/population` | GET | ✅ | `care-dashboard.controller.ts` |
| `/api/v1/care/dashboard/priority-patients` | GET | ✅ | `care-dashboard.controller.ts` |

### 4-E. Patient Profile

| Endpoint | Method | 상태 | Controller |
|----------|--------|------|------------|
| `/api/v1/care/patient-profile` | GET | ✅ | `patient-profile.controller.ts` |
| `/api/v1/care/patient-profile` | PUT | ✅ | `patient-profile.controller.ts` |

### 4-F. 미구현 API

| 영역 | 예상 Endpoint | 상태 |
|------|---------------|------|
| 예약/방문 | `/api/v1/care/appointments` | ❌ MISSING |
| 예약/방문 | `/api/v1/care/appointments/:id` | ❌ MISSING |
| 케어 가이드라인 | `/api/v1/care/guidelines` | ❌ MISSING |
| 투약 기록 | `/api/v1/care/medications` | ❌ MISSING |
| 운동 기록 | `/api/v1/care/exercise` | ❌ MISSING |
| 증상 기록 | `/api/v1/care/symptoms` | ❌ MISSING |

---

## 5. DB Table Implementation

| # | 테이블 | 상태 | 용도 |
|---|--------|------|------|
| 1 | `glucoseview_customers` | ✅ | 환자-약국 연결 (canonical link) |
| 2 | `care_health_readings` | ✅ | 건강 지표 기록 (metric_type + metadata JSONB) |
| 3 | `care_coaching_notes` | ✅ | 약사 코칭 노트 |
| 4 | `care_alerts` | ✅ | 혈당 알림 (고혈당/저혈당) |
| 5 | `care_patient_profiles` | ✅ | 환자 프로필 (당뇨 유형, 투약 정보) |
| 6 | `care_pharmacy_link_requests` | ✅ | 약국 연결 요청 |
| 7 | `care_population_stats` | ✅ | 인구 통계 캐시 |
| 8 | `care_ai_config` | ✅ | AI 분석 설정 |
| 9 | `care_appointments` | ❌ | **미생성** — 예약 시스템 없음 |
| 10 | `care_medications` | ❌ | **미생성** — 투약 기록 없음 |

---

## 6. 라우트 등록 현황

### 환자 라우트 (`/patient/*`)

| 라우트 | 컴포넌트 | 등록 |
|--------|----------|------|
| `/patient` | `PatientMainPage` | ✅ App.tsx |
| `/patient/profile` | `PatientProfilePage` | ✅ App.tsx |
| `/patient/glucose-input` | `GlucoseInputPage` | ✅ App.tsx |
| `/patient/data-analysis` | `DataAnalysisPage` | ✅ App.tsx |
| `/patient/pharmacist-coaching` | `PharmacistCoachingPage` | ✅ App.tsx |
| `/patient/care-guideline` | `CareGuidelinePage` | ✅ App.tsx |
| `/patient/select-pharmacy` | `SelectPharmacyPage` | ✅ App.tsx |

### 약사 라우트 (`/pharmacist/*`)

| 라우트 | 컴포넌트 | 등록 |
|--------|----------|------|
| `/pharmacist` | `PharmacistPlaceholderPage` | ✅ App.tsx |
| `/pharmacist/patients` | `PharmacistPatientsPage` | ✅ App.tsx |
| `/pharmacist/patient/:patientId` | `PharmacistPatientDetailPage` | ✅ App.tsx |
| `/pharmacist/patient-requests` | `PatientRequestsPage` | ✅ App.tsx |

### Care 라우트 (`/care/*`)

| 라우트 | 컴포넌트 | 등록 |
|--------|----------|------|
| `/care` | `CareDashboard` | ✅ App.tsx |
| `/care/patient/:id` | `CarePatientPage` | ✅ App.tsx |

---

## 7. Gap Summary — 우선순위별

### Priority 1 — 핵심 비즈니스 기능 부재

| Gap | 영향도 | 구현 규모 |
|-----|--------|-----------|
| **예약/방문 시스템** | 높음 — 약사-환자 대면 관리 불가 | 신규 테이블 + API 4~6개 + UI 2페이지 |
| **케어 가이드라인 콘텐츠** | 중간 — 환자 교육 자료 없음 | 콘텐츠 데이터 + API + UI 연동 |

### Priority 2 — 기존 기능 확장

| Gap | 영향도 | 구현 규모 |
|-----|--------|-----------|
| **데이터 입력 확장** (투약/운동/증상) | 중간 — 종합적 건강 관리 불가 | UI 탭 추가 + API 메서드 (DB 스키마 변경 불필요 — metadata JSONB 활용) |
| **약사 분석 탭** | 낮음 — 환자 개별 상세에서 분석 placeholder | UI 구현 (API 대부분 존재) |

### Priority 3 — Nice to Have

| Gap | 영향도 | 구현 규모 |
|-----|--------|-----------|
| 알림/푸시 | 낮음 | 인프라 의존 |
| 약사 가이드 페이지 | 낮음 | 콘텐츠 의존 |

---

## 8. Architecture Notes

### 8-A. 환자-약국 연결 구조 (정상)
```
care_pharmacy_link_requests (요청)
  → approve → INSERT glucoseview_customers (canonical link)
  → 기존 Care 시스템 자동 연동 (환자목록, 코칭, 알림, 대시보드)
```

### 8-B. 건강 데이터 구조 (확장 가능)
```
care_health_readings
  metric_type: 'glucose' | 확장 가능
  metadata: JSONB (mealTiming, notes 등)
  → UI에서 glucose만 지원, 스키마는 다중 지표 대응
```

### 8-C. Boundary Policy 준수 현황
- ✅ 모든 약사 쿼리: `pharmacy_id` (organization_id) 스코핑
- ✅ 모든 환자 쿼리: `user.email` 또는 `user.id` 스코핑
- ✅ Raw SQL: 파라미터 바인딩 사용
- ✅ Admin (pharmacyId 없음): 전체 조회 fallback 제공

---

*End of Report*
*IR-GLYCOPHARM-BUSINESS-REQUIREMENT-SCREEN-AUDIT-V1*
