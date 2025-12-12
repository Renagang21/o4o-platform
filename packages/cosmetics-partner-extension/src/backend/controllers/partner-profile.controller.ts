/**
 * PartnerProfileController
 *
 * 파트너 프로필 관리 API 컨트롤러
 */

import type { Request, Response } from 'express';
import type {
  PartnerProfileService,
  CreatePartnerProfileDto,
  UpdatePartnerProfileDto,
} from '../services/partner-profile.service';

export class PartnerProfileController {
  constructor(private readonly profileService: PartnerProfileService) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreatePartnerProfileDto = req.body;
      const profile = await this.profileService.createProfile(dto);
      res.status(201).json({ success: true, data: profile });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async findById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const profile = await this.profileService.findById(id);
      if (!profile) {
        res.status(404).json({ success: false, message: 'Partner profile not found' });
        return;
      }
      res.json({ success: true, data: profile });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async findByUserId(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const profile = await this.profileService.findByUserId(userId);
      if (!profile) {
        res.status(404).json({ success: false, message: 'Partner profile not found' });
        return;
      }
      res.json({ success: true, data: profile });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async findByReferralCode(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      const profile = await this.profileService.findByReferralCode(code);
      if (!profile) {
        res.status(404).json({ success: false, message: 'Partner profile not found' });
        return;
      }
      res.json({ success: true, data: profile });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdatePartnerProfileDto = req.body;
      const profile = await this.profileService.updateProfile(id, dto);
      res.json({ success: true, data: profile });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const profile = await this.profileService.updateStatus(id, status);
      res.json({ success: true, data: profile });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getTopEarners(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const profiles = await this.profileService.getTopEarners(limit);
      res.json({ success: true, data: profiles });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.profileService.delete(id);
      res.json({ success: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
