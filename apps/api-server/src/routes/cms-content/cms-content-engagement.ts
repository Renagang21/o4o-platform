/**
 * CMS Content Engagement — 추천(recommend) / 조회수(view)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6 (audit #28)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 신규 table 이 없는가
 *
 *   `cms_contents."viewCount"` 컬럼과 `cms_content_recommendations` table 은
 *   migration `20260210000001-AddContentViewCountAndRecommendations` 로 **이미 존재**한다.
 *   지금까지 소비하는 route 가 하나도 없어 dead schema 였을 뿐이다.
 *   따라서 이 파일은 schema/migration 을 0 으로 두고 **소비자만** 추가한다.
 *   (§6 "`pharmacy_hub_contents` 신규 table 을 만들지 않는다" 와 같은 결론)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 서비스 분기가 없는가
 *
 *   원장이 `cms_contents` 인 모든 서비스에 동일하게 적용된다. `serviceKey` 로 갈리는
 *   코드가 없다 — KPA/GP/KCos 는 각자 `{service}_contents` 원장을 쓰므로 이 경로를
 *   애초에 타지 않는다. 기존 3서비스 behavior 변화 = 0.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 계약은 KPA 정본과 같다 (`kpa.routes.ts` contentRouter)
 *
 *   POST /cms/contents/:id/view       → { viewCount }
 *   POST /cms/contents/:id/recommend  → { recommendCount, isRecommendedByMe }
 *
 *   가시성 판정도 상세(GET /cms/contents/:id)와 같은 경계를 쓴다:
 *   published 가 아니면 **작성자 본인만** 접근할 수 있고, 그 외에는 존재를 노출하지
 *   않기 위해 canonical 404 로 응답한다.
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import logger from '../../utils/logger.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NOT_FOUND = {
  success: false,
  error: { code: 'NOT_FOUND', message: 'Content not found' },
} as const;

export interface CmsEngagementCounts {
  viewCount: number;
  recommendCount: number;
  isRecommendedByMe: boolean;
}

/**
 * 목록/상세 응답에 붙일 engagement 수치.
 *
 * 실패를 0 으로 위장하지 않는다 — 조회가 실패하면 `null` 을 돌려주고 호출부는
 * 해당 필드를 **생략**한다. "추천 0 · 조회 0" 처럼 보이게 만들지 않는다.
 */
export async function loadCmsEngagement(
  dataSource: DataSource,
  contentIds: string[],
  userId: string | null,
): Promise<Map<string, CmsEngagementCounts> | null> {
  const ids = contentIds.filter((id) => UUID_REGEX.test(id));
  if (ids.length === 0) return new Map();
  if (typeof (dataSource as any).query !== 'function') return null;

  try {
    const rows: any[] = await dataSource.query(
      `SELECT c.id,
              c."viewCount"                          AS view_count,
              COALESCE(r.cnt, 0)::int                AS recommend_count,
              COALESCE(mine.mine, false)             AS is_recommended_by_me
         FROM cms_contents c
         LEFT JOIN (
           SELECT content_id, COUNT(*)::int AS cnt
             FROM cms_content_recommendations
            GROUP BY content_id
         ) r ON r.content_id = c.id
         LEFT JOIN (
           SELECT content_id, true AS mine
             FROM cms_content_recommendations
            WHERE user_id = $2
         ) mine ON mine.content_id = c.id
        WHERE c.id = ANY($1::uuid[])`,
      [ids, userId],
    );
    const map = new Map<string, CmsEngagementCounts>();
    for (const row of rows) {
      map.set(String(row.id), {
        viewCount: Number(row.view_count ?? 0),
        recommendCount: Number(row.recommend_count ?? 0),
        isRecommendedByMe: row.is_recommended_by_me === true,
      });
    }
    return map;
  } catch (error: any) {
    logger.warn('[CMS] engagement counts unavailable:', error?.message ?? error);
    return null;
  }
}

export function createCmsContentEngagementRoutes(deps: { dataSource: DataSource }): Router {
  const router = Router();
  const { dataSource } = deps;

  /** 상세와 같은 가시성 경계. 보이지 않으면 null (호출부는 404). */
  const loadVisible = async (id: string, userId: string | null) => {
    const rows: any[] = await dataSource.query(
      `SELECT id, status, "authorRole", "createdBy" FROM cms_contents WHERE id = $1 LIMIT 1`,
      [id],
    );
    const row = rows[0];
    if (!row) return null;
    if (row.status === 'published') return row;
    if (userId && row.createdBy === userId) return row;
    return null;
  };

  /**
   * POST /cms/contents/:id/view
   * 조회수 +1. 비로그인도 집계한다 (KPA `POST /contents/:id/view` 와 동일).
   */
  router.post('/contents/:id/view', optionalAuth, async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (!UUID_REGEX.test(id)) {
      res.status(404).json(NOT_FOUND);
      return;
    }
    try {
      const userId = (req as any).user?.id ?? null;
      const content = await loadVisible(id, userId);
      if (!content) {
        res.status(404).json(NOT_FOUND);
        return;
      }
      const updated: any[] = await dataSource.query(
        `UPDATE cms_contents SET "viewCount" = COALESCE("viewCount", 0) + 1 WHERE id = $1 RETURNING "viewCount"`,
        [id],
      );
      res.json({ success: true, data: { viewCount: Number(updated?.[0]?.viewCount ?? 0) } });
    } catch (error: any) {
      logger.error('[CMS] Failed to increment view count:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * POST /cms/contents/:id/recommend
   * 1인 1추천 toggle. unique(contentId, userId) 는 이미 table 제약으로 있다.
   */
  router.post('/contents/:id/recommend', authenticate, async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
      });
      return;
    }
    if (!UUID_REGEX.test(id)) {
      res.status(404).json(NOT_FOUND);
      return;
    }
    try {
      const content = await loadVisible(id, userId);
      if (!content) {
        res.status(404).json(NOT_FOUND);
        return;
      }

      const existing: any[] = await dataSource.query(
        `SELECT id FROM cms_content_recommendations WHERE content_id = $1 AND user_id = $2 LIMIT 1`,
        [id, userId],
      );

      let isRecommendedByMe: boolean;
      if (existing.length > 0) {
        await dataSource.query(
          `DELETE FROM cms_content_recommendations WHERE content_id = $1 AND user_id = $2`,
          [id, userId],
        );
        isRecommendedByMe = false;
      } else {
        // 동시 요청이 unique 제약에 걸려 500 이 되지 않게 한다 — toggle 은 멱등이어야 한다.
        await dataSource.query(
          `INSERT INTO cms_content_recommendations (content_id, user_id)
           VALUES ($1, $2)
           ON CONFLICT (content_id, user_id) DO NOTHING`,
          [id, userId],
        );
        isRecommendedByMe = true;
      }

      const counted: any[] = await dataSource.query(
        `SELECT COUNT(*)::int AS count FROM cms_content_recommendations WHERE content_id = $1`,
        [id],
      );

      res.json({
        success: true,
        data: { recommendCount: Number(counted?.[0]?.count ?? 0), isRecommendedByMe },
      });
    } catch (error: any) {
      logger.error('[CMS] Failed to toggle recommendation:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  return router;
}
