/**
 * Supplier Dashboard Component
 * Based on research from Alibaba 1688, AliExpress, and DHgate supplier portals
 *
 * Primary Features:
 * - Product catalog management
 * - Order fulfillment tracking
 * - Revenue and profit analytics
 * - Inventory management
 * - Product approval status
 */

import React, { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import { useAuth } from '../../contexts/AuthContext';
import { RoleDashboardMenu, useDashboardSection, type DashboardMenuItem } from '../dashboard/RoleDashboardMenu';
import { Package, ShoppingCart, BarChart3, Warehouse, LayoutDashboard } from 'lucide-react';

// Section types for internal navigation
type SupplierSection = 'overview' | 'products' | 'orders' | 'analytics' | 'inventory';

const SUPPLIER_SECTIONS: readonly SupplierSection[] = ['overview', 'products', 'orders', 'analytics', 'inventory'];

interface SupplierDashboardProps {
  defaultPeriod?: string;
  defaultSection?: SupplierSection;
}

interface DashboardStats {
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

interface TopProduct {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  stock: number;
  image: string;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  sellerName: string;
  date: string;
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  items: number;
}

const orderStatusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
};

const orderStatusLabels = {
  pending: '확인대기',
  confirmed: '확인완료',
  shipped: '배송중',
  delivered: '배송완료',
};

export const SupplierDashboard: React.FC<SupplierDashboardProps> = ({
  defaultPeriod = '30d',
  defaultSection = 'overview'
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(defaultPeriod);

  // Section navigation with hash support
  const [activeSection, setActiveSection] = useDashboardSection(defaultSection, SUPPLIER_SECTIONS);

  useEffect(() => {
    loadDashboardData();
  }, [period]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, productsRes, ordersRes] = await Promise.allSettled([
        authClient.api.get(`/dropshipping/supplier/dashboard/stats?period=${period}`),
        authClient.api.get('/dropshipping/supplier/products/top?limit=5'),
        authClient.api.get('/dropshipping/supplier/orders/recent?limit=5'),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.data) {
        setStats(statsRes.value.data.stats || statsRes.value.data);
      }

      if (productsRes.status === 'fulfilled' && productsRes.value.data) {
        setTopProducts(productsRes.value.data);
      }

      if (ordersRes.status === 'fulfilled' && ordersRes.value.data) {
        setRecentOrders(ordersRes.value.data);
      }
    } catch (err) {
      console.error('Supplier dashboard fetch error:', err);
      setError('대시보드 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">공급자 대시보드 로딩중...</p>
        </div>
      </div>
    );
  }

  // Menu items for section navigation
  const menuItems: DashboardMenuItem<SupplierSection>[] = [
    { key: 'overview', label: '개요', icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'products', label: '제품', icon: <Package className="w-4 h-4" />, badge: stats?.totalProducts },
    { key: 'orders', label: '주문', icon: <ShoppingCart className="w-4 h-4" />, badge: stats?.pendingFulfillment },
    { key: 'analytics', label: '분석', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'inventory', label: '재고', icon: <Warehouse className="w-4 h-4" />, badge: stats?.lowStockProducts },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">공급자 대시보드</h1>
          <p className="text-gray-600 mt-2">
            {user?.name || '공급자'}님의 제품과 주문을 관리하세요
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

      {/* Section Navigation Menu */}
      <div className="mb-8">
        <RoleDashboardMenu
          items={menuItems}
          active={activeSection}
          onChange={setActiveSection}
          variant="tabs"
          orientation="horizontal"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <p className="text-red-800">{error}</p>
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="총 제품"
          value={stats?.totalProducts || 0}
          subtitle={`승인: ${stats?.approvedProducts || 0} | 대기: ${stats?.pendingProducts || 0}`}
          icon="📦"
          color="blue"
        />
        <StatCard
          title="이번 달 매출"
          value={formatPrice(stats?.totalRevenue || 0)}
          subtitle={`${stats?.monthlyOrders || 0}건 주문`}
          icon="💰"
          color="green"
        />
        <StatCard
          title="이번 달 수익"
          value={formatPrice(stats?.totalProfit || 0)}
          subtitle={`평균: ${formatPrice(stats?.avgOrderValue || 0)}`}
          icon="📈"
          color="purple"
        />
        <StatCard
          title="재고 부족"
          value={stats?.lowStockProducts || 0}
          subtitle={`품절: ${stats?.outOfStockProducts || 0}개`}
          icon="⚠️"
          color="orange"
        />
      </div>

      {/* Alert Banners */}
      {(stats?.pendingFulfillment || 0) > 0 || (stats?.lowStockProducts || 0) > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {(stats?.pendingFulfillment || 0) > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📦</span>
                <div className="flex-1">
                  <p className="font-semibold text-blue-900">
                    {stats?.pendingFulfillment}개 주문 처리 대기
                  </p>
                  <p className="text-sm text-blue-700">
                    배송 준비가 필요한 주문이 있습니다
                  </p>
                </div>
                <a
                  href="/supplier/orders?status=pending"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  확인하기
                </a>
              </div>
            </div>
          )}

          {(stats?.lowStockProducts || 0) > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <p className="font-semibold text-orange-900">
                    {stats?.lowStockProducts}개 제품 재고 부족
                  </p>
                  <p className="text-sm text-orange-700">
                    재고 보충이 필요합니다
                  </p>
                </div>
                <a
                  href="/supplier/inventory?filter=low-stock"
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                >
                  확인하기
                </a>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Product Status Breakdown */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">제품 상태</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatusBadge
            label="승인됨"
            value={stats?.approvedProducts || 0}
            color="green"
          />
          <StatusBadge
            label="대기중"
            value={stats?.pendingProducts || 0}
            color="yellow"
          />
          <StatusBadge
            label="거부됨"
            value={stats?.rejectedProducts || 0}
            color="red"
          />
          <StatusBadge
            label="전체"
            value={stats?.totalProducts || 0}
            color="blue"
          />
        </div>
      </div>

      {/* Quick Actions - Only show in overview section */}
      {activeSection === 'overview' && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">빠른 실행</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickActionButton
              icon="➕"
              label="제품 등록"
              onClick={() => setActiveSection('products')}
            />
            <QuickActionButton
              icon="📊"
              label="제품 관리"
              onClick={() => setActiveSection('products')}
            />
            <QuickActionButton
              icon="📦"
              label="주문 내역"
              onClick={() => setActiveSection('orders')}
            />
            <QuickActionButton
              icon="💳"
              label="수익 분석"
              onClick={() => setActiveSection('analytics')}
            />
          </div>
        </div>
      )}

      {/* Section Content */}
      {activeSection === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Products */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">인기 제품</h2>
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
                  제품 등록하기
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

          {/* Recent Orders */}
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
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Products Section */}
      {activeSection === 'products' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">제품 관리</h2>
          <div className="space-y-4">
            {topProducts.length > 0 ? (
              topProducts.map((product, index) => (
                <TopProductCard key={product.id} product={product} rank={index + 1} />
              ))
            ) : (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">등록된 제품이 없습니다</p>
                <p className="text-sm text-gray-400">제품을 등록하여 판매를 시작하세요</p>
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

      {/* Analytics Section */}
      {activeSection === 'analytics' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">수익 분석</h2>
          <div className="space-y-6">
            {/* Revenue Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                title="총 매출"
                value={formatPrice(stats?.totalRevenue || 0)}
                icon="💰"
                color="green"
              />
              <StatCard
                title="총 수익"
                value={formatPrice(stats?.totalProfit || 0)}
                icon="📈"
                color="purple"
              />
              <StatCard
                title="평균 주문액"
                value={formatPrice(stats?.avgOrderValue || 0)}
                icon="🎯"
                color="blue"
              />
            </div>

            {/* Chart Placeholder */}
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">수익 차트</p>
                <p className="text-sm text-gray-400 mt-1">상세 분석 데이터 준비 중</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Section */}
      {activeSection === 'inventory' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">재고 관리</h2>
          <div className="space-y-6">
            {/* Inventory Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                title="재고 부족"
                value={stats?.lowStockProducts || 0}
                subtitle="10개 이하"
                icon="⚠️"
                color="orange"
              />
              <StatCard
                title="품절"
                value={stats?.outOfStockProducts || 0}
                subtitle="재입고 필요"
                icon="🚫"
                color="red" as any
              />
              <StatCard
                title="정상 재고"
                value={(stats?.totalProducts || 0) - (stats?.lowStockProducts || 0) - (stats?.outOfStockProducts || 0)}
                subtitle="충분한 재고"
                icon="✅"
                color="green"
              />
            </div>

            {/* Low Stock Products */}
            {topProducts.filter(p => p.stock < 10).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">재고 부족 제품</h3>
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
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}> = ({ title, value, subtitle, icon, color }) => {
  const colorClasses = {
    blue: 'from-blue-50 to-blue-100 border-blue-200',
    green: 'from-green-50 to-green-100 border-green-200',
    purple: 'from-purple-50 to-purple-100 border-purple-200',
    orange: 'from-orange-50 to-orange-100 border-orange-200',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-lg p-6 border`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-600 mt-1">{subtitle}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
};

// Status Badge Component
const StatusBadge: React.FC<{
  label: string;
  value: number;
  color: 'green' | 'yellow' | 'red' | 'blue';
}> = ({ label, value, color }) => {
  const colorClasses = {
    green: 'bg-green-100 border-green-300 text-green-800',
    yellow: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    red: 'bg-red-100 border-red-300 text-red-800',
    blue: 'bg-blue-100 border-blue-300 text-blue-800',
  };

  return (
    <div className="text-center">
      <div className={`inline-block px-3 py-1 border rounded-full font-semibold mb-2 ${colorClasses[color]}`}>
        {label}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
};

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

// Order Card Component
const OrderCard: React.FC<{ order: RecentOrder }> = ({ order }) => (
  <div className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors">
    <div className="flex items-start justify-between mb-2">
      <div>
        <p className="font-medium text-gray-900">#{order.orderNumber}</p>
        <p className="text-sm text-gray-600">{order.sellerName}</p>
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

export default SupplierDashboard;
