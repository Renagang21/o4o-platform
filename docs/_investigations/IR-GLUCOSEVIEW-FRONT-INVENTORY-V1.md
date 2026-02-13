# IR-GLUCOSEVIEW-FRONT-INVENTORY-V1

## web-glucoseview Frontend Structure Inventory

> **Step 2-2**: Frontend Structure Mapping — GlucoseView
> **Date**: 2026-02-13
> **Type**: Investigation Report (Read-Only)

---

## 1. Executive Summary

**web-glucoseview는 핵심 기능이 Mock 기반이다.**

| 분류 | 페이지 수 | 비율 |
|------|-----------|------|
| 🟢 Live (API 연결) | 10+ | ~55% |
| 🟡 Partial (혼합) | 3 | ~15% |
| 🔴 Mock (가짜 데이터) | 2 | ~10% |
| ⚪ Static (정적) | 4 | ~20% |

**CRITICAL**: 환자 관리(`PatientsPage`)와 분석(`InsightsPage`) — 서비스의 핵심 가치 제안 — 이 둘 다 **100% Mock**.

- `PatientsPage`: localStorage 기반 환자 저장 (서버 미동기화)
- `InsightsPage`: `Math.random()`으로 42명 가짜 환자 생성
- Commerce 잔재: **없음** (Clean)

---

## 2. Route Inventory

### 2-A. Public Routes

| Route | Page | API Calls | Mock | Status |
|-------|------|-----------|------|--------|
| `/` | HomePage | - | localStorage (banners/partners) | 🟢 Live |
| `/register` | RegisterPage | auth API | sampleBranches | 🟢 Live |
| `/about` | AboutPage | - | - | ⚪ Static |

### 2-B. Protected Routes (Auth + Approved)

| Route | Page | API Calls | Mock | Status |
|-------|------|-----------|------|--------|
| `/patients` | PatientsPage | **None** | **localStorage patients** | 🔴 Mock |
| `/insights` | InsightsPage | **None** | **Math.random() 42명** | 🔴 Mock |
| `/settings` | SettingsPage | AuthContext | localStorage stats | 🟡 Partial |
| `/mypage` | MyPage | AuthContext | - | 🟢 Live |
| `/dashboard` | DashboardPage | `api.getMyPharmacy()` | - | 🟢 Live |

### 2-C. Application Routes

| Route | Page | API Calls | Mock | Status |
|-------|------|-----------|------|--------|
| `/apply` | ApplyPage | `api.submitApplication()` | - | 🟢 Live |
| `/apply/my-applications` | MyApplicationsPage | `api.getMyApplications()` | - | 🟢 Live |
| `/pending` | PendingPage | - | - | ⚪ Static |

### 2-D. Admin Routes

| Route | Page | API Calls | Mock | Status |
|-------|------|-----------|------|--------|
| `/admin` | AdminPage | user mgmt API | localStorage banners/partners | 🟡 Partial |

### 2-E. Operator Routes (`/operator/glucoseview`)

| Route | Page | API Calls | Mock | Status |
|-------|------|-----------|------|--------|
| `applications` | OperatorApplicationsPage | applications API | - | 🟢 Live |
| `applications/:id` | OperatorApplicationDetailPage | application detail API | - | 🟢 Live |
| `ai-report` | OperatorAiReportPage | AI report API | demo mode | 🟡 Partial |

### 2-F. Partner Routes (`/partner`)

| Route | Page | API Calls | Mock | Status |
|-------|------|-----------|------|--------|
| `index` | PartnerIndex | partner API | - | 🟢 Live |
| `overview` | PartnerOverviewPage | `partnerApi.getOverview()` | - | 🟢 Live |
| `targets` | PartnerTargetsPage | partner/targets API | - | 🟢 Live |
| `content` | PartnerContentPage | partner/content API | - | 🟢 Live |
| `events` | PartnerEventsPage | partner/events API | - | 🟢 Live |
| `status` | PartnerStatusPage | partner/status API | - | 🟢 Live |

### 2-G. Test/Guide Routes

