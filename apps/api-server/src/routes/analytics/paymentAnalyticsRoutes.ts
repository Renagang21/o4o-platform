import { Router } from 'express';
import { PaymentAnalyticsController } from '../../controllers/payments/paymentAnalyticsController';
import { authenticate as authMiddleware } from '../../middleware/auth.middleware';

const router: Router = Router();
const paymentAnalyticsController = new PaymentAnalyticsController();

// Apply authentication to all analytics routes
router.use(authMiddleware);

// Payment Analytics APIs (3 endpoints)
router.get('/payments/overview', paymentAnalyticsController.getPaymentOverview);
router.get('/payments/methods', paymentAnalyticsController.getPaymentMethodAnalysis);
router.get('/payments/trends', paymentAnalyticsController.getPaymentTrends);

// Bonus endpoints
router.get('/payments/subscription-metrics', paymentAnalyticsController.getSubscriptionMetrics);
router.get('/payments/real-time', paymentAnalyticsController.getRealTimeStats);
router.get('/payments/export', paymentAnalyticsController.exportPaymentAnalytics);

export default router;