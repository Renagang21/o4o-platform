/**
 * Neture Operator Action Queue Controller
 *
 * WO-O4O-OPERATOR-ACTION-QUEUE-V1
 * WO-O4O-OPERATOR-ACTION-QUEUE-DATA-INTEGRATION-V1
 *
 * GET /api/v1/neture/operator/actions
 *   → 실제 운영 데이터 기반 대기 항목 반환 (8 parallel queries)
 *
 * Auth: requireAuth + requireNetureScope('neture:operator')
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../../middleware/neture-scope.middleware.js';
import logger from '../../../utils/logger.js';

interface ActionQueueItem {
  id: string;
  type: 'approval' | 'curation' | 'inquiry' | 'product';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  count: number;
  oldestAt: string | null;
  actionUrl: string;
  actionLabel: string;
}

export function createOperatorActionQueueController(dataSource: DataSource): Router {
  const router = Router();

  router.use(requireAuth);
  router.use(requireNetureScope('neture:operator') as any);

  /**
   * GET /operator/actions
   */
  router.get('/actions', async (_req: Request, res: Response): Promise<void> => {
    try {
      // WO-O4O-OPERATOR-ACTION-QUEUE-DATA-INTEGRATION-V1: 8 parallel queries
      const [
        pendingRegsRow,
        pendingSuppliersRow,
        pendingProductsRow,
        uncuratedRow,
        unreadMessagesRow,
        partnerRequestsRow,
        newApprovedRow,
        activeProductsRow,
      ] = await Promise.all([
        // 1. 가입 승인 대기
        dataSource.query(
          `SELECT COUNT(*)::int AS cnt, MIN(created_at) AS oldest
           FROM service_memberships
           WHERE service_key = 'neture' AND status = 'pending'`,
        ),
        // 2. 공급사 승인 대기
        dataSource.query(
          `SELECT COUNT(*)::int AS cnt, MIN(created_at) AS oldest
           FROM neture_suppliers
           WHERE status = 'PENDING'`,
        ),
        // 3. 상품 승인 대기
        dataSource.query(
          `SELECT COUNT(*)::int AS cnt, MIN(created_at) AS oldest
           FROM offer_service_approvals
           WHERE service_key = 'neture' AND approval_status = 'pending'`,
        ),
        // 4. 큐레이션 필요 (승인 완료 + 활성 + 큐레이션 미등록)
        dataSource.query(
          `SELECT COUNT(*)::int AS cnt, MIN(spo.created_at) AS oldest
           FROM supplier_product_offers spo
           WHERE spo.approval_status = 'APPROVED'
             AND spo.is_active = true
             AND NOT EXISTS (
               SELECT 1 FROM offer_curations oc
               WHERE oc.offer_id = spo.id
                 AND oc.service_key = 'neture'
                 AND oc.is_active = true
             )`,
        ),
        // 5. 미확인 문의
        dataSource.query(
          `SELECT COUNT(*)::int AS cnt, MIN(created_at) AS oldest
           FROM neture_contact_messages
           WHERE status != 'resolved'`,
        ),
        // 6. 파트너 요청
        dataSource.query(
          `SELECT COUNT(*)::int AS cnt, MIN(created_at) AS oldest
           FROM neture_partnership_requests
           WHERE status = 'OPEN'`,
        ),
        // 7. 신규 승인 상품 (24시간 이내)
        dataSource.query(
          `SELECT COUNT(*)::int AS cnt, MIN(updated_at) AS oldest
           FROM supplier_product_offers
           WHERE approval_status = 'APPROVED'
             AND updated_at > NOW() - INTERVAL '24 hours'`,
        ),
        // 8. 활성 상품 총 수 (데이터 부족 감지)
        dataSource.query(
          `SELECT COUNT(*)::int AS cnt
           FROM supplier_product_offers
           WHERE approval_status = 'APPROVED' AND is_active = true`,
        ),
      ]);

      const pendingRegs = pendingRegsRow[0]?.cnt || 0;
      const pendingSuppliers = pendingSuppliersRow[0]?.cnt || 0;
      const pendingProducts = pendingProductsRow[0]?.cnt || 0;
      const uncurated = uncuratedRow[0]?.cnt || 0;
      const unreadMessages = unreadMessagesRow[0]?.cnt || 0;
      const partnerRequests = partnerRequestsRow[0]?.cnt || 0;
      const newApproved = newApprovedRow[0]?.cnt || 0;
      const totalActive = activeProductsRow[0]?.cnt || 0;

      // Build action items
      const definitions: Array<{
        id: string;
        type: ActionQueueItem['type'];
        title: string;
        description: string;
        count: number;
        oldest: string | null;
        actionUrl: string;
        actionLabel: string;
        alwaysHigh: boolean;
      }> = [
        {
          id: 'pending-regs',
          type: 'approval',
          title: '가입 승인 대기',
          description: '신규 서비스 가입 신청이 대기 중입니다.',
          count: pendingRegs,
          oldest: pendingRegsRow[0]?.oldest || null,
          actionUrl: '/operator/applications',
          actionLabel: '승인 관리',
          alwaysHigh: true,
        },
        {
          id: 'pending-suppliers',
          type: 'approval',
          title: '공급사 승인 대기',
          description: '신규 공급사 등록 요청이 대기 중입니다.',
          count: pendingSuppliers,
          oldest: pendingSuppliersRow[0]?.oldest || null,
          actionUrl: '/operator/admin-suppliers',
          actionLabel: '공급사 관리',
          alwaysHigh: true,
        },
        {
          id: 'pending-products',
          type: 'product',
          title: '상품 승인 대기',
          description: '서비스 상품 승인 요청이 대기 중입니다.',
          count: pendingProducts,
          oldest: pendingProductsRow[0]?.oldest || null,
          actionUrl: '/operator/product-service-approvals',
          actionLabel: '상품 승인',
          alwaysHigh: true,
        },
        {
          id: 'uncurated',
          type: 'curation',
          title: '큐레이션 필요',
          description: '승인된 상품 중 큐레이션이 등록되지 않았습니다.',
          count: uncurated,
          oldest: uncuratedRow[0]?.oldest || null,
          actionUrl: '/operator/curation',
          actionLabel: '큐레이션 관리',
          alwaysHigh: false,
        },
        {
          id: 'unread-messages',
          type: 'inquiry',
          title: '미확인 문의',
          description: '처리되지 않은 문의 메시지가 있습니다.',
          count: unreadMessages,
          oldest: unreadMessagesRow[0]?.oldest || null,
          actionUrl: '/operator/contact-messages',
          actionLabel: '문의 관리',
          alwaysHigh: false,
        },
        {
          id: 'partner-requests',
          type: 'approval',
          title: '파트너 요청',
          description: '파트너십 요청이 대기 중입니다.',
          count: partnerRequests,
          oldest: partnerRequestsRow[0]?.oldest || null,
          actionUrl: '/operator/applications',
          actionLabel: '요청 관리',
          alwaysHigh: false,
        },
        // (B) 신규 승인 상품 (24시간 이내)
        {
          id: 'new-approved',
          type: 'product',
          title: '신규 승인 상품',
          description: `최근 24시간 내 ${newApproved}개 상품이 승인되었습니다.`,
          count: newApproved,
          oldest: newApprovedRow[0]?.oldest || null,
          actionUrl: '/operator/supply',
          actionLabel: '상품 확인',
          alwaysHigh: false,
        },
      ];

      // (D) 데이터 부족: 활성 상품이 0개인 경우 경고
      if (totalActive === 0) {
        definitions.push({
          id: 'low-activity',
          type: 'product',
          title: '운영 활동 부족',
          description: '등록된 활성 상품이 없습니다. 상품 등록이 필요합니다.',
          count: 1,
          oldest: null,
          actionUrl: '/operator/supply',
          actionLabel: '상품 등록',
          alwaysHigh: false,
        });
      }

      // Filter count > 0, assign priority, sort
      const items: ActionQueueItem[] = definitions
        .filter((d) => d.count > 0)
        .map((d) => ({
          id: d.id,
          type: d.type,
          title: d.title,
          description: d.description,
          priority: (d.alwaysHigh || d.count >= 5 ? 'high' : 'medium') as ActionQueueItem['priority'],
          count: d.count,
          oldestAt: d.oldest ? new Date(d.oldest).toISOString() : null,
          actionUrl: d.actionUrl,
          actionLabel: d.actionLabel,
        }))
        .sort((a, b) => {
          const pOrder = { high: 0, medium: 1, low: 2 };
          if (pOrder[a.priority] !== pOrder[b.priority]) {
            return pOrder[a.priority] - pOrder[b.priority];
          }
          return b.count - a.count;
        });

      // Summary
      const total = items.reduce((sum, i) => sum + i.count, 0);
      const high = items
        .filter((i) => i.priority === 'high')
        .reduce((sum, i) => sum + i.count, 0);
      const today = items.filter((i) => {
        if (!i.oldestAt) return false;
        const d = new Date(i.oldestAt);
        const now = new Date();
        return d.toDateString() === now.toDateString();
      }).length;

      res.json({
        success: true,
        data: { summary: { total, high, today }, items },
      });
    } catch (error: any) {
      logger.error('[Neture Operator Action Queue] Error:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: error.message,
      });
    }
  });

  return router;
}
