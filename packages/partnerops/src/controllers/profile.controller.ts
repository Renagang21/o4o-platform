/**
 * PartnerOps Profile Controller
 *
 * Partner-Core 기반 프로필 컨트롤러
 *
 * @package @o4o/partnerops
 */

import { Request, Response } from 'express';
import type { ProfileService } from '../services/ProfileService.js';
import type { ApiResponseDto } from '../dto/index.js';

export class ProfileController {
  constructor(private profileService: ProfileService) {}

  /**
   * GET /partnerops/profile
   * 현재 사용자의 파트너 프로필 조회
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const partnerId = (req as any).partnerId;

      if (!userId) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      // partnerId가 있으면 직접 조회, 없으면 userId로 조회
      const profile = partnerId
        ? await this.profileService.getProfile(partnerId)
        : await this.profileService.getProfileByUserId(userId);

      const response: ApiResponseDto<typeof profile> = {
        success: true,
        data: profile,
      };
      res.json(response);
    } catch (error: any) {
      console.error('Get profile error:', error);
      const response: ApiResponseDto<null> = {
        success: false,
        error: error.message,
      };
      res.status(500).json(response);
    }
  }

  /**
   * PUT /partnerops/profile
   * 파트너 프로필 업데이트
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = (req as any).partnerId;

      if (!partnerId) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Partner ID required',
        };
        res.status(400).json(response);
        return;
      }

      const profile = await this.profileService.updateProfile(partnerId, req.body);

      if (!profile) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Partner not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponseDto<typeof profile> = {
        success: true,
        data: profile,
        message: 'Profile updated successfully',
      };
      res.json(response);
    } catch (error: any) {
      console.error('Update profile error:', error);
      const response: ApiResponseDto<null> = {
        success: false,
        error: error.message,
      };
      res.status(500).json(response);
    }
  }

  /**
   * POST /partnerops/profile/apply
   * 파트너 신청
   */
  async applyAsPartner(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const profile = await this.profileService.applyAsPartner({
        userId,
        name: req.body.name,
        profileImage: req.body.profileImage,
        socialLinks: req.body.socialLinks,
        bankInfo: req.body.bankInfo,
      });

      const response: ApiResponseDto<typeof profile> = {
        success: true,
        data: profile,
        message: 'Partner application submitted successfully',
      };
      res.status(201).json(response);
    } catch (error: any) {
      console.error('Apply as partner error:', error);
      const response: ApiResponseDto<null> = {
        success: false,
        error: error.message,
      };
      res.status(500).json(response);
    }
  }

  /**
   * GET /partnerops/profile/level
   * 파트너 레벨 정보 조회
   */
  async getLevelInfo(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = (req as any).partnerId;

      if (!partnerId) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Partner ID required',
        };
        res.status(400).json(response);
        return;
      }

      const levelInfo = await this.profileService.getLevelInfo(partnerId);

      if (!levelInfo) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Partner not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponseDto<typeof levelInfo> = {
        success: true,
        data: levelInfo,
      };
      res.json(response);
    } catch (error: any) {
      console.error('Get level info error:', error);
      const response: ApiResponseDto<null> = {
        success: false,
        error: error.message,
      };
      res.status(500).json(response);
    }
  }
}

export default ProfileController;
