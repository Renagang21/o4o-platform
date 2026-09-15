/**
 * SupplierSettlementController — WO-O4O-ROUTES-REFACTOR-V1
 * Extracted from neture.routes.ts (lines 3683-3922)
 *
 * Routes:
 *   GET  /settlements           — 공급자 정산 목록 (페이지네이션 + 상태 필터)
 *   GET  /settlements/kpi       — 정산 KPI (대시보드용)
 *   GET  /settlements/:id       — 공급자 정산 상세 (연결된 주문 포함)
 *   (은퇴) /partner-commissions CRUD — WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1
 */
import { Router } from 'express';
import type { Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { createRequireActiveSupplier, createRequireLinkedSupplier } from '../middleware/neture-identity.middleware.js';
import type { SupplierRequest, AuthenticatedRequest } from '../middleware/neture-identity.middleware.js';
import { NetureSettlementService } from '../services/neture-settlement.service.js';
import logger from '../../../utils/logger.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createSupplierSettlementController(dataSource: DataSource): Router {
  const router = Router();
  const settlementService = new NetureSettlementService(dataSource);
  const requireActiveSupplier = createRequireActiveSupplier(dataSource);
  const requireLinkedSupplier = createRequireLinkedSupplier(dataSource);

  // ==================== Settlement Engine (WO-O4O-SETTLEMENT-ENGINE-V1) ====================

  /**
   * GET /settlements
   * WO-O4O-SETTLEMENT-ENGINE-V1: 공급자 정산 목록 (페이지네이션 + 상태 필터)
   */
  router.get('/settlements', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const status = req.query.status as string | undefined;
      const result = await settlementService.getSupplierSettlements(supplierId, { page, limit, status });
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error fetching supplier settlements:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch settlements' });
    }
  });

  /**
   * GET /settlements/kpi
   * WO-O4O-SETTLEMENT-ENGINE-V1: 정산 KPI (대시보드용)
   * NOTE: /kpi must be registered BEFORE /:id
   */
  router.get('/settlements/kpi', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const result = await settlementService.getSupplierKpi(supplierId);
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error fetching settlement KPI:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch settlement KPI' });
    }
  });

  /**
   * GET /settlements/:id
   * WO-O4O-SETTLEMENT-ENGINE-V1: 공급자 정산 상세 (연결된 주문 포함)
   */
  router.get('/settlements/:id', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const settlementId = req.params.id;

      if (!UUID_REGEX.test(settlementId)) {
        return res.status(400).json({ success: false, error: 'INVALID_ID', message: 'Invalid settlement ID format' });
      }

      const result = await settlementService.getSupplierSettlementDetail(settlementId, supplierId);
      if (!result) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Settlement not found' });
      }
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error fetching settlement detail:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch settlement detail' });
    }
  });

  return router;
}
