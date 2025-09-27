import { Router } from 'express';
import { AdminApprovalController } from '../controllers/admin/adminApprovalController';
import adminStatsController from '../controllers/admin/adminStatsController';
import { authenticate } from '../middleware/auth.middleware';
import { validateRole } from '../middleware/roleValidation';

const router: Router = Router();

// Approval management routes
router.get(
  '/queue',
  authenticate,
  validateRole(['admin', 'administrator']),
  AdminApprovalController.getApprovalQueue
);

router.get(
  '/stats',
  authenticate,
  validateRole(['admin', 'administrator']),
  AdminApprovalController.getApprovalStats
);

router.get(
  '/request/:id',
  authenticate,
  validateRole(['admin', 'administrator']),
  AdminApprovalController.getRequestDetails
);

router.post(
  '/approve/:id',
  authenticate,
  validateRole(['admin', 'administrator']),
  AdminApprovalController.approveRequest
);

router.post(
  '/reject/:id',
  authenticate,
  validateRole(['admin', 'administrator']),
  AdminApprovalController.rejectRequest
);

// Platform statistics routes
router.get(
  '/platform-stats',
  authenticate,
  validateRole(['admin', 'administrator']),
  adminStatsController.getPlatformStats.bind(adminStatsController)
);

router.get(
  '/revenue-summary',
  authenticate,
  validateRole(['admin', 'administrator']),
  adminStatsController.getRevenueSummary.bind(adminStatsController)
);

router.get(
  '/pending-settlements',
  authenticate,
  validateRole(['admin', 'administrator']),
  adminStatsController.getPendingSettlements.bind(adminStatsController)
);

router.post(
  '/process-settlement/:id',
  authenticate,
  validateRole(['admin', 'administrator']),
  adminStatsController.processSettlement.bind(adminStatsController)
);

export default router;