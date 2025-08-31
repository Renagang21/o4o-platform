import { Router } from 'express';
import { ReportingController } from '../../controllers/analytics/reportingController';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();
const reportingController = new ReportingController();

// Apply authentication to all reporting routes
router.use(authMiddleware);

// Reporting endpoints
router.post('/inventory', reportingController.generateInventoryReport);
router.post('/sales', reportingController.generateSalesReport);
router.post('/commission', reportingController.generateCommissionReport);
router.post('/custom', reportingController.generateCustomReport);
router.get('/:reportId/download', reportingController.downloadReport);

export default router;