/**
 * Neture Tier1 JSON Test Center
 *
 * WO-NETURE-TIER1-PUBLIC-JSON-TEST-CENTER-V1
 *
 * Admin-only test endpoints for verifying PUBLIC product
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
import { SupplierStatus, DistributionType } from '../entities/index.js';

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
  // POST /__test__/tier1/create — Create test PUBLIC product
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

      const testName = req.body?.name || `[TEST] PUBLIC Product ${Date.now()}`;

      const result = await netureService.createSupplierProduct(supplierId, {
        name: testName,
        category: 'test',
        description: 'Tier1 JSON Test Center auto-created product',
        distributionType: DistributionType.PUBLIC,
        acceptsApplications: false,
      });

      if (!result.success) {
        return res.status(400).json({ success: false, error: { code: result.error } });
      }

      logger.info(`[Tier1Test] Created test product ${result.data?.id} via ${adminUserId}`);
      return res.status(201).json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Tier1Test] Error creating test product:', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
  });

  // ============================================================================
  // POST /__test__/tier1/approve/:productId — Approve and verify auto-expand
  // ============================================================================
  router.post('/__test__/tier1/approve/:productId', requireAuth, adminGuard, async (req: Request, res: Response) => {
    try {
      const adminUserId = (req as AuthenticatedRequest).user?.id;
      if (!adminUserId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
      }

      const { productId } = req.params;
      const result = await netureService.approveProduct(productId, adminUserId);

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
         WHERE product_id = $1`,
        [productId],
      );

      logger.info(`[Tier1Test] Approved product ${productId}, listings: ${listingStats[0]?.total_listings}`);

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
      logger.error('[Tier1Test] Error approving test product:', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
  });

  // ============================================================================
  // GET /__test__/tier1/listings/:productId — Check listing state
  // ============================================================================
  router.get('/__test__/tier1/listings/:productId', requireAuth, adminGuard, async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;

      const rows = await dataSource.query(
        `SELECT
           id,
           organization_id,
           service_key,
           product_name,
           is_active,
           created_at
         FROM organization_product_listings
         WHERE product_id = $1
         ORDER BY created_at ASC`,
        [productId],
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
         JOIN neture_supplier_products nsp ON nsp.id = pa.product_id
         WHERE nsp.supplier_id = $1 AND pa.approval_status = 'revoked'`,
        [supplierId],
      );

      const [listingStats] = await dataSource.query(
        `SELECT COUNT(*)::int AS disabled_count
         FROM organization_product_listings opl
         JOIN neture_supplier_products nsp ON nsp.id = opl.product_id
         WHERE nsp.supplier_id = $1 AND opl.is_active = false`,
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
  // GET /__test__/tier1/hub-kpi/:productId — Hub KPI snapshot for one product
  // ============================================================================
  router.get('/__test__/tier1/hub-kpi/:productId', requireAuth, adminGuard, async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;

      // PUBLIC listing count for this product
      const [listingStat] = await dataSource.query(
        `SELECT COUNT(*)::int AS listing_count
         FROM organization_product_listings
         WHERE product_id = $1`,
        [productId],
      );

      // How many distinct orgs have this product (any listing)
      const [orgStat] = await dataSource.query(
        `SELECT COUNT(DISTINCT organization_id)::int AS active_orgs
         FROM organization_product_listings
         WHERE product_id = $1`,
        [productId],
      );

      // Total PUBLIC products in neture_supplier_products (simple KPI counter)
      const [publicStat] = await dataSource.query(
        `SELECT COUNT(*)::int AS public_product_count
         FROM neture_supplier_products
         WHERE distribution_type = 'PUBLIC' AND approval_status = 'APPROVED'`,
      );

      return res.json({
        success: true,
        data: {
          productId,
          publicProductCount: publicStat?.public_product_count ?? 0,
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
