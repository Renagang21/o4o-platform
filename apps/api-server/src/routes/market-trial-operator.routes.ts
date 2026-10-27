import logger from '../utils/logger.js';
import {FundingOfflineOperationsService} from '../services/funding/funding-offline-operations.service.js';
import {AppDataSource} from '../database/connection.js';
import {FundingError} from '../services/funding/funding-workspace.service.js';
import {marketTrialNotification} from '../services/marketTrial.notification.js';
/**
 * Market Trial Operator Routes
 *
 * WO-O4O-MARKET-TRIAL-PHASE1-V1
 * WO-MARKET-TRIAL-NETURE-SINGLE-APPROVAL-TRANSITION-V1
 *
 * Neture operator 단일 승인:
 *   GET/PATCH /api/v1/neture/operator/market-trial/*
 */

import { Router } from 'express';
import { MarketTrialOperatorController } from '../controllers/market-trial/marketTrialOperatorController.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireFundingScope } from '../middleware/funding-service-scope.middleware.js';
// CodeQL 이 인식하는 limiter (선례: routes/admin/platform-accounts.routes.ts).
import { apiLimiter } from '../middleware/rateLimiter.js';

/**
 * Neture operator 1차 승인 라우터
 * Mount: /api/v1/neture/operator/market-trial
 */
export function createNetureOperatorTrialRoutes(): Router {
  const router = Router();

  // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §4:
  //   종전 `requireNetureScope('neture:operator')` → `requireFundingScope('funding:operator')`.
  //   주소(`funding.neture.co.kr`)가 독립이면 운영자 범위도 독립이어야 한다. 종전에는 Neture
  //   운영자 하나가 이 서브도메인까지 열었다.
  //   `platform:super_admin` 은 platformBypass 로 계속 통과하므로 역할 부여 전에도 잠기지 않는다.
  router.use(apiLimiter as any);
  router.use(requireAuth as any);
  router.use(requireFundingScope('funding:operator') as any);
  router.use(MarketTrialOperatorController.requireCurrentOperator);

  router.get('/', MarketTrialOperatorController.listAll);
  // WO-NETURE-MARKET-TRIAL-ANALYTICS-AND-KPI-V1: aggregate KPI (literal path — must precede /:id)
  router.get('/exceptions', MarketTrialOperatorController.listExceptions);
  router.get('/kpi', MarketTrialOperatorController.getKpi);
  // WO-MONITOR-1: 포럼 연계 실패 조회/resolve (리터럴 경로 — /:id 보다 앞에 위치)
  router.get('/forum-sync-failures', MarketTrialOperatorController.listForumSyncFailures);
  router.patch('/forum-sync-failures/:failureId/resolve', MarketTrialOperatorController.resolveForumSyncFailure);
  router.get('/:id/offline-operations', async (req, res) => {
    try {
      const data = await new FundingOfflineOperationsService(AppDataSource).snapshot(req.params.id, Number(req.query.page ?? 1), Number(req.query.historyPage ?? 1));
      res.json({ success: true, data });
    } catch (error) {
      res.status(error instanceof FundingError ? error.status : 500).json({ success: false, message: error instanceof FundingError ? error.message : '운영 기록 조회 실패' });
    }
  });
  router.post('/:id/offline-operations', async (req, res) => {
    try {
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        throw new FundingError(400, 'INVALID_OFFLINE_INPUT', '처리 내용을 확인해 주세요.');
      }
      const actor = (req as any).user.id;
      const data = await new FundingOfflineOperationsService(AppDataSource).update(req.params.id, req.body.participantId ?? null, actor, req.body);
      if (req.body.action === 'result') {
        void marketTrialNotification.onRecruitingResult(req.params.id, req.body.decision === 'met', actor)
          .catch(() => logger.warn('[Funding] Result notification failed', { trialId: req.params.id }));
      }
      res.json({ success: true, data });
    } catch (error) {
      res.status(error instanceof FundingError ? error.status : 500).json({ success: false, message: error instanceof FundingError ? error.message : '운영 기록 저장 실패' });
    }
  });
  router.get('/:id', MarketTrialOperatorController.getDetail);
  // WO-NETURE-MARKET-TRIAL-ANALYTICS-AND-KPI-V1: per-trial KPI
  router.get('/:id/kpi', MarketTrialOperatorController.getTrialKpi);
  // WO-MARKET-TRIAL-OPERATIONS-CONSOLIDATION-V1
  router.get('/:id/funnel', MarketTrialOperatorController.getFunnel);
  router.get('/:id/participants', MarketTrialOperatorController.listParticipants);
  router.get('/:id/participants/:participantId/history', MarketTrialOperatorController.participantHistory);
  router.get('/:id/participants/export', MarketTrialOperatorController.exportParticipantsCSV);
  // WO-MARKET-TRIAL-SETTLEMENT-AND-FULFILLMENT-MANAGEMENT-V1
  router.patch('/:id/participants/:participantId/reward-status', MarketTrialOperatorController.updateParticipantRewardStatus);
  // WO-O4O-MARKET-TRIAL-CONVERSION-COLUMNS-DROP-V1: 전환 상태/매장 진열(listing)/제품 전환(convert) route 제거 (content-only).
  // WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1
  router.patch('/:id/participants/:participantId/settlement-status', MarketTrialOperatorController.updateParticipantSettlementStatus);
  // WO-NETURE-MARKET-TRIAL-PAYMENT-READINESS-V1
  router.patch('/:id/participants/:participantId/payment-status', MarketTrialOperatorController.updateParticipantPaymentStatus);
  router.patch('/:id/status', MarketTrialOperatorController.updateTrialStatus);
  router.patch('/:id/approve', MarketTrialOperatorController.approve1st);
  // WO-O4O-MARKET-TRIAL-NETURE-FORUM-SYNC-RECOVERY-V1: 포럼 공고 게시 재시도 (멱등)
  // 상단 router.use(requireAuth) + requireFundingScope('funding:operator') 가 적용된다.
  router.post('/:id/forum-sync/retry', MarketTrialOperatorController.retryForumSync);
  router.patch('/:id/reject', MarketTrialOperatorController.reject1st);

  return router;
}

