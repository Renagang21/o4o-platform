/**
 * Neture Tier1 JSON Test Center
 *
 * WO-NETURE-TIER1-PUBLIC-JSON-TEST-CENTER-V1
 * WO-O4O-PRODUCT-MASTER-CORE-RESET-V1: SupplierProductOffer 구조 반영
 *
 * Admin-only test endpoints for verifying PUBLIC offer
 * approval → auto-expand → listing → supplier cascade flow.
 * NOT for production use.
 *
 * All endpoints: requireAuth + requireNetureScope('neture:admin')
 */

import { Router } from 'express';
import type { Request, Response, RequestHandler, Router as ExpressRouter } from 'express';
import type { DataSource } from 'typeorm';
import logger from '../../../utils/logger.js';
import type { NetureService } from '../neture.service.js';
import { SupplierStatus, OfferDistributionType } from '../entities/index.js';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    role: string;
  };
};

interface Tier1TestDeps {
  dataSource: DataSource;
  requireAuth: RequestHandler;
  requireNetureScope: (scope: string) => RequestHandler;
  netureService: NetureService;
}

export function createNeureTier1TestController(deps: Tier1TestDeps): ExpressRouter {
  const router: ExpressRouter = Router();
  const { dataSource, requireAuth, requireNetureScope, netureService } = deps;
  const adminGuard = requireNetureScope('neture:admin');

  // ============================================================================
  // POST /__test__/tier1/create — Create test PUBLIC offer (requires existing master)
  // ============================================================================
  router.post('/__test__/tier1/create', requireAuth, adminGuard, async (req: Request, res: Response) => {
    try {
      const adminUserId = (req as AuthenticatedRequest).user?.id;
      if (!adminUserId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
      }

      // Resolve supplierId: prefer body param, else find first ACTIVE supplier
      let supplierId: string = req.body?.supplierId;
      if (!supplierId) {
        const rows = await dataSource.query(
          `SELECT id FROM neture_suppliers WHERE status = $1 ORDER BY created_at ASC LIMIT 1`,
          [SupplierStatus.ACTIVE],
        );
        if (!rows || rows.length === 0) {
          return res.status(422).json({
            success: false,
            error: { code: 'NO_ACTIVE_SUPPLIER', message: 'No ACTIVE supplier found' },
          });
        }
        supplierId = rows[0].id;
      }

      const barcode = req.body?.barcode;
      if (!barcode) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_BARCODE', message: 'barcode is required' },
        });
      }

      const result = await netureService.createSupplierOffer(supplierId, {
        barcode,
        manualData: req.body?.manualData,
        distributionType: OfferDistributionType.PUBLIC,
      });

      if (!result.success) {
        return res.status(400).json({ success: false, error: { code: result.error } });
      }

      logger.info(`[Tier1Test] Created test offer ${result.data?.id} via ${adminUserId}`);
      return res.status(201).json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Tier1Test] Error creating test offer:', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
  });

  // ============================================================================
  // POST /__test__/tier1/approve/:offerId — Approve and verify auto-expand
  // ============================================================================
  router.post('/__test__/tier1/approve/:offerId', requireAuth, adminGuard, async (req: Request, res: Response) => {
    try {
      const adminUserId = (req as AuthenticatedRequest).user?.id;
      if (!adminUserId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
      }

      const { offerId } = req.params;
      const result = await netureService.approveProduct(offerId, adminUserId);

      if (!result.success) {
        const status = result.error === 'PRODUCT_NOT_FOUND' ? 404 : 400;
        return res.status(status).json({ success: false, error: { code: result.error } });
      }

      // Post-approve listing verification
      const listingStats = await dataSource.query(
        `SELECT
           COUNT(*)::int AS total_listings,
           COUNT(DISTINCT organization_id)::int AS active_org_count
         FROM organization_product_listings
         WHERE offer_id = $1`,
        [offerId],
      );

      logger.info(`[Tier1Test] Approved offer ${offerId}, listings: ${listingStats[0]?.total_listings}`);

      return res.json({
        success: true,
        data: {
          approvalStatus: result.data?.approvalStatus,
          listingCount: listingStats[0]?.total_listings ?? 0,
          activeOrgCount: listingStats[0]?.active_org_count ?? 0,
          autoListedCount: result.data?.autoListedCount,
        },
      });
    } catch (error) {
      logger.error('[Tier1Test] Error approving test offer:', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
  });

  // ============================================================================
  // GET /__test__/tier1/listings/:offerId — Check listing state
  // ============================================================================
  router.get('/__test__/tier1/listings/:offerId', requireAuth, adminGuard, async (req: Request, res: Response) => {
    try {
      const { offerId } = req.params;

      const rows = await dataSource.query(
        `SELECT
           id,
           organization_id,
           service_key,
           is_active,
           created_at
         FROM organization_product_listings
         WHERE offer_id = $1
         ORDER BY created_at ASC`,
        [offerId],
      );

      const activeListings = rows.filter((r: { is_active: boolean }) => r.is_active).length;

      return res.json({
        success: true,
        data: {
          totalListings: rows.length,
          activeListings,
          listings: rows,
        },
      });
    } catch (error) {
      logger.error('[Tier1Test] Error fetching listings:', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
  });

  // ============================================================================
  // POST /__test__/tier1/supplier-deactivate/:supplierId — Deactivate + verify cascade
  // ============================================================================
  router.post('/__test__/tier1/supplier-deactivate/:supplierId', requireAuth, adminGuard, async (req: Request, res: Response) => {
    try {
      const adminUserId = (req as AuthenticatedRequest).user?.id;
      if (!adminUserId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
      }

      const { supplierId } = req.params;
      const result = await netureService.deactivateSupplier(supplierId, adminUserId);

      if (!result.success) {
        const status = result.error === 'SUPPLIER_NOT_FOUND' ? 404 : 400;
        return res.status(status).json({ success: false, error: { code: result.error } });
      }

      // Post-deactivate verification
      const [approvalStats] = await dataSource.query(
        `SELECT COUNT(*)::int AS revoked_count
         FROM product_approvals pa
         JOIN supplier_product_offers spo ON spo.id = pa.offer_id
         WHERE spo.supplier_id = $1 AND pa.approval_status = 'revoked'`,
        [supplierId],
      );

      const [listingStats] = await dataSource.query(
        `SELECT COUNT(*)::int AS disabled_count
         FROM organization_product_listings opl
         JOIN supplier_product_offers spo ON spo.id = opl.offer_id
         WHERE spo.supplier_id = $1 AND opl.is_active = false`,
        [supplierId],
      );

      logger.info(`[Tier1Test] Deactivated supplier ${supplierId} via ${adminUserId}`);

      return res.json({
        success: true,
        data: {
          ...result.data,
          revokedApprovals: approvalStats?.revoked_count ?? 0,
          listingsDisabled: listingStats?.disabled_count ?? 0,
        },
      });
    } catch (error) {
      logger.error('[Tier1Test] Error deactivating test supplier:', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
  });

  // ============================================================================
  // GET /__test__/tier1/hub-kpi/:offerId — Hub KPI snapshot for one offer
  // ============================================================================
  router.get('/__test__/tier1/hub-kpi/:offerId', requireAuth, adminGuard, async (req: Request, res: Response) => {
    try {
      const { offerId } = req.params;

      const [listingStat] = await dataSource.query(
        `SELECT COUNT(*)::int AS listing_count
         FROM organization_product_listings
         WHERE offer_id = $1`,
        [offerId],
      );

      const [orgStat] = await dataSource.query(
        `SELECT COUNT(DISTINCT organization_id)::int AS active_orgs
         FROM organization_product_listings
         WHERE offer_id = $1`,
        [offerId],
      );

      const [publicStat] = await dataSource.query(
        `SELECT COUNT(*)::int AS public_offer_count
         FROM supplier_product_offers
         WHERE distribution_type = 'PUBLIC' AND approval_status = 'APPROVED'`,
      );

      return res.json({
        success: true,
        data: {
          offerId,
          publicOfferCount: publicStat?.public_offer_count ?? 0,
          listingCount: listingStat?.listing_count ?? 0,
          activeOrgs: orgStat?.active_orgs ?? 0,
        },
      });
    } catch (error) {
      logger.error('[Tier1Test] Error fetching hub KPI:', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
  });

  return router;
}
