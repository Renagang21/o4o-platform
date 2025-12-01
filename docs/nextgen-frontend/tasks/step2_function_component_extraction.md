# Step 2: 기능 컴포넌트화(Function Component Extraction) 작업 요청서

**작성일**: 2025-12-01
**대상 프로젝트**: O4O Platform - Page Generator (Antigravity)
**작업 범위**: Shortcode → Pure Function Component 변환

---

## 📋 작업 개요

### 목표
31개의 기존 Shortcode 컴포넌트를 **순수 기능 컴포넌트(Pure Function Component)**로 전환하여:
- **Layout 로직과 Business 로직을 완전히 분리**
- **재사용성 극대화** (페이지 빌더, 직접 임포트, API 기반 렌더링 모두 지원)
- **일관된 데이터 레이어 패턴** (React Query 표준화)
- **성능 최적화** (레이아웃 중복 제거, 번들 사이즈 감소)

### 현재 상태 (AS-IS)
```tsx
// ❌ Shortcode 컴포넌트: Layout + Business Logic 혼재
export const SellerDashboardShortcode: React.FC = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/seller/dashboard').then(r => r.json()).then(setData);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">  {/* Layout */}
      <div className="max-w-7xl mx-auto">           {/* Layout */}
        <h1 className="text-2xl font-bold mb-6">    {/* Layout */}
          판매자 대시보드
        </h1>
        <div className="grid grid-cols-3 gap-6">    {/* Layout */}
          {/* Business Logic */}
          {data?.stats.map(stat => (
            <div className="bg-white p-6 rounded-lg shadow"> {/* Layout */}
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

**문제점**:
- 93.5%의 컴포넌트가 Layout 로직 포함 (29/31개)
- `container mx-auto px-4 py-8` 같은 레이아웃 클래스가 19개 컴포넌트에 중복
- Grid/Flex 레이아웃이 각 컴포넌트마다 다르게 구현
- 데이터 fetching 로직이 컴포넌트에 강하게 결합됨
- 페이지 빌더에서 레이아웃을 커스터마이즈할 방법이 없음

### 목표 상태 (TO-BE)
```tsx
// ✅ Pure Function Component: Business Logic만 포함
export function sellerDashboard(options?: SellerDashboardOptions) {
  const { data, isLoading, error } = useSellerDashboardData(options?.period);

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <ErrorMessage error={error} />;

  return {
    stats: data.stats,
    charts: {
      salesTrend: <LineChart data={data.salesTrend} />,
      ordersByStatus: <PieChart data={data.orderStatus} />
    },
    tables: {
      recentOrders: <OrderTable data={data.recentOrders} />
    }
  };
}

// Layout은 페이지나 레이아웃 컴포넌트에서 처리
// apps/main-site/src/pages/dashboard/seller.tsx
export default function SellerDashboardPage() {
  const dashboard = sellerDashboard({ period: '30d' });

  return (
    <DashboardLayout>
      <DashboardHeader title="판매자 대시보드" />
      <KPIGrid stats={dashboard.stats} columns={4} />
      <ChartRow>
        <ChartCard title="매출 추이">{dashboard.charts.salesTrend}</ChartCard>
        <ChartCard title="주문 현황">{dashboard.charts.ordersByStatus}</ChartCard>
      </ChartRow>
      <TableSection>{dashboard.tables.recentOrders}</TableSection>
    </DashboardLayout>
  );
}
```

**개선 효과**:
- ✅ Layout과 Business Logic 완전 분리
- ✅ 레이아웃은 페이지/레이아웃 컴포넌트에서 자유롭게 조합
- ✅ 데이터 레이어는 React Query hooks로 표준화
- ✅ 동일한 기능 컴포넌트를 여러 레이아웃에서 재사용 가능
- ✅ 페이지 빌더에서 레이아웃 블록으로 조립 가능

---

## 🎯 변환 원칙

### 1. 네이밍 규칙
```typescript
// ❌ Before: PascalCase Component
export const SellerDashboardShortcode: React.FC = () => { ... };

