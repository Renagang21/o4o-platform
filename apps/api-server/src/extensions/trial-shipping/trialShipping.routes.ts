/**
 * TrialShippingExtension - Routes
 *
 * H8-2: Trial 참여자 배송 주소 API 라우트
 *
 * @package H8-2 - TrialShippingExtension
 */

import { Router } from 'express';
import { TrialShippingController } from './trialShipping.controller.js';

const router: Router = Router();

// POST /api/trial-shipping/:participationId - 배송 주소 등록
router.post('/:participationId', TrialShippingController.setAddress);

// GET /api/trial-shipping/:participationId - 배송 주소 조회
router.get('/:participationId', TrialShippingController.getAddress);

export default router;
