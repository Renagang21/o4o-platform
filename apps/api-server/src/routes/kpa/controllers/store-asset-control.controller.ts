/**
 * KPA Store Asset Control Controller
 *
 * WO-KPA-A-ASSET-CONTROL-EXTENSION-V1: publish status
 * WO-KPA-A-ASSET-CONTROL-EXTENSION-V2: channel_map, forced restrictions
 * WO-O4O-SNAPSHOT-POLICY-MIGRATION-V1: snapshot_type, lifecycle_status
 *
 * Extension layer for asset operational control.
 * Core(o4o_asset_snapshots) is FROZEN — this controller manages
 * KPA-specific publish status and channel mapping via kpa_store_asset_controls.
 *
 * Endpoints:
 *   GET   /store-assets                     — Joined snapshot + control list (paginated)
 *   PATCH /store-assets/:id/publish         — Update publish_status (blocked if forced)
 *   PATCH /store-assets/:id/channel         — Update channel_map (blocked if forced)
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { KpaMember } from '../entities/kpa-member.entity.js';
import { KpaStoreAssetControl } from '../entities/kpa-store-asset-control.entity.js';
import type { AssetPublishStatus, ChannelMap } from '../entities/kpa-store-asset-control.entity.js';
import type { AuthRequest } from '../../../types/auth.js';

type AuthMiddleware = import('express').RequestHandler;

const VALID_STATUSES: AssetPublishStatus[] = ['draft', 'published', 'hidden'];

async function resolveOrgId(
  dataSource: DataSource,
  userId: string,
): Promise<string | null> {
  const memberRepo = dataSource.getRepository(KpaMember);
  const member = await memberRepo.findOne({ where: { user_id: userId } });
  return member?.organization_id || null;
}

export function createStoreAssetControlController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();

  /**
   * GET /store-assets
   *
   * Returns asset snapshots LEFT JOINed with kpa_store_asset_controls.
   * Items without a control row get publish_status = 'draft' (default).
   * V2: includes channel_map, is_forced, forced period, is_locked fields.
   *
   * Query params: ?type=cms|signage  &page=1  &limit=20
   */
  router.get(
    '/',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        if (!userId) {
          res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
          return;
        }

        const organizationId = await resolveOrgId(dataSource, userId);
        if (!organizationId) {
          res.json({
            success: true,
            data: { items: [], total: 0, page: 1, limit: 20 },
          });
          return;
        }

        const assetType = req.query.type as string | undefined;
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
        const offset = (page - 1) * limit;

        let typeFilter = '';
        const params: any[] = [organizationId, limit, offset];
        if (assetType && ['cms', 'signage'].includes(assetType)) {
          typeFilter = `AND s.asset_type = $4`;
          params.push(assetType);
        }

        const countQuery = `
          SELECT COUNT(*)::int as total
          FROM o4o_asset_snapshots s
          WHERE s.organization_id = $1
          ${assetType && ['cms', 'signage'].includes(assetType) ? `AND s.asset_type = $2` : ''}
        `;
        const countParams = assetType && ['cms', 'signage'].includes(assetType)
          ? [organizationId, assetType]
          : [organizationId];

        const dataQuery = `
          SELECT
            s.id,
            s.organization_id AS "organizationId",
            s.source_service AS "sourceService",
            s.source_asset_id AS "sourceAssetId",
            s.asset_type AS "assetType",
            s.title,
            s.created_by AS "createdBy",
            s.created_at AS "createdAt",
            COALESCE(c.publish_status, 'draft') AS "publishStatus",
            c.id AS "controlId",
            c.updated_at AS "controlUpdatedAt",
            COALESCE(c.channel_map, '{}')::jsonb AS "channelMap",
            COALESCE(c.is_forced, false) AS "isForced",
            c.forced_by_admin_id AS "forcedByAdminId",
            c.forced_start_at AS "forcedStartAt",
            c.forced_end_at AS "forcedEndAt",
            COALESCE(c.is_locked, false) AS "isLocked",
            COALESCE(c.snapshot_type, 'user_copy') AS "snapshotType",
            COALESCE(c.lifecycle_status, 'active') AS "lifecycleStatus"
          FROM o4o_asset_snapshots s
          LEFT JOIN kpa_store_asset_controls c
            ON c.snapshot_id = s.id AND c.organization_id = s.organization_id
          WHERE s.organization_id = $1
          ${typeFilter}
          ORDER BY
            COALESCE(c.is_forced, false) DESC,
            s.created_at DESC
          LIMIT $2 OFFSET $3
        `;

        const [countResult, items] = await Promise.all([
          dataSource.query(countQuery, countParams),
          dataSource.query(dataQuery, params),
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
   * PATCH /store-assets/:snapshotId/publish
   *
   * Upsert publish_status for a snapshot.
   * V2: Blocked if is_forced=true (store user cannot change forced items).
   * Body: { status: 'draft' | 'published' | 'hidden' }
   */
  router.patch(
    '/:snapshotId/publish',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        if (!userId) {
          res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
          return;
        }

        const organizationId = await resolveOrgId(dataSource, userId);
        if (!organizationId) {
          res.status(403).json({
            success: false,
            error: { code: 'NO_ORGANIZATION', message: 'User has no KPA organization membership' },
          });
          return;
        }

        const { snapshotId } = req.params;
        const { status } = req.body as { status?: string };

        if (!status || !VALID_STATUSES.includes(status as AssetPublishStatus)) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `status must be one of: ${VALID_STATUSES.join(', ')}`,
            },
          });
          return;
        }

        // Verify snapshot belongs to user's organization
        const snapshotCheck = await dataSource.query(
          `SELECT id FROM o4o_asset_snapshots WHERE id = $1 AND organization_id = $2`,
          [snapshotId, organizationId],
        );

        if (!snapshotCheck.length) {
          res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Asset snapshot not found in your organization' },
          });
          return;
        }

        // V2: Check forced restriction
        const controlRepo = dataSource.getRepository(KpaStoreAssetControl);
        let control = await controlRepo.findOne({
          where: { snapshot_id: snapshotId, organization_id: organizationId },
        });

        if (control?.is_forced) {
          res.status(403).json({
            success: false,
            error: {
              code: 'FORCED_ASSET_LOCKED',
              message: 'This asset is forced by admin and cannot be modified by store users',
            },
          });
          return;
        }

        // Upsert control row
        if (control) {
          control.publish_status = status as AssetPublishStatus;
          control = await controlRepo.save(control);
        } else {
          control = controlRepo.create({
            snapshot_id: snapshotId,
            organization_id: organizationId,
            publish_status: status as AssetPublishStatus,
          });
          control = await controlRepo.save(control);
        }

        res.json({
          success: true,
          data: {
            snapshotId,
            publishStatus: control.publish_status,
            updatedAt: control.updated_at,
          },
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
   * PATCH /store-assets/:snapshotId/channel
   *
   * V2: Update channel_map for a snapshot.
   * Blocked if is_forced=true.
   * Body: { channelMap: { "b2c_home": true, "signage": false } }
   */
  router.patch(
    '/:snapshotId/channel',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        if (!userId) {
          res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
          return;
        }

        const organizationId = await resolveOrgId(dataSource, userId);
        if (!organizationId) {
          res.status(403).json({
            success: false,
            error: { code: 'NO_ORGANIZATION', message: 'User has no KPA organization membership' },
          });
          return;
        }

        const { snapshotId } = req.params;
        const { channelMap } = req.body as { channelMap?: ChannelMap };

        if (!channelMap || typeof channelMap !== 'object') {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'channelMap must be an object' },
          });
          return;
        }

        // Verify snapshot
        const snapshotCheck = await dataSource.query(
          `SELECT id FROM o4o_asset_snapshots WHERE id = $1 AND organization_id = $2`,
          [snapshotId, organizationId],
        );
        if (!snapshotCheck.length) {
          res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Asset snapshot not found in your organization' },
          });
          return;
        }

        const controlRepo = dataSource.getRepository(KpaStoreAssetControl);
        let control = await controlRepo.findOne({
          where: { snapshot_id: snapshotId, organization_id: organizationId },
        });

        if (control?.is_forced) {
          res.status(403).json({
            success: false,
            error: {
              code: 'FORCED_ASSET_LOCKED',
              message: 'This asset is forced by admin and cannot be modified by store users',
            },
          });
          return;
        }

        if (control) {
          control.channel_map = channelMap;
          control = await controlRepo.save(control);
        } else {
          control = controlRepo.create({
            snapshot_id: snapshotId,
            organization_id: organizationId,
            channel_map: channelMap,
          });
          control = await controlRepo.save(control);
        }

        res.json({
          success: true,
          data: {
            snapshotId,
            channelMap: control.channel_map,
            updatedAt: control.updated_at,
          },
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
