/**
 * ProductDescriptionDashboard Controller — 설명서 운영 Dashboard (admin, GET only)
 *
 * WO-O4O-ADMIN-DESCRIPTION-DASHBOARD-V1
 *
 * mount: /api/v1/admin/o4o-product-db/description-dashboard
 *   GET /   — 설명서 운영 요약(summary/category/workflow/group/reviewer/source/display/recent)
 *
 * 원칙: **read-only**. 설명/ProductMaster/ProductCandidate mutation 없음.
 * 권한: description-status / shared-product-description 과 동일 ADMIN 롤셋.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import { ProductDescriptionDashboardService } from '../services/product-description-dashboard.service.js';
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

export function createProductDescriptionDashboardController(dataSource: DataSource): Router {
  const router = Router();
  const service = new ProductDescriptionDashboardService(dataSource);

  router.use(authenticate);
  router.use(requireRole(ADMIN_ROLES));

  router.get('/', async (_req: Request, res: Response) => {
    try {
      const data = await service.dashboard();
      res.json({ success: true, data });
    } catch (err) {
      logger.error('[product-description-dashboard] failed:', err);
      res.status(500).json({
        success: false,
        error: '설명서 운영 대시보드 집계에 실패했습니다',
        code: 'DESC_DASHBOARD_FAILED',
      });
    }
  });

  return router;
}
