/**
 * Admin Dashboard Routes (P0)
 *
 * WO-ADMIN-API-IMPLEMENT-P0
 * Real database queries for Admin Dashboard
 */

import { Router, Response } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/auth.middleware.js';
import adminDashboardController from '../../controllers/admin/adminDashboardController.js';
import type { AuthRequest } from '../../types/auth.js';

const router: Router = Router();

/**
 * WO-O4O-ADMIN-PRODUCT-DESCRIPTION-ROUTE-AUTH-BOUNDARY-ALIGNMENT-V1
 *
 * 이 router 는 `/api/v1/admin` 에 mount 된다. path 없는 `router.use(...)` 로 가드를 걸면
 * **이 파일이 정의하지 않은 경로까지** 가드가 먼저 실행돼, 뒤에 mount 되는
 * `/api/v1/admin/o4o-product-db/*` 등 하위 라우터의 자체 권한 계약
 * (`requireRole(ADMIN_ROLES)` — service admin/operator 허용)이 무효화된다.
 *
 * 그래서 가드를 **이 router 가 실제로 소유한 prefix 로만** 한정한다.
 * 여기 걸린 API 의 super_admin 전용 경계(`requireAdmin` = `platform:super_admin`)는 그대로다.
 * 새 최상위 prefix 를 추가하면 이 배열에도 같이 추가해야 한다.
 */
const OWNED_PREFIXES = ['/dashboard', '/system', '/partners', '/cosmetics'];

router.use(OWNED_PREFIXES, authenticate);
router.use(OWNED_PREFIXES, requireAdmin);

/**
 * Dashboard APIs
 */

// GET /api/v1/admin/dashboard/sales-summary
// Returns aggregated sales data from real orders
router.get(
  '/dashboard/sales-summary',
  (req, res: Response) => adminDashboardController.getSalesSummary(req as AuthRequest, res)
);

// GET /api/v1/admin/dashboard/order-status
// Returns order status distribution (real counts)
router.get(
  '/dashboard/order-status',
  (req, res: Response) => adminDashboardController.getOrderStatus(req as AuthRequest, res)
);

// GET /api/v1/admin/dashboard/user-growth
// Returns user registration counts by day/week
router.get(
  '/dashboard/user-growth',
  (req, res: Response) => adminDashboardController.getUserGrowth(req as AuthRequest, res)
);

/**
 * System APIs
 */

// GET /api/v1/admin/system/health
// Returns system health status
router.get(
  '/system/health',
  (req, res: Response) => adminDashboardController.getSystemHealth(req as AuthRequest, res)
);

/**
 * Partner APIs
 */

// GET /api/v1/admin/partners
// Returns partner list
router.get(
  '/partners',
  (req, res: Response) => adminDashboardController.getPartners(req as AuthRequest, res)
);

// GET /api/v1/admin/partners/:id/summary
// Returns partner performance summary
router.get(
  '/partners/:id/summary',
  (req, res: Response) => adminDashboardController.getPartnerSummary(req as AuthRequest, res)
);

/**
 * Cosmetics APIs
 */

// GET /api/v1/admin/cosmetics/partner-metrics
// Returns cosmetics partner metrics
router.get(
  '/cosmetics/partner-metrics',
  (req, res: Response) => adminDashboardController.getCosmeticsPartnerMetrics(req as AuthRequest, res)
);

export default router;
