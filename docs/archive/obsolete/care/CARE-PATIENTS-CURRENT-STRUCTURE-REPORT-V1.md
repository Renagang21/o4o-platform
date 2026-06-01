# CARE-PATIENTS-CURRENT-STRUCTURE-REPORT-V1

> **WO-CARE-PATIENTS-CURRENT-STATE-INVESTIGATION-V1**
> 조사일: 2026-02-20
> 대상: `services/web-glycopharm/src/pages/care/PatientsPage.tsx`
> 원칙: 수정 제안 없음. 현재 상태 기록만 수행.

---

## A. 라우팅 / 접근 경로

### 라우트 정의

| 항목 | 값 |
|------|------|
| 파일 | `services/web-glycopharm/src/pages/care/PatientsPage.tsx` |
| 라우트 | `/patients` |
| 레이아웃 | `MainLayout` (네비게이션 바 포함) |
| 가드 | `ProtectedRoute allowedRoles={['pharmacy']}` |
| Lazy 로딩 | `lazy(() => import('@/pages/care').then(m => ({ default: m.PatientsPage })))` |

### 진입 경로

```
App.tsx:290-294
<Route path="patients" element={
  <ProtectedRoute allowedRoles={['pharmacy']}>
    <PatientsPage />
  </ProtectedRoute>
} />
```

- `MainLayout` 하위 Route (line 251 `<Route element={<MainLayout />}>` 블록 내부)
- `pharmacy` 역할만 접근 가능
- Care Home (`CareDashboardPage`)에서 "+ 환자 등록" 버튼으로 이동: `navigate('/patients')`

### URL 파라미터 동기화

- `useSearchParams` 사용
- `?id={patientId}` 쿼리 파라미터로 선택된 환자 동기화
- Care Home 테이블 행 클릭 시 `navigate('/patients?id=${patient.id}')` 으로 이동

### 배럴 내보내기

```typescript
// pages/care/index.ts
export { default as CareDashboardPage } from './CareDashboardPage';
export { default as PatientsPage } from './PatientsPage';
```

---

## B. 화면 구성 (List/Detail Split Layout)

### 전체 구조

