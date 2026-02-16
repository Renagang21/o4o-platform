/**
 * Neture Asset Snapshot Controller
 *
 * WO-O4O-ASSET-COPY-NETURE-PILOT-V1 Phase 2
 *
 * POST /assets/copy    — Copy Neture CMS/Signage asset → snapshot
 * GET  /assets         — List supplier's asset snapshots (paginated)
 *
 * Auth: requireAuth + neture operator role + supplier membership
 *
 * Uses AssetResolver pattern — controller calls resolver,
 * delegates to shared AssetSnapshotService.
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { AssetSnapshotService } from '../../asset-snapshot/asset-snapshot.service.js';
import { NetureAssetResolver } from '../../asset-snapshot/resolvers/neture-asset.resolver.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { hasAnyServiceRole } from '../../../utils/role.utils.js';
import type { NetureRole } from '../../../types/roles.js';

type AuthMiddleware = RequestHandler;

/**
 * Neture roles allowed to copy/list assets
 * neture:admin — full access
 * neture:supplier — supplier-level access
 */
const NETURE_ASSET_ROLES: NetureRole[] = ['neture:admin', 'neture:supplier'];

/**
 * Get supplier ID linked to the authenticated user
 */
async function getSupplierIdForUser(
  dataSource: DataSource,
  userId: string,
): Promise<string | null> {
  // Check neture_suppliers table for user linkage
  const rows = await dataSource.query(
    `SELECT "id" FROM "neture_suppliers" WHERE "userId" = $1 AND "status" = 'ACTIVE' LIMIT 1`,
    [userId],
  );
  if (rows && rows.length > 0) {
    return rows[0].id;
  }
  return null;
}

export function createNetureAssetSnapshotController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();
  const service = new AssetSnapshotService(dataSource);
  const resolver = new NetureAssetResolver(dataSource);

  /**
   * POST /assets/copy
   * Body: { sourceAssetId, assetType }
   * sourceService is always 'neture'
   * targetOrganizationId resolved from user's supplier membership
   */
  router.post('/copy', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.id) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    // Role guard
    const userRoles = user.roles || [];
    if (!hasAnyServiceRole(userRoles, NETURE_ASSET_ROLES)) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Neture admin or supplier role required' },
      });
      return;
    }

    const { sourceAssetId, assetType } = req.body;

    if (!sourceAssetId || !assetType) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'sourceAssetId and assetType are required' },
      });
      return;
    }

    if (!['cms', 'signage'].includes(assetType)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ASSET_TYPE', message: 'assetType must be cms or signage' },
      });
      return;
    }

    // Resolve supplier (= organization context) from user
    const supplierId = await getSupplierIdForUser(dataSource, user.id);
    if (!supplierId) {
      res.status(403).json({
        success: false,
        error: { code: 'NO_SUPPLIER', message: 'User has no active Neture supplier membership' },
      });
      return;
    }

    try {
      const result = await service.copyWithResolver(
        {
          sourceService: 'neture',
          sourceAssetId,
          assetType,
          targetOrganizationId: supplierId,
          createdBy: user.id,
        },
        resolver,
      );

      res.status(201).json({ success: true, data: result.snapshot });
    } catch (err: any) {
      if (err.message === 'SOURCE_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: { code: 'SOURCE_NOT_FOUND', message: 'Source asset not found' },
        });
        return;
      }
      if (err.message === 'DUPLICATE_SNAPSHOT') {
        res.status(409).json({
          success: false,
          error: { code: 'DUPLICATE_SNAPSHOT', message: 'This asset has already been copied' },
        });
        return;
      }
      throw err;
    }
  }));

  /**
   * GET /assets
   * Query: ?type=cms|signage&page=1&limit=20
   * Returns snapshots for user's supplier
   */
  router.get('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.id) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    // Role guard
    const userRoles = user.roles || [];
    if (!hasAnyServiceRole(userRoles, NETURE_ASSET_ROLES)) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Neture admin or supplier role required' },
      });
      return;
    }

    const supplierId = await getSupplierIdForUser(dataSource, user.id);
    if (!supplierId) {
      res.status(403).json({
        success: false,
        error: { code: 'NO_SUPPLIER', message: 'User has no active Neture supplier membership' },
      });
      return;
    }

    const assetType = req.query.type as 'cms' | 'signage' | undefined;
    if (assetType && !['cms', 'signage'].includes(assetType)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ASSET_TYPE', message: 'type must be cms or signage' },
      });
      return;
    }

    // Pagination
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    const result = await service.listByOrganization(supplierId, { assetType, page, limit });
    res.json({ success: true, data: result });
  }));

  return router;
}
