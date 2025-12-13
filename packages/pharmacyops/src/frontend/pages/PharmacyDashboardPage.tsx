/**
 * PharmacyDashboardPage v2
 *
 * 약국 대시보드 페이지 - 실서비스 수준 구현
 *
 * @package @o4o/pharmacyops
 */

import React, { useState, useEffect } from 'react';
import {
  StatCard,
  QuickActionButton,
  StatusBadge,
  TemperatureBadge,
  LoadingSpinner,
  EmptyState,
  PriceDisplay,
} from '../components/index.js';
import type {
  PharmacyDashboardDto,
  PharmacyOrderListItemDto,
  PharmacyDispatchListItemDto,
} from '../../dto/index.js';

// Mock data for development
const mockDashboardData: PharmacyDashboardDto = {
  pharmacyId: 'pharmacy-001',
  pharmacyName: '건강약국',
  pharmacyLicenseNumber: 'PH-2024-001234',
  totalOrders: 156,
  pendingOrders: 8,
  inTransitOrders: 12,
  completedOrders: 136,
  totalPurchaseAmount: 45000000,
  pendingPaymentAmount: 3500000,
  thisMonthPurchaseAmount: 8200000,
  recentOrders: [
    {
      id: 'order-001',
      orderNumber: 'PO-2024-001234',
      productName: '타이레놀 500mg',
      supplierName: '대한도매',
      quantity: 100,
      totalAmount: 320000,
      status: 'in_transit',
      paymentStatus: 'paid',
      createdAt: new Date(),
      hasTracking: true,
    },
    {
      id: 'order-002',
      orderNumber: 'PO-2024-001233',
      productName: '아스피린정 100mg',
      supplierName: '서울제약도매',
      quantity: 50,
      totalAmount: 105000,
      status: 'delivered',
      paymentStatus: 'paid',
      createdAt: new Date(Date.now() - 86400000),
      hasTracking: true,
    },
  ],
  activeDispatches: [
    {
      id: 'dispatch-001',
      orderId: 'order-001',
      orderNumber: 'PO-2024-001234',
      dispatchNumber: 'DS-2024-001234',
      status: 'in_transit',
      carrierName: 'CJ대한통운',
      trackingNumber: '123456789012',
      temperatureControl: 'none',
      requiresColdChain: false,
      isNarcotics: false,
      estimatedDeliveryAt: new Date(Date.now() + 86400000),
      dispatchedAt: new Date(Date.now() - 43200000),
    },
  ],
};

export const PharmacyDashboardPage: React.FC = () => {
  const [dashboard, setDashboard] = useState<PharmacyDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with actual API call
    setTimeout(() => {
      setDashboard(mockDashboardData);
      setLoading(false);
    }, 500);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!dashboard) {
    return (
      <EmptyState
        message="대시보드를 불러올 수 없습니다."
        icon="⚠️"
      />
    );
  }

  return (
    <div className="pharmacy-dashboard-page p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {dashboard.pharmacyName}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              허가번호: {dashboard.pharmacyLicenseNumber}
            </p>
          </div>
          <div className="flex gap-2">
            <QuickActionButton
              label="새 주문"
              icon="+"
              onClick={() => (window.location.href = '/pharmacyops/orders/create')}
              variant="primary"
            />
            <QuickActionButton
              label="배송 조회"
              icon="🚚"
              onClick={() => (window.location.href = '/pharmacyops/dispatch')}
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="전체 주문"
          value={dashboard.totalOrders}
          subValue="총 주문 건수"
          icon="📦"
          color="blue"
        />
        <StatCard
          title="처리 대기"
          value={dashboard.pendingOrders}
          subValue="확인 필요"
          icon="⏳"
          color="yellow"
        />
        <StatCard
          title="배송 중"
          value={dashboard.inTransitOrders}
          subValue="진행 중인 배송"
          icon="🚚"
          color="purple"
        />
        <StatCard
          title="완료"
          value={dashboard.completedOrders}
          subValue="배송 완료"
          icon="✅"
          color="green"
        />
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="이번 달 구매액"
          value={formatCurrency(dashboard.thisMonthPurchaseAmount)}
          icon="💰"
          color="blue"
        />
        <StatCard
          title="미결제 금액"
          value={formatCurrency(dashboard.pendingPaymentAmount)}
          subValue="결제 필요"
          icon="💳"
          color="red"
        />
        <StatCard
          title="총 구매액"
          value={formatCurrency(dashboard.totalPurchaseAmount)}
          subValue="누적 금액"
          icon="📊"
          color="green"
        />
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-lg border p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">빠른 메뉴</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="/pharmacyops/products"
            className="flex flex-col items-center p-4 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl mb-2">💊</span>
            <span className="text-sm font-medium">의약품 검색</span>
          </a>
          <a
            href="/pharmacyops/offers"
            className="flex flex-col items-center p-4 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl mb-2">🏷️</span>
            <span className="text-sm font-medium">도매 Offer</span>
          </a>
          <a
            href="/pharmacyops/orders"
            className="flex flex-col items-center p-4 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl mb-2">📋</span>
            <span className="text-sm font-medium">주문 내역</span>
          </a>
          <a
            href="/pharmacyops/settlement"
            className="flex flex-col items-center p-4 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl mb-2">📑</span>
            <span className="text-sm font-medium">구매 정산</span>
          </a>
        </div>
      </div>

      {/* Recent Orders & Active Dispatches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">최근 주문</h2>
            <a
              href="/pharmacyops/orders"
              className="text-sm text-blue-600 hover:underline"
            >
              전체 보기
            </a>
          </div>
          {dashboard.recentOrders.length === 0 ? (
            <EmptyState message="최근 주문 내역이 없습니다." icon="📭" />
          ) : (
            <ul className="divide-y">
              {dashboard.recentOrders.map((order) => (
                <li key={order.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{order.productName}</p>
                      <p className="text-sm text-gray-500">
                        {order.orderNumber} · {order.supplierName}
                      </p>
                    </div>
                    <div className="text-right">
                      <PriceDisplay amount={order.totalAmount} size="sm" />
                      <div className="mt-1">
                        <StatusBadge status={order.status} type="order" />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Active Dispatches */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">배송 현황</h2>
            <a
              href="/pharmacyops/dispatch"
              className="text-sm text-blue-600 hover:underline"
            >
              전체 보기
            </a>
          </div>
          {dashboard.activeDispatches.length === 0 ? (
            <EmptyState message="진행 중인 배송이 없습니다." icon="🚚" />
          ) : (
            <ul className="divide-y">
              {dashboard.activeDispatches.map((dispatch) => (
                <li key={dispatch.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TemperatureBadge control={dispatch.temperatureControl as any} />
                      {dispatch.isNarcotics && (
                        <span className="text-xs bg-red-100 text-red-700 px-1 rounded">⚠️</span>
                      )}
                      <div>
                        <p className="font-medium">{dispatch.orderNumber}</p>
                        <p className="text-sm text-gray-500">
                          {dispatch.carrierName} · {dispatch.trackingNumber}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={dispatch.status} type="dispatch" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default PharmacyDashboardPage;
