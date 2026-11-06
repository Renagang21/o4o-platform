/**
 * Store Playlist Controller — Store 중심 Playlist 엔진
 *
 * WO-O4O-SIGNAGE-KPA-PHASE1-MODERNIZATION-V1
 * Refactored: raw SQL → StorePlaylistRepository
 *
 * Endpoints:
 *   Auth (pharmacy owner):
 *     GET    /store-playlists              — 내 매장 플레이리스트 목록
 *     POST   /store-playlists              — 플레이리스트 생성
 *     PATCH  /store-playlists/:id          — 플레이리스트 수정
 *     DELETE /store-playlists/:id          — 플레이리스트 삭제
 *     GET    /store-playlists/:id/items    — 항목 목록
 *     POST   /store-playlists/:id/items    — 항목 추가 (snapshot)
 *     POST   /store-playlists/:id/items/from-library — Library에서 추가
 *     POST   /store-playlists/:id/items/from-signage — Signage Media에서 추가
 *     PATCH  /store-playlists/:id/items/reorder — 순서 변경
 *     DELETE /store-playlists/:id/items/:itemId — 항목 삭제 (locked 제외)
 *
 *   Public (no auth):
 *     GET    /store-playlists/public/:id   — 렌더링용 플레이리스트
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import type { AuthRequest } from '../../../types/auth.js';
import { resolveStoreAccess, type StoreOwnerServiceKey } from '../../../utils/store-owner.utils.js';
import { readPreferredStoreOrganizationId } from '../../../utils/store-organization.resolver.js';
import { StorePlaylistRepository } from '../repositories/store-playlist.repository.js';

function validTags(tags: unknown): tags is string[] | undefined {
  return tags === undefined || (Array.isArray(tags) && tags.length <= 20 && tags.every(tag => typeof tag === 'string' && tag.trim().length > 0 && tag.length <= 50));
}

type AuthMiddleware = RequestHandler;

// ─────────────────────────────────────────────────────
// Controller
// ─────────────────────────────────────────────────────

export function createStorePlaylistController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  serviceKey?: string,
  /**
   * WO-O4O-STORE-OWNER-SERVICE-SCOPED-ORGANIZATION-RESOLUTION-V1:
   *   이 라우터는 서비스별로 mount 되므로 매장 조직도 그 서비스 등록 조직으로 한정한다.
   *   (serviceKey 파라미터는 공개 playlist 필터용 platform key 라 재사용하지 않는다.)
   *   미지정 시 기존 back-compat 동작.
   */
  storeOwnerServiceKey?: StoreOwnerServiceKey,
): Router {
  const router = Router();
  const repo = new StorePlaylistRepository(dataSource);

  // ═══════════════════════════════════════════════════
  // PUBLIC: GET /store-playlists/public/:id
  // 렌더링용 — No Auth
  // ═══════════════════════════════════════════════════

  router.get(
    '/public/:id',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { id } = req.params;

        const playlist = await repo.findPublicPlaylist(id);
        if (!playlist) {
          res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Playlist not found or not published' },
          });
          return;
        }

        const items = await repo.findPublicPlaylistItems(id, serviceKey);
        res.json({ success: true, data: { ...playlist, items, serverNow: new Date().toISOString() } });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    },
  );

  router.get('/required-videos', requireAuth, async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthRequest).user;
    if (!user?.id) { res.status(401).json({ success: false }); return; }
    try {
      const organizationId = await resolveStoreAccess(dataSource, user.id, user.roles || [], storeOwnerServiceKey, readPreferredStoreOrganizationId(req));
      if (!organizationId || !serviceKey) { res.status(403).json({ success: false }); return; }
      res.json({ success: true, data: await repo.findRequiredPlaylistItems(null, serviceKey), serverNow: new Date().toISOString() });
    } catch { res.status(500).json({ success: false, error: { code: 'REQUIRED_VIDEOS_UNAVAILABLE' } }); }
  });

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

        const organizationId = await resolveStoreAccess(dataSource, userId, userRoles, storeOwnerServiceKey, readPreferredStoreOrganizationId(req));
        if (!organizationId) {
          res.status(403).json({ success: false, error: { code: 'STORE_ACCESS_REQUIRED', message: '승인된 매장 이용 자격을 확인해 주세요.' } });
          return;
        }

        const playlists = await repo.findPlaylistsByOrganization(organizationId, serviceKey);
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

        const organizationId = await resolveStoreAccess(dataSource, userId, userRoles, storeOwnerServiceKey, readPreferredStoreOrganizationId(req));
        if (!organizationId) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Pharmacy owner role required' } });
          return;
        }

        const { name, playlistType, tags, clientRequestId } = req.body;
        if (clientRequestId !== undefined && (typeof clientRequestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientRequestId))) {
          res.status(400).json({ success: false, error: { code: 'INVALID_INPUT' } }); return;
        }
        if (typeof name !== 'string' || !name.trim() || name.trim().length > 255 || !validTags(tags)) {
          res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'name is required' } });
          return;
        }

        const type = playlistType === 'SINGLE' ? 'SINGLE' : 'LIST';
        const result = await repo.createPlaylist(organizationId, name.trim(), type, tags ?? [], clientRequestId);
        res.status(201).json({ success: true, data: result });
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

        if (!userId) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Pharmacy owner role required' } });
          return;
        }
        const organizationId = await resolveStoreAccess(dataSource, userId, userRoles, storeOwnerServiceKey, readPreferredStoreOrganizationId(req));
        if (!organizationId) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Pharmacy owner role required' } });
          return;
        }

        const { id } = req.params;
        const { name, publishStatus, isActive, tags } = req.body;
        if (!validTags(tags) || (name !== undefined && (typeof name !== 'string' || !name.trim() || name.trim().length > 255))) {
          res.status(400).json({ success: false, error: { code: 'INVALID_INPUT' } }); return;
        }

        // Validate: at least one valid field to update
        const updates: { name?: string; tags?: string[]; publishStatus?: string; isActive?: boolean } = {};
        if (tags !== undefined) updates.tags = tags;
        if (name !== undefined) updates.name = name.trim();
        if (publishStatus === 'draft' || publishStatus === 'published') updates.publishStatus = publishStatus;
        if (isActive !== undefined) updates.isActive = isActive;

        if (Object.keys(updates).length === 0) {
          res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Nothing to update' } });
          return;
        }

        const result = await repo.updatePlaylist(id, organizationId, updates);
        if (!result) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Playlist not found' } });
          return;
        }

        res.json({ success: true, data: result });
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

        if (!userId) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Pharmacy owner role required' } });
          return;
        }
        const organizationId = await resolveStoreAccess(dataSource, userId, userRoles, storeOwnerServiceKey, readPreferredStoreOrganizationId(req));
        if (!organizationId) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Pharmacy owner role required' } });
          return;
        }

        const { id } = req.params;
        const result = await repo.softDeletePlaylist(id, organizationId);
        if (!result) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Playlist not found' } });
          return;
        }

        res.json({ success: true, data: { id: result.id, deleted: true } });
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

        if (!userId) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Pharmacy owner role required' } });
          return;
        }
        const organizationId = await resolveStoreAccess(dataSource, userId, userRoles, storeOwnerServiceKey, readPreferredStoreOrganizationId(req));
        if (!organizationId) {
          res.status(403).json({ success: false, error: { code: 'STORE_ACCESS_REQUIRED', message: '승인된 매장 이용 자격을 확인해 주세요.' } });
          return;
        }

        const { id } = req.params;

        if (!await repo.verifyOwnership(id, organizationId)) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Playlist not found' } });
          return;
        }

        const items = await repo.findPlaylistItems(id, serviceKey);
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

        if (!userId) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Pharmacy owner role required' } });
          return;
        }
        const organizationId = await resolveStoreAccess(dataSource, userId, userRoles, storeOwnerServiceKey, readPreferredStoreOrganizationId(req));
        if (!organizationId) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Pharmacy owner role required' } });
          return;
        }

        const { id } = req.params;
        const { snapshotId } = req.body;

        if (!snapshotId) {
          res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'snapshotId is required' } });
          return;
        }

        if (!await repo.verifyOwnership(id, organizationId)) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Playlist not found' } });
          return;
        }

        const result = await repo.addItem(id, snapshotId);
        res.status(201).json({ success: true, data: result });
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
   * POST /store-playlists/:id/items/from-library
   * Library에서 항목 추가 — Library item → asset snapshot → playlist item
   * Body: { libraryItemId }
   */
  router.post(
    '/:id/items/from-library',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];

        if (!userId) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Pharmacy owner role required' } });
          return;
        }
        const organizationId = await resolveStoreAccess(dataSource, userId, userRoles, storeOwnerServiceKey, readPreferredStoreOrganizationId(req));
        if (!organizationId) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Pharmacy owner role required' } });
          return;
        }

        const { id } = req.params;
        const { libraryItemId } = req.body;

        if (!libraryItemId) {
          res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'libraryItemId is required' } });
          return;
        }

        if (!await repo.verifyOwnership(id, organizationId)) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Playlist not found' } });
          return;
        }

        const result = await repo.addItemFromLibrary(id, libraryItemId, organizationId, userId);
        res.status(201).json({ success: true, data: result });
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
   * POST /store-playlists/:id/items/from-signage
   * Signage Media에서 항목 추가 — signage_media → auto-snapshot → playlist item
   * Body: { mediaId }
   * WO-O4O-SIGNAGE-STORE-PLAYLIST-AUTOSNAPSHOT-IMPLEMENTATION-V1
   */
  router.post(
    '/:id/items/from-signage',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];

        if (!userId) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Pharmacy owner role required' } });
          return;
        }
        const storeOrgId = await resolveStoreAccess(dataSource, userId, userRoles, storeOwnerServiceKey, readPreferredStoreOrganizationId(req));
        if (!storeOrgId) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Pharmacy owner role required' } });
          return;
        }

        const { id } = req.params;
        const { mediaId, organizationId } = req.body;
        // Only the server-authorized playlist store may supply the media.
        if (organizationId && organizationId !== storeOrgId) {
          res.status(403).json({ success: false, error: { code: 'STORE_SELECTION_ACCESS_REQUIRED', message: '다른 매장의 영상을 추가할 수 없습니다.' } });
          return;
        }
        const signageOrgId = storeOrgId;

        if (!mediaId) {
          res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'mediaId is required' } });
          return;
        }

        if (!await repo.verifyOwnership(id, storeOrgId)) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Playlist not found' } });
          return;
        }

        const result = await repo.addItemFromSignage(id, mediaId, signageOrgId, userId);
        res.status(201).json({ success: true, data: result });
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

        if (!userId) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Pharmacy owner role required' } });
          return;
        }
        const organizationId = await resolveStoreAccess(dataSource, userId, userRoles, storeOwnerServiceKey, readPreferredStoreOrganizationId(req));
        if (!organizationId) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Pharmacy owner role required' } });
          return;
        }

        const { id } = req.params;
        const { order } = req.body;

        if (!Array.isArray(order) || order.length === 0) {
          res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'order array is required' } });
          return;
        }

        if (!await repo.verifyOwnership(id, organizationId)) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Playlist not found' } });
          return;
        }

        const allowed = new Set((await repo.findPlaylistItems(id, serviceKey)).map(item => item.id));
        if (order.some((key: unknown) => typeof key !== 'string' || !allowed.has(key)) || new Set(order).size !== order.length) {
          res.status(400).json({ success: false, error: { code: 'INVALID_ITEM_ORDER' } }); return;
        }
        const result = await repo.reorderItems(id, order);
        res.json({ success: true, data: result });
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

        if (!userId) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Pharmacy owner role required' } });
          return;
        }
        const organizationId = await resolveStoreAccess(dataSource, userId, userRoles, storeOwnerServiceKey, readPreferredStoreOrganizationId(req));
        if (!organizationId) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Pharmacy owner role required' } });
          return;
        }

        const { id, itemId } = req.params;

        // Virtual forced content items cannot be deleted
        if (itemId.startsWith('forced-')) {
          res.status(403).json({
            success: false,
            error: { code: 'ITEM_LOCKED', message: 'Forced content cannot be deleted' },
          });
          return;
        }

        if (!await repo.verifyOwnership(id, organizationId)) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Playlist not found' } });
          return;
        }

        await repo.deleteItem(id, itemId);
        res.json({ success: true, data: { id: itemId, deleted: true } });
      } catch (error: any) {
        if (error.statusCode && error.code) {
          res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
          return;
        }
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    },
  );

  return router;
}
