/**
 * Operator Orders Page — '주문 현황' (view-only) — KPA-Society
 *
 * WO-O4O-KPA-OPERATOR-ORDER-VIEW-FRONTEND-WIRING-V1:
 *   공통 컴포넌트 @o4o/operator-core-ui · OperatorOrderStatusPage 도입.
 *   backend `GET /api/v1/kpa/operator/orders` (view-only, kpa:operator,
 *   serviceKey IN ('kpa-society','kpa')) 연결.
 *   apiClient(base /api/v1/kpa) 사용 — `/operator/orders` → `/api/v1/kpa/operator/orders`.
 *   조회 전용 — 상태변경/배송/취소/환불/송장/정산/bulk action 없음.
 */

import { OperatorOrderStatusPage } from '@o4o/operator-core-ui';
import type { OrderStatusFetcher } from '@o4o/operator-core-ui';
import { apiClient } from '../../api/client';

const EMPTY_STATS = { total: 0, paid: 0, pending: 0, cancelled: 0, totalAmount: 0 };

const fetchOrders: OrderStatusFetcher = async ({ page, limit, status, paymentStatus, search }) => {
  // apiClient base = /api/v1/kpa → 최종 GET /api/v1/kpa/operator/orders.
  // ApiClient.get 은 JSON body 를 직접 반환: { success, data: { orders, stats, pagination } }.
  const body: any = await apiClient.get('/operator/orders', { page, limit, status, paymentStatus, search });
  if (body?.success && body.data) {
    return {
      orders: body.data.orders || [],
      stats: body.data.stats || EMPTY_STATS,
      total: body.data.pagination?.total || 0,
    };
  }
  return { orders: [], stats: EMPTY_STATS, total: 0 };
};

export default function OrdersPage() {
  return (
    <OperatorOrderStatusPage
      fetchOrders={fetchOrders}
      config={{
        description: 'KPA-Society 서비스 전체 주문 현황을 조회합니다.',
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