| Route | Page | API Calls | Mock | Status |
|-------|------|-----------|------|--------|
| `/test-center` | TestCenterPage | - | - | ⚪ Static |
| `/test-guide` | TestGuidePage | - | - | ⚪ Static |
| `/test-guide/manual/*` | Manual pages | - | - | ⚪ Static |
| `/partners/apply` | PartnerApplyPage | partner API | - | 🟢 Live |

---

## 3. Mock Data Deep Dive

### 3-A. Math.random() 사용 (CRITICAL)

**파일**: `src/pages/InsightsPage.tsx`

```typescript
const sampleClients = Array.from({ length: 42 }, (_, i) => ({
  id: i + 1,
  name: `고객 ${i + 1}`,
  lastVisit: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
  visitCount: Math.floor(Math.random() * 20) + 1,
  tir: Math.floor(Math.random() * 40) + 50,       // 50-90%
  avgGlucose: Math.floor(Math.random() * 80) + 100, // 100-180
  cv: Math.floor(Math.random() * 20) + 25,          // 25-45%
  status: ['normal', 'caution', 'urgent'][Math.floor(Math.random() * 3)]
}));
```

| 항목 | 값 | 문제 |
|------|-----|------|
| 환자 수 | 42명 (하드코딩) | 실제 환자 데이터 아님 |
| TIR | 50-90% (랜덤) | 실제 CGM 데이터 없음 |
| 평균 혈당 | 100-180 (랜덤) | 실제 측정값 없음 |
| CV | 25-45% (랜덤) | 실제 변동계수 아님 |
| Status | random pick | 위험도 판정 로직 없음 |

### 3-B. localStorage 사용 (Critical Patient Storage)

| Key | Purpose | Files | Impact |
|-----|---------|-------|--------|
| `glucoseview_customers_${userId}` | **환자 전체 DB** | PatientsPage, SettingsPage | 서버 미동기화, 브라우저 초기화 시 소실 |
| `glucoseview_banners` | 배너 설정 | HomePage, AdminPage | LOW |
| `glucoseview_partners` | 파트너 목록 | HomePage, AdminPage | LOW |
| `glucoseview_access_token` | 인증 토큰 | api.ts | 정상 (인증 표준) |
| `glucoseview_remember_email` | 이메일 기억 | LoginModal | 정상 |

### 3-C. PlaceholderChart 사용

**파일**: `src/components/PlaceholderChart.tsx`

PatientsPage에서 3회 사용:
- "24시간 혈당 추이" — 가짜 곡선
- "7일 경향" — 가짜 막대
- "요약 카드" — `--` placeholder

**실제 차트 라이브러리 미사용** — SVG 하드코딩

---

## 4. CGM Data Connection Check

### 4-A. 실제 CGM 데이터 연결

| 항목 | 존재 여부 | 비고 |
|------|-----------|------|
| `cgm_patients` 테이블 쿼리 | ❌ | 테이블 자체가 migration 없음 |
| `cgm_patient_summaries` 쿼리 | ❌ | 동일 |
| `cgm_glucose_insights` 쿼리 | ❌ | 동일 |
| LibreView API 연동 | ❌ | UI 버튼만 존재 ("연동" 모달) |
| Dexcom API 연동 | ❌ | UI 버튼만 존재 |
| TIR 실시간 계산 | ❌ | Math.random() |
| GMI/HbA1c 계산 | ❌ | 하드코딩 6.8% |
| 혈당 차트 데이터 | ❌ | PlaceholderChart (SVG) |

### 4-B. Backend API 존재하지만 미연결

| Backend API | 경로 | Frontend 호출 |
|-------------|------|---------------|
| `GET /glucoseview/patients` | glucoseview.controller.ts | ❌ PatientsPage에서 미호출 |
| `GET /glucoseview/customers` | customer.controller.ts | ❌ 미호출 |
| `POST /glucoseview/customers` | customer.controller.ts | ❌ 미호출 (localStorage로 대체) |

**핵심**: Backend에 Customer CRUD API가 존재하지만 Frontend가 이를 사용하지 않고 localStorage로 대체.

---

## 5. Commerce Residue Check

### 검색 결과

| 패턴 | 발견 | 판정 |
|------|------|------|
| product listing | ❌ | - |
| price/pricing | ❌ | - |
| shopping cart | ❌ | - |
| checkout | ❌ | - |
| payment | ❌ | - |
| order (주문) | ❌ | - |
| stock/inventory | ❌ | - |
| promotion | ❌ | - |

