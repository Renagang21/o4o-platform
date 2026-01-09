/**
 * Signage Controller
 * 사이니지 API 엔드포인트 (채널, 내 사이니지 편성)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { DisplayPlaylist, DisplayMedia, DisplayPlaylistItem } from '../entities/index.js';
import { GlycopharmPharmacy } from '../entities/glycopharm-pharmacy.entity.js';
import type { AuthRequest } from '../../../types/auth.js';

type AuthMiddleware = RequestHandler;

interface SignageChannel {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
}

interface SignageItem {
  id: string;
  contentId: string;
  channel: string;
  order: number;
  isActive: boolean;
  content: {
    id: string;
    title: string;
    type: 'video' | 'lms' | 'link';
    source: string;
    sourceName: string;
    duration?: number;
    thumbnailUrl?: string;
    isForced: boolean;
  };
}

export function createSignageController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware
): Router {
  const router = Router();
  const pharmacyRepo = dataSource.getRepository(GlycopharmPharmacy);
  const playlistRepo = dataSource.getRepository(DisplayPlaylist);
  const mediaRepo = dataSource.getRepository(DisplayMedia);
  const playlistItemRepo = dataSource.getRepository(DisplayPlaylistItem);

  /**
   * GET /signage/channels
   * 사이니지 채널 목록 조회
   */
  router.get('/channels', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      // 기본 채널 목록 반환 (추후 DB 기반으로 확장 가능)
      const channels: SignageChannel[] = [
        { id: 'ch1', name: 'TV1', description: '메인 디스플레이', isDefault: true },
        { id: 'ch2', name: 'TV2', description: '대기실 디스플레이', isDefault: false },
      ];

      res.json({ success: true, data: channels });
    } catch (error: any) {
      console.error('Failed to get signage channels:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /signage/my-signage
   * 내 사이니지 편성 목록 조회
   */
  router.get('/my-signage', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      // Find pharmacy owned by user
      const pharmacy = await pharmacyRepo.findOne({
        where: { created_by_user_id: userId },
      });

      if (!pharmacy) {
        // 약국이 없으면 빈 목록 반환
        res.json({ success: true, data: [] });
        return;
      }

      // 약국의 플레이리스트 및 아이템 조회
      const playlists = await playlistRepo.find({
        where: { pharmacy_id: pharmacy.id },
      });

      if (playlists.length === 0) {
        res.json({ success: true, data: [] });
        return;
      }

      // 플레이리스트 아이템 조회
      const items: SignageItem[] = [];
      for (const playlist of playlists) {
        const playlistItems = await playlistItemRepo.find({
          where: { playlist_id: playlist.id },
          order: { sort_order: 'ASC' },
        });

        for (const item of playlistItems) {
          const media = await mediaRepo.findOne({
            where: { id: item.media_id },
          });

          if (media) {
            items.push({
              id: item.id,
              contentId: media.id,
              channel: 'TV1', // 기본 채널 (추후 확장)
              order: item.sort_order,
              isActive: true,
              content: {
                id: media.id,
                title: media.name,
                type: 'video',
                source: media.source_type,
                sourceName: media.source_type === 'youtube' ? 'YouTube' : media.source_type,
                duration: media.duration || undefined,
                thumbnailUrl: media.thumbnail_url || undefined,
                isForced: false,
              },
            });
          }
        }
      }

      res.json({ success: true, data: items });
    } catch (error: any) {
      console.error('Failed to get my signage:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * PUT /signage/my-signage
   * 내 사이니지 편성 저장
   */
  router.put('/my-signage', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const { items } = req.body as { items: Array<{ id: string; contentId: string; channel: string; order: number; isActive: boolean }> };

      // Find pharmacy owned by user
      const pharmacy = await pharmacyRepo.findOne({
        where: { created_by_user_id: userId },
      });

      if (!pharmacy) {
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Pharmacy not found' },
        });
        return;
      }

      // 기존 플레이리스트 찾기 또는 생성
      let playlist = await playlistRepo.findOne({
        where: { pharmacy_id: pharmacy.id },
      });

      if (!playlist) {
        playlist = playlistRepo.create({
          name: '기본 플레이리스트',
          pharmacy_id: pharmacy.id,
          status: 'active',
          is_public: false,
          created_by: userId,
        });
        playlist = await playlistRepo.save(playlist);
      }

      // 기존 아이템 삭제 후 새로 저장
      await playlistItemRepo.delete({ playlist_id: playlist.id });

      for (const item of items) {
        await playlistItemRepo.save({
          playlist_id: playlist.id,
          media_id: item.contentId,
          sort_order: item.order,
        });
      }

      res.json({ success: true, message: 'Signage saved successfully' });
    } catch (error: any) {
      console.error('Failed to save my signage:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  return router;
}
