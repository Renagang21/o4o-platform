/**
 * AdminSettlementController — WO-O4O-ROUTES-REFACTOR-V1
 * Extracted from neture.routes.ts
 *
 * Routes (mounted at /admin prefix in thin router):
 *
 * === Admin Settlements (WO-O4O-SETTLEMENT-ENGINE-V1) ===
 *   POST   /settlements/calculate       — 정산 일괄 생성
 *   PATCH  /settlements/:id/status      — 정산 취소 (cancelled only)
 *   GET    /settlements                 — 운영자 정산 목록
 *   GET    /settlements/kpi             — 운영자 정산 KPI
 *   GET    /settlements/:id             — 운영자 정산 상세
 *   PATCH  /settlements/:id/approve     — 운영자 정산 승인
 *   PATCH  /settlements/:id/pay         — 운영자 정산 지급
 *
 * (은퇴) Admin Commissions · Partner settlements · admin partner monitoring
 *   — WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1
 */
import { Router } from 'express';
import type { Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../../middleware/neture-scope.middleware.js';
import type { AuthenticatedRequest } from '../middleware/neture-identity.middleware.js';
import { NetureSettlementService } from '../services/neture-settlement.service.js';
import logger from '../../../utils/logger.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createAdminSettlementController(dataSource: DataSource): Router {
  const router = Router();
  const settlementService = new NetureSettlementService(dataSource);

  const adminGuard = requireNetureScope('neture:admin');

  // ==================== Admin Settlement Management (WO-O4O-SETTLEMENT-ENGINE-V1) ====================

  /**
   * POST /settlements/calculate
   * WO-O4O-SETTLEMENT-ENGINE-V1: 정산 일괄 생성 (관리자)
   *
   * Body: { period_start: 'YYYY-MM-DD', period_end: 'YYYY-MM-DD' }
   */
  router.post('/settlements/calculate', requireAuth, adminGuard, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { period_start, period_end } = req.body;

      if (!period_start || !period_end) {
        return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'period_start and period_end are required (YYYY-MM-DD)' });
      }
      const startDate = new Date(period_start);
      const endDate = new Date(period_end);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Invalid date format. Use YYYY-MM-DD.' });
      }
      if (startDate >= endDate) {
        return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'period_start must be before period_end' });
      }

      const result = await settlementService.calculateSettlements(period_start, period_end);
      res.json(result);
    } catch (error: any) {
      if (error?.code === '23505') {
        return res.status(409).json({ success: false, error: 'DUPLICATE_SETTLEMENT', message: 'A settlement already exists for one or more suppliers in this period.' });
      }
      logger.error('[Neture API] Error calculating settlements:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to calculate settlements' });
    }
  });

  /**
   * PATCH /settlements/:id/status
   * WO-O4O-SETTLEMENT-ENGINE-OPERATOR-REFACTOR-V1: 정산 취소 (관리자)
   *
   * Body: { status: 'cancelled', notes?: string }
   * calculated 또는 approved 상태에서 취소 가능
   */
  router.patch('/settlements/:id/status', requireAuth, adminGuard, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const settlementId = req.params.id;
      const { status, notes } = req.body;

      if (!status || status !== 'cancelled') {
        return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'This endpoint only supports "cancelled" status. Use /approve or /pay for transitions.' });
      }

      const result = await settlementService.cancelSettlement(settlementId, notes);
      if (!result) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Settlement not found or not in cancellable status' });
      }
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error cancelling settlement:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to cancel settlement' });
    }
  });

  // ==================== Admin Settlement Management (WO-O4O-SETTLEMENT-ENGINE-OPERATOR-REFACTOR-V1) ====================

  /**
   * GET /settlements
   * 운영자 정산 목록 (페이지네이션 + 상태 필터 + 공급자명)
   */
  router.get('/settlements', requireAuth, adminGuard, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const status = req.query.status as string | undefined;
      const result = await settlementService.getAdminSettlements({ page, limit, status });
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error fetching admin settlements:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch admin settlements' });
    }
  });

  /**
   * GET /settlements/kpi
   * 운영자 정산 KPI (calculated/approved/paid 건수 + 금액)
   * NOTE: /kpi must be registered BEFORE /:id
   */
  router.get('/settlements/kpi', requireAuth, adminGuard, async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await settlementService.getAdminKpi();
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error fetching admin settlement KPI:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch admin settlement KPI' });
    }
  });

  /**
   * GET /settlements/:id
   * 운영자 정산 상세 (공급자명 + 연결 주문)
   */
  router.get('/settlements/:id', requireAuth, adminGuard, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const settlementId = req.params.id;
      if (!UUID_REGEX.test(settlementId)) {
        return res.status(400).json({ success: false, error: 'INVALID_ID', message: 'Invalid settlement ID format' });
      }

      const result = await settlementService.getAdminSettlementDetail(settlementId);
      if (!result) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Settlement not found' });
      }
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error fetching admin settlement detail:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch admin settlement detail' });
    }
  });

  /**
   * PATCH /settlements/:id/approve
   * 운영자 정산 승인 (calculated → approved)
   */
  router.patch('/settlements/:id/approve', requireAuth, adminGuard, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const settlementId = req.params.id;
      const { notes } = req.body;
      const result = await settlementService.approveSettlement(settlementId, notes);
      if (!result) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Settlement not found or not in "calculated" status' });
      }
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error approving settlement:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to approve settlement' });
    }
  });

  /**
   * PATCH /settlements/:id/pay
   * 운영자 정산 지급 처리 (approved → paid)
   */
  router.patch('/settlements/:id/pay', requireAuth, adminGuard, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const settlementId = req.params.id;
      const { notes } = req.body;
      const result = await settlementService.paySettlement(settlementId, notes);
      if (!result) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Settlement not found or not in "approved" status' });
      }
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error paying settlement:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to pay settlement' });
    }
  });

  return router;
}
