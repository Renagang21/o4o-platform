/**
 * PartnerRecruitmentController — WO-O4O-NETURE-PARTNER-CONTROLLER-SPLIT-V1
 * Extracted from partner.controller.ts
 *
 * Routes:
 *   GET  /partner/recruiting-products
 *   GET  /partner/recruitments
 *   POST /partner/applications
 *   POST /partner/applications/:id/approve
 *   POST /partner/applications/:id/reject
 */
import { Router } from 'express';
import type { Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../middleware/neture-identity.middleware.js';
import type { NetureService } from '../neture.service.js';
import { GlycopharmRepository } from '../../../routes/glycopharm/repositories/glycopharm.repository.js';
import { RecruitmentStatus } from '../entities/index.js';
import logger from '../../../utils/logger.js';

export function createPartnerRecruitmentController(deps: {
  dataSource: DataSource;
  netureService: NetureService;
  requireActiveSupplier: RequestHandler;
}): Router {
  const router = Router();
  const { dataSource, netureService, requireActiveSupplier } = deps;

  // ==================== Recruiting Products (WO-PARTNER-RECRUIT-PHASE1-V1) ====================

  /**
   * GET /partner/recruiting-products
   * Get products marked for partner recruiting (public, no auth)
   */
  router.get('/partner/recruiting-products', async (_req: Request, res: Response) => {
    try {
      const glycopharmRepo = new GlycopharmRepository(dataSource);
      const products = await glycopharmRepo.findPartnerRecruitingProducts();

      const data = products.map((p) => ({
        id: p.id,
        pharmacy_id: p.pharmacy_id,
        pharmacy_name: p.pharmacy?.name,
        name: p.name,
        sku: p.sku,
        category: p.category,
        price: Number(p.price),
        sale_price: p.sale_price ? Number(p.sale_price) : undefined,
        stock_quantity: p.stock_quantity,
        status: p.status,
        is_featured: p.is_featured,
        is_partner_recruiting: p.is_partner_recruiting,
        created_at: p.created_at.toISOString(),
      }));

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('[Neture API] Error fetching recruiting products:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch recruiting products',
      });
    }
  });

  // ==================== Partner Recruitment API (WO-O4O-PARTNER-RECRUITMENT-API-IMPLEMENTATION-V1) ====================

  /**
   * GET /partner/recruitments
   * 파트너 모집 목록 조회 (public)
   */
  router.get('/partner/recruitments', async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      const filters: { status?: RecruitmentStatus } = {};
      if (status && typeof status === 'string') {
        filters.status = status as RecruitmentStatus;
      }

      const data = await netureService.getPartnerRecruitments(filters);
      res.json({ success: true, data });
    } catch (error) {
      logger.error('[Neture API] Error fetching partner recruitments:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch partner recruitments' });
    }
  });

  /**
   * POST /partner/applications
   * 파트너 신청 (requires auth)
   */
  router.post('/partner/applications', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const { recruitmentId } = req.body;
      if (!recruitmentId) {
        return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'recruitmentId is required' });
      }

      const partnerName = req.user?.name || '';
      const result = await netureService.createPartnerApplication(recruitmentId, userId, partnerName);

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'RECRUITMENT_NOT_FOUND') {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '모집 공고를 찾을 수 없습니다.' });
      }
      if (msg === 'RECRUITMENT_CLOSED') {
        return res.status(400).json({ success: false, error: 'RECRUITMENT_CLOSED', message: '마감된 모집입니다.' });
      }
      if (msg === 'DUPLICATE_APPLICATION') {
        return res.status(409).json({ success: false, error: 'DUPLICATE_APPLICATION', message: '이미 신청한 모집입니다.' });
      }
      logger.error('[Neture API] Error creating partner application:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to create application' });
    }
  });

  /**
   * POST /partner/applications/:id/approve
   * 파트너 신청 승인 (모집 주체 판매자)
   */
  router.post('/partner/applications/:id/approve', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const { id } = req.params;
      const result = await netureService.approvePartnerApplication(id, userId);

      res.json({ success: true, data: result });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'APPLICATION_NOT_FOUND') {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '신청을 찾을 수 없습니다.' });
      }
      if (msg === 'INVALID_STATUS') {
        return res.status(400).json({ success: false, error: 'INVALID_STATUS', message: '승인/거절 가능한 상태가 아닙니다.' });
      }
      if (msg === 'NOT_RECRUITMENT_OWNER') {
        return res.status(403).json({ success: false, error: 'FORBIDDEN', message: '모집 주체만 승인할 수 있습니다.' });
      }
      if (msg === 'ACTIVE_CONTRACT_EXISTS') {
        return res.status(409).json({ success: false, error: 'CONFLICT', message: '이미 활성 계약이 존재합니다.' });
      }
      logger.error('[Neture API] Error approving partner application:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to approve application' });
    }
  });

  /**
   * POST /partner/applications/:id/reject
   * 파트너 신청 거절 (모집 주체 판매자)
   */
  router.post('/partner/applications/:id/reject', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const { id } = req.params;
      const { reason } = req.body;
      const result = await netureService.rejectPartnerApplication(id, userId, reason);

      res.json({ success: true, data: result });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'APPLICATION_NOT_FOUND') {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '신청을 찾을 수 없습니다.' });
      }
      if (msg === 'INVALID_STATUS') {
        return res.status(400).json({ success: false, error: 'INVALID_STATUS', message: '승인/거절 가능한 상태가 아닙니다.' });
      }
      if (msg === 'NOT_RECRUITMENT_OWNER') {
        return res.status(403).json({ success: false, error: 'FORBIDDEN', message: '모집 주체만 거절할 수 있습니다.' });
      }
      logger.error('[Neture API] Error rejecting partner application:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to reject application' });
    }
  });

  return router;
}
