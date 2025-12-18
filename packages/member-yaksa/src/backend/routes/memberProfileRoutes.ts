/**
 * MemberProfile Routes
 *
 * 약사회 회원 프로필 API 라우트
 *
 * Base path: /api/v1/yaksa/member/profile
 *
 * 🔒 정책:
 * - GET /me: 내 프로필 조회
 * - PATCH /me: 내 프로필 수정 (약국 정보만, 면허번호/직역 수정 불가)
 * - GET /:userId: 특정 회원 프로필 조회 (관리자/본인)
 * - POST /sync-from-reporting: reporting-yaksa 연동 (시스템)
 *
 * @package @o4o-apps/member-yaksa
 * @phase 1
 */

import { Router, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { MemberProfileController, AuthenticatedRequest } from '../controllers/MemberProfileController.js';
import { MemberProfileService } from '../services/MemberProfileService.js';

/**
 * Create member profile routes
 *
 * @param dataSource - TypeORM DataSource
 * @param options - Route options
 */
export function createMemberProfileRoutes(
  dataSource: DataSource,
  options?: {
    /**
     * 상위에서 주입되는 인증 미들웨어
     */
    authMiddleware?: RequestHandler;
  }
): Router {
  const router = Router();

  // Initialize service and controller
  const profileService = new MemberProfileService(dataSource.manager);
  const profileController = new MemberProfileController(profileService);

  // Auth middleware (있으면 사용)
  const authMiddleware: RequestHandler = options?.authMiddleware || ((req, res, next) => next());

  // =====================================================
  // Profile Routes
  // =====================================================

  /**
   * GET /me
   * 내 프로필 조회
   */
  router.get(
    '/me',
    authMiddleware,
    (req, res) => profileController.getMyProfile(req as AuthenticatedRequest, res)
  );

  /**
   * PATCH /me
   * 내 프로필 수정 (약국 정보만)
   *
   * 🔒 정책:
   * - pharmacistLicenseNumber 수정 불가 (400 반환)
   * - occupationType 수정 불가 (400 반환)
   */
  router.patch(
    '/me',
    authMiddleware,
    (req, res) => profileController.updateMyProfile(req as AuthenticatedRequest, res)
  );

  /**
   * GET /:userId
   * 특정 회원 프로필 조회 (관리자/본인)
   */
  router.get(
    '/:userId',
    authMiddleware,
    (req, res) => profileController.getProfileByUserId(req as AuthenticatedRequest, res)
  );

  /**
   * POST /sync-from-reporting
   * reporting-yaksa 연동 (시스템/관리자)
   *
   * 🔒 정책:
   * - 시스템/관리자만 호출 가능
   * - 면허번호, 직역 변경 가능 (유일하게 허용)
   */
  router.post(
    '/sync-from-reporting',
    authMiddleware,
    (req, res) => profileController.syncFromReporting(req as AuthenticatedRequest, res)
  );

  return router;
}

export default createMemberProfileRoutes;
