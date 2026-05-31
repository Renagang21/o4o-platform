/**
 * K-Cosmetics — Action Queue Definitions
 *
 * WO-O4O-OPERATOR-ACTION-LAYER-V1
 *
 * 기존 operator-dashboard.controller.ts actionQueue 항목을 ActionDefinition 형식으로 정의.
 *
 * WO-O4O-ACTION-QUEUE-COSMETICS-ACTIVE-ORDERS-POLICY-V1 (Track B):
 *   active-orders 정의를 checkout_orders 기준으로 정렬 + 정책 문서화.
 *
 *   active-orders 정책:
 *     - "운영자가 확인하거나 처리해야 할 주문" 알림용 count (매출 KPI 와 분리).
 *     - canonical 기준: status = 'paid' (legacy `status IN ('pending', 'processing')`
 *       는 사용 안 함 — checkout_orders 에는 'processing' 가 부재).
 *     - cancelled / refunded / pending_payment / created 는 active 에서 제외.
 *     - fulfillment 단계 모델 부재 — 현재는 paid 주문을 처리 대상으로 본다.
 *       배송/처리 상태 모델 도입 시 본 정책 확장 (별도 WO).
 *
 *   safe-fallback (action-queue.controller.ts count loop) 는 그대로 유지 — 회귀 방어.
 */

// WO-PLATFORM-ACTION-QUEUE-DECISION-PRESSURE-REMOVE-V1: DataSource/logger import 제거
import type { ServiceActionConfig } from '../../common/action-queue/action-queue.types.js';

export const cosmeticsActionConfig: ServiceActionConfig = {
  serviceKey: 'k-cosmetics',
  definitions: [
    {
      id: 'active-orders',
      type: 'commerce',
      title: '진행 주문 처리',
      description: '처리가 필요한 진행 중인 주문이 있습니다.',
      // WO-O4O-ACTION-QUEUE-COSMETICS-ACTIVE-ORDERS-POLICY-V1: checkout_orders 정렬.
      query: `SELECT COUNT(*)::int AS cnt
              FROM checkout_orders co
              WHERE co.metadata->>'serviceKey' = 'cosmetics'
                AND co.status = 'paid'`,
      actionUrl: '/operator/orders',
      actionLabel: '주문 관리',
      actionType: 'NAVIGATE',
      alwaysHigh: true,
    },
    {
      id: 'pending-products',
      type: 'product',
      title: '상품 승인 대기',
      description: '승인 대기 중인 상품이 있습니다.',
      query: `SELECT COUNT(*)::int AS cnt
              FROM cosmetics.cosmetics_products
              WHERE status = 'PENDING'`,
      actionUrl: '/operator/products?status=PENDING',
      actionLabel: '상품 관리',
      actionType: 'NAVIGATE',
      alwaysHigh: true,
    },
    // WO-PLATFORM-ACTION-QUEUE-DECISION-PRESSURE-REMOVE-V1:
    // EXECUTE(DRAFT → VISIBLE 일괄) 제거 → NAVIGATE 전환. 공급자가 작성 중일 수 있는
    // 임시저장 상품을 운영자가 무차별 공개하지 않도록, 상품 검토 화면으로 이동만 허용.
    {
      id: 'draft-products',
      type: 'product-draft',
      title: '임시저장 상품 확인',
      description: '검토가 필요한 임시저장 상품이 있습니다.',
      query: `SELECT COUNT(*)::int AS cnt
              FROM cosmetics.cosmetics_products
              WHERE status = 'DRAFT'`,
      actionUrl: '/operator/products?status=DRAFT',
      actionLabel: '상품 검토',
      actionType: 'NAVIGATE',
    },
    {
      id: 'suspended-members',
      type: 'member',
      title: '정지 회원 복구 대기',
      description: '정지 상태의 회원이 있습니다.',
      query: `SELECT COUNT(*)::int AS cnt, MIN(sm.updated_at) AS oldest
              FROM service_memberships sm
              WHERE sm.status = 'suspended' AND sm.service_key = 'k-cosmetics'`,
      actionUrl: '/operator/users?status=suspended',
      actionLabel: '회원 관리',
      actionType: 'NAVIGATE',
    },
  ],
  // WO-PLATFORM-ACTION-QUEUE-DECISION-PRESSURE-REMOVE-V1:
  // 'draft-products' 일괄 VISIBLE execute handler 제거
  executeHandlers: {},
};
