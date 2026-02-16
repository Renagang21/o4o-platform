/**
 * Display Controller
 * 스마트 디스플레이 API 엔드포인트
 *
 * Security: pharmacy-scoped isolation enforced on all endpoints.
 * - Regular users: auto-resolved pharmacy from auth context
 * - Admins (glycopharm:admin, platform:admin): global access or pharmacy_id filter
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import {
  GlycopharmPharmacy,
  DisplayPlaylist,
  DisplayMedia,
  DisplayPlaylistItem,
  DisplaySchedule,
} from '../entities/index.js';
import type { AuthRequest } from '../../../types/auth.js';

type AuthMiddleware = RequestHandler;
type ScopeMiddleware = (scope: string) => RequestHandler;

const ADMIN_ROLES = ['glycopharm:admin', 'platform:admin', 'platform:super_admin'];

function isDisplayAdmin(roles: string[]): boolean {
  return roles.some(r => ADMIN_ROLES.includes(r));
}

/**
 * Resolve pharmacy context from authenticated user.
 * Admin → pharmacyId=null (global access).
 * Regular user → pharmacy resolved from created_by_user_id.
 */
async function resolvePharmacyContext(
  dataSource: DataSource,
  req: AuthRequest,
): Promise<{ pharmacyId: string | null; isAdmin: boolean }> {
  const userId = req.user?.id;
  const userRoles: string[] = (req.user as any)?.roles || [];

  if (!userId) throw new Error('UNAUTHORIZED');

  if (isDisplayAdmin(userRoles)) {
    return { pharmacyId: null, isAdmin: true };
  }

  const pharmacyRepo = dataSource.getRepository(GlycopharmPharmacy);
  const pharmacy = await pharmacyRepo.findOne({ where: { created_by_user_id: userId } });
  if (!pharmacy) throw new Error('NO_PHARMACY');

  return { pharmacyId: pharmacy.id, isAdmin: false };
}

const handleValidationErrors = (req: Request, res: Response, next: any): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors.array() },
    });
    return;
  }
  next();
};

