/**
 * Customer Dashboard Component
 * R-6-3: Modernized to match Seller/Supplier/Partner dashboard design
 *
 * Features:
 * - KPI cards using shared KPICard component
 * - Modern grid/section layout
 * - Order tracking and history
 * - Quick actions and account management
 * - Consistent design with other role dashboards
 */

import React, { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import { useAuth } from '../../contexts/AuthContext';
import { ShortcodeDefinition } from '@o4o/shortcodes';
import { KPICard, KPIGrid } from '../dashboard/common/KPICard';
import { DashboardSkeleton, KPICardSkeleton } from '../common/Skeleton';
import {
  Package,
  ShoppingCart,
  DollarSign,
  Star,
  TrendingUp,
  Heart,
  MapPin,
  CreditCard,
  User,
  MessageCircle
} from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: R-6-4 - Implement backend API endpoints:
      // - GET /api/v1/customer/dashboard/stats
      // - GET /api/v1/customer/orders/recent

      // Placeholder data for now
      setStats({
        totalOrders: 0,
        pendingOrders: 0,
        totalSpent: 0,
        rewardPoints: 0,
        wishlistItems: 0,
        savedItems: 0,
      });
      setRecentOrders([]);

    } catch (err: any) {
      console.error('Failed to load customer dashboard:', err);
      setError('대시보드 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <KPICardSkeleton key={i} />)}
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">
          안녕하세요, {user?.name || '고객'}님!
        </h1>
        <p className="text-gray-600 mt-2">쇼핑 활동과 주문 현황을 확인하세요</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* KPI Grid - Using shared KPICard component */}
      <KPIGrid>
        <KPICard
          title="총 주문"
          value={stats?.totalOrders || 0}
          icon={Package}
          trend={{ value: 0, isPositive: true }}
          color="blue"
        />
        <KPICard
          title="진행중인 주문"
          value={stats?.pendingOrders || 0}
          icon={ShoppingCart}
          color="yellow"
        />
        <KPICard
          title="총 구매금액"
          value={`${(stats?.totalSpent || 0).toLocaleString()}원`}
          icon={DollarSign}
          color="green"
        />
        <KPICard
          title="리워드 포인트"
          value={`${(stats?.rewardPoints || 0).toLocaleString()}P`}
          icon={Star}
          color="purple"
        />
      </KPIGrid>

      {/* API not implemented notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-blue-900 mb-1">
              고객 대시보드 기능 준비 중
            </h3>
            <p className="text-sm text-blue-800">
              주문 내역, 리워드 포인트, 위시리스트 등의 기능이 곧 제공될 예정입니다.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">빠른 실행</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionCard
            icon={ShoppingCart}
            label="상품 둘러보기"
            href="/products"
            color="blue"
          />
          <QuickActionCard
            icon={MapPin}
            label="주문 추적"
            href="/my-account/orders"
            color="purple"
          />
          <QuickActionCard
            icon={MessageCircle}
            label="고객 지원"
            href="/contact"
            color="green"
          />
          <QuickActionCard
            icon={Heart}
            label="위시리스트"
            href="/my-account/wishlist"
            color="red"
            badge={stats?.wishlistItems}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">최근 주문</h2>
            <a
              href="/my-account/orders"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              전체 보기 →
            </a>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-4">아직 주문 내역이 없습니다</p>
              <a
                href="/products"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                쇼핑 시작하기
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>

        {/* Account Management Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">계정 관리</h2>
          <div className="space-y-3">
            <AccountLink
              href="/my-account/profile"
              icon={User}
              title="프로필 설정"
              description="개인정보 수정"
            />
            <AccountLink
              href="/my-account/addresses"
              icon={MapPin}
              title="배송지 관리"
              description="배송 주소 관리"
            />
            <AccountLink
              href="/my-account/payment-methods"
              icon={CreditCard}
              title="결제 수단"
              description="결제 정보 관리"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Quick Action Card Component
const QuickActionCard: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  color: 'blue' | 'purple' | 'green' | 'red';
  badge?: number;
}> = ({ icon: Icon, label, href, color, badge }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
    green: 'bg-green-50 text-green-600 hover:bg-green-100',
    red: 'bg-red-50 text-red-600 hover:bg-red-100',
  };

  return (
    <a
      href={href}
      className={`relative flex flex-col items-center justify-center p-4 rounded-lg transition-colors ${colorClasses[color]}`}
    >
      <Icon className="w-6 h-6 mb-2" />
      <span className="text-sm font-medium text-center">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </a>
  );
};

// Order Card Component
const OrderCard: React.FC<{ order: OrderSummary }> = ({ order }) => (
  <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all">
    <div className="flex items-start justify-between mb-2">
      <div>
        <p className="font-medium text-gray-900">주문 #{order.orderNumber}</p>
        <p className="text-sm text-gray-500">{new Date(order.date).toLocaleDateString()}</p>
      </div>
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
        {statusLabels[order.status]}
      </span>
    </div>
    <div className="flex items-center justify-between text-sm mt-3">
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

// Account Link Component
const AccountLink: React.FC<{
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}> = ({ href, icon: Icon, title, description }) => (
  <a
    href={href}
    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
  >
    <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
      <Icon className="w-5 h-5 text-gray-600" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-gray-900 text-sm">{title}</p>
      <p className="text-xs text-gray-600 mt-0.5">{description}</p>
    </div>
  </a>
);

// Shortcode definition for customer dashboard
export const customerDashboardShortcode: ShortcodeDefinition = {
  name: 'customer_dashboard',
  description: '사용자 계정 대시보드',
  component: () => <CustomerDashboard />
};

// Export as array for auto-registration
export const customerShortcodes = [customerDashboardShortcode];

export default CustomerDashboard;
