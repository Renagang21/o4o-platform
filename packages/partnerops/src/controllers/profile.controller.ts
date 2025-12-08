/**
 * PartnerOps Profile Controller
 */

import { Request, Response } from 'express';
import { ProfileService } from '../services/ProfileService';

export class ProfileController {
  constructor(private profileService: ProfileService) {}

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || 'default';
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const profile = await this.profileService.getProfile(tenantId, userId);
      res.json({ success: true, data: profile });
    } catch (error: any) {
      console.error('Get profile error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || 'default';
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const profile = await this.profileService.updateProfile(tenantId, userId, req.body);
      res.json({ success: true, data: profile });
    } catch (error: any) {
      console.error('Update profile error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async applyAsPartner(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || 'default';
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const profile = await this.profileService.applyAsPartner(tenantId, userId, req.body);
      res.status(201).json({ success: true, data: profile });
    } catch (error: any) {
      console.error('Apply as partner error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default ProfileController;
