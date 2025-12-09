# Step 3: Priority 1 (Dropshipping Dashboard) 상세 변환 가이드

**작성일**: 2025-12-01
**대상**: Dropshipping Dashboard 8개 컴포넌트
**예상 작업 시간**: 32시간 (컴포넌트당 4시간)

---

## 📊 Priority 1 대상 컴포넌트

| # | 컴포넌트 | 파일 경로 | 카테고리 | 복잡도 |
|---|---------|----------|---------|--------|
| 1 | SupplierDashboard | `packages/shortcodes/src/dropshipping/SupplierDashboard.tsx` | dropshipping | Medium |
| 2 | SupplierDashboard | `apps/main-site/src/components/shortcodes/SupplierDashboard.tsx` | dropshipping | High |
| 3 | SellerDashboard | `packages/shortcodes/src/dropshipping/SellerDashboard.tsx` | dropshipping | Medium |
| 4 | SellerDashboard | `apps/main-site/src/components/shortcodes/SellerDashboard.tsx` | dropshipping | High |
| 5 | SellerDashboard | `apps/admin-dashboard/src/components/shortcodes/dropshipping/seller/SellerDashboard.tsx` | admin | High |
| 6 | PartnerDashboard | `apps/main-site/src/components/shortcodes/PartnerDashboard.tsx` | dropshipping | High |
| 7 | AffiliateDashboard | `packages/shortcodes/src/dropshipping/AffiliateDashboard.tsx` | dropshipping | Medium |

**총 7개 파일** (PartnerDashboard는 AffiliateDashboard의 alias로 간주)

---

## 🎯 변환 전략

### 통합 접근 방식
기존 2가지 버전을 **1개의 Function Component + 2개의 Page**로 통합:
- `packages/shortcodes/` → 제거 (mock data, 불필요)
- `apps/main-site/components/shortcodes/` → `apps/main-site/shortcodes/_functions/` 이동 + 정리
- `apps/main-site/pages/dashboard/{role}.tsx` → 새로 생성 (Layout 적용)

### 파일 구조 (변환 후)
```
apps/main-site/src/
├── shortcodes/_functions/dropshipping/
│   ├── supplierDashboard.tsx       # 통합 Function Component
│   ├── sellerDashboard.tsx         # 통합 Function Component
│   └── partnerDashboard.tsx        # 통합 Function Component (affiliate와 동일)
│
├── hooks/queries/
│   ├── useSupplierDashboardData.ts # React Query Hook
│   ├── useSellerDashboardData.ts   # React Query Hook
│   └── usePartnerDashboardData.ts  # React Query Hook
│
└── pages/dashboard/
    ├── supplier.tsx                # Layout 적용 페이지
    ├── seller.tsx                  # Layout 적용 페이지
    └── partner.tsx                 # Layout 적용 페이지
```

---

## 📝 컴포넌트별 상세 작업 지시

---

### 1. SupplierDashboard

#### 1-1. React Query Hook 생성

**파일**: `apps/main-site/src/hooks/queries/useSupplierDashboardData.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';

export interface SupplierDashboardStats {
  totalProducts: number;
  approvedProducts: number;
  pendingProducts: number;
  rejectedProducts: number;
  totalRevenue: number;
  totalProfit: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  monthlyOrders: number;
  avgOrderValue: number;
  pendingFulfillment: number;
  topSellerCount: number;
}

export interface SupplierTopProduct {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  stock: number;
  image: string;
}

export interface SupplierRecentOrder {
  id: string;
  orderNumber: string;
  sellerName: string;
  date: string;
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  items: number;
}

export interface SupplierDashboardData {
  stats: SupplierDashboardStats;
  topProducts: SupplierTopProduct[];
  recentOrders: SupplierRecentOrder[];
  salesTrend: Array<{ date: string; amount: number }>;
  ordersByStatus: Record<string, number>;
}

export function useSupplierDashboardData(period: string = '30d') {
  return useQuery<SupplierDashboardData>({
    queryKey: ['supplier-dashboard', period],
    queryFn: async () => {
      const { data } = await authClient.api.get(
        '/api/dropshipping/supplier/dashboard',
        { params: { period } }
      );
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5분 캐시
    retry: 2,
  });
}
```

**작업 체크리스트**:
- [ ] 파일 생성: `apps/main-site/src/hooks/queries/useSupplierDashboardData.ts`
- [ ] 타입 인터페이스 정의 (SupplierDashboardStats, SupplierTopProduct, etc.)
- [ ] authClient.api.get 사용 (하드코딩 제거)
- [ ] queryKey: `['supplier-dashboard', period]` 설정
- [ ] staleTime 설정 (5분)

