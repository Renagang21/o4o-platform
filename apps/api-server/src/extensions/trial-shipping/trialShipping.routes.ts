/**
 * TrialShippingExtension - Routes
 *
 * H8-2: Trial 참여자 배송 주소 API 라우트
 *
 * @package H8-2 - TrialShippingExtension
 */

import { Router } from 'express';
import { TrialShippingController } from './trialShipping.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router: Router = Router();

// WO-O4O-NETURE-DISTRIBUTION-FUNDING-OFFLINE-OPERATION-SAFETY-V1:
// 무인증 노출 차단 — 모든 라우트에 인증 + 참여 당사자/운영자 권한 검사.

// POST /api/trial-shipping/:participationId - 배송 주소 등록 (참여 당사자 또는 운영자)
router.post('/:participationId', authenticate, TrialShippingController.requireOwnerOrOperator, TrialShippingController.setAddress);

// GET /api/trial-shipping/:participationId - 배송 주소 조회 (참여 당사자 또는 운영자)
router.get('/:participationId', authenticate, TrialShippingController.requireOwnerOrOperator, TrialShippingController.getAddress);

export default router;