**판정**: ✅ **Commerce 잔재 없음** — GlucoseView는 순수 서비스 앱

---

## 6. Critical Risk Assessment

### 🔥 HIGH PRIORITY

| # | Risk | Page | Impact |
|---|------|------|--------|
| 1 | **PatientsPage가 서버 미연결** — 환자 데이터가 브라우저 localStorage에만 저장 | PatientsPage | 브라우저 초기화 시 전체 환자 데이터 소실 |
| 2 | **InsightsPage가 100% 가짜** — Math.random()으로 42명 생성, 운영자가 실데이터로 착각할 위험 | InsightsPage | 잘못된 의사결정 유도 가능 |
| 3 | **CGM 데이터 파이프라인 전무** — LibreView/Dexcom "연동" 버튼은 UI만 존재 | 전체 | 서비스 핵심 가치 제안 미충족 |

### ⚠️ MEDIUM PRIORITY

| # | Risk | Page | Impact |
|---|------|------|--------|
| 4 | **SettingsPage 통계가 localStorage 기반** — 환자 수/방문 수/CGM 연동 수 모두 local | SettingsPage | 부정확한 통계 |
| 5 | **AdminPage 배너/파트너가 localStorage** — DB 미저장 | AdminPage | 관리자 설정 휘발성 |
| 6 | **Backend Customer API 존재하지만 미사용** — 연결만 하면 살릴 수 있음 | PatientsPage | 구현 노력 LOW |

### ✅ 정상 작동

| # | Feature | Status |
|---|---------|--------|
| 1 | 약사 회원가입/승인 | 🟢 Live |
| 2 | CGM View 서비스 신청 | 🟢 Live |
| 3 | 약국 대시보드 | 🟢 Live |
| 4 | Operator 신청 관리 | 🟢 Live |
| 5 | Partner 대시보드 전체 | 🟢 Live |
| 6 | 인증/프로필 관리 | 🟢 Live |

---

## 7. "단순 연결만 하면 살릴 수 있는" 화면

| Page | 현재 | 필요 작업 | 난이도 |
|------|------|----------|--------|
| **PatientsPage** | localStorage | `api.getCustomers()` → `api.createCustomer()` 호출로 교체 | **LOW** (Backend API 존재) |
| **SettingsPage 통계** | localStorage 집계 | Customer API에서 count 가져오기 | **LOW** |
| **InsightsPage** | Math.random() | CGM 데이터 테이블 + 분석 API 필요 | **HIGH** (L1 GAP 해소 전제) |

---

## 8. Summary

### 핵심 판정

1. **GlucoseView는 실제 환자용 앱으로 전환 가능한 상태인가?**
   → **NO, 현재 상태로는 불가**. 핵심 기능(환자 관리, CGM 분석)이 Mock.
   → **단, 인프라(회원 체계, 신청 워크플로우, Partner 대시보드)는 준비됨.**

2. **삭제해야 할 화면은?**
   → **없음.** Commerce 잔재 없고, 모든 페이지가 의도된 기능.
   → InsightsPage는 삭제보다 **"Demo" 라벨 추가** 또는 **실데이터 연결**이 적절.

3. **단순 연결만 하면 살릴 수 있는 화면은?**
   → **PatientsPage** — Backend Customer API가 존재하므로 localStorage → API 교체만으로 live 전환 가능.

4. **가장 큰 단절은?**
   → **CGM 데이터 입수 경로** — 이것이 해결되지 않으면 InsightsPage, PlaceholderChart, TIR/CV 계산 모두 작동 불가.

### Page Status 분포

| Status | Pages | Examples |
|--------|-------|---------|
| 🟢 Live | 10+ | Dashboard, Apply, Partner/* |
| 🟡 Partial | 3 | Settings, Admin, AiReport |
| 🔴 Mock | 2 | **Patients, Insights** |
| ⚪ Static | 4 | About, Pending, TestCenter, TestGuide |

---

*Investigation Report - Read-Only, No Code Changes*
*Version: 1.0*
*Status: Complete*
