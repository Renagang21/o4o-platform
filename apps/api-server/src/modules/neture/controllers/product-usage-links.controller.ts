/**
 * ProductUsageLinks Controller — ProductMaster 활용 연결 조회 (admin, GET only)
 *
 * WO-O4O-ADMIN-O4O-PRODUCT-USAGE-LINKS-READONLY-V1
 *
 * mount: /api/v1/admin/o4o-product-db/masters
 *   GET /:id/usage-links — 조직 상품 / 매장 경영활용 제품 / 자료함 콘텐츠 연결 조회
 *
 * 원칙: **read-only**. 연결 생성/수정/삭제·주문가능 전환 없음. 상품/매장/콘텐츠 mutation 0.
 * 권한: shared-product-description 과 동일 ADMIN 롤셋.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import { ProductUsageLinksService } from '../services/product-usage-links.service.js';
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

export function createProductUsageLinksController(dataSource: DataSource): Router {
  const router = Router();
  const service = new ProductUsageLinksService(dataSource);

  router.use(authenticate);
  router.use(requireRole(ADMIN_ROLES));

  router.get('/:id/usage-links', async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
      const data = await service.getUsageLinks(req.params.id, Number.isNaN(limit as number) ? undefined : limit);
      if (!data) {
        res.status(404).json({ success: false, error: '기본상품을 찾을 수 없습니다', code: 'MASTER_NOT_FOUND' });
        return;
      }
      res.json({ success: true, data });
    } catch (err) {
      logger.error('[product-usage-links] failed:', err);
      res.status(500).json({ success: false, error: '활용 연결 조회에 실패했습니다', code: 'USAGE_LINKS_FAILED' });
    }
  });

  return router;
}
