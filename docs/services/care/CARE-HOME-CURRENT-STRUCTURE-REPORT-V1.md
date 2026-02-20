# CARE-HOME-CURRENT-STRUCTURE-REPORT-V1

> **Status**: 현재 상태 기록 (2026-02-20)
> **대상**: Care Home (CareDashboardPage) 전수 조사

---

## 1. 컴포넌트 트리 다이어그램

Care Home은 **2개 서비스**에 각각 독립 구현되어 있다.

### web-glucoseview (GlucoseView)

```
App.tsx
└─ <Layout />                         ← 공통 레이아웃 (nav + footer)
   └─ <ProtectedRoute>
      └─ <CareDashboardPage />         ← pages/CareDashboardPage.tsx (199줄)
```

- **라우트**: `/care/dashboard`
- **네비게이션**: Layout.tsx navItems 4번째 항목 `{ path: '/care/dashboard', label: 'Dashboard', protected: true }`
- **Layout**: 고정 상단 nav (`fixed top-0`, h-14) + `<Outlet />` + footer
- **보호**: `ProtectedRoute` (인증 + 승인 필수)

### web-glycopharm (GlycoPharm)

```
App.tsx
└─ <MainLayout />
   └─ <RoleBasedHome />
      └─ user.roles[0] === 'pharmacy'
         → <CareDashboardPage />       ← pages/care/CareDashboardPage.tsx (263줄)
```

- **라우트**: `/` (pharmacy 역할 사용자의 기본 홈 화면)
- **네비게이션**: 별도 care/dashboard 경로 없음. `/`에서 역할 기반으로 렌더링
- **Layout**: `MainLayout` (Outlet 기반)
- **보호**: `RoleBasedHome` 내부에서 역할 분기 (pharmacy 역할만 CareDashboardPage 노출)
- **lazy loading**: `lazy(() => import('@/pages/care').then(...))`

---

## 2. 섹션 순서 명시

### GlucoseView CareDashboardPage — 렌더 순서

| # | 섹션명 | 컴포넌트/JSX 블록 | 조건부 렌더링 |
|---|--------|-------------------|---------------|
| 1 | Header | `<div className="bg-white border-b">` h1 + subtitle | 없음 (항상) |
| 2 | KPI Cards | `grid grid-cols-2 lg:grid-cols-4` | 없음 (항상) |
| 3 | Risk Distribution | `위험군 분포` 카드 + stacked bar | `totalRisk === 0` → "아직 분석 기록이 없습니다" |
| 4 | Recent Analysis | `최근 분석` 리스트 (좌 컬럼) | `recentSnapshots.length === 0` → "분석 기록이 없습니다" |
| 5 | Recent Coaching | `최근 상담` 리스트 (우 컬럼) | `recentSessions.length === 0` → "상담 기록이 없습니다" |

### GlycoPharm CareDashboardPage — 렌더 순서

| # | 섹션명 | 컴포넌트/JSX 블록 | 조건부 렌더링 |
|---|--------|-------------------|---------------|
| 1 | Header (Gradient) | `bg-gradient-to-br from-primary-600` + 인사말 + 새로고침 | 없음 (항상) |
| 2 | Error Banner | `bg-amber-50 border-amber-200` | `error` 존재 시만 |
| 3 | Care Summary Cards | `grid grid-cols-2 lg:grid-cols-4` (4장) | 없음 (항상) |
| 4 | Activity Summary | `grid md:grid-cols-2` (최근 상담 + 개선 중) | 없음 (항상) |
| 5 | Quick Actions | `grid grid-cols-2 md:grid-cols-4` (4개 링크) | 없음 (항상) |
| 6 | Info Banner | `bg-gradient-to-r from-primary-50 to-violet-50` | 없음 (항상) |

---

## 3. KPI 카드 구성

### GlucoseView — 4장 (1행)

| 카드 | 데이터 필드 | 계산 위치 | border 색상 | 로딩 처리 | Skeleton |
|------|------------|-----------|-------------|-----------|----------|
| 관리 환자 | `data.totalPatients` | API (서버) | slate-200 | 없음 (전체 로딩) | 없음 |
| 고위험 환자 | `data.highRiskCount` | API (서버) | red-200 | 없음 | 없음 |
| 최근 7일 상담 | `data.recentCoachingCount` | API (서버) | slate-200 | 없음 | 없음 |
| 개선 환자 | `data.improvingCount` | API (서버) | green-200 | 없음 | 없음 |

- Grid: `grid-cols-2 lg:grid-cols-4`
- 카드 스타일: `bg-white rounded-xl border p-6`
- 숫자 스타일: `text-3xl font-bold`
- Skeleton/개별 로딩 **없음** — 전체 페이지 로딩 spinner만 존재

