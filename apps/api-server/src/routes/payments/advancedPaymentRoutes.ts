import { Router } from 'express';
import { AdvancedPaymentController } from '../../controllers/payments/advancedPaymentController';
import { authenticate as authMiddleware } from '../../middleware/auth.middleware';
import { rateLimitConfig } from '../../config/production.config';

const router = Router();
const advancedPaymentController = new AdvancedPaymentController();

// Apply authentication to all payment routes
router.use(authMiddleware);

// Apply stricter rate limiting for financial operations
router.use(rateLimitConfig.financial);

// Advanced Payment APIs (6 endpoints)
router.post('/subscriptions', advancedPaymentController.createSubscription);
router.post('/subscriptions/:id/cancel', advancedPaymentController.cancelSubscription);
router.post('/:id/partial-cancel', advancedPaymentController.partialCancel);
router.post('/escrow/confirm', advancedPaymentController.confirmEscrow);
router.post('/cash-receipt', advancedPaymentController.issueCashReceipt);
router.get('/settlements/:date', advancedPaymentController.getSettlements);

// Bonus endpoints for subscription management
router.get('/subscriptions', advancedPaymentController.getSubscriptions);
router.post('/subscriptions/:id/pause', advancedPaymentController.pauseSubscription);
router.post('/subscriptions/:id/resume', advancedPaymentController.resumeSubscription);

export default router;