#### 1-2. Function Component 생성

**파일**: `apps/main-site/src/shortcodes/_functions/dropshipping/supplierDashboard.tsx`

**소스 파일 분석**:
- **현재 위치**: `apps/main-site/src/components/shortcodes/SupplierDashboard.tsx`
- **제거할 Layout 패턴**:
  - Line 135-137: `<div className="container mx-auto px-4 py-8">` → 제거
  - Line 143-145: `<div className="max-w-7xl mx-auto">` → 제거
  - Line 165-167: Grid layouts (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4`) → 제거
  - Line 212-214: Card wrappers (`bg-white rounded-lg shadow-sm border`) → 제거
- **유지할 Business Logic**:
  - Line 97-100: Section navigation (`useDashboardSection`)
  - Line 102-130: Data fetching logic → React Query로 전환
  - Line 170-300: KPI cards, charts, tables 렌더링 → 구조화된 객체로 반환
- **제거할 클래스**: `container`, `mx-auto`, `px-4`, `py-8`, `max-w-7xl`, `grid`, `gap-6`, `bg-white`, `rounded-lg`, `shadow-sm`, `border`

**변환 코드**:
```typescript
import React from 'react';
import { useSupplierDashboardData } from '../../../hooks/queries/useSupplierDashboardData';
import { KPICard } from '../../../components/dashboard/common/KPICard';
import { LineChart, PieChart, BarChart } from '../../../components/charts';
import { DashboardSkeleton } from '../../../components/common/Skeleton';
import { ErrorMessage } from '../../../components/common/ErrorMessage';
import { Package, TrendingUp, Warehouse, DollarSign, BarChart3 } from 'lucide-react';

/**
 * 공급자 대시보드 기능 컴포넌트
 *
 * Alibaba 1688, AliExpress, DHgate 공급자 포털 연구 기반
 *
 * @param options - Dashboard 설정
 * @param options.period - 통계 기간 (7d, 30d, 90d, 1y)
 * @param options.defaultSection - 기본 섹션
 * @param options.showMenu - 메뉴 표시 여부
 * @returns Dashboard 데이터 및 UI 요소
 */
export interface SupplierDashboardOptions {
  period?: '7d' | '30d' | '90d' | '1y';
  defaultSection?: 'overview' | 'products' | 'orders' | 'analytics' | 'inventory';
  showMenu?: boolean;
}

export function supplierDashboard(options?: SupplierDashboardOptions) {
  const period = options?.period ?? '30d';
  const { data, isLoading, error } = useSupplierDashboardData(period);

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return null;

  return {
    kpis: [
      {
        label: '전체 상품',
        value: data.stats.totalProducts,
        icon: Package,
        trend: '+12%',
        trendDirection: 'up' as const,
      },
      {
        label: '승인 상품',
        value: data.stats.approvedProducts,
        icon: TrendingUp,
        subtext: `대기: ${data.stats.pendingProducts}`,
      },
      {
        label: '월간 주문',
        value: data.stats.monthlyOrders,
        icon: BarChart3,
        trend: '+8%',
        trendDirection: 'up' as const,
      },
      {
        label: '총 수익',
        value: `₩${data.stats.totalRevenue.toLocaleString()}`,
        icon: DollarSign,
        subtext: `이익: ₩${data.stats.totalProfit.toLocaleString()}`,
      },
      {
        label: '재고 부족',
        value: data.stats.lowStockProducts,
        icon: Warehouse,
        alert: data.stats.lowStockProducts > 0,
      },
    ],
    charts: {
      salesTrend: (
        <LineChart
          data={data.salesTrend}
          xKey="date"
          yKey="amount"
          color="#3b82f6"
        />
      ),
      ordersByStatus: (
        <PieChart
          data={Object.entries(data.ordersByStatus).map(([status, count]) => ({
            name: status,
            value: count,
          }))}
        />
      ),
      topProducts: (
        <BarChart
          data={data.topProducts}
          xKey="name"
          yKey="revenue"
          color="#10b981"
        />
      ),
    },
    tables: {
      recentOrders: data.recentOrders,
      topProducts: data.topProducts,
    },
  };
}
```

**작업 체크리스트**:
- [ ] 파일 생성: `apps/main-site/src/shortcodes/_functions/dropshipping/supplierDashboard.tsx`
- [ ] useSupplierDashboardData hook 임포트
- [ ] Layout 클래스 완전 제거 (container, mx-auto, px-4, py-8, grid, gap-6 등)
- [ ] KPIs 배열 구조화 (label, value, icon, trend)
- [ ] Charts 객체 구조화 (salesTrend, ordersByStatus, topProducts)
- [ ] Tables 객체 구조화 (recentOrders, topProducts)
- [ ] JSDoc 주석 추가
- [ ] Options 인터페이스 정의

#### 1-3. Page 생성 (Layout 적용)

**파일**: `apps/main-site/src/pages/dashboard/supplier.tsx`

```typescript
import React from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { DashboardHeader } from '../../components/dashboard/DashboardHeader';
import { KPIGrid } from '../../components/dashboard/common/KPIGrid';
import { ChartCard } from '../../components/dashboard/common/ChartCard';
import { TableSection } from '../../components/dashboard/common/TableSection';
import { supplierDashboard } from '../../shortcodes/_functions/dropshipping/supplierDashboard';

export default function SupplierDashboardPage() {
  const dashboard = supplierDashboard({ period: '30d', showMenu: true });

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <DashboardHeader title="공급자 대시보드" />

          <KPIGrid kpis={dashboard.kpis} columns={5} gap={6} className="mb-6" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ChartCard title="매출 추이">
              {dashboard.charts.salesTrend}
            </ChartCard>
            <ChartCard title="주문 현황">
              {dashboard.charts.ordersByStatus}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ChartCard title="인기 상품 Top 10">
              {dashboard.charts.topProducts}
            </ChartCard>
            <TableSection
              title="최근 주문"
              data={dashboard.tables.recentOrders}
              columns={['orderNumber', 'sellerName', 'total', 'status', 'date']}
            />
          </div>

          <TableSection
            title="베스트 상품"
            data={dashboard.tables.topProducts}
            columns={['name', 'sales', 'revenue', 'stock']}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
```

**작업 체크리스트**:
- [ ] 파일 생성: `apps/main-site/src/pages/dashboard/supplier.tsx`
- [ ] supplierDashboard function 임포트
- [ ] DashboardLayout 적용
- [ ] Grid layout으로 KPI, Charts, Tables 배치
- [ ] Responsive 클래스 적용 (lg:grid-cols-2)

#### 1-4. 기존 파일 정리

**삭제 대상**:
- [ ] `packages/shortcodes/src/dropshipping/SupplierDashboard.tsx` (mock 버전 불필요)
- [ ] `apps/main-site/src/components/shortcodes/SupplierDashboard.tsx` (function component로 대체)

**업데이트 대상**:
- [ ] `shortcode-registry.json`: SupplierDashboard 항목 업데이트
  - `path`: `apps/main-site/src/shortcodes/_functions/dropshipping/supplierDashboard.tsx`
  - `type`: `function`
  - `hasLayout`: `false`

---

### 2. SellerDashboard

#### 2-1. React Query Hook 생성

**파일**: `apps/main-site/src/hooks/queries/useSellerDashboardData.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';

export interface SellerDashboardSummary {
  totalOrders: number;
  totalSalesAmount: number;
  totalItems: number;
  totalCommissionAmount: number;
  avgOrderAmount: number;
}

export interface SellerOrderSummary {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  buyerName: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  sellerAmount: number;
  commissionAmount: number;
  itemCount: number;
}

export interface CommissionDetail {
  orderNumber: string;
  orderDate: string;
  salesAmount: number;
  commissionAmount: number;
  commissionRate: number;
  status: string;
}

export interface SellerDashboardData {
  summary: SellerDashboardSummary;
  orders: SellerOrderSummary[];
  commissions: CommissionDetail[];
  salesTrend: Array<{ date: string; amount: number }>;
  topProducts: Array<{ name: string; sales: number; revenue: number }>;
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
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
```

**작업 체크리스트**:
- [ ] 파일 생성: `apps/main-site/src/hooks/queries/useSellerDashboardData.ts`
- [ ] Phase PD-1 타입 반영 (SellerDashboardSummary, SellerOrderSummary, CommissionDetail)
- [ ] authClient.api.get 사용
- [ ] queryKey: `['seller-dashboard', period]`

#### 2-2. Function Component 생성

**파일**: `apps/main-site/src/shortcodes/_functions/dropshipping/sellerDashboard.tsx`

**소스 파일 분석**:
- **현재 위치**: `apps/main-site/src/components/shortcodes/SellerDashboard.tsx`
- **특징**: Phase PD-1 real API integration, RoleDashboardMenu 사용
- **제거할 Layout 패턴**:
  - Container/wrapper divs
  - Grid layouts (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4`)
  - Card styling (`bg-white rounded-lg shadow-sm border border-gray-200`)
- **유지할 Business Logic**:
  - Section navigation (overview, products, orders, analytics, inventory, settlements)
  - Real order/commission data (Phase PD-1)
  - KPI calculations

**변환 코드**:
```typescript
import React from 'react';
import { useSellerDashboardData } from '../../../hooks/queries/useSellerDashboardData';
import { DashboardSkeleton } from '../../../components/common/Skeleton';
import { ErrorMessage } from '../../../components/common/ErrorMessage';
import { DollarSign, ShoppingCart, Package, TrendingUp, ShoppingBag } from 'lucide-react';

/**
 * 판매자 대시보드 기능 컴포넌트
 * Phase PD-1: Real API integration with order/commission data
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
  if (!data) return null;

  return {
    kpis: [
      {
        label: '총 주문',
        value: data.summary.totalOrders,
        icon: ShoppingCart,
      },
      {
        label: '총 매출',
        value: `₩${data.summary.totalSalesAmount.toLocaleString()}`,
        icon: DollarSign,
      },
      {
        label: '총 상품',
        value: data.summary.totalItems,
        icon: Package,
      },
      {
        label: '커미션',
        value: `₩${data.summary.totalCommissionAmount.toLocaleString()}`,
        icon: TrendingUp,
        subtext: `평균 주문액: ₩${data.summary.avgOrderAmount.toLocaleString()}`,
      },
    ],
    charts: {
      salesTrend: <LineChart data={data.salesTrend} xKey="date" yKey="amount" />,
      topProducts: <BarChart data={data.topProducts} xKey="name" yKey="revenue" />,
    },
    tables: {
      orders: data.orders,
      commissions: data.commissions,
    },
  };
}
```

**작업 체크리스트**:
- [ ] 파일 생성: `apps/main-site/src/shortcodes/_functions/dropshipping/sellerDashboard.tsx`
- [ ] Phase PD-1 real API data 반영
- [ ] Layout 클래스 완전 제거
- [ ] KPIs 구조화 (주문, 매출, 상품, 커미션)
- [ ] Charts 구조화 (salesTrend, topProducts)
- [ ] Tables 구조화 (orders, commissions)
- [ ] JSDoc 주석 추가

#### 2-3. Page 생성

**파일**: `apps/main-site/src/pages/dashboard/seller.tsx`

```typescript
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
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <DashboardHeader title="판매자 대시보드" />

          <KPIGrid kpis={dashboard.kpis} columns={4} gap={6} className="mb-6" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ChartCard title="매출 추이">
              {dashboard.charts.salesTrend}
            </ChartCard>
            <ChartCard title="인기 상품">
              {dashboard.charts.topProducts}
            </ChartCard>
          </div>

          <TableSection
            title="주문 내역"
            data={dashboard.tables.orders}
            columns={['orderNumber', 'buyerName', 'totalAmount', 'status', 'orderDate']}
            className="mb-6"
          />

          <TableSection
            title="커미션 내역"
            data={dashboard.tables.commissions}
            columns={['orderNumber', 'salesAmount', 'commissionAmount', 'commissionRate', 'status']}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
```

**작업 체크리스트**:
- [ ] 파일 생성: `apps/main-site/src/pages/dashboard/seller.tsx`
- [ ] sellerDashboard function 임포트
- [ ] DashboardLayout 적용
- [ ] KPI, Charts, Tables 배치

#### 2-4. 기존 파일 정리

**삭제 대상**:
- [ ] `packages/shortcodes/src/dropshipping/SellerDashboard.tsx`
- [ ] `apps/main-site/src/components/shortcodes/SellerDashboard.tsx`

**업데이트 대상**:
- [ ] `shortcode-registry.json`: SellerDashboard 항목 업데이트

---

### 3. PartnerDashboard (= AffiliateDashboard)

#### 3-1. React Query Hook 생성

**파일**: `apps/main-site/src/hooks/queries/usePartnerDashboardData.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';

export interface PartnerStats {
  totalEarnings: number;
  monthlyEarnings: number;
  pendingCommission: number;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  activeLinks: number;
  totalReferrals: number;
}

export interface AffiliateLink {
  id: string;
  productId: string;
  productName: string;
  shortLink: string;
  fullLink: string;
  clicks: number;
  conversions: number;
  earnings: number;
  createdAt: string;
}

export interface CommissionHistory {
  id: string;
  orderId: string;
  productName: string;
  orderAmount: number;
  commission: number;
  status: 'pending' | 'approved' | 'paid';
  date: string;
}

export interface PartnerDashboardData {
  stats: PartnerStats;
  links: AffiliateLink[];
  commissions: CommissionHistory[];
  clicksTrend: Array<{ date: string; clicks: number; conversions: number }>;
  earningsTrend: Array<{ date: string; amount: number }>;
}

export function usePartnerDashboardData(period: string = '30d') {
  return useQuery<PartnerDashboardData>({
    queryKey: ['partner-dashboard', period],
    queryFn: async () => {
      const { data } = await authClient.api.get(
        '/api/dropshipping/partner/dashboard',
        { params: { period } }
      );
      return data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
```

**작업 체크리스트**:
- [ ] 파일 생성: `apps/main-site/src/hooks/queries/usePartnerDashboardData.ts`
- [ ] 제휴 마케팅 타입 정의 (PartnerStats, AffiliateLink, CommissionHistory)
- [ ] authClient.api.get 사용
- [ ] queryKey: `['partner-dashboard', period]`

#### 3-2. Function Component 생성

**파일**: `apps/main-site/src/shortcodes/_functions/dropshipping/partnerDashboard.tsx`

**소스 파일 분석**:
- **현재 위치**:
  - `apps/main-site/src/components/shortcodes/PartnerDashboard.tsx` (메인)
  - `packages/shortcodes/src/dropshipping/AffiliateDashboard.tsx` (레퍼런스)
- **특징**: Affiliate link tracking, commission management, click analytics
- **제거할 Layout 패턴**: Container, grid, card wrappers
- **유지할 Business Logic**: Link management, click tracking, commission calculations

**변환 코드**:
```typescript
import React from 'react';
import { usePartnerDashboardData } from '../../../hooks/queries/usePartnerDashboardData';
import { DashboardSkeleton } from '../../../components/common/Skeleton';
import { ErrorMessage } from '../../../components/common/ErrorMessage';
import { DollarSign, TrendingUp, Users, Link2, MousePointerClick } from 'lucide-react';

/**
 * 파트너/제휴 대시보드 기능 컴포넌트
 *
 * @param options - Dashboard 설정
 * @param options.period - 통계 기간 (7d, 30d, 90d, 1y)
 * @param options.defaultSection - 기본 섹션
 * @param options.showMenu - 메뉴 표시 여부
 * @returns Dashboard 데이터 및 UI 요소
 */
export interface PartnerDashboardOptions {
  period?: '7d' | '30d' | '90d' | '1y';
  defaultSection?: 'overview' | 'links' | 'commissions' | 'analytics';
  showMenu?: boolean;
}

export function partnerDashboard(options?: PartnerDashboardOptions) {
  const period = options?.period ?? '30d';
  const { data, isLoading, error } = usePartnerDashboardData(period);

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return null;

  return {
    kpis: [
      {
        label: '총 수익',
        value: `₩${data.stats.totalEarnings.toLocaleString()}`,
        icon: DollarSign,
        subtext: `이번 달: ₩${data.stats.monthlyEarnings.toLocaleString()}`,
      },
      {
        label: '대기 커미션',
        value: `₩${data.stats.pendingCommission.toLocaleString()}`,
        icon: TrendingUp,
      },
      {
        label: '총 클릭',
        value: data.stats.totalClicks,
        icon: MousePointerClick,
        trend: '+15%',
        trendDirection: 'up' as const,
      },
      {
        label: '전환 수',
        value: data.stats.totalConversions,
        icon: Users,
        subtext: `전환율: ${data.stats.conversionRate}%`,
      },
      {
        label: '활성 링크',
        value: data.stats.activeLinks,
        icon: Link2,
        subtext: `총 추천: ${data.stats.totalReferrals}`,
      },
    ],
    charts: {
      clicksTrend: <LineChart data={data.clicksTrend} xKey="date" yKeys={['clicks', 'conversions']} />,
      earningsTrend: <AreaChart data={data.earningsTrend} xKey="date" yKey="amount" />,
    },
    tables: {
      links: data.links,
      commissions: data.commissions,
    },
  };
}
```

**작업 체크리스트**:
- [ ] 파일 생성: `apps/main-site/src/shortcodes/_functions/dropshipping/partnerDashboard.tsx`
- [ ] Layout 클래스 제거
- [ ] KPIs 구조화 (수익, 클릭, 전환, 링크)
- [ ] Charts 구조화 (clicksTrend, earningsTrend)
- [ ] Tables 구조화 (links, commissions)
- [ ] JSDoc 주석 추가

#### 3-3. Page 생성

**파일**: `apps/main-site/src/pages/dashboard/partner.tsx`

```typescript
import React from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { DashboardHeader } from '../../components/dashboard/DashboardHeader';
import { KPIGrid } from '../../components/dashboard/common/KPIGrid';
import { ChartCard } from '../../components/dashboard/common/ChartCard';
import { TableSection } from '../../components/dashboard/common/TableSection';
import { partnerDashboard } from '../../shortcodes/_functions/dropshipping/partnerDashboard';

export default function PartnerDashboardPage() {
  const dashboard = partnerDashboard({ period: '30d', showMenu: true });

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <DashboardHeader title="파트너 대시보드" />

          <KPIGrid kpis={dashboard.kpis} columns={5} gap={6} className="mb-6" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ChartCard title="클릭 및 전환 추이">
              {dashboard.charts.clicksTrend}
            </ChartCard>
            <ChartCard title="수익 추이">
              {dashboard.charts.earningsTrend}
            </ChartCard>
          </div>

          <TableSection
            title="제휴 링크"
            data={dashboard.tables.links}
            columns={['productName', 'shortLink', 'clicks', 'conversions', 'earnings']}
            className="mb-6"
          />

          <TableSection
            title="커미션 내역"
            data={dashboard.tables.commissions}
            columns={['productName', 'orderAmount', 'commission', 'status', 'date']}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
```

**작업 체크리스트**:
- [ ] 파일 생성: `apps/main-site/src/pages/dashboard/partner.tsx`
- [ ] partnerDashboard function 임포트
- [ ] DashboardLayout 적용
- [ ] KPI, Charts, Tables 배치

#### 3-4. 기존 파일 정리

**삭제 대상**:
- [ ] `packages/shortcodes/src/dropshipping/AffiliateDashboard.tsx`
- [ ] `apps/main-site/src/components/shortcodes/PartnerDashboard.tsx`

**업데이트 대상**:
- [ ] `shortcode-registry.json`: PartnerDashboard, AffiliateDashboard 항목 통합

---

### 4. Admin SellerDashboard (Admin 전용)

**특이사항**: Admin dashboard는 별도 앱(`apps/admin-dashboard`)이므로 main-site와 별도 처리

#### 4-1. React Query Hook 생성

**파일**: `apps/admin-dashboard/src/hooks/queries/useAdminSellerDashboardData.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';

export interface AdminSellerStats {
  totalSellers: number;
  activeSellers: number;
  totalSales: number;
  totalCommissions: number;
  avgMarginRate: number;
  pendingApprovals: number;
}

export interface SellerDetail {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'suspended';
  totalSales: number;
  commissionRate: number;
  joinDate: string;
}

export interface AdminSellerDashboardData {
  stats: AdminSellerStats;
  sellers: SellerDetail[];
  salesByMarginRate: Array<{ rate: number; count: number }>;
  pricingAlerts: Array<{ productId: string; message: string }>;
}

export function useAdminSellerDashboardData() {
  return useQuery<AdminSellerDashboardData>({
    queryKey: ['admin-seller-dashboard'],
    queryFn: async () => {
      const { data } = await authClient.api.get('/api/admin/sellers/dashboard');
      return data;
    },
    staleTime: 3 * 60 * 1000, // 3분 캐시
    retry: 2,
  });
}
```

**작업 체크리스트**:
- [ ] 파일 생성: `apps/admin-dashboard/src/hooks/queries/useAdminSellerDashboardData.ts`
- [ ] Admin 전용 타입 정의 (pricing alerts, margin rates)
- [ ] authClient.api.get 사용
- [ ] queryKey: `['admin-seller-dashboard']`

#### 4-2. Function Component 생성

**파일**: `apps/admin-dashboard/src/shortcodes/_functions/dropshipping/adminSellerDashboard.tsx`

**소스 파일 분석**:
- **현재 위치**: `apps/admin-dashboard/src/components/shortcodes/dropshipping/seller/SellerDashboard.tsx`
- **특징**: Pricing management, margin rate tracking, settlement management
- **제거할 Layout**: Container, grid, card wrappers
- **유지할 Business Logic**: Pricing alerts, margin rate analysis, seller management

**변환 코드**:
```typescript
import React from 'react';
import { useAdminSellerDashboardData } from '../../../hooks/queries/useAdminSellerDashboardData';
import { DashboardSkeleton } from '../../../components/common/Skeleton';
import { ErrorMessage } from '../../../components/common/ErrorMessage';
import { Users, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

/**
 * 어드민 판매자 대시보드 기능 컴포넌트
 *
 * 판매자 관리 및 가격 정책 모니터링
 *
 * @returns Dashboard 데이터 및 UI 요소
 */
export function adminSellerDashboard() {
  const { data, isLoading, error } = useAdminSellerDashboardData();

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return null;

  return {
    kpis: [
      {
        label: '총 판매자',
        value: data.stats.totalSellers,
        icon: Users,
        subtext: `활성: ${data.stats.activeSellers}`,
      },
      {
        label: '총 매출',
        value: `₩${data.stats.totalSales.toLocaleString()}`,
        icon: DollarSign,
      },
      {
        label: '총 커미션',
        value: `₩${data.stats.totalCommissions.toLocaleString()}`,
        icon: TrendingUp,
        subtext: `평균 마진율: ${data.stats.avgMarginRate}%`,
      },
      {
        label: '승인 대기',
        value: data.stats.pendingApprovals,
        icon: AlertTriangle,
        alert: data.stats.pendingApprovals > 0,
      },
    ],
    charts: {
      salesByMarginRate: <BarChart data={data.salesByMarginRate} xKey="rate" yKey="count" />,
    },
    tables: {
      sellers: data.sellers,
      pricingAlerts: data.pricingAlerts,
    },
  };
}
```

**작업 체크리스트**:
- [ ] 파일 생성: `apps/admin-dashboard/src/shortcodes/_functions/dropshipping/adminSellerDashboard.tsx`
- [ ] Layout 클래스 제거
- [ ] Admin 전용 KPIs 구조화
- [ ] Pricing alerts 반영
- [ ] JSDoc 주석 추가

#### 4-3. Page 생성

**파일**: `apps/admin-dashboard/src/pages/sellers/dashboard.tsx`

```typescript
import React from 'react';
import { AdminLayout } from '../../layouts/AdminLayout';
import { PageHeader } from '../../components/common/PageHeader';
import { KPIGrid } from '../../components/dashboard/KPIGrid';
import { ChartCard } from '../../components/charts/ChartCard';
import { DataTable } from '../../components/table/DataTable';
import { adminSellerDashboard } from '../../shortcodes/_functions/dropshipping/adminSellerDashboard';

export default function AdminSellerDashboardPage() {
  const dashboard = adminSellerDashboard();

  return (
    <AdminLayout>
      <div className="container mx-auto px-6 py-8">
        <PageHeader title="판매자 관리 대시보드" />

        <KPIGrid kpis={dashboard.kpis} columns={4} gap={6} className="mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ChartCard title="마진율별 매출 분포">
            {dashboard.charts.salesByMarginRate}
          </ChartCard>
          <DataTable
            title="가격 알림"
            data={dashboard.tables.pricingAlerts}
            columns={['productId', 'message']}
          />
        </div>

        <DataTable
          title="판매자 목록"
          data={dashboard.tables.sellers}
          columns={['name', 'email', 'status', 'totalSales', 'commissionRate', 'joinDate']}
        />
      </div>
    </AdminLayout>
  );
}
```

**작업 체크리스트**:
- [ ] 파일 생성: `apps/admin-dashboard/src/pages/sellers/dashboard.tsx`
- [ ] adminSellerDashboard function 임포트
- [ ] AdminLayout 적용
- [ ] KPI, Charts, Tables 배치

#### 4-4. 기존 파일 정리

**삭제 대상**:
- [ ] `apps/admin-dashboard/src/components/shortcodes/dropshipping/seller/SellerDashboard.tsx`

**업데이트 대상**:
- [ ] `shortcode-registry.json`: Admin SellerDashboard 항목 업데이트

---

## 🔄 통합 작업 프로세스

### Phase A: 준비 (2시간)
1. **디렉토리 생성**
   ```bash
   mkdir -p apps/main-site/src/shortcodes/_functions/dropshipping
   mkdir -p apps/main-site/src/hooks/queries
   mkdir -p apps/main-site/src/pages/dashboard
   mkdir -p apps/admin-dashboard/src/shortcodes/_functions/dropshipping
   mkdir -p apps/admin-dashboard/src/hooks/queries
   mkdir -p apps/admin-dashboard/src/pages/sellers
   ```

2. **공통 컴포넌트 확인**
   - `DashboardLayout`, `AdminLayout` 존재 확인
   - `KPIGrid`, `ChartCard`, `TableSection` 존재 확인
   - 없으면 생성 필요

### Phase B: React Query Hooks 생성 (6시간)
1. **Main Site Hooks** (4시간)
   - [ ] `useSupplierDashboardData.ts` (1시간)
   - [ ] `useSellerDashboardData.ts` (1.5시간) - Phase PD-1 타입 반영
   - [ ] `usePartnerDashboardData.ts` (1.5시간)

2. **Admin Dashboard Hooks** (2시간)
   - [ ] `useAdminSellerDashboardData.ts` (2시간) - Pricing alerts 로직 포함

### Phase C: Function Components 생성 (12시간)
1. **Main Site Functions** (9시간)
   - [ ] `supplierDashboard.tsx` (3시간)
   - [ ] `sellerDashboard.tsx` (3시간)
   - [ ] `partnerDashboard.tsx` (3시간)

2. **Admin Functions** (3시간)
   - [ ] `adminSellerDashboard.tsx` (3시간)

### Phase D: Pages 생성 (8시간)
1. **Main Site Pages** (6시간)
   - [ ] `pages/dashboard/supplier.tsx` (2시간)
   - [ ] `pages/dashboard/seller.tsx` (2시간)
   - [ ] `pages/dashboard/partner.tsx` (2시간)

2. **Admin Pages** (2시간)
   - [ ] `pages/sellers/dashboard.tsx` (2시간)

### Phase E: 테스트 및 정리 (4시간)
1. **로컬 테스트** (2시간)
   - [ ] 각 dashboard 페이지 접속 확인
   - [ ] 데이터 로딩 확인
   - [ ] 레이아웃 정상 작동 확인
   - [ ] Responsive 동작 확인

2. **기존 파일 정리** (1시간)
   - [ ] `packages/shortcodes/src/dropshipping/` 파일 삭제
   - [ ] `apps/*/components/shortcodes/` 파일 삭제
   - [ ] Import 경로 업데이트

3. **문서 업데이트** (1시간)
   - [ ] `shortcode-registry.json` 업데이트
   - [ ] README 업데이트
   - [ ] CHANGELOG 작성

---

## ✅ 최종 체크리스트

### Main Site (3 Dashboards)
- [ ] SupplierDashboard 변환 완료
  - [ ] Hook: `useSupplierDashboardData.ts`
  - [ ] Function: `supplierDashboard.tsx`
  - [ ] Page: `pages/dashboard/supplier.tsx`
  - [ ] 기존 파일 삭제
  - [ ] 테스트 통과

- [ ] SellerDashboard 변환 완료
  - [ ] Hook: `useSellerDashboardData.ts`
  - [ ] Function: `sellerDashboard.tsx`
  - [ ] Page: `pages/dashboard/seller.tsx`
  - [ ] 기존 파일 삭제
  - [ ] 테스트 통과

- [ ] PartnerDashboard 변환 완료
  - [ ] Hook: `usePartnerDashboardData.ts`
  - [ ] Function: `partnerDashboard.tsx`
  - [ ] Page: `pages/dashboard/partner.tsx`
  - [ ] 기존 파일 삭제
  - [ ] 테스트 통과

### Admin Dashboard (1 Dashboard)
- [ ] Admin SellerDashboard 변환 완료
  - [ ] Hook: `useAdminSellerDashboardData.ts`
  - [ ] Function: `adminSellerDashboard.tsx`
  - [ ] Page: `pages/sellers/dashboard.tsx`
  - [ ] 기존 파일 삭제
  - [ ] 테스트 통과

### 문서화
- [ ] `shortcode-registry.json` 업데이트
- [ ] 변환 완료 보고서 작성
- [ ] 다음 Priority (Commerce) 준비

---

## 📊 예상 결과

### 파일 개수 변화
- **Before**: 7개 shortcode files (packages + apps)
- **After**: 12개 files (4 hooks + 4 functions + 4 pages)

### 코드 라인 수 변화
- **Before**: ~2,500 lines (layout + logic 혼재)
- **After**: ~1,800 lines (layout 분리로 중복 제거)
- **감소율**: ~28% (700 lines 감소)

### 재사용성 증가
- **Before**: Shortcode만 사용 가능 (레이아웃 고정)
- **After**: Function component를 다양한 페이지/레이아웃에서 재사용 가능

---

**작성자**: Claude (Sonnet 4.5)
**검토**: Rena
**버전**: 1.0
**다음 단계**: Priority 2 (Commerce Components) 상세 가이드 작성
