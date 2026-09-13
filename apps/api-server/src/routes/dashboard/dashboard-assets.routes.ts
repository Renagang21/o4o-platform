/**
 * Dashboard Assets Routes — signal 2개만 남긴 라우터
 *
 * WO-O4O-CMS-LEGACY-MEDIA-ASSET-TO-MEDIA-V2-CANONICALIZATION-FINAL-CLOSURE-V1:
 *   cms_media 기반 자료함 라우트(GET / · /copied-source-ids · /kpi · POST /copy · PATCH /:id ·
 *   POST /:id/publish · /:id/archive · DELETE /:id)와 그 핸들러 파일(copy · mutation · types),
 *   dashboard-access.guard 를 제거했다. 대체 alias · fallback 없음.
 *
 *   /supplier-signal · /seller-signal 은 product_approvals 기반이라 무관하며 경로 그대로 보존한다.
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate } from '../../middleware/auth.middleware.js';
import {
  createGetSupplierSignalHandler,
  createGetSellerSignalHandler,
} from './dashboard-assets.query-handlers.js';

export function createDashboardAssetsRoutes(dataSource: DataSource): Router {
  const router = Router();
  router.get('/supplier-signal', authenticate, createGetSupplierSignalHandler(dataSource));
  router.get('/seller-signal', authenticate, createGetSellerSignalHandler(dataSource));
  return router;
}
