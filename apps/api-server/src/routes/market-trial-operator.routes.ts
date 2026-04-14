/**
 * Market Trial Operator Routes
 *
 * WO-O4O-MARKET-TRIAL-PHASE1-V1
 *
 * 1차 승인 (Neture operator):
 *   GET/PATCH /api/v1/neture/operator/market-trial/*
 *
 * 2차 승인 (Service operator):
 *   GET/PATCH /api/v1/:serviceKey/operator/market-trial/*
 */

import { Router } from 'express';
import { MarketTrialOperatorController } from '../controllers/market-trial/marketTrialOperatorController.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireNetureScope } from '../middleware/neture-scope.middleware.js';

/**
 * Neture operator 1차 승인 라우터
 * Mount: /api/v1/neture/operator/market-trial
 */
export function createNetureOperatorTrialRoutes(): Router {
  const router = Router();

  // All routes require auth + neture operator scope
  router.use(requireAuth as any);
  router.use(requireNetureScope('neture:operator') as any);

  router.get('/', MarketTrialOperatorController.listAll);
  router.get('/:id', MarketTrialOperatorController.getDetail);
  router.get('/:id/participants', MarketTrialOperatorController.listParticipants);
  router.get('/:id/participants/export', MarketTrialOperatorController.exportParticipantsCSV);
  router.patch('/:id/approve', MarketTrialOperatorController.approve1st);
  router.patch('/:id/reject', MarketTrialOperatorController.reject1st);

  return router;
}

/**
 * Service operator 2차 승인 라우터
 * Mount: /api/v1/:serviceKey/operator/market-trial
 *
 * serviceKey는 상위 라우터에서 이미 파싱됨 (req.params.serviceKey)
 * 인증: requireAuth만 적용. 서비스별 scope 체크는 컨트롤러에서 생략 (Phase 1 간소화).
 */
export function createServiceOperatorTrialRoutes(): Router {
  const router = Router({ mergeParams: true });

  router.use(requireAuth as any);

  router.get('/', MarketTrialOperatorController.listForService);
  router.get('/:id', MarketTrialOperatorController.getDetailForService);
  router.patch('/:id/approve', MarketTrialOperatorController.approve2nd);
  router.patch('/:id/reject', MarketTrialOperatorController.reject2nd);

  return router;
}
