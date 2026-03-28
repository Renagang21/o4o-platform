/**
 * CareGuidelineController — 가이드라인 검색 API
 *
 * WO-O4O-CARE-GUIDELINE-SEARCH-V1
 *
 * GET /guidelines       — 검색 (키워드, 타겟, 태그)
 * GET /guidelines/:id   — 상세
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate } from '../../../middleware/auth.middleware.js';
import logger from '../../../utils/logger.js';

export function createCareGuidelineRouter(dataSource: DataSource): Router {
  const router = Router();

  /**
   * GET /guidelines
   * Query: q, target, tags, limit, offset
   */
  router.get('/guidelines', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
      const { q, target, tags, limit: limitStr, offset: offsetStr } = req.query as Record<string, string | undefined>;
      const limit = Math.min(parseInt(limitStr || '20', 10), 100);
      const offset = parseInt(offsetStr || '0', 10);

      const conditions: string[] = [
        `type = 'guide'`,
        `status = 'published'`,
      ];
      const params: any[] = [];
      let paramIdx = 1;

      // target filter (patient | pharmacist)
      if (target && (target === 'patient' || target === 'pharmacist')) {
        conditions.push(`metadata->>'guidelineTarget' = $${paramIdx++}`);
        params.push(target);
      }

      // keyword search (title + summary ILIKE)
      if (q && q.trim()) {
        const keyword = `%${q.trim()}%`;
        conditions.push(`(title ILIKE $${paramIdx} OR summary ILIKE $${paramIdx})`);
        params.push(keyword);
        paramIdx++;
      }

      // tags filter (metadata->'tags' ?| array)
      if (tags && tags.trim()) {
        const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
        if (tagArray.length > 0) {
          conditions.push(`metadata->'tags' ?| $${paramIdx++}::text[]`);
          params.push(tagArray);
        }
      }

      const whereClause = conditions.join(' AND ');

      // Count
      const countResult = await dataSource.query(
        `SELECT COUNT(*)::int AS total FROM cms_contents WHERE ${whereClause}`,
        params,
      );
      const total = countResult[0]?.total || 0;

      // Data
      params.push(limit, offset);
      const data = await dataSource.query(
        `SELECT id, title, summary, metadata, "imageUrl",
                "publishedAt", "updatedAt", "isPinned", "sortOrder"
         FROM cms_contents
         WHERE ${whereClause}
         ORDER BY "isPinned" DESC, "sortOrder" ASC, "publishedAt" DESC NULLS LAST
         LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
        params,
      );

      res.json({
        success: true,
        data,
        pagination: { total, limit, offset },
      });
    } catch (error) {
      logger.error('[CareGuideline] Error searching guidelines:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * GET /guidelines/:id
   */
  router.get('/guidelines/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const rows = await dataSource.query(
        `SELECT id, title, summary, body, "bodyBlocks", metadata, "imageUrl",
                attachments, "publishedAt", "updatedAt"
         FROM cms_contents
         WHERE id = $1 AND type = 'guide' AND status = 'published'`,
        [id],
      );

      if (rows.length === 0) {
        res.status(404).json({ success: false, error: 'GUIDELINE_NOT_FOUND' });
        return;
      }

      res.json({ success: true, data: rows[0] });
    } catch (error) {
      logger.error('[CareGuideline] Error fetching guideline:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  return router;
}