### GlycoPharm — 4장 (1행) + 2장 (Activity)

**상단 4장:**

| 카드 | 데이터 필드 | 계산 위치 | 아이콘 | 서브텍스트 |
|------|------------|-----------|--------|-----------|
| 전체 환자 | `stats.totalPatients` | API (서버) | `Users` (primary) | "등록된 관리 환자" |
| 고위험 | `stats.highRiskCount` | API (서버) | `AlertTriangle` (red) | "즉시 관리 필요" |
| 주의 필요 | `stats.moderateRiskCount` | API (서버) | `AlertCircle` (amber) | "정기 모니터링" |
| 양호 | `stats.lowRiskCount` | API (서버) | `CheckCircle` (green) | "안정적인 관리" |

- Grid: `grid-cols-2 lg:grid-cols-4`
- 카드 스타일: `bg-white rounded-2xl shadow-sm p-5`
- 아이콘: `w-10 h-10 rounded-xl` 색상 배경 + lucide icon
- Skeleton **없음**

**Activity 2장:**

| 카드 | 데이터 필드 | 서브텍스트 | 링크 |
|------|------------|-----------|------|
| 최근 상담 | `stats.recentCoachingCount` | "지난 7일간 상담 세션" | → `/patients` "상세보기" |
| 개선 중 | `stats.improvingCount` | "혈당 조절 개선 환자" | → `/patients` "상세보기" |

- Grid: `grid md:grid-cols-2`
- 숫자: `text-4xl font-bold`

---

## 4. 데이터 흐름 다이어그램

### GlucoseView

```
CareDashboardPage
  │
  └─ useEffect (mount) ─── 1 API call
       │
       └─ api.getCareDashboard()
            GET /api/v1/care/dashboard
            │
            └─ 반환: CareDashboardDto
                {
                  totalPatients: number,      ← glucoseview_customers COUNT
                  highRiskCount: number,       ← care_kpi_snapshots 최신 risk_level='high' 수
                  moderateRiskCount: number,   ← care_kpi_snapshots 최신 risk_level='moderate' 수
                  lowRiskCount: number,        ← care_kpi_snapshots 최신 risk_level='low' 수
                  recentCoachingCount: number, ← care_coaching_sessions 7일 이내 COUNT
                  improvingCount: number,      ← 최신 TIR > 이전 TIR 환자 수
                  recentSnapshots: Array<{patientId, riskLevel, createdAt}>,  ← 최근 5건
                  recentSessions: Array<{patientId, summary, createdAt}>,     ← 최근 5건
                }
```

**상태 관리:**
- `data: CareDashboardDto | null` — 단일 state
- `loading: boolean`
- `error: string | null`
- API 호출: 1회, 비병렬 (단일 엔드포인트)
- 에러 처리: try/catch → setError 문자열
- 토큰: `ApiService.token` (Bearer)

### GlycoPharm

```
CareDashboardPage
  │
  ├─ useAuth() → user (인사말용)
  │
  └─ useCallback(fetchData) ── useEffect(mount) ─── 1 API call
       │
       └─ pharmacyApi.getCareDashboardSummary()
            GET /api/v1/care/dashboard
            │
            └─ 반환: CareDashboardSummary
                {
                  totalPatients: number,
                  highRiskCount: number,
                  moderateRiskCount: number,
                  lowRiskCount: number,
                  recentCoachingCount: number,
                  improvingCount: number,
                }
                ⚠ recentSnapshots, recentSessions 필드 없음 (타입에 미포함)
```

**상태 관리:**
- `data: CareDashboardSummary | null`
- `loading: boolean`
- `error: string | null`
- API 호출: 1회
- **에러 fallback**: API 실패 시 모든 필드 0으로 채운 fallback 객체 set + error 메시지 표시
- 토큰: `getAccessToken()` (localStorage Bearer)
- **새로고침 버튼** 존재: `fetchData()` 재호출

### 백엔드 — care-dashboard.controller.ts

```
GET /api/v1/care/dashboard
  │
  ├─ middleware: authenticate → requirePharmacyContext
  │   └─ pharmacyId 결정 (admin은 null = 전체, pharmacy는 자기 약국)
  │
  └─ buildDashboard(dataSource, pharmacyId, userId)
       │
       ├─ A. totalPatients: SELECT COUNT(*) FROM glucoseview_customers [WHERE pharmacist_id=$1]
       ├─ B. risk분포: care_kpi_snapshots → 환자별 최신 스냅샷의 risk_level 집계
       ├─ C. recentCoachingCount: care_coaching_sessions 7일 이내 COUNT
       ├─ D. improvingCount: 최신 TIR > 이전 TIR CTE 쿼리
       ├─ E. recentSnapshots: 최근 5건 (patient_id, risk_level, created_at)
       └─ F. recentSessions: 최근 5건 (patient_id, summary, created_at)

  총 6개 SQL 쿼리 (순차 실행, 병렬 아님)
  Pharmacy-scoped: 모든 쿼리에 pharmacy_id 필터 적용
  Admin: pharmacy_id IS NULL → 전체 데이터
```

