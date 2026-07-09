/**
 * ProductDescriptionReviewList Controller — 설명서 검토 목록 (admin, GET only)
 *
 * WO-O4O-ADMIN-DESCRIPTION-REVIEW-LIST-V1
 *
 * mount: /api/v1/admin/o4o-product-db/description-review-list
 *   GET /  — 검토 필요 설명서 통합 목록(SPD + OTC_DRAFT), 서버 페이지네이션/검색/필터
 *
 * 원칙: **read-only**. DB write 없음. 본문(content) 미전송 — summary 만.
 * 권한: description-dashboard 와 동일 ADMIN 롤셋.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import { ProductDescriptionReviewListService } from '../services/product-description-review-list.service.js';
import logger from '../../../utils/logger.js';

const ADMIN_ROLES = [
  'platform:admin',
  'platform:super_admin',
  'neture:admin',
  'neture:operator',
  'glycopharm:admin',
  'glycopharm:operator',
  'cosmetics:admin',
  'cosmetics:operator',
  'kpa-society:admin',
  'kpa-society:operator',
];

export function createProductDescriptionReviewListController(dataSource: DataSource): Router {
  const router = Router();
  const service = new ProductDescriptionReviewListService(dataSource);

  router.use(authenticate);
  router.use(requireRole(ADMIN_ROLES));

  router.get('/', async (req: Request, res: Response) => {
    try {
      const s = (k: string) => (typeof req.query[k] === 'string' ? (req.query[k] as string) : undefined);
      const result = await service.listReview({
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        q: s('q'),
        source: s('source'),
        status: s('status'),
        descriptionType: s('descriptionType'),
        category: s('category'),
        sort: s('sort'),
        order: s('order'),
      });
      res.json({ success: true, data: result });
    } catch (err) {
      logger.error('[product-description-review-list] failed:', err);
      res.status(500).json({
        success: false,
        error: '설명서 검토 목록 조회에 실패했습니다',
        code: 'DESC_REVIEW_LIST_FAILED',
      });
    }
  });

  return router;
}
