/**
 * Groupbuy Auth Middleware
 * Phase 5: Access Hardening
 *
 * 권한 검증 미들웨어
 * - 조직 멤버십 확인
 * - 역할 기반 접근 제어
 * - 캠페인 소유 조직 검증
 */

import { Request, Response, NextFunction } from 'express';
import type { DataSource, EntityManager } from 'typeorm';
import { GroupbuyCampaign } from '../entities/GroupbuyCampaign.js';

// =====================================================
// Types
// =====================================================

/**
 * 조직 멤버십 정보
 */
export interface OrganizationMembership {
  organizationId: string;
  role: 'admin' | 'manager' | 'member' | 'moderator';
  isPrimary: boolean;
}

/**
 * 인증된 사용자 정보 (req.user)
 */
export interface AuthenticatedUser {
  id: string;
  email?: string;
  role?: string;
  // 조직 멤버십은 미들웨어에서 조회
}

/**
 * Groupbuy 요청 확장
 * Note: Express.Request와의 호환성을 위해 user는 any로 처리
 */
export interface GroupbuyAuthRequest extends Request {
  user?: any; // Express와 호환성 유지
  groupbuyContext?: {
    userId: string;
    memberships: OrganizationMembership[];
    // 요청 컨텍스트에서 확인된 캠페인
    campaign?: GroupbuyCampaign;
    // 사용자의 주 조직
    primaryOrganizationId?: string;
  };
}

// =====================================================
// Error Codes
// =====================================================

export const GroupbuyAuthError = {
  AUTH_REQUIRED: 'GB-AUTH-001',
  ORG_MEMBERSHIP_REQUIRED: 'GB-AUTH-002',
  ORG_ADMIN_REQUIRED: 'GB-AUTH-003',
  ORG_SCOPE_VIOLATION: 'GB-AUTH-004',
  CAMPAIGN_NOT_FOUND: 'GB-AUTH-005',
  CAMPAIGN_ACCESS_DENIED: 'GB-AUTH-006',
  PHARMACY_ACCESS_DENIED: 'GB-AUTH-007',
} as const;

// =====================================================
// Middleware Factory
// =====================================================

/**
 * Groupbuy 인증 미들웨어 팩토리
 *
 * DataSource를 주입받아 DB 조회가 가능한 미들웨어를 생성합니다.
 */