```
┌──────────────────────────────────────────────────────────┐
│ Header (sticky top-0 z-10)                               │
│  ┌──────────────────┐  ┌──────────────────────────────┐  │
│  │ 환자 관리         │  │ 고위험 N  주의 N  양호 N     │  │
│  │ 총 N명의 환자     │  │ (summary badges, md:flex)    │  │
│  └──────────────────┘  └──────────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│ Body (grid lg:grid-cols-3 gap-6)                         │
│                                                          │
│ ┌─────────────┐  ┌──────────────────────────────────┐    │
│ │ col-span-1  │  │ col-span-2                       │    │
│ │             │  │                                   │    │
│ │ Search Box  │  │ Patient Detail Panel              │    │
│ │ Risk Filter │  │                                   │    │
│ │             │  │ ┌─ Patient Header ──────────────┐ │    │
│ │ ──────────  │  │ │ Avatar + Name + Risk Badge    │ │    │
│ │             │  │ │ Phone + MoreVertical          │ │    │
│ │ Patient     │  │ └──────────────────────────────┘ │    │
│ │ List        │  │                                   │    │
│ │ (scrollable)│  │ ┌─ Tabs ──────────────────────┐  │    │
│ │             │  │ │ 기본 정보 | 분석 | 상담 | 성과│  │    │
│ │ Avatar+Name │  │ └──────────────────────────────┘  │    │
│ │ Phone       │  │                                   │    │
│ │ Risk Badge  │  │ ┌─ Tab Content ───────────────┐  │    │
│ │ Chevron     │  │ │ (varies by selected tab)    │  │    │
│ │             │  │ └──────────────────────────────┘  │    │
│ └─────────────┘  └──────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### Header (sticky)

| 항목 | 내용 |
|------|------|
| 위치 | `bg-white border-b sticky top-0 z-10` |
| 좌측 | `h1: "환자 관리"` + `p: "총 N명의 환자"` (로딩 시 "불러오는 중...") |
| 우측 | Summary Badges (md:flex, 모바일 숨김) |

### Summary Badges (header 우측)

`summary` 상태가 존재할 때만 표시.

| Badge | 소스 필드 | 스타일 |
|-------|-----------|--------|
| 고위험 N | `summary.highRiskCount` | `bg-red-50 text-red-700` + `AlertTriangle` 아이콘 |
| 주의 N | `summary.moderateRiskCount` | `bg-amber-50 text-amber-700` + `AlertCircle` 아이콘 |
| 양호 N | `summary.lowRiskCount` | `bg-green-50 text-green-700` + `CheckCircle` 아이콘 |

> 이 데이터는 `pharmacyApi.getCareDashboardSummary()` → `/api/v1/care/dashboard`에서 가져옴.
> 백엔드 DTO에는 `recentSnapshots`, `recentSessions`도 포함되지만, 프론트엔드 `CareDashboardSummary` 타입은 카운트 필드만 정의.

### 좌측 패널 (lg:col-span-1)

#### 검색 & 필터 영역

```
bg-white rounded-xl shadow-sm p-4 space-y-3
```

| 요소 | 설명 |
|------|------|
| Search Input | `pl-10` + `Search` 아이콘, 300ms 디바운스 |
| Risk Filter | `<select>` 드롭다운 + `Filter` 아이콘 |
| 필터 옵션 | 전체 위험도 / 고위험 / 주의 필요 / 양호 |

#### 환자 목록

```
bg-white rounded-xl shadow-sm overflow-hidden
max-h-[calc(100vh-320px)] overflow-y-auto
divide-y divide-slate-100
```

| 상태 | 표시 |
|------|------|
| loading | `Loader2` 스피너 (py-12 중앙) |
| error | `AlertCircle` 아이콘 + 에러 메시지 + "다시 시도" 버튼 |
| 빈 목록 | `Users` 아이콘 + "환자가 없습니다" |
| 데이터 있음 | 환자 행 목록 (scrollable) |

#### 환자 행 구조

```
┌──────────────────────────────────────────────┐
│ [Avatar] Name                [RiskBadge] [>] │
│          Phone                                │
└──────────────────────────────────────────────┘
```

| 요소 | 구현 |
|------|------|
| Avatar | `w-10 h-10 rounded-full` gradient 원, 이름 첫 글자 |
| Name | `font-medium text-slate-800 truncate` |
| Phone | `text-xs text-slate-500` |
| Risk Badge | `RISK_CONFIG[risk].color` + `RiskIcon` (3×3) + label |
| Chevron | `ChevronRight w-4 h-4 text-slate-300` |
| 선택 상태 | `bg-primary-50 border-l-4 border-primary-500` |
| 클릭 핸들러 | `handleSelectPatient(patient)` |

### 우측 패널 (lg:col-span-2)

#### 미선택 상태

```
bg-white rounded-xl shadow-sm p-12 text-center
Users 아이콘 (w-16 h-16) + "환자를 선택하세요"
```

#### 선택 상태 — Patient Header

```
p-5 border-b bg-gradient-to-r from-slate-50 to-white
```

| 요소 | 구현 |
|------|------|
| Avatar | `w-14 h-14 rounded-full` gradient, 이름 첫 글자 (text-xl) |
| Name | `text-lg font-bold text-slate-800` |
| Risk Badge | inline, RISK_CONFIG 사용 |
| Phone | `text-sm text-slate-500` |
| More 버튼 | `MoreVertical` 아이콘 (기능 미구현, UI만 존재) |

---

## C. 목록 컬럼 (리스트 아이템)

PatientsPage의 좌측 패널은 테이블이 아니라 **카드형 리스트**(`<button>` 요소).

| 표시 항목 | 소스 | 비고 |
|-----------|------|------|
| 이름 첫 글자 | `patient.name?.charAt(0)` | Avatar 내부 |
| 환자명 | `patient.name` | truncate 적용 |
| 연락처 | `patient.phone` | text-xs |
| 위험도 | `getPatientRisk(patient)` | Mock 계산 (섹션 D 참조) |

> Care Home (CareDashboardPage)의 `<table>` 구조와 다름.
> PatientsPage는 리스트+상세 분할 레이아웃이므로 테이블 대신 카드형 사용.

---

## D. 위험도 계산 방식

### 현재 구현: Mock 로직

```typescript
// PatientsPage.tsx:121-126
const getPatientRisk = (patient: PharmacyCustomer): keyof typeof RISK_CONFIG => {
  if (patient.diabetesType === 'type1') return 'high';
  if (patient.diabetesType === 'type2') return 'moderate';
  return 'low';
};
```

| diabetesType 값 | 위험도 | 라벨 |
|-----------------|--------|------|
| `'type1'` | high | 고위험 |
| `'type2'` | moderate | 주의 필요 |
| `'gestational'`, `'prediabetes'`, `undefined` | low | 양호 |

### 코드 주석

```typescript
// 위험도 결정 (Mock - 실제로는 Care API에서 가져와야 함)
```

### RISK_CONFIG 정의

```typescript
const RISK_CONFIG = {
  high: { label: '고위험', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  moderate: { label: '주의 필요', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  low: { label: '양호', color: 'bg-green-100 text-green-700', icon: CheckCircle },
};
```

> CareDashboardPage의 `RISK_CONFIG`와 동일한 구조이나 `icon` 필드 추가.
> CareDashboardPage: `label: '주의'` vs PatientsPage: `label: '주의 필요'` (라벨 차이 존재).

### Summary Badges의 카운트 소스

Header의 "고위험 N / 주의 N / 양호 N" 배지는 `getCareDashboardSummary()` 응답 사용.
이 값은 백엔드 `care_kpi_snapshots` 테이블 기반 (실제 분석 결과).

> **불일치**: 좌측 리스트의 위험도 배지는 `diabetesType` Mock,
> Header의 summary 카운트는 `care_kpi_snapshots` 실제 데이터.
> 두 데이터 소스가 다르다.

---

## E. 탭 구조 (상세 패널)

### TAB_CONFIG

```typescript
const TAB_CONFIG: { key: TabType; label: string; icon: typeof Activity }[] = [
  { key: 'info', label: '기본 정보', icon: Users },
  { key: 'analysis', label: '분석', icon: Activity },
  { key: 'coaching', label: '상담', icon: MessageCircle },
  { key: 'progress', label: '성과', icon: TrendingUp },
];
```

### 탭별 구현 상태

| 탭 | key | 구현 상태 | 내용 |
|----|-----|-----------|------|
| 기본 정보 | `info` | **구현됨** | 2×2 grid 카드 |
| 분석 | `analysis` | **플레이스홀더** | "혈당 분석 데이터가 연동되면 여기에 표시됩니다" |
| 상담 | `coaching` | **플레이스홀더** | "상담 기록이 연동되면 여기에 표시됩니다" |
| 성과 | `progress` | **플레이스홀더** | "성과 추적 데이터가 연동되면 여기에 표시됩니다" |

### 기본 정보 탭 (info) — 구현 상세

```
grid grid-cols-2 gap-4
```

| 카드 | 라벨 | 소스 필드 | 포맷 |
|------|------|-----------|------|
| 이메일 | "이메일" | `selectedPatient.email` | 없으면 `-` |
| 당뇨 유형 | "당뇨 유형" | `selectedPatient.diabetesType` | type1→"제1형 당뇨", type2→"제2형 당뇨", gestational→"임신성 당뇨", prediabetes→"당뇨 전단계", null→`-` |
| 마지막 주문 | "마지막 주문" | `selectedPatient.lastOrderAt` | `toLocaleDateString('ko-KR')`, 없으면 `-` |
| 총 구매액 | "총 구매액" | `selectedPatient.totalSpent` | `toLocaleString()원` |

> 모든 정보는 GlycoPharm 약국 고객 필드 (`PharmacyCustomer`).
> Care 분석 데이터(TIR, CV, risk)는 info 탭에 표시되지 않음.

### 플레이스홀더 탭 공통 구조

```
text-center py-12
[Icon w-12 h-12 text-slate-200] + 메시지 + "GlucoseView Care 모듈 연동 예정"
```

---

## F. API 호출 흐름

### 초기 로딩 (`loadData` 콜백)

```typescript
const [customersRes, summaryRes] = await Promise.all([
  pharmacyApi.getCustomers({ search, pageSize: 50 }),
  pharmacyApi.getCareDashboardSummary().catch(() => null),
]);
```

| API | 엔드포인트 | 용도 | 에러 처리 |
|-----|-----------|------|-----------|
| `getCustomers()` | `/api/v1/glycopharm/pharmacy/customers` | 환자 목록 | throw → 에러 상태 |
| `getCareDashboardSummary()` | `/api/v1/care/dashboard` | 위험도 카운트 | `.catch(() => null)` 무시 |

### 데이터 흐름 상세

#### getCustomers 응답

```typescript
interface PharmacyCustomer {
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

- 소스: GlycoPharm 약국 고객 테이블 (`glycopharm_pharmacy_customers`)
- 페이지 크기: 50 (CareDashboardPage는 100)
- 검색: `debouncedSearch` 기반

#### getCareDashboardSummary 응답

```typescript
interface CareDashboardSummary {
  totalPatients: number;
  highRiskCount: number;
  moderateRiskCount: number;
  lowRiskCount: number;
  recentCoachingCount: number;
  improvingCount: number;
}
```

- 소스: Care 모듈 (`care_kpi_snapshots`, `care_coaching_sessions`, `glucoseview_customers`)
- 프론트엔드 타입은 카운트 필드만 정의
- 백엔드 `CareDashboardDto`에는 `recentSnapshots`, `recentSessions`도 포함

### 재로딩 트리거

| 트리거 | 동작 |
|--------|------|
| `debouncedSearch` 변경 | `loadData()` 재실행 (useCallback dependency) |
| "다시 시도" 버튼 | `loadData()` 직접 호출 |
| URL 파라미터 변경 | 환자 선택만 (목록 재로딩 없음) |

### 호출되지 않는 API

PatientsPage에서 **호출하지 않는** Care API:

| API | 비고 |
|-----|------|
| `getCareAnalysis()` | 분석 탭 미구현 |
| `getCareKpi()` | 성과 탭 미구현 |
| `getCoachingSessions()` | 상담 탭 미구현 |
| `createCoachingSession()` | 상담 기록 미구현 |

> GlucoseView의 `InsightsPage.tsx`에서는 이 API들을 모두 호출함.

---

## G. 상태 관리

### useState 목록

| 상태 | 타입 | 초기값 | 용도 |
|------|------|--------|------|
| `patients` | `PharmacyCustomer[]` | `[]` | 전체 환자 목록 |
| `summary` | `CareDashboardSummary \| null` | `null` | 위험도 카운트 (header badges) |
| `loading` | `boolean` | `true` | 로딩 스피너 |
| `error` | `string \| null` | `null` | 에러 메시지 |
| `searchQuery` | `string` | `''` | 검색 입력값 (즉시 반영) |
| `debouncedSearch` | `string` | `''` | 디바운스된 검색값 (API 호출용) |
| `riskFilter` | `RiskLevel` | `'all'` | 위험도 필터 (all/high/moderate/low) |
| `selectedPatient` | `PharmacyCustomer \| null` | `null` | 선택된 환자 |
| `activeTab` | `TabType` | `'info'` | 활성 탭 |

### 검색 디바운스

```typescript
useEffect(() => {
  const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
  return () => clearTimeout(timer);
}, [searchQuery]);
```

### 클라이언트 사이드 필터링

위험도 필터는 **클라이언트에서** 적용:

```typescript
const filteredPatients = patients.filter((p) => {
  if (riskFilter === 'all') return true;
  return getPatientRisk(p) === riskFilter;
});
```

> 검색(`search`)은 서버 사이드 (API 파라미터), 위험도 필터는 클라이언트 사이드.

### URL 파라미터 동기화

```typescript
// 읽기: URL → 상태
useEffect(() => {
  const patientId = searchParams.get('id');
  if (patientId && patients.length > 0) {
    const patient = patients.find((p) => p.id === patientId);
    if (patient) setSelectedPatient(patient);
  }
}, [searchParams, patients]);

// 쓰기: 상태 → URL
const handleSelectPatient = (patient: PharmacyCustomer) => {
  setSelectedPatient(patient);
  setActiveTab('info');
  setSearchParams({ id: patient.id });
};
```

### 환자 선택 시 탭 초기화

`handleSelectPatient`에서 `setActiveTab('info')` 호출.
다른 환자 선택 시 항상 "기본 정보" 탭으로 리셋.

---

## H. Care Home과의 관계

### 네비게이션 흐름

```
Care Home (CareDashboardPage)
  └── "+ 환자 등록" 버튼 → navigate('/patients')
  └── 테이블 행 클릭 → navigate('/patients?id=${patient.id}')

PatientsPage
  └── URL ?id= 파라미터로 환자 자동 선택
```

### 동일한 API 사용

| API | CareDashboardPage | PatientsPage |
|-----|-------------------|-------------|
| `getCustomers()` | pageSize: 100 | pageSize: 50 |
| `getCareDashboardSummary()` | 미사용 | `.catch(() => null)` |

### 위험도 계산 동일

두 페이지 모두 `diabetesType` 기반 Mock 로직 사용:

```typescript
// CareDashboardPage
const getRisk = (p: PharmacyCustomer): keyof typeof RISK_CONFIG => {
  if (p.diabetesType === 'type1') return 'high';
  if (p.diabetesType === 'type2') return 'moderate';
  return 'low';
};

// PatientsPage
const getPatientRisk = (patient: PharmacyCustomer): keyof typeof RISK_CONFIG => {
  if (patient.diabetesType === 'type1') return 'high';
  if (patient.diabetesType === 'type2') return 'moderate';
  return 'low';
};
```

### 라벨 차이

| 위험도 | CareDashboardPage | PatientsPage |
|--------|-------------------|-------------|
| moderate | `'주의'` | `'주의 필요'` |

### 레이아웃 차이

| 항목 | CareDashboardPage | PatientsPage |
|------|-------------------|-------------|
| 구조 | Hero + ActionBar + Table (단일 컬럼) | Header + Split Layout (1:2 grid) |
| 환자 표시 | `<table>` 행 | 카드형 `<button>` 리스트 |
| 상세 보기 | 없음 (행 클릭 → PatientsPage 이동) | 우측 패널 (탭 기반) |
| 검색 | ActionBar 내 `<input>` | 좌측 패널 내 `<input>` |
| 필터 | 없음 | 위험도 드롭다운 |
| 최근 분석일 | 컬럼 있음 (항상 "-") | 표시 없음 |

### GlucoseView InsightsPage와의 비교

| 항목 | GlycoPharm PatientsPage | GlucoseView InsightsPage |
|------|------------------------|-------------------------|
| 환자 선택 | 좌측 리스트 클릭 | `<select>` 드롭다운 |
| 분석 표시 | 플레이스홀더 | TIR/CV/Risk 카드 + KPI 비교 + 인사이트 |
| 상담 기록 | 플레이스홀더 | 세션 목록 + 기록 모달 |
| 데이터 소스 | GlycoPharm 고객 | GlucoseView 고객 |
| Care API 호출 | 없음 | `getCareAnalysis`, `getCareKpi`, `getCoachingSessions` |

---

## 파일 인벤토리

### 직접 관련 파일

| 파일 | 줄 수 | 역할 |
|------|-------|------|
| `services/web-glycopharm/src/pages/care/PatientsPage.tsx` | 400 | 환자 관리 페이지 (본 조사 대상) |
| `services/web-glycopharm/src/pages/care/index.ts` | 6 | 배럴 내보내기 |
| `services/web-glycopharm/src/pages/care/CareDashboardPage.tsx` | 174 | Care Home (이동 원점) |
| `services/web-glycopharm/src/api/pharmacy.ts` | 521 | API 클라이언트 + 타입 정의 |

### 간접 관련 파일

| 파일 | 관계 |
|------|------|
| `services/web-glycopharm/src/App.tsx` | 라우트 정의, `RoleBasedHome` |
| `apps/api-server/src/modules/care/care-dashboard.controller.ts` | `/api/v1/care/dashboard` 백엔드 |
| `services/web-glucoseview/src/pages/InsightsPage.tsx` | 유사 기능 (GlucoseView 측 구현) |

---

## 타입 정의 요약

### PatientsPage 내부 타입

```typescript
type RiskLevel = 'all' | 'high' | 'moderate' | 'low';
type TabType = 'info' | 'analysis' | 'coaching' | 'progress';
```

### 외부 의존 타입

| 타입 | 소스 | 사용 위치 |
|------|------|-----------|
| `PharmacyCustomer` | `@/api/pharmacy` | 환자 목록/상세 |
| `CareDashboardSummary` | `@/api/pharmacy` | Header summary badges |

### lucide-react 아이콘 사용

```
Search, Users, AlertTriangle, AlertCircle, CheckCircle,
Activity, MessageCircle, TrendingUp, MoreVertical,
Loader2, Filter, ChevronRight
```

---

## 요약

PatientsPage는 **GlycoPharm 약국 고객 데이터 기반의 List/Detail 분할 레이아웃**이다.

1. **데이터 소스**: `pharmacyApi.getCustomers()` (GlycoPharm 약국 고객 테이블)
2. **위험도**: `diabetesType` 기반 Mock 로직 (Care API 분석 결과 미사용)
3. **탭 4개 중 1개만 구현**: `info` 탭 (이메일, 당뇨 유형, 주문 이력)
4. **Care API 연동 없음**: 분석/상담/성과 탭은 모두 플레이스홀더
5. **URL 동기화**: `?id=` 파라미터로 Care Home → PatientsPage 환자 선택 연결
6. **Header의 summary badges**는 Care 백엔드 데이터이나, 리스트의 위험도 배지는 Mock