---

## 5. 상태 분기 표

### GlucoseView

| 상태 | UI 동작 |
|------|---------|
| **로딩 중** | 전체 화면 spinner (`border-2 border-blue-500 animate-spin`) + "대시보드 로딩 중..." |
| **에러 또는 data=null** | 헤더("Care Dashboard") + 에러 메시지 + "다시 시도" 버튼 (`window.location.reload()`) |
| **환자 0명** | totalPatients=0 표시, KPI 카드는 정상 렌더 (숫자 0) |
| **Snapshot 0건** | Risk Distribution: "아직 분석 기록이 없습니다" / 최근 분석: "분석 기록이 없습니다" |
| **Coaching 0건** | 최근 상담: "상담 기록이 없습니다" |
| **Risk total=0** | Risk bar 미렌더링, 범례 미표시 (조건부) |

### GlycoPharm

| 상태 | UI 동작 |
|------|---------|
| **로딩 중** | 중앙 `Loader2` spinner (`text-primary-600 animate-spin`) |
| **에러** | **fallback 데이터** (모든 값 0) 세팅 + amber Error Banner 표시 → 카드는 정상 렌더 |
| **환자 0명** | 카드에 숫자 0 표시, 별도 empty state 없음 |
| **Coaching 0건** | Activity "최근 상담" 카드에 숫자 0 |
| **데이터 성공** | Header(인사말) + 4 KPI + 2 Activity + Quick Actions + Info Banner |

**핵심 차이**: GlucoseView는 에러 시 **전체 교체** (에러 화면), GlycoPharm은 에러 시 **fallback 데이터로 카드 렌더 + 배너 경고**

---

## 6. Store/HUB 연결 요소 존재 여부

### GlucoseView CareDashboardPage

| 항목 | 존재 여부 | 상세 |
|------|-----------|------|
| Store 관련 KPI | **없음** | Store 데이터 참조 없음 |
| Store 이동 버튼 | **없음** | |
| HUB 연결 UI | **없음** | |
| 외부 URL 이동 | **있음** | `<Link to="/insights">` (최근 분석/상담 → "전체 보기") |

### GlycoPharm CareDashboardPage

| 항목 | 존재 여부 | 상세 |
|------|-----------|------|
| Store 관련 KPI | **없음** | Care 데이터만 사용 |
| Store 이동 버튼 | **있음** | Quick Actions → `NavLink to="/store"` "매장 허브" |
| 상품 관리 이동 | **있음** | Quick Actions → `NavLink to="/store/products"` "상품 관리" |
| HUB 연결 UI | **없음** | HUB 관련 import 없음 |
| 환자 관리 이동 | **있음** | Quick Actions → `NavLink to="/patients"` + Activity 카드 → `/patients` |
| 내 정보 이동 | **있음** | Quick Actions → `NavLink to="/mypage"` "내 정보" |

### Quick Actions (GlycoPharm) 상세

| 순서 | 라벨 | 대상 경로 | 아이콘 |
|------|------|-----------|--------|
| 1 | 환자 관리 | `/patients` | `Users` |
| 2 | 매장 허브 | `/store` | `Store` |
| 3 | 상품 관리 | `/store/products` | `Activity` |
| 4 | 내 정보 | `/mypage` | `Heart` |

---

## 7. 관련 페이지 — 보조 조사

### InsightsPage (GlucoseView only)

- 경로: `/insights`
- 역할: 환자 개별 분석 + KPI 비교 + 상담 기록
- API: 3개 병렬 호출 (`getCareAnalysis`, `getCareKpi`, `getCoachingSessions`)
- Care Dashboard의 "전체 보기" 링크 대상
- 상담 기록 Modal 포함 (createCoachingSession)

### PatientsPage (GlycoPharm only)

- 경로: `/patients`
- 역할: 환자 목록 + 상세 (탭 기반)
- API: 2개 병렬 호출 (`getCustomers`, `getCareDashboardSummary`)
- 위험도: **Mock 로직** (diabetesType 기반, Care API 미연동)
- 탭 4개 중 3개 placeholder ("GlucoseView Care 모듈 연동 예정")

---

## 8. 파일 인벤토리

### 프론트엔드