export function createGroupbuyAuthMiddleware(dataSource: DataSource) {
  const manager = dataSource.manager;

  /**
   * 사용자의 조직 멤버십 조회
   */
  async function getUserMemberships(userId: string): Promise<OrganizationMembership[]> {
    // organization_members 테이블에서 조회
    const memberships = await manager.query(`
      SELECT
        "organizationId",
        role,
        "isPrimary"
      FROM organization_members
      WHERE "userId" = $1
        AND "leftAt" IS NULL
    `, [userId]);

    return memberships.map((m: any) => ({
      organizationId: m.organizationId,
      role: m.role,
      isPrimary: m.isPrimary,
    }));
  }

  /**
   * 캠페인 조회
   */
  async function getCampaignById(campaignId: string): Promise<GroupbuyCampaign | null> {
    const campaignRepo = manager.getRepository(GroupbuyCampaign);
    return campaignRepo.findOne({ where: { id: campaignId } });
  }

  // =====================================================
  // Middleware Functions
  // =====================================================

  /**
   * 기본 인증 확인
   * - JWT 토큰 검증은 상위 미들웨어(requireAuth)에서 처리
   * - 이 미들웨어는 req.user가 존재하는지만 확인
   */
  function requireGroupbuyAuth(
    req: GroupbuyAuthRequest,
    res: Response,
    next: NextFunction
  ): void {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        success: false,
        error: GroupbuyAuthError.AUTH_REQUIRED,
        message: '인증이 필요합니다',
      });
      return;
    }
    next();
  }

  /**
   * 조직 멤버십 로드 및 검증
   * - 사용자의 모든 조직 멤버십을 로드
   * - groupbuyContext에 저장
   */
  async function loadMembership(
    req: GroupbuyAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          error: GroupbuyAuthError.AUTH_REQUIRED,
          message: '인증이 필요합니다',
        });
        return;
      }

      const memberships = await getUserMemberships(req.user.id);
      const primaryMembership = memberships.find(m => m.isPrimary);

      req.groupbuyContext = {
        userId: req.user.id,
        memberships,
        primaryOrganizationId: primaryMembership?.organizationId,
      };

      next();
    } catch (error) {
      console.error('[GroupbuyAuth] loadMembership error:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: '멤버십 정보 로드 중 오류가 발생했습니다',
      });
    }
  }

  /**
   * 조직 관리자 권한 확인
   * - 지정된 조직의 admin 또는 manager 역할 확인
   * - organizationId는 body 또는 query에서 추출
   */
  function requireOrgAdmin(
    req: GroupbuyAuthRequest,
    res: Response,
    next: NextFunction
  ): void {
    const context = req.groupbuyContext;
    if (!context) {
      res.status(500).json({
        success: false,
        error: 'MIDDLEWARE_ERROR',
        message: 'loadMembership 미들웨어가 먼저 실행되어야 합니다',
      });
      return;
    }

    // organizationId 추출
    const organizationId = req.body.organizationId || req.query.organizationId;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: 'MISSING_ORG_ID',
        message: 'organizationId가 필요합니다',
      });
      return;
    }

    // 해당 조직에서 관리자 권한 확인
    const membership = context.memberships.find(
      m => m.organizationId === organizationId
    );

    if (!membership) {
      res.status(403).json({
        success: false,
        error: GroupbuyAuthError.ORG_MEMBERSHIP_REQUIRED,
        message: '해당 조직의 멤버가 아닙니다',
      });
      return;
    }

    if (!['admin', 'manager'].includes(membership.role)) {
      res.status(403).json({
        success: false,
        error: GroupbuyAuthError.ORG_ADMIN_REQUIRED,
        message: '조직 관리자 권한이 필요합니다',
      });
      return;
    }

    next();
  }

  /**
   * 캠페인 소유 조직 관리자 확인
   * - 캠페인 ID로 캠페인 조회
   * - 캠페인 소유 조직의 admin/manager 확인
   */
  async function requireCampaignOwner(
    req: GroupbuyAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const context = req.groupbuyContext;
      if (!context) {
        res.status(500).json({
          success: false,
          error: 'MIDDLEWARE_ERROR',
          message: 'loadMembership 미들웨어가 먼저 실행되어야 합니다',
        });
        return;
      }

      // campaignId 추출 (route param)
      const campaignId = req.params.id || req.params.campaignId;

      if (!campaignId) {
        res.status(400).json({
          success: false,
          error: 'MISSING_CAMPAIGN_ID',
          message: 'campaignId가 필요합니다',
        });
        return;
      }

      // 캠페인 조회
      const campaign = await getCampaignById(campaignId);

      if (!campaign) {
        res.status(404).json({
          success: false,
          error: GroupbuyAuthError.CAMPAIGN_NOT_FOUND,
          message: '캠페인을 찾을 수 없습니다',
        });
        return;
      }

      // 캠페인 소유 조직에서 관리자 권한 확인
      const membership = context.memberships.find(
        m => m.organizationId === campaign.organizationId
      );

      if (!membership || !['admin', 'manager'].includes(membership.role)) {
        res.status(403).json({
          success: false,
          error: GroupbuyAuthError.CAMPAIGN_ACCESS_DENIED,
          message: '캠페인 관리 권한이 없습니다',
        });
        return;
      }

      // 캠페인을 컨텍스트에 저장 (후속 핸들러에서 사용)
      context.campaign = campaign;

      next();
    } catch (error) {
      console.error('[GroupbuyAuth] requireCampaignOwner error:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: '캠페인 권한 확인 중 오류가 발생했습니다',
      });
    }
  }

  /**
   * 조직 스코프 필터링 (조회용)
   * - Member: 본인 소속 조직의 캠페인만 조회 가능
   * - organizationId가 요청에 포함된 경우, 소속 확인
   */
  function requireOrgScope(
    req: GroupbuyAuthRequest,
    res: Response,
    next: NextFunction
  ): void {
    const context = req.groupbuyContext;
    if (!context) {
      res.status(500).json({
        success: false,
        error: 'MIDDLEWARE_ERROR',
        message: 'loadMembership 미들웨어가 먼저 실행되어야 합니다',
      });
      return;
    }

    // organizationId 추출
    const organizationId = req.query.organizationId || req.body.organizationId;

    if (!organizationId) {
      // organizationId가 없으면 기본적으로 primary organization 사용
      if (context.primaryOrganizationId) {
        req.query.organizationId = context.primaryOrganizationId;
        next();
        return;
      }

      res.status(400).json({
        success: false,
        error: 'MISSING_ORG_ID',
        message: 'organizationId가 필요합니다',
      });
      return;
    }

    // 소속 조직 확인
    const isMember = context.memberships.some(
      m => m.organizationId === organizationId
    );

    if (!isMember) {
      res.status(403).json({
        success: false,
        error: GroupbuyAuthError.ORG_SCOPE_VIOLATION,
        message: '해당 조직에 접근 권한이 없습니다',
      });
      return;
    }

    next();
  }

  /**
   * 약국(Pharmacy) 소유 확인
   * - pharmacyId가 사용자 소속 조직인지 확인
   * - 주문 생성/조회 시 사용
   */
  function requirePharmacyOwner(
    req: GroupbuyAuthRequest,
    res: Response,
    next: NextFunction
  ): void {
    const context = req.groupbuyContext;
    if (!context) {
      res.status(500).json({
        success: false,
        error: 'MIDDLEWARE_ERROR',
        message: 'loadMembership 미들웨어가 먼저 실행되어야 합니다',
      });
      return;
    }

    // pharmacyId 추출 (route param 또는 body)
    const pharmacyId = req.params.pharmacyId || req.body.pharmacyId;

    if (!pharmacyId) {
      res.status(400).json({
        success: false,
        error: 'MISSING_PHARMACY_ID',
        message: 'pharmacyId가 필요합니다',
      });
      return;
    }

    // pharmacyId는 조직 ID와 동일하다고 가정
    // (약국 = 조직, 약국 회원 = 조직 멤버)
    const isMember = context.memberships.some(
      m => m.organizationId === pharmacyId
    );

    if (!isMember) {
      res.status(403).json({
        success: false,
        error: GroupbuyAuthError.PHARMACY_ACCESS_DENIED,
        message: '해당 약국에 접근 권한이 없습니다',
      });
      return;
    }

    next();
  }

  /**
   * 캠페인 접근 권한 확인 (조회용)
   * - 캠페인 소속 조직의 멤버 여부만 확인
   */
  async function requireCampaignAccess(
    req: GroupbuyAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const context = req.groupbuyContext;
      if (!context) {
        res.status(500).json({
          success: false,
          error: 'MIDDLEWARE_ERROR',
          message: 'loadMembership 미들웨어가 먼저 실행되어야 합니다',
        });
        return;
      }

      // campaignId 추출 (route param)
      const campaignId = req.params.id || req.params.campaignId;

      if (!campaignId) {
        res.status(400).json({
          success: false,
          error: 'MISSING_CAMPAIGN_ID',
          message: 'campaignId가 필요합니다',
        });
        return;
      }

      // 캠페인 조회
      const campaign = await getCampaignById(campaignId);

      if (!campaign) {
        res.status(404).json({
          success: false,
          error: GroupbuyAuthError.CAMPAIGN_NOT_FOUND,
          message: '캠페인을 찾을 수 없습니다',
        });
        return;
      }

      // 캠페인 소유 조직의 멤버 확인
      const isMember = context.memberships.some(
        m => m.organizationId === campaign.organizationId
      );

      if (!isMember) {
        res.status(403).json({
          success: false,
          error: GroupbuyAuthError.CAMPAIGN_ACCESS_DENIED,
          message: '캠페인에 접근 권한이 없습니다',
        });
        return;
      }

      // 캠페인을 컨텍스트에 저장
      context.campaign = campaign;

      next();
    } catch (error) {
      console.error('[GroupbuyAuth] requireCampaignAccess error:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: '캠페인 접근 확인 중 오류가 발생했습니다',
      });
    }
  }

  // Return all middleware functions
  return {
    requireGroupbuyAuth,
    loadMembership,
    requireOrgAdmin,
    requireCampaignOwner,
    requireOrgScope,
    requirePharmacyOwner,
    requireCampaignAccess,
    // Utility
    getUserMemberships,
    getCampaignById,
  };
}

// Type export for external use
export type GroupbuyAuthMiddleware = ReturnType<typeof createGroupbuyAuthMiddleware>;
