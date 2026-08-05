/**
 * ProductImageQuality Controller — ProductMaster 이미지 상태 조회 (admin, GET only)
 *
 * WO-O4O-ADMIN-O4O-PRODUCT-IMAGE-QUALITY-SHELL-V1
 *
 * mount: /api/v1/admin/o4o-product-db/image-quality
 *   GET /          — 이미지 상태 목록(has_representative_image/has_images_no_representative/missing_image)
 *   GET /summary   — imageStatus 별 집계
 *
 * 원칙: **read-only**. 이미지 업로드/교체/삭제·AI 보정 없음. 상품/이미지/미디어 mutation 0.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import { ProductImageQualityService, type ImageStatus } from '../services/product-image-quality.service.js';
import logger from '../../../utils/logger.js';

const ADMIN_ROLES = [
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

const IMAGE_STATUSES: ImageStatus[] = ['has_representative_image', 'has_images_no_representative', 'missing_image'];

export function createProductImageQualityController(dataSource: DataSource): Router {
  const router = Router();
  const service = new ProductImageQualityService(dataSource);

  router.use(authenticate);
  router.use(requireRole(ADMIN_ROLES));

  router.get('/summary', async (_req: Request, res: Response) => {
    try {
      res.json({ success: true, data: await service.summary() });
    } catch (err) {
      logger.error('[product-image-quality] summary failed:', err);
      res.status(500).json({ success: false, error: '이미지 상태 집계에 실패했습니다', code: 'IMAGE_QUALITY_SUMMARY_FAILED' });
    }
  });

  router.get('/', async (req: Request, res: Response) => {
    try {
      const { imageStatus, regulatoryType, hasRepresentative, q, page, limit } = req.query as Record<string, string>;
      const pageNum = Math.max(parseInt(page || '1', 10) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit || '20', 10) || 20, 1), 100);
      const st = imageStatus && IMAGE_STATUSES.includes(imageStatus as ImageStatus) ? (imageStatus as ImageStatus) : undefined;
      const { items, total } = await service.list({
        imageStatus: st,
        regulatoryType: regulatoryType || undefined,
        hasRepresentative: hasRepresentative === 'true' ? true : hasRepresentative === 'false' ? false : undefined,
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
      logger.error('[product-image-quality] list failed:', err);
      res.status(500).json({ success: false, error: '이미지 상태 목록 조회에 실패했습니다', code: 'IMAGE_QUALITY_LIST_FAILED' });
    }
  });

  return router;
}
