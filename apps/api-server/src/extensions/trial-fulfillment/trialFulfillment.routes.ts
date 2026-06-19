/**
 * TrialFulfillmentExtension - Routes
 *
 * H8-3: Trial 참여자 Fulfillment API 라우트
 *
 * @package H8-3 - TrialFulfillmentExtension
 */

import { Router } from 'express';
import { TrialFulfillmentController } from './trialFulfillment.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../middleware/neture-scope.middleware.js';

const router: Router = Router();

// WO-O4O-NETURE-DISTRIBUTION-FUNDING-OFFLINE-OPERATION-SAFETY-V1:
// 무인증 노출 차단. 운영 액션(통계/초기화/주문생성/동기화/완료)은 Neture 운영자 전용,
// 참여자는 본인 fulfillment 상태 조회만 허용.
const operatorOnly = requireNetureScope('neture:operator') as any;

// GET /api/trial-fulfillment/stats - 통계 조회 (운영자 전용, participationId 라우트 앞에 위치)
router.get('/stats', authenticate, operatorOnly, TrialFulfillmentController.getStats);

// POST /api/trial-fulfillment/:participationId/init - Fulfillment 초기화 (운영자)
router.post('/:participationId/init', authenticate, operatorOnly, TrialFulfillmentController.initFulfillment);

// GET /api/trial-fulfillment/:participationId - Fulfillment 상태 조회 (참여 당사자 또는 운영자)
router.get('/:participationId', authenticate, TrialFulfillmentController.requireOwnerOrOperator, TrialFulfillmentController.getFulfillment);

// POST /api/trial-fulfillment/:participationId/create-order - 주문 생성 (운영자)
router.post('/:participationId/create-order', authenticate, operatorOnly, TrialFulfillmentController.createOrder);

// POST /api/trial-fulfillment/:participationId/sync-status - 배송 상태 동기화 (운영자)
router.post('/:participationId/sync-status', authenticate, operatorOnly, TrialFulfillmentController.syncStatus);

// POST /api/trial-fulfillment/:participationId/complete - 수동 완료 처리 (운영자)
router.post('/:participationId/complete', authenticate, operatorOnly, TrialFulfillmentController.completeFulfillment);

export default router;
