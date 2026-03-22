# IR-O4O-GLUCOSEVIEW-FUNCTION-STATE-AUDIT-V1

> **GlucoseView 기능 현황 감사 보고서**
>
> 작성일: 2026-03-21
> 목적: GlucoseView의 현재 기능 상태를 실제 코드와 화면 기준으로 조사
> 범위: 환자 입력, 조회, 로그인 이후 흐름, GlycoPharm과의 역할 분리

---

## 1. 최종 결론

### GlucoseView는 환자 전용 혈당 관리 서비스로, 기본 기능은 대부분 구현 완료 상태다.

| 질문 | 답변 |
|------|------|
| GlucoseView에서 환자 입력 기능이 실제로 존재하는가? | **YES** — 혈당/투약/운동/증상 입력 모두 존재 |
| 존재한다면 어디까지 동작하는가? | 혈당은 완전 동작, 투약/운동/증상은 **GlycoPharm과 동일한 UX 문제** (접이식 기본 닫힘) |
| 현재 문제의 본질은? | **서비스 혼선** + **GlycoPharm과 동일한 UX 결함 공유** |
| GlycoPharm와의 관계는? | **동일 백엔드(Care 모듈) 공유**, 환자 페이지도 거의 동일 코드 |

### 서비스 역할 정의

| 서비스 | 대상 | 핵심 역할 |
|--------|------|----------|
| **GlycoPharm** | 약사 중심 | 약사가 환자를 관리하는 약국 운영 도구 |
| **GlucoseView** | 환자 중심 | 환자가 직접 혈당을 기록하고 분석하는 자기관리 도구 |

---

## 2. 기능 상태 표

### 2.1 환자용 기능

| # | 기능명 | 화면 존재 | 진입 가능 | API 연결 | 저장/조회 | 최종 상태 | 비고 |
|---|--------|:---------:|:---------:|:--------:|:---------:|:---------:|------|
| 1 | **혈당 입력** | ✅ | ✅ | ✅ | ✅ | **정상 동작** | `GlucoseInputPage.tsx` |
| 2 | **투약 입력** | ✅ (접이식) | ⚠️ 확장 필요 | ✅ | ✅ (확장 시) | **UX 문제** | GlycoPharm과 동일 문제 |
| 3 | **운동 입력** | ✅ (접이식) | ⚠️ 확장 필요 | ✅ | ✅ (확장 시) | **UX 문제** | GlycoPharm과 동일 문제 |
| 4 | **증상 입력** | ✅ (접이식) | ⚠️ 확장 필요 | ✅ | ✅ (확장 시) | **UX 문제** | GlycoPharm과 동일 문제 |
| 5 | **건강 기록 조회** | ✅ | ✅ | ✅ | ✅ | **정상 동작** | 입력 페이지 하단 최근 기록 |
| 6 | **데이터 분석** | ✅ | ✅ | ✅ | ✅ | **정상 동작** | TIR, 변동성, SVG 차트, AI 인사이트 |
| 7 | **환자 프로필** | ✅ | ✅ | ✅ | ✅ | **정상 동작** | 당뇨 유형, 치료법, 목표 혈당 등 |
| 8 | **약국 연결** | ✅ | ✅ | ✅ | ✅ | **정상 동작** | 약국 검색 + 연결 요청 + 상태 추적 |
| 9 | **약사 코칭 확인** | ✅ | ✅ | ✅ | ✅ | **정상 동작** | 연결된 약사의 코칭 기록 조회 |
| 10 | **상담 예약** | ✅ | ✅ | ✅ | ✅ | **정상 동작** | 예약 생성/취소/상태 추적 |
| 11 | **AI 인사이트** | ✅ | ✅ | ✅ | ✅ | **정상 동작** | 대시보드 + 분석 페이지에 통합 |
| 12 | **케어 가이드라인** | ⚠️ 플레이스홀더 | ✅ | ❌ | ❌ | **미구현** | "이 페이지는 준비 중입니다" |

### 2.2 운영자/약사용 기능

