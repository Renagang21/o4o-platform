/**
 * PartnerProfileController
 *
 * 파트너 프로필 API 컨트롤러
 */

import type { Request, Response } from 'express';
import type { PartnerProfileService } from '../services/partner-profile.service';

export class PartnerProfileController {
  constructor(private readonly service: PartnerProfileService) {}

  /**
   * POST /api/v1/cosmetics-partner/profile
   * 파트너 프로필 생성
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { userId, displayName, introduction, partnerType, socialLinks, profileImageUrl } = req.body;

      if (!userId || !partnerType) {
        res.status(400).json({ success: false, message: 'userId and partnerType are required', errorCode: 'VALIDATION_ERROR' });
        return;
      }

      const existing = await this.service.findByUserId(userId);
      if (existing) {
        res.status(409).json({ success: false, message: 'Partner profile already exists for this user', errorCode: 'DUPLICATE_PROFILE' });
        return;
      }

      const profile = await this.service.createProfile({
        userId,
        displayName,
        introduction,
        partnerType,
        socialLinks,
        profileImageUrl,
      });

      res.status(201).json({ success: true, data: profile });
    } catch (error) {
      console.error('[PartnerProfileController] create error:', error);
      res.status(500).json({ success: false, message: 'Failed to create partner profile', errorCode: 'INTERNAL_ERROR' });
    }
  }

  /**
   * GET /api/v1/cosmetics-partner/profile/me
   * 내 프로필 조회
   */
  async getMyProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized', errorCode: 'UNAUTHORIZED' });
        return;
      }

      const profile = await this.service.findByUserId(userId);

      if (!profile) {
        res.status(404).json({ success: false, message: 'Partner profile not found', errorCode: 'NOT_FOUND' });
        return;
      }

      res.json({ success: true, data: profile });
    } catch (error) {
      console.error('[PartnerProfileController] getMyProfile error:', error);
      res.status(500).json({ success: false, message: 'Failed to get partner profile', errorCode: 'INTERNAL_ERROR' });
    }
  }

  /**
   * GET /api/v1/cosmetics-partner/profile/:id
   * 특정 프로필 조회
   */
  async findById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const profile = await this.service.findById(id);

      if (!profile) {
        res.status(404).json({ success: false, message: 'Partner profile not found', errorCode: 'NOT_FOUND' });
        return;
      }

      res.json({ success: true, data: profile });
    } catch (error) {
      console.error('[PartnerProfileController] findById error:', error);
      res.status(500).json({ success: false, message: 'Failed to get partner profile', errorCode: 'INTERNAL_ERROR' });
    }
  }

  /**
   * GET /api/v1/cosmetics-partner/profile/code/:referralCode
   * 추천 코드로 프로필 조회
   */
  async findByReferralCode(req: Request, res: Response): Promise<void> {
    try {
      const { referralCode } = req.params;
      const profile = await this.service.findByReferralCode(referralCode);

      if (!profile) {
        res.status(404).json({ success: false, message: 'Partner profile not found', errorCode: 'NOT_FOUND' });
        return;
      }

      res.json({ success: true, data: profile });
    } catch (error) {
      console.error('[PartnerProfileController] findByReferralCode error:', error);
      res.status(500).json({ success: false, message: 'Failed to get partner profile', errorCode: 'INTERNAL_ERROR' });
    }
  }

  /**
   * PUT /api/v1/cosmetics-partner/profile
   * 내 프로필 업데이트
   */
  async updateMyProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized', errorCode: 'UNAUTHORIZED' });
        return;
      }

      const profile = await this.service.findByUserId(userId);

      if (!profile) {
        res.status(404).json({ success: false, message: 'Partner profile not found', errorCode: 'NOT_FOUND' });
        return;
      }

      const { displayName, introduction, socialLinks, profileImageUrl, defaultCommissionRate } = req.body;

      const updated = await this.service.updateProfile(profile.id, {
        displayName,
        introduction,
        socialLinks,
        profileImageUrl,
        defaultCommissionRate,
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('[PartnerProfileController] updateMyProfile error:', error);
      res.status(500).json({ success: false, message: 'Failed to update partner profile', errorCode: 'INTERNAL_ERROR' });
    }
  }

  /**
   * GET /api/v1/cosmetics-partner/profiles
   * 파트너 목록 조회 (관리자)
   */
  async findAll(req: Request, res: Response): Promise<void> {
    try {
      const { status, partnerType, page, limit } = req.query;

      const result = await this.service.findAll({
        status: status as any,
        partnerType: partnerType as any,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[PartnerProfileController] findAll error:', error);
      res.status(500).json({ success: false, message: 'Failed to get partner profiles', errorCode: 'INTERNAL_ERROR' });
    }
  }

  /**
   * PUT /api/v1/cosmetics-partner/profile/:id/status
   * 파트너 상태 변경 (관리자)
   */
  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const approvedBy = (req as any).user?.id;

      if (!status) {
        res.status(400).json({ success: false, message: 'status is required', errorCode: 'VALIDATION_ERROR' });
        return;
      }

      const updated = await this.service.updateStatus(id, status, approvedBy);

      if (!updated) {
        res.status(404).json({ success: false, message: 'Partner profile not found', errorCode: 'NOT_FOUND' });
        return;
      }

      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('[PartnerProfileController] updateStatus error:', error);
      res.status(500).json({ success: false, message: 'Failed to update partner status', errorCode: 'INTERNAL_ERROR' });
    }
  }

  /**
   * DELETE /api/v1/cosmetics-partner/profile/:id
   * 파트너 프로필 삭제 (비활성화)
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.service.delete(id);
      res.json({ success: true, message: 'Partner profile deleted' });
    } catch (error) {
      console.error('[PartnerProfileController] delete error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete partner profile', errorCode: 'INTERNAL_ERROR' });
    }
  }

  /**
   * GET /api/v1/partner/profile/user/:userId
   * 사용자 ID로 프로필 조회
   */
  async findByUserId(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const profile = await this.service.findByUserId(userId);

      if (!profile) {
        res.status(404).json({ success: false, message: 'Partner profile not found', errorCode: 'NOT_FOUND' });
        return;
      }

      res.json({ success: true, data: profile });
    } catch (error) {
      console.error('[PartnerProfileController] findByUserId error:', error);
      res.status(500).json({ success: false, message: 'Failed to get partner profile', errorCode: 'INTERNAL_ERROR' });
    }
  }

  /**
   * PUT /api/v1/partner/profile/:id
   * 프로필 업데이트 (by ID)
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const updated = await this.service.updateProfile(id, updateData);

      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('[PartnerProfileController] update error:', error);
      res.status(500).json({ success: false, message: 'Failed to update partner profile', errorCode: 'INTERNAL_ERROR' });
    }
  }

  /**
   * GET /api/v1/partner/profile/top/earners
   * 상위 수익자 목록 조회
   */
  async getTopEarners(req: Request, res: Response): Promise<void> {
    try {
      const { limit } = req.query;
      const profiles = await this.service.getTopEarners(limit ? parseInt(limit as string) : 10);

      res.json({ success: true, data: profiles });
    } catch (error) {
      console.error('[PartnerProfileController] getTopEarners error:', error);
      res.status(500).json({ success: false, message: 'Failed to get top earners', errorCode: 'INTERNAL_ERROR' });
    }
  }
}
