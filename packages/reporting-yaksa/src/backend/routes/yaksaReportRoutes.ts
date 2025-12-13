import { Router } from 'express';
import { yaksaReportController } from '../controllers/YaksaReportController.js';

/**
 * YaksaReport Routes
 *
 * forum-yaksa RPA 기반 신고서 API 라우트
 *
 * 모든 엔드포인트는 operator/administrator 권한 필요
 */
export function createYaksaReportRoutes(): Router {
  const router = Router();

  /**
   * GET /api/v1/yaksa/reports/stats
   * 대시보드 통계 (목록보다 먼저 정의)
   */
  router.get('/stats', (req, res, next) =>
    yaksaReportController.getStats(req, res, next)
  );

  /**
   * GET /api/v1/yaksa/reports
   * 신고서 목록 조회
   *
   * Query params:
   * - status: DRAFT | REVIEWED | APPROVED | REJECTED (쉼표로 다중 선택 가능)
   * - reportType: PROFILE_UPDATE | LICENSE_CHANGE | WORKPLACE_CHANGE | AFFILIATION_CHANGE
   * - memberId: 회원 ID 필터
   * - page: 페이지 번호 (기본값: 1)
   * - limit: 페이지당 항목 수 (기본값: 20, 최대: 100)
   * - sortBy: createdAt | confidence | updatedAt
   * - sortOrder: ASC | DESC
   */
  router.get('/', (req, res, next) =>
    yaksaReportController.listReports(req, res, next)
  );

  /**
   * GET /api/v1/yaksa/reports/:id
   * 신고서 상세 조회
   */
  router.get('/:id', (req, res, next) =>
    yaksaReportController.getReport(req, res, next)
  );

  /**
   * POST /api/v1/yaksa/reports/from-post/:postId
   * forum 게시글로부터 신고서 초안 생성
   *
   * Body:
   * - memberId: string (필수)
   * - reportType: YaksaReportType (필수)
   * - payload: object (필수)
   * - confidence: number (선택, 0-1)
   * - triggerSnapshot: object (선택)
   * - memberSnapshot: object (선택)
   */
  router.post('/from-post/:postId', (req, res, next) =>
    yaksaReportController.createFromPost(req, res, next)
  );

  /**
   * PUT /api/v1/yaksa/reports/:id
   * 신고서 수정
   *
   * Body:
   * - payload: object (선택)
   * - operatorNotes: string (선택)
   */
  router.put('/:id', (req, res, next) =>
    yaksaReportController.updateReport(req, res, next)
  );

  /**
   * POST /api/v1/yaksa/reports/:id/approve
   * 신고서 승인
   */
  router.post('/:id/approve', (req, res, next) =>
    yaksaReportController.approveReport(req, res, next)
  );

  /**
   * POST /api/v1/yaksa/reports/:id/reject
   * 신고서 반려
   *
   * Body:
   * - reason: string (필수)
   */
  router.post('/:id/reject', (req, res, next) =>
    yaksaReportController.rejectReport(req, res, next)
  );

  return router;
}
