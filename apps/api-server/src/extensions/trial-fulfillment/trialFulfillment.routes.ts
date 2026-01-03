/**
 * TrialFulfillmentExtension - Routes
 *
 * H8-3: Trial 참여자 Fulfillment API 라우트
 *
 * @package H8-3 - TrialFulfillmentExtension
 */

import { Router } from 'express';
import { TrialFulfillmentController } from './trialFulfillment.controller.js';

const router: Router = Router();

// GET /api/trial-fulfillment/stats - 통계 조회 (participationId 라우트 앞에 위치해야 함)
router.get('/stats', TrialFulfillmentController.getStats);

// POST /api/trial-fulfillment/:participationId/init - Fulfillment 초기화
router.post('/:participationId/init', TrialFulfillmentController.initFulfillment);

// GET /api/trial-fulfillment/:participationId - Fulfillment 상태 조회
router.get('/:participationId', TrialFulfillmentController.getFulfillment);

// POST /api/trial-fulfillment/:participationId/create-order - 주문 생성
router.post('/:participationId/create-order', TrialFulfillmentController.createOrder);

// POST /api/trial-fulfillment/:participationId/sync-status - 배송 상태 동기화
router.post('/:participationId/sync-status', TrialFulfillmentController.syncStatus);

// POST /api/trial-fulfillment/:participationId/complete - 수동 완료 처리
router.post('/:participationId/complete', TrialFulfillmentController.completeFulfillment);

export default router;
