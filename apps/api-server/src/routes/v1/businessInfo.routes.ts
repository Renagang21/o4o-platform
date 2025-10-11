import { Router } from 'express';
import { BusinessInfoController } from '../../controllers/v1/businessInfo.controller';
import { authenticateToken } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/permission.middleware';

const router: Router = Router();

// Business info CRUD routes
router.get('/:id/business-info', authenticateToken, BusinessInfoController.getBusinessInfo);
router.post('/:id/business-info', authenticateToken, BusinessInfoController.createBusinessInfo);
router.put('/:id/business-info', authenticateToken, BusinessInfoController.updateBusinessInfo);
router.delete('/:id/business-info', authenticateToken, BusinessInfoController.deleteBusinessInfo);

// Admin routes
router.put('/:id/business-info/verify', authenticateToken, requireAdmin, BusinessInfoController.verifyBusinessInfo);

// Metadata routes
router.get('/business-types', authenticateToken, BusinessInfoController.getBusinessTypes);
router.get('/business-sizes', authenticateToken, BusinessInfoController.getBusinessSizes);
router.get('/industries', authenticateToken, BusinessInfoController.getIndustries);

// Statistics routes (admin only)
router.get('/business-statistics', authenticateToken, requireAdmin, BusinessInfoController.getBusinessStatistics);

export default router;