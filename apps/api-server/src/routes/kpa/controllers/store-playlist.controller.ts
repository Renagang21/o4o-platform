/**
 * Store Playlist Controller — Store 중심 Playlist 엔진
 *
 * WO-O4O-SIGNAGE-STORE-PLAYLIST-ENGINE-V1
 *
 * Endpoints:
 *   Auth (pharmacy owner):
 *     GET    /store-playlists              — 내 매장 플레이리스트 목록
 *     POST   /store-playlists              — 플레이리스트 생성
 *     PATCH  /store-playlists/:id          — 플레이리스트 수정
 *     DELETE /store-playlists/:id          — 플레이리스트 삭제
 *     GET    /store-playlists/:id/items    — 항목 목록
 *     POST   /store-playlists/:id/items    — 항목 추가 (snapshot)
 *     PATCH  /store-playlists/:id/items/reorder — 순서 변경
 *     DELETE /store-playlists/:id/items/:itemId — 항목 삭제 (locked 제외)
 *
 *   Public (no auth):
 *     GET    /store-playlists/public/:id   — 렌더링용 플레이리스트
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { KpaMember } from '../entities/kpa-member.entity.js';
import type { AuthRequest } from '../../../types/auth.js';
import { hasAnyServiceRole } from '../../../utils/role.utils.js';

type AuthMiddleware = import('express').RequestHandler;

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────

async function getUserOrganizationId(
  dataSource: DataSource,
  userId: string,
): Promise<string | null> {
  const memberRepo = dataSource.getRepository(KpaMember);
  const member = await memberRepo.findOne({ where: { user_id: userId } });
  return member?.organization_id || null;
}

function isPharmacyOwnerRole(roles: string[]): boolean {
  return hasAnyServiceRole(roles, [
    'kpa:branch_admin', 'kpa:branch_operator', 'kpa:admin', 'kpa:operator',
  ]);
}

// ─────────────────────────────────────────────────────
// Controller
// ─────────────────────────────────────────────────────

export function createStorePlaylistController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();

  // ═══════════════════════════════════════════════════
  // PUBLIC: GET /store-playlists/public/:id
  // 렌더링용 — No Auth
  // ═══════════════════════════════════════════════════

  router.get(
    '/public/:id',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { id } = req.params;

        const rows = await dataSource.query(
          `SELECT
             p.id,
             p.name,
             p.playlist_type AS "playlistType",
             p.organization_id AS "organizationId"
           FROM store_playlists p
           WHERE p.id = $1
             AND p.publish_status = 'published'
             AND p.is_active = true`,
          [id],
        );

        if (rows.length === 0) {
          res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Playlist not found or not published' },
          });
          return;
        }

        const playlist = rows[0];

        // Fetch items with snapshot content_json for video URL
        const items = await dataSource.query(
          `SELECT
             i.id,
             i.snapshot_id AS "snapshotId",
             i.display_order AS "displayOrder",
             i.is_forced AS "isForced",
             s.title,
             s.content_json AS "contentJson"
           FROM store_playlist_items i
           JOIN o4o_asset_snapshots s ON s.id = i.snapshot_id
           WHERE i.playlist_id = $1
             AND (
               i.is_forced = false
               OR (
                 (i.forced_start_at IS NULL OR NOW() >= i.forced_start_at)
                 AND (i.forced_end_at IS NULL OR NOW() <= i.forced_end_at)
               )
             )
           ORDER BY i.display_order ASC`,
          [id],
        );

        res.json({
          success: true,
          data: {
            ...playlist,
            items,
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

  // ═══════════════════════════════════════════════════
  // AUTH ROUTES: requireAuth + pharmacy owner check
  // ═══════════════════════════════════════════════════

  /**
   * GET /store-playlists
   * 내 매장 플레이리스트 목록
   */
  router.get(
    '/',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];

        if (!userId) {
          res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User ID not found' } });
          return;
        }

        if (!isPharmacyOwnerRole(userRoles)) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Pharmacy owner role required' } });
          return;
        }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) {
          res.json({ success: true, data: [] });
          return;
        }

        const playlists = await dataSource.query(
          `SELECT
             p.id,
             p.name,
             p.playlist_type AS "playlistType",
             p.publish_status AS "publishStatus",
             p.is_active AS "isActive",
             p.source_playlist_id AS "sourcePlaylistId",
             p.created_at AS "createdAt",
             p.updated_at AS "updatedAt",
             COALESCE(ic.item_count, 0)::int AS "itemCount",
             COALESCE(ic.forced_count, 0)::int AS "forcedCount"
           FROM store_playlists p
           LEFT JOIN (
             SELECT
               playlist_id,
               COUNT(*)::int AS item_count,
               COUNT(*) FILTER (WHERE is_forced = true)::int AS forced_count
             FROM store_playlist_items
             GROUP BY playlist_id
           ) ic ON ic.playlist_id = p.id
           WHERE p.organization_id = $1 AND p.is_active = true
           ORDER BY p.updated_at DESC`,
          [organizationId],
        );

        res.json({ success: true, data: playlists });
      } catch (error: any) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    },
  );

  /**
   * POST /store-playlists
   * 플레이리스트 생성
   */
  router.post(
    '/',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];

        if (!userId) {
          res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User ID not found' } });
          return;
        }

        if (!isPharmacyOwnerRole(userRoles)) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Pharmacy owner role required' } });
          return;
        }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) {
          res.status(400).json({ success: false, error: { code: 'NO_ORG', message: 'No organization associated' } });
          return;
        }

        const { name, playlistType } = req.body;
        if (!name || typeof name !== 'string') {
          res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'name is required' } });
          return;
        }

        const type = playlistType === 'SINGLE' ? 'SINGLE' : 'LIST';

        const result = await dataSource.query(
          `INSERT INTO store_playlists (organization_id, name, playlist_type)
           VALUES ($1, $2, $3)
           RETURNING id, name, playlist_type AS "playlistType", publish_status AS "publishStatus",
                     is_active AS "isActive", created_at AS "createdAt"`,
          [organizationId, name.trim(), type],
        );

        res.status(201).json({ success: true, data: result[0] });
      } catch (error: any) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    },
  );

  /**
   * PATCH /store-playlists/:id
   * 플레이리스트 수정 (name, publishStatus, isActive)
   */
  router.patch(
    '/:id',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];

        if (!userId || !isPharmacyOwnerRole(userRoles)) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Pharmacy owner role required' } });
          return;
        }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) {
          res.status(400).json({ success: false, error: { code: 'NO_ORG', message: 'No organization' } });
          return;
        }

        const { id } = req.params;
        const { name, publishStatus, isActive } = req.body;

        // Build dynamic SET clause
        const sets: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (name !== undefined) {
          sets.push(`name = $${paramIndex++}`);
          params.push(name.trim());
        }
        if (publishStatus !== undefined && (publishStatus === 'draft' || publishStatus === 'published')) {
          sets.push(`publish_status = $${paramIndex++}`);
          params.push(publishStatus);
        }
        if (isActive !== undefined) {
          sets.push(`is_active = $${paramIndex++}`);
          params.push(!!isActive);
        }

        if (sets.length === 0) {
          res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Nothing to update' } });
          return;
        }

        sets.push(`updated_at = NOW()`);

        const result = await dataSource.query(
          `UPDATE store_playlists
           SET ${sets.join(', ')}
           WHERE id = $${paramIndex} AND organization_id = $${paramIndex + 1}
           RETURNING id, name, playlist_type AS "playlistType", publish_status AS "publishStatus",
                     is_active AS "isActive", updated_at AS "updatedAt"`,
          [...params, id, organizationId],
        );

        if (result.length === 0) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Playlist not found' } });
          return;
        }

        res.json({ success: true, data: result[0] });
      } catch (error: any) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    },
  );

  /**
   * DELETE /store-playlists/:id
   * 플레이리스트 삭제 (soft: is_active=false)
   */
  router.delete(
    '/:id',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];

        if (!userId || !isPharmacyOwnerRole(userRoles)) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Pharmacy owner role required' } });
          return;
        }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) {
          res.status(400).json({ success: false, error: { code: 'NO_ORG', message: 'No organization' } });
          return;
        }

        const { id } = req.params;

        const result = await dataSource.query(
          `UPDATE store_playlists SET is_active = false, updated_at = NOW()
           WHERE id = $1 AND organization_id = $2
           RETURNING id`,
          [id, organizationId],
        );

        if (result.length === 0) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Playlist not found' } });
          return;
        }

        res.json({ success: true, data: { id: result[0].id, deleted: true } });
      } catch (error: any) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    },
  );

  // ═══════════════════════════════════════════════════
  // ITEMS
  // ═══════════════════════════════════════════════════

  /**
   * GET /store-playlists/:id/items
   * 항목 목록 (snapshot 정보 포함)
   */
  router.get(
    '/:id/items',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];

        if (!userId || !isPharmacyOwnerRole(userRoles)) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Pharmacy owner role required' } });
          return;
        }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) {
          res.json({ success: true, data: [] });
          return;
        }

        const { id } = req.params;

        // Verify playlist ownership
        const plCheck = await dataSource.query(
          `SELECT id FROM store_playlists WHERE id = $1 AND organization_id = $2 AND is_active = true`,
          [id, organizationId],
        );
        if (plCheck.length === 0) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Playlist not found' } });
          return;
        }

        const items = await dataSource.query(
          `SELECT
             i.id,
             i.snapshot_id AS "snapshotId",
             i.display_order AS "displayOrder",
             i.is_forced AS "isForced",
             i.is_locked AS "isLocked",
             i.forced_start_at AS "forcedStartAt",
             i.forced_end_at AS "forcedEndAt",
             i.created_at AS "createdAt",
             s.title,
             s.content_json AS "contentJson",
             s.asset_type AS "assetType"
           FROM store_playlist_items i
           JOIN o4o_asset_snapshots s ON s.id = i.snapshot_id
           WHERE i.playlist_id = $1
           ORDER BY i.display_order ASC`,
          [id],
        );

        res.json({ success: true, data: items });
      } catch (error: any) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    },
  );

  /**
   * POST /store-playlists/:id/items
   * 항목 추가 (snapshot_id)
   */
  router.post(
    '/:id/items',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];

        if (!userId || !isPharmacyOwnerRole(userRoles)) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Pharmacy owner role required' } });
          return;
        }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) {
          res.status(400).json({ success: false, error: { code: 'NO_ORG', message: 'No organization' } });
          return;
        }

        const { id } = req.params;
        const { snapshotId } = req.body;

        if (!snapshotId) {
          res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'snapshotId is required' } });
          return;
        }

        // Verify playlist ownership
        const plCheck = await dataSource.query(
          `SELECT id, playlist_type FROM store_playlists WHERE id = $1 AND organization_id = $2 AND is_active = true`,
          [id, organizationId],
        );
        if (plCheck.length === 0) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Playlist not found' } });
          return;
        }

        // Use transaction to prevent race conditions (especially SINGLE type)
        const result = await dataSource.transaction(async (manager) => {
          // Lock the playlist row to serialise concurrent inserts
          const locked = await manager.query(
            `SELECT id, playlist_type FROM store_playlists WHERE id = $1 FOR UPDATE`,
            [id],
          );

          // SINGLE type: max 1 item
          if (locked[0]?.playlist_type === 'SINGLE') {
            const existingCount = await manager.query(
              `SELECT COUNT(*)::int AS count FROM store_playlist_items WHERE playlist_id = $1`,
              [id],
            );
            if (existingCount[0]?.count > 0) {
              throw Object.assign(new Error('SINGLE playlist allows only 1 item'), { statusCode: 400, code: 'SINGLE_LIMIT' });
            }
          }

          // Get next display_order
          const maxOrder = await manager.query(
            `SELECT COALESCE(MAX(display_order), -1)::int + 1 AS next_order FROM store_playlist_items WHERE playlist_id = $1`,
            [id],
          );

          const rows = await manager.query(
            `INSERT INTO store_playlist_items (playlist_id, snapshot_id, display_order)
             VALUES ($1, $2, $3)
             RETURNING id, snapshot_id AS "snapshotId", display_order AS "displayOrder",
                       is_forced AS "isForced", is_locked AS "isLocked", created_at AS "createdAt"`,
            [id, snapshotId, maxOrder[0].next_order],
          );
          return rows;
        });

        res.status(201).json({ success: true, data: result[0] });
      } catch (error: any) {
        if (error.statusCode && error.code) {
          res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
          return;
        }
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    },
  );

  /**
   * PATCH /store-playlists/:id/items/reorder
   * 항목 순서 변경
   * Body: { order: [itemId1, itemId2, ...] }
   */
  router.patch(
    '/:id/items/reorder',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];

        if (!userId || !isPharmacyOwnerRole(userRoles)) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Pharmacy owner role required' } });
          return;
        }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) {
          res.status(400).json({ success: false, error: { code: 'NO_ORG', message: 'No organization' } });
          return;
        }

        const { id } = req.params;
        const { order } = req.body;

        if (!Array.isArray(order) || order.length === 0) {
          res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'order array is required' } });
          return;
        }

        // Verify playlist ownership
        const plCheck = await dataSource.query(
          `SELECT id FROM store_playlists WHERE id = $1 AND organization_id = $2 AND is_active = true`,
          [id, organizationId],
        );
        if (plCheck.length === 0) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Playlist not found' } });
          return;
        }

        // Update display_order for each item
        for (let i = 0; i < order.length; i++) {
          await dataSource.query(
            `UPDATE store_playlist_items SET display_order = $1, updated_at = NOW()
             WHERE id = $2 AND playlist_id = $3`,
            [i, order[i], id],
          );
        }

        res.json({ success: true, data: { reordered: order.length } });
      } catch (error: any) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    },
  );

  /**
   * DELETE /store-playlists/:id/items/:itemId
   * 항목 삭제 (is_locked=true → 403)
   */
  router.delete(
    '/:id/items/:itemId',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];

        if (!userId || !isPharmacyOwnerRole(userRoles)) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Pharmacy owner role required' } });
          return;
        }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) {
          res.status(400).json({ success: false, error: { code: 'NO_ORG', message: 'No organization' } });
          return;
        }

        const { id, itemId } = req.params;

        // Verify playlist ownership
        const plCheck = await dataSource.query(
          `SELECT id FROM store_playlists WHERE id = $1 AND organization_id = $2`,
          [id, organizationId],
        );
        if (plCheck.length === 0) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Playlist not found' } });
          return;
        }

        // Check if locked
        const itemCheck = await dataSource.query(
          `SELECT id, is_locked FROM store_playlist_items WHERE id = $1 AND playlist_id = $2`,
          [itemId, id],
        );
        if (itemCheck.length === 0) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Item not found' } });
          return;
        }

        if (itemCheck[0].is_locked) {
          res.status(403).json({
            success: false,
            error: { code: 'ITEM_LOCKED', message: 'Forced content cannot be deleted' },
          });
          return;
        }

        await dataSource.query(
          `DELETE FROM store_playlist_items WHERE id = $1 AND playlist_id = $2`,
          [itemId, id],
        );

        res.json({ success: true, data: { id: itemId, deleted: true } });
      } catch (error: any) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    },
  );

  return router;
}
