/**
 * SupplierOnboardingController
 *
 * REST API controller for supplier onboarding management.
 * Phase R11: Supplier Onboarding System
 */

import type { Request, Response } from 'express';
import {
  SupplierOnboardingService,
  type UpdateSupplierProfileDto,
} from '../services/SupplierOnboardingService.js';

export class SupplierOnboardingController {
  constructor(private service: SupplierOnboardingService) {}

  /**
   * GET /api/v1/lms-marketing/onboarding/profile
   * Get supplier profile (creates if doesn't exist)
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const supplierId = req.query.supplierId as string;

      if (!supplierId) {
        res.status(400).json({
          success: false,
          error: 'Missing required query parameter: supplierId',
        });
        return;
      }

      const profile = await this.service.getProfile(supplierId);
      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      console.error('[SupplierOnboardingController] getProfile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get supplier profile',
      });
    }
  }

  /**
   * POST /api/v1/lms-marketing/onboarding/profile
   * Update supplier profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const { supplierId, ...dto } = req.body as UpdateSupplierProfileDto & {
        supplierId: string;
      };

      if (!supplierId) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: supplierId',
        });
        return;
      }

      const profile = await this.service.updateProfile(supplierId, dto);
      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      console.error('[SupplierOnboardingController] updateProfile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update supplier profile',
      });
    }
  }

  /**
   * GET /api/v1/lms-marketing/onboarding/checklist
   * Get onboarding checklist with progress
   */
  async getChecklist(req: Request, res: Response): Promise<void> {
    try {
      const supplierId = req.query.supplierId as string;

      if (!supplierId) {
        res.status(400).json({
          success: false,
          error: 'Missing required query parameter: supplierId',
        });
        return;
      }

      const checklist = await this.service.getOnboardingChecklist(supplierId);
      res.json({
        success: true,
        data: checklist,
      });
    } catch (error) {
      console.error('[SupplierOnboardingController] getChecklist error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get onboarding checklist',
      });
    }
  }

  /**
   * POST /api/v1/lms-marketing/onboarding/complete
   * Mark onboarding as completed
   */
  async markComplete(req: Request, res: Response): Promise<void> {
    try {
      const { supplierId } = req.body;

      if (!supplierId) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: supplierId',
        });
        return;
      }

      const profile = await this.service.markOnboardingCompleted(supplierId);
      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      console.error('[SupplierOnboardingController] markComplete error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark onboarding as complete',
      });
    }
  }

  /**
   * POST /api/v1/lms-marketing/onboarding/track-dashboard
   * Track dashboard view for onboarding checklist
   */
  async trackDashboardView(req: Request, res: Response): Promise<void> {
    try {
      const { supplierId } = req.body;

      if (!supplierId) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: supplierId',
        });
        return;
      }

      await this.service.trackDashboardView(supplierId);
      res.json({
        success: true,
        message: 'Dashboard view tracked',
      });
    } catch (error) {
      console.error('[SupplierOnboardingController] trackDashboardView error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track dashboard view',
      });
    }
  }

  /**
   * POST /api/v1/lms-marketing/onboarding/reset
   * Reset onboarding progress (for testing)
   */
  async resetOnboarding(req: Request, res: Response): Promise<void> {
    try {
      const { supplierId } = req.body;

      if (!supplierId) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: supplierId',
        });
        return;
      }

      const profile = await this.service.resetOnboarding(supplierId);
      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      console.error('[SupplierOnboardingController] resetOnboarding error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset onboarding',
      });
    }
  }

  /**
   * GET /api/v1/lms-marketing/onboarding/profiles
   * List all supplier profiles (admin)
   */
  async listProfiles(req: Request, res: Response): Promise<void> {
    try {
      const { status, limit, offset } = req.query;

      const options = {
        status: status as 'not_started' | 'in_progress' | 'completed' | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      };

      const result = await this.service.listProfiles(options);
      res.json({
        success: true,
        data: result.items,
        total: result.total,
      });
    } catch (error) {
      console.error('[SupplierOnboardingController] listProfiles error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list supplier profiles',
      });
    }
  }
}
