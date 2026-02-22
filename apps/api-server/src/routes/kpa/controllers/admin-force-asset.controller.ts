/**
 * Admin Force Asset Controller
 *
 * WO-KPA-A-ASSET-CONTROL-EXTENSION-V2
 * WO-O4O-SNAPSHOT-POLICY-MIGRATION-V1: snapshot_type auto-set
 *
 * Admin-only endpoints for forced asset injection.
 * Admin can:
 *   - Force-publish an asset to a target organization
 *   - Set exposure period (start/end)
 *   - Lock asset to prevent store-level modification
 *   - Update period on forced asset
 *   - Remove forced status
 *
 * Endpoints:
 *   GET    /admin/force-assets               — List all forced assets (admin view)
 *   POST   /admin/force-assets               — Force-inject asset
 *   PATCH  /admin/force-assets/:controlId    — Update forced asset period/channel
 *   DELETE /admin/force-assets/:controlId    — Remove forced status (unlock)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { KpaStoreAssetControl } from '../entities/kpa-store-asset-control.entity.js';
import type { ChannelMap, SnapshotType } from '../entities/kpa-store-asset-control.entity.js';
import type { AuthRequest } from '../../../types/auth.js';

type AuthMiddleware = RequestHandler;
type ScopeMiddleware = (scope: string) => RequestHandler;

export function createAdminForceAssetController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  requireScope: ScopeMiddleware,
): Router {
  const router = Router();
  const adminGuard = [requireAuth, requireScope('kpa:admin')];

  /**
   * GET /admin/force-assets
   *
   * List all forced asset controls across all organizations.
   * Query: ?organizationId=UUID  &page=1  &limit=20
   */
  router.get(
    '/',
    ...adminGuard,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const orgFilter = req.query.organizationId as string | undefined;
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
        const offset = (page - 1) * limit;

        let whereClause = `WHERE c.is_forced = true`;
        const params: any[] = [limit, offset];
        if (orgFilter) {
          whereClause += ` AND c.organization_id = $3`;
          params.push(orgFilter);
        }

        const countQuery = `
          SELECT COUNT(*)::int as total
          FROM kpa_store_asset_controls c
          ${whereClause.replace('$3', orgFilter ? `$1` : '')}
        `.replace('$1', orgFilter ? `$1` : '');

        // Simpler approach: use separate count query
        const countParams = orgFilter ? [orgFilter] : [];
        const countSql = orgFilter
          ? `SELECT COUNT(*)::int as total FROM kpa_store_asset_controls WHERE is_forced = true AND organization_id = $1`
          : `SELECT COUNT(*)::int as total FROM kpa_store_asset_controls WHERE is_forced = true`;

        const dataSql = orgFilter
          ? `
            SELECT
              c.id AS "controlId",
              c.snapshot_id AS "snapshotId",
              c.organization_id AS "organizationId",
              c.publish_status AS "publishStatus",
              c.channel_map AS "channelMap",
              c.is_forced AS "isForced",
              c.forced_by_admin_id AS "forcedByAdminId",
              c.forced_start_at AS "forcedStartAt",
              c.forced_end_at AS "forcedEndAt",
              c.is_locked AS "isLocked",
              c.snapshot_type AS "snapshotType",
              c.lifecycle_status AS "lifecycleStatus",
              c.created_at AS "createdAt",
              c.updated_at AS "updatedAt",
              s.title AS "snapshotTitle",
              s.asset_type AS "assetType",
              s.source_service AS "sourceService",
              o.name AS "organizationName"
            FROM kpa_store_asset_controls c
            LEFT JOIN o4o_asset_snapshots s ON s.id = c.snapshot_id
            LEFT JOIN organizations o ON o.id = c.organization_id
            WHERE c.is_forced = true AND c.organization_id = $3
            ORDER BY c.created_at DESC
            LIMIT $1 OFFSET $2
          `
          : `
            SELECT
              c.id AS "controlId",
              c.snapshot_id AS "snapshotId",
              c.organization_id AS "organizationId",
              c.publish_status AS "publishStatus",
              c.channel_map AS "channelMap",
              c.is_forced AS "isForced",
              c.forced_by_admin_id AS "forcedByAdminId",
              c.forced_start_at AS "forcedStartAt",
              c.forced_end_at AS "forcedEndAt",
              c.is_locked AS "isLocked",
              c.snapshot_type AS "snapshotType",
              c.lifecycle_status AS "lifecycleStatus",
              c.created_at AS "createdAt",
              c.updated_at AS "updatedAt",
              s.title AS "snapshotTitle",
              s.asset_type AS "assetType",
              s.source_service AS "sourceService",
              o.name AS "organizationName"
            FROM kpa_store_asset_controls c
            LEFT JOIN o4o_asset_snapshots s ON s.id = c.snapshot_id
            LEFT JOIN organizations o ON o.id = c.organization_id
            WHERE c.is_forced = true
            ORDER BY c.created_at DESC
            LIMIT $1 OFFSET $2
          `;

        const dataParams = orgFilter ? [limit, offset, orgFilter] : [limit, offset];

        const [countResult, items] = await Promise.all([
          dataSource.query(countSql, countParams),
          dataSource.query(dataSql, dataParams),
        ]);

        const total = countResult[0]?.total || 0;

        res.json({
          success: true,
          data: { items, total, page, limit },
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    },
  );

  /**
   * POST /admin/force-assets
   *
   * Force-inject an asset into an organization.
   * Creates or updates a control row with is_forced=true.
   *
   * Body: {
   *   snapshotId: UUID,
   *   organizationId: UUID,
   *   channelMap?: { ... },
   *   forcedStartAt?: ISO string,
   *   forcedEndAt?: ISO string
   * }
   */
  router.post(
    '/',
    ...adminGuard,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const adminUserId = authReq.user?.id;

        const { snapshotId, organizationId, channelMap, forcedStartAt, forcedEndAt } = req.body as {
          snapshotId?: string;
          organizationId?: string;
          channelMap?: ChannelMap;
          forcedStartAt?: string;
          forcedEndAt?: string;
        };

        if (!snapshotId || !organizationId) {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'snapshotId and organizationId are required' },
          });
          return;
        }

        // Verify snapshot exists
        const snapshotCheck = await dataSource.query(
          `SELECT id FROM o4o_asset_snapshots WHERE id = $1`,
          [snapshotId],
        );
        if (!snapshotCheck.length) {
          res.status(404).json({
            success: false,
            error: { code: 'SNAPSHOT_NOT_FOUND', message: 'Asset snapshot not found' },
          });
          return;
        }

        // Verify organization exists
        const orgCheck = await dataSource.query(
          `SELECT id FROM organizations WHERE id = $1`,
          [organizationId],
        );
        if (!orgCheck.length) {
          res.status(404).json({
            success: false,
            error: { code: 'ORG_NOT_FOUND', message: 'Organization not found' },
          });
          return;
        }

        const controlRepo = dataSource.getRepository(KpaStoreAssetControl);
        let control = await controlRepo.findOne({
          where: { snapshot_id: snapshotId, organization_id: organizationId },
        });

        if (control) {
          control.is_forced = true;
          control.is_locked = true;
          control.publish_status = 'published';
          control.snapshot_type = 'hq_forced';
          control.lifecycle_status = 'active';
          control.forced_by_admin_id = adminUserId || null;
          control.forced_start_at = forcedStartAt ? new Date(forcedStartAt) : null;
          control.forced_end_at = forcedEndAt ? new Date(forcedEndAt) : null;
          if (channelMap) control.channel_map = channelMap;
          control = await controlRepo.save(control);
        } else {
          control = controlRepo.create({
            snapshot_id: snapshotId,
            organization_id: organizationId,
            publish_status: 'published',
            snapshot_type: 'hq_forced' as SnapshotType,
            lifecycle_status: 'active',
            is_forced: true,
            is_locked: true,
            forced_by_admin_id: adminUserId || null,
            forced_start_at: forcedStartAt ? new Date(forcedStartAt) : null,
            forced_end_at: forcedEndAt ? new Date(forcedEndAt) : null,
            channel_map: channelMap || {},
          });
          control = await controlRepo.save(control);
        }

        res.status(201).json({
          success: true,
          data: control,
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    },
  );

  /**
   * PATCH /admin/force-assets/:controlId
   *
   * Update forced asset period or channel.
   * Body: { forcedStartAt?, forcedEndAt?, channelMap?, publishStatus? }
   */
  router.patch(
    '/:controlId',
    ...adminGuard,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { controlId } = req.params;
        const { forcedStartAt, forcedEndAt, channelMap, publishStatus } = req.body as {
          forcedStartAt?: string | null;
          forcedEndAt?: string | null;
          channelMap?: ChannelMap;
          publishStatus?: string;
        };

        const controlRepo = dataSource.getRepository(KpaStoreAssetControl);
        const control = await controlRepo.findOne({ where: { id: controlId } });

        if (!control) {
          res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Control record not found' },
          });
          return;
        }

        if (!control.is_forced) {
          res.status(400).json({
            success: false,
            error: { code: 'NOT_FORCED', message: 'This control is not a forced asset' },
          });
          return;
        }

        if (forcedStartAt !== undefined) {
          control.forced_start_at = forcedStartAt ? new Date(forcedStartAt) : null;
        }
        if (forcedEndAt !== undefined) {
          control.forced_end_at = forcedEndAt ? new Date(forcedEndAt) : null;
        }
        if (channelMap) {
          control.channel_map = channelMap;
        }
        if (publishStatus && ['draft', 'published', 'hidden'].includes(publishStatus)) {
          control.publish_status = publishStatus as any;
        }

        const updated = await controlRepo.save(control);

        res.json({ success: true, data: updated });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    },
  );

  /**
   * DELETE /admin/force-assets/:controlId
   *
   * Remove forced status from a control row.
   * Does NOT delete the control row — just sets is_forced=false, is_locked=false.
   */
  router.delete(
    '/:controlId',
    ...adminGuard,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { controlId } = req.params;

        const controlRepo = dataSource.getRepository(KpaStoreAssetControl);
        const control = await controlRepo.findOne({ where: { id: controlId } });

        if (!control) {
          res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Control record not found' },
          });
          return;
        }

        control.is_forced = false;
        control.is_locked = false;
        control.snapshot_type = 'user_copy';
        control.forced_by_admin_id = null;
        control.forced_start_at = null;
        control.forced_end_at = null;
        // Keep current publish_status — store user can now change it

        const updated = await controlRepo.save(control);

        res.json({
          success: true,
          data: updated,
          message: 'Forced status removed. Store user can now modify this asset.',
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    },
  );

  return router;
}
