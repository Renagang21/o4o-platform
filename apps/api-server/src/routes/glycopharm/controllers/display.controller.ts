/**
 * Display Controller
 * 스마트 디스플레이 API 엔드포인트
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import {
  DisplayPlaylist,
  DisplayMedia,
  DisplayPlaylistItem,
  DisplaySchedule,
} from '../entities/index.js';
import type { AuthRequest } from '../../../types/auth.js';

type AuthMiddleware = RequestHandler;
type ScopeMiddleware = (scope: string) => RequestHandler;

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

  // GET /playlists - 내 플레이리스트 목록
  router.get('/playlists', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const pharmacyId = req.query.pharmacy_id as string;
      const status = req.query.status as string;

      const qb = playlistRepo.createQueryBuilder('p');

      if (pharmacyId) {
        qb.where('p.pharmacy_id = :pharmacyId', { pharmacyId });
      }
      if (status) {
        qb.andWhere('p.status = :status', { status });
      }

      qb.orderBy('p.updated_at', 'DESC');

      const playlists = await qb.getMany();
      res.json({ data: playlists, total: playlists.length });
    } catch (error: any) {
      console.error('Failed to list playlists:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  });

  // POST /playlists - 플레이리스트 생성
  router.post(
    '/playlists',
    requireAuth,
    [
      body('name').isString().notEmpty(),
      body('description').optional().isString(),
      body('pharmacy_id').optional().isUUID(),
      body('is_public').optional().isBoolean(),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const playlist = playlistRepo.create({
          ...req.body,
          status: 'draft',
          created_by: req.user?.id,
        });
        const saved = await playlistRepo.save(playlist);
        res.status(201).json({ data: saved });
      } catch (error: any) {
        console.error('Failed to create playlist:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // GET /playlists/:id
  router.get(
    '/playlists/:id',
    requireAuth,
    [param('id').isUUID(), handleValidationErrors],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const playlist = await playlistRepo.findOne({
          where: { id: req.params.id },
        });
        if (!playlist) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Playlist not found' } });
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
        console.error('Failed to get playlist:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // PUT /playlists/:id
  router.put(
    '/playlists/:id',
    requireAuth,
    [param('id').isUUID(), handleValidationErrors],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const playlist = await playlistRepo.findOne({ where: { id: req.params.id } });
        if (!playlist) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Playlist not found' } });
          return;
        }
        Object.assign(playlist, req.body);
        const saved = await playlistRepo.save(playlist);
        res.json({ data: saved });
      } catch (error: any) {
        console.error('Failed to update playlist:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // DELETE /playlists/:id
  router.delete(
    '/playlists/:id',
    requireAuth,
    [param('id').isUUID(), handleValidationErrors],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const result = await playlistRepo.delete(req.params.id);
        if (result.affected === 0) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Playlist not found' } });
          return;
        }
        res.json({ success: true });
      } catch (error: any) {
        console.error('Failed to delete playlist:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // ============================================================================
  // MEDIA
  // ============================================================================

  // GET /media - 미디어 목록
  router.get('/media', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const pharmacyId = req.query.pharmacy_id as string;
      const sourceType = req.query.source_type as string;

      const qb = mediaRepo.createQueryBuilder('m');

      if (pharmacyId) {
        qb.where('m.pharmacy_id = :pharmacyId', { pharmacyId });
      }
      if (sourceType) {
        qb.andWhere('m.source_type = :sourceType', { sourceType });
      }

      qb.orderBy('m.created_at', 'DESC');

      const media = await qb.getMany();
      res.json({ data: media, total: media.length });
    } catch (error: any) {
      console.error('Failed to list media:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  });

  // POST /media - 미디어 추가
  router.post(
    '/media',
    requireAuth,
    [
      body('name').isString().notEmpty(),
      body('source_type').isIn(['youtube', 'vimeo']),
      body('source_url').isURL(),
      body('embed_id').isString().notEmpty(),
      body('pharmacy_id').optional().isUUID(),
      body('thumbnail_url').optional().isURL(),
      body('duration').optional().isInt(),
      body('description').optional().isString(),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const media = mediaRepo.create({
          ...req.body,
          created_by: req.user?.id,
        });
        const saved = await mediaRepo.save(media);
        res.status(201).json({ data: saved });
      } catch (error: any) {
        console.error('Failed to create media:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // DELETE /media/:id
  router.delete(
    '/media/:id',
    requireAuth,
    [param('id').isUUID(), handleValidationErrors],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const result = await mediaRepo.delete(req.params.id);
        if (result.affected === 0) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Media not found' } });
          return;
        }
        res.json({ success: true });
      } catch (error: any) {
        console.error('Failed to delete media:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // ============================================================================
  // PLAYLIST ITEMS
  // ============================================================================

  // POST /playlists/:id/items - 플레이리스트에 아이템 추가
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
    async (req: Request, res: Response): Promise<void> => {
      try {
        const item = playlistItemRepo.create({
          playlist_id: req.params.id,
          ...req.body,
        });
        const saved = await playlistItemRepo.save(item);
        res.status(201).json({ data: saved });
      } catch (error: any) {
        console.error('Failed to add playlist item:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // DELETE /playlists/:playlistId/items/:itemId
  router.delete(
    '/playlists/:playlistId/items/:itemId',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
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
        console.error('Failed to delete playlist item:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // ============================================================================
  // SCHEDULES
  // ============================================================================

  // GET /schedules - 스케줄 목록
  router.get('/schedules', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const pharmacyId = req.query.pharmacy_id as string;

      const qb = scheduleRepo.createQueryBuilder('s')
        .leftJoinAndSelect('s.playlist', 'playlist');

      if (pharmacyId) {
        qb.where('s.pharmacy_id = :pharmacyId', { pharmacyId });
      }

      qb.orderBy('s.priority', 'ASC');

      const schedules = await qb.getMany();
      res.json({ data: schedules, total: schedules.length });
    } catch (error: any) {
      console.error('Failed to list schedules:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  });

  // POST /schedules - 스케줄 생성
  router.post(
    '/schedules',
    requireAuth,
    [
      body('name').isString().notEmpty(),
      body('pharmacy_id').isUUID(),
      body('playlist_id').isUUID(),
      body('days_of_week').isArray(),
      body('start_time').matches(/^\d{2}:\d{2}$/),
      body('end_time').matches(/^\d{2}:\d{2}$/),
      body('priority').optional().isInt(),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const schedule = scheduleRepo.create({
          ...req.body,
          is_active: true,
          created_by: req.user?.id,
        });
        const saved = await scheduleRepo.save(schedule);
        res.status(201).json({ data: saved });
      } catch (error: any) {
        console.error('Failed to create schedule:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // PUT /schedules/:id
  router.put(
    '/schedules/:id',
    requireAuth,
    [param('id').isUUID(), handleValidationErrors],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const schedule = await scheduleRepo.findOne({ where: { id: req.params.id } });
        if (!schedule) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Schedule not found' } });
          return;
        }
        Object.assign(schedule, req.body);
        const saved = await scheduleRepo.save(schedule);
        res.json({ data: saved });
      } catch (error: any) {
        console.error('Failed to update schedule:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // DELETE /schedules/:id
  router.delete(
    '/schedules/:id',
    requireAuth,
    [param('id').isUUID(), handleValidationErrors],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const result = await scheduleRepo.delete(req.params.id);
        if (result.affected === 0) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Schedule not found' } });
          return;
        }
        res.json({ success: true });
      } catch (error: any) {
        console.error('Failed to delete schedule:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // ============================================================================
  // SHARED PLAYLISTS (공개 포럼)
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

  // POST /shared-playlists/:id/import - 가져오기
  router.post(
    '/shared-playlists/:id/import',
    requireAuth,
    [param('id').isUUID(), body('pharmacy_id').isUUID(), handleValidationErrors],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const original = await playlistRepo.findOne({
          where: { id: req.params.id, is_public: true },
        });
        if (!original) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Playlist not found' } });
          return;
        }

        // 원본 다운로드 카운트 증가
        await playlistRepo.increment({ id: req.params.id }, 'download_count', 1);

        // 복제
        const newPlaylist = playlistRepo.create({
          name: `${original.name} (복사본)`,
          description: original.description,
          pharmacy_id: req.body.pharmacy_id,
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
        console.error('Failed to import playlist:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  return router;
}
