# IR-GLUCOSEVIEW-PATIENT-FRONTEND-AUDIT-V1

GlucoseView 환자 서비스 분리 가능성 조사 보고서

---

## Executive Summary

**판정: B — 일부 수정 후 분리 가능**

glycopharm의 환자 모듈은 약사 모듈과 **완전히 독립**되어 있다.
코드 결합도가 매우 낮아, 환자 페이지 + API 클라이언트를 glucoseview로 복사하고
인증 어댑터만 수정하면 분리가 가능하다.

핵심 차이점은 **인증 구조** 하나뿐이다.

---

## 1. 환자 페이지 목록 (glycopharm)

| # | 파일 | 경로 | 설명 | WO |
|---|------|------|------|-----|
| 1 | PatientPlaceholderPage.tsx | `/patient` | 메인 메뉴 (7개 기능) | ENTRY-SCREENS |
| 2 | ProfilePage.tsx | `/patient/profile` | 개인 설정/건강 프로필 | PATIENT-PROFILE |
| 3 | GlucoseInputPage.tsx | `/patient/glucose-input` | 혈당+투약+운동+증상 입력 | GLUCOSE-INPUT + DATA-INPUT-EXPANSION |
| 4 | DataAnalysisPage.tsx | `/patient/data-analysis` | KPI, 변동성, 위험 분류, 차트 | DATA-ANALYSIS |
| 5 | PharmacistCoachingPage.tsx | `/patient/pharmacist-coaching` | 약사 코칭 내역 확인 | COACHING-VIEW |
| 6 | SelectPharmacyPage.tsx | `/patient/select-pharmacy` | 약국 검색/연결 요청 | PHARMACY-LINK |
| 7 | AppointmentsPage.tsx | `/patient/appointments` | 상담 예약 생성/목록/취소 | APPOINTMENT-SYSTEM |
| 8 | CareGuidelinePage.tsx | `/patient/care-guideline` | 당뇨 가이드 (Placeholder) | MAIN-SCREEN |

**총 8개 파일, 8개 라우트**

---

## 2. 환자 API 목록 (patientApi)

Base URL: `import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr'`
인증: `Bearer ${glycopharm_access_token}` (localStorage)

| # | Method | HTTP | Endpoint | 용도 |
|---|--------|------|----------|------|
| 1 | getMyProfile | GET | /api/v1/care/patient-profile/me | 프로필 조회 |
| 2 | createProfile | POST | /api/v1/care/patient-profile | 프로필 생성 |
| 3 | updateProfile | PUT | /api/v1/care/patient-profile | 프로필 수정 |
| 4 | postGlucoseReading | POST | /api/v1/care/patient/health-readings | 혈당 입력 |
| 5 | getGlucoseReadings | GET | /api/v1/care/patient/health-readings | 혈당 조회 |
| 6 | getMyCoaching | GET | /api/v1/care/patient/coaching | 코칭 기록 |
| 7 | getPharmacies | GET | /api/v1/care/pharmacy-link/pharmacies | 약국 목록 |
| 8 | getMyLinkStatus | GET | /api/v1/care/pharmacy-link/my-status | 연결 상태 |
| 9 | requestPharmacyLink | POST | /api/v1/care/pharmacy-link/request | 연결 요청 |
| 10 | getMyAppointments | GET | /api/v1/care/appointments/my | 예약 목록 |
| 11 | createAppointment | POST | /api/v1/care/appointments | 예약 생성 |
| 12 | cancelAppointment | DELETE | /api/v1/care/appointments/{id} | 예약 취소 |

**12개 메서드, 모두 `/api/v1/care/` prefix**

---

## 3. 환자-약사 코드 결합도 분석

### 결합 없음 (Clean Separation)

| 항목 | 결과 |
|------|------|
| 환자→약사 import | **없음** |
| 약사→환자 import | **없음** |
| 공유 커스텀 컴포넌트 | **없음** |
| 공유 유틸리티 | **없음** (riskScore.ts는 약사 전용) |
| 공유 레이아웃 | **없음** (각 페이지 standalone) |
| API 클라이언트 | **완전 분리** (patientApi vs pharmacyApi) |

### 유일한 공유 지점

| 공유 항목 | 내용 | 분리 영향 |
|-----------|------|-----------|
| AuthContext | useAuth() 훅 | **어댑터 필요** |
| lucide-react | 아이콘 라이브러리 | 영향 없음 (npm 패키지) |
| react-router-dom | 라우팅 | 영향 없음 |
| Tailwind CSS | 스타일링 | 영향 없음 |

---

## 4. 인증 구조 비교

| 항목 | glycopharm (현재) | glucoseview (대상) |
|------|-------------------|-------------------|
| 토큰 저장 | localStorage (`glycopharm_access_token`) | httpOnly Cookie |
| 세션 확인 | `GET /api/v1/auth/me` + Bearer | `GET /api/v1/auth/me` + credentials:include |
| 로그인 | `POST /api/v1/auth/login` → tokens JSON | `POST /api/v1/auth/login` → credentials:include |
| API 호출 | Bearer token header | Cookie 기반 |
| 역할 매핑 | `{customer,user,seller} → 'pharmacy'` | `{customer,user,seller,pharmacist} → 'pharmacist'` |

