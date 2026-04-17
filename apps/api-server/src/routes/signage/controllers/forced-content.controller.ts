/**
 * Signage Forced Content Controller
 *
 * WO-KPA-SIGNAGE-FORCED-CONTENT-IMPLEMENTATION-V1
 *
 * Operator manages global forced content that is automatically injected
 * into all store playlists for the matching service_key at query time.
 *
 * Routes (all requireSignageOperator):
 *   GET    /hq/forced-content         — list forced content
 *   POST   /hq/forced-content         — create
 *   PATCH  /hq/forced-content/:id     — update
 *   DELETE /hq/forced-content/:id     — soft delete
 */

import type { Request, Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';

function detectVideoSourceType(url: string): { sourceType: 'youtube' | 'vimeo'; embedId: string } {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (ytMatch) return { sourceType: 'youtube', embedId: ytMatch[1] };

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return { sourceType: 'vimeo', embedId: vimeoMatch[1] };

  throw Object.assign(new Error('유튜브 또는 비메오 URL만 등록할 수 있습니다'), {
    code: 'UNSUPPORTED_VIDEO_SOURCE',
    statusCode: 400,
  });
}

export class SignageForcedContentController {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * GET /hq/forced-content
   * List all forced content for the service
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { serviceKey } = req.params;

      const rows = await this.dataSource.query(
        `SELECT
           id,
           title,
           video_url AS "videoUrl",
           source_type AS "sourceType",
           embed_id AS "embedId",
           thumbnail_url AS "thumbnailUrl",
           start_at AS "startAt",
           end_at AS "endAt",
           is_active AS "isActive",
           note,
           created_at AS "createdAt",
           updated_at AS "updatedAt"
         FROM signage_forced_content
         WHERE service_key = $1 AND deleted_at IS NULL
         ORDER BY start_at DESC`,
        [serviceKey],
      );

      res.json({ success: true, data: rows });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /hq/forced-content
   * Create forced content
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { serviceKey } = req.params;
      const userId = (req as any).user?.id;
      const { title, videoUrl, thumbnailUrl, startAt, endAt, note } = req.body;

      if (!title?.trim()) {
        res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'title is required' } });
        return;
      }
      if (!videoUrl?.trim()) {
        res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'videoUrl is required' } });
        return;
      }
      if (!startAt || !endAt) {
        res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'startAt and endAt are required' } });
        return;
      }
      if (new Date(startAt) >= new Date(endAt)) {
        res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'startAt must be before endAt' } });
        return;
      }

      let sourceType: string;
      let embedId: string;
      try {
        const detected = detectVideoSourceType(videoUrl);
        sourceType = detected.sourceType;
        embedId = detected.embedId;
      } catch (err: any) {
        res.status(400).json({ success: false, error: { code: err.code || 'UNSUPPORTED_VIDEO_SOURCE', message: err.message } });
        return;
      }

      const rows = await this.dataSource.query(
        `INSERT INTO signage_forced_content
           (service_key, title, video_url, source_type, embed_id, thumbnail_url, start_at, end_at, note, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING
           id,
           title,
           video_url AS "videoUrl",
           source_type AS "sourceType",
           embed_id AS "embedId",
           thumbnail_url AS "thumbnailUrl",
           start_at AS "startAt",
           end_at AS "endAt",
           is_active AS "isActive",
           note,
           created_at AS "createdAt"`,
        [serviceKey, title.trim(), videoUrl.trim(), sourceType, embedId, thumbnailUrl || null, startAt, endAt, note || null, userId || null],
      );

      res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /hq/forced-content/:id
   * Update forced content
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { serviceKey, id } = req.params;
      const { title, videoUrl, thumbnailUrl, startAt, endAt, isActive, note } = req.body;

      const sets: string[] = ['updated_at = NOW()'];
      const params: any[] = [id, serviceKey];

      if (title !== undefined) {
        params.push(title.trim());
        sets.push(`title = $${params.length}`);
      }

      if (videoUrl !== undefined) {
        let sourceType: string;
        let embedId: string;
        try {
          const detected = detectVideoSourceType(videoUrl);
          sourceType = detected.sourceType;
          embedId = detected.embedId;
        } catch (err: any) {
          res.status(400).json({ success: false, error: { code: err.code || 'UNSUPPORTED_VIDEO_SOURCE', message: err.message } });
          return;
        }
        params.push(videoUrl.trim());
        sets.push(`video_url = $${params.length}`);
        params.push(sourceType);
        sets.push(`source_type = $${params.length}`);
        params.push(embedId);
        sets.push(`embed_id = $${params.length}`);
      }

      if (thumbnailUrl !== undefined) {
        params.push(thumbnailUrl || null);
        sets.push(`thumbnail_url = $${params.length}`);
      }
      if (startAt !== undefined) {
        params.push(startAt);
        sets.push(`start_at = $${params.length}`);
      }
      if (endAt !== undefined) {
        params.push(endAt);
        sets.push(`end_at = $${params.length}`);
      }
      if (isActive !== undefined) {
        params.push(!!isActive);
        sets.push(`is_active = $${params.length}`);
      }
      if (note !== undefined) {
        params.push(note || null);
        sets.push(`note = $${params.length}`);
      }

      if (sets.length === 1) {
        res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Nothing to update' } });
        return;
      }

      const rows = await this.dataSource.query(
        `UPDATE signage_forced_content
         SET ${sets.join(', ')}
         WHERE id = $1 AND service_key = $2 AND deleted_at IS NULL
         RETURNING
           id,
           title,
           video_url AS "videoUrl",
           source_type AS "sourceType",
           embed_id AS "embedId",
           thumbnail_url AS "thumbnailUrl",
           start_at AS "startAt",
           end_at AS "endAt",
           is_active AS "isActive",
           note,
           updated_at AS "updatedAt"`,
        params,
      );

      if (rows.length === 0) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Forced content not found' } });
        return;
      }

      res.json({ success: true, data: rows[0] });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /hq/forced-content/:id
   * Soft delete forced content
   */
  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { serviceKey, id } = req.params;

      const rows = await this.dataSource.query(
        `UPDATE signage_forced_content
         SET deleted_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND service_key = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, serviceKey],
      );

      if (rows.length === 0) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Forced content not found' } });
        return;
      }

      res.json({ success: true, data: { id, deleted: true } });
    } catch (error) {
      next(error);
    }
  };
}