export function createDisplayController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  requireScope: ScopeMiddleware
): Router {
  const router = Router();
  const playlistRepo = dataSource.getRepository(DisplayPlaylist);
  const mediaRepo = dataSource.getRepository(DisplayMedia);
  const playlistItemRepo = dataSource.getRepository(DisplayPlaylistItem);
  const scheduleRepo = dataSource.getRepository(DisplaySchedule);

  // ============================================================================
  // PLAYLISTS
  // ============================================================================

  // GET /playlists - 내 플레이리스트 목록 (pharmacy-scoped)
  router.get('/playlists', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const ctx = await resolvePharmacyContext(dataSource, req);
      const status = req.query.status as string;

      const qb = playlistRepo.createQueryBuilder('p');

      if (ctx.pharmacyId) {
        qb.where('p.pharmacy_id = :pharmacyId', { pharmacyId: ctx.pharmacyId });
      } else if (ctx.isAdmin && req.query.pharmacy_id) {
        // Admin can filter by specific pharmacy
        qb.where('p.pharmacy_id = :pharmacyId', { pharmacyId: req.query.pharmacy_id });
      }

      if (status) {
        qb.andWhere('p.status = :status', { status });
      }

      qb.orderBy('p.updated_at', 'DESC');

      const playlists = await qb.getMany();
      res.json({ data: playlists, total: playlists.length });
    } catch (error: any) {
      if (error.message === 'UNAUTHORIZED') {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }
      if (error.message === 'NO_PHARMACY') {
        res.status(403).json({ error: { code: 'NO_PHARMACY', message: '등록된 약국이 없습니다' } });
        return;
      }
      console.error('Failed to list playlists:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  });

  // POST /playlists - 플레이리스트 생성 (pharmacy_id 서버 강제)
  router.post(
    '/playlists',
    requireAuth,
    [
      body('name').isString().notEmpty(),
      body('description').optional().isString(),
      body('is_public').optional().isBoolean(),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const ctx = await resolvePharmacyContext(dataSource, req);
        const pharmacyId = ctx.pharmacyId || req.body.pharmacy_id;

        if (!pharmacyId) {
          res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'pharmacy_id required' } });
          return;
        }

        const playlist = playlistRepo.create({
          name: req.body.name,
          description: req.body.description,
          is_public: req.body.is_public,
          pharmacy_id: pharmacyId,
          status: 'draft',
          created_by: req.user?.id,
        });
        const saved = await playlistRepo.save(playlist);
        res.status(201).json({ data: saved });
      } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') {
          res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }
        if (error.message === 'NO_PHARMACY') {
          res.status(403).json({ error: { code: 'NO_PHARMACY', message: '등록된 약국이 없습니다' } });
          return;
        }
        console.error('Failed to create playlist:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // GET /playlists/:id (ownership verified)
  router.get(
    '/playlists/:id',
    requireAuth,
    [param('id').isUUID(), handleValidationErrors],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const ctx = await resolvePharmacyContext(dataSource, req);

        const playlist = await playlistRepo.findOne({
          where: { id: req.params.id },
        });
        if (!playlist) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Playlist not found' } });
          return;
        }

        // Ownership check: non-admin must own the playlist
        if (ctx.pharmacyId && playlist.pharmacy_id !== ctx.pharmacyId) {
          res.status(403).json({ error: { code: 'FORBIDDEN', message: '다른 약국의 플레이리스트에 접근할 수 없습니다' } });
          return;
        }

        // 플레이리스트 아이템도 함께 조회
        const items = await playlistItemRepo.find({
          where: { playlist_id: req.params.id },
          relations: ['media'],
          order: { sort_order: 'ASC' },
        });

        res.json({ data: { ...playlist, items } });
      } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') {
          res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }
        if (error.message === 'NO_PHARMACY') {
          res.status(403).json({ error: { code: 'NO_PHARMACY', message: '등록된 약국이 없습니다' } });
          return;
        }
        console.error('Failed to get playlist:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // PUT /playlists/:id (ownership verified)
  router.put(
    '/playlists/:id',
    requireAuth,
    [param('id').isUUID(), handleValidationErrors],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const ctx = await resolvePharmacyContext(dataSource, req);

        const playlist = await playlistRepo.findOne({ where: { id: req.params.id } });
        if (!playlist) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Playlist not found' } });
          return;
        }

        if (ctx.pharmacyId && playlist.pharmacy_id !== ctx.pharmacyId) {
          res.status(403).json({ error: { code: 'FORBIDDEN', message: '다른 약국의 플레이리스트를 수정할 수 없습니다' } });
          return;
        }

        // Prevent pharmacy_id reassignment
        const { pharmacy_id: _ignored, ...updates } = req.body;
        Object.assign(playlist, updates);
        const saved = await playlistRepo.save(playlist);
        res.json({ data: saved });
      } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') {
          res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }
        if (error.message === 'NO_PHARMACY') {
          res.status(403).json({ error: { code: 'NO_PHARMACY', message: '등록된 약국이 없습니다' } });
          return;
        }
        console.error('Failed to update playlist:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // DELETE /playlists/:id (ownership verified)
  router.delete(
    '/playlists/:id',
    requireAuth,
    [param('id').isUUID(), handleValidationErrors],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const ctx = await resolvePharmacyContext(dataSource, req);

        const playlist = await playlistRepo.findOne({ where: { id: req.params.id } });
        if (!playlist) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Playlist not found' } });
          return;
        }

        if (ctx.pharmacyId && playlist.pharmacy_id !== ctx.pharmacyId) {
          res.status(403).json({ error: { code: 'FORBIDDEN', message: '다른 약국의 플레이리스트를 삭제할 수 없습니다' } });
          return;
        }

        await playlistRepo.delete(req.params.id);
        res.json({ success: true });
      } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') {
          res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }
        if (error.message === 'NO_PHARMACY') {
          res.status(403).json({ error: { code: 'NO_PHARMACY', message: '등록된 약국이 없습니다' } });
          return;
        }
        console.error('Failed to delete playlist:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // ============================================================================
  // MEDIA
  // ============================================================================

  // GET /media - 미디어 목록 (pharmacy-scoped)
  router.get('/media', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const ctx = await resolvePharmacyContext(dataSource, req);
      const sourceType = req.query.source_type as string;

      const qb = mediaRepo.createQueryBuilder('m');

      if (ctx.pharmacyId) {
        qb.where('m.pharmacy_id = :pharmacyId', { pharmacyId: ctx.pharmacyId });
      } else if (ctx.isAdmin && req.query.pharmacy_id) {
        qb.where('m.pharmacy_id = :pharmacyId', { pharmacyId: req.query.pharmacy_id });
      }

      if (sourceType) {
        qb.andWhere('m.source_type = :sourceType', { sourceType });
      }

      qb.orderBy('m.created_at', 'DESC');

      const media = await qb.getMany();
      res.json({ data: media, total: media.length });
    } catch (error: any) {
      if (error.message === 'UNAUTHORIZED') {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }
      if (error.message === 'NO_PHARMACY') {
        res.status(403).json({ error: { code: 'NO_PHARMACY', message: '등록된 약국이 없습니다' } });
        return;
      }
      console.error('Failed to list media:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  });

  // POST /media - 미디어 추가 (pharmacy_id 서버 강제)
  router.post(
    '/media',
    requireAuth,
    [
      body('name').isString().notEmpty(),
      body('source_type').isIn(['youtube', 'vimeo']),
      body('source_url').isURL(),
      body('embed_id').isString().notEmpty(),
      body('thumbnail_url').optional().isURL(),
      body('duration').optional().isInt(),
      body('description').optional().isString(),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const ctx = await resolvePharmacyContext(dataSource, req);
        const pharmacyId = ctx.pharmacyId || req.body.pharmacy_id;

        if (!pharmacyId) {
          res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'pharmacy_id required' } });
          return;
        }

        const media = mediaRepo.create({
          name: req.body.name,
          source_type: req.body.source_type,
          source_url: req.body.source_url,
          embed_id: req.body.embed_id,
          thumbnail_url: req.body.thumbnail_url,
          duration: req.body.duration,
          description: req.body.description,
          pharmacy_id: pharmacyId,
          created_by: req.user?.id,
        });
        const saved = await mediaRepo.save(media);
        res.status(201).json({ data: saved });
      } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') {
          res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }
        if (error.message === 'NO_PHARMACY') {
          res.status(403).json({ error: { code: 'NO_PHARMACY', message: '등록된 약국이 없습니다' } });
          return;
        }
        console.error('Failed to create media:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // DELETE /media/:id (ownership verified)
  router.delete(
    '/media/:id',
    requireAuth,
    [param('id').isUUID(), handleValidationErrors],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const ctx = await resolvePharmacyContext(dataSource, req);

        const media = await mediaRepo.findOne({ where: { id: req.params.id } });
        if (!media) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Media not found' } });
          return;
        }

        if (ctx.pharmacyId && media.pharmacy_id !== ctx.pharmacyId) {
          res.status(403).json({ error: { code: 'FORBIDDEN', message: '다른 약국의 미디어를 삭제할 수 없습니다' } });
          return;
        }

        await mediaRepo.delete(req.params.id);
        res.json({ success: true });
      } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') {
          res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }
        if (error.message === 'NO_PHARMACY') {
          res.status(403).json({ error: { code: 'NO_PHARMACY', message: '등록된 약국이 없습니다' } });
          return;
        }
        console.error('Failed to delete media:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // ============================================================================
  // PLAYLIST ITEMS
  // ============================================================================

  // POST /playlists/:id/items - 플레이리스트에 아이템 추가 (playlist ownership verified)
  router.post(
    '/playlists/:id/items',
    requireAuth,
    [
      param('id').isUUID(),
      body('media_id').isUUID(),
      body('sort_order').optional().isInt(),
      body('play_duration').optional().isInt(),
      body('transition_type').optional().isIn(['fade', 'slide', 'none']),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const ctx = await resolvePharmacyContext(dataSource, req);

        // Verify playlist ownership
        const playlist = await playlistRepo.findOne({ where: { id: req.params.id } });
        if (!playlist) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Playlist not found' } });
          return;
        }
        if (ctx.pharmacyId && playlist.pharmacy_id !== ctx.pharmacyId) {
          res.status(403).json({ error: { code: 'FORBIDDEN', message: '다른 약국의 플레이리스트에 아이템을 추가할 수 없습니다' } });
          return;
        }

        const item = playlistItemRepo.create({
          playlist_id: req.params.id,
          media_id: req.body.media_id,
          sort_order: req.body.sort_order,
          play_duration: req.body.play_duration,
          transition_type: req.body.transition_type,
        });
        const saved = await playlistItemRepo.save(item);
        res.status(201).json({ data: saved });
      } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') {
          res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }
        if (error.message === 'NO_PHARMACY') {
          res.status(403).json({ error: { code: 'NO_PHARMACY', message: '등록된 약국이 없습니다' } });
          return;
        }
        console.error('Failed to add playlist item:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // DELETE /playlists/:playlistId/items/:itemId (playlist ownership verified)
  router.delete(
    '/playlists/:playlistId/items/:itemId',
    requireAuth,
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const ctx = await resolvePharmacyContext(dataSource, req);

        // Verify playlist ownership
        const playlist = await playlistRepo.findOne({ where: { id: req.params.playlistId } });
        if (!playlist) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Playlist not found' } });
          return;
        }
        if (ctx.pharmacyId && playlist.pharmacy_id !== ctx.pharmacyId) {
          res.status(403).json({ error: { code: 'FORBIDDEN', message: '다른 약국의 플레이리스트 아이템을 삭제할 수 없습니다' } });
          return;
        }

        const result = await playlistItemRepo.delete({
          id: req.params.itemId,
          playlist_id: req.params.playlistId,
        });
        if (result.affected === 0) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Item not found' } });
          return;
        }
        res.json({ success: true });
      } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') {
          res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }
        if (error.message === 'NO_PHARMACY') {
          res.status(403).json({ error: { code: 'NO_PHARMACY', message: '등록된 약국이 없습니다' } });
          return;
        }
        console.error('Failed to delete playlist item:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // ============================================================================
  // SCHEDULES
  // ============================================================================

  // GET /schedules - 스케줄 목록 (pharmacy-scoped)
  router.get('/schedules', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const ctx = await resolvePharmacyContext(dataSource, req);

      const qb = scheduleRepo.createQueryBuilder('s')
        .leftJoinAndSelect('s.playlist', 'playlist');

      if (ctx.pharmacyId) {
        qb.where('s.pharmacy_id = :pharmacyId', { pharmacyId: ctx.pharmacyId });
      } else if (ctx.isAdmin && req.query.pharmacy_id) {
        qb.where('s.pharmacy_id = :pharmacyId', { pharmacyId: req.query.pharmacy_id });
      }

      qb.orderBy('s.priority', 'ASC');

      const schedules = await qb.getMany();
      res.json({ data: schedules, total: schedules.length });
    } catch (error: any) {
      if (error.message === 'UNAUTHORIZED') {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }
      if (error.message === 'NO_PHARMACY') {
        res.status(403).json({ error: { code: 'NO_PHARMACY', message: '등록된 약국이 없습니다' } });
        return;
      }
      console.error('Failed to list schedules:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  });

  // POST /schedules - 스케줄 생성 (pharmacy_id 서버 강제)
  router.post(
    '/schedules',
    requireAuth,
    [
      body('name').isString().notEmpty(),
      body('playlist_id').isUUID(),
      body('days_of_week').isArray(),
      body('start_time').matches(/^\d{2}:\d{2}$/),
      body('end_time').matches(/^\d{2}:\d{2}$/),
      body('priority').optional().isInt(),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const ctx = await resolvePharmacyContext(dataSource, req);
        const pharmacyId = ctx.pharmacyId || req.body.pharmacy_id;

        if (!pharmacyId) {
          res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'pharmacy_id required' } });
          return;
        }

        const schedule = scheduleRepo.create({
          name: req.body.name,
          pharmacy_id: pharmacyId,
          playlist_id: req.body.playlist_id,
          days_of_week: req.body.days_of_week,
          start_time: req.body.start_time,
          end_time: req.body.end_time,
          priority: req.body.priority,
          is_active: true,
          created_by: req.user?.id,
        });
        const saved = await scheduleRepo.save(schedule);
        res.status(201).json({ data: saved });
      } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') {
          res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }
        if (error.message === 'NO_PHARMACY') {
          res.status(403).json({ error: { code: 'NO_PHARMACY', message: '등록된 약국이 없습니다' } });
          return;
        }
        console.error('Failed to create schedule:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // PUT /schedules/:id (ownership verified)
  router.put(
    '/schedules/:id',
    requireAuth,
    [param('id').isUUID(), handleValidationErrors],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const ctx = await resolvePharmacyContext(dataSource, req);

        const schedule = await scheduleRepo.findOne({ where: { id: req.params.id } });
        if (!schedule) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Schedule not found' } });
          return;
        }

        if (ctx.pharmacyId && schedule.pharmacy_id !== ctx.pharmacyId) {
          res.status(403).json({ error: { code: 'FORBIDDEN', message: '다른 약국의 스케줄을 수정할 수 없습니다' } });
          return;
        }

        const { pharmacy_id: _ignored, ...updates } = req.body;
        Object.assign(schedule, updates);
        const saved = await scheduleRepo.save(schedule);
        res.json({ data: saved });
      } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') {
          res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }
        if (error.message === 'NO_PHARMACY') {
          res.status(403).json({ error: { code: 'NO_PHARMACY', message: '등록된 약국이 없습니다' } });
          return;
        }
        console.error('Failed to update schedule:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // DELETE /schedules/:id (ownership verified)
  router.delete(
    '/schedules/:id',
    requireAuth,
    [param('id').isUUID(), handleValidationErrors],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const ctx = await resolvePharmacyContext(dataSource, req);

        const schedule = await scheduleRepo.findOne({ where: { id: req.params.id } });
        if (!schedule) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Schedule not found' } });
          return;
        }

        if (ctx.pharmacyId && schedule.pharmacy_id !== ctx.pharmacyId) {
          res.status(403).json({ error: { code: 'FORBIDDEN', message: '다른 약국의 스케줄을 삭제할 수 없습니다' } });
          return;
        }

        await scheduleRepo.delete(req.params.id);
        res.json({ success: true });
      } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') {
          res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }
        if (error.message === 'NO_PHARMACY') {
          res.status(403).json({ error: { code: 'NO_PHARMACY', message: '등록된 약국이 없습니다' } });
          return;
        }
        console.error('Failed to delete schedule:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // ============================================================================
  // SHARED PLAYLISTS (공개 포럼 — pharmacy isolation not needed)
  // ============================================================================

  // GET /shared-playlists - 공개 플레이리스트 목록
  router.get('/shared-playlists', async (req: Request, res: Response): Promise<void> => {
    try {
      const playlists = await playlistRepo.find({
        where: { is_public: true, status: 'active' },
        relations: ['pharmacy'],
        order: { like_count: 'DESC' },
      });
      res.json({ data: playlists, total: playlists.length });
    } catch (error: any) {
      console.error('Failed to list shared playlists:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  });

  // POST /shared-playlists/:id/like - 좋아요
  router.post(
    '/shared-playlists/:id/like',
    requireAuth,
    [param('id').isUUID(), handleValidationErrors],
    async (req: Request, res: Response): Promise<void> => {
      try {
        await playlistRepo.increment({ id: req.params.id }, 'like_count', 1);
        res.json({ success: true });
      } catch (error: any) {
        console.error('Failed to like playlist:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // POST /shared-playlists/:id/import - 가져오기 (pharmacy_id 서버 강제)
  router.post(
    '/shared-playlists/:id/import',
    requireAuth,
    [param('id').isUUID(), handleValidationErrors],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const ctx = await resolvePharmacyContext(dataSource, req);
        const pharmacyId = ctx.pharmacyId || req.body.pharmacy_id;

        if (!pharmacyId) {
          res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'pharmacy_id required' } });
          return;
        }

        const original = await playlistRepo.findOne({
          where: { id: req.params.id, is_public: true },
        });
        if (!original) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Playlist not found' } });
          return;
        }

        // 원본 다운로드 카운트 증가
        await playlistRepo.increment({ id: req.params.id }, 'download_count', 1);

        // 복제 (pharmacy_id 서버 강제)
        const newPlaylist = playlistRepo.create({
          name: `${original.name} (복사본)`,
          description: original.description,
          pharmacy_id: pharmacyId,
          status: 'draft',
          is_public: false,
          created_by: req.user?.id,
        });
        const saved = await playlistRepo.save(newPlaylist);

        // 아이템도 복제
        const items = await playlistItemRepo.find({ where: { playlist_id: req.params.id } });
        for (const item of items) {
          await playlistItemRepo.save({
            playlist_id: saved.id,
            media_id: item.media_id,
            sort_order: item.sort_order,
            play_duration: item.play_duration,
            transition_type: item.transition_type,
          });
        }

        res.status(201).json({ data: saved });
      } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') {
          res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }
        if (error.message === 'NO_PHARMACY') {
          res.status(403).json({ error: { code: 'NO_PHARMACY', message: '등록된 약국이 없습니다' } });
          return;
        }
        console.error('Failed to import playlist:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  return router;
}
