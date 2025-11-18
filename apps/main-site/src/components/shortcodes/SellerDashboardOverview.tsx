/**
 * Seller Dashboard Overview Shortcode
 * Phase PD-6 Part 2: Compact dashboard view for embedding in CMS pages
 *
 * Usage: [seller_dashboard_overview]
 *
 * Features:
 * - Top 4 KPI cards
 * - 2 key charts (sales trend + commission breakdown)
 * - Recent orders list (5 items)
 */

import React, { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import { KPICard, KPIGrid } from '../dashboard/common/KPICard';
import { LineChart } from '../charts/LineChart';
import { BarChart } from '../charts/BarChart';
import { KPICardSkeleton } from '../common/Skeleton';
import { ShoppingCart, TrendingUp, DollarSign, ShoppingBag } from 'lucide-react';

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

export const SellerDashboardOverview: React.FC = () => {
  const [summary, setSummary] = useState<SellerDashboardSummary | null>(null);
  const [recentOrders, setRecentOrders] = useState<SellerOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Last 30 days
      const now = new Date();
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: now.toISOString()
      });

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
    } catch (err) {
      console.error('Failed to load seller dashboard:', err);
      setError('대시보드 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-96 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <KPIGrid>
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
        </KPIGrid>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">판매자 대시보드 개요</h2>
        <p className="text-gray-600 mt-1">최근 30일 판매 성과</p>
      </div>

      {/* KPI Cards */}
      <KPIGrid>
        <KPICard
          title="총 주문 건수"
          value={summary?.totalOrders || 0}
          subtitle="최근 30일"
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

      {/* Charts */}
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

      {/* Recent Orders */}
      <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">최근 주문</h3>
          <a
            href="/dashboard/seller#orders"
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
              <div
                key={order.orderId}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerDashboardOverview;
