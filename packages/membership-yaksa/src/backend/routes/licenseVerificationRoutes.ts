/**
 * Membership-Yaksa License Verification Routes
 *
 * /api/membership/license-verification
 *
 * Phase 2: 면허 진위 확인 라우트
 */

import { Router } from 'express';
import { DataSource } from 'typeorm';
import { LicenseVerificationController } from '../controllers/LicenseVerificationController.js';
import { LicenseVerificationService } from '../services/LicenseVerificationService.js';

export function createLicenseVerificationRoutes(dataSource: DataSource): Router {
  const router = Router();
  const verificationService = new LicenseVerificationService(dataSource);
  const verificationController = new LicenseVerificationController(verificationService);

  /**
   * POST /api/membership/license-verification/requests
   * 면허 검증 요청 생성
   */
  router.post('/requests', (req, res) => verificationController.createRequest(req, res));

  /**
   * GET /api/membership/license-verification/requests
   * 대기 중인 검증 요청 목록 조회
   */
  router.get('/requests', (req, res) => verificationController.listPending(req, res));

  /**
   * GET /api/membership/license-verification/stats
   * 검증 통계 조회
   */
  router.get('/stats', (req, res) => verificationController.getStats(req, res));

  /**
   * POST /api/membership/license-verification/bulk-requests
   * 일괄 검증 요청 생성
   */
  router.post('/bulk-requests', (req, res) => verificationController.createBulkRequests(req, res));

  /**
   * GET /api/membership/license-verification/requests/:id
   * 검증 요청 상세 조회
   */
  router.get('/requests/:id', (req, res) => verificationController.getRequest(req, res));

  /**
   * POST /api/membership/license-verification/requests/:id/verify
   * 검증 수행 (외부 API 사용)
   */
  router.post('/requests/:id/verify', (req, res) => verificationController.performVerification(req, res));

  /**
   * POST /api/membership/license-verification/requests/:id/manual-verify
   * 수동 검증 처리
   */
  router.post('/requests/:id/manual-verify', (req, res) => verificationController.processManualVerification(req, res));

  /**
   * POST /api/membership/license-verification/requests/:id/fail
   * 검증 실패 처리
   */
  router.post('/requests/:id/fail', (req, res) => verificationController.markAsFailed(req, res));

  return router;
}

/**
 * 회원별 면허 검증 라우트
 * /api/membership/members/:memberId/license-verification
 */
export function createMemberLicenseVerificationRoutes(dataSource: DataSource): Router {
  const router = Router({ mergeParams: true });
  const verificationService = new LicenseVerificationService(dataSource);
  const verificationController = new LicenseVerificationController(verificationService);

  /**
   * GET /api/membership/members/:memberId/license-verification
   * 회원의 면허 검증 이력 조회
   */
  router.get('/', (req, res) => verificationController.getMemberVerifications(req, res));

  /**
   * GET /api/membership/members/:memberId/license-verification/status
   * 회원의 면허 검증 상태 조회
   */
  router.get('/status', (req, res) => verificationController.getMemberVerificationStatus(req, res));

  return router;
}
