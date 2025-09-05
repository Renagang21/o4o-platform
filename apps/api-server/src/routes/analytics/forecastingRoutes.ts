import { Router } from 'express';
import { ForecastingController } from '../../controllers/analytics/forecastingController';
import { authenticate as authMiddleware } from '../../middleware/auth.middleware';

const router: Router = Router();
const forecastingController = new ForecastingController();

// Apply authentication to all forecasting routes
router.use(authMiddleware);

// Forecasting endpoints
router.post('/sales', forecastingController.forecastSales);
router.post('/demand', forecastingController.forecastDemand);
router.post('/inventory', forecastingController.forecastInventory);
router.post('/revenue', forecastingController.forecastRevenue);

export default router;