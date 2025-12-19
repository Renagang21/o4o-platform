import type { Router, Request, Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import { LicenseQueryService } from '../services/license-query.service.js';
import { PharmacyInfoService } from '../services/pharmacy-info.service.js';
import { MemberProfileService } from '../services/member-profile.service.js';
import { MemberHomeQueryService } from '../home/member-home-query.service.js';
import { UX_PRIORITY } from '../home/dto.js';

/**
 * Member-Yaksa Routes
 *
 * Phase 1: Core API Endpoints
 * Phase 2: Home Read Model
 *
 * Policy Enforcement:
 * - All endpoints require authentication
 * - All data access is scoped to self (본인 데이터만)
 * - License number: READ-ONLY (no update endpoint)
 * - Pharmacy info: Member-only edit (no admin override)
 *
 * @see manifest.ts - Policy Fixation
 */

/**
 * Auth Request Type
 * Extends Express Request with authenticated user info
 */
interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    roles?: string[];
  };
}

/**
 * Authentication Guard
 * Ensures user is logged in
 */
function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || !req.user.id) {
    res.status(401).json({
      success: false,
      error: '로그인이 필요합니다.',
    });
    return;
  }
  next();
}

/**
 * Create member-yaksa routes
 */
export function createMemberYaksaRoutes(router: Router, dataSource: DataSource): Router {
  // Initialize services (Phase 1)
  const licenseService = new LicenseQueryService(dataSource);
  const pharmacyService = new PharmacyInfoService(dataSource);
  const profileService = new MemberProfileService(dataSource);

  // Initialize services (Phase 2)
  const homeQueryService = new MemberHomeQueryService(dataSource);

  // ===== Profile Routes =====

  /**
   * GET /api/v1/member/profile
   * 본인 프로필 조회
   */
  router.get('/api/v1/member/profile', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const result = await profileService.getMyProfile(userId);

      res.json({
        success: true,
        data: result.profile,
        policies: result.policies,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        error: error.message,
      });
    }
  });

  // ===== License Routes =====

  /**
   * GET /api/v1/member/license
   * 본인 면허번호 조회 (READ-ONLY)
   */
  router.get('/api/v1/member/license', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const result = await licenseService.getMyLicenseNumber(userId);

      res.json({
        success: true,
        data: {
          licenseNumber: result.licenseNumber,
          licenseIssuedAt: result.licenseIssuedAt,
          licenseRenewalAt: result.licenseRenewalAt,
          isVerified: result.isVerified,
        },
        policy: {
          editable: false,
          message: result.message,
        },
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        error: error.message,
      });
    }
  });

  // ⚠️ NO PUT/PATCH for license - Intentionally omitted per policy

  // ===== Pharmacy Routes =====

  /**
   * GET /api/v1/member/pharmacy
   * 본인 약국 정보 조회
   */
  router.get('/api/v1/member/pharmacy', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const result = await pharmacyService.getMyPharmacyInfo(userId);

      res.json({
        success: true,
        data: result.data,
        canEdit: result.canEdit,
        editWarning: result.editWarning,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * PATCH /api/v1/member/pharmacy
   * 본인 약국 정보 수정 (본인만 가능)
   *
   * Request Body:
   * - pharmacyName?: string
   * - pharmacyAddress?: string
   * - workplaceName?: string
   * - workplaceAddress?: string
   * - workplaceType?: string
   */
  router.patch('/api/v1/member/pharmacy', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const ipAddress = req.ip || req.socket?.remoteAddress;

      // Validate request body
      const allowedFields = ['pharmacyName', 'pharmacyAddress', 'workplaceName', 'workplaceAddress', 'workplaceType'];
      const updateData: Record<string, string> = {};

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          success: false,
          error: '수정할 필드가 없습니다.',
        });
        return;
      }

      const result = await pharmacyService.updateMyPharmacyInfo(userId, updateData, ipAddress);

      res.json({
        success: result.success,
        data: result.data,
        warning: result.warning, // 본인 책임 안내
        updatedFields: result.updatedFields,
        timestamp: result.timestamp,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  });

  // ===== Home Routes (Phase 2: Read Model) =====

  /**
   * GET /api/v1/member/home
   * 홈 대시보드 데이터
   *
   * Phase 2: Home Read Model
   * - 각 영역 독립 조회
   * - 한 영역 실패 시 해당 영역만 null (전체 실패 아님)
   * - 읽기 전용 (쓰기/수정 경로 없음)
   */
  router.get('/api/v1/member/home', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      // Check membership and get organization info
      const hasMembership = await profileService.hasMembership(userId);
      if (!hasMembership) {
        res.status(403).json({
          success: false,
          error: '회원 정보가 없습니다.',
        });
        return;
      }

      // Get member's organization info for scoped queries
      const profile = await profileService.getMyProfile(userId);
      const organizationId = profile?.profile?.organizationId;
      const memberId = profile?.profile?.id;

      // Query home data (resilient - each section fails independently)
      const homeData = await homeQueryService.getHomeData({
        userId,
        organizationId,
        memberId,
      });

      res.json({
        success: true,
        data: homeData,
        uxPriority: UX_PRIORITY,
        // 각 영역의 성공/실패 상태
        sectionStatus: {
          organizationNotice: homeData.organizationNotice !== null,
          groupbuySummary: homeData.groupbuySummary !== null,
          educationSummary: homeData.educationSummary !== null,
          forumSummary: homeData.forumSummary !== null,
          bannerSummary: homeData.bannerSummary !== null,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  return router;
}

// Alias for backward compatibility
export const createRoutes = createMemberYaksaRoutes;
