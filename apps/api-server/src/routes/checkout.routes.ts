/**
 * Checkout Routes
 *
 * Phase N-1: 실거래 MVP
 *
 * @package Phase N-1 - Checkout
 */

import { Router } from 'express';
import { CheckoutController } from '../controllers/checkout/checkoutController.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router: Router = Router();

/**
 * POST /api/checkout/initiate
 * 주문 생성 + 결제 준비
 * - 인증 필수
 */
router.post('/initiate', authenticate, CheckoutController.initiate);

/**
 * POST /api/checkout/confirm
 * 결제 승인 (Toss 결제 성공 후)
 * - 인증 불필요 (Toss redirect에서 호출)
 */
router.post('/confirm', CheckoutController.confirm);

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
