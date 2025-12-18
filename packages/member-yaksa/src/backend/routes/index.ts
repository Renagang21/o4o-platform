/**
 * member-yaksa Routes
 *
 * Phase 1: MemberProfile API 구현
 *
 * Base path: /api/v1/yaksa/member
 *
 * @package @o4o-apps/member-yaksa
 * @phase 1
 */

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { createMemberProfileRoutes } from './memberProfileRoutes.js';

/**
 * Create member-yaksa routes
 *
 * @param dataSource - TypeORM DataSource
 * @param options - Route options
 */
export function createMemberRoutes(
  dataSource?: DataSource,
  options?: {
    authMiddleware?: RequestHandler;
  }
): Router {
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
      phase: 1,
      status: 'development',
      message: 'member-yaksa is running (Phase 1 - MemberProfile)',
    });
  });

  // =====================================================
  // Profile Routes (Phase 1)
  // =====================================================

  if (dataSource) {
    // MemberProfile API 라우트 연결
    router.use('/profile', createMemberProfileRoutes(dataSource, options));
  } else {
    // DataSource 없을 때 placeholder
    router.use('/profile', (_req: Request, res: Response) => {
      res.status(503).json({
        success: false,
        error: 'SERVICE_UNAVAILABLE',
        message: 'DataSource not initialized',
      });
    });
  }

  // =====================================================
  // Home Routes (Phase 2+)
  // =====================================================

  /**
   * GET /home
   * 통합 홈 화면 데이터
   *
   * Phase 1: Placeholder
   * Phase 2+: 공지, 공동구매, 교육, 게시판 데이터 통합
   */
  router.get('/home', (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Home endpoint - Implementation in Phase 2+',
      data: {
        notice: [],       // Phase 2+: Organization notices
        groupbuy: [],     // Phase 2+: Active campaigns
        lms: [],          // Phase 2+: Pending courses
        forum: [],        // Phase 2+: Recent posts
        banner: [],       // Phase 2+: Banners
      },
    });
  });

  // =====================================================
  // Pharmacy Routes (Alias to Profile)
  // =====================================================

  /**
   * GET /pharmacy
   * 약국 정보 조회 (Profile의 약국 정보 반환)
   *
   * Note: 약국 정보는 MemberProfile 엔티티에 포함
   */
  router.get('/pharmacy', (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: '약국 정보는 /profile/me API를 사용하세요',
      redirect: '/api/v1/yaksa/member/profile/me',
    });
  });

  return router;
}

export { createMemberProfileRoutes } from './memberProfileRoutes.js';

export default createMemberRoutes;
