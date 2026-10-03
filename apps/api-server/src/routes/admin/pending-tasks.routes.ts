/**
 * Admin Pending Tasks Summary — 관리자 대기 업무 카운터
 *
 * WO-O4O-ADMIN-PENDING-WORK-COUNTER-AND-HEADER-ENTRY-V1
 *
 * admin-dashboard 헤더의 "검토 대기 N" 진입점용. 알림(notifications)이 아니라
 * "현재 남아 있는 업무 상태" 를 매 요청 시 COUNT 로 계산한다 (적재·읽음 처리 없음).
 *
 * GET /api/v1/admin/pending-tasks/summary
 *   productRegistrationRequests — 상품 등록 요청 검토 대기
 *     (= GET /api/v1/operator/store-product-requests?displayStatus=reviewing 의 total, platform admin 무제한 범위)
 *   manualReviews — 공급자 매장용 설명서 검수 대기
 *     (= GET /api/v1/admin/o4o-product-db/supplier-store-descriptions?status=needs_review 의 total)
 *
 * 권한: platform:super_admin (requireAdmin) — 두 원본 큐와 동일하게 서비스 범위 제한 없음.
 */

import { Router, type Request, type Response } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware.js';
import { apiLimiter } from '../../middleware/rateLimiter.js';
import { AppDataSource } from '../../database/connection.js';
import { SharedProductDescriptionService } from '../../modules/neture/services/shared-product-description.service.js';
import logger from '../../utils/logger.js';

// store-product-request-admin.controller.ts 의 STORE_REQUEST_SOURCE_LABEL · DISPLAY_TO_RAW.reviewing 과 동일 기준
const STORE_REQUEST_SOURCE_LABEL = 'kpa-store-product-request';
const STORE_REQUEST_REVIEWING_STATUSES = ['pending', 'reviewing'];

const router = Router();
router.use(apiLimiter);
router.use(authenticate);
router.use(requireAdmin);

router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const descriptionService = new SharedProductDescriptionService(AppDataSource);
    const [requestRows, reviewResult] = await Promise.all([
      AppDataSource.query(
        `SELECT COUNT(*)::int AS total
           FROM product_candidates pc
          WHERE pc.source_type = 'store_web'
            AND pc.source_label = $1
            AND pc.deleted_at IS NULL
            AND pc.candidate_status = ANY($2)`,
        [STORE_REQUEST_SOURCE_LABEL, STORE_REQUEST_REVIEWING_STATUSES],
      ) as Promise<Array<{ total: number }>>,
      descriptionService.listSupplierStoreReview({ status: 'needs_review', limit: 1 }),
    ]);

    const productRegistrationRequests = Number(requestRows[0]?.total ?? 0);
    const manualReviews = Number(reviewResult.total ?? 0);
    res.json({
      success: true,
      data: {
        productRegistrationRequests,
        manualReviews,
        total: productRegistrationRequests + manualReviews,
      },
    });
  } catch (error) {
    logger.error('[admin-pending-tasks] summary failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ success: false, error: '대기 업무 집계에 실패했습니다.', code: 'PENDING_TASKS_SUMMARY_FAILED' });
  }
});

export default router;
