/**
 * Supplier Dashboard Overview Shortcode
 * Phase PD-6 Part 2: Compact dashboard view for embedding in CMS pages
 *
 * Usage: [supplier_dashboard_overview]
 *
 * Features:
 * - Top 4 KPI cards (orders, supply amount, pending shipments, avg order)
 * - 2 key charts (supply trend + order status distribution)
 * - Recent supply orders list (5 items)
 */

import React, { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import { KPICard, KPIGrid } from '../dashboard/common/KPICard';
import { LineChart } from '../charts/LineChart';
import { PieChart } from '../charts/PieChart';
import { KPICardSkeleton } from '../common/Skeleton';
import { Package, TrendingUp, Clock, ShoppingCart } from 'lucide-react';

interface SupplierDashboardSummary {
  totalOrders: number;
  totalSupplyAmount: number;
  pendingShipments: number;
  avgOrderAmount: number;
}

interface SupplierOrderSummary {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  buyerName: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  supplierAmount: number;
  itemCount: number;
}

export const SupplierDashboardOverview: React.FC = () => {
  const [summary, setSummary] = useState<SupplierDashboardSummary | null>(null);
  const [recentOrders, setRecentOrders] = useState<SupplierOrderSummary[]>([]);
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
        authClient.api.get(`/api/v1/supplier/dashboard/summary?${params.toString()}`),
        authClient.api.get(`/api/v1/supplier/dashboard/orders?page=1&limit=5&${params.toString()}`),
      ]);

      if (summaryRes.status === 'fulfilled' && summaryRes.value.data) {
        setSummary(summaryRes.value.data);
      }

      if (ordersRes.status === 'fulfilled' && ordersRes.value.data?.orders) {
        setRecentOrders(ordersRes.value.data.orders);
      }
    } catch (err) {
      console.error('Failed to load supplier dashboard:', err);
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
        <h2 className="text-2xl font-bold text-gray-900">공급자 대시보드 개요</h2>
        <p className="text-gray-600 mt-1">최근 30일 공급 성과</p>
      </div>

      {/* KPI Cards */}
      <KPIGrid>
        <KPICard
          title="총 공급 주문"
          value={summary?.totalOrders || 0}
          subtitle="최근 30일"
          icon={Package}
          color="blue"
          badge={summary?.totalOrders && summary.totalOrders > 0 ? summary.totalOrders : undefined}
        />
        <KPICard
          title="총 공급 금액"
          value={`${(summary?.totalSupplyAmount || 0).toLocaleString()}원`}
          subtitle="공급 금액"
          icon={TrendingUp}
          color="green"
        />
        <KPICard
          title="출고 대기"
          value={summary?.pendingShipments || 0}
          subtitle="처리 필요"
          icon={Clock}
          color="orange"
          badge={summary?.pendingShipments}
        />
        <KPICard
          title="평균 주문액"
          value={`${(summary?.avgOrderAmount || 0).toLocaleString()}원`}
          subtitle="주문당 평균"
          icon={ShoppingCart}
          color="purple"
        />
      </KPIGrid>

      {/* Charts */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LineChart
          title="공급 금액 추이"
          series={[
            {
              name: '공급 금액',
              data: recentOrders.length > 0
                ? recentOrders.slice().reverse().map(order => order.supplierAmount)
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

        <PieChart
          title="주문 상태 분포"
          series={
            recentOrders.length > 0
              ? [
                  recentOrders.filter(o => o.status === 'pending').length,
                  recentOrders.filter(o => o.status === 'confirmed').length,
                  recentOrders.filter(o => o.status === 'shipped').length,
                  recentOrders.filter(o => o.status === 'delivered').length
                ]
              : [1]
          }
          labels={
            recentOrders.length > 0
              ? ['대기중', '확정', '배송중', '배송완료']
              : ['데이터 없음']
          }
          variant="donut"
          height={300}
          valueFormatter={(value) => `${value}건`}
        />
      </div>

      {/* Recent Orders */}
      <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">최근 공급 주문</h3>
          <a
            href="/dashboard/supplier#orders"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            전체 보기 →
          </a>
        </div>

        {recentOrders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">최근 공급 주문이 없습니다</p>
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
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {order.status}
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

                <div className="border-t pt-2 mt-2">
                  <p className="text-xs text-gray-500">공급 금액</p>
                  <p className="font-semibold text-gray-900">
                    {order.supplierAmount.toLocaleString()}원
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierDashboardOverview;
