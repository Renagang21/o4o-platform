/**
 * Operator Orders Page — '주문 현황' (view-only)
 *
 * WO-O4O-OPERATOR-PRODUCT-ORDER-VIEW-COMMONIZE-V1:
 *   공통 컴포넌트 @o4o/operator-core-ui · OperatorOrderStatusPage 로 추출.
 *   본 파일은 glycopharm operator orders fetch + accent/copy 만 주입하는 thin wrapper.
 *   조회 전용 — 상태변경/배송/취소/환불/송장/정산/bulk action 없음.
 *
 * 선행: WO-O4O-OPERATOR-ORDER-VIEW-FRONTEND-WIRE-V1 (checkout_orders view-only API).
 */

import { OperatorOrderStatusPage } from '@o4o/operator-core-ui';
import type { OrderStatusFetcher } from '@o4o/operator-core-ui';
import { glycopharmApi } from '@/api/glycopharm';

const EMPTY_STATS = { total: 0, paid: 0, pending: 0, cancelled: 0, totalAmount: 0 };

const fetchOrders: OrderStatusFetcher = async ({ page, limit, status, paymentStatus, search }) => {
  const response = await glycopharmApi.getOperatorOrders({ page, limit, status, paymentStatus, search });
  if (response.success && response.data) {
    return {
      orders: response.data.orders || [],
      stats: response.data.stats || EMPTY_STATS,
      total: response.data.pagination?.total || 0,
    };
  }
  return { orders: [], stats: EMPTY_STATS, total: 0 };
};

export default function OrdersPage() {
  return (
    <OperatorOrderStatusPage
      fetchOrders={fetchOrders}
      config={{
        description: '약국 B2B 주문 현황 (조회 전용)',
        accent: {
          iconBg: 'bg-primary-100',
          iconText: 'text-primary-600',
          searchButton: 'bg-primary-500 hover:bg-primary-600',
          focusRing: 'focus:ring-primary-500',
          loaderText: 'text-primary-600',
          infoContainer: 'bg-blue-50 border-blue-200',
          infoIcon: 'text-blue-600',
          infoTitle: 'text-blue-800',
          infoBody: 'text-blue-600',
        },
      }}
    />
  );
}
