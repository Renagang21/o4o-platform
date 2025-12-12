/**
 * Public Routes - No Authentication Required
 * Routes accessible without login for frontend functionality
 */
import { Router, Request, Response } from 'express';
import { cptService } from '../services/cpt/cpt.service.js';
import logger from '../utils/logger.js';

const router: Router = Router();

/**
 * GET /api/v1/public/cpt/types
 * Get all active CPT types for menu display
 * No authentication required
 */
router.get('/cpt/types', async (req: Request, res: Response) => {
  try {
    // Only return active CPTs for public access
    const result = await cptService.getAllCPTs(true);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    logger.error('Public API - getAllCPTs error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;