| # | 기능명 | 화면 존재 | API 연결 | 최종 상태 |
|---|--------|:---------:|:--------:|:---------:|
| 1 | **오퍼레이터 대시보드** | ✅ | ✅ | **정상 동작** — 5-Block 통합 레이아웃 |
| 2 | **사용자 관리** | ✅ | ✅ | **정상 동작** — CRUD + 상태 관리 |
| 3 | **서비스 신청 관리** | ✅ | ✅ | **정상 동작** — 승인/거절 워크플로 |
| 4 | **상품 관리** | ✅ | ✅ | **정상 동작** |
| 5 | **매장 관리** | ✅ | ✅ | **정상 동작** |
| 6 | **AI 리포트** | ✅ | ✅ | **정상 동작** |
| 7 | **분석 대시보드** | ✅ | ✅ | **정상 동작** |
| 8 | **역할 관리** | ✅ | ✅ | **정상 동작** |

---

## 3. 사용자 흐름 표

### 3.1 환자 기본 흐름

| # | 단계 | 화면 | 가능한 행동 | 동작 여부 | 문제 여부 |
|---|------|------|-----------|:---------:|:---------:|
| 1 | 랜딩 | `PatientLandingPage` | 로그인/회원가입/테스트 로그인 | ✅ | 없음 |
| 2 | 로그인 | `LoginPage` | 이메일+비밀번호, 테스트 계정 자동 입력 | ✅ | 없음 |
| 3 | 대시보드 | `PatientMainPage` | 혈당 입력, 최근 기록, AI 인사이트, 약사 코칭, 빠른 메뉴 | ✅ | 없음 |
| 4 | 혈당 입력 | `GlucoseInputPage` | 혈당값 + 투약/운동/증상 입력 | ✅ | **UX 문제** — 접이식 기본 닫힘 |
| 5 | 저장 | POST /care/patient/health-readings | 데이터 저장 | ✅ | 없음 |
| 6 | 기록 확인 | `GlucoseInputPage` 하단 | 최근 기록 목록 | ✅ | 없음 |
| 7 | 분석 | `DataAnalysisPage` | 7/14/30일 분석, TIR, AI 인사이트 | ✅ | 투약/운동/증상 미표시 |
| 8 | 프로필 | `ProfilePage` | 건강 프로필 생성/수정 | ✅ | 없음 |
| 9 | 약국 연결 | `SelectPharmacyPage` | 약국 검색 + 연결 요청 | ✅ | 없음 |
| 10 | 코칭 확인 | `PharmacistCoachingPage` | 약사 코칭 기록 조회 | ✅ | 없음 |
| 11 | 예약 | `AppointmentsPage` | 상담 예약 생성/취소 | ✅ | 없음 |

### 3.2 인증 흐름

```
비인증 사용자 → / (랜딩) → /login → 로그인 성공 → /patient (대시보드)
                                → 로그인 실패 → 에러 메시지
                                → 비환자 역할 → "GlucoseView는 당뇨인 전용 서비스입니다" 에러

승인 대기 → /pending (대기 화면)
테스트 로그인 → patient_test@glycopharm.co.kr / O4oTestPass@1
```

**환자 전용 정책**: 환자(patient/user/customer) 이외의 역할로 로그인 시 토큰 정리 후 접근 차단.

---

## 4. 코드 구조 요약

### 4.1 프로젝트 규모

| 항목 | 수량 |
|------|:----:|
| 페이지 파일 (.tsx) | **40개** |
| 컴포넌트 | **13개** |
| API 파일 | **2개** (api/patient.ts + services/api.ts) |
| 라우트 경로 | **35+개** |

### 4.2 라우트 구조

