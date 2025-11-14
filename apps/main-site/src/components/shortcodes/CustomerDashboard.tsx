/**
 * Customer Dashboard Component
 * Based on research from Amazon, Shopify Customer Accounts, and Coupang
 *
 * Primary Features:
 * - Order tracking and history
 * - Quick reorder functionality
 * - Rewards/points display
 * - Wishlist access
 * - Account management shortcuts
 */

import React, { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import { useAuth } from '../../contexts/AuthContext';

interface OrderSummary {
  id: string;
  orderNumber: string;
  date: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  items: number;
  estimatedDelivery?: string;
}

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  totalSpent: number;
  rewardPoints: number;
  wishlistItems: number;
  savedItems: number;
}

interface RecentProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  viewedAt: string;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusLabels = {
  pending: '대기중',
  processing: '처리중',
  shipped: '배송중',
  delivered: '배송완료',
  cancelled: '취소됨',
};

export const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard stats and recent activity in parallel
      const [statsRes, ordersRes, viewedRes] = await Promise.allSettled([
        authClient.api.get('/customer/dashboard/stats'),
        authClient.api.get('/customer/orders/recent?limit=5'),
        authClient.api.get('/customer/recently-viewed?limit=6'),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.data) {
        setStats(statsRes.value.data);
      }

      if (ordersRes.status === 'fulfilled' && ordersRes.value.data) {
        setRecentOrders(ordersRes.value.data);
      }

      if (viewedRes.status === 'fulfilled' && viewedRes.value.data) {
        setRecentlyViewed(viewedRes.value.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
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
          <p className="text-gray-600">대시보드 로딩중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          안녕하세요, {user?.name || '고객'}님!
        </h1>
        <p className="text-gray-600 mt-2">쇼핑 활동과 주문 현황을 확인하세요</p>
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
          title="총 주문"
          value={stats?.totalOrders || 0}
          icon="📦"
          color="blue"
        />
        <StatCard
          title="진행중인 주문"
          value={stats?.pendingOrders || 0}
          icon="🚚"
          color="yellow"
        />
        <StatCard
          title="총 구매금액"
          value={`${(stats?.totalSpent || 0).toLocaleString()}원`}
          icon="💰"
          color="green"
        />
        <StatCard
          title="리워드 포인트"
          value={`${(stats?.rewardPoints || 0).toLocaleString()}P`}
          icon="⭐"
          color="purple"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">빠른 실행</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionButton
            icon="🛍️"
            label="상품 둘러보기"
            href="/products"
          />
          <QuickActionButton
            icon="📍"
            label="주문 추적"
            href="/my-account/orders"
          />
          <QuickActionButton
            icon="💬"
            label="고객 지원"
            href="/contact"
          />
          <QuickActionButton
            icon="❤️"
            label="위시리스트"
            href="/my-account/wishlist"
            badge={stats?.wishlistItems}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">최근 주문</h2>
            <a
              href="/my-account/orders"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              전체 보기 →
            </a>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">아직 주문 내역이 없습니다</p>
              <a
                href="/products"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                쇼핑 시작하기
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>

        {/* Recently Viewed Products */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">최근 본 상품</h2>
            <a
              href="/products"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              더 둘러보기 →
            </a>
          </div>

          {recentlyViewed.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">최근 본 상품이 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {recentlyViewed.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Account Management Links */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">계정 관리</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AccountLink
            href="/my-account/profile"
            icon="👤"
            title="프로필 설정"
            description="개인정보 수정"
          />
          <AccountLink
            href="/my-account/addresses"
            icon="📮"
            title="배송지 관리"
            description="배송 주소 관리"
          />
          <AccountLink
            href="/my-account/payment-methods"
            icon="💳"
            title="결제 수단"
            description="결제 정보 관리"
          />
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'yellow' | 'green' | 'purple';
}> = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-full ${colorClasses[color]} flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// Quick Action Button
const QuickActionButton: React.FC<{
  icon: string;
  label: string;
  href: string;
  badge?: number;
}> = ({ icon, label, href, badge }) => (
  <a
    href={href}
    className="relative flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
  >
    <span className="text-3xl mb-2">{icon}</span>
    <span className="text-sm font-medium text-gray-700 text-center">{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
        {badge}
      </span>
    )}
  </a>
);

// Order Card Component
const OrderCard: React.FC<{ order: OrderSummary }> = ({ order }) => (
  <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
    <div className="flex items-start justify-between mb-2">
      <div>
        <p className="font-medium text-gray-900">주문 #{order.orderNumber}</p>
        <p className="text-sm text-gray-500">{new Date(order.date).toLocaleDateString()}</p>
      </div>
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
        {statusLabels[order.status]}
      </span>
    </div>
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{order.items}개 상품</span>
      <span className="font-semibold text-gray-900">{order.total.toLocaleString()}원</span>
    </div>
    {order.estimatedDelivery && order.status === 'shipped' && (
      <p className="text-xs text-blue-600 mt-2">
        예상 배송일: {new Date(order.estimatedDelivery).toLocaleDateString()}
      </p>
    )}
    <a
      href={`/my-account/orders/${order.id}`}
      className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2 inline-block"
    >
      상세보기 →
    </a>
  </div>
);

// Product Card Component
const ProductCard: React.FC<{ product: RecentProduct }> = ({ product }) => (
  <a
    href={`/products/${product.id}`}
    className="group block border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-colors"
  >
    <div className="aspect-square bg-gray-100">
      <img
        src={product.image}
        alt={product.name}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
      />
    </div>
    <div className="p-3">
      <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
        {product.name}
      </p>
      <p className="text-sm font-bold text-gray-900">
        {product.price.toLocaleString()}원
      </p>
    </div>
  </a>
);

// Account Link Component
const AccountLink: React.FC<{
  href: string;
  icon: string;
  title: string;
  description: string;
}> = ({ href, icon, title, description }) => (
  <a
    href={href}
    className="flex items-start gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
  >
    <span className="text-2xl">{icon}</span>
    <div>
      <p className="font-medium text-gray-900">{title}</p>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  </a>
);

export default CustomerDashboard;
