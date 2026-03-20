/**
 * Market Trial Routes
 *
 * Phase L-1: Market Trial API Routes
 * WO-O4O-MARKET-TRIAL-PHASE1-V1: Supplier create/submit + my trials
 *
 * @package Phase L-1 - Market Trial
 */

import { Router } from 'express';
import { MarketTrialController } from '../controllers/market-trial/marketTrialController.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';

const router: Router = Router();

// Supplier trial management (WO-O4O-MARKET-TRIAL-PHASE1-V1)
router.post('/', authenticate, MarketTrialController.createTrial);
router.get('/my', authenticate, MarketTrialController.getMyTrials);

// Public routes (list and detail)
router.get('/', optionalAuth, MarketTrialController.getTrials);
router.get('/:id', optionalAuth, MarketTrialController.getTrialById);

// Authenticated routes
router.get('/:id/participation', authenticate, MarketTrialController.getParticipation);
router.post('/:id/join', authenticate, MarketTrialController.joinTrial);
router.patch('/:id/submit', authenticate, MarketTrialController.submitTrial);

export default router;
