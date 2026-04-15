/**
 * Market Trial Operator Routes
 *
 * WO-O4O-MARKET-TRIAL-PHASE1-V1
 *
 * 1차 승인 (Neture operator):
 *   GET/PATCH /api/v1/neture/operator/market-trial/*
 *
 * 2차 승인 (Service operator):
 *   GET/PATCH /api/v1/:serviceKey/operator/market-trial/*
 */

import { Router } from 'express';
import { Response } from 'express';
import { AuthRequest } from '../types/auth.js';
import { MarketTrialOperatorController } from '../controllers/market-trial/marketTrialOperatorController.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireNetureScope } from '../middleware/neture-scope.middleware.js';

/**
 * Neture operator 1차 승인 라우터
 * Mount: /api/v1/neture/operator/market-trial
 */
export function createNetureOperatorTrialRoutes(): Router {
  const router = Router();

  // All routes require auth + neture operator scope
  router.use(requireAuth as any);
  router.use(requireNetureScope('neture:operator') as any);

  router.get('/', MarketTrialOperatorController.listAll);
  // WO-MARKET-TRIAL-PRODUCT-LINK-SEARCH-UI-V1: 상품 검색 (전환 모달용)
  router.get('/products/search', async (req: AuthRequest, res: Response) => {
    try {
      const ds = (MarketTrialOperatorController as any).dataSource;
      if (!ds) return res.status(500).json({ success: false, message: 'DataSource not initialized' });

      const keyword = (req.query.keyword as string)?.trim() || '';
      const supplierUserId = req.query.supplierUserId as string | undefined;
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
      const offset = (page - 1) * limit;

      const conditions: string[] = ['spo.deleted_at IS NULL'];
      const params: unknown[] = [];
      let idx = 1;

      if (keyword) {
        conditions.push(`(COALESCE(pm.marketing_name, pm.regulatory_name, '') ILIKE $${idx})`);
        params.push(`%${keyword}%`);
        idx++;
      }
      if (supplierUserId) {
        conditions.push(`ns.user_id = $${idx}`);
        params.push(supplierUserId);
        idx++;
      }

      const where = conditions.join(' AND ');

      const [countRows, rows]: [Array<{ total: number }>, Array<{
        id: string; name: string; supplierName: string;
        categoryName: string; regulatoryType: string; isActive: boolean; createdAt: string;
      }>] = await Promise.all([
        ds.query(
          `SELECT COUNT(*)::int AS total
           FROM supplier_product_offers spo
           JOIN product_masters pm ON pm.id = spo.master_id
           LEFT JOIN neture_suppliers ns ON ns.id = spo.supplier_id
           WHERE ${where}`,
          params,
        ),
        ds.query(
          `SELECT
             spo.id,
             COALESCE(pm.marketing_name, pm.regulatory_name, '') AS name,
             COALESCE(o.name, '') AS "supplierName",
             COALESCE(pc.name, '') AS "categoryName",
             COALESCE(pm.regulatory_type, '') AS "regulatoryType",
             spo.is_active AS "isActive",
             spo.created_at AS "createdAt"
           FROM supplier_product_offers spo
           JOIN product_masters pm ON pm.id = spo.master_id
           LEFT JOIN neture_suppliers ns ON ns.id = spo.supplier_id
           LEFT JOIN organizations o ON o.id = ns.organization_id
           LEFT JOIN product_categories pc ON pc.id = pm.category_id
           WHERE ${where}
           ORDER BY spo.created_at DESC
           LIMIT $${idx} OFFSET $${idx + 1}`,
          [...params, limit, offset],
        ),
      ]);

      res.json({
        success: true,
        data: rows,
        meta: { total: countRows[0]?.total ?? 0, page, limit },
      });
    } catch (error) {
      console.error('Product search error:', error);
      res.status(500).json({ success: false, message: 'Failed to search products' });
    }
  });
  router.get('/:id', MarketTrialOperatorController.getDetail);
  // WO-MARKET-TRIAL-OPERATIONS-CONSOLIDATION-V1
  router.get('/:id/funnel', MarketTrialOperatorController.getFunnel);
  router.get('/:id/participants', MarketTrialOperatorController.listParticipants);
  router.get('/:id/participants/export', MarketTrialOperatorController.exportParticipantsCSV);
  // WO-MARKET-TRIAL-SETTLEMENT-AND-FULFILLMENT-MANAGEMENT-V1
  router.patch('/:id/participants/:participantId/reward-status', MarketTrialOperatorController.updateParticipantRewardStatus);
  // WO-MARKET-TRIAL-PARTICIPANT-TO-CUSTOMER-FLOW-V1
  router.patch('/:id/participants/:participantId/conversion', MarketTrialOperatorController.updateParticipantConversionStatus);
  // WO-MARKET-TRIAL-LISTING-AUTOLINK-V1
  router.post('/:id/participants/:participantId/listing', MarketTrialOperatorController.createListingFromParticipant);
  router.patch('/:id/status', MarketTrialOperatorController.updateTrialStatus);
  router.patch('/:id/approve', MarketTrialOperatorController.approve1st);
  router.patch('/:id/reject', MarketTrialOperatorController.reject1st);
  // WO-MARKET-TRIAL-TO-PRODUCT-CONVERSION-FLOW-V1
  router.post('/:id/convert', MarketTrialOperatorController.convertToProduct);

  return router;
}

/**
 * Service operator 2차 승인 라우터
 * Mount: /api/v1/:serviceKey/operator/market-trial
 *
 * serviceKey는 상위 라우터에서 이미 파싱됨 (req.params.serviceKey)
 * 인증: requireAuth만 적용. 서비스별 scope 체크는 컨트롤러에서 생략 (Phase 1 간소화).
 */
export function createServiceOperatorTrialRoutes(): Router {
  const router = Router({ mergeParams: true });

  router.use(requireAuth as any);

  router.get('/', MarketTrialOperatorController.listForService);
  router.get('/:id', MarketTrialOperatorController.getDetailForService);
  router.patch('/:id/approve', MarketTrialOperatorController.approve2nd);
  router.patch('/:id/reject', MarketTrialOperatorController.reject2nd);

  return router;
}
