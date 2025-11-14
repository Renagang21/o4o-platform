/**
 * Seller Dashboard Component
 * Based on research from Shopify, Amazon Seller Central, and eBay Seller Hub
 *
 * Primary Features:
 * - Sales overview and analytics
 * - Product performance tracking
 * - Order management
 * - Inventory alerts
 * - Revenue and profit metrics
 */

import React, { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import { useAuth } from '../../contexts/AuthContext';

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

export const SellerDashboard: React.FC<{ defaultPeriod?: string }> = ({
  defaultPeriod = '30d'
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [period, setPeriod] = useState(defaultPeriod);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [period]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, productsRes, ordersRes, salesRes] = await Promise.allSettled([
        authClient.api.get(`/seller/dashboard/stats?period=${period}`),
        authClient.api.get('/seller/products/top?limit=5'),
        authClient.api.get('/seller/orders/recent?limit=5'),
        authClient.api.get(`/seller/sales/chart?period=${period}`),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.data) {
        setStats(statsRes.value.data);
      }

      if (productsRes.status === 'fulfilled' && productsRes.value.data) {
        setTopProducts(productsRes.value.data);
      }

      if (ordersRes.status === 'fulfilled' && ordersRes.value.data) {
        setRecentOrders(ordersRes.value.data);
      }

      if (salesRes.status === 'fulfilled' && salesRes.value.data) {
        setSalesData(salesRes.value.data);
      }
    } catch (err) {
      console.error('Failed to load seller dashboard:', err);
      setError('대시보드 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">판매자 대시보드 로딩중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
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

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="이번 달 매출"
          value={`${(stats?.monthlySales || 0).toLocaleString()}원`}
          change="+12.5%"
          changeType="increase"
          icon="💰"
        />
        <StatCard
          title="활성 상품"
          value={`${stats?.activeListings || 0} / ${stats?.totalListings || 0}`}
          subtitle="전체 상품"
          icon="📦"
        />
        <StatCard
          title="전환율"
          value={`${(stats?.conversionRate || 0).toFixed(1)}%`}
          change="+2.1%"
          changeType="increase"
          icon="📈"
        />
        <StatCard
          title="평균 주문액"
          value={`${(stats?.averageOrderValue || 0).toLocaleString()}원`}
          change="-3.2%"
          changeType="decrease"
          icon="🎯"
        />
      </div>

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

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">빠른 실행</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionButton
            icon="➕"
            label="상품 등록"
            href="/seller/products/new"
          />
          <QuickActionButton
            icon="📊"
            label="판매 분석"
            href="/seller/analytics"
          />
          <QuickActionButton
            icon="📦"
            label="재고 관리"
            href="/seller/inventory"
          />
          <QuickActionButton
            icon="💳"
            label="정산 내역"
            href="/seller/settlements"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Products */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">인기 상품</h2>
            <a
              href="/seller/products/analytics"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              전체 보기 →
            </a>
          </div>

          {topProducts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">판매 데이터가 없습니다</p>
              <a
                href="/seller/products/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                상품 등록하기
              </a>
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
            <a
              href="/seller/orders"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              전체 보기 →
            </a>
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

      {/* Sales Chart Placeholder */}
      <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">매출 추이</h2>
        <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center">
            <p className="text-gray-500 mb-2">매출 차트</p>
            <p className="text-sm text-gray-400">
              {salesData.length > 0
                ? `${salesData.length}일간의 판매 데이터`
                : '판매 데이터를 수집하는 중입니다'}
            </p>
          </div>
        </div>
      </div>
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
  href: string;
}> = ({ icon, label, href }) => (
  <a
    href={href}
    className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
  >
    <span className="text-3xl mb-2">{icon}</span>
    <span className="text-sm font-medium text-gray-700 text-center">{label}</span>
  </a>
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

export default SellerDashboard;
