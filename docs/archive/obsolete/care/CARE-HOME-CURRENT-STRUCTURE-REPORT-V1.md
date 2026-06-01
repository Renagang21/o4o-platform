# CARE-HOME-CURRENT-STRUCTURE-REPORT-V1

> **WO-CARE-HOME-CURRENT-STATE-INVESTIGATION-V1**
> 작성일: 2026-02-20 (갱신)
> 대상: https://glycopharm.co.kr/ (pharmacy 역할 로그인 시 홈 화면)
> 상태: 현 개발 상태 전수 조사 (수정 제안 없음)

---

## 1. 컴포넌트 트리 다이어그램

```
BrowserRouter
└── AuthProvider
    └── LoginModalProvider
        └── Suspense
            └── AppRoutes
                └── MainLayout
                    ├── Header (sticky top-0)
                    │   ├── 로고: GlycoPharm (혈당관리 전문 플랫폼)
                    │   ├── Desktop Nav: 홈 | 포럼 | 교육/자료 | 참여 신청 | 디지털 사이니지 | [약국 관리]
                    │   └── User Menu 드롭다운: 사용자명/이메일 | 마이페이지 | [약국 관리] | 로그아웃
                    │
                    ├── <Outlet /> ← RoleBasedHome
                    │   └── user.roles[0] === 'pharmacy'
                    │       → CareDashboardPage (인라인 렌더링)
                    │
                    └── Footer
```

### 렌더링 경로

```
URL: https://glycopharm.co.kr/
→ App.tsx line 252: <Route index element={<RoleBasedHome />} />
  → RoleBasedHome (line 205-229)
    → user.roles[0] === 'pharmacy' → <CareDashboardPage />
    → 비로그인/기타 역할 → <HomePage />
```

- **lazy loading**: `lazy(() => import('@/pages/care').then(m => ({ default: m.CareDashboardPage })))`
- **보호**: RoleBasedHome 내부 역할 분기 (별도 ProtectedRoute 없음)

**파일**: `services/web-glycopharm/src/App.tsx` (499줄)

---

## 2. 섹션 순서 명시

CareDashboardPage.tsx (315줄) JSX 렌더링 순서:

| # | 섹션명 | 위치 (line) | 조건부 렌더링 |
|---|--------|-------------|-------------|
| 1 | Hero Header | 128-134 | 없음 (항상) |
| 2 | KPI Row (4카드) | 138-186 | 없음 (항상) |
| 3 | Action Bar | 189-224 | 없음 (항상) |
| 4 | Error Banner | 227-231 | `error !== null` |
| 5 | Patient Table | 234-310 | 없음 (항상, 내부 3분기) |

**하위 컴포넌트**: **없음**. 전체가 단일 파일 인라인 JSX.

---

## 3. KPI 카드 구성

### 4장 (1행, grid-cols-2 → lg:grid-cols-4)

| 순서 | 타이틀 | 아이콘 | 아이콘 배경 | 값 색상 | 데이터 필드 | Fallback |
|------|--------|--------|-----------|---------|-----------|---------|
| 1 | 전체 환자 | `Users` | bg-primary-50 | text-slate-900 | `summary?.totalPatients` | `patients.length` |
| 2 | 고위험 | `AlertTriangle` | bg-red-50 | text-red-600 | `summary?.highRiskCount` | `0` |
| 3 | 주의 | `AlertCircle` | bg-amber-50 | text-amber-600 | `summary?.moderateRiskCount` | `0` |
| 4 | 최근 7일 상담 | `MessageCircle` | bg-blue-50 | text-slate-900 | `summary?.recentCoachingCount` | `0` |

### 카드 공통 스타일

```
div.bg-white.rounded-2xl.shadow-sm.p-5.border.border-slate-200
├── div.flex.items-center.gap-3.mb-2
│   ├── div.w-9.h-9.rounded-lg (아이콘 배경)
│   │   └── Icon (w-5 h-5)
│   └── p.text-sm.text-slate-500 (타이틀)
└── p.text-3xl.font-bold (값)
```

| 항목 | 값 |
|------|------|
| 카드 컴포넌트 | 인라인 JSX (공용 카드 컴포넌트 미사용) |
| 계산 위치 | API (CareDashboardSummary) |
| 로딩 처리 | **없음** (KPI 카드에 로딩/스피너 없음) |
| Skeleton | **없음** |
| 클릭 동작 | **없음** (KPI 카드는 네비게이션 없음) |

---

## 4. 데이터 흐름 다이어그램

### API 호출 구조

```
loadData() [useCallback, dep: debouncedSearch]
├── setLoading(true), setError(null)
├── Promise.all([
│   ├── pharmacyApi.getCustomers({ search, pageSize: 100 })
│   │   → GET /api/v1/glycopharm/pharmacy/customers
│   │   → StoreApiResponse<StorePaginatedResponse<PharmacyCustomer>>
│   │
│   └── pharmacyApi.getCareDashboardSummary().catch(() => null)
│       → GET /api/v1/care/dashboard
│       → CareDashboardSummary (직접 반환, StoreApiResponse 미래핑)
│])
├── setPatients(items), setSummary(result)
├── catch → setError('환자 정보를 불러오는데 실패했습니다.'), setPatients([])
└── finally → setLoading(false)
```

