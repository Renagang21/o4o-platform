/**
 * Signage Public Routes
 *
 * WO-APP-SIGNAGE-PUBLIC-API-PHASE1-V1
 * 인증 없이 접근 가능한 사이니지 콘텐츠 조회 API.
 *
 * Base path: /api/signage/:serviceKey/public
 *
 * "보기는 누구나, 관리는 권한자만" 원칙 적용
 */
import { Router, Request, Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import { validateServiceKey } from '../../middleware/signage-role.middleware.js';

interface PublicQueryParams {
  source?: string;
  limit?: string;
  page?: string;
}

/**
 * Create Public Signage Routes
 *
 * NO authentication required - public read-only access.
 */
export function createSignagePublicRoutes(dataSource: DataSource): Router {
  const router = Router({ mergeParams: true });

  // Service key validation only (no auth)
  router.use(validateServiceKey);

  /**
   * GET /api/signage/:serviceKey/public/media
   *
   * 공개 미디어 목록 조회
   * - source: hq, supplier, community (default: all)
   * - status: active only
   */
  router.get('/media', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const serviceKey = req.params.serviceKey;
      const { source, limit = '20', page = '1' } = req.query as PublicQueryParams;

      const limitNum = Math.min(parseInt(limit) || 20, 50);
      const pageNum = parseInt(page) || 1;
      const offset = (pageNum - 1) * limitNum;

      // Build source filter
      let sourceFilter = '';
      const params: any[] = [serviceKey];

      if (source && ['hq', 'supplier', 'community'].includes(source)) {
        sourceFilter = 'AND source = $2';
        params.push(source);
      } else {
        // Default: public sources only
        sourceFilter = 'AND source IN ($2, $3, $4)';
        params.push('hq', 'supplier', 'community');
      }

      const limitIndex = params.length + 1;
      const offsetIndex = params.length + 2;
      params.push(limitNum, offset);

      const media = await dataSource.query(`
        SELECT
          id, name, "mediaType", "sourceUrl" as url, "thumbnailUrl",
          duration, width, height, "ownerType", tags, metadata,
          "createdAt", "updatedAt"
        FROM signage_media
        WHERE "serviceKey" = $1 ${sourceFilter} AND status = 'active'
        ORDER BY "createdAt" DESC
        LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `, params);

      // Get total count
      const countParams = params.slice(0, -2); // Remove limit/offset
      const countResult = await dataSource.query(`
        SELECT COUNT(*) as total
        FROM signage_media
        WHERE "serviceKey" = $1 ${sourceFilter} AND status = 'active'
      `, countParams);

      const total = parseInt(countResult[0]?.total || '0', 10);

      res.json({
        items: media,
        total,
        page: pageNum,
        limit: limitNum,
        hasNext: offset + media.length < total,
        hasPrev: pageNum > 1,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/signage/:serviceKey/public/playlists
   *
   * 공개 플레이리스트 목록 조회
   * - source: hq, supplier, community (default: all)
   * - status: active only
   */
  router.get('/playlists', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const serviceKey = req.params.serviceKey;
      const { source, limit = '20', page = '1' } = req.query as PublicQueryParams;

      const limitNum = Math.min(parseInt(limit) || 20, 50);
      const pageNum = parseInt(page) || 1;
      const offset = (pageNum - 1) * limitNum;

      // Build source filter
      let sourceFilter = '';
      const params: any[] = [serviceKey];

      if (source && ['hq', 'supplier', 'community'].includes(source)) {
        sourceFilter = 'AND source = $2';
        params.push(source);
      } else {
        // Default: public sources only
        sourceFilter = 'AND source IN ($2, $3, $4)';
        params.push('hq', 'supplier', 'community');
      }

      const limitIndex = params.length + 1;
      const offsetIndex = params.length + 2;
      params.push(limitNum, offset);

      const playlists = await dataSource.query(`
        SELECT
          id, name, description, "defaultDuration", "defaultTransition",
          "totalDuration", "itemCount", "isActive", "isLoop", tags, metadata,
          "createdAt", "updatedAt"
        FROM signage_playlists
        WHERE "serviceKey" = $1 ${sourceFilter} AND status = 'active'
        ORDER BY "createdAt" DESC
        LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `, params);

      // Get total count
      const countParams = params.slice(0, -2);
      const countResult = await dataSource.query(`
        SELECT COUNT(*) as total
        FROM signage_playlists
        WHERE "serviceKey" = $1 ${sourceFilter} AND status = 'active'
      `, countParams);

      const total = parseInt(countResult[0]?.total || '0', 10);

      res.json({
        items: playlists,
        total,
        page: pageNum,
        limit: limitNum,
        hasNext: offset + playlists.length < total,
        hasPrev: pageNum > 1,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/signage/:serviceKey/public/media/:id
   *
   * 공개 미디어 단일 조회
   */
  router.get('/media/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const serviceKey = req.params.serviceKey;
      const { id } = req.params;

      const media = await dataSource.query(`
        SELECT
          id, name, "mediaType", "sourceUrl" as url, "thumbnailUrl",
          duration, width, height, "ownerType", tags, metadata,
          "createdAt", "updatedAt"
        FROM signage_media
        WHERE id = $1 AND "serviceKey" = $2
          AND source IN ('hq', 'supplier', 'community')
          AND status = 'active'
      `, [id, serviceKey]);

      if (!media.length) {
        res.status(404).json({ error: 'Media not found' });
        return;
      }

      res.json({ data: media[0] });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/signage/:serviceKey/public/playlists/:id
   *
   * 공개 플레이리스트 단일 조회 (아이템 포함)
   */
  router.get('/playlists/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const serviceKey = req.params.serviceKey;
      const { id } = req.params;

      const playlists = await dataSource.query(`
        SELECT
          id, name, description, "defaultDuration", "defaultTransition",
          "totalDuration", "itemCount", "isActive", "isLoop", tags, metadata,
          "createdAt", "updatedAt"
        FROM signage_playlists
        WHERE id = $1 AND "serviceKey" = $2
          AND source IN ('hq', 'supplier', 'community')
          AND status = 'active'
      `, [id, serviceKey]);

      if (!playlists.length) {
        res.status(404).json({ error: 'Playlist not found' });
        return;
      }

      // Fetch playlist items with media
      const items = await dataSource.query(`
        SELECT
          pi.id, pi."displayOrder", pi."displayDuration", pi."transitionEffect",
          m.id as "mediaId", m.name as "mediaName", m."mediaType",
          m."sourceUrl" as "mediaUrl", m."thumbnailUrl" as "mediaThumbnailUrl",
          m.duration as "mediaDuration"
        FROM signage_playlist_items pi
        LEFT JOIN signage_media m ON pi."mediaId" = m.id
        WHERE pi."playlistId" = $1 AND pi."isActive" = true
        ORDER BY pi."displayOrder" ASC
      `, [id]);

      res.json({
        data: {
          ...playlists[0],
          items: items.map((item: any) => ({
            id: item.id,
            displayOrder: item.displayOrder,
            displayDuration: item.displayDuration,
            transitionEffect: item.transitionEffect,
            media: item.mediaId ? {
              id: item.mediaId,
              name: item.mediaName,
              mediaType: item.mediaType,
              url: item.mediaUrl,
              thumbnailUrl: item.mediaThumbnailUrl,
              duration: item.mediaDuration,
            } : null,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
