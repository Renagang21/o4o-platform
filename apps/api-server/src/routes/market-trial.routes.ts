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

// User participations (WO-MARKET-TRIAL-MY-PARTICIPATION-STATUS-V1)
router.get('/my-participations', authenticate, MarketTrialController.getMyParticipations);

// Gateway: access status + open trial summary (WO-MARKET-TRIAL-SERVICE-ENTRY-BANNER-AND-GATEWAY-V1)
router.get('/gateway', optionalAuth, MarketTrialController.gateway);

// Public routes (list and detail)
router.get('/', optionalAuth, MarketTrialController.getTrials);
router.get('/:id', optionalAuth, MarketTrialController.getTrialById);

// Authenticated routes
router.get('/:id/participation', authenticate, MarketTrialController.getParticipation);
// WO-MARKET-TRIAL-SUPPLIER-RESULTS-AND-FEEDBACK-V1: supplier results (auth + owner check inside)
router.get('/:id/results', authenticate, MarketTrialController.getSupplierTrialResults);
router.post('/:id/join', authenticate, MarketTrialController.joinTrial);
router.patch('/:id/submit', authenticate, MarketTrialController.submitTrial);

export default router;