| 항목 | 값 |
|------|------|
| API 호출 수 | **2개** |
| 병렬 호출 | ✅ `Promise.all` |
| 재호출 트리거 | `debouncedSearch` 변경 시 |
| 인증 | Bearer Token (pharmacyApi 내부, getAccessToken()) |

### 반환 데이터 구조

**CareDashboardSummary** (`GET /api/v1/care/dashboard`):

```typescript
{
  totalPatients: number;
  highRiskCount: number;
  moderateRiskCount: number;
  lowRiskCount: number;
  recentCoachingCount: number;
  improvingCount: number;            // ⚠ 화면에서 미사용
  recentSnapshots: Array<{
    patientId: string;
    riskLevel: string;
    createdAt: string;
  }>;
}
```

**PharmacyCustomer** (`GET /api/v1/glycopharm/pharmacy/customers`):

```typescript
{
  id: string;
  name: string;
  phone: string;
  email?: string;
  diabetesType?: 'type1' | 'type2' | 'gestational' | 'prediabetes';
  lastOrderAt?: string;
  totalOrders: number;
  totalSpent: number;
  status: 'active' | 'inactive';
  createdAt: string;
}
```

### 데이터 파생 (useMemo / 함수)

| 파생 데이터 | 소스 | 방식 | 용도 |
|-----------|------|------|------|
| `snapshotMap` | `summary.recentSnapshots` | `useMemo` → `Map<patientId, {riskLevel, createdAt}>` | 환자별 위험도/분석일 조회 |
| `getRisk(patient)` | `snapshotMap.get(patient.id)` | 함수, fallback: `'low'` | 테이블 위험도 뱃지 |
| `getAnalysisDate(patient)` | `snapshotMap.get(patient.id)` | 함수, fallback: `null` | 테이블 최근 분석일 |
| `filteredPatients` | `patients` + `riskFilter` | 클라이언트 사이드 필터링 | 테이블 렌더링 대상 |

### useEffect 구조

```
useEffect #1 [searchQuery]
  → setTimeout 300ms → setDebouncedSearch

useEffect #2 [loadData]
  → loadData() 실행
  (loadData는 useCallback([debouncedSearch]))
```

### 상태 관리

| State | 타입 | 초기값 | 용도 |
|-------|------|--------|------|
| `patients` | `PharmacyCustomer[]` | `[]` | 환자 목록 (테이블 데이터) |
| `summary` | `CareDashboardSummary \| null` | `null` | KPI + snapshotMap 소스 |
| `loading` | `boolean` | `true` | 테이블 로딩 상태 |
| `error` | `string \| null` | `null` | 에러 배너 메시지 |
| `searchQuery` | `string` | `''` | 검색 입력값 (즉시) |
| `debouncedSearch` | `string` | `''` | 디바운스된 검색값 (300ms) |
| `riskFilter` | `RiskLevel` | `'all'` | 위험도 필터 (all/high/moderate/low) |

---

## 5. 상태 분기 표

### Patient Table 3분기

| 조건 | 렌더링 |
|------|--------|
| `loading === true` | `Loader2` 스피너 (py-16 중앙, text-primary-600 animate-spin) |
| `filteredPatients.length === 0` | 텍스트 메시지 (py-16 중앙) |
| `filteredPatients.length > 0` | `<table>` (5컬럼) |

### 빈 상태 메시지 분기

| 조건 | 메시지 |
|------|--------|
| 검색어 or 필터 활성 | "조건에 맞는 환자가 없습니다." |
| 그 외 (기본) | "등록된 환자가 없습니다." |

### 상태별 전체 UI 동작

| 상태 | Hero Header | KPI Row | Action Bar | Error Banner | Patient Table |
|------|------------|---------|------------|-------------|--------------|
| **로딩 중** | ✅ 표시 | summary=null → fallback (patients.length/0/0/0) | ✅ 표시 | 숨김 | Spinner |
| **환자 0명** | ✅ 표시 | totalPatients=0, 나머지=0 | ✅ 표시 | 숨김 | "등록된 환자가 없습니다." |
| **Snapshot 0건** | ✅ 표시 | KPI 정상 | ✅ 표시 | 숨김 | 모든 환자 위험도='양호', 분석일='-' |
| **Coaching 0건** | ✅ 표시 | 최근 7일 상담=0 | ✅ 표시 | 숨김 | 최근 상담='-' (항상 하드코딩 '-') |
| **customers API 실패** | ✅ 표시 | summary=null → fallback | ✅ 표시 | ✅ "환자 정보를 불러오는데 실패했습니다." | "등록된 환자가 없습니다." |
| **summary API 실패** | ✅ 표시 | summary=null → fallback | ✅ 표시 | 숨김 (catch → null) | 모든 환자 위험도='양호', 분석일='-' |

**핵심**: summary API 실패는 에러 배너 미표시 (`.catch(() => null)`). customers API 실패만 에러 배너 표시.

---

