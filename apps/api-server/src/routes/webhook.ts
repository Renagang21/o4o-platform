import { Router } from 'express';
import { authenticateToken as authMiddleware, requireRole } from '../middleware/auth';
import { CommissionWebhookController } from '../controllers/webhook/commissionWebhookController';
import { performanceMiddleware } from '../middleware/performance.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';

const router: Router = Router();
const webhookController = new CommissionWebhookController();

// Apply performance monitoring
router.use(performanceMiddleware);

// POST /api/webhooks/commission-status - Handle payment status updates (no auth required for external webhooks)
router.post('/commission-status', webhookController.handlePaymentWebhook);

// Protected routes require authentication
router.use(authMiddleware);

// POST /api/webhooks/payment-status - Manual payment status update (admin only)
router.post(
  '/payment-status', 
  requireRole(['admin', 'manager']),
  webhookController.updatePaymentStatus
);

// GET /api/webhooks/logs - Get webhook logs for debugging (admin only)
router.get(
  '/logs',
  requireRole(['admin', 'manager']),
  webhookController.getWebhookLogs
);

export default router;