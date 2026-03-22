/**
 * PartnerCommerceController — WO-O4O-NETURE-PARTNER-CONTROLLER-SPLIT-V1
 * Extracted from partner.controller.ts
 *
 * Routes:
 *   GET  /partner/contracts
 *   POST /partner/contracts/:id/terminate
 *   GET  /partner/commissions/kpi
 *   GET  /partner/commissions
 *   GET  /partner/commissions/:id
 *   GET  /partner/product-pool
 *   POST /partner/referral-links
 *   GET  /partner/referral-links
 *   GET  /partner/settlements
 *   GET  /partner/settlements/:id
 */
import crypto from 'node:crypto';
import { Router } from 'express';
import type { Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import type { PartnerRequest, AuthenticatedRequest } from '../middleware/neture-identity.middleware.js';
import type { PartnerService } from '../services/partner.service.js';
import type { PartnerCommissionService } from '../services/partner-commission.service.js';
import type { NetureService } from '../neture.service.js';
import logger from '../../../utils/logger.js';

export function createPartnerCommerceController(deps: {
  dataSource: DataSource;
  netureService: NetureService;
  partnerService: PartnerService;
  commissionService: PartnerCommissionService;
  requireActivePartner: RequestHandler;
  requireLinkedPartner: RequestHandler;
}): Router {
  const router = Router();
  const { dataSource, netureService, partnerService, commissionService, requireActivePartner, requireLinkedPartner } = deps;

  // ==================== Partner Contracts ====================

  /**
   * GET /partner/contracts
   * Partner 계약 목록 조회
   * Query: ?status=active|terminated|expired
   */
  router.get('/partner/contracts', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const { status } = req.query;
      const contracts = await netureService.getPartnerContracts(userId, status as string | undefined);
      res.json({ success: true, data: contracts });
    } catch (error) {
      logger.error('[Neture API] Error fetching partner contracts:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch contracts' });
    }
  });

  /**
   * POST /partner/contracts/:id/terminate
   * Partner가 계약 해지
   */
  router.post('/partner/contracts/:id/terminate', requireAuth, requireActivePartner, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const { id } = req.params;
      const result = await netureService.terminateContract(id, userId, 'partner');
      res.json({ success: true, data: result });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'CONTRACT_NOT_FOUND') {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '계약을 찾을 수 없습니다.' });
      }
      if (msg === 'CONTRACT_NOT_ACTIVE') {
        return res.status(400).json({ success: false, error: 'INVALID_STATUS', message: '활성 상태의 계약만 해지할 수 있습니다.' });
      }
      logger.error('[Neture API] Error terminating contract (partner):', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to terminate contract' });
    }
  });

  // ==================== Partner Commission Engine (WO-O4O-PARTNER-COMMISSION-ENGINE-V1) ====================

  /**
   * GET /partner/commissions/kpi
   * 파트너 커미션 KPI (대시보드용)
   * NOTE: /kpi must be registered BEFORE /:id
   */
  router.get('/partner/commissions/kpi', requireAuth, requireLinkedPartner, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const partnerId = (req as PartnerRequest).partnerId;
      const result = await commissionService.getPartnerKpi(partnerId);
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error fetching partner commission KPI:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch partner commission KPI' });
    }
  });

  /**
   * GET /partner/commissions
   * 파트너 커미션 목록 (페이지네이션 + 상태 필터)
   */
  router.get('/partner/commissions', requireAuth, requireLinkedPartner, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const partnerId = (req as PartnerRequest).partnerId;
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const status = req.query.status as string | undefined;
      const result = await commissionService.getPartnerCommissions(partnerId, { page, limit, status });
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error fetching partner commissions:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch partner commissions' });
    }
  });

  /**
   * GET /partner/commissions/:id
   * 파트너 커미션 상세 (연결 주문 항목 포함)
   */
  router.get('/partner/commissions/:id', requireAuth, requireLinkedPartner, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const partnerId = (req as PartnerRequest).partnerId;
      const commissionId = req.params.id;

      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(commissionId)) {
        return res.status(400).json({ success: false, error: 'INVALID_ID', message: 'Invalid commission ID format' });
      }

      const result = await commissionService.getPartnerCommissionDetail(commissionId, partnerId);
      if (!result) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Commission not found' });
      }
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error fetching partner commission detail:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch partner commission detail' });
    }
  });

  // ==================== Partner Affiliate (WO-O4O-PARTNER-HUB-CORE-V1) ====================

  /**
   * GET /partner/product-pool
   * 커미션 정책이 설정된 제품 목록 (파트너 홍보 가능 제품)
   */
  router.get('/partner/product-pool', requireAuth, requireLinkedPartner as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rows = await partnerService.getProductPool();
      res.json({ success: true, data: rows });
    } catch (error) {
      logger.error('[Neture API] Error fetching product pool:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * POST /partner/referral-links
   * Affiliate 링크 생성
   */
  router.post('/partner/referral-links', requireAuth, requireActivePartner as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const partnerId = (req as PartnerRequest).partnerId;
      const { product_id } = req.body;

      if (!product_id) {
        return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'product_id required' });
      }

      // V2: Resolve offer → supplier_id + slugs
      const offer = await partnerService.resolveOfferForReferral(product_id);

      if (!offer) {
        return res.status(404).json({ success: false, error: 'PRODUCT_NOT_FOUND' });
      }

      const buildUrl = (token: string) =>
        `/store/${offer.store_slug}/product/${offer.product_slug}?ref=${token}`;

      // Check if referral already exists for this (partner, product)
      const existing = await partnerService.findExistingReferral(partnerId, product_id);

      if (existing) {
        return res.json({ success: true, data: { referral_url: buildUrl(existing.referral_token), referral_token: existing.referral_token, product_id } });
      }

      // Generate unique 8-char token
      const referralToken = crypto.randomBytes(4).toString('hex');

      // V2: store_id = supplier_id (자동)
      await partnerService.createReferral(partnerId, offer.supplier_id, product_id, referralToken);

      res.status(201).json({ success: true, data: { referral_url: buildUrl(referralToken), referral_token: referralToken, product_id } });
    } catch (error: any) {
      // Handle token collision (retry once)
      if (error?.code === '23505') {
        try {
          const retryToken = crypto.randomBytes(5).toString('hex').slice(0, 8);
          const partnerId = (req as PartnerRequest).partnerId;
          const { product_id } = req.body;

          const [retryOffer] = await dataSource.query(
            `SELECT spo.slug AS product_slug, spo.supplier_id, ns.slug AS store_slug
             FROM supplier_product_offers spo
             JOIN neture_suppliers ns ON ns.id = spo.supplier_id
             WHERE spo.id = $1`,
            [product_id],
          );

          await dataSource.query(
            `INSERT INTO partner_referrals (partner_id, store_id, product_id, referral_token) VALUES ($1, $2, $3, $4)`,
            [partnerId, retryOffer?.supplier_id || null, product_id, retryToken],
          );

          const referralUrl = retryOffer
            ? `/store/${retryOffer.store_slug}/product/${retryOffer.product_slug}?ref=${retryToken}`
            : `/store/product/${product_id}?ref=${retryToken}`;
          return res.status(201).json({ success: true, data: { referral_url: referralUrl, referral_token: retryToken, product_id } });
        } catch (retryErr) {
          logger.error('[Neture API] Referral link creation retry failed:', retryErr);
        }
      }
      logger.error('[Neture API] Error creating referral link:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * GET /partner/referral-links
   * 파트너의 referral 링크 목록
   */
  router.get('/partner/referral-links', requireAuth, requireLinkedPartner as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const partnerId = (req as PartnerRequest).partnerId;
      const data = await partnerService.getReferralLinks(partnerId);
      res.json({ success: true, data });
    } catch (error) {
      logger.error('[Neture API] Error fetching referral links:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  // ==================== Partner Settlements (WO-O4O-PARTNER-COMMISSION-SETTLEMENT-V1) ====================

  /**
   * GET /partner/settlements
   * 파트너 본인 정산 목록
   */
  router.get('/partner/settlements', requireAuth, requireLinkedPartner, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const partnerId = (req as PartnerRequest).partnerId;
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

      const { settlements, total } = await partnerService.getPartnerSettlements(partnerId, page, limit);

      res.json({
        success: true,
        data: settlements,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      logger.error('[Neture API] Error fetching partner settlements:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch partner settlements' });
    }
  });

  /**
   * GET /partner/settlements/:id
   * 파트너 정산 상세
   */
  router.get('/partner/settlements/:id', requireAuth, requireLinkedPartner, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const partnerId = (req as PartnerRequest).partnerId;
      const settlementId = req.params.id;

      const result = await partnerService.getPartnerSettlementDetail(settlementId, partnerId);

      if (!result) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Settlement not found' });
      }

      res.json({
        success: true,
        data: { ...result.settlement, items: result.items },
      });
    } catch (error) {
      logger.error('[Neture API] Error fetching partner settlement detail:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch partner settlement detail' });
    }
  });

  return router;
}
