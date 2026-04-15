import { Router } from 'express';
import { CreditController } from '../controllers/CreditController.js';
import { requireAuth } from '../../../common/middleware/auth.middleware.js';
import { asyncHandler } from '../../../middleware/error-handler.js';

/**
 * Credit Routes
 *
 * WO-O4O-CREDIT-SYSTEM-V1
 * GET /api/v1/credits/me           — Get my balance
 * GET /api/v1/credits/me/transactions — Get my transaction history
 */
const router: Router = Router();

router.get('/me', requireAuth, asyncHandler(CreditController.getMyBalance));
router.get('/me/transactions', requireAuth, asyncHandler(CreditController.getMyTransactions));

export default router;
