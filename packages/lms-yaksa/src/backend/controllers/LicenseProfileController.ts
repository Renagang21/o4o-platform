import { Router, Request, Response } from 'express';
import type { LicenseProfileService } from '../services/LicenseProfileService.js';

/**
 * LicenseProfileController
 *
 * REST API endpoints for managing pharmacist license profiles.
 * Base path: /lms/yaksa/license-profiles
 */
export function createLicenseProfileRoutes(
  licenseProfileService: LicenseProfileService
): Router {
  const router = Router();

  /**
   * GET /:userId
   * Get license profile by user ID
   */
  router.get('/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const profile = await licenseProfileService.getProfile(userId);

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: 'License profile not found',
        });
      }

      return res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      console.error('Error fetching license profile:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch license profile',
      });
    }
  });

  /**
   * POST /
   * Create a new license profile
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const data = req.body;

      if (!data.userId) {
        return res.status(400).json({
          success: false,
          error: 'userId is required',
        });
      }

      // Check if profile already exists
      const existing = await licenseProfileService.getProfile(data.userId);
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'License profile already exists for this user',
        });
      }

      const profile = await licenseProfileService.createProfile(data);

      return res.status(201).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      console.error('Error creating license profile:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create license profile',
      });
    }
  });

  /**
   * PATCH /:id
   * Update a license profile
   */
  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;

      const profile = await licenseProfileService.updateProfile(id, data);

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: 'License profile not found',
        });
      }

      return res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      console.error('Error updating license profile:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update license profile',
      });
    }
  });

  /**
   * POST /:id/recalculate-credits
   * Recalculate total credits for a profile
   */
  router.post('/:id/recalculate-credits', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const profile = await licenseProfileService.getProfileById(id);
      if (!profile) {
        return res.status(404).json({
          success: false,
          error: 'License profile not found',
        });
      }

      const totalCredits = await licenseProfileService.recalculateCredits(profile.userId);

      return res.json({
        success: true,
        data: {
          profileId: id,
          totalCredits,
        },
      });
    } catch (error) {
      console.error('Error recalculating credits:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to recalculate credits',
      });
    }
  });

  /**
   * POST /:id/check-renewal
   * Check if license renewal is required
   */
  router.post('/:id/check-renewal', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { requiredCredits } = req.body;

      const isRenewalRequired = await licenseProfileService.checkRenewalRequired(
        id,
        requiredCredits ?? 8
      );

      return res.json({
        success: true,
        data: {
          profileId: id,
          isRenewalRequired,
          requiredCredits: requiredCredits ?? 8,
        },
      });
    } catch (error) {
      console.error('Error checking renewal status:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to check renewal status',
      });
    }
  });

  /**
   * DELETE /:id
   * Delete a license profile
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await licenseProfileService.deleteProfile(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'License profile not found',
        });
      }

      return res.json({
        success: true,
        message: 'License profile deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting license profile:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete license profile',
      });
    }
  });

  return router;
}
