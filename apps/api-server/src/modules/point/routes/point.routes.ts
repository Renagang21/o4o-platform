/**
 * Point Routes — O4O Platform 공통 포인트 운영자 API
 *
 * WO-O4O-POINT-CORE-EXTENSION-V1
 *
 * POST /api/v1/points/admin/grant        — 수동 지급 (admin only)
 * POST /api/v1/points/admin/spend        — 수동 차감 (admin only)
 * GET  /api/v1/points/admin/transactions — 사용자 거래 이력 조회 (admin only)
 *                                          WO-O4O-POINT-TRANSACTION-VIEW-ADMIN-V1
 *
 * 사용자용 잔액/이력 조회는 기존 /api/v1/credits/* 가 그대로 제공.
 * 향후 명명 정리 단계에서 /api/v1/points/me 로 이관 예정.
 */

import { Router } from 'express';
import { PointAdminController } from '../controllers/PointAdminController.js';
import { PointBudgetController } from '../controllers/PointBudgetController.js';
import { requireAuth, requireAdmin } from '../../../common/middleware/auth.middleware.js';
import { asyncHandler } from '../../../middleware/error-handler.js';

const router: Router = Router();

// ── 포인트 지급/차감 (admin) ─────────────────────────────────────────────────
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

router.get(
  '/admin/transactions',
  requireAuth,
  requireAdmin,
  asyncHandler(PointAdminController.listTransactions),
);

// ── 서비스별 예산 관리 (WO-O4O-SERVICE-OPERATOR-POINT-BUDGET-PHASE1-V1) ──────
router.get(
  '/budget',
  requireAuth,
  requireAdmin,
  asyncHandler(PointBudgetController.listAll),
);

router.get(
  '/budget/:serviceKey',
  requireAuth,
  requireAdmin,
  asyncHandler(PointBudgetController.getSummary),
);

router.post(
  '/budget/:serviceKey/allocate',
  requireAuth,
  requireAdmin,
  asyncHandler(PointBudgetController.allocate),
);

router.get(
  '/budget/:serviceKey/transactions',
  requireAuth,
  requireAdmin,
  asyncHandler(PointBudgetController.listTransactions),
);

export default router;
