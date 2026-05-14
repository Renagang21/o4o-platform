/**
 * KPA Store Asset Control Controller
 *
 * WO-KPA-A-ASSET-CONTROL-EXTENSION-V1: publish status
 * WO-KPA-A-ASSET-CONTROL-EXTENSION-V2: channel_map, forced restrictions
 * WO-O4O-SNAPSHOT-POLICY-MIGRATION-V1: snapshot_type, lifecycle_status
 * WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1: type=lesson 필터 허용
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
import { KpaMember } from '../../kpa/entities/kpa-member.entity.js';
import { KpaStoreAssetControl } from '../../kpa/entities/kpa-store-asset-control.entity.js';
import type { AssetPublishStatus, ChannelMap } from '../../kpa/entities/kpa-store-asset-control.entity.js';
import type { AuthRequest } from '../../../types/auth.js';
import { isStoreOwner } from '../../../utils/store-owner.utils.js';

type AuthMiddleware = import('express').RequestHandler;

const VALID_STATUSES: AssetPublishStatus[] = ['draft', 'published', 'hidden'];

// store-library-feed.controller 와 동일한 dual resolution:
// role_assignments(isStoreOwner) 우선 → KpaMember fallback.
// 두 컨트롤러가 동일한 organizationId를 사용해야 snapshot scope 정합이 유지된다.
async function resolveOrgId(
  dataSource: DataSource,
  userId: string,
): Promise<string | null> {
  const { organizationId: orgFromRa } = await isStoreOwner(dataSource, userId, 'kpa');
  if (orgFromRa) return orgFromRa;
  const member = await dataSource.getRepository(KpaMember).findOne({ where: { user_id: userId } });
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
            data: { items: [], total: 0, page: 1, limit: 20, totalPages: 1 },
          });
          return;
        }

        const assetType = req.query.type as string | undefined;
        // WO-O4O-STORE-LIBRARY-SERVER-PAGINATION-V1
        //   - default limit=20, max limit=50
        //   - search: title ILIKE partial match
        //   - VALID_TYPES 에 content/resource 추가, 가상 'document' 타입 = cms+content 통합
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
        const offset = (page - 1) * limit;
        const rawSearch = typeof req.query.search === 'string' ? req.query.search.trim() : '';
        const search = rawSearch.length > 0 ? rawSearch.slice(0, 200) : undefined;

        const SINGLE_TYPES = ['cms', 'signage', 'lesson', 'content', 'resource'];
        // 'document' 는 가상 타입 — 프론트의 "문서형 콘텐츠" 섹션이 cms+content 를 합쳐서 조회한다.
        const isDocumentVirtualType = assetType === 'document';
        const isSingleType = !!assetType && SINGLE_TYPES.includes(assetType);

        // Bind 순서 고정: $1=org, $2=limit, $3=offset, [$4=assetType], [$next=search]
        let typeFilter = '';
        const dataParams: any[] = [organizationId, limit, offset];
        if (isSingleType) {
          typeFilter = `AND s.asset_type = $${dataParams.length + 1}`;
          dataParams.push(assetType);
        } else if (isDocumentVirtualType) {
          typeFilter = `AND s.asset_type IN ('cms', 'content')`;
        }
        let searchFilter = '';
        if (search) {
          searchFilter = `AND s.title ILIKE $${dataParams.length + 1}`;
          dataParams.push(`%${search}%`);
        }

        const countParams: any[] = [organizationId];
        let countTypeFilter = '';
        if (isSingleType) {
          countTypeFilter = `AND s.asset_type = $${countParams.length + 1}`;
          countParams.push(assetType);
        } else if (isDocumentVirtualType) {
          countTypeFilter = `AND s.asset_type IN ('cms', 'content')`;
        }
        let countSearchFilter = '';
        if (search) {
          countSearchFilter = `AND s.title ILIKE $${countParams.length + 1}`;
          countParams.push(`%${search}%`);
        }

        const countQuery = `
          SELECT COUNT(*)::int as total
          FROM o4o_asset_snapshots s
          WHERE s.organization_id = $1
          ${countTypeFilter}
          ${countSearchFilter}
        `;

        // WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1: lesson 항목은 content_json의 reference metadata
        // (thumbnail, instructorName, lessonCount, publicUrl 등)를 화면에서 활용한다.
        // 기존 cms 흐름에는 contentJson이 추가되더라도 영향 없음.
        const dataQuery = `
          SELECT
            s.id,
            s.organization_id AS "organizationId",
            s.source_service AS "sourceService",
            s.source_asset_id AS "sourceAssetId",
            s.asset_type AS "assetType",
            s.title,
            s.content_json AS "contentJson",
            s.created_by AS "createdBy",
            s.created_at AS "createdAt",
            COALESCE(c.publish_status, CASE WHEN s.asset_type = 'signage' THEN 'published' ELSE 'draft' END) AS "publishStatus",
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
          ${searchFilter}
          ORDER BY
            COALESCE(c.is_forced, false) DESC,
            s.created_at DESC
          LIMIT $2 OFFSET $3
        `;

        const [countResult, items] = await Promise.all([
          dataSource.query(countQuery, countParams),
          dataSource.query(dataQuery, dataParams),
        ]);

        const total = countResult[0]?.total || 0;
        const totalPages = Math.max(1, Math.ceil(total / limit));

        res.json({
          success: true,
          data: { items, total, page, limit, totalPages },
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
