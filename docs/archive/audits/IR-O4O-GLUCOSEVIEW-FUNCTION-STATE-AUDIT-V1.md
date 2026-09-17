# IR-O4O-GLUCOSEVIEW-FUNCTION-STATE-AUDIT-V1

> **GlucoseView 기능 현황 감사 보고서**
>
> 작성일: 2026-03-21
> 목적: GlucoseView의 현재 기능 상태를 실제 코드와 화면 기준으로 조사

---

## 1. 최종 결론

### GlucoseView는 환자 전용 혈당 관리 서비스로, 기본 기능은 대부분 구현 완료 상태다.

| 질문 | 답변 |
|------|------|
| GlucoseView에서 환자 입력 기능이 실제로 존재하는가? | **YES** — 혈당/투약/운동/증상 입력 모두 존재 |
| 존재한다면 어디까지 동작하는가? | — |
| 현재 문제의 본질은? | **서비스 혼선** |

### 서비스 역할 정의

| 서비스 | 대상 | 핵심 역할 |
|--------|------|----------|
| **GlucoseView** | 환자 중심 | 환자가 직접 혈당을 기록하고 분석하는 자기관리 도구 |

---

## 2. 기능 상태 표

### 2.1 환자용 기능

| # | 기능명 | 화면 존재 | 진입 가능 | API 연결 | 저장/조회 | 최종 상태 | 비고 |
|---|--------|:---------:|:---------:|:--------:|:---------:|:---------:|------|
| 1 | **혈당 입력** | ✅ | ✅ | ✅ | ✅ | **정상 동작** | `GlucoseInputPage.tsx` |
| 2 | **투약 입력** | ✅ (접이식) | ⚠️ 확장 필요 | ✅ | ✅ (확장 시) | **UX 문제** | — |
| 3 | **운동 입력** | ✅ (접이식) | ⚠️ 확장 필요 | ✅ | ✅ (확장 시) | **UX 문제** | — |
| 4 | **증상 입력** | ✅ (접이식) | ⚠️ 확장 필요 | ✅ | ✅ (확장 시) | **UX 문제** | — |
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
| 8 | — | ✅ **핵심 이슈** | 아래 상세 |
| 9 | **투약/운동/증상 UX 문제** | ✅ **핵심 이슈** | — |
┌─────────────┐     ┌──────────────┐
│             │     │ GlucoseView  │
└──────┬──────┘     └──────┬───────┘
       │                   │
       │   ┌───────────────┘
       │   │
┌──────────────────────────────────┐
└──────────────────────────────────┘
       │                   │
┌──────────────┐   ┌──────────────────┐
│              │   │ /glucoseview     │
                   └──────────────────┘

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
| 1 | **투약/운동/증상 접이식 숨김** | — |
| 2 | **서비스 역할 혼선** | — |
| 3 | **분석 페이지 metadata 미표시** | 투약/운동/증상 저장 후 분석 화면에서 보이지 않음 |

### 연결 끊김

없음 — 모든 구현 페이지의 라우팅/API/저장/조회 정상 동작 확인.

### 배포 문제

없음 — main 브랜치 최신 코드 배포 확인.

### 권한 문제

없음 — 환자 역할 가드 정상 동작. 비환자 역할 적절히 차단.

---

## 11. 최종 결론 및 권장 사항

### 결론

1. **GlucoseView의 기능은 대부분 구현 완료되어 있다.** 40개 페이지 중 39개가 실제 동작하는 구현이며, 1개만 플레이스홀더다.

2. **환자 입력 기능은 기술적으로 동작한다.** 혈당/투약/운동/증상 모두 코드가 존재하고 API도 연결되어 있다.

3. **문제의 본질은 두 가지다:**
   - **UX 결함**: 투약/운동/증상 접이식 섹션이 기본 닫혀 있어 사용자가 발견하지 못함

### 권장 사항

| 우선순위 | 작업 | 범위 |
|:--------:|------|------|
| **P0** | 투약/운동/증상 접이식 기본 펼침 (양쪽 서비스 동시 수정) | GlucoseInputPage.tsx (GlucoseView) |
| **P0** | 분석 페이지에 투약/운동/증상 metadata 표시 | DataAnalysisPage.tsx (양쪽) |
| **P1** | — | 랜딩/로그인 페이지 |
| **P1** | 투약/운동/증상 독립 입력 지원 | GlucoseInputPage + Backend |
| **P2** | 케어 가이드라인 콘텐츠 구현 | CareGuidelinePage |
| **P2** | CGM 기기 데이터 동기화 연동 | 별도 WO 필요 |

### WO 제안

| WO ID | 범위 | 내용 |
|-------|------|------|
| **WO-O4O-PATIENT-INPUT-UX-FIX-V1** | GlucoseView | 접이식 기본 펼침 + 안내 텍스트 (양쪽 동시) |
| **WO-O4O-METADATA-DISPLAY-V1** | GlucoseView | 분석 페이지 + 약사 화면 metadata 표시 |
| **WO-O4O-SERVICE-ROLE-GUIDANCE-V1** | 양쪽 랜딩/로그인 | 서비스 역할 안내 + 적절한 서비스로 리다이렉트 |

---

*IR-O4O-GLUCOSEVIEW-FUNCTION-STATE-AUDIT-V1 — End of Report*