```
/ ─────────────────────── HomeRedirect (인증 시 /patient로 리다이렉트)
├── /login               LoginPage
├── /register            RegisterPage (약사 등록)
├── /handoff             HandoffPage (SSO/OAuth)
├── /forgot-password     AccountRecoveryPage
├── /reset-password      ResetPasswordPage
├── /about               AboutPage
├── /apply               ApplyPage (서비스 신청)
├── /pending             PendingPage (승인 대기)
│
├── /patient ──── [PatientAuthGuard + PatientLayout] ────
│   ├── /patient              PatientMainPage (대시보드)
│   ├── /patient/profile      ProfilePage
│   ├── /patient/glucose-input  GlucoseInputPage ★
│   ├── /patient/data-analysis  DataAnalysisPage
│   ├── /patient/pharmacist-coaching  PharmacistCoachingPage
│   ├── /patient/select-pharmacy     SelectPharmacyPage
│   ├── /patient/appointments        AppointmentsPage
│   └── /patient/care-guideline      CareGuidelinePage (플레이스홀더)
│
├── /operator ──── [OperatorRoute] ────
│   ├── /operator             GlucoseViewOperatorDashboard
│   ├── /operator/users       UsersPage
│   ├── /operator/applications  ApplicationsPage
│   ├── /operator/products    ProductsPage
│   ├── /operator/stores      StoresPage
│   ├── /operator/ai-report   AiReportPage
│   ├── /operator/analytics   AnalyticsPage
│   └── /operator/roles       RoleManagementPage
│
├── /store ──── [ProtectedRoute] ────
│   └── /store               StoreOverviewPage
│
├── /admin               AdminPage [RoleGuard admin]
├── /dashboard           DashboardPage [ProtectedRoute]
├── /patients            PatientsPage [ProtectedRoute]
├── /insights            InsightsPage [ProtectedRoute]
└── /settings            SettingsPage [ProtectedRoute]
```

### 4.3 API 클라이언트 구조

| 파일 | 역할 | 엔드포인트 수 |
|------|------|:------------:|
| `lib/apiClient.ts` | AuthClient 인스턴스 (localStorage 전략) | — |
| `api/patient.ts` | 환자 전용 API (patient context) | **15+** |
| `services/api.ts` | 약사/운영자 API (care + glucoseview) | **30+** |

### 4.4 주요 페이지 파일

**환자 페이지:**

| 파일 | 경로 | 역할 |
|------|------|------|
| [PatientMainPage.tsx](services/web-glucoseview/src/pages/patient/PatientMainPage.tsx) | `/patient` | 환자 대시보드 |
| [GlucoseInputPage.tsx](services/web-glucoseview/src/pages/patient/GlucoseInputPage.tsx) | `/patient/glucose-input` | 혈당 + 투약/운동/증상 입력 |
| [DataAnalysisPage.tsx](services/web-glucoseview/src/pages/patient/DataAnalysisPage.tsx) | `/patient/data-analysis` | 데이터 분석 (TIR, 차트) |
| [ProfilePage.tsx](services/web-glucoseview/src/pages/patient/ProfilePage.tsx) | `/patient/profile` | 건강 프로필 관리 |
| [SelectPharmacyPage.tsx](services/web-glucoseview/src/pages/patient/SelectPharmacyPage.tsx) | `/patient/select-pharmacy` | 약국 연결 |
| [PharmacistCoachingPage.tsx](services/web-glucoseview/src/pages/patient/PharmacistCoachingPage.tsx) | `/patient/pharmacist-coaching` | 코칭 기록 조회 |
| [AppointmentsPage.tsx](services/web-glucoseview/src/pages/patient/AppointmentsPage.tsx) | `/patient/appointments` | 상담 예약 |
| [CareGuidelinePage.tsx](services/web-glucoseview/src/pages/patient/CareGuidelinePage.tsx) | `/patient/care-guideline` | 케어 가이드 (플레이스홀더) |

---

## 5. 끊김 가능성 조사 결과

