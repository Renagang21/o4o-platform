/**
 * MemberProfileController
 *
 * 약사회 회원 프로필 API 컨트롤러
 *
 * 🔒 정책 적용:
 * - pharmacistLicenseNumber: READ-ONLY (API 수정 불가)
 * - occupationType: READ-ONLY (reporting-yaksa 연동만)
 * - pharmacyName/Address: 본인만 수정 가능
 *
 * @package @o4o-apps/member-yaksa
 * @phase 1
 */

import { Request, Response } from 'express';
import { MemberProfileService, MemberProfileError } from '../services/MemberProfileService.js';

// =====================================================
// Types
// =====================================================

/**
 * 인증된 요청 (req.user 포함)
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
    roles?: string[];
  };
}

// =====================================================
// Controller
// =====================================================

export class MemberProfileController {
  private profileService: MemberProfileService;

  constructor(profileService: MemberProfileService) {
    this.profileService = profileService;
  }

  // =====================================================
  // GET /member/profile/me
  // =====================================================

  /**
   * 내 프로필 조회
   *
   * 권한: 로그인한 회원
   */
  async getMyProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: '로그인이 필요합니다',
        });
        return;
      }

      const profile = await this.profileService.getProfileByUserId(userId);

      if (!profile) {
        res.status(404).json({
          success: false,
          error: MemberProfileError.PROFILE_NOT_FOUND,
          message: '프로필을 찾을 수 없습니다',
        });
        return;
      }

      res.json({
        success: true,
        data: profile,
      });
    } catch (error: any) {
      console.error('[member-yaksa] getMyProfile error:', error);
      res.status(500).json({
        success: false,
        error: error?.code || 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // =====================================================
  // PATCH /member/profile/me
  // =====================================================

  /**
   * 내 프로필 수정
   *
   * 권한: 로그인한 회원 (본인만)
   *
   * 🔒 정책:
   * - pharmacistLicenseNumber 수정 불가
   * - occupationType 수정 불가
   * - 약국 정보는 본인만 수정 가능
   */
  async updateMyProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: '로그인이 필요합니다',
        });
        return;
      }

      // 🔒 읽기 전용 필드 차단
      const {
        pharmacistLicenseNumber,
        occupationType,
        userId: bodyUserId,
        id,
        createdAt,
        updatedAt,
        ...allowedFields
      } = req.body;

      // 읽기 전용 필드 수정 시도 경고
      if (pharmacistLicenseNumber !== undefined) {
        res.status(400).json({
          success: false,
          error: MemberProfileError.LICENSE_NUMBER_READONLY,
          message: '면허번호는 수정할 수 없습니다. 변경이 필요한 경우 관리자에게 문의하세요.',
        });
        return;
      }

      if (occupationType !== undefined) {
        res.status(400).json({
          success: false,
          error: MemberProfileError.OCCUPATION_TYPE_READONLY,
          message: '직역은 수정할 수 없습니다. 신상신고를 통해 변경하세요.',
        });
        return;
      }

      const profile = await this.profileService.updateProfile(
        userId,
        userId, // 본인 확인용
        allowedFields
      );

      res.json({
        success: true,
        data: profile,
        message: '프로필이 수정되었습니다. 약국 정보는 본인 책임 하에 정확하게 입력해주세요.',
      });
    } catch (error: any) {
      console.error('[member-yaksa] updateMyProfile error:', error);

      const errorCode = error?.code;
      let statusCode = 500;

      if (errorCode === MemberProfileError.PROFILE_NOT_FOUND) {
        statusCode = 404;
      } else if (errorCode === MemberProfileError.UNAUTHORIZED_UPDATE) {
        statusCode = 403;
      }

      res.status(statusCode).json({
        success: false,
        error: errorCode || 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // =====================================================
  // GET /member/profile/:userId
  // =====================================================

  /**
   * 특정 회원 프로필 조회 (관리자용)
   *
   * 권한: 관리자
   * Note: 조회만 가능, 수정 불가
   */
  async getProfileByUserId(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requestUser = req.user;

      // 권한 확인 (관리자 또는 본인)
      if (!requestUser) {
        res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: '로그인이 필요합니다',
        });
        return;
      }

      // TODO: 관리자 권한 체크 (organization-core 연동)
      // 현재는 본인 조회만 허용
      const userRoles = requestUser.roles || [];
      if (requestUser.id !== userId && !userRoles.includes('admin') && !userRoles.includes('super_admin')) {
        res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: '다른 회원의 프로필은 조회할 수 없습니다',
        });
        return;
      }

      const profile = await this.profileService.getProfileByUserId(userId);

      if (!profile) {
        res.status(404).json({
          success: false,
          error: MemberProfileError.PROFILE_NOT_FOUND,
          message: '프로필을 찾을 수 없습니다',
        });
        return;
      }

      res.json({
        success: true,
        data: profile,
      });
    } catch (error: any) {
      console.error('[member-yaksa] getProfileByUserId error:', error);
      res.status(500).json({
        success: false,
        error: error?.code || 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // =====================================================
  // POST /member/profile/sync-from-reporting
  // =====================================================

  /**
   * reporting-yaksa 연동
   *
   * 권한: 시스템/관리자
   * 용도: 신상신고 승인 시 자동 호출
   *
   * 🔒 정책:
   * - 면허번호, 직역 변경 가능 (유일하게 허용)
   */
  async syncFromReporting(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const requestUser = req.user;

      // 시스템/관리자 권한 확인
      // TODO: 시스템 인증 토큰 또는 관리자 권한 체크
      const adminRoles = requestUser?.roles || [];
      if (!requestUser || (!adminRoles.includes('admin') && !adminRoles.includes('super_admin'))) {
        res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: '이 API는 시스템 또는 관리자만 호출할 수 있습니다',
        });
        return;
      }

      const { userId, pharmacistLicenseNumber, occupationType } = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'MISSING_USER_ID',
          message: 'userId가 필요합니다',
        });
        return;
      }

      const profile = await this.profileService.syncFromReporting({
        userId,
        pharmacistLicenseNumber,
        occupationType,
      });

      res.json({
        success: true,
        data: profile,
        message: 'reporting-yaksa 연동 완료',
      });
    } catch (error: any) {
      console.error('[member-yaksa] syncFromReporting error:', error);

      const errorCode = error?.code;
      let statusCode = 500;

      if (errorCode === MemberProfileError.PROFILE_NOT_FOUND) {
        statusCode = 404;
      }

      res.status(statusCode).json({
        success: false,
        error: errorCode || 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default MemberProfileController;
