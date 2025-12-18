/**
 * Admin Order Routes
 *
 * Phase N-2: 운영 안정화
 *
 * 운영자용 주문 관리 API 라우트
 */

import { Router } from 'express';
import { AdminOrderController } from '../controllers/admin/adminOrderController.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router: Router = Router();

/**
 * GET /api/admin/orders/stats
 * 주문 통계 (간단 버전)
 */
router.get('/stats', authenticate, AdminOrderController.getStats);

/**
 * GET /api/admin/orders
 * 주문 목록 조회
 */
router.get('/', authenticate, AdminOrderController.getOrders);

/**
 * GET /api/admin/orders/:id
 * 주문 상세 조회
 */
router.get('/:id', authenticate, AdminOrderController.getOrder);

/**
 * POST /api/admin/orders/:id/refund
 * 환불 처리
 */
router.post('/:id/refund', authenticate, AdminOrderController.refundOrder);

/**
 * GET /api/admin/orders/:id/logs
 * 주문 로그 조회
 */
router.get('/:id/logs', authenticate, AdminOrderController.getOrderLogs);

export default router;
