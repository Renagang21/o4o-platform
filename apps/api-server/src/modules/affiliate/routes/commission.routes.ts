import { Router } from 'express';
import { CommissionController } from '../controllers/commission.controller';
import { authenticate } from '../../../middleware/auth.middleware';
import { rateLimitMiddleware } from '../../../middleware/rateLimit.middleware';
import { requireAdmin, requireAdminOrAffiliate, requireSystem } from '../middleware/authorize.middleware';

const router: Router = Router();
const commissionController = new CommissionController();

// Commission endpoints
router.get(
  '/commissions',
  authenticate,
  requireAdminOrAffiliate,
  commissionController.getCommissions
);

router.post(
  '/commissions/calculate',
  authenticate,
  requireSystem,
  rateLimitMiddleware({ windowMs: 60000, max: 100 }),
  commissionController.calculateCommission
);

router.post(
  '/commissions/process',
  authenticate,
  requireAdmin,
  rateLimitMiddleware({ windowMs: 60000, max: 20 }),
  commissionController.processCommissions
);

// Affiliate user management (admin)
router.get(
  '/users',
  authenticate,
  requireAdmin,
  commissionController.getAffiliateUsers
);

router.patch(
  '/users/:id/status',
  authenticate,
  requireAdmin,
  rateLimitMiddleware({ windowMs: 60000, max: 20 }),
  commissionController.updateAffiliateStatus
);

// Payout endpoints
router.get(
  '/payouts',
  authenticate,
  requireAdminOrAffiliate,
  commissionController.getPayouts
);

router.post(
  '/payouts',
  authenticate,
  requireAdmin,
  rateLimitMiddleware({ windowMs: 60000, max: 10 }),
  commissionController.createPayout
);

router.get(
  '/payouts/calculate/:affiliateUserId',
  authenticate,
  requireAdminOrAffiliate,
  commissionController.calculatePayoutSummary
);

router.get(
  '/payouts/:id',
  authenticate,
  requireAdminOrAffiliate,
  commissionController.getPayoutDetails
);

router.patch(
  '/payouts/:id/process',
  authenticate,
  requireAdmin,
  rateLimitMiddleware({ windowMs: 60000, max: 10 }),
  commissionController.processPayout
);

router.delete(
  '/payouts/:id',
  authenticate,
  requireAdmin,
  rateLimitMiddleware({ windowMs: 60000, max: 10 }),
  commissionController.cancelPayout
);

// Admin dashboard
router.get(
  '/admin/dashboard',
  authenticate,
  requireAdmin,
  commissionController.getAdminDashboard
);

export default router;