// ✅ After: camelCase Function
export function sellerDashboard(options?: SellerDashboardOptions) { ... }
```

**규칙**:
- Component → function 변환
- PascalCase → camelCase
- "Shortcode" suffix 제거
- Options 인터페이스는 PascalCase 유지 (예: `SellerDashboardOptions`)

### 2. 파일 위치
```
apps/main-site/src/
├── components/shortcodes/        # ❌ 기존 위치 (삭제 대상)
│   └── SellerDashboard.tsx
│
├── shortcodes/_functions/         # ✅ 새 위치
│   └── dropshipping/
│       ├── sellerDashboard.tsx
│       ├── supplierDashboard.tsx
│       └── partnerDashboard.tsx
│
└── pages/dashboard/               # ✅ Layout 적용 페이지
    ├── seller.tsx
    ├── supplier.tsx
    └── partner.tsx
```

**디렉토리 구조**:
- `shortcodes/_functions/`: 순수 기능 컴포넌트 (카테고리별 폴더)
  - `dropshipping/`: 드롭쉬핑 관련 (8개)
  - `commerce/`: 커머스 관련 (9개)
  - `customer/`: 고객 관련 (3개)
  - `auth/`: 인증 관련 (3개)
  - `admin/`: 어드민 관련 (2개)

### 3. Layout 제거 패턴

#### 제거할 클래스들:
```typescript
// ❌ Container/Wrapper 레이아웃
"container mx-auto"
"px-4 py-8"
"max-w-7xl"
"max-w-4xl"

// ❌ Grid/Flex 레이아웃
"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
"flex flex-col gap-4"
"space-y-6"