## 6. Store / HUB 연결 요소 존재 여부

| 항목 | 존재 여부 | 상세 |
|------|----------|------|
| Store 관련 KPI | **없음** | 매출/주문/상품 등 Store 데이터 참조 없음 |
| Store 이동 버튼 | **없음** | CareDashboardPage 내부에 `/store` 링크 없음 |
| HUB 연결 UI | **없음** | HUB 관련 import/컴포넌트 없음 |
| Quick Actions | **없음** | Quick Actions 섹션 없음 |
| Activity Summary | **없음** | Activity 카드 섹션 없음 |
| Info Banner | **없음** | 하단 배너 없음 |
| 새로고침 버튼 | **없음** | RefreshCw 아이콘/버튼 없음 |
| 인사말 | **없음** | useAuth/user 참조 없음 |

### 내부 네비게이션

| 동작 | 대상 경로 | 방식 |
|------|----------|------|
| "환자 등록" 버튼 (Action Bar) | `/patients` | `navigate('/patients')` |
| 환자 행 클릭 (Table) | `/patients?id=${patient.id}` | `navigate(...)` (row onClick) |

### Header 네비게이션 (pharmacy 역할)

| 메뉴 | 경로 | 비고 |
|------|------|------|
| 홈 | `/` | CareDashboardPage 렌더링 |
| 포럼 | `/forum` | 공용 |
| 교육/자료 | `/education` | 공용 |
| 참여 신청 | `/apply` | 공용 |
| 디지털 사이니지 | `/signage` | 공용 |
| 약국 관리 | `/pharmacy` | ⚠ 라우트 제거됨 (404) |
| 마이페이지 | `/mypage` | 사용자 메뉴 드롭다운 |

**⚠ Header roleNavigation 불일치**: `pharmacy: { path: '/pharmacy' }` 정의되어 있으나,
`/pharmacy` 라우트는 `WO-PHARMACY-FULL-REMOVAL-V1`로 제거됨. 클릭 시 404.
Store 대시보드는 `/store`에 존재하나 Header에서 직접 링크 없음.

---

## 부록: Patient Table 컬럼 구조

| 순서 | 컬럼 Header | 데이터 소스 | 정렬 | 비고 |
|------|-----------|-----------|------|------|
| 1 | 환자명 | patient.name + phone | 없음 | Avatar(이니셜 gradient) + 이름 + 연락처 |
| 2 | 위험도 | getRisk(patient) → RISK_CONFIG | 없음 | Badge: 고위험(red)/주의(amber)/양호(green) |
| 3 | 최근 분석일 | getAnalysisDate(patient) | 없음 | formatDate(ko-KR), null이면 '-' |
| 4 | 최근 상담 | - | 없음 | **항상 '-'** (하드코딩, API 데이터 미연결) |
| 5 | (빈 header) | - | - | ChevronRight 아이콘 (행 클릭 어포던스) |

---

## 부록: 상위 Layout 상세

### MainLayout (15줄)

```
div.min-h-screen.flex.flex-col.bg-slate-50
├── <Header /> (sticky)
├── <main className="flex-1"> <Outlet /> </main>
└── <Footer />
```

| 항목 | 값 |
|------|------|
| 사이드바 | **없음** |
| 최대 너비 제한 | **없음** (Layout 레벨, CareDashboardPage 자체에서 max-w-7xl) |
| 배경색 | bg-slate-50 |

### CareDashboardPage 내부 레이아웃

| 항목 | 값 |
|------|------|
| 최대 너비 | `max-w-7xl` (1280px) |
| 패딩 | `px-4 sm:px-6` |
| 섹션 간격 | `space-y-6` (24px) |
| KPI Grid | `grid-cols-2 lg:grid-cols-4` |
| 반응형 breakpoint | sm(패딩), lg(KPI 4열) |
| Section Wrapper | **없음** (공통 래퍼 컴포넌트 미사용) |

---

## 부록: 핵심 파일 목록

### 프론트엔드

| 파일 | 줄수 | 역할 |
|------|------|------|
| `services/web-glycopharm/src/pages/care/CareDashboardPage.tsx` | 315 | Care Home 전체 |
| `services/web-glycopharm/src/pages/care/index.ts` | 6 | Barrel export |
| `services/web-glycopharm/src/App.tsx` | 499 | 라우트, RoleBasedHome |
| `services/web-glycopharm/src/components/layouts/MainLayout.tsx` | 15 | 상위 Layout |
| `services/web-glycopharm/src/components/common/Header.tsx` | 341 | 공용 Header |
| `services/web-glycopharm/src/api/pharmacy.ts` | 526 | API 클라이언트 |

### 백엔드

| 파일 | 줄수 | 역할 |
|------|------|------|
| `apps/api-server/src/modules/care/care-dashboard.controller.ts` | 197 | Dashboard 집계 API |
| `apps/api-server/src/modules/care/care-pharmacy-context.middleware.ts` | ~80 | 약국 스코프 미들웨어 |

---

*이 문서는 현재 코드 기준 사실 기록이며, 수정 제안·개선 의견·요구사항 비교를 포함하지 않는다.*