| # | 유형 | 해당 여부 | 상세 |
|---|------|:---------:|------|
| 1 | **원래 기능이 구현되지 않음** | ⚠️ 1건 | `CareGuidelinePage` — 플레이스홀더 |
| 2 | 화면은 있으나 라우팅이 끊김 | ❌ 없음 | 모든 라우트 정상 연결 |
| 3 | 화면은 있으나 API가 연결되지 않음 | ❌ 없음 | 모든 구현 페이지 API 연결 확인 |
| 4 | API는 있으나 저장/조회가 안 됨 | ❌ 없음 | 공유 Care 모듈 백엔드 정상 |
| 5 | 권한/인증 문제로 진입 불가 | ❌ 없음 | PatientAuthGuard → 환자 역할 정상 통과 |
| 6 | 테스트 계정/운영 계정 차이 | ❌ 없음 | 동일 인증 흐름 |
| 7 | 배포 누락 또는 구버전 반영 | ❌ 없음 | main 브랜치 최신 배포 확인 |
| 8 | **GlycoPharm과 역할 혼선** | ✅ **핵심 이슈** | 아래 상세 |
| 9 | **투약/운동/증상 UX 문제** | ✅ **핵심 이슈** | GlycoPharm과 동일 — 접이식 기본 닫힘 |

---

## 6. GlycoPharm과의 비교 조사

### 6.1 역할 차이

| 구분 | GlycoPharm | GlucoseView |
|------|-----------|-------------|
| **대상 사용자** | 약사 중심 (환자 관리) | 환자 중심 (자기 관리) |
| **로그인 기본 역할** | pharmacist / seller | patient / user / customer |
| **비환자 로그인** | 허용 (약사/관리자) | **차단** ("당뇨인 전용 서비스") |
| **모바일 최적화** | 데스크톱 우선 | **모바일 우선** (하단 네비게이션) |
| **약사 기능** | ✅ 환자 목록/상세/코칭/예약 관리 | ❌ 없음 (환자 전용) |
| **운영자 대시보드** | ✅ | ✅ (5-Block 통합) |

### 6.2 기능 비교

| 기능 | GlycoPharm | GlucoseView | 비고 |
|------|:---------:|:-----------:|------|
| **혈당 입력 (환자)** | ✅ | ✅ | 동일 코드 패턴 |
| **투약/운동/증상 입력** | ✅ (UX 문제) | ✅ (UX 문제) | **동일 UX 결함 공유** |
| **데이터 분석** | ✅ | ✅ | 동일 패턴 |
| **환자 프로필** | ✅ | ✅ | 동일 |
| **약국 연결** | ✅ | ✅ | 동일 |
| **상담 예약** | ✅ | ✅ | 동일 |
| **약사 코칭 조회** | ✅ | ✅ | 동일 |
| **AI 인사이트** | ❌ | ✅ | **GlucoseView에만 있음** |
| **환자 대시보드 (모바일)** | ✅ (기본형) | ✅ (풍부) | GlucoseView가 더 완성도 높음 |
| **약사 환자 관리** | ✅ | ❌ | GlycoPharm에만 있음 |
| **약사 코칭 작성** | ✅ | ❌ | GlycoPharm에만 있음 |
| **Care 워크스페이스** | ✅ | ❌ | GlycoPharm에만 있음 |
| **테스트 로그인** | ✅ | ✅ | GlucoseView에 버튼 UI |
| **케어 가이드라인** | ✅ (플레이스홀더) | ✅ (플레이스홀더) | 둘 다 미구현 |

### 6.3 공유 백엔드

```
┌─────────────┐     ┌──────────────┐
│ GlycoPharm  │     │ GlucoseView  │
│ (약사 중심) │     │ (환자 중심)  │
└──────┬──────┘     └──────┬───────┘
       │                   │
       │   ┌───────────────┘
       │   │
       ▼   ▼
┌──────────────────────────────────┐
│   /api/v1/care/*  (공유 모듈)   │
│   - health_readings             │
│   - care_coaching_sessions      │
│   - care_appointments           │
│   - care_pharmacy_link_requests │
│   - patient_health_profiles     │
└──────────────────────────────────┘
       │                   │
       ▼                   ▼
┌──────────────┐   ┌──────────────────┐
│ /glycopharm  │   │ /glucoseview     │
│ (약사 전용)  │   │ (서비스 전용)    │
│ - customers  │   │ - applications   │
│ - pharmacy   │   │ - pharmacists    │
└──────────────┘   │ - customers      │
                   │ - pharmacies     │
                   └──────────────────┘
```