// ❌ Card 스타일
"bg-white rounded-lg shadow-sm border"
"p-6"
```

#### 유지할 클래스들:
```typescript
// ✅ 의미론적 스타일 (컴포넌트 고유 기능)
"text-red-500"           // 상태 표시 (에러)
"font-bold text-2xl"     // 타이포그래피 (강조)
"bg-blue-500 hover:bg-blue-600"  // 인터랙션 스타일
```

### 4. 데이터 레이어 표준화

#### Before: useState + useEffect
```typescript
// ❌ 각 컴포넌트마다 다른 데이터 fetching 패턴
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  fetch('/api/seller/dashboard')
    .then(r => r.json())
    .then(setData)
    .catch(setError)
    .finally(() => setLoading(false));
}, []);
```

#### After: React Query Hooks
```typescript
// ✅ 표준화된 데이터 레이어
// apps/main-site/src/hooks/queries/useSellerDashboardData.ts
export function useSellerDashboardData(period?: string) {
  return useQuery({
    queryKey: ['seller-dashboard', period],
    queryFn: async () => {
      const { data } = await authClient.api.get(
        `/api/dropshipping/seller/dashboard`,
        { params: { period } }
      );
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5분
  });
}

// apps/main-site/src/shortcodes/_functions/dropshipping/sellerDashboard.tsx
export function sellerDashboard(options?: SellerDashboardOptions) {
  const { data, isLoading, error } = useSellerDashboardData(options?.period);
  // ...
}
```

**React Query 표준 패턴**:
- 모든 데이터 fetching은 `src/hooks/queries/` 폴더의 custom hooks로 분리
- `authClient.api.get/post/put/delete` 사용 (하드코딩 금지)
- staleTime, cacheTime 설정으로 성능 최적화
- queryKey 네이밍: `['{domain}', ...params]` (예: `['seller-dashboard', period]`)

### 5. Props 인터페이스 설계

```typescript
// ✅ Options 패턴 (선택적 설정)
export interface SellerDashboardOptions {
  period?: '7d' | '30d' | '90d' | '1y';
  defaultSection?: SellerSection;
  showMenu?: boolean;
}

export function sellerDashboard(options?: SellerDashboardOptions) {
  const period = options?.period ?? '30d';
  const defaultSection = options?.defaultSection ?? 'overview';
  // ...
}
```

**인터페이스 작성 규칙**:
- 모든 props는 optional (`?`) 처리
- 기본값은 함수 내부에서 `??` 연산자로 처리
- 타입은 명확히 정의 (union types 적극 활용)

---

## 📂 파일 구조 템플릿

### Function Component 파일
```typescript
// apps/main-site/src/shortcodes/_functions/dropshipping/sellerDashboard.tsx

import React from 'react';
import { useSellerDashboardData } from '../../../hooks/queries/useSellerDashboardData';
import { KPICard } from '../../../components/dashboard/common/KPICard';
import { LineChart, PieChart, BarChart } from '../../../components/charts';
import { DashboardSkeleton } from '../../../components/common/Skeleton';
import { ErrorMessage } from '../../../components/common/ErrorMessage';

/**
 * 판매자 대시보드 기능 컴포넌트
 *
 * @param options - Dashboard 설정
 * @param options.period - 통계 기간 (7d, 30d, 90d, 1y)
 * @param options.defaultSection - 기본 섹션
 * @param options.showMenu - 메뉴 표시 여부
 * @returns Dashboard 데이터 및 UI 요소
 */
export interface SellerDashboardOptions {
  period?: '7d' | '30d' | '90d' | '1y';
  defaultSection?: 'overview' | 'products' | 'orders' | 'analytics' | 'inventory' | 'settlements';
  showMenu?: boolean;
}

export function sellerDashboard(options?: SellerDashboardOptions) {
  const period = options?.period ?? '30d';
  const { data, isLoading, error } = useSellerDashboardData(period);

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <ErrorMessage error={error} />;

  return {
    kpis: [
      { label: '총 매출', value: data.totalSales, icon: 'dollar' },
      { label: '주문 수', value: data.totalOrders, icon: 'cart' },
      { label: '상품 수', value: data.totalProducts, icon: 'package' },
      { label: '전환율', value: `${data.conversionRate}%`, icon: 'trending' },
    ],
    charts: {
      salesTrend: <LineChart data={data.salesTrend} />,
      ordersByStatus: <PieChart data={data.ordersByStatus} />,
      topProducts: <BarChart data={data.topProducts} />,
    },
    tables: {
      recentOrders: data.recentOrders,
      lowStockItems: data.lowStockItems,
    },
  };
}
```

### React Query Hook 파일
```typescript
// apps/main-site/src/hooks/queries/useSellerDashboardData.ts

import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';

export interface SellerDashboardData {
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  conversionRate: number;
  salesTrend: Array<{ date: string; amount: number }>;
  ordersByStatus: Record<string, number>;
  topProducts: Array<{ name: string; sales: number }>;
  recentOrders: Array<any>;
  lowStockItems: Array<any>;
}

export function useSellerDashboardData(period: string = '30d') {
  return useQuery<SellerDashboardData>({
    queryKey: ['seller-dashboard', period],
    queryFn: async () => {
      const { data } = await authClient.api.get(
        '/api/dropshipping/seller/dashboard',
        { params: { period } }
      );
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5분 캐시
    retry: 2,
  });
}
```

### Page 파일 (Layout 적용)
```typescript
// apps/main-site/src/pages/dashboard/seller.tsx

import React from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { DashboardHeader } from '../../components/dashboard/DashboardHeader';
import { KPIGrid } from '../../components/dashboard/common/KPIGrid';
import { ChartCard } from '../../components/dashboard/common/ChartCard';
import { TableSection } from '../../components/dashboard/common/TableSection';
import { sellerDashboard } from '../../shortcodes/_functions/dropshipping/sellerDashboard';

export default function SellerDashboardPage() {
  const dashboard = sellerDashboard({ period: '30d', showMenu: true });

  return (
    <DashboardLayout>
      <DashboardHeader title="판매자 대시보드" />

      <KPIGrid kpis={dashboard.kpis} columns={4} gap={6} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ChartCard title="매출 추이">
          {dashboard.charts.salesTrend}
        </ChartCard>
        <ChartCard title="주문 현황">
          {dashboard.charts.ordersByStatus}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ChartCard title="인기 상품">
          {dashboard.charts.topProducts}
        </ChartCard>
        <TableSection title="최근 주문" data={dashboard.tables.recentOrders} />
      </div>

      <TableSection
        title="재고 부족 상품"
        data={dashboard.tables.lowStockItems}
        className="mt-6"
      />
    </DashboardLayout>
  );
}
```

---

## 🔄 변환 프로세스

### Phase 1: 분석 및 준비
1. **기존 코드 분석**
   - Layout 클래스 식별
   - 데이터 fetching 로직 파악
   - Props 인터페이스 검토
   - 의존성 컴포넌트 확인

2. **파일 구조 준비**
   - `shortcodes/_functions/{category}/` 디렉토리 생성
   - `hooks/queries/` 디렉토리 확인
   - `layouts/` 및 `pages/` 디렉토리 확인

### Phase 2: Function Component 생성
1. **데이터 레이어 분리**
   - React Query hook 생성 (`useXxxData.ts`)
   - API 경로 확인 (하드코딩 제거)
   - 타입 인터페이스 정의

2. **기능 컴포넌트 작성**
   - Layout 클래스 완전 제거
   - Business logic만 유지
   - 반환값 구조화 (kpis, charts, tables)

3. **테스트 페이지 생성**
   - `pages/{category}/{name}.tsx` 파일 생성
   - Layout 컴포넌트 적용
   - 기능 컴포넌트 임포트 및 사용

### Phase 3: 검증 및 정리
1. **동작 테스트**
   - 로컬 개발 서버 실행
   - 기능 정상 작동 확인
   - 레이아웃 커스터마이즈 가능 확인

2. **기존 파일 정리**
   - `components/shortcodes/` 내 기존 파일 삭제
   - Import 경로 업데이트
   - 레지스트리 업데이트

3. **문서화**
   - JSDoc 주석 추가
   - README 업데이트
   - 변환 완료 체크리스트 업데이트

---

## ✅ 완료 체크리스트

각 컴포넌트 변환 시 아래 항목을 모두 체크:

- [ ] React Query hook 생성 (`hooks/queries/use{Name}Data.ts`)
- [ ] Function component 생성 (`shortcodes/_functions/{category}/{name}.tsx`)
- [ ] Layout 클래스 완전 제거 확인
- [ ] authClient 사용 (하드코딩 제거)
- [ ] Options 인터페이스 정의
- [ ] JSDoc 주석 작성
- [ ] 테스트 페이지 생성 (`pages/{category}/{name}.tsx`)
- [ ] 로컬 테스트 통과
- [ ] 기존 shortcode 파일 삭제
- [ ] Import 경로 업데이트
- [ ] Registry 업데이트

---

## 📊 우선순위 (Scan Report 기반)

### Priority 1: Dropshipping (8개) - 즉시 착수
- SupplierDashboard (packages, main-site)
- SellerDashboard (packages, main-site, admin-dashboard)
- PartnerDashboard
- AffiliateDashboard

### Priority 2: Commerce (9개) - 2주차
- ProductGrid (main-site, ecommerce)
- Product
- Cart
- Checkout
- OrderList
- OrderDetail
- OrderDetailShortcode

### Priority 3: Customer & Auth (6개) - 3주차
- CustomerDashboard
- AccountShortcode
- Wishlist
- LoginShortcode
- SignupShortcode
- SocialLogin

### Priority 4: Admin (2개) - 4주차
- PlatformStats
- SellerDashboard (admin view)

### Skip: Infrastructure (4개) - 변환 제외
- ShortcodeProvider
- ShortcodeRenderer
- ShortcodeErrorBoundary
- PresetShortcode

---

## 🚀 다음 단계

이 문서를 기반으로 **Step 3: Priority 1 상세 작업 목록**을 생성합니다.
각 Dropshipping Dashboard 컴포넌트별 파일별 변환 지시서를 작성합니다.

---

**작성자**: Claude (Sonnet 4.5)
**검토**: Rena
**버전**: 1.0
