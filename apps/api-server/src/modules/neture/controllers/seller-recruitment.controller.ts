/**
 * SellerRecruitmentController — 공급자 → 판매자(매장) 모집 API
 *
 * WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1
 *   구 partner-recruitment.controller.ts(WO-O4O-NETURE-PARTNER-CONTROLLER-SPLIT-V1) 를
 *   Seller Recruitment 도메인으로 분리했다. Legacy Partner 와 무관하다.
 *
 * Mount (neture.routes.ts):
 *   /api/v1/neture/seller-recruitment/*   ← canonical
 *   /api/v1/neture/partner/*              ← 은퇴 예정 alias. 매장 3서비스 web 이 같은 커밋에서 새 경로로
 *                                            옮겨갔으나 web/API Cloud Run 배포 순서가 독립이라 배포 창 동안
 *                                            404 를 막기 위해 유지한다. 후속 physical cleanup 에서 제거.
 *
 * Routes (relative):
 *   GET   /recruitments                       public browse (exposure=APPROVED 강제)
 *   GET   /recruitments/mine                  공급자 본인 모집 현황
 *   POST  /recruitments                       공급자 모집 생성
 *   PATCH /recruitments/:id/close | /reopen   공급자 마감/재개
 *   GET   /recruitments/:id/applications      공급자 신청자 목록
 *   GET   /applications/mine                  신청자(매장) 본인 신청 현황
 *   POST  /applications                       신청
 *   POST  /applications/:id/cancel            신청자 철회
 *   POST  /applications/:id/approve | /reject | /terminate   공급자 결정
 */
import { Router } from 'express';
import type { Request, Response, RequestHandler } from 'express';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../middleware/neture-identity.middleware.js';
import type { SellerRecruitmentService } from '../services/seller-recruitment.service.js';
import { RecruitmentStatus, ExposureStatus } from '../entities/index.js';
import logger from '../../../utils/logger.js';

