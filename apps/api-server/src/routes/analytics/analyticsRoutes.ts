import { Router } from 'express';
import { AnalyticsController } from '../../controllers/analytics/analyticsController';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();
const analyticsController = new AnalyticsController();

// Apply authentication to all analytics routes
router.use(authMiddleware);

// Dashboard Analytics endpoints
router.get('/dashboard', analyticsController.getDashboard);
router.get('/inventory/overview', analyticsController.getInventoryOverview);
router.get('/sales/trends', analyticsController.getSalesTrends);
router.get('/products/performance', analyticsController.getProductPerformance);
router.get('/vendors/ranking', analyticsController.getVendorRanking);
router.get('/realtime', analyticsController.getRealTimeMetrics);

export default router;