/**
 * ProductDescriptionStatus Controller — master 기준 설명 상태 통합 조회 (admin, GET only)
 *
 * WO-O4O-ADMIN-O4O-PRODUCT-DESCRIPTION-STATUS-UNIFIED-VIEW-V1
 *
 * mount: /api/v1/admin/o4o-product-db/description-status
 *   GET /          — master 기준 설명 상태 목록(canonical/needs_review/draft/none, 필터·검색·페이지)
 *   GET /summary   — finalStatus 별 집계
 *
 * 원칙: **read-only**. 설명/ProductMaster/ProductCandidate mutation 없음.
 * 권한: shared-product-description 과 동일 ADMIN 롤셋.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import {
  ProductDescriptionStatusService,
  type DescriptionFinalStatus,
} from '../services/product-description-status.service.js';
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

const FINAL_STATUSES: DescriptionFinalStatus[] = ['canonical', 'needs_review', 'draft', 'none'];

export function createProductDescriptionStatusController(dataSource: DataSource): Router {
  const router = Router();
  const service = new ProductDescriptionStatusService(dataSource);

  router.use(authenticate);
  router.use(requireRole(ADMIN_ROLES));

  router.get('/summary', async (_req: Request, res: Response) => {
    try {
      const summary = await service.summary();
      res.json({ success: true, data: summary });
    } catch (err) {
      logger.error('[product-description-status] summary failed:', err);
      res.status(500).json({ success: false, error: '설명 상태 집계에 실패했습니다', code: 'DESC_STATUS_SUMMARY_FAILED' });
    }
  });

  router.get('/', async (req: Request, res: Response) => {
    try {
      const { finalStatus, regulatoryType, sourceType, draftOnly, q, page, limit } =
        req.query as Record<string, string>;
      const pageNum = Math.max(parseInt(page || '1', 10) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit || '20', 10) || 20, 1), 100);
      const fs = finalStatus && FINAL_STATUSES.includes(finalStatus as DescriptionFinalStatus)
        ? (finalStatus as DescriptionFinalStatus)
        : undefined;
      const { items, total } = await service.list({
        finalStatus: fs,
        regulatoryType: regulatoryType || undefined,
        sourceType: sourceType || undefined,
        draftOnly: draftOnly === 'true',
        q: q || undefined,
        page: pageNum,
        limit: limitNum,
      });
      res.json({
        success: true,
        data: items,
        meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      });
    } catch (err) {
      logger.error('[product-description-status] list failed:', err);
      res.status(500).json({ success: false, error: '설명 상태 목록 조회에 실패했습니다', code: 'DESC_STATUS_LIST_FAILED' });
    }
  });

  return router;
}