**핵심**: 환자 입력(`POST /care/patient/health-readings`)은 **완전히 동일한 백엔드 엔드포인트**를 공유한다. 프론트엔드 `GlucoseInputPage.tsx`도 거의 동일한 코드 구조를 사용한다.

### 6.4 사용자 혼동 가능 지점

| # | 혼동 지점 | 상세 |
|---|----------|------|
| 1 | **두 서비스의 환자 입력 페이지가 거의 동일** | GlycoPharm `/patient/glucose-input` ≈ GlucoseView `/patient/glucose-input` |
| 2 | **같은 데이터가 양쪽에 저장** | 동일 `health_readings` 테이블 사용 |
| 3 | **서비스 이름이 유사** | "GlycoPharm" vs "GlucoseView" — 둘 다 혈당 관련 |
| 4 | **테스트 계정 공유** | `patient_test@glycopharm.co.kr` — GlycoPharm 도메인이지만 GlucoseView에서도 사용 |
| 5 | **어느 서비스에서 입력해야 하는지 불명확** | 환자는 GlucoseView, 약사는 GlycoPharm이지만 명시적 안내 없음 |

---

## 7. 투약/운동/증상 UX 문제 (GlycoPharm과 공유)

GlucoseView의 `GlucoseInputPage.tsx`는 GlycoPharm과 **동일한 UX 결함**을 가지고 있다:

| 문제 | 코드 | 영향 |
|------|------|------|
| 접이식 기본 닫힘 | `useState(false)` | 사용자가 투약/운동/증상 입력 존재를 모름 |
| 저장 조건이 확장 상태에 의존 | `if (medOpen && medName.trim())` | 섹션 미확장 시 데이터 저장 안 됨 |
| 혈당 입력 필수 | 검증 로직 | 투약만 단독 저장 불가 |
| 시각적 단서 부재 | 얇은 헤더 + ChevronDown만 | 클릭 가능한 버튼으로 인식 안 됨 |

**참조**: IR-O4O-GLYCOPHARM-PATIENT-INPUT-RUNTIME-VERIFY-V1 보고서에 상세 분석 포함.

---

## 8. 배포 및 환경 정보

| 항목 | 값 |
|------|------|
| 배포 서비스 | Cloud Run (`glucoseview-web`) |
| 배포 브랜치 | `main` |
| 프론트엔드 빌드 | Vite + TypeScript |
| API 서버 | `o4o-core-api` (공유) |
| 인증 전략 | localStorage (`o4o_accessToken`) |
| CORS 도메인 | `glucoseview.co.kr`, `www.glucoseview.co.kr` |
| 페이지 수 | 40개 (.tsx) |
| 컴포넌트 수 | 13개 |
| 최근 커밋 | `3c50db2` (dead code cleanup) |

### 최근 주요 커밋

| 커밋 | 내용 |
|------|------|
| `2db8a37` | 환자 → 당뇨인 용어 통일 |
| `814e91d` | user/customer 역할 → patient 매핑 추가 |
| `cd9904b` | WO-O4O-GLUCOSEVIEW-PATIENT-ENTRY-FLOW-V1 |
| `61d0a38` | patient-only access 강제 적용 |
| `e114241` | auth-client passwordSync + token helper |

---

## 9. 문제 분류 요약

### 미구현

| # | 항목 | 설명 |
|---|------|------|
| 1 | 케어 가이드라인 | `CareGuidelinePage` — "준비 중" 플레이스홀더 |
| 2 | CGM 기기 데이터 동기화 | LibreView/Dexcom 커넥터 — UI는 있으나 실제 연동 미구현 |

### UX 혼선

| # | 항목 | 설명 |
|---|------|------|
| 1 | **투약/운동/증상 접이식 숨김** | GlycoPharm과 동일 문제 — 사용자 발견 불가 |
| 2 | **서비스 역할 혼선** | 환자가 GlycoPharm과 GlucoseView 중 어디서 입력해야 하는지 불명확 |
| 3 | **분석 페이지 metadata 미표시** | 투약/운동/증상 저장 후 분석 화면에서 보이지 않음 |

