/**
 * Operator Orders Page — '주문 현황' (view-only) — K-Cosmetics
 *
 * WO-O4O-OPERATOR-PRODUCT-ORDER-VIEW-COMMONIZE-V1:
 *   공통 컴포넌트 @o4o/operator-core-ui · OperatorOrderStatusPage 로 추출.
 *   본 파일은 cosmetics operator orders fetch + accent/copy 만 주입하는 thin wrapper.
 *   조회 전용 — 상태변경/배송/취소/환불/송장/정산/bulk action 없음.
 *
 * 선행: WO-O4O-OPERATOR-ORDER-VIEW-FRONTEND-WIRE-V1 (checkout_orders view-only API).
 */

import { OperatorOrderStatusPage } from '@o4o/operator-core-ui';
import type { OrderStatusFetcher } from '@o4o/operator-core-ui';
import { cosOperatorOrdersApi } from '@/api/operatorOrders';

const EMPTY_STATS = { total: 0, paid: 0, pending: 0, cancelled: 0, totalAmount: 0 };

const fetchOrders: OrderStatusFetcher = async ({ page, limit, status, paymentStatus, search }) => {
  const res = await cosOperatorOrdersApi.list({ page, limit, status, paymentStatus, search });
  const body = res.data;
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
        description: 'B2B 주문 현황 (조회 전용)',
        accent: {
          iconBg: 'bg-pink-100',
          iconText: 'text-pink-600',
          searchButton: 'bg-pink-600 hover:bg-pink-700',
          focusRing: 'focus:ring-pink-500',
          loaderText: 'text-pink-500',
          infoContainer: 'bg-pink-50 border-pink-200',
          infoIcon: 'text-pink-600',
          infoTitle: 'text-pink-800',
          infoBody: 'text-pink-600',
        },
      }}
    />
  );
}
