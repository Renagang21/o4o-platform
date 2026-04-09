/**
 * Neture Operator Action Queue Controller
 *
 * WO-O4O-OPERATOR-ACTION-QUEUE-V1
 * WO-O4O-ACTION-QUEUE-TO-ACTION-ENGINE-V1
 * WO-O4O-AI-ACTION-INTEGRATION-V2
 * WO-O4O-AI-ACTION-LLM-UPGRADE-V3
 *
 * GET /api/v1/neture/operator/actions
 *   → SYSTEM + AI 액션 병합, 타입/우선순위/설명과 함께 반환
 *
 * POST /api/v1/neture/operator/actions/execute/inquiries-mark-read
 *   → status='new' 문의 일괄 in_progress 전환
 *
 * POST /api/v1/neture/operator/actions/execute/approve-pending-products
 *   → pending 서비스 승인 일괄 approve
 *
 * Auth: requireAuth + requireNetureScope('neture:operator')
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../../middleware/neture-scope.middleware.js';
// WO-NETURE-CURATION-PHASE1-DECISION-PRESSURE-REMOVE-V1: OfferCurationService import 제거
import { OfferServiceApprovalService } from '../services/offer-service-approval.service.js';
import { OperatorAiActionService } from '../services/operator-ai-action.service.js';
import logger from '../../../utils/logger.js';

type AuthenticatedRequest = Request & {
  user?: { id: string; role: string };
};

interface ActionQueueItem {
  id: string;
  source: 'SYSTEM' | 'AI';
  type: 'approval' | 'curation' | 'inquiry' | 'product';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  count: number;
  oldestAt: string | null;
  confidence?: number;
  actionUrl: string;
  actionLabel: string;
  actionType: 'EXECUTE' | 'NAVIGATE';
  actionApi?: string;
  actionMethod?: string;
}

export function createOperatorActionQueueController(dataSource: DataSource): Router {
  const router = Router();
  // WO-NETURE-CURATION-PHASE1-DECISION-PRESSURE-REMOVE-V1: curationService 제거
  const approvalService = new OfferServiceApprovalService(dataSource);
  const aiService = new OperatorAiActionService();

  router.use(requireAuth);
  router.use(requireNetureScope('neture:operator') as any);

  /**
   * GET /operator/actions
   */
  router.get('/actions', async (_req: Request, res: Response): Promise<void> => {
    try {
      // WO-NETURE-CURATION-PHASE1-DECISION-PRESSURE-REMOVE-V1: uncuratedRow 제거
      const [
        pendingRegsRow,
        pendingSuppliersRow,
        pendingProductsRow,
        unreadMessagesRow,
        partnerRequestsRow,
      ] = await Promise.all([
        dataSource.query(
          `SELECT COUNT(*)::int AS cnt, MIN(created_at) AS oldest
           FROM service_memberships
           WHERE service_key = 'neture' AND status = 'pending'`,
        ),
        dataSource.query(
          `SELECT COUNT(*)::int AS cnt, MIN(created_at) AS oldest
           FROM neture_suppliers
           WHERE status = 'PENDING'`,
        ),
        dataSource.query(
          `SELECT COUNT(*)::int AS cnt, MIN(created_at) AS oldest
           FROM offer_service_approvals
           WHERE service_key = 'neture' AND approval_status = 'pending'`,
        ),
        // WO-NETURE-CURATION-PHASE1-DECISION-PRESSURE-REMOVE-V1: uncurated 쿼리 제거
        dataSource.query(
          `SELECT COUNT(*)::int AS cnt, MIN(created_at) AS oldest
           FROM neture_contact_messages
           WHERE status != 'resolved'`,
        ),
        dataSource.query(
          `SELECT COUNT(*)::int AS cnt, MIN(created_at) AS oldest
           FROM neture_partnership_requests
           WHERE status = 'OPEN'`,
        ),
      ]);

      const pendingRegs = pendingRegsRow[0]?.cnt || 0;
      const pendingSuppliers = pendingSuppliersRow[0]?.cnt || 0;
      const pendingProducts = pendingProductsRow[0]?.cnt || 0;
      // WO-NETURE-CURATION-PHASE1-DECISION-PRESSURE-REMOVE-V1: uncurated 제거
      const unreadMessages = unreadMessagesRow[0]?.cnt || 0;
      const partnerRequests = partnerRequestsRow[0]?.cnt || 0;

      // Active products for AI context
      const activeProductsRow = await dataSource.query(
        `SELECT COUNT(*)::int AS cnt
         FROM supplier_product_offers
         WHERE is_active = true AND approval_status = 'APPROVED'`,
      );
      const activeProducts = activeProductsRow[0]?.cnt || 0;

      // ── SYSTEM actions ──
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
        actionType: 'EXECUTE' | 'NAVIGATE';
        actionApi?: string;
        actionMethod?: string;
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
          actionType: 'NAVIGATE',
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
          actionType: 'NAVIGATE',
        },
        {
          id: 'pending-products',
          type: 'product',
          title: '상품 승인 대기',
          description: '서비스 상품 승인 요청이 대기 중입니다.',
          count: pendingProducts,
          oldest: pendingProductsRow[0]?.oldest || null,
          actionUrl: '/operator/product-service-approvals',
          actionLabel: '일괄 승인',
          alwaysHigh: true,
          actionType: 'EXECUTE',
          actionApi: '/neture/operator/actions/execute/approve-pending-products',
          actionMethod: 'POST',
        },
        // WO-NETURE-CURATION-PHASE1-DECISION-PRESSURE-REMOVE-V1: '큐레이션 필요' 항목 제거 — 운영자 압박 제거
        {
          id: 'unread-messages',
          type: 'inquiry',
          title: '미확인 문의',
          description: '처리되지 않은 문의 메시지가 있습니다.',
          count: unreadMessages,
          oldest: unreadMessagesRow[0]?.oldest || null,
          actionUrl: '/operator/contact-messages',
          actionLabel: '일괄 확인처리',
          alwaysHigh: false,
          actionType: 'EXECUTE',
          actionApi: '/neture/operator/actions/execute/inquiries-mark-read',
          actionMethod: 'POST',
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
          actionType: 'NAVIGATE',
        },
      ];

      const systemItems: ActionQueueItem[] = definitions
        .filter((d) => d.count > 0)
        .map((d) => {
          const item: ActionQueueItem = {
            id: d.id,
            source: 'SYSTEM',
            type: d.type,
            title: d.title,
            description: d.description,
            priority: (d.alwaysHigh || d.count >= 5 ? 'high' : 'medium') as ActionQueueItem['priority'],
            count: d.count,
            oldestAt: d.oldest ? new Date(d.oldest).toISOString() : null,
            actionUrl: d.actionUrl,
            actionLabel: d.actionLabel,
            actionType: d.actionType,
          };
          if (d.actionApi) item.actionApi = d.actionApi;
          if (d.actionMethod) item.actionMethod = d.actionMethod;
          return item;
        });

      // ── AI actions (Rule → LLM → Fallback) ──
      const aiRaw = await aiService.generateActions({
        pendingApprovals: pendingProducts,
        pendingSuppliers,
        // WO-NETURE-CURATION-PHASE1-DECISION-PRESSURE-REMOVE-V1: 큐레이션 압박 제거
        uncuratedProducts: 0,
        pendingInquiries: unreadMessages,
        activeProducts,
        pendingRegs,
        partnerRequests,
      });

      const aiItems: ActionQueueItem[] = aiRaw.map((a) => ({
        id: a.id,
        source: 'AI' as const,
        type: a.type,
        title: a.title,
        description: a.description,
        priority: a.priority,
        count: 0,
        oldestAt: null,
        confidence: a.confidence,
        actionUrl: a.actionUrl,
        actionLabel: a.actionLabel,
        actionType: a.actionType,
        ...(a.actionApi ? { actionApi: a.actionApi } : {}),
        ...(a.actionMethod ? { actionMethod: a.actionMethod } : {}),
      }));

      // ── Merge: dedupe by type (AI wins when duplicate) ──
      const systemTypes = new Set(systemItems.map((i) => i.type));
      const uniqueAi = aiItems.filter((a) => !systemTypes.has(a.type));
      const merged = [...systemItems, ...uniqueAi];

      // Sort: priority → confidence → count
      const pOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      merged.sort((a, b) => {
        if (pOrder[a.priority] !== pOrder[b.priority]) {
          return pOrder[a.priority] - pOrder[b.priority];
        }
        const confA = a.confidence ?? 0;
        const confB = b.confidence ?? 0;
        if (confA !== confB) return confB - confA;
        return b.count - a.count;
      });

      // Summary
      const total = merged.reduce((sum, i) => sum + i.count, 0);
      const high = merged
        .filter((i) => i.priority === 'high')
        .reduce((sum, i) => sum + i.count, 0);
      const today = merged.filter((i) => {
        if (!i.oldestAt) return false;
        const d = new Date(i.oldestAt);
        const now = new Date();
        return d.toDateString() === now.toDateString();
      }).length;
      const aiCount = merged.filter((i) => i.source === 'AI').length;

      res.json({
        success: true,
        data: { summary: { total, high, today, aiCount }, items: merged },
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

  // ==================== Execute Endpoints ====================

  // WO-NETURE-CURATION-PHASE1-DECISION-PRESSURE-REMOVE-V1:
  // POST /operator/actions/execute/curate-all 제거 — 운영자 일괄 큐레이션 압박 제거
  // (Phase 3에서 offer_curations 전체 제거 시 OfferCurationService도 함께 제거 예정)

  /**
   * POST /operator/actions/execute/inquiries-mark-read
   */
  router.post('/actions/execute/inquiries-mark-read', async (_req: Request, res: Response): Promise<void> => {
    try {
      const updated = await dataSource.query(
        `UPDATE neture_contact_messages
         SET status = 'in_progress', updated_at = NOW()
         WHERE status = 'new'
         RETURNING id`,
      );

      logger.info(`[Action Engine] inquiries-mark-read: updated=${updated.length}`);
      res.json({
        success: true,
        data: { updated: updated.length },
      });
    } catch (error: any) {
      logger.error('[Action Engine] inquiries-mark-read error:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: error.message });
    }
  });

  /**
   * POST /operator/actions/execute/approve-pending-products
   */
  router.post('/actions/execute/approve-pending-products', async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
        return;
      }

      const rows = await dataSource.query(
        `SELECT id FROM offer_service_approvals
         WHERE service_key = 'neture' AND approval_status = 'pending'`,
      );

      let approved = 0;
      let failed = 0;
      for (const row of rows) {
        const result = await approvalService.approve(row.id, userId);
        if (result.success) {
          approved++;
        } else {
          failed++;
        }
      }

      logger.info(`[Action Engine] approve-pending-products: processed=${rows.length}, approved=${approved}, failed=${failed}`);
      res.json({
        success: true,
        data: { processed: rows.length, approved, failed },
      });
    } catch (error: any) {
      logger.error('[Action Engine] approve-pending-products error:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: error.message });
    }
  });

  return router;
}
