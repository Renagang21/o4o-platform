/**
 * member-yaksa Routes
 *
 * Phase 0: 라우트 스켈레톤
 * - 실제 구현은 Phase 1 이후
 * - 라우트 존재 확인만 가능
 *
 * Base path: /api/v1/yaksa/member
 */

import { Router, Request, Response } from 'express';

/**
 * Create member-yaksa routes
 *
 * Phase 0: Placeholder routes only
 * Full implementation in Phase 1+
 */
export function createMemberRoutes(): Router {
  const router = Router();

  // =====================================================
  // Health Check
  // =====================================================

  /**
   * GET /health
   * Health check endpoint
   */
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      success: true,
      app: 'member-yaksa',
      version: '1.0.0',
      phase: 0,
      status: 'development',
      message: 'member-yaksa is running (Phase 0 - Skeleton)',
    });
  });

  // =====================================================
  // Home Routes (Phase 1+)
  // =====================================================

  /**
   * GET /home
   * 통합 홈 화면 데이터
   *
   * Phase 0: Placeholder
   * Phase 1+: 공지, 공동구매, 교육, 게시판 데이터 통합
   */
  router.get('/home', (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Home endpoint - Implementation in Phase 1+',
      data: {
        notice: [],       // Phase 1+: Organization notices
        groupbuy: [],     // Phase 1+: Active campaigns
        lms: [],          // Phase 1+: Pending courses
        forum: [],        // Phase 1+: Recent posts
        banner: [],       // Phase 1+: Banners
      },
    });
  });

  // =====================================================
  // Profile Routes (Phase 1+)
  // =====================================================

  /**
   * GET /profile
   * 회원 프로필 조회
   *
   * Phase 0: Placeholder
   * Phase 1+: 면허번호(읽기전용), 기본 정보 반환
   */
  router.get('/profile', (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Profile endpoint - Implementation in Phase 1+',
      data: {
        // Phase 1+: MemberProfile entity
        // pharmacistLicenseNumber: READ-ONLY
      },
    });
  });

  /**
   * PUT /profile
   * 회원 프로필 수정 (본인만)
   *
   * Phase 0: Placeholder
   * Phase 1+: 본인 정보만 수정 가능 (면허번호 제외)
   */
  router.put('/profile', (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Profile update endpoint - Implementation in Phase 1+',
    });
  });

  // =====================================================
  // Pharmacy Routes (Phase 1+)
  // =====================================================

  /**
   * GET /pharmacy
   * 약국 정보 조회
   *
   * Phase 0: Placeholder
   * Phase 1+: 본인 약국 정보 반환
   */
  router.get('/pharmacy', (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Pharmacy endpoint - Implementation in Phase 1+',
      data: {
        // Phase 1+: PharmacyInfo entity
        // 본인만 수정 가능
      },
    });
  });

  /**
   * PUT /pharmacy
   * 약국 정보 수정 (본인만)
   *
   * Phase 0: Placeholder
   * Phase 1+: 본인 약국 정보만 수정 가능
   *
   * Policy:
   * - 관리자 수정 불가 (Privacy Protection)
   * - 수정 시 "본인 책임" 안내 필수
   */
  router.put('/pharmacy', (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Pharmacy update endpoint - Implementation in Phase 1+',
      warning: 'Pharmacy information can only be modified by the owner',
    });
  });

  return router;
}

export default createMemberRoutes;