export function createSellerRecruitmentController(deps: {
  sellerRecruitmentService: SellerRecruitmentService;
  requireActiveSupplier: RequestHandler;
}): Router {
  const router = Router();
  const { sellerRecruitmentService: service, requireActiveSupplier } = deps;

  const unauthorized = (res: Response) =>
    res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });

  // ==================== Recruitment ====================

  /**
   * GET /recruitments — 모집 목록 (public browse)
   * WO-O4O-SELLER-RECRUITMENT-EXPOSURE-BACKEND-V1: exposureStatus=APPROVED 강제, serviceKey scope(query)
   */
  router.get('/recruitments', async (req: Request, res: Response) => {
    try {
      const { status, serviceKey } = req.query;
      const filters: { status?: RecruitmentStatus; serviceKey?: string; exposureStatus?: ExposureStatus } = {
        // public browse 는 노출 승인된 모집만 — serviceKey 누락 시에도 미승인 모집은 절대 노출 금지
        exposureStatus: ExposureStatus.APPROVED,
      };
      if (status && typeof status === 'string') filters.status = status as RecruitmentStatus;
      if (serviceKey && typeof serviceKey === 'string') filters.serviceKey = serviceKey;
      const data = await service.getRecruitments(filters);
      res.json({ success: true, data });
    } catch (error) {
      logger.error('[SellerRecruitment API] Error fetching recruitments:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch recruitments' });
    }
  });

  /** GET /recruitments/mine — 공급자 본인 모집 현황 (WO-O4O-SELLER-RECRUITMENT-SUPPLIER-STATUS-VIEW-V1) */
  router.get('/recruitments/mine', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return unauthorized(res);
      const data = await service.getSupplierRecruitments(userId);
      res.json({ success: true, data });
    } catch (error) {
      logger.error('[SellerRecruitment API] Error fetching supplier recruitments:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch recruitments' });
    }
  });

  /** PATCH /recruitments/:recruitmentId/close (WO-O4O-SELLER-RECRUITMENT-CLOSE-ACTION-V1) */
  router.patch('/recruitments/:recruitmentId/close', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return unauthorized(res);
      const result = await service.closeRecruitment(req.params.recruitmentId, userId);
      if (!result.success) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '모집을 찾을 수 없습니다.' });
      }
      res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[SellerRecruitment API] Error closing recruitment:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to close recruitment' });
    }
  });

  /** PATCH /recruitments/:recruitmentId/reopen (WO-O4O-SELLER-RECRUITMENT-REOPEN-ACTION-V1) */
  router.patch('/recruitments/:recruitmentId/reopen', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return unauthorized(res);
      const result = await service.reopenRecruitment(req.params.recruitmentId, userId);
      if (!result.success) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '모집을 찾을 수 없습니다.' });
      }
      res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[SellerRecruitment API] Error reopening recruitment:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to reopen recruitment' });
    }
  });

  /** GET /recruitments/:recruitmentId/applications — 공급자 신청자 목록 (WO-O4O-SELLER-RECRUITMENT-SUPPLIER-APPLICATION-REVIEW-V1) */
  router.get('/recruitments/:recruitmentId/applications', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return unauthorized(res);
      const data = await service.getRecruitmentApplications(req.params.recruitmentId, userId);
      if (!data) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '모집을 찾을 수 없습니다.' });
      }
      res.json({ success: true, data });
    } catch (error) {
      logger.error('[SellerRecruitment API] Error fetching recruitment applications:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch applications' });
    }
  });

  /** POST /recruitments — 공급자 모집 생성 (WO-O4O-SELLER-RECRUITMENT-CREATION-FLOW-V1) */
  router.post('/recruitments', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return unauthorized(res);
      // WO-O4O-NETURE-SELLER-RECRUITMENT-MULTI-SERVICE-CREATE-V1: serviceKeys[](복수) + serviceKey 하위호환
      const { masterId, serviceKey, serviceKeys, commissionRate, consumerPrice, shopUrl, imageUrl } = req.body || {};
      const result = await service.createRecruitment(userId, {
        masterId, serviceKey, serviceKeys, commissionRate, consumerPrice, shopUrl, imageUrl,
      });
      if (!result.success) {
        const map: Record<string, [number, string]> = {
          MASTER_ID_REQUIRED: [400, '제품 정보가 필요합니다.'],
          SERVICE_KEY_REQUIRED: [400, '모집 대상 서비스를 선택해 주세요.'],
          OFFER_NOT_FOUND: [404, '등록된 제품(공급 오퍼)을 찾을 수 없습니다.'],
          OFFER_NOT_PRIVATE: [400, '판매자 모집은 PRIVATE(판매자 제한) 유통 제품만 가능합니다. 제품을 PRIVATE 유통으로 설정한 뒤 다시 시도해 주세요.'],
          DRUG_SERVICE_NOT_PHARMACY_AUDIENCE: [400, '의약품·규제 상품은 약국 대상 서비스에만 모집할 수 있습니다.'],
          RECRUITMENT_ALREADY_EXISTS: [409, '이미 이 제품의 판매자 모집이 존재합니다.'],
        };
        const [status, message] = map[result.error] || [400, '모집 생성에 실패했습니다.'];
        return res.status(status).json({ success: false, error: result.error, message });
      }
      res.status(201).json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[SellerRecruitment API] Error creating recruitment:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to create recruitment' });
    }
  });

  // ==================== Application ====================

  /** GET /applications/mine — 신청자 본인 신청 현황 (WO-O4O-MY-STORE-SELLER-RECRUITMENT-APPLICATION-STATUS-VIEW-V1) */
  router.get('/applications/mine', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return unauthorized(res);
      const data = await service.getApplicationsForApplicant(userId);
      res.json({ success: true, data });
    } catch (error) {
      logger.error('[SellerRecruitment API] Error fetching applications:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch applications' });
    }
  });

  /** POST /applications — 모집 신청 */
  router.post('/applications', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return unauthorized(res);
      const { recruitmentId } = req.body;
      if (!recruitmentId) {
        return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'recruitmentId is required' });
      }
      const result = await service.createApplication(recruitmentId, userId, req.user?.name || '');
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'RECRUITMENT_NOT_FOUND') {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '모집 공고를 찾을 수 없습니다.' });
      }
      if (msg === 'RECRUITMENT_CLOSED') {
        return res.status(400).json({ success: false, error: 'RECRUITMENT_CLOSED', message: '마감된 모집입니다.' });
      }
      if (msg === 'RECRUITMENT_NOT_EXPOSED') {
        return res.status(400).json({ success: false, error: 'RECRUITMENT_NOT_EXPOSED', message: '아직 서비스 노출 승인이 완료되지 않은 모집입니다.' });
      }
      if (msg === 'DUPLICATE_APPLICATION') {
        return res.status(409).json({ success: false, error: 'DUPLICATE_APPLICATION', message: '이미 신청한 모집입니다.' });
      }
      logger.error('[SellerRecruitment API] Error creating application:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to create application' });
    }
  });

  /** POST /applications/:id/cancel — 신청자 본인 pending 철회 (WO-O4O-SELLER-RECRUITMENT-APPLICATION-CANCEL-V1) */
  router.post('/applications/:id/cancel', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return unauthorized(res);
      const result = await service.cancelApplication(req.params.id, userId);
      if (!result.success) {
        const map: Record<string, [number, string]> = {
          APPLICATION_NOT_FOUND: [404, '신청을 찾을 수 없습니다.'],
          NOT_OWNER: [403, '본인 신청만 취소할 수 있습니다.'],
          NOT_PENDING: [400, '심사 대기 중인 신청만 취소할 수 있습니다.'],
        };
        const [status, message] = map[result.error] || [400, '신청 취소에 실패했습니다.'];
        return res.status(status).json({ success: false, error: result.error, message });
      }
      res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[SellerRecruitment API] Error cancelling application:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to cancel application' });
    }
  });

  /** POST /applications/:id/terminate — 승인 참여 해지 (WO-O4O-SELLER-RECRUITMENT-PARTICIPATION-TERMINATION-V1) */
  router.post('/applications/:id/terminate', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return unauthorized(res);
      const result = await service.terminateParticipation(req.params.id, userId);
      if (!result.success) {
        const map: Record<string, [number, string]> = {
          APPLICATION_NOT_FOUND: [404, '신청을 찾을 수 없습니다.'],
          NOT_OWNER: [403, '모집 주체만 참여를 해지할 수 있습니다.'],
          NOT_APPROVED: [400, '승인된 신청만 참여 해지할 수 있습니다.'],
        };
        const [status, message] = map[result.error] || [400, '참여 해지에 실패했습니다.'];
        return res.status(status).json({ success: false, error: result.error, message });
      }
      res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[SellerRecruitment API] Error terminating participation:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to terminate participation' });
    }
  });

  const decisionErrors = (res: Response, error: unknown, verb: string): void => {
    const msg = (error as Error).message;
    if (msg === 'APPLICATION_NOT_FOUND') {
      res.status(404).json({ success: false, error: 'NOT_FOUND', message: '신청을 찾을 수 없습니다.' });
      return;
    }
    if (msg === 'INVALID_STATUS') {
      res.status(400).json({ success: false, error: 'INVALID_STATUS', message: '승인/거절 가능한 상태가 아닙니다.' });
      return;
    }
    if (msg === 'NOT_RECRUITMENT_OWNER') {
      res.status(403).json({ success: false, error: 'FORBIDDEN', message: `모집 주체만 ${verb}할 수 있습니다.` });
      return;
    }
    logger.error(`[SellerRecruitment API] Error on application ${verb}:`, error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: `Failed to ${verb} application` });
  };

  /** POST /applications/:id/approve — 모집 주체 공급자 승인 */
  router.post('/applications/:id/approve', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return unauthorized(res);
      const result = await service.approveApplication(req.params.id, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      decisionErrors(res, error, '승인');
    }
  });

  /** POST /applications/:id/reject — 모집 주체 공급자 반려 */
  router.post('/applications/:id/reject', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return unauthorized(res);
      const { reason } = req.body || {};
      const result = await service.rejectApplication(req.params.id, userId, reason);
      res.json({ success: true, data: result });
    } catch (error) {
      decisionErrors(res, error, '반려');
    }
  });

  return router;
}
