/**
 * Asset Snapshot Controller
 *
 * WO-KPA-A-ASSET-COPY-ENGINE-PILOT-V1
 *
 * POST /assets/copy    — Copy source CMS/Signage asset → snapshot
 * GET  /assets         — List store's asset snapshots
 *
 * Auth: requireAuth + KPA membership check (pharmacist org context)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { AssetSnapshotService } from '../../../modules/asset-snapshot/asset-snapshot.service.js';
import { KpaMember } from '../entities/kpa-member.entity.js';
import { asyncHandler } from '../../../middleware/error-handler.js';

type AuthMiddleware = RequestHandler;

/**
 * Get user's organization ID from KPA membership
 */
async function getUserOrganizationId(
  dataSource: DataSource,
  userId: string,
): Promise<string | null> {
  const memberRepo = dataSource.getRepository(KpaMember);
  const member = await memberRepo.findOne({
    where: { user_id: userId },
  });
  return member?.organization_id || null;
}

export function createAssetSnapshotController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();
  const service = new AssetSnapshotService(dataSource);

  /**
   * POST /assets/copy
   * Body: { sourceService, sourceAssetId, assetType }
   * targetOrganizationId is resolved from user's KPA membership
   */
  router.post('/copy', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.id) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    const { sourceService, sourceAssetId, assetType } = req.body;

    // Validate required fields
    if (!sourceService || !sourceAssetId || !assetType) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'sourceService, sourceAssetId, assetType are required' },
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

    // Resolve organization from user's KPA membership
    const orgId = await getUserOrganizationId(dataSource, user.id);
    if (!orgId) {
      res.status(403).json({
        success: false,
        error: { code: 'NO_ORGANIZATION', message: 'User has no KPA organization membership' },
      });
      return;
    }

    try {
      const result = await service.copyAsset({
        sourceService,
        sourceAssetId,
        assetType,
        targetOrganizationId: orgId,
        createdBy: user.id,
      });

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
          error: { code: 'DUPLICATE_SNAPSHOT', message: 'This asset has already been copied to your store' },
        });
        return;
      }
      throw err;
    }
  }));

  /**
   * GET /assets
   * Query: ?assetType=cms|signage (optional)
   * Returns snapshots for user's organization
   */
  router.get('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.id) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    const orgId = await getUserOrganizationId(dataSource, user.id);
    if (!orgId) {
      res.status(403).json({
        success: false,
        error: { code: 'NO_ORGANIZATION', message: 'User has no KPA organization membership' },
      });
      return;
    }

    const assetType = req.query.assetType as 'cms' | 'signage' | undefined;
    if (assetType && !['cms', 'signage'].includes(assetType)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ASSET_TYPE', message: 'assetType must be cms or signage' },
      });
      return;
    }

    const snapshots = await service.listByOrganization(orgId, assetType);
    res.json({ success: true, data: snapshots });
  }));

  return router;
}
