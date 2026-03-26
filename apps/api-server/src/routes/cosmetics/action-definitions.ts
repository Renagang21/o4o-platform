/**
 * K-Cosmetics — Action Queue Definitions
 *
 * WO-O4O-OPERATOR-ACTION-LAYER-V1
 *
 * 기존 operator-dashboard.controller.ts actionQueue 항목을 ActionDefinition 형식으로 정의.
 */

import type { DataSource } from 'typeorm';
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
    {
      id: 'draft-products',
      type: 'product-draft',
      title: '임시저장 상품',
      description: '임시저장 상태의 상품이 있습니다.',
      query: `SELECT COUNT(*)::int AS cnt
              FROM cosmetics.cosmetics_products
              WHERE status = 'DRAFT'`,
      actionUrl: '/operator/products?status=DRAFT',
      actionLabel: '일괄 발행',
      actionType: 'EXECUTE',
      actionApi: '/cosmetics/operator/actions/execute/draft-products',
      actionMethod: 'POST',
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
  executeHandlers: {
    // WO-O4O-ACTION-EXECUTION-LAYER-V1: 임시저장 상품 일괄 발행 (DRAFT → VISIBLE)
    'draft-products': async (dataSource: DataSource, _userId: string) => {
      const result = await dataSource.query(
        `UPDATE cosmetics.cosmetics_products
         SET status = 'VISIBLE', updated_at = NOW()
         WHERE status = 'DRAFT'
         RETURNING id`,
      );
      const count = Array.isArray(result) ? result.length : 0;
      return { processed: count, succeeded: count, failed: 0 };
    },
  },
};
