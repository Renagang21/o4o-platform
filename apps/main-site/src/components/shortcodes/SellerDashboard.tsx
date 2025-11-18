/**
 * Seller Dashboard Component
 * Phase PD-1: Partner Dashboard v1 - Connected to real order/commission data
 *
 * Features:
 * - Sales overview with real order data (Overview tab)
 * - Commission tracking and breakdown (Settlements tab)
 * - Period-based filtering (7d, 30d, 90d, 1y)
 */

// Section types for internal navigation
type SellerSection = 'overview' | 'products' | 'orders' | 'analytics' | 'inventory' | 'settlements';

const SELLER_SECTIONS: readonly SellerSection[] = ['overview', 'products', 'orders', 'analytics', 'inventory', 'settlements'];

import React, { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import { useAuth } from '../../contexts/AuthContext';
import { RoleDashboardMenu, useDashboardSection, type DashboardMenuItem } from '../dashboard/RoleDashboardMenu';
import { Package, ShoppingCart, BarChart3, Warehouse, LayoutDashboard, DollarSign, TrendingUp, ShoppingBag } from 'lucide-react';
import { KPICard, KPIGrid } from '../dashboard/common/KPICard';
import { LineChart } from '../charts/LineChart';
import { BarChart } from '../charts/BarChart';
import { PieChart } from '../charts/PieChart';
import { DashboardSkeleton, KPICardSkeleton, ChartSkeleton } from '../common/Skeleton';

// Phase PD-1: Real API response types
interface SellerDashboardSummary {
  totalOrders: number;
  totalSalesAmount: number;
  totalItems: number;
  totalCommissionAmount: number;
  avgOrderAmount: number;
}

interface SellerOrderSummary {
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

interface CommissionDetail {
  orderNumber: string;
  orderDate: string;
  salesAmount: number;
  commissionAmount: number;
  commissionRate: number;
  status: string;
}

// Legacy interface (for non-PD-1 sections)
interface SellerStats {
  totalSales: number;
  monthlySales: number;
  activeListings: number;
  totalListings: number;
  conversionRate: number;
  averageOrderValue: number;
  pendingOrders: number;
  lowStockItems: number;
}

interface TopProduct {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  image: string;
  stock: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customer: string;
  date: string;
  total: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  items: number;
}

interface SalesData {
  date: string;
  sales: number;
  orders: number;
}

const orderStatusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const orderStatusLabels = {
  pending: '대기중',
  paid: '결제완료',
  shipped: '배송중',
  delivered: '배송완료',
  cancelled: '취소됨',
};

export const SellerDashboard: React.FC<{ defaultPeriod?: string; defaultSection?: SellerSection; showMenu?: boolean }> = ({
  defaultPeriod = '30d',
  defaultSection = 'overview',
  showMenu = true
}) => {
  const { user } = useAuth();

  // Phase PD-1: Real data state
  const [summary, setSummary] = useState<SellerDashboardSummary | null>(null);
  const [recentOrders, setRecentOrders] = useState<SellerOrderSummary[]>([]);
  const [commissionDetails, setCommissionDetails] = useState<CommissionDetail[]>([]);
  const [totalCommission, setTotalCommission] = useState<number>(0);

  // Legacy state (for non-PD-1 sections)
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [salesData, setSalesData] = useState<SalesData[]>([]);

  const [period, setPeriod] = useState(defaultPeriod);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Section navigation with hash support
  const [activeSection, setActiveSection] = useDashboardSection(defaultSection, SELLER_SECTIONS);

  useEffect(() => {
    loadDashboardData();
  }, [period, activeSection]);

  // Convert period string to date range
  const getDateRange = (periodStr: string): { from?: string; to?: string } => {
    const now = new Date();
    const from = new Date();

    switch (periodStr) {
      case '7d':
        from.setDate(now.getDate() - 7);
        break;
      case '30d':
        from.setDate(now.getDate() - 30);
        break;
      case '90d':
        from.setDate(now.getDate() - 90);
        break;
      case '1y':
        from.setFullYear(now.getFullYear() - 1);
        break;
      default:
        from.setDate(now.getDate() - 30);
    }

    return {
      from: from.toISOString(),
      to: now.toISOString()
    };
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const dateRange = getDateRange(period);
      const params = new URLSearchParams();
      if (dateRange.from) params.append('from', dateRange.from);
      if (dateRange.to) params.append('to', dateRange.to);

      // Phase PD-1: Load real data from new endpoints
      if (activeSection === 'overview') {
        const [summaryRes, ordersRes] = await Promise.allSettled([
          authClient.api.get(`/api/v1/seller/dashboard/summary?${params.toString()}`),
          authClient.api.get(`/api/v1/seller/dashboard/orders?page=1&limit=5&${params.toString()}`),
        ]);

        if (summaryRes.status === 'fulfilled' && summaryRes.value.data) {
          setSummary(summaryRes.value.data);
        }

        if (ordersRes.status === 'fulfilled' && ordersRes.value.data?.orders) {
          setRecentOrders(ordersRes.value.data.orders);
        }
      }

      if (activeSection === 'settlements') {
        const commissionRes = await authClient.api.get(
          `/api/v1/seller/dashboard/commissions?${params.toString()}`
        );

        if (commissionRes.data) {
          setCommissionDetails(commissionRes.data.commissionByOrder || []);
          setTotalCommission(commissionRes.data.totalCommission || 0);
        }
      }

      // Legacy: Load placeholder data for other sections
      // TODO: PD-2 - Connect products/analytics/inventory to real APIs

    } catch (err) {
      console.error('Failed to load seller dashboard:', err);
      setError('대시보드 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  // Menu items for section navigation
  const menuItems: DashboardMenuItem<SellerSection>[] = [
    { key: 'overview', label: '개요', icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'products', label: '상품', icon: <Package className="w-4 h-4" /> },
    { key: 'orders', label: '주문', icon: <ShoppingCart className="w-4 h-4" />, badge: summary?.totalOrders },
    { key: 'analytics', label: '분석', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'inventory', label: '재고', icon: <Warehouse className="w-4 h-4" /> },
    { key: 'settlements', label: '정산', icon: <DollarSign className="w-4 h-4" />, badge: commissionDetails.length || undefined },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">판매자 대시보드</h1>
          <p className="text-gray-600 mt-2">
            {user?.name || '판매자'}님의 스토어 성과를 확인하세요
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          {[
            { value: '7d', label: '7일' },
            { value: '30d', label: '30일' },
            { value: '90d', label: '90일' },
            { value: '1y', label: '1년' },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === p.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section Navigation Menu (Phase 2: Hidden when inside Layout) */}
      {showMenu && (
        <div className="mb-8">
          <RoleDashboardMenu
            items={menuItems}
            active={activeSection}
            onChange={setActiveSection}
            variant="tabs"
            orientation="horizontal"
          />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* KPI Grid - Phase PD-6: Enhanced with new KPICard component */}
      <KPIGrid>
        <KPICard
          title="총 주문 건수"
          value={summary?.totalOrders || 0}
          subtitle={`${period} 기간`}
          icon={ShoppingCart}
          color="blue"
          badge={summary?.totalOrders && summary.totalOrders > 0 ? summary.totalOrders : undefined}
        />
        <KPICard
          title="총 매출액"
          value={`${(summary?.totalSalesAmount || 0).toLocaleString()}원`}
          subtitle="판매 금액"
          icon={TrendingUp}
          color="green"
        />
        <KPICard
          title="총 커미션"
          value={`${(summary?.totalCommissionAmount || 0).toLocaleString()}원`}
          subtitle="예상 수익"
          icon={DollarSign}
          color="purple"
        />
        <KPICard
          title="평균 주문액"
          value={`${(summary?.avgOrderAmount || 0).toLocaleString()}원`}
          subtitle="주문당 평균"
          icon={ShoppingBag}
          color="orange"
        />
      </KPIGrid>

      {/* Alert Banners */}
      {(stats?.pendingOrders || 0) > 0 || (stats?.lowStockItems || 0) > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {(stats?.pendingOrders || 0) > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📮</span>
                <div className="flex-1">
                  <p className="font-semibold text-blue-900">
                    {stats?.pendingOrders}개의 주문 대기중
                  </p>
                  <p className="text-sm text-blue-700">
                    처리가 필요한 주문이 있습니다
                  </p>
                </div>
                <a
                  href="/seller/orders?status=pending"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  확인하기
                </a>
              </div>
            </div>
          )}

          {(stats?.lowStockItems || 0) > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <p className="font-semibold text-orange-900">
                    {stats?.lowStockItems}개 상품 재고 부족
                  </p>
                  <p className="text-sm text-orange-700">
                    재고 보충이 필요합니다
                  </p>
                </div>
                <a
                  href="/seller/inventory?filter=low-stock"
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                >
                  확인하기
                </a>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Quick Actions - Only show in overview */}
      {activeSection === 'overview' && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">빠른 실행</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickActionButton
              icon="➕"
              label="상품 등록"
              onClick={() => setActiveSection('products')}
            />
            <QuickActionButton
              icon="📊"
              label="판매 분석"
              onClick={() => setActiveSection('analytics')}
            />
            <QuickActionButton
              icon="📦"
              label="재고 관리"
              onClick={() => setActiveSection('inventory')}
            />
            <QuickActionButton
              icon="💳"
              label="정산 내역"
              onClick={() => setActiveSection('settlements')}
            />
          </div>
        </div>
      )}

      {/* Section Content */}
      {activeSection === 'overview' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Products */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">인기 상품</h2>
                <button
                  onClick={() => setActiveSection('products')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  전체 보기 →
                </button>
              </div>

              {topProducts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">판매 데이터가 없습니다</p>
                  <button
                    onClick={() => setActiveSection('products')}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    상품 등록하기
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <TopProductCard key={product.id} product={product} rank={index + 1} />
                  ))}
                </div>
              )}
            </div>

            {/* Recent Orders - Phase PD-1: Real order data */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">최근 주문</h2>
                <button
                  onClick={() => setActiveSection('orders')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  전체 보기 →
                </button>
              </div>

              {recentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">최근 주문이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <SellerOrderCard key={order.orderId} order={order} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sales Chart - Phase PD-6: Real Line Chart */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LineChart
              title="매출 추이"
              series={[
                {
                  name: '매출액',
                  data: recentOrders.length > 0
                    ? recentOrders.slice().reverse().map(order => order.totalAmount)
                    : [0]
                }
              ]}
              categories={
                recentOrders.length > 0
                  ? recentOrders.slice().reverse().map(order =>
                      new Date(order.orderDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                    )
                  : ['데이터 없음']
              }
              height={300}
              yAxisFormatter={(value) => `${value.toLocaleString()}원`}
              tooltipFormatter={(value) => `${value.toLocaleString()}원`}
            />

            <BarChart
              title="주문별 커미션"
              series={[
                {
                  name: '커미션',
                  data: recentOrders.length > 0
                    ? recentOrders.slice().reverse().map(order => order.commissionAmount)
                    : [0]
                }
              ]}
              categories={
                recentOrders.length > 0
                  ? recentOrders.slice().reverse().map(order => `#${order.orderNumber.slice(-4)}`)
                  : ['데이터 없음']
              }
              height={300}
              yAxisFormatter={(value) => `${value.toLocaleString()}원`}
              tooltipFormatter={(value) => `${value.toLocaleString()}원`}
            />
          </div>
        </>
      )}

      {/* Products Section */}
      {activeSection === 'products' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">상품 관리</h2>
          <div className="space-y-4">
            {topProducts.length > 0 ? (
              topProducts.map((product, index) => (
                <TopProductCard key={product.id} product={product} rank={index + 1} />
              ))
            ) : (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">등록된 상품이 없습니다</p>
                <p className="text-sm text-gray-400">상품을 등록하여 판매를 시작하세요</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Orders Section */}
      {activeSection === 'orders' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">주문 관리</h2>
          <div className="space-y-3">
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))
            ) : (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">주문 내역이 없습니다</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Section - Phase PD-6: Enhanced with Charts */}
      {activeSection === 'analytics' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <KPIGrid>
            <KPICard
              title="이번 달 매출"
              value={`${(stats?.monthlySales || summary?.totalSalesAmount || 0).toLocaleString()}원`}
              icon={DollarSign}
              color="green"
            />
            <KPICard
              title="전환율"
              value={`${(stats?.conversionRate || 0).toFixed(1)}%`}
              icon={TrendingUp}
              color="blue"
            />
            <KPICard
              title="평균 주문액"
              value={`${(summary?.avgOrderAmount || stats?.averageOrderValue || 0).toLocaleString()}원`}
              icon={ShoppingBag}
              color="orange"
            />
            <KPICard
              title="총 주문 건수"
              value={summary?.totalOrders || 0}
              icon={ShoppingCart}
              color="purple"
            />
          </KPIGrid>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LineChart
              title="매출 추이 분석"
              series={[
                {
                  name: '매출액',
                  data: recentOrders.length > 0
                    ? recentOrders.slice().reverse().map(order => order.totalAmount)
                    : [0]
                }
              ]}
              categories={
                recentOrders.length > 0
                  ? recentOrders.slice().reverse().map(order =>
                      new Date(order.orderDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                    )
                  : ['데이터 없음']
              }
              height={350}
              showDataLabels={false}
              yAxisFormatter={(value) => `${value.toLocaleString()}원`}
              tooltipFormatter={(value) => `${value.toLocaleString()}원`}
            />

            <PieChart
              title="주문 상태 분포"
              series={
                recentOrders.length > 0
                  ? [
                      recentOrders.filter(o => o.status === 'pending').length,
                      recentOrders.filter(o => o.status === 'paid').length,
                      recentOrders.filter(o => o.status === 'shipped').length,
                      recentOrders.filter(o => o.status === 'delivered').length
                    ]
                  : [1]
              }
              labels={
                recentOrders.length > 0
                  ? ['대기중', '결제완료', '배송중', '배송완료']
                  : ['데이터 없음']
              }
              variant="donut"
              height={350}
              valueFormatter={(value) => `${value}건`}
            />
          </div>
        </div>
      )}

      {/* Inventory Section - Phase PD-6: Enhanced with KPICard */}
      {activeSection === 'inventory' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">재고 관리</h2>
          <div className="space-y-6">
            {/* Inventory Stats */}
            <KPIGrid>
              <KPICard
                title="재고 부족"
                value={stats?.lowStockItems || 0}
                subtitle="10개 이하"
                icon={Warehouse}
                color="red"
                badge={stats?.lowStockItems}
              />
              <KPICard
                title="활성 상품"
                value={stats?.activeListings || 0}
                subtitle={`전체 ${stats?.totalListings || 0}개`}
                icon={Package}
                color="blue"
              />
              <KPICard
                title="총 재고 가치"
                value="계산 중"
                subtitle="예상 가치"
                icon={DollarSign}
                color="purple"
              />
            </KPIGrid>

            {/* Low Stock Items */}
            {topProducts.filter(p => p.stock < 10).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">재고 부족 상품</h3>
                <div className="space-y-3">
                  {topProducts.filter(p => p.stock < 10).map((product, index) => (
                    <TopProductCard key={product.id} product={product} rank={index + 1} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settlements Section - Phase PD-6: Enhanced with KPICard */}
      {activeSection === 'settlements' && (
        <div className="space-y-6">
          {/* Commission Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">커미션 내역</h2>

            <KPIGrid>
              <KPICard
                title="총 커미션"
                value={`${totalCommission.toLocaleString()}원`}
                subtitle={`${period} 기간`}
                icon={DollarSign}
                color="green"
              />
              <KPICard
                title="주문 건수"
                value={`${commissionDetails.length}건`}
                subtitle="커미션 발생 주문"
                icon={ShoppingCart}
                color="blue"
                badge={commissionDetails.length || undefined}
              />
              <KPICard
                title="평균 커미션율"
                value={
                  commissionDetails.length > 0
                    ? `${(
                        (commissionDetails.reduce((sum, c) => sum + c.commissionRate, 0) /
                          commissionDetails.length) *
                        100
                      ).toFixed(1)}%`
                    : '0%'
                }
                subtitle="실제 적용 평균"
                icon={BarChart3}
                color="purple"
              />
            </KPIGrid>
          </div>

          {/* Commission Details Table */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">주문별 커미션 내역</h3>

            {commissionDetails.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-2">커미션 내역이 없습니다</p>
                <p className="text-sm text-gray-400">{period} 기간 동안 발생한 커미션이 없습니다</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        주문번호
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        주문일시
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        판매금액
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        커미션율
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        커미션
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        상태
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {commissionDetails.map((commission, index) => (
                      <tr key={`${commission.orderNumber}-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{commission.orderNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(commission.orderDate).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {commission.salesAmount.toLocaleString()}원
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          {(commission.commissionRate * 100).toFixed(0)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600 text-right">
                          {commission.commissionAmount.toLocaleString()}원
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {commission.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                        총 커미션:
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-blue-600 text-right">
                        {totalCommission.toLocaleString()}원
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* PD-2 Note */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Phase PD-2:</strong> 커미션율은 상품별, 판매자별로 개별 설정됩니다.
                각 주문의 커미션은 주문 생성 시점에 확정되며, 소급 변경되지 않습니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  title: string;
  value: string;
  change?: string;
  changeType?: 'increase' | 'decrease';
  subtitle?: string;
  icon: string;
}> = ({ title, value, change, changeType, subtitle, icon }) => (
  <div className="bg-white rounded-lg shadow-sm p-6">
    <div className="flex items-start justify-between mb-3">
      <p className="text-sm text-gray-600">{title}</p>
      <span className="text-2xl">{icon}</span>
    </div>
    <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
    {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    {change && (
      <p
        className={`text-sm font-medium ${
          changeType === 'increase' ? 'text-green-600' : 'text-red-600'
        }`}
      >
        {change} {changeType === 'increase' ? '↑' : '↓'}
      </p>
    )}
  </div>
);

// Quick Action Button
const QuickActionButton: React.FC<{
  icon: string;
  label: string;
  onClick: () => void;
}> = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
  >
    <span className="text-3xl mb-2">{icon}</span>
    <span className="text-sm font-medium text-gray-700 text-center">{label}</span>
  </button>
);

// Top Product Card
const TopProductCard: React.FC<{ product: TopProduct; rank: number }> = ({
  product,
  rank,
}) => (
  <div className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 font-bold rounded-full flex-shrink-0">
      {rank}
    </div>
    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
      <img
        src={product.image}
        alt={product.name}
        className="w-full h-full object-cover"
      />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-gray-900 truncate">{product.name}</p>
      <div className="flex items-center gap-4 mt-1">
        <span className="text-sm text-gray-600">판매: {product.sales}개</span>
        <span className="text-sm font-semibold text-blue-600">
          {product.revenue.toLocaleString()}원
        </span>
      </div>
    </div>
    {product.stock < 10 && (
      <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">
        재고 {product.stock}
      </span>
    )}
  </div>
);

// Order Card Component (Legacy)
const OrderCard: React.FC<{ order: RecentOrder }> = ({ order }) => (
  <div className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors">
    <div className="flex items-start justify-between mb-2">
      <div>
        <p className="font-medium text-gray-900">#{order.orderNumber}</p>
        <p className="text-sm text-gray-600">{order.customer}</p>
      </div>
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          orderStatusColors[order.status]
        }`}
      >
        {orderStatusLabels[order.status]}
      </span>
    </div>
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">
        {new Date(order.date).toLocaleDateString()} · {order.items}개 상품
      </span>
      <span className="font-semibold text-gray-900">
        {order.total.toLocaleString()}원
      </span>
    </div>
  </div>
);

// Phase PD-1: Seller Order Card Component (real data)
const SellerOrderCard: React.FC<{ order: SellerOrderSummary }> = ({ order }) => (
  <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
    <div className="flex items-start justify-between mb-3">
      <div>
        <p className="font-medium text-gray-900">#{order.orderNumber}</p>
        <p className="text-sm text-gray-600">{order.buyerName}</p>
      </div>
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        {order.paymentStatus}
      </span>
    </div>

    <div className="grid grid-cols-2 gap-3 text-sm mb-2">
      <div>
        <p className="text-gray-500 text-xs">주문일시</p>
        <p className="text-gray-900">
          {new Date(order.orderDate).toLocaleDateString('ko-KR')}
        </p>
      </div>
      <div>
        <p className="text-gray-500 text-xs">상품 수량</p>
        <p className="text-gray-900">{order.itemCount}개</p>
      </div>
    </div>

    <div className="border-t pt-2 mt-2 grid grid-cols-2 gap-3">
      <div>
        <p className="text-xs text-gray-500">판매금액</p>
        <p className="font-semibold text-gray-900">
          {order.sellerAmount.toLocaleString()}원
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-500">예상 커미션</p>
        <p className="font-semibold text-blue-600">
          {order.commissionAmount.toLocaleString()}원
        </p>
      </div>
    </div>
  </div>
);

export default SellerDashboard;
