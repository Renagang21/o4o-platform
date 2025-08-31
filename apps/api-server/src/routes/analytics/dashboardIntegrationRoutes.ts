import { Router } from 'express';
import { DashboardIntegrationController } from '../../controllers/analytics/dashboardIntegrationController';
import { authenticate as authMiddleware } from '../../middleware/auth.middleware';

const router = Router();
const dashboardIntegrationController = new DashboardIntegrationController();

// Apply authentication to all dashboard routes
router.use(authMiddleware);

// Dashboard Integration endpoints
router.get('/enhanced', dashboardIntegrationController.getEnhancedDashboard);
router.post('/widgets/refresh', dashboardIntegrationController.refreshWidgets);
router.get('/config', dashboardIntegrationController.getDashboardConfig);

export default router;