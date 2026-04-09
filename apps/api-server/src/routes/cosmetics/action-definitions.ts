/**
 * K-Cosmetics — Action Queue Definitions
 *
 * WO-O4O-OPERATOR-ACTION-LAYER-V1
 *
 * 기존 operator-dashboard.controller.ts actionQueue 항목을 ActionDefinition 형식으로 정의.
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
      query: `SELECT COUNT(*)::int AS cnt
              FROM ecommerce_orders
              WHERE service_key = 'cosmetics'
                AND status IN ('pending', 'processing')`,
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
