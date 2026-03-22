/**
 * AdminPartnerController — WO-O4O-NETURE-PARTNER-CONTROLLER-SPLIT-V1
 * Extracted from partner.controller.ts
 *
 * Routes:
 *   GET  /admin/partners
 *   GET  /admin/partners/:id
 *   POST /admin/partner-settlements
 *   POST /admin/partner-settlements/:id/pay
 *   GET  /admin/partner-settlements
 *   GET  /admin/partner-settlements/:id
 */
import { Router } from 'express';
import type { Response } from 'express';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../../middleware/neture-scope.middleware.js';
import type { AuthenticatedRequest } from '../middleware/neture-identity.middleware.js';
import type { PartnerService } from '../services/partner.service.js';
import logger from '../../../utils/logger.js';

export function createAdminPartnerController(deps: {
  partnerService: PartnerService;
}): Router {
  const router = Router();
  const { partnerService } = deps;

  // ==================== Admin Partner Monitoring (WO-O4O-ADMIN-PARTNER-MONITORING-V1) ====================

  /**
   * GET /admin/partners
   * Admin 파트너 모니터링 — 파트너 목록 + 통계
   */
  router.get('/admin/partners', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const search = (req.query.search as string || '').trim();

      const { partners, total, kpi } = await partnerService.getAdminPartnerList(page, limit, search);

      res.json({
        success: true,
        data: partners,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        kpi,
      });
    } catch (error) {
      logger.error('[Neture API] Error fetching admin partners:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch partners' });
    }
  });

  /**
   * GET /admin/partners/:id
   * Admin 파트너 상세 + 최근 커미션
   */
  router.get('/admin/partners/:id', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const partnerId = req.params.id;
      const result = await partnerService.getAdminPartnerDetail(partnerId);

      if (!result) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Partner not found' });
      }

      res.json({
        success: true,
        data: { ...result.summary, commissions: result.commissions },
      });
    } catch (error) {
      logger.error('[Neture API] Error fetching admin partner detail:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch partner detail' });
    }
  });

  // ==================== Admin Partner Settlements (WO-O4O-PARTNER-COMMISSION-SETTLEMENT-V1) ====================

  /**
   * POST /admin/partner-settlements
   * approved 커미션으로 정산 배치 생성
   */
  router.post('/admin/partner-settlements', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { partner_id } = req.body;

      if (!partner_id) {
        return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'partner_id is required' });
      }

      const { settlement, itemCount } = await partnerService.createAdminSettlement(partner_id);

      res.status(201).json({
        success: true,
        data: {
          ...settlement,
          item_count: itemCount,
        },
      });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'NO_PAYABLE') {
        return res.status(400).json({ success: false, error: 'NO_PAYABLE', message: 'No approved commissions available for settlement' });
      }
      logger.error('[Neture API] Error creating partner settlement:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to create partner settlement' });
    }
  });

  /**
   * POST /admin/partner-settlements/:id/pay
   * 정산 지급 완료 처리
   */
  router.post('/admin/partner-settlements/:id/pay', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const settlementId = req.params.id;
      const result = await partnerService.payAdminSettlement(settlementId);
      res.json({ success: true, data: result });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'NOT_FOUND') {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Settlement not found' });
      }
      if (msg === 'ALREADY_PAID') {
        return res.status(400).json({ success: false, error: 'ALREADY_PAID', message: 'Settlement already paid' });
      }
      logger.error('[Neture API] Error paying partner settlement:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to pay partner settlement' });
    }
  });

  /**
   * GET /admin/partner-settlements
   * Admin 파트너 정산 목록
   */
  router.get('/admin/partner-settlements', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const status = req.query.status as string | undefined;

      const { settlements, total } = await partnerService.getAdminSettlementList(page, limit, status);

      res.json({
        success: true,
        data: settlements,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      logger.error('[Neture API] Error fetching admin partner settlements:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch partner settlements' });
    }
  });

  /**
   * GET /admin/partner-settlements/:id
   * Admin 파트너 정산 상세
   */
  router.get('/admin/partner-settlements/:id', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const settlementId = req.params.id;
      const result = await partnerService.getAdminSettlementDetail(settlementId);

      if (!result) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Settlement not found' });
      }

      res.json({
        success: true,
        data: { ...result.settlement, items: result.items },
      });
    } catch (error) {
      logger.error('[Neture API] Error fetching admin partner settlement detail:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch partner settlement detail' });
    }
  });

  return router;
}
