/**
 * ProductContentBrowse Controller — 제품 콘텐츠 통합 browse (admin/operator, GET only)
 *
 * WO-O4O-OPERATOR-PRODUCT-CONTENT-HUB-BROWSE-UNIFY-V1 (A안)
 *
 * mount: /api/v1/admin/o4o-product-db/product-contents
 *   GET /         — 통합 목록(q/productMasterId/source/status/language/serviceKey/hasProductMaster/page/limit)
 *   GET /facets   — source/contentKind 분포
 *
 * 원칙: **read-only**. 콘텐츠 생성/복사/승인/canonical 변경 없음. mutation 0.
 * 권한: 기존 o4o-product-db read-only 계열(description-status/review-queue)과 동일 ADMIN 롤셋
 *   (neture:operator 등 operator 롤 포함 → operator 도 사용 가능).
 * 라우트 결정: 기존 operator API prefix와 충돌 피하고, 동일 read-only 콘솔 패턴을 재사용.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import { ProductContentBrowseService } from '../services/product-content-browse.service.js';
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

export function createProductContentBrowseController(dataSource: DataSource): Router {
  const router = Router();
  const service = new ProductContentBrowseService(dataSource);

  router.use(authenticate);
  router.use(requireRole(ADMIN_ROLES));

  router.get('/facets', async (_req: Request, res: Response) => {
    try {
      const data = await service.facets();
      res.json({ success: true, data });
    } catch (err) {
      logger.error('[product-content-browse] facets failed:', err);
      res.status(500).json({ success: false, error: '제품 콘텐츠 분포 조회에 실패했습니다', code: 'PRODUCT_CONTENT_FACETS_FAILED' });
    }
  });

  router.get('/', async (req: Request, res: Response) => {
    try {
      const { q, productMasterId, source, status, language, serviceKey, hasProductMaster, page, limit } =
        req.query as Record<string, string>;
      const pageNum = Math.max(parseInt(page || '1', 10) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit || '20', 10) || 20, 1), 100);
      const hpm = hasProductMaster === 'true' ? true : hasProductMaster === 'false' ? false : undefined;
      const { items, total } = await service.list({
        q: q || undefined,
        productMasterId: productMasterId || undefined,
        source: source || undefined,
        status: status || undefined,
        language: language || undefined,
        serviceKey: serviceKey || undefined,
        hasProductMaster: hpm,
        page: pageNum,
        limit: limitNum,
      });
      res.json({ success: true, data: items, meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
    } catch (err) {
      logger.error('[product-content-browse] list failed:', err);
      res.status(500).json({ success: false, error: '제품 콘텐츠 통합 조회에 실패했습니다', code: 'PRODUCT_CONTENT_BROWSE_FAILED' });
    }
  });

  return router;
}
