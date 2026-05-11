/**
 * Asset Copy Controller Factory
 *
 * WO-O4O-ASSET-COPY-CORE-EXTRACTION-V1
 *
 * Creates a standard Express Router with POST /copy and GET / endpoints.
 * Each service provides config (roles, resolver, orgId resolver).
 * Core handles the rest — auth, validation, pagination, error handling.
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { AssetCopyService } from '../services/asset-copy.service.js';
import type { AssetCopyControllerConfig } from '../interfaces/controller-config.interface.js';
import type { PermissionChecker } from '../interfaces/permission-checker.interface.js';

type AuthMiddleware = RequestHandler;

/**
 * Create an asset copy controller for a specific service.
 *
 * @example
 * // In KPA routes:
 * router.use('/assets', createAssetCopyController(
 *   dataSource,
 *   requireAuth,
 *   {
 *     allowedRoles: ['kpa:admin', 'kpa:operator'],
 *     sourceService: 'kpa',
 *     resolver: new KpaAssetResolver(dataSource),
 *     resolveOrgId: async (ds, userId) => { ... },
 *   },
 * ));
 */
export function createAssetCopyController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  config: AssetCopyControllerConfig,
): Router {
  const router = Router();
  const service = new AssetCopyService(dataSource, config.permissionChecker);
  const {
    allowedRoles,
    sourceService,
    resolver,
    resolveOrgId,
    noOrgErrorCode = 'NO_ORGANIZATION',
    noOrgMessage = 'User has no organization membership',
    // WO-O4O-LMS-STORE-LIBRARY-FOUNDATION-V1: 기본은 cms/signage, 서비스가 lesson 등을 추가 가능.
    allowedAssetTypes = ['cms', 'signage'],
  } = config;
  const allowedAssetTypesMessage = allowedAssetTypes.join(' or ');

  /**
   * POST /copy
   * Body: { sourceAssetId, assetType }
   * sourceService and targetOrganizationId are resolved by config.
   */
  router.post('/copy', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user?.id) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      // Role guard
      const userRoles = user.roles || [];
      if (!service.checkPermission(userRoles, allowedRoles)) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Insufficient role' },
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

      if (!allowedAssetTypes.includes(assetType)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ASSET_TYPE', message: `assetType must be ${allowedAssetTypesMessage}` },
        });
        return;
      }

      // Resolve organization from user
      const orgId = await resolveOrgId(dataSource, user.id);
      if (!orgId) {
        res.status(403).json({
          success: false,
          error: { code: noOrgErrorCode, message: noOrgMessage },
        });
        return;
      }

      const result = await service.copyWithResolver(
        {
          sourceService,
          sourceAssetId,
          assetType,
          targetOrganizationId: orgId,
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
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to copy asset' },
      });
    }
  });

  /**
   * GET /
   * Query: ?type=cms|signage&page=1&limit=20
   * Returns snapshots for user's organization
   */
  router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user?.id) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      // Role guard
      const userRoles = user.roles || [];
      if (!service.checkPermission(userRoles, allowedRoles)) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Insufficient role' },
        });
        return;
      }

      const orgId = await resolveOrgId(dataSource, user.id);
      if (!orgId) {
        res.status(403).json({
          success: false,
          error: { code: noOrgErrorCode, message: noOrgMessage },
        });
        return;
      }

      const assetType = req.query.type as string | undefined;
      if (assetType && !allowedAssetTypes.includes(assetType)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ASSET_TYPE', message: `type must be ${allowedAssetTypesMessage}` },
        });
        return;
      }

      // Pagination + search (WO-O4O-STORE-LIBRARY-SERVER-PAGINATION-V1)
      // default limit = 20, max limit = 50, search = title 기준 partial match
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const rawSearch = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      const search = rawSearch.length > 0 ? rawSearch.slice(0, 200) : undefined;

      const result = await service.listByOrganization(orgId, { assetType, page, limit, search });
      res.json({ success: true, data: result });
    } catch {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list assets' },
      });
    }
  });

  /**
   * DELETE /:id
   * Deletes the snapshot owned by the authenticated user's organization.
   * 404 if not found or not owned by this org.
   */
  router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user?.id) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const userRoles = user.roles || [];
      if (!service.checkPermission(userRoles, allowedRoles)) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
        return;
      }

      const orgId = await resolveOrgId(dataSource, user.id);
      if (!orgId) {
        res.status(403).json({ success: false, error: { code: noOrgErrorCode, message: noOrgMessage } });
        return;
      }

      const { id } = req.params;
      await service.deleteById(id, orgId);
      res.json({ success: true, data: { deleted: true, id } });
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Snapshot not found' } });
        return;
      }
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete snapshot' } });
    }
  });

  return router;
}
