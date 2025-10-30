import { Router } from 'express';
import { AdminApprovalController } from '../controllers/admin/adminApprovalController.js';
import adminStatsController from '../controllers/admin/adminStatsController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/permission.middleware.js';

const router: Router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Approval management routes
router.get('/queue', AdminApprovalController.getApprovalQueue);
router.get('/stats', AdminApprovalController.getApprovalStats);
router.get('/request/:id', AdminApprovalController.getRequestDetails);
router.post('/approve/:id', AdminApprovalController.approveRequest);
router.post('/reject/:id', AdminApprovalController.rejectRequest);

// Platform statistics routes
router.get('/platform-stats', adminStatsController.getPlatformStats.bind(adminStatsController));
router.get('/revenue-summary', adminStatsController.getRevenueSummary.bind(adminStatsController));
router.get('/pending-settlements', adminStatsController.getPendingSettlements.bind(adminStatsController));
router.post('/process-settlement/:id', adminStatsController.processSettlement.bind(adminStatsController));

export default router;