### 연결 끊김

없음 — 모든 구현 페이지의 라우팅/API/저장/조회 정상 동작 확인.

### 배포 문제

없음 — main 브랜치 최신 코드 배포 확인.

### 권한 문제

없음 — 환자 역할 가드 정상 동작. 비환자 역할 적절히 차단.

---

## 10. GlucoseView 고유 강점 (GlycoPharm 대비)

GlucoseView에는 GlycoPharm에 없는 기능이 존재한다:

| # | 기능 | 설명 |
|---|------|------|
| 1 | **AI 인사이트** | 대시보드 + 분석 페이지에 AI 생성 요약/경고/팁 통합 |
| 2 | **모바일 하단 네비게이션** | `MobileBottomNav` 컴포넌트 — 모바일 환자 UX 최적화 |
| 3 | **환자 대시보드 완성도** | 환영 메시지, 약국 연결 상태, 오늘 요약, AI 인사이트, 코칭 프리뷰, 빠른 메뉴 |
| 4 | **테스트 로그인 버튼** | 랜딩 페이지에 테스트 계정 자동 입력 지원 |
| 5 | **서비스 신청 워크플로** | 약국/약사 서비스 가입 신청 + 관리자 승인 흐름 |
| 6 | **서비스 스위처** | 여러 O4O 서비스 간 전환 UI |

---

## 11. 최종 결론 및 권장 사항

### 결론

1. **GlucoseView의 기능은 대부분 구현 완료되어 있다.** 40개 페이지 중 39개가 실제 동작하는 구현이며, 1개만 플레이스홀더다.

2. **환자 입력 기능은 기술적으로 동작한다.** 혈당/투약/운동/증상 모두 코드가 존재하고 API도 연결되어 있다.

3. **문제의 본질은 두 가지다:**
   - **UX 결함**: 투약/운동/증상 접이식 섹션이 기본 닫혀 있어 사용자가 발견하지 못함 (GlycoPharm과 동일 코드 공유로 인한 동일 결함)
   - **서비스 혼선**: GlycoPharm(약사용)과 GlucoseView(환자용)의 역할 구분이 사용자에게 명확하지 않음

4. **GlucoseView는 GlycoPharm보다 환자 UX가 더 완성도 높다.** AI 인사이트, 모바일 최적화, 풍부한 대시보드 등 환자 자기관리에 특화된 기능이 추가되어 있다.

### 권장 사항

| 우선순위 | 작업 | 범위 |
|:--------:|------|------|
| **P0** | 투약/운동/증상 접이식 기본 펼침 (양쪽 서비스 동시 수정) | GlucoseInputPage.tsx (GlycoPharm + GlucoseView) |
| **P0** | 분석 페이지에 투약/운동/증상 metadata 표시 | DataAnalysisPage.tsx (양쪽) |
| **P1** | 서비스 역할 안내 추가 — "환자는 GlucoseView, 약사는 GlycoPharm" | 랜딩/로그인 페이지 |
| **P1** | 투약/운동/증상 독립 입력 지원 | GlucoseInputPage + Backend |
| **P2** | 케어 가이드라인 콘텐츠 구현 | CareGuidelinePage |
| **P2** | CGM 기기 데이터 동기화 연동 | 별도 WO 필요 |

### WO 제안

| WO ID | 범위 | 내용 |
|-------|------|------|
| **WO-O4O-PATIENT-INPUT-UX-FIX-V1** | GlycoPharm + GlucoseView | 접이식 기본 펼침 + 안내 텍스트 (양쪽 동시) |
| **WO-O4O-METADATA-DISPLAY-V1** | GlycoPharm + GlucoseView | 분석 페이지 + 약사 화면 metadata 표시 |
| **WO-O4O-SERVICE-ROLE-GUIDANCE-V1** | 양쪽 랜딩/로그인 | 서비스 역할 안내 + 적절한 서비스로 리다이렉트 |

---

*IR-O4O-GLUCOSEVIEW-FUNCTION-STATE-AUDIT-V1 — End of Report*
