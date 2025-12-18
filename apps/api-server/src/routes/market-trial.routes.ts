/**
 * Market Trial Routes
 *
 * Phase L-1: Market Trial API Routes
 *
 * @package Phase L-1 - Market Trial
 */

import { Router } from 'express';
import { MarketTrialController } from '../controllers/market-trial/marketTrialController.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';

const router: Router = Router();

// Public routes (list and detail)
router.get('/', optionalAuth, MarketTrialController.getTrials);
router.get('/:id', optionalAuth, MarketTrialController.getTrialById);

// Authenticated routes
router.get('/:id/participation', authenticate, MarketTrialController.getParticipation);
router.post('/:id/join', authenticate, MarketTrialController.joinTrial);

export default router;
