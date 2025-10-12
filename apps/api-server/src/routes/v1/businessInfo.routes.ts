import { Router, Request } from 'express';
import { BusinessInfoController } from '../../controllers/v1/businessInfo.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/permission.middleware';

const router: Router = Router();

// Business info CRUD routes
router.get('/:id/business-info', authenticate, BusinessInfoController.getBusinessInfo);
router.post('/:id/business-info', authenticate, BusinessInfoController.createBusinessInfo);
router.put('/:id/business-info', authenticate, BusinessInfoController.updateBusinessInfo);
router.delete('/:id/business-info', authenticate, BusinessInfoController.deleteBusinessInfo);

// Admin routes
router.put('/:id/business-info/verify', authenticate, requireAdmin, BusinessInfoController.verifyBusinessInfo);

// Metadata routes
router.get('/business-types', authenticate, BusinessInfoController.getBusinessTypes);
router.get('/business-sizes', authenticate, BusinessInfoController.getBusinessSizes);
router.get('/industries', authenticate, BusinessInfoController.getIndustries);

// Statistics routes (admin only)
router.get('/business-statistics', authenticate, requireAdmin, BusinessInfoController.getBusinessStatistics);

export default router;