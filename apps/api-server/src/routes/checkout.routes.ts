/**
 * Checkout Order Administration Routes
 *
 * WO-O4O-STORE-AND-PLATFORM-CONSUMER-COMMERCE-LEGACY-RETIREMENT-V1:
 *   `POST /initiate` · `POST /confirm` 제거 — 플랫폼 직접판매(`platform-seller`) 경로였고
 *   확정 사업 계약은 `PLATFORM_DIRECT_SALE_BUSINESS_CONTRACT = NONE` 이다
 *   (`O4O-STORE-COMMERCE-BOUNDARY-V1` §13-1). 프론트엔드 호출자 0건.
 *   남은 3개는 canonical 원장 `checkout_orders` 관리·조회 경로다.
 */

import { Router } from 'express';
import { CheckoutController } from '../controllers/checkout/checkoutController.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router: Router = Router();

/**
 * POST /api/checkout/refund
 * 환불 처리
 * - 운영자만 가능
 */
router.post('/refund', authenticate, CheckoutController.refund);

/**
 * GET /api/orders/:id
 * 주문 상세 조회
 */
router.get('/orders/:id', authenticate, CheckoutController.getOrder);

/**
 * GET /api/orders
 * 내 주문 목록 조회
 */
router.get('/orders', authenticate, CheckoutController.getOrders);

export default router;
