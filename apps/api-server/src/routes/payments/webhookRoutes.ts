import { Router } from 'express';
import { PaymentWebhookController } from '../../controllers/payments/paymentWebhookController';
import { authenticate as authMiddleware } from '../../middleware/auth.middleware';
import { rateLimitConfig } from '../../config/production.config';

const router = Router();
const paymentWebhookController = new PaymentWebhookController();

// Webhook endpoints (no auth required - signature verification instead)
router.use('/toss', rateLimitConfig.webhook);
router.post('/toss/payment', paymentWebhookController.handleTossPaymentWebhook);
router.post('/toss/subscription', paymentWebhookController.handleTossSubscriptionWebhook);

// Admin endpoints for webhook management (auth required)
router.use(authMiddleware);
router.get('/payment-events', paymentWebhookController.getPaymentEvents);
router.get('/events/stats', paymentWebhookController.getWebhookStats);
router.post('/events/:id/retry', paymentWebhookController.retryWebhookEvent);

export default router;