| 파일 | 서비스 | 줄수 | 역할 |
|------|--------|------|------|
| `services/web-glucoseview/src/pages/CareDashboardPage.tsx` | GlucoseView | 199 | Dashboard 본체 |
| `services/web-glucoseview/src/pages/InsightsPage.tsx` | GlucoseView | 364 | 환자별 분석+상담 |
| `services/web-glucoseview/src/components/Layout.tsx` | GlucoseView | 296 | 상단 nav (Dashboard 메뉴 포함) |
| `services/web-glucoseview/src/services/api.ts` | GlucoseView | 547 | API client (CareDashboardDto 정의 포함) |
| `services/web-glycopharm/src/pages/care/CareDashboardPage.tsx` | GlycoPharm | 263 | Dashboard 본체 |
| `services/web-glycopharm/src/pages/care/PatientsPage.tsx` | GlycoPharm | 400 | 환자 관리 |
| `services/web-glycopharm/src/pages/care/index.ts` | GlycoPharm | 7 | barrel export |
| `services/web-glycopharm/src/api/pharmacy.ts` | GlycoPharm | 521 | API client (CareDashboardSummary 정의 포함) |

### 백엔드

| 파일 | 줄수 | 역할 |
|------|------|------|
| `apps/api-server/src/modules/care/care-dashboard.controller.ts` | 188 | Dashboard 집계 API |
| `apps/api-server/src/modules/care/care-analysis.controller.ts` | 65 | 환자별 분석 API |
| `apps/api-server/src/modules/care/care-coaching.controller.ts` | 62 | 상담 CRUD API |
| `apps/api-server/src/modules/care/care-pharmacy-context.middleware.ts` | 80 | 약국 스코프 미들웨어 |
| `apps/api-server/src/modules/care/care-kpi-snapshot.service.ts` | 105 | 스냅샷 기록/비교 |
| `apps/api-server/src/modules/care/care-coaching-session.service.ts` | 83 | 상담 세션 관리 |
| `apps/api-server/src/modules/care/analysis.engine.ts` | 44 | TIR/CV/Risk 계산 |
| `apps/api-server/src/modules/care/analysis.provider.ts` | 54 | AnalysisProvider + DefaultAnalysisProvider |
| `apps/api-server/src/modules/care/ai-analysis.provider.ts` | 47 | AI 분석 Provider |
| `apps/api-server/src/modules/care/cgm.provider.ts` | 9 | CgmProvider 인터페이스 |
| `apps/api-server/src/modules/care/mock-cgm.provider.ts` | 92 | Mock CGM 데이터 생성 |
| `apps/api-server/src/modules/care/dto.ts` | 8 | CareInsightDto |

### 엔티티/마이그레이션

| 파일 | 역할 |
|------|------|
| `entities/care-kpi-snapshot.entity.ts` | `care_kpi_snapshots` 테이블 (id, pharmacy_id, patient_id, tir, cv, risk_level, created_at) |
| `entities/care-coaching-session.entity.ts` | `care_coaching_sessions` 테이블 (id, pharmacy_id, patient_id, pharmacist_id, snapshot_id, summary, action_plan, created_at) |
| 4개 migration 파일 | 테이블 생성 + pharmacy_id 컬럼 추가 |

---

## 9. 두 구현체 대비표

| 항목 | GlucoseView | GlycoPharm |
|------|-------------|------------|
| 라우트 | `/care/dashboard` | `/` (pharmacy 역할 홈) |
| KPI 카드 수 | 4장 (1행) | 4장 + 2 Activity (2행) |
| KPI 카드 항목 | 환자/고위험/상담/개선 | 환자/고위험/주의/양호 + 상담/개선 |
| Risk Distribution | **있음** (stacked bar + 범례) | **없음** |
| Recent Analysis 리스트 | **있음** (최근 5건) | **없음** |
| Recent Coaching 리스트 | **있음** (최근 5건) | **없음** |
| Quick Actions | **없음** | **있음** (4개 NavLink) |
| Info Banner | **없음** | **있음** ("GlycoPharm Care") |
| 새로고침 버튼 | **없음** (에러 시 location.reload) | **있음** (RefreshCw 아이콘) |
| 인사말 | **없음** | **있음** (`안녕하세요, {user.name}님`) |
| 에러 처리 | 전체 교체 (에러 화면) | fallback 0 + 배너 경고 |
| API DTO | `CareDashboardDto` (snapshots/sessions 포함) | `CareDashboardSummary` (숫자만) |
| Layout | 공통 Layout (nav+footer) | MainLayout (Outlet) |
| 아이콘 라이브러리 | 없음 (텍스트 only) | lucide-react |
| 디자인 토큰 | 직접 tailwind (slate/blue) | primary-* 변수 + tailwind |

---

*이 문서는 현재 코드 기준 사실 기록이며, 수정 제안·개선 의견·요구사항 비교를 포함하지 않는다.*
