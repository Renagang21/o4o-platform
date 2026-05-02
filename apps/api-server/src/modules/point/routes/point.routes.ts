/**
 * Point Routes — O4O Platform 공통 포인트 운영자 API
 *
 * WO-O4O-POINT-CORE-EXTENSION-V1
 *
 * POST /api/v1/points/admin/grant — 수동 지급 (admin only)
 * POST /api/v1/points/admin/spend — 수동 차감 (admin only)
 *
 * 사용자용 잔액/이력 조회는 기존 /api/v1/credits/* 가 그대로 제공.
 * 향후 명명 정리 단계에서 /api/v1/points/me 로 이관 예정.
 */

import { Router } from 'express';
import { PointAdminController } from '../controllers/PointAdminController.js';
import { requireAuth, requireAdmin } from '../../../common/middleware/auth.middleware.js';
import { asyncHandler } from '../../../middleware/error-handler.js';

const router: Router = Router();

router.post(
  '/admin/grant',
  requireAuth,
  requireAdmin,
  asyncHandler(PointAdminController.grant),
);

router.post(
  '/admin/spend',
  requireAuth,
  requireAdmin,
  asyncHandler(PointAdminController.spend),
);

export default router;
