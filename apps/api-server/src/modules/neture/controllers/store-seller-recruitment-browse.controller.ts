/**
 * Store Seller Recruitment Browse Controller (KPA 매장 경영자 소비용)
 *
 * WO-O4O-KPA-SELLER-RECRUITMENT-STORE-CONSUMER-BROWSE-UI-V1
 *
 * KPA 매장 경영자(kpa:store_owner)가 서비스 운영자 승인 완료된 판매자 모집을 조회한다.
 *
 * backend 강제 조건(프론트 필터 의존 금지 — WO §10):
 *   - service_id = 'kpa-society'   (고정, 타 서비스 모집 미노출)
 *   - exposure_status = 'approved'  (미승인/반려/대기 미노출)
 *   - status = 'recruiting'         (종료/보관 모집 미노출)
 * 응답은 기존 getPartnerRecruitments (감사 필드 미포함) 재사용 — 운영자 검토 정보 노출 0.
 *
 * 신규 테이블·상태·승인 API·migration 없음. 참여(apply)는 기존 POST /neture/partner/applications 사용.
 */
import { Router, Request, Response, RequestHandler } from 'express';
import { NetureService } from '../neture.service.js';
import { ExposureStatus, RecruitmentStatus } from '../entities/index.js';
import { createRequireStoreOwner } from '../../../utils/store-owner.utils.js';
import type { DataSource } from 'typeorm';
import logger from '../../../utils/logger.js';

export function createStoreSellerRecruitmentBrowseController(
  dataSource: DataSource,
  authMiddleware: RequestHandler,
): Router {
  const router = Router();
  const netureService = new NetureService();
  // kpa:store_owner 만 통과 (cross-service leakage 차단)
  const requireStoreOwner = createRequireStoreOwner(dataSource, 'kpa') as RequestHandler;

  // GET /store/seller-recruitments — 승인·모집중 KPA 모집 목록 (매장 경영자 전용)
  router.get(
    '/store/seller-recruitments',
    authMiddleware,
    requireStoreOwner,
    async (_req: Request, res: Response): Promise<void> => {
      try {
        const data = await netureService.getPartnerRecruitments({
          serviceKey: 'kpa-society', // 고정 — 클라이언트 입력 무시
          exposureStatus: ExposureStatus.APPROVED, // 승인만
          status: RecruitmentStatus.RECRUITING, // 모집 중만
        });
        res.json({ success: true, data });
      } catch (error) {
        logger.error('[StoreSellerRecruitmentBrowse] Error listing:', error);
        res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
      }
    },
  );

  return router;
}
