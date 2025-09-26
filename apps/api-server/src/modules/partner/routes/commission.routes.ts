import { Router } from 'express';
import { CommissionController } from '../controllers/commission.controller';
import { authenticate } from '../../../middleware/auth.middleware';
import { rateLimitMiddleware } from '../../../middleware/rateLimit.middleware';
import { requireAdmin, requireAdminOrPartner, requireSystem } from '../middleware/authorize.middleware';

const router: Router = Router();
const commissionController = new CommissionController();

// Commission endpoints
router.get(
  '/commissions',
  authenticate as any,
  requireAdminOrPartner as any,
  (commissionController.getCommissions as any).bind(commissionController)
);

router.post(
  '/commissions/calculate',
  authenticate as any,
  requireSystem as any,
  rateLimitMiddleware({ windowMs: 60000, max: 100 }),
  (commissionController.calculateCommission as any).bind(commissionController)
);

router.post(
  '/commissions/process',
  authenticate as any,
  requireAdmin as any,
  rateLimitMiddleware({ windowMs: 60000, max: 20 }),
  (commissionController.processCommissions as any).bind(commissionController)
);

// Partner user management (admin)
router.get(
  '/users',
  authenticate as any,
  requireAdmin as any,
  (commissionController.getPartnerUsers as any).bind(commissionController)
);

router.patch(
  '/users/:id/status',
  authenticate as any,
  requireAdmin as any,
  rateLimitMiddleware({ windowMs: 60000, max: 20 }),
  (commissionController.updatePartnerStatus as any).bind(commissionController)
);

// Payout endpoints
router.get(
  '/payouts',
  authenticate as any,
  requireAdminOrPartner as any,
  commissionController.getPayouts
);

router.post(
  '/payouts',
  authenticate as any,
  requireAdmin as any,
  rateLimitMiddleware({ windowMs: 60000, max: 10 }),
  commissionController.createPayout
);

router.get(
  '/payouts/calculate/:partnerUserId',
  authenticate as any,
  requireAdminOrPartner as any,
  commissionController.calculatePayoutSummary
);

router.get(
  '/payouts/:id',
  authenticate as any,
  requireAdminOrPartner as any,
  commissionController.getPayoutDetails
);

router.patch(
  '/payouts/:id/process',
  authenticate as any,
  requireAdmin as any,
  rateLimitMiddleware({ windowMs: 60000, max: 10 }),
  commissionController.processPayout
);

router.delete(
  '/payouts/:id',
  authenticate as any,
  requireAdmin as any,
  rateLimitMiddleware({ windowMs: 60000, max: 10 }),
  commissionController.cancelPayout
);

// Admin dashboard
router.get(
  '/admin/dashboard',
  authenticate as any,
  requireAdmin as any,
  commissionController.getAdminDashboard
);

export default router;