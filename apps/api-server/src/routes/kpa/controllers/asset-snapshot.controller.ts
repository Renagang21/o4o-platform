/**
 * Asset Snapshot Controller
 *
 * WO-KPA-A-ASSET-COPY-ENGINE-PILOT-V1
 * WO-KPA-A-ASSET-COPY-STABILIZATION-V1 (role guard + pagination)
 *
 * POST /assets/copy    — Copy source CMS/Signage asset → snapshot
 * GET  /assets         — List store's asset snapshots (paginated)
 *
 * Auth: requireAuth + operator role + KPA membership check
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { AssetSnapshotService } from '../../../modules/asset-snapshot/asset-snapshot.service.js';
import { KpaMember } from '../entities/kpa-member.entity.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { hasAnyServiceRole } from '../../../utils/role.utils.js';
import type { KpaRole } from '../../../types/roles.js';

type AuthMiddleware = RequestHandler;

const OPERATOR_ROLES: KpaRole[] = ['kpa:admin', 'kpa:operator', 'kpa:branch_admin', 'kpa:branch_operator'];

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

    // Role guard: kpa:operator 이상만 허용
    const userRoles = user.roles || [];
    if (!hasAnyServiceRole(userRoles, OPERATOR_ROLES)) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Operator or admin role required' },
      });
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

    // Role guard: kpa:operator 이상만 허용
    const userRoles = user.roles || [];
    if (!hasAnyServiceRole(userRoles, OPERATOR_ROLES)) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Operator or admin role required' },
      });
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

    const result = await service.listByOrganization(orgId, { assetType, page, limit });
    res.json({ success: true, data: result });
  }));

  return router;
}