**핵심 차이**: glycopharm patientApi는 `Bearer token`을 사용하고, glucoseview는 `httpOnly cookie`를 사용한다.

**분리 시 필요한 작업**: patientApi의 `getAccessToken()` 호출을 glucoseview의 cookie 기반 인증으로 교체.

---

## 5. glucoseview 현재 상태

### 이미 있는 것

| 항목 | 상태 |
|------|------|
| 인증 시스템 (AuthContext) | 있음 (httpOnly cookie 기반) |
| 역할 가드 (RoleGuard) | 있음 |
| API 클라이언트 (api.ts) | 있음 (care 엔드포인트 포함) |
| 환자 관리 (PatientsPage) | 있음 (약사 관점의 환자 목록) |
| Care 대시보드 (CareDashboardPage) | 있음 (약사 관점) |
| Health readings API | 있음 (getHealthReadings, postHealthReading) |
| Coaching API | 있음 (createCoachingSession, getCoachingSessions) |
| PWA 인프라 | 있음 (WO-GLUCOSEVIEW-PWA-ENABLE-V1) |

### 없는 것 (분리 시 추가 필요)

| 항목 | 설명 |
|------|------|
| 환자 자가입력 UI | 혈당/투약/운동/증상 입력 화면 |
| 환자 메인 메뉴 | 환자용 홈 화면 |
| 환자 프로필 관리 | 환자가 직접 관리하는 건강 프로필 |
| 약국 연결 UI | 약국 검색/연결 요청 화면 |
| 상담 예약 UI | 예약 생성/목록/취소 화면 |
| 데이터 분석 UI | KPI/차트/위험도 화면 |
| 코칭 확인 UI | 약사 코칭 내역 확인 화면 |
| `patient` 역할 | AuthContext에 patient role 추가 필요 |

---

## 6. 의존성 비교

### glycopharm 환자 페이지가 사용하는 의존성

```
react, react-dom, react-router-dom  ← glucoseview에 있음
lucide-react                         ← glucoseview에 있음
@/api/patient.ts                     ← 복사 필요
@/contexts/AuthContext.tsx            ← glucoseview 것 사용 (어댑터 필요)
tailwindcss                          ← glucoseview에 있음
```

**추가 패키지 불필요**. 환자 페이지는 core 패키지(`@o4o/types`, `@o4o/ui` 등)를 사용하지 않는다.

---

## 7. 분리 방법 추천

### 방법: 페이지 복사 + API 어댑터

```
Step 1: glycopharm/src/pages/patient/* → glucoseview/src/pages/patient/
        glycopharm/src/pages/PatientPlaceholderPage.tsx → glucoseview/src/pages/patient/
        (8 파일 복사)

Step 2: glycopharm/src/api/patient.ts → glucoseview/src/api/patient.ts
        (1 파일 복사 + 인증 방식 수정)

Step 3: glucoseview/src/App.tsx에 환자 라우트 8개 추가

Step 4: glucoseview AuthContext에 'patient' 역할 추가

Step 5: patientApi의 Bearer token → cookie 기반 인증 어댑터

Step 6: 환자 라우트에 role guard 적용 (allowedRoles: ['patient'])
```

### 예상 작업량

| 단계 | 작업 | 난이도 |
|------|------|--------|
| 페이지 복사 | 8 파일 복사 | 쉬움 |
| API 클라이언트 | 1 파일 복사 + 인증 수정 | 보통 |
| 라우트 등록 | App.tsx 수정 | 쉬움 |
| 역할 추가 | AuthContext 수정 | 보통 |
| 인증 어댑터 | Bearer → Cookie 변환 | 보통 |
| 테스트 | 8 화면 동작 확인 | 보통 |

**예상 시간: 2~4시간**

---

## 8. 위험 요소

| 위험 | 영향 | 대응 |
|------|------|------|
| 인증 방식 차이 | API 호출 실패 | patientApi에 cookie 기반 request 함수 작성 |
| 토큰 키 충돌 | 두 서비스 동시 사용 시 혼동 | 서비스별 토큰 키 분리 (이미 분리됨) |
| 환자 역할 미정의 | 접근 제어 부재 | glucoseview AuthContext에 'patient' role 매핑 |
| API 경로 동일 | 없음 | 모두 동일 백엔드 사용 (`api.neture.co.kr`) |
| glycopharm에서 환자 코드 제거 | 약사 → 환자 코칭 링크 깨짐 | 분리 후 glycopharm에서 환자 라우트 유지 또는 리다이렉트 |

---

## 9. 아키텍처 결론

```
현재:
  glycopharm.co.kr
    ├── /patient/*    ← 환자 기능 (8 라우트)
    ├── /pharmacist/* ← 약사 기능 (6 라우트)
    └── /care/*       ← 약사 Care (8 라우트)

분리 후:
  glucoseview.co.kr   ← 환자 PWA
    └── /patient/*    ← 환자 기능 (8 라우트)

  glycopharm.co.kr    ← 약사 서비스
    ├── /pharmacist/* ← 약사 기능 (유지)
    └── /care/*       ← 약사 Care (유지)
```

**백엔드 변경 없음** — 동일 API 서버 (`api.neture.co.kr`) 사용.
**인증 서버 동일** — 동일 `/api/v1/auth/*` 엔드포인트 사용.

---

*Audited: 2026-03-13*
*Version: V1*
