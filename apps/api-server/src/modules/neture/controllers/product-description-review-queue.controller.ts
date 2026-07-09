/**
 * ProductDescriptionReviewQueue Controller — 설명서 검토 Queue (admin, GET only)
 *
 * WO-O4O-ADMIN-DESCRIPTION-REVIEW-QUEUE-V1
 *
 * mount: /api/v1/admin/o4o-product-db/description-review-queue
 *   GET /                — Group 중심 검토 Queue 목록(검색·필터·정렬·페이지)
 *   GET /filter-options  — source_label / review_status 분포(Toolbar 채움)
 *   GET /:draftId        — Group 상세(상담 블록 + 적용 대상 Master 목록) — 읽기 전용
 *
 * 원칙: **read-only**. Approve/Reject/Editor/Preview/History 없음. mutation 0.
 * 권한: description-dashboard / description-status 와 동일 ADMIN 롤셋.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import {
  ProductDescriptionReviewQueueService,
  type ReviewQueueParams,
} from '../services/product-description-review-queue.service.js';
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

const SORTS: NonNullable<ReviewQueueParams['sort']>[] = ['applied_master', 'updated_at', 'group'];
const SOURCE_STORES: NonNullable<ReviewQueueParams['sourceStore']>[] = ['all', 'otc_draft', 'spd'];

export function createProductDescriptionReviewQueueController(dataSource: DataSource): Router {
  const router = Router();
  const service = new ProductDescriptionReviewQueueService(dataSource);

  router.use(authenticate);
  router.use(requireRole(ADMIN_ROLES));

  router.get('/filter-options', async (_req: Request, res: Response) => {
    try {
      const data = await service.filterOptions();
      res.json({ success: true, data });
    } catch (err) {
      logger.error('[description-review-queue] filter-options failed:', err);
      res.status(500).json({ success: false, error: '필터 옵션 조회에 실패했습니다', code: 'REVIEW_QUEUE_FILTERS_FAILED' });
    }
  });

  router.get('/', async (req: Request, res: Response) => {
    try {
      const { q, source, status, sourceStore, descriptionType, sort, order, page, limit } = req.query as Record<string, string>;
      const pageNum = Math.max(parseInt(page || '1', 10) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit || '20', 10) || 20, 1), 100);
      const sortVal = SORTS.includes(sort as any) ? (sort as ReviewQueueParams['sort']) : undefined;
      const sourceStoreVal = SOURCE_STORES.includes(sourceStore as any) ? (sourceStore as ReviewQueueParams['sourceStore']) : undefined;
      const { items, total } = await service.list({
        q: q || undefined,
        source: source || undefined,
        status: status || undefined,
        sourceStore: sourceStoreVal,
        descriptionType: descriptionType || undefined,
        sort: sortVal,
        order: order === 'asc' ? 'asc' : 'desc',
        page: pageNum,
        limit: limitNum,
      });
      res.json({ success: true, data: items, meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
    } catch (err) {
      logger.error('[description-review-queue] list failed:', err);
      res.status(500).json({ success: false, error: '검토 Queue 조회에 실패했습니다', code: 'REVIEW_QUEUE_LIST_FAILED' });
    }
  });

  router.get('/:draftId', async (req: Request, res: Response) => {
    try {
      const detail = await service.detail(req.params.draftId);
      if (!detail) {
        res.status(404).json({ success: false, error: '검토 대상을 찾을 수 없습니다', code: 'REVIEW_QUEUE_NOT_FOUND' });
        return;
      }
      res.json({ success: true, data: detail });
    } catch (err) {
      logger.error('[description-review-queue] detail failed:', err);
      res.status(500).json({ success: false, error: '검토 상세 조회에 실패했습니다', code: 'REVIEW_QUEUE_DETAIL_FAILED' });
    }
  });

  return router;
}
